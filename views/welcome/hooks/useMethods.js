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
     * 打开链接的统一方法
     * @param {string} link - 链接地址
     */
    const openLink = (link) => {
        if (!link) {
            showError('链接地址为空');
            return;
        }
        try {
            if (/^https?:\/\//.test(link)) {
                window.open(link, '_blank');
            } else {
                window.location.href = link;
            }
        } catch (err) {
            showError('打开链接失败: ' + (err && err.message ? err.message : '未知错误'));
        }
    };

    return {
        showError,
        showSuccess,
        fetchFeatureCards,
        openLink
    };
};
