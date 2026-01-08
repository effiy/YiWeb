/**
 * 快捷键页面数据存储管理
 * author: liangliang
 */

import { getData } from '/src/services/index.js';

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
    // 编辑器列表数据
    const editors = vueRef([]);
    // 当前选中的编辑器
    const currentEditor = vueRef('vim');
    // 当前选中的分类
    const currentCategory = vueRef('all');
    // 搜索关键词
    const searchKeyword = vueRef('');
    // 加载状态
    const loading = vueRef(false);
    // 错误信息
    const error = vueRef(null);

    /**
     * 异步加载快捷键数据
     * 支持多次调用，自动处理加载状态和错误
     */
    const loadShortcuts = async (editorId = 'vim') => {
        loading.value = true;
        error.value = null;
        try {
            // 根据当前编辑器加载对应的数据文件
            const editor = editors.value.find(e => e.id === editorId);
            if (!editor) {
                throw new Error('编辑器不存在');
            }
            
            const dataFile = editor.dataFile || 'shortcuts.json';
            const data = await getData(`https://data.effiy.cn/mock/shortcuts/${dataFile}`);
            
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
            const data = await getData('https://data.effiy.cn/mock/shortcuts/filterBtns.json');
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
     * 异步加载编辑器列表数据
     * 支持多次调用，自动处理加载状态和错误
     */
    const loadEditors = async () => {
        try {
            const data = await getData('https://data.effiy.cn/mock/shortcuts/editors.json');
            if (Array.isArray(data)) {
                editors.value = data;
            } else {
                throw new Error('编辑器数据格式错误');
            }
        } catch (err) {
            console.error('加载编辑器数据失败:', err);
            editors.value = [];
        }
    };

    /**
     * 切换当前编辑器
     * @param {string} editorId - 编辑器ID
     */
    const setCurrentEditor = async (editorId) => {
        if (editorId && typeof editorId === 'string') {
            currentEditor.value = editorId;
            // 更新编辑器列表中的激活状态
            editors.value.forEach(editor => {
                editor.active = editor.id === editorId;
            });
            // 重新加载快捷键数据
            await loadShortcuts(editorId);
        }
    };

    /**
     * 切换当前分类
     * @param {string} category - 分类ID
     */
    const setCurrentCategory = (category) => {
        if (category && typeof category === 'string') {
            currentCategory.value = category;
            // 更新过滤器按钮的激活状态
            filterBtns.value.forEach(btn => {
                btn.active = btn.id === category;
            });
        }
    };

    /**
     * 设置搜索关键词
     * @param {string} keyword - 搜索关键词
     */
    const setSearchKeyword = (keyword) => {
        if (typeof keyword === 'string') {
            searchKeyword.value = keyword.trim();
        }
    };

    // 自动初始化加载
    loadEditors().then(() => {
        loadShortcuts(currentEditor.value);
    });
    loadFilterBtns();

    // 便于扩展：后续可添加更多数据和方法
    return {
        shortcuts,           // 快捷键数据
        filterBtns,         // 过滤器按钮数据
        editors,            // 编辑器列表数据
        currentEditor,      // 当前选中的编辑器
        currentCategory,    // 当前选中的分类
        searchKeyword,      // 搜索关键词
        loading,            // 加载状态
        error,              // 错误信息
        loadShortcuts,      // 手动刷新快捷键数据方法
        loadFilterBtns,     // 手动刷新过滤器数据方法
        loadEditors,        // 手动刷新编辑器数据方法
        setCurrentEditor,   // 切换编辑器方法
        setCurrentCategory, // 切换分类方法
        setSearchKeyword    // 设置搜索关键词方法
    };
}; 
