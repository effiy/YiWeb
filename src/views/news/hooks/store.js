/**
 * 新闻页面数据存储管理
 * author: liangliang
 */

import { buildServiceUrl } from '/src/services/helper/requestHelper.js';
import { formatDate, isFutureDate } from '/src/utils/date.js';
import { safeExecuteAsync, createError, ErrorTypes } from '/src/utils/error.js';
import { extractDomainCategory } from '/src/utils/domain.js';

/**
 * 对新闻项进行分类
 * @param {Object} item - 新闻项
 * @returns {Object} 分类信息
 */
export const categorizeNewsItem = (item) => {
    if (!item) {
        return {
            key: 'unknown',
            title: '未知来源',
            icon: 'fas fa-question-circle',
            color: '#6c757d'
        };
    }
    
    // 使用域名分类作为主要分类方式
    return extractDomainCategory(item);
};

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
    // 项目文件数据
    const projectFilesData = vueRef([]);
    // 搜索查询
    const searchQuery = vueRef('');
    // 当前选中的分类
    const selectedCategories = vueRef(new Set());
    // 当前选中的标签
    const selectedTags = vueRef(new Set());
    // 顶部分类（全部/每日清单/新闻/评论/项目文件）
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
    // 已读新闻集合（本地持久化）
    const readItems = vueRef(new Set());
    // 收藏新闻集合（本地持久化）
    const favoriteItems = vueRef(new Set());

    const REQUEST_ABORT_KEYS = {
        news: 'YiWeb.news.list',
        projectFiles: 'YiWeb.projectFiles.list'
    };

    const parseDateParam = (value) => {
        if (!value || typeof value !== 'string') return null;
        const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null;
        const y = Number(match[1]);
        const m = Number(match[2]);
        const d = Number(match[3]);
        const dt = new Date(y, m - 1, d);
        if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
        return dt;
    };

    const getUrlState = () => {
        try {
            const url = new URL(window.location.href);
            const dateStr = url.searchParams.get('date');
            const active = url.searchParams.get('cat');
            const q = url.searchParams.get('q');
            return {
                date: parseDateParam(dateStr),
                activeCategory: active ? String(active) : null,
                searchQuery: q ? String(q) : ''
            };
        } catch (_) {
            return { date: null, activeCategory: null, searchQuery: '' };
        }
    };

    const applyUrlState = (nextState = {}) => {
        if (nextState.date instanceof Date) {
            currentDate.value = new Date(nextState.date);
            calendarMonth.value = new Date(nextState.date.getFullYear(), nextState.date.getMonth(), 1);
        }
        if (typeof nextState.searchQuery === 'string') {
            searchQuery.value = nextState.searchQuery.trim();
        }
        if (typeof nextState.activeCategory === 'string') {
            const allowed = new Set(['all', 'dailyChecklist', 'news', 'comments', 'projectFiles']);
            if (allowed.has(nextState.activeCategory)) {
                activeCategory.value = nextState.activeCategory;
            }
        }
    };

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
            
            if (isFutureDate(targetDate, today.value)) {
                throw createError('无法查看未来日期的新闻', ErrorTypes.VALIDATION, '新闻加载');
            }
            
            console.log(`[loadNewsData] 正在加载 ${dateStr} 的新闻数据...`);
            
            const rssUrl = buildServiceUrl('query_documents', {
                cname: 'rss',
                isoDate: `${dateStr},${dateStr}`
            });
            const response = await window.requestClient.get(rssUrl, { abortKey: REQUEST_ABORT_KEYS.news });
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
        }).finally(() => {
            loading.value = false;
        });
    };

    /**
     * 异步加载项目文件数据
     * 使用updatedTime字段进行日期搜索
     */
    const loadProjectFilesData = async (date) => {
        return safeExecuteAsync(async () => {
            loading.value = true;
            error.value = null;
            errorMessage.value = '';
            
            const targetDate = date || currentDate.value;
            const dateStr = formatDate(targetDate);
            
            if (isFutureDate(targetDate, today.value)) {
                throw createError('无法查看未来日期的项目文件', ErrorTypes.VALIDATION, '项目文件加载');
            }
            
            console.log(`[loadProjectFilesData] 正在加载 ${dateStr} 的项目文件数据...`);
            
            const filesUrl = buildServiceUrl('query_documents', {
                cname: 'projectVersionFiles',
                updatedTime: `${dateStr},${dateStr}`
            });
            const response = await window.requestClient.get(filesUrl, { abortKey: REQUEST_ABORT_KEYS.projectFiles });
            const data = response.data.list;
            
            if (!Array.isArray(data)) {
                throw createError('项目文件数据格式错误', ErrorTypes.API, '项目文件加载');
            }
            
            projectFilesData.value = data;
            console.log(`[loadProjectFilesData] 成功加载 ${data.length} 条项目文件数据`);
            
            return data;
        }, '项目文件数据加载', (errorInfo) => {
            error.value = errorInfo.message;
            errorMessage.value = errorInfo.message;
            projectFilesData.value = [];
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
     * @param {('all'|'dailyChecklist'|'news'|'comments'|'projectFiles')} key
     */
    const setActiveCategory = (key) => {
        const allowed = new Set(['all', 'dailyChecklist', 'news', 'comments', 'projectFiles']);
        if (allowed.has(key)) {
            activeCategory.value = key;
        }
    };

    const initFromUrlAndLoad = () => {
        const urlState = getUrlState();
        applyUrlState(urlState);
        setTimeout(() => {
            if (activeCategory.value === 'projectFiles') {
                loadProjectFilesData(currentDate.value);
            } else if (activeCategory.value === 'news') {
                loadNewsData(currentDate.value);
            } else {
                loadNewsData(currentDate.value);
                loadProjectFilesData(currentDate.value);
            }
        }, 100);
    };

    initFromUrlAndLoad();

    try {
        window.addEventListener('popstate', () => {
            const urlState = getUrlState();
            applyUrlState(urlState);
            if (activeCategory.value === 'projectFiles') {
                loadProjectFilesData(currentDate.value);
            } else if (activeCategory.value === 'news') {
                loadNewsData(currentDate.value);
            } else {
                loadNewsData(currentDate.value);
                loadProjectFilesData(currentDate.value);
            }
        });
    } catch (_) {}

    // 恢复本地持久化
    restorePersistence();

    // 返回状态和方法
    return {
        // 响应式数据
        newsData,
        projectFilesData,
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
        readItems,
        favoriteItems,
        
        // 方法
        loadNewsData,
        loadProjectFilesData,
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






