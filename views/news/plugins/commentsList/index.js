// 新闻页评论列表组件（与 AICR 评论样式保持一致的展示）
// 作者：liangliang

import { loadCSSFiles } from '/utils/baseView.js';
import { getData } from '/apis/index.js';
import { formatDate } from '/utils/date.js';
import { safeExecute } from '/utils/error.js';
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
            // 将Markdown渲染为HTML（与AICR评论面板保持一致的实现）
            renderMarkdown(text) {
                return safeExecute(() => {
                    if (!text) return '';
                    
                    // 检查是否为JSON对象
                    let processedText = text;
                    let isJsonContent = false;
                    
                    if (typeof text === 'object') {
                        try {
                            // 如果是对象，格式化为JSON字符串
                            processedText = JSON.stringify(text, null, 2);
                            isJsonContent = true;
                        } catch (e) {
                            // 如果JSON.stringify失败，使用toString()
                            processedText = text.toString();
                        }
                    } else if (typeof text === 'string') {
                        // 尝试解析为JSON，如果是有效的JSON则格式化
                        try {
                            const parsed = JSON.parse(text);
                            if (typeof parsed === 'object' && parsed !== null) {
                                processedText = JSON.stringify(parsed, null, 2);
                                isJsonContent = true;
                            }
                        } catch (e) {
                            // 不是有效的JSON，保持原样
                            processedText = text;
                        }
                    }
                    
                    let html = processedText;

                    const escapeHtml = (s) => s
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                    html = escapeHtml(html);

                    // 如果是JSON内容，包装在代码块中
                    if (isJsonContent) {
                        html = `<pre class="md-code json-content"><code>${html}</code></pre>`;
                    }

                    // 代码块 ``` - 支持语言标识和 Mermaid
                    html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, (m, lang, code) => {
                        const language = lang || 'text';
                        const codeId = `news-code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        
                        // 如果是 mermaid 图表，创建图表容器
                        if (language.toLowerCase() === 'mermaid') {
                            return this.createMermaidDiagram(code.trim(), codeId);
                        }
                        
                        return `<pre class="md-code"><code class="language-${language}">${code}</code></pre>`;
                    });

                    // 行内代码 `code`
                    html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

                    // 图片 ![alt](url)
                    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, url) => {
                        const safeUrl = /^https?:\/\//i.test(url) ? url : '';
                        const altText = alt || '';
                        return safeUrl ? `<img src="${safeUrl}" alt="${altText}" class="md-image"/>` : m;
                    });

                    // 标题 # ## ### #### ##### ######（行首）- 修复解析顺序
                    html = html.replace(/^#{1}\s+(.+)$/gm, '<h1>$1<\/h1>')
                               .replace(/^#{2}\s+(.+)$/gm, '<h2>$1<\/h2>')
                               .replace(/^#{3}\s+(.+)$/gm, '<h3>$1<\/h3>')
                               .replace(/^#{4}\s+(.+)$/gm, '<h4>$1<\/h4>')
                               .replace(/^#{5}\s+(.+)$/gm, '<h5>$1<\/h5>')
                               .replace(/^#{6}\s+(.+)$/gm, '<h6>$1<\/h6>');

                    // 粗体/斜体（先粗体）
                    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1<\/strong>');
                    html = html.replace(/\*([^*]+)\*/g, '<em>$1<\/em>');

                    // 链接 [text](url)
                    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1<\/a>');

                    // 有序列表
                    html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2<\/li>');
                    html = html.replace(/(<li>[^<]*<\/li>\n?)+/g, (m) => `<ol>${m.replace(/\n/g, '')}<\/ol>`);
                    // 无序列表
                    html = html.replace(/^[-*+]\s+(.+)$/gm, '<li>$1<\/li>');
                    html = html.replace(/(<li>[^<]*<\/li>\n?)+/g, (m) => `<ul>${m.replace(/\n/g, '')}<\/ul>`);

                    // 段落/换行
                    const blockTags = ['h1','h2','h3','h4','h5','h6','pre','ul','ol','li','blockquote'];
                    // 优化：先清理多余的换行符，避免多个连续的\n
                    html = html.replace(/\n{3,}/g, '\n\n'); // 将3个或更多换行符替换为2个
                    html = html.split(/\n{2,}/).map(block => {
                        const trimmed = block.trim();
                        if (!trimmed) return '';
                        const isBlock = blockTags.some(tag => new RegExp(`^<${tag}[\\s>]`, 'i').test(trimmed));
                        return isBlock ? trimmed : `<p>${trimmed.replace(/\n/g, '<br/>')}<\/p>`;
                    }).join('');

                    // 清理空列表
                    html = html.replace(/<(ul|ol)>\s*<\/\1>/g, '');

                    // 独立图片链接行转图片
                    html = html.replace(/(?:^|\n)(https?:[^\s]+\.(?:png|jpe?g|gif|webp|svg))(?:\n|$)/gi, (m, url) => {
                        return `\n<p><img src="${url}" alt="image" class="md-image"\/><\/p>\n`;
                    });

                    return html;
                }, 'Markdown渲染(CommentsList)');
            },
            
            // 创建 Mermaid 图表
            createMermaidDiagram(code, diagramId) {
                if (typeof mermaid === 'undefined') {
                    console.warn('[CommentsList] Mermaid.js 未加载，显示原始代码');
                    return `<pre class="md-code"><code class="language-mermaid">${this.escapeHtml(code)}</code></pre>`;
                }
                
                const container = `
                    <div class="mermaid-diagram-wrapper news-mermaid">
                        <div class="mermaid-diagram-header">
                            <div class="mermaid-diagram-info">
                                <span class="mermaid-diagram-label">MERMAID 图表</span>
                            </div>
                            <div class="mermaid-diagram-actions">
                                <button class="mermaid-diagram-copy" onclick="copyMermaidCode('${diagramId}')" title="复制图表代码">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        </div>
                        <div class="mermaid-diagram-container" id="${diagramId}" data-mermaid-code="${this.escapeHtml(code)}">
                            ${code}
                        </div>
                    </div>
                `;
                
                // 延迟渲染图表
                this.$nextTick(() => {
                    this.renderMermaidDiagram(diagramId, code);
                });
                
                return container;
            },
            
            // 渲染单个 Mermaid 图表
            renderMermaidDiagram(diagramId, code) {
                if (typeof mermaid === 'undefined') {
                    return;
                }
                
                const diagram = document.getElementById(diagramId);
                if (!diagram || diagram.hasAttribute('data-mermaid-rendered')) {
                    return;
                }
                
                // 解码和清理代码
                let cleanCode = code;
                if (typeof code === 'string') {
                    // 解码 HTML 实体
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = code;
                    cleanCode = tempDiv.textContent || tempDiv.innerText || '';
                    
                    // 手动处理一些常见的 HTML 实体
                    cleanCode = cleanCode
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/&nbsp;/g, ' ');
                    
                    // 清理代码格式：保留必要的换行，只移除多余的空白
                    cleanCode = cleanCode
                        .trim()
                        .replace(/[ \t]+$/gm, '') // 只移除每行末尾的空格和制表符，保留换行
                        .replace(/\n{3,}/g, '\n\n') // 将多个连续换行替换为最多两个
                        .replace(/^[ \t]+/gm, ''); // 移除每行开头的空格和制表符，但保留换行结构
                }
                
                console.log('[CommentsList] 准备渲染 Mermaid 代码:', {
                    original: code,
                    cleaned: cleanCode,
                    diagramId: diagramId
                });
                
                if (!cleanCode.trim()) {
                    console.warn('[CommentsList] Mermaid 代码为空，跳过渲染');
                    diagram.innerHTML = `
                        <div class="mermaid-error">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>图表代码为空</p>
                        </div>
                    `;
                    return;
                }
                
                try {
                    // 配置 Mermaid（如果还没有配置）
                    if (!window.mermaidInitialized) {
                        mermaid.initialize({
                            startOnLoad: false,
                            theme: 'default',
                            securityLevel: 'loose',
                            fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
                            fontSize: 12,
                            flowchart: {
                                useMaxWidth: true,
                                htmlLabels: true,
                                curve: 'basis'
                            },
                            sequence: {
                                diagramMarginX: 50,
                                diagramMarginY: 10,
                                actorMargin: 50,
                                width: 150,
                                height: 65,
                                boxMargin: 10,
                                boxTextMargin: 5,
                                noteMargin: 10,
                                messageMargin: 35,
                                mirrorActors: true,
                                bottomMarginAdj: 1,
                                useMaxWidth: true,
                                rightAngles: false,
                                showSequenceNumbers: false
                            }
                        });
                        window.mermaidInitialized = true;
                    }
                    
                    mermaid.render(`mermaid-news-svg-${Date.now()}`, cleanCode)
                        .then(({ svg }) => {
                            diagram.innerHTML = svg;
                            diagram.setAttribute('data-mermaid-rendered', 'true');
                            console.log('[CommentsList] Mermaid 图表渲染成功:', diagramId);
                        })
                        .catch(error => {
                            console.error('[CommentsList] Mermaid 渲染失败:', error);
                            diagram.innerHTML = `
                                <div class="mermaid-error">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <p>图表渲染失败</p>
                                    <details>
                                        <summary>查看错误详情</summary>
                                        <pre>${this.escapeHtml(error.message || error.toString())}</pre>
                                    </details>
                                    <details>
                                        <summary>查看原始代码</summary>
                                        <pre><code>${this.escapeHtml(cleanCode)}</code></pre>
                                    </details>
                                    <details>
                                        <summary>查看原始输入</summary>
                                        <pre><code>${this.escapeHtml(code)}</code></pre>
                                    </details>
                                </div>
                            `;
                        });
                } catch (error) {
                    console.error('[CommentsList] Mermaid 渲染异常:', error);
                    diagram.innerHTML = `
                        <div class="mermaid-error">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>图表渲染异常</p>
                            <details>
                                <summary>查看错误详情</summary>
                                <pre>${this.escapeHtml(error.message || error.toString())}</pre>
                            </details>
                            <details>
                                <summary>查看原始代码</summary>
                                <pre><code>${this.escapeHtml(cleanCode)}</code></pre>
                            </details>
                        </div>
                    `;
                }
            },
            
            // HTML 转义方法
            escapeHtml(str) {
                return str
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            },
            async loadComments() {
                try {
                    this.loading = true;
                    this.error = '';
                    // 依据新闻日期拉取评论
                    const today = formatDate ? formatDate(new Date()) : new Date().toISOString().slice(0,10);
                    const dateStr = (this.dateStr && this.dateStr.trim()) || today;
                    let url = `${window.API_URL}/mongodb/?cname=comments&createdTime=${encodeURIComponent(dateStr)},${encodeURIComponent(dateStr)}`;
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
            },
            
            // 导出数据
            async exportData() {
                try {
                    // 动态导入导出工具
                    const { exportCategoryData } = await import('/utils/exportUtils.js');
                    
                    // 准备评论数据
                    const commentsData = this.comments.map(comment => ({
                        ...comment,
                        author: comment.author || '匿名用户',
                        content: comment.content || comment.text || '',
                        timestamp: comment.timestamp || comment.createdAt,
                        type: comment.type || '未知',
                        status: comment.status || '未知',
                        newsLink: comment.newsLink || '',
                        fileId: comment.fileId || ''
                    }));
                    
                    // 导出评论数据
                    const success = await exportCategoryData(
                        commentsData, 
                        '评论', 
                        `评论_${this.dateStr || new Date().toISOString().slice(0, 10)}`
                    );
                    
                    if (success) {
                        console.log('[CommentsList] 导出成功');
                        // 可以添加成功提示
                    } else {
                        console.error('[CommentsList] 导出失败');
                        // 可以添加失败提示
                    }
                } catch (error) {
                    console.error('[CommentsList] 导出过程中出错:', error);
                }
            }
        },
        async mounted() {
            await this.loadComments();
            // 监听全局刷新事件
            this._reloadHandler = () => this.loadComments();
            window.addEventListener('ReloadComments', this._reloadHandler);
            
            // 监听数据请求事件
            this._dataRequestHandler = (event) => {
                const { callback } = event.detail;
                if (callback && typeof callback === 'function') {
                    // 准备评论数据
                    const commentsData = this.comments.map(comment => ({
                        ...comment,
                        author: comment.author || '匿名用户',
                        content: comment.content || comment.text || '',
                        timestamp: comment.timestamp || comment.createdAt,
                        type: comment.type || '未知',
                        status: comment.status || '未知',
                        newsLink: comment.newsLink || '',
                        fileId: comment.fileId || ''
                    }));
                    callback(commentsData);
                }
            };
            window.addEventListener('RequestCommentsData', this._dataRequestHandler);
        },
        beforeUnmount() {
            if (this._reloadHandler) {
                window.removeEventListener('ReloadComments', this._reloadHandler);
                this._reloadHandler = null;
            }
            if (this._dataRequestHandler) {
                window.removeEventListener('RequestCommentsData', this._dataRequestHandler);
                this._dataRequestHandler = null;
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






