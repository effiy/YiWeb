/**
 * 输入处理方法模块
 * author: YiWeb
 * 说明：处理消息输入、输入法事件等
 */

import { safeExecute } from '/cdn/utils/core/error.js';

/**
 * 创建输入处理方法
 * @param {Object} deps - 依赖注入对象
 * @returns {Object} 输入处理方法集合
 */
export const createInputMethods = () => {
    /**
     * 处理消息输入键盘事件
     * @param {Event} event - 键盘事件
     */
    const handleMessageInput = async (event) => {
        return safeExecute(() => {
        }, '消息输入键盘事件处理');
    };

    /**
     * 处理输入法开始事件
     * @param {Event} event - 输入法开始事件
     */
    const handleCompositionStart = (event) => {
        return safeExecute(() => {
            console.log('[输入法] 开始输入');
        }, '输入法开始处理');
    };

    /**
     * 处理输入法结束事件
     * @param {Event} event - 输入法结束事件
     */
    const handleCompositionEnd = (event) => {
        return safeExecute(() => {
            console.log('[输入法] 结束输入');
        }, '输入法结束处理');
    };

    return {
        handleMessageInput,
        handleCompositionStart,
        handleCompositionEnd
    };
};
