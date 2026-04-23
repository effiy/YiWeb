/**
 * 组件加载工具
 * 用于标准化 Vue 组件的加载、定义和样式注入
 */

import { safeGetItem, safeSetItem } from '/cdn/utils/core/common.js';
import { createError, ErrorCodes, ErrorTypes } from '/cdn/utils/core/error.js';

/**
 * 加载 CSS 文件
 * @param {string|string[]} paths - CSS 文件路径或路径数组
 */
export function loadCSS(paths) {
    const cssPaths = Array.isArray(paths) ? paths : [paths];
    cssPaths.forEach(path => {
        if (!path) return;
        const targetHref = (() => {
            try {
                return new URL(String(path), location.href).href;
            } catch (_) {
                return String(path);
            }
        })();
        const exists = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]')).some((link) => {
            try {
                return new URL(link.getAttribute('href') || link.href, location.href).href === targetHref;
            } catch (_) {
                return (link.getAttribute('href') || '') === String(path);
            }
        });
        if (exists) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = path;
        document.head.appendChild(link);
    });
}

const __templateMemoryCache = new Map();
const __templateCacheKey = (path) => {
    const p = String(path || '').trim();
    if (!p) return '';
    try {
        return `yiweb:template:v1:${new URL(p, location.href).href}`;
    } catch (_) {
        return `yiweb:template:v1:${p}`;
    }
};

/**
 * 加载 HTML 模板
 * @param {string} path - HTML 文件路径
 * @returns {Promise<string>} 模板内容
 */
export async function loadTemplate(path) {
    if (!path) return '';
    const cacheKey = __templateCacheKey(path);
    if (cacheKey && __templateMemoryCache.has(cacheKey)) {
        return __templateMemoryCache.get(cacheKey) || '';
    }
    try {
        if (cacheKey) {
            const cached = safeGetItem(cacheKey, null, true);
            const ts = cached && typeof cached.ts === 'number' ? cached.ts : 0;
            const content = cached && typeof cached.content === 'string' ? cached.content : '';
            const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
            if (content && ts && Date.now() - ts < maxAgeMs) {
                __templateMemoryCache.set(cacheKey, content);
                return content;
            }
        }

        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        if (cacheKey && text) {
            __templateMemoryCache.set(cacheKey, text);
            safeSetItem(cacheKey, { ts: Date.now(), content: text }, true);
        }
        return text;
    } catch (error) {
        try {
            createError(`加载模板失败: ${path}`, ErrorTypes.NETWORK, '组件模板加载', ErrorCodes.TEMPLATE_FETCH_FAILED).originalError = error;
        } catch (_) { }
        console.error(`[ComponentLoader] 加载模板失败 (${path}):`, error);
        if (cacheKey) {
            const cached = safeGetItem(cacheKey, null, true);
            const content = cached && typeof cached.content === 'string' ? cached.content : '';
            if (content) return content;
        }
        return '';
    }
}

/**
 * 定义并注册 Vue 组件（同步版本）
 * 立即注册到 window，模板异步加载
 * @param {Object} options - 组件配置
 * @param {string} options.name - 组件名称 (PascalCase)
 * @param {string} [options.css] - CSS 文件路径
 * @param {string} [options.html] - HTML 模板文件路径
 * @param {Object} [options.component] - Vue 组件选项 (props, setup, methods, etc.)
 * @returns {Object} Vue 组件定义对象
 */
function defineComponentSync(options) {
    const { name, css, html, ...componentOptions } = options;

    if (!name) {
        throw createError('[ComponentLoader] 组件名称是必需的', ErrorTypes.VALIDATION, '组件定义', ErrorCodes.UNKNOWN);
    }

    // 1. 加载样式
    if (css) {
        loadCSS(css);
    }

    // 2. 创建组件对象（带空模板占位符）
    const component = {
        name,
        template: componentOptions.template || '',
        ...componentOptions
    };

    // 3. 立即注册到全局 window 对象（关键：完全同步，不等待任何东西）
    window[name] = component;

    // 4. 异步加载模板，加载完成后更新组件
    if (html) {
        loadTemplate(html).then((loadedTemplate) => {
            if (loadedTemplate) {
                component.template = loadedTemplate;
            }
        }).catch((error) => {
            console.error(`[ComponentLoader] 异步加载模板失败 (${html}):`, error);
        });
    }

    return component;
}

/**
 * 定义并注册 Vue 组件
 * @param {Object} options - 组件配置
 * @param {string} options.name - 组件名称 (PascalCase)
 * @param {string} [options.css] - CSS 文件路径
 * @param {string} [options.html] - HTML 模板文件路径
 * @param {Object} [options.component] - Vue 组件选项 (props, setup, methods, etc.)
 * @returns {Promise<Object>} Vue 组件定义对象
 */
export async function defineComponent(options) {
    // 使用同步版本先注册
    const component = defineComponentSync(options);
    // 等待模板加载完成后返回完整组件
    if (options.html) {
        await loadTemplate(options.html);
    }
    return component;
}

/**
 * 注册全局组件（完全同步，无延迟）
 * @param {Object} componentOptions - 组件配置
 * @param {Object} [options] - 注册选项
 * @returns {Promise<Object>} 组件 Promise
 */
export function registerGlobalComponent(componentOptions, options = {}) {
    const exposeName = options.exposeName || componentOptions?.name;
    const eventName = options.eventName || (exposeName ? `${exposeName}Loaded` : '');
    const errorPrefix = options.errorPrefix || exposeName || componentOptions?.name || 'Component';

    if (!componentOptions || !componentOptions.name) {
        console.error(`[${errorPrefix}] 组件初始化失败: componentOptions.name 缺失`);
        return Promise.resolve(null);
    }

    // 1. 同步定义并立即注册组件（关键：不使用 async/await，完全同步）
    let component;
    try {
        component = defineComponentSync(componentOptions);
    } catch (error) {
        console.error(`[${errorPrefix}] 组件定义失败:`, error);
        return Promise.resolve(null);
    }

    // 2. 确保 window[exposeName] 存在
    if (exposeName && typeof window[exposeName] === 'undefined') {
        window[exposeName] = component;
    }

    // 3. 立即触发加载完成事件（关键：同步触发，不等待任何 Promise）
    try {
        if (eventName) {
            console.log(`[ComponentLoader] 触发组件加载事件: ${eventName}`);
            window.dispatchEvent(new CustomEvent(eventName, { detail: component }));
        }
    } catch (e) {
        console.warn(`[ComponentLoader] 触发事件失败: ${eventName}`, e);
    }

    // 4. 返回一个 Promise 供需要的地方使用（但不阻塞注册流程）
    return defineComponent(componentOptions).catch((error) => {
        console.error(`${errorPrefix} 组件完整初始化失败:`, error);
        return window[exposeName] || component;
    });
}
