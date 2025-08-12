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
                    const currentFile = fileId && store.files ? store.files.value.find(f => {
                        const fileIdentifier = f.fileId || f.id || f.path;
                        const match = fileIdentifier === fileId;
                        console.log('[主页面] currentFile计算 - 检查文件:', f.name, '标识符:', fileIdentifier, '匹配:', match);
                        return match;
                    }) : null;
                    console.log('[主页面] currentFile计算 - 找到的文件:', currentFile);
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
                        // 设置默认项目
                        if (store.projects.value.length > 0) {
                            const defaultProject = store.projects.value[0];
                            store.setSelectedProject(defaultProject.id);
                            logInfo('[代码审查页面] 设置默认项目:', defaultProject);
                            
                            // 版本列表现在通过setSelectedProject自动更新
                            logInfo('[代码审查页面] 版本列表已自动更新');
                        }
                    }).then(() => {
                        // 设置默认版本
                        if (store.availableVersions.value.length > 0) {
                            const defaultVersion = store.availableVersions.value[0];
                            store.setSelectedVersion(defaultVersion.id);
                            logInfo('[代码审查页面] 设置默认版本:', defaultVersion);
                            
                            // 加载文件树和文件数据（不包含评论，因为评论需要项目/版本信息）
                            return Promise.all([
                                store.loadFileTree(),
                                store.loadFiles()
                            ]);
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
                        }, 500);
                    }).then(() => {
                        logInfo('[代码审查页面] 数据加载完成');
                        // 如果没有选中文件，选择第一个文件
                        if (!store.selectedFileId.value && store.files && store.files.length > 0) {
                            const firstFile = store.files[0];
                            const fileId = firstFile.id || firstFile.path || firstFile.fileId;
                            store.setSelectedFileId(fileId);
                            logInfo('[代码审查页面] 自动选择第一个文件:', firstFile, '文件ID:', fileId);
                        }
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
                        // 检查文件ID是否有效
                        if (!fileId || typeof fileId !== 'string') {
                            logWarn('[主页面] 无效的文件ID:', fileId);
                            return;
                        }
                        
                        // 检查是否与当前选中的文件相同
                        if (store.selectedFileId.value === fileId) {
                            logInfo('[主页面] 文件已选中，跳过重复选择:', fileId);
                            return;
                        }
                        
                        logInfo('[主页面] 设置新的选中文件:', fileId);
                        
                        // 设置选中的文件ID
                        store.setSelectedFileId(fileId);
                        
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











