/**
 * 任务页面数据存储管理
 * author: liangliang
 */

// 模块依赖改为全局方式
// import { getData, deleteData } from '/apis/index.js';
// import { safeExecuteAsync } from '/utils/error.js';

// 兼容Vue2和Vue3的ref获取方式
const vueRef = typeof Vue !== 'undefined' && Vue.ref ? Vue.ref : (val) => ({ value: val });

/**
 * 获取周数
 * @param {Date} date - 日期对象
 * @returns {number} 周数
 */
const getWeekNumber = (date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

/**
 * 数据存储工厂函数
 * 管理任务数据、搜索状态、加载状态和错误信息
 * @returns {Object} store对象，包含tasksData, searchQuery, loading, error等方法
 */
window.createStore = () => {
    // 任务数据
    const tasksData = vueRef([]);
    // 搜索查询
    const searchQuery = vueRef('');
    // 当前选中的分类
    const selectedCategories = vueRef(new Set());
    // 加载状态
    const loading = vueRef(false);
    // 错误信息
    const error = vueRef(null);
    // 错误消息
    const errorMessage = vueRef('');
    // 点击过的任务项
    const clickedItems = vueRef(new Set());
    // 搜索历史
    const searchHistory = vueRef([]);

    // 当前视图模式：list、gantt
    const currentView = vueRef('list');
    // 日期范围
    const dateRange = vueRef({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    });
    // 时间视图过滤器
    const timeFilter = vueRef({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        week: getWeekNumber(new Date()),
        day: new Date().toISOString().split('T')[0]
    });



    /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     */
    const generateUniqueId = () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    /**
     * 异步加载任务数据
     * 支持多次调用，自动处理加载状态和错误
     */
    const loadTasksData = async () => {
        // 防止重复调用
        if (loading.value) {
            console.log('[loadTasksData] 数据正在加载中，跳过重复调用');
            return tasksData.value;
        }
        
        return window.safeExecuteAsync(async () => {
            loading.value = true;
            error.value = null;
            errorMessage.value = '';
            
            console.log('[loadTasksData] 正在加载任务数据...');
            
            try {
                // 根据浏览器请求参数拼接featureName和cardTitle进行条件查询
                const urlParams = new URLSearchParams(window.location.search);
                let queryUrl = `${window.API_URL}/mongodb/?cname=tasks`;
                const featureName = urlParams.get('featureName');
                const cardTitle = urlParams.get('cardTitle');
                if (featureName) {
                    queryUrl += `&featureName=${encodeURIComponent(featureName)}`;
                }
                if (cardTitle) {
                    queryUrl += `&cardTitle=${encodeURIComponent(cardTitle)}`;
                }
                
                console.log('[loadTasksData] 查询URL:', queryUrl);
                
                const mongoResponse = await window.getData(queryUrl);
                
                // 验证响应数据
                if (!mongoResponse || !mongoResponse.data) {
                    throw new Error('API响应数据格式错误');
                }
                
                const mongoData = mongoResponse.data.list;
                console.log('[loadTasksData] 加载到的mongo数据:', mongoData);
                
                // 验证数据格式
                if (!Array.isArray(mongoData)) {
                    console.warn('[loadTasksData] API返回的数据不是数组，使用空数组');
                    tasksData.value = [];
                    return [];
                }
                
                // 去重，避免重复的任务
                const allTasks = mongoData;
                const uniqueTasks = [];
                const seenTitles = new Set();
                
                for (const task of allTasks) {
                    if (task && task.title && !seenTitles.has(task.title)) {
                        seenTitles.add(task.title);
                        
                        // 确保每个任务都有唯一的key
                        if (!task.key) {
                            task.key = generateUniqueId();
                        }
                        
                        // 验证任务数据完整性
                        if (validateTaskData(task)) {
                            uniqueTasks.push(task);
                        } else {
                            console.warn('[loadTasksData] 跳过无效任务:', task.title);
                        }
                    }
                }
                
                tasksData.value = uniqueTasks;
                console.log(`[loadTasksData] 成功加载 ${uniqueTasks.length} 条唯一任务数据（去重前：${allTasks.length} 条）`);
                
                // 验证所有任务都有唯一的key
                const keys = uniqueTasks.map(task => task.key).filter(Boolean);
                const uniqueKeys = new Set(keys);
                console.log(`[loadTasksData] 任务key验证: 总key数 ${keys.length}, 唯一key数 ${uniqueKeys.size}`);
                
                if (keys.length !== uniqueKeys.size) {
                    console.warn('[loadTasksData] 警告：存在重复的key，这可能导致Vue渲染问题');
                }
                
                // 如果加载的数据为空，提供更详细的日志
                if (uniqueTasks.length === 0) {
                    console.warn('[loadTasksData] 加载的任务数据为空');
                    console.warn('[loadTasksData] 原始数据:', mongoData);
                    console.warn('[loadTasksData] 查询参数:', { featureName, cardTitle });
                } else {
                    // 数据加载成功，保存到缓存
                    saveCachedData(uniqueTasks);
                }
                
                return uniqueTasks;
                
            } catch (apiError) {
                console.error('[loadTasksData] API调用失败:', apiError);
                
                // 如果是网络错误，尝试使用缓存数据
                const cachedData = getCachedData();
                if (cachedData && cachedData.length > 0) {
                    console.log('[loadTasksData] 使用缓存数据作为备用');
                    tasksData.value = cachedData;
                    return cachedData;
                }
                
                // 如果API失败且没有缓存，抛出错误
                throw new Error(`数据加载失败: ${apiError.message || '网络连接错误'}`);
            }
            
        }, '任务数据加载', (errorInfo) => {
            error.value = errorInfo.message;
            errorMessage.value = errorInfo.message;
            tasksData.value = [];
            
            // 显示用户友好的错误信息
            if (window.showError) {
                window.showError(`数据加载失败: ${errorInfo.message}`);
            }
        }).finally(() => {
            loading.value = false;
        });
    };
    
    /**
     * 验证任务数据完整性
     */
    const validateTaskData = (task) => {
        try {
            if (!task || typeof task !== 'object') {
                return false;
            }
            
            if (!task.title || typeof task.title !== 'string' || task.title.trim() === '') {
                return false;
            }
            
            return true;
        } catch (error) {
            console.warn('[validateTaskData] 任务数据验证失败:', error);
            return false;
        }
    };
    
    /**
     * 获取缓存数据
     */
    const getCachedData = () => {
        try {
            const cached = localStorage.getItem('taskpro_cached_tasks');
            if (cached) {
                const data = JSON.parse(cached);
                // 检查缓存是否过期（24小时）
                const cacheTime = localStorage.getItem('taskpro_cache_time');
                if (cacheTime && Date.now() - parseInt(cacheTime) < 24 * 60 * 60 * 1000) {
                    return data;
                }
            }
        } catch (error) {
            console.warn('[getCachedData] 获取缓存数据失败:', error);
        }
        return null;
    };
    
    /**
     * 保存数据到缓存
     */
    const saveCachedData = (data) => {
        try {
            localStorage.setItem('taskpro_cached_tasks', JSON.stringify(data));
            localStorage.setItem('taskpro_cache_time', Date.now().toString());
        } catch (error) {
            console.warn('[saveCachedData] 保存缓存数据失败:', error);
        }
    };

    /**
     * 删除任务
     * @param {Object} task - 要删除的任务对象
     * @returns {boolean} 删除是否成功
     */
    const deleteTask = async (task) => {
        return window.safeExecuteAsync(async () => {
            console.log('[deleteTask] 开始删除任务:', task.title);
            
            // 构建删除API的URL
            const urlParams = new URLSearchParams(window.location.search);
            let deleteUrl = `${window.API_URL}/mongodb/?cname=tasks&key=${task.key}`;
            
            console.log('[deleteTask] 删除API URL:', deleteUrl);
            
            // 调用API删除任务
            const deleteResult = await window.deleteData(deleteUrl);
            
            console.log('[deleteTask] API删除结果:', deleteResult);
            
            // 验证删除结果
            if (deleteResult && deleteResult.success !== false) {
                // 记录删除前的任务数量
                const beforeCount = tasksData.value.length;
                console.log('[deleteTask] 删除前任务数量:', beforeCount);
                
                // 从本地任务数据中移除任务 - 使用多种匹配方式
                const taskIndex = tasksData.value.findIndex(t => 
                    (t.key && t.key === task.key) ||
                    (t.title && t.title === task.title) ||
                    (t.id && t.id === task.id)
                );
                
                if (taskIndex !== -1) {
                    // 使用splice确保Vue响应式更新
                    const deletedTask = tasksData.value[taskIndex];
                    tasksData.value.splice(taskIndex, 1);
                    console.log('[deleteTask] 从store中移除任务，索引:', taskIndex, '标题:', deletedTask.title);
                    
                    // 验证删除后的任务数量
                    const afterCount = tasksData.value.length;
                    const expectedCount = beforeCount - 1;
                    
                    console.log('[deleteTask] 删除后验证:', {
                        beforeCount,
                        afterCount,
                        expectedCount,
                        isCorrect: afterCount === expectedCount
                    });
                    
                    if (afterCount !== expectedCount) {
                        console.warn('[deleteTask] 任务数量不正确，可能存在数据不一致');
                    }
                } else {
                    console.warn('[deleteTask] 在store中未找到要删除的任务:', task.title);
                    // 即使没找到，也认为删除成功（可能已经被其他地方删除了）
                }
                
                // 从点击记录中移除
                clickedItems.value.delete(task.title);
                
                // 强制触发Vue响应式更新
                if (window.Vue && window.Vue.nextTick) {
                    window.Vue.nextTick(() => {
                        console.log('[deleteTask] Vue响应式更新完成，当前任务数量:', tasksData.value.length);
                    });
                }
                
                console.log('[deleteTask] 任务删除成功:', task.title);
                return true;
            } else {
                throw new Error('API删除失败：' + (deleteResult?.message || '未知错误'));
            }
        }, '任务删除', (errorInfo) => {
            console.error('[deleteTask] 删除任务失败:', errorInfo);
            return false;
        });
    };

    /**
     * 设置搜索查询
     * @param {string} query - 搜索查询
     */
    const setSearchQuery = (query) => {
        if (typeof query === 'string') {
            searchQuery.value = query.trim();
        }
    };

    /**
     * 切换分类选择
     * @param {string} category - 分类名称
     */
    const toggleCategory = (category) => {
        if (selectedCategories.value.has(category)) {
            selectedCategories.value.delete(category);
        } else {
            selectedCategories.value.add(category);
        }
    };

    /**
     * 添加点击过的任务项
     * @param {string} itemKey - 任务项的唯一标识
     */
    const addClickedItem = (itemKey) => {
        if (typeof itemKey === 'string') {
            clickedItems.value.add(itemKey);
        }
    };

    /**
     * 添加搜索历史
     * @param {string} query - 搜索查询
     */
    const addSearchHistory = (query) => {
        if (typeof query === 'string' && query.trim()) {
            const trimmedQuery = query.trim();
            if (!searchHistory.value.includes(trimmedQuery)) {
                searchHistory.value.unshift(trimmedQuery);
                // 限制历史记录数量
                if (searchHistory.value.length > 10) {
                    searchHistory.value = searchHistory.value.slice(0, 10);
                }
            }
        }
    };

    /**
     * 清除搜索
     */
    const clearSearch = () => {
        searchQuery.value = '';
        selectedCategories.value.clear();
    };

    /**
     * 清除错误
     */
    const clearError = () => {
        error.value = null;
        errorMessage.value = '';
    };





    /**
     * 切换视图模式
     * @param {string} view - 视图模式 ('list', 'gantt')
     */
    const setCurrentView = (view) => {
        if (['list', 'gantt'].includes(view)) {
            currentView.value = view;
            console.log(`[视图切换] 切换到${view}视图`);
        }
    };

    /**
     * 设置日期范围
     * @param {Object} range - 日期范围对象
     */
    const setDateRange = (range) => {
        if (range.start && range.end) {
            dateRange.value = {
                start: new Date(range.start),
                end: new Date(range.end)
            };
        }
    };

    /**
     * 设置时间过滤器
     * @param {Object} filter - 时间过滤器对象
     */
    const setTimeFilter = (filter) => {
        timeFilter.value = { ...timeFilter.value, ...filter };
    };

    /**
     * 获取任务的扩展时间属性
     * @param {Object} task - 任务对象
     * @returns {Object} 扩展的时间属性
     */
    const getTaskTimeData = (task) => {
        // 如果任务没有时间数据，生成默认值
        if (!task.timeData) {
            const now = new Date();
            const startDate = new Date(now);
            const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 默认7天后结束
            
            return {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                estimatedHours: 8,
                actualHours: 0,
                priority: 'medium',
                status: 'todo',
                progress: 0,
                dependencies: [],
                category: 'development',
                assignee: '',
                tags: task.tags || [],
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            };
        }
        return task.timeData;
    };

    /**
     * 更新任务时间数据
     * @param {Object} task - 任务对象
     * @param {Object} timeData - 时间数据
     */
    const updateTaskTimeData = async (task, timeData) => {
        try {
            // 找到对应的任务并更新
            const taskIndex = tasksData.value.findIndex(t => t.key === task.key);
            if (taskIndex !== -1) {
                // 创建新对象，避免状态共享
                const updatedTask = {
                    ...tasksData.value[taskIndex],
                    timeData: {
                        ...getTaskTimeData(task),
                        ...timeData,
                        updatedAt: new Date().toISOString()
                    }
                };
                
                // 替换原任务对象
                tasksData.value.splice(taskIndex, 1, updatedTask);
                
                // 这里可以调用API更新后端数据
                console.log(`[时间数据更新] 任务 ${task.title} 的时间数据已更新`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('[时间数据更新] 更新失败:', error);
            return false;
        }
    };

    /**
     * 选择任务
     * @param {Object} task - 任务对象
     */
    const selectTask = (task) => {
        // 这里可以添加任务选择逻辑
        console.log('[任务选择] 选中任务:', task.title);
    };

    /**
     * 更新任务数据
     * @param {Object} updatedTask - 更新后的任务对象
     */
    const updateTask = (updatedTask) => {
        try {
            const taskIndex = tasksData.value.findIndex(t => t.key === updatedTask.key || t.id === updatedTask.id);
            if (taskIndex !== -1) {
                // 创建新对象，避免状态共享
                const newTask = { ...updatedTask };
                
                // 替换原任务对象
                tasksData.value.splice(taskIndex, 1, newTask);
                
                console.log('[任务更新] 任务已更新:', updatedTask.title);
                return true;
            }
            return false;
        } catch (error) {
            console.error('[任务更新] 更新失败:', error);
            return false;
        }
    };

    return {
        // 响应式数据
        tasksData,
        searchQuery,
        selectedCategories,
        loading,
        error,
        errorMessage,
        clickedItems,
        searchHistory,

        currentView,
        dateRange,
        timeFilter,

        // 方法
        loadTasksData,
        deleteTask,
        setSearchQuery,
        toggleCategory,
        addClickedItem,
        addSearchHistory,
        clearSearch,
        clearError,

        generateUniqueId,
        setCurrentView,
        setDateRange,
        setTimeFilter,
        getTaskTimeData,
        updateTaskTimeData,
        selectTask,
        updateTask
    };
};

/**
 * 获取任务分类配置
 * @returns {Array} 分类配置数组
 */
window.getCategoriesConfig = function() {
    return [
        { key: 'development', name: '开发任务', icon: 'fas fa-code', color: '#3b82f6' },
        { key: 'design', name: '设计任务', icon: 'fas fa-palette', color: '#8b5cf6' },
        { key: 'testing', name: '测试任务', icon: 'fas fa-vial', color: '#10b981' },
        { key: 'deployment', name: '部署任务', icon: 'fas fa-rocket', color: '#f59e0b' },
        { key: 'optimization', name: '优化任务', icon: 'fas fa-tachometer-alt', color: '#ef4444' }
    ];
}

/**
 * 对任务进行分类
 * @param {Object} task - 任务对象
 * @returns {string} 分类键
 */
window.categorizeTask = function(task) {
    const title = task.title.toLowerCase();
    
    if (title.includes('开发') || title.includes('功能') || title.includes('模块') || title.includes('代码')) {
        return 'development';
    } else if (title.includes('设计') || title.includes('界面') || title.includes('UI') || title.includes('布局')) {
        return 'design';
    } else if (title.includes('测试') || title.includes('验证') || title.includes('检查')) {
        return 'testing';
    } else if (title.includes('部署') || title.includes('发布') || title.includes('上线')) {
        return 'deployment';
    } else if (title.includes('优化') || title.includes('性能') || title.includes('速度')) {
        return 'optimization';
    }
    
    return 'development'; // 默认分类
} 

// 创建全局store实例
window.store = window.createStore();


