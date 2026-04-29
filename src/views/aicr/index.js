/**
 * 代码审查页面主入口
 * author: liangliang
 */
import { createStore } from '/src/views/aicr/hooks/store.js';
import { useComputed } from '/src/views/aicr/hooks/useComputed.js';
import { useMethods } from '/src/views/aicr/hooks/useMethods.js';
import { createMainPageMethods } from '/src/views/aicr/hooks/mainPageMethods.js';
import { createBaseView } from '/cdn/utils/view/baseView.js';
import { logInfo, logWarn, logError } from '/cdn/utils/core/log.js';
import { setupBrowserExtensionErrorFilter } from '/cdn/utils/core/error.js';
import { createSidebarResizers } from '/src/views/aicr/utils/resizer.js';
import { setupAicrEventListeners } from '/src/views/aicr/utils/listenerManager.js';

// 创建代码审查页面应用
(async function initAicrApp() {
    try {
        // 在外部创建 store，以便在 onMounted 中访问
        const store = createStore();

        const app = await createBaseView({
            createStore: () => store,
            useComputed,
            useMethods,
            components: [
                'AicrPage',
                'AicrHeader',
                'AicrSidebar',
                'AicrCodeArea',
                'AicrModals',
                'YiModal',
                'YiLoading',
                'YiEmptyState',
                'YiErrorState',
                'YiIconButton',
                'YiButton',
                'YiTag',
                'YiSelect',
                'SearchHeader',
                'FileTree',
                'CodeView',
                'MarkdownView',
                'KeyboardShortcutsHelp',
                'SkeletonLoader',
                'AiModelSelector',
                'SessionListTags',
            ],
            componentModules: [
                '/src/views/aicr/components/aicrPage/index.js',
                '/src/views/aicr/components/aicrHeader/index.js',
                '/src/views/aicr/components/aicrSidebar/index.js',
                '/src/views/aicr/components/aicrCodeArea/index.js',
                '/src/views/aicr/components/aicrModals/index.js',
                '/cdn/components/common/modals/YiModal/index.js',
                '/cdn/components/common/loaders/YiLoading/index.js',
                '/cdn/components/common/feedback/YiEmptyState/index.js',
                '/cdn/components/common/feedback/YiErrorState/index.js',
                '/cdn/components/common/buttons/YiIconButton/index.js',
                '/cdn/components/common/buttons/YiButton/index.js',
                '/cdn/components/common/tags/YiTag/index.js',
                '/cdn/components/common/forms/YiSelect/index.js',
                '/cdn/components/business/SearchHeader/index.js',
                '/src/views/aicr/components/fileTree/index.js',
                '/src/views/aicr/components/codeView/index.js',
                '/cdn/components/business/MarkdownView/index.js',
                '/src/views/aicr/components/keyboardShortcutsHelp/index.js',
                '/cdn/components/business/SkeletonLoader/index.js',
                '/src/views/aicr/components/AiModelSelector/index.js',
                '/src/views/aicr/components/sessionListTags/index.js'
            ],
            data: {
                // 暴露store数据给模板
                sidebarCollapsed: store.sidebarCollapsed,
                sidebarWidth: store.sidebarWidth,
                chatPanelCollapsed: store.chatPanelCollapsed,
                chatPanelWidth: store.chatPanelWidth,
                // 项目管理 - Removed
                // projects: store.projects,
                // selectedProject: store.selectedProject,

                // 搜索相关状态
                searchQuery: store.searchQuery,
                // 批量选择相关状态
                batchMode: store.batchMode,
                selectedKeys: store.selectedKeys,
                // 视图模式
                viewMode: store.viewMode,
                // 会话列表相关状态
                sessions: store.sessions,
                sessionLoading: store.sessionLoading,
                sessionError: store.sessionError,
                selectedSessionTags: store.selectedSessionTags,
                sessionSearchQuery: store.sessionSearchQuery,
                // 会话右侧面板（聊天）状态
                activeSession: store.activeSession,
                activeSessionLoading: store.activeSessionLoading,
                activeSessionError: store.activeSessionError,
                sessionChatInput: store.sessionChatInput,
                sessionChatSending: store.sessionChatSending,
                sessionContextEnabled: store.sessionContextEnabled,
                sessionContextEditorVisible: store.sessionContextEditorVisible,
                sessionContextDraft: store.sessionContextDraft,
                sessionContextMode: store.sessionContextMode,
                sessionContextUndoVisible: store.sessionContextUndoVisible,
                sessionMessageEditorVisible: store.sessionMessageEditorVisible,
                sessionMessageEditorDraft: store.sessionMessageEditorDraft,
                sessionMessageEditorMode: store.sessionMessageEditorMode,
                sessionMessageEditorIndex: store.sessionMessageEditorIndex,
                // 标签过滤相关状态
                tagFilterReverse: store.tagFilterReverse,
                tagFilterNoTags: store.tagFilterNoTags,
                tagFilterExpanded: store.tagFilterExpanded,
                tagFilterVisibleCount: store.tagFilterVisibleCount,
                tagFilterSearchKeyword: store.tagFilterSearchKeyword,
                // 会话批量选择相关状态
                sessionBatchMode: store.sessionBatchMode,
                selectedSessionKeys: store.selectedSessionKeys,
                externalSelectedSessionKey: store.externalSelectedSessionKey,
                sessionEditVisible: store.sessionEditVisible,
                sessionEditKey: store.sessionEditKey,
                sessionEditTitle: store.sessionEditTitle,
                sessionEditUrl: store.sessionEditUrl,
                sessionEditDescription: store.sessionEditDescription,
                sessionEditGenerating: store.sessionEditGenerating,
                // 模型选择相关状态
                availableModels: store.availableModels,
                modelsLoading: store.modelsLoading,
                modelsError: store.modelsError,
            },
            onMounted: (mountedApp) => {
                logInfo('[代码审查页面] 应用已挂载');

                // 加载侧边栏宽度
                if (store && store.loadSidebarWidths) {
                    store.loadSidebarWidths();
                }

                if (store && store.loadChatPanelSettings) {
                    store.loadChatPanelSettings();
                }

                // 监听 activeSession 变化，绑定 welcome-card 事件
                if (store && store.activeSession && mountedApp) {
                    // 使用 setInterval 定期检查并绑定事件（简单但有效的方法）
                    const bindWelcomeCardEventsInterval = setInterval(() => {
                        try {
                            const welcomeCard = document.querySelector('[data-welcome-message]');
                            if (welcomeCard && mountedApp.bindWelcomeCardEvents) {
                                // 检查是否已经绑定过事件（通过检查是否有 data-events-bound 属性）
                                if (!welcomeCard.hasAttribute('data-events-bound')) {
                                    mountedApp.bindWelcomeCardEvents(welcomeCard);
                                    welcomeCard.setAttribute('data-events-bound', 'true');
                                }
                            }
                        } catch (e) {
                            // 忽略错误，继续运行
                        }
                    }, 500);

                    // 清理定时器
                    window.addEventListener('beforeunload', () => {
                        clearInterval(bindWelcomeCardEventsInterval);
                    });
                }

                // 调试：检查会话相关状态
                logInfo('[代码审查页面] 会话相关状态检查:', {
                    hasSessions: !!store.sessions,
                    sessionsValue: store.sessions?.value,
                    hasLoadSessions: typeof store.loadSessions === 'function',
                    viewMode: store.viewMode?.value
                });

                // 创建侧边栏拖拽条
                setTimeout(() => {
                    createSidebarResizers(store);
                    // 监听侧边栏折叠状态，隐藏/显示拖拽条
                    if (store.sidebarCollapsed) {
                        store.sidebarCollapsed.value = store.sidebarCollapsed.value; // 触发响应式更新
                    }
                }, 500);

                if (store) {
                    // 首先加载会话列表，然后构建全局文件树
                    store.loadSessions().then(() => {
                        // 加载文件树和文件数据
                        // 初始加载时使用 forceClear: true，因为初始时没有数据
                        return Promise.all([
                            store.loadFileTree(true),
                            store.loadFiles()
                        ]).then(() => {
                            // 如果URL带了key，尝试预选并按需加载
                            const params2 = new URLSearchParams(window.location.search);

                            // 处理 tag 参数
                            const tagParam = params2.get('tag');
                            if (tagParam) {
                                logInfo('[代码审查] URL触发标签选中', tagParam);
                                if (store.selectedSessionTags) {
                                    store.selectedSessionTags.value = [tagParam];
                                }
                            }

                            const fileParam = params2.get('key');
                            // 读取高亮范围（兼容旧参数）
                            const startLineParam = parseInt(params2.get('startLine'), 10);
                            const endLineParamRaw = params2.get('endLine');
                            const endLineParam = endLineParamRaw !== null ? parseInt(endLineParamRaw, 10) : NaN;
                            let pendingHighlightRange = null;
                            if (Number.isFinite(startLineParam)) {
                                pendingHighlightRange = {
                                    startLine: startLineParam,
                                    endLine: Number.isFinite(endLineParam) ? endLineParam : startLineParam
                                };
                                window.__aicrPendingHighlightRangeInfo = pendingHighlightRange;
                            }
                            if (fileParam) {
                                const norm = typeof store.normalizeKey === 'function'
                                    ? store.normalizeKey(fileParam)
                                    : String(fileParam || '');
                                store.setSelectedKey(norm);
                                if (typeof store.loadFileByKey === 'function') {
                                    store.loadFileByKey(norm).then(() => {
                                        try {
                                            const rangeInfo = window.__aicrPendingHighlightRangeInfo || pendingHighlightRange;
                                            if (rangeInfo) {
                                                setTimeout(() => {
                                                    try {
                                                        window.dispatchEvent(new CustomEvent('highlightCodeLines', {
                                                            detail: {
                                                                fileKey: norm,
                                                                rangeInfo
                                                            }
                                                        }));
                                                        logInfo('[代码審查] URL触发高亮事件', rangeInfo);
                                                    } catch (e) { logWarn('[代码審查] 触发高亮事件失败', e); }
                                                }, 300);
                                            }
                                        } catch (e) { logWarn('[代码審查] URL高亮处理失败', e); }
                                    }).catch(() => { });
                                }
                            }
                            // 初次加载后若存在挂起文件或当前选中文件无内容，尝试一次补载
                            setTimeout(() => {
                                try {
                                    const pending = window.__aicrPendingFileKey;
                                    const currentKey = pending || (store.selectedKey ? store.selectedKey.value : null);
                                    if (currentKey && typeof store.loadFileByKey === 'function') {
                                        const keyNorm = typeof store.normalizeKey === 'function'
                                            ? store.normalizeKey(currentKey)
                                            : String(currentKey || '');
                                        // 无论是否已有内容，就绪后都按需加载一次，避免刷新后首次点击缺内容
                                        store.loadFileByKey(keyNorm).finally(() => { window.__aicrPendingFileKey = null; });
                                    }
                                } catch (e) {
                                    logWarn('[主页面] 初次加载后的懒加载检查异常:', e?.message || e);
                                }
                            }, 300);
                        }).then(() => {
                            setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('projectReady', {
                                    detail: {}
                                }));
                                // 版本就绪后，如存在待加载文件或当前选中文件无内容，执行补载
                                try {
                                    const pendingKey = window.__aicrPendingFileKey;
                                    const currentKey = pendingKey || (store.selectedKey ? store.selectedKey.value : null);
                                    if (currentKey && typeof store.loadFileByKey === 'function') {
                                        const keyNorm = typeof store.normalizeKey === 'function'
                                            ? store.normalizeKey(currentKey)
                                            : String(currentKey || '');

                                        // 无论是否已有内容，确保按需加载一次
                                        logInfo('[主页面] 就绪后按需加载文件:', keyNorm);
                                        store.loadFileByKey(keyNorm).finally(() => {
                                            try {
                                                const rangeInfo = window.__aicrPendingHighlightRangeInfo;
                                                if (rangeInfo) {
                                                    setTimeout(() => {
                                                        try {
                                                            window.dispatchEvent(new CustomEvent('highlightCodeLines', {
                                                                detail: {
                                                                    fileKey: keyNorm,
                                                                    rangeInfo
                                                                }
                                                            }));
                                                            logInfo('[代码審查] 版本就绪后触发高亮事件', rangeInfo);
                                                        } catch (e) { logWarn('[代码審查] 触发高亮事件失败', e); }
                                                    }, 300);
                                                }
                                            } catch (e) { logWarn('[代码審查] 版本就绪高亮处理失败', e); }

                                            window.__aicrPendingFileKey = null;
                                        });
                                    }
                                } catch (e) {
                                    logWarn('[主页面] 版本就绪懒加载检查异常:', e?.message || e);
                                }
                            }, 500);
                        }).then(() => {
                            logInfo('[代码审查页面] 数据加载完成');
                        }).catch(error => {
                            logError('[代码审查页面] 数据加载失败:', error);
                        });
                    });
                }
                // 使用新的监听器管理器设置事件
                setupAicrEventListeners(store);
            },
            // 传递props给子组件
            props: {
                'code-view': {},
                'session-list-tags': {
                    allTags: function () { return this.allTags; },
                    selectedTags: function () { return store.selectedSessionTags ? store.selectedSessionTags.value : []; },
                    tagFilterReverse: function () { return store.tagFilterReverse ? store.tagFilterReverse.value : false; },
                    tagFilterNoTags: function () { return store.tagFilterNoTags ? store.tagFilterNoTags.value : false; },
                    tagFilterExpanded: function () { return store.tagFilterExpanded ? store.tagFilterExpanded.value : false; },
                    tagFilterSearchKeyword: function () { return store.tagFilterSearchKeyword ? store.tagFilterSearchKeyword.value : ''; },
                    tagCounts: function () { return this.tagCounts; },
                    tagFilterVisibleCount: function () { return store.tagFilterVisibleCount ? store.tagFilterVisibleCount.value : 8; }
                },
                'file-tree': {
                    tree: function () { return store.fileTree; },
                    selectedKey: function () { return store.selectedKey.value; },
                    expandedFolders: function () { return store.expandedFolders; },
                    loading: function () { return store.loading; },
                    error: function () { return store.errorMessage; },
                    collapsed: function () { return store.sidebarCollapsed ? store.sidebarCollapsed.value : false; },
                    batchMode: function () { return store.batchMode ? store.batchMode.value : false; },
                    selectedKeys: function () { return store.selectedKeys ? store.selectedKeys.value : new Set(); },
                    viewMode: function () { return store.viewMode ? store.viewMode.value : 'tree'; },
                    searchQuery: function () { return store.searchQuery ? store.searchQuery.value : ''; },
                    selectedTags: function () { return store.selectedSessionTags ? store.selectedSessionTags.value : []; },
                    tagFilterReverse: function () { return store.tagFilterReverse ? store.tagFilterReverse.value : false; },
                    tagFilterNoTags: function () { return store.tagFilterNoTags ? store.tagFilterNoTags.value : false; },
                    tagFilterExpanded: function () { return store.tagFilterExpanded ? store.tagFilterExpanded.value : false; },
                    tagFilterSearchKeyword: function () { return store.tagFilterSearchKeyword ? store.tagFilterSearchKeyword.value : ''; },
                    tagFilterVisibleCount: function () { return store.tagFilterVisibleCount ? store.tagFilterVisibleCount.value : 8; }
                }
            },
            methods: createMainPageMethods(store),
            computed: {
                // 计算是否所有会话都已选中
                isAllSessionsSelected: function () {
                    if (!store || !store.sessions || !store.sessions.value || !Array.isArray(store.sessions.value)) {
                        return false;
                    }
                    if (!store.selectedSessionKeys || !store.selectedSessionKeys.value) {
                        return false;
                    }
                    const visibleSessions = store.sessions.value;
                    if (visibleSessions.length === 0) {
                        return false;
                    }
                    return visibleSessions.every(session => store.selectedSessionKeys.value.has(session.key));
                },
                // 所有标签列表
                allTags: function () {
                    if (!store.fileTree?.value || !Array.isArray(store.fileTree.value)) return [];

                    // 只收集一级目录作为标签
                    const tags = new Set();
                    for (const item of store.fileTree.value) {
                        if (item.type === 'folder') {
                            tags.add(item.name);
                        }
                    }

                    const allTagsArray = Array.from(tags).sort();

                    try {
                        const saved = localStorage.getItem('aicr_file_tag_order');
                        const savedOrder = saved ? JSON.parse(saved) : null;

                        if (savedOrder && Array.isArray(savedOrder) && savedOrder.length > 0) {
                            const orderedTags = savedOrder.filter(tag => tags.has(tag));
                            const newTags = allTagsArray.filter(tag => !savedOrder.includes(tag));
                            return [...orderedTags, ...newTags];
                        }
                    } catch (e) {
                        console.warn('[index.js] 加载标签顺序失败:', e);
                    }

                    return allTagsArray;
                },
                // 标签计数
                tagCounts: function () {
                    const counts = {};
                    let noTagsCount = 0;

                    if (!store.fileTree?.value || !Array.isArray(store.fileTree.value)) {
                        return { counts, noTagsCount };
                    }

                    // 统计一级目录下所有文件数量（包括子文件夹中的文件）
                    const countFilesInFolder = (items) => {
                        let fileCount = 0;
                        if (!Array.isArray(items)) return fileCount;
                        for (const item of items) {
                            if (item.type === 'file') {
                                fileCount++;
                            } else if (item.type === 'folder' && item.children) {
                                fileCount += countFilesInFolder(item.children);
                            }
                        }
                        return fileCount;
                    };

                    // 遍历根目录
                    for (const item of store.fileTree.value) {
                        if (item.type === 'file') {
                            noTagsCount++;
                        } else if (item.type === 'folder') {
                            counts[item.name] = countFilesInFolder(item.children || []);
                        }
                    }

                    return { counts, noTagsCount };
                }
            }
        });
        window.aicrApp = app;
        window.aicrStore = store;

        // 调试：检查 store 中的 loadSessions
        console.log('[aicr/index] store.loadSessions 类型:', typeof store?.loadSessions);
        console.log('[aicr/index] store 对象键:', Object.keys(store || {}));
        if (store && store.loadSessions) {
            console.log('[aicr/index] ✓ loadSessions 方法存在');
        } else {
            console.error('[aicr/index] ✗ loadSessions 方法不存在');
        }

        // 全局错误处理 - 使用统一的 setupBrowserExtensionErrorFilter
        setupBrowserExtensionErrorFilter('aicr', true);


        if (window.aicrApp && window.aicrApp.reload) {
            const oldReload = window.aicrApp.reload;
            window.aicrApp.reload = function () {
                logInfo('[AICR主页面] reload 被调用');
                oldReload.apply(this, arguments);
            };
        }
    } catch (error) {
        logError('[代码审查页面] 应用初始化失败:', error);
    }
})();
