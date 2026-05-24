import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'StoryListTable',
    html: '/src/views/story/components/storyListTable/template.html',
    css: '/src/views/story/components/storyListTable/index.css',
    props: {
        stories: { type: Array, default: () => [] },
        loading: { type: Boolean, default: false },
        error: { type: String, default: null },
        sortField: { type: String, default: 'lastModified' },
        sortDirection: { type: String, default: 'desc' },
    },
    emits: ['select', 'sort'],
    computed: {
        sortableColumns() {
            return [
                { field: 'name', label: '故事名称', sortable: true },
                { field: 'status', label: '状态', sortable: true },
                { field: null, label: '项目标签', sortable: false },
                { field: null, label: '阶段进度', sortable: false },
                { field: 'fileCount', label: '文件数', sortable: true },
                { field: 'lastModified', label: '最后修改', sortable: true },
            ];
        },
    },
    methods: {
        formatDate(ts) {
            if (!ts) return '—';
            const d = new Date(ts);
            if (isNaN(d.getTime())) return '—';
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        },
        stageCounts(story) {
            const names = (story.files || []).map(f => f.fileName || '');
            return {
                plan: names.filter(n => n.endsWith('-故事任务.md')).length,
                design: names.filter(n => n.endsWith('-使用场景.md')).length,
                dev: names.filter(n => n.endsWith('-实施报告.md')).length,
                test: names.filter(n => n.endsWith('-测试报告.md')).length,
                ops: names.filter(n => n.endsWith('-自改进复盘.md')).length,
            };
        },
        onSort(field) {
            if (!field) return;
            this.$emit('sort', field);
        },
        sortArrow(field) {
            if (this.sortField !== field) return '';
            return this.sortDirection === 'asc' ? ' ↑' : ' ↓';
        },
        thClass(field) {
            const classes = [];
            if (field) classes.push('sp-th--sortable');
            if (this.sortField === field) classes.push('sp-th--sorted');
            return classes.join(' ');
        },
        onSelect(story) {
            this.$emit('select', story.name);
        },
    }
});
