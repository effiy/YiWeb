// 快捷键页面交互功能
class ShortcutsManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.initSearch();
        this.initFilters();
        this.initCopyFeature();
        this.initAnimations();
        this.initKeyboardShortcuts();
    }

    bindEvents() {
        // 搜索功能
        const searchInput = document.getElementById('messageInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearch.bind(this));
            searchInput.addEventListener('keydown', this.handleSearchKeydown.bind(this));
        }

        // 快捷键项点击事件
        document.addEventListener('click', this.handleShortcutClick.bind(this));
        
        // 复制提示
        document.addEventListener('click', this.handleCopyClick.bind(this));
    }

    initSearch() {
        // 创建搜索建议
        this.createSearchSuggestions();
        
        // 初始化搜索历史
        this.searchHistory = JSON.parse(localStorage.getItem('shortcutsSearchHistory') || '[]');
    }

    createSearchSuggestions() {
        const searchInput = document.getElementById('messageInput');
        if (!searchInput) return;

        // 创建搜索建议容器
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'search-suggestions';
        suggestionsContainer.style.display = 'none';
        searchInput.parentNode.appendChild(suggestionsContainer);

        // 获取所有快捷键数据
        const shortcuts = this.getAllShortcuts();
        
        // 创建搜索建议
        const suggestions = [
            '基础移动', '编辑操作', '搜索替换', '窗口操作',
            '文件操作', '撤销重做', '可视模式', '宏操作',
            '复制', '粘贴', '删除', '保存', '退出'
        ];

        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = suggestion;
            item.addEventListener('click', () => {
                searchInput.value = suggestion;
                this.handleSearch({ target: searchInput });
                suggestionsContainer.style.display = 'none';
            });
            suggestionsContainer.appendChild(item);
        });
    }

    handleSearch(event) {
        const query = event.target.value.toLowerCase().trim();
        const shortcuts = document.querySelectorAll('.shortcut-item');
        const categories = document.querySelectorAll('.shortcut-category');
        
        if (query === '') {
            // 显示所有
            shortcuts.forEach(item => {
                item.style.display = 'flex';
                item.classList.remove('highlighted');
            });
            categories.forEach(category => {
                category.style.display = 'block';
            });
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
                    item.style.display = 'flex';
                    item.classList.add('highlighted');
                    categoryHasResults = true;
                    hasResults = true;
                    
                    // 添加动画效果
                    this.animateHighlight(item);
                } else {
                    item.style.display = 'none';
                    item.classList.remove('highlighted');
                }
            });

            category.style.display = categoryHasResults ? 'block' : 'none';
        });

        // 显示搜索结果统计
        this.showSearchResults(query, hasResults);
    }

    animateHighlight(element) {
        element.classList.add('shortcut-item-animated');
        setTimeout(() => {
            element.classList.remove('shortcut-item-animated');
        }, 1000);
    }

    showSearchResults(query, hasResults) {
        let resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'search-results';
            resultsContainer.className = 'search-results';
            document.querySelector('.shortcuts-content').insertBefore(
                resultsContainer, 
                document.querySelector('.shortcuts-grid')
            );
        }

        if (query) {
            const highlightedItems = document.querySelectorAll('.shortcut-item.highlighted');
            resultsContainer.innerHTML = `
                <div class="results-info">
                    <i class="fas fa-search"></i>
                    <span>找到 ${highlightedItems.length} 个匹配的快捷键</span>
                    <button class="clear-search">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            // 为关闭按钮添加事件监听器
            const clearButton = resultsContainer.querySelector('.clear-search');
            if (clearButton) {
                clearButton.addEventListener('click', () => {
                    this.clearSearch();
                });
            }
            
            resultsContainer.style.display = 'block';
        } else {
            resultsContainer.style.display = 'none';
        }
    }

    clearSearch() {
        const searchInput = document.getElementById('messageInput');
        if (searchInput) {
            searchInput.value = '';
            this.handleSearch({ target: searchInput });
        }
    }

    handleSearchKeydown(event) {
        if (event.key === 'Escape') {
            this.clearSearch();
        }
    }

    initFilters() {
        // 绑定筛选按钮事件
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const category = button.getAttribute('data-category');
                this.filterByCategory(category);
                
                // 更新按钮状态
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });
    }

    filterByCategory(category) {
        const categories = document.querySelectorAll('.shortcut-category');
        
        categories.forEach(cat => {
            if (category === 'all' || cat.getAttribute('data-category') === category) {
                cat.style.display = 'block';
                cat.classList.add('category-active');
            } else {
                cat.style.display = 'none';
                cat.classList.remove('category-active');
            }
        });

        // 添加动画效果
        this.animateFilteredCategories();
    }

    animateFilteredCategories() {
        const visibleCategories = document.querySelectorAll('.shortcut-category[style*="block"]');
        visibleCategories.forEach((category, index) => {
            setTimeout(() => {
                category.classList.add('animate-in');
            }, index * 100);
        });
    }

    initCopyFeature() {
        // 为每个快捷键项添加复制功能
        const shortcuts = document.querySelectorAll('.shortcut-item');
        shortcuts.forEach(item => {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            copyBtn.title = '复制快捷键';
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.copyShortcut(item);
            });
            item.appendChild(copyBtn);
        });
    }

    copyShortcut(item) {
        const key = item.querySelector('.shortcut-key').textContent;
        const desc = item.querySelector('.shortcut-desc').textContent;
        const text = `${key} - ${desc}`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showCopySuccess(item);
            }).catch(() => {
                this.fallbackCopy(text);
            });
        } else {
            this.fallbackCopy(text);
        }
    }

    fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        this.showCopySuccess();
    }

    showCopySuccess(item) {
        // 创建成功提示
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.innerHTML = `
            <i class="fas fa-check"></i>
            <span>快捷键已复制到剪贴板</span>
        `;
        
        document.body.appendChild(notification);
        
        // 动画显示
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // 自动隐藏
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);

        // 为点击的项添加复制动画
        if (item) {
            item.classList.add('copied');
            setTimeout(() => {
                item.classList.remove('copied');
            }, 1000);
        }
    }

    initAnimations() {
        // 页面加载动画
        this.animateOnLoad();
        
        // 滚动动画
        this.initScrollAnimations();
    }

    animateOnLoad() {
        const categories = document.querySelectorAll('.shortcut-category');
        categories.forEach((category, index) => {
            category.style.opacity = '0';
            category.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                category.style.transition = 'all 0.6s ease-out';
                category.style.opacity = '1';
                category.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    initScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        document.querySelectorAll('.shortcut-category').forEach(category => {
            observer.observe(category);
        });
    }

    initKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + F 聚焦搜索框
            if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                event.preventDefault();
                const searchInput = document.getElementById('messageInput');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
            
            // Ctrl/Cmd + K 清空搜索
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                this.clearSearch();
            }
        });
    }

    handleShortcutClick(event) {
        const shortcutItem = event.target.closest('.shortcut-item');
        if (shortcutItem) {
            // 添加点击动画
            shortcutItem.classList.add('clicked');
            setTimeout(() => {
                shortcutItem.classList.remove('clicked');
            }, 300);
        }
    }

    handleCopyClick(event) {
        if (event.target.closest('.copy-btn')) {
            event.stopPropagation();
        }
    }

    getAllShortcuts() {
        const shortcuts = [];
        document.querySelectorAll('.shortcut-item').forEach(item => {
            const key = item.querySelector('.shortcut-key').textContent;
            const desc = item.querySelector('.shortcut-desc').textContent;
            shortcuts.push({ key, desc });
        });
        return shortcuts;
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.shortcutsManager = new ShortcutsManager();
});

// 导出到全局作用域，方便调试
window.ShortcutsManager = ShortcutsManager;

