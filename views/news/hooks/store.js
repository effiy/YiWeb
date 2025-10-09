/**
 * 新闻页面数据存储管理
 * author: liangliang
 */

import { getData } from '/apis/index.js';
import { formatDate, isFutureDate } from '/utils/date.js';
import { safeExecuteAsync, createError, ErrorTypes } from '/utils/error.js';
import { extractDomainCategory } from '/utils/domain.js';

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
    // 顶部分类（全部/新闻/评论）
    const activeCategory = vueRef('all');
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
    // 已读新闻集合（本地持久化）
    const readItems = vueRef(new Set());
    // 收藏新闻集合（本地持久化）
    const favoriteItems = vueRef(new Set());

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
     * 从本地存储恢复状态
     */
    const restorePersistence = () => {
        try {
            const readRaw = localStorage.getItem('newsReadItems');
            const favRaw = localStorage.getItem('newsFavoriteItems');
            if (readRaw) {
                const parsed = JSON.parse(readRaw);
                if (Array.isArray(parsed)) {
                    readItems.value = new Set(parsed);
                }
            }
            if (favRaw) {
                const parsed = JSON.parse(favRaw);
                if (Array.isArray(parsed)) {
                    favoriteItems.value = new Set(parsed);
                }
            }
        } catch (e) {
            console.warn('[news/store] 恢复本地持久化失败', e);
        }
    };

    /**
     * 保存已读集合到本地
     */
    const persistRead = () => {
        try {
            localStorage.setItem('newsReadItems', JSON.stringify(Array.from(readItems.value)));
        } catch (e) {
            console.warn('[news/store] 保存已读状态失败', e);
        }
    };

    /**
     * 保存收藏集合到本地
     */
    const persistFavorites = () => {
        try {
            localStorage.setItem('newsFavoriteItems', JSON.stringify(Array.from(favoriteItems.value)));
        } catch (e) {
            console.warn('[news/store] 保存收藏状态失败', e);
        }
    };

    /**
     * 标记新闻为已读
     * @param {string} itemKey
     */
    const markItemRead = (itemKey) => {
        if (!itemKey) return;
        readItems.value.add(itemKey);
        persistRead();
    };

    /**
     * 切换收藏
     * @param {string} itemKey
     */
    const toggleFavorite = (itemKey) => {
        if (!itemKey) return;
        if (favoriteItems.value.has(itemKey)) {
            favoriteItems.value.delete(itemKey);
        } else {
            favoriteItems.value.add(itemKey);
        }
        persistFavorites();
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
     * 设置顶部分类
     * @param {('all'|'news'|'comments')} key
     */
    const setActiveCategory = (key) => {
        const allowed = new Set(['all', 'news', 'comments']);
        if (allowed.has(key)) {
            activeCategory.value = key;
        }
    };

    // 自动初始化加载 - 延迟执行以确保组件完全初始化
    setTimeout(() => {
        loadNewsData();
    }, 100);

    // 恢复本地持久化
    restorePersistence();

    // 返回状态和方法
    return {
        // 响应式数据
        newsData,
        searchQuery,
        selectedCategories,
        selectedTags,
        activeCategory,
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
        readItems,
        favoriteItems,
        
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
        clearError,
        setActiveCategory,
        // 持久化相关
        markItemRead,
        toggleFavorite
    };
};

/**
 * 获取分类配置 - 基于域名分类的完整配置
 * @returns {Array} 分类配置数组
 */
export function getCategoriesConfig() {
    // 注意：此配置用于新闻内部分类与渲染，不影响顶部（全部/新闻/评论）分类
    return [
        // 代码托管平台
        { key: 'github', icon: 'fab fa-github', title: 'GitHub', badge: 'GitHub', color: '#24292e' },
        { key: 'code-hosting', icon: 'fab fa-git-alt', title: '代码托管', badge: '代码托管', color: '#f39c12' },
        
        // 技术问答社区
        { key: 'stackoverflow', icon: 'fab fa-stack-overflow', title: 'Stack Overflow', badge: 'Stack Overflow', color: '#f48024' },
        
        // 技术博客平台
        { key: 'tech-blog', icon: 'fas fa-blog', title: '技术博客', badge: '技术博客', color: '#00ab6c' },
        
        // 视频平台
        { key: 'video', icon: 'fab fa-youtube', title: '视频教程', badge: '视频', color: '#ff0000' },
        
        // 中文技术社区
        { key: 'chinese-tech', icon: 'fas fa-globe-asia', title: '中文技术社区', badge: '中文社区', color: '#1890ff' },
        
        // 技术社区和论坛
        { key: 'community', icon: 'fas fa-users', title: '技术社区', badge: '社区', color: '#ff6b35' },
        
        // 技术文档和教程
        { key: 'documentation', icon: 'fas fa-book', title: '技术文档', badge: '文档', color: '#4caf50' },
        
        // 编程挑战和练习
        { key: 'coding-challenge', icon: 'fas fa-code', title: '编程挑战', badge: '编程', color: '#9c27b0' },
        
        // 云服务和平台
        { key: 'cloud-platform', icon: 'fas fa-cloud', title: '云服务平台', badge: '云服务', color: '#3498db' },
        
        // 设计工具
        { key: 'design-tools', icon: 'fas fa-palette', title: '设计工具', badge: '设计', color: '#e74c3c' },
        
        // 新闻和资讯
        { key: 'tech-news', icon: 'fas fa-newspaper', title: '科技新闻', badge: '新闻', color: '#2c3e50' },
        
        // 社交媒体
        { key: 'social-media', icon: 'fas fa-share-alt', title: '社交媒体', badge: '社交', color: '#8e44ad' },
        
        // 其他
        { key: 'other', icon: 'fas fa-external-link-alt', title: '其他', badge: '其他', color: '#6c757d' },
        
        // 未知来源
        { key: 'unknown', icon: 'fas fa-question-circle', title: '未知来源', badge: '未知', color: '#6c757d' }
    ];
}

/**
 * 分类新闻项 - 完全基于域名分类
 * @param {Object} item - 新闻项
 * @returns {string} 分类键
 */
export function categorizeNewsItem(item) {
    // 优先使用域名分类
    if (item.link) {
        const domainCategory = extractDomainCategory(item);
        return domainCategory.key;
    }
    
    // 如果没有链接，尝试从标题或内容中推断分类
    if (item.title || item.content) {
        const text = (item.title + ' ' + (item.content || '')).toLowerCase();
        
        // 基于关键词的备用分类逻辑
        if (text.includes('github') || text.includes('git') || text.includes('repository')) {
            return 'github';
        } else if (text.includes('stackoverflow') || text.includes('stack exchange') || text.includes('问答')) {
            return 'stackoverflow';
        } else if (text.includes('youtube') || text.includes('视频') || text.includes('教程')) {
            return 'video';
        } else if (text.includes('leetcode') || text.includes('算法') || text.includes('编程题')) {
            return 'coding-challenge';
        } else if (text.includes('medium') || text.includes('blog') || text.includes('博客')) {
            return 'tech-blog';
        } else if (text.includes('知乎') || text.includes('掘金') || text.includes('csdn')) {
            return 'chinese-tech';
        } else if (text.includes('reddit') || text.includes('hacker news') || text.includes('社区')) {
            return 'community';
        } else if (text.includes('documentation') || text.includes('文档') || text.includes('tutorial')) {
            return 'documentation';
        } else if (text.includes('aws') || text.includes('azure') || text.includes('cloud') || text.includes('云')) {
            return 'cloud-platform';
        } else if (text.includes('design') || text.includes('figma') || text.includes('设计')) {
            return 'design-tools';
        } else if (text.includes('news') || text.includes('新闻') || text.includes('techcrunch')) {
            return 'tech-news';
        } else if (text.includes('twitter') || text.includes('linkedin') || text.includes('social')) {
            return 'social-media';
        }
    }
    
    // 如果都没有匹配，返回其他分类
    return 'other';
} 
