/**
 * 发送 HTTP 请求的辅助函数 - 简化版本
 * 作者：liangliang
 */

// 模块依赖改为全局方式
// import { window.checkStatus, window.isJsonResponse } from '/src/services/helper/window.checkStatus.js';
// import { logDebug, window.logInfo, logWarn, window.logError, window.timeStart, window.timeEnd } from '/src/utils/log.js';
// 导入日志工具，确保 window.logInfo、window.timeStart 等函数可用
import '/src/utils/log.js';
// 导入状态检查工具，确保 window.checkStatus 和 window.isJsonResponse 函数可用
import '/src/services/helper/checkStatus.js';
// 导入认证工具，确保 getAuthHeaders 函数可用
import { getAuthHeaders } from '/src/services/helper/authUtils.js';
// 导入认证错误处理器
import { isAuthError, handle401Error } from '/src/services/helper/authErrorHandler.js';

/**
 * 默认请求配置
 */
const DEFAULT_CONFIG = {
  timeout: 5 * 60 * 1000, // 5分钟
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // 默认采用 CORS 模式，确保跨域请求行为一致
  mode: 'cors',
  // 显式声明凭据策略，避免意外携带 Cookie 导致的 CORS 失败
  credentials: 'omit'
};

/**
 * 请求拦截器 - 在发送请求前执行
 */
function requestInterceptor(config) {
  // 添加时间戳
  config.timestamp = Date.now();
  
  // 自动添加认证请求头（如果存在 token）
  const authHeaders = getAuthHeaders();
  if (authHeaders['X-Token']) {
    config.headers = {
      ...config.headers,
      ...authHeaders
    };
  }
  
  // 记录请求日志
  window.logInfo('发送请求：', {
    url: config.url,
    method: config.method,
    timestamp: new Date(config.timestamp).toISOString()
  });
  
  return config;
}

/**
 * 响应拦截器 - 在收到响应后执行
 */
function responseInterceptor(response, config) {
  // 记录响应日志
  window.logInfo('收到响应：', {
    url: config.url,
    status: response.status,
    duration: Date.now() - config.timestamp + 'ms'
  });
  
  return response;
}

/**
 * 创建超时 Promise
 */
function createTimeoutPromise(timeout) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`请求超时：${timeout}ms`));
    }, timeout);
  });
}

/**
 * 发送通用请求
 */
async function sendRequest(url, options = {}) {
  // 合并默认配置
  const config = {
    ...DEFAULT_CONFIG,
    ...options,
    url
  };
  
  // 应用请求拦截器
  const interceptedConfig = requestInterceptor(config);
  
  try {
    // 计时
    const timeLabel = `fetch:${config.method || 'GET'} ${url}`;
    window.timeStart(timeLabel);

    const controller = new AbortController();
    if (config.signal) {
      try {
        if (config.signal.aborted) {
          controller.abort();
        } else if (typeof config.signal.addEventListener === 'function') {
          config.signal.addEventListener('abort', () => {
            try { controller.abort(); } catch (_) {}
          }, { once: true });
        }
      } catch (_) {}
    }
    const { signal } = controller;

    const timeoutMs = (() => {
      const ms = Number(config.timeout);
      if (Number.isFinite(ms) && ms > 0) return ms;
      return DEFAULT_CONFIG.timeout;
    })();
    // 创建请求 Promise
    const requestPromise = fetch(url, {
      method: config.method || 'GET',
      headers: config.headers,
      body: config.body,
      mode: config.mode,
      credentials: config.credentials,
      cache: config.cache,
      signal,
      ...config.fetchOptions
    });
    
    // 创建超时 Promise
    let timeoutId = null;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        try { controller.abort(); } catch (_) {}
        reject(new Error(`请求超时：${timeoutMs}ms`));
      }, timeoutMs);
    });
    
    // 竞争：请求 vs 超时
    let response;
    try {
      response = await Promise.race([requestPromise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
    
    // 应用响应拦截器
    const interceptedResponse = responseInterceptor(response, interceptedConfig);
    
    // 检查状态（传入配置选项，用于自定义 401 处理）
    try {
      await window.checkStatus(interceptedResponse, {
        autoClearToken: config.autoClearToken !== false,
        showError: config.showError !== false,
        promptLogin: config.promptLogin !== false,
        customMessage: config.errorMessage
      });
    } catch (error) {
      // 如果是 401 错误且配置了自动重试
      if (isAuthError(error) && config.retryOn401 === true) {
        window.logInfo('[请求重试] 检测到 401 错误，等待 token 更新后重试');
        
        // 等待用户可能输入新 token（最多等待 3 秒）
        const maxWaitTime = 3000;
        const checkInterval = 200;
        const startTime = Date.now();
        const originalToken = interceptedConfig.headers?.['X-Token'] || '';
        
        return new Promise((resolve, reject) => {
          let timeoutId;
          
          const checkToken = () => {
            const currentToken = getAuthHeaders()['X-Token'] || '';
            
            // 如果 token 已更新，重试请求
            if (currentToken && currentToken !== originalToken) {
              window.logInfo('[请求重试] 检测到 token 已更新，开始重试');
              if (timeoutId) clearTimeout(timeoutId);
              // 重新执行请求（禁用重试，防止无限循环）
              sendRequest(url, {
                ...config,
                retryOn401: false,
                retryCount: (config.retryCount || 0) + 1
              }).then(resolve).catch(reject);
              return;
            }
            
            // 如果超时，直接抛出错误
            if (Date.now() - startTime >= maxWaitTime) {
              if (timeoutId) clearTimeout(timeoutId);
              reject(error);
              return;
            }
            
            // 继续检查
            setTimeout(checkToken, checkInterval);
          };
          
          timeoutId = setTimeout(() => {
            reject(error);
          }, maxWaitTime);
          
          // 开始检查
          checkToken();
        });
      }
      
      // 其他情况直接抛出错误
      throw error;
    }
    
    // 根据响应类型返回数据
    const result = window.isJsonResponse(interceptedResponse)
      ? await interceptedResponse.json()
      : await interceptedResponse.text();
    window.timeEnd(timeLabel);
    return result;
    
  } catch (error) {
    // 如果是认证错误，已经处理过了，直接抛出
    if (isAuthError(error)) {
      throw error;
    }
    
    // 监控错误 - 提供更详细的错误信息
    window.logError('请求错误详情：', {
      url,
      method: config.method,
      error: error.message,
      errorName: error.name,
      errorStack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // 如果是网络错误，提供更友好的错误信息
    if (error.name === 'AbortError') {
      const abortError = new Error('请求被取消或超时');
      abortError.originalError = error;
      abortError.isAbortError = true;
      throw abortError;
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const networkError = new Error('网络请求失败：无法连接到服务器，请检查网络连接和API地址');
      networkError.originalError = error;
      networkError.isNetworkError = true;
      throw networkError;
    }
    
    // 如果是CORS错误
    if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
      const corsError = new Error('跨域请求被阻止：请检查API服务器的CORS配置');
      corsError.originalError = error;
      corsError.isCorsError = true;
      throw corsError;
    }
    
    throw error;
  }
}

/**
 * 数据库服务模块名称
 */
export const SERVICE_MODULE = 'services.database.data_service';

/**
 * 构建通用服务请求 URL
 * @param {string} methodName - 方法名称 (e.g. 'query_documents')
 * @param {Object} params - 参数对象
 * @returns {string} 构建好的 URL
 */
export const buildServiceUrl = (methodName, params) => {
    const parameters = JSON.stringify(params);
    return `${window.API_URL}/?module_name=${SERVICE_MODULE}&method_name=${methodName}&parameters=${encodeURIComponent(parameters)}`;
};

class RequestClient {
  constructor(options = {}) {
    const defaultOptions = {
      timeout: options.timeout,
      mode: options.mode,
      credentials: options.credentials,
      retryOn401: options.retryOn401,
      autoClearToken: options.autoClearToken,
      showError: options.showError,
      promptLogin: options.promptLogin
    };
    this.defaultOptions = Object.fromEntries(
      Object.entries(defaultOptions).filter(([, v]) => v !== undefined)
    );
    this.abortControllers = new Map();
  }

  buildServiceUrl(methodName, params) {
    return buildServiceUrl(methodName, params);
  }

  abort(abortKey) {
    if (!abortKey) return;
    const controller = this.abortControllers.get(abortKey);
    if (controller) {
      try { controller.abort(); } catch (_) {}
      this.abortControllers.delete(abortKey);
    }
  }

  async request(url, options = {}) {
    const { abortKey, ...rest } = options || {};
    let signal = rest.signal;
    let abortController = null;

    if (abortKey) {
      this.abort(abortKey);
      abortController = new AbortController();
      this.abortControllers.set(abortKey, abortController);
      signal = abortController.signal;
    }

    try {
      const merged = { ...this.defaultOptions, ...rest };
      if (signal) merged.signal = signal;
      else if ('signal' in merged) {
        try { delete merged.signal; } catch (_) {}
      }
      return await sendRequest(url, merged);
    } finally {
      if (abortKey) {
        if (abortController && this.abortControllers.get(abortKey) === abortController) {
          this.abortControllers.delete(abortKey);
        }
      }
    }
  }

  get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  post(url, data, options = {}) {
    return this.request(url, { ...options, method: 'POST', body: JSON.stringify(data) });
  }

  put(url, data, options = {}) {
    return this.request(url, { ...options, method: 'PUT', body: JSON.stringify(data) });
  }

  patch(url, data, options = {}) {
    return this.request(url, { ...options, method: 'PATCH', body: JSON.stringify(data) });
  }

  delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }
}

function createRequestClient(options = {}) {
  return new RequestClient(options);
}

// 导出常量和函数到全局 window 对象
if (typeof window !== 'undefined') {
    window.SERVICE_MODULE = SERVICE_MODULE;
    window.buildServiceUrl = buildServiceUrl;
    if (!window.RequestClient) window.RequestClient = RequestClient;
    if (!window.createRequestClient) window.createRequestClient = createRequestClient;
    if (!window.requestClient) window.requestClient = createRequestClient();
}

/**
 * 发送 GET 请求
 */
async function getRequest(url, options = {}) {
  return sendRequest(url, { ...options, method: 'GET' });
}

/**
 * 发送 POST 请求
 */
async function postRequest(url, data, options = {}) {
  return sendRequest(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * 发送 PUT 请求
 */
async function putRequest(url, data, options = {}) {
  return sendRequest(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

/**
 * 发送 PATCH 请求
 */
async function patchRequest(url, data, options = {}) {
  return sendRequest(url, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

/**
 * 发送 DELETE 请求
 */
async function deleteRequest(url, options = {}) {
  return sendRequest(url, { ...options, method: 'DELETE' });
}

/**
 * 批量请求工具
 */
async function batchRequests(requests) {
  const results = {};
  const errors = {};
  
  try {
    const promises = requests.map(async (request, index) => {
      try {
        const result = await sendRequest(request.url, request.options);
        results[request.key || index] = result;
        return { key: request.key || index, success: true, result };
      } catch (error) {
        errors[request.key || index] = error;
        return { key: request.key || index, success: false, error };
      }
    });
    
    const allResults = await Promise.all(promises);
    
    return {
      results,
      errors,
      allResults,
      hasErrors: Object.keys(errors).length > 0
    };
  } catch (error) {
    console.error('批量请求失败:', error);
    throw error;
  }
}

/**
 * 重试请求工具
 */
async function retryRequest(requestFn, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryCondition = (error) => error.status >= 500,
    onRetry = null
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }
      
      if (onRetry) {
        onRetry(error, attempt + 1, maxRetries);
      }
      
      // 等待重试
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }
  
  throw lastError;
}

/**
 * 缓存请求工具
 */
class CachedRequest {
  constructor(options = {}) {
    this.cache = new Map();
    this.maxAge = options.maxAge || 5 * 60 * 1000; // 5分钟
    this.maxSize = options.maxSize || 100;
  }
  
  /**
   * 获取缓存
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  /**
   * 设置缓存
   */
  set(key, data) {
    // 清理过期缓存
    this.cleanup();
    
    // 检查缓存大小
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * 清空缓存
   */
  clear() {
    this.cache.clear();
  }
  
  /**
   * 带缓存的请求
   */
  async request(key, requestFn, options = {}) {
    const { useCache = true, forceRefresh = false } = options;
    
    // 检查缓存
    if (useCache && !forceRefresh) {
      const cached = this.get(key);
      if (cached) {
        return cached;
      }
    }
    
    // 执行请求
    const result = await requestFn();
    
    // 缓存结果
    if (useCache) {
      this.set(key, result);
    }
    
    return result;
  }
}

/**
 * 创建缓存请求实例
 */
function createCachedRequest(options = {}) {
  return new CachedRequest(options);
}

// 在全局作用域中暴露（用于非模块环境）
if (typeof window !== 'undefined') {
    window.getRequest = getRequest;
    window.postRequest = postRequest;
    window.putRequest = putRequest;
    window.patchRequest = patchRequest;
    window.deleteRequest = deleteRequest;
    window.sendRequest = sendRequest;
    window.batchRequests = batchRequests;
    window.retryRequest = retryRequest;
    window.CachedRequest = CachedRequest;
    window.createCachedRequest = createCachedRequest;
}

// ES6模块导出（用于模块环境）
export {
    getRequest,
    postRequest,
    putRequest,
    patchRequest,
    deleteRequest,
    sendRequest,
    batchRequests,
    retryRequest,
    CachedRequest,
    createCachedRequest,
    RequestClient,
    createRequestClient
};

// 确保在ES6模块环境中也能全局访问
// 这对于混合使用模块和传统script标签的页面很重要
if (typeof window !== 'undefined') {
    // 如果函数还没有暴露到全局，则暴露它们
    if (!window.getRequest) window.getRequest = getRequest;
    if (!window.postRequest) window.postRequest = postRequest;
    if (!window.putRequest) window.putRequest = putRequest;
    if (!window.patchRequest) window.patchRequest = patchRequest;
    if (!window.deleteRequest) window.deleteRequest = deleteRequest;
    if (!window.sendRequest) window.sendRequest = sendRequest;
    if (!window.batchRequests) window.batchRequests = batchRequests;
    if (!window.retryRequest) window.retryRequest = retryRequest;
    if (!window.CachedRequest) window.CachedRequest = CachedRequest;
    if (!window.createCachedRequest) window.createCachedRequest = createCachedRequest;
}

// 注意：由于HTML使用普通script标签，不支持ES6模块语法
// 如果需要ES6模块支持，请将script标签改为 type="module"
// 或者使用动态import()语法



