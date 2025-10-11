/**
 * 计算属性组合式函数
 * 提供基于新闻数据的常用计算属性
 * author: liangliang
 * 
 * @param {Object} store - 状态存储对象（包含newsData, searchQuery, currentDate等）
 * @returns {Object} 计算属性集合
 */
import { 
    getRelativeDateText, 
    isToday, 
    isFutureDate, 
    getTimeAgo, 
    generateCalendarDays 
} from '/utils/date.js';
import { categorizeNewsItem } from '/views/news/hooks/store.js';

export const useComputed = (store) => {
    const { computed } = Vue;
    const { 
        newsData, 
        searchQuery, 
        selectedCategories, 
        selectedTags, 
        currentDate, 
        calendarMonth, 
        today
    } = store;


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
         * 原始数据（用于搜索组件）
         */
        originalData: computed(() => {
            return newsData.value || [];
        }),

        /**
         * 可用视图（用于搜索组件）
         */
        availableViews: computed(() => {
            return [
                { key: 'all', icon: 'fas fa-layer-group', title: '全部' },
                { key: 'news', icon: 'fas fa-newspaper', title: '新闻' },
                { key: 'comments', icon: 'fas fa-comments', title: '评论' }
            ];
        }),

        /**
         * 当前视图（用于搜索组件）
         */
        currentView: computed(() => {
            return activeCategory.value;
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
         * 显示分类 - 将新闻按分类组织
         */
        displayCategories: computed(() => {
            const data = newsData.value || [];
            const categories = {};
            
            data.forEach(item => {
                const categoryInfo = categorizeNewsItem(item);
                const categoryKey = categoryInfo.key;
                
                if (!categories[categoryKey]) {
                    categories[categoryKey] = {
                        ...categoryInfo,
                        news: []
                    };
                }
                
                categories[categoryKey].news.push(item);
            });
            
            return categories;
        }),

    };
};


