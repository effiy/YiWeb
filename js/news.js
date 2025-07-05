// 新闻页面交互功能
document.addEventListener('DOMContentLoaded', function() {
    // 初始化新闻页面功能
    initNewsPage();
});

function initNewsPage() {
    // 初始化筛选功能
    initCategoryFilters();
    
    // 初始化搜索功能
    initSearchFunction();
    
    // 初始化新闻卡片交互
    initNewsCardInteractions();
    
    // 初始化响应式布局
    initResponsiveLayout();
    
    // 初始化动画效果
    initAnimations();
}

// 筛选功能
function initCategoryFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const newsCategories = document.querySelectorAll('.news-category');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            
            // 更新按钮状态
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // 筛选新闻
            filterNewsByCategory(category);
        });
    });
    
    // 显示所有新闻
    function showAllNews() {
        newsCategories.forEach(category => {
            category.style.display = 'block';
            category.style.opacity = '1';
            category.style.transform = 'translateY(0)';
        });
    }
    
    // 筛选新闻
    function filterNewsByCategory(selectedCategory) {
        if (selectedCategory === 'all') {
            showAllNews();
            return;
        }
        
        newsCategories.forEach(category => {
            const categoryType = category.getAttribute('data-category');
            
            if (categoryType === selectedCategory) {
                category.style.display = 'block';
                setTimeout(() => {
                    category.style.opacity = '1';
                    category.style.transform = 'translateY(0)';
                }, 50);
            } else {
                category.style.opacity = '0';
                category.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    category.style.display = 'none';
                }, 300);
            }
        });
    }
}

// 搜索功能
function initSearchFunction() {
    const searchInput = document.getElementById('messageInput');
    const newsItems = document.querySelectorAll('.news-item');
    
    if (!searchInput) return;
    
    let searchTimeout;
    
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        
        searchTimeout = setTimeout(() => {
            const searchTerm = this.value.toLowerCase().trim();
            
            if (searchTerm.length === 0) {
                showAllNews();
                return;
            }
            
            searchNews(searchTerm);
        }, 300);
    });
    
    // 搜索新闻
    function searchNews(searchTerm) {
        newsItems.forEach(item => {
            const title = item.querySelector('.news-title')?.textContent.toLowerCase() || '';
            const excerpt = item.querySelector('.news-excerpt')?.textContent.toLowerCase() || '';
            const category = item.querySelector('.news-category-tag')?.textContent.toLowerCase() || '';
            
            const isMatch = title.includes(searchTerm) || 
                           excerpt.includes(searchTerm) || 
                           category.includes(searchTerm);
            
            if (isMatch) {
                item.style.display = 'block';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            } else {
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    item.style.display = 'none';
                }, 300);
            }
        });
    }
    
    // 显示所有新闻
    function showAllNews() {
        newsItems.forEach(item => {
            item.style.display = 'block';
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        });
    }
}

// 新闻卡片交互
function initNewsCardInteractions() {
    const newsItems = document.querySelectorAll('.news-item');
    
    newsItems.forEach(item => {
        // 点击事件
        item.addEventListener('click', function() {
            // 添加点击动画
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
            
            // 这里可以添加跳转到详情页的逻辑
            console.log('点击了新闻:', this.querySelector('.news-title')?.textContent);
        });
        
        // 鼠标悬停效果
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px) scale(1.02)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
        
        // 键盘导航
        item.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
        
        // 设置可聚焦
        item.setAttribute('tabindex', '0');
    });
}

// 响应式布局
function initResponsiveLayout() {
    const newsGrid = document.querySelector('.news-grid');
    const filterButtons = document.querySelector('.filter-buttons');
    
    function updateLayout() {
        const width = window.innerWidth;
        
        if (width <= 768) {
            // 移动端布局调整
            if (newsGrid) {
                newsGrid.style.gridTemplateColumns = '1fr';
                newsGrid.style.gap = 'var(--spacing-md)';
            }
            
            if (filterButtons) {
                filterButtons.style.justifyContent = 'center';
                filterButtons.style.flexWrap = 'wrap';
            }
        } else if (width <= 1200) {
            // 平板布局调整
            if (newsGrid) {
                newsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(350px, 1fr))';
                newsGrid.style.gap = 'var(--spacing-lg)';
            }
        } else {
            // 桌面端布局
            if (newsGrid) {
                newsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(400px, 1fr))';
                newsGrid.style.gap = 'var(--spacing-xl)';
            }
        }
    }
    
    // 初始调用
    updateLayout();
    
    // 监听窗口大小变化
    window.addEventListener('resize', debounce(updateLayout, 250));
}

// 动画效果
function initAnimations() {
    // 观察器选项
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    // 创建观察器
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // 观察新闻卡片
    const newsItems = document.querySelectorAll('.news-item');
    newsItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        item.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(item);
    });
    
    // 观察新闻分类
    const newsCategories = document.querySelectorAll('.news-category');
    newsCategories.forEach((category, index) => {
        category.style.opacity = '0';
        category.style.transform = 'translateY(20px)';
        category.style.transition = `opacity 0.6s ease-out ${index * 0.1}s, transform 0.6s ease-out ${index * 0.1}s`;
        observer.observe(category);
    });
}

// 工具函数
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

// 性能优化：图片懒加载
function initLazyLoading() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }
}

// 无障碍功能增强
function initAccessibility() {
    // 添加键盘导航支持
    const focusableElements = document.querySelectorAll('.news-item, .filter-btn');
    
    focusableElements.forEach(element => {
        element.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
    
    // 添加屏幕阅读器支持
    const newsItems = document.querySelectorAll('.news-item');
    newsItems.forEach((item, index) => {
        const title = item.querySelector('.news-title')?.textContent || '';
        const category = item.querySelector('.news-category-tag')?.textContent || '';
        const time = item.querySelector('.news-time')?.textContent || '';
        
        item.setAttribute('role', 'article');
        item.setAttribute('aria-label', `${category}新闻：${title}，发布时间：${time}`);
        item.setAttribute('aria-describedby', `news-excerpt-${index}`);
    });
}

// 错误处理
function handleErrors() {
    window.addEventListener('error', function(e) {
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
    initNewsPage();
    initLazyLoading();
    initAccessibility();
    handleErrors();
}); 