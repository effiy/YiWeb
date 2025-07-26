/**
 * 计算属性组合式函数
 * 提供基于shortcuts数据的常用计算属性
 * author: liangliang
 * 
 * @param {Object} store - 状态存储对象（包含shortcuts, filterBtns, currentCategory等）
 * @returns {Object} 计算属性集合
 */
export const useComputed = (store) => {
    const { computed } = Vue;
    const { shortcuts, filterBtns, editors, currentEditor, currentCategory, searchKeyword } = store;

    return {
        /**
         * 根据当前分类和搜索关键词过滤的快捷键数据
         */
        filteredShortcuts: computed(() => {
            if (!shortcuts.value) return [];
            
            let filteredData = shortcuts.value;
            
            // 1. 先按分类过滤
            if (currentCategory.value && currentCategory.value !== 'all') {
                filteredData = filteredData.filter(item => item.category === currentCategory.value);
            }
            
            // 2. 再按搜索关键词过滤
            if (searchKeyword.value && searchKeyword.value.trim()) {
                const keyword = searchKeyword.value.toLowerCase().trim();
                filteredData = filteredData.filter(category => {
                    // 搜索分类名称
                    if (category.name && category.name.toLowerCase().includes(keyword)) {
                        return true;
                    }
                    
                    // 搜索快捷键描述
                    if (category.shortcuts && Array.isArray(category.shortcuts)) {
                        return category.shortcuts.some(shortcut => 
                            (shortcut.desc && shortcut.desc.toLowerCase().includes(keyword)) ||
                            (shortcut.key && shortcut.key.toLowerCase().includes(keyword))
                        );
                    }
                    
                    return false;
                });
            }
            
            return filteredData;
        }),

        /**
         * 当前激活的过滤器按钮
         */
        activeFilterBtn: computed(() => {
            if (!filterBtns.value || !currentCategory.value) return null;
            return filterBtns.value.find(btn => btn.id === currentCategory.value);
        }),

        /**
         * 当前激活的编辑器
         */
        activeEditor: computed(() => {
            if (!editors.value || !currentEditor.value) return null;
            return editors.value.find(editor => editor.id === currentEditor.value);
        }),

        /**
         * 是否有快捷键数据
         */
        hasShortcuts: computed(() => {
            return shortcuts.value && shortcuts.value.length > 0;
        }),

        /**
         * 是否有过滤器按钮数据
         */
        hasFilterBtns: computed(() => {
            return filterBtns.value && filterBtns.value.length > 0;
        }),

        /**
         * 是否有编辑器数据
         */
        hasEditors: computed(() => {
            return editors.value && editors.value.length > 0;
        }),

        /**
         * 当前分类的快捷键总数
         */
        currentCategoryCount: computed(() => {
            return filteredShortcuts.value.length;
        }),

        /**
         * 是否有搜索关键词
         */
        hasSearchKeyword: computed(() => {
            return searchKeyword.value && searchKeyword.value.trim().length > 0;
        }),

        /**
         * 当前编辑器的分类过滤器按钮
         */
        currentEditorFilterBtns: computed(() => {
            if (!filterBtns.value || !currentEditor.value) return [];
            
            // 根据当前编辑器过滤分类按钮
            const editor = editors.value.find(e => e.id === currentEditor.value);
            if (!editor) return filterBtns.value;
            
            // 如果是 tmux，显示 tmux 相关的分类
            if (currentEditor.value === 'tmux') {
                return filterBtns.value.filter(btn => 
                    ['all', 'session', 'window', 'pane', 'copy', 'display', 'sync', 'config'].includes(btn.id)
                );
            }
            
            // 如果是 vim，显示 vim 相关的分类
            if (currentEditor.value === 'vim') {
                return filterBtns.value.filter(btn => 
                    ['all', 'movement', 'edit', 'search', 'visual', 'window', 'file', 'advanced'].includes(btn.id)
                );
            }
            
            // 如果是 vscode，显示 vscode 相关的分类
            if (currentEditor.value === 'vscode') {
                return filterBtns.value.filter(btn => 
                    ['all', 'file', 'edit', 'search', 'navigation', 'window', 'debug', 'advanced'].includes(btn.id)
                );
            }
            
            // 默认显示所有分类
            return filterBtns.value;
        })
    };
}; 