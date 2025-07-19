/**
 * 计算属性组合式函数
 * 提供基于新闻数据的常用计算属性
 * author: liangliang
 * 
 * @param {Object} store - 状态存储对象（包含newsData, searchQuery, currentDate等）
 * @returns {Object} 计算属性集合
 */
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
         * 当前日期显示文本
         */
        currentDateDisplay: computed(() => {
            const date = currentDate.value;
            const todayStr = getDateString(today.value);
            const currentStr = getDateString(date);
            
            if (currentStr === todayStr) {
                return '今天';
            }
            
            const yesterday = new Date(today.value);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = getDateString(yesterday);
            
            if (currentStr === yesterdayStr) {
                return '昨天';
            }
            
            const tomorrow = new Date(today.value);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = getDateString(tomorrow);
            
            if (currentStr === tomorrowStr) {
                return '明天';
            }
            
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const weekday = date.toLocaleDateString('zh-CN', { weekday: 'long' });
            
            return `${month}月${day}日 ${weekday}`;
        }),

        /**
         * 当前日期副标题
         */
        currentDateSubtitle: computed(() => {
            const date = currentDate.value;
            return getDateString(date);
        }),

        /**
         * 是否为今天
         */
        isToday: computed(() => {
            const date = currentDate.value;
            const todayStr = getDateString(today.value);
            const currentStr = getDateString(date);
            return currentStr === todayStr;
        }),

        /**
         * 是否为未来日期
         */
        isFutureDate: computed(() => {
            const date = currentDate.value;
            const todayStr = getDateString(today.value);
            const currentStr = getDateString(date);
            return currentStr > todayStr;
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
            const year = calendarMonth.value.getFullYear();
            const month = calendarMonth.value.getMonth();
            
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const firstDayWeekday = firstDay.getDay();
            const daysInMonth = lastDay.getDate();
            const prevMonth = new Date(year, month, 0);
            const daysInPrevMonth = prevMonth.getDate();
            
            const hasNewsData = (date) => {
                const dateStr = getDateString(date);
                const todayStr = getDateString(today.value);
                
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
            
            const days = [];
            
            // 上个月的日期
            for (let i = firstDayWeekday - 1; i >= 0; i--) {
                const day = daysInPrevMonth - i;
                const date = new Date(year, month - 1, day);
                const dateStr = getDateString(date);
                days.push({
                    key: `prev-${day}`,
                    dayNumber: day,
                    date: date,
                    isCurrentMonth: false,
                    isToday: dateStr === getDateString(today.value),
                    isSelected: dateStr === getDateString(currentDate.value),
                    hasNews: hasNewsData(date),
                    isClickable: dateStr <= getDateString(today.value),
                    tooltip: `${date.getFullYear()}年${date.getMonth() + 1}月${day}日`,
                    ariaLabel: `${date.getFullYear()}年${date.getMonth() + 1}月${day}日`
                });
            }
            
            // 当月的日期
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dateStr = getDateString(date);
                const todayStr = getDateString(today.value);
                
                days.push({
                    key: `current-${day}`,
                    dayNumber: day,
                    date: date,
                    isCurrentMonth: true,
                    isToday: dateStr === todayStr,
                    isSelected: dateStr === getDateString(currentDate.value),
                    hasNews: hasNewsData(date),
                    isClickable: dateStr <= todayStr,
                    tooltip: `${year}年${month + 1}月${day}日`,
                    ariaLabel: `${year}年${month + 1}月${day}日`
                });
            }
            
            // 下个月的日期
            const totalDays = days.length;
            const remainingDays = 42 - totalDays;
            
            for (let day = 1; day <= remainingDays; day++) {
                const date = new Date(year, month + 1, day);
                const dateStr = getDateString(date);
                days.push({
                    key: `next-${day}`,
                    dayNumber: day,
                    date: date,
                    isCurrentMonth: false,
                    isToday: dateStr === getDateString(today.value),
                    isSelected: dateStr === getDateString(currentDate.value),
                    hasNews: hasNewsData(date),
                    isClickable: dateStr <= getDateString(today.value),
                    tooltip: `${date.getFullYear()}年${date.getMonth() + 1}月${day}日`,
                    ariaLabel: `${date.getFullYear()}年${date.getMonth() + 1}月${day}日`
                });
            }
            
            return days;
        }),

        /**
         * 根据搜索和筛选条件过滤的新闻数据
         */
        filteredNewsData: computed(() => {
            if (!newsData.value || newsData.value.length === 0) {
                return [];
            }
            
            let filteredData = newsData.value;
            
            // 1. 按搜索关键词过滤
            if (searchQuery.value && searchQuery.value.trim()) {
                const keyword = searchQuery.value.toLowerCase().trim();
                filteredData = filteredData.filter(item => {
                    return (item.title && item.title.toLowerCase().includes(keyword)) ||
                           (item.content && item.content.toLowerCase().includes(keyword)) ||
                           (item.category && item.category.toLowerCase().includes(keyword)) ||
                           (item.tags && Array.isArray(item.tags) && 
                            item.tags.some(tag => tag.toLowerCase().includes(keyword)));
                });
            }
            
            // 2. 按分类过滤
            if (selectedCategories.value.size > 0) {
                filteredData = filteredData.filter(item => 
                    selectedCategories.value.has(item.category)
                );
            }
            
            // 3. 按标签过滤
            if (selectedTags.value.size > 0) {
                filteredData = filteredData.filter(item => 
                    item.tags && Array.isArray(item.tags) && 
                    item.tags.some(tag => selectedTags.value.has(tag))
                );
            }
            
            return filteredData;
        }),

        /**
         * 分类后的新闻数据
         */
        categorizedNews, // 直接返回上面定义的 computed

        /**
         * 显示的分类数据
         */
        displayCategories: computed(() => {
            // 首先获取基础分类数据
            const baseCategories = categorizedNews.value;
            
            // 如果有搜索查询，需要进一步过滤
            if (searchQuery.value && searchQuery.value.trim()) {
                const filtered = {};
                const keyword = searchQuery.value.toLowerCase().trim();
                
                Object.entries(baseCategories).forEach(([key, category]) => {
                    if (category && category.news && Array.isArray(category.news)) {
                        const filteredNews = category.news.filter(item => {
                            return (item.title && item.title.toLowerCase().includes(keyword)) ||
                                   (item.content && item.content.toLowerCase().includes(keyword)) ||
                                   (item.category && item.category.toLowerCase().includes(keyword)) ||
                                   (item.tags && Array.isArray(item.tags) && 
                                    item.tags.some(tag => tag.toLowerCase().includes(keyword)));
                        });

                        if (filteredNews.length > 0) {
                            filtered[key] = {
                                ...category,
                                news: filteredNews
                            };
                        }
                    }
                });
                
                return filtered;
            }
            
            // 如果有分类筛选，需要进一步过滤
            if (selectedCategories.value.size > 0) {
                const filtered = {};
                
                Object.entries(baseCategories).forEach(([key, category]) => {
                    if (selectedCategories.value.has(category.title)) {
                        filtered[key] = category;
                    }
                });
                
                return filtered;
            }
            
            // 如果有标签筛选，需要进一步过滤
            if (selectedTags.value.size > 0) {
                const filtered = {};
                
                Object.entries(baseCategories).forEach(([key, category]) => {
                    if (category && category.news && Array.isArray(category.news)) {
                        const filteredNews = category.news.filter(item => 
                            item.tags && Array.isArray(item.tags) && 
                            item.tags.some(tag => selectedTags.value.has(tag))
                        );

                        if (filteredNews.length > 0) {
                            filtered[key] = {
                                ...category,
                                news: filteredNews
                            };
                        }
                    }
                });
                
                return filtered;
            }
            
            return baseCategories;
        }),

        /**
         * 是否有搜索查询
         */
        hasSearchQuery: computed(() => {
            return searchQuery.value && searchQuery.value.trim().length > 0;
        }),

        /**
         * 是否有选中的分类
         */
        hasSelectedCategories: computed(() => {
            return selectedCategories.value.size > 0;
        }),

        /**
         * 是否有选中的标签
         */
        hasSelectedTags: computed(() => {
            return selectedTags.value.size > 0;
        }),

        /**
         * 是否有标签统计
         */
        hasTagStatistics: computed(() => {
            return tagStatistics.value && Object.keys(tagStatistics.value).length > 0;
        }),

        /**
         * 过滤后的新闻总数
         */
        filteredNewsCount: computed(() => {
            return filteredNewsData.value.length;
        }),

        /**
         * 日历日期
         */
        calendarDate: computed(() => {
            return calendarMonth.value;
        }),

        /**
         * 选中的日期
         */
        selectedDate: computed(() => {
            return currentDate.value;
        }),

        /**
         * 分类配置
         */
        categories: computed(() => {
            return getCategoriesConfig();
        }),

        /**
         * 检查新闻项是否高亮（匹配搜索）
         * @param {Object} item - 新闻项
         * @returns {boolean} 是否高亮
         */
        isHighlighted: (item) => {
            if (!searchQuery.value || !searchQuery.value.trim()) {
                return false;
            }
            const keyword = searchQuery.value.toLowerCase().trim();
            return (item.title && item.title.toLowerCase().includes(keyword)) ||
                   (item.content && item.content.toLowerCase().includes(keyword)) ||
                   (item.category && item.category.toLowerCase().includes(keyword)) ||
                   (item.tags && Array.isArray(item.tags) && 
                    item.tags.some(tag => tag.toLowerCase().includes(keyword)));
        }
    };
};

/**
 * 获取日期字符串
 * @param {Date} date - 日期对象
 * @returns {string} 日期字符串
 */
function getDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 获取分类配置
 * @returns {Array} 分类配置数组
 */
function getCategoriesConfig() {
    return [
        { key: 'tech', icon: 'fas fa-microchip', title: '科技' },
        { key: 'business', icon: 'fas fa-chart-line', title: '商业' },
        { key: 'politics', icon: 'fas fa-landmark', title: '政治' },
        { key: 'sports', icon: 'fas fa-futbol', title: '体育' },
        { key: 'entertainment', icon: 'fas fa-film', title: '娱乐' },
        { key: 'health', icon: 'fas fa-heartbeat', title: '健康' },
        { key: 'science', icon: 'fas fa-flask', title: '科学' },
        { key: 'world', icon: 'fas fa-globe', title: '国际' },
        { key: 'other', icon: 'fas fa-ellipsis-h', title: '其他' }
    ];
}

/**
 * 分类新闻项
 * @param {Object} item - 新闻项
 * @returns {string} 分类键
 */
function categorizeNewsItem(item) {
    if (!item.category) return 'other';
    
    const categoryMap = {
        '科技': 'tech',
        '商业': 'business',
        '政治': 'politics',
        '体育': 'sports',
        '娱乐': 'entertainment',
        '健康': 'health',
        '科学': 'science',
        '国际': 'world'
    };
    
    return categoryMap[item.category] || 'other';
}

