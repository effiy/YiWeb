/**
 * 任务页面数据存储管理
 * author: liangliang
 */

import { getData } from '/apis/index.js';
import { safeExecuteAsync, createError, ErrorTypes } from '/utils/error.js';

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
     * 异步加载任务数据
     * 支持多次调用，自动处理加载状态和错误
     */
    const loadTasksData = async () => {
        return safeExecuteAsync(async () => {
            loading.value = true;
            error.value = null;
            errorMessage.value = '';
            
            console.log('[loadTasksData] 正在加载任务数据...');
            
            // 从本地文件加载任务数据
            const tasksResponseData = await getData(`${window.DATA_URL}/mock/tasks/tasks.json`);

            console.log('[loadTasksData] 加载到的任务数据:', tasksResponseData);
            
            tasksData.value = tasksResponseData;
            console.log(`[loadTasksData] 成功加载 ${tasksResponseData.length} 条任务数据`);
            
            return tasksResponseData;
        }, '任务数据加载', (errorInfo) => {
            error.value = errorInfo.message;
            errorMessage.value = errorInfo.message;
            tasksData.value = [];
        }).finally(() => {
            loading.value = false;
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
        setSearchQuery,
        toggleCategory,
        addClickedItem,
        addSearchHistory,
        clearSearch,
        clearError,
        selectTask,
        closeTaskDetail
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

