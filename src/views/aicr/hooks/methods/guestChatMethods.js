import { logInfo, logWarn, logError } from '/cdn/utils/core/log.js';

export const createGuestChatMethods = ({ store }) => {
    const GUEST_SESSION_KEY = '__guest__';

    const ensureApiUrl = () => {
        const base = String(window.API_URL || '').trim().replace(/\/$/, '');
        if (!base) throw new Error('API地址未配置');
        return base;
    };

    const loadGuestSessionData = async () => {
        const { guestSessionsData, guestSessionsLoading } = store;
        if (guestSessionsData?.value) return guestSessionsData.value;

        if (guestSessionsLoading) guestSessionsLoading.value = true;
        try {
            const apiBase = ensureApiUrl();
            const { postData } = await import('/src/core/services/index.js');

            const result = await postData(
                `${apiBase}/`,
                {
                    module_name: 'services.database.data_service',
                    method_name: 'query_documents',
                    parameters: { cname: 'sessions' }
                },
                {},
                { showError: false, promptLogin: true }
            );

            const data = result?.data || result;
            if (guestSessionsData) guestSessionsData.value = data;
            logInfo('[GuestChat] 会话数据加载完成');
            return data;
        } catch (e) {
            logError('[GuestChat] 加载会话数据失败:', e);
            if (guestSessionsData) guestSessionsData.value = [];
            return [];
        } finally {
            if (guestSessionsLoading) guestSessionsLoading.value = false;
        }
    };

    const buildGuestSystemPrompt = (sessionsData) => {
        const base = '你是一个专业、简洁且可靠的 AI 助手。';

        if (!sessionsData) return base;

        try {
            let sessionsList = [];
            if (Array.isArray(sessionsData)) {
                sessionsList = sessionsData;
            } else if (Array.isArray(sessionsData?.documents)) {
                sessionsList = sessionsData.documents;
            } else if (Array.isArray(sessionsData?.data)) {
                sessionsList = sessionsData.data;
            } else if (Array.isArray(sessionsData?.items)) {
                sessionsList = sessionsData.items;
            }

            if (sessionsList.length === 0) return base;

            const summary = sessionsList.slice(0, 50).map((s, i) => {
                const title = s?.title || s?.name || '未命名';
                const tags = Array.isArray(s?.tags) ? s.tags.join('/') : '';
                const msgCount = Array.isArray(s?.messages) ? s.messages.length : 0;
                const updated = s?.updatedAt ? new Date(s.updatedAt).toLocaleString('zh-CN') : '';
                let line = `${i + 1}. ${title}`;
                if (tags) line += ` [${tags}]`;
                if (msgCount > 0) line += ` (${msgCount}条消息)`;
                if (updated) line += ` - ${updated}`;
                return line;
            }).join('\n');

            return `${base}\n\n当前项目包含以下 ${sessionsList.length} 个会话，你可以根据这些信息回答用户关于项目的问题：\n\n${summary}`;
        } catch (_) {
            return base;
        }
    };

    const ensureGuestSession = async () => {
        const { activeSession, guestSessionActive, guestSessionsData, sessionBotSystemPrompt } = store;

        if (activeSession?.value && activeSession.value.isGuest) return activeSession.value;
        if (activeSession?.value && !activeSession.value.isGuest) return null;

        if (!guestSessionActive) return null;

        const sessionsData = await loadGuestSessionData();

        if (activeSession?.value && activeSession.value.isGuest) return activeSession.value;
        if (activeSession?.value && !activeSession.value.isGuest) return null;

        const now = Date.now();
        const guestPrompt = buildGuestSystemPrompt(sessionsData);

        const guestSession = {
            key: GUEST_SESSION_KEY,
            title: '新聊天',
            messages: [],
            isGuest: true,
            createdAt: now,
            updatedAt: now,
            lastAccessTime: now
        };

        activeSession.value = guestSession;

        if (sessionBotSystemPrompt) {
            sessionBotSystemPrompt.value = guestPrompt;
        }

        logInfo('[GuestChat] 已创建临时会话');
        return guestSession;
    };

    const setGuestSessionActive = (active) => {
        const { guestSessionActive } = store;
        if (guestSessionActive) guestSessionActive.value = !!active;
    };

    const isGuestSession = () => {
        const s = store.activeSession?.value;
        return !!(s && s.isGuest);
    };

    const clearGuestSession = () => {
        const { activeSession, guestSessionActive, guestSessionsData, sessionBotSystemPrompt, sessionChatSending } = store;
        if (sessionChatSending?.value) return;
        if (guestSessionActive) guestSessionActive.value = false;
        if (activeSession?.value?.isGuest) {
            activeSession.value = null;
        }
        const savedPrompt = localStorage.getItem('aicr_session_bot_system_prompt');
        if (sessionBotSystemPrompt) {
            sessionBotSystemPrompt.value = (savedPrompt != null ? String(savedPrompt).trim() : '') || '你是一个专业、简洁且可靠的 AI 助手。';
        }
        logInfo('[GuestChat] 已清除临时会话');
    };

    return {
        loadGuestSessionData,
        ensureGuestSession,
        buildGuestSystemPrompt,
        setGuestSessionActive,
        isGuestSession,
        clearGuestSession
    };
};
