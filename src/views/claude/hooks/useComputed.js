/**
 * Claude 管理面板 - 计算属性
 */
export function useComputed(store) {
    const { computed } = Vue;

    const totalProjects = computed(() => store.projects.value.length);

    const totalSkills = computed(() =>
        store.projects.value.reduce((sum, p) => sum + p.skillCount, 0)
    );

    const totalAgents = computed(() =>
        store.projects.value.reduce((sum, p) => sum + p.agentCount, 0)
    );

    const healthSummary = computed(() => {
        let withClaudeMd = 0;
        let withSettings = 0;
        let withSkills = 0;
        let withAgents = 0;
        for (const p of store.projects.value) {
            if (p.hasClaudeMd) withClaudeMd++;
            if (p.hasSettings) withSettings++;
            if (p.skillCount > 0) withSkills++;
            if (p.agentCount > 0) withAgents++;
        }
        return { withClaudeMd, withSettings, withSkills, withAgents };
    });

    return {
        totalProjects,
        totalSkills,
        totalAgents,
        healthSummary,
    };
}
