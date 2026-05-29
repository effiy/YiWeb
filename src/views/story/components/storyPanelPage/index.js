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
    },
    emits: [
        'select-story', 'back',
        'toggle-session-tag', 'clear-session-tags', 'toggle-untagged',
        'toggle-missing-tag', 'clear-missing-tags',
        'set-search-query', 'clear-search-query', 'clear-all-filters',
        'set-view', 'toggle-sort', 'open-detail', 'close-panel',
        'handle-tags-scroll', 'clear-cache',
    ],
    data() {
        return {
            tagsScrollLeft: 0,
            tagsScrollAtEnd: true,
            filterBarCollapsed: false,
        };
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
        onSetView(mode) {
            this.$emit('set-view', mode);
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
        onTagsScroll(event) {
            const el = event.target;
            this.tagsScrollLeft = el.scrollLeft;
            this.tagsScrollAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
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
