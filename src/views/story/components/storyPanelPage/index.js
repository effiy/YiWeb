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
            selectedHealth: null,
            selectedDocFilter: null,
            selectedNotify: null,
            selectedLog: null,
            sortField: 'lastModified',
            sortDirection: 'desc',
            filterBarCollapsed: true,
            tagsScrollLeft: 0,
            tagsScrollAtEnd: true,
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
            return !!(this.localSearchQuery || this.selectedProjectTag || this.selectedHealth || this.selectedDocFilter || this.selectedNotify !== null || this.selectedLog !== null);
        },
        healthOptions() {
            const base = this._applyFilters(this.stories, 'health');
            const counts = { complete: 0, healthy: 0, moderate: 0, starter: 0 };
            for (const s of base) {
                const level = this.getHealthLevel(s);
                if (counts[level] !== undefined) counts[level]++;
            }
            return [
                { value: 'complete', label: '完整', count: counts.complete },
                { value: 'healthy', label: '良好', count: counts.healthy },
                { value: 'moderate', label: '一般', count: counts.moderate },
                { value: 'starter', label: '起步', count: counts.starter },
            ];
        },
        notifyOptions() {
            const base = this._applyFilters(this.stories, 'notify');
            const counts = { true: 0, false: 0 };
            for (const s of base) {
                if (s.hasNotify) counts.true++;
                else counts.false++;
            }
            return [
                { value: true, label: '已配置', count: counts.true },
                { value: false, label: '未配置', count: counts.false },
            ];
        },
        logOptions() {
            const base = this._applyFilters(this.stories, 'log');
            const counts = { true: 0, false: 0 };
            for (const s of base) {
                if (s.hasLog) counts.true++;
                else counts.false++;
            }
            return [
                { value: true, label: '有日志', count: counts.true },
                { value: false, label: '无日志', count: counts.false },
            ];
        },
        filteredStories() {
            return this.sortStories(this._applyFilters(this.stories));
        },
        filteredStoriesByStatus() {
            const filtered = this._applyFilters(this.stories);
            const groups = {
                planning: [],
                design: [],
                develop: [],
                testing: [],
                operations: []
            };
            for (const story of filtered) {
                if (groups[story.status]) groups[story.status].push(story);
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
            const order = ['planning', 'design', 'develop', 'testing', 'operations'];
            const groups = this.filteredStoriesByStatus;
            return order.map(status => ({ status, stories: groups[status] || [] }));
        },
        filterSummaryPills() {
            const pills = [];
            if (this.selectedProjectTag) {
                pills.push({ type: 'tag', label: this.selectedProjectTag, clear: () => this.clearProjectTag() });
            }
            if (this.selectedHealth) {
                const opt = this.healthOptions.find(o => o.value === this.selectedHealth);
                pills.push({ type: 'health', label: opt ? opt.label : this.selectedHealth, clear: () => this.selectHealth(this.selectedHealth) });
            }
            if (this.selectedDocFilter) {
                const docLabels = { story_task: '规划', scenario: '设计', implementation: '开发', test_report: '测试', retrospective: '运营' };
                pills.push({ type: 'doc', label: docLabels[this.selectedDocFilter] || this.selectedDocFilter, clear: () => this.selectDocFilter(this.selectedDocFilter) });
            }
            if (this.selectedNotify !== null) {
                const label = this.selectedNotify ? '已配置通知' : '未配置通知';
                pills.push({ type: 'notify', label, clear: () => this.selectNotify(this.selectedNotify) });
            }
            if (this.selectedLog !== null) {
                const label = this.selectedLog ? '有交互日志' : '无交互日志';
                pills.push({ type: 'log', label, clear: () => this.selectLog(this.selectedLog) });
            }
            return pills;
        },
    },
    methods: {
        _matchSearch(story, q) {
            if (!q) return true;
            return story.name.toLowerCase().includes(q) ||
                (story.description || '').toLowerCase().includes(q) ||
                (story.nextStep || '').toLowerCase().includes(q);
        },
        _applyFilters(stories, exclude) {
            let result = stories;
            if (exclude !== 'projectTag' && this.selectedProjectTag) {
                result = result.filter(s => (s.projectTags || []).includes(this.selectedProjectTag));
            }
            if (exclude !== 'health' && this.selectedHealth) {
                result = result.filter(s => this.getHealthLevel(s) === this.selectedHealth);
            }
            if (exclude !== 'docFilter' && this.selectedDocFilter) {
                const docSuffixes = {
                    story_task: '-故事任务.md',
                    scenario: '-使用场景.md',
                    implementation: '-实施报告.md',
                    test_report: '-测试报告.md',
                    retrospective: '-自改进复盘.md',
                };
                const suffix = docSuffixes[this.selectedDocFilter];
                if (suffix) {
                    result = result.filter(s =>
                        (s.files || []).some(f => (f.fileName || '').endsWith(suffix))
                    );
                }
            }
            if (exclude !== 'notify' && this.selectedNotify !== null) {
                result = result.filter(s => !!s.hasNotify === this.selectedNotify);
            }
            if (exclude !== 'log' && this.selectedLog !== null) {
                result = result.filter(s => !!s.hasLog === this.selectedLog);
            }
            if (exclude !== 'search' && this.localSearchQuery) {
                const q = this.localSearchQuery.trim().toLowerCase();
                if (q) result = result.filter(s => this._matchSearch(s, q));
            }
            return result;
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
                planning: '规划', design: '设计', develop: '开发',
                testing: '测试', operations: '运营'
            };
            return map[status] || status;
        },
        selectProjectTag(tag) {
            this.selectedProjectTag = this.selectedProjectTag === tag ? null : tag;
        },
        clearProjectTag() {
            this.selectedProjectTag = null;
        },
        getHealthLevel(story) {
            const score = story.healthScore || 0;
            if (score >= 5) return 'complete';
            if (score >= 4) return 'healthy';
            if (score >= 3) return 'moderate';
            return 'starter';
        },
        selectHealth(level) {
            this.selectedHealth = this.selectedHealth === level ? null : level;
        },
        selectNotify(val) {
            this.selectedNotify = this.selectedNotify === val ? null : val;
        },
        selectLog(val) {
            this.selectedLog = this.selectedLog === val ? null : val;
        },
        selectDocFilter(docType) {
            this.selectedDocFilter = this.selectedDocFilter === docType ? null : docType;
        },
        toggleFilterBar() {
            this.filterBarCollapsed = !this.filterBarCollapsed;
        },
        handleTagsScroll(event) {
            const el = event.target;
            this.tagsScrollLeft = el.scrollLeft;
            this.tagsScrollAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
        },
        checkTagsOverflow() {
            const el = this.$el?.querySelector('.sp-header-tags-row');
            if (!el) return;
            this.tagsScrollAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
        },
        clearAllFilters() {
            this.localSearchQuery = '';
            this.selectedProjectTag = null;
            this.selectedHealth = null;
            this.selectedDocFilter = null;
            this.selectedNotify = null;
            this.selectedLog = null;
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
        this.$nextTick(() => {
            this.checkTagsOverflow();
        });
    },
    beforeUnmount() {
        document.removeEventListener('keydown', this.onKeydown);
    }
});
