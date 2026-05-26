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
            filterBarCollapsed: false,
            tagsScrollLeft: 0,
            tagsScrollAtEnd: true,
            healthFilters: {
                hasReadmeMd: false,
                hasClaudeMd: false,
                hasSettings: false,
                hasSkills: false,
                hasAgents: false,
                hasMemory: false,
            },
        };
    },
    computed: {
        panelVisible() {
            return !!this.panelProject;
        },
        hasActiveHealthFilters() {
            return Object.values(this.healthFilters).some(Boolean);
        },
        activeHealthFilterCount() {
            return Object.values(this.healthFilters).filter(Boolean).length;
        },
        filteredProjects() {
            const q = (this.localSearchQuery || '').trim().toLowerCase();
            let result = this.projects;

            if (q) {
                result = result.filter(p => p.name.toLowerCase().includes(q));
            }

            if (this.healthFilters.hasReadmeMd) {
                result = result.filter(p => p.hasReadmeMd);
            }
            if (this.healthFilters.hasClaudeMd) {
                result = result.filter(p => p.hasClaudeMd);
            }
            if (this.healthFilters.hasSettings) {
                result = result.filter(p => p.hasSettings);
            }
            if (this.healthFilters.hasSkills) {
                result = result.filter(p => p.skillCount > 0);
            }
            if (this.healthFilters.hasAgents) {
                result = result.filter(p => p.agentCount > 0);
            }
            if (this.healthFilters.hasMemory) {
                result = result.filter(p => p.hasMemory);
            }

            return result;
        },
    },
    methods: {
        toggleHealthFilter(key) {
            this.healthFilters[key] = !this.healthFilters[key];
        },
        toggleFilterBar() {
            this.filterBarCollapsed = !this.filterBarCollapsed;
        },
        handleTagsScroll(e) {
            const el = e.target;
            this.tagsScrollLeft = el.scrollLeft;
            this.tagsScrollAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
        },
        clearAllFilters() {
            this.localSearchQuery = '';
            this.healthFilters = {
                hasReadmeMd: false,
                hasClaudeMd: false,
                hasSettings: false,
                hasSkills: false,
                hasAgents: false,
                hasMemory: false,
            };
        },
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
            if (e.key === 'Escape') {
                if (this.panelVisible) {
                    this.closePanel();
                } else if (this.localSearchQuery || this.hasActiveHealthFilters) {
                    this.clearAllFilters();
                }
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
