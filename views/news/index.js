/**
 * 新闻页主入口
 * author: liangliang
 */
import { createStore } from '/views/news/hooks/store.js';
import { useComputed } from '/views/news/hooks/useComputed.js';
import { useMethods } from '/views/news/hooks/useMethods.js';
import { createBaseView } from '/utils/baseView.js';

// 创建新闻页面应用
(async function initNewsApp() {
    try {
        const app = await createBaseView({
            createStore,
            useComputed,
            useMethods,
            components: [
                'SearchHeader',
                'NewsList',
                'Calendar',
                'CommentsList',
                'ProjectFilesList'
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

