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
import '/cdn/utils/ui/tooltipPortal.js';
import { createSidebarResizers } from '/src/views/aicr/utils/resizer.js';
import { setupAicrEventListeners } from '/src/views/aicr/utils/listenerManager.js';
import { getFirstLevelNames, extractStoryNames } from '/src/views/aicr/utils/filterHelpers.js';

// 创建代码审查页面应用
(async function initAicrApp() {
    try {
        // 在外部创建 store，以便在 onMounted 中访问
        const store = createStore();

        // 跨筛选联动助手：检查项目是否包含所有选中的 skills/templates
        const _projectPassesClaudeFilter = (projectName) => {
            const sessions = store.sessions?.value || [];
            const selectedSkills = store.selectedSkillTags?.value || [];
            const selectedTemplates = store.selectedTemplateTags?.value || [];
            const selectedRules = store.selectedRuleTags?.value || [];
            const selectedAgents = store.selectedAgentTags?.value || [];
            if (selectedSkills.length === 0 && selectedTemplates.length === 0 && selectedRules.length === 0 && selectedAgents.length === 0) return true;

            const _checkClaudeDir = (dirName, selectedNames) => {
                if (selectedNames.length === 0) return true;
                return selectedNames.every(name => {
                    const seg = '/' + dirName + '/' + name;
                    return sessions.some(s => {
                        const fp = s.file_path || s.filePath || '';
                        const tags = Array.isArray(s.tags) ? s.tags : [];
                        const proj = tags[0] || fp.split('/')[0] || '';
                        return proj === projectName && (fp.includes(seg + '/') || fp.endsWith(seg));
                    });
                });
            };

            if (!_checkClaudeDir('skills', selectedSkills)) return false;
            if (!_checkClaudeDir('templates', selectedTemplates)) return false;
            if (!_checkClaudeDir('rules', selectedRules)) return false;
            if (!_checkClaudeDir('agents', selectedAgents)) return false;

            return true;
        };


        const app = await createBaseView({
            createStore: () => store,
            useComputed,
            useMethods,
            components: [
                'AicrPage',
                'AicrSidebar',
                'AicrCodeArea',
                'AicrModals',
                'YiModal',
                'YiLoading',
                'YiEmptyState',
                'YiErrorState',
                'YiIcon',
                'YiIconButton',
                'YiButton',
                'YiTag',
                'YiSelect',
                'YiInput',
                'YiTextarea',
                'HeaderActions',
                'FileTree',
                'CodeView',
                'MarkdownView',
                'KeyboardShortcutsHelp',
                'SkeletonLoader',
                'AiModelSelector',
            ],
            componentModules: [
                '/src/views/aicr/components/aicrPage/index.js',
                '/src/views/aicr/components/aicrSidebar/index.js',
                '/src/views/aicr/components/aicrCodeArea/index.js',
                '/src/views/aicr/components/aicrModals/index.js',
                '/cdn/components/common/modals/YiModal/index.js',
                '/cdn/components/common/loaders/YiLoading/index.js',
                '/cdn/components/common/feedback/YiEmptyState/index.js',
                '/cdn/components/common/feedback/YiErrorState/index.js',
                '/cdn/icons/YiIcon/index.js',
                '/cdn/components/common/buttons/YiIconButton/index.js',
                '/cdn/components/common/buttons/YiButton/index.js',
                '/cdn/components/common/tags/YiTag/index.js',
                '/cdn/components/common/forms/YiSelect/index.js',
                '/cdn/components/common/forms/YiInput/index.js',
                '/cdn/components/common/forms/YiTextarea/index.js',
                '/cdn/components/business/HeaderActions/index.js',
                '/src/views/aicr/components/fileTree/index.js',
                '/src/views/aicr/components/codeView/index.js',
                '/cdn/components/business/MarkdownView/index.js',
                '/src/views/aicr/components/keyboardShortcutsHelp/index.js',
                '/cdn/components/business/SkeletonLoader/index.js',
                '/src/views/aicr/components/AiModelSelector/index.js'
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
                // 文件树数据
                fileTree: store.fileTree,
                // 标签过滤相关状态
                tagFilterNoTags: store.tagFilterNoTags,
                selectedSkillTags: store.selectedSkillTags,
                selectedTemplateTags: store.selectedTemplateTags,
                selectedRuleTags: store.selectedRuleTags,
                selectedAgentTags: store.selectedAgentTags,
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
                                // URL 带有 key 参数时默认收缩两侧侧边栏
                                store.sidebarCollapsed.value = true;
                                store.chatPanelCollapsed.value = true;

                                const norm = typeof store.normalizeKey === 'function'
                                    ? store.normalizeKey(fileParam)
                                    : String(fileParam || '');
                                store.setSelectedKey(norm);
                                if (typeof store.expandPathToFile === 'function') {
                                    store.expandPathToFile(norm);
                                }
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
                    sessionSearchQuery: function () { return store.sessionSearchQuery ? store.sessionSearchQuery.value : ''; },
                    selectedTags: function () { return store.selectedSessionTags ? store.selectedSessionTags.value : []; },
                    tagFilterNoTags: function () { return store.tagFilterNoTags ? store.tagFilterNoTags.value : false; },
                    sessions: function () { return store.sessions ? store.sessions.value : []; },
                    selectedSkillTags: function () { return store.selectedSkillTags ? store.selectedSkillTags.value : []; },
                    selectedTemplateTags: function () { return store.selectedTemplateTags ? store.selectedTemplateTags.value : []; },
                    selectedRuleTags: function () { return store.selectedRuleTags ? store.selectedRuleTags.value : []; },
                    selectedAgentTags: function () { return store.selectedAgentTags ? store.selectedAgentTags.value : []; },
                    claudeFilterAllowedSessionKeys: function () {
                        const sks = store.selectedSkillTags?.value || [];
                        const tms = store.selectedTemplateTags?.value || [];
                        const rls = store.selectedRuleTags?.value || [];
                        const ags = store.selectedAgentTags?.value || [];
                        if (sks.length === 0 && tms.length === 0 && rls.length === 0 && ags.length === 0) return null;
                        const sessions = store.sessions?.value || [];
                        const _match = (fp, dir, names) => {
                            if (names.length === 0) return true;
                            return names.every(n => fp.includes('/' + dir + '/' + n + '/') || fp.endsWith('/' + dir + '/' + n));
                        };
                        const result = new Set();
                        for (const s of sessions) {
                            const fp = s.file_path || s.filePath || '';
                            if (!_match(fp, 'skills', sks)) continue;
                            if (!_match(fp, 'templates', tms)) continue;
                            if (!_match(fp, 'rules', rls)) continue;
                            if (!_match(fp, 'agents', ags)) continue;
                            if (s.key != null) result.add(String(s.key));
                        }
                        return result.size > 0 ? result : null;
                    }
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
                // 项目标签：顶层文件夹名 + 文件数 [{ name, count }]
                projectTags: function () {
                    const tree = store.fileTree?.value;
                    if (!tree || !Array.isArray(tree)) return [];

                    // 递归计数
                    const countInScope = (items) => {
                        if (!Array.isArray(items)) return 0;
                        let count = 0;
                        for (const item of items) {
                            if (item.type === 'file') {
                                count++;
                            } else if (item.type === 'folder' && item.children) {
                                count += countInScope(item.children);
                            }
                        }
                        return count;
                    };

                    const result = [];
                    for (const item of tree) {
                        if (item.type !== 'folder' || !item.children) continue;
                        if (!_projectPassesClaudeFilter(item.name)) continue;
                        result.push({ name: item.name, count: countInScope(item.children) });
                    }

                    // 按 localStorage 拖拽排序
                    try {
                        const saved = localStorage.getItem('aicr_file_tag_order');
                        const savedOrder = saved ? JSON.parse(saved) : null;
                        if (savedOrder && Array.isArray(savedOrder) && savedOrder.length > 0) {
                            const nameSet = new Set(result.map(r => r.name));
                            const ordered = savedOrder.filter(n => nameSet.has(n)).map(n => result.find(r => r.name === n));
                            const remaining = result.filter(r => !savedOrder.includes(r.name));
                            return [...ordered, ...remaining];
                        }
                    } catch (e) { /* ignore */ }

                    return result.sort((a, b) => a.name.localeCompare(b.name));
                },

                // 根级文件数（用于"没有故事"按钮徽标）
                rootFileCount: function () {
                    const tree = store.fileTree?.value;
                    if (!tree || !Array.isArray(tree)) return 0;
                    let count = 0;
                    for (const item of tree) {
                        if (item.type === 'file') count++;
                    }
                    return count;
                },

                // 故事标签：从树中提取的故事名 + 文件数 [{ name, count }]
                storyTags: function () {
                    const tree = store.fileTree?.value;
                    if (!tree || !Array.isArray(tree)) return [];

                    const firstLevelNames = getFirstLevelNames(tree);

                    const countInScope = (items) => {
                        if (!Array.isArray(items)) return 0;
                        let count = 0;
                        for (const item of items) {
                            if (item.type === 'file') {
                                count++;
                            } else if (item.type === 'folder' && item.children) {
                                count += countInScope(item.children);
                            }
                        }
                        return count;
                    };

                    const resultMap = new Map();
                    const walk = (items, parentName = '') => {
                        if (!Array.isArray(items)) return;
                        for (const item of items) {
                            if (item.type === 'folder') {
                                if (parentName === '故事任务面板') {
                                    const count = countInScope(item.children || []);
                                    const existing = resultMap.get(item.name);
                                    resultMap.set(item.name, existing !== undefined ? existing + count : count);
                                }
                                if (item.children) walk(item.children, item.name);
                            }
                        }
                    };
                    // 项目级联动：确定遍历起始范围
                    const selectedTags = store.selectedSessionTags?.value || [];
                    const projectSel = selectedTags.filter(t => firstLevelNames.has(t));
                    const hasProject = projectSel.length > 0;

                    if (hasProject) {
                        for (const item of tree) {
                            if (item.type === 'folder' && projectSel.includes(item.name)) {
                                if (!_projectPassesClaudeFilter(item.name)) continue;
                                walk(item.children || []);
                            }
                        }
                    } else {
                        for (const item of tree) {
                            if (item.type !== 'folder') continue;
                            if (!_projectPassesClaudeFilter(item.name)) continue;
                            walk(item.children || []);
                        }
                    }

                    const result = [];
                    for (const [name, count] of resultMap) {
                        if (count > 0) result.push({ name, count });
                    }
                    return result.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
                },

                // Skills 标签：从 sessions 的 file_path 中提取 skills/<name>（联动 project/story/type 筛选）
                skillTags: function () {
                    const sessions = store.sessions?.value;
                    if (!sessions || !Array.isArray(sessions)) return [];

                    const tree = store.fileTree?.value || [];
                    const selectedTags = store.selectedSessionTags?.value || [];
                    const firstLevelNames = getFirstLevelNames(tree);
                    const storyNameSet = new Set(extractStoryNames(tree));
                    const projectSel = selectedTags.filter(t => firstLevelNames.has(t));
                    const storySel = selectedTags.filter(t => storyNameSet.has(t));
                    const hasProject = projectSel.length > 0;
                    const hasStory = storySel.length > 0;

                    const projectSkills = new Map();
                    for (const s of sessions) {
                        const fp = s.file_path || s.filePath || '';
                        const match = fp.match(/\/skills\/([^/]+)/);
                        if (!match) continue;
                        const tags = Array.isArray(s.tags) ? s.tags : [];
                        const proj = tags[0] || fp.split('/')[0] || '';
                        const skillName = match[1];
                        if (!proj || !skillName) continue;

                        if (hasProject && !projectSel.includes(proj)) continue;
                        if (hasStory) {
                            const projHasStory = sessions.some(ss => {
                                const sfp = ss.file_path || ss.filePath || '';
                                const stags = Array.isArray(ss.tags) ? ss.tags : [];
                                const sproj = stags[0] || sfp.split('/')[0] || '';
                                if (sproj !== proj) return false;
                                const parts = sfp.split('/');
                                const panelIdx = parts.indexOf('故事任务面板');
                                return panelIdx !== -1 && panelIdx + 1 < parts.length && storySel.includes(parts[panelIdx + 1]);
                            });
                            if (!projHasStory) continue;
                        }

                        const key = proj + '|||' + skillName;
                        if (!projectSkills.has(key)) {
                            projectSkills.set(key, { proj, skillName });
                        }
                    }

                    const counts = {};
                    for (const [, v] of projectSkills) {
                        counts[v.skillName] = (counts[v.skillName] || 0) + 1;
                    }

                    return Object.entries(counts)
                        .map(([name, count]) => ({ name, count }))
                        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
                },

                // Templates 标签：从 sessions 的 file_path 中提取 templates/<name>（联动 project/story/type 筛选）
                templateTags: function () {
                    const sessions = store.sessions?.value;
                    if (!sessions || !Array.isArray(sessions)) return [];

                    const tree = store.fileTree?.value || [];
                    const selectedTags = store.selectedSessionTags?.value || [];
                    const firstLevelNames = getFirstLevelNames(tree);
                    const storyNameSet = new Set(extractStoryNames(tree));
                    const projectSel = selectedTags.filter(t => firstLevelNames.has(t));
                    const storySel = selectedTags.filter(t => storyNameSet.has(t));
                    const hasProject = projectSel.length > 0;
                    const hasStory = storySel.length > 0;

                    const projectTemplates = new Map();
                    for (const s of sessions) {
                        const fp = s.file_path || s.filePath || '';
                        const match = fp.match(/\/templates\/([^/]+)/);
                        if (!match) continue;
                        const tags = Array.isArray(s.tags) ? s.tags : [];
                        const proj = tags[0] || fp.split('/')[0] || '';
                        const tmplName = match[1];
                        if (!proj || !tmplName) continue;

                        if (hasProject && !projectSel.includes(proj)) continue;
                        if (hasStory) {
                            const projHasStory = sessions.some(ss => {
                                const sfp = ss.file_path || ss.filePath || '';
                                const stags = Array.isArray(ss.tags) ? ss.tags : [];
                                const sproj = stags[0] || sfp.split('/')[0] || '';
                                if (sproj !== proj) return false;
                                const parts = sfp.split('/');
                                const panelIdx = parts.indexOf('故事任务面板');
                                return panelIdx !== -1 && panelIdx + 1 < parts.length && storySel.includes(parts[panelIdx + 1]);
                            });
                            if (!projHasStory) continue;
                        }

                        const key = proj + '|||' + tmplName;
                        if (!projectTemplates.has(key)) {
                            projectTemplates.set(key, { proj, tmplName });
                        }
                    }

                    const counts = {};
                    for (const [, v] of projectTemplates) {
                        counts[v.tmplName] = (counts[v.tmplName] || 0) + 1;
                    }

                    return Object.entries(counts)
                        .map(([name, count]) => ({ name, count }))
                        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
                },

                // Rules 标签：从 sessions 的 file_path 中提取 rules/<name>（联动 project/story/type 筛选）
                ruleTags: function () {
                    const sessions = store.sessions?.value;
                    if (!sessions || !Array.isArray(sessions)) return [];

                    const tree = store.fileTree?.value || [];
                    const selectedTags = store.selectedSessionTags?.value || [];
                    const firstLevelNames = getFirstLevelNames(tree);
                    const storyNameSet = new Set(extractStoryNames(tree));
                    const projectSel = selectedTags.filter(t => firstLevelNames.has(t));
                    const storySel = selectedTags.filter(t => storyNameSet.has(t));
                    const hasProject = projectSel.length > 0;
                    const hasStory = storySel.length > 0;

                    const projectRules = new Map();
                    for (const s of sessions) {
                        const fp = s.file_path || s.filePath || '';
                        const match = fp.match(/\/rules\/([^/]+)/);
                        if (!match) continue;
                        const tags = Array.isArray(s.tags) ? s.tags : [];
                        const proj = tags[0] || fp.split('/')[0] || '';
                        const ruleName = match[1];
                        if (!proj || !ruleName) continue;

                        if (hasProject && !projectSel.includes(proj)) continue;
                        if (hasStory) {
                            const projHasStory = sessions.some(ss => {
                                const sfp = ss.file_path || ss.filePath || '';
                                const stags = Array.isArray(ss.tags) ? ss.tags : [];
                                const sproj = stags[0] || sfp.split('/')[0] || '';
                                if (sproj !== proj) return false;
                                const parts = sfp.split('/');
                                const panelIdx = parts.indexOf('故事任务面板');
                                return panelIdx !== -1 && panelIdx + 1 < parts.length && storySel.includes(parts[panelIdx + 1]);
                            });
                            if (!projHasStory) continue;
                        }

                        const key = proj + '|||' + ruleName;
                        if (!projectRules.has(key)) {
                            projectRules.set(key, { proj, ruleName });
                        }
                    }

                    const counts = {};
                    for (const [, v] of projectRules) {
                        counts[v.ruleName] = (counts[v.ruleName] || 0) + 1;
                    }

                    return Object.entries(counts)
                        .map(([name, count]) => ({ name, count }))
                        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
                },

                // Agents 标签：从 sessions 的 file_path 中提取 agents/<name>（联动 project/story/type 筛选）
                agentTags: function () {
                    const sessions = store.sessions?.value;
                    if (!sessions || !Array.isArray(sessions)) return [];

                    const tree = store.fileTree?.value || [];
                    const selectedTags = store.selectedSessionTags?.value || [];
                    const firstLevelNames = getFirstLevelNames(tree);
                    const storyNameSet = new Set(extractStoryNames(tree));
                    const projectSel = selectedTags.filter(t => firstLevelNames.has(t));
                    const storySel = selectedTags.filter(t => storyNameSet.has(t));
                    const hasProject = projectSel.length > 0;
                    const hasStory = storySel.length > 0;

                    const projectAgents = new Map();
                    for (const s of sessions) {
                        const fp = s.file_path || s.filePath || '';
                        const match = fp.match(/\/agents\/([^/]+)/);
                        if (!match) continue;
                        const tags = Array.isArray(s.tags) ? s.tags : [];
                        const proj = tags[0] || fp.split('/')[0] || '';
                        const agentName = match[1];
                        if (!proj || !agentName) continue;

                        if (hasProject && !projectSel.includes(proj)) continue;
                        if (hasStory) {
                            const projHasStory = sessions.some(ss => {
                                const sfp = ss.file_path || ss.filePath || '';
                                const stags = Array.isArray(ss.tags) ? ss.tags : [];
                                const sproj = stags[0] || sfp.split('/')[0] || '';
                                if (sproj !== proj) return false;
                                const parts = sfp.split('/');
                                const panelIdx = parts.indexOf('故事任务面板');
                                return panelIdx !== -1 && panelIdx + 1 < parts.length && storySel.includes(parts[panelIdx + 1]);
                            });
                            if (!projHasStory) continue;
                        }

                        const key = proj + '|||' + agentName;
                        if (!projectAgents.has(key)) {
                            projectAgents.set(key, { proj, agentName });
                        }
                    }

                    const counts = {};
                    for (const [, v] of projectAgents) {
                        counts[v.agentName] = (counts[v.agentName] || 0) + 1;
                    }

                    return Object.entries(counts)
                        .map(([name, count]) => ({ name, count }))
                        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
                },

                // 允许的 session key 集合（供文件树 skills/templates 过滤）
                claudeFilterAllowedSessionKeys: function () {
                    const sks = store.selectedSkillTags?.value || [];
                    const tms = store.selectedTemplateTags?.value || [];
                    const rls = store.selectedRuleTags?.value || [];
                    const ags = store.selectedAgentTags?.value || [];
                    if (sks.length === 0 && tms.length === 0 && rls.length === 0 && ags.length === 0) return null;
                    const sessions = store.sessions?.value || [];

                    const _match = (fp, dir, names) => {
                        if (names.length === 0) return true;
                        return names.every(n => fp.includes('/' + dir + '/' + n + '/') || fp.endsWith('/' + dir + '/' + n));
                    };

                    const result = new Set();
                    for (const s of sessions) {
                        const fp = s.file_path || s.filePath || '';
                        if (!_match(fp, 'skills', sks)) continue;
                        if (!_match(fp, 'templates', tms)) continue;
                        if (!_match(fp, 'rules', rls)) continue;
                        if (!_match(fp, 'agents', ags)) continue;
                        if (s.key != null) result.add(String(s.key));
                    }
                    return result.size > 0 ? result : null;
                },

                // 筛选后文件总数（项目/故事/类型三级级联 + 会话搜索 + skills/templates）
                filteredFileCount: function () {
                    const tree = store.fileTree?.value;
                    if (!tree || !Array.isArray(tree)) return 0;

                    const selectedTags = store.selectedSessionTags?.value || [];
                    const noTags = store.tagFilterNoTags?.value || false;
                    const sessionQuery = (store.sessionSearchQuery?.value || '').trim().toLowerCase();
                    const firstLevelNames = getFirstLevelNames(tree);
                    const storyNameSet = new Set(extractStoryNames(tree));
                    const projectSel = selectedTags.filter(t => firstLevelNames.has(t));
                    const storySel = selectedTags.filter(t => storyNameSet.has(t));
                    const hasProject = projectSel.length > 0;
                    const hasStory = storySel.length > 0;
                    let workingTree = tree;
                    if (sessionQuery) {
                        workingTree = workingTree.filter(item => {
                            if (item.type === 'folder') {
                                if ((item.name || '').toLowerCase().includes(sessionQuery)) return true;
                                if (Array.isArray(item.children)) {
                                    return item.children.some(c => (c.name || '').toLowerCase().includes(sessionQuery));
                                }
                                return false;
                            }
                            return (item.name || '').toLowerCase().includes(sessionQuery);
                        });
                    }

                    // "没有故事"：仅统计根级文件
                    if (noTags && !hasProject && !hasStory) {
                        let count = 0;
                        for (const item of workingTree) {
                            if (item.type === 'file') count++;
                        }
                        return count;
                    }

                    let total = 0;
                    const walk = (items, depth, projectOk, storyOk, parentName = '') => {
                        if (!Array.isArray(items)) return;
                        for (const item of items) {
                            if (item.type === 'file') {
                                if (hasStory && !storyOk) continue;
                                total++;
                            } else if (item.type === 'folder' && item.children) {
                                // 项目级范围
                                let nextProjectOk = depth === 0
                                    ? (!hasProject || projectSel.includes(item.name))
                                    : projectOk;

                                if (!nextProjectOk) continue;

                                // skills/templates 筛选
                                if (depth === 0 && !_projectPassesClaudeFilter(item.name)) continue;

                                // 故事级范围：只有直接父目录为「故事任务面板」的才是故事
                                const isStory = (parentName === '故事任务面板');

                                // 跳过未选中的故事文件夹
                                if (isStory && hasStory && !storySel.includes(item.name)) {
                                    continue;
                                }

                                const nextStoryOk = isStory
                                    ? (!hasStory || storySel.includes(item.name))
                                    : storyOk;

                                walk(item.children, depth + 1, nextProjectOk, nextStoryOk, item.name);
                            }
                        }
                    };

                    walk(workingTree, 0, !hasProject, !hasStory);
                    return total;
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
