/**
 * 代码审查页面数据存储管理
 * author: liangliang
 */

import { getData, postData, deleteData, updateData } from '/apis/index.js';
import { safeExecuteAsync, createError, ErrorTypes } from '/utils/error.js';
import { getSessionSyncService } from '/views/aicr/services/sessionSyncService.js';

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
    
    // 项目管理 - 简化后只管理项目，不再有版本概念
    const projects = vueRef([]); // 存储项目列表
    const selectedProject = vueRef('');
    
    // UI：项目维护弹框与表单
    const showPvManager = vueRef(false);
    const pvProjects = vueRef([]);
    const pvSelectedProjectId = vueRef('');
    const pvNewProjectId = vueRef('');
    const pvNewProjectName = vueRef('');
    const pvError = vueRef('');
    
    // 搜索相关状态
    const searchQuery = vueRef('');
    // 新增评论内容
    const newComment = vueRef('');
    
    // 评论者相关状态
    const commenters = vueRef([]);
    const selectedCommenterIds = vueRef([]);
    const commentersLoading = vueRef(false);
    const commentersError = vueRef('');

    // 会话同步服务
    const sessionSync = getSessionSyncService();

    /**
     * 异步加载文件树数据
     */
    const loadFileTree = async (projectId = null) => {
        return safeExecuteAsync(async () => {
            loading.value = true;
            error.value = null;
            errorMessage.value = '';
            
            console.log('[loadFileTree] 正在加载文件树数据...', { projectId });
            
            // 需要明确的项目
            const project = projectId || selectedProject.value;
            if (!project) {
                console.warn('[loadFileTree] 缺少项目，跳过文件树加载');
                fileTree.value = [];
                fileTreeDocKey.value = '';
                return [];
            }
            const tree_url = `${window.API_URL}/mongodb/?cname=projectTree&projectId=${project}`;
            
            const response = await getData(tree_url);

            // 检查响应结构和数据有效性
            if (!response || typeof response !== 'object') {
                console.warn('[loadFileTree] API响应格式错误:', response);
                fileTree.value = [];
                fileTreeDocKey.value = '';
                return [];
            }

            // 检查是否有数据
            if (!response.data || !Array.isArray(response.data.list) || response.data.list.length === 0) {
                console.warn('[loadFileTree] 文件树数据为空，项目可能不存在:', { project });
                fileTree.value = [];
                fileTreeDocKey.value = '';
                return [];
            }

            // 只取第一个文件树对象，确保格式正确
            const treeDoc = response.data.list[0];
            // 在内存中为每个节点补充 path 字段，避免后端缺失
            const rootNode = treeDoc.data;
            const ensureName = (node) => node && (node.name || (typeof node.id === 'string' ? node.id.split('/').pop() : ''));
            const addPaths = (node, parentPath = '') => {
                if (!node || typeof node !== 'object') return;
                const name = ensureName(node) || '';
                const currentPath = parentPath ? `${parentPath}/${name}` : name;
                if (!node.path || typeof node.path !== 'string') {
                    node.path = currentPath;
                }
                if (!node.id || typeof node.id !== 'string' || node.id.trim() === '') {
                    node.id = currentPath;
                }
                if (node.type === 'folder' && Array.isArray(node.children)) {
                    node.children.forEach(child => addPaths(child, currentPath));
                }
            };
            addPaths(rootNode, '');
            
            // 对文件树进行排序
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
            
            // 递归排序文件树
            const sortFileTreeRecursively = (node) => {
                if (!node || typeof node !== 'object') return node;
                
                // 如果有子节点，递归排序
                if (node.type === 'folder' && Array.isArray(node.children)) {
                    node.children = sortFileTreeItems(node.children);
                    node.children.forEach(child => sortFileTreeRecursively(child));
                }
                
                return node;
            };
            
            // 对根节点进行排序
            const sortedRootNode = sortFileTreeRecursively(rootNode);
            fileTree.value = [sortedRootNode]; 
            // 保存文档key用于后续更新
            fileTreeDocKey.value = treeDoc.key || treeDoc._id || treeDoc.id || '';
            console.log(`[loadFileTree] 成功加载并排序文件树数据`);

            // 默认展开所有文件夹
            function collectAllFolderIds(nodes, set) {
                if (!Array.isArray(nodes)) {
                    // 如果是单个节点，直接处理
                    if (nodes.type === 'folder') {
                        set.add(nodes.id);
                        if (nodes.children) collectAllFolderIds(nodes.children, set);
                    }
                    return;
                }
                
                nodes.forEach(item => {
                    if (item.type === 'folder') {
                        set.add(item.id);
                        if (item.children) collectAllFolderIds(item.children, set);
                    }
                });
            }
            const allFolders = new Set();
            // 使用实际的文件树数据进行收集，确保默认展开
            collectAllFolderIds(fileTree.value, allFolders);
            expandedFolders.value = allFolders;
            
            return response;
        }, '文件树数据加载', (errorInfo) => {
            error.value = errorInfo.message;
            errorMessage.value = errorInfo.message;
            fileTree.value = [];
            fileTreeDocKey.value = '';
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
            if (!fileTreeDocKey.value) {
                throw createError('缺少文件树文档key，无法持久化', ErrorTypes.API, '文件树保存');
            }
            const payload = {
                key: fileTreeDocKey.value,
                projectId: project,
                data: Array.isArray(fileTree.value) ? fileTree.value[0] : fileTree.value
            };
            const url = `${window.API_URL}/mongodb/?cname=projectTree`;
            const res = await updateData(url, payload);
            return res;
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
            parentNode.children.push({ id: newId, name, type: 'folder', children: [] });
            
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
     */
    const createFile = async ({ parentId, name, content = '', projectId = null }) => {
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

            const newId = (parentNode.id ? `${parentNode.id}/` : '') + name;
            const now = Date.now();
            parentNode.children.push({ id: newId, name, type: 'file', size: content ? content.length : 0, modified: now });
            
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

            // 先持久化树
            await persistFileTree(projectId);

            // 在文件集合中新增占位（远端与本地）
            let createdKey = null;
            try {
                const filesUrl = `${window.API_URL}/mongodb/?cname=projectFiles`;
                const createResult = await postData(filesUrl, {
                    projectId: projectId || selectedProject.value,
                    fileId: newId,
                    id: newId,
                    path: newId,
                    name,
                    content: content || ''
                });
                // 记录后端返回的唯一标识，供后续首次保存使用
                createdKey = createResult?.data?.key || createResult?.key || null;
            } catch (e) {
                // 不中断主流程
                console.warn('[createFile] 创建文件内容文档失败（已忽略）:', e?.message);
            }

            // 更新本地files列表，携带后端返回的key，确保首次保存可PUT更新
            const newFile = { fileId: newId, id: newId, path: newId, name, content, key: createdKey };
            if (Array.isArray(files.value)) {
                files.value.push(newFile);
            }

            // 同步文件到会话
            try {
                const project = projectId || selectedProject.value;
                if (project) {
                    await sessionSync.syncFileToSession(newFile, project, false);
                    console.log('[createFile] 文件已同步到会话:', newId);
                }
            } catch (syncError) {
                console.warn('[createFile] 同步文件到会话失败（已忽略）:', syncError?.message);
            }

            return newId;
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

            // 计算新ID（基于父级路径）
            const basePath = parent ? (parent.id ? `${parent.id}/` : '') : '';
            const oldId = node.id;
            const newId = basePath + newName;
            node.name = newName;

            // 记录变更前的文件列表用于远端同步
            const prevFiles = Array.isArray(files.value) ? files.value.slice() : [];

            const updateIdsRecursively = (n, fromPrefix, toPrefix) => {
                if (n.id && typeof n.id === 'string') {
                    if (n.id === oldId) {
                        n.id = newId;
                    } else if (n.id.startsWith(fromPrefix + '/')) {
                        n.id = n.id.replace(fromPrefix + '/', toPrefix + '/');
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

            // 更新本地files列表（仅当是文件或其子层级文件）
            if (Array.isArray(files.value)) {
                files.value = files.value.map(f => {
                    const ids = [f.fileId, f.id, f.path].filter(Boolean);
                    const matched = ids.some(v => String(v) === oldId || String(v).startsWith(oldId + '/'));
                    if (matched) {
                        const replacedPath = String(f.path || f.id || f.fileId).replace(oldId, newId);
                        const newNameFromPath = replacedPath.split('/').pop();
                        return { ...f, fileId: replacedPath, id: replacedPath, path: replacedPath, name: newNameFromPath };
                    }
                    return f;
                });
            }

            await persistFileTree(projectId);

            // 同步远端文件集合
            const project = projectId || selectedProject.value;
            try {
                const filesUrl = `${window.API_URL}/mongodb/?cname=projectFiles`;
                const affected = prevFiles.filter(f => {
                    const ids = [f.fileId, f.id, f.path].filter(Boolean);
                    return ids.some(v => String(v) === oldId || String(v).startsWith(oldId + '/'));
                });
                for (const f of affected) {
                    const oldPath = String(f.path || f.id || f.fileId);
                    const newPath = oldPath.replace(oldId, newId);
                    const key = f.key || f._id || f.idKey;
                    if (key) {
                        await updateData(filesUrl, { key, projectId: project, fileId: newPath, id: newPath, path: newPath, name: newPath.split('/').pop(), content: f.content || (f.data && f.data.content) || '' });
                    } else {
                        // 无 key 时，尝试新增并删除旧文档
                        await postData(filesUrl, { projectId: project, fileId: newPath, id: newPath, path: newPath, name: newPath.split('/').pop(), content: f.content || (f.data && f.data.content) || '' });
                        try { await deleteData(`${filesUrl}&fileId=${encodeURIComponent(oldPath)}`); } catch (e) {}
                    }

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
                    // 删除远端树文档
                    if (project) {
                        const treeQueryUrl = `${window.API_URL}/mongodb/?cname=projectTree&projectId=${encodeURIComponent(project)}`;
                        const treeResp = await getData(treeQueryUrl, {}, false);
                        const treeList = treeResp?.data?.list || [];
                        for (const doc of treeList) {
                            const treeKey = doc?.key || doc?._id || doc?.id;
                            if (treeKey) {
                                await deleteData(`${treeQueryUrl}&key=${treeKey}`);
                            }
                        }
                    }
                    // 删除远端文件集合（含无key回退fileId删除）
                    if (project) {
                        const filesQueryUrl = `${window.API_URL}/mongodb/?cname=projectFiles&projectId=${encodeURIComponent(project)}`;
                        const filesResp = await getData(filesQueryUrl, {}, false);
                        const fileList = filesResp?.data?.list || [];
                        for (const f of fileList) {
                            const filePath = f?.fileId || f?.id || f?.path;
                            const fileKey = f?.key || f?._id || f?.id;
                            
                            // 删除 MongoDB 记录
                            if (fileKey) {
                                await deleteData(`${filesQueryUrl}&key=${fileKey}`);
                            } else if (filePath) {
                                try { 
                                    await deleteData(`${filesQueryUrl}&fileId=${encodeURIComponent(filePath)}`); 
                                } catch (_) {}
                            }
                            
                            // 删除对应的会话（如果是文件）
                            if (filePath && project) {
                                try {
                                    const sessionId = sessionSync.generateSessionId(filePath, project);
                                    console.log('[deleteItem] 准备删除会话（根节点删除）:', { filePath, project, sessionId });
                                    await sessionSync.deleteSession(sessionId);
                                    console.log('[deleteItem] ✓ 会话已删除（根节点删除）:', sessionId);
                                } catch (syncError) {
                                    console.warn('[deleteItem] ✗ 删除会话失败（已忽略）:', syncError?.message);
                                }
                            }
                        }
                    }
                    // 删除远端评论集合（该项目）
                    if (project) {
                        const commentsQueryUrl = `${window.API_URL}/mongodb/?cname=comments&projectId=${encodeURIComponent(project)}`;
                        const commentsResp = await getData(commentsQueryUrl, {}, false);
                        const commentsList = commentsResp?.data?.list || [];
                        for (const c of commentsList) {
                            const cKey = c?.key || c?._id || c?.id;
                            if (cKey) {
                                await deleteData(`${commentsQueryUrl}&key=${cKey}`);
                            }
                        }
                    }
                    // 从项目集合中删除该项目
                    {
                        const pvUrl = `${window.API_URL}/mongodb/?cname=projects`;
                        const pvResp = await getData(pvUrl, {}, false);
                        const pvList = pvResp?.data?.list || [];
                        const target = pvList.find(p => p?.id === project);
                        if (target) {
                            const key = target?.key || target?._id || target?.id;
                            if (key) {
                                await deleteData(`${pvUrl}&key=${key}`);
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

            // 远端删除受影响文件
            try {
                const filesUrl = `${window.API_URL}/mongodb/?cname=projectFiles`;
                const affected = prevFiles.filter(f => {
                    const ids = [f.fileId, f.id, f.path].filter(Boolean);
                    return ids.some(v => String(v) === itemId || String(v).startsWith(itemId + '/'));
                });
                for (const f of affected) {
                    const filePath = f.fileId || f.id || f.path;
                    const isFile = f.type === 'file' || (!f.type && filePath && !filePath.endsWith('/'));
                    
                    // 删除 MongoDB 记录
                    if (f && (f.key || f._id)) {
                        const key = f.key || f._id;
                        await deleteData(`${filesUrl}&key=${key}`);
                    } else if (filePath) {
                        try { 
                            await deleteData(`${filesUrl}&fileId=${encodeURIComponent(filePath)}`); 
                        } catch (e) {
                            console.warn('[deleteItem] 通过fileId删除失败:', filePath, e?.message);
                        }
                    }

                    // 删除对应的会话（如果是文件且找到了 projectId）
                    if (isFile && project && filePath) {
                        try {
                            const sessionId = sessionSync.generateSessionId(filePath, project);
                            console.log('[deleteItem] 准备删除会话:', { filePath, project, sessionId });
                            await sessionSync.deleteSession(sessionId);
                            console.log('[deleteItem] ✓ 会话已删除:', sessionId);
                        } catch (syncError) {
                            console.warn('[deleteItem] ✗ 删除会话失败（已忽略）:', syncError?.message);
                        }
                    }
                }
            } catch (e) {
                console.warn('[deleteItem] 远端文件删除失败（已忽略）:', e?.message);
            }
            return true;
        }, '删除节点');
    };

    /**
     * 异步加载代码文件数据
     */
    const loadFiles = async (projectId = null) => {
        return safeExecuteAsync(async () => {
            console.log('[loadFiles] 正在加载代码文件数据...', { projectId });
            
            // 需要明确的项目
            const project = projectId || selectedProject.value;
            if (!project) {
                console.warn('[loadFiles] 缺少项目，跳过代码文件加载');
                files.value = [];
                return [];
            }
            const files_url = `${window.API_URL}/mongodb/?cname=projectFiles&projectId=${project}`;
            
            const response = await getData(files_url, {}, false);
            
            let list = [];
            if (response && response.data && Array.isArray(response.data.list)) {
                list = response.data.list;
            } else if (Array.isArray(response)) {
                list = response;
            } else {
                throw createError('代码文件数据格式错误', ErrorTypes.API, '代码文件加载');
            }
            
            // 规范化文件数据，确保与文件树的文件ID可匹配，且包含内容字段
            const normalizedList = (list || []).map((item) => {
                const data = (item && typeof item === 'object' && item.data && typeof item.data === 'object') ? item.data : {};

                const pickFirstString = (...vals) => {
                    for (const v of vals) {
                        if (typeof v === 'string' && v) return v;
                    }
                    return '';
                };

                // 深度提取字符串/数组形式的内容
                const toStringContent = (val) => {
                    if (Array.isArray(val)) return val.map(v => (v == null ? '' : String(v))).join('\n');
                    return (typeof val === 'string') ? val : '';
                };

                const tryKeysDeep = (obj, keys, depth = 0) => {
                    if (!obj || typeof obj !== 'object' || depth > 3) return '';
                    // 先直接命中常见键
                    for (const k of keys) {
                        if (k in obj) {
                            const v = obj[k];
                            const s = toStringContent(v);
                            if (s) return s;
                        }
                    }
                    // 递归遍历有限深度
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

                // 兼容多种可能的内容字段（支持嵌套与数组、base64），优先顶层，再 data，再深层
                const commonKeys = ['content', 'code', 'text', 'source', 'lines', 'raw', 'body', 'value'];
                let content = '';

                // 顶层快速命中
                content = toStringContent(item?.content) || toStringContent(item?.code) || toStringContent(item?.text) || toStringContent(item?.source) || toStringContent(item?.lines) || pickFirstString(item?.raw, item?.body, item?.value);
                // data 层快速命中
                if (!content) {
                    content = toStringContent(data?.content) || toStringContent(data?.code) || toStringContent(data?.text) || toStringContent(data?.source) || toStringContent(data?.lines) || pickFirstString(data?.raw, data?.body, data?.value);
                }
                // 深度兜底（处理 data.data.content 等层级）
                if (!content) {
                    content = tryKeysDeep(item, commonKeys) || tryKeysDeep(data, commonKeys);
                }
                // base64 兜底（任意层）
                if (!content) {
                    const pickBase64 = (obj) => {
                        if (!obj || typeof obj !== 'object') return '';
                        const b64 = obj.contentBase64 || obj.base64 || obj.b64;
                        return typeof b64 === 'string' ? b64 : '';
                    };
                    let b64 = pickBase64(item) || pickBase64(data);
                    if (!b64) {
                        // 深度搜索 base64 键
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

                return {
                    ...item,
                    fileId: preferredId,
                    id: preferredId,
                    path,
                    name,
                    content
                };
            });

            files.value = normalizedList;
            console.log(`[loadFiles] 成功加载 ${normalizedList.length} 个代码文件`);
            
            // 同步所有文件到会话
            if (project && normalizedList.length > 0) {
                try {
                    for (const file of normalizedList) {
                        await sessionSync.syncFileToSession(file, project, false);
                    }
                    console.log(`[loadFiles] 已同步 ${normalizedList.length} 个文件到会话`);
                } catch (syncError) {
                    console.warn('[loadFiles] 同步文件到会话失败（已忽略）:', syncError?.message);
                }
            }
            
            return normalizedList;
        }, '代码文件数据加载', (errorInfo) => {
            error.value = errorInfo.message;
            errorMessage.value = errorInfo.message;
            files.value = [];
        });
    };

    /**
     * 按需加载单个文件（当列表中缺少内容或未找到时使用）
     */
    const loadFileById = async (projectId = null, targetFileId = null, fileKey = null) => {
        return safeExecuteAsync(async () => {
            const project = projectId || selectedProject.value;
            const fileId = targetFileId || selectedFileId.value;
            if (!project || !fileId) return null;

            console.log('[loadFileById] 尝试加载文件:', fileId, '项目:', project, '文件Key:', fileKey);
            
            // 如果有文件Key，优先使用Key进行精确查询
            if (fileKey) {
                console.log('[loadFileById] 使用文件Key进行精确查询:', fileKey);
                const keyUrl = `${window.API_URL}/mongodb/?cname=projectFiles&projectId=${encodeURIComponent(project)}&key=${encodeURIComponent(fileKey)}`;
                console.log('[loadFileById] Key查询URL:', keyUrl);
                
                try {
                    const keyResponse = await getData(keyUrl, {}, false);
                    let keyList = (keyResponse?.data?.list && Array.isArray(keyResponse.data.list)) ? keyResponse.data.list : (Array.isArray(keyResponse) ? keyResponse : []);
                    
                    if (keyList.length > 0) {
                        console.log('[loadFileById] 通过Key查询成功，找到文件数量:', keyList.length);
                        // 验证找到的文件是否匹配目标fileId
                        const matchedByKey = keyList.find(item => {
                            const itemData = (item && typeof item === 'object' && item.data && typeof item.data === 'object') ? item.data : {};
                            const candidates = [item?.fileId, item?.id, item?.path, item?.name, itemData?.fileId, itemData?.id, itemData?.path, itemData?.name].filter(Boolean);
                            
                            // 检查是否与目标fileId匹配
                            const normalizeId = (v) => String(v || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/\/+/g, '/');
                            const targetNorm = normalizeId(fileId);
                            
                            return candidates.some(c => {
                                const n = normalizeId(c);
                                return n === targetNorm;
                            });
                        });
                        
                        if (matchedByKey) {
                            console.log('[loadFileById] Key查询找到匹配的文件:', matchedByKey.name || matchedByKey.id);
                            // 处理找到的文件
                            const processedFile = await processFileItem(matchedByKey);
                            return processedFile;
                        } else {
                            console.log('[loadFileById] Key查询找到文件但路径不匹配，继续使用fileId查询');
                        }
                    }
                } catch (error) {
                    console.warn('[loadFileById] Key查询失败，回退到fileId查询:', error);
                }
            }
            
            // 使用fileId进行查询（原有逻辑）
            const url = `${window.API_URL}/mongodb/?cname=projectFiles&projectId=${encodeURIComponent(project)}&fileId=${encodeURIComponent(fileId)}`;
            console.log('[loadFileById] 请求URL:', url);
            const response = await getData(url, {}, false);
            let list = (response?.data?.list && Array.isArray(response.data.list)) ? response.data.list : (Array.isArray(response) ? response : []);
            console.log('[loadFileById] 精确查询结果数量:', list.length);
            
            // 若精确查询无结果，退化为全量加载后本地匹配
            if (!list.length) {
                console.log('[loadFileById] 精确查询无结果，尝试全量加载后匹配');
                console.log('[loadFileById] 原始fileId:', fileId);
                console.log('[loadFileById] 编码后的fileId:', encodeURIComponent(fileId));
                try {
                    await loadFiles(project);
                    console.log('[loadFileById] 全量加载完成，文件总数:', files.value?.length || 0);
                    
                    // 优先使用Key进行精确匹配
                    if (fileKey) {
                        const matchedByKey = (files.value || []).find(f => {
                            if (f.key === fileKey || f._id === fileKey) {
                                console.log('[loadFileById] 全量加载后通过Key精确匹配成功:', f.name);
                                return true;
                            }
                            return false;
                        });
                        
                        if (matchedByKey) {
                            list = [matchedByKey];
                        }
                    }
                    
                    // 如果Key匹配失败，使用路径匹配作为后备
                    if (!list.length) {
                        const normalizeId = (v) => String(v || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/\/+/g, '/');
                        const targetNorm = normalizeId(fileId);
                        const matched = (files.value || []).find(f => {
                            const d = (f && typeof f === 'object' && f.data && typeof f.data === 'object') ? f.data : {};
                            const candidates = [f?.fileId, f?.id, f?.path, f?.name, d?.fileId, d?.id, d?.path, d?.name].filter(Boolean).map(normalizeId);
                            
                            // 简化的匹配逻辑：优先完全匹配，然后路径匹配
                            return candidates.some(c => {
                                // 完全匹配
                                if (c === targetNorm) {
                                    console.log('[loadFileById] 完全匹配成功:', c, '===', targetNorm);
                                    return true;
                                }
                                
                                // 路径匹配：检查是否是父子路径关系
                                if (c.endsWith('/' + targetNorm) && targetNorm && targetNorm.length > 0) {
                                    console.log('[loadFileById] 路径结尾匹配成功:', c, '<->', targetNorm);
                                    return true;
                                }
                                
                                if (targetNorm.endsWith('/' + c) && c && c.length > 0) {
                                    console.log('[loadFileById] 路径开头匹配成功:', c, '<->', targetNorm);
                                    return true;
                                }
                                
                                // 文件名匹配：检查文件名是否相同
                                const cName = c.split('/').pop();
                                const targetName = targetNorm.split('/').pop();
                                if (cName && targetName && cName === targetName) {
                                    console.log('[loadFileById] 文件名匹配成功:', cName, '===', targetName);
                                    return true;
                                }
                                
                                return false;
                            });
                        });
                        if (matched) {
                            list = [matched];
                        }
                    }
                } catch (_) {}
            }
            
            if (!list.length) return null;

            // 处理找到的文件
            const item = list[0];
            return await processFileItem(item);
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
        return {
            ...comment,
            // 统一的消息字段
            type: type,
            content: content,
            timestamp: timestamp,
            // 兼容字段（保持与 content 和 timestamp 一致）
            text: content, // content 和 text 保持一致
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
                let url = `${window.API_URL}/mongodb/?cname=comments`;
                url += `&projectId=${project}`;
                
                // 如果有当前选中的文件，也添加到参数中
                if (selectedFileId.value) {
                    url += `&fileId=${selectedFileId.value}`;
                }
                
                console.log('[loadComments] 调用MongoDB接口:', url);
                // 禁用本地缓存，确保评论列表总是从服务端获取最新数据
                const response = await getData(url, {}, false);
                
                if (response && response.data && response.data.list) {
                    // 规范化评论数据，确保字段一致性
                    comments.value = response.data.list.map(comment => normalizeComment(comment));
                    console.log(`[loadComments] 成功加载 ${comments.value.length} 条评论`);
                    console.log('[loadComments] 评论数据详情:', comments.value);
                    
                    // 同步评论到会话消息
                    if (project && comments.value.length > 0) {
                        try {
                            // 按文件分组评论
                            const commentsByFile = new Map();
                            for (const comment of comments.value) {
                                const fileId = comment.fileId || (comment.fileInfo && comment.fileInfo.fileId);
                                if (fileId) {
                                    if (!commentsByFile.has(fileId)) {
                                        commentsByFile.set(fileId, []);
                                    }
                                    commentsByFile.get(fileId).push(comment);
                                }
                            }
                            
                            // 为每个文件的评论同步到会话消息（使用规范化后的评论）
                            for (const [fileId, fileComments] of commentsByFile.entries()) {
                                for (const comment of fileComments) {
                                    const normalizedComment = normalizeComment(comment);
                                    await sessionSync.syncCommentToMessage(normalizedComment, fileId, project, false);
                                }
                            }
                            console.log(`[loadComments] 已同步 ${comments.value.length} 条评论到会话消息`);
                        } catch (syncError) {
                            console.warn('[loadComments] 同步评论到会话消息失败（已忽略）:', syncError?.message);
                        }
                    }
                    
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
                let url = `${window.API_URL}/mongodb/?cname=commenters`;
                url += `&projectId=${project}`;
                
                console.log('[loadCommenters] 调用MongoDB接口:', url);
                const response = await getData(url);
                
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
            let url = `${window.API_URL}/mongodb/?cname=commenters`;
            
            // 构建请求数据
            const requestData = {
                ...commenterData,
                projectId: project
            };
            
            console.log('[addCommenter] 调用MongoDB接口:', url, requestData);
            
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
                console.log('[addCommenter] 完整请求URL:', url);
                
                // 使用POST方法添加评论者
                const response = await postData(url, requestData);
                
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
            let url = `${window.API_URL}/mongodb/?cname=commenters`;
            
            console.log('[updateCommenter] 调用MongoDB接口:', url);
            
            try {
                // 使用PUT方法更新评论者
                const response = await updateData(url, {
                  ...commenterData,
                  key: commenterKey,
                  projectId: project
                });
                
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
            
            // 构建删除URL
            let url = `${window.API_URL}/mongodb/?cname=commenters&key=${commenterKey}`;
            
            console.log('[deleteCommenter] 调用MongoDB接口:', url);
            
            try {
                // 使用DELETE方法删除评论者
                const response = await deleteData(url);
                
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
     * 统一的文件ID规范化函数
     * @param {string} fileId - 文件ID
     * @returns {string} 规范化后的文件ID
     */
    const normalizeFileId = (fileId) => {
        try {
            if (fileId == null) return '';
            let s = String(fileId);
            s = s.replace(/\\\\/g, '/'); // Windows路径转正斜杠
            s = s.replace(/^\.\//, '');   // 去掉开头的./
            s = s.replace(/^\/+/, '');     // 去掉多余的起始/
            s = s.replace(/\/\/+/g, '/');  // 合并重复的/
            return s;
        } catch (e) {
            return String(fileId);
        }
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
            console.log('[loadProjects] 正在加载项目列表...');
            let url = `${window.API_URL}/mongodb/?cname=projects`;
            const response = await getData(url, {}, false);   
            if (response && response.data && response.data.list) {
                projects.value = response.data.list;
                return response.data.list;
            } else {
                return [];
            }
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
        
        // 项目管理
        projects,
        selectedProject,
        // UI：项目管理
        showPvManager,
        pvProjects,
        pvSelectedProjectId,
        pvNewProjectId,
        pvNewProjectName,
        pvError,
        
        // 搜索相关状态
        searchQuery,
        newComment,
        
        // 评论者相关状态
        commenters,
        selectedCommenterIds,
        commentersLoading,
        commentersError,
        
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
        clearError
    };
};













