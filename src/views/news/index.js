/**
 * 新闻页主入口
 * author: liangliang
 */
import { createStore } from '/src/views/news/hooks/store.js';
import { useComputed } from '/src/views/news/hooks/useComputed.js';
import { useMethods } from '/src/views/news/hooks/useMethods.js';
import { createBaseView } from '/cdn/utils/view/baseView.js';

// 创建新闻页面应用
(async function initNewsApp() {
    try {
        const app = await createBaseView({
            createStore,
            useComputed,
            useMethods,
            components: [
                'NewsPage',
                'SearchHeader',
                'MarkdownView',
                'NewsList',
                'Calendar',
                'YiLoading',
                'YiEmptyState',
                'YiErrorState'
            ],
            componentModules: [
                '/src/views/news/components/newsPage/index.js',
                '/cdn/components/business/SearchHeader/index.js',
                '/cdn/components/business/MarkdownView/index.js',
                '/cdn/components/business/NewsList/index.js',
                '/cdn/components/common/forms/YiCalendar/index.js',
                '/cdn/components/common/loaders/YiLoading/index.js',
                '/cdn/components/common/feedback/YiEmptyState/index.js',
                '/cdn/components/common/feedback/YiErrorState/index.js'
            ],
            plugins: [],
            onMounted: (app) => {
                console.log('[新闻页面] 应用已挂载');
            }
        });

        // 导出应用实例（可选，用于调试）
        window.newsApp = app;
    } catch (error) {
        console.error('[新闻页面] 应用初始化失败:', error);
    }
})();
