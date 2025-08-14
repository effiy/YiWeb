/**
 * 代码审查页面数据存储管理
 * author: liangliang
 */

import { getData, postData, deleteData, updateData } from '/apis/index.js';
import { safeExecuteAsync, createError, ErrorTypes } from '/utils/error.js';

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
    
    // 重构后的项目/版本管理 - 一个项目对应多个版本
    const projects = vueRef([]); // 存储项目列表，每个项目包含versions数组
    const selectedProject = vueRef('');
    const selectedVersion = vueRef('');
    const availableVersions = vueRef([]); // 当前选中项目的版本列表
    
    // UI：项目/版本维护弹框与表单
    const showPvManager = vueRef(false);
    const pvProjects = vueRef([]);
    const pvSelectedProjectId = vueRef('');
    const pvNewProjectId = vueRef('');
    const pvNewProjectName = vueRef('');
    const pvNewVersionId = vueRef('');
    const pvNewVersionName = vueRef('');
    const pvDirty = vueRef(false);
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

    /**
     * 异步加载文件树数据
     */
    const loadFileTree = async (projectId = null, versionId = null) => {
        return safeExecuteAsync(async () => {
            loading.value = true;
            error.value = null;
            errorMessage.value = '';
            
            console.log('[loadFileTree] 正在加载文件树数据...', { projectId, versionId });
            
            // 需要明确的项目与版本
            const project = projectId || selectedProject.value;
            const version = versionId || selectedVersion.value;
            if (!project || !version) {
                console.warn('[loadFileTree] 缺少项目/版本，跳过文件树加载');
                fileTree.value = [];
                fileTreeDocKey.value = '';
                return [];
            }
            const tree_url = `${window.API_URL}/mongodb/?cname=projectVersionTree&projectId=${project}&versionId=${version}`;
            
            const response = await getData(tree_url);

            // 检查响应结构和数据有效性
            if (
                !response ||
                typeof response !== 'object' ||
                !response.data ||
                !Array.isArray(response.data.list) ||
                response.data.list.length === 0
            ) {
                throw createError('文件树数据格式错误或无数据', ErrorTypes.API, '文件树加载');
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
            fileTree.value = [rootNode]; 
            // 保存文档key用于后续更新
            fileTreeDocKey.value = treeDoc.key || treeDoc._id || treeDoc.id || '';
            console.log(`[loadFileTree] 成功加载文件树数据`);

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
    const persistFileTree = async (projectId = null, versionId = null) => {
        return safeExecuteAsync(async () => {
            const project = projectId || selectedProject.value;
            const version = versionId || selectedVersion.value;
            if (!fileTreeDocKey.value) {
                throw createError('缺少文件树文档key，无法持久化', ErrorTypes.API, '文件树保存');
            }
            const payload = {
                key: fileTreeDocKey.value,
                projectId: project,
                versionId: version,
                data: Array.isArray(fileTree.value) ? fileTree.value[0] : fileTree.value
            };
            const url = `${window.API_URL}/mongodb/?cname=projectVersionTree`;
            const res = await updateData(url, payload);
            return res;
        }, '文件树持久化');
    };

    /**
     * 创建文件夹
     */
    const createFolder = async ({ parentId, name, projectId = null, versionId = null }) => {
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
            // 保持全部展开
            expandAllFolders();

            await persistFileTree(projectId, versionId);
            return newId;
        }, '创建文件夹');
    };

    /**
     * 创建文件
     */
    const createFile = async ({ parentId, name, content = '', projectId = null, versionId = null }) => {
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
            // 保持全部展开
            expandAllFolders();

            // 先持久化树
            await persistFileTree(projectId, versionId);

            // 在文件集合中新增占位（远端与本地）
            let createdKey = null;
            try {
                const filesUrl = `${window.API_URL}/mongodb/?cname=projectVersionFiles`;
                const createResult = await postData(filesUrl, {
                    projectId: projectId || selectedProject.value,
                    versionId: versionId || selectedVersion.value,
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
            if (Array.isArray(files.value)) {
                files.value.push({ fileId: newId, id: newId, path: newId, name, content, key: createdKey });
            }
            return newId;
        }, '创建文件');
    };

    /**
     * 重命名节点
     */
    const renameItem = async ({ itemId, newName, projectId = null, versionId = null }) => {
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

            await persistFileTree(projectId, versionId);

            // 同步远端文件集合
            try {
                const filesUrl = `${window.API_URL}/mongodb/?cname=projectVersionFiles`;
                const affected = prevFiles.filter(f => {
                    const ids = [f.fileId, f.id, f.path].filter(Boolean);
                    return ids.some(v => String(v) === oldId || String(v).startsWith(oldId + '/'));
                });
                for (const f of affected) {
                    const oldPath = String(f.path || f.id || f.fileId);
                    const newPath = oldPath.replace(oldId, newId);
                    const key = f.key || f._id || f.idKey;
                    if (key) {
                        await updateData(filesUrl, { key, projectId: projectId || selectedProject.value, versionId: versionId || selectedVersion.value, fileId: newPath, id: newPath, path: newPath, name: newPath.split('/').pop(), content: f.content || (f.data && f.data.content) || '' });
                    } else {
                        // 无 key 时，尝试新增并删除旧文档
                        await postData(filesUrl, { projectId: projectId || selectedProject.value, versionId: versionId || selectedVersion.value, fileId: newPath, id: newPath, path: newPath, name: newPath.split('/').pop(), content: f.content || (f.data && f.data.content) || '' });
                        try { await deleteData(`${filesUrl}&fileId=${encodeURIComponent(oldPath)}`); } catch (e) {}
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
    const deleteItem = async ({ itemId, projectId = null, versionId = null }) => {
        return safeExecuteAsync(async () => {
            if (!itemId) throw createError('缺少目标ID', ErrorTypes.VALIDATION, '删除');
            const root = Array.isArray(fileTree.value) ? fileTree.value[0] : fileTree.value;
            const { node, parent } = findNodeAndParentById(root, itemId);
            if (!node) throw createError('未找到目标节点', ErrorTypes.API, '删除');
            if (!parent) {
                throw createError('不允许删除根节点', ErrorTypes.VALIDATION, '删除');
            }
            const prevFiles = Array.isArray(files.value) ? files.value.slice() : [];
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

            await persistFileTree(projectId, versionId);

            // 远端删除受影响文件
            try {
                const filesUrl = `${window.API_URL}/mongodb/?cname=projectVersionFiles`;
                const affected = prevFiles.filter(f => {
                    const ids = [f.fileId, f.id, f.path].filter(Boolean);
                    return ids.some(v => String(v) === itemId || String(v).startsWith(itemId + '/'));
                });
                for (const f of affected) {
                    if (f && (f.key || f._id)) {
                        const key = f.key || f._id;
                        await deleteData(`${filesUrl}&key=${key}`);
                    } else {
                        const path = String(f.path || f.id || f.fileId);
                        try { await deleteData(`${filesUrl}&fileId=${encodeURIComponent(path)}`); } catch (e) {}
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
    const loadFiles = async (projectId = null, versionId = null) => {
        return safeExecuteAsync(async () => {
            console.log('[loadFiles] 正在加载代码文件数据...', { projectId, versionId });
            
            // 需要明确的项目与版本
            const project = projectId || selectedProject.value;
            const version = versionId || selectedVersion.value;
            if (!project || !version) {
                console.warn('[loadFiles] 缺少项目/版本，跳过代码文件加载');
                files.value = [];
                return [];
            }
            const files_url = `${window.API_URL}/mongodb/?cname=projectVersionFiles&projectId=${project}&versionId=${version}`;
            
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
    const loadFileById = async (projectId = null, versionId = null, targetFileId = null) => {
        return safeExecuteAsync(async () => {
            const project = projectId || selectedProject.value;
            const version = versionId || selectedVersion.value;
            const fileId = targetFileId || selectedFileId.value;
            if (!project || !version || !fileId) return null;

            console.log('[loadFileById] 尝试加载文件:', fileId, '项目:', project, '版本:', version);
            const url = `${window.API_URL}/mongodb/?cname=projectVersionFiles&projectId=${encodeURIComponent(project)}&versionId=${encodeURIComponent(version)}&fileId=${encodeURIComponent(fileId)}`;
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
                    await loadFiles(project, version);
                    console.log('[loadFileById] 全量加载完成，文件总数:', files.value?.length || 0);
                    const normalizeId = (v) => String(v || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/\/+/g, '/');
                    const targetNorm = normalizeId(fileId);
                    const matched = (files.value || []).find(f => {
                        const d = (f && typeof f === 'object' && f.data && typeof f.data === 'object') ? f.data : {};
                        const candidates = [f?.fileId, f?.id, f?.path, f?.name, d?.fileId, d?.id, d?.path, d?.name].filter(Boolean).map(normalizeId);
                        const isMatch = candidates.some(c => {
                            // 完全匹配
                            if (c === targetNorm) {
                                console.log('[loadFileById] 完全匹配成功:', c, '===', targetNorm);
                                return true;
                            }
                            // 路径结尾匹配  
                            if (c.endsWith('/' + targetNorm) || targetNorm.endsWith('/' + c)) {
                                console.log('[loadFileById] 路径结尾匹配成功:', c, '<->', targetNorm);
                                return true;
                            }
                            // 文件名匹配（去除路径）
                            const cName = c.split('/').pop();
                            const targetName = targetNorm.split('/').pop();
                            if (cName && targetName && cName === targetName) {
                                console.log('[loadFileById] 文件名匹配成功:', cName, '===', targetName);
                                return true;
                            }
                            return false;
                        });
                        if (!isMatch && candidates.length > 0) {
                            console.log('[loadFileById] 未匹配，候选项:', candidates.join(', '), '目标:', targetNorm);
                        }
                        return isMatch;
                    });
                    if (matched) {
                        list = [matched];
                    }
                } catch (_) {}
            }
            if (!list.length) return null;

            // 复用 loadFiles 的归一化逻辑，对单个元素处理
            const item = list[0];
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

            const normalized = { ...item, fileId: preferredId, id: preferredId, path, name, content };

            // 合并/去重更新到 files 列表（使用等值或 endsWith 规则匹配）
            if (!Array.isArray(files.value)) files.value = [];
            const normalizeId = (v) => String(v || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/\/+/g, '/');
            const targetNorm = normalizeId(identifier || fileId);
            const matches = (f) => {
                const d = (f && typeof f === 'object' && f.data && typeof f.data === 'object') ? f.data : {};
                const candidates = [f?.fileId, f?.id, f?.path, f?.name, d?.fileId, d?.id, d?.path, d?.name].filter(Boolean).map(normalizeId);
                return candidates.some(c => {
                    // 完全匹配
                    if (c === targetNorm) return true;
                    // 路径结尾匹配
                    if (c.endsWith('/' + targetNorm) || targetNorm.endsWith('/' + c)) return true;
                    // 文件名匹配（去除路径）
                    const cName = c.split('/').pop();
                    const targetName = targetNorm.split('/').pop();
                    if (cName && targetName && cName === targetName) return true;
                    return false;
                });
            };
            // 删除旧的匹配项，插入标准化后的最新项，避免 find 命中旧的无内容项
            const remaining = files.value.filter(f => !matches(f));
            remaining.push(normalized);
            files.value = remaining;

            return normalized;
        }, '按需加载单个文件');
    };

    /**
     * 异步加载评论数据
     */
    const loadComments = async (projectId = null, versionId = null) => {
        return safeExecuteAsync(async () => {
            console.log('[loadComments] 正在加载评论数据...', { projectId, versionId });
            
            // 检查是否有项目/版本信息
            const project = projectId || selectedProject.value;
            const version = versionId || selectedVersion.value;
            
            if (!project || !version) {
                console.log('[loadComments] 项目/版本信息不完整，跳过评论加载');
                comments.value = [];
                return [];
            }
            
            console.log('[loadComments] 项目/版本信息完整，开始加载评论');
            
            try {
                // 调用MongoDB接口获取评论数据
                let url = `${window.API_URL}/mongodb/?cname=comments`;
                url += `&projectId=${project}`;
                url += `&versionId=${version}`;
                
                // 如果有当前选中的文件，也添加到参数中
                if (selectedFileId.value) {
                    url += `&fileId=${selectedFileId.value}`;
                }
                
                console.log('[loadComments] 调用MongoDB接口:', url);
                // 禁用本地缓存，确保评论列表总是从服务端获取最新数据
                const response = await getData(url, {}, false);
                
                if (response && response.data && response.data.list) {
                    comments.value = response.data.list;
                    console.log(`[loadComments] 成功加载 ${comments.value.length} 条评论`);
                    console.log('[loadComments] 评论数据详情:', comments.value);
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
            }
        }, '评论数据加载', (errorInfo) => {
            error.value = errorInfo.message;
            errorMessage.value = errorInfo.message;
            comments.value = [];
        });
    };

    /**
     * 异步加载评论者数据
     */
    const loadCommenters = async (projectId = null, versionId = null) => {
        return safeExecuteAsync(async () => {
            // 防止重复加载
            if (commentersLoading.value) {
                console.log('[loadCommenters] 评论者数据正在加载中，跳过重复请求');
                return commenters.value;
            }
            
            commentersLoading.value = true;
            commentersError.value = '';
            
            console.log('[loadCommenters] 正在加载评论者数据...', { projectId, versionId });
            
            // 检查是否有项目/版本信息
            const project = projectId || selectedProject.value;
            const version = versionId || selectedVersion.value;
            
            if (!project || !version) {
                console.log('[loadCommenters] 项目/版本信息不完整，跳过评论者加载');
                commenters.value = [];
                return [];
            }
            
            console.log('[loadCommenters] 项目/版本信息完整，开始加载评论者');
            
            try {
                let url = `${window.API_URL}/mongodb/?cname=commenters`;
                url += `&projectId=${project}`;
                url += `&versionId=${version}`;
                
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
    const addCommenter = async (commenterData, projectId = null, versionId = null) => {
        return safeExecuteAsync(async () => {
            console.log('[addCommenter] 正在添加评论者...', { commenterData, projectId, versionId });
            
            // 检查是否有项目/版本信息
            const project = projectId || selectedProject.value;
            const version = versionId || selectedVersion.value;
            
            if (!project || !version) {
                throw new Error('项目/版本信息不完整，无法添加评论者');
            }
            
            // 构建添加URL
            let url = `${window.API_URL}/mongodb/?cname=commenters`;
            
            // 构建请求数据
            const requestData = {
                ...commenterData,
                projectId: project,
                versionId: version
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
                    await loadCommenters(project, version);
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
    const updateCommenter = async (commenterKey, commenterData, projectId = null, versionId = null) => {
        return safeExecuteAsync(async () => {
            console.log('[updateCommenter] 正在更新评论者...', { commenterKey, commenterData, projectId, versionId });
            
            // 检查是否有项目/版本信息
            const project = projectId || selectedProject.value;
            const version = versionId || selectedVersion.value;
            
            if (!project || !version) {
                throw new Error('项目/版本信息不完整，无法更新评论者');
            }
            
            // 构建更新URL
            let url = `${window.API_URL}/mongodb/?cname=commenters`;
            
            console.log('[updateCommenter] 调用MongoDB接口:', url);
            
            try {
                // 使用PUT方法更新评论者
                const response = await updateData(url, {
                  ...commenterData,
                  key: commenterKey,
                  projectId: project,
                  versionId: version
                });
                
                console.log('[updateCommenter] 更新响应:', response);
                
                if (response && response.status === 200) {
                    console.log('[updateCommenter] 评论者更新成功');
                    // 重新加载评论者列表
                    await loadCommenters(project, version);
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
    const deleteCommenter = async (commenterKey, projectId = null, versionId = null) => {
        return safeExecuteAsync(async () => {
            console.log('[deleteCommenter] 正在删除评论者...', { commenterKey, projectId, versionId });
            
            // 验证评论者key
            if (!commenterKey) {
                throw new Error('评论者key不能为空');
            }
            
            // 检查是否有项目/版本信息
            const project = projectId || selectedProject.value;
            const version = versionId || selectedVersion.value;
            
            if (!project || !version) {
                throw new Error('项目/版本信息不完整，无法删除评论者');
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
                    await loadCommenters(project, version);
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
     * 设置选中的文件ID
     * @param {string} fileId - 文件ID
     */
    const setSelectedFileId = (fileId) => {
        if (fileId === null) {
            selectedFileId.value = null;
            return;
        }
        // 统一为字符串并规范路径，提升匹配成功率
        const toNormalizedId = (v) => {
            try {
                if (v == null) return '';
                let s = String(v);
                s = s.replace(/\\/g, '/'); // Windows路径转正斜杠
                s = s.replace(/^\.\//, '');   // 去掉开头的./
                s = s.replace(/^\/+/, '');     // 去掉多余的起始/
                s = s.replace(/\/\/+/g, '/');  // 合并重复的/
                return s;
            } catch (e) {
                return String(v);
            }
        };
        selectedFileId.value = toNormalizedId(fileId);
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
            selectedVersion.value = '';
            availableVersions.value = [];
        } else {
            availableVersions.value = getVersionsByProject(selectedProject.value);
        }
    };

    /**
     * 加载项目列表（重构后包含版本信息）
     */
    const loadProjects = async () => {
        return safeExecuteAsync(async () => {
            console.log('[loadProjects] 正在加载项目列表...');
            let url = `${window.API_URL}/mongodb/?cname=projectVersions`;
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
     * 根据项目ID获取版本列表（重构后的方法）
     */
    const getVersionsByProject = (projectId) => {
        const project = projects.value.find(p => p.id === projectId);
        // 统一输出为版本ID数组
        const versions = project ? project.versions : [];
        return Array.isArray(versions) ? versions.map(v => (typeof v === 'string' ? v : v.id)).filter(Boolean) : [];
    };

    /**
     * 设置选中的项目
     */
    const setSelectedProject = (projectId) => {
        selectedProject.value = projectId;
        selectedVersion.value = ''; // 清空版本选择
        
        // 根据选中的项目更新可用版本列表
        if (projectId) {
            const versions = getVersionsByProject(projectId);
            // 仅保留版本ID列表
            availableVersions.value = (versions || []).map(v => (typeof v === 'string' ? v : v.id)).filter(Boolean);
            console.log(`[setSelectedProject] 项目 ${projectId} 的版本列表(IDs):`, availableVersions.value);
        } else {
            availableVersions.value = [];
        }
    };

    /**
     * 设置选中的版本
     */
    const setSelectedVersion = (versionId) => {
        selectedVersion.value = versionId;
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
        if (!selectedProject.value || !selectedVersion.value) {
            console.warn('[refreshData] 请先选择项目和版本');
            return;
        }
        
        console.log('[refreshData] 正在刷新数据...', { 
            project: selectedProject.value, 
            version: selectedVersion.value 
        });
        
        try {
            await Promise.all([
                loadFileTree(selectedProject.value, selectedVersion.value),
                loadFiles(selectedProject.value, selectedVersion.value),
                loadComments(selectedProject.value, selectedVersion.value),
                loadCommenters(selectedProject.value, selectedVersion.value)
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
        
        // 重构后的项目/版本管理
        projects,
        selectedProject,
        selectedVersion,
        availableVersions,
        // UI：PV管理
        showPvManager,
        pvProjects,
        pvSelectedProjectId,
        pvNewProjectId,
        pvNewProjectName,
        pvNewVersionId,
        pvNewVersionName,
        pvDirty,
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
        loadComments,
        loadCommenters,
        addCommenter,
        updateCommenter,
        deleteCommenter,
        setSelectedCommenterIds,
        setSelectedFileId,
        toggleFolder,
        addComment,
        toggleSidebar,
        toggleComments,
        loadProjects,
        setProjects,
        getVersionsByProject, // 新增方法
        setSelectedProject,
        setSelectedVersion,
        setNewComment,
        refreshData,
        clearError
    };
};










