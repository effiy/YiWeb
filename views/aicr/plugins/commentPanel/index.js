// 代码评审评论面板组件 - 负责代码评审评论的展示和管理
// 作者：liangliang

import { safeExecute, createError, ErrorTypes } from '/utils/error.js';
import { loadCSSFiles } from '/utils/baseView.js';
import { getData } from '/apis/index.js';

// 自动加载相关的CSS文件
loadCSSFiles([
    '/views/aicr/plugins/commentPanel/index.css'
]);

// 异步加载HTML模板
async function loadTemplate() {
    try {
        const response = await fetch('/views/aicr/plugins/commentPanel/index.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error('加载模板失败:', error);
        return;
    }
}

// 新增：异步获取评论数据（从mongo api）
async function fetchCommentsFromMongo(file) {
    try {
        // 假设有一个API接口用于获取评论，传入file信息
        // 你可以根据实际API调整URL和参数
        let url = `${window.API_URL}/mongodb/?cname=comments`;
        if (file) {
            // 兼容不同的文件ID字段
            const fileId = file.fileId || file.id || file.path || file.key;
            if (fileId) {
                url += `&fileId=${fileId}`;
            }
        }
        console.log('[CommentPanel] 调用MongoDB接口:', url);
        const response = await getData(url, { method: 'GET' });
        console.log('[CommentPanel] 获取评论数据:', response.data.list);
        // 期望返回数组，如果response是数组则直接返回，否则返回空数组
        return Array.isArray(response.data.list) ? response.data.list : [];
    } catch (err) {
        console.error('[CommentPanel] 获取评论数据失败:', err);
        return [];
    }
}

// 创建组件定义
const createCommentPanel = async () => {
    const template = await loadTemplate();

    return {
        name: 'CommentPanel',
        props: {
            comments: {
                type: Array,
                // 默认值通过异步获取mongo评论
                default: () => []
            },
            file: {
                type: Object,
                default: null
            },
            newComment: {
                type: String,
                default: ''
            },
            loading: {
                type: Boolean,
                default: false
            },
            error: {
                type: String,
                default: ''
            }
        },
        emits: [
            'comment-submit', 
            'comment-input', 
            'comment-delete', 
            'comment-resolve',
            'comment-reopen',
            'commenter-select'
        ],
        data() {
            return {
                replyingTo: null,
                replyContent: '',
                commenters: [
                    { id: 'user1', name: '张三', avatar: null, forSystem: '' },
                    { id: 'user2', name: '李四', avatar: null, forSystem: '' },
                    { id: 'user3', name: '王五', avatar: null, forSystem: '' },
                    { id: 'user4', name: '赵六', avatar: null, forSystem: '' },
                    { id: 'user5', name: '孙七', avatar: null, forSystem: '' }
                ], // 评论者列表 - 设置默认值
                selectedCommenterIds: ['user1'], // 选中的评论者ID数组（多选）- 默认选中第一个
                commentersLoading: false, // 评论者数据加载状态
                commentersError: '', // 评论者数据加载错误
                commentsLoading: false, // 新增：评论加载状态
                commentsError: '',     // 新增：评论加载错误
                mongoComments: []      // 新增：实际评论数据
            };
        },
        watch: {
            // 监听文件变化，重新加载评论
            file: {
                handler: async function(newFile, oldFile) {
                    console.log('[CommentPanel] 文件变化:', newFile, oldFile);
                    if (newFile && newFile !== oldFile) {
                        console.log('[CommentPanel] 文件已变化，重新加载评论');
                        await this.loadMongoComments();
                    }
                },
                immediate: true
            },
            // 监听评论数据变化
            comments: {
                handler: function(newComments, oldComments) {
                    console.log('[CommentPanel] 评论数据变化:', newComments, oldComments);
                },
                deep: true
            }
        },
        async mounted() {
            console.log('[CommentPanel] 组件已挂载');
            console.log('[CommentPanel] 初始评论数据:', this.comments);
            console.log('[CommentPanel] 初始loading状态:', this.loading);
            console.log('[CommentPanel] 初始error状态:', this.error);
            console.log('[CommentPanel] 初始文件数据:', this.file);

            // 初始化文件跟踪
            this._lastFile = this.file;

            // 加载评论者数据
            this.loadCommenters();

            // 初始加载mongo评论数据
            await this.loadMongoComments();

            // 确保评论者数据在组件挂载后立即加载
            this.$nextTick(() => {
                console.log('[CommentPanel] 组件挂载完成，评论者数据:', this.commenters);
                console.log('[CommentPanel] 选中的评论者:', this.selectedCommenterIds);
                console.log('[CommentPanel] 最终渲染评论数据:', this.renderComments);
            });

            // 监听获取评论者信息的事件
            this.handleGetSelectedCommenters = (event) => {
                console.log('[CommentPanel] 收到获取评论者信息事件');
                const callback = event.detail?.callback;
                if (callback && typeof callback === 'function') {
                    const selectedCommenters = this.commenters.filter(c => this.selectedCommenterIds.includes(c.id));
                    console.log('[CommentPanel] 返回选中的评论者:', selectedCommenters);
                    callback(selectedCommenters);
                }
            };
            window.addEventListener('getSelectedCommenters', this.handleGetSelectedCommenters);
        },
        updated() {
            console.log('[CommentPanel] 组件已更新');
            console.log('[CommentPanel] 更新后文件数据:', this.file);
            console.log('[CommentPanel] 更新后mongoComments数量:', this.mongoComments ? this.mongoComments.length : 0);
            console.log('[CommentPanel] 更新后props comments数量:', this.comments ? this.comments.length : 0);
            console.log('[CommentPanel] 更新后renderComments数量:', this.renderComments ? this.renderComments.length : 0);
            console.log('[CommentPanel] 更新后loading状态:', this.loading);
            console.log('[CommentPanel] 更新后error状态:', this.error);
            console.log('[CommentPanel] 更新后评论者数据:', this.commenters);
            console.log('[CommentPanel] 更新后评论者数量:', this.commenters.length);
            console.log('[CommentPanel] 更新后选中的评论者:', this.selectedCommenterIds);
            
            // 当文件变化时，重新加载评论
            if (this.file !== this._lastFile) {
                console.log('[CommentPanel] 文件发生变化，重新加载评论');
                this._lastFile = this.file;
                this.loadMongoComments();
            }
        },

        beforeUnmount() {
            // 清理事件监听器
            window.removeEventListener('getSelectedCommenters', this.handleGetSelectedCommenters);
        },
        computed: {
            // 评论统计
            commentStats() {
                return safeExecute(() => {
                    // 使用renderComments计算属性
                    const commentsArr = this.renderComments;
                    console.log('[CommentPanel] 接收到的评论数据:', commentsArr);
                    const total = commentsArr.length;
                    const resolved = commentsArr.filter(c => c.status === 'resolved').length;
                    const pending = commentsArr.filter(c => c.status === 'pending' || !c.status).length;
                    const withReplies = commentsArr.filter(c => c.replies && c.replies.length > 0).length;
                    const totalReplies = commentsArr.reduce((sum, c) => sum + (c.replies ? c.replies.length : 0), 0);

                    console.log('[CommentPanel] 评论统计:', { total, resolved, pending, withReplies, totalReplies });
                    return {
                        total,
                        resolved,
                        pending,
                        withReplies,
                        totalReplies
                    };
                }, '评论统计计算');
            },

            // 评论者统计
            commenterStats() {
                return safeExecute(() => {
                    const total = this.commenters.length;
                    const selected = this.selectedCommenterIds.length;
                    const available = this.commenters.filter(c => !c.disabled).length;

                    console.log('[CommentPanel] 评论者统计:', { total, selected, available });
                    return {
                        total,
                        selected,
                        available
                    };
                }, '评论者统计计算');
            },

            // 新增：实际用于渲染的评论列表
            renderComments() {
                // 优先用mongoComments，如果mongoComments有数据则使用，否则使用props中的comments
                const commentsToRender = (this.mongoComments && this.mongoComments.length > 0) ? this.mongoComments : this.comments;
                console.log('[CommentPanel] renderComments - 当前文件:', this.file);
                console.log('[CommentPanel] renderComments - mongoComments数量:', this.mongoComments ? this.mongoComments.length : 0);
                console.log('[CommentPanel] renderComments - props comments数量:', this.comments ? this.comments.length : 0);
                console.log('[CommentPanel] renderComments - 最终渲染评论数量:', commentsToRender ? commentsToRender.length : 0);
                return commentsToRender || [];
            }
        },
        methods: {
            // 加载mongo评论数据
            async loadMongoComments() {
                return safeExecute(async () => {
                    console.log('[CommentPanel] 开始加载mongo评论数据...');
                    console.log('[CommentPanel] 当前文件:', this.file);
                    this.commentsLoading = true;
                    this.commentsError = '';

                    try {
                        // 无论是否有文件，都调用MongoDB接口
                        // 如果没有文件，fetchCommentsFromMongo会调用不带fileId参数的接口
                        const mongoComments = await fetchCommentsFromMongo(this.file);
                        
                        // 确保评论数据有正确的key属性
                        this.mongoComments = mongoComments
                        
                        console.log('[CommentPanel] 从mongo加载的评论:', this.mongoComments);
                    } catch (err) {
                        this.commentsError = '加载评论失败';
                        console.error('[CommentPanel] 评论加载失败:', err);
                    } finally {
                        this.commentsLoading = false;
                    }
                }, 'mongo评论数据加载');
            },

            // 加载评论者数据
            async loadCommenters() {
                return safeExecute(async () => {
                    console.log('[CommentPanel] 开始加载评论者数据...');
                    this.commentersLoading = true;
                    this.commentersError = '';

                    try {
                        // 调用接口获取评论者数据
                        console.log('[CommentPanel] 尝试从接口获取评论者数据...');
                        const response = await getData(`${window.DATA_URL}/prompts/aicr/commenter4crad.txt`);
                        this.commenters[0].forSystem = response;

                    } catch (error) {
                        console.error('[CommentPanel] 加载评论者数据失败:', error);
                        this.commentersError = '加载评论者数据失败';

                        // 保持默认数据，不重新设置
                        console.log('[CommentPanel] 错误处理中保持默认数据');
                        console.log('[CommentPanel] 当前评论者数据:', this.commenters);
                        console.log('[CommentPanel] 当前评论者数量:', this.commenters.length);
                        console.log('[CommentPanel] 当前评论者详情:', this.commenters.map(c => ({ id: c.id, name: c.name })));
                    } finally {
                        this.commentersLoading = false;
                        console.log('[CommentPanel] 评论者数据加载完成，最终数据:', this.commenters);
                        console.log('[CommentPanel] 最终评论者数量:', this.commenters.length);
                        console.log('[CommentPanel] 最终评论者详情:', this.commenters.map(c => ({ id: c.id, name: c.name })));
                    }
                }, '评论者数据加载');
            },

            // 选择评论者
            selectCommenters(commenterIds) {
                return safeExecute(() => {
                    console.log('[CommentPanel] 选择评论者:', commenterIds);

                    this.selectedCommenterIds = commenterIds;
                    this.$emit('commenter-select', this.commenters.filter(c => commenterIds.includes(c.id)));
                }, '评论者选择处理');
            },

            // 切换单个评论者选择状态
            toggleCommenter(commenter) {
                return safeExecute(() => {
                    console.log('[CommentPanel] 切换评论者选择:', commenter);

                    const index = this.selectedCommenterIds.indexOf(commenter.id);
                    if (index > -1) {
                        // 如果已选中，则取消选择
                        this.selectedCommenterIds.splice(index, 1);
                    } else {
                        // 如果未选中，则添加到选择列表
                        this.selectedCommenterIds.push(commenter.id);
                    }

                    this.$emit('commenter-select', this.commenters.filter(c => this.selectedCommenterIds.includes(c.id)));
                }, '评论者切换选择处理');
            },

            // 获取评论者头像样式
            getCommenterAvatar(commenter) {
                return safeExecute(() => {
                    if (commenter.avatar) {
                        return {
                            backgroundImage: `url(${commenter.avatar})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            text: ''
                        };
                    }

                    // 优化的头像生成逻辑 - 使用主题色系
                    const colorPalettes = [
                        // 量子蓝紫系
                        { bg: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', text: '#ffffff' },
                        { bg: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)', text: '#ffffff' },
                        { bg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', text: '#ffffff' },
                        // 量子青系
                        { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', text: '#ffffff' },
                        { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', text: '#ffffff' },
                        // 艺术家色系
                        { bg: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', text: '#ffffff' },
                        { bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', text: '#ffffff' },
                        { bg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', text: '#ffffff' }
                    ];

                    const index = commenter.name.charCodeAt(0) % colorPalettes.length;
                    const palette = colorPalettes[index];

                    return {
                        background: palette.bg,
                        color: palette.text,
                        text: commenter.name.charAt(0).toUpperCase(),
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    };
                }, '评论者头像生成');
            },

            // 提交评论
            submitComment() {
                return safeExecute(() => {
                    if (!this.newComment.trim()) {
                        throw createError('评论内容不能为空', ErrorTypes.VALIDATION, '评论提交');
                    }

                    // 如果有选中的评论者，添加fromSystem字段
                    const commentData = {
                        content: this.newComment.trim()
                    };

                    if (this.selectedCommenterIds.length > 0) {
                        const selectedCommenters = this.commenters.filter(c => this.selectedCommenterIds.includes(c.id));
                        if (selectedCommenters.length > 0) {
                            commentData.fromSystem = selectedCommenters;
                        }
                    }

                    this.$emit('comment-submit', commentData);
                }, '评论提交处理');
            },

            // 处理评论输入
            handleCommentInput(event) {
                return safeExecute(() => {
                    this.$emit('comment-input', event);
                }, '评论输入处理');
            },

            // 删除评论
            deleteComment(commentId) {
                return safeExecute(() => {
                    if (confirm('确定要删除这条评论吗？')) {
                        this.$emit('comment-delete', commentId);
                    }
                }, '评论删除处理');
            },

            // 解决评论
            resolveComment(commentId) {
                return safeExecute(() => {
                    this.$emit('comment-resolve', commentId);
                }, '评论解决处理');
            },

            // 重新打开评论
            reopenComment(commentId) {
                return safeExecute(() => {
                    this.$emit('comment-reopen', commentId);
                }, '评论重开处理');
            },

            // 取消回复
            cancelReply() {
                return safeExecute(() => {
                    this.replyingTo = null;
                    this.replyContent = '';
                }, '取消回复处理');
            },

            // 格式化时间
            formatTime(timestamp) {
                return safeExecute(() => {
                    if (!timestamp) return '';

                    const date = new Date(timestamp);
                    const now = new Date();
                    const diff = now - date;

                    if (diff < 60000) return '刚刚';
                    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
                    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;

                    return date.toLocaleDateString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }, '时间格式化');
            },

            // 获取评论作者头像
            getAuthorAvatar(author) {
                return safeExecute(() => {
                    // 简单的头像生成逻辑
                    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
                    const index = author.charCodeAt(0) % colors.length;
                    return {
                        backgroundColor: colors[index],
                        color: '#fff',
                        text: author.charAt(0).toUpperCase()
                    };
                }, '头像生成');
            },

            // 获取评论类型标签
            getCommentTypeLabel(type) {
                const typeLabels = {
                    'suggestion': '建议',
                    'question': '问题',
                    'bug': '错误',
                    'discussion': '讨论',
                    'praise': '表扬',
                    'nitpick': '细节'
                };
                return typeLabels[type] || type;
            },

            // 获取评论状态标签
            getCommentStatusLabel(status) {
                const statusLabels = {
                    'pending': '待处理',
                    'resolved': '已解决',
                    'closed': '已关闭',
                    'wontfix': '不修复'
                };
                return statusLabels[status] || status;
            },

            // 获取评论状态CSS类
            getCommentStatusClass(status) {
                if (!status || status === 'pending') return 'status-pending';
                return `status-${status}`;
            },

            // 获取文件名
            getFileName(filePath) {
                return safeExecute(() => {
                    if (!filePath) return '';
                    const parts = filePath.split('/');
                    return parts[parts.length - 1];
                }, '文件名提取');
            },

            // 高亮代码区对应行
            highlightCode(comment) {
                return safeExecute(() => {
                    if (!comment || !comment.rangeInfo) {
                        console.log('[CommentPanel] 评论或rangeInfo为空');
                        return;
                    }
                    
                    console.log('[CommentPanel] 点击引用代码，评论信息:', comment);
                    
                    // 获取文件信息
                    const fileId = comment.fileId || (comment.fileInfo && comment.fileInfo.path);
                    const rangeInfo = comment.rangeInfo;
                    
                    if (!fileId) {
                        console.log('[CommentPanel] 评论中没有文件信息');
                        return;
                    }
                    
                    // 确保行号是从1开始的
                    // 如果行号已经是1或更大，就不需要转换
                    const normalizedRangeInfo = {
                        startLine: rangeInfo.startLine >= 1 ? rangeInfo.startLine : rangeInfo.startLine + 1,
                        endLine: rangeInfo.endLine >= 1 ? rangeInfo.endLine : rangeInfo.endLine + 1,
                        startChar: rangeInfo.startChar,
                        endChar: rangeInfo.endChar
                    };
                    
                    console.log('[CommentPanel] 原始行号:', rangeInfo.startLine, '-', rangeInfo.endLine);
                    console.log('[CommentPanel] 标准化行号:', normalizedRangeInfo.startLine, '-', normalizedRangeInfo.endLine);
                    
                    // 发送事件，包含文件信息和行号信息
                    const eventData = {
                        fileId: fileId,
                        rangeInfo: normalizedRangeInfo,
                        comment: comment
                    };
                    
                    console.log('[CommentPanel] 发送highlightCodeLines事件:', eventData);
                    window.dispatchEvent(new CustomEvent('highlightCodeLines', { detail: eventData }));
                }, '高亮代码区行');
            }
        },
        template: template,
        // Vue 3 兼容性设置
        setup(props, { emit }) {
            // 这里可以添加setup逻辑
            return {};
        }
    };
};

// 初始化组件并全局暴露
(async function initComponent() {
    try {
        const CommentPanel = await createCommentPanel();
        window.CommentPanel = CommentPanel;

        // 触发自定义事件，通知组件已加载完成
        window.dispatchEvent(new CustomEvent('CommentPanelLoaded', { detail: CommentPanel }));

        console.log('[CommentPanel] 代码评审评论面板组件初始化完成');
        console.log('[CommentPanel] 组件对象:', CommentPanel);
    } catch (error) {
        console.error('CommentPanel 组件初始化失败:', error);
    }
})();



