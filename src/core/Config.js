/**
 * 配置管理类 - 重构版本
 * @author liangliang
 * @version 2.0.0
 * @description 采用现代化配置管理，支持环境变量、本地存储和远程配置
 */

/**
 * 配置来源枚举
 */
export const ConfigSource = {
    DEFAULT: 'default',
    ENV: 'environment',
    LOCAL: 'local',
    REMOTE: 'remote',
    USER: 'user'
};

/**
 * 配置管理类 - 重构版本
 */
export class Config {
    constructor(options = {}) {
        // 配置选项
        this.options = {
            enableLocalStorage: true,
            enableRemoteConfig: false,
            remoteConfigUrl: null,
            configKey: 'yiweb_config',
            userConfigKey: 'yiweb_user_config',
            ...options
        };
        
        // 配置存储
        this.configs = new Map();
        this.configSources = new Map();
        this.configWatchers = new Map();
        
        // 默认配置
        this.defaultConfig = {
            // 应用基础配置
            app: {
                name: 'YiWeb',
                version: '2.0.0',
                title: 'YiWeb - 智能AI助手',
                description: 'AI智能助手，为您提供问答、数据分析和代码编写等服务',
                language: 'zh-CN',
                timezone: 'Asia/Shanghai'
            },
            
            // 主题配置
            theme: {
                mode: 'light',
                primaryColor: '#4f46e5',
                accentColor: '#f59e0b',
                fontSize: 'medium',
                reducedMotion: false,
                highContrast: false
            },
            
            // 功能配置
            features: {
                search: {
                    enabled: true,
                    maxHistory: 50,
                    suggestions: true,
                    autoComplete: true
                },
                news: {
                    enabled: true,
                    autoRefresh: true,
                    refreshInterval: 300000, // 5分钟
                    maxItems: 100
                },
                shortcuts: {
                    enabled: true,
                    maxItems: 20
                },
                analytics: {
                    enabled: false,
                    trackingId: null
                }
            },
            
            // API配置
            api: {
                baseUrl: 'https://api.yiweb.com',
                timeout: 10000,
                retryAttempts: 3,
                retryDelay: 1000
            },
            
            // 性能配置
            performance: {
                enableMonitoring: true,
                enableCaching: true,
                cacheSize: 100,
                lazyLoading: true
            },
            
            // 安全配置
            security: {
                enableCSP: true,
                enableHSTS: true,
                enableXSS: true,
                allowedOrigins: ['https://yiweb.com']
            },
            
            // 调试配置
            debug: {
                enabled: false,
                logLevel: 'info',
                enableConsole: true,
                enableRemoteLogging: false
            }
        };
        
        // 环境配置
        this.envConfig = {};
        
        // 用户配置
        this.userConfig = {};
        
        // 远程配置
        this.remoteConfig = {};
        
        // 初始化
        this._init();
    }

    /**
     * 初始化配置管理器
     * @private
     */
    _init() {
        // 加载环境配置
        this._loadEnvConfig();
        
        // 加载本地配置
        this._loadLocalConfig();
        
        // 加载用户配置
        this._loadUserConfig();
        
        // 合并配置
        this._mergeConfigs();
        
        // 设置配置监听器
        this._setupConfigWatchers();
    }

    /**
     * 加载环境配置
     * @private
     */
    _loadEnvConfig() {
        // 从环境变量加载配置
        if (typeof process !== 'undefined' && process.env) {
            this.envConfig = {
                app: {
                    name: process.env.YIWEB_APP_NAME || this.defaultConfig.app.name,
                    version: process.env.YIWEB_APP_VERSION || this.defaultConfig.app.version
                },
                api: {
                    baseUrl: process.env.YIWEB_API_BASE_URL || this.defaultConfig.api.baseUrl,
                    timeout: parseInt(process.env.YIWEB_API_TIMEOUT) || this.defaultConfig.api.timeout
                },
                debug: {
                    enabled: process.env.YIWEB_DEBUG === 'true' || this.defaultConfig.debug.enabled,
                    logLevel: process.env.YIWEB_LOG_LEVEL || this.defaultConfig.debug.logLevel
                }
            };
        }
        
        // 从浏览器环境变量加载
        if (typeof window !== 'undefined') {
            const envVars = window.YIWEB_ENV || {};
            this.envConfig = this.merge(this.envConfig, envVars);
        }
    }

    /**
     * 加载本地配置
     * @private
     */
    _loadLocalConfig() {
        if (!this.options.enableLocalStorage) {
            return;
        }
        
        try {
            const stored = localStorage.getItem(this.options.configKey);
            if (stored) {
                const localConfig = JSON.parse(stored);
                this.configs.set(ConfigSource.LOCAL, localConfig);
            }
        } catch (error) {
            console.warn('Failed to load local config:', error);
        }
    }

    /**
     * 加载用户配置
     * @private
     */
    _loadUserConfig() {
        try {
            const stored = localStorage.getItem(this.options.userConfigKey);
            if (stored) {
                this.userConfig = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Failed to load user config:', error);
        }
    }

    /**
     * 合并配置
     * @private
     */
    _mergeConfigs() {
        // 按优先级合并配置
        let mergedConfig = this.deepClone(this.defaultConfig);
        
        // 合并环境配置
        mergedConfig = this.merge(mergedConfig, this.envConfig);
        
        // 合并本地配置
        const localConfig = this.configs.get(ConfigSource.LOCAL);
        if (localConfig) {
            mergedConfig = this.merge(mergedConfig, localConfig);
        }
        
        // 合并远程配置
        if (this.remoteConfig) {
            mergedConfig = this.merge(mergedConfig, this.remoteConfig);
        }
        
        // 合并用户配置（最高优先级）
        mergedConfig = this.merge(mergedConfig, this.userConfig);
        
        // 存储合并后的配置
        this.configs.set('merged', mergedConfig);
    }

    /**
     * 设置配置监听器
     * @private
     */
    _setupConfigWatchers() {
        // 监听配置变化
        this.on('config:changed', (key, value, source) => {
            this._handleConfigChange(key, value, source);
        });
    }

    /**
     * 处理配置变化
     * @private
     */
    _handleConfigChange(key, value, source) {
        // 更新用户配置
        if (source === ConfigSource.USER) {
            this.setUserConfig(key, value);
        }
        
        // 触发配置变化事件
        this.emit('config:updated', { key, value, source });
        
        // 执行配置监听器
        const watchers = this.configWatchers.get(key);
        if (watchers) {
            watchers.forEach(watcher => {
                try {
                    watcher(value, key);
                } catch (error) {
                    console.error('Config watcher error:', error);
                }
            });
        }
    }

    /**
     * 加载配置
     */
    async load() {
        try {
            // 加载远程配置
            if (this.options.enableRemoteConfig && this.options.remoteConfigUrl) {
                await this._loadRemoteConfig();
            }
            
            // 重新合并配置
            this._mergeConfigs();
            
            console.log('Configuration loaded successfully');
        } catch (error) {
            console.error('Failed to load configuration:', error);
            throw error;
        }
    }

    /**
     * 加载远程配置
     * @private
     */
    async _loadRemoteConfig() {
        try {
            const response = await fetch(this.options.remoteConfigUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                cache: 'no-cache'
            });
            
            if (response.ok) {
                this.remoteConfig = await response.json();
                this.configs.set(ConfigSource.REMOTE, this.remoteConfig);
            }
        } catch (error) {
            console.warn('Failed to load remote config:', error);
        }
    }

    /**
     * 获取配置值
     * @param {string} key 配置键
     * @param {*} defaultValue 默认值
     * @returns {*}
     */
    get(key, defaultValue = undefined) {
        const config = this.configs.get('merged');
        if (!config) {
            return defaultValue;
        }
        
        return this.getNestedValue(config, key, defaultValue);
    }

    /**
     * 设置配置值
     * @param {string} key 配置键
     * @param {*} value 配置值
     * @param {string} source 配置来源
     */
    set(key, value, source = ConfigSource.USER) {
        const config = this.configs.get('merged');
        if (!config) {
            return;
        }
        
        this.setNestedValue(config, key, value);
        this.configs.set('merged', config);
        
        // 触发配置变化事件
        this.emit('config:changed', key, value, source);
    }

    /**
     * 设置用户配置
     * @param {string} key 配置键
     * @param {*} value 配置值
     */
    setUserConfig(key, value) {
        this.setNestedValue(this.userConfig, key, value);
        this._saveUserConfig();
    }

    /**
     * 获取用户配置
     * @param {string} key 配置键
     * @param {*} defaultValue 默认值
     * @returns {*}
     */
    getUserConfig(key, defaultValue = undefined) {
        return this.getNestedValue(this.userConfig, key, defaultValue);
    }

    /**
     * 获取所有配置
     * @returns {Object}
     */
    getAll() {
        return this.configs.get('merged') || {};
    }

    /**
     * 获取用户配置
     * @returns {Object}
     */
    getUserConfigAll() {
        return this.userConfig;
    }

    /**
     * 重置用户配置
     */
    resetUserConfig() {
        this.userConfig = {};
        this._saveUserConfig();
        this._mergeConfigs();
        this.emit('config:reset');
    }

    /**
     * 添加配置监听器
     * @param {string} key 配置键
     * @param {Function} watcher 监听器函数
     */
    watch(key, watcher) {
        if (!this.configWatchers.has(key)) {
            this.configWatchers.set(key, []);
        }
        this.configWatchers.get(key).push(watcher);
    }

    /**
     * 移除配置监听器
     * @param {string} key 配置键
     * @param {Function} watcher 监听器函数
     */
    unwatch(key, watcher) {
        const watchers = this.configWatchers.get(key);
        if (watchers) {
            const index = watchers.indexOf(watcher);
            if (index > -1) {
                watchers.splice(index, 1);
            }
        }
    }

    /**
     * 验证配置
     * @param {Object} config 配置对象
     * @returns {Object} 验证结果
     */
    validate(config) {
        const errors = [];
        const warnings = [];
        
        // 验证必需配置
        const requiredKeys = ['app.name', 'app.version', 'api.baseUrl'];
        requiredKeys.forEach(key => {
            if (!this.getNestedValue(config, key)) {
                errors.push(`Missing required config: ${key}`);
            }
        });
        
        // 验证配置类型
        if (config.api && typeof config.api.timeout !== 'number') {
            warnings.push('api.timeout should be a number');
        }
        
        if (config.debug && typeof config.debug.enabled !== 'boolean') {
            warnings.push('debug.enabled should be a boolean');
        }
        
        return { errors, warnings, isValid: errors.length === 0 };
    }

    /**
     * 导出配置
     * @param {string} format 导出格式
     * @returns {string}
     */
    export(format = 'json') {
        const config = this.getAll();
        
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(config, null, 2);
            case 'env':
                return this._convertToEnv(config);
            default:
                return JSON.stringify(config);
        }
    }

    /**
     * 转换为环境变量格式
     * @private
     */
    _convertToEnv(config, prefix = 'YIWEB') {
        const envVars = [];
        
        const flatten = (obj, path = '') => {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const fullPath = path ? `${path}_${key.toUpperCase()}` : key.toUpperCase();
                    if (typeof obj[key] === 'object' && obj[key] !== null) {
                        flatten(obj[key], fullPath);
                    } else {
                        envVars.push(`${prefix}_${fullPath}=${obj[key]}`);
                    }
                }
            }
        };
        
        flatten(config);
        return envVars.join('\n');
    }

    /**
     * 获取嵌套属性值
     * @private
     */
    getNestedValue(obj, path, defaultValue) {
        const keys = path.split('.');
        let result = obj;
        
        for (const key of keys) {
            if (result && typeof result === 'object' && key in result) {
                result = result[key];
            } else {
                return defaultValue;
            }
        }
        
        return result;
    }

    /**
     * 设置嵌套属性值
     * @private
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    /**
     * 保存用户配置
     * @private
     */
    _saveUserConfig() {
        try {
            localStorage.setItem(this.options.userConfigKey, JSON.stringify(this.userConfig));
        } catch (error) {
            console.error('Failed to save user config:', error);
        }
    }

    /**
     * 深拷贝对象
     * @private
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }
        
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }
        
        return obj;
    }

    /**
     * 合并对象
     * @private
     */
    merge(target, ...sources) {
        return sources.reduce((result, source) => {
            if (source && typeof source === 'object') {
                for (const key in source) {
                    if (source.hasOwnProperty(key)) {
                        if (result[key] && typeof result[key] === 'object' && typeof source[key] === 'object') {
                            result[key] = this.merge(result[key], source[key]);
                        } else {
                            result[key] = source[key];
                        }
                    }
                }
            }
            return result;
        }, target);
    }

    /**
     * 事件发射器
     */
    emit(event, ...args) {
        const eventListeners = this.eventListeners?.[event] || [];
        eventListeners.forEach(listener => {
            try {
                listener(...args);
            } catch (error) {
                console.error('Event listener error:', error);
            }
        });
    }

    /**
     * 事件监听器
     */
    on(event, listener) {
        if (!this.eventListeners) {
            this.eventListeners = {};
        }
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(listener);
    }

    /**
     * 获取状态信息
     */
    getStatus() {
        return {
            sources: Array.from(this.configs.keys()),
            userConfigKeys: Object.keys(this.userConfig),
            watchers: this.configWatchers.size,
            validation: this.validate(this.getAll())
        };
    }
} 