// 新闻页评论列表组件（与 AICR 评论样式保持一致的展示）
// 作者：liangliang

import { loadCSSFiles } from '/utils/baseView.js';
import { getData } from '/apis/index.js';
import { formatDate } from '/utils/date.js';
// 导入日志工具，确保 window.logError 等函数可用
import '/utils/log.js';

// 直接复用 AICR 评论面板样式，确保视觉与交互一致
loadCSSFiles([
    '/views/aicr/plugins/commentPanel/index.css',
    '/views/news/plugins/commentsList/index.css'
]);

// 异步加载模板
async function loadTemplate() {
    try {
        const res = await fetch('/views/news/plugins/commentsList/index.html');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.text();
    } catch (e) {
        console.error('[CommentsList] 加载模板失败:', e);
        return;
    }
}

// 简单的时间显示
function formatTime(ts) {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const createCommentsList = async () => {
    const template = await loadTemplate();
    return {
        name: 'CommentsList',
        props: {
            // 可选：按新闻链接过滤（后续可由父级传入）
            newsLink: {
                type: String,
                default: ''
            },
            // 日期字符串，格式 YYYY-MM-DD，用于按天拉取评论
            dateStr: {
                type: String,
                default: ''
            },
            collapsed: {
                type: Boolean,
                default: false
            }
        },
        emits: ['toggle-collapse'],
        data() {
            return {
                loading: false,
                error: '',
                comments: [],
                internalCollapsed: this.collapsed
            };
        },
        watch: {
            collapsed(val) {
                this.internalCollapsed = val;
            },
            dateStr() {
                this.loadComments();
            },
            newsLink() {
                this.loadComments();
            }
        },
        methods: {
            toggleCollapse() {
                this.internalCollapsed = !this.internalCollapsed;
                this.$emit('toggle-collapse');
            },
            openInAicr(comment) {
                try {
                    // 目标路径：/views/aicr/index.html
                    // 若有文件信息，拼接查询参数以便 AICR 高亮/定位
                    const base = '/views/aicr/index.html';
                    const params = new URLSearchParams();
                    const fileId = comment?.fileId || comment?.fileInfo?.path || comment?.filePath || '';
                    if (fileId) params.set('fileId', fileId);
                    // 若后端存有项目/版本，可透传（与 AICR 页面逻辑一致）
                    if (comment?.projectId) params.set('projectId', comment.projectId);
                    if (comment?.versionId) params.set('versionId', comment.versionId);
                    // 仅透传评论标识，用于目标页在资源加载完后自行查找并高亮
                    const key = comment?.key || comment?.id;
                    if (key) params.set('commentKey', key);
                    const url = params.toString() ? `${base}?${params.toString()}` : base;
                    window.open(url, '_blank', 'noopener,noreferrer');
                } catch (e) {
                    console.error('[CommentsList] 打开AICR失败:', e);
                }
            },
            getAuthorAvatar(author) {
                const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
                const index = (author || 'A').charCodeAt(0) % colors.length;
                return {
                    backgroundColor: colors[index],
                    color: '#fff',
                    text: (author || '?').charAt(0).toUpperCase()
                };
            },
            getCommentStatusClass(status) {
                if (!status || status === 'pending') return 'status-pending';
                return `status-${status}`;
            },
            getCommentTypeLabel(type) {
                const map = { suggestion: '建议', question: '问题', bug: '错误', discussion: '讨论', praise: '表扬', nitpick: '细节' };
                return map[type] || type || '';
            },
            getCommentTypeIcon(type) {
                const map = {
                    suggestion: 'fas fa-lightbulb',
                    question: 'fas fa-question-circle',
                    bug: 'fas fa-bug',
                    discussion: 'fas fa-comments',
                    praise: 'fas fa-thumbs-up',
                    nitpick: 'fas fa-search'
                };
                return map[type] || 'fas fa-tag';
            },
            getCommentStatusLabel(status) {
                const map = { pending: '待处理', resolved: '已解决', closed: '已关闭', wontfix: '不修复' };
                return map[status] || status || '';
            },
            getCommentStatusIcon(status) {
                const map = { pending: 'fas fa-clock', resolved: 'fas fa-check-circle', closed: 'fas fa-times-circle', wontfix: 'fas fa-ban' };
                return map[status] || 'fas fa-circle';
            },
            formatTime,
            async loadComments() {
                try {
                    this.loading = true;
                    this.error = '';
                    // 依据新闻日期拉取评论
                    const today = formatDate ? formatDate(new Date()) : new Date().toISOString().slice(0,10);
                    const dateStr = (this.dateStr && this.dateStr.trim()) || today;
                    let url = `${window.API_URL}/mongodb/?cname=comments&timestamp=${encodeURIComponent(dateStr)},${encodeURIComponent(dateStr)}`;
                    if (this.newsLink) {
                        // 约定：服务端若支持，可通过 newsLink 进行筛选
                        url += `&newsLink=${encodeURIComponent(this.newsLink)}`;
                    }
                    const res = await getData(url, { method: 'GET' }, false);
                    let list = [];
                    if (res && res.data && Array.isArray(res.data.list)) list = res.data.list;
                    else if (Array.isArray(res)) list = res;
                    else if (res && Array.isArray(res.data)) list = res.data;
                    // 简单排序：时间倒序
                    this.comments = (list || []).map(c => ({
                        ...c,
                        key: c.key || c.id || `comment_${Date.now()}_${Math.random()}`
                    })).sort((a, b) => {
                        const ta = new Date(a.timestamp || a.createdAt || 0).getTime();
                        const tb = new Date(b.timestamp || b.createdAt || 0).getTime();
                        return tb - ta;
                    });
                } catch (e) {
                    console.error('[CommentsList] 加载评论失败:', e);
                    this.error = '加载评论失败';
                    this.comments = [];
                } finally {
                    this.loading = false;
                }
            }
        },
        async mounted() {
            await this.loadComments();
            // 监听全局刷新事件
            this._reloadHandler = () => this.loadComments();
            window.addEventListener('ReloadComments', this._reloadHandler);
        },
        beforeUnmount() {
            if (this._reloadHandler) {
                window.removeEventListener('ReloadComments', this._reloadHandler);
                this._reloadHandler = null;
            }
        },
        template: template
    };
};

(async function initComponent() {
    try {
        const CommentsList = await createCommentsList();
        window.CommentsList = CommentsList;
        window.dispatchEvent(new CustomEvent('CommentsListLoaded', { detail: CommentsList }));
        console.log('[CommentsList] 组件初始化完成');
    } catch (e) {
        console.error('[CommentsList] 组件初始化失败:', e);
    }
})();




