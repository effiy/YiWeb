/**
 * 组件加载工具
 * 用于标准化 Vue 组件的加载、定义和样式注入
 */

/**
 * 加载 CSS 文件
 * @param {string|string[]} paths - CSS 文件路径或路径数组
 */
export function loadCSS(paths) {
    const cssPaths = Array.isArray(paths) ? paths : [paths];
    cssPaths.forEach(path => {
        if (!path) return;
        // 检查是否已加载
        if (document.querySelector(`link[href="${path}"]`)) return;
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = path;
        document.head.appendChild(link);
    });
}

/**
 * 加载 HTML 模板
 * @param {string} path - HTML 文件路径
 * @returns {Promise<string>} 模板内容
 */
export async function loadTemplate(path) {
    if (!path) return '';
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`[ComponentLoader] 加载模板失败 (${path}):`, error);
        return '';
    }
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
    const { name, css, html, ...componentOptions } = options;

    if (!name) {
        throw new Error('[ComponentLoader] 组件名称是必需的');
    }

    // 1. 加载样式
    if (css) {
        loadCSS(css);
    }

    // 2. 加载模板
    let template = componentOptions.template || '';
    if (html) {
        const loadedTemplate = await loadTemplate(html);
        if (loadedTemplate) {
            template = loadedTemplate;
        }
    }

    // 3. 组装组件对象
    const component = {
        name,
        template,
        ...componentOptions
    };

    // 4. 兼容性处理：注册到全局 window 对象
    // 这是为了适配 baseView.js 的 registerComponents 逻辑
    window[name] = component;
    
    // 同时尝试注册 kebab-case 名称的全局变量（可选，视项目需求而定）
    // const kebabName = name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    // window[kebabName] = component;

    return component;
}
