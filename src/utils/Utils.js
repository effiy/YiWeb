/**
 * 现代化工具类
 * @author liangliang
 * @version 2.0.0
 * @description 提供常用的工具函数和实用方法
 */

/**
 * 工具类
 */
export class Utils {
    constructor() {
        this.cache = new Map();
        this.debounceTimers = new Map();
        this.throttleTimers = new Map();
    }

    /**
     * 防抖函数
     * @param {Function} func 要防抖的函数
     * @param {number} delay 延迟时间
     * @param {string} key 缓存键
     * @returns {Function}
     */
    debounce(func, delay = 300, key = 'default') {
        return (...args) => {
            if (this.debounceTimers.has(key)) {
                clearTimeout(this.debounceTimers.get(key));
            }
            
            const timer = setTimeout(() => {
                func.apply(this, args);
                this.debounceTimers.delete(key);
            }, delay);
            
            this.debounceTimers.set(key, timer);
        };
    }

    /**
     * 节流函数
     * @param {Function} func 要节流的函数
     * @param {number} delay 延迟时间
     * @param {string} key 缓存键
     * @returns {Function}
     */
    throttle(func, delay = 300, key = 'default') {
        return (...args) => {
            if (this.throttleTimers.has(key)) {
                return;
            }
            
            func.apply(this, args);
            this.throttleTimers.set(key, true);
            
            setTimeout(() => {
                this.throttleTimers.delete(key);
            }, delay);
        };
    }

    /**
     * 深拷贝对象
     * @param {*} obj 要拷贝的对象
     * @returns {*}
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }
        
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }
        
        return obj;
    }

    /**
     * 合并对象
     * @param {...Object} objects 要合并的对象
     * @returns {Object}
     */
    merge(...objects) {
        return objects.reduce((result, obj) => {
            if (obj && typeof obj === 'object') {
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        if (result[key] && typeof result[key] === 'object' && typeof obj[key] === 'object') {
                            result[key] = this.merge(result[key], obj[key]);
                        } else {
                            result[key] = obj[key];
                        }
                    }
                }
            }
            return result;
        }, {});
    }

    /**
     * 获取对象嵌套属性值
     * @param {Object} obj 对象
     * @param {string} path 属性路径
     * @param {*} defaultValue 默认值
     * @returns {*}
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
    }

    /**
     * 设置对象嵌套属性值
     * @param {Object} obj 对象
     * @param {string} path 属性路径
     * @param {*} value 要设置的值
     * @returns {Object}
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

    /**
     * 格式化日期
     * @param {Date|string|number} date 日期
     * @param {string} format 格式
     * @returns {string}
     */
    formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
        const d = new Date(date);
        
        if (isNaN(d.getTime())) {
            return '';
        }
        
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
    }

    /**
     * 格式化相对时间
     * @param {Date|string|number} date 日期
     * @returns {string}
     */
    formatRelativeTime(date) {
        const now = new Date();
        const target = new Date(date);
        const diff = now - target;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}天前`;
        } else if (hours > 0) {
            return `${hours}小时前`;
        } else if (minutes > 0) {
            return `${minutes}分钟前`;
        } else {
            return '刚刚';
        }
    }

    /**
     * 生成随机ID
     * @param {number} length ID长度
     * @returns {string}
     */
    generateId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * 生成UUID
     * @returns {string}
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * 验证邮箱格式
     * @param {string} email 邮箱地址
     * @returns {boolean}
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * 验证手机号格式
     * @param {string} phone 手机号
     * @returns {boolean}
     */
    isValidPhone(phone) {
        const phoneRegex = /^1[3-9]\d{9}$/;
        return phoneRegex.test(phone);
    }

    /**
     * 验证URL格式
     * @param {string} url URL地址
     * @returns {boolean}
     */
    isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 截断文本
     * @param {string} text 文本
     * @param {number} length 最大长度
     * @param {string} suffix 后缀
     * @returns {string}
     */
    truncate(text, length = 100, suffix = '...') {
        if (text.length <= length) {
            return text;
        }
        return text.substring(0, length) + suffix;
    }

    /**
     * 转义HTML
     * @param {string} text 文本
     * @returns {string}
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 反转义HTML
     * @param {string} html HTML文本
     * @returns {string}
     */
    unescapeHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent;
    }

    /**
     * 复制文本到剪贴板
     * @param {string} text 要复制的文本
     * @returns {Promise<boolean>}
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // 降级方案
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            }
        } catch (error) {
            console.error('复制失败:', error);
            return false;
        }
    }

    /**
     * 下载文件
     * @param {string} url 文件URL
     * @param {string} filename 文件名
     */
    downloadFile(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * 获取文件扩展名
     * @param {string} filename 文件名
     * @returns {string}
     */
    getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
    }

    /**
     * 格式化文件大小
     * @param {number} bytes 字节数
     * @returns {string}
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 检测设备类型
     * @returns {string}
     */
    getDeviceType() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
            return 'mobile';
        } else if (/tablet|ipad/i.test(userAgent)) {
            return 'tablet';
        } else {
            return 'desktop';
        }
    }

    /**
     * 检测浏览器类型
     * @returns {string}
     */
    getBrowserType() {
        const userAgent = navigator.userAgent;
        
        if (userAgent.includes('Chrome')) {
            return 'Chrome';
        } else if (userAgent.includes('Firefox')) {
            return 'Firefox';
        } else if (userAgent.includes('Safari')) {
            return 'Safari';
        } else if (userAgent.includes('Edge')) {
            return 'Edge';
        } else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
            return 'IE';
        } else {
            return 'Unknown';
        }
    }

    /**
     * 检测操作系统
     * @returns {string}
     */
    getOS() {
        const userAgent = navigator.userAgent;
        
        if (userAgent.includes('Windows')) {
            return 'Windows';
        } else if (userAgent.includes('Mac')) {
            return 'macOS';
        } else if (userAgent.includes('Linux')) {
            return 'Linux';
        } else if (userAgent.includes('Android')) {
            return 'Android';
        } else if (userAgent.includes('iOS')) {
            return 'iOS';
        } else {
            return 'Unknown';
        }
    }

    /**
     * 检测网络状态
     * @returns {Promise<boolean>}
     */
    async checkNetworkStatus() {
        try {
            const response = await fetch('/favicon.ico', { 
                method: 'HEAD',
                cache: 'no-cache'
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * 获取网络信息
     * @returns {Object}
     */
    getNetworkInfo() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            return {
                effectiveType: connection.effectiveType,
                downlink: connection.downlink,
                rtt: connection.rtt,
                saveData: connection.saveData
            };
        }
        return null;
    }

    /**
     * 获取地理位置
     * @returns {Promise<Object>}
     */
    getGeolocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                position => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                error => {
                    reject(error);
                }
            );
        });
    }

    /**
     * 本地存储工具
     */
    storage = {
        /**
         * 设置本地存储
         * @param {string} key 键
         * @param {*} value 值
         */
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error('设置本地存储失败:', error);
            }
        },

        /**
         * 获取本地存储
         * @param {string} key 键
         * @param {*} defaultValue 默认值
         * @returns {*}
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
         * 删除本地存储
         * @param {string} key 键
         */
        remove(key) {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.error('删除本地存储失败:', error);
            }
        },

        /**
         * 清空本地存储
         */
        clear() {
            try {
                localStorage.clear();
            } catch (error) {
                console.error('清空本地存储失败:', error);
            }
        }
    };

    /**
     * 会话存储工具
     */
    session = {
        /**
         * 设置会话存储
         * @param {string} key 键
         * @param {*} value 值
         */
        set(key, value) {
            try {
                sessionStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error('设置会话存储失败:', error);
            }
        },

        /**
         * 获取会话存储
         * @param {string} key 键
         * @param {*} defaultValue 默认值
         * @returns {*}
         */
        get(key, defaultValue = null) {
            try {
                const value = sessionStorage.getItem(key);
                return value ? JSON.parse(value) : defaultValue;
            } catch (error) {
                console.error('获取会话存储失败:', error);
                return defaultValue;
            }
        },

        /**
         * 删除会话存储
         * @param {string} key 键
         */
        remove(key) {
            try {
                sessionStorage.removeItem(key);
            } catch (error) {
                console.error('删除会话存储失败:', error);
            }
        },

        /**
         * 清空会话存储
         */
        clear() {
            try {
                sessionStorage.clear();
            } catch (error) {
                console.error('清空会话存储失败:', error);
            }
        }
    };

    /**
     * 获取状态信息
     * @returns {Object}
     */
    getStatus() {
        return {
            deviceType: this.getDeviceType(),
            browserType: this.getBrowserType(),
            os: this.getOS(),
            networkInfo: this.getNetworkInfo(),
            cacheSize: this.cache.size,
            debounceTimers: this.debounceTimers.size,
            throttleTimers: this.throttleTimers.size
        };
    }
}

// 创建默认工具实例
export const defaultUtils = new Utils(); 