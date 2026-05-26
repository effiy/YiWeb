import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';
import { clearCacheAndRefresh } from '/cdn/utils/core/clearCache.js';

registerGlobalComponent({
    name: 'AicrPage',
    html: '/src/views/aicr/components/aicrPage/index.html',
    setup() {
        const ctx = Vue.inject('viewContext') || {};
        return ctx;
    },
    data() {
        return {
            showKeyboardShortcuts: false,
            sessionSearchDebounceTimer: null,
            tagsScrollLeft: 0,
            tagsScrollAtEnd: true,
            filterBarCollapsed: true,
            tagsResizeObserver: null,
            tagsMutationObserver: null
        };
    },
    computed: {
        viewModes() {
            return [
                { value: 'tree', label: '树形', icon: 'list' },
                { value: 'cards', label: '卡片', icon: 'grid' }
            ];
        },
        filterSummaryText() {
            const parts = [];
            if (this.tagFilterNoTags) {
                const count = this.subTagCounts?.noTagsCount;
                parts.push(`没有故事${count != null ? ` (${count})` : ''}`);
            }
            if (this.selectedSessionTags && this.selectedSessionTags.length > 0) {
                for (const tag of this.selectedSessionTags) {
                    const count = this.subTagCounts?.counts?.[tag];
                    parts.push(`${tag}${count != null ? ` (${count})` : ''}`);
                }
            }
            if (parts.length > 0) {
                return parts.join(', ');
            }
            const all = [];
            if (this.subTagCounts?.noTagsCount > 0) {
                all.push(`没有故事(${this.subTagCounts.noTagsCount})`);
            }
            if (this.subTags) {
                for (const tag of this.subTags) {
                    const count = this.subTagCounts?.counts?.[tag];
                    all.push(`${tag}${count != null ? `(${count})` : ''}`);
                }
            }
            return all.length > 0 ? `全部故事 · ${all.join(', ')}` : '没有故事';
        },
    },
    mounted() {
        this._onKeydown = (e) => {
            if (!e) return;
            const key = String(e.key || '');

            // Escape: clear file tree search, tag filters, and session search (matching Claude/Story pattern)
            if (key === 'Escape' && !this.isInputFocused()) {
                const hasSearch = this.searchQuery && this.searchQuery.length > 0;
                const hasTags = this.selectedSessionTags && this.selectedSessionTags.length > 0;
                const hasNoTags = this.tagFilterNoTags;
                const hasStoryNoTags = this.storyLevelNoTags;
                const hasSessionSearch = this.sessionSearchQuery && this.sessionSearchQuery.length > 0;
                const hasTypeTags = this.selectedTypeTags && this.selectedTypeTags.length > 0;
                if (hasSearch || hasTags || hasNoTags || hasStoryNoTags || hasSessionSearch || hasTypeTags) {
                    e.preventDefault();
                    if (typeof this.clearSearch === 'function') this.clearSearch();
                    if (typeof this.handleTagClear === 'function') this.handleTagClear();
                    if (typeof this.clearSessionSearch === 'function') this.clearSessionSearch();
                    if (typeof this.handleStoryLevelNoTags === 'function') this.handleStoryLevelNoTags(false);
                    if (typeof this.handleTypeTagClear === 'function') this.handleTypeTagClear();
                }
            }

            // ? 键切换快捷键帮助面板
            if (key === '?' && !this.isInputFocused()) {
                e.preventDefault();
                this.showKeyboardShortcuts = !this.showKeyboardShortcuts;
            }
        };

        window.addEventListener('keydown', this._onKeydown);
        this.$nextTick(() => {
            this.checkTagsOverflow();
            this.setupTagsObservers();
        });
    },
    beforeUnmount() {
        if (this._onKeydown) {
            window.removeEventListener('keydown', this._onKeydown);
        }
        if (this.sessionSearchDebounceTimer) {
            clearTimeout(this.sessionSearchDebounceTimer);
            this.sessionSearchDebounceTimer = null;
        }
        if (this.tagsResizeObserver) {
            this.tagsResizeObserver.disconnect();
            this.tagsResizeObserver = null;
        }
        if (this.tagsMutationObserver) {
            this.tagsMutationObserver.disconnect();
            this.tagsMutationObserver = null;
        }
    },
    methods: {
        isInputFocused() {
            const activeEl = document.activeElement;
            if (!activeEl) return false;
            const tagName = activeEl.tagName.toLowerCase();
            return tagName === 'input' || tagName === 'textarea' || activeEl.isContentEditable;
        },
        clearCacheAndRefresh,
        handleSessionSearchInput(event) {
            const value = event.target.value;
            if (this.sessionSearchDebounceTimer) {
                clearTimeout(this.sessionSearchDebounceTimer);
            }
            this.sessionSearchDebounceTimer = setTimeout(() => {
                if (typeof this.handleSessionSearchChange === 'function') {
                    this.handleSessionSearchChange(value);
                }
                if (typeof this.handleSearchChange === 'function') {
                    this.handleSearchChange(value);
                }
            }, 300);
        },
        handleSessionSearchKeydown(event) {
            if (event.key === 'Escape') {
                event.target.value = '';
                this.clearSessionSearch();
            }
        },
        clearSessionSearch() {
            if (this.sessionSearchDebounceTimer) {
                clearTimeout(this.sessionSearchDebounceTimer);
                this.sessionSearchDebounceTimer = null;
            }
            if (typeof this.handleSessionSearchChange === 'function') {
                this.handleSessionSearchChange('');
            }
            if (typeof this.clearSearch === 'function') {
                this.clearSearch();
            }
        },
        toggleAicrTag(tag) {
            const currentTags = this.selectedSessionTags || [];
            const newTags = [...currentTags];
            const index = newTags.indexOf(tag);
            if (index > -1) {
                newTags.splice(index, 1);
            } else {
                newTags.push(tag);
            }
            if (typeof this.handleTagSelect === 'function') {
                this.handleTagSelect(newTags);
            }
        },
        toggleTypeTag(type) {
            if (typeof this.handleTypeTagToggle === 'function') {
                this.handleTypeTagToggle(type);
            }
        },
        handleFilterToggle() {
            this.filterBarCollapsed = !this.filterBarCollapsed;
        },
        toggleFilterBar() {
            this.filterBarCollapsed = !this.filterBarCollapsed;
        },
        clearAllAicrFilters() {
            this.clearSessionSearch();
            if (typeof this.clearSearch === 'function') this.clearSearch();
            if (typeof this.handleTagClear === 'function') this.handleTagClear();
            if (typeof this.handleStoryLevelNoTags === 'function') this.handleStoryLevelNoTags(false);
            if (typeof this.handleTypeTagClear === 'function') this.handleTypeTagClear();
        },
        clearAllTags() {
            if (typeof this.handleTagClear === 'function') this.handleTagClear();
            if (typeof this.handleTagFilterNoTags === 'function') this.handleTagFilterNoTags(false);
            if (typeof this.handleStoryLevelNoTags === 'function') this.handleStoryLevelNoTags(false);
        },
        clearTypeTags() {
            if (typeof this.handleTypeTagClear === 'function') {
                this.handleTypeTagClear();
            }
        },
        toggleTagFilterNoTags() {
            if (typeof this.handleTagFilterNoTags === 'function') {
                this.handleTagFilterNoTags(!this.tagFilterNoTags);
            }
        },
        toggleStoryLevelNoTags() {
            if (typeof this.handleStoryLevelNoTags === 'function') {
                this.handleStoryLevelNoTags(!this.storyLevelNoTags);
            }
        },
        handleTagsScroll(event) {
            const el = event.target;
            this.tagsScrollLeft = el.scrollLeft;
            this.tagsScrollAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
        },
        checkTagsOverflow() {
            const el = this.$el?.querySelector('.aicr-header-tags-row');
            if (!el) return;
            this.tagsScrollAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
        },
        setupTagsObservers() {
            const el = this.$el?.querySelector('.aicr-header-tags-row');
            if (!el) return;

            if (this.tagsResizeObserver) this.tagsResizeObserver.disconnect();
            this.tagsResizeObserver = new ResizeObserver(() => {
                this.checkTagsOverflow();
            });
            this.tagsResizeObserver.observe(el);

            if (this.tagsMutationObserver) this.tagsMutationObserver.disconnect();
            this.tagsMutationObserver = new MutationObserver(() => {
                this.checkTagsOverflow();
            });
            this.tagsMutationObserver.observe(el, { childList: true, subtree: true });
        }
    }
});

