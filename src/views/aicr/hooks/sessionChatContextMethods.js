import { createSessionChatContextShared } from './helpers/sessionChatContextShared.js';
import { createSessionChatContextChatMethods } from './sessionChatContextChatMethods.js';
import { createSessionChatContextContextMethods } from './sessionChatContextContextMethods.js';
import { createSessionChatContextSettingsMethods } from './sessionChatContextSettingsMethods.js';
import { getStoredModel } from '/src/core/services/helper/authUtils.js?v=1';
import {
    insertTextAtTextarea,
    isAbortError,
    buildSessionChatHistoryText,
    buildSessionChatUserPrompt,
    sessionChatMessageKey,
    setFeedbackFlag
} from './helpers/sessionChatContextMethods.helpers.js';
import { createSessionChatContextScrollSync } from './sessionChatContextMethods.scrollSync.js';
import { createSelectSessionForChat } from './sessionChatContextMethods.selectSession.js';

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
        sessionChatScrollRequest,
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
    const defaultSessionBotModel = 'qwen3.5';
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
    let __aicrImagePreviewSrc = '';
    let __aicrImagePreviewKeydownHandler = null;
    let __aicrChatImagePreviewClickHandler = null;
    let __aicrImagePreviewStyleMounted = false;
    let __aicrImagePreviewCloseTimer = 0;
    let __aicrImagePreviewPrevActiveEl = null;

    const getSessionContextTimeouts = () => _sessionContextTimeouts;
    const getSessionContextKeydownHandler = () => _sessionContextKeydownHandler;
    const setSessionContextKeydownHandler = (v) => { _sessionContextKeydownHandler = v || null; };
    const getSessionContextPreviewClickHandler = () => _sessionContextPreviewClickHandler;
    const setSessionContextPreviewClickHandler = (v) => { _sessionContextPreviewClickHandler = v || null; };

    const getSessionChatIsComposing = () => _sessionChatIsComposing;
    const setSessionChatIsComposing = (v) => { _sessionChatIsComposing = !!v; };
    const getSessionChatCompositionEndTime = () => _sessionChatCompositionEndTime;
    const setSessionChatCompositionEndTime = (v) => { _sessionChatCompositionEndTime = Number(v) || 0; };
 
    const _insertTextAtTextarea = insertTextAtTextarea;
    const _isAbortError = isAbortError;
    const _buildSessionChatHistoryText = buildSessionChatHistoryText;
    const _buildSessionChatUserPrompt = buildSessionChatUserPrompt;
    const _sessionChatMessageKey = sessionChatMessageKey;
    const _setFeedbackFlag = setFeedbackFlag;

    const {
        cleanupSessionContextScrollSync,
        cleanupSessionMessageEditorScrollSync,
        ensureSessionContextScrollSync,
        ensureSessionMessageEditorScrollSync
    } = createSessionChatContextScrollSync({
        sessionContextEditorVisible,
        sessionContextMode,
        sessionMessageEditorVisible,
        sessionMessageEditorMode
    });

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
            const { getSessionSyncService } = await import('/src/core/services/aicr/sessionSyncService.js');
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

    const _getAicrImagePreviewFilename = (url, contentType = '') => {
        try {
            const raw = String(url || '').trim();
            const fromUrl = (() => {
                try {
                    if (!raw || raw.startsWith('data:')) return '';
                    const u = new URL(raw, window.location.href);
                    const parts = String(u.pathname || '').split('/').filter(Boolean);
                    const last = parts.length ? parts[parts.length - 1] : '';
                    const base = decodeURIComponent(last || '').trim();
                    if (!base) return '';
                    if (base.includes('.')) return base;
                    return '';
                } catch (_) {
                    return '';
                }
            })();
            if (fromUrl) return fromUrl;

            const ext = (() => {
                const ct = String(contentType || '').toLowerCase();
                if (ct.includes('png')) return 'png';
                if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
                if (ct.includes('webp')) return 'webp';
                if (ct.includes('gif')) return 'gif';
                if (ct.includes('svg')) return 'svg';
                if (raw.startsWith('data:image/')) {
                    const m = raw.match(/^data:image\/([a-zA-Z0-9.+-]+);/);
                    const k = String(m?.[1] || '').toLowerCase();
                    if (k === 'jpeg') return 'jpg';
                    if (k) return k;
                }
                return 'png';
            })();
            return `image_${Date.now()}.${ext}`;
        } catch (_) {
            return `image_${Date.now()}.png`;
        }
    };

    const _triggerAicrImageDownload = (href, filename) => {
        try {
            const a = document.createElement('a');
            a.href = String(href || '').trim();
            a.download = String(filename || '').trim() || `image_${Date.now()}.png`;
            a.rel = 'noopener';
            a.target = '_self';
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (_) { }
    };

    const _downloadAicrPreviewImage = async () => {
        const url = String(__aicrImagePreviewSrc || '').trim();
        if (!url) return;

        if (url.startsWith('data:')) {
            const filename = _getAicrImagePreviewFilename(url);
            _triggerAicrImageDownload(url, filename);
            return;
        }

        try {
            const res = await fetch(url, { credentials: 'same-origin' });
            if (!res || !res.ok) throw new Error('download_failed');
            const blob = await res.blob();
            const filename = _getAicrImagePreviewFilename(url, blob?.type || res.headers?.get?.('content-type') || '');
            const objectUrl = URL.createObjectURL(blob);
            _triggerAicrImageDownload(objectUrl, filename);
            setTimeout(() => {
                try { URL.revokeObjectURL(objectUrl); } catch (_) { }
            }, 1200);
        } catch (_) {
            try {
                const a = document.createElement('a');
                a.href = url;
                a.target = '_blank';
                a.rel = 'noopener';
                document.body.appendChild(a);
                a.click();
                a.remove();
            } catch (_) { }
        }
    };

    const _ensureAicrImagePreviewStyle = () => {
        try {
            if (__aicrImagePreviewStyleMounted) return;
            if (typeof document === 'undefined') return;
            const existing = document.getElementById('aicr-image-preview-style');
            if (existing) {
                __aicrImagePreviewStyleMounted = true;
                return;
            }
            const style = document.createElement('style');
            style.id = 'aicr-image-preview-style';
            style.textContent = `
                #aicr-image-preview{color:#fff;opacity:0;pointer-events:auto;transition:opacity 140ms ease}
                #aicr-image-preview.is-open{opacity:1}
                #aicr-image-preview .aicr-image-preview-frame{position:relative;max-width:min(96vw,1400px);max-height:96vh;transform:translate3d(0,6px,0) scale(.985);opacity:.98;transition:transform 160ms cubic-bezier(.2,.9,.2,1),opacity 160ms ease}
                #aicr-image-preview.is-open .aicr-image-preview-frame{transform:translate3d(0,0,0) scale(1);opacity:1}
                #aicr-image-preview .aicr-image-preview-img{display:block;max-width:96vw;max-height:96vh;border-radius:14px;box-shadow:0 20px 80px rgba(0,0,0,.55);background:rgba(255,255,255,0.06);object-fit:contain}
                #aicr-image-preview .aicr-image-preview-toolbar{position:absolute;top:10px;right:10px;display:flex;gap:8px;align-items:center}
                #aicr-image-preview .aicr-image-preview-btn{position:relative;top:auto;right:auto;transform:none;height:34px;padding:0 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.22);background:rgba(0,0,0,0.38);color:#fff;font-size:13px;cursor:pointer;backdrop-filter:blur(10px)}
                #aicr-image-preview .aicr-image-preview-close{position:relative;top:auto;right:auto;transform:none;width:38px;height:38px;padding:0;font-size:18px;background:rgba(0,0,0,0.46)}
                #aicr-image-preview .aicr-image-preview-btn:hover{background:rgba(0,0,0,0.6);border-color:rgba(255,255,255,0.3)}
                #aicr-image-preview .aicr-image-preview-btn:active{transform:translateY(1px)}
            `.trim();
            document.head.appendChild(style);
            __aicrImagePreviewStyleMounted = true;
        } catch (_) { }
    };

    const _openAicrImagePreview = (src) => {
        try {
            const url = String(src || '').trim();
            if (!url) return;
            if (!__aicrImagePreviewRoot) {
                _ensureAicrImagePreviewStyle();
                const root = document.createElement('div');
                root.id = 'aicr-image-preview';
                root.className = 'aicr-image-preview';
                root.setAttribute('role', 'dialog');
                root.setAttribute('aria-modal', 'true');
                root.style.cssText = 'position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,0.72);backdrop-filter:blur(2px)';
                root.innerHTML = `
                    <div class="aicr-image-preview-frame">
                        <img class="aicr-image-preview-img" alt="预览图片" />
                        <div class="aicr-image-preview-toolbar" aria-label="图片工具栏">
                            <button type="button" class="aicr-image-preview-btn aicr-image-preview-download" title="下载" aria-label="下载">下载</button>
                            <button type="button" class="aicr-image-preview-btn aicr-image-preview-close" title="关闭（Esc）" aria-label="关闭">✕</button>
                        </div>
                    </div>
                `;
                root.addEventListener('click', (e) => {
                    try {
                        const t = e && e.target;
                        const close = t && t.closest ? t.closest('.aicr-image-preview-close') : null;
                        if (close) {
                            if (e && typeof e.preventDefault === 'function') e.preventDefault();
                            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                            _closeAicrImagePreview({ immediate: true });
                            return;
                        }
                        const download = t && t.closest ? t.closest('.aicr-image-preview-download') : null;
                        if (download) {
                            if (e && typeof e.preventDefault === 'function') e.preventDefault();
                            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                            _downloadAicrPreviewImage();
                            return;
                        }
                        const frame = t && t.closest ? t.closest('.aicr-image-preview-frame') : null;
                        if (!frame) _closeAicrImagePreview({ immediate: false });
                    } catch (_) { }
                });
                document.body.appendChild(root);
                __aicrImagePreviewRoot = root;

                if (!__aicrImagePreviewKeydownHandler) {
                    __aicrImagePreviewKeydownHandler = (e) => {
                        try {
                            if (!_isAicrImagePreviewOpen()) return;
                            if (!e) return;
                            const key = String(e.key || '');
                            if (key !== 'Escape' && key !== 'Esc') return;
                            if (typeof e.preventDefault === 'function') e.preventDefault();
                            if (typeof e.stopPropagation === 'function') e.stopPropagation();
                            _closeAicrImagePreview({ immediate: true });
                        } catch (_) { }
                    };
                    document.addEventListener('keydown', __aicrImagePreviewKeydownHandler, true);
                }
            }
            const img = __aicrImagePreviewRoot.querySelector('.aicr-image-preview-img');
            if (img) img.src = url;
            if (__aicrImagePreviewCloseTimer) clearTimeout(__aicrImagePreviewCloseTimer);
            __aicrImagePreviewCloseTimer = 0;
            __aicrImagePreviewRoot.style.display = 'flex';
            if (__aicrImagePreviewRoot.classList) __aicrImagePreviewRoot.classList.remove('is-open');
            requestAnimationFrame(() => {
                try {
                    if (__aicrImagePreviewRoot && __aicrImagePreviewRoot.classList) __aicrImagePreviewRoot.classList.add('is-open');
                } catch (_) { }
            });
            __aicrImagePreviewSrc = url;
            try {
                __aicrImagePreviewPrevActiveEl = document.activeElement || null;
                const closeBtn = __aicrImagePreviewRoot.querySelector('.aicr-image-preview-close');
                if (closeBtn && typeof closeBtn.focus === 'function') closeBtn.focus({ preventScroll: true });
            } catch (_) { }
        } catch (_) { }
    };
 
    const _closeAicrImagePreview = (options = {}) => {
        try {
            if (!__aicrImagePreviewRoot) return;
            if (__aicrImagePreviewCloseTimer) clearTimeout(__aicrImagePreviewCloseTimer);
            __aicrImagePreviewCloseTimer = 0;
            if (__aicrImagePreviewRoot.classList) __aicrImagePreviewRoot.classList.remove('is-open');
            const immediate = options && options.immediate === true;
            if (immediate) {
                __aicrImagePreviewRoot.style.display = 'none';
            } else {
                const root = __aicrImagePreviewRoot;
                __aicrImagePreviewCloseTimer = setTimeout(() => {
                    try {
                        if (root) root.style.display = 'none';
                    } catch (_) { }
                }, 170);
            }
            __aicrImagePreviewSrc = '';
            try {
                const prev = __aicrImagePreviewPrevActiveEl;
                __aicrImagePreviewPrevActiveEl = null;
                if (prev && typeof prev.focus === 'function') prev.focus({ preventScroll: true });
            } catch (_) { }
        } catch (_) { }
    };
 
    const _isAicrImagePreviewOpen = () => {
        try {
            return !!(__aicrImagePreviewRoot && __aicrImagePreviewRoot.style.display === 'flex');
        } catch (_) {
            return false;
        }
    };

    try {
        if (!__aicrChatImagePreviewClickHandler && typeof document !== 'undefined') {
            __aicrChatImagePreviewClickHandler = (e) => {
                try {
                    const t = e && e.target;
                    if (!t || t.nodeType !== 1) return;
                    if (t.closest && t.closest('#aicr-image-preview')) return;
                    const img = t.closest ? t.closest('img') : null;
                    if (!img) return;
                    const msg = img.closest ? img.closest('.pet-chat-message') : null;
                    if (!msg) return;
                    const bubble = img.closest ? img.closest('.pet-chat-bubble') : null;
                    if (!bubble) return;
                    const container = bubble.closest ? bubble.closest('#pet-chat-messages') : null;
                    if (!container) return;
                    const src = String(img.currentSrc || img.getAttribute?.('src') || '').trim();
                    if (!src) return;
                    if (typeof e.preventDefault === 'function') e.preventDefault();
                    if (typeof e.stopPropagation === 'function') e.stopPropagation();
                    _openAicrImagePreview(src);
                } catch (_) { }
            };
            document.addEventListener('click', __aicrChatImagePreviewClickHandler, true);
        }
    } catch (_) { }
 
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
        const { streamPromptJSON } = await import('/src/core/services/modules/crud.js');
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
                ...(String(getStoredModel() || '').trim()
                    ? { model: String(getStoredModel() || '').trim() }
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
                if (model != null) {
                    sessionBotModel.value = String(model || '').trim();
                } else {
                    sessionBotModel.value = defaultSessionBotModel;
                }
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
 
    const selectSessionForChat = createSelectSessionForChat({
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
    });
 
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
        sessionChatScrollRequest,
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
        openAicrImagePreview: _openAicrImagePreview,
        postData,
        SERVICE_MODULE
    };
};
