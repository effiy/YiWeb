/**
 * 故事任务面板 - 计算属性
 */
export function useComputed(store) {
    const { computed } = Vue;

    const statusCounts = computed(() => {
        const counts = {
            code_done: 0,
            code_in_progress: 0,
            docs_done: 0,
            docs_in_progress: 0,
            not_started: 0,
            blocked: 0
        };
        for (const story of store.stories.value) {
            if (counts[story.status] !== undefined) {
                counts[story.status]++;
            }
        }
        return counts;
    });

    const totalStories = computed(() => store.stories.value.length);

    return {
        statusCounts,
        totalStories
    };
}
