/**
 * 方法函数组合式
 * 提供与代码审查相关的常用操作方法
 * author: liangliang
 *
 * @param {Object} store - 状态存储对象
 * @returns {Object} 方法集合
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
import { createSessionFaqMethods } from './sessionFaqMethods.js';
import { openTagManager as openTagManagerExternal, closeTagManager as closeTagManagerExternal } from './tagManagerMethods.js';
import { createSessionChatContextMethods } from './sessionChatContextMethods.js';
import { createFileTreeCrudMethods } from './fileTreeCrudMethods.js';
import { createProjectZipMethods } from './projectZipMethods.js';
import { createFolderTransferMethods } from './folderTransferMethods.js';
import { createAuthDialogMethods } from './authDialogMethods.js';
import { createSessionListMethods } from './sessionListMethods.js';
import { createSessionEditMethods } from './sessionEditMethods.js';
import { createSessionActionMethods } from './sessionActionMethods.js';

// 拆分后的新模块
import { createSearchMethods } from './methods/searchMethods.js';
import { createUiEventMethods } from './methods/uiEventMethods.js';
import { createInputMethods } from './methods/inputMethods.js';
import { createUtilMethods } from './methods/utilMethods.js';
import { createTagFilterMethods } from './methods/tagFilterMethods.js';
import { fetchOllamaModels, refreshModels } from '../utils/modelService.js';

export const useMethods = (store) => {
    const {
        fileTree,
        normalizeKey,
        toggleSidebar,
        toggleChatPanel,
        loadFileTree,
        loadFiles,
        loadFileByKey,
        refreshData,
        // 文件树CRUD
        deleteItem,
        // 本地持久化
        // 会话相关方法
        loadSessions,

        // 搜索相关状态
        searchQuery,
        // 加载状态
        loading,
        files,
        // 视图模式
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

    const sessionChatContextMethods = createSessionChatContextMethods({
        store,
        safeExecute,
        postData,
        SERVICE_MODULE,
        renderMarkdownHtml,
        renderStreamingHtml,
        getPromptUrl
    });

    const sessionFaqMethods = createSessionFaqMethods({
        store,
        safeExecute,
        getData,
        postData,
        batchOperations,
        buildServiceUrl,
        SERVICE_MODULE,
        closeSessionContextEditor: sessionChatContextMethods.closeSessionContextEditor
    });

    // 使用拆分后的模块
    const searchMethods = createSearchMethods({ store });
    const uiEventMethods = createUiEventMethods({ store });
    const inputMethods = createInputMethods();
    const utilMethods = createUtilMethods({ store });
    const tagFilterMethods = createTagFilterMethods({ store });

    /**
     * 下载当前项目为ZIP
     */
    const projectZipMethods = createProjectZipMethods({
        store,
        safeExecute,
        createError,
        ErrorTypes,
        normalizeFileObject,
        normalizeTreeNode,
        normalizeFilePath,
        extractFileName,
        fileTree,
        loadFileTree,
        loadFiles
    });
    const { handleDownloadProjectVersion, handleUploadProjectVersion, triggerUploadProjectVersion } = projectZipMethods;

    const folderTransferMethods = createFolderTransferMethods({
        store,
        safeExecute,
        safeExecuteAsync,
        createError,
        ErrorTypes,
        showSuccessMessage,
        normalizeFilePath,
        extractFileName,
        sessionSync
    });
    const { handleFolderImport, handleFileImport, handleFolderExport } = folderTransferMethods;

    const authDialogMethods = createAuthDialogMethods({
        getStoredToken,
        saveToken,
        clearStoredToken,
        openAuthSettings
    });
    const { openAuth } = authDialogMethods;

    try { window.openAuth = openAuth; } catch (_) { }

    const selectSessionForChat = sessionChatContextMethods.selectSessionForChat;
    const fileTreeCrudMethods = createFileTreeCrudMethods({
        store,
        safeExecute,
        createError,
        ErrorTypes,
        showSuccessMessage,
        selectSessionForChat
    });

    const sessionListMethods = createSessionListMethods({
        store,
        safeExecute,
        safeExecuteAsync,
        getData,
        postData,
        buildServiceUrl,
        SERVICE_MODULE,
        selectSessionForChat,
        sessionSync
    });

    const sessionEditMethods = createSessionEditMethods({
        store,
        safeExecute,
        postData,
        SERVICE_MODULE,
        fileTree,
        loadFileTree,
        loadFileByKey,
        loadSessions,
        activeSession,
        files,
        normalizeFilePath,
        normalizeFileObject,
        getFileDeleteService
    });

    const sessionActionMethods = createSessionActionMethods({
        store,
        safeExecute,
        postData,
        SERVICE_MODULE,
        fileTree,
        loadFileTree,
        deleteItem,
        showSuccessMessage,
        loadSessions,
        selectSessionForChat,
        normalizeFilePath,
        loadFileByKey,
        openTagManagerExternal,
        getPromptUrl
    });

    /**
     * 加载模型列表
     */
    const loadModelList = async () => {
        return safeExecuteAsync(async () => {
            store.modelsLoading.value = true;
            store.modelsError.value = null;

            const result = await fetchOllamaModels();

            if (result.success) {
                store.availableModels.value = result.data;
            } else {
                store.modelsError.value = result.error;
                store.availableModels.value = result.data || [];
            }

            store.modelsLoading.value = false;
            return result;
        }, '加载模型列表');
    };

    /**
     * 刷新模型列表
     */
    const refreshModelList = async () => {
        return safeExecuteAsync(async () => {
            store.modelsLoading.value = true;

            const result = await refreshModels();

            if (result.success) {
                store.availableModels.value = result.data;
            }

            store.modelsLoading.value = false;
            return result;
        }, '刷新模型列表');
    };

    return {
        // 工具方法
        ...utilMethods,
        // 模型相关方法
        loadModelList,
        refreshModelList,
        openAuth,
        // FAQ方法
        ...sessionFaqMethods,
        // 会话聊天上下文方法
        ...sessionChatContextMethods,
        // 文件树CRUD方法
        ...fileTreeCrudMethods,
        // 会话列表方法
        ...sessionListMethods,
        // 会话编辑方法
        ...sessionEditMethods,
        // 会话操作方法
        ...sessionActionMethods,
        // 搜索方法
        ...searchMethods,
        // UI事件方法
        ...uiEventMethods,
        // 输入处理方法
        ...inputMethods,
        // 标签筛选方法
        ...tagFilterMethods,
        // 会话列表相关方法（已废弃，使用 setViewMode 代替）
        toggleSessionList: async () => {
            return safeExecute(async () => {
                console.log('[toggleSessionList] 切换会话列表（已废弃，使用 setViewMode 代替）');
                if (viewMode) viewMode.value = 'tree';
            }, '切换会话列表');
        },

        handleSessionSelect: async (session) => {
            return safeExecute(async () => {
                await selectSessionForChat(session, { toggleActive: false, openContextEditor: false });
            }, '选择会话');
        },

        // 项目/版本管理方法
        handleDownloadProjectVersion,
        handleUploadProjectVersion,
        handleFolderImport,
        handleFileImport,
        handleFolderExport,
        triggerUploadProjectVersion,

        // 标签管理
        openTagManager: openTagManagerExternal,
        closeTagManager: closeTagManagerExternal
    };
};
