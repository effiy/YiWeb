// 任务列表组件 - 负责任务列表显示和交互功能

import { loadCSSFiles } from '/utils/baseView.js';

// 自动加载相关的CSS文件（统一使用工具函数）
loadCSSFiles([
    '/views/tasks/plugins/taskList/index.css'
]);

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
            // 长按删除相关变量
            longPressTimer: null,
            longPressTask: null,
            longPressStartTime: 0,
            longPressStartPosition: null,
            isDeleting: false, // 防止重复删除
            LONG_PRESS_DURATION: 800, // 降低到800ms，提高响应性
            LONG_PRESS_MOVE_THRESHOLD: 15, // 增加移动阈值，减少误触
            // 点击检测相关变量
            clickStartTime: 0,
            clickStartPosition: null,
            isLongPressTriggered: false, // 标记是否已触发长按
            currentTaskElement: null, // 当前操作的任务元素
            CLICK_DELAY: 300, // 点击延迟，用于区分点击和长按
            CLICK_MOVE_THRESHOLD: 10, // 点击移动阈值
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
            // 检查是否点击在可交互元素上
            if (event) {
                const target = event.target;
                const isInteractiveElement = target.closest('button, a, [role="button"]');
                
                if (isInteractiveElement) {
                    console.log('[任务点击] 点击在交互元素上，允许正常点击:', target.tagName, target.className);
                    return; // 允许正常的点击事件
                }
            }
            
            // 如果已经触发了长按，忽略点击
            if (this.isLongPressTriggered) {
                console.log('[任务点击] 已触发长按，忽略点击事件');
                return;
            }
            
            // 如果正在进行删除操作，忽略点击
            if (this.isDeleting) {
                console.log('[任务点击] 正在进行删除操作，忽略点击事件');
                return;
            }
            
            // 检查是否为有效的点击（时间短且移动距离小）
            const clickDuration = Date.now() - this.clickStartTime;
            const isValidClick = clickDuration < this.CLICK_DELAY && 
                               clickDuration > 50 && // 至少50ms，避免误触
                               !this.hasMoved(event);
            
            if (!isValidClick) {
                console.log('[任务点击] 无效点击，忽略:', {
                    duration: clickDuration,
                    hasMoved: this.hasMoved(event)
                });
                return;
            }
            
            console.log('[任务点击] 触发任务点击:', task.title);
            this.$emit('task-click', task);
        },
        
        /**
         * 检查是否发生了移动
         * @param {Event} event - 事件对象（可选）
         * @returns {boolean} 是否移动
         */
        hasMoved(event) {
            if (!this.clickStartPosition) return false;
            
            // 如果没有传入event，使用最后记录的位置
            const currentPosition = event ? {
                x: event.clientX || event.touches?.[0]?.clientX || 0,
                y: event.clientY || event.touches?.[0]?.clientY || 0
            } : this.clickStartPosition; // 如果没有event，假设没有移动
            
            const moveDistance = Math.sqrt(
                Math.pow(currentPosition.x - this.clickStartPosition.x, 2) +
                Math.pow(currentPosition.y - this.clickStartPosition.y, 2)
            );
            
            return moveDistance > this.CLICK_MOVE_THRESHOLD;
        },
        
        /**
         * 开始触摸/点击事件
         * @param {Object} task - 任务对象
         * @param {Event} event - 事件对象
         */
        startInteraction(task, event) {
            try {
                // 阻止事件冒泡，避免触发其他点击事件
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                
                // 检查是否点击在可交互元素上
                const target = event.target;
                const isInteractiveElement = target.closest('button, a, [role="button"]');
                
                if (isInteractiveElement) {
                    console.log('[交互开始] 点击在交互元素上，跳过长按:', target.tagName, target.className);
                    return;
                }
                
                // 检查task是否存在
                if (!task) {
                    console.warn('[交互开始] task参数为空');
                    return;
                }
                
                // 重置状态
                this.isLongPressTriggered = false;
                this.currentTaskElement = event.target.closest('.task-item');
                
                // 记录开始时间和位置
                this.clickStartTime = Date.now();
                this.longPressStartTime = Date.now();
                this.clickStartPosition = {
                    x: event.clientX || event.touches?.[0]?.clientX || 0,
                    y: event.clientY || event.touches?.[0]?.clientY || 0
                };
                this.longPressStartPosition = { ...this.clickStartPosition };
                
                console.log('[交互开始] 开始交互任务:', {
                    title: task.title,
                    position: this.clickStartPosition
                });
            
                // 清除之前的计时器
                if (this.longPressTimer) {
                    clearTimeout(this.longPressTimer);
                }
                
                // 深拷贝task对象，避免引用问题
                this.longPressTask = JSON.parse(JSON.stringify(task));
                
                // 添加长按视觉反馈
                if (this.currentTaskElement) {
                    this.currentTaskElement.classList.add('long-pressing');
                    
                    // 添加触觉反馈（如果支持）
                    if (navigator.vibrate) {
                        navigator.vibrate(100);
                    }
                }
                
                // 设置长按计时器
                this.longPressTimer = setTimeout(() => {
                    console.log('[长按删除] 计时器触发，开始删除流程');
                    
                    // 检查是否移动过大（在setTimeout中无法获取event，所以不传递参数）
                    if (this.hasMoved()) {
                        console.log('[长按删除] 移动距离过大，取消删除');
                        this.endInteraction();
                        return;
                    }
                    
                    // 检查是否正在删除中
                    if (this.isDeleting) {
                        console.log('[长按删除] 正在删除中，取消重复删除');
                        this.endInteraction();
                        return;
                    }
                    
                    // 标记已触发长按
                    this.isLongPressTriggered = true;
                    console.log('[长按删除] 标记长按已触发');
                    
                    // 设置删除状态
                    this.isDeleting = true;
                    
                    // 保存当前task的引用，避免异步操作中的问题
                    const currentTask = { ...this.longPressTask };
                    console.log('[长按删除] 准备删除任务:', currentTask?.title);
                    
                    if (currentTask && currentTask.title) {
                        // 添加删除确认动画
                        if (this.currentTaskElement) {
                            this.currentTaskElement.classList.remove('long-pressing');
                            this.currentTaskElement.classList.add('deleting');
                            console.log('[长按删除] 添加删除动画样式');
                            
                            // 等待动画完成后执行删除
                            setTimeout(() => {
                                // 再次检查task是否仍然有效
                                if (currentTask && currentTask.title) {
                                    console.log('[长按删除] 执行删除操作:', currentTask.title);
                                    this.deleteTask(currentTask, null, this.currentTaskElement);
                                } else {
                                    console.warn('[长按删除] 任务数据已失效，取消删除');
                                    if (this.currentTaskElement) {
                                        this.currentTaskElement.classList.remove('deleting');
                                    }
                                    this.isDeleting = false;
                                }
                            }, 600); // 增加一点时间确保动画完成
                        } else {
                            // 再次检查task是否仍然有效
                            if (currentTask && currentTask.title) {
                                console.log('[长按删除] 执行删除操作（无DOM元素）:', currentTask.title);
                                this.deleteTask(currentTask);
                            } else {
                                console.warn('[长按删除] 任务数据已失效，取消删除');
                                this.isDeleting = false;
                            }
                        }
                    } else {
                        // 移除长按样式
                        if (this.currentTaskElement) {
                            this.currentTaskElement.classList.remove('long-pressing');
                        }
                        console.log('[长按删除] longPressTask无效，取消删除');
                        this.isDeleting = false;
                    }
                }, this.LONG_PRESS_DURATION);
                
                console.log('[长按删除] 开始计时，800ms后将删除任务:', task.title);
            } catch (error) {
                console.error('[交互开始] 开始交互失败:', error);
                this.isDeleting = false;
            }
        },
        
        /**
         * 结束触摸/点击事件
         */
        endInteraction(event) {
            // 阻止事件冒泡，避免触发其他点击事件
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
                this.longPressTask = null;
                this.longPressStartTime = 0;
                this.longPressStartPosition = null;
                
                // 移除所有任务的长按样式
                const longPressingTasks = document.querySelectorAll('.task-item.long-pressing');
                longPressingTasks.forEach(task => {
                    task.classList.remove('long-pressing');
                });
                
                // 添加取消反馈
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
                
                console.log('[交互结束] 取消长按操作');
            }
            
            // 确保删除状态被重置
            this.isDeleting = false;
            this.currentTaskElement = null;
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
        
        // 清理长按计时器
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
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


