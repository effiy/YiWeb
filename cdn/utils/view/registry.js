/**
 * YiWeb 组件注册中心
 * 替代直接 window 挂载，减少全局污染
 * 保持向后兼容：仍同步挂载到 window
 */

class ComponentRegistry {
    constructor() {
        this._components = new Map();
        this._listeners = new Map();
        this._eventTarget = new EventTarget();
    }

    /**
     * 注册组件
     * @param {string} name - 组件名称
     * @param {Object} component - Vue 组件对象
     * @param {Object} [options] - 选项
     * @param {string} [options.eventName] - 加载完成事件名
     * @param {boolean} [options.exposeToWindow=true] - 是否暴露到 window（默认 true，向后兼容）
     */
    register(name, component, options = {}) {
        if (!name || !component) {
            console.warn('[Registry] 注册失败: 组件名或组件对象缺失');
            return;
        }

        const { eventName, exposeToWindow = true } = options;

        // 存储到内部 Map
        this._components.set(name, component);

        // 向后兼容：仍挂载到 window
        if (exposeToWindow && typeof window !== 'undefined') {
            window[name] = component;
        }

        // 触发加载完成事件
        if (eventName) {
            this.dispatch(eventName, component);
        }
    }

    /**
     * 获取组件
     * @param {string} name - 组件名称
     * @returns {Object|undefined} 组件对象
     */
    get(name) {
        if (this._components.has(name)) {
            return this._components.get(name);
        }
        // 向后兼容：从 window 查找
        if (typeof window !== 'undefined' && window[name]) {
            return window[name];
        }
        return undefined;
    }

    /**
     * 检查组件是否已注册
     * @param {string} name - 组件名称
     * @returns {boolean} 是否已注册
     */
    has(name) {
        if (this._components.has(name)) {
            return true;
        }
        // 向后兼容：检查 window
        if (typeof window !== 'undefined' && window[name]) {
            return true;
        }
        return false;
    }

    /**
     * 获取所有已注册组件名
     * @returns {string[]} 组件名称数组
     */
    list() {
        const names = Array.from(this._components.keys());
        // 向后兼容：也包含 window 上的组件（去重）
        if (typeof window !== 'undefined') {
            const windowNames = Object.keys(window).filter(key =>
                /^[A-Z][a-zA-Z0-9]*$/.test(key) &&
                typeof window[key] === 'object' &&
                window[key] !== null
            );
            const merged = new Set([...names, ...windowNames]);
            return Array.from(merged);
        }
        return names;
    }

    /**
     * 移除组件注册
     * @param {string} name - 组件名称
     * @param {boolean} [keepWindow=false] - 是否保留 window 上的挂载（默认 false，一起移除）
     */
    unregister(name, keepWindow = false) {
        this._components.delete(name);
        if (!keepWindow && typeof window !== 'undefined' && window[name]) {
            delete window[name];
        }
    }

    /**
     * 等待组件加载
     * @param {string} name - 组件名称
     * @param {string} [eventName] - 加载事件名（默认 `${name}Loaded`）
     * @param {number} [timeout=60000] - 超时时间（毫秒）
     * @returns {Promise<Object>} 组件对象
     */
    waitFor(name, eventName, timeout = 60000) {
        return new Promise((resolve, reject) => {
            const targetEvent = eventName || `${name}Loaded`;

            // 检查组件已存在
            if (this.has(name)) {
                resolve(this.get(name));
                return;
            }

            let resolved = false;

            // 事件监听器
            const handler = (event) => {
                if (!resolved) {
                    resolved = true;
                    resolve(event.detail || this.get(name));
                }
            };

            // 监听事件
            this.once(targetEvent, handler);

            // 超时处理
            const timeoutId = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    this.off(targetEvent, handler);
                    reject(new Error(`等待组件超时: ${name}`));
                }
            }, timeout);

            // 轮询检查（兜底）
            const pollInterval = setInterval(() => {
                if (!resolved && this.has(name)) {
                    resolved = true;
                    clearInterval(pollInterval);
                    clearTimeout(timeoutId);
                    this.off(targetEvent, handler);
                    resolve(this.get(name));
                }
            }, 50);

            // 清理轮询
            const originalResolve = resolve;
            resolve = (value) => {
                if (!resolved) {
                    clearInterval(pollInterval);
                    clearTimeout(timeoutId);
                }
                originalResolve(value);
            };
        });
    }

    /**
     * 批量等待组件
     * @param {string[]} names - 组件名称数组
     * @param {Object} [options] - 选项
     * @param {number} [options.timeout=60000] - 超时时间
     * @returns {Promise<Object[]>} 组件对象数组
     */
    async waitForAll(names, options = {}) {
        const { timeout = 60000 } = options;
        const promises = names.map(name => this.waitFor(name, undefined, timeout));
        return Promise.all(promises);
    }

    /**
     * 派发自定义事件
     * @param {string} eventName - 事件名称
     * @param {*} [detail] - 事件数据
     */
    dispatch(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });

        // 通过内部 EventTarget 分发
        this._eventTarget.dispatchEvent(event);

        // 向后兼容：也通过 window 分发
        if (typeof window !== 'undefined') {
            window.dispatchEvent(event);
        }
    }

    /**
     * 监听事件
     * @param {string} eventName - 事件名称
     * @param {Function} handler - 事件处理函数
     */
    on(eventName, handler) {
        this._eventTarget.addEventListener(eventName, handler);

        // 向后兼容：也监听 window 事件
        if (typeof window !== 'undefined') {
            window.addEventListener(eventName, handler);
        }
    }

    /**
     * 移除事件监听
     * @param {string} eventName - 事件名称
     * @param {Function} handler - 事件处理函数
     */
    off(eventName, handler) {
        this._eventTarget.removeEventListener(eventName, handler);

        // 向后兼容：也移除 window 事件监听
        if (typeof window !== 'undefined') {
            window.removeEventListener(eventName, handler);
        }
    }

    /**
     * 一次性事件监听（触发后自动移除）
     * @param {string} eventName - 事件名称
     * @param {Function} handler - 事件处理函数
     */
    once(eventName, handler) {
        const wrappedHandler = (event) => {
            handler(event);
            this.off(eventName, wrappedHandler);
        };
        this.on(eventName, wrappedHandler);
    }

    /**
     * 清空所有注册（慎用，主要用于测试）
     */
    clear() {
        const names = Array.from(this._components.keys());
        names.forEach(name => this.unregister(name));
    }
}

// 创建单例
export const registry = new ComponentRegistry();

// 向后兼容：暴露到 window
if (typeof window !== 'undefined') {
    window.YiRegistry = registry;
}

export default registry;
