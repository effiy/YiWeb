/**
 * 方法函数组合式
 * 提供与featureCards相关的常用操作方法
 * @author liangliang
 * 
 * @param {Object} store - 状态存储对象（包含featureCards, loading, error等）
 * @returns {Object} 方法集合
 */
export const useMethods = (store) => {
    /**
     * 显示错误信息（可扩展为UI弹窗/Toast）
     * @param {string} message - 错误信息
     */
    const showError = (message) => {
        if (!message) return;
        // 这里建议后续集成UI组件替换alert
        alert(`❌ ${message}`);
        console.error('[错误]', message);
    };

    /**
     * 显示成功信息（可扩展为UI弹窗/Toast）
     * @param {string} message - 成功信息
     */
    const showSuccess = (message) => {
        if (!message) return;
        // 这里建议后续集成UI组件替换alert
        // alert(`✅ ${message}`);
        console.log('[成功]', message);
    };

    /**
     * 统一的数据加载方法
     * 支持后续切换为远程接口或本地mock
     * @returns {Promise<Array>} 功能卡片数组
     */
    const fetchFeatureCards = async () => {
        try {
            const response = await fetch('/views/welcome/data/mock/featureCards.json');
            if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);
            const data = await response.json();
            if (!Array.isArray(data)) throw new Error('数据格式错误：期望数组格式');
            return data;
        } catch (err) {
            throw err;
        }
    };

    /**
     * 重新加载功能卡片数据
     */
    const reloadFeatureCards = async () => {
        store.loading.value = true;
        store.error.value = null;
        try {
            const data = await fetchFeatureCards();
            store.featureCards.value = data;
            showSuccess('功能卡片数据重新加载成功');
        } catch (err) {
            store.error.value = err && err.message ? err.message : '加载失败';
            store.featureCards.value = [];
            showError('重新加载功能卡片失败: ' + store.error.value);
        } finally {
            store.loading.value = false;
        }
    };

    /**
     * 根据索引获取功能卡片
     * @param {number} index - 卡片索引
     * @returns {Object|null} 功能卡片对象或null
     */
    const getCardByIndex = (index) => {
        const cards = store.featureCards.value;
        if (!Array.isArray(cards)) return null;
        return (index >= 0 && index < cards.length) ? cards[index] : null;
    };

    /**
     * 根据标题查找功能卡片
     * @param {string} title - 卡片标题
     * @returns {Object|null} 功能卡片对象或null
     */
    const findCardByTitle = (title) => {
        if (!title) return null;
        return store.featureCards.value.find(card => card.title === title) || null;
    };

    /**
     * 根据样式查找功能卡片
     * @param {string} style - 卡片样式
     * @returns {Array} 匹配的功能卡片数组
     */
    const findCardsByStyle = (style) => {
        if (!style) return [];
        return store.featureCards.value.filter(card => card.style === style);
    };

    /**
     * 跳转到功能卡片链接
     * @param {Object} card - 功能卡片对象
     */
    const navigateToCard = (card) => {
        if (!card || !card.link) {
            showError('该功能暂未开放，敬请期待');
            return;
        }
        try {
            if (/^https?:\/\//.test(card.link)) {
                window.open(card.link, '_blank');
            } else {
                window.location.href = card.link;
            }
        } catch (err) {
            showError('跳转失败: ' + (err && err.message ? err.message : '未知错误'));
        }
    };

    /**
     * 获取功能卡片统计信息
     * @returns {Object} 统计信息对象
     */
    const getCardsStatistics = () => {
        const cards = store.featureCards.value;
        const stats = {
            total: 0,
            withLinks: 0,
            withoutLinks: 0,
            styles: [],
            badges: []
        };
        if (!Array.isArray(cards)) return stats;
        const styleSet = new Set();
        const badgeSet = new Set();
        cards.forEach(card => {
            stats.total++;
            if (card.link) stats.withLinks++;
            else stats.withoutLinks++;
            if (card.style) styleSet.add(card.style);
            if (card.badge) badgeSet.add(card.badge);
        });
        stats.styles = Array.from(styleSet);
        stats.badges = Array.from(badgeSet);
        return stats;
    };

    return {
        showError,
        showSuccess,
        reloadFeatureCards,
        getCardByIndex,
        findCardByTitle,
        findCardsByStyle,
        navigateToCard,
        getCardsStatistics
    };
};
