/**
 * 任务页面计算属性管理
 * author: liangliang
 */

// 模块依赖改为全局方式
// import { getCategoriesConfig, categorizeTask } from '/views/tasks/hooks/store.js';

// 兼容Vue2和Vue3的computed获取方式
const computed = typeof Vue !== 'undefined' && Vue.computed ? Vue.computed : (fn) => fn;
/**
 * 计算属性工厂函数
 * 提供任务页面的各种计算属性
 * @param {Object} store - 数据存储对象
 * @returns {Object} 计算属性对象
 */
window.useComputed = (store) => {
    const {
        tasksData,
        searchQuery,
        selectedCategories,
        clickedItems,
        selectedTask,
        isDetailVisible,
        currentView,
        dateRange,
        timeFilter
    } = store;

    return {
        /**
         * 获取分类配置
         */
        categories: computed(() => window.window.getCategoriesConfig()),

        /**
         * 过滤后的任务数据
         * 根据搜索查询和选中的分类进行过滤
         */
        filteredTasksData: computed(() => {
            let filtered = tasksData.value;

            // 根据搜索查询过滤
            if (searchQuery.value) {
                const query = searchQuery.value.toLowerCase();
                filtered = filtered.filter(task => {
                    // 搜索标题
                    if (task.title && task.title.toLowerCase().includes(query)) {
                        return true;
                    }
                    
                    // 搜索描述
                    if (task.description && task.description.toLowerCase().includes(query)) {
                        return true;
                    }
                    
                    // 搜索输入内容
                    if (task.input && task.input.toLowerCase().includes(query)) {
                        return true;
                    }
                    
                    // 搜索输出内容
                    if (task.output && task.output.toLowerCase().includes(query)) {
                        return true;
                    }
                    
                    // 搜索功能名称
                    if (task.featureName && task.featureName.toLowerCase().includes(query)) {
                        return true;
                    }
                    
                    // 搜索卡片标题
                    if (task.cardTitle && task.cardTitle.toLowerCase().includes(query)) {
                        return true;
                    }
                    

                    
                    // 搜索步骤内容
                    if (task.steps) {
                        // 搜索所有步骤
                        for (const stepKey in task.steps) {
                            const stepContent = task.steps[stepKey];
                            if (typeof stepContent === 'string' && stepContent.toLowerCase().includes(query)) {
                                return true;
                            }
                        }
                    }
                    
                    // 搜索标签内容（如果有的话）
                    if (task.tags && Array.isArray(task.tags)) {
                        for (const tag of task.tags) {
                            if (tag.toLowerCase().includes(query)) {
                                return true;
                            }
                        }
                    }
                    
                    return false;
                });
            }

            // 根据选中的分类过滤
            if (selectedCategories.value.size > 0) {
                filtered = filtered.filter(task => {
                    const taskCategory = window.window.categorizeTask(task);
                    return selectedCategories.value.has(taskCategory);
                });
            }

            return filtered;
        }),

        /**
         * 是否有任务数据
         */
        hasTasksData: computed(() => {
            return tasksData.value.length > 0;
        }),

        /**
         * 是否有过滤后的任务数据
         */
        hasFilteredTasksData: computed(() => {
            return filteredTasksData.value.length > 0;
        }),

        /**
         * 显示的分类
         * 根据当前任务数据动态生成
         */
        displayCategories: computed(() => {
            const categories = window.getCategoriesConfig();
            const taskCategories = new Set();
            
            tasksData.value.forEach(task => {
                taskCategories.add(window.categorizeTask(task));
            });

            return categories.filter(category => taskCategories.has(category.key));
        }),

        /**
         * 任务统计信息
         */
        taskStatistics: computed(() => {
            const stats = {
                total: tasksData.value.length,
                filtered: filteredTasksData.value.length,
                categories: {}
            };

            // 按分类统计
            const categories = window.getCategoriesConfig();
            categories.forEach(category => {
                stats.categories[category.key] = 0;
            });

            tasksData.value.forEach(task => {
                const category = window.categorizeTask(task);
                if (stats.categories[category] !== undefined) {
                    stats.categories[category]++;
                }
            });

            return stats;
        }),

        /**
         * 搜索建议
         * 基于任务标题和内容生成搜索建议
         */
        searchSuggestions: computed(() => {
            const suggestions = new Set();
            
            tasksData.value.forEach(task => {
                // 添加任务标题中的关键词
                const titleWords = task.title.split(/[\s,，。.、]+/);
                titleWords.forEach(word => {
                    if (word.length > 1) {
                        suggestions.add(word);
                    }
                });

                // 添加输入输出中的关键词
                const inputWords = task.input.split(/[\s,，。.、]+/);
                inputWords.forEach(word => {
                    if (word.length > 1) {
                        suggestions.add(word);
                    }
                });

                const outputWords = task.output.split(/[\s,，。.、]+/);
                outputWords.forEach(word => {
                    if (word.length > 1) {
                        suggestions.add(word);
                    }
                });
            });

            return Array.from(suggestions).slice(0, 10);
        }),

        /**
         * 任务步骤预览
         * 获取任务的前几个步骤用于预览
         */
        getTaskStepsPreview: (task, maxSteps = 3) => {
            if (!task || !task.steps || !task.steps[0]) {
                return [];
            }

            const steps = task.steps[0];
            const previewSteps = [];
            
            Object.keys(steps).slice(0, maxSteps).forEach(key => {
                previewSteps.push({
                    number: key,
                    text: steps[key]
                });
            });

            return previewSteps;
        },



        /**
         * 任务卡片样式类
         * 根据任务状态和点击状态生成样式类
         */
        getTaskCardClass: (task) => {
            const classes = ['task-card'];
            
            // 检查是否被点击过
            const taskKey = task.title;
            if (clickedItems.value.has(taskKey)) {
                classes.push('clicked');
            }

            // 根据分类添加样式
            const category = window.categorizeTask(task);
            classes.push(`category-${category}`);

            return classes.join(' ');
        },

        /**
         * 任务分类信息
         * 获取任务的分类信息
         */
        getTaskCategoryInfo: (task) => {
            const category = window.categorizeTask(task);
            const categories = window.getCategoriesConfig();
            return categories.find(cat => cat.key === category) || categories[0];
        },

        /**
         * 当前选中的任务
         */
        selectedTask: computed(() => selectedTask.value),

        /**
         * 详情面板是否可见
         */
        isDetailVisible: computed(() => isDetailVisible.value),

        /**
         * 当前视图模式
         */
        currentView: computed(() => currentView.value),

        /**
         * 可用视图列表
         */
        availableViews: computed(() => [
            {
                key: 'list',
                name: '列表视图',
                icon: 'fas fa-list',
                description: '以列表形式查看和管理任务'
            }
        ]),



        /**
         * 日期范围
         */
        dateRange: computed(() => dateRange.value),

        /**
         * 时间过滤器
         */
        timeFilter: computed(() => timeFilter.value)
    };
}; 




