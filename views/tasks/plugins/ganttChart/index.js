// 甘特图组件 - 负责甘特图视图的显示和交互功能

// 模块依赖改为全局方式
// import { loadCSSFiles } from '/utils/baseView.js';

// 等待DOM加载完成后再加载CSS文件
function loadGanttChartCSS() {
    if (typeof window.loadCSSFiles === 'function') {
        window.loadCSSFiles([
            '/views/tasks/plugins/ganttChart/index.css'
        ]);
    } else {
        // 如果函数未定义，延迟重试
        setTimeout(loadGanttChartCSS, 100);
    }
}

// 在DOM加载完成后执行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadGanttChartCSS);
} else {
    loadGanttChartCSS();
}

// 异步加载HTML模板
async function loadTemplate() {
    try {
        const response = await fetch('/views/tasks/plugins/ganttChart/index.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error('加载甘特图模板失败:', error);
        return '<div class="gantt-error">甘特图模板加载失败</div>';
    }
}

const createGanttChart = async () => {
    const template = await loadTemplate();
    
    return {
        name: 'GanttChart',
        props: {
            tasks: {
                type: Array,
                default: () => []
            },
            currentView: {
                type: String,
                default: 'gantt'
            },
            selectedTask: {
                type: Object,
                default: null
            },
            loading: {
                type: Boolean,
                default: false
            }
        },
        
        emits: ['task-select', 'task-update', 'date-range-change', 'load-tasks-data'],
        
        data() {
            return {
                // 甘特图视图状态
                currentViewMode: 'day', // day, week, month
                zoomLevel: 100,
                dayWidth: 30,
                
                // 日期范围
                ganttDateRange: {
                    start: this.getDefaultStartDate(),
                    end: this.getDefaultEndDate()
                },
                
                // 拖拽状态
                isDragging: false,
                draggingTask: null,
                dragStartX: 0,
                dragStartDate: null,
                dragGuideLineStyle: {},
                
                // 调整大小状态
                isResizing: false,
                resizingTask: null,
                resizeDirection: null,
                resizeStartX: 0,
                resizeStartDate: null,
                
                // 时间轴数据
                timelineMonths: [],
                timelineDays: [],
                totalTimelineWidth: 0,
                
                // 视图模式配置
                viewModes: [
                    { key: 'day', name: '日', icon: 'fas fa-calendar-day' },
                    { key: 'week', name: '周', icon: 'fas fa-calendar-week' },
                    { key: 'month', name: '月', icon: 'fas fa-calendar' }
                ]
            };
        },
        
        computed: {
            /**
             * 过滤后的任务列表
             */
            filteredTasks() {
                return this.tasks.filter(task => {
                    const timeData = this.getTaskTimeData(task);
                    const startDate = new Date(timeData.startDate);
                    const endDate = new Date(timeData.endDate);
                    const rangeStart = new Date(this.ganttDateRange.start);
                    const rangeEnd = new Date(this.ganttDateRange.end);
                    
                    // 任务与当前日期范围有交集
                    return startDate <= rangeEnd && endDate >= rangeStart;
                });
            },
            
            /**
             * 是否显示甘特图
             */
            showGanttChart() {
                return this.currentView === 'gantt' && this.tasks.length > 0;
            },
            
            /**
             * 甘特图样式
             */
            ganttChartStyle() {
                return {
                    transform: `scale(${this.zoomLevel / 100})`,
                    transformOrigin: '0 0'
                };
            }
        },
        
        watch: {
            currentViewMode() {
                this.updateDayWidth();
                this.calculateTimeline();
            },
            
            zoomLevel() {
                this.updateDayWidth();
                this.calculateTimeline();
            },
            
            ganttDateRange: {
                handler() {
                    this.calculateTimeline();
                    this.$emit('date-range-change', this.ganttDateRange);
                },
                deep: true
            },
            
            tasks: {
                handler() {
                    this.$nextTick(() => {
                        this.calculateTimeline();
                    });
                },
                deep: true
            }
        },
        
        methods: {
            /**
             * 获取默认开始日期
             */
            getDefaultStartDate() {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                return firstDay.toISOString().split('T')[0];
            },
            
            /**
             * 获取默认结束日期
             */
            getDefaultEndDate() {
                const now = new Date();
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0);
                return lastDay.toISOString().split('T')[0];
            },
            
            /**
             * 获取任务时间数据
             */
            getTaskTimeData(task) {
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
                        category: 'development'
                    };
                }
                return task.timeData;
            },
            
            /**
             * 更新日期范围
             */
            updateDateRange() {
                this.calculateTimeline();
            },
            
            /**
             * 设置视图模式
             */
            setViewMode(mode) {
                this.currentViewMode = mode;
            },
            
            /**
             * 放大
             */
            zoomIn() {
                if (this.zoomLevel < 200) {
                    this.zoomLevel = Math.min(200, this.zoomLevel + 25);
                }
            },
            
            /**
             * 缩小
             */
            zoomOut() {
                if (this.zoomLevel > 50) {
                    this.zoomLevel = Math.max(50, this.zoomLevel - 25);
                }
            },
            
            /**
             * 更新日宽度
             */
            updateDayWidth() {
                const baseWidth = 30;
                const zoomFactor = this.zoomLevel / 100;
                
                switch (this.currentViewMode) {
                    case 'day':
                        this.dayWidth = baseWidth * zoomFactor;
                        break;
                    case 'week':
                        this.dayWidth = (baseWidth / 2) * zoomFactor;
                        break;
                    case 'month':
                        this.dayWidth = (baseWidth / 4) * zoomFactor;
                        break;
                    default:
                        this.dayWidth = baseWidth * zoomFactor;
                }
            },
            
            /**
             * 计算时间轴
             */
            calculateTimeline() {
                const startDate = new Date(this.ganttDateRange.start);
                const endDate = new Date(this.ganttDateRange.end);
                
                this.timelineMonths = this.calculateMonths(startDate, endDate);
                this.timelineDays = this.calculateDays(startDate, endDate);
                this.totalTimelineWidth = this.timelineDays.length * this.dayWidth;
            },
            
            /**
             * 计算月份数据
             */
            calculateMonths(startDate, endDate) {
                const months = [];
                const current = new Date(startDate);
                
                while (current <= endDate) {
                    const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
                    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
                    
                    const visibleStart = monthStart > startDate ? monthStart : startDate;
                    const visibleEnd = monthEnd < endDate ? monthEnd : endDate;
                    
                    const daysInMonth = Math.ceil((visibleEnd - visibleStart) / (24 * 60 * 60 * 1000)) + 1;
                    
                    months.push({
                        key: `${current.getFullYear()}-${current.getMonth()}`,
                        label: `${current.getFullYear()}年${current.getMonth() + 1}月`,
                        width: daysInMonth * this.dayWidth,
                        start: visibleStart,
                        end: visibleEnd
                    });
                    
                    current.setMonth(current.getMonth() + 1);
                }
                
                return months;
            },
            
            /**
             * 计算天数据
             */
            calculateDays(startDate, endDate) {
                const days = [];
                const current = new Date(startDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                while (current <= endDate) {
                    const dayOfWeek = current.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const isToday = current.getTime() === today.getTime();
                    
                    days.push({
                        key: current.toISOString().split('T')[0],
                        number: current.getDate(),
                        name: ['日', '一', '二', '三', '四', '五', '六'][dayOfWeek],
                        date: new Date(current),
                        isWeekend,
                        isToday
                    });
                    
                    current.setDate(current.getDate() + 1);
                }
                
                return days;
            },
            
            /**
             * 获取任务图标
             */
            getTaskIcon(task) {
                const timeData = this.getTaskTimeData(task);
                const status = timeData.status;
                
                switch (status) {
                    case 'completed':
                        return 'fas fa-check-circle text-success';
                    case 'in-progress':
                        return 'fas fa-play-circle text-warning';
                    case 'overdue':
                        return 'fas fa-exclamation-circle text-error';
                    default:
                        return 'fas fa-circle text-info';
                }
            },
            
            /**
             * 获取任务持续时间
             */
            getTaskDuration(task) {
                const timeData = this.getTaskTimeData(task);
                const startDate = new Date(timeData.startDate);
                const endDate = new Date(timeData.endDate);
                const timeDiff = endDate.getTime() - startDate.getTime();
                return Math.ceil(timeDiff / (24 * 60 * 60 * 1000));
            },
            
            /**
             * 获取任务进度
             */
            getTaskProgress(task) {
                const timeData = this.getTaskTimeData(task);
                return timeData.progress || 0;
            },
            
            /**
             * 获取任务条样式
             */
            getTaskBarStyle(task) {
                const timeData = this.getTaskTimeData(task);
                const startDate = new Date(timeData.startDate);
                const rangeStart = new Date(this.ganttDateRange.start);
                
                // 计算开始位置
                const daysDiff = Math.max(0, (startDate - rangeStart) / (24 * 60 * 60 * 1000));
                const left = daysDiff * this.dayWidth;
                
                // 计算宽度
                const duration = this.getTaskDuration(task);
                const width = Math.max(20, duration * this.dayWidth);
                
                // 确定状态样式类
                const status = this.getTaskStatus(task);
                
                return {
                    left: left + 'px',
                    width: width + 'px',
                    '--task-status': status
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
                    return 'todo';
                }
            },
            
            /**
             * 获取任务条标题
             */
            getTaskBarTitle(task) {
                const timeData = this.getTaskTimeData(task);
                const duration = this.getTaskDuration(task);
                const progress = this.getTaskProgress(task);
                
                return `${task.title}\n开始: ${timeData.startDate}\n结束: ${timeData.endDate}\n工期: ${duration}天\n进度: ${progress}%`;
            },
            
            /**
             * 判断是否为里程碑
             */
            isMilestone(task) {
                return this.getTaskDuration(task) === 0;
            },
            
            /**
             * 获取里程碑样式
             */
            getMilestoneStyle(task) {
                const timeData = this.getTaskTimeData(task);
                const startDate = new Date(timeData.startDate);
                const rangeStart = new Date(this.ganttDateRange.start);
                
                const daysDiff = Math.max(0, (startDate - rangeStart) / (24 * 60 * 60 * 1000));
                const left = daysDiff * this.dayWidth - 10; // 居中对齐
                
                return {
                    left: left + 'px'
                };
            },
            
            /**
             * 选择任务
             */
            selectTask(task) {
                this.$emit('task-select', task);
            },
            
            /**
             * 判断任务是否被选中
             */
            isTaskSelected(task) {
                return this.selectedTask && this.selectedTask.key === task.key;
            },
            
            /**
             * 开始拖拽
             */
            startDrag(event, task) {
                this.isDragging = true;
                this.draggingTask = task;
                this.dragStartX = event.clientX;
                
                const timeData = this.getTaskTimeData(task);
                this.dragStartDate = new Date(timeData.startDate);
                
                document.addEventListener('mousemove', this.handleDrag);
                document.addEventListener('mouseup', this.endDrag);
                
                event.preventDefault();
            },
            
            /**
             * 处理拖拽
             */
            handleDrag(event) {
                if (!this.isDragging) return;
                
                const deltaX = event.clientX - this.dragStartX;
                const deltaDays = Math.round(deltaX / this.dayWidth);
                
                // 更新拖拽辅助线
                this.dragGuideLineStyle = {
                    left: (event.clientX - this.$refs.ganttChart.getBoundingClientRect().left) + 'px'
                };
                
                // 这里可以实时更新任务位置预览
                console.log(`拖拽任务 ${this.draggingTask.title}: 移动 ${deltaDays} 天`);
            },
            
            /**
             * 结束拖拽
             */
            endDrag(event) {
                if (!this.isDragging) return;
                
                const deltaX = event.clientX - this.dragStartX;
                const deltaDays = Math.round(deltaX / this.dayWidth);
                
                if (deltaDays !== 0) {
                    const newStartDate = new Date(this.dragStartDate);
                    newStartDate.setDate(newStartDate.getDate() + deltaDays);
                    
                    const timeData = this.getTaskTimeData(this.draggingTask);
                    const duration = this.getTaskDuration(this.draggingTask);
                    const newEndDate = new Date(newStartDate);
                    newEndDate.setDate(newEndDate.getDate() + duration - 1);
                    
                    // 发送更新事件
                    this.$emit('task-update', {
                        task: this.draggingTask,
                        timeData: {
                            ...timeData,
                            startDate: newStartDate.toISOString().split('T')[0],
                            endDate: newEndDate.toISOString().split('T')[0]
                        }
                    });
                }
                
                this.isDragging = false;
                this.draggingTask = null;
                this.dragGuideLineStyle = {};
                
                document.removeEventListener('mousemove', this.handleDrag);
                document.removeEventListener('mouseup', this.endDrag);
            },
            
            /**
             * 开始调整大小
             */
            startResize(event, task, direction) {
                this.isResizing = true;
                this.resizingTask = task;
                this.resizeDirection = direction;
                this.resizeStartX = event.clientX;
                
                const timeData = this.getTaskTimeData(task);
                this.resizeStartDate = direction === 'left' 
                    ? new Date(timeData.startDate)
                    : new Date(timeData.endDate);
                
                document.addEventListener('mousemove', this.handleResize);
                document.addEventListener('mouseup', this.endResize);
                
                event.preventDefault();
                event.stopPropagation();
            },
            
            /**
             * 处理调整大小
             */
            handleResize(event) {
                if (!this.isResizing) return;
                
                const deltaX = event.clientX - this.resizeStartX;
                const deltaDays = Math.round(deltaX / this.dayWidth);
                
                console.log(`调整任务 ${this.resizingTask.title} ${this.resizeDirection}: ${deltaDays} 天`);
            },
            
            /**
             * 结束调整大小
             */
            endResize(event) {
                if (!this.isResizing) return;
                
                const deltaX = event.clientX - this.resizeStartX;
                const deltaDays = Math.round(deltaX / this.dayWidth);
                
                if (deltaDays !== 0) {
                    const timeData = this.getTaskTimeData(this.resizingTask);
                    let newStartDate = new Date(timeData.startDate);
                    let newEndDate = new Date(timeData.endDate);
                    
                    if (this.resizeDirection === 'left') {
                        newStartDate.setDate(newStartDate.getDate() + deltaDays);
                    } else {
                        newEndDate.setDate(newEndDate.getDate() + deltaDays);
                    }
                    
                    // 确保开始日期不晚于结束日期
                    if (newStartDate <= newEndDate) {
                        this.$emit('task-update', {
                            task: this.resizingTask,
                            timeData: {
                                ...timeData,
                                startDate: newStartDate.toISOString().split('T')[0],
                                endDate: newEndDate.toISOString().split('T')[0]
                            }
                        });
                    }
                }
                
                this.isResizing = false;
                this.resizingTask = null;
                this.resizeDirection = null;
                
                document.removeEventListener('mousemove', this.handleResize);
                document.removeEventListener('mouseup', this.endResize);
            },
            
            /**
             * 获取任务依赖关系线
             */
            getTaskDependencyLines(task) {
                // 这里可以实现依赖关系线的计算
                return [];
            },
            
            /**
             * 获取已完成任务数量
             */
            getCompletedTasksCount() {
                return this.filteredTasks.filter(task => 
                    this.getTaskStatus(task) === 'completed'
                ).length;
            },
            
            /**
             * 获取进行中任务数量
             */
            getInProgressTasksCount() {
                return this.filteredTasks.filter(task => 
                    this.getTaskStatus(task) === 'in-progress'
                ).length;
            },
            
            /**
             * 获取待开始任务数量
             */
            getPendingTasksCount() {
                return this.filteredTasks.filter(task => 
                    this.getTaskStatus(task) === 'todo'
                ).length;
            },
            
            /**
             * 加载任务数据
             */
            loadTasksData() {
                this.$emit('load-tasks-data');
            },

            /**
             * 处理窗口大小变化
             */
            handleWindowResize() {
                this.$nextTick(() => {
                    this.calculateTimeline();
                });
            }
        },
        
        mounted() {
            console.log('[GanttChart] 甘特图组件已挂载');
            this.updateDayWidth();
            this.calculateTimeline();
            
            // 监听窗口大小变化
            window.addEventListener('resize', this.handleWindowResize);
        },
        
        beforeUnmount() {
            // 清理事件监听器
            window.removeEventListener('resize', this.handleWindowResize);
            document.removeEventListener('mousemove', this.handleDrag);
            document.removeEventListener('mouseup', this.endDrag);
            document.removeEventListener('mousemove', this.handleResize);
            document.removeEventListener('mouseup', this.endResize);
        },
        
        template: template
    };
};

// 初始化组件并全局暴露
(async function initComponent() {
    try {
        const GanttChart = await createGanttChart();
        window.GanttChart = GanttChart;
        
        // 触发自定义事件，通知组件已加载完成
        window.dispatchEvent(new CustomEvent('GanttChartLoaded', { detail: GanttChart }));
        console.log('[GanttChart] 甘特图组件加载完成');
    } catch (error) {
        console.error('GanttChart 组件初始化失败:', error);
    }
})();

