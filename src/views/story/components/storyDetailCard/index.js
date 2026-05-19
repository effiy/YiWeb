import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'StoryDetailCard',
    html: '/src/views/story/components/storyDetailCard/template.html',
    css: '/src/views/story/components/storyDetailCard/index.css',
    props: {
        story: { type: Object, default: null },
        syncing: { type: Boolean, default: false },
        panel: { type: Boolean, default: false }
    },
    emits: ['back', 'sync', 'close'],
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
        onSync() {
            if (this.story) {
                this.$emit('sync', this.story.name);
            }
        },
        onBack() {
            this.$emit('back');
        }
    }
});
