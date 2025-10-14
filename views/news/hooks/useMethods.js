/**
 * 方法函数组合式
 * 提供与新闻相关的常用操作方法
 * author: liangliang
 * 
 * @param {Object} store - 状态存储对象
 * @returns {Object} 方法集合
 */
import { getTimeAgo } from '/utils/date.js';
import { safeExecute, createError, ErrorTypes, showSuccessMessage } from '/utils/error.js';

export const useMethods = (store) => {
    const { 
        newsData, 
        projectFilesData,
        searchQuery, 
        selectedCategories, 
        selectedTags, 
        currentDate, 
        calendarMonth, 
        today,
        clickedItems,
        sidebarCollapsed,
        loadNewsData,
        loadProjectFilesData,
        setSearchQuery,
        setActiveCategory,
        toggleCategory,
        toggleTag,
        setCurrentDate,
        setCalendarMonth,
        toggleSidebar,
        addClickedItem,
        addSearchHistory,
        markItemRead,
        toggleFavorite
    } = store;

    /**
     * 处理搜索输入
     * @param {Event} event - 输入事件
     */
    const handleSearchInput = (event) => {
        return safeExecute(() => {
            const value = event.target.value;
            setSearchQuery(value);
            
            // 记录搜索行为
            if (value.trim()) {
                console.log(`[搜索] 关键词: ${value}`);
            }
        }, '搜索输入处理');
    };

    /**
     * 处理搜索键盘事件
     * @param {Event} event - 键盘事件
     */
    const handleSearchKeydown = (event) => {
        return safeExecute(() => {
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
        }, '搜索键盘事件处理');
    };

    /**
     * 清空搜索
     */
    const handleClearSearch = () => {
        return safeExecute(() => {
            setSearchQuery('');
            selectedCategories.value.clear();
            selectedTags.value.clear();
            
            // 聚焦到输入框
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.focus();
            }
            
            showSuccessMessage('已清空搜索');
        }, '清空搜索');
    };

    /**
     * 切换分类选择
     * @param {string} category - 分类名称
     */
    const handleToggleCategory = (category) => {
        return safeExecute(() => {
            if (!category || typeof category !== 'string') {
                throw createError('分类参数无效', ErrorTypes.VALIDATION, '分类切换');
            }

            // 顶部分类：全部/新闻/评论/项目文件
            if (['all', 'news', 'comments', 'projectFiles'].includes(category)) {
                setActiveCategory(category);

                // 点击后请求对应接口
                if (category === 'all') {
                    // 同时刷新新闻、评论和项目文件
                    loadNewsData();
                    loadProjectFilesData();
                    window.dispatchEvent(new CustomEvent('ReloadComments'));
                } else if (category === 'news') {
                    loadNewsData();
                } else if (category === 'comments') {
                    window.dispatchEvent(new CustomEvent('ReloadComments'));
                } else if (category === 'projectFiles') {
                    loadProjectFilesData();
                }

                const categoryNames = {
                    'all': '全部',
                    'news': '新闻',
                    'comments': '评论',
                    'projectFiles': '项目文件'
                };
                showSuccessMessage(`已切换到: ${categoryNames[category]}`);
                console.log(`[顶部分类切换] 切换到: ${category}`);
                return;
            }

            // 兼容：旧的新闻内部分类开关
            toggleCategory(category);
            showSuccessMessage(`已切换分类: ${category}`);
            console.log(`[分类切换] 切换到: ${category}`);
        }, '分类切换');
    };

    /**
     * 切换标签选择
     * @param {string} tag - 标签名称
     */
    const handleToggleTag = (tag) => {
        return safeExecute(() => {
            if (!tag || typeof tag !== 'string') {
                throw createError('标签参数无效', ErrorTypes.VALIDATION, '标签切换');
            }

            toggleTag(tag);
            showSuccessMessage(`已切换标签: ${tag}`);
            console.log(`[标签切换] 切换到: ${tag}`);
        }, '标签切换');
    };

    /**
     * 处理新闻点击
     * @param {Object} item - 新闻项
     */
    const handleNewsClick = (item) => {
        return safeExecute(() => {
            if (!item) {
                throw createError('新闻项无效', ErrorTypes.VALIDATION, '新闻点击');
            }

            const itemKey = item.link || item.title;
            addClickedItem(itemKey);
            // 标记为已读
            markItemRead(itemKey);
            
            setTimeout(() => clickedItems.value.delete(itemKey), 300);

            if (item.link) {
                window.open(item.link, '_blank', 'noopener,noreferrer');
                showSuccessMessage('已打开新闻链接');
            } else {
                throw createError('新闻链接无效', ErrorTypes.VALIDATION, '新闻点击');
            }
        }, '新闻点击处理');
    };

    /**
     * 切换收藏
     * @param {Object} item
     */
    const handleToggleFavorite = (item) => {
        return safeExecute(() => {
            if (!item) {
                throw createError('新闻项无效', ErrorTypes.VALIDATION, '收藏切换');
            }
            const itemKey = item.link || item.title;
            toggleFavorite(itemKey);
        }, '收藏切换');
    };

    /**
     * 处理项目文件点击
     * @param {Object} item - 项目文件项
     */
    const handleProjectFileClick = (item) => {
        return safeExecute(() => {
            if (!item) {
                throw createError('项目文件项无效', ErrorTypes.VALIDATION, '项目文件点击');
            }

            const itemKey = item.fileId || item.filePath || item.fileName || item.title;
            addClickedItem(itemKey);
            // 标记为已读
            markItemRead(itemKey);
            
            setTimeout(() => clickedItems.value.delete(itemKey), 300);

            // 构建AICR跳转链接
            const base = '/views/aicr/index.html';
            const params = new URLSearchParams();
            
            // 优先使用 fileId，如果没有则使用 filePath
            const fileId = item.fileId || item.filePath;
            if (fileId) {
                params.set('fileId', fileId);
            }
            if (item.projectId) {
                params.set('projectId', item.projectId);
            }
            if (item.versionId) {
                params.set('versionId', item.versionId);
            }
            
            const url = params.toString() ? `${base}?${params.toString()}` : base;
            window.open(url, '_blank', 'noopener,noreferrer');
            showSuccessMessage('已在AICR中打开文件');
        }, '项目文件点击处理');
    };

    /**
     * 打开链接的统一方法
     * @param {string} link - 链接地址
     */
    const openLink = (link) => {
        return safeExecute(() => {
            if (!link) {
                throw createError('链接地址为空', ErrorTypes.VALIDATION, '链接打开');
            }
            
            if (/^https?:\/\//.test(link)) {
                window.open(link, '_blank');
            } else {
                window.location.href = link;
            }
            showSuccessMessage('已打开链接');
        }, '链接打开');
    };

    /**
     * 日期导航方法
     */
    const goToPreviousDay = () => {
        return safeExecute(async () => {
            const newDate = new Date(currentDate.value);
            newDate.setDate(newDate.getDate() - 1);
            setCurrentDate(newDate);
            
            // 更新URL参数
            updateUrlParams(newDate);
            
            // 加载新日期的新闻数据和项目文件数据
            await loadNewsData(newDate);
            await loadProjectFilesData(newDate);
            
            console.log('[日期导航] 前往前一天:', newDate);
        }, '日期导航-前一天');
    };

    const goToNextDay = () => {
        return safeExecute(async () => {
            const newDate = new Date(currentDate.value);
            newDate.setDate(newDate.getDate() + 1);
            
            // 检查是否为未来日期
            const todayStr = `${today.value.getFullYear()}-${String(today.value.getMonth() + 1).padStart(2, '0')}-${String(today.value.getDate()).padStart(2, '0')}`;
            const newDateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
            
            if (newDateStr > todayStr) {
                throw createError('无法查看未来日期的新闻', ErrorTypes.VALIDATION, '日期导航');
            }
            
            setCurrentDate(newDate);
            updateUrlParams(newDate);
            
            // 加载新日期的新闻数据和项目文件数据
            await loadNewsData(newDate);
            await loadProjectFilesData(newDate);
            
            console.log('[日期导航] 前往后一天:', newDate);
        }, '日期导航-后一天');
    };

    const goToToday = () => {
        return safeExecute(async () => {
            setCurrentDate(today.value);
            updateUrlParams(today.value);
            
            // 加载今天的新闻数据和项目文件数据
            await loadNewsData(today.value);
            await loadProjectFilesData(today.value);
            
            console.log('[日期导航] 前往今天:', today.value);
        }, '日期导航-今天');
    };

    const previousMonth = () => {
        return safeExecute(() => {
            const newMonth = new Date(calendarMonth.value);
            newMonth.setMonth(newMonth.getMonth() - 1);
            setCalendarMonth(newMonth);
            
            console.log('[日历导航] 前往上个月:', newMonth);
        }, '日历导航-上个月');
    };

    const nextMonth = () => {
        return safeExecute(() => {
            const newMonth = new Date(calendarMonth.value);
            newMonth.setMonth(newMonth.getMonth() + 1);
            setCalendarMonth(newMonth);
            
            console.log('[日历导航] 前往下个月:', newMonth);
        }, '日历导航-下个月');
    };

    const selectDate = (date) => {
        return safeExecute(async () => {
            if (!(date instanceof Date)) {
                throw createError('日期参数无效', ErrorTypes.VALIDATION, '日期选择');
            }
            
            setCurrentDate(date);
            updateUrlParams(date);
            
            // 加载选中日期的新闻数据和项目文件数据
            await loadNewsData(date);
            await loadProjectFilesData(date);
            
            console.log('[日期选择] 选择日期:', date);
        }, '日期选择');
    };

    const handleToggleSidebar = () => {
        return safeExecute(() => {
            toggleSidebar();
            console.log('[侧边栏] 切换状态:', sidebarCollapsed.value);
        }, '侧边栏切换');
    };

    const handleLoadNewsData = async (date) => {
        return safeExecute(async () => {
            await loadNewsData(date);
        }, '新闻数据加载');
    };

    const handleLoadProjectFilesData = async (date) => {
        return safeExecute(async () => {
            await loadProjectFilesData(date);
        }, '项目文件数据加载');
    };

    const updateUrlParams = (date) => {
        return safeExecute(() => {
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const url = new URL(window.location);
            url.searchParams.set('date', dateStr);
            window.history.pushState({}, '', url);
        }, 'URL参数更新');
    };

    const getCategoryTag = (item) => {
        return safeExecute(() => {
            // 优先显示 item.categories 中的标签
            if (item.categories && item.categories.length > 0) {
                // 如果 categories 是数组，返回数组
                if (Array.isArray(item.categories)) {
                    return item.categories;
                }
                // 如果 categories 是字符串，返回包含该字符串的数组
                if (typeof item.categories === 'string') {
                    return [item.categories];
                }
            }
            
            // 使用默认分类
            return ['其他'];
        }, '分类标签获取');
    };

    const extractExcerpt = (item) => {
        return safeExecute(() => {
            if (item.excerpt) return item.excerpt;
            if (item.content) {
                return item.content.substring(0, 150) + '...';
            }
            return '暂无摘要';
        }, '摘要提取');
    };

    const shouldShowCategory = (categoryKey) => {
        return safeExecute(() => {
            return selectedCategories.value.size === 0 || selectedCategories.value.has(categoryKey);
        }, '分类显示判断');
    };

    return {
        // 搜索相关方法
        handleSearchInput,
        handleSearchKeydown,
        handleClearSearch,
        handleToggleCategory,
        handleToggleTag,
        
        // 新闻相关方法
        handleNewsClick,
        handleProjectFileClick,
        openLink,
        
        // 日期导航方法
        goToPreviousDay,
        goToNextDay,
        goToToday,
        previousMonth,
        nextMonth,
        selectDate,
        
        // 界面控制方法
        handleToggleSidebar,
        handleLoadNewsData,
        handleLoadProjectFilesData,
        handleToggleFavorite,
        
        // 工具方法
        updateUrlParams,
        getCategoryTag,
        getTimeAgo,
        extractExcerpt,
        shouldShowCategory
    };
}; 


