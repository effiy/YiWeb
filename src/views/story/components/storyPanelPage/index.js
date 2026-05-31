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
        };
    },
    computed: {
        graphHeight() {
            return typeof window !== 'undefined' ? window.innerHeight - 200 : 600;
        },
        displayGraphData() {
            // Use prop if provided, otherwise use internal _graphData
            if (this.filteredGraphData) return this.filteredGraphData;
            return this._graphData;
        },
        displayGraphTitle() {
            return this.graphTitle || this._graphTitle;
        },
        // 根据选中的项目标签过滤图谱节点
        tagFilteredGraphData() {
            const raw = this.filteredGraphData || this._graphData;
            if (!raw || !raw.nodes) return raw;
            // 没有标签筛选 → 显示全部
            if (!this.selectedProjectTags || this.selectedProjectTags.length === 0) return raw;
            // 有标签筛选 → 只显示标签匹配的故事目录下的节点
            const selectedSet = new Set(this.selectedProjectTags);
            const filteredNodes = raw.nodes.filter(n => {
                // 节点关联的故事目录标签与筛选标签匹配
                const mdFiles = n.mdFiles || [];
                return mdFiles.some(mf => {
                    const file = mf.file || '';
                    // 通过 file 路径推断所属故事目录
                    return this.stories.some(s =>
                        selectedSet.has(s.name) && s.directory && file.includes(s.directory)
                    );
                });
            });
            if (filteredNodes.length === 0) return raw; // 无匹配时显示全部
            const filteredIds = new Set(filteredNodes.map(n => n.id));
            const filteredEdges = (raw.edges || []).filter(e =>
                filteredIds.has(e.source) && filteredIds.has(e.target)
            );
            return { nodes: filteredNodes, edges: filteredEdges };
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
            if (mode === 'graph' && !this._graphData) {
                this.loadGraphData();
            }
        },

        async loadGraphData() {
            if (this._graphLoading) return;
            this._graphLoading = true;
            try {
                // 加载全局故事依赖图
                const resp = await fetch('/docs/故事任务面板/story-deps.json', { credentials: 'omit' });
                if (resp.ok) {
                    const data = await resp.json();
                    this._graphData = data.graph || { nodes: [], edges: [] };
                    this._graphTitle = (data.story && data.story.name) || '故事依赖关系图';
                } else {
                    // 回退：尝试合并所有故事目录的知识图谱
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
