/**
 * 会话同步服务
 * 实现 aicr 文件系统与 YiPet 会话系统的双向同步
 * 
 * 映射规则：
 * - 文件名 -> 会话标题 (pageTitle)
 * - 目录路径 -> 会话标签 (tags)
 * - 文件内容 -> 页面上下文 (pageContent)
 * - 评论 -> 聊天记录 (messages)
 * 
 * 统一接口和字段格式：
 * - 使用 /session/save 接口（POST）
 * - messages 格式：{type: 'user'|'pet', content: string, timestamp: number, imageDataUrl?: string}
 * - 时间戳：毫秒数（number），不是 ISO 字符串
 * - 使用统一的认证头（X-Token）
 */

import { postData, getData, deleteData } from '/apis/index.js';
import { getAuthHeaders } from '/apis/helper/authUtils.js';
import { safeExecuteAsync, createError, ErrorTypes } from '/utils/error.js';

class SessionSyncService {
    constructor() {
        this.apiUrl = window.API_URL || 'https://api.effiy.cn';
        this.syncEnabled = true;
        this.syncQueue = new Map(); // 同步队列
        this.syncTimer = null;
        this.syncInterval = 1000; // 1秒处理一次同步队列
    }

    /**
     * 从文件路径提取标签（目录路径）
     * @param {string} filePath - 文件路径
     * @returns {Array<string>} 标签数组
     */
    extractTagsFromPath(filePath) {
        if (!filePath) return [];
        
        const parts = filePath.split('/').filter(p => p && p.trim());
        if (parts.length <= 1) return [];
        
        // 移除文件名，只保留目录路径作为标签
        const dirs = parts.slice(0, -1);
        return dirs;
    }

    /**
     * 从文件路径提取文件名（不含路径）
     * @param {string} filePath - 文件路径
     * @returns {string} 文件名
     */
    extractFileName(filePath) {
        if (!filePath) return '未命名文件';
        const parts = filePath.split('/').filter(p => p && p.trim());
        return parts[parts.length - 1] || '未命名文件';
    }

    /**
     * 生成会话ID（基于文件路径）
     * 格式：aicr_{projectId}_{filePath}（文件路径中的特殊字符替换为下划线）
     * @param {string} filePath - 文件路径
     * @param {string} projectId - 项目ID
     * @returns {string} 会话ID
     */
    generateSessionId(filePath, projectId) {
        if (!filePath) {
            return `aicr_${projectId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        if (!projectId) {
            console.warn('[SessionSync] 项目ID为空，使用默认值');
            projectId = 'default';
        }
        
        // 规范化文件路径：替换特殊字符为下划线，但保留路径结构
        const normalizedPath = String(filePath)
            .replace(/[^a-zA-Z0-9\/]/g, '_')  // 替换特殊字符
            .replace(/\/+/g, '_')             // 将斜杠替换为下划线
            .replace(/^_+|_+$/g, '')          // 移除首尾下划线
            .replace(/_+/g, '_');             // 合并连续下划线
        
        return `aicr_${projectId}_${normalizedPath}`;
    }

    /**
     * 从会话ID提取文件路径（反向操作）
     * @param {string} sessionId - 会话ID
     * @param {string} projectId - 项目ID
     * @returns {string|null} 文件路径
     */
    extractFilePathFromSessionId(sessionId, projectId) {
        if (!sessionId || !projectId) return null;
        
        const prefix = `aicr_${projectId}_`;
        if (!sessionId.startsWith(prefix)) return null;
        
        const pathPart = sessionId.substring(prefix.length);
        // 将下划线还原为斜杠
        return pathPart.replace(/_/g, '/');
    }

    /**
     * 将文件转换为会话数据（统一格式）
     * @param {Object} file - 文件对象
     * @param {string} projectId - 项目ID
     * @returns {Object} 会话数据（符合 YiPet 格式）
     */
    fileToSession(file, projectId) {
        const filePath = file.fileId || file.id || file.path || '';
        const fileName = this.extractFileName(filePath);
        let tags = this.extractTagsFromPath(filePath);
        const sessionId = this.generateSessionId(filePath, projectId);
        
        // 如果标签为空，使用项目ID作为目录名（标签）
        if (!Array.isArray(tags) || tags.length === 0) {
            tags = projectId ? [projectId] : [];
        }
        
        const now = Date.now();
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 11);
        const uniqueUrl = `aicr-session://${timestamp}-${randomStr}`;

        // 规范化时间戳
        const createdAt = this.normalizeTimestamp(file.createdAt);
        const updatedAt = this.normalizeTimestamp(file.updatedAt);

        return {
            id: String(sessionId),
            url: uniqueUrl,
            title: fileName,
            pageTitle: fileName,
            pageDescription: `文件：${filePath}`,
            pageContent: String(file.content || ''),
            messages: [], // 消息将从评论中同步
            tags: tags,
            isFavorite: false,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastAccessTime: now
        };
    }

    /**
     * 规范化角色类型（与 YiPet 保持一致）
     * @param {Object} comment - 评论对象
     * @returns {string} 'user' 或 'pet'
     */
    normalizeRole(comment) {
        const author = String(comment.author || '').toLowerCase();
        const role = String(comment.role || comment.type || '').toLowerCase();
        
        // 判断是否为用户消息
        if (role === 'user' || role === 'me' || author.includes('用户') || author.includes('user')) {
            return 'user';
        }
        // 判断是否为 AI 消息
        if (role === 'pet' || role === 'assistant' || role === 'bot' || role === 'ai' || 
            author.includes('AI') || author.includes('助手') || author.includes('assistant')) {
            return 'pet';
        }
        // 默认根据 author 判断
        return author.includes('AI') ? 'pet' : 'user';
    }

    /**
     * 规范化文本内容（与 YiPet 保持一致）
     * @param {Object} comment - 评论对象
     * @returns {string} 规范化后的文本内容
     */
    normalizeText(comment) {
        return String(comment.content || comment.text || comment.message || '').trim();
    }

    /**
     * 规范化时间戳（转换为毫秒数）
     * @param {string|number|Date} timestamp - 时间戳
     * @returns {number} 毫秒数
     */
    normalizeTimestamp(timestamp) {
        if (!timestamp) return Date.now();
        if (typeof timestamp === 'number') return timestamp;
        if (typeof timestamp === 'string') {
            // 尝试解析 ISO 字符串
            const date = new Date(timestamp);
            if (!isNaN(date.getTime())) {
                return date.getTime();
            }
            // 尝试解析为数字
            const num = parseInt(timestamp, 10);
            if (!isNaN(num)) return num;
        }
        return Date.now();
    }

    /**
     * 将评论转换为消息（统一格式）
     * 统一字段：type, content, timestamp, imageDataUrl
     * @param {Object} comment - 评论对象
     * @returns {Object} 消息对象（统一格式）
     */
    commentToMessage(comment) {
        if (!comment) return null;
        
        // 统一 type 字段
        let type;
        if (comment.type) {
            type = comment.type;
        } else if (comment.role) {
            const role = String(comment.role).toLowerCase();
            if (role === 'user' || role === 'me') {
                type = 'user';
            } else if (role === 'assistant' || role === 'pet' || role === 'bot' || role === 'ai') {
                type = 'pet';
            } else {
                type = 'user'; // 默认
            }
        } else {
            type = this.normalizeRole(comment);
        }
        
        // 统一 content 字段
        const content = String(comment.content || comment.text || comment.message || '').trim();
        
        // 统一 timestamp 字段（转换为毫秒数）
        const timestamp = this.normalizeTimestamp(comment.timestamp || comment.createdTime || comment.createdAt);
        
        // 统一 imageDataUrl 字段
        const imageDataUrl = comment.imageDataUrl || comment.image || undefined;
        
        return {
            type: type, // 'user' 或 'pet'
            content: content,
            timestamp: timestamp, // 毫秒数
            imageDataUrl: imageDataUrl
        };
    }

    /**
     * 同步文件到会话（创建或更新）
     * @param {Object} file - 文件对象
     * @param {string} projectId - 项目ID
     * @param {boolean} immediate - 是否立即同步
     * @returns {Promise<Object>} 同步结果
     */
    async syncFileToSession(file, projectId, immediate = false) {
        return safeExecuteAsync(async () => {
            if (!this.syncEnabled) {
                console.log('[SessionSync] 同步已禁用，跳过文件同步');
                return null;
            }

            const sessionData = this.fileToSession(file, projectId);
            
            // 检查会话是否已存在
            const existingSession = await this.getSession(sessionData.id);
            if (existingSession) {
                console.log(`[SessionSync] 会话已存在，跳过保存: ${sessionData.id}`);
                return { skipped: true, sessionId: sessionData.id, reason: '会话已存在' };
            }
            
            if (immediate) {
                return await this.saveSession(sessionData);
            } else {
                // 加入同步队列
                this.syncQueue.set(sessionData.id, sessionData);
                this.startSyncTimer();
                return { queued: true, sessionId: sessionData.id };
            }
        }, '文件同步到会话');
    }

    /**
     * 同步评论到会话消息
     * @param {Object} comment - 评论对象
     * @param {string} filePath - 文件路径
     * @param {string} projectId - 项目ID
     * @param {boolean} immediate - 是否立即同步
     * @returns {Promise<Object>} 同步结果
     */
    async syncCommentToMessage(comment, filePath, projectId, immediate = false) {
        return safeExecuteAsync(async () => {
            if (!this.syncEnabled) {
                console.log('[SessionSync] 同步已禁用，跳过评论同步');
                return null;
            }

            // 获取或创建对应的会话
            const sessionId = this.generateSessionId(filePath, projectId);
            let session = await this.getSession(sessionId);
            
            if (!session) {
                // 如果会话不存在，先创建会话（需要文件信息）
                console.log('[SessionSync] 会话不存在，需要先创建会话');
                return { error: '会话不存在，请先同步文件' };
            }

            // 将评论转换为消息（统一格式）
            const message = this.commentToMessage(comment);
            const commentKey = comment.key || comment.id;
            
            // 检查消息是否已存在（通过内容匹配，因为标准格式不包含 _aicr）
            // 使用内容和时间戳匹配，避免重复
            const existingIndex = session.messages.findIndex(m => {
                const mContent = String(m.content || '').trim();
                const msgContent = String(message.content || '').trim();
                const mTime = Number(m.timestamp || 0);
                const msgTime = Number(message.timestamp || 0);
                // 内容相同且时间戳相近（5秒内）认为是同一条消息
                return mContent === msgContent && Math.abs(mTime - msgTime) < 5000;
            });

            if (existingIndex >= 0) {
                // 更新现有消息
                session.messages[existingIndex] = message;
            } else {
                // 添加新消息（按时间戳排序）
                session.messages.push(message);
                session.messages.sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
            }

            // 规范化消息数组
            session.messages = this.normalizeMessages(session.messages);

            // 更新会话时间戳（毫秒数）
            const now = Date.now();
            session.updatedAt = now;
            session.lastAccessTime = now;

            if (immediate) {
                return await this.saveSession(session);
            } else {
                // 加入同步队列
                this.syncQueue.set(sessionId, session);
                this.startSyncTimer();
                return { queued: true, sessionId };
            }
        }, '评论同步到消息');
    }

    /**
     * 删除评论对应的消息
     * @param {string} commentKey - 评论key
     * @param {string} filePath - 文件路径
     * @param {string} projectId - 项目ID
     * @param {Object} comment - 可选的评论对象（用于内容匹配）
     * @returns {Promise<Object>} 删除结果
     */
    async deleteCommentMessage(commentKey, filePath, projectId, comment = null) {
        return safeExecuteAsync(async () => {
            const sessionId = this.generateSessionId(filePath, projectId);
            const session = await this.getSession(sessionId);
            
            if (!session) {
                return { error: '会话不存在' };
            }

            // 从消息列表中移除对应的消息
            // 由于标准格式不包含 _aicr，需要通过内容匹配
            if (comment) {
                const targetMessage = this.commentToMessage(comment);
                const targetContent = String(targetMessage.content || '').trim();
                const targetTime = Number(targetMessage.timestamp || 0);
                
                session.messages = session.messages.filter(m => {
                    const mContent = String(m.content || '').trim();
                    const mTime = Number(m.timestamp || 0);
                    // 内容相同且时间戳相近（5秒内）认为是同一条消息
                    return !(mContent === targetContent && Math.abs(mTime - targetTime) < 5000);
                });
            } else {
                // 如果没有提供评论对象，无法准确匹配，记录警告
                console.warn('[SessionSync] 删除评论消息时缺少评论对象，无法准确匹配');
            }

            // 规范化消息数组
            session.messages = this.normalizeMessages(session.messages);

            const now = Date.now();
            session.updatedAt = now;
            return await this.saveSession(session);
        }, '删除评论消息');
    }

    /**
     * 规范化消息数组（确保格式统一）
     * 统一字段：type, content, timestamp, imageDataUrl
     * @param {Array} messages - 消息数组
     * @returns {Array} 规范化后的消息数组
     */
    normalizeMessages(messages) {
        if (!Array.isArray(messages)) return [];
        
        return messages.map(msg => {
            if (!msg) return null;
            
            // 统一 type 字段
            let type;
            if (msg.type) {
                type = msg.type;
            } else if (msg.role) {
                const role = String(msg.role).toLowerCase();
                if (role === 'user' || role === 'me') {
                    type = 'user';
                } else if (role === 'assistant' || role === 'pet' || role === 'bot' || role === 'ai') {
                    type = 'pet';
                } else {
                    type = 'user'; // 默认
                }
            } else {
                // 根据 author 判断
                type = this.normalizeRole(msg);
            }
            
            // 统一 content 字段
            const content = String(msg.content || msg.text || msg.message || '').trim();
            
            // 统一 timestamp 字段（转换为毫秒数）
            const timestamp = this.normalizeTimestamp(msg.timestamp || msg.createdTime || msg.createdAt || msg.ts);
            
            // 统一 imageDataUrl 字段
            const imageDataUrl = msg.imageDataUrl || msg.image || undefined;
            
            return {
                type: type,
                content: content,
                timestamp: timestamp,
                imageDataUrl: imageDataUrl
            };
        }).filter(msg => msg && msg.content); // 过滤空内容和null
    }

    /**
     * 获取会话
     * @param {string} sessionId - 会话ID
     * @returns {Promise<Object|null>} 会话数据
     */
    async getSession(sessionId) {
        return safeExecuteAsync(async () => {
            try {
                const url = `${this.apiUrl}/session/${encodeURIComponent(sessionId)}`;
                const response = await getData(url, {}, false);
                
                if (response && response.success && response.data) {
                    const session = response.data;
                    // 规范化消息格式
                    if (session.messages) {
                        session.messages = this.normalizeMessages(session.messages);
                    }
                    return session;
                }
                return null;
            } catch (error) {
                console.warn('[SessionSync] 获取会话失败:', error);
                return null;
            }
        }, '获取会话');
    }

    /**
     * 保存会话（统一接口和格式）
     * @param {Object} sessionData - 会话数据
     * @returns {Promise<Object>} 保存结果
     */
    async saveSession(sessionData) {
        return safeExecuteAsync(async () => {
            try {
                // 规范化会话数据
                const normalized = {
                    id: String(sessionData.id || ''),
                    url: String(sessionData.url || ''),
                    title: String(sessionData.title || sessionData.pageTitle || ''),
                    pageTitle: String(sessionData.pageTitle || sessionData.title || ''),
                    pageDescription: String(sessionData.pageDescription || ''),
                    pageContent: String(sessionData.pageContent || ''),
                    messages: this.normalizeMessages(sessionData.messages || []),
                    tags: Array.isArray(sessionData.tags) ? sessionData.tags : [],
                    isFavorite: sessionData.isFavorite !== undefined ? Boolean(sessionData.isFavorite) : false,
                    createdAt: this.normalizeTimestamp(sessionData.createdAt),
                    updatedAt: this.normalizeTimestamp(sessionData.updatedAt),
                    lastAccessTime: this.normalizeTimestamp(sessionData.lastAccessTime)
                };

                // 使用统一的 postData 接口（会自动添加认证头）
                const url = `${this.apiUrl}/session/save`;
                const response = await postData(url, normalized);
                
                if (response && response.success !== false) {
                    console.log('[SessionSync] 会话保存成功:', normalized.id);
                    return response;
                } else {
                    throw new Error(response?.message || '保存会话失败');
                }
            } catch (error) {
                console.error('[SessionSync] 保存会话失败:', error);
                throw error;
            }
        }, '保存会话');
    }

    /**
     * 删除会话（统一接口）
     * @param {string} sessionId - 会话ID
     * @returns {Promise<Object>} 删除结果
     */
    async deleteSession(sessionId) {
        return safeExecuteAsync(async () => {
            try {
                const url = `${this.apiUrl}/session/${encodeURIComponent(sessionId)}`;
                const response = await deleteData(url);
                
                if (response && response.success !== false) {
                    console.log('[SessionSync] 会话删除成功:', sessionId);
                    return response;
                } else {
                    throw new Error(response?.message || '删除会话失败');
                }
            } catch (error) {
                console.error('[SessionSync] 删除会话失败:', error);
                throw error;
            }
        }, '删除会话');
    }

    /**
     * 启动同步定时器
     */
    startSyncTimer() {
        if (this.syncTimer) {
            return; // 定时器已启动
        }

        this.syncTimer = setTimeout(() => {
            this.processSyncQueue();
        }, this.syncInterval);
    }

    /**
     * 处理同步队列
     */
    async processSyncQueue() {
        if (this.syncQueue.size === 0) {
            this.syncTimer = null;
            return;
        }

        const sessionsToSync = Array.from(this.syncQueue.values());
        this.syncQueue.clear();
        this.syncTimer = null;

        // 批量检查会话是否存在，然后只保存不存在的会话
        const checkResults = await Promise.all(
            sessionsToSync.map(async session => {
                const existingSession = await this.getSession(session.id);
                return { session, exists: !!existingSession };
            })
        );

        // 过滤出需要保存的会话（不存在的）
        const sessionsToSave = checkResults
            .filter(result => !result.exists)
            .map(result => result.session);

        const skippedCount = checkResults.filter(r => r.exists).length;

        // 批量保存不存在的会话
        const promises = sessionsToSave.map(session => 
            this.saveSession(session).catch(error => {
                console.error('[SessionSync] 批量同步失败:', error);
                return null;
            })
        );

        await Promise.all(promises);
        console.log(`[SessionSync] 批量同步完成，处理了 ${sessionsToSync.length} 个会话（跳过 ${skippedCount} 个已存在的会话，保存 ${sessionsToSave.length} 个新会话）`);
    }

    /**
     * 立即处理所有待同步的会话
     */
    async flushSyncQueue() {
        if (this.syncTimer) {
            clearTimeout(this.syncTimer);
            this.syncTimer = null;
        }
        await this.processSyncQueue();
    }

    /**
     * 启用同步
     */
    enableSync() {
        this.syncEnabled = true;
        console.log('[SessionSync] 同步已启用');
    }

    /**
     * 禁用同步
     */
    disableSync() {
        this.syncEnabled = false;
        console.log('[SessionSync] 同步已禁用');
    }

    /**
     * 从会话系统加载数据到 aicr（反向同步）
     * 从 YiPet 会话系统加载数据，转换为 aicr 的文件和评论格式
     * 注意：由于标准格式不包含 _aicr 扩展字段，需要通过会话ID规则匹配
     * @param {string} projectId - 项目ID
     * @returns {Promise<Object>} 包含文件和评论的数据对象
     */
    async loadFromSessions(projectId) {
        return safeExecuteAsync(async () => {
            if (!projectId) {
                console.warn('[SessionSync] 项目ID为空，跳过从会话加载');
                return { files: [], comments: [] };
            }

            try {
                // 获取所有会话（通过列表接口）
                const url = `${this.apiUrl}/session/`;
                const response = await getData(url, {}, false);
                
                let sessions = [];
                if (response && Array.isArray(response)) {
                    sessions = response;
                } else if (response && response.data && Array.isArray(response.data)) {
                    sessions = response.data;
                } else if (response && response.sessions && Array.isArray(response.sessions)) {
                    sessions = response.sessions;
                } else if (response && response.data && response.data.list && Array.isArray(response.data.list)) {
                    sessions = response.data.list;
                }

                // 过滤出属于当前项目的会话（通过会话ID前缀匹配：aicr_{projectId}_）
                const projectSessions = sessions.filter(session => {
                    const sessionId = String(session.id || '');
                    return sessionId.startsWith(`aicr_${projectId}_`);
                });

                console.log(`[SessionSync] 从会话系统加载到 ${projectSessions.length} 个会话`);

                // 将会话转换为文件和评论
                const files = [];
                const comments = [];

                for (const session of projectSessions) {
                    // 从会话ID提取文件路径
                    const sessionId = String(session.id || '');
                    const filePath = this.extractFilePathFromSessionId(sessionId, projectId);
                    
                    if (filePath) {
                        // 转换为文件
                        const file = {
                            fileId: filePath,
                            id: filePath,
                            path: filePath,
                            name: session.pageTitle || session.title || filePath.split('/').pop() || '未命名文件',
                            content: String(session.pageContent || ''),
                            createdAt: this.normalizeTimestamp(session.createdAt),
                            updatedAt: this.normalizeTimestamp(session.updatedAt)
                        };
                        files.push(file);

                        // 将消息转换为评论（保持字段统一）
                        const normalizedMessages = this.normalizeMessages(session.messages || []);
                        for (let i = 0; i < normalizedMessages.length; i++) {
                            const message = normalizedMessages[i];
                            const comment = {
                                key: `comment_${sessionId}_${i}_${message.timestamp}`,
                                id: `comment_${sessionId}_${i}_${message.timestamp}`,
                                // 统一的消息字段
                                type: message.type,
                                content: message.content,
                                timestamp: message.timestamp,
                                imageDataUrl: message.imageDataUrl,
                                // 评论特有字段
                                fileId: filePath,
                                projectId: projectId,
                                status: 'pending',
                                // 兼容字段（保留以兼容旧代码）
                                text: message.content, // content 和 text 保持一致
                                author: message.type === 'pet' ? 'AI助手' : '用户',
                                createdTime: message.timestamp, // 毫秒数
                                createdAt: message.timestamp // 毫秒数
                            };
                            comments.push(comment);
                        }
                    }
                }

                console.log(`[SessionSync] 转换得到 ${files.length} 个文件和 ${comments.length} 条评论`);
                return { files, comments };
            } catch (error) {
                console.error('[SessionSync] 从会话系统加载数据失败:', error);
                return { files: [], comments: [] };
            }
        }, '从会话系统加载数据');
    }
}

// 创建单例
let sessionSyncServiceInstance = null;

export function getSessionSyncService() {
    if (!sessionSyncServiceInstance) {
        sessionSyncServiceInstance = new SessionSyncService();
    }
    return sessionSyncServiceInstance;
}

// 导出类（用于测试）
export { SessionSyncService };

