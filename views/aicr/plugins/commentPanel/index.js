// 代码评审评论面板组件 - 负责代码评审评论的展示和管理
// 作者：liangliang

import { safeExecute, createError, ErrorTypes } from '/utils/error.js';
import { loadCSSFiles } from '/utils/baseView.js';

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

// 创建组件定义
const createCommentPanel = async () => {
    const template = await loadTemplate();
    
    return {
        name: 'CommentPanel',
        props: {
            comments: {
                type: Array,
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
            'comment-reopen'
        ],
        data() {
            return {
                replyingTo: null,
                replyContent: ''
            };
        },
        mounted() {
            console.log('[CommentPanel] 组件已挂载');
            console.log('[CommentPanel] 初始评论数据:', this.comments);
            console.log('[CommentPanel] 初始loading状态:', this.loading);
            console.log('[CommentPanel] 初始error状态:', this.error);
        },
        updated() {
            console.log('[CommentPanel] 组件已更新');
            console.log('[CommentPanel] 更新后评论数据:', this.comments);
            console.log('[CommentPanel] 更新后loading状态:', this.loading);
            console.log('[CommentPanel] 更新后error状态:', this.error);
        },
        computed: {
            // 评论统计
            commentStats() {
                return safeExecute(() => {
                    console.log('[CommentPanel] 接收到的评论数据:', this.comments);
                    const total = this.comments.length;
                    const resolved = this.comments.filter(c => c.status === 'resolved').length;
                    const pending = this.comments.filter(c => c.status === 'pending' || !c.status).length;
                    const withReplies = this.comments.filter(c => c.replies && c.replies.length > 0).length;
                    const totalReplies = this.comments.reduce((sum, c) => sum + (c.replies ? c.replies.length : 0), 0);
                    
                    console.log('[CommentPanel] 评论统计:', { total, resolved, pending, withReplies, totalReplies });
                    return {
                        total,
                        resolved,
                        pending,
                        withReplies,
                        totalReplies
                    };
                }, '评论统计计算');
            }
        },
        methods: {
            // 提交评论
            submitComment() {
                return safeExecute(() => {
                    if (!this.newComment.trim()) {
                        throw createError('评论内容不能为空', ErrorTypes.VALIDATION, '评论提交');
                    }
                    this.$emit('comment-submit', {
                        content: this.newComment.trim()
                    });
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
            highlightCode(rangeInfo) {
                return safeExecute(() => {
                    if (!rangeInfo) return;
                    window.dispatchEvent(new CustomEvent('highlightCodeLines', { detail: rangeInfo }));
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


