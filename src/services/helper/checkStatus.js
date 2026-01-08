// 检查 HTTP 响应状态的辅助函数
// 作者：liangliang

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
  console.error('请求失败详情：', {
    status,
    statusText,
    url: response.url,
    message: errorMessage,
    timestamp: new Date().toISOString()
  });
  
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

// 在全局作用域中暴露（用于非模块环境）
if (typeof window !== 'undefined') {
    window.checkStatus = checkStatus;
    window.isJsonResponse = isJsonResponse;
}

// ES6模块导出（用于模块环境）
export {
    checkStatus,
    isJsonResponse
};

// 确保在ES6模块环境中也能全局访问
// 这对于混合使用模块和传统script标签的页面很重要
if (typeof window !== 'undefined') {
    // 如果函数还没有暴露到全局，则暴露它们
    if (!window.checkStatus) window.checkStatus = checkStatus;
    if (!window.isJsonResponse) window.isJsonResponse = isJsonResponse;
}

