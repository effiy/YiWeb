/**
 * 新闻工具函数统一入口
 
 * 
 * 重构后的新闻工具函数，整合所有子模块
 */

// 导入子模块
import newsStorageManager from './storage.js';
import newsFormatterManager from './formatter.js';
import newsSearchManager from './search.js';

// 导入类（从类声明的export获取）
import { NewsStorageManager } from './storage.js';
import { NewsFormatterManager } from './formatter.js';  
import { NewsSearchManager } from './search.js';

// 导入共享工具函数
import { 
    debounce, 
    throttle, 
    safeSetItem, 
    safeGetItem, 
    formatTime, 
    extractExcerpt,
    isSearchMatch,
    updateUrlParams,
    getUrlParam
} from '../../shared/utils/common.js';

/**
 * 统一的工具函数对象
 * 保持与原有接口的兼容性
 */
export const utils = {
    // 存储相关
    safeSetItem: (key, value) => safeSetItem(key, value),
    safeGetItem: (key, defaultValue = null) => safeGetItem(key, defaultValue),
    
    // 时间格式化
    formatTimeAgo: (dateString) => formatTime(dateString, 'ago'),
    
    // 文本处理
    extractExcerpt: (item, maxLength = 100) => extractExcerpt(item.content || item.description || '', maxLength),
    
    // 分类处理
    categorizeNewsItem: (item) => newsFormatterManager.categorizeNewsItem(item),
    
    // 来源处理
    getNewsSource: (item) => newsFormatterManager.getNewsSource(item),
    
    // 搜索匹配
    isSearchMatch: (item, query) => newsSearchManager.isNewsMatch(item, query),
    
    // URL参数处理
    updateUrlParams: (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        updateUrlParams({ date: dateStr });
    },
    
    // 防抖函数
    debounce: (func, wait) => debounce(func, wait),
    
    // 节流函数
    throttle: (func, limit) => throttle(func, limit),
    
    // 获取URL参数
    getUrlParam: (key) => getUrlParam(key),
    
    // 新增的便捷方法
    
    /**
     * 格式化新闻项
     * @param {Object} item - 新闻项
     * @param {Object} options - 格式化选项
     * @returns {Object} 格式化后的新闻项
     */
    formatNewsItem: (item, options = {}) => {
        return newsFormatterManager.formatNewsItem(item, options);
    },
    
    /**
     * 批量格式化新闻项
     * @param {Array} items - 新闻项数组
     * @param {Object} options - 格式化选项
     * @returns {Array} 格式化后的新闻项数组
     */
    formatNewsItems: (items, options = {}) => {
        return newsFormatterManager.formatNewsItems(items, options);
    },
    
    /**
     * 搜索新闻
     * @param {Array} items - 新闻项数组
     * @param {string} query - 搜索查询
     * @param {Object} options - 搜索选项
     * @returns {Array} 搜索结果数组
     */
    searchNews: (items, query, options = {}) => {
        return newsSearchManager.searchNews(items, query, options);
    },
    
    /**
     * 高级搜索
     * @param {Array} items - 新闻项数组
     * @param {Object} criteria - 搜索条件
     * @returns {Array} 搜索结果数组
     */
    advancedSearch: (items, criteria) => {
        return newsSearchManager.advancedSearch(items, criteria);
    },
    
    /**
     * 获取搜索建议
     * @param {Array} items - 新闻项数组
     * @param {string} query - 搜索查询
     * @param {number} limit - 建议数量限制
     * @returns {Array} 搜索建议数组
     */
    getSearchSuggestions: (items, query, limit = 5) => {
        return newsSearchManager.getSearchSuggestions(items, query, limit);
    },
    
    /**
     * 获取搜索统计信息
     * @param {Array} items - 新闻项数组
     * @param {string} query - 搜索查询
     * @returns {Object} 统计信息
     */
    getSearchStats: (items, query) => {
        return newsSearchManager.getSearchStats(items, query);
    },
    
    /**
     * 缓存管理
     * @param {string} key - 缓存键
     * @param {*} value - 缓存值
     * @returns {boolean} 是否成功
     */
    setCacheItem: (key, value) => {
        return newsStorageManager.setCacheItem(key, value);
    },
    
    /**
     * 获取缓存
     * @param {string} key - 缓存键
     * @param {*} defaultValue - 默认值
     * @returns {*} 缓存值
     */
    getCacheItem: (key, defaultValue = null) => {
        return newsStorageManager.getCacheItem(key, defaultValue);
    },
    
    /**
     * 清理过期缓存
     */
    cleanExpiredCache: () => {
        return newsStorageManager.cleanExpiredCache();
    },
    
    /**
     * 获取分类标签
     * @param {Object} item - 新闻项
     * @returns {Array} 分类标签数组
     */
    getCategoryTags: (item) => {
        return newsFormatterManager.getCategoryTags(item);
    },
    
    /**
     * 分页处理
     * @param {Array} items - 新闻项数组
     * @param {number} page - 页码
     * @param {number} pageSize - 每页大小
     * @returns {Object} 分页结果
     */
    paginate: (items, page = 1, pageSize = 20) => {
        return newsSearchManager.paginate(items, page, pageSize);
    },
    
    /**
     * 去重新闻项
     * @param {Array} items - 新闻项数组
     * @returns {Array} 去重后的新闻数组
     */
    deduplicateNews: (items) => {
        return newsSearchManager.deduplicateNews(items);
    },
    
    /**
     * 验证新闻项
     * @param {Object} item - 新闻项
     * @returns {boolean} 是否有效
     */
    validateNewsItem: (item) => {
        return newsFormatterManager.validateNewsItem(item);
    },
    
    /**
     * 清理新闻项数据
     * @param {Object} item - 新闻项
     * @returns {Object} 清理后的新闻项
     */
    sanitizeNewsItem: (item) => {
        return newsFormatterManager.sanitizeNewsItem(item);
    }
};

// 导出管理器实例，供高级用户使用
export { newsStorageManager, newsFormatterManager, newsSearchManager };

// 导出管理器类，供自定义实例使用
export { NewsStorageManager, NewsFormatterManager, NewsSearchManager };

// 默认导出工具函数对象
export default utils;

// 为了兼容性，将utils挂载到全局
if (typeof window !== 'undefined') {
    window.NewsUtils = utils;
} 