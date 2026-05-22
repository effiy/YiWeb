import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'StoryStatusBadge',
    html: '/src/views/story/components/storyStatusBadge/template.html',
    css: '/src/views/story/components/storyStatusBadge/index.css',
    props: {
        status: { type: String, default: '' },
        size: { type: String, default: '', validator: v => !v || ['sm', 'lg'].includes(v) }
    },
    computed: {
        label() {
            const map = {
                not_started: '任务',
                docs_in_progress: '设计',
                docs_done: '实施',
                code_in_progress: '测试',
                self_improve: '改进',
                code_done: '报告'
            };
            return map[this.status] || this.status;
        },
        badgeClass() {
            const classes = ['sp-status-badge'];
            if (this.status) classes.push(`sp-status-badge--${this.status}`);
            if (this.size) classes.push(`sp-status-badge--${this.size}`);
            return classes;
        }
    }
});
