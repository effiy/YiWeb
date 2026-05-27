import { normalizeFilePath, extractTagsFromPath } from '../utils/fileFieldNormalizer.js';
import { TAGS, TIMEOUTS, VIEW_MODES } from '/src/views/aicr/constants/index.js';

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
        const base = normalizeFilePath(v);
        return base.trim().replace(/\s+/g, '_');
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

                session.tags = session.tags.filter(tag => tag !== TAGS.KNOWLEDGE);
                session.tags.unshift(TAGS.KNOWLEDGE);
                if (!Array.isArray(session.tags) || session.tags.length === 0 || session.tags[0] !== TAGS.KNOWLEDGE) {
                    session.tags = [TAGS.KNOWLEDGE, ...(session.tags || []).filter(tag => tag !== TAGS.KNOWLEDGE)];
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
                const validModes = [VIEW_MODES.TREE, VIEW_MODES.CARDS];
                if (!viewMode || !validModes.includes(mode)) return;

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

                if (previousMode !== mode) {
                    window.dispatchEvent(new CustomEvent('clearCodeHighlight'));
                }

                setTimeout(() => {
                    try {
                        const sidebar = document.querySelector('.aicr-sidebar');
                        if (!sidebar) return;
                        const w = store.sidebarWidth?.value;
                        if (typeof w === 'number' && w > 0) sidebar.style.width = `${w}px`;
                    } catch (_) { }
                }, TIMEOUTS.IMMEDIATE);
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
                    viewMode.value = VIEW_MODES.TREE;
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
                }, TIMEOUTS.IMMEDIATE);
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

                const { showGlobalLoading, hideGlobalLoading } = await import('/cdn/utils/ui/loading.js');
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

                const { showGlobalLoading, hideGlobalLoading } = await import('/cdn/utils/ui/loading.js');
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

                const { showGlobalLoading, hideGlobalLoading } = await import('/cdn/utils/ui/loading.js');
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
