/**
 * 需求分析管理模块
 */

class RequirementAnalysisManager {
    constructor() {
        this.requirements = [];
    }

    /**
     * 保存需求分析
     */
    saveRequirementAnalysis(analysis) {
        const existingIndex = this.requirements.findIndex(r => r.id === analysis.id);
        if (existingIndex >= 0) {
            this.requirements[existingIndex] = analysis;
        } else {
            this.requirements.push(analysis);
        }
        return analysis;
    }

    /**
     * 获取需求分析
     */
    getRequirementAnalysis(requirementId) {
        return this.requirements.find(r => r.id === requirementId);
    }
}

// 导出单例
window.RequirementAnalysisManager = RequirementAnalysisManager;
window.requirementAnalysisManager = new RequirementAnalysisManager();

export { RequirementAnalysisManager };
export default window.requirementAnalysisManager;

