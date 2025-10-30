// 提供 CRUD 操作的模块
// 作者：liangliang

// 模块依赖改为全局方式
// import { 
//   window.getRequest, 
//   window.postRequest, 
//   window.putRequest, 
//   window.patchRequest, 
//   window.deleteRequest 
// } from '/apis/helper/requestHelper.js';
// import { window.logInfo, logWarn, window.logError } from '/utils/log.js';
// 导入日志工具，确保 window.logError 等函数可用
import '/utils/log.js';
// 导入请求工具，确保 window.getRequest、window.postRequest 等函数可用
import '/apis/helper/requestHelper.js';

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
async function getData(url, options = {}, useCache = true) {
  // 检查缓存
  if (useCache) {
    const cached = CacheManager.get(url);
    if (cached) {
      window.logInfo('从缓存获取数据：', url);
      return cached;
    }
  }
  
  try {
    const data = await window.getRequest(url, options);
    
    // 设置缓存
    if (useCache) {
      CacheManager.set(url, data);
    }
    
    return data;
  } catch (error) {
    window.logError('获取数据失败：', error);
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
async function postData(url, data, validationRules = {}, options = {}) {
  // 数据验证
  if (Object.keys(validationRules).length > 0) {
    const validation = validateData(data, validationRules);
    if (!validation.isValid) {
      throw new Error('数据验证失败：' + validation.errors.join(', '));
    }
  }
  
  try {
    const result = await window.postRequest(url, data, options);
    
    // 清除相关缓存
    CacheManager.clear();
    
    return result;
  } catch (error) {
    window.logError('创建数据失败：', error);
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
async function updateData(url, data, validationRules = {}, options = {}) {
  // 数据验证
  if (Object.keys(validationRules).length > 0) {
    const validation = validateData(data, validationRules);
    if (!validation.isValid) {
      throw new Error('数据验证失败：' + validation.errors.join(', '));
    }
  }
  
  try {
    const result = await window.putRequest(url, data, options);
    
    // 清除相关缓存
    CacheManager.clear();
    
    return result;
  } catch (error) {
    window.logError('更新数据失败：', error);
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
async function patchData(url, data, validationRules = {}, options = {}) {
  // 数据验证
  if (Object.keys(validationRules).length > 0) {
    const validation = validateData(data, validationRules);
    if (!validation.isValid) {
      throw new Error('数据验证失败：' + validation.errors.join(', '));
    }
  }
  
  try {
    const result = await window.patchRequest(url, data, options);
    
    // 清除相关缓存
    CacheManager.clear();
    
    return result;
  } catch (error) {
    window.logError('部分更新数据失败：', error);
    throw error;
  }
}

/**
 * 删除数据 (Delete)
 * @param {string} url - API 端点
 * @param {Object} options - 请求选项
 * @returns {Promise} - 返回删除结果
 */
async function deleteData(url, options = {}) {
  try {
    const result = await window.deleteRequest(url, options);
    
    // 清除相关缓存
    CacheManager.clear();
    
    return result;
  } catch (error) {
    window.logError('删除数据失败：', error);
    throw error;
  }
}

/**
 * 流式 Prompt 请求（处理 SSE 格式的响应）
 * @param {string} url - API 端点
 * @param {Object} data - 请求数据 { fromSystem, fromUser, model?, images? }
 * @param {Object} options - 请求选项
 * @param {Function} onChunk - 可选的回调函数，用于实时接收内容块
 * @returns {Promise<string>} - 返回完整的响应内容
 */
async function streamPrompt(url, data, options = {}, onChunk = null) {
  try {
    // 支持两种请求结构：
    // 1) 新结构：包含 type 字段时，认为是服务端定义的完整结构，原样透传
    // 2) 旧结构：{ fromSystem, fromUser, model?, images? }
    const isNewSchema = data && typeof data === 'object' && 'type' in data;
    const payload = (() => {
      if (isNewSchema) {
        // 新协议：若携带 input，则转换为 fromUser 字符串，并删除 input
        const clone = { ...data };
        if (Object.prototype.hasOwnProperty.call(clone, 'input')) {
          try {
            clone.fromUser = typeof clone.input === 'string' ? clone.input : JSON.stringify(clone.input);
          } catch (_) {
            clone.fromUser = String(clone.input);
          }
          delete clone.input;
        }
        return clone;
      }
      // 旧协议：统一使用 fromUser（字符串）
      const body = {
        fromSystem: data.fromSystem,
        fromUser: String(data.fromUser ?? '')
      };
      if (data.model) body.model = data.model;
      if (data.images && Array.isArray(data.images) && data.images.length > 0) {
        body.images = data.images;
      }
      return body;
    })();
    
    // 构建请求配置
    // 移除不再支持的字段
    if (payload && Object.prototype.hasOwnProperty.call(payload, 'type')) {
      try { delete payload.type; } catch (_) {}
    }

    const config = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(payload),
      ...options,
    };
    
    // 发送请求
    let response = await fetch(url, config);
    
    // 针对 422 做一次性回退重试（去除可选字段，如 model）
    if (!response.ok && response.status === 422) {
      try {
        const fallbackPayload = (() => {
          // 新协议保持原样，但尽量去除 model 等可选字段
          if (isNewSchema) {
            const clone = { ...payload };
            if ('model' in clone) delete clone.model;
            return clone;
          }
          // 旧协议缩减为最小字段
          return {
            fromSystem: String(data.fromSystem || ''),
            fromUser: String(data.fromUser || '')
          };
        })();
        const fallbackConfig = {
          ...config,
          body: JSON.stringify(fallbackPayload)
        };
        response = await fetch(url, fallbackConfig);
      } catch (_) {
        // 忽略回退流程内部错误，继续按原流程抛出
      }
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    // 读取流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      // 解码数据并添加到缓冲区
      buffer += decoder.decode(value, { stream: true });
      
      // 处理完整的 SSE 消息
      const messages = buffer.split('\n\n');
      buffer = messages.pop() || '';
      
      for (const message of messages) {
        if (message.startsWith('data: ')) {
          try {
            const dataStr = message.substring(6);
            if (dataStr.trim() === '') continue;
            
            const chunk = JSON.parse(dataStr);
            
            // 解析 ollama 的原始响应格式
            if (chunk.message && chunk.message.content) {
              const content = chunk.message.content;
              fullContent += content;
              
              // 如果有回调函数，实时传递内容块
              if (onChunk && typeof onChunk === 'function') {
                onChunk(content, fullContent);
              }
            }
            
            // 检查是否完成
            if (chunk.done === true) {
              // 流式响应完成
              break;
            }
            
            // 处理错误（自定义错误格式，当 ollama 调用失败时）
            if (chunk.type === 'error') {
              throw new Error(`API 错误: ${chunk.data || chunk.message || '未知错误'}`);
            }
            
          } catch (e) {
            // 如果不是 JSON 解析错误，抛出异常
            if (e.message && !e.message.includes('JSON')) {
              throw e;
            }
            // JSON 解析失败，可能是无效的数据行，跳过
            console.warn('解析 SSE 消息失败:', message, e);
          }
        }
      }
    }
    
    // 处理最后的消息
    if (buffer.trim()) {
      const message = buffer.trim();
      if (message.startsWith('data: ')) {
        try {
          const chunk = JSON.parse(message.substring(6));
          if (chunk.message && chunk.message.content) {
            fullContent += chunk.message.content;
            if (onChunk && typeof onChunk === 'function') {
              onChunk(chunk.message.content, fullContent);
            }
          }
          if (chunk.type === 'error') {
            throw new Error(`API 错误: ${chunk.data || chunk.message || '未知错误'}`);
          }
        } catch (e) {
          if (e.message && !e.message.includes('JSON')) {
            throw e;
          }
          console.warn('解析最后 SSE 消息失败:', message, e);
        }
      }
    }
    
    // 清除相关缓存
    CacheManager.clear();
    
    return fullContent.trim();
    
  } catch (error) {
    window.logError('流式请求失败：', error);
    throw error;
  }
}

/**
 * 移除 <think>...</think> 标签内容
 */
function stripThinkTags(text) {
  if (typeof text !== 'string') return text;
  try {
    return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  } catch (_) {
    return text;
  }
}

/**
 * 如果整体是一个被 JSON.stringify 过的字符串，则尝试还原
 * 例如："\n```json\n[...]\n```\n" -> 还原为包含换行与反引号的原始文本
 */
function tryUnescapeJsonString(text) {
  if (typeof text !== 'string') return text;
  try {
    const maybe = JSON.parse(text);
    if (typeof maybe === 'string') {
      return maybe;
    }
    return text;
  } catch (_) {
    return text;
  }
}

/**
 * 去除 Markdown 代码围栏，优先提取第一个代码块内容
 * 支持 ```json ... ``` 或 ``` ... ```
 */
function stripCodeFences(text) {
  if (typeof text !== 'string') return text;
  try {
    const fenceRegex = /```[a-zA-Z0-9_-]*\n([\s\S]*?)```/m;
    const m = text.match(fenceRegex);
    if (m && m[1]) {
      return m[1].trim();
    }
    return text;
  } catch (_) {
    return text;
  }
}

/**
 * 规范化 /prompt 文本响应为统一 JSON 结构：{ data: Task[] | any[] }
 * - 先去除 <think> 标签内容
 * - 若整体是被 JSON.stringify 的字符串，先反转义
 * - 去除 Markdown 代码围栏（```json ... ```）
 * - 然后若剩余内容是合法 JSON，则转为 JSON；否则保留为字符串
 * @param {string} fullContent - 流式聚合后的完整文本
 * @returns {{ data: any[] }}
 */
function normalizePromptResponse(fullContent) {
  if (!fullContent || typeof fullContent !== 'string') {
    return { data: [] };
  }
  let cleaned = stripThinkTags(fullContent);
  cleaned = tryUnescapeJsonString(cleaned);
  cleaned = stripCodeFences(cleaned);
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return { data: parsed };
    }
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.data)) {
      return { data: parsed.data };
    }
    return { data: [parsed] };
  } catch (_) {
    return { data: cleaned ? [cleaned] : [] };
  }
}

/**
 * 流式 Prompt 请求（JSON 统一封装版）
 * - 支持标准化任务生成功能的请求结构
 * - 始终返回 { data: [...] }
 *
 * 兼容旧结构：{ fromSystem, fromUser, model }
 */
async function streamPromptJSON(url, data, options = {}, onChunk = null) {
  // 兼容旧结构：直接透传 fromSystem/fromUser
  const isLegacy = typeof data?.fromUser === 'string' && !('input' in (data || {}));
  const payload = isLegacy
    ? { fromSystem: data.fromSystem, fromUser: data.fromUser, model: data.model }
    : data;

  const fullText = await streamPrompt(url, payload, options, onChunk);
  return normalizePromptResponse(fullText);
}

/**
 * 批量操作
 * @param {Array} operations - 操作数组
 * @returns {Promise} - 返回所有操作结果
 */
async function batchOperations(operations) {
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
// CacheManager 已通过全局暴露可用

// 在全局作用域中暴露（用于非模块环境）
if (typeof window !== 'undefined') {
    window.getData = getData;
    window.postData = postData;
    window.updateData = updateData;
    window.patchData = patchData;
    window.deleteData = deleteData;
    window.streamPrompt = streamPrompt;
    window.batchOperations = batchOperations;
    window.CacheManager = CacheManager;
}

// ES6模块导出（用于模块环境）
export {
    getData,
    postData,
    updateData,
    patchData,
    deleteData,
    streamPrompt,
    streamPromptJSON,
    batchOperations,
    CacheManager
};

// 确保在ES6模块环境中也能全局访问
// 这对于混合使用模块和传统script标签的页面很重要
if (typeof window !== 'undefined') {
    // 如果函数还没有暴露到全局，则暴露它们
    if (!window.getData) window.getData = getData;
    if (!window.postData) window.postData = postData;
    if (!window.updateData) window.updateData = updateData;
    if (!window.patchData) window.patchData = patchData;
    if (!window.deleteData) window.deleteData = deleteData;
    if (!window.streamPrompt) window.streamPrompt = streamPrompt;
    if (!window.streamPromptJSON) window.streamPromptJSON = streamPromptJSON;
    if (!window.batchOperations) window.batchOperations = batchOperations;
    if (!window.CacheManager) window.CacheManager = CacheManager;
}

// 注意：由于HTML使用普通script标签，不支持ES6模块语法
// 如果需要ES6模块支持，请将script标签改为 type="module"
// 或者使用动态import()语法




