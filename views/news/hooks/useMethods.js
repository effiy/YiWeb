/**
 * 方法函数组合式
 * 提供与新闻相关的常用操作方法
 * author: liangliang
 * 
 * @param {Object} store - 状态存储对象
 * @returns {Object} 方法集合
 */
export const useMethods = (store) => {
    const { 
        newsData, 
        searchQuery, 
        selectedCategories, 
        selectedTags, 
        currentDate, 
        calendarMonth, 
        today,
        loading,
        error,
        errorMessage,
        clickedItems,
        searchHistory,
        sidebarCollapsed,
        tagStatistics,
        loadNewsData,
        setSearchQuery,
        toggleCategory,
        toggleTag,
        setCurrentDate,
        setCalendarMonth,
        toggleSidebar,
        addClickedItem,
        addSearchHistory,
        clearSearch,
        clearError,
        formatDate
    } = store;

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
     * 处理搜索输入
     * @param {Event} event - 输入事件
     */
    const handleSearchInput = (event) => {
        const value = event.target.value;
        setSearchQuery(value);
        
        // 记录搜索行为
        if (value.trim()) {
            console.log(`[搜索] 关键词: ${value}`);
        }
    };

    /**
     * 处理搜索键盘事件
     * @param {Event} event - 键盘事件
     */
    const handleSearchKeydown = (event) => {
        if (event.key === 'Escape') {
            event.target.value = '';
            setSearchQuery('');
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const query = searchQuery.value.trim();
            if (query) {
                addSearchHistory(query);
            }
        }
    };

    /**
     * 清空搜索
     */
    const handleClearSearch = () => {
        setSearchQuery('');
        selectedCategories.value.clear();
        selectedTags.value.clear();
        // 聚焦到输入框
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.focus();
        }
        showSuccess('已清空搜索');
    };

    /**
     * 切换分类选择
     * @param {string} category - 分类名称
     */
    const handleToggleCategory = (category) => {
        if (!category || typeof category !== 'string') {
            showError('分类参数无效');
            return;
        }

        try {
            toggleCategory(category);
            showSuccess(`已切换分类: ${category}`);
            console.log(`[分类切换] 切换到: ${category}`);
        } catch (err) {
            showError('切换分类失败: ' + (err && err.message ? err.message : '未知错误'));
        }
    };

    /**
     * 切换标签选择
     * @param {string} tag - 标签名称
     */
    const handleToggleTag = (tag) => {
        if (!tag || typeof tag !== 'string') {
            showError('标签参数无效');
            return;
        }

        try {
            toggleTag(tag);
            showSuccess(`已切换标签: ${tag}`);
            console.log(`[标签切换] 切换到: ${tag}`);
        } catch (err) {
            showError('切换标签失败: ' + (err && err.message ? err.message : '未知错误'));
        }
    };

    /**
     * 处理新闻点击
     * @param {Object} item - 新闻项
     */
    const handleNewsClick = (item) => {
        if (!item) {
            showError('新闻项无效');
            return;
        }

        try {
            const itemKey = item.link || item.title;
            addClickedItem(itemKey);
            
            setTimeout(() => clickedItems.value.delete(itemKey), 300);

            if (item.link) {
                window.open(item.link, '_blank', 'noopener,noreferrer');
                showSuccess('已打开新闻链接');
            } else {
                showError('新闻链接无效');
            }
        } catch (err) {
            showError('处理新闻点击失败: ' + (err && err.message ? err.message : '未知错误'));
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
            showSuccess('已打开链接');
        } catch (err) {
            showError('打开链接失败: ' + (err && err.message ? err.message : '未知错误'));
        }
    };

    /**
     * 日期导航方法
     */
    const goToPreviousDay = () => {
        try {
            const newDate = new Date(currentDate.value);
            newDate.setDate(newDate.getDate() - 1);
            setCurrentDate(newDate);
            
            updateUrlParams(newDate);
            
            const selectedYear = newDate.getFullYear();
            const selectedMonth = newDate.getMonth();
            setCalendarMonth(new Date(selectedYear, selectedMonth, 1));
            
            handleClearSearch();
            loading.value = true;
            
            showSuccess('已切换到前一天');
        } catch (err) {
            showError('切换日期失败: ' + (err && err.message ? err.message : '未知错误'));
        }
    };

    const goToNextDay = () => {
        try {
            const newDate = new Date(currentDate.value);
            newDate.setDate(newDate.getDate() + 1);
            
            const todayStr = formatDate(today.value);
            const newDateStr = formatDate(newDate);
            
            if (newDateStr > todayStr) {
                showError('无法查看未来日期的新闻');
                return;
            }
            
            setCurrentDate(newDate);
            updateUrlParams(newDate);
            
            const selectedYear = newDate.getFullYear();
            const selectedMonth = newDate.getMonth();
            setCalendarMonth(new Date(selectedYear, selectedMonth, 1));
            
            handleClearSearch();
            loading.value = true;
            
            showSuccess('已切换到后一天');
        } catch (err) {
            showError('切换日期失败: ' + (err && err.message ? err.message : '未知错误'));
        }
    };

    const goToToday = () => {
        try {
            setCurrentDate(new Date(today.value));
            updateUrlParams(today.value);
            
            const selectedYear = today.value.getFullYear();
            const selectedMonth = today.value.getMonth();
            setCalendarMonth(new Date(selectedYear, selectedMonth, 1));
            
            handleClearSearch();
            loading.value = true;
            
            showSuccess('已切换到今天');
        } catch (err) {
            showError('切换日期失败: ' + (err && err.message ? err.message : '未知错误'));
        }
    };

    /**
     * 日历导航方法
     */
    const previousMonth = () => {
        try {
            const newMonth = new Date(calendarMonth.value);
            newMonth.setMonth(newMonth.getMonth() - 1);
            setCalendarMonth(newMonth);
            showSuccess('已切换到上个月');
        } catch (err) {
            showError('切换月份失败: ' + (err && err.message ? err.message : '未知错误'));
        }
    };

    const nextMonth = () => {
        try {
            const currentYear = today.value.getFullYear();
            const currentMonth = today.value.getMonth();
            const calendarYear = calendarMonth.value.getFullYear();
            const calendarMonthNum = calendarMonth.value.getMonth();
            const isCurrentMonth = currentYear === calendarYear && currentMonth === calendarMonthNum;
            
            if (isCurrentMonth) {
                showError('已经是当前月份');
                return;
            }
            
            const newMonth = new Date(calendarMonth.value);
            newMonth.setMonth(newMonth.getMonth() + 1);
            setCalendarMonth(newMonth);
            showSuccess('已切换到下个月');
        } catch (err) {
            showError('切换月份失败: ' + (err && err.message ? err.message : '未知错误'));
        }
    };

    const selectDate = (date) => {
        try {
            const dateStr = formatDate(date);
            const todayStr = formatDate(today.value);
        
            if (dateStr > todayStr) {
                showError('无法查看未来日期的新闻');
                return;
            }
            
            const currentDateStr = formatDate(currentDate.value);
            if (dateStr === currentDateStr) {
                return;
            }
            
            setCurrentDate(new Date(date));
            updateUrlParams(date);
            
            handleClearSearch();
            loading.value = true;
            clearError();
            
            const selectedYear = date.getFullYear();
            const selectedMonth = date.getMonth();
            const calendarYear = calendarMonth.value.getFullYear();
            const calendarMonthNum = calendarMonth.value.getMonth();
            
            if (selectedYear !== calendarYear || selectedMonth !== calendarMonthNum) {
                setCalendarMonth(new Date(selectedYear, selectedMonth, 1));
            }
            
            showSuccess(`已切换到 ${dateStr}`);
        } catch (err) {
            showError('选择日期失败: ' + (err && err.message ? err.message : '未知错误'));
        }
    };

    /**
     * 切换侧边栏
     */
    const handleToggleSidebar = () => {
        try {
            toggleSidebar();
            showSuccess(sidebarCollapsed.value ? '已展开侧边栏' : '已收缩侧边栏');
            
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 300);
        } catch (err) {
            showError('切换侧边栏失败: ' + (err && err.message ? err.message : '未知错误'));
        }
    };

    /**
     * 加载新闻数据
     * @param {Date} date - 日期对象
     */
    const handleLoadNewsData = async (date) => {
        try {
            await loadNewsData(date);
            showSuccess('新闻数据加载完成');
        } catch (err) {
            showError('加载新闻数据失败: ' + (err && err.message ? err.message : '未知错误'));
        }
    };

    /**
     * 更新URL参数
     * @param {Date} date - 日期对象
     */
    const updateUrlParams = (date) => {
        try {
            const dateStr = formatDate(date);
            const url = new URL(window.location);
            url.searchParams.set('date', dateStr);
            window.history.pushState({}, '', url);
        } catch (err) {
            console.error('更新URL参数失败:', err);
        }
    };

    /**
     * 获取分类标签
     * @param {Object} item - 新闻项
     * @returns {Array} 分类标签数组
     */
    const getCategoryTag = (item) => {
        const tags = [];
        if (item.category) {
            tags.push(item.category);
        }
        if (item.tags && Array.isArray(item.tags)) {
            tags.push(...item.tags);
        }
        return tags;
    };

    /**
     * 获取时间差
     * @param {string} isoDate - ISO日期字符串
     * @returns {string} 时间差描述
     */
    const getTimeAgo = (isoDate) => {
        if (!isoDate) return '未知时间';
        
        try {
            const date = new Date(isoDate);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffMins < 1) return '刚刚';
            if (diffMins < 60) return `${diffMins}分钟前`;
            if (diffHours < 24) return `${diffHours}小时前`;
            if (diffDays < 7) return `${diffDays}天前`;
            
            return date.toLocaleDateString('zh-CN');
        } catch (err) {
            return '未知时间';
        }
    };

    /**
     * 提取新闻摘要
     * @param {Object} item - 新闻项
     * @returns {string} 新闻摘要
     */
    const extractExcerpt = (item) => {
        if (item.content) {
            return item.content.length > 100 ? 
                item.content.substring(0, 100) + '...' : 
                item.content;
        }
        if (item.description) {
            return item.description.length > 100 ? 
                item.description.substring(0, 100) + '...' : 
                item.description;
        }
        return item.title || '暂无摘要';
    };

    /**
     * 检查是否应该显示分类
     * @param {string} categoryKey - 分类键
     * @returns {boolean} 是否显示
     */
    const shouldShowCategory = (categoryKey) => {
        return selectedCategories.value.size === 0 || selectedCategories.value.has(categoryKey);
    };

            return {
        // 错误处理
        showError,
        showSuccess,
        
        // 搜索相关
        handleSearchInput,
        handleSearchKeydown,
        handleClearSearch,
        
        // 分类和标签
        handleToggleCategory,
        handleToggleTag,
        
        // 新闻操作
        handleNewsClick,
        openLink,
        
        // 日期导航
        goToPreviousDay,
        goToNextDay,
        goToToday,
        
        // 日历导航
        previousMonth,
        nextMonth,
        selectDate,
        
        // 界面操作
        handleToggleSidebar,
        
        // 数据操作
        handleLoadNewsData,
        updateUrlParams,
        
        // 辅助方法
        getCategoryTag,
        getTimeAgo,
        extractExcerpt,
        shouldShowCategory
    };
}; 
