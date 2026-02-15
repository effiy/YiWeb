import { createSessionChatContextShared } from './sessionChatContextShared.js';
import { createSessionChatContextChatMethods } from './sessionChatContextChatMethods.js';
import { createSessionChatContextContextMethods } from './sessionChatContextContextMethods.js';
import { createSessionChatContextSettingsMethods } from './sessionChatContextSettingsMethods.js';
import {
    insertTextAtTextarea,
    isAbortError,
    buildSessionChatHistoryText,
    buildSessionChatUserPrompt,
    sessionChatMessageKey,
    setFeedbackFlag
} from './sessionChatContextMethods.helpers.js';
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
