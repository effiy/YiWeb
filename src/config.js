/**
 * YiWeb Configuration
 *
 * Supports environment switching (local/prod) via URL params or localStorage.
 * Exports an ESM config object while maintaining backward compatibility with window globals.
 */

// --- Environment Detection ---
const getParams = () => new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const getStorage = (key) => typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
const isLocalHost = (h) => h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local');

const params = getParams();
const envParam = params.get('env');
const envStored = getStorage('env');

let ENV = envParam || envStored || ((typeof location !== 'undefined' && isLocalHost(location.hostname)) ? 'local' : 'prod');

ENV = 'local'

// --- Configuration Definitions ---
const ENDPOINTS = {
  local: {
    DATA_URL: 'http://localhost:9000',
    API_URL: 'http://localhost:8000'
  },
  prod: {
    DATA_URL: 'https://data.effiy.cn',
    API_URL: 'https://api.effiy.cn'
  }
};

const normalize = (url) => String(url || '').replace(/\/+$/,'');
const currentEndpoints = ENDPOINTS[ENV] || ENDPOINTS.prod;

const debug = (() => {
  const dq = params.get('debug');
  if (dq != null) return dq === 'true';
  const stored = getStorage('debug');
  if (stored != null) return stored === 'true';
  return typeof location !== 'undefined' ? isLocalHost(location.hostname) : false;
})();

// --- Config Object ---
export const config = {
  env: ENV,
  isLocal: ENV === 'local',
  isProd: ENV === 'prod',
  debug: debug,
  dataUrl: normalize(currentEndpoints.DATA_URL),
  apiUrl: normalize(currentEndpoints.API_URL),

  /**
   * Switch environment
   * @param {string} name - 'local' or 'prod'
   */
  setEnv(name) {
    if (!ENDPOINTS[name]) return false;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('env', name);
      // Reload to apply changes cleanly since ESM exports are static
      if (typeof location !== 'undefined') location.reload();
    }
    return true;
  }
};

// --- Helpers ---
export const buildApiUrl = (path) => {
  const p = String(path || '');
  if (p.startsWith('http')) return p;
  const base = config.apiUrl;
  if (!p) return base;
  return base + (p.startsWith('/') ? '' : '/') + p.replace(/^\/+/, '');
};

export const buildDataUrl = (path) => {
  const p = String(path || '');
  const base = config.dataUrl;
  if (!p) return base;
  return base + (p.startsWith('/') ? '' : '/') + p.replace(/^\/+/, '');
};

// --- Backward Compatibility (Global Injection) ---
if (typeof window !== 'undefined') {
  window.DATA_URL = config.dataUrl;
  window.API_URL = config.apiUrl;
  window.__ENV__ = {
    name: config.env,
    isLocal: config.isLocal,
    isProd: config.isProd,
    DEBUG: config.debug,
    DATA_URL: config.dataUrl,
    API_URL: config.apiUrl
  };

  window.setEnv = config.setEnv;
  window.getEnv = () => config.env;
  window.buildApiUrl = buildApiUrl;
  window.buildDataUrl = buildDataUrl;

  if (config.debug) {
    console.info('[YiWeb Config] Loaded:', window.__ENV__);
  }
}

export default config;
