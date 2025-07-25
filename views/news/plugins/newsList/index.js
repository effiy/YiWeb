// 新闻列表组件 - 负责新闻内容的展示
// 作者：liangliang

// 导入共享的分类工具函数
import { getCategoriesConfig, categorizeNewsItem } from '../../hooks/store.js';
import { getTimeAgo } from '/utils/date.js';
import { safeExecute, createError, ErrorTypes } from '/utils/error.js';
import { loadCSSFiles } from '/utils/baseView.js';

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
            hasNewsData: {
                type: Boolean,
                default: false
            }
        },
        emits: ['load-news-data', 'news-click'],
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
            
            // 获取分类标签 - 使用 useComputed 中的分类逻辑
            getCategoryTag(item) {
                return safeExecute(() => {
                    // 优先显示 item.categories 中的标签
                    if (item.categories && item.categories.length > 0) {
                        // 如果 categories 是数组，返回数组
                        if (Array.isArray(item.categories)) {
                            return item.categories;
                        }
                        // 如果 categories 是字符串，返回包含该字符串的数组
                        if (typeof item.categories === 'string') {
                            return [item.categories];
                        }
                    }
                    
                    // 使用 useComputed 中的分类逻辑
                    const categoryKey = categorizeNewsItem(item);
                    const categoriesConfig = getCategoriesConfig();
                    const category = categoriesConfig.find(cat => cat.key === categoryKey);
                    
                    return category ? [category.title] : ['其他'];
                }, '分类标签获取');
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
                    const total = this.searchResults.length;
                    const categorized = Object.keys(this.displayCategories).length;
                    
                    return {
                        total,
                        categorized,
                        hasData: total > 0
                    };
                }, '新闻统计计算');
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
