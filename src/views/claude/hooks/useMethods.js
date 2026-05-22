/**
 * Claude 管理面板 - 方法
 */
import { clearCacheAndRefresh } from '/cdn/utils/core/clearCache.js';

export function useMethods(store) {
    function viewProject(name) {
        store.selectProject(name);
    }

    function goBack() {
        store.clearSelection();
    }

    function formatDate(ts) {
        if (!ts) return '—';
        const d = new Date(ts);
        if (isNaN(d.getTime())) return '—';
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function clearCache() {
        clearCacheAndRefresh();
    }

    return {
        viewProject,
        goBack,
        formatDate,
        clearCache,
    };
}
