// author: liangliang

import { getData } from '/apis/index.js';

// 兼容Vue2和Vue3的ref获取方式
const vueRef = typeof Vue !== 'undefined' && Vue.ref ? Vue.ref : (val) => ({ value: val });

/**
 * 数据存储工厂函数
 * 管理功能卡片数据、加载状态和错误信息
 * @returns {Object} store对象，包含featureCards, loading, error, loadFeatureCards方法
 */
export const createStore = () => {
    const fromSystem = vueRef(null)
    // 功能卡片数据 - 使用Vue的响应式系统
    const featureCards = vueRef([]);
    // 加载状态
    const loading = vueRef(false);
    // 错误信息
    const error = vueRef(null);

    /**
     * 强制触发Vue响应式更新
     * @param {Array} newData - 新数据
     */
    const updateFeatureCards = (newData) => {
        if (Array.isArray(newData)) {
            // 使用Vue的响应式更新方法
            if (Vue && Vue.nextTick) {
                Vue.nextTick(() => {
                    featureCards.value = [...newData];
                    console.log('[Store更新] 使用nextTick更新featureCards');
                });
            } else {
                // 备用方法：先清空再赋值
                featureCards.value = [];
                setTimeout(() => {
                    featureCards.value = [...newData];
                    console.log('[Store更新] 使用setTimeout更新featureCards');
                }, 0);
            }
        } else {
            console.warn('[Store更新] 数据不是数组格式:', newData);
            featureCards.value = [];
        }
    };

    /**
     * 异步加载功能卡片数据
     * 支持多次调用，自动处理加载状态和错误
     */
    const loadFeatureCards = async () => {
        console.log('[Store] 开始加载功能卡片数据');
        loading.value = true;
        error.value = null;
        try {
            // 支持本地mock和远程接口切换
            const featureCardsData = await getData(`${window.DATA_URL}/mock/welcome/featureCards.json`);
            const systemPromptData = await getData(`${window.DATA_URL}/prompts/welcome/featureCards.txt`);

            const mongoResponse = await getData(`${window.API_URL}/mongodb/?cname=goals`);

            const mongoData = mongoResponse.data.list;

            console.log('[Store] 加载到的mongo数据:', mongoData);
            
            // 设置系统提示
            if (systemPromptData) {
                fromSystem.value = systemPromptData + JSON.stringify(featureCardsData);
                console.log('[Store] 成功设置fromSystem');
            } else {
                console.warn('[Store] 系统提示数据为空');
                fromSystem.value = null;
            }
            // 使用更新方法设置数据
            updateFeatureCards(featureCardsData.concat(mongoData));
            console.log('[Store] 加载到的功能卡片数据:', featureCardsData);
            console.log('[Store] 加载到的系统提示数据:', systemPromptData);
        } catch (err) {
            console.error('[Store] 加载数据失败:', err);
            error.value = err && err.message ? err.message : '加载数据失败';
            featureCards.value = [];
            fromSystem.value = null;
        } finally {
            loading.value = false;
            console.log('[Store] 数据加载完成，当前状态:', {
                featureCardsLength: featureCards.value.length,
                fromSystem: fromSystem.value ? '已设置' : '未设置',
                loading: loading.value,
                error: error.value
            });
        }
    };

    // 自动初始化加载
    loadFeatureCards();

    // 便于扩展：后续可添加更多数据和方法
    return {
        featureCards,   // 功能卡片数据
        loading,        // 加载状态
        error,          // 错误信息
        fromSystem,     // 系统提示信息
        updateFeatureCards  // 更新方法
    };
}

