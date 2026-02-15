export const createSessionActionMethods = ({
    store,
    safeExecute,
    postData,
    SERVICE_MODULE,
    fileTree,
    loadFileTree,
    deleteItem,
    showSuccessMessage,
    loadSessions,
    selectSessionForChat,
    normalizeFilePath,
    loadFileByKey,
    openTagManagerExternal,
    getPromptUrl
}) => {
    return {
        handleSessionDelete: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionDelete] 删除会话:', sessionKey);

                const sessions = store.sessions?.value || [];
                let session = sessions.find(s => s && s.key === sessionKey);

                if (!fileTree.value || fileTree.value.length === 0) {
                    console.log('[handleSessionDelete] 文件树为空，尝试加载...');
                    if (loadFileTree) {
                        await loadFileTree();
                    }
                }

                const findNode = (nodes) => {
                    if (!nodes || !Array.isArray(nodes)) return null;
                    for (const node of nodes) {
                        if (node.key === sessionKey) return node;
                        if (node.sessionKey === sessionKey) return node;

                        if (node.children) {
                            const found = findNode(node.children);
                            if (found) return found;
                        }
                    }
                    return null;
                };

                const node = findNode(fileTree.value);

                if (node) {
                    console.log('[handleSessionDelete] 找到对应文件节点，使用文件删除逻辑:', node.key);
                    const itemId = node.key;
                    if (!confirm('确定删除该会话及其对应文件？此操作不可撤销。')) return;

                    if (deleteItem) {
                        await deleteItem({ itemId });
                        showSuccessMessage('删除成功');
                    }
                    return;
                }

                console.warn('[handleSessionDelete] 未找到对应文件节点，回退到普通会话删除逻辑');

                try {
                    if (!session) {
                        try {
                            const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();
                            session = await sessionSync.getSession(sessionKey);
                        } catch (e) {
                            console.warn('[handleSessionDelete] 获取会话信息失败:', e);
                        }
                    }

                    if (!confirm('确定删除该会话？此操作不可撤销。')) return;

                    if (session && session.url && String(session.url).startsWith('aicr-session://')) {
                        if (window.showError) {
                            window.showError('不允许在会话视图删除树文件类型的会话');
                        }
                        return;
                    }

                    const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                    const sessionSync = getSessionSyncService();
                    await sessionSync.deleteSession(sessionKey);

                    if (store.sessions && store.sessions.value && Array.isArray(store.sessions.value)) {
                        store.sessions.value = store.sessions.value.filter(s => s && s.key !== sessionKey);
                    }

                    if (window.showSuccess) {
                        window.showSuccess('会话已删除');
                    }
                } catch (error) {
                    console.error('[handleSessionDelete] 删除会话失败:', error);
                    if (window.showError) {
                        window.showError(`删除会话失败：${error.message || '未知错误'}`);
                    }
                }
            }, '删除会话');
        },

        handleSessionCreate: async () => {
            return safeExecute(async () => {
                const title = window.prompt('新建会话名称：');
                if (!title || !title.trim()) return;

                const sessionTitle = title.trim().replace(/\s+/g, '_');

                const generateUUID = () => {
                    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                        return crypto.randomUUID();
                    }
                    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                        const r = Math.random() * 16 | 0;
                        const v = c === 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                    });
                };

                const sessionKey = generateUUID();
                const now = Date.now();

                const timestamp = Date.now();
                const randomStr = Math.random().toString(36).substring(2, 11);
                const uniqueUrl = `aicr-session://${timestamp}-${randomStr}`;

                const sessionData = {
                    key: sessionKey,
                    url: uniqueUrl,
                    title: sessionTitle,
                    pageDescription: '',
                    pageContent: '',
                    messages: [],
                    tags: [],
                    createdAt: now,
                    updatedAt: now,
                    lastAccessTime: now
                };

                const payload = {
                    module_name: SERVICE_MODULE,
                    method_name: 'create_document',
                    parameters: {
                        cname: 'sessions',
                        data: sessionData
                    }
                };

                const saveResult = await postData(`${window.API_URL}/`, payload);

                if (saveResult && saveResult.success !== false) {
                    const sanitizeFileName = (name) => String(name || '').trim().replace(/\s+/g, '_').replace(/\//g, '-');
                    const fileName = sanitizeFileName(sessionTitle);

                    const tags = Array.isArray(sessionData.tags) ? sessionData.tags : [];
                    const folderParts = tags
                        .map(t => (t == null ? '' : String(t)).trim())
                        .filter(t => t.length > 0 && String(t).toLowerCase() !== 'default');

                    let filePath = '';
                    if (folderParts.length > 0) {
                        const folderPath = folderParts.join('/');
                        filePath = normalizeFilePath(`${folderPath}/${fileName}`);
                    } else {
                        filePath = normalizeFilePath(fileName);
                    }

                    try {
                        const baseUrl = window.API_URL || '';
                        const url = `${baseUrl.replace(/\/$/, '')}/write-file`;

                        const cleanPath = filePath.startsWith('static/')
                            ? filePath.slice(7)
                            : filePath;

                        const response = await fetch(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                target_file: cleanPath,
                                content: sessionData.pageContent || '',
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

                        console.log('[handleSessionCreate] 文件已通过 write-file 创建:', cleanPath);
                    } catch (writeError) {
                        console.warn('[handleSessionCreate] 通过 write-file 创建文件失败（已忽略）:', writeError?.message);
                    }

                    if (store.sessions && store.sessions.value) {
                        store.sessions.value = [sessionData, ...store.sessions.value];
                    }

                    if (loadSessions && typeof loadSessions === 'function') {
                        await loadSessions(true);
                    }

                    if (store.loadFileTree && typeof store.loadFileTree === 'function') {
                        try {
                            await store.loadFileTree();
                        } catch (refreshError) {
                            console.warn('[handleSessionCreate] 刷新文件树失败（已忽略）:', refreshError?.message);
                        }
                    }

                    const sessions = store.sessions?.value || [];
                    const newSession = sessions.find(s => s && s.key === sessionKey);
                    if (newSession) {
                        await selectSessionForChat(newSession, { toggleActive: false, openContextEditor: false });
                    }

                    showSuccessMessage('会话创建成功');
                } else {
                    throw new Error(saveResult?.message || '创建会话失败');
                }
            }, '创建会话');
        },

        handleSessionToggleFavorite: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionToggleFavorite] 切换收藏状态:', sessionKey);
                try {
                    const sessions = store.sessions?.value || [];
                    let session = sessions.find(s => s && s.key === sessionKey);

                    if (!session) {
                        try {
                            const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();
                            session = await sessionSync.getSession(sessionKey);
                        } catch (e) {
                            console.warn('[handleSessionToggleFavorite] 获取会话信息失败:', e);
                        }
                    }

                    if (!session) {
                        throw new Error('会话不存在');
                    }

                    const newFavoriteState = !(session.isFavorite || false);
                    session.isFavorite = newFavoriteState;

                    const updateData = {
                        key: sessionKey,
                        isFavorite: newFavoriteState
                    };

                    const payload = {
                        module_name: SERVICE_MODULE,
                        method_name: 'update_document',
                        parameters: {
                            cname: 'sessions',
                            key: sessionKey,
                            data: updateData
                        }
                    };
                    await postData(`${window.API_URL}/`, payload);

                    if (store.sessions && store.sessions.value) {
                        store.sessions.value = [...store.sessions.value];
                    }

                    if (window.showSuccess) {
                        window.showSuccess(newFavoriteState ? '已收藏' : '已取消收藏');
                    }
                } catch (error) {
                    console.error('[handleSessionToggleFavorite] 切换收藏状态失败:', error);
                    if (window.showError) {
                        window.showError(`操作失败：${error.message || '未知错误'}`);
                    }
                }
            }, '切换收藏状态');
        },

        handleSessionFavorite: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionFavorite] 切换收藏状态:', sessionKey);
                try {
                    const sessions = store.sessions?.value || [];
                    let session = sessions.find(s => s && s.key === sessionKey);

                    if (!session) {
                        try {
                            const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();
                            session = await sessionSync.getSession(sessionKey);
                        } catch (e) {
                            console.warn('[handleSessionFavorite] 获取会话信息失败:', e);
                        }
                    }

                    if (!session) {
                        throw new Error('会话不存在');
                    }

                    const newFavoriteState = !(session.isFavorite || false);
                    session.isFavorite = newFavoriteState;

                    const updateData = {
                        key: sessionKey,
                        isFavorite: newFavoriteState
                    };

                    const payload = {
                        module_name: SERVICE_MODULE,
                        method_name: 'update_document',
                        parameters: {
                            cname: 'sessions',
                            key: sessionKey,
                            data: updateData
                        }
                    };
                    await postData(`${window.API_URL}/`, payload);

                    if (store.sessions && store.sessions.value) {
                        store.sessions.value = [...store.sessions.value];
                    }

                    if (window.showSuccess) {
                        window.showSuccess(newFavoriteState ? '已收藏' : '已取消收藏');
                    }
                } catch (error) {
                    console.error('[handleSessionFavorite] 切换收藏状态失败:', error);
                    if (window.showError) {
                        window.showError(`操作失败：${error.message || '未知错误'}`);
                    }
                }
            }, '切换收藏状态');
        },

        handleSessionManageTags: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionManageTags] 管理标签:', sessionKey);
                try {
                    const sessions = store.sessions?.value || [];
                    let session = sessions.find(s => s && s.key === sessionKey);

                    if (!session) {
                        try {
                            const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();
                            session = await sessionSync.getSession(sessionKey);
                        } catch (e) {
                            console.warn('[handleSessionManageTags] 获取会话信息失败:', e);
                        }
                    }

                    if (!session) {
                        throw new Error('会话不存在');
                    }

                    await openTagManagerExternal(session.key, session, store);
                } catch (error) {
                    console.error('[handleSessionManageTags] 管理标签失败:', error);
                    if (window.showError) {
                        window.showError(`操作失败：${error.message || '未知错误'}`);
                    }
                }
            }, '管理标签');
        },

        handleSessionTag: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionTag] 管理标签:', sessionKey);
                try {
                    const sessions = store.sessions?.value || [];
                    let session = sessions.find(s => s && s.key === sessionKey);

                    if (!session) {
                        try {
                            const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();
                            session = await sessionSync.getSession(sessionKey);
                        } catch (e) {
                            console.warn('[handleSessionTag] 获取会话信息失败:', e);
                        }
                    }

                    if (!session) {
                        throw new Error('会话不存在');
                    }

                    await openTagManagerExternal(session.key, session, store);
                } catch (error) {
                    console.error('[handleSessionTag] 管理标签失败:', error);
                    if (window.showError) {
                        window.showError(`操作失败：${error.message || '未知错误'}`);
                    }
                }
            }, '管理标签');
        },

        handleSessionDuplicate: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionDuplicate] 创建副本:', sessionKey);
                try {
                    const sessions = store.sessions?.value || [];
                    let sourceSession = sessions.find(s => s && s.key === sessionKey);

                    if (!sourceSession) {
                        try {
                            const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();
                            sourceSession = await sessionSync.getSession(sessionKey);
                        } catch (e) {
                            console.warn('[handleSessionDuplicate] 获取会话信息失败:', e);
                        }
                    }

                    if (!sourceSession) {
                        throw new Error('会话不存在');
                    }

                    const newSessionKey = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                    const now = Date.now();

                    const duplicatedSession = {
                        key: newSessionKey,
                        url: sourceSession.url || '',
                        title: sourceSession.title ? `${String(sourceSession.title).trim().replace(/\s+/g, '_')}_(副本)` : '新会话_(副本)',
                        pageDescription: sourceSession.pageDescription || '',
                        pageContent: sourceSession.pageContent || '',
                        messages: sourceSession.messages ? JSON.parse(JSON.stringify(sourceSession.messages)) : [],
                        tags: sourceSession.tags ? [...sourceSession.tags] : [],
                        isFavorite: false,
                        createdAt: now,
                        updatedAt: now,
                        lastAccessTime: now
                    };

                    const payload = {
                        module_name: SERVICE_MODULE,
                        method_name: 'create_document',
                        parameters: {
                            cname: 'sessions',
                            data: duplicatedSession
                        }
                    };
                    await postData(`${window.API_URL}/`, payload);

                    if (store.sessions && store.sessions.value) {
                        store.sessions.value = [duplicatedSession, ...store.sessions.value];
                    }

                    if (store.loadSessions && typeof store.loadSessions === 'function') {
                        await store.loadSessions(true);
                    }

                    if (window.showSuccess) {
                        window.showSuccess('会话副本已创建');
                    }
                } catch (error) {
                    console.error('[handleSessionDuplicate] 创建副本失败:', error);
                    if (window.showError) {
                        window.showError(`创建副本失败：${error.message || '未知错误'}`);
                    }
                }
            }, '创建副本');
        },

        handleSessionContext: async (sessionKey) => {
            return safeExecute(async () => {
                try {
                    const sessions = store.sessions?.value || [];
                    const session = sessions.find(s => s && s.key === sessionKey);
                    if (!session) {
                        throw new Error('会话不存在');
                    }

                    await selectSessionForChat(session, { toggleActive: false, openContextEditor: true });
                } catch (error) {
                    console.error('[handleSessionContext] 打开页面上下文失败:', error);
                    if (window.showError) {
                        window.showError(`操作失败：${error.message || '未知错误'}`);
                    }
                }
            }, '打开页面上下文');
        },

        handleSessionOpenUrl: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionOpenUrl] 打开URL:', sessionKey);
                try {
                    const sessions = store.sessions?.value || [];
                    const session = sessions.find(s => s && s.key === sessionKey);
                    if (!session || !session.url || !session.url.startsWith('https://')) {
                        return;
                    }

                    window.open(session.url, '_blank');
                } catch (error) {
                    console.error('[handleSessionOpenUrl] 打开URL失败:', error);
                    if (window.showError) {
                        window.showError(`打开URL失败：${error.message || '未知错误'}`);
                    }
                }
            }, '打开URL');
        },

        handleCreateSession: async (payload) => {
            console.log('[handleCreateSession] 收到创建会话请求:', payload);
            return safeExecute(async () => {
                const fileKey = payload?.key || payload?.fileKey || payload?.path;
                console.log('[handleCreateSession] 文件Key:', fileKey);
                if (!fileKey) {
                    console.error('[handleCreateSession] 无效的文件Key');
                    if (window.showError) {
                        window.showError('无效的文件Key');
                    }
                    return;
                }

                try {
                    if (window.showGlobalLoading) {
                        window.showGlobalLoading('正在获取文件内容并生成会话描述...');
                    }

                    let fileContent = '';
                    let fileData = null;

                    if (typeof loadFileByKey === 'function') {
                        fileData = await loadFileByKey(fileKey);
                        if (fileData && fileData.content) {
                            fileContent = fileData.content;
                        }
                    }

                    if (!fileContent) {
                        throw new Error('无法获取文件内容');
                    }

                    const { streamPromptJSON } = await import('/src/services/modules/crud.js');

                    const fileInfoText = `文件路径：${fileKey}\n文件名称：${payload?.name || fileKey.split('/').pop()}\n\n文件内容：\n${fileContent.substring(0, 10000)}`;

                    const descriptionResponse = await streamPromptJSON(getPromptUrl(), {
                        module_name: 'services.ai.chat_service',
                        method_name: 'chat',
                        parameters: {
                            system: '请根据以下文件内容生成一个简洁的文件描述（不超过200字），描述应该概括文件的主要功能和用途。',
                            user: fileInfoText
                        }
                    });

                    let pageDescription = '';
                    if (typeof descriptionResponse === 'string') {
                        pageDescription = descriptionResponse;
                    } else if (descriptionResponse && descriptionResponse.data) {
                        if (Array.isArray(descriptionResponse.data) && descriptionResponse.data.length > 0) {
                            const firstItem = descriptionResponse.data[0];
                            pageDescription = typeof firstItem === 'string' ? firstItem : JSON.stringify(firstItem, null, 2);
                        } else if (typeof descriptionResponse.data === 'string') {
                            pageDescription = descriptionResponse.data;
                        }
                    }

                    if (!pageDescription || pageDescription.trim() === '') {
                        pageDescription = `文件：${payload?.name || fileKey}`;
                    }

                    const generateUUID = () => {
                        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                            return crypto.randomUUID();
                        }
                        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                            const r = Math.random() * 16 | 0;
                            const v = c === 'x' ? r : (r & 0x3 | 0x8);
                            return v.toString(16);
                        });
                    };

                    const sessionKey = generateUUID();

                    const now = Date.now();

                    const timestamp = Date.now();
                    const randomStr = Math.random().toString(36).substring(2, 11);
                    const uniqueUrl = `aicr-session://${timestamp}-${randomStr}`;

                    const sessionData = {
                        key: sessionKey,
                        url: uniqueUrl,
                        title: String(fileKey || '').trim().replace(/\s+/g, '_'),
                        pageDescription: pageDescription.trim(),
                        pageContent: fileContent,
                        messages: [],
                        tags: [],
                        createdAt: now,
                        updatedAt: now,
                        lastAccessTime: now
                    };

                    const payload = {
                        module_name: SERVICE_MODULE,
                        method_name: 'create_document',
                        parameters: {
                            cname: 'sessions',
                            data: sessionData
                        }
                    };
                    const saveResult = await postData(`${window.API_URL}/`, payload);

                    if (window.hideGlobalLoading) {
                        window.hideGlobalLoading();
                    }

                    if (saveResult && saveResult.success !== false) {
                        if (window.showSuccess) {
                            window.showSuccess(`已成功创建 YiPet 会话：${fileKey}`);
                        }
                        console.log('[创建会话] 会话创建成功:', saveResult);
                    } else {
                        throw new Error(saveResult?.message || '创建会话失败');
                    }
                } catch (error) {
                    if (window.hideGlobalLoading) {
                        window.hideGlobalLoading();
                    }
                    console.error('[创建会话] 创建会话失败:', error);
                    if (window.showError) {
                        window.showError(`创建会话失败：${error.message || '未知错误'}`);
                    }
                }
            }, '创建会话');
        }
    };
};
