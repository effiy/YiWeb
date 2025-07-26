// 搜索头部组件 - 包含搜索框和分类过滤器
// 作者：liangliang

// 自动加载相关的CSS文件
(function loadCSS() {
    const cssFiles = [
        '/plugins/searchHeader/index.css'
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
        const response = await fetch('/plugins/searchHeader/index.html');
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
const createSearchHeader = async () => {
    const template = await loadTemplate();
    
    return {
        name: 'SearchHeader',
        props: {
            searchQuery: {
                type: String,
                default: ''
            },
            categories: {
                type: Array,
                default: () => []
            },
            selectedCategories: {
                type: Set,
                default: () => new Set()
            },
            sidebarCollapsed: {
                type: Boolean,
                default: false
            }
        },
        emits: ['update:searchQuery', 'search-keydown', 'clear-search', 'toggle-category', 'toggle-sidebar'],
        methods: {
            goHome() {
                window.location.href = '/';
            }
        },
        template: template
    };
};

// 初始化组件并全局暴露
(async function initComponent() {
    try {
        const SearchHeader = await createSearchHeader();
        window.SearchHeader = SearchHeader;
        
        // 触发自定义事件，通知组件已加载完成
        window.dispatchEvent(new CustomEvent('SearchHeaderLoaded', { detail: SearchHeader }));
    } catch (error) {
        console.error('SearchHeader 组件初始化失败:', error);
    }
})(); 
