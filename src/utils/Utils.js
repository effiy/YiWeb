/**
 * 工具类
 * @author liangliang
 * @version 1.0.0
 */

/**
 * 工具类
 */
export class Utils {
    constructor() {
        this.cache = new Map();
        this.debounceTimers = new Map();
    }

    /**
     * DOM 工具函数
     */
    dom = {
        /**
         * 获取元素
         */
        get(selector) {
            return document.querySelector(selector);
        },

        /**
         * 获取所有元素
         */
        getAll(selector) {
            return document.querySelectorAll(selector);
        },

        /**
         * 创建元素
         */
        create(tag, attributes = {}) {
            const element = document.createElement(tag);
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'textContent') {
                    element.textContent = value;
                } else if (key === 'innerHTML') {
                    element.innerHTML = value;
                } else {
                    element.setAttribute(key, value);
                }
            });
            return element;
        },

        /**
         * 添加事件监听
         */
        on(element, event, handler, options = {}) {
            element.addEventListener(event, handler, options);
            return () => element.removeEventListener(event, handler);
        },

        /**
         * 移除事件监听
         */
        off(element, event, handler) {
            element.removeEventListener(event, handler);
        },

        /**
         * 添加类名
         */
        addClass(element, className) {
            element.classList.add(className);
        },

        /**
         * 移除类名
         */
        removeClass(element, className) {
            element.classList.remove(className);
        },

        /**
         * 切换类名
         */
        toggleClass(element, className) {
            element.classList.toggle(className);
        },

        /**
         * 检查是否有类名
         */
        hasClass(element, className) {
            return element.classList.contains(className);
        },

        /**
         * 设置样式
         */
        setStyle(element, styles) {
            Object.entries(styles).forEach(([property, value]) => {
                element.style[property] = value;
            });
        },

        /**
         * 获取样式
         */
        getStyle(element, property) {
            return window.getComputedStyle(element).getPropertyValue(property);
        },

        /**
         * 显示元素
         */
        show(element) {
            element.style.display = '';
        },

        /**
         * 隐藏元素
         */
        hide(element) {
            element.style.display = 'none';
        },

        /**
         * 检查元素是否可见
         */
        isVisible(element) {
            return element.offsetWidth > 0 && element.offsetHeight > 0;
        }
    };

    /**
     * 字符串工具函数
     */
    string = {
        /**
         * 截断字符串
         */
        truncate(str, length, suffix = '...') {
            if (str.length <= length) return str;
            return str.substring(0, length) + suffix;
        },

        /**
         * 首字母大写
         */
        capitalize(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        },

        /**
         * 转换为驼峰命名
         */
        toCamelCase(str) {
            return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
        },

        /**
         * 转换为短横线命名
         */
        toKebabCase(str) {
            return str.replace(/([A-Z])/g, '-$1').toLowerCase();
        },

        /**
         * 生成随机字符串
         */
        random(length = 8) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        },

        /**
         * 转义HTML
         */
        escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },

        /**
         * 反转义HTML
         */
        unescapeHtml(str) {
            const div = document.createElement('div');
            div.innerHTML = str;
            return div.textContent;
        }
    };

    /**
     * 数组工具函数
     */
    array = {
        /**
         * 去重
         */
        unique(arr) {
            return [...new Set(arr)];
        },

        /**
         * 分组
         */
        groupBy(arr, key) {
            return arr.reduce((groups, item) => {
                const group = item[key];
                groups[group] = groups[group] || [];
                groups[group].push(item);
                return groups;
            }, {});
        },

        /**
         * 排序
         */
        sortBy(arr, key, order = 'asc') {
            return [...arr].sort((a, b) => {
                const aVal = a[key];
                const bVal = b[key];
                if (order === 'desc') {
                    return bVal > aVal ? 1 : -1;
                }
                return aVal > bVal ? 1 : -1;
            });
        },

        /**
         * 分页
         */
        paginate(arr, page, pageSize) {
            const start = (page - 1) * pageSize;
            const end = start + pageSize;
            return {
                data: arr.slice(start, end),
                total: arr.length,
                page,
                pageSize,
                totalPages: Math.ceil(arr.length / pageSize)
            };
        },

        /**
         * 随机打乱
         */
        shuffle(arr) {
            const shuffled = [...arr];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        }
    };

    /**
     * 对象工具函数
     */
    object = {
        /**
         * 深拷贝
         */
        deepClone(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            if (obj instanceof Date) return new Date(obj.getTime());
            if (obj instanceof Array) return obj.map(item => this.deepClone(item));
            if (typeof obj === 'object') {
                const cloned = {};
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        cloned[key] = this.deepClone(obj[key]);
                    }
                }
                return cloned;
            }
        },

        /**
         * 合并对象
         */
        merge(target, ...sources) {
            sources.forEach(source => {
                for (const key in source) {
                    if (source.hasOwnProperty(key)) {
                        if (typeof source[key] === 'object' && source[key] !== null) {
                            target[key] = this.merge(target[key] || {}, source[key]);
                        } else {
                            target[key] = source[key];
                        }
                    }
                }
            });
            return target;
        },

        /**
         * 获取嵌套属性
         */
        get(obj, path, defaultValue = undefined) {
            const keys = path.split('.');
            let result = obj;
            
            for (const key of keys) {
                if (result && typeof result === 'object' && key in result) {
                    result = result[key];
                } else {
                    return defaultValue;
                }
            }
            
            return result;
        },

        /**
         * 设置嵌套属性
         */
        set(obj, path, value) {
            const keys = path.split('.');
            let current = obj;
            
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (!(key in current) || typeof current[key] !== 'object') {
                    current[key] = {};
                }
                current = current[key];
            }
            
            current[keys[keys.length - 1]] = value;
            return obj;
        }
    };

    /**
     * 时间工具函数
     */
    time = {
        /**
         * 格式化时间
         */
        format(date, format = 'YYYY-MM-DD HH:mm:ss') {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            
            return format
                .replace('YYYY', year)
                .replace('MM', month)
                .replace('DD', day)
                .replace('HH', hours)
                .replace('mm', minutes)
                .replace('ss', seconds);
        },

        /**
         * 相对时间
         */
        fromNow(date) {
            const now = new Date();
            const diff = now - new Date(date);
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) return `${days}天前`;
            if (hours > 0) return `${hours}小时前`;
            if (minutes > 0) return `${minutes}分钟前`;
            return '刚刚';
        },

        /**
         * 获取时间戳
         */
        timestamp() {
            return Date.now();
        },

        /**
         * 延迟执行
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    };

    /**
     * 存储工具函数
     */
    storage = {
        /**
         * 设置本地存储
         */
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('设置本地存储失败:', error);
                return false;
            }
        },

        /**
         * 获取本地存储
         */
        get(key, defaultValue = null) {
            try {
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : defaultValue;
            } catch (error) {
                console.error('获取本地存储失败:', error);
                return defaultValue;
            }
        },

        /**
         * 移除本地存储
         */
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('移除本地存储失败:', error);
                return false;
            }
        },

        /**
         * 清空本地存储
         */
        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.error('清空本地存储失败:', error);
                return false;
            }
        }
    };

    /**
     * 网络工具函数
     */
    network = {
        /**
         * 发送请求
         */
        async request(url, options = {}) {
            const defaultOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            const config = this.object.merge(defaultOptions, options);
            
            try {
                const response = await fetch(url, config);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return await response.json();
                }
                
                return await response.text();
            } catch (error) {
                console.error('请求失败:', error);
                throw error;
            }
        },

        /**
         * GET请求
         */
        get(url, params = {}) {
            const queryString = new URLSearchParams(params).toString();
            const fullUrl = queryString ? `${url}?${queryString}` : url;
            return this.request(fullUrl);
        },

        /**
         * POST请求
         */
        post(url, data = {}) {
            return this.request(url, {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }
    };

    /**
     * 防抖函数
     */
    debounce(func, delay) {
        const key = func.toString();
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }
        
        const timer = setTimeout(() => {
            func();
            this.debounceTimers.delete(key);
        }, delay);
        
        this.debounceTimers.set(key, timer);
    }

    /**
     * 节流函数
     */
    throttle(func, delay) {
        let lastCall = 0;
        return function (...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return func.apply(this, args);
            }
        };
    }

    /**
     * 缓存函数
     */
    memoize(func) {
        return function (...args) {
            const key = JSON.stringify(args);
            if (this.cache.has(key)) {
                return this.cache.get(key);
            }
            
            const result = func.apply(this, args);
            this.cache.set(key, result);
            return result;
        };
    }

    /**
     * 错误报告
     */
    reportError(error) {
        console.error('错误报告:', error);
        
        // 这里可以发送错误到服务器
        const errorData = {
            message: error.message,
            stack: error.stack,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // 发送错误报告
        this.network.post('/api/errors', errorData).catch(() => {
            // 静默失败
        });
    }

    /**
     * 性能监控
     */
    performance = {
        /**
         * 测量函数执行时间
         */
        measure(name, func) {
            const start = performance.now();
            const result = func();
            const end = performance.now();
            
            console.log(`${name} 执行时间: ${end - start}ms`);
            return result;
        },

        /**
         * 异步测量
         */
        async measureAsync(name, func) {
            const start = performance.now();
            const result = await func();
            const end = performance.now();
            
            console.log(`${name} 执行时间: ${end - start}ms`);
            return result;
        }
    };
} 