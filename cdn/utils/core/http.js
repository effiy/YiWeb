/**
 * 网络请求工具函数
 * author: liangliang
 */

/**
 * HTTP请求配置
 */
const defaultConfig = {
    baseURL: '',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
};

/**
 * 请求拦截器
 */
const requestInterceptors = [];

/**
 * 响应拦截器
 */
const responseInterceptors = [];

/**
 * 添加请求拦截器
 * @param {Function} onFulfilled - 成功回调
 * @param {Function} onRejected - 失败回调
 */
export function addRequestInterceptor(onFulfilled, onRejected) {
    requestInterceptors.push({ onFulfilled, onRejected });
}

/**
 * 添加响应拦截器
 * @param {Function} onFulfilled - 成功回调
 * @param {Function} onRejected - 失败回调
 */
export function addResponseInterceptor(onFulfilled, onRejected) {
    responseInterceptors.push({ onFulfilled, onRejected });
}

/**
 * 执行请求拦截器
 * @param {Object} config - 请求配置
 * @returns {Promise<Object>} 处理后的配置
 */
async function executeRequestInterceptors(config) {
    let currentConfig = config;

    for (const interceptor of requestInterceptors) {
        try {
            if (interceptor.onFulfilled) {
                currentConfig = await interceptor.onFulfilled(currentConfig);
            }
        } catch (error) {
            if (interceptor.onRejected) {
                return interceptor.onRejected(error);
            }
            throw error;
        }
    }

    return currentConfig;
}

/**
 * 执行响应拦截器
 * @param {Response} response - 响应对象
 * @returns {Promise<Response>} 处理后的响应
 */
async function executeResponseInterceptors(response) {
    let currentResponse = response;

    for (const interceptor of responseInterceptors) {
        try {
            if (interceptor.onFulfilled) {
                currentResponse = await interceptor.onFulfilled(currentResponse);
            }
        } catch (error) {
            if (interceptor.onRejected) {
                return interceptor.onRejected(error);
            }
            throw error;
        }
    }

    return currentResponse;
}

/**
 * 构建完整URL
 * @param {string} url - URL
 * @param {string} baseURL - 基础URL
 * @returns {string} 完整URL
 */
function buildURL(url, baseURL) {
    if (!baseURL || url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
    const path = url.startsWith('/') ? url : `/${url}`;

    return `${base}${path}`;
}

/**
 * 构建查询字符串
 * @param {Object} params - 参数对象
 * @returns {string} 查询字符串
 */
function buildQueryString(params) {
    if (!params || typeof params !== 'object') return '';

    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value !== null && value !== undefined) {
            searchParams.append(key, String(value));
        }
    }

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
}

/**
 * HTTP请求
 * @param {string} url - URL
 * @param {Object} options - 选项
 * @returns {Promise<any>} 响应数据
 */
export async function request(url, options = {}) {
    const config = {
        ...defaultConfig,
        ...options,
        headers: {
            ...defaultConfig.headers,
            ...options.headers
        }
    };

    // 执行请求拦截器
    const interceptedConfig = await executeRequestInterceptors(config);

    // 构建完整URL
    let fullURL = buildURL(url, interceptedConfig.baseURL);

    // 添加查询参数
    if (interceptedConfig.params) {
        fullURL += buildQueryString(interceptedConfig.params);
    }

    // 构建fetch选项
    const fetchOptions = {
        method: interceptedConfig.method || 'GET',
        headers: interceptedConfig.headers
    };

    // 添加请求体
    if (interceptedConfig.data) {
        if (interceptedConfig.headers['Content-Type'] === 'application/json') {
            fetchOptions.body = JSON.stringify(interceptedConfig.data);
        } else if (interceptedConfig.data instanceof FormData) {
            fetchOptions.body = interceptedConfig.data;
            delete fetchOptions.headers['Content-Type']; // Let browser set it
        } else {
            fetchOptions.body = interceptedConfig.data;
        }
    }

    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), interceptedConfig.timeout);
    fetchOptions.signal = controller.signal;

    try {
        // 发送请求
        const response = await fetch(fullURL, fetchOptions);
        clearTimeout(timeoutId);

        // 执行响应拦截器
        const interceptedResponse = await executeResponseInterceptors(response);

        // 检查响应状态
        if (!interceptedResponse.ok) {
            throw new Error(`HTTP Error: ${interceptedResponse.status} ${interceptedResponse.statusText}`);
        }

        // 解析响应数据
        const contentType = interceptedResponse.headers.get('Content-Type');

        if (contentType && contentType.includes('application/json')) {
            return await interceptedResponse.json();
        }

        if (contentType && contentType.includes('text/')) {
            return await interceptedResponse.text();
        }

        return await interceptedResponse.blob();
    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            throw new Error('Request timeout');
        }

        throw error;
    }
}

/**
 * GET请求
 * @param {string} url - URL
 * @param {Object} options - 选项
 * @returns {Promise<any>} 响应数据
 */
export function get(url, options = {}) {
    return request(url, { ...options, method: 'GET' });
}

/**
 * POST请求
 * @param {string} url - URL
 * @param {*} data - 数据
 * @param {Object} options - 选项
 * @returns {Promise<any>} 响应数据
 */
export function post(url, data, options = {}) {
    return request(url, { ...options, method: 'POST', data });
}

/**
 * PUT请求
 * @param {string} url - URL
 * @param {*} data - 数据
 * @param {Object} options - 选项
 * @returns {Promise<any>} 响应数据
 */
export function put(url, data, options = {}) {
    return request(url, { ...options, method: 'PUT', data });
}

/**
 * PATCH请求
 * @param {string} url - URL
 * @param {*} data - 数据
 * @param {Object} options - 选项
 * @returns {Promise<any>} 响应数据
 */
export function patch(url, data, options = {}) {
    return request(url, { ...options, method: 'PATCH', data });
}

/**
 * DELETE请求
 * @param {string} url - URL
 * @param {Object} options - 选项
 * @returns {Promise<any>} 响应数据
 */
export function del(url, options = {}) {
    return request(url, { ...options, method: 'DELETE' });
}

/**
 * 并发请求
 * @param {Array<Promise>} requests - 请求数组
 * @returns {Promise<Array>} 响应数组
 */
export function all(requests) {
    return Promise.all(requests);
}

/**
 * 创建HTTP客户端
 * @param {Object} config - 配置
 * @returns {Object} HTTP客户端
 */
export function createHttpClient(config = {}) {
    const clientConfig = { ...defaultConfig, ...config };

    return {
        request: (url, options) => request(url, { ...clientConfig, ...options }),
        get: (url, options) => get(url, { ...clientConfig, ...options }),
        post: (url, data, options) => post(url, data, { ...clientConfig, ...options }),
        put: (url, data, options) => put(url, data, { ...clientConfig, ...options }),
        patch: (url, data, options) => patch(url, data, { ...clientConfig, ...options }),
        delete: (url, options) => del(url, { ...clientConfig, ...options })
    };
}

export default {
    request,
    get,
    post,
    put,
    patch,
    delete: del,
    all,
    createHttpClient,
    addRequestInterceptor,
    addResponseInterceptor
};
