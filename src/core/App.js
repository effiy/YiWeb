/**
 * 核心应用类 - 重构版本
 * @author liangliang
 * @version 2.0.0
 * @description 采用现代架构，支持依赖注入、生命周期管理和错误处理
 */

import { ComponentManager } from './ComponentManager.js';
import { EventManager } from './EventManager.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';

/**
 * 应用生命周期状态
 */
export const AppState = {
    INITIALIZING: 'initializing',
    READY: 'ready',
    RUNNING: 'running',
    PAUSED: 'paused',
    STOPPING: 'stopping',
    STOPPED: 'stopped',
    ERROR: 'error'
};

/**
 * 主应用类 - 重构版本
 */
export class App {
    constructor(options = {}) {
        // 依赖注入
        this.config = options.config;
        this.router = options.router;
        this.store = options.store;
        this.utils = options.utils;
        this.logger = options.logger;
        this.performanceMonitor = options.performanceMonitor;
        
        // 管理器
        this.componentManager = new ComponentManager();
        this.eventManager = new EventManager();
        
        // 应用状态
        this.state = AppState.INITIALIZING;
        this.isInitialized = false;
        this.isRunning = false;
        
        // 生命周期钩子
        this.lifecycleHooks = {
            beforeInit: [],
            afterInit: [],
            beforeStart: [],
            afterStart: [],
            beforeStop: [],
            afterStop: []
        };
        
        // 错误处理
        this.errorHandlers = [];
        this.recoveryStrategies = [];
        
        // 性能监控
        this.performanceMetrics = new Map();
        
        // 初始化
        this._init();
    }

    /**
     * 初始化应用
     * @private
     */
    _init() {
        try {
            this.logger?.info('App initialization started');
            
            // 执行初始化前钩子
            this._executeHooks('beforeInit');
            
            // 初始化基础功能
            this._initBaseFeatures();
            
            // 初始化错误处理
            this._initErrorHandling();
            
            // 初始化性能监控
            this._initPerformanceMonitoring();
            
            // 标记为已初始化
            this.isInitialized = true;
            this.state = AppState.READY;
            
            // 执行初始化后钩子
            this._executeHooks('afterInit');
            
            this.logger?.info('App initialization completed');
        } catch (error) {
            this.logger?.error('App initialization failed:', error);
            this.state = AppState.ERROR;
            this._handleError(error);
            throw error;
        }
    }

    /**
     * 初始化基础功能
     * @private
     */
    _initBaseFeatures() {
        // 初始化主题
        this._initTheme();
        
        // 初始化无障碍功能
        this._initAccessibility();
        
        // 初始化键盘快捷键
        this._initKeyboardShortcuts();
        
        // 初始化搜索功能
        this._initSearchFeatures();
    }

    /**
     * 初始化主题
     * @private
     */
    _initTheme() {
        const theme = this.config?.get('theme', 'light');
        document.documentElement.setAttribute('data-theme', theme);
        
        // 监听主题变化
        this.eventManager.on('theme:changed', (newTheme) => {
            document.documentElement.setAttribute('data-theme', newTheme);
            this.logger?.info('Theme changed', { theme: newTheme });
        });
    }

    /**
     * 初始化无障碍功能
     * @private
     */
    _initAccessibility() {
        // 设置页面标题
        document.title = this.config?.get('app.title', 'YiWeb - 智能AI助手');
        
        // 设置语言
        document.documentElement.lang = this.config?.get('app.language', 'zh-CN');
        
        // 添加无障碍属性
        this._addAccessibilityAttributes();
        
        // 监听无障碍偏好设置
        this._listenToAccessibilityPreferences();
    }

    /**
     * 添加无障碍属性
     * @private
     */
    _addAccessibilityAttributes() {
        // 为搜索框添加无障碍属性
        const searchInput = document.getElementById('messageInput');
        if (searchInput) {
            searchInput.setAttribute('aria-label', '消息输入框');
            searchInput.setAttribute('aria-describedby', 'category-filters');
        }
        
        // 为功能卡片添加无障碍属性
        const featureCards = document.querySelectorAll('.feature-card');
        featureCards.forEach((card, index) => {
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `功能卡片 ${index + 1}`);
        });
    }

    /**
     * 监听无障碍偏好设置
     * @private
     */
    _listenToAccessibilityPreferences() {
        // 监听减少动画偏好
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        prefersReducedMotion.addEventListener('change', (e) => {
            document.documentElement.setAttribute('data-reduced-motion', e.matches);
            this.logger?.info('Reduced motion preference changed', { reduced: e.matches });
        });
        
        // 监听高对比度偏好
        const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
        prefersHighContrast.addEventListener('change', (e) => {
            document.documentElement.setAttribute('data-high-contrast', e.matches);
            this.logger?.info('High contrast preference changed', { highContrast: e.matches });
        });
    }

    /**
     * 初始化键盘快捷键
     * @private
     */
    _initKeyboardShortcuts() {
        this.eventManager.on('keyboard:shortcut', (shortcut) => {
            this._handleKeyboardShortcut(shortcut);
        });
    }

    /**
     * 初始化搜索功能
     * @private
     */
    _initSearchFeatures() {
        this.eventManager.on('search:submit', (query) => {
            this._handleSearch(query);
        });
        
        this.eventManager.on('search:input', (query) => {
            this._handleSearchInput(query);
        });
    }

    /**
     * 初始化错误处理
     * @private
     */
    _initErrorHandling() {
        // 全局错误处理
        window.addEventListener('error', (event) => {
            this._handleError(event.error);
        });
        
        // Promise 错误处理
        window.addEventListener('unhandledrejection', (event) => {
            this._handleError(event.reason);
        });
    }

    /**
     * 初始化性能监控
     * @private
     */
    _initPerformanceMonitoring() {
        // 监控页面加载性能
        window.addEventListener('load', () => {
            if ('performance' in window) {
                const perfData = performance.getEntriesByType('navigation')[0];
                const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
                this.performanceMetrics.set('pageLoadTime', loadTime);
                this.logger?.info('Page load performance', { loadTime });
            }
        });
    }

    /**
     * 启动应用
     */
    async start() {
        try {
            this.logger?.info('App starting');
            this.performanceMonitor?.start('app-start');
            
            // 执行启动前钩子
            await this._executeHooks('beforeStart');
            
            // 注册事件监听
            this._registerEventListeners();
            
            // 初始化组件
            await this._initializeComponents();
            
            // 启动路由
            await this.router?.start();
            
            // 标记应用已启动
            this.isRunning = true;
            this.state = AppState.RUNNING;
            
            // 执行启动后钩子
            await this._executeHooks('afterStart');
            
            this.performanceMonitor?.end('app-start');
            this.logger?.info('App started successfully');
            
            // 触发应用启动事件
            this.eventManager.emit('app:started');
            
        } catch (error) {
            this.logger?.error('App start failed:', error);
            this.state = AppState.ERROR;
            await this._handleError(error);
            throw error;
        }
    }

    /**
     * 注册事件监听
     * @private
     */
    _registerEventListeners() {
        // 组件事件
        this.eventManager.on('component:loaded', (component) => {
            this.logger?.info('Component loaded', { component });
        });
        
        // 性能事件
        this.eventManager.on('performance:measure', (measure) => {
            this.performanceMetrics.set(measure.name, measure.duration);
        });
    }

    /**
     * 初始化组件
     * @private
     */
    async _initializeComponents() {
        // 注册基础组件
        await this.componentManager.registerComponents([
            'SearchHeader',
            'FeatureCards',
            'NewsList',
            'Shortcuts'
        ]);
        
        // 初始化组件
        await this.componentManager.initialize();
    }

    /**
     * 处理键盘快捷键
     * @private
     */
    _handleKeyboardShortcut(shortcut) {
        switch (shortcut) {
            case 'ctrl+k':
                this._focusSearch();
                break;
            case 'ctrl+n':
                this._openNewsPage();
                break;
            case 'ctrl+s':
                this._openShortcutsPage();
                break;
            default:
                this.logger?.debug('Unhandled keyboard shortcut', { shortcut });
        }
    }

    /**
     * 处理搜索
     * @private
     */
    _handleSearch(query) {
        // 更新搜索历史
        this.store?.dispatch('search/addHistory', query);
        
        // 执行搜索逻辑
        this.router?.navigate('/search', { query });
        
        this.logger?.info('Search submitted', { query });
    }

    /**
     * 处理搜索输入
     * @private
     */
    _handleSearchInput(query) {
        // 实时搜索建议
        this.eventManager.emit('search:suggestions', query);
    }

    /**
     * 聚焦搜索框
     * @private
     */
    _focusSearch() {
        const searchInput = document.getElementById('messageInput');
        if (searchInput) {
            searchInput.focus();
        }
    }

    /**
     * 打开新闻页面
     * @private
     */
    _openNewsPage() {
        window.open('pages/news/index.html', '_blank');
    }

    /**
     * 打开快捷键页面
     * @private
     */
    _openShortcutsPage() {
        window.open('pages/shortcuts/index.html', '_blank');
    }

    /**
     * 处理错误
     * @private
     */
    async _handleError(error) {
        this.logger?.error('Application error:', error);
        
        // 执行错误处理器
        for (const handler of this.errorHandlers) {
            try {
                await handler(error);
            } catch (handlerError) {
                this.logger?.error('Error handler failed:', handlerError);
            }
        }
        
        // 尝试恢复策略
        await this._attemptRecovery(error);
    }

    /**
     * 尝试恢复
     * @private
     */
    async _attemptRecovery(error) {
        for (const strategy of this.recoveryStrategies) {
            try {
                const recovered = await strategy(error);
                if (recovered) {
                    this.logger?.info('Recovery successful');
                    return;
                }
            } catch (strategyError) {
                this.logger?.error('Recovery strategy failed:', strategyError);
            }
        }
        
        this.logger?.error('All recovery strategies failed');
    }

    /**
     * 执行生命周期钩子
     * @private
     */
    async _executeHooks(hookName) {
        const hooks = this.lifecycleHooks[hookName] || [];
        for (const hook of hooks) {
            try {
                await hook();
            } catch (error) {
                this.logger?.error(`Lifecycle hook failed: ${hookName}`, error);
            }
        }
    }

    /**
     * 添加生命周期钩子
     */
    addLifecycleHook(hookName, hook) {
        if (this.lifecycleHooks[hookName]) {
            this.lifecycleHooks[hookName].push(hook);
        }
    }

    /**
     * 添加错误处理器
     */
    addErrorHandler(handler) {
        this.errorHandlers.push(handler);
    }

    /**
     * 添加恢复策略
     */
    addRecoveryStrategy(strategy) {
        this.recoveryStrategies.push(strategy);
    }

    /**
     * 暂停应用
     */
    pause() {
        this.state = AppState.PAUSED;
        this.isRunning = false;
        this.eventManager.emit('app:paused');
        this.logger?.info('App paused');
    }

    /**
     * 恢复应用
     */
    resume() {
        this.state = AppState.RUNNING;
        this.isRunning = true;
        this.eventManager.emit('app:resumed');
        this.logger?.info('App resumed');
    }

    /**
     * 停止应用
     */
    async stop() {
        try {
            this.logger?.info('App stopping');
            this.state = AppState.STOPPING;
            
            // 执行停止前钩子
            await this._executeHooks('beforeStop');
            
            // 停止路由
            await this.router?.stop();
            
            // 销毁组件
            await this.componentManager?.destroy();
            
            // 清理事件监听
            this.eventManager?.destroy();
            
            this.isRunning = false;
            this.state = AppState.STOPPED;
            
            // 执行停止后钩子
            await this._executeHooks('afterStop');
            
            this.logger?.info('App stopped');
        } catch (error) {
            this.logger?.error('App stop failed:', error);
            throw error;
        }
    }

    /**
     * 获取应用状态
     */
    getStatus() {
        return {
            state: this.state,
            isInitialized: this.isInitialized,
            isRunning: this.isRunning,
            performanceMetrics: Object.fromEntries(this.performanceMetrics),
            componentManager: this.componentManager?.getStatus(),
            eventManager: this.eventManager?.getStatus()
        };
    }

    /**
     * 更新主题配置
     */
    updateThemeConfig(theme) {
        this.config?.set('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        this.eventManager.emit('theme:changed', theme);
    }
} 