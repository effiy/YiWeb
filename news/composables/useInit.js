// 初始化功能组合函数

import { getDateString } from '../config/constants.js';
import { utils } from '../utils/index.js';

export const useInit = (store, methods) => {
    const {
        searchHistory,
        sidebarCollapsed,
        currentDate,
        calendarMonth,
        today,
        loading,
        searchQuery,
        selectedCategories,
        selectedTags
    } = store;

    const {
        goToPreviousDay,
        goToNextDay,
        goToToday,
        previousMonth,
        nextMonth,
        loadNewsData
    } = methods;

    const initKeyboardShortcuts = () => {
        document.addEventListener('keydown', (event) => {
            // 搜索快捷键
            if (event.ctrlKey && event.key === 'k') {
                event.preventDefault();
                document.getElementById('messageInput')?.focus();
            }
            
            // 日期导航快捷键
            if (!event.ctrlKey && !event.altKey && !event.metaKey) {
                switch (event.key) {
                    case 'ArrowLeft':
                        event.preventDefault();
                        goToPreviousDay();
                        break;
                    case 'ArrowRight':
                        event.preventDefault();
                        goToNextDay();
                        break;
                    case 'Home':
                        event.preventDefault();
                        goToToday();
                        break;
                    case 'PageUp':
                        event.preventDefault();
                        previousMonth();
                        break;
                    case 'PageDown':
                        event.preventDefault();
                        const currentYear = today.getFullYear();
                        const currentMonth = today.getMonth();
                        const calendarYear = calendarMonth.value.getFullYear();
                        const calendarMonthNum = calendarMonth.value.getMonth();
                        const isCurrentMonth = currentYear === calendarYear && currentMonth === calendarMonthNum;
                        
                        if (!isCurrentMonth) {
                            nextMonth();
                        }
                        break;
                }
            }
            
            // 清除搜索
            if (event.key === 'Escape') {
                const searchInput = document.getElementById('messageInput');
                if (searchInput) {
                    searchInput.value = '';
                    searchQuery.value = '';
                }
            }
        });
    };

    const initResponsiveLayout = () => {
        const updateLayout = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        updateLayout();
        window.addEventListener('resize', updateLayout);
        window.addEventListener('orientationchange', updateLayout);
    };

    const initAccessibility = () => {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
    };

    const initErrorHandling = () => {
        window.addEventListener('error', (event) => {
            console.error('全局错误:', event.error);
            methods.showErrorMessage('页面出现错误，请刷新重试');
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('未处理的Promise拒绝:', event.reason);
            methods.showErrorMessage('网络请求失败，请检查网络连接');
        });
    };

    const initSearchHistory = () => {
        const savedHistory = localStorage.getItem('newsSearchHistory');
        if (savedHistory) {
            try {
                searchHistory.value = JSON.parse(savedHistory);
            } catch (e) {
                console.warn('解析搜索历史失败:', e);
            }
        }
    };

    const initSidebarState = () => {
        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState !== null) {
            sidebarCollapsed.value = savedState === 'true';
        }
    };

    const initUrlParams = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const dateParam = urlParams.get('date');

        if (dateParam) {
            const date = new Date(dateParam);
            if (!isNaN(date.getTime())) {
                date.setHours(0, 0, 0, 0);
                currentDate.value = date;
                
                const selectedYear = date.getFullYear();
                const selectedMonth = date.getMonth();
                calendarMonth.value = new Date(selectedYear, selectedMonth, 1);
                
                searchQuery.value = '';
                selectedCategories.value.clear();
                selectedTags.value.clear();
                
                loading.value = true;
                loadNewsData();
            } else {
                console.warn('无效的日期参数:', dateParam);
            }
        } else {
            utils.updateUrlParams(currentDate.value);
        }
    };

    const initBrowserHistory = () => {
        window.addEventListener('popstate', (event) => {
            const urlParams = new URLSearchParams(window.location.search);
            const dateParam = urlParams.get('date');
            
            if (dateParam) {
                const date = new Date(dateParam);
                if (!isNaN(date.getTime())) {
                    date.setHours(0, 0, 0, 0);
                    currentDate.value = date;
                    
                    const selectedYear = date.getFullYear();
                    const selectedMonth = date.getMonth();
                    calendarMonth.value = new Date(selectedYear, selectedMonth, 1);
                    
                    searchQuery.value = '';
                    selectedCategories.value.clear();
                    selectedTags.value.clear();
                    
                    loading.value = true;
                    loadNewsData();
                }
            } else {
                goToToday();
            }
        });
    };

    return {
        initKeyboardShortcuts,
        initResponsiveLayout,
        initAccessibility,
        initErrorHandling,
        initSearchHistory,
        initSidebarState,
        initUrlParams,
        initBrowserHistory
    };
}; 