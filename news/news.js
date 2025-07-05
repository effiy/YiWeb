// Vue3 新闻页面应用
const { createApp, ref, computed, onMounted, nextTick } = Vue;

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

        // API配置
        const apiUrl = 'https://api.effiy.cn/mongodb/?cname=rss&isoDate=2025-07-03,2025-07-03';

        // 分类配置
        const categories = ref([
            { key: 'data', icon: 'fas fa-chart-line', title: '数据分析' },
            { key: 'code', icon: 'fas fa-code', title: '代码开发' },
            { key: 'ai', icon: 'fas fa-robot', title: 'AI技术' },
            { key: 'tech', icon: 'fas fa-microchip', title: '科技产品' },
            { key: 'business', icon: 'fas fa-briefcase', title: '商业资讯' },
            { key: 'other', icon: 'fas fa-ellipsis-h', title: '其他' }
        ]);

        // 计算属性
        const hasNewsData = computed(() => newsData.value.length > 0);

        const categorizedNews = computed(() => {
            const categories = {
                'ai': { icon: 'fas fa-robot', title: 'AI 技术', news: [] },
                'data': { icon: 'fas fa-chart-line', title: '数据分析', news: [] },
                'code': { icon: 'fas fa-code', title: '代码开发', news: [] },
                'tech': { icon: 'fas fa-microchip', title: '科技产品', news: [] },
                'business': { icon: 'fas fa-briefcase', title: '商业资讯', news: [] },
                'other': { icon: 'fas fa-ellipsis-h', title: '其他', news: [] }
            };

            newsData.value.forEach(item => {
                const title = item.title.toLowerCase();
                const content = item.content.toLowerCase();
                
                if (title.includes('ai') || title.includes('人工智能') || title.includes('gpt') || 
                    content.includes('ai') || content.includes('人工智能') || content.includes('gpt')) {
                    categories.ai.news.push(item);
                } else if (title.includes('数据') || title.includes('分析') || title.includes('统计') ||
                           content.includes('数据') || content.includes('分析') || content.includes('统计')) {
                    categories.data.news.push(item);
                } else if (title.includes('代码') || title.includes('开发') || title.includes('编程') ||
                           content.includes('代码') || content.includes('开发') || content.includes('编程')) {
                    categories.code.news.push(item);
                } else if (title.includes('产品') || title.includes('手机') || title.includes('芯片') ||
                           content.includes('产品') || content.includes('手机') || content.includes('芯片')) {
                    categories.tech.news.push(item);
                } else if (title.includes('商业') || title.includes('投资') || title.includes('市场') ||
                           content.includes('商业') || content.includes('投资') || content.includes('市场')) {
                    categories.business.news.push(item);
                } else {
                    categories.other.news.push(item);
                }
            });

            return categories;
        });

        const displayCategories = computed(() => {
            if (!searchQuery.value) {
                return categorizedNews.value;
            }

            const filteredCategories = {};
            Object.entries(categorizedNews.value).forEach(([key, category]) => {
                const filteredNews = category.news.filter(item => {
                    const title = item.title.toLowerCase();
                    const excerpt = extractExcerpt(item).toLowerCase();
                    const categoryTag = getCategoryTag(item).toLowerCase();
                    return title.includes(searchQuery.value.toLowerCase()) || 
                           excerpt.includes(searchQuery.value.toLowerCase()) || 
                           categoryTag.includes(searchQuery.value.toLowerCase());
                });

                if (filteredNews.length > 0) {
                    filteredCategories[key] = {
                        ...category,
                        news: filteredNews
                    };
                }
            });

            return filteredCategories;
        });

        const searchResults = computed(() => {
            if (!searchQuery.value) return [];
            
            const results = [];
            Object.values(displayCategories.value).forEach(category => {
                results.push(...category.news);
            });
            return results;
        });

        // 方法
        const loadNewsData = async () => {
            loading.value = true;
            error.value = null;
            errorMessage.value = '';

            try {
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                if (data.status === 200 && data.data && data.data.list) {
                    newsData.value = data.data.list;
                } else {
                    throw new Error('Invalid data format');
                }
            } catch (err) {
                console.error('Failed to load news data:', err);
                error.value = '加载新闻数据失败，请稍后重试';
                errorMessage.value = error.value;
            } finally {
                loading.value = false;
            }
        };

        const handleSearch = (event) => {
            const query = event.target.value.toLowerCase().trim();
            searchQuery.value = query;
            
            // 搜索逻辑已在计算属性中处理
            if (query && !searchHistory.value.includes(query)) {
                searchHistory.value.unshift(query);
                searchHistory.value = searchHistory.value.slice(0, 10); // 保留最近10个
                localStorage.setItem('newsSearchHistory', JSON.stringify(searchHistory.value));
            }
        };

        const handleSearchKeydown = (event) => {
            if (event.key === 'Escape') {
                event.target.value = '';
                searchQuery.value = '';
            }
        };

        const toggleCategory = (category) => {
            if (selectedCategories.value.has(category)) {
                selectedCategories.value.delete(category);
            } else {
                selectedCategories.value.add(category);
            }
        };

        const shouldShowCategory = (categoryKey) => {
            if (selectedCategories.value.size === 0) {
                return true; // 显示所有分类
            }
            return selectedCategories.value.has(categoryKey);
        };

        const isHighlighted = (item) => {
            if (!searchQuery.value) return false;
            
            const title = item.title.toLowerCase();
            const excerpt = extractExcerpt(item).toLowerCase();
            const categoryTag = getCategoryTag(item).toLowerCase();
            const query = searchQuery.value.toLowerCase();
            
            return title.includes(query) || excerpt.includes(query) || categoryTag.includes(query);
        };

        const handleNewsClick = (item) => {
            const itemKey = item.link || item.title;
            clickedItems.value.add(itemKey);
            
            // 添加点击动画效果
            setTimeout(() => {
                clickedItems.value.delete(itemKey);
            }, 300);

            // 如果有链接，在新窗口打开
            if (item.link) {
                window.open(item.link, '_blank', 'noopener,noreferrer');
            }
        };

        const getTimeAgo = (item) => {
            const pubDate = new Date(item.pubDate || item.isoDate);
            const now = new Date();
            const diffInSeconds = Math.floor((now - pubDate) / 1000);

            if (diffInSeconds < 60) {
                return '刚刚';
            } else if (diffInSeconds < 3600) {
                return `${Math.floor(diffInSeconds / 60)}分钟前`;
            } else if (diffInSeconds < 86400) {
                return `${Math.floor(diffInSeconds / 3600)}小时前`;
            } else if (diffInSeconds < 2592000) {
                return `${Math.floor(diffInSeconds / 86400)}天前`;
            } else {
                return pubDate.toLocaleDateString('zh-CN');
            }
        };

        const extractExcerpt = (item, maxLength = 100) => {
            const content = item.content || item.description || '';
            const text = content.replace(/<[^>]*>/g, '').trim();
            return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
        };

        const getCategoryTag = (item) => {
            const title = item.title.toLowerCase();
            const content = item.content.toLowerCase();
            
            if (title.includes('ai') || title.includes('人工智能') || title.includes('gpt') || 
                content.includes('ai') || content.includes('人工智能') || content.includes('gpt')) {
                return 'AI技术';
            } else if (title.includes('数据') || title.includes('分析') || title.includes('统计') ||
                       content.includes('数据') || content.includes('分析') || content.includes('统计')) {
                return '数据分析';
            } else if (title.includes('代码') || title.includes('开发') || title.includes('编程') ||
                       content.includes('代码') || content.includes('开发') || content.includes('编程')) {
                return '代码开发';
            } else if (title.includes('产品') || title.includes('手机') || title.includes('芯片') ||
                       content.includes('产品') || content.includes('手机') || content.includes('芯片')) {
                return '科技产品';
            } else if (title.includes('商业') || title.includes('投资') || title.includes('市场') ||
                       content.includes('商业') || content.includes('投资') || content.includes('市场')) {
                return '商业资讯';
            } else {
                return '其他';
            }
        };

        const getNewsType = (item) => {
            const source = item.source || '';
            const title = item.title.toLowerCase();
            
            if (source.includes('36氪') || title.includes('36氪')) {
                return '36氪';
            } else if (source.includes('虎嗅') || title.includes('虎嗅')) {
                return '虎嗅';
            } else if (source.includes('钛媒体') || title.includes('钛媒体')) {
                return '钛媒体';
            } else if (source.includes('爱范儿') || title.includes('爱范儿')) {
                return '爱范儿';
            } else if (source.includes('极客公园') || title.includes('极客公园')) {
                return '极客公园';
            } else {
                return source || '未知来源';
            }
        };

        const showErrorMessage = (message) => {
            error.value = message;
            errorMessage.value = message;
            setTimeout(() => {
                error.value = null;
                errorMessage.value = '';
            }, 5000);
        };

        const initKeyboardShortcuts = () => {
            document.addEventListener('keydown', (event) => {
                // Ctrl+K 聚焦搜索框
                if (event.ctrlKey && event.key === 'k') {
                    event.preventDefault();
                    const searchInput = document.getElementById('messageInput');
                    if (searchInput) {
                        searchInput.focus();
                    }
                }
                
                // Escape 清除搜索
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

        const debounce = (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        };

        const initAccessibility = () => {
            // 添加键盘导航支持
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Tab') {
                    // 确保焦点可见
                    document.body.classList.add('keyboard-navigation');
                }
            });

            document.addEventListener('mousedown', () => {
                document.body.classList.remove('keyboard-navigation');
            });
        };

        const handleErrors = () => {
            window.addEventListener('error', (event) => {
                console.error('Global error:', event.error);
                showErrorMessage('页面出现错误，请刷新重试');
            });

            window.addEventListener('unhandledrejection', (event) => {
                console.error('Unhandled promise rejection:', event.reason);
                showErrorMessage('网络请求失败，请检查网络连接');
            });
        };

        // 生命周期
        onMounted(async () => {
            try {
                // 初始化各种功能
                initKeyboardShortcuts();
                initResponsiveLayout();
                initAccessibility();
                handleErrors();

                // 绑定搜索事件
                const searchInput = document.getElementById('messageInput');
                if (searchInput) {
                    searchInput.addEventListener('input', handleSearch);
                    searchInput.addEventListener('keydown', handleSearchKeydown);
                }

                // 加载搜索历史
                const savedHistory = localStorage.getItem('newsSearchHistory');
                if (savedHistory) {
                    try {
                        searchHistory.value = JSON.parse(savedHistory);
                    } catch (e) {
                        console.warn('Failed to parse search history:', e);
                    }
                }

                // 加载新闻数据
                await loadNewsData();

            } catch (error) {
                console.error('Initialization error:', error);
                showErrorMessage('页面初始化失败，请刷新重试');
            }
        });

        return {
            // 数据
            newsData,
            loading,
            error,
            errorMessage,
            searchQuery,
            selectedCategories,
            clickedItems,
            searchHistory,
            categories,
            
            // 计算属性
            hasNewsData,
            categorizedNews,
            displayCategories,
            searchResults,
            
            // 方法
            loadNewsData,
            handleSearch,
            handleSearchKeydown,
            toggleCategory,
            shouldShowCategory,
            isHighlighted,
            handleNewsClick,
            getTimeAgo,
            extractExcerpt,
            getCategoryTag,
            getNewsType,
            showErrorMessage
        };
    }
};

// 创建并挂载应用
createApp(NewsApp).mount('#app'); 