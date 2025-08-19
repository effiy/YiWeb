// 增强型任务列表组件 - 兼容性组件
// 暂时兼容现有TaskList组件，后续将添加更多专业功能

// 创建增强型任务列表组件
const createEnhancedTaskList = () => {
    return {
        name: 'EnhancedTaskList',
        template: `
            <div class="enhanced-task-list">
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
                         class="task-item-enhanced"
                         @click="$emit('task-click', task)">
                        <div class="task-header">
                            <div class="task-title">{{ task.title }}</div>
                            <div class="task-priority" :class="'priority-' + (task.priority || 'none')">
                                {{ getPriorityLabel(task.priority || 'none') }}
                            </div>
                        </div>
                        <div class="task-description" v-if="task.description">{{ task.description }}</div>
                        <div class="task-meta">

                            <div class="task-status" :class="'status-' + (task.status || 'todo')">
                                {{ getStatusLabel(task.status || 'todo') }}
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
                    console.warn('获取优先级标签失败:', error);
                    return '未';
                }
            },
            getStatusLabel(status) {
                try {
                    const statuses = window.TASK_STATUS || window.TaskProMockData?.TASK_STATUS;
                    if (statuses && statuses[status]) {
                        return statuses[status].label;
                    }
                    const fallback = {
                        'backlog': '待办',
                        'todo': '计划中',
                        'in_progress': '进行中',
                        'in_review': '待审核',
                        'testing': '测试中',
                        'completed': '已完成',
                        'cancelled': '已取消',
                        'on_hold': '暂停'
                    };
                    return fallback[status] || '未知';
                } catch (error) {
                    console.warn('获取状态标签失败:', error);
                    return '未知';
                }
            }
        }
    };
};

// 初始化组件
(async function initComponent() {
    try {
        const EnhancedTaskList = createEnhancedTaskList();
        window.EnhancedTaskList = EnhancedTaskList;
        
        // 触发组件加载完成事件
        window.dispatchEvent(new CustomEvent('EnhancedTaskListLoaded', { detail: EnhancedTaskList }));
        console.log('[EnhancedTaskList] 组件已加载');
    } catch (error) {
        console.error('EnhancedTaskList 组件初始化失败:', error);
    }
})();

