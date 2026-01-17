// 代码评审评论面板组件 - 负责代码评审评论的展示和管理
// 作者：liangliang

import { safeExecute } from '/src/utils/error.js';
import { getData, postData } from '/src/services/index.js';
import { defineComponent } from '/src/utils/componentLoader.js';
import { buildServiceUrl, SERVICE_MODULE } from '/src/services/helper/requestHelper.js';
import { getSessionSyncService } from '/src/views/aicr/services/sessionSyncService.js';

// 新增：异步获取评论数据（从mongo api）
async function fetchCommentsFromMongo(file) {
    try {
        // 构建查询参数
        const queryParams = {
            cname: 'comments'
        };

        // 如果有文件信息，添加到参数中
        if (file) {
            const isUUID = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || '').trim());
            // 约定：file.key 必须与会话 key(sessionKey/UUID)一致，但为了兼容边缘场景这里做兜底
            const sessionKey = (file.sessionKey && isUUID(file.sessionKey))
                ? String(file.sessionKey)
                : (file.key && isUUID(file.key) ? String(file.key) : null);
            if (sessionKey) {
                queryParams.fileKey = sessionKey;
                console.log('[CommentPanel] 添加文件Key到参数(sessionKey):', sessionKey, '原file对象:', file);
            } else {
                console.warn('[CommentPanel] 未找到 sessionKey，跳过 fileKey 参数');
            }
        } else {
            // 如果没有文件信息，不添加fileKey参数，这样会返回所有评论
            console.log('[CommentPanel] 没有文件信息，将加载所有评论');
        }

        // 构建API URL
        const url = buildServiceUrl('query_documents', queryParams);

        console.log('[CommentPanel] 调用服务接口:', url);
        // 禁用本地缓存，确保评论列表总是从服务端获取最新数据
        const response = await getData(url, { method: 'GET' }, false);
        console.log('[CommentPanel] 获取评论数据响应:', response);

        // 处理响应数据
        let comments = [];
        if (response && response.data && response.data.list) {
            comments = response.data.list;
        } else if (Array.isArray(response)) {
            comments = response;
        } else if (response && Array.isArray(response.data)) {
            comments = response.data;
        }

        // 规范化评论数据，确保字段一致性
        if (window.aicrStore && window.aicrStore.normalizeComment) {
            comments = comments.map(comment => window.aicrStore.normalizeComment(comment));
        }

        console.log('[CommentPanel] 最终评论数据:', comments);
        console.log('[CommentPanel] 评论数量:', comments.length);
        console.log('[CommentPanel] 是否包含文件过滤:', !!file);
        return Array.isArray(comments) ? comments : [];
    } catch (err) {
        console.error('[CommentPanel] 获取评论数据失败:', err);
        return [];
    }
}

// 创建组件定义
const componentOptions = {
    name: 'CommentPanel',
    css: '/src/views/aicr/components/commentPanel/index.css',
    html: '/src/views/aicr/components/commentPanel/index.html',
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
            type: Object,
            default: () => ({
                content: '',
                author: '',
                text: '',
                improvementText: '',
                type: '',
                status: 'pending'
            })
        },
        loading: {
            type: Boolean,
            default: false
        },
        error: {
            type: String,
            default: ''
        },
        versionId: {
            type: String,
            default: ''
        },
        collapsed: {
            type: Boolean,
            default: false
        },
        viewMode: {
            type: String,
            default: 'tree'
        },
        activeSession: {
            type: Object,
            default: null
        }
    },
    emits: [
        'comment-submit',
        'comment-input',
        'comment-delete',
        'comment-resolve',
        'comment-reopen',
        'toggle-collapse'
    ],
    data() {
        return {
            // 评论数据
            mongoComments: [],
            fileComments: [],
            commentsCache: {},

            // 加载状态
            commentsLoading: false,

            // 错误信息
            commentsError: '',

            // 编辑器状态
            showCommentEditor: false,

            // 评论编辑状态（消息对话模式）
            editingComment: null,
            editingCommentMessages: [], // 消息列表
            editingCommentInputText: '', // 输入框文本
            editingCommentDraftImages: [], // 待发送图片
            editingCommentSending: false, // 发送中状态
            editingCommentAuthor: '',
            editingCommentTimestamp: '',
            editingCommentText: '',
            editingCommentContent: '', // 评论内容（简洁模式）
            editingRangeInfo: { startLine: 1, endLine: 1 },
            editingImprovementText: '',
            editingCommentType: '',
            editingCommentStatus: 'pending',
            editingSaving: false,
            showImprovementSection: false, // 是否展开改进代码区
            editingCommentContextEditorVisible: false, // 上下文编辑器
            editingCommentContextEditMode: 'split',
            editingCommentEditingContext: '',
            editingCommentIncludeContext: true, // 是否包含上下文
            editingCommentCopyFeedback: {}, // 复制反馈
            _editingCommentIsComposing: false,
            _editingCommentCompositionEndTime: 0,

            // 防重复请求状态
            _isLoadingComments: false,
            _lastRequestKey: null,
            _lastRequestTime: null,
            _lastReloadEvent: null,
            _lastProjectVersionEvent: null,
            _markedConfigured: false,

            // 防抖定时器
            _debounceTimer: null,

            // 其他状态
            newCommentData: {
                text: '',
                status: 'open'
            },

            // 评论输入状态
            newCommentText: '',

            // 删除评论状态管理
            deletingComments: {},

            // 删除确认对话框状态
            showDeleteDialog: false,
            deleteTargetId: null,
            deleteTargetAuthor: '',

            sessionChatSession: null,
            sessionChatLoading: false,
            sessionChatError: '',
            sessionChatInputText: '',
            sessionChatIncludePageContext: true,
            sessionChatContextEditorVisible: false,
            sessionChatContextEditMode: 'split',
            sessionChatEditingPageContent: '',
            sessionChatSavingContext: false,
            sessionChatSending: false,
            sessionChatDraftImages: [],
            sessionChatAbortController: null,
            sessionChatStreamingTargetTimestamp: null,
            sessionChatStreamingType: '',
            sessionChatCopyFeedback: {},
            sessionChatRegenerateFeedback: {},
            sessionChatWeChatRobots: [],
            sessionChatContextEditorVisible: false,
            sessionChatFaqVisible: false,
            sessionChatSettingsVisible: false,
            sessionChatWeChatSettingsVisible: false,
            _sessionMarkedConfigured: false,
            _sessionMarkedRenderer: null,

            // 传统评论列表的复制反馈状态
            commentCopyFeedback: {},
            // 评论回复输入状态
            commentReplyInputs: {},

            // 传统评论列表的聊天功能状态
            commentChatInputText: '',
            commentChatIncludeContext: true,
            commentChatSending: false,
            commentChatDraftImages: [],
            commentChatAbortController: null,
            commentChatContextEditorVisible: false,
            commentChatContextEditMode: 'split',
            commentChatEditingContext: '',
            commentChatFaqVisible: false,
            commentChatWeChatSettingsVisible: false,
            commentChatSettingsVisible: false,
            _commentChatIsComposing: false,
            _commentChatCompositionEndTime: 0
        };
    },
    computed: {
        isSessionChatMode() {
            return this.viewMode === 'tags';
        },
        sessionChatMessages() {
            const session = this.sessionChatSession;
            const msgs = Array.isArray(session?.messages) ? session.messages : [];
            return [...msgs]
                .map(m => {
                    const message = String(m?.message || m?.content || m?.text || '');
                    return { ...m, message, content: message };
                })
                .sort((a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0));
        },
        renderComments() {
            // 优先使用mongoComments，如果没有则使用props中的comments
            const mongoComments = this.mongoComments && Array.isArray(this.mongoComments) ? this.mongoComments : [];
            const propsComments = this.comments && Array.isArray(this.comments) ? this.comments : [];

            // 优先使用mongoComments（即使为空数组，也优先使用，因为可能刚删除了一条）
            // 只有当mongoComments从未被初始化过（为undefined或null）时，才使用propsComments
            const commentsToRender = (this.mongoComments !== undefined && this.mongoComments !== null)
                ? mongoComments
                : (propsComments.length > 0 ? propsComments : mongoComments);

            console.log('[CommentPanel] renderComments - mongoComments:', mongoComments.length);
            console.log('[CommentPanel] renderComments - props comments:', propsComments.length);
            console.log('[CommentPanel] renderComments - commentsToRender:', commentsToRender.length);

            const comments = (commentsToRender || []).map(comment => ({
                ...comment,
                key: comment.key || `comment_${Date.now()}_${Math.random()}`
            })).sort((a, b) => {
                const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
                const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
                return timeB - timeA;
            });

            console.log('[CommentPanel] renderComments - 最终评论列表:', comments.length);

            // 如果有评论数据，即使没有选中文件也显示
            if (comments.length > 0) {
                return comments;
            }

            // 如果没有评论数据且没有选中文件，返回空数组
            if (!this.file) {
                return [];
            }

            return comments;
        },
        // 将评论转换为会话消息格式（用于在会话模式下显示）
        commentsAsSessionMessages() {
            if (!this.isSessionChatMode) return [];
            const comments = this.renderComments || [];
            return comments.map((comment, idx) => {
                // 判断评论类型：用户评论或AI回复
                const isUserComment = comment.author !== 'AI助手' && comment.author !== 'pet' && !comment.type || comment.type !== 'pet';
                const type = isUserComment ? 'user' : 'pet';

                // 构建消息内容
                let message = String(comment.content || '').trim();
                if (comment.text) {
                    message = `引用代码：\n\`\`\`\n${comment.text}\n\`\`\`\n\n${message}`;
                }
                if (comment.improvementText) {
                    message += `\n\n改进代码：\n\`\`\`\n${comment.improvementText}\n\`\`\``;
                }

                return {
                    ...comment,
                    type,
                    message,
                    content: message,
                    timestamp: comment.timestamp || comment.createdAt || Date.now(),
                    // 保留原始评论信息
                    _isComment: true,
                    _commentKey: comment.key,
                    _commentAuthor: comment.author,
                    _commentStatus: comment.status,
                    _commentType: comment.type
                };
            }).sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
        },
        // 将编辑中的评论转换为消息列表
        editingCommentMessagesList() {
            if (!this.editingComment) return [];
            const messages = Array.isArray(this.editingCommentMessages) ? [...this.editingCommentMessages] : [];

            // 如果没有消息，从评论内容创建初始消息
            if (messages.length === 0 && this.editingComment) {
                const comment = this.editingComment;
                const timestamp = comment.timestamp || Date.now();

                // 构建消息内容
                let content = String(comment.content || '').trim();
                if (comment.text) {
                    content = `引用代码：\n\`\`\`\n${comment.text}\n\`\`\`\n\n${content}`;
                }
                if (comment.improvementText) {
                    content += `\n\n改进代码：\n\`\`\`\n${comment.improvementText}\n\`\`\``;
                }

                return [{
                    type: 'user',
                    message: content,
                    content: content,
                    timestamp: timestamp,
                    author: comment.author || '手动评论',
                    _isOriginal: true
                }];
            }

            return messages.sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
        }
    },
    methods: {
        _normalizeFileKey(v) {
            try {
                return String(v || '')
                    .replace(/\\/g, '/')
                    .replace(/^\.\//, '')
                    .replace(/^\/+/, '')
                    .replace(/\/\/+/g, '/');
            } catch (e) {
                return String(v || '');
            }
        },
        _isSameFileKey(a, b) {
            const na = this._normalizeFileKey(a);
            const nb = this._normalizeFileKey(b);
            return !!na && !!nb && na === nb;
        },
        _isUUID(v) {
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || '').trim());
        },
        _resolveSessionKeyFromEventKey(eventKey) {
            // 重构：只使用 sessionKey
            if (eventKey == null || eventKey === '') return null;
            if (this._isUUID(eventKey)) return String(eventKey);
            // 统一使用_getCurrentSessionKey获取session的key
            const sessionKey = this._getCurrentSessionKey();
            return sessionKey ? String(sessionKey) : null;
        },
        _resolveTreeKeyFromSessionKey(sessionKey) {
            try {
                const target = String(sessionKey || '').trim();
                if (!target) return null;
                const root = window.aicrStore?.fileTree?.value || window.aicrStore?.fileTree;
                const stack = Array.isArray(root) ? [...root] : (root ? [root] : []);
                while (stack.length) {
                    const node = stack.pop();
                    if (!node) continue;
                    if (String(node.sessionKey || '') === target) return node.key || null;
                    if (Array.isArray(node.children)) stack.push(...node.children);
                }
            } catch (_) { }
            return null;
        },
        // 统一获取当前session的key：优先使用activeSession的key，否则使用file.sessionKey
        // 可以传入可选的file参数来获取指定文件的sessionKey
        _getCurrentSessionKey(file = null) {
            const isUUID = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || '').trim());
            // 优先使用 activeSession 的 key
            if (this.activeSession) {
                const sessionKey = this.activeSession.id || this.activeSession.key || this.activeSession.sessionKey;
                if (sessionKey && isUUID(sessionKey)) return String(sessionKey);
            }
            // 使用传入的file参数，或者使用this.file的sessionKey
            const targetFile = file || this.file;
            if (targetFile?.sessionKey && isUUID(targetFile.sessionKey)) {
                return String(targetFile.sessionKey);
            }
            // 兜底：如果只传了 file.key（且是 UUID），也视为 sessionKey
            if (targetFile?.key && isUUID(targetFile.key)) {
                return String(targetFile.key);
            }
            return null;
        },
        // 转义HTML
        _escapeHtml(str) {
            if (typeof str !== 'string') return '';
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        // 清理URL
        _sanitizeUrl(url) {
            if (typeof url !== 'string') return '';
            try {
                const u = new URL(url);
                if (u.protocol === 'http:' || u.protocol === 'https:') return url;
                return '';
            } catch (_) {
                return '';
            }
        },

        // 渲染会话聊天Markdown
        renderSessionChatMarkdown(text) {
            return safeExecute(() => {
                const raw = text == null ? '' : String(text);
                if (!raw) return '';
                if (typeof window.marked === 'undefined') {
                    return raw
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/\n/g, '<br/>');
                }
                if (!this._sessionMarkedConfigured) {
                    try {
                        const renderer = new window.marked.Renderer();
                        const originalCodeRenderer = renderer.code.bind(renderer);

                        renderer.html = (html) => {
                            return this._escapeHtml(html);
                        };

                        renderer.link = (href, title, text) => {
                            const safeHref = this._sanitizeUrl(href);
                            const safeText = this._escapeHtml(text == null ? '' : String(text));
                            if (!safeHref) return safeText;
                            const safeTitle = title == null ? '' : String(title);
                            const titleAttr = safeTitle ? ` title="${this._escapeHtml(safeTitle)}"` : '';
                            return `<a href="${this._escapeHtml(safeHref)}"${titleAttr} target="_blank" rel="noopener noreferrer">${safeText}</a>`;
                        };

                        renderer.image = (href, title, text) => {
                            const safeHref = this._sanitizeUrl(href);
                            const alt = this._escapeHtml(text == null ? '' : String(text));
                            if (!safeHref) return alt;
                            const safeTitle = title == null ? '' : String(title);
                            const titleAttr = safeTitle ? ` title="${this._escapeHtml(safeTitle)}"` : '';
                            return `<img src="${this._escapeHtml(safeHref)}" alt="${alt}" loading="lazy"${titleAttr} />`;
                        };

                        renderer.code = (code, language, isEscaped) => {
                            const lang = String(language || '').trim().toLowerCase();
                            const src = String(code || '');
                            if (lang === 'mermaid') {
                                const diagramId = `aicr-chat-mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
                                const diagramCode = String(src || '').trim();
                                if (window.mermaidRenderer && typeof window.mermaidRenderer.createDiagramContainer === 'function' && typeof window.mermaidRenderer.renderDiagram === 'function') {
                                    const container = window.mermaidRenderer.createDiagramContainer(diagramId, diagramCode, {
                                        showHeader: false,
                                        showActions: true,
                                        headerLabel: 'MERMAID 图表',
                                        sourceLine: null
                                    });
                                    setTimeout(() => {
                                        try {
                                            window.mermaidRenderer.renderDiagram(diagramId, diagramCode, { showLoading: false });
                                        } catch (_) { }
                                    }, 0);
                                    return container;
                                }
                                return `<pre class="md-code"><code class="language-mermaid">${this._escapeHtml(diagramCode)}</code></pre>`;
                            }

                            if (window.hljs) {
                                const desiredLanguage = lang || 'plaintext';
                                const validLanguage = window.hljs.getLanguage(desiredLanguage) ? desiredLanguage : 'plaintext';
                                try {
                                    const highlighted = window.hljs.highlight(src, { language: validLanguage }).value;
                                    return `<pre><code class="hljs language-${validLanguage}">${highlighted}</code></pre>`;
                                } catch (_) { }
                            }

                            return originalCodeRenderer(src, language, isEscaped);
                        };

                        this._sessionMarkedRenderer = renderer;
                        this._sessionMarkedConfigured = true;
                    } catch (_) {
                        this._sessionMarkedRenderer = null;
                        this._sessionMarkedConfigured = true;
                    }
                }

                try {
                    if (typeof window.marked.parse === 'function') {
                        return window.marked.parse(raw, {
                            renderer: this._sessionMarkedRenderer || undefined,
                            breaks: true,
                            gfm: true
                        });
                    }
                    return window.marked(raw);
                } catch (_) {
                    return raw
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/\n/g, '<br/>');
                }
            }, '渲染会话聊天Markdown');
        },

        // 渲染流式HTML
        renderSessionChatStreamingHtml(text) {
            return safeExecute(() => {
                const raw = text == null ? '' : String(text);
                if (!raw) return '';
                return this._escapeHtml(raw).replace(/\n/g, '<br/>');
            }, '渲染流式HTML');
        },

        // 判断是否为流式消息
        isSessionChatStreamingMessage(m, idx) {
            try {
                if (!m || !m.type || m.type !== 'pet') return false;
                if (this.sessionChatStreamingTargetTimestamp && m.timestamp === this.sessionChatStreamingTargetTimestamp) {
                    return this.sessionChatSending && String(this.sessionChatStreamingType || '').trim() !== '';
                }
                return false;
            } catch (_) {
                return false;
            }
        },

        // 判断是否正在重新生成
        isSessionChatRegenerating(m, idx) {
            try {
                if (String(this.sessionChatStreamingType || '') !== 'regenerate') return false;
                return this.isSessionChatStreamingMessage(m, idx);
            } catch (_) {
                return false;
            }
        },

        // 复制按钮标签
        sessionChatCopyButtonLabel(m, idx) {
            try {
                const key = this._sessionChatMessageKey(m, idx);
                const map = this.sessionChatCopyFeedback || {};
                const expiresAt = map[key];
                if (typeof expiresAt === 'number' && Date.now() < expiresAt) return '已复制';
                return '复制';
            } catch (_) {
                return '复制';
            }
        },

        // 重新生成按钮标签
        sessionChatRegenerateButtonLabel(m, idx) {
            try {
                if (String(this.sessionChatStreamingType || '') === 'regenerate' && this.isSessionChatStreamingMessage(m, idx)) {
                    return '生成中';
                }
                const key = this._sessionChatMessageKey(m, idx);
                const map = this.sessionChatRegenerateFeedback || {};
                const expiresAt = map[key];
                if (typeof expiresAt === 'number' && Date.now() < expiresAt) return '已生成';
                return '重新生成';
            } catch (_) {
                return '重新生成';
            }
        },

        // 获取消息键
        _sessionChatMessageKey(m, idx) {
            try {
                return `${m.timestamp || 0}_${idx || 0}`;
            } catch (_) {
                return `${Date.now()}_${idx || 0}`;
            }
        },

        // 判断是否可以重新生成（保留原实现用于会话消息）
        _canRegenerateSessionChatMessageForSession(idx) {
            try {
                if (!this.sessionChatSession) return false;
                const msgs = Array.isArray(this.sessionChatSession.messages) ? this.sessionChatSession.messages : [];
                if (idx < 0 || idx >= msgs.length) return false;
                const m = msgs[idx];
                if (!m || m.type !== 'pet') return false;
                let userIdx = -1;
                for (let i = idx - 1; i >= 0; i--) {
                    const msg = msgs[i];
                    if (msg && msg.type !== 'pet') {
                        userIdx = i;
                        break;
                    }
                }
                return userIdx >= 0;
            } catch (_) {
                return false;
            }
        },

        // 将Markdown渲染为HTML（使用marked.js优化）
        renderMarkdown(text) {
            return safeExecute(() => {
                if (!text) return '';

                // 预处理：如果是对象，转为JSON字符串
                let processedText = text;
                if (typeof text === 'object') {
                    try {
                        processedText = JSON.stringify(text, null, 2);
                        processedText = '```json\n' + processedText + '\n```';
                    } catch (e) {
                        processedText = text.toString();
                    }
                }

                // 检查 marked 是否可用
                if (typeof window.marked === 'undefined') {
                    console.warn('[CommentPanel] marked.js 未加载，使用简易渲染');
                    // 简易渲染回退
                    return processedText
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/\n/g, '<br/>');
                }

                // 配置 marked 选项（仅配置一次）
                if (!this._markedConfigured) {
                    const renderer = new window.marked.Renderer();

                    // 自定义代码块渲染以支持 Mermaid
                    const originalCodeRenderer = renderer.code.bind(renderer);
                    renderer.code = (code, language, isEscaped) => {
                        // 检查是否为mermaid图表
                        if (language && language.toLowerCase() === 'mermaid') {
                            const codeId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                            // 返回容器div，稍后由mermaid渲染
                            return this.createMermaidDiagram(code.trim(), codeId);
                        }

                        // 处理普通代码块
                        // 如果有hljs，使用它进行高亮
                        if (window.hljs) {
                            const validLanguage = window.hljs.getLanguage(language) ? language : 'plaintext';
                            try {
                                const highlighted = window.hljs.highlight(code, { language: validLanguage }).value;
                                return `<pre><code class="hljs language-${validLanguage}">${highlighted}</code></pre>`;
                            } catch (e) { }
                        }

                        // 回退到默认渲染
                        return originalCodeRenderer(code, language, isEscaped);
                    };

                    window.marked.setOptions({
                        renderer: renderer,
                        breaks: true, // 支持 GitHub 风格的换行
                        gfm: true     // GitHub Flavored Markdown
                    });
                    this._markedConfigured = true;
                }

                try {
                    return window.marked.parse(processedText);
                } catch (e) {
                    console.error('[CommentPanel] marked解析失败:', e);
                    return text;
                }
            }, 'Markdown渲染(CommentPanel)');
        },

        // 创建 Mermaid 图表
        createMermaidDiagram(code, diagramId) {
            if (typeof window.mermaidRenderer === 'undefined') {
                console.warn('[CommentPanel] MermaidRenderer 未加载，显示原始代码');
                return `<pre class="md-code"><code class="language-mermaid">${this.escapeHtml(code)}</code></pre>`;
            }

            // 使用统一的渲染管理器创建图表容器
            const container = window.mermaidRenderer.createDiagramContainer(diagramId, code, {
                showHeader: true,
                showActions: true,
                headerLabel: 'MERMAID 图表',
                sourceLine: null
            });

            // 延迟渲染图表
            this.$nextTick(() => {
                this.renderMermaidDiagram(diagramId, code);
            });

            return container;
        },

        // 渲染单个 Mermaid 图表
        async renderMermaidDiagram(diagramId, code) {
            if (typeof window.mermaidRenderer === 'undefined') {
                console.warn('[CommentPanel] MermaidRenderer 未加载');
                return;
            }

            try {
                // 使用统一的渲染管理器
                await window.mermaidRenderer.renderDiagram(diagramId, code, {
                    showLoading: true,
                    onSuccess: (svg) => {
                        console.log('[CommentPanel] Mermaid 图表渲染成功:', diagramId);
                    },
                    onError: (error) => {
                        console.error('[CommentPanel] Mermaid 渲染失败:', error);
                    }
                });
            } catch (error) {
                console.error('[CommentPanel] Mermaid 渲染异常:', error);
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
        // 切换评论面板收起状态
        toggleCollapse() {
            this.$emit('toggle-collapse');
        },

        async loadSessionChatSession(force = false) {
            return safeExecute(async () => {
                if (!this.isSessionChatMode) return;

                // 统一使用_getCurrentSessionKey获取session的key
                const fileKey = this._getCurrentSessionKey();

                if (!fileKey) {
                    this.sessionChatSession = null;
                    this.sessionChatError = '';
                    this.sessionChatLoading = false;
                    return;
                }

                if (!force && this.sessionChatSession && (this.sessionChatSession.id === fileKey || this.sessionChatSession.key === fileKey)) {
                    return;
                }

                this.sessionChatLoading = true;
                this.sessionChatError = '';
                try {
                    const sessionSync = getSessionSyncService();
                    const session = await sessionSync.getSession(String(fileKey));
                    this.sessionChatSession = session;
                    this.sessionChatEditingPageContent = String(session?.pageContent || '');
                    this.$nextTick(() => {
                        try {
                            const el = this.$el && this.$el.querySelector('.aicr-session-chat-messages');
                            if (el) el.scrollTop = el.scrollHeight;
                        } catch (_) { }
                    });
                } catch (e) {
                    this.sessionChatError = e?.message || '加载会话失败';
                    this.sessionChatSession = null;
                } finally {
                    this.sessionChatLoading = false;
                }
            }, '加载会话聊天数据');
        },

        openSessionChatContextEditor() {
            this.sessionChatContextEditorVisible = true;
            this.sessionChatContextEditMode = 'split';
            this.sessionChatEditingPageContent = String(this.sessionChatSession?.pageContent || '');
        },

        closeSessionChatContextEditor() {
            this.sessionChatContextEditorVisible = false;
        },

        copySessionChatContextDraft() {
            return safeExecute(async () => {
                try {
                    const content = String(this.sessionChatEditingPageContent || '').trim();
                    if (!content) return;
                    await navigator.clipboard.writeText(content);
                    if (window.showSuccess) window.showSuccess('已复制');
                } catch (e) {
                    if (window.showError) window.showError('复制失败');
                }
            }, '复制上下文内容');
        },

        openSessionChatFaq() {
            console.log('[CommentPanel] openSessionChatFaq clicked');
            // TODO: 实现常见问题面板
        },

        openSessionChatSettings() {
            console.log('[CommentPanel] openSessionChatSettings clicked');
            // TODO: 实现设置面板
        },

        toggleSessionChatContextEditMode(mode) {
            if (mode === 'edit' || mode === 'preview') {
                this.sessionChatContextEditMode = mode;
            }
        },

        async saveSessionChatPageContext() {
            return safeExecute(async () => {
                if (!this.sessionChatSession) return;
                const content = String(this.sessionChatEditingPageContent ?? '');
                if (content === String(this.sessionChatSession.pageContent || '')) {
                    this.sessionChatContextEditorVisible = false;
                    return;
                }

                this.sessionChatSavingContext = true;
                const sessionSync = getSessionSyncService();
                const updated = { ...this.sessionChatSession, pageContent: content, updatedAt: Date.now(), lastAccessTime: Date.now() };
                await sessionSync.saveSession(updated);
                this.sessionChatSession = updated;
                this.sessionChatContextEditorVisible = false;
                this.sessionChatSavingContext = false;
            }, '保存页面上下文');
        },

        async sendSessionChatMessage(payload = {}) {
            return safeExecute(async () => {
                // 在评论列表模式下，如果没有会话则自动创建一个
                if (!this.sessionChatSession) {
                    // 如果在会话模式下且有file信息，尝试创建或加载会话
                    if (this.isSessionChatMode && this.file) {
                        await this.loadSessionChatSession(true);
                    }
                    // 如果还是没有会话，则无法发送消息
                    if (!this.sessionChatSession) {
                        if (window.showError) window.showError('无法发送消息：未找到或创建会话');
                        return;
                    }
                }
                if (this.sessionChatSending) return;
                const rawText = typeof payload.text === 'string' ? payload.text : this.sessionChatInputText;
                const text = String(rawText || '').trim();
                const images = Array.isArray(this.sessionChatDraftImages) ? this.sessionChatDraftImages.filter(Boolean).slice(0, 4) : [];
                if (!text && images.length === 0) return;

                const now = Date.now();
                const sessionSync = getSessionSyncService();
                const uploadOne = async (src) => {
                    const raw = String(src || '').trim();
                    if (!raw) return '';
                    if (/^https?:\/\//i.test(raw)) return raw;
                    if (!raw.startsWith('data:image/')) {
                        throw new Error('图片格式不支持');
                    }
                    return await sessionSync.uploadImageToOss(raw, 'aicr/images');
                };
                const imageUrls = images.length > 0
                    ? (await Promise.all(images.map((src) => uploadOne(src)))).filter(Boolean)
                    : [];
                if (images.length > 0 && imageUrls.length === 0) {
                    throw new Error('上传图片失败');
                }

                const userMessage = {
                    type: 'user',
                    message: text,
                    timestamp: now,
                    ...(imageUrls.length > 0 ? { imageDataUrls: imageUrls, imageDataUrl: imageUrls[0] } : {})
                };
                const petMessage = { type: 'pet', message: '', timestamp: now + 1 };

                const prevSession = this.sessionChatSession;
                const prevMessages = Array.isArray(prevSession.messages) ? prevSession.messages : [];
                const nextSession = {
                    ...prevSession,
                    messages: [...prevMessages, userMessage, petMessage],
                    updatedAt: now,
                    lastAccessTime: now
                };

                this.sessionChatSession = nextSession;
                this.sessionChatInputText = '';
                this.sessionChatDraftImages = [];

                const shouldAutoScroll = () => {
                    try {
                        const el = this.$el && this.$el.querySelector('.aicr-session-chat-messages');
                        if (!el) return true;
                        const distance = (el.scrollHeight || 0) - (el.scrollTop || 0) - (el.clientHeight || 0);
                        return distance < 140;
                    } catch (_) {
                        return true;
                    }
                };

                const scrollToBottom = () => {
                    try {
                        const el = this.$el && this.$el.querySelector('.aicr-session-chat-messages');
                        if (el) el.scrollTop = el.scrollHeight;
                    } catch (_) { }
                };
                setTimeout(scrollToBottom, 0);

                const pageContent = String(this.sessionChatEditingPageContent || nextSession.pageContent || '').trim();
                const includeContext = this.sessionChatIncludePageContext === true;
                const history = this._buildSessionChatHistoryText(prevMessages, prevMessages.length);
                const defaultSystemPrompt = '你是一个有用的AI助手。';
                const fromSystem = defaultSystemPrompt;
                const fromUser = this._buildSessionChatUserPrompt({ text, images: imageUrls, pageContent, includeContext, historyText: history });

                const { streamPrompt } = await import('/src/services/modules/crud.js');
                const { getPromptUrl } = await import('/src/services/helper/requestHelper.js');
                const promptUrl = getPromptUrl();

                let accumulated = '';
                this.sessionChatStreamingTargetTimestamp = petMessage.timestamp;
                this.sessionChatStreamingType = 'send';
                this.sessionChatSending = true;
                const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                this.sessionChatAbortController = controller;
                let streamErrorMessage = '';
                let streamAborted = false;

                try {
                    await streamPrompt(
                        promptUrl,
                        {
                            module_name: 'services.ai.chat_service',
                            method_name: 'chat',
                            parameters: {
                                system: fromSystem,
                                user: fromUser,
                                stream: true,
                                ...(imageUrls.length > 0 ? { images: imageUrls } : {})
                            }
                        },
                        controller ? { signal: controller.signal } : {},
                        (chunk) => {
                            const autoScroll = shouldAutoScroll();
                            accumulated += String(chunk || '');
                            try {
                                const s = this.sessionChatSession;
                                const msgs = Array.isArray(s.messages) ? [...s.messages] : [];
                                const lastIdx = msgs.length - 1;
                                if (lastIdx >= 0) {
                                    const last = msgs[lastIdx];
                                    if (last && last.type === 'pet' && last.timestamp === petMessage.timestamp) {
                                        msgs[lastIdx] = { ...last, message: accumulated, error: false, aborted: false };
                                        this.sessionChatSession = { ...s, messages: msgs };
                                        if (autoScroll) scrollToBottom();
                                    }
                                }
                            } catch (_) { }
                        }
                    );
                } catch (e) {
                    const aborted = this._isAbortError(e);
                    if (aborted) {
                        streamAborted = true;
                    } else {
                        streamErrorMessage = String(e?.message || '请求失败');
                    }
                } finally {
                    this.sessionChatSending = false;
                    this.sessionChatAbortController = null;
                    this.sessionChatStreamingTargetTimestamp = null;
                    this.sessionChatStreamingType = '';
                }

                const finalSession = (() => {
                    const s = this.sessionChatSession || nextSession;
                    const msgs = Array.isArray(s.messages) ? [...s.messages] : [];
                    const lastIdx = msgs.length - 1;
                    if (lastIdx >= 0) {
                        const last = msgs[lastIdx];
                        if (last && last.type === 'pet' && last.timestamp === petMessage.timestamp) {
                            const trimmed = String(accumulated || '').trim();
                            const content = streamErrorMessage
                                ? (trimmed || `请求失败：${streamErrorMessage}`)
                                : (streamAborted && !trimmed ? '已停止' : trimmed);
                            msgs[lastIdx] = {
                                ...last,
                                message: content,
                                ...(streamErrorMessage ? { error: true } : {}),
                                ...(streamAborted ? { aborted: true } : {})
                            };
                        }
                    }
                    return { ...s, messages: msgs, pageContent: String(this.sessionChatEditingPageContent || s.pageContent || '') };
                })();
                this.sessionChatSession = finalSession;

                try {
                    await sessionSync.saveSession({ ...finalSession, updatedAt: Date.now(), lastAccessTime: Date.now() });
                } catch (_) { }

                if (streamErrorMessage && window.showError) {
                    window.showError(streamErrorMessage);
                }
            }, '发送会话消息', (info) => { try { if (window.showError) window.showError(String(info?.message || '发送失败')); } catch (_) { } });
        },

        // 构建会话历史文本
        _buildSessionChatHistoryText(messages, beforeIdx) {
            try {
                const msgs = Array.isArray(messages) ? messages.slice(0, beforeIdx) : [];
                return msgs.map(m => {
                    const role = m.type === 'pet' ? 'assistant' : 'user';
                    const content = String(m.message || m.content || '').trim();
                    return `${role}: ${content}`;
                }).join('\n\n');
            } catch (_) {
                return '';
            }
        },

        // 构建用户提示
        _buildSessionChatUserPrompt({ text, images, pageContent, includeContext, historyText }) {
            try {
                const parts = [];
                if (historyText) parts.push(`历史对话：\n${historyText}`);
                if (includeContext && pageContent) parts.push(`页面上下文：\n${pageContent}`);
                if (text) parts.push(`用户消息：${text}`);
                if (images && images.length > 0) parts.push(`图片：${images.length}张`);
                return parts.join('\n\n');
            } catch (_) {
                return String(text || '');
            }
        },

        // 判断是否为中止错误
        _isAbortError(e) {
            try {
                if (!e) return false;
                if (e.name === 'AbortError') return true;
                if (String(e.message || '').includes('aborted')) return true;
                return false;
            } catch (_) {
                return false;
            }
        },

        onSessionChatKeydown(e) {
            try {
                if (!e) return;
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendSessionChatMessage();
                    return;
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.sessionChatInputText = '';
                }
            } catch (_) { }
        },

        onSessionChatInput(e) {
            try {
                if (e && e.target) {
                    this.sessionChatInputText = String(e.target.value || '');
                }
            } catch (_) { }
        },

        onSessionChatCompositionStart() { },
        onSessionChatCompositionUpdate() { },
        onSessionChatCompositionEnd() { },

        onSessionChatPaste(e) {
            try {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (item.type.indexOf('image') !== -1) {
                        e.preventDefault();
                        const file = item.getAsFile();
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                                const dataUrl = event.target?.result;
                                if (dataUrl) {
                                    this.sessionChatDraftImages = [...(this.sessionChatDraftImages || []), dataUrl];
                                }
                            };
                            reader.readAsDataURL(file);
                        }
                        break;
                    }
                }
            } catch (_) { }
        },

        openSessionChatImagePicker() {
            try {
                const input = document.getElementById('session-chat-image-input');
                if (input) input.click();
            } catch (_) { }
        },

        onSessionChatImageInputChange(e) {
            try {
                const files = e.target?.files;
                if (!files || files.length === 0) return;
                const readers = [];
                for (let i = 0; i < Math.min(files.length, 4); i++) {
                    const file = files[i];
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const dataUrl = event.target?.result;
                            if (dataUrl) {
                                this.sessionChatDraftImages = [...(this.sessionChatDraftImages || []), dataUrl];
                            }
                        };
                        reader.readAsDataURL(file);
                        readers.push(reader);
                    }
                }
                e.target.value = '';
            } catch (_) { }
        },

        removeSessionChatDraftImage(idx) {
            try {
                const images = Array.isArray(this.sessionChatDraftImages) ? [...this.sessionChatDraftImages] : [];
                if (idx >= 0 && idx < images.length) {
                    images.splice(idx, 1);
                    this.sessionChatDraftImages = images;
                }
            } catch (_) { }
        },

        clearSessionChatDraftImages() {
            this.sessionChatDraftImages = [];
        },

        abortSessionChatRequest() {
            try {
                const controller = this.sessionChatAbortController;
                if (controller && typeof controller.abort === 'function') {
                    controller.abort();
                }
            } catch (_) { }
        },

        copySessionChatMessage(text, m, idx) {
            return safeExecute(async () => {
                try {
                    const content = String(text || '').trim();
                    if (!content) return;
                    await navigator.clipboard.writeText(content);
                    const key = this._sessionChatMessageKey(m, idx);
                    this.sessionChatCopyFeedback = {
                        ...(this.sessionChatCopyFeedback || {}),
                        [key]: Date.now() + 2000
                    };
                } catch (e) {
                    console.error('[CommentPanel] 复制失败:', e);
                }
            }, '复制会话消息');
        },

        sendSessionChatMessageToRobot(bot, m, idx) {
            return safeExecute(async () => {
                try {
                    const content = String(m.message || m.content || '').trim();
                    if (!content || !bot || !bot.webhook) return;
                    await fetch(String(bot.webhook), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ msgtype: 'text', text: { content } })
                    });
                    if (window.showSuccess) window.showSuccess('已发送到机器人');
                } catch (e) {
                    if (window.showError) window.showError('发送失败：' + (e?.message || '未知错误'));
                }
            }, '发送到机器人');
        },

        editSessionChatMessageAt(idx) {
            return safeExecute(() => {
                if (!this.sessionChatSession) return;
                const msgs = Array.isArray(this.sessionChatSession.messages) ? this.sessionChatSession.messages : [];
                if (idx < 0 || idx >= msgs.length) return;
                const m = msgs[idx];
                if (!m || m.type === 'pet') return;
                const text = String(m.message || m.content || '').trim();
                this.sessionChatInputText = text;
                const images = Array.isArray(m.imageDataUrls) ? m.imageDataUrls : (m.imageDataUrl ? [m.imageDataUrl] : []);
                this.sessionChatDraftImages = images;
                this.deleteSessionChatMessageAt(idx);
            }, '编辑消息');
        },

        resendSessionChatMessageAt(idx) {
            return safeExecute(async () => {
                if (this.sessionChatSending) return;
                if (!this.sessionChatSession) return;
                const msgs = Array.isArray(this.sessionChatSession.messages) ? [...this.sessionChatSession.messages] : [];
                if (idx < 0 || idx >= msgs.length) return;
                const userMsg = msgs[idx];
                if (!userMsg || userMsg.type === 'pet') return;
                const text = String(userMsg.message || userMsg.content || '').trim();
                const images = Array.isArray(userMsg.imageDataUrls) ? userMsg.imageDataUrls : (userMsg.imageDataUrl ? [userMsg.imageDataUrl] : []);
                if (!text && images.length === 0) return;
                this.sessionChatInputText = text;
                this.sessionChatDraftImages = images;
                await this.sendSessionChatMessage({ text });
                this.deleteSessionChatMessageAt(idx);
            }, '重新发送消息');
        },

        moveSessionChatMessageUp(idx) {
            return safeExecute(() => {
                if (!this.sessionChatSession || idx <= 0) return;
                const msgs = Array.isArray(this.sessionChatSession.messages) ? [...this.sessionChatSession.messages] : [];
                if (idx >= msgs.length) return;
                [msgs[idx - 1], msgs[idx]] = [msgs[idx], msgs[idx - 1]];
                this.sessionChatSession = { ...this.sessionChatSession, messages: msgs, updatedAt: Date.now() };
                this._saveSessionChatSession();
            }, '上移消息');
        },

        moveSessionChatMessageDown(idx) {
            return safeExecute(() => {
                if (!this.sessionChatSession) return;
                const msgs = Array.isArray(this.sessionChatSession.messages) ? [...this.sessionChatSession.messages] : [];
                if (idx < 0 || idx >= msgs.length - 1) return;
                [msgs[idx], msgs[idx + 1]] = [msgs[idx + 1], msgs[idx]];
                this.sessionChatSession = { ...this.sessionChatSession, messages: msgs, updatedAt: Date.now() };
                this._saveSessionChatSession();
            }, '下移消息');
        },

        regenerateSessionChatMessageAt(idx) {
            return safeExecute(async () => {
                if (this.sessionChatSending) return;
                if (!this.sessionChatSession) return;
                const msgs = Array.isArray(this.sessionChatSession.messages) ? [...this.sessionChatSession.messages] : [];
                if (idx < 0 || idx >= msgs.length) return;
                const petMsg = msgs[idx];
                if (!petMsg || petMsg.type !== 'pet') return;
                let userIdx = -1;
                for (let i = idx - 1; i >= 0; i--) {
                    if (msgs[i] && msgs[i].type !== 'pet') {
                        userIdx = i;
                        break;
                    }
                }
                if (userIdx < 0) return;
                const userMsg = msgs[userIdx];
                const text = String(userMsg.message || userMsg.content || '').trim();
                const images = Array.isArray(userMsg.imageDataUrls) ? userMsg.imageDataUrls : (userMsg.imageDataUrl ? [userMsg.imageDataUrl] : []);
                msgs[idx] = { ...petMsg, message: '', error: false, aborted: false };
                this.sessionChatSession = { ...this.sessionChatSession, messages: msgs, updatedAt: Date.now() };
                this.sessionChatInputText = text;
                this.sessionChatDraftImages = images;
                await this.sendSessionChatMessage({ text });
            }, '重新生成回复');
        },

        deleteSessionChatMessageAt(idx) {
            return safeExecute(async () => {
                if (!this.sessionChatSession) return;
                const msgs = Array.isArray(this.sessionChatSession.messages) ? [...this.sessionChatSession.messages] : [];
                if (idx < 0 || idx >= msgs.length) return;
                const msg = msgs[idx];

                // 如果是评论转换的消息，删除原始评论
                if (msg._isComment && msg._commentKey) {
                    await this.deleteComment(msg._commentKey);
                    return;
                }

                // 否则删除会话消息
                msgs.splice(idx, 1);
                this.sessionChatSession = { ...this.sessionChatSession, messages: msgs, updatedAt: Date.now() };
                this._saveSessionChatSession();
            }, '删除消息');
        },

        // 评论在会话模式下的操作方法
        copyCommentAsMessage(comment, idx) {
            return safeExecute(async () => {
                try {
                    let content = String(comment.content || '').trim();
                    if (comment.text) {
                        content = `引用代码：\n\`\`\`\n${comment.text}\n\`\`\`\n\n${content}`;
                    }
                    if (comment.improvementText) {
                        content += `\n\n改进代码：\n\`\`\`\n${comment.improvementText}\n\`\`\``;
                    }
                    if (!content) return;
                    await navigator.clipboard.writeText(content);
                    const key = `comment_${comment.key}_${idx}`;
                    this.sessionChatCopyFeedback = {
                        ...(this.sessionChatCopyFeedback || {}),
                        [key]: Date.now() + 2000
                    };
                    if (window.showSuccess) window.showSuccess('已复制');
                } catch (e) {
                    if (window.showError) window.showError('复制失败');
                }
            }, '复制评论');
        },

        editCommentAsMessage(comment) {
            return safeExecute(() => {
                // 打开评论编辑器
                this.openCommentEditor(comment);
            }, '编辑评论');
        },

        deleteCommentAsMessage(comment) {
            return safeExecute(async () => {
                await this.deleteComment(comment.key);
            }, '删除评论');
        },

        // 传统评论列表的会话聊天功能
        copyCommentContent(comment) {
            return safeExecute(async () => {
                try {
                    let content = String(comment.content || '').trim();
                    if (comment.text) {
                        content = `引用代码：\n\`\`\`\n${comment.text}\n\`\`\`\n\n${content}`;
                    }
                    if (comment.improvementText) {
                        content += `\n\n改进代码：\n\`\`\`\n${comment.improvementText}\n\`\`\``;
                    }
                    if (!content) return;
                    await navigator.clipboard.writeText(content);

                    // 使用反馈状态
                    if (!this.commentCopyFeedback) this.commentCopyFeedback = {};
                    this.commentCopyFeedback[comment.key] = Date.now() + 2000;
                    this.$forceUpdate();

                    if (window.showSuccess) window.showSuccess('已复制');
                } catch (e) {
                    if (window.showError) window.showError('复制失败');
                }
            }, '复制评论内容');
        },

        getCommentCopyButtonLabel(comment) {
            if (!this.commentCopyFeedback) return '📋 复制';
            const expireTime = this.commentCopyFeedback[comment.key];
            if (expireTime && Date.now() < expireTime) {
                return '✓ 已复制';
            }
            return '📋 复制';
        },

        replyToComment(comment) {
            return safeExecute(async () => {
                // 构建回复内容
                let replyContent = `> 回复 @${comment.author}:\n> `;
                if (comment.text) {
                    replyContent += `引用代码:\n> \`\`\`\n> ${comment.text.split('\n').join('\n> ')}\n> \`\`\`\n> \n> `;
                }
                replyContent += `${String(comment.content || '').split('\n').join('\n> ')}\n\n`;

                // 创建新评论作为回复
                const newCommentData = {
                    author: '手动评论',
                    content: replyContent,
                    timestamp: Date.now(),
                    fileKey: this._getCurrentSessionKey(),
                    status: 'pending',
                    type: 'discussion',
                    replyTo: comment.key
                };

                // 滚动到底部并聚焦
                this.$nextTick(() => {
                    try {
                        const container = this.$el?.querySelector('.comment-list');
                        if (container) container.scrollTop = container.scrollHeight;
                    } catch (_) { }
                });

                // 保存评论
                await this.saveNewComment(newCommentData);

                if (window.showSuccess) window.showSuccess('回复已添加');
            }, '回复评论');
        },

        async saveNewComment(commentData) {
            try {
                const url = buildServiceUrl('upsert_document', { cname: 'comments' });
                const response = await postData(url, commentData);

                // 刷新评论列表
                this.debouncedLoadComments();

                return response;
            } catch (error) {
                console.error('[CommentPanel] 保存评论失败:', error);
                if (window.showError) window.showError('保存评论失败：' + (error?.message || '未知错误'));
                throw error;
            }
        },

        sendCommentToRobot(bot, comment) {
            return safeExecute(async () => {
                try {
                    let content = String(comment.content || '').trim();
                    if (comment.text) {
                        content = `引用代码：\n\`\`\`\n${comment.text}\n\`\`\`\n\n${content}`;
                    }
                    if (comment.improvementText) {
                        content += `\n\n改进代码：\n\`\`\`\n${comment.improvementText}\n\`\`\``;
                    }
                    if (!content || !bot || !bot.webhook) return;

                    await fetch(String(bot.webhook), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ msgtype: 'text', text: { content } })
                    });

                    if (window.showSuccess) window.showSuccess('已发送到机器人');
                } catch (e) {
                    if (window.showError) window.showError('发送失败：' + (e?.message || '未知错误'));
                }
            }, '发送到机器人');
        },

        // 传统评论列表的聊天输入控制
        onCommentChatInput(e) {
            try {
                if (e && e.target) {
                    this.commentChatInputText = String(e.target.value || '');
                }
            } catch (_) { }
        },

        onCommentChatKeydown(e) {
            try {
                if (!e) return;
                if (e.isComposing || this._commentChatIsComposing) return;
                if (e.key === 'Enter' && this._commentChatCompositionEndTime > 0) {
                    if (Date.now() - this._commentChatCompositionEndTime < 300) return;
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendCommentChatMessage();
                    this._commentChatCompositionEndTime = 0;
                    return;
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.commentChatInputText = '';
                    this.commentChatDraftImages = [];
                }
            } catch (_) { }
        },

        onCommentChatCompositionStart() {
            this._commentChatIsComposing = true;
            this._commentChatCompositionEndTime = 0;
        },

        onCommentChatCompositionUpdate() {
            this._commentChatIsComposing = true;
            this._commentChatCompositionEndTime = 0;
        },

        onCommentChatCompositionEnd() {
            this._commentChatIsComposing = false;
            this._commentChatCompositionEndTime = Date.now();
        },

        onCommentChatPaste(e) {
            try {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (item.type.indexOf('image') !== -1) {
                        e.preventDefault();
                        const file = item.getAsFile();
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                                const dataUrl = event.target?.result;
                                if (dataUrl) {
                                    this.commentChatDraftImages = [...(this.commentChatDraftImages || []), dataUrl];
                                }
                            };
                            reader.readAsDataURL(file);
                        }
                    }
                }
            } catch (_) { }
        },

        openCommentChatImagePicker() {
            try {
                const input = document.getElementById('traditional-comment-image-input');
                if (input && typeof input.click === 'function') input.click();
            } catch (_) { }
        },

        onCommentChatImageInputChange(e) {
            try {
                const files = e.target?.files;
                if (!files || files.length === 0) return;
                const readers = [];
                for (let i = 0; i < Math.min(files.length, 4); i++) {
                    const file = files[i];
                    if (file && file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const dataUrl = event.target?.result;
                            if (dataUrl) {
                                this.commentChatDraftImages = [...(this.commentChatDraftImages || []), dataUrl].slice(0, 4);
                            }
                        };
                        reader.readAsDataURL(file);
                        readers.push(reader);
                    }
                }
                e.target.value = '';
            } catch (_) { }
        },

        removeCommentChatDraftImage(idx) {
            try {
                const images = Array.isArray(this.commentChatDraftImages) ? [...this.commentChatDraftImages] : [];
                if (idx >= 0 && idx < images.length) {
                    images.splice(idx, 1);
                    this.commentChatDraftImages = images;
                }
            } catch (_) { }
        },

        clearCommentChatDraftImages() {
            this.commentChatDraftImages = [];
        },

        abortCommentChatRequest() {
            try {
                const controller = this.commentChatAbortController;
                if (controller && typeof controller.abort === 'function') {
                    controller.abort();
                }
            } catch (_) { }
        },

        // 发送评论聊天消息（AI回复）
        async sendCommentChatMessage() {
            return safeExecute(async () => {
                if (this.commentChatSending) return;
                const text = String(this.commentChatInputText || '').trim();
                const images = Array.isArray(this.commentChatDraftImages) ? this.commentChatDraftImages.filter(Boolean).slice(0, 4) : [];
                if (!text && images.length === 0) return;

                const now = Date.now();

                // 上传图片
                const sessionSync = getSessionSyncService();
                const uploadOne = async (src) => {
                    const raw = String(src || '').trim();
                    if (!raw) return '';
                    if (/^https?:\/\//i.test(raw)) return raw;
                    if (!raw.startsWith('data:image/')) {
                        throw new Error('图片格式不支持');
                    }
                    return await sessionSync.uploadImageToOss(raw, 'aicr/images');
                };
                const imageUrls = images.length > 0
                    ? (await Promise.all(images.map((src) => uploadOne(src)))).filter(Boolean)
                    : [];
                if (images.length > 0 && imageUrls.length === 0) {
                    throw new Error('上传图片失败');
                }

                // 创建用户评论
                const userComment = {
                    author: '手动评论',
                    content: text,
                    timestamp: now,
                    fileKey: this._getCurrentSessionKey(),
                    status: 'pending',
                    type: 'discussion',
                    ...(imageUrls.length > 0 ? { imageDataUrls: imageUrls, imageDataUrl: imageUrls[0] } : {})
                };

                // 保存用户评论
                await this.saveNewComment(userComment);

                // 创建AI回复评论（占位）
                const aiComment = {
                    author: 'AI助手',
                    content: '',
                    timestamp: now + 1,
                    fileKey: this._getCurrentSessionKey(),
                    status: 'pending',
                    type: 'pet'
                };

                // 临时添加到列表
                this.mongoComments = [...(this.mongoComments || []), aiComment];

                // 清空输入
                this.commentChatInputText = '';
                this.commentChatDraftImages = [];

                // 滚动到底部
                this.$nextTick(() => {
                    try {
                        const container = this.$el?.querySelector('.comment-list');
                        if (container) container.scrollTop = container.scrollHeight;
                    } catch (_) { }
                });

                // 调用AI生成回复
                this.commentChatSending = true;
                try {
                    const controller = new AbortController();
                    this.commentChatAbortController = controller;

                    // 构建上下文
                    let contextText = '';
                    if (this.commentChatIncludeContext && this.file) {
                        contextText = `文件：${this.file.name || this.file.path || ''}\n`;
                        if (this.file.content) {
                            contextText += `\n代码内容：\n\`\`\`\n${this.file.content}\n\`\`\`\n`;
                        }
                    }

                    // 构建历史评论
                    const history = (this.renderComments || [])
                        .slice(-10) // 只取最近10条
                        .map(c => `${c.author}: ${c.content}`)
                        .join('\n\n');

                    const prompt = [
                        contextText,
                        history ? `历史评论：\n${history}` : '',
                        `用户问题：${text}`
                    ].filter(Boolean).join('\n\n');

                    // 调用AI接口
                    const { postData } = await import('/src/services/index.js');
                    const response = await postData(
                        buildServiceUrl('ai_chat', {}),
                        { prompt },
                        { signal: controller.signal }
                    );

                    const aiReply = String(response?.data?.reply || response?.reply || '').trim();
                    if (!aiReply) throw new Error('AI 未返回回复');

                    // 更新AI评论
                    aiComment.content = aiReply;
                    await this.saveNewComment(aiComment);

                    // 刷新列表
                    this.debouncedLoadComments();

                } catch (e) {
                    if (e.name === 'AbortError') {
                        aiComment.content = '已停止';
                        aiComment.status = 'closed';
                    } else {
                        aiComment.content = `生成失败：${e?.message || '未知错误'}`;
                        aiComment.status = 'closed';
                        if (window.showError) window.showError('AI 回复失败：' + (e?.message || '未知错误'));
                    }
                    // 更新失败的评论
                    this.mongoComments = (this.mongoComments || []).map(c =>
                        c.timestamp === aiComment.timestamp ? aiComment : c
                    );
                } finally {
                    this.commentChatSending = false;
                    this.commentChatAbortController = null;
                }
            }, '发送评论聊天消息');
        },

        // 传统评论列表的模态框控制
        openCommentChatContextEditor() {
            this.commentChatContextEditorVisible = true;
            this.commentChatContextEditMode = 'split';
            this.commentChatEditingContext = this.file?.content || '';
        },

        closeCommentChatContextEditor() {
            this.commentChatContextEditorVisible = false;
        },

        saveCommentChatContext() {
            // 这里可以实现保存上下文到文件的逻辑
            if (window.showSuccess) window.showSuccess('上下文已保存');
            this.commentChatContextEditorVisible = false;
        },

        openCommentChatFaq() {
            this.commentChatFaqVisible = true;
        },

        closeCommentChatFaq() {
            this.commentChatFaqVisible = false;
        },

        openCommentChatWeChatSettings() {
            this.commentChatWeChatSettingsVisible = true;
        },

        closeCommentChatWeChatSettings() {
            this.commentChatWeChatSettingsVisible = false;
        },

        openCommentChatSettings() {
            this.commentChatSettingsVisible = true;
        },

        closeCommentChatSettings() {
            this.commentChatSettingsVisible = false;
        },

        copyCommentChatContext() {
            return safeExecute(async () => {
                try {
                    const content = String(this.commentChatEditingContext || '').trim();
                    if (!content) return;
                    await navigator.clipboard.writeText(content);
                    if (window.showSuccess) window.showSuccess('已复制');
                } catch (e) {
                    if (window.showError) window.showError('复制失败');
                }
            }, '复制上下文');
        },

        saveCommentChatWeChatSettings() {
            if (window.showSuccess) window.showSuccess('设置与会话聊天共享');
            this.commentChatWeChatSettingsVisible = false;
        },

        saveCommentChatSettings() {
            if (window.showSuccess) window.showSuccess('设置与会话聊天共享');
            this.commentChatSettingsVisible = false;
        },

        sessionChatCopyButtonLabel(m, idx) {
            const key = m._isComment ? `comment_${m._commentKey}_${idx}` : this._sessionChatMessageKey(m, idx);
            const feedback = this.sessionChatCopyFeedback || {};
            const expireTime = feedback[key];
            if (expireTime && Date.now() < expireTime) {
                return '已复制';
            }
            return '复制';
        },

        isSessionChatStreamingMessage(m, idx) {
            if (m._isComment) return false; // 评论不支持流式显示
            return this.sessionChatStreamingTargetTimestamp === m.timestamp && this.sessionChatStreamingType === 'message';
        },

        canRegenerateSessionChatMessage(idx) {
            // 在评论模式下，使用 commentsAsSessionMessages
            if (this.isSessionChatMode && this.commentsAsSessionMessages && this.commentsAsSessionMessages.length > 0) {
                const msgs = this.commentsAsSessionMessages || [];
                if (idx < 0 || idx >= msgs.length) return false;
                const m = msgs[idx];
                if (m._isComment) return false; // 评论不支持重新生成
                return m.type === 'pet';
            }
            // 在会话模式下，使用 sessionChatMessages
            return this._canRegenerateSessionChatMessageForSession(idx);
        },

        isSessionChatRegenerating(m, idx) {
            if (m._isComment) return false;
            return this.sessionChatRegenerateFeedback && this.sessionChatRegenerateFeedback[`${m.timestamp}_${idx}`];
        },

        sessionChatRegenerateButtonLabel(m, idx) {
            if (this.isSessionChatRegenerating(m, idx)) {
                return '重新生成中...';
            }
            return '重新生成';
        },

        async _saveSessionChatSession() {
            try {
                if (!this.sessionChatSession) return;
                const sessionSync = getSessionSyncService();
                await sessionSync.saveSession({ ...this.sessionChatSession, updatedAt: Date.now(), lastAccessTime: Date.now() });
            } catch (_) { }
        },

        openSessionChatFaq() {
            this.sessionChatFaqVisible = true;
        },

        closeSessionChatFaq() {
            this.sessionChatFaqVisible = false;
        },

        openSessionChatSettings() {
            this.sessionChatSettingsVisible = true;
        },

        closeSessionChatSettings() {
            this.sessionChatSettingsVisible = false;
        },

        openSessionChatWeChatSettings() {
            this.sessionChatWeChatSettingsVisible = true;
        },

        closeSessionChatWeChatSettings() {
            this.sessionChatWeChatSettingsVisible = false;
        },

        loadWeChatSettings() {
            try {
                const raw = localStorage.getItem('aicr_wechat_robots');
                const arr = raw ? JSON.parse(raw) : [];
                if (Array.isArray(arr)) {
                    this.sessionChatWeChatRobots = arr.filter(r => r && typeof r === 'object' && r.enabled);
                }
                if ((!Array.isArray(this.sessionChatWeChatRobots) || this.sessionChatWeChatRobots.length === 0)) {
                    const enabledRaw = localStorage.getItem('aicr_wechat_enabled');
                    const webhookRaw = localStorage.getItem('aicr_wechat_webhook');
                    const autoRaw = localStorage.getItem('aicr_wechat_auto_forward');
                    const enabled = enabledRaw === 'true';
                    const webhook = String(webhookRaw || '').trim();
                    const autoForward = autoRaw === 'true';
                    if (webhook && enabled) {
                        this.sessionChatWeChatRobots = [{
                            id: 'wr_' + Date.now(),
                            name: '机器人',
                            webhook,
                            enabled,
                            autoForward
                        }];
                    }
                }
            } catch (_) {
                this.sessionChatWeChatRobots = [];
            }
        },

        // 加载MongoDB评论数据（优化：优先从 store 获取，避免重复调用接口）
        async loadMongoComments(force = false) {
            return safeExecute(async () => {
                // 防止重复请求
                if (this._isLoadingComments) {
                    console.log('[CommentPanel] 评论数据正在加载中，跳过重复请求');
                    return;
                }

                this._isLoadingComments = true;
                this.commentsLoading = true;
                this.commentsError = '';

                try {
                    console.log('[CommentPanel] store中没有评论数据，开始从接口加载，当前文件:', this.file);

                    // 生成请求键，用于防止重复请求
                    const key = this._getCurrentSessionKey();
                    const requestKey = `global_${key || 'all'}`;

                    // 如果是强制刷新，跳过防重复请求检查，确保能够重新请求
                    if (!force) {
                        // 检查是否与上次请求相同（仅在非强制刷新时检查）
                        if (this._lastRequestKey === requestKey && this._lastRequestTime &&
                            Date.now() - this._lastRequestTime < 1000) {
                            console.log('[CommentPanel] 请求键相同且时间间隔小于1秒，跳过重复请求');
                            this._isLoadingComments = false;
                            this.commentsLoading = false;
                            return;
                        }
                    }

                    // 更新请求键和时间戳
                    this._lastRequestKey = requestKey;
                    this._lastRequestTime = Date.now();

                    console.log('[CommentPanel] 请求键:', requestKey, '强制刷新:', force);

                    // 按需加载：只在有文件选中或需要显示所有评论时才加载
                    const mongoComments = await fetchCommentsFromMongo(this.file);

                    // 确保评论数据有正确的key属性
                    const processedComments = mongoComments.map(comment => ({
                        ...comment,
                        key: comment.key || `comment_${Date.now()}_${Math.random()}`
                    }));

                    // 如果是强制刷新，直接使用从API获取的评论，确保与接口返回的数据完全一致
                    if (force) {
                        console.log('[CommentPanel] 强制刷新，直接使用API返回的评论数据，数量:', processedComments.length);
                        this.mongoComments = processedComments;
                    } else {
                        // 非强制刷新时，合并现有评论和新获取的评论
                        const existing = Array.isArray(this.mongoComments) ? this.mongoComments : [];
                        const currentFileKey = this._getCurrentSessionKey();
                        const existingSameFile = currentFileKey
                            ? existing.filter(c => this._isSameFileKey(c.fileKey, currentFileKey))
                            : existing;

                        const mergedByKey = new Map();
                        [...processedComments, ...existingSameFile].forEach(c => {
                            const k = c && c.key ? String(c.key) : '';
                            if (k) {
                                if (!mergedByKey.has(k)) mergedByKey.set(k, c);
                                return;
                            }
                            const fileK = this._normalizeFileKey(c.fileKey);
                            const ts = c.timestamp || c.createdAt || c.createdTime || '';
                            const content = c.content || '';
                            const fallbackKey = `${fileK}__${ts}__${content}`;
                            if (!mergedByKey.has(fallbackKey)) mergedByKey.set(fallbackKey, c);
                        });
                        const merged = Array.from(mergedByKey.values());
                        const shouldKeepExisting = processedComments.length === 0 && existingSameFile.length > 0 && !!currentFileKey;
                        this.mongoComments = shouldKeepExisting ? existingSameFile : merged;
                    }

                    console.log('[CommentPanel] 加载评论数据完成，评论数量:', this.mongoComments.length);
                    console.log('[CommentPanel] 评论数据详情:', this.mongoComments);

                    // 强制更新视图
                    this.$forceUpdate && this.$forceUpdate();
                } catch (err) {
                    this.commentsError = '加载评论失败';
                    console.error('[CommentPanel] 评论加载失败:', err);
                } finally {
                    this.commentsLoading = false;
                    this._isLoadingComments = false;
                }
            }, 'mongo评论数据加载');
        },



        // 提交评论
        async submitComment() {
            if (!this.newCommentText.trim()) {
                alert('评论内容不能为空');
                return;
            }

            const text = this.newCommentText.trim();
            // 清空输入框（先清以获得更顺畅的输入体验）
            this.newCommentText = '';

            // 按原流程走手动提交
            const commentData = { content: text };
            this.$emit('comment-submit', commentData);
            // 移除重复的加载调用，因为 handleCommentSubmit 已经会处理评论添加和刷新
            // setTimeout(() => { this.debouncedLoadComments(); }, 100);
            // setTimeout(() => { this.debouncedLoadComments(); }, 1000);
        },

        // 处理评论输入
        handleCommentInput(event) {
            this.newCommentText = event.target.value;
            this.$emit('comment-input', event);
        },

        // 删除评论 - 优化版本
        async deleteComment(commentId) {
            // 防止重复删除
            if (this.deletingComments[commentId]) {
                return;
            }

            // 获取评论信息用于确认对话框
            const comment = this.renderComments.find(c => c.key === commentId);
            const commentAuthor = comment?.author || '这条评论';

            // 设置确认对话框状态
            this.deleteTargetId = commentId;
            this.deleteTargetAuthor = commentAuthor;
            this.showDeleteDialog = true;
        },

        // 取消删除
        cancelDelete() {
            this.showDeleteDialog = false;
            this.deleteTargetId = null;
            this.deleteTargetAuthor = '';
        },

        // 确认删除
        async confirmDelete() {
            const commentId = this.deleteTargetId;
            if (!commentId) {
                this.cancelDelete();
                return;
            }

            // 关闭对话框
            this.showDeleteDialog = false;

            // 设置删除状态
            this.deletingComments[commentId] = true;

            // 保存原始评论列表，以便删除失败时恢复
            const originalComments = Array.isArray(this.mongoComments) ? [...this.mongoComments] : [];

            // 先乐观更新UI，立即从本地移除（提升用户体验）
            if (Array.isArray(this.mongoComments) && this.mongoComments.length > 0) {
                this.mongoComments = this.mongoComments.filter(c => c && c.key !== commentId);
            }

            // 设置一个超时恢复机制，如果5秒内没有收到重新加载事件，恢复评论列表
            const restoreTimeout = setTimeout(() => {
                console.warn('[CommentPanel] 删除评论超时，恢复评论列表');
                this.mongoComments = originalComments;
                if (this.deletingComments[commentId]) {
                    delete this.deletingComments[commentId];
                }
            }, 5000);

            // 监听重新加载事件，如果收到则清除超时
            const onReload = () => {
                clearTimeout(restoreTimeout);
                window.removeEventListener('reloadComments', onReload);
            };
            window.addEventListener('reloadComments', onReload, { once: true });

            try {
                // 触发删除事件（会调用API删除并重新加载）
                this.$emit('comment-delete', commentId);
            } catch (error) {
                console.error('[CommentPanel] 删除评论失败:', error);
                clearTimeout(restoreTimeout);
                window.removeEventListener('reloadComments', onReload);
                // 恢复原始评论列表
                this.mongoComments = originalComments;
                // 清除删除状态
                if (this.deletingComments[commentId]) {
                    delete this.deletingComments[commentId];
                }
                // 显示错误提示
                if (window.showError) {
                    window.showError('删除评论失败：' + (error?.message || '未知错误'));
                }
            } finally {
                // 重置对话框数据
                this.deleteTargetId = null;
                this.deleteTargetAuthor = '';
            }
        },



        // 打开评论编辑器（简洁表单模式）
        openCommentEditor(comment) {
            return safeExecute(() => {
                if (!comment || !comment.key) return;

                console.log('[CommentPanel] 打开评论编辑器:', comment);

                // 设置编辑状态
                this.editingComment = { ...comment };
                this.editingCommentAuthor = comment.author ? comment.author.trim() : '';

                // 处理时间戳
                if (comment.timestamp) {
                    const date = new Date(comment.timestamp);
                    this.editingCommentTimestamp = date.toISOString().slice(0, 16);
                } else {
                    this.editingCommentTimestamp = new Date().toISOString().slice(0, 16);
                }

                // 设置引用代码（只读展示）
                this.editingCommentText = comment.text ? comment.text.trim() : '';
                this.editingRangeInfo = comment.rangeInfo ? { ...comment.rangeInfo } : { startLine: 1, endLine: 1 };

                // 设置评论内容（可编辑）
                this.editingCommentContent = comment.content ? String(comment.content).trim() : '';

                // 设置改进代码
                this.editingImprovementText = comment.improvementText ? comment.improvementText.trim() : '';
                // 如果有改进代码，默认展开该区域
                this.showImprovementSection = !!this.editingImprovementText;

                // 设置评论类型和状态
                this.editingCommentType = comment.type || '';
                this.editingCommentStatus = comment.status || 'pending';
                this.editingSaving = false;

                // 显示编辑器
                this.showCommentEditor = true;

                // 聚焦到内容输入框
                this.$nextTick(() => {
                    const textarea = this.$refs.commentEditorTextarea;
                    if (textarea) {
                        textarea.focus();
                        // 将光标移到末尾
                        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                    }
                });
            }, '打开评论编辑器');
        },

        // 切换改进代码区域展开/收起
        toggleImprovementSection() {
            this.showImprovementSection = !this.showImprovementSection;
        },

        // 关闭评论编辑器
        closeCommentEditor() {
            return safeExecute(() => {
                console.log('[CommentPanel] 关闭评论编辑器');

                this.showCommentEditor = false;
                this.editingComment = null;
                this.editingCommentMessages = [];
                this.editingCommentInputText = '';
                this.editingCommentDraftImages = [];
                this.editingCommentSending = false;
                this.editingCommentAuthor = '';
                this.editingCommentTimestamp = '';
                this.editingCommentText = '';
                this.editingCommentContent = '';
                this.editingRangeInfo = { startLine: 1, endLine: 1 };
                this.editingImprovementText = '';
                this.editingCommentType = '';
                this.editingCommentStatus = 'pending';
                this.editingSaving = false;
                this.showImprovementSection = false;
                this.editingCommentContextEditorVisible = false;
                this.editingCommentCopyFeedback = {};
            }, '关闭评论编辑器');
        },

        // 保存编辑后的评论（简洁表单模式）
        async saveEditedComment() {
            return safeExecute(async () => {
                if (!this.editingComment || !this.editingComment.key) return;

                // 直接使用 editingCommentContent 作为评论内容
                let newContent = (this.editingCommentContent || '').trim();

                // 如果没有内容，使用原始评论内容
                if (!newContent && this.editingComment && this.editingComment.content) {
                    newContent = String(this.editingComment.content || '').trim();
                }

                // 验证评论者姓名
                const newAuthor = (this.editingCommentAuthor || '').trim();
                if (!newAuthor) {
                    alert('评论者姓名不能为空');
                    return;
                }

                // 防重复
                if (this.editingSaving) return;
                this.editingSaving = true;

                // 验证API地址配置
                if (!window.API_URL) {
                    this.editingSaving = false;
                    throw new Error('API地址未配置，无法保存评论');
                }

                // 组装URL
                // let url = `${window.API_URL}/mongodb/?cname=comments`; // Deprecated

                try {
                    // const { updateData } = await import('/src/services/modules/crud.js');

                    // 构建更新数据
                    // 如果是手动评论，保持author为"手动评论"
                    const originalAuthor = this.editingComment.author;
                    const finalAuthor = originalAuthor === '手动评论' ? '手动评论' : newAuthor;
                    // 保留原始的 rangeInfo，因为用户不再可以编辑行号
                    const originalRangeInfo = this.editingComment.rangeInfo || { startLine: 1, endLine: 1 };

                    // 重构：comment 的 fileKey 必须是对应 session 的 key（sessionKey）
                    let updateFileKey = this._getCurrentSessionKey();
                    if (!updateFileKey || !this._isUUID(updateFileKey)) {
                        // 如果当前没有 sessionKey，尝试从编辑中的评论获取（但必须是 UUID 格式）
                        const existingFileKey = this.editingComment?.fileKey;
                        if (existingFileKey && this._isUUID(existingFileKey)) {
                            updateFileKey = existingFileKey;
                        } else {
                            throw new Error('无法找到有效的 sessionKey，评论无法更新');
                        }
                    }

                    // 构建更新Payload
                    const updateDataPayload = {
                        key: this.editingComment.key,
                        author: finalAuthor,
                        content: newContent,
                        text: newContent, // 确保 text 与 content 保持一致
                        rangeInfo: originalRangeInfo,
                        improvementText: this.editingImprovementText ? this.editingImprovementText.trim() : null,
                        type: this.editingCommentType || null,
                        status: this.editingCommentStatus,
                        fileKey: updateFileKey, // 确保使用UUID格式的fileKey
                        updatedAt: new Date().toISOString()
                    };

                    // 规范化评论数据，确保字段一致性
                    if (window.aicrStore && window.aicrStore.normalizeComment) {
                        // updateDataPayload = window.aicrStore.normalizeComment(updateDataPayload);
                        // 注意：normalizeComment可能会覆盖某些字段，这里主要需要更新特定字段
                    }

                    const payload = {
                        module_name: SERVICE_MODULE,
                        method_name: 'update_document',
                        parameters: {
                            cname: 'comments',
                            data: updateDataPayload
                        }
                    };

                    const result = await postData(`${window.API_URL}/`, payload);
                    console.log('[CommentPanel] 评论更新成功:', result);

                    // 构建更新后的评论对象
                    const updatedCommentData = window.aicrStore && window.aicrStore.normalizeComment
                        ? window.aicrStore.normalizeComment({
                            ...this.editingComment,
                            ...updateDataPayload
                        })
                        : {
                            ...this.editingComment,
                            author: finalAuthor,
                            content: newContent,
                            text: newContent, // 确保 text 与 content 保持一致
                            rangeInfo: originalRangeInfo,
                            improvementText: this.editingImprovementText ? this.editingImprovementText.trim() : null,
                            type: this.editingCommentType || null,
                            status: this.editingCommentStatus
                        };

                    // 本地同步更新，提升体验
                    const idx = this.mongoComments.findIndex(c => c.key === this.editingComment.key);
                    if (idx !== -1) {
                        this.mongoComments[idx] = updatedCommentData;
                    } else {
                        // 如果本地没有找到，添加到列表（虽然不应该发生）
                        console.warn('[CommentPanel] 本地未找到评论，添加到列表');
                        this.mongoComments = [updatedCommentData, ...this.mongoComments];
                    }

                    // 同步更新会话消息
                    try {
                        // 重构：统一使用_getCurrentSessionKey获取session的key
                        const fileKey = this._getCurrentSessionKey();
                        if (fileKey) {
                            const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();
                            const updatedComment = {
                                ...updatedCommentData,
                                fileKey: fileKey,
                                key: this.editingComment.key
                            };
                            await sessionSync.syncCommentToMessage(updatedComment, fileKey, false);
                            console.log('[CommentPanel] 会话消息已同步更新');
                        }
                    } catch (syncError) {
                        console.warn('[CommentPanel] 同步会话消息失败（已忽略）:', syncError?.message);
                    }

                    // 关闭编辑器
                    this.closeCommentEditor();

                    // 不立即重新加载，因为本地已经更新了
                    // 如果需要确保数据同步，可以延迟加载（但应该避免重复）
                    // this.debouncedLoadComments();
                } catch (error) {
                    console.error('[CommentPanel] 评论更新失败:', error);
                    alert('保存失败：' + (error?.message || '未知错误'));
                    this.editingSaving = false;
                }
            }, '保存编辑后的评论');
        },

        // 评论编辑键盘事件（作者：liangliang）
        onCommentEditKeydown(event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                this.closeCommentEditor();
            } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                this.saveEditedComment();
            }
        },

        // ========== 编辑评论消息对话相关方法 ==========

        // 编辑评论输入框键盘事件
        onEditingCommentKeydown(e) {
            try {
                if (!e) return;
                if (e.key === 'Enter' && !e.shiftKey && !this._editingCommentIsComposing) {
                    const now = Date.now();
                    if (now - this._editingCommentCompositionEndTime < 300) return;
                    e.preventDefault();
                    this.sendEditingCommentMessage();
                    return;
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.editingCommentInputText = '';
                }
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    this.saveEditedComment();
                }
            } catch (_) { }
        },

        // 编辑评论输入框输入事件
        onEditingCommentInput(e) {
            try {
                if (e && e.target) {
                    this.editingCommentInputText = String(e.target.value || '');
                }
            } catch (_) { }
        },

        onEditingCommentCompositionStart() {
            this._editingCommentIsComposing = true;
        },

        onEditingCommentCompositionUpdate() { },

        onEditingCommentCompositionEnd() {
            this._editingCommentIsComposing = false;
            this._editingCommentCompositionEndTime = Date.now();
        },

        // 编辑评论粘贴事件
        onEditingCommentPaste(e) {
            try {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (item.type.indexOf('image') !== -1) {
                        e.preventDefault();
                        const file = item.getAsFile();
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                                const dataUrl = event.target?.result;
                                if (dataUrl) {
                                    this.editingCommentDraftImages = [...(this.editingCommentDraftImages || []), dataUrl];
                                }
                            };
                            reader.readAsDataURL(file);
                        }
                        break;
                    }
                }
            } catch (_) { }
        },

        // 打开编辑评论图片选择器
        openEditingCommentImagePicker() {
            try {
                const input = document.getElementById('editing-comment-image-input');
                if (input) input.click();
            } catch (_) { }
        },

        // 编辑评论图片输入变化
        onEditingCommentImageInputChange(e) {
            try {
                const files = e.target?.files;
                if (!files || files.length === 0) return;
                for (let i = 0; i < Math.min(files.length, 4); i++) {
                    const file = files[i];
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const dataUrl = event.target?.result;
                            if (dataUrl) {
                                this.editingCommentDraftImages = [...(this.editingCommentDraftImages || []), dataUrl];
                            }
                        };
                        reader.readAsDataURL(file);
                    }
                }
                e.target.value = '';
            } catch (_) { }
        },

        // 移除编辑评论待发送图片
        removeEditingCommentDraftImage(idx) {
            try {
                const images = Array.isArray(this.editingCommentDraftImages) ? [...this.editingCommentDraftImages] : [];
                if (idx >= 0 && idx < images.length) {
                    images.splice(idx, 1);
                    this.editingCommentDraftImages = images;
                }
            } catch (_) { }
        },

        // 清空编辑评论待发送图片
        clearEditingCommentDraftImages() {
            this.editingCommentDraftImages = [];
        },

        // 发送编辑评论消息
        async sendEditingCommentMessage() {
            return safeExecute(async () => {
                if (this.editingCommentSending) return;
                const text = String(this.editingCommentInputText || '').trim();
                const images = Array.isArray(this.editingCommentDraftImages) ? this.editingCommentDraftImages.filter(Boolean).slice(0, 4) : [];
                if (!text && images.length === 0) return;

                this.editingCommentSending = true;
                const now = Date.now();

                // 上传图片
                let imageUrls = [];
                if (images.length > 0) {
                    try {
                        const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
                        const sessionSync = getSessionSyncService();
                        const uploadOne = async (src) => {
                            const raw = String(src || '').trim();
                            if (!raw) return '';
                            if (/^https?:\/\//i.test(raw)) return raw;
                            if (!raw.startsWith('data:image/')) {
                                throw new Error('图片格式不支持');
                            }
                            return await sessionSync.uploadImageToOss(raw, 'aicr/images');
                        };
                        imageUrls = (await Promise.all(images.map((src) => uploadOne(src)))).filter(Boolean);
                        if (images.length > 0 && imageUrls.length === 0) {
                            throw new Error('上传图片失败');
                        }
                    } catch (e) {
                        this.editingCommentSending = false;
                        if (window.showError) window.showError('上传图片失败：' + (e?.message || '未知错误'));
                        return;
                    }
                }

                // 创建用户消息
                const userMessage = {
                    type: 'user',
                    message: text,
                    content: text,
                    timestamp: now,
                    author: this.editingCommentAuthor || '手动评论',
                    ...(imageUrls.length > 0 ? { imageDataUrls: imageUrls, imageDataUrl: imageUrls[0] } : {})
                };

                // 添加到消息列表
                this.editingCommentMessages = [...(this.editingCommentMessages || []), userMessage];

                // 清空输入
                this.editingCommentInputText = '';
                this.editingCommentDraftImages = [];
                this.editingCommentSending = false;

                // 滚动到底部
                this.$nextTick(() => {
                    const messagesEl = document.querySelector('.editing-comment-messages');
                    if (messagesEl) {
                        messagesEl.scrollTop = messagesEl.scrollHeight;
                    }
                });
            }, '发送编辑评论消息');
        },

        // 复制编辑评论消息
        copyEditingCommentMessage(message, idx) {
            return safeExecute(() => {
                const text = String(message?.message || message?.content || '').trim();
                if (!text) return;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(() => {
                        this.editingCommentCopyFeedback = { ...this.editingCommentCopyFeedback, [idx]: true };
                        setTimeout(() => {
                            this.editingCommentCopyFeedback = { ...this.editingCommentCopyFeedback, [idx]: false };
                        }, 2000);
                    }).catch(() => { });
                }
            }, '复制编辑评论消息');
        },

        // 获取编辑评论复制按钮标签
        getEditingCommentCopyButtonLabel(message, idx) {
            return this.editingCommentCopyFeedback[idx] ? '已复制' : '复制';
        },

        // 删除编辑评论消息
        deleteEditingCommentMessage(idx) {
            return safeExecute(() => {
                const messages = Array.isArray(this.editingCommentMessages) ? [...this.editingCommentMessages] : [];
                if (idx >= 0 && idx < messages.length) {
                    messages.splice(idx, 1);
                    this.editingCommentMessages = messages;
                }
            }, '删除编辑评论消息');
        },

        // 编辑编辑评论消息
        editEditingCommentMessage(idx) {
            return safeExecute(() => {
                const messages = Array.isArray(this.editingCommentMessages) ? [...this.editingCommentMessages] : [];
                if (idx >= 0 && idx < messages.length) {
                    const message = messages[idx];
                    if (message.type === 'user') {
                        this.editingCommentInputText = String(message.message || message.content || '').trim();
                        messages.splice(idx, 1);
                        this.editingCommentMessages = messages;
                        this.$nextTick(() => {
                            const textarea = document.querySelector('#editing-comment-chat-input');
                            if (textarea) {
                                textarea.focus();
                            }
                        });
                    }
                }
            }, '编辑编辑评论消息');
        },

        // 解决评论
        resolveComment(commentId) {
            this.$emit('comment-resolve', commentId);
        },

        // 重新打开评论
        reopenComment(commentId) {
            this.$emit('comment-reopen', commentId);
        },

        // 取消回复
        cancelReply() {
            this.replyingTo = null;
            this.replyContent = '';
        },

        // 格式化时间
        formatTime(timestamp) {
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
        },

        // 获取评论作者头像
        getAuthorAvatar(author) {
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
            const index = author.charCodeAt(0) % colors.length;
            return {
                backgroundColor: colors[index],
                color: '#fff',
                text: author.charAt(0).toUpperCase()
            };
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

        // 获取评论类型图标
        getCommentTypeIcon(type) {
            const typeIcons = {
                'suggestion': 'fas fa-lightbulb',
                'question': 'fas fa-question-circle',
                'bug': 'fas fa-bug',
                'discussion': 'fas fa-comments',
                'praise': 'fas fa-thumbs-up',
                'nitpick': 'fas fa-search'
            };
            return typeIcons[type] || 'fas fa-tag';
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

        // 获取评论状态图标
        getCommentStatusIcon(status) {
            const statusIcons = {
                'pending': 'fas fa-clock',
                'resolved': 'fas fa-check-circle',
                'closed': 'fas fa-times-circle',
                'wontfix': 'fas fa-ban'
            };
            return statusIcons[status] || 'fas fa-circle';
        },

        // 获取评论状态CSS类
        getCommentStatusClass(status) {
            if (!status || status === 'pending') return 'status-pending';
            return `status-${status}`;
        },

        // 获取文件名
        getFileName(filePath) {
            if (!filePath) return '';
            const parts = filePath.split('/');
            return parts[parts.length - 1];
        },

        // 高亮代码区对应行
        highlightCode(comment) {
            if (!comment || !comment.rangeInfo) return;

            const fileKey = comment.fileKey;
            const uiFileKey = this._isUUID(fileKey) ? (this._resolveTreeKeyFromSessionKey(fileKey) || fileKey) : fileKey;
            const rangeInfo = comment.rangeInfo;

            if (!uiFileKey) return;

            const normalizedRangeInfo = {
                startLine: rangeInfo.startLine >= 1 ? rangeInfo.startLine : rangeInfo.startLine + 1,
                endLine: rangeInfo.endLine >= 1 ? rangeInfo.endLine : rangeInfo.endLine + 1,
                startChar: rangeInfo.startChar,
                endChar: rangeInfo.endChar
            };

            const eventData = {
                fileKey: uiFileKey,
                rangeInfo: normalizedRangeInfo,
                comment: comment
            };

            window.dispatchEvent(new CustomEvent('highlightCodeLines', { detail: eventData }));
        },

        openFileAtAnchor(comment) {
            return safeExecute(() => {
                if (!comment) return;
                const rawKey = comment.fileKey || (comment.fileInfo && comment.fileInfo.key) || null;
                const uiFileKey = this._isUUID(rawKey) ? (this._resolveTreeKeyFromSessionKey(rawKey) || rawKey) : rawKey;
                if (!uiFileKey) return;

                const startLine = Number(comment?.rangeInfo?.startLine) >= 1 ? Number(comment.rangeInfo.startLine) : 1;
                const endLine = Number(comment?.rangeInfo?.endLine) >= 1 ? Number(comment.rangeInfo.endLine) : startLine;

                const store = window.aicrStore;
                const normalizedKey = this._normalizeFileKey(uiFileKey);

                const dispatchScrollEvent = () => {
                    try { window.location.hash = `#L${startLine}`; } catch (_) { }
                    const eventData = {
                        fileKey: normalizedKey,
                        rangeInfo: { startLine, endLine },
                        comment,
                        scroll: true
                    };
                    window.dispatchEvent(new CustomEvent('highlightCodeLines', { detail: eventData }));
                };

                if (store && typeof store.setSelectedKey === 'function') {
                    if (store.selectedKey && store.selectedKey.value !== normalizedKey) {
                        store.setSelectedKey(normalizedKey);
                    }
                    if (typeof store.loadFileByKey === 'function') {
                        store.loadFileByKey(normalizedKey).finally(dispatchScrollEvent);
                        return;
                    }
                }

                dispatchScrollEvent();
            }, '打开引用代码定位');
        },

        // 立即添加新评论到本地数据
        addCommentToLocalData(commentData) {
            let newComment = {
                ...commentData,
                key: commentData.key || `comment_${Date.now()}_${Math.random()}`
            };

            // 规范化评论数据，确保字段一致性
            if (window.aicrStore && window.aicrStore.normalizeComment) {
                newComment = window.aicrStore.normalizeComment(newComment);
            } else {
                // 如果没有规范化函数，手动设置字段
                const content = String(newComment.content || '').trim();
                const quotedText = String(newComment.text || '').trim();
                const timestamp = newComment.timestamp || newComment.createdTime || newComment.createdAt || Date.now();
                // 确保时间戳是毫秒数
                const normalizedTimestamp = typeof timestamp === 'string'
                    ? new Date(timestamp).getTime()
                    : (timestamp < 1e12 ? timestamp * 1000 : timestamp);

                if (content) newComment.content = content;
                // text 表示“引用代码”，不要兜底成 content，否则会出现“引用代码/被评论内容不一致”
                if (!newComment.text) newComment.text = quotedText;
                newComment.timestamp = normalizedTimestamp;
                newComment.createdTime = normalizedTimestamp; // 毫秒数
                newComment.createdAt = normalizedTimestamp; // 毫秒数
            }

            // 检查是否已存在相同key的评论，避免重复添加
            const commentKey = newComment.key;
            if (commentKey) {
                const existingIdx = this.mongoComments.findIndex(c => c && c.key === commentKey);
                if (existingIdx !== -1) {
                    // 如果已存在，更新而不是添加
                    console.log('[CommentPanel] 评论已存在，更新而不是添加:', commentKey);
                    this.mongoComments[existingIdx] = newComment;
                    return;
                }
            }

            // 如果不存在，添加到列表开头
            this.mongoComments = [newComment, ...this.mongoComments];
        },

        // 全局方法，用于外部直接调用
        addCommentGlobally(commentData) {
            this.addCommentToLocalData(commentData);
        },

        // 创建防抖的评论加载方法
        _createDebouncedLoadComments() {
            let timeoutId;
            const debounceTime = 500;

            return () => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(async () => {
                    // 检查是否正在加载
                    if (this._isLoadingComments) {
                        console.log('[CommentPanel] 防抖触发时检测到正在加载，跳过重复请求');
                        return;
                    }
                    await this.loadMongoComments();
                }, debounceTime);
            };
        },

        // 防抖的评论加载方法
        debouncedLoadComments(force = false) {
            // 检查是否正在加载
            if (this._isLoadingComments) {
                console.log('[CommentPanel] 正在加载中，跳过防抖请求');
                return;
            }

            if (this._debounceTimer) {
                clearTimeout(this._debounceTimer);
            }

            this._debounceTimer = setTimeout(async () => {
                console.log('[CommentPanel] 防抖触发评论加载');
                await this.loadMongoComments(force);
            }, 300); // 300ms防抖延迟
        },

        // 立即刷新评论列表（用于ESC键等需要立即响应的场景）
        immediateLoadComments(force = false) {
            console.log('[CommentPanel] 立即刷新评论列表');

            // 检查是否正在加载
            if (this._isLoadingComments) {
                console.log('[CommentPanel] 正在加载中，跳过立即刷新请求');
                return;
            }

            // 清除防抖定时器
            if (this._debounceTimer) {
                clearTimeout(this._debounceTimer);
                this._debounceTimer = null;
            }

            // 强制重置加载状态，确保能够重新请求
            this._isLoadingComments = false;

            // 立即加载评论
            this.loadMongoComments(force);
        },

        resetToInitialState() {
            console.log('[CommentPanel] 重置评论区到初始化状态');

            this.newCommentText = '';
            this.showCommentEditor = false;

            this.editingComment = null;
            this.editingCommentContent = '';
            this.editingCommentAuthor = '';
            this.editingCommentTimestamp = '';
            this.editingCommentText = '';
            this.editingRangeInfo = { startLine: 1, endLine: 1 };
            this.editingImprovementText = '';
            this.editingCommentType = '';
            this.editingCommentStatus = 'pending';
            this.editingSaving = false;

            this.showDeleteDialog = false;
            this.deleteTargetId = null;
            this.deleteTargetAuthor = '';
            this.deletingComments = {};

            this.commentsError = '';
            this.commentsLoading = false;
            this._isLoadingComments = false;

            this.fileComments = [];
            this.mongoComments = [];
            this.immediateLoadComments(true);
        },

        // 清理所有定时器和缓存
        cleanupAllTimers() {
            console.log('[CommentPanel] 清理所有定时器');

            // 清理防抖定时器
            if (this._debounceTimer) {
                clearTimeout(this._debounceTimer);
                this._debounceTimer = null;
            }

            // 清理评论加载定时器
            if (this._commentLoadTimeout) {
                clearTimeout(this._commentLoadTimeout);
                this._commentLoadTimeout = null;
            }
        }
    },
    async mounted() {
        console.log('[CommentPanel] 组件已挂载');

        // 等待store初始化完成后再加载数据
        let retryCount = 0;
        const maxRetries = 20; // 增加重试次数

        while (!window.aicrStore && retryCount < maxRetries) {
            console.log(`[CommentPanel] 等待store初始化... (${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 250));
            retryCount++;
        }

        if (window.aicrStore) {
            console.log('[CommentPanel] store已初始化，开始加载数据');

            // 加载微信机器人配置
            this.loadWeChatSettings();

            if (this.isSessionChatMode) {
                await this.loadSessionChatSession(true);
            } else {
                // 如果当前有选中的文件，才按需加载
                if (this.file) {
                    console.log('[CommentPanel] 已选中文件，按需加载评论');
                    this.debouncedLoadComments();
                } else {
                    console.log('[CommentPanel] 未选中文件，等待文件选择后再加载');
                }
            }
        } else {
            console.warn('[CommentPanel] store初始化超时，使用默认数据');
            if (this.isSessionChatMode) {
                await this.loadSessionChatSession(true);
            } else if (this.file) {
                this.debouncedLoadComments();
            } else {
                this.debouncedLoadComments(true);
            }
        }

        // 监听文件选择变化，重新加载评论（优化：优先从 store 获取）
        this.$watch('file', (newFile, oldFile) => {
            console.log('[CommentPanel] 文件选择变化:', { newFile, oldFile });

            if (newFile && newFile !== oldFile) {
                if (this.isSessionChatMode) {
                    this.loadSessionChatSession(true);
                    return;
                }
                // 使用newFile获取sessionKey，避免修改props
                const cacheKey = this._getCurrentSessionKey(newFile);
                if (cacheKey && Array.isArray(this.commentsCache[cacheKey]) && this.commentsCache[cacheKey].length > 0) {
                    console.log('[CommentPanel] 使用缓存的文件评论，数量:', this.commentsCache[cacheKey].length);
                    this.mongoComments = [...this.commentsCache[cacheKey]];
                }
                console.log('[CommentPanel] 使用防抖重新加载:', newFile);
                this.debouncedLoadComments();
            } else if (!newFile && oldFile) {
                if (this.isSessionChatMode) {
                    this.sessionChatSession = null;
                    this.sessionChatError = '';
                    this.sessionChatLoading = false;
                    return;
                }
                // 文件被取消选中（如按ESC键）
                console.log('[CommentPanel] 文件被取消选中，显示所有评论');
                // 强制重置加载状态，确保能够重新请求
                this._isLoadingComments = false;
                // 立即刷新评论列表，显示所有评论
                this.immediateLoadComments();
            }
        });

        this.$watch('viewMode', (newMode, oldMode) => {
            if (newMode === oldMode) return;
            if (newMode === 'tags') {
                this.loadSessionChatSession(true);
            } else {
                this.sessionChatSession = null;
                this.sessionChatError = '';
                this.sessionChatLoading = false;
                this.debouncedLoadComments();
            }
        });

        // 监听 activeSession 变化，在会话模式下重新加载会话数据
        this.$watch('activeSession', (newSession, oldSession) => {
            if (this.isSessionChatMode && newSession !== oldSession) {
                this.loadSessionChatSession(true);
            }
        }, { deep: true });

        // 监听评论数据变化
        this.$watch('comments', async (newComments, oldComments) => {
            if (newComments && newComments !== oldComments) {
                console.log('[CommentPanel] 评论数据变化，更新本地数据:', newComments);
                const incoming = Array.isArray(newComments) ? newComments : [];
                if (incoming.length > 0) {
                    this.mongoComments = [...incoming];
                    return;
                }
                return;
            }
        });

        // 监听renderComments变化，清理已删除评论的状态
        this.$watch('renderComments', (newComments) => {
            const currentCommentKeys = new Set((newComments || []).map(c => c.key));
            // 清理已删除评论的删除状态
            Object.keys(this.deletingComments).forEach(commentId => {
                if (!currentCommentKeys.has(commentId)) {
                    delete this.deletingComments[commentId];
                }
            });
        }, { deep: true });

        this.$watch('mongoComments', (list) => {
            const key = this._getCurrentSessionKey();
            if (key) {
                this.commentsCache[key] = Array.isArray(list) ? [...list] : [];
                console.log('[CommentPanel] 已缓存评论数据，key:', key, '数量:', this.commentsCache[key].length);
            }
        });
        console.log('[CommentPanel] 组件挂载完成');

        // 加载微信机器人设置
        this.loadWeChatSettings();

        // 注意：projectReady 监听已合并到下方统一处理，避免重复监听

        // 监听 CodeView 发来的评论更新请求（在弹框内编辑时触发）
        this._updateCommentListener = async (event) => {
            try {
                const payload = event.detail || {};
                if (!payload || !payload.key) return;
                console.log('[CommentPanel] 收到评论更新请求:', payload.key);

                // 复用本组件的保存流程，落库并轻量刷新
                this.editingComment = { key: payload.key };
                this.editingCommentContent = payload.content ? payload.content.trim() : '';
                this.editingCommentAuthor = payload.author ? payload.author.trim() : '';
                this.editingCommentText = payload.text ? payload.text.trim() : '';
                this.editingRangeInfo = payload.rangeInfo || { startLine: 1, endLine: 1 };
                this.editingImprovementText = payload.improvementText ? payload.improvementText.trim() : '';
                this.editingCommentType = payload.type || '';
                this.editingCommentStatus = payload.status || 'pending';
                this.editingSaving = false;

                await this.saveEditedComment();
            } catch (e) {
                console.error('[CommentPanel] 处理评论更新请求失败:', e);
            }
        };
        window.addEventListener('updateComment', this._updateCommentListener);

        // 监听addNewComment事件，处理从codeView组件发送的新评论
        // 使用防抖机制避免重复添加
        let _lastAddNewCommentTime = 0;
        let _lastAddNewCommentKey = null;
        let _lastAddNewCommentContent = null;
        this._addNewCommentListener = (event) => {
            console.log('[CommentPanel] 收到addNewComment事件');
            const { comment } = event.detail;

            if (!comment) return;

            // 防抖：如果1秒内收到相同key或相同内容的评论，跳过
            const commentKey = comment.key;
            const commentContent = String(comment.content || '').trim();
            const commentTimestamp = comment.timestamp || comment.createdAt || comment.createdTime;
            const now = Date.now();

            // 检查是否重复：基于key或内容+时间戳
            const isDuplicateByKey = commentKey && commentKey === _lastAddNewCommentKey && now - _lastAddNewCommentTime < 2000;
            const isDuplicateByContent = commentContent &&
                commentContent === _lastAddNewCommentContent &&
                commentTimestamp &&
                Math.abs(now - (commentTimestamp < 1e12 ? commentTimestamp * 1000 : commentTimestamp)) < 2000 &&
                now - _lastAddNewCommentTime < 2000;

            if (isDuplicateByKey || isDuplicateByContent) {
                console.log('[CommentPanel] 检测到重复的addNewComment事件，跳过:', {
                    key: commentKey,
                    content: commentContent?.substring(0, 50)
                });
                return;
            }

            // 检查评论是否已存在于列表中（避免重复添加）
            if (commentKey) {
                const existingIdx = this.mongoComments.findIndex(c => c && c.key === commentKey);
                if (existingIdx !== -1) {
                    console.log('[CommentPanel] 评论已存在于列表中，跳过添加:', commentKey);
                    return;
                }
            }

            _lastAddNewCommentTime = now;
            _lastAddNewCommentKey = commentKey;
            _lastAddNewCommentContent = commentContent;

            console.log('[CommentPanel] 添加新评论到本地数据:', comment);
            this.addCommentToLocalData(comment);
        };
        window.addEventListener('addNewComment', this._addNewCommentListener);

        this._resetAicrCommentsListener = () => {
            this.resetToInitialState();
        };
        window.addEventListener('resetAicrComments', this._resetAicrCommentsListener);

        // 监听reloadComments事件，重新加载评论数据
        this._reloadCommentsListener = (event) => {
            console.log('[CommentPanel] 收到reloadComments事件:', event.detail);

            const detail = event.detail || {};
            const hasFileKeyParam = Object.prototype.hasOwnProperty.call(detail, 'fileKey') ||
                Object.prototype.hasOwnProperty.call(detail, 'key');
            // 注意：区分“未传 fileKey”（undefined）与“明确传 fileKey=null”
            const resolvedFileKey = hasFileKeyParam ? (detail.fileKey ?? detail.key) : undefined;
            const resolvedSessionKey = hasFileKeyParam ? this._resolveSessionKeyFromEventKey(resolvedFileKey) : undefined;
            const effectiveSessionKey = (resolvedSessionKey === undefined) ? this._getCurrentSessionKey() : resolvedSessionKey;
            // 记录事件信息
            this._lastReloadEvent = {
                fileKey: effectiveSessionKey,
                timestamp: Date.now()
            };

            const { forceReload, immediateReload } = detail || {};

            if (forceReload) {
                console.log('[CommentPanel] 强制重新加载评论数据');
                // 关键修复：不要在这里“清空评论列表”。
                // reloadComments 的职责是触发重新拉取，并以接口返回为准；清空会导致“删除一条后全空”。
                if (immediateReload) {
                    console.log('[CommentPanel] 立即刷新评论列表（不使用防抖）');
                    this._isLoadingComments = false;
                    this.immediateLoadComments(true);
                } else {
                    this.debouncedLoadComments(true);
                }
            }
        };
        window.addEventListener('reloadComments', this._reloadCommentsListener);

        // 监听projectReady事件，当项目准备就绪时重新加载评论
        this._projectReadyListener = (event) => {
            console.log('[CommentPanel] 收到projectReady事件');

            // 防止重复触发
            if (this._lastProjectVersionEvent &&
                Date.now() - this._lastProjectVersionEvent.timestamp < 1000) {
                console.log('[CommentPanel] 检测到重复的projectReady事件，跳过处理');
                return;
            }

            // 记录事件信息
            this._lastProjectVersionEvent = {
                timestamp: Date.now()
            };

            // 延迟加载评论，确保store数据已更新
            setTimeout(() => {
                console.log('[CommentPanel] 项目准备就绪，开始加载评论数据');
                this.debouncedLoadComments();
            }, 200);
        };
        window.addEventListener('projectReady', this._projectReadyListener);
    },

    beforeDestroy() {
        // 清理所有定时器和缓存
        this.cleanupAllTimers();

        // 清理事件监听器
        if (this._updateCommentListener) {
            window.removeEventListener('updateComment', this._updateCommentListener);
            this._updateCommentListener = null;
        }
        if (this._addNewCommentListener) {
            window.removeEventListener('addNewComment', this._addNewCommentListener);
            this._addNewCommentListener = null;
        }
        if (this._resetAicrCommentsListener) {
            window.removeEventListener('resetAicrComments', this._resetAicrCommentsListener);
            this._resetAicrCommentsListener = null;
        }
        if (this._reloadCommentsListener) {
            window.removeEventListener('reloadComments', this._reloadCommentsListener);
            this._reloadCommentsListener = null;
        }
        if (this._projectReadyListener) {
            window.removeEventListener('projectReady', this._projectReadyListener);
            this._projectReadyListener = null;
        }
    }
};

// 初始化组件并全局暴露
(async function initComponent() {
    try {
        const CommentPanel = await defineComponent(componentOptions);
        window.CommentPanel = CommentPanel;

        // 触发自定义事件，通知组件已加载完成
        window.dispatchEvent(new CustomEvent('CommentPanelLoaded', { detail: CommentPanel }));

        console.log('[CommentPanel] 代码评审评论面板组件初始化完成');
        console.log('[CommentPanel] 组件对象:', CommentPanel);
    } catch (error) {
        console.error('CommentPanel 组件初始化失败:', error);
    }
})();
