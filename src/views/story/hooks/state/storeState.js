/**
 * 故事任务面板 - 响应式状态定义
 *
 * 所有 vueRef 集中声明，由 storeFactory 组合。
 * 对标 aicr/hooks/state/storeState.js 结构。
 */

export function createStoryStoreState(vueRef) {
    // 核心数据
    const stories = vueRef([]);
    const fileTree = vueRef([]);
    const loading = vueRef(false);
    const error = vueRef(null);
    const selectedStory = vueRef(null);
    const allProjectTags = vueRef([]);

    // 筛选状态
    const selectedSessionTags = vueRef([]);
    const selectedMissingTags = vueRef([]);
    const tagFilterNoTags = vueRef(false);
    const localSearchQuery = vueRef('');

    // 依赖数据
    const storyDeps = vueRef([]);
    const depsLoading = vueRef(false);

    // UI 状态
    const viewMode = vueRef('cards');
    const panelStory = vueRef(null);
    const sortField = vueRef('lastModified');
    const sortDirection = vueRef('desc');
    const tagsScrollLeft = vueRef(0);
    const tagsScrollAtEnd = vueRef(true);

    return {
        state: {
            stories,
            fileTree,
            loading,
            error,
            selectedStory,
            allProjectTags,
            selectedSessionTags,
            selectedMissingTags,
            tagFilterNoTags,
            localSearchQuery,
            storyDeps,
            depsLoading,
            viewMode,
            panelStory,
            sortField,
            sortDirection,
            tagsScrollLeft,
            tagsScrollAtEnd,
        },
        internals: {},
    };
}
