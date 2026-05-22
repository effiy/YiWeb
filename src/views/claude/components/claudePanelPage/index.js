import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';
import { clearCacheAndRefresh } from '/cdn/utils/core/clearCache.js';

registerGlobalComponent({
    name: 'ClaudePanelPage',
    html: '/src/views/claude/components/claudePanelPage/template.html',
    css: '/src/views/claude/components/claudePanelPage/index.css',
    props: {
        loading: { type: Boolean, default: false },
        error: { type: String, default: null },
        projects: { type: Array, default: () => [] },
        totalProjects: { type: Number, default: 0 },
        totalSkills: { type: Number, default: 0 },
        totalAgents: { type: Number, default: 0 },
        healthSummary: { type: Object, default: () => ({}) },
        selectedProject: { type: Object, default: null },
    },
    emits: ['select-project', 'back'],
    data() {
        return {
            localSearchQuery: '',
            panelProject: null,
        };
    },
    computed: {
        panelVisible() {
            return !!this.panelProject;
        },
        filteredProjects() {
            const q = (this.localSearchQuery || '').trim().toLowerCase();
            if (!q) return this.projects;
            return this.projects.filter(p =>
                p.name.toLowerCase().includes(q)
            );
        },
    },
    methods: {
        openDetail(project) {
            if (typeof project === 'string') {
                project = this.projects.find(p => p.name === project);
                if (!project) return;
            }
            this.panelProject = project;
            this.$emit('select-project', project.name);
        },
        closePanel() {
            this.panelProject = null;
        },
        onBackdropClick(e) {
            if (e.target === e.currentTarget) {
                this.closePanel();
            }
        },
        onKeydown(e) {
            if (e.key === 'Escape' && this.panelVisible) {
                this.closePanel();
            }
        },
        clearCache() {
            clearCacheAndRefresh();
        },
    },
    mounted() {
        document.addEventListener('keydown', this.onKeydown);
    },
    beforeUnmount() {
        document.removeEventListener('keydown', this.onKeydown);
    }
});
