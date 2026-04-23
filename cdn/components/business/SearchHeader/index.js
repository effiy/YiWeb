import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

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
    showNewsButton: {
      type: Boolean,
      default: true
    },
    newsHref: {
      type: String,
      default: 'https://effiy.cn/src/views/news/index.html'
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
    'open-rss-manager'
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

    // Detect environment
    const envType = Vue.ref(detectEnvironment());
    const envLabel = Vue.computed(() => {
      return envType.value === 'local' ? 'LOCAL' : 'PROD';
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

    const openNews = () => {
      if (props.newsHref) {
        if (/^https?:\/\//.test(props.newsHref)) {
          window.open(props.newsHref, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = props.newsHref;
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

    const handleInput = (event) => {
      emit('search-input', event);
    };

    const handleKeydown = (event) => {
      emit('search-keydown', event);
    };

    const clearSearch = () => {
      searchQuery.value = '';
      emit('clear');
      emit('clear-search');
      // Focus back on input
      if (searchInput.value) {
        searchInput.value.focus();
      }
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
      goHome,
      openNews,
      openAuth,
      toggleSidebar,
      handleInput,
      handleKeydown,
      clearSearch,
      handleCompositionStart,
      handleCompositionEnd
    };
  }
});
