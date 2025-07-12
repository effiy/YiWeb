/**
 * 新闻存储工具函数
 
 * 
 * 从news/utils/index.js中提取的存储相关功能
 */

import { safeSetItem, safeGetItem } from '../../shared/utils/common.js';
import { getConfig } from '../../shared/config/index.js';

/**
 * 新闻存储管理器
 */
export class NewsStorageManager {
    constructor() {
        this.storagePrefix = getConfig('base.STORAGE_PREFIX', 'yiweb_');
        this.cacheKey = getConfig('news.CACHE_KEY', 'newsCache');
        this.maxCacheSize = getConfig('news.MAX_CACHE_SIZE', 1000);
        this.cacheDuration = getConfig('news.CACHE_DURATION', 30 * 60 * 1000); // 30分钟
    }

    /**
     * 安全存储新闻缓存
     * @param {string} key - 缓存键
     * @param {*} value - 缓存值
     * @returns {boolean} 是否存储成功
     */
    setCacheItem(key, value) {
        const cacheKey = `${this.storagePrefix}${key}`;
        const cacheData = {
            data: value,
            timestamp: Date.now(),
            expires: Date.now() + this.cacheDuration
        };
        
        return safeSetItem(cacheKey, cacheData);
    }

    /**
     * 安全读取新闻缓存
     * @param {string} key - 缓存键
     * @param {*} defaultValue - 默认值
     * @returns {*} 缓存值
     */
    getCacheItem(key, defaultValue = null) {
        const cacheKey = `${this.storagePrefix}${key}`;
        const cacheData = safeGetItem(cacheKey);
        
        if (!cacheData) {
            return defaultValue;
        }
        
        // 检查是否过期
        if (Date.now() > cacheData.expires) {
            this.removeCacheItem(key);
            return defaultValue;
        }
        
        return cacheData.data;
    }

    /**
     * 移除缓存项
     * @param {string} key - 缓存键
     */
    removeCacheItem(key) {
        const cacheKey = `${this.storagePrefix}${key}`;
        try {
            localStorage.removeItem(cacheKey);
        } catch (error) {
            console.warn(`移除缓存项失败 (${key}):`, error);
        }
    }

    /**
     * 清理过期缓存
     */
    cleanExpiredCache() {
        const now = Date.now();
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.storagePrefix)) {
                try {
                    const cacheData = JSON.parse(localStorage.getItem(key));
                    if (cacheData && cacheData.expires && now > cacheData.expires) {
                        keysToRemove.push(key);
                    }
                } catch (error) {
                    // 无效的缓存数据，也要清理
                    keysToRemove.push(key);
                }
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        console.log(`清理了 ${keysToRemove.length} 个过期缓存项`);
    }

    /**
     * 清理最老的缓存项
     * @param {number} count - 要清理的数量
     */
    cleanOldestCache(count = 5) {
        const cacheItems = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.storagePrefix)) {
                try {
                    const cacheData = JSON.parse(localStorage.getItem(key));
                    if (cacheData && cacheData.timestamp) {
                        cacheItems.push({
                            key,
                            timestamp: cacheData.timestamp
                        });
                    }
                } catch (error) {
                    // 无效的缓存数据，直接添加到清理列表
                    cacheItems.push({
                        key,
                        timestamp: 0
                    });
                }
            }
        }
        
        // 按时间戳排序，最老的在前面
        cacheItems.sort((a, b) => a.timestamp - b.timestamp);
        
        // 清理最老的几个
        const itemsToRemove = cacheItems.slice(0, count);
        itemsToRemove.forEach(item => {
            localStorage.removeItem(item.key);
        });
        
        console.log(`清理了 ${itemsToRemove.length} 个最老的缓存项`);
    }

    /**
     * 获取缓存统计信息
     * @returns {Object} 统计信息
     */
    getCacheStats() {
        let totalItems = 0;
        let totalSize = 0;
        let expiredItems = 0;
        const now = Date.now();
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.storagePrefix)) {
                totalItems++;
                const value = localStorage.getItem(key);
                totalSize += value.length;
                
                try {
                    const cacheData = JSON.parse(value);
                    if (cacheData && cacheData.expires && now > cacheData.expires) {
                        expiredItems++;
                    }
                } catch (error) {
                    expiredItems++;
                }
            }
        }
        
        return {
            totalItems,
            totalSize,
            expiredItems,
            validItems: totalItems - expiredItems
        };
    }

    /**
     * 存储搜索历史
     * @param {Array} history - 搜索历史数组
     */
    setSearchHistory(history) {
        const key = getConfig('search.SEARCH_HISTORY_KEY', 'newsSearchHistory');
        const maxLength = getConfig('search.MAX_SEARCH_HISTORY', 10);
        
        // 限制历史记录数量
        const limitedHistory = history.slice(0, maxLength);
        return safeSetItem(key, limitedHistory);
    }

    /**
     * 获取搜索历史
     * @returns {Array} 搜索历史数组
     */
    getSearchHistory() {
        const key = getConfig('search.SEARCH_HISTORY_KEY', 'newsSearchHistory');
        return safeGetItem(key, []);
    }

    /**
     * 添加搜索历史项
     * @param {string} query - 搜索查询
     */
    addSearchHistoryItem(query) {
        const history = this.getSearchHistory();
        const maxLength = getConfig('search.MAX_SEARCH_HISTORY', 10);
        
        // 去重并移到最前面
        const filteredHistory = history.filter(item => item !== query);
        filteredHistory.unshift(query);
        
        // 限制数量
        const limitedHistory = filteredHistory.slice(0, maxLength);
        
        this.setSearchHistory(limitedHistory);
    }

    /**
     * 清空搜索历史
     */
    clearSearchHistory() {
        const key = getConfig('search.SEARCH_HISTORY_KEY', 'newsSearchHistory');
        this.removeCacheItem(key);
    }

    /**
     * 存储用户偏好设置
     * @param {Object} preferences - 偏好设置对象
     */
    setUserPreferences(preferences) {
        const key = 'userPreferences';
        return safeSetItem(`${this.storagePrefix}${key}`, preferences);
    }

    /**
     * 获取用户偏好设置
     * @returns {Object} 偏好设置对象
     */
    getUserPreferences() {
        const key = 'userPreferences';
        return safeGetItem(`${this.storagePrefix}${key}`, {});
    }

    /**
     * 更新用户偏好设置
     * @param {Object} updates - 要更新的设置
     */
    updateUserPreferences(updates) {
        const current = this.getUserPreferences();
        const updated = { ...current, ...updates };
        this.setUserPreferences(updated);
    }

    /**
     * 存储新闻阅读记录
     * @param {Array} readNews - 已读新闻ID数组
     */
    setReadNews(readNews) {
        const key = 'readNews';
        const maxLength = getConfig('news.MAX_READ_NEWS', 500);
        
        // 限制记录数量
        const limitedReadNews = readNews.slice(0, maxLength);
        return safeSetItem(`${this.storagePrefix}${key}`, limitedReadNews);
    }

    /**
     * 获取新闻阅读记录
     * @returns {Array} 已读新闻ID数组
     */
    getReadNews() {
        const key = 'readNews';
        return safeGetItem(`${this.storagePrefix}${key}`, []);
    }

    /**
     * 标记新闻为已读
     * @param {string} newsId - 新闻ID
     */
    markNewsAsRead(newsId) {
        const readNews = this.getReadNews();
        if (!readNews.includes(newsId)) {
            readNews.push(newsId);
            this.setReadNews(readNews);
        }
    }

    /**
     * 检查新闻是否已读
     * @param {string} newsId - 新闻ID
     * @returns {boolean} 是否已读
     */
    isNewsRead(newsId) {
        const readNews = this.getReadNews();
        return readNews.includes(newsId);
    }

    /**
     * 清理所有存储数据
     */
    clearAllData() {
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.storagePrefix)) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        console.log(`清理了 ${keysToRemove.length} 个存储项`);
    }
}

// 创建默认实例
const newsStorageManager = new NewsStorageManager();

// 导出实例（类已在声明时导出）
export default newsStorageManager; 