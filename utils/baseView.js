/**
 * 通用视图工厂函数
 * 提供统一的Vue应用创建和挂载逻辑
 * author: liangliang
 */

import { safeExecute } from './error.js';
import { logInfo, logWarn, logError } from './log.js';

/**
 * 视图配置选项
 */
export const ViewConfig = {
    // 默认组件注册列表
    DEFAULT_COMPONENTS: [],
    
    // 默认插件加载列表
    DEFAULT_PLUGINS: [],
    
    // 默认错误处理
    DEFAULT_ERROR_HANDLER: (error) => {
        logError('[视图错误]', error);
    }
};

/**
 * 创建Vue应用实例
 * @param {Object} options - 应用配置选项
 * @param {Function} options.setup - 应用setup函数
 * @param {Array} options.components - 要注册的组件列表
 * @param {Array} options.plugins - 要加载的插件列表
 * @param {Function} options.onError - 错误处理函数
 * @returns {Promise<Object>} Vue应用实例
 */
export async function createVueApp(options = {}) {
    const {
        setup,
        components = ViewConfig.DEFAULT_COMPONENTS,
        plugins = ViewConfig.DEFAULT_PLUGINS,
        onError = ViewConfig.DEFAULT_ERROR_HANDLER
    } = options;

    // 验证必需参数
    if (typeof setup !== 'function') {
        throw new Error('setup函数是必需的');
    }

    // 创建Vue应用
    const app = Vue.createApp({
        setup,
        name: 'App'
    });

    // 注册组件（异步）
    await registerComponents(app, components);

    // 加载插件
    loadPlugins(app, plugins);

    // 设置错误处理
    app.config.errorHandler = onError;

    return app;
}

/**
 * 注册组件到Vue应用
 * @param {Object} app - Vue应用实例
 * @param {Array} componentNames - 组件名称列表
 */
async function registerComponents(app, componentNames) {
    // 等待所有组件加载完成
    await waitForComponents(componentNames);
    
    componentNames.forEach(name => {
        if (typeof window[name] !== 'undefined') {
            app.component(name, window[name]);
            try { logInfo(`[组件注册] 已注册组件: ${name}`); } catch (_) { /* 兼容性静默 */ }
        } else {
            try { logWarn(`[组件注册] 组件未找到: ${name}`); } catch (_) { /* 兼容性静默 */ }
        }
    });
}

/**
 * 加载插件到Vue应用
 * @param {Object} app - Vue应用实例
 * @param {Array} pluginNames - 插件名称列表
 */
function loadPlugins(app, pluginNames) {
    pluginNames.forEach(pluginName => {
        try {
            // 这里可以扩展插件加载逻辑
            try { logInfo(`[插件加载] 加载插件: ${pluginName}`); } catch (_) { /* 兼容性静默 */ }
        } catch (error) {
            try { logError(`[插件加载] 插件加载失败: ${pluginName}`, error); } catch (_) { /* 兼容性静默 */ }
        }
    });
}

/**
 * 挂载Vue应用到DOM
 * @param {Object} app - Vue应用实例
 * @param {string} selector - DOM选择器
 * @returns {Object} 挂载后的应用实例
 */
export function mountApp(app, selector = '#app') {
    return safeExecute(() => {
        const element = document.querySelector(selector);
        if (!element) {
            throw new Error(`DOM元素未找到: ${selector}`);
        }
        
        const mountedApp = app.mount(selector);
        try { logInfo(`[应用挂载] 应用已挂载到: ${selector}`); } catch (_) { /* 兼容性静默 */ }
        return mountedApp;
    }, '应用挂载');
}

/**
 * 创建并挂载Vue应用
 * @param {Object} options - 应用配置选项
 * @param {string} selector - DOM选择器
 * @returns {Promise<Object>} 挂载后的应用实例
 */
export async function createAndMountApp(options = {}, selector = '#app') {
    const app = await createVueApp(options);
    return mountApp(app, selector);
}

/**
 * 通用视图工厂函数
 * 创建标准的Vue应用结构
 * @param {Object} config - 视图配置
 * @param {Function} config.createStore - 创建状态管理函数
 * @param {Function} config.useComputed - 计算属性组合函数
 * @param {Function} config.useMethods - 方法组合函数
 * @param {Array} config.components - 组件列表
 * @param {Array} config.plugins - 插件列表
 * @param {Function} config.onMounted - 挂载后的回调函数
 * @param {string} config.selector - DOM选择器
 * @returns {Promise<Object>} 挂载后的应用实例
 */
export async function createBaseView(config = {}) {
    const {
        createStore,
        useComputed,
        useMethods,
        components = ViewConfig.DEFAULT_COMPONENTS,
        plugins = ViewConfig.DEFAULT_PLUGINS,
        onMounted = null,
        selector = '#app'
    } = config;

    // 验证必需函数
    if (typeof createStore !== 'function') {
        throw new Error('createStore函数是必需的');
    }
    if (typeof useComputed !== 'function') {
        throw new Error('useComputed函数是必需的');
    }
    if (typeof useMethods !== 'function') {
        throw new Error('useMethods函数是必需的');
    }

    // 创建应用setup函数
    const setup = () => {
        // 1. 创建响应式状态
        const store = createStore();

        // 2. 组合计算属性
        const computedProps = useComputed(store);

        // 3. 组合常用方法
        const methods = useMethods(store);

        // 4. 返回所有需要暴露给模板的数据和方法
        const result = {
            ...store,         // 响应式数据
            ...computedProps, // 计算属性
            ...methods        // 方法
        };
        
        console.log('[BaseView] Setup 函数返回结果:', Object.keys(result));
        console.log('[BaseView] 可用的方法:', Object.keys(methods));
        
        return result;
    };

    // 创建并挂载应用（异步）
    const app = await createAndMountApp({
        setup,
        components,
        plugins,
        onError: (error) => {
            console.error('[视图错误]', error);
        }
    }, selector);

    // 执行挂载后回调
    if (typeof onMounted === 'function') {
        safeExecute(() => {
            onMounted(app);
        }, '挂载后回调');
    }

    return app;
}

/**
 * 等待组件加载完成
 * @param {Array} componentNames - 组件名称列表
 * @param {number} timeout - 超时时间(毫秒)
 * @returns {Promise} 等待完成的Promise
 */
export function waitForComponents(componentNames, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const checkComponents = () => {
            const allLoaded = componentNames.every(name => 
                typeof window[name] !== 'undefined'
            );
            
            if (allLoaded) {
                resolve();
                return;
            }
            
            if (Date.now() - startTime > timeout) {
                reject(new Error(`组件加载超时: ${componentNames.join(', ')}`));
                return;
            }
            
            setTimeout(checkComponents, 100);
        };
        
        checkComponents();
    });
}

/**
 * 自动加载CSS文件
 * @param {Array} cssFiles - CSS文件路径列表
 */
export function loadCSSFiles(cssFiles) {
    cssFiles.forEach(cssFile => {
        if (!document.querySelector(`link[href*="${cssFile}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssFile;
            link.type = 'text/css';
            document.head.appendChild(link);
        }
    });
}

/**
 * 自动加载JavaScript文件
 * @param {Array} jsFiles - JavaScript文件路径列表
 * @returns {Promise} 加载完成的Promise
 */
export function loadJSFiles(jsFiles) {
    const loadPromises = jsFiles.map(jsFile => {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'module';
            script.src = jsFile;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`加载失败: ${jsFile}`));
            document.head.appendChild(script);
        });
    });
    
    return Promise.all(loadPromises);
} 

