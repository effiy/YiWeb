import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';
import { clearCacheAndRefresh } from '/cdn/utils/core/clearCache.js';

registerGlobalComponent({
    name: 'StoryPanelPage',
    html: '/src/views/story/components/storyPanelPage/template.html',
    css: '/src/views/story/components/storyPanelPage/index.css',
    props: {
        loading: { type: Boolean, default: false },
        error: { type: String, default: null },
        stories: { type: Array, default: () => [] },
        statusCounts: { type: Object, default: () => ({}) },
        totalStories: { type: Number, default: 0 },
        selectedStory: { type: Object, default: null },
        storiesByStatus: { type: Object, default: () => ({}) },
        allProjectTags: { type: Array, default: () => [] },
    },
    emits: ['select-story', 'back'],
    data() {
        return {
            localSearchQuery: '',
            viewMode: 'board',
            panelStory: null,
            selectedProjectTag: null,
            selectedStatus: null,
            selectedType: null,
            sortField: 'lastModified',
            sortDirection: 'desc',
        };
    },
    computed: {
        documentCounts() {
            const counts = { story_task: 0, scenario: 0, implementation: 0, test_report: 0, retrospective: 0 };
            for (const story of this.stories) {
                const names = (story.files || []).map(f => f.fileName || '');
                if (names.some(n => n.endsWith('-故事任务.md'))) counts.story_task++;
                if (names.some(n => n.endsWith('-使用场景.md'))) counts.scenario++;
                if (names.some(n => n.endsWith('-实施报告.md'))) counts.implementation++;
                if (names.some(n => n.endsWith('-测试报告.md'))) counts.test_report++;
                if (names.some(n => n.endsWith('-自改进复盘.md'))) counts.retrospective++;
            }
            return counts;
        },
        hasSelectedStory() {
            return !!this.selectedStory;
        },
        panelVisible() {
            return !!this.panelStory;
        },
        hasActiveFilters() {
            return !!(this.localSearchQuery || this.selectedProjectTag || this.selectedStatus || this.selectedType);
        },
        statusOptions() {
            return [
                { value: null, label: '全部状态' },
                { value: 'not_started', label: '未开始' },
                { value: 'docs_in_progress', label: '文档进行中' },
                { value: 'docs_done', label: '文档完成' },
                { value: 'code_in_progress', label: '编码进行中' },
                { value: 'code_done', label: '编码完成' },
                { value: 'self_improve', label: '自改进' },
            ];
        },
        typeOptions() {
            return [
                { value: null, label: '全部类型' },
                { value: 'frontend', label: '前端' },
                { value: 'backend', label: '后端' },
                { value: 'fullstack', label: '全栈' },
                { value: 'meta', label: '元数据' },
            ];
        },
        filteredStories() {
            const tag = this.selectedProjectTag;
            const q = (this.localSearchQuery || '').trim().toLowerCase();
            let result = this.stories;

            if (tag) {
                result = result.filter(s => (s.projectTags || []).includes(tag));
            }
            if (this.selectedStatus) {
                result = result.filter(s => s.status === this.selectedStatus);
            }
            if (this.selectedType) {
                result = result.filter(s => s.type === this.selectedType);
            }
            if (q) {
                result = result.filter(s =>
                    s.name.toLowerCase().includes(q) ||
                    s.status.toLowerCase().includes(q) ||
                    s.type.toLowerCase().includes(q) ||
                    (s.description || '').toLowerCase().includes(q) ||
                    (s.nextStep || '').toLowerCase().includes(q)
                );
            }

            return this.sortStories(result);
        },
        filteredStoriesByStatus() {
            const tag = this.selectedProjectTag;
            const q = (this.localSearchQuery || '').trim().toLowerCase();
            const groups = {
                not_started: [],
                docs_in_progress: [],
                docs_done: [],
                code_in_progress: [],
                code_done: [],
                self_improve: []
            };
            for (const story of this.stories) {
                if (!groups[story.status]) continue;
                if (tag && !(story.projectTags || []).includes(tag)) continue;
                if (this.selectedStatus && story.status !== this.selectedStatus) continue;
                if (this.selectedType && story.type !== this.selectedType) continue;
                if (q && !this._matchSearch(story, q)) continue;
                groups[story.status].push(story);
            }
            return groups;
        },
        viewModes() {
            return [
                { value: 'board', label: '看板', icon: 'columns' },
                { value: 'cards', label: '卡片', icon: 'grid' },
                { value: 'list', label: '列表', icon: 'list' },
            ];
        },
        kanbanColumns() {
            const order = ['not_started', 'docs_in_progress', 'docs_done', 'code_in_progress', 'code_done', 'self_improve'];
            const groups = this.filteredStoriesByStatus;
            return order.map(status => ({ status, stories: groups[status] || [] }));
        },
    },
    methods: {
        _matchSearch(story, q) {
            if (!q) return true;
            return story.name.toLowerCase().includes(q) ||
                story.status.toLowerCase().includes(q) ||
                story.type.toLowerCase().includes(q) ||
                (story.description || '').toLowerCase().includes(q) ||
                (story.nextStep || '').toLowerCase().includes(q);
        },
        sortStories(list) {
            const field = this.sortField;
            const dir = this.sortDirection;
            const sorted = [...list];
            sorted.sort((a, b) => {
                let va = a[field];
                let vb = b[field];
                if (field === 'lastModified' || field === 'createdAt') {
                    va = va || 0;
                    vb = vb || 0;
                }
                if (typeof va === 'string') va = va.toLowerCase();
                if (typeof vb === 'string') vb = vb.toLowerCase();
                if (va < vb) return dir === 'asc' ? -1 : 1;
                if (va > vb) return dir === 'asc' ? 1 : -1;
                return 0;
            });
            return sorted;
        },
        toggleSort(field) {
            if (this.sortField === field) {
                this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortField = field;
                this.sortDirection = 'desc';
            }
        },
        openDetail(story) {
            if (typeof story === 'string') {
                story = this.stories.find(s => s.name === story);
                if (!story) return;
            }
            this.panelStory = story;
            this.$emit('select-story', story.name);
        },
        closePanel() {
            this.panelStory = null;
        },
        setView(view) {
            this.viewMode = view;
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
                } else if (this.hasActiveFilters) {
                    this.clearAllFilters();
                }
            }
        },
        statusLabel(status) {
            const map = {
                not_started: '任务', docs_in_progress: '设计', docs_done: '实施',
                code_in_progress: '测试', self_improve: '改进', code_done: '报告'
            };
            return map[status] || status;
        },
        typeLabel(type) {
            const map = { backend: '后端', frontend: '前端', fullstack: '全栈', meta: '元数据' };
            return map[type] || type;
        },
        selectProjectTag(tag) {
            this.selectedProjectTag = this.selectedProjectTag === tag ? null : tag;
        },
        clearProjectTag() {
            this.selectedProjectTag = null;
        },
        selectStatus(status) {
            this.selectedStatus = this.selectedStatus === status ? null : status;
        },
        selectType(type) {
            this.selectedType = this.selectedType === type ? null : type;
        },
        clearAllFilters() {
            this.localSearchQuery = '';
            this.selectedProjectTag = null;
            this.selectedStatus = null;
            this.selectedType = null;
            this.sortField = 'lastModified';
            this.sortDirection = 'desc';
        },
        clearCache() {
            clearCacheAndRefresh();
        },
        formatDate(ts) {
            if (!ts) return '—';
            const d = new Date(ts);
            if (isNaN(d.getTime())) return '—';
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        },
    },
    mounted() {
        document.addEventListener('keydown', this.onKeydown);
    },
    beforeUnmount() {
        document.removeEventListener('keydown', this.onKeydown);
    }
});
