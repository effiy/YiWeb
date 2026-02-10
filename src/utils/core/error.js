/**
 * 错误处理工具函数
 * 提供统一的错误处理、日志记录和用户提示功能
 * author: liangliang
 */

/**
 * 错误类型枚举
 */
export const ErrorTypes = {
    NETWORK: 'NETWORK',
    VALIDATION: 'VALIDATION',
    API: 'API',
    RUNTIME: 'RUNTIME',
    UNKNOWN: 'UNKNOWN'
};

/**
 * 错误级别枚举
 */
export const ErrorLevels = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    FATAL: 'fatal'
};

/**
 * 错误信息配置
 */
const ERROR_MESSAGES = {
    [ErrorTypes.NETWORK]: {
        title: '网络错误',
        defaultMessage: '网络连接失败，请检查网络设置'
    },
    [ErrorTypes.VALIDATION]: {
        title: '参数错误',
        defaultMessage: '输入参数无效，请检查后重试'
    },
    [ErrorTypes.API]: {
        title: '接口错误',
        defaultMessage: '服务器接口异常，请稍后重试'
    },
    [ErrorTypes.RUNTIME]: {
        title: '运行时错误',
        defaultMessage: '程序运行异常，请刷新页面重试'
    },
    [ErrorTypes.UNKNOWN]: {
        title: '未知错误',
        defaultMessage: '发生未知错误，请稍后重试'
    }
};

/**
 * 错误记录器类
 */
class ErrorLogger {
    constructor() {
        this.errors = [];
        this.maxErrors = 100; // 最多记录100条错误
    }

    /**
     * 记录错误
     * @param {Error} error - 错误对象
     * @param {string} context - 错误上下文
     * @param {ErrorLevels} level - 错误级别
     */
    log(error, context = '', level = ErrorLevels.ERROR) {
        const errorRecord = {
            timestamp: new Date().toISOString(),
            message: error.message || '未知错误',
            stack: error.stack,
            context,
            level,
            type: this.getErrorType(error)
        };

        this.errors.push(errorRecord);

        // 限制错误记录数量
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        // 控制台输出
        this.consoleOutput(errorRecord);
    }

    /**
     * 获取错误类型
     * @param {Error} error - 错误对象
     * @returns {ErrorTypes} 错误类型
     */
    getErrorType(error) {
        if (error.name === 'NetworkError' || error.message.includes('fetch')) {
            return ErrorTypes.NETWORK;
        }
        if (error.name === 'ValidationError' || error.message.includes('参数')) {
            return ErrorTypes.VALIDATION;
        }
        if (error.name === 'APIError' || error.message.includes('API')) {
            return ErrorTypes.API;
        }
        if (error.name === 'RuntimeError') {
            return ErrorTypes.RUNTIME;
        }
        return ErrorTypes.UNKNOWN;
    }

    /**
     * 控制台输出错误
     * @param {Object} errorRecord - 错误记录
     */
    consoleOutput(errorRecord) {
        const { level, message, context, timestamp } = errorRecord;
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        
        try {
            switch (level) {
                case ErrorLevels.DEBUG:
                    if (window.logDebug) window.logDebug(`${prefix} ${context}: ${message}`);
                    else console.debug(`${prefix} ${context}: ${message}`);
                    break;
                case ErrorLevels.INFO:
                    if (window.logInfo) window.logInfo(`${prefix} ${context}: ${message}`);
                    else console.info(`${prefix} ${context}: ${message}`);
                    break;
                case ErrorLevels.WARN:
                    if (window.logWarn) window.logWarn(`${prefix} ${context}: ${message}`);
                    else console.warn(`${prefix} ${context}: ${message}`);
                    break;
                case ErrorLevels.ERROR:
                case ErrorLevels.FATAL:
                    if (window.logError) window.logError(`${prefix} ${context}: ${message}`);
                    else console.error(`${prefix} ${context}: ${message}`);
                    break;
            }
        } catch (_) { }
    }

    /**
     * 获取所有错误记录
     * @returns {Array} 错误记录数组
     */
    getErrors() {
        return [...this.errors];
    }

    /**
     * 清空错误记录
     */
    clear() {
        this.errors = [];
    }
}

// 创建全局错误记录器实例
const errorLogger = new ErrorLogger();

/**
 * 创建错误对象
 * @param {string} message - 错误消息
 * @param {string} type - 错误类型
 * @param {string} context - 错误上下文
 * @returns {Error} 错误对象
 */
export function createError(message, type = ErrorTypes.UNKNOWN, context = '') {
    const error = new Error(message);
    error.type = type;
    error.context = context;
    errorLogger.log(error, context, ErrorLevels.ERROR);
    return error;
}

/**
 * 处理错误
 * @param {Error} error - 错误对象
 * @param {string} context - 错误上下文
 * @param {Function} onError - 错误处理回调
 */
export function handleError(error, context = '', onError = null) {
    // 记录错误
    errorLogger.log(error, context);

    // 获取错误信息
    const errorType = errorLogger.getErrorType(error);
    const errorConfig = ERROR_MESSAGES[errorType];
    
    const errorInfo = {
        type: errorType,
        title: errorConfig.title,
        message: error.message || errorConfig.defaultMessage,
        context,
        timestamp: new Date().toISOString()
    };

    // 调用自定义错误处理函数
    if (typeof onError === 'function') {
        onError(errorInfo);
    } else {
        // 默认错误处理：显示错误信息
        showErrorMessage(errorInfo);
    }

    return errorInfo;
}

/**
 * 显示错误信息
 * @param {Object} errorInfo - 错误信息对象
 */
export function showErrorMessage(errorInfo) {
    const { title, message } = errorInfo;
    
    const text = `❌ ${title}: ${message}`;
    try {
        if (typeof window !== 'undefined' && typeof window.showError === 'function') {
            window.showError(text);
            return;
        }
    } catch (_) {}
    alert(text);
}

/**
 * 显示成功信息
 * @param {string} message - 成功消息
 */
export function showSuccessMessage(message) {
    if (!message) return;
    
    // 移除弹框显示，只保留控制台日志
    try {
        if (window.logInfo) window.logInfo(`✅ ${message}`);
        else console.log(`✅ ${message}`);
    } catch (_) { }
}

/**
 * 验证参数
 * @param {any} value - 要验证的值
 * @param {string} name - 参数名称
 * @param {string} type - 期望的类型
 * @param {boolean} required - 是否必需
 */
export function validateParameter(value, name, type = 'any', required = false) {
    if (required && (value === undefined || value === null || value === '')) {
        throw createError(`参数 ${name} 是必需的`, ErrorTypes.VALIDATION, '参数验证');
    }

    if (value !== undefined && value !== null) {
        switch (type) {
            case 'string':
                if (typeof value !== 'string') {
                    throw createError(`参数 ${name} 必须是字符串类型`, ErrorTypes.VALIDATION, '参数验证');
                }
                break;
            case 'number':
                if (typeof value !== 'number' || isNaN(value)) {
                    throw createError(`参数 ${name} 必须是数字类型`, ErrorTypes.VALIDATION, '参数验证');
                }
                break;
            case 'boolean':
                if (typeof value !== 'boolean') {
                    throw createError(`参数 ${name} 必须是布尔类型`, ErrorTypes.VALIDATION, '参数验证');
                }
                break;
            case 'array':
                if (!Array.isArray(value)) {
                    throw createError(`参数 ${name} 必须是数组类型`, ErrorTypes.VALIDATION, '参数验证');
                }
                break;
            case 'object':
                if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                    throw createError(`参数 ${name} 必须是对象类型`, ErrorTypes.VALIDATION, '参数验证');
                }
                break;
            case 'date':
                if (!(value instanceof Date)) {
                    throw createError(`参数 ${name} 必须是Date对象`, ErrorTypes.VALIDATION, '参数验证');
                }
                break;
        }
    }
}

/**
 * 安全执行函数
 * @param {Function} fn - 要执行的函数
 * @param {string} context - 执行上下文
 * @param {Function} onError - 错误处理回调
 * @returns {any} 函数执行结果
 */
export function safeExecute(fn, context = '', onError = null) {
    try {
        return fn();
    } catch (error) {
        return handleError(error, context, onError);
    }
}

/**
 * 异步安全执行函数
 * @param {Function} fn - 要执行的异步函数
 * @param {string} context - 执行上下文
 * @param {Function} onError - 错误处理回调
 * @returns {Promise<any>} 异步函数执行结果
 */
export async function safeExecuteAsync(fn, context = '', onError = null) {
    try {
        return await fn();
    } catch (error) {
        return handleError(error, context, onError);
    }
}

/**
 * 检查是否是浏览器扩展错误
 * @param {Error|Object} error - 错误对象
 * @param {string} filename - 文件名（可选）
 * @param {string} stack - 错误堆栈（可选）
 * @returns {boolean} 是否是浏览器扩展错误
 */
export function isBrowserExtensionError(error, filename = '', stack = '') {
    // 检查文件名
    if (filename && (
        filename.includes('content.js') || 
        filename.includes('extension') || 
        filename.includes('chrome-extension') ||
        filename.includes('moz-extension') ||
        filename.includes('safari-extension')
    )) {
        return true;
    }
    
    // 检查错误堆栈
    if (stack && (
        stack.includes('content.js') || 
        stack.includes('extension') || 
        stack.includes('chrome-extension') ||
        stack.includes('moz-extension') ||
        stack.includes('safari-extension')
    )) {
        return true;
    }
    
    // 检查错误消息中的特定模式
    if (error && error.message) {
        const message = error.message.toLowerCase();
        // 检查常见的浏览器扩展错误模式
        if (message.includes('cannot read properties of null') && 
            (message.includes("reading '0'") || 
             message.includes("reading '1'") || 
             message.includes("reading '2'") ||
             message.includes("reading '3'"))) {
            return true;
        }
        
        // 检查其他常见的扩展错误
        if (message.includes('extension') || 
            message.includes('content script') ||
            message.includes('injected script')) {
            return true;
        }
    }
    
    return false;
}

/**
 * 处理浏览器扩展错误
 * @param {Error|Object} error - 错误对象
 * @param {string} context - 错误上下文
 * @param {string} filename - 文件名（可选）
 * @param {string} stack - 错误堆栈（可选）
 * @returns {boolean} 是否已处理（true表示已忽略）
 */
export function handleBrowserExtensionError(error, context = '', filename = '', stack = '') {
    if (isBrowserExtensionError(error, filename, stack)) {
        try {
            const payload = {
                message: error?.message || '未知错误',
                filename: filename || '未知文件',
                stack: stack || '无堆栈信息'
            };
            if (window.logInfo) window.logInfo(`[${context}] 检测到浏览器扩展错误，已忽略:`, payload);
            else console.log(`[${context}] 检测到浏览器扩展错误，已忽略:`, payload);
        } catch (_) { }
        return true; // 已处理，可以忽略
    }
    return false; // 未处理，需要继续处理
}

/**
 * 设置浏览器扩展错误过滤器
 * @param {string} context - 上下文名称
 * @param {boolean} enablePromiseFilter - 是否启用Promise错误过滤
 */
export function setupBrowserExtensionErrorFilter(context = 'App', enablePromiseFilter = true) {
    // 全局错误处理
    window.addEventListener('error', (event) => {
        if (handleBrowserExtensionError(event.error, context, event.filename)) {
            event.preventDefault(); // 阻止默认的错误处理
            return;
        }
        
        // 如果不是扩展错误，记录到错误日志
        if (event.error) {
            errorLogger.log(event.error, context, ErrorLevels.ERROR);
        }
    });
    
    // Promise错误处理
    if (enablePromiseFilter) {
        window.addEventListener('unhandledrejection', (event) => {
            if (handleBrowserExtensionError(event.reason, context, '', event.reason?.stack)) {
                event.preventDefault(); // 阻止默认的错误处理
                return;
            }
            
            // 如果不是扩展错误，记录到错误日志
            if (event.reason) {
                errorLogger.log(event.reason, context, ErrorLevels.ERROR);
            }
        });
    }
    
    try {
        if (window.logInfo) window.logInfo(`[${context}] 浏览器扩展错误过滤器已启用`);
        else console.log(`[${context}] 浏览器扩展错误过滤器已启用`);
    } catch (_) { }
}

/**
 * 安全的数组访问函数
 * @param {Array|Object} obj - 要访问的对象或数组
 * @param {string|number} key - 要访问的键或索引
 * @param {any} defaultValue - 默认值
 * @returns {any} 安全访问的结果
 */
export function safeGet(obj, key, defaultValue = null) {
    try {
        if (obj === null || obj === undefined) {
            return defaultValue;
        }
        
        if (typeof key === 'number' && Array.isArray(obj)) {
            return (key >= 0 && key < obj.length) ? obj[key] : defaultValue;
        }
        
        if (typeof key === 'string' && typeof obj === 'object') {
            return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : defaultValue;
        }
        
        return defaultValue;
    } catch (error) {
        try {
            const payload = { obj, key, error: error.message };
            if (window.logWarn) window.logWarn('[safeGet] 访问失败:', payload);
            else console.warn('[safeGet] 访问失败:', payload);
        } catch (_) { }
        return defaultValue;
    }
}

/**
 * 安全的数组访问函数（支持链式访问）
 * @param {any} obj - 要访问的对象
 * @param {string} path - 访问路径，如 'a.b.c' 或 'items[0].name'
 * @param {any} defaultValue - 默认值
 * @returns {any} 安全访问的结果
 */
export function safeGetPath(obj, path, defaultValue = null) {
    try {
        if (!obj || !path) {
            return defaultValue;
        }
        
        const keys = path.split(/[\.\[\]]+/).filter(key => key !== '');
        let current = obj;
        
        for (const key of keys) {
            if (current === null || current === undefined) {
                return defaultValue;
            }
            
            if (Array.isArray(current)) {
                const index = parseInt(key, 10);
                if (isNaN(index) || index < 0 || index >= current.length) {
                    return defaultValue;
                }
                current = current[index];
            } else if (typeof current === 'object') {
                current = current[key];
            } else {
                return defaultValue;
            }
        }
        
        return current !== undefined ? current : defaultValue;
    } catch (error) {
        try {
            const payload = { obj, path, error: error.message };
            if (window.logWarn) window.logWarn('[safeGetPath] 访问失败:', payload);
            else console.warn('[safeGetPath] 访问失败:', payload);
        } catch (_) { }
        return defaultValue;
    }
}

/**
 * 安全的数组操作函数
 * @param {Array} arr - 要操作的数组
 * @param {Function} operation - 操作函数
 * @param {any} defaultValue - 默认值
 * @returns {any} 操作结果
 */
export function safeArrayOperation(arr, operation, defaultValue = null) {
    try {
        if (!Array.isArray(arr)) {
            return defaultValue;
        }
        
        return operation(arr);
    } catch (error) {
        try {
            const payload = { arr, error: error.message };
            if (window.logWarn) window.logWarn('[safeArrayOperation] 操作失败:', payload);
            else console.warn('[safeArrayOperation] 操作失败:', payload);
        } catch (_) { }
        return defaultValue;
    }
}

// 导出错误记录器实例
export { errorLogger };

// 在全局作用域中暴露（用于非模块环境）
if (typeof window !== 'undefined') {
    window.ErrorTypes = ErrorTypes;
    window.ErrorLevels = ErrorLevels;
    window.createError = createError;
    window.handleError = handleError;
    window.showErrorMessage = showErrorMessage;
    window.showSuccessMessage = showSuccessMessage;
    window.validateParameter = validateParameter;
    window.safeExecute = safeExecute;
    window.safeExecuteAsync = safeExecuteAsync;
    window.errorLogger = errorLogger;
    window.isBrowserExtensionError = isBrowserExtensionError;
    window.handleBrowserExtensionError = handleBrowserExtensionError;
    window.setupBrowserExtensionErrorFilter = setupBrowserExtensionErrorFilter;
    window.safeGet = safeGet;
    window.safeGetPath = safeGetPath;
    window.safeArrayOperation = safeArrayOperation;
} 
