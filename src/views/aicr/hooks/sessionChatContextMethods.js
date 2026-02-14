export const createSessionChatContextMethods = ({
    store,
    safeExecute,
    postData,
    SERVICE_MODULE,
    renderMarkdownHtml,
    renderStreamingHtml,
    getPromptUrl
}) => {
    const {
        files,
        selectedKey,
        setSelectedKey,
        loadFileByKey,
        activeSession,
        activeSessionLoading,
        activeSessionError,
        sessionChatInput,
        sessionChatDraftImages,
        sessionChatLastDraftText,
        sessionChatLastDraftImages,
        sessionChatSending,
        sessionChatAbortController,
        sessionChatStreamingTargetTimestamp,
        sessionChatStreamingType,
        sessionChatCopyFeedback,
        sessionChatRegenerateFeedback,
        sessionContextEnabled,
        sessionContextDraft,
        sessionContextMode,
        sessionContextEditorVisible,
        sessionContextUserEdited,
        sessionContextOptimizing,
        sessionContextOptimizeStatus,
        sessionContextOptimizeBackup,
        sessionContextUndoVisible,
        sessionContextTranslating,
        sessionContextSaving,
        sessionContextSaveStatus,
        sessionContextRefreshConfirmUntil,
        sessionContextRefreshStatus,
        sessionSettingsVisible,
        sessionBotModel,
        sessionBotSystemPrompt,
        sessionBotModelDraft,
        sessionBotSystemPromptDraft,
        weChatSettingsVisible,
        weChatRobots,
        weChatRobotsDraft,
        sessionMessageEditorVisible,
        sessionMessageEditorDraft,
        sessionMessageEditorMode,
        sessionMessageEditorIndex,
    } = store || {};
 
    const defaultSessionBotSystemPrompt = '你是一个专业、简洁且可靠的 AI 助手。';
    let _sessionChatIsComposing = false;
    let _sessionChatCompositionEndTime = 0;
    const _SESSION_CHAT_COMPOSITION_END_DELAY = 100;
 
    const _sessionContextTimeouts = new Set();
    let _sessionContextKeydownHandler = null;
    let _sessionContextPreviewClickHandler = null;
    let __aicrImagePreviewRoot = null;
 
    let sessionContextScrollSyncCleanup = null;
    let sessionMessageEditorScrollSyncCleanup = null;
 
    const _escapeHtml = (v) => {
        if (typeof v !== 'string' && v == null) return '';
        const unescaped = String(v)
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&');

        return unescaped
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };
 
    const _insertTextAtTextarea = (textarea, text, fallbackValue = '') => {
        try {
            const t = textarea;
            if (!t || typeof t.selectionStart !== 'number' || typeof t.selectionEnd !== 'number') {
                return String(fallbackValue || '') + String(text || '');
            }
            const value = typeof t.value === 'string' ? t.value : String(fallbackValue || '');
            const start = t.selectionStart;
            const end = t.selectionEnd;
            const before = value.slice(0, start);
            const after = value.slice(end);
            const next = before + String(text || '') + after;
            try {
                t.value = next;
                const nextPos = start + String(text || '').length;
                t.selectionStart = nextPos;
                t.selectionEnd = nextPos;
            } catch (_) { }
            return next;
        } catch (_) {
            return String(fallbackValue || '') + String(text || '');
        }
    };
 
    const _isAbortError = (e) => {
        try {
            if (!e) return false;
            if (e.name === 'AbortError') return true;
            const msg = typeof e.message === 'string' ? e.message : '';
            return msg.toLowerCase().includes('aborted');
        } catch (_) {
            return false;
        }
    };

    const _truncateText = (v, maxLen) => {
        const s = String(v ?? '');
        const limit = Math.max(0, Number(maxLen) || 0);
        if (!limit || s.length <= limit) return s;
        return `${s.slice(0, limit)}\n\n...(内容已截断)`;
    };

    const _buildSessionChatHistoryText = (messages, endIndexExclusive) => {
        const list = Array.isArray(messages) ? messages : [];
        const end = Number(endIndexExclusive);
        const upto = Number.isFinite(end) ? Math.max(0, Math.min(list.length, end)) : list.length;
        const cleaned = list
            .slice(0, upto)
            .filter(m => m && (String(m.message ?? m.content ?? '').trim() || (m.imageDataUrl || (Array.isArray(m.imageDataUrls) && m.imageDataUrls.length > 0))))
            .slice(-30)
            .map(m => {
                const role = m.type === 'pet' ? '助手' : '用户';
                const contentText = String(m.message ?? m.content ?? '').trim();
                const imageCount = Array.isArray(m.imageDataUrls) ? m.imageDataUrls.length : (m.imageDataUrl ? 1 : 0);
                const content = (() => {
                    if (contentText) return contentText;
                    if (imageCount > 0) return imageCount === 1 ? '[图片]' : `[图片 x${imageCount}]`;
                    return '';
                })();
                return `${role}：${content}`;
            })
            .join('\n\n');
        return cleaned;
    };

    const _buildSessionChatUserPrompt = ({ text, images, pageContent, includeContext, historyText }) => {
        const imageList = Array.isArray(images) ? images.filter(Boolean) : [];
        if (imageList.length > 0) {
            return String(text || '用户发送了图片，请结合图片内容回答。').trim();
        }
        const current = String(text || '').trim() || '请继续。';
        const parts = [];
        const ctx = String(pageContent || '').trim();
        const hist = String(historyText || '').trim();
        if (includeContext && ctx) {
            parts.push(`## 页面上下文\n\n${_truncateText(ctx, 12000)}`);
        }
        if (hist) {
            parts.push(`## 会话历史\n\n${_truncateText(hist, 12000)}`);
        }
        parts.push(`## 当前消息\n\n${_truncateText(current, 8000)}`);
        return parts.join('\n\n');
    };

    const _sessionChatMessageKey = (m, idx) => {
        const ts = typeof m?.timestamp === 'number' ? m.timestamp : null;
        if (typeof ts === 'number' && Number.isFinite(ts)) return `ts_${ts}`;
        const i = Number(idx);
        if (Number.isFinite(i)) return `idx_${i}`;
        return `k_${Date.now()}`;
    };

    const _setFeedbackFlag = (refMap, key, durationMs) => {
        try {
            if (!refMap) return;
            const now = Date.now();
            const expiresAt = now + Math.max(0, Number(durationMs) || 0);
            const current = refMap.value && typeof refMap.value === 'object' ? refMap.value : {};
            refMap.value = { ...current, [key]: expiresAt };
            setTimeout(() => {
                try {
                    const cur = refMap.value && typeof refMap.value === 'object' ? refMap.value : {};
                    if (cur[key] !== expiresAt) return;
                    const next = { ...cur };
                    delete next[key];
                    refMap.value = next;
                } catch (_) { }
            }, Math.max(0, expiresAt - Date.now()) + 20);
        } catch (_) { }
    };

    const _isStreamingMessage = (m) => {
        try {
            const sending = !!sessionChatSending?.value;
            if (!sending) return false;
            const targetTs = sessionChatStreamingTargetTimestamp?.value;
            if (typeof targetTs !== 'number' || !Number.isFinite(targetTs)) return false;
            const ts = typeof m?.timestamp === 'number' ? m.timestamp : null;
            if (typeof ts !== 'number' || !Number.isFinite(ts)) return false;
            return ts === targetTs;
        } catch (_) {
            return false;
        }
    };

    const _scrollSessionChatToIndex = (idx) => {
        try {
            const i = Number(idx);
            if (!Number.isFinite(i) || i < 0) return;
            setTimeout(() => {
                try {
                    const el = document.querySelector(`[data-chat-idx="${i}"]`);
                    if (el && typeof el.scrollIntoView === 'function') {
                        el.scrollIntoView({ block: 'nearest' });
                        return;
                    }
                    const container = document.getElementById('pet-chat-messages');
                    if (container) container.scrollTop = container.scrollHeight;
                } catch (_) { }
            }, 0);
        } catch (_) { }
    };

    const _saveActiveSession = async (nextSession) => {
        try {
            if (!nextSession) return;
            const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
            const sessionSync = getSessionSyncService();
            await sessionSync.saveSession(nextSession);
        } catch (_) { }
    };

    const _moveSessionChatMessageBlock = async (idx, direction) => {
        const s = activeSession?.value;
        if (!s) return;
        const messages = Array.isArray(s.messages) ? [...s.messages] : [];
        const i = Number(idx);
        if (!Number.isFinite(i) || i < 0 || i >= messages.length) return;

        if (String(direction) === 'up') {
            if (i <= 0) return;
            const nextMessages = [...messages];
            const tmp = nextMessages[i - 1];
            nextMessages[i - 1] = nextMessages[i];
            nextMessages[i] = tmp;
            const now = Date.now();
            const nextSession = { ...s, messages: nextMessages, updatedAt: now, lastAccessTime: now };
            activeSession.value = nextSession;
            await _saveActiveSession(nextSession);
            _scrollSessionChatToIndex(i - 1);
            return;
        }

        if (String(direction) === 'down') {
            if (i >= messages.length - 1) return;
            const nextMessages = [...messages];
            const tmp = nextMessages[i + 1];
            nextMessages[i + 1] = nextMessages[i];
            nextMessages[i] = tmp;
            const now = Date.now();
            const nextSession = { ...s, messages: nextMessages, updatedAt: now, lastAccessTime: now };
            activeSession.value = nextSession;
            await _saveActiveSession(nextSession);
            _scrollSessionChatToIndex(i + 1);
        }
    };

    const _openAicrImagePreview = (src) => {
        try {
            const url = String(src || '').trim();
            if (!url) return;
            if (!__aicrImagePreviewRoot) {
                const root = document.createElement('div');
                root.id = 'aicr-image-preview';
                root.style.cssText = 'position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.72);backdrop-filter:blur(2px)';
                root.innerHTML = `
                    <div style="position:relative;max-width:min(92vw,1200px);max-height:92vh;">
                        <img class="aicr-image-preview-img" style="max-width:92vw;max-height:92vh;border-radius:12px;box-shadow:0 20px 80px rgba(0,0,0,.55);background:rgba(255,255,255,0.06);" />
                        <button type="button" class="aicr-image-preview-close" style="position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:12px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.35);color:#fff;font-size:18px;cursor:pointer;">✕</button>
                    </div>
                `;
                root.addEventListener('click', (e) => {
                    try {
                        const t = e && e.target;
                        const close = t && t.closest ? t.closest('.aicr-image-preview-close') : null;
                        if (close) {
                            _closeAicrImagePreview();
                            return;
                        }
                        const img = t && t.closest ? t.closest('.aicr-image-preview-img') : null;
                        if (!img) _closeAicrImagePreview();
                    } catch (_) { }
                });
                document.body.appendChild(root);
                __aicrImagePreviewRoot = root;
            }
            const img = __aicrImagePreviewRoot.querySelector('.aicr-image-preview-img');
            if (img) img.src = url;
            __aicrImagePreviewRoot.style.display = 'flex';
        } catch (_) { }
    };
 
    const _closeAicrImagePreview = () => {
        try {
            if (__aicrImagePreviewRoot) __aicrImagePreviewRoot.style.display = 'none';
        } catch (_) { }
    };
 
    const _isAicrImagePreviewOpen = () => {
        try {
            return !!(__aicrImagePreviewRoot && __aicrImagePreviewRoot.style.display === 'flex');
        } catch (_) {
            return false;
        }
    };
 
    const _sessionContextSetStatus = (refObj, value, resetMs = 0, resetValue = '') => {
        try {
            if (!refObj) return;
            refObj.value = value;
            const ms = Number(resetMs);
            if (Number.isFinite(ms) && ms > 0) {
                const t = setTimeout(() => {
                    try { refObj.value = resetValue; } catch (_) { }
                }, ms);
                _sessionContextTimeouts.add(t);
            }
        } catch (_) { }
    };
 
    const cleanupSessionContextScrollSync = () => {
        if (typeof sessionContextScrollSyncCleanup === 'function') {
            sessionContextScrollSyncCleanup();
        }
        sessionContextScrollSyncCleanup = null;
    };
 
    const cleanupSessionMessageEditorScrollSync = () => {
        if (typeof sessionMessageEditorScrollSyncCleanup === 'function') {
            sessionMessageEditorScrollSyncCleanup();
        }
        sessionMessageEditorScrollSyncCleanup = null;
    };

    const setupSessionContextScrollSync = () => {
        cleanupSessionContextScrollSync();
 
        const modal = document.querySelector('.aicr-session-context-modal-body');
        if (!modal) return;
 
        const split = modal.querySelector('.aicr-session-context-split');
        if (!split) return;
 
        const textarea = split.querySelector('.aicr-session-context-textarea');
        const preview = split.querySelector('.aicr-session-context-preview');
        if (!(textarea instanceof HTMLElement) || !(preview instanceof HTMLElement)) return;
 
        let lock = null;
        let rafId = 0;
 
        const syncScroll = (fromEl, toEl) => {
            const fromMax = Math.max(0, (fromEl.scrollHeight || 0) - (fromEl.clientHeight || 0));
            const toMax = Math.max(0, (toEl.scrollHeight || 0) - (toEl.clientHeight || 0));
            const ratio = fromMax > 0 ? (fromEl.scrollTop / fromMax) : 0;
            toEl.scrollTop = ratio * toMax;
        };
 
        const scheduleUnlock = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                lock = null;
                rafId = 0;
            });
        };
 
        const onTextareaScroll = () => {
            if (lock === 'preview') return;
            lock = 'textarea';
            syncScroll(textarea, preview);
            scheduleUnlock();
        };
 
        const onPreviewScroll = () => {
            if (lock === 'textarea') return;
            lock = 'preview';
            syncScroll(preview, textarea);
            scheduleUnlock();
        };
 
        textarea.addEventListener('scroll', onTextareaScroll, { passive: true });
        preview.addEventListener('scroll', onPreviewScroll, { passive: true });
 
        sessionContextScrollSyncCleanup = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = 0;
            lock = null;
            textarea.removeEventListener('scroll', onTextareaScroll);
            preview.removeEventListener('scroll', onPreviewScroll);
        };
    };
 
    const setupSessionMessageEditorScrollSync = () => {
        cleanupSessionMessageEditorScrollSync();

        const root = document.querySelector('.aicr-session-context-modal[aria-label="消息编辑器"]');
        const modal = root ? root.querySelector('.aicr-session-context-modal-body') : null;
        if (!modal) return;

        const split = modal.querySelector('.aicr-session-context-split');
        if (!split) return;

        const textarea = split.querySelector('.aicr-session-context-textarea');
        const preview = split.querySelector('.aicr-session-context-preview');
        if (!(textarea instanceof HTMLElement) || !(preview instanceof HTMLElement)) return;

        let rafId = 0;

        const syncScroll = () => {
            const fromMax = Math.max(0, (textarea.scrollHeight || 0) - (textarea.clientHeight || 0));
            const toMax = Math.max(0, (preview.scrollHeight || 0) - (preview.clientHeight || 0));
            const ratio = fromMax > 0 ? (textarea.scrollTop / fromMax) : 0;
            preview.scrollTop = ratio * toMax;
        };

        const onTextareaScroll = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                rafId = 0;
                syncScroll();
            });
        };

        textarea.addEventListener('scroll', onTextareaScroll, { passive: true });

        sessionMessageEditorScrollSyncCleanup = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = 0;
            textarea.removeEventListener('scroll', onTextareaScroll);
        };
    };

    const ensureSessionContextScrollSync = () => {
        const visible = !!sessionContextEditorVisible?.value;
        const mode = String(sessionContextMode?.value || '').toLowerCase();
        if (!visible || mode !== 'split') {
            cleanupSessionContextScrollSync();
            return;
        }
 
        const schedule = () => setupSessionContextScrollSync();
        if (typeof Vue !== 'undefined' && typeof Vue.nextTick === 'function') {
            Vue.nextTick(schedule);
            return;
        }
        setTimeout(schedule, 0);
    };
 
    const ensureSessionMessageEditorScrollSync = () => {
        const visible = !!sessionMessageEditorVisible?.value;
        const mode = String(sessionMessageEditorMode?.value || '').toLowerCase();
        if (!visible || mode !== 'split') {
            cleanupSessionMessageEditorScrollSync();
            return;
        }

        const schedule = () => setupSessionMessageEditorScrollSync();
        if (typeof Vue !== 'undefined' && typeof Vue.nextTick === 'function') {
            Vue.nextTick(schedule);
            return;
        }
        setTimeout(schedule, 0);
    };

    const _closeSessionContextEditorInternal = () => {
        try {
            if (sessionContextEditorVisible) sessionContextEditorVisible.value = false;
            if (sessionContextDraft) sessionContextDraft.value = '';
            if (sessionContextMode) sessionContextMode.value = sessionContextMode.value || 'edit';
            if (sessionContextOptimizeBackup) sessionContextOptimizeBackup.value = '';
            if (sessionContextUndoVisible) sessionContextUndoVisible.value = false;
            if (sessionContextUserEdited) sessionContextUserEdited.value = false;
            if (sessionContextRefreshConfirmUntil) sessionContextRefreshConfirmUntil.value = 0;
            if (sessionContextRefreshStatus) sessionContextRefreshStatus.value = '';
            if (sessionContextOptimizeStatus) sessionContextOptimizeStatus.value = '';
            if (sessionContextSaveStatus) sessionContextSaveStatus.value = '';
            if (sessionContextTranslating) sessionContextTranslating.value = '';
            if (sessionContextOptimizing) sessionContextOptimizing.value = false;
            if (sessionContextSaving) sessionContextSaving.value = false;
            cleanupSessionContextScrollSync();
            try {
                if (_sessionContextKeydownHandler) {
                    document.removeEventListener('keydown', _sessionContextKeydownHandler, true);
                    _sessionContextKeydownHandler = null;
                }
            } catch (_) { }
            try {
                if (_sessionContextPreviewClickHandler) {
                    document.removeEventListener('click', _sessionContextPreviewClickHandler, true);
                    _sessionContextPreviewClickHandler = null;
                }
            } catch (_) { }
            try {
                _closeAicrImagePreview();
            } catch (_) { }
        } catch (_) { }
    };
 
    const _sessionContextChatOnce = async ({ system, user }) => {
        const { streamPromptJSON } = await import('/src/services/modules/crud.js');
        const promptUrl = typeof getPromptUrl === 'function'
            ? getPromptUrl()
            : `${String(window.API_URL || '').trim().replace(/\/$/, '')}/`;
        const res = await streamPromptJSON(promptUrl, {
            module_name: 'services.ai.chat_service',
            method_name: 'chat',
            parameters: {
                system: String(system || '').trim(),
                user: String(user || '').trim(),
                stream: false,
                ...(String(sessionBotModel?.value || '').trim()
                    ? { model: String(sessionBotModel.value || '').trim() }
                    : {})
            }
        });
        const text = String(res?.data?.message || res?.data?.content || res?.data || '').trim();
        return text;
    };
 
    const loadSessionBotSettings = () => {
        try {
            if (sessionBotModel) {
                const model = localStorage.getItem('aicr_session_bot_model');
                if (model != null) sessionBotModel.value = String(model || '').trim();
            }
            if (sessionBotSystemPrompt) {
                const prompt = localStorage.getItem('aicr_session_bot_system_prompt');
                if (prompt != null) {
                    const normalized = String(prompt || '').trim();
                    sessionBotSystemPrompt.value = normalized || defaultSessionBotSystemPrompt;
                }
            }
        } catch (_) { }
    };
 
    const persistSessionBotSettings = () => {
        try {
            if (sessionBotModel) localStorage.setItem('aicr_session_bot_model', String(sessionBotModel.value || '').trim());
            if (sessionBotSystemPrompt) localStorage.setItem('aicr_session_bot_system_prompt', String(sessionBotSystemPrompt.value || '').trim());
        } catch (_) { }
    };
 
    const loadWeChatSettings = () => {
        try {
            const raw = localStorage.getItem('aicr_wechat_robots');
            const arr = raw ? JSON.parse(raw) : [];
            if (Array.isArray(arr)) weChatRobots.value = arr.filter(r => r && typeof r === 'object');
            if ((!Array.isArray(weChatRobots.value) || weChatRobots.value.length === 0)) {
                const enabledRaw = localStorage.getItem('aicr_wechat_enabled');
                const webhookRaw = localStorage.getItem('aicr_wechat_webhook');
                const autoRaw = localStorage.getItem('aicr_wechat_auto_forward');
                const enabled = enabledRaw === 'true';
                const webhook = String(webhookRaw || '').trim();
                const autoForward = autoRaw === 'true';
                if (webhook) {
                    weChatRobots.value = [{
                        id: 'wr_' + Date.now(),
                        name: '机器人',
                        webhook,
                        enabled,
                        autoForward
                    }];
                }
            }
        } catch (_) { }
    };
 
    const persistWeChatSettings = () => {
        try {
            const arr = Array.isArray(weChatRobots?.value) ? weChatRobots.value : [];
            localStorage.setItem('aicr_wechat_robots', JSON.stringify(arr));
        } catch (_) { }
    };
 
    loadSessionBotSettings();
    loadWeChatSettings();
 
    const selectSessionForChat = async (session, { toggleActive = true, openContextEditor = false, syncSelectedKey = true, fileKeyOverride = null } = {}) => {
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
 
        if (fileKeyOverride != null && String(fileKeyOverride).trim()) {
            fileKey = String(fileKeyOverride).trim();
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
 
            const apiBase = (window.API_URL && /^https?:\/\//i.test(window.API_URL)) ? String(window.API_URL).replace(/\/+$/, '') : '';
            let staticContent = '';
 
            if (apiBase) {
                let cleanPath = '';
 
                if (fileKey) {
                    cleanPath = String(fileKey || '').replace(/\\/g, '/').replace(/^\/+/, '');
                    if (cleanPath.startsWith('static/')) {
                        cleanPath = cleanPath.substring(7);
                    }
                    cleanPath = cleanPath.replace(/^\/+/, '');
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
                    cleanPath = cleanPath.replace(/\\/g, '/').replace(/^\/+/, '');
                    if (cleanPath.startsWith('static/')) {
                        cleanPath = cleanPath.substring(7);
                    }
                    cleanPath = cleanPath.replace(/^\/+/, '');
                }
 
                if (!cleanPath) {
                    const pageDesc = session.pageDescription || '';
                    if (pageDesc && pageDesc.includes('文件：')) {
                        cleanPath = pageDesc.replace('文件：', '').trim();
                        cleanPath = cleanPath.replace(/\\/g, '/').replace(/^\/+/, '');
                        if (cleanPath.startsWith('static/')) {
                            cleanPath = cleanPath.substring(7);
                        }
                        cleanPath = cleanPath.replace(/^\/+/, '');
                    }
                }
 
                if (!cleanPath && targetSessionKey) {
                    cleanPath = `session_${targetSessionKey}.txt`;
                }
 
                if (cleanPath) {
                    try {
                        console.log('[selectSessionForChat] 调用 read-file 接口，路径:', cleanPath);
                        const res = await fetch(`${apiBase}/read-file`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ target_file: cleanPath })
                        });
                        if (res.ok) {
                            const json = await res.json();
                            if ((json.code === 200 || json.code === 0) && json.data && json.data.content) {
                                if (json.data.type !== 'base64') {
                                    staticContent = json.data.content;
                                    console.log('[selectSessionForChat] read-file 接口调用成功，内容长度:', staticContent.length);
                                } else {
                                    console.log('[selectSessionForChat] read-file 接口返回 base64 类型，跳过');
                                }
                            } else {
                                console.warn('[selectSessionForChat] read-file 接口返回异常:', json);
                            }
                        } else {
                            console.warn('[selectSessionForChat] read-file 接口调用失败，状态码:', res.status);
                        }
                    } catch (error) {
                        console.error('[selectSessionForChat] read-file 接口调用异常:', error);
                    }
                } else {
                    console.warn('[selectSessionForChat] 无法确定文件路径，跳过 read-file 接口调用');
                }
            } else {
                console.warn('[selectSessionForChat] API_URL 未配置，跳过 read-file 接口调用');
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
 
    const formatDate = (date) => {
        try {
            if (!date || !(date instanceof Date)) {
                if (typeof date === 'number') {
                    date = new Date(date);
                } else {
                    return '';
                }
            }
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hour = String(date.getHours()).padStart(2, '0');
            const minute = String(date.getMinutes()).padStart(2, '0');
            return `${year}/${month}/${day} ${hour}:${minute}`;
        } catch (_) {
            return '';
        }
    };
 
    const buildWelcomeCardHtml = (pageInfo, session = null) => {
        try {
            const sessionTags = session && Array.isArray(session.tags) ? session.tags.filter(t => t && t.trim()) : [];
            const sessionMessages = session && Array.isArray(session.messages) ? session.messages : [];
            const sessionCreatedAt = session && session.createdAt ? session.createdAt : null;
            const sessionUpdatedAt = session && session.updatedAt ? session.updatedAt : null;
 
            const hasSessionUrl = session && session.url && session.url.trim();
            const shouldShowUrl = !session || hasSessionUrl;
 
            let pageInfoHtml = '<div class="welcome-card">';
 
            const hasTitle = pageInfo && pageInfo.title && pageInfo.title.trim();
            const hasUrl = shouldShowUrl && pageInfo && pageInfo.url && pageInfo.url.trim();
            const hasDescription = pageInfo && pageInfo.description && pageInfo.description.trim();
            const hasAnyContent = hasTitle || hasUrl || hasDescription || sessionTags.length > 0 ||
                sessionMessages.length > 0 || sessionCreatedAt || sessionUpdatedAt;
 
            if (!hasAnyContent) {
                pageInfoHtml += `
                        <div class="welcome-card-header">
                            <span class="welcome-card-title">当前页面</span>
                        </div>
                        <div class="welcome-card-section">
                            <div class="welcome-card-empty">暂无页面信息</div>
                        </div>
                    `;
                pageInfoHtml += '</div>';
                return pageInfoHtml;
            }
 
            if (hasTitle) {
                pageInfoHtml += `
                        <div class="welcome-card-header">
                            <span class="welcome-card-title">${_escapeHtml(pageInfo.title)}</span>
                        </div>
                    `;
            }
 
            if (hasUrl) {
                const urlId = `welcome-url-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                pageInfoHtml += `
                        <div class="welcome-card-section">
                            <div class="welcome-card-section-header">
                                <div class="welcome-card-section-title">🔗 网址</div>
                                <button type="button" class="welcome-card-action-btn" data-copy-target="${urlId}" title="复制网址" aria-label="复制网址">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                            <a href="${_escapeHtml(pageInfo.url)}" target="_blank" class="welcome-card-url" id="${urlId}">${_escapeHtml(pageInfo.url)}</a>
                        </div>
                    `;
            }
 
            if (hasDescription) {
                const descId = `welcome-desc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                pageInfoHtml += `
                        <div class="welcome-card-section welcome-card-description">
                            <div class="welcome-card-section-header">
                                <div class="welcome-card-section-title">📝 页面描述</div>
                                <button type="button" class="welcome-card-action-btn" data-copy-text="${_escapeHtml(pageInfo.description)}" title="复制描述" aria-label="复制描述">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                            <div class="markdown-content md-preview-body" id="${descId}">${renderMarkdownHtml(pageInfo.description, { breaks: true, gfm: true })}</div>
                        </div>
                    `;
            }
 
            if (sessionTags.length > 0) {
                const tagsHtml = sessionTags.map(tag => {
                    const escapedTag = _escapeHtml(tag);
                    return `<span class="welcome-card-tag">${escapedTag}</span>`;
                }).join('');
                pageInfoHtml += `
                        <div class="welcome-card-section">
                            <div class="welcome-card-section-title">🏷️ 标签</div>
                            <div class="welcome-card-tags">${tagsHtml}</div>
                        </div>
                    `;
            }
 
            if (sessionMessages.length > 0) {
                const userMessages = sessionMessages.filter(m => m.type === 'user' || m.role === 'user').length;
                pageInfoHtml += `
                        <div class="welcome-card-section">
                            <div class="welcome-card-section-title">💬 对话记录</div>
                            <div class="welcome-card-meta">
                                <span>共 ${sessionMessages.length} 条消息</span>
                                ${userMessages > 0 ? `<span>（用户: ${userMessages} 条）</span>` : ''}
                            </div>
                        </div>
                    `;
            }
 
            if (sessionCreatedAt || sessionUpdatedAt) {
                const createdDate = sessionCreatedAt ? new Date(sessionCreatedAt) : null;
                const updatedDate = sessionUpdatedAt ? new Date(sessionUpdatedAt) : null;
                const hasValidCreated = createdDate && !isNaN(createdDate.getTime());
                const hasValidUpdated = updatedDate && !isNaN(updatedDate.getTime());
                const isSameTime = hasValidCreated && hasValidUpdated &&
                    Math.abs(createdDate.getTime() - updatedDate.getTime()) < 60000;
 
                if (hasValidCreated || hasValidUpdated) {
                    pageInfoHtml += `
                            <div class="welcome-card-section">
                                <div class="welcome-card-section-title">⏰ 时间信息</div>
                                <div class="welcome-card-meta">
                                    ${hasValidCreated ? `<span>创建: ${_escapeHtml(formatDate(createdDate))}</span>` : ''}
                                    ${hasValidUpdated && !isSameTime ? `<span>更新: ${_escapeHtml(formatDate(updatedDate))}</span>` : ''}
                                </div>
                            </div>
                        `;
                }
            }
 
            pageInfoHtml += '</div>';
            return pageInfoHtml;
        } catch (_) {
            return '<div class="welcome-card"><div class="welcome-card-empty">构建欢迎卡片失败</div></div>';
        }
    };
 
    const buildWelcomeCardHtmlForSession = (session) => {
        if (!session) return '';
        try {
            const pageInfo = {
                title: session.title || '当前页面',
                url: session.url || '',
                description: session.pageDescription || ''
            };
            return buildWelcomeCardHtml(pageInfo, session);
        } catch (_) {
            return '';
        }
    };

    const bindWelcomeCardEvents = (container) => {
        if (!container) return;

        const copyButtons = container.querySelectorAll('[data-copy-target], [data-copy-text]');
        copyButtons.forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                let textToCopy = '';

                const copyTarget = btn.getAttribute('data-copy-target');
                if (copyTarget) {
                    const targetElement = container.querySelector(`#${copyTarget}`);
                    if (targetElement) {
                        textToCopy = targetElement.textContent || targetElement.innerText || '';
                    }
                }

                if (!textToCopy) {
                    const copyText = btn.getAttribute('data-copy-text');
                    if (copyText) {
                        textToCopy = copyText;
                    }
                }

                if (!textToCopy) return;

                const showOk = () => {
                    const icon = btn.querySelector('i');
                    if (!icon) return;
                    const originalClass = icon.className;
                    icon.className = 'fas fa-check';
                    btn.style.color = 'rgba(34, 197, 94, 0.9)';
                    setTimeout(() => {
                        icon.className = originalClass;
                        btn.style.color = '';
                    }, 2000);
                };

                try {
                    await navigator.clipboard.writeText(textToCopy);
                    showOk();
                } catch (err) {
                    try {
                        const textArea = document.createElement('textarea');
                        textArea.value = textToCopy;
                        textArea.style.position = 'fixed';
                        textArea.style.opacity = '0';
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        showOk();
                    } catch (e2) {
                        try { console.warn('Copy failed:', err, e2); } catch (_) { }
                    }
                }
            });
        });
    };
 
    const sessionChatMethods = {
        selectSessionForChat,
        handleSessionSelect: async (session) => {
            return safeExecute(async () => {
                await selectSessionForChat(session, { toggleActive: false, openContextEditor: false });
            }, '选择会话');
        },
        sessionChatMessages: (session) => {
            try {
                const msgs = Array.isArray(session?.messages) ? session.messages : [];
                return [...msgs].map(m => {
                    const timestamp = typeof m?.timestamp === 'number' ? m.timestamp : Date.now();
                    const imageDataUrls = Array.isArray(m?.imageDataUrls) ? m.imageDataUrls.filter(Boolean) : [];
                    const imageDataUrl = String(m?.imageDataUrl || (imageDataUrls[0] || '') || '');
                    const message = String(m?.message || m?.content || m?.text || '');
                    return {
                        type: m?.type === 'pet' ? 'pet' : 'user',
                        message,
                        content: message,
                        timestamp,
                        imageDataUrls,
                        imageDataUrl,
                        error: !!m?.error,
                        aborted: !!m?.aborted
                    };
                });
            } catch (_) {
                return [];
            }
        },
        renderSessionChatMarkdown: (text) => {
            return renderMarkdownHtml(text, { breaks: true, gfm: true });
        },
        renderSessionChatStreamingHtml: (text) => {
            return renderStreamingHtml(text);
        },
        setSessionChatInput: (v) => {
            if (!sessionChatInput) return;
            sessionChatInput.value = String(v ?? '');
        },
        onSessionChatInput: (e) => {
            try {
                const v = e && e.target ? e.target.value : '';
                if (sessionChatInput) sessionChatInput.value = String(v ?? '');
                const el = e && e.target;
                if (el && el.style) {
                    el.style.height = 'auto';
                    const min = 60;
                    const max = 220;
                    const next = Math.max(min, Math.min(max, el.scrollHeight || min));
                    el.style.height = `${next}px`;
                }
            } catch (_) { }
        },
        onSessionChatCompositionStart: () => {
            _sessionChatIsComposing = true;
            _sessionChatCompositionEndTime = 0;
        },
        onSessionChatCompositionUpdate: () => {
            _sessionChatIsComposing = true;
            _sessionChatCompositionEndTime = 0;
        },
        onSessionChatCompositionEnd: () => {
            _sessionChatIsComposing = false;
            _sessionChatCompositionEndTime = Date.now();
        },
        onSessionChatPaste: (e) => {
            try {
                const clipboard = e?.clipboardData;
                const items = clipboard?.items;
                if (!items || typeof items.length !== 'number') return;

                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (!item || typeof item.type !== 'string') continue;
                    if (!item.type.includes('image')) continue;
                    const file = item.getAsFile && item.getAsFile();
                    if (!file) continue;

                    e.preventDefault();

                    const reader = new FileReader();
                    reader.onload = () => {
                        try {
                            const dataUrl = String(reader.result || '').trim();
                            if (!dataUrl) return;
                            const current = Array.isArray(sessionChatDraftImages?.value) ? [...sessionChatDraftImages.value] : [];
                            if (current.length >= 4) {
                                if (window.showError) window.showError('最多支持 4 张图片');
                                return;
                            }
                            current.push(dataUrl);
                            if (sessionChatDraftImages) sessionChatDraftImages.value = current;
                            if (window.showSuccess) window.showSuccess('已添加图片');
                        } catch (_) { }
                    };
                    reader.readAsDataURL(file);
                    break;
                }
            } catch (_) { }
        },
        openSessionChatImagePicker: () => {
            try {
                const input = document.getElementById('pet-chat-image-input');
                if (input && typeof input.click === 'function') input.click();
            } catch (_) { }
        },
        onSessionChatImageInputChange: async (e) => {
            try {
                const input = e && e.target;
                const files = input && input.files ? Array.from(input.files).filter(Boolean) : [];
                if (!files || files.length === 0) return;

                const current = Array.isArray(sessionChatDraftImages?.value) ? [...sessionChatDraftImages.value] : [];
                const remaining = Math.max(0, 4 - current.length);
                if (remaining <= 0) {
                    if (window.showError) window.showError('最多支持 4 张图片');
                    return;
                }

                const picked = files.slice(0, remaining);
                const toDataUrl = (file) => new Promise((resolve, reject) => {
                    try {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result || '').trim());
                        reader.onerror = () => reject(new Error('读取图片失败'));
                        reader.readAsDataURL(file);
                    } catch (err) {
                        reject(err);
                    }
                });

                const dataUrls = await Promise.all(picked.map(toDataUrl));
                const next = [...current, ...dataUrls.filter(v => v && v.startsWith('data:image/'))].slice(0, 4);
                if (sessionChatDraftImages) sessionChatDraftImages.value = next;
                if (window.showSuccess && next.length > current.length) window.showSuccess('已添加图片');
            } catch (_) {
            } finally {
                try {
                    const input = e && e.target;
                    if (input) input.value = '';
                } catch (_) { }
            }
        },
        removeSessionChatDraftImage: (idx) => {
            try {
                const list = Array.isArray(sessionChatDraftImages?.value) ? [...sessionChatDraftImages.value] : [];
                const i = Number(idx);
                if (!Number.isFinite(i) || i < 0 || i >= list.length) return;
                list.splice(i, 1);
                if (sessionChatDraftImages) sessionChatDraftImages.value = list;
            } catch (_) { }
        },
        clearSessionChatDraftImages: () => {
            if (sessionChatDraftImages) sessionChatDraftImages.value = [];
        },
        clearSessionChatInput: () => {
            if (!sessionChatInput) return;
            sessionChatInput.value = '';
        },
        onSessionChatKeydown: (e) => {
            try {
                if (!e) return;
                if (e.isComposing || _sessionChatIsComposing) return;
                if (e.key === 'Enter' && _sessionChatCompositionEndTime > 0) {
                    if (Date.now() - _sessionChatCompositionEndTime < _SESSION_CHAT_COMPOSITION_END_DELAY) return;
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (typeof window.aicrApp?.sendSessionChatMessage === 'function') {
                        window.aicrApp.sendSessionChatMessage();
                    }
                    _sessionChatCompositionEndTime = 0;
                    return;
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    if (sessionChatInput) sessionChatInput.value = '';
                    if (sessionChatDraftImages) sessionChatDraftImages.value = [];
                    try {
                        const el = document.getElementById('pet-chat-input');
                        if (el && el.style) {
                            el.style.height = '60px';
                            el.blur();
                        }
                    } catch (_) { }
                }
            } catch (_) { }
        },
        abortSessionChatRequest: () => {
            try {
                const controller = sessionChatAbortController?.value;
                if (controller && typeof controller.abort === 'function') {
                    controller.abort();
                }
            } catch (_) { }
        },
        isSessionChatStreamingMessage: (m, idx) => {
            try {
                return _isStreamingMessage(m);
            } catch (_) {
                return false;
            }
        },
        isSessionChatRegenerating: (m, idx) => {
            try {
                if (String(sessionChatStreamingType?.value || '') !== 'regenerate') return false;
                return _isStreamingMessage(m);
            } catch (_) {
                return false;
            }
        },
        sessionChatCopyButtonLabel: (m, idx) => {
            try {
                const key = _sessionChatMessageKey(m, idx);
                const map = sessionChatCopyFeedback?.value && typeof sessionChatCopyFeedback.value === 'object'
                    ? sessionChatCopyFeedback.value
                    : {};
                const expiresAt = map[key];
                if (typeof expiresAt === 'number' && Date.now() < expiresAt) return '已复制';
                return '复制';
            } catch (_) {
                return '复制';
            }
        },
        sessionChatRegenerateButtonLabel: (m, idx) => {
            try {
                if (String(sessionChatStreamingType?.value || '') === 'regenerate' && _isStreamingMessage(m)) {
                    return '生成中';
                }
                const key = _sessionChatMessageKey(m, idx);
                const map = sessionChatRegenerateFeedback?.value && typeof sessionChatRegenerateFeedback.value === 'object'
                    ? sessionChatRegenerateFeedback.value
                    : {};
                const expiresAt = map[key];
                if (typeof expiresAt === 'number' && Date.now() < expiresAt) return '已生成';
                if (m && (m.error || m.aborted)) return '重试';
                return '重新生成';
            } catch (_) {
                return '重新生成';
            }
        },
        canRegenerateSessionChatMessage: (session, idx) => {
            try {
                if (!session) return false;
                const messages = Array.isArray(session?.messages) ? session.messages : [];
                const i = Number(idx);
                if (!Number.isFinite(i) || i < 0 || i >= messages.length) return false;
                const m = messages[i];
                if (!m || m.type !== 'pet') return false;
                for (let j = i - 1; j >= 0; j--) {
                    const prev = messages[j];
                    if (!prev || prev.type === 'pet') continue;
                    const text = String(prev.message ?? prev.content ?? '').trim();
                    const hasImages =
                        (Array.isArray(prev.imageDataUrls) && prev.imageDataUrls.some(Boolean)) ||
                        !!String(prev.imageDataUrl || '').trim();
                    return !!(text || hasImages);
                }
                return false;
            } catch (_) {
                return false;
            }
        },
        editSessionChatMessageAt: (idx) => {
            try {
                const s = activeSession?.value;
                const messages = Array.isArray(s?.messages) ? s.messages : [];
                const i = Number(idx);
                if (!Number.isFinite(i) || i < 0 || i >= messages.length) return;
                const m = messages[i];
                if (!m) return;
                const text = String(m.message ?? m.content ?? '');

                if (sessionMessageEditorMode) sessionMessageEditorMode.value = 'split';
                if (sessionMessageEditorDraft) sessionMessageEditorDraft.value = text;
                if (sessionMessageEditorIndex) sessionMessageEditorIndex.value = i;
                if (sessionMessageEditorVisible) sessionMessageEditorVisible.value = true;
                ensureSessionMessageEditorScrollSync();
            } catch (_) { }
        },
        closeSessionMessageEditor: () => {
            if (sessionMessageEditorVisible) sessionMessageEditorVisible.value = false;
            if (sessionMessageEditorDraft) sessionMessageEditorDraft.value = '';
            if (sessionMessageEditorIndex) sessionMessageEditorIndex.value = -1;
            cleanupSessionMessageEditorScrollSync();
        },
        setSessionMessageEditorMode: (v) => {
            if (!sessionMessageEditorMode) return;
            sessionMessageEditorMode.value = v === 'preview' ? 'preview' : (v === 'split' ? 'split' : 'edit');
            ensureSessionMessageEditorScrollSync();
        },
        setSessionMessageEditorDraft: (v) => {
            if (!sessionMessageEditorDraft) return;
            sessionMessageEditorDraft.value = String(v ?? '');
        },
        saveSessionMessageEdit: async () => {
            return safeExecute(async () => {
                const content = String(sessionMessageEditorDraft?.value ?? '').trim();
                const idx = Number(sessionMessageEditorIndex?.value ?? -1);

                if (!Number.isFinite(idx) || idx < 0) {
                    throw new Error('无效的消息索引');
                }

                const s = activeSession?.value;
                if (!s || !s.key) {
                    throw new Error('未选择会话或会话缺少key');
                }

                const messages = Array.isArray(s.messages) ? [...s.messages] : [];
                if (idx >= messages.length) {
                    throw new Error('消息索引超出范围');
                }

                const m = messages[idx];
                if (!m) {
                    throw new Error('消息不存在');
                }

                messages[idx] = { ...m, message: content };

                const now = Date.now();
                const updatedSession = { ...s, messages, updatedAt: now, lastAccessTime: now };
                if (activeSession) activeSession.value = updatedSession;

                try {
                    const updateData = {
                        key: s.key,
                        messages: messages,
                        updatedAt: now,
                        lastAccessTime: now
                    };

                    const payload = {
                        module_name: SERVICE_MODULE,
                        method_name: 'update_document',
                        parameters: {
                            cname: 'sessions',
                            key: s.key,
                            data: updateData
                        }
                    };

                    const result = await postData(`${window.API_URL}/`, payload);

                    if (result && result.success === false) {
                        throw new Error(result.message || '保存失败');
                    }

                    if (store.sessions && store.sessions.value) {
                        const sessionIndex = store.sessions.value.findIndex(sess => sess && sess.key === s.key);
                        if (sessionIndex >= 0) {
                            store.sessions.value = [...store.sessions.value];
                            store.sessions.value[sessionIndex] = updatedSession;
                        }
                    }
                } catch (error) {
                    console.error('[保存消息编辑] 保存到服务器失败:', error);
                    throw error;
                }

                if (sessionMessageEditorVisible) sessionMessageEditorVisible.value = false;
                if (sessionMessageEditorDraft) sessionMessageEditorDraft.value = '';
                if (sessionMessageEditorIndex) sessionMessageEditorIndex.value = -1;

                if (window.showSuccess) window.showSuccess('已保存');
            }, '保存消息编辑');
        },
        deleteSessionChatMessageAt: async (idx) => {
            return safeExecute(async () => {
                if (sessionChatSending?.value) return;
                const s = activeSession?.value;
                if (!s) return;
                const messages = Array.isArray(s.messages) ? [...s.messages] : [];
                const i = Number(idx);
                if (!Number.isFinite(i) || i < 0 || i >= messages.length) return;
                if (!confirm('确定删除这条消息吗？')) return;

                messages.splice(i, 1);

                const now = Date.now();
                const nextSession = { ...s, messages, updatedAt: now, lastAccessTime: now };
                activeSession.value = nextSession;

                try {
                    const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                    const sessionSync = getSessionSyncService();
                    await sessionSync.saveSession(nextSession);
                } catch (_) { }
            }, '删除消息');
        },
        canMoveSessionChatMessageUp: (session, idx) => {
            try {
                const s = session || activeSession?.value;
                const messages = Array.isArray(s?.messages) ? s.messages : [];
                const i = Number(idx);
                if (!Number.isFinite(i) || i <= 0) return false;
                return i < messages.length;
            } catch (_) {
                return false;
            }
        },
        canMoveSessionChatMessageDown: (session, idx) => {
            try {
                const s = session || activeSession?.value;
                const messages = Array.isArray(s?.messages) ? s.messages : [];
                const i = Number(idx);
                if (!Number.isFinite(i) || i < 0) return false;
                return i < messages.length - 1;
            } catch (_) {
                return false;
            }
        },
        moveSessionChatMessageUp: async (idx) => {
            return safeExecute(async () => {
                await _moveSessionChatMessageBlock(idx, 'up');
            }, '上移消息');
        },
        moveSessionChatMessageDown: async (idx) => {
            return safeExecute(async () => {
                await _moveSessionChatMessageBlock(idx, 'down');
            }, '下移消息');
        },
        resendSessionChatMessageAt: async (idx) => {
            return safeExecute(async () => {
                if (sessionChatSending?.value) return;
                const s = activeSession?.value;
                if (!s) return;
                const originalMessages = Array.isArray(s.messages) ? s.messages : [];
                const i = Number(idx);
                if (!Number.isFinite(i) || i < 0 || i >= originalMessages.length) return;
                const userMsg = originalMessages[i];
                if (!userMsg || userMsg.type === 'pet') return;

                const text = String(userMsg.message ?? userMsg.content ?? '').trim();
                const images = (() => {
                    const list = Array.isArray(userMsg.imageDataUrls) ? userMsg.imageDataUrls.filter(Boolean) : [];
                    const first = String(userMsg.imageDataUrl || '').trim();
                    if (first) list.unshift(first);
                    return Array.from(new Set(list)).slice(0, 4);
                })();
                if (!text && images.length === 0) return;

                const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                const sessionSync = getSessionSyncService();
                const uploadOne = async (src) => {
                    const raw = String(src || '').trim();
                    if (!raw) return '';
                    if (/^https?:\/\//i.test(raw)) return raw;
                    if (!raw.startsWith('data:image/')) {
                        throw new Error('图片格式不支持');
                    }
                    return await sessionSync.uploadImageToOss(raw, 'aicr/images');
                };
                const imageUrls = images.length > 0
                    ? (await Promise.all(images.map((src, idx) => uploadOne(src, idx)))).filter(Boolean)
                    : [];
                if (images.length > 0 && imageUrls.length === 0) {
                    throw new Error('上传图片失败');
                }

                const shouldAutoScroll = () => {
                    try {
                        const el = document.getElementById('pet-chat-messages');
                        if (!el) return true;
                        const distance = (el.scrollHeight || 0) - (el.scrollTop || 0) - (el.clientHeight || 0);
                        return distance < 140;
                    } catch (_) {
                        return true;
                    }
                };

                const scrollToIndex = (targetIdx) => {
                    try {
                        const el = document.querySelector(`[data-chat-idx="${targetIdx}"]`);
                        if (el && typeof el.scrollIntoView === 'function') {
                            el.scrollIntoView({ block: 'nearest' });
                            return;
                        }
                        const container = document.getElementById('pet-chat-messages');
                        if (container) container.scrollTop = container.scrollHeight;
                    } catch (_) { }
                };

                const now = Date.now();
                const insertedPet = { type: 'pet', message: '', timestamp: now + 1 };
                const updatedUserMsg = imageUrls.length > 0
                    ? { ...userMsg, imageDataUrls: imageUrls, imageDataUrl: imageUrls[0] }
                    : userMsg;
                const nextMessages = [...originalMessages];
                nextMessages[i] = updatedUserMsg;
                nextMessages.splice(i + 1, 0, insertedPet);
                const nextSession = { ...s, messages: nextMessages, updatedAt: now, lastAccessTime: now };
                activeSession.value = nextSession;
                setTimeout(() => scrollToIndex(i + 1), 0);

                const pageContent = String(sessionContextDraft?.value ?? s.pageContent ?? '').trim();
                const includeContext = sessionContextEnabled?.value === true;
                const history = _buildSessionChatHistoryText(originalMessages, i);
                const fromSystem = String(sessionBotSystemPrompt?.value || defaultSessionBotSystemPrompt).trim() || defaultSessionBotSystemPrompt;
                const fromUser = _buildSessionChatUserPrompt({ text, images: imageUrls, pageContent, includeContext, historyText: history });

                const { streamPrompt } = await import('/src/services/modules/crud.js');
                const promptUrl = getPromptUrl();

                let accumulated = '';
                if (sessionChatStreamingTargetTimestamp) sessionChatStreamingTargetTimestamp.value = insertedPet.timestamp;
                if (sessionChatStreamingType) sessionChatStreamingType.value = 'resend';
                if (sessionChatSending) sessionChatSending.value = true;
                const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                if (sessionChatAbortController) sessionChatAbortController.value = controller;
                let streamErrorMessage = '';
                let streamAborted = false;

                try {
                    await streamPrompt(
                        promptUrl,
                        {
                            module_name: 'services.ai.chat_service',
                            method_name: 'chat',
                            parameters: {
                                system: fromSystem,
                                user: fromUser,
                                stream: true,
                                ...(String(sessionBotModel?.value || '').trim()
                                    ? { model: String(sessionBotModel.value || '').trim() }
                                    : {}),
                                ...(imageUrls.length > 0 ? { images: imageUrls } : {})
                            }
                        },
                        controller ? { signal: controller.signal } : {},
                        (chunk) => {
                            const autoScroll = shouldAutoScroll();
                            accumulated += String(chunk || '');
                            try {
                                const cur = activeSession.value || nextSession;
                                const msgs = Array.isArray(cur.messages) ? [...cur.messages] : [];
                                const targetIdx = msgs.findIndex(m => m && m.type === 'pet' && m.timestamp === insertedPet.timestamp);
                                if (targetIdx >= 0) {
                                    msgs[targetIdx] = { ...msgs[targetIdx], message: accumulated, error: false, aborted: false };
                                    activeSession.value = { ...cur, messages: msgs };
                                    if (autoScroll) scrollToIndex(targetIdx);
                                }
                            } catch (_) { }
                        }
                    );
                } catch (e) {
                    const aborted = _isAbortError(e);
                    if (aborted) {
                        streamAborted = true;
                    } else {
                        streamErrorMessage = String(e?.message || '请求失败');
                    }
                } finally {
                    if (sessionChatSending) sessionChatSending.value = false;
                    if (sessionChatAbortController) sessionChatAbortController.value = null;
                    if (sessionChatStreamingTargetTimestamp) sessionChatStreamingTargetTimestamp.value = null;
                    if (sessionChatStreamingType) sessionChatStreamingType.value = '';
                }

                const finalSession = (() => {
                    const cur = activeSession.value || nextSession;
                    const msgs = Array.isArray(cur.messages) ? [...cur.messages] : [];
                    const targetIdx = msgs.findIndex(m => m && m.type === 'pet' && m.timestamp === insertedPet.timestamp);
                    if (targetIdx >= 0) {
                        const trimmed = String(accumulated || '').trim();
                        const content = streamErrorMessage
                            ? (trimmed || `请求失败：${streamErrorMessage}`)
                            : (streamAborted && !trimmed ? '已停止' : trimmed);
                        msgs[targetIdx] = {
                            ...msgs[targetIdx],
                            message: content,
                            ...(streamErrorMessage ? { error: true } : {}),
                            ...(streamAborted ? { aborted: true } : {})
                        };
                    }
                    return { ...cur, messages: msgs, pageContent: String(sessionContextDraft?.value ?? cur.pageContent ?? '') };
                })();
                activeSession.value = finalSession;

                try {
                    const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                    const sessionSync = getSessionSyncService();
                    await sessionSync.saveSession({ ...finalSession, updatedAt: Date.now(), lastAccessTime: Date.now() });
                } catch (_) { }

                if (streamErrorMessage && window.showError) {
                    window.showError(streamErrorMessage);
                }
            }, '重新发送消息', (info) => { try { if (window.showError) window.showError(String(info?.message || '重试失败')); } catch (_) { } });
        },
        regenerateSessionChatMessageAt: async (idx) => {
            return safeExecute(async () => {
                if (sessionChatSending?.value) return;
                const currentSession = activeSession?.value;
                if (!currentSession) return;
                const originalMessages = Array.isArray(currentSession.messages) ? currentSession.messages : [];
                const petIdx = Number(idx);
                if (!Number.isFinite(petIdx) || petIdx < 0 || petIdx >= originalMessages.length) return;
                const originalPet = originalMessages[petIdx];
                if (!originalPet || originalPet.type !== 'pet') return;

                let userIdx = -1;
                for (let i = petIdx - 1; i >= 0; i--) {
                    const m = originalMessages[i];
                    if (m && m.type !== 'pet') {
                        userIdx = i;
                        break;
                    }
                }
                if (userIdx < 0) return;

                const userMsg = originalMessages[userIdx] || {};
                const text = String(userMsg.message ?? userMsg.content ?? '').trim();
                const images = (() => {
                    const list = Array.isArray(userMsg.imageDataUrls) ? userMsg.imageDataUrls.filter(Boolean) : [];
                    const first = String(userMsg.imageDataUrl || '').trim();
                    if (first) list.unshift(first);
                    return Array.from(new Set(list)).slice(0, 4);
                })();
                if (!text && images.length === 0) return;

                if (sessionChatLastDraftText) sessionChatLastDraftText.value = text;
                if (sessionChatLastDraftImages) sessionChatLastDraftImages.value = images;

                const shouldAutoScroll = () => {
                    try {
                        const el = document.getElementById('pet-chat-messages');
                        if (!el) return true;
                        const distance = (el.scrollHeight || 0) - (el.scrollTop || 0) - (el.clientHeight || 0);
                        return distance < 140;
                    } catch (_) {
                        return true;
                    }
                };

                const scrollToIndex = (targetIdx) => {
                    try {
                        const el = document.querySelector(`[data-chat-idx="${targetIdx}"]`);
                        if (el && typeof el.scrollIntoView === 'function') {
                            el.scrollIntoView({ block: 'nearest' });
                            return;
                        }
                        const container = document.getElementById('pet-chat-messages');
                        if (container) container.scrollTop = container.scrollHeight;
                    } catch (_) { }
                };

                const now = Date.now();
                const petTimestamp = typeof originalPet.timestamp === 'number' ? originalPet.timestamp : now;
                const resetMessages = [...originalMessages];
                resetMessages[petIdx] = { ...originalPet, type: 'pet', timestamp: petTimestamp, message: '', error: false, aborted: false };
                activeSession.value = { ...currentSession, messages: resetMessages, updatedAt: now, lastAccessTime: now };
                setTimeout(() => scrollToIndex(petIdx), 0);

                const pageContent = String(sessionContextDraft?.value ?? currentSession.pageContent ?? '').trim();
                const includeContext = sessionContextEnabled?.value === true;
                const history = _buildSessionChatHistoryText(originalMessages, petIdx);
                const fromSystem = String(sessionBotSystemPrompt?.value || defaultSessionBotSystemPrompt).trim() || defaultSessionBotSystemPrompt;
                const fromUser = _buildSessionChatUserPrompt({ text, images, pageContent, includeContext, historyText: history });

                const { streamPrompt } = await import('/src/services/modules/crud.js');
                const promptUrl = getPromptUrl();

                let accumulated = '';
                if (sessionChatStreamingTargetTimestamp) sessionChatStreamingTargetTimestamp.value = petTimestamp;
                if (sessionChatStreamingType) sessionChatStreamingType.value = 'regenerate';
                if (sessionChatSending) sessionChatSending.value = true;
                const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                if (sessionChatAbortController) sessionChatAbortController.value = controller;
                let streamErrorMessage = '';
                let streamAborted = false;

                try {
                    await streamPrompt(
                        promptUrl,
                        {
                            module_name: 'services.ai.chat_service',
                            method_name: 'chat',
                            parameters: {
                                system: fromSystem,
                                user: fromUser,
                                stream: true,
                                ...(String(sessionBotModel?.value || '').trim()
                                    ? { model: String(sessionBotModel.value || '').trim() }
                                    : {}),
                                ...(images.length > 0 ? { images } : {})
                            }
                        },
                        controller ? { signal: controller.signal } : {},
                        (chunk) => {
                            const autoScroll = shouldAutoScroll();
                            accumulated += String(chunk || '');
                            try {
                                const cur = activeSession.value;
                                const msgs = Array.isArray(cur.messages) ? [...cur.messages] : [];
                                const targetIdx = msgs.findIndex(m => m && m.type === 'pet' && m.timestamp === petTimestamp);
                                const useIdx = targetIdx >= 0 ? targetIdx : petIdx;
                                if (useIdx >= 0 && msgs[useIdx] && msgs[useIdx].type === 'pet') {
                                    msgs[useIdx] = { ...msgs[useIdx], message: accumulated, error: false, aborted: false };
                                    activeSession.value = { ...cur, messages: msgs };
                                    if (autoScroll) scrollToIndex(useIdx);
                                }
                            } catch (_) { }
                        }
                    );
                } catch (e) {
                    const aborted = _isAbortError(e);
                    if (aborted) {
                        streamAborted = true;
                    } else {
                        streamErrorMessage = String(e?.message || '请求失败');
                    }
                } finally {
                    if (sessionChatSending) sessionChatSending.value = false;
                    if (sessionChatAbortController) sessionChatAbortController.value = null;
                    if (sessionChatStreamingTargetTimestamp) sessionChatStreamingTargetTimestamp.value = null;
                    if (sessionChatStreamingType) sessionChatStreamingType.value = '';
                }

                const finalSession = (() => {
                    const cur = activeSession.value || currentSession;
                    const msgs = Array.isArray(cur.messages) ? [...cur.messages] : [];
                    const targetIdx = msgs.findIndex(m => m && m.type === 'pet' && m.timestamp === petTimestamp);
                    const useIdx = targetIdx >= 0 ? targetIdx : petIdx;
                    if (useIdx >= 0 && msgs[useIdx] && msgs[useIdx].type === 'pet') {
                        const trimmed = String(accumulated || '').trim();
                        const content = streamErrorMessage
                            ? (trimmed || `请求失败：${streamErrorMessage}`)
                            : (streamAborted && !trimmed ? '已停止' : trimmed);
                        msgs[useIdx] = {
                            ...msgs[useIdx],
                            message: content,
                            ...(streamErrorMessage ? { error: true } : {}),
                            ...(streamAborted ? { aborted: true } : {})
                        };
                    }
                    return { ...cur, messages: msgs, pageContent: String(sessionContextDraft?.value ?? cur.pageContent ?? '') };
                })();
                activeSession.value = finalSession;

                try {
                    const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                    const sessionSync = getSessionSyncService();
                    await sessionSync.saveSession({ ...finalSession, updatedAt: Date.now(), lastAccessTime: Date.now() });
                } catch (_) { }

                try {
                    const key = _sessionChatMessageKey({ timestamp: petTimestamp }, petIdx);
                    if (!streamErrorMessage && !streamAborted && String(accumulated || '').trim()) {
                        _setFeedbackFlag(sessionChatRegenerateFeedback, key, 1200);
                    }
                } catch (_) { }

                if (streamErrorMessage && window.showError) {
                    window.showError(streamErrorMessage);
                }
            }, '重新生成回复');
        },
        retryLastSessionChatMessage: async () => {
            return safeExecute(async () => {
                if (sessionChatSending?.value) return;
                const currentSession = activeSession?.value;
                if (!currentSession) return;
                const originalMessages = Array.isArray(currentSession.messages) ? currentSession.messages : [];
                if (originalMessages.length === 0) return;

                let petIdx = -1;
                for (let i = originalMessages.length - 1; i >= 0; i--) {
                    const m = originalMessages[i];
                    if (m && m.type === 'pet') {
                        petIdx = i;
                        break;
                    }
                }
                if (petIdx < 0) return;

                const originalPet = originalMessages[petIdx] || {};
                if (!originalPet.error && !originalPet.aborted) return;

                let userIdx = -1;
                for (let i = petIdx - 1; i >= 0; i--) {
                    const m = originalMessages[i];
                    if (m && m.type !== 'pet') {
                        userIdx = i;
                        break;
                    }
                }
                if (userIdx < 0) return;

                const userMsg = originalMessages[userIdx] || {};
                const text = String(userMsg.message ?? userMsg.content ?? '').trim();
                const images = (() => {
                    const list = Array.isArray(userMsg.imageDataUrls)
                        ? userMsg.imageDataUrls.filter(Boolean)
                        : [];
                    const first = String(userMsg.imageDataUrl || '').trim();
                    if (first) list.unshift(first);
                    return Array.from(new Set(list)).slice(0, 4);
                })();
                if (!text && images.length === 0) return;

                if (sessionChatLastDraftText) sessionChatLastDraftText.value = text;
                if (sessionChatLastDraftImages) sessionChatLastDraftImages.value = images;

                const shouldAutoScroll = () => {
                    try {
                        const el = document.getElementById('pet-chat-messages');
                        if (!el) return true;
                        const distance = (el.scrollHeight || 0) - (el.scrollTop || 0) - (el.clientHeight || 0);
                        return distance < 140;
                    } catch (_) {
                        return true;
                    }
                };

                const scrollToBottom = () => {
                    try {
                        const el = document.getElementById('pet-chat-messages');
                        if (el) el.scrollTop = el.scrollHeight;
                    } catch (_) { }
                };

                const now = Date.now();
                const petTimestamp = typeof originalPet.timestamp === 'number' ? originalPet.timestamp : now;
                const resetMessages = [...originalMessages];
                resetMessages[petIdx] = {
                    ...originalPet,
                    type: 'pet',
                    timestamp: petTimestamp,
                    message: '',
                    error: false,
                    aborted: false
                };
                activeSession.value = {
                    ...currentSession,
                    messages: resetMessages,
                    updatedAt: now,
                    lastAccessTime: now
                };
                setTimeout(scrollToBottom, 0);

                const pageContent = String(sessionContextDraft?.value ?? currentSession.pageContent ?? '').trim();
                const includeContext = sessionContextEnabled?.value === true;
                const history = _buildSessionChatHistoryText(originalMessages, petIdx);
                const fromSystem = String(sessionBotSystemPrompt?.value || defaultSessionBotSystemPrompt).trim() || defaultSessionBotSystemPrompt;

                const fromUser = _buildSessionChatUserPrompt({ text, images, pageContent, includeContext, historyText: history });

                const { streamPrompt } = await import('/src/services/modules/crud.js');
                const promptUrl = getPromptUrl();

                let accumulated = '';
                if (sessionChatStreamingTargetTimestamp) sessionChatStreamingTargetTimestamp.value = petTimestamp;
                if (sessionChatStreamingType) sessionChatStreamingType.value = 'send';
                if (sessionChatSending) sessionChatSending.value = true;
                const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                if (sessionChatAbortController) sessionChatAbortController.value = controller;
                let streamErrorMessage = '';
                let streamAborted = false;

                try {
                    await streamPrompt(
                        promptUrl,
                        {
                            module_name: 'services.ai.chat_service',
                            method_name: 'chat',
                            parameters: {
                                system: fromSystem,
                                user: fromUser,
                                stream: true,
                                ...(String(sessionBotModel?.value || '').trim()
                                    ? { model: String(sessionBotModel.value || '').trim() }
                                    : {}),
                                ...(images.length > 0 ? { images } : {})
                            }
                        },
                        controller ? { signal: controller.signal } : {},
                        (chunk) => {
                            const autoScroll = shouldAutoScroll();
                            accumulated += String(chunk || '');
                            try {
                                const s = activeSession.value;
                                const msgs = Array.isArray(s.messages) ? [...s.messages] : [];
                                let idx = -1;
                                for (let i = msgs.length - 1; i >= 0; i--) {
                                    const m = msgs[i];
                                    if (m && m.type === 'pet' && m.timestamp === petTimestamp) {
                                        idx = i;
                                        break;
                                    }
                                }
                                if (idx < 0) idx = petIdx;
                                if (idx >= 0 && msgs[idx] && msgs[idx].type === 'pet') {
                                    msgs[idx] = { ...msgs[idx], message: accumulated, error: false, aborted: false };
                                    activeSession.value = { ...s, messages: msgs };
                                    if (autoScroll) scrollToBottom();
                                }
                            } catch (_) { }
                        }
                    );
                } catch (e) {
                    const aborted = _isAbortError(e);
                    if (aborted) {
                        streamAborted = true;
                    } else {
                        streamErrorMessage = String(e?.message || '请求失败');
                    }
                } finally {
                    if (sessionChatSending) sessionChatSending.value = false;
                    if (sessionChatAbortController) sessionChatAbortController.value = null;
                    if (sessionChatStreamingTargetTimestamp) sessionChatStreamingTargetTimestamp.value = null;
                    if (sessionChatStreamingType) sessionChatStreamingType.value = '';
                }

                const finalSession = (() => {
                    const s = activeSession.value || currentSession;
                    const msgs = Array.isArray(s.messages) ? [...s.messages] : [];
                    let idx = -1;
                    for (let i = msgs.length - 1; i >= 0; i--) {
                        const m = msgs[i];
                        if (m && m.type === 'pet' && m.timestamp === petTimestamp) {
                            idx = i;
                            break;
                        }
                    }
                    if (idx < 0) idx = petIdx;
                    if (idx >= 0 && msgs[idx] && msgs[idx].type === 'pet') {
                        const trimmed = String(accumulated || '').trim();
                        const content = streamErrorMessage
                            ? (trimmed || `请求失败：${streamErrorMessage}`)
                            : (streamAborted && !trimmed ? '已停止' : trimmed);
                        msgs[idx] = {
                            ...msgs[idx],
                            message: content,
                            ...(streamErrorMessage ? { error: true } : {}),
                            ...(streamAborted ? { aborted: true } : {})
                        };
                    }
                    return { ...s, messages: msgs, pageContent: String(sessionContextDraft?.value ?? s.pageContent ?? '') };
                })();
                activeSession.value = finalSession;

                try {
                    const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                    const sessionSync = getSessionSyncService();
                    await sessionSync.saveSession({ ...finalSession, updatedAt: Date.now(), lastAccessTime: Date.now() });
                } catch (_) { }

                if (streamErrorMessage && window.showError) {
                    window.showError(streamErrorMessage);
                }
            }, '重试会话消息');
        },
        copySessionChatMessage: async (text, m, idx) => {
            return safeExecute(async () => {
                const content = String(text ?? '').trim();
                if (!content) return;
                if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                    await navigator.clipboard.writeText(content);
                    _setFeedbackFlag(sessionChatCopyFeedback, _sessionChatMessageKey(m, idx), 1200);
                    if (window.showSuccess) window.showSuccess('已复制');
                    return;
                }
                const ta = document.createElement('textarea');
                ta.value = content;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                ta.style.top = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                _setFeedbackFlag(sessionChatCopyFeedback, _sessionChatMessageKey(m, idx), 1200);
                if (window.showSuccess) window.showSuccess('已复制');
            }, '复制消息');
        },
        sendSessionChatMessageToRobot: async (robot, m, idx) => {
            return safeExecute(async () => {
                const r = robot || {};
                const webhook = String(r.webhook || '').trim();
                if (!webhook) return;
                const content = String((m && (m.message || m.content)) || '').trim();
                if (!content) return;

                if (!window.API_URL) {
                    throw new Error('API地址未配置');
                }

                try {
                    const apiUrl = `${window.API_URL}/wework/send-message`;
                    const payload = {
                        webhook_url: webhook,
                        content: content
                    };

                    const res = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const data = await res.json().catch(() => ({}));

                    if (!res.ok) {
                        throw new Error(data?.message || data?.errmsg || `发送失败: ${res.status}`);
                    }

                    if (data.code !== 0 && data.code !== undefined) {
                        throw new Error(data.message || data.errmsg || '发送失败');
                    }

                    if (window.showSuccess) window.showSuccess('已发送到机器人');
                } catch (e) {
                    if (window.showError) window.showError(e?.message || '发送失败');
                    throw e;
                }
            }, '发送到机器人');
        },
        sendSessionChatMessage: async () => {
            return safeExecute(async () => {
                if (!activeSession?.value) return;
                if (sessionChatSending?.value) return;
                const rawText = String(sessionChatInput?.value ?? '');
                const text = rawText.trim();
                const images = Array.isArray(sessionChatDraftImages?.value) ? sessionChatDraftImages.value.filter(Boolean).slice(0, 4) : [];
                if (!text && images.length === 0) return;

                if (sessionChatLastDraftText) sessionChatLastDraftText.value = text;
                if (sessionChatLastDraftImages) sessionChatLastDraftImages.value = images;

                const now = Date.now();
                const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                const sessionSync = getSessionSyncService();
                const uploadOne = async (src) => {
                    const raw = String(src || '').trim();
                    if (!raw) return '';
                    if (/^https?:\/\//i.test(raw)) return raw;
                    if (!raw.startsWith('data:image/')) {
                        throw new Error('图片格式不支持');
                    }
                    return await sessionSync.uploadImageToOss(raw, 'aicr/images');
                };
                const imageUrls = images.length > 0
                    ? (await Promise.all(images.map((src) => uploadOne(src)))).filter(Boolean)
                    : [];
                if (images.length > 0 && imageUrls.length === 0) {
                    throw new Error('上传图片失败');
                }

                const userMessage = {
                    type: 'user',
                    message: text,
                    timestamp: now,
                    ...(imageUrls.length > 0 ? { imageDataUrls: imageUrls, imageDataUrl: imageUrls[0] } : {})
                };
                const petMessage = { type: 'pet', message: '', timestamp: now + 1 };

                const prevSession = activeSession.value;
                const prevMessages = Array.isArray(prevSession.messages) ? prevSession.messages : [];
                const nextSession = {
                    ...prevSession,
                    messages: [...prevMessages, userMessage, petMessage],
                    updatedAt: now,
                    lastAccessTime: now
                };

                activeSession.value = nextSession;
                if (sessionChatInput) sessionChatInput.value = '';
                if (sessionChatDraftImages) sessionChatDraftImages.value = [];

                const shouldAutoScroll = () => {
                    try {
                        const el = document.getElementById('pet-chat-messages');
                        if (!el) return true;
                        const distance = (el.scrollHeight || 0) - (el.scrollTop || 0) - (el.clientHeight || 0);
                        return distance < 140;
                    } catch (_) {
                        return true;
                    }
                };

                const scrollToBottom = () => {
                    try {
                        const el = document.getElementById('pet-chat-messages');
                        if (el) el.scrollTop = el.scrollHeight;
                    } catch (_) { }
                };
                setTimeout(scrollToBottom, 0);

                const pageContent = String(sessionContextDraft?.value ?? nextSession.pageContent ?? '').trim();
                const includeContext = sessionContextEnabled?.value === true;
                const history = _buildSessionChatHistoryText(prevMessages, prevMessages.length);
                const fromSystem = String(sessionBotSystemPrompt?.value || defaultSessionBotSystemPrompt).trim() || defaultSessionBotSystemPrompt;
                const fromUser = _buildSessionChatUserPrompt({ text, images: imageUrls, pageContent, includeContext, historyText: history });

                const { streamPrompt } = await import('/src/services/modules/crud.js');
                const promptUrl = getPromptUrl();

                let accumulated = '';
                if (sessionChatStreamingTargetTimestamp) sessionChatStreamingTargetTimestamp.value = petMessage.timestamp;
                if (sessionChatStreamingType) sessionChatStreamingType.value = 'send';
                if (sessionChatSending) sessionChatSending.value = true;
                const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                if (sessionChatAbortController) sessionChatAbortController.value = controller;
                let streamErrorMessage = '';
                let streamAborted = false;

                try {
                    await streamPrompt(
                        promptUrl,
                        {
                            module_name: 'services.ai.chat_service',
                            method_name: 'chat',
                            parameters: {
                                system: fromSystem,
                                user: fromUser,
                                stream: true,
                                ...(String(sessionBotModel?.value || '').trim()
                                    ? { model: String(sessionBotModel.value || '').trim() }
                                    : {}),
                                ...(imageUrls.length > 0 ? { images: imageUrls } : {})
                            }
                        },
                        controller ? { signal: controller.signal } : {},
                        (chunk) => {
                            const autoScroll = shouldAutoScroll();
                            accumulated += String(chunk || '');
                            try {
                                const s = activeSession.value;
                                const msgs = Array.isArray(s.messages) ? [...s.messages] : [];
                                const lastIdx = msgs.length - 1;
                                if (lastIdx >= 0) {
                                    const last = msgs[lastIdx];
                                    if (last && last.type === 'pet' && last.timestamp === petMessage.timestamp) {
                                        msgs[lastIdx] = { ...last, message: accumulated, error: false, aborted: false };
                                        activeSession.value = { ...s, messages: msgs };
                                        if (autoScroll) scrollToBottom();
                                    }
                                }
                            } catch (_) { }
                        }
                    );
                } catch (e) {
                    const aborted = _isAbortError(e);
                    if (aborted) {
                        streamAborted = true;
                    } else {
                        streamErrorMessage = String(e?.message || '请求失败');
                    }
                } finally {
                    if (sessionChatSending) sessionChatSending.value = false;
                    if (sessionChatAbortController) sessionChatAbortController.value = null;
                    if (sessionChatStreamingTargetTimestamp) sessionChatStreamingTargetTimestamp.value = null;
                    if (sessionChatStreamingType) sessionChatStreamingType.value = '';
                }

                const finalSession = (() => {
                    const s = activeSession.value || nextSession;
                    const msgs = Array.isArray(s.messages) ? [...s.messages] : [];
                    const lastIdx = msgs.length - 1;
                    if (lastIdx >= 0) {
                        const last = msgs[lastIdx];
                        if (last && last.type === 'pet' && last.timestamp === petMessage.timestamp) {
                            const trimmed = String(accumulated || '').trim();
                            const content = streamErrorMessage
                                ? (trimmed || `请求失败：${streamErrorMessage}`)
                                : (streamAborted && !trimmed ? '已停止' : trimmed);
                            msgs[lastIdx] = {
                                ...last,
                                message: content,
                                ...(streamErrorMessage ? { error: true } : {}),
                                ...(streamAborted ? { aborted: true } : {})
                            };
                        }
                    }
                    return { ...s, messages: msgs, pageContent: String(sessionContextDraft?.value ?? s.pageContent ?? '') };
                })();
                activeSession.value = finalSession;

                try {
                    const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                    const sessionSync = getSessionSyncService();
                    await sessionSync.saveSession({ ...finalSession, updatedAt: Date.now(), lastAccessTime: Date.now() });
                } catch (_) { }

                try {
                    const robots = Array.isArray(weChatRobots?.value) ? weChatRobots.value : [];
                    const msgs = Array.isArray(finalSession.messages) ? finalSession.messages : [];
                    const last = msgs[msgs.length - 1];
                    const content = String(last?.message || last?.content || '').trim();
                    if (content) {
                        const targets = robots.filter(r => r && r.enabled && r.autoForward && r.webhook);
                        await Promise.all(targets.map(async (r) => {
                            await fetch(String(r.webhook), {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ msgtype: 'text', text: { content } })
                            }).catch(() => { });
                        }));
                    }
                } catch (_) { }

                if (streamErrorMessage && window.showError) {
                    window.showError(streamErrorMessage);
                }
            }, '发送会话消息', (info) => { try { if (window.showError) window.showError(String(info?.message || '发送失败')); } catch (_) { } });
        },
        canSendSessionChat: Vue.computed(() => {
            try {
                const hasSession = !!(activeSession && activeSession.value);
                const text = String(sessionChatInput?.value ?? '').trim();
                const hasImages = Array.isArray(sessionChatDraftImages?.value) && sessionChatDraftImages.value.some(Boolean);
                const sending = !!sessionChatSending?.value;
                return hasSession && !sending && (!!text || hasImages);
            } catch (_) {
                return false;
            }
        }),
        formatDate,
        buildWelcomeCardHtml,
        buildWelcomeCardHtmlForSession,
        bindWelcomeCardEvents
    };
 
    const sessionContextMethods = {
        toggleSessionContextSwitch: () => {
            if (!sessionContextEnabled) return;
            sessionContextEnabled.value = !sessionContextEnabled.value;
            try {
                localStorage.setItem('aicr_context_switch_enabled', sessionContextEnabled.value ? '1' : '0');
            } catch (_) { }
        },
        setSessionContextEnabled: (enabled) => {
            if (!sessionContextEnabled) return;
            sessionContextEnabled.value = !!enabled;
            try {
                localStorage.setItem('aicr_context_switch_enabled', sessionContextEnabled.value ? '1' : '0');
            } catch (_) { }
        },
        openSessionContextEditor: async () => {
            if (sessionContextMode) sessionContextMode.value = 'split';
            if (sessionContextOptimizeBackup) sessionContextOptimizeBackup.value = '';
            if (sessionContextUndoVisible) sessionContextUndoVisible.value = false;
            if (sessionContextUserEdited) sessionContextUserEdited.value = false;
            if (sessionContextRefreshConfirmUntil) sessionContextRefreshConfirmUntil.value = 0;
            if (sessionContextRefreshStatus) sessionContextRefreshStatus.value = '';
            if (sessionContextOptimizeStatus) sessionContextOptimizeStatus.value = '';
            if (sessionContextSaveStatus) sessionContextSaveStatus.value = '';
            if (sessionContextTranslating) sessionContextTranslating.value = '';
            if (sessionContextOptimizing) sessionContextOptimizing.value = false;
            if (sessionContextSaving) sessionContextSaving.value = false;
 
            const key = selectedKey?.value;
            let staticFile = null;
            if (key && typeof loadFileByKey === 'function') {
                staticFile = await loadFileByKey(key);
            }
            const staticContent = staticFile && typeof staticFile.content === 'string' ? staticFile.content : '';
            if (sessionContextDraft) sessionContextDraft.value = String(staticContent || '');
            if (activeSession?.value) {
                activeSession.value = { ...activeSession.value, pageContent: String(staticContent || '') };
            }
            if (sessionContextEditorVisible) sessionContextEditorVisible.value = true;
            ensureSessionContextScrollSync();
            try {
                if (_sessionContextKeydownHandler) {
                    document.removeEventListener('keydown', _sessionContextKeydownHandler, true);
                    _sessionContextKeydownHandler = null;
                }
                _sessionContextKeydownHandler = (e) => {
                    try {
                        if (!sessionContextEditorVisible?.value) return;
                        if (!e) return;
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            if (_isAicrImagePreviewOpen()) {
                                _closeAicrImagePreview();
                                return;
                            }
                            _closeSessionContextEditorInternal();
                            return;
                        }
                        const isSave = (e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey);
                        if (isSave) {
                            e.preventDefault();
                            if (typeof window.aicrApp?.saveSessionContext === 'function') {
                                window.aicrApp.saveSessionContext();
                            }
                        }
                    } catch (_) { }
                };
                document.addEventListener('keydown', _sessionContextKeydownHandler, true);
            } catch (_) { }
 
            try {
                if (_sessionContextPreviewClickHandler) {
                    document.removeEventListener('click', _sessionContextPreviewClickHandler, true);
                    _sessionContextPreviewClickHandler = null;
                }
                _sessionContextPreviewClickHandler = (e) => {
                    try {
                        if (!sessionContextEditorVisible?.value) return;
                        const t = e && e.target;
                        if (!t || t.nodeType !== 1) return;
                        const preview = t.closest ? t.closest('.aicr-session-context-preview') : null;
                        if (!preview) return;
                        if (String(t.tagName || '').toLowerCase() !== 'img') return;
                        const src = t.getAttribute ? (t.getAttribute('src') || '') : '';
                        if (!src) return;
                        if (e && typeof e.preventDefault === 'function') e.preventDefault();
                        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                        _openAicrImagePreview(src);
                    } catch (_) { }
                };
                document.addEventListener('click', _sessionContextPreviewClickHandler, true);
            } catch (_) { }
        },
        closeSessionContextEditor: () => {
            _closeSessionContextEditorInternal();
        },
        setSessionContextMode: (mode) => {
            if (!sessionContextMode) return;
            const v = String(mode || '').toLowerCase();
            sessionContextMode.value = v === 'preview' ? 'preview' : (v === 'split' ? 'split' : 'edit');
            ensureSessionContextScrollSync();
        },
        setSessionContextDraft: (v) => {
            if (!sessionContextDraft) return;
            sessionContextDraft.value = String(v ?? '');
            if (sessionContextUserEdited) sessionContextUserEdited.value = true;
        },
        onSessionContextPaste: async (e) => {
            let hideGlobalLoading = null;
            try {
                const clipboard = e?.clipboardData;
                const items = clipboard?.items;
                if (!items || typeof items.length !== 'number') return;
 
                const imageFiles = [];
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (!item || typeof item.type !== 'string') continue;
                    if (!item.type.includes('image')) continue;
                    const file = item.getAsFile && item.getAsFile();
                    if (file) imageFiles.push(file);
                }
                if (imageFiles.length === 0) return;
 
                if (e && typeof e.preventDefault === 'function') e.preventDefault();
 
                try {
                    const mod = await import('/src/utils/ui/loading.js');
                    if (mod && typeof mod.showGlobalLoading === 'function') mod.showGlobalLoading('正在上传图片...');
                    if (mod && typeof mod.hideGlobalLoading === 'function') hideGlobalLoading = mod.hideGlobalLoading;
                } catch (_) { }
 
                const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                const sessionSync = getSessionSyncService();
 
                const toDataUrl = (file) => new Promise((resolve, reject) => {
                    try {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result || '').trim());
                        reader.onerror = () => reject(new Error('读取图片失败'));
                        reader.readAsDataURL(file);
                    } catch (err) {
                        reject(err);
                    }
                });
 
                const picked = imageFiles.slice(0, 4);
                const dataUrls = (await Promise.all(picked.map(toDataUrl))).filter(v => v && v.startsWith('data:image/'));
                const urls = (await Promise.all(dataUrls.map((src) => sessionSync.uploadImageToOss(src, 'aicr/images')))).filter(Boolean);
                if (urls.length === 0) return;
 
                const md = urls.map(u => `![](${u})`).join('\n\n');
                const insertion = `\n\n${md}\n\n`;
 
                const textarea = e && e.target;
                const current = String(sessionContextDraft?.value ?? '');
                const next = _insertTextAtTextarea(textarea, insertion, current);
                if (sessionContextDraft) sessionContextDraft.value = next;
                if (sessionContextUserEdited) sessionContextUserEdited.value = true;
                if (activeSession?.value) {
                    activeSession.value = { ...activeSession.value, pageContent: next };
                }
                if (window.showSuccess) window.showSuccess('已插入图片');
            } catch (_) {
                if (window.showError) window.showError('图片粘贴失败');
            } finally {
                try { if (typeof hideGlobalLoading === 'function') hideGlobalLoading(); } catch (_) { }
            }
        },
        isSessionContextActionBusy: () => {
            try {
                const optimizing = !!sessionContextOptimizing?.value;
                const saving = !!sessionContextSaving?.value;
                const translating = !!String(sessionContextTranslating?.value || '').trim();
                return optimizing || saving || translating;
            } catch (_) {
                return false;
            }
        },
        copySessionContextDraft: async () => {
            return safeExecute(async () => {
                const content = String(sessionContextDraft?.value ?? '').trim();
                if (!content) return;
                if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                    await navigator.clipboard.writeText(content);
                    if (window.showSuccess) window.showSuccess('已复制');
                    return;
                }
                const ta = document.createElement('textarea');
                ta.value = content;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                ta.style.top = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                if (window.showSuccess) window.showSuccess('已复制');
            }, '复制页面上下文');
        },
        sessionContextOptimizeButtonLabel: () => {
            try {
                if (sessionContextOptimizing?.value) return '⏳';
                const status = String(sessionContextOptimizeStatus?.value || '');
                if (status === 'success') return '✅';
                if (status === 'error') return '✕';
                return '✨';
            } catch (_) {
                return '✨';
            }
        },
        sessionContextOptimizeButtonTitle: () => {
            return '智能优化上下文内容';
        },
        optimizeSessionContextDraft: async () => {
            return safeExecute(async () => {
                if (!sessionContextDraft) return;
                const raw = String(sessionContextDraft.value ?? '');
                if (!raw.trim()) return;
                if (sessionContextOptimizing?.value) return;
 
                if (sessionContextOptimizeBackup) sessionContextOptimizeBackup.value = raw;
                if (sessionContextUndoVisible) sessionContextUndoVisible.value = true;
 
                if (sessionContextOptimizing) sessionContextOptimizing.value = true;
                if (sessionContextOptimizeStatus) sessionContextOptimizeStatus.value = '';
                _sessionContextSetStatus(sessionContextOptimizeStatus, 'loading');
 
                try {
                    const systemPrompt = `你是一个专业的“页面上下文清理与排版”专家。
你的任务不是总结或改写，而是：在不新增信息、不遗漏关键信息的前提下，把页面渲染后的上下文内容清理干净并排版成更易读的 Markdown。
必须遵守：
1. 不总结、不提炼、不下结论，不添加原文没有的新信息
2. 尽量保持原文的信息顺序与层级，只做清理与格式化
3. 删除与正文无关的内容：广告/赞助、导航菜单、推荐/相关阅读、评论区、页脚版权、Cookie/订阅/登录提示、分享按钮文案等
4. 保留代码块、表格、列表、链接文字等结构；必要时仅做轻量的结构化（如把连续短句整理成列表）
5. 输出必须是有效的 Markdown，且只输出 Markdown 正文，不要任何解释`;
 
                    const cleaned = await _sessionContextChatOnce({ system: systemPrompt, user: raw });
                    if (!cleaned.trim()) throw new Error('未获取到优化结果');
                    sessionContextDraft.value = cleaned;
                    if (sessionContextUserEdited) sessionContextUserEdited.value = true;
                    _sessionContextSetStatus(sessionContextOptimizeStatus, 'success', 2000);
                    if (window.showSuccess) window.showSuccess('已优化');
                } catch (e) {
                    _sessionContextSetStatus(sessionContextOptimizeStatus, 'error', 2000);
                    throw e;
                } finally {
                    if (sessionContextOptimizing) {
                        const t = setTimeout(() => {
                            try { sessionContextOptimizing.value = false; } catch (_) { }
                        }, 2000);
                        _sessionContextTimeouts.add(t);
                    }
                }
            }, '智能优化页面上下文');
        },
        sessionContextTranslateButtonLabel: (target) => {
            try {
                const t = String(target || '').toLowerCase();
                if (String(sessionContextTranslating?.value || '').toLowerCase() === t) return '⏳';
                return t === 'en' ? '🇺🇸' : '🇨🇳';
            } catch (_) {
                return String(target || '').toLowerCase() === 'en' ? '🇺🇸' : '🇨🇳';
            }
        },
        translateSessionContextDraft: async (target = 'zh') => {
            return safeExecute(async () => {
                if (!sessionContextDraft) return;
                const raw = String(sessionContextDraft.value ?? '');
                if (!raw.trim()) return;
                const t = String(target || '').toLowerCase() === 'en' ? 'en' : 'zh';
                if (String(sessionContextTranslating?.value || '').trim()) return;
                if (sessionContextTranslating) sessionContextTranslating.value = t;
                try {
                    const systemPrompt = '你是一个专业翻译。只输出翻译后的正文，不要解释。保留 Markdown 结构（标题/列表/表格/代码块/链接）。不要改写，不要总结。';
                    const userPrompt = t === 'en'
                        ? `把下面的 Markdown 内容翻译成英文：\n\n${raw}`
                        : `把下面的 Markdown 内容翻译成中文：\n\n${raw}`;
                    const translated = await _sessionContextChatOnce({ system: systemPrompt, user: userPrompt });
                    if (!translated.trim()) throw new Error('未获取到翻译结果');
                    sessionContextDraft.value = translated;
                    if (sessionContextUserEdited) sessionContextUserEdited.value = true;
                    if (window.showSuccess) window.showSuccess('已翻译');
                } finally {
                    if (sessionContextTranslating) sessionContextTranslating.value = '';
                }
            }, '翻译页面上下文');
        },
        sessionContextSaveButtonLabel: () => {
            try {
                if (sessionContextSaving?.value) return '⏳';
                const status = String(sessionContextSaveStatus?.value || '');
                if (status === 'success') return '✅';
                if (status === 'error') return '✕';
                return '💾';
            } catch (_) {
                return '💾';
            }
        },
        sessionContextSaveButtonTitle: () => {
            return '保存修改 (Ctrl+S / Cmd+S)';
        },
        undoOptimizeSessionContextDraft: async () => {
            return safeExecute(async () => {
                const backup = String(sessionContextOptimizeBackup?.value ?? '');
                if (!backup) return;
                if (sessionContextDraft) sessionContextDraft.value = backup;
                if (sessionContextUndoVisible) sessionContextUndoVisible.value = false;
                if (sessionContextOptimizeBackup) sessionContextOptimizeBackup.value = '';
                if (window.showSuccess) window.showSuccess('已撤销');
            }, '撤销优化');
        },
        saveSessionContext: async () => {
            return safeExecute(async () => {
                if (sessionContextSaving?.value) return;
                if (sessionContextSaving) sessionContextSaving.value = true;
                if (sessionContextSaveStatus) sessionContextSaveStatus.value = '';
                _sessionContextSetStatus(sessionContextSaveStatus, 'loading');
 
                try {
                    const content = String(sessionContextDraft?.value ?? '');
                    const key = selectedKey?.value;
 
                    const apiBase = (window.API_URL && /^https?:\/\//i.test(window.API_URL))
                        ? String(window.API_URL).replace(/\/+$/, '')
                        : '';
 
                    if (apiBase && key) {
                        const file = Array.isArray(files?.value)
                            ? files.value.find(f => f && (f.key === key || f.path === key))
                            : null;
                        const path = String(file?.path || file?.key || key || '').replace(/\\/g, '/').replace(/^\/+/, '');
                        const cleanPath = path.startsWith('static/') ? path.slice(7) : path;
 
                        const res = await fetch(`${apiBase}/write-file`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ target_file: cleanPath, content, is_base64: false })
                        });
                        if (!res.ok) {
                            const errorData = await res.json().catch(() => ({}));
                            throw new Error(errorData.message || `保存失败: ${res.status}`);
                        }
                        const result = await res.json().catch(() => ({}));
                        if (result && result.code != null && result.code !== 0 && result.code !== 200) {
                            throw new Error(result.message || '保存失败');
                        }
 
                        if (Array.isArray(files?.value)) {
                            const idx = files.value.findIndex(f => f && (f.key === key || f.path === key));
                            if (idx >= 0) {
                                files.value[idx] = { ...files.value[idx], content, __fromStatic: true };
                            }
                        }
                    }
 
                    if (activeSession?.value) {
                        const prev = activeSession.value;
                        activeSession.value = { ...prev, pageContent: content, updatedAt: Date.now(), lastAccessTime: Date.now() };
                    }
 
                    if (sessionContextUserEdited) sessionContextUserEdited.value = false;
                    _sessionContextSetStatus(sessionContextSaveStatus, 'success', 2000);
                    if (window.showSuccess) window.showSuccess('已保存');
                } catch (e) {
                    _sessionContextSetStatus(sessionContextSaveStatus, 'error', 2000);
                    throw e;
                } finally {
                    if (sessionContextSaving) {
                        const t = setTimeout(() => {
                            try { sessionContextSaving.value = false; } catch (_) { }
                        }, 2000);
                        _sessionContextTimeouts.add(t);
                    }
                }
            }, '保存页面上下文');
        },
        downloadSessionContextDraft: async () => {
            return safeExecute(async () => {
                const content = String(sessionContextDraft?.value ?? '');
                if (!content.trim()) return;
                const key = selectedKey?.value;
                const file = Array.isArray(files?.value)
                    ? files.value.find(f => f && (f.key === key || f.path === key))
                    : null;
                const baseName = String(file?.name || file?.path || file?.key || key || 'page_context').split('/').pop() || 'page_context';
                const name = baseName.toLowerCase().endsWith('.md') ? baseName : `${baseName}.md`;
                const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                try {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = String(name || '').replace(/\s+/g, '_');
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                } finally {
                    URL.revokeObjectURL(url);
                }
                if (window.showSuccess) window.showSuccess('已下载');
            }, '下载页面上下文');
        }
    };
 
    const sessionSettingsMethods = {
        openSessionSettings: () => {
            if (store.sessionFaqVisible) store.sessionFaqVisible.value = false;
            _closeSessionContextEditorInternal();
            if (sessionBotModelDraft) sessionBotModelDraft.value = String(sessionBotModel?.value || '').trim();
            if (sessionBotSystemPromptDraft) sessionBotSystemPromptDraft.value = String(sessionBotSystemPrompt?.value || defaultSessionBotSystemPrompt).trim();
            if (sessionSettingsVisible) sessionSettingsVisible.value = true;
        },
        openWeChatSettings: () => {
            if (store.sessionFaqVisible) store.sessionFaqVisible.value = false;
            _closeSessionContextEditorInternal();
            const src = Array.isArray(weChatRobots?.value) ? weChatRobots.value : [];
            if (weChatRobotsDraft) weChatRobotsDraft.value = src.map(r => ({ ...r }));
            if (weChatSettingsVisible) weChatSettingsVisible.value = true;
        },
        closeSessionSettings: () => {
            if (sessionSettingsVisible) sessionSettingsVisible.value = false;
        },
        closeWeChatSettings: () => {
            if (weChatSettingsVisible) weChatSettingsVisible.value = false;
        },
        restoreSessionSettingsDefaults: () => {
            if (sessionBotModelDraft) sessionBotModelDraft.value = '';
            if (sessionBotSystemPromptDraft) sessionBotSystemPromptDraft.value = defaultSessionBotSystemPrompt;
        },
        restoreWeChatSettingsDefaults: () => {
            if (weChatRobotsDraft) weChatRobotsDraft.value = [];
        },
        saveSessionSettings: () => {
            const model = String(sessionBotModelDraft?.value || '').trim();
            const prompt = String(sessionBotSystemPromptDraft?.value || '').trim() || defaultSessionBotSystemPrompt;
            if (sessionBotModel) sessionBotModel.value = model;
            if (sessionBotSystemPrompt) sessionBotSystemPrompt.value = prompt;
            persistSessionBotSettings();
            if (sessionSettingsVisible) sessionSettingsVisible.value = false;
            if (window.showSuccess) window.showSuccess('已保存');
        },
        saveWeChatSettings: () => {
            const src = Array.isArray(weChatRobotsDraft?.value) ? weChatRobotsDraft.value : [];
            const normalized = src
                .map((r) => ({
                    id: r.id || ('wr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
                    name: String(r.name || '').trim() || '机器人',
                    webhook: String(r.webhook || '').trim(),
                    enabled: !!r.enabled,
                    autoForward: !!r.autoForward
                }))
                .filter(r => r.webhook);
            if (weChatRobots) weChatRobots.value = normalized;
            persistWeChatSettings();
            if (weChatSettingsVisible) weChatSettingsVisible.value = false;
            if (window.showSuccess) window.showSuccess('已保存');
        },
        addWeChatRobotDraft: () => {
            const list = Array.isArray(weChatRobotsDraft?.value) ? [...weChatRobotsDraft.value] : [];
            const idx = list.length + 1;
            list.push({
                id: 'wr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                name: '机器人' + idx,
                webhook: '',
                enabled: true,
                autoForward: true
            });
            weChatRobotsDraft.value = list;
        },
        removeWeChatRobotDraft: (index) => {
            const i = Number(index);
            const list = Array.isArray(weChatRobotsDraft?.value) ? [...weChatRobotsDraft.value] : [];
            if (!Number.isFinite(i) || i < 0 || i >= list.length) return;
            list.splice(i, 1);
            weChatRobotsDraft.value = list;
        }
    };
 
    return {
        ...sessionChatMethods,
        ...sessionContextMethods,
        ...sessionSettingsMethods,
        postData,
        SERVICE_MODULE
    };
};
