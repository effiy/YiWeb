export function createAicrStoreFileTreeOps(deps, state, internals, extra) {
    const {
        safeExecuteAsync,
        createError,
        ErrorTypes,
        normalizeFilePath,
        normalizeFileObject,
        normalizeTreeNode,
        buildFileTreeFromSessions,
        getFileDeleteService
    } = deps;

    const { loadSessions } = extra;

    const loadFileTree = async (forceClear = false) => {
        return safeExecuteAsync(async () => {
            state.loading.value = true;
            state.error.value = null;
            state.errorMessage.value = '';

            console.log('[loadFileTree] 正在加载全局文件树数据...');

            if (!state.sessions.value || state.sessions.value.length === 0) {
                await loadSessions();
            }

            const allSessions = state.sessions.value;
            console.log('[loadFileTree] 会话总数:', allSessions.length);

            if (allSessions.length === 0) {
                if (forceClear) state.fileTree.value = [];
                return [];
            }

            const { treeRoots, expandedFolders: folderSet } = buildFileTreeFromSessions(allSessions);

            state.fileTree.value = treeRoots;
            state.fileTreeDocKey.value = '';

            console.log(`[loadFileTree] 成功构建文件树, 包含 ${allSessions.length} 个文件`);

            state.expandedFolders.value = folderSet;

            return state.fileTree.value;
        }, '文件树数据加载', (errorInfo) => {
            const debug = (() => {
                try { return !!(window.__ENV__ && window.__ENV__.DEBUG); } catch (_) { return false; }
            })();
            const code = errorInfo && errorInfo.code ? String(errorInfo.code) : '';
            const message = debug && code ? `[${code}] ${errorInfo.message}` : errorInfo.message;
            state.error.value = message;
            state.errorMessage.value = message;
            if (forceClear) state.fileTree.value = [];
        }).finally(() => {
            state.loading.value = false;
        });
    };

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

    const normalizeItemName = (raw) => {
        return String(raw ?? '').trim().replace(/\s+/g, '_');
    };

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

            const sortFileTreeItems = (items) => {
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
            };

            const sorted = sortFileTreeItems(targetChildren);
            if (parentNode) {
                parentNode.children = sorted;
            } else if (Array.isArray(root)) {
                state.fileTree.value = sorted;
            }
            expandAllFolders();

            return newId;
        }, '创建文件夹');
    };

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

            const sortFileTreeItems = (items) => {
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
            };

            const sorted = sortFileTreeItems(targetChildren);
            if (parentNode) {
                parentNode.children = sorted;
            } else if (Array.isArray(root)) {
                state.fileTree.value = sorted;
            }
            expandAllFolders();

            try {
                const baseUrl = window.API_URL || '';
                const url = `${baseUrl.replace(/\/$/, '')}/write-file`;

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
                await loadFileTree();
                console.log('[createFile] 文件树已刷新');
            } catch (refreshError) {
                console.warn('[createFile] 刷新文件树失败（已忽略）:', refreshError?.message);
            }

            return normalizedNewId;
        }, '创建文件');
    };

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
            updateKeysRecursively(node, oldId, newId);

            const sortFileTreeItems = (items) => {
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
            };

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

    const deleteItem = async ({ key, itemId }) => {
        return safeExecuteAsync(async () => {
            const targetKey = key || itemId;
            if (!targetKey) throw createError('缺少目标ID', ErrorTypes.VALIDATION, '删除');
            const root = state.fileTree.value;
            const { node, parent } = findNodeAndParentByKey(root, targetKey);
            if (!node) throw createError('未找到目标节点', ErrorTypes.API, '删除');

            const prevFiles = Array.isArray(state.files.value) ? state.files.value.slice() : [];

            if (!parent) {
                if (Array.isArray(state.fileTree.value)) {
                    state.fileTree.value = state.fileTree.value.filter(n => n.key !== targetKey);
                } else if (state.fileTree.value && state.fileTree.value.key === targetKey) {
                    state.fileTree.value = [];
                }
            } else {
                parent.children = (parent.children || []).filter(ch => ch.key !== targetKey);

                if (Array.isArray(state.fileTree.value)) {
                    state.fileTree.value = [...state.fileTree.value];
                } else if (state.fileTree.value && typeof state.fileTree.value === 'object') {
                    state.fileTree.value = { ...state.fileTree.value };
                }
            }

            expandAllFolders();

            if (Array.isArray(state.files.value)) {
                state.files.value = state.files.value.filter(f => {
                    const ids = [f.key, f.path].filter(Boolean);
                    const matched = ids.some(v => String(v) === targetKey || String(v).startsWith(targetKey + '/'));
                    return !matched;
                });
            }

            try {
                const fileDeleteService = getFileDeleteService();
                let deleteResults = [];

                if (node.type === 'folder') {
                    console.log('[deleteItem] 检测到文件夹删除，执行文件夹清理逻辑:', targetKey);
                    const folderResult = await fileDeleteService.deleteFolder(targetKey, state.sessions.value);

                    if (state.sessions.value && Array.isArray(state.sessions.value)) {
                        const originalLength = state.sessions.value.length;
                        state.sessions.value = state.sessions.value.filter(s => {
                            const sessionKey = String(s.key || '');
                            const targetPath = String(targetKey || '');
                            const shouldDelete = sessionKey === targetPath || sessionKey.startsWith(targetPath + '/');
                            return !shouldDelete;
                        });
                        console.log('[deleteItem] 本地会话列表已更新，移除:', originalLength - state.sessions.value.length, '个会话');
                    }

                    console.log('[deleteItem] 文件夹删除结果:', folderResult);
                }

                const affected = prevFiles.filter(f => {
                    const ids = [f.key, f.path].filter(Boolean);
                    return ids.some(v => String(v) === targetKey || String(v).startsWith(targetKey + '/'));
                });

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
                            data: { key: targetKey, path: targetKey }
                        });
                    }
                }

                if (state.sessions.value && Array.isArray(state.sessions.value)) {
                    filesToDelete = filesToDelete.map(f => {
                        const fPath = f.path || f.key;
                        if (!fPath) return f;

                        const fName = fPath.split('/').pop();
                        const fTags = fPath.split('/').slice(0, -1).filter(Boolean);

                        const session = state.sessions.value.find(s => {
                            const sName = String(s.title || s.pageTitle || '').trim().replace(/\s+/g, '_');
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

                deleteResults = await fileDeleteService.deleteFiles(filesToDelete);

                if (state.sessions.value && Array.isArray(state.sessions.value) && filesToDelete.length > 0) {
                    const deletedSessionKeys = filesToDelete
                        .map(f => f.sessionKey || internals.sessionSync.generateSessionKey(f.key || f.path))
                        .filter(Boolean);

                    if (deletedSessionKeys.length > 0) {
                        console.log('[deleteItem] 待删除会话Keys:', deletedSessionKeys);

                        const originalLength = state.sessions.value.length;
                        state.sessions.value = state.sessions.value.filter(s => !deletedSessionKeys.includes(s.key));
                        console.log('[deleteItem] 本地会话列表已更新，移除:', originalLength - state.sessions.value.length, '个文件会话');
                    }
                }

                const mongoSuccessCount = deleteResults.filter(r => r.mongoSuccess).length;
                const sessionSuccessCount = deleteResults.filter(r => r.sessionSuccess).length;
                const failedCount = deleteResults.filter(r => !r.mongoSuccess && !r.sessionSuccess).length;

                console.log('[deleteItem] 删除完成:', {
                    总数: affected.length,
                    MongoDB成功: mongoSuccessCount,
                    会话成功: sessionSuccessCount,
                    失败: failedCount
                });

                if (failedCount > 0) {
                    console.warn('[deleteItem] 部分文件删除失败，详情:', deleteResults.filter(r => !r.mongoSuccess && !r.sessionSuccess));
                }

                await loadSessions(true);
            } catch (e) {
                console.error('[deleteItem] 远端文件删除失败:', e?.message, e?.stack);
                throw e;
            }
            return true;
        }, '删除节点');
    };

    const toggleFolder = (key) => {
        if (state.expandedFolders.value.has(key)) {
            state.expandedFolders.value.delete(key);
        } else {
            state.expandedFolders.value.add(key);
        }
    };

    return {
        loadFileTree,
        expandAllFolders,
        createFolder,
        createFile,
        renameItem,
        deleteItem,
        toggleFolder
    };
}
