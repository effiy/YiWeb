/**
 * 组件管理类
 * @author liangliang
 * @version 1.0.0
 */

/**
 * 组件管理类
 */
export class ComponentManager {
    constructor() {
        this.components = new Map();
        this.loadedComponents = new Set();
        this.componentCache = new Map();
        this.loadingPromises = new Map();
    }

    /**
     * 注册组件
     */
    registerComponent(name, component) {
        this.components.set(name, component);
        console.log(`组件注册成功: ${name}`);
    }

    /**
     * 注册多个组件
     */
    async registerComponents(componentNames) {
        const promises = componentNames.map(name => this.registerComponentByName(name));
        await Promise.all(promises);
    }

    /**
     * 根据名称注册组件
     */
    async registerComponentByName(name) {
        try {
            // 动态导入组件
            const component = await this.loadComponent(name);
            this.registerComponent(name, component);
            return component;
        } catch (error) {
            console.error(`组件加载失败: ${name}`, error);
            throw error;
        }
    }

    /**
     * 加载组件
     */
    async loadComponent(name) {
        // 检查缓存
        if (this.componentCache.has(name)) {
            return this.componentCache.get(name);
        }

        // 检查是否正在加载
        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }

        // 创建加载Promise
        const loadPromise = this.createComponent(name);
        this.loadingPromises.set(name, loadPromise);

        try {
            const component = await loadPromise;
            this.componentCache.set(name, component);
            this.loadingPromises.delete(name);
            return component;
        } catch (error) {
            this.loadingPromises.delete(name);
            throw error;
        }
    }

    /**
     * 创建组件
     */
    async createComponent(name) {
        // 根据组件名称创建对应的组件
        switch (name) {
            case 'SearchHeader':
                return this.createSearchHeader();
            case 'FeatureCards':
                return this.createFeatureCards();
            case 'NewsList':
                return this.createNewsList();
            case 'Shortcuts':
                return this.createShortcuts();
            case 'Calendar':
                return this.createCalendar();
            case 'Sidebar':
                return this.createSidebar();
            default:
                throw new Error(`未知组件: ${name}`);
        }
    }

    /**
     * 创建搜索头部组件
     */
    createSearchHeader() {
        return {
            name: 'SearchHeader',
            template: `
                <header class="header-row" role="banner">
                    <div class="search-row">
                        <div class="search-box" role="search">
                            <div class="search-logo" aria-hidden="true">
                                <i class="fas fa-brain" aria-label="AI大脑图标"></i>
                            </div>
                            <div class="search-input-wrapper">
                                <textarea 
                                    id="messageInput" 
                                    placeholder="我可以帮助您分析数据、编写代码、生图创造..." 
                                    rows="1" 
                                    maxlength="2000"
                                    aria-label="消息输入框"
                                    aria-describedby="category-filters"
                                    autocomplete="off"
                                    spellcheck="false"></textarea>
                            </div>
                        </div>
                        <div class="category-filters" id="category-filters" role="toolbar" aria-label="功能分类过滤器">
                            <div class="filter-buttons">
                                <button class="filter-btn" role="button" tabindex="0" aria-label="快捷键">
                                    <i class="fas fa-keyboard" aria-hidden="true"></i>
                                    <span>快捷键</span>
                                </button>
                                <button class="filter-btn" role="button" tabindex="0" aria-label="新闻博客">
                                    <i class="fas fa-newspaper" aria-hidden="true"></i>
                                    <span>新闻博客</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>
            `,
            methods: {
                init() {
                    this.bindEvents();
                },
                bindEvents() {
                    const searchInput = document.getElementById('messageInput');
                    if (searchInput) {
                        searchInput.addEventListener('input', this.handleInput.bind(this));
                        searchInput.addEventListener('keydown', this.handleKeydown.bind(this));
                    }
                },
                handleInput(event) {
                    // 处理输入事件
                    const value = event.target.value;
                    // 触发搜索事件
                    this.emit('search:input', value);
                },
                handleKeydown(event) {
                    if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        const value = event.target.value;
                        this.emit('search:submit', value);
                    }
                },
                emit(event, data) {
                    // 触发自定义事件
                    const customEvent = new CustomEvent(event, { detail: data });
                    document.dispatchEvent(customEvent);
                }
            }
        };
    }

    /**
     * 创建功能卡片组件
     */
    createFeatureCards() {
        return {
            name: 'FeatureCards',
            template: `
                <div class="feature-cards-container">
                    <div class="feature-cards-grid" role="grid" aria-label="功能卡片网格">
                        <div role="row">
                            <article class="feature-card scientist-card" data-feature="数据分析" role="gridcell">
                                <div class="card-header">
                                    <div class="card-icon" aria-hidden="true">
                                        <i class="fas fa-chart-line" aria-label="数据分析图标"></i>
                                    </div>
                                    <div class="card-badge">数据分析</div>
                                </div>
                                <div class="card-content">
                                    <h3 class="card-title"><i class="fas fa-microscope" aria-hidden="true"></i> 智能数据分析</h3>
                                    <p class="card-description">运用先进的AI算法，将海量数据转化为精准洞察。</p>
                                </div>
                                <div class="card-footer">
                                    <span class="card-hint">🧪 上传数据开始智能分析</span>
                                    <i class="fas fa-flask" aria-hidden="true"></i>
                                </div>
                            </article>
                        </div>
                    </div>
                </div>
            `,
            methods: {
                init() {
                    this.bindEvents();
                },
                bindEvents() {
                    const cards = document.querySelectorAll('.feature-card');
                    cards.forEach(card => {
                        card.addEventListener('click', this.handleCardClick.bind(this));
                        card.addEventListener('keydown', this.handleCardKeydown.bind(this));
                    });
                },
                handleCardClick(event) {
                    const feature = event.currentTarget.dataset.feature;
                    this.emit('card:click', feature);
                },
                handleCardKeydown(event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        const feature = event.currentTarget.dataset.feature;
                        this.emit('card:click', feature);
                    }
                },
                emit(event, data) {
                    const customEvent = new CustomEvent(event, { detail: data });
                    document.dispatchEvent(customEvent);
                }
            }
        };
    }

    /**
     * 创建新闻列表组件
     */
    createNewsList() {
        return {
            name: 'NewsList',
            template: `
                <div class="news-list-container">
                    <div class="news-list" role="list" aria-label="新闻列表">
                        <!-- 新闻项目将通过JavaScript动态生成 -->
                    </div>
                </div>
            `,
            methods: {
                init() {
                    this.loadNews();
                },
                async loadNews() {
                    try {
                        // 模拟加载新闻数据
                        const news = await this.fetchNews();
                        this.renderNews(news);
                    } catch (error) {
                        console.error('加载新闻失败:', error);
                    }
                },
                async fetchNews() {
                    // 模拟API调用
                    return new Promise(resolve => {
                        setTimeout(() => {
                            resolve([
                                {
                                    id: 1,
                                    title: 'AI技术最新发展',
                                    content: '人工智能技术正在快速发展...',
                                    date: new Date()
                                }
                            ]);
                        }, 1000);
                    });
                },
                renderNews(news) {
                    const container = document.querySelector('.news-list');
                    if (container) {
                        container.innerHTML = news.map(item => `
                            <div class="news-item" role="listitem">
                                <h3>${item.title}</h3>
                                <p>${item.content}</p>
                                <time>${item.date.toLocaleDateString()}</time>
                            </div>
                        `).join('');
                    }
                }
            }
        };
    }

    /**
     * 创建快捷键组件
     */
    createShortcuts() {
        return {
            name: 'Shortcuts',
            template: `
                <div class="shortcuts-container">
                    <div class="shortcuts-grid" role="grid" aria-label="快捷键网格">
                        <!-- 快捷键将通过JavaScript动态生成 -->
                    </div>
                </div>
            `,
            methods: {
                init() {
                    this.loadShortcuts();
                },
                loadShortcuts() {
                    const shortcuts = [
                        { key: 'Ctrl+K', action: '聚焦搜索框' },
                        { key: 'Ctrl+N', action: '打开新闻页面' },
                        { key: 'Ctrl+S', action: '打开快捷键页面' }
                    ];
                    this.renderShortcuts(shortcuts);
                },
                renderShortcuts(shortcuts) {
                    const container = document.querySelector('.shortcuts-grid');
                    if (container) {
                        container.innerHTML = shortcuts.map(item => `
                            <div class="shortcut-item" role="gridcell">
                                <kbd>${item.key}</kbd>
                                <span>${item.action}</span>
                            </div>
                        `).join('');
                    }
                }
            }
        };
    }

    /**
     * 创建日历组件
     */
    createCalendar() {
        return {
            name: 'Calendar',
            template: `
                <div class="calendar-container">
                    <div class="calendar-header">
                        <button class="calendar-nav prev" aria-label="上个月">‹</button>
                        <h2 class="calendar-title"></h2>
                        <button class="calendar-nav next" aria-label="下个月">›</button>
                    </div>
                    <div class="calendar-body">
                        <div class="calendar-grid" role="grid" aria-label="日历网格">
                            <!-- 日历内容将通过JavaScript动态生成 -->
                        </div>
                    </div>
                </div>
            `,
            methods: {
                init() {
                    this.currentDate = new Date();
                    this.renderCalendar();
                    this.bindEvents();
                },
                renderCalendar() {
                    this.updateTitle();
                    this.renderDays();
                },
                updateTitle() {
                    const title = document.querySelector('.calendar-title');
                    if (title) {
                        title.textContent = this.currentDate.toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: 'long'
                        });
                    }
                },
                renderDays() {
                    // 实现日历渲染逻辑
                },
                bindEvents() {
                    const prevBtn = document.querySelector('.calendar-nav.prev');
                    const nextBtn = document.querySelector('.calendar-nav.next');
                    
                    if (prevBtn) {
                        prevBtn.addEventListener('click', this.previousMonth.bind(this));
                    }
                    if (nextBtn) {
                        nextBtn.addEventListener('click', this.nextMonth.bind(this));
                    }
                },
                previousMonth() {
                    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                    this.renderCalendar();
                },
                nextMonth() {
                    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                    this.renderCalendar();
                }
            }
        };
    }

    /**
     * 创建侧边栏组件
     */
    createSidebar() {
        return {
            name: 'Sidebar',
            template: `
                <aside class="sidebar" role="complementary" aria-label="侧边栏">
                    <div class="sidebar-header">
                        <h3>导航菜单</h3>
                        <button class="sidebar-close" aria-label="关闭侧边栏">×</button>
                    </div>
                    <nav class="sidebar-nav" role="navigation">
                        <ul class="sidebar-menu">
                            <li><a href="/" class="sidebar-link">首页</a></li>
                            <li><a href="/news" class="sidebar-link">新闻</a></li>
                            <li><a href="/shortcuts" class="sidebar-link">快捷键</a></li>
                            <li><a href="/settings" class="sidebar-link">设置</a></li>
                        </ul>
                    </nav>
                </aside>
            `,
            methods: {
                init() {
                    this.bindEvents();
                },
                bindEvents() {
                    const closeBtn = document.querySelector('.sidebar-close');
                    if (closeBtn) {
                        closeBtn.addEventListener('click', this.close.bind(this));
                    }
                },
                open() {
                    const sidebar = document.querySelector('.sidebar');
                    if (sidebar) {
                        sidebar.classList.add('open');
                    }
                },
                close() {
                    const sidebar = document.querySelector('.sidebar');
                    if (sidebar) {
                        sidebar.classList.remove('open');
                    }
                }
            }
        };
    }

    /**
     * 初始化组件
     */
    async initialize() {
        const promises = Array.from(this.components.keys()).map(name => {
            return this.initializeComponent(name);
        });
        
        await Promise.all(promises);
        console.log('所有组件初始化完成');
    }

    /**
     * 初始化单个组件
     */
    async initializeComponent(name) {
        try {
            const component = this.components.get(name);
            if (component && component.methods && component.methods.init) {
                await component.methods.init();
                this.loadedComponents.add(name);
                console.log(`组件初始化完成: ${name}`);
            }
        } catch (error) {
            console.error(`组件初始化失败: ${name}`, error);
        }
    }

    /**
     * 获取组件
     */
    getComponent(name) {
        return this.components.get(name);
    }

    /**
     * 检查组件是否已加载
     */
    isComponentLoaded(name) {
        return this.loadedComponents.has(name);
    }

    /**
     * 获取组件状态
     */
    getStatus() {
        return {
            totalComponents: this.components.size,
            loadedComponents: this.loadedComponents.size,
            cachedComponents: this.componentCache.size,
            loadingComponents: this.loadingPromises.size
        };
    }

    /**
     * 销毁组件
     */
    async destroy() {
        // 清理组件缓存
        this.componentCache.clear();
        this.loadedComponents.clear();
        this.loadingPromises.clear();
        
        console.log('组件管理器已销毁');
    }
} 