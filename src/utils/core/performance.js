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
 * 全局代码块复制函数
 * 提供代码块复制功能，避免 ReferenceError
 */
function initGlobalCopyCodeBlock() {
    // 检查是否已经定义了 copyCodeBlock 函数
    if (typeof window.copyCodeBlock === 'function') {
        return;
    }

    // 定义全局 copyCodeBlock 函数
    window.copyCodeBlock = function(codeId) {
        try {
            const codeElement = document.getElementById(codeId);
            if (codeElement) {
                const code = codeElement.textContent || codeElement.innerText;
                
                // 检查是否支持Clipboard API
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(code).then(() => {
                        console.log('[代码复制] 代码块已复制到剪贴板');
                        // 显示成功提示
                        showSuccess('代码已复制到剪贴板');
                    }).catch(err => {
                        console.error('[代码复制] 复制失败:', err);
                        // 降级到传统复制方法
                        fallbackCopyToClipboard(code);
                    });
                } else {
                    // 降级到传统复制方法
                    fallbackCopyToClipboard(code);
                }
            } else {
                console.warn('[代码复制] 未找到代码元素:', codeId);
            }
        } catch (error) {
            console.error('[代码复制] 复制过程中发生错误:', error);
            showError('复制失败，请稍后重试');
        }
    };

    // 定义全局 toggleCodeBlock 函数（用于代码块展开/折叠）
    window.toggleCodeBlock = function(codeId) {
        try {
            const codeElement = document.getElementById(codeId);
            if (codeElement) {
                codeElement.classList.toggle('collapsed');
                const isCollapsed = codeElement.classList.contains('collapsed');
                console.log('[代码块] 代码块已', isCollapsed ? '折叠' : '展开');
            }
        } catch (error) {
            console.error('[代码块] 切换过程中发生错误:', error);
        }
    };

    console.log('[代码复制] 全局代码块复制函数已初始化');
}

/**
 * 降级复制方法
 * 当 Clipboard API 不可用时使用
 */
function fallbackCopyToClipboard(text) {
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        const result = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (result) {
            console.log('[代码复制] 使用降级方法复制成功');
            showSuccess('代码已复制到剪贴板');
        } else {
            throw new Error('execCommand copy failed');
        }
    } catch (error) {
        console.error('[代码复制] 降级复制方法也失败了:', error);
        showError('复制失败，请手动复制');
    }
}

/**
 * 显示成功消息
 */
function showSuccess(message) {
    try {
        // 简单的成功提示实现
        const successDiv = document.createElement('div');
        successDiv.style.position = 'fixed';
        successDiv.style.top = '20px';
        successDiv.style.right = '20px';
        successDiv.style.background = 'rgba(34, 197, 94, 0.95)';
        successDiv.style.color = '#fff';
        successDiv.style.padding = '12px 24px';
        successDiv.style.borderRadius = '8px';
        successDiv.style.fontSize = '0.9rem';
        successDiv.style.zIndex = '99999';
        successDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    } catch (error) {
        console.warn('[消息提示] 显示成功消息失败:', error);
    }
}

const __yiPerf = (() => {
    const marks = new Map();
    const entries = [];
    const maxEntries = 200;

    const now = () => {
        try {
            if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
        } catch (_) { }
        return Date.now();
    };

    const push = (entry) => {
        entries.push(entry);
        if (entries.length > maxEntries) entries.splice(0, entries.length - maxEntries);
    };

    const mark = (name) => {
        const t = now();
        marks.set(String(name), t);
        push({ kind: 'mark', name: String(name), t, at: Date.now() });
        return t;
    };

    const measure = (name, startName, endName) => {
        const start = marks.get(String(startName));
        const end = endName ? marks.get(String(endName)) : now();
        if (typeof start !== 'number' || typeof end !== 'number') return null;
        const duration = end - start;
        push({ kind: 'measure', name: String(name), startName: String(startName), endName: endName ? String(endName) : '', start, end, duration, at: Date.now() });
        return duration;
    };

    const recordDuration = (name, duration, meta = null) => {
        const d = Number(duration);
        if (!Number.isFinite(d)) return null;
        push({ kind: 'duration', name: String(name), duration: d, meta: meta && typeof meta === 'object' ? meta : null, at: Date.now() });
        return d;
    };

    const getEntries = () => entries.slice();

    const shouldShowPanel = () => {
        try {
            const params = new URLSearchParams(window.location.search);
            if (params.has('perf')) return params.get('perf') === 'true';
        } catch (_) { }
        try {
            const stored = localStorage.getItem('perfPanel');
            if (stored != null) return stored === 'true';
        } catch (_) { }
        return false;
    };

    const renderPanel = (root) => {
        const list = entries.slice(-30).reverse();
        const lines = list.map((e) => {
            if (e.kind === 'duration') return `${e.duration.toFixed(1)}ms  ${e.name}`;
            if (e.kind === 'measure') return `${e.duration.toFixed(1)}ms  ${e.name}`;
            if (e.kind === 'mark') return `mark      ${e.name}`;
            return `${e.kind} ${e.name || ''}`.trim();
        });
        root.querySelector('[data-perf-body]').textContent = lines.join('\n');
    };

    const showPanel = () => {
        try {
            if (typeof document === 'undefined') return;
            let root = document.getElementById('yi-perf-panel');
            if (!root) {
                root = document.createElement('div');
                root.id = 'yi-perf-panel';
                root.style.position = 'fixed';
                root.style.right = '12px';
                root.style.bottom = '12px';
                root.style.width = '420px';
                root.style.maxWidth = 'calc(100vw - 24px)';
                root.style.maxHeight = '50vh';
                root.style.overflow = 'hidden';
                root.style.zIndex = '99998';
                root.style.border = '1px solid rgba(0,0,0,0.18)';
                root.style.borderRadius = '12px';
                root.style.background = 'rgba(17,24,39,0.92)';
                root.style.color = 'rgba(255,255,255,0.92)';
                root.style.backdropFilter = 'blur(10px)';
                root.style.boxShadow = '0 18px 60px rgba(0,0,0,0.35)';
                root.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
                root.style.fontSize = '12px';
                root.style.lineHeight = '1.4';
                root.innerHTML = `
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.10);">
                        <div style="font-weight:700;letter-spacing:.02em;">Perf</div>
                        <div style="display:flex;gap:8px;align-items:center;">
                            <button data-perf-clear type="button" style="height:26px;padding:0 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.06);color:inherit;cursor:pointer;">Clear</button>
                            <button data-perf-close type="button" style="height:26px;padding:0 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.06);color:inherit;cursor:pointer;">Close</button>
                        </div>
                    </div>
                    <pre data-perf-body style="margin:0;padding:10px 12px;white-space:pre-wrap;word-break:break-word;overflow:auto;max-height:calc(50vh - 48px);"></pre>
                `;
                document.body.appendChild(root);
                root.querySelector('[data-perf-close]').addEventListener('click', () => {
                    try { localStorage.setItem('perfPanel', 'false'); } catch (_) { }
                    root.remove();
                });
                root.querySelector('[data-perf-clear]').addEventListener('click', () => {
                    entries.splice(0, entries.length);
                    renderPanel(root);
                });
            }
            renderPanel(root);
            if (!root.__yiPerfTimer) {
                root.__yiPerfTimer = setInterval(() => renderPanel(root), 800);
            }
        } catch (e) {
            console.warn('[性能监控] Perf 面板启动失败:', e);
        }
    };

    const init = () => {
        try {
            if (!checkEnvironmentCompatibility()) return;
            if (shouldShowPanel()) showPanel();
        } catch (_) { }
    };

    return { mark, measure, recordDuration, getEntries, showPanel, init };
})();

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

        // 初始化全局代码块复制函数
        initGlobalCopyCodeBlock();
        
        monitorPageLoadPerformance();
        monitorErrors();
        try {
            if (typeof window !== 'undefined') {
                window.yiPerf = __yiPerf;
                __yiPerf.init();
            }
        } catch (_) { }
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
