/**
 * 
 * 任务页面方法管理
 * author: liangliang
 */

import { showGlobalLoading, hideGlobalLoading } from '/utils/loading.js';

/**
 * 方法工厂函数
 * 提供任务页面的各种交互方法
 * @param {Object} store - 数据存储对象
 * @param {Object} computed - 计算属性对象
 * @returns {Object} 方法对象
 */
export const useMethods = (store, computed) => {
    const {
        loadTasksData,
        toggleCategory,
        addClickedItem,
        addSearchHistory,
        clearSearch,
        clearError,
        selectTask,
        closeTaskDetail
    } = store;

    /**
     * 处理任务数据加载
     * 异步加载任务数据并处理错误
     */
    const handleLoadTasksData = async () => {
        try {
            showGlobalLoading('正在加载任务数据...');
            await loadTasksData();
        } catch (error) {
            console.error('[handleLoadTasksData] 加载失败:', error);
        } finally {
            hideGlobalLoading();
        }
    };

    /**
     * 处理搜索键盘事件
     * @param {KeyboardEvent} event - 键盘事件
     */
    const handleSearchKeydown = (event) => {
        if (event.key === 'Enter') {
            const query = event.target.value.trim();
            if (query) {
                addSearchHistory(query);
            }
        }
    };

    /**
     * 处理清除搜索
     */
    const handleClearSearch = () => {
        clearSearch();
    };

    /**
     * 处理切换分类
     * @param {string} category - 分类键
     */
    const handleToggleCategory = (category) => {
        toggleCategory(category);
        // 保留原有逻辑，但不再弹出消息
        // const categoryConfig = computed.categories().find(cat => cat.key === category);
        // const isSelected = computed.filteredTasksData().length > 0;
    };

    /**
     * 处理任务点击
     * @param {Object} task - 任务对象
     */
    const handleTaskClick = (task) => {
        try {
            // 检查是否点击的是当前已选中的任务
            const currentSelectedTask = store.selectedTask?.value;
            const isSameTask = currentSelectedTask && 
                              currentSelectedTask.title === task.title && 
                              store.isDetailVisible?.value;
            
            if (isSameTask) {
                // 如果点击的是当前已选中的任务，则关闭详情
                closeTaskDetail();
                console.log('[handleTaskClick] 任务详情已关闭:', task.title);
            } else {
                // 添加点击记录
                addClickedItem(task.title);
                
                // 选择任务
                selectTask(task);
                
                console.log('[handleTaskClick] 任务已选择:', task);
            }
        } catch (error) {
            console.error('[handleTaskClick] 处理失败:', error);
        }
    };

    /**
     * 处理关闭任务详情
     */
    const handleCloseDetail = () => {
        closeTaskDetail();
    };

    /**
     * 处理步骤切换
     * @param {Object} stepData - 步骤切换数据
     */
    const handleStepToggle = (stepData) => {
        try {
            const { taskTitle, stepNumber, completed, progress } = stepData;
            
            // 保存步骤完成状态到localStorage
            const taskProgressKey = `task_progress_${taskTitle}`;
            let completedSteps = JSON.parse(localStorage.getItem(taskProgressKey) || '[]');
            
            if (completed) {
                // 添加完成的步骤
                if (!completedSteps.includes(stepNumber)) {
                    completedSteps.push(stepNumber);
                }
            } else {
                // 移除完成的步骤
                completedSteps = completedSteps.filter(step => step !== stepNumber);
            }
            
            // 保存到localStorage
            localStorage.setItem(taskProgressKey, JSON.stringify(completedSteps));
            
            console.log(`[handleStepToggle] 步骤 ${stepNumber} ${completed ? '已完成' : '取消完成'}, 进度: ${progress.completed}/${progress.total}`);
            
            // 触发任务列表重新渲染以更新进度显示
            // 这里可以通过事件总线或其他方式通知任务列表组件更新
            window.dispatchEvent(new CustomEvent('taskProgressUpdated', {
                detail: { taskTitle, progress }
            }));
            
        } catch (error) {
            console.error('[handleStepToggle] 处理失败:', error);
        }
    };


    /**
     * 处理任务复制
     * @param {Object} task - 任务对象
     */
    const handleCopyTask = async (task) => {
        try {
            const taskText = `
任务: ${task.title}
时间: ${computed.formatTaskTime(task.time)}
输入: ${task.input}
输出: ${task.output}
步骤:
${Object.entries(task.steps[0] || {}).map(([key, value]) => `${key}. ${value}`).join('\n')}
            `.trim();

            await navigator.clipboard.writeText(taskText);
        } catch (error) {
            console.error('[handleCopyTask] 复制失败:', error);
        }
    };

    /**
     * 处理任务分享
     * @param {Object} task - 任务对象
     */
    const handleShareTask = (task) => {
        try {
            const shareData = {
                title: task.title,
                text: `查看任务: ${task.title}`,
                url: window.location.href
            };

            if (navigator.share) {
                navigator.share(shareData);
            } else {
                // 降级处理：复制链接
                navigator.clipboard.writeText(window.location.href);
            }
        } catch (error) {
            console.error('[handleShareTask] 分享失败:', error);
        }
    };

    /**
     * 处理任务导出
     * @param {Object} task - 任务对象
     */
    const handleExportTask = (task) => {
        try {
            const taskData = {
                title: task.title,
                time: task.time,
                input: task.input,
                output: task.output,
                steps: task.steps,
                exportTime: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(taskData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${task.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('[handleExportTask] 导出失败:', error);
        }
    };

    /**
     * 处理错误清除
     */
    const handleClearError = () => {
        clearError();
    };

    /**
     * 处理键盘快捷键
     * @param {KeyboardEvent} event - 键盘事件
     */
    const handleKeyboardShortcuts = (event) => {
        // Ctrl/Cmd + K: 聚焦搜索框
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            const searchInput = document.querySelector('input[type="search"]');
            if (searchInput) {
                searchInput.focus();
            }
        }

        // Escape: 关闭详情面板
        if (event.key === 'Escape') {
            closeTaskDetail();
        }

        // Ctrl/Cmd + F: 搜索
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            const searchInput = document.querySelector('input[type="search"]');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
    };

    /**
     * 初始化事件监听器
     */
    const initEventListeners = () => {
        // 键盘快捷键
        document.addEventListener('keydown', handleKeyboardShortcuts);

        // 点击外部关闭详情面板
        document.addEventListener('click', (event) => {
            const detailContainer = document.querySelector('.task-detail-container');
            if (detailContainer && !detailContainer.contains(event.target)) {
                // 检查是否点击了任务卡片
                const taskCard = event.target.closest('.task-card');
                if (!taskCard) {
                    closeTaskDetail();
                }
            }
        });
    };

    /**
     * 清理事件监听器
     */
    const cleanupEventListeners = () => {
        document.removeEventListener('keydown', handleKeyboardShortcuts);
    };

    return {
        // 主要处理方法
        handleLoadTasksData,
        handleSearchKeydown,
        handleClearSearch,
        handleToggleCategory,
        handleTaskClick,
        handleCloseDetail,
        handleStepToggle,
        handleCopyTask,
        handleShareTask,
        handleExportTask,
        handleClearError,

        // 事件监听器管理
        initEventListeners,
        cleanupEventListeners
    };
}; 

