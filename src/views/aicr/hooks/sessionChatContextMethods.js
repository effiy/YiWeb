import { createSessionChatContextShared } from './sessionChatContextShared.js';
import { createSessionChatContextChatMethods } from './sessionChatContextChatMethods.js';
import { createSessionChatContextContextMethods } from './sessionChatContextContextMethods.js';
import { createSessionChatContextSettingsMethods } from './sessionChatContextSettingsMethods.js';

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

    const {
        formatDate,
        buildWelcomeCardHtml,
        buildWelcomeCardHtmlForSession,
        bindWelcomeCardEvents
    } = createSessionChatContextShared({
        store,
        safeExecute,
        postData,
        SERVICE_MODULE,
        renderMarkdownHtml,
        renderStreamingHtml,
        getPromptUrl
    });
 
    const _sessionContextTimeouts = new Set();
    let _sessionContextKeydownHandler = null;
    let _sessionContextPreviewClickHandler = null;
    let __aicrImagePreviewRoot = null;

    const getSessionContextTimeouts = () => _sessionContextTimeouts;
    const getSessionContextKeydownHandler = () => _sessionContextKeydownHandler;
    const setSessionContextKeydownHandler = (v) => { _sessionContextKeydownHandler = v || null; };
    const getSessionContextPreviewClickHandler = () => _sessionContextPreviewClickHandler;
    const setSessionContextPreviewClickHandler = (v) => { _sessionContextPreviewClickHandler = v || null; };

    const getSessionChatIsComposing = () => _sessionChatIsComposing;
    const setSessionChatIsComposing = (v) => { _sessionChatIsComposing = !!v; };
    const getSessionChatCompositionEndTime = () => _sessionChatCompositionEndTime;
    const setSessionChatCompositionEndTime = (v) => { _sessionChatCompositionEndTime = Number(v) || 0; };
 
    let sessionContextScrollSyncCleanup = null;
    let sessionMessageEditorScrollSyncCleanup = null;
 
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
 
    const sessionChatMethods = createSessionChatContextChatMethods({
        store,
        safeExecute,
        postData,
        SERVICE_MODULE,
        renderMarkdownHtml,
        renderStreamingHtml,
        getPromptUrl,
        files,
        selectedKey,
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
        sessionBotModel,
        sessionBotSystemPrompt,
        defaultSessionBotSystemPrompt,
        weChatRobots,
        sessionMessageEditorVisible,
        sessionMessageEditorDraft,
        sessionMessageEditorMode,
        sessionMessageEditorIndex,
        selectSessionForChat,
        ensureSessionContextScrollSync,
        ensureSessionMessageEditorScrollSync,
        cleanupSessionMessageEditorScrollSync,
        _isAbortError,
        _isStreamingMessage,
        _sessionChatMessageKey,
        _setFeedbackFlag,
        _moveSessionChatMessageBlock,
        _buildSessionChatHistoryText,
        _buildSessionChatUserPrompt,
        getSessionChatIsComposing,
        setSessionChatIsComposing,
        getSessionChatCompositionEndTime,
        setSessionChatCompositionEndTime,
        SESSION_CHAT_COMPOSITION_END_DELAY: _SESSION_CHAT_COMPOSITION_END_DELAY,
        formatDate,
        buildWelcomeCardHtml,
        buildWelcomeCardHtmlForSession,
        bindWelcomeCardEvents
    });
 
    const sessionContextMethods = createSessionChatContextContextMethods({
        store,
        safeExecute,
        files,
        selectedKey,
        loadFileByKey,
        activeSession,
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
        getSessionContextTimeouts,
        getSessionContextKeydownHandler,
        setSessionContextKeydownHandler,
        getSessionContextPreviewClickHandler,
        setSessionContextPreviewClickHandler,
        _isAicrImagePreviewOpen,
        _closeAicrImagePreview,
        _openAicrImagePreview,
        _closeSessionContextEditorInternal,
        _insertTextAtTextarea,
        _sessionContextSetStatus,
        _sessionContextChatOnce,
        ensureSessionContextScrollSync
    });
 
    const sessionSettingsMethods = createSessionChatContextSettingsMethods({
        store,
        sessionSettingsVisible,
        sessionBotModel,
        sessionBotSystemPrompt,
        sessionBotModelDraft,
        sessionBotSystemPromptDraft,
        weChatSettingsVisible,
        weChatRobots,
        weChatRobotsDraft,
        defaultSessionBotSystemPrompt,
        persistSessionBotSettings,
        persistWeChatSettings,
        _closeSessionContextEditorInternal
    });
 
    return {
        ...sessionChatMethods,
        ...sessionContextMethods,
        ...sessionSettingsMethods,
        postData,
        SERVICE_MODULE
    };
};
