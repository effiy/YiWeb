export const createSessionEditMethods = ({
    store,
    safeExecute,
    postData,
    SERVICE_MODULE,
    fileTree,
    loadFileTree,
    loadFileByKey,
    loadSessions,
    activeSession,
    files,
    normalizeFilePath,
    normalizeFileObject,
    getFileDeleteService
}) => {
    return {
        handleSessionEdit: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionEdit] 打开编辑模态框:', sessionKey);

                const sessions = store.sessions?.value || [];
                let session = sessions.find(s => s && s.key === sessionKey);

                if (!session) {
                    console.log('[handleSessionEdit] 本地未找到会话，尝试从服务端获取');
                    try {
                        const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                        const sessionSync = getSessionSyncService();
                        const serverSession = await sessionSync.getSession(sessionKey);

                        if (serverSession) {
                            if (session) {
                                session = { ...session, ...serverSession };
                            } else {
                                session = serverSession;
                            }
                        }
                    } catch (e) {
                        console.warn('[handleSessionEdit] 获取会话信息失败:', e);
                    }
                }

                if (!session) {
                    if (window.showError) {
                        window.showError('会话不存在');
                    }
                    return;
                }

                if (store.sessionEditKey) {
                    store.sessionEditKey.value = sessionKey;
                }
                if (store.sessionEditTitle) {
                    store.sessionEditTitle.value = session.title || '';
                }
                if (store.sessionEditUrl) {
                    store.sessionEditUrl.value = session.url || '';
                }
                if (store.sessionEditDescription) {
                    store.sessionEditDescription.value = session.pageDescription || '';
                }
                if (store.sessionEditData) {
                    store.sessionEditData.value = session;
                }
                if (store.sessionEditVisible) {
                    store.sessionEditVisible.value = true;
                }
            }, '打开编辑模态框');
        },

        closeSessionEdit: () => {
            if (store.sessionEditVisible) {
                store.sessionEditVisible.value = false;
            }
            if (store.sessionEditKey) {
                store.sessionEditKey.value = null;
            }
            if (store.sessionEditTitle) {
                store.sessionEditTitle.value = '';
            }
            if (store.sessionEditUrl) {
                store.sessionEditUrl.value = '';
            }
            if (store.sessionEditDescription) {
                store.sessionEditDescription.value = '';
            }
            if (store.sessionEditGenerating) {
                store.sessionEditGenerating.value = false;
            }
            if (store.sessionEditData) {
                store.sessionEditData.value = null;
            }
        },

        saveSessionEdit: async () => {
            return safeExecute(async () => {
                const sessionKey = store.sessionEditKey?.value;
                const title = (store.sessionEditTitle?.value || '').trim().replace(/\s+/g, '_');
                const url = store.sessionEditUrl?.value?.trim() || '';
                const description = store.sessionEditDescription?.value?.trim() || '';

                if (!sessionKey) {
                    throw new Error('会话Key不存在');
                }

                if (!title) {
                    throw new Error('标题不能为空');
                }

                const sessions = store.sessions?.value || [];
                const session = sessions.find(s => s && s.key === sessionKey);
                if (!session) {
                    throw new Error('会话不存在');
                }

                const oldTitle = session.title || '';
                const titleChanged = title !== oldTitle;

                if (titleChanged) {
                    console.log('[saveSessionEdit] 标题已改变，需要同步更新静态文件名:', oldTitle, '->', title);

                    if (!fileTree.value || fileTree.value.length === 0) {
                        if (loadFileTree) {
                            await loadFileTree();
                        }
                    }

                    const findNodeBySessionKey = (nodes, targetSessionKey) => {
                        if (!nodes || !Array.isArray(nodes)) return null;
                        for (const node of nodes) {
                            if (node.sessionKey === targetSessionKey || node.key === targetSessionKey) {
                                return node;
                            }
                            if (node.children) {
                                const found = findNodeBySessionKey(node.children, targetSessionKey);
                                if (found) return found;
                            }
                        }
                        return null;
                    };

                    const fileNode = findNodeBySessionKey(fileTree.value, sessionKey);

                    if (fileNode && fileNode.key) {
                        const oldPath = normalizeFilePath(fileNode.key);
                        const parentPath = oldPath.split('/').slice(0, -1).join('/');

                        const sanitizeFileName = (name) => String(name || '')
                            .trim()
                            .replace(/\s+/g, '_')
                            .replace(/[\/\\:*?"<>|]/g, '-');
                        const newFileName = sanitizeFileName(title);

                        if (!newFileName) {
                            throw new Error('清理后的文件名为空，请使用有效的文件名');
                        }

                        const newPath = normalizeFilePath(parentPath ? `${parentPath}/${newFileName}` : newFileName);

                        if (oldPath !== newPath) {
                            console.log('[saveSessionEdit] 准备重命名静态文件:', oldPath, '->', newPath);

                            const findNodeAndParentByKey = (rootNodes, targetKey) => {
                                const stack = Array.isArray(rootNodes) ? rootNodes.map(n => ({ node: n, parent: null })) : [{ node: rootNodes, parent: null }];
                                while (stack.length) {
                                    const { node, parent } = stack.pop();
                                    if (!node) continue;
                                    if (node.key === targetKey) return { node, parent };
                                    if (node.type === 'folder' && Array.isArray(node.children)) {
                                        for (const child of node.children) {
                                            stack.push({ node: child, parent: node });
                                        }
                                    } else if (node.children && Array.isArray(node.children)) {
                                        for (const child of node.children) {
                                            stack.push({ node: child, parent: node });
                                        }
                                    }
                                }
                                return { node: null, parent: null };
                            };

                            const { node: foundNode, parent: parentNode } = findNodeAndParentByKey(fileTree.value, oldPath);

                            const siblings = parentNode ? (parentNode.children || []) : (Array.isArray(fileTree.value) ? fileTree.value : []);
                            if (siblings.some(ch => ch !== fileNode && ch.name === newFileName)) {
                                throw new Error('同级存在同名文件，请使用不同的文件名');
                            }

                            const fileDeleteService = getFileDeleteService();
                            const renameResult = await fileDeleteService.renameFile(oldPath, newPath);

                            if (!renameResult.success) {
                                throw new Error('静态文件重命名失败: ' + (renameResult.error || '未知错误'));
                            }

                            fileNode.name = newFileName;
                            fileNode.key = newPath;
                            fileNode.path = newPath;

                            if (Array.isArray(files.value)) {
                                files.value = files.value.map(f => {
                                    const normalizedOldPath = normalizeFilePath(oldPath);
                                    const ids = [f.key, f.path].filter(Boolean).map(id => normalizeFilePath(id));
                                    const matched = ids.some(v => v === normalizedOldPath || v.startsWith(normalizedOldPath + '/'));
                                    if (matched) {
                                        const oldFilePath = normalizeFilePath(f.path || f.key);
                                        const replacedPath = oldFilePath.replace(normalizedOldPath, newPath);
                                        const normalized = normalizeFileObject({
                                            ...f,
                                            key: replacedPath,
                                            path: replacedPath,
                                            name: replacedPath.split('/').pop()
                                        });
                                        return normalized || f;
                                    }
                                    return f;
                                });
                            }

                            const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();

                            const updatedFile = {
                                key: newPath,
                                path: newPath,
                                name: newFileName,
                                content: fileNode.content || session.pageContent || '',
                                type: 'file'
                            };

                            await sessionSync.renameSession(sessionKey, newPath, updatedFile);

                            console.log('[saveSessionEdit] 静态文件和会话已同步更新');

                            if (loadFileTree) {
                                await loadFileTree();
                            }
                            if (loadSessions) {
                                await loadSessions(true);
                            }
                        } else {
                            console.log('[saveSessionEdit] 路径未改变，仅更新会话元数据');
                            const updateData = {
                                key: sessionKey,
                                title: title,
                                url: url,
                                pageDescription: description
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
                        }
                    } else {
                        console.log('[saveSessionEdit] 未找到对应的文件节点，仅更新会话元数据');
                        const updateData = {
                            key: sessionKey,
                            title: title,
                            url: url,
                            pageDescription: description
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
                    }
                } else {
                    console.log('[saveSessionEdit] 标题未改变，仅更新 url 和 description');
                    const updateData = {
                        key: sessionKey,
                        title: title,
                        url: url,
                        pageDescription: description
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
                }

                if (session) {
                    session.title = title;
                    session.url = url;
                    session.pageDescription = description;
                    if (store.sessions && store.sessions.value) {
                        store.sessions.value = [...store.sessions.value];
                    }
                }

                if (activeSession && activeSession.value && activeSession.value.key === sessionKey) {
                    activeSession.value = {
                        ...activeSession.value,
                        title: title,
                        url: url,
                        pageDescription: description,
                        updatedAt: Date.now()
                    };
                    console.log('[saveSessionEdit] 已更新 activeSession，welcome-card 将自动刷新');
                }

                if (store.sessionEditVisible) {
                    store.sessionEditVisible.value = false;
                }

                if (window.showSuccess) {
                    window.showSuccess('会话已更新');
                }
            }, '保存会话编辑');
        },

        generateSessionDescription: async () => {
            return safeExecute(async () => {
                const sessionKey = store.sessionEditKey?.value;
                if (!sessionKey) {
                    throw new Error('会话Key不存在');
                }

                if (store.sessionEditGenerating && store.sessionEditGenerating.value) {
                    console.log('[generateSessionDescription] 正在生成中，跳过重复调用');
                    return;
                }

                if (store.sessionEditGenerating) {
                    store.sessionEditGenerating.value = true;
                }

                try {
                    let session = store.sessionEditData?.value;

                    if (!session) {
                        const sessions = store.sessions?.value || [];
                        session = sessions.find(s => s && s.key === sessionKey);
                    }

                    let pageContent = session?.pageContent || '';
                    const pageTitle = session?.title || '';

                    if (!session) {
                        console.warn('[generateSessionDescription] 会话不存在，无法生成描述');
                        throw new Error('会话不存在');
                    }

                    if (!pageContent || pageContent.trim() === '') {
                        console.warn('[generateSessionDescription] 会话缺少 pageContent，将仅使用标题生成描述');
                    } else {
                        console.log('[generateSessionDescription] 使用缓存的会话数据，pageContent长度:', pageContent.length);
                    }

                    if (!pageContent || pageContent.trim() === '') {
                        console.log('[generateSessionDescription] pageContent 仍为空，尝试从文件树获取');
                        try {
                            if (fileTree.value && fileTree.value.length > 0) {
                                const findNode = (nodes) => {
                                    if (!nodes || !Array.isArray(nodes)) return null;
                                    for (const node of nodes) {
                                        if (node.sessionKey === sessionKey || node.key === sessionKey) {
                                            return node;
                                        }
                                        if (node.children) {
                                            const found = findNode(node.children);
                                            if (found) return found;
                                        }
                                    }
                                    return null;
                                };

                                const node = findNode(fileTree.value);
                                if (node && node.content) {
                                    pageContent = node.content;
                                    console.log('[generateSessionDescription] 从文件树获取到内容，长度:', pageContent.length);
                                } else {
                                    if (node && node.key && loadFileByKey) {
                                        const file = await loadFileByKey(node.key);
                                        if (file && file.content) {
                                            pageContent = file.content;
                                            console.log('[generateSessionDescription] 通过 loadFileByKey 获取到内容，长度:', pageContent.length);
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('[generateSessionDescription] 从文件树获取内容失败:', e);
                        }
                    }

                    if (!pageContent || pageContent.trim() === '') {
                        console.warn('[generateSessionDescription] 无法获取页面上下文内容，仅使用标题');
                        pageContent = '';
                    }

                    let contextText = '';
                    if (pageContent && pageContent.trim()) {
                        contextText = `会话标题：${pageTitle}\n\n页面上下文内容：\n${pageContent.substring(0, 10000)}`;
                    } else {
                        contextText = `会话标题：${pageTitle}`;
                    }

                    console.log('[generateSessionDescription] 准备调用AI，上下文长度:', contextText.length);
                    console.log('[generateSessionDescription] 上下文内容预览:', contextText.substring(0, 200));

                    const { streamPromptJSON } = await import('/src/services/modules/crud.js');
                    const getPromptUrl = () => `${String(window.API_URL || '').trim().replace(/\/$/, '')}/`;

                    const descriptionResponse = await streamPromptJSON(getPromptUrl(), {
                        module_name: 'services.ai.chat_service',
                        method_name: 'chat',
                        parameters: {
                            system: '请根据以下会话信息生成一个简洁的描述（不超过200字），描述应该概括会话的主要内容和用途。',
                            user: contextText
                        }
                    });

                    console.log('[generateSessionDescription] AI响应:', descriptionResponse);

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
                        pageDescription = `会话：${pageTitle}`;
                    }

                    if (store.sessionEditDescription) {
                        store.sessionEditDescription.value = pageDescription.trim();
                    }

                    if (window.showSuccess) {
                        window.showSuccess('描述生成成功');
                    }
                } catch (error) {
                    console.error('[generateSessionDescription] 生成描述失败:', error);
                    if (window.showError) {
                        window.showError(`生成描述失败：${error.message || '未知错误'}`);
                    }
                } finally {
                    if (store.sessionEditGenerating) {
                        store.sessionEditGenerating.value = false;
                    }
                }
            }, 'AI生成描述');
        }
    };
};
