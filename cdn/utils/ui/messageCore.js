/**
 * 消息提示工具
 * author: liangliang
 */

/**
 * 消息类型枚举
 */
export const MESSAGE_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

/**
 * 消息配置
 */
const MESSAGE_CONFIG = {
    duration: 4000, // 默认显示时长（毫秒）- 至少3秒，设置为4秒更友好
    minDuration: 3000, // 最小显示时长（毫秒）- 确保至少显示3秒
    position: 'top-right',
    maxCount: 5,
    margin: 24, // 距离边缘的边距（优化为更舒适的间距）
    safeZone: 80, // 安全区域高度（避免被浏览器地址栏和固定导航栏遮挡）
    gap: 12, // 消息之间的间距
    minDistanceFromTop: 20, // 距离顶部的最小距离
    minDistanceFromRight: 20, // 距离右侧的最小距离
    showProgress: true, // 显示进度条
    showCloseButton: true, // 显示关闭按钮
    animationDuration: 400, // 动画时长（毫秒）- 增加动画时长，让进入更平滑
    enterAnimationDuration: 400, // 进入动画时长（毫秒）
    exitAnimationDuration: 300, // 退出动画时长（毫秒）
    hoverPause: true // 悬停时暂停倒计时
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

    // 获取固定元素信息
    const fixedElements = detectFixedElements();

    // 默认位置
    let top = MESSAGE_CONFIG.margin + MESSAGE_CONFIG.safeZone;
    let right = MESSAGE_CONFIG.margin;

    // 计算顶部安全区域
    let maxTopOccupied = MESSAGE_CONFIG.safeZone;
    fixedElements.forEach(el => {
        // 如果元素在顶部区域
        if (el.top <= 0 && el.bottom > 0) {
            maxTopOccupied = Math.max(maxTopOccupied, el.bottom);
        }
    });

    // 计算右侧安全区域
    let maxRightOccupied = 0;
    fixedElements.forEach(el => {
        // 如果元素在右侧区域
        if (el.right <= MESSAGE_CONFIG.margin + 150 && el.width > 0) {
            maxRightOccupied = Math.max(maxRightOccupied, el.width);
        }
    });

    // 应用安全距离
    top = Math.max(top, maxTopOccupied + MESSAGE_CONFIG.minDistanceFromTop);
    right = Math.max(right, maxRightOccupied + MESSAGE_CONFIG.minDistanceFromRight);

    // 确保不超出视口
    top = Math.min(top, viewportInfo.height - 100);
    right = Math.min(right, viewportInfo.width - 300);

    return { top, right };
};

/**
 * 创建消息容器（优化版）
 */
const createMessageContainer = () => {
    if (messageContainer) return messageContainer;

    messageContainer = document.createElement('div');
    messageContainer.className = 'message-container';
    messageContainer.setAttribute('aria-live', 'polite');
    messageContainer.setAttribute('aria-atomic', 'true');

    // 计算安全位置
    const position = calculateSafePosition();
    messageContainer.style.top = `${position.top}px`;
    messageContainer.style.right = `${position.right}px`;

    // 添加容器样式
    messageContainer.style.position = 'fixed';
    messageContainer.style.zIndex = '9999';
    messageContainer.style.display = 'flex';
    messageContainer.style.flexDirection = 'column';
    messageContainer.style.gap = `${MESSAGE_CONFIG.gap}px`;
    messageContainer.style.pointerEvents = 'none'; // 容器不阻挡点击
    messageContainer.style.transition = 'all 0.3s ease';

    document.body.appendChild(messageContainer);

    // 监听窗口大小变化，重新计算位置（节流）
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            updateMessagePosition();
        }, 100);
    });

    // 监听滚动，重新计算位置（节流）
    let scrollTimer = null;
    window.addEventListener('scroll', () => {
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            updateMessagePosition();
        }, 100);
    }, { passive: true });

    return messageContainer;
};

/**
 * 更新消息容器位置
 */
const updateMessagePosition = () => {
    if (!messageContainer) return;

    const position = calculateSafePosition();
    messageContainer.style.top = `${position.top}px`;
    messageContainer.style.right = `${position.right}px`;
};

/**
 * 创建消息元素（优化版）
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型
 * @returns {HTMLElement} 消息元素
 */
const createMessageElement = (message, type) => {
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.setAttribute('role', 'alert');
    messageEl.setAttribute('aria-label', `${type}消息: ${message}`);
    messageEl.style.pointerEvents = 'auto'; // 消息可点击

    // 图标
    const iconEl = document.createElement('div');
    iconEl.className = 'message-icon';

    const iconMap = {
        [MESSAGE_TYPES.SUCCESS]: '✓',
        [MESSAGE_TYPES.ERROR]: '✕',
        [MESSAGE_TYPES.WARNING]: '!',
        [MESSAGE_TYPES.INFO]: 'i'
    };

    iconEl.textContent = iconMap[type] || 'i';

    // 内容
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    contentEl.textContent = message;

    // 关闭按钮
    let closeBtn = null;
    if (MESSAGE_CONFIG.showCloseButton) {
        closeBtn = document.createElement('button');
        closeBtn.className = 'message-close';
        closeBtn.innerHTML = '×';
        closeBtn.setAttribute('aria-label', '关闭消息');
        closeBtn.type = 'button';
    }

    // 进度条
    let progressEl = null;
    if (MESSAGE_CONFIG.showProgress) {
        progressEl = document.createElement('div');
        progressEl.className = 'message-progress';
        progressEl.style.width = '100%';
    }

    // 组装
    messageEl.appendChild(iconEl);
    messageEl.appendChild(contentEl);
    if (closeBtn) messageEl.appendChild(closeBtn);
    if (progressEl) messageEl.appendChild(progressEl);

    // 添加样式
    applyMessageStyles(messageEl, type);

    // 绑定事件
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hideMessage(messageEl);
        });
    }

    // 悬停暂停
    if (MESSAGE_CONFIG.hoverPause) {
        messageEl.addEventListener('mouseenter', () => {
            if (messageEl._hideTimer) {
                clearTimeout(messageEl._hideTimer);
                messageEl._hideTimer = null;
            }
            if (messageEl._progressTimer) {
                clearTimeout(messageEl._progressTimer);
                messageEl._progressTimer = null;
            }
            if (progressEl) {
                progressEl.style.animationPlayState = 'paused';
            }
        });

        messageEl.addEventListener('mouseleave', () => {
            const remainingTime = messageEl._remainingTime || MESSAGE_CONFIG.duration;
            if (remainingTime > 0) {
                startMessageTimer(messageEl, remainingTime);
            }
        });
    }

    return messageEl;
};

/**
 * 应用消息样式
 * @param {HTMLElement} messageEl - 消息元素
 * @param {string} type - 消息类型
 */
const applyMessageStyles = (messageEl, type) => {
    // 基础样式
    messageEl.style.display = 'flex';
    messageEl.style.alignItems = 'flex-start';
    messageEl.style.padding = '16px 20px';
    messageEl.style.borderRadius = '12px';
    messageEl.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.35)';
    messageEl.style.backdropFilter = 'blur(12px)';
    messageEl.style.webkitBackdropFilter = 'blur(12px)';
    messageEl.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    messageEl.style.minWidth = '320px';
    messageEl.style.maxWidth = '420px';
    messageEl.style.position = 'relative';
    messageEl.style.overflow = 'hidden';
    messageEl.style.cursor = 'default';
    messageEl.style.transition = `all ${MESSAGE_CONFIG.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;

    // 初始状态（进入动画）
    messageEl.style.transform = 'translateX(120%)';
    messageEl.style.opacity = '0';

    // 类型样式
    const typeStyles = {
        [MESSAGE_TYPES.SUCCESS]: {
            background: 'rgba(34, 197, 94, 0.15)',
            borderColor: 'rgba(34, 197, 94, 0.3)',
            color: '#ffffff',
            iconBg: 'rgba(34, 197, 94, 0.2)',
            iconColor: '#22c55e',
            progressColor: '#22c55e'
        },
        [MESSAGE_TYPES.ERROR]: {
            background: 'rgba(239, 68, 68, 0.15)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: '#ffffff',
            iconBg: 'rgba(239, 68, 68, 0.2)',
            iconColor: '#ef4444',
            progressColor: '#ef4444'
        },
        [MESSAGE_TYPES.WARNING]: {
            background: 'rgba(245, 158, 11, 0.15)',
            borderColor: 'rgba(245, 158, 11, 0.3)',
            color: '#ffffff',
            iconBg: 'rgba(245, 158, 11, 0.2)',
            iconColor: '#f59e0b',
            progressColor: '#f59e0b'
        },
        [MESSAGE_TYPES.INFO]: {
            background: 'rgba(79, 70, 229, 0.15)',
            borderColor: 'rgba(79, 70, 229, 0.3)',
            color: '#ffffff',
            iconBg: 'rgba(79, 70, 229, 0.2)',
            iconColor: '#4f46e5',
            progressColor: '#4f46e5'
        }
    };

    const style = typeStyles[type] || typeStyles[MESSAGE_TYPES.INFO];
    messageEl.style.background = style.background;
    messageEl.style.borderColor = style.borderColor;
    messageEl.style.color = style.color;

    // 图标样式
    const iconEl = messageEl.querySelector('.message-icon');
    if (iconEl) {
        iconEl.style.width = '28px';
        iconEl.style.height = '28px';
        iconEl.style.borderRadius = '50%';
        iconEl.style.display = 'flex';
        iconEl.style.alignItems = 'center';
        iconEl.style.justifyContent = 'center';
        iconEl.style.marginRight = '12px';
        iconEl.style.flexShrink = '0';
        iconEl.style.fontSize = '16px';
        iconEl.style.fontWeight = 'bold';
        iconEl.style.background = style.iconBg;
        iconEl.style.color = style.iconColor;
    }

    // 内容样式
    const contentEl = messageEl.querySelector('.message-content');
    if (contentEl) {
        contentEl.style.flex = '1';
        contentEl.style.fontSize = '14px';
        contentEl.style.lineHeight = '1.5';
        contentEl.style.wordBreak = 'break-word';
    }

    // 关闭按钮样式
    const closeBtn = messageEl.querySelector('.message-close');
    if (closeBtn) {
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.color = 'rgba(255, 255, 255, 0.7)';
        closeBtn.style.fontSize = '20px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.padding = '0';
        closeBtn.style.marginLeft = '12px';
        closeBtn.style.flexShrink = '0';
        closeBtn.style.width = '24px';
        closeBtn.style.height = '24px';
        closeBtn.style.display = 'flex';
        closeBtn.style.alignItems = 'center';
        closeBtn.style.justifyContent = 'center';
        closeBtn.style.borderRadius = '6px';
        closeBtn.style.transition = 'all 0.2s ease';

        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            closeBtn.style.color = '#ffffff';
        });

        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'none';
            closeBtn.style.color = 'rgba(255, 255, 255, 0.7)';
        });
    }

    // 进度条样式
    const progressEl = messageEl.querySelector('.message-progress');
    if (progressEl) {
        progressEl.style.position = 'absolute';
        progressEl.style.bottom = '0';
        progressEl.style.left = '0';
        progressEl.style.height = '3px';
        progressEl.style.background = style.progressColor;
        progressEl.style.opacity = '0.8';
    }
};

/**
 * 开始消息计时器
 * @param {HTMLElement} messageEl - 消息元素
 * @param {number} duration - 持续时间
 */
const startMessageTimer = (messageEl, duration) => {
    // 确保最小显示时间
    const finalDuration = Math.max(duration, MESSAGE_CONFIG.minDuration);

    // 记录剩余时间
    messageEl._remainingTime = finalDuration;

    // 进度条动画
    const progressEl = messageEl.querySelector('.message-progress');
    if (progressEl) {
        progressEl.style.animation = `messageProgress ${finalDuration}ms linear forwards`;
        progressEl.style.animationPlayState = 'running';

        // 创建进度条动画样式（如果不存在）
        if (!document.getElementById('message-progress-style')) {
            const style = document.createElement('style');
            style.id = 'message-progress-style';
            style.textContent = `
                @keyframes messageProgress {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `;
            document.head.appendChild(style);
        }

        // 进度条计时器（用于计算剩余时间）
        const startTime = Date.now();
        messageEl._progressTimer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            messageEl._remainingTime = finalDuration - elapsed;
            if (messageEl._remainingTime <= 0) {
                clearInterval(messageEl._progressTimer);
                messageEl._progressTimer = null;
            }
        }, 100);
    }

    // 自动隐藏计时器
    messageEl._hideTimer = setTimeout(() => {
        hideMessage(messageEl);
    }, finalDuration);
};

/**
 * 显示消息（优化版）
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型
 * @param {number} duration - 显示时长
 */
export const showMessage = (message, type = MESSAGE_TYPES.INFO, duration = MESSAGE_CONFIG.duration) => {
    if (!message) return;

    // 创建容器
    const container = createMessageContainer();

    // 创建消息元素
    const messageEl = createMessageElement(message, type);

    // 添加到容器
    container.appendChild(messageEl);

    // 触发进入动画（延迟一帧）
    requestAnimationFrame(() => {
        messageEl.style.transform = 'translateX(0)';
        messageEl.style.opacity = '1';
    });

    // 启动计时器
    startMessageTimer(messageEl, duration);

    // 记录开始时间（考虑进入动画延迟）
    messageEl._startTime = Date.now() + MESSAGE_CONFIG.enterAnimationDuration;

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
 * 更新消息堆叠效果
 */
const updateMessageStack = () => {
    if (!messageContainer) return;

    const messages = Array.from(messageContainer.querySelectorAll('.message'));
    messages.forEach((msg, index) => {
        // 为每个消息添加轻微的偏移，创建堆叠效果
        const offset = index * 2;
        msg.style.marginBottom = `${MESSAGE_CONFIG.gap + offset}px`;
    });
};

/**
 * 隐藏消息（优化版）
 * @param {HTMLElement} messageEl - 消息元素
 */
const hideMessage = (messageEl) => {
    if (!messageEl || !messageEl.parentNode) return;

    // 清除定时器
    if (messageEl._hideTimer) {
        clearTimeout(messageEl._hideTimer);
        messageEl._hideTimer = null;
    }

    // 添加退出动画类
    messageEl.classList.add('message-exiting');
    messageEl.style.transition = `all ${MESSAGE_CONFIG.exitAnimationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    messageEl.style.transform = 'translateX(120%)';
    messageEl.style.opacity = '0';
    messageEl.style.marginBottom = '0';
    messageEl.style.marginTop = `-${messageEl.offsetHeight}px`;

    // 移除元素并更新堆叠
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.parentNode.removeChild(messageEl);
            // 更新剩余消息的堆叠
            updateMessageStack();
        }
    }, MESSAGE_CONFIG.exitAnimationDuration);
};

export const showSuccess = (message, duration) => {
    showMessage(message, MESSAGE_TYPES.SUCCESS, duration);
};

export const showError = (message, duration) => {
    showMessage(message, MESSAGE_TYPES.ERROR, duration);
};

export const showWarning = (message, duration) => {
    showMessage(message, MESSAGE_TYPES.WARNING, duration);
};

export const showInfo = (message, duration) => {
    showMessage(message, MESSAGE_TYPES.INFO, duration);
};

export const clearMessages = () => {
    if (messageContainer) {
        messageContainer.innerHTML = '';
    }
};

export const getViewportInfo = () => {
    updateViewportInfo();
    return { ...viewportInfo };
};

export const updateMessagePositionManually = () => {
    updateMessagePosition();
};

