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
            isInitialized: false
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
         */
        handleTaskClick(task) {
            this.$emit('task-click', task);
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
