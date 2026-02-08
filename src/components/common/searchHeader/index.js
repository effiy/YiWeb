// 搜索头部组件 - 包含搜索框和分类过滤器
// 作者：liangliang

import { defineComponent } from '/src/utils/componentLoader.js';
import { openAuth as openAuthSettings } from '/src/services/helper/authUtils.js?v=1';

(async function initComponent() {
    try {
        await defineComponent({
            name: 'SearchHeader',
            css: '/src/components/common/searchHeader/index.css',
            html: '/src/components/common/searchHeader/index.html',
            props: {
                searchQuery: {
                    type: String,
                    default: ''
                },
                // 分类列表
                categories: {
                    type: Array,
                    default: () => []
                },
                // 选中的分类
                selectedCategories: {
                    type: Set,
                    default: () => new Set()
                },
                // 当前激活的分类
                activeCategory: {
                    type: String,
                    default: 'all'
                },
                // 原始数据源，用于生成搜索建议
                originalData: {
                    type: Array,
                    default: () => []
                },
                // 侧边栏折叠状态
                sidebarCollapsed: {
                    type: Boolean,
                    default: false
                }
            },
            emits: ['update:searchQuery', 'search-keydown', 'clear-search', 'toggle-category', 'filter-change', 'toggle-sidebar', 'open-rss-manager'],
            data() {
                return {
                    // 搜索建议相关
                    showSuggestions: false,
                    searchSuggestions: [],
                    selectedSuggestionIndex: -1,
                    // 实时过滤相关
                    isFiltering: false,
                    filterTimeout: null
                };
            },
            computed: {
                /**
                 * 生成搜索建议
                 */
                computedSearchSuggestions() {
                    if (!this.searchQuery || this.searchQuery.length < 1) {
                        return [];
                    }

                    const query = this.searchQuery.toLowerCase();
                    const suggestions = new Set();

                    // 从原始数据中提取搜索建议
                    this.originalData.forEach(item => {
                        // 提取标题关键词
                        if (item.title) {
                            const titleWords = item.title.split(/[\s,，。.、]+/);
                            titleWords.forEach(word => {
                                if (word.toLowerCase().includes(query) && word.length > 1) {
                                    suggestions.add(word);
                                }
                            });
                        }

                        // 提取内容关键词
                        if (item.content) {
                            const contentWords = item.content.split(/[\s,，。.、]+/);
                            contentWords.forEach(word => {
                                if (word.toLowerCase().includes(query) && word.length > 1) {
                                    suggestions.add(word);
                                }
                            });
                        }

                        // 提取分类关键词
                        if (item.categories) {
                            const categories = Array.isArray(item.categories) ? item.categories : [item.categories];
                            categories.forEach(cat => {
                                if (cat.toLowerCase().includes(query) && cat.length > 1) {
                                    suggestions.add(cat);
                                }
                            });
                        }

                        // 提取链接关键词
                        if (item.link) {
                            const linkWords = item.link.split(/[\s,，。.、\/]+/);
                            linkWords.forEach(word => {
                                if (word.toLowerCase().includes(query) && word.length > 1) {
                                    suggestions.add(word);
                                }
                            });
                        }
                    });

                    return Array.from(suggestions).slice(0, 8);
                },

                /**
                 * 是否有搜索建议
                 */
                hasSuggestions() {
                    return this.computedSearchSuggestions.length > 0;
                }
            },
            methods: {
                goHome() {
                    window.location.href = '/';
                },

                /**
                 * 处理搜索输入
                 * @param {Event} event - 输入事件
                 */
                handleSearchInput(event) {
                    const value = event.target.value;
                    this.$emit('update:searchQuery', value);
                    
                    // 显示搜索建议
                    this.showSuggestions = value.length > 0;
                    this.selectedSuggestionIndex = -1;
                    
                    // 触发实时过滤
                    this.triggerRealTimeFilter(value);
                },

                /**
                 * 触发实时过滤
                 * @param {string} query - 搜索查询
                 */
                triggerRealTimeFilter(query) {
                    // 清除之前的定时器
                    if (this.filterTimeout) {
                        clearTimeout(this.filterTimeout);
                    }

                    // 设置新的定时器，延迟300ms执行过滤
                    this.filterTimeout = setTimeout(() => {
                        this.isFiltering = true;
                        
                        // 触发过滤事件
                        this.$emit('filter-change', {
                            query: query,
                            suggestions: this.computedSearchSuggestions,
                            timestamp: Date.now()
                        });

                        this.isFiltering = false;
                    }, 300);
                },

                /**
                 * 处理搜索建议点击
                 * @param {string} suggestion - 搜索建议
                 */
                handleSuggestionClick(suggestion) {
                    this.$emit('update:searchQuery', suggestion);
                    this.showSuggestions = false;
                    this.triggerRealTimeFilter(suggestion);
                },

                /**
                 * 处理键盘导航
                 * @param {KeyboardEvent} event - 键盘事件
                 */
                handleKeydown(event) {
                    if (!this.showSuggestions) {
                        this.$emit('search-keydown', event);
                        return;
                    }

                    switch (event.key) {
                        case 'ArrowDown':
                            event.preventDefault();
                            this.selectedSuggestionIndex = Math.min(
                                this.selectedSuggestionIndex + 1,
                                this.computedSearchSuggestions.length - 1
                            );
                            break;
                        case 'ArrowUp':
                            event.preventDefault();
                            this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, -1);
                            break;
                        case 'Enter':
                            event.preventDefault();
                            if (this.selectedSuggestionIndex >= 0) {
                                const suggestion = this.computedSearchSuggestions[this.selectedSuggestionIndex];
                                this.handleSuggestionClick(suggestion);
                            } else {
                                this.$emit('search-keydown', event);
                            }
                            break;
                        case 'Escape':
                            event.preventDefault();
                            this.showSuggestions = false;
                            this.selectedSuggestionIndex = -1;
                            break;
                        default:
                            this.$emit('search-keydown', event);
                    }
                },

                /**
                 * 清除搜索
                 */
                handleClearSearch() {
                    this.$emit('update:searchQuery', '');
                    this.showSuggestions = false;
                    this.selectedSuggestionIndex = -1;
                    this.$emit('clear-search');
                },

                /**
                 * 处理搜索框失去焦点
                 */
                handleSearchBlur() {
                    // 延迟隐藏建议，避免点击建议时立即隐藏
                    setTimeout(() => {
                        this.showSuggestions = false;
                        this.selectedSuggestionIndex = -1;
                    }, 200);
                },

                /**
                 * 处理搜索框获得焦点
                 */
                handleSearchFocus() {
                    if (this.searchQuery && this.searchQuery.length > 0) {
                        this.showSuggestions = true;
                    }
                },

                /**
                 * 处理侧边栏折叠
                 */
                handleToggleSidebar() {
                    this.$emit('toggle-sidebar');
                },

                openLink(url) {
                    if (!url) return;
                    if (/^https?:\/\//.test(url)) {
                        window.open(url, '_blank', 'noopener,noreferrer');
                    } else {
                        window.location.href = url;
                    }
                },

                openAuth(event) {
                    try {
                        openAuthSettings(event);
                        return;
                    } catch (_) { }
                    try {
                        if (typeof window.openAuth === 'function') {
                            window.openAuth(event);
                        }
                    } catch (_) { }
                }
            }
        });
        
        // 触发自定义事件，通知组件已加载完成
        if (window.SearchHeader) {
            window.dispatchEvent(new CustomEvent('SearchHeaderLoaded', { detail: window.SearchHeader }));
        }
    } catch (error) {
        console.error('SearchHeader 组件初始化失败:', error);
    }
})();
