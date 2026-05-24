import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'StoryCard',
    html: '/src/views/story/components/storyCard/template.html',
    css: '/src/views/story/components/storyCard/index.css',
    props: {
        story: { type: Object, default: null }
    },
    emits: ['select'],
    computed: {
        cardClass() {
            if (!this.story) return 'sc-card';
            return `sc-card sc-card--${this.story.status}`;
        },
        tagAccentStyle() {
            if (!this.story || !this.story.projectTags || this.story.projectTags.length === 0) return '';
            const tag = this.story.projectTags[0];
            let hash = 0;
            for (let i = 0; i < tag.length; i++) {
                hash = tag.charCodeAt(i) + ((hash << 5) - hash);
            }
            const hue = Math.abs(hash) % 360;
            return `--sc-accent: hsl(${hue}, 55%, 50%); --sc-accent-bg: hsla(${hue}, 55%, 50%, 0.08);`;
        },
        stageCounts() {
            if (!this.story || !this.story.files) return null;
            const names = this.story.files.map(f => f.fileName || '');
            return {
                plan: names.filter(n => n.endsWith('-故事任务.md')).length,
                design: names.filter(n => n.endsWith('-使用场景.md')).length,
                dev: names.filter(n => n.endsWith('-实施报告.md')).length,
                test: names.filter(n => n.endsWith('-测试报告.md')).length,
                ops: names.filter(n => n.endsWith('-自改进复盘.md')).length,
            };
        }
    },
    methods: {
        formatDate(ts) {
            if (!ts) return '';
            const d = new Date(ts);
            if (isNaN(d.getTime())) return '';
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
