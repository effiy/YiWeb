/**
 * 现代化日志工具类
 * @author liangliang
 * @version 2.0.0
 * @description 支持多级别日志记录、性能监控和错误追踪
 */

/**
 * 日志级别枚举
 */
export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    FATAL: 4
};

/**
 * 日志级别名称映射
 */
const LOG_LEVEL_NAMES = {
    [LogLevel.DEBUG]: 'DEBUG',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.WARN]: 'WARN',
    [LogLevel.ERROR]: 'ERROR',
    [LogLevel.FATAL]: 'FATAL'
};

/**
 * 日志工具类
 */
export class Logger {
    constructor(name = 'YiWeb', options = {}) {
        this.name = name;
        this.level = options.level || LogLevel.INFO;
        this.enableConsole = options.enableConsole !== false;
        this.enableStorage = options.enableStorage || false;
        this.maxStorageSize = options.maxStorageSize || 1000;
        this.enableRemote = options.enableRemote || false;
        this.remoteEndpoint = options.remoteEndpoint || null;
        
        // 日志缓存
        this.logCache = [];
        this.errorCount = 0;
        this.warningCount = 0;
        
        // 性能监控
        this.performanceMarks = new Map();
        this.performanceMeasures = new Map();
        
        // 初始化
        this._init();
    }

    /**
     * 初始化日志系统
     * @private
     */
    _init() {
        // 设置默认配置
        this._setDefaultConfig();
        
        // 初始化存储
        if (this.enableStorage) {
            this._initStorage();
        }
        
        // 监听错误事件
        this._setupErrorListeners();
        
        // 记录启动日志
        this.info('Logger initialized', { name: this.name, level: LOG_LEVEL_NAMES[this.level] });
    }

    /**
     * 设置默认配置
     * @private
     */
    _setDefaultConfig() {
        // 从localStorage读取配置
        const savedLevel = localStorage.getItem('yiweb_log_level');
        if (savedLevel && LogLevel[savedLevel] !== undefined) {
            this.level = LogLevel[savedLevel];
        }
        
        // 从URL参数读取配置
        const urlParams = new URLSearchParams(window.location.search);
        const debugMode = urlParams.get('debug');
        if (debugMode === 'true') {
            this.level = LogLevel.DEBUG;
        }
    }

    /**
     * 初始化存储
     * @private
     */
    _initStorage() {
        try {
            const stored = localStorage.getItem('yiweb_logs');
            if (stored) {
                this.logCache = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Failed to load stored logs:', error);
        }
    }

    /**
     * 设置错误监听器
     * @private
     */
    _setupErrorListeners() {
        // 监听未捕获的错误
        window.addEventListener('error', (event) => {
            this.error('Uncaught error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });

        // 监听未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            this.error('Unhandled promise rejection', {
                reason: event.reason
            });
        });
    }

    /**
     * 记录调试日志
     * @param {string} message 日志消息
     * @param {*} data 附加数据
     */
    debug(message, data = null) {
        this._log(LogLevel.DEBUG, message, data);
    }

    /**
     * 记录信息日志
     * @param {string} message 日志消息
     * @param {*} data 附加数据
     */
    info(message, data = null) {
        this._log(LogLevel.INFO, message, data);
    }

    /**
     * 记录警告日志
     * @param {string} message 日志消息
     * @param {*} data 附加数据
     */
    warn(message, data = null) {
        this.warningCount++;
        this._log(LogLevel.WARN, message, data);
    }

    /**
     * 记录错误日志
     * @param {string} message 日志消息
     * @param {*} data 附加数据
     */
    error(message, data = null) {
        this.errorCount++;
        this._log(LogLevel.ERROR, message, data);
    }

    /**
     * 记录致命错误日志
     * @param {string} message 日志消息
     * @param {*} data 附加数据
     */
    fatal(message, data = null) {
        this._log(LogLevel.FATAL, message, data);
    }

    /**
     * 内部日志记录方法
     * @private
     * @param {number} level 日志级别
     * @param {string} message 日志消息
     * @param {*} data 附加数据
     */
    _log(level, message, data) {
        // 检查日志级别
        if (level < this.level) {
            return;
        }

        // 创建日志条目
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: LOG_LEVEL_NAMES[level],
            name: this.name,
            message,
            data,
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        // 控制台输出
        if (this.enableConsole) {
            this._consoleLog(level, logEntry);
        }

        // 存储日志
        if (this.enableStorage) {
            this._storeLog(logEntry);
        }

        // 远程日志
        if (this.enableRemote && this.remoteEndpoint) {
            this._sendRemoteLog(logEntry);
        }
    }

    /**
     * 控制台日志输出
     * @private
     * @param {number} level 日志级别
     * @param {Object} logEntry 日志条目
     */
    _consoleLog(level, logEntry) {
        const prefix = `[${logEntry.timestamp}] [${logEntry.level}] [${logEntry.name}]`;
        
        switch (level) {
            case LogLevel.DEBUG:
                console.debug(prefix, logEntry.message, logEntry.data);
                break;
            case LogLevel.INFO:
                console.info(prefix, logEntry.message, logEntry.data);
                break;
            case LogLevel.WARN:
                console.warn(prefix, logEntry.message, logEntry.data);
                break;
            case LogLevel.ERROR:
            case LogLevel.FATAL:
                console.error(prefix, logEntry.message, logEntry.data);
                break;
        }
    }

    /**
     * 存储日志
     * @private
     * @param {Object} logEntry 日志条目
     */
    _storeLog(logEntry) {
        try {
            this.logCache.push(logEntry);
            
            // 限制存储大小
            if (this.logCache.length > this.maxStorageSize) {
                this.logCache = this.logCache.slice(-this.maxStorageSize);
            }
            
            localStorage.setItem('yiweb_logs', JSON.stringify(this.logCache));
        } catch (error) {
            console.warn('Failed to store log:', error);
        }
    }

    /**
     * 发送远程日志
     * @private
     * @param {Object} logEntry 日志条目
     */
    async _sendRemoteLog(logEntry) {
        try {
            await fetch(this.remoteEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(logEntry)
            });
        } catch (error) {
            console.warn('Failed to send remote log:', error);
        }
    }

    /**
     * 性能监控 - 开始标记
     * @param {string} name 标记名称
     */
    mark(name) {
        if (performance && performance.mark) {
            performance.mark(name);
            this.performanceMarks.set(name, Date.now());
        }
    }

    /**
     * 性能监控 - 结束标记并测量
     * @param {string} name 测量名称
     * @param {string} startMark 开始标记
     * @param {string} endMark 结束标记
     */
    measure(name, startMark, endMark) {
        if (performance && performance.measure) {
            try {
                const measure = performance.measure(name, startMark, endMark);
                this.performanceMeasures.set(name, measure.duration);
                this.info(`Performance measure: ${name}`, { duration: measure.duration });
            } catch (error) {
                this.warn(`Failed to measure performance: ${name}`, error);
            }
        }
    }

    /**
     * 获取日志统计信息
     * @returns {Object}
     */
    getStats() {
        return {
            totalLogs: this.logCache.length,
            errorCount: this.errorCount,
            warningCount: this.warningCount,
            performanceMarks: this.performanceMarks.size,
            performanceMeasures: this.performanceMeasures.size
        };
    }

    /**
     * 获取存储的日志
     * @param {number} limit 限制数量
     * @returns {Array}
     */
    getStoredLogs(limit = 100) {
        return this.logCache.slice(-limit);
    }

    /**
     * 清除存储的日志
     */
    clearStoredLogs() {
        this.logCache = [];
        localStorage.removeItem('yiweb_logs');
        this.info('Stored logs cleared');
    }

    /**
     * 设置日志级别
     * @param {number} level 日志级别
     */
    setLevel(level) {
        if (LogLevel[level] !== undefined) {
            this.level = level;
            localStorage.setItem('yiweb_log_level', level);
            this.info('Log level changed', { newLevel: level });
        }
    }

    /**
     * 获取当前日志级别
     * @returns {string}
     */
    getLevel() {
        return LOG_LEVEL_NAMES[this.level];
    }

    /**
     * 导出日志
     * @returns {string}
     */
    exportLogs() {
        return JSON.stringify({
            stats: this.getStats(),
            logs: this.logCache,
            performance: {
                marks: Object.fromEntries(this.performanceMarks),
                measures: Object.fromEntries(this.performanceMeasures)
            }
        }, null, 2);
    }
}

// 创建默认日志实例
export const defaultLogger = new Logger('YiWeb'); 