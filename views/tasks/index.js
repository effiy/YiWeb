/**
 * 任务页主入口
 * author: liangliang
 */
import { createStore } from '/views/tasks/hooks/store.js';
import { useComputed } from '/views/tasks/hooks/useComputed.js';
import { useMethods } from '/views/tasks/hooks/useMethods.js';
import { createBaseView } from '/utils/baseView.js';

// 创建任务页面应用
(async function initTasksApp() {
    try {
        const app = await createBaseView({
            createStore,
            useComputed,
            useMethods,
            components: [
                'SearchHeader',
                'TaskList',
                'TaskDetail'
            ],
            plugins: [],
            onMounted: (app) => {
                console.log('[任务页面] 应用已挂载');
            }
        });

        // 导出应用实例（可选，用于调试）
        window.tasksApp = app;
    } catch (error) {
        console.error('[任务页面] 应用初始化失败:', error);
    }
})(); 
