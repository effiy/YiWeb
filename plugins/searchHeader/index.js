/**
 * 搜索头部插件
 * author: liangliang
 * 
 * 提供搜索框和分类过滤器功能
 */

import BasePlugin from '../../js/core/basePlugin.js';

class SearchHeaderPlugin extends BasePlugin {
  constructor(options = {}) {
    super({
      name: 'searchHeader',
      version: '1.0.0',
      ...options
    });

    this.searchQuery = '';
    this.categories = [
      { key: 'shortcuts', title: '快捷键', icon: 'fas fa-keyboard' },
      { key: 'news', title: '新闻博客', icon: 'fas fa-newspaper' },
      { key: 'enter', title: 'Enter 发送', icon: 'fas fa-arrow-up' },
      { key: 'shift-enter', title: 'Shift+Enter 换行', icon: 'fas fa-level-down-alt' }
    ];
    this.selectedCategories = new Set();
    this.sidebarCollapsed = false;
    this.searchInput = null;
    this.filterButtons = [];
  }

  /**
   * 初始化插件
   */
  init() {
    super.init();
    
    try {
      this.loadStyles();
      this.createSearchHeader();
      this.bindEvents();
      this.log('搜索头部插件初始化完成');
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 加载样式文件
   */
  loadStyles() {
    const cssFiles = [
      '/plugins/searchHeader/index.css'
    ];
    
    cssFiles.forEach(cssFile => {
      if (!document.querySelector(`link[href*="${cssFile}"]`)) {
        const link = this.createElement('link', {
          rel: 'stylesheet',
          href: cssFile,
          type: 'text/css'
        });
        document.head.appendChild(link);
      }
    });
  }

  /**
   * 创建搜索头部
   */
  createSearchHeader() {
    // 查找或创建头部容器
    let headerContainer = this.findElement('.header-row');
    
    if (!headerContainer) {
      headerContainer = this.createElement('header', {
        className: 'header-row',
        role: 'banner'
      });
      
      // 插入到页面顶部
      const body = document.body;
      if (body.firstChild) {
        body.insertBefore(headerContainer, body.firstChild);
      } else {
        body.appendChild(headerContainer);
      }
    }

    // 创建搜索行
    const searchRow = this.createElement('div', { className: 'search-row' });
    
    // 创建搜索框
    const searchBox = this.createSearchBox();
    searchRow.appendChild(searchBox);
    
    // 创建分类过滤器
    const categoryFilters = this.createCategoryFilters();
    searchRow.appendChild(categoryFilters);
    
    // 清空并添加新内容
    headerContainer.innerHTML = '';
    headerContainer.appendChild(searchRow);
  }

  /**
   * 创建搜索框
   */
  createSearchBox() {
    const searchBox = this.createElement('div', { 
      className: 'search-box',
      role: 'search'
    });

    // 搜索logo
    const searchLogo = this.createElement('div', { className: 'search-logo' });
    searchLogo.setAttribute('aria-hidden', 'true');
    searchLogo.innerHTML = '<i class="fas fa-brain" aria-label="AI大脑图标"></i>';
    searchBox.appendChild(searchLogo);

    // 搜索输入包装器
    const searchInputWrapper = this.createElement('div', { className: 'search-input-wrapper' });
    
    // 搜索输入框
    this.searchInput = this.createElement('textarea', {
      id: 'messageInput',
      placeholder: '我可以帮助您分析数据、编写代码、生图创造...',
      rows: '1',
      maxlength: '2000',
      'aria-label': '消息输入框',
      autocomplete: 'off',
      spellcheck: 'false'
    });
    
    searchInputWrapper.appendChild(this.searchInput);
    searchBox.appendChild(searchInputWrapper);

    return searchBox;
  }

  /**
   * 创建分类过滤器
   */
  createCategoryFilters() {
    const categoryFilters = this.createElement('div', { 
      className: 'category-filters',
      id: 'category-filters',
      role: 'toolbar',
      'aria-label': '功能分类过滤器'
    });

    const filterButtons = this.createElement('div', { className: 'filter-buttons' });
    
    // 创建分类按钮
    this.categories.forEach(category => {
      const button = this.createElement('button', {
        className: 'filter-btn',
        role: 'button',
        tabindex: '0',
        'aria-label': category.title,
        'data-category': category.key
      });
      
      button.innerHTML = `
        <i class="${category.icon}" aria-hidden="true"></i>
        <span>${category.title}</span>
      `;
      
      // 添加点击事件
      this.addEvent(button, 'click', () => {
        this.toggleCategory(category.key);
      });
      
      filterButtons.appendChild(button);
      this.filterButtons.push(button);
    });

    categoryFilters.appendChild(filterButtons);
    return categoryFilters;
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    if (this.searchInput) {
      // 输入事件
      this.addEvent(this.searchInput, 'input', (e) => {
        this.searchQuery = e.target.value;
        this.emit('search-input', this.searchQuery);
      });

      // 键盘事件
      this.addEvent(this.searchInput, 'keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.emit('search-submit', this.searchQuery);
        } else if (e.key === 'Escape') {
          this.clearSearch();
        }
      });

      // 自动调整高度
      this.addEvent(this.searchInput, 'input', this.debounce(() => {
        this.adjustTextareaHeight();
      }, 100));
    }
  }

  /**
   * 调整文本框高度
   */
  adjustTextareaHeight() {
    if (this.searchInput) {
      this.searchInput.style.height = 'auto';
      this.searchInput.style.height = this.searchInput.scrollHeight + 'px';
    }
  }

  /**
   * 切换分类
   */
  toggleCategory(categoryKey) {
    if (this.selectedCategories.has(categoryKey)) {
      this.selectedCategories.delete(categoryKey);
    } else {
      this.selectedCategories.add(categoryKey);
    }
    
    // 更新按钮状态
    this.updateFilterButtons();
    
    // 触发事件
    this.emit('category-toggle', {
      category: categoryKey,
      selected: this.selectedCategories.has(categoryKey),
      allSelected: Array.from(this.selectedCategories)
    });
  }

  /**
   * 更新过滤器按钮状态
   */
  updateFilterButtons() {
    this.filterButtons.forEach(button => {
      const categoryKey = button.getAttribute('data-category');
      if (this.selectedCategories.has(categoryKey)) {
        this.addClass(button, 'active');
      } else {
        this.removeClass(button, 'active');
      }
    });
  }

  /**
   * 清空搜索
   */
  clearSearch() {
    if (this.searchInput) {
      this.searchInput.value = '';
      this.searchQuery = '';
      this.adjustTextareaHeight();
      this.emit('search-clear');
    }
  }

  /**
   * 设置搜索查询
   */
  setSearchQuery(query) {
    this.searchQuery = query;
    if (this.searchInput) {
      this.searchInput.value = query;
      this.adjustTextareaHeight();
    }
  }

  /**
   * 获取搜索查询
   */
  getSearchQuery() {
    return this.searchQuery;
  }

  /**
   * 获取选中的分类
   */
  getSelectedCategories() {
    return Array.from(this.selectedCategories);
  }

  /**
   * 设置分类
   */
  setCategories(categories) {
    this.categories = categories;
    // 重新创建分类过滤器
    this.createCategoryFilters();
  }

  /**
   * 销毁插件
   */
  destroy() {
    // 清理搜索输入框
    if (this.searchInput) {
      this.searchInput.value = '';
    }
    
    // 清理分类选择
    this.selectedCategories.clear();
    
    super.destroy();
  }

  /**
   * 触发自定义事件
   */
  emit(eventName, data) {
    const event = new CustomEvent(`searchHeader:${eventName}`, {
      detail: data,
      bubbles: true
    });
    document.dispatchEvent(event);
  }
}

export default SearchHeaderPlugin; 