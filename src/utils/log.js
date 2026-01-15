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

let __consolePatched = false;
function patchConsole() {
  if (__consolePatched) return;
  __consolePatched = true;
  const original = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };
  const gate = (fn, always) => (...args) => {
    if (always || shouldDebug()) fn(...args);
  };
  console.log = gate(original.log, false);
  console.info = gate(original.info, false);
  console.warn = gate(original.warn, false);
  console.debug = gate(original.debug, false);
  console.error = gate(original.error, true);
}

function logDebug(...args) {
  if (shouldDebug()) console.debug('[DEBUG]', ...args);
}

function logInfo(...args) {
  if (shouldDebug()) console.info('[INFO ]', ...args);
}

function logWarn(...args) {
  if (shouldDebug()) console.warn('[WARN ]', ...args);
}

function logError(...args) {
  // 错误始终打印
  console.error('[ERROR]', ...args);
}

// 简易计时工具
const timers = new Map();
function timeStart(label) {
  if (!shouldDebug()) return;
  timers.set(label, performance.now());
}
function timeEnd(label) {
  if (!shouldDebug()) return;
  const start = timers.get(label);
  if (start != null) {
    const ms = (performance.now() - start).toFixed(1);
    console.info(`[TIME ] ${label}: ${ms}ms`);
    timers.delete(label);
  }
}

// 在全局作用域中暴露（用于非模块环境）
if (typeof window !== 'undefined') {
    window.logDebug = logDebug;
    window.logInfo = logInfo;
    window.logWarn = logWarn;
    window.logError = logError;
    window.timeStart = timeStart;
    window.timeEnd = timeEnd;
    patchConsole();
}

// ES6模块导出（用于模块环境）
export {
    logDebug,
    logInfo,
    logWarn,
    logError,
    timeStart,
    timeEnd,
    patchConsole
};

// 确保在ES6模块环境中也能全局访问
// 这对于混合使用模块和传统script标签的页面很重要
if (typeof window !== 'undefined') {
    // 如果函数还没有暴露到全局，则暴露它们
    if (!window.logDebug) window.logDebug = logDebug;
    if (!window.logInfo) window.logInfo = logInfo;
    if (!window.logWarn) window.logWarn = logWarn;
    if (!window.logError) window.logError = logError;
    if (!window.timeStart) window.timeStart = timeStart;
    if (!window.timeEnd) window.timeEnd = timeEnd;
    if (typeof window.__CONSOLE_PATCHED__ === 'undefined') {
        window.__CONSOLE_PATCHED__ = true;
        patchConsole();
    }
}

// 注意：由于HTML使用普通script标签，不支持ES6模块语法
// 如果需要ES6模块支持，请将script标签改为 type="module"
// 或者使用动态import()语法


