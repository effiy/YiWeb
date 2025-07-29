/**
 * DOM操作工具函数集合
 * 
 * 提供统一的DOM操作方法，减少代码重复
 */

/**
 * 自动调整文本框高度
 * @param {HTMLTextAreaElement} textarea - 文本框元素
 * @param {Object|number} options - 选项对象或最大高度
 */
export function autoResizeTextarea(textarea, options = {}) {
    // 支持传入数字（向后兼容）
    if (typeof options === 'number') {
        options = { maxHeight: options };
    }
    
    const { maxHeight = 200 } = options;
    
    const resize = () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
    };
    
    textarea.addEventListener('input', resize, { passive: true });
    textarea.addEventListener('focus', resize, { passive: true });
    
    // 初始化
    resize();
}

/**
 * 安全移除元素
 * @param {HTMLElement} element - 要移除的元素
 */
export function safeRemoveElement(element) {
    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
}

/**
 * 创建动画元素
 * @param {string} styles - CSS样式字符串
 * @param {HTMLElement} parent - 父元素
 * @returns {HTMLElement} 创建的元素
 */
export function createAnimationElement(styles, parent) {
    const element = document.createElement('div');
    element.style.cssText = styles;
    parent.appendChild(element);
    return element;
}

/**
 * 添加事件监听器（支持事件委托）
 * @param {HTMLElement} parent - 父元素
 * @param {string} event - 事件名称
 * @param {string} selector - 选择器
 * @param {Function} handler - 事件处理函数
 */
export function addEventDelegate(parent, event, selector, handler) {
    // 为触摸和滚动事件添加passive选项
    const options = ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'scroll', 'wheel', 'mousewheel'].includes(event) 
        ? { passive: true } 
        : {};
    
    parent.addEventListener(event, (e) => {
        const target = e.target.closest(selector);
        if (target) {
            handler.call(target, e);
        }
    }, options);
}

/**
 * 平滑滚动到元素
 * @param {HTMLElement|string} element - 元素或选择器
 * @param {Object} options - 滚动选项
 */
export function smoothScrollTo(element, options = {}) {
    const target = typeof element === 'string' ? document.querySelector(element) : element;
    if (!target) return;
    
    const defaultOptions = {
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
    };
    
    target.scrollIntoView({...defaultOptions, ...options});
}

/**
 * 获取元素相对于文档的位置
 * @param {HTMLElement} element - 元素
 * @returns {Object} 位置对象 {top, left, right, bottom}
 */
export function getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    return {
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft,
        right: rect.right + scrollLeft,
        bottom: rect.bottom + scrollTop,
        width: rect.width,
        height: rect.height
    };
}

/**
 * 检查元素是否在视窗中
 * @param {HTMLElement} element - 元素
 * @param {number} threshold - 阈值（0-1）
 * @returns {boolean} 是否在视窗中
 */
export function isElementInViewport(element, threshold = 0) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;
    
    const verticalThreshold = windowHeight * threshold;
    const horizontalThreshold = windowWidth * threshold;
    
    return (
        rect.top >= -verticalThreshold &&
        rect.left >= -horizontalThreshold &&
        rect.bottom <= windowHeight + verticalThreshold &&
        rect.right <= windowWidth + horizontalThreshold
    );
}

/**
 * 创建交集观察器
 * @param {Function} callback - 回调函数
 * @param {Object} options - 观察器选项
 * @returns {IntersectionObserver} 观察器实例
 */
export function createIntersectionObserver(callback, options = {}) {
    const defaultOptions = {
        threshold: 0.1,
        rootMargin: '0px'
    };
    
    return new IntersectionObserver(callback, {...defaultOptions, ...options});
}

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} 是否复制成功
 */
export async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-999999px';
            textarea.style.top = '-999999px';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            
            const result = document.execCommand('copy');
            document.body.removeChild(textarea);
            return result;
        }
    } catch (error) {
        console.error('复制失败:', error);
        return false;
    }
}

/**
 * 获取元素的所有样式
 * @param {HTMLElement} element - 元素
 * @returns {CSSStyleDeclaration} 样式对象
 */
export function getElementStyles(element) {
    return window.getComputedStyle(element);
}

/**
 * 检查元素是否有指定类名
 * @param {HTMLElement} element - 元素
 * @param {string} className - 类名
 * @returns {boolean} 是否有该类名
 */
export function hasClass(element, className) {
    return element.classList.contains(className);
}

/**
 * 切换元素类名
 * @param {HTMLElement} element - 元素
 * @param {string} className - 类名
 * @param {boolean} force - 强制添加/移除
 */
export function toggleClass(element, className, force) {
    if (force !== undefined) {
        element.classList.toggle(className, force);
    } else {
        element.classList.toggle(className);
    }
}

/**
 * 批量设置元素属性
 * @param {HTMLElement} element - 元素
 * @param {Object} attributes - 属性对象
 */
export function setAttributes(element, attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });
}

/**
 * 创建元素
 * @param {string} tagName - 标签名
 * @param {Object} options - 选项
 * @returns {HTMLElement} 创建的元素
 */
export function createElement(tagName, options = {}) {
    const element = document.createElement(tagName);
    
    const { className, id, textContent, innerHTML, attributes, styles } = options;
    
    if (className) element.className = className;
    if (id) element.id = id;
    if (textContent) element.textContent = textContent;
    if (innerHTML) element.innerHTML = innerHTML;
    if (attributes) setAttributes(element, attributes);
    if (styles) {
        Object.entries(styles).forEach(([key, value]) => {
            element.style[key] = value;
        });
    }
    
    return element;
}

/**
 * 获取表单数据
 * @param {HTMLFormElement} form - 表单元素
 * @returns {Object} 表单数据对象
 */
export function getFormData(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
        if (data[key]) {
            // 处理多选情况
            if (Array.isArray(data[key])) {
                data[key].push(value);
            } else {
                data[key] = [data[key], value];
            }
        } else {
            data[key] = value;
        }
    }
    
    return data;
}

/**
 * 设置表单数据
 * @param {HTMLFormElement} form - 表单元素
 * @param {Object} data - 数据对象
 */
export function setFormData(form, data) {
    Object.entries(data).forEach(([key, value]) => {
        const element = form.querySelector(`[name="${key}"]`);
        if (element) {
            if (element.type === 'checkbox' || element.type === 'radio') {
                element.checked = Boolean(value);
            } else {
                element.value = value;
            }
        }
    });
}

// 导出默认工具对象
export default {
    autoResizeTextarea,
    safeRemoveElement,
    createAnimationElement,
    addEventDelegate,
    smoothScrollTo,
    getElementPosition,
    isElementInViewport,
    createIntersectionObserver,
    copyToClipboard,
    getElementStyles,
    hasClass,
    toggleClass,
    setAttributes,
    createElement,
    getFormData,
    setFormData
}; 

