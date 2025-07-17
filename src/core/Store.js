/**
 * 状态管理类
 * @author liangliang
 * @version 1.0.0
 */

/**
 * 状态管理类
 */
export class Store {
    constructor() {
        this.state = new Map();
        this.subscribers = new Map();
        this.middleware = [];
        this.history = [];
        this.maxHistory = 50;
        
        // 初始化默认状态
        this.initializeDefaultState();
    }

    /**
     * 初始化默认状态
     */
    initializeDefaultState() {
        this.setState('app', {
            isLoaded: false,
            isLoading: false,
            error: null,
            theme: 'light',
            language: 'zh-CN'
        });

        this.setState('search', {
            query: '',
            history: [],
            suggestions: [],
            isSearching: false
        });

        this.setState('ui', {
            sidebarOpen: false,
            modalOpen: false,
            loading: false,
            notifications: []
        });

        this.setState('user', {
            preferences: {},
            shortcuts: {},
            history: []
        });
    }

    /**
     * 设置状态
     */
    setState(key, value) {
        const oldValue = this.state.get(key);
        this.state.set(key, value);
        
        // 记录历史
        this.addToHistory(key, oldValue, value);
        
        // 通知订阅者
        this.notifySubscribers(key, value, oldValue);
    }

    /**
     * 获取状态
     */
    getState(key) {
        return this.state.get(key);
    }

    /**
     * 获取所有状态
     */
    getAllState() {
        const result = {};
        for (const [key, value] of this.state) {
            result[key] = value;
        }
        return result;
    }

    /**
     * 订阅状态变化
     */
    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        this.subscribers.get(key).add(callback);
        
        // 返回取消订阅函数
        return () => {
            const callbacks = this.subscribers.get(key);
            if (callbacks) {
                callbacks.delete(callback);
            }
        };
    }

    /**
     * 通知订阅者
     */
    notifySubscribers(key, newValue, oldValue) {
        const callbacks = this.subscribers.get(key);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(newValue, oldValue);
                } catch (error) {
                    console.error('状态订阅回调错误:', error);
                }
            });
        }
    }

    /**
     * 添加中间件
     */
    use(middleware) {
        this.middleware.push(middleware);
    }

    /**
     * 分发动作
     */
    dispatch(action, payload) {
        // 执行中间件
        let result = { action, payload };
        
        for (const mw of this.middleware) {
            result = mw(result);
            if (!result) return;
        }
        
        // 执行动作
        this.executeAction(result.action, result.payload);
    }

    /**
     * 执行动作
     */
    executeAction(action, payload) {
        const [module, type] = action.split('/');
        
        switch (module) {
            case 'search':
                this.handleSearchAction(type, payload);
                break;
            case 'ui':
                this.handleUIAction(type, payload);
                break;
            case 'user':
                this.handleUserAction(type, payload);
                break;
            case 'app':
                this.handleAppAction(type, payload);
                break;
            default:
                console.warn('未知动作:', action);
        }
    }

    /**
     * 处理搜索相关动作
     */
    handleSearchAction(type, payload) {
        const searchState = this.getState('search');
        
        switch (type) {
            case 'setQuery':
                this.setState('search', {
                    ...searchState,
                    query: payload
                });
                break;
            case 'addHistory':
                const history = [...searchState.history];
                if (!history.includes(payload)) {
                    history.unshift(payload);
                    if (history.length > 10) {
                        history.pop();
                    }
                    this.setState('search', {
                        ...searchState,
                        history
                    });
                }
                break;
            case 'setSuggestions':
                this.setState('search', {
                    ...searchState,
                    suggestions: payload
                });
                break;
            case 'setSearching':
                this.setState('search', {
                    ...searchState,
                    isSearching: payload
                });
                break;
            default:
                console.warn('未知搜索动作:', type);
        }
    }

    /**
     * 处理UI相关动作
     */
    handleUIAction(type, payload) {
        const uiState = this.getState('ui');
        
        switch (type) {
            case 'toggleSidebar':
                this.setState('ui', {
                    ...uiState,
                    sidebarOpen: !uiState.sidebarOpen
                });
                break;
            case 'setModal':
                this.setState('ui', {
                    ...uiState,
                    modalOpen: payload
                });
                break;
            case 'setLoading':
                this.setState('ui', {
                    ...uiState,
                    loading: payload
                });
                break;
            case 'addNotification':
                const notifications = [...uiState.notifications, payload];
                this.setState('ui', {
                    ...uiState,
                    notifications
                });
                break;
            case 'removeNotification':
                const filteredNotifications = uiState.notifications.filter(
                    n => n.id !== payload
                );
                this.setState('ui', {
                    ...uiState,
                    notifications: filteredNotifications
                });
                break;
            default:
                console.warn('未知UI动作:', type);
        }
    }

    /**
     * 处理用户相关动作
     */
    handleUserAction(type, payload) {
        const userState = this.getState('user');
        
        switch (type) {
            case 'setPreferences':
                this.setState('user', {
                    ...userState,
                    preferences: { ...userState.preferences, ...payload }
                });
                break;
            case 'setShortcuts':
                this.setState('user', {
                    ...userState,
                    shortcuts: { ...userState.shortcuts, ...payload }
                });
                break;
            case 'addHistory':
                const history = [...userState.history, payload];
                if (history.length > 100) {
                    history.shift();
                }
                this.setState('user', {
                    ...userState,
                    history
                });
                break;
            default:
                console.warn('未知用户动作:', type);
        }
    }

    /**
     * 处理应用相关动作
     */
    handleAppAction(type, payload) {
        const appState = this.getState('app');
        
        switch (type) {
            case 'setLoaded':
                this.setState('app', {
                    ...appState,
                    isLoaded: payload
                });
                break;
            case 'setLoading':
                this.setState('app', {
                    ...appState,
                    isLoading: payload
                });
                break;
            case 'setError':
                this.setState('app', {
                    ...appState,
                    error: payload
                });
                break;
            case 'setTheme':
                this.setState('app', {
                    ...appState,
                    theme: payload
                });
                break;
            case 'setLanguage':
                this.setState('app', {
                    ...appState,
                    language: payload
                });
                break;
            default:
                console.warn('未知应用动作:', type);
        }
    }

    /**
     * 添加历史记录
     */
    addToHistory(key, oldValue, newValue) {
        this.history.push({
            key,
            oldValue,
            newValue,
            timestamp: Date.now()
        });
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    /**
     * 获取历史记录
     */
    getHistory() {
        return [...this.history];
    }

    /**
     * 撤销操作
     */
    undo() {
        if (this.history.length > 0) {
            const lastChange = this.history.pop();
            this.state.set(lastChange.key, lastChange.oldValue);
            this.notifySubscribers(lastChange.key, lastChange.oldValue, lastChange.newValue);
        }
    }

    /**
     * 持久化状态
     */
    persist() {
        try {
            const stateData = {};
            for (const [key, value] of this.state) {
                stateData[key] = value;
            }
            localStorage.setItem('yiweb-state', JSON.stringify(stateData));
        } catch (error) {
            console.warn('状态持久化失败:', error);
        }
    }

    /**
     * 恢复状态
     */
    restore() {
        try {
            const stored = localStorage.getItem('yiweb-state');
            if (stored) {
                const stateData = JSON.parse(stored);
                Object.entries(stateData).forEach(([key, value]) => {
                    this.state.set(key, value);
                });
            }
        } catch (error) {
            console.warn('状态恢复失败:', error);
        }
    }

    /**
     * 清理状态
     */
    clear() {
        this.state.clear();
        this.subscribers.clear();
        this.history = [];
        this.initializeDefaultState();
    }

    /**
     * 获取状态统计
     */
    getStats() {
        return {
            stateCount: this.state.size,
            subscriberCount: Array.from(this.subscribers.values())
                .reduce((total, set) => total + set.size, 0),
            historyCount: this.history.length,
            middlewareCount: this.middleware.length
        };
    }
} 