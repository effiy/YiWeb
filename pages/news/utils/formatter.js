/**
 * 新闻格式化工具函数
 * 
 * 从news/utils/index.js中提取的格式化相关功能
 */

import { formatTime, extractExcerpt } from '../../../shared/utils/common.js';
import { getConfig } from '../../../config/index.js';

/**
 * 新闻格式化管理器
 */
export class NewsFormatterManager {
    constructor() {
        // 使用共享配置中的分类数据
        this.categories = getConfig('news.CATEGORIES', []);
        this.excerptLength = getConfig('news.EXCERPT_LENGTH', 150);
        this.titleMaxLength = getConfig('news.TITLE_MAX_LENGTH', 100);
        this.dateFormat = getConfig('news.DATE_FORMAT', 'YYYY-MM-DD');
        this.timeFormat = getConfig('news.TIME_FORMAT', 'HH:mm:ss');
        this.datetimeFormat = getConfig('news.DATETIME_FORMAT', 'YYYY-MM-DD HH:mm:ss');
    }

    /**
     * 格式化时间显示
     * @param {string|Date} dateInput - 时间输入
     * @param {string} format - 格式类型
     * @returns {string} 格式化后的时间
     */
    formatTimeAgo(dateInput, format = 'ago') {
        return formatTime(dateInput, format);
    }

    /**
     * 提取新闻摘要
     * @param {Object} item - 新闻项
     * @param {number} maxLength - 最大长度
     * @returns {string} 摘要文本
     */
    extractExcerpt(item, maxLength = this.excerptLength) {
        const content = item.content || item.description || '';
        return extractExcerpt(content, maxLength);
    }

    /**
     * 格式化新闻标题
     * @param {string} title - 原始标题
     * @param {number} maxLength - 最大长度
     * @returns {string} 格式化后的标题
     */
    formatTitle(title, maxLength = this.titleMaxLength) {
        if (!title) return '';
        
        // 移除多余的空白字符
        const cleanTitle = title.trim().replace(/\s+/g, ' ');
        
        if (cleanTitle.length <= maxLength) {
            return cleanTitle;
        }
        
        return cleanTitle.substring(0, maxLength) + '...';
    }

    /**
     * 分类新闻项
     * @param {Object} item - 新闻项
     * @returns {string} 分类键
     */
    categorizeNewsItem(item) {
        const title = item.title.toLowerCase();
        const content = (item.content || '').toLowerCase();
        
        // 首先检查 item.categories 中的标签
        if (item.categories) {
            let categoriesText = '';
            if (Array.isArray(item.categories)) {
                categoriesText = item.categories.join(' ').toLowerCase();
            } else if (typeof item.categories === 'string') {
                categoriesText = item.categories.toLowerCase();
            }
            
            // 根据 categories 标签进行分类
            for (const category of this.categories) {
                if (category.key === 'other') continue;
                
                const hasKeyword = category.keywords.some(keyword => 
                    categoriesText.includes(keyword)
                );
                
                if (hasKeyword) {
                    return category.key;
                }
            }
        }
        
        // 如果没有 categories 或 categories 中没有匹配的关键词，则基于标题和内容分类
        for (const category of this.categories) {
            if (category.key === 'other') continue;
            
            const hasKeyword = category.keywords.some(keyword => 
                title.includes(keyword) || content.includes(keyword)
            );
            
            if (hasKeyword) {
                return category.key;
            }
        }
        
        return 'other';
    }

    /**
     * 获取分类标签
     * @param {Object} item - 新闻项
     * @returns {Array} 分类标签数组
     */
    getCategoryTags(item) {
        // 优先显示 item.categories 中的标签
        if (item.categories && item.categories.length > 0) {
            if (Array.isArray(item.categories)) {
                return item.categories;
            }
            if (typeof item.categories === 'string') {
                return [item.categories];
            }
        }
        
        // 如果没有 categories，则使用自动分类
        const categoryKey = this.categorizeNewsItem(item);
        const category = this.categories.find(cat => cat.key === categoryKey);
        return category ? [category.title] : ['其他'];
    }

    /**
     * 获取新闻来源
     * @param {Object} item - 新闻项
     * @returns {string} 新闻来源
     */
    getNewsSource(item) {
        const source = item.source || '';
        const title = item.title.toLowerCase();
        
        // 定义常见的新闻源
        const sources = ['36氪', '虎嗅', '钛媒体', '爱范儿', '极客公园', 'TechCrunch', 'Hacker News'];
        
        for (const src of sources) {
            if (source.includes(src) || title.includes(src.toLowerCase())) {
                return src;
            }
        }
        
        return source || '未知来源';
    }

    /**
     * 格式化新闻URL
     * @param {string} url - 原始URL
     * @returns {string} 格式化后的URL
     */
    formatUrl(url) {
        if (!url) return '';
        
        try {
            const urlObj = new URL(url);
            return urlObj.href;
        } catch (error) {
            console.warn('无效的URL:', url);
            return url;
        }
    }

    /**
     * 格式化新闻作者
     * @param {string} author - 原始作者
     * @returns {string} 格式化后的作者
     */
    formatAuthor(author) {
        if (!author) return '未知作者';
        
        // 移除多余的空白字符
        const cleanAuthor = author.trim().replace(/\s+/g, ' ');
        
        // 限制长度
        if (cleanAuthor.length > 50) {
            return cleanAuthor.substring(0, 50) + '...';
        }
        
        return cleanAuthor;
    }

    /**
     * 格式化新闻日期
     * @param {string|Date} dateInput - 日期输入
     * @param {string} format - 格式类型
     * @returns {string} 格式化后的日期
     */
    formatDate(dateInput, format = 'date') {
        if (!dateInput) return '';
        
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) {
            return '';
        }
        
        switch (format) {
            case 'date':
                return date.toLocaleDateString('zh-CN');
            case 'time':
                return date.toLocaleTimeString('zh-CN');
            case 'datetime':
                return date.toLocaleString('zh-CN');
            case 'iso':
                return date.toISOString();
            default:
                return date.toLocaleDateString('zh-CN');
        }
    }

    /**
     * 格式化新闻摘要，支持高亮关键词
     * @param {Object} item - 新闻项
     * @param {string} query - 搜索关键词
     * @param {number} maxLength - 最大长度
     * @returns {string} 带高亮的摘要
     */
    formatExcerptWithHighlight(item, query, maxLength = this.excerptLength) {
        const excerpt = this.extractExcerpt(item, maxLength);
        
        if (!query) {
            return excerpt;
        }
        
        const regex = new RegExp(`(${this.escapeRegExp(query)})`, 'gi');
        return excerpt.replace(regex, '<mark>$1</mark>');
    }

    /**
     * 格式化新闻标题，支持高亮关键词
     * @param {string} title - 原始标题
     * @param {string} query - 搜索关键词
     * @param {number} maxLength - 最大长度
     * @returns {string} 带高亮的标题
     */
    formatTitleWithHighlight(title, query, maxLength = this.titleMaxLength) {
        const formattedTitle = this.formatTitle(title, maxLength);
        
        if (!query) {
            return formattedTitle;
        }
        
        const regex = new RegExp(`(${this.escapeRegExp(query)})`, 'gi');
        return formattedTitle.replace(regex, '<mark>$1</mark>');
    }

    /**
     * 转义正则表达式特殊字符
     * @param {string} string - 要转义的字符串
     * @returns {string} 转义后的字符串
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * 格式化新闻项的完整信息
     * @param {Object} item - 新闻项
     * @param {Object} options - 格式化选项
     * @returns {Object} 格式化后的新闻项
     */
    formatNewsItem(item, options = {}) {
        const {
            includeExcerpt = true,
            includeCategories = true,
            includeSource = true,
            highlightQuery = null,
            excerptLength = this.excerptLength,
            titleMaxLength = this.titleMaxLength
        } = options;

        const formatted = {
            ...item,
            title: highlightQuery 
                ? this.formatTitleWithHighlight(item.title, highlightQuery, titleMaxLength)
                : this.formatTitle(item.title, titleMaxLength),
            formattedTime: this.formatTimeAgo(item.pubDate || item.date),
            formattedDate: this.formatDate(item.pubDate || item.date),
            formattedAuthor: this.formatAuthor(item.author),
            formattedUrl: this.formatUrl(item.link || item.url)
        };

        if (includeExcerpt) {
            formatted.excerpt = highlightQuery
                ? this.formatExcerptWithHighlight(item, highlightQuery, excerptLength)
                : this.extractExcerpt(item, excerptLength);
        }

        if (includeCategories) {
            formatted.categoryTags = this.getCategoryTags(item);
            formatted.categoryKey = this.categorizeNewsItem(item);
        }

        if (includeSource) {
            formatted.newsSource = this.getNewsSource(item);
        }

        return formatted;
    }

    /**
     * 批量格式化新闻项
     * @param {Array} items - 新闻项数组
     * @param {Object} options - 格式化选项
     * @returns {Array} 格式化后的新闻项数组
     */
    formatNewsItems(items, options = {}) {
        if (!Array.isArray(items)) {
            return [];
        }

        return items.map(item => this.formatNewsItem(item, options));
    }

    /**
     * 生成新闻项的唯一ID
     * @param {Object} item - 新闻项
     * @returns {string} 唯一ID
     */
    generateNewsId(item) {
        const title = item.title || '';
        const link = item.link || item.url || '';
        const date = item.pubDate || item.date || '';
        
        // 使用标题、链接和日期生成简单的哈希
        const content = `${title}${link}${date}`;
        let hash = 0;
        
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        
        return Math.abs(hash).toString(36);
    }

    /**
     * 验证新闻项数据
     * @param {Object} item - 新闻项
     * @returns {boolean} 是否有效
     */
    validateNewsItem(item) {
        if (!item || typeof item !== 'object') {
            return false;
        }

        // 必须有标题
        if (!item.title || typeof item.title !== 'string') {
            return false;
        }

        // 必须有链接或内容
        if (!item.link && !item.url && !item.content) {
            return false;
        }

        return true;
    }

    /**
     * 清理新闻项数据
     * @param {Object} item - 新闻项
     * @returns {Object} 清理后的新闻项
     */
    sanitizeNewsItem(item) {
        if (!this.validateNewsItem(item)) {
            return null;
        }

        return {
            id: this.generateNewsId(item),
            title: this.formatTitle(item.title),
            content: item.content || '',
            excerpt: this.extractExcerpt(item),
            link: this.formatUrl(item.link || item.url),
            author: this.formatAuthor(item.author),
            source: this.getNewsSource(item),
            pubDate: item.pubDate || item.date,
            categories: item.categories || [],
            tags: item.tags || [],
            // 添加格式化的字段
            formattedTime: this.formatTimeAgo(item.pubDate || item.date),
            formattedDate: this.formatDate(item.pubDate || item.date),
            categoryTags: this.getCategoryTags(item),
            categoryKey: this.categorizeNewsItem(item)
        };
    }
}

// 创建默认实例
const newsFormatterManager = new NewsFormatterManager();

// 导出实例（类已在声明时导出）
export default newsFormatterManager; 
