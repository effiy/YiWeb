// 发送 HTTP 请求的辅助函数
// 作者：liangliang

import { checkStatus, isJsonResponse } from '/apis/helper/checkStatus.js';
import { apiLoading } from '/utils/apiLoading.js';

/**
 * 默认请求配置
 */
const DEFAULT_CONFIG = {
  timeout: 5 * 60 * 1000, // 5分钟
  headers: {
    'Content-Type': 'application/json'
  }
};

/**
 * 请求拦截器 - 在发送请求前执行
 * @param {Object} config - 请求配置
 * @returns {Object} - 修改后的配置
 */
function requestInterceptor(config) {
  // 添加时间戳
  config.timestamp = Date.now();
  
  // 记录请求日志
  console.log('发送请求：', {
    url: config.url,
    method: config.method,
    timestamp: new Date(config.timestamp).toISOString()
  });
  
  return config;
}

/**
 * 响应拦截器 - 在收到响应后执行
 * @param {Response} response - 响应对象
 * @param {Object} config - 原始请求配置
 * @returns {Response} - 处理后的响应
 */
function responseInterceptor(response, config) {
  // 记录响应日志
  console.log('收到响应：', {
    url: config.url,
    status: response.status,
    duration: Date.now() - config.timestamp + 'ms'
  });
  
  return response;
}

/**
 * 创建超时 Promise
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise} - 超时 Promise
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
 * @param {string} url - 请求的 URL
 * @param {Object} options - 请求选项
 * @returns {Promise} - 返回响应数据
 */
export async function sendRequest(url, options = {}) {
  // 合并默认配置
  const config = {
    ...DEFAULT_CONFIG,
    ...options,
    url
  };
  
  // 生成请求ID
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 显示加载界面
  const loadingOptions = {
    message: `正在请求 ${new URL(url).hostname}...`,
    timeout: config.timeout,
    showProgress: true,
    showCancel: true,
    details: `请求地址: ${url}\n请求方法: ${config.method || 'GET'}`,
    delayShow: 3000 // 3秒内完成不显示loading
  };
  
  return apiLoading.withLoading(async () => {
    // 应用请求拦截器
    const interceptedConfig = requestInterceptor(config);
    
    try {
      // 创建请求 Promise
      const requestPromise = fetch(url, {
        method: config.method || 'GET',
        headers: config.headers,
        body: config.body,
        ...config.fetchOptions
      });
      
      // 创建超时 Promise
      const timeoutPromise = createTimeoutPromise(config.timeout);
      
      // 竞争：请求 vs 超时
      const response = await Promise.race([requestPromise, timeoutPromise]);
      
      // 应用响应拦截器
      const interceptedResponse = responseInterceptor(response, interceptedConfig);
      
      // 检查状态
      await checkStatus(interceptedResponse);
      
      // 根据响应类型返回数据
      if (isJsonResponse(interceptedResponse)) {
        return interceptedResponse.json();
      } else {
        return interceptedResponse.text();
      }
      
    } catch (error) {
      // 监控错误
      console.error('请求错误：', {
        url,
        method: config.method,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }, loadingOptions);
}

/**
 * 发送 GET 请求
 * @param {string} url - 请求的 URL
 * @param {Object} options - 请求选项
 * @returns {Promise} - 返回 JSON 数据
 */
export async function getRequest(url, options = {}) {
  return sendRequest(url, { ...options, method: 'GET' });
}

/**
 * 发送 POST 请求
 * @param {string} url - 请求的 URL
 * @param {Object} data - 要发送的数据
 * @param {Object} options - 请求选项
 * @returns {Promise} - 返回 JSON 数据
 */
export async function postRequest(url, data, options = {}) {
  return sendRequest(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * 发送 PUT 请求
 * @param {string} url - 请求的 URL
 * @param {Object} data - 要发送的数据
 * @param {Object} options - 请求选项
 * @returns {Promise} - 返回 JSON 数据
 */
export async function putRequest(url, data, options = {}) {
  return sendRequest(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

/**
 * 发送 PATCH 请求
 * @param {string} url - 请求的 URL
 * @param {Object} data - 要发送的数据
 * @param {Object} options - 请求选项
 * @returns {Promise} - 返回 JSON 数据
 */
export async function patchRequest(url, data, options = {}) {
  return sendRequest(url, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

/**
 * 发送 DELETE 请求
 * @param {string} url - 请求的 URL
 * @param {Object} options - 请求选项
 * @returns {Promise} - 返回 JSON 数据
 */
export async function deleteRequest(url, options = {}) {
  return sendRequest(url, { ...options, method: 'DELETE' });
}
