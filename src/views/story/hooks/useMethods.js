/**
 * 故事任务面板 - 方法
 */
export function useMethods(store) {
    function viewStory(name) {
        store.selectStory(name);
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

    function statusLabel(status) {
        const map = {
            planning: '规划',
            design: '设计',
            develop: '开发',
            testing: '测试',
            operations: '运营'
        };
        return map[status] || status;
    }

    function statusVariant(status) {
        const map = {
            planning: '',
            design: 'warning',
            develop: 'info',
            testing: 'primary',
            operations: 'success'
        };
        return map[status] || '';
    }

    return {
        viewStory,
        goBack,
        formatDate,
        statusLabel,
        statusVariant
    };
}
