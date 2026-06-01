import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'StoryPanelPage',
    html: '/src/views/story/components/storyPanelPage/template.html',
    css: '/src/views/story/components/storyPanelPage/index.css',
    props: {
        loading:               { type: Boolean, default: false },
        error:                 { type: String, default: null },
        stories:               { type: Array, default: () => [] },
        selectedStory:         { type: Object, default: null },
        allProjectTags:        { type: Array, default: () => [] },
        projectTags:           { type: Array, default: () => [] },
        statusCounts:          { type: Object, default: () => ({}) },
        totalStories:          { type: Number, default: 0 },
        storiesByStatus:       { type: Object, default: () => ({}) },
        filteredStories:       { type: Array, default: () => [] },
        hasActiveFilters:      { type: Boolean, default: false },
        documentCounts:        { type: Object, default: () => ({}) },
        groupedStories:        { type: Array, default: () => [] },
        projectTagCounts:      { type: Object, default: () => ({}) },
        untaggedCount:         { type: Number, default: 0 },
        tagColorMap:           { type: Object, default: () => ({}) },
        selectedProjectTags:   { type: Array, default: () => [] },
        filterSummaryPills:    { type: Array, default: () => [] },
        panelVisible:          { type: Boolean, default: false },
        viewModes:             { type: Array, default: () => [] },
        selectedSessionTags:   { type: Array, default: () => [] },
        selectedMissingTags:   { type: Array, default: () => [] },
        missingTags:           { type: Array, default: () => [] },
        storyTaskCount:        { type: Number, default: 0 },
        tagFilterNoTags:       { type: Boolean, default: false },
        localSearchQuery:      { type: String, default: '' },
        viewMode:              { type: String, default: 'cards' },
        panelStory:            { type: Object, default: null },
        sortField:             { type: String, default: 'lastModified' },
        sortDirection:         { type: String, default: 'desc' },
        storyDeps:             { type: Array, default: () => [] },
        saving:                { type: Boolean, default: false },
        filteredGraphData:     { type: Object, default: null },
        graphTitle:            { type: String, default: '知识图谱' },
    },
    emits: [
        'select-story', 'back',
        'toggle-session-tag', 'clear-session-tags', 'toggle-untagged',
        'toggle-missing-tag', 'clear-missing-tags',
        'set-search-query', 'clear-search-query', 'clear-all-filters',
        'set-view', 'toggle-sort', 'open-detail', 'close-panel',
        'handle-tags-scroll', 'clear-cache',
        'update-story', 'add-dep', 'remove-dep',
        'load-graph-data',
    ],
    data() {
        return {
            tagsScrollLeft: 0,
            tagsScrollAtEnd: true,
            filterBarCollapsed: false,
            _graphData: null,
            _graphTitle: '知识图谱',
            _graphLoading: false,
            _tagGraphData: null,
            _tagGraphTitle: '',
            _tagGraphLoading: false,
        };
    },
    watch: {
        selectedProjectTags: {
            handler(newTags) {
                if (this.viewMode === 'graph') {
                    if (newTags && newTags.length > 0) {
                        this.loadGraphForTags(newTags);
                    } else {
                        this._tagGraphData = null;
                        this._tagGraphTitle = '';
                    }
                }
            },
            deep: false,
        },
    },
    computed: {
        graphHeight() {
            return typeof window !== 'undefined' ? window.innerHeight - 200 : 600;
        },
        displayGraphData() {
            if (this.filteredGraphData) return this.filteredGraphData;
            if (this._tagGraphData) return this._tagGraphData;
            return this._graphData;
        },
        displayGraphTitle() {
            return this.graphTitle || this._tagGraphTitle || this._graphTitle;
        },
        // 根据选中的项目标签加载对应知识图谱
        tagFilteredGraphData() {
            // 有标签筛选 → 使用按标签加载的独立知识图谱数据
            if (this.selectedProjectTags && this.selectedProjectTags.length > 0 && this._tagGraphData) {
                return this._tagGraphData;
            }
            // 无标签筛选 → 使用全量聚合图谱
            return this.filteredGraphData || this._graphData;
        },
    },
    methods: {
        /* ---- event emitters ---- */

        onToggleSessionTag(tag) {
            this.$emit('toggle-session-tag', tag);
        },
        onClearProjectTags() {
            this.$emit('clear-session-tags');
        },
        onToggleUntagged() {
            this.$emit('toggle-untagged');
        },
        onToggleMissingTag(missingKey) {
            this.$emit('toggle-missing-tag', missingKey);
        },
        onClearMissingTags() {
            this.$emit('clear-missing-tags');
        },
        onToggleSort(field) {
            this.$emit('toggle-sort', field);
        },
        onOpenDetail(story) {
            if (typeof story === 'string') {
                story = (this.stories || []).find(s => s.name === story);
                if (!story) return;
            }
            this.$emit('open-detail', story);
        },
        onClosePanel() {
            this.$emit('close-panel');
        },
        onBackdropClick(e) {
            if (e.target === e.currentTarget) {
                this.onClosePanel();
            }
        },
        onToggleFilterBar() {
            this.filterBarCollapsed = !this.filterBarCollapsed;
        },
        onClearAllFilters() {
            this.$emit('clear-all-filters');
        },
        onClearCache() {
            this.$emit('clear-cache');
        },
        onUpdateStory(payload) {
            this.$emit('update-story', payload);
        },
        onAddDep(payload) {
            this.$emit('add-dep', payload);
        },
        onRemoveDep(payload) {
            this.$emit('remove-dep', payload);
        },
        onTagsScroll(event) {
            const el = event.target;
            this.tagsScrollLeft = el.scrollLeft;
            this.tagsScrollAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
        },

        /* ---- graph view ---- */

        onGraphNodeClick(node) {
            // 点击图谱节点 → 打开对应的故事详情
            if (node && node.file) {
                const story = (this.stories || []).find(s =>
                    s.directory && node.file.includes(s.directory)
                );
                if (story) {
                    this.onOpenDetail(story);
                }
            }
        },

        onSetView(mode) {
            this.$emit('set-view', mode);
            if (mode === 'graph') {
                if (!this._graphData) {
                    this.loadGraphData();
                }
                if (this.selectedProjectTags && this.selectedProjectTags.length > 0 && !this._tagGraphData) {
                    this.loadGraphForTags(this.selectedProjectTags);
                }
            }
        },

        async loadGraphData() {
            if (this._graphLoading) return;
            this._graphLoading = true;
            try {
                const resp = await fetch('/docs/故事任务面板/story-deps.json', { credentials: 'omit' });
                if (resp.ok) {
                    const data = await resp.json();
                    this._graphData = data.graph || { nodes: [], edges: [] };
                    this._graphTitle = (data.story && data.story.name) || '故事依赖关系图';
                } else {
                    this._graphData = { nodes: [], edges: [] };
                    this._graphTitle = '知识图谱（无数据）';
                }
            } catch (_) {
                this._graphData = { nodes: [], edges: [] };
                this._graphTitle = '知识图谱加载失败';
            } finally {
                this._graphLoading = false;
            }
        },

        async loadGraphForTags(tagNames) {
            if (this._tagGraphLoading) return;
            this._tagGraphLoading = true;
            try {
                const tagSet = new Set(tagNames);
                const dirs = [];
                for (const s of this.stories) {
                    if (tagSet.has(s.name) && s.directory) {
                        dirs.push(s.directory);
                    }
                }

                if (dirs.length === 0) {
                    this._tagGraphData = this._graphData;
                    this._tagGraphTitle = this._graphTitle;
                    return;
                }

                const allNodes = new Map();
                const allEdges = new Map();
                let firstName = '';

                for (const dir of dirs) {
                    try {
                        const url = `/docs/故事任务面板/${dir}/knowledge-graph.json`;
                        const resp = await fetch(url, { credentials: 'omit' });
                        if (!resp.ok) continue;
                        const data = await resp.json();
                        if (!firstName) firstName = (data.story && data.story.name) || dir;

                        for (const n of (data.graph?.nodes || [])) {
                            if (!allNodes.has(n.id)) allNodes.set(n.id, { ...n });
                        }
                        for (const e of (data.graph?.edges || [])) {
                            const key = `${e.source}|${e.target}|${e.relation}`;
                            if (!allEdges.has(key)) allEdges.set(key, { ...e });
                        }
                    } catch (_) {}
                }

                this._tagGraphData = {
                    nodes: Array.from(allNodes.values()),
                    edges: Array.from(allEdges.values()),
                };
                this._tagGraphTitle = dirs.length === 1 ? firstName : `已选项目 (${dirs.length})`;
            } catch (_) {
                this._tagGraphData = this._graphData;
            } finally {
                this._tagGraphLoading = false;
            }
        },
        onKeydown(e) {
            if (e.key === 'Escape') {
                if (this.panelVisible) {
                    this.onClosePanel();
                } else if (this.hasActiveFilters) {
                    this.onClearAllFilters();
                }
            }
        },
        onSearchInput(e) {
            this.$emit('set-search-query', e.target.value);
        },
        onClearSearch() {
            this.$emit('clear-search-query');
        },

        /* ---- formatters ---- */

        sortArrow(field) {
            if (this.sortField !== field) return '';
            return this.sortDirection === 'asc' ? ' ↑' : ' ↓';
        },
        statusLabel(status) {
            const map = { planning: '规划', design: '设计', develop: '开发', testing: '测试', operations: '运营' };
            return map[status] || status;
        },
        tagColorStyle(tag) {
            return (this.tagColorMap || {})[tag] || {};
        },
        formatDate(ts) {
            if (!ts) return '—';
            const d = new Date(ts);
            if (isNaN(d.getTime())) return '—';
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        },
        checkTagsOverflow() {
            const el = this.$el?.querySelector('.sp-header-tags-row');
            if (!el) return;
            this.tagsScrollAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
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
