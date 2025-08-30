/**
 * 代码审查页面主入口
 * author: liangliang
 */
import { createStore } from '/views/aicr/hooks/store.js';
import { useComputed } from '/views/aicr/hooks/useComputed.js';
import { useMethods } from '/views/aicr/hooks/useMethods.js';
import { createBaseView } from '/utils/baseView.js';
import { logInfo, logWarn, logError } from '/utils/log.js';

// 获取Vue的computed函数
const { computed } = Vue;

// 创建代码审查页面应用
(async function initAicrApp() {
    try {
        // 在外部创建 store，以便在 onMounted 中访问
        const store = createStore();

        // 新增：本地评论和高亮状态
        const localState = {
            codeComments: [] // {id, fileId, text, comment, rangeInfo}
        };

        // 监听划词评论事件
        window.addEventListener('addCodeComment', (e) => {
            const detail = e.detail;
            // 生成唯一key
            const key = 'cmt_' + Date.now() + '_' + Math.floor(Math.random()*10000);
            // 假设当前文件id为store.selectedFileId
            const fileId = store.selectedFileId || (store.state && store.state.selectedFileId);
            // 记录range的起止行号和字符索引
            let startLine = 0, endLine = 0, startChar = 0, endChar = 0;
            if (detail.range) {
                const range = detail.range;
                // 通过closest('.code-line') 获取准确行号（author: liangliang）
                const getLineNumberFromNode = (node) => {
                    const el = node && node.nodeType === 3 ? node.parentElement : node;
                    if (!el) return 0;
                    const codeLineEl = el.classList && el.classList.contains('code-line')
                        ? el
                        : (el.closest ? el.closest('.code-line') : null);
                    if (!codeLineEl) return 0;
                    const num = parseInt(codeLineEl.getAttribute('data-line'));
                    return Number.isFinite(num) ? num : 0;
                };

                startLine = getLineNumberFromNode(range.startContainer);
                endLine = getLineNumberFromNode(range.endContainer);

                // 获取字符级索引
                if (range.startContainer && range.startContainer.nodeType === 3) {
                    startChar = range.startOffset;
                }
                if (range.endContainer && range.endContainer.nodeType === 3) {
                    endChar = range.endOffset;
                }

                // 规范化与排序
                if (!startLine && endLine) startLine = endLine;
                if (!endLine && startLine) endLine = startLine;
                if (!startLine) startLine = 1;
                if (!endLine) endLine = startLine;
                if (startLine > endLine) {
                    const tmp = startLine; startLine = endLine; endLine = tmp;
                    const tmpChar = startChar; startChar = endChar; endChar = tmpChar;
                }
            }
            // 兼容性处理
            if (!startLine || !endLine) {
                startLine = endLine = 0;
            }
            localState.codeComments.push({
                key,
                fileId,
                text: detail.text,
                comment: detail.comment,
                rangeInfo: { startLine, startChar, endLine, endChar }
            });
            // 触发视图刷新（如用Vue可用响应式，这里简单reload）
            if (window.aicrApp && window.aicrApp.reload) window.aicrApp.reload();
        });

        const app = await createBaseView({
            createStore: () => store,
            useComputed,
            useMethods,
            components: [
                'FileTree',
                'CodeView',
                'CommentPanel'
            ],
            data: {
                // 新增：本地评论和高亮状态
                codeComments: localState.codeComments,
                // 暴露store数据给模板
                fileTree: store.fileTree,
                expandedFolders: store.expandedFolders,
                loading: store.loading,
                errorMessage: store.errorMessage,
                comments: store.comments,
                sidebarCollapsed: store.sidebarCollapsed,
                commentsCollapsed: store.commentsCollapsed,
                // 项目/版本管理
                projects: store.projects,
                selectedProject: store.selectedProject,
                selectedVersion: store.selectedVersion,
                availableVersions: store.availableVersions,
                // 项目/版本维护弹框相关（直接绑定store响应式字段）
                showPvManager: store.showPvManager,
                pvProjects: store.pvProjects,
                pvSelectedProjectId: store.pvSelectedProjectId,
                pvNewProjectId: store.pvNewProjectId,
                pvNewProjectName: store.pvNewProjectName,
                pvNewVersionId: store.pvNewVersionId,
                pvNewVersionName: store.pvNewVersionName,
                pvDirty: store.pvDirty,
                pvError: store.pvError,

                // 搜索相关状态
                searchQuery: store.searchQuery,
                // 新增评论内容
                newComment: '',
                // 评论者相关状态
                commenters: store.commenters,
                selectedCommenterIds: store.selectedCommenterIds,
                commentersLoading: store.commentersLoading,
                commentersError: store.commentersError,
                
                // 计算属性
                currentFile: computed(() => {
                    const fileId = store.selectedFileId ? store.selectedFileId.value : null;
                    console.log('[主页面] currentFile计算 - 文件ID:', fileId);
                    const normalize = (v) => {
                        if (!v) return '';
                        let s = String(v).replace(/\\\\/g, '/');
                        s = s.replace(/^\.\//, '');
                        s = s.replace(/^\/+/, '');
                        s = s.replace(/\/\/+/g, '/');
                        return s;
                    };
                    const target = normalize(fileId);
                    const currentFile = fileId && store.files ? store.files.value.find(f => {
                        const d = (f && typeof f === 'object' && f.data && typeof f.data === 'object') ? f.data : {};
                        const candidates = [f.fileId, f.id, f.path, f.name, d.fileId, d.id, d.path, d.name].filter(Boolean);
                        const matched = candidates.some(c => {
                            const n = normalize(c);
                            // 完全匹配
                            if (n === target) return true;
                            // 路径结尾匹配
                            if (n.endsWith('/' + target) || target.endsWith('/' + n)) return true;
                            // 文件名匹配（去除路径后比较）
                            const nName = n.split('/').pop();
                            const targetName = target.split('/').pop();
                            if (nName && targetName && nName === targetName) {
                                // 如果只有文件名相同，可能是文件树传递的简单ID
                                return true;
                            }
                            return false;
                        });
                        console.log('[主页面] currentFile计算 - 检查文件:', f.name, '候选:', candidates, '匹配:', matched);
                        return matched;
                    }) : null;
                    console.log('[主页面] currentFile计算 - 找到的文件:', currentFile);
                    // 若未找到文件，但已选中文件ID，返回占位对象以触发code-view懒加载
                    if (!currentFile && target) {
                        const name = target.split('/').pop();
                        return { fileId: target, id: target, path: target, name, content: '' };
                    }
                    return currentFile;
                }),
                currentComments: computed(() => {
                    const fileId = store.selectedFileId ? store.selectedFileId.value : null;
                    console.log('[主页面] currentComments计算 - 文件ID:', fileId);
                    if (!fileId) return [];
                    
                    const storeComments = store.comments ? store.comments.value.filter(c => {
                        const commentFileId = c.fileId || (c.fileInfo && c.fileInfo.path);
                        const match = commentFileId === fileId;
                        console.log('[主页面] currentComments计算 - 检查评论:', c.content, '文件ID:', commentFileId, '匹配:', match);
                        return match;
                    }) : [];
                    
                    const result = storeComments.map(comment => ({
                        ...comment,
                        key: comment.key || comment.id || `comment_${Date.now()}_${Math.random()}`
                    }));
                    
                    console.log('[主页面] currentComments计算 - 最终评论:', result);
                    return result;
                })
            },
            // 注意：计算属性现在在 useComputed.js 中定义
            // 这里不再需要重复定义
            onMounted: (mountedApp) => {
                logInfo('[代码审查页面] 应用已挂载');
                if (store) {
                    // 首先加载项目列表
                    store.loadProjects().then(() => {
                        // 支持通过URL参数指定 projectId 与 versionId
                        const params = new URLSearchParams(window.location.search);
                        const projectParam = params.get('projectId');
                        const versionParam = params.get('versionId');

                        if (projectParam) {
                            const hasProject = Array.isArray(store.projects.value) && store.projects.value.some(p => p && p.id === projectParam);
                            if (hasProject) {
                                store.setSelectedProject(projectParam);
                                logInfo('[代码审查页面] 通过URL设置项目:', projectParam);
                            }
                        }

                        // 如果URL未提供或无效，则使用第一个项目作为默认
                        if (!store.selectedProject.value && store.projects.value.length > 0) {
                            const defaultProject = store.projects.value[0];
                            store.setSelectedProject(defaultProject.id);
                            logInfo('[代码审查页面] 设置默认项目:', defaultProject);
                        }
                    }).then(() => {
                        // 根据URL或默认设置版本
                        const params = new URLSearchParams(window.location.search);
                        const versionParam = params.get('versionId');
                        const versions = store.availableVersions.value || [];
                        if (versionParam && versions.includes(versionParam)) {
                            store.setSelectedVersion(versionParam);
                            logInfo('[代码审查页面] 通过URL设置版本:', versionParam);
                        } else if (versions.length > 0) {
                            const defaultVersionId = versions[0];
                            store.setSelectedVersion(defaultVersionId);
                            logInfo('[代码审查页面] 设置默认版本:', defaultVersionId);
                        }

                        if (store.selectedProject.value && store.selectedVersion.value) {
                            // 加载文件树和文件数据（不包含评论，因为评论需要项目/版本信息）
                            return Promise.all([
                                store.loadFileTree(store.selectedProject.value, store.selectedVersion.value),
                                store.loadFiles(store.selectedProject.value, store.selectedVersion.value)
                            ]).then(() => {
                                // 如果URL带了fileId，尝试预选并按需加载
                                const params2 = new URLSearchParams(window.location.search);
                                const fileParam = params2.get('fileId');
                                // 读取高亮范围（兼容旧参数）与评论Key
                                const startLineParam = parseInt(params2.get('startLine'), 10);
                                const endLineParamRaw = params2.get('endLine');
                                const endLineParam = endLineParamRaw !== null ? parseInt(endLineParamRaw, 10) : NaN;
                                const commentKeyParam = params2.get('commentKey');
                                let pendingHighlightRange = null;
                                if (Number.isFinite(startLineParam)) {
                                    pendingHighlightRange = {
                                        startLine: startLineParam,
                                        endLine: Number.isFinite(endLineParam) ? endLineParam : startLineParam
                                    };
                                    window.__aicrPendingHighlightRangeInfo = pendingHighlightRange;
                                }
                                if (commentKeyParam) {
                                    window.__aicrPendingCommentKey = commentKeyParam;
                                }
                                if (fileParam) {
                                    const norm = String(fileParam).replace(/\\\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/\/+/g, '/');
                                    store.setSelectedFileId(norm);
                                    if (typeof store.loadFileById === 'function') {
                                        store.loadFileById(store.selectedProject?.value, store.selectedVersion?.value, norm).then(() => {
                                            try {
                                                const rangeInfo = window.__aicrPendingHighlightRangeInfo || pendingHighlightRange;
                                                if (rangeInfo) {
                                                    setTimeout(() => {
                                                        try {
                                                            window.dispatchEvent(new CustomEvent('highlightCodeLines', {
                                                                detail: {
                                                                    fileId: norm,
                                                                    rangeInfo
                                                                }
                                                            }));
                                                            logInfo('[代码審查] URL触发高亮事件', rangeInfo);
                                                        } catch (e) { logWarn('[代码審查] 触发高亮事件失败', e); }
                                                    }, 300);
                                                }
                                            } catch (e) { logWarn('[代码審查] URL高亮处理失败', e); }
                                        }).catch(() => {});
                                    }
                                }
                                // 初次加载后若存在挂起文件或当前选中文件无内容，尝试一次补载
                                setTimeout(() => {
                                    try {
                                        const pending = window.__aicrPendingFileId;
                                        const currentId = pending || (store.selectedFileId ? store.selectedFileId.value : null);
                                        if (currentId && typeof store.loadFileById === 'function') {
                                            const normalize3 = (v) => String(v || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/\/+/g, '/');
                                            const idNorm = normalize3(currentId);
                                            const pj = store.selectedProject ? store.selectedProject.value : null;
                                            const ver = store.selectedVersion ? store.selectedVersion.value : null;
                                            // 无论是否已有内容，项目/版本就绪后都按需加载一次，避免刷新后首次点击缺内容
                                            if (pj && ver) {
                                                store.loadFileById(pj, ver, idNorm).finally(() => { window.__aicrPendingFileId = null; });
                                            }
                                        }
                                    } catch (e) {
                                        logWarn('[主页面] 初次加载后的懒加载检查异常:', e?.message || e);
                                    }
                                }, 300);
                            });
                        }
                    }).then(() => {
                        // 项目/版本信息设置完成，加载评论数据和评论者数据
                        logInfo('[代码审查页面] 项目/版本信息设置完成，开始加载评论和评论者');
                        return Promise.all([
                            store.loadComments(),
                            store.loadCommenters()
                        ]);
                    }).then(() => {
                        // 项目/版本信息设置完成，触发评论面板重新加载
                        logInfo('[代码审查页面] 项目/版本信息设置完成，触发评论加载');
                        // 通过触发一个自定义事件来通知评论面板重新加载
                        setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('projectVersionReady', {
                                detail: {
                                    projectId: store.selectedProject.value,
                                    versionId: store.selectedVersion.value
                                }
                            }));
                            // 版本就绪后，如存在待加载文件或当前选中文件无内容，执行补载
                            try {
                                const pending = window.__aicrPendingFileId;
                                const currentId = pending || (store.selectedFileId ? store.selectedFileId.value : null);
                                if (currentId && typeof store.loadFileById === 'function') {
                                    const normalize4 = (v) => String(v || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/\/+/g, '/');
                                    const idNorm = normalize4(currentId);
                                    const pj = store.selectedProject ? store.selectedProject.value : null;
                                    const ver = store.selectedVersion ? store.selectedVersion.value : null;
                                    // 版本就绪后，无论是否已有内容，确保按需加载一次
                                    if (pj && ver) {
                                        store.loadFileById(pj, ver, idNorm).finally(() => {
                                            try {
                                                const rangeInfo = window.__aicrPendingHighlightRangeInfo;
                                                if (rangeInfo) {
                                                    setTimeout(() => {
                                                        try {
                                                            window.dispatchEvent(new CustomEvent('highlightCodeLines', {
                                                                detail: {
                                                                    fileId: idNorm,
                                                                    rangeInfo
                                                                }
                                                            }));
                                                            logInfo('[代码審查] 版本就绪后触发高亮事件', rangeInfo);
                                                        } catch (e) { logWarn('[代码審查] 触发高亮事件失败', e); }
                                                    }, 300);
                                                }
                                            } catch (e) { logWarn('[代码審查] 版本就绪高亮处理失败', e); }
                                            // 新增：按 commentKey 触发高亮
                                            try {
                                                const pendingKey = window.__aicrPendingCommentKey;
                                                if (pendingKey && Array.isArray(store.comments?.value)) {
                                                    const all = store.comments.value;
                                                    const target = all.find(c => (c.key || c.id) === pendingKey);
                                                    if (target && target.rangeInfo) {
                                                        const wantedRaw = target.fileId || (target.fileInfo && target.fileInfo.path) || idNorm;
                                                        const normalize4b = (v) => String(v || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/\/+/, '/');
                                                        const wantedId = normalize4b(wantedRaw);
                                                        if (wantedId && store.selectedFileId && store.selectedFileId.value !== wantedId) {
                                                            store.setSelectedFileId(wantedId);
                                                        }
                                                        const r = target.rangeInfo;
                                                        const normalizedRange = {
                                                            startLine: Number(r.startLine) >= 1 ? Number(r.startLine) : 1,
                                                            endLine: Number(r.endLine) >= 1 ? Number(r.endLine) : (Number(r.startLine) || 1),
                                                            startChar: r.startChar,
                                                            endChar: r.endChar
                                                        };
                                                        setTimeout(() => {
                                                            try {
                                                                window.dispatchEvent(new CustomEvent('highlightCodeLines', {
                                                                    detail: {
                                                                        fileId: wantedId,
                                                                        rangeInfo: normalizedRange,
                                                                        comment: target
                                                                    }
                                                                }));
                                                                logInfo('[代码審查] 版本就绪后按commentKey触发高亮', { key: pendingKey, range: normalizedRange });
                                                            } catch (e) { logWarn('[代码審查] 按commentKey触发高亮失败', e); }
                                                        }, 500);
                                                        window.__aicrPendingCommentKey = null;
                                                    }
                                                }
                                            } catch (e) { logWarn('[代码審查] commentKey高亮处理失败', e); }
                                            window.__aicrPendingFileId = null;
                                        });
                                    }
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
                }
                // 取消聚焦（如点击空白处）
                window.addEventListener('click', (e) => {
                    if (!e.target.closest('.comment-item')) {
                        if (window.aicrApp && window.aicrApp.reload) window.aicrApp.reload();
                    }
                });
                
                // 添加ESC快捷键监听，取消文件选中
                window.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        logInfo('[代码审查页面] ESC键被按下，取消文件选中');
                        if (store && store.selectedFileId.value) {
                            const previousFileId = store.selectedFileId.value;
                            store.setSelectedFileId(null);
                            logInfo('[代码审查页面] 已取消文件选中，之前文件ID:', previousFileId);
                            
                            // 发送清除高亮事件，通知代码视图组件清除高亮
                            setTimeout(() => {
                                logInfo('[代码审查页面] 发送清除高亮事件');
                                window.dispatchEvent(new CustomEvent('clearCodeHighlight'));
                            }, 50);
                            
                            // 触发评论面板刷新事件，恢复到显示所有评论的状态
                            setTimeout(() => {
                                logInfo('[代码审查页面] 触发评论面板刷新事件，恢复到显示所有评论');
                                window.dispatchEvent(new CustomEvent('reloadComments', {
                                    detail: { 
                                        projectId: store.selectedProject ? store.selectedProject.value : null, 
                                        versionId: store.selectedVersion ? store.selectedVersion.value : null,
                                        fileId: null,
                                        forceReload: true,
                                        showAllComments: true, // 新增：标记显示所有评论
                                        immediateReload: true // 新增：标记立即刷新，不使用防抖
                                    }
                                }));
                            }, 100);
                        }
                    }
                });
                
                // 监听评论区的代码高亮事件
                window.addEventListener('highlightCodeLines', (e) => {
                    const { fileId, rangeInfo, comment } = e.detail;
                    logInfo('[代码审查页面] 收到代码高亮事件:', { fileId, rangeInfo, comment });
                    
                    if (fileId) {
                        // 如果当前没有选中该文件，先选中文件
                        if (store && store.selectedFileId.value !== fileId) {
                            logInfo('[代码审查页面] 切换到文件:', fileId);
                            store.setSelectedFileId(fileId);
                        }
                        
                        // 发送高亮事件给代码视图组件
                        setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('highlightCodeLines', { 
                                detail: { rangeInfo, comment } 
                            }));
                        }, 100); // 给文件切换一点时间
                    }
                });
            },
            // 传递props给子组件
            props: {
                'code-view': {},
                'file-tree': {
                    tree: function() { return store.fileTree; },
                    selectedFileId: function() { return store.selectedFileId.value; },
                    expandedFolders: function() { return store.expandedFolders; },
                    loading: function() { return store.loading; },
                    error: function() { return store.errorMessage; },
                    comments: function() { return store.comments; }
                },
                'comment-panel': {
                    comments: function() { 
                        // 使用计算属性中的currentComments
                        const comments = this.currentComments || [];
                        console.log('[主页面] 传递给评论面板的评论数据:', comments);
                        return comments; 
                    },
                    file: function() { 
                        // 使用计算属性中的currentFile
                        const currentFile = this.currentFile;
                        console.log('[主页面] 传递给评论面板的文件数据:', currentFile);
                        return currentFile; 
                    },
                    loading: function() { return store.loading; },
                    error: function() { return store.errorMessage; },
                    // 传递项目/版本信息
                    projectId: function() { 
                        const projectId = store.selectedProject ? store.selectedProject.value : null;
                        console.log('[主页面] 传递给评论面板的项目ID:', projectId);
                        return projectId; 
                    },
                    versionId: function() { 
                        const versionId = store.selectedVersion ? store.selectedVersion.value : null;
                        console.log('[主页面] 传递给评论面板的版本ID:', versionId);
                        return versionId; 
                    },
                    collapsed: function() { return store.commentsCollapsed ? store.commentsCollapsed.value : false; }
                }
            },
            methods: {
                // 所有方法现在都在useMethods.js中定义
                // 添加评论提交事件处理
                handleCommentSubmit: async function(commentData) {
                    logInfo('[主页面] 收到评论提交事件:', commentData);
                    try {
                        // 从useMethods中获取handleCommentSubmit方法
                        const methods = useMethods(store);
                        await methods.handleCommentSubmit(commentData);
                    } catch (error) {
                        logError('[主页面] 评论提交失败:', error);
                    }
                },
                
                // 添加评论删除事件处理
                handleCommentDelete: async function(commentId) {
                    logInfo('[主页面] 收到评论删除事件:', commentId);
                    try {
                        // 从useMethods中获取handleCommentDelete方法
                        const methods = useMethods(store);
                        await methods.handleCommentDelete(commentId);
                    } catch (error) {
                        logError('[主页面] 评论删除失败:', error);
                    }
                },
                
                // 添加评论解决事件处理
                handleCommentResolve: async function(commentId) {
                    logInfo('[主页面] 收到评论解决事件:', commentId);
                    try {
                        // 从useMethods中获取handleCommentResolve方法
                        const methods = useMethods(store);
                        await methods.handleCommentResolve(commentId);
                    } catch (error) {
                        logError('[主页面] 评论解决失败:', error);
                    }
                },
                
                // 添加评论重新打开事件处理
                handleCommentReopen: async function(commentId) {
                    logInfo('[主页面] 收到评论重新打开事件:', commentId);
                    try {
                        // 从useMethods中获取handleCommentReopen方法
                        const methods = useMethods(store);
                        await methods.handleCommentReopen(commentId);
                    } catch (error) {
                        logError('[主页面] 评论重新打开失败:', error);
                    }
                },
                
                // 添加评论重新加载事件处理
                handleReloadComments: async function(detail) {
                    logInfo('[主页面] 收到评论重新加载事件:', detail);
                    try {
                        // 从useMethods中获取handleReloadComments方法
                        const methods = useMethods(store);
                        await methods.handleReloadComments(detail);
                    } catch (error) {
                        logError('[主页面] 评论重新加载失败:', error);
                    }
                },
                
                // 添加评论者选择事件处理
                handleCommenterSelect: function(commenters) {
                    logInfo('[主页面] 收到评论者选择事件:', commenters);
                    try {
                        const methods = useMethods(store);
                        methods.handleCommenterSelect(commenters);
                    } catch (error) {
                        logError('[主页面] 评论者选择处理失败:', error);
                    }
                },
                
                // 重构文件选择事件处理 - 避免重复的评论接口请求
                handleFileSelect: function(fileId) {
                    logInfo('[主页面] 收到文件选择事件:', fileId);
                    try {
                        // 如果传入的是树节点，把 path 提升为 fileId
                        if (typeof fileId === 'object' && fileId !== null) {
                            const node = fileId;
                            const prefer = node.path || node.id || node.name;
                            fileId = prefer;
                        }
                        // 规范化文件ID，兼容多类型与路径格式
                        if (!fileId && fileId !== 0) {
                            logWarn('[主页面] 无效的文件ID:', fileId);
                            return;
                        }
                        const normalize = (v) => {
                            try {
                                let s = String(v);
                                s = s.replace(/\\/g, '/');
                                s = s.replace(/^\.\//, '');
                                s = s.replace(/^\/+/, '');
                                s = s.replace(/\/\/+/g, '/');
                                return s;
                            } catch (e) {
                                return String(v);
                            }
                        };
                        const idNorm = normalize(fileId);
                        
                        // 检查是否与当前选中的文件相同（使用规范化比较）
                        if (normalize(store.selectedFileId.value) === idNorm) {
                            logInfo('[主页面] 文件已选中，跳过重复选择:', idNorm);
                            return;
                        }
                        
                        logInfo('[主页面] 设置新的选中文件:', idNorm);
                        
                        // 设置选中的文件ID
                        store.setSelectedFileId(idNorm);

                        // 若内容缺失，按需加载该文件
                        try {
                            const normalize2 = (v) => String(v || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/\/+/g, '/');
                            const hasContent = Array.isArray(store.files?.value) && store.files.value.some(f => {
                                const d = (f && typeof f === 'object' && f.data && typeof f.data === 'object') ? f.data : {};
                                const candidates = [f.fileId, f.id, f.path, f.name, d.fileId, d.id, d.path, d.name].filter(Boolean);
                                const matched = candidates.some(c => {
                                    const n = normalize2(c);
                                    // 完全匹配
                                    if (n === idNorm) return true;
                                    // 路径结尾匹配
                                    if (n.endsWith('/' + idNorm) || idNorm.endsWith('/' + n)) return true;
                                    // 文件名匹配
                                    const nName = n.split('/').pop();
                                    const idName = idNorm.split('/').pop();
                                    if (nName && idName && nName === idName) return true;
                                    return false;
                                });
                                return matched && typeof f.content === 'string' && f.content.length > 0;
                            });
                            if (!hasContent && typeof store.loadFileById === 'function') {
                                logInfo('[主页面] 当前文件无内容，尝试按需加载:', idNorm);
                                const pj = store.selectedProject ? store.selectedProject.value : null;
                                const ver = store.selectedVersion ? store.selectedVersion.value : null;
                                if (pj && ver) {
                                    store.loadFileById(pj, ver, idNorm).then(() => {
                                        logInfo('[主页面] 按需加载完成:', idNorm);
                                        // 强制触发视图更新
                                        this.$forceUpdate();
                                    }).catch(e => {
                                        logWarn('[主页面] 按需加载失败:', e?.message || e);
                                        // 重试一次
                                        setTimeout(() => {
                                            logInfo('[主页面] 重试按需加载:', idNorm);
                                            store.loadFileById(pj, ver, idNorm).catch(e2 => {
                                                logError('[主页面] 重试加载失败:', e2?.message || e2);
                                            });
                                        }, 1000);
                                    });
                                } else {
                                    // 项目/版本未就绪，记录待加载文件ID
                                    window.__aicrPendingFileId = idNorm;
                                    logInfo('[主页面] 项目/版本未就绪，记录待加载文件:', idNorm);
                                }
                            }
                        } catch (e) {
                            logWarn('[主页面] 按需加载检查异常:', e?.message || e);
                        }
                        
                        // 获取项目/版本信息
                        const projectId = store.selectedProject ? store.selectedProject.value : null;
                        const versionId = store.selectedVersion ? store.selectedVersion.value : null;
                        
                        // 只有在项目/版本信息完整时才触发评论加载
                        if (projectId && versionId) {
                            logInfo('[主页面] 项目/版本信息完整，触发评论加载');
                            
                            // 使用防抖机制，避免短时间内多次触发
                            if (this._commentLoadTimeout) {
                                clearTimeout(this._commentLoadTimeout);
                            }
                            
                            // 添加请求状态检查，防止重复请求
                            if (this._isLoadingComments) {
                                logInfo('[主页面] 评论正在加载中，跳过重复请求');
                                return;
                            }
                            
                            this._commentLoadTimeout = setTimeout(() => {
                                logInfo('[主页面] 延迟触发评论加载');
                                
                                // 设置加载状态
                                this._isLoadingComments = true;
                                
                                // 触发评论面板重新加载事件
                                window.dispatchEvent(new CustomEvent('reloadComments', {
                                    detail: { 
                                        projectId: projectId, 
                                        versionId: versionId,
                                        fileId: fileId,
                                        forceReload: true
                                    }
                                }));
                                
                                // 延迟重置加载状态
                                setTimeout(() => {
                                    this._isLoadingComments = false;
                                }, 1000);
                            }, 100); // 100ms防抖延迟
                        } else {
                            logInfo('[主页面] 项目/版本信息不完整，跳过评论加载');
                        }
                        
                    } catch (error) {
                        logError('[主页面] 文件选择处理失败:', error);
                    }
                },
                
                // 添加文件夹切换事件处理
                handleFolderToggle: function(folderId) {
                    logInfo('[主页面] 收到文件夹切换事件:', folderId);
                    try {
                        const methods = useMethods(store);
                        methods.handleFolderToggle(folderId);
                    } catch (error) {
                        logError('[主页面] 文件夹切换处理失败:', error);
                    }
                },
                // =============== 文件树 CRUD ===============
                handleCreateFolder: async function(payload) {
                    try {
                        const methods = useMethods(store);
                        await methods.handleCreateFolder(payload);
                        if (store && store.selectedProject.value && store.selectedVersion.value) {
                            await store.loadFileTree(store.selectedProject.value, store.selectedVersion.value);
                        }
                    } catch (error) {
                        logError('[主页面] 新建文件夹失败:', error);
                    }
                },
                handleCreateFile: async function(payload) {
                    try {
                        const methods = useMethods(store);
                        await methods.handleCreateFile(payload);
                        if (store && store.selectedProject.value && store.selectedVersion.value) {
                            await Promise.all([
                                store.loadFileTree(store.selectedProject.value, store.selectedVersion.value),
                                store.loadFiles(store.selectedProject.value, store.selectedVersion.value)
                            ]);
                        }
                    } catch (error) {
                        logError('[主页面] 新建文件失败:', error);
                    }
                },
                handleRenameItem: async function(payload) {
                    try {
                        const methods = useMethods(store);
                        await methods.handleRenameItem(payload);
                        if (store && store.selectedProject.value && store.selectedVersion.value) {
                            await Promise.all([
                                store.loadFileTree(store.selectedProject.value, store.selectedVersion.value),
                                store.loadFiles(store.selectedProject.value, store.selectedVersion.value)
                            ]);
                        }
                    } catch (error) {
                        logError('[主页面] 重命名失败:', error);
                    }
                },
                handleDeleteItem: async function(payload) {
                    try {
                        const methods = useMethods(store);
                        const { showGlobalLoading, hideGlobalLoading } = await import('/utils/loading.js');
                        showGlobalLoading('正在删除，请稍候...');
                        try {
                            await methods.handleDeleteItem(payload);
                            if (store && store.selectedProject.value && store.selectedVersion.value) {
                                await Promise.all([
                                    store.loadFileTree(store.selectedProject.value, store.selectedVersion.value),
                                    store.loadFiles(store.selectedProject.value, store.selectedVersion.value)
                                ]);
                            }
                        } finally {
                            try { hideGlobalLoading(); } catch (_) {}
                        }
                    } catch (error) {
                        logError('[主页面] 删除失败:', error);
                    }
                },
                
                // 搜索相关方法
                handleSearchInput: function(event) {
                    logInfo('[主页面] 收到搜索输入事件');
                    try {
                        const methods = useMethods(store);
                        methods.handleSearchInput(event);
                    } catch (error) {
                        logError('[主页面] 搜索输入处理失败:', error);
                    }
                },
                
                clearSearch: function() {
                    logInfo('[主页面] 收到清除搜索事件');
                    try {
                        const methods = useMethods(store);
                        methods.clearSearch();
                    } catch (error) {
                        logError('[主页面] 清除搜索失败:', error);
                    }
                },
                
                handleMessageInput: function(event) {
                    logInfo('[主页面] 收到消息输入事件');
                    try {
                        const methods = useMethods(store);
                        methods.handleMessageInput(event);
                    } catch (error) {
                        logError('[主页面] 消息输入处理失败:', error);
                    }
                },
                
                handleCompositionStart: function(event) {
                    logInfo('[主页面] 收到输入法开始事件');
                    try {
                        const methods = useMethods(store);
                        methods.handleCompositionStart(event);
                    } catch (error) {
                        logError('[主页面] 输入法开始处理失败:', error);
                    }
                },
                
                handleCompositionEnd: function(event) {
                    logInfo('[主页面] 收到输入法结束事件');
                    try {
                        const methods = useMethods(store);
                        methods.handleCompositionEnd(event);
                    } catch (error) {
                        logError('[主页面] 输入法结束处理失败:', error);
                    }
                },
                // 下载当前项目版本（打包为ZIP）
                handleDownloadProjectVersion: async function() {
                    logInfo('[主页面] 触发项目版本下载');
                    try {
                        const methods = useMethods(store);
                        await methods.handleDownloadProjectVersion();
                    } catch (error) {
                        logError('[主页面] 项目版本下载失败:', error);
                        alert('下载失败：' + (error?.message || '未知错误'));
                    }
                },
                // 触发选择ZIP
                triggerUploadProjectVersion: function() {
                    try {
                        const methods = useMethods(store);
                        methods.triggerUploadProjectVersion();
                    } catch (e) {
                        logError('[主页面] 触发上传选择失败:', e);
                    }
                },
                // 处理上传ZIP
                handleUploadProjectVersion: async function(e) {
                    try {
                        const methods = useMethods(store);
                        await methods.handleUploadProjectVersion(e);
                    } catch (error) {
                        logError('[主页面] 项目版本上传失败:', error);
                        alert('上传失败：' + (error?.message || '未知错误'));
                    } finally {
                        try { e.target.value = ''; } catch (_) {}
                    }
                },
                

                

                
                refreshData: function() {
                    logInfo('[主页面] 收到刷新数据事件');
                    try {
                        const methods = useMethods(store);
                        methods.refreshData();
                    } catch (error) {
                        logError('[主页面] 刷新数据处理失败:', error);
                    }
                },
                
                // 侧边栏和评论区切换
                toggleSidebar: function() {
                    logInfo('[主页面] 收到侧边栏切换事件');
                    try {
                        const methods = useMethods(store);
                        methods.toggleSidebar();
                    } catch (error) {
                        logError('[主页面] 侧边栏切换处理失败:', error);
                    }
                },
                
                toggleComments: function() {
                    logInfo('[主页面] 收到评论区切换事件');
                    try {
                        const methods = useMethods(store);
                        methods.toggleComments();
                    } catch (error) {
                        logError('[主页面] 评论区切换处理失败:', error);
                    }
                },
                
                // 处理评论输入
                handleCommentInput: function(event) {
                    logInfo('[主页面] 收到评论输入事件');
                    try {
                        // 更新newComment数据
                        this.newComment = event.target.value;
                        const methods = useMethods(store);
                        methods.handleCommentInput(event);
                    } catch (error) {
                        logError('[主页面] 评论输入处理失败:', error);
                    }
                }
                ,
                // =============== 项目与版本维护 ===============
                // 代理到公共方法（store/useMethods）
                openProjectVersionManager: function() {
                    const methods = useMethods(store);
                    methods.openProjectVersionManager();
                },
                closeProjectVersionManager: function() {
                    const methods = useMethods(store);
                    methods.closeProjectVersionManager();
                },
                pvSelectProject: function(projectId) {
                    const methods = useMethods(store);
                    methods.pvSelectProject(projectId);
                },
                pvAddProject: function() {
                    const methods = useMethods(store);
                    methods.pvAddProject();
                },
                pvDeleteProject: function(projectId) {
                    const methods = useMethods(store);
                    methods.pvDeleteProject(projectId);
                },
                pvAddVersion: function() {
                    const methods = useMethods(store);
                    methods.pvAddVersion();
                },
                pvDeleteVersion: function(versionId) {
                    const methods = useMethods(store);
                    methods.pvDeleteVersion(versionId);
                },
                pvSave: async function() {
                    const methods = useMethods(store);
                    await methods.pvSave();
                }
            }
        });
        window.aicrApp = app;
        window.aicrStore = store;
        
        // 确保store中的评论者方法可用
        logInfo('[代码审查页面] store已暴露到全局，评论者方法:', {
            loadCommenters: !!store.loadCommenters,
            addCommenter: !!store.addCommenter,
            updateCommenter: !!store.updateCommenter,
            deleteCommenter: !!store.deleteCommenter,
            setSelectedCommenterIds: !!store.setSelectedCommenterIds
        });
        
        if (window.aicrApp && window.aicrApp.reload) {
            const oldReload = window.aicrApp.reload;
            window.aicrApp.reload = function() {
                logInfo('[AICR主页面] reload 被调用');
                oldReload.apply(this, arguments);
            };
        }
    } catch (error) {
        logError('[代码审查页面] 应用初始化失败:', error);
    }
})();














