/**
 * 方法函数组合式
 * 提供与shortcuts相关的常用操作方法
 * author: liangliang
 * 
 * @param {Object} store - 状态存储对象
 * @returns {Object} 方法集合
 */
export const useMethods = (store) => {
    const { shortcuts, filterBtns, editors } = store;

    /**
     * 显示错误信息（可扩展为UI弹窗/Toast）
     * @param {string} message - 错误信息
     */
    const showError = (message) => {
        if (!message) return;
        // 这里建议后续集成UI组件替换alert
        alert(`❌ ${message}`);
        console.error('[错误]', message);
    };

    /**
     * 显示成功信息（可扩展为UI弹窗/Toast）
     * @param {string} message - 成功信息
     */
    const showSuccess = (message) => {
        if (!message) return;
        // 这里建议后续集成UI组件替换alert
        console.log('[成功]', message);
    };

    /**
     * 切换编辑器
     * @param {string} editorId - 编辑器ID
     */
    const switchEditor = async (editorId) => {
        if (!editorId || typeof editorId !== 'string') {
            showError('编辑器参数无效');
            return;
        }

        try {
            // 检查编辑器是否存在
            const editor = editors.value.find(e => e.id === editorId);
            if (!editor) {
                showError('编辑器不存在');
                return;
            }

            // 更新当前编辑器
            await store.setCurrentEditor(editorId);
            
            // 重置分类为全部
            store.setCurrentCategory('all');
            
            // 清空搜索
            store.setSearchKeyword('');

            showSuccess(`已切换到${editor.name}编辑器`);
            console.log(`[编辑器切换] 切换到: ${editor.name} (${editorId})`);
        } catch (err) {
            showError('切换编辑器失败: ' + (err && err.message ? err.message : '未知错误'));
        }
    };

    /**
     * 切换分类过滤器
     * @param {string} category - 分类ID
     */
    const switchCategory = (category) => {
        if (!category || typeof category !== 'string') {
            showError('分类参数无效');
            return;
        }

        try {
            // 更新当前分类
            store.setCurrentCategory(category);
            
            // 更新过滤器按钮状态
            if (filterBtns.value && filterBtns.value.length > 0) {
                filterBtns.value.forEach(btn => {
                    btn.active = btn.id === category;
                });
            }

            showSuccess(`已切换到${category}分类`);
            console.log(`[分类切换] 切换到: ${category}`);
        } catch (err) {
            showError('切换分类失败: ' + (err && err.message ? err.message : '未知错误'));
        }
    };

    /**
     * 打开链接的统一方法
     * @param {string} link - 链接地址
     */
    const openLink = (link) => {
        if (!link) {
            showError('链接地址为空');
            return;
        }
        try {
            if (/^https?:\/\//.test(link)) {
                window.open(link, '_blank');
            } else {
                window.location.href = link;
            }
        } catch (err) {
            showError('打开链接失败: ' + (err && err.message ? err.message : '未知错误'));
        }
    };

    /**
     * 复制快捷键到剪贴板
     * @param {string} shortcut - 快捷键
     */
    const copyShortcut = async (shortcut) => {
        if (!shortcut) {
            showError('快捷键为空');
            return;
        }

        try {
            await navigator.clipboard.writeText(shortcut);
            showSuccess(`已复制快捷键: ${shortcut}`);
        } catch (err) {
            // 降级方案：使用传统方法复制
            const textArea = document.createElement('textarea');
            textArea.value = shortcut;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showSuccess(`已复制快捷键: ${shortcut}`);
        }
    };

    /**
     * 搜索快捷键
     * @param {string} keyword - 搜索关键词
     */
    const searchShortcuts = (keyword) => {
        if (!keyword || typeof keyword !== 'string') {
            return shortcuts.value || [];
        }

        const searchTerm = keyword.toLowerCase().trim();
        if (!searchTerm) {
            return shortcuts.value || [];
        }

        return (shortcuts.value || []).filter(category => {
            // 搜索分类名称
            if (category.name && category.name.toLowerCase().includes(searchTerm)) {
                return true;
            }
            
            // 搜索快捷键描述
            if (category.shortcuts && Array.isArray(category.shortcuts)) {
                return category.shortcuts.some(shortcut => 
                    shortcut.desc && shortcut.desc.toLowerCase().includes(searchTerm)
                );
            }
            
            return false;
        });
    };

    /**
     * 处理搜索输入
     * @param {Event} event - 输入事件
     */
    const handleSearchInput = (event) => {
        const value = event.target.value;
        store.setSearchKeyword(value);
        
        // 记录搜索行为
        if (value.trim()) {
            console.log(`[搜索] 关键词: ${value}`);
        }
    };

    /**
     * 清空搜索
     */
    const clearSearch = () => {
        store.setSearchKeyword('');
        // 聚焦到输入框
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.focus();
        }
        showSuccess('已清空搜索');
    };

    /**
     * 处理搜索键盘事件
     * @param {KeyboardEvent} event - 键盘事件
     */
    const handleSearchKeydown = (event) => {
        // 处理回车键搜索
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const searchKeyword = store.searchKeyword;
            if (searchKeyword && searchKeyword.trim()) {
                console.log(`[搜索执行] 关键词: ${searchKeyword}`);
                // 这里可以添加搜索执行逻辑
            }
        }
        
        // 处理ESC键清空搜索
        if (event.key === 'Escape') {
            event.preventDefault();
            clearSearch();
        }
    };

    return {
        showError,
        showSuccess,
        switchEditor,
        switchCategory,
        openLink,
        copyShortcut,
        searchShortcuts,
        handleSearchInput,
        clearSearch,
        handleSearchKeydown
    };
}; 