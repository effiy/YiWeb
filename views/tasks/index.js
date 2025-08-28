/**
 * TaskPro Enterprise - 世界级专业任务管理系统
 * 主应用入口文件
 * 
 * 功能特性：
 * - 多视图支持（列表、看板、甘特图、日历、表格、矩阵）
 * - 高级筛选和搜索
 * - 实时协作
 * - 专业项目管理工具
 * - 企业级数据结构
 */

// Mock数据将通过script标签加载，可以通过window.TaskProMockData访问

// 专业任务管理应用
class TaskProApp {
    constructor() {
        this.app = null;
        this.isInitialized = false;
        this.componentsRegistered = false; // 添加组件注册状态标志
        
        // 应用状态
        this.state = Vue.reactive({
            // 基础数据
            tasks: [],
            
            // 视图状态
            currentView: 'list',
            availableViews: [
                { key: 'list', name: '列表', icon: 'fas fa-list', description: '以列表形式查看任务' },
                { key: 'kanban', name: '看板', icon: 'fas fa-columns', description: '看板式项目管理' },
                { key: 'gantt', name: '甘特图', icon: 'fas fa-chart-gantt', description: '时间线和依赖关系' },
                { key: 'weekly', name: '周报', icon: 'fas fa-calendar-week', description: '周报视图管理' },
                { key: 'daily', name: '日报', icon: 'fas fa-calendar-day', description: '日报视图管理' },
                { key: 'matrix', name: '矩阵', icon: 'fas fa-th', description: '矩阵分析视图' }
            ],
            
            // UI状态
            loading: false,
            error: null,
            sidebarCollapsed: false,
            showNotifications: false,
            showSearchSuggestions: false,
            showAdvancedFilters: false,
            showSortDropdown: false,
            
            // 搜索和筛选
            globalSearchQuery: '',
            searchQuery: '',
            searchSuggestions: [],
            activeFilters: [],
            selectedLabels: [],
            selectedStatuses: [],
            selectedPriorities: [],
            selectedTypes: [],
            selectedDateFilter: null,
            customDateStart: '',
            customDateEnd: '',
            
            // 排序
            currentSort: { key: 'priority', name: '优先级', direction: 'desc' },
            sortOptions: [
                { key: 'priority', name: '优先级', icon: 'fas fa-flag' },
                { key: 'dueDate', name: '截止日期', icon: 'fas fa-calendar' },
                { key: 'created', name: '创建时间', icon: 'fas fa-clock' },
                { key: 'updated', name: '更新时间', icon: 'fas fa-edit' },
                { key: 'status', name: '状态', icon: 'fas fa-tasks' }
            ],
            
            // 分组和视图选项
            groupingEnabled: false,
            autoRefreshEnabled: false,
            groupingConfig: null,
            
            
            
            // 通知系统
            notifications: [],
            unreadNotifications: 0,
            
            // 同步状态
            syncStatus: 'synced',
            syncStatusIcon: 'fas fa-check-circle',
            syncStatusText: '已同步',
            currentWorkspace: 'TaskPro Enterprise',
            
            // 侧边栏数据
            quickFilters: [
                { id: 'due-today', name: '今天到期', icon: 'fas fa-calendar-day', count: 0 },
                { id: 'overdue', name: '已逾期', icon: 'fas fa-exclamation-triangle', count: 0 },
                { id: 'high-priority', name: '高优先级', icon: 'fas fa-flag', count: 0 },
                { id: 'in-progress', name: '进行中', icon: 'fas fa-play', count: 0 }
            ],
            customViews: [],
            activeCustomView: null,
            labels: [],
            
            // 状态栏数据
            totalTasks: 0,
            completedTasks: 0,
            inProgressTasks: 0,
            overdueTasks: 0,
            
            // 任务编辑器状态
            showTaskEditor: false,
            editingTask: null,
            isCreatingTask: false
        });
        
        // 计算属性（现在直接在Vue应用中定义）
        // this.computed 已不再需要，计算属性现在直接内联在createVueApp()中定义
    }
    
    // 初始化应用
    async init() {
        try {
            // 等待关键组件加载
            await this.waitForComponents();
            
            // 初始化store和useMethods
            await this.initializeStore();
            
            // 创建Vue应用（组件注册已在其中进行）
            this.createVueApp();
            
            // 初始化事件监听
            this.initEventListeners();
            
            // 加载初始数据
            await this.loadInitialData();
            
            this.isInitialized = true;
            
        } catch (error) {
            console.error('[TaskPro] 初始化失败:', error);
            // 显示用户友好的错误信息
            this.showInitializationError(error);
        }
    }
    
    // 初始化store和useMethods
    async initializeStore() {
        try {
            console.log('[TaskPro] 开始初始化store和useMethods...');
            console.log('[TaskPro] 当前全局对象:', Object.keys(window).filter(key => 
                ['store', 'createStore', 'useMethods'].includes(key)
            ));
            
            // 等待store加载
            let retries = 0;
            while (!window.store && retries < 50) {
                console.log(`[TaskPro] 等待store加载... 重试次数: ${retries + 1}`);
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }
            
            if (!window.store) {
                console.error('[TaskPro] store加载超时，尝试手动创建');
                if (window.createStore) {
                    window.store = window.createStore();
                    console.log('[TaskPro] 手动创建store成功');
                } else {
                    throw new Error('createStore函数未找到');
                }
            }
            
            console.log('[TaskPro] store加载成功:', window.store);
            
            // 等待useMethods加载
            retries = 0;
            while (!window.useMethods && retries < 50) {
                console.log(`[TaskPro] 等待useMethods加载... 重试次数: ${retries + 1}`);
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }
            
            if (!window.useMethods) {
                throw new Error('useMethods未加载');
            }
            
            console.log('[TaskPro] useMethods加载成功:', window.useMethods);
            
            // 初始化useMethods
            if (!window.store.methods) {
                window.store.methods = window.useMethods(window.store, {});
                console.log('[TaskPro] useMethods初始化成功');
            }
            
            console.log('[TaskPro] store和useMethods初始化完成');
            
        } catch (error) {
            console.error('[TaskPro] store初始化失败:', error);
            throw error;
        }
    }
    
    // 启动应用
    async start() {
        try {
            // 检查Vue是否可用
            if (typeof Vue === 'undefined') {
                throw new Error('Vue.js 未加载，请检查网络连接');
            }
            
            // 检查Vue版本兼容性
            if (!Vue.createApp || !Vue.reactive) {
                throw new Error('Vue.js 版本不兼容，需要 Vue 3.x');
            }
            
            // 初始化应用
            await this.init();
            
            // 应用启动成功
            console.log('[TaskPro] 应用启动成功');
            
        } catch (error) {
            console.error('[TaskPro] 应用启动失败:', error);
            
            // 显示启动错误
            this.showStartupError(error);
        }
    }
    
    // 显示启动错误
    showStartupError(error) {
        const errorMessage = error.message || '应用启动失败';
        
        // 创建错误显示元素
        const errorDiv = document.createElement('div');
        errorDiv.className = 'startup-error';
        errorDiv.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>启动失败</h3>
                <p>${errorMessage}</p>
                <div class="error-actions">
                    <button onclick="location.reload()" class="retry-btn">重新加载</button>
                    <button onclick="this.showErrorDetails()" class="details-btn">查看详情</button>
                </div>
                <div class="error-details" style="display: none;">
                    <pre>${error.stack || error.toString()}</pre>
                </div>
            </div>
        `;
        
        // 添加到页面
        const appContainer = document.getElementById('app');
        if (appContainer) {
            appContainer.innerHTML = '';
            appContainer.appendChild(errorDiv);
        }
        
        // 添加错误详情切换功能
        window.showErrorDetails = function() {
            const details = document.querySelector('.error-details');
            if (details) {
                details.style.display = details.style.display === 'none' ? 'block' : 'none';
            }
        };
    }
    
    // 等待关键组件加载
    async waitForComponents() {
        const requiredComponents = ['WeeklyReport', 'DailyReport'];
        const maxWaitTime = 5000; // 最大等待5秒
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            const missingComponents = requiredComponents.filter(name => !window[name]);
            if (missingComponents.length === 0) {
                return; // 所有组件已加载
            }
            
            // 等待100ms后重试
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // 超时警告
        console.warn('[TaskPro] 部分组件加载超时，继续初始化');
    }
    
    // 加载初始数据
    async loadInitialData() {
        try {
            this.state.loading = true;
            this.state.error = null;
            
            console.log('[TaskPro] 开始加载初始数据...');
            
            // 使用store中的mongodb接口加载数据
            if (window.store && window.store.loadTasksData) {
                console.log('[TaskPro] 使用store中的mongodb接口加载数据');
                const tasks = await window.store.loadTasksData();
                console.log('[TaskPro] store返回的任务数据:', tasks);
                console.log('[TaskPro] 任务数据类型:', typeof tasks);
                console.log('[TaskPro] 任务数据是否为数组:', Array.isArray(tasks));
                
                // 确保tasks是数组
                if (Array.isArray(tasks)) {
                    this.state.tasks = tasks;
                    console.log('[TaskPro] 成功设置任务数据，数量:', tasks.length);
                } else {
                    console.warn('[TaskPro] store返回的不是数组，使用默认数据');
                    this.state.tasks = this.getDefaultTasks();
                }
            } else {
                console.log('[TaskPro] store未加载，使用Mock数据');
                // 等待Mock数据加载
                let retries = 0;
                while (!window.TaskProMockData && retries < 20) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    retries++;
                }
                
                if (window.TaskProMockData) {
                    const mockData = window.TaskProMockData;
                    console.log('[TaskPro] Mock数据已加载:', mockData);
                    
                    // 加载任务数据
                    this.state.tasks = mockData.mockTasks ? mockData.mockTasks.map(task => ({
                        ...task
                    })) : this.getDefaultTasks();
                    
                    console.log('[TaskPro] Mock任务数据已设置，数量:', this.state.tasks.length);
                } else {
                    console.warn('[TaskPro] Mock数据未加载，使用默认数据');
                    this.state.tasks = this.getDefaultTasks();
                }
            }
            
            // 提取标签数据
            this.extractLabels();
            
            // 初始化通知
            this.initNotifications();
            
            console.log('[TaskPro] 初始数据加载完成，任务数量:', this.state.tasks.length);
            this.state.loading = false;
            
        } catch (error) {
            this.state.loading = false;
            this.state.error = error.message || '数据加载失败';
            console.error('[TaskPro] 数据加载失败:', error);
            
            // 加载失败时使用默认数据
            this.state.tasks = this.getDefaultTasks();
            console.log('[TaskPro] 使用默认数据，任务数量:', this.state.tasks.length);
        }
    }
    
    // 加载默认数据
    loadDefaultData() {
        this.state.tasks = this.getDefaultTasks();
        this.extractLabels();
        this.initNotifications();
    }
    
    // 获取默认任务数据
    getDefaultTasks() {
        return [
            {
                id: 'demo-001',
                title: '示例任务',
                description: '这是一个示例任务，用于演示系统功能',
                type: 'feature',
                status: 'todo',
                priority: 'medium',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                input: '用户需求文档',
                output: '功能完整的系统模块',
                steps: {
                    step1: { text: '需求分析', completed: false },
                    step2: { text: '系统设计', completed: false },
                    step3: { text: '编码实现', completed: false },
                    step4: { text: '测试验证', completed: false }
                },
                tags: ['示例', '演示']
            },
            {
                id: 'demo-002',
                title: '系统优化',
                description: '优化系统性能，提升用户体验',
                type: 'improvement',
                status: 'in_progress',
                priority: 'high',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                input: '性能测试报告',
                output: '优化后的系统',
                steps: {
                    step1: { text: '性能分析', completed: true },
                    step2: { text: '优化方案设计', completed: true },
                    step3: { text: '代码重构', completed: false },
                    step4: { text: '性能测试', completed: false }
                },
                tags: ['性能', '优化']
            },
            {
                id: 'demo-003',
                title: 'Bug修复',
                description: '修复用户反馈的重要bug',
                type: 'bug',
                status: 'testing',
                priority: 'critical',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                input: 'Bug报告',
                output: '修复后的功能',
                steps: {
                    step1: { text: 'Bug重现', completed: true },
                    step2: { text: '原因分析', completed: true },
                    step3: { text: '修复代码', completed: true },
                    step4: { text: '测试验证', completed: false }
                },
                tags: ['Bug', '修复']
            }
        ];
    }
    
    // 提取标签数据
    extractLabels() {
        try {
            const allLabels = new Set();
            
            if (this.state.tasks && this.state.tasks.length > 0) {
                this.state.tasks.forEach(task => {
                    if (task.labels && Array.isArray(task.labels)) {
                        task.labels.forEach(label => {
                            if (label && label.id) {
                                allLabels.add(JSON.stringify(label));
                            }
                        });
                    }
                });
            }
            
            this.state.labels = Array.from(allLabels).map(labelStr => JSON.parse(labelStr));
            
        } catch (error) {
            console.warn('[TaskPro] 标签提取失败:', error);
            this.state.labels = [];
        }
    }
    
    // 初始化通知
    initNotifications() {
        try {
            this.state.notifications = [
                {
                    id: 'welcome',
                    title: '欢迎使用 TaskPro Enterprise',
                    message: '系统已准备就绪，开始管理您的任务吧！',
                    type: 'info',
                    read: false,
                    timestamp: new Date().toISOString()
                }
            ];
            
            this.state.unreadNotifications = 1;
            
        } catch (error) {
            console.warn('[TaskPro] 通知初始化失败:', error);
            this.state.notifications = [];
            this.state.unreadNotifications = 0;
        }
    }
    
        // 显示初始化错误
    showInitializationError(error) {
        const errorMessage = error.message || '应用初始化失败';
        
        // 创建错误显示元素
        const errorDiv = document.createElement('div');
        errorDiv.className = 'initialization-error';
        errorDiv.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>初始化失败</h3>
                <p>${errorMessage}</p>
                <button onclick="location.reload()" class="retry-btn">重新加载</button>
            </div>
        `;
        
        // 添加到页面
        const appContainer = document.getElementById('app');
        if (appContainer) {
            appContainer.innerHTML = '';
            appContainer.appendChild(errorDiv);
        }
    }
    
    // 创建Vue应用
    createVueApp() {
        try {
            const { createApp, reactive } = Vue;
            
            // 使用Vue的响应式系统创建状态
            const appState = reactive({
                ...this.state,
                // 确保这些关键状态变量是响应式的
                showTaskEditor: false,
                editingTask: null,
                isCreatingTask: false
            });
            
            this.app = createApp({
                components: {
                    // 组件将通过动态注册方式添加，避免时序问题
                },
                data() {
                    return appState;
                },
                mounted() {
                    // 组件挂载后，数据已经在TaskProApp中加载完成
                    console.log('[TaskPro] Vue组件已挂载');
                    
                    // 将Vue应用的状态引用保存到主应用
                    this.state = appState;
                    
                    // 验证数据是否正确加载
                    if (!this.tasks || this.tasks.length === 0) {
                        console.warn('[TaskPro] 任务数据为空，尝试重新加载');
                        this.loadTasksData();
                    }
                    
                    // 验证编辑相关状态
                    console.log('[TaskPro] 编辑状态验证:', {
                        showTaskEditor: this.showTaskEditor,
                        editingTask: this.editingTask,
                        isCreatingTask: this.isCreatingTask
                    });
                },
                computed: {
                    filteredTasks() {
                        // 确保tasks是数组类型
                        let tasks = Array.isArray(this.tasks) ? [...this.tasks] : [];
                        
                        // 应用搜索筛选
                        if (this.searchQuery) {
                            const query = this.searchQuery.toLowerCase();
                            tasks = tasks.filter(task => 
                                task.title.toLowerCase().includes(query) ||
                                (task.description && task.description.toLowerCase().includes(query))
                            );
                        }
                        
                        // 应用状态筛选
                        if (this.selectedStatuses.length > 0) {
                            tasks = tasks.filter(task => this.selectedStatuses.includes(task.status));
                        }
                        
                        // 应用优先级筛选
                        if (this.selectedPriorities.length > 0) {
                            tasks = tasks.filter(task => this.selectedPriorities.includes(task.priority));
                        }
                        
                        // 应用类型筛选
                        if (this.selectedTypes.length > 0) {
                            tasks = tasks.filter(task => this.selectedTypes.includes(task.type));
                        }
                        
                        // 应用标签筛选
                        if (this.selectedLabels.length > 0) {
                            tasks = tasks.filter(task => 
                                task.labels && task.labels.some(label => 
                                    this.selectedLabels.includes(label.id)
                                )
                            );
                        }
                        
                        // 应用日期筛选
                        if (this.selectedDateFilter) {
                            const now = new Date();
                            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                            
                            switch (this.selectedDateFilter) {
                                case 'overdue':
                                    tasks = tasks.filter(task => task.dueDate && new Date(task.dueDate) < today);
                                    break;
                                case 'today':
                                    tasks = tasks.filter(task => {
                                        if (!task.dueDate) return false;
                                        const dueDate = new Date(task.dueDate);
                                        return dueDate.toDateString() === today.toDateString();
                                    });
                                    break;
                                case 'week':
                                    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                                    tasks = tasks.filter(task => {
                                        if (!task.dueDate) return false;
                                        const dueDate = new Date(task.dueDate);
                                        return dueDate >= today && dueDate <= weekFromNow;
                                    });
                                    break;
                            }
                        }
                        
                        // 应用自定义日期范围
                        if (this.customDateStart && this.customDateEnd) {
                            const startDate = new Date(this.customDateStart);
                            const endDate = new Date(this.customDateEnd);
                            tasks = tasks.filter(task => {
                                if (!task.dueDate) return false;
                                const dueDate = new Date(task.dueDate);
                                return dueDate >= startDate && dueDate <= endDate;
                            });
                        }
                        
                        // 应用排序 - 确保tasks是数组且有内容
                        if (this.currentSort && Array.isArray(tasks) && tasks.length > 0) {
                            try {
                                tasks.sort((a, b) => {
                                let aValue, bValue;
                                
                                switch (this.currentSort.key) {
                                    case 'priority':
                                        const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1, 'none': 0 };
                                        aValue = priorityOrder[a.priority] || 0;
                                        bValue = priorityOrder[b.priority] || 0;
                                        break;
                                    case 'dueDate':
                                        aValue = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
                                        bValue = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');
                                        break;
                                    case 'created':
                                        aValue = a.createdAt ? new Date(a.createdAt) : new Date(0);
                                        bValue = b.createdAt ? new Date(b.createdAt) : new Date(0);
                                        break;
                                    case 'updated':
                                        aValue = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
                                        bValue = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
                                        break;
                                    case 'status':
                                        const statusOrder = { 'completed': 4, 'testing': 3, 'in_review': 2, 'in_progress': 1, 'todo': 0, 'backlog': -1 };
                                        aValue = statusOrder[a.status] || 0;
                                        bValue = statusOrder[b.status] || 0;
                                        break;
                                    default:
                                        aValue = a[this.currentSort.key] || '';
                                        bValue = b[this.currentSort.key] || '';
                                }
                                
                                if (this.currentSort.direction === 'desc') {
                                    return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
                                } else {
                                    return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
                                }
                            });
                            } catch (error) {
                                console.error('[filteredTasks] 排序失败:', error);
                            }
                        }
                        
                        return tasks;
                    }
                },
                methods: {
                    // 从store.methods获取方法
                    getTaskTimeData(task) {
                        if (window.store && window.store.methods && window.store.methods.getTaskTimeData) {
                            return window.store.methods.getTaskTimeData(task);
                        }
                        // 如果没有store方法，返回默认值
                        if (!task.timeData) {
                            const now = new Date();
                            const startDate = new Date(now);
                            const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                            
                            return {
                                startDate: startDate.toISOString().split('T')[0],
                                endDate: endDate.toISOString().split('T')[0],
                                estimatedHours: 8,
                                actualHours: 0,
                                priority: 'medium',
                                status: 'todo',
                                progress: 0,
                                dependencies: [],
                                category: 'development',
                                assignee: '',
                                tags: task.tags || [],
                                createdAt: now.toISOString(),
                                updatedAt: now.toISOString()
                            };
                        }
                        return task.timeData;
                    },
                    
                    // 编辑任务
                    handleTaskEdit(task) {
                        try {
                            // 先设置任务数据，再显示编辑器
                            this.editingTask = { ...task };
                            this.isCreatingTask = false;
                            
                            // 使用nextTick确保状态更新后再显示编辑器
                            this.$nextTick(() => {
                                this.showTaskEditor = true;
                            });
                            
                        } catch (error) {
                            console.error('[TaskPro] 编辑任务失败:', error);
                        }
                    },
                    
                    // 保存任务
                    async handleTaskSave(taskData) {
                        try {
                            console.log('[TaskPro] 开始保存任务:', taskData.title);
                            
                            if (this.isCreatingTask) {
                                // 创建新任务
                                this.tasks.push(taskData);
                                console.log('[TaskPro] 新任务已创建:', taskData.title);
                                
                                if (window.showSuccess) {
                                    window.showSuccess(`任务"${taskData.title}"创建成功`);
                                }
                            } else {
                                // 更新现有任务 - 使用key来查找
                                const taskIndex = this.tasks.findIndex(t => t.key === taskData.key);
                                if (taskIndex !== -1) {
                                    this.tasks[taskIndex] = { ...taskData };
                                    console.log('[TaskPro] 任务已更新:', taskData.title);
                                    
                                    if (window.showSuccess) {
                                        window.showSuccess(`任务"${taskData.title}"更新成功`);
                                    }
                                } else {
                                    console.warn('[TaskPro] 未找到要更新的任务:', taskData.title);
                                    console.warn('[TaskPro] 查找的key:', taskData.key);
                                    console.warn('[TaskPro] 当前任务列表:', this.tasks.map(t => ({ key: t.key, title: t.title })));
                                }
                            }
                            
                            // 关闭编辑器
                            this.closeTaskEditor();
                            
                            // 刷新任务列表数据
                            await this.loadTasksData();
                            
                        } catch (error) {
                            console.error('[TaskPro] 保存任务失败:', error);
                            if (window.showError) {
                                window.showError('保存任务失败，请重试');
                            } else {
                                alert('保存任务失败，请重试');
                            }
                        }
                    },
                    
                    // 关闭任务编辑器
                    closeTaskEditor() {
                        this.showTaskEditor = false;
                        this.editingTask = null;
                        this.isCreatingTask = false;
                    },
                    
                    // 创建任务
                    createTask() {
                        try {
                            this.editingTask = null;
                            this.isCreatingTask = true;
                            this.showTaskEditor = true;
                        } catch (error) {
                            console.error('[TaskPro] 创建任务失败:', error);
                        }
                    },
                    
                    // 加载任务数据
                    async loadTasksData() {
                        try {
                            // 优先从store加载数据（如果store存在且有loadTasksData方法）
                            if (window.store && window.store.loadTasksData) {
                                const tasks = await window.store.loadTasksData();
                                
                                // 更新主应用的tasks数组
                                this.tasks = [...(tasks || [])];
                                
                                // 提取标签数据
                                this.extractLabels();
                                
                                // 初始化通知
                                this.initNotifications();
                                
                                return;
                            }
                            
                            // 如果store不可用，回退到Mock数据
                            // 等待Mock数据加载
                            let retries = 0;
                            while (!window.TaskProMockData && retries < 20) {
                                await new Promise(resolve => setTimeout(resolve, 100));
                                retries++;
                            }
                            
                            if (!window.TaskProMockData) {
                                this.loadDefaultData();
                                return;
                            }
                            
                            const mockData = window.TaskProMockData;
                            
                            // 加载任务数据
                            this.tasks = mockData.mockTasks ? mockData.mockTasks.map(task => ({
                                ...task
                            })) : this.getDefaultTasks();
                            
                            // 提取标签数据
                            this.extractLabels();
                            
                            // 初始化通知
                            this.initNotifications();
                            
                        } catch (error) {
                            console.error('[TaskPro] 任务数据加载失败:', error);
                            // 加载默认数据作为后备
                            this.loadDefaultData();
                        }
                    },
                    
                    // 加载默认数据
                    loadDefaultData() {
                        this.tasks = this.getDefaultTasks();
                        this.extractLabels();
                        this.initNotifications();
                    },
                    
                    // 同步任务数据
                    syncTasksData() {
                        try {
                            // 如果store存在且有数据，同步到主应用
                            if (window.store && window.store.tasksData && window.store.tasksData.value) {
                                const storeTasks = window.store.tasksData.value;
                                console.log('[TaskPro] 同步store数据到主应用，任务数量:', storeTasks.length);
                                
                                // 更新主应用的tasks数组
                                this.tasks = [...storeTasks];
                                
                                // 重新提取标签和更新通知
                                this.extractLabels();
                                this.initNotifications();
                                
                                console.log('[TaskPro] 数据同步完成');
                            }
                        } catch (error) {
                            console.error('[TaskPro] 数据同步失败:', error);
                        }
                    },
                    
                    // 恢复任务数据
                    async recoverTasksData() {
                        try {
                            console.log('[TaskPro] 开始恢复任务数据');
                            
                            // 从store恢复数据
                            if (window.store && window.store.tasksData && window.store.tasksData.value) {
                                const storeTasks = window.store.tasksData.value;
                                console.log('[TaskPro] 从store恢复数据，任务数量:', storeTasks.length);
                                
                                // 更新主应用的tasks数组
                                this.tasks = [...storeTasks];
                                
                                // 重新提取标签和更新通知
                                this.extractLabels();
                                this.initNotifications();
                                
                                console.log('[TaskPro] 数据恢复完成');
                            } else {
                                // 如果store没有数据，尝试重新加载
                                console.log('[TaskPro] store没有数据，尝试重新加载');
                                await this.loadTasksData();
                            }
                        } catch (error) {
                            console.error('[TaskPro] 数据恢复失败:', error);
                            // 最后的备用方案：重新加载数据
                            try {
                                await this.loadTasksData();
                            } catch (reloadError) {
                                console.error('[TaskPro] 重新加载数据也失败:', reloadError);
                            }
                        }
                    },
                    
                    // 获取默认任务数据
                    getDefaultTasks() {
                        return [
                            {
                                id: 'demo-001',
                                title: '示例任务',
                                description: '这是一个示例任务，用于演示系统功能',
                                type: 'feature',
                                status: 'todo',
                                priority: 'medium',
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                                input: '用户需求文档',
                                output: '功能完整的系统模块',
                                steps: {
                                    step1: { text: '需求分析', completed: false },
                                    step2: { text: '系统设计', completed: false },
                                    step3: { text: '编码实现', completed: false },
                                    step4: { text: '测试验证', completed: false }
                                },
                                tags: ['示例', '演示']
                            },
                            {
                                id: 'demo-002',
                                title: '系统优化',
                                description: '优化系统性能，提升用户体验',
                                type: 'improvement',
                                status: 'in_progress',
                                priority: 'high',
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                                input: '性能测试报告',
                                output: '优化后的系统',
                                steps: {
                                    step1: { text: '性能分析', completed: true },
                                    step2: { text: '优化方案设计', completed: true },
                                    step3: { text: '代码重构', completed: false },
                                    step4: { text: '性能测试', completed: false }
                                },
                                tags: ['性能', '优化']
                            },
                            {
                                id: 'demo-003',
                                title: 'Bug修复',
                                description: '修复用户反馈的重要bug',
                                type: 'bug',
                                status: 'testing',
                                priority: 'critical',
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                                input: 'Bug报告',
                                output: '修复后的功能',
                                steps: {
                                    step1: { text: 'Bug重现', completed: true },
                                    step2: { text: '原因分析', completed: true },
                                    step3: { text: '修复代码', completed: true },
                                    step4: { text: '测试验证', completed: false }
                                },
                                tags: ['Bug', '修复']
                            }
                        ];
                    },
                    
                    // 提取标签数据
                    extractLabels() {
                        try {
                            const allLabels = new Set();
                            
                            if (this.tasks && this.tasks.length > 0) {
                                this.tasks.forEach(task => {
                                    if (task.labels && Array.isArray(task.labels)) {
                                        task.labels.forEach(label => {
                                            allLabels.add(JSON.stringify(label));
                                        });
                                    }
                                });
                            }
                            
                            this.labels = Array.from(allLabels).map(labelStr => JSON.parse(labelStr));
                            
                        } catch (error) {
                            console.warn('[TaskPro] 标签提取失败:', error);
                            this.labels = [];
                        }
                    },
                    
                    // 初始化通知
                    initNotifications() {
                        try {
                            this.notifications = [
                                {
                                    id: 'welcome-001',
                                    title: '欢迎使用 TaskPro Enterprise',
                                    message: '系统已准备就绪，开始管理您的任务吧！',
                                    type: 'info',
                                    read: false,
                                    timestamp: new Date().toISOString()
                                }
                            ];
                            
                            this.unreadNotifications = 1;
                            
                        } catch (error) {
                            console.warn('[TaskPro] 通知初始化失败:', error);
                            this.notifications = [];
                            this.unreadNotifications = 0;
                        }
                    },
                    
                    // 视图切换
                    setCurrentView(view) {
                        if (this.currentView === view) return;
                        
                        console.log(`[TaskPro] 切换到视图: ${view}`);
                        this.currentView = view;
                        
                        // 特殊处理周报和日报视图
                        if (view === 'weekly' || view === 'daily') {
                            if (!this.tasks || this.tasks.length === 0) {
                                console.warn('[TaskPro] 周报/日报视图：任务数据为空');
                            }
                        }
                        
                        // 检查Vue组件是否正确注册
                        this.$nextTick(() => {
                            const componentName = this.getComponentNameByView(view);
                            if (componentName) {
                                // 检查Vue组件是否已注册
                                const kebabName = componentName;
                                if (this.$options.components && this.$options.components[kebabName]) {
                                    console.log(`[TaskPro] Vue组件 ${kebabName} 已注册`);
                                } else {
                                    console.warn(`[TaskPro] Vue组件 ${kebabName} 未注册，检查全局组件状态`);
                                    // 检查全局组件状态
                                    const globalComponentName = this.getGlobalComponentName(view);
                                    if (window[globalComponentName]) {
                                        console.log(`[TaskPro] 全局组件 ${globalComponentName} 可用`);
                                    } else {
                                        console.error(`[TaskPro] 全局组件 ${globalComponentName} 不可用`);
                                    }
                                }
                            }
                        });
                    },
                    
                    // 根据视图获取组件名称
                    getComponentNameByView(view) {
                        const viewComponentMap = {
                            'list': 'enhanced-task-list',
                            'kanban': 'kanban-board',
                            'gantt': 'enhanced-gantt-chart',
                            'weekly': 'weekly-report',
                            'daily': 'daily-report',
                            'matrix': 'matrix-view'
                        };
                        return viewComponentMap[view];
                    },
                    
                    // 根据视图获取全局组件名称
                    getGlobalComponentName(view) {
                        const viewComponentMap = {
                            'list': 'EnhancedTaskList',
                            'kanban': 'KanbanBoard',
                            'gantt': 'EnhancedGanttChart',
                            'weekly': 'WeeklyReport',
                            'daily': 'DailyReport',
                            'matrix': 'MatrixView'
                        };
                        return viewComponentMap[view];
                    },
                    
                    
                    
                    // 打开设置
                    openSettings() {
                        // 这里可以添加打开设置的逻辑
                    },
                    
                    // 快速搜索
                    handleQuickSearch() {
                        // 搜索逻辑已在computed中处理
                    },
                    
                    // 清除搜索
                    clearSearch() {
                        this.searchQuery = '';
                    },
                    
                    
                    
                    // 点击任务
                    handleTaskClick(task) {
                        // 这里可以添加任务点击的逻辑
                    },
                    
                    // 更新任务（来自子组件的实时更新，如步骤 check）
                    handleTaskUpdate(updateData) {
                        try {
                            const { task } = updateData || {};
                            if (!task) return;

                            // 在父级任务列表中查找并替换对应任务，确保触发响应式更新
                            const index = this.tasks.findIndex(t =>
                                (t.key && task.key && t.key === task.key) ||
                                (t.id && task.id && t.id === task.id) ||
                                (t.title && task.title && t.title === task.title)
                            );

                            if (index !== -1) {
                                this.tasks.splice(index, 1, { ...task });
                            } else {
                                // 若未找到，作为兜底加入列表顶部
                                this.tasks.unshift({ ...task });
                            }

                            // 同步到全局 store，保证其他视图一致
                            if (window.store && typeof window.store.updateTask === 'function') {
                                window.store.updateTask(task);
                            }

                            // 衍生数据更新
                            this.extractLabels();
                            if (typeof this.updateStats === 'function') {
                                this.updateStats();
                            }
                        } catch (error) {
                            console.error('[TaskPro] 处理任务更新失败:', error);
                        }
                    },
                    
                    // 删除任务
                    async handleTaskDelete(task) {
                        try {
                            console.log('[TaskPro] 开始删除任务:', task.title);
                            
                            // 使用store中的删除方法
                            if (window.store && window.store.deleteTask) {
                                console.log('[TaskPro] 使用store中的删除方法');
                                const result = await window.store.deleteTask(task);
                                
                                if (result) {
                                    // 记录删除前的任务数量
                                    const beforeCount = this.tasks.length;
                                    console.log('[TaskPro] 删除前主应用任务数量:', beforeCount);
                                    
                                    // 同步更新主应用的tasks数组
                                    const storeIndex = this.tasks.findIndex(t => 
                                        (t.id && t.id === task.id) || 
                                        (t.title && t.title === task.title) ||
                                        (t.key && t.key === task.key)
                                    );
                                    
                                    if (storeIndex !== -1) {
                                        const deletedTask = this.tasks[storeIndex];
                                        this.tasks.splice(storeIndex, 1);
                                        console.log('[TaskPro] 主应用tasks数组已更新，移除索引:', storeIndex, '标题:', deletedTask.title);
                                        
                                        // 验证删除后的任务数量
                                        const afterCount = this.tasks.length;
                                        const expectedCount = beforeCount - 1;
                                        
                                        console.log('[TaskPro] 主应用删除后验证:', {
                                            beforeCount,
                                            afterCount,
                                            expectedCount,
                                            isCorrect: afterCount === expectedCount
                                        });
                                        
                                        if (afterCount !== expectedCount) {
                                            console.warn('[TaskPro] 主应用任务数量不正确，尝试恢复数据');
                                            // 尝试从store恢复数据
                                            this.recoverTasksData();
                                        }
                                    } else {
                                        console.warn('[TaskPro] 在主应用中未找到要删除的任务:', task.title);
                                    }
                                    
                                    
                                    
                                    // 显示成功消息
                                    if (window.showSuccess) {
                                        window.showSuccess(`已删除任务"${task.title}"`);
                                    } else {
                                        alert(`已删除任务"${task.title}"`);
                                    }
                                    
                                    console.log('[TaskPro] 任务删除成功:', task.title);
                                } else {
                                    throw new Error('删除任务失败');
                                }
                            } else {
                                console.warn('[TaskPro] store未加载，使用本地删除方法');
                                // 本地删除逻辑（作为备用）
                                const localIndex = this.tasks.findIndex(t => 
                                    (t.id && t.id === task.id) || 
                                        (t.title && t.title === task.title) ||
                                        (t.key && t.key === task.key)
                                );
                                
                                if (localIndex !== -1) {
                                    this.tasks.splice(localIndex, 1);
                                    
                                    
                                    
                                    // 显示成功消息
                                    if (window.showSuccess) {
                                        window.showSuccess(`已删除任务"${task.title}"`);
                                    } else {
                                        alert(`已删除任务"${task.title}"`);
                                    }
                                    
                                    console.log('[TaskPro] 本地删除成功:', task.title);
                                } else {
                                    throw new Error('任务不存在');
                                }
                            }
                        } catch (error) {
                            console.error('[TaskPro] 删除任务失败:', error);
                            
                            // 显示错误消息
                            if (window.showError) {
                                window.showError('删除任务失败，请稍后重试');
                            } else {
                                alert('删除任务失败，请稍后重试');
                            }
                        }
                    },
                    
                    // 编辑任务
                    handleTaskEdit(task) {
                        try {
                            // 先设置任务数据，再显示编辑器
                            this.editingTask = { ...task };
                            this.isCreatingTask = false;
                            
                            // 使用nextTick确保状态更新后再显示编辑器
                            this.$nextTick(() => {
                                this.showTaskEditor = true;
                            });
                            
                        } catch (error) {
                            console.error('[TaskPro] 编辑任务失败:', error);
                        }
                    },
                    
                    // 保存任务
                    async handleTaskSave(taskData) {
                        try {
                            console.log('[TaskPro] 开始保存任务:', taskData.title);
                            
                            if (this.isCreatingTask) {
                                // 创建新任务
                                this.tasks.push(taskData);
                                console.log('[TaskPro] 新任务已创建:', taskData.title);
                                
                                if (window.showSuccess) {
                                    window.showSuccess(`任务"${taskData.title}"创建成功`);
                                }
                            } else {
                                // 更新现有任务 - 使用key来查找
                                const taskIndex = this.tasks.findIndex(t => t.key === taskData.key);
                                if (taskIndex !== -1) {
                                    this.tasks[taskIndex] = { ...taskData };
                                    console.log('[TaskPro] 任务已更新:', taskData.title);
                                    
                                    if (window.showSuccess) {
                                        window.showSuccess(`任务"${taskData.title}"更新成功`);
                                    }
                                } else {
                                    console.warn('[TaskPro] 未找到要更新的任务:', taskData.title);
                                    console.warn('[TaskPro] 查找的key:', taskData.key);
                                    console.warn('[TaskPro] 当前任务列表:', this.tasks.map(t => ({ key: t.key, title: t.title })));
                                }
                            }
                            
                            // 关闭编辑器
                            this.closeTaskEditor();
                            
                        } catch (error) {
                            console.error('[TaskPro] 保存任务失败:', error);
                            if (window.showError) {
                                window.showError('保存任务失败，请重试');
                            } else {
                                alert('保存任务失败，请重试');
                            }
                        }
                    },
                    
                    // 关闭任务编辑器
                    closeTaskEditor() {
                        this.showTaskEditor = false;
                        this.editingTask = null;
                        this.isCreatingTask = false;
                    },
                    
                    // 移动任务
                    handleTaskMove(task) {
                        // 这里可以添加任务移动的逻辑
                    },
                    

                    

                    

                    

                    

                    

                    
                    // 显示消息
                    showMessage(message, type = 'info') {
                        // 这里可以添加消息显示的逻辑
                    },
                    
                    // 显示错误
                    showError(message) {
                        // 这里可以添加错误显示的逻辑
                    },
                    

                    
                    
                    
                    // 切换项目
                    switchProject(project) {
                        this.currentProject = project;
                    },
                    
                    // 创建新项目
                    createNewProject() {
                        // 这里可以添加创建新项目的逻辑
                    },
                    
                    // 选择搜索项
                    selectSearchItem(item) {
                        // 这里可以添加选择搜索项的逻辑
                    },
                    
                    // 全屏切换
                    toggleFullscreen() {
                        if (!document.fullscreenElement) {
                            document.documentElement.requestFullscreen().catch(err => {
                                console.warn('全屏请求被拒绝:', err);
                            });
                        } else {
                            document.exitFullscreen();
                        }
                    },
                    
                    // 返回首页
                    goToHome() {
                        window.location.href = '/';
                    }
                }
            });
            
            // 等待组件加载完成后注册
            const components = [
                'EnhancedTaskList',
                'KanbanBoard',
                'EnhancedGanttChart',
                'WeeklyReport',
                'DailyReport',
                'MatrixView',
                'TaskEditor'
            ];
            
            // 添加调试信息
            console.log('[TaskPro] 准备注册的组件列表:', components);
            console.log('[TaskPro] 当前window对象中的组件:', Object.keys(window).filter(key => 
                components.includes(key)
            ));
            
            // 立即尝试注册组件
            const registerComponentsWithRetry = (retryCount = 0) => {
                const missingComponents = [];
                const registeredComponents = [];
                const skippedComponents = [];
                
                console.log(`[TaskPro] 开始组件注册 (第${retryCount + 1}次尝试)`);
                console.log('[TaskPro] 当前全局组件状态:', Object.keys(window).filter(key => 
                    ['EnhancedTaskList', 'KanbanBoard', 'EnhancedGanttChart', 'WeeklyReport', 'DailyReport', 'MatrixView', 'TaskEditor'].includes(key)
                ));
                
                components.forEach(componentName => {
                    if (window[componentName]) {
                        try {
                            const kebabName = componentName.replace(/([A-Z])/g, '-$1').toLowerCase().substring(1);
                            
                            // 检查组件是否已经注册
                            if (this.app._context.components[kebabName]) {
                                console.log(`[TaskPro] 组件 ${componentName} (${kebabName}) 已注册，跳过`);
                                skippedComponents.push(componentName);
                                return;
                            }
                            
                            // 检查组件是否有效
                            if (typeof window[componentName] !== 'object' || !window[componentName].name) {
                                console.warn(`[TaskPro] 组件 ${componentName} 格式无效，跳过`);
                                console.warn(`[TaskPro] 组件类型:`, typeof window[componentName]);
                                console.warn(`[TaskPro] 组件内容:`, window[componentName]);
                                missingComponents.push(componentName);
                                return;
                            }
                            
                            // 特殊处理TaskEditor组件
                            if (componentName === 'TaskEditor') {
                                console.log(`[TaskPro] 特殊处理TaskEditor组件:`, window[componentName]);
                                console.log(`[TaskPro] TaskEditor组件名称:`, window[componentName].name);
                                console.log(`[TaskPro] TaskEditor组件模板:`, window[componentName].template ? '存在' : '不存在');
                                console.log(`[TaskPro] TaskEditor组件方法:`, Object.keys(window[componentName].methods || {}));
                                console.log(`[TaskPro] TaskEditor组件属性:`, Object.keys(window[componentName]));
                            }
                            
                            try {
                                this.app.component(kebabName, window[componentName]);
                                console.log(`[TaskPro] 成功注册组件: ${componentName} -> ${kebabName}`);
                            } catch (registerError) {
                                console.error(`[TaskPro] 组件注册失败: ${componentName}`, registerError);
                                missingComponents.push(componentName);
                                return;
                            }
                            registeredComponents.push(componentName);
                            console.log(`[TaskPro] 成功注册组件: ${componentName} -> ${kebabName}`);
                        } catch (error) {
                            console.warn(`[TaskPro] 组件注册失败: ${componentName}`, error);
                            missingComponents.push(componentName);
                        }
                    } else {
                        console.log(`[TaskPro] 组件 ${componentName} 未找到`);
                        missingComponents.push(componentName);
                    }
                });
                
                // 如果有组件未找到，延迟重试
                if (missingComponents.length > 0 && retryCount < 20) {
                    console.log(`[TaskPro] 等待组件加载 (${retryCount + 1}/20):`, missingComponents);
                    setTimeout(() => registerComponentsWithRetry(retryCount + 1), 200);
                } else {
                    // 标记组件已注册
                    this.componentsRegistered = true;
                    
                    // 输出注册结果
                    console.log(`[TaskPro] 组件注册完成: 成功 ${registeredComponents.length}, 跳过 ${skippedComponents.length}, 失败 ${missingComponents.length}`);
                    
                    if (registeredComponents.length > 0) {
                        console.log('[TaskPro] 成功注册的组件:', registeredComponents);
                    }
                    
                    if (skippedComponents.length > 0) {
                        console.log('[TaskPro] 跳过的组件:', skippedComponents);
                    }
                    
                    if (missingComponents.length > 0) {
                        console.warn('[TaskPro] 加载失败的组件:', missingComponents);
                    }
                    
                    // 触发组件注册完成事件
                    window.dispatchEvent(new CustomEvent('TaskProComponentsReady'));
                    
                    // 组件注册完成后挂载应用
                    console.log('[TaskPro] 开始挂载Vue应用...');
                    
                    // 验证关键组件是否正确注册
                    console.log('[TaskPro] 验证组件注册状态:');
                    console.log('- task-editor:', this.app._context.components['task-editor']);
                    console.log('- TaskEditor全局对象:', window.TaskEditor);
                    
                    // 如果TaskEditor组件注册失败，尝试备用注册方法
                    if (!this.app._context.components['task-editor'] && window.TaskEditor) {
                        console.log('[TaskPro] 尝试备用组件注册方法...');
                        try {
                            // 使用Vue 3的defineComponent方式重新定义组件
                            const TaskEditorComponent = {
                                ...window.TaskEditor,
                                setup() {
                                    // 使用Vue 3的Composition API
                                    return {
                                        // 这里可以添加响应式数据
                                    };
                                }
                            };
                            
                            this.app.component('task-editor', TaskEditorComponent);
                            console.log('[TaskPro] 备用注册成功');
                        } catch (backupError) {
                            console.error('[TaskPro] 备用注册失败:', backupError);
                        }
                    }
                    
                    this.app.mount('#app');
                }
            };
            
            // 开始组件注册
            registerComponentsWithRetry();
            
        } catch (error) {
            console.error('[TaskPro] Vue应用创建失败:', error);
            throw error;
        }
    }
    

    
    // 初始化事件监听
    initEventListeners() {
        // 键盘快捷键
        document.addEventListener('keydown', (event) => {
            // Ctrl+K 全局搜索
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                const searchInput = document.querySelector('.global-search-input');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
            
            // F1 帮助
            if (event.key === 'F1') {
                event.preventDefault();
                this.state.showShortcutHelp = true;
            }
            
            // Esc 关闭模态
            if (event.key === 'Escape') {
                this.state.showShortcutHelp = false;
                this.state.showAdvancedFilters = false;
                this.state.selectedTasks = [];
            }
            
            // N 创建任务
            if (event.key === 'n' && !event.ctrlKey && !event.altKey && !event.metaKey) {
                const activeElement = document.activeElement;
                if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                    event.preventDefault();
                    // 调用创建任务方法
                    this.createTask();
                }
            }
            
            // 数字键切换视图
            if (event.key >= '1' && event.key <= '6' && !event.ctrlKey && !event.altKey && !event.metaKey) {
                const activeElement = document.activeElement;
                if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                    event.preventDefault();
                    const viewIndex = parseInt(event.key) - 1;
                    if (this.state.availableViews[viewIndex]) {
                        this.state.currentView = this.state.availableViews[viewIndex].key;
                    }
                }
            }
            
            // Delete 批量删除
            if (event.key === 'Delete' && this.state.selectedTasks.length > 0) {
                const activeElement = document.activeElement;
                if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                    event.preventDefault();
                    // 这里可以添加批量删除的逻辑
                    console.log('[TaskPro] 快捷键: 批量删除');
                }
            }
            
            // Ctrl+A 全选
            if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
                const activeElement = document.activeElement;
                if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                    event.preventDefault();
                    // 这里可以添加全选的逻辑
                    console.log('[TaskPro] 快捷键: 全选任务');
                }
            }
        });
        
        // 窗口大小变化
        window.addEventListener('resize', () => {
            if (window.innerWidth < 968) {
                this.state.sidebarCollapsed = true;
            }
        });
    }
    
    // 生成搜索建议
    generateSearchSuggestions(query) {
        const suggestions = [];
        
        // 搜索任务
        const taskMatches = this.state.tasks.filter(task =>
            task.title.toLowerCase().includes(query.toLowerCase()) ||
            task.description.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 3);
        
        if (taskMatches.length > 0) {
            suggestions.push({
                type: 'tasks',
                title: '任务',
                items: taskMatches.map(task => ({
                    id: task.id,
                    title: task.title,
                    icon: 'fas fa-tasks'
                }))
            });
        }
        
        this.state.searchSuggestions = suggestions;
    }
    
    // 应用快速筛选
    applyQuickFilter(filter) {
        // 重置其他筛选
        this.state.selectedStatuses = [];
        this.state.selectedPriorities = [];
        this.state.selectedDateFilter = null;
        
        switch (filter.id) {
            case 'due-today':
                this.state.selectedDateFilter = 'today';
                break;
            case 'overdue':
                this.state.selectedDateFilter = 'overdue';
                break;
            case 'high-priority':
                this.state.selectedPriorities = ['critical', 'high'];
                break;
            case 'in-progress':
                this.state.selectedStatuses = ['in_progress'];
                break;
        }
    }
    
    // 任务排序
    sortTasks(tasks) {
        const { key, direction } = this.state.currentSort;
        
        return [...tasks].sort((a, b) => {
            let aValue, bValue;
            
            switch (key) {
                case 'priority':
                    const priorityWeights = {
                        'critical': 4,
                        'high': 3,
                        'medium': 2,
                        'low': 1,
                        'none': 0
                    };
                    aValue = priorityWeights[a.priority] || 0;
                    bValue = priorityWeights[b.priority] || 0;
                    break;
                case 'dueDate':
                    aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0;
                    bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0;
                    break;
                case 'created':
                    aValue = new Date(a.createdAt).getTime();
                    bValue = new Date(b.createdAt).getTime();
                    break;
                case 'updated':
                    aValue = new Date(a.updatedAt).getTime();
                    bValue = new Date(b.updatedAt).getTime();
                    break;

                case 'status':
                    aValue = a.status;
                    bValue = b.status;
                    break;
                default:
                    aValue = a[key];
                    bValue = b[key];
            }
            
            if (direction === 'asc') {
                return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
            } else {
                return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
            }
        });
    }
    
    // 更新统计数据
    updateStats() {
        try {
            if (!this.state.tasks) return;
            
            const total = this.state.tasks.length;
            const completed = this.state.tasks.filter(t => t.status === 'completed').length;
            const inProgress = this.state.tasks.filter(t => t.status === 'in_progress').length;
            const overdue = this.state.tasks.filter(t => {
                if (!t.dueDate || t.status === 'completed') return false;
                return new Date(t.dueDate) < new Date();
            }).length;
            
            this.state.stats = {
                total,
                completed,
                inProgress,
                overdue,
                completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
            };
            
        } catch (error) {
            console.warn('[TaskPro] 统计数据更新失败:', error);
            this.state.stats = {
                total: 0,
                completed: 0,
                inProgress: 0,
                overdue: 0,
                completionRate: 0
            };
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    // 防止重复启动
    if (window.TaskProApp) {
        console.log('[TaskPro] 应用已启动，跳过重复初始化');
        return;
    }
    
    try {
        console.log('[TaskPro] 开始初始化...');
        
        // 等待必要的组件加载完成
        let retries = 0;
        while ((!window.TaskProMockData || !window.Vue) && retries < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        
        if (!window.Vue) {
            throw new Error('Vue.js 未加载');
        }
        
        if (!window.TaskProMockData) {
            console.warn('[TaskPro] Mock数据未加载，将使用默认数据');
        }
        
        // 等待组件加载完成
        await new Promise((resolve) => {
            if (document.readyState === 'complete') {
                // 页面已完全加载，检查组件
                const requiredComponents = [
                    'EnhancedTaskList',
                    'KanbanBoard', 
                    'EnhancedGanttChart',
                    'WeeklyReport',
                    'DailyReport',
                    'MatrixView',
                    'TaskEditor'
                ];
                
                const missingComponents = requiredComponents.filter(name => !window[name]);
                if (missingComponents.length === 0) {
                    console.log('[TaskPro] 所有组件已加载完成');
                    resolve();
                } else {
                    console.log('[TaskPro] 等待组件加载完成，缺失组件:', missingComponents);
                    // 等待组件加载完成事件
                    window.addEventListener('TaskProComponentsReady', resolve, { once: true });
                }
            } else {
                // 等待页面加载完成
                window.addEventListener('load', () => {
                    const requiredComponents = [
                        'EnhancedTaskList',
                        'KanbanBoard', 
                        'EnhancedGanttChart',
                        'WeeklyReport',
                        'DailyReport',
                        'MatrixView',
                        'TaskEditor'
                    ];
                    
                    const missingComponents = requiredComponents.filter(name => !window[name]);
                    if (missingComponents.length === 0) {
                        console.log('[TaskPro] 页面加载完成后，所有组件已就绪');
                        resolve();
                    } else {
                        console.log('[TaskPro] 页面加载完成后，等待组件加载，缺失组件:', missingComponents);
                        // 等待组件加载完成事件
                        window.addEventListener('TaskProComponentsReady', resolve, { once: true });
                    }
                });
            }
        });
        
        console.log('[TaskPro] 组件加载完成，启动应用...');
        
        const taskProApp = new TaskProApp();
        await taskProApp.start();
        
        // 全局暴露应用实例（用于调试）
        window.TaskProApp = taskProApp;
        
    } catch (error) {
        console.error('[TaskPro] 应用启动失败:', error);
        
        // 显示错误信息
        const errorElement = document.createElement('div');
        errorElement.className = 'error-state';
        errorElement.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <h3>系统启动失败</h3>
            <p>请刷新页面重试，如果问题持续存在，请联系技术支持</p>
            <button onclick="location.reload()" class="retry-btn">刷新页面</button>
        `;
        
        const appElement = document.getElementById('app');
        if (appElement) {
            appElement.innerHTML = '';
            appElement.appendChild(errorElement);
        }
    }
});





