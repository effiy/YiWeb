/**
 * 事件管理工具函数集合
 * 
 * 提供统一的事件管理方法，减少重复的事件处理逻辑
 */

/**
 * 事件管理器类
 */
class EventManager {
    constructor() {
        this.listeners = new Map();
        this.globalListeners = new Map();
        this._elementIds = new WeakMap();
        this._handlerIds = new WeakMap();
        this._nextElementId = 1;
        this._nextHandlerId = 1;
    }

    /**
     * 添加事件监听器
     * @param {HTMLElement} element - 元素
     * @param {string} event - 事件名称
     * @param {Function} handler - 事件处理函数
     * @param {Object} options - 选项
     */
    on(element, event, handler, options = {}) {
        const { debounce, throttle, ...listenerOptions } = options || {};
        const finalListenerOptions = this.addPassiveOption(event, listenerOptions);
        const wrappedHandler = this.wrapHandler(handler, { debounce, throttle });
        element.addEventListener(event, wrappedHandler, finalListenerOptions);
        
        // 记录监听器以便后续移除
        const key = this.getListenerKey(element, event, handler);
        this.listeners.set(key, {
            element,
            event,
            handler: wrappedHandler,
            originalHandler: handler,
            options: finalListenerOptions
        });
    }

    /**
     * 移除事件监听器
     * @param {HTMLElement} element - 元素
     * @param {string} event - 事件名称
     * @param {Function} handler - 事件处理函数
     */
    off(element, event, handler) {
        const key = this.getListenerKey(element, event, handler);
        const listener = this.listeners.get(key);
        
        if (listener) {
            element.removeEventListener(event, listener.handler, listener.options);
            this.listeners.delete(key);
        }
    }

    /**
     * 添加全局事件监听器
     * @param {string} event - 事件名称
     * @param {Function} handler - 事件处理函数
     * @param {Object} options - 选项
     */
    onGlobal(event, handler, options = {}) {
        const { debounce, throttle, ...listenerOptions } = options || {};
        const finalListenerOptions = this.addPassiveOption(event, listenerOptions);
        const wrappedHandler = this.wrapHandler(handler, { debounce, throttle });
        document.addEventListener(event, wrappedHandler, finalListenerOptions);
        
        const key = `global_${event}_${this.getHandlerKey(handler)}`;
        this.globalListeners.set(key, {
            event,
            handler: wrappedHandler,
            originalHandler: handler,
            options: finalListenerOptions
        });
    }

    /**
     * 移除全局事件监听器
     * @param {string} event - 事件名称
     * @param {Function} handler - 事件处理函数
     */
    offGlobal(event, handler) {
        const key = `global_${event}_${this.getHandlerKey(handler)}`;
        const listener = this.globalListeners.get(key);
        
        if (listener) {
            document.removeEventListener(event, listener.handler, listener.options);
            this.globalListeners.delete(key);
        }
    }

    /**
     * 事件委托
     * @param {HTMLElement} parent - 父元素
     * @param {string} event - 事件名称
     * @param {string} selector - 选择器
     * @param {Function} handler - 事件处理函数
     * @param {Object} options - 选项
     */
    delegate(parent, event, selector, handler, options = {}) {
        const delegateHandler = (e) => {
            const target = e.target.closest(selector);
            if (target && parent.contains(target)) {
                handler.call(target, e);
            }
        };
        
        this.on(parent, event, delegateHandler, options);
    }

    /**
     * 为触摸和滚动事件添加passive选项
     * @param {string} event - 事件名称
     * @param {Object} options - 选项
     * @returns {Object} 最终选项
     */
    addPassiveOption(event, options = {}) {
        // 需要passive选项的事件类型
        const passiveEvents = [
            'touchstart', 'touchmove', 'touchend', 'touchcancel',
            'scroll', 'wheel', 'mousewheel'
        ];
        
        if (passiveEvents.includes(event) && !Object.prototype.hasOwnProperty.call(options, 'passive')) {
            return { ...options, passive: true };
        }
        
        return options;
    }

    /**
     * 包装事件处理函数
     * @param {Function} handler - 原始处理函数
     * @param {Object} options - 选项
     * @returns {Function} 包装后的处理函数
     */
    wrapHandler(handler, behaviorOptions = {}) {
        const { debounce, throttle } = behaviorOptions;
        
        let wrappedHandler = handler;
        
        if (debounce) {
            wrappedHandler = this.createDebounceHandler(handler, debounce);
        } else if (throttle) {
            wrappedHandler = this.createThrottleHandler(handler, throttle);
        }
        
        return wrappedHandler;
    }

    /**
     * 创建防抖处理函数
     * @param {Function} handler - 原始处理函数
     * @param {number} delay - 延迟时间
     * @returns {Function} 防抖处理函数
     */
    createDebounceHandler(handler, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => handler.apply(this, args), delay);
        };
    }

    /**
     * 创建节流处理函数
     * @param {Function} handler - 原始处理函数
     * @param {number} limit - 限制间隔
     * @returns {Function} 节流处理函数
     */
    createThrottleHandler(handler, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                handler.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * 获取监听器键名
     * @param {HTMLElement} element - 元素
     * @param {string} event - 事件名称
     * @param {Function} handler - 事件处理函数
     * @returns {string} 键名
     */
    getListenerKey(element, event, handler) {
        return `el${this.getElementKey(element)}_${event}_${this.getHandlerKey(handler)}`;
    }

    getElementKey(element) {
        if (!element) return 'unknown';
        const existing = this._elementIds.get(element);
        if (existing) return existing;
        const id = String(this._nextElementId++);
        this._elementIds.set(element, id);
        return id;
    }

    /**
     * 获取处理函数键名
     * @param {Function} handler - 事件处理函数
     * @returns {string} 键名
     */
    getHandlerKey(handler) {
        if (typeof handler !== 'function') return String(handler);
        const existing = this._handlerIds.get(handler);
        if (existing) return existing;
        const id = String(this._nextHandlerId++);
        this._handlerIds.set(handler, id);
        return id;
    }

    /**
     * 清理所有监听器
     */
    cleanup() {
        // 清理普通监听器
        this.listeners.forEach((listener) => {
            listener.element.removeEventListener(
                listener.event,
                listener.handler,
                listener.options
            );
        });
        this.listeners.clear();

        // 清理全局监听器
        this.globalListeners.forEach((listener) => {
            document.removeEventListener(
                listener.event,
                listener.handler,
                listener.options
            );
        });
        this.globalListeners.clear();
    }
}

/**
 * 全局事件管理器实例
 */
export const eventManager = new EventManager();

/**
 * 键盘事件处理器
 */
export class KeyboardHandler {
    constructor() {
        this.shortcuts = new Map();
        this.init();
    }

    /**
     * 初始化键盘事件监听
     */
    init() {
        eventManager.onGlobal('keydown', this.handleKeydown.bind(this));
    }

    /**
     * 注册键盘快捷键
     * @param {string} keys - 快捷键组合，如 'ctrl+k', 'cmd+shift+f'
     * @param {Function} handler - 处理函数
     * @param {Object} options - 选项
     */
    register(keys, handler, options = {}) {
        const normalizedKeys = this.normalizeKeys(keys);
        this.shortcuts.set(normalizedKeys, { handler, options });
    }

    /**
     * 取消注册键盘快捷键
     * @param {string} keys - 快捷键组合
     */
    unregister(keys) {
        const normalizedKeys = this.normalizeKeys(keys);
        this.shortcuts.delete(normalizedKeys);
    }

    /**
     * 处理键盘按下事件
     * @param {KeyboardEvent} event - 键盘事件
     */
    handleKeydown(event) {
        const keys = this.getEventKeys(event);
        const shortcut = this.shortcuts.get(keys);
        
        if (shortcut) {
            const { handler, options } = shortcut;
            const { preventDefault = true, stopPropagation = false } = options;
            
            if (preventDefault) {
                event.preventDefault();
            }
            if (stopPropagation) {
                event.stopPropagation();
            }
            
            handler(event);
        }
    }

    /**
     * 标准化快捷键字符串
     * @param {string} keys - 快捷键字符串
     * @returns {string} 标准化后的快捷键
     */
    normalizeKeys(keys) {
        return keys.toLowerCase()
            .replace(/\s+/g, '')
            .split('+')
            .sort()
            .join('+');
    }

    /**
     * 获取事件对应的快捷键字符串
     * @param {KeyboardEvent} event - 键盘事件
     * @returns {string} 快捷键字符串
     */
    getEventKeys(event) {
        const keys = [];
        
        if (event.ctrlKey) keys.push('ctrl');
        if (event.metaKey) keys.push('cmd');
        if (event.altKey) keys.push('alt');
        if (event.shiftKey) keys.push('shift');
        
        const key = event.key.toLowerCase();
        if (key !== 'control' && key !== 'meta' && key !== 'alt' && key !== 'shift') {
            keys.push(key);
        }
        
        return keys.sort().join('+');
    }

    /**
     * 清理所有快捷键
     */
    cleanup() {
        this.shortcuts.clear();
    }
}

/**
 * 全局键盘处理器实例
 */
export const keyboardHandler = new KeyboardHandler();

/**
 * 搜索功能处理器
 */
export class SearchHandler {
    constructor() {
        this.searchInput = null;
        this.searchResults = null;
        this.searchCallback = null;
        this.searchHistory = [];
        this.maxHistoryLength = 10;
    }

    /**
     * 初始化搜索功能
     * @param {string|HTMLElement} inputSelector - 输入框选择器或元素
     * @param {Function} callback - 搜索回调函数
     * @param {Object} options - 选项
     */
    init(inputSelector, callback, options = {}) {
        this.searchInput = typeof inputSelector === 'string' 
            ? document.querySelector(inputSelector) 
            : inputSelector;
        
        if (!this.searchInput) {
            console.error('搜索输入框未找到');
            return;
        }

        this.searchCallback = callback;
        this.options = {
            debounceDelay: 300,
            minLength: 1,
            ...options
        };

        this.bindEvents();
        this.loadSearchHistory();
    }

    /**
     * 绑定搜索事件
     */
    bindEvents() {
        // 搜索输入事件
        eventManager.on(this.searchInput, 'input', 
            this.handleSearchInput.bind(this), 
            { debounce: this.options.debounceDelay }
        );

        // 键盘事件
        eventManager.on(this.searchInput, 'keydown', this.handleKeydown.bind(this));

        // 焦点事件
        eventManager.on(this.searchInput, 'focus', this.handleFocus.bind(this));
        eventManager.on(this.searchInput, 'blur', this.handleBlur.bind(this));
    }

    /**
     * 处理搜索输入
     * @param {Event} event - 输入事件
     */
    handleSearchInput(event) {
        const query = event.target.value.trim();
        
        if (query.length >= this.options.minLength) {
            this.search(query);
        } else {
            this.clearResults();
        }
    }

    /**
     * 执行搜索
     * @param {string} query - 搜索查询
     */
    search(query) {
        if (this.searchCallback) {
            this.searchCallback(query);
        }
    }

    /**
     * 处理键盘事件
     * @param {KeyboardEvent} event - 键盘事件
     */
    handleKeydown(event) {
        switch (event.key) {
            case 'Enter':
                this.handleEnterKey(event);
                break;
            case 'Escape':
                this.handleEscapeKey(event);
                break;
            case 'ArrowUp':
            case 'ArrowDown':
                this.handleArrowKeys(event);
                break;
        }
    }

    /**
     * 处理回车键
     * @param {KeyboardEvent} event - 键盘事件
     */
    handleEnterKey(event) {
        const query = this.searchInput.value.trim();
        if (query) {
            this.addToHistory(query);
            this.search(query);
        }
    }

    /**
     * 处理ESC键
     * @param {KeyboardEvent} event - 键盘事件
     */
    handleEscapeKey(event) {
        this.clearSearch();
    }

    /**
     * 处理箭头键
     * @param {KeyboardEvent} event - 键盘事件
     */
    handleArrowKeys(event) {
        // 实现搜索历史导航
        // TODO: 实现搜索建议选择
    }

    /**
     * 处理焦点事件
     * @param {Event} event - 焦点事件
     */
    handleFocus(event) {
        this.showSearchHistory();
    }

    /**
     * 处理失焦事件
     * @param {Event} event - 失焦事件
     */
    handleBlur(event) {
        // 延迟隐藏，允许点击搜索结果
        setTimeout(() => {
            this.hideSearchHistory();
        }, 200);
    }

    /**
     * 添加到搜索历史
     * @param {string} query - 搜索查询
     */
    addToHistory(query) {
        if (this.searchHistory.includes(query)) {
            // 移到最前面
            this.searchHistory = [query, ...this.searchHistory.filter(q => q !== query)];
        } else {
            this.searchHistory.unshift(query);
        }

        // 限制历史记录数量
        if (this.searchHistory.length > this.maxHistoryLength) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistoryLength);
        }

        this.saveSearchHistory();
    }

    /**
     * 清空搜索
     */
    clearSearch() {
        this.searchInput.value = '';
        this.clearResults();
        this.searchInput.blur();
    }

    /**
     * 清空搜索结果
     */
    clearResults() {
        if (this.searchCallback) {
            this.searchCallback('');
        }
    }

    /**
     * 显示搜索历史
     */
    showSearchHistory() {
        // TODO: 实现搜索历史显示
    }

    /**
     * 隐藏搜索历史
     */
    hideSearchHistory() {
        // TODO: 实现搜索历史隐藏
    }

    /**
     * 保存搜索历史
     */
    saveSearchHistory() {
        try {
            localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.warn('保存搜索历史失败:', error);
        }
    }

    /**
     * 加载搜索历史
     */
    loadSearchHistory() {
        try {
            const history = localStorage.getItem('searchHistory');
            if (history) {
                this.searchHistory = JSON.parse(history);
            }
        } catch (error) {
            console.warn('加载搜索历史失败:', error);
            this.searchHistory = [];
        }
    }
}

// 导出默认工具对象
export default {
    EventManager,
    eventManager,
    KeyboardHandler,
    keyboardHandler,
    SearchHandler
}; 
