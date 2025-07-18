/**
 * 初始化逻辑组合式函数
 * 负责从JSON文件加载featureCards数据
 * 
 * @param {Object} store - 状态存储对象
 * @param {Object} methods - 方法对象
 * @returns {Function} 初始化函数
 */
export const useInit = (store, methods) => {
    /**
     * 从JSON文件加载功能卡片数据
     * @returns {Promise<void>}
     */
    const loadFeatureCards = async () => {
        try {
            // 设置加载状态
            store.loading.value = true;
            store.error.value = null;
            
            // 从JSON文件加载数据
            const response = await fetch('/views/welcome/data/mock/featureCards.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 验证数据格式
            if (!Array.isArray(data)) {
                throw new Error('数据格式错误：期望数组格式');
            }
            
            // 更新功能卡片数据
            store.featureCards.value = data;
            
            console.log('✅ 功能卡片数据加载成功:', data.length, '个卡片');
            
        } catch (err) {
            // 处理错误
            store.error.value = err.message;
            console.error('❌ 加载功能卡片数据失败:', err);
            
            // 可以在这里添加错误处理逻辑，比如显示错误提示
            if (methods && methods.showError) {
                methods.showError('加载功能卡片失败，请刷新页面重试');
            }
        } finally {
            // 清除加载状态
            store.loading.value = false;
        }
    };
    
    /**
     * 初始化应用
     * 执行所有必要的初始化操作
     */
    const init = async () => {
        console.log('🚀 开始初始化应用...');
        
        try {
            // 加载功能卡片数据
            await loadFeatureCards();
            
            // 可以在这里添加其他初始化逻辑
            // 比如：加载用户配置、初始化插件等
            
            console.log('✅ 应用初始化完成');
            
        } catch (err) {
            console.error('❌ 应用初始化失败:', err);
        }
    };
    
    return init;
};
