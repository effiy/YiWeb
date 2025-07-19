/**
 * 初始化逻辑组合式函数
 * 负责初始化应用及快捷键数据加载
 * author: liangliang
 * 
 * @param {Object} store - 状态存储对象（包含shortcuts, filterBtns, loading, error等）
 * @param {Object} methods - 方法对象（如switchCategory, showError等）
 * @returns {Function} init - 初始化函数
 */
export const useInit = (store, methods) => {

    /**
     * 初始化应用
     * 执行所有必要的初始化操作
     */
    const init = async () => {
        console.log('🚀 [快捷键页面初始化] 开始初始化应用...');
        try {
            // 数据已在store中自动加载，这里可以添加额外的初始化逻辑
            console.log('✅ [快捷键页面初始化] 应用初始化完成');
            
            // 预留：可在此添加更多初始化逻辑（如加载用户配置、初始化插件等）
            // 例如：设置默认分类、绑定事件监听器等
            
        } catch (err) {
            console.error('❌ [快捷键页面初始化] 应用初始化失败:', err);
            methods.showError('应用初始化失败: ' + (err && err.message ? err.message : '未知错误'));
        }
    };

    /**
     * 事件处理器集合
     * 集中管理所有事件处理逻辑
     */
    const eventHandlers = {
        /**
         * 处理过滤器按钮点击事件
         * @param {string} category - 分类ID
         */
        handleFilterClick: (category) => {
            if (!category) {
                console.warn('[事件处理] 过滤器按钮点击：分类ID为空');
                return;
            }
            
            console.log(`[事件处理] 过滤器按钮点击：${category}`);
            methods.switchCategory(category);
        },

        /**
         * 处理快捷键项点击事件（复制功能）
         * @param {string} shortcut - 快捷键文本
         */
        handleShortcutClick: (shortcut) => {
            if (!shortcut) {
                console.warn('[事件处理] 快捷键点击：快捷键为空');
                return;
            }
            
            console.log(`[事件处理] 快捷键点击：${shortcut}`);
            methods.copyShortcut(shortcut);
        },

        /**
         * 处理搜索输入事件
         * @param {Event} event - 输入事件对象
         */
        handleSearchInput: (event) => {
            const keyword = event.target.value;
            console.log(`[事件处理] 搜索输入：${keyword}`);
            
            // 更新搜索关键词
            store.setSearchKeyword(keyword);
            
            // 执行搜索（如果需要实时搜索）
            if (keyword.trim()) {
                const searchResults = methods.searchShortcuts(keyword);
                console.log('[搜索结果]', searchResults);
            }
        },

        /**
         * 处理搜索框键盘事件
         * @param {KeyboardEvent} event - 键盘事件对象
         */
        handleSearchKeydown: (event) => {
            const { key, ctrlKey, metaKey } = event;
            
            // ESC键清空搜索
            if (key === 'Escape') {
                console.log('[事件处理] 按下ESC键，清空搜索');
                methods.clearSearch();
                event.preventDefault();
                return;
            }
            
            // Ctrl/Cmd + K 聚焦搜索框
            if ((ctrlKey || metaKey) && key === 'k') {
                console.log('[事件处理] 按下Ctrl+K，聚焦搜索框');
                const messageInput = document.getElementById('messageInput');
                if (messageInput) {
                    messageInput.focus();
                    event.preventDefault();
                }
                return;
            }
            
            // Enter键执行搜索（可选）
            if (key === 'Enter') {
                console.log('[事件处理] 按下Enter键');
                event.preventDefault();
                // 可以在这里添加额外的搜索逻辑
            }
        },

        /**
         * 处理清空搜索按钮点击
         */
        handleClearSearch: () => {
            console.log('[事件处理] 清空搜索按钮点击');
            methods.clearSearch();
        },

        /**
         * 处理页面可见性变化
         */
        handleVisibilityChange: () => {
            if (document.hidden) {
                console.log('[事件处理] 页面隐藏');
            } else {
                console.log('[事件处理] 页面显示');
                // 可以在这里添加页面重新显示时的逻辑
            }
        },

        /**
         * 处理窗口大小变化
         */
        handleResize: () => {
            console.log(`[事件处理] 窗口大小变化：${window.innerWidth}x${window.innerHeight}`);
            // 可以在这里添加响应式布局调整逻辑
        }
    };

    /**
     * 绑定事件监听器
     * 使用更清晰的事件绑定方式，适配Vue框架
     */
    const bindEventListeners = () => {
        console.log('🔗 [事件绑定] 开始绑定事件监听器...');
        
        try {
            // 绑定全局事件监听器（仅用于非Vue管理的元素）
            window.addEventListener('visibilitychange', eventHandlers.handleVisibilityChange);
            window.addEventListener('resize', eventHandlers.handleResize);
            
            // 绑定搜索框事件（如果存在且不在Vue管理范围内）
            const messageInput = document.getElementById('messageInput');
            if (messageInput && !messageInput.hasAttribute('v-model')) {
                messageInput.addEventListener('input', eventHandlers.handleSearchInput);
                messageInput.addEventListener('keydown', eventHandlers.handleSearchKeydown);
            }
            
            console.log('✅ [事件绑定] 事件监听器绑定完成');
            
        } catch (err) {
            console.error('❌ [事件绑定] 事件监听器绑定失败:', err);
            methods.showError('事件绑定失败: ' + (err && err.message ? err.message : '未知错误'));
        }
    };

    /**
     * 解绑事件监听器
     * 用于清理事件监听器，防止内存泄漏
     */
    const unbindEventListeners = () => {
        console.log('🔗 [事件解绑] 开始解绑事件监听器...');
        
        try {
            // 解绑全局事件监听器
            window.removeEventListener('visibilitychange', eventHandlers.handleVisibilityChange);
            window.removeEventListener('resize', eventHandlers.handleResize);
            
            // 解绑搜索框事件
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.removeEventListener('input', eventHandlers.handleSearchInput);
                messageInput.removeEventListener('keydown', eventHandlers.handleSearchKeydown);
            }
            
            console.log('✅ [事件解绑] 事件监听器解绑完成');
            
        } catch (err) {
            console.error('❌ [事件解绑] 事件监听器解绑失败:', err);
        }
    };

    /**
     * 执行完整的初始化流程
     */
    const runInit = async () => {
        await init();
        bindEventListeners();
    };

    /**
     * 清理函数
     * 用于组件卸载时清理资源
     */
    const cleanup = () => {
        unbindEventListeners();
        console.log('🧹 [清理] 应用资源清理完成');
    };

    // 页面加载完成后执行初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runInit);
    } else {
        runInit();
    }

    // 页面卸载时清理资源
    window.addEventListener('beforeunload', cleanup);

    return {
        init,
        bindEventListeners,
        unbindEventListeners,
        runInit,
        cleanup,
        eventHandlers
    };
}; 