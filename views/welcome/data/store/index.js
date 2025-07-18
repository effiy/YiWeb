// 作者：liangliang

import { getData } from '/apis/index.js';

// 从全局Vue对象中解构需要的函数
const { ref } = Vue;

/**
 * 创建数据存储（store）
 * 用于管理功能卡片数据、加载状态和错误信息
 * @returns {Object} store对象，包含featureCards, loading, error, loadFeatureCards方法
 */
export const createStore = () => {
    // 功能卡片数据，初始为空数组
    const featureCards = ref([]);
    // 加载状态
    const loading = ref(false);
    // 错误信息
    const error = ref(null);

    /**
     * 异步加载功能卡片数据
     */
    const loadFeatureCards = async () => {
        loading.value = true;
        error.value = null;
        try {
            // 获取数据
            const data = await getData('/views/welcome/data/mock/featureCards.json');
            featureCards.value = data || [];
        } catch (err) {
            error.value = err.message || '加载数据失败';
            featureCards.value = [];
        } finally {
            loading.value = false;
        }
    };

    // 初始化时自动加载数据
    loadFeatureCards();

    return {
        featureCards,
        loading,
        error,
        loadFeatureCards, // 暴露方法，便于手动刷新
    }
}