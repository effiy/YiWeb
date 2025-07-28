// 提供 CRUD 操作的模块
// 作者：liangliang

import { 
  getRequest, 
  postRequest, 
  putRequest, 
  patchRequest, 
  deleteRequest 
} from '/apis/helper/requestHelper.js';

/**
 * 简单的内存缓存
 */
const cache = new Map();

/**
 * 缓存配置
 */
const CACHE_CONFIG = {
  defaultTTL: 5 * 60 * 1000, // 5分钟
  maxSize: 100 // 最大缓存条目数
};

/**
 * 数据验证规则
 */
const VALIDATION_RULES = {
  required: (value) => value !== undefined && value !== null && value !== '',
  string: (value) => typeof value === 'string',
  number: (value) => typeof value === 'number' && !isNaN(value),
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  url: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * 验证数据
 * @param {Object} data - 要验证的数据
 * @param {Object} rules - 验证规则
 * @returns {Object} - 验证结果
 */
function validateData(data, rules) {
  const errors = [];
  
  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = data[field];
    
    for (const rule of fieldRules) {
      if (typeof rule === 'string' && VALIDATION_RULES[rule]) {
        if (!VALIDATION_RULES[rule](value)) {
          errors.push(`${field} 字段验证失败：${rule}`);
        }
      } else if (typeof rule === 'function') {
        if (!rule(value)) {
          errors.push(`${field} 字段验证失败`);
        }
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 缓存管理
 */
class CacheManager {
  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {number} ttl - 生存时间（毫秒）
   */
  static set(key, value, ttl = CACHE_CONFIG.defaultTTL) {
    // 清理过期缓存
    this.cleanup();
    
    // 检查缓存大小
    if (cache.size >= CACHE_CONFIG.maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
  }
  
  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {*} - 缓存值或 null
   */
  static get(key) {
    const item = cache.get(key);
    if (!item) return null;
    
    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  /**
   * 清理过期缓存
   */
  static cleanup() {
    const now = Date.now();
    for (const [key, item] of cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        cache.delete(key);
      }
    }
  }
  
  /**
   * 清除所有缓存
   */
  static clear() {
    cache.clear();
  }
}

/**
 * 获取数据 (Read) - 支持缓存
 * @param {string} url - API 端点
 * @param {Object} options - 请求选项
 * @param {boolean} useCache - 是否使用缓存
 * @returns {Promise} - 返回数据
 */
export async function getData(url, options = {}, useCache = true) {
  // 检查缓存
  if (useCache) {
    const cached = CacheManager.get(url);
    if (cached) {
      console.log('从缓存获取数据：', url);
      return cached;
    }
  }
  
  try {
    const data = await getRequest(url, options);
    
    // 设置缓存
    if (useCache) {
      CacheManager.set(url, data);
    }
    
    return data;
  } catch (error) {
    console.error('获取数据失败：', error);
    throw error;
  }
}

/**
 * 创建数据 (Create)
 * @param {string} url - API 端点
 * @param {Object} data - 要创建的数据
 * @param {Object} validationRules - 验证规则
 * @param {Object} options - 请求选项
 * @returns {Promise} - 返回创建结果
 */
export async function postData(url, data, validationRules = {}, options = {}) {
  // 数据验证
  if (Object.keys(validationRules).length > 0) {
    const validation = validateData(data, validationRules);
    if (!validation.isValid) {
      throw new Error('数据验证失败：' + validation.errors.join(', '));
    }
  }
  
  try {
    const result = await postRequest(url, data, options);
    
    // 清除相关缓存
    CacheManager.clear();
    
    return result;
  } catch (error) {
    console.error('创建数据失败：', error);
    throw error;
  }
}

/**
 * 更新数据 (Update) - 使用 PUT
 * @param {string} url - API 端点
 * @param {Object} data - 要更新的数据
 * @param {Object} validationRules - 验证规则
 * @param {Object} options - 请求选项
 * @returns {Promise} - 返回更新结果
 */
export async function updateData(url, data, validationRules = {}, options = {}) {
  // 数据验证
  if (Object.keys(validationRules).length > 0) {
    const validation = validateData(data, validationRules);
    if (!validation.isValid) {
      throw new Error('数据验证失败：' + validation.errors.join(', '));
    }
  }
  
  try {
    const result = await putRequest(url, data, options);
    
    // 清除相关缓存
    CacheManager.clear();
    
    return result;
  } catch (error) {
    console.error('更新数据失败：', error);
    throw error;
  }
}

/**
 * 部分更新数据 (Patch)
 * @param {string} url - API 端点
 * @param {Object} data - 要更新的数据
 * @param {Object} validationRules - 验证规则
 * @param {Object} options - 请求选项
 * @returns {Promise} - 返回更新结果
 */
export async function patchData(url, data, validationRules = {}, options = {}) {
  // 数据验证
  if (Object.keys(validationRules).length > 0) {
    const validation = validateData(data, validationRules);
    if (!validation.isValid) {
      throw new Error('数据验证失败：' + validation.errors.join(', '));
    }
  }
  
  try {
    const result = await patchRequest(url, data, options);
    
    // 清除相关缓存
    CacheManager.clear();
    
    return result;
  } catch (error) {
    console.error('部分更新数据失败：', error);
    throw error;
  }
}

/**
 * 删除数据 (Delete)
 * @param {string} url - API 端点
 * @param {Object} options - 请求选项
 * @returns {Promise} - 返回删除结果
 */
export async function deleteData(url, options = {}) {
  try {
    const result = await deleteRequest(url, options);
    
    // 清除相关缓存
    CacheManager.clear();
    
    return result;
  } catch (error) {
    console.error('删除数据失败：', error);
    throw error;
  }
}

/**
 * 批量操作
 * @param {Array} operations - 操作数组
 * @returns {Promise} - 返回所有操作结果
 */
export async function batchOperations(operations) {
  const results = [];
  const errors = [];
  
  for (const operation of operations) {
    try {
      let result;
      switch (operation.type) {
        case 'GET':
          result = await getData(operation.url, operation.options, operation.useCache);
          break;
        case 'POST':
          result = await postData(operation.url, operation.data, operation.validationRules, operation.options);
          break;
        case 'PUT':
          result = await updateData(operation.url, operation.data, operation.validationRules, operation.options);
          break;
        case 'PATCH':
          result = await patchData(operation.url, operation.data, operation.validationRules, operation.options);
          break;
        case 'DELETE':
          result = await deleteData(operation.url, operation.options);
          break;
        default:
          throw new Error(`不支持的操作类型：${operation.type}`);
      }
      results.push({ success: true, result });
    } catch (error) {
      errors.push({ success: false, error: error.message, operation });
    }
  }
  
  return {
    results,
    errors,
    successCount: results.length,
    errorCount: errors.length
  };
}

// 导出缓存管理器
export { CacheManager };


