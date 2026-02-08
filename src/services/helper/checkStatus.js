// 检查 HTTP 响应状态的辅助函数
// 作者：liangliang

import '/src/utils/log.js';
// 导入认证错误处理器
import { handle401Error } from './authErrorHandler.js';

/**
 * HTTP 状态码映射
 */
const STATUS_MESSAGES = {
  400: '请求参数错误',
  401: '未授权，请先登录',
  403: '禁止访问',
  404: '请求的资源不存在',
  500: '服务器内部错误',
  502: '网关错误',
  503: '服务不可用',
  504: '网关超时'
};

/**
 * 检查响应状态是否成功
 * @param {Response} response - fetch 的响应对象
 * @param {Object} options - 选项对象，用于自定义错误处理
 * @returns {Response} - 如果成功返回响应，否则抛出错误
 */
function checkStatus(response, options = {}) {
  if (response.ok) {
    return response;
  }
  
  // 获取错误信息
  const status = response.status;
  const statusText = response.statusText;
  
  // 特殊处理 401 错误
  if (status === 401) {
    const error = handle401Error(response, options);
    throw error;
  }
  
  // 其他错误处理
  const errorMessage = STATUS_MESSAGES[status] || `请求失败：${statusText}`;
  
  // 监控错误 - 记录详细信息
  try {
    if (window.logError) {
      window.logError('请求失败详情：', {
        status,
        statusText,
        url: response.url,
        message: errorMessage,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('请求失败详情：', {
        status,
        statusText,
        url: response.url,
        message: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  } catch (_) {
  }
  
  // 创建更详细的错误对象
  const error = new Error(errorMessage);
  error.status = status;
  error.statusText = statusText;
  error.url = response.url;
  
  throw error;
}

/**
 * 检查响应是否为 JSON 格式
 * @param {Response} response - fetch 的响应对象
 * @returns {boolean} - 是否为 JSON 格式
 */
function isJsonResponse(response) {
  const contentType = response.headers.get('content-type');
  return contentType && contentType.includes('application/json');
}

function exposeToWindow() {
  if (typeof window === 'undefined') return;
  window.checkStatus = checkStatus;
  window.isJsonResponse = isJsonResponse;
}

// ES6模块导出（用于模块环境）
export {
    checkStatus,
    isJsonResponse
};

exposeToWindow();
