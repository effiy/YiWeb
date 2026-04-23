/**
 * 工具方法模块
 * author: YiWeb
 * 说明：通用工具方法，如打开链接、复制为Prompt等
 */

import { safeExecute, safeExecuteAsync, createError, ErrorTypes } from '/cdn/utils/core/error.js';

/**
 * 创建工具方法
 * @param {Object} deps - 依赖注入对象
 * @param {Object} deps.store - 状态存储对象
 * @returns {Object} 工具方法集合
 */
export const createUtilMethods = ({ store }) => {
    const { files, loadFileByKey } = store;

    /**
     * 打开链接
     * @param {string} url - 链接地址
     */
    const openLink = (url) => {
        if (!url) return;
        if (/^https?:\/\//.test(url)) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            window.location.href = url;
        }
    };

    /**
     * 处理复制为Prompt
     * @param {Object} payload - 文件信息
     */
    const handleCopyAsPrompt = async (payload) => {
        return safeExecuteAsync(async () => {
            const { key, name, path, type } = payload;
            console.log('[handleCopyAsPrompt] Processing:', payload);

            // 如果是文件夹，目前暂不支持或仅提示
            if (type === 'folder') {
                if (window.showSuccess) {
                    window.showSuccess('文件夹暂不支持直接复制为Prompt，请选择具体文件');
                }
                return;
            }

            // 尝试获取文件内容
            let content = '';
            // 检查缓存
            if (files && files.value && files.value[key] && files.value[key].content) {
                content = files.value[key].content;
            } else {
                // 加载文件
                await loadFileByKey(key);
                if (files && files.value && files.value[key]) {
                    content = files.value[key].content;
                }
            }

            if (!content) {
                throw createError(`无法获取文件 ${name} 的内容`, ErrorTypes.VALIDATION, '复制为Prompt');
            }

            // 格式化为Prompt
            // 使用简单的 XML 格式 <file path="...">...</file>
            const promptText = `<file path="${path}">\n${content}\n</file>`;

            // 写入剪贴板
            await navigator.clipboard.writeText(promptText);

            if (window.showSuccess) {
                window.showSuccess(`${name} 已复制为 Prompt`);
            }
        }, '复制为Prompt');
    };

    return {
        openLink,
        handleCopyAsPrompt
    };
};
