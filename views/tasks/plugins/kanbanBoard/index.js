// 看板视图组件
const createKanbanBoard = () => {
    return {
        name: 'KanbanBoard',
        template: `
            <div class="kanban-board">
                <div class="kanban-header">
                    <h3>看板视图</h3>
                    <div class="kanban-stats">
                        <span class="stat-item">
                            <i class="fas fa-tasks"></i>
                            总任务: {{ totalTasks }}
                        </span>
                        <span class="stat-item">
                            <i class="fas fa-check-circle"></i>
                            已完成: {{ completedTasks }}
                        </span>
                    </div>
                </div>
                
                <div class="kanban-columns">
                    <div class="kanban-column" v-for="status in statusColumns" :key="status.value">
                        <div class="column-header" :class="'status-' + status.value">
                            <h4>{{ status.label }}</h4>
                            <span class="task-count">{{ getTasksByStatus(status.value).length }}</span>
                        </div>
                        
                        <div class="column-content">
                            <div class="task-card" 
                                 v-for="task in getTasksByStatus(status.value)" 
                                 :key="task.id"
                                 @click="selectTask(task)"
                                 :class="{ 'selected': isTaskSelected(task) }">
                                
                                <div class="task-header">
                                    <div class="task-priority" :class="'priority-' + (task.priority || 'none')">
                                        {{ getPriorityLabel(task.priority || 'none') }}
                                    </div>
                                    <div class="task-type">
                                        <i :class="getTaskTypeIcon(task.type)"></i>
                                    </div>
                                </div>
                                
                                <div class="task-title">{{ task.title }}</div>
                                
                                <!-- 输入输出信息 -->
                                <div class="task-io-section" v-if="task.input || task.output">
                                    <div class="task-input" v-if="task.input">
                                        <div class="io-label">
                                            <i class="fas fa-arrow-down"></i>
                                            <span>输入</span>
                                        </div>
                                        <div class="io-content">{{ task.input }}</div>
                                    </div>
                                    <div class="task-output" v-if="task.output">
                                        <div class="io-label">
                                            <i class="fas fa-arrow-up"></i>
                                            <span>输出</span>
                                        </div>
                                        <div class="io-content">{{ task.output }}</div>
                                    </div>
                                </div>
                                
                                <!-- 步骤信息 -->
                                <div class="task-steps-section" v-if="task.steps && Object.keys(task.steps).length > 0">
                                    <div class="steps-label">
                                        <i class="fas fa-list-ol"></i>
                                        <span>执行步骤</span>
                                        <span class="steps-progress" v-if="getStepsProgress(task).total > 0">
                                            ({{ getStepsProgress(task).completed }}/{{ getStepsProgress(task).total }})
                                        </span>
                                    </div>
                                    <div class="steps-content">
                                        <div v-for="(step, stepKey) in task.steps" :key="stepKey" class="step-item">
                                            <div class="step-checkbox" @click.stop="toggleStepComplete(task.id, stepKey)">
                                                <i :class="getStepCheckIcon(task, stepKey)" class="step-check-icon"></i>
                                            </div>
                                            <span class="step-number" :class="{ 'completed': isStepCompleted(task, stepKey) }">
                                                {{ getStepNumber(stepKey) }}
                                            </span>
                                            <span class="step-text" :class="{ 'completed': isStepCompleted(task, stepKey) }">
                                                {{ getStepText(step) }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="task-meta">
                                    <div class="task-due-date" v-if="task.dueDate">
                                        <i class="fas fa-calendar"></i>
                                        <span>{{ formatDate(task.dueDate) }}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="add-task-btn" @click="createTask(status.value)">
                                <i class="fas fa-plus"></i>
                                <span>添加任务</span>
                            </div>
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
        emits: ['task-move', 'task-select', 'task-create'],
        data() {
            return {
                statusColumns: [
                    { value: 'backlog', label: '待办', color: '#9e9e9e' },
                    { value: 'todo', label: '计划中', color: '#2196f3' },
                    { value: 'in_progress', label: '进行中', color: '#ff9800' },
                    { value: 'in_review', label: '待审核', color: '#9c27b0' },
                    { value: 'testing', label: '测试中', color: '#673ab7' },
                    { value: 'completed', label: '已完成', color: '#4caf50' }
                ]
            };
        },
        computed: {
            totalTasks() {
                console.log('[KanbanBoard] 计算总任务数:', this.tasks?.length || 0);
                return this.tasks ? this.tasks.length : 0;
            },
            completedTasks() {
                const count = this.tasks ? this.tasks.filter(t => t.status === 'completed').length : 0;
                console.log('[KanbanBoard] 计算已完成任务数:', count);
                return count;
            }
        },
        mounted() {
            console.log('[KanbanBoard] 组件已挂载');
            console.log('[KanbanBoard] 接收到的任务数据:', this.tasks);
            console.log('[KanbanBoard] 任务状态列:', this.statusColumns);
        },
        methods: {
            getTasksByStatus(status) {
                if (!this.tasks) {
                    console.log('[KanbanBoard] 没有任务数据');
                    return [];
                }
                const filteredTasks = this.tasks.filter(task => task.status === status);
                console.log(`[KanbanBoard] 状态 ${status} 的任务数量:`, filteredTasks.length);
                return filteredTasks;
            },
            
            getPriorityLabel(priority) {
                const priorityMap = {
                    'critical': '急',
                    'high': '高',
                    'medium': '中',
                    'low': '低',
                    'none': '无'
                };
                return priorityMap[priority] || '未';
            },
            
            getTaskTypeIcon(type) {
                const typeMap = {
                    'feature': 'fas fa-plus-circle',
                    'bug': 'fas fa-bug',
                    'improvement': 'fas fa-arrow-up',
                    'documentation': 'fas fa-file-alt',
                    'research': 'fas fa-search',
                    'maintenance': 'fas fa-tools',
                    'meeting': 'fas fa-users',
                    'review': 'fas fa-eye'
                };
                return typeMap[type] || 'fas fa-tasks';
            },
            
            formatDate(dateString) {
                if (!dateString) return '';
                const date = new Date(dateString);
                const now = new Date();
                const diffTime = date.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays < 0) {
                    return `${Math.abs(diffDays)}天前`;
                } else if (diffDays === 0) {
                    return '今天';
                } else if (diffDays === 1) {
                    return '明天';
                } else {
                    return `${diffDays}天后`;
                }
            },
            
            selectTask(task) {
                this.$emit('task-select', task);
            },
            
            isTaskSelected(task) {
                return false;
            },
            
            createTask(status) {
                this.$emit('task-create', { status });
            },
            
            getStepNumber(stepKey) {
                // 从stepKey中提取步骤编号
                if (typeof stepKey !== 'string') {
                    return stepKey;
                }
                const match = stepKey.match(/step(\d+)/);
                return match ? match[1] : stepKey;
            },

            getStepText(step) {
                // 根据步骤内容返回文本
                if (typeof step === 'string') {
                    return step;
                } else if (typeof step === 'object' && step !== null && 'text' in step) {
                    return step.text;
                }
                return '';
            },

            getStepsProgress(task) {
                if (!task.steps) return { total: 0, completed: 0 };
                const totalSteps = Object.keys(task.steps).length;
                const completedSteps = Object.keys(task.steps).filter(key => task.steps[key].completed).length;
                return { total: totalSteps, completed: completedSteps };
            },

            isStepCompleted(task, stepKey) {
                return task.steps && task.steps[stepKey] && task.steps[stepKey].completed;
            },

            toggleStepComplete(taskId, stepKey) {
                const task = this.tasks.find(t => t.id === taskId);
                if (task) {
                    if (!task.steps) {
                        task.steps = {};
                    }
                    if (task.steps[stepKey]) {
                        task.steps[stepKey].completed = !task.steps[stepKey].completed;
                    } else {
                        task.steps[stepKey] = { completed: true }; // 默认完成
                    }
                    this.$emit('task-move', task); // 通知父组件任务状态已更新
                }
            },

            getStepCheckIcon(task, stepKey) {
                if (task.steps && task.steps[stepKey] && task.steps[stepKey].completed) {
                    return 'fas fa-check-circle';
                }
                return 'fas fa-circle';
            }
        }
    };
};

// 全局暴露组件
try {
    window.KanbanBoard = createKanbanBoard();
    console.log('[KanbanBoard] 组件已成功加载到全局');
    console.log('[KanbanBoard] 组件对象:', window.KanbanBoard);
    console.log('[KanbanBoard] 组件名称:', window.KanbanBoard.name);
    
    // 验证组件是否正确暴露
    if (window.KanbanBoard && window.KanbanBoard.name === 'KanbanBoard') {
        console.log('[KanbanBoard] 组件验证成功');
        // 触发自定义事件通知组件已加载
        window.dispatchEvent(new CustomEvent('KanbanBoardLoaded', {
            detail: { component: window.KanbanBoard }
        }));
    } else {
        console.error('[KanbanBoard] 组件验证失败');
    }
} catch (error) {
    console.error('[KanbanBoard] 组件加载失败:', error);
    // 尝试重新加载
    setTimeout(() => {
        try {
            window.KanbanBoard = createKanbanBoard();
            console.log('[KanbanBoard] 组件重新加载成功');
            
            // 验证重新加载的组件
            if (window.KanbanBoard && window.KanbanBoard.name === 'KanbanBoard') {
                console.log('[KanbanBoard] 重新加载的组件验证成功');
                window.dispatchEvent(new CustomEvent('KanbanBoardLoaded', {
                    detail: { component: window.KanbanBoard }
                }));
            }
        } catch (retryError) {
            console.error('[KanbanBoard] 组件重新加载失败:', retryError);
        }
    }, 100);
}


