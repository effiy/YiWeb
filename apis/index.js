// API 模块入口文件
// 作者：liangliang

// 导出所有辅助函数
export * from '/apis/helper/checkStatus.js';
export * from '/apis/helper/requestHelper.js';
export * from '/apis/helper/apiUtils.js';

// 导出所有 CRUD 操作
export * from '/apis/modules/crud.js';

// 导出常用组合函数
import { getData, createData, updateData, patchData, deleteData, batchOperations, CacheManager } from '/apis/modules/crud.js';
import { buildUrl, debounce, throttle, isOnline } from '/apis/helper/apiUtils.js';

/**
 * 简化的 API 客户端
 */
export const apiClient = {
  // 基础 CRUD 操作
  get: getData,
  post: createData,
  put: updateData,
  patch: patchData,
  delete: deleteData,
  
  // 批量操作
  batch: batchOperations,
  
  // 缓存管理
  cache: CacheManager,
  
  // 工具函数
  buildUrl,

  debounce,
  throttle,
  isOnline
};

// 默认导出 API 客户端
export default apiClient;
