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
    maxCount: 5
};

/**
 * 消息容器
 */
let messageContainer = null;

/**
 * 创建消息容器
 */
const createMessageContainer = () => {
    if (messageContainer) return messageContainer;

    messageContainer = document.createElement('div');
    messageContainer.className = 'message-container';
    messageContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
        pointer-events: none;
    `;

    document.body.appendChild(messageContainer);
    return messageContainer;
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
    `;

    // 添加图标
    const icon = document.createElement('i');
    icon.className = `fas ${getMessageIcon(type)}`;
    icon.style.marginRight = '8px';
    
    messageEl.appendChild(icon);
    messageEl.appendChild(document.createTextNode(message));

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

    // 动画显示
    setTimeout(() => {
        messageEl.style.transform = 'translateX(0)';
        messageEl.style.opacity = '1';
    }, 10);

    // 点击关闭
    messageEl.addEventListener('click', () => {
        hideMessage(messageEl);
    });

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

// 导出消息类型
export { MESSAGE_TYPES }; 