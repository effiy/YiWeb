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
            selectedProjectTags: [],
            selectedStoryTags: [],
            selectedDocFilter: null,
            selectedMissingFilter: null,
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
            for (const story of this.filteredStories) {
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
            return !!(this.localSearchQuery || this.selectedProjectTags.length > 0 || this.selectedStoryTags.length > 0 || this.selectedDocFilter || this.selectedMissingFilter);
        },
        storyOptions() {
            const base = this._applyFilters(this.stories, 'storyTag');
            const result = [];
            for (const s of base) {
                result.push({ value: s.name, label: s.name, count: s.fileCount });
            }
            result.sort((a, b) => a.label.localeCompare(b.label));
            return result;
        },
        filteredStories() {
            return this.sortStories(this._applyFilters(this.stories));
        },
        groupedStories() {
            const groups = new Map();
            for (const story of this.filteredStories) {
                const tags = (story.projectTags && story.projectTags.length > 0) ? story.projectTags : ['__uncategorized__'];
                for (const tag of tags) {
                    if (!groups.has(tag)) {
                        groups.set(tag, []);
                    }
                    groups.get(tag).push(story);
                }
            }
            const result = [];
            for (const [tag, stories] of groups) {
                result.push({
                    tag: tag === '__uncategorized__' ? null : tag,
                    label: tag === '__uncategorized__' ? '未分类' : tag,
                    stories
                });
            }
            result.sort((a, b) => {
                if (a.tag === null) return 1;
                if (b.tag === null) return -1;
                return a.tag.localeCompare(b.tag);
            });
            return result;
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
            const stageSuffixes = [
                { key: 'operations', suffix: '-自改进复盘.md' },
                { key: 'testing',    suffix: '-测试报告.md' },
                { key: 'develop',    suffix: '-实施报告.md' },
                { key: 'design',     suffix: '-使用场景.md' },
                { key: 'planning',   suffix: '-故事任务.md' },
            ];
            for (const story of filtered) {
                const names = (story.files || []).map(f => f.fileName || '');
                let placed = false;
                for (const { key, suffix } of stageSuffixes) {
                    if (names.some(n => n.endsWith(suffix))) {
                        groups[key].push(story);
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    groups.planning.push(story);
                }
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
        projectTagCounts() {
            const counts = {};
            for (const story of this.stories) {
                for (const tag of (story.projectTags || [])) {
                    counts[tag] = (counts[tag] || 0) + 1;
                }
            }
            return counts;
        },
        tagColorMap() {
            const map = {};
            for (const tag of this.allProjectTags) {
                let hash = 0;
                for (let i = 0; i < tag.length; i++) {
                    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
                }
                const hue = Math.abs(hash) % 360;
                map[tag] = {
                    '--sc-accent': `hsl(${hue}, 55%, 50%)`,
                    '--sc-accent-bg': `hsla(${hue}, 55%, 50%, 0.12)`,
                };
            }
            return map;
        },
        missingCounts() {
            const base = this._applyFilters(this.stories, 'missingFilter');
            const counts = { design: 0, develop: 0, testing: 0, operations: 0 };
            for (const story of base) {
                const names = (story.files || []).map(f => f.fileName || '');
                if (!names.some(n => n.endsWith('-使用场景.md'))) counts.design++;
                if (!names.some(n => n.endsWith('-实施报告.md'))) counts.develop++;
                if (!names.some(n => n.endsWith('-测试报告.md'))) counts.testing++;
                if (!names.some(n => n.endsWith('-自改进复盘.md'))) counts.operations++;
            }
            return counts;
        },
        filterSummaryPills() {
            const pills = [];
            for (const tag of this.selectedProjectTags) {
                pills.push({ type: 'tag', label: tag, clear: () => this.toggleProjectTag(tag) });
            }
            for (const tag of this.selectedStoryTags) {
                pills.push({ type: 'story', label: tag, clear: () => this.toggleStoryTag(tag) });
            }
            if (this.selectedDocFilter) {
                const docLabels = { story_task: '规划', scenario: '设计', implementation: '开发', test_report: '测试', retrospective: '运营' };
                pills.push({ type: 'doc', label: docLabels[this.selectedDocFilter] || this.selectedDocFilter, clear: () => this.selectDocFilter(this.selectedDocFilter) });
            }
            if (this.selectedMissingFilter) {
                const missingLabels = { design: '缺设计', develop: '缺开发', testing: '缺测试', operations: '缺运营' };
                pills.push({ type: 'missing', label: missingLabels[this.selectedMissingFilter] || this.selectedMissingFilter, clear: () => this.selectMissingFilter(this.selectedMissingFilter) });
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
            if (exclude !== 'projectTag' && this.selectedProjectTags.length > 0) {
                result = result.filter(s => (s.projectTags || []).some(t => this.selectedProjectTags.includes(t)));
            }
            if (exclude !== 'storyTag' && this.selectedStoryTags.length > 0) {
                result = result.filter(s => this.selectedStoryTags.includes(s.name));
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
            if (exclude !== 'missingFilter' && this.selectedMissingFilter) {
                const missingSuffixes = {
                    design: '-使用场景.md',
                    develop: '-实施报告.md',
                    testing: '-测试报告.md',
                    operations: '-自改进复盘.md',
                };
                const suffix = missingSuffixes[this.selectedMissingFilter];
                if (suffix) {
                    result = result.filter(s =>
                        !(s.files || []).some(f => (f.fileName || '').endsWith(suffix))
                    );
                }
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
        toggleProjectTag(tag) {
            const idx = this.selectedProjectTags.indexOf(tag);
            if (idx >= 0) {
                this.selectedProjectTags.splice(idx, 1);
            } else {
                this.selectedProjectTags.push(tag);
            }
        },
        clearProjectTags() {
            this.selectedProjectTags = [];
        },
        toggleStoryTag(tag) {
            const idx = this.selectedStoryTags.indexOf(tag);
            if (idx >= 0) {
                this.selectedStoryTags.splice(idx, 1);
            } else {
                this.selectedStoryTags.push(tag);
                const story = this.stories.find(s => s.name === tag);
                if (story && story.projectTags) {
                    for (const pt of story.projectTags) {
                        if (!this.selectedProjectTags.includes(pt)) {
                            this.selectedProjectTags.push(pt);
                        }
                    }
                }
            }
        },
        clearStoryTags() {
            this.selectedStoryTags = [];
        },
        selectDocFilter(docType) {
            this.selectedDocFilter = this.selectedDocFilter === docType ? null : docType;
        },
        selectMissingFilter(filter) {
            this.selectedMissingFilter = this.selectedMissingFilter === filter ? null : filter;
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
            this.selectedProjectTags = [];
            this.selectedStoryTags = [];
            this.selectedDocFilter = null;
            this.selectedMissingFilter = null;
            this.sortField = 'lastModified';
            this.sortDirection = 'desc';
        },
        clearCache() {
            clearCacheAndRefresh();
        },
        tagColorStyle(tag) {
            return this.tagColorMap[tag] || {};
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
