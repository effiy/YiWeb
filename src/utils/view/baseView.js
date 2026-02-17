/**
 * 通用视图工厂函数
 * 提供统一的Vue应用创建和挂载逻辑
 * author: liangliang
 */

// 模块依赖改为全局方式
// import { window.safeExecute } from './error.js';
// import { window.logInfo, window.logWarn, window.logError } from './log.js';
// 导入日志工具，确保 window.logError 等函数可用
import { logError, logInfo, logWarn, timeEnd, timeStart } from '/src/utils/core/log.js';
import { createError, ErrorCodes, ErrorTypes, safeExecute } from '/src/utils/core/error.js';
import { loadCSS } from '/src/utils/view/componentLoader.js';

/**
 * 视图配置选项
 */
const ViewConfig = {
    // 默认组件注册列表
    DEFAULT_COMPONENTS: [],
    
    // 默认插件加载列表
    DEFAULT_PLUGINS: [],
    
    // 默认错误处理
    DEFAULT_ERROR_HANDLER: (error) => {
        logError('[视图错误]', error);
    }
};

const safeLogInfo = (...args) => {
    try { logInfo(...args); } catch (_) { }
};

const safeLogWarn = (...args) => {
    try { logWarn(...args); } catch (_) { }
};

const safeLogError = (...args) => {
    try { logError(...args); } catch (_) { }
};

const isVueRef = (value) => {
    try {
        return typeof Vue !== 'undefined' && typeof Vue.isRef === 'function' && Vue.isRef(value);
    } catch (_) {
        return false;
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
async function createVueApp(options = {}) {
    const {
        setup,
        components = ViewConfig.DEFAULT_COMPONENTS,
        plugins = ViewConfig.DEFAULT_PLUGINS,
        onError = ViewConfig.DEFAULT_ERROR_HANDLER,
        rootTemplate = null,
        cssFiles = [],
        componentModules = []
    } = options;

    // 验证必需参数
    if (typeof setup !== 'function') {
        throw new Error('setup函数是必需的');
    }

    // 创建Vue应用
    const app = Vue.createApp({
        setup,
        name: 'App',
        // 如果提供了根模板，则使用它而不是解析现有DOM
        ...(rootTemplate ? { template: rootTemplate } : {})
    });

    if (Array.isArray(cssFiles) && cssFiles.length) {
        loadCSSFiles(cssFiles);
    }

    if (Array.isArray(componentModules) && componentModules.length) {
        timeStart('app:loadJSFiles');
        await loadJSFiles(componentModules);
        timeEnd('app:loadJSFiles');
    }

    // 注册组件（异步）
    timeStart('app:registerComponents');
    await registerComponents(app, components);
    timeEnd('app:registerComponents');

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
            // 注册 PascalCase 名称
            app.component(name, window[name]);
            // 同时注册 kebab-case 名称（Vue 3 自动转换，但显式注册更安全）
            const kebabName = name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
            app.component(kebabName, window[name]);
            safeLogInfo(`[组件注册] 已注册组件: ${name} (${kebabName})`);
        } else {
            safeLogWarn(`[组件注册] 组件未找到: ${name}`);
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
            safeLogInfo(`[插件加载] 加载插件: ${pluginName}`);
        } catch (error) {
            safeLogError(`[插件加载] 插件加载失败: ${pluginName}`, error);
        }
    });
}

/**
 * 挂载Vue应用到DOM
 * @param {Object} app - Vue应用实例
 * @param {string} selector - DOM选择器
 * @returns {Object} 挂载后的应用实例
 */
function mountApp(app, selector = '#app') {
    return safeExecute(() => {
        const element = document.querySelector(selector);
        if (!element) {
            throw new Error(`DOM元素未找到: ${selector}`);
        }
        
        // 直接传入 DOM 元素，避免某些环境下 selector 触发的内部 nextSibling 错误
        const mountedApp = app.mount(element);
        safeLogInfo(`[应用挂载] 应用已挂载到: ${selector}`);
        return mountedApp;
    }, '应用挂载');
}

/**
 * 创建并挂载Vue应用
 * @param {Object} options - 应用配置选项
 * @param {string} selector - DOM选择器
 * @returns {Promise<Object>} 挂载后的应用实例
 */
async function createAndMountApp(options = {}, selector = '#app') {
    timeStart('app:createAndMount');
    // 在挂载前，从目标元素抓取静态模板并清空，避免DOM不一致导致的挂载错误
    const element = document.querySelector(selector);
    if (!element) {
        throw createError(`DOM元素未找到: ${selector}`, ErrorTypes.RUNTIME, '应用挂载', ErrorCodes.UNKNOWN);
    }
    const rootTemplate = element.innerHTML;
    element.innerHTML = '';

    const app = await createVueApp({ ...options, rootTemplate });
    try {
        const mounted = mountApp(app, selector);
        timeEnd('app:createAndMount');
        return mounted;
    } catch (e) {
        // 回退方案：在body末尾创建全新容器再尝试一次，以规避个别环境DOM解析异常
        try {
            const fallbackId = 'app-fallback';
            let fallback = document.getElementById(fallbackId);
            if (!fallback) {
                fallback = document.createElement('div');
                fallback.id = fallbackId;
                document.body.appendChild(fallback);
            } else {
                fallback.innerHTML = '';
            }
            const app2 = await createVueApp({ ...options, rootTemplate });
            const mounted2 = mountApp(app2, '#' + fallbackId);
            timeEnd('app:createAndMount');
            return mounted2;
        } catch (_) {
            throw e;
        }
    }
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
async function createBaseView(config = {}) {
    const {
        createStore,
        useComputed,
        useMethods,
        components = ViewConfig.DEFAULT_COMPONENTS,
        plugins = ViewConfig.DEFAULT_PLUGINS,
        onMounted = null,
        selector = '#app',
        cssFiles = [],
        componentModules = [],
        // 支持传入额外的 methods、data 和 computed（用于兼容 Options API 风格）
        methods: extraMethods = {},
        data: extraData = {},
        computed: extraComputed = {},
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

        // 4. 处理额外的 data（转换为响应式）
        const reactiveExtraData = {};
        if (extraData && typeof extraData === 'object') {
            Object.keys(extraData).forEach(key => {
                const value = extraData[key];
                // 如果已经是 ref，直接使用；否则创建 ref
                if (isVueRef(value)) {
                    reactiveExtraData[key] = value;
                } else {
                    reactiveExtraData[key] = Vue.ref(value);
                }
            });
        }

        // 5. 处理额外的 computed（转换为计算属性）
        const reactiveExtraComputed = {};
        if (extraComputed && typeof extraComputed === 'object') {
            Object.keys(extraComputed).forEach(key => {
                const getter = extraComputed[key];
                if (typeof getter === 'function') {
                    // 创建一个上下文对象，包含 store 和其他数据，供 computed 函数使用
                    // 注意：computed 函数中可能直接使用 store，所以需要确保 store 在闭包中可用
                    reactiveExtraComputed[key] = Vue.computed(() => {
                        // 创建一个上下文，包含所有可用的数据和方法
                        const context = {
                            store,
                            ...store,
                            ...computedProps,
                            ...methods,
                            ...reactiveExtraData
                        };
                        return getter.call(context);
                    });
                }
            });
        }

        // 6. 处理额外的 methods（直接添加，因为这些方法通常不依赖 this）
        const boundExtraMethods = {};
        if (extraMethods && typeof extraMethods === 'object') {
            Object.keys(extraMethods).forEach(key => {
                const method = extraMethods[key];
                if (typeof method === 'function') {
                    // 直接使用原函数，因为它们在内部通过 useMethods(store) 获取依赖
                    boundExtraMethods[key] = method;
                }
            });
        }

        // 7. 返回所有需要暴露给模板的数据和方法
        const result = {
            ...store,                // 响应式数据
            ...computedProps,        // 计算属性
            ...methods,              // 方法
            ...reactiveExtraData,    // 额外的响应式数据
            ...reactiveExtraComputed, // 额外的计算属性
            ...boundExtraMethods     // 额外的方法
        };

        try {
            if (typeof Vue !== 'undefined' && typeof Vue.provide === 'function') {
                Vue.provide('viewContext', result);
            }
        } catch (_) { }

        return result;
    };

    // 创建并挂载应用（异步）
    const app = await createAndMountApp({
        setup,
        components,
        plugins,
        cssFiles,
        componentModules,
        onError: (error) => {
            logError('[视图错误]', error);
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
function waitForComponents(componentNames, timeout = 5000) {
    const names = Array.isArray(componentNames) ? componentNames.filter(Boolean) : [];
    const pending = new Set(names.filter((name) => typeof window[name] === 'undefined'));
    if (!pending.size) return Promise.resolve();

    return new Promise((resolve, reject) => {
        let settled = false;
        const startTime = Date.now();
        const cleanups = [];

        const settle = (error) => {
            if (settled) return;
            settled = true;
            cleanups.forEach((fn) => {
                try { fn(); } catch (_) { }
            });
            if (error) reject(error);
            else resolve();
        };

        pending.forEach((name) => {
            const eventName = `${name}Loaded`;
            const handler = () => {
                pending.delete(name);
                if (!pending.size) settle();
            };
            try {
                window.addEventListener(eventName, handler);
                cleanups.push(() => window.removeEventListener(eventName, handler));
            } catch (_) { }
        });

        const poll = () => {
            if (settled) return;

            pending.forEach((name) => {
                if (typeof window[name] !== 'undefined') pending.delete(name);
            });

            if (!pending.size) {
                settle();
                return;
            }

            if (Date.now() - startTime > timeout) {
                settle(createError(`组件加载超时: ${names.join(', ')}`, ErrorTypes.RUNTIME, '组件注册', ErrorCodes.COMPONENT_LOAD_TIMEOUT));
                return;
            }

            setTimeout(poll, 100);
        };

        poll();
    });
}

/**
 * 自动加载CSS文件
 * @param {Array} cssFiles - CSS文件路径列表
 */
function loadCSSFiles(cssFiles) {
    loadCSS(cssFiles);
}

/**
 * 自动加载JavaScript文件
 * @param {Array} jsFiles - JavaScript文件路径列表
 * @returns {Promise} 加载完成的Promise
 */
function loadJSFiles(jsFiles) {
    const files = Array.isArray(jsFiles) ? jsFiles : [];
    const tasks = files
        .filter(Boolean)
        .map(async (jsFile) => {
            try {
                timeStart(`module:import ${jsFile}`);
                await import(jsFile);
                timeEnd(`module:import ${jsFile}`);
                return;
            } catch (error) {
                safeLogWarn(`[模块加载] import 失败，回退为 script 注入: ${jsFile}`, error);
            }

            const targetSrc = new URL(jsFile, location.href).href;
            const exists = Array.from(document.querySelectorAll('script[type="module"][src]')).some(script => {
                try {
                    return new URL(script.src, location.href).href === targetSrc;
                } catch (_) {
                    return false;
                }
            });
            if (exists) return;

            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.type = 'module';
                script.src = jsFile;
                script.onload = resolve;
                script.onerror = () => reject(createError(`加载失败: ${jsFile}`, ErrorTypes.RUNTIME, '模块加载', ErrorCodes.MODULE_LOAD_FAILED));
                document.head.appendChild(script);
            });
        });

    return Promise.all(tasks);
}

function exposeToWindow() {
    if (typeof window === 'undefined') return;
    window.ViewConfig = ViewConfig;
    window.createVueApp = createVueApp;
    window.mountApp = mountApp;
    window.createAndMountApp = createAndMountApp;
    window.createBaseView = createBaseView;
    window.waitForComponents = waitForComponents;
    window.loadCSSFiles = loadCSSFiles;
    window.loadJSFiles = loadJSFiles;
}

// ES6模块导出（用于模块环境）
export {
    ViewConfig,
    createVueApp,
    mountApp,
    createAndMountApp,
    createBaseView,
    waitForComponents,
    loadCSSFiles,
    loadJSFiles
};

exposeToWindow();

// 注意：由于HTML使用普通script标签，不支持ES6模块语法
// 如果需要ES6模块支持，请将script标签改为 type="module"
// 或者使用动态import()语法 
