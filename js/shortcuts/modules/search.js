/**
 * 快捷键搜索功能模块
 
 * 
 * 从shortcuts.js中提取的搜索功能，实现搜索、高亮、历史记录等功能
 */

import { getConfig } from '../../config/index.js';
import { debounce, safeSetItem, safeGetItem } from '../../utils/common.js';
import { addEventDelegate, createElement } from '../../utils/dom.js';

/**
 * 搜索管理器类
 */
export class SearchManager {
    constructor() {
        this.searchInput = null;
        this.searchHistory = [];
        this.suggestionsContainer = null;
        this.resultsContainer = null;
        this.maxHistoryLength = getConfig('search.MAX_SEARCH_HISTORY', 10);
        this.debounceDelay = getConfig('search.SEARCH_DEBOUNCE_DELAY', 300);
        this.minLength = getConfig('search.MIN_SEARCH_LENGTH', 1);
        
        this.init();
    }

    /**
     * 初始化搜索功能
     */
    init() {
        this.searchInput = document.getElementById('messageInput');
        if (!this.searchInput) {
            console.error('搜索输入框未找到');
            return;
        }

        this.createSearchSuggestions();
        this.bindEvents();
        this.loadSearchHistory();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 搜索输入事件
        this.searchInput.addEventListener('input', debounce(this.handleSearch.bind(this), this.debounceDelay));
        
        // 键盘事件
        this.searchInput.addEventListener('keydown', this.handleSearchKeydown.bind(this));
        
        // 搜索结果关闭按钮事件委托
        const shortcutsContent = document.querySelector('.shortcuts-content');
        if (shortcutsContent) {
            addEventDelegate(shortcutsContent, 'click', '.clear-search', this.clearSearch.bind(this));
        }
    }

    /**
     * 创建搜索建议
     */
    createSearchSuggestions() {
        if (!this.searchInput) return;

        // 创建搜索建议容器
        this.suggestionsContainer = createElement('div', {
            className: 'search-suggestions',
            styles: { display: 'none' }
        });
        
        this.searchInput.parentNode.appendChild(this.suggestionsContainer);

        // 创建搜索建议项
        const suggestions = [
            '基础移动', '编辑操作', '搜索替换', '窗口操作',
            '文件操作', '撤销重做', '可视模式', '宏操作',
            '复制', '粘贴', '删除', '保存', '退出'
        ];

        suggestions.forEach(suggestion => {
            const item = createElement('div', {
                className: 'suggestion-item',
                textContent: suggestion
            });
            
            item.addEventListener('click', () => {
                this.searchInput.value = suggestion;
                this.handleSearch({ target: this.searchInput });
                this.suggestionsContainer.style.display = 'none';
            });
            
            this.suggestionsContainer.appendChild(item);
        });
    }

    /**
     * 处理搜索
     * @param {Event} event - 输入事件
     */
    handleSearch(event) {
        const query = event.target.value.toLowerCase().trim();
        const shortcuts = document.querySelectorAll('.shortcut-item');
        const categories = document.querySelectorAll('.shortcut-category');
        
        if (query === '') {
            this.showAllResults(shortcuts, categories);
            return;
        }

        if (query.length < this.minLength) {
            return;
        }

        let hasResults = false;
        
        categories.forEach(category => {
            const categoryItems = category.querySelectorAll('.shortcut-item');
            let categoryHasResults = false;

            categoryItems.forEach(item => {
                const key = item.querySelector('.shortcut-key').textContent.toLowerCase();
                const desc = item.querySelector('.shortcut-desc').textContent.toLowerCase();
                
                if (key.includes(query) || desc.includes(query)) {
                    this.showResult(item, true);
                    categoryHasResults = true;
                    hasResults = true;
                    this.animateHighlight(item);
                } else {
                    this.showResult(item, false);
                }
            });

            category.style.display = categoryHasResults ? 'block' : 'none';
        });

        this.showSearchResults(query, hasResults);
    }

    /**
     * 显示所有结果
     * @param {NodeList} shortcuts - 快捷键元素
     * @param {NodeList} categories - 分类元素
     */
    showAllResults(shortcuts, categories) {
        shortcuts.forEach(item => {
            this.showResult(item, true);
            item.classList.remove('highlighted');
        });
        
        categories.forEach(category => {
            category.style.display = 'block';
        });
        
        this.hideSearchResults();
    }

    /**
     * 显示/隐藏搜索结果
     * @param {HTMLElement} item - 快捷键元素
     * @param {boolean} show - 是否显示
     */
    showResult(item, show) {
        item.style.display = show ? 'flex' : 'none';
        item.classList.toggle('highlighted', show);
    }

    /**
     * 高亮动画
     * @param {HTMLElement} element - 要高亮的元素
     */
    animateHighlight(element) {
        element.classList.add('shortcut-item-animated');
        setTimeout(() => {
            element.classList.remove('shortcut-item-animated');
        }, getConfig('animation.DURATION.normal', 300));
    }

    /**
     * 显示搜索结果统计
     * @param {string} query - 搜索查询
     * @param {boolean} hasResults - 是否有结果
     */
    showSearchResults(query, hasResults) {
        if (!this.resultsContainer) {
            this.resultsContainer = createElement('div', {
                id: 'search-results',
                className: 'search-results'
            });
            
            const shortcutsContent = document.querySelector('.shortcuts-content');
            const shortcutsGrid = document.querySelector('.shortcuts-grid');
            shortcutsContent.insertBefore(this.resultsContainer, shortcutsGrid);
        }

        if (query) {
            const highlightedItems = document.querySelectorAll('.shortcut-item.highlighted');
            this.resultsContainer.innerHTML = `
                <div class="results-info">
                    <i class="fas fa-search"></i>
                    <span>找到 ${highlightedItems.length} 个匹配的快捷键</span>
                    <button class="clear-search">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            this.resultsContainer.style.display = 'block';
        } else {
            this.hideSearchResults();
        }
    }

    /**
     * 隐藏搜索结果
     */
    hideSearchResults() {
        if (this.resultsContainer) {
            this.resultsContainer.style.display = 'none';
        }
    }

    /**
     * 清除搜索
     */
    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.handleSearch({ target: this.searchInput });
        }
        
        // 隐藏搜索结果（带动画）
        if (this.resultsContainer) {
            this.resultsContainer.classList.add('closing');
            setTimeout(() => {
                this.resultsContainer.style.display = 'none';
                this.resultsContainer.classList.remove('closing');
            }, getConfig('animation.DURATION.normal', 300));
        }
    }

    /**
     * 处理搜索键盘事件
     * @param {KeyboardEvent} event - 键盘事件
     */
    handleSearchKeydown(event) {
        switch (event.key) {
            case 'Escape':
                this.clearSearch();
                break;
            case 'Enter':
                this.handleEnterKey();
                break;
            case 'ArrowUp':
            case 'ArrowDown':
                this.handleArrowKeys(event);
                break;
        }
    }

    /**
     * 处理回车键
     */
    handleEnterKey() {
        const query = this.searchInput.value.trim();
        if (query) {
            this.addToHistory(query);
        }
    }

    /**
     * 处理箭头键
     * @param {KeyboardEvent} event - 键盘事件
     */
    handleArrowKeys(event) {
        // TODO: 实现搜索建议导航
        event.preventDefault();
    }

    /**
     * 添加到搜索历史
     * @param {string} query - 搜索查询
     */
    addToHistory(query) {
        if (this.searchHistory.includes(query)) {
            // 移到最前面
            this.searchHistory = [query, ...this.searchHistory.filter(q => q !== query)];
        } else {
            this.searchHistory.unshift(query);
        }

        // 限制历史记录数量
        if (this.searchHistory.length > this.maxHistoryLength) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistoryLength);
        }

        this.saveSearchHistory();
    }

    /**
     * 保存搜索历史
     */
    saveSearchHistory() {
        const key = getConfig('search.SEARCH_HISTORY_KEY', 'shortcutsSearchHistory');
        safeSetItem(key, this.searchHistory);
    }

    /**
     * 加载搜索历史
     */
    loadSearchHistory() {
        const key = getConfig('search.SEARCH_HISTORY_KEY', 'shortcutsSearchHistory');
        this.searchHistory = safeGetItem(key, []);
    }

    /**
     * 获取所有快捷键数据
     * @returns {Array} 快捷键数组
     */
    getAllShortcuts() {
        const shortcuts = [];
        document.querySelectorAll('.shortcut-item').forEach(item => {
            const key = item.querySelector('.shortcut-key').textContent;
            const desc = item.querySelector('.shortcut-desc').textContent;
            shortcuts.push({ key, desc });
        });
        return shortcuts;
    }

    /**
     * 显示搜索建议
     */
    showSuggestions() {
        if (this.suggestionsContainer) {
            this.suggestionsContainer.style.display = 'block';
        }
    }

    /**
     * 隐藏搜索建议
     */
    hideSuggestions() {
        if (this.suggestionsContainer) {
            this.suggestionsContainer.style.display = 'none';
        }
    }

    /**
     * 清理资源
     */
    cleanup() {
        if (this.suggestionsContainer) {
            this.suggestionsContainer.remove();
        }
        if (this.resultsContainer) {
            this.resultsContainer.remove();
        }
        this.searchHistory = [];
    }
}

// 导出默认实例
export default new SearchManager(); 