import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'DepEditor',
    html: '/src/views/story/components/depEditor/template.html',
    css: '/src/views/story/components/depEditor/index.css',
    props: {
        storyDeps: { type: Array, default: () => [] },
        currentDir: { type: String, default: '' },
        existingDeps: { type: Array, default: () => [] },
    },
    emits: ['add', 'cancel'],
    data() {
        return {
            selectedDir: '',
            selectedRelation: 'informs',
        };
    },
    computed: {
        availableStories() {
            const existingDirs = new Set(this.existingDeps.map(d => d.directory));
            existingDirs.add(this.currentDir);
            return this.storyDeps.filter(s => !existingDirs.has(s.directory));
        },
        relationOptions() {
            return [
                { value: 'informs', label: '输入' },
                { value: 'references', label: '引用' },
                { value: 'blocks', label: '阻断' },
            ];
        },
    },
    methods: {
        onConfirm() {
            if (!this.selectedDir) return;
            this.$emit('add', { directory: this.selectedDir, relation: this.selectedRelation });
        },
        onCancel() {
            this.$emit('cancel');
        },
    },
});
