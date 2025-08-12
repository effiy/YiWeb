/**
 * 轻量日志工具（可按环境开关）
 * author: liangliang
 */

// 获取调试开关：优先 Query -> localStorage -> 环境自动判断
function detectDebug() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('debug')) {
      return params.get('debug') === 'true';
    }
    const stored = localStorage.getItem('debug');
    if (stored != null) return stored === 'true';
    const host = location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
    return isLocal; // 本地默认开启
  } catch (_) {
    return false;
  }
}

const getEnv = () => (typeof window !== 'undefined' && window.__ENV__) || {
  name: 'unknown',
  isLocal: false,
  isProd: false,
  DEBUG: detectDebug(),
};

function shouldDebug() {
  const env = getEnv();
  return !!env.DEBUG;
}

export function logDebug(...args) {
  if (shouldDebug()) console.debug('[DEBUG]', ...args);
}

export function logInfo(...args) {
  if (shouldDebug()) console.info('[INFO ]', ...args);
}

export function logWarn(...args) {
  if (shouldDebug()) console.warn('[WARN ]', ...args);
}

export function logError(...args) {
  // 错误始终打印
  console.error('[ERROR]', ...args);
}

// 简易计时工具
const timers = new Map();
export function timeStart(label) {
  if (!shouldDebug()) return;
  timers.set(label, performance.now());
}
export function timeEnd(label) {
  if (!shouldDebug()) return;
  const start = timers.get(label);
  if (start != null) {
    const ms = (performance.now() - start).toFixed(1);
    console.info(`[TIME ] ${label}: ${ms}ms`);
    timers.delete(label);
  }
}


