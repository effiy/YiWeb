// 工具函数集合

import { CATEGORIES } from '../config/constants.js';

export const utils = {
    // 安全的localStorage存储
    safeSetItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.warn(`LocalStorage存储失败 (${key}):`, e.message);
            
            // 如果是配额超出，尝试清理一些数据
            if (e.name === 'QuotaExceededError') {
                console.warn('LocalStorage配额超出，尝试清理数据...');
                
                // 清理搜索历史（保留最近5条）
                if (key === 'newsSearchHistory') {
                    try {
                        const history = JSON.parse(value);
                        const reduced = history.slice(0, 5);
                        localStorage.setItem(key, JSON.stringify(reduced));
                        console.log('搜索历史已减少到5条');
                        return true;
                    } catch (retryError) {
                        console.error('减少搜索历史失败:', retryError);
                    }
                }
                
                // 清理新闻缓存
                if (window.NewsCacheManager) {
                    window.NewsCacheManager.cleanOldestCache(5);
                    try {
                        localStorage.setItem(key, value);
                        console.log('清理缓存后重新存储成功');
                        return true;
                    } catch (retryError) {
                        console.error('清理缓存后仍然存储失败:', retryError);
                    }
                }
            }
            
            return false;
        }
    },

    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 更新URL参数
    updateUrlParams(date) {
        const url = new URL(window.location);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        url.searchParams.set('date', dateStr);
        window.history.pushState({ date: dateStr }, '', url);
    },

    // 时间格式化
    formatTimeAgo(dateString) {
        const pubDate = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - pubDate) / 1000);

        if (diffInSeconds < 60) return '刚刚';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}天前`;
        return pubDate.toLocaleDateString('zh-CN');
    },

    // 提取摘要
    extractExcerpt(item, maxLength = 100) {
        const content = item.content || item.description || '';
        const text = content.replace(/<[^>]*>/g, '').trim();
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    },

    // 分类新闻项
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
            for (const category of CATEGORIES) {
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
        for (const category of CATEGORIES) {
            if (category.key === 'other') continue;
            
            const hasKeyword = category.keywords.some(keyword => 
                title.includes(keyword) || content.includes(keyword)
            );
            
            if (hasKeyword) {
                return category.key;
            }
        }
        
        return 'other';
    },

    // 获取新闻来源
    getNewsSource(item) {
        const source = item.source || '';
        const title = item.title.toLowerCase();
        
        const sources = ['36氪', '虎嗅', '钛媒体', '爱范儿', '极客公园'];
        
        for (const src of sources) {
            if (source.includes(src) || title.includes(src)) {
                return src;
            }
        }
        
        return source || '未知来源';
    },

    // 搜索匹配
    isSearchMatch(item, query) {
        if (!query) return true;
        
        // 构建搜索文本，包括 categories 中的所有标签
        let searchTextParts = [
            item.title,
            utils.extractExcerpt(item)
        ];
        
        // 添加 categories 标签
        if (item.categories) {
            if (Array.isArray(item.categories)) {
                searchTextParts = searchTextParts.concat(item.categories);
            } else if (typeof item.categories === 'string') {
                searchTextParts.push(item.categories);
            }
        }
        
        // 添加自动分类标签作为后备
        const categoryKey = utils.categorizeNewsItem(item);
        const category = CATEGORIES.find(cat => cat.key === categoryKey);
        const categoryTitle = category ? category.title : '其他';
        searchTextParts.push(categoryTitle);
        
        const searchText = searchTextParts.join(' ').toLowerCase();
        return searchText.includes(query.toLowerCase());
    }
}; 