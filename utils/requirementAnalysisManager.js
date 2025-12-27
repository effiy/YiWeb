/**
 * 需求分析管理模块
 * 基于《有效需求分析（第2版）》和SOP标准
 * 
 * 功能：
 * - 日常需求分析（还原需求、补充需求、评估需求）
 * - 变更/优化型需求分析模板
 */

class RequirementAnalysisManager {
    constructor() {
        this.requirements = [];
    }

    /**
     * 步骤1：还原需求
     * 从"方案级需求"还原到"问题级需求"
     * 
     * 执行要点：
     * 1. 澄清问题（Who + Why）
     * 2. 了解背景（业务场景）
     * 3. 建议并确定解决方案（How）
     */
    restoreRequirement(originalRequirement) {
        return {
            // 原始需求（方案级需求）
            originalRequirement: {
                proposer: originalRequirement.proposer || '', // 需求提出者
                customerInfo: originalRequirement.customerInfo || '', // 客户信息
                originalDescription: originalRequirement.originalDescription || '', // 原始描述
                number: originalRequirement.number || '' // 编号
            },
            // 问题澄清（Who + Why）
            problemClarification: {
                who: {
                    proposer: originalRequirement.proposer || '', // 需求提出者
                    user: originalRequirement.user || '', // 需求使用者
                    potentialImpactors: originalRequirement.potentialImpactors || [] // 潜在影响者
                },
                why: {
                    problemLevelRequirement: originalRequirement.problemLevelRequirement || '', // 问题级需求描述
                    businessScenario: originalRequirement.businessScenario || '', // 业务场景
                    currentSituation: originalRequirement.currentSituation || '', // 当前如何应对该问题（现状）
                    frequency: originalRequirement.frequency || '', // 使用频率
                    impactScope: originalRequirement.impactScope || '' // 影响范围
                }
            },
            // 业务环境描述
            businessEnvironment: {
                whoWillBeUpset: originalRequirement.whoWillBeUpset || '', // 不做谁生气
                howOftenUpset: originalRequirement.howOftenUpset || '', // 多久生气一次
                otherNonFunctionalRequirements: originalRequirement.otherNonFunctionalRequirements || [] // 其他非功能需求
            },
            // 解决方案概述（How）
            solutionOverview: {
                optionalSolutions: originalRequirement.optionalSolutions || [], // 可选方案
                prosAndCons: originalRequirement.prosAndCons || {}, // 各方案优缺点
                recommendedSolution: originalRequirement.recommendedSolution || '', // 推荐方案
                reason: originalRequirement.reason || '' // 推荐理由
            }
        };
    }

    /**
     * 步骤2：补充需求
     * 提高需求的完整性
     * 
     * 三种方法：
     * 1. 同类问题横推法（提高广度）
     * 2. 关联行为纵推法（提高深度）
     * 3. 360度分析法（提高全面性）
     */
    supplementRequirement(requirement) {
        return {
            // 提高广度——同类问题横推法
            horizontalExpansion: {
                problemType: requirement.problemType || '', // 从需求的"Why"提炼"问题类型"
                similarProblems: requirement.similarProblems || [] // 同类别的其他问题
            },
            // 提高深度——关联行为纵推法
            verticalExpansion: {
                businessScenario: requirement.businessScenario || '', // 将"Who+Why"整合成业务场景
                precedingBehaviors: requirement.precedingBehaviors || [], // 前置关联行为
                followingBehaviors: requirement.followingBehaviors || [], // 后置关联行为
                exceptions: requirement.exceptions || [] // 本步骤可能发生的例外
            },
            // 提高全面性——360度分析法
            comprehensiveAnalysis: {
                potentialImpactors: requirement.potentialImpactors || [], // 潜在影响者（流程上游、下游、管理者、协作者）
                impactorConcerns: requirement.impactorConcerns || [], // 站在影响者视角识别关注问题
                derivedRequirements: requirement.derivedRequirements || [] // 问题衍生出的需求
            }
        };
    }

    /**
     * 步骤3：评估需求
     * 确定需求优先级
     * 
     * 四个评估维度：
     * 1. 业务维：与重要的业务关联的需求优先级更高
     * 2. 用户维：能使越多的用户满意或满意度提升越大的需求优先级越高
     * 3. 竞争维：对产品、系统的竞争力提升越大的需求优先级越高
     * 4. 运营维：与产品运营价值、企业业绩提升越相关的需求优先级越高
     */
    evaluateRequirement(requirement, productStage = 'development') {
        // 根据产品/系统阶段选择主评估维度
        let mainDimension = 'business'; // 默认业务维
        if (productStage === 'growth') {
            mainDimension = 'user'; // 1→10 发展期：用户维、竞争维
        } else if (productStage === 'mature') {
            mainDimension = 'operation'; // 10→100 成熟期：运营维
        }

        return {
            // 评估维度选择
            dimensionSelection: {
                mainDimension: mainDimension,
                productStage: productStage,
                dimensions: {
                    business: {
                        score: requirement.evaluation?.business?.score || 0,
                        factors: requirement.evaluation?.business?.factors || []
                    },
                    user: {
                        score: requirement.evaluation?.user?.score || 0,
                        factors: requirement.evaluation?.user?.factors || []
                    },
                    competition: {
                        score: requirement.evaluation?.competition?.score || 0,
                        factors: requirement.evaluation?.competition?.factors || []
                    },
                    operation: {
                        score: requirement.evaluation?.operation?.score || 0,
                        factors: requirement.evaluation?.operation?.factors || []
                    }
                }
            },
            // 评估策略
            evaluationStrategy: {
                factors: requirement.evaluationStrategy?.factors || [],
                consensus: requirement.evaluationStrategy?.consensus || false // 与业务部门达成共识
            },
            // 优先级等级
            priority: {
                level: requirement.priority?.level || 'can_do', // 必须做、应该做、可以做、可不做
                reason: requirement.priority?.reason || '',
                evaluationResult: requirement.priority?.evaluationResult || {}
            }
        };
    }

    /**
     * 创建变更/优化型需求分析模板
     * 参考SOP日常需求分析模板
     */
    createChangeOptimizationTemplate(requirement) {
        const restored = this.restoreRequirement(requirement);
        const supplemented = this.supplementRequirement(requirement);
        const evaluated = this.evaluateRequirement(requirement);

        return {
            // 1. 原始需求
            originalRequirement: restored.originalRequirement,
            // 2. 问题澄清
            problemClarification: {
                problemToSolve: restored.problemClarification.why.problemLevelRequirement,
                currentSituation: restored.problemClarification.why.currentSituation,
                conceptClarification: requirement.conceptClarification || '',
                similarProblemScenarios: supplemented.horizontalExpansion.similarProblems
            },
            // 3. 业务环境描述
            businessEnvironment: restored.businessEnvironment,
            // 4. 业务场景描述（选填）
            businessScenarioDescription: {
                scenarioName: restored.problemClarification.why.businessScenario,
                scenarioDescription: requirement.scenarioDescription || '',
                subTasks: requirement.subTasks || [],
                taskVariants: requirement.taskVariants || []
            },
            // 5. 业务术语说明（选填）
            businessTerminology: requirement.businessTerminology || [],
            // 6. 解决方案概述
            solutionOverview: restored.solutionOverview,
            // 7. 补充需求分析
            supplementAnalysis: supplemented,
            // 8. 需求评估
            evaluation: evaluated
        };
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

