/**
 * 业务场景分析器
 * 基于《有效需求分析（第2版）》业务场景分析模板
 * 
 * 业务场景分析表模板结构：
 * 1. 场景概述
 * 2. 业务步骤（重在人机交互、用户意图）
 * 3. 困难分析（遍历步骤分析困难）
 * 4. 导出功能（从困难中导出功能）
 * 5. 环境与规则
 * 6. 实现方式与交互设计
 */

class BusinessScenarioAnalyzer {
    constructor() {
        this.scenarios = [];
    }

    /**
     * 创建业务场景分析表
     * 参考SOP任务9：业务场景分析
     */
    createScenarioAnalysis(scenarioData) {
        return {
            // 1. 场景概述
            overview: {
                scenarioName: scenarioData.scenarioName || '',
                purpose: scenarioData.purpose || '', // 场景目的
                participants: scenarioData.participants || [], // 参与者
                triggerCondition: scenarioData.triggerCondition || '', // 触发条件
                currentSituation: scenarioData.currentSituation || '', // 当前如何应对该问题（现状）
                frequency: scenarioData.frequency || '', // 使用频率
                impactScope: scenarioData.impactScope || '' // 影响范围
            },
            // 2. 业务步骤（重在人机交互、用户意图）
            businessSteps: scenarioData.businessSteps || [],
            // 3. 困难分析（遍历步骤分析困难）
            difficulties: scenarioData.difficulties || [],
            // 4. 导出功能（从困难中导出功能）
            derivedFunctions: scenarioData.derivedFunctions || [],
            // 5. 环境与规则
            environmentAndRules: {
                businessRules: scenarioData.businessRules || [],
                constraints: scenarioData.constraints || [],
                dataRequirements: scenarioData.dataRequirements || []
            },
            // 6. 实现方式与交互设计
            implementation: {
                approach: scenarioData.implementation?.approach || '',
                interactionDesign: scenarioData.implementation?.interactionDesign || {},
                uiComponents: scenarioData.implementation?.uiComponents || []
            }
        };
    }

    /**
     * 分析业务步骤
     * 重在人机交互而非人机界面
     * 重在用户意图而非用户动作
     */
    analyzeBusinessSteps(scenario) {
        return scenario.businessSteps.map((step, index) => {
            return {
                stepNumber: index + 1,
                stepName: step.name || `步骤${index + 1}`,
                userIntent: step.userIntent || '', // 用户意图
                humanComputerInteraction: step.humanComputerInteraction || '', // 人机交互
                systemResponse: step.systemResponse || '', // 系统响应
                expectedResult: step.expectedResult || '' // 预期结果
            };
        });
    }

    /**
     * 遍历步骤分析困难，导出功能
     * 针对每个步骤，分析用户可能遇到的困难
     * 从困难中导出系统需要提供的功能
     */
    analyzeDifficultiesAndDeriveFunctions(scenario) {
        const analysis = [];
        
        scenario.businessSteps.forEach((step, index) => {
            const stepDifficulties = step.difficulties || [];
            const derivedFunctions = stepDifficulties.map(difficulty => {
                return {
                    difficulty: difficulty.description || '',
                    derivedFunction: difficulty.derivedFunction || '',
                    priority: difficulty.priority || 'medium'
                };
            });
            
            analysis.push({
                stepNumber: index + 1,
                stepName: step.name || `步骤${index + 1}`,
                difficulties: stepDifficulties,
                derivedFunctions: derivedFunctions
            });
        });
        
        return analysis;
    }

    /**
     * 识别环境与规则
     */
    identifyEnvironmentAndRules(scenario) {
        return {
            businessRules: scenario.businessRules || [],
            constraints: scenario.constraints || [],
            dataRequirements: scenario.dataRequirements || [],
            integrationRequirements: scenario.integrationRequirements || []
        };
    }

    /**
     * 分析实现方式，完成初步交互设计
     */
    designImplementation(scenario) {
        return {
            approach: scenario.implementation?.approach || '',
            interactionDesign: {
                userFlow: scenario.implementation?.interactionDesign?.userFlow || [],
                uiComponents: scenario.implementation?.interactionDesign?.uiComponents || [],
                dataFlow: scenario.implementation?.interactionDesign?.dataFlow || []
            },
            technicalApproach: scenario.implementation?.technicalApproach || ''
        };
    }

    /**
     * 保存场景分析
     */
    saveScenarioAnalysis(analysis) {
        const existingIndex = this.scenarios.findIndex(s => s.id === analysis.id);
        if (existingIndex >= 0) {
            this.scenarios[existingIndex] = analysis;
        } else {
            this.scenarios.push(analysis);
        }
        return analysis;
    }

    /**
     * 获取场景分析
     */
    getScenarioAnalysis(scenarioId) {
        return this.scenarios.find(s => s.id === scenarioId);
    }
}

// 创建单例
const businessScenarioAnalyzer = new BusinessScenarioAnalyzer();

// 导出
export { BusinessScenarioAnalyzer, businessScenarioAnalyzer };
export default businessScenarioAnalyzer;

