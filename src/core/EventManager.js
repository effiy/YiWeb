/**
 * 事件管理类
 * @author liangliang
 * @version 1.0.0
 */

/**
 * 事件管理类
 */
export class EventManager {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Map();
        this.eventHistory = [];
        this.maxHistory = 100;
    }

    /**
     * 注册事件监听器
     */
    on(event, callback, options = {}) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        
        const callbacks = this.events.get(event);
        callbacks.add(callback);
        
        // 记录事件历史
        this.addToHistory('register', event, callback);
        
        // 返回取消订阅函数
        return () => {
            this.off(event, callback);
        };
    }

    /**
     * 注册一次性事件监听器
     */
    once(event, callback) {
        const wrappedCallback = (...args) => {
            callback(...args);
            this.off(event, wrappedCallback);
        };
        
        this.on(event, wrappedCallback);
    }

    /**
     * 移除事件监听器
     */
    off(event, callback) {
        const callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.delete(callback);
            
            // 如果没有监听器了，删除事件
            if (callbacks.size === 0) {
                this.events.delete(event);
            }
        }
        
        this.addToHistory('unregister', event, callback);
    }

    /**
     * 移除所有事件监听器
     */
    offAll(event) {
        this.events.delete(event);
        this.addToHistory('unregisterAll', event);
    }

    /**
     * 触发事件
     */
    emit(event, ...args) {
        const callbacks = this.events.get(event);
        
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`事件回调错误 [${event}]:`, error);
                }
            });
        }
        
        // 记录事件历史
        this.addToHistory('emit', event, args);
        
        // 触发全局事件
        this.triggerGlobalEvent(event, args);
    }

    /**
     * 触发全局事件
     */
    triggerGlobalEvent(event, args) {
        // 创建自定义事件
        const customEvent = new CustomEvent(event, {
            detail: args,
            bubbles: true,
            cancelable: true
        });
        
        // 分发到文档
        document.dispatchEvent(customEvent);
    }

    /**
     * 获取事件监听器数量
     */
    getListenerCount(event) {
        const callbacks = this.events.get(event);
        return callbacks ? callbacks.size : 0;
    }

    /**
     * 获取所有事件
     */
    getAllEvents() {
        return Array.from(this.events.keys());
    }

    /**
     * 检查事件是否有监听器
     */
    hasListeners(event) {
        return this.events.has(event) && this.events.get(event).size > 0;
    }

    /**
     * 添加事件历史
     */
    addToHistory(type, event, data) {
        this.eventHistory.push({
            type,
            event,
            data,
            timestamp: Date.now()
        });
        
        if (this.eventHistory.length > this.maxHistory) {
            this.eventHistory.shift();
        }
    }

    /**
     * 获取事件历史
     */
    getHistory() {
        return [...this.eventHistory];
    }

    /**
     * 清空事件历史
     */
    clearHistory() {
        this.eventHistory = [];
    }

    /**
     * 获取事件统计
     */
    getStats() {
        const stats = {
            totalEvents: this.events.size,
            totalListeners: 0,
            historyCount: this.eventHistory.length
        };
        
        for (const callbacks of this.events.values()) {
            stats.totalListeners += callbacks.size;
        }
        
        return stats;
    }

    /**
     * 清空所有事件
     */
    clear() {
        this.events.clear();
        this.eventHistory = [];
    }

    /**
     * 创建事件命名空间
     */
    namespace(namespace) {
        return {
            on: (event, callback) => this.on(`${namespace}:${event}`, callback),
            once: (event, callback) => this.once(`${namespace}:${event}`, callback),
            off: (event, callback) => this.off(`${namespace}:${event}`, callback),
            emit: (event, ...args) => this.emit(`${namespace}:${event}`, ...args)
        };
    }

    /**
     * 批量注册事件
     */
    batchRegister(events) {
        const unsubscribers = [];
        
        Object.entries(events).forEach(([event, callback]) => {
            const unsubscriber = this.on(event, callback);
            unsubscribers.push(unsubscriber);
        });
        
        // 返回批量取消订阅函数
        return () => {
            unsubscribers.forEach(unsubscriber => unsubscriber());
        };
    }

    /**
     * 监听所有事件
     */
    onAll(callback) {
        return this.on('*', callback);
    }

    /**
     * 创建事件代理
     */
    createProxy(target) {
        return new Proxy(target, {
            get: (obj, prop) => {
                if (prop === 'emit') {
                    return (event, ...args) => {
                        this.emit(event, ...args);
                        return obj[prop](event, ...args);
                    };
                }
                return obj[prop];
            }
        });
    }

    /**
     * 事件防抖
     */
    debounce(event, delay) {
        let timeout;
        
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                this.emit(event, ...args);
            }, delay);
        };
    }

    /**
     * 事件节流
     */
    throttle(event, delay) {
        let lastCall = 0;
        
        return (...args) => {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                this.emit(event, ...args);
            }
        };
    }

    /**
     * 事件过滤器
     */
    filter(event, filterFn) {
        return (...args) => {
            if (filterFn(...args)) {
                this.emit(event, ...args);
            }
        };
    }

    /**
     * 事件映射
     */
    map(event, mapFn) {
        return (...args) => {
            const mappedArgs = mapFn(...args);
            this.emit(event, ...mappedArgs);
        };
    }

    /**
     * 事件重试
     */
    retry(event, maxRetries = 3, delay = 1000) {
        let retryCount = 0;
        
        return (...args) => {
            const attempt = () => {
                try {
                    this.emit(event, ...args);
                } catch (error) {
                    retryCount++;
                    if (retryCount < maxRetries) {
                        setTimeout(attempt, delay);
                    } else {
                        console.error(`事件重试失败 [${event}]:`, error);
                    }
                }
            };
            
            attempt();
        };
    }

    /**
     * 事件链
     */
    chain(...events) {
        return (...args) => {
            events.forEach(event => {
                this.emit(event, ...args);
            });
        };
    }

    /**
     * 事件条件
     */
    when(event, conditionFn) {
        return (...args) => {
            if (conditionFn(...args)) {
                this.emit(event, ...args);
            }
        };
    }

    /**
     * 事件延迟
     */
    delay(event, delay) {
        return (...args) => {
            setTimeout(() => {
                this.emit(event, ...args);
            }, delay);
        };
    }

    /**
     * 事件优先级
     */
    priority(event, priority = 0) {
        const originalEmit = this.emit.bind(this);
        
        return (...args) => {
            setTimeout(() => {
                originalEmit(event, ...args);
            }, priority);
        };
    }

    /**
     * 事件分组
     */
    group(events, groupName) {
        const groupEvents = events.map(event => `${groupName}:${event}`);
        
        return {
            on: (event, callback) => {
                const fullEvent = `${groupName}:${event}`;
                return this.on(fullEvent, callback);
            },
            emit: (event, ...args) => {
                const fullEvent = `${groupName}:${event}`;
                return this.emit(fullEvent, ...args);
            }
        };
    }

    /**
     * 事件中间件
     */
    use(middleware) {
        const originalEmit = this.emit.bind(this);
        
        this.emit = (event, ...args) => {
            const result = middleware(event, args);
            if (result !== false) {
                originalEmit(event, ...args);
            }
        };
    }

    /**
     * 事件日志
     */
    enableLogging() {
        this.use((event, args) => {
            console.log(`[Event] ${event}:`, args);
            return true;
        });
    }

    /**
     * 事件性能监控
     */
    enablePerformanceMonitoring() {
        this.use((event, args) => {
            const start = performance.now();
            
            return () => {
                const end = performance.now();
                console.log(`[Performance] ${event}: ${end - start}ms`);
            };
        });
    }
} 