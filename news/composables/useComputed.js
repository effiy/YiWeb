// 计算属性组合函数

import { CATEGORIES, getDateString } from '../config/constants.js';
import { utils } from '../utils/index.js';

// 从全局Vue对象中解构需要的函数
const { computed } = Vue;

export const useComputed = (store) => {
    const {
        newsData,
        searchQuery,
        selectedCategories,
        selectedTags,
        currentDate,
        calendarMonth,
        today
    } = store;

    // 基础计算属性
    const hasNewsData = computed(() => newsData.value.length > 0);

    // 日期相关计算属性
    const currentDateDisplay = computed(() => {
        const date = currentDate.value;
        const todayStr = getDateString(today);
        const currentStr = getDateString(date);
        
        if (currentStr === todayStr) {
            return '今天';
        }
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getDateString(yesterday);
        
        if (currentStr === yesterdayStr) {
            return '昨天';
        }
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = getDateString(tomorrow);
        
        if (currentStr === tomorrowStr) {
            return '明天';
        }
        
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const weekday = date.toLocaleDateString('zh-CN', { weekday: 'long' });
        
        return `${month}月${day}日 ${weekday}`;
    });

    const currentDateSubtitle = computed(() => {
        const date = currentDate.value;
        return getDateString(date);
    });

    const isToday = computed(() => {
        const date = currentDate.value;
        const todayStr = getDateString(today);
        const currentStr = getDateString(date);
        return currentStr === todayStr;
    });

    const isFutureDate = computed(() => {
        const date = currentDate.value;
        const todayStr = getDateString(today);
        const currentStr = getDateString(date);
        return currentStr > todayStr;
    });

    // 日历相关计算属性
    const calendarTitle = computed(() => {
        const year = calendarMonth.value.getFullYear();
        const month = calendarMonth.value.getMonth() + 1;
        return `${year}年${month}月`;
    });

    const isCurrentMonth = computed(() => {
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const calendarYear = calendarMonth.value.getFullYear();
        const calendarMonthNum = calendarMonth.value.getMonth();
        return currentYear === calendarYear && currentMonth === calendarMonthNum;
    });

    const calendarDays = computed(() => {
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
            const todayStr = getDateString(today);
            
            if (dateStr > todayStr) {
                return false;
            }
            
            const ninetyDaysAgo = new Date(today);
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
            
            const thirtyDaysAgo = new Date(today);
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
                isToday: dateStr === getDateString(today),
                isSelected: dateStr === getDateString(currentDate.value),
                hasNews: hasNewsData(date),
                isClickable: dateStr <= getDateString(today),
                tooltip: `${date.getFullYear()}年${date.getMonth() + 1}月${day}日`,
                ariaLabel: `${date.getFullYear()}年${date.getMonth() + 1}月${day}日`
            });
        }
        
        // 当月的日期
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = getDateString(date);
            const todayStr = getDateString(today);
            
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
                isToday: dateStr === getDateString(today),
                isSelected: dateStr === getDateString(currentDate.value),
                hasNews: hasNewsData(date),
                isClickable: dateStr <= getDateString(today),
                tooltip: `${date.getFullYear()}年${date.getMonth() + 1}月${day}日`,
                ariaLabel: `${date.getFullYear()}年${date.getMonth() + 1}月${day}日`
            });
        }
        
        return days;
    });

    // 新闻分类计算属性
    const categorizedNews = computed(() => {
        const result = {};
        
        CATEGORIES.forEach(category => {
            result[category.key] = {
                icon: category.icon,
                title: category.title,
                news: []
            };
        });

        newsData.value.forEach(item => {
            const categoryKey = utils.categorizeNewsItem(item);
            
            // 确保分类键存在，如果不存在则使用'other'分类
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

    const displayCategories = computed(() => {
        let baseCategories = categorizedNews.value;
        
        if (searchQuery.value) {
            const filtered = {};
            
            Object.entries(baseCategories).forEach(([key, category]) => {
                // 确保category和category.news存在
                if (category && category.news && Array.isArray(category.news)) {
                    const filteredNews = category.news.filter(item => 
                        utils.isSearchMatch(item, searchQuery.value)
                    );

                    if (filteredNews.length > 0) {
                        filtered[key] = {
                            ...category,
                            news: filteredNews
                        };
                    }
                }
            });
            
            baseCategories = filtered;
        }
        
        if (selectedTags.value.size > 0) {
            const tagFiltered = {};
            
            Object.entries(baseCategories).forEach(([key, category]) => {
                // 确保category和category.news存在
                if (category && category.news && Array.isArray(category.news)) {
                    const filteredNews = category.news.filter(item => {
                        let tags = [];
                        
                        if (item.categories && item.categories.length > 0) {
                            if (Array.isArray(item.categories)) {
                                tags = item.categories;
                            } else if (typeof item.categories === 'string') {
                                tags = [item.categories];
                            }
                            
                            const duplicateTags = new Set(CATEGORIES.map(cat => cat.title));
                            tags = tags.filter(tag => !duplicateTags.has(tag) && tag && tag.trim().length > 1);
                        }
                        
                        return tags.some(tag => selectedTags.value.has(tag.trim()));
                    });

                    if (filteredNews.length > 0) {
                        tagFiltered[key] = {
                            ...category,
                            news: filteredNews
                        };
                    }
                }
            });
            
            baseCategories = tagFiltered;
        }

        return baseCategories;
    });

    const searchResults = computed(() => {
        if (!searchQuery.value) return [];
        
        return Object.values(displayCategories.value)
            .filter(category => category && category.news && Array.isArray(category.news))
            .flatMap(category => category.news);
    });

    const availableTags = computed(() => {
        const allNews = newsData.value;
        const duplicateTags = new Set(CATEGORIES.map(cat => cat.title));
        const tagCount = new Map();
        const tagColors = new Map();
        
        allNews.forEach(item => {
            let tags = [];
            
            if (item.categories && item.categories.length > 0) {
                if (Array.isArray(item.categories)) {
                    tags = item.categories;
                } else if (typeof item.categories === 'string') {
                    tags = [item.categories];
                }
                
                tags = tags.filter(tag => !duplicateTags.has(tag));
            }
            
            if (Array.isArray(tags) && tags.length > 0) {
                tags.forEach(tag => {
                    if (tag && tag.trim().length > 1) {
                        const cleanTag = tag.trim();
                        const count = tagCount.get(cleanTag) || 0;
                        tagCount.set(cleanTag, count + 1);
                        
                        if (!tagColors.has(cleanTag)) {
                            const hash = cleanTag.split('').reduce((a, b) => {
                                a = ((a << 5) - a) + b.charCodeAt(0);
                                return a & a;
                            }, 0);
                            const hue = Math.abs(hash) % 360;
                            tagColors.set(cleanTag, `hsl(${hue}, 70%, 50%)`);
                        }
                    }
                });
            }
        });
        
        const sortedTags = Array.from(tagCount.entries())
            .filter(([tag, count]) => count >= 2)
            .map(([tag, count]) => ({
                name: tag,
                count: count,
                color: tagColors.get(tag)
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);
        
        return sortedTags;
    });

    const tagStatistics = computed(() => {
        let currentNews = [];
        
        if (searchQuery.value && searchResults.value.length > 0) {
            currentNews = searchResults.value;
        } else if (!searchQuery.value) {
            const categoriesToShow = Object.entries(displayCategories.value)
                .filter(([categoryKey]) => {
                    return selectedCategories.value.size === 0 || selectedCategories.value.has(categoryKey);
                })
                .filter(([, category]) => category && category.news && Array.isArray(category.news));
            currentNews = categoriesToShow.flatMap(([, category]) => category.news);
        }
        
        const duplicateTags = new Set(CATEGORIES.map(cat => cat.title));
        const currentTagCount = new Map();
        
        currentNews.forEach(item => {
            let tags = [];
            
            if (item.categories && item.categories.length > 0) {
                if (Array.isArray(item.categories)) {
                    tags = item.categories;
                } else if (typeof item.categories === 'string') {
                    tags = [item.categories];
                }
                
                tags = tags.filter(tag => !duplicateTags.has(tag));
            }
            
            if (Array.isArray(tags) && tags.length > 0) {
                tags.forEach(tag => {
                    if (tag && tag.trim().length > 1) {
                        const cleanTag = tag.trim();
                        const count = currentTagCount.get(cleanTag) || 0;
                        currentTagCount.set(cleanTag, count + 1);
                    }
                });
            }
        });
        
        const tagsWithCurrentStats = availableTags.value.map(tag => ({
            name: tag.name,
            totalCount: tag.count,
            currentCount: currentTagCount.get(tag.name) || 0,
            percentage: currentNews.length > 0 ? Math.round(((currentTagCount.get(tag.name) || 0) / currentNews.length) * 100) : 0,
            color: tag.color
        }));
        
        const maxCurrentCount = Math.max(...tagsWithCurrentStats.map(tag => tag.currentCount), 0);
        
        return {
            tags: tagsWithCurrentStats,
            totalTags: availableTags.value.length,
            totalNews: currentNews.length,
            maxCount: maxCurrentCount
        };
    });

    return {
        hasNewsData,
        currentDateDisplay,
        currentDateSubtitle,
        isToday,
        isFutureDate,
        calendarTitle,
        isCurrentMonth,
        calendarDays,
        categorizedNews,
        displayCategories,
        searchResults,
        availableTags,
        tagStatistics
    };
}; 