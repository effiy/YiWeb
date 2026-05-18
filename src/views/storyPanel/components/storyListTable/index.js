import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'StoryListTable',
    html: '/src/views/storyPanel/components/storyListTable/template.html',
    css: '/src/views/storyPanel/components/storyListTable/index.css',
    props: {
        stories: { type: Array, default: () => [] },
        loading: { type: Boolean, default: false },
        error: { type: String, default: null }
    },
    emits: ['select'],
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
        onSelect(story) {
            this.$emit('select', story.name);
        }
    }
});
