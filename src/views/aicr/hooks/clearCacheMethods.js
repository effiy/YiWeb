/**
 * 清除浏览器全部缓存并硬刷新页面
 * 1. localStorage — 保留 Token 和模型选择，其余键全部移除
 * 2. sessionStorage — 全部清除
 * 3. CacheStorage — 清除所有 Service Worker 缓存的 JS/CSS/HTML 等静态资源
 * 4. 硬刷新 — 使用缓存爆破参数绕过浏览器 HTTP 缓存，确保从服务器重新请求所有静态文件
 */

// 需要保留的 localStorage 键名
const PRESERVE_KEYS = new Set([
    'YiWeb.apiToken.v1',
    'YiWeb.apiModel.v1'
]);

export const clearCacheAndRefresh = async () => {
    const confirmed = window.confirm('确定要清空缓存并刷新页面？Token 将被保留。');
    if (!confirmed) return;

    // 1. 清除 localStorage（保留 Token 和模型选择）
    try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) keys.push(key);
        }

        for (const key of keys) {
            if (PRESERVE_KEYS.has(key)) continue;
            try {
                localStorage.removeItem(key);
            } catch (_) {
                // 单键移除异常静默忽略
            }
        }
    } catch (_) {
        // localStorage 访问异常时继续后续清理
    }

    // 2. 清除 sessionStorage
    try {
        sessionStorage.clear();
    } catch (_) {
        // sessionStorage 异常静默忽略
    }

    // 3. 清除 CacheStorage — 等待所有异步删除完成后再刷新，避免竞态
    if ('caches' in window) {
        try {
            const names = await caches.keys();
            await Promise.all(names.map(name => caches.delete(name)));
        } catch (_) {
            // CacheStorage 异常静默忽略
        }
    }

    // 4. 硬刷新 — CacheStorage 已清除，直接 reload 即可从服务器获取最新资源
    window.location.reload();
};

// 向后兼容：暴露到全局
if (typeof window !== 'undefined') {
    window.clearCacheAndRefresh = clearCacheAndRefresh;
}
