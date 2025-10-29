// 优化版每日清单组件
// 作者：liangliang

console.log('[OptimizedDailyChecklist] 开始加载优化版每日清单组件...');

// 加载CSS文件
if (typeof window !== 'undefined' && window.loadCSSFiles) {
    window.loadCSSFiles([
        '/views/news/plugins/dailyChecklist/index.css'
    ]);
} else {
    // 如果loadCSSFiles不可用，直接创建link标签
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/views/news/plugins/dailyChecklist/index.css';
    link.type = 'text/css';
    document.head.appendChild(link);
}

// 创建优化的组件定义
const OptimizedDailyChecklist = {
    name: 'DailyChecklist',
    props: {
        activeCategory: {
            type: String,
            default: 'all'
        },
        currentDateDisplay: {
            type: String,
            default: ''
        },
        currentDateSubtitle: {
            type: String,
            default: ''
        }
    },
        data() {
            return {
                loading: false,
                error: null,
                showEditModal: false,
                editingSlot: null,
                editingIndex: -1,
                tempDateString: null,
                saveTimeout: null,
            timeSlots: [
                {
                    time: '06:00-06:30',
                    name: '起床健康检查',
                    mainActivity: '起床、测量身体指标',
                    completed: false,
                    isCurrent: false,
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
                    isCurrent: false,
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
                    isCurrent: false,
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
                    isCurrent: false,
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
                    isCurrent: false,
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
                    isCurrent: false,
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
                    isCurrent: false,
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
                    isCurrent: false,
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
                    isCurrent: false,
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
                        { label: '学习内容', value: '', placeholder: '____' },
                        { label: '知识分享', value: '', placeholder: '____次' },
                        { label: '邮件处理', value: '', placeholder: '____封' },
                        { label: '学习时长', value: '', placeholder: '____h' },
                        { label: '技能提升', value: '', placeholder: '⭐⭐⭐⭐⭐' },
                        { label: '协作效率', value: '', placeholder: '____/10' }
                    ],
                    phoneReminder: '👥📚 协作学习时间！团队成长'
                },
                {
                    time: '17:00-17:30',
                    name: '工作总结',
                    mainActivity: '总结、明日准备',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '回顾MIT完成情况', completed: false },
                        { text: '总结工作成果', completed: false },
                        { text: '记录时间数据', completed: false },
                        { text: '整理工作区', completed: false },
                        { text: '规划明日3个MIT', completed: false }
                    ],
                    dataFields: [
                        { label: '工作总时长', value: '', placeholder: '____h' },
                        { label: '专注时长', value: '', placeholder: '____h' },
                        { label: '时间利用率', value: '', placeholder: '____%' },
                        { label: 'MIT完成', value: '', placeholder: '____/3' }
                    ],
                    phoneReminder: '📝 今日工作总结时间'
                },
                {
                    time: '17:30-18:00',
                    name: '晚餐时间',
                    mainActivity: '清淡晚餐、记账',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '清淡易消化晚餐', completed: false },
                        { text: '减少主食', completed: false },
                        { text: '蔬菜占2/3', completed: false },
                        { text: '18:00前完成', completed: false },
                        { text: '记录晚餐支出', completed: false }
                    ],
                    dataFields: [
                        { label: '晚餐热量', value: '', placeholder: '____千卡' },
                        { label: '蛋白质', value: '', placeholder: '____g' },
                        { label: '支出', value: '', placeholder: '¥____' },
                        { label: '今日总热量', value: '', placeholder: '____千卡' }
                    ],
                    phoneReminder: '🍽️ 晚餐时间！清淡饮食'
                },
                {
                    time: '18:00-19:30',
                    name: '运动健身',
                    mainActivity: '按周计划运动',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '周一/三/五：力量训练', completed: false },
                        { text: '周二/四：有氧运动', completed: false },
                        { text: '周六：户外活动', completed: false },
                        { text: '周日：休息/轻度活动', completed: false }
                    ],
                    dataFields: [
                        { label: '运动类型', value: '', placeholder: '____' },
                        { label: '时长', value: '', placeholder: '____分钟' },
                        { label: '强度', value: '', placeholder: '____' },
                        { label: '心率', value: '', placeholder: '____bpm' },
                        { label: '卡路里', value: '', placeholder: '____千卡' },
                        { label: '步数', value: '', placeholder: '____步' }
                    ],
                    phoneReminder: '🏃 运动时间！动起来'
                },
                {
                    time: '19:30-21:30',
                    name: '通勤回家与学习阅读',
                    mainActivity: '通勤回家、学习阅读',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '整理工作物品', completed: false },
                        { text: '通勤回家', completed: false },
                        { text: '到达家中', completed: false },
                        { text: '个人学习/阅读', completed: false },
                        { text: '专业书籍阅读', completed: false },
                        { text: '技能提升学习', completed: false },
                        { text: '知识笔记整理', completed: false },
                        { text: '学习反思总结', completed: false }
                    ],
                    dataFields: [
                        { label: '通勤时长', value: '', placeholder: '____分钟' },
                        { label: '学习时长', value: '', placeholder: '____分钟' },
                        { label: '阅读时长', value: '', placeholder: '____分钟' },
                        { label: '学习内容', value: '', placeholder: '____' },
                        { label: '阅读页数', value: '', placeholder: '____页' }
                    ],
                    phoneReminder: '🚗📚 通勤回家 + 学习阅读'
                },
                {
                    time: '21:30-22:00',
                    name: '每日回顾',
                    mainActivity: '全面数据记录',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '记录所有收支', completed: false },
                        { text: '记录时间数据', completed: false },
                        { text: '记录健康数据', completed: false },
                        { text: '记录情绪压力', completed: false },
                        { text: '每日反思三问', completed: false },
                        { text: '感恩日记3件事', completed: false }
                    ],
                    dataFields: [
                        { label: '收支记录', value: '', placeholder: '详见每日回顾表' }
                    ],
                    phoneReminder: '📊 每日回顾时间！记录今天'
                },
                {
                    time: '22:00-22:30',
                    name: '明日准备',
                    mainActivity: '准备物品、规划',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '查看明天日程', completed: false },
                        { text: '确认明天MIT', completed: false },
                        { text: '准备衣物物品', completed: false },
                        { text: '整理工作区家居', completed: false },
                        { text: '设置闹钟', completed: false }
                    ],
                    dataFields: [
                        { label: '明日事项', value: '', placeholder: '____个' },
                        { label: '明日MIT1', value: '', placeholder: '______' },
                        { label: '明日MIT2', value: '', placeholder: '______' },
                        { label: '明日MIT3', value: '', placeholder: '______' }
                    ],
                    phoneReminder: '🎒 准备明天！从容开始'
                },
                {
                    time: '22:30-23:00',
                    name: '睡前仪式',
                    mainActivity: '放松、准备睡眠',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '洗漱护肤', completed: false },
                        { text: '调节卧室环境', completed: false },
                        { text: '阅读纸质书15-20分钟', completed: false },
                        { text: '冥想5-10分钟', completed: false },
                        { text: '23:00准时上床', completed: false }
                    ],
                    dataFields: [
                        { label: '阅读时长', value: '', placeholder: '____分钟' },
                        { label: '冥想时长', value: '', placeholder: '____分钟' },
                        { label: '上床时间', value: '', placeholder: '____' }
                    ],
                    phoneReminder: '📖 睡前仪式！准备休息'
                },
                {
                    time: '23:00-06:00',
                    name: '优质睡眠',
                    mainActivity: '睡眠恢复',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '23:00准时熄灯', completed: false },
                        { text: '放下电子设备', completed: false },
                        { text: '深呼吸放松', completed: false },
                        { text: '保证7小时睡眠', completed: false }
                    ],
                    dataFields: [
                        { label: '入睡时间', value: '', placeholder: '____' },
                        { label: '目标睡眠', value: '', placeholder: '7h' }
                    ],
                    phoneReminder: '😴 就寝时间！晚安'
                }
            ]
        };
    },
    computed: {
        totalCount() {
            return this.timeSlots.reduce((total, slot) => total + slot.checklist.length, 0);
        },
        completedCount() {
            return this.timeSlots.reduce((total, slot) => {
                return total + slot.checklist.filter(item => item.completed).length;
            }, 0);
        },
        completionRate() {
            return this.totalCount > 0 ? (this.completedCount / this.totalCount) * 100 : 0;
        },
        currentTimeSlot() {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            
            return this.timeSlots.find(slot => {
                try {
                    if (!slot || !slot.time || typeof slot.time !== 'string') {
                        return false;
                    }
                    
                    const timeParts = slot.time.split('-');
                    if (!timeParts || timeParts.length < 2) {
                        return false;
                    }
                    
                    const startTimeStr = timeParts[0];
                    const endTimeStr = timeParts[1];
                    
                    if (!startTimeStr || !endTimeStr) {
                        return false;
                    }
                    
                    const startParts = startTimeStr.split(':').map(Number);
                    const endParts = endTimeStr.split(':').map(Number);
                    
                    if (!startParts || startParts.length < 2 || !endParts || endParts.length < 2) {
                        return false;
                    }
                    
                    const [startHour, startMin] = startParts;
                    const [endHour, endMin] = endParts;
                    
                    if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
                        return false;
                    }
                    
                    const startMinutes = startHour * 60 + startMin;
                    const endMinutes = endHour * 60 + endMin;
                    
                    // 处理跨天的情况
                    if (endMinutes < startMinutes) {
                        return currentTime >= startMinutes || currentTime <= endMinutes;
                    }
                    
                    return currentTime >= startMinutes && currentTime <= endMinutes;
                } catch (error) {
                    console.error('[DailyChecklist] currentTimeSlot 计算错误:', error, slot);
                    return false;
                }
            });
        },
        // 优化后的时间段排序：当天当前时段优先，其他按时间顺序连贯排列
        sortedTimeSlots() {
            // 检查是否为今天
            const today = new Date();
            const currentDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const isToday = this.currentDateSubtitle === currentDateStr;
            
            if (!isToday) {
                // 非今天，保持原始顺序
                return this.timeSlots;
            }
            
            // 今天，将当前时段排到第一位，其他时段按时间顺序连贯排列
            const currentSlot = this.currentTimeSlot;
            if (!currentSlot) {
                // 没有当前时段，保持原始顺序
                return this.timeSlots;
            }
            
            // 找到当前时段的索引
            const currentIndex = this.timeSlots.findIndex(slot => slot.time === currentSlot.time);
            if (currentIndex === -1) {
                return this.timeSlots;
            }
            
            // 创建新的排序数组
            const sortedSlots = [];
            
            // 1. 首先添加当前时段
            sortedSlots.push(this.timeSlots[currentIndex]);
            
            // 2. 添加当前时段之后的所有时段（按原始顺序）
            for (let i = currentIndex + 1; i < this.timeSlots.length; i++) {
                sortedSlots.push(this.timeSlots[i]);
            }
            
            // 3. 添加当前时段之前的所有时段（按原始顺序）
            for (let i = 0; i < currentIndex; i++) {
                sortedSlots.push(this.timeSlots[i]);
            }
            
            return sortedSlots;
        },
        // 时间流说明
        timeFlowDescription() {
            const today = new Date();
            const currentDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const isToday = this.currentDateSubtitle === currentDateStr;
            
            if (!isToday) {
                return '按时间顺序排列';
            }
            
            const currentSlot = this.currentTimeSlot;
            if (!currentSlot) {
                return '按时间顺序排列';
            }
            
            return `从当前时段开始，按时间流排列`;
        }
    },
    watch: {
        // 监听日期变化，自动加载对应日期的数据
        async currentDateSubtitle(newDate, oldDate) {
            if (newDate && newDate !== oldDate) {
                console.log('[DailyChecklist] 检测到日期prop变化:', oldDate, '->', newDate);
                
                // 先保存旧日期的数据（如果有未保存的更改）
                if (oldDate && this.saveTimeout) {
                    console.log('[DailyChecklist] 保存旧日期数据:', oldDate);
                    // 临时设置为旧日期以确保保存到正确的日期
                    const savedTempDate = this.tempDateString;
                    this.tempDateString = oldDate;
                    await this.forceSave();
                    this.tempDateString = savedTempDate;
                }
                
                // 加载新日期的数据
                this.tempDateString = newDate;
                await this.loadFromAPI();
                this.initializeCurrentTimeSlot();
            }
        }
    },
    methods: {
        // 获取原始索引（从排序后的索引转换为原始索引）
        getOriginalIndex(sortedIndex) {
            if (sortedIndex >= this.sortedTimeSlots.length) {
                return sortedIndex;
            }
            
            const sortedSlot = this.sortedTimeSlots[sortedIndex];
            if (!sortedSlot) {
                return sortedIndex;
            }
            
            // 根据时间段名称找到原始索引
            const originalIndex = this.timeSlots.findIndex(slot => slot.time === sortedSlot.time);
            return originalIndex !== -1 ? originalIndex : sortedIndex;
        },
        
        // 初始化当前时段状态
        initializeCurrentTimeSlot() {
            this.timeSlots.forEach(slot => {
                slot.isCurrent = false;
            });
            
            const currentSlot = this.currentTimeSlot;
            if (currentSlot) {
                currentSlot.isCurrent = true;
            }
        },
        
        // 切换时段完成状态
        async toggleTimeSlot(index) {
            const originalIndex = this.getOriginalIndex(index);
            this.timeSlots[originalIndex].completed = !this.timeSlots[originalIndex].completed;
            await this.saveToAPI();
            this.showSuccessMessage(`时段 ${this.timeSlots[originalIndex].name} ${this.timeSlots[originalIndex].completed ? '已完成' : '未完成'}`);
        },
        
        // 更新清单项目
        async updateItem(slotIndex, itemIndex) {
            const originalIndex = this.getOriginalIndex(slotIndex);
            await this.saveToAPI();
            const item = this.timeSlots[originalIndex].checklist[itemIndex];
            this.showSuccessMessage(`项目 ${item.text} ${item.completed ? '已完成' : '未完成'}`);
        },
        
        // 更新数据字段
        async updateDataField(slotIndex, fieldIndex) {
            const originalIndex = this.getOriginalIndex(slotIndex);
            console.log('[DailyChecklist] 数据字段已更新:', {
                slotIndex,
                originalIndex,
                fieldIndex,
                value: this.timeSlots[originalIndex].dataFields[fieldIndex].value
            });
            await this.saveToAPI();
        },
        
        // 数据字段输入事件
        async onDataFieldInput(slotIndex, fieldIndex, event) {
            // 实时更新数据
            const originalIndex = this.getOriginalIndex(slotIndex);
            this.timeSlots[originalIndex].dataFields[fieldIndex].value = event.target.value;
            console.log('[DailyChecklist] 数据字段输入:', {
                slotIndex,
                originalIndex,
                fieldIndex,
                value: event.target.value
            });
        },
        
        // 数据字段变化事件（实时保存）
        async onDataFieldChange(slotIndex, fieldIndex, event) {
            // 确保数据已更新
            const originalIndex = this.getOriginalIndex(slotIndex);
            this.timeSlots[originalIndex].dataFields[fieldIndex].value = event.target.value;
            console.log('[DailyChecklist] 数据字段变化:', {
                slotIndex,
                originalIndex,
                fieldIndex,
                value: event.target.value
            });
            // 延迟保存，避免频繁API调用
            this.debouncedSave();
        },
        
        // 防抖保存
        debouncedSave() {
            // 清除之前的定时器
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
            }
            
            // 设置新的定时器，1秒后保存
            this.saveTimeout = setTimeout(async () => {
                try {
                    await this.saveToAPI();
                    console.log('[DailyChecklist] 防抖保存完成');
                } catch (error) {
                    console.error('[DailyChecklist] 防抖保存失败:', error);
                }
            }, 1000);
        },
        
        // 强制保存
        async forceSave() {
            try {
                // 清除防抖定时器
                if (this.saveTimeout) {
                    clearTimeout(this.saveTimeout);
                }
                
                // 立即保存
                await this.saveToAPI();
                console.log('[DailyChecklist] 强制保存完成');
            } catch (error) {
                console.error('[DailyChecklist] 强制保存失败:', error);
            }
        },
        
        // 编辑时段
        editTimeSlot(index) {
            const originalIndex = this.getOriginalIndex(index);
            this.editingIndex = originalIndex;
            this.editingSlot = JSON.parse(JSON.stringify(this.timeSlots[originalIndex]));
            this.showEditModal = true;
        },
        
        // 保存编辑
        async saveEdit() {
            if (this.editingIndex >= 0 && this.editingSlot) {
                this.timeSlots[this.editingIndex] = { ...this.editingSlot };
                await this.saveToAPI();
                this.showSuccessMessage('时段信息已保存');
            }
            this.closeEditModal();
        },
        
        // 关闭编辑弹窗
        closeEditModal() {
            this.showEditModal = false;
            this.editingSlot = null;
            this.editingIndex = -1;
        },
        
        
        // 刷新数据
        async handleRefresh() {
            await this.loadFromAPI();
            this.initializeCurrentTimeSlot();
            this.showSuccessMessage('数据已刷新');
        },
        
        // 处理日期变化
        async handleDateChange(event) {
            console.log('[DailyChecklist] 日期变化事件，重新加载数据', event.detail);
            
            // 保存旧日期（如果有未保存的更改）
            if (this.saveTimeout) {
                const oldDateStr = this.tempDateString || this.currentDateSubtitle;
                console.log('[DailyChecklist] 日期变化前保存旧日期数据:', oldDateStr);
                await this.forceSave();
            }
            
            // 更新为新日期
            if (event.detail && event.detail.dateString) {
                console.log('[DailyChecklist] 切换到新日期:', event.detail.dateString);
                // 临时更新currentDateSubtitle用于API调用
                this.tempDateString = event.detail.dateString;
            }
            
            // 加载新日期的数据
            await this.loadFromAPI();
            this.initializeCurrentTimeSlot();
        },
        
        // 处理数据刷新事件
        async handleReload(event) {
            console.log('[DailyChecklist] 收到数据刷新事件', event.detail);
            if (event.detail && event.detail.dateStr) {
                this.tempDateString = event.detail.dateStr;
            }
            await this.loadFromAPI();
            this.initializeCurrentTimeSlot();
        },
        
        // 保存到API
        async saveToAPI() {
            try {
                // 使用与loadFromAPI相同的日期获取逻辑
                let dateStr = this.tempDateString || this.currentDateSubtitle;
                if (!dateStr) {
                    const today = new Date();
                    dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                }
                
                console.log('[DailyChecklist] 准备保存数据，日期:', dateStr);
                
                const data = {
                    date: dateStr,
                    timeSlots: this.timeSlots,
                    completedCount: this.completedCount,
                    totalCount: this.totalCount,
                    completionRate: this.completionRate,
                    lastUpdated: new Date().toISOString()
                };
                
                console.log('[DailyChecklist] 保存数据摘要:', {
                    date: data.date,
                    timeSlotsCount: data.timeSlots.length,
                    completedCount: data.completedCount,
                    totalCount: data.totalCount,
                    completionRate: data.completionRate,
                    lastUpdated: data.lastUpdated
                });
                
                // 使用 postData 函数，与 comments 保持一致
                const { postData } = await import('/apis/modules/crud.js');
                const result = await postData(`${window.API_URL}/mongodb/?cname=dailyChecklist`, data);
                
                console.log('[DailyChecklist] 数据保存到API成功:', result);
                
                // 注意：保存成功后不需要重新加载数据，因为本地数据已经是最新的
                // 移除了触发 reloadDailyChecklist 事件，避免不必要的API调用和潜在的数据不同步问题
                
                return true;
            } catch (error) {
                console.error('[DailyChecklist] 保存数据到API失败:', error);
                this.error = '保存数据失败: ' + error.message;
                return false;
            }
        },
        
        // 从API加载数据
        async loadFromAPI() {
            try {
                this.loading = true;
                this.error = null;
                
                // 优先使用临时日期字符串（来自日期变化事件），然后是props中的currentDateSubtitle，最后使用今天的日期
                let dateStr = this.tempDateString || this.currentDateSubtitle;
                if (!dateStr) {
                    const today = new Date();
                    dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                }
                
                console.log('[DailyChecklist] 加载日期:', dateStr);
                
                // 使用 getData 函数，与 comments 保持一致
                // 使用日期范围查询格式，与其他组件（comments、rss）保持一致
                const { getData } = await import('/apis/index.js');
                const url = `${window.API_URL}/mongodb/?cname=dailyChecklist&date=${dateStr},${dateStr}`;
                const res = await getData(url, { method: 'GET' }, false);
                
                // 参考 comments 的数据解析逻辑
                let list = [];
                if (res && res.data && Array.isArray(res.data.list)) {
                    list = res.data.list;
                } else if (Array.isArray(res)) {
                    list = res;
                } else if (res && Array.isArray(res.data)) {
                    list = res.data;
                }
                
                // 检查是否有有效数据
                if (list && list.length > 0) {
                    // 按最后更新时间排序，获取最新的数据
                    const sortedList = list.sort((a, b) => {
                        const timeA = new Date(a.lastUpdated || a.date || 0).getTime();
                        const timeB = new Date(b.lastUpdated || b.date || 0).getTime();
                        return timeB - timeA;
                    });
                    
                    const savedData = sortedList[0];
                    console.log('[DailyChecklist] 找到数据记录数:', list.length, '，使用最新记录，更新时间:', savedData.lastUpdated);
                    
                    if (savedData.timeSlots && savedData.timeSlots.length >= 16) {
                        // 使用API返回的数据
                        this.timeSlots = savedData.timeSlots;
                        console.log('[DailyChecklist] 从API加载数据成功，使用保存的数据');
                        return true;
                    } else {
                        console.warn('[DailyChecklist] 数据不完整，timeSlots数量:', savedData.timeSlots ? savedData.timeSlots.length : 0);
                    }
                }
                
                // API没有数据或数据不完整，使用默认数据
                console.log('[DailyChecklist] API无数据或数据不完整，使用默认数据');
                this.useDefaultData();
                return false;
                
            } catch (error) {
                console.error('[DailyChecklist] 从API加载数据失败:', error);
                this.error = '加载数据失败: ' + error.message;
                // API调用失败，使用默认数据
                console.log('[DailyChecklist] API调用失败，使用默认数据');
                this.useDefaultData();
                return false;
            } finally {
                this.loading = false;
                // 清除临时日期字符串
                this.tempDateString = null;
            }
        },
        
        // 判断是否为周末
        isWeekend(dateStr) {
            const date = dateStr ? new Date(dateStr) : new Date();
            const dayOfWeek = date.getDay();
            return dayOfWeek === 0 || dayOfWeek === 6; // 0=周日, 6=周六
        },
        
        // 获取星期几
        getDayOfWeek(dateStr) {
            const date = dateStr ? new Date(dateStr) : new Date();
            return date.getDay(); // 0=周日, 1=周一, ..., 6=周六
        },
        
        // 使用默认数据
        useDefaultData() {
            // 根据日期判断是工作日还是周末
            const dateStr = this.tempDateString || this.currentDateSubtitle;
            const dayOfWeek = this.getDayOfWeek(dateStr);
            
            // 周六使用周六时间表，周日使用周日时间表
            if (dayOfWeek === 6) {
                console.log('[DailyChecklist] 使用周六时间表');
                this.timeSlots = this.getSaturdayTimeSlots();
            } else if (dayOfWeek === 0) {
                console.log('[DailyChecklist] 使用周日时间表');
                this.timeSlots = this.getSundayTimeSlots();
            } else {
                console.log('[DailyChecklist] 使用工作日时间表');
                this.timeSlots = this.getWeekdayTimeSlots();
            }
        },
        
        // 工作日时间表
        getWeekdayTimeSlots() {
            return [
                {
                    time: '06:00-06:30',
                    name: '起床健康检查',
                    mainActivity: '起床、测量身体指标',
                    completed: false,
                    isCurrent: false,
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
                    isCurrent: false,
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
                    isCurrent: false,
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
                    time: '09:00-11:30',
                    name: '深度工作时段',
                    mainActivity: '专注完成MIT任务',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '关闭手机通知', completed: false },
                        { text: '进入专注模式', completed: false },
                        { text: '专注完成MIT #1', completed: false },
                        { text: '记录干扰次数', completed: false },
                        { text: '再次进入专注模式', completed: false },
                        { text: '完成MIT #2', completed: false },
                        { text: '保持高度专注', completed: false },
                        { text: '记录工作进展', completed: false }
                    ],
                    dataFields: [
                        { label: '专注时长', value: '', placeholder: '____h' },
                        { label: '被打断', value: '', placeholder: '____次' },
                        { label: 'MIT1完成度', value: '', placeholder: '____%' },
                        { label: 'MIT2完成度', value: '', placeholder: '____%' },
                        { label: '整体效率', value: '', placeholder: '____%' }
                    ],
                    phoneReminder: '💼 深度工作时段！关闭通知，保持专注'
                },
                {
                    time: '11:30-13:00',
                    name: '午餐午休',
                    mainActivity: '营养午餐、午休恢复',
                    completed: false,
                    isCurrent: false,
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
                    isCurrent: false,
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
                    isCurrent: false,
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
                    isCurrent: false,
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
                        { label: '学习内容', value: '', placeholder: '____' },
                        { label: '知识分享', value: '', placeholder: '____次' },
                        { label: '邮件处理', value: '', placeholder: '____封' },
                        { label: '学习时长', value: '', placeholder: '____h' },
                        { label: '技能提升', value: '', placeholder: '⭐⭐⭐⭐⭐' },
                        { label: '协作效率', value: '', placeholder: '____/10' }
                    ],
                    phoneReminder: '👥📚 协作学习时间！团队成长'
                },
                {
                    time: '17:00-17:30',
                    name: '工作总结',
                    mainActivity: '总结、明日准备',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '回顾MIT完成情况', completed: false },
                        { text: '总结工作成果', completed: false },
                        { text: '记录时间数据', completed: false },
                        { text: '整理工作区', completed: false },
                        { text: '规划明日3个MIT', completed: false }
                    ],
                    dataFields: [
                        { label: '工作总时长', value: '', placeholder: '____h' },
                        { label: '专注时长', value: '', placeholder: '____h' },
                        { label: '时间利用率', value: '', placeholder: '____%' },
                        { label: 'MIT完成', value: '', placeholder: '____/3' }
                    ],
                    phoneReminder: '📝 今日工作总结时间'
                },
                {
                    time: '17:30-18:00',
                    name: '晚餐时间',
                    mainActivity: '清淡晚餐、记账',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '清淡易消化晚餐', completed: false },
                        { text: '减少主食', completed: false },
                        { text: '蔬菜占2/3', completed: false },
                        { text: '18:00前完成', completed: false },
                        { text: '记录晚餐支出', completed: false }
                    ],
                    dataFields: [
                        { label: '晚餐热量', value: '', placeholder: '____千卡' },
                        { label: '蛋白质', value: '', placeholder: '____g' },
                        { label: '支出', value: '', placeholder: '¥____' },
                        { label: '今日总热量', value: '', placeholder: '____千卡' }
                    ],
                    phoneReminder: '🍽️ 晚餐时间！清淡饮食'
                },
                {
                    time: '18:00-19:30',
                    name: '运动健身',
                    mainActivity: '按周计划运动',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '周一/三/五：力量训练', completed: false },
                        { text: '周二/四：有氧运动', completed: false },
                        { text: '周六：户外活动', completed: false },
                        { text: '周日：休息/轻度活动', completed: false }
                    ],
                    dataFields: [
                        { label: '运动类型', value: '', placeholder: '____' },
                        { label: '时长', value: '', placeholder: '____分钟' },
                        { label: '强度', value: '', placeholder: '____' },
                        { label: '心率', value: '', placeholder: '____bpm' },
                        { label: '卡路里', value: '', placeholder: '____千卡' },
                        { label: '步数', value: '', placeholder: '____步' }
                    ],
                    phoneReminder: '🏃 运动时间！动起来'
                },
                {
                    time: '19:30-21:30',
                    name: '通勤回家与学习阅读',
                    mainActivity: '通勤回家、学习阅读',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '整理工作物品', completed: false },
                        { text: '通勤回家', completed: false },
                        { text: '到达家中', completed: false },
                        { text: '个人学习/阅读', completed: false },
                        { text: '专业书籍阅读', completed: false },
                        { text: '技能提升学习', completed: false },
                        { text: '知识笔记整理', completed: false },
                        { text: '学习反思总结', completed: false }
                    ],
                    dataFields: [
                        { label: '通勤时长', value: '', placeholder: '____分钟' },
                        { label: '学习时长', value: '', placeholder: '____分钟' },
                        { label: '阅读时长', value: '', placeholder: '____分钟' },
                        { label: '学习内容', value: '', placeholder: '____' },
                        { label: '阅读页数', value: '', placeholder: '____页' }
                    ],
                    phoneReminder: '🚗📚 通勤回家 + 学习阅读'
                },
                {
                    time: '21:30-22:00',
                    name: '每日回顾',
                    mainActivity: '全面数据记录',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '记录所有收支', completed: false },
                        { text: '记录时间数据', completed: false },
                        { text: '记录健康数据', completed: false },
                        { text: '记录情绪压力', completed: false },
                        { text: '每日反思三问', completed: false },
                        { text: '感恩日记3件事', completed: false }
                    ],
                    dataFields: [
                        { label: '收支记录', value: '', placeholder: '详见每日回顾表' }
                    ],
                    phoneReminder: '📊 每日回顾时间！记录今天'
                },
                {
                    time: '22:00-22:30',
                    name: '明日准备',
                    mainActivity: '准备物品、规划',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '查看明天日程', completed: false },
                        { text: '确认明天MIT', completed: false },
                        { text: '准备衣物物品', completed: false },
                        { text: '整理工作区家居', completed: false },
                        { text: '设置闹钟', completed: false }
                    ],
                    dataFields: [
                        { label: '明日事项', value: '', placeholder: '____个' },
                        { label: '明日MIT1', value: '', placeholder: '______' },
                        { label: '明日MIT2', value: '', placeholder: '______' },
                        { label: '明日MIT3', value: '', placeholder: '______' }
                    ],
                    phoneReminder: '🎒 准备明天！从容开始'
                },
                {
                    time: '22:30-23:00',
                    name: '睡前仪式',
                    mainActivity: '放松、准备睡眠',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '洗漱护肤', completed: false },
                        { text: '调节卧室环境', completed: false },
                        { text: '阅读纸质书15-20分钟', completed: false },
                        { text: '冥想5-10分钟', completed: false },
                        { text: '23:00准时上床', completed: false }
                    ],
                    dataFields: [
                        { label: '阅读时长', value: '', placeholder: '____分钟' },
                        { label: '冥想时长', value: '', placeholder: '____分钟' },
                        { label: '上床时间', value: '', placeholder: '____' }
                    ],
                    phoneReminder: '📖 睡前仪式！准备休息'
                },
                {
                    time: '23:00-06:00',
                    name: '优质睡眠',
                    mainActivity: '睡眠恢复',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '23:00准时熄灯', completed: false },
                        { text: '放下电子设备', completed: false },
                        { text: '深呼吸放松', completed: false },
                        { text: '保证7小时睡眠', completed: false }
                    ],
                    dataFields: [
                        { label: '入睡时间', value: '', placeholder: '____' },
                        { label: '目标睡眠', value: '', placeholder: '7h' }
                    ],
                    phoneReminder: '😴 就寝时间！晚安'
                }
            ];
        },
        
        // 周六时间表
        getSaturdayTimeSlots() {
            return [
                {
                    time: '07:00-08:00',
                    name: '周末起床',
                    mainActivity: '自然醒、放松起床',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '自然醒，不设闹钟', completed: false },
                        { text: '测量体重体脂', completed: false },
                        { text: '测量血压心率', completed: false },
                        { text: '记录睡眠质量', completed: false },
                        { text: '简单伸展10分钟', completed: false }
                    ],
                    dataFields: [
                        { label: '起床时间', value: '', placeholder: '____' },
                        { label: '睡眠时长', value: '', placeholder: '____h' },
                        { label: '睡眠质量', value: '', placeholder: '⭐⭐⭐⭐⭐' },
                        { label: '体重', value: '', placeholder: '____kg' },
                        { label: '血压', value: '', placeholder: '____/____' }
                    ],
                    phoneReminder: '🌅 周末好！享受悠闲早晨'
                },
                {
                    time: '08:00-09:00',
                    name: '周末早餐',
                    mainActivity: '丰盛早餐、家人时光',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '准备丰盛早餐', completed: false },
                        { text: '与家人共进早餐', completed: false },
                        { text: '享受慢节奏', completed: false },
                        { text: '规划今日活动', completed: false }
                    ],
                    dataFields: [
                        { label: '早餐类型', value: '', placeholder: '____' },
                        { label: '早餐热量', value: '', placeholder: '____千卡' },
                        { label: '饮水', value: '', placeholder: '____ml' }
                    ],
                    phoneReminder: '☕ 享受周末早餐时光'
                },
                {
                    time: '09:00-11:00',
                    name: '学习/亲子活动',
                    mainActivity: '个人学习、陪伴孩子',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '个人学习/阅读', completed: false },
                        { text: '陪孩子阅读/游戏', completed: false },
                        { text: '或亲子手工活动', completed: false },
                        { text: '或户外活动准备', completed: false },
                        { text: '记录学习和亲子互动', completed: false }
                    ],
                    dataFields: [
                        { label: '学习主题', value: '', placeholder: '____' },
                        { label: '学习时长', value: '', placeholder: '____h' },
                        { label: '亲子活动', value: '', placeholder: '____' },
                        { label: '孩子满意度', value: '', placeholder: '⭐⭐⭐⭐⭐' }
                    ],
                    phoneReminder: '📚👶 学习时间 + 亲子时光'
                },
                {
                    time: '11:00-12:00',
                    name: '准备午餐',
                    mainActivity: '准备午餐、轻松活动',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '确定午餐计划', completed: false },
                        { text: '准备食材或外出准备', completed: false },
                        { text: '孩子自由活动', completed: false },
                        { text: '补充水分', completed: false }
                    ],
                    dataFields: [
                        { label: '午餐计划', value: '', placeholder: '____' },
                        { label: '预计时长', value: '', placeholder: '____分钟' }
                    ],
                    phoneReminder: '🍳 准备午餐！'
                },
                {
                    time: '12:00-13:00',
                    name: '午餐时间',
                    mainActivity: '营养午餐',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '营养均衡午餐', completed: false },
                        { text: '蔬菜水果充足', completed: false },
                        { text: '适量蛋白质', completed: false },
                        { text: '细嚼慢咽', completed: false }
                    ],
                    dataFields: [
                        { label: '午餐热量', value: '', placeholder: '____千卡' },
                        { label: '蛋白质', value: '', placeholder: '____g' },
                        { label: '支出', value: '', placeholder: '¥____' }
                    ],
                    phoneReminder: '🍽️ 午餐时间！'
                },
                {
                    time: '13:00-17:00',
                    name: '户外亲子/家庭活动',
                    mainActivity: '户外活动、亲子互动',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '户外亲子活动（公园/游乐场）', completed: false },
                        { text: '或家庭外出', completed: false },
                        { text: '或室内亲子游戏', completed: false },
                        { text: '拍照记录美好时刻', completed: false },
                        { text: '保持身心放松', completed: false }
                    ],
                    dataFields: [
                        { label: '活动类型', value: '', placeholder: '____' },
                        { label: '活动时长', value: '', placeholder: '____h' },
                        { label: '孩子表现', value: '', placeholder: '____' },
                        { label: '步数', value: '', placeholder: '____步' },
                        { label: '心情指数', value: '', placeholder: '____/10' }
                    ],
                    phoneReminder: '🏃👶 户外亲子时光！'
                },
                {
                    time: '17:00-18:00',
                    name: '准备晚餐',
                    mainActivity: '返程、晚餐准备',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '返程回家（如外出）', completed: false },
                        { text: '准备晚餐食材', completed: false },
                        { text: '孩子自由活动', completed: false },
                        { text: '补充水分', completed: false }
                    ],
                    dataFields: [
                        { label: '晚餐计划', value: '', placeholder: '____' },
                        { label: '准备时长', value: '', placeholder: '____分钟' }
                    ],
                    phoneReminder: '🍳 准备晚餐！'
                },
                {
                    time: '18:00-19:00',
                    name: '晚餐时间',
                    mainActivity: '家庭晚餐',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '准备/享用晚餐', completed: false },
                        { text: '与家人交流', completed: false },
                        { text: '分享今日见闻', completed: false },
                        { text: '记录支出', completed: false }
                    ],
                    dataFields: [
                        { label: '晚餐热量', value: '', placeholder: '____千卡' },
                        { label: '支出', value: '', placeholder: '¥____' },
                        { label: '今日总热量', value: '', placeholder: '____千卡' }
                    ],
                    phoneReminder: '🍽️ 家庭晚餐时间'
                },
                {
                    time: '19:00-21:00',
                    name: '晚间亲子/娱乐',
                    mainActivity: '亲子时光、家庭娱乐',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '陪孩子阅读/游戏', completed: false },
                        { text: '或看家庭电影', completed: false },
                        { text: '或亲子互动游戏', completed: false },
                        { text: '或个人阅读学习', completed: false },
                        { text: '记录亲子互动', completed: false }
                    ],
                    dataFields: [
                        { label: '亲子活动', value: '', placeholder: '____' },
                        { label: '活动时长', value: '', placeholder: '____h' },
                        { label: '阅读页数', value: '', placeholder: '____页' },
                        { label: '满意度', value: '', placeholder: '____/10' }
                    ],
                    phoneReminder: '👶🎬 晚间亲子娱乐时间！'
                },
                {
                    time: '21:00-22:00',
                    name: '哄睡/周总结',
                    mainActivity: '哄孩子睡觉、周总结',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '哄孩子睡觉', completed: false },
                        { text: '讲睡前故事', completed: false },
                        { text: '回顾本周工作', completed: false },
                        { text: '规划下周重点', completed: false },
                        { text: '设定下周目标', completed: false }
                    ],
                    dataFields: [
                        { label: '孩子入睡时间', value: '', placeholder: '____' },
                        { label: '本周完成', value: '', placeholder: '____项' },
                        { label: '下周目标1', value: '', placeholder: '______' },
                        { label: '下周目标2', value: '', placeholder: '______' },
                        { label: '下周目标3', value: '', placeholder: '______' }
                    ],
                    phoneReminder: '😴📝 哄睡 + 周总结时间'
                },
                {
                    time: '22:00-22:30',
                    name: '睡前准备',
                    mainActivity: '准备明日、整理休息',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '查看明天日程', completed: false },
                        { text: '准备明日物品', completed: false },
                        { text: '整理卧室', completed: false },
                        { text: '设置闹钟', completed: false }
                    ],
                    dataFields: [
                        { label: '明日计划', value: '', placeholder: '____' }
                    ],
                    phoneReminder: '🎒 准备明天！'
                },
                {
                    time: '22:30-23:00',
                    name: '睡前仪式',
                    mainActivity: '放松、准备睡眠',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '洗漱护肤', completed: false },
                        { text: '调节卧室环境', completed: false },
                        { text: '阅读纸质书20-30分钟', completed: false },
                        { text: '冥想10分钟', completed: false },
                        { text: '23:00准时上床', completed: false }
                    ],
                    dataFields: [
                        { label: '阅读时长', value: '', placeholder: '____分钟' },
                        { label: '冥想时长', value: '', placeholder: '____分钟' },
                        { label: '上床时间', value: '', placeholder: '____' }
                    ],
                    phoneReminder: '📖 睡前仪式！准备休息'
                },
                {
                    time: '23:00-07:00',
                    name: '优质睡眠',
                    mainActivity: '充足睡眠',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '23:00准时熄灯', completed: false },
                        { text: '放下电子设备', completed: false },
                        { text: '深呼吸放松', completed: false },
                        { text: '保证8小时睡眠', completed: false }
                    ],
                    dataFields: [
                        { label: '入睡时间', value: '', placeholder: '____' },
                        { label: '目标睡眠', value: '', placeholder: '8h' }
                    ],
                    phoneReminder: '😴 就寝时间！晚安'
                }
            ];
        },
        
        // 周日时间表（与周六保持一致的时间段，便于带娃）
        getSundayTimeSlots() {
            return [
                {
                    time: '07:00-08:00',
                    name: '周末起床',
                    mainActivity: '自然醒、放松起床',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '自然醒，不设闹钟', completed: false },
                        { text: '测量体重体脂', completed: false },
                        { text: '测量血压心率', completed: false },
                        { text: '记录睡眠质量', completed: false },
                        { text: '简单伸展10分钟', completed: false }
                    ],
                    dataFields: [
                        { label: '起床时间', value: '', placeholder: '____' },
                        { label: '睡眠时长', value: '', placeholder: '____h' },
                        { label: '睡眠质量', value: '', placeholder: '⭐⭐⭐⭐⭐' },
                        { label: '体重', value: '', placeholder: '____kg' },
                        { label: '血压', value: '', placeholder: '____/____' }
                    ],
                    phoneReminder: '🌅 周日好！享受悠闲早晨'
                },
                {
                    time: '08:00-09:00',
                    name: '周末早餐',
                    mainActivity: '家庭早餐、亲子时光',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '准备营养早餐', completed: false },
                        { text: '与家人共进早餐', completed: false },
                        { text: '享受慢节奏', completed: false },
                        { text: '规划今日活动', completed: false }
                    ],
                    dataFields: [
                        { label: '早餐类型', value: '', placeholder: '____' },
                        { label: '早餐热量', value: '', placeholder: '____千卡' },
                        { label: '饮水', value: '', placeholder: '____ml' }
                    ],
                    phoneReminder: '☕ 享受周末早餐时光'
                },
                {
                    time: '09:00-11:00',
                    name: '家务/亲子活动',
                    mainActivity: '家务整理、陪伴孩子',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '打扫卫生', completed: false },
                        { text: '整理衣物', completed: false },
                        { text: '陪孩子阅读/游戏', completed: false },
                        { text: '或亲子手工活动', completed: false },
                        { text: '记录亲子互动', completed: false }
                    ],
                    dataFields: [
                        { label: '家务项目', value: '', placeholder: '____' },
                        { label: '亲子活动', value: '', placeholder: '____' },
                        { label: '互动时长', value: '', placeholder: '____h' },
                        { label: '孩子满意度', value: '', placeholder: '⭐⭐⭐⭐⭐' }
                    ],
                    phoneReminder: '🏠👶 家务整理 + 亲子时光'
                },
                {
                    time: '11:00-12:00',
                    name: '准备午餐',
                    mainActivity: '准备午餐、轻松活动',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '采购食材或准备食材', completed: false },
                        { text: '准备营养午餐', completed: false },
                        { text: '或外出就餐准备', completed: false },
                        { text: '补充水分', completed: false }
                    ],
                    dataFields: [
                        { label: '午餐计划', value: '', placeholder: '____' },
                        { label: '预计时长', value: '', placeholder: '____分钟' }
                    ],
                    phoneReminder: '🍳 准备午餐！'
                },
                {
                    time: '12:00-13:00',
                    name: '午餐时间',
                    mainActivity: '营养午餐',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '营养均衡午餐', completed: false },
                        { text: '蔬菜水果充足', completed: false },
                        { text: '适量蛋白质', completed: false },
                        { text: '细嚼慢咽', completed: false }
                    ],
                    dataFields: [
                        { label: '午餐热量', value: '', placeholder: '____千卡' },
                        { label: '蛋白质', value: '', placeholder: '____g' },
                        { label: '支出', value: '', placeholder: '¥____' }
                    ],
                    phoneReminder: '🍽️ 午餐时间！'
                },
                {
                    time: '13:00-17:00',
                    name: '家庭活动/休息',
                    mainActivity: '亲子活动、家庭时光',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '陪孩子午休（如需要）', completed: false },
                        { text: '或室内亲子活动', completed: false },
                        { text: '或准备下周工作', completed: false },
                        { text: '或整理家务', completed: false },
                        { text: '记录家庭活动', completed: false }
                    ],
                    dataFields: [
                        { label: '活动类型', value: '', placeholder: '____' },
                        { label: '活动时长', value: '', placeholder: '____h' },
                        { label: '孩子状态', value: '', placeholder: '____' },
                        { label: '下周准备', value: '', placeholder: '____' },
                        { label: '心情指数', value: '', placeholder: '____/10' }
                    ],
                    phoneReminder: '👨‍👩‍👧‍👦 家庭时光！'
                },
                {
                    time: '17:00-18:00',
                    name: '准备晚餐',
                    mainActivity: '晚餐准备、轻松活动',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '准备晚餐食材', completed: false },
                        { text: '或准备外出就餐', completed: false },
                        { text: '孩子自由活动', completed: false },
                        { text: '补充水分', completed: false }
                    ],
                    dataFields: [
                        { label: '晚餐计划', value: '', placeholder: '____' },
                        { label: '准备时长', value: '', placeholder: '____分钟' }
                    ],
                    phoneReminder: '🍳 准备晚餐！'
                },
                {
                    time: '18:00-19:00',
                    name: '晚餐时间',
                    mainActivity: '家庭晚餐',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '准备/享用晚餐', completed: false },
                        { text: '与家人交流', completed: false },
                        { text: '分享今日见闻', completed: false },
                        { text: '记录支出', completed: false }
                    ],
                    dataFields: [
                        { label: '晚餐热量', value: '', placeholder: '____千卡' },
                        { label: '支出', value: '', placeholder: '¥____' },
                        { label: '今日总热量', value: '', placeholder: '____千卡' }
                    ],
                    phoneReminder: '🍽️ 家庭晚餐时间'
                },
                {
                    time: '19:00-21:00',
                    name: '晚间亲子/准备',
                    mainActivity: '亲子时光、下周准备',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '陪孩子阅读/游戏', completed: false },
                        { text: '或看家庭电影', completed: false },
                        { text: '准备下周工作物品', completed: false },
                        { text: '整理工作文件', completed: false },
                        { text: '准备衣物', completed: false }
                    ],
                    dataFields: [
                        { label: '亲子活动', value: '', placeholder: '____' },
                        { label: '活动时长', value: '', placeholder: '____h' },
                        { label: '下周重点1', value: '', placeholder: '______' },
                        { label: '下周重点2', value: '', placeholder: '______' }
                    ],
                    phoneReminder: '👶📋 亲子时光 + 下周准备'
                },
                {
                    time: '21:00-22:00',
                    name: '哄睡/放松',
                    mainActivity: '哄孩子睡觉、个人放松',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '哄孩子睡觉', completed: false },
                        { text: '讲睡前故事', completed: false },
                        { text: '孩子入睡后放松', completed: false },
                        { text: '或看轻松节目', completed: false }
                    ],
                    dataFields: [
                        { label: '孩子入睡时间', value: '', placeholder: '____' },
                        { label: '个人放松', value: '', placeholder: '____' },
                        { label: '心情指数', value: '', placeholder: '____/10' }
                    ],
                    phoneReminder: '😴 哄睡时间！'
                },
                {
                    time: '22:00-22:30',
                    name: '睡前准备',
                    mainActivity: '整理、准备睡眠',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '确认明日闹钟', completed: false },
                        { text: '检查明日物品', completed: false },
                        { text: '整理卧室', completed: false },
                        { text: '做好心理准备', completed: false }
                    ],
                    dataFields: [
                        { label: '闹钟时间', value: '', placeholder: '____' }
                    ],
                    phoneReminder: '🎒 准备明天！'
                },
                {
                    time: '22:30-23:00',
                    name: '睡前仪式',
                    mainActivity: '放松、准备睡眠',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '洗漱护肤', completed: false },
                        { text: '调节卧室环境', completed: false },
                        { text: '阅读纸质书15-20分钟', completed: false },
                        { text: '冥想5-10分钟', completed: false },
                        { text: '23:00准时上床', completed: false }
                    ],
                    dataFields: [
                        { label: '阅读时长', value: '', placeholder: '____分钟' },
                        { label: '冥想时长', value: '', placeholder: '____分钟' },
                        { label: '上床时间', value: '', placeholder: '____' }
                    ],
                    phoneReminder: '📖 睡前仪式！准备休息'
                },
                {
                    time: '23:00-06:00',
                    name: '优质睡眠',
                    mainActivity: '充分休息，迎接新周',
                    completed: false,
                    isCurrent: false,
                    checklist: [
                        { text: '23:00准时熄灯', completed: false },
                        { text: '放下电子设备', completed: false },
                        { text: '深呼吸放松', completed: false },
                        { text: '保证7小时睡眠', completed: false }
                    ],
                    dataFields: [
                        { label: '入睡时间', value: '', placeholder: '____' },
                        { label: '目标睡眠', value: '', placeholder: '7h' }
                    ],
                    phoneReminder: '😴 就寝时间！为新周蓄力'
                }
            ];
        },
        
        // 显示成功消息
        showSuccessMessage(message) {
            // 简单的消息提示
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #4CAF50;
                color: white;
                padding: 12px 20px;
                border-radius: 4px;
                z-index: 1000;
                font-size: 14px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            `;
            toast.textContent = message;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 3000);
        },
        
        // 导出数据
        async exportData() {
            try {
                // 动态导入导出工具
                const { exportCategoryData } = await import('/utils/exportUtils.js');
                
                // 准备每日清单数据
                const dailyChecklistData = this.timeSlots.map(slot => ({
                    ...slot,
                    date: this.currentDateSubtitle,
                    stats: {
                        totalCount: slot.checklist.length,
                        completedCount: slot.checklist.filter(item => item.completed).length,
                        completionRate: slot.checklist.length > 0 ? 
                            (slot.checklist.filter(item => item.completed).length / slot.checklist.length) * 100 : 0
                    }
                }));
                
                // 导出每日清单数据
                const success = await exportCategoryData(
                    dailyChecklistData, 
                    '每日清单', 
                    `每日清单_${this.currentDateSubtitle}`
                );
                
                if (success) {
                    this.showSuccessMessage('每日清单数据已导出');
                    console.log('[DailyChecklist] 导出成功');
                } else {
                    this.showErrorMessage('导出失败，请重试');
                    console.error('[DailyChecklist] 导出失败');
                }
            } catch (error) {
                console.error('[DailyChecklist] 导出过程中出错:', error);
                this.showErrorMessage('导出过程中出错');
            }
        }
    },
    async mounted() {
        // 从API加载数据
        await this.loadFromAPI();
        
        // 初始化当前时段状态
        this.initializeCurrentTimeSlot();
        
        // 监听日期变化事件
        window.addEventListener('dateChanged', this.handleDateChange);
        
        // 监听数据刷新事件
        window.addEventListener('reloadDailyChecklist', this.handleReload);
        
        // 监听数据请求事件
        this._dataRequestHandler = (event) => {
            const { callback } = event.detail;
            if (callback && typeof callback === 'function') {
                // 准备每日清单数据
                const dailyChecklistData = this.timeSlots.map(slot => ({
                    ...slot,
                    date: this.currentDateSubtitle,
                    stats: {
                        totalCount: slot.checklist.length,
                        completedCount: slot.checklist.filter(item => item.completed).length,
                        completionRate: slot.checklist.length > 0 ? 
                            (slot.checklist.filter(item => item.completed).length / slot.checklist.length) * 100 : 0
                    }
                }));
                callback(dailyChecklistData);
            }
        };
        window.addEventListener('RequestDailyChecklistData', this._dataRequestHandler);
        
        // 每分钟更新一次当前时段状态
        setInterval(() => {
            this.initializeCurrentTimeSlot();
        }, 60000);
    },
    
    beforeUnmount() {
        // 清理事件监听器
        window.removeEventListener('dateChanged', this.handleDateChange);
        window.removeEventListener('reloadDailyChecklist', this.handleReload);
        if (this._dataRequestHandler) {
            window.removeEventListener('RequestDailyChecklistData', this._dataRequestHandler);
        }
        
        // 清理定时器
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        // 强制保存未保存的更改
        this.forceSave();
    },
    template: `
        <div class="daily-checklist-container" v-show="activeCategory === 'dailyChecklist' || activeCategory === 'all'">
            <!-- 头部操作区域 -->
            <div class="checklist-header">
                <div class="header-left">
                    <h2 class="checklist-title">
                        <i class="fas fa-tasks" aria-hidden="true"></i>
                        每日清单 - {{ currentDateDisplay }}
                    </h2>
                    <p class="checklist-subtitle">{{ currentDateSubtitle }}</p>
                    <p class="time-flow-description">{{ timeFlowDescription }}</p>
                </div>
                <div class="header-actions">
                    <button @click="exportData" class="export-btn" type="button" title="导出数据">
                        <i class="fas fa-download" aria-hidden="true"></i>
                        <span>导出</span>
                    </button>
                    <button @click="handleRefresh" class="refresh-btn" type="button" title="刷新数据">
                        <i class="fas fa-sync-alt" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
            
            <!-- 加载状态 -->
            <div v-if="loading" class="loading-container">
                <div class="loading-spinner"></div>
                <p>正在加载每日清单...</p>
            </div>
            
            <!-- 错误状态 -->
            <div v-else-if="error" class="error-container">
                <p>{{ error }}</p>
                <button @click="handleRefresh" class="retry-btn">重试</button>
            </div>
            
            <!-- 清单内容 -->
            <div v-else class="checklist-content">
                <!-- 统计信息 -->
                <div class="checklist-stats">
                    <div class="stat-item">
                        <span class="stat-number">{{ completedCount }}</span>
                        <span class="stat-label">已完成</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">{{ totalCount }}</span>
                        <span class="stat-label">总项目</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">{{ Math.round(completionRate) }}%</span>
                        <span class="stat-label">完成率</span>
                    </div>
                    <div class="stat-item" v-if="currentTimeSlot">
                        <span class="stat-number">当前</span>
                        <span class="stat-label">{{ currentTimeSlot.name }}</span>
                    </div>
                </div>
                
                <!-- 时间表 -->
                <div class="time-schedule">
                    <div v-for="(timeSlot, index) in sortedTimeSlots" :key="timeSlot.time" 
                         class="time-slot" 
                         :class="{ 'completed': timeSlot.completed, 'current': timeSlot.isCurrent }">
                        
                        <!-- 时段头部 -->
                        <div class="time-header">
                            <div class="time-info">
                                <span class="time-range">{{ timeSlot.time }}</span>
                                <span class="time-name">{{ timeSlot.name }}</span>
                                <span v-if="timeSlot.isCurrent" class="current-badge">当前时段</span>
                                <span v-if="index === 0 && timeSlot.isCurrent" class="priority-badge">时间起点</span>
                            </div>
                            <div class="time-actions">
                                <button @click="toggleTimeSlot(index)" 
                                        class="toggle-btn" 
                                        :class="{ 'completed': timeSlot.completed }"
                                        :title="timeSlot.completed ? '标记为未完成' : '标记为完成'">
                                    <i :class="timeSlot.completed ? 'fas fa-check-circle' : 'far fa-circle'"></i>
                                </button>
                                <button @click="editTimeSlot(index)" 
                                        class="edit-btn" 
                                        title="编辑时段">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                        </div>
                        
                        <!-- 时段内容 -->
                        <div class="time-content">
                            <!-- 主要活动 -->
                            <div class="main-activity">
                                <h4>{{ timeSlot.mainActivity }}</h4>
                            </div>
                            
                            <!-- 清单项目 -->
                            <div class="checklist-items">
                                <div v-for="(item, itemIndex) in timeSlot.checklist" 
                                     :key="itemIndex" 
                                     class="checklist-item" 
                                     :class="{ 'completed': item.completed }">
                                    <label class="item-label">
                                        <input type="checkbox" 
                                               v-model="item.completed" 
                                               @change="updateItem(index, itemIndex)" 
                                               class="item-checkbox">
                                        <span class="item-text">{{ item.text }}</span>
                                    </label>
                                </div>
                            </div>
                            
                            <!-- 数据追踪 -->
                            <div class="data-tracking">
                                <h5>数据追踪</h5>
                                <div class="tracking-fields">
                                    <div v-for="(field, fieldIndex) in timeSlot.dataFields" 
                                         :key="fieldIndex" 
                                         class="tracking-field">
                                        <label class="field-label">{{ field.label }}：</label>
                                        <input type="text" 
                                               v-model="field.value" 
                                               @input="onDataFieldInput(index, fieldIndex, $event)"
                                               @change="onDataFieldChange(index, fieldIndex, $event)"
                                               @blur="updateDataField(index, fieldIndex)" 
                                               class="field-input" 
                                               :placeholder="field.placeholder">
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 手机提醒 -->
                            <div class="phone-reminder">
                                <h5>手机提醒</h5>
                                <div class="reminder-content">
                                    <i class="fas fa-mobile-alt" aria-hidden="true"></i>
                                    <span>{{ timeSlot.phoneReminder }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 编辑弹窗 -->
            <div v-if="showEditModal" class="modal-overlay" @click="closeEditModal">
                <div class="modal-content" @click.stop>
                    <div class="modal-header">
                        <h3>编辑时段</h3>
                        <button @click="closeEditModal" class="close-btn" type="button">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>时段名称：</label>
                            <input type="text" v-model="editingSlot.name" class="form-input">
                        </div>
                        <div class="form-group">
                            <label>主要活动：</label>
                            <input type="text" v-model="editingSlot.mainActivity" class="form-input">
                        </div>
                        <div class="form-group">
                            <label>手机提醒：</label>
                            <input type="text" v-model="editingSlot.phoneReminder" class="form-input">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button @click="closeEditModal" class="btn btn-secondary">取消</button>
                        <button @click="saveEdit" class="btn btn-primary">保存</button>
                    </div>
                </div>
            </div>
        </div>
    `
};

// 立即注册组件
window.DailyChecklist = OptimizedDailyChecklist;
console.log('[OptimizedDailyChecklist] 优化版每日清单组件已注册');

// 触发自定义事件
window.dispatchEvent(new CustomEvent('DailyChecklistLoaded', { detail: OptimizedDailyChecklist }));




