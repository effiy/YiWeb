/**
 * 代码审查页面主入口
 * author: liangliang
 */
import { createStore } from '/src/views/aicr/hooks/store.js';
import { useComputed } from '/src/views/aicr/hooks/useComputed.js';
import { useMethods } from '/src/views/aicr/hooks/useMethods.js';
import { createMainPageMethods } from '/src/views/aicr/hooks/mainPageMethods.js';
import { createBaseView } from '/src/utils/view/baseView.js';
import { logInfo, logWarn, logError } from '/src/utils/core/log.js';

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
                'SearchHeader',
                'FileTree',
                'CodeView',
                'MarkdownView',
            ],
            componentModules: [
                '/src/views/aicr/components/aicrPage/index.js',
                '/src/views/aicr/components/aicrHeader/index.js',
                '/src/views/aicr/components/aicrSidebar/index.js',
                '/src/views/aicr/components/aicrCodeArea/index.js',
                '/src/views/aicr/components/aicrModals/index.js',
                '/src/components/common/yiModal/index.js',
                '/src/components/common/yiLoading/index.js',
                '/src/components/common/yiEmptyState/index.js',
                '/src/components/common/yiErrorState/index.js',
                '/src/components/common/yiIconButton/index.js',
                '/src/components/common/yiButton/index.js',
                '/src/components/common/yiTag/index.js',
                '/src/components/common/searchHeader/index.js',
                '/src/views/aicr/components/fileTree/index.js',
                '/src/views/aicr/components/codeView/index.js',
                '/src/markdown/markdownView/index.js'
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
                                const norm = String(fileParam).replace(/\\\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/\/+/g, '/');
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
                                        const normalize3 = (v) => String(v || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/\/+/g, '/');
                                        const keyNorm = normalize3(currentKey);
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
                                        const normalize4 = (v) => String(v || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/\/+/g, '/');
                                        const keyNorm = normalize4(currentKey);

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
                // 添加ESC快捷键监听，取消文件选中
                // 监听模态框的ESC事件，如果模态框已处理则跳过
                const modalEscListener = (e) => {
                    logInfo('[代码审查页面] 检测到模态框ESC事件，跳过文件选中取消');
                };
                window.addEventListener('modalEscPressed', modalEscListener);

                const keydownListener = (e) => {
                    if (e.key === 'Escape') {
                        // 检查是否有模态框打开，如果有则跳过处理
                        if (document.querySelector('.modal, .modal-backdrop')) {
                            logInfo('[代码审查页面] 模态框已打开，跳过ESC处理');
                            return;
                        }

                        logInfo('[代码审查页面] ESC键被按下，取消文件选中');
                        if (store && store.selectedKey.value) {
                            const previousKey = store.selectedKey.value;
                            store.setSelectedKey(null);
                            logInfo('[代码审查页面] 已取消文件选中，之前文件Key:', previousKey);

                            // 发送清除高亮事件，通知代码视图组件清除高亮
                            setTimeout(() => {
                                logInfo('[代码审查页面] 发送清除高亮事件');
                                window.dispatchEvent(new CustomEvent('clearCodeHighlight'));
                            }, 50);
                        }
                    }
                };
                window.addEventListener('keydown', keydownListener);

                // 监听高亮事件，必要时切换文件后转发
                const highlightListener = (e) => {
                    // 如果事件已经被转发过，避免死循环
                    if (e.detail && e.detail._forwarded) {
                        return;
                    }

                    const { fileKey, rangeInfo } = e.detail || {};
                    logInfo('[代码审查页面] 收到代码高亮事件:', { fileKey, rangeInfo });

                    if (fileKey) {
                        // 如果当前没有选中该文件，先选中文件
                        const needSwitchFile = store && store.selectedKey.value !== fileKey;
                        if (needSwitchFile) {
                            logInfo('[代码审查页面] 切换到文件:', fileKey);
                            store.setSelectedKey(fileKey);
                        }

                        // 发送高亮事件给代码视图组件
                        // 如果切换了文件，需要等待更长时间让文件加载和渲染完成
                        const delay = needSwitchFile ? 500 : 100;
                        setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('highlightCodeLines', {
                                detail: {
                                    rangeInfo,
                                    _forwarded: true // 标记为已转发，避免死循环
                                }
                            }));
                        }, delay);
                    } else {
                        // 如果没有文件Key，直接发送事件（可能是当前文件）
                        setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('highlightCodeLines', {
                                detail: {
                                    rangeInfo,
                                    _forwarded: true // 标记为已转发，避免死循环
                                }
                            }));
                        }, 100);
                    }
                };
                window.addEventListener('highlightCodeLines', highlightListener);

                // 保存监听器引用到全局，供清理时使用
                window.__aicrMountedListeners = {
                    modalEscPressed: modalEscListener,
                    keydown: keydownListener,
                    highlightCodeLines: highlightListener
                };

                // 提供清理函数
                window.__aicrCleanupMountedListeners = () => {
                    const listeners = window.__aicrMountedListeners;
                    if (listeners) {
                        if (listeners.modalEscPressed) window.removeEventListener('modalEscPressed', listeners.modalEscPressed);
                        if (listeners.keydown) window.removeEventListener('keydown', listeners.keydown);
                        if (listeners.highlightCodeLines) window.removeEventListener('highlightCodeLines', listeners.highlightCodeLines);
                        window.__aicrMountedListeners = null;
                        logInfo('[代码审查页面] 已清理onMounted中添加的事件监听器');
                    }
                };
            },
            // 传递props给子组件
            props: {
                'code-view': {},
                'file-tree': {
                    tree: function () { return store.fileTree; },
                    selectedKey: function () { return store.selectedKey.value; },
                    expandedFolders: function () { return store.expandedFolders; },
                    loading: function () { return store.loading; },
                    error: function () { return store.errorMessage; },
                    collapsed: function () { return store.sidebarCollapsed ? store.sidebarCollapsed.value : false; },
                    searchQuery: function () { return store.searchQuery ? store.searchQuery.value : ''; },
                    batchMode: function () { return store.batchMode ? store.batchMode.value : false; },
                    selectedKeys: function () { return store.selectedKeys ? store.selectedKeys.value : new Set(); },
                    viewMode: function () { return store.viewMode ? store.viewMode.value : 'tree'; }
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

        // 全局错误处理
        window.addEventListener('error', (event) => {
            console.error('[aicr] 全局错误:', event.error);

            // 使用新的浏览器扩展错误处理函数
            if (window.handleBrowserExtensionError && window.handleBrowserExtensionError(event.error, 'aicr', event.filename)) {
                return; // 已处理，忽略
            }

            // 如果不是扩展错误，记录到错误日志
            if (window.errorLogger && event.error) {
                window.errorLogger.log(event.error, 'aicr', window.ErrorLevels?.ERROR || 'error');
            }
        });

        // 全局Promise错误处理
        window.addEventListener('unhandledrejection', (event) => {
            console.error('[aicr] 未处理的Promise错误:', event.reason);

            // 使用新的浏览器扩展错误处理函数
            if (window.handleBrowserExtensionError && window.handleBrowserExtensionError(event.reason, 'aicr', '', event.reason?.stack)) {
                event.preventDefault(); // 阻止默认的错误处理
                return; // 已处理，忽略
            }

            // 如果不是扩展错误，记录到错误日志
            if (window.errorLogger && event.reason) {
                window.errorLogger.log(event.reason, 'aicr', window.ErrorLevels?.ERROR || 'error');
            }
        });


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

/**
 * 创建侧边栏拖拽条
 * 参考 YiPet 项目的实现
 */
function createSidebarResizers(store) {
    if (!store) return;

    // 创建文件树侧边栏拖拽条
    const sidebar = document.querySelector('.aicr-sidebar');
    if (sidebar) {
        createResizer(sidebar, store, 'sidebar', {
            minWidth: 240,
            maxWidth: 400,
            defaultWidth: 320,
            storageKey: 'aicrSidebarWidth',
            saveWidth: store.saveSidebarWidth
        });

        // 应用保存的宽度
        if (store.sidebarWidth && store.sidebarWidth.value) {
            sidebar.style.width = `${store.sidebarWidth.value}px`;
        }
    }

    const chatPanel = document.querySelector('.aicr-code-chat');
    if (chatPanel) {
        createResizer(chatPanel, store, 'chatPanel', {
            minWidth: 280,
            maxWidth: 980,
            defaultWidth: 420,
            storageKey: 'aicrChatPanelWidth',
            saveWidth: store.saveChatPanelWidth,
            position: 'left',
            enforceLimits: true
        });

        if (store.chatPanelWidth && store.chatPanelWidth.value) {
            chatPanel.style.setProperty('--aicr-chat-width', `${store.chatPanelWidth.value}px`);
        }
    }
}

/**
 * 创建单个拖拽条
 */
function createResizer(sidebarElement, store, type, options) {
    const {
        minWidth = 240,
        maxWidth = 400,
        defaultWidth = 320,
        storageKey,
        saveWidth,
        position = 'right', // 'right' 或 'left'
        enforceLimits = false
    } = options;

    // 检查是否已存在拖拽条
    const existingResizer = sidebarElement.querySelector('.sidebar-resizer');
    if (existingResizer) {
        return existingResizer;
    }

    const resizer = document.createElement('div');
    resizer.className = 'sidebar-resizer';
    resizer.setAttribute('data-type', type);

    // 设置样式
    resizer.style.cssText = `
        position: absolute !important;
        top: 0 !important;
        ${position === 'right' ? 'right: -4px' : 'left: -4px'} !important;
        width: 8px !important;
        height: 100% !important;
        cursor: col-resize !important;
        z-index: 10 !important;
        background: transparent !important;
        transition: background 0.2s ease !important;
    `;

    let isResizing = false;

    // 鼠标悬停效果
    resizer.addEventListener('mouseenter', () => {
        if (!isResizing) {
            resizer.style.setProperty('background', 'rgba(59, 130, 246, 0.3)', 'important');
        }
    });

    resizer.addEventListener('mouseleave', () => {
        if (!isResizing) {
            resizer.style.setProperty('background', 'transparent', 'important');
        }
    });

    // 拖拽开始
    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        isResizing = true;
        resizer.style.setProperty('background', 'rgba(59, 130, 246, 0.5)', 'important');
        resizer.style.setProperty('cursor', 'col-resize', 'important');

        // 记录初始位置和宽度
        const startX = e.clientX;
        const currentWidth = sidebarElement.offsetWidth;
        const startWidth = currentWidth || defaultWidth;

        // 禁用过渡效果，确保拖拽流畅
        sidebarElement.style.transition = 'none';

        // 添加全局样式，禁用文本选择
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';

        // 拖拽中
        const handleMouseMove = (e) => {
            if (!isResizing) return;

            const diffX = position === 'right'
                ? e.clientX - startX
                : startX - e.clientX;
            let newWidth = startWidth + diffX;

            if (enforceLimits) {
                const min = typeof minWidth === 'number' && minWidth > 0 ? minWidth : 50;
                const max = typeof maxWidth === 'number' && maxWidth > 0 ? maxWidth : Infinity;
                newWidth = Math.max(min, Math.min(max, newWidth));
            } else {
                newWidth = Math.max(50, newWidth);
            }

            // 更新宽度
            if (type === 'chatPanel') {
                sidebarElement.style.setProperty('--aicr-chat-width', `${newWidth}px`);
            } else {
                sidebarElement.style.width = `${newWidth}px`;
            }

            // 更新 store 中的宽度值
            if (type === 'sidebar') {
                if (store.sidebarWidth) {
                    store.sidebarWidth.value = newWidth;
                }
            } else if (type === 'chatPanel') {
                if (store.chatPanelWidth) {
                    store.chatPanelWidth.value = newWidth;
                }
            }
        };

        // 拖拽结束
        const handleMouseUp = () => {
            isResizing = false;
            resizer.style.setProperty('background', 'transparent', 'important');
            resizer.style.setProperty('cursor', 'col-resize', 'important');

            // 恢复过渡效果
            sidebarElement.style.transition = '';

            // 恢复全局样式
            document.body.style.userSelect = '';
            document.body.style.cursor = '';

            // 保存宽度
            const finalWidth = type === 'chatPanel'
                ? (store.chatPanelWidth ? store.chatPanelWidth.value : sidebarElement.getBoundingClientRect().width)
                : sidebarElement.offsetWidth;

            if (type === 'sidebar') {
                if (typeof store.saveSidebarWidth === 'function') {
                    store.saveSidebarWidth(finalWidth);
                } else if (saveWidth && typeof saveWidth === 'function') {
                    saveWidth(finalWidth);
                }
            } else if (type === 'chatPanel') {
                if (typeof store.saveChatPanelWidth === 'function') {
                    store.saveChatPanelWidth(finalWidth);
                } else if (saveWidth && typeof saveWidth === 'function') {
                    saveWidth(finalWidth);
                }
            } else if (saveWidth && typeof saveWidth === 'function') {
                saveWidth(finalWidth);
            }

            // 移除事件监听器
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        // 添加全局事件监听器
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });

    sidebarElement.appendChild(resizer);

    return resizer;
}
