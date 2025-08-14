/**
 * 网站标签管理页面方法处理
 * author: liangliang
 */

/**
 * 方法处理工厂函数
 * 处理用户交互、业务逻辑和事件响应
 * @param {Object} store - 数据存储对象
 * @param {Object} computed - 计算属性对象
 * @returns {Object} methods对象，包含各种处理方法
 */
export const useMethods = (store, computed) => {
    /**
     * 处理搜索输入
     * @param {Event} event - 输入事件
     */
    const handleSearchInput = (event) => {
        const value = event.target.value;
        store.setSearchKeyword(value);
    };

    /**
     * 处理搜索键盘事件
     * @param {KeyboardEvent} event - 键盘事件
     */
    const handleSearchKeydown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            // 可以在这里添加搜索建议功能
        }
    };

    /**
     * 清空搜索
     */
    const clearSearch = () => {
        store.setSearchKeyword('');
    };

    /**
     * 切换分类
     * @param {string} category - 分类ID
     */
    const switchCategory = (category) => {
        store.setCurrentCategory(category);
    };

    /**
     * 打开链接
     * @param {string} url - 链接地址
     */
    const openLink = (url) => {
        if (!url) return;
        if (/^https?:\/\//.test(url)) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            window.location.href = url;
        }
    };

    /**
     * 切换标签选中状态
     * @param {string} tag - 标签名称
     */
    const toggleTag = (tag) => {
        const index = store.selectedTags.value.indexOf(tag);
        if (index !== -1) {
            store.selectedTags.value.splice(index, 1);
        } else {
            store.selectedTags.value.push(tag);
        }
    };

    /**
     * 处理网站图标加载错误
     * @param {Event} event - 错误事件
     */
    const handleFaviconError = (event) => {
        event.target.style.display = 'none';
        const parent = event.target.parentElement;
        if (parent) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-globe';
            parent.appendChild(icon);
        }
    };

    /**
     * 格式化日期
     * @param {string} dateString - 日期字符串
     * @returns {string} 格式化后的日期
     */
    const formatDate = (dateString) => {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            
            if (days === 0) {
                return '今天';
            } else if (days === 1) {
                return '昨天';
            } else if (days < 7) {
                return `${days}天前`;
            } else {
                return date.toLocaleDateString('zh-CN');
            }
        } catch (error) {
            return '';
        }
    };

    /**
     * 获取标签使用次数
     * @param {string} tagName - 标签名称
     * @returns {number} 使用次数
     */
    const getTagCount = (tagName) => {
        return store.getTagCount(tagName);
    };

    /**
     * 切换URL展开状态
     * @param {Object} site - 网站对象
     */
    const toggleUrlExpansion = (site) => {
        if (!site.urlExpanded) {
            site.urlExpanded = true;
        } else {
            site.urlExpanded = false;
        }
    };

    /**
     * 检查URL是否溢出（需要显示展开按钮）
     * @param {string} url - URL字符串
     * @returns {boolean} 是否溢出
     */
    const isUrlOverflow = (url) => {
        if (!url) return false;
        
        // 创建一个临时元素来测量文本高度
        const tempElement = document.createElement('div');
        tempElement.style.cssText = `
            position: absolute;
            visibility: hidden;
            height: auto;
            width: 100%;
            font-size: 0.875rem;
            line-height: 1.4;
            word-break: break-all;
            max-height: 1.4em;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
        `;
        tempElement.textContent = url;
        
        // 添加到DOM中测量
        document.body.appendChild(tempElement);
        const scrollHeight = tempElement.scrollHeight;
        const clientHeight = tempElement.clientHeight;
        document.body.removeChild(tempElement);
        
        // 如果内容高度超过容器高度，说明需要展开
        return scrollHeight > clientHeight;
    };

    return {
        handleSearchInput,        // 处理搜索输入
        handleSearchKeydown,      // 处理搜索键盘事件
        clearSearch,              // 清空搜索
        switchCategory,           // 切换分类
        openLink,                 // 打开链接
        toggleTag,                // 切换标签选中状态
        handleFaviconError,       // 处理网站图标加载错误
        formatDate,               // 格式化日期
        getTagCount,              // 获取标签使用次数
        toggleUrlExpansion,       // 切换URL展开状态
        isUrlOverflow             // 检查URL是否溢出
    };
}; 

