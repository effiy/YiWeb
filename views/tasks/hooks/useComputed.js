/**
 * 任务页面计算属性管理
 * author: liangliang
 */

import { getCategoriesConfig, categorizeTask } from '/views/tasks/hooks/store.js';

// 兼容Vue2和Vue3的computed获取方式
const computed = typeof Vue !== 'undefined' && Vue.computed ? Vue.computed : (fn) => fn;
/**
 * 计算属性工厂函数
 * 提供任务页面的各种计算属性
 * @param {Object} store - 数据存储对象
 * @returns {Object} 计算属性对象
 */
export const useComputed = (store) => {
    const {
        tasksData,
        searchQuery,
        selectedCategories,
        clickedItems,
        selectedTask,
        isDetailVisible
    } = store;

    return {
        /**
         * 获取分类配置
         */
        categories: computed(() => getCategoriesConfig()),

        /**
         * 过滤后的任务数据
         * 根据搜索查询和选中的分类进行过滤
         */
        filteredTasksData: computed(() => {
            let filtered = tasksData.value;

            // 根据搜索查询过滤
            if (searchQuery.value) {
                const query = searchQuery.value.toLowerCase();
                filtered = filtered.filter(task => 
                    task.title.toLowerCase().includes(query) ||
                    task.input.toLowerCase().includes(query) ||
                    task.output.toLowerCase().includes(query) ||
                    Object.values(task.steps[0] || {}).some(step => 
                        step.toLowerCase().includes(query)
                    )
                );
            }

            // 根据选中的分类过滤
            if (selectedCategories.value.size > 0) {
                filtered = filtered.filter(task => {
                    const taskCategory = categorizeTask(task);
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
            const categories = getCategoriesConfig();
            const taskCategories = new Set();
            
            tasksData.value.forEach(task => {
                taskCategories.add(categorizeTask(task));
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
            const categories = getCategoriesConfig();
            categories.forEach(category => {
                stats.categories[category.key] = 0;
            });

            tasksData.value.forEach(task => {
                const category = categorizeTask(task);
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
         * 任务时间格式化
         * 将时间转换为可读格式
         */
        formatTaskTime: (time) => {
            if (typeof time === 'number') {
                return `${time} 小时`;
            }
            return time || '未设置';
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
            const category = categorizeTask(task);
            classes.push(`category-${category}`);

            return classes.join(' ');
        },

        /**
         * 任务分类信息
         * 获取任务的分类信息
         */
        getTaskCategoryInfo: (task) => {
            const category = categorizeTask(task);
            const categories = getCategoriesConfig();
            return categories.find(cat => cat.key === category) || categories[0];
        },

        /**
         * 当前选中的任务
         */
        selectedTask: computed(() => selectedTask.value),

        /**
         * 详情面板是否可见
         */
        isDetailVisible: computed(() => isDetailVisible.value)
    };
}; 
