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

// 分类缓存管理器
class ClassificationCache {
    constructor(maxSize = 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.accessCount = new Map();
    }

    get(key) {
        if (this.cache.has(key)) {
            this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
            return this.cache.get(key);
        }
        return null;
    }

    set(key, value) {
        if (this.cache.size >= this.maxSize) {
            this.evictLeastUsed();
        }
        this.cache.set(key, value);
        this.accessCount.set(key, 1);
    }

    evictLeastUsed() {
        let leastUsedKey = null;
        let minAccess = Infinity;
        
        for (const [key, count] of this.accessCount) {
            if (count < minAccess) {
                minAccess = count;
                leastUsedKey = key;
            }
        }
        
        if (leastUsedKey) {
            this.cache.delete(leastUsedKey);
            this.accessCount.delete(leastUsedKey);
        }
    }

    clear() {
        this.cache.clear();
        this.accessCount.clear();
    }
}

// 创建全局分类缓存实例
const classificationCache = new ClassificationCache();

// 分类学习管理器
class ClassificationLearner {
    constructor() {
        this.learningData = new Map();
        this.feedbackHistory = [];
        this.performanceMetrics = {
            accuracy: 0,
            precision: new Map(),
            recall: new Map(),
            f1Score: new Map()
        };
    }

    /**
     * 记录分类反馈
     * @param {Object} item - 新闻项
     * @param {string} predictedCategory - 预测分类
     * @param {string} actualCategory - 实际分类
     * @param {number} confidence - 置信度
     */
    recordFeedback(item, predictedCategory, actualCategory, confidence) {
        const feedback = {
            item: {
                title: item.title,
                link: item.link,
                content: item.content ? item.content.substring(0, 200) : ''
            },
            predicted: predictedCategory,
            actual: actualCategory,
            confidence,
            isCorrect: predictedCategory === actualCategory,
            timestamp: Date.now()
        };

        this.feedbackHistory.push(feedback);
        
        // 更新学习数据
        if (!this.learningData.has(actualCategory)) {
            this.learningData.set(actualCategory, {
                patterns: new Set(),
                keywords: new Map(),
                features: new Map(),
                count: 0
            });
        }

        const categoryData = this.learningData.get(actualCategory);
        categoryData.count++;

        // 提取关键词用于学习
        if (item.title) {
            const words = item.title.toLowerCase().split(/\s+/);
            words.forEach(word => {
                if (word.length > 2) {
                    categoryData.keywords.set(word, (categoryData.keywords.get(word) || 0) + 1);
                }
            });
        }

        // 更新性能指标
        this.updatePerformanceMetrics();
    }

    /**
     * 更新性能指标
     */
    updatePerformanceMetrics() {
        const total = this.feedbackHistory.length;
        if (total === 0) return;

        const correct = this.feedbackHistory.filter(f => f.isCorrect).length;
        this.performanceMetrics.accuracy = correct / total;

        // 计算每个分类的精确率和召回率
        const categories = new Set(this.feedbackHistory.map(f => f.actual));
        
        for (const category of categories) {
            const truePositives = this.feedbackHistory.filter(f => f.predicted === category && f.actual === category).length;
            const falsePositives = this.feedbackHistory.filter(f => f.predicted === category && f.actual !== category).length;
            const falseNegatives = this.feedbackHistory.filter(f => f.predicted !== category && f.actual === category).length;

            const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
            const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
            const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

            this.performanceMetrics.precision.set(category, precision);
            this.performanceMetrics.recall.set(category, recall);
            this.performanceMetrics.f1Score.set(category, f1Score);
        }
    }

    /**
     * 获取学习到的关键词
     * @param {string} category - 分类
     * @returns {Array} 关键词列表
     */
    getLearnedKeywords(category) {
        const categoryData = this.learningData.get(category);
        if (!categoryData) return [];

        return Array.from(categoryData.keywords.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, 20)
            .map(([word, count]) => ({ word, count }));
    }

    /**
     * 获取性能报告
     * @returns {Object} 性能报告
     */
    getPerformanceReport() {
        return {
            overall: {
                accuracy: this.performanceMetrics.accuracy,
                totalFeedback: this.feedbackHistory.length,
                correctPredictions: this.feedbackHistory.filter(f => f.isCorrect).length
            },
            byCategory: Object.fromEntries(
                Array.from(this.performanceMetrics.precision.keys()).map(category => [
                    category,
                    {
                        precision: this.performanceMetrics.precision.get(category) || 0,
                        recall: this.performanceMetrics.recall.get(category) || 0,
                        f1Score: this.performanceMetrics.f1Score.get(category) || 0
                    }
                ])
            ),
            recentAccuracy: this.calculateRecentAccuracy(100) // 最近100次预测的准确率
        };
    }

    /**
     * 计算最近N次预测的准确率
     * @param {number} n - 最近次数
     * @returns {number} 准确率
     */
    calculateRecentAccuracy(n) {
        const recent = this.feedbackHistory.slice(-n);
        if (recent.length === 0) return 0;
        
        const correct = recent.filter(f => f.isCorrect).length;
        return correct / recent.length;
    }

    /**
     * 导出学习数据
     * @returns {Object} 学习数据
     */
    exportLearningData() {
        return {
            feedbackHistory: this.feedbackHistory,
            learningData: Object.fromEntries(
                Array.from(this.learningData.entries()).map(([category, data]) => [
                    category,
                    {
                        ...data,
                        keywords: Object.fromEntries(data.keywords),
                        patterns: Array.from(data.patterns)
                    }
                ])
            ),
            performanceMetrics: this.performanceMetrics
        };
    }

    /**
     * 清除学习数据
     */
    clearLearningData() {
        this.learningData.clear();
        this.feedbackHistory = [];
        this.performanceMetrics = {
            accuracy: 0,
            precision: new Map(),
            recall: new Map(),
            f1Score: new Map()
        };
    }
}

// 创建全局分类学习器实例
const classificationLearner = new ClassificationLearner();

/**
 * 机器学习特征提取器
 * @param {Object} item - 新闻项
 * @returns {Object} 特征向量
 */
function extractMLFeatures(item) {
    const features = {
        // 文本特征
        titleLength: item.title ? item.title.length : 0,
        contentLength: item.content ? item.content.length : 0,
        hasExcerpt: !!item.excerpt,
        hasImage: !!(item.enclosure && item.enclosure.type && item.enclosure.type.startsWith('image/')),
        
        // 链接特征
        hasLink: !!item.link,
        linkDomain: item.link ? extractDomain(item.link) : '',
        
        // 时间特征
        isRecent: item.pubDate ? (Date.now() - new Date(item.pubDate).getTime()) < 24 * 60 * 60 * 1000 : false,
        
        // 语言特征
        isChinese: item.title ? /[\u4e00-\u9fa5]/.test(item.title) : false,
        
        // 内容特征
        hasCode: item.content ? /```|`|code|function|class|import|require/.test(item.content) : false,
        hasNumbers: item.title ? /\d+/.test(item.title) : false,
        hasSpecialChars: item.title ? /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(item.title) : false,
        
        // 情感特征
        isQuestion: item.title ? /[?？]/.test(item.title) : false,
        isExclamation: item.title ? /[!！]/.test(item.title) : false,
        
        // 技术特征
        hasTechKeywords: item.title ? /(api|sdk|framework|library|tool|platform|service|cloud|database|server|client|frontend|backend|mobile|web|app|software|hardware|system|network|security|data|algorithm|programming|development|design|testing|deployment|devops|microservices|container|kubernetes|docker|aws|azure|gcp)/i.test(item.title) : false
    };
    
    return features;
}

/**
 * 基于机器学习特征进行分类
 * @param {Object} features - 特征向量
 * @returns {Object|null} 分类信息
 */
function classifyByMLFeatures(features) {
    // 基于规则的机器学习分类器
    const rules = [
        {
            condition: (f) => f.hasCode && f.hasTechKeywords && f.titleLength > 20,
            category: {
                key: 'github',
                title: 'GitHub',
                icon: 'fab fa-github',
                color: '#24292e'
            },
            confidence: 0.8
        },
        {
            condition: (f) => f.isQuestion && f.hasTechKeywords,
            category: {
                key: 'stackoverflow',
                title: 'Stack Overflow',
                icon: 'fab fa-stack-overflow',
                color: '#f48024'
            },
            confidence: 0.8
        },
        {
            condition: (f) => f.isChinese && f.hasTechKeywords && f.titleLength > 10,
            category: {
                key: 'chinese-tech',
                title: '中文技术社区',
                icon: 'fas fa-globe-asia',
                color: '#1890ff'
            },
            confidence: 0.7
        },
        {
            condition: (f) => f.hasImage && f.titleLength > 15 && f.contentLength > 100,
            category: {
                key: 'tech-blog',
                title: '技术博客',
                icon: 'fas fa-blog',
                color: '#00ab6c'
            },
            confidence: 0.6
        },
        {
            condition: (f) => f.isRecent && f.hasTechKeywords && f.titleLength > 20,
            category: {
                key: 'tech-news',
                title: '科技新闻',
                icon: 'fas fa-newspaper',
                color: '#2c3e50'
            },
            confidence: 0.7
        }
    ];
    
    for (const rule of rules) {
        if (rule.condition(features)) {
            return {
                ...rule.category,
                confidence: rule.confidence,
                method: 'ml-features'
            };
        }
    }
    
    return null;
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
            confidence: 0,
            method: 'unknown'
        };
    }

    // 生成缓存键
    const cacheKey = `${item.link || ''}_${item.title || ''}_${item.content ? item.content.substring(0, 100) : ''}`;
    
    // 检查缓存
    const cached = classificationCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    let result = null;
    let confidence = 0;
    let method = 'default';

    // 1. 优先使用域名分类（最高置信度）
    if (item.link) {
        const domainCategory = extractDomainCategory(item);
        result = domainCategory;
        confidence = 0.9;
        method = 'domain';
    }
    
    // 2. 基于机器学习特征分类（高置信度）
    if (!result || confidence < 0.8) {
        const features = extractMLFeatures(item);
        const mlCategory = classifyByMLFeatures(features);
        
        if (mlCategory && mlCategory.confidence > confidence) {
            result = mlCategory;
            confidence = mlCategory.confidence;
            method = mlCategory.method;
        }
    }
    
    // 3. 基于标题和内容的关键词分类（中等置信度）
    if (!result || confidence < 0.7) {
        const text = (item.title + ' ' + (item.content || '')).toLowerCase();
        const keywordCategory = getCategoryByKeywords(text);
        
        if (keywordCategory && keywordCategory.score > confidence) {
            result = keywordCategory;
            confidence = Math.min(keywordCategory.score, 0.7);
            method = 'keywords';
        }
    }
    
    // 4. 基于RSS源分类（如果存在）
    if (!result || confidence < 0.6) {
        if (item.source) {
            const sourceCategory = getCategoryBySource(item.source);
            if (sourceCategory) {
                result = sourceCategory;
                confidence = 0.6;
                method = 'source';
            }
        }
    }
    
    // 5. 默认分类
    if (!result) {
        result = {
            key: 'other',
            title: '其他',
            icon: 'fas fa-external-link-alt',
            color: '#6c757d'
        };
        confidence = 0.3;
        method = 'default';
    }

    const finalResult = {
        ...result,
        confidence,
        method
    };

    // 缓存结果
    classificationCache.set(cacheKey, finalResult);

    return finalResult;
}

/**
 * 智能关键词分类引擎 - 支持模糊匹配和权重计算
 * @param {string} text - 文本内容
 * @returns {Object|null} 分类信息
 */
function getCategoryByKeywords(text) {
    // 使用更智能的关键词规则，支持权重和模糊匹配
    const keywordRules = [
        {
            patterns: [
                { keywords: ['github', 'git', 'repository', 'commit', 'pull request', 'issue', 'fork', 'star', 'clone'], weight: 1.0 },
                { keywords: ['gitlab', 'bitbucket', 'gitee'], weight: 0.8 },
                { keywords: ['version control', '版本控制', '代码管理'], weight: 0.6 }
            ],
            category: {
                key: 'github',
                title: 'GitHub',
                icon: 'fab fa-github',
                color: '#24292e'
            },
            threshold: 0.5
        },
        {
            patterns: [
                { keywords: ['stackoverflow', 'stack exchange', '问答', 'question', 'answer', 'q&a'], weight: 1.0 },
                { keywords: ['segmentfault', '思否'], weight: 0.9 },
                { keywords: ['help', '帮助', 'solution', '解决方案'], weight: 0.4 }
            ],
            category: {
                key: 'stackoverflow',
                title: 'Stack Overflow',
                icon: 'fab fa-stack-overflow',
                color: '#f48024'
            },
            threshold: 0.5
        },
        {
            patterns: [
                { keywords: ['youtube', '视频', '教程', 'tutorial', 'bilibili', 'vimeo', 'video'], weight: 1.0 },
                { keywords: ['直播', 'live', 'streaming', '录制'], weight: 0.8 },
                { keywords: ['课程', 'course', '学习', 'learn'], weight: 0.6 }
            ],
            category: {
                key: 'video',
                title: '视频教程',
                icon: 'fab fa-youtube',
                color: '#ff0000'
            },
            threshold: 0.5
        },
        {
            patterns: [
                { keywords: ['leetcode', '算法', '编程题', 'coding', 'programming', 'algorithm', '数据结构'], weight: 1.0 },
                { keywords: ['codewars', 'hackerrank', 'codecademy'], weight: 0.9 },
                { keywords: ['面试', 'interview', '刷题', '练习'], weight: 0.7 }
            ],
            category: {
                key: 'coding-challenge',
                title: '编程挑战',
                icon: 'fas fa-code',
                color: '#9c27b0'
            },
            threshold: 0.5
        },
        {
            patterns: [
                { keywords: ['medium', 'blog', '博客', 'article', 'post', 'dev.to', 'hashnode'], weight: 1.0 },
                { keywords: ['技术文章', '技术分享', '经验', 'experience'], weight: 0.8 },
                { keywords: ['写作', 'writing', '作者', 'author'], weight: 0.5 }
            ],
            category: {
                key: 'tech-blog',
                title: '技术博客',
                icon: 'fas fa-blog',
                color: '#00ab6c'
            },
            threshold: 0.5
        },
        {
            patterns: [
                { keywords: ['知乎', '掘金', 'csdn', 'segmentfault', 'infoq', 'oschina', '51cto'], weight: 1.0 },
                { keywords: ['中文', 'chinese', '国内', '本土'], weight: 0.6 },
                { keywords: ['技术社区', '开发者', '程序员'], weight: 0.4 }
            ],
            category: {
                key: 'chinese-tech',
                title: '中文技术社区',
                icon: 'fas fa-globe-asia',
                color: '#1890ff'
            },
            threshold: 0.5
        },
        {
            patterns: [
                { keywords: ['reddit', 'hacker news', '社区', 'community', 'forum', 'discussion'], weight: 1.0 },
                { keywords: ['discord', 'slack', 'telegram', '微信群'], weight: 0.8 },
                { keywords: ['讨论', '讨论区', '交流', '互动'], weight: 0.6 }
            ],
            category: {
                key: 'community',
                title: '技术社区',
                icon: 'fas fa-users',
                color: '#ff6b35'
            },
            threshold: 0.5
        },
        {
            patterns: [
                { keywords: ['documentation', '文档', 'tutorial', 'guide', 'manual', 'api', 'docs'], weight: 1.0 },
                { keywords: ['mdn', 'w3schools', 'freecodecamp', '官方文档'], weight: 0.9 },
                { keywords: ['参考', 'reference', '说明', 'instruction'], weight: 0.6 }
            ],
            category: {
                key: 'documentation',
                title: '技术文档',
                icon: 'fas fa-book',
                color: '#4caf50'
            },
            threshold: 0.5
        },
        {
            patterns: [
                { keywords: ['aws', 'azure', 'cloud', '云', 'serverless', 'kubernetes', 'docker'], weight: 1.0 },
                { keywords: ['阿里云', '腾讯云', '华为云', 'cloudflare'], weight: 0.9 },
                { keywords: ['部署', 'deploy', '运维', 'devops'], weight: 0.6 }
            ],
            category: {
                key: 'cloud-platform',
                title: '云服务平台',
                icon: 'fas fa-cloud',
                color: '#3498db'
            },
            threshold: 0.5
        },
        {
            patterns: [
                { keywords: ['design', 'figma', '设计', 'ui', 'ux', 'sketch', 'adobe'], weight: 1.0 },
                { keywords: ['canva', 'dribbble', 'behance', '原型', 'prototype'], weight: 0.8 },
                { keywords: ['视觉', 'visual', '界面', 'interface'], weight: 0.6 }
            ],
            category: {
                key: 'design-tools',
                title: '设计工具',
                icon: 'fas fa-palette',
                color: '#e74c3c'
            },
            threshold: 0.5
        },
        {
            patterns: [
                { keywords: ['news', '新闻', 'techcrunch', 'theverge', 'arstechnica', 'engadget'], weight: 1.0 },
                { keywords: ['科技', 'technology', '创新', 'innovation'], weight: 0.8 },
                { keywords: ['报道', 'report', '资讯', 'information'], weight: 0.6 }
            ],
            category: {
                key: 'tech-news',
                title: '科技新闻',
                icon: 'fas fa-newspaper',
                color: '#2c3e50'
            },
            threshold: 0.5
        },
        {
            patterns: [
                { keywords: ['twitter', 'linkedin', 'social', 'facebook', 'instagram', 'tiktok'], weight: 1.0 },
                { keywords: ['微博', 'weibo', '朋友圈', '动态'], weight: 0.8 },
                { keywords: ['分享', 'share', '社交', 'social media'], weight: 0.6 }
            ],
            category: {
                key: 'social-media',
                title: '社交媒体',
                icon: 'fas fa-share-alt',
                color: '#8e44ad'
            },
            threshold: 0.5
        }
    ];
    
    // 计算每个分类的匹配分数
    const categoryScores = new Map();
    
    for (const rule of keywordRules) {
        let totalScore = 0;
        let matchCount = 0;
        
        for (const patternGroup of rule.patterns) {
            for (const keyword of patternGroup.keywords) {
                if (text.includes(keyword)) {
                    totalScore += patternGroup.weight;
                    matchCount++;
                }
            }
        }
        
        // 计算平均分数
        const averageScore = matchCount > 0 ? totalScore / matchCount : 0;
        
        if (averageScore >= rule.threshold) {
            categoryScores.set(rule.category.key, {
                ...rule.category,
                score: averageScore,
                matchCount
            });
        }
    }
    
    // 返回分数最高的分类
    if (categoryScores.size === 0) {
        return null;
    }
    
    let bestMatch = null;
    let highestScore = 0;
    
    for (const [key, category] of categoryScores) {
        if (category.score > highestScore) {
            highestScore = category.score;
            bestMatch = category;
        }
    }
    
    return bestMatch;
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

/**
 * 批量分类处理器 - 优化大批量数据处理
 * @param {Array} items - 新闻项数组
 * @param {Object} options - 处理选项
 * @returns {Promise<Array>} 分类结果数组
 */
export async function batchCategorizeNewsItems(items, options = {}) {
    const {
        batchSize = 50,
        useCache = true,
        enableLearning = true,
        progressCallback = null
    } = options;

    const results = [];
    const total = items.length;
    let processed = 0;

    // 分批处理
    for (let i = 0; i < total; i += batchSize) {
        const batch = items.slice(i, i + batchSize);

        // 并行处理批次内的项目
        const promises = batch.map(async (item, index) => {
            const result = categorizeNewsItem(item);
            
            // 记录学习数据
            if (enableLearning && result.confidence < 0.8) {
                // 低置信度分类可以用于学习
                classificationLearner.recordFeedback(
                    item,
                    result.key,
                    result.key, // 这里可以改为用户反馈的实际分类
                    result.confidence
                );
            }
            
            return {
                index: i + index,
                item,
                result
            };
        });

        try {
            const batchResults = await Promise.all(promises);
            results.push(...batchResults);
            processed += batch.length;

            // 调用进度回调
            if (progressCallback) {
                progressCallback({
                    processed,
                    total,
                    percentage: (processed / total) * 100,
                    currentBatch: batch.length
                });
            }
        } catch (error) {
            console.error('[批量分类] 批次处理失败:', error);
            // 继续处理下一批次
        }
    }

    return results.sort((a, b) => a.index - b.index);
}

/**
 * 获取分类学习器实例
 * @returns {ClassificationLearner} 分类学习器
 */
export function getClassificationLearner() {
    return classificationLearner;
}

/**
 * 获取分类缓存实例
 * @returns {ClassificationCache} 分类缓存
 */
export function getClassificationCache() {
    return classificationCache;
}

/**
 * 清除所有分类缓存
 */
export function clearClassificationCache() {
    classificationCache.clear();
}

/**
 * 获取分类性能报告
 * @returns {Object} 性能报告
 */
export function getClassificationPerformanceReport() {
    return classificationLearner.getPerformanceReport();
}

/**
 * 导出分类学习数据
 * @returns {Object} 学习数据
 */
export function exportClassificationLearningData() {
    return classificationLearner.exportLearningData();
}

/**
 * 手动记录分类反馈
 * @param {Object} item - 新闻项
 * @param {string} predictedCategory - 预测分类
 * @param {string} actualCategory - 实际分类
 * @param {number} confidence - 置信度
 */
export function recordClassificationFeedback(item, predictedCategory, actualCategory, confidence) {
    classificationLearner.recordFeedback(item, predictedCategory, actualCategory, confidence);
} 
