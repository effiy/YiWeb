/**
 * 初始化逻辑组合式函数
 * 负责初始化应用及功能卡片数据加载
 * @author liangliang
 * 
 * @param {Object} store - 状态存储对象（包含featureCards, loading, error等）
 * @param {Object} methods - 方法对象（如showError等）
 * @returns {Function} init - 初始化函数
 */
export const useInit = (store, methods) => {

    /**
     * 初始化应用
     * 执行所有必要的初始化操作
     */
    const init = async () => {
        console.log('🚀 [初始化] 开始初始化应用...');
        try {
            store.featureCards = await methods.loadFeatureCards(store);
            // 预留：可在此添加更多初始化逻辑（如加载用户配置、初始化插件等）
            console.log('✅ [初始化] 应用初始化完成');
        } catch (err) {
            console.error('❌ [初始化] 应用初始化失败:', err);
        }
    };

    return init;
};
