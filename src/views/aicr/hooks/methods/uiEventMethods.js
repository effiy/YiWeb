/**
 * UI事件处理方法模块
 * author: YiWeb
 * 说明：处理侧边栏切换、聊天面板切换、数据刷新、批量模式等UI交互
 */

import { safeExecute } from '/cdn/utils/core/error.js';

/**
 * 创建UI事件处理方法
 * @param {Object} deps - 依赖注入对象
 * @param {Object} deps.store - 状态存储对象
 * @returns {Object} UI事件处理方法集合
 */
export const createUiEventMethods = ({ store }) => {
    const {
        toggleSidebar,
        toggleChatPanel,
        refreshData,
        normalizeKey
    } = store;

    /**
     * 切换侧边栏
     */
    const handleToggleSidebar = () => {
        return safeExecute(() => {
            toggleSidebar();
            console.log('[侧边栏] 切换侧边栏状态');
        }, '侧边栏切换');
    };

    /**
     * 切换聊天面板
     */
    const handleToggleChatPanel = () => {
        return safeExecute(() => {
            if (typeof toggleChatPanel === 'function') {
                toggleChatPanel();
            }
            console.log('[聊天面板] 切换聊天面板状态');
        }, '聊天面板切换');
    };

    /**
     * 处理项目切换
     */
    const handleProjectChange = () => {
        return safeExecute(async () => {
            console.log('[项目切换] 全局模式下忽略项目切换');
        }, '项目切换处理');
    };

    /**
     * 刷新数据
     */
    const handleRefreshData = () => {
        return safeExecute(() => {
            refreshData();
            console.log('[数据刷新] 刷新当前项目数据');
        }, '数据刷新处理');
    };

    /**
     * 切换批量选择模式 (文件树)
     */
    const toggleBatchMode = () => {
        return safeExecute(() => {
            const { batchMode, selectedKeys } = store;
            if (batchMode && typeof batchMode.value !== 'undefined') {
                batchMode.value = !batchMode.value;
                // 退出批量模式时清空选中项
                if (!batchMode.value && selectedKeys && selectedKeys.value) {
                    selectedKeys.value.clear();
                }
                console.log('[批量选择] 批量模式:', batchMode.value ? '开启' : '关闭');
            }
        }, '批量模式切换');
    };

    /**
     * 切换文件选中状态（批量选择模式下）
     */
    const toggleFileSelection = (key) => {
        return safeExecute(() => {
            const { batchMode, selectedKeys } = store;
            if (!batchMode || !batchMode.value) {
                console.warn('[批量选择] 未开启批量模式');
                return;
            }

            if (!selectedKeys || !selectedKeys.value) {
                console.warn('[批量选择] selectedKeys 未初始化');
                return;
            }

            const normalizedKey = normalizeKey ? normalizeKey(key) : String(key || '');

            if (selectedKeys.value.has(normalizedKey)) {
                selectedKeys.value.delete(normalizedKey);
                console.log('[批量选择] 取消选中文件:', normalizedKey);
            } else {
                selectedKeys.value.add(normalizedKey);
                console.log('[批量选择] 选中文件:', normalizedKey);
            }

            console.log('[批量选择] 当前选中文件数:', selectedKeys.value.size);
        }, '文件选择切换');
    };

    return {
        handleToggleSidebar,
        handleToggleChatPanel,
        handleProjectChange,
        handleRefreshData,
        toggleBatchMode,
        toggleFileSelection
    };
};
