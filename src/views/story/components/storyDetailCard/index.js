import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'StoryDetailCard',
    html: '/src/views/story/components/storyDetailCard/template.html',
    css: '/src/views/story/components/storyDetailCard/index.css',
    props: {
        story: { type: Object, default: null },
        panel: { type: Boolean, default: false },
        storyDeps: { type: Array, default: () => [] }
    },
    emits: ['back', 'close', 'select-story'],
    computed: {
        depInfo() {
            const name = this.story?.name;
            const deps = this.storyDeps || [];
            if (!name || deps.length === 0) return null;

            const self = deps.find(s => s.directory === name);
            if (!self) return null;

            const dependsOn = (self.dependsOn || []).map(d => {
                const target = deps.find(s => s.directory === d.directory);
                return { directory: d.directory, relation: d.relation, name: target?.name || d.directory };
            });

            const dependedBy = deps
                .filter(s => Array.isArray(s.dependsOn) && s.dependsOn.some(d => d.directory === name))
                .map(s => ({ directory: s.directory, name: s.name }));

            return { dependsOn, dependedBy, type: self.type, parent: self.parent, children: self.children };
        },
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
        onBack() {
            this.$emit('back');
        },
        onFileClick(file) {
            const key = encodeURIComponent(file.filePath || '');
            window.open('../aicr/index.html?key=' + key, '_blank');
        },
        onDepClick(directory) {
            this.$emit('select-story', directory);
        },
        relationLabel(relation) {
            const map = { blocks: '阻断', informs: '输入', references: '引用' };
            return map[relation] || relation;
        }
    }
});
