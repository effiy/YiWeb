/**
 * 快捷键页主入口
 * author: liangliang
 */
import { createStore } from '/views/shortcuts/hooks/store.js';
import { useComputed } from '/views/shortcuts/hooks/useComputed.js';
import { useMethods } from '/views/shortcuts/hooks/useMethods.js';
import { createBaseView } from '/utils/baseView.js';

// 创建快捷键页面应用
(async function initShortcutsApp() {
    try {
        const app = await createBaseView({
            createStore,
            useComputed,
            useMethods,
            components: [],
            plugins: [],
            onMounted: (app) => {
                console.log('[快捷键页面] 应用已挂载');
                
                // 确保编辑器数据正确加载
                if (app.store && app.store.editors) {
                    console.log('[快捷键页面] 编辑器数据:', app.store.editors.value);
                }
                
                // 确保快捷键数据正确加载
                if (app.store && app.store.shortcuts) {
                    console.log('[快捷键页面] 快捷键数据:', app.store.shortcuts.value.length, '个分类');
                }
            }
        });

        // 导出应用实例（可选，用于调试）
        window.shortcutsApp = app;
    } catch (error) {
        console.error('[快捷键页面] 应用初始化失败:', error);
    }
})(); 