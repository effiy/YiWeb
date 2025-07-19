/**
 * 新闻页面数据存储管理
 * author: liangliang
 */

import { getData } from '/apis/index.js';

// 兼容Vue2和Vue3的ref获取方式
const vueRef = typeof Vue !== 'undefined' && Vue.ref ? Vue.ref : (val) => ({ value: val });

/**
 * 数据存储工厂函数
 * 管理新闻数据、搜索状态、日期导航、加载状态和错误信息
 * @returns {Object} store对象，包含newsData, searchQuery, currentDate, loading, error等方法
 */
export const createStore = () => {
    // 新闻数据
    const newsData = vueRef([]);
    // 搜索查询
    const searchQuery = vueRef('');
    // 当前选中的分类
    const selectedCategories = vueRef(new Set());
    // 当前选中的标签
    const selectedTags = vueRef(new Set());
    // 当前日期
    const currentDate = vueRef(new Date());
    // 日历月份
    const calendarMonth = vueRef(new Date());
    // 今天日期
    const today = vueRef(new Date());
    // 加载状态
    const loading = vueRef(false);
    // 错误信息
    const error = vueRef(null);
    // 错误消息
    const errorMessage = vueRef('');
    // 点击过的新闻项
    const clickedItems = vueRef(new Set());
    // 搜索历史
    const searchHistory = vueRef([]);
    // 侧边栏收缩状态
    const sidebarCollapsed = vueRef(false);
    // 标签统计
    const tagStatistics = vueRef({});

    /**
     * 异步加载新闻数据
     * 支持多次调用，自动处理加载状态和错误
     */
    const loadNewsData = async (date) => {
        loading.value = true;
        error.value = null;
        errorMessage.value = '';
        
        try {
            const dateStr = formatDate(date || currentDate.value);
            const todayStr = formatDate(today.value);
            
            if (dateStr > todayStr) {
                throw new Error('无法查看未来日期的新闻');
            }
            
            // 支持本地mock和远程接口切换
            const data = await getData(`https://api.effiy.cn/mongodb/?cname=rss&isoDate=${dateStr},${dateStr}`);
            if (Array.isArray(data)) {
                newsData.value = data;
                updateTagStatistics(data);
            } else {
                throw new Error('新闻数据格式错误');
            }
        } catch (err) {
            error.value = err && err.message ? err.message : '加载新闻数据失败';
            errorMessage.value = error.value;
            newsData.value = [];
            tagStatistics.value = {};
        } finally {
            loading.value = false;
        }
    };

    /**
     * 更新标签统计
     * @param {Array} data - 新闻数据
     */
    const updateTagStatistics = (data) => {
        const stats = {};
        data.forEach(item => {
            if (item.tags && Array.isArray(item.tags)) {
                item.tags.forEach(tag => {
                    stats[tag] = (stats[tag] || 0) + 1;
                });
            }
        });
        tagStatistics.value = stats;
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
     * 切换标签选择
     * @param {string} tag - 标签名称
     */
    const toggleTag = (tag) => {
        if (selectedTags.value.has(tag)) {
            selectedTags.value.delete(tag);
        } else {
            selectedTags.value.add(tag);
        }
    };

    /**
     * 设置当前日期
     * @param {Date} date - 日期对象
     */
    const setCurrentDate = (date) => {
        if (date instanceof Date) {
            currentDate.value = new Date(date);
        }
    };

    /**
     * 设置日历月份
     * @param {Date} date - 月份日期
     */
    const setCalendarMonth = (date) => {
        if (date instanceof Date) {
            calendarMonth.value = new Date(date.getFullYear(), date.getMonth(), 1);
        }
    };

    /**
     * 切换侧边栏状态
     */
    const toggleSidebar = () => {
        sidebarCollapsed.value = !sidebarCollapsed.value;
    };

    /**
     * 添加点击的新闻项
     * @param {string} itemKey - 新闻项标识
     */
    const addClickedItem = (itemKey) => {
        clickedItems.value.add(itemKey);
        setTimeout(() => clickedItems.value.delete(itemKey), 300);
    };

    /**
     * 添加搜索历史
     * @param {string} query - 搜索查询
     */
    const addSearchHistory = (query) => {
        if (query && !searchHistory.value.includes(query)) {
            searchHistory.value.unshift(query);
            searchHistory.value = searchHistory.value.slice(0, 10);
        }
    };

    /**
     * 清空搜索
     */
    const clearSearch = () => {
        searchQuery.value = '';
        selectedCategories.value.clear();
        selectedTags.value.clear();
    };

    /**
     * 清空错误
     */
    const clearError = () => {
        error.value = null;
        errorMessage.value = '';
    };

    /**
     * 日期格式化函数
     * @param {Date} date - 日期对象
     * @returns {string} 格式化后的日期字符串
     */
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // 自动初始化加载
    loadNewsData();

    // 便于扩展：后续可添加更多数据和方法
    return {
        // 响应式数据
        newsData,              // 新闻数据
        searchQuery,           // 搜索查询
        selectedCategories,    // 选中的分类
        selectedTags,          // 选中的标签
        currentDate,           // 当前日期
        calendarMonth,         // 日历月份
        today,                 // 今天日期
        loading,               // 加载状态
        error,                 // 错误状态
        errorMessage,          // 错误消息
        clickedItems,          // 点击过的新闻项
        searchHistory,         // 搜索历史
        sidebarCollapsed,      // 侧边栏收缩状态
        tagStatistics,         // 标签统计
        
        // 方法
        loadNewsData,          // 加载新闻数据
        setSearchQuery,        // 设置搜索查询
        toggleCategory,        // 切换分类选择
        toggleTag,             // 切换标签选择
        setCurrentDate,        // 设置当前日期
        setCalendarMonth,      // 设置日历月份
        toggleSidebar,         // 切换侧边栏
        addClickedItem,        // 添加点击的新闻项
        addSearchHistory,      // 添加搜索历史
        clearSearch,           // 清空搜索
        clearError,            // 清空错误
        formatDate             // 日期格式化
    };
};
