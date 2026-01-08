export const defaultTimeSlots = {
    '13:00-14:30': {
        name: '深度项目工作',
        icon: '💻',
        description: '专注项目开发、技术任务',
        tasks: [
            '关闭所有通知和干扰源',
            '进入深度工作状态',
            '专注完成核心项目任务',
            '编写/调试代码',
            '技术文档整理',
            '代码审查和优化',
            '记录技术难点和解决方案',
            '每30分钟检查进度'
        ],
        trackingMetrics: {
            focusDuration: { label: '专注时长', unit: 'h', type: 'number' },
            codeLines: { label: '代码行数', unit: '行', type: 'number' },
            tasksCompleted: { label: '完成任务', unit: '个', type: 'number' },
            techBreakthroughs: { label: '技术突破', unit: '个', type: 'number' },
            codeQuality: { label: '代码质量', unit: '⭐', type: 'rating', max: 5 },
            focusLevel: { label: '专注度', unit: '/10', type: 'rating', max: 10 },
            interruptions: { label: '被打断次数', unit: '次', type: 'number' }
        },
        reminder: '💻 深度项目工作！专注编程'
    },
    '14:45-17:00': {
        name: '协作与学习',
        icon: '👥📚',
        description: '团队协作、知识分享、技能提升',
        tasks: [
            '参加团队会议和讨论',
            '代码审查和同行评审',
            '技术分享和知识传递',
            '学习新技术或框架',
            '阅读技术文章/文档',
            '回复重要邮件和消息',
            '处理紧急任务和问题',
            '记录学习心得和收获',
            '规划明日技术任务'
        ],
        trackingMetrics: {
            meetingDuration: { label: '会议时长', unit: 'h', type: 'number' },
            codeReviews: { label: '代码审查', unit: '个', type: 'number' },
            learningContent: { label: '学习内容', unit: '', type: 'text' },
            knowledgeShares: { label: '知识分享', unit: '次', type: 'number' },
            emailsProcessed: { label: '邮件处理', unit: '封', type: 'number' },
            learningDuration: { label: '学习时长', unit: 'h', type: 'number' },
            skillImprovement: { label: '技能提升', unit: '⭐', type: 'rating', max: 5 },
            collaborationEfficiency: { label: '协作效率', unit: '/10', type: 'rating', max: 10 }
        },
        reminder: '👥📚 协作学习时间！团队成长'
    }
};
