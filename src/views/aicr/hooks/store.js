/**
 * 代码审查页面数据存储管理
 * author: liangliang
 */

import { getData, postData } from '/src/services/index.js';
import { buildServiceUrl } from '/src/services/helper/requestHelper.js';
import { safeExecuteAsync, createError, ErrorTypes } from '/src/utils/error.js';
import { getSessionSyncService } from '/src/views/aicr/services/sessionSyncService.js';
import {
    normalizeFilePath,
    normalizeFileObject,
    normalizeTreeNode
} from '/src/views/aicr/utils/fileFieldNormalizer.js';

export function buildFileTreeFromSessions(allSessions) {
    const sessionsList = Array.isArray(allSessions) ? allSessions.filter(Boolean) : [];
    const treeRoots = [];
    const sessionPathMap = new Map();

    const normalizeFolders = (tags) => {
        if (!Array.isArray(tags)) return [];
        return tags
            .map(t => (t == null ? '' : String(t)).trim())
            .filter(t => t.length > 0 && String(t).toLowerCase() !== 'default');
    };

    const sanitizeFileName = (name) => String(name || '').replace(/\//g, '-');

    const sortable = sessionsList.map((s) => {
        const folderParts = normalizeFolders(s.tags);
        const folderKey = folderParts.join('/');
        const baseName = sanitizeFileName(s.title || s.pageTitle || 'Untitled');
        const stableId = String(s.key || '');
        return { s, folderParts, folderKey, baseName, stableId };
    });

    sortable.sort((a, b) => {
        const folderCmp = (a.folderKey || '').localeCompare(b.folderKey || '', 'zh-CN');
        if (folderCmp !== 0) return folderCmp;
        const nameCmp = (a.baseName || '').localeCompare(b.baseName || '', 'zh-CN');
        if (nameCmp !== 0) return nameCmp;
        return (a.stableId || '').localeCompare(b.stableId || '', 'zh-CN');
    });

    for (const item of sortable) {
        const session = item.s;
        const pathTags = item.folderParts;

        let currentLevelChildren = treeRoots;
        let currentPath = '';

        for (const folderNameRaw of pathTags) {
            const folderName = String(folderNameRaw || '').trim();
            if (!folderName) continue;

            currentPath = currentPath ? currentPath + '/' + folderName : folderName;
            let folderNode = currentLevelChildren.find(c => c.name === folderName && c.type === 'folder');
            if (!folderNode) {
                folderNode = {
                    key: currentPath,
                    name: folderName,
                    type: 'folder',
                    children: []
                };
                currentLevelChildren.push(folderNode);
            }
            currentLevelChildren = folderNode.children;
        }

        const fileName = item.baseName;

        let uniqueName = fileName;
        let counter = 1;
        while (currentLevelChildren.find(c => c.name === uniqueName && c.type === 'file')) {
            uniqueName = `${fileName} (${counter})`;
            counter++;
        }

        const fileKey = currentPath ? currentPath + '/' + uniqueName : uniqueName;
        const sessionKey = session.key;

        currentLevelChildren.push({
            key: fileKey,
            name: uniqueName,
            type: 'file',
            content: '',
            size: 0,
            lastModified: session.updatedAt || session.createdAt,
            sessionKey: sessionKey
        });

        if (sessionKey != null) {
            sessionPathMap.set(String(sessionKey), fileKey);
        }
    }

    const sortNodes = (nodes) => {
        if (!nodes) return;
        nodes.sort((a, b) => {
            if (a.type === b.type) return (a.name || '').localeCompare(b.name || '', 'zh-CN');
            return a.type === 'folder' ? -1 : 1;
        });
        nodes.forEach(n => {
            if (n.children) sortNodes(n.children);
        });
    };
    sortNodes(treeRoots);

    const allFolders = new Set();
    const collectFolders = (nodes) => {
        if (!nodes) return;
        if (Array.isArray(nodes)) nodes.forEach(n => collectFolders(n));
        else {
            if (nodes.type === 'folder') {
                allFolders.add(nodes.key);
                if (nodes.children) collectFolders(nodes.children);
            }
        }
    };
    collectFolders(treeRoots);

    return { treeRoots, expandedFolders: allFolders, sessionPathMap };
}

/**
 * 统一的文件删除服务
 * 确保导入文件和新建文件的删除行为完全一致
 */
class FileDeleteService {
    constructor() {
        this.apiUrl = window.API_URL || 'https://api.effiy.cn';
    }

    /**
     * 从文件对象中提取所有可能的标识符
     * 支持导入文件和新建文件的不同数据结构
     * @param {Object} file - 文件对象
     * @returns {Object} 包含 key, isFile 的对象
     */
    extractFileIdentifiers(file) {
        if (!file || typeof file !== 'object') {
            return { key: null, isFile: false };
        }

        // 提取 key（优先使用 key 作为路径标识）
        const key = file.key || file.path ||
            (file.data && (file.data.key || file.data.path)) ||
            null;

        // 判断是否为文件（不是文件夹）
        const isFile = file.type === 'file' ||
            (!file.type && key && !key.endsWith('/')) ||
            false;

        return { key, isFile };
    }

    /**
     * 删除单个文件（仅删除会话）
     * 这是统一的删除入口，确保导入文件和新建文件的删除行为完全一致
     * @param {Object} file - 文件对象
     * @returns {Promise<Object>} 删除结果 { sessionSuccess }
     */
    async deleteFile(file) {
        // 提取文件标识符
        const { key, isFile } = this.extractFileIdentifiers(file);

        // 如果 key 仍然为空，尝试从原始文件对象中直接提取
        let finalKey = key;
        if (!finalKey && file) {
            finalKey = file.key || file.path || null;
        }

        // 优先使用明确指定的 sessionKey
        const sessionKey = file?.sessionKey || finalKey;
        // 静态文件路径优先使用 path
        const staticPath = file?.path || finalKey;

        console.log('[FileDeleteService] 开始删除文件:', {
            key: finalKey,
            sessionKey,
            staticPath,
            isFile,
            fileType: file?.type
        });

        // 如果缺少 key，无法删除
        if (!finalKey && !sessionKey) {
            console.error('[FileDeleteService] ✗ 无法删除文件：缺少 key', { file });
            return {
                sessionSuccess: false,
                key: finalKey,
                isFile,
                error: '缺少 key'
            };
        }

        const result = {
            sessionSuccess: false,
            key: finalKey,
            isFile
        };

        // 删除会话（仅对文件，不对文件夹）
        if (isFile) {
            result.sessionSuccess = await this.deleteSession(sessionKey);

            // 删除静态文件
            try {
                const base = String(this.apiUrl || '').replace(/\/+$/, '');
                const endpoint = `${base}/delete-file`;
                const response = await postData(endpoint, {
                    target_file: staticPath
                });
                console.log('[FileDeleteService] 静态文件删除结果:', response);
            } catch (e) {
                console.warn('[FileDeleteService] 静态文件删除失败（可能是目录或已删除）:', e.message);
                // 不视为致命错误，因为如果是文件夹删除流程，文件可能已经被删除
            }
        } else {
            if (!isFile) {
                console.debug('[FileDeleteService] ✗ 跳过会话删除（不是文件）:', { key: finalKey, type: file?.type });
            }
        }

        return result;
    }

    /**
     * 重命名文件
     * @param {string} oldPath - 旧路径
     * @param {string} newPath - 新路径
     * @returns {Promise<Object>} 结果
     */
    async renameFile(oldPath, newPath) {
        console.log('[FileDeleteService] 重命名文件:', oldPath, '->', newPath);
        try {
            const base = String(this.apiUrl || '').replace(/\/+$/, '');
            const endpoint = `${base}/rename-file`;
            const response = await postData(endpoint, {
                old_path: oldPath,
                new_path: newPath
            });
            return { success: true, response };
        } catch (e) {
            console.warn('[FileDeleteService] 静态文件重命名失败:', e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * 重命名文件夹
     * @param {string} oldPath - 旧路径
     * @param {string} newPath - 新路径
     * @returns {Promise<Object>} 结果
     */
    async renameFolder(oldPath, newPath) {
        console.log('[FileDeleteService] 重命名文件夹:', oldPath, '->', newPath);
        try {
            const base = String(this.apiUrl || '').replace(/\/+$/, '');
            const endpoint = `${base}/rename-folder`;
            const response = await postData(endpoint, {
                old_dir: oldPath,
                new_dir: newPath
            });
            return { success: true, response };
        } catch (e) {
            console.warn('[FileDeleteService] 静态文件夹重命名失败:', e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * 删除文件夹
     * 1. 删除文件夹关联的所有会话
     * 2. 调用后端接口删除静态目录
     * @param {string} folderKey - 文件夹Key（即路径）
     * @param {Array} allSessions - 所有会话列表
     * @returns {Promise<Object>} 删除结果
     */
    async deleteFolder(folderKey, allSessions) {
        if (!folderKey) return { success: false, error: '文件夹路径为空' };

        console.log('[FileDeleteService] 开始删除文件夹:', folderKey);

        const result = {
            folderKey,
            sessionResult: null,
            staticResult: null,
            success: false
        };

        try {
            // 1. 删除关联会话
            const sessionSync = getSessionSyncService();
            result.sessionResult = await sessionSync.deleteSessionsByFolder(folderKey, allSessions);
            console.log('[FileDeleteService] 会话删除结果:', result.sessionResult);

            // 2. 删除静态目录
            // 注意：folderKey 在这里被视为相对路径
            try {
                const base = String(this.apiUrl || '').replace(/\/+$/, '');
                const endpoint = `${base}/delete-folder`;
                const response = await postData(endpoint, {
                    target_dir: folderKey
                });
                result.staticResult = response;
                console.log('[FileDeleteService] 静态目录删除结果:', response);
            } catch (e) {
                console.warn('[FileDeleteService] 静态目录删除失败:', e);
                result.staticResult = { success: false, error: e.message };
            }

            result.success = result.sessionResult?.success !== false;

            return result;
        } catch (error) {
            console.error('[FileDeleteService] 文件夹删除失败:', error);
            return {
                ...result,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 批量删除文件
     * @param {Array<Object>} files - 文件对象数组
     * @returns {Promise<Array<Object>>} 删除结果数组
     */
    async deleteFiles(files) {
        if (!Array.isArray(files) || files.length === 0) {
            console.warn('[FileDeleteService] 批量删除：文件列表为空');
            return [];
        }

        console.log('[FileDeleteService] 开始批量删除，文件数:', files.length);

        const results = [];
        for (const file of files) {
            try {
                const result = await this.deleteFile(file);
                results.push(result);
            } catch (error) {
                console.error('[FileDeleteService] 批量删除单个文件失败:', error);
                results.push({
                    mongoSuccess: false,
                    sessionSuccess: false,
                    error: error?.message,
                    file
                });
            }
        }

        const successCount = results.filter(r => r.mongoSuccess).length;
        const sessionSuccessCount = results.filter(r => r.sessionSuccess).length;
        console.log('[FileDeleteService] 批量删除完成:', {
            总数: files.length,
            MongoDB成功: successCount,
            会话成功: sessionSuccessCount
        });

        return results;
    }

    /**
     * 删除会话
     * @param {string} sessionKey - 会话Key
     * @returns {Promise<boolean>} 是否成功
     */
    async deleteSession(sessionKey) {
        try {
            const sessionSync = getSessionSyncService();
            // 直接使用传入的 sessionKey
            // 注意：generateSessionKey 仅用于从文件路径生成Key，这里我们可能已经有了真实的 sessionKey
            const finalKey = sessionKey || sessionSync.generateSessionKey(sessionKey);
            await sessionSync.deleteSession(finalKey);
            console.log('[FileDeleteService] 会话删除成功:', finalKey);
            return true;
        } catch (error) {
            console.warn('[FileDeleteService] 会话删除失败:', error?.message);
            return false;
        }
    }
}

// 创建单例
let fileDeleteServiceInstance = null;
export function getFileDeleteService() {
    if (!fileDeleteServiceInstance) {
        fileDeleteServiceInstance = new FileDeleteService();
    }
    return fileDeleteServiceInstance;
}

// 兼容Vue2和Vue3的ref获取方式
const vueRef = typeof Vue !== 'undefined' && Vue.ref ? Vue.ref : (val) => ({ value: val });

/**
 * 数据存储工厂函数
 * 管理文件树、代码文件、选中状态、加载状态和错误信息
 * @returns {Object} store对象，包含fileTree, files, selectedKey等方法
 */
export const createStore = () => {
    // 文件目录树
    const fileTree = vueRef([]);
    // 文件树对应的后端文档key（用于持久化更新）
    const fileTreeDocKey = vueRef('');
    // 代码文件内容
    const files = vueRef([]);
    // 待处理的文件加载请求（用于去重）
    const pendingFileRequests = new Map();
    // 当前选中的文件Key
    const selectedKey = vueRef(null);
    // 加载状态
    const loading = vueRef(false);
    // 错误信息
    const error = vueRef(null);
    // 错误消息
    const errorMessage = vueRef('');
    // 展开的文件夹状态
    const expandedFolders = vueRef(new Set());
    // 侧边栏收缩状态
    const sidebarCollapsed = vueRef(false);
    // 侧边栏宽度（文件树）
    const sidebarWidth = vueRef(320);
    // 右侧聊天面板（代码视图下）收缩状态与宽度
    const chatPanelCollapsed = vueRef(false);
    const chatPanelWidth = vueRef(420);

    // 搜索相关状态
    const searchQuery = vueRef('');

    // 批量选择相关状态
    const batchMode = vueRef(false);
    const selectedKeys = vueRef(new Set());

    // 会话批量选择相关状态
    const sessionBatchMode = vueRef(false);
    const selectedSessionKeys = vueRef(new Set());
    // 外部选中的会话Key（用于从文件视图切换时自动选中）
    const externalSelectedSessionKey = vueRef(null);

    // 视图模式：'tree' 树形视图，'tags' 标签视图
    const viewMode = vueRef('tree');

    // 会话列表相关状态
    const sessions = vueRef([]);
    const sessionLoading = vueRef(false);
    const sessionError = vueRef(null);
    const sessionListVisible = vueRef(false);
    const selectedSessionTags = vueRef([]);
    const sessionSearchQuery = vueRef('');
    const sessionSidebarWidth = vueRef(320);

    const activeSession = vueRef(null);
    const activeSessionLoading = vueRef(false);
    const activeSessionError = vueRef(null);
    const sessionChatInput = vueRef('');
    const sessionChatDraftImages = vueRef([]);
    const sessionChatLastDraftText = vueRef('');
    const sessionChatLastDraftImages = vueRef([]);
    const sessionChatSending = vueRef(false);
    const sessionChatAbortController = vueRef(null);
    const sessionChatStreamingTargetTimestamp = vueRef(null);
    const sessionChatStreamingType = vueRef('');
    const sessionChatCopyFeedback = vueRef({});
    const sessionChatRegenerateFeedback = vueRef({});
    const sessionContextEnabled = vueRef(true);
    const sessionContextEditorVisible = vueRef(false);
    const sessionContextDraft = vueRef('');
    const sessionContextMode = vueRef('edit');
    const sessionContextUndoVisible = vueRef(false);
    const sessionContextOptimizeBackup = vueRef('');
    // 消息编辑相关状态
    const sessionMessageEditorVisible = vueRef(false);
    const sessionMessageEditorDraft = vueRef('');
    const sessionMessageEditorMode = vueRef('edit');
    const sessionMessageEditorIndex = vueRef(-1);
    const sessionFaqVisible = vueRef(false);
    const sessionFaqSearchKeyword = vueRef('');
    const sessionFaqItems = vueRef([]);
    const sessionFaqLoading = vueRef(false);
    const sessionFaqError = vueRef(null);
    const sessionFaqSelectedTags = vueRef([]);
    const sessionFaqTagFilterReverse = vueRef(false);
    const sessionFaqTagFilterNoTags = vueRef(false);
    const sessionFaqTagFilterExpanded = vueRef(false);
    const sessionFaqTagFilterVisibleCount = vueRef(12);
    const sessionFaqTagFilterSearchKeyword = vueRef('');
    const sessionFaqTagManagerVisible = vueRef(false);
    const sessionSettingsVisible = vueRef(false);
    const sessionBotModel = vueRef('');
    const sessionBotSystemPrompt = vueRef('你是一个专业、简洁且可靠的 AI 助手。');
    const sessionBotModelDraft = vueRef('');
    const sessionBotSystemPromptDraft = vueRef('');
    const weChatSettingsVisible = vueRef(false);
    const weChatRobotEnabled = vueRef(false);
    const weChatRobotWebhook = vueRef('');
    const weChatRobotAutoForward = vueRef(false);
    const weChatRobotEnabledDraft = vueRef(false);
    const weChatRobotWebhookDraft = vueRef('');
    const weChatRobotAutoForwardDraft = vueRef(false);
    const weChatRobots = vueRef([]);
    const weChatRobotsDraft = vueRef([]);
    // 会话编辑相关状态
    const sessionEditVisible = vueRef(false);
    const sessionEditKey = vueRef(null);
    const sessionEditTitle = vueRef('');
    const sessionEditUrl = vueRef('');
    const sessionEditDescription = vueRef('');
    const sessionEditGenerating = vueRef(false);
    const sessionEditData = vueRef(null); // 缓存编辑中的会话数据，避免重复获取

    // 标签过滤相关状态
    const tagFilterReverse = vueRef(false); // 是否反向过滤会话
    const tagFilterNoTags = vueRef(false); // 是否筛选无标签的会话
    const tagFilterExpanded = vueRef(false); // 标签列表是否展开
    const tagFilterVisibleCount = vueRef(8); // 折叠时显示的标签数量
    const tagFilterSearchKeyword = vueRef(''); // 标签搜索关键词
    const tagOrder = vueRef(null); // 标签顺序（从localStorage加载）

    // 确保 sessions 始终是数组
    if (!sessions.value || !Array.isArray(sessions.value)) {
        sessions.value = [];
    }

    // 会话同步服务
    const sessionSync = getSessionSyncService();

    /**
     * 异步加载文件树数据
     * @param {boolean} forceClear - 是否在数据为空时强制清空（默认 false，保留现有数据以避免清空问题）
     */
    const loadFileTree = async (forceClear = false) => {
        return safeExecuteAsync(async () => {
            loading.value = true;
            error.value = null;
            errorMessage.value = '';

            console.log('[loadFileTree] 正在加载全局文件树数据...');

            // Ensure sessions are loaded
            if (!sessions.value || sessions.value.length === 0) {
                await loadSessions();
            }

            const allSessions = sessions.value;
            console.log('[loadFileTree] 会话总数:', allSessions.length);

            if (allSessions.length === 0) {
                if (forceClear) fileTree.value = [];
                return [];
            }

            const { treeRoots, expandedFolders: folderSet } = buildFileTreeFromSessions(allSessions);

            fileTree.value = treeRoots;
            fileTreeDocKey.value = '';

            console.log(`[loadFileTree] 成功构建文件树, 包含 ${allSessions.length} 个文件`);

            expandedFolders.value = folderSet;

            return fileTree.value;
        }, '文件树数据加载', (errorInfo) => {
            error.value = errorInfo.message;
            errorMessage.value = errorInfo.message;
            if (forceClear) fileTree.value = [];
        }).finally(() => {
            loading.value = false;
        });
    };

    /**
     * 展开当前树的所有文件夹（本地）
     */
    const expandAllFolders = () => {
        const all = new Set();
        const collect = (nodes) => {
            if (!nodes) return;
            if (!Array.isArray(nodes)) {
                if (nodes.type === 'folder') {
                    all.add(nodes.key);
                    if (nodes.children) collect(nodes.children);
                }
                return;
            }
            nodes.forEach(n => {
                if (n.type === 'folder') {
                    all.add(n.key);
                    if (n.children) collect(n.children);
                }
            });
        };
        collect(fileTree.value);
        expandedFolders.value = all;
    };

    /**
     * 在树中查找节点及其父节点
     */
    function findNodeAndParentByKey(rootNodes, targetKey) {
        const stack = Array.isArray(rootNodes) ? rootNodes.map(n => ({ node: n, parent: null })) : [{ node: rootNodes, parent: null }];
        while (stack.length) {
            const { node, parent } = stack.pop();
            if (!node) continue;
            if (node.key === targetKey) return { node, parent };
            if (node.type === 'folder' && Array.isArray(node.children)) {
                for (const child of node.children) {
                    stack.push({ node: child, parent: node });
                }
            }
        }
        return { node: null, parent: null };
    }

    /**
     * 创建文件夹
     */
    const createFolder = async ({ parentId, name }) => {
        return safeExecuteAsync(async () => {
            if (!name || !name.trim()) {
                throw createError('文件夹名称不能为空', ErrorTypes.VALIDATION, '新建文件夹');
            }
            // 修正：使用完整 fileTree.value 作为根，支持数组结构
            const root = fileTree.value;
            if (!root) throw createError('文件树未加载', ErrorTypes.API, '新建文件夹');

            let parentNode = null;
            let targetChildren = null;

            if (!parentId) {
                // 根目录创建
                if (Array.isArray(root)) {
                    targetChildren = root;
                } else {
                    parentNode = root;
                    if (parentNode.type !== 'folder') throw createError('根节点无效', ErrorTypes.VALIDATION, '新建文件夹');
                    targetChildren = parentNode.children = parentNode.children || [];
                }
            } else {
                // 子目录创建
                const result = findNodeAndParentByKey(root, parentId);
                parentNode = result.node;
                if (!parentNode || parentNode.type !== 'folder') {
                    throw createError('父级目录无效', ErrorTypes.VALIDATION, '新建文件夹');
                }
                targetChildren = parentNode.children = parentNode.children || [];
            }

            // 保证同级唯一
            const exists = targetChildren.find(ch => ch.name === name);
            if (exists) throw createError('同名文件或文件夹已存在', ErrorTypes.VALIDATION, '新建文件夹');

            const parentKey = parentNode ? parentNode.key : '';
            const newId = (parentKey ? `${parentKey}/` : '') + name;
            // 使用 normalizeTreeNode 确保 key 和 path
            const folderNode = normalizeTreeNode({
                key: newId,
                name,
                type: 'folder',
                children: []
            });
            if (folderNode) {
                targetChildren.push(folderNode);
            }

            // 对父节点的子节点进行排序
            const sortFileTreeItems = (items) => {
                if (!Array.isArray(items)) return items;

                return items.sort((a, b) => {
                    // 首先按类型排序：文件夹在前，文件在后
                    if (a.type === 'folder' && b.type !== 'folder') {
                        return -1;
                    }
                    if (a.type !== 'folder' && b.type === 'folder') {
                        return 1;
                    }

                    // 同类型按名称排序（不区分大小写）
                    const nameA = (a.name || '').toLowerCase();
                    const nameB = (b.name || '').toLowerCase();
                    return nameA.localeCompare(nameB, 'zh-CN');
                });
            };

            const sorted = sortFileTreeItems(targetChildren);
            if (parentNode) {
                parentNode.children = sorted;
            } else if (Array.isArray(root)) {
                fileTree.value = sorted;
            }
            // 保持全部展开
            expandAllFolders();

            return newId;
        }, '创建文件夹');
    };

    /**
     * 创建文件
     * @param {Object} options - 创建文件选项
     * @param {string} options.parentId - 父节点ID
     * @param {string} options.name - 文件名
     * @param {string} options.content - 文件内容
     * @param {boolean} options.skipProjectFiles - 是否跳过 projectFiles 接口调用（当通过 persistFileTree 已持久化时使用）
     */
    const createFile = async ({ parentId, name, content = '', skipProjectFiles = false }) => {
        return safeExecuteAsync(async () => {
            if (!name || !name.trim()) {
                throw createError('文件名称不能为空', ErrorTypes.VALIDATION, '新建文件');
            }
            // 修正：使用完整 fileTree.value 作为根，支持数组结构
            const root = fileTree.value;
            if (!root) throw createError('文件树未加载', ErrorTypes.API, '新建文件');

            let parentNode = null;
            let targetChildren = null;

            if (!parentId) {
                // 根目录创建
                if (Array.isArray(root)) {
                    targetChildren = root;
                } else {
                    parentNode = root;
                    if (parentNode.type !== 'folder') throw createError('根节点无效', ErrorTypes.VALIDATION, '新建文件');
                    targetChildren = parentNode.children = parentNode.children || [];
                }
            } else {
                // 子目录创建
                const result = findNodeAndParentByKey(root, parentId);
                parentNode = result.node;
                if (!parentNode || parentNode.type !== 'folder') {
                    throw createError('父级目录无效', ErrorTypes.VALIDATION, '新建文件');
                }
                targetChildren = parentNode.children = parentNode.children || [];
            }

            if (targetChildren.find(ch => ch.name === name)) {
                throw createError('同名文件或文件夹已存在', ErrorTypes.VALIDATION, '新建文件');
            }

            // 使用统一的路径规范化
            const parentPath = parentNode ? normalizeFilePath(parentNode.key || '') : '';
            const newId = parentPath ? `${parentPath}/${name}` : name;
            const normalizedNewId = normalizeFilePath(newId);
            const now = Date.now();

            // 使用统一的节点规范化工具
            const fileNode = normalizeTreeNode({
                name,
                type: 'file',
                size: content ? content.length : 0,
                modified: now,
                content: content || ''  // 确保 content 字段被设置到文件节点中
            });

            if (fileNode) {
                targetChildren.push(fileNode);
            }

            // 对子节点进行排序
            const sortFileTreeItems = (items) => {
                if (!Array.isArray(items)) return items;

                return items.sort((a, b) => {
                    // 首先按类型排序：文件夹在前，文件在后
                    if (a.type === 'folder' && b.type !== 'folder') {
                        return -1;
                    }
                    if (a.type !== 'folder' && b.type === 'folder') {
                        return 1;
                    }

                    // 同类型按名称排序（不区分大小写）
                    const nameA = (a.name || '').toLowerCase();
                    const nameB = (b.name || '').toLowerCase();
                    return nameA.localeCompare(nameB, 'zh-CN');
                });
            };

            const sorted = sortFileTreeItems(targetChildren);
            if (parentNode) {
                parentNode.children = sorted;
            } else if (Array.isArray(root)) {
                fileTree.value = sorted;
            }
            // 保持全部展开
            expandAllFolders();

            // 调用 write-file 接口创建实际文件
            try {
                const baseUrl = window.API_URL || '';
                const url = `${baseUrl.replace(/\/$/, '')}/write-file`;
                
                // 清理路径：移除 static/ 前缀（如果有）
                const cleanPath = normalizedNewId.startsWith('static/') 
                    ? normalizedNewId.slice(7) 
                    : normalizedNewId;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        target_file: cleanPath,
                        content: content || '',
                        is_base64: false
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `创建文件失败: ${response.status}`);
                }

                const result = await response.json();
                if (result.code !== 0 && result.code !== 200) {
                    throw new Error(result.message || '创建文件失败');
                }

                console.log('[createFile] 文件已通过 write-file 创建:', normalizedNewId);
            } catch (writeError) {
                console.warn('[createFile] 通过 write-file 创建文件失败（已忽略）:', writeError?.message);
                // 不阻止流程继续，因为文件树和会话已创建
            }

            // 更新本地files列表，携带后端返回的key，确保首次保存可PUT更新
            const newFile = normalizeFileObject({
                path: normalizedNewId,
                name,
                content,
                type: 'file'
            });

            if (newFile && Array.isArray(files.value)) {
                files.value.push(newFile);
            }

            // 同步文件到会话（使用规范化后的文件对象）
            try {
                if (newFile) {
                    // 强制立即同步且强制更新，确保会话被创建
                    await sessionSync.syncFileToSession(newFile, true, true);
                    console.log('[createFile] 文件已同步到会话:', normalizedNewId);
                }
            } catch (syncError) {
                console.warn('[createFile] 同步文件到会话失败（已忽略）:', syncError?.message);
            }

            // 文件创建成功后刷新文件树
            try {
                // 先强制刷新会话列表，确保获取到最新创建的会话
                await loadSessions(true);
                // 然后刷新文件树
                await loadFileTree();
                console.log('[createFile] 文件树已刷新');
            } catch (refreshError) {
                console.warn('[createFile] 刷新文件树失败（已忽略）:', refreshError?.message);
            }

            return normalizedNewId;
        }, '创建文件');
    };

    /**
     * 重命名节点
     */
    const renameItem = async ({ itemId, newName }) => {
        return safeExecuteAsync(async () => {
            if (!itemId) throw createError('缺少目标ID', ErrorTypes.VALIDATION, '重命名');
            if (!newName || !newName.trim()) throw createError('名称不能为空', ErrorTypes.VALIDATION, '重命名');
            // 修正：直接使用 fileTree.value 作为搜索根
            const root = fileTree.value;
            const { node, parent } = findNodeAndParentByKey(root, itemId);
            if (!node) throw createError('未找到目标节点', ErrorTypes.API, '重命名');
            // 检查同级重名（如果是根节点，parent为null，则检查fileTree.value）
            const siblings = parent ? (parent.children || []) : (Array.isArray(fileTree.value) ? fileTree.value : [fileTree.value]);
            if (siblings.some(ch => ch !== node && ch.name === newName)) {
                throw createError('同级存在同名项', ErrorTypes.VALIDATION, '重命名');
            }

            // 使用统一的路径规范化计算新ID
            // 获取父节点的规范化路径
            const parentPath = parent ? normalizeFilePath(parent.key || '') : '';
            // 获取旧ID的规范化路径
            const oldPath = normalizeFilePath(node.key || '');
            // 计算新ID的规范化路径
            const newPath = normalizeFilePath(parentPath ? `${parentPath}/${newName}` : newName);
            // 构建完整路径
            const oldId = oldPath;
            const newId = newPath;

            // 调用后端重命名 API
            const fileDeleteService = getFileDeleteService();
            if (node.type === 'folder') {
                const res = await fileDeleteService.renameFolder(oldPath, newPath);
                if (!res.success) {
                    throw createError('文件夹重命名失败: ' + (res.error || '未知错误'), ErrorTypes.API, '重命名');
                }
            } else {
                const res = await fileDeleteService.renameFile(oldPath, newPath);
                if (!res.success) {
                    throw createError('文件重命名失败: ' + (res.error || '未知错误'), ErrorTypes.API, '重命名');
                }
            }

            node.name = newName;

            // 记录变更前的文件列表用于远端同步
            const prevFiles = Array.isArray(files.value) ? files.value.slice() : [];

            const updateKeysRecursively = (n, fromPrefix, toPrefix) => {
                if (n.key && typeof n.key === 'string') {
                    // 比较完整路径
                    if (n.key === fromPrefix) {
                        // 完全匹配，直接替换
                        n.key = toPrefix;
                        n.path = toPrefix;
                    } else if (n.key.startsWith(fromPrefix + '/')) {
                        // 是子节点，替换前缀
                        const suffix = n.key.substring(fromPrefix.length);
                        const newChildId = toPrefix + suffix;
                        n.key = newChildId;
                        n.path = newChildId;
                    }
                } else {
                    // 如果没有 key，确保设置 path
                    if (!n.path) {
                        n.path = n.key || '';
                    }
                }
                if (n.type === 'folder' && Array.isArray(n.children)) {
                    n.children.forEach(child => updateKeysRecursively(child, fromPrefix, toPrefix));
                }
            };
            updateKeysRecursively(node, oldId, newId);

            // 对父节点的子节点进行排序
            const sortFileTreeItems = (items) => {
                if (!Array.isArray(items)) return items;

                return items.sort((a, b) => {
                    // 首先按类型排序：文件夹在前，文件在后
                    if (a.type === 'folder' && b.type !== 'folder') {
                        return -1;
                    }
                    if (a.type !== 'folder' && b.type === 'folder') {
                        return 1;
                    }

                    // 同类型按名称排序（不区分大小写）
                    const nameA = (a.name || '').toLowerCase();
                    const nameB = (b.name || '').toLowerCase();
                    return nameA.localeCompare(nameB, 'zh-CN');
                });
            };

            if (parent && parent.children) {
                parent.children = sortFileTreeItems(parent.children);
            }
            // 保持全部展开
            expandAllFolders();

            // 更新本地files列表（仅当是文件或其子层级文件），使用统一的字段规范化
            if (Array.isArray(files.value)) {
                files.value = files.value.map(f => {
                    const normalizedOldId = normalizeFilePath(oldId);
                    const ids = [f.key, f.path].filter(Boolean).map(id => normalizeFilePath(id));
                    const matched = ids.some(v => v === normalizedOldId || v.startsWith(normalizedOldId + '/'));
                    if (matched) {
                        const oldPath = normalizeFilePath(f.path || f.key);
                        const replacedPath = oldPath.replace(normalizedOldId, newId);
                        // 使用统一的字段规范化工具
                        const normalized = normalizeFileObject({
                            ...f,
                            key: replacedPath,
                            path: replacedPath
                        });
                        return normalized || f;
                    }
                    return f;
                });
            }

            try {
                const normalizedOldId = normalizeFilePath(oldId);
                const affected = prevFiles.filter(f => {
                    const ids = [f.key, f.path].filter(Boolean).map(id => normalizeFilePath(id));
                    return ids.some(v => v === normalizedOldId || v.startsWith(normalizedOldId + '/'));
                });

                // 使用分块并行处理，避免并发请求过多
                const concurrency = 5;
                const chunks = [];
                for (let i = 0; i < affected.length; i += concurrency) {
                    chunks.push(affected.slice(i, i + concurrency));
                }

                console.log(`[renameItem] 开始迁移 ${affected.length} 个文件的会话，分 ${chunks.length} 批处理`);

                for (const chunk of chunks) {
                    await Promise.all(chunk.map(async (f) => {
                        const oldPath = normalizeFilePath(f.path || f.key);
                        const newPath = oldPath.replace(normalizedOldId, newId);

                        // 构造新的文件对象
                        const updatedFile = {
                            ...f,
                            key: newPath,
                            path: newPath,
                            name: newPath.split('/').pop()
                        };

                        // 查找旧会话以获取 UUID (用于后端更新)
                        let targetSessionKey = oldPath;
                        let foundSessionIdx = -1;

                        if (sessions.value && Array.isArray(sessions.value)) {
                            const fName = oldPath.split('/').pop();
                            const fTags = oldPath.split('/').slice(0, -1).filter(Boolean);

                            foundSessionIdx = sessions.value.findIndex(s => {
                                if (s.key === oldPath) return true;
                                // 模糊匹配 (兼容 UUID Key 的情况)
                                const sName = s.title || s.pageTitle;
                                const sTags = s.tags || [];
                                if (sName !== fName) return false;
                                if (sTags.length !== fTags.length) return false;
                                for (let i = 0; i < sTags.length; i++) {
                                    if (String(sTags[i]) !== String(fTags[i])) return false;
                                }
                                return true;
                            });

                            if (foundSessionIdx >= 0) {
                                const foundSession = sessions.value[foundSessionIdx];
                                if (foundSession && foundSession.key) {
                                    targetSessionKey = foundSession.key;
                                }
                            }
                        }

                        try {
                            // 调用 renameSession 进行原子化迁移
                            // 传入真实的 UUID (targetSessionKey) 以避免后端查询
                            await sessionSync.renameSession(targetSessionKey, newPath, updatedFile);

                            // 更新本地 sessions 列表
                            if (foundSessionIdx >= 0 && sessions.value) {
                                // 移除旧会话
                                sessions.value.splice(foundSessionIdx, 1);

                                // 添加新会话（本地模拟）
                                const sessionData = sessionSync.fileToSession(updatedFile);
                                if (sessionData) {
                                    // 保持原有 UUID (如果是更新)
                                    if (targetSessionKey !== oldPath) {
                                        sessionData.key = targetSessionKey;
                                    }
                                    sessions.value.push(sessionData);
                                }
                            }

                            console.log('[renameItem] 会话迁移完成:', oldPath, '->', newPath);
                        } catch (err) {
                            console.error(`[renameItem] 文件 ${oldPath} 会话迁移失败:`, err);
                            // 继续处理其他文件，不中断整体流程
                        }
                    }));
                }
            } catch (e) {
                console.warn('[renameItem] 远端文件同步失败（已忽略）:', e?.message);
            }

            // 同步更新会话（如果是文件）
            // 重命名完成后调用 query_documents 接口刷新会话列表
            await loadSessions(true);

            return newId;
        }, '重命名');
    };

    /**
     * 删除节点
     */
    const deleteItem = async ({ key, itemId }) => {
        return safeExecuteAsync(async () => {
            const targetKey = key || itemId;
            if (!targetKey) throw createError('缺少目标ID', ErrorTypes.VALIDATION, '删除');
            // 修正：直接使用 fileTree.value 作为搜索根，支持数组（多根）结构
            const root = fileTree.value;
            const { node, parent } = findNodeAndParentByKey(root, targetKey);
            if (!node) throw createError('未找到目标节点', ErrorTypes.API, '删除');

            const prevFiles = Array.isArray(files.value) ? files.value.slice() : [];

            // 如果删除的是根节点（顶级文件夹）
            if (!parent) {
                // 从根节点数组中移除
                if (Array.isArray(fileTree.value)) {
                    fileTree.value = fileTree.value.filter(n => n.key !== targetKey);
                } else if (fileTree.value && fileTree.value.key === targetKey) {
                    // 如果是单根对象且就是要删除的节点（通常不会发生，清空？）
                    fileTree.value = [];
                }
            } else {
                // 非根节点删除逻辑
                parent.children = (parent.children || []).filter(ch => ch.key !== targetKey);

                // 强制触发响应式更新，解决部分场景下视图不刷新的问题
                if (Array.isArray(fileTree.value)) {
                    fileTree.value = [...fileTree.value];
                } else if (fileTree.value && typeof fileTree.value === 'object') {
                    fileTree.value = { ...fileTree.value };
                }
            }

            // 保持全部展开
            expandAllFolders();

            // 同步本地files列表（若删除文件或文件夹）
            if (Array.isArray(files.value)) {
                files.value = files.value.filter(f => {
                    const ids = [f.key, f.path].filter(Boolean);
                    const matched = ids.some(v => String(v) === targetKey || String(v).startsWith(targetKey + '/'));
                    return !matched;
                });
            }

            // 远端删除受影响文件（使用统一的删除服务）
            try {
                const fileDeleteService = getFileDeleteService();
                let deleteResults = [];

                // 如果是文件夹，执行文件夹删除逻辑（删除关联会话 + 静态目录）
                if (node.type === 'folder') {
                    console.log('[deleteItem] 检测到文件夹删除，执行文件夹清理逻辑:', targetKey);
                    // 传入当前的 sessions.value
                    const folderResult = await fileDeleteService.deleteFolder(targetKey, sessions.value);

                    // 手动更新本地 sessions 列表（移除已删除的会话）
                    if (sessions.value && Array.isArray(sessions.value)) {
                        const originalLength = sessions.value.length;
                        sessions.value = sessions.value.filter(s => {
                            // 使用 key 进行精确匹配
                            const sessionKey = String(s.key || '');
                            const targetPath = String(targetKey || '');
                            const shouldDelete = sessionKey === targetPath || sessionKey.startsWith(targetPath + '/');
                            return !shouldDelete;
                        });
                        console.log('[deleteItem] 本地会话列表已更新，移除:', originalLength - sessions.value.length, '个会话');
                    }

                    console.log('[deleteItem] 文件夹删除结果:', folderResult);
                }

                const affected = prevFiles.filter(f => {
                    const ids = [f.key, f.path].filter(Boolean);
                    return ids.some(v => String(v) === targetKey || String(v).startsWith(targetKey + '/'));
                });

                // 确保当前删除的节点（如果是文件）也包含在删除列表中，即使用户没有打开它
                // 仅当是单个文件删除时需要这样做（文件夹删除已由 deleteFolder 处理）
                let filesToDelete = [...affected];
                if (node.type !== 'folder') {
                    const isAlreadyAffected = filesToDelete.some(f => {
                        const ids = [f.key, f.path].filter(Boolean);
                        return ids.some(v => String(v) === targetKey);
                    });

                    if (!isAlreadyAffected) {
                        console.log('[deleteItem] 目标文件未打开，添加到删除队列:', targetKey);
                        filesToDelete.push({
                            key: targetKey,
                            path: targetKey,
                            type: 'file',
                            // 模拟文件对象结构，确保 FileDeleteService 能识别
                            data: { key: targetKey, path: targetKey }
                        });
                    }
                }

                // 尝试为待删除文件匹配正确的会话Key
                if (sessions.value && Array.isArray(sessions.value)) {
                    filesToDelete = filesToDelete.map(f => {
                        const fPath = f.path || f.key;
                        if (!fPath) return f;

                        // 查找匹配的会话
                        const fName = fPath.split('/').pop();
                        const fTags = fPath.split('/').slice(0, -1).filter(Boolean);

                        const session = sessions.value.find(s => {
                            const sName = s.title || s.pageTitle;
                            const sTags = s.tags || [];

                            if (sName !== fName) return false;
                            if (sTags.length !== fTags.length) return false;
                            for (let i = 0; i < sTags.length; i++) {
                                if (String(sTags[i]) !== String(fTags[i])) return false;
                            }
                            return true;
                        });

                        if (session) {
                            const realSessionKey = session.key;
                            console.log(`[deleteItem] 为文件 ${fPath} 找到对应会话Key: ${realSessionKey}`);
                            return { ...f, sessionKey: realSessionKey, path: fPath };
                        }
                        return f;
                    });
                }

                console.log('[deleteItem] 开始删除文件会话，受影响文件数:', filesToDelete.length);
                console.log('[deleteItem] 受影响文件详情:', filesToDelete.map(f => ({
                    key: f.key || f.path
                })));

                // 使用统一的文件删除服务
                deleteResults = await fileDeleteService.deleteFiles(filesToDelete);

                // 手动更新本地 sessions 列表（移除已删除的文件会话）
                if (sessions.value && Array.isArray(sessions.value) && filesToDelete.length > 0) {
                    // 收集所有需要删除的会话Key
                    const deletedSessionKeys = filesToDelete
                        .map(f => f.sessionKey || sessionSync.generateSessionKey(f.key || f.path))
                        .filter(Boolean);

                    if (deletedSessionKeys.length > 0) {
                        console.log('[deleteItem] 待删除会话Keys:', deletedSessionKeys);

                        const originalLength = sessions.value.length;
                        sessions.value = sessions.value.filter(s => !deletedSessionKeys.includes(s.key));
                        console.log('[deleteItem] 本地会话列表已更新，移除:', originalLength - sessions.value.length, '个文件会话');
                    }
                }

                // 统计删除结果
                const mongoSuccessCount = deleteResults.filter(r => r.mongoSuccess).length;
                const sessionSuccessCount = deleteResults.filter(r => r.sessionSuccess).length;
                const failedCount = deleteResults.filter(r => !r.mongoSuccess && !r.sessionSuccess).length;

                console.log('[deleteItem] 删除完成:', {
                    总数: affected.length,
                    MongoDB成功: mongoSuccessCount,
                    会话成功: sessionSuccessCount,
                    失败: failedCount
                });

                // 如果有失败的情况，记录警告
                if (failedCount > 0) {
                    console.warn('[deleteItem] 部分文件删除失败，详情:', deleteResults.filter(r => !r.mongoSuccess && !r.sessionSuccess));
                }

                // 刷新会话列表
                await loadSessions(true);
            } catch (e) {
                console.error('[deleteItem] 远端文件删除失败:', e?.message, e?.stack);
                throw e; // 重新抛出错误，让上层处理
            }
            return true;
        }, '删除节点');
    };

    /**
     * 从文件树中递归提取所有文件节点
     */
    const extractFilesFromTree = (nodes) => {
        const fileList = [];

        const traverse = (node) => {
            if (!node || typeof node !== 'object') return;

            // 如果是文件节点，添加到列表
            if (node.type === 'file' || (node.type !== 'folder' && !node.children)) {
                const fileKey = node.key || node.path || '';
                const name = node.name || (fileKey ? fileKey.split('/').pop() : '');
                const path = node.path || fileKey;
                const content = node.content || '';

                fileList.push({
                    key: fileKey,
                    path: path,
                    name: name,
                    content: content,
                    type: 'file',
                    createdAt: node.createdAt || node.createdTime,
                    updatedAt: node.updatedAt || node.updatedTime,
                    sessionKey: node.sessionKey
                });
            }

            // 递归处理子节点
            if (node.children && Array.isArray(node.children)) {
                node.children.forEach(child => traverse(child));
            }
        };

        if (Array.isArray(nodes)) {
            nodes.forEach(node => traverse(node));
        } else if (nodes) {
            traverse(nodes);
        }

        return fileList;
    };

    /**
     * 异步加载代码文件数据
     * 现在从 fileTree 中提取文件数据，不再单独调用 projectFiles 接口
     */
    const loadFiles = async () => {
        return safeExecuteAsync(async () => {
            console.log('[loadFiles] 正在从文件树中提取文件数据...');

            // 如果文件树还没有加载，先加载文件树
            if (!fileTree.value || fileTree.value.length === 0) {
                console.log('[loadFiles] 文件树未加载，先加载文件树...');
                await loadFileTree();
            }

            // 从文件树中提取所有文件
            const fileList = extractFilesFromTree(fileTree.value);

            files.value = fileList;
            console.log(`[loadFiles] 成功从文件树中提取 ${fileList.length} 个代码文件`);

            return fileList;
        }, '代码文件数据加载', (errorInfo) => {
            error.value = errorInfo.message;
            errorMessage.value = errorInfo.message;
            files.value = [];
        });
    };

    /**
     * 从文件树中查找文件节点
     */
    const findFileByKey = (nodes, targetKey) => {
        const normalize = (v) => {
            try {
                return normalizeFilePath(v);
            } catch (e) {
                return String(v || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/\/+/g, '/');
            }
        };
        const target = normalize(targetKey);
        const traverse = (node) => {
            if (!node || typeof node !== 'object') return null;

            // 如果是文件节点，检查是否匹配
            if (node.type === 'file' || (node.type !== 'folder' && !node.children)) {
                const nodeKey = normalize(node.key);
                if (nodeKey && target && nodeKey === target) {
                    return node;
                }
            }

            // 递归处理子节点
            if (node.children && Array.isArray(node.children)) {
                for (const child of node.children) {
                    const found = traverse(child);
                    if (found) return found;
                }
            }

            return null;
        };

        if (Array.isArray(nodes)) {
            for (const node of nodes) {
                const found = traverse(node);
                if (found) return found;
            }
        } else if (nodes) {
            return traverse(nodes);
        }

        return null;
    };

    /**
     * 按需加载单个文件
     */
    const loadFileByKey = async (targetKey = null) => {
        return safeExecuteAsync(async () => {
            const key = targetKey || selectedKey.value;
            if (!key) return null;

            // 检查是否有正在进行的加载请求
            if (pendingFileRequests.has(key)) {
                console.log('[loadFileByKey] 复用正在进行的请求:', key);
                return await pendingFileRequests.get(key);
            }

            const loadTask = async () => {
                console.log('[loadFileByKey] 尝试从文件树中查找文件:', key);

                // 如果文件树还没有加载，先加载文件树
                if (!fileTree.value || fileTree.value.length === 0) {
                    console.log('[loadFileByKey] 文件树未加载，先加载文件树...');
                    await loadFileTree();
                }

                // 从文件树中查找文件
                let foundNode = findFileByKey(fileTree.value, key);

                // 如果没找到，尝试从已加载的文件列表中查找
                if (!foundNode && files.value && files.value.length > 0) {
                    console.log('[loadFileByKey] 在文件树中未找到，尝试从文件列表中查找');
                    foundNode = files.value.find(f => f.key === key);
                }

                if (!foundNode) {
                    console.warn('[loadFileByKey] 未找到文件:', key);
                    return null;
                }

                console.log('[loadFileByKey] 找到文件:', foundNode.name || foundNode.key);

                // 处理找到的文件节点
                const processed = await processFileItem(foundNode);

                // 优先使用已缓存的静态内容（避免重复请求）
                const cachedStatic = Array.isArray(files.value)
                    ? files.value.find(f => {
                        if (!f) return false;
                        return (
                            (processed.key && f.key === processed.key) ||
                            (processed.path && f.path === processed.path) ||
                            (processed.name && f.name === processed.name)
                        );
                    })
                    : null;
                if (cachedStatic?.__fromStatic && typeof cachedStatic.content === 'string' && cachedStatic.content) {
                    console.log('[loadFileByKey] 使用已缓存的内容:', key);
                    return cachedStatic;
                }

                // 尝试通过 API 加载文件内容
                if (processed.path || processed.key) {
                    try {
                        const path = processed.path || processed.key;
                        // 处理路径：移除开头的 / 或 static/，确保发送给后端的是相对路径
                        let cleanPath = String(path || '').replace(/\\/g, '/').replace(/^\/+/, '');

                        // 移除 static/ 前缀 (假设后端 static_base_dir 已指向 static 目录)
                        if (cleanPath.startsWith('static/')) {
                            cleanPath = cleanPath.substring(7);
                        }
                        cleanPath = cleanPath.replace(/^\/+/, '');

                        console.log('[loadFileByKey] 尝试通过API加载内容:', cleanPath);

                        const apiBase = (window.API_URL && /^https?:\/\//i.test(window.API_URL))
                            ? String(window.API_URL).replace(/\/+$/, '')
                            : '';

                        if (apiBase) {
                            const res = await fetch(`${apiBase}/read-file`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    target_file: cleanPath
                                })
                            });

                            if (res.ok) {
                                const json = await res.json();
                                // 兼容后端返回 code: 0 或 code: 200 表示成功
                                if ((json.code === 200 || json.code === 0) && json.data && json.data.content) {
                                    const content = json.data.content;

                                    if (json.data.type === 'base64') {
                                        processed.contentBase64 = content;
                                    } else {
                                        processed.content = content;
                                    }

                                    processed.__fromStatic = true;
                                    console.log('[loadFileByKey] API加载成功, 长度:', content.length);

                                    if (Array.isArray(files.value)) {
                                        const idx = files.value.findIndex(f => {
                                            if (!f) return false;
                                            return (
                                                (processed.key && f.key === processed.key) ||
                                                (processed.path && f.path === processed.path) ||
                                                (processed.name && f.name === processed.name)
                                            );
                                        });
                                        if (idx >= 0) {
                                            files.value[idx] = { ...files.value[idx], ...processed };
                                        } else {
                                            files.value.push(processed);
                                        }
                                    }
                                } else {
                                    console.warn('[loadFileByKey] API返回错误:', json.message || '无内容');
                                }
                            } else {
                                console.warn('[loadFileByKey] API请求失败:', res.status, res.statusText);
                            }
                        }
                    } catch (e) {
                        console.warn('[loadFileByKey] API加载出错:', e);
                    }
                }

                return processed;
            };

            const promise = loadTask();
            pendingFileRequests.set(key, promise);

            try {
                return await promise;
            } finally {
                pendingFileRequests.delete(key);
            }
        }, '按需加载单个文件');
    };

    /**
     * 处理文件项，提取内容和标准化信息
     */
    const processFileItem = async (item) => {
        const data = (item && typeof item === 'object' && item.data && typeof item.data === 'object') ? item.data : {};

        const pickFirstString = (...vals) => {
            for (const v of vals) {
                if (typeof v === 'string' && v) return v;
            }
            return '';
        };
        const toStringContent = (val) => {
            if (Array.isArray(val)) return val.map(v => (v == null ? '' : String(v))).join('\n');
            return (typeof val === 'string') ? val : '';
        };
        const tryKeysDeep = (obj, keys, depth = 0) => {
            if (!obj || typeof obj !== 'object' || depth > 3) return '';
            for (const k of keys) {
                if (k in obj) {
                    const v = obj[k];
                    const s = toStringContent(v);
                    if (s) return s;
                }
            }
            for (const k of Object.keys(obj)) {
                const v = obj[k];
                if (v && typeof v === 'object') {
                    const found = tryKeysDeep(v, keys, depth + 1);
                    if (found) return found;
                } else {
                    const s = toStringContent(v);
                    if (s && keys.includes(k)) return s;
                }
            }
            return '';
        };

        // 优先使用 key
        const key = item.key || (data && data.key);
        const path = item.path || data.path || key;
        const name = item.name || data.name || (typeof path === 'string' ? path.split('/').pop() : '');

        const commonKeys = ['content', 'code', 'text', 'source', 'lines', 'raw', 'body', 'value'];
        let content = '';
        content = toStringContent(item?.content) || toStringContent(item?.code) || toStringContent(item?.text) || toStringContent(item?.source) || toStringContent(item?.lines) || pickFirstString(item?.raw, item?.body, item?.value);
        if (!content) {
            content = toStringContent(data?.content) || toStringContent(data?.code) || toStringContent(data?.text) || toStringContent(data?.source) || toStringContent(data?.lines) || pickFirstString(data?.raw, data?.body, data?.value);
        }
        if (!content) {
            content = tryKeysDeep(item, commonKeys) || tryKeysDeep(data, commonKeys);
        }
        if (!content) {
            const pickBase64 = (obj) => {
                if (!obj || typeof obj !== 'object') return '';
                const b64 = obj.contentBase64 || obj.base64 || obj.b64;
                return typeof b64 === 'string' ? b64 : '';
            };
            let b64 = pickBase64(item) || pickBase64(data);
            if (!b64) {
                const findB64Deep = (obj, depth = 0) => {
                    if (!obj || typeof obj !== 'object' || depth > 3) return '';
                    const direct = pickBase64(obj);
                    if (direct) return direct;
                    for (const k of Object.keys(obj)) {
                        const v = obj[k];
                        if (v && typeof v === 'object') {
                            const found = findB64Deep(v, depth + 1);
                            if (found) return found;
                        }
                    }
                    return '';
                };
                b64 = findB64Deep(item) || findB64Deep(data);
            }
            if (b64) {
                try { content = atob(b64); } catch (e) { content = ''; }
            }
        }

        const normalized = {
            ...item,
            key: key,
            path,
            name,
            content
        };

        // 合并/去重更新到 files 列表
        if (!Array.isArray(files.value)) files.value = [];
        // 删除旧的匹配项（只匹配 key）
        const remaining = files.value.filter(f => f.key !== key);
        remaining.push(normalized);
        files.value = remaining;

        return normalized;
    };

    /**
     * 统一的Key规范化函数（使用统一的规范化工具）
     * @param {string} key - 文件Key
     * @returns {string} 规范化后的Key
     */
    const normalizeKey = (key) => {
        return normalizeFilePath(key);
    };

    /**
     * 设置选中的文件Key
     * @param {string} key - 文件Key
     */
    const setSelectedKey = (key) => {
        if (key === null) {
            selectedKey.value = null;
            return;
        }
        // 使用统一的规范化函数
        selectedKey.value = normalizeKey(key);
    };

    /**
     * 切换文件夹展开状态
     * @param {string} key - 文件夹Key
     */
    const toggleFolder = (key) => {
        if (expandedFolders.value.has(key)) {
            expandedFolders.value.delete(key);
        } else {
            expandedFolders.value.add(key);
        }
    };

    /**
     * 切换侧边栏状态
     */
    const toggleSidebar = () => {
        sidebarCollapsed.value = !sidebarCollapsed.value;
    };

    const toggleChatPanel = () => {
        chatPanelCollapsed.value = !chatPanelCollapsed.value;
        try {
            localStorage.setItem('aicrChatPanelCollapsed', chatPanelCollapsed.value ? '1' : '0');
        } catch (error) {
            console.warn('[toggleChatPanel] 保存聊天面板收起状态失败:', error);
        }
    };

    /**
     * 刷新数据
     */
    const refreshData = async () => {
        console.log('[refreshData] 正在刷新数据...');

        try {
            await loadFileTree();

            await loadFiles();

            // 清空选中的文件
            selectedKey.value = null;

            console.log('[refreshData] 数据刷新完成');
        } catch (error) {
            console.error('[refreshData] 数据刷新失败:', error);
        }
    };

    /**
     * 清空错误
     */
    const clearError = () => {
        error.value = null;
        errorMessage.value = '';
    };

    /**
     * 加载侧边栏宽度
     */
    const loadSidebarWidths = () => {
        try {
            const savedSidebarWidth = localStorage.getItem('aicrSidebarWidth');

            if (savedSidebarWidth) {
                const width = Math.max(50, parseInt(savedSidebarWidth, 10));
                if (!isNaN(width)) {
                    sidebarWidth.value = width;
                }
            }
        } catch (error) {
            console.warn('[loadSidebarWidths] 加载侧边栏宽度失败:', error);
        }
    };

    const loadChatPanelSettings = () => {
        try {
            const savedWidth = localStorage.getItem('aicrChatPanelWidth');
            if (savedWidth) {
                const width = parseInt(savedWidth, 10);
                if (!isNaN(width)) {
                    chatPanelWidth.value = Math.max(240, Math.min(1200, width));
                }
            }
        } catch (error) {
            console.warn('[loadChatPanelSettings] 加载聊天面板宽度失败:', error);
        }

        try {
            const savedCollapsed = localStorage.getItem('aicrChatPanelCollapsed');
            if (savedCollapsed != null) {
                chatPanelCollapsed.value = savedCollapsed === '1' || savedCollapsed === 'true';
            }
        } catch (error) {
            console.warn('[loadChatPanelSettings] 加载聊天面板收起状态失败:', error);
        }
    };

    /**
     * 保存侧边栏宽度
     */
    const saveSidebarWidth = (width) => {
        try {
            sidebarWidth.value = width;
            localStorage.setItem('aicrSidebarWidth', width.toString());
        } catch (error) {
            console.warn('[saveSidebarWidth] 保存侧边栏宽度失败:', error);
        }
    };

    const saveChatPanelWidth = (width) => {
        try {
            const w = Math.max(240, Math.min(1200, Number(width) || 0));
            if (!w) return;
            chatPanelWidth.value = w;
            localStorage.setItem('aicrChatPanelWidth', String(w));
        } catch (error) {
            console.warn('[saveChatPanelWidth] 保存聊天面板宽度失败:', error);
        }
    };

    /**
     * 加载会话列表
     */
    const loadSessions = async (forceRefresh = false) => {
        return safeExecuteAsync(async () => {
            console.log('[loadSessions] 开始加载会话列表, forceRefresh:', forceRefresh);
            sessionLoading.value = true;
            sessionError.value = null;

            try {
                const url = buildServiceUrl('query_documents', { cname: 'sessions' });
                console.log('[loadSessions] 请求URL:', url);
                const response = await getData(url, {}, false);
                console.log('[loadSessions] API响应:', response);

                let sessionList = [];
                // 兼容不同的返回格式（与 YiPet 保持一致）
                if (Array.isArray(response)) {
                    sessionList = response;
                } else if (response && Array.isArray(response.sessions)) {
                    sessionList = response.sessions;
                } else if (response && Array.isArray(response.data)) {
                    sessionList = response.data;
                } else if (response && response.data && Array.isArray(response.data.sessions)) {
                    sessionList = response.data.sessions;
                } else if (response && response.data && response.data.list && Array.isArray(response.data.list)) {
                    sessionList = response.data.list;
                }

                // 确保 sessionList 是数组并过滤无效项
                if (!Array.isArray(sessionList)) {
                    console.warn('[loadSessions] 返回数据不是数组格式:', sessionList);
                    sessionList = [];
                }
                sessionList = sessionList.filter(s => s);

                // 规范化 tags 字段
                sessionList.forEach(s => {
                    if (!s.tags) {
                        s.tags = [];
                    } else if (typeof s.tags === 'string') {
                        // 尝试解析字符串标签 (JSON 或逗号分隔)
                        try {
                            if (s.tags.startsWith('[')) {
                                s.tags = JSON.parse(s.tags);
                            } else {
                                s.tags = s.tags.split(',').map(t => t.trim()).filter(Boolean);
                            }
                        } catch (e) {
                            console.warn('[loadSessions] 标签解析失败:', s.tags, e);
                            s.tags = [s.tags];
                        }
                    }

                    if (!Array.isArray(s.tags)) {
                        console.warn('[loadSessions] 标签格式错误 (非数组):', s.tags);
                        s.tags = [];
                    }

                    if (Object.prototype.hasOwnProperty.call(s, 'pageContent')) {
                        delete s.pageContent;
                    }

                });

                sessionList.forEach(s => {
                    const rawKey = s.key ? String(s.key) : '';
                    const badKey = !rawKey || /^[0-9a-fA-F]{24}$/.test(rawKey);
                    if (badKey) {
                        const title = s.title || s.pageTitle;
                        const tags = Array.isArray(s.tags) ? s.tags : [];
                        const pathTags = tags.filter(t => t && t !== 'default' && t !== 'Default');
                        if (title) {
                            s.key = pathTags.length > 0 ? `${pathTags.join('/')}/${title}` : String(title);
                        }
                    } else {
                        s.key = rawKey;
                    }
                });

                sessionList = sessionList.filter(s => s && s.key);

                console.log('[loadSessions] 处理后会话示例:', sessionList[0]);

                // 排序：收藏的优先，然后按更新时间倒序（与 YiPet 保持一致）
                sessionList.sort((a, b) => {
                    const aFavorite = a.isFavorite || false;
                    const bFavorite = b.isFavorite || false;

                    if (aFavorite !== bFavorite) {
                        return bFavorite ? 1 : -1;
                    }

                    const aTime = a.updatedAt || a.createdAt || 0;
                    const bTime = b.updatedAt || b.createdAt || 0;
                    return bTime - aTime;
                });

                sessions.value = sessionList;
                console.log('[loadSessions] 会话列表加载成功，共', sessionList.length, '个会话');
            } catch (error) {
                console.error('[loadSessions] 加载会话列表失败:', error);
                sessionError.value = error?.message || '加载会话列表失败';
                sessions.value = [];
            } finally {
                sessionLoading.value = false;
            }
        }, '加载会话列表');
    };

    /**
     * 保存会话侧边栏宽度
     */
    const saveSessionSidebarWidth = (width) => {
        try {
            sessionSidebarWidth.value = width;
            localStorage.setItem('aicrSessionSidebarWidth', width.toString());
        } catch (error) {
            console.warn('[saveSessionSidebarWidth] 保存会话侧边栏宽度失败:', error);
        }
    };

    /**
     * 加载会话侧边栏宽度
     */
    const loadSessionSidebarWidth = () => {
        try {
            const savedWidth = localStorage.getItem('aicrSessionSidebarWidth');
            if (savedWidth) {
                const width = Math.max(50, parseInt(savedWidth, 10));
                if (!isNaN(width)) {
                    sessionSidebarWidth.value = width;
                }
            }
        } catch (error) {
            console.warn('[loadSessionSidebarWidth] 加载会话侧边栏宽度失败:', error);
        }
    };

    // 返回状态和方法
    return {
        // 响应式数据
        fileTree,
        fileTreeDocKey,
        files,
        selectedKey,
        loading,
        error,
        errorMessage,
        expandedFolders,
        sidebarCollapsed,
        sidebarWidth,
        chatPanelCollapsed,
        chatPanelWidth,

        // 搜索相关状态
        searchQuery,

        // 批量选择相关状态
        batchMode,
        selectedKeys,

        // 会话批量选择相关状态
        sessionBatchMode,
        selectedSessionKeys,
        externalSelectedSessionKey,

        // 视图模式
        viewMode,

        // 会话列表相关状态
        sessions,
        sessionLoading,
        sessionError,
        sessionListVisible,
        selectedSessionTags,
        sessionSearchQuery,
        sessionSidebarWidth,

        activeSession,
        activeSessionLoading,
        activeSessionError,
        sessionChatInput,
        sessionChatDraftImages,
        sessionChatLastDraftText,
        sessionChatLastDraftImages,
        sessionChatSending,
        sessionChatAbortController,
        sessionChatStreamingTargetTimestamp,
        sessionChatStreamingType,
        sessionChatCopyFeedback,
        sessionChatRegenerateFeedback,
        sessionContextEnabled,
        sessionContextEditorVisible,
        sessionContextDraft,
        sessionContextMode,
        sessionContextUndoVisible,
        sessionContextOptimizeBackup,
        sessionMessageEditorVisible,
        sessionMessageEditorDraft,
        sessionMessageEditorMode,
        sessionMessageEditorIndex,
        sessionFaqVisible,
        sessionFaqSearchKeyword,
        sessionFaqItems,
        sessionFaqLoading,
        sessionFaqError,
        sessionFaqSelectedTags,
        sessionFaqTagFilterReverse,
        sessionFaqTagFilterNoTags,
        sessionFaqTagFilterExpanded,
        sessionFaqTagFilterVisibleCount,
        sessionFaqTagFilterSearchKeyword,
        sessionFaqTagManagerVisible,
        sessionSettingsVisible,
        sessionBotModel,
        sessionBotSystemPrompt,
        sessionBotModelDraft,
        sessionBotSystemPromptDraft,
        weChatSettingsVisible,
        weChatRobotEnabled,
        weChatRobotWebhook,
        weChatRobotAutoForward,
        weChatRobotEnabledDraft,
        weChatRobotWebhookDraft,
        weChatRobotAutoForwardDraft,
        weChatRobots,
        weChatRobotsDraft,
        sessionEditVisible,
        sessionEditKey,
        sessionEditTitle,
        sessionEditUrl,
        sessionEditDescription,
        sessionEditGenerating,
        sessionEditData,

        // 标签过滤相关状态
        tagFilterReverse,
        tagFilterNoTags,
        tagFilterExpanded,
        tagFilterVisibleCount,
        tagFilterSearchKeyword,
        tagOrder,

        // 方法
        loadFileTree,
        loadFiles,
        loadFileByKey,
        expandAllFolders,
        createFolder,
        createFile,
        renameItem,
        deleteItem,
        setSelectedKey,
        normalizeKey,
        toggleFolder,
        toggleSidebar,
        toggleChatPanel,
        refreshData,
        clearError,
        loadSidebarWidths,
        loadChatPanelSettings,
        saveSidebarWidth,
        saveChatPanelWidth,
        loadSessions,
        saveSessionSidebarWidth,
        loadSessionSidebarWidth
    };
};
