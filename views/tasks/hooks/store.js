/**
 * 任务页面数据存储管理
 * author: liangliang
 */

import { getData, deleteData } from '/apis/index.js';
import { safeExecuteAsync } from '/utils/error.js';

// 兼容Vue2和Vue3的ref获取方式
const vueRef = typeof Vue !== 'undefined' && Vue.ref ? Vue.ref : (val) => ({ value: val });

/**
 * 数据存储工厂函数
 * 管理任务数据、搜索状态、加载状态和错误信息
 * @returns {Object} store对象，包含tasksData, searchQuery, loading, error等方法
 */
export const createStore = () => {
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
    // 选中的任务
    const selectedTask = vueRef(null);
    // 详情面板是否可见
    const isDetailVisible = vueRef(false);

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
        return safeExecuteAsync(async () => {
            loading.value = true;
            error.value = null;
            errorMessage.value = '';
            
            console.log('[loadTasksData] 正在加载任务数据...');
            

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
            const mongoResponse = await getData(queryUrl);

            const mongoData = mongoResponse.data.list;

            console.log('[loadTasksData] 加载到的mongo数据:', mongoData);
            
            // 去重，避免重复的任务
            const allTasks = Array.isArray(mongoData) ? mongoData : [];
            const uniqueTasks = [];
            const seenTitles = new Set();
            
            for (const task of allTasks) {
                if (task && task.title && !seenTitles.has(task.title)) {
                    seenTitles.add(task.title);
                    
                    // 确保每个任务都有唯一的key
                    if (!task.key) {
                        task.key = generateUniqueId();
                    }
                    
                    uniqueTasks.push(task);
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
            
            return uniqueTasks;
        }, '任务数据加载', (errorInfo) => {
            error.value = errorInfo.message;
            errorMessage.value = errorInfo.message;
            tasksData.value = [];
        }).finally(() => {
            loading.value = false;
        });
    };

    /**
     * 删除任务
     * @param {Object} task - 要删除的任务对象
     * @returns {boolean} 删除是否成功
     */
    const deleteTask = async (task) => {
        return safeExecuteAsync(async () => {
            console.log('[deleteTask] 开始删除任务:', task.title);
            
            // 构建删除API的URL
            const urlParams = new URLSearchParams(window.location.search);
            let deleteUrl = `${window.API_URL}/mongodb/?cname=tasks&key=${task.key}`;
            
            console.log('[deleteTask] 删除API URL:', deleteUrl);
            
            // 调用API删除任务
            const deleteResult = await deleteData(deleteUrl);
            
            console.log('[deleteTask] API删除结果:', deleteResult);
            
            // 验证删除结果
            if (deleteResult && deleteResult.success !== false) {
                // 从本地任务数据中移除任务
                const updatedTasks = tasksData.value.filter(t => t.title !== task.title);
                tasksData.value = updatedTasks;
                
                // 如果删除的是当前选中的任务，关闭详情
                if (selectedTask.value && selectedTask.value.title === task.title) {
                    closeTaskDetail();
                }
                
                // 从点击记录中移除
                clickedItems.value.delete(task.title);
                
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
     * 选择任务
     * @param {Object} task - 任务对象
     */
    const selectTask = (task) => {
        selectedTask.value = task;
        isDetailVisible.value = true;
    };

    /**
     * 关闭任务详情
     */
    const closeTaskDetail = () => {
        selectedTask.value = null;
        isDetailVisible.value = false;
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
        selectedTask,
        isDetailVisible,

        // 方法
        loadTasksData,
        deleteTask,
        setSearchQuery,
        toggleCategory,
        addClickedItem,
        addSearchHistory,
        clearSearch,
        clearError,
        selectTask,
        closeTaskDetail,
        generateUniqueId
    };
};

/**
 * 获取任务分类配置
 * @returns {Array} 分类配置数组
 */
export function getCategoriesConfig() {
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
export function categorizeTask(task) {
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




