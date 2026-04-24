import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';
import { categorizeNewsItem, extractDomain, getDomainCategory, getDomainDisplayName } from '/cdn/utils/data/domain.js';
import { getTimeAgo } from '/cdn/utils/time/date.js';

registerGlobalComponent({
    name: 'NewsList',
    html: '/cdn/components/business/NewsList/template.html',
    css: '/cdn/components/business/NewsList/index.css',
    props: {
        loading: {
            type: Boolean,
            default: false
        },
        error: {
            type: String,
            default: ''
        },
        currentDateDisplay: {
            type: String,
            default: ''
        },
        searchQuery: {
            type: String,
            default: ''
        },
        searchResults: {
            type: Array,
            default: () => []
        },
        displayCategories: {
            type: Object,
            default: () => ({})
        },
        selectedCategories: {
            type: Object,
            default: () => new Set()
        },
        clickedItems: {
            type: Object,
            default: () => new Set()
        },
        readItems: {
            type: Object,
            default: () => new Set()
        },
        favoriteItems: {
            type: Object,
            default: () => new Set()
        },
        hasNewsData: {
            type: Boolean,
            default: false
        }
    },
    emits: ['load-news-data', 'news-click', 'toggle-favorite'],
    setup(props, { emit }) {
        const Vue = window.Vue;
        if (!Vue) {
            console.error('[NewsList] Vue not available on window');
            return {};
        }

        // Try to inject viewContext for backward compatibility
        let viewContext = {};
        try {
            if (Vue.inject) {
                viewContext = Vue.inject('viewContext', {}) || {};
            }
        } catch (e) {
            console.warn('[NewsList] viewContext injection failed, using props only');
        }

        // Helper to get item key
        const getItemKey = (item) => {
            if (!item) return '';
            return item.link || item.title || '';
        };

        // Check if item is highlighted (just clicked)
        const isHighlighted = (item) => {
            const key = getItemKey(item);
            return props.clickedItems && props.clickedItems.has ? props.clickedItems.has(key) : false;
        };

        // Check if item is read
        const isRead = (item) => {
            const key = getItemKey(item);
            return props.readItems && props.readItems.has ? props.readItems.has(key) : false;
        };

        // Check if item is favorited
        const isFavorited = (item) => {
            const key = getItemKey(item);
            return props.favoriteItems && props.favoriteItems.has ? props.favoriteItems.has(key) : false;
        };

        // Get domain category for item
        const getDomainCategoryForItem = (item) => {
            if (!item) return null;
            try {
                return categorizeNewsItem(item);
            } catch (e) {
                console.warn('[NewsList] categorizeNewsItem failed:', e);
                return null;
            }
        };

        // Get domain display name for item
        const getDomainDisplayNameForItem = (item) => {
            if (!item) return '未知来源';
            try {
                if (item.link) {
                    const domain = extractDomain(item.link);
                    return getDomainDisplayName(domain);
                }
            } catch (e) {
                console.warn('[NewsList] getDomainDisplayName failed:', e);
            }
            return item.creator || '未知来源';
        };

        // Get time ago for date
        const getTimeAgoForDate = (dateStr) => {
            if (!dateStr) return '';
            try {
                return getTimeAgo(dateStr);
            } catch (e) {
                console.warn('[NewsList] getTimeAgo failed:', e);
                return '';
            }
        };

        // Check if category should be shown
        const shouldShowCategory = (categoryKey) => {
            if (!props.selectedCategories || !props.selectedCategories.size) {
                return true;
            }
            return props.selectedCategories.has ? props.selectedCategories.has(categoryKey) : false;
        };

        // Get news statistics
        const getNewsStats = () => {
            let total = 0;
            let read = 0;
            let fav = 0;

            // Calculate from search results or display categories
            if (props.searchResults && props.searchResults.length) {
                total = props.searchResults.length;
                props.searchResults.forEach(item => {
                    const key = getItemKey(item);
                    if (props.readItems && props.readItems.has && props.readItems.has(key)) read++;
                    if (props.favoriteItems && props.favoriteItems.has && props.favoriteItems.has(key)) fav++;
                });
            } else if (props.displayCategories) {
                Object.values(props.displayCategories).forEach(cat => {
                    if (cat.news && Array.isArray(cat.news)) {
                        total += cat.news.length;
                        cat.news.forEach(item => {
                            const key = getItemKey(item);
                            if (props.readItems && props.readItems.has && props.readItems.has(key)) read++;
                            if (props.favoriteItems && props.favoriteItems.has && props.favoriteItems.has(key)) fav++;
                        });
                    }
                });
            }

            return {
                total,
                read,
                fav,
                hasData: total > 0
            };
        };

        // Handle news click
        const handleNewsClick = (item) => {
            emit('news-click', item);
        };

        // Export data (placeholder - can be implemented fully if needed)
        const exportData = () => {
            console.log('[NewsList] exportData called');
            // Implementation would go here
        };

        return {
            // Methods used in template
            isHighlighted,
            isRead,
            isFavorited,
            getDomainCategory: getDomainCategoryForItem,
            getDomainDisplayName: getDomainDisplayNameForItem,
            getTimeAgo: getTimeAgoForDate,
            shouldShowCategory,
            getNewsStats,
            handleNewsClick,
            exportData
        };
    }
});
