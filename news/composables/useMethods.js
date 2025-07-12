// 业务逻辑方法组合函数

import { getConfig, NEWS_CONFIG } from '../../js/config/index.js';
import { utils } from '../utils/index.js';
import { newsApi } from '../api/newsApi.js';

// 从全局Vue对象中解构需要的函数
const { nextTick, watch } = Vue;

// 使用NEWS_CONFIG中的getDateString函数
const getDateString = NEWS_CONFIG.getDateString;

export const useMethods = (store) => {
    const {
        newsData,
        loading,
        error,
        errorMessage,
        searchQuery,
        selectedCategories,
        selectedTags,
        clickedItems,
        searchHistory,
        sidebarCollapsed,
        currentDate,
        calendarMonth,
        today
    } = store;

    // 监听搜索查询变化
    watch(searchQuery, (newQuery) => {
        if (newQuery && !searchHistory.value.includes(newQuery)) {
            searchHistory.value.unshift(newQuery);
            searchHistory.value = searchHistory.value.slice(0, 10);
            utils.safeSetItem('newsSearchHistory', JSON.stringify(searchHistory.value));
        }
    }, { immediate: false });

    // 加载新闻数据
    const loadNewsData = async () => {
        loading.value = true;
        error.value = null;
        errorMessage.value = '';

        try {
            const data = await newsApi.fetchNewsData(currentDate.value);
            newsData.value = data;
        } catch (err) {
            console.error('加载新闻数据失败:', err);
            const message = err.message || '加载新闻数据失败，请稍后重试';
            showErrorMessage(message);
        } finally {
            loading.value = false;
        }
    };

    // 搜索相关方法
    const handleSearch = utils.debounce((event) => {
        const query = event.target.value.trim();
        searchQuery.value = query;
        
        if (query && !searchHistory.value.includes(query)) {
            searchHistory.value.unshift(query);
            searchHistory.value = searchHistory.value.slice(0, 10);
            utils.safeSetItem('newsSearchHistory', JSON.stringify(searchHistory.value));
        }
    }, 100);

    const handleSearchInput = (event) => {
        const query = event.target.value.trim();
        searchQuery.value = query;
        
        if (query && !searchHistory.value.includes(query)) {
            searchHistory.value.unshift(query);
            searchHistory.value = searchHistory.value.slice(0, 10);
            utils.safeSetItem('newsSearchHistory', JSON.stringify(searchHistory.value));
        }
    };

    const handleSearchKeydown = (event) => {
        if (event.key === 'Escape') {
            event.target.value = '';
            searchQuery.value = '';
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const query = searchQuery.value.trim();
            if (query && !searchHistory.value.includes(query)) {
                searchHistory.value.unshift(query);
                searchHistory.value = searchHistory.value.slice(0, 10);
                utils.safeSetItem('newsSearchHistory', JSON.stringify(searchHistory.value));
            }
        }
    };

    const clearSearch = () => {
        searchQuery.value = '';
    };

    // 筛选相关方法
    const toggleCategory = (category) => {
        if (selectedCategories.value.has(category)) {
            selectedCategories.value.delete(category);
        } else {
            selectedCategories.value.add(category);
        }
    };

    const toggleTag = (tagName) => {
        if (selectedTags.value.has(tagName)) {
            selectedTags.value.delete(tagName);
        } else {
            selectedTags.value.add(tagName);
        }
    };

    const shouldShowCategory = (categoryKey) => {
        return selectedCategories.value.size === 0 || selectedCategories.value.has(categoryKey);
    };

    const shouldShowTag = (tagName) => {
        return selectedTags.value.size === 0 || selectedTags.value.has(tagName);
    };

    const isHighlighted = (item) => {
        return searchQuery.value && utils.isSearchMatch(item, searchQuery.value);
    };

    // 新闻点击处理
    const handleNewsClick = (item) => {
        const itemKey = item.link || item.title;
        clickedItems.value.add(itemKey);
        
        setTimeout(() => clickedItems.value.delete(itemKey), 300);

        if (item.link) {
            window.open(item.link, '_blank', 'noopener,noreferrer');
        }
    };

    // 错误处理
    const showErrorMessage = (message) => {
        error.value = message;
        errorMessage.value = message;
        setTimeout(() => {
            error.value = null;
            errorMessage.value = '';
        }, 5000);
    };

    // 日期导航方法
    const goToPreviousDay = () => {
        const newDate = new Date(currentDate.value);
        newDate.setDate(newDate.getDate() - 1);
        currentDate.value = newDate;
        
        utils.updateUrlParams(newDate);
        
        const selectedYear = newDate.getFullYear();
        const selectedMonth = newDate.getMonth();
        calendarMonth.value = new Date(selectedYear, selectedMonth, 1);
        
        searchQuery.value = '';
        selectedCategories.value.clear();
        selectedTags.value.clear();
        
        loading.value = true;
        loadNewsData();
    };

    const goToNextDay = () => {
        const newDate = new Date(currentDate.value);
        newDate.setDate(newDate.getDate() + 1);
        currentDate.value = newDate;
        
        utils.updateUrlParams(newDate);
        
        const selectedYear = newDate.getFullYear();
        const selectedMonth = newDate.getMonth();
        calendarMonth.value = new Date(selectedYear, selectedMonth, 1);
        
        searchQuery.value = '';
        selectedCategories.value.clear();
        selectedTags.value.clear();
        
        loading.value = true;
        loadNewsData();
    };

    const goToToday = () => {
        currentDate.value = new Date(today);
        
        utils.updateUrlParams(today);
        
        const selectedYear = today.getFullYear();
        const selectedMonth = today.getMonth();
        calendarMonth.value = new Date(selectedYear, selectedMonth, 1);
        
        searchQuery.value = '';
        selectedCategories.value.clear();
        selectedTags.value.clear();
        
        loading.value = true;
        loadNewsData();
    };

    // 侧边栏收缩切换
    const toggleSidebar = () => {
        sidebarCollapsed.value = !sidebarCollapsed.value;
        
        utils.safeSetItem('sidebarCollapsed', sidebarCollapsed.value.toString());
        
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 300);
    };

    // 日历导航方法
    const previousMonth = utils.debounce(() => {
        const newMonth = new Date(calendarMonth.value);
        newMonth.setMonth(newMonth.getMonth() - 1);
        calendarMonth.value = newMonth;
    }, 100);

    const nextMonth = utils.debounce(() => {
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const calendarYear = calendarMonth.value.getFullYear();
        const calendarMonthNum = calendarMonth.value.getMonth();
        const isCurrentMonth = currentYear === calendarYear && currentMonth === calendarMonthNum;
        
        if (isCurrentMonth) return;
        
        const newMonth = new Date(calendarMonth.value);
        newMonth.setMonth(newMonth.getMonth() + 1);
        calendarMonth.value = newMonth;
    }, 100);

    const selectDate = (date) => {
                    const newsConfig = getConfig('news');
            const dateStr = newsConfig.getDateString(date);
            const todayStr = newsConfig.getDateString(today);
        
        if (dateStr > todayStr) {
            showErrorMessage('无法查看未来日期的新闻');
            return;
        }
        
        const currentDateStr = getDateString(currentDate.value);
        if (dateStr === currentDateStr) {
            return;
        }
        
        currentDate.value = new Date(date);
        
        utils.updateUrlParams(date);
        
        searchQuery.value = '';
        selectedCategories.value.clear();
        selectedTags.value.clear();
        
        loading.value = true;
        error.value = null;
        
        loadNewsData().catch(err => {
            console.error('加载新闻数据失败:', err);
            showErrorMessage('加载新闻数据失败，请重试');
        });
        
        const selectedYear = date.getFullYear();
        const selectedMonth = date.getMonth();
        const calendarYear = calendarMonth.value.getFullYear();
        const calendarMonthNum = calendarMonth.value.getMonth();
        
        if (selectedYear !== calendarYear || selectedMonth !== calendarMonthNum) {
            calendarMonth.value = new Date(selectedYear, selectedMonth, 1);
        }
        
        const dayElement = document.querySelector(`[data-date="${dateStr}"]`);
        if (dayElement) {
            dayElement.classList.add('clicked');
            setTimeout(() => {
                dayElement.classList.remove('clicked');
            }, 300);
        }
        
        nextTick(() => {
            // 重新计算日历天数以更新新闻指示器
        });
    };

    return {
        loadNewsData,
        handleSearch,
        handleSearchInput,
        handleSearchKeydown,
        clearSearch,
        toggleCategory,
        toggleTag,
        shouldShowCategory,
        shouldShowTag,
        isHighlighted,
        handleNewsClick,
        showErrorMessage,
        goToPreviousDay,
        goToNextDay,
        goToToday,
        toggleSidebar,
        previousMonth,
        nextMonth,
        selectDate
    };
}; 