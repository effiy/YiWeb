export const createSessionChatContextSettingsMethods = (ctx) => {
    const {
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
    } = ctx || {};

    const sessionSettingsMethods = {
        openSessionSettings: () => {
            if (store?.sessionFaqVisible) store.sessionFaqVisible.value = false;
            if (typeof _closeSessionContextEditorInternal === 'function') _closeSessionContextEditorInternal();
            if (sessionBotModelDraft) sessionBotModelDraft.value = String(sessionBotModel?.value || '').trim();
            if (sessionBotSystemPromptDraft) sessionBotSystemPromptDraft.value = String(sessionBotSystemPrompt?.value || defaultSessionBotSystemPrompt).trim();
            if (sessionSettingsVisible) sessionSettingsVisible.value = true;
        },
        openWeChatSettings: () => {
            if (store?.sessionFaqVisible) store.sessionFaqVisible.value = false;
            if (typeof _closeSessionContextEditorInternal === 'function') _closeSessionContextEditorInternal();
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
            if (typeof persistSessionBotSettings === 'function') persistSessionBotSettings();
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
            if (typeof persistWeChatSettings === 'function') persistWeChatSettings();
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

    return sessionSettingsMethods;
};
