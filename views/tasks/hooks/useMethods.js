/**
 * 
 * 任务页面方法管理
 * author: liangliang
 */

// 模块依赖改为全局方式
// import { window.showGlobalLoading, window.hideGlobalLoading } from '/utils/loading.js';
// import { window.showError, window.showSuccess } from '/utils/message.js';
// import { window.getData, window.postData } from '/apis/index.js';

/**
 * 方法工厂函数
 * 提供任务页面的各种交互方法
 * @param {Object} store - 数据存储对象
 * @param {Object} computed - 计算属性对象
 * @returns {Object} 方法对象
 */
window.useMethods = (store, computed) => {
    const {
        loadTasksData,
        toggleCategory,
        addSearchHistory,
        clearSearch,
        clearError,
        setCurrentView,
        setDateRange,
        setTimeFilter,
        getTaskTimeData,
        updateTaskTimeData
    } = store;

    // 长按删除相关变量
    let longPressTimer = null;
    let longPressTask = null;
    let longPressStartTime = 0;
    let longPressStartPosition = null;
    let isDeleting = false; // 防止重复删除
    const LONG_PRESS_DURATION = 3000; // 3秒
    const LONG_PRESS_MOVE_THRESHOLD = 10; // 移动阈值（像素）
    
    // 声音效果相关
    let audioContext = null;

    /**
     * 播放长按声音效果
     */
    const playLongPressSound = () => {
        try {
            // 创建音频上下文（如果还没有）
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // 创建振荡器
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            // 连接音频节点
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // 设置音频参数
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            // 播放声音
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            
        } catch (error) {
            console.log('[声音效果] 无法播放声音:', error);
        }
    };
    
    /**
     * 播放删除成功声音效果
     */
    const playDeleteSuccessSound = () => {
        try {
            // 创建音频上下文（如果还没有）
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // 创建振荡器
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            // 连接音频节点
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // 设置音频参数 - 成功音调
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.05);
            oscillator.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            
            // 播放声音
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
            
        } catch (error) {
            console.log('[声音效果] 无法播放删除成功声音:', error);
        }
    };

    /**
     * 验证任务数据完整性
     * @param {Object} task - 任务对象
     * @returns {boolean} 是否有效
     */
    const validateTask = (task) => {
        if (!task) {
            console.warn('[数据验证] 任务对象为空');
            return false;
        }
        
        // 检查必要字段 - 标题是必需的
        if (!task.title) {
            console.warn('[数据验证] 任务标题为空:', task);
            return false;
        }
        
        console.log('[数据验证] 任务验证通过:', task.title);
        return true;
    };

    /**
     * 开始长按计时
     * @param {Object} task - 任务对象
     * @param {Event} event - 事件对象
     */
    const startLongPress = (task, event) => {
        try {
            // 阻止事件冒泡，避免触发其他点击事件
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            // 检查是否正在删除中
            if (isDeleting) {
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
            
            // 验证任务数据完整性
            if (!validateTask(task)) {
                console.warn('[长按删除] 任务数据验证失败');
                return;
            }
            
            // 检查任务是否仍然存在于当前数据中
            const taskExists = store.tasksData.value.some(existingTask => 
                existingTask && existingTask.title === task.title
            );
            
            if (!taskExists) {
                console.warn('[长按删除] 任务已不存在于数据中:', task.title);
                return;
            }
            
            // 记录长按开始时间和位置
            longPressStartTime = Date.now();
            longPressStartPosition = {
                x: event.clientX || event.touches?.[0]?.clientX || 0,
                y: event.clientY || event.touches?.[0]?.clientY || 0
            };
            
            console.log('[长按删除] 开始长按任务:', {
                title: task.title,
                position: longPressStartPosition
            });
        
            // 清除之前的计时器
            if (longPressTimer) {
                clearTimeout(longPressTimer);
            }
            
            // 深拷贝task对象，避免引用问题
            longPressTask = JSON.parse(JSON.stringify(task));
            
            console.log('[长按删除] 保存任务引用:', {
                title: longPressTask.title
            });
            
            // 添加长按视觉反馈
            const taskElement = event.target.closest('.task-item');
            if (taskElement) {
                taskElement.classList.add('long-pressing');
                
                // 添加触觉反馈（如果支持）
                if (navigator.vibrate) {
                    navigator.vibrate(100);
                }
                
                // 添加声音效果
                playLongPressSound();
            }
            
            // 设置3秒后执行删除
            longPressTimer = setTimeout(() => {
                // 检查是否移动过大
                const currentPosition = {
                    x: event.clientX || event.touches?.[0]?.clientX || 0,
                    y: event.clientY || event.touches?.[0]?.clientY || 0
                };
                
                const moveDistance = Math.sqrt(
                    Math.pow(currentPosition.x - longPressStartPosition.x, 2) +
                    Math.pow(currentPosition.y - longPressStartPosition.y, 2)
                );
                
                if (moveDistance > LONG_PRESS_MOVE_THRESHOLD) {
                    console.log('[长按删除] 移动距离过大，取消删除:', moveDistance);
                    endLongPress();
                    return;
                }
                
                // 再次检查是否正在删除中
                if (isDeleting) {
                    console.log('[长按删除] 正在删除中，取消重复删除');
                    endLongPress();
                    return;
                }
                
                // 再次验证任务是否仍然存在
                const taskStillExists = store.tasksData.value.some(existingTask => 
                    existingTask && existingTask.title === longPressTask.title
                );
                
                if (!taskStillExists) {
                    console.warn('[长按删除] 任务已不存在，取消删除');
                    endLongPress();
                    return;
                }
                
                // 设置删除状态
                isDeleting = true;
                
                // 保存当前task的引用，避免异步操作中的问题
                const currentTask = { ...longPressTask };
                
                if (currentTask && currentTask.title) {
                    // 添加删除确认动画
                    if (taskElement) {
                        taskElement.classList.remove('long-pressing');
                        taskElement.classList.add('deleting');
                        
                        // 等待动画完成后执行删除
                        setTimeout(() => {
                            // 再次检查task是否仍然有效
                            if (currentTask && currentTask.title) {
                                deleteTask(currentTask, null, taskElement);
                            } else {
                                console.warn('[长按删除] 任务数据已失效，取消删除');
                                if (taskElement) {
                                    taskElement.classList.remove('deleting');
                                }
                                isDeleting = false;
                            }
                        }, 600); // 增加一点时间确保动画完成
                    } else {
                        // 再次检查task是否仍然有效
                        if (currentTask && currentTask.title) {
                            deleteTask(currentTask);
                        } else {
                            console.warn('[长按删除] 任务数据已失效，取消删除');
                            isDeleting = false;
                        }
                    }
                } else {
                    // 移除长按样式
                    if (taskElement) {
                        taskElement.classList.remove('long-pressing');
                    }
                    console.log('[长按删除] longPressTask无效，取消删除');
                    isDeleting = false;
                }
            }, LONG_PRESS_DURATION);
            
            console.log('[长按删除] 开始计时，3秒后将删除任务:', task.title);
        } catch (error) {
            console.error('[长按删除] 开始长按失败:', error);
            isDeleting = false;
        }
    };
    
    /**
     * 结束长按计时
     */
    const endLongPress = (event) => {
        // 阻止事件冒泡，避免触发其他点击事件
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
            longPressTask = null;
            longPressStartTime = 0;
            longPressStartPosition = null;
            
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
        
        // 确保删除状态被重置
        isDeleting = false;
    };
    
    /**
     * 删除任务
     * @param {Object} task - 任务对象
     * @param {Event} event - 点击事件对象（可选）
     * @param {HTMLElement} taskElement - 任务DOM元素（可选）
     */
    const deleteTask = async (task, event, taskElement) => {
        try {
            console.log('[删除任务] 开始删除，参数:', {
                task: task ? { title: task.title } : null,
                hasEvent: !!event,
                hasTaskElement: !!taskElement
            });
            
            // 检查task是否存在
            if (!task) {
                console.error('[删除任务] task参数为空');
                window.showError('删除失败：任务数据无效');
                isDeleting = false;
                return;
            }
            
            // 验证任务数据完整性
            if (!validateTask(task)) {
                console.error('[删除任务] 任务数据验证失败');
                window.showError('删除失败：任务数据不完整');
                isDeleting = false;
                return;
            }
            
            // 确认删除
            if (!confirm(`确定要删除任务"${task.title}"吗？此操作不可撤销。`)) {
                isDeleting = false;
                return;
            }
            
            // 删除过程不再显示全局加载器
            
            // 添加删除成功反馈
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
            }
            
            // 记录删除前的任务数量
            const beforeCount = store.tasksData.value.length;
            console.log('[删除任务] 删除前任务数量:', beforeCount);
            
            // 从本地存储中删除任务进度
            const taskProgressKey = `task_progress_${task.title}`;
            localStorage.removeItem(taskProgressKey);
            
            // 调用store的删除方法
            console.log('[删除任务] 调用store删除方法:', task.title);
            const result = await store.deleteTask(task);
            
            console.log('[删除任务] store删除方法返回结果:', result);
            
            if (result) {
                // 验证删除后的任务数量
                const afterCount = store.tasksData.value.length;
                const expectedCount = beforeCount - 1;
                
                console.log('[删除任务] 删除结果验证:', {
                    beforeCount: beforeCount,
                    afterCount: afterCount,
                    expectedCount: expectedCount,
                    isCorrect: afterCount === expectedCount
                });
                
                if (afterCount !== expectedCount) {
                    console.warn('[删除任务] 任务数量不正确，尝试强制刷新');
                    // 如果数量不正确，强制重新加载数据
                    await loadTasksData();
                }
                
                window.showSuccess(`已删除任务"${task.title}"`);
                console.log('[删除任务] 删除成功:', task.title);
                
                // 播放删除成功声音
                playDeleteSuccessSound();
                
                // 强制重新渲染
                if (Vue && Vue.nextTick) {
                    Vue.nextTick(() => {
                        console.log('[删除任务] Vue响应式更新完成');
                        
                        // 使用更简单的方法触发重排
                        setTimeout(() => {
                            const gridElement = document.querySelector('.task-grid');
                            if (gridElement) {
                                // 添加重排动画
                                gridElement.classList.add('reflowing');
                                
                                // 触发CSS Grid重排
                                gridElement.style.gridTemplateColumns = gridElement.style.gridTemplateColumns;
                                
                                // 移除重排动画类
                                setTimeout(() => {
                                    gridElement.classList.remove('reflowing');
                                }, 300);
                                
                                console.log('[删除任务] CSS Grid重排完成');
                            }
                        }, 100);
                    });
                }
            } else {
                throw new Error('删除任务失败');
            }
        } catch (error) {
            console.error('[删除任务] 删除失败:', error);
            window.showError('删除任务失败，请稍后重试');
        } finally {
            // 无全局加载器可隐藏
            // 确保删除状态被重置
            isDeleting = false;
        }
    };

    /**
     * 处理任务数据加载
     * 异步加载任务数据并处理错误
     */
    const handleLoadTasksData = async () => {
        try {
            await loadTasksData();
        } catch (error) {
            console.error('[handleLoadTasksData] 加载失败:', error);
        }
    };

    /**
     * 处理搜索键盘事件
     * @param {KeyboardEvent} event - 键盘事件
     */
    const handleSearchKeydown = async (event) => {
        if (event.key === 'Enter') {
            const query = event.target.value.trim();
            if (query) {
                addSearchHistory(query);
                
                // 调用prompt接口生成新任务
                try {
                    const fromSystem = await window.getData(`/prompts/tasks/tasks.txt`);
                    
                    const response = await window.postData(`${window.API_URL}/prompt`, {
                        fromSystem,
                        fromUser: query
                    });
                    
                    if (Array.isArray(response.data) && response.data.length > 0) {
                        await Promise.all(
                            response.data.map(item =>
                                window.postData(`${window.API_URL}/mongodb/?cname=tasks`, item)
                            )
                        );
                        store.setSearchQuery('');
                        // 重新加载任务数据
                        await loadTasksData();
                        window.showSuccess('已生成新任务');
                    }
                } catch (error) {
                    window.showError('生成任务失败，请稍后重试');
                    console.error('生成任务失败:', error);
                }
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
     * 处理过滤变化
     * @param {Object} filterData - 过滤数据
     */
    const handleFilterChange = (filterData) => {
        try {
            console.log('[handleFilterChange] 过滤变化:', {
                query: filterData.query,
                suggestions: filterData.suggestions,
                timestamp: filterData.timestamp
            });
            
            // 这里可以添加额外的过滤逻辑
            // 比如记录过滤历史、更新UI状态等
            
        } catch (error) {
            console.error('[handleFilterChange] 处理过滤变化失败:', error);
        }
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
     * 处理任务复制
     * @param {Object} task - 任务对象
     */
    const handleCopyTask = async (task) => {
        try {
            const taskText = `
任务: ${task.title}
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
     * 处理任务点击事件
     * @param {Object} task - 任务对象
     */
    const handleTaskClick = (task) => {
        try {
            console.log('[handleTaskClick] 任务被点击:', task.title);
            
            // 验证任务数据完整性
            if (!validateTask(task)) {
                console.warn('[handleTaskClick] 任务数据验证失败');
                return;
            }
            
            // 这里可以添加任务点击后的处理逻辑
            // 比如显示任务详情、打开编辑模式等
            
            // 暂时只是记录点击事件
            console.log('[handleTaskClick] 任务点击处理完成:', task.title);
            
        } catch (error) {
            console.error('[handleTaskClick] 处理任务点击失败:', error);
        }
    };

    /**
     * 处理错误清除
     */
    const handleClearError = () => {
        clearError();
    };

    /**
     * 清理事件监听器
     */
    const cleanupEventListeners = () => {
        document.removeEventListener('keydown', handleKeyboardShortcuts, { passive: true });
    };

    /**
     * 获取当前视图名称
     */
    const getCurrentViewName = () => {
        const viewMap = {
            'list': '列表视图',
            'gantt': '甘特图',
            'calendar': '日历视图',

            'table': '表格视图'
        };
        return viewMap[store.currentView] || '未知视图';
    };

<<<<<<< HEAD

=======
    // 处理全部选择/恢复
    const handleAllSelect = async () => {
        try {
            if (store.isAllSelected.value) {
                // 反选：恢复默认筛选状态
                console.log('[任务筛选] 恢复默认筛选状态');
                
                // 恢复默认的搜索和筛选状态
                store.searchQuery.value = '';
                store.selectedCategories.value.clear();
                
                // 更新全部选择状态
                store.isAllSelected.value = false;
                
                // 重新加载任务数据
                await loadTasksData();
                
                // 显示成功消息
                if (window.showSuccess) {
                    window.showSuccess('已恢复默认筛选状态');
                }
            } else {
                // 选择全部：显示全部任务
                console.log('[任务筛选] 显示全部任务');
                
                // 清空所有筛选条件
                store.searchQuery.value = '';
                store.selectedCategories.value.clear();
                
                // 更新全部选择状态
                store.isAllSelected.value = true;
                
                // 重新加载任务数据
                await loadTasksData();
                
                // 显示成功消息
                if (window.showSuccess) {
                    window.showSuccess('已显示全部任务');
                }
            }
        } catch (error) {
            console.error('[任务筛选] 全部选择处理失败:', error);
            if (window.showError) {
                window.showError('操作失败，请稍后重试');
            }
        }
    };
>>>>>>> f6edd1b0fe06f8905bf8836ed98527c1edb901cd

    /**
     * 打开设置面板
     */
    const openSettings = () => {
        console.log('[设置] 打开设置面板');
        // 这里可以添加打开设置面板的逻辑
        window.showSuccess('设置功能开发中...');
    };

    



    /**
     * 安全的日期处理函数
     */
    const createSafeDate = (dateValue, fallback = null) => {
        try {
            if (!dateValue) return fallback;
            
            // 如果是字符串，尝试解析
            if (typeof dateValue === 'string') {
                const parsed = new Date(dateValue);
                if (isNaN(parsed.getTime())) {
                    console.warn('[日期处理] 无效的日期字符串:', dateValue);
                    return fallback;
                }
                return parsed.toISOString();
            }
            
            // 如果是Date对象，验证有效性
            if (dateValue instanceof Date) {
                if (isNaN(dateValue.getTime())) {
                    console.warn('[日期处理] 无效的Date对象:', dateValue);
                    return fallback;
                }
                return dateValue.toISOString();
            }
            
            // 如果是数字（时间戳），验证有效性
            if (typeof dateValue === 'number') {
                const parsed = new Date(dateValue);
                if (isNaN(parsed.getTime())) {
                    console.warn('[日期处理] 无效的时间戳:', dateValue);
                    return fallback;
                }
                    return parsed.toISOString();
            }
            
            return fallback;
        } catch (error) {
            console.warn('[日期处理] 日期处理失败:', error, '原始值:', dateValue);
            return fallback;
        }
    };

    /**
     * 安全的未来日期生成函数
     */
    const createSafeFutureDate = (daysFromNow = 7) => {
        try {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + daysFromNow);
            return futureDate.toISOString();
        } catch (error) {
            console.warn('[日期处理] 未来日期生成失败:', error);
            return new Date().toISOString();
        }
    };

    /**
     * 安全的过去日期生成函数
     */
    const createSafePastDate = (daysAgo = 7) => {
        try {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - daysAgo);
            return pastDate.toISOString();
        } catch (error) {
            console.warn('[日期处理] 过去日期生成失败:', error);
            return new Date().toISOString();
        }
    };





    return {
        // 主要处理方法
        handleLoadTasksData,
        handleSearchKeydown,
        handleClearSearch,
        handleFilterChange,
        handleToggleCategory,
        handleTaskClick,
        handleCopyTask,
        handleShareTask,
        handleExportTask,
        handleClearError,
        deleteTask,
        cleanupEventListeners,

        // 视图管理方法
        setCurrentView,
        setDateRange,
        setTimeFilter,

        // 时间数据方法
        getTaskTimeData,
        updateTaskTimeData,

        // 任务选择和更新方法
        handleTaskSelect: (task) => {
            console.log('[任务选择] 选中任务:', task.title);
            if (store.selectTask) {
                store.selectTask(task);
            }
        },

        // 任务更新方法
        handleTaskUpdate: async (updateData) => {
            try {
                const { task, timeData } = updateData;
                console.log('[任务更新] 开始更新任务:', task.title, task);
                
                // 如果有时间数据，更新时间数据
                if (timeData) {
                    const success = await updateTaskTimeData(task, timeData);
                    if (!success) {
                        console.error('[任务更新] 时间数据更新失败');
                        return;
                    }
                }
                
                // 先更新本地store中的任务数据，避免状态共享
                if (store.updateTask) {
                    const localUpdateSuccess = store.updateTask(task);
                    if (localUpdateSuccess) {
                        console.log('[任务更新] 本地任务数据已更新');
                    }
                }
                
                // 更新任务数据到后端
                if (task && (task.id || task.key)) {
                    try {
                        // 准备更新数据
                        const updatePayload = {
                            ...task,
                            updated: new Date().toISOString()
                        };
                        
                        // 调用API更新任务
                        const response = await window.postData(
                            `${window.API_URL}/mongodb/?cname=tasks&featureName=${encodeURIComponent(task.featureName || '')}&cardTitle=${encodeURIComponent(task.cardTitle || '')}`, 
                            updatePayload
                        );
                        
                        if (response && response.success !== false) {
                            console.log('[任务更新] 任务数据更新成功');
                            
                            // 不再重新加载所有数据，而是直接更新本地数据
                            // await loadTasksData();
                            
                            // 显示成功消息
                            if (window.showSuccess) {
                                window.showSuccess('任务更新成功');
                            }
                        } else {
                            throw new Error('API更新失败');
                        }
                    } catch (apiError) {
                        console.error('[任务更新] API更新失败:', apiError);
                        
                        // 如果API更新失败，尝试使用updateData方法
                        try {
                            const success = await window.updateData(
                                `${window.API_URL}/mongodb/?cname=tasks&featureName=${encodeURIComponent(task.featureName || '')}&cardTitle=${encodeURIComponent(task.cardTitle || '')}`, 
                                task
                            );
                            
                            if (success) {
                                console.log('[任务更新] 使用updateData更新成功');
                                // 不再重新加载所有数据
                                // await loadTasksData();
                                
                                if (window.showSuccess) {
                                    window.showSuccess('任务更新成功');
                                }
                            } else {
                                throw new Error('updateData更新失败');
                            }
                        } catch (updateError) {
                            console.error('[任务更新] updateData更新失败:', updateError);
                            throw updateError;
                        }
                    }
                } else {
                    console.warn('[任务更新] 任务ID或key不存在，跳过更新');
                }
                
            } catch (error) {
                console.error('[任务更新] 更新失败:', error);
                if (window.showError) {
                    window.showError('任务更新失败，请稍后重试');
                }
            }
        },

        // 任务创建方法
        handleTaskCreate: async (newTask) => {
            try {
                console.log('[任务创建] 创建新任务:', newTask.title);
                
                // 这里可以调用API创建任务
                const response = await window.postData(`${window.API_URL}/mongodb/?cname=tasks`, newTask);
                
                if (response && response.success !== false) {
                    console.log('[任务创建] 创建成功');
                    
                    // 直接将新任务添加到本地数据，而不是重新加载所有数据
                    if (store.tasksData && store.tasksData.value) {
                        // 确保新任务有唯一的key
                        if (!newTask.key) {
                            newTask.key = store.generateUniqueId ? store.generateUniqueId() : Date.now().toString(36);
                        }
                        store.tasksData.value.unshift(newTask);
                        console.log('[任务创建] 新任务已添加到本地数据');
                    }
                    
                    // 不再重新加载任务数据
                    // await loadTasksData();
                } else {
                    throw new Error('API创建失败');
                }
            } catch (error) {
                console.error('[任务创建] 创建失败:', error);
                window.showError('创建任务失败，请稍后重试');
            }
        },

        // 日期范围变化处理
        handleDateRangeChange: (dateRange) => {
            console.log('[日期范围变化]', dateRange);
            setDateRange(dateRange);
        },

        // 获取当前视图名称
        getCurrentViewName,

        // 全部选择/恢复方法
<<<<<<< HEAD

=======
        handleAllSelect,
>>>>>>> f6edd1b0fe06f8905bf8836ed98527c1edb901cd

        // 设置相关方法
        openSettings,


    };
}; 









