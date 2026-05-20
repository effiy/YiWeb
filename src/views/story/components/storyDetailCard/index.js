import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'StoryDetailCard',
    html: '/src/views/story/components/storyDetailCard/template.html',
    css: '/src/views/story/components/storyDetailCard/index.css',
    props: {
        story: { type: Object, default: null },
        panel: { type: Boolean, default: false }
    },
    emits: ['back', 'close'],
    computed: {
        fileGroups() {
            const files = this.story?.files || [];
            const groups = new Map();
            for (const file of files) {
                const fn = file.fileName || '';
                const m = fn.match(/^(.+?)-/);
                const prefix = m ? m[1] : fn;
                if (!groups.has(prefix)) groups.set(prefix, []);
                groups.get(prefix).push(file);
            }
            const sorted = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
            return sorted.map(([prefix, files]) => ({ prefix, files }));
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
        typeLabel(type) {
            const map = { backend: '后端', frontend: '前端', fullstack: '全栈', meta: '元数据' };
            return map[type] || type;
        },
        onBack() {
            this.$emit('back');
        },
        onFileClick(file) {
            const key = encodeURIComponent(file.filePath || '');
            window.open('../aicr/index.html?key=' + key, '_blank');
        }
    }
});
