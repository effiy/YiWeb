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
    const { shortcuts, filterBtns, currentCategory } = store;

    return {
        /**
         * 根据当前分类过滤的快捷键数据
         */
        filteredShortcuts: computed(() => {
            if (!shortcuts.value || !currentCategory.value) return [];
            return shortcuts.value.filter(item => item.category === currentCategory.value);
        }),

        /**
         * 当前激活的过滤器按钮
         */
        activeFilterBtn: computed(() => {
            if (!filterBtns.value || !currentCategory.value) return null;
            return filterBtns.value.find(btn => btn.id === currentCategory.value);
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
         * 当前分类的快捷键总数
         */
        currentCategoryCount: computed(() => {
            return filteredShortcuts.value.length;
        })
    };
}; 