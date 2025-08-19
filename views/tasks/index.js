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
        
        // 应用状态
        this.state = Vue.reactive({
            // 基础数据
            tasks: [],
            users: [],
            projects: [],
            currentProject: null,
            currentUser: null,
            
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
            showDetailPanel: false,
            showProjectDropdown: false,
            showNotifications: false,

            showSearchSuggestions: false,
            showAdvancedFilters: false,
            showSortDropdown: false,
            
            // 搜索和筛选
            globalSearchQuery: '',
            searchQuery: '',
            searchSuggestions: [],
            selectedTasks: [],
            activeFilters: [],
            selectedLabels: [],
            selectedMembers: [],
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
            
            // 批量操作
            batchActionsVisible: false,
            
            // 任务详情
            selectedTask: null,
            taskComments: [],
            taskTimeEntries: [],
            taskAttachments: [],
            
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
            teamMembers: [],
            
            // 状态栏数据
            totalTasks: 0,
            completedTasks: 0,
            inProgressTasks: 0,
            overdueTasks: 0,
            syncStatus: 'synced',
            syncStatusIcon: 'fas fa-check-circle',
            syncStatusText: '已同步',
            currentWorkspace: 'TaskPro Enterprise',
            
            // 键盘快捷键
            showShortcutHelp: false
        });
        
        // 计算属性（现在直接在Vue应用中定义）
        // this.computed 已不再需要，计算属性现在直接内联在createVueApp()中定义
    }
    
    // 初始化应用
    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('[TaskPro] 初始化专业任务管理系统...');
            
            // 等待关键组件加载完成
            await this.waitForComponents();
            
            // 加载数据
            await this.loadData();
            
            // 创建Vue应用
            this.createVueApp();
            
            // 初始化事件监听
            this.initEventListeners();
            
            // 更新统计数据
            this.updateStats();
            
            // 确保初始视图正确设置
            console.log('[TaskPro] 初始视图设置为:', this.state.currentView);
            console.log('[TaskPro] 当前任务数量:', this.state.tasks.length);
            
            this.isInitialized = true;
            console.log('[TaskPro] 系统初始化完成');
            
        } catch (error) {
            console.error('[TaskPro] 初始化失败:', error);
            this.state.error = '系统初始化失败，请刷新页面重试';
        }
    }
    
    // 等待关键组件加载完成
    async waitForComponents() {
        const requiredComponents = ['WeeklyReport', 'DailyReport'];
        const maxWaitTime = 10000; // 最大等待10秒
        const startTime = Date.now();
        
        console.log('[TaskPro] 等待关键组件加载...');
        
        while (Date.now() - startTime < maxWaitTime) {
            const missingComponents = requiredComponents.filter(name => !window[name]);
            
            if (missingComponents.length === 0) {
                console.log('[TaskPro] 所有关键组件已加载完成');
                return;
            }
            
            console.log('[TaskPro] 等待组件加载:', missingComponents);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.warn('[TaskPro] 组件加载超时，继续初始化');
    }
    
    // 加载数据
    async loadData() {
        this.state.loading = true;
        
        try {
            // 等待数据加载完成
            let retries = 0;
            while (!window.TaskProMockData && retries < 10) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }
            
            if (!window.TaskProMockData) {
                throw new Error('Mock数据加载失败');
            }
            
            // 模拟加载延迟（生产环境将替换为真实API调用）
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // 加载任务数据
            const mockData = window.TaskProMockData || {};
            
            this.state.tasks = mockData.mockTasks ? mockData.mockTasks.map(task => ({
                ...task,
                collaborators: task.collaborators ? task.collaborators.map(collab => ({
                    ...collab
                })) : []
            })) : [
                {
                    id: 'demo-001',
                    title: '示例任务',
                    description: '这是一个示例任务，用于演示系统功能',
                    type: 'feature',
                    status: 'todo',
                    priority: 'medium',
                    assignee: {
                        id: 'demo-user',
                        name: '演示用户'
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ];
            
            // 加载用户数据
            this.state.users = mockData.mockUsers ? mockData.mockUsers.map(user => ({
                ...user
            })) : [
                {
                    id: 'demo-user',
                    name: '演示用户',
                    email: 'demo@example.com',
                    role: '项目经理',
                    workload: 50
                }
            ];
            this.state.teamMembers = this.state.users;
            
            // 加载项目数据
            this.state.projects = mockData.mockProjects || [
                {
                    id: 'demo-project',
                    name: '演示项目',
                    code: 'DEMO',
                    progress: 30
                }
            ];
            this.state.currentProject = this.state.projects[0] || {
                id: 'default',
                name: '默认项目',
                code: 'DEF'
            };
            
            // 设置当前用户
            this.state.currentUser = this.state.users[0] || {
                id: 'current-user',
                name: '当前用户',
                email: 'user@example.com',
                role: '项目经理',
                workload: 75
            };
            
            // 提取标签数据
            this.extractLabels();
            
            // 初始化通知
            this.initNotifications();
            
            console.log('[TaskPro] 数据加载完成');
            
        } catch (error) {
            console.error('[TaskPro] 数据加载失败:', error);
            this.state.error = '数据加载失败';
        } finally {
            this.state.loading = false;
        }
    }
    
    // 提取标签数据
    extractLabels() {
        const labelMap = new Map();
        
        this.state.tasks.forEach(task => {
            if (task.labels) {
                task.labels.forEach(label => {
                    if (labelMap.has(label.id)) {
                        labelMap.get(label.id).count++;
                    } else {
                        labelMap.set(label.id, {
                            ...label,
                            count: 1
                        });
                    }
                });
            }
        });
        
        this.state.labels = Array.from(labelMap.values());
    }
    
    // 初始化通知
    initNotifications() {
        this.state.notifications = [
            {
                id: '1',
                title: '新任务分配给您',
                time: new Date(),
                icon: 'fas fa-tasks',
                read: false
            },
            {
                id: '2',
                title: '项目进度更新',
                time: new Date(Date.now() - 60 * 60 * 1000),
                icon: 'fas fa-chart-line',
                read: false
            }
        ];
        
        this.state.unreadNotifications = this.state.notifications.filter(n => !n.read).length;
    }
    
    // 创建Vue应用
    createVueApp() {
        const { createApp } = Vue;
        
        const appState = this.state;
        this.app = createApp({
            data() {
                console.log('[TaskPro] Vue应用数据初始化:', appState);
                return appState;
            },
            computed: {
                filteredTasks() {
                    let tasks = this.tasks || [];
                    console.log('[TaskPro] filteredTasks计算:', { 
                        tasksCount: tasks.length, 
                        searchQuery: this.searchQuery,
                        currentView: this.currentView 
                    });
                    
                    // 应用搜索筛选
                    if (this.searchQuery) {
                        const query = this.searchQuery.toLowerCase();
                        tasks = tasks.filter(task => 
                            task.title.toLowerCase().includes(query) ||
                            task.description.toLowerCase().includes(query)
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
                    
                    // 应用成员筛选
                    if (this.selectedMembers.length > 0) {
                        tasks = tasks.filter(task => 
                            (task.collaborators && task.collaborators.some(collab => 
                                this.selectedMembers.includes(collab.id)
                            ))
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
                    
                    // 应用排序
                    tasks = this.sortTasks(tasks);
                    
                    return tasks;
                },
                
                activeFiltersCount() {
                    return (this.selectedStatuses || []).length +
                           (this.selectedPriorities || []).length +
                           (this.selectedTypes || []).length +
                           (this.selectedLabels || []).length +
                           (this.selectedMembers || []).length +
                           (this.selectedDateFilter ? 1 : 0) +
                           (this.customDateStart && this.customDateEnd ? 1 : 0);
                },
                
                statusOptions() {
                    const statusData = window.TASK_STATUS || window.TaskProMockData?.TASK_STATUS;
                    return statusData ? Object.values(statusData) : [];
                },
                
                priorityOptions() {
                    const priorityData = window.TASK_PRIORITY || window.TaskProMockData?.TASK_PRIORITY;
                    return priorityData ? Object.values(priorityData) : [];
                },
                
                typeOptions() {
                    const typeData = window.TASK_TYPE || window.TaskProMockData?.TASK_TYPE;
                    return typeData ? Object.values(typeData) : [];
                },
                
                totalTasks() {
                    return this.tasks ? this.tasks.length : 0;
                },
                
                completedTasks() {
                    return this.tasks ? this.tasks.filter(t => t.status === 'completed').length : 0;
                },
                
                inProgressTasks() {
                    return this.tasks ? this.tasks.filter(t => t.status === 'in_progress').length : 0;
                },
                
                overdueTasks() {
                    if (!this.tasks) return 0;
                    const now = new Date();
                    return this.tasks.filter(t => 
                        t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed'
                    ).length;
                }
            },
            methods: {
                // 跳转到首页
                goToHome() {
                    window.location.href = '/index.html';
                },
                
                // 排序任务
                sortTasks(tasks) {
                    if (!tasks || !Array.isArray(tasks)) return [];
                    
                    const { key, direction } = this.currentSort || { key: 'priority', direction: 'desc' };
                    
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
                },
                
                // 视图切换
                setCurrentView(view) {
                    this.currentView = view;
                    this.selectedTasks = [];
                    console.log('[TaskPro] 切换到视图:', view);
                    console.log('[TaskPro] 当前视图状态:', this.currentView);
                    console.log('[TaskPro] 当前任务数据:', this.tasks);
                    console.log('[TaskPro] 当前筛选后任务:', this.filteredTasks);
                    
                    // 确保数据已加载
                    if (view === 'weekly' || view === 'daily') {
                        console.log('[TaskPro] 切换到周报/日报视图，检查数据状态:', {
                            tasksCount: this.tasks?.length || 0,
                            filteredTasksCount: this.filteredTasks?.length || 0,
                            loading: this.loading,
                            error: this.error
                        });
                        
                        // 如果数据为空，尝试重新加载
                        if (!this.tasks || this.tasks.length === 0) {
                            console.warn('[TaskPro] 周报/日报视图数据为空，尝试重新加载');
                            this.loadData && this.loadData();
                        }
                        
                        // 延迟检查组件状态
                        this.$nextTick(() => {
                            const componentName = view === 'weekly' ? 'weekly-report' : 'daily-report';
                            const component = document.querySelector(componentName);
                            if (component) {
                                console.log(`[TaskPro] ${componentName} 组件已渲染:`, {
                                    component: component,
                                    props: component.__vueParentComponent?.props
                                });
                            } else {
                                console.warn(`[TaskPro] ${componentName} 组件未找到`);
                            }
                        });
                    }
                },

                // 获取当前视图名称
                getCurrentViewName() {
                    const viewMap = {
                        'list': '列表视图',
                        'kanban': '看板视图',
                        'gantt': '甘特图',
                        'weekly': '周报视图',
                        'daily': '日报视图',
            

                        'matrix': '矩阵视图'
                    };
                    return viewMap[this.currentView] || '未知视图';
                },

                // 清除搜索
                clearSearch() {
                    this.searchQuery = '';
                    this.globalSearchQuery = '';
                },

                // 批量更新状态
                batchUpdateStatus() {
                    console.log('[TaskPro] 批量更新状态:', this.selectedTasks.length, '个任务');
                    // 这里可以添加批量更新状态的逻辑
                },

                // 批量删除
                batchDelete() {
                    console.log('[TaskPro] 批量删除:', this.selectedTasks.length, '个任务');
                    // 这里可以添加批量删除的逻辑
                },

                // 切换全屏
                toggleFullscreen() {
                    if (!document.fullscreenElement) {
                        document.documentElement.requestFullscreen();
                    } else {
                        document.exitFullscreen();
                    }
                },

                // 清除选择
                clearSelection() {
                    this.selectedTasks = [];
                    console.log('[TaskPro] 清除任务选择');
                },

                // 打开设置
                openSettings() {
                    console.log('[TaskPro] 打开设置');
                    // 这里可以添加打开设置的逻辑
                },

                // 快速搜索处理
                handleQuickSearch(event) {
                    this.searchQuery = event.target.value;
                    console.log('[TaskPro] 快速搜索:', this.searchQuery);
                },

                // 任务选择处理
                handleTaskSelect(task) {
                    console.log('[TaskPro] 选择任务:', task.title);
                    // 这里可以添加任务选择的逻辑
                },

                // 任务点击处理
                handleTaskClick(task) {
                    console.log('[TaskPro] 点击任务:', task.title);
                    // 这里可以添加任务点击的逻辑
                },

                // 任务更新处理
                handleTaskUpdate(updateData) {
                    console.log('[TaskPro] 更新任务:', updateData);
                    // 这里可以添加任务更新的逻辑
                },

                // 任务删除处理
                handleTaskDelete(task) {
                    console.log('[TaskPro] 删除任务:', task.title);
                    // 这里可以添加任务删除的逻辑
                },

                // 任务编辑处理
                handleTaskEdit(task) {
                    console.log('[TaskPro] 编辑任务:', task.title);
                    // 这里可以添加任务编辑的逻辑
                },

                // 任务移动处理
                handleTaskMove(task) {
                    console.log('[TaskPro] 移动任务:', task.title);
                    // 这里可以添加任务移动的逻辑
                },

                // 任务创建处理
                handleTaskCreate(newTask) {
                    console.log('[TaskPro] 创建任务:', newTask);
                    // 这里可以添加任务创建的逻辑
                },

                // 选择变化处理
                handleSelectionChange(selectedTasks) {
                    this.selectedTasks = selectedTasks;
                    console.log('[TaskPro] 选择变化:', selectedTasks.length, '个任务');
                },



                // 关闭详情面板
                closeDetailPanel() {
                    this.showDetailPanel = false;
                    console.log('[TaskPro] 关闭详情面板');
                },
                
                // 项目管理
                toggleProjectDropdown() {
                    this.showProjectDropdown = !this.showProjectDropdown;
                    // 关闭其他下拉菜单
                    this.showNotifications = false;
                },
                
                selectProject(project) {
                    this.currentProject = project;
                    this.showProjectDropdown = false;
                    console.log('[TaskPro] 切换项目:', project.name);
                },
                
                createNewProject() {
                    console.log('[TaskPro] 创建新项目');
                    this.showProjectDropdown = false;
                },
                
                // 搜索功能
                handleGlobalSearch: (event) => {
                    const query = event.target.value;
                    this.state.globalSearchQuery = query;
                    
                    if (query.length > 2) {
                        this.generateSearchSuggestions(query);
                        this.state.showSearchSuggestions = true;
                    } else {
                        this.state.showSearchSuggestions = false;
                    }
                },
                
                handleQuickSearch: (event) => {
                    this.state.searchQuery = event.target.value;
                },
                
                clearSearch: () => {
                    this.state.searchQuery = '';
                    this.state.globalSearchQuery = '';
                    this.state.showSearchSuggestions = false;
                },
                
                hideSearchSuggestions: () => {
                    setTimeout(() => {
                        this.state.showSearchSuggestions = false;
                    }, 200);
                },
                
                selectSearchItem: (item) => {
                    console.log('[TaskPro] 选择搜索项:', item);
                    this.state.showSearchSuggestions = false;
                },
                
                // 通知管理
                toggleNotifications: () => {
                    this.state.showNotifications = !this.state.showNotifications;
                    // 关闭其他下拉菜单
                    this.state.showProjectDropdown = false;
                },
                
                markAllAsRead: () => {
                    this.state.notifications.forEach(n => n.read = true);
                    this.state.unreadNotifications = 0;
                },
                

                
                // 帮助系统
                openHelp: () => {
                    this.state.showShortcutHelp = true;
                },
                
                hideShortcutHelp: () => {
                    this.state.showShortcutHelp = false;
                },
                
                // 侧边栏管理
                toggleSidebar: () => {
                    this.state.sidebarCollapsed = !this.state.sidebarCollapsed;
                },
                
                // 筛选功能
                applyFilter: (filter) => {
                    const index = this.state.activeFilters.indexOf(filter.id);
                    if (index > -1) {
                        this.state.activeFilters.splice(index, 1);
                    } else {
                        this.state.activeFilters.push(filter.id);
                    }
                    this.applyQuickFilter(filter);
                },
                
                toggleLabel: (label) => {
                    const index = this.state.selectedLabels.indexOf(label.id);
                    if (index > -1) {
                        this.state.selectedLabels.splice(index, 1);
                    } else {
                        this.state.selectedLabels.push(label.id);
                    }
                },
                
                filterByMember: (member) => {
                    const index = this.state.selectedMembers.indexOf(member.id);
                    if (index > -1) {
                        this.state.selectedMembers.splice(index, 1);
                    } else {
                        this.state.selectedMembers.push(member.id);
                    }
                },
                
                toggleStatusFilter: (status) => {
                    const index = this.state.selectedStatuses.indexOf(status.value);
                    if (index > -1) {
                        this.state.selectedStatuses.splice(index, 1);
                    } else {
                        this.state.selectedStatuses.push(status.value);
                    }
                },
                
                togglePriorityFilter: (priority) => {
                    const index = this.state.selectedPriorities.indexOf(priority.value);
                    if (index > -1) {
                        this.state.selectedPriorities.splice(index, 1);
                    } else {
                        this.state.selectedPriorities.push(priority.value);
                    }
                },
                
                toggleTypeFilter: (type) => {
                    const index = this.state.selectedTypes.indexOf(type.value);
                    if (index > -1) {
                        this.state.selectedTypes.splice(index, 1);
                    } else {
                        this.state.selectedTypes.push(type.value);
                    }
                },
                
                setDateFilter: (filter) => {
                    this.state.selectedDateFilter = filter;
                },
                
                clearAllFilters: () => {
                    this.state.activeFilters = [];
                    this.state.selectedLabels = [];
                    this.state.selectedMembers = [];
                    this.state.selectedStatuses = [];
                    this.state.selectedPriorities = [];
                    this.state.selectedTypes = [];
                    this.state.selectedDateFilter = null;
                    this.state.customDateStart = '';
                    this.state.customDateEnd = '';
                },
                
                // 高级筛选
                toggleAdvancedFilters: () => {
                    this.state.showAdvancedFilters = !this.state.showAdvancedFilters;
                },
                
                // 排序
                toggleSortDropdown: () => {
                    this.state.showSortDropdown = !this.state.showSortDropdown;
                },
                
                setSortOption: (option) => {
                    if (this.state.currentSort.key === option.key) {
                        this.state.currentSort.direction = this.state.currentSort.direction === 'asc' ? 'desc' : 'asc';
                    } else {
                        this.state.currentSort = { ...option, direction: 'desc' };
                    }
                    this.state.showSortDropdown = false;
                },
                
                // 任务管理
                createTask: () => {
                    console.log('[TaskPro] 创建新任务');
                },
                
                handleTaskClick: (task) => {
                    this.state.selectedTask = task;
                    this.state.showDetailPanel = true;
                    console.log('[TaskPro] 点击任务:', task.title);
                },
                
                handleTaskSelect: (task) => {
                    this.state.selectedTask = task;
                    console.log('[TaskPro] 选择任务:', task.title);
                },
                
                handleTaskUpdate: (task) => {
                    const index = this.state.tasks.findIndex(t => t.id === task.id);
                    if (index > -1) {
                        this.state.tasks[index] = { ...this.state.tasks[index], ...task };
                    }
                    console.log('[TaskPro] 更新任务:', task.title);
                },
                
                handleTaskDelete: (task) => {
                    const index = this.state.tasks.findIndex(t => t.id === task.id);
                    if (index > -1) {
                        this.state.tasks.splice(index, 1);
                        this.updateStats();
                    }
                    console.log('[TaskPro] 删除任务:', task.title);
                },
                
                handleTaskCreate: (task) => {
                    const newTask = {
                        id: 'TASK-' + Date.now(),
                        ...task,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    this.state.tasks.push(newTask);
                    this.updateStats();
                    console.log('[TaskPro] 创建任务:', newTask.title);
                },
                
                handleTaskMove: (task, newStatus) => {
                    this.handleTaskUpdate({ ...task, status: newStatus });
                },
                
                handleSelectionChange: (selectedTasks) => {
                    this.state.selectedTasks = selectedTasks;
                },
                
                // 批量操作
                batchUpdateStatus: () => {
                    console.log('[TaskPro] 批量更新状态');
                },
                
                batchAssign: () => {
                    console.log('[TaskPro] 批量分配');
                },
                
                batchAddLabels: () => {
                    console.log('[TaskPro] 批量添加标签');
                },
                
                batchDelete: () => {
                    if (confirm(`确定要删除 ${this.state.selectedTasks.length} 个任务吗？`)) {
                        this.state.selectedTasks.forEach(task => {
                            this.handleTaskDelete(task);
                        });
                        this.state.selectedTasks = [];
                    }
                },
                
                clearSelection: () => {
                    this.state.selectedTasks = [];
                },
                
                // 视图选项
                toggleGrouping: () => {
                    this.state.groupingEnabled = !this.state.groupingEnabled;
                },
                
                toggleAutoRefresh: () => {
                    this.state.autoRefreshEnabled = !this.state.autoRefreshEnabled;
                },
                
                toggleFullscreen: () => {
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else {
                        document.documentElement.requestFullscreen();
                    }
                },
                
                // 详情面板
                closeDetailPanel: () => {
                    this.state.showDetailPanel = false;
                    this.state.selectedTask = null;
                },
                
                // 导出
                exportData: () => {
                    console.log('[TaskPro] 导出数据');
                },
                
                // 更多选项
                toggleMoreOptions: () => {
                    console.log('[TaskPro] 更多选项');
                },
                
                // 自定义视图
                createCustomView: () => {
                    console.log('[TaskPro] 创建自定义视图');
                },
                
                selectCustomView: (view) => {
                    this.state.activeCustomView = view.id;
                    console.log('[TaskPro] 选择自定义视图:', view.name);
                },
                
                // 标签管理
                manageLabels: () => {
                    console.log('[TaskPro] 管理标签');
                },
                
                // 时间格式化
                formatTime: (time) => {
                    if (!time) return '';
                    const now = new Date();
                    const diff = now - new Date(time);
                    const minutes = Math.floor(diff / 60000);
                    const hours = Math.floor(minutes / 60);
                    const days = Math.floor(hours / 24);
                    
                    if (days > 0) return `${days} 天前`;
                    if (hours > 0) return `${hours} 小时前`;
                    if (minutes > 0) return `${minutes} 分钟前`;
                    return '刚刚';
                },
                
                // 防止模板错误的安全访问函数
                safeAccess: (obj, path, defaultValue = '') => {
                    try {
                        return path.split('.').reduce((o, p) => o?.[p], obj) ?? defaultValue;
                    } catch {
                        return defaultValue;
                    }
                },
                
                // 成员过滤
                filterByMember: (member) => {
                    if (member && member.id) {
                        const index = this.selectedMembers.indexOf(member.id);
                        if (index === -1) {
                            this.selectedMembers.push(member.id);
                        } else {
                            this.selectedMembers.splice(index, 1);
                        }
                        console.log('[TaskPro] 成员筛选:', member.name, '当前选择:', this.selectedMembers);
                    }
                }
            },
            
            mounted() {
                console.log('[TaskPro] Vue应用已挂载');
                console.log('[TaskPro] 当前数据状态:', {
                    tasks: this.tasks?.length || 0,
                    currentView: this.currentView,
                    filteredTasks: this.filteredTasks?.length || 0
                });
                
                // 确保数据已正确加载
                if (!this.tasks || this.tasks.length === 0) {
                    console.warn('[TaskPro] 任务数据为空，尝试重新加载');
                    this.loadData && this.loadData();
                }
                
                // 关闭全局点击时的下拉菜单
                document.addEventListener('click', (event) => {
                    try {
                        if (!event.target.closest('.project-selector')) {
                            this.showProjectDropdown = false;
                        }
                        if (!event.target.closest('.notification-center')) {
                            this.showNotifications = false;
                        }
                        if (!event.target.closest('.sort-selector')) {
                            this.showSortDropdown = false;
                        }
                    } catch (error) {
                        console.warn('[TaskPro] 事件监听器错误:', error);
                    }
                });
            },
            
            errorCaptured(err, instance, info) {
                console.error('[TaskPro] Vue组件错误:', err, info);
                this.error = `应用错误: ${err.message}`;
                return false;
            }
        });
        
        // 注册组件
        this.registerComponents();
        
        // 挂载应用
        this.app.mount('#app');
    }
    
    // 注册组件
    registerComponents() {
        // 等待组件加载完成后注册
        const components = [
            'EnhancedTaskList',
            'KanbanBoard',
            'EnhancedGanttChart',
            'WeeklyReport',
            'DailyReport',
            'MatrixView',
            'EnhancedTaskDetail'
        ];
        
        // 延迟注册组件，确保所有组件都已加载
        const registerComponentsWithRetry = () => {
            const missingComponents = [];
            
            components.forEach(componentName => {
                if (window[componentName]) {
                    const kebabName = componentName.replace(/([A-Z])/g, '-$1').toLowerCase().substring(1);
                    this.app.component(kebabName, window[componentName]);
                    console.log('[TaskPro] 注册组件:', componentName, '->', kebabName);
                } else {
                    missingComponents.push(componentName);
                    console.warn('[TaskPro] 组件未找到:', componentName);
                }
            });
            
            // 如果有组件未找到，延迟重试
            if (missingComponents.length > 0) {
                console.log('[TaskPro] 等待组件加载:', missingComponents);
                setTimeout(registerComponentsWithRetry, 200); // 增加重试间隔
            } else {
                console.log('[TaskPro] 所有组件注册完成');
                // 触发组件注册完成事件
                window.dispatchEvent(new CustomEvent('TaskProComponentsReady'));
            }
        };
        
        // 立即尝试注册，如果失败则重试
        registerComponentsWithRetry();
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
                this.state.showDetailPanel = false;
                this.state.showAdvancedFilters = false;
                this.state.selectedTasks = [];
            }
            
            // N 创建任务
            if (event.key === 'n' && !event.ctrlKey && !event.altKey && !event.metaKey) {
                const activeElement = document.activeElement;
                if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                    event.preventDefault();
                    // 这里可以添加创建任务的逻辑
                    console.log('[TaskPro] 快捷键: 创建任务');
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
        ).slice(0, 5);
        
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
        
        // 搜索用户
        const userMatches = this.state.users.filter(user =>
            user.name.toLowerCase().includes(query.toLowerCase()) ||
            user.email.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 3);
        
        if (userMatches.length > 0) {
            suggestions.push({
                type: 'users',
                title: '用户',
                items: userMatches.map(user => ({
                    id: user.id,
                    title: user.name,
                    icon: 'fas fa-user'
                }))
            });
        }
        
        // 搜索项目
        const projectMatches = this.state.projects.filter(project =>
            project.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 3);
        
        if (projectMatches.length > 0) {
            suggestions.push({
                type: 'projects',
                title: '项目',
                items: projectMatches.map(project => ({
                    id: project.id,
                    title: project.name,
                    icon: 'fas fa-project-diagram'
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
        this.state.selectedMembers = [];
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
        this.state.totalTasks = this.state.tasks.length;
        this.state.completedTasks = this.state.tasks.filter(t => t.status === 'completed').length;
        this.state.inProgressTasks = this.state.tasks.filter(t => t.status === 'in_progress').length;
        
        // 计算逾期任务
        const now = new Date();
        this.state.overdueTasks = this.state.tasks.filter(t => 
            t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed'
        ).length;
        
        // 更新快速筛选计数
        this.state.quickFilters.forEach(filter => {
            switch (filter.id) {


                case 'due-today':
                    const today = new Date().toDateString();
                    filter.count = this.state.tasks.filter(t => 
                        t.dueDate && new Date(t.dueDate).toDateString() === today
                    ).length;
                    break;
                case 'overdue':
                    filter.count = this.state.overdueTasks;
                    break;
                case 'high-priority':
                    filter.count = this.state.tasks.filter(t => 
                        t.priority === 'critical' || t.priority === 'high'
                    ).length;
                    break;
                case 'in-progress':
                    filter.count = this.state.inProgressTasks;
                    break;
            }
        });
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', async () => {
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
        
        const taskProApp = new TaskProApp();
        await taskProApp.init();
        
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

