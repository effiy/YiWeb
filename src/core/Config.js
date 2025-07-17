/**
 * 配置管理类
 * @author liangliang
 * @version 1.0.0
 */

/**
 * 配置管理类
 */
export class Config {
    constructor() {
        this.config = new Map();
        this.defaults = this.getDefaultConfig();
        this.loaded = false;
    }

    /**
     * 获取默认配置
     */
    getDefaultConfig() {
        return {
            // 应用基础配置
            app: {
                title: 'YiWeb - 智能AI助手',
                version: '1.0.0',
                language: 'zh-CN',
                theme: 'light'
            },
            
            // 功能配置
            features: {
                search: {
                    maxLength: 2000,
                    placeholder: '我可以帮助您分析数据、编写代码、生图创造...',
                    autoFocus: true
                },
                shortcuts: {
                    enabled: true,
                    ctrlK: 'focus-search',
                    ctrlN: 'open-news',
                    ctrlS: 'open-shortcuts'
                },
                news: {
                    pageSize: 20,
                    autoRefresh: true,
                    refreshInterval: 300000 // 5分钟
                }
            },
            
            // API配置
            api: {
                baseUrl: '',
                timeout: 10000,
                retryCount: 3
            },
            
            // 性能配置
            performance: {
                lazyLoad: true,
                preload: true,
                cache: true
            },
            
            // 无障碍配置
            accessibility: {
                enabled: true,
                highContrast: false,
                fontSize: 'medium'
            }
        };
    }

    /**
     * 加载配置
     */
    async load() {
        try {
            // 加载默认配置
            this.loadDefaults();
            
            // 加载本地存储的配置
            await this.loadFromStorage();
            
            // 加载用户配置
            await this.loadUserConfig();
            
            this.loaded = true;
            console.log('配置加载完成');
        } catch (error) {
            console.error('配置加载失败:', error);
            // 使用默认配置
            this.loadDefaults();
        }
    }

    /**
     * 加载默认配置
     */
    loadDefaults() {
        Object.entries(this.defaults).forEach(([key, value]) => {
            this.config.set(key, value);
        });
    }

    /**
     * 从本地存储加载配置
     */
    async loadFromStorage() {
        try {
            const stored = localStorage.getItem('yiweb-config');
            if (stored) {
                const parsed = JSON.parse(stored);
                Object.entries(parsed).forEach(([key, value]) => {
                    this.config.set(key, value);
                });
            }
        } catch (error) {
            console.warn('从本地存储加载配置失败:', error);
        }
    }

    /**
     * 加载用户配置
     */
    async loadUserConfig() {
        try {
            // 这里可以从服务器加载用户配置
            // 暂时使用本地存储
            const userConfig = this.getUserConfig();
            Object.entries(userConfig).forEach(([key, value]) => {
                this.config.set(key, value);
            });
        } catch (error) {
            console.warn('加载用户配置失败:', error);
        }
    }

    /**
     * 获取用户配置
     */
    getUserConfig() {
        return {
            theme: this.get('theme', 'light'),
            language: this.get('app.language', 'zh-CN'),
            shortcuts: this.get('features.shortcuts', {}),
            accessibility: this.get('accessibility', {})
        };
    }

    /**
     * 获取配置值
     */
    get(key, defaultValue = null) {
        const keys = key.split('.');
        let value = this.config;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }

    /**
     * 设置配置值
     */
    set(key, value) {
        const keys = key.split('.');
        let current = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!(k in current) || typeof current[k] !== 'object') {
                current[k] = {};
            }
            current = current[k];
        }
        
        current[keys[keys.length - 1]] = value;
        
        // 保存到本地存储
        this.saveToStorage();
    }

    /**
     * 获取所有配置
     */
    getAll() {
        const result = {};
        for (const [key, value] of this.config) {
            result[key] = value;
        }
        return result;
    }

    /**
     * 保存配置到本地存储
     */
    saveToStorage() {
        try {
            const configData = {};
            for (const [key, value] of this.config) {
                configData[key] = value;
            }
            localStorage.setItem('yiweb-config', JSON.stringify(configData));
        } catch (error) {
            console.warn('保存配置到本地存储失败:', error);
        }
    }

    /**
     * 重置配置
     */
    reset() {
        this.config.clear();
        this.loadDefaults();
        this.saveToStorage();
    }

    /**
     * 更新配置
     */
    update(updates) {
        Object.entries(updates).forEach(([key, value]) => {
            this.set(key, value);
        });
    }

    /**
     * 检查配置是否有效
     */
    validate() {
        const required = ['app.title', 'app.version', 'features.search.maxLength'];
        const missing = required.filter(key => !this.get(key));
        
        if (missing.length > 0) {
            console.warn('缺少必需配置:', missing);
            return false;
        }
        
        return true;
    }

    /**
     * 导出配置
     */
    export() {
        return JSON.stringify(this.getAll(), null, 2);
    }

    /**
     * 导入配置
     */
    import(configString) {
        try {
            const config = JSON.parse(configString);
            this.update(config);
            return true;
        } catch (error) {
            console.error('导入配置失败:', error);
            return false;
        }
    }
} 