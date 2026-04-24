/**
 * 存储工具函数
 * author: liangliang
 */

/**
 * LocalStorage封装
 */
export const storage = {
    /**
     * 设置存储项
     * @param {string} key - 键
     * @param {*} value - 值
     * @param {number} expires - 过期时间（毫秒）
     * @returns {boolean} 是否成功
     */
    set(key, value, expires) {
        try {
            const data = {
                value,
                timestamp: Date.now(),
                expires: expires ? Date.now() + expires : null
            };

            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    },

    /**
     * 获取存储项
     * @param {string} key - 键
     * @param {*} defaultValue - 默认值
     * @returns {*} 值
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);

            if (!item) {
                return defaultValue;
            }

            const data = JSON.parse(item);

            // 检查是否过期
            if (data.expires && Date.now() > data.expires) {
                this.remove(key);
                return defaultValue;
            }

            return data.value;
        } catch (error) {
            console.error('Storage get error:', error);
            return defaultValue;
        }
    },

    /**
     * 移除存储项
     * @param {string} key - 键
     * @returns {boolean} 是否成功
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    },

    /**
     * 清空存储
     * @returns {boolean} 是否成功
     */
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    },

    /**
     * 检查键是否存在
     * @param {string} key - 键
     * @returns {boolean} 是否存在
     */
    has(key) {
        return localStorage.getItem(key) !== null;
    },

    /**
     * 获取所有键
     * @returns {Array<string>} 键数组
     */
    keys() {
        return Object.keys(localStorage);
    },

    /**
     * 获取存储大小（字节）
     * @returns {number} 大小
     */
    size() {
        let size = 0;
        for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                size += localStorage[key].length + key.length;
            }
        }
        return size;
    }
};

/**
 * SessionStorage封装
 */
export const sessionStorage = {
    /**
     * 设置存储项
     * @param {string} key - 键
     * @param {*} value - 值
     * @returns {boolean} 是否成功
     */
    set(key, value) {
        try {
            window.sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('SessionStorage set error:', error);
            return false;
        }
    },

    /**
     * 获取存储项
     * @param {string} key - 键
     * @param {*} defaultValue - 默认值
     * @returns {*} 值
     */
    get(key, defaultValue = null) {
        try {
            const item = window.sessionStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('SessionStorage get error:', error);
            return defaultValue;
        }
    },

    /**
     * 移除存储项
     * @param {string} key - 键
     * @returns {boolean} 是否成功
     */
    remove(key) {
        try {
            window.sessionStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('SessionStorage remove error:', error);
            return false;
        }
    },

    /**
     * 清空存储
     * @returns {boolean} 是否成功
     */
    clear() {
        try {
            window.sessionStorage.clear();
            return true;
        } catch (error) {
            console.error('SessionStorage clear error:', error);
            return false;
        }
    },

    /**
     * 检查键是否存在
     * @param {string} key - 键
     * @returns {boolean} 是否存在
     */
    has(key) {
        return window.sessionStorage.getItem(key) !== null;
    },

    /**
     * 获取所有键
     * @returns {Array<string>} 键数组
     */
    keys() {
        return Object.keys(window.sessionStorage);
    }
};

/**
 * Cookie操作
 */
export const cookie = {
    /**
     * 设置Cookie
     * @param {string} name - 名称
     * @param {string} value - 值
     * @param {Object} options - 选项
     * @returns {boolean} 是否成功
     */
    set(name, value, options = {}) {
        try {
            const {
                expires,
                maxAge,
                path = '/',
                domain,
                secure,
                sameSite = 'Lax'
            } = options;

            let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

            if (expires) {
                const date = expires instanceof Date ? expires : new Date(expires);
                cookieString += `; expires=${date.toUTCString()}`;
            }

            if (maxAge) {
                cookieString += `; max-age=${maxAge}`;
            }

            if (path) {
                cookieString += `; path=${path}`;
            }

            if (domain) {
                cookieString += `; domain=${domain}`;
            }

            if (secure) {
                cookieString += '; secure';
            }

            if (sameSite) {
                cookieString += `; samesite=${sameSite}`;
            }

            document.cookie = cookieString;
            return true;
        } catch (error) {
            console.error('Cookie set error:', error);
            return false;
        }
    },

    /**
     * 获取Cookie
     * @param {string} name - 名称
     * @returns {string|null} 值
     */
    get(name) {
        try {
            const cookies = document.cookie.split(';');

            for (const cookie of cookies) {
                const [key, value] = cookie.trim().split('=');

                if (decodeURIComponent(key) === name) {
                    return decodeURIComponent(value);
                }
            }

            return null;
        } catch (error) {
            console.error('Cookie get error:', error);
            return null;
        }
    },

    /**
     * 移除Cookie
     * @param {string} name - 名称
     * @param {Object} options - 选项
     * @returns {boolean} 是否成功
     */
    remove(name, options = {}) {
        return this.set(name, '', { ...options, maxAge: -1 });
    },

    /**
     * 检查Cookie是否存在
     * @param {string} name - 名称
     * @returns {boolean} 是否存在
     */
    has(name) {
        return this.get(name) !== null;
    },

    /**
     * 获取所有Cookie
     * @returns {Object} Cookie对象
     */
    getAll() {
        try {
            const cookies = {};
            const cookieStrings = document.cookie.split(';');

            for (const cookie of cookieStrings) {
                const [key, value] = cookie.trim().split('=');
                if (key) {
                    cookies[decodeURIComponent(key)] = decodeURIComponent(value || '');
                }
            }

            return cookies;
        } catch (error) {
            console.error('Cookie getAll error:', error);
            return {};
        }
    }
};

/**
 * IndexedDB封装
 */
export class IndexedDBStorage {
    constructor(dbName, storeName, version = 1) {
        this.dbName = dbName;
        this.storeName = storeName;
        this.version = version;
        this.db = null;
    }

    /**
     * 打开数据库
     * @returns {Promise<IDBDatabase>} 数据库实例
     */
    async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }

    /**
     * 添加数据
     * @param {*} data - 数据
     * @returns {Promise<number>} ID
     */
    async add(data) {
        if (!this.db) await this.open();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 获取数据
     * @param {number} id - ID
     * @returns {Promise<*>} 数据
     */
    async get(id) {
        if (!this.db) await this.open();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 更新数据
     * @param {*} data - 数据
     * @returns {Promise<number>} ID
     */
    async update(data) {
        if (!this.db) await this.open();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 删除数据
     * @param {number} id - ID
     * @returns {Promise<void>}
     */
    async delete(id) {
        if (!this.db) await this.open();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 获取所有数据
     * @returns {Promise<Array>} 数据数组
     */
    async getAll() {
        if (!this.db) await this.open();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 清空数据
     * @returns {Promise<void>}
     */
    async clear() {
        if (!this.db) await this.open();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 关闭数据库
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

export default {
    storage,
    sessionStorage,
    cookie,
    IndexedDBStorage
};
