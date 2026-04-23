/**
 * 文件树创建操作模块
 * 负责文件和文件夹的创建
 * author: Claude
 */

/**
 * 查找节点和父节点
 * @param {Array|Object} rootNodes - 根节点
 * @param {string} targetKey - 目标Key
 * @returns {Object} 节点和父节点
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
 * 规范化项目名称
 * @param {*} raw - 原始名称
 * @returns {string} 规范化后的名称
 */
function normalizeItemName(raw) {
    return String(raw ?? '').trim().replace(/\s+/g, '_');
}

/**
 * 排序文件树项目
 * @param {Array} items - 项目列表
 * @returns {Array} 排序后的列表
 */
function sortFileTreeItems(items) {
    if (!Array.isArray(items)) return items;

    return items.sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') {
            return -1;
        }
        if (a.type !== 'folder' && b.type === 'folder') {
            return 1;
        }

        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB, 'zh-CN');
    });
}

/**
 * 创建文件树创建操作
 * @param {Object} deps - 依赖项
 * @param {Function} deps.safeExecuteAsync - 异步安全执行函数
 * @param {Function} deps.createError - 创建错误函数
 * @param {Object} deps.ErrorTypes - 错误类型
 * @param {Function} deps.normalizeFilePath - 路径规范化函数
 * @param {Function} deps.normalizeFileObject - 文件对象规范化函数
 * @param {Function} deps.normalizeTreeNode - 树节点规范化函数
 * @param {Function} deps.saveFileContent - 保存文件内容函数
 * @param {Object} state - 状态对象
 * @param {Object} internals - 内部状态
 * @param {Function} extra.loadSessions - 加载会话函数
 * @returns {Object} 创建操作方法
 */
export function createFileTreeCreateOps(deps, state, internals, extra) {
    const {
        safeExecuteAsync,
        createError,
        ErrorTypes,
        normalizeFilePath,
        normalizeFileObject,
        normalizeTreeNode,
        saveFileContent
    } = deps;
    const { loadSessions } = extra;

    /**
     * 创建文件夹
     * @param {Object} options - 选项
     * @param {string} options.parentId - 父级ID
     * @param {string} options.name - 文件夹名称
     * @returns {Promise<string>} 新文件夹ID
     */
    const createFolder = async ({ parentId, name }) => {
        return safeExecuteAsync(async () => {
            const normalizedName = normalizeItemName(name);
            if (!normalizedName) {
                throw createError('文件夹名称不能为空', ErrorTypes.VALIDATION, '新建文件夹');
            }
            const root = state.fileTree.value;
            if (!root) throw createError('文件树未加载', ErrorTypes.API, '新建文件夹');

            let parentNode = null;
            let targetChildren = null;

            if (!parentId) {
                if (Array.isArray(root)) {
                    targetChildren = root;
                } else {
                    parentNode = root;
                    if (parentNode.type !== 'folder') throw createError('根节点无效', ErrorTypes.VALIDATION, '新建文件夹');
                    targetChildren = parentNode.children = parentNode.children || [];
                }
            } else {
                const result = findNodeAndParentByKey(root, parentId);
                parentNode = result.node;
                if (!parentNode || parentNode.type !== 'folder') {
                    throw createError('父级目录无效', ErrorTypes.VALIDATION, '新建文件夹');
                }
                targetChildren = parentNode.children = parentNode.children || [];
            }

            const exists = targetChildren.find(ch => normalizeItemName(ch?.name) === normalizedName);
            if (exists) throw createError('同名文件或文件夹已存在', ErrorTypes.VALIDATION, '新建文件夹');

            const parentKey = parentNode ? parentNode.key : '';
            const newId = (parentKey ? `${parentKey}/` : '') + normalizedName;
            const folderNode = normalizeTreeNode({
                key: newId,
                name: normalizedName,
                type: 'folder',
                children: []
            });
            if (folderNode) {
                targetChildren.push(folderNode);
            }

            const sorted = sortFileTreeItems(targetChildren);
            if (parentNode) {
                parentNode.children = sorted;
            } else if (Array.isArray(root)) {
                state.fileTree.value = sorted;
            }

            // 使用现有方法展开所有文件夹
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
                collect(state.fileTree.value);
                state.expandedFolders.value = all;
            };
            expandAllFolders();

            return newId;
        }, '创建文件夹');
    };

    /**
     * 创建文件
     * @param {Object} options - 选项
     * @param {string} options.parentId - 父级ID
     * @param {string} options.name - 文件名称
     * @param {string} options.content - 文件内容
     * @returns {Promise<string>} 新文件ID
     */
    const createFile = async ({ parentId, name, content = '' }) => {
        return safeExecuteAsync(async () => {
            const normalizedName = normalizeItemName(name);
            if (!normalizedName) {
                throw createError('文件名称不能为空', ErrorTypes.VALIDATION, '新建文件');
            }
            const root = state.fileTree.value;
            if (!root) throw createError('文件树未加载', ErrorTypes.API, '新建文件');

            let parentNode = null;
            let targetChildren = null;

            if (!parentId) {
                if (Array.isArray(root)) {
                    targetChildren = root;
                } else {
                    parentNode = root;
                    if (parentNode.type !== 'folder') throw createError('根节点无效', ErrorTypes.VALIDATION, '新建文件');
                    targetChildren = parentNode.children = parentNode.children || [];
                }
            } else {
                const result = findNodeAndParentByKey(root, parentId);
                parentNode = result.node;
                if (!parentNode || parentNode.type !== 'folder') {
                    throw createError('父级目录无效', ErrorTypes.VALIDATION, '新建文件');
                }
                targetChildren = parentNode.children = parentNode.children || [];
            }

            if (targetChildren.find(ch => normalizeItemName(ch?.name) === normalizedName)) {
                throw createError('同名文件或文件夹已存在', ErrorTypes.VALIDATION, '新建文件');
            }

            const parentPath = parentNode ? normalizeFilePath(parentNode.key || '') : '';
            const newId = parentPath ? `${parentPath}/${normalizedName}` : normalizedName;
            const normalizedNewId = normalizeFilePath(newId);
            const now = Date.now();

            const fileNode = normalizeTreeNode({
                name: normalizedName,
                type: 'file',
                size: content ? content.length : 0,
                modified: now,
                content: content || ''
            });

            if (fileNode) {
                targetChildren.push(fileNode);
            }

            const sorted = sortFileTreeItems(targetChildren);
            if (parentNode) {
                parentNode.children = sorted;
            } else if (Array.isArray(root)) {
                state.fileTree.value = sorted;
            }

            // 展开所有文件夹
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
                            if (n.children) collect(nodes.children);
                        }
                    });
                };
                collect(state.fileTree.value);
                state.expandedFolders.value = all;
            };
            expandAllFolders();

            try {
                if (typeof saveFileContent !== 'function') {
                    throw new Error('保存能力不可用');
                }
                await saveFileContent(normalizedNewId, content || '', { isBase64: false });
                console.log('[createFile] 文件已通过 write-file 创建:', normalizedNewId);
            } catch (writeError) {
                console.warn('[createFile] 通过 write-file 创建文件失败（已忽略）:', writeError?.message);
            }

            const newFile = normalizeFileObject({
                path: normalizedNewId,
                name: normalizedName,
                content,
                type: 'file'
            });

            if (newFile && Array.isArray(state.files.value)) {
                state.files.value.push(newFile);
            }

            try {
                if (newFile) {
                    await internals.sessionSync.syncFileToSession(newFile, true, true);
                    console.log('[createFile] 文件已同步到会话:', normalizedNewId);
                }
            } catch (syncError) {
                console.warn('[createFile] 同步文件到会话失败（已忽略）:', syncError?.message);
            }

            try {
                await loadSessions(true);
                // 注意：这里不能直接调用 loadFileTree，因为会造成循环依赖
                console.log('[createFile] 文件树需要刷新');
            } catch (refreshError) {
                console.warn('[createFile] 刷新文件树失败（已忽略）:', refreshError?.message);
            }

            return normalizedNewId;
        }, '创建文件');
    };

    return {
        createFolder,
        createFile,
        // 导出辅助函数供其他模块使用
        findNodeAndParentByKey,
        normalizeItemName,
        sortFileTreeItems
    };
}
