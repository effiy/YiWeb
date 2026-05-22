/**
 * 故事任务面板 - 计算属性
 */
export function useComputed(store) {
    const { computed } = Vue;

    const statusCounts = computed(() => {
        const counts = {
            not_started: 0,
            docs_in_progress: 0,
            docs_done: 0,
            code_in_progress: 0,
            code_done: 0,
            self_improve: 0
        };
        for (const story of store.stories.value) {
            if (counts[story.status] !== undefined) {
                counts[story.status]++;
            }
        }
        return counts;
    });

    const totalStories = computed(() => store.stories.value.length);

    const allProjectTags = computed(() => store.allProjectTags.value);

    const storiesByStatus = computed(() => {
        const groups = {
            not_started: [],
            docs_in_progress: [],
            docs_done: [],
            code_in_progress: [],
            code_done: [],
            self_improve: []
        };
        for (const story of store.stories.value) {
            if (groups[story.status]) {
                groups[story.status].push(story);
            }
        }
        return groups;
    });

    return {
        statusCounts,
        totalStories,
        allProjectTags,
        storiesByStatus
    };
}
