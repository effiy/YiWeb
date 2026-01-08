export const defaultTimeSlots = [
    {
        time: '06:00-06:30',
        name: '起床健康检查',
        mainActivity: '起床、测量身体指标',
        completed: false,
        checklist: [
            { text: '立即起床', completed: false },
            { text: '测量体重体脂', completed: false },
            { text: '测量血压心率', completed: false },
            { text: '记录睡眠质量', completed: false },
            { text: '识别晨间情绪', completed: false },
            { text: '简单伸展5分钟', completed: false }
        ],
        dataFields: [
            { label: '睡眠时长', value: '', placeholder: '____h' },
            { label: '睡眠质量', value: '', placeholder: '⭐⭐⭐⭐⭐' },
            { label: '体重', value: '', placeholder: '____kg' },
            { label: '血压', value: '', placeholder: '____/____' },
            { label: '情绪状态', value: '', placeholder: '____' }
        ],
        phoneReminder: '🌅 新的一天开始！立即起床'
    },
    {
        time: '06:30-07:00',
        name: '早餐与规划',
        mainActivity: '健康早餐、当日规划',
        completed: false,
        checklist: [
            { text: '准备营养早餐', completed: false },
            { text: '蛋白质+碳水+纤维', completed: false },
            { text: '喝一杯温水', completed: false },
            { text: '查看今日日程', completed: false },
            { text: '回顾3个MIT', completed: false },
            { text: '3-5分钟冥想', completed: false }
        ],
        dataFields: [
            { label: '早餐热量', value: '', placeholder: '____千卡' },
            { label: '蛋白质', value: '', placeholder: '____g' },
            { label: '饮水', value: '', placeholder: '____ml' },
            { label: 'MIT任务1', value: '', placeholder: '______' },
            { label: 'MIT任务2', value: '', placeholder: '______' },
            { label: 'MIT任务3', value: '', placeholder: '______' }
        ],
        phoneReminder: '☕ 准备健康早餐 + 规划今日'
    },
    {
        time: '07:00-09:00',
        name: '出门准备',
        mainActivity: '整理、通勤/准备',
        completed: false,
        checklist: [
            { text: '准备物品文件', completed: false },
            { text: '检查钱包手机钥匙', completed: false },
            { text: '整理仪容', completed: false },
            { text: '通勤/整理工作区', completed: false },
            { text: '到达工作地点', completed: false },
            { text: '整理工作环境', completed: false }
        ],
        dataFields: [
            { label: '出门时间', value: '', placeholder: '____' },
            { label: '到达时间', value: '', placeholder: '____' },
            { label: '通勤时长', value: '', placeholder: '____分钟' }
        ],
        phoneReminder: '🚗 准备出门/开始工作'
    },
    {
        time: '09:00-11:00',
        name: '深度工作 #1',
        mainActivity: '专注完成MIT #1',
        completed: false,
        checklist: [
            { text: '关闭手机通知', completed: false },
            { text: '进入专注模式', completed: false },
            { text: '专注完成MIT #1', completed: false },
            { text: '记录干扰次数', completed: false }
        ],
        dataFields: [
            { label: '专注时长', value: '', placeholder: '____h' },
            { label: '被打断', value: '', placeholder: '____次' },
            { label: '完成度', value: '', placeholder: '____%' }
        ],
        phoneReminder: '💼 开始深度工作！关闭通知'
    },
    {
        time: '11:00-11:30',
        name: '深度工作 #2',
        mainActivity: '继续专注工作',
        completed: false,
        checklist: [
            { text: '再次进入专注模式', completed: false },
            { text: '完成MIT #2', completed: false },
            { text: '保持高度专注', completed: false },
            { text: '记录工作进展', completed: false }
        ],
        dataFields: [
            { label: '专注时长', value: '', placeholder: '____h' },
            { label: '被打断', value: '', placeholder: '____次' },
            { label: '完成度', value: '', placeholder: '____%' }
        ],
        phoneReminder: '💼 继续深度工作！'
    },
    {
        time: '11:30-13:00',
        name: '午餐午休',
        mainActivity: '营养午餐、午休恢复',
        completed: false,
        checklist: [
            { text: '营养均衡午餐', completed: false },
            { text: '蔬菜占餐盘1/2', completed: false },
            { text: '优质蛋白质', completed: false },
            { text: '细嚼慢咽', completed: false },
            { text: '记录午餐支出', completed: false },
            { text: '找安静地方休息', completed: false },
            { text: '小睡15-20分钟', completed: false },
            { text: '或冥想放松', completed: false },
            { text: '避免刷手机', completed: false }
        ],
        dataFields: [
            { label: '午餐热量', value: '', placeholder: '____千卡' },
            { label: '蛋白质', value: '', placeholder: '____g' },
            { label: '支出', value: '', placeholder: '¥____' },
            { label: '情绪', value: '', placeholder: '____/10' },
            { label: '午休时长', value: '', placeholder: '____分钟' },
            { label: '午休质量', value: '', placeholder: '⭐⭐⭐⭐⭐' },
            { label: '午休后状态', value: '', placeholder: '____' }
        ],
        phoneReminder: '🍽️ 午餐午休时间！好好享受'
    },
    {
        time: '13:00-14:30',
        name: '深度项目工作',
        mainActivity: '专注项目开发、技术任务',
        completed: false,
        checklist: [
            { text: '关闭所有通知和干扰源', completed: false },
            { text: '进入深度工作状态', completed: false },
            { text: '专注完成核心项目任务', completed: false },
            { text: '编写/调试代码', completed: false },
            { text: '技术文档整理', completed: false },
            { text: '代码审查和优化', completed: false },
            { text: '记录技术难点和解决方案', completed: false },
            { text: '每30分钟检查进度', completed: false }
        ],
        dataFields: [
            { label: '专注时长', value: '', placeholder: '____h' },
            { label: '代码行数', value: '', placeholder: '____行' },
            { label: '完成任务', value: '', placeholder: '____个' },
            { label: '技术突破', value: '', placeholder: '____个' },
            { label: '代码质量', value: '', placeholder: '⭐⭐⭐⭐⭐' },
            { label: '专注度', value: '', placeholder: '____/10' },
            { label: '被打断次数', value: '', placeholder: '____次' }
        ],
        phoneReminder: '💻 深度项目工作！专注编程'
    },
    {
        time: '14:30-14:45',
        name: '下午茶休息',
        mainActivity: '补充能量、放松',
        completed: false,
        checklist: [
            { text: '离开座位活动', completed: false },
            { text: '做眼保健操', completed: false },
            { text: '喝水/茶250-300ml', completed: false },
            { text: '健康小零食', completed: false },
            { text: '检查情绪压力', completed: false }
        ],
        dataFields: [
            { label: '饮水', value: '', placeholder: '____ml' },
            { label: '零食热量', value: '', placeholder: '____千卡' },
            { label: '情绪', value: '', placeholder: '____/10' },
            { label: '压力', value: '', placeholder: '____/10' }
        ],
        phoneReminder: '☕ 下午茶时间！补充能量'
    },
    {
        time: '14:45-17:00',
        name: '协作与学习',
        mainActivity: '团队协作、知识分享、技能提升',
        completed: false,
        checklist: [
            { text: '参加团队会议和讨论', completed: false },
            { text: '代码审查和同行评审', completed: false },
            { text: '技术分享和知识传递', completed: false },
            { text: '学习新技术或框架', completed: false },
            { text: '阅读技术文章/文档', completed: false },
            { text: '回复重要邮件和消息', completed: false },
            { text: '处理紧急任务和问题', completed: false },
            { text: '记录学习心得和收获', completed: false },
            { text: '规划明日技术任务', completed: false }
        ],
        dataFields: [
            { label: '会议时长', value: '', placeholder: '____h' },
            { label: '代码审查', value: '', placeholder: '____个' },
            { label: '阅读文章', value: '', placeholder: '____篇' },
            { label: '学习时长', value: '', placeholder: '____h' },
            { label: '新技能点', value: '', placeholder: '______' }
        ],
        phoneReminder: '🤝 团队协作与学习时间'
    },
    {
        time: '17:00-18:00',
        name: '收尾与总结',
        mainActivity: '整理代码、提交记录、日报',
        completed: false,
        checklist: [
            { text: '提交今日所有代码', completed: false },
            { text: '清理临时文件和分支', completed: false },
            { text: '更新任务状态和进度', completed: false },
            { text: '编写工作日报/日志', completed: false },
            { text: '整理明日待办事项', completed: false },
            { text: '清理桌面和关闭电脑', completed: false }
        ],
        dataFields: [
            { label: '代码提交', value: '', placeholder: '____次' },
            { label: '完成任务', value: '', placeholder: '____个' },
            { label: '遗留问题', value: '', placeholder: '____个' },
            { label: '明日计划', value: '', placeholder: '____项' },
            { label: '今日满意度', value: '', placeholder: '____/10' }
        ],
        phoneReminder: '📝 工作收尾！记录今日成果'
    }
];
