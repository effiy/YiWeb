/**
 * 认证错误处理器
 * 统一处理 401 未授权错误
 * 作者：liangliang
 */

import { getStoredToken, saveToken } from './authUtils.js';

// 导入消息提示工具
import '/src/utils/ui/message.js';

/**
 * 认证错误处理配置
 */
const AUTH_ERROR_CONFIG = {
  // 是否自动清除 token
  autoClearToken: true,
  // 是否显示错误提示
  showError: true,
  // 是否触发登录提示
  promptLogin: true,
  // 登录提示回调函数
  onLoginPrompt: null,
  // 清除 token 后的回调
  onTokenCleared: null
};

/**
 * 401 错误处理锁，防止重复处理
 */
let isHandling401 = false;
let last401Time = 0;
const HANDLE_401_COOLDOWN = 2000; // 2秒内的重复 401 只处理一次

/**
 * 设置认证错误处理配置
 * @param {Object} config - 配置对象
 */
export function setAuthErrorConfig(config) {
  Object.assign(AUTH_ERROR_CONFIG, config);
}

/**
 * 获取认证错误处理配置
 * @returns {Object} 配置对象
 */
export function getAuthErrorConfig() {
  return { ...AUTH_ERROR_CONFIG };
}

/**
 * 清除 token
 */
export function clearToken() {
  try {
    saveToken('');
    window.logInfo('[认证错误处理] Token 已清除');
    
    // 触发回调
    if (AUTH_ERROR_CONFIG.onTokenCleared) {
      AUTH_ERROR_CONFIG.onTokenCleared();
    }
  } catch (error) {
    window.logError('[认证错误处理] 清除 Token 失败:', error);
  }
}

/**
 * 显示登录提示
 * @param {string} message - 提示消息
 */
function showLoginPrompt(message = '未授权，请先登录') {
  if (!AUTH_ERROR_CONFIG.promptLogin) return;
  
  // 如果有自定义回调，使用自定义回调
  if (AUTH_ERROR_CONFIG.onLoginPrompt) {
    AUTH_ERROR_CONFIG.onLoginPrompt(message);
    return;
  }
  
  // 默认使用 prompt 提示
  const fallbackPrompt = () => {
    try {
      const shouldLogin = window.confirm(`${message}\n\n是否现在登录？`);
      if (!shouldLogin) return;
      const token = window.prompt('请输入 X-Token（用于访问 API）', getStoredToken());
      if (token !== null && token.trim()) {
        saveToken(token.trim());
        try {
          if (window.showSuccess) window.showSuccess('Token 已保存，请重试操作');
        } catch (_) { }
      }
    } catch (_) { }
  };

  try {
    if (window.showError) {
      try {
        window.showError({
          title: '认证失败',
          content: message,
          type: 'error',
          duration: 5000,
          actions: [
            {
              text: '重新登录',
              type: 'primary',
              action: () => {
                try {
                  if (window.openAuth) {
                    window.openAuth();
                    return;
                  }
                  const token = window.prompt('请输入 X-Token（用于访问 API）', '');
                  if (token !== null && token.trim()) {
                    saveToken(token.trim());
                    if (window.showSuccess) window.showSuccess('Token 已保存，请重试操作');
                  }
                } catch (_) { }
              }
            }
          ]
        });
        return;
      } catch (_) {
        fallbackPrompt();
        return;
      }
    }
    fallbackPrompt();
  } catch (error) {
    try {
      if (window.logError) window.logError('[认证错误处理] 显示登录提示失败:', error);
      else console.error('[认证错误处理] 显示登录提示失败:', error);
    } catch (_) { }
    fallbackPrompt();
  }
}

/**
 * 处理 401 未授权错误
 * @param {Response} response - HTTP 响应对象
 * @param {Object} options - 处理选项
 * @returns {Error} 错误对象
 */
export function handle401Error(response, options = {}) {
  const {
    autoClearToken = AUTH_ERROR_CONFIG.autoClearToken,
    showError = AUTH_ERROR_CONFIG.showError,
    promptLogin = AUTH_ERROR_CONFIG.promptLogin,
    customMessage = null
  } = options;
  
  // 防止重复处理
  const now = Date.now();
  if (isHandling401 && (now - last401Time) < HANDLE_401_COOLDOWN) {
    window.logInfo('[认证错误处理] 跳过重复的 401 处理');
    const error = new Error(customMessage || '未授权，请先登录');
    error.status = 401;
    error.statusText = response.statusText;
    error.url = response.url;
    error.isAuthError = true;
    return error;
  }
  
  isHandling401 = true;
  last401Time = now;
  
  // 记录错误日志
  if (window.logWarn) {
    window.logWarn('[认证错误处理] 检测到 401 未授权错误:', {
      url: response.url,
      status: response.status,
      timestamp: new Date().toISOString()
    });
  } else if (window.logError) {
    window.logError('[认证错误处理] 检测到 401 未授权错误:', {
      url: response.url,
      status: response.status,
      timestamp: new Date().toISOString()
    });
  }
  
  // 自动清除 token
  if (autoClearToken) {
    clearToken();
  }
  
  // 显示错误提示
  if (showError) {
    const message = customMessage || '未授权，请先登录';
    if (promptLogin) {
      showLoginPrompt(message);
    } else if (window.showError) {
      window.showError(message, 5000);
    }
  }
  
  // 创建错误对象
  const error = new Error(customMessage || '未授权，请先登录');
  error.status = 401;
  error.statusText = response.statusText;
  error.url = response.url;
  error.isAuthError = true;
  error.handled = true;
  
  // 延迟重置处理锁
  setTimeout(() => {
    isHandling401 = false;
  }, HANDLE_401_COOLDOWN);
  
  return error;
}

/**
 * 检查是否为认证错误
 * @param {Error} error - 错误对象
 * @returns {boolean} 是否为认证错误
 */
export function isAuthError(error) {
  return error && (error.status === 401 || error.isAuthError === true);
}

/**
 * 重置 401 处理锁（用于测试或特殊情况）
 */
export function reset401Handler() {
  isHandling401 = false;
  last401Time = 0;
}

// 在全局作用域中暴露（用于非模块环境）
if (typeof window !== 'undefined') {
  window.handle401Error = handle401Error;
  window.isAuthError = isAuthError;
  window.clearToken = clearToken;
  window.setAuthErrorConfig = setAuthErrorConfig;
  window.getAuthErrorConfig = getAuthErrorConfig;
  window.reset401Handler = reset401Handler;
}
