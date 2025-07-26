/**
 * Linux命令大全页主入口
 * author: liangliang
 */
import { createStore } from '/views/commands/hooks/store.js';
import { useComputed } from '/views/commands/hooks/useComputed.js';
import { useMethods } from '/views/commands/hooks/useMethods.js';
import { createBaseView } from '/utils/baseView.js';

// 创建Linux命令大全页面应用
(async function initLinuxCommandsApp() {
    try {
        const app = await createBaseView({
            createStore,
            useComputed,
            useMethods,
            components: [],
            plugins: [],
            onMounted: (app) => {
                console.log('[Linux命令大全页面] 应用已挂载');
                
                // 初始化标签列表
                if (app.store && app.store.updateTagsList) {
                    app.store.updateTagsList();
                }
            }
        });

        // 导出应用实例（可选，用于调试）
        window.linuxCommandsApp = app;
    } catch (error) {
        console.error('[Linux命令大全页面] 应用初始化失败:', error);
    }
})(); 
