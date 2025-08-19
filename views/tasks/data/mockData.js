// 世界级专业任务管理系统 - Mock数据结构
// 符合国际项目管理标准（PMI, PRINCE2, Agile）

/**
 * 任务优先级枚举
 */
const TASK_PRIORITY = {
    CRITICAL: { value: 'critical', label: '紧急', color: '#ff4757', weight: 4 },
    HIGH: { value: 'high', label: '高优先级', color: '#ff6b35', weight: 3 },
    MEDIUM: { value: 'medium', label: '中等优先级', color: '#ffa726', weight: 2 },
    LOW: { value: 'low', label: '低优先级', color: '#66bb6a', weight: 1 },
    NONE: { value: 'none', label: '无优先级', color: '#9e9e9e', weight: 0 }
};

/**
 * 任务状态枚举
 */
const TASK_STATUS = {
    BACKLOG: { value: 'backlog', label: '待办', color: '#9e9e9e', category: 'todo' },
    TODO: { value: 'todo', label: '计划中', color: '#2196f3', category: 'todo' },
    IN_PROGRESS: { value: 'in_progress', label: '进行中', color: '#ff9800', category: 'active' },
    IN_REVIEW: { value: 'in_review', label: '待审核', color: '#9c27b0', category: 'active' },
    TESTING: { value: 'testing', label: '测试中', color: '#673ab7', category: 'active' },
    COMPLETED: { value: 'completed', label: '已完成', color: '#4caf50', category: 'done' },
    CANCELLED: { value: 'cancelled', label: '已取消', color: '#f44336', category: 'done' },
    ON_HOLD: { value: 'on_hold', label: '暂停', color: '#795548', category: 'blocked' }
};

/**
 * 任务类型枚举
 */
const TASK_TYPE = {
    FEATURE: { value: 'feature', label: '功能开发', icon: 'fas fa-plus-circle', color: '#2196f3' },
    BUG: { value: 'bug', label: '缺陷修复', icon: 'fas fa-bug', color: '#f44336' },
    IMPROVEMENT: { value: 'improvement', label: '优化改进', icon: 'fas fa-arrow-up', color: '#ff9800' },
    DOCUMENTATION: { value: 'documentation', label: '文档编写', icon: 'fas fa-file-alt', color: '#9c27b0' },
    RESEARCH: { value: 'research', label: '研究调研', icon: 'fas fa-search', color: '#00bcd4' },
    MAINTENANCE: { value: 'maintenance', label: '维护', icon: 'fas fa-tools', color: '#795548' },
    MEETING: { value: 'meeting', label: '会议', icon: 'fas fa-users', color: '#607d8b' },
    REVIEW: { value: 'review', label: '评审', icon: 'fas fa-eye', color: '#9c27b0' }
};

/**
 * 任务复杂度/工作量估算
 */
const TASK_COMPLEXITY = {
    XS: { value: 'xs', label: 'XS (0.5天)', points: 1, hours: 4 },
    S: { value: 's', label: 'S (1天)', points: 2, hours: 8 },
    M: { value: 'm', label: 'M (2-3天)', points: 3, hours: 20 },
    L: { value: 'l', label: 'L (1周)', points: 5, hours: 40 },
    XL: { value: 'xl', label: 'XL (2周)', points: 8, hours: 80 },
    XXL: { value: 'xxl', label: 'XXL (1月)', points: 13, hours: 160 }
};

/**
 * 扩展的标签数据
 */
const mockLabels = [
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
];

/**
 * 专业级任务数据结构
 */
const mockTasks = [
    {
        id: 'TASK-001',
        title: '用户认证系统重构',
        description: '重构现有的用户认证系统，增加多因子认证、SSO支持和安全审计功能。需要考虑向后兼容性和性能优化。',
        
        // 基本属性
        type: TASK_TYPE.FEATURE.value,
        status: TASK_STATUS.IN_PROGRESS.value,
        priority: TASK_PRIORITY.HIGH.value,
        complexity: TASK_COMPLEXITY.L.value,
        
        // 时间管理
        createdAt: '2024-01-15T08:00:00Z',
        updatedAt: '2024-01-20T14:30:00Z',
        dueDate: '2024-02-15T18:00:00Z',
        startDate: '2024-01-18T09:00:00Z',
        estimatedHours: 40,
        actualHours: 24,
        
        // 进度跟踪
        progress: 60, // 百分比
        completedSubtasks: 3,
        totalSubtasks: 5,
        
        // 责任分配
        assignee: {
            id: 'user-001',
            name: '张三',

            role: '前端工程师',
            email: 'zhangsan@company.com'
        },
        collaborators: [
            {
                id: 'user-002',
                name: '李四',

                role: '后端工程师'
            },
            {
                id: 'user-003',
                name: '王五',

                role: 'UI设计师'
            }
        ],
        
        // 标签和分类
        labels: [
            { id: 'label-001', name: '认证', color: '#2196f3' },
            { id: 'label-002', name: '安全', color: '#f44336' },
            { id: 'label-003', name: '重构', color: '#ff9800' }
        ],
        project: {
            id: 'proj-001',
            name: '用户中心升级项目',
            code: 'UUP'
        },
        epic: {
            id: 'epic-001',
            name: '安全体系升级',
            code: 'SEC'
        },
        
        // 依赖关系
        dependencies: {
            blockedBy: ['TASK-005'], // 被哪些任务阻塞
            blocking: ['TASK-003', 'TASK-004'], // 阻塞哪些任务
            relatedTo: ['TASK-007'] // 相关任务
        },
        
        // 子任务
        subtasks: [
            {
                id: 'SUB-001',
                title: '设计多因子认证流程',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-003',
                estimatedHours: 8,
                actualHours: 6
            },
            {
                id: 'SUB-002',
                title: '实现SSO集成',
                status: TASK_STATUS.IN_PROGRESS.value,
                assignee: 'user-002',
                estimatedHours: 16,
                actualHours: 12
            },
            {
                id: 'SUB-003',
                title: '安全审计日志',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-002',
                estimatedHours: 8,
                actualHours: 6
            },
            {
                id: 'SUB-004',
                title: '前端界面实现',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-001',
                estimatedHours: 12,
                actualHours: 0
            },
            {
                id: 'SUB-005',
                title: '安全测试和文档',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-001',
                estimatedHours: 8,
                actualHours: 0
            }
        ],
        
        // 附件和文档
        attachments: [
            {
                id: 'att-001',
                name: '认证系统架构图.pdf',
                url: '/files/auth-architecture.pdf',
                type: 'application/pdf',
                size: 2048576
            },
            {
                id: 'att-002',
                name: '安全要求文档.docx',
                url: '/files/security-requirements.docx',
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                size: 1048576
            }
        ],
        
        // 评论和活动记录
        comments: [
            {
                id: 'comment-001',
                author: 'user-002',
                content: 'SSO集成的OAuth2.0配置已完成，正在进行测试。',
                createdAt: '2024-01-20T10:30:00Z',
                type: 'update'
            },
            {
                id: 'comment-002',
                author: 'user-003',
                content: '@张三 请确认一下UI设计是否符合无障碍访问标准。',
                createdAt: '2024-01-19T16:45:00Z',
                type: 'mention'
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
        
        // 时间跟踪
        timeEntries: [
            {
                id: 'time-001',
                user: 'user-001',
                description: '设计认证流程',
                startTime: '2024-01-18T09:00:00Z',
                endTime: '2024-01-18T12:00:00Z',
                duration: 180 // 分钟
            },
            {
                id: 'time-002',
                user: 'user-002',
                description: 'SSO后端开发',
                startTime: '2024-01-19T14:00:00Z',
                endTime: '2024-01-19T18:00:00Z',
                duration: 240
            }
        ]
    },
    
    {
        id: 'TASK-002',
        title: '性能监控仪表板开发',
        description: '开发实时性能监控仪表板，包括系统指标、用户行为分析和告警系统。',
        
        type: TASK_TYPE.FEATURE.value,
        status: TASK_STATUS.TODO.value,
        priority: TASK_PRIORITY.MEDIUM.value,
        complexity: TASK_COMPLEXITY.M.value,
        
        createdAt: '2024-01-16T10:00:00Z',
        updatedAt: '2024-01-16T10:00:00Z',
        dueDate: '2024-02-28T18:00:00Z',
        startDate: '2024-02-01T09:00:00Z',
        estimatedHours: 20,
        actualHours: 0,
        
        progress: 0,
        completedSubtasks: 0,
        totalSubtasks: 4,
        
        assignee: {
            id: 'user-004',
            name: '赵六',

            role: '全栈工程师',
            email: 'zhaoliu@company.com'
        },
        collaborators: [
            {
                id: 'user-005',
                name: '钱七',

                role: '数据分析师'
            }
        ],
        
        labels: [
            { id: 'label-004', name: '监控', color: '#9c27b0' },
            { id: 'label-005', name: '仪表板', color: '#00bcd4' },
            { id: 'label-006', name: '性能', color: '#4caf50' }
        ],
        project: {
            id: 'proj-002',
            name: '运维平台开发',
            code: 'OPS'
        },
        epic: {
            id: 'epic-002',
            name: '监控体系建设',
            code: 'MON'
        },
        
        dependencies: {
            blockedBy: [],
            blocking: ['TASK-006'],
            relatedTo: ['TASK-008']
        },
        
        subtasks: [
            {
                id: 'SUB-006',
                title: '设计仪表板原型',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-005',
                estimatedHours: 6,
                actualHours: 0
            },
            {
                id: 'SUB-007',
                title: '实现数据收集API',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-004',
                estimatedHours: 8,
                actualHours: 0
            },
            {
                id: 'SUB-008',
                title: '前端图表组件开发',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-004',
                estimatedHours: 10,
                actualHours: 0
            },
            {
                id: 'SUB-009',
                title: '告警系统集成',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-004',
                estimatedHours: 6,
                actualHours: 0
            }
        ],
        
        attachments: [
            {
                id: 'att-003',
                name: '监控需求说明书.pdf',
                url: '/files/monitoring-requirements.pdf',
                type: 'application/pdf',
                size: 1536000
            }
        ],
        
        comments: [],
        
        customFields: {
            testingRequired: true,
            securityReviewRequired: false,
            documentationRequired: true,
            customerImpact: 'medium',
            technicalRisk: 'low'
        },
        
        timeEntries: []
    },
    
    {
        id: 'TASK-003',
        title: '移动端适配优化',
        description: '优化现有Web应用的移动端体验，包括响应式设计、触摸交互和性能优化。',
        
        type: TASK_TYPE.IMPROVEMENT.value,
        status: TASK_STATUS.BACKLOG.value,
        priority: TASK_PRIORITY.LOW.value,
        complexity: TASK_COMPLEXITY.S.value,
        
        createdAt: '2024-01-17T11:00:00Z',
        updatedAt: '2024-01-17T11:00:00Z',
        dueDate: '2024-03-15T18:00:00Z',
        startDate: null,
        estimatedHours: 8,
        actualHours: 0,
        
        progress: 0,
        completedSubtasks: 0,
        totalSubtasks: 3,
        
        assignee: {
            id: 'user-001',
            name: '张三',

            role: '前端工程师',
            email: 'zhangsan@company.com'
        },
        collaborators: [
            {
                id: 'user-003',
                name: '王五',

                role: 'UI设计师'
            }
        ],
        
        labels: [
            { id: 'label-007', name: '移动端', color: '#e91e63' },
            { id: 'label-008', name: '响应式', color: '#673ab7' },
            { id: 'label-009', name: '用户体验', color: '#ff5722' }
        ],
        project: {
            id: 'proj-001',
            name: '用户中心升级项目',
            code: 'UUP'
        },
        epic: {
            id: 'epic-003',
            name: '用户体验优化',
            code: 'UX'
        },
        
        dependencies: {
            blockedBy: ['TASK-001'],
            blocking: [],
            relatedTo: []
        },
        
        subtasks: [
            {
                id: 'SUB-010',
                title: '移动端UI设计调研',
                status: TASK_STATUS.BACKLOG.value,
                assignee: 'user-003',
                estimatedHours: 4,
                actualHours: 0
            },
            {
                id: 'SUB-011',
                title: '响应式CSS重构',
                status: TASK_STATUS.BACKLOG.value,
                assignee: 'user-001',
                estimatedHours: 6,
                actualHours: 0
            },
            {
                id: 'SUB-012',
                title: '触摸交互优化',
                status: TASK_STATUS.BACKLOG.value,
                assignee: 'user-001',
                estimatedHours: 4,
                actualHours: 0
            }
        ],
        
        attachments: [],
        comments: [],
        
        customFields: {
            testingRequired: true,
            securityReviewRequired: false,
            documentationRequired: false,
            customerImpact: 'high',
            technicalRisk: 'low'
        },
        
        timeEntries: []
    },
    
    {
        id: 'TASK-004',
        title: '数据库性能优化',
        description: '分析和优化数据库查询性能，包括索引优化、查询重构和缓存策略实施。',
        
        type: TASK_TYPE.IMPROVEMENT.value,
        status: TASK_STATUS.COMPLETED.value,
        priority: TASK_PRIORITY.CRITICAL.value,
        complexity: TASK_COMPLEXITY.M.value,
        
        createdAt: '2024-01-10T08:00:00Z',
        updatedAt: '2024-01-18T17:00:00Z',
        dueDate: '2024-01-20T18:00:00Z',
        startDate: '2024-01-12T09:00:00Z',
        estimatedHours: 16,
        actualHours: 18,
        
        progress: 100,
        completedSubtasks: 4,
        totalSubtasks: 4,
        
        assignee: {
            id: 'user-002',
            name: '李四',
    
            role: '后端工程师',
            email: 'lisi@company.com'
        },
        collaborators: [
            {
                id: 'user-006',
                name: '孙八',

                role: 'DBA'
            }
        ],
        
        labels: [
            { id: 'label-010', name: '数据库', color: '#607d8b' },
            { id: 'label-011', name: '性能', color: '#4caf50' },
            { id: 'label-012', name: '优化', color: '#ff9800' }
        ],
        project: {
            id: 'proj-003',
            name: '系统性能优化',
            code: 'PERF'
        },
        epic: {
            id: 'epic-004',
            name: '基础设施优化',
            code: 'INFRA'
        },
        
        dependencies: {
            blockedBy: [],
            blocking: ['TASK-001'],
            relatedTo: ['TASK-005']
        },
        
        subtasks: [
            {
                id: 'SUB-013',
                title: '查询性能分析',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-006',
                estimatedHours: 4,
                actualHours: 5
            },
            {
                id: 'SUB-014',
                title: '索引策略设计',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-006',
                estimatedHours: 6,
                actualHours: 7
            },
            {
                id: 'SUB-015',
                title: '查询重构实施',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-002',
                estimatedHours: 8,
                actualHours: 8
            },
            {
                id: 'SUB-016',
                title: '缓存策略实施',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-002',
                estimatedHours: 4,
                actualHours: 3
            }
        ],
        
        attachments: [
            {
                id: 'att-004',
                name: '数据库优化报告.xlsx',
                url: '/files/db-optimization-report.xlsx',
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                size: 512000
            }
        ],
        
        comments: [
            {
                id: 'comment-003',
                author: 'user-006',
                content: '查询性能提升了60%，缓存命中率达到85%。',
                createdAt: '2024-01-18T16:30:00Z',
                type: 'completion'
            }
        ],
        
        customFields: {
            testingRequired: true,
            securityReviewRequired: false,
            documentationRequired: true,
            customerImpact: 'high',
            technicalRisk: 'medium'
        },
        
        timeEntries: [
            {
                id: 'time-003',
                user: 'user-002',
                description: '数据库查询优化',
                startTime: '2024-01-15T09:00:00Z',
                endTime: '2024-01-15T17:00:00Z',
                duration: 480
            },
            {
                id: 'time-004',
                user: 'user-006',
                description: '索引优化分析',
                startTime: '2024-01-16T10:00:00Z',
                endTime: '2024-01-16T16:00:00Z',
                duration: 360
            }
        ]
    },
    
    {
        id: 'TASK-005',
        title: 'API安全漏洞修复',
        description: '修复发现的API安全漏洞，包括SQL注入防护、XSS防护和权限验证加强。',
        
        type: TASK_TYPE.BUG.value,
        status: TASK_STATUS.IN_REVIEW.value,
        priority: TASK_PRIORITY.CRITICAL.value,
        complexity: TASK_COMPLEXITY.S.value,
        
        createdAt: '2024-01-14T14:00:00Z',
        updatedAt: '2024-01-21T11:00:00Z',
        dueDate: '2024-01-25T18:00:00Z',
        startDate: '2024-01-15T09:00:00Z',
        estimatedHours: 12,
        actualHours: 10,
        
        progress: 90,
        completedSubtasks: 2,
        totalSubtasks: 3,
        
        assignee: {
            id: 'user-002',
            name: '李四',
    
            role: '后端工程师',
            email: 'lisi@company.com'
        },
        collaborators: [
            {
                id: 'user-007',
                name: '周九',

                role: '安全工程师'
            }
        ],
        
        labels: [
            { id: 'label-002', name: '安全', color: '#f44336' },
            { id: 'label-013', name: '漏洞', color: '#e91e63' },
            { id: 'label-014', name: 'API', color: '#3f51b5' }
        ],
        project: {
            id: 'proj-001',
            name: '用户中心升级项目',
            code: 'UUP'
        },
        epic: {
            id: 'epic-001',
            name: '安全体系升级',
            code: 'SEC'
        },
        
        dependencies: {
            blockedBy: [],
            blocking: ['TASK-001'],
            relatedTo: ['TASK-004']
        },
        
        subtasks: [
            {
                id: 'SUB-017',
                title: 'SQL注入防护实施',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-002',
                estimatedHours: 4,
                actualHours: 3
            },
            {
                id: 'SUB-018',
                title: 'XSS防护加强',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-002',
                estimatedHours: 3,
                actualHours: 4
            },
            {
                id: 'SUB-019',
                title: '权限验证重构',
                status: TASK_STATUS.IN_REVIEW.value,
                assignee: 'user-007',
                estimatedHours: 5,
                actualHours: 3
            }
        ],
        
        attachments: [
            {
                id: 'att-005',
                name: '安全漏洞扫描报告.pdf',
                url: '/files/security-scan-report.pdf',
                type: 'application/pdf',
                size: 3072000
            }
        ],
        
        comments: [
            {
                id: 'comment-004',
                author: 'user-007',
                content: '权限验证部分已完成代码审查，建议增加单元测试覆盖。',
                createdAt: '2024-01-21T10:30:00Z',
                type: 'review'
            }
        ],
        
        customFields: {
            testingRequired: true,
            securityReviewRequired: true,
            documentationRequired: true,
            customerImpact: 'critical',
            technicalRisk: 'high'
        },
        
        timeEntries: [
            {
                id: 'time-005',
                user: 'user-002',
                description: '安全漏洞修复',
                startTime: '2024-01-20T09:00:00Z',
                endTime: '2024-01-20T15:00:00Z',
                duration: 360
            }
        ]
    },

    {
        id: 'TASK-006',
        title: '微服务架构设计',
        description: '设计新的微服务架构，包括服务拆分策略、API网关设计和数据一致性方案。',
        
        type: TASK_TYPE.RESEARCH.value,
        status: TASK_STATUS.TODO.value,
        priority: TASK_PRIORITY.HIGH.value,
        complexity: TASK_COMPLEXITY.XL.value,
        
        createdAt: '2024-01-22T09:00:00Z',
        updatedAt: '2024-01-22T09:00:00Z',
        dueDate: '2024-03-31T18:00:00Z',
        startDate: '2024-02-15T09:00:00Z',
        estimatedHours: 80,
        actualHours: 0,
        
        progress: 0,
        completedSubtasks: 0,
        totalSubtasks: 6,
        
        assignee: {
            id: 'user-008',
            name: '吴十',
            role: '架构师',
            email: 'wushi@company.com'
        },
        collaborators: [
            {
                id: 'user-002',
                name: '李四',
                role: '后端工程师'
            },
            {
                id: 'user-009',
                name: '郑十一',
                role: 'DevOps工程师'
            }
        ],
        
        labels: [
            { id: 'label-015', name: '架构', color: '#795548' },
            { id: 'label-016', name: '微服务', color: '#607d8b' },
            { id: 'label-017', name: '设计', color: '#9c27b0' }
        ],
        project: {
            id: 'proj-004',
            name: '系统架构重构',
            code: 'ARCH'
        },
        epic: {
            id: 'epic-005',
            name: '技术架构升级',
            code: 'TECH'
        },
        
        dependencies: {
            blockedBy: ['TASK-002'],
            blocking: [],
            relatedTo: ['TASK-010']
        },
        
        subtasks: [
            {
                id: 'SUB-020',
                title: '服务拆分分析',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-008',
                estimatedHours: 16,
                actualHours: 0
            },
            {
                id: 'SUB-021',
                title: 'API网关设计',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-008',
                estimatedHours: 20,
                actualHours: 0
            },
            {
                id: 'SUB-022',
                title: '数据一致性方案',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-002',
                estimatedHours: 16,
                actualHours: 0
            },
            {
                id: 'SUB-023',
                title: '部署策略设计',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-009',
                estimatedHours: 12,
                actualHours: 0
            },
            {
                id: 'SUB-024',
                title: '性能测试方案',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-010',
                estimatedHours: 8,
                actualHours: 0
            },
            {
                id: 'SUB-025',
                title: '文档编写',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-011',
                estimatedHours: 8,
                actualHours: 0
            }
        ],
        
        attachments: [
            {
                id: 'att-006',
                name: '微服务架构调研报告.pdf',
                url: '/files/microservices-research.pdf',
                type: 'application/pdf',
                size: 2560000
            }
        ],
        
        comments: [],
        
        customFields: {
            testingRequired: true,
            securityReviewRequired: true,
            documentationRequired: true,
            customerImpact: 'medium',
            technicalRisk: 'high'
        },
        
        timeEntries: []
    },

    {
        id: 'TASK-007',
        title: '前端组件库开发',
        description: '开发统一的前端组件库，包括基础组件、业务组件和主题系统。',
        
        type: TASK_TYPE.FEATURE.value,
        status: TASK_STATUS.IN_PROGRESS.value,
        priority: TASK_PRIORITY.MEDIUM.value,
        complexity: TASK_COMPLEXITY.L.value,
        
        createdAt: '2024-01-20T14:00:00Z',
        updatedAt: '2024-01-23T16:00:00Z',
        dueDate: '2024-03-15T18:00:00Z',
        startDate: '2024-01-25T09:00:00Z',
        estimatedHours: 40,
        actualHours: 18,
        
        progress: 45,
        completedSubtasks: 4,
        totalSubtasks: 8,
        
        assignee: {
            id: 'user-001',
            name: '张三',
            role: '前端工程师',
            email: 'zhangsan@company.com'
        },
        collaborators: [
            {
                id: 'user-003',
                name: '王五',
                role: 'UI设计师'
            },
            {
                id: 'user-012',
                name: '王十二',
                role: '前端工程师'
            }
        ],
        
        labels: [
            { id: 'label-018', name: '组件库', color: '#2196f3' },
            { id: 'label-019', name: '前端', color: '#00bcd4' },
            { id: 'label-020', name: '设计系统', color: '#9c27b0' }
        ],
        project: {
            id: 'proj-005',
            name: '前端基础设施',
            code: 'FEI'
        },
        epic: {
            id: 'epic-006',
            name: '前端标准化',
            code: 'FEST'
        },
        
        dependencies: {
            blockedBy: [],
            blocking: ['TASK-003'],
            relatedTo: ['TASK-013']
        },
        
        subtasks: [
            {
                id: 'SUB-026',
                title: '设计系统规范',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-003',
                estimatedHours: 8,
                actualHours: 6
            },
            {
                id: 'SUB-027',
                title: '基础组件开发',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-001',
                estimatedHours: 12,
                actualHours: 10
            },
            {
                id: 'SUB-028',
                title: '表单组件开发',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-012',
                estimatedHours: 8,
                actualHours: 8
            },
            {
                id: 'SUB-029',
                title: '数据展示组件',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-001',
                estimatedHours: 10,
                actualHours: 8
            },
            {
                id: 'SUB-030',
                title: '导航组件开发',
                status: TASK_STATUS.IN_PROGRESS.value,
                assignee: 'user-012',
                estimatedHours: 8,
                actualHours: 4
            },
            {
                id: 'SUB-031',
                title: '反馈组件开发',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-001',
                estimatedHours: 6,
                actualHours: 0
            },
            {
                id: 'SUB-032',
                title: '主题系统实现',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-003',
                estimatedHours: 8,
                actualHours: 0
            },
            {
                id: 'SUB-033',
                title: '文档和示例',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-011',
                estimatedHours: 6,
                actualHours: 0
            }
        ],
        
        attachments: [
            {
                id: 'att-007',
                name: '组件库设计规范.pdf',
                url: '/files/component-library-design.pdf',
                type: 'application/pdf',
                size: 1843200
            }
        ],
        
        comments: [
            {
                id: 'comment-005',
                author: 'user-003',
                content: '导航组件的设计稿已完成，请查看并确认。',
                createdAt: '2024-01-23T15:30:00Z',
                type: 'design'
            }
        ],
        
        customFields: {
            testingRequired: true,
            securityReviewRequired: false,
            documentationRequired: true,
            customerImpact: 'high',
            technicalRisk: 'low'
        },
        
        timeEntries: [
            {
                id: 'time-006',
                user: 'user-001',
                description: '基础组件开发',
                startTime: '2024-01-25T09:00:00Z',
                endTime: '2024-01-25T17:00:00Z',
                duration: 480
            }
        ]
    },

    {
        id: 'TASK-008',
        title: '自动化测试框架搭建',
        description: '搭建完整的自动化测试框架，包括单元测试、集成测试和端到端测试。',
        
        type: TASK_TYPE.FEATURE.value,
        status: TASK_STATUS.TESTING.value,
        priority: TASK_PRIORITY.MEDIUM.value,
        complexity: TASK_COMPLEXITY.M.value,
        
        createdAt: '2024-01-18T16:00:00Z',
        updatedAt: '2024-01-24T11:00:00Z',
        dueDate: '2024-02-20T18:00:00Z',
        startDate: '2024-01-22T09:00:00Z',
        estimatedHours: 24,
        actualHours: 22,
        
        progress: 85,
        completedSubtasks: 5,
        totalSubtasks: 6,
        
        assignee: {
            id: 'user-013',
            name: '李十三',
            role: '测试工程师',
            email: 'lishisan@company.com'
        },
        collaborators: [
            {
                id: 'user-002',
                name: '李四',
                role: '后端工程师'
            },
            {
                id: 'user-001',
                name: '张三',
                role: '前端工程师'
            }
        ],
        
        labels: [
            { id: 'label-021', name: '测试', color: '#4caf50' },
            { id: 'label-022', name: '自动化', color: '#ff9800' },
            { id: 'label-023', name: '质量保证', color: '#2196f3' }
        ],
        project: {
            id: 'proj-006',
            name: '质量保证体系',
            code: 'QA'
        },
        epic: {
            id: 'epic-007',
            name: '测试自动化',
            code: 'TEST'
        },
        
        dependencies: {
            blockedBy: [],
            blocking: ['TASK-002'],
            relatedTo: ['TASK-014']
        },
        
        subtasks: [
            {
                id: 'SUB-034',
                title: '测试框架选型',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-013',
                estimatedHours: 4,
                actualHours: 3
            },
            {
                id: 'SUB-035',
                title: '单元测试配置',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-002',
                estimatedHours: 6,
                actualHours: 5
            },
            {
                id: 'SUB-036',
                title: '集成测试配置',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-013',
                estimatedHours: 8,
                actualHours: 8
            },
            {
                id: 'SUB-037',
                title: 'E2E测试配置',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-001',
                estimatedHours: 6,
                actualHours: 6
            },
            {
                id: 'SUB-038',
                title: 'CI/CD集成',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-009',
                estimatedHours: 4,
                actualHours: 4
            },
            {
                id: 'SUB-039',
                title: '测试报告系统',
                status: TASK_STATUS.TESTING.value,
                assignee: 'user-013',
                estimatedHours: 4,
                actualHours: 2
            }
        ],
        
        attachments: [
            {
                id: 'att-008',
                name: '测试框架调研报告.pdf',
                url: '/files/testing-framework-research.pdf',
                type: 'application/pdf',
                size: 1280000
            }
        ],
        
        comments: [
            {
                id: 'comment-006',
                author: 'user-013',
                content: '测试报告系统基本功能已完成，正在进行最后的调试。',
                createdAt: '2024-01-24T10:30:00Z',
                type: 'update'
            }
        ],
        
        customFields: {
            testingRequired: false,
            securityReviewRequired: false,
            documentationRequired: true,
            customerImpact: 'medium',
            technicalRisk: 'low'
        },
        
        timeEntries: [
            {
                id: 'time-007',
                user: 'user-013',
                description: '测试框架配置',
                startTime: '2024-01-22T09:00:00Z',
                endTime: '2024-01-22T17:00:00Z',
                duration: 480
            }
        ]
    },

    {
        id: 'TASK-009',
        title: '用户反馈系统开发',
        description: '开发用户反馈收集和管理系统，包括反馈表单、分类管理和处理流程。',
        
        type: TASK_TYPE.FEATURE.value,
        status: TASK_STATUS.IN_REVIEW.value,
        priority: TASK_PRIORITY.LOW.value,
        complexity: TASK_COMPLEXITY.S.value,
        
        createdAt: '2024-01-25T10:00:00Z',
        updatedAt: '2024-01-26T15:00:00Z',
        dueDate: '2024-02-10T18:00:00Z',
        startDate: '2024-01-27T09:00:00Z',
        estimatedHours: 16,
        actualHours: 14,
        
        progress: 90,
        completedSubtasks: 3,
        totalSubtasks: 3,
        
        assignee: {
            id: 'user-014',
            name: '王十四',
            role: '产品经理',
            email: 'wangshisi@company.com'
        },
        collaborators: [
            {
                id: 'user-001',
                name: '张三',
                role: '前端工程师'
            },
            {
                id: 'user-002',
                name: '李四',
                role: '后端工程师'
            }
        ],
        
        labels: [
            { id: 'label-024', name: '用户反馈', color: '#e91e63' },
            { id: 'label-025', name: '产品功能', color: '#ff5722' },
            { id: 'label-026', name: '用户体验', color: '#ff9800' }
        ],
        project: {
            id: 'proj-007',
            name: '产品功能增强',
            code: 'PFE'
        },
        epic: {
            id: 'epic-008',
            name: '用户参与度提升',
            code: 'UEP'
        },
        
        dependencies: {
            blockedBy: [],
            blocking: [],
            relatedTo: ['TASK-015']
        },
        
        subtasks: [
            {
                id: 'SUB-040',
                title: '反馈表单设计',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-014',
                estimatedHours: 6,
                actualHours: 5
            },
            {
                id: 'SUB-041',
                title: '后端API开发',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-002',
                estimatedHours: 8,
                actualHours: 7
            },
            {
                id: 'SUB-042',
                title: '前端界面实现',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-001',
                estimatedHours: 8,
                actualHours: 8
            }
        ],
        
        attachments: [
            {
                id: 'att-009',
                name: '用户反馈需求文档.pdf',
                url: '/files/feedback-system-requirements.pdf',
                type: 'application/pdf',
                size: 896000
            }
        ],
        
        comments: [
            {
                id: 'comment-007',
                author: 'user-014',
                content: '系统功能已全部完成，等待产品验收。',
                createdAt: '2024-01-26T14:30:00Z',
                type: 'completion'
            }
        ],
        
        customFields: {
            testingRequired: true,
            securityReviewRequired: false,
            documentationRequired: true,
            customerImpact: 'high',
            technicalRisk: 'low'
        },
        
        timeEntries: [
            {
                id: 'time-008',
                user: 'user-014',
                description: '需求分析和设计',
                startTime: '2024-01-27T09:00:00Z',
                endTime: '2024-01-27T17:00:00Z',
                duration: 480
            }
        ]
    },

    {
        id: 'TASK-010',
        title: '容器化部署方案',
        description: '设计并实施容器化部署方案，包括Docker配置、Kubernetes编排和CI/CD流程。',
        
        type: TASK_TYPE.IMPROVEMENT.value,
        status: TASK_STATUS.ON_HOLD.value,
        priority: TASK_PRIORITY.MEDIUM.value,
        complexity: TASK_COMPLEXITY.L.value,
        
        createdAt: '2024-01-23T13:00:00Z',
        updatedAt: '2024-01-25T16:00:00Z',
        dueDate: '2024-03-31T18:00:00Z',
        startDate: '2024-02-01T09:00:00Z',
        estimatedHours: 32,
        actualHours: 0,
        
        progress: 0,
        completedSubtasks: 0,
        totalSubtasks: 4,
        
        assignee: {
            id: 'user-009',
            name: '郑十一',
            role: 'DevOps工程师',
            email: 'zhengshiyi@company.com'
        },
        collaborators: [
            {
                id: 'user-006',
                name: '孙八',
                role: 'DBA'
            },
            {
                id: 'user-015',
                name: '赵十五',
                role: '运维工程师'
            }
        ],
        
        labels: [
            { id: 'label-027', name: '容器化', color: '#00bcd4' },
            { id: 'label-028', name: 'DevOps', color: '#607d8b' },
            { id: 'label-029', name: '部署', color: '#795548' }
        ],
        project: {
            id: 'proj-008',
            name: '基础设施现代化',
            code: 'INFRA'
        },
        epic: {
            id: 'epic-009',
            name: '部署流程优化',
            code: 'DEPLOY'
        },
        
        dependencies: {
            blockedBy: ['TASK-006'],
            blocking: [],
            relatedTo: ['TASK-016']
        },
        
        subtasks: [
            {
                id: 'SUB-043',
                title: 'Docker配置优化',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-009',
                estimatedHours: 8,
                actualHours: 0
            },
            {
                id: 'SUB-044',
                title: 'K8s集群配置',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-009',
                estimatedHours: 12,
                actualHours: 0
            },
            {
                id: 'SUB-045',
                title: 'CI/CD流程设计',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-015',
                estimatedHours: 8,
                actualHours: 0
            },
            {
                id: 'SUB-046',
                title: '监控和日志',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-015',
                estimatedHours: 8,
                actualHours: 0
            }
        ],
        
        attachments: [],
        comments: [
            {
                id: 'comment-008',
                author: 'user-009',
                content: '等待微服务架构设计完成后开始实施。',
                createdAt: '2024-01-25T15:30:00Z',
                type: 'blocked'
            }
        ],
        
        customFields: {
            testingRequired: true,
            securityReviewRequired: false,
            documentationRequired: true,
            customerImpact: 'medium',
            technicalRisk: 'medium'
        },
        
        timeEntries: []
    },

    {
        id: 'TASK-011',
        title: '季度技术评审会议',
        description: '组织季度技术评审会议，讨论技术债务、架构决策和未来技术方向。',
        
        type: TASK_TYPE.MEETING.value,
        status: TASK_STATUS.TODO.value,
        priority: TASK_PRIORITY.MEDIUM.value,
        complexity: TASK_COMPLEXITY.XS.value,
        
        createdAt: '2024-01-26T14:00:00Z',
        updatedAt: '2024-01-26T14:00:00Z',
        dueDate: '2024-02-05T18:00:00Z',
        startDate: '2024-02-05T14:00:00Z',
        estimatedHours: 4,
        actualHours: 0,
        
        progress: 0,
        completedSubtasks: 0,
        totalSubtasks: 3,
        
        assignee: {
            id: 'user-008',
            name: '吴十',
            role: '架构师',
            email: 'wushi@company.com'
        },
        collaborators: [
            {
                id: 'user-001',
                name: '张三',
                role: '前端工程师'
            },
            {
                id: 'user-002',
                name: '李四',
                role: '后端工程师'
            },
            {
                id: 'user-004',
                name: '赵六',
                role: '全栈工程师'
            }
        ],
        
        labels: [
            { id: 'label-030', name: '会议', color: '#607d8b' },
            { id: 'label-031', name: '评审', color: '#9c27b0' },
            { id: 'label-032', name: '技术决策', color: '#2196f3' }
        ],
        project: {
            id: 'proj-009',
            name: '技术治理',
            code: 'TECH'
        },
        epic: {
            id: 'epic-010',
            name: '技术标准制定',
            code: 'STANDARD'
        },
        
        dependencies: {
            blockedBy: [],
            blocking: [],
            relatedTo: ['TASK-006', 'TASK-010']
        },
        
        subtasks: [
            {
                id: 'SUB-047',
                title: '会议议程准备',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-008',
                estimatedHours: 2,
                actualHours: 0
            },
            {
                id: 'SUB-048',
                title: '参会人员邀请',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-008',
                estimatedHours: 1,
                actualHours: 0
            },
            {
                id: 'SUB-049',
                title: '会议纪要整理',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-011',
                estimatedHours: 1,
                actualHours: 0
            }
        ],
        
        attachments: [],
        comments: [],
        
        customFields: {
            testingRequired: false,
            securityReviewRequired: false,
            documentationRequired: true,
            customerImpact: 'low',
            technicalRisk: 'low'
        },
        
        timeEntries: []
    },

    {
        id: 'TASK-012',
        title: 'API文档更新维护',
        description: '更新和维护所有API接口文档，确保文档与代码同步，增加示例和错误码说明。',
        
        type: TASK_TYPE.DOCUMENTATION.value,
        status: TASK_STATUS.IN_PROGRESS.value,
        priority: TASK_PRIORITY.LOW.value,
        complexity: TASK_COMPLEXITY.S.value,
        
        createdAt: '2024-01-24T11:00:00Z',
        updatedAt: '2024-01-26T10:00:00Z',
        dueDate: '2024-02-15T18:00:00Z',
        startDate: '2024-01-25T09:00:00Z',
        estimatedHours: 12,
        actualHours: 6,
        
        progress: 50,
        completedSubtasks: 2,
        totalSubtasks: 4,
        
        assignee: {
            id: 'user-011',
            name: '周十三',
            role: '技术文档工程师',
            email: 'zhoushisan@company.com'
        },
        collaborators: [
            {
                id: 'user-002',
                name: '李四',
                role: '后端工程师'
            },
            {
                id: 'user-016',
                name: '李十六',
                role: '产品经理'
            }
        ],
        
        labels: [
            { id: 'label-033', name: '文档', color: '#9c27b0' },
            { id: 'label-034', name: 'API', color: '#3f51b5' },
            { id: 'label-035', name: '维护', color: '#795548' }
        ],
        project: {
            id: 'proj-010',
            name: '文档体系建设',
            code: 'DOC'
        },
        epic: {
            id: 'epic-011',
            name: '知识管理',
            code: 'KM'
        },
        
        dependencies: {
            blockedBy: [],
            blocking: [],
            relatedTo: ['TASK-001', 'TASK-002']
        },
        
        subtasks: [
            {
                id: 'SUB-050',
                title: '用户认证API文档',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-011',
                estimatedHours: 4,
                actualHours: 3
            },
            {
                id: 'SUB-051',
                title: '监控API文档',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-011',
                estimatedHours: 3,
                actualHours: 3
            },
            {
                id: 'SUB-052',
                title: '反馈系统API文档',
                status: TASK_STATUS.IN_PROGRESS.value,
                assignee: 'user-011',
                estimatedHours: 3,
                actualHours: 1
            },
            {
                id: 'SUB-053',
                title: '文档格式统一',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-011',
                estimatedHours: 2,
                actualHours: 0
            }
        ],
        
        attachments: [
            {
                id: 'att-010',
                name: 'API文档模板.docx',
                url: '/files/api-doc-template.docx',
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                size: 512000
            }
        ],
        
        comments: [
            {
                id: 'comment-009',
                author: 'user-002',
                content: '用户认证API的接口有更新，请同步更新文档。',
                createdAt: '2024-01-26T09:30:00Z',
                type: 'update'
            }
        ],
        
        customFields: {
            testingRequired: false,
            securityReviewRequired: false,
            documentationRequired: true,
            customerImpact: 'medium',
            technicalRisk: 'low'
        },
        
        timeEntries: [
            {
                id: 'time-009',
                user: 'user-011',
                description: 'API文档编写',
                startTime: '2024-01-25T09:00:00Z',
                endTime: '2024-01-25T12:00:00Z',
                duration: 180
            }
        ]
    },

    {
        id: 'TASK-013',
        title: '系统监控告警优化',
        description: '优化现有的系统监控告警规则，减少误报，提高告警的准确性和及时性。',
        
        type: TASK_TYPE.MAINTENANCE.value,
        status: TASK_STATUS.COMPLETED.value,
        priority: TASK_PRIORITY.HIGH.value,
        complexity: TASK_COMPLEXITY.S.value,
        
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-25T17:00:00Z',
        dueDate: '2024-01-25T18:00:00Z',
        startDate: '2024-01-16T09:00:00Z',
        estimatedHours: 8,
        actualHours: 7,
        
        progress: 100,
        completedSubtasks: 3,
        totalSubtasks: 3,
        
        assignee: {
            id: 'user-015',
            name: '赵十五',
            role: '运维工程师',
            email: 'zhaoshiwu@company.com'
        },
        collaborators: [
            {
                id: 'user-006',
                name: '孙八',
                role: 'DBA'
            }
        ],
        
        labels: [
            { id: 'label-036', name: '监控', color: '#9c27b0' },
            { id: 'label-037', name: '告警', color: '#f44336' },
            { id: 'label-038', name: '运维', color: '#607d8b' }
        ],
        project: {
            id: 'proj-011',
            name: '运维优化',
            code: 'OPS'
        },
        epic: {
            id: 'epic-012',
            name: '系统稳定性',
            code: 'STABILITY'
        },
        
        dependencies: {
            blockedBy: [],
            blocking: [],
            relatedTo: ['TASK-002', 'TASK-008']
        },
        
        subtasks: [
            {
                id: 'SUB-054',
                title: '告警规则分析',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-015',
                estimatedHours: 3,
                actualHours: 2
            },
            {
                id: 'SUB-055',
                title: '误报规则调整',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-015',
                estimatedHours: 3,
                actualHours: 3
            },
            {
                id: 'SUB-056',
                title: '告警阈值优化',
                status: TASK_STATUS.COMPLETED.value,
                assignee: 'user-006',
                estimatedHours: 2,
                actualHours: 2
            }
        ],
        
        attachments: [
            {
                id: 'att-011',
                name: '监控告警优化报告.xlsx',
                url: '/files/monitoring-alert-optimization.xlsx',
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                size: 256000
            }
        ],
        
        comments: [
            {
                id: 'comment-010',
                author: 'user-015',
                content: '告警误报率从15%降低到3%，响应时间提升了40%。',
                createdAt: '2024-01-25T16:30:00Z',
                type: 'completion'
            }
        ],
        
        customFields: {
            testingRequired: true,
            securityReviewRequired: false,
            documentationRequired: true,
            customerImpact: 'high',
            technicalRisk: 'low'
        },
        
        timeEntries: [
            {
                id: 'time-010',
                user: 'user-015',
                description: '告警规则优化',
                startTime: '2024-01-16T09:00:00Z',
                endTime: '2024-01-16T17:00:00Z',
                duration: 480
            }
        ]
    },

    {
        id: 'TASK-014',
        title: '代码质量检查工具集成',
        description: '集成代码质量检查工具到CI/CD流程中，包括SonarQube、ESLint等工具的配置和规则制定。',
        
        type: TASK_TYPE.IMPROVEMENT.value,
        status: TASK_STATUS.TODO.value,
        priority: TASK_PRIORITY.MEDIUM.value,
        complexity: TASK_COMPLEXITY.M.value,
        
        createdAt: '2024-01-26T15:00:00Z',
        updatedAt: '2024-01-26T15:00:00Z',
        dueDate: '2024-03-10T18:00:00Z',
        startDate: '2024-02-01T09:00:00Z',
        estimatedHours: 20,
        actualHours: 0,
        
        progress: 0,
        completedSubtasks: 0,
        totalSubtasks: 4,
        
        assignee: {
            id: 'user-009',
            name: '郑十一',
            role: 'DevOps工程师',
            email: 'zhengshiyi@company.com'
        },
        collaborators: [
            {
                id: 'user-001',
                name: '张三',
                role: '前端工程师'
            },
            {
                id: 'user-002',
                name: '李四',
                role: '后端工程师'
            }
        ],
        
        labels: [
            { id: 'label-039', name: '代码质量', color: '#4caf50' },
            { id: 'label-040', name: 'CI/CD', color: '#ff9800' },
            { id: 'label-041', name: '工具集成', color: '#2196f3' }
        ],
        project: {
            id: 'proj-006',
            name: '质量保证体系',
            code: 'QA'
        },
        epic: {
            id: 'epic-007',
            name: '测试自动化',
            code: 'TEST'
        },
        
        dependencies: {
            blockedBy: ['TASK-008'],
            blocking: [],
            relatedTo: ['TASK-008']
        },
        
        subtasks: [
            {
                id: 'SUB-057',
                title: 'SonarQube配置',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-009',
                estimatedHours: 6,
                actualHours: 0
            },
            {
                id: 'SUB-058',
                title: 'ESLint规则配置',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-001',
                estimatedHours: 4,
                actualHours: 0
            },
            {
                id: 'SUB-059',
                title: 'CI/CD集成',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-009',
                estimatedHours: 6,
                actualHours: 0
            },
            {
                id: 'SUB-060',
                title: '质量报告配置',
                status: TASK_STATUS.TODO.value,
                assignee: 'user-009',
                estimatedHours: 4,
                actualHours: 0
            }
        ],
        
        attachments: [],
        comments: [],
        
        customFields: {
            testingRequired: true,
            securityReviewRequired: false,
            documentationRequired: true,
            customerImpact: 'medium',
            technicalRisk: 'low'
        },
        
        timeEntries: []
    },

    {
        id: 'TASK-015',
        title: '用户行为分析系统',
        description: '开发用户行为分析系统，收集和分析用户在应用中的行为数据，为产品决策提供数据支持。',
        
        type: TASK_TYPE.FEATURE.value,
        status: TASK_STATUS.BACKLOG.value,
        priority: TASK_PRIORITY.LOW.value,
        complexity: TASK_COMPLEXITY.XL.value,
        
        createdAt: '2024-01-27T09:00:00Z',
        updatedAt: '2024-01-27T09:00:00Z',
        dueDate: '2024-06-30T18:00:00Z',
        startDate: null,
        estimatedHours: 120,
        actualHours: 0,
        
        progress: 0,
        completedSubtasks: 0,
        totalSubtasks: 8,
        
        assignee: {
            id: 'user-005',
            name: '钱七',
            role: '数据分析师',
            email: 'qianqi@company.com'
        },
        collaborators: [
            {
                id: 'user-004',
                name: '赵六',
                role: '全栈工程师'
            },
            {
                id: 'user-014',
                name: '王十四',
                role: '产品经理'
            }
        ],
        
        labels: [
            { id: 'label-042', name: '数据分析', color: '#00bcd4' },
            { id: 'label-043', name: '用户行为', color: '#e91e63' },
            { id: 'label-044', name: '产品决策', color: '#ff5722' }
        ],
        project: {
            id: 'proj-012',
            name: '数据驱动产品',
            code: 'DDP'
        },
        epic: {
            id: 'epic-013',
            name: '数据洞察',
            code: 'INSIGHT'
        },
        
        dependencies: {
            blockedBy: [],
            blocking: [],
            relatedTo: ['TASK-009']
        },
        
        subtasks: [
            {
                id: 'SUB-061',
                title: '数据收集方案设计',
                status: TASK_STATUS.BACKLOG.value,
                assignee: 'user-005',
                estimatedHours: 16,
                actualHours: 0
            },
            {
                id: 'SUB-062',
                title: '数据存储架构设计',
                status: TASK_STATUS.BACKLOG.value,
                assignee: 'user-004',
                estimatedHours: 20,
                actualHours: 0
            },
            {
                id: 'SUB-063',
                title: '数据采集SDK开发',
                status: TASK_STATUS.BACKLOG.value,
                assignee: 'user-004',
                estimatedHours: 24,
                actualHours: 0
            },
            {
                id: 'SUB-064',
                title: '数据分析算法开发',
                status: TASK_STATUS.BACKLOG.value,
                assignee: 'user-005',
                estimatedHours: 32,
                actualHours: 0
            },
            {
                id: 'SUB-065',
                title: '可视化仪表板开发',
                status: TASK_STATUS.BACKLOG.value,
                assignee: 'user-004',
                estimatedHours: 20,
                actualHours: 0
            },
            {
                id: 'SUB-066',
                title: '实时数据处理',
                status: TASK_STATUS.BACKLOG.value,
                assignee: 'user-004',
                estimatedHours: 16,
                actualHours: 0
            },
            {
                id: 'SUB-067',
                title: '隐私保护机制',
                status: TASK_STATUS.BACKLOG.value,
                assignee: 'user-007',
                estimatedHours: 8,
                actualHours: 0
            },
            {
                id: 'SUB-068',
                title: '系统测试和优化',
                status: TASK_STATUS.BACKLOG.value,
                assignee: 'user-013',
                estimatedHours: 16,
                actualHours: 0
            }
        ],
        
        attachments: [],
        comments: [],
        
        customFields: {
            testingRequired: true,
            securityReviewRequired: true,
            documentationRequired: true,
            customerImpact: 'high',
            technicalRisk: 'medium'
        },
        
        timeEntries: []
    }
];

/**
 * 团队成员数据
 */
const mockUsers = [
    {
        id: 'user-001',
        name: '张三',
        email: 'zhangsan@company.com',

        role: '前端工程师',
        department: '研发部',
        skills: ['React', 'Vue.js', 'TypeScript', 'CSS3'],
        workload: 85, // 当前工作负载百分比
        timezone: 'Asia/Shanghai',
        status: 'online'
    },
    {
        id: 'user-002',
        name: '李四',
        email: 'lisi@company.com',

        role: '后端工程师',
        department: '研发部',
        skills: ['Node.js', 'Python', 'PostgreSQL', 'Redis'],
        workload: 75,
        timezone: 'Asia/Shanghai',
        status: 'online'
    },
    {
        id: 'user-003',
        name: '王五',
        email: 'wangwu@company.com',

        role: 'UI设计师',
        department: '设计部',
        skills: ['Figma', 'Sketch', 'Principle', 'After Effects'],
        workload: 60,
        timezone: 'Asia/Shanghai',
        status: 'away'
    },
    {
        id: 'user-004',
        name: '赵六',
        email: 'zhaoliu@company.com',

        role: '全栈工程师',
        department: '研发部',
        skills: ['React', 'Node.js', 'MongoDB', 'Docker'],
        workload: 90,
        timezone: 'Asia/Shanghai',
        status: 'busy'
    },
    {
        id: 'user-005',
        name: '钱七',
        email: 'qianqi@company.com',

        role: '数据分析师',
        department: '产品部',
        skills: ['Python', 'R', 'Tableau', 'SQL'],
        workload: 70,
        timezone: 'Asia/Shanghai',
        status: 'online'
    },
    {
        id: 'user-006',
        name: '孙八',
        email: 'sunba@company.com',

        role: 'DBA',
        department: '运维部',
        skills: ['PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch'],
        workload: 55,
        timezone: 'Asia/Shanghai',
        status: 'offline'
    },
    {
        id: 'user-007',
        name: '周九',
        email: 'zhoujiu@company.com',

        role: '安全工程师',
        department: '安全部',
        skills: ['渗透测试', '代码审计', 'OWASP', 'Burp Suite'],
        workload: 80,
        timezone: 'Asia/Shanghai',
        status: 'online'
    },
    {
        id: 'user-008',
        name: '吴十',
        email: 'wushi@company.com',
        role: '架构师',
        department: '架构部',
        skills: ['系统设计', '微服务', '云原生', '性能优化'],
        workload: 65,
        timezone: 'Asia/Shanghai',
        status: 'online'
    },
    {
        id: 'user-009',
        name: '郑十一',
        email: 'zhengshiyi@company.com',
        role: 'DevOps工程师',
        department: '运维部',
        skills: ['Docker', 'Kubernetes', 'Jenkins', 'Terraform'],
        workload: 70,
        timezone: 'Asia/Shanghai',
        status: 'online'
    },
    {
        id: 'user-010',
        name: '孙十二',
        email: 'sunshier@company.com',
        role: '性能测试工程师',
        department: '测试部',
        skills: ['JMeter', 'LoadRunner', '性能分析', '压力测试'],
        workload: 45,
        timezone: 'Asia/Shanghai',
        status: 'online'
    },
    {
        id: 'user-011',
        name: '周十三',
        email: 'zhoushisan@company.com',
        role: '技术文档工程师',
        department: '技术部',
        skills: ['技术写作', 'API文档', '用户手册', 'Markdown'],
        workload: 50,
        timezone: 'Asia/Shanghai',
        status: 'online'
    },
    {
        id: 'user-012',
        name: '王十二',
        email: 'wangshier@company.com',
        role: '前端工程师',
        department: '研发部',
        skills: ['Vue.js', 'React', 'Webpack', 'Node.js'],
        workload: 75,
        timezone: 'Asia/Shanghai',
        status: 'online'
    },
    {
        id: 'user-013',
        name: '李十三',
        email: 'lishisan@company.com',
        role: '测试工程师',
        department: '测试部',
        skills: ['自动化测试', 'Selenium', 'Jest', '测试策略'],
        workload: 60,
        timezone: 'Asia/Shanghai',
        status: 'online'
    },
    {
        id: 'user-014',
        name: '王十四',
        email: 'wangshisi@company.com',
        role: '产品经理',
        department: '产品部',
        skills: ['产品规划', '需求分析', '用户研究', '项目管理'],
        workload: 80,
        timezone: 'Asia/Shanghai',
        status: 'online'
    },
    {
        id: 'user-015',
        name: '赵十五',
        email: 'zhaoshiwu@company.com',
        role: '运维工程师',
        department: '运维部',
        skills: ['Linux', 'Shell脚本', '监控系统', '故障排查'],
        workload: 70,
        timezone: 'Asia/Shanghai',
        status: 'online'
    }
];

/**
 * 项目数据
 */
const mockProjects = [
    {
        id: 'proj-001',
        name: '用户中心升级项目',
        code: 'UUP',
        description: '升级用户中心系统，提升安全性和用户体验',
        status: 'active',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-03-31T23:59:59Z',
        progress: 45,
        budget: 500000,
        spent: 225000,
        owner: 'user-001',
        members: ['user-001', 'user-002', 'user-003', 'user-007']
    },
    {
        id: 'proj-002',
        name: '运维平台开发',
        code: 'OPS',
        description: '开发内部运维管理平台',
        status: 'planning',
        startDate: '2024-02-01T00:00:00Z',
        endDate: '2024-05-31T23:59:59Z',
        progress: 15,
        budget: 300000,
        spent: 45000,
        owner: 'user-004',
        members: ['user-004', 'user-005', 'user-006']
    },
    {
        id: 'proj-003',
        name: '系统性能优化',
        code: 'PERF',
        description: '全面优化系统性能和稳定性',
        status: 'active',
        startDate: '2024-01-10T00:00:00Z',
        endDate: '2024-02-28T23:59:59Z',
        progress: 70,
        budget: 200000,
        spent: 140000,
        owner: 'user-002',
        members: ['user-002', 'user-006']
    },
    {
        id: 'proj-004',
        name: '系统架构重构',
        code: 'ARCH',
        description: '重构系统架构，采用微服务架构模式',
        status: 'planning',
        startDate: '2024-03-01T00:00:00Z',
        endDate: '2024-08-31T23:59:59Z',
        progress: 10,
        budget: 800000,
        spent: 80000,
        owner: 'user-008',
        members: ['user-008', 'user-002', 'user-009']
    },
    {
        id: 'proj-005',
        name: '前端基础设施',
        code: 'FEI',
        description: '建设前端基础设施，包括组件库和工具链',
        status: 'active',
        startDate: '2024-01-20T00:00:00Z',
        endDate: '2024-04-30T23:59:59Z',
        progress: 55,
        budget: 150000,
        spent: 82500,
        owner: 'user-001',
        members: ['user-001', 'user-003', 'user-012']
    },
    {
        id: 'proj-006',
        name: '质量保证体系',
        code: 'QA',
        description: '建立完整的质量保证体系',
        status: 'active',
        startDate: '2024-01-18T00:00:00Z',
        endDate: '2024-03-31T23:59:59Z',
        progress: 75,
        budget: 100000,
        spent: 75000,
        owner: 'user-013',
        members: ['user-013', 'user-002', 'user-001']
    },
    {
        id: 'proj-007',
        name: '产品功能增强',
        code: 'PFE',
        description: '增强产品功能，提升用户参与度',
        status: 'active',
        startDate: '2024-01-25T00:00:00Z',
        endDate: '2024-02-28T23:59:59Z',
        progress: 90,
        budget: 80000,
        spent: 72000,
        owner: 'user-014',
        members: ['user-014', 'user-001', 'user-002']
    },
    {
        id: 'proj-008',
        name: '基础设施现代化',
        code: 'INFRA',
        description: '现代化基础设施，采用容器化和云原生技术',
        status: 'planning',
        startDate: '2024-04-01T00:00:00Z',
        endDate: '2024-09-30T23:59:59Z',
        progress: 5,
        budget: 600000,
        spent: 30000,
        owner: 'user-009',
        members: ['user-009', 'user-006', 'user-015']
    },
    {
        id: 'proj-009',
        name: '技术治理',
        code: 'TECH',
        description: '技术治理和标准制定',
        status: 'active',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        progress: 30,
        budget: 50000,
        spent: 15000,
        owner: 'user-008',
        members: ['user-008', 'user-001', 'user-002']
    },
    {
        id: 'proj-010',
        name: '文档体系建设',
        code: 'DOC',
        description: '建设统一的文档管理体系',
        status: 'active',
        startDate: '2024-02-01T00:00:00Z',
        endDate: '2024-06-30T23:59:59Z',
        progress: 40,
        budget: 30000,
        spent: 12000,
        owner: 'user-011',
        members: ['user-011', 'user-002', 'user-016']
    },
    {
        id: 'proj-011',
        name: '运维优化',
        code: 'OPS',
        description: '运维流程优化和故障排查',
        status: 'active',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        progress: 60,
        budget: 100000,
        spent: 60000,
        owner: 'user-015',
        members: ['user-015', 'user-006', 'user-009']
    },
    {
        id: 'proj-012',
        name: '数据驱动产品',
        code: 'DDP',
        description: '基于数据分析的产品功能开发和优化',
        status: 'planning',
        startDate: '2024-07-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        progress: 5,
        budget: 400000,
        spent: 20000,
        owner: 'user-005',
        members: ['user-005', 'user-004', 'user-014', 'user-007', 'user-013']
    }
];

/**
 * 工作流状态配置
 */
const workflowConfig = {
    'feature': [
        TASK_STATUS.BACKLOG.value,
        TASK_STATUS.TODO.value,
        TASK_STATUS.IN_PROGRESS.value,
        TASK_STATUS.IN_REVIEW.value,
        TASK_STATUS.TESTING.value,
        TASK_STATUS.COMPLETED.value
    ],
    'bug': [
        TASK_STATUS.TODO.value,
        TASK_STATUS.IN_PROGRESS.value,
        TASK_STATUS.IN_REVIEW.value,
        TASK_STATUS.TESTING.value,
        TASK_STATUS.COMPLETED.value,
        TASK_STATUS.CANCELLED.value
    ],
    'improvement': [
        TASK_STATUS.BACKLOG.value,
        TASK_STATUS.TODO.value,
        TASK_STATUS.IN_PROGRESS.value,
        TASK_STATUS.COMPLETED.value
    ]
};

// 全局暴露所有数据和枚举
window.TaskProMockData = {
    mockTasks,
    mockUsers,
    mockProjects,
    mockLabels,
    TASK_PRIORITY,
    TASK_STATUS,
    TASK_TYPE,
    TASK_COMPLEXITY,
    workflowConfig
};

// 同时也暴露到全局变量，便于访问
window.TASK_PRIORITY = TASK_PRIORITY;
window.TASK_STATUS = TASK_STATUS;
window.TASK_TYPE = TASK_TYPE;
window.TASK_COMPLEXITY = TASK_COMPLEXITY;
window.mockLabels = mockLabels;

/**
 * 生成任务统计数据
 */
function generateTaskStatistics() {
    const stats = {
        total: mockTasks.length,
        byStatus: {},
        byPriority: {},
        byType: {},
        byComplexity: {},
        byAssignee: {},
        progress: {
            completed: 0,
            inProgress: 0,
            todo: 0,
            blocked: 0
        },
        timeTracking: {
            totalEstimated: 0,
            totalActual: 0,
            averageProgress: 0
        }
    };

    mockTasks.forEach(task => {
        // 按状态统计
        if (!stats.byStatus[task.status]) {
            stats.byStatus[task.status] = 0;
        }
        stats.byStatus[task.status]++;

        // 按优先级统计
        if (!stats.byPriority[task.priority]) {
            stats.byPriority[task.priority] = 0;
        }
        stats.byPriority[task.priority]++;

        // 按类型统计
        if (!stats.byType[task.type]) {
            stats.byType[task.type] = 0;
        }
        stats.byType[task.type]++;

        // 按复杂度统计
        if (!stats.byComplexity[task.complexity]) {
            stats.byComplexity[task.complexity] = 0;
        }
        stats.byComplexity[task.complexity]++;

        // 按负责人统计
        if (!stats.byAssignee[task.assignee.id]) {
            stats.byAssignee[task.assignee.id] = 0;
        }
        stats.byAssignee[task.assignee.id]++;

        // 进度统计
        if (task.status === 'completed') {
            stats.progress.completed++;
        } else if (['in_progress', 'in_review', 'testing'].includes(task.status)) {
            stats.progress.inProgress++;
        } else if (['todo', 'backlog'].includes(task.status)) {
            stats.progress.todo++;
        } else if (task.status === 'on_hold') {
            stats.progress.blocked++;
        }

        // 时间跟踪统计
        stats.timeTracking.totalEstimated += task.estimatedHours || 0;
        stats.timeTracking.totalActual += task.actualHours || 0;
    });

    // 计算平均进度
    const totalProgress = mockTasks.reduce((sum, task) => sum + (task.progress || 0), 0);
    stats.timeTracking.averageProgress = totalProgress / mockTasks.length;

    return stats;
}

/**
 * 生成用户工作负载统计
 */
function generateUserWorkloadStats() {
    const userStats = {};

    mockUsers.forEach(user => {
        const userTasks = mockTasks.filter(task => 
            task.assignee.id === user.id || 
            task.collaborators.some(collab => collab.id === user.id)
        );

        userStats[user.id] = {
            name: user.name,
            role: user.role,
            totalTasks: userTasks.length,
            completedTasks: userTasks.filter(task => task.status === 'completed').length,
            inProgressTasks: userTasks.filter(task => 
                ['in_progress', 'in_review', 'testing'].includes(task.status)
            ).length,
            estimatedHours: userTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0),
            actualHours: userTasks.reduce((sum, task) => sum + (task.actualHours || 0), 0),
            workload: user.workload,
            status: user.status
        };
    });

    return userStats;
}

/**
 * 生成项目进度统计
 */
function generateProjectProgressStats() {
    const projectStats = {};

    mockProjects.forEach(project => {
        const projectTasks = mockTasks.filter(task => 
            task.project && task.project.id === project.id
        );

        projectStats[project.id] = {
            name: project.name,
            code: project.code,
            totalTasks: projectTasks.length,
            completedTasks: projectTasks.filter(task => task.status === 'completed').length,
            inProgressTasks: projectTasks.filter(task => 
                ['in_progress', 'in_review', 'testing'].includes(task.status)
            ).length,
            totalEstimatedHours: projectTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0),
            totalActualHours: projectTasks.reduce((sum, task) => sum + (task.actualHours || 0), 0),
            progress: project.progress,
            budget: project.budget,
            spent: project.spent,
            status: project.status
        };
    });

    return projectStats;
}

/**
 * 生成时间线数据
 */
function generateTimelineData() {
    const timeline = [];
    
    mockTasks.forEach(task => {
        if (task.startDate) {
            timeline.push({
                id: task.id,
                title: task.title,
                start: task.startDate,
                end: task.dueDate,
                assignee: task.assignee.name,
                status: task.status,
                priority: task.priority,
                type: task.type,
                color: TASK_STATUS[Object.keys(TASK_STATUS).find(key => 
                    TASK_STATUS[key].value === task.status
                )]?.color || '#9e9e9e'
            });
        }
    });

    return timeline.sort((a, b) => new Date(a.start) - new Date(b.start));
}

// 将统计函数也暴露到全局
window.TaskProMockData.generateTaskStatistics = generateTaskStatistics;
window.TaskProMockData.generateUserWorkloadStats = generateUserWorkloadStats;
window.TaskProMockData.generateProjectProgressStats = generateProjectProgressStats;
window.TaskProMockData.generateTimelineData = generateTimelineData;

// 预生成统计数据
window.TaskProMockData.taskStatistics = generateTaskStatistics();
window.TaskProMockData.userWorkloadStats = generateUserWorkloadStats();
window.TaskProMockData.projectProgressStats = generateProjectProgressStats();
window.TaskProMockData.timelineData = generateTimelineData();

