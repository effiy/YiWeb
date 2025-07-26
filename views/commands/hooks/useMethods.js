/**
 * Linux命令大全页面方法
 * author: liangliang
 */

import { formatDate } from '/utils/date.js';

/**
 * 方法工厂函数
 * 提供页面交互方法
 * @param {Object} store - 数据存储对象
 * @param {Object} computed - 计算属性对象
 * @returns {Object} 方法对象
 */
export const useMethods = (store, computed) => {
    /**
     * 处理搜索输入
     * @param {Event} event - 输入事件
     */
    const handleSearchInput = (event) => {
        const value = event.target.value;
        store.setSearchKeyword(value);
        
        // 自动调整文本框高度
        const textarea = event.target;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        
        // 防抖处理，避免频繁搜索
        if (handleSearchInput.debounceTimer) {
            clearTimeout(handleSearchInput.debounceTimer);
        }
        
        handleSearchInput.debounceTimer = setTimeout(() => {
            // 执行增强搜索逻辑
            performEnhancedSearch(value);
            
            // 记录搜索统计
            if (value.trim()) {
                recordSearchStats(value);
            }
        }, 300);
        
        // 实时显示搜索提示
        showSearchHints(value);
    };
    
    /**
     * 执行增强搜索逻辑
     * @param {string} keyword - 搜索关键词
     */
    const performEnhancedSearch = (keyword) => {
        if (!keyword || keyword.trim().length === 0) {
            // 清空搜索时，重置过滤器状态
            if (store.selectedTags.value.length > 0) {
                store.selectedTags.value = [];
            }
            return;
        }
        
        // 检测搜索模式
        const searchMode = detectSearchMode(keyword);
        console.log(`搜索模式: ${searchMode}, 关键词: ${keyword}`);
        
        // 高亮搜索关键词
        highlightSearchTerms(keyword);
    };
    
    /**
     * 检测搜索模式
     * @param {string} keyword - 搜索关键词
     * @returns {string} 搜索模式
     */
    const detectSearchMode = (keyword) => {
        const lowerKeyword = keyword.toLowerCase();
        
        // 命令名搜索
        if (/^[a-zA-Z0-9_-]+$/.test(keyword)) {
            return 'command_name';
        }
        
        // 语法搜索
        if (keyword.includes('[') || keyword.includes(']') || keyword.includes('{') || keyword.includes('}')) {
            return 'syntax';
        }
        
        // 标签搜索
        if (keyword.startsWith('#') || keyword.startsWith('tag:')) {
            return 'tag';
        }
        
        // 分类搜索
        if (keyword.startsWith('category:') || keyword.startsWith('cat:')) {
            return 'category';
        }
        
        // 难度搜索
        if (keyword.startsWith('difficulty:') || keyword.startsWith('diff:')) {
            return 'difficulty';
        }
        
        // 示例搜索
        if (keyword.startsWith('example:') || keyword.startsWith('ex:')) {
            return 'example';
        }
        
        // 模糊搜索
        return 'fuzzy';
    };
    
    /**
     * 显示搜索提示
     * @param {string} keyword - 搜索关键词
     */
    const showSearchHints = (keyword) => {
        if (!keyword || keyword.length < 2) {
            hideSearchHints();
            return;
        }
        
        const hints = getSearchHints(keyword);
        if (hints.length > 0) {
            displaySearchHints(hints);
        } else {
            hideSearchHints();
        }
    };
    
    /**
     * 获取搜索提示
     * @param {string} keyword - 搜索关键词
     * @returns {Array} 搜索提示列表
     */
    const getSearchHints = (keyword) => {
        const lowerKeyword = keyword.toLowerCase();
        const hints = [];
        
        // 命令名提示
        store.commands.value.forEach(command => {
            if (command.name.toLowerCase().includes(lowerKeyword)) {
                hints.push({
                    type: 'command',
                    value: command.name,
                    display: `${command.name} - ${command.description.substring(0, 50)}...`
                });
            }
        });
        
        // 示例内容提示
        store.commands.value.forEach(command => {
            if (command.examples && Array.isArray(command.examples)) {
                command.examples.forEach(example => {
                    if (example.command && example.command.toLowerCase().includes(lowerKeyword)) {
                        hints.push({
                            type: 'example',
                            value: example.command,
                            display: `示例: ${example.command} (${command.name})`
                        });
                    }
                });
            }
        });
        
        // 标签提示
        store.tags.value.forEach(tag => {
            if (tag.toLowerCase().includes(lowerKeyword)) {
                hints.push({
                    type: 'tag',
                    value: `#${tag}`,
                    display: `标签: ${tag}`
                });
            }
        });
        
        return hints.slice(0, 5);
    };
    
    /**
     * 显示搜索提示下拉框
     * @param {Array} hints - 提示列表
     */
    const displaySearchHints = (hints) => {
        let hintBox = document.getElementById('search-hints');
        if (!hintBox) {
            hintBox = document.createElement('div');
            hintBox.id = 'search-hints';
            hintBox.className = 'search-hints';
            document.querySelector('.search-input-wrapper').appendChild(hintBox);
        }
        
        hintBox.innerHTML = hints.map((hint, index) => `
            <div class="hint-item" data-index="${index}" data-value="${hint.value}">
                <i class="fas ${getHintIcon(hint.type)}"></i>
                <span>${hint.display}</span>
            </div>
        `).join('');
        
        hintBox.style.display = 'block';
        
        // 添加点击事件
        hintBox.addEventListener('click', handleHintClick);
    };
    
    /**
     * 隐藏搜索提示
     */
    const hideSearchHints = () => {
        const hintBox = document.getElementById('search-hints');
        if (hintBox) {
            hintBox.style.display = 'none';
        }
    };
    
    /**
     * 获取提示图标
     * @param {string} type - 提示类型
     * @returns {string} 图标类名
     */
    const getHintIcon = (type) => {
        const iconMap = {
            command: 'fa-terminal',
            example: 'fa-code',
            tag: 'fa-tag'
        };
        return iconMap[type] || 'fa-search';
    };
    
    /**
     * 处理提示点击
     * @param {Event} event - 点击事件
     */
    const handleHintClick = (event) => {
        const item = event.target.closest('.hint-item');
        if (item) {
            const value = item.dataset.value;
            const textarea = document.getElementById('messageInput');
            textarea.value = value;
            textarea.focus();
            
            // 触发搜索
            store.setSearchKeyword(value);
            performEnhancedSearch(value);
            hideSearchHints();
        }
    };
    
    /**
     * 高亮搜索关键词
     * @param {string} keyword - 搜索关键词
     */
    const highlightSearchTerms = (keyword) => {
        if (!keyword || keyword.trim().length === 0) {
            // 移除所有高亮
            document.querySelectorAll('.highlight-search').forEach(el => {
                el.classList.remove('highlight-search');
            });
            return;
        }
        
        // 延迟执行，避免影响性能
        setTimeout(() => {
            const commandCards = document.querySelectorAll('.command-card');
            commandCards.forEach(card => {
                const textElements = card.querySelectorAll('.command-name, .command-description, .command-syntax, .example-code, .example-description');
                textElements.forEach(element => {
                    const text = element.textContent;
                    const highlightedText = text.replace(
                        new RegExp(keyword, 'gi'),
                        match => `<span class="highlight-search">${match}</span>`
                    );
                    if (highlightedText !== text) {
                        element.innerHTML = highlightedText;
                    }
                });
            });
        }, 100);
    };
    
    /**
     * 记录搜索统计
     * @param {string} keyword - 搜索关键词
     */
    const recordSearchStats = (keyword) => {
        const stats = JSON.parse(localStorage.getItem('searchStats') || '{}');
        const today = new Date().toISOString().split('T')[0];
        
        if (!stats[today]) {
            stats[today] = { total: 0, keywords: {} };
        }
        
        stats[today].total++;
        stats[today].keywords[keyword] = (stats[today].keywords[keyword] || 0) + 1;
        
        localStorage.setItem('searchStats', JSON.stringify(stats));
    };

    /**
     * 处理搜索键盘事件
     * @param {KeyboardEvent} event - 键盘事件
     */
    const handleSearchKeydown = (event) => {
        const hintBox = document.getElementById('search-hints');
        const hintItems = hintBox ? hintBox.querySelectorAll('.hint-item') : [];
        let currentIndex = -1;
        
        // 获取当前选中的提示项
        hintItems.forEach((item, index) => {
            if (item.classList.contains('selected')) {
                currentIndex = index;
            }
        });
        
        switch (event.key) {
            case 'Enter':
                if (!event.shiftKey) {
                    event.preventDefault();
                    
                    // 如果有选中的提示项，使用提示项的值
                    if (currentIndex >= 0 && hintItems[currentIndex]) {
                        const selectedValue = hintItems[currentIndex].dataset.value;
                        const textarea = event.target;
                        textarea.value = selectedValue;
                        store.setSearchKeyword(selectedValue);
                        performEnhancedSearch(selectedValue);
                        hideSearchHints();
                    } else {
                        // 执行搜索
                        performEnhancedSearch(event.target.value);
                    }
                }
                break;
                
            case 'Escape':
                event.preventDefault();
                hideSearchHints();
                event.target.blur();
                break;
                
            case 'ArrowDown':
                event.preventDefault();
                if (hintItems.length > 0) {
                    // 移除当前选中
                    hintItems.forEach(item => item.classList.remove('selected'));
                    
                    // 选择下一个
                    const nextIndex = currentIndex < hintItems.length - 1 ? currentIndex + 1 : 0;
                    hintItems[nextIndex].classList.add('selected');
                }
                break;
                
            case 'ArrowUp':
                event.preventDefault();
                if (hintItems.length > 0) {
                    // 移除当前选中
                    hintItems.forEach(item => item.classList.remove('selected'));
                    
                    // 选择上一个
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : hintItems.length - 1;
                    hintItems[prevIndex].classList.add('selected');
                }
                break;
                
            case 'Tab':
                // 如果有提示项，阻止默认行为并选择第一个
                if (hintItems.length > 0) {
                    event.preventDefault();
                    hintItems.forEach(item => item.classList.remove('selected'));
                    hintItems[0].classList.add('selected');
                }
                break;
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
        
        // 清空搜索
        if (store.searchKeyword.value) {
            store.setSearchKeyword('');
        }
        
        // 清空选中的标签
        if (store.selectedTags.value.length > 0) {
            store.selectedTags.value = [];
        }
    };

    /**
     * 切换标签选择
     * @param {string} tag - 标签名称
     */
    const toggleTag = (tag) => {
        const index = store.selectedTags.value.indexOf(tag);
        if (index > -1) {
            store.selectedTags.value.splice(index, 1);
        } else {
            store.selectedTags.value.push(tag);
        }
    };

    /**
     * 复制命令到剪贴板
     * @param {string} command - 命令字符串
     */
    const copyCommand = async (command) => {
        try {
            await navigator.clipboard.writeText(command);
        } catch (err) {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = command;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    };



    /**
     * 获取难度文本
     * @param {string} difficulty - 难度级别
     * @returns {string} 难度文本
     */
    const getDifficultyText = (difficulty) => {
        const difficultyMap = {
            'easy': '简单',
            'medium': '中等',
            'hard': '困难'
        };
        return difficultyMap[difficulty] || '中等';
    };

    /**
     * 打开链接
     * @param {string} url - 链接地址
     */
    const openLink = (url) => {
        if (url.startsWith('http')) {
            window.open(url, '_blank');
        } else {
            window.location.href = url;
        }
    };

    /**
     * 格式化日期
     * @param {string} dateString - 日期字符串
     * @returns {string} 格式化后的日期
     */
    const formatDateDisplay = (dateString) => {
        if (!dateString) return '未知';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return '无效日期';
            }
            return formatDate(date);
        } catch (error) {
            console.warn('日期格式化失败:', error);
            return '无效日期';
        }
    };

    /**
     * 添加新命令
     * @param {Object} commandData - 命令数据
     */
    const addNewCommand = (commandData) => {
        try {
            store.addCommand(commandData);
        } catch (error) {
            console.error('添加命令失败:', error);
        }
    };

    /**
     * 删除命令
     * @param {string} commandId - 命令ID
     */
    const deleteCommandById = (commandId) => {
        if (confirm('确定要删除这个命令吗？')) {
            try {
                store.deleteCommand(commandId);
            } catch (error) {
                console.error('删除命令失败:', error);
            }
        }
    };

    /**
     * 导出命令数据
     */
    const exportCommands = () => {
        try {
            const data = JSON.stringify(store.commands.value, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `linux-commands-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('导出命令数据失败:', error);
        }
    };

    /**
     * 导入命令数据
     * @param {File} file - 文件对象
     */
    const importCommands = (file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (Array.isArray(data)) {
                    // 清空现有数据并导入新数据
                    store.commands.value = data;
                } else {
                    console.error('文件格式不正确');
                }
            } catch (error) {
                console.error('导入命令数据失败:', error);
            }
        };
        reader.readAsText(file);
    };

    return {
        handleSearchInput,
        handleSearchKeydown,
        clearSearch,
        switchCategory,
        toggleTag,
        copyCommand,
        getDifficultyText,
        openLink,
        formatDateDisplay,
        addNewCommand,
        deleteCommandById,
        exportCommands,
        importCommands,
        // 新增的搜索相关方法
        performEnhancedSearch,
        detectSearchMode,
        showSearchHints,
        getSearchHints,
        displaySearchHints,
        hideSearchHints,
        getHintIcon,
        handleHintClick,
        highlightSearchTerms,
        recordSearchStats
    };
}; 
