/**
 * 快捷键筛选功能模块
 
 * 
 * 从shortcuts.js中提取的筛选功能，实现分类筛选、显示控制等功能
 */

import { getConfig } from '../../../shared/config/index.js';
import { addEventDelegate } from '../../../shared/utils/dom.js';

/**
 * 筛选管理器类
 */
export class FilterManager {
    constructor() {
        this.selectedCategories = new Set();
        this.animationDuration = getConfig('animation.DURATION.normal', 300);
        this.staggerDelay = getConfig('shortcuts.STAGGER_DELAY', 50);
        
        this.init();
    }

    /**
     * 初始化筛选功能
     */
    init() {
        this.bindEvents();
        this.showAllCategories();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 绑定筛选按钮事件
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const category = button.getAttribute('data-category');
                this.toggleCategory(category, button);
            });
        });

        // 使用事件委托处理动态添加的筛选按钮
        addEventDelegate(document, 'click', '.filter-btn', (event) => {
            const category = event.target.getAttribute('data-category');
            this.toggleCategory(category, event.target);
        });
    }

    /**
     * 切换分类筛选
     * @param {string} category - 分类名称
     * @param {HTMLElement} button - 按钮元素
     */
    toggleCategory(category, button) {
        if (!category || !button) return;

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

    /**
     * 更新筛选显示
     */
    updateFilterDisplay() {
        const categories = document.querySelectorAll('.shortcut-category');
        
        if (this.selectedCategories.size === 0) {
            // 如果没有选中任何分类，显示所有分类
            this.showAllCategories();
        } else {
            // 只显示选中的分类
            categories.forEach(cat => {
                const catCategory = cat.getAttribute('data-category');
                if (this.selectedCategories.has(catCategory)) {
                    this.showCategory(cat, true);
                } else {
                    this.showCategory(cat, false);
                }
            });
        }

        // 添加动画效果
        this.animateFilteredCategories();
    }

    /**
     * 显示/隐藏分类
     * @param {HTMLElement} category - 分类元素
     * @param {boolean} show - 是否显示
     */
    showCategory(category, show) {
        category.style.display = show ? 'block' : 'none';
        category.classList.toggle('category-active', show);
    }

    /**
     * 显示所有分类
     */
    showAllCategories() {
        const categories = document.querySelectorAll('.shortcut-category');
        categories.forEach(cat => {
            this.showCategory(cat, true);
        });
    }

    /**
     * 隐藏所有分类
     */
    hideAllCategories() {
        const categories = document.querySelectorAll('.shortcut-category');
        categories.forEach(cat => {
            this.showCategory(cat, false);
        });
    }

    /**
     * 为筛选后的分类添加动画
     */
    animateFilteredCategories() {
        const visibleCategories = document.querySelectorAll('.shortcut-category[style*="block"]');
        visibleCategories.forEach((category, index) => {
            // 先移除动画类，防止重复添加
            category.classList.remove('animate-in');
            
            setTimeout(() => {
                category.classList.add('animate-in');
            }, index * this.staggerDelay);
        });
    }

    /**
     * 设置分类选中状态
     * @param {string} category - 分类名称
     * @param {boolean} selected - 是否选中
     */
    setCategorySelected(category, selected) {
        const button = document.querySelector(`[data-category="${category}"]`);
        if (!button) return;

        if (selected) {
            this.selectedCategories.add(category);
            button.classList.add('active');
        } else {
            this.selectedCategories.delete(category);
            button.classList.remove('active');
        }
        
        this.updateFilterDisplay();
    }

    /**
     * 获取选中的分类
     * @returns {Set} 选中的分类集合
     */
    getSelectedCategories() {
        return new Set(this.selectedCategories);
    }

    /**
     * 获取所有可用的分类
     * @returns {Array} 分类数组
     */
    getAllCategories() {
        const categories = [];
        document.querySelectorAll('.shortcut-category').forEach(cat => {
            const category = cat.getAttribute('data-category');
            if (category) {
                categories.push(category);
            }
        });
        return categories;
    }

    /**
     * 重置筛选
     */
    resetFilter() {
        this.selectedCategories.clear();
        
        // 移除所有按钮的active状态
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.classList.remove('active');
        });
        
        this.showAllCategories();
    }

    /**
     * 应用多个分类筛选
     * @param {Array} categories - 分类数组
     */
    applyMultipleFilters(categories) {
        this.selectedCategories.clear();
        
        categories.forEach(category => {
            this.selectedCategories.add(category);
            const button = document.querySelector(`[data-category="${category}"]`);
            if (button) {
                button.classList.add('active');
            }
        });
        
        this.updateFilterDisplay();
    }

    /**
     * 切换所有分类
     */
    toggleAllCategories() {
        const allCategories = this.getAllCategories();
        
        if (this.selectedCategories.size === allCategories.length) {
            // 如果所有分类都被选中，则取消选中所有
            this.resetFilter();
        } else {
            // 否则选中所有分类
            this.applyMultipleFilters(allCategories);
        }
    }

    /**
     * 根据搜索结果更新筛选显示
     * @param {string} searchQuery - 搜索查询
     */
    updateFilterBySearch(searchQuery) {
        if (!searchQuery) {
            this.updateFilterDisplay();
            return;
        }

        const categories = document.querySelectorAll('.shortcut-category');
        const visibleCategories = [];

        categories.forEach(cat => {
            const categoryItems = cat.querySelectorAll('.shortcut-item');
            let hasVisibleItems = false;

            categoryItems.forEach(item => {
                if (item.style.display !== 'none') {
                    hasVisibleItems = true;
                }
            });

            if (hasVisibleItems) {
                visibleCategories.push(cat);
                this.showCategory(cat, true);
            } else {
                this.showCategory(cat, false);
            }
        });

        this.animateFilteredCategories();
    }

    /**
     * 获取筛选统计信息
     * @returns {Object} 统计信息
     */
    getFilterStats() {
        const totalCategories = this.getAllCategories().length;
        const selectedCategories = this.selectedCategories.size;
        const visibleCategories = document.querySelectorAll('.shortcut-category[style*="block"]').length;
        
        return {
            total: totalCategories,
            selected: selectedCategories,
            visible: visibleCategories
        };
    }

    /**
     * 创建筛选状态指示器
     */
    createFilterIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'filter-indicator';
        indicator.innerHTML = `
            <span class="indicator-text">筛选</span>
            <span class="indicator-count">${this.selectedCategories.size}</span>
        `;
        
        return indicator;
    }

    /**
     * 更新筛选状态指示器
     */
    updateFilterIndicator() {
        const indicator = document.querySelector('.filter-indicator');
        if (indicator) {
            const countElement = indicator.querySelector('.indicator-count');
            if (countElement) {
                countElement.textContent = this.selectedCategories.size;
            }
            
            // 根据筛选状态更新样式
            indicator.classList.toggle('active', this.selectedCategories.size > 0);
        }
    }

    /**
     * 清理资源
     */
    cleanup() {
        this.selectedCategories.clear();
        
        // 移除所有动画类
        const categories = document.querySelectorAll('.shortcut-category');
        categories.forEach(cat => {
            cat.classList.remove('animate-in', 'category-active');
        });
    }
}

// 导出默认实例
export default new FilterManager(); 