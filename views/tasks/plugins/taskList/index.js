// 任务列表组件
const createTaskList = () => {
    return {
        name: 'TaskList',
        template: `
            <div class="task-list">
                <div v-if="loading" class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>加载中...</span>
                </div>
                <div v-else-if="error" class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>加载失败</h3>
                    <p>{{ error }}</p>
                    <button @click="$emit('retry')" class="retry-btn">重新加载</button>
                </div>
                <div v-else-if="tasks.length === 0" class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <h3>暂无任务</h3>
                    <p>开始创建您的第一个任务吧</p>
                </div>
                <div v-else class="task-list-content">
                    <div v-for="task in tasks" :key="task.id" 
                         class="task-item"
                         @click="$emit('task-click', task)">
                        <div class="task-header">
                            <div class="task-title">{{ task.title }}</div>
                            <div class="task-priority" :class="'priority-' + (task.priority || 'none')">
                                {{ getPriorityLabel(task.priority || 'none') }}
                            </div>
                        </div>
                        <div class="task-description" v-if="task.description">{{ task.description }}</div>
                        
                        <!-- 输入输出信息 -->
                        <div class="task-io-section" v-if="task.input || task.output">
                            <div class="task-input" v-if="task.input">
                                <div class="io-label">
                                    <i class="fas fa-arrow-down"></i>
                                    <span>输入</span>
                                </div>
                                <div class="io-content">
                                    <div v-if="Array.isArray(task.input)" class="io-array-content">
                                        <div v-for="(item, index) in task.input" :key="index" class="io-array-item">
                                            <i class="fas fa-circle"></i>
                                            <span>{{ item }}</span>
                                        </div>
                                    </div>
                                    <div v-else class="io-string-content">{{ task.input }}</div>
                                </div>
                            </div>
                            <div class="task-output" v-if="task.output">
                                <div class="io-label">
                                    <i class="fas fa-arrow-up"></i>
                                    <span>输出</span>
                                </div>
                                <div class="io-content">
                                    <div v-if="Array.isArray(task.output)" class="io-array-content">
                                        <div v-for="(item, index) in task.output" :key="index" class="io-array-item">
                                            <i class="fas fa-circle"></i>
                                            <span>{{ item }}</span>
                                        </div>
                                    </div>
                                    <div v-else class="io-string-content">{{ task.output }}</div>
                                </div>
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
                            <div class="task-status" :class="'status-' + (task.status || 'todo')">
                                {{ task.status || 'todo' }}
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
            },
            loading: {
                type: Boolean,
                default: false
            },
            error: {
                type: String,
                default: ''
            },
            selectedTasks: {
                type: Array,
                default: () => []
            }
        },
        emits: ['task-click', 'task-select', 'task-update', 'task-delete', 'selection-change', 'retry'],
        methods: {
            getPriorityLabel(priority) {
                try {
                    const priorities = window.TASK_PRIORITY || window.TaskProMockData?.TASK_PRIORITY;
                    if (priorities && priorities[priority]) {
                        return priorities[priority].label;
                    }
                    const fallback = {
                        'critical': '急',
                        'high': '高',
                        'medium': '中',
                        'low': '低',
                        'none': '无'
                    };
                    return fallback[priority] || '未';
                } catch (error) {
                    return '未';
                }
            },

            
            getStepNumber(stepKey) {
                // 从stepKey中提取步骤编号
                if (typeof stepKey !== 'string') {
                    return stepKey;
                }
                const match = stepKey.match(/step(\d+)/);
                return match ? match[1] : stepKey;
            },
            toggleStepComplete(taskId, stepKey) {
                try {
                    const task = this.tasks.find(t => t.id === taskId);
                    if (task && task.steps && task.steps[stepKey]) {
                        task.steps[stepKey].completed = !task.steps[stepKey].completed;
                        this.$emit('task-update', task);
                    }
                } catch (error) {
                    console.error('[toggleStepComplete] 切换步骤状态失败:', error);
                }
            },
            getStepsProgress(task) {
                if (!task || !task.steps) {
                    return { total: 0, completed: 0 };
                }
                const total = Object.keys(task.steps).length;
                const completed = Object.values(task.steps).filter(step => step.completed).length;
                return { total, completed };
            },
            isStepCompleted(task, stepKey) {
                return task && task.steps && task.steps[stepKey] && task.steps[stepKey].completed;
            },
            getStepCheckIcon(task, stepKey) {
                if (task && task.steps && task.steps[stepKey] && task.steps[stepKey].completed) {
                    return 'fas fa-check-circle text-success';
                }
                return 'fas fa-circle';
            },
            getStepText(step) {
                if (step.text) {
                    return step.text;
                }
                return step; // Fallback to step key if no text
            }
        }
    };
};

// 注册组件到全局
try {
    const TaskList = createTaskList();
    window.TaskList = TaskList;
} catch (error) {
    console.error('TaskList 组件初始化失败:', error);
} 





