/**
 * 快捷键管理器主文件
 
 * 
 * 重构后的快捷键管理器，整合所有功能模块
 */

import { getConfig } from '../../config/index.js';
import { keyboardHandler } from '../../utils/events.js';
import { SearchManager } from './modules/search.js';
import { FilterManager } from './modules/filter.js';
import { AnimationManager } from './modules/animation.js';

/**
 * 快捷键管理器主类
 */
class ShortcutsManager {
    constructor() {
        this.searchManager = null;
        this.filterManager = null;
        this.animationManager = null;
        this.isInitialized = false;
        
        // 从配置中获取设置
        this.config = {
            animationDuration: getConfig('shortcuts.ANIMATION_DURATION', 300),
            searchDebounce: getConfig('shortcuts.SEARCH_DEBOUNCE', 300),
            staggerDelay: getConfig('shortcuts.STAGGER_DELAY', 50)
        };
        
        this.init();
    }

    /**
     * 初始化管理器
     */
    init() {
        if (this.isInitialized) return;
        
        try {
            // 初始化各个子模块
            this.initSubModules();
            
            // 初始化键盘快捷键
            this.initKeyboardShortcuts();
            
            // 绑定全局事件
            this.bindGlobalEvents();
            
            this.isInitialized = true;
            console.log('快捷键管理器初始化完成');
        } catch (error) {
            console.error('快捷键管理器初始化失败:', error);
        }
    }

    /**
     * 初始化子模块
     */
    initSubModules() {
        // 等待DOM加载完成后初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createSubModules();
            });
        } else {
            this.createSubModules();
        }
    }

    /**
     * 创建子模块实例
     */
    createSubModules() {
        try {
            // 创建搜索管理器
            this.searchManager = new SearchManager();
            
            // 创建筛选管理器
            this.filterManager = new FilterManager();
            
            // 创建动画管理器
            this.animationManager = new AnimationManager();
            
            console.log('子模块初始化完成');
        } catch (error) {
            console.error('子模块初始化失败:', error);
        }
    }

    /**
     * 初始化键盘快捷键
     */
    initKeyboardShortcuts() {
        // Ctrl/Cmd + F 聚焦搜索框
        keyboardHandler.register('ctrl+f', (event) => {
            event.preventDefault();
            this.focusSearchInput();
        });

        keyboardHandler.register('cmd+f', (event) => {
            event.preventDefault();
            this.focusSearchInput();
        });

        // Ctrl/Cmd + K 清空搜索
        keyboardHandler.register('ctrl+k', (event) => {
            event.preventDefault();
            this.clearSearch();
        });

        keyboardHandler.register('cmd+k', (event) => {
            event.preventDefault();
            this.clearSearch();
        });

        // Escape 清空搜索
        keyboardHandler.register('escape', () => {
            this.clearSearch();
        });
    }

    /**
     * 绑定全局事件
     */
    bindGlobalEvents() {
        // 页面卸载时清理资源
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // 页面可见性变化时的处理
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onPageHidden();
            } else {
                this.onPageVisible();
            }
        });

        // 窗口大小变化时的处理
        window.addEventListener('resize', this.debounce(() => {
            this.onWindowResize();
        }, 200));
    }

    /**
     * 聚焦搜索输入框
     */
    focusSearchInput() {
        const searchInput = document.getElementById('messageInput');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    /**
     * 清空搜索
     */
    clearSearch() {
        if (this.searchManager) {
            this.searchManager.clearSearch();
        }
    }

    /**
     * 重置筛选
     */
    resetFilter() {
        if (this.filterManager) {
            this.filterManager.resetFilter();
        }
    }

    /**
     * 获取搜索管理器
     * @returns {SearchManager} 搜索管理器实例
     */
    getSearchManager() {
        return this.searchManager;
    }

    /**
     * 获取筛选管理器
     * @returns {FilterManager} 筛选管理器实例
     */
    getFilterManager() {
        return this.filterManager;
    }

    /**
     * 获取动画管理器
     * @returns {AnimationManager} 动画管理器实例
     */
    getAnimationManager() {
        return this.animationManager;
    }

    /**
     * 执行搜索
     * @param {string} query - 搜索查询
     */
    performSearch(query) {
        if (this.searchManager) {
            this.searchManager.handleSearch({ target: { value: query } });
        }
    }

    /**
     * 应用筛选
     * @param {Array} categories - 要筛选的分类
     */
    applyFilter(categories) {
        if (this.filterManager) {
            this.filterManager.applyMultipleFilters(categories);
        }
    }

    /**
     * 播放动画
     * @param {HTMLElement} element - 要动画的元素
     * @param {string} animationType - 动画类型
     */
    playAnimation(element, animationType = 'fadeIn') {
        if (this.animationManager && this.animationManager[animationType]) {
            this.animationManager[animationType](element);
        }
    }

    /**
     * 获取所有快捷键数据
     * @returns {Array} 快捷键数组
     */
    getAllShortcuts() {
        if (this.searchManager) {
            return this.searchManager.getAllShortcuts();
        }
        return [];
    }

    /**
     * 获取筛选统计信息
     * @returns {Object} 统计信息
     */
    getFilterStats() {
        if (this.filterManager) {
            return this.filterManager.getFilterStats();
        }
        return { total: 0, selected: 0, visible: 0 };
    }

    /**
     * 更新配置
     * @param {Object} newConfig - 新配置
     */
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        
        // 通知子模块配置更新
        this.notifyConfigUpdate();
    }

    /**
     * 通知子模块配置更新
     */
    notifyConfigUpdate() {
        // 可以在这里通知各个子模块配置发生了变化
        console.log('配置已更新:', this.config);
    }

    /**
     * 页面隐藏时的处理
     */
    onPageHidden() {
        // 可以在这里暂停某些功能以节省资源
        console.log('页面已隐藏');
    }

    /**
     * 页面可见时的处理
     */
    onPageVisible() {
        // 可以在这里恢复某些功能
        console.log('页面已可见');
    }

    /**
     * 窗口大小变化时的处理
     */
    onWindowResize() {
        // 可以在这里处理响应式布局
        console.log('窗口大小已变化');
    }

    /**
     * 防抖函数
     * @param {Function} func - 要防抖的函数
     * @param {number} wait - 等待时间
     * @returns {Function} 防抖后的函数
     */
    debounce(func, wait) {
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

    /**
     * 获取管理器状态
     * @returns {Object} 状态对象
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasSearchManager: !!this.searchManager,
            hasFilterManager: !!this.filterManager,
            hasAnimationManager: !!this.animationManager,
            config: this.config
        };
    }

    /**
     * 重新初始化
     */
    reinitialize() {
        this.cleanup();
        this.isInitialized = false;
        this.init();
    }

    /**
     * 清理资源
     */
    cleanup() {
        try {
            // 清理子模块
            if (this.searchManager) {
                this.searchManager.cleanup();
                this.searchManager = null;
            }
            
            if (this.filterManager) {
                this.filterManager.cleanup();
                this.filterManager = null;
            }
            
            if (this.animationManager) {
                this.animationManager.cleanup();
                this.animationManager = null;
            }

            // 清理键盘快捷键
            keyboardHandler.cleanup();
            
            this.isInitialized = false;
            console.log('快捷键管理器已清理');
        } catch (error) {
            console.error('清理快捷键管理器时出错:', error);
        }
    }
}

// 创建全局实例
const shortcutsManager = new ShortcutsManager();

// 导出到全局作用域，方便调试
window.shortcutsManager = shortcutsManager;

// 导出管理器类和实例
export { ShortcutsManager };
export default shortcutsManager; 