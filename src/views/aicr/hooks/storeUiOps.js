export function createAicrStoreUiOps(state, deps) {
    const { loadFileTree, loadFiles } = deps;

    const toggleSidebar = () => {
        state.sidebarCollapsed.value = !state.sidebarCollapsed.value;
    };

    const toggleChatPanel = () => {
        state.chatPanelCollapsed.value = !state.chatPanelCollapsed.value;
        try {
            localStorage.setItem('aicrChatPanelCollapsed', state.chatPanelCollapsed.value ? '1' : '0');
        } catch (error) {
            console.warn('[toggleChatPanel] 保存聊天面板收起状态失败:', error);
        }
    };

    const refreshData = async () => {
        console.log('[refreshData] 正在刷新数据...');

        try {
            await loadFileTree();

            await loadFiles();

            state.selectedKey.value = null;

            console.log('[refreshData] 数据刷新完成');
        } catch (error) {
            console.error('[refreshData] 数据刷新失败:', error);
        }
    };

    const clearError = () => {
        state.error.value = null;
        state.errorMessage.value = '';
    };

    const loadSidebarWidths = () => {
        try {
            const savedSidebarWidth = localStorage.getItem('aicrSidebarWidth');

            if (savedSidebarWidth) {
                const width = Math.max(50, parseInt(savedSidebarWidth, 10));
                if (!isNaN(width)) {
                    state.sidebarWidth.value = width;
                }
            }
        } catch (error) {
            console.warn('[loadSidebarWidths] 加载侧边栏宽度失败:', error);
        }
    };

    const loadChatPanelSettings = () => {
        try {
            const savedWidth = localStorage.getItem('aicrChatPanelWidth');
            if (savedWidth) {
                const width = parseInt(savedWidth, 10);
                if (!isNaN(width)) {
                    state.chatPanelWidth.value = Math.max(240, Math.min(1200, width));
                }
            }
        } catch (error) {
            console.warn('[loadChatPanelSettings] 加载聊天面板宽度失败:', error);
        }

        try {
            const savedCollapsed = localStorage.getItem('aicrChatPanelCollapsed');
            if (savedCollapsed != null) {
                state.chatPanelCollapsed.value = savedCollapsed === '1' || savedCollapsed === 'true';
            }
        } catch (error) {
            console.warn('[loadChatPanelSettings] 加载聊天面板收起状态失败:', error);
        }
    };

    const saveSidebarWidth = (width) => {
        try {
            state.sidebarWidth.value = width;
            localStorage.setItem('aicrSidebarWidth', width.toString());
        } catch (error) {
            console.warn('[saveSidebarWidth] 保存侧边栏宽度失败:', error);
        }
    };

    const saveChatPanelWidth = (width) => {
        try {
            const w = Math.max(240, Math.min(1200, Number(width) || 0));
            if (!w) return;
            state.chatPanelWidth.value = w;
            localStorage.setItem('aicrChatPanelWidth', String(w));
        } catch (error) {
            console.warn('[saveChatPanelWidth] 保存聊天面板宽度失败:', error);
        }
    };

    return {
        toggleSidebar,
        toggleChatPanel,
        refreshData,
        clearError,
        loadSidebarWidths,
        loadChatPanelSettings,
        saveSidebarWidth,
        saveChatPanelWidth
    };
}
