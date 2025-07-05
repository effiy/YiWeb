// 新闻页面交互功能
class NewsManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.initSearch();
        this.initFilters();
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

        // 新闻项点击事件
        document.addEventListener('click', this.handleNewsClick.bind(this));

        // 搜索结果关闭按钮事件委托
        const newsContent = document.querySelector('.news-content');
        if (newsContent) {
            newsContent.addEventListener('click', (e) => {
                if (e.target.closest('.clear-search')) {
                    this.clearSearch();
                }
            });
        }
    }

    initSearch() {
        // 创建搜索建议
        this.createSearchSuggestions();
        
        // 初始化搜索历史
        this.searchHistory = JSON.parse(localStorage.getItem('newsSearchHistory') || '[]');
    }

    createSearchSuggestions() {
        const searchInput = document.getElementById('messageInput');
        if (!searchInput) return;

        // 创建搜索建议容器
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'search-suggestions';
        suggestionsContainer.style.display = 'none';
        searchInput.parentNode.appendChild(suggestionsContainer);

        // 创建搜索建议
        const suggestions = [
            'AI技术', '数据分析', '代码开发', '科技产品', '商业资讯',
            'OpenAI', 'GPT-5', '微软', '谷歌', '苹果', '华为',
            '人工智能', '机器学习', '深度学习', '量子计算', '区块链'
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
        const newsItems = document.querySelectorAll('.news-item');
        const categories = document.querySelectorAll('.news-category');
        
        if (query === '') {
            // 显示所有
            newsItems.forEach(item => {
                item.style.display = 'block';
                item.classList.remove('highlighted');
            });
            categories.forEach(category => {
                category.style.display = 'block';
            });
            return;
        }

        let hasResults = false;
        categories.forEach(category => {
            const categoryItems = category.querySelectorAll('.news-item');
            let categoryHasResults = false;

            categoryItems.forEach(item => {
                const title = item.querySelector('.news-title')?.textContent.toLowerCase() || '';
                const excerpt = item.querySelector('.news-excerpt')?.textContent.toLowerCase() || '';
                const categoryTag = item.querySelector('.news-category-tag')?.textContent.toLowerCase() || '';
                
                if (title.includes(query) || excerpt.includes(query) || categoryTag.includes(query)) {
                    item.style.display = 'block';
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
        element.classList.add('news-item-animated');
        setTimeout(() => {
            element.classList.remove('news-item-animated');
        }, 1000);
    }

    showSearchResults(query, hasResults) {
        let resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'search-results';
            resultsContainer.className = 'search-results';
            document.querySelector('.news-content').insertBefore(
                resultsContainer, 
                document.querySelector('.news-grid')
            );
        }

        if (query) {
            const highlightedItems = document.querySelectorAll('.news-item.highlighted');
            resultsContainer.innerHTML = `
                <div class="results-info">
                    <i class="fas fa-search"></i>
                    <span>找到 ${highlightedItems.length} 条相关新闻</span>
                    <button class="clear-search">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
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
        // 隐藏匹配的新闻提示行（带动画）
        const resultsContainer = document.getElementById('search-results');
        if (resultsContainer) {
            // 添加关闭动画类
            resultsContainer.classList.add('closing');
            // 等待动画完成后隐藏元素
            setTimeout(() => {
                resultsContainer.style.display = 'none';
                resultsContainer.classList.remove('closing');
            }, 300); // 与CSS动画时长匹配
        }
    }

    handleSearchKeydown(event) {
        if (event.key === 'Escape') {
            this.clearSearch();
        }
    }

    initFilters() {
        // 初始化选中的分类
        this.selectedCategories = new Set();
        
        // 绑定筛选按钮事件
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const category = button.getAttribute('data-category');
                this.toggleCategory(category, button);
            });
        });
        
        // 默认显示所有分类
        this.showAllCategories();
    }

    toggleCategory(category, button) {
        if (this.selectedCategories.has(category)) {
            // 如果已选中，则取消选中
            this.selectedCategories.delete(category);
            button.classList.remove('active');
        } else {
            // 如果未选中，则选中
            this.selectedCategories.add(category);
            button.classList.add('active');
        }
        
        this.updateFilterDisplay();
    }

    updateFilterDisplay() {
        const newsCategories = document.querySelectorAll('.news-category');
        
        if (this.selectedCategories.size === 0) {
            // 如果没有选中任何分类，显示所有分类
            this.showAllCategories();
        } else {
            // 只显示选中的分类
            newsCategories.forEach(cat => {
                const catCategory = cat.getAttribute('data-category');
                if (this.selectedCategories.has(catCategory)) {
                    cat.style.display = 'block';
                    cat.style.opacity = '1';
                    cat.style.transform = 'translateY(0)';
                    cat.classList.add('category-active');
                } else {
                    cat.style.opacity = '0';
                    cat.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        cat.style.display = 'none';
                    }, 300);
                    cat.classList.remove('category-active');
                }
            });
        }

        // 添加动画效果
        this.animateFilteredCategories();
    }

    showAllCategories() {
        const newsCategories = document.querySelectorAll('.news-category');
        newsCategories.forEach(cat => {
            cat.style.display = 'block';
            cat.style.opacity = '1';
            cat.style.transform = 'translateY(0)';
            cat.classList.add('category-active');
        });
    }

    animateFilteredCategories() {
        const visibleCategories = document.querySelectorAll('.news-category[style*="block"]');
        visibleCategories.forEach((category, index) => {
            setTimeout(() => {
                category.classList.add('animate-in');
            }, index * 100);
        });
    }

    initAnimations() {
        // 页面加载动画
        this.animateOnLoad();
        
        // 滚动动画
        this.initScrollAnimations();
    }

    animateOnLoad() {
        const newsItems = document.querySelectorAll('.news-item');
        newsItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                item.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    initScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.news-item').forEach(item => {
            observer.observe(item);
        });
    }

    initKeyboardShortcuts() {
        // 键盘快捷键支持
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K 聚焦搜索框
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('messageInput');
                if (searchInput) {
                    searchInput.focus();
                }
            }
            
            // Escape 清除搜索
            if (e.key === 'Escape') {
                this.clearSearch();
            }
        });
    }

    handleNewsClick(event) {
        const newsItem = event.target.closest('.news-item');
        if (newsItem) {
            // 添加点击动画效果
            newsItem.classList.add('clicked');
            setTimeout(() => {
                newsItem.classList.remove('clicked');
            }, 300);
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    new NewsManager();
});

// 新闻卡片交互
function initNewsCardInteractions() {
    // 新闻项悬停效果
    const newsItems = document.querySelectorAll('.news-item');
    
    newsItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px) scale(1.02)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// 响应式布局
function initResponsiveLayout() {
    function updateLayout() {
        const width = window.innerWidth;
        const newsGrid = document.querySelector('.news-grid');
        
        if (width <= 768) {
            newsGrid.style.gridTemplateColumns = '1fr';
        } else if (width <= 1200) {
            newsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(400px, 1fr))';
        } else {
            newsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(450px, 1fr))';
        }
    }
    
    updateLayout();
    window.addEventListener('resize', debounce(updateLayout, 250));
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 图片加载优化
function initImageLoading() {
    const images = document.querySelectorAll('.news-image img');
    
    images.forEach(img => {
        const container = img.closest('.news-image');
        
        // 添加加载状态
        container.classList.add('loading');
        
        // 图片加载完成
        img.addEventListener('load', function() {
            container.classList.remove('loading');
            container.classList.add('loaded');
            
            // 添加图片交互功能
            addImageInteractions(container, img);
        });
        
        // 图片加载失败
        img.addEventListener('error', function() {
            handleImageError(container, img);
        });
        
        // 懒加载
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src || img.src;
                        observer.unobserve(img);
                    }
                });
            });
            
            observer.observe(img);
        }
    });
}

// 图片交互功能
function addImageInteractions(container, img) {
    // 添加图片尺寸信息
    addImageDimensions(container, img);
    
    // 添加图片覆盖层
    addImageOverlay(container, img);
    
    // 点击放大
    container.addEventListener('click', () => {
        showImageModal(img.src, img.alt);
    });
}

// 添加图片尺寸信息
function addImageDimensions(container, img) {
    const dimensions = document.createElement('div');
    dimensions.className = 'image-dimensions';
    dimensions.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
    container.appendChild(dimensions);
}

// 添加图片覆盖层
function addImageOverlay(container, img) {
    const overlay = document.createElement('div');
    overlay.className = 'news-image-overlay';
    overlay.innerHTML = `
        <div class="image-caption">
            <i class="fas fa-expand"></i>
            <span>点击查看大图</span>
        </div>
    `;
    container.appendChild(overlay);
}

// 处理图片错误
function handleImageError(container, img) {
    container.classList.remove('loading');
    container.classList.add('error');
    
    // 尝试加载备用图片
    const fallbackSrc = img.dataset.fallback;
    if (fallbackSrc && fallbackSrc !== img.src) {
        setTimeout(() => {
            retryImageLoad(container, img);
        }, 1000);
    }
}

// 重试图片加载
function retryImageLoad(container, img) {
    const fallbackSrc = img.dataset.fallback;
    if (fallbackSrc) {
        img.src = fallbackSrc;
        container.classList.remove('error');
        container.classList.add('loading');
    }
}

// 显示图片模态框
function showImageModal(src, alt) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <button class="modal-close">
                <i class="fas fa-times"></i>
            </button>
            <img src="${src}" alt="${alt}" class="modal-image">
            <div class="modal-caption">${alt}</div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 显示动画
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // 关闭功能
    const closeModal = () => {
        modal.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(modal);
        }, 300);
    };
    
    modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    
    // ESC键关闭
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    });
}

// 懒加载初始化
function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// 预加载关键图片
function preloadCriticalImages() {
    const criticalImages = [
        '/images/placeholder-ai.jpg',
        '/images/placeholder-iphone.jpg',
        '/images/placeholder-chip.jpg'
    ];
    
    criticalImages.forEach(src => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
    });
}

// 无障碍功能
function initAccessibility() {
    // 添加键盘导航支持
    const newsItems = document.querySelectorAll('.news-item');
    newsItems.forEach((item, index) => {
        item.setAttribute('tabindex', '0');
        item.setAttribute('role', 'button');
        item.setAttribute('aria-label', `新闻 ${index + 1}`);
        
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.click();
            }
        });
    });
    
    // 添加屏幕阅读器支持
    const images = document.querySelectorAll('.news-image img');
    images.forEach(img => {
        if (!img.alt) {
            img.alt = '新闻配图';
        }
    });
}

// 错误处理
function handleErrors() {
    window.addEventListener('error', (e) => {
        console.error('页面错误:', e.error);
        
        // 显示用户友好的错误信息
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = '页面加载出现问题，请刷新重试';
            errorMessage.style.display = 'block';
            
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 5000);
        }
    });
}

// 初始化所有功能
document.addEventListener('DOMContentLoaded', function() {
    // 初始化新闻页面功能
    initNewsCardInteractions();
    initResponsiveLayout();
    initImageLoading();
    initLazyLoading();
    preloadCriticalImages();
    initAccessibility();
    handleErrors();
}); 