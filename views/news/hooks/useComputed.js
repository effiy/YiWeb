/**
 * 计算属性组合式函数
 * 提供基于新闻数据的常用计算属性
 * author: liangliang
 * 
 * @param {Object} store - 状态存储对象（包含newsData, searchQuery, currentDate等）
 * @returns {Object} 计算属性集合
 */
import { getCategoriesConfig, categorizeNewsItem } from './store.js';
import { 
    getRelativeDateText, 
    isToday, 
    isFutureDate, 
    getTimeAgo, 
    generateCalendarDays 
} from '/utils/date.js';
import { extractDomainCategory } from '/utils/domain.js';

export const useComputed = (store) => {
    const { computed } = Vue;
    const { 
        newsData, 
        searchQuery, 
        selectedCategories, 
        selectedTags, 
        currentDate, 
        calendarMonth, 
        today,
        tagStatistics
    } = store;

    // 先定义 categorizedNews 计算属性
    const categorizedNews = computed(() => {
        const result = {};
        const categoriesConfig = getCategoriesConfig();
        
        categoriesConfig.forEach(category => {
            result[category.key] = {
                icon: category.icon,
                title: category.title,
                news: []
            };
        });

        // 直接使用 newsData 而不是 filteredNewsData 来避免循环依赖
        const dataToProcess = newsData.value || [];
        
        console.log('[categorizedNews] 处理新闻数据:', dataToProcess.length, '条');
        
        dataToProcess.forEach(item => {
            const categoryKey = categorizeNewsItem(item);
            
            if (!result[categoryKey]) {
                console.warn(`未知的分类键: ${categoryKey}，使用'other'分类`);
                if (!result['other']) {
                    result['other'] = {
                        icon: 'fas fa-ellipsis-h',
                        title: '其他',
                        news: []
                    };
                }
                result['other'].news.push(item);
            } else {
                result[categoryKey].news.push(item);
            }
        });

        console.log('[categorizedNews] 分类结果:', result);
        return result;
    });

    return {
        /**
         * 是否有新闻数据
         */
        hasNewsData: computed(() => {
            return newsData.value && newsData.value.length > 0;
        }),

        /**
         * 顶部分类（仅用于头部筛选按钮）
         */
        categories: computed(() => {
            return [
                { key: 'all', icon: 'fas fa-layer-group', title: '全部' },
                { key: 'news', icon: 'fas fa-newspaper', title: '新闻' },
                { key: 'comments', icon: 'fas fa-comments', title: '评论' }
            ];
        }),

        /**
         * 当前日期显示文本
         */
        currentDateDisplay: computed(() => {
            return getRelativeDateText(currentDate.value, today.value);
        }),

        /**
         * 当前日期副标题
         */
        currentDateSubtitle: computed(() => {
            const date = currentDate.value;
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }),

        /**
         * 是否为今天
         */
        isToday: computed(() => {
            return isToday(currentDate.value, today.value);
        }),

        /**
         * 是否为未来日期
         */
        isFutureDate: computed(() => {
            return isFutureDate(currentDate.value, today.value);
        }),

        /**
         * 日历标题
         */
        calendarTitle: computed(() => {
            const year = calendarMonth.value.getFullYear();
            const month = calendarMonth.value.getMonth() + 1;
            return `${year}年${month}月`;
        }),

        /**
         * 是否为当前月份
         */
        isCurrentMonth: computed(() => {
            const currentYear = today.value.getFullYear();
            const currentMonth = today.value.getMonth();
            const calendarYear = calendarMonth.value.getFullYear();
            const calendarMonthNum = calendarMonth.value.getMonth();
            return currentYear === calendarYear && currentMonth === calendarMonthNum;
        }),

        /**
         * 日历天数数组
         */
        calendarDays: computed(() => {
            const hasNewsData = (date) => {
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                const todayStr = `${today.value.getFullYear()}-${String(today.value.getMonth() + 1).padStart(2, '0')}-${String(today.value.getDate()).padStart(2, '0')}`;
                
                if (dateStr > todayStr) {
                    return false;
                }
                
                const ninetyDaysAgo = new Date(today.value);
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                
                if (date < ninetyDaysAgo) {
                    return false;
                }
                
                if (window.NewsCacheManager) {
                    const cachedNews = window.NewsCacheManager.getCache(dateStr);
                    if (cachedNews && cachedNews.length > 0) {
                        return true;
                    }
                }
                
                const thirtyDaysAgo = new Date(today.value);
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return date >= thirtyDaysAgo;
            };
            
            const days = generateCalendarDays(calendarMonth.value, hasNewsData);
            
            // 为每个日期添加必要的属性
            return days.map(day => {
                const dateStr = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
                const todayStr = `${today.value.getFullYear()}-${String(today.value.getMonth() + 1).padStart(2, '0')}-${String(today.value.getDate()).padStart(2, '0')}`;
                const currentDateStr = `${currentDate.value.getFullYear()}-${String(currentDate.value.getMonth() + 1).padStart(2, '0')}-${String(currentDate.value.getDate()).padStart(2, '0')}`;
                
                return {
                    ...day,
                    key: dateStr,
                    dayNumber: day.date.getDate(),
                    isToday: dateStr === todayStr,
                    isSelected: dateStr === currentDateStr,
                    hasNews: day.hasData,
                    isClickable: dateStr <= todayStr,
                    tooltip: day.isCurrentMonth ? 
                        (day.hasData ? `${dateStr} (有新闻)` : `${dateStr} (无新闻)`) :
                        `${dateStr} (其他月份)`,
                    ariaLabel: day.isCurrentMonth ? 
                        (day.hasData ? `${dateStr} 有新闻` : `${dateStr} 无新闻`) :
                        `${dateStr} 其他月份`
                };
            });
        }),

        /**
         * 选中的日期
         */
        selectedDate: computed(() => {
            return currentDate.value;
        }),

        /**
         * 过滤后的新闻数据
         */
        filteredNewsData: computed(() => {
            let data = newsData.value || [];
            
            // 搜索过滤
            if (searchQuery.value) {
                const query = searchQuery.value.toLowerCase();
                data = data.filter(item => 
                    item.title.toLowerCase().includes(query) || 
                    (item.content && item.content.toLowerCase().includes(query))
                );
            }
            
            // 分类过滤
            if (selectedCategories.value.size > 0) {
                data = data.filter(item => {
                    const categoryKey = categorizeNewsItem(item);
                    return selectedCategories.value.has(categoryKey);
                });
            }
            
            // 标签过滤
            if (selectedTags.value.size > 0) {
                data = data.filter(item => {
                    if (!item.categories) return false;
                    const itemTags = Array.isArray(item.categories) ? item.categories : [item.categories];
                    return itemTags.some(tag => selectedTags.value.has(tag));
                });
            }
            
            return data;
        }),

        /**
         * 显示的分类
         */
        displayCategories: computed(() => {
            const categories = categorizedNews.value;
            const result = {};
            
            Object.keys(categories).forEach(key => {
                const category = categories[key];
                if (category.news.length > 0) {
                    result[key] = category;
                }
            });
            
            return result;
        }),

        /**
         * 搜索建议
         */
        searchSuggestions: computed(() => {
            if (!searchQuery.value) return [];
            
            const suggestions = new Set();
            const query = searchQuery.value.toLowerCase();
            
            newsData.value.forEach(item => {
                if (item.title.toLowerCase().includes(query)) {
                    suggestions.add(item.title);
                }
                if (item.categories) {
                    const categories = Array.isArray(item.categories) ? item.categories : [item.categories];
                    categories.forEach(cat => {
                        if (cat.toLowerCase().includes(query)) {
                            suggestions.add(cat);
                        }
                    });
                }
            });
            
            return Array.from(suggestions).slice(0, 5);
        }),

        /**
         * 标签统计
         */
        tagStatistics: computed(() => {
            const stats = {};
            
            newsData.value.forEach(item => {
                if (item.categories) {
                    const categories = Array.isArray(item.categories) ? item.categories : [item.categories];
                    categories.forEach(cat => {
                        stats[cat] = (stats[cat] || 0) + 1;
                    });
                }
            });
            
            return stats;
        }),

        /**
         * 热门标签
         */
        popularTags: computed(() => {
            const stats = tagStatistics.value;
            return Object.entries(stats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([tag, count]) => ({ tag, count }));
        }),

        /**
         * 新闻统计
         */
        newsStats: computed(() => {
            const total = newsData.value.length;
            const categorized = categorizedNews.value;
            const stats = {
                total,
                categorized: Object.keys(categorized).length,
                byCategory: {}
            };
            
            Object.keys(categorized).forEach(key => {
                stats.byCategory[key] = categorized[key].news.length;
            });
            
            return stats;
        }),

        /**
         * 时间统计
         */
        timeStats: computed(() => {
            const now = new Date();
            const stats = {
                today: 0,
                thisWeek: 0,
                thisMonth: 0,
                older: 0
            };
            
            newsData.value.forEach(item => {
                if (!item.pubDate) return;
                
                const pubDate = new Date(item.pubDate);
                const diffDays = Math.floor((now - pubDate) / (1000 * 60 * 60 * 24));
                
                if (diffDays === 0) {
                    stats.today++;
                } else if (diffDays <= 7) {
                    stats.thisWeek++;
                } else if (diffDays <= 30) {
                    stats.thisMonth++;
                } else {
                    stats.older++;
                }
            });
            
            return stats;
        }),

        /**
         * 域名统计
         */
        domainStats: computed(() => {
            const stats = {};
            
            newsData.value.forEach(item => {
                if (item.link) {
                    const domainCategory = extractDomainCategory(item);
                    const key = domainCategory.key;
                    if (!stats[key]) {
                        stats[key] = {
                            count: 0,
                            title: domainCategory.title,
                            icon: domainCategory.icon,
                            color: domainCategory.color,
                            domains: new Set()
                        };
                    }
                    stats[key].count++;
                    
                    // 记录具体的域名
                    const domain = item.link.match(/https?:\/\/([^\/]+)/);
                    if (domain) {
                        stats[key].domains.add(domain[1]);
                    }
                }
            });
            
            // 转换Set为Array
            Object.keys(stats).forEach(key => {
                stats[key].domains = Array.from(stats[key].domains);
            });
            
            return stats;
        }),

        /**
         * 热门域名
         */
        popularDomains: computed(() => {
            const stats = domainStats.value;
            return Object.entries(stats)
                .sort(([,a], [,b]) => b.count - a.count)
                .slice(0, 10)
                .map(([key, data]) => ({
                    key,
                    title: data.title,
                    count: data.count,
                    icon: data.icon,
                    color: data.color,
                    domains: data.domains
                }));
        })
    };
};


