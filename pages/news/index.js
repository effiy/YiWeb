// Vue3 新闻页面应用主文件

import { getConfig, NEWS_CONFIG } from '../../basic/js/config/index.js';
import { utils } from './utils/index.js';
import { createNewsStore } from './store/newsStore.js';
import { useComputed } from './hooks/useComputed.js';
import { useMethods } from './hooks/useMethods.js';
import { useInit } from './hooks/useInit.js';

const { createApp: createVueApp, ref, computed, onMounted: onVueMounted, nextTick, watch } = Vue;

const NewsApp = {
    setup() {
        // 创建状态管理
        const store = createNewsStore();
        
        // 创建计算属性
        const computedProps = useComputed(store);
        
        // 创建业务方法
        const methods = useMethods(store);
        
        // 创建初始化方法
        const init = useInit(store, methods);

        // 生命周期
        onVueMounted(async () => {
            try {
                // 初始化各种功能
                init.initKeyboardShortcuts();
                init.initResponsiveLayout();
                init.initAccessibility();
                init.initErrorHandling();
                init.initSearchHistory();
                init.initSidebarState();
                init.initBrowserHistory();
                
                // 处理URL参数
                init.initUrlParams();
                
                // 加载新闻数据
                await methods.loadNewsData();

            } catch (error) {
                console.error('初始化错误:', error);
                methods.showErrorMessage('页面初始化失败，请刷新重试');
            }
        });

        // 返回公共接口
        return {
            // 响应式数据
            ...store,
            
            // 计算属性
            ...computedProps,
            
            // 方法
            ...methods,
            
            // 工具函数
            getTimeAgo: utils.formatTimeAgo,
            extractExcerpt: utils.extractExcerpt,
            getDateString: NEWS_CONFIG.getDateString,
            getCategoryTag: (item) => {
                // 优先显示 item.categories 中的标签
                if (item.categories && item.categories.length > 0) {
                    if (Array.isArray(item.categories)) {
                        return item.categories;
                    }
                    if (typeof item.categories === 'string') {
                        return [item.categories];
                    }
                }
                
                // 如果没有 categories，则使用自动分类
                const categoryKey = utils.categorizeNewsItem(item);
                const categories = getConfig('news.CATEGORIES', []);
                const category = categories.find(cat => cat.key === categoryKey);
                return category ? [category.title] : ['其他'];
            },
            getNewsType: utils.getNewsSource
        };
    }
};

// 创建并挂载应用
const app = createVueApp(NewsApp);

// 注册组件（确保组件已经加载）
if (typeof SearchHeader !== 'undefined') {
    app.component('SearchHeader', SearchHeader);
}
if (typeof NewsList !== 'undefined') {
    app.component('NewsList', NewsList);
}
if (typeof Calendar !== 'undefined') {
    app.component('Calendar', Calendar);
}
if (typeof TagStatistics !== 'undefined') {
    app.component('TagStatistics', TagStatistics);
}
if (typeof Sidebar !== 'undefined') {
    app.component('Sidebar', Sidebar);
}

// 挂载应用
app.mount('#app'); 
