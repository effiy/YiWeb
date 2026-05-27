import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'ClaudeDetailCard',
    html: '/src/views/claude/components/claudeDetailCard/template.html',
    css: '/src/views/claude/components/claudeDetailCard/index.css',
    props: {
        project: { type: Object, default: null },
        panel: { type: Boolean, default: false }
    },
    emits: ['close'],
    computed: {
        fileGroups() {
            const files = this.project?.files || [];
            const groups = new Map();
            for (const file of files) {
                const fp = file.filePath || '';
                const parts = fp.split('/');
                const claudeIdx = parts.indexOf('.claude');
                let group = 'root';
                if (claudeIdx >= 0 && claudeIdx + 1 < parts.length) {
                    const sub = parts[claudeIdx + 1];
                    if (sub && !sub.includes('.')) {
                        group = sub;
                    } else {
                        group = 'root';
                    }
                }
                if (!groups.has(group)) groups.set(group, []);
                groups.get(group).push(file);
            }
            const order = ['root', 'skills', 'agents', 'rules', 'templates', 'memory', 'hooks', 'mcp'];
            const sorted = [];
            for (const key of order) {
                if (groups.has(key)) {
                    sorted.push({ prefix: key, files: groups.get(key) });
                    groups.delete(key);
                }
            }
            for (const [key, val] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
                sorted.push({ prefix: key, files: val });
            }
            return sorted;
        },
        groupLabelMap() {
            return {
                root: '根目录',
                skills: 'Skills',
                agents: 'Agents',
                memory: 'Memory',
                hooks: 'Hooks',
                mcp: 'MCP',
                rules: 'Rules',
                templates: 'Templates',
            };
        },
    },
    methods: {
        formatDate(ts) {
            if (!ts) return '—';
            const d = new Date(ts);
            if (isNaN(d.getTime())) return '—';
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        },
        groupLabel(prefix) {
            return this.groupLabelMap[prefix] || prefix;
        },
        onFileClick(file) {
            const key = encodeURIComponent(file.filePath || '');
            window.open('../aicr/index.html?key=' + key, '_blank');
        },
        onClose() {
            this.$emit('close');
        },
    }
});
