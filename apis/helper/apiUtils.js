// API 工具函数
// 作者：liangliang

/**
 * 构建 URL 查询参数
 * @param {Object} params - 参数对象
 * @returns {string} - 查询参数字符串
 */
export function buildQueryString(params) {
  if (!params || typeof params !== 'object') {
    return '';
  }
  
  const searchParams = new URLSearchParams();
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, item));
      } else {
        searchParams.append(key, String(value));
      }
    }
  }
  
  return searchParams.toString();
}

/**
 * 构建完整 URL
 * @param {string} baseUrl - 基础 URL
 * @param {Object} params - 查询参数
 * @returns {string} - 完整 URL
 */
export function buildUrl(baseUrl, params = {}) {
  const queryString = buildQueryString(params);
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * 解析 URL 参数
 * @param {string} url - URL 字符串
 * @returns {Object} - 参数对象
 */
export function parseUrlParams(url) {
  try {
    const urlObj = new URL(url);
    const params = {};
    
    for (const [key, value] of urlObj.searchParams.entries()) {
      if (params[key]) {
        if (Array.isArray(params[key])) {
          params[key].push(value);
        } else {
          params[key] = [params[key], value];
        }
      } else {
        params[key] = value;
      }
    }
    
    return params;
  } catch (error) {
    console.error('解析 URL 参数失败：', error);
    return {};
  }
}



/**
 * 防抖函数
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} - 防抖后的函数
 */
export function debounce(fn, delay = 300) {
  let timeoutId;
  
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * 节流函数
 * @param {Function} fn - 要节流的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} - 节流后的函数
 */
export function throttle(fn, delay = 300) {
  let lastCall = 0;
  
  return function (...args) {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}

/**
 * 格式化错误信息
 * @param {Error} error - 错误对象
 * @returns {Object} - 格式化的错误信息
 */
export function formatError(error) {
  return {
    message: error.message,
    status: error.status,
    statusText: error.statusText,
    url: error.url,
    timestamp: new Date().toISOString(),
    stack: error.stack
  };
}

/**
 * 检查网络连接状态
 * @returns {boolean} - 是否在线
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * 监听网络状态变化
 * @param {Function} callback - 状态变化回调
 * @returns {Function} - 取消监听的函数
 */
export function onNetworkChange(callback) {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // 返回取消监听的函数
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * 生成请求 ID
 * @returns {string} - 唯一的请求 ID
 */
export function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 深度合并对象
 * @param {Object} target - 目标对象
 * @param {Object} source - 源对象
 * @returns {Object} - 合并后的对象
 */
export function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
} 