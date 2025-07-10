// Vue3 新闻页面应用
const { createApp, ref, computed, onMounted, nextTick, watch } = Vue;

const NewsApp = {
    setup() {
        // 响应式数据
        const newsData = ref([]);
        const loading = ref(true);
        const error = ref(null);
        const errorMessage = ref('');
        const searchQuery = ref('');
        const selectedCategories = ref(new Set());
        const clickedItems = ref(new Set());
        const searchHistory = ref([]);
        
        // 侧边栏收缩状态
        const sidebarCollapsed = ref(false);
        
        // 日期管理
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentDate = ref(new Date(today));
        
        // 日历相关数据
        const calendarMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1));
        const weekdays = ref(['日', '一', '二', '三', '四', '五', '六']);

        // API配置
        const getDateString = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const getApiUrl = (date) => {
            const dateStr = getDateString(date);
            return `https://api.effiy.cn/mongodb/?cname=rss&isoDate=${dateStr},${dateStr}`;
        };

        const API_CONFIG = {
            getUrl: getApiUrl,
            timeout: 10000
        };

        // 分类配置
        const CATEGORIES = [
            { key: 'ai', icon: 'fas fa-robot', title: 'AI技术', keywords: ['ai', '人工智能', 'gpt', '机器学习', '深度学习'] },
            { key: 'data', icon: 'fas fa-chart-line', title: '数据分析', keywords: ['数据', '分析', '统计', '可视化', '报表'] },
            { key: 'code', icon: 'fas fa-code', title: '代码开发', keywords: ['代码', '开发', '编程', '软件', '框架'] },
            { key: 'tech', icon: 'fas fa-microchip', title: '科技产品', keywords: ['产品', '手机', '芯片', '硬件', '设备'] },
            { key: 'business', icon: 'fas fa-briefcase', title: '商业资讯', keywords: ['商业', '投资', '市场', '融资', '创业'] },
            { key: 'other', icon: 'fas fa-ellipsis-h', title: '其他', keywords: [] }
        ];

        const categories = ref(CATEGORIES);

        // 工具函数
        const utils = {
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
                const dateStr = getDateString(date);
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

        // 计算属性
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
            
            // 自定义日期格式化，确保月份和日位都用阿拉伯数字
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
            
            // 获取当月第一天和最后一天
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            // 获取第一天是星期几（0-6，0是星期日）
            const firstDayWeekday = firstDay.getDay();
            
            // 获取当月天数
            const daysInMonth = lastDay.getDate();
            
            // 获取上个月的天数
            const prevMonth = new Date(year, month, 0);
            const daysInPrevMonth = prevMonth.getDate();
            
            // 检查哪些日期有新闻数据
            const hasNewsData = (date) => {
                // 改进的新闻数据检查逻辑
                const dateStr = getDateString(date);
                const todayStr = getDateString(today);
                
                // 未来日期没有新闻数据
                if (dateStr > todayStr) {
                    return false;
                }
                
                // 检查日期是否在过去90天内（更合理的范围）
                const ninetyDaysAgo = new Date(today);
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                
                if (date < ninetyDaysAgo) {
                    return false;
                }
                
                // 可以根据实际需求添加更精确的新闻数据检查
                // 例如：检查本地存储的新闻数据缓存
                const cachedNewsKey = `news_cache_${dateStr}`;
                const cachedNews = localStorage.getItem(cachedNewsKey);
                
                if (cachedNews) {
                    try {
                        const newsData = JSON.parse(cachedNews);
                        return newsData && newsData.length > 0;
                    } catch (e) {
                        // 缓存数据损坏，删除它
                        localStorage.removeItem(cachedNewsKey);
                    }
                }
                
                // 默认：过去30天内的日期都可能有新闻
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return date >= thirtyDaysAgo;
            };
            
            const days = [];
            
            // 添加上个月的日期（填充第一行）
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
            
            // 添加当月的日期
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
            
            // 添加下个月的日期（确保6行7列 = 42个格子的布局）
            const totalDays = days.length;
            const remainingDays = 42 - totalDays; // 保持6行7列的布局
            
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

        const categorizedNews = computed(() => {
            const result = {};
            
            // 初始化分类
            CATEGORIES.forEach(category => {
                result[category.key] = {
                    icon: category.icon,
                    title: category.title,
                    news: []
                };
            });

            // 分类新闻
            newsData.value.forEach(item => {
                const categoryKey = utils.categorizeNewsItem(item);
                result[categoryKey].news.push(item);
            });

            return result;
        });

        const displayCategories = computed(() => {
            if (!searchQuery.value) {
                return categorizedNews.value;
            }

            const filtered = {};
            
            Object.entries(categorizedNews.value).forEach(([key, category]) => {
                const filteredNews = category.news.filter(item => 
                    utils.isSearchMatch(item, searchQuery.value)
                );

                if (filteredNews.length > 0) {
                    filtered[key] = {
                        ...category,
                        news: filteredNews
                    };
                }
            });

            return filtered;
        });

        const searchResults = computed(() => {
            if (!searchQuery.value) return [];
            
            return Object.values(displayCategories.value)
                .flatMap(category => category.news);
        });

        // 监听搜索查询变化
        watch(searchQuery, (newQuery) => {
            // 添加到搜索历史
            if (newQuery && !searchHistory.value.includes(newQuery)) {
                searchHistory.value.unshift(newQuery);
                searchHistory.value = searchHistory.value.slice(0, 10);
                localStorage.setItem('newsSearchHistory', JSON.stringify(searchHistory.value));
            }
        }, { immediate: false });

        // API相关方法
        const api = {
            async fetchNewsData() {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

                try {
                    const response = await fetch(API_CONFIG.getUrl(currentDate.value), {
                        signal: controller.signal,
                        headers: {
                            'Accept': 'application/json',
                            'Cache-Control': 'no-cache'
                        }
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const data = await response.json();
                    
                    if (data.status !== 200 || !data.data?.list) {
                        throw new Error('数据格式错误');
                    }

                    // 缓存新闻数据
                    const dateStr = getDateString(currentDate.value);
                    const cacheKey = `news_cache_${dateStr}`;
                    try {
                        localStorage.setItem(cacheKey, JSON.stringify(data.data.list));
                    } catch (e) {
                        console.warn('缓存新闻数据失败:', e);
                    }

                    return data.data.list;
                } catch (err) {
                    clearTimeout(timeoutId);
                    
                    if (err.name === 'AbortError') {
                        throw new Error('请求超时，请检查网络连接');
                    }
                    
                    throw err;
                }
            }
        };

        // 业务逻辑方法
        const methods = {
            async loadNewsData() {
                loading.value = true;
                error.value = null;
                errorMessage.value = '';

                try {
                    const data = await api.fetchNewsData();
                    newsData.value = data;
                } catch (err) {
                    console.error('加载新闻数据失败:', err);
                    const message = err.message || '加载新闻数据失败，请稍后重试';
                    methods.showErrorMessage(message);
                } finally {
                    loading.value = false;
                }
            },

            handleSearch: utils.debounce((event) => {
                const query = event.target.value.trim();
                searchQuery.value = query;
                
                // 添加到搜索历史
                if (query && !searchHistory.value.includes(query)) {
                    searchHistory.value.unshift(query);
                    searchHistory.value = searchHistory.value.slice(0, 10);
                    localStorage.setItem('newsSearchHistory', JSON.stringify(searchHistory.value));
                }
            }, 100),

            handleSearchInput(event) {
                const query = event.target.value.trim();
                searchQuery.value = query;
                
                // 添加到搜索历史
                if (query && !searchHistory.value.includes(query)) {
                    searchHistory.value.unshift(query);
                    searchHistory.value = searchHistory.value.slice(0, 10);
                    localStorage.setItem('newsSearchHistory', JSON.stringify(searchHistory.value));
                }
            },

            handleSearchKeydown(event) {
                if (event.key === 'Escape') {
                    event.target.value = '';
                    searchQuery.value = '';
                } else if (event.key === 'Enter') {
                    // 回车时聚焦到结果区域
                    event.preventDefault();
                    const query = searchQuery.value.trim();
                    if (query && !searchHistory.value.includes(query)) {
                        searchHistory.value.unshift(query);
                        searchHistory.value = searchHistory.value.slice(0, 10);
                        localStorage.setItem('newsSearchHistory', JSON.stringify(searchHistory.value));
                    }
                }
            },

            toggleCategory(category) {
                if (selectedCategories.value.has(category)) {
                    selectedCategories.value.delete(category);
                } else {
                    selectedCategories.value.add(category);
                }
            },

            shouldShowCategory(categoryKey) {
                return selectedCategories.value.size === 0 || selectedCategories.value.has(categoryKey);
            },

            isHighlighted(item) {
                return searchQuery.value && utils.isSearchMatch(item, searchQuery.value);
            },

            handleNewsClick(item) {
                const itemKey = item.link || item.title;
                clickedItems.value.add(itemKey);
                
                setTimeout(() => clickedItems.value.delete(itemKey), 300);

                if (item.link) {
                    window.open(item.link, '_blank', 'noopener,noreferrer');
                }
            },

            showErrorMessage(message) {
                error.value = message;
                errorMessage.value = message;
                setTimeout(() => {
                    error.value = null;
                    errorMessage.value = '';
                }, 5000);
            },

            // 日期导航方法
            goToPreviousDay() {
                const newDate = new Date(currentDate.value);
                newDate.setDate(newDate.getDate() - 1);
                currentDate.value = newDate;
                
                // 更新URL
                utils.updateUrlParams(newDate);
                
                // 更新日历月份以匹配选择的日期
                const selectedYear = newDate.getFullYear();
                const selectedMonth = newDate.getMonth();
                calendarMonth.value = new Date(selectedYear, selectedMonth, 1);
                
                // 清空搜索和分类筛选
                searchQuery.value = '';
                selectedCategories.value.clear();
                
                // 显示加载状态并重新加载数据
                loading.value = true;
                methods.loadNewsData();
            },

            goToNextDay() {
                const newDate = new Date(currentDate.value);
                newDate.setDate(newDate.getDate() + 1);
                currentDate.value = newDate;
                
                // 更新URL
                utils.updateUrlParams(newDate);
                
                // 更新日历月份以匹配选择的日期
                const selectedYear = newDate.getFullYear();
                const selectedMonth = newDate.getMonth();
                calendarMonth.value = new Date(selectedYear, selectedMonth, 1);
                
                // 清空搜索和分类筛选
                searchQuery.value = '';
                selectedCategories.value.clear();
                
                // 显示加载状态并重新加载数据
                loading.value = true;
                methods.loadNewsData();
            },

            goToToday() {
                currentDate.value = new Date(today);
                
                // 更新URL
                utils.updateUrlParams(today);
                
                // 更新日历月份以匹配选择的日期
                const selectedYear = today.getFullYear();
                const selectedMonth = today.getMonth();
                calendarMonth.value = new Date(selectedYear, selectedMonth, 1);
                
                // 清空搜索和分类筛选
                searchQuery.value = '';
                selectedCategories.value.clear();
                
                // 显示加载状态并重新加载数据
                loading.value = true;
                methods.loadNewsData();
            },

            // 侧边栏收缩切换
            toggleSidebar() {
                sidebarCollapsed.value = !sidebarCollapsed.value;
                
                // 保存状态到本地存储
                localStorage.setItem('sidebarCollapsed', sidebarCollapsed.value.toString());
                
                // 触发重新布局
                setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                }, 300);
            },

            // 日历导航方法
            previousMonth: utils.debounce(() => {
                const newMonth = new Date(calendarMonth.value);
                newMonth.setMonth(newMonth.getMonth() - 1);
                calendarMonth.value = newMonth;
            }, 100),

            nextMonth: utils.debounce(() => {
                if (isCurrentMonth.value) return;
                
                const newMonth = new Date(calendarMonth.value);
                newMonth.setMonth(newMonth.getMonth() + 1);
                calendarMonth.value = newMonth;
            }, 100),

            selectDate(date) {
                // 检查日期是否可点击（不能是未来日期）
                const dateStr = getDateString(date);
                const todayStr = getDateString(today);
                
                if (dateStr > todayStr) {
                    // 显示提示信息
                    methods.showErrorMessage('无法查看未来日期的新闻');
                    return; // 未来日期不可点击
                }
                
                // 如果选择的日期已经是当前日期，不需要重新加载
                const currentDateStr = getDateString(currentDate.value);
                if (dateStr === currentDateStr) {
                    return;
                }
                
                // 更新当前日期
                currentDate.value = new Date(date);
                
                // 更新URL
                utils.updateUrlParams(date);
                
                // 清空搜索和分类筛选
                searchQuery.value = '';
                selectedCategories.value.clear();
                
                // 显示加载状态并重新加载数据
                loading.value = true;
                error.value = null; // 清除之前的错误
                
                // 异步加载数据
                methods.loadNewsData().catch(err => {
                    console.error('加载新闻数据失败:', err);
                    methods.showErrorMessage('加载新闻数据失败，请重试');
                });
                
                // 如果选择的日期不在当前显示的月份，更新日历月份
                const selectedYear = date.getFullYear();
                const selectedMonth = date.getMonth();
                const calendarYear = calendarMonth.value.getFullYear();
                const calendarMonthNum = calendarMonth.value.getMonth();
                
                if (selectedYear !== calendarYear || selectedMonth !== calendarMonthNum) {
                    calendarMonth.value = new Date(selectedYear, selectedMonth, 1);
                }
                
                // 添加点击反馈
                const dayElement = document.querySelector(`[data-date="${dateStr}"]`);
                if (dayElement) {
                    dayElement.classList.add('clicked');
                    setTimeout(() => {
                        dayElement.classList.remove('clicked');
                    }, 300);
                }
                
                // 更新日历的新闻数据指示器
                nextTick(() => {
                    // 重新计算日历天数以更新新闻指示器
                    // Vue的响应式系统会自动处理
                });
            },

            clearSearch() {
                searchQuery.value = '';
            }
        };

        // 初始化功能
        const init = {
            keyboardShortcuts() {
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
                                methods.goToPreviousDay();
                                break;
                            case 'ArrowRight':
                                event.preventDefault();
                                methods.goToNextDay();
                                break;
                            case 'Home':
                                event.preventDefault();
                                methods.goToToday();
                                break;
                            case 'PageUp':
                                event.preventDefault();
                                methods.previousMonth();
                                break;
                            case 'PageDown':
                                event.preventDefault();
                                if (!isCurrentMonth.value) {
                                    methods.nextMonth();
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
            },

            responsiveLayout() {
                const updateLayout = () => {
                    const vh = window.innerHeight * 0.01;
                    document.documentElement.style.setProperty('--vh', `${vh}px`);
                };

                updateLayout();
                window.addEventListener('resize', updateLayout);
                window.addEventListener('orientationchange', updateLayout);
            },

            accessibility() {
                document.addEventListener('keydown', (event) => {
                    if (event.key === 'Tab') {
                        document.body.classList.add('keyboard-navigation');
                    }
                });

                document.addEventListener('mousedown', () => {
                    document.body.classList.remove('keyboard-navigation');
                });
            },

            errorHandling() {
                window.addEventListener('error', (event) => {
                    console.error('全局错误:', event.error);
                    methods.showErrorMessage('页面出现错误，请刷新重试');
                });

                window.addEventListener('unhandledrejection', (event) => {
                    console.error('未处理的Promise拒绝:', event.reason);
                    methods.showErrorMessage('网络请求失败，请检查网络连接');
                });
            },

            searchHistory() {
                const savedHistory = localStorage.getItem('newsSearchHistory');
                if (savedHistory) {
                    try {
                        searchHistory.value = JSON.parse(savedHistory);
                    } catch (e) {
                        console.warn('解析搜索历史失败:', e);
                    }
                }
            },

            sidebarState() {
                const savedState = localStorage.getItem('sidebarCollapsed');
                if (savedState !== null) {
                    sidebarCollapsed.value = savedState === 'true';
                }
            },
            handleUrlParams() {
                const urlParams = new URLSearchParams(window.location.search);
                const dateParam = urlParams.get('date');

                if (dateParam) {
                    const date = new Date(dateParam);
                    if (!isNaN(date.getTime())) {
                        // 确保日期时间被重置为0点
                        date.setHours(0, 0, 0, 0);
                        currentDate.value = date;
                        
                        // 更新日历月份以匹配选择的日期
                        const selectedYear = date.getFullYear();
                        const selectedMonth = date.getMonth();
                        calendarMonth.value = new Date(selectedYear, selectedMonth, 1);
                        
                        // 清空搜索和分类筛选
                        searchQuery.value = '';
                        selectedCategories.value.clear();
                        // 显示加载状态并重新加载数据
                        loading.value = true;
                        methods.loadNewsData();
                    } else {
                        console.warn('无效的日期参数:', dateParam);
                    }
                } else {
                    // 如果没有日期参数，更新URL为今天
                    utils.updateUrlParams(currentDate.value);
                }
            },

            handleBrowserHistory() {
                window.addEventListener('popstate', (event) => {
                    const urlParams = new URLSearchParams(window.location.search);
                    const dateParam = urlParams.get('date');
                    
                    if (dateParam) {
                        const date = new Date(dateParam);
                        if (!isNaN(date.getTime())) {
                            // 确保日期时间被重置为0点
                            date.setHours(0, 0, 0, 0);
                            currentDate.value = date;
                            
                            // 更新日历月份以匹配选择的日期
                            const selectedYear = date.getFullYear();
                            const selectedMonth = date.getMonth();
                            calendarMonth.value = new Date(selectedYear, selectedMonth, 1);
                            
                            // 清空搜索和分类筛选
                            searchQuery.value = '';
                            selectedCategories.value.clear();
                            // 显示加载状态并重新加载数据
                            loading.value = true;
                            methods.loadNewsData();
                        }
                    } else {
                        // 如果没有日期参数，回到今天
                        methods.goToToday();
                    }
                });
            }
        };

        // 生命周期
        onMounted(async () => {
            try {
                // 初始化各种功能
                init.keyboardShortcuts();
                init.responsiveLayout();
                init.accessibility();
                init.errorHandling();
                init.searchHistory();
                init.sidebarState();
                init.handleBrowserHistory(); // 添加浏览器历史记录支持
                
                // 处理URL参数
                init.handleUrlParams();
                
                // 加载新闻数据
                await methods.loadNewsData();

            } catch (error) {
                console.error('初始化错误:', error);
                methods.showErrorMessage('页面初始化失败，请刷新重试');
            }
        });

        // 返回公共接口
        return {
            // 响应式数据
            newsData,
            loading,
            error,
            errorMessage,
            searchQuery,
            selectedCategories,
            clickedItems,
            searchHistory,
            categories,
            sidebarCollapsed,
            
            // 计算属性
            hasNewsData,
            categorizedNews,
            displayCategories,
            searchResults,
            currentDateDisplay,
            currentDateSubtitle,
            isToday,
            isFutureDate,
            calendarTitle,
            isCurrentMonth,
            calendarDays,
            
            // 方法
            loadNewsData: methods.loadNewsData,
            handleSearch: methods.handleSearch,
            handleSearchInput: methods.handleSearchInput,
            handleSearchKeydown: methods.handleSearchKeydown,
            toggleCategory: methods.toggleCategory,
            shouldShowCategory: methods.shouldShowCategory,
            isHighlighted: methods.isHighlighted,
            handleNewsClick: methods.handleNewsClick,
            getTimeAgo: utils.formatTimeAgo,
            extractExcerpt: utils.extractExcerpt,
            getDateString: getDateString,
            getCategoryTag: (item) => {
                // 优先显示 item.categories 中的标签
                if (item.categories && item.categories.length > 0) {
                    // 如果 categories 是数组，返回数组
                    if (Array.isArray(item.categories)) {
                        return item.categories;
                    }
                    // 如果 categories 是字符串，返回包含该字符串的数组
                    if (typeof item.categories === 'string') {
                        return [item.categories];
                    }
                }
                
                // 如果没有 categories，则使用自动分类
                const categoryKey = utils.categorizeNewsItem(item);
                const category = CATEGORIES.find(cat => cat.key === categoryKey);
                return category ? [category.title] : ['其他'];
            },
            getNewsType: utils.getNewsSource,
            showErrorMessage: methods.showErrorMessage,
            goToPreviousDay: methods.goToPreviousDay,
            goToNextDay: methods.goToNextDay,
            goToToday: methods.goToToday,
            toggleSidebar: methods.toggleSidebar,
            previousMonth: methods.previousMonth,
            nextMonth: methods.nextMonth,
            selectDate: methods.selectDate,
            clearSearch: methods.clearSearch
        };
    }
};

// 创建并挂载应用
createApp(NewsApp).mount('#app');

