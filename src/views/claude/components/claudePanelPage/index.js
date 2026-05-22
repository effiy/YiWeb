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
            healthFilters: {
                hasClaudeMd: false,
                hasSettings: false,
                hasSkills: false,
                hasAgents: false,
                hasMemory: false,
            },
            sortField: 'lastModified',
            sortDirection: 'desc',
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

            return this.sortProjects(result);
        },
        sortOptions() {
            return [
                { value: 'name-asc', label: '名称 A-Z', field: 'name', dir: 'asc' },
                { value: 'name-desc', label: '名称 Z-A', field: 'name', dir: 'desc' },
                { value: 'lastModified-desc', label: '最近修改', field: 'lastModified', dir: 'desc' },
                { value: 'lastModified-asc', label: '最早修改', field: 'lastModified', dir: 'asc' },
                { value: 'fileCount-desc', label: '文件数 ↓', field: 'fileCount', dir: 'desc' },
                { value: 'skillCount-desc', label: 'Skills 数 ↓', field: 'skillCount', dir: 'desc' },
            ];
        },
        currentSortLabel() {
            const opt = this.sortOptions.find(o => o.field === this.sortField && o.dir === this.sortDirection);
            return opt ? opt.label : '排序';
        },
    },
    methods: {
        sortProjects(list) {
            const field = this.sortField;
            const dir = this.sortDirection;
            const sorted = [...list];
            sorted.sort((a, b) => {
                let va = a[field];
                let vb = b[field];
                if (typeof va === 'string') va = va.toLowerCase();
                if (typeof vb === 'string') vb = vb.toLowerCase();
                if (va < vb) return dir === 'asc' ? -1 : 1;
                if (va > vb) return dir === 'asc' ? 1 : -1;
                return 0;
            });
            return sorted;
        },
        setSort(field, dir) {
            this.sortField = field;
            this.sortDirection = dir;
        },
        toggleHealthFilter(key) {
            this.healthFilters[key] = !this.healthFilters[key];
        },
        clearAllFilters() {
            this.localSearchQuery = '';
            this.healthFilters = {
                hasClaudeMd: false,
                hasSettings: false,
                hasSkills: false,
                hasAgents: false,
                hasMemory: false,
            };
            this.sortField = 'lastModified';
            this.sortDirection = 'desc';
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
