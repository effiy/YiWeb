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
                { field: 'nextStep', label: '下一步', sortable: false },
                { field: null, label: '消息', sortable: false },
                { field: null, label: '日志', sortable: false },
                { field: 'fileCount', label: '文件数', sortable: true },
                { field: 'lastModified', label: '最后修改', sortable: true },
                { field: 'type', label: '类型', sortable: true },
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
        typeLabel(type) {
            const map = { backend: '后端', frontend: '前端', fullstack: '全栈', meta: '元数据' };
            return map[type] || type;
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
