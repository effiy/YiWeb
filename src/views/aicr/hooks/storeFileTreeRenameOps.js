/**
 * 文件树重命名操作模块
 * 负责文件和文件夹的重命名
 * author: Claude
 */

/**
 * 创建文件树重命名操作
 * @param {Object} deps - 依赖项
 * @param {Function} deps.safeExecuteAsync - 异步安全执行函数
 * @param {Function} deps.createError - 创建错误函数
 * @param {Object} deps.ErrorTypes - 错误类型
 * @param {Function} deps.normalizeFilePath - 路径规范化函数
 * @param {Function} deps.normalizeFileObject - 文件对象规范化函数
 * @param {Function} deps.getFileDeleteService - 获取文件删除服务函数
 * @param {Object} state - 状态对象
 * @param {Object} internals - 内部状态
 * @param {Function} extra.loadSessions - 加载会话函数
 * @returns {Object} 重命名操作方法
 */
export function createFileTreeRenameOps(deps, state, internals, extra) {
    const {
        safeExecuteAsync,
        createError,
        ErrorTypes,
        normalizeFilePath,
        normalizeFileObject,
        getFileDeleteService
    } = deps;
    const { loadSessions } = extra;

    // 导入需要的辅助函数
    let findNodeAndParentByKey = null;
    let normalizeItemName = null;
    let sortFileTreeItems = null;

    // 提供设置辅助函数的方法
    const setHelpers = (helpers) => {
        findNodeAndParentByKey = helpers.findNodeAndParentByKey;
        normalizeItemName = helpers.normalizeItemName;
        sortFileTreeItems = helpers.sortFileTreeItems;
    };

    /**
     * 递归更新节点Key
     * @param {Object} n - 节点
     * @param {string} fromPrefix - 原前缀
     * @param {string} toPrefix - 新前缀
     */
    const updateKeysRecursively = (n, fromPrefix, toPrefix) => {
        if (n.key && typeof n.key === 'string') {
            if (n.key === fromPrefix) {
                n.key = toPrefix;
                n.path = toPrefix;
            } else if (n.key.startsWith(fromPrefix + '/')) {
                const suffix = n.key.substring(fromPrefix.length);
                const newChildId = toPrefix + suffix;
                n.key = newChildId;
                n.path = newChildId;
            }
        } else {
            if (!n.path) {
                n.path = n.key || '';
            }
        }
        if (n.type === 'folder' && Array.isArray(n.children)) {
            n.children.forEach(child => updateKeysRecursively(child, fromPrefix, toPrefix));
        }
    };

    /**
     * 展开所有文件夹（简化版）
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
                    if (n.children) collect(nodes.children);
                }
            });
        };
        collect(state.fileTree.value);
        state.expandedFolders.value = all;
    };

    /**
     * 重命名项目
     * @param {Object} options - 选项
     * @param {string} options.itemId - 项目ID
     * @param {string} options.newName - 新名称
     * @returns {Promise<string>} 新ID
     */
    const renameItem = async ({ itemId, newName }) => {
        return safeExecuteAsync(async () => {
            if (!itemId) throw createError('缺少目标ID', ErrorTypes.VALIDATION, '重命名');
            const normalizedNewName = normalizeItemName(newName);
            if (!normalizedNewName) throw createError('名称不能为空', ErrorTypes.VALIDATION, '重命名');
            const root = state.fileTree.value;
            const { node, parent } = findNodeAndParentByKey(root, itemId);
            if (!node) throw createError('未找到目标节点', ErrorTypes.API, '重命名');
            const siblings = parent ? (parent.children || []) : (Array.isArray(state.fileTree.value) ? state.fileTree.value : [state.fileTree.value]);
            if (siblings.some(ch => ch !== node && normalizeItemName(ch?.name) === normalizedNewName)) {
                throw createError('同级存在同名项', ErrorTypes.VALIDATION, '重命名');
            }

            const parentPath = parent ? normalizeFilePath(parent.key || '') : '';
            const oldPath = normalizeFilePath(node.key || '');
            const newPath = normalizeFilePath(parentPath ? `${parentPath}/${normalizedNewName}` : normalizedNewName);
            const oldId = oldPath;
            const newId = newPath;

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

            node.name = normalizedNewName;

            const prevFiles = Array.isArray(state.files.value) ? state.files.value.slice() : [];

            updateKeysRecursively(node, oldId, newId);

            if (parent && parent.children) {
                parent.children = sortFileTreeItems(parent.children);
            }
            expandAllFolders();

            if (Array.isArray(state.files.value)) {
                state.files.value = state.files.value.map(f => {
                    const normalizedOldId = normalizeFilePath(oldId);
                    const ids = [f.key, f.path].filter(Boolean).map(id => normalizeFilePath(id));
                    const matched = ids.some(v => v === normalizedOldId || v.startsWith(normalizedOldId + '/'));
                    if (matched) {
                        const oldPath = normalizeFilePath(f.path || f.key);
                        const replacedPath = oldPath.replace(normalizedOldId, newId);
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

                        const updatedFile = {
                            ...f,
                            key: newPath,
                            path: newPath,
                            name: newPath.split('/').pop()
                        };

                        let targetSessionKey = oldPath;
                        let foundSessionIdx = -1;
                        let foundSession = null;

                        if (state.sessions.value && Array.isArray(state.sessions.value)) {
                            const fName = oldPath.split('/').pop();
                            const fTags = oldPath.split('/').slice(0, -1).filter(Boolean);

                            foundSessionIdx = state.sessions.value.findIndex(s => {
                                if (s.key === oldPath) return true;
                                const sName = String(s.title || s.pageTitle || '').trim().replace(/\s+/g, '_');
                                const sTags = s.tags || [];
                                if (sName !== fName) return false;
                                if (sTags.length !== fTags.length) return false;
                                for (let i = 0; i < sTags.length; i++) {
                                    if (String(sTags[i]) !== String(fTags[i])) return false;
                                }
                                return true;
                            });

                            if (foundSessionIdx >= 0) {
                                foundSession = state.sessions.value[foundSessionIdx];
                                if (foundSession && foundSession.key) {
                                    targetSessionKey = foundSession.key;
                                }
                            }
                        }

                        try {
                            await internals.sessionSync.renameSession(targetSessionKey, newPath, updatedFile);

                            if (foundSessionIdx >= 0 && state.sessions.value) {
                                state.sessions.value.splice(foundSessionIdx, 1);

                                let sessionData = internals.sessionSync.fileToSession(updatedFile);
                                if (sessionData) {
                                    if (foundSession && typeof foundSession === 'object') {
                                        sessionData = { ...foundSession, ...sessionData };
                                    }
                                    if (targetSessionKey !== oldPath) {
                                        sessionData.key = targetSessionKey;
                                    }
                                    if (foundSession && foundSession.url) {
                                        sessionData.url = foundSession.url;
                                    }
                                    if (Object.prototype.hasOwnProperty.call(sessionData, 'pageContent')) {
                                        delete sessionData.pageContent;
                                    }
                                    state.sessions.value.push(sessionData);
                                }
                            }

                            console.log('[renameItem] 会话迁移完成:', oldPath, '->', newPath);
                        } catch (err) {
                            console.error(`[renameItem] 文件 ${oldPath} 会话迁移失败:`, err);
                        }
                    }));
                }
            } catch (e) {
                console.warn('[renameItem] 远端文件同步失败（已忽略）:', e?.message);
            }

            await loadSessions(true);

            return newId;
        }, '重命名');
    };

    return {
        renameItem,
        setHelpers
    };
}
