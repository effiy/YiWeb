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
 * 分类配置管理器 - 集中管理所有分类配置
 */
class CategoryConfigManager {
    constructor() {
        this.categories = new Map();
        this.initializeDefaultCategories();
    }

    /**
     * 初始化默认分类配置
     */
    initializeDefaultCategories() {
        const defaultCategories = [
            // 代码托管平台
            { 
                key: 'github', 
                icon: 'fab fa-github', 
                title: 'GitHub', 
                badge: 'GitHub', 
                color: '#24292e',
                priority: 1,
                description: 'GitHub相关的内容和项目'
            },
            { 
                key: 'code-hosting', 
                icon: 'fab fa-git-alt', 
                title: '代码托管', 
                badge: '代码托管', 
                color: '#f39c12',
                priority: 2,
                description: '其他代码托管平台'
            },
            
            // 技术问答社区
            { 
                key: 'stackoverflow', 
                icon: 'fab fa-stack-overflow', 
                title: 'Stack Overflow', 
                badge: 'Stack Overflow', 
                color: '#f48024',
                priority: 1,
                description: '技术问答和解决方案'
            },
            
            // 技术博客平台
            { 
                key: 'tech-blog', 
                icon: 'fas fa-blog', 
                title: '技术博客', 
                badge: '技术博客', 
                color: '#00ab6c',
                priority: 2,
                description: '技术文章和教程'
            },
            
            // 视频平台
            { 
                key: 'video', 
                icon: 'fab fa-youtube', 
                title: '视频教程', 
                badge: '视频', 
                color: '#ff0000',
                priority: 2,
                description: '视频教程和演示'
            },
            
            // 中文技术社区
            { 
                key: 'chinese-tech', 
                icon: 'fas fa-globe-asia', 
                title: '中文技术社区', 
                badge: '中文社区', 
                color: '#1890ff',
                priority: 1,
                description: '中文技术社区和平台'
            },
            
            // 技术社区和论坛
            { 
                key: 'community', 
                icon: 'fas fa-users', 
                title: '技术社区', 
                badge: '社区', 
                color: '#ff6b35',
                priority: 2,
                description: '技术讨论和社区'
            },
            
            // 技术文档和教程
            { 
                key: 'documentation', 
                icon: 'fas fa-book', 
                title: '技术文档', 
                badge: '文档', 
                color: '#4caf50',
                priority: 2,
                description: '官方文档和教程'
            },
            
            // 编程挑战和练习
            { 
                key: 'coding-challenge', 
                icon: 'fas fa-code', 
                title: '编程挑战', 
                badge: '编程', 
                color: '#9c27b0',
                priority: 2,
                description: '编程练习和算法题'
            },
            
            // 云服务和平台
            { 
                key: 'cloud-platform', 
                icon: 'fas fa-cloud', 
                title: '云服务平台', 
                badge: '云服务', 
                color: '#3498db',
                priority: 2,
                description: '云计算和云服务'
            },
            
            // 设计工具
            { 
                key: 'design-tools', 
                icon: 'fas fa-palette', 
                title: '设计工具', 
                badge: '设计', 
                color: '#e74c3c',
                priority: 3,
                description: '设计和创意工具'
            },
            
            // 新闻和资讯
            { 
                key: 'tech-news', 
                icon: 'fas fa-newspaper', 
                title: '科技新闻', 
                badge: '新闻', 
                color: '#2c3e50',
                priority: 1,
                description: '科技新闻和资讯'
            },
            
            // 社交媒体
            { 
                key: 'social-media', 
                icon: 'fas fa-share-alt', 
                title: '社交媒体', 
                badge: '社交', 
                color: '#8e44ad',
                priority: 3,
                description: '社交媒体平台'
            },
            
            // 其他
            { 
                key: 'other', 
                icon: 'fas fa-external-link-alt', 
                title: '其他', 
                badge: '其他', 
                color: '#6c757d',
                priority: 4,
                description: '其他类型的内容'
            },
            
            // 未知来源
            { 
                key: 'unknown', 
                icon: 'fas fa-question-circle', 
                title: '未知来源', 
                badge: '未知', 
                color: '#6c757d',
                priority: 5,
                description: '无法识别的来源'
            }
        ];

        defaultCategories.forEach(category => {
            this.categories.set(category.key, category);
        });
    }

    /**
     * 获取所有分类配置
     * @returns {Array} 分类配置数组
     */
    getAllCategories() {
        return Array.from(this.categories.values()).sort((a, b) => a.priority - b.priority);
    }

    /**
     * 根据键获取分类配置
     * @param {string} key - 分类键
     * @returns {Object|null} 分类配置
     */
    getCategory(key) {
        return this.categories.get(key) || null;
    }

    /**
     * 添加或更新分类配置
     * @param {Object} category - 分类配置
     */
    setCategory(category) {
        if (category && category.key) {
            this.categories.set(category.key, {
                ...category,
                priority: category.priority || 5
            });
        }
    }

    /**
     * 删除分类配置
     * @param {string} key - 分类键
     */
    removeCategory(key) {
        this.categories.delete(key);
    }

    /**
     * 获取分类统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        const categories = Array.from(this.categories.values());
        return {
            total: categories.length,
            byPriority: categories.reduce((acc, cat) => {
                acc[cat.priority] = (acc[cat.priority] || 0) + 1;
                return acc;
            }, {}),
            colors: categories.map(cat => cat.color),
            icons: categories.map(cat => cat.icon)
        };
    }
}

// 创建全局分类配置管理器实例
const categoryConfigManager = new CategoryConfigManager();

/**
 * 获取分类配置 - 基于域名分类的完整配置
 * @returns {Array} 分类配置数组
 */
export function getCategoriesConfig() {
    return categoryConfigManager.getAllCategories();
}

/**
 * 获取分类配置管理器
 * @returns {CategoryConfigManager} 分类配置管理器实例
 */
export function getCategoryConfigManager() {
    return categoryConfigManager;
}

/**
 * 智能分类器 - 基于多维度特征进行分类
 * @param {Object} item - 新闻项
 * @returns {Object} 分类信息对象
 */
export function categorizeNewsItem(item) {
    if (!item) {
        return {
            key: 'unknown',
            title: '未知来源',
            icon: 'fas fa-question-circle',
            color: '#6c757d',
            confidence: 0
        };
    }

    // 1. 优先使用域名分类（最高置信度）
    if (item.link) {
        const domainCategory = extractDomainCategory(item);
        return {
            ...domainCategory,
            confidence: 0.9,
            method: 'domain'
        };
    }
    
    // 2. 基于标题和内容的关键词分类（中等置信度）
    if (item.title || item.content) {
        const text = (item.title + ' ' + (item.content || '')).toLowerCase();
        const keywordCategory = getCategoryByKeywords(text);
        
        if (keywordCategory) {
            return {
                ...keywordCategory,
                confidence: 0.7,
                method: 'keywords'
            };
        }
    }
    
    // 3. 基于RSS源分类（如果存在）
    if (item.source) {
        const sourceCategory = getCategoryBySource(item.source);
        if (sourceCategory) {
            return {
                ...sourceCategory,
                confidence: 0.6,
                method: 'source'
            };
        }
    }
    
    // 4. 默认分类
    return {
        key: 'other',
        title: '其他',
        icon: 'fas fa-external-link-alt',
        color: '#6c757d',
        confidence: 0.3,
        method: 'default'
    };
}

/**
 * 基于关键词获取分类
 * @param {string} text - 文本内容
 * @returns {Object|null} 分类信息
 */
function getCategoryByKeywords(text) {
    const keywordRules = [
        {
            patterns: ['github', 'git', 'repository', 'commit', 'pull request', 'issue'],
            category: {
                key: 'github',
                title: 'GitHub',
                icon: 'fab fa-github',
                color: '#24292e'
            }
        },
        {
            patterns: ['stackoverflow', 'stack exchange', '问答', 'question', 'answer'],
            category: {
                key: 'stackoverflow',
                title: 'Stack Overflow',
                icon: 'fab fa-stack-overflow',
                color: '#f48024'
            }
        },
        {
            patterns: ['youtube', '视频', '教程', 'tutorial', 'bilibili', 'vimeo'],
            category: {
                key: 'video',
                title: '视频教程',
                icon: 'fab fa-youtube',
                color: '#ff0000'
            }
        },
        {
            patterns: ['leetcode', '算法', '编程题', 'coding', 'programming', 'algorithm'],
            category: {
                key: 'coding-challenge',
                title: '编程挑战',
                icon: 'fas fa-code',
                color: '#9c27b0'
            }
        },
        {
            patterns: ['medium', 'blog', '博客', 'article', 'post', 'dev.to'],
            category: {
                key: 'tech-blog',
                title: '技术博客',
                icon: 'fas fa-blog',
                color: '#00ab6c'
            }
        },
        {
            patterns: ['知乎', '掘金', 'csdn', 'segmentfault', 'infoq', 'oschina'],
            category: {
                key: 'chinese-tech',
                title: '中文技术社区',
                icon: 'fas fa-globe-asia',
                color: '#1890ff'
            }
        },
        {
            patterns: ['reddit', 'hacker news', '社区', 'community', 'forum', 'discussion'],
            category: {
                key: 'community',
                title: '技术社区',
                icon: 'fas fa-users',
                color: '#ff6b35'
            }
        },
        {
            patterns: ['documentation', '文档', 'tutorial', 'guide', 'manual', 'api'],
            category: {
                key: 'documentation',
                title: '技术文档',
                icon: 'fas fa-book',
                color: '#4caf50'
            }
        },
        {
            patterns: ['aws', 'azure', 'cloud', '云', 'serverless', 'kubernetes', 'docker'],
            category: {
                key: 'cloud-platform',
                title: '云服务平台',
                icon: 'fas fa-cloud',
                color: '#3498db'
            }
        },
        {
            patterns: ['design', 'figma', '设计', 'ui', 'ux', 'sketch', 'adobe'],
            category: {
                key: 'design-tools',
                title: '设计工具',
                icon: 'fas fa-palette',
                color: '#e74c3c'
            }
        },
        {
            patterns: ['news', '新闻', 'techcrunch', 'theverge', 'arstechnica', 'engadget'],
            category: {
                key: 'tech-news',
                title: '科技新闻',
                icon: 'fas fa-newspaper',
                color: '#2c3e50'
            }
        },
        {
            patterns: ['twitter', 'linkedin', 'social', 'facebook', 'instagram', 'tiktok'],
            category: {
                key: 'social-media',
                title: '社交媒体',
                icon: 'fas fa-share-alt',
                color: '#8e44ad'
            }
        }
    ];
    
    for (const rule of keywordRules) {
        for (const pattern of rule.patterns) {
            if (text.includes(pattern)) {
                return rule.category;
            }
        }
    }
    
    return null;
}

/**
 * 基于RSS源获取分类
 * @param {string} source - RSS源
 * @returns {Object|null} 分类信息
 */
function getCategoryBySource(source) {
    const sourceRules = {
        'github.com': {
            key: 'github',
            title: 'GitHub',
            icon: 'fab fa-github',
            color: '#24292e'
        },
        'stackoverflow.com': {
            key: 'stackoverflow',
            title: 'Stack Overflow',
            icon: 'fab fa-stack-overflow',
            color: '#f48024'
        },
        'medium.com': {
            key: 'tech-blog',
            title: 'Medium',
            icon: 'fas fa-blog',
            color: '#00ab6c'
        },
        'youtube.com': {
            key: 'video',
            title: 'YouTube',
            icon: 'fab fa-youtube',
            color: '#ff0000'
        }
    };
    
    return sourceRules[source] || null;
} 
