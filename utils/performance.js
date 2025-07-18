/**
 * 性能监控模块
 * 提供页面加载性能监控和错误监控功能
 * @author liangliang
 */

/**
 * 工具函数：安全获取本地存储中的性能历史
 */
function getPerformanceHistory() {
    try {
        return JSON.parse(localStorage.getItem('performanceHistory') || '[]');
    } catch {
        return [];
    }
}

/**
 * 工具函数：安全写入本地存储
 */
function setPerformanceHistory(history) {
    try {
        localStorage.setItem('performanceHistory', JSON.stringify(history));
    } catch (error) {
        console.warn('性能数据存储失败:', error);
    }
}

/**
 * 页面加载性能监控
 * 监控页面加载时间并输出到控制台，并记录到本地
 */
function monitorPageLoadPerformance() {
    window.addEventListener('load', () => {
        if (!window.performance || !performance.getEntriesByType) {
            console.warn('当前环境不支持性能监控API');
            return;
        }
        const navEntries = performance.getEntriesByType('navigation');
        if (!navEntries || navEntries.length === 0) {
            console.warn('未获取到导航性能数据');
            return;
        }
        const perfData = navEntries[0];
        const loadTime = perfData.loadEventEnd - perfData.startTime;
        console.log('[性能监控] 页面加载时间:', loadTime, 'ms');

        // 记录性能数据到本地存储
        const history = getPerformanceHistory();
        history.push({
            timestamp: new Date().toISOString(),
            loadTime
        });
        // 只保留最近10次记录
        if (history.length > 10) {
            history.splice(0, history.length - 10);
        }
        setPerformanceHistory(history);
    });
}

/**
 * 显示用户友好的错误提示
 * @param {string} message - 要显示的错误信息
 * @param {number} duration - 显示时长（毫秒）
 */
function showError(message, duration = 5000) {
    let errorDiv = document.getElementById('error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '20px';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translateX(-50%)';
        errorDiv.style.background = 'rgba(255, 71, 87, 0.95)';
        errorDiv.style.color = '#fff';
        errorDiv.style.padding = '12px 32px';
        errorDiv.style.borderRadius = '8px';
        errorDiv.style.fontSize = '1rem';
        errorDiv.style.zIndex = '99999';
        errorDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        errorDiv.style.display = 'none';
        document.body.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    clearTimeout(errorDiv._hideTimer);
    errorDiv._hideTimer = setTimeout(() => {
        errorDiv.style.display = 'none';
    }, duration);
}

/**
 * 错误监控
 * 捕获页面错误和未处理Promise拒绝，并显示用户友好的错误提示
 */
function monitorErrors() {
    window.addEventListener('error', (e) => {
        console.error('[性能监控] 页面错误:', e.error || e.message || e);
        showError('页面出现错误，请刷新重试');
    });

    window.addEventListener('unhandledrejection', (e) => {
        console.error('[性能监控] 未处理的Promise拒绝:', e.reason);
        showError('操作失败，请稍后重试');
    });
}

/**
 * 初始化性能监控
 * 启动所有监控功能
 */
function initPerformanceMonitoring() {
    monitorPageLoadPerformance();
    monitorErrors();
    console.log('[性能监控] 已启动');
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
