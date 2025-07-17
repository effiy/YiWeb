/**
 * YiWeb 主应用入口
 * @author liangliang
 * @version 1.0.0
 */

import { App } from './core/App.js';
import { Config } from './core/Config.js';
import { Router } from './core/Router.js';
import { Store } from './core/Store.js';
import { Utils } from './utils/Utils.js';

/**
 * 应用初始化类
 */
class YiWebApp {
    constructor() {
        this.app = null;
        this.config = null;
        this.router = null;
        this.store = null;
        this.utils = null;
    }

    /**
     * 初始化应用
     */
    async init() {
        try {
            // 初始化配置
            this.config = new Config();
            await this.config.load();

            // 初始化工具类
            this.utils = new Utils();

            // 初始化状态管理
            this.store = new Store();

            // 初始化路由
            this.router = new Router(this.store);

            // 初始化主应用
            this.app = new App({
                config: this.config,
                router: this.router,
                store: this.store,
                utils: this.utils
            });

            // 启动应用
            await this.app.start();

            console.log('YiWeb 应用启动成功');
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.handleError(error);
        }
    }

    /**
     * 错误处理
     */
    handleError(error) {
        // 显示错误信息
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = '应用启动失败，请刷新页面重试';
            errorElement.style.display = 'block';
        }

        // 记录错误日志
        console.error('应用错误:', error);
    }
}

// 创建并启动应用
const yiWebApp = new YiWebApp();

// 等待DOM加载完成后启动
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        yiWebApp.init();
    });
} else {
    yiWebApp.init();
}

// 导出应用实例供调试使用
window.YiWebApp = yiWebApp; 