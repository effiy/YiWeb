// 新闻列表组件 - 负责新闻内容的展示

const NewsList = {
    name: 'NewsList',
    props: {
        loading: {
            type: Boolean,
            default: false
        },
        error: {
            type: String,
            default: ''
        },
        currentDateDisplay: {
            type: String,
            default: ''
        },
        searchQuery: {
            type: String,
            default: ''
        },
        searchResults: {
            type: Array,
            default: () => []
        },
        displayCategories: {
            type: Object,
            default: () => ({})
        },
        selectedCategories: {
            type: Set,
            default: () => new Set()
        },
        clickedItems: {
            type: Set,
            default: () => new Set()
        },
        hasNewsData: {
            type: Boolean,
            default: false
        }
    },
    emits: ['load-news-data', 'news-click'],
    methods: {
        // 检查是否应该显示某个分类
        shouldShowCategory(categoryKey) {
            return this.selectedCategories.size === 0 || this.selectedCategories.has(categoryKey);
        },
        
        // 检查新闻项是否高亮
        isHighlighted(item) {
            if (!this.searchQuery) return false;
            const query = this.searchQuery.toLowerCase();
            return item.title.toLowerCase().includes(query) || 
                   (item.content && item.content.toLowerCase().includes(query));
        },
        
        // 获取分类标签
        getCategoryTag(item) {
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
            const CATEGORIES = [
                { key: 'ai', title: 'AI技术' },
                { key: 'data', title: '数据分析' },
                { key: 'code', title: '代码开发' },
                { key: 'tech', title: '科技产品' },
                { key: 'business', title: '商业资讯' },
                { key: 'other', title: '其他' }
            ];
            
            // 简单的分类逻辑
            const title = item.title.toLowerCase();
            const content = (item.content || '').toLowerCase();
            
            if (title.includes('ai') || title.includes('人工智能') || content.includes('ai')) {
                return ['AI技术'];
            }
            if (title.includes('数据') || title.includes('分析') || content.includes('数据')) {
                return ['数据分析'];
            }
            if (title.includes('代码') || title.includes('开发') || title.includes('编程')) {
                return ['代码开发'];
            }
            if (title.includes('产品') || title.includes('手机') || title.includes('芯片')) {
                return ['科技产品'];
            }
            if (title.includes('商业') || title.includes('投资') || title.includes('融资')) {
                return ['商业资讯'];
            }
            
            return ['其他'];
        },
        
        // 获取时间差显示
        getTimeAgo(isoDate) {
            if (!isoDate) return '未知时间';
            const now = new Date();
            const date = new Date(isoDate);
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            
            if (minutes < 1) return '刚刚';
            if (minutes < 60) return `${minutes}分钟前`;
            if (hours < 24) return `${hours}小时前`;
            return `${days}天前`;
        },
        
        // 提取新闻摘要
        extractExcerpt(item) {
            if (item.excerpt) return item.excerpt;
            if (item.content) {
                return item.content.substring(0, 150) + '...';
            }
            return '暂无摘要';
        },
        
        // 处理新闻点击
        handleNewsClick(item) {
            this.$emit('news-click', item);
        }
    },
    template: `
        <section class="news-section" aria-label="新闻内容">
            <!-- 加载状态 -->
            <div v-if="loading" class="loading-container" role="status" aria-live="polite">
                <div class="loading-spinner" aria-hidden="true"></div>
                <div class="loading-text">正在加载新闻数据...</div>
                <div class="loading-subtext">正在获取 {{ currentDateDisplay }} 的新闻资讯</div>
            </div>

            <!-- 错误状态 -->
            <div v-else-if="error" class="error-container" role="alert">
                <div class="error-icon" aria-hidden="true">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="error-message">{{ error }}</div>
                <div class="error-submessage">网络连接可能存在问题，请检查后重试</div>
                <button @click="$emit('load-news-data')" class="retry-button">
                    <i class="fas fa-redo"></i>
                    重新加载
                </button>
            </div>

            <!-- 搜索结果显示 -->
            <div v-else-if="searchQuery && searchResults.length > 0" class="search-results">
                <header class="search-results-header">
                    <span class="search-results-count">找到 {{ searchResults.length }} 条相关新闻</span>
                    <span class="search-query">"{{ searchQuery }}"</span>
                </header>
                
                <div class="news-grid" role="list">
                    <article 
                        v-for="item in searchResults" 
                        :key="item.link || item.title"
                        @click="handleNewsClick(item)"
                        :class="['news-item', { 
                            highlighted: isHighlighted(item),
                            clicked: clickedItems.has(item.link || item.title)
                        }]"
                        :title="item.title"
                        role="listitem"
                    >
                        <header class="news-header">
                            <h3 class="news-title">{{ item.title }}</h3>
                        </header>
                        
                        <div class="news-meta">
                            <div class="news-category-tags">
                                <span 
                                    v-for="tag in getCategoryTag(item)" 
                                    :key="tag"
                                    class="news-category-tag"
                                >
                                    {{ tag }}
                                </span>
                            </div>
                            <time class="news-time" :datetime="item.isoDate">
                                <i class="fas fa-clock"></i>
                                <span>{{ getTimeAgo(item.isoDate) }}</span>
                            </time>
                        </div>
                        
                        <div class="news-excerpt">{{ extractExcerpt(item) }}</div>
                        
                        <footer class="news-footer">
                            <div class="news-source">
                                <i class="fas fa-newspaper"></i>
                                <span>{{ item.creator || '未知来源' }}</span>
                            </div>
                            <div v-if="item.link" class="news-link">
                                <span>阅读原文</span>
                                <i class="fas fa-external-link-alt"></i>
                            </div>
                        </footer>
                    </article>
                </div>
            </div>

            <!-- 空搜索结果 -->
            <div v-else-if="searchQuery && searchResults.length === 0" class="empty-state" role="status">
                <div class="empty-icon" aria-hidden="true">
                    <i class="fas fa-search"></i>
                </div>
                <div class="empty-title">未找到相关新闻</div>
                <div class="empty-subtitle">尝试使用其他关键词搜索</div>
            </div>

            <!-- 分类新闻显示 -->
            <div v-else-if="hasNewsData">
                <section 
                    v-for="(category, categoryKey) in displayCategories" 
                    :key="categoryKey"
                    v-show="shouldShowCategory(categoryKey) && category.news.length > 0"
                    class="news-category"
                    :aria-label="\`\${category.title || categoryKey}分类新闻\`"
                >
                    <div class="news-grid" role="list">
                        <article 
                            v-for="item in category.news" 
                            :key="item.link || item.title"
                            @click="handleNewsClick(item)"
                            :class="['news-item', { 
                                highlighted: isHighlighted(item),
                                clicked: clickedItems.has(item.link || item.title)
                            }]"
                            :title="item.title"
                            role="listitem"
                        >
                            <header class="news-header">
                                <h3 class="news-title">{{ item.title }}</h3>
                            </header>
                            
                            <div class="news-meta">
                                <div class="news-category-tags">
                                    <span 
                                        v-for="tag in getCategoryTag(item)" 
                                        :key="tag"
                                        class="news-category-tag"
                                    >
                                        {{ tag }}
                                    </span>
                                </div>
                                <time class="news-time" :datetime="item.isoDate">
                                    <i class="fas fa-clock"></i>
                                    <span>{{ getTimeAgo(item.isoDate) }}</span>
                                </time>
                            </div>
                            
                            <div class="news-excerpt">{{ extractExcerpt(item) }}</div>
                            
                            <footer class="news-footer">
                                <div class="news-source">
                                    <i class="fas fa-newspaper"></i>
                                    <span>{{ item.creator || '未知来源' }}</span>
                                </div>
                                <div v-if="item.link" class="news-link">
                                    <span>阅读原文</span>
                                    <i class="fas fa-external-link-alt"></i>
                                </div>
                            </footer>
                        </article>
                    </div>
                </section>
            </div>

            <!-- 空状态 -->
            <div v-else class="empty-state" role="status">
                <div class="empty-icon" aria-hidden="true">
                    <i class="fas fa-newspaper"></i>
                </div>
                <div class="empty-title">暂无新闻数据</div>
                <div class="empty-subtitle">请稍后重试或联系管理员</div>
            </div>
        </section>
    `
};

// 全局暴露组件
window.NewsList = NewsList; 
