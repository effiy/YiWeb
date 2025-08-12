/**
 * 欢迎页主入口
 * author: liangliang
 */
import { createStore } from '/views/welcome/hooks/store.js';
import { useComputed } from '/views/welcome/hooks/useComputed.js';
import { useMethods } from '/views/welcome/hooks/useMethods.js';
import { createBaseView } from '/utils/baseView.js';
import { logInfo, logWarn, logError } from '/utils/log.js';

// 创建欢迎页面应用
(async function initWelcomeApp() {
    try {
        logInfo('[欢迎页面] 开始初始化应用');
        
        const app = await createBaseView({
            createStore,
            useComputed,
            useMethods,
            components: [],
            plugins: [],
            onMounted: (app) => {
                logInfo('[欢迎页面] 应用已挂载');
                logInfo('[欢迎页面] 挂载的应用实例:', app);
                
                // 暴露调试函数到全局作用域
                if (app) {
                    logInfo('[欢迎页面] 调试函数已暴露到全局作用域');
                    
                    // 在 Vue 3 中，方法直接暴露在实例上
                    const availableMethods = Object.keys(app).filter(key => 
                        typeof app[key] === 'function' && 
                        !key.startsWith('_') && 
                        key !== 'constructor'
                    );
                    
                    logInfo('[欢迎页面] 可用的方法:', availableMethods);
                    
                    // 验证 editCard 方法是否存在
                    if (app.editCard) {
                        logInfo('[欢迎页面] editCard 方法已找到');
                        
                        // 测试编辑卡片功能
                        window.testEditCard = () => {
                            logInfo('[测试] 开始测试编辑卡片功能');
                            if (app.store && app.store.featureCards && app.store.featureCards.value.length > 0) {
                                const testCard = app.store.featureCards.value[0];
                                logInfo('[测试] 使用测试卡片:', testCard);
                                app.editCard(testCard, null);
                            } else {
                                logWarn('[测试] 没有可用的测试卡片');
                            }
                        };
                        logInfo('[欢迎页面] 测试函数已暴露到 window.testEditCard');
                    } else {
                        logError('[欢迎页面] editCard 方法未找到！');
                        logInfo('[欢迎页面] 所有可用方法:', availableMethods);
                    }
                } else {
                    logError('[欢迎页面] 应用实例不存在');
                }
            }
        });

        // 导出应用实例（可选，用于调试）
        window.welcomeApp = app;
        logInfo('[欢迎页面] 应用实例已导出到 window.welcomeApp');
        
        // 验证 DOM 挂载
        const appElement = document.querySelector('#app');
        if (appElement) {
            logInfo('[欢迎页面] DOM 挂载点 #app 已找到');
            logInfo('[欢迎页面] 挂载点内容:', appElement.innerHTML.substring(0, 200) + '...');
        } else {
            logError('[欢迎页面] DOM 挂载点 #app 未找到！');
        }
        
    } catch (error) {
        logError('[欢迎页面] 应用初始化失败:', error);
    }
})();

