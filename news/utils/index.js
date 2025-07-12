/**
 * 新闻模块工具函数入口
 * author: liangliang
 * 
 * 专注于新闻特有功能，通用功能使用共享工具
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
} from '../../js/utils/common.js';

/**
 * 新闻工具函数对象
 * 重构后只保留新闻特有的功能
 */
export const utils = {
    // 存储相关 - 使用共享函数
    safeSetItem,
    safeGetItem,
    
    // 时间格式化 - 使用共享函数
    formatTimeAgo: (dateString) => formatTime(dateString, 'ago'),
    
    // 文本处理 - 使用共享函数
    extractExcerpt: (item, maxLength = 100) => extractExcerpt(item.content || item.description || '', maxLength),
    
    // 新闻特有功能
    categorizeNewsItem: (item) => newsFormatterManager.categorizeNewsItem(item),
    getNewsSource: (item) => newsFormatterManager.getNewsSource(item),
    isSearchMatch: (item, query) => newsSearchManager.isNewsMatch(item, query),
    
    // URL处理 - 使用共享函数
    updateUrlParams: (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        updateUrlParams({ date: dateStr });
    },
    
    // 工具函数 - 使用共享函数
    debounce,
    throttle,
    getUrlParam,
    
    // 新闻特有的便捷方法
    formatNewsItem: (item, options = {}) => newsFormatterManager.formatNewsItem(item, options),
    formatNewsItems: (items, options = {}) => newsFormatterManager.formatNewsItems(items, options),
    searchNews: (items, query, options = {}) => newsSearchManager.searchNews(items, query, options),
    advancedSearch: (items, criteria) => newsSearchManager.advancedSearch(items, criteria),
    getSearchSuggestions: (items, query, limit = 5) => newsSearchManager.getSearchSuggestions(items, query, limit),
    getSearchStats: (items, query) => newsSearchManager.getSearchStats(items, query),
    
    // 缓存管理 - 新闻特有
    setCacheItem: (key, value) => newsStorageManager.setCacheItem(key, value),
    getCacheItem: (key, defaultValue = null) => newsStorageManager.getCacheItem(key, defaultValue),
    cleanExpiredCache: () => newsStorageManager.cleanExpiredCache(),
    
    // 数据处理 - 新闻特有
    getCategoryTags: (item) => newsFormatterManager.getCategoryTags(item),
    paginate: (items, page = 1, pageSize = 20) => newsSearchManager.paginate(items, page, pageSize),
    deduplicateNews: (items) => newsSearchManager.deduplicateNews(items),
    validateNewsItem: (item) => newsFormatterManager.validateNewsItem(item),
    sanitizeNewsItem: (item) => newsFormatterManager.sanitizeNewsItem(item)
};

// 导出管理器实例和类
export { newsStorageManager, newsFormatterManager, newsSearchManager };
export { NewsStorageManager, NewsFormatterManager, NewsSearchManager };

// 默认导出
export default utils;

// 全局挂载（兼容性）
if (typeof window !== 'undefined') {
    window.NewsUtils = utils;
} 