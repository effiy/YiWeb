// 新闻列表组件 - 负责新闻内容的展示
// 作者：liangliang

// 导入共享的分类工具函数
import { getTimeAgo } from '/utils/date.js';
import { safeExecute, createError, ErrorTypes } from '/utils/error.js';
import { loadCSSFiles } from '/utils/baseView.js';
import { extractDomainCategory } from '/utils/domain.js';
import { categorizeNewsItem } from '/views/news/hooks/store.js';

// 自动加载相关的CSS文件
loadCSSFiles([
    '/views/news/plugins/newsList/index.css'
]);

// 异步加载HTML模板
async function loadTemplate() {
    try {
        const response = await fetch('/views/news/plugins/newsList/index.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error('加载模板失败:', error);
        // 回退到内联模板
        return;
    }
}

// 创建组件定义
const createNewsList = async () => {
    const template = await loadTemplate();
    
    return {
        name: 'NewsList',
        props: {
            loading: {
                type: Boolean,
                default: false
            },
            error: {
                type: String,
                default: ''
            },
            currentDateDisplay: {
                type: String,
                default: ''
            },
            searchQuery: {
                type: String,
                default: ''
            },
            searchResults: {
                type: Array,
                default: () => []
            },
            displayCategories: {
                type: Object,
                default: () => ({})
            },
            selectedCategories: {
                type: Set,
                default: () => new Set()
            },
            clickedItems: {
                type: Set,
                default: () => new Set()
            },
            readItems: {
                type: Set,
                default: () => new Set()
            },
            favoriteItems: {
                type: Set,
                default: () => new Set()
            },
            hasNewsData: {
                type: Boolean,
                default: false
            }
        },
        emits: ['load-news-data', 'news-click', 'toggle-favorite'],
        methods: {
            // 检查是否应该显示某个分类
            shouldShowCategory(categoryKey) {
                return safeExecute(() => {
                    return this.selectedCategories.size === 0 || this.selectedCategories.has(categoryKey);
                }, '分类显示检查');
            },
            
            // 检查新闻项是否高亮
            isHighlighted(item) {
                return safeExecute(() => {
                    if (!this.searchQuery) return false;
                    const query = this.searchQuery.toLowerCase();
                    return item.title.toLowerCase().includes(query) || 
                           (item.content && item.content.toLowerCase().includes(query));
                }, '新闻高亮检查');
            },
            

            // 获取分类信息 - 使用新的智能分类器
            getCategoryInfo(item) {
                return safeExecute(() => {
                    if (!item) return null;
                    return categorizeNewsItem(item);
                }, '分类信息获取');
            },

            // 获取域名分类信息（保持向后兼容）
            getDomainCategory(item) {
                return safeExecute(() => {
                    if (!item.link) return null;
                    return extractDomainCategory(item);
                }, '域名分类获取');
            },

            // 获取域名显示名称
            getDomainDisplayName(item) {
                return safeExecute(() => {
                    if (!item.link) return '';
                    const domainCategory = extractDomainCategory(item);
                    return domainCategory.title;
                }, '域名显示名称获取');
            },

            // 获取分类置信度
            getCategoryConfidence(item) {
                return safeExecute(() => {
                    const categoryInfo = this.getCategoryInfo(item);
                    return categoryInfo ? categoryInfo.confidence : 0;
                }, '分类置信度获取');
            },

            // 获取分类方法
            getCategoryMethod(item) {
                return safeExecute(() => {
                    const categoryInfo = this.getCategoryInfo(item);
                    return categoryInfo ? categoryInfo.method : 'unknown';
                }, '分类方法获取');
            },
            
            // 获取时间差显示
            getTimeAgo(isoDate) {
                return safeExecute(() => {
                    return getTimeAgo(isoDate);
                }, '时间差计算');
            },
            
            // 提取新闻摘要
            extractExcerpt(item) {
                return safeExecute(() => {
                    if (item.excerpt) return item.excerpt;
                    if (item.content) {
                        return item.content.substring(0, 150) + '...';
                    }
                    return '暂无摘要';
                }, '摘要提取');
            },
            
            // 处理新闻点击
            handleNewsClick(item) {
                return safeExecute(() => {
                    if (!item) {
                        throw createError('新闻项无效', ErrorTypes.VALIDATION, '新闻点击');
                    }
                    
                    this.$emit('news-click', item);
                }, '新闻点击处理');
            },
            
            // 获取新闻统计信息
            getNewsStats() {
                return safeExecute(() => {
                    const items = this.getDisplayedItems();
                    const total = items.length;
                    const read = items.reduce((acc, it) => acc + (this.isRead(it) ? 1 : 0), 0);
                    const fav = items.reduce((acc, it) => acc + (this.isFavorited(it) ? 1 : 0), 0);
                    const categorized = Object.keys(this.displayCategories).length;
                    
                    return {
                        total,
                        read,
                        fav,
                        categorized,
                        hasData: total > 0
                    };
                }, '新闻统计计算');
            },
            // 当前展示的条目集合
            getDisplayedItems() {
                return safeExecute(() => {
                    if (this.searchQuery && this.searchResults && this.searchResults.length) {
                        return this.searchResults;
                    }
                    const all = [];
                    Object.values(this.displayCategories || {}).forEach(cat => {
                        if (cat && Array.isArray(cat.news)) all.push(...cat.news);
                    });
                    return all;
                }, '获取展示条目');
            },
            // 已读判断
            isRead(item) {
                return safeExecute(() => {
                    const key = item.link || item.title;
                    return this.readItems && this.readItems.has(key);
                }, '已读判断');
            },
            // 收藏判断
            isFavorited(item) {
                return safeExecute(() => {
                    const key = item.link || item.title;
                    return this.favoriteItems && this.favoriteItems.has(key);
                }, '收藏判断');
            },
            
            // 检查是否有搜索结果
            hasSearchResults() {
                return safeExecute(() => {
                    return this.searchResults && this.searchResults.length > 0;
                }, '搜索结果检查');
            },
            
            // 获取空状态消息
            getEmptyStateMessage() {
                return safeExecute(() => {
                    if (this.loading) return '正在加载新闻...';
                    if (this.error) return `加载失败: ${this.error}`;
                    if (this.searchQuery) return `未找到包含"${this.searchQuery}"的新闻`;
                    return '暂无新闻数据';
                }, '空状态消息获取');
            }
        },
        template: template
    };
};

// 初始化组件并全局暴露
(async function initComponent() {
    try {
        const NewsList = await createNewsList();
        window.NewsList = NewsList;
        
        // 触发自定义事件，通知组件已加载完成
        window.dispatchEvent(new CustomEvent('NewsListLoaded', { detail: NewsList }));
        
        console.log('[NewsList] 组件初始化完成');
    } catch (error) {
        console.error('NewsList 组件初始化失败:', error);
    }
})();

