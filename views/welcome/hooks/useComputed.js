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

    /**
     * 工具函数：分组
     * @param {Array} arr - 需要分组的数组
     * @param {Function} keyFn - 返回分组key的函数
     * @returns {Object} 分组结果
     */
    function groupBy(arr, keyFn) {
        return arr.reduce((acc, item) => {
            const key = keyFn(item);
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});
    }

    // 计算属性定义
    const totalCards = computed(() => store.featureCards.value.length);

    const hasCards = computed(() => totalCards.value > 0);

    const cardsByStyle = computed(() => {
        const cards = store.featureCards.value;
        return groupBy(cards, card => card.style || 'default');
    });

    const cardsWithLinks = computed(() =>
        store.featureCards.value.filter(card => !!card.link)
    );

    const cardsWithoutLinks = computed(() =>
        store.featureCards.value.filter(card => !card.link)
    );

    const uniqueStyles = computed(() => {
        // 返回所有不同的style（去重）
        return Array.from(
            new Set(store.featureCards.value.map(card => card.style || 'default'))
        );
    });

    const cardsStats = computed(() => ({
        total: totalCards.value,
        withLinks: cardsWithLinks.value.length,
        withoutLinks: cardsWithoutLinks.value.length,
        styles: uniqueStyles.value
    }));

    return {
        totalCards,         // 功能卡片总数
        hasCards,           // 是否有卡片
        cardsByStyle,       // 按style分组
        cardsWithLinks,     // 有链接的卡片
        cardsWithoutLinks,  // 无链接的卡片
        uniqueStyles,       // 所有不同的style
        cardsStats          // 统计信息
    };
};
