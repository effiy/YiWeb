/**
 * 故事任务面板 - 方法
 */
export function useMethods(store) {
    function refreshStories() {
        return store.fetchStories();
    }

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
            not_started: '未开始',
            docs_in_progress: '文档进行中',
            docs_done: '文档完成',
            code_in_progress: '编码进行中',
            code_done: '编码完成',
            blocked: '已阻断'
        };
        return map[status] || status;
    }

    function statusVariant(status) {
        const map = {
            not_started: '',
            docs_in_progress: 'warning',
            docs_done: 'info',
            code_in_progress: 'accent',
            code_done: 'success',
            blocked: 'danger'
        };
        return map[status] || '';
    }

    function typeLabel(type) {
        const map = {
            backend: '后端',
            frontend: '前端',
            fullstack: '全栈',
            meta: '元数据'
        };
        return map[type] || type;
    }

    return {
        refreshStories,
        viewStory,
        goBack,
        formatDate,
        statusLabel,
        statusVariant,
        typeLabel
    };
}
