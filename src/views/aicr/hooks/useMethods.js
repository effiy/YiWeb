/**
 * 方法函数组合式
 * 提供与代码审查相关的常用操作方法
 * author: liangliang
 * 
 * @param {Object} store - 状态存储对象
 * @returns {Object} 方法集合
 */
import { safeExecute, createError, ErrorTypes, showSuccessMessage } from '/src/utils/core/error.js';
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
    // 已移除下载功能
    const handleDownloadProjectVersion = async () => {
        console.warn('[handleDownloadProjectVersion] 该功能已被禁用');
    };

    /**
     * 上传ZIP并覆盖当前项目
     */
    const handleUploadProjectVersion = async (zipFileOrEvent) => {
        return safeExecute(async () => {
            // 兼容事件或直接传入 File
            let zipFile = zipFileOrEvent;
            if (zipFileOrEvent && zipFileOrEvent.target && zipFileOrEvent.target.files) {
                zipFile = zipFileOrEvent.target.files[0];
            }

            if (!zipFile) return;

            // 动态加载依赖与工具
            const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/ui/loading.js');
            let __uploadLoadingShown = false;
            try {
                // 显示loading
                if (!__uploadLoadingShown) {
                    showGlobalLoading(`正在上传并解析 ...`);
                    __uploadLoadingShown = true;
                }

                // 读取ZIP
                const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')).default || window.JSZip || (await import('jszip')).default;
                const zip = await JSZip.loadAsync(zipFile);

                // 展平文件列表（忽略目录项）
                const entries = [];
                zip.forEach((relativePath, fileObj) => {
                    if (!fileObj.dir) {
                        entries.push({ path: relativePath, file: fileObj });
                    }
                });
                if (entries.length === 0) {
                    throw createError('ZIP 中未发现文件', ErrorTypes.VALIDATION, '项目上传');
                }

                // 过滤规则
                const MAX_SIZE = 1 * 1024 * 1024; // 1MB (所有文件)
                const EXCLUDED_DIRS = ['.git', 'node_modules', '.svn', '.hg', '__MACOSX'];
                const EXCLUDED_FILES = ['.DS_Store', 'Thumbs.db'];

                // 图片文件类型检测
                const isImageFile = (filename) => {
                    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif', '.jfif', '.pjpeg', '.pjp'];
                    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
                    return imageExtensions.includes(ext);
                };
                const normalizePathForFilter = (p) => String(p || '').replace(/\\/g, '/').replace(/^\/+/, '');
                const hasExcludedSegment = (p) => {
                    const segs = p.split('/');
                    return segs.some(seg => EXCLUDED_DIRS.includes(seg));
                };
                const isExcludedFile = (p) => {
                    const name = p.split('/').pop();
                    return EXCLUDED_FILES.includes(name);
                };

                let STRIP_PREFIX = '';
                const normalizedAll = entries.map(e => normalizePathForFilter(e.path)).filter(Boolean);

                if (normalizedAll.length > 0) {
                    // 检测所有文件路径是否都在一个共同的根目录下
                    const firstLevelDirs = new Set();
                    normalizedAll.forEach(p => {
                        const parts = p.split('/').filter(Boolean);
                        if (parts.length > 0) {
                            firstLevelDirs.add(parts[0]);
                        }
                    });

                    // 如果所有文件都在同一个根目录下，剥离这个根目录
                    if (firstLevelDirs.size === 1) {
                        const commonRootDir = Array.from(firstLevelDirs)[0];
                        STRIP_PREFIX = commonRootDir + '/';
                        console.log('[路径剥离] 检测到共同根目录，将剥离:', STRIP_PREFIX);
                    }
                }

                console.log('[路径剥离] 最终剥离前缀:', STRIP_PREFIX || '(无)');
                let skippedExcluded = 0;
                let skippedImages = 0;
                let skippedLarge = 0;
                let processed = 0;
                let deepFilesProcessed = 0;
                let moreButtonProcessed = false;
                const filesPayload = [];
                for (const { path, file } of entries) {
                    let normPath = normalizePathForFilter(path);
                    const originalPath = normPath;

                    // 特别关注 MoreButton.vue 的处理过程
                    if (path.includes('MoreButton.vue')) {
                        console.log(`[文件处理] 开始处理 MoreButton.vue: 原始路径="${path}", 规范化后="${normPath}"`);
                    }

                    if (STRIP_PREFIX && normPath.startsWith(STRIP_PREFIX)) {
                        normPath = normPath.slice(STRIP_PREFIX.length);
                        console.log(`[文件处理] 路径剥离: "${originalPath}" -> "${normPath}"`);

                        // 特别关注 MoreButton.vue 的路径剥离
                        if (path.includes('MoreButton.vue')) {
                            console.log(`[文件处理] MoreButton.vue 路径剥离: "${originalPath}" -> "${normPath}"`);
                        }
                    }

                    if (!normPath) {
                        console.log(`[文件处理] 跳过空路径文件: "${originalPath}"`);
                        if (path.includes('MoreButton.vue')) {
                            console.log(`[文件处理] ❌ MoreButton.vue 被跳过：空路径`);
                        }
                        continue;
                    }

                    // 目录/文件名过滤
                    if (hasExcludedSegment(normPath) || isExcludedFile(normPath)) {
                        console.log(`[文件处理] 跳过排除文件: "${normPath}"`);
                        if (path.includes('MoreButton.vue')) {
                            console.log(`[文件处理] ❌ MoreButton.vue 被跳过：排除文件`);
                        }
                        skippedExcluded++;
                        continue;
                    }

                    // 图片文件过滤
                    const filename = normPath.split('/').pop();
                    if (isImageFile(filename)) {
                        console.log(`[文件处理] 跳过图片文件: "${normPath}"`);
                        if (path.includes('MoreButton.vue')) {
                            console.log(`[文件处理] ❌ MoreButton.vue 被跳过：图片文件`);
                        }
                        skippedImages++;
                        continue;
                    }

                    // 特别关注深层次文件
                    if (normPath.includes('/') && normPath.split('/').length > 3) {
                        console.log(`[文件处理] 处理深层次文件: "${normPath}" (${normPath.split('/').length} 层)`);
                        deepFilesProcessed++;
                    }

                    // 特别关注 MoreButton.vue 文件
                    if (normPath.includes('MoreButton.vue')) {
                        console.log(`[文件处理] 发现 MoreButton.vue 文件: "${originalPath}" -> "${normPath}"`);
                        moreButtonProcessed = true;
                    }
                    // 大小过滤：优先用内部尺寸；否则读取为blob判断大小
                    let size = (file && file._data && Number.isFinite(file._data.uncompressedSize)) ? file._data.uncompressedSize : null;
                    let blob = null;
                    if (!size) {
                        try {
                            blob = await file.async('blob');
                            size = blob.size;
                        } catch (_) {
                            size = 0;
                        }
                    }

                    // 文件大小过滤
                    if (size > MAX_SIZE) {
                        const sizeMB = (size / (1024 * 1024)).toFixed(2);
                        const maxSizeMB = (MAX_SIZE / (1024 * 1024)).toFixed(0);
                        console.log(`[文件过滤] 跳过过大的文件: "${normPath}" (${sizeMB}MB > ${maxSizeMB}MB)`);
                        skippedLarge++;
                        continue;
                    }
                    // 读取文本内容（尽量复用 blob）
                    let content = '';
                    try {
                        if (blob) {
                            content = await blob.text();
                        } else {
                            content = await file.async('string');
                        }
                    } catch (_) {
                        try {
                            const b64 = await file.async('base64');
                            content = atob(b64);
                        } catch (e) {
                            content = '';
                        }
                    }
                    // 记录精确字节数，优先用上面计算到的 size；若不可用则回退用 TextEncoder 重新计算
                    const payloadSize = Number.isFinite(size)
                        ? size
                        : ((typeof TextEncoder !== 'undefined' && typeof content === 'string')
                            ? new TextEncoder().encode(content).length
                            : ((content || '').length));

                    // 使用统一的字段规范化工具
                    const normalizedFile = normalizeFileObject({
                        fileKey: normPath,
                        key: normPath,
                        path: normPath,
                        name: extractFileName(normPath),
                        content: content || '',
                        size: payloadSize,
                        type: 'file'
                    });

                    if (normalizedFile) {
                        filesPayload.push(normalizedFile);
                    }
                    processed++;

                    // 特别确认 MoreButton.vue 的处理结果
                    if (path.includes('MoreButton.vue')) {
                        console.log(`[文件处理] ✅ MoreButton.vue 成功添加到文件载荷: "${normPath}"`);
                        console.log(`[文件处理] MoreButton.vue 内容长度: ${(content || '').length} 字符`);
                    }
                }

                // 输出处理统计信息
                console.log(`[文件处理统计] 总文件数: ${entries.length}`);
                console.log(`[文件处理统计] 成功处理: ${processed}`);
                console.log(`[文件处理统计] 深层次文件处理: ${deepFilesProcessed}`);
                console.log(`[文件处理统计] 跳过排除项: ${skippedExcluded}`);
                console.log(`[文件处理统计] 跳过图片文件: ${skippedImages}`);
                console.log(`[文件处理统计] 跳过大文件(>1MB): ${skippedLarge}`);
                console.log(`[文件处理统计] MoreButton.vue 处理: ${moreButtonProcessed ? '是' : '否'}`);
                console.log(`[文件处理统计] 最终文件载荷数量: ${filesPayload.length}`);

                // 专门检查 MoreButton.vue 是否在文件载荷中
                const moreButtonInPayload = filesPayload.find(f => f.name === 'MoreButton.vue' || f.path.includes('MoreButton.vue'));
                if (moreButtonInPayload) {
                    console.log(`[文件处理统计] ✅ MoreButton.vue 在文件载荷中:`, moreButtonInPayload);
                } else {
                    console.log(`[文件处理统计] ❌ MoreButton.vue 不在文件载荷中！`);
                    console.log(`[文件处理统计] 文件载荷中的文件列表:`, filesPayload.map(f => f.path));
                }

                // 构建树（基于路径）- 修复深层次文件丢失问题
                // 根节点的 key 和 path 使用 root
                const root = { key: 'root', name: 'root', type: 'folder', path: 'root', children: [] };
                const folderMap = new Map();
                folderMap.set('', root);

                // 使用统一的路径规范化函数
                const normalizePath = (path) => normalizeFilePath(path);

                // 确保路径规范化
                const removeProjectIdPrefix = (path) => normalizeFilePath(path);

                // 用于跟踪所有文件路径，避免创建与文件同名的文件夹
                const filePathsSet = new Set();

                // 改进的文件夹确保函数 - 修复递归创建逻辑
                const ensureFolder = (folderPath) => {
                    const norm = normalizePath(folderPath);

                    // 如果路径为空，返回根节点
                    if (!norm) return root;


                    const folderKeyWithoutProjectId = removeProjectIdPrefix(norm);

                    // 如果已经存在，直接返回
                    if (folderMap.has(folderKeyWithoutProjectId)) return folderMap.get(folderKeyWithoutProjectId);

                    // 检查是否与文件路径冲突（避免创建与文件同名的文件夹）
                    if (filePathsSet.has(folderKeyWithoutProjectId)) {
                        console.warn(`[ensureFolder] 跳过创建文件夹 "${folderKeyWithoutProjectId}"，因为已存在同名文件`);
                        // 返回父级目录
                        const parentPath = folderKeyWithoutProjectId.split('/').slice(0, -1).join('/');
                        return ensureFolder(parentPath);
                    }

                    // 递归创建父目录
                    const pathSegments = folderKeyWithoutProjectId.split('/').filter(Boolean);
                    let currentPath = '';
                    let parent = root;

                    // 特别关注深层次路径
                    if (pathSegments.length > 3) {
                        console.log(`[ensureFolder] 创建深层次路径: ${folderIdWithoutProjectId} (${pathSegments.length} 层)`);
                    }

                    // 逐级创建路径中的每个文件夹
                    for (let i = 0; i < pathSegments.length; i++) {
                        const segment = pathSegments[i];
                        currentPath = currentPath ? `${currentPath}/${segment}` : segment;

                        // 检查当前路径是否与文件路径冲突
                        if (filePathsSet.has(currentPath)) {
                            console.warn(`[ensureFolder] 跳过创建文件夹 "${currentPath}"，因为已存在同名文件`);
                            // 如果冲突，尝试使用父级目录
                            if (i > 0) {
                                const parentPath = pathSegments.slice(0, i).join('/');
                                parent = ensureFolder(parentPath);
                                break;
                            } else {
                                parent = root;
                                break;
                            }
                        }

                        if (!folderMap.has(currentPath)) {
                            // 使用统一的节点规范化工具创建文件夹节点
                            const node = normalizeTreeNode({
                                key: currentPath,
                                name: segment,
                                type: 'folder',
                                children: []
                            });

                            if (node) {
                                parent.children.push(node);
                                folderMap.set(currentPath, node);
                            }

                            // 特别关注深层次文件夹的创建
                            if (pathSegments.length > 3) {
                                console.log(`[ensureFolder] 创建深层次文件夹: ${currentPath} (第 ${i + 1} 层)`);
                            }
                        }
                        parent = folderMap.get(currentPath);
                    }

                    return parent;
                };

                // 处理所有文件，确保其父目录存在
                console.log(`[文件树构建] 开始处理 ${filesPayload.length} 个文件`);

                // 首先收集所有文件路径，用于检查文件夹与文件同名冲突
                for (const f of filesPayload) {
                    const filePath = normalizePath(f.path);
                    if (!filePath) {
                        continue;
                    }
                    const filePathWithoutProjectId = removeProjectIdPrefix(filePath);
                    if (filePathWithoutProjectId) {
                        filePathsSet.add(filePathWithoutProjectId);
                    }
                }
                console.log(`[文件树构建] 已收集 ${filePathsSet.size} 个文件路径用于冲突检查`);

                let deepFilesInTree = 0;
                let moreButtonInTree = false;
                for (const f of filesPayload) {
                    const filePath = normalizePath(f.path);
                    if (!filePath) {
                        console.warn('[文件树构建] 跳过无效路径的文件:', f);
                        continue;
                    }


                    const filePathWithoutProjectId = removeProjectIdPrefix(filePath);


                    const pathSegments = filePathWithoutProjectId.split('/').filter(Boolean);
                    const dir = pathSegments.length > 1
                        ? pathSegments.slice(0, -1).join('/')
                        : '';

                    // 特别关注深层次文件
                    if (pathSegments.length > 3) {
                        console.log(`[文件树构建] 处理深层次文件: ${filePathWithoutProjectId} (${pathSegments.length} 层), 父目录: ${dir || '根目录'}`);
                        deepFilesInTree++;
                    }

                    // 特别关注 MoreButton.vue 文件
                    if (f.name === 'MoreButton.vue' || filePathWithoutProjectId.includes('MoreButton.vue')) {
                        console.log(`[文件树构建] 发现 MoreButton.vue 文件: ${filePathWithoutProjectId}, 父目录: ${dir || '根目录'}`);
                        moreButtonInTree = true;
                    }

                    // 确保父目录存在
                    const parent = ensureFolder(dir);

                    // 检查父目录中是否已存在同名文件或文件夹
                    const existingFileItem = parent.children.find(child =>
                        (child.name === f.name) && child.type === 'file'
                    );

                    const existingFolderItem = parent.children.find(child =>
                        (child.name === f.name) && child.type === 'folder'
                    );

                    if (existingFileItem) {
                        console.warn(`[文件树构建] 跳过重复文件: ${filePathWithoutProjectId}`);
                        continue;
                    }

                    if (existingFolderItem) {
                        // 如果存在同名文件夹，说明文件路径结构错误
                        // 不应该将文件添加到同名文件夹中，而应该跳过或报错
                        console.error(`[文件树构建] 发现同名文件夹，无法创建文件节点: ${filePathWithoutProjectId}`);
                        console.error(`[文件树构建] 文件路径结构错误，已存在文件夹节点: ${existingFolderItem.key}`);
                        // 跳过该文件，避免创建冲突
                        continue;
                    }

                    // 使用统一的节点规范化工具创建文件节点
                    const fileNode = normalizeTreeNode({
                        key: filePathWithoutProjectId,
                        name: f.name,
                        type: 'file',
                        size: (Number.isFinite(f.size) ? f.size : ((f.content || '').length)),
                        modified: Date.now()
                    });

                    if (fileNode) {
                        parent.children.push(fileNode);
                    }

                    // 特别关注深层次文件的添加过程
                    if (pathSegments.length > 3) {
                        console.log(`[文件树构建] 成功添加深层次文件: ${f.name} 到父目录: ${dir || '根目录'}`);
                        console.log(`[文件树构建] 父目录当前子节点数量: ${parent.children.length}`);
                    }
                }

                console.log(`[文件树构建] 文件树构建完成，共创建 ${folderMap.size} 个文件夹节点`);
                console.log(`[文件树构建统计] 深层次文件添加到树中: ${deepFilesInTree}`);
                console.log(`[文件树构建统计] MoreButton.vue 添加到树中: ${moreButtonInTree ? '是' : '否'}`);

                // 覆盖导入：采用并集策略，已存在的文件覆盖，不存在的文件补充
                // 提示：前面已导入 CRUD

                // 1. 从 fileTree 中提取现有的文件列表，用于判断是更新还是新增，以及构建完整的文件树
                // 不再调用 projectFiles 接口，直接从内存中的文件树提取
                let existingFilesMap = new Map(); // key -> { key, ... }
                let allFilesForTree = [...filesPayload]; // 包含所有文件（现有 + 新导入）用于构建文件树

                try {
                    // 从 fileTree 中提取所有文件节点
                    const extractFilesFromTree = (nodes) => {
                        const fileList = [];
                        const traverse = (node) => {
                            if (!node || typeof node !== 'object') return;

                            // 如果是文件节点，添加到列表
                            if (node.type === 'file' || (node.type !== 'folder' && !node.children)) {
                                const fileKey = node.key || node.path || node.fileKey || '';
                                if (fileKey) {
                                    fileList.push({
                                        fileKey: fileKey,
                                        key: fileKey,
                                        path: fileKey,
                                        name: node.name || (fileKey ? fileKey.split('/').pop() : ''),
                                        content: node.content || '',
                                        size: node.size || (node.content ? node.content.length : 0)
                                    });
                                }
                            }

                            // 递归处理子节点
                            if (node.children && Array.isArray(node.children)) {
                                node.children.forEach(child => traverse(child));
                            }
                        };

                        if (Array.isArray(nodes)) {
                            nodes.forEach(node => traverse(node));
                        } else if (nodes) {
                            traverse(nodes);
                        }

                        return fileList;
                    };

                    // 从当前文件树中提取现有文件
                    const root = Array.isArray(fileTree.value) ? fileTree.value[0] : fileTree.value;
                    const existingFilesList = root ? extractFilesFromTree(root) : [];

                    for (const doc of existingFilesList) {
                        const fileKey = doc?.fileKey || doc?.key || doc?.path;
                        if (fileKey) {
                            existingFilesMap.set(fileKey, {
                                key: fileKey,
                                ...doc
                            });

                            // 如果现有文件不在新导入的文件列表中，添加到文件树构建列表
                            const isInNewFiles = filesPayload.some(f => {
                                const newFileKey = f.fileKey || f.key || f.path;
                                return newFileKey === fileKey;
                            });

                            if (!isInNewFiles) {
                                // 现有文件不在新导入列表中，需要保留在文件树中
                                allFilesForTree.push({
                                    fileKey: fileKey,
                                    key: fileKey,
                                    path: fileKey,
                                    name: doc.name || (typeof fileKey === 'string' ? fileKey.split('/').pop() : ''),
                                    content: doc.content || '',
                                    size: doc.size || (doc.content ? doc.content.length : 0)
                                });
                            }
                        }
                    }
                    console.log(`[覆盖导入] 从文件树中找到 ${existingFilesMap.size} 个已存在的文件`);
                    console.log(`[覆盖导入] 文件树将包含 ${allFilesForTree.length} 个文件（新导入: ${filesPayload.length}，现有保留: ${allFilesForTree.length - filesPayload.length}）`);
                } catch (e) {
                    console.warn('[覆盖导入] 从文件树提取现有文件列表失败:', e);
                }

                // 2. 基于所有文件（现有 + 新导入）重新构建完整的文件树
                // 重新构建文件树，包含所有文件
                const mergedRoot = { key: 'root', name: 'root', type: 'folder', path: 'root', children: [] };
                const mergedFolderMap = new Map();
                mergedFolderMap.set('', mergedRoot);

                // 用于跟踪所有文件路径，避免创建与文件同名的文件夹（用于最终文件树构建）
                const mergedFilePathsSet = new Set();

                // 使用统一的规范化函数
                const normalizePathForTree = (path) => normalizeFilePath(path);
                const removeProjectIdPrefixForTree = (path) => normalizeFilePath(path);

                const ensureFolderForTree = (folderPath) => {
                    const norm = normalizePathForTree(folderPath);
                    if (!norm) return mergedRoot;

                    const folderIdWithoutProjectId = removeProjectIdPrefixForTree(norm);
                    if (mergedFolderMap.has(folderIdWithoutProjectId)) {
                        return mergedFolderMap.get(folderIdWithoutProjectId);
                    }

                    // 检查是否与文件路径冲突（避免创建与文件同名的文件夹）
                    if (mergedFilePathsSet.has(folderIdWithoutProjectId)) {
                        console.warn(`[ensureFolderForTree] 跳过创建文件夹 "${folderIdWithoutProjectId}"，因为已存在同名文件`);
                        // 返回父级目录
                        const parentPath = folderIdWithoutProjectId.split('/').slice(0, -1).join('/');
                        return ensureFolderForTree(parentPath);
                    }

                    const pathSegments = folderIdWithoutProjectId.split('/').filter(Boolean);
                    let currentPath = '';
                    let parent = mergedRoot;

                    for (let i = 0; i < pathSegments.length; i++) {
                        const segment = pathSegments[i];
                        currentPath = currentPath ? `${currentPath}/${segment}` : segment;

                        // 检查当前路径是否与文件路径冲突
                        if (mergedFilePathsSet.has(currentPath)) {
                            console.warn(`[ensureFolderForTree] 跳过创建文件夹 "${currentPath}"，因为已存在同名文件`);
                            // 如果冲突，尝试使用父级目录
                            if (i > 0) {
                                const parentPath = pathSegments.slice(0, i).join('/');
                                parent = ensureFolderForTree(parentPath);
                                break;
                            } else {
                                parent = mergedRoot;
                                break;
                            }
                        }

                        if (!mergedFolderMap.has(currentPath)) {
                            // 使用统一的节点规范化工具创建文件夹节点
                            const node = normalizeTreeNode({
                                key: currentPath,
                                name: segment,
                                type: 'folder',
                                children: []
                            });

                            if (node) {
                                parent.children.push(node);
                                mergedFolderMap.set(currentPath, node);
                            }
                        }
                        parent = mergedFolderMap.get(currentPath);
                    }

                    return parent;
                };

                // 首先收集所有文件路径，用于检查文件夹与文件同名冲突（用于最终文件树构建）
                for (const f of allFilesForTree) {
                    const filePath = normalizePathForTree(f.path);
                    if (!filePath) continue;
                    const filePathWithoutProjectId = removeProjectIdPrefixForTree(filePath);
                    if (filePathWithoutProjectId) {
                        mergedFilePathsSet.add(filePathWithoutProjectId);
                    }
                }
                console.log(`[文件树合并] 已收集 ${mergedFilePathsSet.size} 个文件路径用于冲突检查`);

                // 处理所有文件（现有 + 新导入）构建完整的文件树
                console.log(`[文件树合并] 开始处理 ${allFilesForTree.length} 个文件构建完整文件树`);
                for (const f of allFilesForTree) {
                    const filePath = normalizePathForTree(f.path);
                    if (!filePath) continue;

                    const filePathWithoutProjectId = removeProjectIdPrefixForTree(filePath);
                    const pathSegments = filePathWithoutProjectId.split('/').filter(Boolean);
                    const dir = pathSegments.length > 1
                        ? pathSegments.slice(0, -1).join('/')
                        : '';

                    const parent = ensureFolderForTree(dir);

                    // 检查文件节点是否已存在（避免重复）
                    const existingFileNode = parent.children.find(child =>
                        child.name === f.name && child.type === 'file'
                    );

                    // 检查父目录中是否已存在同名文件夹（避免文件与文件夹同名冲突）
                    const existingFolderNode = parent.children.find(child =>
                        child.name === f.name && child.type === 'folder'
                    );

                    if (existingFolderNode) {
                        // 如果存在同名文件夹，说明文件路径结构错误
                        // 不应该将文件添加到同名文件夹中，而应该跳过或报错
                        console.error(`[文件树合并] 发现同名文件夹，无法创建文件节点: ${filePathWithoutProjectId}`);
                        console.error(`[文件树合并] 文件路径结构错误，已存在文件夹节点: ${existingFolderNode.key}`);
                        // 跳过该文件，避免创建冲突
                        continue;
                    }

                    if (!existingFileNode) {
                        // 使用统一的节点规范化工具创建文件节点
                        const fileNode = normalizeTreeNode({
                            key: filePathWithoutProjectId,
                            name: f.name,
                            type: 'file',
                            size: (Number.isFinite(f.size) ? f.size : ((f.content || '').length)),
                            modified: Date.now()
                        });

                        if (fileNode) {
                            parent.children.push(fileNode);
                        }
                    } else {
                        // 更新现有文件节点的信息
                        existingFileNode.name = f.name;
                        existingFileNode.size = (Number.isFinite(f.size) ? f.size : ((f.content || '').length));
                        existingFileNode.modified = Date.now();
                    }
                }

                console.log(`[文件树合并] 合并完成，共 ${mergedFolderMap.size} 个文件夹节点`);

                // 3. 更新文件树到数据库
                // 3. 批量处理文件：同步到会话
                console.log(`[数据库保存] 开始同步 ${filesPayload.length} 个文件到会话`);
                let deepFilesSaved = 0;
                let moreButtonSaved = false;
                let filesUploaded = 0;
                let filesUpdated = 0;
                let filesCreated = 0;
                let filesFailed = 0;
                const failedFiles = [];

                // 导入会话同步服务（与新建文件保持一致）
                const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                const sessionSync = getSessionSyncService();

                for (const payload of filesPayload) {
                    try {
                        const fileKey = payload.fileKey || payload.key || payload.path;
                        const existingFile = existingFilesMap.get(fileKey);
                        const isFile = payload.type === 'file' || (!payload.type && fileKey && !fileKey.endsWith('/'));

                        const isExistingFile = existingFile && existingFile.key;

                        // 仅处理文件，忽略文件夹
                        if (isFile && fileKey) {
                            try {
                                // 使用统一的字段规范化工具确保字段一致性
                                const normalizedFileObj = normalizeFileObject(payload);
                                if (normalizedFileObj) {
                                    // 强制更新模式 (Upsert)，确保覆盖旧内容
                                    await sessionSync.syncFileToSession(normalizedFileObj, false, true);

                                    filesUploaded++;
                                    if (isExistingFile) {
                                        filesUpdated++;
                                        console.log(`[数据库保存] 文件已更新到会话: ${fileKey}`);
                                    } else {
                                        filesCreated++;
                                        console.log(`[数据库保存] 文件已创建到会话: ${fileKey}`);
                                    }
                                }
                            } catch (syncError) {
                                console.warn(`[数据库保存] 同步文件到会话失败（已忽略）: ${fileKey}`, syncError?.message);
                                filesFailed++;
                            }
                        }

                        // 统计深层次文件保存
                        if (payload.path && payload.path.includes('/') && payload.path.split('/').length > 3) {
                            deepFilesSaved++;
                        }

                        // 统计 MoreButton.vue 保存
                        if (payload.name === 'MoreButton.vue' || payload.path.includes('MoreButton.vue')) {
                            moreButtonSaved = true;
                        }
                    } catch (error) {
                        filesFailed++;
                        failedFiles.push({
                            path: payload.path,
                            name: payload.name,
                            error: error?.message || '未知错误'
                        });
                        console.error(`[数据库保存] 文件处理失败: ${payload.path}`, error);
                    }
                }
                console.log(`[数据库保存统计] 成功处理: ${filesUploaded} 个文件（更新: ${filesUpdated}，新增: ${filesCreated}）`);
                console.log(`[数据库保存统计] 上传失败: ${filesFailed} 个文件`);
                console.log(`[数据库保存统计] 深层次文件保存: ${deepFilesSaved}`);
                console.log(`[数据库保存统计] MoreButton.vue 保存: ${moreButtonSaved ? '是' : '否'}`);

                if (failedFiles.length > 0) {
                    console.log(`[数据库保存统计] 失败文件列表:`, failedFiles);
                }

                // 刷新本地数据，并自动切换到最新上传的项目
                try {
                    if (typeof store.loadProjects === 'function') {
                        await store.loadProjects();
                    }
                } catch (_) { }

                // 更新选择到刚上传的项目


                // 加载界面所需数据（上传项目后需要重新加载，使用 forceClear: true）
                await Promise.all([
                    loadFileTree(true),  // forceClear: true，上传后需要重新加载
                    loadFiles()
                ]);

                // 刷新会话列表（转换成树文件后需要刷新）
                try {
                    if (typeof store.loadSessions === 'function') {
                        await store.loadSessions(true);
                    }
                } catch (_) { }

                // 广播项目就绪事件
                try {
                    window.dispatchEvent(new CustomEvent('projectReady', { detail: {} }));
                } catch (_) { }

                const { showSuccess, showWarning } = await import('/src/utils/ui/message.js');
                let msg = `导入完成：成功处理 ${filesUploaded} 个文件`;
                if (filesUpdated > 0 && filesCreated > 0) {
                    msg += `（更新 ${filesUpdated} 个，新增 ${filesCreated} 个）`;
                } else if (filesUpdated > 0) {
                    msg += `（更新 ${filesUpdated} 个）`;
                } else if (filesCreated > 0) {
                    msg += `（新增 ${filesCreated} 个）`;
                }
                if (filesFailed > 0) {
                    msg += `，失败 ${filesFailed} 个文件`;
                }
                msg += `，跳过排除项 ${skippedExcluded} 个`;
                if (skippedImages > 0) {
                    msg += `，跳过图片文件 ${skippedImages} 个`;
                }
                if (skippedLarge > 0) {
                    msg += `，跳过大文件(>1MB) ${skippedLarge} 个`;
                }
                msg += `。已切换到新项目`;

                if (filesFailed > 0) {
                    showWarning(msg);
                } else {
                    showSuccess(msg);
                }
            } finally {
                try { if (__uploadLoadingShown) hideGlobalLoading(); } catch (_) { }
            }
        }, '项目上传');
    };

    // 触发隐藏的文件选择
    // 已移除上传功能
    const triggerUploadProjectVersion = () => {
        console.warn('[triggerUploadProjectVersion] 该功能已被禁用');
    };

    const normalizeImportTargetPath = (path) => {
        const normalized = normalizeFilePath(path);
        const parts = normalized.split('/').filter(Boolean).map(p => String(p || '').trim().replace(/\s+/g, '_'));
        return parts.join('/');
    };

    const isProbablyTextFile = (file, filename) => {
        const mime = String(file?.type || '').toLowerCase();
        if (mime.startsWith('text/')) return true;
        if (mime === 'application/json' || mime === 'application/javascript' || mime === 'application/xml') return true;
        const name = String(filename || file?.name || '').toLowerCase();
        const dot = name.lastIndexOf('.');
        const ext = dot >= 0 ? name.slice(dot) : '';
        return [
            '.txt',
            '.md',
            '.json',
            '.js',
            '.mjs',
            '.cjs',
            '.ts',
            '.tsx',
            '.jsx',
            '.vue',
            '.html',
            '.htm',
            '.css',
            '.scss',
            '.sass',
            '.less',
            '.xml',
            '.yml',
            '.yaml',
            '.csv',
            '.log',
            '.ini',
            '.conf',
            '.env',
            '.py',
            '.java',
            '.go',
            '.rs',
            '.rb',
            '.php',
            '.sh',
            '.bat',
            '.sql'
        ].includes(ext);
    };

    const arrayBufferToBase64 = (buffer) => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        return btoa(binary);
    };

    const callWriteFile = async ({ targetPath, content, isBase64 }) => {
        const apiBase = getApiBaseUrl();
        if (!apiBase) {
            throw createError('API地址未配置，无法写入文件', ErrorTypes.VALIDATION, '目录导入');
        }
        let cleanPath = String(normalizeFilePath(targetPath) || '').replace(/^\/+/, '');
        if (cleanPath.startsWith('static/')) cleanPath = cleanPath.slice(7);
        cleanPath = cleanPath.replace(/^\/+/, '');

        const res = await fetch(`${apiBase}/write-file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target_file: cleanPath,
                content: String(content ?? ''),
                is_base64: !!isBase64
            })
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData?.message || `写入失败: ${res.status} ${res.statusText}`);
        }
        const json = await res.json().catch(() => ({}));
        if (json && (json.code === 0 || json.code === 200)) return true;
        if (json && json.success !== false) return true;
        throw new Error(json?.message || '写入失败');
    };

    const deriveSessionPath = (session) => {
        try {
            const desc = String(session?.pageDescription || '');
            const m = desc.match(/文件：\s*(.+)\s*$/);
            if (m && m[1]) return normalizeFilePath(m[1]);
            const tags = Array.isArray(session?.tags) ? session.tags : [];
            const title = String(session?.title || session?.pageTitle || '').trim();
            const folder = tags.map(t => String(t || '').trim()).filter(Boolean).join('/');
            const combined = folder ? `${folder}/${title}` : title;
            return normalizeFilePath(combined);
        } catch (_) {
            return '';
        }
    };

    const findSessionByFilePath = (filePath) => {
        const list = Array.isArray(sessions?.value) ? sessions.value : [];
        const target = normalizeFilePath(filePath);
        return list.find(s => deriveSessionPath(s) === target) || null;
    };

    const upsertSessionForFilePath = async ({ filePath, existingSession }) => {
        const normalizedPath = normalizeFilePath(filePath);
        const parts = normalizedPath.split('/').filter(Boolean);
        const title = String(parts[parts.length - 1] || '').trim().replace(/\s+/g, '_');
        const tags = parts.slice(0, -1);
        const now = Date.now();
        const url = String(existingSession?.url || `aicr-import://${now}-${Math.random().toString(36).slice(2, 10)}`);
        const payload = {
            key: existingSession?.key,
            url,
            title,
            pageDescription: `文件：${normalizedPath}`,
            tags,
            messages: Array.isArray(existingSession?.messages) ? existingSession.messages : [],
            isFavorite: existingSession?.isFavorite !== undefined ? !!existingSession.isFavorite : false,
            createdAt: existingSession?.createdAt || now,
            updatedAt: now,
            lastAccessTime: now
        };
        await sessionSync.saveSession(payload);
    };

    const handleFolderImport = async (payload) => {
        return safeExecute(async () => {
            const folderKeyRaw = payload && (payload.folderKey || payload.key || payload.itemId);
            const folderKey = normalizeFilePath(folderKeyRaw || '');
            if (!folderKey) {
                throw createError('目录Key无效', ErrorTypes.VALIDATION, '目录导入');
            }

            const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/ui/loading.js');
            let __loadingShown = false;
            try {
                showGlobalLoading('请选择要导入的目录...');
                __loadingShown = true;

                const pickedFiles = await new Promise((resolve) => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.setAttribute('webkitdirectory', '');
                    input.setAttribute('directory', '');
                    input.setAttribute('mozdirectory', '');
                    input.setAttribute('msdirectory', '');
                    input.addEventListener('change', () => {
                        resolve(Array.from(input.files || []));
                    });
                    input.click();
                });

                if (!pickedFiles || pickedFiles.length === 0) {
                    return;
                }

                if (typeof loadSessions === 'function') {
                    try {
                        await loadSessions();
                    } catch (_) { }
                }

                let ok = 0;
                let fail = 0;
                for (let i = 0; i < pickedFiles.length; i++) {
                    const f = pickedFiles[i];
                    const rawRel = String(f.webkitRelativePath || f.name || '');
                    const relParts = rawRel.replace(/\\/g, '/').split('/').filter(Boolean);
                    const relPath = relParts.length > 1 ? relParts.slice(1).join('/') : String(f.name || relParts[0] || '');
                    const targetPath = normalizeImportTargetPath(folderKey ? `${folderKey}/${relPath}` : relPath);
                    if (!targetPath) continue;

                    showGlobalLoading(`正在导入 ${i + 1}/${pickedFiles.length} ...`);

                    try {
                        if (isProbablyTextFile(f, targetPath)) {
                            const text = await f.text();
                            await callWriteFile({ targetPath, content: text, isBase64: false });
                        } else {
                            const buf = await f.arrayBuffer();
                            const b64 = arrayBufferToBase64(buf);
                            await callWriteFile({ targetPath, content: b64, isBase64: true });
                        }

                        ok++;
                        try {
                            const existingSession = findSessionByFilePath(targetPath);
                            await upsertSessionForFilePath({ filePath: targetPath, existingSession });
                        } catch (_) { }
                    } catch (e) {
                        fail++;
                        console.warn('[目录导入] 单文件导入失败:', targetPath, e?.message || e);
                    }
                }

                try {
                    if (typeof loadSessions === 'function') await loadSessions(true);
                    if (typeof loadFileTree === 'function') await loadFileTree();
                    if (typeof loadFiles === 'function') await loadFiles();
                } catch (_) { }

                if (fail === 0) {
                    showSuccessMessage(`导入完成：${ok} 个文件`);
                } else {
                    showSuccessMessage(`导入完成：成功 ${ok}，失败 ${fail}`);
                }
            } finally {
                try { if (__loadingShown) hideGlobalLoading(); } catch (_) { }
            }
        }, '目录导入');
    };

    const handleFolderExport = async (payload) => {
        return safeExecute(async () => {
            const folderKeyRaw = payload && (payload.folderKey || payload.key || payload.itemId);
            const folderKey = normalizeFilePath(folderKeyRaw || '');
            if (!folderKey) {
                throw createError('目录Key无效', ErrorTypes.VALIDATION, '目录导出');
            }

            const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/ui/loading.js');
            let __loadingShown = false;
            try {
                showGlobalLoading('正在收集目录文件...');
                __loadingShown = true;

                if (typeof loadFileTree === 'function') {
                    await loadFileTree();
                }

                const findFolderNode = (nodes, key) => {
                    const list = Array.isArray(nodes) ? nodes : [];
                    for (const n of list) {
                        if (!n) continue;
                        if (n.type === 'folder' && normalizeFilePath(n.key) === key) return n;
                        if (n.children) {
                            const found = findFolderNode(n.children, key);
                            if (found) return found;
                        }
                    }
                    return null;
                };

                const folderNode = findFolderNode(fileTree?.value, folderKey);
                if (!folderNode) {
                    throw createError('未找到目标目录', ErrorTypes.API, '目录导出');
                }

                const fileKeys = [];
                const collectFiles = (node) => {
                    if (!node) return;
                    if (node.type === 'file') {
                        const k = normalizeFilePath(node.key || node.path || '');
                        if (k) fileKeys.push(k);
                        return;
                    }
                    const children = Array.isArray(node.children) ? node.children : [];
                    children.forEach(ch => collectFiles(ch));
                };
                collectFiles(folderNode);

                if (fileKeys.length === 0) {
                    throw createError('目录下没有可导出的文件', ErrorTypes.VALIDATION, '目录导出');
                }

                const ensureJSZipLoaded = async () => {
                    if (window.JSZip && typeof window.JSZip === 'function') return window.JSZip;
                    return new Promise((resolve, reject) => {
                        const existing = document.querySelector('script[data-aicr-jszip="1"]');
                        if (existing) {
                            let attempts = 0;
                            const check = () => {
                                attempts++;
                                if (window.JSZip && typeof window.JSZip === 'function') return resolve(window.JSZip);
                                if (attempts > 200) return reject(new Error('JSZip 加载超时'));
                                setTimeout(check, 50);
                            };
                            check();
                            return;
                        }
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
                        script.async = true;
                        script.setAttribute('data-aicr-jszip', '1');
                        script.onload = () => resolve(window.JSZip);
                        script.onerror = () => reject(new Error('JSZip 加载失败'));
                        document.head.appendChild(script);
                    });
                };

                const JSZip = await ensureJSZipLoaded();
                if (!JSZip) {
                    throw createError('JSZip 加载失败', ErrorTypes.API, '目录导出');
                }
                const zip = new JSZip();

                const apiBase = getApiBaseUrl();
                if (!apiBase) {
                    throw createError('API地址未配置，无法导出', ErrorTypes.VALIDATION, '目录导出');
                }

                for (let i = 0; i < fileKeys.length; i++) {
                    const fileKey = fileKeys[i];
                    const rel = fileKey.startsWith(folderKey + '/') ? fileKey.slice(folderKey.length + 1) : extractFileName(fileKey);
                    const relPath = String(rel || '').replace(/^\/+/, '');
                    if (!relPath) continue;

                    showGlobalLoading(`正在读取 ${i + 1}/${fileKeys.length} ...`);

                    let cleanPath = String(fileKey || '').replace(/\\/g, '/').replace(/^\/+/, '');
                    if (cleanPath.startsWith('static/')) cleanPath = cleanPath.slice(7);
                    cleanPath = cleanPath.replace(/^\/+/, '');

                    try {
                        const res = await fetch(`${apiBase}/read-file`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ target_file: cleanPath })
                        });
                        if (!res.ok) throw new Error(`读取失败: ${res.status}`);
                        const json = await res.json().catch(() => ({}));
                        const ok = json && (json.code === 0 || json.code === 200);
                        const data = json?.data || {};
                        const content = data?.content;
                        const type = String(data?.type || '');
                        if (ok && typeof content === 'string') {
                            if (type === 'base64') {
                                zip.file(relPath, content, { base64: true });
                            } else {
                                zip.file(relPath, content);
                            }
                        } else {
                            zip.file(relPath, '');
                        }
                    } catch (e) {
                        console.warn('[目录导出] 读取失败，写入空文件:', fileKey, e?.message || e);
                        zip.file(relPath, '');
                    }
                }

                showGlobalLoading('正在生成压缩包...');
                const blob = await zip.generateAsync({ type: 'blob' });

                const folderName = String(folderKey.split('/').filter(Boolean).pop() || 'folder').replace(/\s+/g, '_');
                const dateStr = new Date().toISOString().slice(0, 10);
                const filename = `${folderName}_${dateStr}.zip`;

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                showSuccessMessage('导出完成');
            } finally {
                try { if (__loadingShown) hideGlobalLoading(); } catch (_) { }
            }
        }, '目录导出');
    };

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

    let __aicrAuthDialog = null;
    let __aicrAuthDialogInput = null;

    const notifyAuth = (type, message) => {
        try {
            if (type === 'success' && typeof window.showSuccess === 'function') return window.showSuccess(message);
            if (type === 'info' && typeof window.showInfo === 'function') return window.showInfo(message);
            if (type === 'error' && typeof window.showError === 'function') return window.showError(message);
            window.alert(message);
        } catch (_) { }
    };

    const ensureAuthDialog = () => {
        try {
            if (__aicrAuthDialog && __aicrAuthDialogInput) return { dialog: __aicrAuthDialog, input: __aicrAuthDialogInput };
            if (typeof document === 'undefined') return null;
            if (!document.getElementById('aicr-auth-dialog-style')) {
                const style = document.createElement('style');
                style.id = 'aicr-auth-dialog-style';
                style.textContent = `
                    dialog.aicr-auth-dialog{border:1px solid rgba(255,255,255,0.14);border-radius:14px;background:rgba(15,23,42,0.92);color:var(--text-primary);padding:0;max-width:520px;width:360px;box-shadow:0 22px 70px rgba(0,0,0,0.55);backdrop-filter:blur(14px);position:fixed;inset:auto auto auto auto;top:var(--aicr-auth-top, 86px);left:var(--aicr-auth-left, auto);right:var(--aicr-auth-right, 24px);margin:0;transform:translate3d(0,-6px,0) scale(.98);opacity:0;pointer-events:none}
                    dialog.aicr-auth-dialog[open]{opacity:1;pointer-events:auto;transform:translate3d(0,0,0) scale(1);transition:transform 180ms cubic-bezier(.2,.9,.2,1),opacity 160ms ease}
                    dialog.aicr-auth-dialog::backdrop{background:rgba(2,6,23,0.55);backdrop-filter:blur(2px)}
                    @media (max-width: 520px){dialog.aicr-auth-dialog{width:calc(100vw - 24px);left:12px;right:12px;top:72px}}
                    .aicr-auth-form{display:flex;flex-direction:column;gap:12px;padding:14px}
                    .aicr-auth-title-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
                    .aicr-auth-title{font-size:14px;font-weight:700;letter-spacing:.02em}
                    .aicr-auth-close{width:30px;height:30px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:var(--text-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center}
                    .aicr-auth-close:hover{background:rgba(255,255,255,0.10);color:var(--text-primary)}
                    .aicr-auth-label{font-size:12px;color:var(--text-secondary)}
                    .aicr-auth-input-row{display:flex;align-items:center;gap:10px}
                    .aicr-auth-input{flex:1;width:100%;height:38px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:var(--text-primary);padding:0 12px;outline:none}
                    .aicr-auth-input:focus{border-color:rgba(99,102,241,0.7);box-shadow:0 0 0 3px rgba(99,102,241,0.18)}
                    .aicr-auth-toggle{width:44px;height:38px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:var(--text-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center}
                    .aicr-auth-toggle:hover{background:rgba(255,255,255,0.10);color:var(--text-primary)}
                    .aicr-auth-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:4px}
                    .aicr-auth-btn{height:34px;padding:0 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:var(--text-primary);cursor:pointer}
                    .aicr-auth-btn:hover{background:rgba(255,255,255,0.10)}
                    .aicr-auth-btn.primary{border-color:rgba(99,102,241,0.55);background:rgba(99,102,241,0.22)}
                    .aicr-auth-btn.primary:hover{background:rgba(99,102,241,0.30)}
                    .aicr-auth-hint{font-size:12px;color:var(--text-tertiary)}
                `;
                document.head.appendChild(style);
            }

            const dialog = document.createElement('dialog');
            dialog.className = 'aicr-auth-dialog';
            dialog.setAttribute('aria-label', 'API 鉴权');

            const form = document.createElement('div');
            form.className = 'aicr-auth-form';

            const titleRow = document.createElement('div');
            titleRow.className = 'aicr-auth-title-row';

            const title = document.createElement('div');
            title.className = 'aicr-auth-title';
            title.textContent = 'API 鉴权';

            const closeBtnX = document.createElement('button');
            closeBtnX.type = 'button';
            closeBtnX.className = 'aicr-auth-close';
            closeBtnX.setAttribute('aria-label', '关闭');
            closeBtnX.textContent = '×';

            titleRow.appendChild(title);
            titleRow.appendChild(closeBtnX);

            const label = document.createElement('div');
            label.className = 'aicr-auth-label';
            label.textContent = 'X-Token（用于访问 API）';

            const input = document.createElement('input');
            input.className = 'aicr-auth-input';
            input.type = 'password';
            input.autocomplete = 'off';
            input.spellcheck = false;

            const toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = 'aicr-auth-toggle';
            toggleBtn.setAttribute('aria-label', '显示或隐藏');
            toggleBtn.textContent = '👁';

            const inputRow = document.createElement('div');
            inputRow.className = 'aicr-auth-input-row';
            inputRow.appendChild(input);
            inputRow.appendChild(toggleBtn);

            const hint = document.createElement('div');
            hint.className = 'aicr-auth-hint';
            hint.textContent = '留空并保存会清除 Token';

            const actions = document.createElement('div');
            actions.className = 'aicr-auth-actions';

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'aicr-auth-btn';
            cancelBtn.textContent = '取消';

            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'aicr-auth-btn';
            clearBtn.textContent = '清除';

            const saveBtn = document.createElement('button');
            saveBtn.type = 'button';
            saveBtn.className = 'aicr-auth-btn primary';
            saveBtn.textContent = '保存';

            const applyValue = (mode) => {
                try {
                    if (mode === 'cancel') {
                        dialog.close('cancel');
                        return;
                    }
                    if (mode === 'clear') {
                        clearStoredToken();
                        dialog.close('cleared');
                        notifyAuth('info', 'Token 已清除');
                        return;
                    }
                    const next = String(input.value || '').trim();
                    if (!next) {
                        clearStoredToken();
                        dialog.close('cleared');
                        notifyAuth('info', 'Token 已清除');
                        return;
                    }
                    saveToken(next);
                    dialog.close('saved');
                    notifyAuth('success', 'Token 已保存');
                } catch (e) {
                    try { dialog.close('error'); } catch (_) { }
                    notifyAuth('error', 'API 鉴权失败，请重试');
                }
            };

            closeBtnX.addEventListener('click', () => applyValue('cancel'));
            cancelBtn.addEventListener('click', () => applyValue('cancel'));
            clearBtn.addEventListener('click', () => applyValue('clear'));
            saveBtn.addEventListener('click', () => applyValue('save'));

            toggleBtn.addEventListener('click', () => {
                try {
                    const nextType = input.type === 'password' ? 'text' : 'password';
                    input.type = nextType;
                    input.focus();
                    try { input.setSelectionRange(input.value.length, input.value.length); } catch (_) { }
                } catch (_) { }
            });

            input.addEventListener('keydown', (e) => {
                if (e && e.key === 'Enter') {
                    e.preventDefault();
                    applyValue('save');
                }
            });

            dialog.addEventListener('click', (e) => {
                try {
                    if (e && e.target === dialog) applyValue('cancel');
                } catch (_) { }
            });

            dialog.addEventListener('cancel', (e) => {
                try { if (e && typeof e.preventDefault === 'function') e.preventDefault(); } catch (_) { }
                try { dialog.close('cancel'); } catch (_) { }
            });

            actions.appendChild(cancelBtn);
            actions.appendChild(clearBtn);
            actions.appendChild(saveBtn);

            form.appendChild(titleRow);
            form.appendChild(label);
            form.appendChild(inputRow);
            form.appendChild(hint);
            form.appendChild(actions);

            dialog.appendChild(form);
            document.body.appendChild(dialog);

            __aicrAuthDialog = dialog;
            __aicrAuthDialogInput = input;

            return { dialog, input };
        } catch (_) {
            return null;
        }
    };

    const openAuth = (event) => {
        try {
            openAuthSettings(event);
            return;
        } catch (_) { }
        try {
            const current = getStoredToken();
            const dialogInfo = ensureAuthDialog();
            if (dialogInfo && dialogInfo.dialog && typeof dialogInfo.dialog.showModal === 'function') {
                try {
                    const rect = event && event.currentTarget && typeof event.currentTarget.getBoundingClientRect === 'function'
                        ? event.currentTarget.getBoundingClientRect()
                        : null;
                    const vw = window.innerWidth || 0;
                    const vh = window.innerHeight || 0;
                    const padding = 12;
                    const desiredTop = rect ? rect.bottom + 10 : 86;
                    const desiredRight = rect ? Math.max(padding, vw - rect.right) : 24;
                    const maxTop = Math.max(padding, vh - 220);
                    const top = Math.min(Math.max(padding, desiredTop), maxTop);
                    dialogInfo.dialog.style.setProperty('--aicr-auth-top', `${top}px`);
                    dialogInfo.dialog.style.setProperty('--aicr-auth-right', `${desiredRight}px`);
                    dialogInfo.dialog.style.setProperty('--aicr-auth-left', 'auto');
                } catch (_) { }
                dialogInfo.input.value = String(current || '');
                dialogInfo.dialog.showModal();
                setTimeout(() => {
                    try {
                        dialogInfo.input.focus();
                        dialogInfo.input.select();
                    } catch (_) { }
                }, 0);
                return;
            }

            const token = window.prompt('请输入 X-Token（用于访问 API）', current);
            if (token === null) return;
            const next = String(token || '').trim();
            if (!next) {
                clearStoredToken();
                notifyAuth('info', 'Token 已清除');
                return;
            }
            saveToken(next);
            notifyAuth('success', 'Token 已保存');
        } catch (_) {
            notifyAuth('error', 'API 鉴权失败，请重试');
        }
    };

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
     * 切换会话批量选择模式
     */
    const toggleSessionBatchMode = () => {
        return safeExecute(() => {
            const { sessionBatchMode, selectedSessionKeys } = store;
            if (sessionBatchMode && typeof sessionBatchMode.value !== 'undefined') {
                sessionBatchMode.value = !sessionBatchMode.value;
                // 退出批量模式时清空选中项
                if (!sessionBatchMode.value && selectedSessionKeys && selectedSessionKeys.value) {
                    selectedSessionKeys.value.clear();
                }
                console.log('[会话批量] 模式切换:', sessionBatchMode.value ? '开启' : '关闭');
            }
        }, '会话批量模式切换');
    };

    /**
     * 处理会话批量选择
     * @param {string} sessionKey - 会话Key
     */
    const handleSessionBatchSelect = (sessionKey) => {
        return safeExecute(() => {
            const { sessionBatchMode, selectedSessionKeys } = store;

            if (!sessionBatchMode || !sessionBatchMode.value) {
                console.warn('[会话批量] 未开启批量模式');
                return;
            }

            if (!selectedSessionKeys || !selectedSessionKeys.value) {
                console.warn('[会话批量] selectedSessionKeys 未初始化');
                return;
            }

            if (selectedSessionKeys.value.has(sessionKey)) {
                selectedSessionKeys.value.delete(sessionKey);
            } else {
                selectedSessionKeys.value.add(sessionKey);
            }

            console.log('[会话批量] 当前选中数量:', selectedSessionKeys.value.size);
        }, '会话批量选择');
    };

    /**
     * 处理全选/取消全选会话
     * @param {Object} payload - { ids: [], isSelect: boolean }，如果为空则默认全选/取消全选当前store中的所有会话
     */
    const handleToggleSelectAllSessions = (payload) => {
        return safeExecute(() => {
            const { selectedSessionKeys, sessions } = store;

            if (!selectedSessionKeys || !selectedSessionKeys.value) return;

            // 1. 如果传入了具体的ID列表（通常来自 filteredSessions）
            if (payload && Array.isArray(payload.ids)) {
                const { ids, isSelect } = payload;
                if (isSelect) {
                    ids.forEach(id => selectedSessionKeys.value.add(id));
                } else {
                    ids.forEach(id => selectedSessionKeys.value.delete(id));
                }
                console.log('[会话批量] 指定范围全选/取消:', isSelect, '数量:', ids.length);
                return;
            }

            // 2. 如果没有传入参数，则根据当前选中状态切换（全选所有/清空）
            // 这种情况下，我们只能操作 store.sessions 中的所有会话
            const allSessions = sessions.value || [];
            const allIds = allSessions.map(s => s && s.key).filter(Boolean);

            // 检查是否已全选 (所有有效ID都在选中集合中)
            const isAllSelected = allIds.length > 0 && allIds.every(id => selectedSessionKeys.value.has(id));

            if (isAllSelected) {
                // 取消全选
                selectedSessionKeys.value.clear();
                console.log('[会话批量] 取消全选');
            } else {
                // 全选
                allIds.forEach(id => selectedSessionKeys.value.add(id));
                console.log('[会话批量] 全选所有会话, 数量:', allIds.length);
            }
        }, '会话全选/取消全选');
    };

    /**
     * 处理批量删除会话
     * @param {Array} payloadIds - 可选：要删除的会话ID列表（如果不传则删除所有选中的）
     */
    const handleBatchDeleteSessions = async (payloadIds) => {
        return safeExecute(async () => {
            const { selectedSessionKeys } = store;

            // 确定要删除的ID列表
            let keysToDelete = [];

            // 检查 payloadIds 是否为数组且不为空
            // 注意：payloadIds 可能是 event 对象，所以要严格检查是否为数组
            if (Array.isArray(payloadIds) && payloadIds.length > 0) {
                keysToDelete = payloadIds;
            } else {
                // 如果没有传入ID列表，则使用 selectedSessionKeys
                if (!selectedSessionKeys || !selectedSessionKeys.value || selectedSessionKeys.value.size === 0) {
                    if (window.showError) window.showError('请先选择要删除的会话');
                    return;
                }
                keysToDelete = Array.from(selectedSessionKeys.value);
            }

            const count = keysToDelete.length;
            if (count === 0) return;

            if (!confirm(`确定要删除选中的 ${count} 个会话吗？此操作不可撤销。`)) {
                return;
            }

            console.log('[会话批量] 开始删除, 数量:', count);

            const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
            const sessionSync = getSessionSyncService();

            let successCount = 0;
            let failCount = 0;

            // 批量删除
            // 为了避免请求过多，可以分组处理或串行处理
            // 这里使用 Promise.all 并发处理，但建议数量大时分批
            const deletePromises = keysToDelete.map(async (key) => {
                try {
                    // 检查是否为树文件类型的会话
                    // 我们需要从 store.sessions 中找到对应的会话对象来检查 URL
                    const session = store.sessions.value.find(s => s.key === key);
                    if (session && session.url && String(session.url).startsWith('aicr-session://')) {
                        console.warn(`[会话批量] 跳过树文件会话: ${key}`);
                        return { success: false, key, reason: 'skip_tree_file' };
                    }

                    await sessionSync.deleteSession(key);
                    return { success: true, key };
                } catch (e) {
                    console.error(`[会话批量] 删除失败: ${key}`, e);
                    return { success: false, key, reason: e.message };
                }
            });

            const results = await Promise.all(deletePromises);

            results.forEach(res => {
                if (res.success) {
                    successCount++;
                    // 从选中集合中移除
                    if (selectedSessionKeys && selectedSessionKeys.value) {
                        selectedSessionKeys.value.delete(res.key);
                    }
                } else {
                    if (res.reason !== 'skip_tree_file') {
                        failCount++;
                    }
                }
            });

            // 更新本地 sessions 列表
            // 过滤掉已删除的
            const deletedKeys = new Set(results.filter(r => r.success).map(r => r.key));
            if (store.sessions && store.sessions.value) {
                store.sessions.value = store.sessions.value.filter(s => !deletedKeys.has(s.key));
            }

            // 提示结果
            let msg = `批量删除完成: 成功 ${successCount} 个`;
            if (failCount > 0) {
                msg += `, 失败 ${failCount} 个`;
                if (window.showError) window.showError(msg);
            } else {
                if (window.showSuccess) window.showSuccess(msg);
            }

            // 如果全部删除了，退出批量模式
            if (selectedSessionKeys.value.size === 0) {
                // toggleSessionBatchMode(); // 可选：保持批量模式还是退出？通常保持方便继续操作，但如果空了就无所谓
            }

        }, '批量删除会话');
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

    return {
        openLink,
        openAuth,
        ...sessionFaqMethods,
        ...sessionChatContextMethods,
        ...fileTreeCrudMethods,
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
        // 视图模式切换
        setViewMode: async (mode) => {
            return safeExecute(async () => {
                mode = 'tree';
                if (viewMode && (mode === 'tree' || mode === 'tags')) {
                    const previousMode = viewMode.value;
                    viewMode.value = mode;
                    console.log('[useMethods] 视图模式已切换:', previousMode, '->', mode);

                    // 在切换视图前，将 activeSession 的最新消息同步到 store.sessions
                    if (activeSession?.value && store.sessions?.value) {
                        const activeKey = String(activeSession.value.key || '');
                        if (activeKey) {
                            const activeMessages = activeSession.value.messages;
                            if (Array.isArray(activeMessages)) {
                                const sessionIndex = store.sessions.value.findIndex(s => {
                                    const sKey = String(s.key || s.id || '');
                                    return sKey === activeKey;
                                });
                                if (sessionIndex !== -1) {
                                    // 更新 store.sessions 中对应会话的 messages
                                    store.sessions.value[sessionIndex] = {
                                        ...store.sessions.value[sessionIndex],
                                        messages: activeMessages,
                                        updatedAt: activeSession.value.updatedAt || Date.now()
                                    };
                                    console.log('[useMethods] 已同步 activeSession 的消息到 store.sessions，消息数量:', activeMessages.length);
                                }
                            }
                        }
                    }

                    // 保存当前选中的文件Key（如果从文件视图切换到会话视图）
                    let pendingFileKey = null;
                    if (previousMode === 'tree' && mode === 'tags') {
                        if (selectedKey && selectedKey.value) {
                            pendingFileKey = selectedKey.value;
                            console.log('[useMethods] 保存当前选中的文件Key:', pendingFileKey);
                        }
                    }

                    // 保存当前选中的会话（如果从会话视图切换到文件视图）
                    let pendingSessionKey = null;
                    let pendingSessionMessages = null;
                    if (previousMode === 'tags' && mode === 'tree') {
                        // 优先使用 activeSession，否则使用 externalSelectedSessionKey
                        if (activeSession && activeSession.value) {
                            const sessionKey = activeSession.value.key;
                            if (sessionKey) {
                                pendingSessionKey = String(sessionKey);
                                // 保存当前的消息，以便后续使用
                                pendingSessionMessages = activeSession.value.messages;
                                console.log('[useMethods] 保存当前选中的会话Key:', pendingSessionKey, '消息数量:', pendingSessionMessages?.length || 0);
                            }
                        } else if (store.externalSelectedSessionKey && store.externalSelectedSessionKey.value) {
                            pendingSessionKey = String(store.externalSelectedSessionKey.value);
                            console.log('[useMethods] 保存当前选中的会话Key（从externalSelectedSessionKey）:', pendingSessionKey);
                        }
                    }

                    if (previousMode !== mode) {
                        try {
                            if (mode === 'tree' && typeof window.aicrApp?.abortSessionChatRequest === 'function') {
                                window.aicrApp.abortSessionChatRequest();
                            }
                        } catch (_) { }

                        // 只有在不是从会话视图切换到树形视图时才清空selectedKey
                        // 如果是从会话视图切换到树形视图，我们会在后面根据会话选中对应的文件
                        if (!(previousMode === 'tags' && mode === 'tree' && pendingSessionKey)) {
                            if (typeof setSelectedKey === 'function') {
                                setSelectedKey(null);
                            } else if (selectedKey) {
                                selectedKey.value = null;
                            }
                        }

                        // 只有在没有待处理的会话/文件时才清空会话状态
                        // 如果有待处理的会话/文件，保留当前状态以便后续同步
                        const hasPendingSync = (previousMode === 'tree' && mode === 'tags' && pendingFileKey) ||
                            (previousMode === 'tags' && mode === 'tree' && pendingSessionKey);
                        if (!hasPendingSync) {
                            if (activeSession) activeSession.value = null;
                            if (activeSessionError) activeSessionError.value = null;
                            if (activeSessionLoading) activeSessionLoading.value = false;
                            if (sessionChatInput) sessionChatInput.value = '';
                            if (sessionContextEditorVisible) sessionContextEditorVisible.value = false;
                            if (sessionContextDraft) sessionContextDraft.value = '';
                        }

                        window.dispatchEvent(new CustomEvent('clearCodeHighlight'));
                    }

                    // 如果切换到标签视图，自动加载会话数据
                    if (mode === 'tags') {
                        // 检查会话数据是否已存在，如果存在则不需要重新加载
                        const hasSessions = store.sessions && store.sessions.value && store.sessions.value.length > 0;

                        if (!hasSessions) {
                            console.log('[useMethods] 切换到标签视图，自动加载会话数据');

                            // 加载会话数据
                            if (loadSessions && typeof loadSessions === 'function') {
                                try {
                                    console.log('[useMethods] 开始加载会话数据...');
                                    await loadSessions(true);
                                    console.log('[useMethods] 会话数据加载完成');
                                } catch (error) {
                                    console.error('[useMethods] 加载会话数据失败:', error);
                                }
                            } else if (store.loadSessions && typeof store.loadSessions === 'function') {
                                try {
                                    console.log('[useMethods] 从 store 加载会话数据...');
                                    await store.loadSessions(true);
                                    console.log('[useMethods] 会话数据加载完成');
                                } catch (error) {
                                    console.error('[useMethods] 加载会话数据失败:', error);
                                }
                            }
                        } else {
                            console.log('[useMethods] 切换到标签视图，会话数据已存在，跳过加载');
                        }

                        // 如果有待处理的文件Key，尝试选中对应的会话
                        if (pendingFileKey) {
                            // 等待DOM更新完成
                            await new Promise(resolve => setTimeout(resolve, 100));

                            try {
                                // 从文件树中查找对应的sessionKey
                                const normalize = (v) => {
                                    if (!v) return '';
                                    let s = String(v).replace(/\\/g, '/');
                                    s = s.trim().replace(/\s+/g, '_');
                                    s = s.replace(/^\.\//, '');
                                    s = s.replace(/^\/+/, '');
                                    s = s.replace(/\/\/+/g, '/');
                                    return s;
                                };

                                const targetTreeKey = normalize(pendingFileKey);
                                let targetSessionKey = null;

                                // 在文件树中查找对应的sessionKey
                                const findSessionKeyByTreeKey = (nodes, treeKey) => {
                                    if (!nodes) return null;
                                    const stack = Array.isArray(nodes) ? [...nodes] : [nodes];
                                    while (stack.length > 0) {
                                        const n = stack.pop();
                                        if (!n) continue;
                                        const k = normalize(n.key || n.path || n.id || '');
                                        if (k && k === treeKey) {
                                            return n.sessionKey != null ? String(n.sessionKey) : null;
                                        }
                                        if (Array.isArray(n.children) && n.children.length > 0) {
                                            for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]);
                                        }
                                    }
                                    return null;
                                };

                                targetSessionKey = findSessionKeyByTreeKey(store.fileTree?.value, targetTreeKey);

                                if (targetSessionKey) {
                                    console.log('[useMethods] 找到对应的sessionKey:', targetSessionKey);

                                    // 在会话列表中查找对应的会话
                                    const sessions = store.sessions?.value || [];
                                    let targetSession = sessions.find(s => {
                                        const sessionKey = String(s.key || '');
                                        return sessionKey === targetSessionKey;
                                    });

                                    // 如果当前有 activeSession 且与目标会话相同，使用 activeSession 的 messages（保留最新聊天记录）
                                    if (targetSession && activeSession?.value) {
                                        const activeKey = String(activeSession.value.key || '');
                                        if (activeKey === targetSessionKey) {
                                            const activeMessages = activeSession.value.messages;
                                            if (Array.isArray(activeMessages) && activeMessages.length > 0) {
                                                console.log('[useMethods] 使用 activeSession 的最新 messages，数量:', activeMessages.length);
                                                targetSession = { ...targetSession, messages: activeMessages };
                                            }
                                        }
                                    }

                                    if (targetSession) {
                                        console.log('[useMethods] 找到对应的会话，准备选中并滚动:', targetSession.key);

                                        // 设置外部选中的会话Key（用于更新sessionList组件的选中状态）
                                        if (store.externalSelectedSessionKey) {
                                            store.externalSelectedSessionKey.value = targetSessionKey;
                                        }

                                        // 直接调用 selectSessionForChat 选择会话（确保调用 read-file 接口）
                                        await selectSessionForChat(targetSession, { toggleActive: false, openContextEditor: false });

                                        // 等待DOM更新后滚动到位置
                                        await new Promise(resolve => setTimeout(resolve, 200));

                                        // 滚动到对应的会话项
                                        const sessionKey = targetSession.key;
                                        const sessionItem = document.querySelector(`.session-item[data-key="${sessionKey}"], .session-item[data-session-key="${sessionKey}"]`);

                                        if (sessionItem) {
                                            // 滚动到会话项位置
                                            sessionItem.scrollIntoView({ behavior: 'smooth', block: 'center' });

                                            // 添加高亮效果
                                            sessionItem.classList.add('highlight-session');
                                            setTimeout(() => {
                                                sessionItem.classList.remove('highlight-session');
                                            }, 2000);

                                            console.log('[useMethods] 已滚动到会话位置:', sessionKey);
                                        } else {
                                            // 如果通过data-key没找到，尝试通过标题匹配（作为备选方案）
                                            console.warn('[useMethods] 未找到会话项，尝试通过标题匹配');
                                            const sessionItems = document.querySelectorAll('.session-item');
                                            for (const item of sessionItems) {
                                                const titleElement = item.querySelector('.session-title-text');
                                                if (titleElement && targetSession.title) {
                                                    const itemTitle = titleElement.textContent?.trim();
                                                    const targetTitle = targetSession.title?.trim();
                                                    if (itemTitle === targetTitle) {
                                                        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        item.classList.add('highlight-session');
                                                        setTimeout(() => {
                                                            item.classList.remove('highlight-session');
                                                        }, 2000);
                                                        console.log('[useMethods] 已滚动到会话位置（通过标题匹配）');
                                                        break;
                                                    }
                                                }
                                            }
                                        }

                                        // 清理外部选中的会话Key（延迟清理，确保组件已更新）
                                        setTimeout(() => {
                                            if (store.externalSelectedSessionKey) {
                                                store.externalSelectedSessionKey.value = null;
                                            }
                                        }, 1000);
                                    } else {
                                        console.warn('[useMethods] 未找到对应的会话，sessionKey:', targetSessionKey);
                                    }
                                } else {
                                    console.warn('[useMethods] 未找到对应的sessionKey，文件Key:', pendingFileKey);
                                }
                            } catch (error) {
                                console.error('[useMethods] 选中对应会话失败:', error);
                            }
                        }
                    }

                    // 如果切换到树形视图，尝试选中对应的文件
                    if (mode === 'tree' && pendingSessionKey) {
                        // 等待DOM更新完成
                        await new Promise(resolve => setTimeout(resolve, 100));

                        try {
                            // 在文件树中查找对应的文件节点
                            const findNodeBySessionKey = (nodes, targetSessionKey) => {
                                if (!nodes) return null;
                                const stack = Array.isArray(nodes) ? [...nodes] : [nodes];
                                while (stack.length > 0) {
                                    const n = stack.pop();
                                    if (!n) continue;
                                    if (n.type === 'file') {
                                        const nodeSessionKey = String(n.sessionKey || '');
                                        if (nodeSessionKey === targetSessionKey) {
                                            return n;
                                        }
                                    }
                                    if (Array.isArray(n.children) && n.children.length > 0) {
                                        for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]);
                                    }
                                }
                                return null;
                            };

                            const targetNode = findNodeBySessionKey(store.fileTree?.value, pendingSessionKey);

                            if (targetNode && targetNode.key) {
                                const targetFileKey = targetNode.key;
                                console.log('[useMethods] 找到对应的文件节点，准备选中并滚动:', targetFileKey);

                                // 展开所有父文件夹，确保文件可见
                                const expandParentFolders = (nodes, targetKey) => {
                                    if (!nodes) return false;
                                    const stack = Array.isArray(nodes) ? [...nodes] : [nodes];
                                    const path = [];

                                    const findPath = (nodeList, target, currentPath = []) => {
                                        for (const node of nodeList) {
                                            if (!node) continue;
                                            const nodeKey = node.key || '';

                                            if (node.type === 'file' && nodeKey === target) {
                                                return [...currentPath];
                                            }

                                            if (node.type === 'folder' && node.children) {
                                                const newPath = [...currentPath, nodeKey];
                                                const found = findPath(node.children, target, newPath);
                                                if (found) return found;
                                            }
                                        }
                                        return null;
                                    };

                                    const folderPath = findPath(stack, targetKey);
                                    if (folderPath && folderPath.length > 0) {
                                        folderPath.forEach(folderKey => {
                                            if (expandedFolders && !expandedFolders.value.has(folderKey)) {
                                                if (typeof toggleFolder === 'function') {
                                                    toggleFolder(folderKey);
                                                } else if (expandedFolders.value instanceof Set) {
                                                    expandedFolders.value.add(folderKey);
                                                }
                                            }
                                        });
                                    }
                                };

                                // 展开父文件夹
                                expandParentFolders(store.fileTree?.value, targetFileKey);

                                // 选中文件
                                if (typeof setSelectedKey === 'function') {
                                    setSelectedKey(targetFileKey);
                                } else if (selectedKey) {
                                    selectedKey.value = targetFileKey;
                                }

                                // 调用 loadFileByKey 确保 read-file 接口被调用
                                if (typeof loadFileByKey === 'function') {
                                    try {
                                        console.log('[useMethods] 调用 loadFileByKey 加载文件内容:', targetFileKey);
                                        await loadFileByKey(targetFileKey);
                                    } catch (error) {
                                        console.warn('[useMethods] loadFileByKey 调用失败:', error);
                                    }
                                }

                                // 等待DOM更新后滚动到位置
                                await new Promise(resolve => setTimeout(resolve, 300));

                                // 滚动到对应的文件项
                                const normalize = (v) => {
                                    if (!v) return '';
                                    let s = String(v).replace(/\\/g, '/');
                                    s = s.trim().replace(/\s+/g, '_');
                                    s = s.replace(/^\.\//, '');
                                    s = s.replace(/^\/+/, '');
                                    s = s.replace(/\/\/+/g, '/');
                                    return s;
                                };

                                const normalizedTargetKey = normalize(targetFileKey);

                                // 优先通过 data-key 属性查找
                                const fileItem = document.querySelector(`.file-tree-item.file-item[data-key="${targetFileKey}"], .file-tree-item.file-item[data-file-key="${targetFileKey}"]`);

                                if (fileItem) {
                                    // 滚动到文件项位置
                                    fileItem.scrollIntoView({ behavior: 'smooth', block: 'center' });

                                    // 添加高亮效果
                                    fileItem.classList.add('highlight-file');
                                    setTimeout(() => {
                                        fileItem.classList.remove('highlight-file');
                                    }, 2000);

                                    console.log('[useMethods] 已滚动到文件位置:', targetFileKey);
                                } else {
                                    // 如果通过data-key没找到，尝试通过文件名匹配（作为备选方案）
                                    console.warn('[useMethods] 未找到文件项，尝试通过文件名匹配');
                                    const fileItems = document.querySelectorAll('.file-tree-item.file-item');
                                    for (const item of fileItems) {
                                        const fileNameElement = item.querySelector('.file-name');
                                        if (fileNameElement) {
                                            const itemName = fileNameElement.textContent?.trim();
                                            const targetName = targetNode.name || targetFileKey.split('/').pop();
                                            if (itemName === targetName) {
                                                // 进一步验证：检查data-session-key是否匹配
                                                const itemSessionKey = item.getAttribute('data-session-key');
                                                if (!itemSessionKey || itemSessionKey === pendingSessionKey) {
                                                    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    item.classList.add('highlight-file');
                                                    setTimeout(() => {
                                                        item.classList.remove('highlight-file');
                                                    }, 2000);
                                                    console.log('[useMethods] 已滚动到文件位置（通过文件名匹配）:', targetFileKey);
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                console.warn('[useMethods] 未找到对应的文件节点，sessionKey:', pendingSessionKey);
                            }
                        } catch (error) {
                            console.error('[useMethods] 选中对应文件失败:', error);
                        }
                    }

                    setTimeout(() => {
                        try {
                            const sidebar = document.querySelector('.aicr-sidebar');
                            if (!sidebar) return;
                            if (mode === 'tags') {
                                const w = store.sessionSidebarWidth?.value;
                                if (typeof w === 'number' && w > 0) sidebar.style.width = `${w}px`;
                            } else {
                                const w = store.sidebarWidth?.value;
                                if (typeof w === 'number' && w > 0) sidebar.style.width = `${w}px`;
                            }
                        } catch (_) { }
                    }, 0);
                }
            }, '视图模式切换');
        },

        // 从会话视图返回文件树视图
        handleSessionViewBack: () => {
            return safeExecute(() => {
                console.log('[useMethods] 从会话视图返回文件树视图');
                try {
                    if (typeof window.aicrApp?.abortSessionChatRequest === 'function') {
                        window.aicrApp.abortSessionChatRequest();
                    }
                } catch (_) { }
                if (viewMode) {
                    viewMode.value = 'tree';
                }

                if (typeof setSelectedKey === 'function') {
                    setSelectedKey(null);
                } else if (selectedKey) {
                    selectedKey.value = null;
                }

                if (activeSession) activeSession.value = null;
                if (activeSessionError) activeSessionError.value = null;
                if (activeSessionLoading) activeSessionLoading.value = false;
                if (sessionChatInput) sessionChatInput.value = '';
                if (sessionContextEditorVisible) sessionContextEditorVisible.value = false;
                if (sessionContextDraft) sessionContextDraft.value = '';

                window.dispatchEvent(new CustomEvent('clearCodeHighlight'));

                setTimeout(() => {
                    try {
                        const sidebar = document.querySelector('.aicr-sidebar');
                        const w = store.sidebarWidth?.value;
                        if (sidebar && typeof w === 'number' && w > 0) sidebar.style.width = `${w}px`;
                    } catch (_) { }
                }, 0);
            }, '返回文件树视图');
        },

        // 切换会话批量选择模式
        toggleSessionBatchMode: () => {
            return safeExecute(() => {
                if (sessionBatchMode) {
                    sessionBatchMode.value = !sessionBatchMode.value;
                    if (!sessionBatchMode.value && selectedSessionKeys) {
                        selectedSessionKeys.value.clear();
                    }
                    console.log('[useMethods] 会话批量选择模式:', sessionBatchMode.value);
                }
            }, '切换会话批量选择模式');
        },

        // 切换会话选择状态（批量选择）
        toggleSessionSelection: (sessionKey) => {
            return safeExecute(() => {
                if (!selectedSessionKeys || !selectedSessionKeys.value) {
                    console.warn('[useMethods] selectedSessionKeys 未初始化');
                    return;
                }

                if (selectedSessionKeys.value.has(sessionKey)) {
                    selectedSessionKeys.value.delete(sessionKey);
                } else {
                    selectedSessionKeys.value.add(sessionKey);
                }
                console.log('[useMethods] 会话选择状态已切换:', sessionKey, '选中数量:', selectedSessionKeys.value.size);
            }, '切换会话选择状态');
        },

        // 全选/取消全选会话
        toggleSelectAllSessions: (ids, isSelect) => {
            return safeExecute(() => {
                if (!store.sessions || !store.sessions.value || !Array.isArray(store.sessions.value)) {
                    console.warn('[useMethods] 会话列表为空');
                    return;
                }

                if (!selectedSessionKeys || !selectedSessionKeys.value) {
                    console.warn('[useMethods] selectedSessionKeys 未初始化');
                    return;
                }

                // 如果传入了 ids，使用 ids，否则使用所有会话
                let targetSessions = [];
                if (ids && Array.isArray(ids) && ids.length > 0) {
                    targetSessions = store.sessions.value.filter(s => ids.includes(s.key));
                } else {
                    targetSessions = store.sessions.value;
                }

                if (targetSessions.length === 0) {
                    return;
                }

                // 如果 explicit isSelect provided, use it
                // If not provided (undefined), toggle based on current state (legacy behavior)
                let shouldSelect = isSelect;

                if (typeof shouldSelect !== 'boolean') {
                    // Legacy toggle logic
                    const allSelected = targetSessions.every(session => selectedSessionKeys.value.has(session.key));
                    shouldSelect = !allSelected;
                }

                if (shouldSelect) {
                    // 全选
                    targetSessions.forEach(session => {
                        selectedSessionKeys.value.add(session.key);
                    });
                    console.log('[useMethods] 已全选，选中数量:', targetSessions.length);
                } else {
                    // 取消全选
                    targetSessions.forEach(session => {
                        selectedSessionKeys.value.delete(session.key);
                    });
                    console.log('[useMethods] 已取消全选，取消数量:', targetSessions.length);
                }
            }, '全选/取消全选会话');
        },

        // 处理会话导入（触发文件选择对话框）
        handleSessionImport: () => {
            return safeExecute(() => {
                // 直接查找文件输入框并触发点击
                const importInput = document.querySelector('input[type="file"][accept=".json,.zip"]');
                if (importInput) {
                    importInput.click();
                } else {
                    console.warn('[useMethods] 未找到导入文件输入框');
                    // 尝试通过 ref 查找
                    if (window.aicrApp && window.aicrApp.$refs && window.aicrApp.$refs.sessionImportInput) {
                        window.aicrApp.$refs.sessionImportInput.click();
                    }
                }
            }, '触发会话导入');
        },

        // 处理会话导入文件
        handleSessionImportFile: async (event) => {
            return safeExecuteAsync(async () => {
                const file = event.target?.files?.[0];
                if (!file) {
                    console.warn('[useMethods] 未选择文件');
                    return;
                }

                console.log('[useMethods] 导入会话文件:', file.name);

                const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/ui/loading.js');
                showGlobalLoading('正在导入会话...');

                try {
                    const fileContent = await file.text();
                    let sessionsData = [];

                    // 解析文件内容
                    if (file.name.endsWith('.json')) {
                        sessionsData = JSON.parse(fileContent);
                        if (!Array.isArray(sessionsData)) {
                            sessionsData = [sessionsData];
                        }
                    } else if (file.name.endsWith('.zip')) {
                        // 处理 ZIP 文件
                        const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')).default || window.JSZip;
                        const zip = await JSZip.loadAsync(file);
                        const fileNames = Object.keys(zip.files);

                        for (const fileName of fileNames) {
                            if (fileName.endsWith('.json')) {
                                const content = await zip.files[fileName].async('string');
                                const data = JSON.parse(content);
                                if (Array.isArray(data)) {
                                    sessionsData.push(...data);
                                } else {
                                    sessionsData.push(data);
                                }
                            }
                        }
                    }

                    console.log('[useMethods] 导入会话');

                    // 导入会话到服务器
                    const { postData } = await import('/src/services/index.js');
                    let successCount = 0;
                    let failCount = 0;

                    // 从文件路径提取标签的辅助函数（与 sessionSyncService 保持一致）
                    const extractTagsFromPath = (filePath) => {
                        if (!filePath) return [];
                        const parts = filePath.split('/').filter(p => p && p.trim());
                        if (parts.length <= 1) return [];
                        // 移除文件名，只保留目录路径作为标签
                        const dirs = parts.slice(0, -1);
                        return dirs;
                    };

                    for (const session of sessionsData) {
                        try {
                            // 确保 tags 字段存在且为数组
                            if (!session.tags || !Array.isArray(session.tags)) {
                                session.tags = [];
                            }

                            // 规范化标签：去除空值和无效值，trim处理
                            session.tags = session.tags
                                .map(tag => (typeof tag === 'string' ? tag.trim() : String(tag || '').trim()))
                                .filter(tag => tag.length > 0);

                            // 如果标签为空，尝试从 pageDescription 中提取路径并生成标签
                            if (session.tags.length === 0 && session.pageDescription) {
                                const pathMatch = session.pageDescription.match(/文件[：:]\s*(.+)/);
                                if (pathMatch && pathMatch[1]) {
                                    const filePath = pathMatch[1].trim();
                                    const extractedTags = extractTagsFromPath(filePath);

                                    // 如果从路径提取到标签，使用这些标签
                                    if (extractedTags.length > 0) {
                                        session.tags = extractedTags;
                                        console.log('[useMethods] 从 pageDescription 提取标签:', session.key, extractedTags);
                                    }

                                }
                                // 无法从 pageDescription 提取路径，标签保持为空
                            }

                            // 确保 "knowledge" 标签是第一个标签
                            const knowledgeTag = 'knowledge';
                            // 移除所有已存在的 knowledge 标签（无论位置）
                            session.tags = session.tags.filter(tag => tag !== knowledgeTag);
                            // 在开头添加 knowledge 标签
                            session.tags.unshift(knowledgeTag);

                            // 确保 tags 数组被正确设置（防止被覆盖）
                            if (!Array.isArray(session.tags) || session.tags.length === 0 || session.tags[0] !== knowledgeTag) {
                                console.warn('[useMethods] 标签数组异常，重新设置:', session.key, session.tags);
                                session.tags = [knowledgeTag, ...session.tags.filter(tag => tag !== knowledgeTag)];
                            }

                            console.log('[useMethods] 确保 knowledge 标签在第一个位置:', session.key, session.tags);

                            // 确保保存时包含完整的 tags 数组
                            const sessionToSave = {
                                ...session,
                                tags: session.tags // 明确设置 tags 字段
                            };

                            // 检查会话是否存在
                            const checkUrl = buildServiceUrl('query_documents', {
                                cname: 'sessions',
                                filter: { id: sessionToSave.key },
                                limit: 1
                            });
                            const checkResp = await getData(checkUrl, {}, false);
                            const existingItem = checkResp?.data?.list?.[0];

                            let savePayload;
                            if (existingItem) {
                                savePayload = {
                                    module_name: SERVICE_MODULE,
                                    method_name: 'update_document',
                                    parameters: {
                                        cname: 'sessions',
                                        id: existingItem.id,
                                        data: sessionToSave
                                    }
                                };
                            } else {
                                savePayload = {
                                    module_name: SERVICE_MODULE,
                                    method_name: 'create_document',
                                    parameters: {
                                        cname: 'sessions',
                                        data: sessionToSave
                                    }
                                };
                            }

                            await postData(`${window.API_URL}/`, savePayload);
                            successCount++;
                        } catch (error) {
                            console.error('[useMethods] 导入会话失败:', session.key, error);
                            failCount++;
                        }
                    }

                    // 刷新会话列表
                    if (loadSessions && typeof loadSessions === 'function') {
                        await loadSessions(true);
                    }

                    hideGlobalLoading();

                    if (window.showSuccess) {
                        window.showSuccess(`导入完成：成功 ${successCount} 个，失败 ${failCount} 个`);
                    }
                } catch (error) {
                    hideGlobalLoading();
                    console.error('[useMethods] 导入会话文件失败:', error);
                    if (window.showError) {
                        window.showError(`导入失败：${error.message || '未知错误'}`);
                    }
                }
            }, '处理会话导入文件');
        },

        // 处理会话导出
        handleSessionExport: async () => {
            return safeExecuteAsync(async () => {
                if (!store.sessions || !store.sessions.value || store.sessions.value.length === 0) {
                    console.warn('[useMethods] 没有可导出的会话');
                    if (window.showError) {
                        window.showError('没有可导出的会话');
                    }
                    return;
                }

                console.log('[useMethods] 导出会话，数量:', store.sessions.value.length);

                const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/ui/loading.js');
                showGlobalLoading('正在导出会话...');

                try {
                    // 确定要导出的会话
                    let sessionsToExport = [];
                    if (sessionBatchMode && sessionBatchMode.value && selectedSessionKeys && selectedSessionKeys.value.size > 0) {
                        // 批量导出选中的会话
                        sessionsToExport = store.sessions.value.filter(s => selectedSessionKeys.value.has(s.key));
                    } else {
                        // 导出所有会话
                        sessionsToExport = store.sessions.value;
                    }

                    if (sessionsToExport.length === 0) {
                        hideGlobalLoading();
                        if (window.showError) {
                            window.showError('请先选择要导出的会话');
                        }
                        return;
                    }

                    // 生成导出数据
                    const exportData = {
                        version: '1.0',
                        exportTime: new Date().toISOString(),
                        count: sessionsToExport.length,
                        sessions: sessionsToExport
                    };

                    // 创建 JSON 文件并下载
                    const jsonStr = JSON.stringify(exportData, null, 2);
                    const blob = new Blob([jsonStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `sessions_export_${new Date().toISOString().slice(0, 10)}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    hideGlobalLoading();

                    if (window.showSuccess) {
                        window.showSuccess(`成功导出 ${sessionsToExport.length} 个会话`);
                    }
                } catch (error) {
                    hideGlobalLoading();
                    console.error('[useMethods] 导出会话失败:', error);
                    if (window.showError) {
                        window.showError(`导出失败：${error.message || '未知错误'}`);
                    }
                }
            }, '处理会话导出');
        },

        // 批量删除会话（参考 YiPet 的实现）
        handleBatchDeleteSessions: async () => {
            return safeExecuteAsync(async () => {
                if (!selectedSessionKeys || !selectedSessionKeys.value || selectedSessionKeys.value.size === 0) {
                    if (window.showError) {
                        window.showError('请先选择要删除的会话');
                    }
                    return;
                }

                // 检查并过滤掉树文件类型的会话
                const sessionKeys = Array.from(selectedSessionKeys.value);
                const treeFileSessionKeys = [];
                const allowedSessionKeys = [];

                // 从会话列表中检查每个会话
                if (store.sessions && store.sessions.value && Array.isArray(store.sessions.value)) {
                    for (const sessionKey of sessionKeys) {
                        const session = store.sessions.value.find(s => s && s.key === sessionKey);
                        if (session && session.url && String(session.url).startsWith('aicr-session://')) {
                            treeFileSessionKeys.push(sessionKey);
                        } else {
                            allowedSessionKeys.push(sessionKey);
                        }
                    }
                } else {
                    // 如果无法从列表获取，尝试获取完整会话信息
                    const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                    const sessionSync = getSessionSyncService();
                    for (const sessionKey of sessionKeys) {
                        try {
                            const session = await sessionSync.getSession(sessionKey);
                            if (session && session.url && String(session.url).startsWith('aicr-session://')) {
                                treeFileSessionKeys.push(sessionKey);
                            } else {
                                allowedSessionKeys.push(sessionKey);
                            }
                        } catch (e) {
                            // 获取失败，允许删除（可能是其他类型的会话）
                            allowedSessionKeys.push(sessionKey);
                        }
                    }
                }

                // 如果有树文件类型的会话，提示用户
                if (treeFileSessionKeys.length > 0) {
                    if (window.showError) {
                        window.showError(`不允许在会话视图删除树文件类型的会话（已过滤 ${treeFileSessionKeys.length} 个）`);
                    }
                    // 从选中列表中移除树文件类型的会话
                    for (const treeSessionKey of treeFileSessionKeys) {
                        if (selectedSessionKeys && selectedSessionKeys.value) {
                            selectedSessionKeys.value.delete(treeSessionKey);
                        }
                    }
                    // 如果没有可删除的会话，直接返回
                    if (allowedSessionKeys.length === 0) {
                        return;
                    }
                }

                const count = allowedSessionKeys.length;
                const confirmMessage = `确定要删除选中的 ${count} 个会话吗？此操作不可撤销。`;
                if (!confirm(confirmMessage)) {
                    return;
                }

                const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/ui/loading.js');
                showGlobalLoading(`正在删除 ${count} 个会话...`);

                try {
                    // 使用标准服务接口逐个删除（只删除允许删除的会话）
                    let deletedCount = 0;
                    let failedCount = 0;

                    // 获取 SessionSyncService 实例
                    let sessionSync;
                    try {
                        const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                        sessionSync = getSessionSyncService();
                    } catch (e) {
                        console.error('[useMethods] 无法加载 SessionSyncService:', e);
                        throw new Error('服务加载失败');
                    }

                    for (const skey of allowedSessionKeys) {
                        try {
                            // 直接使用 sessionKey 调用 deleteSession，确保与 session.key 一致
                            await sessionSync.deleteSession(skey);
                            deletedCount++;
                        } catch (e) {
                            console.error(`[useMethods] 删除会话失败: ${skey}`, e);
                            failedCount++;
                        }
                    }

                    if (deletedCount > 0) {
                        // 清空选中状态
                        if (selectedSessionKeys) {
                            selectedSessionKeys.value.clear();
                        }

                        // 退出批量模式
                        if (sessionBatchMode) {
                            sessionBatchMode.value = false;
                        }

                        // 刷新会话列表
                        if (loadSessions && typeof loadSessions === 'function') {
                            await loadSessions(true);
                        } else if (store && store.loadSessions && typeof store.loadSessions === 'function') {
                            await store.loadSessions(true);
                        }

                        hideGlobalLoading();

                        if (window.showSuccess) {
                            let successMessage = `已成功删除 ${deletedCount} 个会话`;
                            if (treeFileSessionKeys.length > 0) {
                                successMessage += `（已跳过 ${treeFileSessionKeys.length} 个树文件类型的会话）`;
                            }
                            if (failedCount > 0) {
                                successMessage += `，其中 ${failedCount} 个删除失败`;
                            }
                            window.showSuccess(successMessage);
                        }
                    } else {
                        throw new Error('批量删除失败');
                    }
                } catch (error) {
                    hideGlobalLoading();
                    console.error('[useMethods] 批量删除会话失败:', error);
                    if (window.showError) {
                        window.showError(`批量删除失败：${error.message || '未知错误'}`);
                    }
                }
            }, '批量删除会话');
        },

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

        // 切换批量选择模式
        toggleSessionBatchMode: () => {
            return safeExecute(() => {
                if (store.sessionBatchMode) {
                    store.sessionBatchMode.value = !store.sessionBatchMode.value;
                    if (!store.sessionBatchMode.value && store.selectedSessionKeys) {
                        store.selectedSessionKeys.value.clear();
                    }
                }
            }, '切换批量选择模式');
        },

        // 导出会话
        handleSessionExport: async () => {
            return safeExecute(async () => {
                if (!store.sessions || !store.sessions.value || store.sessions.value.length === 0) {
                    alert('没有可导出的会话');
                    return;
                }

                try {
                    const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/ui/loading.js');
                    showGlobalLoading('正在导出会话...');

                    const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')).default || window.JSZip || (await import('jszip')).default;
                    const zip = new JSZip();

                    // 导出所有会话为 JSON 文件
                    store.sessions.value.forEach(session => {
                        let fileName = session.title || 'Untitled';
                        fileName = String(fileName).trim().replace(/\s+/g, '_').replace(/[\\/:*?"<>|]/g, '_');
                        const content = JSON.stringify(session, null, 2);
                        zip.file(`${fileName}.json`, content);
                    });

                    const content = await zip.generateAsync({ type: 'blob' });
                    const url = URL.createObjectURL(content);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `sessions_export_${new Date().toISOString().slice(0, 10)}.zip`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);

                    hideGlobalLoading();
                    if (window.showSuccess) window.showSuccess('导出成功');
                } catch (error) {
                    console.error('导出失败:', error);
                    // hideGlobalLoading();
                    alert('导出失败: ' + error.message);
                }
            }, '导出会话');
        },

        // 导入会话文件
        handleSessionImportFile: async (event) => {
            return safeExecute(async () => {
                const file = event.target.files[0];
                if (!file) return;

                try {
                    const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/ui/loading.js');
                    showGlobalLoading('正在导入会话...');

                    const sessionSync = (await import('/src/services/aicr/sessionSyncService.js')).getSessionSyncService();

                    if (file.name.endsWith('.json')) {
                        const text = await file.text();
                        const sessionData = JSON.parse(text);

                        await sessionSync.syncFileToSession({
                            name: file.name,
                            content: JSON.stringify(sessionData),
                            type: 'file'
                        }, false, true); // isUpdate=false, isImport=true
                    } else if (file.name.endsWith('.zip')) {
                        const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')).default || window.JSZip || (await import('jszip')).default;
                        const zip = await JSZip.loadAsync(file);

                        const promises = [];
                        zip.forEach((relativePath, zipEntry) => {
                            if (!zipEntry.dir && zipEntry.name.endsWith('.json')) {
                                promises.push(async () => {
                                    const text = await zipEntry.async('string');
                                    try {
                                        // verify json
                                        JSON.parse(text);
                                        await sessionSync.syncFileToSession({
                                            name: zipEntry.name.split('/').pop(),
                                            content: text,
                                            type: 'file'
                                        }, false, true);
                                    } catch (e) {
                                        console.warn('Skipping invalid JSON:', zipEntry.name);
                                    }
                                });
                            }
                        });

                        await Promise.all(promises.map(p => p()));
                    }

                    if (store.loadSessions) {
                        await store.loadSessions(true);
                    }
                    hideGlobalLoading();
                    if (window.showSuccess) window.showSuccess('导入成功');
                } catch (e) {
                    console.error(e);
                    alert('导入失败: ' + e.message);
                }
            }, '导入会话文件');
        },

        // 标签管理
        openTagManager: openTagManagerExternal,
        closeTagManager: closeTagManagerExternal
    };
};
