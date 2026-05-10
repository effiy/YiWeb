/**
 * 清除缓存并刷新页面工具函数
 * 保留 API Token 和模型选择，清除其余 localStorage 数据
 * author: Claude Code
 */

// 需要保留的 localStorage 键名
const PRESERVE_KEYS = new Set([
    'YiWeb.apiToken.v1',
    'YiWeb.apiModel.v1'
]);

/**
 * 清除 localStorage 缓存并刷新页面
 * 保留 Token 和模型选择，其余键全部移除
 */
export const clearCacheAndRefresh = () => {
    const confirmed = window.confirm('确定要清空缓存并刷新页面？Token 将被保留。');
    if (!confirmed) return;

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
                // 单键移除异常静默忽略，继续下一键
            }
        }
    } catch (_) {
        // localStorage 访问异常时仍尝试刷新页面
    }

    window.location.reload();
};

// 向后兼容：暴露到全局
if (typeof window !== 'undefined') {
    window.clearCacheAndRefresh = clearCacheAndRefresh;
}
