/**
 * 方法函数组合式
 * 提供与代码审查相关的常用操作方法
 * author: liangliang
 * 
 * @param {Object} store - 状态存储对象
 * @returns {Object} 方法集合
 */
import { safeExecute, safeExecuteAsync, createError, ErrorTypes, showSuccessMessage } from '/src/utils/core/error.js';
import { getData, postData, batchOperations } from '/src/services/index.js';
import { getStoredToken, saveToken, clearToken as clearStoredToken, openAuth as openAuthSettings } from '/src/services/helper/authUtils.js?v=1';
import {
    normalizeFilePath,
    normalizeFileObject,
    normalizeTreeNode,
    extractFileName
} from '/src/utils/aicr/fileFieldNormalizer.js';
import { buildServiceUrl, SERVICE_MODULE } from '/src/services/helper/requestHelper.js';
import { getFileDeleteService } from './store.js';
import { getSessionSyncService } from '/src/services/aicr/sessionSyncService.js';
import { renderMarkdownHtml, renderStreamingHtml } from '/src/markdown/index.js';
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

    // 搜索相关状态
    let searchTimeout = null;

    /**
     * 处理搜索输入
     * @param {Event} event - 输入事件
     */
    const handleSearchInput = (event) => {
        return safeExecute(() => {
            const value = event.target.value;

            // 添加安全检查
            if (searchQuery && typeof searchQuery.value !== 'undefined') {
                searchQuery.value = value;
            } else {
                console.warn('[搜索输入] searchQuery未定义或无效');
                return;
            }

            // 清除之前的定时器
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }

            // 设置防抖搜索
            searchTimeout = setTimeout(() => {
                performSearch(value);
            }, 300);

            console.log('[搜索输入] 搜索关键词:', value);
        }, '搜索输入处理');
    };

    /**
     * 执行搜索
     * @param {string} query - 搜索关键词
     */
    const performSearch = (query) => {
        return safeExecute(() => {
            if (!query || query.trim() === '') {
                // 清空搜索，显示所有内容
                clearSearchResults();
                return;
            }

            console.log('[搜索执行] 执行搜索:', query);

            // 这里可以实现具体的搜索逻辑
            // 例如：搜索文件、代码内容等
            searchInFileTree(query);
            searchInCode(query);

        }, '搜索执行');
    };

    /**
     * 在文件树中搜索
     * @param {string} query - 搜索关键词
     */
    const searchInFileTree = (query) => {
        return safeExecute(() => {
            console.log('[文件树搜索] 搜索关键词:', query);
            // 实现文件树搜索逻辑
        }, '文件树搜索');
    };

    /**
     * 处理文件树搜索变化
     * @param {string} query - 搜索关键词
     */
    const handleSearchChange = (query) => {
        return safeExecute(() => {
            if (searchQuery && typeof searchQuery.value !== 'undefined') {
                searchQuery.value = query || '';
                console.log('[文件树搜索] 搜索关键词已更新:', query);
            } else {
                console.warn('[文件树搜索] searchQuery未定义或无效');
            }
        }, '文件树搜索变化处理');
    };

    /**
     * 在代码中搜索
     * @param {string} query - 搜索关键词
     */
    const searchInCode = (query) => {
        return safeExecute(() => {
            console.log('[代码搜索] 搜索关键词:', query);
            // 实现代码搜索逻辑
        }, '代码搜索');
    };

    /**
     * 清除搜索结果
     */
    const clearSearchResults = () => {
        return safeExecute(() => {
            console.log('[清除搜索] 清除搜索结果');
            // 清除搜索高亮、恢复原始显示等
        }, '清除搜索结果');
    };

    /**
     * 清除搜索
     */
    const clearSearch = () => {
        return safeExecute(() => {
            // 清空搜索输入框
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.value = '';
            }

            // 清空搜索状态 - 添加安全检查
            if (searchQuery && typeof searchQuery.value !== 'undefined') {
                searchQuery.value = '';
            } else {
                console.warn('[清除搜索] searchQuery未定义或无效');
            }

            // 清除搜索结果
            clearSearchResults();

            console.log('[清除搜索] 搜索已清除');
        }, '清除搜索');
    };

    /**
     * 处理消息输入键盘事件
     * @param {Event} event - 键盘事件
     */
    const handleMessageInput = async (event) => {
        return safeExecute(() => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                // 执行搜索 - 添加安全检查
                const query = searchQuery && typeof searchQuery.value !== 'undefined' ? searchQuery.value : '';
                performSearch(query);
            } else if (event.key === 'Escape') {
                event.preventDefault();
                clearSearch();
            }
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
            // 输入法结束后执行搜索
            performSearch(event.target.value);
        }, '输入法结束处理');
    };

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
        createError,
        ErrorTypes,
        showSuccessMessage,
        normalizeFilePath,
        extractFileName,
        getApiBaseUrl,
        sessionSync
    });
    const { handleFolderImport, handleFolderExport } = folderTransferMethods;

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
    const authDialogMethods = createAuthDialogMethods({
        getStoredToken,
        saveToken,
        clearStoredToken,
        openAuthSettings
    });
    const { openAuth } = authDialogMethods;

    try { window.openAuth = openAuth; } catch (_) { }

    /**
     * 切换侧边栏
     */
    const handleToggleSidebar = () => {
        return safeExecute(() => {
            toggleSidebar();
            console.log('[侧边栏] 切换侧边栏状态');
        }, '侧边栏切换');
    };

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

    /**
     * 版本选择器已改为select元素，不再需要切换方法
     */

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

    return {
        openLink,
        openAuth,
        ...sessionFaqMethods,
        ...sessionChatContextMethods,
        ...fileTreeCrudMethods,
        ...sessionListMethods,
        ...sessionEditMethods,
        ...sessionActionMethods,
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

        handleTagSelect: (tags) => {
            return safeExecute(() => {
                if (store.selectedSessionTags) {
                    store.selectedSessionTags.value = tags;
                }
            }, '选择标签');
        },

        handleTagClear: () => {
            return safeExecute(() => {
                if (store.selectedSessionTags) {
                    store.selectedSessionTags.value = [];
                }
            }, '清除标签');
        },

        handleTagFilterReverse: (reverse) => {
            return safeExecute(() => {
                if (store.tagFilterReverse) {
                    store.tagFilterReverse.value = reverse;
                }
            }, '切换反向过滤');
        },

        handleTagFilterNoTags: (noTags) => {
            return safeExecute(() => {
                if (store.tagFilterNoTags) {
                    store.tagFilterNoTags.value = noTags;
                }
            }, '切换无标签筛选');
        },

        handleTagFilterExpand: (expanded) => {
            return safeExecute(() => {
                if (store.tagFilterExpanded) {
                    store.tagFilterExpanded.value = expanded;
                }
            }, '切换标签展开/折叠');
        },

        handleTagFilterSearch: (keyword) => {
            return safeExecute(() => {
                if (store.tagFilterSearchKeyword) {
                    store.tagFilterSearchKeyword.value = keyword || '';
                }
            }, '标签搜索');
        },

        handleSessionSearchChange: (query) => {
            return safeExecute(() => {
                if (store.sessionSearchQuery) {
                    store.sessionSearchQuery.value = query || '';
                }
            }, '会话搜索变化');
        },
        toggleSidebar: handleToggleSidebar,
        toggleChatPanel: handleToggleChatPanel,
        // 项目/版本管理方法
        handleProjectChange,
        refreshData: handleRefreshData,
        // 搜索相关方法
        handleSearchInput,
        handleSearchChange,
        performSearch,
        searchInFileTree,
        searchInCode,
        clearSearchResults,
        clearSearch,
        handleMessageInput,
        handleCompositionStart,
        handleCompositionEnd,
        handleDownloadProjectVersion,
        handleUploadProjectVersion,
        handleFolderImport,
        handleFolderExport,
        triggerUploadProjectVersion,
        toggleBatchMode: toggleBatchMode,
        toggleFileSelection: toggleFileSelection,

        /**
         * 处理复制为Prompt
         * @param {Object} payload - 文件信息
         */
        handleCopyAsPrompt: async (payload) => {
            return safeExecute(async () => {
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
        },

        // 标签管理
        openTagManager: openTagManagerExternal,
        closeTagManager: closeTagManagerExternal
    };
};
