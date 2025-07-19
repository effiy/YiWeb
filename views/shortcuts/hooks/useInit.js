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
     * 绑定事件监听器
     */
    const bindEventListeners = () => {
        // 绑定过滤器按钮点击事件
        document.addEventListener('click', (event) => {
            const filterBtn = event.target.closest('.filter-btn');
            if (filterBtn) {
                const category = filterBtn.getAttribute('data-category');
                if (category) {
                    methods.switchCategory(category);
                }
            }
        });

        // 绑定快捷键项点击事件（复制功能）
        document.addEventListener('click', (event) => {
            const shortcutKey = event.target.closest('.shortcut-key');
            if (shortcutKey) {
                const shortcut = shortcutKey.textContent;
                if (shortcut) {
                    methods.copyShortcut(shortcut);
                }
            }
        });

        // 绑定搜索功能
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('input', (event) => {
                const keyword = event.target.value;
                if (keyword) {
                    const searchResults = methods.searchShortcuts(keyword);
                    console.log('搜索结果:', searchResults);
                    // 这里可以实现搜索结果的显示逻辑
                }
            });
        }

        console.log('✅ [事件绑定] 事件监听器绑定完成');
    };

    /**
     * 执行完整的初始化流程
     */
    const runInit = async () => {
        await init();
        bindEventListeners();
    };

    // 页面加载完成后执行初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runInit);
    } else {
        runInit();
    }

    return {
        init,
        bindEventListeners,
        runInit
    };
}; 