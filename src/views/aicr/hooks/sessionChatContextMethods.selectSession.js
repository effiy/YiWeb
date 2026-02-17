import { normalizeFilePath } from '/src/utils/aicr/fileFieldNormalizer.js';

export const createSelectSessionForChat = ({
    store,
    setSelectedKey,
    selectedKey,
    activeSession,
    activeSessionLoading,
    activeSessionError,
    sessionChatInput,
    sessionContextEditorVisible,
    sessionContextDraft,
    sessionContextEnabled,
    sessionContextMode,
    ensureSessionContextScrollSync
}) => {
    return async (session, {
        toggleActive = true,
        openContextEditor = false,
        syncSelectedKey = true,
        fileKeyOverride = null
    } = {}) => {
        if (!session || !session.key) {
            if (window.showError) window.showError('无效的会话数据');
            return;
        }

        const targetSessionKey = String(session.key);

        if (toggleActive && activeSession?.value && String(activeSession.value.key || '') === targetSessionKey) {
            if (setSelectedKey) setSelectedKey(null);
            if (activeSession) activeSession.value = null;
            if (sessionChatInput) sessionChatInput.value = '';
            if (sessionContextEditorVisible) sessionContextEditorVisible.value = false;
            if (sessionContextDraft) sessionContextDraft.value = '';
            return;
        }

        try {
            if ((!store.sessions?.value || store.sessions.value.length === 0) && typeof store.loadSessions === 'function') {
                await store.loadSessions(false);
            }
        } catch (_) { }

        let fileKey = null;
        const findNodeBySessionKey = (nodes) => {
            if (!nodes) return null;
            const list = Array.isArray(nodes) ? nodes : [nodes];
            for (const node of list) {
                if (node && node.type === 'file' && String(node.sessionKey || '') === targetSessionKey) return node;
                if (node && node.children) {
                    const found = findNodeBySessionKey(node.children);
                    if (found) return found;
                }
            }
            return null;
        };

        const foundNode = findNodeBySessionKey(store.fileTree?.value);
        if (foundNode) {
            fileKey = foundNode.key;
        } else {
            const tags = Array.isArray(session.tags) ? session.tags : [];
            let currentPath = '';
            tags.forEach((folderName) => {
                if (!folderName || (folderName.toLowerCase && folderName.toLowerCase() === 'default')) return;
                currentPath = currentPath ? currentPath + '/' + folderName : folderName;
            });
            let fileName = session.title || 'Untitled';
            fileName = String(fileName).trim().replace(/\s+/g, '_').replace(/\//g, '-');
            fileKey = currentPath ? currentPath + '/' + fileName : fileName;
        }
        fileKey = normalizeFilePath(fileKey);

        if (fileKeyOverride != null && String(fileKeyOverride).trim()) {
            fileKey = normalizeFilePath(String(fileKeyOverride).trim());
        }

        if (syncSelectedKey) {
            if (setSelectedKey) {
                setSelectedKey(fileKey);
            } else if (selectedKey) {
                selectedKey.value = fileKey;
            }
        }

        if (activeSessionLoading) activeSessionLoading.value = true;
        if (activeSessionError) activeSessionError.value = null;
        if (activeSession) {
            const baseSession = { ...(session || {}), key: targetSessionKey };
            if (!baseSession.messages || !Array.isArray(baseSession.messages)) baseSession.messages = [];
            activeSession.value = baseSession;
        }

        try {
            let fullSession = null;
            try {
                const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                const sessionSync = getSessionSyncService();
                fullSession = await sessionSync.getSession(targetSessionKey);
                console.log('[selectSessionForChat] 从后端加载会话数据，消息数量:', fullSession?.messages?.length || 0);
            } catch (e) {
                console.warn('[selectSessionForChat] 加载完整会话数据失败，使用传入的会话数据:', e);
            }

            const sourceSession = fullSession || session;
            const normalized = { ...(sourceSession || {}), key: targetSessionKey };
            if (!normalized.messages || !Array.isArray(normalized.messages)) {
                normalized.messages = [];
            }
            normalized.messages = normalized.messages.map(m => ({
                type: m?.type === 'pet' ? 'pet' : 'user',
                message: String(m?.message || m?.content || ''),
                timestamp: typeof m?.timestamp === 'number' ? m.timestamp : Date.now(),
                imageDataUrl: m?.imageDataUrl,
                imageDataUrls: Array.isArray(m?.imageDataUrls) ? m.imageDataUrls : (m?.imageDataUrl ? [m.imageDataUrl] : [])
            }));

            if (activeSession) activeSession.value = normalized;

            if (sessionContextEnabled) {
                try {
                    const saved = localStorage.getItem('aicr_context_switch_enabled');
                    if (saved === '0') sessionContextEnabled.value = false;
                    if (saved === '1') sessionContextEnabled.value = true;
                } catch (_) { }
            }

            if (sessionContextMode) sessionContextMode.value = openContextEditor ? 'split' : (sessionContextMode.value || 'edit');
            let staticContent = '';
            let cleanPath = '';

            if (fileKey) {
                cleanPath = normalizeFilePath(fileKey || '');
                if (cleanPath.startsWith('static/')) {
                    cleanPath = cleanPath.substring(7);
                }
                cleanPath = normalizeFilePath(cleanPath);
            } else {
                const tags = Array.isArray(session.tags) ? session.tags : [];
                let currentPath = '';
                tags.forEach((folderName) => {
                    if (!folderName || (folderName.toLowerCase && folderName.toLowerCase() === 'default')) return;
                    currentPath = currentPath ? currentPath + '/' + folderName : folderName;
                });
                let fileName = session.title || 'Untitled';
                fileName = String(fileName).trim().replace(/\s+/g, '_').replace(/\//g, '-');
                cleanPath = currentPath ? currentPath + '/' + fileName : fileName;
                cleanPath = normalizeFilePath(cleanPath);
                if (cleanPath.startsWith('static/')) {
                    cleanPath = cleanPath.substring(7);
                }
                cleanPath = normalizeFilePath(cleanPath);
            }

            if (!cleanPath) {
                const pageDesc = session.pageDescription || '';
                if (pageDesc && pageDesc.includes('文件：')) {
                    cleanPath = pageDesc.replace('文件：', '').trim();
                    cleanPath = normalizeFilePath(cleanPath);
                    if (cleanPath.startsWith('static/')) {
                        cleanPath = cleanPath.substring(7);
                    }
                    cleanPath = normalizeFilePath(cleanPath);
                }
            }

            if (!cleanPath && targetSessionKey) {
                cleanPath = `session_${targetSessionKey}.txt`;
            }

            if (cleanPath && typeof store?.readFileContent === 'function') {
                try {
                    const res = await store.readFileContent(cleanPath);
                    if (res && res.type !== 'base64') {
                        staticContent = String(res.content || '');
                    }
                } catch (_) { }
            }
            if (sessionContextDraft) sessionContextDraft.value = String(staticContent || '');
            if (activeSession?.value) {
                activeSession.value = { ...activeSession.value, pageContent: String(staticContent || '') };
            }
            if (sessionContextEditorVisible) sessionContextEditorVisible.value = !!openContextEditor;
            ensureSessionContextScrollSync();
            if (sessionChatInput) sessionChatInput.value = '';

            setTimeout(() => {
                const el = document.getElementById('pet-chat-messages');
                if (el) el.scrollTop = el.scrollHeight;
            }, 0);
        } catch (e) {
            if (activeSessionError) activeSessionError.value = e?.message || '加载会话失败';
            if (window.showError) window.showError(activeSessionError?.value || '加载会话失败');
        } finally {
            if (activeSessionLoading) activeSessionLoading.value = false;
        }
    };
};
