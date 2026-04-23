/**
 * 会话同步服务
 * 实现 aicr 文件系统与 YiPet 会话系统的双向同步
 * 
 * 映射规则：
 * - 文件名 -> 会话标题 (pageTitle)
 * - 目录路径 -> 会话标签 (tags)
 * - 文件内容 -> 页面上下文 (pageContent)
 * 
 * 统一接口和字段格式：
 * - 使用 /session/save 接口（POST）
 * - messages 格式：{type: 'user'|'pet', message: string, timestamp: number, imageDataUrl?: string}
 * - 时间戳：毫秒数（number），不是 ISO 字符串
 * - 使用统一的认证头（X-Token）
 */

import { postData, getData } from '/src/core/services/index.js';
import { buildServiceUrl, SERVICE_MODULE } from '/src/core/services/helper/requestHelper.js';
import { safeExecuteAsync } from '/cdn/utils/core/error.js';
import { normalizeFileObject, extractFileName, extractTagsFromPath } from '/src/views/aicr/utils/fileFieldNormalizer.js';
import { COLLECTIONS, URL_PROTOCOLS, MESSAGE_TYPES, FILE_TYPES } from '/src/views/aicr/constants/index.js';

class SessionSyncService {
    constructor() {
        this.apiUrl = window.API_URL || 'https://api.effiy.cn';
        this.syncEnabled = true;
        this.syncQueue = new Map(); // 同步队列
        this.syncTimer = null;
        this.syncInterval = 1000; // 1秒处理一次同步队列
        this._imageUploadCache = new Map();
    }

    isUuidLikeKey(value) {
        if (value == null) return false;
        const s = String(value).trim();
        if (!s) return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    }

    pickSessionKey(file) {
        const candidates = [
            file?.sessionKey,
            file?.key,
            file?.fileKey,
            file?.id
        ];
        for (const c of candidates) {
            if (this.isUuidLikeKey(c)) return String(c).trim();
        }
        return undefined;
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
     * 生成会话ID（直接使用文件路径作为Key）
     * @param {string} filePath - 文件路径
     * @returns {string} 会话Key
     */
    generateSessionKey(filePath) {
        if (!filePath) {
            return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        return filePath;
    }

    /**
     * 从会话ID提取文件路径（直接返回Key）
     * @param {string} sessionKey - 会话Key
     * @returns {string|null} 文件路径
     */
    extractFilePathFromSessionKey(sessionKey) {
        return sessionKey || null;
    }

    /**
     * 将文件转换为会话数据（统一格式）
     * @param {Object} file - 文件对象
     * @returns {Object} 会话数据（符合 YiPet 格式）
     */
    fileToSession(file) {
        // 使用统一的字段规范化工具
        const normalizedFile = normalizeFileObject(file);
        if (!normalizedFile) {
            console.warn('[fileToSession] 无法规范化文件对象:', file);
            return null;
        }
        
        const filePath = normalizedFile.path || '';
        
        // 确保 filePath 与用于生成 tags 的路径一致
        // 使用相同的路径来提取文件名和标签
        const fileName = String(extractFileName(filePath) || '').trim().replace(/\s+/g, '_');
        let tags = extractTagsFromPath(filePath);
        
        // 如果标签为空，不再使用默认标签，直接放在根目录
        if (!Array.isArray(tags)) {
            tags = [];
        }
        
        const now = Date.now();
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 11);
        const uniqueUrl = `aicr-session://${timestamp}-${randomStr}`;

        // 规范化时间戳
        const createdAt = this.normalizeTimestamp(file.createdAt);
        const updatedAt = this.normalizeTimestamp(file.updatedAt);

        // 确保 pageDescription 中的 file_path 与用于生成 tags 的路径完全一致
        // 使用相同的 filePath 变量，确保一致性
        return {
            key: this.pickSessionKey(file),
            url: uniqueUrl,
            title: fileName,
            pageDescription: `文件：${filePath}`, // 使用与 tags 相同的 filePath
            messages: [],
            tags: tags, // 使用与 pageDescription 相同的 filePath 生成的 tags
            isFavorite: false,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastAccessTime: now
        };
    }

    /**
     * 规范化消息角色类型（与 YiPet 保持一致）
     * @param {Object} msg - 消息对象
     * @returns {string} 'user' 或 'pet'
     */
    normalizeMessageType(msg) {
        const author = String(msg.author || '').toLowerCase();
        const role = String(msg.role || msg.type || '').toLowerCase();

        // 判断是否为用户消息
        if (role === MESSAGE_TYPES.USER || role === MESSAGE_TYPES.ME || author.includes('用户') || author.includes(MESSAGE_TYPES.USER)) {
            return MESSAGE_TYPES.USER;
        }
        // 判断是否为 AI 消息
        if (role === MESSAGE_TYPES.PET || role === MESSAGE_TYPES.ASSISTANT || role === MESSAGE_TYPES.BOT || role === MESSAGE_TYPES.AI ||
            author.includes('AI') || author.includes('助手') || author.includes(MESSAGE_TYPES.ASSISTANT)) {
            return MESSAGE_TYPES.PET;
        }
        // 默认根据 author 判断
        return author.includes('AI') ? MESSAGE_TYPES.PET : MESSAGE_TYPES.USER;
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
     * 同步文件到会话（创建或更新）
     * @param {Object} file - 文件对象
     * @param {boolean} immediate - 是否立即同步
     * @param {boolean} forceUpdate - 是否强制更新
     * @returns {Promise<Object>} 同步结果
     */
    async syncFileToSession(file, immediate = false, forceUpdate = false) {
        return safeExecuteAsync(async () => {
            if (!this.syncEnabled) {
                console.log('[SessionSync] 同步已禁用，跳过文件同步');
                return null;
            }

            const sessionData = this.fileToSession(file);
            if (!sessionData) {
                console.warn('[SessionSync] 无法创建会话数据，跳过同步');
                return { error: '无法创建会话数据' };
            }
            
            if (immediate || !sessionData.key) {
                return await this.saveSession(sessionData);
            } else {
                // 加入同步队列
                this.syncQueue.set(sessionData.key, sessionData);
                this.startSyncTimer();
                return { queued: true, sessionKey: sessionData.key };
            }
        }, '文件同步到会话');
    }

    /**
     * 规范化消息数组（确保格式统一）
     * 统一字段：type, message, timestamp, imageDataUrl
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
                if (role === MESSAGE_TYPES.USER || role === MESSAGE_TYPES.ME) {
                    type = MESSAGE_TYPES.USER;
                } else if (role === MESSAGE_TYPES.ASSISTANT || role === MESSAGE_TYPES.PET || role === MESSAGE_TYPES.BOT || role === MESSAGE_TYPES.AI) {
                    type = MESSAGE_TYPES.PET;
                } else {
                    type = MESSAGE_TYPES.USER; // 默认
                }
            } else {
                // 根据 author 判断
                type = this.normalizeMessageType(msg);
            }
            
            const message = String(msg.message || msg.content || msg.text || '').trim();
            
            // 统一 timestamp 字段（转换为毫秒数）
            const timestamp = this.normalizeTimestamp(msg.timestamp || msg.createdTime || msg.createdAt || msg.ts);
            
            const imageDataUrl = msg.imageDataUrl || msg.image || undefined;
            const imageDataUrls = Array.isArray(msg.imageDataUrls) ? msg.imageDataUrls.filter(Boolean) : undefined;
            
            return {
                type: type,
                message: message,
                timestamp: timestamp,
                ...(imageDataUrl ? { imageDataUrl } : {}),
                ...(imageDataUrls && imageDataUrls.length > 0 ? { imageDataUrls } : {})
            };
        }).filter(msg => {
            if (!msg) return false;
            const hasText = !!String(msg.message || '').trim();
            const hasImg = !!String(msg.imageDataUrl || '').trim();
            const hasImgs = Array.isArray(msg.imageDataUrls) && msg.imageDataUrls.length > 0;
            return hasText || hasImg || hasImgs;
        });
    }

    async uploadImageToOss(dataUrl, directory = 'aicr/images') {
        const raw = String(dataUrl || '').trim();
        if (!raw) return '';
        if (/^https?:\/\//i.test(raw)) return raw;
        if (!raw.startsWith('data:image/')) return '';

        if (this._imageUploadCache && this._imageUploadCache.has(raw)) {
            return await this._imageUploadCache.get(raw);
        }

        const task = (async () => {
            const header = raw.slice(0, raw.indexOf(','));
            const mimeMatch = header.match(/^data:([^;]+);/i);
            const mime = mimeMatch ? mimeMatch[1] : 'image/png';
            const extRaw = String(mime.split('/')[1] || 'png').toLowerCase();
            const ext = extRaw === 'jpeg' ? 'jpg' : extRaw;
            const filename = `aicr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

            const resp = await postData(`${this.apiUrl}/upload/upload-image-to-oss`, {
                data_url: raw,
                filename,
                directory
            });
            const pickUrl = (r) => {
                if (!r) return '';
                if (typeof r === 'string') return r;
                const d = r.data;
                if (typeof d === 'string') return d;
                if (typeof r.url === 'string') return r.url;
                if (d && typeof d.url === 'string') return d.url;
                const dd = d && d.data;
                if (typeof dd === 'string') return dd;
                if (dd && typeof dd.url === 'string') return dd.url;
                return '';
            };
            const url = pickUrl(resp);
            if (!url) {
                throw new Error('上传图片失败');
            }
            return String(url);
        })();

        if (this._imageUploadCache) this._imageUploadCache.set(raw, task);
        try {
            const url = await task;
            if (this._imageUploadCache) this._imageUploadCache.set(raw, Promise.resolve(url));
            return url;
        } catch (e) {
            if (this._imageUploadCache) this._imageUploadCache.delete(raw);
            throw e;
        }
    }

    async uploadAndReplaceMessageImages(messages) {
        const list = Array.isArray(messages) ? messages : [];
        if (list.length === 0) return [];

        const next = [];
        for (const msg of list) {
            if (!msg) continue;
            const one = { ...msg };

            const urls = Array.isArray(one.imageDataUrls) ? one.imageDataUrls.filter(Boolean) : [];
            if (urls.length > 0) {
                const uploaded = (await Promise.all(urls.map((src) => this.uploadImageToOss(src)))).filter(Boolean);
                if (uploaded.length > 0) {
                    one.imageDataUrls = uploaded;
                    one.imageDataUrl = uploaded[0];
                } else {
                    delete one.imageDataUrls;
                    delete one.imageDataUrl;
                }
            } else if (one.imageDataUrl) {
                const uploaded = await this.uploadImageToOss(one.imageDataUrl);
                if (uploaded) {
                    one.imageDataUrl = uploaded;
                    one.imageDataUrls = [uploaded];
                } else {
                    delete one.imageDataUrl;
                }
            }

            next.push(one);
        }
        return next;
    }

    /**
     * 删除文件夹关联的所有会话
     * @param {string} folderPath - 文件夹路径
     * @param {Array} allSessions - 所有会话列表
     * @returns {Promise<Object>} 删除结果
     */
    async deleteSessionsByFolder(folderPath, allSessions) {
        return safeExecuteAsync(async () => {
            if (!folderPath) {
                return { success: false, deletedCount: 0 };
            }

            console.log(`[SessionSync] 开始删除文件夹关联会话: ${folderPath}`);

            let sessionsToDelete = [];

            // 首先使用前端传入的 allSessions 进行匹配
            if (Array.isArray(allSessions) && allSessions.length > 0) {
                const folderTags = folderPath.split('/').filter(p => p && p.trim());

                console.log(`[SessionSync] 待匹配文件夹tags:`, folderTags);
                console.log(`[SessionSync] 样本会话tags (${allSessions[0]?.title}):`, allSessions[0]?.tags);

                sessionsToDelete = allSessions.filter(session => {
                    // 使用 key 进行精确匹配，避免基于 tags 的模糊匹配导致误删
                    const sessionKey = String(session.key || '');
                    const targetPath = String(folderPath || '');

                    // 匹配规则：key 等于文件夹路径（极少情况）或 key 以 "文件夹路径/" 开头
                    return sessionKey === targetPath || sessionKey.startsWith(targetPath + '/');
                });
            }

            // 如果前端没有找到匹配的会话，尝试从数据库查询
            if (sessionsToDelete.length === 0) {
                console.log('[SessionSync] 前端未找到匹配会话，尝试从数据库查询');
                try {
                    const findUrl = buildServiceUrl('query_documents', {
                        cname: 'sessions',
                        limit: 1000
                    });
                    const findResp = await getData(findUrl, {}, false);
                    const dbSessions = findResp?.data?.list || [];

                    if (dbSessions.length > 0) {
                        sessionsToDelete = dbSessions.filter(session => {
                            const sessionKey = String(session.key || '');
                            const targetPath = String(folderPath || '');
                            return sessionKey === targetPath || sessionKey.startsWith(targetPath + '/');
                        });
                    }
                } catch (e) {
                    console.warn('[SessionSync] 从数据库查询会话失败:', e.message);
                }
            }

            console.log(`[SessionSync] 找到 ${sessionsToDelete.length} 个关联会话需要删除`);

            let deletedCount = 0;
            const errors = [];

            // 并行删除
            const deletePromises = sessionsToDelete.map(async (session) => {
                try {
                    // 严格使用 session.key，确保与 session 对象一致
                    const finalKey = session.key;
                    if (!finalKey) {
                        console.warn('[SessionSync] 会话缺少 key:', session);
                        throw new Error('会话缺少 key');
                    }
                    await this.deleteSession(finalKey);
                    deletedCount++;
                } catch (e) {
                    console.error(`[SessionSync] 删除会话失败: ${session.title}`, e);
                    errors.push({ key: session.key, error: e.message });
                }
            });

            await Promise.all(deletePromises);

            // 即使有错误也返回成功，因为前端已经移除了
            return {
                success: true,
                deletedCount,
                totalFound: sessionsToDelete.length,
                errors
            };
        }, '删除文件夹关联会话');
    }

    /**
     * 获取会话（带请求去重）
     * @param {string} sessionKey - 会话Key
     * @returns {Promise<Object|null>} 会话数据
     */
    async getSession(sessionKey) {
        return safeExecuteAsync(async () => {
            try {
                if (!sessionKey || typeof sessionKey !== 'string') {
                    console.warn('[SessionSync] 会话Key无效:', sessionKey);
                    return null;
                }
                
                // 请求去重：如果同一个 sessionKey 正在请求中，复用该请求
                if (!this._pendingGetSessionRequests) {
                    this._pendingGetSessionRequests = new Map();
                }
                
                const pendingRequest = this._pendingGetSessionRequests.get(sessionKey);
                if (pendingRequest) {
                    console.log('[SessionSync] 复用正在进行的请求:', sessionKey);
                    return await pendingRequest;
                }
                
                // 创建新的请求
                const requestPromise = (async () => {
                    try {
                        // 只按 key 查询 (key 必须是会话的 key，UUID 格式)
                        const url = buildServiceUrl('query_documents', {
                            cname: 'sessions',
                            filter: { key: sessionKey },
                            limit: 1
                        });
                        console.log('[SessionSync] 发起获取会话请求:', sessionKey);
                        const response = await getData(url, {}, false);
                        
                        if (response && response.data && response.data.list && response.data.list.length > 0) {
                            const session = response.data.list[0];
                            // 确保 key 字段存在
                            if (session && !session.key) {
                                console.warn('[SessionSync] 会话缺少 key 字段:', session);
                                return null;
                            }
                            // 规范化消息格式，确保 messages 字段始终存在（即使是空数组）
                            session.messages = this.normalizeMessages(session.messages || []);
                            if (Object.prototype.hasOwnProperty.call(session, 'pageContent')) {
                                delete session.pageContent;
                            }
                            console.log('[SessionSync] 获取会话成功:', sessionKey);
                            return session;
                        }
                        return null;
                    } finally {
                        // 请求完成后，从 pending 中移除
                        this._pendingGetSessionRequests.delete(sessionKey);
                    }
                })();
                
                // 保存到 pending 中
                this._pendingGetSessionRequests.set(sessionKey, requestPromise);
                return await requestPromise;
            } catch (error) {
                // 确保错误时也从 pending 中移除
                if (this._pendingGetSessionRequests) {
                    this._pendingGetSessionRequests.delete(sessionKey);
                }
                console.warn('[SessionSync] 获取会话失败:', {
                    sessionKey,
                    error: error?.message || error
                });
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
                    url: String(sessionData.url || ''),
                    title: String(sessionData.title || '').trim().replace(/\s+/g, '_'),
                    pageDescription: String(sessionData.pageDescription || ''),
                    messages: this.normalizeMessages(sessionData.messages || []),
                    tags: Array.isArray(sessionData.tags) ? sessionData.tags : [],
                    isFavorite: sessionData.isFavorite !== undefined ? Boolean(sessionData.isFavorite) : false,
                    createdAt: this.normalizeTimestamp(sessionData.createdAt),
                    updatedAt: this.normalizeTimestamp(sessionData.updatedAt),
                    lastAccessTime: this.normalizeTimestamp(sessionData.lastAccessTime)
                };

                normalized.messages = await this.uploadAndReplaceMessageImages(normalized.messages);

                // 判断是创建还是更新
                let method_name, parameters;
                if (sessionData.key) {
                    // 更新文档
                    // 注意：update_document 只需要 key 进行定位，但 data 中也必须包含 key 以通过校验
                    method_name = 'update_document';
                    parameters = {
                        cname: 'sessions',
                        data: {
                            key: sessionData.key,
                            ...normalized
                        }
                    };
                } else {
                    // 创建文档
                    method_name = 'create_document';
                    parameters = {
                        cname: 'sessions',
                        data: normalized
                    };
                }

                const payload = {
                    module_name: SERVICE_MODULE,
                    method_name,
                    parameters
                };

                const response = await postData(`${this.apiUrl}/`, payload);

                if (response && response.success !== false) {
                    console.log('[SessionSync] 会话保存成功');
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
     * @param {string} sessionKey - 会话Key
     * @returns {Promise<Object>} 删除结果
     */
    async deleteSession(sessionKey) {
        return safeExecuteAsync(async () => {
            try {
                if (!sessionKey || typeof sessionKey !== 'string') {
                    throw new Error('会话Key无效');
                }

                console.log('[SessionSync] 尝试删除会话:', sessionKey);

                // 首先尝试直接删除
                let payload = {
                    module_name: SERVICE_MODULE,
                    method_name: 'delete_document',
                    parameters: {
                        cname: 'sessions',
                        key: sessionKey
                    }
                };

                let response = await postData(`${this.apiUrl}/`, payload);

                if (response && response.success !== false) {
                    console.log('[SessionSync] 会话删除成功（直接删除）:', sessionKey);
                    return response;
                }

                console.warn('[SessionSync] 直接删除失败，尝试通过路径查找会话:', sessionKey);

                // 如果直接删除失败，尝试通过多种方式查找会话
                // 方式1: 精确匹配 key
                // 方式2: 从路径提取 title 和 tags 进行匹配
                const pathParts = sessionKey.split('/').filter(Boolean);
                const title = pathParts.length > 0 ? pathParts[pathParts.length - 1] : null;
                const tags = pathParts.length > 1 ? pathParts.slice(0, -1) : [];

                let findFilters = [];

                // 过滤器1: 精确匹配 key
                findFilters.push({ key: sessionKey });

                // 过滤器2: 如果有 title，尝试匹配 title + tags
                if (title) {
                    findFilters.push({ title: title });
                    if (tags.length > 0) {
                        findFilters.push({ title: title, tags: tags });
                    }
                }

                // 尝试各种过滤器查找会话
                for (const filter of findFilters) {
                    try {
                        console.log('[SessionSync] 尝试查找会话，filter:', filter);
                        const findUrl = buildServiceUrl('query_documents', {
                            cname: 'sessions',
                            filter: filter,
                            limit: 10
                        });
                        const findResp = await getData(findUrl, {}, false);
                        const items = findResp?.data?.list || [];

                        if (items && items.length > 0) {
                            console.log(`[SessionSync] 找到 ${items.length} 个匹配会话`);

                            // 尝试删除找到的所有会话
                            let lastSuccess = null;
                            for (const item of items) {
                                if (item.key) {
                                    try {
                                        console.log('[SessionSync] 尝试删除找到的会话，key:', item.key);
                                        payload.parameters.key = item.key;
                                        const retryResponse = await postData(`${this.apiUrl}/`, payload);
                                        if (retryResponse && retryResponse.success !== false) {
                                            console.log('[SessionSync] 会话删除成功:', item.key);
                                            lastSuccess = retryResponse;
                                        }
                                    } catch (e) {
                                        console.warn('[SessionSync] 删除找到的会话失败:', e.message);
                                    }
                                }
                            }

                            if (lastSuccess) {
                                return lastSuccess;
                            }
                        }
                    } catch (findError) {
                        console.warn('[SessionSync] 查找会话失败:', findError.message);
                    }
                }

                // 如果已经执行到这里，说明所有方法都失败了
                // 但为了用户体验，我们仍然返回成功（至少前端已经移除了）
                console.warn('[SessionSync] 所有删除方法都失败，但前端将继续:', sessionKey);
                return { success: true, message: '前端已移除，数据库删除失败' };

            } catch (error) {
                console.error('[SessionSync] 删除会话异常:', {
                    sessionKey,
                    error: error?.message || error,
                    stack: error?.stack
                });
                // 即使出错也不抛出，避免阻塞用户操作
                return { success: true, message: '前端已移除，数据库删除异常' };
            }
        }, '删除会话');
    }

    /**
     * 重命名会话（迁移数据）
     * 1. 获取旧会话数据（保留消息历史）
     * 2. 删除旧会话
     * 3. 创建新会话（注入旧消息和更新后的元数据）
     * 
     * @param {string} oldKey - 旧会话Key (通常是旧文件路径)
     * @param {string} newKey - 新会话Key (通常是新文件路径)
     * @param {Object} newFile - 新文件对象 (包含新路径和内容)
     * @returns {Promise<Object>} 新会话保存结果
     */
    async renameSession(targetKey, newKey, newFile) {
        return safeExecuteAsync(async () => {
            console.log(`[SessionSync] 开始重命名会话 (Update模式): ${targetKey} -> ${newKey}`);
            
            // 基于新文件生成基础数据
            const newSessionData = this.fileToSession(newFile);
            if (!newSessionData) throw new Error('无法从文件对象创建会话数据');

            // 构造只包含变更字段的更新数据
            const updateData = {
                // 必须包含 key 以修复 "Execution failed: 更新数据必须包含 key 字段"
                key: targetKey,
                
                // 更新文件相关元数据
                title: String(newSessionData.title || '').trim().replace(/\s+/g, '_'),
                pageDescription: String(newSessionData.pageDescription || ''),
                // pageContent: String(newSessionData.pageContent || ''), // 可选：如果重命名不涉及内容变更，可以不传
                tags: Array.isArray(newSessionData.tags) ? newSessionData.tags : [],
                updatedAt: Date.now()
            };

            // 3. 执行更新
            // 注意：update_document 只需要 key 进行定位，但 data 中也必须包含 key 以通过校验
            const payload = {
                module_name: SERVICE_MODULE,
                method_name: 'update_document',
                parameters: {
                    cname: 'sessions',
                    key: targetKey, // 使用 UUID 定位文档
                    data: updateData // 更新内容
                }
            };

            const response = await postData(`${this.apiUrl}/`, payload);

            if (response && response.success !== false) {
                console.log('[SessionSync] 会话重命名成功:', newKey);
                return response;
            } else {
                // 如果更新失败，可能是因为 targetKey 其实是路径而不是 UUID，且后端找不到
                // 但由于要求不能 query，这里只能抛出错误
                throw new Error(response?.message || '重命名会话失败');
            }
        }, '重命名会话');
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
                const existingSession = await this.getSession(session.key);
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
     * 从 YiPet 会话系统加载数据，转换为 aicr 的文件格式
     * @returns {Promise<Object>} 包含文件的数据对象
     */
    async loadFromSessions() {
        return safeExecuteAsync(async () => {
            try {
                // 获取所有会话（通过列表接口）
                const url = buildServiceUrl('query_documents', {
                    cname: 'sessions',
                    limit: 1000
                });
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

                // 加载所有会话
                const projectSessions = sessions;

                console.log(`[SessionSync] 从会话系统加载到 ${projectSessions.length} 个会话`);

                // 将会话转换为文件
                const files = [];

                for (const session of projectSessions) {
                    // 从会话ID提取文件路径
                    // key 必须是会话的 key（UUID 格式）
                    const sessionKey = session.key;
                    if (!sessionKey) {
                        console.warn('[SessionSync] 会话缺少 key 字段，跳过:', session);
                        continue;
                    }
                    const filePath = this.extractFilePathFromSessionKey(sessionKey);
                    
                    if (filePath) {
                        // 转换为文件
                        const file = {
                            fileKey: sessionKey || filePath, // 优先使用UUID格式的sessionKey
                            key: filePath,
                            path: filePath,
                            sessionKey: sessionKey, // 添加sessionKey字段
                            name: String(session.title || session.pageTitle || filePath.split('/').pop() || '未命名文件')
                                .trim()
                                .replace(/\s+/g, '_'),
                            content: '',
                            createdAt: this.normalizeTimestamp(session.createdAt),
                            updatedAt: this.normalizeTimestamp(session.updatedAt)
                        };
                        files.push(file);

                    }
                }

                console.log(`[SessionSync] 转换得到 ${files.length} 个文件`);
                return { files };
            } catch (error) {
                console.error('[SessionSync] 从会话系统加载数据失败:', error);
                return { files: [] };
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

