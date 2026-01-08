/**
 * 业务流程管理模块
 * 基于《有效需求分析（第2版）》和SOP标准
 * 
 * 功能：
 * - 业务流程识别（任务6）
 * - 业务流程分析与优化（任务7）
 * - 业务场景识别（任务8）
 * - 业务场景分析（任务9）
 */

class BusinessProcessManager {
    constructor() {
        this.processes = []; // 业务流程列表
        this.scenarios = []; // 业务场景列表
    }

    /**
     * 任务6：业务流程识别
     * 识别外部引发的主、变、支流程
     * 识别内部引发的主、变、支流程
     * 识别管理流程
     * 判断业务流程优先级
     * 
     * @returns {Array} 业务流程列表
     */
    identifyBusinessProcesses() {
        return {
            // 外部引发的主流程
            externalMainProcesses: [
                {
                    id: 'ext_main_001',
                    name: '用户创建任务',
                    type: 'external_main',
                    trigger: '用户操作',
                    description: '用户通过界面创建新任务',
                    priority: 'high'
                }
            ],
            // 外部引发的变流程
            externalVariantProcesses: [
                {
                    id: 'ext_var_001',
                    name: '批量导入任务',
                    type: 'external_variant',
                    trigger: '用户批量操作',
                    description: '用户通过文件批量导入任务',
                    priority: 'medium'
                }
            ],
            // 外部引发的支流程
            externalBranchProcesses: [
                {
                    id: 'ext_branch_001',
                    name: '任务模板应用',
                    type: 'external_branch',
                    trigger: '用户选择模板',
                    description: '用户基于模板快速创建任务',
                    priority: 'low'
                }
            ],
            // 内部引发的主流程
            internalMainProcesses: [
                {
                    id: 'int_main_001',
                    name: '任务状态自动更新',
                    type: 'internal_main',
                    trigger: '定时任务',
                    description: '系统定时检查并更新任务状态',
                    priority: 'high'
                }
            ],
            // 内部引发的变流程
            internalVariantProcesses: [
                {
                    id: 'int_var_001',
                    name: '任务提醒通知',
                    type: 'internal_variant',
                    trigger: '任务到期',
                    description: '系统在任务到期前发送提醒',
                    priority: 'medium'
                }
            ],
            // 管理流程
            managementProcesses: [
                {
                    id: 'mgmt_001',
                    name: '任务审核流程',
                    type: 'management',
                    trigger: '任务提交审核',
                    description: '管理员审核任务内容',
                    priority: 'high'
                },
                {
                    id: 'mgmt_002',
                    name: '任务统计分析',
                    type: 'management',
                    trigger: '定时统计',
                    description: '系统定期生成任务统计报表',
                    priority: 'medium'
                }
            ]
        };
    }

    /**
     * 任务7：业务流程分析与优化
     * 业务流程八要素：
     * 1. 流程的起点和终点
     * 2. 流程的输入和输出
     * 3. 流程的活动（步骤）
     * 4. 活动的执行者（角色）
     * 5. 活动之间的依赖关系（顺序、并行、选择）
     * 6. 流程的管控点（审批、规则）
     * 7. 流程的异常处理
     * 8. 流程的监管需求
     * 
     * ESIA优化原则：
     * - 清除无效（Eliminate）
     * - 简化高频（Simplify）
     * - 整合依赖（Integrate）
     * - 自动化烦琐（Automate）
     */
    analyzeAndOptimizeProcess(processId) {
        const process = this.processes.find(p => p.id === processId);
        if (!process) {
            throw new Error(`流程 ${processId} 不存在`);
        }

        return {
            // 流程主体（五个基本要素）
            processBody: {
                startPoint: process.startPoint || '流程开始',
                endPoint: process.endPoint || '流程结束',
                inputs: process.inputs || [],
                outputs: process.outputs || [],
                activities: process.activities || [],
                roles: process.roles || [],
                dependencies: process.dependencies || []
            },
            // 管理要素（三个管理要素）
            managementElements: {
                controlPoints: process.controlPoints || [], // 管控点
                exceptionHandling: process.exceptionHandling || [], // 异常处理
                supervisionRequirements: process.supervisionRequirements || [] // 监管需求
            },
            // ESIA优化建议
            optimizationSuggestions: {
                eliminate: process.optimization?.eliminate || [], // 清除无效
                simplify: process.optimization?.simplify || [], // 简化高频
                integrate: process.optimization?.integrate || [], // 整合依赖
                automate: process.optimization?.automate || [] // 自动化烦琐
            }
        };
    }

    /**
     * 任务8：业务场景识别
     * 基于流程图识别系统角色
     * 基于流程图识别业务场景（活动、审批、判断点）
     * 补充业务场景（特定时间、特定状态触发）
     */
    identifyBusinessScenarios(processId) {
        const process = this.processes.find(p => p.id === processId);
        if (!process) {
            throw new Error(`流程 ${processId} 不存在`);
        }

        return {
            // 系统角色
            roles: process.roles || [],
            // 基于流程图的业务场景
            processBasedScenarios: [
                {
                    id: 'scenario_001',
                    name: '创建任务场景',
                    type: 'activity',
                    trigger: '用户点击创建按钮',
                    description: '用户在任务列表页面点击创建按钮，打开任务编辑器',
                    role: 'user',
                    activity: 'create_task'
                },
                {
                    id: 'scenario_002',
                    name: '任务审核场景',
                    type: 'approval',
                    trigger: '任务提交审核',
                    description: '管理员审核任务内容，决定是否通过',
                    role: 'admin',
                    activity: 'review_task'
                },
                {
                    id: 'scenario_003',
                    name: '任务状态判断场景',
                    type: 'decision',
                    trigger: '任务状态变更',
                    description: '系统根据任务完成情况判断是否自动更新状态',
                    role: 'system',
                    activity: 'update_task_status'
                }
            ],
            // 补充业务场景（特定时间、特定状态触发）
            timeBasedScenarios: [
                {
                    id: 'scenario_time_001',
                    name: '每日任务提醒',
                    type: 'time_triggered',
                    trigger: '每天09:00',
                    description: '系统每天09:00检查并发送今日到期任务提醒',
                    role: 'system',
                    activity: 'daily_reminder'
                }
            ],
            stateBasedScenarios: [
                {
                    id: 'scenario_state_001',
                    name: '任务逾期自动标记',
                    type: 'state_triggered',
                    trigger: '任务截止日期已过且状态未完成',
                    description: '系统自动将逾期任务标记为逾期状态',
                    role: 'system',
                    activity: 'mark_overdue'
                }
            ]
        };
    }

    /**
     * 任务9：业务场景分析
     * 概述业务场景
     * 细化业务场景的业务步骤（重在人机交互、用户意图）
     * 遍历步骤分析困难，导出功能
     * 识别环境与规则
     * 分析实现方式，完成初步交互设计
     */
    analyzeBusinessScenario(scenarioId) {
        const scenario = this.scenarios.find(s => s.id === scenarioId);
        if (!scenario) {
            throw new Error(`场景 ${scenarioId} 不存在`);
        }

        return {
            // 场景概述
            overview: {
                name: scenario.name,
                purpose: scenario.purpose || '场景目的',
                participants: scenario.participants || [],
                triggerCondition: scenario.triggerCondition || '触发条件'
            },
            // 业务步骤（重在人机交互、用户意图）
            businessSteps: scenario.businessSteps || [],
            // 困难分析（从困难中导出功能）
            difficulties: scenario.difficulties || [],
            // 导出功能
            derivedFunctions: scenario.derivedFunctions || [],
            // 环境与规则
            environmentAndRules: {
                businessRules: scenario.businessRules || [],
                constraints: scenario.constraints || []
            },
            // 实现方式与交互设计
            implementation: {
                approach: scenario.implementation?.approach || '',
                interactionDesign: scenario.implementation?.interactionDesign || {}
            }
        };
    }

    /**
     * 保存业务流程
     */
    saveProcess(process) {
        const existingIndex = this.processes.findIndex(p => p.id === process.id);
        if (existingIndex >= 0) {
            this.processes[existingIndex] = process;
        } else {
            this.processes.push(process);
        }
        return process;
    }

    /**
     * 保存业务场景
     */
    saveScenario(scenario) {
        const existingIndex = this.scenarios.findIndex(s => s.id === scenario.id);
        if (existingIndex >= 0) {
            this.scenarios[existingIndex] = scenario;
        } else {
            this.scenarios.push(scenario);
        }
        return scenario;
    }
}

// 创建单例
const businessProcessManager = new BusinessProcessManager();

// 导出
export { BusinessProcessManager, businessProcessManager };
export default businessProcessManager;

