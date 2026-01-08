/**
 * API 认证工具函数
 * 用于管理 X-Token 的存储和获取
 * 作者：liangliang
 */

// ---------- 常量定义 ----------
const API_TOKEN_KEY = "YiWeb.apiToken.v1";

/**
 * 获取存储的 Token
 * @returns {string} 存储的 token，如果没有则返回空字符串
 */
export const getStoredToken = () => {
  try {
    return String(localStorage.getItem(API_TOKEN_KEY) || "").trim();
  } catch {
    return "";
  }
};

/**
 * 保存 Token 到本地存储
 * @param {string} token - 要保存的 token
 */
export const saveToken = (token) => {
  try {
    localStorage.setItem(API_TOKEN_KEY, String(token || "").trim());
  } catch {
    // ignore
  }
};

/**
 * 获取认证请求头
 * @param {string} token - 可选的 token，如果不提供则从存储中获取
 * @returns {Object} 包含 X-Token 的请求头对象，如果没有 token 则返回空对象
 */
export const getAuthHeaders = (token) => {
  const authToken = token || getStoredToken();
  if (!authToken) return {};
  return { "X-Token": authToken };
};

/**
 * 清除 Token（别名函数，用于统一接口）
 */
export const clearToken = () => {
  saveToken('');
};

/**
 * 检查是否有有效的 Token
 * @returns {boolean} 是否有有效的 token
 */
export const hasValidToken = () => {
  const token = getStoredToken();
  return token && token.trim().length > 0;
};

// 在全局作用域中暴露（用于非模块环境）
if (typeof window !== 'undefined') {
  window.getStoredToken = getStoredToken;
  window.saveToken = saveToken;
  window.getAuthHeaders = getAuthHeaders;
  window.clearToken = clearToken;
  window.hasValidToken = hasValidToken;
}


