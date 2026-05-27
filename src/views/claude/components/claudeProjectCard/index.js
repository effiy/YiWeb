import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'ClaudeProjectCard',
    html: '/src/views/claude/components/claudeProjectCard/template.html',
    css: '/src/views/claude/components/claudeProjectCard/index.css',
    props: {
        project: { type: Object, default: null }
    },
    emits: ['select'],
    computed: {
        healthScore() {
            const p = this.project;
            if (!p) return 0;
            let score = 0;
            if (p.hasClaudeMd) score += 20;
            if (p.hasSettings) score += 20;
            if (p.skillCount > 0) score += 15;
            if (p.agentCount > 0) score += 15;
            if (p.hasMemory) score += 10;
            if (p.hasHooks) score += 10;
            if (p.ruleCount > 0) score += 5;
            if (p.templateCount > 0) score += 5;
            return score;
        },
        healthLabel() {
            const s = this.healthScore;
            if (s >= 80) return '优秀';
            if (s >= 60) return '良好';
            if (s >= 40) return '一般';
            return '待完善';
        },
        healthVariant() {
            const s = this.healthScore;
            if (s >= 80) return 'success';
            if (s >= 60) return 'info';
            if (s >= 40) return 'warning';
            return '';
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
        onClick() {
            if (this.project) {
                this.$emit('select', this.project);
            }
        }
    }
});
