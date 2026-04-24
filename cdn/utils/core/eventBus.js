/**
 * 事件总线工具
 * author: liangliang
 */

class EventBus {
    constructor() {
        this.events = new Map();
    }

    /**
     * 订阅事件
     * @param {string} event - 事件名
     * @param {Function} handler - 处理函数
     * @param {Object} options - 选项
     * @returns {Function} 取消订阅函数
     */
    on(event, handler, options = {}) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        const listener = {
            handler,
            once: options.once || false,
            priority: options.priority || 0
        };

        const listeners = this.events.get(event);
        listeners.push(listener);

        // 按优先级排序
        listeners.sort((a, b) => b.priority - a.priority);

        // 返回取消订阅函数
        return () => this.off(event, handler);
    }

    /**
     * 订阅一次性事件
     * @param {string} event - 事件名
     * @param {Function} handler - 处理函数
     * @returns {Function} 取消订阅函数
     */
    once(event, handler) {
        return this.on(event, handler, { once: true });
    }

    /**
     * 取消订阅
     * @param {string} event - 事件名
     * @param {Function} handler - 处理函数
     */
    off(event, handler) {
        if (!this.events.has(event)) return;

        const listeners = this.events.get(event);
        const index = listeners.findIndex(listener => listener.handler === handler);

        if (index > -1) {
            listeners.splice(index, 1);
        }

        if (listeners.length === 0) {
            this.events.delete(event);
        }
    }

    /**
     * 触发事件
     * @param {string} event - 事件名
     * @param {...*} args - 参数
     */
    emit(event, ...args) {
        if (!this.events.has(event)) return;

        const listeners = [...this.events.get(event)];

        for (const listener of listeners) {
            try {
                listener.handler(...args);

                if (listener.once) {
                    this.off(event, listener.handler);
                }
            } catch (error) {
                console.error(`Error in event handler for "${event}":`, error);
            }
        }
    }

    /**
     * 清空所有事件
     */
    clear() {
        this.events.clear();
    }

    /**
     * 获取事件监听器数量
     * @param {string} event - 事件名
     * @returns {number} 数量
     */
    listenerCount(event) {
        if (!this.events.has(event)) return 0;
        return this.events.get(event).length;
    }

    /**
     * 获取所有事件名
     * @returns {Array<string>} 事件名数组
     */
    eventNames() {
        return Array.from(this.events.keys());
    }
}

// 创建全局事件总线实例
export const eventBus = new EventBus();

// 导出类供创建独立实例
export { EventBus };

export default eventBus;
