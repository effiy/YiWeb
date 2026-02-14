import { getSessionSyncService } from '/src/services/aicr/sessionSyncService.js';

export function createAicrStoreState(vueRef) {
    const fileTree = vueRef([]);
    const fileTreeDocKey = vueRef('');
    const files = vueRef([]);
    const pendingFileRequests = new Map();
    const selectedKey = vueRef(null);
    const loading = vueRef(false);
    const error = vueRef(null);
    const errorMessage = vueRef('');
    const expandedFolders = vueRef(new Set());
    const sidebarCollapsed = vueRef(false);
    const sidebarWidth = vueRef(320);
    const chatPanelCollapsed = vueRef(false);
    const chatPanelWidth = vueRef(420);

    const searchQuery = vueRef('');

    const batchMode = vueRef(false);
    const selectedKeys = vueRef(new Set());

    const sessionBatchMode = vueRef(false);
    const selectedSessionKeys = vueRef(new Set());
    const externalSelectedSessionKey = vueRef(null);

    const viewMode = vueRef('tree');

    const sessions = vueRef([]);
    const sessionLoading = vueRef(false);
    const sessionError = vueRef(null);
    const sessionListVisible = vueRef(false);
    const selectedSessionTags = vueRef([]);
    const sessionSearchQuery = vueRef('');
    const sessionSidebarWidth = vueRef(320);

    const activeSession = vueRef(null);
    const activeSessionLoading = vueRef(false);
    const activeSessionError = vueRef(null);
    const sessionChatInput = vueRef('');
    const sessionChatDraftImages = vueRef([]);
    const sessionChatLastDraftText = vueRef('');
    const sessionChatLastDraftImages = vueRef([]);
    const sessionChatSending = vueRef(false);
    const sessionChatAbortController = vueRef(null);
    const sessionChatStreamingTargetTimestamp = vueRef(null);
    const sessionChatStreamingType = vueRef('');
    const sessionChatCopyFeedback = vueRef({});
    const sessionChatRegenerateFeedback = vueRef({});
    const sessionContextEnabled = vueRef(true);
    const sessionContextEditorVisible = vueRef(false);
    const sessionContextDraft = vueRef('');
    const sessionContextMode = vueRef('edit');
    const sessionContextUserEdited = vueRef(false);
    const sessionContextRefreshConfirmUntil = vueRef(0);
    const sessionContextRefreshStatus = vueRef('');
    const sessionContextOptimizing = vueRef(false);
    const sessionContextOptimizeStatus = vueRef('');
    const sessionContextTranslating = vueRef('');
    const sessionContextSaving = vueRef(false);
    const sessionContextSaveStatus = vueRef('');
    const sessionContextUndoVisible = vueRef(false);
    const sessionContextOptimizeBackup = vueRef('');
    const sessionMessageEditorVisible = vueRef(false);
    const sessionMessageEditorDraft = vueRef('');
    const sessionMessageEditorMode = vueRef('edit');
    const sessionMessageEditorIndex = vueRef(-1);
    const sessionFaqVisible = vueRef(false);
    const sessionFaqSearchKeyword = vueRef('');
    const sessionFaqItems = vueRef([]);
    const sessionFaqLoading = vueRef(false);
    const sessionFaqError = vueRef(null);
    const sessionFaqDeletingMap = vueRef({});
    const sessionFaqSelectedTags = vueRef([]);
    const sessionFaqTagFilterReverse = vueRef(false);
    const sessionFaqTagFilterNoTags = vueRef(false);
    const sessionFaqTagFilterExpanded = vueRef(false);
    const sessionFaqTagFilterVisibleCount = vueRef(12);
    const sessionFaqTagFilterSearchKeyword = vueRef('');
    const sessionFaqTagManagerVisible = vueRef(false);
    const sessionSettingsVisible = vueRef(false);
    const sessionBotModel = vueRef('');
    const sessionBotSystemPrompt = vueRef('你是一个专业、简洁且可靠的 AI 助手。');
    const sessionBotModelDraft = vueRef('');
    const sessionBotSystemPromptDraft = vueRef('');
    const weChatSettingsVisible = vueRef(false);
    const weChatRobotEnabled = vueRef(false);
    const weChatRobotWebhook = vueRef('');
    const weChatRobotAutoForward = vueRef(false);
    const weChatRobotEnabledDraft = vueRef(false);
    const weChatRobotWebhookDraft = vueRef('');
    const weChatRobotAutoForwardDraft = vueRef(false);
    const weChatRobots = vueRef([]);
    const weChatRobotsDraft = vueRef([]);
    const sessionEditVisible = vueRef(false);
    const sessionEditKey = vueRef(null);
    const sessionEditTitle = vueRef('');
    const sessionEditUrl = vueRef('');
    const sessionEditDescription = vueRef('');
    const sessionEditGenerating = vueRef(false);
    const sessionEditData = vueRef(null);

    const tagFilterReverse = vueRef(false);
    const tagFilterNoTags = vueRef(false);
    const tagFilterExpanded = vueRef(false);
    const tagFilterVisibleCount = vueRef(8);
    const tagFilterSearchKeyword = vueRef('');
    const tagOrder = vueRef(null);

    if (!sessions.value || !Array.isArray(sessions.value)) {
        sessions.value = [];
    }

    const sessionSync = getSessionSyncService();

    return {
        state: {
            fileTree,
            fileTreeDocKey,
            files,
            selectedKey,
            loading,
            error,
            errorMessage,
            expandedFolders,
            sidebarCollapsed,
            sidebarWidth,
            chatPanelCollapsed,
            chatPanelWidth,
            searchQuery,
            batchMode,
            selectedKeys,
            sessionBatchMode,
            selectedSessionKeys,
            externalSelectedSessionKey,
            viewMode,
            sessions,
            sessionLoading,
            sessionError,
            sessionListVisible,
            selectedSessionTags,
            sessionSearchQuery,
            sessionSidebarWidth,
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
            sessionContextEditorVisible,
            sessionContextDraft,
            sessionContextMode,
            sessionContextUserEdited,
            sessionContextRefreshConfirmUntil,
            sessionContextRefreshStatus,
            sessionContextOptimizing,
            sessionContextOptimizeStatus,
            sessionContextTranslating,
            sessionContextSaving,
            sessionContextSaveStatus,
            sessionContextUndoVisible,
            sessionContextOptimizeBackup,
            sessionMessageEditorVisible,
            sessionMessageEditorDraft,
            sessionMessageEditorMode,
            sessionMessageEditorIndex,
            sessionFaqVisible,
            sessionFaqSearchKeyword,
            sessionFaqItems,
            sessionFaqLoading,
            sessionFaqError,
            sessionFaqDeletingMap,
            sessionFaqSelectedTags,
            sessionFaqTagFilterReverse,
            sessionFaqTagFilterNoTags,
            sessionFaqTagFilterExpanded,
            sessionFaqTagFilterVisibleCount,
            sessionFaqTagFilterSearchKeyword,
            sessionFaqTagManagerVisible,
            sessionSettingsVisible,
            sessionBotModel,
            sessionBotSystemPrompt,
            sessionBotModelDraft,
            sessionBotSystemPromptDraft,
            weChatSettingsVisible,
            weChatRobotEnabled,
            weChatRobotWebhook,
            weChatRobotAutoForward,
            weChatRobotEnabledDraft,
            weChatRobotWebhookDraft,
            weChatRobotAutoForwardDraft,
            weChatRobots,
            weChatRobotsDraft,
            sessionEditVisible,
            sessionEditKey,
            sessionEditTitle,
            sessionEditUrl,
            sessionEditDescription,
            sessionEditGenerating,
            sessionEditData,
            tagFilterReverse,
            tagFilterNoTags,
            tagFilterExpanded,
            tagFilterVisibleCount,
            tagFilterSearchKeyword,
            tagOrder
        },
        internals: {
            pendingFileRequests,
            sessionSync
        }
    };
}
