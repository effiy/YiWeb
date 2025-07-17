/**
 * 路由管理类
 * @author liangliang
 * @version 1.0.0
 */

/**
 * 路由管理类
 */
export class Router {
    constructor(store) {
        this.store = store;
        this.routes = new Map();
        this.currentRoute = null;
        this.history = [];
        this.maxHistory = 20;
        
        // 初始化路由
        this.initializeRoutes();
        
        // 监听浏览器历史变化
        this.setupHistoryListener();
    }

    /**
     * 初始化路由
     */
    initializeRoutes() {
        // 主页面路由
        this.addRoute('/', {
            name: 'home',
            title: 'YiWeb - 智能AI助手',
            component: 'HomePage',
            meta: {
                requiresAuth: false,
                cache: true
            }
        });

        // 搜索页面路由
        this.addRoute('/search', {
            name: 'search',
            title: '搜索结果 - YiWeb',
            component: 'SearchPage',
            meta: {
                requiresAuth: false,
                cache: false
            }
        });

        // 新闻页面路由
        this.addRoute('/news', {
            name: 'news',
            title: '新闻资讯 - YiWeb',
            component: 'NewsPage',
            meta: {
                requiresAuth: false,
                cache: true
            }
        });

        // 快捷键页面路由
        this.addRoute('/shortcuts', {
            name: 'shortcuts',
            title: '快捷键 - YiWeb',
            component: 'ShortcutsPage',
            meta: {
                requiresAuth: false,
                cache: true
            }
        });

        // 设置页面路由
        this.addRoute('/settings', {
            name: 'settings',
            title: '设置 - YiWeb',
            component: 'SettingsPage',
            meta: {
                requiresAuth: false,
                cache: false
            }
        });

        // 404页面路由
        this.addRoute('*', {
            name: 'notFound',
            title: '页面未找到 - YiWeb',
            component: 'NotFoundPage',
            meta: {
                requiresAuth: false,
                cache: false
            }
        });
    }

    /**
     * 添加路由
     */
    addRoute(path, config) {
        this.routes.set(path, {
            path,
            ...config,
            params: this.extractParams(path)
        });
    }

    /**
     * 提取路由参数
     */
    extractParams(path) {
        const params = [];
        const regex = /:(\w+)/g;
        let match;
        
        while ((match = regex.exec(path)) !== null) {
            params.push(match[1]);
        }
        
        return params;
    }

    /**
     * 启动路由
     */
    async start() {
        // 获取当前路径
        const path = this.getCurrentPath();
        
        // 导航到当前路径
        await this.navigate(path, {}, false);
        
        console.log('路由启动完成');
    }

    /**
     * 导航到指定路径
     */
    async navigate(path, params = {}, updateHistory = true) {
        try {
            // 查找路由配置
            const route = this.findRoute(path);
            
            if (!route) {
                console.warn('路由未找到:', path);
                return false;
            }

            // 检查路由权限
            if (!this.checkRouteAccess(route)) {
                console.warn('路由访问被拒绝:', path);
                return false;
            }

            // 更新浏览器历史
            if (updateHistory) {
                this.pushHistory(path, params);
            }

            // 更新当前路由
            this.currentRoute = {
                ...route,
                params,
                fullPath: this.buildFullPath(path, params)
            };

            // 更新页面标题
            this.updatePageTitle(route.title);

            // 触发路由变化事件
            this.store.dispatch('app/setRoute', this.currentRoute);

            // 加载组件
            await this.loadComponent(route.component);

            console.log('导航完成:', path);
            return true;
        } catch (error) {
            console.error('导航失败:', error);
            return false;
        }
    }

    /**
     * 查找路由
     */
    findRoute(path) {
        // 精确匹配
        if (this.routes.has(path)) {
            return this.routes.get(path);
        }

        // 参数匹配
        for (const [routePath, route] of this.routes) {
            if (this.matchRoute(routePath, path)) {
                return route;
            }
        }

        // 通配符匹配
        return this.routes.get('*');
    }

    /**
     * 匹配路由
     */
    matchRoute(routePath, currentPath) {
        if (routePath === '*') return false;
        
        const routeParts = routePath.split('/');
        const currentParts = currentPath.split('/');
        
        if (routeParts.length !== currentParts.length) return false;
        
        for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith(':')) continue;
            if (routeParts[i] !== currentParts[i]) return false;
        }
        
        return true;
    }

    /**
     * 检查路由访问权限
     */
    checkRouteAccess(route) {
        if (route.meta && route.meta.requiresAuth) {
            // 这里可以添加认证逻辑
            return true;
        }
        return true;
    }

    /**
     * 构建完整路径
     */
    buildFullPath(path, params) {
        let fullPath = path;
        
        Object.entries(params).forEach(([key, value]) => {
            fullPath = fullPath.replace(`:${key}`, value);
        });
        
        return fullPath;
    }

    /**
     * 更新页面标题
     */
    updatePageTitle(title) {
        document.title = title;
    }

    /**
     * 加载组件
     */
    async loadComponent(componentName) {
        try {
            // 这里可以实现组件的动态加载
            console.log('加载组件:', componentName);
            
            // 触发组件加载事件
            this.store.dispatch('ui/setLoading', true);
            
            // 模拟组件加载
            await new Promise(resolve => setTimeout(resolve, 100));
            
            this.store.dispatch('ui/setLoading', false);
        } catch (error) {
            console.error('组件加载失败:', error);
            this.store.dispatch('ui/setLoading', false);
        }
    }

    /**
     * 获取当前路径
     */
    getCurrentPath() {
        return window.location.pathname;
    }

    /**
     * 推入历史记录
     */
    pushHistory(path, params) {
        const historyEntry = {
            path,
            params,
            timestamp: Date.now()
        };
        
        this.history.push(historyEntry);
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        
        // 更新浏览器历史
        const fullPath = this.buildFullPath(path, params);
        window.history.pushState({ path: fullPath }, '', fullPath);
    }

    /**
     * 设置历史监听器
     */
    setupHistoryListener() {
        window.addEventListener('popstate', (event) => {
            const path = event.state ? event.state.path : this.getCurrentPath();
            this.navigate(path, {}, false);
        });
    }

    /**
     * 返回上一页
     */
    back() {
        if (this.history.length > 1) {
            this.history.pop(); // 移除当前页面
            const previousEntry = this.history[this.history.length - 1];
            this.navigate(previousEntry.path, previousEntry.params, false);
        } else {
            window.history.back();
        }
    }

    /**
     * 前进到下一页
     */
    forward() {
        window.history.forward();
    }

    /**
     * 刷新当前页面
     */
    refresh() {
        const currentPath = this.getCurrentPath();
        this.navigate(currentPath, {}, false);
    }

    /**
     * 获取路由参数
     */
    getParams() {
        return this.currentRoute ? this.currentRoute.params : {};
    }

    /**
     * 获取当前路由
     */
    getCurrentRoute() {
        return this.currentRoute;
    }

    /**
     * 获取所有路由
     */
    getAllRoutes() {
        return Array.from(this.routes.values());
    }

    /**
     * 停止路由
     */
    async stop() {
        // 清理事件监听器
        window.removeEventListener('popstate', this.setupHistoryListener);
        
        // 清理历史记录
        this.history = [];
        this.currentRoute = null;
        
        console.log('路由已停止');
    }

    /**
     * 获取路由统计
     */
    getStats() {
        return {
            totalRoutes: this.routes.size,
            currentRoute: this.currentRoute ? this.currentRoute.name : null,
            historyLength: this.history.length,
            maxHistory: this.maxHistory
        };
    }
} 