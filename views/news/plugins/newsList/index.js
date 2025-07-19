// 新闻列表组件 - 负责新闻内容的展示
// 作者：liangliang

// 自动加载相关的CSS文件
(function loadCSS() {
    const cssFiles = [
        '/plugins/NewsList/index.css'
    ];
    
    cssFiles.forEach(cssFile => {
        // 检查是否已经加载过该CSS文件
        if (!document.querySelector(`link[href*="${cssFile}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssFile;
            link.type = 'text/css';
            document.head.appendChild(link);
        }
    });
})();

// 异步加载HTML模板
async function loadTemplate() {
    try {
        const response = await fetch('/plugins/NewsList/index.html');
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
            return this.selectedCategories.size === 0 || this.selectedCategories.has(categoryKey);
        },
        
        // 检查新闻项是否高亮
        isHighlighted(item) {
            if (!this.searchQuery) return false;
            const query = this.searchQuery.toLowerCase();
            return item.title.toLowerCase().includes(query) || 
                   (item.content && item.content.toLowerCase().includes(query));
        },
        
        // 获取分类标签
        getCategoryTag(item) {
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
            
            // 如果没有 categories，则使用自动分类
            const CATEGORIES = [
                { key: 'ai', title: 'AI技术' },
                { key: 'data', title: '数据分析' },
                { key: 'code', title: '代码开发' },
                { key: 'tech', title: '科技产品' },
                { key: 'business', title: '商业资讯' },
                { key: 'other', title: '其他' }
            ];
            
            // 简单的分类逻辑
            const title = item.title.toLowerCase();
            const content = (item.content || '').toLowerCase();
            
            if (title.includes('ai') || title.includes('人工智能') || content.includes('ai')) {
                return ['AI技术'];
            }
            if (title.includes('数据') || title.includes('分析') || content.includes('数据')) {
                return ['数据分析'];
            }
            if (title.includes('代码') || title.includes('开发') || title.includes('编程')) {
                return ['代码开发'];
            }
            if (title.includes('产品') || title.includes('手机') || title.includes('芯片')) {
                return ['科技产品'];
            }
            if (title.includes('商业') || title.includes('投资') || title.includes('融资')) {
                return ['商业资讯'];
            }
            
            return ['其他'];
        },
        
        // 获取时间差显示
        getTimeAgo(isoDate) {
            if (!isoDate) return '未知时间';
            const now = new Date();
            const date = new Date(isoDate);
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            
            if (minutes < 1) return '刚刚';
            if (minutes < 60) return `${minutes}分钟前`;
            if (hours < 24) return `${hours}小时前`;
            return `${days}天前`;
        },
        
        // 提取新闻摘要
        extractExcerpt(item) {
            if (item.excerpt) return item.excerpt;
            if (item.content) {
                return item.content.substring(0, 150) + '...';
            }
            return '暂无摘要';
        },
        
        // 处理新闻点击
        handleNewsClick(item) {
            this.$emit('news-click', item);
        }
    },
    template: template
};
}

// 初始化组件并全局暴露
(async function initComponent() {
    try {
        const NewsList = await createNewsList();
        window.NewsList = NewsList;
        
        // 触发自定义事件，通知组件已加载完成
        window.dispatchEvent(new CustomEvent('NewsListLoaded', { detail: NewsList }));
    } catch (error) {
        console.error('NewsList 组件初始化失败:', error);
    }
})();
