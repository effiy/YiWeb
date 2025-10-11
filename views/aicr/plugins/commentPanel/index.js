// 代码评审评论面板组件 - 负责代码评审评论的展示和管理
// 作者：liangliang

import { safeExecute, createError, ErrorTypes } from '/utils/error.js';
import { loadCSSFiles } from '/utils/baseView.js';
import { getData } from '/apis/index.js';
const { postData } = await import('/apis/modules/crud.js');

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
        // 优先从store获取项目/版本信息
        let projectId = null;
        let versionId = null;
        
        if (window.aicrStore) {
            projectId = window.aicrStore.selectedProject ? window.aicrStore.selectedProject.value : null;
            versionId = window.aicrStore.selectedVersion ? window.aicrStore.selectedVersion.value : null;
            console.log('[CommentPanel] 从store获取项目ID:', projectId, '版本ID:', versionId);
        }
        
        // 如果store中没有，尝试从DOM元素获取
        if (!projectId || !versionId) {
            const projectSelect = document.getElementById('projectSelect');
            const versionSelect = document.getElementById('versionSelect');
            
            if (projectSelect) {
                projectId = projectSelect.value;
                console.log('[CommentPanel] 从选择器获取项目ID:', projectId);
            }
            
            if (versionSelect) {
                versionId = versionSelect.value;
                console.log('[CommentPanel] 从选择器获取版本ID:', versionId);
            }
        }
        
        // 检查项目/版本信息是否完整
        if (!projectId || !versionId) {
            console.log('[CommentPanel] 项目/版本信息不完整，跳过MongoDB接口请求');
            console.log('[CommentPanel] 项目ID:', projectId, '版本ID:', versionId);
            return [];
        }
        
        // 构建API URL
        let url = `${window.API_URL}/mongodb/?cname=comments`;
        
        // 添加项目/版本参数
        url += `&projectId=${projectId}`;
        url += `&versionId=${versionId}`;
        
        // 如果有文件信息，添加到URL中
        if (file) {
            // 兼容不同的文件ID字段
            const fileId = file.fileId || file.id || file.path || file.key;
            if (fileId) {
                url += `&fileId=${fileId}`;
                console.log('[CommentPanel] 添加文件ID到URL:', fileId);
            }
        } else {
            // 如果没有文件信息，不添加fileId参数，这样会返回所有评论
            console.log('[CommentPanel] 没有文件信息，将加载所有评论');
        }
        
        console.log('[CommentPanel] 调用MongoDB接口:', url);
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
                
                // 评论者数据
                commenters: [],
                selectedCommenterIds: [],
                
                // 加载状态
                commentsLoading: false,
                commentersLoading: false,
                
                // 错误信息
                commentsError: '',
                commentersError: '',
                
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
                newCommentText: ''
            };
        },
        computed: {
            commenterStats() {
                return safeExecute(() => {
                    const total = this.commenters.length;
                    const selected = this.selectedCommenterIds.length;
                    return { total, selected };
                }, '评论者统计计算');
            },
            renderComments() {
                // 优先使用mongoComments，如果没有则使用props中的comments
                const commentsToRender = (this.mongoComments && this.mongoComments.length > 0) ? this.mongoComments : this.comments;
                console.log('[CommentPanel] renderComments - mongoComments:', this.mongoComments);
                console.log('[CommentPanel] renderComments - props comments:', this.comments);
                console.log('[CommentPanel] renderComments - commentsToRender:', commentsToRender);
                
                const comments = (commentsToRender || []).map(comment => ({
                    ...comment,
                    key: comment.key || comment.id || `comment_${Date.now()}_${Math.random()}`
                })).sort((a, b) => {
                    const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
                    const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
                    return timeB - timeA;
                });
                
                console.log('[CommentPanel] renderComments - 最终评论列表:', comments);
                
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
                       this.commenters.length === 0;
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

            // 加载MongoDB评论数据
            async loadMongoComments() {
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
                        console.log('[CommentPanel] 开始加载评论数据，当前文件:', this.file);
                        
                        // 生成请求键，用于防止重复请求
                        const projectId = window.aicrStore?.selectedProject?.value || 
                                        document.getElementById('projectSelect')?.value;
                        const versionId = window.aicrStore?.selectedVersion?.value || 
                                        document.getElementById('versionSelect')?.value;
                        const fileId = this.file?.fileId || this.file?.id || this.file?.path || this.file?.key;
                        const requestKey = `${projectId}_${versionId}_${fileId || 'all'}`;
                        
                        // 检查是否与上次请求相同
                        if (this._lastRequestKey === requestKey && this._lastRequestTime && 
                            Date.now() - this._lastRequestTime < 1000) {
                            console.log('[CommentPanel] 请求键相同且时间间隔小于1秒，跳过重复请求');
                            return;
                        }
                        
                        this._lastRequestKey = requestKey;
                        this._lastRequestTime = Date.now();
                        
                        console.log('[CommentPanel] 请求键:', requestKey);
                        
                        // 即使没有选中文件，也尝试加载评论数据
                        // 这样可以处理页面刷新时文件选择延迟的情况
                        // 当没有文件时，会加载所有评论
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
                    this.commentersLoading = true;
                    this.commentersError = '';

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
                            this.commenters = [];
                            this.selectedCommenterIds = [];
                            return;
                        }
                        
                        // 检查store中的评论者方法是否可用
                        if (!window.aicrStore.loadCommenters) {
                            console.warn('[CommentPanel] store中loadCommenters方法不可用，使用默认评论者数据');
                            this.commenters = [];
                            this.selectedCommenterIds = [];
                            return;
                        }
                        
                        // 获取当前项目/版本信息
                        const projectId = window.aicrStore.selectedProject ? window.aicrStore.selectedProject.value : null;
                        const versionId = window.aicrStore.selectedVersion ? window.aicrStore.selectedVersion.value : null;
                        
                        console.log('[CommentPanel] 加载评论者数据，项目ID:', projectId, '版本ID:', versionId);
                        
                        // 如果项目/版本信息不完整，等待项目/版本信息设置完成
                        if (!projectId || !versionId) {
                            console.log('[CommentPanel] 项目/版本信息不完整，等待项目/版本信息设置完成');
                            // 等待项目/版本信息设置完成
                            await new Promise(resolve => {
                                const checkProjectVersion = () => {
                                    const currentProjectId = window.aicrStore.selectedProject ? window.aicrStore.selectedProject.value : null;
                                    const currentVersionId = window.aicrStore.selectedVersion ? window.aicrStore.selectedVersion.value : null;
                                    
                                    if (currentProjectId && currentVersionId) {
                                        console.log('[CommentPanel] 项目/版本信息已设置完成');
                                        resolve();
                                    } else {
                                        setTimeout(checkProjectVersion, 500);
                                    }
                                };
                                checkProjectVersion();
                            });
                        }
                        
                        // 重新获取项目/版本信息
                        const finalProjectId = window.aicrStore.selectedProject ? window.aicrStore.selectedProject.value : null;
                        const finalVersionId = window.aicrStore.selectedVersion ? window.aicrStore.selectedVersion.value : null;
                        
                        console.log('[CommentPanel] 最终项目ID:', finalProjectId, '最终版本ID:', finalVersionId);
                        
                        const commenters = await window.aicrStore.loadCommenters(finalProjectId, finalVersionId);
                        this.commenters = commenters || [];
                        console.log('[CommentPanel] 从store加载评论者数据:', this.commenters);
                        
                        // 从store获取选中状态
                        if (window.aicrStore.selectedCommenterIds && window.aicrStore.selectedCommenterIds.value) {
                            this.selectedCommenterIds = [...window.aicrStore.selectedCommenterIds.value];
                            console.log('[CommentPanel] 从store加载选中状态:', this.selectedCommenterIds);
                        } else if (this.commenters.length > 0) {
                            // 如果没有选中状态，默认选中第一个
                            this.selectedCommenterIds = [this.commenters[0].key];
                            console.log('[CommentPanel] 默认选中第一个评论者:', this.selectedCommenterIds);
                        }
                    } catch (error) {
                        console.error('[CommentPanel] 加载评论者数据失败:', error);
                        this.commentersError = '加载评论者数据失败';
                        // 即使失败也设置空数组，避免界面卡住
                        this.commenters = [];
                        this.selectedCommenterIds = [];
                    } finally {
                        this.commentersLoading = false;
                        this._isLoadingCommenters = false;
                    }
                }, '评论者数据加载');
            },

            // 选择评论者
            selectCommenters(commenterIds) {
                this.selectedCommenterIds = commenterIds;
                
                // 同步到store
                if (window.aicrStore && window.aicrStore.setSelectedCommenterIds) {
                    window.aicrStore.setSelectedCommenterIds(commenterIds);
                }
                
                this.$emit('commenter-select', this.commenters.filter(c => commenterIds.includes(c.key)));
            },

            // 切换单个评论者选择状态
            toggleCommenter(commenter) {
                const index = this.selectedCommenterIds.indexOf(commenter.key);
                if (index > -1) {
                    this.selectedCommenterIds.splice(index, 1);
                } else {
                    this.selectedCommenterIds.push(commenter.key);
                }
                
                // 同步到store
                if (window.aicrStore && window.aicrStore.setSelectedCommenterIds) {
                    window.aicrStore.setSelectedCommenterIds(this.selectedCommenterIds);
                }
                
                this.$emit('commenter-select', this.commenters.filter(c => this.selectedCommenterIds.includes(c.key)));
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

                const commentData = {
                    content: this.newCommentText.trim()
                };

                if (this.selectedCommenterIds.length > 0) {
                    const selectedCommenters = this.commenters.filter(c => this.selectedCommenterIds.includes(c.key));
                    if (selectedCommenters.length > 0) {
                        commentData.fromSystem = selectedCommenters;
                    }
                }

                // 清空输入框
                this.newCommentText = '';
                
                // 发出评论提交事件
                this.$emit('comment-submit', commentData);
                
                // 立即刷新评论列表，确保新评论能够显示
                console.log('[CommentPanel] 评论提交后立即刷新评论列表');
                setTimeout(() => {
                    this.debouncedLoadComments();
                }, 100);
                
                // 额外确保刷新，延迟更长时间再次刷新
                setTimeout(() => {
                    console.log('[CommentPanel] 评论提交后延迟刷新评论列表');
                    this.debouncedLoadComments();
                }, 1000);
            },

            // 处理评论输入
            handleCommentInput(event) {
                this.newCommentText = event.target.value;
                this.$emit('comment-input', event);
            },

            // 删除评论
            deleteComment(commentId) {
                if (confirm('确定要删除这条评论吗？')) {
                    this.$emit('comment-delete', commentId);
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

                    // 验证位置信息
                    if (this.editingRangeInfo.startLine < 1 || this.editingRangeInfo.endLine < 1) {
                        alert('行号必须大于0');
                        return;
                    }
                    if (this.editingRangeInfo.startLine > this.editingRangeInfo.endLine) {
                        alert('开始行号不能大于结束行号');
                        return;
                    }

                    // 防重复
                    if (this.editingSaving) return;
                    this.editingSaving = true;

                    // 获取项目/版本信息（与面板其他接口保持一致）
                    let projectId = null;
                    let versionId = null;
                    if (window.aicrStore) {
                        projectId = window.aicrStore.selectedProject ? window.aicrStore.selectedProject.value : null;
                        versionId = window.aicrStore.selectedVersion ? window.aicrStore.selectedVersion.value : null;
                    }

                    // 组装URL
                    let url = `${window.API_URL}/mongodb/?cname=comments`;

                    try {
                        const { updateData } = await import('/apis/modules/crud.js');
                        
                        const payload = {
                            key: this.editingComment.key,
                            author: newAuthor,
                            projectId: projectId,
                            versionId: versionId,
                            content: newContent,
                            text: this.editingCommentText ? this.editingCommentText.trim() : null,
                            rangeInfo: this.editingRangeInfo,
                            improvementText: this.editingImprovementText ? this.editingImprovementText.trim() : null,
                            type: this.editingCommentType || null,
                            status: this.editingCommentStatus,
                            updatedAt: new Date().toISOString()
                        };
                        
                        const result = await updateData(url, payload);
                        console.log('[CommentPanel] 评论更新成功:', result);

                        // 本地同步更新，提升体验
                        const idx = this.mongoComments.findIndex(c => (c.key || c.id) === this.editingComment.key);
                        if (idx !== -1) {
                            this.mongoComments[idx] = { 
                                ...this.mongoComments[idx], 
                                author: newAuthor,
                                content: newContent,
                                text: this.editingCommentText ? this.editingCommentText.trim() : null,
                                rangeInfo: this.editingRangeInfo,
                                improvementText: this.editingImprovementText ? this.editingImprovementText.trim() : null,
                                type: this.editingCommentType || null,
                                status: this.editingCommentStatus
                            };
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
                const newComment = {
                    ...commentData,
                    key: commentData.key || commentData.id || `comment_${Date.now()}_${Math.random()}`,
                    timestamp: commentData.timestamp || new Date().toISOString()
                };
                
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
                if (this.commenters.length === 0) {
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
                        // 获取当前项目/版本信息
                        const projectId = window.aicrStore.selectedProject ? window.aicrStore.selectedProject.value : null;
                        const versionId = window.aicrStore.selectedVersion ? window.aicrStore.selectedVersion.value : null;
                        
                        if (this.editingCommenter.key) {
                            // 更新现有评论者
                            await window.aicrStore.updateCommenter(this.editingCommenter.key, this.editingCommenter, projectId, versionId);
                            console.log('[CommentPanel] 评论者已更新到数据库');
                        } else {
                            // 添加新评论者
                            await window.aicrStore.addCommenter(this.editingCommenter, projectId, versionId);
                            console.log('[CommentPanel] 新评论者已添加到数据库');
                        }
                        
                        // 重新加载评论者列表
                        await this.loadCommenters();
                    } else {
                        // 如果没有store，使用本地更新
                        const index = this.commenters.findIndex(c => c.key === this.editingCommenter.key);
                        if (index !== -1) {
                            this.commenters[index] = { ...this.editingCommenter };
                            console.log('[CommentPanel] 评论者已更新:', this.commenters[index]);
                        } else {
                            this.commenters.push({ ...this.editingCommenter });
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
                    const index = this.commenters.findIndex(c => c.key === this.editingCommenter.key);
                    if (index !== -1) {
                        this.commenters[index] = { ...this.originalCommenter };
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
                        // 获取当前项目/版本信息
                        const projectId = window.aicrStore.selectedProject ? window.aicrStore.selectedProject.value : null;
                        const versionId = window.aicrStore.selectedVersion ? window.aicrStore.selectedVersion.value : null;
                        
                        console.log('[CommentPanel] 调用store删除评论者:', commenter.key, projectId, versionId);
                        await window.aicrStore.deleteCommenter(commenter.key, projectId, versionId);
                        console.log('[CommentPanel] 评论者已从数据库删除');
                        
                        // 重新加载评论者列表
                        await this.loadCommenters();
                    } else {
                        // 如果没有store或没有key，使用本地删除
                        console.log('[CommentPanel] 使用本地删除评论者:', commenter.key);
                        const index = this.commenters.findIndex(c => c.key === commenter.key);
                        if (index !== -1) {
                            this.commenters.splice(index, 1);
                            console.log('[CommentPanel] 评论者已删除');
                        }
                    }

                    // 从选中列表中移除
                    const selectedIndex = this.selectedCommenterIds.indexOf(commenter.key);
                    if (selectedIndex > -1) {
                        this.selectedCommenterIds.splice(selectedIndex, 1);
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
                                if (JSON.stringify(storeCommenters) !== JSON.stringify(this.commenters)) {
                                    console.log('[CommentPanel] 检测到store中评论者数据变化，同步更新');
                                    this.commenters = [...storeCommenters];
                                }
                            }
                            
                            // 同步选中状态
                            if (window.aicrStore && window.aicrStore.selectedCommenterIds && window.aicrStore.selectedCommenterIds.value) {
                                const storeSelectedIds = window.aicrStore.selectedCommenterIds.value;
                                if (JSON.stringify(storeSelectedIds) !== JSON.stringify(this.selectedCommenterIds)) {
                                    console.log('[CommentPanel] 检测到store中选中状态变化，同步更新');
                                    this.selectedCommenterIds = [...storeSelectedIds];
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
                    this.commenters = [...window.aicrStore.commenters.value];
                    
                    // 从store获取选中状态
                    if (window.aicrStore.selectedCommenterIds && window.aicrStore.selectedCommenterIds.value) {
                        this.selectedCommenterIds = [...window.aicrStore.selectedCommenterIds.value];
                    } else if (this.commenters.length > 0) {
                        this.selectedCommenterIds = [this.commenters[0].key];
                    }
                } else {
                    console.log('[CommentPanel] store中没有评论者数据，开始加载');
                    // 加载评论者数据
                    await this.loadCommenters();
                }

                // 立即尝试加载评论数据
                console.log('[CommentPanel] 开始加载评论数据');
                await this.loadMongoComments();
                
                // 使用防抖机制延迟加载评论，避免多次请求
                setTimeout(() => {
                    console.log('[CommentPanel] 延迟加载评论，确保文件选择完成');
                    this.debouncedLoadComments();
                }, 1000);
                
                // 再次延迟加载，确保所有数据都已加载完成
                setTimeout(() => {
                    console.log('[CommentPanel] 最终加载评论，确保所有数据加载完成');
                    this.debouncedLoadComments();
                }, 2000);
            } else {
                console.warn('[CommentPanel] store初始化超时，使用默认数据');
            }
            
            // 监听文件选择变化，重新加载评论
            this.$watch('file', (newFile, oldFile) => {
                console.log('[CommentPanel] 文件选择变化:', { newFile, oldFile });
                
                if (newFile && newFile !== oldFile) {
                    console.log('[CommentPanel] 文件选择变化，使用防抖重新加载评论:', newFile);
                    this.debouncedLoadComments();
                } else if (!newFile && oldFile) {
                    // 文件被取消选中（如按ESC键）
                    console.log('[CommentPanel] 文件被取消选中，立即刷新评论列表');
                    // 强制重置加载状态，确保能够重新请求
                    this._isLoadingComments = false;
                    // 立即刷新评论列表，显示所有评论
                    this.immediateLoadComments();
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
                    if (this.commenters.length === 0) {
                        setTimeout(() => {
                            this.openCommenterEditor();
                        }, 500);
                    } else {
                        // 显示加载动画
                        this.commentsLoading = true;
                        // 可以在此处触发AI生成评论内容的流程
                        Promise.all(
                          this.commenters.map(async commenter => {
                            const fromUserObj = {
                                text,
                                rangeInfo,
                                fileId: this.fileId || (this.file && (this.file.fileId || this.file.id || this.file.path || this.file.name)),
                                projectId: (window.aicrStore && window.aicrStore.selectedProject ? window.aicrStore.selectedProject.value : (document.getElementById('projectSelect') ? document.getElementById('projectSelect').value : null)),
                                versionId: (window.aicrStore && window.aicrStore.selectedVersion ? window.aicrStore.selectedVersion.value : (document.getElementById('versionSelect') ? document.getElementById('versionSelect').value : null)),
                                author: commenter.name || commenter.author || 'AI评论者',
                                status: "pending",
                                createdTime: new Date().toISOString(),
                                updatedTime: new Date().toISOString()
                            };
                            // 合并为字符串对象
                            const fromUser = JSON.stringify(fromUserObj);
                            const response = await postData(`${window.API_URL}/prompt`, {
                                fromSystem: commenter.forSystem,
                                fromUser
                            });
                            // 等待所有 postData 完成后再跳转页面
                            if (Array.isArray(response.data) && response.data.length > 0) {
                              await Promise.all(
                                response.data.map(async item => {
                                  await postData(`${window.API_URL}/mongodb/?cname=comments`, { ...item });
                                })
                              );
                            }
                          })
                        ).then(() => {
                        // 通知评论面板刷新
                        window.dispatchEvent(new CustomEvent('reloadComments', { 
                            detail: { 
                                forceReload: true, 
                                showAllComments: false, 
                                immediateReload: true,
                                fileId: this.fileId || (this.file && (this.file.fileId || this.file.id || this.file.path || this.file.name))
                            } 
                        }));

                        // 延迟后高亮刚添加的评论位置
                        setTimeout(() => {
                            if (rangeInfo && (this.fileId || (this.file && (this.file.fileId || this.file.id || this.file.path || this.file.name)))) {
                                console.log('[CommentPanel] 高亮新添加的评论位置:', rangeInfo);
                                window.dispatchEvent(new CustomEvent('highlightCodeLines', {
                                    detail: {
                                        fileId: this.fileId || (this.file && (this.file.fileId || this.file.id || this.file.path || this.file.name)),
                                        rangeInfo: rangeInfo
                                    }
                                }));
                            }
                        }, 500); // 等待评论面板刷新完成
                        }).finally(() => {
                          // 隐藏加载动画
                          this.commentsLoading = false;
                        });
                    }
                }, 100);
            });
            
            // 监听reloadComments事件，重新加载评论数据
            window.addEventListener('reloadComments', (event) => {
                console.log('[CommentPanel] 收到reloadComments事件:', event.detail);
                
                // 防止重复触发
                if (this._lastReloadEvent && 
                    this._lastReloadEvent.projectId === event.detail?.projectId &&
                    this._lastReloadEvent.versionId === event.detail?.versionId &&
                    this._lastReloadEvent.fileId === event.detail?.fileId &&
                    Date.now() - this._lastReloadEvent.timestamp < 500) {
                    console.log('[CommentPanel] 检测到重复的reloadComments事件，跳过处理');
                    return;
                }
                
                // 记录事件信息
                this._lastReloadEvent = {
                    projectId: event.detail?.projectId,
                    versionId: event.detail?.versionId,
                    fileId: event.detail?.fileId,
                    timestamp: Date.now()
                };
                
                const { projectId, versionId, fileId, forceReload, showAllComments, immediateReload } = event.detail;
                
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
                    this._lastProjectVersionEvent.versionId === event.detail?.versionId &&
                    Date.now() - this._lastProjectVersionEvent.timestamp < 1000) {
                    console.log('[CommentPanel] 检测到重复的projectVersionReady事件，跳过处理');
                    return;
                }
                
                // 记录事件信息
                this._lastProjectVersionEvent = {
                    projectId: event.detail?.projectId,
                    versionId: event.detail?.versionId,
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
        },
        template: template
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















