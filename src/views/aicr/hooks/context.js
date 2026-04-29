/**
 * 应用上下文容器
 * 封装所有常用依赖，避免长参数列表
 */
import { safeExecute, safeExecuteAsync, createError, ErrorTypes, showSuccessMessage } from '/cdn/utils/core/error.js';
import { getData, postData, batchOperations } from '/src/core/services/index.js';
import { getStoredToken, saveToken, clearToken as clearStoredToken, openAuth as openAuthSettings } from '/src/core/services/helper/authUtils.js?v=1';
import {
    normalizeFilePath,
    normalizeFileObject,
    normalizeTreeNode,
    extractFileName
} from '../utils/fileFieldNormalizer.js';
import { buildServiceUrl, SERVICE_MODULE } from '/src/core/services/helper/requestHelper.js';
import { getFileDeleteService } from './state/store.js';
import { getSessionSyncService } from '/src/core/services/aicr/sessionSyncService.js';
import { renderMarkdownHtml, renderStreamingHtml } from '/cdn/markdown/index.js';
import { fetchOllamaModels, refreshModels } from '../utils/modelService.js';

/**
 * 创建应用上下文
 * @param {Object} store - 状态存储对象
 * @returns {Object} 上下文对象
 */
export function createAppContext(store) {
    const {
        fileTree,
        normalizeKey,
        toggleSidebar,
        toggleChatPanel,
        loadFileTree,
        loadFiles,
        loadFileByKey,
        refreshData,
        deleteItem,
        loadSessions,
        searchQuery,
        loading,
        files,
        viewMode,
        activeSession,
    } = store;

    const sessionSync = getSessionSyncService();

    const getApiBaseUrl = () => {
        return String(window.API_URL || '').trim().replace(/\/$/, '');
    };

    const getPromptUrl = () => {
        return `${getApiBaseUrl()}/`;
    };

    return {
        // 核心存储
        store,
        // 常用 store 字段
        fileTree,
        normalizeKey,
        loadFileTree,
        loadFiles,
        loadFileByKey,
        refreshData,
        deleteItem,
        loadSessions,
        activeSession,
        files,
        viewMode,
        // 工具函数
        safeExecute,
        safeExecuteAsync,
        createError,
        ErrorTypes,
        showSuccessMessage,
        // 数据请求
        getData,
        postData,
        batchOperations,
        // 服务配置
        buildServiceUrl,
        SERVICE_MODULE,
        // 文件处理
        normalizeFilePath,
        normalizeFileObject,
        normalizeTreeNode,
        extractFileName,
        // Markdown 渲染
        renderMarkdownHtml,
        renderStreamingHtml,
        // URL 构建
        getApiBaseUrl,
        getPromptUrl,
        // 服务
        getFileDeleteService,
        getSessionSyncService,
        sessionSync,
        // 认证
        getStoredToken,
        saveToken,
        clearStoredToken,
        openAuthSettings,
        // 模型服务
        fetchOllamaModels,
        refreshModels
    };
}

export default {
    createAppContext
};
