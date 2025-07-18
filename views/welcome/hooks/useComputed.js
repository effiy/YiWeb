/**
 * 计算属性组合式函数
 * 提供基于featureCards数据的计算属性
 * 
 * @param {Object} store - 状态存储对象
 * @returns {Object} 计算属性对象
 */
export const useComputed = (store) => {
    const { computed } = Vue;
    
    return {
        /**
         * 功能卡片总数
         */
        totalCards: computed(() => store.featureCards.value.length),
        
        /**
         * 是否有功能卡片数据
         */
        hasCards: computed(() => store.featureCards.value.length > 0),
        
        /**
         * 按样式分类的功能卡片
         */
        cardsByStyle: computed(() => {
            const cards = store.featureCards.value;
            const grouped = {};
            
            cards.forEach(card => {
                const style = card.style || 'default';
                if (!grouped[style]) {
                    grouped[style] = [];
                }
                grouped[style].push(card);
            });
            
            return grouped;
        }),
        
        /**
         * 有链接的功能卡片
         */
        cardsWithLinks: computed(() => {
            return store.featureCards.value.filter(card => card.link);
        }),
        
        /**
         * 无链接的功能卡片
         */
        cardsWithoutLinks: computed(() => {
            return store.featureCards.value.filter(card => !card.link);
        }),
        
        /**
         * 功能卡片统计信息
         */
        cardsStats: computed(() => {
            const cards = store.featureCards.value;
            return {
                total: cards.length,
                withLinks: cards.filter(card => card.link).length,
                withoutLinks: cards.filter(card => !card.link).length,
                styles: [...new Set(cards.map(card => card.style || 'default'))]
            };
        })
    };
};
