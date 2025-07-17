/**
 * YiWeb 主应用入口
 * @author liangliang
 * @version 2.0.0
 * @description 重构后的主应用入口，采用现代模块化架构
 */

import { App } from './core/App.js';
import { Config } from './core/Config.js';
import { Router } from './core/Router.js';
import { Store } from './core/Store.js';
import { Utils } from './utils/Utils.js';
import { Logger } from './utils/Logger.js';
import { PerformanceMonitor } from './core/PerformanceMonitor.js';

/**
 * 应用初始化类 - 重构版本
 */
class YiWebApp {
    constructor() {
        this.app = null;
        this.config = null;
        this.router = null;
        this.store = null;
        this.utils = null;
        this.logger = null;
        this.performanceMonitor = null;
        
        // 应用状态
        this.isInitialized = false;
        this.isRunning = false;
        this.initPromise = null;
    }

    /**
     * 初始化应用
     * @returns {Promise<void>}
     */
    async init() {
        // 防止重复初始化
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._init();
        return this.initPromise;
    }

    /**
     * 内部初始化方法
     * @private
     */
    async _init() {
        try {
            this.logger = new Logger('YiWebApp');
            this.performanceMonitor = new PerformanceMonitor();
            
            this.logger.info('开始初始化 YiWeb 应用');
            this.performanceMonitor.start('app-init');

            // 1. 初始化配置
            await this._initConfig();
            
            // 2. 初始化工具类
            await this._initUtils();
            
            // 3. 初始化状态管理
            await this._initStore();
            
            // 4. 初始化路由
            await this._initRouter();
            
            // 5. 初始化主应用
            await this._initApp();
            
            // 6. 启动应用
            await this._startApp();
            
            this.isInitialized = true;
            this.isRunning = true;
            
            this.performanceMonitor.end('app-init');
            this.logger.info('YiWeb 应用初始化完成');
            
            // 触发应用就绪事件
            this._emitAppReady();
            
        } catch (error) {
            this.logger.error('应用初始化失败:', error);
            await this._handleInitError(error);
            throw error;
        }
    }

    /**
     * 初始化配置
     * @private
     */
    async _initConfig() {
        this.logger.info('初始化配置模块');
        this.config = new Config();
        await this.config.load();
        this.logger.info('配置模块初始化完成');
    }

    /**
     * 初始化工具类
     * @private
     */
    async _initUtils() {
        this.logger.info('初始化工具模块');
        this.utils = new Utils();
        this.logger.info('工具模块初始化完成');
    }

    /**
     * 初始化状态管理
     * @private
     */
    async _initStore() {
        this.logger.info('初始化状态管理');
        this.store = new Store();
        await this.store.init();
        this.logger.info('状态管理初始化完成');
    }

    /**
     * 初始化路由
     * @private
     */
    async _initRouter() {
        this.logger.info('初始化路由模块');
        this.router = new Router(this.store);
        await this.router.init();
        this.logger.info('路由模块初始化完成');
    }

    /**
     * 初始化主应用
     * @private
     */
    async _initApp() {
        this.logger.info('初始化主应用');
        this.app = new App({
            config: this.config,
            router: this.router,
            store: this.store,
            utils: this.utils,
            logger: this.logger,
            performanceMonitor: this.performanceMonitor
        });
        this.logger.info('主应用初始化完成');
    }

    /**
     * 启动应用
     * @private
     */
    async _startApp() {
        this.logger.info('启动应用');
        await this.app.start();
        this.logger.info('应用启动完成');
    }

    /**
     * 处理初始化错误
     * @private
     */
    async _handleInitError(error) {
        // 显示用户友好的错误信息
        this._showErrorMessage('应用启动失败，请刷新页面重试');
        
        // 记录详细错误信息
        this.logger.error('初始化错误详情:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        // 尝试恢复
        await this._attemptRecovery();
    }

    /**
     * 尝试恢复
     * @private
     */
    async _attemptRecovery() {
        try {
            this.logger.info('尝试应用恢复');
            
            // 清理资源
            await this._cleanup();
            
            // 重新初始化核心模块
            await this._initConfig();
            await this._initUtils();
            
            this.logger.info('恢复完成');
        } catch (error) {
            this.logger.error('恢复失败:', error);
        }
    }

    /**
     * 清理资源
     * @private
     */
    async _cleanup() {
        if (this.app) {
            await this.app.stop();
        }
        if (this.router) {
            await this.router.destroy();
        }
        if (this.store) {
            await this.store.destroy();
        }
    }

    /**
     * 显示错误信息
     * @private
     */
    _showErrorMessage(message) {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            errorElement.setAttribute('aria-live', 'assertive');
        }
    }

    /**
     * 触发应用就绪事件
     * @private
     */
    _emitAppReady() {
        const event = new CustomEvent('yiweb:ready', {
            detail: {
                app: this.app,
                config: this.config,
                store: this.store,
                router: this.router
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * 获取应用状态
     * @returns {Object}
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isRunning: this.isRunning,
            config: this.config?.getStatus(),
            store: this.store?.getStatus(),
            router: this.router?.getStatus(),
            app: this.app?.getStatus()
        };
    }

    /**
     * 停止应用
     */
    async stop() {
        this.logger.info('停止应用');
        this.isRunning = false;
        await this._cleanup();
        this.logger.info('应用已停止');
    }
}

// 创建应用实例
const yiWebApp = new YiWebApp();

// 应用启动函数
async function startApp() {
    try {
        await yiWebApp.init();
    } catch (error) {
        console.error('应用启动失败:', error);
    }
}

// 等待DOM加载完成后启动
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}

// 导出应用实例供调试使用
window.YiWebApp = yiWebApp;

// 监听应用就绪事件
document.addEventListener('yiweb:ready', (event) => {
    console.log('YiWeb 应用已就绪:', event.detail);
});

// 错误处理
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
    if (yiWebApp.logger) {
        yiWebApp.logger.error('全局错误:', event.error);
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason);
    if (yiWebApp.logger) {
        yiWebApp.logger.error('未处理的Promise拒绝:', event.reason);
    }
}); 