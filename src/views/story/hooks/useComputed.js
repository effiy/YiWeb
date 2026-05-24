/**
 * 故事任务面板 - 计算属性
 */
export function useComputed(store) {
    const { computed } = Vue;

    const statusCounts = computed(() => {
        const counts = {
            planning: 0,
            design: 0,
            develop: 0,
            testing: 0,
            operations: 0
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
            planning: [],
            design: [],
            develop: [],
            testing: [],
            operations: []
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
