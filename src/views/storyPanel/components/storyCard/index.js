import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'StoryCard',
    html: '/src/views/storyPanel/components/storyCard/template.html',
    css: '/src/views/storyPanel/components/storyCard/index.css',
    props: {
        story: { type: Object, default: null }
    },
    emits: ['select'],
    computed: {
        typeLabel() {
            const map = { backend: '后端', frontend: '前端', fullstack: '全栈', meta: '元数据' };
            return map[this.story?.type] || this.story?.type || '';
        },
        cardClass() {
            if (!this.story) return 'sc-card';
            return `sc-card sc-card--${this.story.status}`;
        }
    },
    methods: {
        formatDate(ts) {
            if (!ts) return '—';
            const d = new Date(ts);
            if (isNaN(d.getTime())) return '—';
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        },
        onClick() {
            if (this.story) {
                this.$emit('select', this.story);
            }
        }
    }
});
