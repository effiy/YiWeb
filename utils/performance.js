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
 * 安全获取性能时间戳
 * 兼容不同环境下的performance API
 */
function getPerformanceTimestamp() {
    try {
        // 优先使用performance.now()
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            return performance.now();
        }
        // 降级使用Date.now()
        return Date.now();
    } catch (error) {
        console.warn('性能时间戳获取失败，使用Date.now()作为降级方案:', error);
        return Date.now();
    }
}

/**
 * 检查环境兼容性
 * @returns {boolean} 是否支持性能监控
 */
function checkEnvironmentCompatibility() {
    try {
        // 检查基本环境
        if (typeof window === 'undefined') {
            console.warn('[性能监控] 非浏览器环境，跳过性能监控');
            return false;
        }

        // 检查DOM API
        if (typeof document === 'undefined') {
            console.warn('[性能监控] DOM API不可用，跳过性能监控');
            return false;
        }

        // 检查console API
        if (typeof console === 'undefined') {
            console.warn('[性能监控] Console API不可用，跳过性能监控');
            return false;
        }

        return true;
    } catch (error) {
        console.warn('[性能监控] 环境兼容性检查失败:', error);
        return false;
    }
}

/**
 * 页面加载性能监控
 * 监控页面加载时间并输出到控制台，并记录到本地
 */
function monitorPageLoadPerformance() {
    // 检查环境兼容性
    if (!checkEnvironmentCompatibility()) {
        return;
    }

    // 确保DOM加载完成后再执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(monitorPageLoadPerformance, 0);
        });
        return;
    }

    try {
        window.addEventListener('load', () => {
            try {
                // 兼容性增强：判断performance对象和API是否存在
                if (!window.performance || typeof performance.getEntriesByType !== 'function') {
                    console.warn('当前环境不支持性能监控API（performance.getEntriesByType），已自动跳过性能监控');
                    return;
                }

                const navEntries = performance.getEntriesByType('navigation');
                if (!navEntries || navEntries.length === 0) {
                    console.warn('未获取到导航性能数据，使用备用方案');
                    // 使用备用方案：计算页面加载时间
                    const loadTime = getPerformanceTimestamp();
                    console.log('[性能监控] 页面加载时间(备用方案):', loadTime, 'ms');
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
            } catch (error) {
                console.warn('[性能监控] 性能监控执行失败:', error);
            }
        });
    } catch (error) {
        console.warn('[性能监控] 性能监控设置失败:', error);
    }
}

/**
 * 显示用户友好的错误提示
 * @param {string} message - 要显示的错误信息
 * @param {number} duration - 显示时长（毫秒）
 */
function showError(message, duration = 5000) {
    try {
        // 检查DOM是否可用
        if (typeof document === 'undefined') {
            console.warn('[错误提示] DOM不可用，无法显示错误提示');
            return;
        }

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
    } catch (error) {
        console.warn('[错误提示] 显示错误提示失败:', error);
    }
}

/**
 * 错误监控
 * 捕获页面错误和未处理Promise拒绝，并显示用户友好的错误提示
 */
function monitorErrors() {
    try {
        // 检查window对象是否可用
        if (typeof window === 'undefined') {
            console.warn('[性能监控] Window对象不可用，跳过错误监控');
            return;
        }

        window.addEventListener('error', (e) => {
            console.error('[性能监控] 页面错误:', e.error || e.message || e);
            showError('页面出现错误，请刷新重试');
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('[性能监控] 未处理的Promise拒绝:', e.reason);
            showError('操作失败，请稍后重试');
        });
    } catch (error) {
        console.warn('[性能监控] 错误监控设置失败:', error);
    }
}

/**
 * 初始化性能监控
 * 启动所有监控功能
 */
function initPerformanceMonitoring() {
    try {
        // 检查环境兼容性
        if (!checkEnvironmentCompatibility()) {
            return;
        }

        monitorPageLoadPerformance();
        monitorErrors();
        console.log('[性能监控] 已启动');
    } catch (error) {
        console.warn('[性能监控] 初始化失败:', error);
    }
}

// 导出函数供外部使用
export {
    monitorPageLoadPerformance,
    monitorErrors,
    initPerformanceMonitoring
};

// 如果直接加载此文件，自动初始化监控
if (typeof window !== 'undefined') {
    // 延迟初始化，确保DOM准备就绪
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPerformanceMonitoring);
    } else {
        // 使用setTimeout确保在下一个事件循环中执行
        setTimeout(initPerformanceMonitoring, 0);
    }
}
