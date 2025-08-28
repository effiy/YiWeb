// 矩阵视图组件
const createMatrixView = () => {
    return {
        name: 'MatrixView',
        template: `
            <div class="matrix-view">
                <!-- 矩阵视图工具栏 -->
                <div class="matrix-toolbar">
                    <div class="toolbar-left">
                        <div class="matrix-info">
                            <span class="task-count">共 {{ tasks.length }} 个任务</span>
                            <span class="matrix-title">艾森豪威尔矩阵</span>
                        </div>
                    </div>
                    <div class="toolbar-right">
                        <div class="matrix-actions">
                            <button @click="refreshMatrix" class="action-btn" title="刷新矩阵">
                                <i class="fas fa-sync-alt"></i>
                                <span>刷新</span>
                            </button>
                            <button @click="exportMatrix" class="action-btn" title="导出矩阵">
                                <i class="fas fa-download"></i>
                                <span>导出</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 矩阵容器 -->
                <div class="matrix-container">
                    <!-- 矩阵说明 -->
                    <div class="matrix-legend">
                        <div class="legend-item">
                            <span class="legend-color urgent-important"></span>
                            <span class="legend-text">紧急且重要</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color not-urgent-important"></span>
                            <span class="legend-text">不紧急但重要</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color urgent-not-important"></span>
                            <span class="legend-text">紧急但不重要</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color not-urgent-not-important"></span>
                            <span class="legend-text">不紧急且不重要</span>
                        </div>
                    </div>

                    <!-- 矩阵网格 -->
                    <div class="matrix-grid">
                        <!-- 第一象限：紧急且重要 -->
                        <div class="matrix-quadrant urgent-important">
                            <div class="quadrant-header">
                                <h3>紧急且重要</h3>
                                <span class="task-count">{{ urgentImportantTasks.length }}</span>
                            </div>
                            <div class="quadrant-content">
                                <div v-if="urgentImportantTasks.length === 0" class="empty-quadrant">
                                    <i class="fas fa-check-circle"></i>
                                    <p>暂无紧急且重要的任务</p>
                                </div>
                                <div v-else class="task-list">
                                    <div v-for="task in urgentImportantTasks" 
                                         :key="task.id" 
                                         class="matrix-task"
                                         @click="selectTask(task)">
                                        <div class="task-header">
                                            <span class="task-title">{{ task.title }}</span>
                                            <span class="task-priority" :class="'priority-' + task.priority">
                                                {{ getPriorityLabel(task.priority) }}
                                            </span>
                                        </div>
                                        <div class="task-meta">
                                            <span class="task-status" :class="'status-' + task.status">
                                                {{ task.status }}
                                            </span>
                                            <span class="task-due-date">
                                                {{ formatDueDate(task.dueDate) }}
                                            </span>
                                        </div>
                                        <div v-if="task.labels && task.labels.length > 0" class="task-labels">
                                            <span v-for="label in task.labels.slice(0, 2)" 
                                                  :key="label.id"
                                                  class="label-tag"
                                                  :style="{ backgroundColor: label.color }">
                                                {{ label.name }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 第二象限：不紧急但重要 -->
                        <div class="matrix-quadrant not-urgent-important">
                            <div class="quadrant-header">
                                <h3>不紧急但重要</h3>
                                <span class="task-count">{{ notUrgentImportantTasks.length }}</span>
                            </div>
                            <div class="quadrant-content">
                                <div v-if="notUrgentImportantTasks.length === 0" class="empty-quadrant">
                                    <i class="fas fa-clock"></i>
                                    <p>暂无重要但不紧急的任务</p>
                                </div>
                                <div v-else class="task-list">
                                    <div v-for="task in notUrgentImportantTasks" 
                                         :key="task.id" 
                                         class="matrix-task"
                                         @click="selectTask(task)">
                                        <div class="task-header">
                                            <span class="task-title">{{ task.title }}</span>
                                            <span class="task-priority" :class="'priority-' + task.priority">
                                                {{ getPriorityLabel(task.priority) }}
                                            </span>
                                        </div>
                                        <div class="task-meta">
                                            <span class="task-status" :class="'status-' + task.status">
                                                {{ task.status }}
                                            </span>
                                            <span class="task-due-date">
                                                {{ formatDueDate(task.dueDate) }}
                                            </span>
                                        </div>
                                        <div v-if="task.labels && task.labels.length > 0" class="task-labels">
                                            <span v-for="label in task.labels.slice(0, 2)" 
                                                  :key="label.id"
                                                  class="label-tag"
                                                  :style="{ backgroundColor: label.color }">
                                                {{ label.name }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 第三象限：紧急但不重要 -->
                        <div class="matrix-quadrant urgent-not-important">
                            <div class="quadrant-header">
                                <h3>紧急但不重要</h3>
                                <span class="task-count">{{ urgentNotImportantTasks.length }}</span>
                            </div>
                            <div class="quadrant-content">
                                <div v-if="urgentNotImportantTasks.length === 0" class="empty-quadrant">
                                    <i class="fas fa-exclamation"></i>
                                    <p>暂无紧急但不重要的任务</p>
                                </div>
                                <div v-else class="task-list">
                                    <div v-for="task in urgentNotImportantTasks" 
                                         :key="task.id" 
                                         class="matrix-task"
                                         @click="selectTask(task)">
                                        <div class="task-header">
                                            <span class="task-title">{{ task.title }}</span>
                                            <span class="task-priority" :class="'priority-' + task.priority">
                                                {{ getPriorityLabel(task.priority) }}
                                            </span>
                                        </div>
                                        <div class="task-meta">
                                            <span class="task-status" :class="'status-' + task.status">
                                                {{ task.status }}
                                            </span>
                                            <span class="task-due-date">
                                                {{ formatDueDate(task.dueDate) }}
                                            </span>
                                        </div>
                                        <div v-if="task.labels && task.labels.length > 0" class="task-labels">
                                            <span class="label-tag"
                                                  :style="{ backgroundColor: task.labels[0].color }">
                                                {{ task.labels[0].name }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 第四象限：不紧急且不重要 -->
                        <div class="matrix-quadrant not-urgent-not-important">
                            <div class="quadrant-header">
                                <h3>不紧急且不重要</h3>
                                <span class="task-count">{{ notUrgentNotImportantTasks.length }}</span>
                            </div>
                            <div class="quadrant-content">
                                <div v-if="notUrgentNotImportantTasks.length === 0" class="empty-quadrant">
                                    <i class="fas fa-minus-circle"></i>
                                    <p>暂无此类任务</p>
                                </div>
                                <div v-else class="task-list">
                                    <div v-for="task in notUrgentNotImportantTasks" 
                                         :key="task.id" 
                                         class="matrix-task"
                                         @click="selectTask(task)">
                                        <div class="task-header">
                                            <span class="task-title">{{ task.title }}</span>
                                            <span class="task-priority" :class="'priority-' + task.priority">
                                                {{ getPriorityLabel(task.priority) }}
                                            </span>
                                        </div>
                                        <div class="task-meta">
                                            <span class="task-status" :class="'status-' + task.status">
                                                {{ task.status }}
                                            </span>
                                            <span class="task-due-date">
                                                {{ formatDueDate(task.dueDate) }}
                                            </span>
                                        </div>
                                        <div v-if="task.labels && task.labels.length > 0" class="task-labels">
                                            <span class="label-tag"
                                                  :style="{ backgroundColor: task.labels[0].color }">
                                                {{ task.labels[0].name }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 空状态 -->
                    <div v-if="tasks.length === 0" class="empty-matrix">
                    <i class="fas fa-th"></i>
                        <h3>暂无任务数据</h3>
                        <p>当前没有可显示的任务，请创建新任务或检查筛选条件</p>
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
        emits: ['task-select'],
        computed: {
            // 紧急且重要的任务
            urgentImportantTasks() {
                return this.tasks.filter(task => 
                    this.isUrgent(task) && this.isImportant(task)
                );
            },
            // 不紧急但重要的任务
            notUrgentImportantTasks() {
                return this.tasks.filter(task => 
                    !this.isUrgent(task) && this.isImportant(task)
                );
            },
            // 紧急但不重要的任务
            urgentNotImportantTasks() {
                return this.tasks.filter(task => 
                    this.isUrgent(task) && !this.isImportant(task)
                );
            },
            // 不紧急且不重要的任务
            notUrgentNotImportantTasks() {
                return this.tasks.filter(task => 
                    !this.isUrgent(task) && !this.isImportant(task)
                );
            }
        },
        methods: {
            // 判断任务是否紧急
            isUrgent(task) {
                if (!task.dueDate) return false;
                
                const dueDate = new Date(task.dueDate);
                const now = new Date();
                const diffTime = dueDate - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                // 3天内截止或已逾期视为紧急
                return diffDays <= 3;
            },
            
            // 判断任务是否重要
            isImportant(task) {
                // 高优先级和紧急优先级视为重要
                return task.priority === 'high' || task.priority === 'critical';
            },
            
            // 选择任务
            selectTask(task) {
                this.$emit('task-select', task);
                console.log('选择任务:', task.title);
            },
            
            // 刷新矩阵
            refreshMatrix() {
                console.log('刷新矩阵视图');
                // 这里可以添加刷新逻辑
            },
            
            // 导出矩阵
            exportMatrix() {
                const matrixData = {
                    '紧急且重要': this.urgentImportantTasks,
                    '不紧急但重要': this.notUrgentImportantTasks,
                    '紧急但不重要': this.urgentNotImportantTasks,
                    '不紧急且不重要': this.notUrgentNotImportantTasks
                };
                
                const csvContent = [
                    '象限,任务名称,状态,优先级,截止日期,类型',
                    ...Object.entries(matrixData).flatMap(([quadrant, tasks]) =>
                        tasks.map(task => [
                            quadrant,
                            `"${task.title}"`,
                            task.status,
                            this.getPriorityLabel(task.priority),
                            this.formatDueDate(task.dueDate),
                            this.getTypeLabel(task.type)
                        ].join(','))
                    )
                ].join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `任务矩阵_${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
            },
            

            
            getPriorityLabel(priority) {
                const priorityMap = {
                    'critical': '紧急',
                    'high': '高',
                    'medium': '中',
                    'low': '低',
                    'none': '无'
                };
                return priorityMap[priority] || priority;
            },
            
            getTypeLabel(type) {
                const typeMap = {
                    'feature': '功能',
                    'bug': '缺陷',
                    'improvement': '优化',
                    'documentation': '文档',
                    'research': '研究',
                    'maintenance': '维护',
                    'meeting': '会议',
                    'review': '评审'
                };
                return typeMap[type] || type;
            },
            
            formatDueDate(dueDate) {
                if (!dueDate) return '无截止日期';
                
                const date = new Date(dueDate);
                const now = new Date();
                const diffTime = date - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays < 0) return '已逾期';
                if (diffDays === 0) return '今天';
                if (diffDays === 1) return '明天';
                if (diffDays <= 7) return `${diffDays}天后`;
                
                return date.toLocaleDateString('zh-CN');
            }
        },
        mounted() {
            console.log('[MatrixView] 组件已挂载，任务数量:', this.tasks.length);
        },
        updated() {
            console.log('[MatrixView] 组件已更新，任务数量:', this.tasks.length);
        }
    };
};

window.MatrixView = createMatrixView();
console.log('[MatrixView] 组件已加载');


