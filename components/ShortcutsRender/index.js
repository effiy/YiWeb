/**
 * 快捷键渲染器
 * 功能：动态生成快捷键内容和筛选按钮
 */

import { shortcutsData } from '/mock/shortcuts-data.js';

// 自动加载相关的CSS文件
(function loadCSS() {
  const cssFiles = [
      '/components/ShortcutsRender/index.css'
  ];
  
  cssFiles.forEach(cssFile => {
      // 检查是否已经加载过该CSS文件
      if (!document.querySelector(`link[href*="${cssFile}"]`)) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = cssFile;
          link.type = 'text/css';
          document.head.appendChild(link);
      }
  });
})();

class ShortcutsRenderer {
    constructor() {
        this.data = shortcutsData;
        this.currentFilter = 'all';
        this.init();
    }

    /**
     * 初始化渲染器
     */
    init() {
        this.renderFilterButtons();
        this.renderShortcuts();
        this.bindEvents();
    }

    /**
     * 渲染筛选按钮
     */
    renderFilterButtons() {
        const filterContainer = document.getElementById('filterButtons');
        if (!filterContainer) return;

        // 添加"全部"按钮
        const allButton = this.createFilterButton('all', '全部', 'fas fa-th');
        allButton.classList.add('active');
        filterContainer.appendChild(allButton);

        // 添加各分类按钮
        this.data.categories.forEach(category => {
            const button = this.createFilterButton(category.id, category.name, category.icon);
            filterContainer.appendChild(button);
        });
    }

    /**
     * 创建筛选按钮
     */
    createFilterButton(categoryId, name, icon) {
        const button = document.createElement('button');
        button.className = 'filter-btn';
        button.setAttribute('data-category', categoryId);
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-selected', categoryId === 'all' ? 'true' : 'false');
        button.setAttribute('aria-controls', 'shortcutsGrid');
        button.setAttribute('tabindex', categoryId === 'all' ? '0' : '-1');
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
        const gridContainer = document.getElementById('shortcutsGrid');
        if (!gridContainer) return;

        gridContainer.innerHTML = '';

        this.data.categories.forEach(category => {
            if (this.currentFilter !== 'all' && this.currentFilter !== category.id) {
                return;
            }

            category.sections.forEach(section => {
                const sectionElement = this.createSectionElement(section, category.id);
                gridContainer.appendChild(sectionElement);
            });
        });
    }

    /**
     * 创建分类区域元素
     */
    createSectionElement(section, categoryId) {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'shortcut-category';
        sectionDiv.setAttribute('data-category', categoryId);

        const header = document.createElement('div');
        header.className = 'category-header';
        header.innerHTML = `
            <i class="${section.icon}"></i>
            <h3>${section.title}</h3>
        `;

        const shortcutsList = document.createElement('div');
        shortcutsList.className = 'shortcut-list';

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
        const item = document.createElement('div');
        item.className = 'shortcut-item';
        
        if (shortcut.type) {
            item.setAttribute('data-type', shortcut.type);
        }

        const keyDiv = document.createElement('div');
        keyDiv.className = 'shortcut-key';
        keyDiv.textContent = shortcut.key;

        const descDiv = document.createElement('div');
        descDiv.className = 'shortcut-desc';
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
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn') || e.target.closest('.filter-btn')) {
                const button = e.target.closest('.filter-btn');
                const category = button.getAttribute('data-category');
                this.handleFilterClick(category, button);
            }
        });

        // 键盘导航支持
        document.addEventListener('keydown', (e) => {
            const activeButton = document.querySelector('.filter-btn[aria-selected="true"]');
            if (!activeButton) return;

            const buttons = Array.from(document.querySelectorAll('.filter-btn'));
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
        const searchInput = document.getElementById('messageInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }
    }

    /**
     * 处理筛选点击
     */
    handleFilterClick(category, button) {
        // 更新按钮状态和可访问性属性
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
            btn.setAttribute('tabindex', '-1');
        });
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');
        button.setAttribute('tabindex', '0');

        // 更新筛选状态
        this.currentFilter = category;
        this.renderShortcuts();

        // 添加点击反馈
        this.addClickFeedback(button);
        
        // 更新快捷键网格的可访问性
        const shortcutsGrid = document.getElementById('shortcutsGrid');
        if (shortcutsGrid) {
            shortcutsGrid.setAttribute('aria-label', `显示${category === 'all' ? '全部' : this.getCategoryName(category)}快捷键`);
        }
    }
    
    /**
     * 获取分类名称
     */
    getCategoryName(categoryId) {
        const category = this.data.categories.find(cat => cat.id === categoryId);
        return category ? category.name : '未知分类';
    }

    /**
     * 处理搜索
     */
    handleSearch(query) {
        const searchTerm = query.toLowerCase().trim();
        const shortcutItems = document.querySelectorAll('.shortcut-item');

        shortcutItems.forEach(item => {
            const key = item.querySelector('.shortcut-key').textContent.toLowerCase();
            const desc = item.querySelector('.shortcut-desc').textContent.toLowerCase();
            
            if (key.includes(searchTerm) || desc.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });

        // 隐藏空的分类
        document.querySelectorAll('.shortcut-category').forEach(category => {
            const visibleItems = category.querySelectorAll('.shortcut-item:not([style*="display: none"])');
            if (visibleItems.length === 0) {
                category.style.display = 'none';
            } else {
                category.style.display = 'block';
            }
        });
    }

    /**
     * 添加点击反馈
     */
    addClickFeedback(element) {
        element.classList.add('clicked');
        setTimeout(() => {
            element.classList.remove('clicked');
        }, 150);
    }

    /**
     * 获取统计信息
     */
    getStatistics() {
        let totalShortcuts = 0;
        let totalCategories = this.data.categories.length;
        let totalSections = 0;

        this.data.categories.forEach(category => {
            totalSections += category.sections.length;
            category.sections.forEach(section => {
                totalShortcuts += section.shortcuts.length;
            });
        });

        return {
            totalShortcuts,
            totalCategories,
            totalSections
        };
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    const renderer = new ShortcutsRenderer();
    
    // 将渲染器实例暴露到全局，便于调试
    window.shortcutsRenderer = renderer;
    
    // 显示统计信息
    const stats = renderer.getStatistics();
    console.log('快捷键统计:', stats);
});

export default ShortcutsRenderer; 

