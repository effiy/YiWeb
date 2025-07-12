/**
 * 新闻搜索工具函数
 
 * 
 * 从news/utils/index.js中提取的搜索相关功能
 */

import { isSearchMatch } from '../../shared/utils/common.js';
import { getConfig } from '../../shared/config/index.js';
import newsFormatterManager from './formatter.js';

/**
 * 新闻搜索管理器
 */
export class NewsSearchManager {
    constructor() {
        this.categories = getConfig('news.CATEGORIES', []);
        this.minSearchLength = getConfig('search.MIN_SEARCH_LENGTH', 2);
        this.maxSearchResults = getConfig('search.MAX_SEARCH_RESULTS', 100);
        this.searchResultsPerPage = getConfig('search.SEARCH_RESULTS_PER_PAGE', 20);
    }

    /**
     * 搜索新闻项
     * @param {Array} items - 新闻项数组
     * @param {string} query - 搜索查询
     * @param {Object} options - 搜索选项
     * @returns {Array} 搜索结果数组
     */
    searchNews(items, query, options = {}) {
        if (!query || query.length < this.minSearchLength) {
            return items;
        }

        const {
            caseSensitive = false,
            searchFields = ['title', 'content', 'excerpt', 'author', 'source'],
            includeCategories = true,
            maxResults = this.maxSearchResults
        } = options;

        const results = items.filter(item => {
            return this.isNewsMatch(item, query, { 
                caseSensitive, 
                searchFields, 
                includeCategories 
            });
        });

        // 限制结果数量
        return results.slice(0, maxResults);
    }

    /**
     * 检查新闻项是否匹配搜索条件
     * @param {Object} item - 新闻项
     * @param {string} query - 搜索查询
     * @param {Object} options - 搜索选项
     * @returns {boolean} 是否匹配
     */
    isNewsMatch(item, query, options = {}) {
        const {
            caseSensitive = false,
            searchFields = ['title', 'content', 'excerpt', 'author', 'source'],
            includeCategories = true
        } = options;

        if (!query) return true;

        // 构建搜索文本
        let searchTextParts = [];

        // 添加基本字段
        searchFields.forEach(field => {
            if (item[field]) {
                searchTextParts.push(item[field]);
            }
        });

        // 添加摘要（如果没有在searchFields中）
        if (!searchFields.includes('excerpt')) {
            const excerpt = newsFormatterManager.extractExcerpt(item);
            if (excerpt) {
                searchTextParts.push(excerpt);
            }
        }

        // 添加分类标签
        if (includeCategories) {
            if (item.categories) {
                if (Array.isArray(item.categories)) {
                    searchTextParts = searchTextParts.concat(item.categories);
                } else if (typeof item.categories === 'string') {
                    searchTextParts.push(item.categories);
                }
            }

            // 添加自动分类标签
            const categoryKey = newsFormatterManager.categorizeNewsItem(item);
            const category = this.categories.find(cat => cat.key === categoryKey);
            if (category) {
                searchTextParts.push(category.title);
            }
        }

        // 添加标签
        if (item.tags && Array.isArray(item.tags)) {
            searchTextParts = searchTextParts.concat(item.tags);
        }

        const searchText = searchTextParts.join(' ');
        return isSearchMatch(searchText, query, caseSensitive);
    }

    /**
     * 高级搜索
     * @param {Array} items - 新闻项数组
     * @param {Object} searchCriteria - 搜索条件
     * @returns {Array} 搜索结果数组
     */
    advancedSearch(items, searchCriteria) {
        const {
            query = '',
            category = '',
            source = '',
            author = '',
            dateRange = null,
            tags = [],
            minLength = 0,
            maxLength = Infinity,
            sortBy = 'date',
            sortOrder = 'desc',
            limit = this.maxSearchResults
        } = searchCriteria;

        let results = items;

        // 文本搜索
        if (query) {
            results = this.searchNews(results, query);
        }

        // 分类筛选
        if (category) {
            results = this.filterByCategory(results, category);
        }

        // 来源筛选
        if (source) {
            results = this.filterBySource(results, source);
        }

        // 作者筛选
        if (author) {
            results = this.filterByAuthor(results, author);
        }

        // 日期范围筛选
        if (dateRange) {
            results = this.filterByDateRange(results, dateRange);
        }

        // 标签筛选
        if (tags.length > 0) {
            results = this.filterByTags(results, tags);
        }

        // 长度筛选
        if (minLength > 0 || maxLength < Infinity) {
            results = this.filterByLength(results, minLength, maxLength);
        }

        // 排序
        results = this.sortResults(results, sortBy, sortOrder);

        // 限制结果数量
        return results.slice(0, limit);
    }

    /**
     * 按分类筛选新闻
     * @param {Array} items - 新闻项数组
     * @param {string} category - 分类键
     * @returns {Array} 筛选后的新闻数组
     */
    filterByCategory(items, category) {
        return items.filter(item => {
            const itemCategory = newsFormatterManager.categorizeNewsItem(item);
            return itemCategory === category;
        });
    }

    /**
     * 按来源筛选新闻
     * @param {Array} items - 新闻项数组
     * @param {string} source - 来源名称
     * @returns {Array} 筛选后的新闻数组
     */
    filterBySource(items, source) {
        return items.filter(item => {
            const itemSource = newsFormatterManager.getNewsSource(item);
            return itemSource.toLowerCase().includes(source.toLowerCase());
        });
    }

    /**
     * 按作者筛选新闻
     * @param {Array} items - 新闻项数组
     * @param {string} author - 作者名称
     * @returns {Array} 筛选后的新闻数组
     */
    filterByAuthor(items, author) {
        return items.filter(item => {
            const itemAuthor = item.author || '';
            return itemAuthor.toLowerCase().includes(author.toLowerCase());
        });
    }

    /**
     * 按日期范围筛选新闻
     * @param {Array} items - 新闻项数组
     * @param {Object} dateRange - 日期范围 {start, end}
     * @returns {Array} 筛选后的新闻数组
     */
    filterByDateRange(items, dateRange) {
        const { start, end } = dateRange;
        const startDate = start ? new Date(start) : null;
        const endDate = end ? new Date(end) : null;

        return items.filter(item => {
            const itemDate = new Date(item.pubDate || item.date);
            if (isNaN(itemDate.getTime())) return false;

            if (startDate && itemDate < startDate) return false;
            if (endDate && itemDate > endDate) return false;

            return true;
        });
    }

    /**
     * 按标签筛选新闻
     * @param {Array} items - 新闻项数组
     * @param {Array} tags - 标签数组
     * @returns {Array} 筛选后的新闻数组
     */
    filterByTags(items, tags) {
        return items.filter(item => {
            const itemTags = item.tags || [];
            return tags.some(tag => itemTags.includes(tag));
        });
    }

    /**
     * 按内容长度筛选新闻
     * @param {Array} items - 新闻项数组
     * @param {number} minLength - 最小长度
     * @param {number} maxLength - 最大长度
     * @returns {Array} 筛选后的新闻数组
     */
    filterByLength(items, minLength, maxLength) {
        return items.filter(item => {
            const content = item.content || item.description || '';
            const length = content.length;
            return length >= minLength && length <= maxLength;
        });
    }

    /**
     * 对搜索结果进行排序
     * @param {Array} items - 新闻项数组
     * @param {string} sortBy - 排序字段
     * @param {string} sortOrder - 排序顺序 'asc' | 'desc'
     * @returns {Array} 排序后的新闻数组
     */
    sortResults(items, sortBy = 'date', sortOrder = 'desc') {
        const sortedItems = [...items];

        sortedItems.sort((a, b) => {
            let valueA, valueB;

            switch (sortBy) {
                case 'date':
                    valueA = new Date(a.pubDate || a.date);
                    valueB = new Date(b.pubDate || b.date);
                    break;
                case 'title':
                    valueA = (a.title || '').toLowerCase();
                    valueB = (b.title || '').toLowerCase();
                    break;
                case 'author':
                    valueA = (a.author || '').toLowerCase();
                    valueB = (b.author || '').toLowerCase();
                    break;
                case 'source':
                    valueA = newsFormatterManager.getNewsSource(a).toLowerCase();
                    valueB = newsFormatterManager.getNewsSource(b).toLowerCase();
                    break;
                case 'relevance':
                    // 简单的相关性排序（可以根据需要改进）
                    valueA = a.relevanceScore || 0;
                    valueB = b.relevanceScore || 0;
                    break;
                default:
                    valueA = a[sortBy] || '';
                    valueB = b[sortBy] || '';
            }

            if (valueA < valueB) {
                return sortOrder === 'asc' ? -1 : 1;
            }
            if (valueA > valueB) {
                return sortOrder === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return sortedItems;
    }

    /**
     * 获取搜索建议
     * @param {Array} items - 新闻项数组
     * @param {string} query - 搜索查询
     * @param {number} limit - 建议数量限制
     * @returns {Array} 搜索建议数组
     */
    getSearchSuggestions(items, query, limit = 5) {
        if (!query || query.length < 2) {
            return [];
        }

        const suggestions = new Set();
        const queryLower = query.toLowerCase();

        // 从标题中提取建议
        items.forEach(item => {
            const title = item.title || '';
            const words = title.split(/\s+/);
            
            words.forEach(word => {
                const cleanWord = word.toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, '');
                if (cleanWord.length > 2 && cleanWord.includes(queryLower)) {
                    suggestions.add(cleanWord);
                }
            });
        });

        // 从分类标签中提取建议
        this.categories.forEach(category => {
            if (category.title.toLowerCase().includes(queryLower)) {
                suggestions.add(category.title);
            }
        });

        return Array.from(suggestions).slice(0, limit);
    }

    /**
     * 高亮搜索结果
     * @param {Array} items - 新闻项数组
     * @param {string} query - 搜索查询
     * @returns {Array} 高亮后的新闻数组
     */
    highlightResults(items, query) {
        if (!query) return items;

        return items.map(item => {
            return newsFormatterManager.formatNewsItem(item, {
                highlightQuery: query,
                includeExcerpt: true,
                includeCategories: true,
                includeSource: true
            });
        });
    }

    /**
     * 获取搜索统计信息
     * @param {Array} items - 新闻项数组
     * @param {string} query - 搜索查询
     * @returns {Object} 统计信息
     */
    getSearchStats(items, query) {
        const total = items.length;
        const results = query ? this.searchNews(items, query) : items;
        const matched = results.length;

        // 按分类统计
        const categoryStats = {};
        this.categories.forEach(category => {
            const categoryItems = this.filterByCategory(results, category.key);
            categoryStats[category.key] = {
                title: category.title,
                count: categoryItems.length
            };
        });

        // 按来源统计
        const sourceStats = {};
        results.forEach(item => {
            const source = newsFormatterManager.getNewsSource(item);
            sourceStats[source] = (sourceStats[source] || 0) + 1;
        });

        return {
            total,
            matched,
            matchRate: total > 0 ? (matched / total * 100).toFixed(1) : 0,
            categoryStats,
            sourceStats,
            query
        };
    }

    /**
     * 搜索历史管理
     * @param {string} query - 搜索查询
     * @param {number} resultCount - 结果数量
     */
    addSearchHistory(query, resultCount = 0) {
        if (!query || query.length < this.minSearchLength) {
            return;
        }

        const historyItem = {
            query,
            resultCount,
            timestamp: Date.now()
        };

        // 这里可以调用存储管理器来保存搜索历史
        // newsStorageManager.addSearchHistoryItem(query);
    }

    /**
     * 去重新闻项
     * @param {Array} items - 新闻项数组
     * @returns {Array} 去重后的新闻数组
     */
    deduplicateNews(items) {
        const seen = new Set();
        const unique = [];

        items.forEach(item => {
            const key = `${item.title}_${item.link || item.url}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(item);
            }
        });

        return unique;
    }

    /**
     * 分页处理
     * @param {Array} items - 新闻项数组
     * @param {number} page - 页码（从1开始）
     * @param {number} pageSize - 每页大小
     * @returns {Object} 分页结果
     */
    paginate(items, page = 1, pageSize = this.searchResultsPerPage) {
        const total = items.length;
        const totalPages = Math.ceil(total / pageSize);
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const data = items.slice(startIndex, endIndex);

        return {
            data,
            pagination: {
                current: page,
                total: totalPages,
                pageSize,
                totalItems: total,
                hasNext: page < totalPages,
                hasPrev: page > 1,
                startIndex: startIndex + 1,
                endIndex: Math.min(endIndex, total)
            }
        };
    }
}

// 创建默认实例
const newsSearchManager = new NewsSearchManager();

// 导出实例（类已在声明时导出）
export default newsSearchManager; 