/**
 * 模型服务模块
 * 负责从 YiAi API 获取模型列表
 * author: Claude
 */

import { getStoredToken, getAuthHeaders } from '/src/core/services/helper/authUtils.js?v=1';
import { buildApiUrl } from '/src/core/config.js';

/**
 * 格式化文件大小显示
 */
const formatFileSize = (bytes) => {
  if (!bytes || typeof bytes !== 'number') return '未知';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const size = Math.max(bytes, 0);
  const place = Math.floor(Math.log(size) / Math.log(1024));
  const value = size / Math.pow(1024, Math.max(place, 0));
  return `${value.toFixed(place > 1 ? 1 : 0)} ${units[Math.min(place, units.length - 1)]}`;
};

/**
 * 获取模型列表 API URL
 */
const getModelListApiUrl = () => {
  const params = new URLSearchParams({
    module_name: 'services.ai.chat_service',
    method_name: 'list_ollama_models',
    parameters: '{}'
  });
  return `${buildApiUrl('')}?${params.toString()}`;
};

/**
 * 从 YiAi API 获取模型列表
 * @returns {Promise<{success: boolean, data: Array, warning?: string, error?: string}>}
 */
export const fetchOllamaModels = async () => {
  try {
    const apiUrl = getModelListApiUrl();
    const headers = getAuthHeaders();

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });

    if (!response.ok) {
      throw new Error(`API 返回 ${response.status}`);
    }

    const result = await response.json();

    if (result.code !== 0 || !result.data?.success) {
      throw new Error(result.message || '获取模型列表失败');
    }

    const models = (result.data.models || []).map(model => ({
      name: model.model,
      size: model.size,
      sizeFormatted: formatFileSize(model.size),
      modifiedAt: model.modified_at,
      details: model.details || {}
    }));

    return { success: true, data: models };
  } catch (error) {
    console.error('[ModelService] 获取模型列表失败:', error);

    return {
      success: false,
      error: error?.message || '获取模型列表失败',
      data: []
    };
  }
};

/**
 * 刷新模型列表
 */
export const refreshModels = () => {
  return fetchOllamaModels();
};

if (typeof window !== 'undefined') {
  window.ModelService = {
    fetchOllamaModels,
    refreshModels,
    formatFileSize
  };
}

export default {
  fetchOllamaModels,
  refreshModels,
  formatFileSize
};
