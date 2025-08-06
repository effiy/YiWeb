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
        
        switch (level) {
            case ErrorLevels.DEBUG:
                console.debug(`${prefix} ${context}: ${message}`);
                break;
            case ErrorLevels.INFO:
                console.info(`${prefix} ${context}: ${message}`);
                break;
            case ErrorLevels.WARN:
                console.warn(`${prefix} ${context}: ${message}`);
                break;
            case ErrorLevels.ERROR:
            case ErrorLevels.FATAL:
                console.error(`${prefix} ${context}: ${message}`);
                break;
        }
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
    
    // 这里可以集成UI组件库的Toast或Modal
    // 目前使用简单的alert，后续可以替换为更优雅的UI组件
    alert(`❌ ${title}: ${message}`);
}

/**
 * 显示成功信息
 * @param {string} message - 成功消息
 */
export function showSuccessMessage(message) {
    if (!message) return;
    
    // 移除弹框显示，只保留控制台日志
    // 用户反馈：评论保存成功后不需要再显示弹框
    console.log(`✅ ${message}`);
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

// 导出错误记录器实例
export { errorLogger }; 
