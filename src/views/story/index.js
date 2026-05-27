/**
 * 故事任务面板 - 主入口
 *
 * 对标 aicr/index.js 数据流模式：
 *   createStore() → useComputed(store) → useMethods(store)
 *   → createBaseView({ data: state+computed, methods, ... })
 */
import { createStore } from '/src/views/story/hooks/state/storeFactory.js';
import { useComputed } from '/src/views/story/hooks/computed/useComputed.js';
import { useMethods } from '/src/views/story/hooks/useMethods.js';
import { createBaseView } from '/cdn/utils/view/baseView.js';
import { logInfo, logError } from '/cdn/utils/core/log.js';
import { setupBrowserExtensionErrorFilter } from '/cdn/utils/core/error.js';

(async function initStoryPanelApp() {
    // 启用调试日志，确保数据流日志在浏览器控制台可见
    localStorage.setItem('debug', 'true');
    try {
        const store = createStore();
        const computedRefs = useComputed(store);
        const methods = useMethods(store);

        const app = await createBaseView({
            createStore: () => store,
            useComputed: () => computedRefs,
            useMethods: () => methods,
            components: [
                'StoryPanelPage',
                'StoryListTable',
                'StoryDetailCard',
                'StoryCard',
                'StoryStatusBadge',
                'YiIcon',
                'YiButton',
                'YiTag',
                'YiLoading',
                'YiEmptyState',
                'YiErrorState',
                'HeaderActions',
            ],
            componentModules: [
                '/src/views/story/components/storyPanelPage/index.js',
                '/src/views/story/components/storyListTable/index.js',
                '/src/views/story/components/storyDetailCard/index.js',
                '/src/views/story/components/storyCard/index.js',
                '/src/views/story/components/storyStatusBadge/index.js',
                '/cdn/icons/YiIcon/index.js',
                '/cdn/components/common/buttons/YiButton/index.js',
                '/cdn/components/common/tags/YiTag/index.js',
                '/cdn/components/common/loaders/YiLoading/index.js',
                '/cdn/components/common/feedback/YiEmptyState/index.js',
                '/cdn/components/common/feedback/YiErrorState/index.js',
                '/cdn/components/business/HeaderActions/index.js',
            ],
            data: {
                // 核心数据
                loading: store.loading,
                error: store.error,
                stories: store.stories,
                fileTree: store.fileTree,
                selectedStory: store.selectedStory,

                // 筛选状态
                selectedSessionTags: store.selectedSessionTags,
                selectedTypeTags: store.selectedTypeTags,
                selectedMissingFilter: store.selectedMissingFilter,
                tagFilterNoTags: store.tagFilterNoTags,
                localSearchQuery: store.localSearchQuery,

                // UI 状态
                viewMode: store.viewMode,
                panelStory: store.panelStory,
                sortField: store.sortField,
                sortDirection: store.sortDirection,
                tagsScrollLeft: store.tagsScrollLeft,
                tagsScrollAtEnd: store.tagsScrollAtEnd,

                // 计算属性（通过 useComputed 生成）
                totalStories: computedRefs.totalStories,
                statusCounts: computedRefs.statusCounts,
                allProjectTags: computedRefs.allProjectTags,
                storiesByStatus: computedRefs.storiesByStatus,
                filteredStories: computedRefs.filteredStories,
                hasActiveFilters: computedRefs.hasActiveFilters,
                documentCounts: computedRefs.documentCounts,
                filteredStoriesByStatus: computedRefs.filteredStoriesByStatus,
                kanbanColumns: computedRefs.kanbanColumns,
                groupedStories: computedRefs.groupedStories,
                projectTagCounts: computedRefs.projectTagCounts,
                untaggedCount: computedRefs.untaggedCount,
                projectTags: computedRefs.projectTags,
                typeTags: computedRefs.typeTags,
                typeStats: computedRefs.typeStats,
                storyTags: computedRefs.storyTags,
                selectedTypeTagLabels: computedRefs.selectedTypeTagLabels,
                tagColorMap: computedRefs.tagColorMap,
                missingCounts: computedRefs.missingCounts,
                storyOptions: computedRefs.storyOptions,
                selectedProjectTags: computedRefs.selectedProjectTags,
                selectedStoryTags: computedRefs.selectedStoryTags,
                filterSummaryPills: computedRefs.filterSummaryPills,
                panelVisible: computedRefs.panelVisible,
                viewModes: computedRefs.viewModes,
            },
            onMounted: () => {
                logInfo('[故事面板] 应用已挂载');
                store.fetchStories();
            },
            methods: {
                // 数据方法
                viewStory: (name) => store.selectStory(name),
                goBack: () => store.clearSelection(),
                fetchStories: () => store.fetchStories(),

                // 筛选方法
                toggleSessionTag: (tag) => store.toggleSessionTag(tag),
                clearSessionTags: () => store.clearSessionTags(),
                toggleUntagged: () => store.toggleUntagged(),
                toggleTypeTag: (docType) => store.toggleTypeTag(docType),
                clearTypeTags: () => store.clearTypeTags(),
                toggleMissingFilter: (filter) => store.toggleMissingFilter(filter),
                setSearchQuery: (q) => store.setSearchQuery(q),
                clearSearchQuery: () => store.clearSearchQuery(),
                clearAllFilters: () => store.clearAllFilters(),

                // UI 方法
                setView: (mode) => store.setView(mode),
                toggleSort: (field) => store.toggleSort(field),
                openDetail: (story) => store.openDetail(story),
                closePanel: () => store.closePanel(),
                handleTagsScroll: (e) => store.handleTagsScroll(e),

                // 工具方法
                formatDate: methods.formatDate,
                statusLabel: methods.statusLabel,
                statusVariant: methods.statusVariant,
                tagColorStyle: methods.tagColorStyle,
                clearCache: methods.clearCache,
            }
        });

        window.storyApp = app;
        window.storyStore = store;

        setupBrowserExtensionErrorFilter('story', true);
    } catch (error) {
        logError('[故事面板] 应用初始化失败:', error);
    }
})();
