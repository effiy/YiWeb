/**
 * 欢迎页主入口
 * author: liangliang
 */
import { createStore } from '/views/welcome/hooks/store.js';
import { useComputed } from '/views/welcome/hooks/useComputed.js';
import { useMethods } from '/views/welcome/hooks/useMethods.js';
import { createBaseView } from '/utils/baseView.js';

// 创建欢迎页面应用
(async function initWelcomeApp() {
    try {
        const app = await createBaseView({
            createStore,
            useComputed,
            useMethods,
            components: [],
            plugins: [],
            onMounted: (app) => {
                console.log('[欢迎页面] 应用已挂载');
                
                // 暴露调试函数到全局作用域
                if (app && app.methods) {
                    console.log('[欢迎页面] 调试函数已暴露到全局作用域');
                }
            }
        });

        // 导出应用实例（可选，用于调试）
        window.welcomeApp = app;
    } catch (error) {
        console.error('[欢迎页面] 应用初始化失败:', error);
    }
})();