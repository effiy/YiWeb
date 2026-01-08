// 代码评审评论面板组件 - 负责代码评审评论的展示和管理
// 作者：liangliang

import { safeExecute, createError, ErrorTypes } from '/src/utils/error.js';
import { getData } from '/src/services/index.js';
import { defineComponent } from '/src/utils/componentLoader.js';
import { buildServiceUrl, SERVICE_MODULE } from '/src/services/helper/requestHelper.js';
const { postData } = await import('/src/services/modules/crud.js');

// 新增：异步获取评论数据（从mongo api）
async function fetchCommentsFromMongo(file) {
    try {
        // 优先从store获取项目/版本信息
        let projectId = null;
        if (window.aicrStore) {
            projectId = window.aicrStore.selectedProject ? window.aicrStore.selectedProject.value : null;
            console.log('[CommentPanel] 从store获取项目ID:', projectId);
        }
        
        // 如果store中没有，尝试从DOM元素获取
        if (!projectId) {
            const projectSelect = document.getElementById('projectSelect');
            
            if (projectSelect) {
                projectId = projectSelect.value;
                console.log('[CommentPanel] 从选择器获取项目ID:', projectId);
            }
        }
        
        // 检查项目信息是否完整
        if (!projectId) {
            console.log('[CommentPanel] 项目信息不完整，跳过MongoDB接口请求');
            console.log('[CommentPanel] 项目ID:', projectId);
            return [];
        }
        
        // 构建查询参数
        const queryParams = {
            cname: 'comments',
            projectId: projectId
        };
        
        // 如果有文件信息，添加到参数中
        if (file) {
            // 兼容不同的文件ID字段
            const fileId = file.fileId || file.id || file.path || file.key;
            if (fileId) {
                queryParams.fileId = fileId;
                console.log('[CommentPanel] 添加文件ID到参数:', fileId);
            }
        } else {
            // 如果没有文件信息，不添加fileId参数，这样会返回所有评论
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
            projectId: {
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
            // 新增：评论者相关props
            commenters: {
                type: Array,
                default: () => []
            },
            selectedCommenterIds: {
                type: Array,
                default: () => []
            },
            commentersLoading: {
                type: Boolean,
                default: false
            },
            commentersError: {
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
            'commenter-select',
            'toggle-collapse'
        ],
        data() {
            return {
                // 评论数据
                mongoComments: [],
                fileComments: [],
                
                // 评论者数据（优先使用props，如果没有则使用内部数据）
                internalCommenters: [],
                internalSelectedCommenterIds: [],
                
                // 加载状态
                commentsLoading: false,
                internalCommentersLoading: false,
                
                // 错误信息
                commentsError: '',
                internalCommentersError: '',
                
                // 编辑器状态
                showCommenterEditor: false,
                showCommentEditor: false,
                editingCommenter: null,
                originalCommenter: null,
                
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
                _isLoadingCommenters: false,
                _lastRequestKey: null,
                _lastRequestTime: null,
                _lastReloadEvent: null,
                _lastProjectVersionEvent: null,
                
                // 防抖定时器
                _debounceTimer: null,
                
                // 其他状态
                newCommentData: {
                    text: '',
                    commenterIds: [],
                    status: 'open'
                },
                
                // 评论输入状态
                newCommentText: '',
                
                // 删除评论状态管理
                deletingComments: {}
            };
        },
        computed: {
            // 合并props和内部数据的评论者信息
            finalCommenters() {
                // 优先使用props中的评论者数据，如果没有则使用内部数据
                const propsCommenters = this.commenters && Array.isArray(this.commenters) ? this.commenters : [];
                const internalCommenters = this.internalCommenters && Array.isArray(this.internalCommenters) ? this.internalCommenters : [];
                
                // 如果props中有数据，使用props；否则使用内部数据
                const result = propsCommenters.length > 0 ? propsCommenters : internalCommenters;
                
                console.log('[CommentPanel] finalCommenters计算:', {
                    propsCommenters: propsCommenters.length,
                    internalCommenters: internalCommenters.length,
                    result: result.length
                });
                
                return result;
            },
            finalSelectedCommenterIds() {
                // 优先使用props中的选中状态，如果没有则使用内部状态
                const propsSelected = this.selectedCommenterIds && Array.isArray(this.selectedCommenterIds) ? this.selectedCommenterIds : [];
                const internalSelected = this.internalSelectedCommenterIds && Array.isArray(this.internalSelectedCommenterIds) ? this.internalSelectedCommenterIds : [];
                
                const result = propsSelected.length > 0 ? propsSelected : internalSelected;
                
                console.log('[CommentPanel] finalSelectedCommenterIds计算:', {
                    propsSelected: propsSelected.length,
                    internalSelected: internalSelected.length,
                    result: result.length
                });
                
                return result;
            },
            finalCommentersLoading() {
                return this.commentersLoading || this.internalCommentersLoading;
            },
            finalCommentersError() {
                return this.commentersError || this.internalCommentersError;
            },
            commenterStats() {
                return safeExecute(() => {
                    const total = this.finalCommenters.length;
                    const selected = this.finalSelectedCommenterIds.length;
                    return { total, selected };
                }, '评论者统计计算');
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
                    key: comment.key || comment.id || `comment_${Date.now()}_${Math.random()}`
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
            // 检查是否应该自动关闭评论者编辑器
            shouldAutoCloseEditor() {
                return this.showCommenterEditor && 
                       !this.editingCommenter && 
                       this.finalCommenters.length === 0;
            }
        },
        methods: {
            // 将Markdown渲染为HTML（与codeView保持一致的轻量实现）
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
                        const codeId = `comment-code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        
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
            async loadMongoComments() {
                return safeExecute(async () => {
                    // 防止重复请求
                    if (this._isLoadingComments) {
                        console.log('[CommentPanel] 评论数据正在加载中，跳过重复请求');
                        return;
                    }
                    
                    // 优化：优先从 store 获取评论数据
                    if (window.aicrStore && window.aicrStore.comments && window.aicrStore.comments.value && window.aicrStore.comments.value.length > 0) {
                        const storeComments = window.aicrStore.comments.value;
                        const fileId = this.file?.fileId || this.file?.id || this.file?.path || this.file?.key;
                        
                        // 如果当前有选中的文件，过滤出该文件的评论；否则使用所有评论
                        let filteredComments = storeComments;
                        if (fileId) {
                            filteredComments = storeComments.filter(c => {
                                const commentFileId = c.fileId || (c.fileInfo && c.fileInfo.fileId);
                                return commentFileId === fileId;
                            });
                        }
                        
                        if (filteredComments.length > 0 || !fileId) {
                            console.log('[CommentPanel] 从 store 获取评论数据，数量:', filteredComments.length, '文件ID:', fileId || 'all');
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
                        const projectId = window.aicrStore?.selectedProject?.value || 
                                        document.getElementById('projectSelect')?.value;
                        const fileId = this.file?.fileId || this.file?.id || this.file?.path || this.file?.key;
                        const requestKey = `${projectId}_${fileId || 'all'}`;
                        
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
                            key: comment.key || comment.id || `comment_${Date.now()}_${Math.random()}`
                        }));
                        
                        this.mongoComments = processedComments;
                        
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

            // 加载评论者数据
            async loadCommenters() {
                return safeExecute(async () => {
                    // 防止重复加载
                    if (this._isLoadingCommenters) {
                        console.log('[CommentPanel] 评论者数据正在加载中，跳过重复请求');
                        return;
                    }
                    
                    this._isLoadingCommenters = true;
                    this.internalCommentersLoading = true;
                    this.internalCommentersError = '';

                    try {
                        // 等待store初始化完成
                        let retryCount = 0;
                        const maxRetries = 10;
                        
                        while (!window.aicrStore && retryCount < maxRetries) {
                            console.log(`[CommentPanel] 等待store初始化... (${retryCount + 1}/${maxRetries})`);
                            await new Promise(resolve => setTimeout(resolve, 500));
                            retryCount++;
                        }
                        
                        if (!window.aicrStore) {
                            console.warn('[CommentPanel] store初始化超时，使用默认评论者数据');
                            this.internalCommenters = [];
                            this.internalSelectedCommenterIds = [];
                            return;
                        }
                        
                        // 检查store中的评论者方法是否可用
                        if (!window.aicrStore.loadCommenters) {
                            console.warn('[CommentPanel] store中loadCommenters方法不可用，使用默认评论者数据');
                            this.internalCommenters = [];
                            this.internalSelectedCommenterIds = [];
                            return;
                        }
                        
                        // 获取当前项目信息
                        const projectId = window.aicrStore.selectedProject ? window.aicrStore.selectedProject.value : null;
                        
                        console.log('[CommentPanel] 加载评论者数据，项目ID:', projectId);
                        
                        // 如果项目信息不完整，等待项目信息设置完成
                        if (!projectId) {
                            console.log('[CommentPanel] 项目信息不完整，等待项目信息设置完成');
                            // 等待项目信息设置完成
                            await new Promise(resolve => {
                                const checkProject = () => {
                                    const currentProjectId = window.aicrStore.selectedProject ? window.aicrStore.selectedProject.value : null;
                                    
                                    if (currentProjectId) {
                                        console.log('[CommentPanel] 项目信息已设置完成');
                                        resolve();
                                    } else {
                                        setTimeout(checkProject, 500);
                                    }
                                };
                                checkProject();
                            });
                        }
                        
                        // 重新获取项目信息
                        const finalProjectId = window.aicrStore.selectedProject ? window.aicrStore.selectedProject.value : null;
                        
                        console.log('[CommentPanel] 最终项目ID:', finalProjectId);
                        
                        const commenters = await window.aicrStore.loadCommenters(finalProjectId);
                        this.internalCommenters = commenters || [];
                        console.log('[CommentPanel] 从store加载评论者数据:', this.internalCommenters);
                        
                        // 从store获取选中状态
                        if (window.aicrStore.selectedCommenterIds && window.aicrStore.selectedCommenterIds.value) {
                            this.internalSelectedCommenterIds = [...window.aicrStore.selectedCommenterIds.value];
                            console.log('[CommentPanel] 从store加载选中状态:', this.internalSelectedCommenterIds);
                        } else if (this.internalCommenters.length > 0) {
                            // 如果没有选中状态，默认选中第一个
                            this.internalSelectedCommenterIds = [this.internalCommenters[0].key];
                            console.log('[CommentPanel] 默认选中第一个评论者:', this.internalSelectedCommenterIds);
                        }
                    } catch (error) {
                        console.error('[CommentPanel] 加载评论者数据失败:', error);
                        this.internalCommentersError = '加载评论者数据失败';
                        // 即使失败也设置空数组，避免界面卡住
                        this.internalCommenters = [];
                        this.internalSelectedCommenterIds = [];
                    } finally {
                        this.internalCommentersLoading = false;
                        this._isLoadingCommenters = false;
                    }
                }, '评论者数据加载');
            },

            // 选择评论者
            selectCommenters(commenterIds) {
                // 更新内部选中状态
                this.internalSelectedCommenterIds = [...commenterIds];
                
                // 同步到store
                if (window.aicrStore && window.aicrStore.setSelectedCommenterIds) {
                    window.aicrStore.setSelectedCommenterIds(commenterIds);
                }
                
                // 使用finalCommenters获取评论者列表
                const commenters = this.finalCommenters.filter(c => commenterIds.includes(c.key));
                this.$emit('commenter-select', commenters);
            },

            // 切换单个评论者选择状态
            toggleCommenter(commenter) {
                const currentSelected = [...this.finalSelectedCommenterIds];
                const index = currentSelected.indexOf(commenter.key);
                
                if (index > -1) {
                    currentSelected.splice(index, 1);
                } else {
                    currentSelected.push(commenter.key);
                }
                
                // 更新内部选中状态
                this.internalSelectedCommenterIds = currentSelected;
                
                // 同步到store
                if (window.aicrStore && window.aicrStore.setSelectedCommenterIds) {
                    window.aicrStore.setSelectedCommenterIds(currentSelected);
                }
                
                // 使用finalCommenters获取评论者列表
                const commenters = this.finalCommenters.filter(c => currentSelected.includes(c.key));
                this.$emit('commenter-select', commenters);
            },

            // 获取评论者头像样式
            getCommenterAvatar(commenter) {
                if (commenter.avatar) {
                    return {
                        backgroundImage: `url(${commenter.avatar})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        text: ''
                    };
                }

                const colorPalettes = [
                    { bg: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', text: '#ffffff' },
                    { bg: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)', text: '#ffffff' },
                    { bg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', text: '#ffffff' },
                    { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', text: '#ffffff' },
                    { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', text: '#ffffff' }
                ];

                const index = commenter.name.charCodeAt(0) % colorPalettes.length;
                const palette = colorPalettes[index];

                return {
                    background: palette.bg,
                    color: palette.text,
                    text: commenter.name.charAt(0).toUpperCase(),
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                };
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

                const selectedIds = Array.isArray(this.finalSelectedCommenterIds) ? this.finalSelectedCommenterIds : [];
                const selectedCommenters = (Array.isArray(this.finalCommenters) ? this.finalCommenters : []).filter(c => selectedIds.includes(c.key));

                if (selectedCommenters.length === 0) {
                    // 无选中评论者：按原流程走手动提交
                    const commentData = { content: text };
                    this.$emit('comment-submit', commentData);
                    setTimeout(() => { this.debouncedLoadComments(); }, 100);
                    setTimeout(() => { this.debouncedLoadComments(); }, 1000);
                    return;
                }

                // 有选中评论者：直接调用 /prompt，结果即时加入列表并后台写库
                try {
                    await Promise.all(selectedCommenters.map(async (commenter) => {
                        const fromUserObj = {
                            text,
                            rangeInfo: {},
                            fileId: this.fileId || (this.file && (this.file.fileId || this.file.id || this.file.path || this.file.name)),
                            projectId: (window.aicrStore && window.aicrStore.selectedProject ? window.aicrStore.selectedProject.value : (document.getElementById('projectSelect') ? document.getElementById('projectSelect').value : null)),
                            author: commenter.name || commenter.author || 'AI评论者',
                            status: 'pending',
                            createdTime: new Date().toISOString(),
                            updatedTime: new Date().toISOString()
                        };
                        const fromUser = JSON.stringify(fromUserObj);
                        const { streamPromptJSON, postData } = await import('/src/services/modules/crud.js');
                        const response = await streamPromptJSON(`${window.API_URL}/prompt`, {
                            fromSystem: commenter.forSystem,
                            fromUser
                        });
                        if (Array.isArray(response?.data) && response.data.length > 0) {
                            for (const item of response.data) {
                                let commentObj = (item && typeof item === 'object') ? { ...item } : { content: String(item || '') };
                                if (!commentObj.content) {
                                    const alt = item && typeof item === 'object' ? (item.content || item.text || item.body || item.message || item.comment) : null;
                                    if (alt) commentObj.content = String(alt);
                                }
                                commentObj.fileId = commentObj.fileId || fromUserObj.fileId;
                                commentObj.projectId = commentObj.projectId || fromUserObj.projectId;
                                commentObj.author = commentObj.author || fromUserObj.author;
                                commentObj.status = commentObj.status || 'pending';
                                
                                // 规范化评论数据，确保字段一致性
                                if (window.aicrStore && window.aicrStore.normalizeComment) {
                                    commentObj = window.aicrStore.normalizeComment(commentObj);
                                } else {
                                    // 如果没有规范化函数，手动设置字段
                                    const content = String(commentObj.content || '').trim();
                                    const timestamp = Date.now();
                                    commentObj.content = content;
                                    commentObj.text = content; // content 和 text 保持一致
                                    commentObj.timestamp = timestamp;
                                    commentObj.createdTime = timestamp; // 毫秒数
                                    commentObj.createdAt = timestamp; // 毫秒数
                                }
                                commentObj.updatedTime = new Date().toISOString();

                                try { if (Array.isArray(this.comments)) this.comments.push(commentObj); } catch (_) {}
                                try { window.dispatchEvent(new CustomEvent('addNewComment', { detail: { comment: commentObj } })); } catch (_) {}
                                try {
                                    const payload = {
                                        module_name: SERVICE_MODULE,
                                        method_name: 'create_document',
                                        parameters: {
                                            cname: 'comments',
                                            data: commentObj
                                        }
                                    };
                                    await postData(`${window.API_URL}/`, payload);
                                } catch (e) { console.warn('[CommentPanel] 后台写库失败（已在本地显示）:', e); }
                            }
                        }
                    }));
                } finally {
                    setTimeout(() => { this.debouncedLoadComments(); }, 150);
                }
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
                
                // 显示确认对话框
                const confirmed = await this.showDeleteConfirmation(commentAuthor);
                if (!confirmed) {
                    return;
                }
                
                // 设置删除状态（Vue 3 直接赋值即可）
                this.deletingComments[commentId] = true;
                
                try {
                    // 触发删除事件
                    this.$emit('comment-delete', commentId);
                    // 删除状态会通过watch renderComments自动清理
                } catch (error) {
                    console.error('[CommentPanel] 删除评论失败:', error);
                    // 清除删除状态
                    delete this.deletingComments[commentId];
                }
            },
            
            // 显示删除确认对话框
            showDeleteConfirmation(commentAuthor) {
                return new Promise((resolve) => {
                    try {
                        // 创建对话框HTML
                        const dialogHTML = `
                            <div class="delete-confirmation-dialog" role="dialog" aria-labelledby="delete-dialog-title" aria-modal="true">
                                <div class="dialog-overlay"></div>
                                <div class="dialog-content">
                                    <div class="dialog-header">
                                        <i class="fas fa-exclamation-triangle"></i>
                                        <h3 id="delete-dialog-title">确认删除评论</h3>
                                    </div>
                                    <div class="dialog-body">
                                        <p>确定要删除 <strong>${commentAuthor}</strong> 的评论吗？</p>
                                        <p class="warning-text">此操作不可恢复，请谨慎操作。</p>
                                    </div>
                                    <div class="dialog-actions">
                                        <button class="btn-cancel" aria-label="取消删除">取消</button>
                                        <button class="btn-confirm" aria-label="确认删除">确认删除</button>
                                    </div>
                                </div>
                            </div>
                        `;
                        
                        // 创建对话框元素
                        const dialog = document.createElement('div');
                        dialog.innerHTML = dialogHTML;
                        const dialogElement = dialog.firstElementChild;
                        document.body.appendChild(dialogElement);
                        
                        // 添加显示动画
                        requestAnimationFrame(() => {
                            dialogElement.classList.add('show');
                        });
                        
                        // 绑定事件
                        const cancelBtn = dialogElement.querySelector('.btn-cancel');
                        const confirmBtn = dialogElement.querySelector('.btn-confirm');
                        const overlay = dialogElement.querySelector('.dialog-overlay');
                        
                        const closeDialog = (result) => {
                            dialogElement.classList.remove('show');
                            setTimeout(() => {
                                if (dialogElement && dialogElement.parentNode) {
                                    dialogElement.remove();
                                }
                                resolve(result);
                            }, 300);
                        };
                        
                        cancelBtn.addEventListener('click', () => closeDialog(false));
                        confirmBtn.addEventListener('click', () => closeDialog(true));
                        overlay.addEventListener('click', () => closeDialog(false));
                        
                        // ESC键关闭
                        const handleEsc = (e) => {
                            if (e.key === 'Escape') {
                                document.removeEventListener('keydown', handleEsc);
                                closeDialog(false);
                            }
                        };
                        document.addEventListener('keydown', handleEsc);
                        
                    } catch (error) {
                        console.error('[CommentPanel] 显示确认对话框失败:', error);
                        // 降级到原生confirm
                        resolve(confirm(`确定要删除 ${commentAuthor} 的评论吗？此操作不可恢复。`));
                    }
                });
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

                    // 获取项目/版本信息（与面板其他接口保持一致）
                    let projectId = null;
                    if (window.aicrStore) {
                        projectId = window.aicrStore.selectedProject ? window.aicrStore.selectedProject.value : null;
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
                        let payload = {
                            key: this.editingComment.key,
                            author: finalAuthor,
                            projectId: projectId,
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
                            payload = window.aicrStore.normalizeComment(payload);
                        }
                        
                        const result = await updateData(url, payload);
                        console.log('[CommentPanel] 评论更新成功:', result);

                        // 本地同步更新，提升体验（使用规范化后的数据）
                        const idx = this.mongoComments.findIndex(c => (c.key || c.id) === this.editingComment.key);
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
                            const fileId = this.file?.fileId || this.file?.id || this.file?.path;
                            if (fileId && projectId) {
                                const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
                                const sessionSync = getSessionSyncService();
                                const updatedComment = window.aicrStore && window.aicrStore.normalizeComment
                                    ? window.aicrStore.normalizeComment({
                                        ...this.editingComment,
                                        ...payload,
                                        key: this.editingComment.key
                                    })
                                    : {
                                        ...this.editingComment,
                                        ...payload,
                                        key: this.editingComment.key
                                    };
                                await sessionSync.syncCommentToMessage(updatedComment, fileId, projectId, false);
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
                
                const fileId = comment.fileId || (comment.fileInfo && comment.fileInfo.path);
                const rangeInfo = comment.rangeInfo;
                
                if (!fileId) return;
                
                const normalizedRangeInfo = {
                    startLine: rangeInfo.startLine >= 1 ? rangeInfo.startLine : rangeInfo.startLine + 1,
                    endLine: rangeInfo.endLine >= 1 ? rangeInfo.endLine : rangeInfo.endLine + 1,
                    startChar: rangeInfo.startChar,
                    endChar: rangeInfo.endChar
                };
                
                const eventData = {
                    fileId: fileId,
                    rangeInfo: normalizedRangeInfo,
                    comment: comment
                };
                
                window.dispatchEvent(new CustomEvent('highlightCodeLines', { detail: eventData }));
            },

            // 立即添加新评论到本地数据
            addCommentToLocalData(commentData) {
                let newComment = {
                    ...commentData,
                    key: commentData.key || commentData.id || `comment_${Date.now()}_${Math.random()}`
                };
                
                // 规范化评论数据，确保字段一致性
                if (window.aicrStore && window.aicrStore.normalizeComment) {
                    newComment = window.aicrStore.normalizeComment(newComment);
                } else {
                    // 如果没有规范化函数，手动设置字段
                    const content = String(newComment.content || newComment.text || '').trim();
                    const timestamp = newComment.timestamp || newComment.createdTime || newComment.createdAt || Date.now();
                    // 确保时间戳是毫秒数
                    const normalizedTimestamp = typeof timestamp === 'string' 
                        ? new Date(timestamp).getTime() 
                        : (timestamp < 1e12 ? timestamp * 1000 : timestamp);
                    
                    newComment.content = content;
                    newComment.text = content; // content 和 text 保持一致
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
            debouncedLoadComments() {
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
                    await this.loadMongoComments();
                }, 300); // 300ms防抖延迟
            },

            // 立即刷新评论列表（用于ESC键等需要立即响应的场景）
            immediateLoadComments() {
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
                this.loadMongoComments();
            },

            // 打开评论者编辑器
            openCommenterEditor() {
                console.log('[CommentPanel] 打开评论者编辑器');
                
                // 如果没有评论者，直接进入添加模式
                if (this.finalCommenters.length === 0) {
                    console.log('[CommentPanel] 没有评论者，直接进入添加模式');
                    this.showCommenterEditor = true;
                    this.addNewCommenter();
                    return;
                }
                
                // 有评论者时，正常打开编辑器
                this.showCommenterEditor = true;
                this.editingCommenter = null;
                this.originalCommenter = null;
            },

            // 关闭评论者编辑器
            closeCommenterEditor() {
                console.log('[CommentPanel] 关闭评论者编辑器');
                this.showCommenterEditor = false;
                this.editingCommenter = null;
                this.originalCommenter = null;
                
                // 强制更新视图
                this.$forceUpdate && this.$forceUpdate();
            },

            // 编辑评论者
            editCommenter(commenter) {
                console.log('[CommentPanel] 编辑评论者:', commenter);
                
                // 保存原始数据
                this.originalCommenter = { ...commenter };
                
                // 创建编辑副本
                this.editingCommenter = { ...commenter };
                
                console.log('[CommentPanel] 设置编辑状态:', this.editingCommenter);
                
                // 如果是在头像区域点击编辑，打开编辑器
                if (!this.showCommenterEditor) {
                    this.showCommenterEditor = true;
                    console.log('[CommentPanel] 打开评论者编辑器');
                }
                
                // 如果是新评论者（没有key），不需要添加到列表中，因为现在有专门的编辑区域
                if (!commenter.key) {
                    console.log('[CommentPanel] 新评论者，使用专门的编辑区域');
                }
                
                // 强制更新视图
                this.$forceUpdate && this.$forceUpdate();
            },

            // 保存评论者
            async saveCommenter() {
                if (!this.editingCommenter) {
                    console.log('[CommentPanel] 没有正在编辑的评论者');
                    return;
                }

                console.log('[CommentPanel] 保存评论者:', this.editingCommenter);

                // 验证必填字段
                if (!this.editingCommenter.name || !this.editingCommenter.name.trim()) {
                    alert('评论者姓名不能为空');
                    return;
                }

                // 验证模型选择
                if (!this.editingCommenter.model) {
                    alert('请选择AI模型');
                    return;
                }

                // 如果选择自定义模型，验证自定义模型名称
                if (this.editingCommenter.model === 'custom' && (!this.editingCommenter.customModel || !this.editingCommenter.customModel.trim())) {
                    alert('请输入自定义模型名称');
                    return;
                }

                // 验证模型参数
                if (this.editingCommenter.temperature < 0 || this.editingCommenter.temperature > 2) {
                    alert('温度参数必须在0-2之间');
                    return;
                }

                if (this.editingCommenter.maxTokens < 1 || this.editingCommenter.maxTokens > 8000) {
                    alert('最大长度参数必须在1-8000之间');
                    return;
                }

                if (this.editingCommenter.topP < 0 || this.editingCommenter.topP > 1) {
                    alert('Top P参数必须在0-1之间');
                    return;
                }

                try {
                    // 使用store中的API保存评论者
                    if (window.aicrStore) {
                        // 获取当前项目信息
                        const projectId = window.aicrStore.selectedProject ? window.aicrStore.selectedProject.value : null;
                        
                        if (this.editingCommenter.key) {
                            // 更新现有评论者
                            await window.aicrStore.updateCommenter(this.editingCommenter.key, this.editingCommenter, projectId);
                            console.log('[CommentPanel] 评论者已更新到数据库');
                        } else {
                            // 添加新评论者
                            await window.aicrStore.addCommenter(this.editingCommenter, projectId);
                            console.log('[CommentPanel] 新评论者已添加到数据库');
                        }
                        
                        // 重新加载评论者列表
                        await this.loadCommenters();
                    } else {
                        // 如果没有store，使用本地更新
                        const index = this.internalCommenters.findIndex(c => c.key === this.editingCommenter.key);
                        if (index !== -1) {
                            this.internalCommenters[index] = { ...this.editingCommenter };
                            console.log('[CommentPanel] 评论者已更新:', this.internalCommenters[index]);
                        } else {
                            this.internalCommenters.push({ ...this.editingCommenter });
                            console.log('[CommentPanel] 新评论者已添加:', this.editingCommenter);
                        }
                    }

                    // 清理编辑状态
                    this.editingCommenter = null;
                    this.originalCommenter = null;
                    
                    // 关闭弹框，回到评论者列表
                    this.showCommenterEditor = false;
                    
                    // 强制更新视图
                    this.$forceUpdate && this.$forceUpdate();
                } catch (error) {
                    console.error('[CommentPanel] 保存评论者失败:', error);
                    alert('保存评论者失败: ' + error.message);
                }
            },

            // 取消编辑
            cancelEdit() {
                console.log('[CommentPanel] 取消编辑');
                
                // 恢复原始数据
                if (this.originalCommenter && this.editingCommenter) {
                    const index = this.internalCommenters.findIndex(c => c.key === this.editingCommenter.key);
                    if (index !== -1) {
                        this.internalCommenters[index] = { ...this.originalCommenter };
                    }
                }
                
                // 清理编辑状态，返回到评论者列表视图
                this.editingCommenter = null;
                this.originalCommenter = null;
                
                // 关闭弹框，回到评论者列表
                this.showCommenterEditor = false;
                
                // 强制更新视图
                this.$forceUpdate && this.$forceUpdate();
            },

            // 删除评论者
            async deleteCommenter(commenter) {
                console.log('[CommentPanel] 删除评论者:', commenter);
                
                if (!confirm(`确定要删除评论者 "${commenter.name}" 吗？`)) {
                    return;
                }

                try {
                    // 使用store中的API删除评论者
                    if (window.aicrStore && commenter.key) {
                        // 获取当前项目信息
                        const projectId = window.aicrStore.selectedProject ? window.aicrStore.selectedProject.value : null;
                        
                        console.log('[CommentPanel] 调用store删除评论者:', commenter.key, projectId);
                        await window.aicrStore.deleteCommenter(commenter.key, projectId);
                        console.log('[CommentPanel] 评论者已从数据库删除');
                        
                        // 重新加载评论者列表
                        await this.loadCommenters();
                    } else {
                        // 如果没有store或没有key，使用本地删除
                        console.log('[CommentPanel] 使用本地删除评论者:', commenter.key);
                        const index = this.internalCommenters.findIndex(c => c.key === commenter.key);
                        if (index !== -1) {
                            this.internalCommenters.splice(index, 1);
                            console.log('[CommentPanel] 评论者已删除');
                        }
                    }

                    // 从选中列表中移除
                    const selectedIndex = this.internalSelectedCommenterIds.indexOf(commenter.key);
                    if (selectedIndex > -1) {
                        this.internalSelectedCommenterIds.splice(selectedIndex, 1);
                    }

                    // 如果删除的是正在编辑的评论者，清理编辑状态
                    if (this.editingCommenter && this.editingCommenter.key === commenter.key) {
                        this.editingCommenter = null;
                        this.originalCommenter = null;
                    }
                } catch (error) {
                    console.error('[CommentPanel] 删除评论者失败:', error);
                    alert('删除评论者失败: ' + error.message);
                }
            },

            // 添加新评论者
            addNewCommenter(event) {
                // 阻止事件冒泡
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                
                console.log('[CommentPanel] 添加新评论者按钮被点击');
                
                // 生成新的ID
                const newId = `user${Date.now()}`;
                
                // 创建新评论者
                const newCommenter = {
                    key: newId,
                    name: '',
                    avatar: null,
                    forSystem: '',
                    model: 'qwq',
                    customModel: 'qwq',
                    temperature: 0.7,
                    maxTokens: 2000,
                    topP: 0.9,
                    key: undefined // 明确设置为undefined，确保新评论者能被识别
                };
                
                console.log('[CommentPanel] 创建新评论者对象:', newCommenter);
                
                // 确保编辑器已打开
                this.showCommenterEditor = true;
                console.log('[CommentPanel] 打开评论者编辑器');
                
                // 清理之前的编辑状态
                this.originalCommenter = null;
                
                // 直接开始编辑新评论者（不显示评论者列表）
                this.editingCommenter = { ...newCommenter };
                
                console.log('[CommentPanel] 新评论者已创建并开始编辑:', newCommenter);
                console.log('[CommentPanel] 当前编辑状态:', this.editingCommenter);
                
                // 强制更新视图
                this.$forceUpdate && this.$forceUpdate();
                
                // 确保表单字段获得焦点
                this.$nextTick(() => {
                    const nameInput = document.querySelector('.commenter-edit-form input[placeholder="输入评论者姓名"]');
                    if (nameInput) {
                        nameInput.focus();
                        console.log('[CommentPanel] 姓名输入框已获得焦点');
                    }
                });
            },
            // 获取模型显示名称
            getModelDisplayName(model) {
                const modelNames = {
                    'gpt-4': 'GPT-4',
                    'gpt-3.5-turbo': 'GPT-3.5',
                    'claude-3-opus': 'Claude-3 Opus',
                    'claude-3-sonnet': 'Claude-3 Sonnet',
                    'claude-3-haiku': 'Claude-3 Haiku',
                    'gemini-pro': 'Gemini Pro',
                    'qwen-plus': 'Qwen Plus',
                    'qwen-turbo': 'Qwen Turbo',
                    'custom': '自定义模型'
                };
                return modelNames[model] || model;
            },
            
            // 设置store监听器
            setupStoreWatcher() {
                console.log('[CommentPanel] 设置store监听器');
                
                // 等待store初始化完成后再设置监听器
                const setupWatcher = () => {
                    if (window.aicrStore && window.aicrStore.commenters) {
                        console.log('[CommentPanel] store已初始化，设置数据监听器');
                        
                        // 使用定时器定期检查store中的评论者数据
                        this._storeWatcherInterval = setInterval(() => {
                            if (window.aicrStore && window.aicrStore.commenters && window.aicrStore.commenters.value) {
                                const storeCommenters = window.aicrStore.commenters.value;
                                if (JSON.stringify(storeCommenters) !== JSON.stringify(this.internalCommenters)) {
                                    console.log('[CommentPanel] 检测到store中评论者数据变化，同步更新');
                                    this.internalCommenters = [...storeCommenters];
                                }
                            }
                            
                            // 同步选中状态
                            if (window.aicrStore && window.aicrStore.selectedCommenterIds && window.aicrStore.selectedCommenterIds.value) {
                                const storeSelectedIds = window.aicrStore.selectedCommenterIds.value;
                                if (JSON.stringify(storeSelectedIds) !== JSON.stringify(this.internalSelectedCommenterIds)) {
                                    console.log('[CommentPanel] 检测到store中选中状态变化，同步更新');
                                    this.internalSelectedCommenterIds = [...storeSelectedIds];
                                }
                            }
                        }, 1000); // 每秒检查一次
                    } else {
                        console.log('[CommentPanel] store未初始化，延迟设置监听器');
                        setTimeout(setupWatcher, 500);
                    }
                };
                
                // 立即尝试设置监听器
                setupWatcher();
                
                // 监听项目/版本变化事件
                this._projectVersionListener = (event) => {
                    console.log('[CommentPanel] 收到项目/版本变化事件:', event.detail);
                    // 重新加载评论者数据
                    this.loadCommenters();
                };
                window.addEventListener('projectVersionReady', this._projectVersionListener);
            },
            
            // 清理store监听器
            cleanupStoreWatcher() {
                console.log('[CommentPanel] 清理store监听器');
                if (this._storeWatcherInterval) {
                    clearInterval(this._storeWatcherInterval);
                    this._storeWatcherInterval = null;
                }
                
                // 清理项目/版本变化事件监听器
                if (this._projectVersionListener) {
                    window.removeEventListener('projectVersionReady', this._projectVersionListener);
                    this._projectVersionListener = null;
                }
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
                
                // 清理store监听器
                this.cleanupStoreWatcher();
            }
        },
        async mounted() {
            console.log('[CommentPanel] 组件已挂载');
            
            // 监听store中评论者数据的变化
            this.setupStoreWatcher();
            
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
                
                // 检查store中是否已经有评论者数据，如果有则直接使用
                if (window.aicrStore.commenters && window.aicrStore.commenters.value && window.aicrStore.commenters.value.length > 0) {
                    console.log('[CommentPanel] store中已有评论者数据，直接使用');
                    this.internalCommenters = [...window.aicrStore.commenters.value];
                    
                    // 从store获取选中状态
                    if (window.aicrStore.selectedCommenterIds && window.aicrStore.selectedCommenterIds.value) {
                        this.internalSelectedCommenterIds = [...window.aicrStore.selectedCommenterIds.value];
                    } else if (this.internalCommenters.length > 0) {
                        this.internalSelectedCommenterIds = [this.internalCommenters[0].key];
                    }
                } else {
                    console.log('[CommentPanel] store中没有评论者数据，开始加载');
                    // 加载评论者数据
                    await this.loadCommenters();
                }

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
            } else {
                console.warn('[CommentPanel] store初始化超时，使用默认数据');
            }
            
            // 监听文件选择变化，重新加载评论（优化：优先从 store 获取）
            this.$watch('file', (newFile, oldFile) => {
                console.log('[CommentPanel] 文件选择变化:', { newFile, oldFile });
                
                if (newFile && newFile !== oldFile) {
                    // 优化：优先从 store 获取该文件的评论
                    if (window.aicrStore && window.aicrStore.comments && window.aicrStore.comments.value && window.aicrStore.comments.value.length > 0) {
                        const fileId = newFile?.fileId || newFile?.id || newFile?.path || newFile?.key;
                        const filteredComments = window.aicrStore.comments.value.filter(c => {
                            const commentFileId = c.fileId || (c.fileInfo && c.fileInfo.fileId);
                            return commentFileId === fileId;
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
            
            // 监听评论数据变化
            this.$watch('comments', async (newComments, oldComments) => {
                if (newComments && newComments !== oldComments) {
                    console.log('[CommentPanel] 评论数据变化，更新本地数据:', newComments);
                    // 更新本地评论数据
                    this.mongoComments = [...(newComments || [])];
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

            console.log('[CommentPanel] 组件挂载完成，评论者数据:', this.commenters);
            console.log('[CommentPanel] 选中的评论者:', this.selectedCommenterIds);
            
            // 监听项目/版本变化事件
            window.addEventListener('projectVersionReady', (event) => {
                console.log('[CommentPanel] 收到项目/版本变化事件:', event.detail);
                // 重新加载评论者数据
                this.loadCommenters();
                // 使用防抖重新加载评论数据
                this.debouncedLoadComments();
            });
            
            // 监听getSelectedCommenters事件，响应codeView组件获取选中评论者的请求
            window.addEventListener('getSelectedCommenters', (event) => {
                console.log('[CommentPanel] 收到getSelectedCommenters事件');
                const { callback } = event.detail;
                
                if (typeof callback === 'function') {
                    // 获取选中的评论者
                    const selectedCommenters = this.commenters.filter(c => 
                        this.selectedCommenterIds.includes(c.key)
                    );
                    
                    console.log('[CommentPanel] 返回选中的评论者:', selectedCommenters);
                    callback(selectedCommenters);
                }
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
            
            // 监听focusCommentPanel事件，处理从codeView组件发送的聚焦请求
            window.addEventListener('focusCommentPanel', (event) => {
                console.log('[CommentPanel] 收到focusCommentPanel事件');
                
                // 获取划词数据
                const { text, rangeInfo } = event.detail || {};
                console.log('[CommentPanel] 收到划词数据:', { text, rangeInfo });
                
                // 确保评论面板展开
                if (this.collapsed) {
                    this.$emit('toggle-collapse');
                }
                
                // 高亮评论者选择区域
                setTimeout(() => {
                    const avatarsContainer = document.querySelector('.avatars-container');
                    if (avatarsContainer) {
                        avatarsContainer.style.transition = 'all 0.3s ease';
                        avatarsContainer.style.boxShadow = '0 0 15px rgba(79,70,229,0.4)';
                        avatarsContainer.style.border = '2px solid rgba(79,70,229,0.6)';
                        avatarsContainer.style.borderRadius = '8px';
                        
                        setTimeout(() => {
                            avatarsContainer.style.boxShadow = '';
                            avatarsContainer.style.border = '';
                        }, 3000);
                    }
                    // 如果没有评论者，自动打开评论者编辑器
                    if (this.finalCommenters.length === 0) {
                        setTimeout(() => {
                            this.openCommenterEditor();
                        }, 500);
                    } else {
                        // 显示加载动画
                        this.commentsLoading = true;
                        // 可以在此处触发AI生成评论内容的流程
                        const selectedIds = Array.isArray(this.internalSelectedCommenterIds) ? this.internalSelectedCommenterIds : [];
                        if (!selectedIds.length) {
                          try { if (window.showWarning) { window.showWarning('请先选择至少一位评论者'); } } catch (_) {}
                          this.commentsLoading = false;
                          return;
                        }
                        Promise.all(
                          // 仅对当前选中的评论者调用
                          (Array.isArray(this.finalCommenters) ? this.finalCommenters : this.commenters).filter(c => selectedIds.includes(c.key)).map(async commenter => {
                             const fromUserObj = {
                                 text,
                                 rangeInfo,
                                 fileId: this.fileId || (this.file && (this.file.fileId || this.file.id || this.file.path || this.file.name)),
                                 projectId: (window.aicrStore && window.aicrStore.selectedProject ? window.aicrStore.selectedProject.value : (document.getElementById('projectSelect') ? document.getElementById('projectSelect').value : null)),
                                 author: commenter.name || commenter.author || 'AI评论者',
                                 status: "pending",
                                 createdTime: new Date().toISOString(),
                                 updatedTime: new Date().toISOString()
                             };
                             // 合并为字符串对象
                             const fromUser = JSON.stringify(fromUserObj);
                             // 使用流式请求处理 /prompt 接口（统一 JSON 返回，兼容旧协议）
                             const { streamPromptJSON } = await import('/src/services/modules/crud.js');
                             const response = await streamPromptJSON(`${window.API_URL}/`, {
                                 module_name: 'services.llm.prompt_service',
                                 method_name: 'stream_prompt',
                                 parameters: {
                                     fromSystem: commenter.forSystem,
                                     fromUser
                                 }
                             });
                             // 将结果直接添加到本地评论列表，并后台写库
                             let __added = 0;
                             if (Array.isArray(response?.data) && response.data.length > 0) {
                               const { postData } = await import('/src/services/modules/crud.js');
                              for (const item of response.data) {
                                 // 规范化为评论对象
                                const commentObj = (item && typeof item === 'object') ? { ...item } : { content: String(item || '') };
                                // 内容字段兜底映射
                                if (!commentObj.content) {
                                  const alt = item && typeof item === 'object'
                                    ? (item.content || item.text || item.body || item.message || item.comment)
                                    : null;
                                  if (alt) commentObj.content = String(alt);
                                }
                                 commentObj.fileId = commentObj.fileId || fromUserObj.fileId;
                                 commentObj.projectId = commentObj.projectId || fromUserObj.projectId;
                                 commentObj.author = commentObj.author || fromUserObj.author;
                                 commentObj.status = commentObj.status || 'pending';
                                 // 保留引用代码信息（如果有）
                                 if (fromUserObj.text) {
                                     commentObj.text = fromUserObj.text;
                                 }
                                 if (fromUserObj.rangeInfo) {
                                     commentObj.rangeInfo = fromUserObj.rangeInfo;
                                 }
                                 
                                 // 规范化评论数据，确保字段一致性
                                 if (window.aicrStore && window.aicrStore.normalizeComment) {
                                     commentObj = window.aicrStore.normalizeComment(commentObj);
                                 } else {
                                     // 如果没有规范化函数，手动设置字段
                                     const content = String(commentObj.content || commentObj.text || '').trim();
                                     const timestamp = Date.now();
                                     commentObj.content = content;
                                     // 如果有 rangeInfo，保留原有的 text（引用代码），否则使用 content
                                     if (!commentObj.rangeInfo) {
                                         commentObj.text = content; // content 和 text 保持一致
                                     }
                                     commentObj.timestamp = timestamp;
                                     commentObj.createdTime = timestamp; // 毫秒数
                                     commentObj.createdAt = timestamp; // 毫秒数
                                 }
                                 commentObj.updatedTime = new Date().toISOString();

                                 // 1) 立即加入本地UI
                                 try { this.addCommentToLocalData(commentObj); } catch (e) {}
                                 try { window.dispatchEvent(new CustomEvent('addNewComment', { detail: { comment: commentObj } })); } catch (e) {}

                                // 2) 后台写库
                                try {
                                  const payload = {
                                    module_name: SERVICE_MODULE,
                                    method_name: 'create_document',
                                    parameters: {
                                      cname: 'comments',
                                      data: commentObj
                                    }
                                  };
                                  await postData(`${window.API_URL}/`, payload);
                                } catch (e) {
                                  console.warn('[CommentPanel] 后台写库失败（已在本地显示）:', e);
                                }
                                 __added++;
                               }
                             }
                             if (!__added) {
                               let fallback = {
                                 content: text,
                                 fileId: fromUserObj.fileId,
                                 projectId: fromUserObj.projectId,
                                 author: fromUserObj.author,
                                 status: 'pending',
                                 timestamp: Date.now(), // 使用毫秒数
                                 rangeInfo
                               };
                               
                               // 规范化评论数据，确保字段一致性
                               if (window.aicrStore && window.aicrStore.normalizeComment) {
                                   fallback = window.aicrStore.normalizeComment(fallback);
                               } else {
                                   // 如果有 rangeInfo，保留原有的 text（引用代码），否则使用 content
                                   if (!fallback.rangeInfo) {
                                       fallback.text = fallback.content; // content 和 text 保持一致
                                   }
                                   fallback.createdTime = fallback.timestamp; // 毫秒数
                                   fallback.createdAt = fallback.timestamp; // 毫秒数
                               }
                               fallback.updatedTime = new Date().toISOString();
                               
                               try { this.addCommentToLocalData(fallback); } catch (_) {}
                               try { 
                                   const payload = {
                                       module_name: SERVICE_MODULE,
                                       method_name: 'create_document',
                                       parameters: {
                                           cname: 'comments',
                                           data: fallback
                                       }
                                   };
                                   await postData(`${window.API_URL}/`, payload); 
                               } catch (e) {}
                             }
                          })
                        ).then(() => {
                         // 通知评论面板刷新
                         window.dispatchEvent(new CustomEvent('reloadComments', { 
                             detail: { 
                                 projectId: (window.aicrStore && window.aicrStore.selectedProject ? window.aicrStore.selectedProject.value : (document.getElementById('projectSelect') ? document.getElementById('projectSelect').value : null))
                             } 
                        }));
                        this.commentsLoading = false;
                      }).catch(() => {
                        this.commentsLoading = false;
                      })
                    }
                }, 100);
            });
            
            // 监听reloadComments事件，重新加载评论数据
            window.addEventListener('reloadComments', (event) => {
                console.log('[CommentPanel] 收到reloadComments事件:', event.detail);
                
                // 防止重复触发
                if (this._lastReloadEvent && 
                    this._lastReloadEvent.projectId === event.detail?.projectId &&
                    this._lastReloadEvent.fileId === event.detail?.fileId &&
                    Date.now() - this._lastReloadEvent.timestamp < 500) {
                    console.log('[CommentPanel] 检测到重复的reloadComments事件，跳过处理');
                    return;
                }
                
                // 记录事件信息
                this._lastReloadEvent = {
                    projectId: event.detail?.projectId,
                    fileId: event.detail?.fileId,
                    timestamp: Date.now()
                };
                
                const { projectId, fileId, forceReload, showAllComments, immediateReload } = event.detail;
                
                // 优化：如果 store 中有评论数据，优先使用 store 的数据
                if (window.aicrStore && window.aicrStore.comments && window.aicrStore.comments.value && window.aicrStore.comments.value.length > 0 && !forceReload) {
                    const storeComments = window.aicrStore.comments.value;
                    
                    if (fileId === null || !fileId) {
                        // 显示所有评论
                        console.log('[CommentPanel] 从 store 获取所有评论，数量:', storeComments.length);
                        this.mongoComments = [...storeComments];
                        return;
                    } else {
                        // 过滤出该文件的评论
                        const filteredComments = storeComments.filter(c => {
                            const commentFileId = c.fileId || (c.fileInfo && c.fileInfo.fileId);
                            return commentFileId === fileId;
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
                    
                    // 如果fileId为null且showAllComments为true，说明要显示所有评论
                    if (fileId === null && showAllComments) {
                        console.log('[CommentPanel] 文件被取消选中，显示所有评论');
                        // 根据immediateReload参数决定是否立即刷新
                        if (immediateReload) {
                            console.log('[CommentPanel] 立即刷新评论列表（不使用防抖）');
                            // 强制重置加载状态，确保能够重新请求
                            this._isLoadingComments = false;
                            this.immediateLoadComments();
                        } else {
                            // 重新加载所有评论数据（不限制文件）
                            this.debouncedLoadComments();
                        }
                    } else if (fileId === null) {
                        // 如果fileId为null但showAllComments不为true，清空评论数据
                        console.log('[CommentPanel] 文件被取消选中，清空评论数据');
                        this.mongoComments = [];
                        this.fileComments = [];
                    } else {
                        // 否则根据immediateReload参数决定刷新方式
                        if (immediateReload) {
                            console.log('[CommentPanel] 立即刷新评论列表（不使用防抖）');
                            // 强制重置加载状态，确保能够重新请求
                            this._isLoadingComments = false;
                            this.immediateLoadComments();
                        } else {
                            // 使用防抖重新加载评论数据
                            this.debouncedLoadComments();
                        }
                    }
                }
            });
            
            // 监听projectVersionReady事件，当项目/版本切换完成时重新加载评论
            window.addEventListener('projectVersionReady', (event) => {
                console.log('[CommentPanel] 收到projectVersionReady事件:', event.detail);
                
                // 防止重复触发
                if (this._lastProjectVersionEvent && 
                    this._lastProjectVersionEvent.projectId === event.detail?.projectId &&
                    Date.now() - this._lastProjectVersionEvent.timestamp < 1000) {
                    console.log('[CommentPanel] 检测到重复的projectVersionReady事件，跳过处理');
                    return;
                }
                
                // 记录事件信息
                this._lastProjectVersionEvent = {
                    projectId: event.detail?.projectId,
                    timestamp: Date.now()
                };
                
                // 延迟加载评论，确保store数据已更新
                setTimeout(() => {
                    console.log('[CommentPanel] 项目/版本切换完成，开始加载评论数据');
                    this.debouncedLoadComments();
                }, 200);
            });
            
            // 监听shouldAutoCloseEditor的变化
            this.$watch('shouldAutoCloseEditor', (newValue) => {
                if (newValue) {
                    console.log('[CommentPanel] 检测到评论者列表为空且不在编辑状态，自动关闭编辑器');
                    this.closeCommenterEditor();
                }
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

















