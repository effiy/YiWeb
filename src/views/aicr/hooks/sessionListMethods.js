export const createSessionListMethods = ({
    store,
    safeExecute,
    safeExecuteAsync,
    getData,
    postData,
    buildServiceUrl,
    SERVICE_MODULE,
    selectSessionForChat,
    sessionSync
}) => {
    const {
        fileTree,
        selectedKey,
        expandedFolders,
        setSelectedKey,
        toggleFolder,
        loadSessions,
        viewMode,
        activeSession,
        activeSessionLoading,
        activeSessionError,
        sessionChatInput,
        sessionContextEditorVisible,
        sessionContextDraft,
        sessionBatchMode,
        selectedSessionKeys,
        loadFileByKey
    } = store || {};

    const normalizeKeyText = (v) => {
        if (!v) return '';
        let s = String(v).replace(/\\/g, '/');
        s = s.trim().replace(/\s+/g, '_');
        s = s.replace(/^\.\//, '');
        s = s.replace(/^\/+/, '');
        s = s.replace(/\/\/+/g, '/');
        return s;
    };

    const ensureArraySessionsFromJsonValue = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'object' && Array.isArray(value.sessions)) return value.sessions;
        return [value];
    };

    const downloadBlob = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const upsertSessions = async (sessionsData) => {
        let successCount = 0;
        let failCount = 0;

        const extractTagsFromPath = (filePath) => {
            if (!filePath) return [];
            const parts = String(filePath).split('/').filter(p => p && String(p).trim());
            if (parts.length <= 1) return [];
            return parts.slice(0, -1);
        };

        for (const rawSession of Array.isArray(sessionsData) ? sessionsData : []) {
            try {
                if (!rawSession || typeof rawSession !== 'object') {
                    failCount++;
                    continue;
                }

                const sessionKey = String(rawSession.key || rawSession.id || '').trim();
                if (!sessionKey) {
                    failCount++;
                    continue;
                }

                const session = { ...rawSession, key: sessionKey };

                if (!session.tags || !Array.isArray(session.tags)) {
                    session.tags = [];
                }

                session.tags = session.tags
                    .map(tag => (typeof tag === 'string' ? tag.trim() : String(tag || '').trim()))
                    .filter(tag => tag.length > 0);

                if (session.tags.length === 0 && session.pageDescription) {
                    const pathMatch = String(session.pageDescription).match(/文件[：:]\s*(.+)/);
                    if (pathMatch && pathMatch[1]) {
                        const filePath = String(pathMatch[1]).trim();
                        const extractedTags = extractTagsFromPath(filePath);
                        if (extractedTags.length > 0) {
                            session.tags = extractedTags;
                        }
                    }
                }

                const knowledgeTag = 'knowledge';
                session.tags = session.tags.filter(tag => tag !== knowledgeTag);
                session.tags.unshift(knowledgeTag);
                if (!Array.isArray(session.tags) || session.tags.length === 0 || session.tags[0] !== knowledgeTag) {
                    session.tags = [knowledgeTag, ...(session.tags || []).filter(tag => tag !== knowledgeTag)];
                }

                const sessionToSave = { ...session, tags: session.tags };

                const checkUrl = buildServiceUrl('query_documents', {
                    cname: 'sessions',
                    filter: { key: sessionToSave.key },
                    limit: 1
                });
                const checkResp = await getData(checkUrl, {}, false);
                const existingItem = checkResp?.data?.list?.[0];

                const payload = {
                    module_name: SERVICE_MODULE,
                    method_name: existingItem ? 'update_document' : 'create_document',
                    parameters: {
                        cname: 'sessions',
                        data: { ...sessionToSave, key: sessionToSave.key }
                    }
                };

                await postData(`${window.API_URL}/`, payload);
                successCount++;
            } catch (error) {
                console.error('[sessionListMethods] 导入会话失败:', rawSession?.key, error);
                failCount++;
            }
        }

        return { successCount, failCount };
    };

    return {
        setViewMode: async (mode) => {
            return safeExecute(async () => {
                mode = 'tree';
                if (!viewMode || !(mode === 'tree' || mode === 'tags')) return;

                const previousMode = viewMode.value;
                viewMode.value = mode;
                console.log('[useMethods] 视图模式已切换:', previousMode, '->', mode);

                if (activeSession?.value && store.sessions?.value) {
                    const activeKey = String(activeSession.value.key || '');
                    if (activeKey) {
                        const activeMessages = activeSession.value.messages;
                        if (Array.isArray(activeMessages)) {
                            const sessionIndex = store.sessions.value.findIndex(s => {
                                const sKey = String(s.key || s.id || '');
                                return sKey === activeKey;
                            });
                            if (sessionIndex !== -1) {
                                store.sessions.value[sessionIndex] = {
                                    ...store.sessions.value[sessionIndex],
                                    messages: activeMessages,
                                    updatedAt: activeSession.value.updatedAt || Date.now()
                                };
                                console.log('[useMethods] 已同步 activeSession 的消息到 store.sessions，消息数量:', activeMessages.length);
                            }
                        }
                    }
                }

                let pendingFileKey = null;
                if (previousMode === 'tree' && mode === 'tags') {
                    if (selectedKey && selectedKey.value) {
                        pendingFileKey = selectedKey.value;
                        console.log('[useMethods] 保存当前选中的文件Key:', pendingFileKey);
                    }
                }

                let pendingSessionKey = null;
                if (previousMode === 'tags' && mode === 'tree') {
                    if (activeSession && activeSession.value) {
                        const sessionKey = activeSession.value.key;
                        if (sessionKey) {
                            pendingSessionKey = String(sessionKey);
                            console.log('[useMethods] 保存当前选中的会话Key:', pendingSessionKey);
                        }
                    } else if (store.externalSelectedSessionKey && store.externalSelectedSessionKey.value) {
                        pendingSessionKey = String(store.externalSelectedSessionKey.value);
                        console.log('[useMethods] 保存当前选中的会话Key（从externalSelectedSessionKey）:', pendingSessionKey);
                    }
                }

                if (previousMode !== mode) {
                    try {
                        if (mode === 'tree' && typeof window.aicrApp?.abortSessionChatRequest === 'function') {
                            window.aicrApp.abortSessionChatRequest();
                        }
                    } catch (_) { }

                    if (!(previousMode === 'tags' && mode === 'tree' && pendingSessionKey)) {
                        if (typeof setSelectedKey === 'function') {
                            setSelectedKey(null);
                        } else if (selectedKey) {
                            selectedKey.value = null;
                        }
                    }

                    const hasPendingSync = (previousMode === 'tree' && mode === 'tags' && pendingFileKey) ||
                        (previousMode === 'tags' && mode === 'tree' && pendingSessionKey);
                    if (!hasPendingSync) {
                        if (activeSession) activeSession.value = null;
                        if (activeSessionError) activeSessionError.value = null;
                        if (activeSessionLoading) activeSessionLoading.value = false;
                        if (sessionChatInput) sessionChatInput.value = '';
                        if (sessionContextEditorVisible) sessionContextEditorVisible.value = false;
                        if (sessionContextDraft) sessionContextDraft.value = '';
                    }

                    window.dispatchEvent(new CustomEvent('clearCodeHighlight'));
                }

                if (mode === 'tags') {
                    const hasSessions = store.sessions && store.sessions.value && store.sessions.value.length > 0;

                    if (!hasSessions) {
                        console.log('[useMethods] 切换到标签视图，自动加载会话数据');
                        if (loadSessions && typeof loadSessions === 'function') {
                            try {
                                console.log('[useMethods] 开始加载会话数据...');
                                await loadSessions(true);
                                console.log('[useMethods] 会话数据加载完成');
                            } catch (error) {
                                console.error('[useMethods] 加载会话数据失败:', error);
                            }
                        } else if (store.loadSessions && typeof store.loadSessions === 'function') {
                            try {
                                console.log('[useMethods] 从 store 加载会话数据...');
                                await store.loadSessions(true);
                                console.log('[useMethods] 会话数据加载完成');
                            } catch (error) {
                                console.error('[useMethods] 加载会话数据失败:', error);
                            }
                        }
                    } else {
                        console.log('[useMethods] 切换到标签视图，会话数据已存在，跳过加载');
                    }

                    if (pendingFileKey) {
                        await new Promise(resolve => setTimeout(resolve, 100));

                        try {
                            const targetTreeKey = normalizeKeyText(pendingFileKey);

                            const findSessionKeyByTreeKey = (nodes, treeKey) => {
                                if (!nodes) return null;
                                const stack = Array.isArray(nodes) ? [...nodes] : [nodes];
                                while (stack.length > 0) {
                                    const n = stack.pop();
                                    if (!n) continue;
                                    const k = normalizeKeyText(n.key || n.path || n.id || '');
                                    if (k && k === treeKey) {
                                        return n.sessionKey != null ? String(n.sessionKey) : null;
                                    }
                                    if (Array.isArray(n.children) && n.children.length > 0) {
                                        for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]);
                                    }
                                }
                                return null;
                            };

                            const targetSessionKey = findSessionKeyByTreeKey(store.fileTree?.value, targetTreeKey);

                            if (targetSessionKey) {
                                console.log('[useMethods] 找到对应的sessionKey:', targetSessionKey);

                                const sessions = store.sessions?.value || [];
                                let targetSession = sessions.find(s => {
                                    const sessionKey = String(s.key || '');
                                    return sessionKey === targetSessionKey;
                                });

                                if (targetSession && activeSession?.value) {
                                    const activeKey = String(activeSession.value.key || '');
                                    if (activeKey === targetSessionKey) {
                                        const activeMessages = activeSession.value.messages;
                                        if (Array.isArray(activeMessages) && activeMessages.length > 0) {
                                            console.log('[useMethods] 使用 activeSession 的最新 messages，数量:', activeMessages.length);
                                            targetSession = { ...targetSession, messages: activeMessages };
                                        }
                                    }
                                }

                                if (targetSession) {
                                    console.log('[useMethods] 找到对应的会话，准备选中并滚动:', targetSession.key);

                                    if (store.externalSelectedSessionKey) {
                                        store.externalSelectedSessionKey.value = targetSessionKey;
                                    }

                                    if (typeof selectSessionForChat === 'function') {
                                        await selectSessionForChat(targetSession, { toggleActive: false, openContextEditor: false });
                                    }

                                    await new Promise(resolve => setTimeout(resolve, 200));

                                    const sessionKey = targetSession.key;
                                    const sessionItem = document.querySelector(`.session-item[data-key="${sessionKey}"], .session-item[data-session-key="${sessionKey}"]`);

                                    if (sessionItem) {
                                        sessionItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        sessionItem.classList.add('highlight-session');
                                        setTimeout(() => {
                                            sessionItem.classList.remove('highlight-session');
                                        }, 2000);

                                        console.log('[useMethods] 已滚动到会话位置:', sessionKey);
                                    } else {
                                        console.warn('[useMethods] 未找到会话项，尝试通过标题匹配');
                                        const sessionItems = document.querySelectorAll('.session-item');
                                        for (const item of sessionItems) {
                                            const titleElement = item.querySelector('.session-title-text');
                                            if (titleElement && targetSession.title) {
                                                const itemTitle = titleElement.textContent?.trim();
                                                const targetTitle = targetSession.title?.trim();
                                                if (itemTitle === targetTitle) {
                                                    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    item.classList.add('highlight-session');
                                                    setTimeout(() => {
                                                        item.classList.remove('highlight-session');
                                                    }, 2000);
                                                    console.log('[useMethods] 已滚动到会话位置（通过标题匹配）');
                                                    break;
                                                }
                                            }
                                        }
                                    }

                                    setTimeout(() => {
                                        if (store.externalSelectedSessionKey) {
                                            store.externalSelectedSessionKey.value = null;
                                        }
                                    }, 1000);
                                } else {
                                    console.warn('[useMethods] 未找到对应的会话，sessionKey:', targetSessionKey);
                                }
                            } else {
                                console.warn('[useMethods] 未找到对应的sessionKey，文件Key:', pendingFileKey);
                            }
                        } catch (error) {
                            console.error('[useMethods] 选中对应会话失败:', error);
                        }
                    }
                }

                if (mode === 'tree' && pendingSessionKey) {
                    await new Promise(resolve => setTimeout(resolve, 100));

                    try {
                        const findNodeBySessionKey = (nodes, targetSessionKey) => {
                            if (!nodes) return null;
                            const stack = Array.isArray(nodes) ? [...nodes] : [nodes];
                            while (stack.length > 0) {
                                const n = stack.pop();
                                if (!n) continue;
                                if (n.type === 'file') {
                                    const nodeSessionKey = String(n.sessionKey || '');
                                    if (nodeSessionKey === targetSessionKey) {
                                        return n;
                                    }
                                }
                                if (Array.isArray(n.children) && n.children.length > 0) {
                                    for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]);
                                }
                            }
                            return null;
                        };

                        const targetNode = findNodeBySessionKey(store.fileTree?.value, pendingSessionKey);

                        if (targetNode && targetNode.key) {
                            const targetFileKey = targetNode.key;
                            console.log('[useMethods] 找到对应的文件节点，准备选中并滚动:', targetFileKey);

                            const expandParentFolders = (nodes, targetKey) => {
                                if (!nodes) return false;
                                const stack = Array.isArray(nodes) ? [...nodes] : [nodes];

                                const findPath = (nodeList, target, currentPath = []) => {
                                    for (const node of nodeList) {
                                        if (!node) continue;
                                        const nodeKey = node.key || '';

                                        if (node.type === 'file' && nodeKey === target) {
                                            return [...currentPath];
                                        }

                                        if (node.type === 'folder' && node.children) {
                                            const newPath = [...currentPath, nodeKey];
                                            const found = findPath(node.children, target, newPath);
                                            if (found) return found;
                                        }
                                    }
                                    return null;
                                };

                                const folderPath = findPath(stack, targetKey);
                                if (folderPath && folderPath.length > 0) {
                                    folderPath.forEach(folderKey => {
                                        if (expandedFolders && !expandedFolders.value.has(folderKey)) {
                                            if (typeof toggleFolder === 'function') {
                                                toggleFolder(folderKey);
                                            } else if (expandedFolders.value instanceof Set) {
                                                expandedFolders.value.add(folderKey);
                                            }
                                        }
                                    });
                                }
                            };

                            expandParentFolders(store.fileTree?.value, targetFileKey);

                            if (typeof setSelectedKey === 'function') {
                                setSelectedKey(targetFileKey);
                            } else if (selectedKey) {
                                selectedKey.value = targetFileKey;
                            }

                            if (typeof loadFileByKey === 'function') {
                                try {
                                    console.log('[useMethods] 调用 loadFileByKey 加载文件内容:', targetFileKey);
                                    await loadFileByKey(targetFileKey);
                                } catch (error) {
                                    console.warn('[useMethods] loadFileByKey 调用失败:', error);
                                }
                            }

                            await new Promise(resolve => setTimeout(resolve, 300));

                            const fileItem = document.querySelector(`.file-tree-item.file-item[data-key="${targetFileKey}"], .file-tree-item.file-item[data-file-key="${targetFileKey}"]`);

                            if (fileItem) {
                                fileItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                fileItem.classList.add('highlight-file');
                                setTimeout(() => {
                                    fileItem.classList.remove('highlight-file');
                                }, 2000);

                                console.log('[useMethods] 已滚动到文件位置:', targetFileKey);
                            } else {
                                console.warn('[useMethods] 未找到文件项，尝试通过文件名匹配');
                                const fileItems = document.querySelectorAll('.file-tree-item.file-item');
                                for (const item of fileItems) {
                                    const fileNameElement = item.querySelector('.file-name');
                                    if (fileNameElement) {
                                        const itemName = fileNameElement.textContent?.trim();
                                        const targetName = targetNode.name || String(targetFileKey).split('/').pop();
                                        if (itemName === targetName) {
                                            const itemSessionKey = item.getAttribute('data-session-key');
                                            if (!itemSessionKey || itemSessionKey === pendingSessionKey) {
                                                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                item.classList.add('highlight-file');
                                                setTimeout(() => {
                                                    item.classList.remove('highlight-file');
                                                }, 2000);
                                                console.log('[useMethods] 已滚动到文件位置（通过文件名匹配）:', targetFileKey);
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            console.warn('[useMethods] 未找到对应的文件节点，sessionKey:', pendingSessionKey);
                        }
                    } catch (error) {
                        console.error('[useMethods] 选中对应文件失败:', error);
                    }
                }

                setTimeout(() => {
                    try {
                        const sidebar = document.querySelector('.aicr-sidebar');
                        if (!sidebar) return;
                        if (mode === 'tags') {
                            const w = store.sessionSidebarWidth?.value;
                            if (typeof w === 'number' && w > 0) sidebar.style.width = `${w}px`;
                        } else {
                            const w = store.sidebarWidth?.value;
                            if (typeof w === 'number' && w > 0) sidebar.style.width = `${w}px`;
                        }
                    } catch (_) { }
                }, 0);
            }, '视图模式切换');
        },

        handleSessionViewBack: () => {
            return safeExecute(() => {
                console.log('[useMethods] 从会话视图返回文件树视图');
                try {
                    if (typeof window.aicrApp?.abortSessionChatRequest === 'function') {
                        window.aicrApp.abortSessionChatRequest();
                    }
                } catch (_) { }
                if (viewMode) {
                    viewMode.value = 'tree';
                }

                if (typeof setSelectedKey === 'function') {
                    setSelectedKey(null);
                } else if (selectedKey) {
                    selectedKey.value = null;
                }

                if (activeSession) activeSession.value = null;
                if (activeSessionError) activeSessionError.value = null;
                if (activeSessionLoading) activeSessionLoading.value = false;
                if (sessionChatInput) sessionChatInput.value = '';
                if (sessionContextEditorVisible) sessionContextEditorVisible.value = false;
                if (sessionContextDraft) sessionContextDraft.value = '';

                window.dispatchEvent(new CustomEvent('clearCodeHighlight'));

                setTimeout(() => {
                    try {
                        const sidebar = document.querySelector('.aicr-sidebar');
                        const w = store.sidebarWidth?.value;
                        if (sidebar && typeof w === 'number' && w > 0) sidebar.style.width = `${w}px`;
                    } catch (_) { }
                }, 0);
            }, '返回文件树视图');
        },

        toggleSessionBatchMode: () => {
            return safeExecute(() => {
                if (sessionBatchMode) {
                    sessionBatchMode.value = !sessionBatchMode.value;
                    if (!sessionBatchMode.value && selectedSessionKeys) {
                        selectedSessionKeys.value.clear();
                    }
                    console.log('[useMethods] 会话批量选择模式:', sessionBatchMode.value);
                }
            }, '切换会话批量选择模式');
        },

        toggleSessionSelection: (sessionKey) => {
            return safeExecute(() => {
                if (!selectedSessionKeys || !selectedSessionKeys.value) {
                    console.warn('[useMethods] selectedSessionKeys 未初始化');
                    return;
                }

                if (selectedSessionKeys.value.has(sessionKey)) {
                    selectedSessionKeys.value.delete(sessionKey);
                } else {
                    selectedSessionKeys.value.add(sessionKey);
                }
                console.log('[useMethods] 会话选择状态已切换:', sessionKey, '选中数量:', selectedSessionKeys.value.size);
            }, '切换会话选择状态');
        },

        toggleSelectAllSessions: (ids, isSelect) => {
            return safeExecute(() => {
                if (!store.sessions || !store.sessions.value || !Array.isArray(store.sessions.value)) {
                    console.warn('[useMethods] 会话列表为空');
                    return;
                }

                if (!selectedSessionKeys || !selectedSessionKeys.value) {
                    console.warn('[useMethods] selectedSessionKeys 未初始化');
                    return;
                }

                let targetSessions = [];
                if (ids && Array.isArray(ids) && ids.length > 0) {
                    targetSessions = store.sessions.value.filter(s => ids.includes(s.key));
                } else {
                    targetSessions = store.sessions.value;
                }

                if (targetSessions.length === 0) {
                    return;
                }

                let shouldSelect = isSelect;

                if (typeof shouldSelect !== 'boolean') {
                    const allSelected = targetSessions.every(session => selectedSessionKeys.value.has(session.key));
                    shouldSelect = !allSelected;
                }

                if (shouldSelect) {
                    targetSessions.forEach(session => {
                        selectedSessionKeys.value.add(session.key);
                    });
                    console.log('[useMethods] 已全选，选中数量:', targetSessions.length);
                } else {
                    targetSessions.forEach(session => {
                        selectedSessionKeys.value.delete(session.key);
                    });
                    console.log('[useMethods] 已取消全选，取消数量:', targetSessions.length);
                }
            }, '全选/取消全选会话');
        },

        handleSessionImport: () => {
            return safeExecute(() => {
                const importInput = document.querySelector('input[type="file"][accept=".json,.zip"]');
                if (importInput) {
                    importInput.click();
                } else {
                    console.warn('[useMethods] 未找到导入文件输入框');
                    if (window.aicrApp && window.aicrApp.$refs && window.aicrApp.$refs.sessionImportInput) {
                        window.aicrApp.$refs.sessionImportInput.click();
                    }
                }
            }, '触发会话导入');
        },

        handleSessionImportFile: async (event) => {
            return safeExecuteAsync(async () => {
                const file = event?.target?.files?.[0];
                if (!file) {
                    console.warn('[useMethods] 未选择文件');
                    return;
                }

                console.log('[useMethods] 导入会话文件:', file.name);

                const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/ui/loading.js');
                showGlobalLoading('正在导入会话...');

                try {
                    let sessionsData = [];

                    if (file.name.endsWith('.json')) {
                        const fileContent = await file.text();
                        const value = JSON.parse(fileContent);
                        sessionsData = ensureArraySessionsFromJsonValue(value);
                    } else if (file.name.endsWith('.zip')) {
                        const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')).default || window.JSZip;
                        const zip = await JSZip.loadAsync(file);
                        const fileNames = Object.keys(zip.files);

                        for (const fileName of fileNames) {
                            if (!fileName.endsWith('.json')) continue;
                            const content = await zip.files[fileName].async('string');
                            const value = JSON.parse(content);
                            sessionsData.push(...ensureArraySessionsFromJsonValue(value));
                        }
                    }

                    const { successCount, failCount } = await upsertSessions(sessionsData);

                    if (loadSessions && typeof loadSessions === 'function') {
                        await loadSessions(true);
                    } else if (store.loadSessions && typeof store.loadSessions === 'function') {
                        await store.loadSessions(true);
                    }

                    hideGlobalLoading();

                    if (window.showSuccess) {
                        window.showSuccess(`导入完成：成功 ${successCount} 个，失败 ${failCount} 个`);
                    }
                } catch (error) {
                    try { hideGlobalLoading(); } catch (_) { }
                    console.error('[useMethods] 导入会话文件失败:', error);
                    if (window.showError) {
                        window.showError(`导入失败：${error.message || '未知错误'}`);
                    }
                }
            }, '处理会话导入文件');
        },

        handleSessionExport: async () => {
            return safeExecuteAsync(async () => {
                if (!store.sessions || !store.sessions.value || store.sessions.value.length === 0) {
                    console.warn('[useMethods] 没有可导出的会话');
                    if (window.showError) {
                        window.showError('没有可导出的会话');
                    }
                    return;
                }

                const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/ui/loading.js');
                showGlobalLoading('正在导出会话...');

                try {
                    let sessionsToExport = [];
                    if (sessionBatchMode && sessionBatchMode.value && selectedSessionKeys && selectedSessionKeys.value.size > 0) {
                        sessionsToExport = store.sessions.value.filter(s => selectedSessionKeys.value.has(s.key));
                    } else {
                        sessionsToExport = store.sessions.value;
                    }

                    if (sessionsToExport.length === 0) {
                        hideGlobalLoading();
                        if (window.showError) window.showError('请先选择要导出的会话');
                        return;
                    }

                    const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')).default || window.JSZip;
                    const zip = new JSZip();

                    sessionsToExport.forEach(session => {
                        let fileName = session.title || session.key || 'Untitled';
                        fileName = String(fileName).trim().replace(/\s+/g, '_').replace(/[\\/:*?"<>|]/g, '_');
                        const content = JSON.stringify(session, null, 2);
                        zip.file(`${fileName}.json`, content);
                    });

                    const content = await zip.generateAsync({ type: 'blob' });
                    downloadBlob(content, `sessions_export_${new Date().toISOString().slice(0, 10)}.zip`);

                    hideGlobalLoading();
                    if (window.showSuccess) window.showSuccess(`成功导出 ${sessionsToExport.length} 个会话`);
                } catch (error) {
                    try { hideGlobalLoading(); } catch (_) { }
                    console.error('[useMethods] 导出会话失败:', error);
                    if (window.showError) window.showError(`导出失败：${error.message || '未知错误'}`);
                }
            }, '处理会话导出');
        },

        handleBatchDeleteSessions: async () => {
            return safeExecuteAsync(async () => {
                if (!selectedSessionKeys || !selectedSessionKeys.value || selectedSessionKeys.value.size === 0) {
                    if (window.showError) {
                        window.showError('请先选择要删除的会话');
                    }
                    return;
                }

                const sessionKeys = Array.from(selectedSessionKeys.value);
                const treeFileSessionKeys = [];
                const allowedSessionKeys = [];

                if (store.sessions && store.sessions.value && Array.isArray(store.sessions.value)) {
                    for (const sessionKey of sessionKeys) {
                        const session = store.sessions.value.find(s => s && s.key === sessionKey);
                        if (session && session.url && String(session.url).startsWith('aicr-session://')) {
                            treeFileSessionKeys.push(sessionKey);
                        } else {
                            allowedSessionKeys.push(sessionKey);
                        }
                    }
                } else if (sessionSync) {
                    for (const sessionKey of sessionKeys) {
                        try {
                            const session = await sessionSync.getSession(sessionKey);
                            if (session && session.url && String(session.url).startsWith('aicr-session://')) {
                                treeFileSessionKeys.push(sessionKey);
                            } else {
                                allowedSessionKeys.push(sessionKey);
                            }
                        } catch (e) {
                            allowedSessionKeys.push(sessionKey);
                        }
                    }
                } else {
                    allowedSessionKeys.push(...sessionKeys);
                }

                if (treeFileSessionKeys.length > 0) {
                    if (window.showError) {
                        window.showError(`不允许在会话视图删除树文件类型的会话（已过滤 ${treeFileSessionKeys.length} 个）`);
                    }
                    for (const treeSessionKey of treeFileSessionKeys) {
                        if (selectedSessionKeys && selectedSessionKeys.value) {
                            selectedSessionKeys.value.delete(treeSessionKey);
                        }
                    }
                    if (allowedSessionKeys.length === 0) {
                        return;
                    }
                }

                const count = allowedSessionKeys.length;
                const confirmMessage = `确定要删除选中的 ${count} 个会话吗？此操作不可撤销。`;
                if (!confirm(confirmMessage)) {
                    return;
                }

                const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/ui/loading.js');
                showGlobalLoading(`正在删除 ${count} 个会话...`);

                try {
                    let deletedCount = 0;
                    let failedCount = 0;

                    for (const skey of allowedSessionKeys) {
                        try {
                            if (!sessionSync) throw new Error('SessionSyncService 不可用');
                            await sessionSync.deleteSession(skey);
                            deletedCount++;
                        } catch (e) {
                            console.error(`[useMethods] 删除会话失败: ${skey}`, e);
                            failedCount++;
                        }
                    }

                    if (deletedCount > 0) {
                        if (selectedSessionKeys) {
                            selectedSessionKeys.value.clear();
                        }

                        if (sessionBatchMode) {
                            sessionBatchMode.value = false;
                        }

                        if (loadSessions && typeof loadSessions === 'function') {
                            await loadSessions(true);
                        } else if (store && store.loadSessions && typeof store.loadSessions === 'function') {
                            await store.loadSessions(true);
                        }

                        hideGlobalLoading();

                        if (window.showSuccess) {
                            let successMessage = `已成功删除 ${deletedCount} 个会话`;
                            if (treeFileSessionKeys.length > 0) {
                                successMessage += `（已跳过 ${treeFileSessionKeys.length} 个树文件类型的会话）`;
                            }
                            if (failedCount > 0) {
                                successMessage += `，其中 ${failedCount} 个删除失败`;
                            }
                            window.showSuccess(successMessage);
                        }
                    } else {
                        throw new Error('批量删除失败');
                    }
                } catch (error) {
                    hideGlobalLoading();
                    console.error('[useMethods] 批量删除会话失败:', error);
                    if (window.showError) {
                        window.showError(`批量删除失败：${error.message || '未知错误'}`);
                    }
                }
            }, '批量删除会话');
        }
    };
};
