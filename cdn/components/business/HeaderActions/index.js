import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

function detectEnvironment() {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('local')) {
    return 'local';
  }
  try {
    const envFromStorage = localStorage.getItem('env');
    if (envFromStorage === 'local' || envFromStorage === 'prod') {
      return envFromStorage;
    }
  } catch (_) {}
  const params = new URLSearchParams(window.location.search);
  const envFromParam = params.get('env');
  if (envFromParam === 'local' || envFromParam === 'prod') {
    return envFromParam;
  }
  return 'prod';
}

registerGlobalComponent({
  name: 'HeaderActions',
  html: '/cdn/components/business/HeaderActions/template.html',
  css: '/cdn/components/business/HeaderActions/index.css',
  props: {
    showClearCache: { type: Boolean, default: true },
    showEnvBadge: { type: Boolean, default: true },
  },
  emits: ['clear-cache'],
  setup(props, { emit }) {
    const Vue = window.Vue;
    if (!Vue) {
      console.error('[HeaderActions] Vue not available on window');
      return {};
    }

    const envType = Vue.ref(detectEnvironment());
    const envLabel = Vue.computed(() => envType.value === 'local' ? 'LOCAL' : 'PROD');

    return { envType, envLabel };
  }
});
