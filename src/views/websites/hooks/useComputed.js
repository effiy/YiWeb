/**
 * 网站标签管理页面计算属性
 * author: liangliang
 */

// 兼容Vue2和Vue3的computed获取方式
const vueComputed = typeof Vue !== 'undefined' && Vue.computed ? Vue.computed : (fn) => fn;

/**
 * 计算属性工厂函数
 * 处理网站数据过滤、搜索、统计等计算逻辑
 * @param {Object} store - 数据存储对象
 * @returns {Object} computed对象，包含各种计算属性
 */
export const useComputed = (store) => {
    /**
     * 过滤后的网站列表
     * 根据搜索关键词和分类进行过滤
     */
    const filteredSites = vueComputed(() => {
        let sites = store.sites.value;
        
        // 按分类过滤
        if (store.currentCategory.value && store.currentCategory.value !== 'all') {
            sites = sites.filter(site => site.category === store.currentCategory.value);
        }
        
        // 按搜索关键词过滤
        if (store.searchKeyword.value) {
            const keyword = store.searchKeyword.value.toLowerCase();
            sites = sites.filter(site => {
                return (
                    site.name.toLowerCase().includes(keyword) ||
                    site.url.toLowerCase().includes(keyword) ||
                    (site.description && site.description.toLowerCase().includes(keyword)) ||
                    (site.tags && site.tags.some(tag => tag.toLowerCase().includes(keyword)))
                );
            });
        }
        
        return sites;
    });

    /**
     * 是否有搜索关键词
     */
    const hasSearchKeyword = vueComputed(() => {
        return store.searchKeyword.value.trim().length > 0;
    });

    /**
     * 网站总数
     */
    const totalSites = vueComputed(() => {
        return store.sites.value.length;
    });

    /**
     * 标签总数
     */
    const totalTags = vueComputed(() => {
        return store.tags.value.length;
    });

    /**
     * 所有标签列表（用于标签管理）
     */
    const allTags = vueComputed(() => {
        return store.tags.value;
    });



    /**
     * 网站统计信息
     */
    const siteStats = vueComputed(() => {
        const stats = {
            total: store.sites.value.length,
            byCategory: {},
            byTag: {},
            recent: []
        };

        // 按分类统计
        store.sites.value.forEach(site => {
            const category = site.category || '未分类';
            stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
        });

        // 按标签统计
        store.sites.value.forEach(site => {
            if (Array.isArray(site.tags)) {
                site.tags.forEach(tag => {
                    stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
                });
            }
        });

        // 最近添加的网站
        stats.recent = store.sites.value
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        return stats;
    });

    /**
     * 热门标签（使用次数最多的标签）
     */
    const popularTags = vueComputed(() => {
        const tagCounts = {};
        store.sites.value.forEach(site => {
            if (Array.isArray(site.tags)) {
                site.tags.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            }
        });

        return Object.entries(tagCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([tag, count]) => ({ tag, count }));
    });

    /**
     * 搜索建议（基于现有数据）
     */
    const searchSuggestions = vueComputed(() => {
        const suggestions = new Set();
        
        store.sites.value.forEach(site => {
            // 网站名称
            suggestions.add(site.name);
            
            // 网站URL域名
            try {
                const url = new URL(site.url);
                suggestions.add(url.hostname);
            } catch (e) {
                // 忽略无效URL
            }
            
            // 标签
            if (Array.isArray(site.tags)) {
                site.tags.forEach(tag => suggestions.add(tag));
            }
            
            // 分类
            if (site.category) {
                suggestions.add(site.category);
            }
        });
        
        return Array.from(suggestions).sort();
    });





    /**
     * 空状态显示条件
     */
    const showEmptyState = vueComputed(() => {
        return !store.loading.value && 
               !store.error.value && 
               filteredSites.value.length === 0;
    });

    /**
     * 搜索结果统计
     */
    const searchResultsInfo = vueComputed(() => {
        if (!hasSearchKeyword.value) {
            return null;
        }
        
        return {
            keyword: store.searchKeyword.value,
            total: filteredSites.value.length,
            original: store.sites.value.length
        };
    });

    return {
        filteredSites,           // 过滤后的网站列表
        hasSearchKeyword,        // 是否有搜索关键词
        totalSites,             // 网站总数
        totalTags,              // 标签总数
        allTags,                // 所有标签列表
        siteStats,              // 网站统计信息
        popularTags,            // 热门标签
        searchSuggestions,      // 搜索建议
        showEmptyState,         // 空状态显示条件
        searchResultsInfo       // 搜索结果统计
    };
}; 