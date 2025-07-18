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
    // 功能卡片数据
    const featureCards = vueRef([]);
    // 加载状态
    const loading = vueRef(false);
    // 错误信息
    const error = vueRef(null);

    /**
     * 异步加载功能卡片数据
     * 支持多次调用，自动处理加载状态和错误
     */
    const loadFeatureCards = async () => {
        loading.value = true;
        error.value = null;
        try {
            // 支持本地mock和远程接口切换
            const data = await getData('/views/welcome/data/mock/featureCards.json');
            if (Array.isArray(data)) {
                featureCards.value = data;
            } else {
                throw new Error('数据格式错误');
            }
        } catch (err) {
            error.value = err && err.message ? err.message : '加载数据失败';
            featureCards.value = [];
        } finally {
            loading.value = false;
        }
    };

    // 自动初始化加载
    loadFeatureCards();

    // 便于扩展：后续可添加更多数据和方法
    return {
        featureCards,   // 功能卡片数据
        loading,        // 加载状态
        error,          // 错误信息
        loadFeatureCards // 手动刷新方法
    };
}