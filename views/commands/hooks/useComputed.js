/**
 * Linux命令大全页面计算属性
 * author: liangliang
 */

/**
 * 计算属性工厂函数
 * 提供基于store数据的计算属性
 * @param {Object} store - 数据存储对象
 * @returns {Object} 计算属性对象
 */
export const useComputed = (store) => {
    // 兼容Vue2和Vue3的computed获取方式
    const vueComputed = typeof Vue !== 'undefined' && Vue.computed ? Vue.computed : (fn) => fn;

    /**
     * 过滤后的命令列表
     * 根据搜索关键词、分类和标签进行过滤
     */
    const filteredCommands = vueComputed(() => {
        let result = store.commands.value;

        // 按分类过滤
        if (store.currentCategory.value && store.currentCategory.value !== 'all') {
            result = result.filter(command => command.category === store.currentCategory.value);
        }

        // 按搜索关键词过滤
        if (store.searchKeyword.value) {
            const keyword = store.searchKeyword.value.toLowerCase();
            result = result.filter(command => {
                // 基础搜索：命令名、语法、描述、标签
                const basicMatch = command.name.toLowerCase().includes(keyword) ||
                                 command.syntax.toLowerCase().includes(keyword) ||
                                 command.description.toLowerCase().includes(keyword) ||
                                 (command.tags && command.tags.some(tag => tag.toLowerCase().includes(keyword)));
                
                // 如果基础搜索匹配，直接返回
                if (basicMatch) return true;
                
                // 增强搜索：搜索示例内容
                if (command.examples && Array.isArray(command.examples)) {
                    const examplesMatch = command.examples.some(example => {
                        // 搜索示例命令
                        if (example.command && example.command.toLowerCase().includes(keyword)) {
                            return true;
                        }
                        // 搜索示例描述
                        if (example.description && example.description.toLowerCase().includes(keyword)) {
                            return true;
                        }
                        return false;
                    });
                    
                    if (examplesMatch) return true;
                }
                
                // 搜索分类
                if (command.category && command.category.toLowerCase().includes(keyword)) {
                    return true;
                }
                
                // 搜索难度级别
                if (command.difficulty && command.difficulty.toLowerCase().includes(keyword)) {
                    return true;
                }
                
                return false;
            });
        }

        // 按选中的标签过滤
        if (store.selectedTags.value && store.selectedTags.value.length > 0) {
            result = result.filter(command => {
                return command.tags && command.tags.some(tag => 
                    store.selectedTags.value.includes(tag)
                );
            });
        }

        return result;
    });

    /**
     * 是否有搜索关键词
     */
    const hasSearchKeyword = vueComputed(() => {
        return store.searchKeyword.value && store.searchKeyword.value.trim().length > 0;
    });

    /**
     * 是否有选中的标签
     */
    const hasSelectedTags = vueComputed(() => {
        return store.selectedTags.value && store.selectedTags.value.length > 0;
    });

    /**
     * 当前分类的命令数量
     */
    const currentCategoryCount = vueComputed(() => {
        if (store.currentCategory.value === 'all') {
            return store.commands.value.length;
        }
        return store.commands.value.filter(command => 
            command.category === store.currentCategory.value
        ).length;
    });

    /**
     * 搜索结果数量
     */
    const searchResultsCount = vueComputed(() => {
        return filteredCommands.value.length;
    });

    /**
     * 所有分类列表
     */
    const allCategories = vueComputed(() => {
        const categories = new Set();
        store.commands.value.forEach(command => {
            if (command.category) {
                categories.add(command.category);
            }
        });
        return Array.from(categories).sort();
    });

    /**
     * 分类统计信息
     */
    const categoryStats = vueComputed(() => {
        const stats = {};
        store.commands.value.forEach(command => {
            const category = command.category || '未分类';
            stats[category] = (stats[category] || 0) + 1;
        });
        return stats;
    });

    /**
     * 难度级别统计
     */
    const difficultyStats = vueComputed(() => {
        const stats = { easy: 0, medium: 0, hard: 0 };
        store.commands.value.forEach(command => {
            const difficulty = command.difficulty || 'medium';
            if (stats.hasOwnProperty(difficulty)) {
                stats[difficulty]++;
            }
        });
        return stats;
    });

    /**
     * 标签统计信息
     */
    const tagStats = vueComputed(() => {
        const stats = {};
        store.commands.value.forEach(command => {
            if (command.tags && Array.isArray(command.tags)) {
                command.tags.forEach(tag => {
                    stats[tag] = (stats[tag] || 0) + 1;
                });
            }
        });
        return stats;
    });

    /**
     * 最常用的标签（前10个）
     */
    const topTags = vueComputed(() => {
        const stats = tagStats.value;
        return Object.entries(stats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([tag, count]) => ({ tag, count }));
    });

    /**
     * 最近添加的命令
     */
    const recentCommands = vueComputed(() => {
        return [...store.commands.value]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);
    });

    /**
     * 按难度分组的命令
     */
    const commandsByDifficulty = vueComputed(() => {
        const grouped = { easy: [], medium: [], hard: [] };
        store.commands.value.forEach(command => {
            const difficulty = command.difficulty || 'medium';
            if (grouped.hasOwnProperty(difficulty)) {
                grouped[difficulty].push(command);
            }
        });
        return grouped;
    });

    /**
     * 搜索建议
     */
    const searchSuggestions = vueComputed(() => {
        if (!store.searchKeyword.value || store.searchKeyword.value.length < 2) {
            return [];
        }

        const keyword = store.searchKeyword.value.toLowerCase();
        const suggestions = new Set();

        store.commands.value.forEach(command => {
            // 命令名建议
            if (command.name.toLowerCase().includes(keyword)) {
                suggestions.add(command.name);
            }
            
            // 标签建议
            if (command.tags) {
                command.tags.forEach(tag => {
                    if (tag.toLowerCase().includes(keyword)) {
                        suggestions.add(tag);
                    }
                });
            }
        });

        return Array.from(suggestions).slice(0, 5);
    });

    /**
     * 页面标题
     */
    const pageTitle = vueComputed(() => {
        let title = 'Linux命令大全';
        
        if (store.currentCategory.value && store.currentCategory.value !== 'all') {
            title += ` - ${store.currentCategory.value}`;
        }
        
        if (store.searchKeyword.value) {
            title += ` - 搜索"${store.searchKeyword.value}"`;
        }
        
        return title;
    });

    /**
     * 页面描述
     */
    const pageDescription = vueComputed(() => {
        let description = `共收录 ${store.commands.value.length} 个Linux命令`;
        
        if (store.currentCategory.value && store.currentCategory.value !== 'all') {
            description += `，当前分类：${store.currentCategory.value}`;
        }
        
        if (store.searchKeyword.value) {
            description += `，搜索结果：${searchResultsCount.value} 个`;
        }
        
        return description;
    });

    return {
        filteredCommands,
        hasSearchKeyword,
        hasSelectedTags,
        currentCategoryCount,
        searchResultsCount,
        allCategories,
        categoryStats,
        difficultyStats,
        tagStats,
        topTags,
        recentCommands,
        commandsByDifficulty,
        searchSuggestions,
        pageTitle,
        pageDescription
    };
}; 
