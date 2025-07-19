/**
 * 快捷键页面数据存储管理
 * author: liangliang
 */

import { getData } from '/apis/index.js';

// 兼容Vue2和Vue3的ref获取方式
const vueRef = typeof Vue !== 'undefined' && Vue.ref ? Vue.ref : (val) => ({ value: val });

/**
 * 数据存储工厂函数
 * 管理快捷键数据、过滤器数据、加载状态和错误信息
 * @returns {Object} store对象，包含shortcuts, filterBtns, loading, error, loadShortcuts, loadFilterBtns方法
 */
export const createStore = () => {
    // 快捷键数据
    const shortcuts = vueRef([]);
    // 过滤器按钮数据
    const filterBtns = vueRef([]);
    // 当前选中的分类
    const currentCategory = vueRef('all');
    // 加载状态
    const loading = vueRef(false);
    // 错误信息
    const error = vueRef(null);

    /**
     * 异步加载快捷键数据
     * 支持多次调用，自动处理加载状态和错误
     */
    const loadShortcuts = async () => {
        loading.value = true;
        error.value = null;
        try {
            // 支持本地mock和远程接口切换
            const data = await getData('/views/shortcuts/data/mock/shortcuts.json');
            if (Array.isArray(data)) {
                shortcuts.value = data;
            } else {
                throw new Error('数据格式错误');
            }
        } catch (err) {
            error.value = err && err.message ? err.message : '加载快捷键数据失败';
            shortcuts.value = [];
        } finally {
            loading.value = false;
        }
    };

    /**
     * 异步加载过滤器按钮数据
     * 支持多次调用，自动处理加载状态和错误
     */
    const loadFilterBtns = async () => {
        try {
            const data = await getData('/views/shortcuts/data/mock/filterBtns.json');
            if (Array.isArray(data)) {
                filterBtns.value = data;
            } else {
                throw new Error('过滤器数据格式错误');
            }
        } catch (err) {
            console.error('加载过滤器数据失败:', err);
            filterBtns.value = [];
        }
    };

    /**
     * 切换当前分类
     * @param {string} category - 分类ID
     */
    const setCurrentCategory = (category) => {
        if (category && typeof category === 'string') {
            currentCategory.value = category;
        }
    };

    // 自动初始化加载
    loadShortcuts();
    loadFilterBtns();

    // 便于扩展：后续可添加更多数据和方法
    return {
        shortcuts,           // 快捷键数据
        filterBtns,         // 过滤器按钮数据
        currentCategory,    // 当前选中的分类
        loading,            // 加载状态
        error,              // 错误信息
        loadShortcuts,      // 手动刷新快捷键数据方法
        loadFilterBtns,     // 手动刷新过滤器数据方法
        setCurrentCategory  // 切换分类方法
    };
}; 