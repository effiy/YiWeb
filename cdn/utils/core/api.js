/**
 * API客户端封装
 * @author liangliang
 */

/**
 * API错误类
 */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * API客户端类
 */
export class ApiClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || '';
    this.timeout = options.timeout || 30000;
    this.headers = options.headers || {};
    this.interceptors = {
      request: [],
      response: [],
      error: []
    };

    // 默认配置
    this.defaults = {
      credentials: 'same-origin',
      mode: 'cors',
      cache: 'no-cache',
      ...options.defaults
    };
  }

  /**
   * 添加请求拦截器
   */
  addRequestInterceptor(fn) {
    this.interceptors.request.push(fn);
    return () => {
      const index = this.interceptors.request.indexOf(fn);
      if (index > -1) this.interceptors.request.splice(index, 1);
    };
  }

  /**
   * 添加响应拦截器
   */
  addResponseInterceptor(fn) {
    this.interceptors.response.push(fn);
    return () => {
      const index = this.interceptors.response.indexOf(fn);
      if (index > -1) this.interceptors.response.splice(index, 1);
    };
  }

  /**
   * 添加错误拦截器
   */
  addErrorInterceptor(fn) {
    this.interceptors.error.push(fn);
    return () => {
      const index = this.interceptors.error.indexOf(fn);
      if (index > -1) this.interceptors.error.splice(index, 1);
    };
  }

  /**
   * 执行请求拦截器
   */
  async runRequestInterceptors(config) {
    let result = config;
    for (const interceptor of this.interceptors.request) {
      result = await interceptor(result);
    }
    return result;
  }

  /**
   * 执行响应拦截器
   */
  async runResponseInterceptors(response) {
    let result = response;
    for (const interceptor of this.interceptors.response) {
      result = await interceptor(result);
    }
    return result;
  }

  /**
   * 执行错误拦截器
   */
  async runErrorInterceptors(error) {
    let result = error;
    for (const interceptor of this.interceptors.error) {
      result = await interceptor(result);
      if (result === null) return null; // 拦截器处理了错误
    }
    return result;
  }

  /**
   * 构建URL
   */
  buildURL(url, params) {
    const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;

    if (!params || Object.keys(params).length === 0) {
      return fullURL;
    }

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v));
        } else {
          searchParams.append(key, value);
        }
      }
    }

    const queryString = searchParams.toString();
    return queryString ? `${fullURL}?${queryString}` : fullURL;
  }

  /**
   * 发送请求
   */
  async request(config) {
    try {
      // 运行请求拦截器
      config = await this.runRequestInterceptors(config);

      const {
        url,
        method = 'GET',
        params,
        data,
        headers = {},
        timeout = this.timeout,
        ...rest
      } = config;

      // 构建完整URL
      const fullURL = this.buildURL(url, params);

      // 合并headers
      const mergedHeaders = {
        ...this.headers,
        ...headers
      };

      // 构建请求配置
      const fetchConfig = {
        method: method.toUpperCase(),
        headers: mergedHeaders,
        ...this.defaults,
        ...rest
      };

      // 处理请求体
      if (data) {
        if (data instanceof FormData) {
          fetchConfig.body = data;
          // FormData会自动设置Content-Type
          delete fetchConfig.headers['Content-Type'];
        } else if (typeof data === 'object') {
          fetchConfig.body = JSON.stringify(data);
          if (!fetchConfig.headers['Content-Type']) {
            fetchConfig.headers['Content-Type'] = 'application/json';
          }
        } else {
          fetchConfig.body = data;
        }
      }

      // 超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      fetchConfig.signal = controller.signal;

      try {
        // 发送请求
        const response = await fetch(fullURL, fetchConfig);
        clearTimeout(timeoutId);

        // 解析响应
        let responseData;
        const contentType = response.headers.get('Content-Type');

        if (contentType?.includes('application/json')) {
          responseData = await response.json();
        } else if (contentType?.includes('text/')) {
          responseData = await response.text();
        } else {
          responseData = await response.blob();
        }

        // 构建响应对象
        const result = {
          data: responseData,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          config,
          request: response
        };

        // 检查HTTP状态
        if (!response.ok) {
          throw new ApiError(
            `Request failed with status ${response.status}`,
            response.status,
            responseData
          );
        }

        // 运行响应拦截器
        return await this.runResponseInterceptors(result);

      } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
          throw new ApiError('Request timeout', 408, null);
        }
        throw error;
      }

    } catch (error) {
      // 运行错误拦截器
      const handledError = await this.runErrorInterceptors(error);
      if (handledError === null) {
        return null; // 错误已被处理
      }
      throw handledError;
    }
  }

  /**
   * GET请求
   */
  get(url, config = {}) {
    return this.request({ ...config, url, method: 'GET' });
  }

  /**
   * POST请求
   */
  post(url, data, config = {}) {
    return this.request({ ...config, url, method: 'POST', data });
  }

  /**
   * PUT请求
   */
  put(url, data, config = {}) {
    return this.request({ ...config, url, method: 'PUT', data });
  }

  /**
   * PATCH请求
   */
  patch(url, data, config = {}) {
    return this.request({ ...config, url, method: 'PATCH', data });
  }

  /**
   * DELETE请求
   */
  delete(url, config = {}) {
    return this.request({ ...config, url, method: 'DELETE' });
  }

  /**
   * HEAD请求
   */
  head(url, config = {}) {
    return this.request({ ...config, url, method: 'HEAD' });
  }

  /**
   * OPTIONS请求
   */
  options(url, config = {}) {
    return this.request({ ...config, url, method: 'OPTIONS' });
  }
}

/**
 * 创建API客户端实例
 */
export function createApiClient(options) {
  return new ApiClient(options);
}

/**
 * 默认API客户端实例
 */
let defaultClient = null;

/**
 * 获取默认API客户端
 */
export function getDefaultClient() {
  if (!defaultClient) {
    defaultClient = createApiClient({
      baseURL: '/api',
      timeout: 30000
    });

    // 添加默认请求拦截器 - 添加token
    defaultClient.addRequestInterceptor(async (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers = config.headers || ;
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    });

    // 添加默认响应拦截器 - 提取data
    defaultClient.addResponseInterceptor(async (response) => {
      // 如果响应数据有标准格式，提取实际数据
      if (response.data && typeof response.data === 'object') {
        if ('code' in response.data && 'data' in response.data) {
          if (response.data.code === 0 || response.data.code === 200) {
            return { ...response, data: response.data.data };
          } else {
            throw new ApiError(
              response.data.message || 'Request failed',
              response.data.code,
              response.data
            );
          }
        }
      }
      return response;
    });

    // 添加默认错误拦截器
    defaultClient.addErrorInterceptor(async (error) => {
      if (error instanceof ApiError) {
        // 处理特定错误码
        if (error.status === 401) {
          // 未授权，清除token并跳转登录
          localStorage.removeItem('token');
          window.location.href = '/login';
          return null; // 阻止错误继续传播
        }
      }
      return error;
    });
  }
  return defaultClient;
}

/**
 * 快捷请求方法
 */
export function request(config) {
  return getDefaultClient().request(config);
}

export function get(url, config) {
  return getDefaultClient().get(url, config);
}

export function post(url, data, config) {
  return getDefaultClient().post(url, data, config);
}

export function put(url, data, config) {
  return getDefaultClient().put(url, data, config);
}

export function patch(url, data, config) {
  return getDefaultClient().patch(url, data, config);
}

export function del(url, config) {
  return getDefaultClient().delete(url, config);
}

/**
 * 批量请求
 */
export async function all(requests) {
  return Promise.all(requests);
}

/**
 * 并发请求控制
 */
export async function concurrent(requests, limit = 5) {
  const results = [];
  const executing = [];

  for (const request of requests) {
    const promise = Promise.resolve().then(() => request());
    results.push(promise);

    if (limit <= requests.length) {
      const e = promise.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }

  return Promise.all(results);
}

/**
 * 请求重试
 */
export async function retry(fn, options = {}) {
  const {
    retries = 3,
    delay = 1000,
    backoff = 2,
    onRetry = null
  } = options;

  let lastError;

  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (i < retries) {
        if (onRetry) {
          onRetry(error, i + 1);
        }
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(backoff, i)));
      }
    }
  }

  throw lastError;
}

/**
 * 请求缓存
 */
export class RequestCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 60000; // 默认60秒
    this.maxSize = options.maxSize || 100;
  }

  /**
   * 生成缓存key
   */
  generateKey(config) {
    return JSON.stringify({
      url: config.url,
      method: config.method,
      params: config.params,
      data: config.data
    });
  }

  /**
   * 获取缓存
   */
  get(config) {
    const key = this.generateKey(config);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // 检查是否过期
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 设置缓存
   */
  set(config, data) {
    const key = this.generateKey(config);

    // 检查缓存大小
    if (this.cache.size >= this.maxSize) {
      // 删除最旧的缓存
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 清除缓存
   */
  clear() {
    this.cache.clear();
  }

  /**
   * 删除指定缓存
   */
  delete(config) {
    const key = this.generateKey(config);
    this.cache.delete(key);
  }
}

/**
 * 创建带缓存的API客户端
 */
export function createCachedClient(options = {}) {
  const client = createApiClient(options);
  const cache = new RequestCache(options.cache);

  // 添加缓存拦截器
  client.addRequestInterceptor(async (config) => {
    // 只缓存GET请求
    if (config.method?.toUpperCase() === 'GET' && !config.noCache) {
      const cached = cache.get(config);
      if (cached) {
        // 返回缓存数据，跳过实际请求
        throw { __cached: true, data: cached };
      }
    }
    return config;
  });

  client.addResponseInterceptor(async (response) => {
    // 缓存GET请求的响应
    if (response.config.method?.toUpperCase() === 'GET' && !response.config.noCache) {
      cache.set(response.config, response);
    }
    return response;
  });

  client.addErrorInterceptor(async (error) => {
    // 处理缓存命中
    if (error.__cached) {
      return error.data;
    }
    return error;
  });

  // 暴露缓存控制方法
  client.cache = cache;

  return client;
}
