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
import { createSessionEditMethods } from './sessionEditMethods.js';
import { createSessionActionMethods } from './sessionActionMethods.js';

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
