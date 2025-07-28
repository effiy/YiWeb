// 任务详情组件 - 负责任务详情显示和交互功能

// 自动加载相关的CSS文件
(function loadCSS() {
  const cssFiles = [
      '/views/tasks/plugins/taskDetail/index.css'
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
        const response = await fetch('/views/tasks/plugins/taskDetail/index.html');
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

const createTaskDetail = async () => {
  const template = await loadTemplate();
  
  return {
    name: 'TaskDetail',
    props: {
        selectedTask: {
            type: Object,
            default: null
        },
        isDetailVisible: {
            type: Boolean,
            default: false
        }
    },
    
    emits: ['close-detail', 'step-toggle'],
    
    data() {
        return {
            // 组件内部状态
            isInitialized: false,
            // 步骤完成状态
            completedSteps: new Set()
        };
    },
    
    computed: {
        /**
         * 是否显示详情面板
         */
        showDetail() {
            return this.isDetailVisible && this.selectedTask;
        },
        
        /**
         * 任务步骤详情
         */
        taskSteps() {
            if (!this.selectedTask || !this.selectedTask.steps) {
                return [];
            }

            const steps = this.selectedTask.steps;
            const detailSteps = [];
            
            Object.keys(steps).forEach(key => {
                detailSteps.push({
                    number: key,
                    text: '' + steps[key],
                    completed: this.completedSteps.has(key)
                });
            });

            return detailSteps;
        },
        
        /**
         * 步骤进度统计
         */
        stepsProgress() {
            const total = this.taskSteps.length;
            const completed = this.taskSteps.filter(step => step.completed).length;
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            return {
                total,
                completed,
                percentage
            };
        },
        
        /**
         * 格式化任务时间
         */
        formattedTime() {
            const time = this.selectedTask?.time;
            if (typeof time === 'number') {
                return `${time} 小时`;
            }
            return time || '未设置';
        }
    },
    
    methods: {
        /**
         * 处理关闭详情
         */
        handleCloseDetail() {
            this.$emit('close-detail');
        },
        
        /**
         * 处理步骤切换
         * @param {Object} step - 步骤对象
         */
        handleStepToggle(step) {
            if (step.completed) {
                this.completedSteps.delete(step.number);
            } else {
                this.completedSteps.add(step.number);
            }
            
            // 触发步骤切换事件
            this.$emit('step-toggle', {
                taskTitle: this.selectedTask.title,
                stepNumber: step.number,
                completed: !step.completed,
                progress: this.stepsProgress
            });
            
            console.log(`[TaskDetail] 步骤 ${step.number} ${step.completed ? '取消完成' : '标记完成'}`);
        },
        
        /**
         * 处理复制任务信息
         */
        async handleCopyTask() {
            try {
                const taskText = `
任务: ${this.selectedTask.title}
时间: ${this.formattedTime}
描述: ${this.selectedTask.description || '无描述'}
输入: ${this.selectedTask.input || '无'}
输出: ${this.selectedTask.output || '无'}
步骤:
${this.taskSteps.map(step => `${step.number}. ${step.text}`).join('\n')}
                `.trim();

                await navigator.clipboard.writeText(taskText);
                this.showMessage('任务信息已复制到剪贴板', 'success');
            } catch (error) {
                console.error('[handleCopyTask] 复制失败:', error);
                this.showMessage('复制失败', 'error');
            }
        },
        
        /**
         * 处理分享任务
         */
        handleShareTask() {
            try {
                const shareData = {
                    title: this.selectedTask.title,
                    text: `查看任务: ${this.selectedTask.title}`,
                    url: window.location.href
                };

                if (navigator.share) {
                    navigator.share(shareData);
                } else {
                    // 降级处理：复制链接
                    navigator.clipboard.writeText(window.location.href);
                    this.showMessage('链接已复制到剪贴板', 'success');
                }
            } catch (error) {
                console.error('[handleShareTask] 分享失败:', error);
                this.showMessage('分享失败', 'error');
            }
        },
        
        /**
         * 处理导出任务
         */
        handleExportTask() {
            try {
                const taskData = {
                    title: this.selectedTask.title,
                    description: this.selectedTask.description,
                    time: this.selectedTask.time,
                    input: this.selectedTask.input,
                    output: this.selectedTask.output,
                    steps: this.selectedTask.steps,
                    exportTime: new Date().toISOString()
                };

                const blob = new Blob([JSON.stringify(taskData, null, 2)], {
                    type: 'application/json'
                });

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${this.selectedTask.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                this.showMessage('任务已导出', 'success');
            } catch (error) {
                console.error('[handleExportTask] 导出失败:', error);
                this.showMessage('导出失败', 'error');
            }
        },
        
        /**
         * 显示消息
         */
        showMessage(message, type = 'info') {
            // 这里可以集成消息系统
            console.log(`[TaskDetail] ${type}: ${message}`);
        },
        
        /**
         * 从localStorage加载已完成的步骤
         */
        loadCompletedSteps() {
            if (!this.selectedTask) return;
            
            const taskProgressKey = `task_progress_${this.selectedTask.title}`;
            const completedSteps = JSON.parse(localStorage.getItem(taskProgressKey) || '[]');
            
            this.completedSteps = new Set(completedSteps);
            console.log(`[TaskDetail] 加载已完成步骤:`, Array.from(this.completedSteps));
            
            // 强制重新渲染以更新UI
            this.$nextTick(() => {
                this.$forceUpdate();
            });
        },
        
        /**
         * 处理任务进度更新事件
         * @param {CustomEvent} event - 进度更新事件
         */
        handleTaskProgressUpdate(event) {
            const { taskTitle, progress } = event.detail;
            
            // 如果是当前任务的进度更新，重新加载完成状态
            if (this.selectedTask && this.selectedTask.title === taskTitle) {
                this.loadCompletedSteps();
            }
        },

    },
    
    watch: {
        /**
         * 监听selectedTask变化，重新加载完成状态
         */
        selectedTask: {
            handler(newTask) {
                if (newTask) {
                    this.loadCompletedSteps();
                } else {
                    this.completedSteps.clear();
                }
            },
            immediate: true
        }
    },
    
    mounted() {
        console.log('[TaskDetail] 组件已挂载');
        this.isInitialized = true;
        
        // 从localStorage加载已完成的步骤
        this.loadCompletedSteps();
        
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
      const TaskDetail = await createTaskDetail();
      window.TaskDetail = TaskDetail;
      
      // 触发自定义事件，通知组件已加载完成
      window.dispatchEvent(new CustomEvent('TaskDetailLoaded', { detail: TaskDetail }));
  } catch (error) {
      console.error('TaskDetail 组件初始化失败:', error);
  }
})(); 

