/**
 * 下载数据示例 - 与mockData.js保持一致
 * 这个文件展示了通过handleDownloadTasks函数导出的数据结构
 */

// 下载数据示例结构
const downloadDataExample = {
    // 导出时间
    exportTime: "2024-01-27T10:30:00.000Z",
    
    // 总任务数
    totalTasks: 15,
    
    // 枚举定义 - 与mockData.js完全一致
    enums: {
        TASK_PRIORITY: {
            CRITICAL: { value: 'critical', label: '紧急', color: '#ff4757', weight: 4 },
            HIGH: { value: 'high', label: '高优先级', color: '#ff6b35', weight: 3 },
            MEDIUM: { value: 'medium', label: '中等优先级', color: '#ffa726', weight: 2 },
            LOW: { value: 'low', label: '低优先级', color: '#66bb6a', weight: 1 },
            NONE: { value: 'none', label: '无优先级', color: '#9e9e9e', weight: 0 }
        },
        TASK_STATUS: {
            BACKLOG: { value: 'backlog', label: '待办', color: '#9e9e9e', category: 'todo' },
            TODO: { value: 'todo', label: '计划中', color: '#2196f3', category: 'todo' },
            IN_PROGRESS: { value: 'in_progress', label: '进行中', color: '#ff9800', category: 'active' },
            IN_REVIEW: { value: 'in_review', label: '待审核', color: '#9c27b0', category: 'active' },
            TESTING: { value: 'testing', label: '测试中', color: '#673ab7', category: 'active' },
            COMPLETED: { value: 'completed', label: '已完成', color: '#4caf50', category: 'done' },
            CANCELLED: { value: 'cancelled', label: '已取消', color: '#f44336', category: 'done' },
            ON_HOLD: { value: 'on_hold', label: '暂停', color: '#795548', category: 'blocked' }
        },
        TASK_TYPE: {
            FEATURE: { value: 'feature', label: '功能开发', icon: 'fas fa-plus-circle', color: '#2196f3' },
            BUG: { value: 'bug', label: '缺陷修复', icon: 'fas fa-bug', color: '#f44336' },
            IMPROVEMENT: { value: 'improvement', label: '优化改进', icon: 'fas fa-arrow-up', color: '#ff9800' },
            DOCUMENTATION: { value: 'documentation', label: '文档编写', icon: 'fas fa-file-alt', color: '#9c27b0' },
            RESEARCH: { value: 'research', label: '研究调研', icon: 'fas fa-search', color: '#00bcd4' },
            MAINTENANCE: { value: 'maintenance', label: '维护', icon: 'fas fa-tools', color: '#795548' },
            MEETING: { value: 'meeting', label: '会议', icon: 'fas fa-users', color: '#607d8b' },
            REVIEW: { value: 'review', label: '评审', icon: 'fas fa-eye', color: '#9c27b0' }
        },
        TASK_COMPLEXITY: {
            XS: { value: 'xs', label: 'XS (0.5天)', points: 1, hours: 4 },
            S: { value: 's', label: 'S (1天)', points: 2, hours: 8 },
            M: { value: 'm', label: 'M (2-3天)', points: 3, hours: 20 },
            L: { value: 'l', label: 'L (1周)', points: 5, hours: 40 },
            XL: { value: 'xl', label: 'XL (2周)', points: 8, hours: 80 },
            XXL: { value: 'xxl', label: 'XXL (1月)', points: 13, hours: 160 }
        }
    },
    
    // 标签数据 - 与mockData.js完全一致
    labels: [
        { id: 'label-001', name: '认证', color: '#2196f3' },
        { id: 'label-002', name: '安全', color: '#f44336' },
        { id: 'label-003', name: '重构', color: '#ff9800' },
        { id: 'label-004', name: '监控', color: '#9c27b0' },
        { id: 'label-005', name: '仪表板', color: '#00bcd4' },
        { id: 'label-006', name: '性能', color: '#4caf50' },
        { id: 'label-007', name: '移动端', color: '#e91e63' },
        { id: 'label-008', name: '响应式', color: '#673ab7' },
        { id: 'label-009', name: '用户体验', color: '#ff5722' },
        { id: 'label-010', name: '数据库', color: '#607d8b' },
        { id: 'label-011', name: '优化', color: '#ff9800' },
        { id: 'label-012', name: '漏洞', color: '#e91e63' },
        { id: 'label-013', name: 'API', color: '#3f51b5' },
        { id: 'label-014', name: '架构', color: '#795548' },
        { id: 'label-015', name: '微服务', color: '#607d8b' },
        { id: 'label-016', name: '设计', color: '#9c27b0' },
        { id: 'label-017', name: '组件库', color: '#2196f3' },
        { id: 'label-018', name: '前端', color: '#00bcd4' },
        { id: 'label-019', name: '设计系统', color: '#9c27b0' },
        { id: 'label-020', name: '测试', color: '#4caf50' },
        { id: 'label-021', name: '自动化', color: '#ff9800' },
        { id: 'label-022', name: '质量保证', color: '#2196f3' },
        { id: 'label-023', name: '用户反馈', color: '#e91e63' },
        { id: 'label-024', name: '产品功能', color: '#ff5722' },
        { id: 'label-025', name: '容器化', color: '#00bcd4' },
        { id: 'label-026', name: 'DevOps', color: '#607d8b' },
        { id: 'label-027', name: '部署', color: '#795548' },
        { id: 'label-028', name: '会议', color: '#607d8b' },
        { id: 'label-029', name: '评审', color: '#9c27b0' },
        { id: 'label-030', name: '技术决策', color: '#2196f3' },
        { id: 'label-031', name: '文档', color: '#9c27b0' },
        { id: 'label-032', name: '维护', color: '#795548' },
        { id: 'label-033', name: '告警', color: '#f44336' },
        { id: 'label-034', name: '运维', color: '#607d8b' },
        { id: 'label-035', name: '代码质量', color: '#4caf50' },
        { id: 'label-036', name: 'CI/CD', color: '#ff9800' },
        { id: 'label-037', name: '工具集成', color: '#2196f3' },
        { id: 'label-038', name: '数据分析', color: '#00bcd4' },
        { id: 'label-039', name: '用户行为', color: '#e91e63' },
        { id: 'label-040', name: '产品决策', color: '#ff5722' },
        { id: 'label-041', name: '云原生', color: '#00bcd4' },
        { id: 'label-042', name: '机器学习', color: '#9c27b0' },
        { id: 'label-043', name: '区块链', color: '#ff9800' },
        { id: 'label-044', name: '物联网', color: '#4caf50' },
        { id: 'label-045', name: '人工智能', color: '#e91e63' },
        { id: 'label-046', name: '大数据', color: '#3f51b5' },
        { id: 'label-047', name: '云计算', color: '#00bcd4' },
        { id: 'label-048', name: '移动开发', color: '#ff5722' },
        { id: 'label-049', name: 'Web开发', color: '#2196f3' },
        { id: 'label-050', name: '后端开发', color: '#795548' }
    ],
    
    // 工作流状态配置
    workflowConfig: {
        'feature': [
            'backlog',
            'todo',
            'in_progress',
            'in_review',
            'testing',
            'completed'
        ],
        'bug': [
            'todo',
            'in_progress',
            'in_review',
            'testing',
            'completed',
            'cancelled'
        ],
        'improvement': [
            'backlog',
            'todo',
            'in_progress',
            'completed'
        ]
    },
    
    // 任务数据 - 与mockData.js格式完全一致
    tasks: [
        {
            // 基本信息
            id: 'TASK-001',
            title: '用户认证系统重构',
            description: '重构现有的用户认证系统，增加多因子认证、SSO支持和安全审计功能。',
            type: 'feature',
            status: 'in_progress',
            priority: 'high',
            complexity: 'l',
            
            // 时间信息 - ISO格式
            createdAt: '2024-01-15T08:00:00Z',
            updatedAt: '2024-01-20T14:30:00Z',
            dueDate: '2024-02-15T18:00:00Z',
            startDate: '2024-01-18T09:00:00Z',
            
            // 工作量信息
            estimatedHours: 40,
            actualHours: 24,
            progress: 60,
            
            // 子任务统计
            completedSubtasks: 3,
            totalSubtasks: 5,
            
            // 特征信息
            featureName: '缺陷检测',
            cardTitle: 'AI代码审查系统',
            
            // 输入输出
            input: '现有的用户认证系统代码、安全要求文档、多因子认证需求',
            output: '重构后的用户认证系统，支持多因子认证、SSO和安全审计',
            
            // 步骤信息
            steps: {
                step1: { text: '分析现有认证系统架构', completed: true },
                step2: { text: '设计多因子认证流程', completed: true },
                step3: { text: '实现SSO集成', completed: false },
                step4: { text: '开发安全审计日志', completed: false },
                step5: { text: '前端界面实现和测试', completed: false }
            },
            
            // 标签 - 与mockData.js格式一致
            labels: [
                { id: 'label-001', name: '认证', color: '#2196f3' },
                { id: 'label-002', name: '安全', color: '#f44336' },
                { id: 'label-003', name: '重构', color: '#ff9800' }
            ],
            
            // Epic信息
            epic: {
                id: 'epic-001',
                name: '安全体系升级',
                code: 'SEC'
            },
            
            // 依赖关系
            dependencies: {
                blockedBy: ['TASK-005'],
                blocking: ['TASK-003', 'TASK-004'],
                relatedTo: ['TASK-007']
            },
            
            // 子任务 - 与mockData.js格式一致
            subtasks: [
                {
                    id: 'SUB-001',
                    title: '设计多因子认证流程',
                    status: 'completed',
                    estimatedHours: 8,
                    actualHours: 6
                },
                {
                    id: 'SUB-002',
                    title: '实现SSO集成',
                    status: 'in_progress',
                    estimatedHours: 16,
                    actualHours: 12
                },
                {
                    id: 'SUB-003',
                    title: '安全审计日志',
                    status: 'completed',
                    estimatedHours: 8,
                    actualHours: 6
                },
                {
                    id: 'SUB-004',
                    title: '前端界面实现',
                    status: 'todo',
                    estimatedHours: 12,
                    actualHours: 0
                },
                {
                    id: 'SUB-005',
                    title: '安全测试和文档',
                    status: 'todo',
                    estimatedHours: 8,
                    actualHours: 0
                }
            ],
            
            // 自定义字段
            customFields: {
                testingRequired: true,
                securityReviewRequired: true,
                documentationRequired: true,
                customerImpact: 'high',
                technicalRisk: 'medium'
            },
            
            // 时间记录 - 与mockData.js格式一致
            timeEntries: [
                {
                    id: 'time-001',
                    description: '设计认证流程',
                    startTime: '2024-01-18T09:00:00Z',
                    endTime: '2024-01-18T12:00:00Z',
                    duration: 180
                },
                {
                    id: 'time-002',
                    description: 'SSO后端开发',
                    startTime: '2024-01-19T14:00:00Z',
                    endTime: '2024-01-19T18:00:00Z',
                    duration: 240
                }
            ],
            
            // 保留原有扩展字段
            weeklyReport: {
                enabled: false,
                frequency: 'weekly',
                dayOfWeek: 1,
                reportTemplate: '',
                lastSubmitted: null,
                nextDue: null,
                history: []
            },
            dailyReport: {
                enabled: false,
                frequency: 'daily',
                timeOfDay: '18:00',
                reportTemplate: '',
                lastSubmitted: null,
                nextDue: null,
                history: [],
                weekends: false
            },
            features: {
                difficulty: 'medium',
                businessValue: 'high',
                urgency: 'high'
            },
            progress: {
                percentage: 60,
                milestones: ['架构设计完成', '多因子认证设计完成'],
                blockers: [],
                notes: ['需要安全团队评审', 'SSO集成遇到技术挑战']
            },
            timeTracking: {
                startDate: '2024-01-18T09:00:00Z',
                endDate: null,
                deadline: '2024-02-15T18:00:00Z',
                estimatedDuration: 40,
                actualDuration: 24,
                timeEntries: []
            }
        }
    ]
};

// 导出示例数据
window.DownloadDataExample = downloadDataExample;

// 验证数据结构一致性
function validateDataStructure() {
    const mockData = window.TaskProMockData;
    if (!mockData) {
        console.warn('mockData未加载，无法验证数据结构一致性');
        return false;
    }
    
    // 验证枚举结构
    const enumKeys = ['TASK_PRIORITY', 'TASK_STATUS', 'TASK_TYPE', 'TASK_COMPLEXITY'];
    const enumConsistent = enumKeys.every(key => {
        const mockEnum = mockData[key];
        const downloadEnum = downloadDataExample.enums[key];
        return JSON.stringify(mockEnum) === JSON.stringify(downloadEnum);
    });
    
    // 验证标签结构
    const labelsConsistent = JSON.stringify(mockData.mockLabels) === JSON.stringify(downloadDataExample.labels);
    
    // 验证工作流配置
    const workflowConsistent = JSON.stringify(mockData.workflowConfig) === JSON.stringify(downloadDataExample.workflowConfig);
    
    console.log('数据结构一致性验证结果:', {
        enums: enumConsistent,
        labels: labelsConsistent,
        workflow: workflowConsistent,
        overall: enumConsistent && labelsConsistent && workflowConsistent
    });
    
    return enumConsistent && labelsConsistent && workflowConsistent;
}

// 页面加载完成后验证数据结构
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', validateDataStructure);
} else {
    validateDataStructure();
}

