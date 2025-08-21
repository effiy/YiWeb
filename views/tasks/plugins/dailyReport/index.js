// 日报组件 - 负责日报视图的显示和交互功能

// 模块依赖改为全局方式
// import { loadCSSFiles } from '/utils/baseView.js';

// 等待DOM加载完成后再加载CSS文件
function loadDailyReportCSS() {
    if (typeof window.loadCSSFiles === 'function') {
        window.loadCSSFiles([
            '/views/tasks/plugins/dailyReport/index.css'
        ]);
    } else {
        // 如果函数未定义，延迟重试
        setTimeout(loadDailyReportCSS, 100);
    }
}

// 在DOM加载完成后执行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDailyReportCSS);
} else {
    loadDailyReportCSS();
}

// 异步加载HTML模板
async function loadTemplate() {
    try {
        const response = await fetch('/views/tasks/plugins/dailyReport/index.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error('加载日报模板失败:', error);
        return '<div class="daily-error">日报模板加载失败</div>';
    }
}

const createDailyReport = async () => {
    const template = await loadTemplate();
    
    return {
        name: 'DailyReport',
        props: {
            tasks: {
                type: Array,
                default: () => []
            },
            currentView: {
                type: String,
                default: 'daily'
            },
            selectedTask: {
                type: Object,
                default: null
            },
            getTaskTimeData: {
                type: Function,
                default: null
            }
        },
        
        emits: ['task-select', 'task-create', 'task-update', 'load-tasks-data'],
        
        data() {
            return {
                // 当前日期
                currentDate: this.createSafeDate(new Date()),
                currentDateStr: this.createSafeDateString(new Date()),
                
                // 时间轴模式
                timelineMode: 'hourly', // hourly or task
                
                // 日报统计
                dailyStats: {
                    totalTasks: 0,
                    completedTasks: 0,
                    inProgressTasks: 0,
                    pendingTasks: 0,
                    plannedHours: 0,
                    actualHours: 0,
                    remainingHours: 0
                },
                
                // 专注时间
                currentFocusTime: 0,
                focusTarget: 120, // 2小时
                isTimerRunning: false,
                focusTimer: null,
                
                // 时间轴数据
                timelineHours: [],
                
                // 任务计时器
                taskTimers: new Map(),
                
                // 日报总结
                dailySummary: {
                    achievements: '',
                    issues: '',
                    tomorrowPlan: ''
                },
                
                // 快速添加任务
                showQuickTaskModal: false,
                quickTask: {
                    title: '',
                    description: '',
                    startTime: this.getCurrentTime(),
                    duration: 60,
                    priority: 'medium'
                }
            };
        },
        
        computed: {
            /**
             * 是否显示日报
             */
            showDailyReport() {
                return this.currentView === 'daily' && (this.todayTasks.length > 0 || this.isToday());
            },
            
            /**
             * 今日任务
             */
            todayTasks() {
                if (!this.tasks || this.tasks.length === 0) {
                    console.log('[DailyReport] 任务数据为空');
                    return [];
                }
                
                const today = this.currentDateStr;
                console.log('[DailyReport] 筛选今日任务:', {
                    today: today,
                    totalTasks: this.tasks.length
                });
                
                return this.tasks.filter(task => {
                    // 使用安全的日期处理函数
                    const taskDate = this.createSafeDateString(
                        task.startDate || task.dueDate || task.createdAt
                    );
                    
                    const isTodayTask = taskDate === today;
                    
                    if (isTodayTask) {
                        console.log('[DailyReport] 匹配今日任务:', {
                            title: task.title,
                            taskDate: taskDate,
                            status: task.status
                        });
                    }
                    
                    return isTodayTask;
                });
            }
        },
        
        watch: {
            tasks: {
                handler(newTasks) {
                    console.log('[DailyReport] 任务数据变化:', {
                        newTasksCount: newTasks?.length || 0,
                        currentView: this.currentView
                    });
                    if (this.currentView === 'daily') {
                        this.updateDailyData();
                    }
                },
                deep: true,
                immediate: true
            },
            currentDateStr() {
                this.currentDate = this.createSafeDate(this.currentDateStr);
                this.updateDailyData();
            },
            
            todayTasks: {
                handler() {
                    this.updateDailyData();
                },
                deep: true,
                immediate: true
            }
        },
        
        mounted() {
            console.log('[DailyReport] 组件已挂载:', {
                tasksCount: this.tasks?.length || 0,
                currentView: this.currentView,
                props: this.$props
            });
            
            // 确保数据已加载
            if (this.tasks && this.tasks.length > 0) {
                this.updateDailyData();
            } else {
                console.warn('[DailyReport] 组件挂载时任务数据为空');
            }
        },
        
        methods: {
            /**
             * 安全的日期处理函数
             */
            createSafeDate(dateValue, fallback = null) {
                try {
                    if (!dateValue) return fallback;
                    
                    // 如果是字符串，尝试解析
                    if (typeof dateValue === 'string') {
                        const parsed = new Date(dateValue);
                        if (isNaN(parsed.getTime())) {
                            console.warn('[DailyReport] 无效的日期字符串:', dateValue);
                            return fallback;
                        }
                        return parsed;
                    }
                    
                    // 如果是Date对象，验证有效性
                    if (dateValue instanceof Date) {
                        if (isNaN(dateValue.getTime())) {
                            console.warn('[DailyReport] 无效的Date对象:', dateValue);
                            return fallback;
                        }
                        return dateValue;
                    }
                    
                    // 如果是数字（时间戳），验证有效性
                    if (typeof dateValue === 'number') {
                        const parsed = new Date(dateValue);
                        if (isNaN(parsed.getTime())) {
                            console.warn('[DailyReport] 无效的时间戳:', dateValue);
                            return fallback;
                        }
                        return parsed;
                    }
                    
                    return fallback;
                } catch (error) {
                    console.warn('[DailyReport] 日期处理失败:', error, '原始值:', dateValue);
                    return fallback;
                }
            },

            /**
             * 安全的日期字符串生成函数
             */
            createSafeDateString(dateValue, fallback = null) {
                try {
                    const safeDate = this.createSafeDate(dateValue, fallback);
                    if (safeDate) {
                        return safeDate.toISOString().split('T')[0];
                    }
                    return fallback;
                } catch (error) {
                    console.warn('[DailyReport] 日期字符串生成失败:', error);
                    return fallback;
                }
            },

            /**
             * 获取当前时间
             */
            getCurrentTime() {
                const now = new Date();
                return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            },
            
            /**
             * 判断是否为今天
             */
            isToday() {
                const today = this.createSafeDateString(new Date());
                return this.currentDateStr === today;
            },
            
            /**
             * 格式化当前日期
             */
            formatCurrentDate() {
                return new Intl.DateTimeFormat('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                }).format(this.currentDate);
            },
            
            /**
             * 前一天
             */
            previousDay() {
                const prevDate = this.createSafeDate(this.currentDate);
                if (prevDate) {
                    prevDate.setDate(prevDate.getDate() - 1);
                    this.currentDateStr = this.createSafeDateString(prevDate);
                }
            },
            
            /**
             * 后一天
             */
            nextDay() {
                const nextDate = this.createSafeDate(this.currentDate);
                if (nextDate) {
                    nextDate.setDate(nextDate.getDate() + 1);
                    this.currentDateStr = this.createSafeDateString(nextDate);
                }
            },
            
            /**
             * 回到今天
             */
            goToToday() {
                this.currentDateStr = this.createSafeDateString(new Date());
            },
            
            /**
             * 日期变化处理
             */
            onDateChange() {
                this.currentDate = this.createSafeDate(this.currentDateStr);
                this.updateDailyData();
            },
            
            /**
             * 获取任务状态
             */
            getTaskStatus(task) {
                // 检查是否逾期
                if (task.dueDate) {
                    const dueDate = this.createSafeDate(task.dueDate);
                    const now = this.createSafeDate(new Date());
                    if (dueDate && now && dueDate < now) {
                        return 'overdue';
                    }
                }
                return task.status || 'todo';
            },
            
            /**
             * 更新日报数据
             */
            updateDailyData() {
                this.calculateDailyStats();
                this.generateTimelineHours();
                this.loadDailySummary();
            },
            
            /**
             * 计算日报统计
             */
            calculateDailyStats() {
                const tasks = this.todayTasks;
                
                console.log('[DailyReport] 计算日报统计:', {
                    totalTasks: tasks.length,
                    tasks: tasks.map(t => ({ id: t.id, title: t.title, status: t.status }))
                });
                
                this.dailyStats = {
                    totalTasks: tasks.length,
                    completedTasks: 0,
                    inProgressTasks: 0,
                    pendingTasks: 0,
                    plannedHours: 0,
                    actualHours: 0,
                    remainingHours: 0
                };
                
                tasks.forEach(task => {
                    const status = this.getTaskStatus(task);
                    
                    switch (status) {
                        case 'completed':
                            this.dailyStats.completedTasks++;
                            break;
                        case 'in_progress':
                            this.dailyStats.inProgressTasks++;
                            break;
                        default:
                            this.dailyStats.pendingTasks++;
                    }
                    
                    // 使用任务的estimatedHours和actualHours
                    this.dailyStats.plannedHours += (task.estimatedHours || 0);
                    this.dailyStats.actualHours += (task.actualHours || 0);
                });
                
                this.dailyStats.remainingHours = Math.max(0, this.dailyStats.plannedHours - this.dailyStats.actualHours);
                
                console.log('[DailyReport] 统计结果:', this.dailyStats);
            },
            
            /**
             * 生成时间轴小时数据
             */
            generateTimelineHours() {
                this.timelineHours = [];
                const now = this.createSafeDate(new Date());
                const currentHour = now ? now.getHours() : 12; // 默认中午12点
                
                for (let hour = 6; hour <= 22; hour++) {
                    const hourTasks = this.getHourTasks(hour);
                    
                    this.timelineHours.push({
                        value: hour,
                        label: `${String(hour).padStart(2, '0')}:00`,
                        isCurrent: this.isToday() && hour === currentHour,
                        tasks: hourTasks
                    });
                }
            },
            
            /**
             * 获取指定小时的任务
             */
            getHourTasks(hour) {
                return this.todayTasks.filter(task => {
                    const timeData = this.getTaskTimeData ? this.getTaskTimeData(task) : this.getDefaultTaskTimeData(task);
                    const startTime = timeData.startTime || '09:00';
                    const startHour = parseInt(startTime.split(':')[0]);
                    const duration = (timeData.estimatedHours || 1) * 60; // 转换为分钟
                    const endHour = startHour + Math.ceil(duration / 60);
                    
                    return hour >= startHour && hour < endHour;
                });
            },
            
            /**
             * 设置时间轴模式
             */
            setTimelineMode(mode) {
                this.timelineMode = mode;
            },
            
            /**
             * 获取任务状态
             */
            getTaskStatus(task) {
                const timeData = this.getTaskTimeData ? this.getTaskTimeData(task) : this.getDefaultTaskTimeData(task);
                return timeData.status || 'todo';
            },
            
            /**
             * 获取任务状态样式类
             */
            getTaskStatusClass(task) {
                return this.getTaskStatus(task);
            },
            
            /**
             * 获取任务优先级
             */
            getTaskPriority(task) {
                const timeData = this.getTaskTimeData ? this.getTaskTimeData(task) : this.getDefaultTaskTimeData(task);
                return timeData.priority || 'medium';
            },
            
            /**
             * 获取任务分类
             */
            getTaskCategory(task) {
                const timeData = this.getTaskTimeData ? this.getTaskTimeData(task) : this.getDefaultTaskTimeData(task);
                const categoryMap = {
                    'development': '开发',
                    'design': '设计',
                    'testing': '测试',
                    'deployment': '部署',
                    'optimization': '优化'
                };
                return categoryMap[timeData.category] || '其他';
            },
            
            /**
             * 获取任务时间范围
             */
            getTaskTimeRange(task) {
                const timeData = this.getTaskTimeData ? this.getTaskTimeData(task) : this.getDefaultTaskTimeData(task);
                const startTime = timeData.startTime || '09:00';
                const duration = (timeData.estimatedHours || 1) * 60; // 分钟
                
                const startParts = startTime.split(':');
                const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
                const endMinutes = startMinutes + duration;
                
                const endHour = Math.floor(endMinutes / 60);
                const endMin = endMinutes % 60;
                const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
                
                return `${startTime} - ${endTime}`;
            },
            
            /**
             * 获取任务持续时间（分钟）
             */
            getTaskDuration(task) {
                const timeData = this.getTaskTimeData ? this.getTaskTimeData(task) : this.getDefaultTaskTimeData(task);
                return (timeData.estimatedHours || 1) * 60;
            },
            
            /**
             * 获取任务进度
             */
            getTaskProgress(task) {
                const timeData = this.getTaskTimeData ? this.getTaskTimeData(task) : this.getDefaultTaskTimeData(task);
                return timeData.progress || 0;
            },
            
            /**
             * 获取任务已花费时间
             */
            getTaskSpentTime(task) {
                const timeData = this.getTaskTimeData ? this.getTaskTimeData(task) : this.getDefaultTaskTimeData(task);
                return (timeData.actualHours || 0) * 60;
            },
            
            /**
             * 获取时间进度百分比
             */
            getTimeProgress() {
                if (this.dailyStats.plannedHours === 0) return 0;
                return Math.round((this.dailyStats.actualHours / this.dailyStats.plannedHours) * 100);
            },
            
            /**
             * 格式化时间
             */
            formatTime(minutes) {
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
            },
            
            /**
             * 切换专注计时器
             */
            toggleFocusTimer() {
                if (this.isTimerRunning) {
                    this.stopFocusTimer();
                } else {
                    this.startFocusTimer();
                }
            },
            
            /**
             * 开始专注计时
             */
            startFocusTimer() {
                this.isTimerRunning = true;
                this.focusTimer = setInterval(() => {
                    this.currentFocusTime++;
                }, 60000); // 每分钟更新
                
                console.log('[专注计时] 开始计时');
            },
            
            /**
             * 停止专注计时
             */
            stopFocusTimer() {
                this.isTimerRunning = false;
                if (this.focusTimer) {
                    clearInterval(this.focusTimer);
                    this.focusTimer = null;
                }
                
                console.log('[专注计时] 停止计时，总计：', this.currentFocusTime, '分钟');
            },
            
            /**
             * 开始时间跟踪
             */
            startTimeTracker() {
                // 这里可以实现更复杂的时间跟踪功能
                this.toggleFocusTimer();
            },
            
            /**
             * 切换任务计时器
             */
            toggleTaskTimer(task) {
                const timerId = this.getTaskTimerId(task);
                
                if (this.isTaskTimerRunning(task)) {
                    this.stopTaskTimer(task);
                } else {
                    this.startTaskTimer(task);
                }
            },
            
            /**
             * 获取任务计时器ID
             */
            getTaskTimerId(task) {
                return task.key || task.title;
            },
            
            /**
             * 判断任务计时器是否运行
             */
            isTaskTimerRunning(task) {
                const timerId = this.getTaskTimerId(task);
                return this.taskTimers.has(timerId);
            },
            
            /**
             * 开始任务计时
             */
            startTaskTimer(task) {
                const timerId = this.getTaskTimerId(task);
                const startTime = Date.now();
                
                const timer = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - startTime) / 60000); // 分钟
                    console.log(`[任务计时] ${task.title}: ${elapsed}分钟`);
                }, 60000);
                
                this.taskTimers.set(timerId, {
                    timer,
                    startTime,
                    task
                });
                
                // 更新任务状态为进行中
                this.updateTaskStatus(task, 'in-progress');
                
                console.log(`[任务计时] 开始计时：${task.title}`);
            },
            
            /**
             * 停止任务计时
             */
            stopTaskTimer(task) {
                const timerId = this.getTaskTimerId(task);
                const timerData = this.taskTimers.get(timerId);
                
                if (timerData) {
                    clearInterval(timerData.timer);
                    const elapsed = Math.floor((Date.now() - timerData.startTime) / 60000); // 分钟
                    const elapsedHours = elapsed / 60;
                    
                    // 更新任务实际用时
                    const timeData = this.getTaskTimeData ? this.getTaskTimeData(task) : this.getDefaultTaskTimeData(task);
                    const newActualHours = (timeData.actualHours || 0) + elapsedHours;
                    
                    this.updateTaskTimeData(task, {
                        actualHours: newActualHours
                    });
                    
                    this.taskTimers.delete(timerId);
                    
                    console.log(`[任务计时] 停止计时：${task.title}，用时：${elapsed}分钟`);
                }
            },
            
            /**
             * 标记任务完成
             */
            markTaskComplete(task) {
                // 如果任务正在计时，先停止计时
                if (this.isTaskTimerRunning(task)) {
                    this.stopTaskTimer(task);
                }
                
                // 更新任务状态和进度
                this.updateTaskStatus(task, 'completed');
                this.updateTaskTimeData(task, {
                    progress: 100
                });
                
                console.log(`[任务完成] ${task.title}`);
            },
            
            /**
             * 更新任务状态
             */
            updateTaskStatus(task, status) {
                const timeData = this.getTaskTimeData ? this.getTaskTimeData(task) : this.getDefaultTaskTimeData(task);
                this.updateTaskTimeData(task, {
                    ...timeData,
                    status: status
                });
            },
            
            /**
             * 更新任务时间数据
             */
            updateTaskTimeData(task, timeData) {
                this.$emit('task-update', {
                    task: task,
                    timeData: timeData
                });
            },
            
            /**
             * 选择任务
             */
            selectTask(task) {
                this.$emit('task-select', task);
            },
            
            /**
             * 编辑任务
             */
            editTask(task) {
                this.selectTask(task);
            },
            
            /**
             * 添加任务到指定小时
             */
            addTaskToHour(hour) {
                this.quickTask.startTime = `${String(hour.value).padStart(2, '0')}:00`;
                this.showQuickTaskModal = true;
                
                this.$nextTick(() => {
                    this.$refs.quickTaskTitle?.focus();
                });
            },
            
            /**
             * 显示快速添加任务弹窗
             */
            addQuickTask() {
                this.quickTask = {
                    title: '',
                    description: '',
                    startTime: this.getCurrentTime(),
                    duration: 60,
                    priority: 'medium'
                };
                
                this.showQuickTaskModal = true;
                
                this.$nextTick(() => {
                    this.$refs.quickTaskTitle?.focus();
                });
            },
            
            /**
             * 关闭快速添加任务弹窗
             */
            closeQuickTaskModal() {
                this.showQuickTaskModal = false;
            },
            
            /**
             * 创建快速任务
             */
            createQuickTask() {
                if (!this.quickTask.title.trim()) {
                    alert('请输入任务标题');
                    return;
                }
                
                const newTask = {
                    title: this.quickTask.title.trim(),
                    description: this.quickTask.description.trim(),
                    timeData: {
                        startDate: this.currentDateStr,
                        endDate: this.currentDateStr,
                        startTime: this.quickTask.startTime,
                        estimatedHours: this.quickTask.duration / 60,
                        actualHours: 0,
                        priority: this.quickTask.priority,
                        status: 'todo',
                        progress: 0,
                        category: 'development'
                    },
                    key: Date.now().toString(36) + Math.random().toString(36).substr(2)
                };
                
                this.$emit('task-create', newTask);
                this.closeQuickTaskModal();
                
                console.log('[快速添加] 任务已创建：', newTask.title);
            },
            
            /**
             * 加载日报总结
             */
            loadDailySummary() {
                const summaryKey = `daily_summary_${this.currentDateStr}`;
                const saved = localStorage.getItem(summaryKey);
                
                if (saved) {
                    try {
                        this.dailySummary = JSON.parse(saved);
                    } catch (error) {
                        console.error('[日报总结] 加载失败:', error);
                    }
                } else {
                    this.dailySummary = {
                        achievements: '',
                        issues: '',
                        tomorrowPlan: ''
                    };
                }
            },
            
            /**
             * 保存日报总结
             */
            saveDailySummary() {
                const summaryKey = `daily_summary_${this.currentDateStr}`;
                localStorage.setItem(summaryKey, JSON.stringify(this.dailySummary));
                
                console.log('[日报总结] 已保存');
                // 可以显示保存成功的提示
            },
            
            /**
             * 清空总结
             */
            clearSummary() {
                if (confirm('确定要清空今日总结吗？')) {
                    this.dailySummary = {
                        achievements: '',
                        issues: '',
                        tomorrowPlan: ''
                    };
                }
            },
            
            /**
             * 导出日报
             */
            exportDailyReport() {
                const reportData = {
                    date: this.currentDateStr,
                    dateDisplay: this.formatCurrentDate(),
                    stats: this.dailyStats,
                    tasks: this.todayTasks.map(task => ({
                        title: task.title,
                        status: this.getTaskStatus(task),
                        timeRange: this.getTaskTimeRange(task),
                        duration: this.getTaskDuration(task),
                        progress: this.getTaskProgress(task),
                        spentTime: this.getTaskSpentTime(task)
                    })),
                    summary: this.dailySummary,
                    focusTime: this.currentFocusTime,
                    exportTime: new Date().toISOString()
                };
                
                const blob = new Blob([JSON.stringify(reportData, null, 2)], {
                    type: 'application/json'
                });
                
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `日报_${this.currentDateStr}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                console.log('[日报导出] 日报数据已导出');
            },
            
            /**
             * 刷新日报数据
             */
            refreshDailyData() {
                this.updateDailyData();
                console.log('[日报刷新] 数据已刷新');
            },
            
            /**
             * 加载任务数据
             */
            loadTasksData() {
                this.$emit('load-tasks-data');
            },
            
            /**
             * 获取默认任务时间数据
             */
            getDefaultTaskTimeData(task) {
                if (!task.timeData) {
                    const now = new Date();
                    const startDate = new Date(now);
                    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    
                    return {
                        startDate: startDate.toISOString().split('T')[0],
                        endDate: endDate.toISOString().split('T')[0],
                        estimatedHours: 8,
                        actualHours: 0,
                        priority: 'medium',
                        status: 'todo',
                        progress: 0,
                        dependencies: [],
                        category: 'development',
                        assignee: '',
                        tags: task.tags || [],
                        createdAt: now.toISOString(),
                        updatedAt: now.toISOString()
                    };
                }
                return task.timeData;
            }
        },
        
        mounted() {
            console.log('[DailyReport] 日报组件已挂载');
            this.updateDailyData();
        },
        
        beforeUnmount() {
            // 清理计时器
            if (this.focusTimer) {
                clearInterval(this.focusTimer);
            }
            
            // 清理所有任务计时器
            this.taskTimers.forEach(timerData => {
                clearInterval(timerData.timer);
            });
            this.taskTimers.clear();
        },
        
        template: template
    };
};

// 初始化组件并全局暴露
(async function initComponent() {
    try {
        const DailyReport = await createDailyReport();
        window.DailyReport = DailyReport;
        
        // 触发自定义事件，通知组件已加载完成
        window.dispatchEvent(new CustomEvent('DailyReportLoaded', { detail: DailyReport }));
        console.log('[DailyReport] 日报组件加载完成');
    } catch (error) {
        console.error('DailyReport 组件初始化失败:', error);
    }
})();



