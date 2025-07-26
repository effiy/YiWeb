/**
 * 全局加载状态管理工具
 * author: liangliang
 */

/**
 * 全局加载指示器管理类
 */
class GlobalLoadingManager {
    constructor() {
        this.indicator = null;
        this.isVisible = false;
        this.init();
    }

    /**
     * 初始化全局加载指示器
     */
    init() {
        this.indicator = document.getElementById('global-loading-indicator');
        if (!this.indicator) {
            console.warn('[GlobalLoadingManager] 全局加载指示器未找到');
        }
    }

    /**
     * 显示全局加载指示器
     * @param {string} message - 可选的加载消息
     */
    show(message = '') {
        if (!this.indicator) {
            this.init();
        }
        
        if (this.indicator) {
            this.indicator.classList.add('show');
            this.isVisible = true;
            
            // 如果有消息，可以在这里添加消息显示逻辑
            if (message) {
                console.log('[GlobalLoadingManager] 显示加载指示器:', message);
            }
        }
    }

    /**
     * 隐藏全局加载指示器
     */
    hide() {
        if (this.indicator) {
            this.indicator.classList.remove('show');
            this.isVisible = false;
        }
    }

    /**
     * 检查加载指示器是否可见
     * @returns {boolean} 是否可见
     */
    isShowing() {
        return this.isVisible;
    }

    /**
     * 带自动隐藏的加载显示
     * @param {Function} asyncFunction - 异步函数
     * @param {string} message - 加载消息
     * @returns {Promise} 异步函数的执行结果
     */
    async withLoading(asyncFunction, message = '') {
        try {
            this.show(message);
            const result = await asyncFunction();
            return result;
        } finally {
            this.hide();
        }
    }
}

// 创建全局实例
const globalLoading = new GlobalLoadingManager();

// 导出全局实例和工具函数
export { globalLoading };

// 便捷函数
export const showGlobalLoading = (message) => globalLoading.show(message);
export const hideGlobalLoading = () => globalLoading.hide();
export const withGlobalLoading = (asyncFunction, message) => globalLoading.withLoading(asyncFunction, message);

// 在全局作用域中暴露（用于调试）
if (typeof window !== 'undefined') {
    window.globalLoading = globalLoading;
    window.showGlobalLoading = showGlobalLoading;
    window.hideGlobalLoading = hideGlobalLoading;
    window.withGlobalLoading = withGlobalLoading;
} 
