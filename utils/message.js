/**
 * 消息提示工具
 * author: liangliang
 */

/**
 * 消息类型枚举
 */
const MESSAGE_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

/**
 * 消息配置
 */
const MESSAGE_CONFIG = {
    duration: 3000,
    position: 'top-right',
    maxCount: 5,
    margin: 20, // 距离边缘的边距
    safeZone: 60 // 安全区域高度（避免被浏览器地址栏遮挡）
};

/**
 * 消息容器
 */
let messageContainer = null;

/**
 * 视口信息
 */
let viewportInfo = {
    width: 0,
    height: 0,
    scrollTop: 0,
    scrollLeft: 0
};

/**
 * 更新视口信息
 */
const updateViewportInfo = () => {
    viewportInfo = {
        width: window.innerWidth || document.documentElement.clientWidth,
        height: window.innerHeight || document.documentElement.clientHeight,
        scrollTop: window.pageYOffset || document.documentElement.scrollTop,
        scrollLeft: window.pageXOffset || document.documentElement.scrollLeft
    };
};

/**
 * 计算安全位置
 * @returns {Object} 位置信息
 */
const calculateSafePosition = () => {
    updateViewportInfo();
    
    // 获取当前滚动位置
    const scrollTop = viewportInfo.scrollTop;
    const scrollLeft = viewportInfo.scrollLeft;
    
    // 计算安全区域
    const safeTop = Math.max(MESSAGE_CONFIG.margin, MESSAGE_CONFIG.safeZone);
    const safeRight = MESSAGE_CONFIG.margin;
    
    // 考虑滚动位置，确保消息始终在可视区域内
    const adjustedTop = safeTop + scrollTop;
    const adjustedRight = safeRight + scrollLeft;
    
    return {
        top: adjustedTop,
        right: adjustedRight,
        maxWidth: Math.min(400, viewportInfo.width - 40) // 确保不超出屏幕宽度
    };
};

/**
 * 创建消息容器
 */
const createMessageContainer = () => {
    if (messageContainer) return messageContainer;

    messageContainer = document.createElement('div');
    messageContainer.className = 'message-container';
    
    // 初始化位置
    const position = calculateSafePosition();
    
    messageContainer.style.cssText = `
        position: fixed;
        top: ${position.top}px;
        right: ${position.right}px;
        z-index: 9999;
        max-width: ${position.maxWidth}px;
        pointer-events: none;
        transition: all 0.3s ease;
    `;

    document.body.appendChild(messageContainer);
    
    // 监听窗口大小变化和滚动事件
    let resizeTimeout;
    let scrollTimeout;
    
    const handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            updateMessagePosition();
        }, 100);
    };
    
    const handleScroll = () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            updateMessagePosition();
        }, 16); // 约60fps
    };
    
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            updateMessagePosition();
        }
    }, { passive: true });
    
    return messageContainer;
};

/**
 * 更新消息位置
 */
const updateMessagePosition = () => {
    if (!messageContainer) return;
    
    const position = calculateSafePosition();
    
    messageContainer.style.top = `${position.top}px`;
    messageContainer.style.right = `${position.right}px`;
    messageContainer.style.maxWidth = `${position.maxWidth}px`;
    
    console.log('[消息位置] 更新位置:', {
        top: position.top,
        right: position.right,
        maxWidth: position.maxWidth,
        viewport: viewportInfo
    });
};

/**
 * 创建消息元素
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型
 * @returns {HTMLElement} 消息元素
 */
const createMessageElement = (message, type) => {
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.style.cssText = `
        background: ${getMessageColor(type)};
        color: white;
        padding: 12px 16px;
        margin-bottom: 8px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: 14px;
        line-height: 1.4;
        pointer-events: auto;
        cursor: pointer;
        transition: all 0.3s ease;
        transform: translateX(100%);
        opacity: 0;
        word-wrap: break-word;
        overflow-wrap: break-word;
        max-width: 100%;
    `;

    // 添加图标
    const icon = document.createElement('i');
    icon.className = `fas ${getMessageIcon(type)}`;
    icon.style.marginRight = '8px';
    icon.style.flexShrink = '0';
    
    // 创建文本容器
    const textContainer = document.createElement('span');
    textContainer.textContent = message;
    textContainer.style.flex = '1';
    textContainer.style.minWidth = '0';
    
    // 创建内容包装器
    const contentWrapper = document.createElement('div');
    contentWrapper.style.display = 'flex';
    contentWrapper.style.alignItems = 'flex-start';
    contentWrapper.style.gap = '8px';
    
    contentWrapper.appendChild(icon);
    contentWrapper.appendChild(textContainer);
    messageEl.appendChild(contentWrapper);

    return messageEl;
};

/**
 * 获取消息颜色
 * @param {string} type - 消息类型
 * @returns {string} 颜色值
 */
const getMessageColor = (type) => {
    const colors = {
        success: '#52c41a',
        error: '#ff4d4f',
        warning: '#faad14',
        info: '#1890ff'
    };
    return colors[type] || colors.info;
};

/**
 * 获取消息图标
 * @param {string} type - 消息类型
 * @returns {string} 图标类名
 */
const getMessageIcon = (type) => {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
};

/**
 * 显示消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型
 * @param {number} duration - 显示时长（毫秒）
 */
export const showMessage = (message, type = MESSAGE_TYPES.INFO, duration = MESSAGE_CONFIG.duration) => {
    if (!message) return;

    const container = createMessageContainer();
    const messageEl = createMessageElement(message, type);

    // 添加到容器
    container.appendChild(messageEl);

    // 确保位置正确
    updateMessagePosition();

    // 动画显示
    setTimeout(() => {
        messageEl.style.transform = 'translateX(0)';
        messageEl.style.opacity = '1';
    }, 10);

    // 点击关闭
    messageEl.addEventListener('click', () => {
        hideMessage(messageEl);
    }, { passive: true });

    // 自动隐藏
    if (duration > 0) {
        setTimeout(() => {
            hideMessage(messageEl);
        }, duration);
    }

    // 限制最大数量
    const messages = container.querySelectorAll('.message');
    if (messages.length > MESSAGE_CONFIG.maxCount) {
        const oldestMessage = messages[0];
        hideMessage(oldestMessage);
    }
    
    console.log('[消息显示] 显示消息:', {
        type: type,
        message: message,
        duration: duration,
        position: calculateSafePosition()
    });
};

/**
 * 隐藏消息
 * @param {HTMLElement} messageEl - 消息元素
 */
const hideMessage = (messageEl) => {
    messageEl.style.transform = 'translateX(100%)';
    messageEl.style.opacity = '0';
    
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.parentNode.removeChild(messageEl);
        }
    }, 300);
};

/**
 * 显示成功消息
 * @param {string} message - 消息内容
 * @param {number} duration - 显示时长
 */
export const showSuccess = (message, duration) => {
    showMessage(message, MESSAGE_TYPES.SUCCESS, duration);
};

/**
 * 显示错误消息
 * @param {string} message - 消息内容
 * @param {number} duration - 显示时长
 */
export const showError = (message, duration) => {
    showMessage(message, MESSAGE_TYPES.ERROR, duration);
};

/**
 * 显示警告消息
 * @param {string} message - 消息内容
 * @param {number} duration - 显示时长
 */
export const showWarning = (message, duration) => {
    showMessage(message, MESSAGE_TYPES.WARNING, duration);
};

/**
 * 显示信息消息
 * @param {string} message - 消息内容
 * @param {number} duration - 显示时长
 */
export const showInfo = (message, duration) => {
    showMessage(message, MESSAGE_TYPES.INFO, duration);
};

/**
 * 清除所有消息
 */
export const clearMessages = () => {
    if (messageContainer) {
        messageContainer.innerHTML = '';
    }
};

/**
 * 获取当前视口信息
 * @returns {Object} 视口信息
 */
export const getViewportInfo = () => {
    updateViewportInfo();
    return { ...viewportInfo };
};

/**
 * 手动更新消息位置（供外部调用）
 */
export const updateMessagePositionManually = () => {
    updateMessagePosition();
};

// 导出消息类型
export { MESSAGE_TYPES }; 
