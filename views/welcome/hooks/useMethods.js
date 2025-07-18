/**
 * 方法函数组合式函数
 * 提供与featureCards相关的操作方法
 * 
 * @param {Object} store - 状态存储对象
 * @returns {Object} 方法对象
 */
export const useMethods = (store) => {
    /**
     * 显示错误信息
     * @param {string} message - 错误信息
     */
    const showError = (message) => {
        console.error('错误信息:', message);
        // 这里可以集成UI组件来显示错误提示
        // 比如使用toast、modal等组件
        alert(message); // 临时使用alert，实际项目中应该使用更好的UI组件
    };
    
    /**
     * 显示成功信息
     * @param {string} message - 成功信息
     */
    const showSuccess = (message) => {
        console.log('成功信息:', message);
        // 这里可以集成UI组件来显示成功提示
    };
    
    /**
     * 重新加载功能卡片数据
     */
    const reloadFeatureCards = async () => {
        try {
            store.loading.value = true;
            store.error.value = null;
            
            const response = await fetch('/views/welcome/data/mock/featureCards.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!Array.isArray(data)) {
                throw new Error('数据格式错误：期望数组格式');
            }
            
            store.featureCards.value = data;
            showSuccess('功能卡片数据重新加载成功');
            
        } catch (err) {
            store.error.value = err.message;
            showError('重新加载功能卡片失败: ' + err.message);
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
        return index >= 0 && index < cards.length ? cards[index] : null;
    };
    
    /**
     * 根据标题查找功能卡片
     * @param {string} title - 卡片标题
     * @returns {Object|null} 功能卡片对象或null
     */
    const findCardByTitle = (title) => {
        return store.featureCards.value.find(card => card.title === title) || null;
    };
    
    /**
     * 根据样式查找功能卡片
     * @param {string} style - 卡片样式
     * @returns {Array} 匹配的功能卡片数组
     */
    const findCardsByStyle = (style) => {
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
            if (card.link.startsWith('http')) {
                // 外部链接，在新窗口打开
                window.open(card.link, '_blank');
            } else {
                // 内部链接，在当前窗口跳转
                window.location.href = card.link;
            }
        } catch (err) {
            showError('跳转失败: ' + err.message);
        }
    };
    
    /**
     * 获取功能卡片统计信息
     * @returns {Object} 统计信息对象
     */
    const getCardsStatistics = () => {
        const cards = store.featureCards.value;
        const stats = {
            total: cards.length,
            withLinks: 0,
            withoutLinks: 0,
            styles: new Set(),
            badges: new Set()
        };
        
        cards.forEach(card => {
            if (card.link) {
                stats.withLinks++;
            } else {
                stats.withoutLinks++;
            }
            
            if (card.style) {
                stats.styles.add(card.style);
            }
            
            if (card.badge) {
                stats.badges.add(card.badge);
            }
        });
        
        stats.styles = Array.from(stats.styles);
        stats.badges = Array.from(stats.badges);
        
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
