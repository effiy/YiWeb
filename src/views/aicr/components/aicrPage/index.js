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
            sessionSearchDebounceTimer: null
        };
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
                const hasSessionSearch = this.sessionSearchQuery && this.sessionSearchQuery.length > 0;
                if (hasSearch || hasTags || hasNoTags || hasSessionSearch) {
                    e.preventDefault();
                    if (typeof this.clearSearch === 'function') this.clearSearch();
                    if (typeof this.handleTagClear === 'function') this.handleTagClear();
                    if (typeof this.clearSessionSearch === 'function') this.clearSessionSearch();
                }
            }

            // ? 键切换快捷键帮助面板
            if (key === '?' && !this.isInputFocused()) {
                e.preventDefault();
                this.showKeyboardShortcuts = !this.showKeyboardShortcuts;
            }
        };

        window.addEventListener('keydown', this._onKeydown);
    },
    beforeUnmount() {
        if (this._onKeydown) {
            window.removeEventListener('keydown', this._onKeydown);
        }
        if (this.sessionSearchDebounceTimer) {
            clearTimeout(this.sessionSearchDebounceTimer);
            this.sessionSearchDebounceTimer = null;
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
        },
        clearAllAicrFilters() {
            this.clearSessionSearch();
            if (typeof this.clearSearch === 'function') this.clearSearch();
            if (typeof this.handleTagClear === 'function') this.handleTagClear();
        }
    }
});

