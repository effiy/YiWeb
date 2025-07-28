/**
 * 接口等待交互管理工具
 * 提供API请求时的等待交互体验
 * author: liangliang
 */

/**
 * 接口等待交互管理器
 */
class ApiLoadingManager {
    constructor() {
        this.loadingStates = new Map(); // 存储各个请求的加载状态
        this.globalLoading = false;
        this.defaultTimeout = 30000; // 30秒默认超时
        this.defaultPosition = 'center'; // 默认位置

        this.init();
    }

    /**
     * 初始化加载管理器
     */
    init() {
        this.createLoadingUI();
        this.bindEvents();
    }

    /**
     * 创建加载UI元素
     */
    createLoadingUI() {
        // 检查是否已存在
        if (document.getElementById('api-loading-overlay')) {
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'api-loading-overlay';
        overlay.className = 'api-loading-overlay';
        overlay.innerHTML = `
            <div class="api-loading-container">
                <div class="api-loading-spinner">
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                </div>
                <div class="api-loading-content">
                    <h3 class="loading-title">正在处理请求...</h3>
                    <p class="loading-message" id="loading-message">请稍候</p>
                    <div class="loading-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" id="progress-fill"></div>
                        </div>
                        <span class="progress-text" id="progress-text">0%</span>
                    </div>
                    <div class="loading-details" id="loading-details"></div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 取消按钮相关事件已移除
        // 键盘快捷键支持（取消相关已移除）
    }

    /**
     * 设置加载容器位置
     * @param {string} position - 位置类型
     */
    setPosition(position = 'center') {
        const container = document.querySelector('.api-loading-container');
        if (!container) return;

        // 移除所有位置类
        const positionClasses = [
            'position-top', 'position-bottom', 'position-left', 'position-right',
            'position-top-left', 'position-top-right', 'position-bottom-left', 'position-bottom-right'
        ];
        container.classList.remove(...positionClasses);

        // 添加新的位置类
        if (position !== 'center') {
            container.classList.add(`position-${position}`);
        }

        this.defaultPosition = position;
    }

    /**
     * 显示加载界面
     * @param {string} requestId - 请求ID
     * @param {Object} options - 配置选项
     */
    show(requestId, options = {}) {
        const {
            message = '正在处理请求...',
            timeout = this.defaultTimeout,
            showProgress = true,
            // showCancel = true, // 取消相关已移除
            details = '',
            position = this.defaultPosition // 新增位置选项
        } = options;

        // 设置位置
        this.setPosition(position);

        // 记录加载状态
        this.loadingStates.set(requestId, {
            startTime: Date.now(),
            message,
            timeout,
            showProgress,
            // showCancel, // 取消相关已移除
            details,
            progress: 0, // 初始化进度为0
            cancelled: false,
            position // 保存位置信息
        });

        this.globalLoading = true;
        this.updateUI(requestId);

        // 设置超时
        if (timeout > 0) {
            setTimeout(() => {
                if (this.loadingStates.has(requestId)) {
                    this.handleTimeout(requestId);
                }
            }, timeout);
        }
    }

    /**
     * 隐藏加载界面
     * @param {string} requestId - 请求ID
     */
    hide(requestId) {
        const state = this.loadingStates.get(requestId);
        if (state) {
            // 清理进度更新定时器
            if (state.progressInterval) {
                clearInterval(state.progressInterval);
            }
        }
        
        this.loadingStates.delete(requestId);
        
        if (this.loadingStates.size === 0) {
            this.globalLoading = false;
            this.hideUI();
        } else {
            // 更新UI显示其他请求的信息
            const nextRequestId = Array.from(this.loadingStates.keys())[0];
            this.updateUI(nextRequestId);
        }
    }

    /**
     * 更新进度
     * @param {string} requestId - 请求ID
     * @param {number} progress - 进度百分比 (0-100)
     * @param {string} message - 进度消息
     */
    updateProgress(requestId, progress, message = '') {
        const state = this.loadingStates.get(requestId);
        if (state) {
            state.progress = Math.min(100, Math.max(0, progress));
            if (message) {
                state.message = message;
            }
            this.updateUI(requestId);
        }
    }

    /**
     * 更新详细信息
     * @param {string} requestId - 请求ID
     * @param {string} details - 详细信息
     */
    updateDetails(requestId, details) {
        const state = this.loadingStates.get(requestId);
        if (state) {
            state.details = details;
            this.updateUI(requestId);
        }
    }

    /**
     * 更新UI显示
     * @param {string} requestId - 请求ID
     */
    updateUI(requestId) {
        const overlay = document.getElementById('api-loading-overlay');
        if (!overlay) return;

        const state = this.loadingStates.get(requestId);
        if (!state) return;

        // 更新位置
        if (state.position) {
            this.setPosition(state.position);
        }

        // 更新消息
        const messageEl = document.getElementById('loading-message');
        if (messageEl) {
            messageEl.textContent = state.message;
        }

        // 更新进度条
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const progressContainer = document.querySelector('.loading-progress');
        
        if (progressFill && progressText && progressContainer) {
            if (state.showProgress) {
                const progress = state.progress || 0;
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `${Math.round(progress)}%`;
                progressContainer.style.display = 'flex';
            } else {
                progressContainer.style.display = 'none';
            }
        }

        // 更新详细信息
        const detailsEl = document.getElementById('loading-details');
        if (detailsEl && state.details) {
            detailsEl.innerHTML = state.details;
            detailsEl.style.display = 'block';
        } else if (detailsEl) {
            detailsEl.style.display = 'none';
        }

        // 取消按钮相关已移除

        // 显示加载界面
        overlay.classList.add('show');
    }

    /**
     * 隐藏UI
     */
    hideUI() {
        const overlay = document.getElementById('api-loading-overlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }

    /**
     * 处理超时
     * @param {string} requestId - 请求ID
     */
    handleTimeout(requestId) {
        const state = this.loadingStates.get(requestId);
        if (state && !state.cancelled) {
            this.showError(requestId, '请求超时，请检查网络连接');
        }
    }

    /**
     * 显示错误信息
     * @param {string} requestId - 请求ID
     * @param {string} error - 错误信息
     */
    showError(requestId, error) {
        this.updateDetails(requestId, `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> ${error}</div>`);
        
        // 3秒后自动隐藏
        setTimeout(() => {
            this.hide(requestId);
        }, 3000);
    }

    // 取消所有请求相关方法已移除

    /**
     * 触发自定义事件
     * @param {string} eventName - 事件名称
     * @param {Object} data - 事件数据
     */
    triggerEvent(eventName, data = {}) {
        const event = new CustomEvent(`apiLoading:${eventName}`, {
            detail: data,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    /**
     * 带加载状态的异步函数包装器
     * @param {Function} asyncFunction - 异步函数
     * @param {Object} options - 配置选项
     * @returns {Promise} 异步函数的执行结果
     */
    async withLoading(asyncFunction, options = {}) {
        const requestId = this.generateRequestId();
        const {
            message = '正在处理请求...',
            timeout = this.defaultTimeout,
            showProgress = true,
            // showCancel = true, // 取消相关已移除
            autoProgress = true, // 自动进度更新
            position = this.defaultPosition // 新增位置选项
        } = options;

        try {
            this.show(requestId, { message, timeout, showProgress, position });
            
            // 如果启用自动进度，开始进度动画
            if (autoProgress && showProgress) {
                this.startAutoProgress(requestId);
            }
            
            try {
                const result = await asyncFunction();
                
                // 完成时设置进度为100%
                if (showProgress) {
                    this.updateProgress(requestId, 100, '处理完成');
                }
                
                this.hide(requestId);
                return result;
            } catch (error) {
                this.showError(requestId, `请求失败: ${error.message}`);
                throw error;
            }
        } catch (error) {
            this.hide(requestId);
            throw error;
        }
    }

    /**
     * 开始自动进度更新
     * @param {string} requestId - 请求ID
     */
    startAutoProgress(requestId) {
        const state = this.loadingStates.get(requestId);
        if (!state || !state.showProgress) return;

        let progress = 0;
        const interval = setInterval(() => {
            if (!this.loadingStates.has(requestId)) {
                clearInterval(interval);
                return;
            }

            // 渐进式进度更新，避免太快到达100%
            if (progress < 90) {
                progress += Math.random() * 5 + 1; // 1-6%的随机增长
                this.updateProgress(requestId, progress);
            }
        }, 200); // 每200ms更新一次

        // 保存interval ID以便清理
        state.progressInterval = interval;
    }

    /**
     * 生成请求ID
     * @returns {string} 请求ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 延迟函数
     * @param {number} ms - 延迟毫秒数
     * @returns {Promise} Promise对象
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 检查是否有正在进行的请求
     * @returns {boolean} 是否有正在进行的请求
     */
    hasActiveRequests() {
        return this.loadingStates.size > 0;
    }

    /**
     * 获取当前请求数量
     * @returns {number} 请求数量
     */
    getActiveRequestCount() {
        return this.loadingStates.size;
    }

    /**
     * 获取支持的位置选项
     * @returns {Array} 位置选项数组
     */
    getSupportedPositions() {
        return [
            'center',
            'top',
            'bottom', 
            'left',
            'right',
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right'
        ];
    }
}

// 创建全局实例
const apiLoading = new ApiLoadingManager();

// 导出全局实例和工具函数
export { apiLoading };

// 便捷函数
export const showApiLoading = (requestId, options) => apiLoading.show(requestId, options);
export const hideApiLoading = (requestId) => apiLoading.hide(requestId);
export const updateApiProgress = (requestId, progress, message) => apiLoading.updateProgress(requestId, progress, message);
export const withApiLoading = (asyncFunction, options) => apiLoading.withLoading(asyncFunction, options);
export const setApiLoadingPosition = (position) => apiLoading.setPosition(position);

// 测试进度条函数
export const testProgressBar = () => {
    const requestId = apiLoading.generateRequestId();
    apiLoading.show(requestId, { 
        message: '测试进度条功能', 
        showProgress: true 
    });
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        apiLoading.updateProgress(requestId, progress, `测试进度: ${progress}%`);
        
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                apiLoading.hide(requestId);
            }, 1000);
        }
    }, 500);
};

// 测试不同位置的函数
export const testPositions = () => {
    const positions = apiLoading.getSupportedPositions();
    let currentIndex = 0;
    
    const testNextPosition = () => {
        if (currentIndex >= positions.length) {
            apiLoading.hide('test-position');
            return;
        }
        
        const position = positions[currentIndex];
        const requestId = 'test-position';
        
        apiLoading.show(requestId, {
            message: `测试位置: ${position}`,
            position: position,
            showProgress: true
        });
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += 20;
            apiLoading.updateProgress(requestId, progress, `位置: ${position} - ${progress}%`);
            
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    currentIndex++;
                    testNextPosition();
                }, 1000);
            }
        }, 300);
    };
    
    testNextPosition();
};

// 在全局作用域中暴露（用于调试）
if (typeof window !== 'undefined') {
    window.apiLoading = apiLoading;
    window.showApiLoading = showApiLoading;
    window.hideApiLoading = hideApiLoading;
    window.updateApiProgress = updateApiProgress;
    window.withApiLoading = withApiLoading;
    window.setApiLoadingPosition = setApiLoadingPosition;
    window.testProgressBar = testProgressBar;
    window.testPositions = testPositions;
} 