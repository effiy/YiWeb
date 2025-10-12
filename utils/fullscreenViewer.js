/**
 * 统一全屏查看器管理器
 * 提供通用的全屏查看功能，支持多种内容类型
 * @author liangliang
 */

class FullscreenViewer {
    constructor() {
        this.isOpen = false;
        this.currentModal = null;
        this.eventHandlers = new Map();
        this.config = {
            zIndex: 10000,
            animationDuration: 300,
            backdropBlur: true,
            closeOnEscape: true,
            closeOnBackdropClick: true,
            theme: 'auto' // 'auto', 'light', 'dark'
        };
        this.init();
    }

    /**
     * 初始化全屏查看器
     */
    init() {
        this.createStyles();
        this.setupGlobalEventListeners();
    }

    /**
     * 创建样式
     */
    createStyles() {
        if (document.getElementById('fullscreen-viewer-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'fullscreen-viewer-styles';
        style.textContent = `
            /* 全屏查看器基础样式 */
            .fullscreen-viewer {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: ${this.config.zIndex};
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all ${this.config.animationDuration}ms ease-out;
                overflow: hidden;
            }

            .fullscreen-viewer.open {
                opacity: 1;
                visibility: visible;
            }

            .fullscreen-viewer-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                ${this.config.backdropBlur ? 'backdrop-filter: blur(8px);' : ''}
                -webkit-backdrop-filter: blur(8px);
                cursor: pointer;
            }

            .fullscreen-viewer-content {
                position: relative;
                background: var(--bg-primary, #ffffff);
                border: 1px solid var(--border-primary, #e5e7eb);
                border-radius: 16px;
                max-width: 95vw;
                max-height: 95vh;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                transform: scale(0.9);
                transition: transform ${this.config.animationDuration}ms ease-out;
            }

            .fullscreen-viewer.open .fullscreen-viewer-content {
                transform: scale(1);
            }

            .fullscreen-viewer-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px;
                background: var(--bg-secondary, #f8fafc);
                border-bottom: 1px solid var(--border-primary, #e5e7eb);
                border-radius: 16px 16px 0 0;
                flex-shrink: 0;
            }

            .fullscreen-viewer-title {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: var(--text-primary, #1f2937);
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .fullscreen-viewer-actions {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .fullscreen-viewer-btn {
                background: transparent;
                border: 1px solid var(--border-primary, #d1d5db);
                border-radius: 8px;
                padding: 8px 12px;
                cursor: pointer;
                color: var(--text-secondary, #6b7280);
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .fullscreen-viewer-btn:hover {
                background: var(--bg-tertiary, #f3f4f6);
                border-color: var(--primary, #3b82f6);
                color: var(--primary, #3b82f6);
                transform: translateY(-1px);
            }

            .fullscreen-viewer-btn.primary {
                background: var(--primary, #3b82f6);
                border-color: var(--primary, #3b82f6);
                color: white;
            }

            .fullscreen-viewer-btn.primary:hover {
                background: var(--primary-dark, #2563eb);
                border-color: var(--primary-dark, #2563eb);
            }

            .fullscreen-viewer-btn.danger {
                background: var(--danger, #ef4444);
                border-color: var(--danger, #ef4444);
                color: white;
            }

            .fullscreen-viewer-btn.danger:hover {
                background: var(--danger-dark, #dc2626);
                border-color: var(--danger-dark, #dc2626);
            }

            .fullscreen-viewer-close {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                border: none;
                font-size: 16px;
                color: white;
                cursor: pointer;
                padding: 0;
                border-radius: 50%;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
                position: relative;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
            }

            .fullscreen-viewer-close::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
                opacity: 0;
                transition: opacity 0.3s ease;
                border-radius: 50%;
            }

            .fullscreen-viewer-close:hover {
                transform: scale(1.1) rotate(90deg);
                box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
            }

            .fullscreen-viewer-close:hover::before {
                opacity: 1;
            }

            .fullscreen-viewer-close:active {
                transform: scale(0.95) rotate(90deg);
                box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
            }

            .fullscreen-viewer-close i {
                position: relative;
                z-index: 1;
                transition: all 0.3s ease;
            }

            .fullscreen-viewer-close:hover i {
                transform: scale(1.1);
            }

            /* 关闭按钮的脉冲动画 */
            .fullscreen-viewer-close.pulse {
                animation: closeButtonPulse 2s infinite;
            }

            @keyframes closeButtonPulse {
                0% {
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
                }
                50% {
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3), 0 0 0 8px rgba(239, 68, 68, 0.1);
                }
                100% {
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
                }
            }

            /* 关闭按钮的呼吸效果 */
            .fullscreen-viewer-close.breathing {
                animation: closeButtonBreathing 3s ease-in-out infinite;
            }

            @keyframes closeButtonBreathing {
                0%, 100% {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.05);
                }
            }

            /* 关闭按钮的变体样式 */
            .fullscreen-viewer-close.variant-1 {
                background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
            }

            .fullscreen-viewer-close.variant-1::before {
                background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
            }

            .fullscreen-viewer-close.variant-2 {
                background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
                box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
            }

            .fullscreen-viewer-close.variant-2::before {
                background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
            }

            .fullscreen-viewer-close.variant-3 {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            }

            .fullscreen-viewer-close.variant-3::before {
                background: linear-gradient(135deg, #059669 0%, #047857 100%);
            }

            /* 关闭按钮的加载状态 */
            .fullscreen-viewer-close.loading {
                pointer-events: none;
                opacity: 0.7;
            }

            .fullscreen-viewer-close.loading i {
                animation: closeButtonSpin 1s linear infinite;
            }

            @keyframes closeButtonSpin {
                from {
                    transform: rotate(0deg);
                }
                to {
                    transform: rotate(360deg);
                }
            }

            .fullscreen-viewer-body {
                flex: 1;
                padding: 24px;
                overflow: auto;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            }

            .fullscreen-viewer-body::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }

            .fullscreen-viewer-body::-webkit-scrollbar-track {
                background: var(--bg-secondary, #f8fafc);
                border-radius: 4px;
            }

            .fullscreen-viewer-body::-webkit-scrollbar-thumb {
                background: var(--border-primary, #d1d5db);
                border-radius: 4px;
            }

            .fullscreen-viewer-body::-webkit-scrollbar-thumb:hover {
                background: var(--primary, #3b82f6);
            }

            /* 内容类型特定样式 */
            .fullscreen-viewer-content svg {
                max-width: 100%;
                max-height: 100%;
                display: block;
            }

            .fullscreen-viewer-content img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                display: block;
            }

            .fullscreen-viewer-content pre {
                max-width: 100%;
                max-height: 100%;
                overflow: auto;
                background: var(--bg-secondary, #f8fafc);
                border: 1px solid var(--border-primary, #e5e7eb);
                border-radius: 8px;
                padding: 16px;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 14px;
                line-height: 1.5;
            }

            /* 响应式设计 */
            @media (max-width: 768px) {
                .fullscreen-viewer-content {
                    max-width: 98vw;
                    max-height: 98vh;
                    border-radius: 12px;
                }

                .fullscreen-viewer-header {
                    padding: 16px 20px;
                }

                .fullscreen-viewer-title {
                    font-size: 16px;
                }

                .fullscreen-viewer-body {
                    padding: 20px 16px;
                }

                .fullscreen-viewer-btn {
                    padding: 6px 10px;
                    font-size: 13px;
                }
            }

            /* 暗色主题支持 */
            @media (prefers-color-scheme: dark) {
                .fullscreen-viewer-content {
                    background: var(--bg-primary-dark, #1f2937);
                    border-color: var(--border-primary-dark, #374151);
                }

                .fullscreen-viewer-header {
                    background: var(--bg-secondary-dark, #111827);
                    border-color: var(--border-primary-dark, #374151);
                }

                .fullscreen-viewer-title {
                    color: var(--text-primary-dark, #f9fafb);
                }

                .fullscreen-viewer-btn {
                    color: var(--text-secondary-dark, #9ca3af);
                    border-color: var(--border-primary-dark, #374151);
                }

                .fullscreen-viewer-btn:hover {
                    background: var(--bg-tertiary-dark, #1f2937);
                    border-color: var(--primary, #3b82f6);
                    color: var(--primary, #3b82f6);
                }

                .fullscreen-viewer-close {
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    color: white;
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
                }

                .fullscreen-viewer-close::before {
                    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
                }

                .fullscreen-viewer-close:hover {
                    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
                    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.6);
                }
            }

            /* 动画效果 */
            @keyframes fullscreenFadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            @keyframes fullscreenFadeOut {
                from {
                    opacity: 1;
                    transform: scale(1);
                }
                to {
                    opacity: 0;
                    transform: scale(0.9);
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * 设置全局事件监听器
     */
    setupGlobalEventListeners() {
        // ESC键关闭 - 使用高优先级事件监听
        if (this.config.closeOnEscape) {
            this.eventHandlers.set('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    // 阻止事件冒泡，确保优先处理
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                    // 发送自定义事件通知其他组件
                    window.dispatchEvent(new CustomEvent('fullscreenViewerEscPressed', {
                        detail: { source: 'fullscreenViewer' }
                    }));
                    
                    this.close();
                }
            });
            // 使用 capture: true 确保优先捕获事件
            document.addEventListener('keydown', this.eventHandlers.get('keydown'), true);
        }
    }

    /**
     * 打开全屏查看器
     * @param {Object} options - 配置选项
     * @param {string} options.title - 标题
     * @param {string|HTMLElement} options.content - 内容
     * @param {string} options.type - 内容类型 ('svg', 'image', 'text', 'html')
     * @param {Array} options.actions - 操作按钮
     * @param {Function} options.onClose - 关闭回调
     * @param {Function} options.onAction - 操作回调
     */
    open(options = {}) {
        if (this.isOpen) {
            this.close();
        }

        const {
            title = '全屏查看',
            content = '',
            type = 'html',
            actions = [],
            onClose = null,
            onAction = null
        } = options;

        this.createModal({ title, content, type, actions, onClose, onAction });
        this.showModal();
    }

    /**
     * 创建模态框
     */
    createModal({ title, content, type, actions, onClose, onAction }) {
        const modal = document.createElement('div');
        modal.className = 'fullscreen-viewer';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'fullscreen-viewer-title');

        const contentElement = this.createContentElement(content, type);
        const actionsHtml = this.createActionsHtml(actions, onAction);

        modal.innerHTML = `
            <div class="fullscreen-viewer-backdrop" data-action="close"></div>
            <div class="fullscreen-viewer-content">
                <div class="fullscreen-viewer-header">
                    <h3 id="fullscreen-viewer-title" class="fullscreen-viewer-title">
                        <i class="fas fa-expand"></i>
                        ${title}
                    </h3>
                    <div class="fullscreen-viewer-actions">
                        ${actionsHtml}
                        <button class="fullscreen-viewer-close" data-action="close" aria-label="关闭全屏" title="关闭 (ESC)">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="fullscreen-viewer-body">
                    ${contentElement}
                </div>
            </div>
        `;

        // 添加事件监听器
        this.addModalEventListeners(modal, { onClose, onAction });

        this.currentModal = modal;
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    }

    /**
     * 创建内容元素
     */
    createContentElement(content, type) {
        if (typeof content === 'string') {
            switch (type) {
                case 'svg':
                    return content;
                case 'image':
                    return `<img src="${content}" alt="全屏图片" />`;
                case 'text':
                    return `<pre>${this.escapeHtml(content)}</pre>`;
                case 'html':
                default:
                    return content;
            }
        } else if (content instanceof HTMLElement) {
            return content.outerHTML;
        }
        return '';
    }

    /**
     * 创建操作按钮HTML
     */
    createActionsHtml(actions, onAction) {
        return actions.map((action, index) => {
            const { label, icon, type = 'default', action: actionName } = action;
            return `
                <button 
                    class="fullscreen-viewer-btn ${type}" 
                    data-action="${actionName || index}"
                    title="${label}"
                >
                    ${icon ? `<i class="${icon}"></i>` : ''}
                    ${label}
                </button>
            `;
        }).join('');
    }

    /**
     * 添加模态框事件监听器
     */
    addModalEventListeners(modal, { onClose, onAction }) {
        // 关闭事件
        const closeHandler = (e) => {
            if (e.target.dataset.action === 'close') {
                this.close();
                if (onClose) onClose();
            }
        };

        // 操作事件
        const actionHandler = (e) => {
            const action = e.target.dataset.action;
            if (action && action !== 'close' && onAction) {
                onAction(action, e);
            }
        };

        // 关闭按钮特殊处理
        const closeButtonHandler = (e) => {
            if (e.target.closest('.fullscreen-viewer-close')) {
                e.preventDefault();
                e.stopPropagation();
                
                // 添加点击反馈动画
                const closeBtn = e.target.closest('.fullscreen-viewer-close');
                closeBtn.classList.add('pulse');
                
                // 延迟关闭，让用户看到反馈
                setTimeout(() => {
                    this.close();
                    if (onClose) onClose();
                }, 150);
            }
        };

        // 键盘事件处理
        const keyHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                e.preventDefault();
                const closeBtn = modal.querySelector('.fullscreen-viewer-close');
                if (closeBtn) {
                    closeBtn.classList.add('pulse');
                    setTimeout(() => {
                        this.close();
                        if (onClose) onClose();
                    }, 150);
                }
            }
        };

        modal.addEventListener('click', closeHandler);
        modal.addEventListener('click', actionHandler);
        modal.addEventListener('click', closeButtonHandler);
        modal.addEventListener('keydown', keyHandler);

        // 存储事件处理器以便后续移除
        this.eventHandlers.set('modal-close', closeHandler);
        this.eventHandlers.set('modal-action', actionHandler);
        this.eventHandlers.set('modal-close-button', closeButtonHandler);
        this.eventHandlers.set('modal-keyboard', keyHandler);
    }

    /**
     * 显示模态框
     */
    showModal() {
        if (this.currentModal) {
            // 强制重绘
            this.currentModal.offsetHeight;
            this.currentModal.classList.add('open');
            this.isOpen = true;

            // 聚焦到模态框
            this.currentModal.focus();

            // 为关闭按钮添加初始动画效果
            setTimeout(() => {
                const closeBtn = this.currentModal.querySelector('.fullscreen-viewer-close');
                if (closeBtn) {
                    closeBtn.classList.add('breathing');
                    // 3秒后移除呼吸效果
                    setTimeout(() => {
                        closeBtn.classList.remove('breathing');
                    }, 3000);
                }
            }, 500);
        }
    }

    /**
     * 关闭全屏查看器
     */
    close() {
        if (this.currentModal) {
            this.currentModal.classList.remove('open');
            
            setTimeout(() => {
                if (this.currentModal && this.currentModal.parentNode) {
                    this.currentModal.parentNode.removeChild(this.currentModal);
                }
                this.currentModal = null;
                this.isOpen = false;
                document.body.style.overflow = '';
            }, this.config.animationDuration);
        }
    }

    /**
     * 销毁全屏查看器
     */
    destroy() {
        this.close();
        
        // 移除全局事件监听器
        this.eventHandlers.forEach((handler, event) => {
            if (event === 'keydown') {
                document.removeEventListener(event, handler);
            }
        });
        
        this.eventHandlers.clear();
    }

    /**
     * HTML转义
     */
    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * 更新配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * 设置关闭按钮样式变体
     * @param {string} variant - 变体名称 ('default', 'variant-1', 'variant-2', 'variant-3')
     */
    setCloseButtonVariant(variant = 'default') {
        if (this.currentModal) {
            const closeBtn = this.currentModal.querySelector('.fullscreen-viewer-close');
            if (closeBtn) {
                // 移除所有变体类
                closeBtn.classList.remove('variant-1', 'variant-2', 'variant-3');
                
                // 添加新的变体类
                if (variant !== 'default') {
                    closeBtn.classList.add(variant);
                }
            }
        }
    }

    /**
     * 为关闭按钮添加特殊效果
     * @param {string} effect - 效果名称 ('pulse', 'breathing', 'loading')
     * @param {number} duration - 持续时间（毫秒）
     */
    addCloseButtonEffect(effect, duration = 3000) {
        if (this.currentModal) {
            const closeBtn = this.currentModal.querySelector('.fullscreen-viewer-close');
            if (closeBtn) {
                closeBtn.classList.add(effect);
                
                if (duration > 0) {
                    setTimeout(() => {
                        closeBtn.classList.remove(effect);
                    }, duration);
                }
            }
        }
    }
}

// 创建全局实例
window.fullscreenViewer = new FullscreenViewer();

// 导出类供模块使用
export default FullscreenViewer;
