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
     * 加载功能卡片数据（支持本地mock和远程接口）
     * @returns {Promise<void>}
     */
    const loadFeatureCards = async () => {
        store.loading.value = true;
        store.error.value = null;
        try {
            // 优先使用统一的数据获取方法，便于后续切换数据源
            let data;
            if (methods && typeof methods.getData === 'function') {
                data = await methods.getData('/views/welcome/data/mock/featureCards.json');
            } else if (typeof fetch === 'function') {
                const response = await fetch('/views/welcome/data/mock/featureCards.json');
                if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);
                data = await response.json();
            } else {
                throw new Error('未找到可用的数据加载方法');
            }

            if (!Array.isArray(data)) throw new Error('数据格式错误：期望数组格式');
            store.featureCards.value = data;
            console.log(`✅ 功能卡片数据加载成功，共${data.length}个卡片`);
        } catch (err) {
            store.error.value = err && err.message ? err.message : '加载数据失败';
            store.featureCards.value = [];
            console.error('❌ 加载功能卡片数据失败:', err);
            if (methods && typeof methods.showError === 'function') {
                methods.showError('加载功能卡片失败，请刷新页面重试');
            }
        } finally {
            store.loading.value = false;
        }
    };

    /**
     * 初始化应用
     * 执行所有必要的初始化操作
     */
    const init = async () => {
        console.log('🚀 [初始化] 开始初始化应用...');
        try {
            await loadFeatureCards();
            // 预留：可在此添加更多初始化逻辑（如加载用户配置、初始化插件等）
            console.log('✅ [初始化] 应用初始化完成');
        } catch (err) {
            console.error('❌ [初始化] 应用初始化失败:', err);
        }
    };

    return init;
};
