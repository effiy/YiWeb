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
    margin: 24, // 距离边缘的边距（优化为更舒适的间距）
    safeZone: 80, // 安全区域高度（避免被浏览器地址栏和固定导航栏遮挡）
    gap: 12, // 消息之间的间距
    minDistanceFromTop: 20, // 距离顶部的最小距离
    minDistanceFromRight: 20 // 距离右侧的最小距离
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
 * 检测固定定位元素（如导航栏、工具栏等）
 * @returns {Object} 固定元素信息
 */
const detectFixedElements = () => {
    const fixedElements = [];

    // 优化：只检查常见的固定元素选择器，而不是遍历所有元素
    const commonSelectors = [
        'header',
        'nav',
        '.header',
        '.navbar',
        '.nav',
        '.toolbar',
        '.topbar',
        '[class*="fixed"]',
        '[class*="sticky"]'
    ];

    // 检查常见选择器
    commonSelectors.forEach(selector => {
        try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                const style = window.getComputedStyle(el);
                if (style.position === 'fixed' || style.position === 'sticky') {
                    const rect = el.getBoundingClientRect();
                    // 只考虑在顶部或右侧的固定元素，且可见
                    if (rect.width > 0 && rect.height > 0 &&
                        (rect.top < 150 || rect.right > viewportInfo.width - 150)) {
                        fixedElements.push({
                            top: rect.top,
                            right: viewportInfo.width - rect.right,
                            bottom: rect.bottom,
                            left: rect.left,
                            height: rect.height,
                            width: rect.width
                        });
                    }
                }
            });
        } catch (e) {
            // 忽略选择器错误
        }
    });

    return fixedElements;
};

/**
 * 计算安全位置
 * @returns {Object} 位置信息
 */
const calculateSafePosition = () => {
    updateViewportInfo();

    // 检测固定定位元素
    const fixedElements = detectFixedElements();

    // 计算顶部安全区域（考虑固定导航栏等）
    let topOffset = MESSAGE_CONFIG.safeZone;
    fixedElements.forEach(el => {
        if (el.top < 100 && el.bottom > 0) {
            // 顶部固定元素
            topOffset = Math.max(topOffset, el.bottom + MESSAGE_CONFIG.margin);
        }
    });

    // 计算右侧安全区域（考虑固定侧边栏等）
    let rightOffset = MESSAGE_CONFIG.margin;
    fixedElements.forEach(el => {
        if (el.right < 100 && el.left < viewportInfo.width / 2) {
            // 右侧固定元素
            rightOffset = Math.max(rightOffset, viewportInfo.width - el.left + MESSAGE_CONFIG.margin);
        }
    });

    // 使用固定定位，不依赖滚动位置（更稳定的体验）
    const safeTop = Math.max(
        MESSAGE_CONFIG.minDistanceFromTop,
        topOffset
    );
    const safeRight = Math.max(
        MESSAGE_CONFIG.minDistanceFromRight,
        rightOffset
    );

    // 根据屏幕尺寸动态调整最大宽度和位置
    let maxWidth, finalTop, finalRight;

    if (viewportInfo.width <= 480) {
        // 小屏幕：居中显示，几乎全宽
        maxWidth = viewportInfo.width - 32;
        finalTop = safeTop;
        finalRight = 'auto';
        // 需要计算居中位置
        const leftPosition = (viewportInfo.width - maxWidth) / 2;
        return {
            top: `${safeTop}px`,
            left: `${leftPosition}px`,
            right: 'auto',
            maxWidth: `${maxWidth}px`
        };
    } else if (viewportInfo.width <= 768) {
        // 中等屏幕：右上角，留出边距
        maxWidth = Math.min(500, viewportInfo.width - 48);
        finalTop = safeTop;
        finalRight = safeRight;
    } else {
        // 大屏幕：右上角，最大宽度限制
        maxWidth = Math.min(600, viewportInfo.width - 48);
        finalTop = safeTop;
        finalRight = safeRight;
    }

    return {
        top: `${finalTop}px`,
        right: `${finalRight}px`,
        left: 'auto',
        maxWidth: `${maxWidth}px`
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
    updateMessagePosition();

    document.body.appendChild(messageContainer);

    // 监听窗口大小变化（使用防抖优化性能）
    let resizeTimeout;
    const handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            updateMessagePosition();
        }, 150);
    };

    // 监听方向变化（移动设备旋转）
    const handleOrientationChange = () => {
        setTimeout(() => {
            updateMessagePosition();
        }, 300); // 延迟以等待布局完成
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true });

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            // 页面重新可见时更新位置
            setTimeout(() => {
                updateMessagePosition();
            }, 100);
        }
    }, { passive: true });

    // 使用 Intersection Observer 检测容器是否在视口内（可选优化）
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    // 如果容器不在视口内，更新位置
                    updateMessagePosition();
                }
            });
        }, {
            threshold: 0.1
        });

        // 延迟观察，确保容器已添加到 DOM
        setTimeout(() => {
            if (messageContainer) {
                observer.observe(messageContainer);
            }
        }, 100);
    }

    return messageContainer;
};

/**
 * 更新消息位置
 */
const updateMessagePosition = () => {
    if (!messageContainer) return;

    const position = calculateSafePosition();

    // 应用所有位置属性
    messageContainer.style.top = position.top;
    messageContainer.style.right = position.right || 'auto';
    messageContainer.style.left = position.left || 'auto';
    messageContainer.style.maxWidth = position.maxWidth;

    // 确保容器始终可见
    messageContainer.style.display = 'block';
    messageContainer.style.visibility = 'visible';
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
        line-height: 1.5;
        pointer-events: auto;
        cursor: pointer;
        transition: all 0.3s ease;
        transform: translateX(100%);
        opacity: 0;
        word-wrap: break-word;
        overflow-wrap: break-word;
        word-break: break-word;
        white-space: pre-wrap;
        max-width: 100%;
        min-width: 200px;
        width: fit-content;
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
 * 创建复杂消息元素
 * @param {Object} config - 消息配置
 * @returns {HTMLElement} 消息元素
 */
const createComplexMessageElement = (config) => {
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${config.type || 'info'} complex-message`;
    messageEl.style.cssText = `
        background: ${getMessageColor(config.type || 'info')};
        color: white;
        padding: 16px;
        margin-bottom: 8px;
        border-radius: 8px;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        font-size: 14px;
        line-height: 1.5;
        pointer-events: auto;
        transition: all 0.3s ease;
        transform: translateX(100%);
        opacity: 0;
        word-wrap: break-word;
        overflow-wrap: break-word;
        word-break: break-word;
        white-space: pre-wrap;
        max-width: 100%;
        min-width: 250px;
        width: fit-content;
    `;

    // 创建头部
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 8px;
    `;

    // 标题和图标
    const titleSection = document.createElement('div');
    titleSection.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
    `;

    const icon = document.createElement('i');
    icon.className = `fas ${getMessageIcon(config.type || 'info')}`;
    icon.style.flexShrink = '0';

    const title = document.createElement('div');
    title.textContent = config.title || '';
    title.style.cssText = `
        font-weight: 600;
        font-size: 15px;
    `;

    titleSection.appendChild(icon);
    titleSection.appendChild(title);
    header.appendChild(titleSection);

    // 关闭按钮
    if (config.showClose !== false) {
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: background-color 0.2s;
            font-size: 12px;
        `;
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.backgroundColor = 'transparent';
        });
        closeBtn.addEventListener('click', () => {
            hideMessage(messageEl);
        });
        header.appendChild(closeBtn);
    }

    messageEl.appendChild(header);

    // 内容
    if (config.content) {
        const content = document.createElement('div');
        content.textContent = config.content;
        content.style.cssText = `
            margin-bottom: 12px;
            opacity: 0.9;
        `;
        messageEl.appendChild(content);
    }

    // 操作按钮
    if (config.actions && config.actions.length > 0) {
        const actionsContainer = document.createElement('div');
        actionsContainer.style.cssText = `
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 8px;
        `;

        config.actions.forEach(action => {
            const actionBtn = document.createElement('button');
            actionBtn.textContent = action.text;
            actionBtn.style.cssText = `
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
                background: ${action.type === 'primary' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)'};
                color: white;
                border: 1px solid ${action.type === 'primary' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)'};
            `;

            actionBtn.addEventListener('mouseenter', () => {
                actionBtn.style.backgroundColor = action.type === 'primary'
                    ? 'rgba(255, 255, 255, 0.3)'
                    : 'rgba(255, 255, 255, 0.2)';
            });
            actionBtn.addEventListener('mouseleave', () => {
                actionBtn.style.backgroundColor = action.type === 'primary'
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'rgba(255, 255, 255, 0.1)';
            });
            actionBtn.addEventListener('click', () => {
                if (action.action) {
                    action.action();
                }
                hideMessage(messageEl);
            });

            actionsContainer.appendChild(actionBtn);
        });

        messageEl.appendChild(actionsContainer);
    }

    return messageEl;
};

/**
 * 显示复杂消息
 * @param {Object} config - 消息配置
 */
const showComplexMessage = (config) => {
    const container = createMessageContainer();
    const messageEl = createComplexMessageElement(config);

    // 添加到容器
    container.appendChild(messageEl);

    // 确保位置正确
    updateMessagePosition();

    // 动画显示
    setTimeout(() => {
        messageEl.style.transform = 'translateX(0)';
        messageEl.style.opacity = '1';
    }, 10);

    // 自动隐藏
    if (config.duration !== 0) {
        const duration = config.duration || MESSAGE_CONFIG.duration;
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

    // 开发环境才输出详细日志（检查是否在开发环境）
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
        console.log('[复杂消息显示] 显示消息:', {
            type: config.type,
            title: config.title?.substring(0, 30) || ''
        });
    }
};

/**
 * 显示消息
 * @param {string|Object} messageOrConfig - 消息内容或配置对象
 * @param {string} type - 消息类型
 * @param {number} duration - 显示时长（毫秒）
 */
export const showMessage = (messageOrConfig, type = MESSAGE_TYPES.INFO, duration = MESSAGE_CONFIG.duration) => {
    // 支持对象配置
    if (typeof messageOrConfig === 'object') {
        const config = messageOrConfig;
        return showComplexMessage(config);
    }

    // 简单消息
    const message = messageOrConfig;
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

    // 开发环境才输出详细日志（检查是否在开发环境）
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
        console.log('[消息显示] 显示消息:', {
            type: type,
            message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
            duration: duration
        });
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

// 在全局作用域中暴露（用于非模块环境）
if (typeof window !== 'undefined') {
    window.showMessage = showMessage;
    window.showSuccess = showSuccess;
    window.showError = showError;
    window.showWarning = showWarning;
    window.showInfo = showInfo;
    window.clearMessages = clearMessages;
    window.MESSAGE_TYPES = MESSAGE_TYPES;
}

