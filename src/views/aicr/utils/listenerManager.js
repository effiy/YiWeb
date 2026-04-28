/**
 * 事件监听器管理器
 * 从 aicr/index.js 提取，避免重复代码
 */

import { logInfo, logWarn } from '/cdn/utils/core/log.js';

/**
 * 创建监听器管理器
 * @returns {Object} 管理器实例
 */
export function createListenerManager() {
    const listeners = new Map();
    let idCounter = 0;

    return {
        /**
         * 添加事件监听器
         * @param {string} eventName - 事件名称
         * @param {Function} handler - 处理函数
         * @param {Object} [options] - 选项
         * @param {EventTarget} [options.target=window] - 目标元素
         * @returns {string} 监听器 ID
         */
        add(eventName, handler, options = {}) {
            const target = options.target || window;
            const id = `${eventName}_${idCounter++}`;

            // 保存监听器信息
            listeners.set(id, {
                eventName,
                handler,
                target
            });

            // 添加监听器
            target.addEventListener(eventName, handler);

            return id;
        },

        /**
         * 移除指定 ID 的监听器
         * @param {string} id - 监听器 ID
         */
        remove(id) {
            const listener = listeners.get(id);
            if (listener) {
                listener.target.removeEventListener(listener.eventName, listener.handler);
                listeners.delete(id);
            }
        },

        /**
         * 按事件名移除监听器
         * @param {string} eventName - 事件名称
         */
        removeByEvent(eventName) {
            const toRemove = [];
            listeners.forEach((listener, id) => {
                if (listener.eventName === eventName) {
                    toRemove.push(id);
                }
            });
            toRemove.forEach(id => this.remove(id));
        },

        /**
         * 获取当前监听器数量
         * @returns {number} 数量
         */
        count() {
            return listeners.size;
        },

        /**
         * 获取所有监听器信息
         * @returns {Array} 监听器信息数组
         */
        list() {
            return Array.from(listeners.entries()).map(([id, info]) => ({
                id,
                eventName: info.eventName
            }));
        },

        /**
         * 清理所有监听器
         */
        cleanup() {
            listeners.forEach((listener) => {
                listener.target.removeEventListener(listener.eventName, listener.handler);
            });
            listeners.clear();
            logInfo('[ListenerManager] 已清理所有事件监听器');
        }
    };
}

/**
 * 为 AICR 页面设置标准事件监听器
 * @param {Object} store - 状态存储
 * @param {Object} [options] - 选项
 * @returns {Object} 监听器管理器实例
 */
export function setupAicrEventListeners(store, options = {}) {
    const manager = createListenerManager();

    // 监听模态框的ESC事件
    const modalEscListener = (e) => {
        logInfo('[代码审查页面] 检测到模态框ESC事件，跳过文件选中取消');
    };
    manager.add('modalEscPressed', modalEscListener);

    // ESC键取消文件选中
    const keydownListener = (e) => {
        if (e.key === 'Escape') {
            // 检查是否有模态框打开
            if (document.querySelector('.modal, .modal-backdrop')) {
                logInfo('[代码审查页面] 模态框已打开，跳过ESC处理');
                return;
            }

            logInfo('[代码审查页面] ESC键被按下，取消文件选中');
            if (store && store.selectedKey.value) {
                const previousKey = store.selectedKey.value;
                store.setSelectedKey(null);
                logInfo('[代码审查页面] 已取消文件选中，之前文件Key:', previousKey);

                // 发送清除高亮事件
                setTimeout(() => {
                    logInfo('[代码审查页面] 发送清除高亮事件');
                    window.dispatchEvent(new CustomEvent('clearCodeHighlight'));
                }, 50);
            }
        }
    };
    manager.add('keydown', keydownListener);

    // 监听高亮事件，必要时切换文件后转发
    const highlightListener = (e) => {
        // 如果事件已经被转发过，避免死循环
        if (e.detail && e.detail._forwarded) {
            return;
        }

        const { fileKey, rangeInfo } = e.detail || {};
        logInfo('[代码审查页面] 收到代码高亮事件:', { fileKey, rangeInfo });

        if (fileKey) {
            // 如果当前没有选中该文件，先选中文件
            const needSwitchFile = store && store.selectedKey.value !== fileKey;
            if (needSwitchFile) {
                logInfo('[代码审查页面] 切换到文件:', fileKey);
                store.setSelectedKey(fileKey);
            }

            // 发送高亮事件给代码视图组件
            const delay = needSwitchFile ? 500 : 100;
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('highlightCodeLines', {
                    detail: {
                        rangeInfo,
                        _forwarded: true
                    }
                }));
            }, delay);
        } else {
            // 如果没有文件Key，直接发送事件（可能是当前文件）
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('highlightCodeLines', {
                    detail: {
                        rangeInfo,
                        _forwarded: true
                    }
                }));
            }, 100);
        }
    };
    manager.add('highlightCodeLines', highlightListener);

    // 暴露到全局方便清理
    if (typeof window !== 'undefined') {
        window.__aicrListenerManager = manager;
    }

    return manager;
}

export default {
    createListenerManager,
    setupAicrEventListeners
};
