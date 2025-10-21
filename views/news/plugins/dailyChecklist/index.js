// 每日清单组件
// 作者：liangliang

import { loadCSSFiles } from '/utils/baseView.js';
import { getData, postData, updateData, deleteData } from '/apis/index.js';
import { safeExecute, createError, ErrorTypes, showSuccessMessage } from '/utils/error.js';
import { formatDate } from '/utils/date.js';

// 自动加载相关的CSS文件
loadCSSFiles([
    '/views/news/plugins/dailyChecklist/index.css'
]);

// 异步加载HTML模板
async function loadTemplate() {
    try {
        const response = await fetch('/views/news/plugins/dailyChecklist/index.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error('加载每日清单模板失败:', error);
        return null;
    }
}

// 创建组件定义
const createDailyChecklist = async () => {
    const template = await loadTemplate();
    
    // 如果模板加载失败，使用内联模板
    const fallbackTemplate = `
        <div class="daily-checklist-container" v-show="activeCategory === 'dailyChecklist' || activeCategory === 'all'">
            <div class="checklist-header">
                <div class="header-left">
                    <h2 class="checklist-title">
                        <i class="fas fa-tasks" aria-hidden="true"></i>
                        每日清单 - {{ currentDateDisplay }}
                    </h2>
                    <p class="checklist-subtitle">{{ currentDateSubtitle }}</p>
                </div>
                <div class="header-actions">
                    <button @click="handleAddItem" class="add-item-btn" type="button">
                        <i class="fas fa-plus" aria-hidden="true"></i>
                        <span>添加项目</span>
                    </button>
                    <button @click="handleRefresh" class="refresh-btn" type="button">
                        <i class="fas fa-sync-alt" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
            
            <div v-if="loading" class="loading-container">
                <div class="loading-spinner"></div>
                <p>正在加载每日清单...</p>
            </div>
            
            <div v-else-if="error" class="error-container">
                <p>{{ error }}</p>
                <button @click="handleRefresh" class="retry-btn">重试</button>
            </div>
            
            <div v-else class="checklist-content">
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
                </div>
                
                <div class="time-schedule">
                    <div v-for="(timeSlot, index) in timeSlots" :key="timeSlot.time" class="time-slot" :class="{ 'completed': timeSlot.completed, 'current': timeSlot.isCurrent }">
                        <div class="time-header">
                            <div class="time-info">
                                <span class="time-range">{{ timeSlot.time }}</span>
                                <span class="time-name">{{ timeSlot.name }}</span>
                            </div>
                            <div class="time-actions">
                                <button @click="toggleTimeSlot(index)" class="toggle-btn" :class="{ 'completed': timeSlot.completed }">
                                    <i :class="timeSlot.completed ? 'fas fa-check-circle' : 'far fa-circle'"></i>
                                </button>
                                <button @click="editTimeSlot(index)" class="edit-btn">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="time-content">
                            <div class="main-activity">
                                <h4>{{ timeSlot.mainActivity }}</h4>
                            </div>
                            
                            <div class="checklist-items">
                                <div v-for="(item, itemIndex) in timeSlot.checklist" :key="itemIndex" class="checklist-item" :class="{ 'completed': item.completed }">
                                    <label class="item-label">
                                        <input type="checkbox" v-model="item.completed" @change="updateItem(index, itemIndex)" class="item-checkbox">
                                        <span class="item-text">{{ item.text }}</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="data-tracking">
                                <h5>数据追踪</h5>
                                <div class="tracking-fields">
                                    <div v-for="(field, fieldIndex) in timeSlot.dataFields" :key="fieldIndex" class="tracking-field">
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
        </div>
    `;
    
    return {
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
                timeSlots: [],
                showEditModal: false,
                editingSlot: null,
                editingIndex: -1,
                saveTimeout: null
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
            }
        },
        methods: {
            /**
             * 初始化时间表数据
             */
            initializeTimeSlots() {
                const timeSlotsData = [
                    {
                        time: '06:00-06:30',
                        name: '起床健康检查',
                        mainActivity: '起床、测量身体指标',
                        completed: false,
                        isCurrent: this.isCurrentTimeSlot('06:00', '06:30'),
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
                        isCurrent: this.isCurrentTimeSlot('06:30', '07:00'),
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
                        isCurrent: this.isCurrentTimeSlot('07:00', '09:00'),
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
                        isCurrent: this.isCurrentTimeSlot('09:00', '11:00'),
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
                        isCurrent: this.isCurrentTimeSlot('11:00', '11:30'),
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
                        isCurrent: this.isCurrentTimeSlot('11:30', '13:00'),
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
                        name: '项目任务',
                        mainActivity: '处理项目、邮件',
                        completed: false,
                        isCurrent: this.isCurrentTimeSlot('13:00', '14:30'),
                        checklist: [
                            { text: '处理遗留任务', completed: false },
                            { text: '集中处理邮件', completed: false },
                            { text: '推进项目任务', completed: false },
                            { text: '准备会议材料', completed: false }
                        ],
                        dataFields: [
                            { label: '任务数', value: '', placeholder: '____个' },
                            { label: '专注时长', value: '', placeholder: '____h' },
                            { label: '时间利用率', value: '', placeholder: '____%' }
                        ],
                        phoneReminder: '💻 下午工作开始！'
                    },
                    {
                        time: '14:30-14:45',
                        name: '下午茶休息',
                        mainActivity: '补充能量、放松',
                        completed: false,
                        isCurrent: this.isCurrentTimeSlot('14:30', '14:45'),
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
                        name: '沟通协作',
                        mainActivity: '会议、沟通、协调',
                        completed: false,
                        isCurrent: this.isCurrentTimeSlot('14:45', '17:00'),
                        checklist: [
                            { text: '参加会议', completed: false },
                            { text: '团队协作', completed: false },
                            { text: '回复邮件消息', completed: false },
                            { text: '处理临时任务', completed: false }
                        ],
                        dataFields: [
                            { label: '会议时长', value: '', placeholder: '____h' },
                            { label: '邮件数', value: '', placeholder: '____封' },
                            { label: '沟通效率', value: '', placeholder: '⭐⭐⭐⭐⭐' }
                        ],
                        phoneReminder: '👥 协作沟通时间'
                    },
                    {
                        time: '17:00-17:30',
                        name: '工作总结',
                        mainActivity: '总结、明日准备',
                        completed: false,
                        isCurrent: this.isCurrentTimeSlot('17:00', '17:30'),
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
                        isCurrent: this.isCurrentTimeSlot('17:30', '18:00'),
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
                        isCurrent: this.isCurrentTimeSlot('18:00', '19:30'),
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
                        isCurrent: this.isCurrentTimeSlot('19:30', '21:30'),
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
                        isCurrent: this.isCurrentTimeSlot('21:30', '22:00'),
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
                        isCurrent: this.isCurrentTimeSlot('22:00', '22:30'),
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
                        isCurrent: this.isCurrentTimeSlot('22:30', '23:00'),
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
                        isCurrent: this.isCurrentTimeSlot('23:00', '06:00'),
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
                
                this.timeSlots = timeSlotsData;
            },

            /**
             * 判断当前时间是否在指定时段内
             */
            isCurrentTimeSlot(startTime, endTime) {
                const now = new Date();
                const currentTime = now.getHours() * 60 + now.getMinutes();
                
                const [startHour, startMin] = startTime.split(':').map(Number);
                const [endHour, endMin] = endTime.split(':').map(Number);
                
                const startMinutes = startHour * 60 + startMin;
                const endMinutes = endHour * 60 + endMin;
                
                // 处理跨天的情况（如23:00-06:00）
                if (endMinutes < startMinutes) {
                    return currentTime >= startMinutes || currentTime <= endMinutes;
                }
                
                return currentTime >= startMinutes && currentTime <= endMinutes;
            },

            /**
             * 加载每日清单数据
             */
            async loadDailyChecklist() {
                return safeExecute(async () => {
                    this.loading = true;
                    this.error = null;
                    
                    try {
                        // 从API加载数据
                        const dateStr = this.currentDateSubtitle;
                        const response = await getData(`${window.API_URL}/mongodb/?cname=dailyChecklist&date=${dateStr}`);
                        
                        // 参考 comments 的数据解析逻辑
                        let list = [];
                        if (response && response.data && Array.isArray(response.data.list)) {
                            list = response.data.list;
                        } else if (Array.isArray(response)) {
                            list = response;
                        } else if (response && Array.isArray(response.data)) {
                            list = response.data;
                        }
                        
                        // 检查是否有有效数据
                        if (list && list.length > 0) {
                            // 按创建时间排序，获取最新的数据
                            const sortedList = list.sort((a, b) => {
                                const timeA = new Date(a.date || a.lastUpdated || 0).getTime();
                                const timeB = new Date(b.date || b.lastUpdated || 0).getTime();
                                return timeB - timeA;
                            });
                            
                            const savedData = sortedList[0];
                            if (savedData.timeSlots && savedData.timeSlots.length >= 16) {
                                // 使用API返回的数据
                                this.timeSlots = savedData.timeSlots;
                                console.log('[每日清单] 从API加载数据成功，使用保存的数据');
                            } else {
                                // 数据不完整，使用默认数据
                                this.initializeTimeSlots();
                            }
                        } else {
                            // 没有数据，使用默认数据
                            this.initializeTimeSlots();
                        }
                        
                        console.log('[每日清单] 数据加载成功');
                    } catch (error) {
                        console.warn('[每日清单] API加载失败，使用默认数据:', error);
                        this.error = '加载数据失败: ' + error.message;
                        this.initializeTimeSlots();
                    }
                }, '每日清单数据加载', (errorInfo) => {
                    this.error = errorInfo.message;
                    this.initializeTimeSlots();
                }).finally(() => {
                    this.loading = false;
                });
            },

            /**
             * 保存每日清单数据
             */
            async saveDailyChecklist() {
                return safeExecute(async () => {
                    const dateStr = this.currentDateSubtitle;
                    const data = {
                        date: dateStr,
                        timeSlots: this.timeSlots,
                        completedCount: this.completedCount,
                        totalCount: this.totalCount,
                        completionRate: this.completionRate,
                        lastUpdated: new Date().toISOString()
                    };
                    
                    // 使用 postData 函数，与 comments 保持一致
                    const { postData } = await import('/apis/modules/crud.js');
                    const result = await postData(`${window.API_URL}/mongodb/?cname=dailyChecklist`, data);
                    
                    showSuccessMessage('每日清单已保存');
                    console.log('[每日清单] 数据保存成功:', result);
                }, '每日清单数据保存');
            },

            /**
             * 切换时段完成状态
             */
            toggleTimeSlot(index) {
                return safeExecute(() => {
                    this.timeSlots[index].completed = !this.timeSlots[index].completed;
                    this.saveDailyChecklist();
                }, '切换时段状态');
            },

            /**
             * 更新清单项目
             */
            updateItem(slotIndex, itemIndex) {
                return safeExecute(() => {
                    this.saveDailyChecklist();
                }, '更新清单项目');
            },

            /**
             * 更新数据字段
             */
            updateDataField(slotIndex, fieldIndex) {
                return safeExecute(() => {
                    console.log('[每日清单] 数据字段已更新:', {
                        slotIndex,
                        fieldIndex,
                        value: this.timeSlots[slotIndex].dataFields[fieldIndex].value
                    });
                    this.saveDailyChecklist();
                }, '更新数据字段');
            },
            
            /**
             * 数据字段输入事件
             */
            onDataFieldInput(slotIndex, fieldIndex, event) {
                // 实时更新数据
                this.timeSlots[slotIndex].dataFields[fieldIndex].value = event.target.value;
                console.log('[每日清单] 数据字段输入:', {
                    slotIndex,
                    fieldIndex,
                    value: event.target.value
                });
            },
            
            /**
             * 数据字段变化事件（实时保存）
             */
            onDataFieldChange(slotIndex, fieldIndex, event) {
                // 确保数据已更新
                this.timeSlots[slotIndex].dataFields[fieldIndex].value = event.target.value;
                console.log('[每日清单] 数据字段变化:', {
                    slotIndex,
                    fieldIndex,
                    value: event.target.value
                });
                // 延迟保存，避免频繁API调用
                this.debouncedSave();
            },
            
            /**
             * 防抖保存
             */
            debouncedSave() {
                // 清除之前的定时器
                if (this.saveTimeout) {
                    clearTimeout(this.saveTimeout);
                }
                
                // 设置新的定时器，1秒后保存
                this.saveTimeout = setTimeout(async () => {
                    try {
                        await this.saveDailyChecklist();
                        console.log('[每日清单] 防抖保存完成');
                    } catch (error) {
                        console.error('[每日清单] 防抖保存失败:', error);
                    }
                }, 1000);
            },
            
            /**
             * 强制保存
             */
            async forceSave() {
                try {
                    // 清除防抖定时器
                    if (this.saveTimeout) {
                        clearTimeout(this.saveTimeout);
                    }
                    
                    // 立即保存
                    await this.saveDailyChecklist();
                    console.log('[每日清单] 强制保存完成');
                } catch (error) {
                    console.error('[每日清单] 强制保存失败:', error);
                }
            },

            /**
             * 编辑时段
             */
            editTimeSlot(index) {
                return safeExecute(() => {
                    this.editingIndex = index;
                    this.editingSlot = JSON.parse(JSON.stringify(this.timeSlots[index]));
                    this.showEditModal = true;
                }, '编辑时段');
            },

            /**
             * 保存编辑
             */
            saveEdit() {
                return safeExecute(() => {
                    if (this.editingIndex >= 0 && this.editingSlot) {
                        this.timeSlots[this.editingIndex] = { ...this.editingSlot };
                        this.saveDailyChecklist();
                    }
                    this.closeEditModal();
                }, '保存编辑');
            },

            /**
             * 关闭编辑弹窗
             */
            closeEditModal() {
                this.showEditModal = false;
                this.editingSlot = null;
                this.editingIndex = -1;
            },

            /**
             * 添加新项目
             */
            handleAddItem() {
                return safeExecute(() => {
                    // 可以在这里添加新的时段或项目
                    showSuccessMessage('添加项目功能开发中');
                }, '添加项目');
            },

            /**
             * 刷新数据
             */
            handleRefresh() {
                return safeExecute(async () => {
                    await this.loadDailyChecklist();
                    showSuccessMessage('数据已刷新');
                }, '刷新数据');
            }
        },
        
        mounted() {
            // 初始化数据
            this.initializeTimeSlots();
            
            // 监听加载事件
            window.addEventListener('LoadDailyChecklist', () => {
                this.loadDailyChecklist();
            });
        },
        
        template: template || fallbackTemplate
    };
};

// 初始化组件并全局暴露
(async function initComponent() {
    try {
        console.log('[DailyChecklist] 开始初始化组件...');
        const DailyChecklist = await createDailyChecklist();
        window.DailyChecklist = DailyChecklist;
        
        console.log('[DailyChecklist] 组件初始化成功');
        
        // 触发自定义事件，通知组件已加载完成
        window.dispatchEvent(new CustomEvent('DailyChecklistLoaded', { detail: DailyChecklist }));
    } catch (error) {
        console.error('[DailyChecklist] 组件初始化失败:', error);
        
        // 即使失败也创建一个基本的组件定义
        window.DailyChecklist = {
            name: 'DailyChecklist',
            template: '<div class="daily-checklist-container"><p>每日清单组件加载失败</p></div>',
            props: ['activeCategory', 'currentDateDisplay', 'currentDateSubtitle']
        };
    }
})();

