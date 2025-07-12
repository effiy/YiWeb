/**
 * 统一配置管理系统
 
 * 
 * 整合项目中所有模块的配置，提供统一的配置接口
 */

/**
 * 基础配置
 */
export const BASE_CONFIG = {
    // 项目信息
    PROJECT_NAME: 'YiWeb',
    PROJECT_VERSION: '1.1.0',
    PROJECT_AUTHOR: 'lixuan',
    
    // 环境配置
    NODE_ENV: 'development',
    DEBUG: true,
    
    // API配置
    API_BASE_URL: '',
    API_TIMEOUT: 10000,
    
    // 存储配置
    STORAGE_PREFIX: 'yiweb_',
    CACHE_DURATION: 24 * 60 * 60 * 1000, // 24小时
    
    // 性能配置
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 100,
    ANIMATION_DURATION: 300,
    
    // 分页配置
    PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    
    // 文件配置
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_TYPES: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
    
    // 错误处理
    ERROR_RETRY_COUNT: 3,
    ERROR_RETRY_DELAY: 1000,
    
    // 日志配置
    LOG_LEVEL: 'info',
    LOG_MAX_ENTRIES: 1000
};

/**
 * UI配置
 */
export const UI_CONFIG = {
    // 主题配置
    DEFAULT_THEME: 'light',
    THEMES: ['light', 'dark', 'auto'],
    
    // 布局配置
    HEADER_HEIGHT: 60,
    SIDEBAR_WIDTH: 250,
    FOOTER_HEIGHT: 40,
    
    // 响应式断点
    BREAKPOINTS: {
        mobile: 768,
        tablet: 1024,
        desktop: 1200,
        wide: 1440
    },
    
    // 动画配置
    ANIMATION_EASING: 'ease-in-out',
    ANIMATION_DURATION: 300,
    
    // 文本框配置
    MIN_TEXTAREA_HEIGHT: 40,
    MAX_TEXTAREA_HEIGHT: 200,
    
    // 模态框配置
    MODAL_Z_INDEX: 1000,
    OVERLAY_OPACITY: 0.5,
    
    // 提示配置
    TOAST_DURATION: 3000,
    TOAST_POSITION: 'top-right',
    
    // 加载配置
    LOADING_DELAY: 200,
    LOADING_MIN_DURATION: 500
};

/**
 * 搜索配置
 */
export const SEARCH_CONFIG = {
    // 搜索参数
    MIN_SEARCH_LENGTH: 2,
    MAX_SEARCH_LENGTH: 100,
    SEARCH_DEBOUNCE_DELAY: 300,
    
    // 搜索历史
    MAX_SEARCH_HISTORY: 10,
    SEARCH_HISTORY_KEY: 'searchHistory',
    
    // 搜索建议
    MAX_SUGGESTIONS: 5,
    SUGGESTION_DELAY: 500,
    
    // 搜索结果
    SEARCH_RESULTS_PER_PAGE: 20,
    MAX_SEARCH_RESULTS: 100,
    
    // 高亮配置
    HIGHLIGHT_CLASS: 'search-highlight',
    HIGHLIGHT_TAG: 'mark'
};

/**
 * 新闻模块配置
 */
export const NEWS_CONFIG = {
    // API配置
    API_ENDPOINT: '/api/news',
    RSS_ENDPOINTS: [
        'https://feeds.36kr.com/api/feed',
        'https://www.huxiu.com/rss/0.xml',
        'https://www.tmtpost.com/rss.xml'
    ],
    
    // 缓存配置
    CACHE_KEY: 'newsCache',
    CACHE_DURATION: 30 * 60 * 1000, // 30分钟
    MAX_CACHE_SIZE: 1000,
    
    // 分页配置
    NEWS_PER_PAGE: 20,
    MAX_NEWS_ITEMS: 500,
    
    // 分类配置
    CATEGORIES: [
        { key: 'tech', title: '科技', keywords: ['科技', '技术', '互联网', 'AI', '人工智能'] },
        { key: 'business', title: '商业', keywords: ['商业', '企业', '投资', '融资', '创业'] },
        { key: 'finance', title: '财经', keywords: ['财经', '金融', '股市', '经济', '银行'] },
        { key: 'startup', title: '创业', keywords: ['创业', '创新', '孵化', '天使', '风投'] },
        { key: 'mobile', title: '移动', keywords: ['移动', '手机', 'APP', '应用', '移动互联网'] },
        { key: 'game', title: '游戏', keywords: ['游戏', '电竞', '手游', '网游', '娱乐'] },
        { key: 'other', title: '其他', keywords: [] }
    ],
    
    // 时间格式
    DATE_FORMAT: 'YYYY-MM-DD',
    TIME_FORMAT: 'HH:mm:ss',
    DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
    
    // 内容处理
    EXCERPT_LENGTH: 150,
    TITLE_MAX_LENGTH: 100,
    
    // 更新频率
    UPDATE_INTERVAL: 5 * 60 * 1000, // 5分钟
    RETRY_INTERVAL: 30 * 1000 // 30秒
};

/**
 * 快捷键模块配置
 */
export const SHORTCUTS_CONFIG = {
    // 分类配置
    CATEGORIES: [
        { key: 'basic', title: '基础操作', icon: 'keyboard' },
        { key: 'edit', title: '编辑功能', icon: 'edit' },
        { key: 'search', title: '搜索替换', icon: 'search' },
        { key: 'window', title: '窗口操作', icon: 'window-maximize' },
        { key: 'file', title: '文件操作', icon: 'file' },
        { key: 'advanced', title: '高级功能', icon: 'cog' }
    ],
    
    // 搜索配置
    SEARCH_DEBOUNCE: 300,
    SEARCH_MIN_LENGTH: 1,
    
    // 动画配置
    ANIMATION_DURATION: 300,
    STAGGER_DELAY: 50,
    
    // 缓存配置
    CACHE_KEY: 'shortcutsCache',
    CACHE_DURATION: 60 * 60 * 1000, // 1小时
    
    // 显示配置
    ITEMS_PER_CATEGORY: 50,
    MAX_SEARCH_RESULTS: 100
};

/**
 * 动画配置
 */
export const ANIMATION_CONFIG = {
    // 基础动画时长
    DURATION: {
        fast: 150,
        normal: 300,
        slow: 500
    },
    
    // 缓动函数
    EASING: {
        linear: 'linear',
        ease: 'ease',
        easeIn: 'ease-in',
        easeOut: 'ease-out',
        easeInOut: 'ease-in-out',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    },
    
    // 动画延迟
    DELAY: {
        short: 50,
        medium: 100,
        long: 200
    },
    
    // 页面切换动画
    PAGE_TRANSITION: {
        duration: 300,
        easing: 'ease-in-out'
    },
    
    // 加载动画
    LOADING: {
        duration: 1000,
        easing: 'linear'
    }
};

/**
 * 错误处理配置
 */
export const ERROR_CONFIG = {
    // 错误类型
    ERROR_TYPES: {
        NETWORK: 'network',
        VALIDATION: 'validation',
        PERMISSION: 'permission',
        NOT_FOUND: 'not_found',
        SERVER: 'server',
        UNKNOWN: 'unknown'
    },
    
    // 错误消息
    ERROR_MESSAGES: {
        NETWORK_ERROR: '网络连接失败，请检查网络设置',
        VALIDATION_ERROR: '输入数据不合法，请检查输入内容',
        PERMISSION_ERROR: '权限不足，无法执行该操作',
        NOT_FOUND_ERROR: '请求的资源不存在',
        SERVER_ERROR: '服务器错误，请稍后重试',
        UNKNOWN_ERROR: '未知错误，请联系管理员'
    },
    
    // 重试配置
    RETRY_COUNT: 3,
    RETRY_DELAY: 1000,
    RETRY_MULTIPLIER: 2,
    
    // 错误上报
    ERROR_REPORTING: {
        enabled: true,
        maxErrors: 50,
        reportInterval: 5 * 60 * 1000 // 5分钟
    }
};

/**
 * 配置管理器类
 */
class ConfigManager {
    constructor() {
        this.config = {
            base: BASE_CONFIG,
            ui: UI_CONFIG,
            search: SEARCH_CONFIG,
            news: NEWS_CONFIG,
            shortcuts: SHORTCUTS_CONFIG,
            animation: ANIMATION_CONFIG,
            error: ERROR_CONFIG
        };
        
        this.overrides = {};
        this.listeners = new Set();
    }

    /**
     * 获取配置值
     * @param {string} path - 配置路径，如 'base.API_TIMEOUT' 或 'ui.THEMES'
     * @param {*} defaultValue - 默认值
     * @returns {*} 配置值
     */
    get(path, defaultValue = undefined) {
        const keys = path.split('.');
        let value = this.config;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                value = undefined;
                break;
            }
        }
        
        // 检查是否有覆盖值
        if (this.overrides[path] !== undefined) {
            value = this.overrides[path];
        }
        
        return value !== undefined ? value : defaultValue;
    }

    /**
     * 设置配置值
     * @param {string} path - 配置路径
     * @param {*} value - 配置值
     */
    set(path, value) {
        this.overrides[path] = value;
        this.notifyListeners(path, value);
    }

    /**
     * 重置配置值
     * @param {string} path - 配置路径
     */
    reset(path) {
        delete this.overrides[path];
        this.notifyListeners(path, this.get(path));
    }

    /**
     * 批量设置配置
     * @param {Object} config - 配置对象
     */
    setMany(config) {
        Object.entries(config).forEach(([path, value]) => {
            this.overrides[path] = value;
        });
        
        this.notifyListeners('batch', config);
    }

    /**
     * 添加配置变化监听器
     * @param {Function} listener - 监听器函数
     */
    addListener(listener) {
        this.listeners.add(listener);
    }

    /**
     * 移除配置变化监听器
     * @param {Function} listener - 监听器函数
     */
    removeListener(listener) {
        this.listeners.delete(listener);
    }

    /**
     * 通知监听器
     * @param {string} path - 配置路径
     * @param {*} value - 配置值
     */
    notifyListeners(path, value) {
        this.listeners.forEach(listener => {
            try {
                listener(path, value);
            } catch (error) {
                console.error('配置监听器错误:', error);
            }
        });
    }

    /**
     * 获取所有配置
     * @returns {Object} 配置对象
     */
    getAll() {
        return {
            ...this.config,
            overrides: this.overrides
        };
    }

    /**
     * 清除所有覆盖配置
     */
    clearOverrides() {
        this.overrides = {};
        this.notifyListeners('clear', {});
    }
}

/**
 * 全局配置管理器实例
 */
export const configManager = new ConfigManager();

/**
 * 便捷的配置获取函数
 * @param {string} path - 配置路径
 * @param {*} defaultValue - 默认值
 * @returns {*} 配置值
 */
export function getConfig(path, defaultValue) {
    return configManager.get(path, defaultValue);
}

/**
 * 便捷的配置设置函数
 * @param {string} path - 配置路径
 * @param {*} value - 配置值
 */
export function setConfig(path, value) {
    configManager.set(path, value);
}

// 导出默认配置对象
export default {
    BASE_CONFIG,
    UI_CONFIG,
    SEARCH_CONFIG,
    NEWS_CONFIG,
    SHORTCUTS_CONFIG,
    ANIMATION_CONFIG,
    ERROR_CONFIG,
    ConfigManager,
    configManager,
    getConfig,
    setConfig
}; 