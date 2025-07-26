/**
 * 计算属性组合式函数
 * 提供基于featureCards数据的常用计算属性
 * @author liangliang
 * 
 * @param {Object} store - 状态存储对象（包含featureCards等）
 * @returns {Object} 计算属性集合
 */
export const useComputed = (store) => {
    const { computed } = Vue;
    const { featureCards, loading, error } = store;

    return {
        // 功能卡片数量
        featureCardsCount: computed(() => featureCards.value.length),
        
        // 是否有功能卡片
        hasFeatureCards: computed(() => featureCards.value.length > 0),
        
        // 是否正在加载
        isLoading: computed(() => loading.value),
        
        // 是否有错误
        hasError: computed(() => error.value !== null),
        
        // 错误信息
        errorMessage: computed(() => error.value)
    };
};
