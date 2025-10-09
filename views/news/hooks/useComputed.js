/**
 * 计算属性组合式函数
 * 提供基于新闻数据的常用计算属性
 * author: liangliang
 * 
 * @param {Object} store - 状态存储对象（包含newsData, searchQuery, currentDate等）
 * @returns {Object} 计算属性集合
 */
import { getCategoriesConfig, categorizeNewsItem, batchCategorizeNewsItems, getClassificationPerformanceReport } from './store.js';
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

    // 先定义 categorizedNews 计算属性 - 优化版本
    const categorizedNews = computed(() => {
        const result = {};
        const categoriesConfig = getCategoriesConfig();
        
        // 初始化所有分类
        categoriesConfig.forEach(category => {
            result[category.key] = {
                icon: category.icon,
                title: category.title,
                news: [],
                count: 0,
                confidence: 0,
                methods: new Set()
            };
        });

        // 直接使用 newsData 而不是 filteredNewsData 来避免循环依赖
        const dataToProcess = newsData.value || [];
        
        console.log('[categorizedNews] 处理新闻数据:', dataToProcess.length, '条');
        
        dataToProcess.forEach(item => {
            const categoryInfo = categorizeNewsItem(item);
            const categoryKey = categoryInfo.key;
            
            if (!result[categoryKey]) {
                console.warn(`未知的分类键: ${categoryKey}，使用'other'分类`);
                if (!result['other']) {
                    result['other'] = {
                        icon: 'fas fa-ellipsis-h',
                        title: '其他',
                        news: [],
                        count: 0,
                        confidence: 0,
                        methods: new Set()
                    };
                }
                result['other'].news.push(item);
                result['other'].count++;
                result['other'].confidence += categoryInfo.confidence || 0;
                result['other'].methods.add(categoryInfo.method || 'unknown');
            } else {
                result[categoryKey].news.push(item);
                result[categoryKey].count++;
                result[categoryKey].confidence += categoryInfo.confidence || 0;
                result[categoryKey].methods.add(categoryInfo.method || 'unknown');
            }
        });

        // 计算平均置信度
        Object.keys(result).forEach(key => {
            if (result[key].count > 0) {
                result[key].confidence = result[key].confidence / result[key].count;
                result[key].methods = Array.from(result[key].methods);
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
         * 过滤后的新闻数据 - 优化版本，减少重复计算
         */
        filteredNewsData: computed(() => {
            let data = newsData.value || [];
            
            // 如果没有过滤条件，直接返回原始数据
            if (!searchQuery.value && selectedCategories.value.size === 0 && selectedTags.value.size === 0) {
                return data;
            }
            
            // 搜索过滤
            if (searchQuery.value) {
                const query = searchQuery.value.toLowerCase();
                data = data.filter(item => 
                    item.title.toLowerCase().includes(query) || 
                    (item.content && item.content.toLowerCase().includes(query))
                );
            }
            
            // 分类过滤 - 使用缓存的分类结果
            if (selectedCategories.value.size > 0) {
                data = data.filter(item => {
                    const categoryInfo = categorizeNewsItem(item);
                    return selectedCategories.value.has(categoryInfo.key);
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
        }),

        /**
         * 分类质量分析
         */
        categoryQuality: computed(() => {
            const categorized = categorizedNews.value;
            const quality = {};
            
            Object.keys(categorized).forEach(key => {
                const category = categorized[key];
                if (category.count > 0) {
                    quality[key] = {
                        title: category.title,
                        count: category.count,
                        confidence: category.confidence,
                        methods: category.methods,
                        quality: category.confidence > 0.7 ? 'high' : category.confidence > 0.4 ? 'medium' : 'low'
                    };
                }
            });
            
            return quality;
        }),

        /**
         * 分类分布统计
         */
        categoryDistribution: computed(() => {
            const categorized = categorizedNews.value;
            const total = newsData.value.length;
            const distribution = [];
            
            Object.keys(categorized).forEach(key => {
                const category = categorized[key];
                if (category.count > 0) {
                    distribution.push({
                        key,
                        title: category.title,
                        count: category.count,
                        percentage: ((category.count / total) * 100).toFixed(1),
                        icon: category.icon,
                        color: category.color
                    });
                }
            });
            
            return distribution.sort((a, b) => b.count - a.count);
        }),

        /**
         * 内容质量分析
         */
        contentQuality: computed(() => {
            const data = newsData.value;
            const analysis = {
                total: data.length,
                withContent: 0,
                withExcerpt: 0,
                withImages: 0,
                withLinks: 0,
                averageLength: 0,
                qualityScore: 0
            };
            
            let totalLength = 0;
            let qualityFactors = 0;
            
            data.forEach(item => {
                if (item.content && item.content.length > 50) {
                    analysis.withContent++;
                    totalLength += item.content.length;
                    qualityFactors++;
                }
                
                if (item.excerpt) {
                    analysis.withExcerpt++;
                    qualityFactors++;
                }
                
                if (item.enclosure && item.enclosure.type && item.enclosure.type.startsWith('image/')) {
                    analysis.withImages++;
                    qualityFactors++;
                }
                
                if (item.link) {
                    analysis.withLinks++;
                    qualityFactors++;
                }
            });
            
            analysis.averageLength = analysis.withContent > 0 ? Math.round(totalLength / analysis.withContent) : 0;
            analysis.qualityScore = analysis.total > 0 ? Math.round((qualityFactors / (analysis.total * 4)) * 100) : 0;
            
            return analysis;
        }),

        /**
         * 时间分布分析
         */
        timeDistribution: computed(() => {
            const data = newsData.value;
            const distribution = {
                byHour: {},
                byDayOfWeek: {},
                byMonth: {},
                peakHours: [],
                peakDays: []
            };
            
            data.forEach(item => {
                if (!item.pubDate) return;
                
                const date = new Date(item.pubDate);
                const hour = date.getHours();
                const dayOfWeek = date.getDay();
                const month = date.getMonth();
                
                // 按小时统计
                distribution.byHour[hour] = (distribution.byHour[hour] || 0) + 1;
                
                // 按星期统计
                const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                distribution.byDayOfWeek[dayNames[dayOfWeek]] = (distribution.byDayOfWeek[dayNames[dayOfWeek]] || 0) + 1;
                
                // 按月份统计
                const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
                distribution.byMonth[monthNames[month]] = (distribution.byMonth[monthNames[month]] || 0) + 1;
            });
            
            // 找出高峰时段
            distribution.peakHours = Object.entries(distribution.byHour)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([hour, count]) => ({ hour: parseInt(hour), count }));
            
            distribution.peakDays = Object.entries(distribution.byDayOfWeek)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([day, count]) => ({ day, count }));
            
            return distribution;
        }),

        /**
         * 分类性能统计
         */
        classificationPerformance: computed(() => {
            return getClassificationPerformanceReport();
        }),

        /**
         * 综合统计报告
         */
        comprehensiveStats: computed(() => {
            const categorized = categorizedNews.value;
            const quality = categoryQuality.value;
            const distribution = categoryDistribution.value;
            const content = contentQuality.value;
            const time = timeDistribution.value;
            const performance = classificationPerformance.value;
            
            return {
                overview: {
                    totalNews: newsData.value.length,
                    totalCategories: Object.keys(categorized).filter(k => categorized[k].count > 0).length,
                    averageConfidence: Object.values(quality).reduce((acc, cat) => acc + cat.confidence, 0) / Object.keys(quality).length || 0,
                    contentQuality: content.qualityScore,
                    classificationAccuracy: performance.overall.accuracy
                },
                topCategories: distribution.slice(0, 5),
                qualityBreakdown: {
                    high: Object.values(quality).filter(cat => cat.quality === 'high').length,
                    medium: Object.values(quality).filter(cat => cat.quality === 'medium').length,
                    low: Object.values(quality).filter(cat => cat.quality === 'low').length
                },
                timeInsights: {
                    peakHours: time.peakHours,
                    peakDays: time.peakDays
                },
                contentInsights: {
                    withContent: content.withContent,
                    withExcerpt: content.withExcerpt,
                    withImages: content.withImages,
                    averageLength: content.averageLength
                },
                performanceInsights: {
                    accuracy: performance.overall.accuracy,
                    recentAccuracy: performance.recentAccuracy,
                    totalFeedback: performance.overall.totalFeedback,
                    correctPredictions: performance.overall.correctPredictions
                }
            };
        })
    };
};


