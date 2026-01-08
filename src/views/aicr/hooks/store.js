/**
 * 代码审查页面数据存储管理
 * author: liangliang
 */

import { getData, postData, deleteData, updateData } from '/src/services/index.js';
import { buildServiceUrl, SERVICE_MODULE } from '/src/services/helper/requestHelper.js';
import { safeExecuteAsync, createError, ErrorTypes } from '/src/utils/error.js';
import { getSessionSyncService } from '/src/views/aicr/services/sessionSyncService.js';
import { 
    normalizeFilePath, 
    normalizeFileObject, 
    normalizeTreeNode,
    extractFileName,
    extractDirPath
} from '/src/views/aicr/utils/fileFieldNormalizer.js';

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
     * @returns {Object} 包含 fileId, fileKey, projectId, isFile 的对象
     */
    extractFileIdentifiers(file) {
        if (!file || typeof file !== 'object') {
            return { fileId: null, fileKey: null, projectId: null, isFile: false };
        }

        // 提取 fileId（支持多种字段和嵌套结构）
        const fileId = file.fileId || file.id || file.path || 
                      (file.data && (file.data.fileId || file.data.id || file.data.path)) ||
                      null;

        // 提取 fileKey（支持多种字段和嵌套结构）
        const fileKey = file.key || file._id || 
                       (file.data && (file.data.key || file.data._id)) ||
                       null;

        // 提取 projectId（支持多种字段和嵌套结构）
        const projectId = file.projectId || 
                         (file.data && file.data.projectId) ||
                         null;

        // 判断是否为文件（不是文件夹）
        const isFile = file.type === 'file' || 
                      (!file.type && fileId && !fileId.endsWith('/')) ||
                      false;

        return { fileId, fileKey, projectId, isFile };
    }

    /**
     * 删除单个文件（仅删除会话）
     * 这是统一的删除入口，确保导入文件和新建文件的删除行为完全一致
     * @param {Object} file - 文件对象
     * @param {string} projectId - 项目的 projectId（可选，会从 file 对象中提取）
     * @returns {Promise<Object>} 删除结果 { sessionSuccess }
     */
    async deleteFile(file, projectId = null) {
        // 提取文件标识符
        const { fileId, fileKey, projectId: fileProjectId, isFile } = this.extractFileIdentifiers(file);
        
        // 使用传入的 projectId 或从文件对象中提取
        const actualProjectId = projectId || fileProjectId;

        // 如果 fileId 仍然为空，尝试从原始文件对象中直接提取
        let finalFileId = fileId;
        if (!finalFileId && file) {
            finalFileId = file.fileId || file.id || file.path || null;
        }

        console.log('[FileDeleteService] 开始删除文件:', { 
            fileId: finalFileId, 
            fileKey,
            isFile, 
            projectId: actualProjectId,
            fileType: file?.type,
            extractedFileId: fileId,
            fullFile: file
        });

        // 如果缺少 projectId，无法删除
        if (!actualProjectId) {
            console.error('[FileDeleteService] ✗ 无法删除文件：缺少 projectId', { fileId: finalFileId, fileKey, file });
            return {
                sessionSuccess: false,
                fileId: finalFileId,
                fileKey,
                projectId: actualProjectId,
                isFile,
                error: '缺少 projectId'
            };
        }

        const result = {
            sessionSuccess: false,
            fileId: finalFileId,
            fileKey,
            projectId: actualProjectId,
            isFile
        };

        // 删除会话（仅对文件，不对文件夹）
        if (isFile && actualProjectId && finalFileId) {
            result.sessionSuccess = await this.deleteSession(finalFileId, actualProjectId);
        } else {
            if (!isFile) {
                console.debug('[FileDeleteService] ✗ 跳过会话删除（不是文件）:', { fileId: finalFileId, type: file?.type });
            } else if (!actualProjectId) {
                console.warn('[FileDeleteService] ✗ 跳过会话删除（缺少 projectId）:', { fileId: finalFileId, projectId: actualProjectId });
            } else if (!finalFileId) {
                console.warn('[FileDeleteService] ✗ 跳过会话删除（缺少 fileId）');
            }
        }

        return result;
    }

    /**
     * 批量删除文件
     * @param {Array<Object>} files - 文件对象数组
     * @param {string} projectId - 项目的 projectId（可选）
     * @returns {Promise<Array<Object>>} 删除结果数组
     */
    async deleteFiles(files, projectId = null) {
        if (!Array.isArray(files) || files.length === 0) {
            console.warn('[FileDeleteService] 批量删除：文件列表为空');
            return [];
        }

        console.log('[FileDeleteService] 开始批量删除，文件数:', files.length, '项目ID:', projectId);
        
        const results = [];
        for (const file of files) {
            try {
                const result = await this.deleteFile(file, projectId);
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
 * 管理文件树、代码文件、评论数据、选中状态、加载状态和错误信息
 * @returns {Object} store对象，包含fileTree, files, comments, selectedFileId等方法
 */
export const createStore = () => {
    // 文件目录树
    const fileTree = vueRef([]);
    // 文件树对应的后端文档key（用于持久化更新）
    const fileTreeDocKey = vueRef('');
    // 代码文件内容
    const files = vueRef([]);
    // 评论数据
    const comments = vueRef([]);
    // 当前选中的文件ID
    const selectedFileId = vueRef(null);
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
    // 评论区收缩状态
    const commentsCollapsed = vueRef(false);
    // 侧边栏宽度（文件树）
    const sidebarWidth = vueRef(320);
    // 评论区宽度
    const commentsWidth = vueRef(450);
    
    // 项目管理 - 简化后只管理项目，不再有版本概念
    const projects = vueRef([]); // 存储项目列表
    const selectedProject = vueRef('');
    
    // 搜索相关状态
    const searchQuery = vueRef('');
    // 新增评论内容
    const newComment = vueRef('');
    
    // 批量选择相关状态
    const batchMode = vueRef(false);
    const selectedFileIds = vueRef(new Set());
    
    // 会话批量选择相关状态
    const sessionBatchMode = vueRef(false);
    const selectedSessionIds = vueRef(new Set());
    
    // 视图模式：'tree' 树形视图，'tags' 标签视图
    const viewMode = vueRef('tree');
    
    // 评论者相关状态
    const commenters = vueRef([]);
    const selectedCommenterIds = vueRef([]);
    const commentersLoading = vueRef(false);
    const commentersError = vueRef('');

    // 会话列表相关状态
    const sessions = vueRef([]);
    const sessionLoading = vueRef(false);
    const sessionError = vueRef(null);
    const sessionListVisible = vueRef(false);
    const selectedSessionTags = vueRef([]);
    const sessionSearchQuery = vueRef('');
    const sessionSidebarWidth = vueRef(320);
    
    // 标签过滤相关状态（参考 YiPet 项目）
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
     * @param {string|null} projectId - 项目ID
     * @param {boolean} forceClear - 是否在数据为空时强制清空（默认 false，保留现有数据以避免清空问题）
     */
    const loadFileTree = async (projectId = null, forceClear = false) => {
        return safeExecuteAsync(async () => {
            loading.value = true;
            error.value = null;
            errorMessage.value = '';
            
            console.log('[loadFileTree] 正在加载文件树数据(基于会话)...', { projectId });
            
            const project = projectId || selectedProject.value;
            if (!project) {
                if (forceClear) {
                    fileTree.value = [];
                    fileTreeDocKey.value = '';
                }
                return [];
            }

            // Ensure sessions are loaded
            if (!sessions.value || sessions.value.length === 0) {
                 await loadSessions();
            }
            
            // Filter sessions for this project
            const projectSessions = sessions.value.filter(s => {
                return s.tags && Array.isArray(s.tags) && s.tags.includes(project);
            });

            if (projectSessions.length === 0) {
                 console.warn('[loadFileTree] 未找到该项目的会话数据:', project);
                 // Don't clear if not forced, but here we are rebuilding from scratch
                 if (forceClear) fileTree.value = [];
                 return [];
            }

            // Build tree
            const root = {
                id: project,
                name: project,
                type: 'folder',
                children: []
            };
            
            projectSessions.forEach(session => {
                const tags = session.tags || [];
                // Remove project tag if present
                const pathTags = tags.filter(t => t !== project);
                
                let currentLevel = root;
                let currentPath = project;
                
                // Build directory structure
                pathTags.forEach(folderName => {
                    if (!folderName) return;
                    
                    currentPath = currentPath + '/' + folderName;
                    
                    let folderNode = currentLevel.children.find(c => c.name === folderName && c.type === 'folder');
                    if (!folderNode) {
                        folderNode = {
                            id: currentPath,
                            name: folderName,
                            type: 'folder',
                            children: []
                        };
                        currentLevel.children.push(folderNode);
                    }
                    currentLevel = folderNode;
                });
                
                // Add file node
                const fileName = session.title || session.pageTitle || 'Untitled';
                const fileId = currentPath + '/' + fileName;
                
                if (!currentLevel.children.find(c => c.name === fileName && c.type === 'file')) {
                    currentLevel.children.push({
                        id: fileId,
                        name: fileName,
                        type: 'file',
                        content: session.pageContent || '',
                        key: session.id, // Bind session ID
                        _id: session.id,
                        size: (session.pageContent || '').length,
                        lastModified: session.updatedAt || session.createdAt
                    });
                }
            });
            
            // Sort tree
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
            sortNodes(root.children);

            fileTree.value = [root];
            fileTreeDocKey.value = ''; 
            
            console.log(`[loadFileTree] 成功构建文件树, 包含 ${projectSessions.length} 个文件`);
            
            // Default expand
             const allFolders = new Set();
             const collectFolders = (nodes) => {
                 if (!nodes) return;
                 if (Array.isArray(nodes)) nodes.forEach(n => collectFolders(n));
                 else {
                     if (nodes.type === 'folder') {
                         allFolders.add(nodes.id);
                         if (nodes.children) collectFolders(nodes.children);
                     }
                 }
             };
             collectFolders(root);
             expandedFolders.value = allFolders;

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
                    all.add(nodes.id);
                    if (nodes.children) collect(nodes.children);
                }
                return;
            }
            nodes.forEach(n => {
                if (n.type === 'folder') {
                    all.add(n.id);
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
    function findNodeAndParentById(rootNodes, targetId) {
        const stack = Array.isArray(rootNodes) ? rootNodes.map(n => ({ node: n, parent: null })) : [{ node: rootNodes, parent: null }];
        while (stack.length) {
            const { node, parent } = stack.pop();
            if (!node) continue;
            if (node.id === targetId) return { node, parent };
            if (node.type === 'folder' && Array.isArray(node.children)) {
                for (const child of node.children) {
                    stack.push({ node: child, parent: node });
                }
            }
        }
        return { node: null, parent: null };
    }

    /**
     * 持久化文件树到后端
     */
    const persistFileTree = async (projectId = null) => {
        return safeExecuteAsync(async () => {
            const project = projectId || selectedProject.value;
            console.log('[persistFileTree] 跳过后端持久化，使用会话数据驱动文件树', { project });
            return { skipped: true, project };
        }, '文件树持久化');
    };

    /**
     * 创建文件夹
     */
    const createFolder = async ({ parentId, name, projectId = null }) => {
        return safeExecuteAsync(async () => {
            if (!name || !name.trim()) {
                throw createError('文件夹名称不能为空', ErrorTypes.VALIDATION, '新建文件夹');
            }
            const root = Array.isArray(fileTree.value) ? fileTree.value[0] : fileTree.value;
            if (!root || typeof root !== 'object') throw createError('文件树未加载', ErrorTypes.API, '新建文件夹');

            let parentNode = null;
            if (!parentId) {
                parentNode = root;
            } else {
                parentNode = findNodeAndParentById(root, parentId).node;
            }
            if (!parentNode || parentNode.type !== 'folder') {
                throw createError('父级目录无效', ErrorTypes.VALIDATION, '新建文件夹');
            }

            parentNode.children = Array.isArray(parentNode.children) ? parentNode.children : [];
            // 保证同级唯一
            const exists = parentNode.children.find(ch => ch.name === name);
            if (exists) throw createError('同名文件或文件夹已存在', ErrorTypes.VALIDATION, '新建文件夹');

            const newId = (parentNode.id ? `${parentNode.id}/` : '') + name;
            // 使用 normalizeTreeNode 确保 id 和 path 都包含 projectId
            const folderNode = normalizeTreeNode({
                id: newId,
                name,
                type: 'folder',
                children: []
            }, projectId || selectedProject.value);
            if (folderNode) {
                parentNode.children.push(folderNode);
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
            
            parentNode.children = sortFileTreeItems(parentNode.children);
            // 保持全部展开
            expandAllFolders();

            await persistFileTree(projectId);
            return newId;
        }, '创建文件夹');
    };

    /**
     * 创建文件
     * @param {Object} options - 创建文件选项
     * @param {string} options.parentId - 父节点ID
     * @param {string} options.name - 文件名
     * @param {string} options.content - 文件内容
     * @param {string} options.projectId - 项目ID
     * @param {boolean} options.skipProjectFiles - 是否跳过 projectFiles 接口调用（当通过 persistFileTree 已持久化时使用）
     */
    const createFile = async ({ parentId, name, content = '', projectId = null, skipProjectFiles = false }) => {
        return safeExecuteAsync(async () => {
            if (!name || !name.trim()) {
                throw createError('文件名称不能为空', ErrorTypes.VALIDATION, '新建文件');
            }
            const root = Array.isArray(fileTree.value) ? fileTree.value[0] : fileTree.value;
            if (!root || typeof root !== 'object') throw createError('文件树未加载', ErrorTypes.API, '新建文件');

            let parentNode = null;
            if (!parentId) {
                parentNode = root;
            } else {
                parentNode = findNodeAndParentById(root, parentId).node;
            }
            if (!parentNode || parentNode.type !== 'folder') {
                throw createError('父级目录无效', ErrorTypes.VALIDATION, '新建文件');
            }

            parentNode.children = Array.isArray(parentNode.children) ? parentNode.children : [];
            if (parentNode.children.find(ch => ch.name === name)) {
                throw createError('同名文件或文件夹已存在', ErrorTypes.VALIDATION, '新建文件');
            }

            // 使用统一的路径规范化
            const parentPath = normalizeFilePath(parentNode.id || '', projectId || selectedProject.value);
            const newId = parentPath ? `${parentPath}/${name}` : name;
            const normalizedNewId = normalizeFilePath(newId, projectId || selectedProject.value);
            const now = Date.now();
            
            // 使用统一的节点规范化工具
            const fileNode = normalizeTreeNode({
                id: normalizedNewId,
                name,
                type: 'file',
                size: content ? content.length : 0,
                modified: now,
                content: content || ''  // 确保 content 字段被设置到文件节点中
            }, projectId || selectedProject.value);
            
            if (fileNode) {
                parentNode.children.push(fileNode);
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
            
            parentNode.children = sortFileTreeItems(parentNode.children);
            // 保持全部展开
            expandAllFolders();

            // 先持久化树（这会更新 projectTree，文件节点已包含在其中，包括 content 字段）
            // 注意：即使 skipProjectFiles=true，文件内容也会通过 persistFileTree 保存到 projectTree
            await persistFileTree(projectId);

            const project = projectId || selectedProject.value;
            let createdKey = null;
            
            // 2025-01-08: 已移除 projectFiles 接口调用，仅使用 sessions 模式
            // 文件内容将通过 sessionSync.syncFileToSession 同步到会话


            // 更新本地files列表，携带后端返回的key，确保首次保存可PUT更新
            const newFile = normalizeFileObject({
                fileId: normalizedNewId,
                id: normalizedNewId,
                path: normalizedNewId,
                name,
                content,
                key: createdKey,
                type: 'file'
            }, project);
            
            if (newFile && Array.isArray(files.value)) {
                files.value.push(newFile);
            }

            // 同步文件到会话（使用规范化后的文件对象）
            try {
                if (project && newFile) {
                    await sessionSync.syncFileToSession(newFile, project, false);
                    console.log('[createFile] 文件已同步到会话:', normalizedNewId);
                }
            } catch (syncError) {
                console.warn('[createFile] 同步文件到会话失败（已忽略）:', syncError?.message);
            }

            return normalizedNewId;
        }, '创建文件');
    };

    /**
     * 重命名节点
     */
    const renameItem = async ({ itemId, newName, projectId = null }) => {
        return safeExecuteAsync(async () => {
            if (!itemId) throw createError('缺少目标ID', ErrorTypes.VALIDATION, '重命名');
            if (!newName || !newName.trim()) throw createError('名称不能为空', ErrorTypes.VALIDATION, '重命名');
            const root = Array.isArray(fileTree.value) ? fileTree.value[0] : fileTree.value;
            const { node, parent } = findNodeAndParentById(root, itemId);
            if (!node) throw createError('未找到目标节点', ErrorTypes.API, '重命名');
            const siblings = parent ? (parent.children || []) : [node];
            if (siblings.some(ch => ch !== node && ch.name === newName)) {
                throw createError('同级存在同名项', ErrorTypes.VALIDATION, '重命名');
            }

            // 使用统一的路径规范化计算新ID
            const project = projectId || selectedProject.value;
            // 获取父节点的规范化路径（不包含 projectId）
            const parentPathWithoutProjectId = parent ? normalizeFilePath(parent.id || '', project) : '';
            // 获取旧ID的规范化路径（不包含 projectId）
            const oldIdWithoutProjectId = normalizeFilePath(node.id || '', project);
            // 计算新ID的规范化路径（不包含 projectId）
            const newIdWithoutProjectId = normalizeFilePath(parentPathWithoutProjectId ? `${parentPathWithoutProjectId}/${newName}` : newName, project);
            // 构建包含 projectId 的完整路径
            const oldId = oldIdWithoutProjectId ? `${project}/${oldIdWithoutProjectId}` : project;
            const newId = newIdWithoutProjectId ? `${project}/${newIdWithoutProjectId}` : project;
            node.name = newName;

            // 记录变更前的文件列表用于远端同步
            const prevFiles = Array.isArray(files.value) ? files.value.slice() : [];

            const updateIdsRecursively = (n, fromPrefix, toPrefix) => {
                if (n.id && typeof n.id === 'string') {
                    // 比较完整路径（包含 projectId）
                    if (n.id === fromPrefix) {
                        // 完全匹配，直接替换
                        n.id = toPrefix;
                        n.path = toPrefix;
                    } else if (n.id.startsWith(fromPrefix + '/')) {
                        // 是子节点，替换前缀
                        const suffix = n.id.substring(fromPrefix.length);
                        const newChildId = toPrefix + suffix;
                        n.id = newChildId;
                        n.path = newChildId;
                    }
                } else {
                    // 如果没有 id，确保设置 path
                    if (!n.path) {
                        n.path = n.id || '';
                    }
                }
                if (n.type === 'folder' && Array.isArray(n.children)) {
                    n.children.forEach(child => updateIdsRecursively(child, fromPrefix, toPrefix));
                }
            };
            updateIdsRecursively(node, oldId, newId);
            
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
                    const normalizedOldId = normalizeFilePath(oldId, project);
                    const ids = [f.fileId, f.id, f.path].filter(Boolean).map(id => normalizeFilePath(id, project));
                    const matched = ids.some(v => v === normalizedOldId || v.startsWith(normalizedOldId + '/'));
                    if (matched) {
                        const oldPath = normalizeFilePath(f.path || f.id || f.fileId, project);
                        const replacedPath = oldPath.replace(normalizedOldId, newId);
                        // 使用统一的字段规范化工具
                        const normalized = normalizeFileObject({
                            ...f,
                            fileId: replacedPath,
                            id: replacedPath,
                            path: replacedPath
                        }, project);
                        return normalized || f;
                    }
                    return f;
                });
            }

            await persistFileTree(projectId);

            // 同步 projectTree 中的文件节点，使用统一的字段规范化
            // 2025-01-08: 已移除 projectFiles 逻辑，仅使用 sessions 模式
            
            try {
                const normalizedOldId = normalizeFilePath(oldId, project);
                const affected = prevFiles.filter(f => {
                    const ids = [f.fileId, f.id, f.path].filter(Boolean).map(id => normalizeFilePath(id, project));
                    return ids.some(v => v === normalizedOldId || v.startsWith(normalizedOldId + '/'));
                });
                
                for (const f of affected) {
                    const oldPath = normalizeFilePath(f.path || f.id || f.fileId, project);
                    const newPath = oldPath.replace(normalizedOldId, newId);
                    
                    // 同步更新会话（如果是文件）
                    if (node.type === 'file' && project) {
                        try {
                            // 删除旧会话
                            const oldSessionId = sessionSync.generateSessionId(oldPath, project);
                            await sessionSync.deleteSession(oldSessionId);
                            
                            // 创建新会话
                            const updatedFile = { ...f, fileId: newPath, id: newPath, path: newPath, name: newPath.split('/').pop() };
                            await sessionSync.syncFileToSession(updatedFile, project, false);
                            console.log('[renameItem] 会话已同步更新:', oldPath, '->', newPath);
                        } catch (syncError) {
                            console.warn('[renameItem] 同步会话失败（已忽略）:', syncError?.message);
                        }
                    }
                }
            } catch (e) {
                console.warn('[renameItem] 远端文件同步失败（已忽略）:', e?.message);
            }
            
            // 同步更新会话（如果是文件）
            return newId;
        }, '重命名');
    };

    /**
     * 删除节点
     */
    const deleteItem = async ({ itemId, projectId = null }) => {
        return safeExecuteAsync(async () => {
            if (!itemId) throw createError('缺少目标ID', ErrorTypes.VALIDATION, '删除');
            const root = Array.isArray(fileTree.value) ? fileTree.value[0] : fileTree.value;
            const { node, parent } = findNodeAndParentById(root, itemId);
            if (!node) throw createError('未找到目标节点', ErrorTypes.API, '删除');
            const project = projectId || selectedProject.value;
            const prevFiles = Array.isArray(files.value) ? files.value.slice() : [];
            
            // 如果删除的是根节点：执行整棵树与对应文件集合的清理
            if (!parent) {
                try {
                    // 从会话中删除所有相关文件的会话
                    if (project) {
                        // 2025-01-08: 使用 sessions 查询替代 projectFiles 查询
                        let targetSessions = [];
                        if (sessions.value && sessions.value.length > 0) {
                             targetSessions = sessions.value.filter(s => s.tags && Array.isArray(s.tags) && s.tags.includes(project));
                        } else {
                             const url = buildServiceUrl('query_documents', { cname: 'sessions' });
                             const res = await getData(url, {}, false);
                             const list = res?.data?.list || [];
                             targetSessions = list.filter(s => s.tags && Array.isArray(s.tags) && s.tags.includes(project));
                        }
                        
                        console.log('[deleteItem - root] 开始删除项目所有相关会话，会话数:', targetSessions.length, '项目ID:', project);
                        
                        let sessionSuccessCount = 0;
                        for (const s of targetSessions) {
                            const sid = s.id || s._id;
                            if (sid) {
                                try {
                                    const payload = {
                                        module_name: SERVICE_MODULE,
                                        method_name: 'delete_document',
                                        parameters: { cname: 'sessions', id: sid }
                                    };
                                    await postData(`${window.API_URL}/`, payload);
                                    sessionSuccessCount++;
                                } catch (e) {
                                    console.warn('[deleteItem - root] 删除会话失败:', sid, e);
                                }
                            }
                        }
                        
                        console.log('[deleteItem - root] 会话删除完成:', {
                            总数: targetSessions.length,
                            会话成功: sessionSuccessCount
                        });
                    }
                    // 删除远端评论集合（该项目）
                    if (project) {
                        const commentsQueryUrl = buildServiceUrl('query_documents', {
                            cname: 'comments',
                            projectId: project
                        });
                        const commentsResp = await getData(commentsQueryUrl, {}, false);
                        const commentsList = commentsResp?.data?.list || [];
                        for (const c of commentsList) {
                            const cKey = c?.key || c?._id || c?.id;
                            if (cKey) {
                                const deletePayload = {
                                    module_name: SERVICE_MODULE,
                                    method_name: 'delete_document',
                                    parameters: {
                                        cname: 'comments',
                                        id: cKey
                                    }
                                };
                                await postData(`${window.API_URL}/`, deletePayload);
                            }
                        }
                    }
                } catch (cleanupErr) {
                    console.warn('[deleteItem] 根节点级联删除失败（已忽略）:', cleanupErr?.message || cleanupErr);
                }
                // 清空本地状态
                fileTree.value = [];
                fileTreeDocKey.value = '';
                files.value = [];
                comments.value = [];
                selectedFileId.value = null;
                expandedFolders.value = new Set();
                // 刷新项目列表并对齐UI
                try {
                    const refreshed = await loadProjects();
                    const list = Array.isArray(refreshed) ? refreshed : (projects?.value || []);
                    if (list.length > 0) {
                        const first = list[0];
                        setSelectedProject(first.id);
                        await refreshData();
                    } else {
                        setSelectedProject('');
                    }
                } catch (_) {}
                return true;
            }

            // 非根节点删除逻辑
            parent.children = (parent.children || []).filter(ch => ch.id !== itemId);
            // 保持全部展开
            expandAllFolders();

            // 同步本地files列表（若删除文件或文件夹）
            if (Array.isArray(files.value)) {
                files.value = files.value.filter(f => {
                    const ids = [f.fileId, f.id, f.path].filter(Boolean);
                    const matched = ids.some(v => String(v) === itemId || String(v).startsWith(itemId + '/'));
                    return !matched;
                });
            }

            await persistFileTree(projectId);

            // 远端删除受影响文件（使用统一的删除服务）
            try {
                const affected = prevFiles.filter(f => {
                    const ids = [f.fileId, f.id, f.path].filter(Boolean);
                    return ids.some(v => String(v) === itemId || String(v).startsWith(itemId + '/'));
                }).map(f => {
                    // 确保每个文件对象都有 projectId
                    if (!f.projectId && project) {
                        return { ...f, projectId: project };
                    }
                    return f;
                });
                
                console.log('[deleteItem] 开始删除，受影响文件数:', affected.length, '项目ID:', project);
                console.log('[deleteItem] 受影响文件详情:', affected.map(f => ({
                    fileId: f.fileId || f.id || f.path,
                    key: f.key || f._id,
                    projectId: f.projectId || project
                })));
                
                // 使用统一的文件删除服务
                const fileDeleteService = getFileDeleteService();
                const deleteResults = await fileDeleteService.deleteFiles(affected, project);
                
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
                const fileId = node.id || node.fileId || node.path || '';
                const name = node.name || (fileId ? fileId.split('/').pop() : '');
                const path = node.path || fileId;
                const content = node.content || '';
                
                fileList.push({
                    fileId: fileId,
                    id: fileId,
                    path: path,
                    name: name,
                    content: content,
                    type: 'file',
                    projectId: node.projectId || selectedProject.value,
                    key: node.key,
                    _id: node._id || node.key,
                    createdAt: node.createdAt || node.createdTime,
                    updatedAt: node.updatedAt || node.updatedTime
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
    const loadFiles = async (projectId = null) => {
        return safeExecuteAsync(async () => {
            console.log('[loadFiles] 正在从文件树中提取文件数据...', { projectId });
            
            // 需要明确的项目
            const project = projectId || selectedProject.value;
            if (!project) {
                console.warn('[loadFiles] 缺少项目，跳过代码文件加载');
                files.value = [];
                return [];
            }
            
            // 如果文件树还没有加载，先加载文件树
            if (!fileTree.value || fileTree.value.length === 0) {
                console.log('[loadFiles] 文件树未加载，先加载文件树...');
                await loadFileTree(project);
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
    const findFileInTree = (nodes, targetFileId, fileKey = null) => {
        const normalizeId = (v) => String(v || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/\/+/g, '/');
        const targetNorm = normalizeId(targetFileId);
        
        const traverse = (node) => {
            if (!node || typeof node !== 'object') return null;
            
            // 如果是文件节点，检查是否匹配
            if (node.type === 'file' || (node.type !== 'folder' && !node.children)) {
                // 优先使用Key匹配
                if (fileKey && (node.key === fileKey || node._id === fileKey)) {
                    return node;
                }
                
                // 使用路径匹配
                const candidates = [node.id, node.fileId, node.path, node.name].filter(Boolean).map(normalizeId);
                const matched = candidates.some(c => {
                    // 完全匹配
                    if (c === targetNorm) return true;
                    // 路径匹配
                    if (c.endsWith('/' + targetNorm) || targetNorm.endsWith('/' + c)) return true;
                    // 文件名匹配
                    const cName = c.split('/').pop();
                    const targetName = targetNorm.split('/').pop();
                    if (cName && targetName && cName === targetName) return true;
                    return false;
                });
                
                if (matched) return node;
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
     * 按需加载单个文件（从文件树中查找，不再调用 projectFiles 接口）
     */
    const loadFileById = async (projectId = null, targetFileId = null, fileKey = null) => {
        return safeExecuteAsync(async () => {
            const project = projectId || selectedProject.value;
            const fileId = targetFileId || selectedFileId.value;
            if (!project || !fileId) return null;

            console.log('[loadFileById] 尝试从文件树中查找文件:', fileId, '项目:', project, '文件Key:', fileKey);
            
            // 如果文件树还没有加载，先加载文件树
            if (!fileTree.value || fileTree.value.length === 0) {
                console.log('[loadFileById] 文件树未加载，先加载文件树...');
                await loadFileTree(project);
            }
            
            // 从文件树中查找文件
            let foundNode = findFileInTree(fileTree.value, fileId, fileKey);
            
            // 如果没找到，尝试从已加载的文件列表中查找
            if (!foundNode && files.value && files.value.length > 0) {
                console.log('[loadFileById] 在文件树中未找到，尝试从文件列表中查找');
                const normalizeId = (v) => String(v || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/\/+/g, '/');
                const targetNorm = normalizeId(fileId);
                
                if (fileKey) {
                    foundNode = files.value.find(f => f.key === fileKey || f._id === fileKey);
                }
                
                if (!foundNode) {
                    foundNode = files.value.find(f => {
                        const candidates = [f.fileId, f.id, f.path, f.name].filter(Boolean).map(normalizeId);
                        return candidates.some(c => {
                            if (c === targetNorm) return true;
                            if (c.endsWith('/' + targetNorm) || targetNorm.endsWith('/' + c)) return true;
                            const cName = c.split('/').pop();
                            const targetName = targetNorm.split('/').pop();
                            return cName && targetName && cName === targetName;
                        });
                    });
                }
            }
            
            if (!foundNode) {
                console.warn('[loadFileById] 未找到文件:', fileId);
                return null;
            }
            
            console.log('[loadFileById] 找到文件:', foundNode.name || foundNode.id);
            
            // 处理找到的文件节点
            return await processFileItem(foundNode);
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

        const identifier = pickFirstString(
            item?.fileId, item?.id, item?.path, item?.file, item?.name,
            data?.fileId, data?.id, data?.path, data?.file, data?.name
        );
        // 优先选择 path 类字段作为标识，避免被后端文档 key 覆盖
        const idCandidates = [
            data?.path, item?.path,
            item?.fileId, data?.fileId,
            item?.id, data?.id,
            item?.file, data?.file,
            data?.name, item?.name
        ].filter(Boolean);
        const isPathLike = (s) => typeof s === 'string' && (s.includes('/') || s.includes('\\'));
        const preferredId = (idCandidates.find(isPathLike) || idCandidates[0] || identifier || '');
        const path = pickFirstString(data?.path, item?.path, preferredId);
        const name = pickFirstString(data?.name, item?.name, (typeof path === 'string' ? path.split('/').pop() : ''));

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
            fileId: preferredId, 
            id: preferredId, 
            path, 
            name, 
            content,
            // 保留原始的唯一标识符
            key: item?.key || item?._id || item?.id,
            _id: item?._id || item?.key || item?.id
        };

        // 合并/去重更新到 files 列表（使用等值或 endsWith 规则匹配）
        if (!Array.isArray(files.value)) files.value = [];
        const normalizeId = (v) => String(v || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/\/+/g, '/');
        const targetNorm = normalizeId(identifier || item?.fileId || item?.id);
        const matches = (f) => {
            const d = (f && typeof f === 'object' && f.data && typeof f.data === 'object') ? f.data : {};
            const candidates = [f?.fileId, f?.id, f?.path, f?.name, d?.fileId, d?.id, d?.path, d?.name].filter(Boolean);
            
            return candidates.some(c => {
                // 完全匹配
                if (c === targetNorm) return true;
                
                // 路径匹配：确保是完整的路径匹配，不是部分匹配
                if (c.endsWith('/' + targetNorm)) {
                    // 确保targetNorm不是空字符串，且c以targetNorm结尾
                    return targetNorm && targetNorm.length > 0;
                }
                if (targetNorm.endsWith('/' + c)) {
                    // 确保c不是空字符串，且targetNorm以c结尾
                    return c && c.length > 0;
                }
                
                // 文件名匹配：只有当路径部分也一致时才匹配
                const cName = c.split('/').pop();
                const targetName = targetNorm.split('/').pop();
                if (cName && targetName && cName === targetName) {
                    // 检查路径部分是否一致
                    const cPath = c.substring(0, c.lastIndexOf('/'));
                    const targetPath = targetNorm.substring(0, targetNorm.lastIndexOf('/'));
                    
                    return cPath === targetPath || (!cPath && !targetPath);
                }
                return false;
            });
        };
        // 删除旧的匹配项，插入标准化后的最新项，避免 find 命中旧的无内容项
        const remaining = files.value.filter(f => !matches(f));
        remaining.push(normalized);
        files.value = remaining;

        return normalized;
    };

    /**
     * 规范化评论数据，确保与会话消息格式保持一致
     * 统一字段：content/text, timestamp/createdTime/createdAt, type
     * @param {Object} comment - 评论对象
     * @returns {Object} 规范化后的评论对象
     */
    const normalizeComment = (comment) => {
        if (!comment || typeof comment !== 'object') return comment;
        
        // 统一 content 字段（优先使用 content，如果没有则使用 text）
        const content = String(comment.content || comment.text || '').trim();
        
        // 统一 timestamp 字段（转换为毫秒数）
        let timestamp = Date.now();
        if (comment.timestamp) {
            if (typeof comment.timestamp === 'string') {
                const date = new Date(comment.timestamp);
                timestamp = isNaN(date.getTime()) ? Date.now() : date.getTime();
            } else if (typeof comment.timestamp === 'number') {
                // 如果是秒级时间戳，转换为毫秒
                timestamp = comment.timestamp < 1e12 ? comment.timestamp * 1000 : comment.timestamp;
            }
        } else if (comment.createdTime) {
            if (typeof comment.createdTime === 'string') {
                const date = new Date(comment.createdTime);
                timestamp = isNaN(date.getTime()) ? Date.now() : date.getTime();
            } else if (typeof comment.createdTime === 'number') {
                timestamp = comment.createdTime < 1e12 ? comment.createdTime * 1000 : comment.createdTime;
            }
        } else if (comment.createdAt) {
            if (typeof comment.createdAt === 'string') {
                const date = new Date(comment.createdAt);
                timestamp = isNaN(date.getTime()) ? Date.now() : date.getTime();
            } else if (typeof comment.createdAt === 'number') {
                timestamp = comment.createdAt < 1e12 ? comment.createdAt * 1000 : comment.createdAt;
            }
        }
        
        // 统一 type 字段
        let type = comment.type;
        if (!type) {
            if (comment.role) {
                const role = String(comment.role).toLowerCase();
                type = (role === 'user' || role === 'me') ? 'user' : 'pet';
            } else {
                // 根据 author 判断
                const author = String(comment.author || '').toLowerCase();
                type = (author.includes('ai') || author.includes('助手') || author.includes('assistant')) ? 'pet' : 'user';
            }
        }
        
        // 返回规范化后的评论，确保所有相关字段保持一致
        // 如果存在 rangeInfo，说明 text 字段存储的是引用代码，应该保留原有的 text 值
        // 否则，text 和 content 保持一致
        const textValue = (comment.rangeInfo && comment.text) ? comment.text : content;
        
        return {
            ...comment,
            // 统一的消息字段
            type: type,
            content: content,
            timestamp: timestamp,
            // 兼容字段（保持与 content 和 timestamp 一致）
            // 如果有 rangeInfo，保留原有的 text（引用代码），否则使用 content
            text: textValue,
            createdTime: timestamp, // 毫秒数
            createdAt: timestamp, // 毫秒数
            // 保留其他字段
            imageDataUrl: comment.imageDataUrl || comment.image || undefined
        };
    };

    /**
     * 异步加载评论数据
     */
    const loadComments = async (projectId = null) => {
        return safeExecuteAsync(async () => {
            // 防止重复请求
            if (loading.value) {
                console.log('[loadComments] 正在加载中，跳过重复请求');
                return comments.value;
            }
            
            console.log('[loadComments] 正在加载评论数据...', { projectId });
            
            // 检查是否有项目信息
            const project = projectId || selectedProject.value;
            
            if (!project) {
                console.log('[loadComments] 项目信息不完整，跳过评论加载');
                comments.value = [];
                return [];
            }
            
            // 设置loading状态
            loading.value = true;
            
            try {
                // 调用MongoDB接口获取评论数据
                const queryParams = {
                    cname: 'comments',
                    projectId: project
                };
                
                // 如果有当前选中的文件，也添加到参数中
                if (selectedFileId.value) {
                    queryParams.fileId = selectedFileId.value;
                }
                
                const url = buildServiceUrl('query_documents', queryParams);
                
                console.log('[loadComments] 调用MongoDB接口:', url);
                // 禁用本地缓存，确保评论列表总是从服务端获取最新数据
                const response = await getData(url, {}, false);
                
                if (response && response.data && response.data.list) {
                    // 规范化评论数据，确保字段一致性
                    comments.value = response.data.list.map(comment => normalizeComment(comment));
                    console.log(`[loadComments] 成功加载 ${comments.value.length} 条评论`);
                    console.log('[loadComments] 评论数据详情:', comments.value);
                    
                    // 注意：初始化时不需要同步评论到会话消息，同步操作应在数据变更时（创建、更新、删除）进行
                    // 这样可以避免初始化时产生大量不必要的 session API 调用
                    
                    return comments.value;
                } else {
                    comments.value = [];
                    console.log('[loadComments] 没有评论数据');
                    return [];
                }
            } catch (error) {
                console.error('[loadComments] 加载评论失败:', error);
                comments.value = [];
                return [];
            } finally {
                // 清除loading状态
                loading.value = false;
            }
        }, '评论数据加载', (errorInfo) => {
            error.value = errorInfo.message;
            errorMessage.value = errorInfo.message;
            comments.value = [];
            loading.value = false;
        });
    };

    /**
     * 异步加载评论者数据
     */
    const loadCommenters = async (projectId = null) => {
        return safeExecuteAsync(async () => {
            // 防止重复加载
            if (commentersLoading.value) {
                console.log('[loadCommenters] 评论者数据正在加载中，跳过重复请求');
                return commenters.value;
            }
            
            commentersLoading.value = true;
            commentersError.value = '';
            
            console.log('[loadCommenters] 正在加载评论者数据...', { projectId });
            
            // 检查是否有项目信息
            const project = projectId || selectedProject.value;
            
            if (!project) {
                console.log('[loadCommenters] 项目信息不完整，跳过评论者加载');
                commenters.value = [];
                return [];
            }
            
            console.log('[loadCommenters] 项目信息完整，开始加载评论者');
            
            try {
                const commentersUrl = buildServiceUrl('query_documents', {
                    cname: 'commenters',
                    projectId: project
                });
                
                console.log('[loadCommenters] 调用服务接口:', commentersUrl);
                const response = await getData(commentersUrl);
                
                if (response && response.data && response.data.list) {
                    commenters.value = response.data.list;
                    console.log(`[loadCommenters] 成功加载 ${commenters.value.length} 个评论者`);
                    return commenters.value;
                } else {
                    commenters.value = [];
                    console.log('[loadCommenters] 没有评论者数据');
                    return [];
                }
            } catch (error) {
                console.error('[loadCommenters] 加载评论者失败:', error);
                commenters.value = [];
                return [];
            }
        }, '评论者数据加载', (errorInfo) => {
            commentersError.value = errorInfo.message;
            commenters.value = [];
        }).finally(() => {
            commentersLoading.value = false;
        });
    };

    /**
     * 添加评论者
     */
    const addCommenter = async (commenterData, projectId = null) => {
        return safeExecuteAsync(async () => {
            console.log('[addCommenter] 正在添加评论者...', { commenterData, projectId });
            
            // 检查是否有项目信息
            const project = projectId || selectedProject.value;
            
            if (!project) {
                throw new Error('项目信息不完整，无法添加评论者');
            }
            
            // 构建添加URL
            // 构建标准服务接口 payload
            const requestData = {
                ...commenterData,
                projectId: project
            };
            
            console.log('[addCommenter] 调用服务接口:', requestData);
            
            try {
                // 检查网络连接
                if (!navigator.onLine) {
                    throw new Error('网络连接不可用，请检查网络设置');
                }
                
                // 检查API_URL是否可用
                if (!window.API_URL) {
                    throw new Error('API配置错误：API_URL未定义');
                }
                
                console.log('[addCommenter] API_URL:', window.API_URL);
                // 使用标准服务接口创建评论者
                const payload = {
                    module_name: SERVICE_MODULE,
                    method_name: 'create_document',
                    parameters: {
                        cname: 'commenters',
                        data: requestData
                    }
                };
                const response = await postData(`${window.API_URL}/`, payload);
                
                console.log('[addCommenter] 添加响应:', response);
                
                if (response && response.status === 200) {
                    console.log('[addCommenter] 评论者添加成功');
                    // 重新加载评论者列表
                    await loadCommenters(project);
                    return response.data;
                } else {
                    const errorMsg = response?.message || response?.error || '服务器返回错误';
                    console.error('[addCommenter] 服务器返回错误:', response);
                    throw new Error('添加评论者失败: ' + errorMsg);
                }
            } catch (error) {
                console.error('[addCommenter] 添加请求失败:', error);
                
                // 提供更详细的错误信息
                let errorMessage = '添加评论者失败: ';
                
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    errorMessage += '网络请求失败，可能是网络连接问题或API服务器不可用';
                } else if (error.status === 404) {
                    errorMessage += 'API接口不存在';
                } else if (error.status === 500) {
                    errorMessage += '服务器内部错误';
                } else if (error.status === 403) {
                    errorMessage += '访问被拒绝，请检查权限';
                } else if (error.message.includes('timeout')) {
                    errorMessage += '请求超时，请检查网络连接';
                } else {
                    errorMessage += error.message || '未知错误';
                }
                
                console.error('[addCommenter] 详细错误信息:', {
                    name: error.name,
                    message: error.message,
                    status: error.status,
                    stack: error.stack
                });
                
                throw new Error(errorMessage);
            }
        }, '添加评论者', (errorInfo) => {
            commentersError.value = errorInfo.message;
        });
    };

    /**
     * 更新评论者
     */
    const updateCommenter = async (commenterKey, commenterData, projectId = null) => {
        return safeExecuteAsync(async () => {
            console.log('[updateCommenter] 正在更新评论者...', { commenterKey, commenterData, projectId });
            
            // 检查是否有项目信息
            const project = projectId || selectedProject.value;
            
            if (!project) {
                throw new Error('项目信息不完整，无法更新评论者');
            }
            
            // 构建更新URL
            // let url = `${window.API_URL}/mongodb/?cname=commenters`;
            
            const payload = {
                module_name: SERVICE_MODULE,
                method_name: 'update_document',
                parameters: {
                    cname: 'commenters',
                    key: commenterKey,
                    data: {
                        ...commenterData,
                        projectId: project
                    }
                }
            };
            
            console.log('[updateCommenter] 调用MongoDB接口:', payload);
            
            try {
                // 使用PUT方法更新评论者
                const response = await postData(`${window.API_URL}/`, payload);
                
                console.log('[updateCommenter] 更新响应:', response);
                
                if (response && response.status === 200) {
                    console.log('[updateCommenter] 评论者更新成功');
                    // 重新加载评论者列表
                    await loadCommenters(project);
                    return response.data;
                } else {
                    throw new Error('更新评论者失败: ' + (response?.message || '未知错误'));
                }
            } catch (error) {
                console.error('[updateCommenter] 更新请求失败:', error);
                throw new Error('更新评论者失败: ' + error.message);
            }
        }, '更新评论者', (errorInfo) => {
            commentersError.value = errorInfo.message;
        });
    };

    /**
     * 删除评论者
     */
    const deleteCommenter = async (commenterKey, projectId = null) => {
        return safeExecuteAsync(async () => {
            console.log('[deleteCommenter] 正在删除评论者...', { commenterKey, projectId });
            
            // 验证评论者key
            if (!commenterKey) {
                throw new Error('评论者key不能为空');
            }
            
            // 检查是否有项目信息
            const project = projectId || selectedProject.value;
            
            if (!project) {
                throw new Error('项目信息不完整，无法删除评论者');
            }
            
            // 构建删除请求
            const deletePayload = {
                module_name: SERVICE_MODULE,
                method_name: 'delete_document',
                parameters: {
                    cname: 'commenters',
                    id: commenterKey
                }
            };
            
            console.log('[deleteCommenter] 调用MongoDB接口:', deletePayload);
            
            try {
                // 使用POST方法删除评论者
                const response = await postData(`${window.API_URL}/`, deletePayload);
                
                console.log('[deleteCommenter] 删除响应:', response);
                
                if (response && response.status === 200) {
                    console.log('[deleteCommenter] 评论者删除成功');
                    // 重新加载评论者列表
                    await loadCommenters(project);
                    return response.data;
                } else {
                    throw new Error('删除评论者失败: ' + (response?.message || '未知错误'));
                }
            } catch (error) {
                console.error('[deleteCommenter] 删除请求失败:', error);
                throw new Error('删除评论者失败: ' + error.message);
            }
        }, '删除评论者', (errorInfo) => {
            commentersError.value = errorInfo.message;
        });
    };

    /**
     * 设置选中的评论者ID列表
     */
    const setSelectedCommenterIds = (commenterIds) => {
        if (Array.isArray(commenterIds)) {
            selectedCommenterIds.value = commenterIds;
        }
    };

    /**
     * 统一的文件ID规范化函数（使用统一的规范化工具）
     * @param {string} fileId - 文件ID
     * @param {string} projectId - 项目ID（可选）
     * @returns {string} 规范化后的文件ID
     */
    const normalizeFileId = (fileId, projectId = null) => {
        return normalizeFilePath(fileId, projectId);
    };

    /**
     * 设置选中的文件ID
     * @param {string} fileId - 文件ID
     */
    const setSelectedFileId = (fileId) => {
        if (fileId === null) {
            selectedFileId.value = null;
            return;
        }
        // 使用统一的规范化函数
        selectedFileId.value = normalizeFileId(fileId);
    };

    /**
     * 切换文件夹展开状态
     * @param {string} folderId - 文件夹ID
     */
    const toggleFolder = (folderId) => {
        if (expandedFolders.value.has(folderId)) {
            expandedFolders.value.delete(folderId);
        } else {
            expandedFolders.value.add(folderId);
        }
    };

    /**
     * 添加评论
     * @param {Object} commentData - 评论数据
     */
    const addComment = (commentData) => {
        if (!commentData || !commentData.content) return;
        
        const newCommentObj = {
            key: Date.now(),
            fileId: commentData.fileId,
            line: commentData.line || 0,
            author: commentData.author || 'liangliang',
            content: commentData.content,
            replies: [],
            timestamp: new Date().toISOString()
        };
        
        comments.value.push(newCommentObj);
    };

    /**
     * 切换侧边栏状态
     */
    const toggleSidebar = () => {
        sidebarCollapsed.value = !sidebarCollapsed.value;
    };

    /**
     * 切换评论区状态
     */
    const toggleComments = () => {
        commentsCollapsed.value = !commentsCollapsed.value;
    };

    /**
     * 设置项目列表
     */
    const setProjects = (list) => {
        projects.value = Array.isArray(list) ? list : [];
        // 如果当前选中的项目不在新列表中，则清空
        if (!projects.value.find(p => p.id === selectedProject.value)) {
            selectedProject.value = '';
        }
    };

    /**
     * 加载项目列表
     */
    const loadProjects = async () => {
        return safeExecuteAsync(async () => {
            console.log('[loadProjects] 正在加载项目列表(从会话衍生)...');
            
            // Try to load sessions if empty
            if (!sessions.value || sessions.value.length === 0) {
                await loadSessions();
            }
            
            const uniqueProjects = new Set();
            if (sessions.value && Array.isArray(sessions.value)) {
                sessions.value.forEach(s => {
                    if (s.tags && Array.isArray(s.tags) && s.tags.length > 0) {
                        // Assumption: First tag is project
                        uniqueProjects.add(s.tags[0]);
                    }
                });
            }
            
            // If no sessions, maybe fallback to existing projects or empty
            const list = Array.from(uniqueProjects).map(id => ({ id, name: id }));
            
            // Sort
            list.sort((a, b) => a.id.localeCompare(b.id));
            
            projects.value = list;
            console.log(`[loadProjects] 加载了 ${list.length} 个项目`);
            return list;
        }, '项目列表加载', (errorInfo) => {
            error.value = errorInfo.message;
            errorMessage.value = errorInfo.message;
            projects.value = [];
        });
    };

    /**
     * 设置选中的项目
     */
    const setSelectedProject = (projectId) => {
        selectedProject.value = projectId;
    };

    /**
     * 设置新增评论内容
     * @param {string} content - 评论内容
     */
    const setNewComment = (content) => {
        newComment.value = content;
        console.log('[setNewComment] 设置评论内容:', content);
    };

    /**
     * 刷新数据
     */
    const refreshData = async () => {
        if (!selectedProject.value) {
            console.warn('[refreshData] 请先选择项目');
            return;
        }
        
        console.log('[refreshData] 正在刷新数据...', { 
            project: selectedProject.value
        });
        
        try {
            await Promise.all([
                loadFileTree(selectedProject.value),
                loadFiles(selectedProject.value),
                loadComments(selectedProject.value),
                loadCommenters(selectedProject.value)
            ]);
            
            // 清空选中的文件
            selectedFileId.value = null;
            
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
            const savedCommentsWidth = localStorage.getItem('aicrCommentsWidth');
            
            if (savedSidebarWidth) {
                const width = Math.max(50, parseInt(savedSidebarWidth, 10));
                if (!isNaN(width)) {
                    sidebarWidth.value = width;
                }
            }
            
            if (savedCommentsWidth) {
                const width = Math.max(50, parseInt(savedCommentsWidth, 10));
                if (!isNaN(width)) {
                    commentsWidth.value = width;
                }
            }
        } catch (error) {
            console.warn('[loadSidebarWidths] 加载侧边栏宽度失败:', error);
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

    /**
     * 保存评论区宽度
     */
    const saveCommentsWidth = (width) => {
        try {
            commentsWidth.value = width;
            localStorage.setItem('aicrCommentsWidth', width.toString());
        } catch (error) {
            console.warn('[saveCommentsWidth] 保存评论区宽度失败:', error);
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
                sessionList = sessionList.filter(s => s && s.id); // 过滤无效会话
                
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
        comments,
        selectedFileId,
        loading,
        error,
        errorMessage,
        expandedFolders,
        sidebarCollapsed,
        commentsCollapsed,
        sidebarWidth,
        commentsWidth,
        
        // 项目管理
        projects,
        selectedProject,
        
        // 搜索相关状态
        searchQuery,
        newComment,
        
        // 批量选择相关状态
        batchMode,
        selectedFileIds,
        
        // 会话批量选择相关状态
        sessionBatchMode,
        selectedSessionIds,
        
        // 视图模式
        viewMode,
        
        // 评论者相关状态
        commenters,
        selectedCommenterIds,
        commentersLoading,
        commentersError,
        
        // 会话列表相关状态
        sessions,
        sessionLoading,
        sessionError,
        sessionListVisible,
        selectedSessionTags,
        sessionSearchQuery,
        sessionSidebarWidth,
        
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
        expandAllFolders,
        persistFileTree,
        createFolder,
        createFile,
        renameItem,
        deleteItem,
        normalizeComment,
        loadComments,
        loadCommenters,
        addCommenter,
        updateCommenter,
        deleteCommenter,
        setSelectedCommenterIds,
        setSelectedFileId,
        normalizeFileId, // 新增：统一的文件ID规范化函数
        toggleFolder,
        addComment,
        toggleSidebar,
        toggleComments,
        loadProjects,
        setProjects,
        setSelectedProject,
        setNewComment,
        refreshData,
        clearError,
        loadSidebarWidths,
        saveSidebarWidth,
        saveCommentsWidth,
        loadSessions,
        saveSessionSidebarWidth,
        loadSessionSidebarWidth
    };
};








