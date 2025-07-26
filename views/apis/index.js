import { createStore } from '/views/apis/hooks/store.js';
import { useComputed } from '/views/apis/hooks/useComputed.js';
import { useMethods } from '/views/apis/hooks/useMethods.js';
import { createBaseView } from '/utils/baseView.js';

(async function initApisApp() {
    try {
        const app = await createBaseView({
            createStore,
            useComputed,
            useMethods,
            components: [],
            plugins: [],
            onMounted: (app) => {
                console.log('[HTTP API大全页面] 应用已挂载');
                if (app.store && app.store.updateTagsList) {
                    app.store.updateTagsList();
                }
            }
        });
        window.apisApp = app;
    } catch (error) {
        console.error('[HTTP API大全页面] 应用初始化失败:', error);
    }
})();
