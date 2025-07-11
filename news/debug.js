// Vue组件调试工具

window.DebugTool = {
    // 检查Vue是否正确加载
    checkVue() {
        console.log('=== Vue.js 检查 ===');
        if (typeof Vue !== 'undefined') {
            console.log('✅ Vue.js 已加载');
            console.log('Vue版本:', Vue.version || 'unknown');
            return true;
        } else {
            console.error('❌ Vue.js 未加载');
            return false;
        }
    },

    // 检查组件是否加载
    checkComponents() {
        console.log('\n=== 组件加载检查 ===');
        const expectedComponents = ['SearchHeader', 'NewsList', 'Calendar', 'TagStatistics', 'Sidebar'];
        const results = {};
        
        expectedComponents.forEach(component => {
            if (typeof window[component] !== 'undefined') {
                console.log(`✅ ${component} 已加载`);
                results[component] = true;
            } else {
                console.error(`❌ ${component} 未加载`);
                results[component] = false;
            }
        });
        
        return results;
    },

    // 检查Vue应用实例
    checkApp() {
        console.log('\n=== Vue应用检查 ===');
        const appElement = document.getElementById('app');
        
        if (!appElement) {
            console.error('❌ 找不到 #app 元素');
            return false;
        }
        
        if (appElement.__vue_app__) {
            console.log('✅ Vue应用已挂载');
            return true;
        } else {
            console.error('❌ Vue应用未挂载到 #app');
            return false;
        }
    },

    // 检查组件注册
    checkComponentRegistration() {
        console.log('\n=== 组件注册检查 ===');
        const appElement = document.getElementById('app');
        
        if (!appElement || !appElement.__vue_app__) {
            console.error('❌ 无法访问Vue应用实例');
            return false;
        }
        
        const app = appElement.__vue_app__;
        const components = app._component.components || {};
        
        console.log('已注册的组件:', Object.keys(components));
        return components;
    },

    // 检查控制台错误
    checkConsoleErrors() {
        console.log('\n=== 控制台错误检查 ===');
        
        // 监听新的错误
        const originalError = console.error;
        const errors = [];
        
        console.error = function(...args) {
            errors.push(args);
            originalError.apply(console, args);
        };
        
        // 恢复原始console.error（在1秒后）
        setTimeout(() => {
            console.error = originalError;
        }, 1000);
        
        return errors;
    },

    // 完整的诊断
    fullDiagnosis() {
        console.clear();
        console.log('🔍 开始Vue组件诊断...\n');
        
        const vueOk = this.checkVue();
        const componentsOk = this.checkComponents();
        const appOk = this.checkApp();
        const registrationOk = this.checkComponentRegistration();
        const cacheOk = this.checkCacheManager();
        
        console.log('\n=== 诊断结果 ===');
        
        if (vueOk && Object.values(componentsOk).every(Boolean) && appOk && cacheOk) {
            console.log('🎉 所有检查通过！组件应该正常工作。');
        } else {
            console.log('⚠️ 发现问题，请检查上述错误信息。');
            
            // 提供修复建议
            console.log('\n=== 修复建议 ===');
            
            if (!vueOk) {
                console.log('- 确保Vue.js 3 CDN正确加载');
            }
            
            Object.entries(componentsOk).forEach(([component, loaded]) => {
                if (!loaded) {
                    console.log(`- 检查 ${component}.js 文件是否正确加载`);
                }
            });
            
            if (!appOk) {
                console.log('- 检查Vue应用是否正确创建和挂载');
                console.log('- 检查是否有JavaScript错误阻止应用启动');
            }

            if (!cacheOk) {
                console.log('- 检查cacheManager.js文件是否正确加载');
                console.log('- 缓存功能异常可能影响数据加载性能');
            }
        }
        
        console.log('\n=== 可用的调试命令 ===');
        console.log('DebugTool.checkCacheManager() - 检查缓存状态');
        console.log('DebugTool.cleanCache() - 清理过期缓存');
        console.log('DebugTool.clearAllCache() - 清理所有缓存');
        
        return {
            vue: vueOk,
            components: componentsOk,
            app: appOk,
            registration: registrationOk,
            cache: cacheOk
        };
    },

    // 测试组件实例化
    testComponentInstantiation() {
        console.log('\n=== 组件实例化测试 ===');
        
        const components = ['SearchHeader', 'NewsList', 'Calendar', 'TagStatistics', 'Sidebar'];
        
        components.forEach(componentName => {
            try {
                const component = window[componentName];
                if (component && component.template) {
                    console.log(`✅ ${componentName} 具有有效的模板`);
                } else {
                    console.error(`❌ ${componentName} 缺少模板或格式错误`);
                }
            } catch (e) {
                console.error(`❌ ${componentName} 实例化失败:`, e.message);
            }
        });
    },

    // 检查缓存管理器
    checkCacheManager() {
        console.log('\n=== 缓存管理器检查 ===');
        
        if (typeof window.NewsCacheManager !== 'undefined') {
            console.log('✅ 缓存管理器已加载');
            
            try {
                const stats = window.NewsCacheManager.getCacheStats();
                console.log('📊 缓存统计信息:');
                console.log(`  - 总缓存大小: ${(stats.usage.cacheSize / 1024 / 1024).toFixed(2)}MB`);
                console.log(`  - 缓存使用率: ${stats.usage.usage}%`);
                console.log(`  - 缓存项数量: ${stats.usage.cacheCount}`);
                console.log(`  - 缓存新闻总数: ${stats.totalNews}`);
                
                if (stats.items.length > 0) {
                    console.log('📅 最近缓存:');
                    stats.items.slice(0, 5).forEach(item => {
                        const date = new Date(item.timestamp);
                        const compressed = item.compressed ? ' (压缩)' : '';
                        const truncated = item.truncated ? ' (截断)' : '';
                        console.log(`  - ${item.date}: ${item.count}条新闻, ${(item.size / 1024).toFixed(2)}KB, ${date.toLocaleString()}${compressed}${truncated}`);
                    });
                }
                
                return true;
            } catch (e) {
                console.error('❌ 缓存管理器功能异常:', e.message);
                return false;
            }
        } else {
            console.error('❌ 缓存管理器未加载');
            return false;
        }
    },

    // 清理缓存
    cleanCache() {
        console.log('\n=== 缓存清理 ===');
        
        if (window.NewsCacheManager) {
            const beforeStats = window.NewsCacheManager.getCacheStats();
            console.log(`清理前: ${beforeStats.usage.cacheCount}个缓存项, ${(beforeStats.usage.cacheSize / 1024 / 1024).toFixed(2)}MB`);
            
            // 清理过期缓存
            const expiredCount = window.NewsCacheManager.cleanExpiredCache();
            console.log(`清理了 ${expiredCount} 个过期缓存`);
            
            const afterStats = window.NewsCacheManager.getCacheStats();
            console.log(`清理后: ${afterStats.usage.cacheCount}个缓存项, ${(afterStats.usage.cacheSize / 1024 / 1024).toFixed(2)}MB`);
            
            const savedSpace = beforeStats.usage.cacheSize - afterStats.usage.cacheSize;
            console.log(`释放空间: ${(savedSpace / 1024 / 1024).toFixed(2)}MB`);
        } else {
            console.error('❌ 缓存管理器未加载');
        }
    },

    // 强制清理所有缓存
    clearAllCache() {
        console.log('\n=== 清理所有缓存 ===');
        
        if (window.NewsCacheManager) {
            const beforeStats = window.NewsCacheManager.getCacheStats();
            console.log(`清理前: ${beforeStats.usage.cacheCount}个缓存项, ${(beforeStats.usage.cacheSize / 1024 / 1024).toFixed(2)}MB`);
            
            const clearedCount = window.NewsCacheManager.clearAllCache();
            console.log(`清理了 ${clearedCount} 个缓存项`);
            
            const afterStats = window.NewsCacheManager.getCacheStats();
            console.log(`清理后: ${afterStats.usage.cacheCount}个缓存项, ${(afterStats.usage.cacheSize / 1024 / 1024).toFixed(2)}MB`);
        } else {
            console.error('❌ 缓存管理器未加载');
        }
    }
};

// 添加快捷方式到全局
window.debug = window.DebugTool.fullDiagnosis.bind(window.DebugTool);

// 页面加载完成后自动运行基础检查
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log('🔧 Vue组件调试工具已加载');
        console.log('使用 debug() 运行完整诊断');
        console.log('使用 DebugTool.checkComponents() 检查组件加载状态');
        console.log('使用 DebugTool.checkCacheManager() 检查缓存状态');
        console.log('使用 DebugTool.cleanCache() 清理过期缓存');
    }, 100);
}); 