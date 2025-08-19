// 任务列表组件 - 负责任务列表显示和交互功能

// 模块依赖改为全局方式
// import { loadCSSFiles } from '/utils/baseView.js';

// 等待DOM加载完成后再加载CSS文件
function loadTaskListCSS() {
    if (typeof window.loadCSSFiles === 'function') {
        window.loadCSSFiles([
            '/views/tasks/plugins/taskList/index.css'
        ]);
    } else {
        // 如果函数未定义，延迟重试
        setTimeout(loadTaskListCSS, 100);
    }
}

// 在DOM加载完成后执行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTaskListCSS);
} else {
    loadTaskListCSS();
}

// 异步加载HTML模板
async function loadTemplate() {
    try {
        const response = await fetch('/views/tasks/plugins/taskList/index.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error('加载模板失败:', error);
        // 回退到内联模板
        return;
    }
}

const createTaskList = async () => {
  const template = await loadTemplate();
  
  return {
    name: 'TaskList',
    props: {
        loading: {
            type: Boolean,
            default: false
        },
        error: {
            type: String,
            default: ''
        },
        searchQuery: {
            type: String,
            default: ''
        },
        searchResults: {
            type: Array,
            default: () => []
        },
        displayCategories: {
            type: Array,
            default: () => []
        },
        selectedCategories: {
            type: Set,
            default: () => new Set()
        },
        clickedItems: {
            type: Set,
            default: () => new Set()
        },
        hasTasksData: {
            type: Boolean,
            default: false
        },

        selectedTask: {
            type: Object,
            default: null
        },
        isDetailVisible: {
            type: Boolean,
            default: false
        }
    },
    
    emits: ['load-tasks-data', 'task-click', 'delete-task'],
    
    data() {
        return {
            // 组件内部状态
            isInitialized: false,
            // 简化的交互状态
            interactionTimer: null,
            activeTask: null,
            isProcessing: false,
            LONG_PRESS_DURATION: 600, // 简化为600ms
            MOVE_THRESHOLD: 10,
            // 步骤展开状态管理
            expandedSteps: new Set(),
            // 描述展开状态管理
            expandedDescriptions: new Set()
        };
    },
    
    computed: {
        /**
         * 是否有过滤后的任务数据
         */
        hasFilteredData() {
            return this.searchResults.length > 0;
        },
        
        /**
         * 是否显示空状态
         */
        showEmptyState() {
            return !this.loading && !this.error && this.hasTasksData && !this.hasFilteredData;
        },
        
        /**
         * 是否显示加载状态
         */
        showLoadingState() {
            return this.loading;
        },
        
        /**
         * 是否显示错误状态
         */
        showErrorState() {
            return this.error && !this.loading;
        }
    },
    
    methods: {
        /**
         * 处理任务点击
         * @param {Object} task - 任务对象
         * @param {Event} event - 事件对象（可选）
         */
        handleTaskClick(task, event) {
            // 检查是否正在处理操作
            if (this.isProcessing) {
                return;
            }
            
            // 检查是否点击在可交互元素上
            if (event?.target?.closest('button, a, [role="button"]')) {
                return;
            }
            
            console.log('[任务点击] 触发任务点击:', task.title);
            this.$emit('task-click', task);
        },
        
        /**
         * 检查是否发生了移动
         * @param {Event} startEvent - 开始事件
         * @param {Event} currentEvent - 当前事件
         * @returns {boolean} 是否移动
         */
        hasMoved(startEvent, currentEvent) {
            if (!startEvent || !currentEvent) return false;
            
            const startPos = {
                x: startEvent.clientX || startEvent.touches?.[0]?.clientX || 0,
                y: startEvent.clientY || startEvent.touches?.[0]?.clientY || 0
            };
            const currentPos = {
                x: currentEvent.clientX || currentEvent.touches?.[0]?.clientX || 0,
                y: currentEvent.clientY || currentEvent.touches?.[0]?.clientY || 0
            };
            
            const distance = Math.sqrt(
                Math.pow(currentPos.x - startPos.x, 2) +
                Math.pow(currentPos.y - startPos.y, 2)
            );
            
            return distance > this.MOVE_THRESHOLD;
        },
        
        /**
         * 开始触摸/点击事件
         * @param {Object} task - 任务对象
         * @param {Event} event - 事件对象
         */
        startInteraction(task, event) {
            // 阻止默认行为和冒泡
            event?.preventDefault();
            event?.stopPropagation();
            
            // 检查是否点击在可交互元素上
            if (event?.target?.closest('button, a, [role="button"]')) {
                return;
            }
            
            // 检查是否正在处理
            if (this.isProcessing || !task) {
                return;
            }
            
            // 存储活动任务和元素
            this.activeTask = { ...task };
            const taskElement = event.target.closest('.task-item');
            
            // 设置长按视觉反馈
            if (taskElement) {
                taskElement.classList.add('long-pressing');
                // 触觉反馈
                navigator.vibrate?.(50);
            }
            
            // 设置长按计时器
            this.interactionTimer = setTimeout(() => {
                this.triggerLongPress(taskElement);
            }, this.LONG_PRESS_DURATION);
            
            console.log('[交互开始] 开始长按计时:', task.title);
        },
        
        /**
         * 结束触摸/点击事件
         */
        endInteraction(event) {
            event?.preventDefault();
            event?.stopPropagation();
            
            // 清除计时器
            if (this.interactionTimer) {
                clearTimeout(this.interactionTimer);
                this.interactionTimer = null;
            }
            
            // 移除长按样式
            const longPressingTasks = document.querySelectorAll('.task-item.long-pressing');
            longPressingTasks.forEach(task => task.classList.remove('long-pressing'));
            
            // 重置状态
            this.activeTask = null;
            this.isProcessing = false;
            
            console.log('[交互结束] 长按操作已取消');
        },
        
        /**
         * 触发长按删除
         * @param {HTMLElement} taskElement - 任务DOM元素
         */
        triggerLongPress(taskElement) {
            if (!this.activeTask || this.isProcessing) {
                return;
            }
            
            this.isProcessing = true;
            
            // 移除长按样式，添加删除样式
            if (taskElement) {
                taskElement.classList.remove('long-pressing');
                taskElement.classList.add('deleting');
            }
            
            // 强触觉反馈
            navigator.vibrate?.([100, 50, 100]);
            
            console.log('[长按删除] 执行删除:', this.activeTask.title);
            
            // 延迟执行删除，等待动画
            setTimeout(() => {
                this.deleteTask(this.activeTask, null, taskElement);
                this.isProcessing = false;
            }, 300);
        },
        
        /**
         * 删除任务
         * @param {Object} task - 任务对象
         * @param {Event} event - 点击事件对象（可选）
         * @param {HTMLElement} taskElement - 任务DOM元素（可选）
         */
        deleteTask(task, event, taskElement) {
            console.log('[TaskList.deleteTask] 触发删除事件:', {
                taskTitle: task?.title,
                hasEvent: !!event,
                hasTaskElement: !!taskElement
            });
            // 调用父组件的方法
            this.$emit('delete-task', task, event, taskElement);
        },
        
        /**
         * 处理加载任务数据
         */
        handleLoadTasksData() {
            this.$emit('load-tasks-data');
        },
        

        
        /**
         * 判断任务是否被选中
         * @param {Object} task - 任务对象
         * @returns {boolean} 是否被选中
         */
        isTaskSelected(task) {
            return this.selectedTask && 
                   this.selectedTask.title === task.title && 
                   this.isDetailVisible;
        },
        
        /**
         * 获取任务标题提示
         * @param {Object} task - 任务对象
         * @returns {string} 标题提示
         */
        getTaskTitle(task) {
            if (this.isTaskSelected(task)) {
                return `${task.title} - 点击关闭详情`;
            }
            return `${task.title} - 点击查看详情`;
        },
        
        /**
         * 获取任务进度统计
         * @param {Object} task - 任务对象
         * @returns {Object} 进度统计对象
         */
        getTaskProgress(task) {
            // 从全局存储中获取任务的步骤完成状态
            const taskProgressKey = `task_progress_${task.title}`;
            const completedSteps = JSON.parse(localStorage.getItem(taskProgressKey) || '[]');
            
            if (!task.steps) {
                return { total: 0, completed: 0, percentage: 0 };
            }
            
            const total = Object.keys(task.steps).length;
            const completed = completedSteps.length;
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            return {
                total,
                completed,
                percentage
            };
        },

        /**
         * 获取任务步骤详情
         * @param {Object} task - 任务对象
         * @returns {Object} 步骤详情对象
         */
        getTaskSteps(task) {
            if (!task.steps) {
                return { steps: [], total: 0, completed: 0 };
            }
            
            // 从全局存储中获取任务的步骤完成状态
            const taskProgressKey = `task_progress_${task.title}`;
            const completedSteps = JSON.parse(localStorage.getItem(taskProgressKey) || '[]');
            
            const steps = task.steps;
            const stepList = [];
            
            Object.keys(steps).forEach(key => {
                stepList.push({
                    number: key,
                    text: '' + steps[key],
                    completed: completedSteps.includes(key)
                });
            });
            
            const total = stepList.length;
            const completed = stepList.filter(step => step.completed).length;
            
            return {
                steps: stepList,
                total,
                completed
            };
        },

        /**
         * 处理任务进度更新事件
         * @param {CustomEvent} event - 进度更新事件
         */
        handleTaskProgressUpdate(event) {
            const { taskTitle, progress } = event.detail;
            
            // 强制重新渲染组件以更新进度显示
            this.$forceUpdate();
            
            console.log(`[TaskList] 任务进度已更新: ${taskTitle}, 进度: ${progress.completed}/${progress.total}`);
        },

        /**
         * 切换步骤展开状态
         * @param {string} taskTitle - 任务标题
         */
        toggleStepsExpanded(taskTitle) {
            if (this.expandedSteps.has(taskTitle)) {
                this.expandedSteps.delete(taskTitle);
            } else {
                this.expandedSteps.add(taskTitle);
            }
            
            console.log(`[TaskList] 切换步骤展开状态: ${taskTitle}, 展开: ${this.expandedSteps.has(taskTitle)}`);
        },

        /**
         * 检查步骤是否已展开
         * @param {string} taskTitle - 任务标题
         * @returns {boolean} 是否已展开
         */
        isStepsExpanded(taskTitle) {
            return this.expandedSteps.has(taskTitle);
        },

        /**
         * 获取可见的步骤列表
         * @param {Object} task - 任务对象
         * @returns {Array} 可见的步骤列表
         */
        getVisibleSteps(task) {
            const steps = this.getTaskSteps(task).steps;
            const isExpanded = this.isStepsExpanded(task.title);
            
            if (isExpanded) {
                return steps;
            } else {
                return steps.slice(0, 3);
            }
        },

        /**
         * 切换描述展开状态
         * @param {string} taskTitle - 任务标题
         */
        toggleDescriptionExpanded(taskTitle) {
            if (this.expandedDescriptions.has(taskTitle)) {
                this.expandedDescriptions.delete(taskTitle);
            } else {
                this.expandedDescriptions.add(taskTitle);
            }
            
            console.log(`[TaskList] 切换描述展开状态: ${taskTitle}, 展开: ${this.expandedDescriptions.has(taskTitle)}`);
        },

        /**
         * 检查描述是否已展开
         * @param {string} taskTitle - 任务标题
         * @returns {boolean} 是否已展开
         */
        isDescriptionExpanded(taskTitle) {
            return this.expandedDescriptions.has(taskTitle);
        },

        /**
         * 切换步骤完成状态
         * @param {string} taskTitle - 任务标题
         * @param {string} stepNumber - 步骤编号
         * @param {boolean} currentStatus - 当前完成状态
         */
        toggleStepComplete(taskTitle, stepNumber, currentStatus) {
            try {
                // 阻止事件冒泡，避免触发任务点击
                event?.stopPropagation();
                
                // 获取当前任务的完成步骤
                const taskProgressKey = `task_progress_${taskTitle}`;
                let completedSteps = JSON.parse(localStorage.getItem(taskProgressKey) || '[]');
                
                const newStatus = !currentStatus;
                
                if (newStatus) {
                    // 标记为完成
                    if (!completedSteps.includes(stepNumber)) {
                        completedSteps.push(stepNumber);
                    }
                } else {
                    // 取消完成
                    completedSteps = completedSteps.filter(step => step !== stepNumber);
                }
                
                // 保存到localStorage
                localStorage.setItem(taskProgressKey, JSON.stringify(completedSteps));
                
                // 计算新的进度
                const task = this.searchResults.find(t => t.title === taskTitle);
                if (task) {
                    const total = Object.keys(task.steps).length;
                    const completed = completedSteps.length;
                    const progress = {
                        total,
                        completed,
                        percentage: total > 0 ? Math.round((completed / total) * 100) : 0
                    };
                    
                    // 触发进度更新事件
                    window.dispatchEvent(new CustomEvent('taskProgressUpdated', {
                        detail: { taskTitle, progress }
                    }));
                    
                    // 强制重新渲染组件
                    this.$forceUpdate();
                    
                    console.log(`[TaskList] 步骤 ${stepNumber} ${newStatus ? '已完成' : '取消完成'}, 进度: ${progress.completed}/${progress.total}`);
                }
                
            } catch (error) {
                console.error('[toggleStepComplete] 切换步骤状态失败:', error);
            }
        }
    },
    
    mounted() {
        console.log('[TaskList] 组件已挂载');
        this.isInitialized = true;
        
        // 如果没有数据，自动加载
        if (!this.hasTasksData && !this.loading) {
            this.handleLoadTasksData();
        }
        
        // 监听任务进度更新事件
        window.addEventListener('taskProgressUpdated', this.handleTaskProgressUpdate);
    },
    
    beforeUnmount() {
        // 清理事件监听器
        window.removeEventListener('taskProgressUpdated', this.handleTaskProgressUpdate);
        
        // 清理交互计时器
        if (this.interactionTimer) {
            clearTimeout(this.interactionTimer);
        }
    },
    
    template: template
  };
};

// 初始化组件并全局暴露
(async function initComponent() {
  try {
      const TaskList = await createTaskList();
      window.TaskList = TaskList;
      
      // 触发自定义事件，通知组件已加载完成
      window.dispatchEvent(new CustomEvent('TaskListLoaded', { detail: TaskList }));
  } catch (error) {
      console.error('TaskList 组件初始化失败:', error);
  }
})(); 



