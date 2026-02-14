export const createFileTreeCrudMethods = ({
    store,
    safeExecute,
    createError,
    ErrorTypes,
    showSuccessMessage,
    selectSessionForChat
}) => {
    const {
        fileTree,
        selectedKey,
        expandedFolders,
        setSelectedKey,
        normalizeKey,
        toggleFolder,
        loadFileByKey,
        createFolder,
        createFile,
        renameItem,
        deleteItem,
        activeSession
    } = store || {};

    const handleFileSelect = (key) => {
        return safeExecute(async () => {
            console.log('[文件选择] 收到文件选择请求:', key);

            let targetKey = key;
            let targetSessionKey = null;
            if (key && typeof key === 'object') {
                const node = key;
                targetKey = node.key || node.name || '';
                console.log('[文件选择] 从对象中提取文件Key:', targetKey, '原始对象:', node);

                if (node.key) {
                    window.__aicrPendingFileKey = node.key;
                    console.log('[文件选择] 保存文件Key:', window.__aicrPendingFileKey);
                }

                if (node.sessionKey != null && String(node.sessionKey).trim()) {
                    targetSessionKey = String(node.sessionKey).trim();
                }
            }

            const keyNorm = typeof normalizeKey === 'function' ? normalizeKey(targetKey) : String(targetKey || '');
            if (!keyNorm) {
                throw createError('文件Key无效', ErrorTypes.VALIDATION, '文件选择');
            }

            if (selectedKey?.value === keyNorm) {
                console.log('[文件选择] 取消选中文件:', keyNorm);
                if (typeof setSelectedKey === 'function') setSelectedKey(null);
                window.__aicrPendingFileKey = null;
                if (store?.externalSelectedSessionKey) store.externalSelectedSessionKey.value = null;
                if (activeSession) activeSession.value = null;
                return;
            }

            console.log('[文件选择] 设置选中的文件Key:', keyNorm);
            if (typeof setSelectedKey === 'function') setSelectedKey(keyNorm);

            try {
                if (typeof loadFileByKey === 'function') {
                    const fileKey = window.__aicrPendingFileKey || null;
                    console.log('[文件选择] 开始按需加载文件内容:', { key: keyNorm, fileKey });
                    const loadedFile = await loadFileByKey(keyNorm);
                    if (loadedFile && loadedFile.content) {
                        console.log('[文件选择] 文件内容加载成功，内容长度:', loadedFile.content.length);
                    } else {
                        console.warn('[文件选择] 文件内容为空或未加载');
                    }
                }
            } catch (e) {
                console.warn('[文件选择] 按需加载失败(忽略):', e?.message || e);
            }

            try {
                const normalize = (v) => {
                    try {
                        if (v == null) return '';
                        let s = String(v);
                        s = s.replace(/\\/g, '/');
                        s = s.trim().replace(/\s+/g, '_');
                        s = s.replace(/^\.\//, '');
                        s = s.replace(/^\/+/, '');
                        s = s.replace(/\/\/+/, '/');
                        return s;
                    } catch (_) {
                        return String(v || '');
                    }
                };

                if (!targetSessionKey) {
                    const targetTreeKey = normalize(keyNorm);
                    const findSessionKeyByTreeKey = (nodes) => {
                        if (!nodes) return null;
                        const stack = Array.isArray(nodes) ? [...nodes] : [nodes];
                        while (stack.length > 0) {
                            const n = stack.pop();
                            if (!n) continue;
                            const k = normalize(n.key || n.path || n.id || '');
                            if (k && k === targetTreeKey) {
                                return n.sessionKey != null ? String(n.sessionKey) : null;
                            }
                            if (Array.isArray(n.children) && n.children.length > 0) {
                                for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]);
                            }
                        }
                        return null;
                    };

                    targetSessionKey = findSessionKeyByTreeKey(store?.fileTree?.value);

                    if (!targetSessionKey) {
                        const allFiles = store?.files?.value || [];
                        const match = allFiles.find((f) => {
                            if (!f) return false;
                            const candidates = [f.treeKey, f.path, f.key, f.name].filter(Boolean).map(normalize);
                            return candidates.includes(targetTreeKey);
                        });
                        if (match && match.sessionKey != null && String(match.sessionKey).trim()) {
                            targetSessionKey = String(match.sessionKey).trim();
                        }
                    }
                }

                try {
                    if ((!store?.sessions?.value || store.sessions.value.length === 0) && typeof store?.loadSessions === 'function') {
                        await store.loadSessions(false);
                    }
                } catch (_) { }

                const sessions = store?.sessions?.value || [];
                const targetTreeKey = normalize(keyNorm);
                const directKey = targetSessionKey ? String(targetSessionKey) : null;

                const matchedSession = sessions.find((s) => {
                    if (!s) return false;
                    if (directKey && String(s.key || '') === directKey) return true;
                    const desc = String(s.pageDescription || '');
                    if (desc && desc.includes('文件：')) {
                        const filePath = desc.split('文件：').slice(1).join('文件：').trim();
                        if (filePath && normalize(filePath) === targetTreeKey) return true;
                    }
                    const title = normalize(s.title || '');
                    if (title && title === targetTreeKey) return true;
                    return false;
                });

                if (matchedSession) {
                    if (store?.externalSelectedSessionKey) store.externalSelectedSessionKey.value = String(matchedSession.key || '');
                    if (typeof selectSessionForChat === 'function') {
                        await selectSessionForChat(matchedSession, {
                            toggleActive: false,
                            openContextEditor: false,
                            syncSelectedKey: false,
                            fileKeyOverride: keyNorm
                        });
                    }
                } else {
                    if (store?.externalSelectedSessionKey) store.externalSelectedSessionKey.value = null;
                    if (activeSession) activeSession.value = null;
                }
            } catch (e) {
                console.warn('[文件选择] 同步选中会话失败(忽略):', e?.message || e);
            }
        }, '文件选择处理');
    };

    const handleFolderToggle = (folderId) => {
        return safeExecute(() => {
            if (!folderId || typeof folderId !== 'string') {
                throw createError('文件夹ID无效', ErrorTypes.VALIDATION, '文件夹切换');
            }

            if (typeof toggleFolder === 'function') toggleFolder(folderId);
            const isExpanded = expandedFolders?.value?.has ? expandedFolders.value.has(folderId) : false;
            console.log(`[文件夹切换] ${folderId}: ${isExpanded ? '展开' : '收起'}`);
        }, '文件夹切换处理');
    };

    const expandAllFolders = () => {
        return safeExecute(() => {
            const expandFolder = (items) => {
                if (!Array.isArray(items)) {
                    if (items && items.type === 'folder') {
                        if (expandedFolders?.value?.add) expandedFolders.value.add(items.key);
                        if (items.children) {
                            expandFolder(items.children);
                        }
                    }
                    return;
                }

                items.forEach(item => {
                    if (item && item.type === 'folder') {
                        if (expandedFolders?.value?.add) expandedFolders.value.add(item.key);
                        if (item.children) {
                            expandFolder(item.children);
                        }
                    }
                });
            };

            if (fileTree?.value) {
                expandFolder(fileTree.value);
                if (typeof showSuccessMessage === 'function') showSuccessMessage('已展开所有文件夹');
            }
        }, '展开所有文件夹');
    };

    const collapseAllFolders = () => {
        return safeExecute(() => {
            if (expandedFolders?.value?.clear) expandedFolders.value.clear();
            if (typeof showSuccessMessage === 'function') showSuccessMessage('已收起所有文件夹');
        }, '收起所有文件夹');
    };

    const handleCreateFolder = async (payload) => {
        return safeExecute(async () => {
            const parentId = payload && (payload.parentId || payload.parentKey);
            const name = window.prompt('新建文件夹名称：');
            if (!name) return;
            if (typeof createFolder === 'function') {
                await createFolder({ parentId, name });
            }
            if (typeof showSuccessMessage === 'function') showSuccessMessage('文件夹创建成功');
        }, '新建文件夹');
    };

    const handleCreateFile = async (payload) => {
        return safeExecute(async () => {
            const parentId = payload && (payload.parentId || payload.parentKey);
            const name = window.prompt('新建文件名称（含扩展名）：');
            if (!name) return;
            if (typeof createFile === 'function') {
                await createFile({ parentId, name, content: '' });
            }
            if (typeof showSuccessMessage === 'function') showSuccessMessage('文件创建成功');
        }, '新建文件');
    };

    const handleRenameItem = async (payload) => {
        return safeExecute(async () => {
            const itemId = payload && (payload.itemId || payload.key);
            const oldName = payload && payload.name;
            if (!itemId) return;
            const newName = window.prompt('输入新名称：', oldName || '');
            if (!newName) return;
            if (typeof renameItem === 'function') {
                await renameItem({ itemId, newName });
            }
            if (typeof showSuccessMessage === 'function') showSuccessMessage('重命名成功');
        }, '重命名');
    };

    const handleDeleteItem = async (payload) => {
        return safeExecute(async () => {
            const itemId = payload && (payload.itemId || payload.key);
            if (!itemId) return;
            if (!confirm('确定删除该项及其子项？此操作不可撤销。')) return;
            if (typeof deleteItem === 'function') {
                await deleteItem({ itemId });
            }
            if (typeof showSuccessMessage === 'function') showSuccessMessage('删除成功');
            if (selectedKey?.value && (selectedKey.value === itemId || String(selectedKey.value).startsWith(String(itemId) + '/'))) {
                if (typeof setSelectedKey === 'function') setSelectedKey(null);
            }
        }, '删除');
    };

    return {
        handleFileSelect,
        handleFolderToggle,
        expandAllFolders,
        collapseAllFolders,
        handleCreateFolder,
        handleCreateFile,
        handleRenameItem,
        handleDeleteItem
    };
};
