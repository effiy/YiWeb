/**
 * 方法函数组合式
 * 提供与代码审查相关的常用操作方法
 * author: liangliang
 * 
 * @param {Object} store - 状态存储对象
 * @returns {Object} 方法集合
 */
import { safeExecute, safeExecuteAsync, createError, ErrorTypes, showSuccessMessage } from '/src/utils/core/error.js';
import { getData, postData, deleteData, batchOperations } from '/src/services/index.js';
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

export const useMethods = (store) => {
    const {
        fileTree,
        selectedKey,
        expandedFolders,
        setSelectedKey,
        normalizeKey,
        toggleFolder,
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
        sessions,

        // 搜索相关状态
        searchQuery,
        // 加载状态
        loading,
        files,
        // 视图模式
        viewMode,

        // 会话批量选择相关状态
        sessionBatchMode,
        selectedSessionKeys,

        activeSession,
        activeSessionLoading,
        activeSessionError,
        sessionChatInput,
        sessionChatDraftImages,
        sessionChatLastDraftText,
        sessionChatLastDraftImages,
        sessionChatSending,
        sessionChatAbortController,
        sessionChatStreamingTargetTimestamp,
        sessionChatStreamingType,
        sessionChatCopyFeedback,
        sessionChatRegenerateFeedback,
        sessionContextEnabled,
        sessionContextEditorVisible,
        sessionContextDraft,
        sessionContextMode,
        sessionContextUserEdited,
        sessionContextRefreshConfirmUntil,
        sessionContextRefreshStatus,
        sessionContextOptimizing,
        sessionContextOptimizeStatus,
        sessionContextTranslating,
        sessionContextSaving,
        sessionContextSaveStatus,
        sessionContextUndoVisible,
        sessionContextOptimizeBackup,
        sessionMessageEditorVisible,
        sessionMessageEditorDraft,
        sessionMessageEditorMode,
        sessionMessageEditorIndex,
        sessionFaqVisible,
        sessionFaqSearchKeyword,
        sessionFaqItems,
        sessionFaqLoading,
        sessionFaqError,
        sessionFaqDeletingMap,
        sessionFaqSelectedTags,
        sessionFaqTagFilterReverse,
        sessionFaqTagFilterNoTags,
        sessionFaqTagFilterExpanded,
        sessionFaqTagFilterVisibleCount,
        sessionFaqTagFilterSearchKeyword,
        sessionFaqTagManagerVisible,
        sessionSettingsVisible,
        sessionBotModel,
        sessionBotSystemPrompt,
        sessionBotModelDraft,
        sessionBotSystemPromptDraft,
        weChatSettingsVisible,
        weChatRobots,
        weChatRobotsDraft
    } = store;

    const defaultSessionBotSystemPrompt = '你是一个专业、简洁且可靠的 AI 助手。';
    let _sessionContextKeydownHandler = null;
    let _sessionContextPreviewClickHandler = null;
    const _sessionContextTimeouts = new Set();
    const { computed } = Vue;
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

    const _sessionContextClearTimeouts = () => {
        try {
            for (const t of Array.from(_sessionContextTimeouts)) {
                clearTimeout(t);
            }
            _sessionContextTimeouts.clear();
        } catch (_) { }
    };

    let __aicrImagePreviewOverlay = null;

    const _ensureAicrImagePreviewOverlay = () => {
        try {
            if (__aicrImagePreviewOverlay) return __aicrImagePreviewOverlay;

            const root = document.createElement('div');
            root.className = 'aicr-image-preview-overlay';
            root.setAttribute('aria-hidden', 'true');

            const mask = document.createElement('div');
            mask.className = 'aicr-image-preview-mask';

            const body = document.createElement('div');
            body.className = 'aicr-image-preview-body';

            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'aicr-image-preview-close';
            closeBtn.setAttribute('aria-label', '关闭图片预览');
            closeBtn.title = '关闭';
            closeBtn.textContent = '✕';

            const img = document.createElement('img');
            img.className = 'aicr-image-preview-img';
            img.alt = '图片预览';

            const close = () => {
                try {
                    root.classList.remove('is-open');
                    root.setAttribute('aria-hidden', 'true');
                    img.src = '';
                } catch (_) { }
            };

            mask.addEventListener('click', close);
            closeBtn.addEventListener('click', close);
            root.addEventListener('click', (e) => {
                try {
                    if (e && e.target === root) close();
                } catch (_) { }
            });

            body.appendChild(closeBtn);
            body.appendChild(img);
            root.appendChild(mask);
            root.appendChild(body);
            document.body.appendChild(root);

            __aicrImagePreviewOverlay = { root, img, close };
            return __aicrImagePreviewOverlay;
        } catch (_) {
            return null;
        }
    };

    const _isAicrImagePreviewOpen = () => {
        try {
            return !!(__aicrImagePreviewOverlay && __aicrImagePreviewOverlay.root && __aicrImagePreviewOverlay.root.classList.contains('is-open'));
        } catch (_) {
            return false;
        }
    };

    const _openAicrImagePreview = (src) => {
        try {
            const s = String(src || '').trim();
            if (!s) return;
            const overlay = _ensureAicrImagePreviewOverlay();
            if (!overlay || !overlay.root || !overlay.img) return;
            overlay.img.src = s;
            overlay.root.classList.add('is-open');
            overlay.root.setAttribute('aria-hidden', 'false');
        } catch (_) { }
    };

    const _closeAicrImagePreview = () => {
        try {
            const overlay = __aicrImagePreviewOverlay;
            if (!overlay || typeof overlay.close !== 'function') return;
            overlay.close();
        } catch (_) { }
    };

    const _insertTextAtTextarea = (textarea, text, fallbackValue = '') => {
        try {
            const rawText = String(text ?? '');
            if (!rawText) return fallbackValue;

            const current = String(fallbackValue ?? '');
            const ta = textarea;
            const start = ta && typeof ta.selectionStart === 'number' ? ta.selectionStart : current.length;
            const end = ta && typeof ta.selectionEnd === 'number' ? ta.selectionEnd : start;
            const next = current.slice(0, start) + rawText + current.slice(end);

            if (ta && typeof ta.focus === 'function') {
                ta.focus();
                const caret = start + rawText.length;
                setTimeout(() => {
                    try { ta.setSelectionRange(caret, caret); } catch (_) { }
                }, 0);
            }
            return next;
        } catch (_) {
            return String(fallbackValue ?? '') + String(text ?? '');
        }
    };

    const _sessionContextSetStatus = (refObj, value, resetMs = 0, resetValue = '') => {
        try {
            if (!refObj) return;
            refObj.value = value;
            if (resetMs > 0) {
                const t = setTimeout(() => {
                    try { refObj.value = resetValue; } catch (_) { }
                }, resetMs);
                _sessionContextTimeouts.add(t);
            }
        } catch (_) { }
    };

    const _sessionContextCleanAiText = (raw) => {
        try {
            let s = String(raw ?? '');
            s = s.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
            if (!s) return '';

            const tryParseJsonString = (text) => {
                const t = String(text || '').trim();
                if (!t) return '';
                try {
                    const parsed = JSON.parse(t);
                    if (typeof parsed === 'string') return parsed;
                } catch (_) { }
                return '';
            };

            const parsed = tryParseJsonString(s);
            if (parsed) s = parsed;

            s = s.replace(/^\uFEFF/, '');
            s = s.replace(/^\s*```(?:markdown|md|text)?\s*\n?/i, '');
            s = s.replace(/\n?\s*```\s*$/i, '');
            s = s.trim();

            if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
                s = s.slice(1, -1);
            }

            s = String(s || '')
                .replace(/\r\n/g, '\n')
                .replace(/[ \t]+\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            return s;
        } catch (_) {
            return String(raw ?? '').trim();
        }
    };

    const _sessionContextGetCleanPath = (key) => {
        try {
            const k = key || selectedKey?.value;
            if (!k) return '';
            const file = Array.isArray(files?.value)
                ? files.value.find(f => f && (f.key === k || f.path === k))
                : null;
            const path = String(file?.path || file?.key || k || '').replace(/\\/g, '/').replace(/^\/+/, '');
            const cleanPath = path.startsWith('static/') ? path.slice(7) : path;
            return cleanPath.replace(/^\/+/, '');
        } catch (_) {
            return '';
        }
    };

    const _closeSessionContextEditorInternal = () => {
        try {
            _closeAicrImagePreview();
            if (sessionContextEditorVisible) sessionContextEditorVisible.value = false;
            if (sessionContextUndoVisible) sessionContextUndoVisible.value = false;
            if (sessionContextOptimizeBackup) sessionContextOptimizeBackup.value = '';
            if (sessionContextUserEdited) sessionContextUserEdited.value = false;
            if (sessionContextRefreshConfirmUntil) sessionContextRefreshConfirmUntil.value = 0;
            if (_sessionContextKeydownHandler) {
                document.removeEventListener('keydown', _sessionContextKeydownHandler, true);
                _sessionContextKeydownHandler = null;
            }
            if (_sessionContextPreviewClickHandler) {
                document.removeEventListener('click', _sessionContextPreviewClickHandler, true);
                _sessionContextPreviewClickHandler = null;
            }
            _sessionContextClearTimeouts();
            if (sessionContextRefreshStatus) sessionContextRefreshStatus.value = '';
            if (sessionContextOptimizeStatus) sessionContextOptimizeStatus.value = '';
            if (sessionContextSaveStatus) sessionContextSaveStatus.value = '';
            if (sessionContextTranslating) sessionContextTranslating.value = '';
            if (sessionContextOptimizing) sessionContextOptimizing.value = false;
            if (sessionContextSaving) sessionContextSaving.value = false;
            cleanupSessionContextScrollSync();
        } catch (_) { }
    };

    const _sessionContextChatOnce = async ({ system, user }) => {
        const { streamPrompt } = await import('/src/services/modules/crud.js');
        const promptUrl = getPromptUrl();
        const res = await streamPrompt(
            promptUrl,
            {
                module_name: 'services.ai.chat_service',
                method_name: 'chat',
                parameters: {
                    system: String(system || ''),
                    user: String(user || ''),
                    stream: false,
                    ...(String(sessionBotModel?.value || '').trim()
                        ? { model: String(sessionBotModel.value || '').trim() }
                        : {})
                }
            },
            { errorMessage: '请求失败' }
        );
        return _sessionContextCleanAiText(res);
    };

    const loadSessionBotSettings = () => {
        try {
            if (sessionBotModel) {
                const model = localStorage.getItem('aicr_session_bot_model');
                if (model != null) sessionBotModel.value = String(model || '').trim();
            }
            if (sessionBotSystemPrompt) {
                const prompt = localStorage.getItem('aicr_session_bot_system_prompt');
                if (prompt != null) {
                    const normalized = String(prompt || '').trim();
                    sessionBotSystemPrompt.value = normalized || defaultSessionBotSystemPrompt;
                }
            }
        } catch (_) { }
    };

    const persistSessionBotSettings = () => {
        try {
            if (sessionBotModel) localStorage.setItem('aicr_session_bot_model', String(sessionBotModel.value || '').trim());
            if (sessionBotSystemPrompt) localStorage.setItem('aicr_session_bot_system_prompt', String(sessionBotSystemPrompt.value || '').trim());
        } catch (_) { }
    };

    loadSessionBotSettings();

    const loadWeChatSettings = () => {
        try {
            const raw = localStorage.getItem('aicr_wechat_robots');
            const arr = raw ? JSON.parse(raw) : [];
            if (Array.isArray(arr)) weChatRobots.value = arr.filter(r => r && typeof r === 'object');
            if ((!Array.isArray(weChatRobots.value) || weChatRobots.value.length === 0)) {
                const enabledRaw = localStorage.getItem('aicr_wechat_enabled');
                const webhookRaw = localStorage.getItem('aicr_wechat_webhook');
                const autoRaw = localStorage.getItem('aicr_wechat_auto_forward');
                const enabled = enabledRaw === 'true';
                const webhook = String(webhookRaw || '').trim();
                const autoForward = autoRaw === 'true';
                if (webhook) {
                    weChatRobots.value = [{
                        id: 'wr_' + Date.now(),
                        name: '机器人',
                        webhook,
                        enabled,
                        autoForward
                    }];
                }
            }
        } catch (_) { }
    };

    const persistWeChatSettings = () => {
        try {
            const arr = Array.isArray(weChatRobots?.value) ? weChatRobots.value : [];
            localStorage.setItem('aicr_wechat_robots', JSON.stringify(arr));
        } catch (_) { }
    };

    loadWeChatSettings();

    const sessionFaqMethods = createSessionFaqMethods({
        store,
        safeExecute,
        getData,
        postData,
        batchOperations,
        buildServiceUrl,
        SERVICE_MODULE,
        closeSessionContextEditor: _closeSessionContextEditorInternal
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
     * 处理删除项
     * @param {Object} payload - 删除事件负载 { itemId }
     */
    const handleDeleteItem = async (payload) => {
        return safeExecute(async () => {
            // 兼容 { key: '...' } 和 { itemId: '...' } 两种格式，统一使用 key
            const key = (payload && payload.key) || (payload && payload.itemId);
            if (!key) {
                console.warn('[handleDeleteItem] 缺少 key 或 itemId:', payload);
                return;
            }

            if (!confirm('确定删除该项及其子项？此操作不可撤销。')) return;

            // 统一传递 key 参数
            await deleteItem({ key });
            showSuccessMessage('删除成功');

            // 若删除的是当前选中文件，则清空选择
            if (selectedKey && selectedKey.value && (selectedKey.value === key || selectedKey.value.startsWith(key + '/'))) {
                setSelectedKey(null);
            }
        }, '删除');
    };

    /**
     * 处理标签选择
     * @param {string|Array} tag - 标签名称或标签数组
     */
    const handleTagSelect = (tag) => {
        return safeExecute(() => {
            if (!store.selectedSessionTags) return;

            // 如果传入的是数组（来自文件树的多选或排序更新），直接替换
            if (Array.isArray(tag)) {
                store.selectedSessionTags.value = tag;
                return;
            }

            // 单个标签切换
            const currentTags = new Set(store.selectedSessionTags.value || []);
            if (currentTags.has(tag)) {
                currentTags.delete(tag);
            } else {
                currentTags.add(tag);
            }
            store.selectedSessionTags.value = Array.from(currentTags);

            console.log('[TagSelect] 选中标签:', store.selectedSessionTags.value);
        }, '处理标签选择');
    };

    /**
     * 清除所有标签过滤
     */
    const handleTagClear = () => {
        return safeExecute(() => {
            if (store.selectedSessionTags) store.selectedSessionTags.value = [];
            if (store.tagFilterNoTags) store.tagFilterNoTags.value = false;
            if (store.tagFilterSearchKeyword) store.tagFilterSearchKeyword.value = '';
            // 不清除反向过滤状态，或者根据需求清除
            // if (store.tagFilterReverse) store.tagFilterReverse.value = false;
        }, '清除标签过滤');
    };

    /**
     * 切换反向过滤
     */
    const handleTagFilterReverse = () => {
        return safeExecute(() => {
            if (store.tagFilterReverse) {
                store.tagFilterReverse.value = !store.tagFilterReverse.value;
            }
        }, '切换反向过滤');
    };

    /**
     * 切换无标签筛选
     */
    const handleTagFilterNoTags = () => {
        return safeExecute(() => {
            if (store.tagFilterNoTags) {
                store.tagFilterNoTags.value = !store.tagFilterNoTags.value;
            }
        }, '切换无标签筛选');
    };

    /**
     * 切换标签列表展开/折叠
     */
    const handleTagFilterExpand = () => {
        return safeExecute(() => {
            if (store.tagFilterExpanded) {
                store.tagFilterExpanded.value = !store.tagFilterExpanded.value;
            }
        }, '切换标签列表展开');
    };

    /**
     * 处理标签搜索
     */
    const handleTagFilterSearch = (keyword) => {
        return safeExecute(() => {
            if (store.tagFilterSearchKeyword) {
                store.tagFilterSearchKeyword.value = keyword || '';
            }
        }, '处理标签搜索');
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
     * 初始化项目根目录
     */
    const initializeProjectRootDirectory = async () => {
        return safeExecuteAsync(async () => {
            console.log('[初始化根目录] 开始初始化项目');

            try {
                // 导入会话同步服务
                const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                const sessionSync = getSessionSyncService();

                // 创建 README.md 文件对象
                const readmeFile = {
                    key: 'README.md',
                    path: 'README.md',
                    name: 'README.md',
                    content: `# New Project\n\n项目描述：这是一个新创建的项目。\n\n## 开始使用\n\n请在此处添加项目的使用说明。`,
                    type: 'file'
                };

                // 同步到会话 (forceUpdate = true)
                console.log('[初始化根目录]正在创建README.md会话...');
                await sessionSync.syncFileToSession(readmeFile, false, true);

                console.log('[初始化根目录] 项目初始化完成 (README.md 已创建)');

            } catch (error) {
                console.error('[初始化根目录] 初始化失败:', error);
                throw error;
            }
        }, '初始化项目根目录');
    };

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

    let sessionContextScrollSyncCleanup = null;

    const cleanupSessionContextScrollSync = () => {
        if (typeof sessionContextScrollSyncCleanup === 'function') {
            sessionContextScrollSyncCleanup();
        }
        sessionContextScrollSyncCleanup = null;
    };

    const setupSessionContextScrollSync = () => {
        cleanupSessionContextScrollSync();

        const modal = document.querySelector('.aicr-session-context-modal-body');
        if (!modal) return;

        const split = modal.querySelector('.aicr-session-context-split');
        if (!split) return;

        const textarea = split.querySelector('.aicr-session-context-textarea');
        const preview = split.querySelector('.aicr-session-context-preview');
        if (!(textarea instanceof HTMLElement) || !(preview instanceof HTMLElement)) return;

        let lock = null;
        let rafId = 0;

        const syncScroll = (fromEl, toEl) => {
            const fromMax = Math.max(0, (fromEl.scrollHeight || 0) - (fromEl.clientHeight || 0));
            const toMax = Math.max(0, (toEl.scrollHeight || 0) - (toEl.clientHeight || 0));
            const ratio = fromMax > 0 ? (fromEl.scrollTop / fromMax) : 0;
            toEl.scrollTop = ratio * toMax;
        };

        const scheduleUnlock = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                lock = null;
                rafId = 0;
            });
        };

        const onTextareaScroll = () => {
            if (lock === 'preview') return;
            lock = 'textarea';
            syncScroll(textarea, preview);
            scheduleUnlock();
        };

        const onPreviewScroll = () => {
            if (lock === 'textarea') return;
            lock = 'preview';
            syncScroll(preview, textarea);
            scheduleUnlock();
        };

        textarea.addEventListener('scroll', onTextareaScroll, { passive: true });
        preview.addEventListener('scroll', onPreviewScroll, { passive: true });

        sessionContextScrollSyncCleanup = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = 0;
            lock = null;
            textarea.removeEventListener('scroll', onTextareaScroll);
            preview.removeEventListener('scroll', onPreviewScroll);
        };
    };

    const ensureSessionContextScrollSync = () => {
        const visible = !!sessionContextEditorVisible?.value;
        const mode = String(sessionContextMode?.value || '').toLowerCase();
        if (!visible || mode !== 'split') {
            cleanupSessionContextScrollSync();
            return;
        }

        const schedule = () => setupSessionContextScrollSync();
        if (typeof Vue !== 'undefined' && typeof Vue.nextTick === 'function') {
            Vue.nextTick(schedule);
            return;
        }
        setTimeout(schedule, 0);
    };

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

    return {
        openLink,
        openAuth,
        ...sessionFaqMethods,
        ...sessionChatContextMethods,
        ...fileTreeCrudMethods,
        ...sessionListMethods,
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

        handleSessionDelete: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionDelete] 删除会话:', sessionKey);

                // 1. 获取会话对象 (仅通过 key 查找)
                const sessions = store.sessions?.value || [];
                let session = sessions.find(s => s && s.key === sessionKey);

                // 尝试在文件树中查找对应的节点，以便复用文件删除逻辑
                // 确保文件树已加载
                if (!fileTree.value || fileTree.value.length === 0) {
                    console.log('[handleSessionDelete] 文件树为空，尝试加载...');
                    if (loadFileTree) {
                        await loadFileTree();
                    }
                }

                // 递归查找节点
                const findNode = (nodes) => {
                    if (!nodes || !Array.isArray(nodes)) return null;
                    for (const node of nodes) {
                        // 直接匹配 key
                        if (node.key === sessionKey) return node;
                        // 兼容 sessionKey 匹配
                        if (node.sessionKey === sessionKey) return node;

                        if (node.children) {
                            const found = findNode(node.children);
                            if (found) return found;
                        }
                    }
                    return null;
                };

                const node = findNode(fileTree.value);

                if (node) {
                    console.log('[handleSessionDelete] 找到对应文件节点，使用文件删除逻辑:', node.key);
                    const itemId = node.key;
                    if (!confirm('确定删除该会话及其对应文件？此操作不可撤销。')) return;

                    // 调用 store 的 deleteItem
                    if (deleteItem) {
                        await deleteItem({ itemId });
                        showSuccessMessage('删除成功');
                    }
                    return;
                }

                console.warn('[handleSessionDelete] 未找到对应文件节点，回退到普通会话删除逻辑');

                try {
                    // 如果从列表中找不到，尝试获取完整会话信息
                    if (!session) {
                        try {
                            const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();
                            session = await sessionSync.getSession(sessionKey);
                        } catch (e) {
                            console.warn('[handleSessionDelete] 获取会话信息失败:', e);
                        }
                    }

                    if (!confirm('确定删除该会话？此操作不可撤销。')) return;

                    // 判断是否为树文件类型的会话（通过URL判断）
                    if (session && session.url && String(session.url).startsWith('aicr-session://')) {
                        if (window.showError) {
                            window.showError('不允许在会话视图删除树文件类型的会话');
                        }
                        return; // 阻止删除
                    }

                    // 使用 SessionSyncService 删除会话
                    const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                    const sessionSync = getSessionSyncService();
                    await sessionSync.deleteSession(sessionKey);

                    // 从列表中移除
                    if (store.sessions && store.sessions.value && Array.isArray(store.sessions.value)) {
                        store.sessions.value = store.sessions.value.filter(s => s && s.key !== sessionKey);
                    }

                    if (window.showSuccess) {
                        window.showSuccess('会话已删除');
                    }
                } catch (error) {
                    console.error('[handleSessionDelete] 删除会话失败:', error);
                    if (window.showError) {
                        window.showError(`删除会话失败：${error.message || '未知错误'}`);
                    }
                }
            }, '删除会话');
        },

        handleSessionCreate: async () => {
            return safeExecute(async () => {
                // 使用 prompt 获取会话名称（与新建文件保持一致）
                const title = window.prompt('新建会话名称：');
                if (!title || !title.trim()) return;

                const sessionTitle = title.trim().replace(/\s+/g, '_');

                // 生成 UUID 格式的会话 key
                const generateUUID = () => {
                    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                        return crypto.randomUUID();
                    }
                    // 兜底方案：生成类似 UUID 的字符串
                    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                        const r = Math.random() * 16 | 0;
                        const v = c === 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                    });
                };

                const sessionKey = generateUUID();

                // 获取当前时间戳
                const now = Date.now();

                // 生成唯一的随机 URL
                const timestamp = Date.now();
                const randomStr = Math.random().toString(36).substring(2, 11);
                const uniqueUrl = `aicr-session://${timestamp}-${randomStr}`;

                // 构建会话数据
                const sessionData = {
                    key: sessionKey,
                    url: uniqueUrl,
                    title: sessionTitle,
                    pageDescription: '',
                    pageContent: '',
                    messages: [],
                    tags: [],
                    createdAt: now,
                    updatedAt: now,
                    lastAccessTime: now
                };

                // 调用会话保存接口
                const payload = {
                    module_name: SERVICE_MODULE,
                    method_name: 'create_document',
                    parameters: {
                        cname: 'sessions',
                        data: sessionData
                    }
                };

                const saveResult = await postData(`${window.API_URL}/`, payload);

                if (saveResult && saveResult.success !== false) {
                    // 生成文件路径（基于会话标题）
                    const sanitizeFileName = (name) => String(name || '').trim().replace(/\s+/g, '_').replace(/\//g, '-');
                    const fileName = sanitizeFileName(sessionTitle);
                    
                    // 根据会话的 tags 构建文件夹路径（如果有）
                    const tags = Array.isArray(sessionData.tags) ? sessionData.tags : [];
                    const folderParts = tags
                        .map(t => (t == null ? '' : String(t)).trim())
                        .filter(t => t.length > 0 && String(t).toLowerCase() !== 'default');
                    
                    let filePath = '';
                    if (folderParts.length > 0) {
                        const folderPath = folderParts.join('/');
                        filePath = normalizeFilePath(`${folderPath}/${fileName}`);
                    } else {
                        filePath = normalizeFilePath(fileName);
                    }

                    // 调用 write-file 接口创建实际文件（与新建文件保持一致）
                    try {
                        const baseUrl = window.API_URL || '';
                        const url = `${baseUrl.replace(/\/$/, '')}/write-file`;
                        
                        // 清理路径：移除 static/ 前缀（如果有）
                        const cleanPath = filePath.startsWith('static/') 
                            ? filePath.slice(7) 
                            : filePath;

                        const response = await fetch(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                target_file: cleanPath,
                                content: sessionData.pageContent || '',
                                is_base64: false
                            })
                        });

                        if (!response.ok) {
                            const errorData = await response.json().catch(() => ({}));
                            throw new Error(errorData.message || `创建文件失败: ${response.status}`);
                        }

                        const result = await response.json();
                        if (result.code !== 0 && result.code !== 200) {
                            throw new Error(result.message || '创建文件失败');
                        }

                        console.log('[handleSessionCreate] 文件已通过 write-file 创建:', cleanPath);
                    } catch (writeError) {
                        console.warn('[handleSessionCreate] 通过 write-file 创建文件失败（已忽略）:', writeError?.message);
                        // 不阻止流程继续，因为会话已创建
                    }

                    // 添加到本地列表（确保新会话立即可用）
                    if (store.sessions && store.sessions.value) {
                        store.sessions.value = [sessionData, ...store.sessions.value];
                    }

                    // 刷新会话列表（从后端获取最新数据）
                    if (loadSessions && typeof loadSessions === 'function') {
                        await loadSessions(true);
                    }

                    // 刷新文件树（确保新创建的文件显示在文件树中）
                    if (store.loadFileTree && typeof store.loadFileTree === 'function') {
                        try {
                            await store.loadFileTree();
                        } catch (refreshError) {
                            console.warn('[handleSessionCreate] 刷新文件树失败（已忽略）:', refreshError?.message);
                        }
                    }

                    // 选中新创建的会话
                    const sessions = store.sessions?.value || [];
                    const newSession = sessions.find(s => s && s.key === sessionKey);
                    if (newSession) {
                        await selectSessionForChat(newSession, { toggleActive: false, openContextEditor: false });
                    }

                    showSuccessMessage('会话创建成功');
                } else {
                    throw new Error(saveResult?.message || '创建会话失败');
                }
            }, '创建会话');
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

        // 切换会话收藏状态
        handleSessionToggleFavorite: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionToggleFavorite] 切换收藏状态:', sessionKey);
                try {
                    // 找到会话
                    const sessions = store.sessions?.value || [];
                    let session = sessions.find(s => s && s.key === sessionKey);

                    if (!session) {
                        try {
                            const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();
                            session = await sessionSync.getSession(sessionKey);
                        } catch (e) {
                            console.warn('[handleSessionToggleFavorite] 获取会话信息失败:', e);
                        }
                    }

                    if (!session) {
                        throw new Error('会话不存在');
                    }

                    // 切换收藏状态
                    const newFavoriteState = !(session.isFavorite || false);
                    session.isFavorite = newFavoriteState;

                    // 更新后端
                    // const { postData } = await import('/src/services/index.js');
                    const updateData = {
                        key: sessionKey,
                        isFavorite: newFavoriteState
                    };
                    // await postData(`${window.API_URL}/session/save`, updateData);

                    const payload = {
                        module_name: SERVICE_MODULE,
                        method_name: 'update_document',
                        parameters: {
                            cname: 'sessions',
                            key: sessionKey,
                            data: updateData
                        }
                    };
                    await postData(`${window.API_URL}/`, payload);

                    // 更新本地状态
                    if (store.sessions && store.sessions.value) {
                        store.sessions.value = [...store.sessions.value];
                    }

                    if (window.showSuccess) {
                        window.showSuccess(newFavoriteState ? '已收藏' : '已取消收藏');
                    }
                } catch (error) {
                    console.error('[handleSessionToggleFavorite] 切换收藏状态失败:', error);
                    if (window.showError) {
                        window.showError(`操作失败：${error.message || '未知错误'}`);
                    }
                }
            }, '切换收藏状态');
        },

        // 会话收藏（别名，用于模板中）
        handleSessionFavorite: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionFavorite] 切换收藏状态:', sessionKey);
                try {
                    // 找到会话
                    const sessions = store.sessions?.value || [];
                    let session = sessions.find(s => s && s.key === sessionKey);

                    if (!session) {
                        try {
                            const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();
                            session = await sessionSync.getSession(sessionKey);
                        } catch (e) {
                            console.warn('[handleSessionFavorite] 获取会话信息失败:', e);
                        }
                    }

                    if (!session) {
                        throw new Error('会话不存在');
                    }

                    // 切换收藏状态
                    const newFavoriteState = !(session.isFavorite || false);
                    session.isFavorite = newFavoriteState;

                    // 更新后端
                    // const { postData } = await import('/src/services/index.js');
                    const updateData = {
                        key: sessionKey,
                        isFavorite: newFavoriteState
                    };
                    // await postData(`${window.API_URL}/session/save`, updateData);

                    const payload = {
                        module_name: SERVICE_MODULE,
                        method_name: 'update_document',
                        parameters: {
                            cname: 'sessions',
                            key: sessionKey,
                            data: updateData
                        }
                    };
                    await postData(`${window.API_URL}/`, payload);

                    // 更新本地状态
                    if (store.sessions && store.sessions.value) {
                        store.sessions.value = [...store.sessions.value];
                    }

                    if (window.showSuccess) {
                        window.showSuccess(newFavoriteState ? '已收藏' : '已取消收藏');
                    }
                } catch (error) {
                    console.error('[handleSessionFavorite] 切换收藏状态失败:', error);
                    if (window.showError) {
                        window.showError(`操作失败：${error.message || '未知错误'}`);
                    }
                }
            }, '切换收藏状态');
        },

        // 编辑会话（打开编辑模态框）
        handleSessionEdit: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionEdit] 打开编辑模态框:', sessionKey);

                // 获取会话对象（优先从本地获取）
                const sessions = store.sessions?.value || [];
                let session = sessions.find(s => s && s.key === sessionKey);

                if (!session) {
                    console.log('[handleSessionEdit] 本地未找到会话，尝试从服务端获取');
                    try {
                        const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                        const sessionSync = getSessionSyncService();
                        const serverSession = await sessionSync.getSession(sessionKey);
                        
                        if (serverSession) {
                            // 如果本地有会话，合并数据；否则使用服务端会话
                            if (session) {
                                session = { ...session, ...serverSession };
                            } else {
                                session = serverSession;
                            }
                        }
                    } catch (e) {
                        console.warn('[handleSessionEdit] 获取会话信息失败:', e);
                    }
                }

                if (!session) {
                    if (window.showError) {
                        window.showError('会话不存在');
                    }
                    return;
                }

                // 设置编辑模态框数据
                if (store.sessionEditKey) {
                    store.sessionEditKey.value = sessionKey;
                }
                if (store.sessionEditTitle) {
                    store.sessionEditTitle.value = session.title || '';
                }
                if (store.sessionEditUrl) {
                    store.sessionEditUrl.value = session.url || '';
                }
                if (store.sessionEditDescription) {
                    store.sessionEditDescription.value = session.pageDescription || '';
                }
                // 缓存完整的会话数据（包括 pageContent），避免在生成描述时重复获取
                if (store.sessionEditData) {
                    store.sessionEditData.value = session;
                }
                if (store.sessionEditVisible) {
                    store.sessionEditVisible.value = true;
                }
            }, '打开编辑模态框');
        },

        // 关闭会话编辑模态框
        closeSessionEdit: () => {
            if (store.sessionEditVisible) {
                store.sessionEditVisible.value = false;
            }
            if (store.sessionEditKey) {
                store.sessionEditKey.value = null;
            }
            if (store.sessionEditTitle) {
                store.sessionEditTitle.value = '';
            }
            if (store.sessionEditUrl) {
                store.sessionEditUrl.value = '';
            }
            if (store.sessionEditDescription) {
                store.sessionEditDescription.value = '';
            }
            if (store.sessionEditGenerating) {
                store.sessionEditGenerating.value = false;
            }
            // 清空缓存的会话数据
            if (store.sessionEditData) {
                store.sessionEditData.value = null;
            }
        },

        // 保存会话编辑
        saveSessionEdit: async () => {
            return safeExecute(async () => {
                const sessionKey = store.sessionEditKey?.value;
                const title = (store.sessionEditTitle?.value || '').trim().replace(/\s+/g, '_');
                const url = store.sessionEditUrl?.value?.trim() || '';
                const description = store.sessionEditDescription?.value?.trim() || '';

                if (!sessionKey) {
                    throw new Error('会话Key不存在');
                }

                if (!title) {
                    throw new Error('标题不能为空');
                }

                // 获取当前会话数据
                const sessions = store.sessions?.value || [];
                const session = sessions.find(s => s && s.key === sessionKey);
                if (!session) {
                    throw new Error('会话不存在');
                }

                const oldTitle = session.title || '';
                const titleChanged = title !== oldTitle;

                // 如果标题改变，需要同步更新静态文件名
                if (titleChanged) {
                    console.log('[saveSessionEdit] 标题已改变，需要同步更新静态文件名:', oldTitle, '->', title);
                    
                    // 确保文件树已加载
                    if (!fileTree.value || fileTree.value.length === 0) {
                        if (loadFileTree) {
                            await loadFileTree();
                        }
                    }

                    // 在文件树中查找对应的文件节点
                    const findNodeBySessionKey = (nodes, targetSessionKey) => {
                        if (!nodes || !Array.isArray(nodes)) return null;
                        for (const node of nodes) {
                            if (node.sessionKey === targetSessionKey || node.key === targetSessionKey) {
                                return node;
                            }
                            if (node.children) {
                                const found = findNodeBySessionKey(node.children, targetSessionKey);
                                if (found) return found;
                            }
                        }
                        return null;
                    };

                    const fileNode = findNodeBySessionKey(fileTree.value, sessionKey);
                    
                    if (fileNode && fileNode.key) {
                        // 找到文件节点，需要重命名静态文件
                        const oldPath = normalizeFilePath(fileNode.key);
                        const parentPath = oldPath.split('/').slice(0, -1).join('/');
                        
                        // 清理文件名（移除特殊字符，避免路径问题）
                        const sanitizeFileName = (name) => String(name || '')
                            .trim()
                            .replace(/\s+/g, '_')
                            .replace(/[\/\\:*?"<>|]/g, '-');
                        const newFileName = sanitizeFileName(title);
                        
                        if (!newFileName) {
                            throw new Error('清理后的文件名为空，请使用有效的文件名');
                        }

                        // 计算新路径
                        const newPath = normalizeFilePath(parentPath ? `${parentPath}/${newFileName}` : newFileName);
                        
                        if (oldPath !== newPath) {
                            console.log('[saveSessionEdit] 准备重命名静态文件:', oldPath, '->', newPath);
                            
                            // 使用 store 中的 findNodeAndParentByKey 查找节点和父节点
                            const findNodeAndParentByKey = (rootNodes, targetKey) => {
                                const stack = Array.isArray(rootNodes) ? rootNodes.map(n => ({ node: n, parent: null })) : [{ node: rootNodes, parent: null }];
                                while (stack.length) {
                                    const { node, parent } = stack.pop();
                                    if (!node) continue;
                                    if (node.key === targetKey) return { node, parent };
                                    if (node.type === 'folder' && Array.isArray(node.children)) {
                                        for (const child of node.children) {
                                            stack.push({ node: child, parent: node });
                                        }
                                    } else if (node.children && Array.isArray(node.children)) {
                                        for (const child of node.children) {
                                            stack.push({ node: child, parent: node });
                                        }
                                    }
                                }
                                return { node: null, parent: null };
                            };
                            
                            const { node: foundNode, parent: parentNode } = findNodeAndParentByKey(fileTree.value, oldPath);
                            
                            // 检查同级是否有同名文件
                            const siblings = parentNode ? (parentNode.children || []) : (Array.isArray(fileTree.value) ? fileTree.value : []);
                            if (siblings.some(ch => ch !== fileNode && ch.name === newFileName)) {
                                throw new Error('同级存在同名文件，请使用不同的文件名');
                            }

                            // 重命名静态文件
                            const fileDeleteService = getFileDeleteService();
                            const renameResult = await fileDeleteService.renameFile(oldPath, newPath);
                            
                            if (!renameResult.success) {
                                throw new Error('静态文件重命名失败: ' + (renameResult.error || '未知错误'));
                            }

                            // 更新文件树节点
                            fileNode.name = newFileName;
                            fileNode.key = newPath;
                            fileNode.path = newPath;

                            // 更新本地 files 列表
                            if (Array.isArray(files.value)) {
                                files.value = files.value.map(f => {
                                    const normalizedOldPath = normalizeFilePath(oldPath);
                                    const ids = [f.key, f.path].filter(Boolean).map(id => normalizeFilePath(id));
                                    const matched = ids.some(v => v === normalizedOldPath || v.startsWith(normalizedOldPath + '/'));
                                    if (matched) {
                                        const oldFilePath = normalizeFilePath(f.path || f.key);
                                        const replacedPath = oldFilePath.replace(normalizedOldPath, newPath);
                                        const normalized = normalizeFileObject({
                                            ...f,
                                            key: replacedPath,
                                            path: replacedPath,
                                            name: replacedPath.split('/').pop()
                                        });
                                        return normalized || f;
                                    }
                                    return f;
                                });
                            }

                            // 使用 renameSession 更新会话（这会更新会话的元数据，包括 title, tags 等）
                            const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();
                            
                            // 构造新的文件对象
                            const updatedFile = {
                                key: newPath,
                                path: newPath,
                                name: newFileName,
                                content: fileNode.content || session.pageContent || '',
                                type: 'file'
                            };
                            
                            // 调用 renameSession 更新会话
                            await sessionSync.renameSession(sessionKey, newPath, updatedFile);
                            
                            console.log('[saveSessionEdit] 静态文件和会话已同步更新');
                            
                            // 刷新文件树和会话列表
                            if (loadFileTree) {
                                await loadFileTree();
                            }
                            if (loadSessions) {
                                await loadSessions(true);
                            }
                        } else {
                            // 路径没有改变，只需要更新会话元数据（url 和 description）
                            console.log('[saveSessionEdit] 路径未改变，仅更新会话元数据');
                            const updateData = {
                                key: sessionKey,
                                title: title,
                                url: url,
                                pageDescription: description
                            };

                            const payload = {
                                module_name: SERVICE_MODULE,
                                method_name: 'update_document',
                                parameters: {
                                    cname: 'sessions',
                                    key: sessionKey,
                                    data: updateData
                                }
                            };
                            await postData(`${window.API_URL}/`, payload);
                        }
                    } else {
                        // 未找到文件节点，可能不是从文件创建的会话，仅更新会话元数据
                        console.log('[saveSessionEdit] 未找到对应的文件节点，仅更新会话元数据');
                        const updateData = {
                            key: sessionKey,
                            title: title,
                            url: url,
                            pageDescription: description
                        };

                        const payload = {
                            module_name: SERVICE_MODULE,
                            method_name: 'update_document',
                            parameters: {
                                cname: 'sessions',
                                key: sessionKey,
                                data: updateData
                            }
                        };
                        await postData(`${window.API_URL}/`, payload);
                    }
                } else {
                    // 标题未改变，仅更新 url 和 description
                    console.log('[saveSessionEdit] 标题未改变，仅更新 url 和 description');
                    const updateData = {
                        key: sessionKey,
                        title: title,
                        url: url,
                        pageDescription: description
                    };

                    const payload = {
                        module_name: SERVICE_MODULE,
                        method_name: 'update_document',
                        parameters: {
                            cname: 'sessions',
                            key: sessionKey,
                            data: updateData
                        }
                    };
                    await postData(`${window.API_URL}/`, payload);
                }

                // 更新本地状态
                if (session) {
                    session.title = title;
                    session.url = url;
                    session.pageDescription = description;
                    if (store.sessions && store.sessions.value) {
                        store.sessions.value = [...store.sessions.value];
                    }
                }

                // 如果当前编辑的会话是 activeSession，也要更新 activeSession，以刷新 welcome-card
                if (activeSession && activeSession.value && activeSession.value.key === sessionKey) {
                    activeSession.value = {
                        ...activeSession.value,
                        title: title,
                        url: url,
                        pageDescription: description,
                        updatedAt: Date.now() // 更新更新时间
                    };
                    console.log('[saveSessionEdit] 已更新 activeSession，welcome-card 将自动刷新');
                }

                // 关闭模态框
                if (store.sessionEditVisible) {
                    store.sessionEditVisible.value = false;
                }

                if (window.showSuccess) {
                    window.showSuccess('会话已更新');
                }
            }, '保存会话编辑');
        },

        // AI智能生成描述
        generateSessionDescription: async () => {
            return safeExecute(async () => {
                const sessionKey = store.sessionEditKey?.value;
                if (!sessionKey) {
                    throw new Error('会话Key不存在');
                }

                // 防止重复调用：如果正在生成中，直接返回
                if (store.sessionEditGenerating && store.sessionEditGenerating.value) {
                    console.log('[generateSessionDescription] 正在生成中，跳过重复调用');
                    return;
                }

                // 设置生成中状态
                if (store.sessionEditGenerating) {
                    store.sessionEditGenerating.value = true;
                }

                try {
                    // 优先使用编辑框中缓存的会话数据（在 handleSessionEdit 中已获取完整数据，包括 pageContent）
                    let session = store.sessionEditData?.value;
                    
                    // 如果缓存中没有，从本地 sessions 列表获取
                    if (!session) {
                        const sessions = store.sessions?.value || [];
                        session = sessions.find(s => s && s.key === sessionKey);
                    }
                    
                    // 获取页面上下文内容
                    let pageContent = session?.pageContent || '';
                    const pageTitle = session?.title || '';

                    // 注意：handleSessionEdit 已经获取了完整数据（包括 pageContent）并缓存到 sessionEditData
                    // 所以这里不应该再次调用 getSession，除非缓存真的没有数据
                    // 如果缓存和本地都没有 pageContent，说明 handleSessionEdit 获取失败，这里也不应该再次获取
                    // 因为请求去重机制已经处理了并发请求，如果 handleSessionEdit 正在获取，这里会复用该请求
                    if (!session) {
                        console.warn('[generateSessionDescription] 会话不存在，无法生成描述');
                        throw new Error('会话不存在');
                    }
                    
                    if (!pageContent || pageContent.trim() === '') {
                        console.warn('[generateSessionDescription] 会话缺少 pageContent，将仅使用标题生成描述');
                        // 不再次调用 getSession，因为 handleSessionEdit 已经尝试过了
                        // 如果还是没有，说明服务端也没有，或者获取失败
                    } else {
                        console.log('[generateSessionDescription] 使用缓存的会话数据，pageContent长度:', pageContent.length);
                    }

                    if (!session) {
                        throw new Error('会话不存在');
                    }

                    // 如果 pageContent 仍然为空，尝试从文件树中获取（不调用 loadFileTree，避免触发 loadSessions）
                    if (!pageContent || pageContent.trim() === '') {
                        console.log('[generateSessionDescription] pageContent 仍为空，尝试从文件树获取');
                        try {
                            // 直接使用现有的文件树，不重新加载
                            if (fileTree.value && fileTree.value.length > 0) {
                                // 递归查找对应的文件节点
                                const findNode = (nodes) => {
                                    if (!nodes || !Array.isArray(nodes)) return null;
                                    for (const node of nodes) {
                                        if (node.sessionKey === sessionKey || node.key === sessionKey) {
                                            return node;
                                        }
                                        if (node.children) {
                                            const found = findNode(node.children);
                                            if (found) return found;
                                        }
                                    }
                                    return null;
                                };

                                const node = findNode(fileTree.value);
                                if (node && node.content) {
                                    pageContent = node.content;
                                    console.log('[generateSessionDescription] 从文件树获取到内容，长度:', pageContent.length);
                                } else {
                                    // 如果文件树中也没有，尝试通过 loadFileByKey 加载（仅加载单个文件，不会触发会话列表查询）
                                    if (node && node.key && loadFileByKey) {
                                        const file = await loadFileByKey(node.key);
                                        if (file && file.content) {
                                            pageContent = file.content;
                                            console.log('[generateSessionDescription] 通过 loadFileByKey 获取到内容，长度:', pageContent.length);
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('[generateSessionDescription] 从文件树获取内容失败:', e);
                        }
                    }

                    // 如果仍然没有内容，使用标题作为上下文
                    if (!pageContent || pageContent.trim() === '') {
                        console.warn('[generateSessionDescription] 无法获取页面上下文内容，仅使用标题');
                        pageContent = '';
                    }

                    // 构建用于生成描述的 prompt
                    let contextText = '';
                    if (pageContent && pageContent.trim()) {
                        contextText = `会话标题：${pageTitle}\n\n页面上下文内容：\n${pageContent.substring(0, 10000)}`; // 限制内容长度避免过长
                    } else {
                        contextText = `会话标题：${pageTitle}`;
                    }

                    console.log('[generateSessionDescription] 准备调用AI，上下文长度:', contextText.length);
                    console.log('[generateSessionDescription] 上下文内容预览:', contextText.substring(0, 200));

                    // 调用 AI 接口生成描述
                    const { streamPromptJSON } = await import('/src/services/modules/crud.js');
                    const getPromptUrl = () => `${String(window.API_URL || '').trim().replace(/\/$/, '')}/`;

                    const descriptionResponse = await streamPromptJSON(getPromptUrl(), {
                        module_name: 'services.ai.chat_service',
                        method_name: 'chat',
                        parameters: {
                            system: '请根据以下会话信息生成一个简洁的描述（不超过200字），描述应该概括会话的主要内容和用途。',
                            user: contextText
                        }
                    });

                    console.log('[generateSessionDescription] AI响应:', descriptionResponse);

                    // 提取生成的描述
                    let pageDescription = '';
                    if (typeof descriptionResponse === 'string') {
                        pageDescription = descriptionResponse;
                    } else if (descriptionResponse && descriptionResponse.data) {
                        if (Array.isArray(descriptionResponse.data) && descriptionResponse.data.length > 0) {
                            const firstItem = descriptionResponse.data[0];
                            pageDescription = typeof firstItem === 'string' ? firstItem : JSON.stringify(firstItem, null, 2);
                        } else if (typeof descriptionResponse.data === 'string') {
                            pageDescription = descriptionResponse.data;
                        }
                    }

                    // 如果描述为空，使用默认描述
                    if (!pageDescription || pageDescription.trim() === '') {
                        pageDescription = `会话：${pageTitle}`;
                    }

                    // 更新编辑框中的描述
                    if (store.sessionEditDescription) {
                        store.sessionEditDescription.value = pageDescription.trim();
                    }

                    if (window.showSuccess) {
                        window.showSuccess('描述生成成功');
                    }
                } catch (error) {
                    console.error('[generateSessionDescription] 生成描述失败:', error);
                    if (window.showError) {
                        window.showError(`生成描述失败：${error.message || '未知错误'}`);
                    }
                } finally {
                    if (store.sessionEditGenerating) {
                        store.sessionEditGenerating.value = false;
                    }
                }
            }, 'AI生成描述');
        },

        // 管理会话标签（参考 YiPet 的实现）
        handleSessionManageTags: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionManageTags] 管理标签:', sessionKey);
                try {
                    const sessions = store.sessions?.value || [];
                    let session = sessions.find(s => s && s.key === sessionKey);

                    if (!session) {
                        try {
                            const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();
                            session = await sessionSync.getSession(sessionKey);
                        } catch (e) {
                            console.warn('[handleSessionManageTags] 获取会话信息失败:', e);
                        }
                    }

                    if (!session) {
                        throw new Error('会话不存在');
                    }

                    // 打开标签管理弹窗（传递 store 引用）
                    await openTagManagerExternal(session.key, session, store);
                } catch (error) {
                    console.error('[handleSessionManageTags] 管理标签失败:', error);
                    if (window.showError) {
                        window.showError(`操作失败：${error.message || '未知错误'}`);
                    }
                }
            }, '管理标签');
        },

        // 会话标签管理（别名，用于模板中）
        handleSessionTag: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionTag] 管理标签:', sessionKey);
                try {
                    const sessions = store.sessions?.value || [];
                    let session = sessions.find(s => s && s.key === sessionKey);

                    if (!session) {
                        try {
                            const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();
                            session = await sessionSync.getSession(sessionKey);
                        } catch (e) {
                            console.warn('[handleSessionTag] 获取会话信息失败:', e);
                        }
                    }

                    if (!session) {
                        throw new Error('会话不存在');
                    }

                    // 打开标签管理弹窗
                    await openTagManagerExternal(session.key, session, store);
                } catch (error) {
                    console.error('[handleSessionTag] 管理标签失败:', error);
                    if (window.showError) {
                        window.showError(`操作失败：${error.message || '未知错误'}`);
                    }
                }
            }, '管理标签');
        },

        // 创建会话副本
        handleSessionDuplicate: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionDuplicate] 创建副本:', sessionKey);
                try {
                    const sessions = store.sessions?.value || [];
                    let sourceSession = sessions.find(s => s && s.key === sessionKey);

                    if (!sourceSession) {
                        try {
                            const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();
                            sourceSession = await sessionSync.getSession(sessionKey);
                        } catch (e) {
                            console.warn('[handleSessionDuplicate] 获取会话信息失败:', e);
                        }
                    }

                    if (!sourceSession) {
                        throw new Error('会话不存在');
                    }

                    // 生成新会话ID
                    const newSessionKey = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                    const now = Date.now();

                    // 创建副本
                    const duplicatedSession = {
                        key: newSessionKey,
                        url: sourceSession.url || '',
                        title: sourceSession.title ? `${String(sourceSession.title).trim().replace(/\s+/g, '_')}_(副本)` : '新会话_(副本)',
                        pageDescription: sourceSession.pageDescription || '',
                        pageContent: sourceSession.pageContent || '',
                        messages: sourceSession.messages ? JSON.parse(JSON.stringify(sourceSession.messages)) : [],
                        tags: sourceSession.tags ? [...sourceSession.tags] : [],
                        isFavorite: false, // 副本默认不收藏
                        createdAt: now,
                        updatedAt: now,
                        lastAccessTime: now
                    };

                    // 保存到后端
                    // const { postData } = await import('/src/services/index.js');
                    // await postData(`${window.API_URL}/session/save`, duplicatedSession);

                    const payload = {
                        module_name: SERVICE_MODULE,
                        method_name: 'create_document',
                        parameters: {
                            cname: 'sessions',
                            data: duplicatedSession
                        }
                    };
                    await postData(`${window.API_URL}/`, payload);

                    // 添加到本地列表
                    if (store.sessions && store.sessions.value) {
                        store.sessions.value = [duplicatedSession, ...store.sessions.value];
                    }

                    // 重新加载会话列表
                    if (store.loadSessions && typeof store.loadSessions === 'function') {
                        await store.loadSessions(true);
                    }

                    if (window.showSuccess) {
                        window.showSuccess('会话副本已创建');
                    }
                } catch (error) {
                    console.error('[handleSessionDuplicate] 创建副本失败:', error);
                    if (window.showError) {
                        window.showError(`创建副本失败：${error.message || '未知错误'}`);
                    }
                }
            }, '创建副本');
        },

        handleSessionContext: async (sessionKey) => {
            return safeExecute(async () => {
                try {
                    const sessions = store.sessions?.value || [];
                    const session = sessions.find(s => s && s.key === sessionKey);
                    if (!session) {
                        throw new Error('会话不存在');
                    }

                    await selectSessionForChat(session, { toggleActive: false, openContextEditor: true });
                } catch (error) {
                    console.error('[handleSessionContext] 打开页面上下文失败:', error);
                    if (window.showError) {
                        window.showError(`操作失败：${error.message || '未知错误'}`);
                    }
                }
            }, '打开页面上下文');
        },

        // 打开会话URL（如果URL以https://开头）
        handleSessionOpenUrl: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionOpenUrl] 打开URL:', sessionKey);
                try {
                    const sessions = store.sessions?.value || [];
                    const session = sessions.find(s => s && s.key === sessionKey);
                    if (!session || !session.url || !session.url.startsWith('https://')) {
                        return;
                    }

                    window.open(session.url, '_blank');
                } catch (error) {
                    console.error('[handleSessionOpenUrl] 打开URL失败:', error);
                    if (window.showError) {
                        window.showError(`打开URL失败：${error.message || '未知错误'}`);
                    }
                }
            }, '打开URL');
        },


        handleCreateSession: async (payload) => {
            console.log('[handleCreateSession] 收到创建会话请求:', payload);
            return safeExecute(async () => {
                const fileKey = payload?.key || payload?.fileKey || payload?.path;
                console.log('[handleCreateSession] 文件Key:', fileKey);
                if (!fileKey) {
                    console.error('[handleCreateSession] 无效的文件Key');
                    if (window.showError) {
                        window.showError('无效的文件Key');
                    }
                    return;
                }

                try {
                    // 显示加载状态
                    if (window.showGlobalLoading) {
                        window.showGlobalLoading('正在获取文件内容并生成会话描述...');
                    }

                    // 获取文件内容
                    let fileContent = '';
                    let fileData = null;

                    if (typeof loadFileByKey === 'function') {
                        fileData = await loadFileByKey(fileKey);
                        if (fileData && fileData.content) {
                            fileContent = fileData.content;
                        }
                    }

                    if (!fileContent) {
                        throw new Error('无法获取文件内容');
                    }

                    // 调用 prompt 接口生成描述
                    const { streamPromptJSON } = await import('/src/services/modules/crud.js');

                    // 构建用于生成描述的 prompt
                    const fileInfoText = `文件路径：${fileKey}\n文件名称：${payload?.name || fileKey.split('/').pop()}\n\n文件内容：\n${fileContent.substring(0, 10000)}`; // 限制内容长度避免过长

                    // 调用 prompt 接口生成描述
                    const descriptionResponse = await streamPromptJSON(getPromptUrl(), {
                        module_name: 'services.ai.chat_service',
                        method_name: 'chat',
                        parameters: {
                            system: '请根据以下文件内容生成一个简洁的文件描述（不超过200字），描述应该概括文件的主要功能和用途。',
                            user: fileInfoText
                        }
                    });

                    // 提取生成的描述
                    let pageDescription = '';
                    if (typeof descriptionResponse === 'string') {
                        pageDescription = descriptionResponse;
                    } else if (descriptionResponse && descriptionResponse.data) {
                        if (Array.isArray(descriptionResponse.data) && descriptionResponse.data.length > 0) {
                            const firstItem = descriptionResponse.data[0];
                            pageDescription = typeof firstItem === 'string' ? firstItem : JSON.stringify(firstItem, null, 2);
                        } else if (typeof descriptionResponse.data === 'string') {
                            pageDescription = descriptionResponse.data;
                        }
                    }

                    // 如果描述为空，使用默认描述
                    if (!pageDescription || pageDescription.trim() === '') {
                        pageDescription = `文件：${payload?.name || fileKey}`;
                    }

                    // 生成 UUID 格式的会话 key
                    const generateUUID = () => {
                        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                            return crypto.randomUUID();
                        }
                        // 兜底方案：生成类似 UUID 的字符串
                        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                            const r = Math.random() * 16 | 0;
                            const v = c === 'x' ? r : (r & 0x3 | 0x8);
                            return v.toString(16);
                        });
                    };

                    const sessionKey = generateUUID();

                    // 获取当前时间戳
                    const now = Date.now();

                    // 生成唯一的随机 URL
                    const timestamp = Date.now();
                    const randomStr = Math.random().toString(36).substring(2, 11);
                    const uniqueUrl = `aicr-session://${timestamp}-${randomStr}`;

                    // 构建会话数据
                    const sessionData = {
                        key: sessionKey,
                        url: uniqueUrl,
                        title: String(fileKey || '').trim().replace(/\s+/g, '_'), // 使用 fileKey 作为会话标题
                        pageDescription: pageDescription.trim(),
                        pageContent: fileContent, // 使用文件内容作为页面上下文
                        messages: [],
                        tags: [],
                        createdAt: now,
                        updatedAt: now,
                        lastAccessTime: now
                    };

                    // 调用会话保存接口
                    const payload = {
                        module_name: SERVICE_MODULE,
                        method_name: 'create_document',
                        parameters: {
                            cname: 'sessions',
                            data: sessionData
                        }
                    };
                    const saveResult = await postData(`${window.API_URL}/`, payload);

                    if (window.hideGlobalLoading) {
                        window.hideGlobalLoading();
                    }

                    if (saveResult && saveResult.success !== false) {
                        if (window.showSuccess) {
                            window.showSuccess(`已成功创建 YiPet 会话：${fileKey}`);
                        }
                        console.log('[创建会话] 会话创建成功:', saveResult);
                    } else {
                        throw new Error(saveResult?.message || '创建会话失败');
                    }
                } catch (error) {
                    if (window.hideGlobalLoading) {
                        window.hideGlobalLoading();
                    }
                    console.error('[创建会话] 创建会话失败:', error);
                    if (window.showError) {
                        window.showError(`创建会话失败：${error.message || '未知错误'}`);
                    }
                }
            }, '创建会话');
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
