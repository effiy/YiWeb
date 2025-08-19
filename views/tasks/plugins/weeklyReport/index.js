// 周报组件 - 负责周报视图的显示和交互功能

// 模块依赖改为全局方式
// import { loadCSSFiles } from '/utils/baseView.js';

// 等待DOM加载完成后再加载CSS文件
function loadWeeklyReportCSS() {
    if (typeof window.loadCSSFiles === 'function') {
        window.loadCSSFiles([
            '/views/tasks/plugins/weeklyReport/index.css'
        ]);
    } else {
        // 如果函数未定义，延迟重试
        setTimeout(loadWeeklyReportCSS, 100);
    }
}

// 在DOM加载完成后执行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadWeeklyReportCSS);
} else {
    loadWeeklyReportCSS();
}

// 异步加载HTML模板
async function loadTemplate() {
    try {
        const response = await fetch('/views/tasks/plugins/weeklyReport/index.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error('加载周报模板失败:', error);
        return '<div class="weekly-error">周报模板加载失败</div>';
    }
}

const createWeeklyReport = async () => {
    const template = await loadTemplate();
    
    return {
        name: 'WeeklyReport',
        props: {
            tasks: {
                type: Array,
                default: () => []
            },
            currentView: {
                type: String,
                default: 'weekly'
            },
            selectedTask: {
                type: Object,
                default: null
            }
        },
        
        emits: ['task-select', 'load-tasks-data'],
        
        data() {
            return {
                // 当前周信息
                currentWeek: this.getCurrentWeek(),
                currentWeekStart: this.getCurrentWeekStart(),
                currentWeekEnd: this.getCurrentWeekEnd(),
                
                // 视图模式
                dailyViewMode: 'grid', // grid or list
                
                // 周报数据
                weeklyStats: {
                    totalTasks: 0,
                    completedTasks: 0,
                    inProgressTasks: 0,
                    pendingTasks: 0,
                    overdueTasks: 0,
                    totalHours: 0
                },
                
                // 周天数据
                weekDays: [],
                
                // 图表数据
                statusLegend: [],
                
                // 周报总结
                weeklyAchievements: [],
                weeklyImprovements: [],
                nextWeekPlans: []
            };
        },
        
        computed: {
            /**
             * 是否显示周报
             */
            showWeeklyReport() {
                return this.currentView === 'weekly';
            },
            
            /**
             * 当前周范围显示
             */
            currentWeekRange() {
                const start = this.currentWeekStart;
                const end = this.currentWeekEnd;
                return `${this.formatDate(start)} - ${this.formatDate(end)}`;
            },
            
            /**
             * 当前周的任务
             */
            currentWeekTasks() {
                if (!this.tasks || this.tasks.length === 0) {
                    console.log('[WeeklyReport] 任务数据为空');
                    return [];
                }
                
                const weekStart = new Date(this.currentWeekStart);
                const weekEnd = new Date(this.currentWeekEnd);
                weekEnd.setHours(23, 59, 59, 999);
                
                console.log('[WeeklyReport] 筛选周任务:', {
                    weekStart: weekStart.toISOString(),
                    weekEnd: weekEnd.toISOString(),
                    totalTasks: this.tasks.length
                });
                
                return this.tasks.filter(task => {
                    // 使用任务的startDate或createdAt作为开始时间
                    const taskStart = task.startDate ? new Date(task.startDate) : new Date(task.createdAt);
                    // 使用任务的dueDate或endDate作为结束时间，如果没有则使用开始时间
                    const taskEnd = task.dueDate ? new Date(task.dueDate) : 
                                  task.endDate ? new Date(task.endDate) : taskStart;
                    
                    // 任务与当前周有交集
                    const hasOverlap = taskStart <= weekEnd && taskEnd >= weekStart;
                    
                    if (hasOverlap) {
                        console.log('[WeeklyReport] 匹配任务:', {
                            title: task.title,
                            startDate: taskStart.toISOString(),
                            endDate: taskEnd.toISOString()
                        });
                    }
                    
                    return hasOverlap;
                });
            }
        },
        
        watch: {
            tasks: {
                handler(newTasks) {
                    console.log('[WeeklyReport] 任务数据变化:', {
                        newTasksCount: newTasks?.length || 0,
                        currentView: this.currentView
                    });
                    if (this.currentView === 'weekly') {
                        this.calculateWeeklyStats();
                        this.calculateWeekDays();
                        this.updateChartData();
                    }
                },
                deep: true,
                immediate: true
            },
            currentWeekTasks: {
                handler() {
                    this.calculateWeeklyStats();
                    this.calculateWeekDays();
                    this.updateChartData();
                },
                deep: true,
                immediate: true
            }
        },
        
        mounted() {
            console.log('[WeeklyReport] 组件已挂载:', {
                tasksCount: this.tasks?.length || 0,
                currentView: this.currentView,
                props: this.$props
            });
            
            // 确保数据已加载
            if (this.tasks && this.tasks.length > 0) {
                this.calculateWeeklyStats();
                this.calculateWeekDays();
                this.updateChartData();
            } else {
                console.warn('[WeeklyReport] 组件挂载时任务数据为空');
            }
        },
        
        methods: {
            /**
             * 获取当前周数
             */
            getCurrentWeek() {
                const now = new Date();
                const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
                const pastDaysOfYear = (now - firstDayOfYear) / 86400000;
                return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
            },
            
            /**
             * 获取当前周开始日期
             */
            getCurrentWeekStart() {
                const now = new Date();
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 周一开始
                const monday = new Date(now.setDate(diff));
                monday.setHours(0, 0, 0, 0);
                return monday;
            },
            
            /**
             * 获取当前周结束日期
             */
            getCurrentWeekEnd() {
                const start = this.getCurrentWeekStart();
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                return end;
            },
            
            /**
             * 获取任务状态
             */
            getTaskStatus(task) {
                // 检查是否逾期
                if (task.dueDate && new Date(task.dueDate) < new Date()) {
                    return 'overdue';
                }
                return task.status || 'todo';
            },
            
            /**
             * 格式化日期
             */
            formatDate(date) {
                return new Intl.DateTimeFormat('zh-CN', {
                    month: 'numeric',
                    day: 'numeric'
                }).format(date);
            },
            
            /**
             * 格式化完整日期
             */
            formatFullDate(date) {
                return new Intl.DateTimeFormat('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                }).format(date);
            },
            
            /**
             * 上一周
             */
            previousWeek() {
                this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
                this.currentWeekEnd.setDate(this.currentWeekEnd.getDate() - 7);
                this.currentWeek--;
                this.calculateWeeklyStats();
                this.calculateWeekDays();
            },
            
            /**
             * 下一周
             */
            nextWeek() {
                this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
                this.currentWeekEnd.setDate(this.currentWeekEnd.getDate() + 7);
                this.currentWeek++;
                this.calculateWeeklyStats();
                this.calculateWeekDays();
            },
            
            /**
             * 回到本周
             */
            goToCurrentWeek() {
                this.currentWeek = this.getCurrentWeek();
                this.currentWeekStart = this.getCurrentWeekStart();
                this.currentWeekEnd = this.getCurrentWeekEnd();
                this.calculateWeeklyStats();
                this.calculateWeekDays();
            },
            
            /**
             * 计算周统计数据
             */
            calculateWeeklyStats() {
                const tasks = this.currentWeekTasks;
                
                console.log('[WeeklyReport] 计算周统计:', {
                    totalTasks: tasks.length,
                    tasks: tasks.map(t => ({ id: t.id, title: t.title, status: t.status }))
                });
                
                this.weeklyStats = {
                    totalTasks: tasks.length,
                    completedTasks: 0,
                    inProgressTasks: 0,
                    pendingTasks: 0,
                    overdueTasks: 0,
                    totalHours: 0
                };
                
                tasks.forEach(task => {
                    const status = this.getTaskStatus(task);
                    
                    switch (status) {
                        case 'completed':
                            this.weeklyStats.completedTasks++;
                            break;
                        case 'in_progress':
                            this.weeklyStats.inProgressTasks++;
                            break;
                        case 'overdue':
                            this.weeklyStats.overdueTasks++;
                            break;
                        default:
                            this.weeklyStats.pendingTasks++;
                    }
                    
                    // 使用任务的estimatedHours和actualHours
                    this.weeklyStats.totalHours += (task.actualHours || task.estimatedHours || 0);
                });
                
                console.log('[WeeklyReport] 统计结果:', this.weeklyStats);
            },
            
            /**
             * 计算每日数据
             */
            calculateWeekDays() {
                this.weekDays = [];
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                for (let i = 0; i < 7; i++) {
                    const date = new Date(this.currentWeekStart);
                    date.setDate(date.getDate() + i);
                    
                    const dayTasks = this.getDayTasks(date);
                    const dayStats = this.calculateDayStats(dayTasks);
                    
                    this.weekDays.push({
                        key: date.toISOString().split('T')[0],
                        name: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][i],
                        date: new Date(date),
                        isToday: date.getTime() === today.getTime(),
                        isWeekend: i >= 5,
                        tasks: dayTasks,
                        completionRate: dayStats.completionRate,
                        spentHours: dayStats.spentHours,
                        estimatedHours: dayStats.estimatedHours
                    });
                }
            },
            
            /**
             * 获取指定日期的任务
             */
            getDayTasks(date) {
                const dateStr = date.toISOString().split('T')[0];
                
                return this.currentWeekTasks.filter(task => {
                    const timeData = this.getTaskTimeData(task);
                    const taskStart = new Date(timeData.startDate);
                    const taskEnd = new Date(timeData.endDate);
                    
                    return taskStart <= date && taskEnd >= date;
                });
            },
            
            /**
             * 计算单日统计
             */
            calculateDayStats(tasks) {
                let completedTasks = 0;
                let spentHours = 0;
                let estimatedHours = 0;
                
                tasks.forEach(task => {
                    const timeData = this.getTaskTimeData(task);
                    const status = this.getTaskStatus(task);
                    
                    if (status === 'completed') {
                        completedTasks++;
                    }
                    
                    spentHours += timeData.actualHours || 0;
                    estimatedHours += timeData.estimatedHours || 0;
                });
                
                const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
                
                return {
                    completionRate,
                    spentHours,
                    estimatedHours
                };
            },
            
            /**
             * 获取任务状态
             */
            getTaskStatus(task) {
                const timeData = this.getTaskTimeData(task);
                const now = new Date();
                const endDate = new Date(timeData.endDate);
                
                if (timeData.status === 'completed') {
                    return 'completed';
                } else if (timeData.status === 'in-progress') {
                    return 'in-progress';
                } else if (endDate < now) {
                    return 'overdue';
                } else {
                    return 'pending';
                }
            },
            
            /**
             * 获取任务优先级
             */
            getTaskPriority(task) {
                const timeData = this.getTaskTimeData(task);
                return timeData.priority || 'medium';
            },
            
            /**
             * 获取任务分类
             */
            getTaskCategory(task) {
                const timeData = this.getTaskTimeData(task);
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
             * 获取任务持续时间
             */
            getTaskDuration(task) {
                const timeData = this.getTaskTimeData(task);
                return timeData.estimatedHours || 0;
            },
            
            /**
             * 获取任务状态样式类
             */
            getTaskStatusClass(task) {
                return this.getTaskStatus(task);
            },
            
            /**
             * 获取任务状态图标
             */
            getTaskStatusIcon(task) {
                const status = this.getTaskStatus(task);
                const iconMap = {
                    'completed': 'fas fa-check-circle completed',
                    'in-progress': 'fas fa-play-circle in-progress',
                    'overdue': 'fas fa-exclamation-circle overdue',
                    'pending': 'fas fa-circle pending'
                };
                return iconMap[status] || iconMap.pending;
            },
            
            /**
             * 设置日视图模式
             */
            setDailyViewMode(mode) {
                this.dailyViewMode = mode;
            },
            
            /**
             * 选择任务
             */
            selectTask(task) {
                this.$emit('task-select', task);
            },
            
            /**
             * 获取完成率
             */
            getCompletionRate() {
                if (this.weeklyStats.totalTasks === 0) return 0;
                return Math.round((this.weeklyStats.completedTasks / this.weeklyStats.totalTasks) * 100);
            },
            
            /**
             * 获取进行中比率
             */
            getInProgressRate() {
                if (this.weeklyStats.totalTasks === 0) return 0;
                return Math.round((this.weeklyStats.inProgressTasks / this.weeklyStats.totalTasks) * 100);
            },
            
            /**
             * 获取待处理比率
             */
            getPendingRate() {
                if (this.weeklyStats.totalTasks === 0) return 0;
                return Math.round((this.weeklyStats.pendingTasks / this.weeklyStats.totalTasks) * 100);
            },
            
            /**
             * 获取逾期比率
             */
            getOverdueRate() {
                if (this.weeklyStats.totalTasks === 0) return 0;
                return Math.round((this.weeklyStats.overdueTasks / this.weeklyStats.totalTasks) * 100);
            },
            
            /**
             * 获取效率比率
             */
            getEfficiencyRate() {
                // 简单的效率计算：实际工时/估计工时的百分比
                const estimatedTotal = this.currentWeekTasks.reduce((sum, task) => {
                    const timeData = this.getTaskTimeData(task);
                    return sum + (timeData.estimatedHours || 0);
                }, 0);
                
                if (estimatedTotal === 0) return 0;
                return Math.round((this.weeklyStats.totalHours / estimatedTotal) * 100);
            },
            
            /**
             * 更新图表数据
             */
            updateChartData() {
                // 更新状态图例
                this.statusLegend = [
                    {
                        key: 'completed',
                        label: '已完成',
                        value: this.weeklyStats.completedTasks,
                        color: 'var(--success)'
                    },
                    {
                        key: 'in-progress',
                        label: '进行中',
                        value: this.weeklyStats.inProgressTasks,
                        color: 'var(--warning)'
                    },
                    {
                        key: 'pending',
                        label: '待开始',
                        value: this.weeklyStats.pendingTasks,
                        color: 'var(--info)'
                    },
                    {
                        key: 'overdue',
                        label: '已逾期',
                        value: this.weeklyStats.overdueTasks,
                        color: 'var(--error)'
                    }
                ];
                
                // 绘制饼图
                this.$nextTick(() => {
                    this.drawPieChart();
                });
            },
            
            /**
             * 绘制饼图
             */
            drawPieChart() {
                const canvas = this.$refs.statusPieChart?.querySelector('canvas');
                if (!canvas) return;
                
                const ctx = canvas.getContext('2d');
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const radius = Math.min(centerX, centerY) - 10;
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                const total = this.weeklyStats.totalTasks;
                if (total === 0) {
                    // 绘制空圆
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                    ctx.strokeStyle = '#e5e7eb';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    return;
                }
                
                let currentAngle = -Math.PI / 2;
                
                this.statusLegend.forEach(item => {
                    if (item.value > 0) {
                        const sliceAngle = (item.value / total) * 2 * Math.PI;
                        
                        ctx.beginPath();
                        ctx.moveTo(centerX, centerY);
                        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
                        ctx.closePath();
                        
                        // 获取颜色值
                        const tempDiv = document.createElement('div');
                        tempDiv.style.color = item.color;
                        document.body.appendChild(tempDiv);
                        const computedColor = getComputedStyle(tempDiv).color;
                        document.body.removeChild(tempDiv);
                        
                        ctx.fillStyle = computedColor;
                        ctx.fill();
                        
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                        
                        currentAngle += sliceAngle;
                    }
                });
            },
            
            /**
             * 导出周报
             */
            exportWeeklyReport() {
                const reportData = {
                    week: this.currentWeek,
                    dateRange: this.currentWeekRange,
                    stats: this.weeklyStats,
                    dailyData: this.weekDays,
                    achievements: this.weeklyAchievements,
                    improvements: this.weeklyImprovements,
                    nextWeekPlans: this.nextWeekPlans,
                    exportTime: new Date().toISOString()
                };
                
                const blob = new Blob([JSON.stringify(reportData, null, 2)], {
                    type: 'application/json'
                });
                
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `周报_第${this.currentWeek}周_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                console.log('[周报导出] 周报数据已导出');
            },
            
            /**
             * 打印周报
             */
            printWeeklyReport() {
                window.print();
            },
            
            /**
             * 刷新周报数据
             */
            refreshWeeklyData() {
                this.calculateWeeklyStats();
                this.calculateWeekDays();
                this.updateChartData();
                console.log('[周报刷新] 数据已刷新');
            },
            
            /**
             * 添加成就
             */
            addAchievement() {
                const achievement = prompt('请输入本周成就:');
                if (achievement && achievement.trim()) {
                    this.weeklyAchievements.push(achievement.trim());
                }
            },
            
            /**
             * 添加改进项
             */
            addImprovement() {
                const improvement = prompt('请输入待改进项:');
                if (improvement && improvement.trim()) {
                    this.weeklyImprovements.push(improvement.trim());
                }
            },
            
            /**
             * 添加下周计划
             */
            addNextWeekPlan() {
                const plan = prompt('请输入下周计划:');
                if (plan && plan.trim()) {
                    this.nextWeekPlans.push(plan.trim());
                }
            },
            
            /**
             * 加载任务数据
             */
            loadTasksData() {
                this.$emit('load-tasks-data');
            }
        },
        
        mounted() {
            console.log('[WeeklyReport] 周报组件已挂载');
            this.calculateWeeklyStats();
            this.calculateWeekDays();
            this.updateChartData();
        },
        
        template: template
    };
};

// 初始化组件并全局暴露
(async function initComponent() {
    try {
        const WeeklyReport = await createWeeklyReport();
        window.WeeklyReport = WeeklyReport;
        
        // 触发自定义事件，通知组件已加载完成
        window.dispatchEvent(new CustomEvent('WeeklyReportLoaded', { detail: WeeklyReport }));
        console.log('[WeeklyReport] 周报组件加载完成');
    } catch (error) {
        console.error('WeeklyReport 组件初始化失败:', error);
    }
})();

