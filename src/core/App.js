/**
 * 核心应用类
 * @author liangliang
 * @version 1.0.0
 */

import { ComponentManager } from './ComponentManager.js';
import { EventManager } from './EventManager.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';

/**
 * 主应用类
 */
export class App {
    constructor(options = {}) {
        this.config = options.config;
        this.router = options.router;
        this.store = options.store;
        this.utils = options.utils;
        
        // 初始化管理器
        this.componentManager = new ComponentManager();
        this.eventManager = new EventManager();
        this.performanceMonitor = new PerformanceMonitor();
        
        // 应用状态
        this.isRunning = false;
        this.isInitialized = false;
    }

    /**
     * 启动应用
     */
    async start() {
        try {
            // 性能监控开始
            this.performanceMonitor.start('app-start');
            
            // 初始化应用
            await this.initialize();
            
            // 注册事件监听
            this.registerEventListeners();
            
            // 初始化组件
            await this.initializeComponents();
            
            // 启动路由
            await this.router.start();
            
            // 标记应用已启动
            this.isRunning = true;
            this.isInitialized = true;
            
            // 性能监控结束
            this.performanceMonitor.end('app-start');
            
            // 触发应用启动事件
            this.eventManager.emit('app:started');
            
            console.log('应用启动完成');
        } catch (error) {
            console.error('应用启动失败:', error);
            throw error;
        }
    }

    /**
     * 初始化应用
     */
    async initialize() {
        // 初始化基础配置
        await this.initializeConfig();
        
        // 初始化主题
        this.initializeTheme();
        
        // 初始化无障碍功能
        this.initializeAccessibility();
        
        // 初始化错误处理
        this.initializeErrorHandling();
    }

    /**
     * 初始化配置
     */
    async initializeConfig() {
        // 加载用户配置
        const userConfig = await this.config.getUserConfig();
        
        // 应用配置到全局
        window.YiWebConfig = userConfig;
        
        // 更新主题配置
        this.updateThemeConfig(userConfig.theme);
    }

    /**
     * 初始化主题
     */
    initializeTheme() {
        const theme = this.config.get('theme', 'light');
        document.documentElement.setAttribute('data-theme', theme);
        
        // 监听主题变化
        this.eventManager.on('theme:changed', (newTheme) => {
            document.documentElement.setAttribute('data-theme', newTheme);
        });
    }

    /**
     * 初始化无障碍功能
     */
    initializeAccessibility() {
        // 设置页面标题
        document.title = this.config.get('app.title', 'YiWeb - 智能AI助手');
        
        // 设置语言
        document.documentElement.lang = this.config.get('app.language', 'zh-CN');
        
        // 添加无障碍属性
        this.addAccessibilityAttributes();
    }

    /**
     * 添加无障碍属性
     */
    addAccessibilityAttributes() {
        // 为搜索框添加无障碍属性
        const searchInput = document.getElementById('messageInput');
        if (searchInput) {
            searchInput.setAttribute('aria-label', '消息输入框');
            searchInput.setAttribute('aria-describedby', 'category-filters');
        }
        
        // 为功能卡片添加无障碍属性
        const featureCards = document.querySelectorAll('.feature-card');
        featureCards.forEach((card, index) => {
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `功能卡片 ${index + 1}`);
        });
    }

    /**
     * 初始化错误处理
     */
    initializeErrorHandling() {
        // 全局错误处理
        window.addEventListener('error', (event) => {
            this.handleError(event.error);
        });
        
        // Promise 错误处理
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason);
        });
    }

    /**
     * 注册事件监听
     */
    registerEventListeners() {
        // 键盘快捷键
        this.eventManager.on('keyboard:shortcut', (shortcut) => {
            this.handleKeyboardShortcut(shortcut);
        });
        
        // 搜索事件
        this.eventManager.on('search:submit', (query) => {
            this.handleSearch(query);
        });
        
        // 组件事件
        this.eventManager.on('component:loaded', (component) => {
            console.log('组件加载完成:', component);
        });
    }

    /**
     * 初始化组件
     */
    async initializeComponents() {
        // 注册基础组件
        await this.componentManager.registerComponents([
            'SearchHeader',
            'FeatureCards',
            'NewsList',
            'Shortcuts'
        ]);
        
        // 初始化组件
        await this.componentManager.initialize();
    }

    /**
     * 处理键盘快捷键
     */
    handleKeyboardShortcut(shortcut) {
        switch (shortcut) {
            case 'ctrl+k':
                this.focusSearch();
                break;
            case 'ctrl+n':
                this.openNewsPage();
                break;
            case 'ctrl+s':
                this.openShortcutsPage();
                break;
            default:
                console.log('未处理的快捷键:', shortcut);
        }
    }

    /**
     * 处理搜索
     */
    handleSearch(query) {
        // 更新搜索历史
        this.store.dispatch('search/addHistory', query);
        
        // 执行搜索逻辑
        this.router.navigate('/search', { query });
    }

    /**
     * 聚焦搜索框
     */
    focusSearch() {
        const searchInput = document.getElementById('messageInput');
        if (searchInput) {
            searchInput.focus();
        }
    }

    /**
     * 打开新闻页面
     */
    openNewsPage() {
        window.open('pages/news/index.html', '_blank');
    }

    /**
     * 打开快捷键页面
     */
    openShortcutsPage() {
        window.open('pages/shortcuts/index.html', '_blank');
    }

    /**
     * 处理错误
     */
    handleError(error) {
        console.error('应用错误:', error);
        
        // 显示错误信息
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = '应用出现错误，请刷新页面重试';
            errorElement.style.display = 'block';
        }
        
        // 发送错误报告
        this.utils.reportError(error);
    }

    /**
     * 更新主题配置
     */
    updateThemeConfig(theme) {
        this.config.set('theme', theme);
        this.eventManager.emit('theme:changed', theme);
    }

    /**
     * 停止应用
     */
    async stop() {
        this.isRunning = false;
        
        // 停止路由
        await this.router.stop();
        
        // 清理事件监听
        this.eventManager.clear();
        
        // 清理组件
        await this.componentManager.destroy();
        
        console.log('应用已停止');
    }

    /**
     * 获取应用状态
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            isInitialized: this.isInitialized,
            config: this.config.getAll(),
            components: this.componentManager.getStatus()
        };
    }
} 