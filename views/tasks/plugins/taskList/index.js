// 任务列表组件 - 负责任务列表显示和交互功能

// 自动加载相关的CSS文件
(function loadCSS() {
  const cssFiles = [
      '/views/tasks/plugins/taskList/index.css'
  ];
  
  cssFiles.forEach(cssFile => {
      // 检查是否已经加载过该CSS文件
      if (!document.querySelector(`link[href*="${cssFile}"]`)) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = cssFile;
          link.type = 'text/css';
          document.head.appendChild(link);
      }
  });
})();

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
    
    emits: ['load-tasks-data', 'task-click'],
    
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
            LONG_PRESS_DURATION: 3000, // 3秒
            LONG_PRESS_MOVE_THRESHOLD: 10, // 移动阈值（像素）
            // 新增：短按检测相关变量
            shortPressTimer: null,
            SHORT_PRESS_DELAY: 200, // 短按延迟，用于区分短按和长按
            hasMoved: false, // 是否发生了移动
            currentTaskElement: null // 当前操作的任务元素
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
            
            // 如果正在进行长按或删除操作，忽略点击
            if (this.longPressTimer || this.isDeleting) {
                console.log('[任务点击] 正在进行长按或删除操作，忽略点击事件');
                return;
            }
            
            // 如果发生了移动，忽略点击
            if (this.hasMoved) {
                console.log('[任务点击] 发生了移动，忽略点击事件');
                return;
            }
            
            // 检查是否为短按（非长按）
            const pressDuration = Date.now() - this.longPressStartTime;
            const isShortPress = pressDuration < this.LONG_PRESS_DURATION && pressDuration > 0;
            
            // 如果长按计时器存在且时间很短，可能是误触，延迟处理
            if (this.longPressStartTime > 0 && isShortPress) {
                console.log('[任务点击] 检测到可能的短按，延迟处理:', pressDuration + 'ms');
                
                // 清除之前的短按计时器
                if (this.shortPressTimer) {
                    clearTimeout(this.shortPressTimer);
                }
                
                // 延迟处理点击，给长按更多时间
                this.shortPressTimer = setTimeout(() => {
                    // 再次检查是否正在进行长按
                    if (this.longPressTimer || this.isDeleting) {
                        console.log('[任务点击] 延迟后检测到长按，取消点击');
                        return;
                    }
                    
                    // 再次检查是否发生了移动
                    if (this.hasMoved) {
                        console.log('[任务点击] 延迟后检测到移动，取消点击');
                        return;
                    }
                    
                    console.log('[任务点击] 延迟后确认短按，触发任务点击:', task.title);
                    this.$emit('task-click', task);
                }, this.SHORT_PRESS_DELAY);
                
                return;
            }
            
            console.log('[任务点击] 触发任务点击:', task.title);
            this.$emit('task-click', task);
        },
        
        /**
         * 开始长按计时
         * @param {Object} task - 任务对象
         * @param {Event} event - 事件对象
         */
        startLongPress(task, event) {
            try {
                // 阻止事件冒泡，避免触发其他点击事件
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                
                // 检查是否正在删除中
                if (this.isDeleting) {
                    console.log('[长按删除] 正在删除中，忽略新的长按');
                    return;
                }
                
                // 检查是否点击在可交互元素上
                const target = event.target;
                const isInteractiveElement = target.closest('button, a, [role="button"]');
                
                if (isInteractiveElement) {
                    console.log('[长按删除] 点击在交互元素上，跳过长按:', target.tagName, target.className);
                    return;
                }
                
                // 检查task是否存在
                if (!task) {
                    console.warn('[长按删除] task参数为空');
                    return;
                }
                
                // 重置状态
                this.hasMoved = false;
                this.currentTaskElement = event.target.closest('.task-item');
                
                // 记录长按开始时间和位置
                this.longPressStartTime = Date.now();
                this.longPressStartPosition = {
                    x: event.clientX || event.touches?.[0]?.clientX || 0,
                    y: event.clientY || event.touches?.[0]?.clientY || 0
                };
                
                console.log('[长按删除] 开始长按任务:', {
                    title: task.title,
                    position: this.longPressStartPosition
                });
            
                // 清除之前的计时器
                if (this.longPressTimer) {
                    clearTimeout(this.longPressTimer);
                }
                
                // 深拷贝task对象，避免引用问题
                this.longPressTask = JSON.parse(JSON.stringify(task));
                
                console.log('[长按删除] 保存任务引用:', {
                    title: this.longPressTask.title
                });
                
                // 添加长按视觉反馈
                if (this.currentTaskElement) {
                    this.currentTaskElement.classList.add('long-pressing');
                    
                    // 添加触觉反馈（如果支持）
                    if (navigator.vibrate) {
                        navigator.vibrate(100);
                    }
                }
                
                // 设置3秒后执行删除
                this.longPressTimer = setTimeout(() => {
                    // 检查是否移动过大
                    const currentPosition = {
                        x: event.clientX || event.touches?.[0]?.clientX || 0,
                        y: event.clientY || event.touches?.[0]?.clientY || 0
                    };
                    
                    const moveDistance = Math.sqrt(
                        Math.pow(currentPosition.x - this.longPressStartPosition.x, 2) +
                        Math.pow(currentPosition.y - this.longPressStartPosition.y, 2)
                    );
                    
                    if (moveDistance > this.LONG_PRESS_MOVE_THRESHOLD) {
                        console.log('[长按删除] 移动距离过大，取消删除:', moveDistance);
                        this.endLongPress();
                        return;
                    }
                    
                    // 再次检查是否正在删除中
                    if (this.isDeleting) {
                        console.log('[长按删除] 正在删除中，取消重复删除');
                        this.endLongPress();
                        return;
                    }
                    
                    // 设置删除状态
                    this.isDeleting = true;
                    
                    // 保存当前task的引用，避免异步操作中的问题
                    const currentTask = { ...this.longPressTask };
                    
                    if (currentTask && currentTask.title) {
                        // 添加删除确认动画
                        if (this.currentTaskElement) {
                            this.currentTaskElement.classList.remove('long-pressing');
                            this.currentTaskElement.classList.add('deleting');
                            
                            // 等待动画完成后执行删除
                            setTimeout(() => {
                                // 再次检查task是否仍然有效
                                if (currentTask && currentTask.title) {
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
                
                console.log('[长按删除] 开始计时，3秒后将删除任务:', task.title);
            } catch (error) {
                console.error('[长按删除] 开始长按失败:', error);
                this.isDeleting = false;
            }
        },
        
        /**
         * 结束长按计时
         */
        endLongPress(event) {
            // 阻止事件冒泡，避免触发其他点击事件
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            // 检查是否发生了移动
            if (this.longPressStartPosition) {
                const currentPosition = {
                    x: event?.clientX || event?.touches?.[0]?.clientX || 0,
                    y: event?.clientY || event?.touches?.[0]?.clientY || 0
                };
                
                const moveDistance = Math.sqrt(
                    Math.pow(currentPosition.x - this.longPressStartPosition.x, 2) +
                    Math.pow(currentPosition.y - this.longPressStartPosition.y, 2)
                );
                
                if (moveDistance > this.LONG_PRESS_MOVE_THRESHOLD) {
                    this.hasMoved = true;
                    console.log('[长按删除] 检测到移动，标记为已移动:', moveDistance);
                }
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
                
                console.log('[长按删除] 取消删除操作');
            }
            
            // 清理短按计时器
            if (this.shortPressTimer) {
                clearTimeout(this.shortPressTimer);
                this.shortPressTimer = null;
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
         * 格式化任务时间
         * @param {number|string} time - 时间值
         * @returns {string} 格式化后的时间
         */
        formatTaskTime(time) {
            if (typeof time === 'number') {
                return `${time} 小时`;
            }
            return time || '未设置';
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
            
            if (!task.steps || !task.steps[0]) {
                return { total: 0, completed: 0, percentage: 0 };
            }
            
            const total = Object.keys(task.steps[0]).length;
            const completed = completedSteps.length;
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            return {
                total,
                completed,
                percentage
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
        
        // 清理短按计时器
        if (this.shortPressTimer) {
            clearTimeout(this.shortPressTimer);
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
