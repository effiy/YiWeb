/**
 * 网站管理页主入口
 * author: liangliang
 */
import { createStore } from '/views/websites/hooks/store.js';
import { useComputed } from '/views/websites/hooks/useComputed.js';
import { useMethods } from '/views/websites/hooks/useMethods.js';
import { createBaseView } from '/utils/baseView.js';
import { logInfo, logError } from '/utils/log.js';

// 创建网站管理页面应用
(async function initWebsitesApp() {
    try {
        const app = await createBaseView({
            createStore,
            useComputed,
            useMethods,
            components: [],
            plugins: [],
            onMounted: (app) => {
                logInfo('[网站管理页面] 应用已挂载');
                
                // 初始化标签列表
                if (app.store && app.store.updateTagsList) {
                    app.store.updateTagsList();
                }
            }
        });

        // 导出应用实例（可选，用于调试）
        window.websitesApp = app;
    } catch (error) {
        logError('[网站管理页面] 应用初始化失败:', error);
    }
})(); 