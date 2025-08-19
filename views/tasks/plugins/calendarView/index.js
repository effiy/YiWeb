// 日历视图组件 - 优化版本
const createCalendarView = () => {
    return {
        name: 'CalendarView',
        template: `
            <div class="calendar-view">
                <div class="calendar-header">
                    <h2 class="calendar-title">
                        <i class="fas fa-calendar-alt"></i>
                        日历视图
                    </h2>
                    <div class="calendar-controls">
                        <button class="calendar-nav-btn" @click="previousMonth" title="上个月">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <div class="calendar-current-month">{{ currentMonthYear }}</div>
                        <button class="calendar-nav-btn" @click="nextMonth" title="下个月">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                        <button class="calendar-nav-btn today-btn" @click="goToToday" title="回到今天">
                            <i class="fas fa-calendar-day"></i>
                        </button>
                    </div>
                </div>
                
                <div class="calendar-body">
                    <div class="calendar-grid">
                        <!-- 星期标题 -->
                        <div class="calendar-weekday-header" v-for="day in weekdays" :key="day">
                            {{ day }}
                        </div>
                        
                        <!-- 日历日期 -->
                        <div 
                            v-for="date in calendarDates" 
                            :key="date.key"
                            class="calendar-day"
                            :class="{
                                'other-month': !date.isCurrentMonth,
                                'today': date.isToday,
                                'has-tasks': getTasksForDate(date.date).length > 0,
                                'weekend': date.isWeekend
                            }"
                            @click="selectDate(date)"
                            @dragover.prevent
                            @drop="handleTaskDrop($event, date.date)"
                        >
                            <div class="calendar-day-header">
                                <div class="calendar-day-number">{{ date.day }}</div>
                                <div class="calendar-day-indicators">
                                    <div v-if="getTasksForDate(date.date).length > 0" 
                                         class="task-count-badge">
                                        {{ getTasksForDate(date.date).length }}
                                    </div>
                                    <div v-if="hasOverdueTasks(date.date)" 
                                         class="overdue-indicator">
                                        <i class="fas fa-exclamation-triangle"></i>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="calendar-tasks">
                                <div 
                                    v-for="(task, index) in getVisibleTasksForDate(date.date)" 
                                    :key="task.id || task.key || index"
                                    class="calendar-task"
                                    :class="[
                                        'priority-' + (task.priority || 'none'),
                                        'status-' + (task.status || 'todo'),
                                        { 'overdue': isTaskOverdue(task) }
                                    ]"
                                    @click.stop="selectTask(task)"
                                    :title="getTaskTooltip(task)"
                                    draggable="true"
                                    @dragstart="handleTaskDragStart($event, task)"
                                >
                                    <div class="task-content">
                                        <span class="task-title">{{ task.title }}</span>
                                        <div class="task-meta">
                                            <span v-if="task.priority" class="priority-dot"></span>
                                            <span v-if="task.dueDate" class="due-time">
                                                {{ formatTime(task.dueDate) }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div 
                                    v-if="getTasksForDate(date.date).length > 3"
                                    class="calendar-more-tasks"
                                    @click.stop="showMoreTasks(date.date)"
                                >
                                    +{{ getTasksForDate(date.date).length - 3 }} 更多
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="calendar-footer">
                    <div class="calendar-stats">
                        <div class="calendar-stat">
                            <i class="fas fa-tasks calendar-stat-icon"></i>
                            <span>总任务: {{ totalTasks }}</span>
                        </div>
                        <div class="calendar-stat">
                            <i class="fas fa-check-circle calendar-stat-icon completed"></i>
                            <span>已完成: {{ completedTasks }}</span>
                        </div>
                        <div class="calendar-stat">
                            <i class="fas fa-clock calendar-stat-icon in-progress"></i>
                            <span>进行中: {{ inProgressTasks }}</span>
                        </div>
                        <div class="calendar-stat">
                            <i class="fas fa-exclamation-triangle calendar-stat-icon overdue"></i>
                            <span>逾期: {{ overdueTasks }}</span>
                        </div>
                    </div>
                    
                    <div class="calendar-view-mode">
                        <button 
                            class="view-mode-btn"
                            :class="{ active: viewMode === 'month' }"
                            @click="setViewMode('month')"
                        >
                            <i class="fas fa-calendar-alt"></i>
                            月视图
                        </button>
                        <button 
                            class="view-mode-btn"
                            :class="{ active: viewMode === 'week' }"
                            @click="setViewMode('week')"
                        >
                            <i class="fas fa-calendar-week"></i>
                            周视图
                        </button>
                        <button 
                            class="view-mode-btn"
                            @click="refreshCalendar"
                            title="刷新日历"
                        >
                            <i class="fas fa-sync-alt"></i>
                            刷新
                        </button>
                    </div>
                </div>
                
                <!-- 任务详情弹窗 -->
                <div v-if="selectedTask" class="task-detail-modal" @click="closeTaskDetail">
                    <div class="task-detail-content" @click.stop>
                        <div class="task-detail-header">
                            <h3>{{ selectedTask.title }}</h3>
                            <button class="close-btn" @click="closeTaskDetail">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="task-detail-body">
                            <div class="task-info-row">
                                <span class="label">状态:</span>
                                <span class="value status-{{ selectedTask.status }}">
                                    {{ getStatusText(selectedTask.status) }}
                                </span>
                            </div>
                            <div class="task-info-row">
                                <span class="label">优先级:</span>
                                <span class="value priority-{{ selectedTask.priority }}">
                                    {{ getPriorityText(selectedTask.priority) }}
                                </span>
                            </div>
                            <div v-if="selectedTask.dueDate" class="task-info-row">
                                <span class="label">截止日期:</span>
                                <span class="value">{{ formatDate(selectedTask.dueDate) }}</span>
                            </div>
                            <div v-if="selectedTask.description" class="task-info-row">
                                <span class="label">描述:</span>
                                <span class="value">{{ selectedTask.description }}</span>
                            </div>
                        </div>
                        <div class="task-detail-actions">
                            <button @click="editTask(selectedTask)" class="action-btn edit">
                                <i class="fas fa-edit"></i>
                                编辑
                            </button>
                            <button @click="deleteTask(selectedTask)" class="action-btn delete">
                                <i class="fas fa-trash"></i>
                                删除
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `,
        props: {
            tasks: {
                type: Array,
                default: () => []
            }
        },
        emits: ['task-select', 'task-update', 'task-delete', 'task-edit'],
        data() {
            return {
                currentDate: new Date(),
                viewMode: 'month',
                weekdays: ['日', '一', '二', '三', '四', '五', '六'],
                selectedTask: null,
                selectedDate: null,
                draggedTask: null,
                taskCache: new Map(), // 任务缓存
                lastUpdateTime: 0
            };
        },
        computed: {
            currentMonthYear() {
                const year = this.currentDate.getFullYear();
                const month = this.currentDate.getMonth();
                const monthNames = [
                    '一月', '二月', '三月', '四月', '五月', '六月',
                    '七月', '八月', '九月', '十月', '十一月', '十二月'
                ];
                return `${year}年 ${monthNames[month]}`;
            },
            calendarDates() {
                const year = this.currentDate.getFullYear();
                const month = this.currentDate.getMonth();
                
                // 获取当月第一天和最后一天
                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                
                // 获取当月第一天是星期几（0-6，0是星期日）
                const firstDayWeekday = firstDay.getDay();
                
                // 获取当月天数
                const daysInMonth = lastDay.getDate();
                
                // 获取上个月最后几天
                const prevMonthLastDay = new Date(year, month, 0);
                const daysInPrevMonth = prevMonthLastDay.getDate();
                
                const dates = [];
                
                // 添加上个月的日期
                for (let i = firstDayWeekday - 1; i >= 0; i--) {
                    const day = daysInPrevMonth - i;
                    const date = new Date(year, month - 1, day);
                    dates.push({
                        date: date,
                        day: day,
                        isCurrentMonth: false,
                        isToday: this.isToday(date),
                        isWeekend: this.isWeekend(date),
                        key: `prev-${day}`
                    });
                }
                
                // 添加当月的日期
                for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, month, day);
                    dates.push({
                        date: date,
                        day: day,
                        isCurrentMonth: true,
                        isToday: this.isToday(date),
                        isWeekend: this.isWeekend(date),
                        key: `current-${day}`
                    });
                }
                
                // 添加下个月的日期，确保总共有42个格子（6行7列）
                const remainingSlots = 42 - dates.length;
                for (let day = 1; day <= remainingSlots; day++) {
                    const date = new Date(year, month + 1, day);
                    dates.push({
                        date: date,
                        day: day,
                        isCurrentMonth: false,
                        isToday: this.isToday(date),
                        isWeekend: this.isWeekend(date),
                        key: `next-${day}`
                    });
                }
                
                return dates;
            },
            totalTasks() {
                return this.tasks ? this.tasks.length : 0;
            },
            completedTasks() {
                return this.tasks ? this.tasks.filter(task => task.status === 'completed').length : 0;
            },
            inProgressTasks() {
                return this.tasks ? this.tasks.filter(task => task.status === 'in_progress').length : 0;
            },
            overdueTasks() {
                if (!this.tasks) return 0;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return this.tasks.filter(task => {
                    if (task.status === 'completed') return false;
                    if (!task.dueDate) return false;
                    const dueDate = new Date(task.dueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    return dueDate < today;
                }).length;
            }
        },
        watch: {
            tasks: {
                handler(newTasks) {
                    console.log('[CalendarView] 任务数据变化:', newTasks ? newTasks.length : 0);
                    this.clearTaskCache();
                    this.lastUpdateTime = Date.now();
                },
                immediate: true
            }
        },
        mounted() {
            console.log('[CalendarView] 组件已挂载，任务数量:', this.tasks ? this.tasks.length : 0);
            this.goToToday();
            this.setupKeyboardNavigation();
        },
        beforeUnmount() {
            this.removeKeyboardNavigation();
        },
        methods: {
            // 导航方法
            previousMonth() {
                this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
                this.clearTaskCache();
            },
            nextMonth() {
                this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
                this.clearTaskCache();
            },
            goToToday() {
                this.currentDate = new Date();
                this.clearTaskCache();
            },
            
            // 日期判断方法
            isToday(date) {
                const today = new Date();
                return date.getDate() === today.getDate() &&
                       date.getMonth() === today.getMonth() &&
                       date.getFullYear() === today.getFullYear();
            },
            isWeekend(date) {
                const day = date.getDay();
                return day === 0 || day === 6;
            },
            
            // 任务获取方法（优化版本）
            getTasksForDate(date) {
                const cacheKey = this.getCacheKey(date);
                if (this.taskCache.has(cacheKey)) {
                    return this.taskCache.get(cacheKey);
                }
                
                if (!this.tasks || !Array.isArray(this.tasks)) {
                    return [];
                }
                
                const targetDate = new Date(date);
                targetDate.setHours(0, 0, 0, 0);
                
                const nextDate = new Date(targetDate);
                nextDate.setDate(nextDate.getDate() + 1);
                
                const filteredTasks = this.tasks.filter(task => {
                    // 检查任务开始日期
                    if (task.startDate) {
                        const startDate = new Date(task.startDate);
                        startDate.setHours(0, 0, 0, 0);
                        if (startDate <= targetDate && startDate < nextDate) {
                            return true;
                        }
                    }
                    
                    // 检查任务截止日期
                    if (task.dueDate) {
                        const dueDate = new Date(task.dueDate);
                        dueDate.setHours(0, 0, 0, 0);
                        if (dueDate >= targetDate && dueDate < nextDate) {
                            return true;
                        }
                    }
                    
                    // 检查任务创建日期
                    if (task.createdAt) {
                        const createdDate = new Date(task.createdAt);
                        createdDate.setHours(0, 0, 0, 0);
                        if (createdDate <= targetDate && createdDate < nextDate) {
                            return true;
                        }
                    }
                    
                    // 检查任务计划日期
                    if (task.plannedDate) {
                        const plannedDate = new Date(task.plannedDate);
                        plannedDate.setHours(0, 0, 0, 0);
                        if (plannedDate <= targetDate && plannedDate < nextDate) {
                            return true;
                        }
                    }
                    
                    return false;
                });
                
                // 缓存结果
                this.taskCache.set(cacheKey, filteredTasks);
                return filteredTasks;
            },
            
            getVisibleTasksForDate(date) {
                const tasks = this.getTasksForDate(date);
                return tasks.slice(0, 3); // 只显示前3个任务
            },
            
            // 缓存管理
            getCacheKey(date) {
                return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            },
            
            clearTaskCache() {
                this.taskCache.clear();
            },
            
            // 任务状态判断
            isTaskOverdue(task) {
                if (task.status === 'completed' || !task.dueDate) return false;
                const dueDate = new Date(task.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dueDate.setHours(0, 0, 0, 0);
                return dueDate < today;
            },
            
            hasOverdueTasks(date) {
                const tasks = this.getTasksForDate(date);
                return tasks.some(task => this.isTaskOverdue(task));
            },
            
            // 交互方法
            selectDate(date) {
                this.selectedDate = date;
                console.log('[CalendarView] 选择日期:', date);
            },
            
            selectTask(task) {
                console.log('[CalendarView] 选择任务:', task);
                this.selectedTask = task;
                this.$emit('task-select', task);
            },
            
            closeTaskDetail() {
                this.selectedTask = null;
            },
            
            showMoreTasks(date) {
                const tasks = this.getTasksForDate(date);
                console.log(`[CalendarView] ${date.toDateString()} 的所有任务:`, tasks);
                // 这里可以触发显示更多任务的弹窗或详情面板
            },
            
            // 拖拽功能
            handleTaskDragStart(event, task) {
                this.draggedTask = task;
                event.dataTransfer.setData('text/plain', JSON.stringify(task));
                event.dataTransfer.effectAllowed = 'move';
            },
            
            handleTaskDrop(event, targetDate) {
                event.preventDefault();
                if (!this.draggedTask) return;
                
                console.log('[CalendarView] 拖拽任务到日期:', targetDate);
                // 这里可以触发任务日期更新
                this.$emit('task-update', {
                    ...this.draggedTask,
                    dueDate: targetDate
                });
                
                this.draggedTask = null;
                this.clearTaskCache();
            },
            
            // 视图模式
            setViewMode(mode) {
                this.viewMode = mode;
                console.log('[CalendarView] 切换到视图模式:', mode);
            },
            
            // 刷新功能
            refreshCalendar() {
                this.clearTaskCache();
                this.$forceUpdate();
                console.log('[CalendarView] 日历已刷新');
            },
            
            // 键盘导航
            setupKeyboardNavigation() {
                document.addEventListener('keydown', this.handleKeyboardNavigation);
            },
            
            removeKeyboardNavigation() {
                document.removeEventListener('keydown', this.handleKeyboardNavigation);
            },
            
            handleKeyboardNavigation(event) {
                switch(event.key) {
                    case 'ArrowLeft':
                        event.preventDefault();
                        this.previousMonth();
                        break;
                    case 'ArrowRight':
                        event.preventDefault();
                        this.nextMonth();
                        break;
                    case 'Home':
                        event.preventDefault();
                        this.goToToday();
                        break;
                }
            },
            
            // 工具方法
            getTaskTooltip(task) {
                let tooltip = task.title;
                if (task.description) {
                    tooltip += `\n${task.description}`;
                }
                if (task.dueDate) {
                    tooltip += `\n截止: ${this.formatDate(task.dueDate)}`;
                }
                return tooltip;
            },
            
            formatDate(date) {
                if (!date) return '';
                const d = new Date(date);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            },
            
            formatTime(date) {
                if (!date) return '';
                const d = new Date(date);
                return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            },
            
            getStatusText(status) {
                const statusMap = {
                    'todo': '待办',
                    'in_progress': '进行中',
                    'completed': '已完成',
                    'cancelled': '已取消'
                };
                return statusMap[status] || status;
            },
            
            getPriorityText(priority) {
                const priorityMap = {
                    'low': '低',
                    'medium': '中',
                    'high': '高',
                    'critical': '紧急'
                };
                return priorityMap[priority] || priority;
            },
            
            editTask(task) {
                this.$emit('task-edit', task);
                this.closeTaskDetail();
            },
            
            deleteTask(task) {
                if (confirm(`确定要删除任务 "${task.title}" 吗？`)) {
                    this.$emit('task-delete', task);
                    this.closeTaskDetail();
                }
            }
        }
    };
};

window.CalendarView = createCalendarView();
console.log('[CalendarView] 优化版组件已加载');

