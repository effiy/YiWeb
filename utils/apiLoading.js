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
        this.defaultTimeout = 300000; // 300秒默认超时
        this.defaultPosition = 'center'; // 默认位置
        this.scrollTop = 0; // 记录滚动位置

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
        // 防止滚动穿透
        const overlay = document.getElementById('api-loading-overlay');
        if (overlay) {
            overlay.addEventListener('touchmove', (e) => {
                e.preventDefault();
            }, { passive: false });
            
            overlay.addEventListener('wheel', (e) => {
                e.preventDefault();
            }, { passive: false });
        }
    }

    /**
     * 处理滚动位置
     */
    handleScrollPosition() {
        // 记录当前滚动位置
        this.scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // 设置CSS变量
        document.documentElement.style.setProperty('--scroll-top', `${this.scrollTop}px`);
        
        // 添加滚动锁定类
        document.documentElement.classList.add('api-loading-active');
        document.body.classList.add('api-loading-active');
    }

    /**
     * 恢复滚动位置
     */
    restoreScrollPosition() {
        // 移除滚动锁定类
        document.documentElement.classList.remove('api-loading-active');
        document.body.classList.remove('api-loading-active');
        
        // 恢复滚动位置
        if (this.scrollTop > 0) {
            window.scrollTo(0, this.scrollTop);
        }
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
            details = '',
            position = this.defaultPosition,
            delayShow = 3000
        } = options;

        // 处理滚动位置
        this.handleScrollPosition();

        // 设置位置
        this.setPosition(position);

        // 记录加载状态
        this.loadingStates.set(requestId, {
            startTime: Date.now(),
            message,
            timeout,
            showProgress,
            details,
            progress: 0,
            cancelled: false,
            position,
            delayShow,
            delayedShowTimer: null
        });

        this.globalLoading = true;

        // 延迟显示loading界面
        if (delayShow > 0) {
            const delayedShowTimer = setTimeout(() => {
                const state = this.loadingStates.get(requestId);
                if (state && !state.cancelled) {
                    this.updateUI(requestId);
                }
            }, delayShow);
            
            // 保存定时器ID
            const state = this.loadingStates.get(requestId);
            if (state) {
                state.delayedShowTimer = delayedShowTimer;
            }
        } else {
            // 立即显示
            this.updateUI(requestId);
        }

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
            
            // 清理延迟显示定时器
            if (state.delayedShowTimer) {
                clearTimeout(state.delayedShowTimer);
            }
        }
        
        this.loadingStates.delete(requestId);
        
        if (this.loadingStates.size === 0) {
            this.globalLoading = false;
            this.hideUI();
            // 恢复滚动位置
            this.restoreScrollPosition();
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

        // 确保overlay在正确位置
        this.ensureOverlayPosition();

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

        // 确保api-loading-content可见
        this.ensureContentVisibility();

        // 显示加载界面
        overlay.classList.add('show');
    }

    /**
     * 确保内容可见性
     */
    ensureContentVisibility() {
        const contentEl = document.querySelector('.api-loading-content');
        if (!contentEl) return;

        // 强制设置可见性样式
        contentEl.style.display = 'block';
        contentEl.style.visibility = 'visible';
        contentEl.style.opacity = '1';
        contentEl.style.zIndex = '10001';
        contentEl.style.position = 'relative';
        contentEl.style.width = '100%';
        contentEl.style.maxHeight = 'none';
        contentEl.style.overflow = 'visible';

        // 确保所有子元素也可见
        const children = contentEl.querySelectorAll('*');
        children.forEach(child => {
            if (child.style.display === 'none') {
                child.style.display = '';
            }
            if (child.style.visibility === 'hidden') {
                child.style.visibility = 'visible';
            }
        });

        // 智能容器位置检测和调整
        this.adjustContainerPosition();
    }

    /**
     * 智能调整容器位置
     */
    adjustContainerPosition() {
        const container = document.querySelector('.api-loading-container');
        const overlay = document.getElementById('api-loading-overlay');
        if (!container || !overlay) return;

        // 获取视口信息
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const containerRect = container.getBoundingClientRect();
        
        // 计算安全边距
        const safeMargin = Math.max(20, Math.min(viewportWidth, viewportHeight) * 0.05);
        
        // 设置CSS变量
        container.style.setProperty('--safe-margin', `${safeMargin}px`);
        container.style.setProperty('--viewport-width', `${viewportWidth}px`);
        container.style.setProperty('--viewport-height', `${viewportHeight}px`);

        // 检查容器是否超出视口边界
        const isOutOfBounds = 
            containerRect.top < safeMargin ||
            containerRect.bottom > viewportHeight - safeMargin ||
            containerRect.left < safeMargin ||
            containerRect.right > viewportWidth - safeMargin;

        if (isOutOfBounds) {
            // 智能重新定位
            this.repositionContainer(container, viewportWidth, viewportHeight, safeMargin);
        }

        // 确保容器在视口内
        this.ensureContainerInViewport(container, viewportWidth, viewportHeight, safeMargin);
    }

    /**
     * 重新定位容器
     */
    repositionContainer(container, viewportWidth, viewportHeight, safeMargin) {
        const rect = container.getBoundingClientRect();
        const containerWidth = rect.width;
        const containerHeight = rect.height;

        // 计算最佳位置
        let newTop = rect.top;
        let newLeft = rect.left;

        // 水平居中
        if (containerWidth < viewportWidth - 2 * safeMargin) {
            newLeft = (viewportWidth - containerWidth) / 2;
        } else {
            // 如果容器太宽，确保不超出边界
            newLeft = Math.max(safeMargin, Math.min(newLeft, viewportWidth - containerWidth - safeMargin));
        }

        // 垂直居中
        if (containerHeight < viewportHeight - 2 * safeMargin) {
            newTop = (viewportHeight - containerHeight) / 2;
        } else {
            // 如果容器太高，确保不超出边界
            newTop = Math.max(safeMargin, Math.min(newTop, viewportHeight - containerHeight - safeMargin));
        }

        // 应用新位置
        container.style.position = 'absolute';
        container.style.top = `${newTop}px`;
        container.style.left = `${newLeft}px`;
        container.style.transform = 'none';
        container.style.zIndex = '10000';
    }

    /**
     * 确保容器在视口内
     */
    ensureContainerInViewport(container, viewportWidth, viewportHeight, safeMargin) {
        const rect = container.getBoundingClientRect();
        
        // 检查并调整水平位置
        if (rect.left < safeMargin) {
            container.style.left = `${safeMargin}px`;
        } else if (rect.right > viewportWidth - safeMargin) {
            container.style.left = `${viewportWidth - rect.width - safeMargin}px`;
        }

        // 检查并调整垂直位置
        if (rect.top < safeMargin) {
            container.style.top = `${safeMargin}px`;
        } else if (rect.bottom > viewportHeight - safeMargin) {
            container.style.top = `${viewportHeight - rect.height - safeMargin}px`;
        }

        // 确保容器不会超出视口
        const finalRect = container.getBoundingClientRect();
        if (finalRect.width > viewportWidth - 2 * safeMargin) {
            container.style.width = `${viewportWidth - 2 * safeMargin}px`;
            container.style.maxWidth = `${viewportWidth - 2 * safeMargin}px`;
        }

        if (finalRect.height > viewportHeight - 2 * safeMargin) {
            container.style.maxHeight = `${viewportHeight - 2 * safeMargin}px`;
            container.style.overflowY = 'auto';
        }
    }

    /**
     * 确保overlay在正确位置
     */
    ensureOverlayPosition() {
        const overlay = document.getElementById('api-loading-overlay');
        if (!overlay) return;

        // 确保overlay始终在视口内
        const rect = overlay.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // 如果overlay超出视口，调整位置
        if (rect.top < 0 || rect.bottom > viewportHeight || 
            rect.left < 0 || rect.right > viewportWidth) {
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
        }
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
            autoProgress = true,
            position = this.defaultPosition,
            delayShow = 3000
        } = options;

        try {
            this.show(requestId, { message, timeout, showProgress, position, delayShow });
            
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

    /**
     * 强制刷新overlay位置
     * 用于处理滚动后位置异常的情况
     */
    forceRefreshPosition() {
        const overlay = document.getElementById('api-loading-overlay');
        if (overlay && this.globalLoading) {
            // 临时隐藏再显示，强制重新计算位置
            overlay.style.display = 'none';
            setTimeout(() => {
                overlay.style.display = 'flex';
                this.ensureOverlayPosition();
            }, 10);
        }
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
export const forceRefreshApiLoadingPosition = () => apiLoading.forceRefreshPosition();

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

// 测试滚动处理函数
export const testScrollHandling = () => {
    const requestId = apiLoading.generateRequestId();
    
    // 滚动到页面底部
    window.scrollTo(0, document.body.scrollHeight);
    
    setTimeout(() => {
        apiLoading.show(requestId, {
            message: '测试滚动处理 - 在页面底部显示',
            showProgress: true,
            position: 'center'
        });
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += 15;
            apiLoading.updateProgress(requestId, progress, `滚动测试: ${progress}%`);
            
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    apiLoading.hide(requestId);
                    // 恢复滚动位置
                    window.scrollTo(0, 0);
                }, 1000);
            }
        }, 400);
    }, 1000);
};

// 测试内容显示函数
export const testContentVisibility = () => {
    const requestId = apiLoading.generateRequestId();
    
    // 滚动到页面中间
    window.scrollTo(0, document.body.scrollHeight / 2);
    
    setTimeout(() => {
        apiLoading.show(requestId, {
            message: '测试内容显示 - 验证api-loading-content是否可见',
            showProgress: true,
            position: 'center',
            details: '这是详细信息，用于测试内容显示是否正常。如果能看到这段文字，说明修复成功！'
        });
        
        // 检查内容元素
        setTimeout(() => {
            const contentEl = document.querySelector('.api-loading-content');
            const containerEl = document.querySelector('.api-loading-container');
            const overlayEl = document.getElementById('api-loading-overlay');
            
            console.log('=== 内容显示测试 ===');
            console.log('Overlay元素:', overlayEl);
            console.log('Container元素:', containerEl);
            console.log('Content元素:', contentEl);
            
            if (contentEl) {
                console.log('Content样式:', {
                    display: contentEl.style.display,
                    visibility: contentEl.style.visibility,
                    opacity: contentEl.style.opacity,
                    zIndex: contentEl.style.zIndex,
                    position: contentEl.style.position,
                    width: contentEl.style.width,
                    maxHeight: contentEl.style.maxHeight,
                    overflow: contentEl.style.overflow
                });
                
                const rect = contentEl.getBoundingClientRect();
                console.log('Content位置:', {
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                    visible: rect.width > 0 && rect.height > 0
                });
            }
            
            // 3秒后隐藏
            setTimeout(() => {
                apiLoading.hide(requestId);
                window.scrollTo(0, 0);
            }, 3000);
        }, 500);
    }, 1000);
};

// 测试位置优化函数
export const testPositionOptimization = () => {
    const requestId = apiLoading.generateRequestId();
    
    // 滚动到页面底部
    window.scrollTo(0, document.body.scrollHeight);
    
    setTimeout(() => {
        apiLoading.show(requestId, {
            message: '测试位置优化 - 验证智能定位功能',
            showProgress: true,
            position: 'center',
            details: '这个测试会验证容器和内容的位置是否被正确优化。如果容器始终在视口内且内容完全可见，说明优化成功！'
        });
        
        // 检查位置优化效果
        setTimeout(() => {
            const container = document.querySelector('.api-loading-container');
            const content = document.querySelector('.api-loading-content');
            const overlay = document.getElementById('api-loading-overlay');
            
            console.log('=== 位置优化测试 ===');
            
            if (container) {
                const containerRect = container.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                
                console.log('视口尺寸:', { width: viewportWidth, height: viewportHeight });
                console.log('容器位置:', {
                    top: containerRect.top,
                    left: containerRect.left,
                    width: containerRect.width,
                    height: containerRect.height,
                    right: containerRect.right,
                    bottom: containerRect.bottom
                });
                
                // 检查是否在视口内
                const isInViewport = 
                    containerRect.top >= 0 &&
                    containerRect.bottom <= viewportHeight &&
                    containerRect.left >= 0 &&
                    containerRect.right <= viewportWidth;
                
                console.log('容器是否在视口内:', isInViewport);
                
                // 检查安全边距
                const safeMargin = 20;
                const hasSafeMargin = 
                    containerRect.top >= safeMargin &&
                    containerRect.bottom <= viewportHeight - safeMargin &&
                    containerRect.left >= safeMargin &&
                    containerRect.right <= viewportWidth - safeMargin;
                
                console.log('是否保持安全边距:', hasSafeMargin);
            }
            
            if (content) {
                const contentRect = content.getBoundingClientRect();
                console.log('内容位置:', {
                    top: contentRect.top,
                    left: contentRect.left,
                    width: contentRect.width,
                    height: contentRect.height,
                    visible: contentRect.width > 0 && contentRect.height > 0
                });
                
                // 检查内容是否完全可见
                const isContentVisible = 
                    contentRect.width > 0 && 
                    contentRect.height > 0 &&
                    content.style.display !== 'none' &&
                    content.style.visibility !== 'hidden';
                
                console.log('内容是否完全可见:', isContentVisible);
            }
            
            // 5秒后隐藏
            setTimeout(() => {
                apiLoading.hide(requestId);
                window.scrollTo(0, 0);
            }, 5000);
        }, 1000);
    }, 1000);
};

// 在全局作用域中暴露（用于调试）
if (typeof window !== 'undefined') {
    window.apiLoading = apiLoading;
    window.showApiLoading = showApiLoading;
    window.hideApiLoading = hideApiLoading;
    window.updateApiProgress = updateApiProgress;
    window.withApiLoading = withApiLoading;
    window.setApiLoadingPosition = setApiLoadingPosition;
    window.forceRefreshApiLoadingPosition = forceRefreshApiLoadingPosition;
    window.testProgressBar = testProgressBar;
    window.testPositions = testPositions;
    window.testScrollHandling = testScrollHandling;
    window.testContentVisibility = testContentVisibility;
    window.testPositionOptimization = testPositionOptimization;
} 