// 代码评审评论面板组件 - 负责代码评审评论的展示和管理
// 作者：liangliang

import { safeExecute, showErrorMessage } from '/src/utils/error.js';
import { getData, postData, updateData, deleteData, streamPromptJSON } from '/src/services/index.js';
import { defineComponent } from '/src/utils/componentLoader.js';
import { buildServiceUrl, SERVICE_MODULE } from '/src/services/helper/requestHelper.js';
import { getSessionSyncService } from '/src/views/aicr/services/sessionSyncService.js';
// const { postData } = await import('/src/services/modules/crud.js');

// 新增：异步获取评论数据（从mongo api）
async function fetchCommentsFromMongo(file) {
    try {
        // 构建查询参数
        const queryParams = {
            cname: 'comments'
        };
        
        // 如果有文件信息，添加到参数中
        if (file) {
            // 兼容不同的文件ID字段
            const key = file.key || file.path;
            if (key) {
                queryParams.key = key;
                queryParams.fileKey = key;
                console.log('[CommentPanel] 添加文件Key到参数:', key);
            }
        } else {
            // 如果没有文件信息，不添加key参数，这样会返回所有评论
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
                
                // 加载状态
                commentsLoading: false,
                
                // 错误信息
                commentsError: '',
                
                // 编辑器状态
                showCommentEditor: false,
                
                // 评论编辑状态
                editingComment: null,
                editingCommentContent: '',
                editingCommentAuthor: '',
                editingCommentTimestamp: '',
                editingCommentText: '',
                editingRangeInfo: { startLine: 1, endLine: 1 },
                editingImprovementText: '',
                editingCommentType: '',
                editingCommentStatus: 'pending',
                editingSaving: false,
                
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
                sessionChatShowContextEditor: false,
                sessionChatContextEditMode: 'edit',
                sessionChatEditingPageContent: '',
                sessionChatSavingContext: false,
                sessionChatSending: false
            };
        },
        computed: {
            isSessionChatMode() {
                return this.viewMode === 'tags';
            },
            sessionChatMessages() {
                const session = this.sessionChatSession;
                const msgs = Array.isArray(session?.messages) ? session.messages : [];
                return [...msgs].sort((a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0));
            },
            renderComments() {
                // 优先使用mongoComments，如果没有则使用props中的comments
                const mongoComments = this.mongoComments && Array.isArray(this.mongoComments) ? this.mongoComments : [];
                const propsComments = this.comments && Array.isArray(this.comments) ? this.comments : [];
                
                // 如果mongoComments有数据，使用mongoComments；否则使用propsComments
                const commentsToRender = mongoComments.length > 0 ? mongoComments : propsComments;
                
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
                                } catch (e) {}
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
                    const fileKey = this.file?.key || this.file?.path;
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
                            } catch (_) {}
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
                this.sessionChatShowContextEditor = true;
                this.sessionChatContextEditMode = 'edit';
                this.sessionChatEditingPageContent = String(this.sessionChatSession?.pageContent || '');
            },

            closeSessionChatContextEditor() {
                this.sessionChatShowContextEditor = false;
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
                        this.sessionChatShowContextEditor = false;
                        return;
                    }

                    this.sessionChatSavingContext = true;
                    const sessionSync = getSessionSyncService();
                    const updated = { ...this.sessionChatSession, pageContent: content, updatedAt: Date.now(), lastAccessTime: Date.now() };
                    await sessionSync.saveSession(updated);
                    this.sessionChatSession = updated;
                    this.sessionChatShowContextEditor = false;
                }, '保存页面上下文');
            },

            async sendSessionChatMessage(payload = {}) {
                return safeExecute(async () => {
                    if (!this.sessionChatSession) return;
                    if (this.sessionChatSending) return;

                    const rawText = typeof payload.text === 'string' ? payload.text : this.sessionChatInputText;
                    const text = String(rawText || '').trim();
                    if (!text) return;

                    const now = Date.now();
                    const userMessage = {
                        type: 'user',
                        content: text,
                        timestamp: now
                    };

                    this.sessionChatSending = true;
                    this.sessionChatInputText = '';

                    const sessionSync = getSessionSyncService();
                    const prevSession = this.sessionChatSession;
                    const nextSession = {
                        ...prevSession,
                        messages: [...(Array.isArray(prevSession.messages) ? prevSession.messages : []), userMessage],
                        updatedAt: now,
                        lastAccessTime: now
                    };
                    this.sessionChatSession = nextSession;
                    this.$nextTick(() => {
                        try {
                            const el = this.$el && this.$el.querySelector('.aicr-session-chat-messages');
                            if (el) el.scrollTop = el.scrollHeight;
                        } catch (_) {}
                    });

                    try {
                        await sessionSync.saveSession(nextSession);
                    } catch (e) {
                        this.sessionChatSession = prevSession;
                        this.sessionChatInputText = text;
                        throw e;
                    } finally {
                        this.sessionChatSending = false;
                    }
                }, '发送会话消息');
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
                } catch (_) {}
            },
            // 测试方法
            testMethod() {
                console.log('[CommentPanel] testMethod被调用');
                
                // 测试JSON格式化功能
                const testCases = [
                    // 测试对象
                    { name: '张三', age: 25, city: '北京' },
                    // 测试JSON字符串
                    '{"message": "Hello World", "status": "success"}',
                    // 测试普通字符串
                    '这是一个普通的评论内容',
                    // 测试嵌套对象
                    {
                        user: { name: '李四', profile: { avatar: 'avatar.jpg' } },
                        data: [1, 2, 3, { nested: true }]
                    }
                ];
                
                console.log('[CommentPanel] 测试JSON格式化功能:');
                testCases.forEach((testCase, index) => {
                    console.log(`测试用例 ${index + 1}:`, testCase);
                    const result = this.renderMarkdown(testCase);
                    console.log(`格式化结果 ${index + 1}:`, result);
                });
                
                return 'test';
            },

            // 加载MongoDB评论数据（优化：优先从 store 获取，避免重复调用接口）
            async loadMongoComments(force = false) {
                return safeExecute(async () => {
                    // 防止重复请求
                    if (this._isLoadingComments) {
                        console.log('[CommentPanel] 评论数据正在加载中，跳过重复请求');
                        return;
                    }
                    
                    // 优化：优先从 store 获取评论数据
                    if (!force && window.aicrStore && window.aicrStore.comments && window.aicrStore.comments.value && window.aicrStore.comments.value.length > 0) {
                        const storeComments = window.aicrStore.comments.value;
                        const key = this.file?.key || this.file?.path;
                        
                        // 如果当前有选中的文件，过滤出该文件的评论；否则使用所有评论
                        let filteredComments = storeComments;
                        if (key) {
                            filteredComments = storeComments.filter(c => {
                                const commentFileKey = c.fileKey || (c.fileInfo && (c.fileInfo.key || c.fileInfo.path));
                                return this._isSameFileKey(commentFileKey, key);
                            });
                        }
                        
                        if (filteredComments.length > 0 || !key) {
                            console.log('[CommentPanel] 从 store 获取评论数据，数量:', filteredComments.length, '文件Key:', key || 'all');
                            this.mongoComments = filteredComments;
                            return;
                        }
                    }
                    
                    this._isLoadingComments = true;
                    this.commentsLoading = true;
                    this.commentsError = '';

                    try {
                        console.log('[CommentPanel] store中没有评论数据，开始从接口加载，当前文件:', this.file);
                        
                        // 生成请求键，用于防止重复请求
                        const key = this.file?.key || this.file?.path;
                        const requestKey = `global_${key || 'all'}`;
                        
                        // 检查是否与上次请求相同
                        if (this._lastRequestKey === requestKey && this._lastRequestTime && 
                            Date.now() - this._lastRequestTime < 1000) {
                            console.log('[CommentPanel] 请求键相同且时间间隔小于1秒，跳过重复请求');
                            this._isLoadingComments = false;
                            this.commentsLoading = false;
                            return;
                        }
                        
                        this._lastRequestKey = requestKey;
                        this._lastRequestTime = Date.now();
                        
                        console.log('[CommentPanel] 请求键:', requestKey);
                        
                        // 按需加载：只在有文件选中或需要显示所有评论时才加载
                        const mongoComments = await fetchCommentsFromMongo(this.file);
                        
                        // 确保评论数据有正确的key属性
                        const processedComments = mongoComments.map(comment => ({
                            ...comment,
                            key: comment.key || `comment_${Date.now()}_${Math.random()}`
                        }));
                        
                        const existing = Array.isArray(this.mongoComments) ? this.mongoComments : [];
                        const currentFileKey = this.file?.key || this.file?.path;
                        const existingSameFile = currentFileKey
                            ? existing.filter(c => this._isSameFileKey(c.fileKey || (c.fileInfo && (c.fileInfo.key || c.fileInfo.path)), currentFileKey))
                            : existing;

                        const mergedByKey = new Map();
                        [...processedComments, ...existingSameFile].forEach(c => {
                            const k = c && c.key ? String(c.key) : '';
                            if (k) {
                                if (!mergedByKey.has(k)) mergedByKey.set(k, c);
                                return;
                            }
                            const fileK = this._normalizeFileKey(c.fileKey || (c.fileInfo && (c.fileInfo.key || c.fileInfo.path)));
                            const ts = c.timestamp || c.createdAt || c.createdTime || '';
                            const content = c.content || '';
                            const fallbackKey = `${fileK}__${ts}__${content}`;
                            if (!mergedByKey.has(fallbackKey)) mergedByKey.set(fallbackKey, c);
                        });
                        const merged = Array.from(mergedByKey.values());
                        const shouldKeepExisting = processedComments.length === 0 && existingSameFile.length > 0 && !!currentFileKey;
                        this.mongoComments = shouldKeepExisting ? existingSameFile : merged;
                        
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
                setTimeout(() => { this.debouncedLoadComments(); }, 100);
                setTimeout(() => { this.debouncedLoadComments(); }, 1000);
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
                
                try {
                    // 触发删除事件
                    this.$emit('comment-delete', commentId);
                    // 删除状态会通过watch renderComments自动清理
                } catch (error) {
                    console.error('[CommentPanel] 删除评论失败:', error);
                    // 清除删除状态
                    if (this.deletingComments[commentId]) {
                        delete this.deletingComments[commentId];
                    }
                } finally {
                    // 重置对话框数据
                    this.deleteTargetId = null;
                    this.deleteTargetAuthor = '';
                }
            },



            // 打开评论编辑器
            openCommentEditor(comment) {
                return safeExecute(() => {
                    if (!comment || !comment.key) return;
                    
                    console.log('[CommentPanel] 打开评论编辑器:', comment);
                    
                    // 设置编辑状态
                    this.editingComment = { ...comment };
                    this.editingCommentContent = comment.content ? comment.content.trim() : '';
                    this.editingCommentAuthor = comment.author ? comment.author.trim() : '';
                    
                    // 处理时间戳
                    if (comment.timestamp) {
                        const date = new Date(comment.timestamp);
                        // 转换为datetime-local格式 (YYYY-MM-DDTHH:mm)
                        this.editingCommentTimestamp = date.toISOString().slice(0, 16);
                    } else {
                        this.editingCommentTimestamp = new Date().toISOString().slice(0, 16);
                    }
                    
                    this.editingCommentText = comment.text ? comment.text.trim() : '';
                    this.editingRangeInfo = comment.rangeInfo ? { ...comment.rangeInfo } : { startLine: 1, endLine: 1 };
                    this.editingImprovementText = comment.improvementText ? comment.improvementText.trim() : '';
                    this.editingCommentType = comment.type || '';
                    this.editingCommentStatus = comment.status || 'pending';
                    this.editingSaving = false;
                    
                    // 显示编辑器
                    this.showCommentEditor = true;
                    
                    // 聚焦到内容输入框
                    this.$nextTick(() => {
                        const textarea = document.querySelector('.comment-content-textarea');
                        if (textarea) {
                            textarea.focus();
                            // 将光标移到末尾
                            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                        }
                    });
                }, '打开评论编辑器');
            },

            // 关闭评论编辑器
            closeCommentEditor() {
                return safeExecute(() => {
                    console.log('[CommentPanel] 关闭评论编辑器');
                    
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
                }, '关闭评论编辑器');
            },

            // 保存编辑后的评论（作者：liangliang）
            async saveEditedComment() {
                return safeExecute(async () => {
                    if (!this.editingComment || !this.editingComment.key) return;
                    
                    const newContent = (this.editingCommentContent || '').trim();

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

                        // 本地同步更新，提升体验（使用规范化后的数据）
                        const idx = this.mongoComments.findIndex(c => c.key === this.editingComment.key);
                        if (idx !== -1) {
                            const normalizedComment = window.aicrStore && window.aicrStore.normalizeComment 
                                ? window.aicrStore.normalizeComment({ 
                                    ...this.mongoComments[idx], 
                                    ...payload 
                                })
                                : { 
                                    ...this.mongoComments[idx], 
                                    author: newAuthor,
                                    content: newContent,
                                    text: newContent, // 确保 text 与 content 保持一致
                                    rangeInfo: this.editingRangeInfo,
                                    improvementText: this.editingImprovementText ? this.editingImprovementText.trim() : null,
                                    type: this.editingCommentType || null,
                                    status: this.editingCommentStatus
                                };
                            this.mongoComments[idx] = normalizedComment;
                        }

                        // 同步更新会话消息
                        try {
                            const fileKey = this.file?.fileKey || this.file?.key || this.file?.path;
                            if (fileKey) {
                                const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
                                const sessionSync = getSessionSyncService();
                                const updatedComment = window.aicrStore && window.aicrStore.normalizeComment
                                    ? window.aicrStore.normalizeComment({
                                        ...this.editingComment,
                                        ...payload,
                                        fileKey: fileKey,
                                        key: this.editingComment.key
                                    })
                                    : {
                                        ...this.editingComment,
                                        ...payload,
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

                        // 轻量刷新
                        this.debouncedLoadComments();
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
                
                const fileKey = comment.fileKey || (comment.fileInfo && comment.fileInfo.path);
                const rangeInfo = comment.rangeInfo;
                
                if (!fileKey) return;
                
                const normalizedRangeInfo = {
                    startLine: rangeInfo.startLine >= 1 ? rangeInfo.startLine : rangeInfo.startLine + 1,
                    endLine: rangeInfo.endLine >= 1 ? rangeInfo.endLine : rangeInfo.endLine + 1,
                    startChar: rangeInfo.startChar,
                    endChar: rangeInfo.endChar
                };
                
                const eventData = {
                    fileKey: fileKey,
                    rangeInfo: normalizedRangeInfo,
                    comment: comment
                };
                
                window.dispatchEvent(new CustomEvent('highlightCodeLines', { detail: eventData }));
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
                    if (!newComment.text) newComment.text = quotedText || content;
                    newComment.timestamp = normalizedTimestamp;
                    newComment.createdTime = normalizedTimestamp; // 毫秒数
                    newComment.createdAt = normalizedTimestamp; // 毫秒数
                }
                
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

                const storeComments = window.aicrStore?.comments?.value;
                if (Array.isArray(storeComments) && storeComments.length > 0) {
                    this.mongoComments = [...storeComments];
                    return;
                }

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

                if (this.isSessionChatMode) {
                    await this.loadSessionChatSession(true);
                } else {
                    // 优化：优先从 store 获取评论数据，避免重复调用接口
                    if (window.aicrStore && window.aicrStore.comments && window.aicrStore.comments.value && window.aicrStore.comments.value.length > 0) {
                        console.log('[CommentPanel] store中已有评论数据，直接使用，数量:', window.aicrStore.comments.value.length);
                        this.mongoComments = [...window.aicrStore.comments.value];
                    } else {
                        // 如果 store 中没有评论数据，且当前有选中的文件，才按需加载
                        if (this.file) {
                            console.log('[CommentPanel] store中没有评论数据，且已选中文件，按需加载评论');
                            this.debouncedLoadComments();
                        } else {
                            console.log('[CommentPanel] store中没有评论数据，且未选中文件，等待文件选择后再加载');
                        }
                    }
                }
            } else {
                console.warn('[CommentPanel] store初始化超时，使用默认数据');
            }
            
            // 监听文件选择变化，重新加载评论（优化：优先从 store 获取）
            this.$watch('file', (newFile, oldFile) => {
                console.log('[CommentPanel] 文件选择变化:', { newFile, oldFile });
                
                if (newFile && newFile !== oldFile) {
                    if (this.isSessionChatMode) {
                        this.loadSessionChatSession(true);
                        return;
                    }
                    // 优化：优先从 store 获取该文件的评论
                    if (window.aicrStore && window.aicrStore.comments && window.aicrStore.comments.value && window.aicrStore.comments.value.length > 0) {
                        const fileKey = newFile?.key || newFile?.path;
                        const filteredComments = window.aicrStore.comments.value.filter(c => {
                            const commentFileKey = c.fileKey || (c.fileInfo && (c.fileInfo.key || c.fileInfo.path));
                            return this._isSameFileKey(commentFileKey, fileKey);
                        });
                        
                        if (filteredComments.length > 0) {
                            console.log('[CommentPanel] 从 store 获取文件评论，数量:', filteredComments.length);
                            this.mongoComments = filteredComments;
                            return;
                        }
                    }
                    
                    console.log('[CommentPanel] store中没有该文件的评论，使用防抖重新加载:', newFile);
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
                    // 优化：优先从 store 获取所有评论
                    if (window.aicrStore && window.aicrStore.comments && window.aicrStore.comments.value && window.aicrStore.comments.value.length > 0) {
                        console.log('[CommentPanel] 从 store 获取所有评论，数量:', window.aicrStore.comments.value.length);
                        this.mongoComments = [...window.aicrStore.comments.value];
                    } else {
                        // 强制重置加载状态，确保能够重新请求
                        this._isLoadingComments = false;
                        // 立即刷新评论列表，显示所有评论
                        this.immediateLoadComments();
                    }
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
                    if (window.aicrStore && window.aicrStore.comments && window.aicrStore.comments.value && window.aicrStore.comments.value.length > 0) {
                        this.mongoComments = [...window.aicrStore.comments.value];
                    } else {
                        this.debouncedLoadComments();
                    }
                }
            });
            
            // 监听评论数据变化
            this.$watch('comments', async (newComments, oldComments) => {
                if (newComments && newComments !== oldComments) {
                    console.log('[CommentPanel] 评论数据变化，更新本地数据:', newComments);
                    const incoming = Array.isArray(newComments) ? newComments : [];
                    if (incoming.length > 0) {
                        this.mongoComments = [...incoming];
                        return;
                    }
                    const existing = Array.isArray(this.mongoComments) ? this.mongoComments : [];
                    if (existing.length === 0) {
                        this.mongoComments = [];
                    }
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

            console.log('[CommentPanel] 组件挂载完成');
            
            // 监听项目/版本变化事件
            window.addEventListener('projectReady', (event) => {
                console.log('[CommentPanel] 收到项目就绪事件:', event.detail);
                // 使用防抖重新加载评论数据
                this.debouncedLoadComments();
            });
            
            // 监听 CodeView 发来的评论更新请求（在弹框内编辑时触发）
            window.addEventListener('updateComment', async (event) => {
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
            });
            
            // 监听addNewComment事件，处理从codeView组件发送的新评论
            window.addEventListener('addNewComment', (event) => {
                console.log('[CommentPanel] 收到addNewComment事件');
                const { comment } = event.detail;
                
                if (comment) {
                    console.log('[CommentPanel] 添加新评论到本地数据:', comment);
                    this.addCommentToLocalData(comment);
                }
            });

            window.addEventListener('resetAicrComments', () => {
                this.resetToInitialState();
            });
            
            // 监听reloadComments事件，重新加载评论数据
            window.addEventListener('reloadComments', (event) => {
                console.log('[CommentPanel] 收到reloadComments事件:', event.detail);
                
                const resolvedFileKey = event.detail?.fileKey ?? event.detail?.key;

                // 防止重复触发
                if (this._lastReloadEvent && 
                    this._isSameFileKey(this._lastReloadEvent.fileKey, resolvedFileKey) &&
                    Date.now() - this._lastReloadEvent.timestamp < 500) {
                    console.log('[CommentPanel] 检测到重复的reloadComments事件，跳过处理');
                    return;
                }
                
                // 记录事件信息
                this._lastReloadEvent = {
                    fileKey: resolvedFileKey,
                    timestamp: Date.now()
                };
                
                const { forceReload, showAllComments, immediateReload } = event.detail || {};
                const fileKey = resolvedFileKey;
                
                // 优化：如果 store 中有评论数据，优先使用 store 的数据
                if (window.aicrStore && window.aicrStore.comments && window.aicrStore.comments.value && window.aicrStore.comments.value.length > 0 && !forceReload) {
                    const storeComments = window.aicrStore.comments.value;
                    
                    if (fileKey === null || !fileKey) {
                        // 显示所有评论
                        console.log('[CommentPanel] 从 store 获取所有评论，数量:', storeComments.length);
                        this.mongoComments = [...storeComments];
                        return;
                    } else {
                        // 过滤出该文件的评论
                        const filteredComments = storeComments.filter(c => {
                            const commentFileKey = c.fileKey || (c.fileInfo && (c.fileInfo.key || c.fileInfo.path));
                            return this._isSameFileKey(commentFileKey, fileKey);
                        });
                        
                        if (filteredComments.length > 0) {
                            console.log('[CommentPanel] 从 store 获取文件评论，数量:', filteredComments.length);
                            this.mongoComments = filteredComments;
                            return;
                        }
                    }
                }
                
                if (forceReload) {
                    console.log('[CommentPanel] 强制重新加载评论数据');
                    
                    // 如果fileKey为null且showAllComments为true，说明要显示所有评论
                    if (fileKey === null && showAllComments) {
                        console.log('[CommentPanel] 文件被取消选中，显示所有评论');
                        // 根据immediateReload参数决定是否立即刷新
                        if (immediateReload) {
                            console.log('[CommentPanel] 立即刷新评论列表（不使用防抖）');
                            // 强制重置加载状态，确保能够重新请求
                            this._isLoadingComments = false;
                            this.immediateLoadComments(true);
                        } else {
                            // 重新加载所有评论数据（不限制文件）
                            this.debouncedLoadComments(true);
                        }
                    } else if (fileKey === null) {
                        // 如果fileKey为null但showAllComments不为true，清空评论数据
                        console.log('[CommentPanel] 文件被取消选中，清空评论数据');
                        this.mongoComments = [];
                        this.fileComments = [];
                    } else {
                        // 否则根据immediateReload参数决定刷新方式
                        if (immediateReload) {
                            console.log('[CommentPanel] 立即刷新评论列表（不使用防抖）');
                            // 强制重置加载状态，确保能够重新请求
                            this._isLoadingComments = false;
                            this.immediateLoadComments(true);
                        } else {
                            // 使用防抖重新加载评论数据
                            this.debouncedLoadComments(true);
                        }
                    }
                }
            });
            
            // 监听projectReady事件，当项目准备就绪时重新加载评论
            window.addEventListener('projectReady', (event) => {
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
            });
        },
        
        beforeDestroy() {
            // 清理所有定时器和缓存
            this.cleanupAllTimers();
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



