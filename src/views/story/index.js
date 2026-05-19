/**
 * 故事任务面板 - 主入口
 */
import { createStore } from '/src/views/story/hooks/store.js';
import { useComputed } from '/src/views/story/hooks/useComputed.js';
import { useMethods } from '/src/views/story/hooks/useMethods.js';
import { createBaseView } from '/cdn/utils/view/baseView.js';
import { logInfo, logError } from '/cdn/utils/core/log.js';
import { setupBrowserExtensionErrorFilter } from '/cdn/utils/core/error.js';

(async function initStoryPanelApp() {
    try {
        const store = createStore();

        const app = await createBaseView({
            createStore: () => store,
            useComputed,
            useMethods,
            components: [
                'StoryPanelPage',
                'StoryListTable',
                'StoryDetailCard',
                'StoryStatusBadge',
                'YiButton',
                'YiTag',
                'YiLoading',
                'YiEmptyState',
                'YiErrorState',
            ],
            componentModules: [
                '/src/views/story/components/storyPanelPage/index.js',
                '/src/views/story/components/storyListTable/index.js',
                '/src/views/story/components/storyDetailCard/index.js',
                '/src/views/story/components/storyStatusBadge/index.js',
                '/cdn/components/common/buttons/YiButton/index.js',
                '/cdn/components/common/tags/YiTag/index.js',
                '/cdn/components/common/loaders/YiLoading/index.js',
                '/cdn/components/common/feedback/YiEmptyState/index.js',
                '/cdn/components/common/feedback/YiErrorState/index.js',
            ],
            data: {
                loading: store.loading,
                error: store.error,
                selectedStory: store.selectedStory,
                syncing: store.syncing,
            },
            onMounted: () => {
                logInfo('[故事面板] 应用已挂载');
                store.fetchStories();
            },
            methods: {
                refreshStories: () => store.fetchStories(),
                viewStory: (name) => store.selectStory(name),
                goBack: () => store.clearSelection(),
                syncStory: (name) => store.syncStory(name),
            }
        });

        window.storyApp = app;
        window.storyStore = store;

        setupBrowserExtensionErrorFilter('story', true);
    } catch (error) {
        logError('[故事面板] 应用初始化失败:', error);
    }
})();
