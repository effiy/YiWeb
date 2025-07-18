/**
 * 性能监控模块
 * 提供页面加载性能监控和错误监控功能
 * @author liangliang
 */

/**
 * 页面加载性能监控
 * 监控页面加载时间并输出到控制台
 */
function monitorPageLoadPerformance() {
    window.addEventListener('load', () => {
        if ('performance' in window) {
            const perfData = performance.getEntriesByType('navigation')[0];
            const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
            console.log('页面加载时间:', loadTime, 'ms');
            
            // 记录性能数据到本地存储（可选）
            try {
                const performanceHistory = JSON.parse(localStorage.getItem('performanceHistory') || '[]');
                performanceHistory.push({
                    timestamp: new Date().toISOString(),
                    loadTime: loadTime
                });
                
                // 只保留最近10次记录
                if (performanceHistory.length > 10) {
                    performanceHistory.splice(0, performanceHistory.length - 10);
                }
                
                localStorage.setItem('performanceHistory', JSON.stringify(performanceHistory));
            } catch (error) {
                console.warn('性能数据存储失败:', error);
            }
        }
    });
}

/**
 * 错误监控
 * 捕获页面错误并显示用户友好的错误提示
 */
function monitorErrors() {
    window.addEventListener('error', (e) => {
        console.error('页面错误:', e.error);
        
        // 显示用户友好的错误提示
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = '页面出现错误，请刷新重试';
            errorDiv.style.display = 'block';
            
            // 5秒后自动隐藏错误提示
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    });
    
    // 捕获未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (e) => {
        console.error('未处理的Promise拒绝:', e.reason);
        
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = '操作失败，请稍后重试';
            errorDiv.style.display = 'block';
            
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    });
}

/**
 * 初始化性能监控
 * 启动所有监控功能
 */
function initPerformanceMonitoring() {
    monitorPageLoadPerformance();
    monitorErrors();
    
    console.log('性能监控已启动');
}

// 导出函数供外部使用
export {
    monitorPageLoadPerformance,
    monitorErrors,
    initPerformanceMonitoring
};

// 如果直接加载此文件，自动初始化监控
if (typeof window !== 'undefined') {
    initPerformanceMonitoring();
}
