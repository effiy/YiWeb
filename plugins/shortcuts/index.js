/**
 * 快捷键插件
 * author: liangliang
 * 
 * 提供快捷键展示和交互功能
 */

import BasePlugin from '../../js/core/basePlugin.js';

class ShortcutsPlugin extends BasePlugin {
  constructor(options = {}) {
    super({
      name: 'shortcuts',
      version: '1.0.0',
      ...options
    });

    this.data = {
      categories: [
        {
          id: 'development',
          name: '开发工具',
          icon: 'fas fa-code',
          sections: [
            {
              title: '代码编辑',
              icon: 'fas fa-edit',
              shortcuts: [
                { key: 'Ctrl + S', desc: '保存文件' },
                { key: 'Ctrl + Z', desc: '撤销操作' },
                { key: 'Ctrl + Y', desc: '重做操作' },
                { key: 'Ctrl + F', desc: '查找文本' },
                { key: 'Ctrl + H', desc: '替换文本' },
                { key: 'Ctrl + D', desc: '选择下一个相同项' }
              ]
            },
            {
              title: '代码导航',
              icon: 'fas fa-compass',
              shortcuts: [
                { key: 'Ctrl + G', desc: '跳转到行' },
                { key: 'Ctrl + Shift + O', desc: '查找符号' },
                { key: 'F12', desc: '转到定义' },
                { key: 'Alt + F12', desc: '查看定义' },
                { key: 'Shift + F12', desc: '查找所有引用' }
              ]
            }
          ]
        },
        {
          id: 'system',
          name: '系统操作',
          icon: 'fas fa-desktop',
          sections: [
            {
              title: '窗口管理',
              icon: 'fas fa-window-maximize',
              shortcuts: [
                { key: 'Win + D', desc: '显示桌面' },
                { key: 'Win + E', desc: '打开文件资源管理器' },
                { key: 'Win + L', desc: '锁定计算机' },
                { key: 'Win + Tab', desc: '任务视图' },
                { key: 'Alt + Tab', desc: '切换窗口' }
              ]
            },
            {
              title: '系统控制',
              icon: 'fas fa-cog',
              shortcuts: [
                { key: 'Ctrl + Shift + Esc', desc: '任务管理器' },
                { key: 'Win + I', desc: '设置' },
                { key: 'Win + X', desc: '快速链接菜单' },
                { key: 'Win + V', desc: '剪贴板历史' }
              ]
            }
          ]
        },
        {
          id: 'browser',
          name: '浏览器',
          icon: 'fas fa-globe',
          sections: [
            {
              title: '导航',
              icon: 'fas fa-compass',
              shortcuts: [
                { key: 'Ctrl + T', desc: '新建标签页' },
                { key: 'Ctrl + W', desc: '关闭标签页' },
                { key: 'Ctrl + Shift + T', desc: '重新打开标签页' },
                { key: 'Ctrl + Tab', desc: '切换标签页' },
                { key: 'F5', desc: '刷新页面' },
                { key: 'Ctrl + R', desc: '刷新页面' }
              ]
            },
            {
              title: '书签',
              icon: 'fas fa-bookmark',
              shortcuts: [
                { key: 'Ctrl + D', desc: '添加书签' },
                { key: 'Ctrl + Shift + O', desc: '书签管理器' },
                { key: 'Ctrl + B', desc: '显示/隐藏书签栏' }
              ]
            }
          ]
        }
      ]
    };

    this.currentFilter = 'all';
    this.container = null;
    this.filterButtons = [];
    this.shortcutElements = [];
  }

  /**
   * 初始化插件
   */
  init() {
    super.init();
    
    try {
      this.loadStyles();
      this.createShortcutsInterface();
      this.bindEvents();
      this.log('快捷键插件初始化完成');
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 加载样式文件
   */
  loadStyles() {
    const cssFiles = [
      '/plugins/shortcuts/index.css'
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
   * 创建快捷键界面
   */
  createShortcutsInterface() {
    // 查找或创建主容器
    let mainContainer = this.findElement('.main-content');
    
    if (!mainContainer) {
      mainContainer = this.createElement('main', {
        className: 'main-content',
        role: 'main'
      });
      
      // 插入到页面中
      const body = document.body;
      const header = this.findElement('.header-row');
      if (header && header.nextSibling) {
        body.insertBefore(mainContainer, header.nextSibling);
      } else {
        body.appendChild(mainContainer);
      }
    }

    // 创建快捷键容器
    const shortcutsContainer = this.createElement('div', { className: 'shortcuts-container' });
    
    // 创建筛选按钮容器
    const filterContainer = this.createElement('div', { 
      className: 'filter-container',
      role: 'tablist',
      'aria-label': '快捷键分类筛选'
    });
    
    const filterButtons = this.createElement('div', { 
      id: 'filterButtons',
      className: 'filter-buttons'
    });
    
    filterContainer.appendChild(filterButtons);
    
    // 创建快捷键网格容器
    const shortcutsGrid = this.createElement('div', {
      id: 'shortcutsGrid',
      className: 'shortcuts-grid',
      role: 'tabpanel',
      'aria-label': '快捷键列表'
    });

    // 组装容器
    shortcutsContainer.appendChild(filterContainer);
    shortcutsContainer.appendChild(shortcutsGrid);
    
    // 清空并添加新内容
    mainContainer.innerHTML = '';
    mainContainer.appendChild(shortcutsContainer);
    
    this.container = shortcutsContainer;
    this.filterContainer = filterContainer;
    this.filterButtonsContainer = filterButtons;
    this.shortcutsGrid = shortcutsGrid;

    // 渲染内容
    this.renderFilterButtons();
    this.renderShortcuts();
  }

  /**
   * 渲染筛选按钮
   */
  renderFilterButtons() {
    if (!this.filterButtonsContainer) return;

    this.filterButtonsContainer.innerHTML = '';
    this.filterButtons = [];

    // 添加"全部"按钮
    const allButton = this.createFilterButton('all', '全部', 'fas fa-th');
    allButton.classList.add('active');
    allButton.setAttribute('aria-selected', 'true');
    this.filterButtonsContainer.appendChild(allButton);
    this.filterButtons.push(allButton);

    // 添加各分类按钮
    this.data.categories.forEach(category => {
      const button = this.createFilterButton(category.id, category.name, category.icon);
      this.filterButtonsContainer.appendChild(button);
      this.filterButtons.push(button);
    });
  }

  /**
   * 创建筛选按钮
   */
  createFilterButton(categoryId, name, icon) {
    const button = this.createElement('button', {
      className: 'filter-btn',
      'data-category': categoryId,
      role: 'tab',
      'aria-selected': categoryId === 'all' ? 'true' : 'false',
      'aria-controls': 'shortcutsGrid',
      tabindex: categoryId === 'all' ? '0' : '-1'
    });
    
    button.innerHTML = `
      <i class="${icon}" aria-hidden="true"></i>
      <span>${name}</span>
    `;
    
    return button;
  }

  /**
   * 渲染快捷键内容
   */
  renderShortcuts() {
    if (!this.shortcutsGrid) return;

    this.shortcutsGrid.innerHTML = '';
    this.shortcutElements = [];

    this.data.categories.forEach(category => {
      if (this.currentFilter !== 'all' && this.currentFilter !== category.id) {
        return;
      }

      category.sections.forEach(section => {
        const sectionElement = this.createSectionElement(section, category.id);
        this.shortcutsGrid.appendChild(sectionElement);
        this.shortcutElements.push(sectionElement);
      });
    });
  }

  /**
   * 创建分类区域元素
   */
  createSectionElement(section, categoryId) {
    const sectionDiv = this.createElement('div', {
      className: 'shortcut-category',
      'data-category': categoryId
    });

    const header = this.createElement('div', { className: 'category-header' });
    header.innerHTML = `
      <i class="${section.icon}"></i>
      <h3>${section.title}</h3>
    `;

    const shortcutsList = this.createElement('div', { className: 'shortcut-list' });

    section.shortcuts.forEach(shortcut => {
      const shortcutItem = this.createShortcutItem(shortcut);
      shortcutsList.appendChild(shortcutItem);
    });

    sectionDiv.appendChild(header);
    sectionDiv.appendChild(shortcutsList);

    return sectionDiv;
  }

  /**
   * 创建快捷键项目元素
   */
  createShortcutItem(shortcut) {
    const item = this.createElement('div', { className: 'shortcut-item' });
    
    if (shortcut.type) {
      item.setAttribute('data-type', shortcut.type);
    }

    const keyDiv = this.createElement('div', { className: 'shortcut-key' });
    keyDiv.textContent = shortcut.key;

    const descDiv = this.createElement('div', { className: 'shortcut-desc' });
    descDiv.textContent = shortcut.desc;

    item.appendChild(keyDiv);
    item.appendChild(descDiv);

    return item;
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 筛选按钮点击事件
    this.addEvent(document, 'click', (e) => {
      if (e.target.classList.contains('filter-btn') || e.target.closest('.filter-btn')) {
        const button = e.target.closest('.filter-btn');
        const category = button.getAttribute('data-category');
        this.handleFilterClick(category, button);
      }
    });

    // 键盘导航支持
    this.addEvent(document, 'keydown', (e) => {
      const activeButton = this.findElement('.filter-btn[aria-selected="true"]');
      if (!activeButton) return;

      const buttons = this.findElements('.filter-btn');
      const currentIndex = buttons.indexOf(activeButton);

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
          this.handleFilterClick(
            buttons[prevIndex].getAttribute('data-category'),
            buttons[prevIndex]
          );
          break;
        case 'ArrowRight':
          e.preventDefault();
          const nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
          this.handleFilterClick(
            buttons[nextIndex].getAttribute('data-category'),
            buttons[nextIndex]
          );
          break;
        case 'Home':
          e.preventDefault();
          this.handleFilterClick(
            buttons[0].getAttribute('data-category'),
            buttons[0]
          );
          break;
        case 'End':
          e.preventDefault();
          this.handleFilterClick(
            buttons[buttons.length - 1].getAttribute('data-category'),
            buttons[buttons.length - 1]
          );
          break;
      }
    });

    // 搜索功能
    const searchInput = this.findElement('#messageInput');
    if (searchInput) {
      this.addEvent(searchInput, 'input', (e) => {
        this.handleSearch(e.target.value);
      });
    }
  }

  /**
   * 处理筛选点击
   */
  handleFilterClick(category, button) {
    // 更新按钮状态和可访问性属性
    this.findElements('.filter-btn').forEach(btn => {
      this.removeClass(btn, 'active');
      btn.setAttribute('aria-selected', 'false');
      btn.setAttribute('tabindex', '-1');
    });
    
    this.addClass(button, 'active');
    button.setAttribute('aria-selected', 'true');
    button.setAttribute('tabindex', '0');

    // 更新筛选状态
    this.currentFilter = category;
    this.renderShortcuts();

    // 添加点击反馈
    this.addClickFeedback(button);
    
    // 更新快捷键网格的可访问性
    if (this.shortcutsGrid) {
      const categoryName = category === 'all' ? '全部' : this.getCategoryName(category);
      this.shortcutsGrid.setAttribute('aria-label', `显示${categoryName}快捷键`);
    }

    // 触发事件
    this.emit('filter-change', {
      category,
      categoryName: this.getCategoryName(category)
    });
  }
  
  /**
   * 获取分类名称
   */
  getCategoryName(categoryId) {
    const category = this.data.categories.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  }

  /**
   * 处理搜索
   */
  handleSearch(query) {
    if (!query.trim()) {
      this.showAllShortcuts();
      return;
    }

    const queryLower = query.toLowerCase();
    const shortcutItems = this.findElements('.shortcut-item');
    
    shortcutItems.forEach(item => {
      const key = item.querySelector('.shortcut-key').textContent.toLowerCase();
      const desc = item.querySelector('.shortcut-desc').textContent.toLowerCase();
      
      if (key.includes(queryLower) || desc.includes(queryLower)) {
        this.showElement(item);
        this.addClass(item, 'highlighted');
      } else {
        this.hideElement(item);
        this.removeClass(item, 'highlighted');
      }
    });

    this.emit('search', { query });
  }

  /**
   * 显示所有快捷键
   */
  showAllShortcuts() {
    const shortcutItems = this.findElements('.shortcut-item');
    shortcutItems.forEach(item => {
      this.showElement(item);
      this.removeClass(item, 'highlighted');
    });
  }

  /**
   * 添加点击反馈
   */
  addClickFeedback(element) {
    this.addClass(element, 'clicked');
    setTimeout(() => {
      this.removeClass(element, 'clicked');
    }, 200);
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    const totalShortcuts = this.data.categories.reduce((total, category) => {
      return total + category.sections.reduce((sectionTotal, section) => {
        return sectionTotal + section.shortcuts.length;
      }, 0);
    }, 0);

    const categoryCount = this.data.categories.length;
    const sectionCount = this.data.categories.reduce((total, category) => {
      return total + category.sections.length;
    }, 0);

    return {
      totalShortcuts,
      categoryCount,
      sectionCount
    };
  }

  /**
   * 添加新的快捷键分类
   */
  addCategory(category) {
    this.data.categories.push(category);
    this.renderFilterButtons();
    this.renderShortcuts();
  }

  /**
   * 移除快捷键分类
   */
  removeCategory(categoryId) {
    const index = this.data.categories.findIndex(cat => cat.id === categoryId);
    if (index !== -1) {
      this.data.categories.splice(index, 1);
      this.renderFilterButtons();
      this.renderShortcuts();
    }
  }

  /**
   * 获取快捷键数据
   */
  getShortcutsData() {
    return { ...this.data };
  }

  /**
   * 设置快捷键数据
   */
  setShortcutsData(data) {
    this.data = { ...data };
    this.renderFilterButtons();
    this.renderShortcuts();
  }

  /**
   * 销毁插件
   */
  destroy() {
    // 清理元素引用
    this.filterButtons = [];
    this.shortcutElements = [];
    
    super.destroy();
  }

  /**
   * 触发自定义事件
   */
  emit(eventName, data) {
    const event = new CustomEvent(`shortcuts:${eventName}`, {
      detail: data,
      bubbles: true
    });
    document.dispatchEvent(event);
  }
}

export default ShortcutsPlugin; 