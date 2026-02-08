/**
 * 通用工具函数集合
 * 
 * 整合了项目中所有模块的通用工具函数，避免代码重复
 */

import '/src/utils/log.js';

/**
 * 防抖函数 - 延迟执行函数，在指定时间内只执行最后一次调用
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 延迟时间（毫秒）
 * @param {boolean} immediate - 是否立即执行
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        
        if (callNow) func.apply(this, args);
    };
}

/**
 * 节流函数 - 限制函数执行频率
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 限制间隔（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 安全的localStorage存储
 * @param {string} key - 存储键
 * @param {*} value - 存储值
 * @param {boolean} stringify - 是否需要JSON序列化
 * @returns {boolean} 是否存储成功
 */
export function safeSetItem(key, value, stringify = true) {
    try {
        const storeValue = stringify ? JSON.stringify(value) : value;
        localStorage.setItem(key, storeValue);
        return true;
    } catch (error) {
        try {
            if (window.logWarn) window.logWarn(`LocalStorage存储失败 (${key}):`, error.message);
            else console.warn(`LocalStorage存储失败 (${key}):`, error.message);
        } catch (_) { }
        
        // 如果是配额超出，尝试清理数据
        if (error.name === 'QuotaExceededError') {
            try {
                if (window.logWarn) window.logWarn('LocalStorage配额超出，尝试清理数据...');
                else console.warn('LocalStorage配额超出，尝试清理数据...');
            } catch (_) { }
            return handleStorageQuotaExceeded(key, value, stringify);
        }
        
        return false;
    }
}

/**
 * 安全的localStorage读取
 * @param {string} key - 存储键
 * @param {*} defaultValue - 默认值
 * @param {boolean} parse - 是否需要JSON解析
 * @returns {*} 读取的值
 */
export function safeGetItem(key, defaultValue = null, parse = true) {
    try {
        const item = localStorage.getItem(key);
        if (item === null) return defaultValue;
        return parse ? JSON.parse(item) : item;
    } catch (error) {
        try {
            if (window.logWarn) window.logWarn(`LocalStorage读取失败 (${key}):`, error.message);
            else console.warn(`LocalStorage读取失败 (${key}):`, error.message);
        } catch (_) { }
        return defaultValue;
    }
}

/**
 * 处理存储配额超出的情况
 * @param {string} key - 存储键
 * @param {*} value - 存储值
 * @param {boolean} stringify - 是否需要JSON序列化
 * @returns {boolean} 是否存储成功
 */
function handleStorageQuotaExceeded(key, value, stringify) {
    // 清理策略：删除最老的缓存数据
    const keysToClean = ['newsCache', 'searchHistory', 'tempData'];
    
    for (const cleanKey of keysToClean) {
        if (cleanKey !== key && localStorage.getItem(cleanKey)) {
            localStorage.removeItem(cleanKey);
            try {
                if (window.logInfo) window.logInfo(`已清理存储项：${cleanKey}`);
                else console.log(`已清理存储项：${cleanKey}`);
            } catch (_) { }
            
            // 重试存储
            try {
                const storeValue = stringify ? JSON.stringify(value) : value;
                localStorage.setItem(key, storeValue);
                try {
                    if (window.logInfo) window.logInfo('清理缓存后重新存储成功');
                    else console.log('清理缓存后重新存储成功');
                } catch (_) { }
                return true;
            } catch (retryError) {
                try {
                    if (window.logWarn) window.logWarn('清理缓存后仍然存储失败:', retryError);
                    else console.warn('清理缓存后仍然存储失败:', retryError);
                } catch (_) { }
            }
        }
    }
    
    return false;
}

/**
 * 时间格式化函数
 * @param {string|Date} dateInput - 时间输入
 * @param {string} format - 格式类型：'ago' | 'date' | 'datetime'
 * @returns {string} 格式化后的时间字符串
 */
export function formatTime(dateInput, format = 'ago') {
    const date = new Date(dateInput);
    const now = new Date();
    
    if (format === 'ago') {
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return '刚刚';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}天前`;
        return date.toLocaleDateString('zh-CN');
    }
    
    if (format === 'date') {
        return date.toLocaleDateString('zh-CN');
    }
    
    if (format === 'datetime') {
        return date.toLocaleString('zh-CN');
    }
    
    return date.toString();
}

/**
 * 提取文本摘要
 * @param {string} text - 原文本
 * @param {number} maxLength - 最大长度
 * @param {string} suffix - 后缀
 * @returns {string} 摘要文本
 */
export function extractExcerpt(text, maxLength = 100, suffix = '...') {
    if (!text) return '';
    
    // 移除HTML标签
    const plainText = text.replace(/<[^>]*>/g, '').trim();
    
    if (plainText.length <= maxLength) {
        return plainText;
    }
    
    return plainText.substring(0, maxLength) + suffix;
}

/**
 * 获取随机数
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @param {boolean} integer - 是否返回整数
 * @returns {number} 随机数
 */
export function random(min, max, integer = false) {
    const value = Math.random() * (max - min) + min;
    return integer ? Math.floor(value) : value;
}

/**
 * 创建CSS变量字符串
 * @param {Object} vars - 变量对象
 * @returns {string} CSS变量字符串
 */
export function createCSSVars(vars) {
    return Object.entries(vars)
        .map(([key, value]) => `--${key}: ${value}`)
        .join(';');
}

/**
 * 搜索匹配函数
 * @param {string} text - 搜索文本
 * @param {string} query - 搜索查询
 * @param {boolean} caseSensitive - 是否区分大小写
 * @returns {boolean} 是否匹配
 */
export function isSearchMatch(text, query, caseSensitive = false) {
    if (!query) return true;
    if (!text) return false;
    
    const searchText = caseSensitive ? text : text.toLowerCase();
    const searchQuery = caseSensitive ? query : query.toLowerCase();
    
    return searchText.includes(searchQuery);
}

/**
 * 深拷贝函数
 * @param {*} obj - 要拷贝的对象
 * @returns {*} 拷贝后的对象
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }
    
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
    
    return obj;
}

/**
 * 更新URL参数
 * @param {Object} params - 参数对象
 * @param {boolean} replace - 是否替换当前历史记录
 */
export function updateUrlParams(params, replace = false) {
    const url = new URL(window.location);
    
    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            url.searchParams.set(key, value);
        } else {
            url.searchParams.delete(key);
        }
    });
    
    if (replace) {
        window.history.replaceState({}, '', url);
    } else {
        window.history.pushState({}, '', url);
    }
}

/**
 * 获取URL参数
 * @param {string} key - 参数键
 * @returns {string|null} 参数值
 */
export function getUrlParam(key) {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
}

/**
 * 检测设备类型
 * @returns {Object} 设备信息
 */
export function detectDevice() {
    const userAgent = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile|WPDesktop/i.test(userAgent);
    const isTablet = /iPad|Android/i.test(userAgent) && !/Mobile/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;
    
    return {
        isMobile,
        isTablet,
        isDesktop,
        userAgent
    };
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的文件大小
 */
export function formatFileSize(bytes, decimals = 2) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n < 0) return '0 Bytes';
    if (n === 0) return '0 Bytes';
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    let idx = 0;
    let val = n;
    while (val >= k && idx < units.length - 1) {
        val = val / k;
        idx++;
    }
    const dm = idx === 0 ? 0 : (decimals < 0 ? 0 : decimals);
    const factor = Math.pow(10, dm);
    const truncated = Math.floor(val * factor) / factor;
    return dm === 0
        ? `${truncated} ${units[idx]}`
        : `${truncated.toFixed(dm)} ${units[idx]}`;
}

/**
 * 构建新闻会话的标签数组
 * 标签顺序固定为：
 * 1. knowledge（第一位）
 * 2. news（第二位，确保在新闻自带的标签前面）
 * 3. 新闻自带的标签（第三位及之后）
 * @param {Array<string>} newsTags - 新闻的原始标签数组
 * @returns {Array<string>} 构建后的标签数组，顺序为 [knowledge, news, ...新闻原有标签]
 */
export function buildNewsSessionTags(newsTags = []) {
    // 确保输入是数组并规范化
    const tags = Array.isArray(newsTags) ? newsTags : [];
    
    // 过滤并规范化新闻原有标签，移除 knowledge 和 news 避免重复
    const filteredTags = tags
        .map(tag => String(tag || "").trim())
        .filter(tag => tag && tag !== "knowledge" && tag !== "news");
    
    // 按固定顺序构建标签数组：第一位 knowledge，第二位 news（在新闻自带标签前面），第三位及之后是新闻原有标签
    return ["knowledge", "news", ...filteredTags];
}

// 导出默认工具对象
export default {
    debounce,
    throttle,
    safeSetItem,
    safeGetItem,
    formatTime,
    extractExcerpt,
    random,
    createCSSVars,
    isSearchMatch,
    deepClone,
    updateUrlParams,
    getUrlParam,
    detectDevice,
    formatFileSize,
    buildNewsSessionTags
}; 
