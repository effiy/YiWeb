/**
 * 侧边栏拖拽条工具
 * 从 aicr/index.js 提取
 */

import { COMPONENTS } from '/cdn/utils/core/constants.js';

/**
 * 创建侧边栏拖拽条（为 AICR 页面）
 * @param {Object} store - 状态存储对象
 */
export function createSidebarResizers(store) {
    if (!store) return;

    // 创建文件树侧边栏拖拽条
    const sidebar = document.querySelector('.aicr-sidebar');
    if (sidebar) {
        createResizer(sidebar, store, 'sidebar', {
            minWidth: COMPONENTS.SIDEBAR_MIN_WIDTH,
            maxWidth: COMPONENTS.SIDEBAR_MAX_WIDTH,
            defaultWidth: COMPONENTS.SIDEBAR_DEFAULT_WIDTH,
            storageKey: 'aicrSidebarWidth',
            saveWidth: store.saveSidebarWidth
        });

        // 应用保存的宽度
        if (store.sidebarWidth && store.sidebarWidth.value) {
            sidebar.style.width = `${store.sidebarWidth.value}px`;
        }
    }

    const chatPanel = document.querySelector('.aicr-code-chat');
    if (chatPanel) {
        createResizer(chatPanel, store, 'chatPanel', {
            minWidth: COMPONENTS.CHAT_PANEL_MIN_WIDTH,
            maxWidth: COMPONENTS.CHAT_PANEL_MAX_WIDTH,
            defaultWidth: COMPONENTS.CHAT_PANEL_DEFAULT_WIDTH,
            storageKey: 'aicrChatPanelWidth',
            saveWidth: store.saveChatPanelWidth,
            position: 'left',
            enforceLimits: true
        });

        if (store.chatPanelWidth && store.chatPanelWidth.value) {
            chatPanel.style.setProperty('--aicr-chat-width', `${store.chatPanelWidth.value}px`);
        }
    }
}

/**
 * 创建单个拖拽条
 * @param {HTMLElement} sidebarElement - 要调整大小的元素
 * @param {Object} store - 状态存储
 * @param {string} type - 类型 ('sidebar'|'chatPanel')
 * @param {Object} options - 选项
 */
export function createResizer(sidebarElement, store, type, options) {
    const {
        minWidth = 240,
        maxWidth = 400,
        defaultWidth = 320,
        storageKey,
        saveWidth,
        position = 'right', // 'right' 或 'left'
        enforceLimits = false
    } = options;

    // 检查是否已存在拖拽条
    const existingResizer = sidebarElement.querySelector('.sidebar-resizer');
    if (existingResizer) {
        return existingResizer;
    }

    const resizer = document.createElement('div');
    resizer.className = 'sidebar-resizer';
    resizer.setAttribute('data-type', type);

    // 设置样式
    resizer.style.cssText = `
        position: absolute !important;
        top: 0 !important;
        ${position === 'right' ? 'right: -4px' : 'left: -4px'} !important;
        width: 8px !important;
        height: 100% !important;
        cursor: col-resize !important;
        z-index: 10 !important;
        background: transparent !important;
        transition: background 0.2s ease !important;
    `;

    let isResizing = false;
    let handleMouseMove = null;
    let handleMouseUp = null;

    // 鼠标悬停效果
    resizer.addEventListener('mouseenter', () => {
        if (!isResizing) {
            resizer.style.setProperty('background', 'rgba(59, 130, 246, 0.3)', 'important');
        }
    });

    resizer.addEventListener('mouseleave', () => {
        if (!isResizing) {
            resizer.style.setProperty('background', 'transparent', 'important');
        }
    });

    // 拖拽开始
    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        isResizing = true;
        resizer.style.setProperty('background', 'rgba(59, 130, 246, 0.5)', 'important');
        resizer.style.setProperty('cursor', 'col-resize', 'important');

        // 记录初始位置和宽度
        const startX = e.clientX;
        const currentWidth = sidebarElement.offsetWidth;
        const startWidth = currentWidth || defaultWidth;

        // 禁用过渡效果，确保拖拽流畅
        sidebarElement.style.transition = 'none';

        // 添加全局样式，禁用文本选择
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';

        // 拖拽中
        handleMouseMove = (e) => {
            if (!isResizing) return;

            const diffX = position === 'right'
                ? e.clientX - startX
                : startX - e.clientX;
            let newWidth = startWidth + diffX;

            if (enforceLimits) {
                const min = typeof minWidth === 'number' && minWidth > 0 ? minWidth : 50;
                const max = typeof maxWidth === 'number' && maxWidth > 0 ? maxWidth : Infinity;
                newWidth = Math.max(min, Math.min(max, newWidth));
            } else {
                newWidth = Math.max(50, newWidth);
            }

            // 更新宽度
            if (type === 'chatPanel') {
                sidebarElement.style.setProperty('--aicr-chat-width', `${newWidth}px`);
            } else {
                sidebarElement.style.width = `${newWidth}px`;
            }

            // 更新 store 中的宽度值
            if (type === 'sidebar') {
                if (store.sidebarWidth) {
                    store.sidebarWidth.value = newWidth;
                }
            } else if (type === 'chatPanel') {
                if (store.chatPanelWidth) {
                    store.chatPanelWidth.value = newWidth;
                }
            }
        };

        // 拖拽结束
        handleMouseUp = () => {
            isResizing = false;
            resizer.style.setProperty('background', 'transparent', 'important');
            resizer.style.setProperty('cursor', 'col-resize', 'important');

            // 恢复过渡效果
            sidebarElement.style.transition = '';

            // 恢复全局样式
            document.body.style.userSelect = '';
            document.body.style.cursor = '';

            // 保存宽度
            const finalWidth = type === 'chatPanel'
                ? (store.chatPanelWidth ? store.chatPanelWidth.value : sidebarElement.getBoundingClientRect().width)
                : sidebarElement.offsetWidth;

            if (type === 'sidebar') {
                if (typeof store.saveSidebarWidth === 'function') {
                    store.saveSidebarWidth(finalWidth);
                } else if (saveWidth && typeof saveWidth === 'function') {
                    saveWidth(finalWidth);
                }
            } else if (type === 'chatPanel') {
                if (typeof store.saveChatPanelWidth === 'function') {
                    store.saveChatPanelWidth(finalWidth);
                } else if (saveWidth && typeof saveWidth === 'function') {
                    saveWidth(finalWidth);
                }
            } else if (saveWidth && typeof saveWidth === 'function') {
                saveWidth(finalWidth);
            }

            // 移除事件监听器
            cleanup();
        };

        // 添加全局事件监听器
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });

    // 清理函数
    function cleanup() {
        if (handleMouseMove) {
            document.removeEventListener('mousemove', handleMouseMove);
            handleMouseMove = null;
        }
        if (handleMouseUp) {
            document.removeEventListener('mouseup', handleMouseUp);
            handleMouseUp = null;
        }
    }

    // 暴露清理函数
    resizer._cleanup = cleanup;

    sidebarElement.appendChild(resizer);

    return resizer;
}

export default {
    createSidebarResizers,
    createResizer
};
