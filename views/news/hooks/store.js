/**
 * 新闻页面数据存储管理
 * author: liangliang
 */

import { getData } from '/apis/index.js';
import { formatDate, isFutureDate } from '/utils/date.js';
import { safeExecuteAsync, createError, ErrorTypes } from '/utils/error.js';

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
        return safeExecuteAsync(async () => {
            loading.value = true;
            error.value = null;
            errorMessage.value = '';
            
            const targetDate = date || currentDate.value;
            const dateStr = formatDate(targetDate);
            const todayStr = formatDate(today.value);
            
            if (isFutureDate(targetDate, today.value)) {
                throw createError('无法查看未来日期的新闻', ErrorTypes.VALIDATION, '新闻加载');
            }
            
            console.log(`[loadNewsData] 正在加载 ${dateStr} 的新闻数据...`);
            
            const response = await getData(`${window.API_URL}/mongodb/?cname=rss&isoDate=${dateStr},${dateStr}`);
            const data = response.data.list;
            
            if (!Array.isArray(data)) {
                throw createError('新闻数据格式错误', ErrorTypes.API, '新闻加载');
            }
            
            newsData.value = data;
            console.log(`[loadNewsData] 成功加载 ${data.length} 条新闻数据`);
            
            return data;
        }, '新闻数据加载', (errorInfo) => {
            error.value = errorInfo.message;
            errorMessage.value = errorInfo.message;
            newsData.value = [];
            tagStatistics.value = {};
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

    // 自动初始化加载 - 延迟执行以确保组件完全初始化
    setTimeout(() => {
        loadNewsData();
    }, 100);

    // 返回状态和方法
    return {
        // 响应式数据
        newsData,
        searchQuery,
        selectedCategories,
        selectedTags,
        currentDate,
        calendarMonth,
        today,
        loading,
        error,
        errorMessage,
        clickedItems,
        searchHistory,
        sidebarCollapsed,
        tagStatistics,
        
        // 方法
        loadNewsData,
        setSearchQuery,
        toggleCategory,
        toggleTag,
        setCurrentDate,
        setCalendarMonth,
        toggleSidebar,
        addClickedItem,
        addSearchHistory,
        clearSearch,
        clearError
    };
};

/**
 * 获取分类配置 - 基于featureCards.json的功能模块
 * @returns {Array} 分类配置数组
 */
export function getCategoriesConfig() {
    return [
        { key: 'data-analysis', icon: 'fas fa-chart-line', title: '数据分析', badge: '数据分析' },
        { key: 'code-assistant', icon: 'fas fa-code', title: '代码助手', badge: '代码编写' },
        { key: 'ai-art', icon: 'fas fa-palette', title: 'AI艺术', badge: '生图创造' },
        { key: 'other', icon: 'fas fa-ellipsis-h', title: '其他' }
    ];
}

/**
 * 分类新闻项 - 基于featureCards.json的功能模块
 * @param {Object} item - 新闻项
 * @returns {string} 分类键
 */
export function categorizeNewsItem(item) {
    if (!item.category) return 'other';
    
    // 基于featureCards.json的功能模块分类
    const categoryMap = {
        '数据分析': 'data-analysis',
        '智能数据分析': 'data-analysis',
        '数据': 'data-analysis',
        '统计': 'data-analysis',
        '预测': 'data-analysis',
        '代码': 'code-assistant',
        '智能代码助手': 'code-assistant',
        '编程': 'code-assistant',
        '开发': 'code-assistant',
        '脚本': 'code-assistant',
        'AI艺术': 'ai-art',
        '艺术创作': 'ai-art',
        '生图': 'ai-art',
        '图像': 'ai-art',
        '创意': 'ai-art'
    };
    
    return categoryMap[item.category] || 'other';
} 