/**
 * 代码审查页面主入口
 * author: liangliang
 */
import { createStore } from '/views/aicr/hooks/store.js';
import { useComputed } from '/views/aicr/hooks/useComputed.js';
import { useMethods } from '/views/aicr/hooks/useMethods.js';
import { createBaseView } from '/utils/baseView.js';

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
            // 生成唯一id
            const id = 'cmt_' + Date.now() + '_' + Math.floor(Math.random()*10000);
            // 假设当前文件id为store.selectedFileId
            const fileId = store.selectedFileId || (store.state && store.state.selectedFileId);
            // 记录range的起止行号和字符索引
            let startLine = 0, endLine = 0, startChar = 0, endChar = 0;
            if (detail.range) {
                const range = detail.range;
                // 获取起止节点的父元素（.code-line）
                const pre = range.startContainer.parentElement;
                const post = range.endContainer.parentElement;
                if (pre && pre.classList.contains('code-line')) {
                    startLine = parseInt(pre.getAttribute('data-line')) || 0;
                }
                if (post && post.classList.contains('code-line')) {
                    endLine = parseInt(post.getAttribute('data-line')) || 0;
                }
                // 获取字符级索引
                if (range.startContainer.nodeType === 3 && pre) {
                    startChar = range.startOffset;
                }
                if (range.endContainer.nodeType === 3 && post) {
                    endChar = range.endOffset;
                }
            }
            // 兼容性处理
            if (!startLine || !endLine) {
                startLine = endLine = 0;
            }
            localState.codeComments.push({
                id,
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
                selectedFileId: store.selectedFileId,
                expandedFolders: store.expandedFolders,
                loading: store.loading,
                errorMessage: store.errorMessage,
                comments: store.comments,
                sidebarCollapsed: store.sidebarCollapsed,
                commentsCollapsed: store.commentsCollapsed
            },
            computed: {
                // 当前文件的评论
                currentComments() {
                    const fileId = store.selectedFileId || (store.state && store.state.selectedFileId);
                    console.log('[currentComments] 当前文件ID:', fileId);
                    console.log('[currentComments] store.comments:', store.comments);
                    
                    // 合并本地评论和store中的评论
                    const localComments = localState.codeComments.filter(c => c.fileId === fileId);
                    const storeComments = store.comments ? store.comments.filter(c => {
                        // 兼容不同的文件标识方式
                        const commentFileId = c.fileId || (c.fileInfo && c.fileInfo.path);
                        console.log('[currentComments] 评论文件ID:', commentFileId, '当前文件ID:', fileId);
                        return commentFileId === fileId;
                    }) : [];
                    const allComments = [...localComments, ...storeComments];
                    
                    console.log('[currentComments] 本地评论数量:', localComments.length);
                    console.log('[currentComments] store评论数量:', storeComments.length);
                    console.log('[currentComments] 总评论数量:', allComments.length);
                    console.log('[currentComments] 所有评论详情:', allComments);
                    return allComments;
                }
            },
            onMounted: (mountedApp) => {
                console.log('[代码审查页面] 应用已挂载');
                if (store) {
                    Promise.all([
                        store.loadFileTree(),
                        store.loadFiles(),
                        store.loadComments()
                    ]).then(() => {
                        console.log('[代码审查页面] 数据加载完成');
                        // 如果没有选中文件，选择第一个文件
                        if (!store.selectedFileId && store.files && store.files.length > 0) {
                            store.setSelectedFileId(store.files[0].id || store.files[0].path);
                            console.log('[代码审查页面] 自动选择第一个文件:', store.files[0]);
                        }
                    }).catch(error => {
                        console.error('[代码审查页面] 数据加载失败:', error);
                    });
                }
                // 取消聚焦（如点击空白处）
                window.addEventListener('click', (e) => {
                    if (!e.target.closest('.comment-item')) {
                        if (window.aicrApp && window.aicrApp.reload) window.aicrApp.reload();
                    }
                });
            },
            // 传递props给子组件
            props: {
                'code-view': {},
                'file-tree': {
                    tree: function() { return store.fileTree; },
                    selectedFileId: function() { return store.selectedFileId; },
                    expandedFolders: function() { return store.expandedFolders; },
                    loading: function() { return store.loading; },
                    error: function() { return store.errorMessage; },
                    comments: function() { return store.comments; }
                },
                'comment-panel': {
                    comments: function() { return this.currentComments; },
                    newComment: function() { return store.newComment; },
                    loading: function() { return store.loading; },
                    error: function() { return store.errorMessage; }
                }
            },
            methods: {
                // 这里可以添加其他特定于主视图的方法
            }
        });
        window.aicrApp = app;
        window.aicrStore = store;
        if (window.aicrApp && window.aicrApp.reload) {
            const oldReload = window.aicrApp.reload;
            window.aicrApp.reload = function() {
                console.log('[AICR主页面] reload 被调用');
                oldReload.apply(this, arguments);
            };
        }
    } catch (error) {
        console.error('[代码审查页面] 应用初始化失败:', error);
    }
})();




