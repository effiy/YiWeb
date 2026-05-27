/**
 * 故事任务面板 - 方法组合
 *
 * 对标 aicr/hooks/useMethods.js：组合所有方法模块。
 * 组件通过 createBaseView 的 methods 选项获取这些方法。
 */

import { clearCacheAndRefresh } from '/cdn/utils/core/clearCache.js';

export function useMethods(store) {
    function formatDate(ts) {
        if (!ts) return '—';
        const d = new Date(ts);
        if (isNaN(d.getTime())) return '—';
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function statusLabel(status) {
        const map = {
            planning: '规划', design: '设计', develop: '开发',
            testing: '测试', operations: '运营',
        };
        return map[status] || status;
    }

    function statusVariant(status) {
        const map = {
            planning: '', design: 'warning', develop: 'info',
            testing: 'primary', operations: 'success',
        };
        return map[status] || '';
    }

    function tagColorStyle(tag) {
        const colorMap = {};
        for (const t of store.allProjectTags.value) {
            let hash = 0;
            for (let i = 0; i < t.length; i++) {
                hash = t.charCodeAt(i) + ((hash << 5) - hash);
            }
            const hue = Math.abs(hash) % 360;
            colorMap[t] = {
                '--sc-accent': `hsl(${hue}, 55%, 50%)`,
                '--sc-accent-bg': `hsla(${hue}, 55%, 50%, 0.12)`,
            };
        }
        return colorMap[tag] || {};
    }

    function clearCache() {
        clearCacheAndRefresh();
    }

    return {
        formatDate,
        statusLabel,
        statusVariant,
        tagColorStyle,
        clearCache,
    };
}
