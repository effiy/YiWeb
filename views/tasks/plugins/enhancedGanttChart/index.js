// 增强甘特图组件
const createEnhancedGanttChart = () => {
    return {
        name: 'EnhancedGanttChart',
        template: `
            <div class="enhanced-gantt-chart">
                <div class="gantt-header">
                    <h3>甘特图视图</h3>
                    <div class="gantt-controls">
                        <div class="timeline-controls">
                            <button @click="zoomIn" class="control-btn" title="放大">
                                <i class="fas fa-search-plus"></i>
                            </button>
                            <button @click="zoomOut" class="control-btn" title="缩小">
                                <i class="fas fa-search-minus"></i>
                            </button>
                            <button @click="fitToView" class="control-btn" title="适应视图">
                                <i class="fas fa-expand-arrows-alt"></i>
                            </button>
                        </div>
                        <div class="view-controls">
                            <button @click="setViewMode('day')" :class="['view-btn', { active: viewMode === 'day' }]">日</button>
                            <button @click="setViewMode('week')" :class="['view-btn', { active: viewMode === 'week' }]">周</button>
                            <button @click="setViewMode('month')" :class="['view-btn', { active: viewMode === 'month' }]">月</button>
                        </div>
                    </div>
                </div>
                
                <div class="gantt-container" ref="ganttContainer">
                    <div class="gantt-sidebar">
                        <div class="gantt-sidebar-header">
                            <span>任务</span>
                            <span>开始时间</span>
                            <span>持续时间</span>
                            <span>进度</span>
                        </div>
                        <div class="gantt-sidebar-content">
                            <div class="gantt-row" 
                                 v-for="task in sortedTasks" 
                                 :key="task.id"
                                 @click="selectTask(task)"
                                 :class="{ 'selected': selectedTask?.id === task.id }">
                                <div class="task-info">
                                    <div class="task-name">{{ task.title }}</div>
                                </div>
                                <div class="task-start">{{ formatDate(task.startDate || task.createdAt) }}</div>
                                <div class="task-duration">{{ getTaskDuration(task) }}</div>

                            </div>
                        </div>
                    </div>
                    
                    <div class="gantt-timeline" ref="ganttTimeline">
                        <div class="timeline-header">
                            <div class="timeline-scale">
                                <div class="timeline-unit" 
                                     v-for="date in timelineDates" 
                                     :key="date.key"
                                     :style="{ width: getTimelineUnitWidth() + 'px' }">
                                    {{ formatTimelineDate(date.date) }}
                                </div>
                            </div>
                        </div>
                        
                        <div class="timeline-content">
                            <div class="timeline-row" 
                                 v-for="task in sortedTasks" 
                                 :key="task.id">
                                <div class="task-bar" 
                                     :style="getTaskBarStyle(task)"
                                     @click="selectTask(task)"
                                     :class="{ 'selected': selectedTask?.id === task.id }">
                                    <div class="task-bar-label">{{ task.title }}</div>
                                    <div class="task-bar-progress" 
                                         :style="{ width: (task.progress || 0) + '%' }"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="gantt-footer">
                    <div class="gantt-stats">
                        <span class="stat-item">
                            <i class="fas fa-tasks"></i>
                            总任务: {{ totalTasks }}
                        </span>
                        <span class="stat-item">
                            <i class="fas fa-clock"></i>
                            进行中: {{ inProgressTasks }}
                        </span>
                        <span class="stat-item">
                            <i class="fas fa-check-circle"></i>
                            已完成: {{ completedTasks }}
                        </span>
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
        emits: ['task-update', 'timeline-change'],
        data() {
            return {
                viewMode: 'week',
                selectedTask: null,
                zoomLevel: 1,
                timelineStart: null,
                timelineEnd: null
            };
        },
        computed: {
            totalTasks() {
                return this.tasks ? this.tasks.length : 0;
            },
            inProgressTasks() {
                return this.tasks ? this.tasks.filter(t => t.status === 'in_progress').length : 0;
            },
            completedTasks() {
                return this.tasks ? this.tasks.filter(t => t.status === 'completed').length : 0;
            },
            sortedTasks() {
                if (!this.tasks) return [];
                return [...this.tasks].sort((a, b) => {
                    const aStart = new Date(a.startDate || a.createdAt);
                    const bStart = new Date(b.startDate || b.createdAt);
                    return aStart - bStart;
                });
            },
            timelineDates() {
                if (!this.tasks || this.tasks.length === 0) return [];
                
                const dates = [];
                const startDate = this.timelineStart || new Date();
                const endDate = this.timelineEnd || new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                
                let currentDate = new Date(startDate);
                while (currentDate <= endDate) {
                    dates.push({
                        key: currentDate.toISOString(),
                        date: new Date(currentDate)
                    });
                    
                    switch (this.viewMode) {
                        case 'day':
                            currentDate.setDate(currentDate.getDate() + 1);
                            break;
                        case 'week':
                            currentDate.setDate(currentDate.getDate() + 7);
                            break;
                        case 'month':
                            currentDate.setMonth(currentDate.getMonth() + 1);
                            break;
                    }
                }
                
                return dates;
            }
        },
        mounted() {
            console.log('[EnhancedGanttChart] 组件已挂载');
            console.log('[EnhancedGanttChart] 接收到的任务数据:', this.tasks);
            this.initializeTimeline();
        },
        methods: {
            initializeTimeline() {
                if (!this.tasks || this.tasks.length === 0) {
                    console.log('[EnhancedGanttChart] 没有任务数据，无法初始化时间线');
                    return;
                }
                
                // 计算时间线范围
                const dates = this.tasks
                    .filter(task => task.startDate || task.createdAt)
                    .map(task => new Date(task.startDate || task.createdAt));
                
                if (dates.length > 0) {
                    this.timelineStart = new Date(Math.min(...dates));
                    this.timelineEnd = new Date(Math.max(...dates));
                    // 扩展时间线范围
                    this.timelineStart.setDate(this.timelineStart.getDate() - 7);
                    this.timelineEnd.setDate(this.timelineEnd.getDate() + 30);
                }
                
                console.log('[EnhancedGanttChart] 时间线初始化完成:', {
                    start: this.timelineStart,
                    end: this.timelineEnd,
                    viewMode: this.viewMode
                });
            },
            
            getTaskDuration(task) {
                if (!task.startDate && !task.createdAt) return '未设置';
                
                const start = new Date(task.startDate || task.createdAt);
                const end = task.dueDate ? new Date(task.dueDate) : new Date();
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) return '1天';
                if (diffDays < 7) return `${diffDays}天`;
                if (diffDays < 30) return `${Math.ceil(diffDays / 7)}周`;
                return `${Math.ceil(diffDays / 30)}月`;
            },
            
            getTimelineUnitWidth() {
                const baseWidth = 80;
                switch (this.viewMode) {
                    case 'day': return baseWidth * 0.8;
                    case 'week': return baseWidth;
                    case 'month': return baseWidth * 1.2;
                    default: return baseWidth;
                }
            },
            
            formatTimelineDate(date) {
                switch (this.viewMode) {
                    case 'day':
                        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
                    case 'week':
                        return `第${Math.ceil(date.getDate() / 7)}周`;
                    case 'month':
                        return date.toLocaleDateString('zh-CN', { month: 'short' });
                    default:
                        return date.toLocaleDateString('zh-CN');
                }
            },
            
            formatDate(dateString) {
                if (!dateString) return '未设置';
                const date = new Date(dateString);
                return date.toLocaleDateString('zh-CN');
            },
            
            selectTask(task) {
                this.selectedTask = task;
                console.log('[EnhancedGanttChart] 选择任务:', task.title);
            },
            
            getTaskBarStyle(task) {
                if (!task.startDate && !task.createdAt) return {};
                
                const start = new Date(task.startDate || task.createdAt);
                const end = task.dueDate ? new Date(task.dueDate) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
                
                const timelineStart = this.timelineStart || start;
                const left = ((start - timelineStart) / (this.timelineEnd - timelineStart)) * 100;
                const width = ((end - start) / (this.timelineEnd - timelineStart)) * 100;
                
                return {
                    left: Math.max(0, left) + '%',
                    width: Math.max(5, width) + '%'
                };
            },
            
            setViewMode(mode) {
                this.viewMode = mode;
                console.log('[EnhancedGanttChart] 切换视图模式:', mode);
                this.$emit('timeline-change', { viewMode: mode });
            },
            
            zoomIn() {
                this.zoomLevel = Math.min(2, this.zoomLevel + 0.2);
                console.log('[EnhancedGanttChart] 放大:', this.zoomLevel);
            },
            
            zoomOut() {
                this.zoomLevel = Math.max(0.5, this.zoomLevel - 0.2);
                console.log('[EnhancedGanttChart] 缩小:', this.zoomLevel);
            },
            
            fitToView() {
                this.zoomLevel = 1;
                console.log('[EnhancedGanttChart] 适应视图');
            }
        }
    };
};

window.EnhancedGanttChart = createEnhancedGanttChart();
console.log('[EnhancedGanttChart] 组件已加载');

