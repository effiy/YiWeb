import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';
import { SearchHandler } from '/cdn/utils/browser/events.js';

/**
 * Detect current environment
 * @returns {'local' | 'prod'} Environment type
 */
function detectEnvironment() {
  // Check URL first
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('local')) {
    return 'local';
  }

  // Check env from config or localStorage
  try {
    const envFromStorage = localStorage.getItem('env');
    if (envFromStorage === 'local' || envFromStorage === 'prod') {
      return envFromStorage;
    }
  } catch (_) {}

  // Check URL params
  const params = new URLSearchParams(window.location.search);
  const envFromParam = params.get('env');
  if (envFromParam === 'local' || envFromParam === 'prod') {
    return envFromParam;
  }

  // Default to prod
  return 'prod';
}

registerGlobalComponent({
  name: 'SearchHeader',
  html: '/cdn/components/business/SearchHeader/template.html',
  css: '/cdn/components/business/SearchHeader/index.css',
  props: {
    homeHref: {
      type: String,
      default: '/index.html'
    },
    homeIconClass: {
      type: String,
      default: 'fas fa-globe'
    },
    homeButtonTitle: {
      type: String,
      default: '首页'
    },
    placeholder: {
      type: String,
      default: '搜索网站、标签或描述...'
    },
    showAuthButton: {
      type: Boolean,
      default: true
    },
    showSidebarToggle: {
      type: Boolean,
      default: false
    },
    sidebarCollapsed: {
      type: Boolean,
      default: false
    },
    modelValue: {
      type: String,
      default: ''
    },
    showAicrButton: {
      type: Boolean,
      default: false
    },
    aicrHref: {
      type: String,
      default: ''
    },
    aicrButtonTitle: {
      type: String,
      default: '代码审查'
    },
    showRssManagerButton: {
      type: Boolean,
      default: false
    },
    showSyncButton: {
      type: Boolean,
      default: false
    },
    showClearCacheButton: {
      type: Boolean,
      default: false
    },
    showSearch: {
      type: Boolean,
      default: true
    },
    sidebarToggleEnabled: {
      type: Boolean,
      default: false
    },
    originalData: {
      type: Array,
      default: () => []
    }
  },
  emits: [
    'update:modelValue',
    'search',
    'clear',
    'toggle-sidebar',
    'open-auth',
    'search-input',
    'search-keydown',
    'composition-start',
    'composition-end',
    'clear-search',
    'open-rss-manager',
    'clear-cache'
  ],
  setup(props, { emit }) {
    const Vue = window.Vue;
    if (!Vue) {
      console.error('[SearchHeader] Vue not available on window');
      return {};
    }

    const searchQuery = Vue.ref(props.modelValue || '');
    const isComposing = Vue.ref(false);
    const searchInput = Vue.ref(null);
    const isPanelVisible = Vue.ref(false);
    const activeIndex = Vue.ref(-1);
    const searchHandler = Vue.ref(null);

    // Detect environment
    const envType = Vue.ref(detectEnvironment());
    const envLabel = Vue.computed(() => {
      return envType.value === 'local' ? 'LOCAL' : 'PROD';
    });

    // Filtered history based on current input
    const filteredHistory = Vue.computed(() => {
      if (!searchHandler.value) return [];
      return searchHandler.value.filterHistory(searchQuery.value.trim());
    });

    // Items to display in panel
    const displayItems = Vue.computed(() => {
      return filteredHistory.value;
    });

    // Watch for modelValue changes from parent
    Vue.watch(() => props.modelValue, (newVal) => {
      if (searchQuery.value !== newVal) {
        searchQuery.value = newVal || '';
      }
    });

    // Watch searchQuery and emit updates
    Vue.watch(searchQuery, (newVal) => {
      emit('update:modelValue', newVal);
    });

    // Initialize SearchHandler (data layer only; Vue handles events)
    Vue.onMounted(() => {
      if (!searchInput.value) return;
      const handler = new SearchHandler();
      handler.searchInput = searchInput.value;
      handler.searchCallback = (query) => emit('search', query);
      handler.options = { debounceDelay: 300, minLength: 1 };
      handler.loadSearchHistory();
      searchHandler.value = handler;
    });

    Vue.onUnmounted(() => {
      if (searchHandler.value) {
        searchHandler.value.onShowPanel = null;
        searchHandler.value.onHidePanel = null;
        searchHandler.value.onActiveIndexChange = null;
        searchHandler.value = null;
      }
    });

    // Methods
    const goHome = () => {
      if (props.homeHref) {
        if (/^https?:\/\//.test(props.homeHref)) {
          window.open(props.homeHref, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = props.homeHref;
        }
      }
    };


    const openAuth = () => {
      emit('open-auth');
      // Try to call global openAuth for backward compatibility
      if (typeof window.openAuth === 'function') {
        window.openAuth();
      }
    };

    const toggleSidebar = () => {
      emit('toggle-sidebar');
    };

    const clearCache = () => {
      emit('clear-cache');
    };

    const handleInput = (event) => {
      emit('search-input', event);
      if (searchHandler.value && searchHandler.value.searchHistory.length) {
        isPanelVisible.value = true;
        activeIndex.value = -1;
      }
    };

    const handleFocus = (event) => {
      if (searchHandler.value && searchHandler.value.searchHistory.length) {
        isPanelVisible.value = true;
        activeIndex.value = -1;
      }
    };

    const handleBlur = (event) => {
      activeIndex.value = -1;
      setTimeout(() => {
        isPanelVisible.value = false;
      }, 200);
    };

    const handleKeydown = (event) => {
      emit('search-keydown', event);
      if (!searchHandler.value) return;

      if (isPanelVisible.value && displayItems.value.length) {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault();
          const direction = event.key === 'ArrowUp' ? -1 : 1;
          const count = displayItems.value.length;
          activeIndex.value = ((activeIndex.value + direction) % count + count) % count;
          return;
        }
        if (event.key === 'Enter' && activeIndex.value >= 0 && !isComposing.value) {
          event.preventDefault();
          selectItem(displayItems.value[activeIndex.value]);
          return;
        }
      }

      if (event.key === 'Enter' && !isComposing.value) {
        const query = searchQuery.value.trim();
        if (query) {
          searchHandler.value.addToHistory(query);
          isPanelVisible.value = false;
          activeIndex.value = -1;
          emit('search', query);
        }
      }
    };

    const clearSearch = () => {
      searchQuery.value = '';
      isPanelVisible.value = false;
      activeIndex.value = -1;
      emit('clear');
      emit('clear-search');
      if (searchInput.value) {
        searchInput.value.focus();
      }
    };

    const selectItem = (item) => {
      searchQuery.value = item;
      isPanelVisible.value = false;
      activeIndex.value = -1;
      emit('search', item);
      if (searchInput.value) {
        searchInput.value.focus();
      }
    };

    const deleteItem = (item) => {
      if (!searchHandler.value) return;
      searchHandler.value.removeHistoryItem(item);
      if (activeIndex.value >= displayItems.value.length) {
        activeIndex.value = displayItems.value.length - 1;
      }
      if (!displayItems.value.length) {
        isPanelVisible.value = false;
      }
    };

    const clearAllHistory = () => {
      if (!searchHandler.value) return;
      searchHandler.value.clearHistory();
      isPanelVisible.value = false;
      activeIndex.value = -1;
    };

    const escapeHtml = (str) => {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };

    const highlightMatch = (text) => {
      const query = searchQuery.value.trim();
      const safeText = escapeHtml(text);
      if (!query) return safeText;
      const regex = new RegExp('(' + escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      return safeText.replace(regex, '<mark>$1</mark>');
    };

    const handleCompositionStart = (event) => {
      isComposing.value = true;
      emit('composition-start', event);
    };

    const handleCompositionEnd = (event) => {
      isComposing.value = false;
      emit('composition-end', event);
    };

    return {
      searchQuery,
      searchInput,
      envType,
      envLabel,
      isPanelVisible,
      activeIndex,
      filteredHistory,
      displayItems,
      goHome,
      openAuth,
      toggleSidebar,
      clearCache,
      handleInput,
      handleFocus,
      handleBlur,
      handleKeydown,
      clearSearch,
      selectItem,
      deleteItem,
      clearAllHistory,
      highlightMatch,
      handleCompositionStart,
      handleCompositionEnd
    };
  }
});
