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
            
            // 显示删除中提示
            window.showGlobalLoading('正在删除任务...');
            
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
            // 隐藏加载提示
            window.hideGlobalLoading();
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
            window.showGlobalLoading('正在加载任务数据...');
            await loadTasksData();
        } catch (error) {
            console.error('[handleLoadTasksData] 加载失败:', error);
        } finally {
            window.hideGlobalLoading();
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
                    window.showGlobalLoading('正在生成任务，请稍候...');
                    
                    const fromSystem = await window.getData(`${window.DATA_URL}/prompts/tasks/tasks.txt`);
                    
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
                } finally {
                    window.hideGlobalLoading();
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
            'kanban': '看板视图',
            'gantt': '甘特图',
            'calendar': '日历视图',

            'table': '表格视图',
            'matrix': '矩阵视图'
        };
        return viewMap[store.currentView] || '未知视图';
    };

    /**
     * 打开设置面板
     */
    const openSettings = () => {
        console.log('[设置] 打开设置面板');
        // 这里可以添加打开设置面板的逻辑
        window.showSuccess('设置功能开发中...');
    };

    /**
     * 处理下载任务数据
     */
    const handleDownloadTasks = async () => {
        try {
            const tasks = store.tasksData.value || [];
            if (!tasks.length) {
                window.showError('没有可下载的任务数据');
                return;
            }

            // 安全检查：确保loading函数存在
            if (window.showGlobalLoading) {
                window.showGlobalLoading('正在准备下载数据...');
            }
            console.log('[下载] 开始下载任务数据，任务数量:', tasks.length);

            // 构建下载数据结构
            const downloadData = {
                exportTime: new Date().toISOString(),
                totalTasks: tasks.length,
                tasks: tasks.map(task => ({
                    id: task.key || task.id,
                    title: task.title || 'Untitled Task',
                    description: task.description || '',
                    content: task.content || '',
                    status: task.status || 'pending',
                    priority: task.priority || 'medium',
                    category: task.category || '',
                    tags: task.tags || [],
                    steps: task.steps || [],
                    createTime: task.createTime || new Date().toISOString(),
                    updateTime: task.updateTime || new Date().toISOString(),
                    
                    // 周报属性
                    weeklyReport: task.weeklyReport || {
                        enabled: false,
                        frequency: 'weekly',
                        dayOfWeek: 1,
                        reportTemplate: '',
                        lastSubmitted: null,
                        nextDue: null,
                        history: []
                    },
                    
                    // 日报属性
                    dailyReport: task.dailyReport || {
                        enabled: false,
                        frequency: 'daily',
                        timeOfDay: '18:00',
                        reportTemplate: '',
                        lastSubmitted: null,
                        nextDue: null,
                        history: [],
                        weekends: false
                    },
                    
                    // 任务特征属性
                    features: task.features || {
                        estimatedHours: 0,
                        actualHours: 0,
                        difficulty: 'medium',
                        type: 'development',
                        dependencies: [],
                        milestone: '',
                        assignee: '',
                        reviewer: '',
                        labels: [],
                        businessValue: 'medium',
                        urgency: 'medium',
                        complexity: 'medium'
                    },
                    
                    // 进度跟踪
                    progress: task.progress || {
                        percentage: 0,
                        milestones: [],
                        blockers: [],
                        notes: []
                    },
                    
                    // 时间跟踪
                    timeTracking: task.timeTracking || {
                        startDate: null,
                        endDate: null,
                        deadline: null,
                        estimatedDuration: 0,
                        actualDuration: 0,
                        timeEntries: []
                    }
                }))
            };

            // 从任务数据中获取featureName和cardTitle，如果任务数据中没有则从URL获取
            let featureName = '';
            let cardTitle = '';
            
            // 优先从任务数据中获取
            if (tasks && tasks.length > 0) {
                const firstTask = tasks[0];
                featureName = firstTask.featureName || '';
                cardTitle = firstTask.cardTitle || '';
                console.log('[下载] 从任务数据获取:', { featureName, cardTitle, firstTask: firstTask.title });
            }
            
            // 如果任务数据中没有，则从URL获取
            if (!featureName || !cardTitle) {
                const urlParams = new URLSearchParams(window.location.search);
                featureName = featureName || urlParams.get('featureName') || '';
                cardTitle = cardTitle || urlParams.get('cardTitle') || '';
                console.log('[下载] 从URL获取:', { featureName, cardTitle });
            }
            
            // 调试信息：输出最终获取的参数
            console.log('[下载] 最终参数:', {
                fullUrl: window.location.href,
                search: window.location.search,
                featureName: featureName,
                cardTitle: cardTitle,
                hasFeatureName: !!featureName,
                hasCardTitle: !!cardTitle
            });
            
            // 构建文件名：使用featureName和cardTitle进行拼接
            let fileName = '';
            if (featureName) {
                fileName += featureName;
            }
            if (cardTitle) {
                if (fileName) fileName += '_';
                fileName += cardTitle;
            }
            if (!fileName) {
                fileName = 'tasks_export';
            }
            fileName += '.json';
            
            // 调试信息：输出文件名构建过程
            console.log('[下载] 文件名构建过程:', {
                initialFileName: fileName.replace('.json', ''),
                finalFileName: fileName
            });
            
            // 生成JSON文件并下载
            const jsonContent = JSON.stringify(downloadData, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json' });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // 安全检查：确保loading函数存在
            if (window.hideGlobalLoading) {
                window.hideGlobalLoading();
            }
            
            // 显示下载成功信息
            const successMessage = `任务数据下载成功！
📊 导出统计：
• 总任务数：${downloadData.totalTasks} 个
• 导出时间：${new Date(downloadData.exportTime).toLocaleString()}
• 文件大小：${(jsonContent.length / 1024).toFixed(2)} KB
• 文件名：${fileName}`;
            
            // 安全检查：确保message函数存在
            if (window.showSuccess) {
                window.showSuccess(successMessage);
            } else {
                console.log('[下载] 任务数据下载完成:', successMessage);
            }
            console.log('[下载] 任务数据下载完成:', {
                totalTasks: downloadData.totalTasks,
                fileName: fileName,
                fileSize: (jsonContent.length / 1024).toFixed(2) + ' KB'
            });

        } catch (error) {
            // 安全检查：确保loading函数存在
            if (window.hideGlobalLoading) {
                window.hideGlobalLoading();
            }
            console.error('[下载] 下载失败:', error);
            // 安全检查：确保message函数存在
            if (window.showError) {
                window.showError('下载失败: ' + (error?.message || '未知错误'));
            } else {
                console.error('[下载] 下载失败:', error?.message || '未知错误');
            }
        }
    };

    /**
     * 触发上传文件选择
     */
    const triggerUploadTasks = () => {
        try {
            const uploadInput = document.getElementById('tasksUploadInput');
            if (uploadInput) {
                uploadInput.click();
            }
        } catch (error) {
            console.error('[上传] 触发上传失败:', error);
            window.showError('触发上传失败');
        }
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

    /**
     * 下载上传样例数据（mock数据）
     */
    const handleDownloadSample = async () => {
        try {
            // 安全检查：确保loading函数存在
            if (window.showGlobalLoading) {
                window.showGlobalLoading('正在准备样例数据...');
            }
            console.log('[样例下载] 开始下载上传样例数据');

            // 构建样例数据结构
            const sampleData = {
                exportTime: createSafeDate(new Date()),
                description: '这是TaskPro系统的上传样例数据，包含完整的任务数据结构示例，可以直接上传使用',
                version: '1.0.0',
                totalTasks: 3,
                uploadInstructions: '下载此样例数据后，可以直接通过"上传"按钮重新上传，系统会自动识别并导入所有任务数据。',
                tasks: [
                    {
                        // 基础任务信息 - 系统必需字段
                        id: 'sample-task-001',
                        title: '示例任务：用户认证功能开发',
                        description: '这是一个示例任务，展示了完整的任务数据结构，可以直接上传使用',
                        content: '开发用户登录、注册、密码重置等认证相关功能，包括前端界面、后端逻辑和安全验证',
                        status: 'todo',
                        priority: 'high',
                        category: 'development',
                        tags: ['认证', '安全', '前端', '后端'],
                        featureName: '缺陷检测',
                        cardTitle: 'AI代码审查系统',
                        
                        // 时间信息
                        createTime: createSafeDate(new Date()),
                        updateTime: createSafeDate(new Date()),
                        createdAt: createSafeDate(new Date()),
                        updatedAt: createSafeDate(new Date()),
                        dueDate: createSafeFutureDate(7),
                        startDate: createSafeDate(new Date()),
                        
                        // 任务类型和复杂度
                        type: 'feature',
                        complexity: 'medium',
                        estimatedHours: 16,
                        actualHours: 8,
                        progress: 50,
                        
                        // 步骤信息
                        steps: {
                            step1: { text: '设计用户界面', completed: true },
                            step2: { text: '实现登录逻辑', completed: true },
                            step3: { text: '添加密码验证', completed: false },
                            step4: { text: '测试功能完整性', completed: false }
                        },
                        
                        // 标签信息
                        labels: [
                            { id: 'label-001', name: '认证', color: '#2196f3' },
                            { id: 'label-002', name: '安全', color: '#f44336' },
                            { id: 'label-003', name: '前端', color: '#ff9800' }
                        ],
                        
                        // 周报属性
                        weeklyReport: {
                            enabled: true,
                            frequency: 'weekly',
                            dayOfWeek: 1,
                            reportTemplate: '本周完成了用户认证功能的基础开发',
                            lastSubmitted: null,
                            nextDue: createSafeFutureDate(7),
                            history: []
                        },
                        
                        // 日报属性
                        dailyReport: {
                            enabled: true,
                            frequency: 'daily',
                            timeOfDay: '18:00',
                            reportTemplate: '今日完成了登录界面的设计和基础实现',
                            lastSubmitted: null,
                            nextDue: createSafeFutureDate(1),
                            weekends: false
                        },
                        
                        // 任务特征属性
                        features: {
                            estimatedHours: 16,
                            actualHours: 8,
                            difficulty: 'medium',
                            type: 'feature',
                            dependencies: [],
                            milestone: '用户系统v1.0',
                            assignee: '开发工程师',
                            reviewer: '技术主管',
                            labels: ['认证', '安全'],
                            businessValue: 'high',
                            urgency: 'high',
                            complexity: 'medium'
                        },
                        
                        // 进度跟踪
                        progress: {
                            percentage: 50,
                            milestones: [
                                { name: '界面设计完成', completed: true, date: createSafeDate(new Date()) },
                                { name: '基础逻辑实现', completed: true, date: createSafeDate(new Date()) },
                                { name: '功能测试', completed: false, date: null }
                            ],
                            blockers: [],
                            notes: ['需要添加单元测试', '考虑添加双因素认证']
                        },
                        
                        // 时间跟踪
                        timeTracking: {
                            startDate: createSafeDate(new Date()),
                            endDate: null,
                            deadline: createSafeFutureDate(7),
                            estimatedDuration: 16,
                            actualDuration: 8,
                            timeEntries: [
                                { date: createSafeDate(new Date()), hours: 4, description: '界面设计' },
                                { date: createSafeDate(new Date()), hours: 4, description: '基础逻辑实现' }
                            ]
                        },
                        
                        // 子任务信息
                        subtasks: [
                            {
                                id: 'SUB-001',
                                title: '设计用户界面',
                                status: 'completed',
                                estimatedHours: 4,
                                actualHours: 4
                            },
                            {
                                id: 'SUB-002',
                                title: '实现登录逻辑',
                                status: 'completed',
                                estimatedHours: 6,
                                actualHours: 4
                            },
                            {
                                id: 'SUB-003',
                                title: '添加密码验证',
                                status: 'todo',
                                estimatedHours: 4,
                                actualHours: 0
                            },
                            {
                                id: 'SUB-004',
                                title: '功能测试',
                                status: 'todo',
                                estimatedHours: 2,
                                actualHours: 0
                            }
                        ],
                        
                        // 输入输出信息
                        input: '用户认证需求文档、UI设计稿、安全要求规范',
                        output: '完整的用户认证系统，包括登录、注册、密码重置功能',
                        
                        // 依赖关系
                        dependencies: {
                            blockedBy: [],
                            blocking: [],
                            relatedTo: []
                        }
                    },
                    {
                        // 基础任务信息
                        id: 'sample-task-002',
                        title: '示例任务：数据库性能优化',
                        description: '优化数据库查询性能，提升系统响应速度，包括索引优化和查询语句调优',
                        content: '分析慢查询，优化索引，调整数据库配置参数，实现读写分离',
                        status: 'in_progress',
                        priority: 'medium',
                        category: 'optimization',
                        tags: ['数据库', '性能', '优化', '运维'],
                        featureName: '缺陷检测',
                        cardTitle: 'AI代码审查系统',
                        
                        // 时间信息
                        createTime: createSafeDate(new Date()),
                        updateTime: createSafeDate(new Date()),
                        createdAt: createSafeDate(new Date()),
                        updatedAt: createSafeDate(new Date()),
                        dueDate: createSafeFutureDate(14),
                        startDate: createSafeDate(new Date()),
                        
                        // 任务类型和复杂度
                        type: 'improvement',
                        complexity: 'high',
                        estimatedHours: 24,
                        actualHours: 12,
                        progress: 25,
                        
                        // 步骤信息
                        steps: {
                            step1: { text: '分析当前性能瓶颈', completed: true },
                            step2: { text: '优化数据库索引', completed: false },
                            step3: { text: '调整查询语句', completed: false },
                            step4: { text: '性能测试验证', completed: false }
                        },
                        
                        // 标签信息
                        labels: [
                            { id: 'label-004', name: '数据库', color: '#9c27b0' },
                            { id: 'label-005', name: '性能', color: '#00bcd4' },
                            { id: 'label-006', name: '优化', color: '#ff9800' }
                        ],
                        
                        weeklyReport: {
                            enabled: false,
                            frequency: 'weekly',
                            dayOfWeek: 1,
                            reportTemplate: '',
                            lastSubmitted: null,
                            nextDue: null,
                            history: []
                        },
                        
                        dailyReport: {
                            enabled: false,
                            frequency: 'daily',
                            timeOfDay: '18:00',
                            reportTemplate: '',
                            lastSubmitted: null,
                            nextDue: null,
                            weekends: false
                        },
                        
                        features: {
                            estimatedHours: 24,
                            actualHours: 12,
                            difficulty: 'high',
                            type: 'improvement',
                            dependencies: [],
                            milestone: '系统性能提升v2.0',
                            assignee: 'DBA工程师',
                            reviewer: '架构师',
                            labels: ['数据库', '性能'],
                            businessValue: 'medium',
                            urgency: 'medium',
                            complexity: 'high'
                        },
                        
                        progress: {
                            percentage: 25,
                            milestones: [
                                { name: '性能分析完成', completed: true, date: new Date().toISOString() },
                                { name: '索引优化', completed: false, date: null },
                                { name: '性能测试', completed: false, date: null }
                            ],
                            blockers: ['需要生产环境数据进行分析'],
                            notes: ['考虑使用读写分离', '评估分库分表方案']
                        },
                        
                        timeTracking: {
                            startDate: new Date().toISOString(),
                            endDate: null,
                            deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                            estimatedDuration: 24,
                            actualDuration: 12,
                            timeEntries: [
                                { date: new Date().toISOString(), hours: 8, description: '性能分析' },
                                { date: new Date().toISOString(), hours: 4, description: '方案设计' }
                            ]
                        },
                        
                        // 子任务信息
                        subtasks: [
                            {
                                id: 'SUB-005',
                                title: '性能瓶颈分析',
                                status: 'completed',
                                estimatedHours: 8,
                                actualHours: 8
                            },
                            {
                                id: 'SUB-006',
                                title: '索引优化方案',
                                status: 'in_progress',
                                estimatedHours: 8,
                                actualHours: 4
                            },
                            {
                                id: 'SUB-007',
                                title: '查询语句优化',
                                status: 'todo',
                                estimatedHours: 6,
                                actualHours: 0
                            },
                            {
                                id: 'SUB-008',
                                title: '性能测试验证',
                                status: 'todo',
                                estimatedHours: 2,
                                actualHours: 0
                            }
                        ],
                        
                        // 输入输出信息
                        input: '当前数据库性能报告、慢查询日志、系统架构文档',
                        output: '优化后的数据库配置、性能测试报告、运维手册',
                        
                        // 依赖关系
                        dependencies: {
                            blockedBy: [],
                            blocking: [],
                            relatedTo: []
                        }
                    },
                    {
                        // 基础任务信息
                        id: 'sample-task-003',
                        title: '示例任务：API文档编写',
                        description: '为系统API编写完整的开发文档，包括接口说明、参数说明和示例代码',
                        content: '编写API接口说明、参数说明、示例代码、错误码说明和调用示例',
                        status: 'completed',
                        priority: 'low',
                        category: 'documentation',
                        tags: ['文档', 'API', '开发', '维护'],
                        featureName: '缺陷检测',
                        cardTitle: 'AI代码审查系统',
                        
                        // 时间信息
                        createTime: createSafeDate(new Date()),
                        updateTime: createSafeDate(new Date()),
                        createdAt: createSafeDate(new Date()),
                        updatedAt: createSafeDate(new Date()),
                        dueDate: createSafeDate(new Date()),
                        startDate: createSafePastDate(7),
                        
                        // 任务类型和复杂度
                        type: 'documentation',
                        complexity: 'low',
                        estimatedHours: 8,
                        actualHours: 6,
                        progress: 100,
                        
                        // 步骤信息
                        steps: {
                            step1: { text: '收集API接口信息', completed: true },
                            step2: { text: '编写接口说明', completed: true },
                            step3: { text: '添加示例代码', completed: true },
                            step4: { text: '文档审查和发布', completed: true }
                        },
                        
                        // 标签信息
                        labels: [
                            { id: 'label-007', name: '文档', color: '#9c27b0' },
                            { id: 'label-008', name: 'API', color: '#3f51b5' },
                            { id: 'label-009', name: '开发', color: '#2196f3' }
                        ],
                        
                        weeklyReport: {
                            enabled: false,
                            frequency: 'weekly',
                            dayOfWeek: 1,
                            reportTemplate: '',
                            lastSubmitted: null,
                            nextDue: null,
                            history: []
                        },
                        
                        dailyReport: {
                            enabled: false,
                            frequency: 'daily',
                            timeOfDay: '18:00',
                            reportTemplate: '',
                            lastSubmitted: null,
                            nextDue: null,
                            weekends: false
                        },
                        
                        features: {
                            estimatedHours: 8,
                            actualHours: 6,
                            difficulty: 'low',
                            type: 'documentation',
                            dependencies: [],
                            milestone: '开发文档v1.0',
                            assignee: '技术文档工程师',
                            reviewer: '产品经理',
                            labels: ['文档', 'API'],
                            businessValue: 'low',
                            urgency: 'low',
                            complexity: 'low'
                        },
                        
                        progress: {
                            percentage: 100,
                            milestones: [
                                { name: '接口信息收集', completed: true, date: new Date().toISOString() },
                                { name: '文档编写', completed: true, date: new Date().toISOString() },
                                { name: '文档审查', completed: true, date: new Date().toISOString() }
                            ],
                            blockers: [],
                            notes: ['文档已发布到内部知识库', '后续需要定期更新维护']
                        },
                        
                        timeTracking: {
                            startDate: new Date().toISOString(),
                            endDate: new Date().toISOString(),
                            deadline: new Date().toISOString(),
                            estimatedDuration: 8,
                            actualDuration: 6,
                            timeEntries: [
                                { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), hours: 3, description: '接口信息收集' },
                                { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), hours: 3, description: '文档编写和审查' }
                            ]
                        },
                        
                        // 子任务信息
                        subtasks: [
                            {
                                id: 'SUB-009',
                                title: '接口信息收集',
                                status: 'completed',
                                estimatedHours: 2,
                                actualHours: 2
                            },
                            {
                                id: 'SUB-010',
                                title: '文档编写',
                                status: 'completed',
                                estimatedHours: 4,
                                actualHours: 3
                            },
                            {
                                id: 'SUB-011',
                                title: '文档审查',
                                status: 'completed',
                                estimatedHours: 2,
                                actualHours: 1
                            }
                        ],
                        
                        // 输入输出信息
                        input: 'API接口代码、业务需求文档、现有文档模板',
                        output: '完整的API开发文档、接口调用示例、错误码说明',
                        
                        // 依赖关系
                        dependencies: {
                            blockedBy: [],
                            blocking: [],
                            relatedTo: []
                        }
                    }
                ]
            };

            // 构建文件名
            const fileName = 'TaskPro_上传样例数据.json';
            
            // 生成JSON文件并下载
            const jsonContent = JSON.stringify(sampleData, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json' });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // 安全检查：确保loading函数存在
            if (window.hideGlobalLoading) {
                window.hideGlobalLoading();
            }
            
            // 显示下载成功信息
            const successMessage = `样例数据下载成功！
📋 样例内容：
• 包含 ${sampleData.totalTasks} 个示例任务
• 涵盖不同状态、优先级和类型的任务
• 包含完整的任务属性结构
• 文件大小：${(jsonContent.length / 1024).toFixed(2)} KB
• 文件名：${fileName}

💡 使用说明：
• 下载后可以查看数据结构
• 可以直接通过"上传"按钮重新上传
• 系统会自动识别并导入所有任务数据
• 适合作为数据导入的参考模板`;
            
            // 安全检查：确保message函数存在
            if (window.showSuccess) {
                window.showSuccess(successMessage);
            } else {
                console.log('[样例下载] 样例数据下载完成:', successMessage);
            }
            console.log('[样例下载] 样例数据下载完成:', {
                totalTasks: sampleData.totalTasks,
                fileName: fileName,
                fileSize: (jsonContent.length / 1024).toFixed(2) + ' KB'
            });

        } catch (error) {
            // 安全检查：确保loading函数存在
            if (window.hideGlobalLoading) {
                window.hideGlobalLoading();
            }
            console.error('[样例下载] 下载失败:', error);
            // 安全检查：确保message函数存在
            if (window.showError) {
                window.showError('样例下载失败: ' + (error?.message || '未知错误'));
            } else {
                console.error('[样例下载] 样例下载失败:', error?.message || '未知错误');
            }
        }
    };

    /**
     * 处理上传任务数据
     */
    const handleUploadTasks = async (event) => {
        try {
            const file = event.target.files[0];
            if (!file) return;

            window.showGlobalLoading('正在处理上传文件...');
            console.log('[上传] 开始处理文件:', file.name, '类型:', file.type);

            // 判断文件类型并处理
            if (file.name.toLowerCase().endsWith('.zip')) {
                await handleZipUpload(file);
            } else if (file.name.toLowerCase().endsWith('.json')) {
                await handleJsonUpload(file);
            } else {
                throw new Error('不支持的文件格式，请上传 ZIP 或 JSON 文件');
            }

            // 清除文件输入
            event.target.value = '';

        } catch (error) {
            window.hideGlobalLoading();
            console.error('[上传] 上传失败:', error);
            window.showError('上传失败: ' + (error?.message || '未知错误'));
            // 清除文件输入
            event.target.value = '';
        }
    };

    /**
     * 处理ZIP文件上传
     */
    const handleZipUpload = async (zipFile) => {
        try {
            window.showGlobalLoading('正在解析ZIP文件...');
            
            // 动态加载JSZip
            const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')).default || window.JSZip;
            const zip = new JSZip();
            
            // 读取ZIP文件
            const zipContent = await zip.loadAsync(zipFile);
            
            let treeData = null;
            let filesData = null;
            
            // 查找并读取tree.json和files.json
            const treeFile = zipContent.file('tree.json');
            const filesFile = zipContent.file('files.json');
            
            if (!treeFile && !filesFile) {
                throw new Error('ZIP文件中未找到 tree.json 或 files.json');
            }
            
            if (treeFile) {
                const treeContent = await treeFile.async('text');
                treeData = JSON.parse(treeContent);
                console.log('[上传] 解析tree.json成功:', treeData);
            }
            
            if (filesFile) {
                const filesContent = await filesFile.async('text');
                filesData = JSON.parse(filesContent);
                console.log('[上传] 解析files.json成功，文件数量:', Object.keys(filesData).length);
            }
            
            window.showGlobalLoading('正在导入任务数据...');
            
            // 导入任务数据到数据库
            if (filesData) {
                // 从URL中获取featureName和cardTitle，按约定透传给接口
                const urlParams = new URLSearchParams(window.location.search);
                const featureName = urlParams.get('featureName') || '';
                const cardTitle = urlParams.get('cardTitle') || '';
                let importedCount = 0;
                let skippedCount = 0;
                
                for (const [filePath, taskData] of Object.entries(filesData)) {
                    try {
                        // 构建要保存的任务对象
                        const taskToSave = {
                            title: taskData.title,
                            description: taskData.description,
                            content: taskData.content,
                            status: taskData.status,
                            priority: taskData.priority,
                            category: taskData.category,
                            featureName: taskData.featureName || featureName || '',
                            cardTitle: taskData.cardTitle || cardTitle || '',
                            tags: taskData.tags,
                            steps: taskData.steps,
                            createTime: createSafeDate(taskData.createTime),
                            updateTime: createSafeDate(new Date()),
                            weeklyReport: taskData.weeklyReport,
                            dailyReport: taskData.dailyReport,
                            features: taskData.features,
                            progress: taskData.progress,
                            timeTracking: taskData.timeTracking
                        };
                        
                        // 先尝试通过 id/key 或标题匹配现有任务，决定是更新还是新建
                        const existing = (store.tasksData.value || []).find(t => {
                            if (!t) return false;
                            const sameId = taskData.id && (t.id === taskData.id || t.key === taskData.id);
                            const sameTitle = t.title === taskData.title;
                            return !!(sameId || sameTitle);
                        });

                        // 组装基础URL，附加featureName/cardTitle
                        let baseUrl = `${window.API_URL}/mongodb/?cname=tasks`;
                        if (featureName) baseUrl += `&featureName=${encodeURIComponent(featureName)}`;
                        if (cardTitle) baseUrl += `&cardTitle=${encodeURIComponent(cardTitle)}`;

                        let response;
                        if (existing && (existing.key || existing.id)) {
                            // 更新：必须带上key（或id）
                            const payload = { ...taskToSave, key: existing.key || existing.id };
                            response = await window.updateData(baseUrl, payload);
                        } else {
                            // 新建
                            response = await window.postData(baseUrl, taskToSave);
                        }
                        
                        if (response && response.success !== false) {
                            importedCount++;
                            console.log(`[上传] 导入任务成功: ${taskData.title}`);
                        } else {
                            skippedCount++;
                            console.warn(`[上传] 跳过任务: ${taskData.title}`);
                        }
                    } catch (error) {
                        skippedCount++;
                        console.warn(`[上传] 导入任务失败: ${filePath}:`, error);
                    }
                }
                
                window.hideGlobalLoading();
                
                // 显示导入结果
                const resultMessage = `ZIP文件导入完成！
📊 导入统计：
• 成功导入：${importedCount} 个任务
• 跳过任务：${skippedCount} 个
• 总处理：${Object.keys(filesData).length} 个文件`;
                
                window.showSuccess(resultMessage);
                
                // 重新加载任务数据
                await store.loadTasksData();
                
            } else {
                throw new Error('ZIP文件中没有有效的任务数据');
            }

        } catch (error) {
            window.hideGlobalLoading();
            throw error;
        }
    };

    /**
     * 处理JSON文件上传
     */
    const handleJsonUpload = async (jsonFile) => {
        try {
            window.showGlobalLoading('正在解析JSON文件...');
            
            const fileContent = await jsonFile.text();
            const uploadData = JSON.parse(fileContent);
            
            if (!uploadData.tasks || !Array.isArray(uploadData.tasks)) {
                throw new Error('JSON文件格式无效，缺少tasks数组');
            }
            
            window.showGlobalLoading('正在导入任务数据...');
            
            let importedCount = 0;
            let skippedCount = 0;
            
            // 从URL中获取featureName和cardTitle，按约定透传给接口
            const urlParams = new URLSearchParams(window.location.search);
            const featureName = urlParams.get('featureName') || '';
            const cardTitle = urlParams.get('cardTitle') || '';

            for (const taskData of uploadData.tasks) {
                try {
                    // 构建要保存的任务对象
                    const taskToSave = {
                        title: taskData.title,
                        description: taskData.description,
                        content: taskData.content,
                        status: taskData.status,
                        priority: taskData.priority,
                        category: taskData.category,
                        featureName: taskData.featureName || featureName || '',
                        cardTitle: taskData.cardTitle || cardTitle || '',
                        tags: taskData.tags,
                        steps: taskData.steps,
                        createTime: createSafeDate(taskData.createTime),
                        updateTime: createSafeDate(new Date()),
                        weeklyReport: taskData.weeklyReport,
                        dailyReport: taskData.dailyReport,
                        features: taskData.features,
                        progress: taskData.progress,
                        timeTracking: taskData.timeTracking
                    };
                    
                    // 先尝试通过标题匹配现有任务，决定是更新还是新建
                    const existing = (store.tasksData.value || []).find(t => t && t.title === taskData.title);

                    // 组装基础URL，附加featureName/cardTitle
                    let baseUrl = `${window.API_URL}/mongodb/?cname=tasks`;
                    if (featureName) baseUrl += `&featureName=${encodeURIComponent(featureName)}`;
                    if (cardTitle) baseUrl += `&cardTitle=${encodeURIComponent(cardTitle)}`;

                    // 调用API保存任务（更新优先）
                    let response;
                    if (existing && (existing.key || existing.id)) {
                        const payload = { ...taskToSave, key: existing.key || existing.id };
                        response = await window.updateData(baseUrl, payload);
                    } else {
                        response = await window.postData(baseUrl, taskToSave);
                    }
                    
                    if (response && response.success !== false) {
                        importedCount++;
                        console.log(`[上传] 导入任务成功: ${taskData.title}`);
                    } else {
                        skippedCount++;
                        console.warn(`[上传] 跳过任务: ${taskData.title}`);
                    }
                } catch (error) {
                    skippedCount++;
                    console.warn(`[上传] 导入任务失败: ${taskData.title}:`, error);
                }
            }
            
            window.hideGlobalLoading();
            
            // 显示导入结果
            const resultMessage = `JSON文件导入完成！
📊 导入统计：
• 成功导入：${importedCount} 个任务
• 跳过任务：${skippedCount} 个
• 总处理：${uploadData.tasks.length} 个任务`;
            
            window.showSuccess(resultMessage);
            
            // 重新加载任务数据
            await store.loadTasksData();
            
        } catch (error) {
            window.hideGlobalLoading();
            throw error;
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

        // 任务选择和更新方法
        handleTaskSelect: (task) => {
            console.log('[任务选择] 选中任务:', task.title);
            store.selectTask(task);
        },

        // 任务更新方法
        handleTaskUpdate: async (updateData) => {
            const { task, timeData } = updateData;
            console.log('[任务更新] 更新任务时间数据:', task.title, timeData);
            
            const success = await updateTaskTimeData(task, timeData);
            if (success) {
                console.log('[任务更新] 更新成功');
                // 重新加载任务数据
                await loadTasksData();
            } else {
                console.error('[任务更新] 更新失败');
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
                    // 重新加载任务数据
                    await loadTasksData();
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

        // 设置相关方法
        openSettings,

        // 下载和上传功能
        handleDownloadTasks,
        handleDownloadSample,
        triggerUploadTasks,
        handleUploadTasks
    };
}; 






