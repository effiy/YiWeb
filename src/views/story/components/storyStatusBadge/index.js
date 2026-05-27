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
                planning: '规划',
                design: '设计',
                develop: '开发',
                testing: '测试',
                operations: '运营'
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
