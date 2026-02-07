// 提供 CRUD 操作的模块
// 作者：liangliang

// 模块依赖改为全局方式
// import { 
//   window.getRequest, 
//   window.postRequest, 
//   window.putRequest, 
//   window.patchRequest, 
//   window.deleteRequest 
// } from '/src/services/helper/requestHelper.js';
// import { window.logInfo, logWarn, window.logError } from '/src/utils/log.js';
// 导入日志工具，确保 window.logError 等函数可用
import '/src/utils/log.js';
// 导入请求工具，确保 window.getRequest、window.postRequest 等函数可用
import '/src/services/helper/requestHelper.js';
// 导入认证工具
import { getAuthHeaders } from '/src/services/helper/authUtils.js';
// 导入认证错误处理器
import { handle401Error, isAuthError } from '/src/services/helper/authErrorHandler.js';

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
    const data = await window.requestClient.get(url, options);
    
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
    const result = await window.requestClient.post(url, data, options);
    
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
    const result = await window.requestClient.put(url, data, options);
    
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
    const result = await window.requestClient.patch(url, data, options);
    
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
    const result = await window.requestClient.delete(url, options);
    
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
    // 支持三种请求结构：
    // 1) 服务调用结构：包含 module_name 和 method_name，直接透传
    // 2) 新结构：包含 type 字段时，认为是服务端定义的完整结构，原样透传
    // 3) 旧结构：{ fromSystem, fromUser, model?, images? }
    const isServicePayload = data && typeof data === 'object' && 'module_name' in data && 'method_name' in data;
    const isNewSchema = !isServicePayload && data && typeof data === 'object' && 'type' in data;
    const payload = (() => {
      if (isServicePayload) {
        return data;
      }
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

    // 获取认证头
    const authHeaders = getAuthHeaders();
    
    const config = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream,application/json',
        ...authHeaders,  // 添加认证头
        ...options.headers,
      },
      body: JSON.stringify(payload),
      ...options,
    };
    
    // 发送请求
    let response = await fetch(url, config);
    
    // 处理 401 错误
    if (!response.ok && response.status === 401) {
      const error = handle401Error(response, {
        autoClearToken: options.autoClearToken !== false,
        showError: options.showError !== false,
        promptLogin: options.promptLogin !== false,
        customMessage: options.errorMessage
      });
      throw error;
    }
    
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
          headers: {
            ...config.headers,
            ...authHeaders,  // 确保回退请求也包含认证头
          },
          body: JSON.stringify(fallbackPayload)
        };
        response = await fetch(url, fallbackConfig);
        
        // 再次检查 401 错误
        if (!response.ok && response.status === 401) {
          const error = handle401Error(response, {
            autoClearToken: options.autoClearToken !== false,
            showError: options.showError !== false,
            promptLogin: options.promptLogin !== false,
            customMessage: options.errorMessage
          });
          throw error;
        }
      } catch (_) {
        // 忽略回退流程内部错误，继续按原流程抛出
      }
    }
    
    if (!response.ok) {
      // 如果是认证错误，已经处理过了
      if (response.status === 401) {
        const error = handle401Error(response, {
          autoClearToken: options.autoClearToken !== false,
          showError: options.showError !== false,
          promptLogin: options.promptLogin !== false,
          customMessage: options.errorMessage
        });
        throw error;
      }
      
      // 其他错误
      const errorText = await response.text();
      const error = new Error(`HTTP ${response.status}: ${errorText}`);
      error.status = response.status;
      error.statusText = response.statusText;
      error.url = url;
      throw error;
    }

    const pickTextFromResponse = (obj) => {
      const asText = (v) => {
        if (v === null || v === undefined) return undefined;
        if (typeof v === 'string') return v;
        if (Array.isArray(v)) {
          const joined = v
            .map(x => {
              if (typeof x === 'string') return x;
              if (x && typeof x === 'object' && typeof x.content === 'string') return x.content;
              return '';
            })
            .join('');
          return joined;
        }
        if (v && typeof v === 'object' && typeof v.content === 'string') return v.content;
        return undefined;
      };

      if (!obj || typeof obj !== 'object') return undefined;

      const candidates = [
        obj.data && typeof obj.data === 'object' ? obj.data.message : undefined,
        obj.data && typeof obj.data === 'object' ? obj.data.content : undefined,
        obj.data && typeof obj.data === 'object' ? obj.data.response : undefined,
        obj.data,
        obj.result && typeof obj.result === 'object' ? obj.result.message : undefined,
        obj.result && typeof obj.result === 'object' ? obj.result.content : undefined,
        obj.message,
        obj.content,
        obj.response,
        obj.text
      ];

      for (const c of candidates) {
        const text = asText(c);
        if (typeof text === 'string' && text !== '') return text;
      }
      return undefined;
    };

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('text/event-stream')) {
      const rawText = await response.text();
      let content = rawText;
      try {
        const parsed = JSON.parse(rawText);
        if (parsed && typeof parsed === 'object') {
          if (parsed.type === 'error' || parsed.success === false) {
            throw new Error(parsed.error || parsed.message || parsed.data || '请求失败');
          }
          const picked = pickTextFromResponse(parsed);
          if (picked !== undefined) {
            content = picked;
          } else if (typeof parsed === 'string') {
            content = parsed;
          }
        }
      } catch (e) {
        if (e && typeof e === 'object' && typeof e.message === 'string' && !e.message.includes('JSON')) {
          throw e;
        }
      }

      const text = typeof content === 'string' ? content : (() => {
        try {
          return JSON.stringify(content);
        } catch (_) {
          return String(content);
        }
      })();
      if (onChunk && typeof onChunk === 'function') {
        onChunk(text, text);
      }
      CacheManager.clear();
      return String(text || '').trim();
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
            
            const content = pickTextFromResponse(chunk);
            if (content !== undefined) {
              const text = String(content);
              fullContent += text;
              if (onChunk && typeof onChunk === 'function') {
                onChunk(text, fullContent);
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
          const content = pickTextFromResponse(chunk);
          if (content !== undefined) {
            const text = String(content);
            fullContent += text;
            if (onChunk && typeof onChunk === 'function') {
              onChunk(text, fullContent);
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
 * 规范化 prompt 文本响应为统一 JSON 结构：{ data: Task[] | any[] }
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

function exposeToWindow() {
    if (typeof window === 'undefined') return;
    window.getData = getData;
    window.postData = postData;
    window.updateData = updateData;
    window.patchData = patchData;
    window.deleteData = deleteData;
    window.streamPrompt = streamPrompt;
    window.streamPromptJSON = streamPromptJSON;
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

exposeToWindow();

// 注意：由于HTML使用普通script标签，不支持ES6模块语法
// 如果需要ES6模块支持，请将script标签改为 type="module"
// 或者使用动态import()语法
