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
                not_started: '未开始',
                docs_in_progress: '文档进行中',
                docs_done: '文档完成',
                code_in_progress: '编码进行中',
                code_done: '编码完成',
                blocked: '已阻断'
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
