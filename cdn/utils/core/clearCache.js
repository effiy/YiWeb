/**
 * 清除浏览器全部缓存并硬刷新页面（等同于 Delete browsing data + Hard Reload）
 * 1. 内存缓存 — 清除 CacheManager、CachedRequest 实例等应用层内存缓存
 * 2. localStorage — 保留 Token、模型选择、env、debug，其余键全部移除
 * 3. sessionStorage — 全部清除
 * 4. Cookies — 清除当前域下所有非 HttpOnly Cookie
 * 5. CacheStorage — 清除所有 Service Worker 缓存的 JS/CSS/HTML 等静态资源
 * 6. IndexedDB — 清除所有数据库
 * 7. Service Worker — 注销所有注册
 * 8. 硬刷新 — 使用缓存爆破参数导航，绕过浏览器 HTTP 缓存，强制从服务器重新请求所有
 *    静态文件（cached images and files）。浏览器会将新 URL 视为全新请求，不会命中
 *    任何 HTTP 磁盘缓存。
 */

// 需要保留的 localStorage 键名（认证 + 环境配置）
const PRESERVE_KEYS = new Set([
    'YiWeb.apiToken.v1',
    'YiWeb.apiModel.v1',
    'env',
    'debug'
]);

/**
 * 在页面顶部显示简短的状态提示条
 */
function showStatus(message, duration) {
    try {
        const el = document.createElement('div');
        el.textContent = message;
        el.style.cssText =
            'position:fixed;top:0;left:0;right:0;z-index:var(--z-debug);' +
            'background:#1a73e8;color:#fff;text-align:center;padding:10px 16px;' +
            'font-size:14px;font-family:system-ui,sans-serif;transition:opacity .3s;';
        document.body.appendChild(el);
        if (duration > 0) {
            setTimeout(() => {
                el.style.opacity = '0';
                setTimeout(() => { try { el.remove(); } catch (_) {} }, 350);
            }, duration);
        }
        return el;
    } catch (_) {
        return null;
    }
}

/**
 * 执行硬刷新：使用唯一时间戳参数导航到当前页面，迫使浏览器绕过 HTTP 缓存，
 * 重新请求 HTML 及所有静态资源（images、CSS、JS 等）。
 * 用 location.replace 避免在历史记录中留下多余的缓存爆破条目。
 */
function hardReload() {
    const url = new URL(window.location.href);
    url.searchParams.delete('_t');
    url.searchParams.set('_t', Date.now().toString(36));
    window.location.replace(url.toString());
}

export const clearCacheAndRefresh = async () => {
    const confirmed = window.confirm('确定要清空缓存并刷新页面？Token 和环境配置将被保留。');
    if (!confirmed) return;

    const statusEl = showStatus('正在清除缓存...', 0);

    // 0. 清除应用层内存缓存（在页面刷新前主动释放，确保彻底清理）
    try {
        if (typeof window.CacheManager !== 'undefined' && window.CacheManager.clear) {
            window.CacheManager.clear();
        }
    } catch (_) { /* 静默忽略 */ }

    // 清除通过 createCachedRequest 创建的实例（如果暴露了实例列表）
    try {
        if (Array.isArray(window._cachedRequestInstances)) {
            window._cachedRequestInstances.forEach(inst => {
                try { inst.clear(); } catch (_) {}
            });
        }
    } catch (_) { /* 静默忽略 */ }

    // 1. 清除 localStorage（保留 Token、模型选择、env、debug）
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

    // 3. 清除 Cookies（仅当前域下非 HttpOnly 的 Cookie）
    try {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const eqIdx = cookie.indexOf('=');
            if (eqIdx === -1) continue;
            const name = cookie.substring(0, eqIdx).trim();
            if (!name) continue;
            // 通过设置过期时间为过去来删除，覆盖 path=/ 和当前路径
            const past = '=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = name + past + ';path=/';
            document.cookie = name + past + ';path=' + (window.location.pathname || '/');
            // 也尝试清除根域 cookie
            const hostParts = window.location.hostname.split('.');
            if (hostParts.length > 1) {
                const domain = hostParts.slice(-2).join('.');
                document.cookie = name + past + ';path=/;domain=' + domain;
                document.cookie = name + past + ';path=/;domain=.' + domain;
            }
        }
    } catch (_) {
        // Cookie 操作异常静默忽略
    }

    // 4. 清除 CacheStorage — 等待所有异步删除完成后再刷新，避免竞态
    if ('caches' in window) {
        try {
            const names = await caches.keys();
            await Promise.all(names.map(name => caches.delete(name)));
        } catch (_) {
            // CacheStorage 异常静默忽略
        }
    }

    // 5. 清除 IndexedDB
    if ('indexedDB' in window) {
        try {
            const dbs = await indexedDB.databases?.();
            if (dbs) {
                await Promise.all(dbs.map(db => indexedDB.deleteDatabase(db.name)));
            }
        } catch (_) {
            // IndexedDB 异常静默忽略
        }
    }

    // 6. 注销所有 Service Worker
    if ('serviceWorker' in navigator) {
        try {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(reg => reg.unregister()));
        } catch (_) {
            // Service Worker 异常静默忽略
        }
    }

    // 7. 更新状态提示
    if (statusEl) {
        statusEl.textContent = '缓存已清除，正在刷新...';
        statusEl.style.background = '#0d904f';
    }

    // 短暂延迟让用户看到完成提示
    await new Promise(r => setTimeout(r, 200));

    // 8. 硬刷新 — 使用缓存爆破 URL 绕过浏览器 HTTP 缓存
    //    location.replace 确保浏览器将此次导航视为全新的跨缓存请求，
    //    该域名下的所有 cached images and files 都会被强制重新拉取。
    hardReload();
};

// 向后兼容：暴露到全局
if (typeof window !== 'undefined') {
    window.clearCacheAndRefresh = clearCacheAndRefresh;
}
