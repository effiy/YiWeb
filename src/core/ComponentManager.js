/**
 * 组件管理类 - 重构版本
 * @author liangliang
 * @version 2.0.0
 * @description 采用现代架构，支持懒加载、生命周期管理和错误处理
 */

/**
 * 组件状态枚举
 */
export const ComponentState = {
    UNLOADED: 'unloaded',
    LOADING: 'loading',
    LOADED: 'loaded',
    INITIALIZING: 'initializing',
    READY: 'ready',
    ERROR: 'error',
    DESTROYED: 'destroyed'
};

/**
 * 组件管理类 - 重构版本
 */
export class ComponentManager {
    constructor(options = {}) {
        // 配置选项
        this.options = {
            enableLazyLoading: true,
            enableCaching: true,
            maxCacheSize: 50,
            retryAttempts: 3,
            retryDelay: 1000,
            ...options
        };
        
        // 组件注册表
        this.components = new Map();
        this.loadedComponents = new Set();
        this.componentCache = new Map();
        this.loadingPromises = new Map();
        
        // 组件状态
        this.componentStates = new Map();
        this.componentInstances = new Map();
        
        // 生命周期钩子
        this.lifecycleHooks = {
            beforeLoad: [],
            afterLoad: [],
            beforeInit: [],
            afterInit: [],
            beforeDestroy: [],
            afterDestroy: []
        };
        
        // 错误处理
        this.errorHandlers = [];
        this.retryStrategies = new Map();
        
        // 性能监控
        this.loadTimes = new Map();
        this.errorCounts = new Map();
        
        // 初始化
        this._init();
    }

    /**
     * 初始化组件管理器
     * @private
     */
    _init() {
        // 设置默认重试策略
        this._setupDefaultRetryStrategies();
        
        // 监听组件相关事件
        this._setupEventListeners();
    }

    /**
     * 设置默认重试策略
     * @private
     */
    _setupDefaultRetryStrategies() {
        // 网络错误重试策略
        this.retryStrategies.set('network', {
            maxAttempts: 3,
            delay: 1000,
            backoff: 2
        });
        
        // 资源加载错误重试策略
        this.retryStrategies.set('resource', {
            maxAttempts: 2,
            delay: 500,
            backoff: 1.5
        });
    }

    /**
     * 设置事件监听器
     * @private
     */
    _setupEventListeners() {
        // 监听组件加载事件
        document.addEventListener('component:load', (event) => {
            this._handleComponentLoad(event.detail);
        });
        
        // 监听组件错误事件
        document.addEventListener('component:error', (event) => {
            this._handleComponentError(event.detail);
        });
    }

    /**
     * 注册组件
     * @param {string} name 组件名称
     * @param {Object} component 组件定义
     */
    registerComponent(name, component) {
        if (this.components.has(name)) {
            console.warn(`Component ${name} is already registered`);
            return;
        }
        
        this.components.set(name, component);
        this.componentStates.set(name, ComponentState.UNLOADED);
        this.errorCounts.set(name, 0);
        
        console.log(`Component registered: ${name}`);
    }

    /**
     * 注册多个组件
     * @param {Array} componentNames 组件名称数组
     */
    async registerComponents(componentNames) {
        const promises = componentNames.map(name => this.registerComponentByName(name));
        await Promise.allSettled(promises);
    }

    /**
     * 根据名称注册组件
     * @param {string} name 组件名称
     */
    async registerComponentByName(name) {
        try {
            this.componentStates.set(name, ComponentState.LOADING);
            
            // 动态导入组件
            const component = await this.loadComponent(name);
            this.registerComponent(name, component);
            
            this.componentStates.set(name, ComponentState.LOADED);
            return component;
        } catch (error) {
            this.componentStates.set(name, ComponentState.ERROR);
            this._handleComponentError({ name, error });
            throw error;
        }
    }

    /**
     * 加载组件
     * @param {string} name 组件名称
     * @returns {Promise<Object>}
     */
    async loadComponent(name) {
        // 检查缓存
        if (this.options.enableCaching && this.componentCache.has(name)) {
            return this.componentCache.get(name);
        }

        // 检查是否正在加载
        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }

        // 创建加载Promise
        const loadPromise = this._createComponent(name);
        this.loadingPromises.set(name, loadPromise);

        try {
            const startTime = performance.now();
            const component = await loadPromise;
            const loadTime = performance.now() - startTime;
            
            this.loadTimes.set(name, loadTime);
            this.componentCache.set(name, component);
            this.loadingPromises.delete(name);
            
            // 执行加载后钩子
            await this._executeHooks('afterLoad', { name, component, loadTime });
            
            return component;
        } catch (error) {
            this.loadingPromises.delete(name);
            throw error;
        }
    }

    /**
     * 创建组件
     * @param {string} name 组件名称
     * @returns {Promise<Object>}
     */
    async _createComponent(name) {
        // 执行加载前钩子
        await this._executeHooks('beforeLoad', { name });
        
        // 根据组件名称创建对应的组件
        switch (name) {
            case 'SearchHeader':
                return this._createSearchHeader();
            case 'FeatureCards':
                return this._createFeatureCards();
            case 'NewsList':
                return this._createNewsList();
            case 'Shortcuts':
                return this._createShortcuts();
            case 'Calendar':
                return this._createCalendar();
            case 'Sidebar':
                return this._createSidebar();
            default:
                throw new Error(`Unknown component: ${name}`);
        }
    }

    /**
     * 创建搜索头部组件
     * @private
     */
    _createSearchHeader() {
        return {
            name: 'SearchHeader',
            version: '2.0.0',
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
                    this._setupAccessibility();
                },
                bindEvents() {
                    const searchInput = document.getElementById('messageInput');
                    if (searchInput) {
                        searchInput.addEventListener('input', this.handleInput.bind(this));
                        searchInput.addEventListener('keydown', this.handleKeydown.bind(this));
                        searchInput.addEventListener('focus', this.handleFocus.bind(this));
                        searchInput.addEventListener('blur', this.handleBlur.bind(this));
                    }
                },
                handleInput(event) {
                    const value = event.target.value;
                    this.emit('search:input', value);
                },
                handleKeydown(event) {
                    if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        const value = event.target.value;
                        this.emit('search:submit', value);
                    }
                },
                handleFocus(event) {
                    event.target.parentElement.classList.add('focused');
                },
                handleBlur(event) {
                    event.target.parentElement.classList.remove('focused');
                },
                _setupAccessibility() {
                    const searchInput = document.getElementById('messageInput');
                    if (searchInput) {
                        searchInput.setAttribute('aria-label', '消息输入框');
                        searchInput.setAttribute('aria-describedby', 'category-filters');
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
     * 创建功能卡片组件
     * @private
     */
    _createFeatureCards() {
        return {
            name: 'FeatureCards',
            version: '2.0.0',
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
                    this._setupAnimations();
                },
                bindEvents() {
                    const cards = document.querySelectorAll('.feature-card');
                    cards.forEach(card => {
                        card.addEventListener('click', this.handleCardClick.bind(this));
                        card.addEventListener('keydown', this.handleCardKeydown.bind(this));
                        card.addEventListener('mouseenter', this.handleCardHover.bind(this));
                        card.addEventListener('mouseleave', this.handleCardLeave.bind(this));
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
                handleCardHover(event) {
                    event.currentTarget.classList.add('hovered');
                },
                handleCardLeave(event) {
                    event.currentTarget.classList.remove('hovered');
                },
                _setupAnimations() {
                    // 添加进入动画
                    const cards = document.querySelectorAll('.feature-card');
                    cards.forEach((card, index) => {
                        card.style.animationDelay = `${index * 0.1}s`;
                        card.classList.add('animate-in');
                    });
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
     * @private
     */
    _createNewsList() {
        return {
            name: 'NewsList',
            version: '2.0.0',
            template: `
                <div class="news-list-container">
                    <div class="news-list" role="list" aria-label="新闻列表">
                        <!-- 新闻项目将通过JavaScript动态生成 -->
                    </div>
                </div>
            `,
            methods: {
                async init() {
                    await this.loadNews();
                    this.bindEvents();
                },
                async loadNews() {
                    try {
                        const news = await this.fetchNews();
                        this.renderNews(news);
                    } catch (error) {
                        console.error('Failed to load news:', error);
                        this.showError('新闻加载失败');
                    }
                },
                async fetchNews() {
                    // 模拟新闻数据获取
                    return new Promise(resolve => {
                        setTimeout(() => {
                            resolve([
                                { title: 'AI技术发展', content: '人工智能技术的最新发展...' },
                                { title: '科技创新', content: '科技创新推动社会发展...' }
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
                            </div>
                        `).join('');
                    }
                },
                showError(message) {
                    const container = document.querySelector('.news-list');
                    if (container) {
                        container.innerHTML = `<div class="error-message">${message}</div>`;
                    }
                },
                bindEvents() {
                    const newsItems = document.querySelectorAll('.news-item');
                    newsItems.forEach(item => {
                        item.addEventListener('click', this.handleNewsClick.bind(this));
                    });
                },
                handleNewsClick(event) {
                    const title = event.currentTarget.querySelector('h3').textContent;
                    this.emit('news:click', { title });
                },
                emit(event, data) {
                    const customEvent = new CustomEvent(event, { detail: data });
                    document.dispatchEvent(customEvent);
                }
            }
        };
    }

    /**
     * 创建快捷键组件
     * @private
     */
    _createShortcuts() {
        return {
            name: 'Shortcuts',
            version: '2.0.0',
            template: `
                <div class="shortcuts-container">
                    <div class="shortcuts-grid" role="grid" aria-label="快捷键网格">
                        <!-- 快捷键项目将通过JavaScript动态生成 -->
                    </div>
                </div>
            `,
            methods: {
                init() {
                    this.loadShortcuts();
                    this.bindEvents();
                },
                loadShortcuts() {
                    const shortcuts = [
                        { key: 'Ctrl+K', description: '搜索' },
                        { key: 'Ctrl+N', description: '新闻' },
                        { key: 'Ctrl+S', description: '快捷键' }
                    ];
                    this.renderShortcuts(shortcuts);
                },
                renderShortcuts(shortcuts) {
                    const container = document.querySelector('.shortcuts-grid');
                    if (container) {
                        container.innerHTML = shortcuts.map(shortcut => `
                            <div class="shortcut-item" role="gridcell">
                                <kbd>${shortcut.key}</kbd>
                                <span>${shortcut.description}</span>
                            </div>
                        `).join('');
                    }
                },
                bindEvents() {
                    const shortcutItems = document.querySelectorAll('.shortcut-item');
                    shortcutItems.forEach(item => {
                        item.addEventListener('click', this.handleShortcutClick.bind(this));
                    });
                },
                handleShortcutClick(event) {
                    const key = event.currentTarget.querySelector('kbd').textContent;
                    this.emit('shortcut:click', { key });
                },
                emit(event, data) {
                    const customEvent = new CustomEvent(event, { detail: data });
                    document.dispatchEvent(customEvent);
                }
            }
        };
    }

    /**
     * 创建日历组件
     * @private
     */
    _createCalendar() {
        return {
            name: 'Calendar',
            version: '2.0.0',
            template: `
                <div class="calendar-container">
                    <div class="calendar-header">
                        <button class="calendar-nav prev" aria-label="上个月">‹</button>
                        <h2 class="calendar-title"></h2>
                        <button class="calendar-nav next" aria-label="下个月">›</button>
                    </div>
                    <div class="calendar-body">
                        <div class="calendar-days"></div>
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
                    // 日历渲染逻辑
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
     * @private
     */
    _createSidebar() {
        return {
            name: 'Sidebar',
            version: '2.0.0',
            template: `
                <aside class="sidebar" role="complementary" aria-label="侧边栏">
                    <div class="sidebar-header">
                        <button class="sidebar-toggle" aria-label="切换侧边栏">☰</button>
                    </div>
                    <div class="sidebar-content">
                        <!-- 侧边栏内容 -->
                    </div>
                </aside>
            `,
            methods: {
                init() {
                    this.bindEvents();
                },
                bindEvents() {
                    const toggleBtn = document.querySelector('.sidebar-toggle');
                    if (toggleBtn) {
                        toggleBtn.addEventListener('click', this.toggle.bind(this));
                    }
                },
                open() {
                    document.querySelector('.sidebar')?.classList.add('open');
                },
                close() {
                    document.querySelector('.sidebar')?.classList.remove('open');
                },
                toggle() {
                    const sidebar = document.querySelector('.sidebar');
                    sidebar?.classList.toggle('open');
                }
            }
        };
    }

    /**
     * 初始化组件
     */
    async initialize() {
        const promises = Array.from(this.components.keys()).map(name => 
            this.initializeComponent(name)
        );
        
        await Promise.allSettled(promises);
    }

    /**
     * 初始化单个组件
     * @param {string} name 组件名称
     */
    async initializeComponent(name) {
        try {
            this.componentStates.set(name, ComponentState.INITIALIZING);
            
            const component = this.components.get(name);
            if (component && component.methods && component.methods.init) {
                await component.methods.init();
            }
            
            this.componentStates.set(name, ComponentState.READY);
            this.loadedComponents.add(name);
            
            console.log(`Component initialized: ${name}`);
        } catch (error) {
            this.componentStates.set(name, ComponentState.ERROR);
            this._handleComponentError({ name, error });
            throw error;
        }
    }

    /**
     * 获取组件
     * @param {string} name 组件名称
     * @returns {Object|null}
     */
    getComponent(name) {
        return this.components.get(name) || null;
    }

    /**
     * 检查组件是否已加载
     * @param {string} name 组件名称
     * @returns {boolean}
     */
    isComponentLoaded(name) {
        return this.loadedComponents.has(name);
    }

    /**
     * 获取组件状态
     * @param {string} name 组件名称
     * @returns {string}
     */
    getComponentState(name) {
        return this.componentStates.get(name) || ComponentState.UNLOADED;
    }

    /**
     * 处理组件加载事件
     * @private
     */
    _handleComponentLoad(detail) {
        console.log('Component loaded:', detail);
    }

    /**
     * 处理组件错误
     * @private
     */
    _handleComponentError(detail) {
        const { name, error } = detail;
        const errorCount = this.errorCounts.get(name) || 0;
        this.errorCounts.set(name, errorCount + 1);
        
        console.error(`Component error: ${name}`, error);
        
        // 执行错误处理器
        this.errorHandlers.forEach(handler => {
            try {
                handler(detail);
            } catch (handlerError) {
                console.error('Error handler failed:', handlerError);
            }
        });
    }

    /**
     * 执行生命周期钩子
     * @private
     */
    async _executeHooks(hookName, context) {
        const hooks = this.lifecycleHooks[hookName] || [];
        for (const hook of hooks) {
            try {
                await hook(context);
            } catch (error) {
                console.error(`Lifecycle hook failed: ${hookName}`, error);
            }
        }
    }

    /**
     * 添加生命周期钩子
     */
    addLifecycleHook(hookName, hook) {
        if (this.lifecycleHooks[hookName]) {
            this.lifecycleHooks[hookName].push(hook);
        }
    }

    /**
     * 添加错误处理器
     */
    addErrorHandler(handler) {
        this.errorHandlers.push(handler);
    }

    /**
     * 获取状态信息
     */
    getStatus() {
        return {
            totalComponents: this.components.size,
            loadedComponents: this.loadedComponents.size,
            componentStates: Object.fromEntries(this.componentStates),
            loadTimes: Object.fromEntries(this.loadTimes),
            errorCounts: Object.fromEntries(this.errorCounts),
            cacheSize: this.componentCache.size
        };
    }

    /**
     * 销毁组件管理器
     */
    async destroy() {
        // 执行销毁前钩子
        await this._executeHooks('beforeDestroy');
        
        // 清理组件实例
        for (const [name, instance] of this.componentInstances) {
            if (instance && instance.methods && instance.methods.destroy) {
                try {
                    await instance.methods.destroy();
                } catch (error) {
                    console.error(`Failed to destroy component: ${name}`, error);
                }
            }
        }
        
        // 清理缓存
        this.componentCache.clear();
        this.loadingPromises.clear();
        this.componentStates.clear();
        this.componentInstances.clear();
        this.loadedComponents.clear();
        
        // 执行销毁后钩子
        await this._executeHooks('afterDestroy');
        
        console.log('ComponentManager destroyed');
    }
} 