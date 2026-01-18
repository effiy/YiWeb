// 代码查看组件 - 轻量实现，满足组件注册与基本展示需求
import { safeExecute, safeGet, safeGetPath, safeArrayOperation } from '/src/utils/error.js';
import { showSuccess, showError } from '/src/utils/message.js';
import { defineComponent } from '/src/utils/componentLoader.js';
import { SERVICE_MODULE, buildServiceUrl } from '/src/services/helper/requestHelper.js';

// 组件配置项
const componentOptions = {
    name: 'CodeView',
    css: '/src/views/aicr/components/codeView/index.css',
    html: '/src/views/aicr/components/codeView/index.html',
    props: {
        file: {
            type: Object,
            default: null
        },
        viewMode: {
            type: String,
            default: 'tree'
        },
        activeSession: {
            type: Object,
            default: null
        },
        activeSessionLoading: {
            type: Boolean,
            default: false
        },
        activeSessionError: {
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
        comments: {
            type: Array,
            default: () => []
        },
        hideJumpButton: {
            type: Boolean,
            default: false
        }
    },
    emits: ['comment-delete', 'comment-resolve', 'comment-reopen', 'reload-comments', 'session-chat-send', 'session-context-save'],
    // 错误边界处理
    errorCaptured(error, instance, info) {
        console.error('[CodeView] 捕获到子组件错误:', error, info);

        // 检查是否是浏览器扩展错误
        if (window.handleBrowserExtensionError && window.handleBrowserExtensionError(error, 'CodeView')) {
            return false; // 忽略扩展错误
        }

        // 记录错误
        if (window.errorLogger) {
            window.errorLogger.log(error, 'CodeView子组件', window.ErrorLevels?.ERROR || 'error');
        }

        // 尝试恢复
        this.handleComponentError(error, info);

        // 阻止错误继续传播
        return false;
    },
    data() {
        return {
            highlightedLines: [],
            _lastFileIdentity: '',
            // 划词评论与手动Markdown弹框
            showManualImprovementModal: false,
            manualCommentText: '',
            manualQuotedCode: '',
            manualEditorView: 'edit',
            manualMaxLength: 4000,
            manualCommentError: '',
            manualSubmitting: false,
            lastSelectionText: '',
            lastSelectionRange: null, // 用于评论定位，不在界面显示

            // 编辑评论模式相关
            isEditingCommentMode: false, // 是否为编辑模式
            editingCommentData: null, // 正在编辑的评论数据
            editingCommentAuthor: '',
            editingCommentTimestamp: '',
            editingCommentType: '',
            editingCommentStatus: 'pending',
            editingImprovementText: '',
            showImprovementSection: false, // 是否展开改进代码区
            _containerHover: false,
            _lastShowTs: 0,
            _buttonVisible: false,

            // Quick Comment 内联输入框（Cursor Quick Edit 风格，支持 AI）
            showQuickComment: false,
            quickCommentText: '',
            quickCommentQuote: '',
            quickCommentError: '',
            quickCommentSubmitting: false,
            quickCommentAnimating: false,
            quickCommentPositionData: { left: 0, top: 0, width: 440, height: 400 },
            isDraggingQuickComment: false,
            isResizingQuickComment: false,
            // Manual Modal 调整大小相关
            manualModalSize: { width: null, height: null }, // null 表示使用默认值
            isResizingManualModal: false,
            // Manual Modal 拖拽相关
            manualModalPosition: { left: null, top: null }, // null 表示使用默认居中
            isDraggingManualModal: false,
            // AI 评论相关
            quickCommentMode: 'ai', // 'ai' | 'manual'
            quickCommentAiPrompt: '',
            quickCommentAiResult: '',
            quickCommentAiError: '',
            quickCommentAiGenerating: false,
            quickCommentAiAbortController: null,

            // 评论详情弹窗相关数据
            showCommentDetailPopup: false,
            currentCommentDetail: null,
            showCommentPreviewPopup: false,
            currentCommentPreview: null,
            commentPreviewPosition: { x: 0, y: 0 },

            // 评论编辑相关数据
            isEditingCommentDetail: false,
            editingCommentAuthor: '',
            editingCommentTimestamp: '',
            editingCommentContent: '',
            editingCommentContentIsJson: false,
            editingCommentText: '',
            editingImprovementText: '',
            editingCommentType: '',
            editingCommentStatus: 'pending',
            editingRangeInfo: { startLine: 1, endLine: 1 },
            editingSaving: false,

            // 界面控制
            showAdvancedOptions: false,

            // 文件内容编辑
            isEditingFile: false,
            editingFileContent: '',
            editSaving: false,
            saveError: '',

            // Markdown预览模式
            isMarkdownPreviewMode: true, // 默认开启预览模式

            // Markdown渲染缓存
            markdownCache: {},

            // 交互功能超时器
            interactionTimeout: null,

            // 测试相关（开发调试用）
            testResults: null,

            // 滚动状态管理
            isScrolling: false,
            scrollRetryCount: 0,


            // 智能缓存管理
            _positionCache: new Map(),
            _cacheMaxSize: 100,
            _cacheExpiryTime: 5 * 60 * 1000, // 5分钟

            // Lightbox state
            lightbox: {
                visible: false,
                url: '',
                alt: ''
            },

            sessionChatInputLocal: '',
            sessionContextEnabledLocal: true,
            sessionContextEditorVisibleLocal: false,
            sessionContextDraftLocal: '',
            sessionContextEditorViewLocal: 'edit',
        };
    },
    created() {
        // 在组件创建时注册编辑评论事件监听器（确保尽早注册）
        this._openEditCommentListener = (event) => {
            try {
                const comment = event.detail?.comment;
                if (comment) {
                    console.log('[CodeView] 收到编辑评论事件:', comment);
                    // 使用 $nextTick 确保组件已完全初始化
                    this.$nextTick(() => {
                        if (this && typeof this.openEditCommentModal === 'function') {
                            this.openEditCommentModal(comment);
                        } else if (this && typeof this.openEditCommentModal === 'function') {
                            // 备用：直接调用
                            this.openEditCommentModal(comment);
                        } else {
                            console.error('[CodeView] 组件实例或方法不可用', {
                                hasThis: !!this,
                                hasMethod: typeof this.openEditCommentModal === 'function'
                            });
                        }
                    });
                } else {
                    console.warn('[CodeView] 编辑评论事件缺少评论数据');
                }
            } catch (error) {
                console.error('[CodeView] 处理编辑评论事件时出错:', error);
            }
        };
        window.addEventListener('openEditCommentModal', this._openEditCommentListener);
        console.log('[CodeView] 已在 created 钩子中注册编辑评论事件监听器');
    },
    watch: {
        activeSession: {
            handler(newSession, oldSession) {
                if (newSession !== oldSession) {
                    this.sessionChatInputLocal = '';
                    this.sessionContextEditorVisibleLocal = false;
                    this.sessionContextEditorViewLocal = 'edit';
                    this.sessionContextDraftLocal = String(newSession?.pageContent || '');
                    try {
                        const saved = localStorage.getItem('aicr_context_switch_enabled');
                        if (saved === '0') this.sessionContextEnabledLocal = false;
                        if (saved === '1') this.sessionContextEnabledLocal = true;
                    } catch (_) { }
                    this.$nextTick(() => {
                        const el = document.getElementById('pet-chat-messages');
                        if (el) el.scrollTop = el.scrollHeight;
                    });
                }
            },
            immediate: true,
            deep: false
        },
        // 监听文件变化，清除高亮并处理文件加载
        file: {
            handler(newFile, oldFile) {
                const nextIdentity = newFile
                    ? `${newFile?.key || ''}::${newFile?.sessionKey || ''}::${newFile?.fileKey || ''}::${newFile?.path || ''}::${newFile?.name || ''}`
                    : '';

                const identityChanged = nextIdentity !== this._lastFileIdentity;
                if (identityChanged) {
                    this._lastFileIdentity = nextIdentity;
                    this.clearHighlight();
                }

                if (!newFile) {
                    return;
                }

                if (identityChanged || newFile !== oldFile) {
                    // 处理新文件的key信息
                    if (newFile) {
                        console.log('[CodeView] 新文件信息:', {
                            name: newFile.name,
                            path: newFile.path,
                            key: newFile.key,
                            hasContent: !!newFile.content,
                            contentLength: newFile.content ? newFile.content.length : 0
                        });

                        // 如果是markdown文件，默认开启预览模式
                        if (this.languageType === 'markdown') {
                            this.isMarkdownPreviewMode = true;
                            console.log('[CodeView] 检测到Markdown文件，开启预览模式');
                            // 预览模式下不需要计算评论标记位置，并隐藏评论按钮
                            this.hideSelectionButton();
                        }

                        // 如果文件没有内容但有key，尝试触发文件加载
                        if ((!newFile.content || newFile.content.length === 0) && newFile.key) {
                            console.log('[CodeView] 文件无内容，尝试触发文件加载:', newFile.key);
                            this.triggerFileLoad(newFile);
                        }

                        // 如果文件有内容，确保codeLines正确更新
                        if (newFile.content && newFile.content.length > 0) {
                            console.log('[CodeView] 文件有内容，行数:', this.codeLines.length);
                            // 强制更新视图
                            this.$nextTick(() => {
                                this.$forceUpdate();
                            });
                        }
                    }
                }
            },
            immediate: true,
            deep: true
        },
        // 监听文件内容变化
        'file.content': {
            handler(newContent, oldContent) {
                if (newContent !== oldContent) {
                    console.log('[CodeView] 文件内容变化:', {
                        oldLength: oldContent?.length || 0,
                        newLength: newContent?.length || 0,
                        hasContent: !!newContent
                    });

                    if (newContent && newContent.length > 0) {
                        console.log('[CodeView] 文件内容已更新，行数:', this.codeLines.length);
                        // 强制更新视图
                        this.$nextTick(() => {
                            this.$forceUpdate();
                        });
                    }
                }
            },
            immediate: true
        },
        // 监听Markdown预览模式切换
        isMarkdownPreviewMode: {
            handler(newMode, oldMode) {
                if (newMode !== oldMode && newMode && this.shouldShowMarkdownPreview) {
                    console.log('[CodeView] Markdown预览模式已开启');
                    // 预览模式下不需要计算评论标记位置
                }
            }
        },
        // 监听评论数据变化，处理挂起的评论Key
        comments: {
            handler(newComments, oldComments) {
                // 当评论数据首次加载或发生变化时，尝试处理挂起的评论Key
                if (newComments && newComments.length > 0) {
                    console.log('[CodeView] 评论数据已加载，尝试处理挂起的评论Key');
                    this.$nextTick(() => {
                        setTimeout(() => {
                            this.handlePendingCommentKey();
                        }, 200);
                    });
                }

                // 检查并清除无效的高亮行
                this.validateAndClearInvalidHighlights(newComments);
            },
            immediate: true
        }
    },
    computed: {
        sessionMessages() {
            const msgs = this.activeSession && Array.isArray(this.activeSession.messages) ? this.activeSession.messages : [];
            return msgs
                .map(m => ({
                    type: m?.type === 'pet' ? 'pet' : 'user',
                    content: String(m?.content || ''),
                    timestamp: typeof m?.timestamp === 'number' ? m.timestamp : Date.now(),
                    imageDataUrl: m?.imageDataUrl
                }))
                .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        },
        canSendSessionChat() {
            return !!(this.activeSession && String(this.sessionChatInputLocal || '').trim());
        },
        codeLines() {
            try {
                const content = (this.file && typeof this.file.content === 'string') ? this.file.content : '';
                console.log('[CodeView] codeLines计算 - 文件:', this.file?.name, '内容长度:', content.length);

                if (!content || content.length === 0) {
                    console.log('[CodeView] codeLines计算 - 文件内容为空，返回空数组');
                    return [];
                }

                const lines = content.split(/\r?\n/);
                console.log('[CodeView] codeLines计算 - 解析行数:', lines.length);
                return lines;
            } catch (error) {
                console.error('[CodeView] codeLines计算失败:', error);
                return [];
            }
        },
        languageType() {
            try {
                if (!this.file) return 'text';
                const name = (this.file.path || this.file.name || '').toLowerCase();
                if (name.endsWith('.js')) return 'javascript';
                if (name.endsWith('.ts')) return 'typescript';
                if (name.endsWith('.css')) return 'css';
                if (name.endsWith('.html')) return 'html';
                if (name.endsWith('.json')) return 'json';
                if (name.endsWith('.md')) return 'markdown';
                return 'text';
            } catch (error) {
                console.error('[CodeView] languageType计算失败:', error);
                return 'text';
            }
        },
        // 格式化文件名显示：优先显示文件名，长路径显示最后几级
        displayFileName() {
            if (!this.file) return '';
            const path = this.file.path || this.file.name || '';
            const name = this.file.name || '';

            // 如果有独立的 name 且与 path 不同，优先使用 name
            if (name && name !== path) {
                return name;
            }

            // 如果路径为空，返回默认值
            if (!path) return '未命名文件';

            // 处理路径：如果路径太长，只显示最后两级
            const pathParts = path.split('/').filter(p => p);
            if (pathParts.length <= 2) {
                return path;
            }

            // 显示最后两级路径，用 ... 表示前面的路径
            const lastTwo = pathParts.slice(-2).join('/');
            return `.../${lastTwo}`;
        },
        // 完整的文件路径（用于 title 提示）
        fullFilePath() {
            if (!this.file) return '';
            return this.file.path || this.file.name || '';
        },
        canSubmitManualComment() {
            try {
                const len = (this.manualCommentText || '').trim().length;
                return len > 0 && len <= this.manualMaxLength;
            } catch (error) {
                console.error('[CodeView] canSubmitManualComment计算失败:', error);
                return false;
            }
        },
        // Quick Comment 相关计算属性
        canSubmitQuickComment() {
            const text = (this.quickCommentText || '').trim();
            return text.length > 0 && text.length <= 2000;
        },
        canSubmitAiComment() {
            // 更严格的结果检查：确保结果存在且非空
            const result = this.quickCommentAiResult;
            const hasResult = result &&
                typeof result === 'string' &&
                result.trim().length > 0;
            const notSubmitting = !this.quickCommentSubmitting;
            const notGenerating = !this.quickCommentAiGenerating;
            return hasResult && notSubmitting && notGenerating;
        },
        quickCommentPosition() {
            return {
                left: `${this.quickCommentPositionData.left}px`,
                top: `${this.quickCommentPositionData.top}px`,
                width: `${this.quickCommentPositionData.width}px`,
                height: `${this.quickCommentPositionData.height}px`
            };
        },
        quickCommentQuoteDisplay() {
            const quote = this.quickCommentQuote || '';
            if (quote.length > 150) {
                return quote.substring(0, 150) + '...';
            }
            return quote;
        },
        renderQuickCommentAiResult() {
            const text = this.quickCommentAiResult || '';
            if (!text) return '';
            // 简单的 Markdown 渲染
            return this.renderMarkdown ? this.renderMarkdown(text) : text.replace(/\n/g, '<br>');
        },
        manualCommentPreviewHtml() {
            try {
                return this.renderMarkdown(this.manualCommentText || '');
            } catch (error) {
                console.error('[CodeView] manualCommentPreviewHtml计算失败:', error);
                return '';
            }
        },
        // Manual Modal 样式计算
        manualModalStyle() {
            const style = {};

            // 应用保存的尺寸
            if (this.manualModalSize.width) {
                style.width = `${this.manualModalSize.width}px`;
            }
            if (this.manualModalSize.height) {
                style.height = `${this.manualModalSize.height}px`;
            }

            // 应用保存的位置（如果已拖拽）
            if (this.manualModalPosition.left !== null) {
                style.left = `${this.manualModalPosition.left}px`;
                style.top = `${this.manualModalPosition.top}px`;
                style.right = 'auto';
                style.bottom = 'auto';
                style.transform = 'none';
                style.margin = '0';
            }

            return style;
        },
        // 按行号分组的评论数据
        lineComments() {
            try {
                const result = {};
                if (!this.comments || !Array.isArray(this.comments)) {
                    console.log('[CodeView] lineComments - 无评论数据');
                    return result;
                }

                console.log('[CodeView] lineComments - 处理评论数据，数量:', this.comments.length);

                this.comments.forEach(comment => {
                    try {
                        // 从评论的rangeInfo中获取行号信息
                        let startLine = null;
                        let endLine = null;

                        if (comment && comment.rangeInfo) {
                            startLine = comment.rangeInfo.startLine;
                            endLine = comment.rangeInfo.endLine || startLine;
                        } else if (comment && comment.line) {
                            // 兼容旧的line字段
                            startLine = endLine = comment.line;
                        }

                        // 如果有有效的行号，添加到对应的所有行
                        if (startLine && startLine > 0) {
                            const start = parseInt(startLine);
                            const end = parseInt(endLine) || start;

                            // 为评论涉及的每一行都添加评论标记
                            for (let lineNum = start; lineNum <= end; lineNum++) {
                                if (!result[lineNum]) {
                                    result[lineNum] = [];
                                }
                                result[lineNum].push({
                                    ...comment,
                                    key: comment.key || comment.id || `comment_${Date.now()}_${Math.random()}`,
                                    // 标记这是否为评论的起始行
                                    isStartLine: lineNum === start,
                                    // 标记这是否为评论的结束行
                                    isEndLine: lineNum === end,
                                    // 标记评论的总行数范围
                                    commentRange: { start, end }
                                });
                            }
                        }
                    } catch (commentError) {
                        console.error('[CodeView] 处理单个评论时出错:', commentError, comment);
                    }
                });

                console.log('[CodeView] lineComments - 处理完成，结果行数:', Object.keys(result).length, '行号:', Object.keys(result));
                return result;
            } catch (error) {
                console.error('[CodeView] lineComments计算失败:', error);
                return {};
            }
        },
        // 获取每行的主要评论标记（用于显示）
        lineCommentMarkers() {
            // 预览模式下不显示评论标记
            if (this.shouldShowMarkdownPreview) {
                console.log('[CodeView] lineCommentMarkers - 预览模式，返回空对象');
                return {};
            }

            console.log('[CodeView] lineCommentMarkers - 源码模式，计算评论标记');

            const result = {};
            const lineComments = this.lineComments;

            Object.keys(lineComments).forEach(lineNumber => {
                const comments = lineComments[lineNumber];
                if (comments && comments.length > 0) {
                    // 优先级：待处理 > 重新打开 > 已解决 > 其他
                    const priorityOrder = {
                        'pending': 1,
                        'reopened': 2,
                        'resolved': 3,
                        'closed': 4,
                        'wontfix': 5
                    };

                    // 找到优先级最高的评论作为主要标记
                    const primaryComment = comments.reduce((highest, current) => {
                        const currentPriority = priorityOrder[current.status] || 999;
                        const highestPriority = priorityOrder[highest.status] || 999;
                        return currentPriority < highestPriority ? current : highest;
                    });

                    // 去重处理：获取该行独特的评论（基于原始评论ID）
                    const uniqueComments = [];
                    const seenCommentIds = new Set();
                    comments.forEach(comment => {
                        const originalId = comment.key;
                        if (!seenCommentIds.has(originalId)) {
                            seenCommentIds.add(originalId);
                            uniqueComments.push(comment);
                        }
                    });

                    // 检查是否为跨行评论的一部分
                    const isMultiLine = primaryComment.commentRange &&
                        primaryComment.commentRange.start !== primaryComment.commentRange.end;
                    const isStartLine = primaryComment.isStartLine;
                    const isEndLine = primaryComment.isEndLine;

                    result[lineNumber] = {
                        ...primaryComment,
                        count: uniqueComments.length,
                        allComments: uniqueComments,
                        hasMultiple: uniqueComments.length > 1,
                        // 跨行评论相关标识
                        isMultiLine: isMultiLine,
                        isStartLine: isStartLine,
                        isEndLine: isEndLine,
                        // 跨行评论的标记类型
                        markerType: isMultiLine ?
                            (isStartLine ? 'start' : isEndLine ? 'end' : 'middle') :
                            'single'
                    };
                }
            });

            console.log('[CodeView] lineCommentMarkers - 计算完成，标记行数:', Object.keys(result).length, '行号:', Object.keys(result));
            return result;
        },
        // 当前评论详情的HTML内容
        currentCommentDetailHtml() {
            if (!this.currentCommentDetail || !this.currentCommentDetail.content) {
                return '';
            }
            return this.renderMarkdown(this.currentCommentDetail.content);
        },
        // 当前评论详情的文本显示（处理长文本）
        currentCommentDetailTextDisplay() {
            if (!this.currentCommentDetail || !this.currentCommentDetail.text) {
                return '';
            }
            const text = this.currentCommentDetail.text;
            // 如果文本太长，截取显示
            return text.length > 500 ? text.substring(0, 500) + '...' : text;
        },
        // 评论预览的HTML内容
        currentCommentPreviewHtml() {
            if (!this.currentCommentPreview || !this.currentCommentPreview.content) {
                return '';
            }
            return this.renderMarkdown(this.currentCommentPreview.content);
        },
        // 判断是否应该显示Markdown预览
        shouldShowMarkdownPreview() {
            const result = this.file && this.languageType === 'markdown' && this.isMarkdownPreviewMode && !this.isEditingFile;
            console.log('[CodeView] shouldShowMarkdownPreview - 结果:', result, {
                hasFile: !!this.file,
                languageType: this.languageType,
                isMarkdownPreviewMode: this.isMarkdownPreviewMode,
                isEditingFile: this.isEditingFile
            });
            return result;
        },
        // 获取Markdown预览的HTML内容
        markdownPreviewHtml() {
            if (!this.shouldShowMarkdownPreview || !this.file || !this.file.content) {
                return '';
            }
            const html = this.renderMarkdown(this.file.content);

            // 在下一个tick中添加交互功能
            this.$nextTick(() => {
                this.addMarkdownInteractions();
            });

            return html;
        },


        // 获取Markdown预览的行数（用于行号显示和评论标记）
        markdownPreviewLines() {
            if (!this.shouldShowMarkdownPreview || !this.file || !this.file.content) {
                return [];
            }
            // 将内容按行分割，为每行创建占位符
            const lines = this.file.content.split('\n');
            return lines.map((line, index) => ({
                number: index + 1,
                content: line
            }));
        }
    },
    methods: {
        // 添加代码块交互功能
        addCodeBlockInteractions() {
            // 注册全局函数
            window.copyCodeBlock = (codeId) => {
                const codeBlock = document.getElementById(codeId);
                if (codeBlock) {
                    const code = codeBlock.querySelector('code');
                    if (code) {
                        navigator.clipboard.writeText(code.textContent).then(() => {
                            this.showCopySuccess(codeId);
                        }).catch(() => {
                            // 降级处理
                            this.fallbackCopy(code.textContent);
                        });
                    }
                }
            };

            window.toggleCodeBlock = (codeId) => {
                const codeBlock = document.getElementById(codeId);
                if (codeBlock) {
                    const wrapper = codeBlock.closest('.md-code-block-wrapper');
                    const expandBtn = wrapper?.querySelector('.md-code-block-expand i');

                    if (codeBlock.classList.contains('collapsed')) {
                        codeBlock.classList.remove('collapsed');
                        codeBlock.classList.add('expanded');
                        expandBtn.className = 'fas fa-compress-alt';
                        wrapper?.classList.remove('collapsed');
                    } else {
                        codeBlock.classList.add('collapsed');
                        codeBlock.classList.remove('expanded');
                        expandBtn.className = 'fas fa-expand-alt';
                        wrapper?.classList.add('collapsed');
                    }

                }
            };

            // 注册全局函数：切换内容折叠
            window.toggleContentCollapse = (elementId) => {
                this.toggleContentCollapse(elementId);
            };

        },

        // 显示复制成功提示
        showCopySuccess(codeId) {
            const copyBtn = document.querySelector(`#${codeId}`).closest('.md-code-block-wrapper').querySelector('.md-code-block-copy');
            const originalIcon = copyBtn.innerHTML;

            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            copyBtn.style.color = '#10b981';

            setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
                copyBtn.style.color = '';
            }, 2000);
        },

        // 降级复制方法
        fallbackCopy(text) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                this.showCopySuccess('fallback');
            } catch (err) {
                console.error('复制失败:', err);
            }
            document.body.removeChild(textArea);
        },

        openLightbox(url, alt) {
            if (!this.lightbox) {
                this.lightbox = { visible: false, url: '', alt: '' };
            }
            this.lightbox.url = url;
            this.lightbox.alt = alt;
            this.lightbox.visible = true;
        },
        closeLightbox() {
            if (this.lightbox) {
                this.lightbox.visible = false;
            }
        },
        // 处理组件错误
        handleComponentError(error, info) {
            try {
                console.error('[CodeView] 处理组件错误:', error, info);

                // 根据错误类型进行不同的恢复策略
                if (error.message && error.message.includes('Cannot read properties of null')) {
                    console.log('[CodeView] 检测到null访问错误，尝试重置相关状态');
                    this.resetComponentState();
                } else if (error.message && error.message.includes('Cannot read properties of undefined')) {
                    console.log('[CodeView] 检测到undefined访问错误，尝试重新初始化');
                    this.reinitializeComponent();
                } else {
                    console.log('[CodeView] 未知错误类型，尝试通用恢复');
                    this.genericErrorRecovery();
                }

                // 显示用户友好的错误提示
                this.showErrorNotification(error);

            } catch (recoveryError) {
                console.error('[CodeView] 错误恢复失败:', recoveryError);
            }
        },

        // 重置组件状态
        resetComponentState() {
            try {
                console.log('[CodeView] 重置组件状态');
                this.highlightedLines = [];
                this.showManualImprovementModal = false;
                this.manualCommentText = '';
                this.showCommentDetailPopup = false;
                this.currentCommentDetail = null;
                this.isEditingCommentDetail = false;
                this.editingCommentContent = '';
                this.editingCommentText = '';
                this.editingImprovementText = '';
                this.editingSaving = false;

                // Reset lightbox state
                if (this.lightbox) {
                    this.lightbox.visible = false;
                    this.lightbox.url = '';
                    this.lightbox.alt = '';
                } else {
                    this.lightbox = {
                        visible: false,
                        url: '',
                        alt: ''
                    };
                }

                console.log('[CodeView] 组件状态重置完成');
            } catch (error) {
                console.error('[CodeView] 重置组件状态失败:', error);
            }
        },

        // 重新初始化组件
        reinitializeComponent() {
            try {
                console.log('[CodeView] 重新初始化组件');
                this.resetComponentState();

                // 重新绑定事件监听器
                this.$nextTick(() => {
                    this.addMarkdownInteractions();
                });

                console.log('[CodeView] 组件重新初始化完成');
            } catch (error) {
                console.error('[CodeView] 重新初始化组件失败:', error);
            }
        },

        // 通用错误恢复
        genericErrorRecovery() {
            try {
                console.log('[CodeView] 执行通用错误恢复');

                // 清理可能的问题状态
                this.resetComponentState();

                // 重新渲染组件
                this.$forceUpdate();

                console.log('[CodeView] 通用错误恢复完成');
            } catch (error) {
                console.error('[CodeView] 通用错误恢复失败:', error);
            }
        },

        // 显示错误通知
        showErrorNotification(error) {
            try {
                const errorMessage = error.message || '组件遇到未知错误';
                console.log('[CodeView] 显示错误通知:', errorMessage);

                // 使用消息系统显示错误
                if (window.showError && typeof window.showError === 'function') {
                    window.showError(`代码查看器遇到问题: ${errorMessage}`);
                } else if (this.$message && typeof this.$message.error === 'function') {
                    this.$message.error(`代码查看器遇到问题: ${errorMessage}`);
                } else {
                    // 降级到控制台日志
                    console.warn('[CodeView] 无法显示错误通知，请检查消息系统');
                }
            } catch (notificationError) {
                console.error('[CodeView] 显示错误通知失败:', notificationError);
            }
        },

        // 清除代码高亮
        clearHighlight() {
            console.log('[CodeView] 清除代码高亮');
            this.highlightedLines = [];
        },
        // 切换Markdown预览模式
        toggleMarkdownPreview() {
            this.isMarkdownPreviewMode = !this.isMarkdownPreviewMode;
            console.log('[CodeView] 切换Markdown预览模式:', this.isMarkdownPreviewMode);

            if (this.isMarkdownPreviewMode) {
                // 切换到预览模式时，立即隐藏评论按钮
                this.hideSelectionButton();
            } else {
                // 切换到源码模式时，检查当前是否有选择，如果有则显示评论按钮
                setTimeout(() => {
                    this.onSelectionChange();
                }, 100);
            }

            // 强制更新视图以确保评论标记正确显示/隐藏
            this.$nextTick(() => {
                this.$forceUpdate();
                console.log('[CodeView] 强制更新视图，当前模式:', this.isMarkdownPreviewMode ? '预览' : '源码');
            });
        },

        // 滚动到源码中的指定行 - 动画优化版本
        scrollToLineInSource(lineNumber) {
            if (!lineNumber || lineNumber < 1) return;

            console.log('[CodeView] 滚动到源码行:', lineNumber);

            // 添加高亮效果
            this.highlightTargetLine(lineNumber);

            // 使用优化的滚动方法
            this.scrollToCommentPosition(lineNumber, null, true);

            // 更新视觉反馈
            this.showScrollFeedback(`已定位到第 ${lineNumber} 行`);
        },

        // 高亮目标行
        highlightTargetLine(lineNumber) {
            // 清除之前的高亮
            this.highlightedLines = [];

            // 添加目标行高亮
            this.highlightedLines.push(Number(lineNumber));

            // 不再执行DOM查找和动画添加
        },

        // 滚动到顶部
        scrollToTop() {
            const codeBlock = this.$el.querySelector('.code-block');
            if (codeBlock) {
                codeBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
                this.showScrollFeedback('已定位到文件顶部');
            }
        },

        // 显示滚动反馈信息
        showScrollFeedback(message) {
            // 创建或更新反馈元素
            let feedbackEl = document.getElementById('scroll-feedback');
            if (!feedbackEl) {
                feedbackEl = document.createElement('div');
                feedbackEl.id = 'scroll-feedback';
                feedbackEl.className = 'scroll-feedback';
                document.body.appendChild(feedbackEl);
            }

            feedbackEl.textContent = message;
            feedbackEl.style.display = 'block';
            feedbackEl.style.opacity = '1';

            // 2秒后自动隐藏
            clearTimeout(this._feedbackTimeout);
            this._feedbackTimeout = setTimeout(() => {
                if (feedbackEl) {
                    feedbackEl.style.opacity = '0';
                    setTimeout(() => {
                        if (feedbackEl) {
                            feedbackEl.style.display = 'none';
                        }
                    }, 300);
                }
            }, 2000);
        },

        // 初始化键盘快捷键
        initKeyboardShortcuts() {
            document.addEventListener('keydown', (event) => {
                // Ctrl/Cmd + G: 快速定位到指定行
                // Ctrl/Cmd + F: 在预览模式下快速切换
                if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                    if (this.shouldShowMarkdownPreview) {
                        event.preventDefault();
                        this.toggleMarkdownPreview();
                    }
                }
            });
        },



        // 确保评论标记在预览模式下可以交互 - 优化版本
        ensureCommentMarkerInteractions() {
            const commentMarkers = this.$el?.querySelectorAll('.markdown-comment-line .comment-marker');
            const isMobile = window.innerWidth <= 768;
            const isTouchDevice = 'ontouchstart' in window;

            commentMarkers?.forEach((marker, index) => {
                // 确保可以接收事件
                marker.style.pointerEvents = 'auto';
                marker.style.cursor = 'pointer';

                // 移动设备优化
                if (isMobile) {
                    marker.style.minWidth = '44px';
                    marker.style.minHeight = '44px';
                    marker.style.padding = '8px';
                }

                // 添加键盘支持
                marker.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.triggerCommentMarkerClick(marker);
                    }
                });

                // 添加悬停效果增强
                marker.addEventListener('mouseenter', (e) => {
                    marker.classList.add('hovering');
                    // 添加微妙的震动效果
                    marker.style.animation = 'comment-marker-hover 0.3s ease-out';
                });

                marker.addEventListener('mouseleave', (e) => {
                    marker.classList.remove('hovering');
                    marker.style.animation = '';
                });

                // 添加点击反馈
                marker.addEventListener('mousedown', (e) => {
                    marker.classList.add('clicking');
                    marker.style.transform = 'translateY(-50%) scale(0.9)';
                });

                marker.addEventListener('mouseup', (e) => {
                    marker.classList.remove('clicking');
                    marker.style.transform = 'translateY(-50%) scale(1)';
                });

                // 添加成功状态动画
                marker.addEventListener('click', (e) => {
                    marker.classList.add('success');
                    setTimeout(() => {
                        marker.classList.remove('success');
                    }, 600);
                });

                // 添加触摸支持（移动设备）
                if (isTouchDevice) {
                    let touchStartTime = 0;

                    marker.addEventListener('touchstart', (e) => {
                        touchStartTime = Date.now();
                        marker.classList.add('touching');
                        marker.style.transform = 'translateY(-50%) scale(0.95)';
                        marker.style.transition = 'all 0.1s ease';
                    }, { passive: true });

                    marker.addEventListener('touchend', (e) => {
                        const touchDuration = Date.now() - touchStartTime;
                        marker.classList.remove('touching');

                        if (touchDuration < 500) { // 短按触发点击
                            e.preventDefault();
                            this.triggerCommentMarkerClick(marker);
                        }

                        marker.style.transform = 'translateY(-50%) scale(1)';
                    });

                    marker.addEventListener('touchcancel', () => {
                        marker.classList.remove('touching');
                        marker.style.transform = 'translateY(-50%) scale(1)';
                    });
                }

                // 添加鼠标悬停效果增强
                marker.addEventListener('mouseenter', () => {
                    marker.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                    marker.classList.add('hovering');
                });

                // 添加点击反馈
                marker.addEventListener('mousedown', () => {
                    marker.classList.add('pressing');
                    marker.style.transform = 'translateY(-50%) scale(0.95)';
                    marker.style.transition = 'all 0.1s ease';
                });

                marker.addEventListener('mouseup', () => {
                    marker.classList.remove('pressing');
                    marker.style.transform = 'translateY(-50%) scale(1)';
                });

                // 确保鼠标离开时恢复状态
                marker.addEventListener('mouseleave', () => {
                    marker.classList.remove('hovering', 'pressing');
                    marker.style.transform = 'translateY(-50%) scale(1)';
                });

                // 添加双击支持
                let clickCount = 0;
                let clickTimer = null;

                marker.addEventListener('click', (e) => {
                    clickCount++;
                    if (clickCount === 1) {
                        clickTimer = setTimeout(() => {
                            this.triggerCommentMarkerClick(marker);
                            clickCount = 0;
                        }, 300);
                    } else if (clickCount === 2) {
                        clearTimeout(clickTimer);
                        this.triggerCommentMarkerDoubleClick(marker);
                        clickCount = 0;
                    }
                });
            });
        },

        // 触发评论标记点击
        triggerCommentMarkerClick(marker) {
            // 添加成功动画
            marker.classList.add('success');
            setTimeout(() => {
                marker.classList.remove('success');
            }, 600);

            // 触发原有的点击处理
            marker.click();
        },

        // 触发评论标记双击
        triggerCommentMarkerDoubleClick(marker) {
            // 添加特殊效果
            marker.style.animation = 'comment-marker-bounce 0.6s ease-out';
            setTimeout(() => {
                marker.style.animation = '';
            }, 600);

            // 可以在这里添加双击的特殊处理逻辑
            console.log('Double click on comment marker');
        },


        // 添加Markdown预览中的交互功能
        addMarkdownInteractions() {
            if (!this.shouldShowMarkdownPreview) return;

            this.$nextTick(() => {
                try {
                    // 添加代码块复制功能
                    const codeBlocks = this.$el?.querySelectorAll('.md-code-block-copy');
                    codeBlocks?.forEach(button => {
                        button.addEventListener('click', (e) => {
                            e.preventDefault();
                            const codeId = button.getAttribute('onclick')?.match(/copyCodeBlock\('([^']+)'\)/)?.[1];
                            if (codeId) {
                                this.copyCodeBlock(codeId);
                            }
                        });
                    });

                    // 预览模式下不添加评论相关交互功能
                    // this.ensureCommentMarkerInteractions();

                    // 添加代码块展开/折叠功能
                    const expandButtons = this.$el?.querySelectorAll('.md-code-block-expand');
                    expandButtons?.forEach(button => {
                        button.addEventListener('click', (e) => {
                            e.preventDefault();
                            const codeId = button.getAttribute('onclick')?.match(/toggleCodeBlock\('([^']+)'\)/)?.[1];
                            if (codeId) {
                                this.toggleCodeBlock(codeId);
                            }
                        });
                    });

                    // 为长内容添加折叠功能
                    this.addCollapseToLongContent();

                    // 为图片添加点击预览功能
                    const images = this.$el?.querySelectorAll('.markdown-preview-content img');
                    images?.forEach(img => {
                        img.style.cursor = 'zoom-in';
                        img.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            this.openLightbox(img.src, img.alt);
                        });
                    });

                    // 重新初始化 Mermaid 图表（修复切换模式后丢失的问题）
                    this.initializeMermaidDiagrams();

                } catch (error) {
                    console.error('[CodeView] addMarkdownInteractions 执行出错:', error);
                }
            });
        },


        // 复制代码块内容
        copyCodeBlock(codeId) {
            const codeElement = document.getElementById(codeId);
            if (codeElement) {
                const code = codeElement.textContent || codeElement.innerText;

                // 检查是否支持Clipboard API
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(code).then(() => {
                        this.showCopySuccess(codeId);
                    }).catch(err => {
                        console.error('[CodeView] 复制失败:', err);
                        // 降级处理
                        this.fallbackCopy(code);
                    });
                } else {
                    // 降级处理
                    this.fallbackCopy(code);
                }
            }
        },

        // 切换代码块展开/折叠状态 - 默认展开
        toggleCodeBlock(codeId) {
            const codeElement = document.getElementById(codeId);
            if (codeElement) {
                const wrapper = codeElement.closest('.md-code-block-wrapper');
                const expandBtn = wrapper?.querySelector('.md-code-block-expand i');

                // 默认是展开状态，所以先检查是否已折叠
                if (codeElement.classList.contains('collapsed')) {
                    // 展开
                    codeElement.classList.remove('collapsed');
                    codeElement.classList.add('expanded');
                    wrapper?.classList.remove('collapsed');
                    if (expandBtn) {
                        expandBtn.className = 'fas fa-compress-alt';
                    }
                } else {
                    // 折叠
                    codeElement.classList.add('collapsed');
                    codeElement.classList.remove('expanded');
                    wrapper?.classList.add('collapsed');
                    if (expandBtn) {
                        expandBtn.className = 'fas fa-expand-alt';
                    }
                }

            }
        },
        // 渲染单行Markdown内容
        renderMarkdownLine(lineContent) {
            if (!lineContent) return '';

            // 简单的单行Markdown渲染，保持与整体渲染的一致性
            let html = this.escapeHtml(lineContent);

            // 处理标题 - 修复：添加标题解析
            html = html.replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>')
                .replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>')
                .replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
                .replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>')
                .replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>')
                .replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>');

            // 处理行内代码
            html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

            // 处理粗体
            html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

            // 处理斜体
            html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
            html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

            // 处理链接
            html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

            return html;
        },
        async copyEntireFile() {
            try {
                if (!this.file) return;
                const content = (typeof this.file.content === 'string') ? this.file.content : '';
                if (!content) {
                    showError('暂无可复制的内容');
                    return;
                }
                // 优先使用 Clipboard API
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(content);
                    showSuccess('已复制整个文件内容');
                    return;
                }
                // 回退方案：使用隐藏 textarea
                const ta = document.createElement('textarea');
                ta.value = content;
                ta.setAttribute('readonly', '');
                ta.style.position = 'absolute';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                try {
                    const ok = document.execCommand && document.execCommand('copy');
                    if (ok) {
                        showSuccess('已复制整个文件内容');
                    } else {
                        showError('复制失败，请手动选择复制');
                    }
                } finally {
                    document.body.removeChild(ta);
                }
            } catch (e) {
                showError(e?.message || '复制失败');
            }
        },
        async downloadCurrentFile() {
            try {
                if (!this.file) return;

                const content = (typeof this.file.content === 'string') ? this.file.content : '';
                if (!content) {
                    showError('暂无可下载的内容');
                    return;
                }

                // 获取文件名，优先使用path，其次使用name
                const fileName = this.file.path || this.file.name || 'file.txt';

                // 创建Blob对象
                const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });

                // 创建下载链接
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;

                // 触发下载
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // 清理URL对象
                URL.revokeObjectURL(url);

                showSuccess(`已下载文件: ${fileName}`);
            } catch (e) {
                showError(e?.message || '下载失败');
            }
        },
        jumpToCodePage() {
            try {
                if (!this.file) return;

                console.log('[jumpToCodePage] 当前文件信息:', this.file);

                // 统一约定：
                // - this.file.key === sessionKey(UUID)
                // - this.file.treeKey / this.file.path === 文件树key/路径（用于加载静态文件）
                const treeKey = this.file.treeKey || this.file.path || this.file.name || '';
                const sessionKey = this.file.sessionKey || this.file.key || '';

                // 构建跳转URL，传递文件信息
                const params = new URLSearchParams({
                    // aicr-code 页仍然用 key/fileKey 做“树key定位”
                    key: treeKey,
                    fileName: this.file.name || this.file.path || '',
                    filePath: this.file.path || this.file.name || ''
                });

                if (treeKey) params.set('fileKey', treeKey);
                // 额外传递 sessionKey，确保评论/会话关联一致
                if (sessionKey) params.set('sessionKey', sessionKey);

                const jumpUrl = `/src/views/aicr/aicr-code.html?${params.toString()}`;
                console.log('[jumpToCodePage] 跳转URL:', jumpUrl);

                // 跳转到新的 aicr-code 页面
                window.open(jumpUrl, '_blank');
            } catch (e) {
                console.error('[jumpToCodePage] 跳转失败:', e);
                showError(e?.message || '跳转失败');
            }
        },
        escapeHtml(text) {
            try {
                return String(text)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            } catch (_) { return text; }
        },
        // ========== 文件编辑相关 ==========
        startEditFile() {
            try {
                if (!this.file) return;
                const content = (typeof this.file.content === 'string') ? this.file.content : '';
                this.editingFileContent = content;
                this.isEditingFile = true;
                this.$nextTick(() => {
                    const ta = this.$el && this.$el.querySelector('.edit-textarea');
                    if (ta) {
                        ta.focus();
                        // 光标定位在文件内容的最前面
                        ta.setSelectionRange(0, 0);
                        ta.scrollTop = 0;

                        // 为 textarea 添加选择事件监听器，支持编辑模式下的评论功能
                        if (!ta._selectionListenerBound) {
                            // 鼠标选择事件
                            ta.addEventListener('mouseup', () => {
                                setTimeout(() => this.onSelectionChange(), 10);
                            });
                            // 键盘选择事件
                            ta.addEventListener('keyup', (e) => {
                                const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];
                                if (e.shiftKey || keys.includes(e.key)) {
                                    setTimeout(() => this.onSelectionChange(), 10);
                                }
                            });
                            // 选择变化事件（某些浏览器支持）
                            ta.addEventListener('select', () => {
                                setTimeout(() => this.onSelectionChange(), 10);
                            });
                            ta._selectionListenerBound = true;
                        }
                    }
                });
            } catch (_) { }
        },
        cancelEditFile() {
            this.isEditingFile = false;
            this.editingFileContent = '';
            this.saveError = '';
            // 隐藏评论按钮
            this.hideSelectionButton();
        },
        async saveEditedFile() {
            if (!this.file) return;
            const content = String(this.editingFileContent ?? '');
            if (content === (this.file.content || '')) {
                this.isEditingFile = false;
                // 隐藏评论按钮
                this.hideSelectionButton();
                return;
            }
            this.editSaving = true;
            this.saveError = '';
            try {
                // 获取文件路径
                const targetFile = this.file.path || this.file.treeKey || '';

                console.log('[saveEditedFile] 保存参数:', {
                    targetFile,
                    file: this.file
                });

                if (!targetFile) {
                    throw new Error('缺少文件路径，无法保存');
                }

                // 调用后端写入接口
                // 直接构建 URL，不使用 buildServiceUrl，因为它用于 RPC 模式
                const baseUrl = window.API_URL || '';
                const url = `${baseUrl.replace(/\/$/, '')}/write-file`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        target_file: targetFile,
                        content: content,
                        is_base64: false
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `保存失败: ${response.status}`);
                }

                const result = await response.json();
                if (result.code !== 0) {
                    throw new Error(result.message || '保存失败');
                }

                console.log('[saveEditedFile] 文件保存成功:', result);

                // 更新本地 file 对象
                this.file.content = content;

                // 更新 store 中的文件内容
                try {
                    const store = window.aicrStore;
                    if (store && Array.isArray(store.files?.value)) {
                        const treeKey = this.file.treeKey || this.file.path || '';
                        const idx = store.files.value.findIndex(f => {
                            return (treeKey && (f.key === treeKey || f.path === treeKey)) || (this.file.path && f.path === this.file.path);
                        });
                        if (idx >= 0) {
                            const prev = store.files.value[idx];
                            store.files.value[idx] = { ...prev, content };
                        }
                    }
                } catch (_) { }

                this.isEditingFile = false;
                this.editingFileContent = '';
                this.saveError = '';
                // 隐藏评论按钮
                this.hideSelectionButton();

                // 发射文件保存成功事件
                this.$emit('file-saved', {
                    // fileKey 用于定位文件内容（树key/路径）
                    fileKey: this.file.treeKey || this.file.path || '',
                    // sessionKey 用于会话/评论关联
                    sessionKey: this.file.sessionKey || this.file.key || '',
                    filePath: targetFile,
                    content: content,
                    lastModified: new Date().toISOString()
                });

                // 显示保存成功消息
                showSuccess('文件保存成功');
            } catch (e) {
                console.error('[saveEditedFile] 保存失败:', e);
                this.saveError = e?.message || '保存失败';
                showError(this.saveError);
            } finally {
                this.editSaving = false;
            }
        },
        onEditKeydown(e) {
            try {
                const textarea = e.target && e.target.classList && e.target.classList.contains('edit-textarea') ? e.target : null;
                if (textarea && e.key === 'Tab') {
                    e.preventDefault();
                    this.handleCodeIndentation(textarea, e.shiftKey === true);
                    return;
                }
                // 保存快捷键
                if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
                    e.preventDefault();
                    if (!this.editSaving) this.saveEditedFile();
                    return;
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.cancelEditFile();
                }
            } catch (_) { }
        },
        // 使用marked.js的Markdown渲染引擎（带缓存）
        renderMarkdown(text) {
            if (!text) return '';

            // 检查是否为JSON对象并格式化
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

            // 检查缓存
            const cacheKey = `md_${this.hashString(processedText)}`;
            if (this.markdownCache && this.markdownCache[cacheKey]) {
                return this.markdownCache[cacheKey];
            }

            // 检查marked.js是否可用
            if (typeof marked === 'undefined') {
                console.warn('[CodeView] marked.js未加载，使用备用渲染方法');
                return this.renderMarkdownFallback(processedText, isJsonContent);
            }

            try {
                // 重置当前渲染行号
                this.currentRenderLine = 1;

                // 如果是JSON内容，直接包装在代码块中
                if (isJsonContent) {
                    const escapedJson = this.escapeHtml(processedText);
                    const html = `<pre class="md-code json-content"><code>${escapedJson}</code></pre>`;

                    // 缓存结果
                    if (!this.markdownCache) {
                        this.markdownCache = {};
                    }
                    this.markdownCache[cacheKey] = html;

                    return html;
                }

                // 配置marked.js选项
                const markedOptions = {
                    breaks: true,           // 支持换行
                    gfm: true,             // 支持GitHub风格的Markdown
                    sanitize: false,       // 不清理HTML（我们信任内容）
                    smartLists: true,      // 智能列表
                    smartypants: true,     // 智能标点
                    xhtml: false,          // 不使用XHTML
                    // 自定义渲染器
                    renderer: this.createMarkedRenderer()
                };

                // 使用marked.js渲染
                let html = marked.parse(processedText, markedOptions);

                // 后处理：添加自定义样式类和行号信息（注意：aiPrompt 需要在调用时传入）
                html = this.postProcessMarkdownHtml(html);

                // 处理 Mermaid 图表
                html = this.processMermaidDiagrams(html);

                // 缓存结果
                if (!this.markdownCache) {
                    this.markdownCache = {};
                }
                this.markdownCache[cacheKey] = html;

                // 限制缓存大小
                if (Object.keys(this.markdownCache).length > 50) {
                    const keys = Object.keys(this.markdownCache);
                    delete this.markdownCache[keys[0]];
                }

                return html;
            } catch (error) {
                console.error('[CodeView] marked.js渲染失败:', error);
                return this.renderMarkdownFallback(text);
            }
        },

        // 获取当前渲染的源码行号
        getCurrentSourceLine() {
            // 使用更精确的行号跟踪
            if (!this.file || !this.file.content) return 1;

            // 如果已经有当前行号，使用它
            if (this.currentRenderLine) {
                return this.currentRenderLine;
            }

            // 否则返回基于内容长度的估算值
            const content = this.file.content;
            const lines = content.split('\n');
            return Math.max(1, Math.floor(lines.length / 2));
        },

        // 设置当前渲染行号
        setCurrentRenderLine(lineNumber) {
            this.currentRenderLine = lineNumber;
        },

        // 创建marked.js自定义渲染器
        createMarkedRenderer() {
            const renderer = new marked.Renderer();
            const self = this;

            // 自定义代码块渲染
            renderer.code = (code, language) => {
                const lang = language || 'text';
                const codeId = `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const lineCount = code.trim().split('\n').length;

                // 如果是 mermaid 图表，直接返回标准的代码块格式，让 processMermaidDiagrams 方法处理
                if (lang.toLowerCase() === 'mermaid') {
                    return `<pre class="md-code-block" id="${codeId}"><code class="language-mermaid">${self.escapeHtml(code)}</code></pre>`;
                }

                let highlightedCode = self.escapeHtml(code);
                if (typeof hljs !== 'undefined' && lang !== 'text') {
                    try {
                        if (hljs.getLanguage(lang)) {
                            highlightedCode = hljs.highlight(code, { language: lang }).value;
                        } else {
                            highlightedCode = hljs.highlightAuto(code).value;
                        }
                    } catch (e) {
                        console.warn('Highlight.js error:', e);
                    }
                }

                return `
                        <div class="md-code-block-wrapper" data-source-line="${self.getCurrentSourceLine()}">
                            <div class="md-code-block-header">
                                <div class="md-code-block-info">
                                    <span class="md-code-block-language">${lang.toUpperCase()}</span>
                                    <span class="md-code-block-lines">${lineCount} 行</span>
                                </div>
                                <div class="md-code-block-actions">
                                    <button class="md-code-block-copy" onclick="copyCodeBlock('${codeId}')" title="复制代码">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                    <button class="md-code-block-expand" onclick="toggleCodeBlock('${codeId}')" title="折叠/展开">
                                        <i class="fas fa-compress-alt"></i>
                                    </button>
                                </div>
                            </div>
                            <pre class="md-code-block" id="${codeId}">
                                <code class="language-${lang} hljs">${highlightedCode}</code>
                            </pre>
                        </div>
                    `;
            };

            // 自定义行内代码渲染
            renderer.codespan = (code) => {
                return `<code class="md-inline-code" data-source-line="${self.getCurrentSourceLine()}">${this.escapeHtml(code)}</code>`;
            };

            // 自定义段落渲染
            renderer.paragraph = (text) => {
                return `<p data-source-line="${self.getCurrentSourceLine()}">${text}</p>`;
            };

            // 自定义标题渲染
            renderer.heading = (text, level) => {
                return `<h${level} data-source-line="${self.getCurrentSourceLine()}">${text}</h${level}>`;
            };

            // 自定义列表项渲染
            renderer.listitem = (text) => {
                return `<li data-source-line="${self.getCurrentSourceLine()}">${text}</li>`;
            };

            // 自定义图片渲染（添加懒加载）
            renderer.image = (href, title, text) => {
                const safeUrl = /^https?:\/\//i.test(href) ? href : '';
                const altText = text || '';
                const titleAttr = title ? ` title="${this.escapeHtml(title)}"` : '';

                return safeUrl ?
                    `<img src="${safeUrl}" alt="${this.escapeHtml(altText)}" class="md-image" loading="lazy" decoding="async"${titleAttr}/>` :
                    `![${this.escapeHtml(altText)}](${href})`;
            };

            // 自定义链接渲染
            renderer.link = (href, title, text) => {
                const titleAttr = title ? ` title="${this.escapeHtml(title)}"` : '';
                return `<a href="${href}" target="_blank" rel="noreferrer noopener" class="md-link"${titleAttr}>${text}</a>`;
            };

            // 自定义表格渲染
            renderer.table = (header, body) => {
                return `<table class="md-table">
                        <thead class="md-table-head">${header}</thead>
                        <tbody class="md-table-body">${body}</tbody>
                    </table>`;
            };

            renderer.tablerow = (content) => {
                return `<tr class="md-table-row">${content}</tr>`;
            };

            renderer.tablecell = (content, flags) => {
                const tag = flags.header ? 'th' : 'td';
                const className = flags.header ? 'md-table-header' : 'md-table-cell';
                return `<${tag} class="${className}">${content}</${tag}>`;
            };

            // 自定义列表渲染
            renderer.list = (body, ordered) => {
                const tag = ordered ? 'ol' : 'ul';
                const className = ordered ? 'md-ordered-list' : 'md-unordered-list';
                return `<${tag} class="${className}">${body}</${tag}>`;
            };

            renderer.listitem = (text) => {
                return `<li class="md-list-item">${text}</li>`;
            };

            // 自定义引用块渲染
            renderer.blockquote = (quote) => {
                return `<blockquote class="md-blockquote">${quote}</blockquote>`;
            };

            // 自定义水平线渲染
            renderer.hr = () => {
                return '<hr class="md-hr">';
            };

            // 自定义段落渲染
            renderer.paragraph = (text) => {
                return `<p class="md-paragraph">${text}</p>`;
            };

            return renderer;
        },

        // 后处理Markdown HTML，添加额外的样式和功能
        postProcessMarkdownHtml(html) {
            // 处理 think 标签 - 默认折叠（不添加 open 属性）
            html = html.replace(/<think[^>]*>(.*?)<\/think>/gis, (match, content) => {
                const uniqueId = `think-content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                // 不添加 open 属性，details 默认折叠
                return `<details class="think-content" id="${uniqueId}"><summary class="think-summary"><i class="fas fa-lightbulb"></i> 思考过程</summary><div class="think-body">${content}</div></details>`;
            });

            // 为标题添加锚点链接
            html = html.replace(/<h([1-6])>(.+?)<\/h[1-6]>/g, (match, level, content) => {
                const id = content.toLowerCase()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .trim();
                return `<h${level} id="${id}" class="md-heading">${content}</h${level}>`;
            });

            // 为长段落添加折叠功能（超过 10 行的段落）- 默认展开
            html = html.replace(/<p>(.+?)<\/p>/gs, (match, content) => {
                // 检查内容长度，如果超过一定长度则添加折叠功能
                const lines = content.split(/<br\s*\/?>|<\/p>|<p>/gi).filter(l => l.trim()).length;
                if (lines > 10 || content.length > 500) {
                    const uniqueId = `long-content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    return `<div class="long-content" id="${uniqueId}"><p>${content}</p><button class="collapse-toggle" onclick="window.toggleContentCollapse('${uniqueId}')"><i class="fas fa-chevron-up"></i> 折叠</button></div>`;
                }
                return match;
            });

            return html;
        },

        // 为长内容添加折叠功能 - 默认展开
        addCollapseToLongContent() {
            const longContents = this.$el?.querySelectorAll('.long-content');
            longContents?.forEach(element => {
                const toggleBtn = element.querySelector('.collapse-toggle');
                if (toggleBtn) {
                    // 确保初始状态是展开的（没有 collapsed 类）
                    if (!element.classList.contains('collapsed')) {
                        toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i> 折叠';
                    }

                    toggleBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const isCollapsed = element.classList.contains('collapsed');
                        if (isCollapsed) {
                            element.classList.remove('collapsed');
                            toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i> 折叠';
                        } else {
                            element.classList.add('collapsed');
                            toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i> 展开';
                        }
                    });
                }
            });
        },


        // 全局函数：切换内容折叠 - 默认展开
        toggleContentCollapse(elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                const isCollapsed = element.classList.contains('collapsed');
                if (isCollapsed) {
                    // 展开
                    element.classList.remove('collapsed');
                    const btn = element.querySelector('.collapse-toggle');
                    if (btn) btn.innerHTML = '<i class="fas fa-chevron-up"></i> 折叠';
                } else {
                    // 折叠
                    element.classList.add('collapsed');
                    const btn = element.querySelector('.collapse-toggle');
                    if (btn) btn.innerHTML = '<i class="fas fa-chevron-down"></i> 展开';
                }
            }
        },

        // 备用Markdown渲染方法（当marked.js不可用时）
        renderMarkdownFallback(text, isJsonContent = false) {
            let html = String(text);

            // 如果是JSON内容，直接包装在代码块中
            if (isJsonContent) {
                const escapedJson = this.escapeHtml(text);
                return `<pre class="md-code json-content"><code>${escapedJson}</code></pre>`;
            }

            // 简单的Markdown渲染逻辑
            html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
                const language = lang || 'text';
                const languageClass = `language-${language}`;
                const codeId = `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                return `
                        <div class="md-code-block-wrapper">
                            <div class="md-code-block-header">
                                <div class="md-code-block-info">
                                    <span class="md-code-block-language">${language.toUpperCase()}</span>
                                    <span class="md-code-block-lines">${code.trim().split('\n').length} 行</span>
                                </div>
                            </div>
                            <pre class="md-code-block" id="${codeId}">
                                <code class="${languageClass}">${this.escapeHtml(code.trim())}</code>
                            </pre>
                        </div>
                    `;
            });

            // 行内代码
            html = html.replace(/`([^`\n]+)`/g, '<code class="md-inline-code">$1</code>');

            // 标题处理
            html = html.replace(/^#{6}\s+(.+)$/gm, '<h6 class="md-heading">$1</h6>')
                .replace(/^#{5}\s+(.+)$/gm, '<h5 class="md-heading">$1</h5>')
                .replace(/^#{4}\s+(.+)$/gm, '<h4 class="md-heading">$1</h4>')
                .replace(/^#{3}\s+(.+)$/gm, '<h3 class="md-heading">$1</h3>')
                .replace(/^#{2}\s+(.+)$/gm, '<h2 class="md-heading">$1</h2>')
                .replace(/^#{1}\s+(.+)$/gm, '<h1 class="md-heading">$1</h1>');

            // 文本格式
            html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
            html = html.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');

            // 链接处理
            html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener" class="md-link">$1</a>');

            // 引用块
            html = html.replace(/^>\s*(.+)$/gm, '<blockquote class="md-blockquote">$1</blockquote>');

            // 水平线
            html = html.replace(/^[-*_]{3,}$/gm, '<hr class="md-hr">');

            // 换行处理
            html = html.replace(/\n\n/g, '</p><p class="md-paragraph">');
            html = '<p class="md-paragraph">' + html + '</p>';

            // 清理空段落
            html = html.replace(/<p class="md-paragraph"><\/p>/g, '');
            html = html.replace(/<p class="md-paragraph">(<h[1-6]|<blockquote|<ul|<ol|<pre|<hr)/g, '$1');
            html = html.replace(/(<\/h[1-6]>|<\/blockquote>|<\/ul>|<\/ol>|<\/pre>|<\/hr>)<\/p>/g, '$1');

            html = this.processMermaidDiagrams(html);

            return html;
        },

        // 生成字符串哈希
        hashString(str) {
            let hash = 0;
            if (str.length === 0) return hash;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return hash.toString();
        },

        // HTML 反转义
        unescapeHtml(str) {
            if (!str) return '';

            // 创建临时元素来解码 HTML 实体
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = str;
            let decoded = tempDiv.textContent || tempDiv.innerText || '';

            // 手动处理一些常见的 HTML 实体（防止某些情况下 innerHTML 不工作）
            decoded = decoded
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&nbsp;/g, ' ');

            return decoded;
        },

        // 处理 Mermaid 图表
        processMermaidDiagrams(html) {
            if (typeof window.mermaidRenderer === 'undefined') {
                console.warn('[CodeView] MermaidRenderer 未加载，跳过图表渲染');
                return html;
            }

            const wrapperRegex = /<div class="md-code-block-wrapper"[^>]*>[\s\S]*?<pre class="md-code-block"[^>]*>\s*<code class="language-mermaid">([\s\S]*?)<\/code>\s*<\/pre>[\s\S]*?<\/div>/g;
            const preRegex = /<pre class="md-code-block"[^>]*>\s*<code class="language-mermaid">([\s\S]*?)<\/code>\s*<\/pre>/g;

            let diagramIndex = 0;

            const replaceToContainer = (wholeMatch, codeMatch) => {
                let mermaidCode = this.unescapeHtml(codeMatch);

                mermaidCode = mermaidCode
                    .trim()
                    .replace(/[ \t]+$/gm, '')
                    .replace(/\n{3,}/g, '\n\n')
                    .replace(/^[ \t]+/gm, '');

                if (!mermaidCode) {
                    return wholeMatch;
                }

                const idMatch = wholeMatch.match(/id="([^"]+)"/);
                const diagramId = idMatch ? idMatch[1] : `mermaid-diagram-${Date.now()}-${diagramIndex}`;
                diagramIndex += 1;

                return window.mermaidRenderer.createDiagramContainer(diagramId, mermaidCode, {
                    showHeader: true,
                    showActions: true,
                    headerLabel: 'MERMAID 图表',
                    sourceLine: this.getCurrentSourceLine()
                });
            };

            let processedHtml = html.replace(wrapperRegex, (whole, codeMatch) => replaceToContainer(whole, codeMatch));
            processedHtml = processedHtml.replace(preRegex, (whole, codeMatch) => replaceToContainer(whole, codeMatch));

            // 在下一个事件循环中初始化 Mermaid
            if (diagramIndex > 0) {
                this.$nextTick(() => {
                    this.initializeMermaidDiagrams();
                });
            }

            return processedHtml;
        },

        // 初始化 Mermaid 图表
        async initializeMermaidDiagrams() {
            if (typeof window.mermaidRenderer === 'undefined') {
                console.warn('[CodeView] MermaidRenderer 未加载');
                return;
            }

            try {
                // 使用统一的渲染管理器
                await window.mermaidRenderer.renderDiagrams('.mermaid-diagram-container');
                console.log('[CodeView] Mermaid 图表渲染完成');
            } catch (error) {
                console.error('[CodeView] Mermaid 渲染异常:', error);
            }
        },

        // 表格渲染
        renderTables(html) {
            const tableRegex = /^(\|.+\|)\n(\|[-\s|:]+\|)\n((?:\|.+\|\n?)*)/gm;
            return html.replace(tableRegex, (match, header, separator, rows) => {
                const headerCells = header.split('|').slice(1, -1).map(cell =>
                    `<th class="md-table-header">${cell.trim()}</th>`
                ).join('');

                const rowLines = rows.trim().split('\n').filter(line => line.trim());
                const bodyRows = rowLines.map(row => {
                    const cells = row.split('|').slice(1, -1).map(cell =>
                        `<td class="md-table-cell">${cell.trim()}</td>`
                    ).join('');
                    return `<tr class="md-table-row">${cells}</tr>`;
                }).join('');

                return `<table class="md-table">
                        <thead class="md-table-head">
                            <tr class="md-table-header-row">${headerCells}</tr>
                        </thead>
                        <tbody class="md-table-body">${bodyRows}</tbody>
                    </table>`;
            });
        },

        // 列表渲染
        renderLists(html) {
            // 有序列表
            html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="md-list-item">$2</li>');
            html = html.replace(/(<li class="md-list-item">[^<]*<\/li>\s*)+/g, (match) => {
                const items = match.trim().split(/(?=<\/li>)/).filter(item => item.trim());
                return `<ol class="md-ordered-list">${items.join('')}</ol>`;
            });

            // 无序列表
            html = html.replace(/^[-*+]\s+(.+)$/gm, '<li class="md-list-item">$1</li>');
            html = html.replace(/(<li class="md-list-item">[^<]*<\/li>\s*)+/g, (match) => {
                const items = match.trim().split(/(?=<\/li>)/).filter(item => item.trim());
                return `<ul class="md-unordered-list">${items.join('')}</ul>`;
            });

            return html;
        },
        // 响应外部的代码高亮事件（增强版：支持评论定位和自动打开）
        handleHighlightEvent(detail) {
            return safeExecute(() => {
                const currentKeys = new Set();
                if (this.file) {
                    const candidates = [
                        this.file.key,
                        this.file.sessionKey,
                        this.file.fileKey,
                        this.file.treeKey,
                        this.file.path
                    ];
                    candidates.forEach((v) => {
                        const s = String(v || '').trim();
                        if (s) currentKeys.add(s);
                    });
                }
                const targetKey = detail && detail.fileKey ? String(detail.fileKey) : null;

                // 如果事件指定了文件且与当前文件不匹配，则忽略该次高亮（避免切换文件过程中错误高亮）
                if (targetKey && currentKeys.size > 0 && !currentKeys.has(targetKey)) {
                    console.log('[CodeView] 忽略非当前文件的高亮事件', { currentKeys: Array.from(currentKeys), targetKey });
                    return;
                }

                const range = detail && detail.rangeInfo ? detail.rangeInfo : null;
                const comment = detail && detail.comment ? detail.comment : null;
                const doScroll = !!(detail && detail.scroll === true);

                if (!range) {
                    console.warn('[CodeView] 高亮事件缺少rangeInfo:', detail);
                    return;
                }

                const start = Number(range.startLine) || 1;
                const end = Number(range.endLine) || start;

                console.log('[CodeView] 处理高亮事件:', { range, comment, start, end, codeLinesCount: this.codeLines?.length });

                // 更新高亮行
                this.highlightedLines = [];
                for (let i = start; i <= end; i++) this.highlightedLines.push(i);

                if (doScroll) {
                    this._scrollToLine(start);
                    this.showScrollFeedback(`已定位到第 ${start} 行`);
                } else {
                    console.log('[CodeView] 已高亮代码行');
                }

            }, '处理代码高亮事件');
        },

        // 滚动到评论位置并可选择性打开评论详情
        scrollToCommentPosition(startLine, comment = null, doScroll = false) {
            this.highlightedLines = [];
            if (comment && comment.rangeInfo) {
                const start = Number(comment.rangeInfo.startLine) || 1;
                const end = Number(comment.rangeInfo.endLine) || start;
                for (let i = start; i <= end; i++) {
                    this.highlightedLines.push(i);
                }
                if (doScroll) this._scrollToLine(start);
            } else if (startLine) {
                const n = Number(startLine);
                this.highlightedLines.push(n);
                if (doScroll) this._scrollToLine(n);
            }
            console.log('[CodeView] 已高亮位置:', { startLine, comment: comment?.key, doScroll });
        },

        _scrollToLine(lineNumber) {
            try {
                if (this.shouldShowMarkdownPreview) return;
                const container = this.$el && this.$el.querySelector('.code-block');
                if (!container) return;
                const target = container.querySelector(`code[data-line="${lineNumber}"]`) || document.getElementById(`L${lineNumber}`);
                if (target && typeof target.scrollIntoView === 'function') {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } catch (_) { }
        },

        // 自动打开指定评论的详情
        autoOpenCommentDetail(comment) {
            try {
                if (!comment || !comment.key) return;

                console.log('[CodeView] 自动打开评论详情:', comment.key);

                // 检查评论是否在当前评论列表中
                const comments = this.comments || [];
                const foundComment = comments.find(c => c.key === comment.key || c.id === comment.key);

                if (foundComment) {
                    // 直接打开评论详情
                    this.showCommentDetail(foundComment);
                    console.log('[CodeView] 成功打开评论详情:', foundComment.key);
                } else {
                    console.warn('[CodeView] 在当前评论列表中未找到指定评论:', comment.key);

                    // 尝试从URL参数重新获取评论信息
                    this.handlePendingCommentKey();
                }

            } catch (error) {
                console.warn('[CodeView] 自动打开评论详情失败:', error);
            }
        },

        // 处理挂起的评论Key（从URL参数）
        handlePendingCommentKey() {
            try {
                const pendingKey = window.__aicrPendingCommentKey;
                const pendingRange = window.__aicrPendingHighlightRangeInfo;

                // 如果有挂起的评论Key，优先处理
                if (pendingKey) {
                    console.log('[CodeView] 处理挂起的评论Key:', pendingKey);

                    // 查找评论
                    const comments = this.comments || [];
                    const targetComment = comments.find(c => (c.key || c.id) === pendingKey);

                    if (targetComment) {
                        console.log('[CodeView] 找到挂起的评论，自动定位:', targetComment);

                        // 先滚动到评论位置
                        if (targetComment.rangeInfo) {
                            const startLine = targetComment.rangeInfo.startLine || 1;
                            this.scrollToCommentPosition(startLine, targetComment);
                        }

                        // 清除挂起状态
                        window.__aicrPendingCommentKey = null;

                    } else {
                        console.warn('[CodeView] 未找到挂起的评论:', pendingKey);
                    }
                }
                // 如果没有评论Key但有高亮范围，处理高亮范围
                else if (pendingRange) {
                    console.log('[CodeView] 处理挂起的高亮范围:', pendingRange);

                    const startLine = Number(pendingRange.startLine) || 1;
                    this.scrollToCommentPosition(startLine, null);

                    // 清除挂起状态
                    window.__aicrPendingHighlightRangeInfo = null;
                }

            } catch (error) {
                console.warn('[CodeView] 处理挂起参数失败:', error);
            }
        },
        // 从选择对象中提取纯代码内容（优化缩进处理）
        extractCodeContent(selection) {
            try {
                if (!selection || selection.isCollapsed) return '';

                // 获取原始选择文本
                const rawText = selection.toString();

                // 智能识别和去除行号
                const lines = rawText.split('\n');
                const cleanLines = lines.map(line => {
                    // 更智能的行号识别：只移除明显的行号格式
                    // 匹配模式：行首的数字 + 空格/制表符，但不影响代码中的数字
                    return this.removeLineNumber(line);
                });

                // 优化：保留代码的原始缩进结构
                // 1. 过滤掉完全空白的行和只有数字的行，但保留有内容的行
                let nonEmptyLines = cleanLines.filter(line => {
                    const trimmed = line.trim();
                    // 过滤掉空行
                    if (trimmed === '') return false;
                    // 过滤掉只有数字的行（可能是残留的行号）
                    if (/^\d+$/.test(trimmed)) return false;
                    return true;
                });



                // 3. 重新组合，保持原有的换行结构
                let result = nonEmptyLines.join('\n');

                // 4. 智能清理：只处理明显的多余换行符，保留代码结构
                result = this.smartCleanNewlines(result);

                // 5. 最终清理：移除首尾的空白字符，但移除行内缩进
                result = result.trim();

                return result;

            } catch (error) {
                console.warn('[CodeView] 提取代码内容失败，使用原始选择:', error);
                return selection.toString().trim();
            }
        },



        // 智能去除行号（保留代码中的数字）
        removeLineNumber(line) {
            // 更精确的行号识别模式
            // 匹配：行首的数字 + 空格/制表符，但不影响代码中的数字
            const lineNumberPattern = /^(\s*)(\d+)(\s+)(.*)$/;
            const match = line.match(lineNumberPattern);

            if (match) {
                // 如果匹配到行号模式，返回原始缩进 + 代码内容
                const [, leadingSpaces, lineNumber, separator, codeContent] = match;

                // 检查是否是真正的行号（通过缩进和分隔符判断）
                if (separator.length >= 1 && (separator.includes(' ') || separator.includes('\t'))) {
                    // 如果代码内容为空或只有空白，说明这是纯行号行，返回空字符串
                    if (!codeContent || codeContent.trim() === '') {
                        return '';
                    }
                    // 保留原始缩进，只移除行号和分隔符
                    return leadingSpaces + codeContent;
                }
            }

            // 特殊处理：如果整行只有数字（可能是残留的行号），返回空字符串
            const trimmed = line.trim();
            if (/^\d+$/.test(trimmed)) {
                return '';
            }

            // 如果没有匹配到行号模式，返回原行
            return line;
        },

        // 智能清理换行符（保留代码结构）
        smartCleanNewlines(text) {
            if (!text || typeof text !== 'string') return text;

            // 1. 移除首尾的空白字符
            let cleaned = text.trim();

            // 2. 智能处理连续的换行符：保留代码块之间的分隔，但移除过多的空行
            // 将3个或更多换行符替换为2个，保持代码块的可读性
            cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

            // 3. 保留行内的缩进和空白字符
            // 不进行额外的行首行尾清理，保持代码的原始格式

            return cleaned;
        },

        // 辅助方法：清理文本中的多余换行符（保留用于向后兼容）
        cleanTextNewlines(text) {
            if (!text || typeof text !== 'string') return text;

            // 1. 移除首尾的空白字符和换行符
            let cleaned = text.trim();

            // 2. 将多个连续的换行符替换为单个换行符
            cleaned = cleaned.replace(/\n{2,}/g, '\n');

            // 3. 移除行首行尾的空白字符
            cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');

            // 4. 再次移除首尾的换行符
            cleaned = cleaned.replace(/^\n+|\n+$/g, '');

            return cleaned;
        },


        // 监听选择变化并定位"评论"按钮
        onSelectionChange() {
            try {
                // 如果是编辑模式，处理 textarea 中的选择
                if (this.isEditingFile) {
                    const textarea = this.$el && this.$el.querySelector('.edit-textarea');
                    if (!textarea) {
                        const withinGrace = Date.now() - this._lastShowTs < 250;
                        if (!this._containerHover && !withinGrace) this.hideSelectionButton();
                        return;
                    }

                    const start = textarea.selectionStart || 0;
                    const end = textarea.selectionEnd || 0;

                    // 检查是否有选择（非折叠选择）
                    if (start === end) {
                        const withinGrace = Date.now() - this._lastShowTs < 250;
                        if (!this._containerHover && !withinGrace) this.hideSelectionButton();
                        return;
                    }

                    // 获取选择的文本
                    const selectedText = textarea.value.substring(start, end).trim();
                    if (!selectedText) {
                        const withinGrace = Date.now() - this._lastShowTs < 250;
                        if (!this._containerHover && !withinGrace) this.hideSelectionButton();
                        return;
                    }

                    // 保存选择信息
                    this.lastSelectionText = selectedText;
                    this.lastSelectionRange = this.getTextareaSelectionLineRange(textarea, start, end);

                    console.log('[CodeView] 检测到编辑模式下的有效选择:', {
                        text: selectedText.substring(0, 50) + (selectedText.length > 50 ? '...' : ''),
                        textLength: selectedText.length,
                        range: this.lastSelectionRange
                    });

                    // 计算按钮位置（基于 textarea 的选中区域）
                    const rect = this.getTextareaSelectionRect(textarea, start, end);
                    if (rect && rect.width && rect.height) {
                        this._lastSelectionRect = rect;
                        this.positionSelectionButton(rect);
                    } else {
                        const withinGrace = Date.now() - this._lastShowTs < 250;
                        if (!this._containerHover && !withinGrace) this.hideSelectionButton();
                    }
                    return;
                }

                // 非编辑模式：处理 DOM 选择
                const sel = window.getSelection();
                if (!sel || sel.rangeCount === 0) {
                    const withinGrace = Date.now() - this._lastShowTs < 250;
                    if (!this._containerHover && !withinGrace) this.hideSelectionButton();
                    return;
                }
                const range = sel.getRangeAt(0);
                if (sel.isCollapsed) {
                    const withinGrace = Date.now() - this._lastShowTs < 250;
                    if (!this._containerHover && !withinGrace) this.hideSelectionButton();
                    return;
                }
                // 根据当前模式选择正确的根元素
                let codeRoot = null;
                if (this.shouldShowMarkdownPreview) {
                    // Markdown预览模式：查找markdown-preview-content
                    codeRoot = this.$el && this.$el.querySelector('.markdown-preview-content');
                } else {
                    // 代码模式：查找code-content
                    codeRoot = this.$el && this.$el.querySelector('.code-content');
                }
                if (!codeRoot) {
                    const withinGrace = Date.now() - this._lastShowTs < 250;
                    if (!this._containerHover && !withinGrace) this.hideSelectionButton();
                    return;
                }
                // 放宽：任一端点在代码区内即认为是代码选择
                const nodeIn = (node) => {
                    if (!node) return false;
                    const el = node.nodeType === 1 ? node : node.parentNode;
                    return el && codeRoot.contains(el);
                };
                const common = range.commonAncestorContainer;
                const within = nodeIn(common) || nodeIn(sel.anchorNode) || nodeIn(sel.focusNode);
                if (!within) {
                    const withinGrace = Date.now() - this._lastShowTs < 250;
                    if (!this._containerHover && !withinGrace) this.hideSelectionButton();
                    return;
                }
                const text = String(sel.toString() || '').trim();
                if (!text) {
                    const withinGrace = Date.now() - this._lastShowTs < 250;
                    if (!this._containerHover && !withinGrace) this.hideSelectionButton();
                    return;
                }
                // 选择文本和范围将在按钮定位时保存，这里仅用于验证
                console.log('[CodeView] 检测到有效选择:', {
                    text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                    textLength: text.length
                });
                let rects = range.getClientRects();
                if (!rects || rects.length === 0) {
                    // 兜底：使用整体范围
                    const br = range.getBoundingClientRect && range.getBoundingClientRect();
                    if (br && br.width && br.height) {
                        this._lastSelectionRect = br;
                        this.positionSelectionButton(br);
                        return;
                    }
                    const withinGrace = Date.now() - this._lastShowTs < 250;
                    if (!this._containerHover && !withinGrace) this.hideSelectionButton();
                    return;
                }
                const rect = rects[rects.length - 1];
                this._lastSelectionRect = rect;
                this.positionSelectionButton(rect);
            } catch (_) {
                this.hideSelectionButton();
            }
        },
        // 获取选择的行号范围
        getSelectionLineRange(range) {
            if (!range) return null;

            try {
                // 辅助函数：查找最近的代码行元素
                const findLineElement = (node) => {
                    if (!node) return null;
                    // 如果节点是文本节点，使用其父节点
                    const el = node.nodeType === 3 ? node.parentNode : node;
                    // 查找带有data-line属性的code元素
                    return el.closest && el.closest('code[data-line]');
                };

                const startLineEl = findLineElement(range.startContainer);
                const endLineEl = findLineElement(range.endContainer);

                if (startLineEl) {
                    const startLine = parseInt(startLineEl.getAttribute('data-line'), 10);
                    let endLine = startLine;

                    if (endLineEl) {
                        endLine = parseInt(endLineEl.getAttribute('data-line'), 10);
                    }

                    // 确保start <= end
                    return {
                        startLine: Math.min(startLine, endLine),
                        endLine: Math.max(startLine, endLine)
                    };
                }
            } catch (e) {
                console.error('[CodeView] 计算行号范围失败:', e);
            }

            return null;
        },

        // 获取 textarea 中选择的行号范围
        getTextareaSelectionLineRange(textarea, start, end) {
            if (!textarea || start === undefined || end === undefined) return null;

            try {
                const text = textarea.value;
                const textBeforeStart = text.substring(0, start);
                const textBeforeEnd = text.substring(0, end);

                // 计算开始行号（从1开始）
                const startLine = (textBeforeStart.match(/\n/g) || []).length + 1;
                // 计算结束行号
                const endLine = (textBeforeEnd.match(/\n/g) || []).length + 1;

                return {
                    startLine: Math.min(startLine, endLine),
                    endLine: Math.max(startLine, endLine)
                };
            } catch (e) {
                console.error('[CodeView] 计算 textarea 行号范围失败:', e);
            }

            return null;
        },

        // 获取 textarea 中选择区域的矩形位置（用于定位评论按钮）
        getTextareaSelectionRect(textarea, start, end) {
            if (!textarea || start === undefined || end === undefined) return null;

            try {
                const text = textarea.value;
                const textBeforeStart = text.substring(0, start);
                const selectedText = text.substring(start, end);

                // 获取 textarea 的样式和位置
                const textareaRect = textarea.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(textarea);
                const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.2;
                const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
                const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
                const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
                const fontSize = parseFloat(computedStyle.fontSize) || 14;
                const fontFamily = computedStyle.fontFamily || 'monospace';
                const textareaWidth = textareaRect.width - paddingLeft - paddingRight;

                // 计算行数
                const linesBeforeStart = (textBeforeStart.match(/\n/g) || []).length;
                const linesInSelection = (selectedText.match(/\n/g) || []).length;
                const totalLines = linesInSelection + 1;

                // 创建临时测量元素（用于精确测量文本宽度）
                const measureEl = document.createElement('div');
                measureEl.style.position = 'absolute';
                measureEl.style.visibility = 'hidden';
                measureEl.style.whiteSpace = 'pre-wrap';
                measureEl.style.wordWrap = 'break-word';
                measureEl.style.fontSize = fontSize + 'px';
                measureEl.style.fontFamily = fontFamily;
                measureEl.style.padding = '0';
                measureEl.style.margin = '0';
                measureEl.style.border = 'none';
                measureEl.style.width = textareaWidth + 'px';
                measureEl.style.lineHeight = lineHeight + 'px';
                document.body.appendChild(measureEl);

                // 计算选择区域的起始位置
                const lastNewlineIndex = textBeforeStart.lastIndexOf('\n');
                const textInCurrentLine = textBeforeStart.substring(Math.max(0, lastNewlineIndex + 1));

                // 测量当前行中选中文本之前的宽度
                measureEl.textContent = textInCurrentLine;
                const textWidthBeforeSelection = Math.min(measureEl.offsetWidth, textareaWidth);

                // 计算选择区域的宽度（对于多行选择，使用最大宽度）
                let maxSelectionWidth = 0;
                const selectedLines = selectedText.split('\n');

                for (const line of selectedLines) {
                    measureEl.textContent = line;
                    const lineWidth = measureEl.offsetWidth;
                    maxSelectionWidth = Math.max(maxSelectionWidth, lineWidth);
                }

                // 如果选择跨越多行，宽度应该是整个 textarea 的宽度
                const selectionWidth = linesInSelection > 0 ? textareaWidth : Math.min(maxSelectionWidth, textareaWidth);

                document.body.removeChild(measureEl);

                // 计算选择区域的边界
                const selectionTop = textareaRect.top + paddingTop + (linesBeforeStart * lineHeight);
                const selectionLeft = textareaRect.left + paddingLeft + textWidthBeforeSelection;
                const selectionHeight = totalLines * lineHeight;
                const selectionRight = selectionLeft + selectionWidth;
                const selectionBottom = selectionTop + selectionHeight;

                return {
                    top: selectionTop,
                    left: selectionLeft,
                    right: selectionRight,
                    bottom: selectionBottom,
                    width: selectionWidth,
                    height: selectionHeight
                };
            } catch (e) {
                console.error('[CodeView] 计算 textarea 选择位置失败:', e);
                // 降级方案：使用 textarea 的中心位置
                const textareaRect = textarea.getBoundingClientRect();
                return {
                    top: textareaRect.top + textareaRect.height / 2 - 10,
                    left: textareaRect.left + textareaRect.width / 2 - 50,
                    right: textareaRect.left + textareaRect.width / 2 + 50,
                    bottom: textareaRect.top + textareaRect.height / 2 + 10,
                    width: 100,
                    height: 20
                };
            }
        },

        getActionContainer() {
            // 首先尝试在当前组件内查找容器（确保在视图内）
            let container = this.$el && this.$el.querySelector('#comment-action-container');
            if (!container) {
                // 如果在组件内未找到，查找或创建全局容器
                container = document.getElementById('comment-action-container');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'comment-action-container';
                    // 确保容器样式正确
                    container.style.position = 'fixed';
                    container.style.zIndex = '999997';
                    container.style.display = 'none';
                    document.body.appendChild(container);
                }
            }

            // 绑定悬停事件（只绑定一次）
            if (!container._hoverBound) {
                container.addEventListener('mouseenter', () => {
                    console.log('[CodeView] 评论按钮悬停进入');
                    this._containerHover = true;
                });
                container.addEventListener('mouseleave', () => {
                    console.log('[CodeView] 评论按钮悬停离开');
                    this._containerHover = false;
                    const sel = window.getSelection && window.getSelection();
                    if (!sel || sel.isCollapsed) {
                        setTimeout(() => {
                            if (!this._containerHover) {
                                console.log('[CodeView] 延迟隐藏评论按钮');
                                this.hideSelectionButton();
                            }
                        }, 150);
                    }
                });
                container._hoverBound = true;
            }
            return container;
        },
        // 计算评论按钮的最佳位置
        calculateOptimalButtonPosition(rect) {
            if (!rect || !rect.width || !rect.height) {
                return null;
            }

            const padding = 12; // 按钮与选择区域的间距
            const buttonWidth = 160; // 按钮的预估宽度
            const buttonHeight = 40; // 按钮的预估高度
            const minDistanceFromEdge = 16; // 距离视口边缘的最小距离

            const vw = window.innerWidth || document.documentElement.clientWidth;
            const vh = window.innerHeight || document.documentElement.clientHeight;

            // getBoundingClientRect 返回的坐标已经是相对于视口的，不需要加 scroll
            const viewportRect = {
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                right: rect.right,
                width: rect.width || (rect.right - rect.left),
                height: rect.height || (rect.bottom - rect.top)
            };

            // 计算选择区域的中心点
            const centerX = viewportRect.left + viewportRect.width / 2;
            const centerY = viewportRect.top + viewportRect.height / 2;

            // 定义位置策略：按优先级排序
            const strategies = [
                {
                    name: 'right',
                    calculate: () => ({
                        left: viewportRect.right + padding,
                        top: centerY - buttonHeight / 2,
                        align: 'left'
                    })
                },
                {
                    name: 'left',
                    calculate: () => ({
                        left: viewportRect.left - buttonWidth - padding,
                        top: centerY - buttonHeight / 2,
                        align: 'right'
                    })
                },
                {
                    name: 'top',
                    calculate: () => ({
                        left: centerX - buttonWidth / 2,
                        top: viewportRect.top - buttonHeight - padding,
                        align: 'center'
                    })
                },
                {
                    name: 'bottom',
                    calculate: () => ({
                        left: centerX - buttonWidth / 2,
                        top: viewportRect.bottom + padding,
                        align: 'center'
                    })
                },
                {
                    name: 'top-right',
                    calculate: () => ({
                        left: viewportRect.right + padding,
                        top: viewportRect.top - buttonHeight / 2,
                        align: 'left'
                    })
                },
                {
                    name: 'top-left',
                    calculate: () => ({
                        left: viewportRect.left - buttonWidth - padding,
                        top: viewportRect.top - buttonHeight / 2,
                        align: 'right'
                    })
                }
            ];

            // 评估每个位置策略的可行性
            let bestStrategy = null;
            let bestScore = -1;

            for (const strategy of strategies) {
                const pos = strategy.calculate();

                // 检查是否在视口内
                const fitsInViewport =
                    pos.left >= minDistanceFromEdge &&
                    pos.left + buttonWidth <= vw - minDistanceFromEdge &&
                    pos.top >= minDistanceFromEdge &&
                    pos.top + buttonHeight <= vh - minDistanceFromEdge;

                if (!fitsInViewport) {
                    // 如果超出视口，尝试调整位置
                    pos.left = Math.max(minDistanceFromEdge, Math.min(pos.left, vw - buttonWidth - minDistanceFromEdge));
                    pos.top = Math.max(minDistanceFromEdge, Math.min(pos.top, vh - buttonHeight - minDistanceFromEdge));
                }

                // 计算分数：优先选择不遮挡选择区域且位置合理的策略
                let score = 0;

                // 检查是否遮挡选择区域
                const overlapsSelection = !(
                    pos.left + buttonWidth < viewportRect.left ||
                    pos.left > viewportRect.right ||
                    pos.top + buttonHeight < viewportRect.top ||
                    pos.top > viewportRect.bottom
                );

                if (!overlapsSelection) score += 100;
                if (fitsInViewport) score += 50;

                // 偏好右侧位置（更符合阅读习惯）
                if (strategy.name === 'right') score += 30;
                if (strategy.name === 'left') score += 20;

                // 偏好水平对齐（相对于垂直对齐）
                if (strategy.name.includes('top') || strategy.name.includes('bottom')) {
                    score += 10;
                }

                if (score > bestScore) {
                    bestScore = score;
                    bestStrategy = { ...pos, strategy: strategy.name };
                }
            }

            // 如果所有策略都不理想，使用降级方案
            if (!bestStrategy || bestScore < 50) {
                bestStrategy = {
                    left: Math.min(viewportRect.right + padding, vw - buttonWidth - minDistanceFromEdge),
                    top: Math.max(minDistanceFromEdge, Math.min(centerY - buttonHeight / 2, vh - buttonHeight - minDistanceFromEdge)),
                    strategy: 'fallback'
                };
            }

            // 返回 fixed 定位坐标（已经是相对于视口的）
            return {
                left: bestStrategy.left,
                top: bestStrategy.top,
                strategy: bestStrategy.strategy
            };
        },

        positionSelectionButton(rect) {
            console.log('[CodeView] 定位评论按钮', rect);
            const container = this.getActionContainer();

            // 保存当前选择的文本，防止按钮点击时选区丢失
            if (this.isEditingFile) {
                // 编辑模式：从 textarea 获取选择信息（已在 onSelectionChange 中保存）
                // 这里只需要确保信息已保存即可
                console.log('[CodeView] 编辑模式下使用已保存的选择信息:', {
                    text: this.lastSelectionText ? this.lastSelectionText.substring(0, 50) + (this.lastSelectionText.length > 50 ? '...' : '') : '',
                    range: this.lastSelectionRange
                });
            } else {
                // 非编辑模式：从 DOM 选择获取信息
                const currentSelection = window.getSelection();
                if (currentSelection && !currentSelection.isCollapsed) {
                    // 获取选择的原始文本
                    const rawText = String(currentSelection.toString() || '').trim();

                    // 从选择的文本中提取纯代码内容（去除行号）
                    const cleanText = this.extractCodeContent(currentSelection);

                    // 计算选择范围（用于评论定位）
                    const currentRange = currentSelection.rangeCount > 0 ? currentSelection.getRangeAt(0) : null;
                    const rangeInfo = this.getSelectionLineRange(currentRange);

                    // 更新保存的选择信息
                    this.lastSelectionText = cleanText;
                    this.lastSelectionRange = rangeInfo;

                    console.log('[CodeView] 在按钮定位时保存选择信息:', {
                        raw: rawText.substring(0, 50) + (rawText.length > 50 ? '...' : ''),
                        clean: cleanText.substring(0, 50) + (cleanText.length > 50 ? '...' : ''),
                        cleanLength: cleanText.length,
                        range: rangeInfo
                    });
                }
            }

            // 重建按钮以确保事件监听正确绑定
            container.innerHTML = '';
            const btn = document.createElement('button');
            btn.className = 'comment-action-btn primary small';
            btn.innerHTML = '<i class="fas fa-comment"></i><span class="button-text">评论</span>';
            // 直接使用内联函数确保this绑定正确
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[CodeView] 评论按钮被点击');
                this.handleSelectionCommentClick();
            });
            container.appendChild(btn);

            // 使用优化的位置计算
            const optimalPosition = this.calculateOptimalButtonPosition(rect);

            if (!optimalPosition) {
                console.warn('[CodeView] 无法计算按钮位置，使用默认位置');
                // 降级方案
                const vw = window.innerWidth || document.documentElement.clientWidth;
                const vh = window.innerHeight || document.documentElement.clientHeight;
                optimalPosition = {
                    left: Math.min(rect.right + 12, vw - 180),
                    top: Math.max(16, Math.min(rect.top, vh - 56)),
                    strategy: 'fallback'
                };
            }

            // 应用样式
            container.style.position = 'fixed';
            container.style.left = `${optimalPosition.left}px`;
            container.style.top = `${optimalPosition.top}px`;
            container.style.display = 'flex';
            container.style.opacity = '1';
            container.style.pointerEvents = 'auto';

            // 根据位置策略添加相应的类名（用于CSS样式调整）
            container.classList.remove('position-right', 'position-left', 'position-top', 'position-bottom');
            container.classList.add(`position-${optimalPosition.strategy}`);
            container.classList.add('visible');

            // 记录状态
            this._lastShowTs = Date.now();
            this._buttonVisible = true;
            console.log('[CodeView] 评论按钮已显示', {
                left: optimalPosition.left,
                top: optimalPosition.top,
                strategy: optimalPosition.strategy
            });
        },
        hideSelectionButton() {
            console.log('[CodeView] 隐藏评论按钮');
            // 同时查找组件内和全局容器
            const localContainer = this.$el && this.$el.querySelector('#comment-action-container');
            const globalContainer = document.getElementById('comment-action-container');

            [localContainer, globalContainer].forEach(container => {
                if (container) {
                    container.style.display = 'none';
                    container.style.opacity = '0';
                    container.style.pointerEvents = 'none';
                    container.classList.remove('visible');
                }
            });

            this._buttonVisible = false;
        },
        handleSelectionCommentClick() {
            console.log('[CodeView] 处理评论按钮点击，当前保存的选择文本:', this.lastSelectionText);

            // 使用 Quick Comment 内联输入框（Cursor Quick Edit 风格）
            console.log('[CodeView] 打开 Quick Comment 内联输入框');
            this.openQuickComment();
        },
        openManualImprovementModal() {
            this.showManualImprovementModal = true;
            this.manualCommentError = '';
            this.manualQuotedCode = this.lastSelectionText || '';
            this.manualEditorView = 'edit';
            this.$nextTick(() => {
                try {
                    // 应用保存的尺寸和位置（如果有）
                    const modalContent = this.$el?.querySelector('.manual-improvement-content');
                    if (modalContent) {
                        // 应用尺寸
                        if (this.manualModalSize.width && this.manualModalSize.height) {
                            modalContent.style.width = `${this.manualModalSize.width}px`;
                            modalContent.style.height = `${this.manualModalSize.height}px`;
                        }
                        // 应用位置（如果已拖拽）
                        if (this.manualModalPosition.left !== null && this.manualModalPosition.top !== null) {
                            modalContent.style.left = `${this.manualModalPosition.left}px`;
                            modalContent.style.top = `${this.manualModalPosition.top}px`;
                            modalContent.style.right = 'auto';
                            modalContent.style.bottom = 'auto';
                            modalContent.style.transform = 'none';
                            modalContent.style.margin = '0';
                        }
                    }
                    const ta = this.$el && this.$el.querySelector('.manual-improvement-input');
                    if (ta) ta.focus();
                } catch (_) { }
            });
        },
        closeManualImprovementModal() {
            this.showManualImprovementModal = false;
            this.manualCommentError = '';
            this.manualQuotedCode = '';
            // 清空选择状态，确保下次打开时重新选择
            this.lastSelectionText = '';
            this.lastSelectionRange = null;
            // 重置调整大小和拖拽状态
            this.isResizingManualModal = false;
            this.isDraggingManualModal = false;
            // 注意：不重置 manualModalSize 和 manualModalPosition，保留用户调整的大小和位置

            // 清理编辑模式状态
            this.isEditingCommentMode = false;
            this.editingCommentData = null;
            this.editingCommentAuthor = '';
            this.editingCommentTimestamp = '';
            this.editingCommentType = '';
            this.editingCommentStatus = 'pending';
            this.editingImprovementText = '';
            this.showImprovementSection = false;
            this.manualCommentText = '';
        },

        // ===== Quick Comment 内联输入框方法（Cursor Quick Edit 风格）=====
        openQuickComment() {
            // 优先使用选中文本的位置，其次使用评论按钮位置
            let referenceRect = null;

            // 尝试获取当前选区的位置
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                referenceRect = range.getBoundingClientRect();
            }

            // 如果没有选区位置，使用评论按钮位置
            if (!referenceRect || referenceRect.width === 0) {
                const container = document.getElementById('comment-action-container');
                if (container) {
                    referenceRect = container.getBoundingClientRect();
                }
            }

            // 计算 Quick Comment 的最佳位置
            if (referenceRect && referenceRect.width > 0) {
                this.calculateQuickCommentPosition(referenceRect);
            } else {
                // 没有参考位置时使用视口中心
                const defaultWidth = this.quickCommentPositionData.width || 440;
                const defaultHeight = this.quickCommentPositionData.height || 400;
                this.quickCommentPositionData = {
                    ...this.quickCommentPositionData,
                    left: Math.max(16, (window.innerWidth - defaultWidth) / 2),
                    top: Math.max(100, (window.innerHeight - defaultHeight) / 3)
                };
            }

            // 隐藏评论按钮
            this.hideSelectionButton();

            // 设置引用代码
            this.quickCommentQuote = this.lastSelectionText || '';
            this.quickCommentText = '';
            this.quickCommentError = '';
            this.quickCommentSubmitting = false;
            // 重置 AI 状态
            this.quickCommentAiPrompt = '';
            this.quickCommentAiResult = '';
            this.quickCommentAiError = '';
            this.quickCommentAiGenerating = false;

            // 显示并触发动画
            this.quickCommentAnimating = true;
            this.showQuickComment = true;

            // 聚焦输入框（根据模式选择）
            this.$nextTick(() => {
                if (this.quickCommentMode === 'ai') {
                    const input = this.$refs.quickCommentAiInput;
                    if (input) input.focus();
                } else {
                    const textarea = this.$refs.quickCommentTextarea;
                    if (textarea) textarea.focus();
                }
                // 动画完成后移除动画类
                setTimeout(() => {
                    this.quickCommentAnimating = false;
                }, 200);

                // 添加点击外部关闭的监听
                this._quickCommentOutsideClickHandler = (e) => {
                    const container = this.$el?.querySelector('.quick-comment-container');
                    if (container && !container.contains(e.target)) {
                        this.closeQuickComment();
                    }
                };
                // 延迟添加监听，避免当前点击立即触发关闭
                setTimeout(() => {
                    if (this.showQuickComment) {
                        document.addEventListener('mousedown', this._quickCommentOutsideClickHandler);
                    }
                }, 100);
            });

            console.log('[CodeView] Quick Comment 已打开');
        },

        closeQuickComment() {
            // 停止 AI 生成
            if (this.quickCommentAiAbortController) {
                try {
                    this.quickCommentAiAbortController.abort();
                } catch (_) { }
                this.quickCommentAiAbortController = null;
            }

            this.showQuickComment = false;
            this.quickCommentText = '';
            this.quickCommentQuote = '';
            this.quickCommentError = '';
            this.quickCommentSubmitting = false;
            // 重置 AI 状态
            this.quickCommentAiPrompt = '';
            this.quickCommentAiResult = '';
            this.quickCommentAiError = '';
            this.quickCommentAiGenerating = false;
            // 清空临时保存的 AI prompt
            this._pendingAiPrompt = null;

            // 移除点击外部关闭的监听
            document.removeEventListener('mousedown', this._quickCommentOutsideClickHandler);
            this._quickCommentOutsideClickHandler = null;

            // 清理拖拽和调整大小的事件监听器
            this.stopDragQuickComment();
            this.stopResizeQuickComment();

            console.log('[CodeView] Quick Comment 已关闭');
        },

        // 拖拽移动功能（优化版，与 manual-improvement-modal 保持一致）
        startDragQuickComment(event) {
            // 如果点击的是按钮或其他交互元素，不触发拖拽
            if (event.target.closest('button') || event.target.closest('.quick-comment-header-actions')) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            this.isDraggingQuickComment = true;

            const startX = event.clientX;
            const startY = event.clientY;
            const startLeft = this.quickCommentPositionData.left;
            const startTop = this.quickCommentPositionData.top;

            // 获取容器元素
            const container = this.$el?.querySelector('.quick-comment-container');
            if (!container) return;

            const containerWidth = this.quickCommentPositionData.width || container.offsetWidth;
            const containerHeight = this.quickCommentPositionData.height || container.offsetHeight;
            const padding = 16; // 距离边缘的最小边距

            const onMouseMove = (e) => {
                if (!this.isDraggingQuickComment) return;

                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;

                let newLeft = startLeft + deltaX;
                let newTop = startTop + deltaY;

                // 限制在视口内，保留边距
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const minLeft = padding;
                const minTop = padding;
                const maxLeft = vw - containerWidth - padding;
                const maxTop = vh - containerHeight - padding;

                newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
                newTop = Math.max(minTop, Math.min(newTop, maxTop));

                // 更新位置
                this.quickCommentPositionData.left = newLeft;
                this.quickCommentPositionData.top = newTop;

                // 添加拖拽时的视觉反馈
                if (container) {
                    container.style.transition = 'none'; // 拖拽时禁用过渡动画
                }
            };

            const onMouseUp = () => {
                this.isDraggingQuickComment = false;

                // 恢复过渡动画
                if (container) {
                    container.style.transition = '';
                }

                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            // 使用 passive: false 以便可以 preventDefault
            document.addEventListener('mousemove', onMouseMove, { passive: false });
            document.addEventListener('mouseup', onMouseUp, { passive: true });

            // 防止文本选择
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'grabbing';

            // 在 mouseup 时恢复
            const restoreSelection = () => {
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
            };
            document.addEventListener('mouseup', restoreSelection, { once: true });
        },

        stopDragQuickComment() {
            this.isDraggingQuickComment = false;
        },

        // 调整大小功能 - 支持四个方向
        startResizeQuickComment(event, direction) {
            // 如果点击的是按钮或其他交互元素，不触发调整大小
            if (event.target.closest('button') || event.target.closest('.quick-comment-actions')) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            this.isResizingQuickComment = true;

            const startX = event.clientX;
            const startY = event.clientY;
            const startWidth = this.quickCommentPositionData.width;
            const startHeight = this.quickCommentPositionData.height;
            const startLeft = this.quickCommentPositionData.left;
            const startTop = this.quickCommentPositionData.top;

            const minWidth = 400;
            const minHeight = 300;
            const maxWidth = window.innerWidth - 32;
            const maxHeight = window.innerHeight - 32;

            const onMouseMove = (e) => {
                if (!this.isResizingQuickComment) return;

                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const padding = 16;

                let newWidth = startWidth;
                let newHeight = startHeight;
                let newLeft = startLeft;
                let newTop = startTop;

                // 根据方向计算新的尺寸和位置
                switch (direction) {
                    case 'se': // 右下角：只改变宽度和高度
                        newWidth = startWidth + deltaX;
                        newHeight = startHeight + deltaY;
                        break;
                    case 'sw': // 左下角：改变左边、宽度和高度
                        newWidth = startWidth - deltaX;
                        newHeight = startHeight + deltaY;
                        newLeft = startLeft + deltaX;
                        break;
                    case 'ne': // 右上角：改变顶部、宽度和高度
                        newWidth = startWidth + deltaX;
                        newHeight = startHeight - deltaY;
                        newTop = startTop + deltaY;
                        break;
                    case 'nw': // 左上角：改变左边、顶部、宽度和高度
                        newWidth = startWidth - deltaX;
                        newHeight = startHeight - deltaY;
                        newLeft = startLeft + deltaX;
                        newTop = startTop + deltaY;
                        break;
                    case 'n': // 上边：只改变高度和顶部位置
                        newHeight = startHeight - deltaY;
                        newTop = startTop + deltaY;
                        break;
                    case 's': // 下边：只改变高度
                        newHeight = startHeight + deltaY;
                        break;
                    case 'e': // 右边：只改变宽度
                        newWidth = startWidth + deltaX;
                        break;
                    case 'w': // 左边：改变宽度和左边位置
                        newWidth = startWidth - deltaX;
                        newLeft = startLeft + deltaX;
                        break;
                }

                // 限制最小尺寸
                newWidth = Math.max(minWidth, newWidth);
                newHeight = Math.max(minHeight, newHeight);

                // 限制最大尺寸（基于视口）
                newWidth = Math.min(newWidth, vw - padding * 2);
                newHeight = Math.min(newHeight, vh - padding * 2);

                // 根据方向调整位置，确保不超出视口
                if (direction === 'sw' || direction === 'nw' || direction === 'w') {
                    // 左侧调整：确保左边界不超出
                    const minLeft = padding;
                    const maxLeft = vw - newWidth - padding;
                    newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
                    // 如果位置被限制，调整宽度
                    if (direction === 'sw' || direction === 'nw' || direction === 'w') {
                        newWidth = startWidth - (newLeft - startLeft);
                    }
                } else if (direction !== 'n' && direction !== 's') {
                    // 右侧固定：确保右边界不超出（排除上下方向）
                    const maxWidth = vw - newLeft - padding;
                    newWidth = Math.min(newWidth, maxWidth);
                }

                if (direction === 'ne' || direction === 'nw' || direction === 'n') {
                    // 顶部调整：确保上边界不超出
                    const minTop = padding;
                    const maxTop = vh - newHeight - padding;
                    newTop = Math.max(minTop, Math.min(newTop, maxTop));
                    // 如果位置被限制，调整高度
                    if (direction === 'ne' || direction === 'nw' || direction === 'n') {
                        newHeight = startHeight - (newTop - startTop);
                    }
                } else if (direction !== 'e' && direction !== 'w') {
                    // 底部固定：确保下边界不超出（排除左右方向）
                    const maxHeight = vh - newTop - padding;
                    newHeight = Math.min(newHeight, maxHeight);
                }

                // 最终尺寸限制（确保满足最小尺寸）
                newWidth = Math.max(minWidth, newWidth);
                newHeight = Math.max(minHeight, newHeight);

                // 最终位置限制（确保容器完全在视口内）
                newLeft = Math.max(padding, Math.min(newLeft, vw - newWidth - padding));
                newTop = Math.max(padding, Math.min(newTop, vh - newHeight - padding));

                this.quickCommentPositionData.width = newWidth;
                this.quickCommentPositionData.height = newHeight;
                this.quickCommentPositionData.left = newLeft;
                this.quickCommentPositionData.top = newTop;
            };

            const onMouseUp = () => {
                this.isResizingQuickComment = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        },

        stopResizeQuickComment() {
            this.isResizingQuickComment = false;
        },

        // Manual Modal 调整大小功能
        startResizeManualModal(event, direction) {
            event.preventDefault();
            event.stopPropagation();

            this.isResizingManualModal = true;

            const modalContent = this.$el?.querySelector('.manual-improvement-content');
            if (!modalContent) return;

            const startX = event.clientX;
            const startY = event.clientY;
            const startWidth = modalContent.offsetWidth;
            const startHeight = modalContent.offsetHeight;

            const minWidth = 600;
            const minHeight = 400;
            const maxWidth = window.innerWidth - 40;
            const maxHeight = window.innerHeight - 40;

            const onMouseMove = (e) => {
                if (!this.isResizingManualModal) return;

                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const padding = 20;

                let newWidth = startWidth;
                let newHeight = startHeight;

                // 根据方向计算新的尺寸
                switch (direction) {
                    case 'se': // 右下角
                        newWidth = startWidth + deltaX;
                        newHeight = startHeight + deltaY;
                        break;
                    case 'sw': // 左下角
                        newWidth = startWidth - deltaX;
                        newHeight = startHeight + deltaY;
                        break;
                    case 'ne': // 右上角
                        newWidth = startWidth + deltaX;
                        newHeight = startHeight - deltaY;
                        break;
                    case 'nw': // 左上角
                        newWidth = startWidth - deltaX;
                        newHeight = startHeight - deltaY;
                        break;
                    case 'n': // 上边
                        newHeight = startHeight - deltaY;
                        break;
                    case 's': // 下边
                        newHeight = startHeight + deltaY;
                        break;
                    case 'e': // 右边
                        newWidth = startWidth + deltaX;
                        break;
                    case 'w': // 左边
                        newWidth = startWidth - deltaX;
                        break;
                }

                // 限制最小和最大尺寸
                newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
                newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));

                // 保存尺寸
                this.manualModalSize = {
                    width: newWidth,
                    height: newHeight
                };

                // 应用样式
                if (modalContent) {
                    modalContent.style.width = `${newWidth}px`;
                    modalContent.style.height = `${newHeight}px`;
                }
            };

            const onMouseUp = () => {
                this.isResizingManualModal = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        },

        stopResizeManualModal() {
            this.isResizingManualModal = false;
        },

        // Manual Modal 拖拽功能（与 quick-comment-container 保持一致）
        startDragManualModal(event) {
            // 如果点击的是按钮或其他交互元素，不触发拖拽
            if (event.target.closest('button') || event.target.closest('.close-btn')) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            this.isDraggingManualModal = true;

            const modalContent = this.$el?.querySelector('.manual-improvement-content');
            if (!modalContent) return;

            // 获取当前位置（如果已设置）或计算居中位置
            const rect = modalContent.getBoundingClientRect();
            const startX = event.clientX;
            const startY = event.clientY;
            const startLeft = this.manualModalPosition.left !== null
                ? this.manualModalPosition.left
                : rect.left;
            const startTop = this.manualModalPosition.top !== null
                ? this.manualModalPosition.top
                : rect.top;

            const containerWidth = modalContent.offsetWidth;
            const containerHeight = modalContent.offsetHeight;
            const padding = 20; // 距离边缘的最小边距

            const onMouseMove = (e) => {
                if (!this.isDraggingManualModal) return;

                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;

                let newLeft = startLeft + deltaX;
                let newTop = startTop + deltaY;

                // 限制在视口内，保留边距
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const minLeft = padding;
                const minTop = padding;
                const maxLeft = vw - containerWidth - padding;
                const maxTop = vh - containerHeight - padding;

                newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
                newTop = Math.max(minTop, Math.min(newTop, maxTop));

                // 保存位置
                this.manualModalPosition = {
                    left: newLeft,
                    top: newTop
                };

                // 应用位置
                modalContent.style.left = `${newLeft}px`;
                modalContent.style.top = `${newTop}px`;
                modalContent.style.right = 'auto';
                modalContent.style.bottom = 'auto';
                modalContent.style.transform = 'none';
                modalContent.style.margin = '0';

                // 拖拽时禁用过渡动画
                modalContent.style.transition = 'none';
            };

            const onMouseUp = () => {
                this.isDraggingManualModal = false;

                // 恢复过渡动画
                if (modalContent) {
                    modalContent.style.transition = '';
                }

                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                // 恢复文本选择
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
            };

            // 使用 passive: false 以便可以 preventDefault
            document.addEventListener('mousemove', onMouseMove, { passive: false });
            document.addEventListener('mouseup', onMouseUp, { passive: true });

            // 防止文本选择
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'grabbing';
        },

        stopDragManualModal() {
            this.isDraggingManualModal = false;
        },

        setQuickCommentMode(mode) {
            this.quickCommentMode = mode;
            // 切换模式时聚焦对应输入框
            this.$nextTick(() => {
                if (mode === 'ai') {
                    const input = this.$refs.quickCommentAiInput;
                    if (input) input.focus();
                } else {
                    const textarea = this.$refs.quickCommentTextarea;
                    if (textarea) textarea.focus();
                }
            });
        },

        useAiPreset(preset) {
            const presets = {
                'review': '请审查这段代码，指出潜在的问题和改进建议',
                'improve': '请为这段代码提供优化和改进建议',
                'explain': '请解释这段代码的功能和工作原理',
                'bug': '请检查这段代码中可能存在的 bug 或错误'
            };
            const prompt = presets[preset] || '';
            if (!prompt) {
                console.warn('[CodeView] 未知的预设类型:', preset);
                return;
            }

            console.log('[CodeView] 使用 AI 预设:', preset, prompt);
            this.quickCommentAiPrompt = prompt;
            // 清空之前的错误信息
            this.quickCommentAiError = '';

            this.$nextTick(() => {
                this.generateAiComment();
            });
        },

        handleQuickCommentAiKeydown(event) {
            // Cmd/Ctrl + Enter 生成或提交
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
                if (this.quickCommentAiResult && !this.quickCommentAiGenerating && !this.quickCommentSubmitting) {
                    this.submitAiComment(event);
                } else if (this.quickCommentAiPrompt.trim() && !this.quickCommentAiGenerating) {
                    this.generateAiComment();
                }
                return;
            }

            // Esc 关闭
            if (event.key === 'Escape') {
                event.preventDefault();
                if (this.quickCommentAiGenerating) {
                    this.stopAiGeneration();
                } else {
                    this.closeQuickComment();
                }
                return;
            }
        },

        async generateAiComment() {
            const prompt = (this.quickCommentAiPrompt || '').trim();
            if (!prompt) {
                this.quickCommentAiError = '请输入描述';
                return;
            }

            this.quickCommentAiGenerating = true;
            this.quickCommentAiError = '';
            this.quickCommentAiResult = '';

            // 将 accumulated 提升到函数作用域，以便在 catch 和 finally 中访问
            let accumulated = '';

            try {
                const { streamPrompt } = await import('/src/services/modules/crud.js');
                const apiUrl = `${String(window.API_URL || '').trim().replace(/\/$/, '')}/`;

                // 构建系统提示
                const systemPrompt = `你是一个专业的代码审查助手。用户会提供一段代码，请根据用户的要求给出评论或建议。
要求：
1. 评论要专业、具体、有建设性
2. 使用 Markdown 格式，保持简洁
3. 如果是代码改进建议，可以提供改进后的代码示例
4. 评论语言与用户输入语言保持一致`;

                // 构建用户提示
                const codeContext = this.quickCommentQuote
                    ? `\n\n代码片段：\n\`\`\`\n${this.quickCommentQuote}\n\`\`\``
                    : '';
                const userPrompt = `${prompt}${codeContext}`;

                // 创建 AbortController
                const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                this.quickCommentAiAbortController = controller;

                await streamPrompt(
                    apiUrl,
                    {
                        module_name: 'services.ai.chat_service',
                        method_name: 'chat',
                        parameters: {
                            system: systemPrompt,
                            user: userPrompt,
                            stream: true
                        }
                    },
                    controller ? { signal: controller.signal } : {},
                    (chunk) => {
                        accumulated += String(chunk || '');
                        // 确保结果被正确设置
                        this.quickCommentAiResult = accumulated;
                    }
                );

                // 确保最终结果被正确设置
                if (accumulated && accumulated.trim()) {
                    this.quickCommentAiResult = accumulated.trim();
                    console.log('[CodeView] AI 评论生成完成:', {
                        length: this.quickCommentAiResult.length,
                        preview: this.quickCommentAiResult.substring(0, 100),
                        prompt: this.quickCommentAiPrompt
                    });
                } else {
                    console.warn('[CodeView] AI 评论生成完成但结果为空:', {
                        accumulatedLength: accumulated?.length,
                        accumulated: accumulated?.substring(0, 100)
                    });
                    this.quickCommentAiError = 'AI 生成结果为空，请重试';
                }

            } catch (error) {
                // 检查是否为中止错误
                const isAbort = error?.name === 'AbortError' ||
                    error?.message?.includes('abort') ||
                    error?.message?.includes('cancel');

                if (isAbort) {
                    console.log('[CodeView] AI 生成已停止');
                    // 如果中止时已经有部分结果，保留它
                    if (!this.quickCommentAiResult && accumulated) {
                        this.quickCommentAiResult = accumulated.trim();
                    }
                } else {
                    console.error('[CodeView] AI 评论生成失败:', error);
                    this.quickCommentAiError = error.message || 'AI 生成失败，请重试';
                    // 如果失败时已经有部分结果，保留它
                    if (accumulated && accumulated.trim()) {
                        this.quickCommentAiResult = accumulated.trim();
                    }
                }
            } finally {
                this.quickCommentAiGenerating = false;
                this.quickCommentAiAbortController = null;

                // 最终检查：确保结果被正确设置
                if (accumulated && accumulated.trim() && !this.quickCommentAiResult) {
                    console.warn('[CodeView] 检测到结果未设置，手动设置');
                    this.quickCommentAiResult = accumulated.trim();
                }

                // 输出最终状态用于调试
                console.log('[CodeView] AI 生成完成，最终状态:', {
                    hasResult: !!(this.quickCommentAiResult && this.quickCommentAiResult.trim()),
                    resultLength: this.quickCommentAiResult?.length || 0,
                    hasError: !!this.quickCommentAiError,
                    prompt: this.quickCommentAiPrompt
                });
            }
        },

        stopAiGeneration() {
            if (this.quickCommentAiAbortController) {
                try {
                    this.quickCommentAiAbortController.abort();
                } catch (_) { }
                this.quickCommentAiAbortController = null;
            }
            this.quickCommentAiGenerating = false;
        },

        clearAiResult() {
            this.quickCommentAiResult = '';
            this.quickCommentAiError = '';
            // 停止正在进行的生成
            if (this.quickCommentAiAbortController) {
                try {
                    this.quickCommentAiAbortController.abort();
                } catch (_) { }
                this.quickCommentAiAbortController = null;
            }
            this.quickCommentAiGenerating = false;
            console.log('[CodeView] 已清空 AI 生成结果');
        },

        regenerateAiComment() {
            this.quickCommentAiResult = '';
            this.quickCommentAiError = '';
            this.generateAiComment();
        },

        async copyAiResult() {
            try {
                await navigator.clipboard.writeText(this.quickCommentAiResult);
                if (window.showSuccess) {
                    window.showSuccess('已复制到剪贴板');
                }
            } catch (error) {
                console.error('[CodeView] 复制失败:', error);
            }
        },

        async submitAiComment(event) {
            console.log('[CodeView] submitAiComment 被调用', {
                event: !!event,
                quickCommentAiResult: this.quickCommentAiResult?.substring?.(0, 50),
                quickCommentSubmitting: this.quickCommentSubmitting,
                quickCommentAiGenerating: this.quickCommentAiGenerating
            });

            // 阻止默认行为和事件冒泡
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            // 检查是否正在提交或生成中
            if (this.quickCommentSubmitting || this.quickCommentAiGenerating) {
                console.warn('[CodeView] 正在提交或生成中，忽略点击');
                return;
            }

            // 更严格的内容检查
            const result = this.quickCommentAiResult;
            let content = '';

            if (result && typeof result === 'string') {
                content = result.trim();
            } else if (result) {
                // 如果不是字符串，尝试转换
                content = String(result).trim();
            }

            if (!content || content.length === 0) {
                this.quickCommentError = 'AI 评论内容为空，无法提交';
                console.warn('[CodeView] AI 评论内容为空，无法提交', {
                    resultType: typeof result,
                    resultLength: result?.length,
                    resultPreview: result?.substring?.(0, 50)
                });
                return;
            }

            console.log('[CodeView] 开始提交 AI 评论:', {
                hasContent: !!content,
                contentLength: content.length,
                hasPrompt: !!this.quickCommentAiPrompt
            });

            // 将 AI 结果作为评论内容提交
            this.quickCommentText = content;
            // 保存 AI prompt 以便在提交时包含到评论对象中
            this._pendingAiPrompt = (this.quickCommentAiPrompt || '').trim();

            try {
                await this.submitQuickComment();
            } catch (error) {
                console.error('[CodeView] 提交 AI 评论失败:', error);
                this.quickCommentError = `提交失败: ${error.message || '未知错误'}`;
            }
        },

        calculateQuickCommentPosition(rect) {
            const padding = 16;
            const containerWidth = this.quickCommentPositionData.width || 440;
            const containerHeight = this.quickCommentPositionData.height || 400;
            const vw = window.innerWidth || document.documentElement.clientWidth;
            const vh = window.innerHeight || document.documentElement.clientHeight;
            const minEdgeDistance = 16;

            // 计算选区的中心点
            const selectionCenterY = rect.top + rect.height / 2;

            let left, top;
            let placement = 'right'; // 记录放置位置

            // 策略1：优先在选区右侧显示（最符合阅读习惯）
            if (rect.right + padding + containerWidth < vw - minEdgeDistance) {
                left = rect.right + padding;
                // 垂直居中对齐选区
                top = selectionCenterY - containerHeight / 2;
                placement = 'right';
            }
            // 策略2：在选区下方显示
            else if (rect.bottom + padding + containerHeight < vh - minEdgeDistance) {
                // 水平居中于选区
                left = rect.left + (rect.width - containerWidth) / 2;
                top = rect.bottom + padding;
                placement = 'bottom';
            }
            // 策略3：在选区左侧显示
            else if (rect.left - padding - containerWidth > minEdgeDistance) {
                left = rect.left - containerWidth - padding;
                top = selectionCenterY - containerHeight / 2;
                placement = 'left';
            }
            // 策略4：在选区上方显示
            else if (rect.top - padding - containerHeight > minEdgeDistance) {
                left = rect.left + (rect.width - containerWidth) / 2;
                top = rect.top - containerHeight - padding;
                placement = 'top';
            }
            // 策略5：居中显示（降级方案）
            else {
                left = (vw - containerWidth) / 2;
                top = Math.max(minEdgeDistance, rect.bottom + padding);
                placement = 'center';
            }

            // 确保不超出视口边界
            left = Math.max(minEdgeDistance, Math.min(left, vw - containerWidth - minEdgeDistance));
            top = Math.max(minEdgeDistance, Math.min(top, vh - containerHeight - minEdgeDistance));

            this.quickCommentPositionData = {
                ...this.quickCommentPositionData,
                left,
                top,
                placement
            };
            console.log('[CodeView] Quick Comment 位置计算:', { left, top, placement, rect });
        },

        handleQuickCommentKeydown(event) {
            // Cmd/Ctrl + Enter 提交
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                if (this.canSubmitQuickComment && !this.quickCommentSubmitting) {
                    this.submitQuickComment();
                }
                return;
            }

            // Esc 关闭
            if (event.key === 'Escape') {
                event.preventDefault();
                this.closeQuickComment();
                return;
            }
        },

        autoResizeQuickCommentTextarea() {
            const textarea = this.$refs.quickCommentTextarea;
            if (textarea) {
                textarea.style.height = 'auto';
                const newHeight = Math.min(Math.max(textarea.scrollHeight, 80), 200);
                textarea.style.height = `${newHeight}px`;
            }
        },

        expandToFullEditor() {
            // 将当前内容转移到完整编辑器（支持 AI 模式）
            if (this.quickCommentMode === 'ai' && this.quickCommentAiResult) {
                this.manualCommentText = this.quickCommentAiResult;
            } else {
                this.manualCommentText = this.quickCommentText;
            }
            this.manualQuotedCode = this.quickCommentQuote;

            // 停止 AI 生成
            if (this.quickCommentAiAbortController) {
                try {
                    this.quickCommentAiAbortController.abort();
                } catch (_) { }
                this.quickCommentAiAbortController = null;
            }

            // 关闭 Quick Comment
            this.showQuickComment = false;
            this.quickCommentText = '';
            this.quickCommentQuote = '';
            this.quickCommentAiPrompt = '';
            this.quickCommentAiResult = '';
            this.quickCommentAiGenerating = false;

            // 打开完整编辑器
            this.showManualImprovementModal = true;
            this.manualCommentError = '';
            this.manualEditorView = 'edit';

            this.$nextTick(() => {
                try {
                    // 应用保存的尺寸和位置（如果有）
                    const modalContent = this.$el?.querySelector('.manual-improvement-content');
                    if (modalContent) {
                        // 应用尺寸
                        if (this.manualModalSize.width && this.manualModalSize.height) {
                            modalContent.style.width = `${this.manualModalSize.width}px`;
                            modalContent.style.height = `${this.manualModalSize.height}px`;
                        }
                        // 应用位置（如果已拖拽）
                        if (this.manualModalPosition.left !== null && this.manualModalPosition.top !== null) {
                            modalContent.style.left = `${this.manualModalPosition.left}px`;
                            modalContent.style.top = `${this.manualModalPosition.top}px`;
                            modalContent.style.right = 'auto';
                            modalContent.style.bottom = 'auto';
                            modalContent.style.transform = 'none';
                            modalContent.style.margin = '0';
                        }
                    }
                    const ta = this.$el && this.$el.querySelector('.manual-improvement-input');
                    if (ta) ta.focus();
                } catch (_) { }
            });

            console.log('[CodeView] 展开到完整编辑器');
        },

        async submitQuickComment() {
            const content = (this.quickCommentText || '').trim();
            if (!content) {
                this.quickCommentError = '评论内容不能为空';
                return;
            }
            if (content.length > 2000) {
                this.quickCommentError = '评论过长（最多 2000 字）';
                return;
            }

            this.quickCommentSubmitting = true;
            this.quickCommentError = '';

            try {
                // 显示提交状态
                const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/loading.js');
                showGlobalLoading('正在提交评论...');

                // 获取 sessionKey（与 submitManualImprovement 保持一致）
                const isUUID = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || '').trim());
                const sessionKey = (this.file?.sessionKey && isUUID(this.file.sessionKey))
                    ? String(this.file.sessionKey)
                    : (this.file?.key && isUUID(this.file.key) ? String(this.file.key) : null);

                if (!sessionKey || !isUUID(sessionKey)) {
                    throw new Error('无法找到有效的 sessionKey，评论无法提交');
                }

                // 获取行范围信息
                const rangeInfo = this.lastSelectionRange || { startLine: 1, endLine: 1 };
                const startLine = rangeInfo.startLine || 1;
                const endLine = rangeInfo.endLine || startLine;

                // 构建评论数据（与 submitManualImprovement 保持一致）
                let comment = {
                    content,
                    text: this.quickCommentQuote || this.lastSelectionText || '',
                    rangeInfo: this.lastSelectionRange ? { ...this.lastSelectionRange } : {
                        startLine,
                        endLine,
                        startColumn: 0,
                        endColumn: 0
                    },
                    fileKey: sessionKey,
                    author: '手动评论',
                    fromSystem: null,
                    status: 'pending',
                    timestamp: Date.now()
                };

                // 如果有 AI prompt，将其添加到评论对象中
                if (this._pendingAiPrompt) {
                    comment.aiPrompt = this._pendingAiPrompt;
                }

                console.log('[CodeView] 准备提交 Quick Comment:', {
                    fileKey: comment.fileKey,
                    content: comment.content?.substring(0, 50) + '...',
                    text: comment.text?.substring(0, 50) + '...',
                    rangeInfo: comment.rangeInfo
                });

                // 手动设置时间戳字段，不使用 normalizeComment 避免 content/text 被启发式逻辑调换
                comment.createdTime = comment.timestamp;
                comment.createdAt = comment.timestamp;

                // 验证API地址配置
                if (!window.API_URL) {
                    throw new Error('API地址未配置，无法提交评论');
                }

                // 调用API提交评论（使用与 submitManualImprovement 相同的接口）
                const { postData } = await import('/src/services/modules/crud.js');
                const SERVICE_MODULE = window.SERVICE_MODULE || 'aicr';
                const result = await postData(`${window.API_URL}/`, {
                    module_name: SERVICE_MODULE,
                    method_name: 'create_document',
                    parameters: {
                        cname: 'comments',
                        data: comment
                    }
                });

                console.log('[CodeView] Quick Comment 提交成功:', result);

                // 显示成功消息
                const { showSuccess } = await import('/src/utils/message.js');
                showSuccess('评论添加成功');

                // 通知评论面板刷新
                window.dispatchEvent(new CustomEvent('reloadComments', {
                    detail: {
                        forceReload: true,
                        showAllComments: false,
                        immediateReload: true,
                        fileKey: comment.fileKey
                    }
                }));

                // 延迟后高亮刚添加的评论位置
                setTimeout(() => {
                    if (comment.rangeInfo && comment.fileKey) {
                        console.log('[CodeView] 高亮新添加的评论位置:', comment.rangeInfo);
                        window.dispatchEvent(new CustomEvent('highlightCodeLines', {
                            detail: {
                                fileKey: comment.fileKey,
                                rangeInfo: comment.rangeInfo,
                                comment: comment,
                                _forwarded: true
                            }
                        }));
                    }
                }, 500);

                hideGlobalLoading();
                this.closeQuickComment();

                // 清空选择状态
                this.lastSelectionText = '';
                this.lastSelectionRange = null;

            } catch (error) {
                console.error('[CodeView] Quick Comment 提交失败:', error);
                this.quickCommentError = `提交失败: ${error.message}`;

                // 隐藏loading
                try {
                    const { hideGlobalLoading } = await import('/src/utils/loading.js');
                    hideGlobalLoading();
                } catch (_) { }
            } finally {
                this.quickCommentSubmitting = false;
                // 清空临时保存的 AI prompt
                this._pendingAiPrompt = null;
            }
        },

        // 打开编辑评论弹框（复用 manual-improvement-modal）
        openEditCommentModal(comment) {
            if (!comment || !comment.key) {
                console.error('[CodeView] 无法编辑评论：评论数据无效', comment);
                return;
            }

            console.log('[CodeView] 打开编辑评论弹框:', comment);
            console.log('[CodeView] 组件状态:', {
                hasEl: !!this.$el,
                isMounted: this.$el && this.$el.isConnected,
                showModal: this.showManualImprovementModal
            });

            // 确保组件已挂载
            if (!this.$el) {
                console.warn('[CodeView] 组件尚未挂载，等待挂载后再打开弹框');
                this.$nextTick(() => {
                    this.openEditCommentModal(comment);
                });
                return;
            }

            // 设置编辑模式标志
            this.isEditingCommentMode = true;
            this.editingCommentData = { ...comment };

            // 设置评论内容
            this.manualCommentText = comment.content ? String(comment.content).trim() : '';
            const quotedCode = comment.text ? comment.text.trim() : '';
            this.manualQuotedCode = quotedCode;
            // 同时设置编辑表单中的引用代码，确保显示和编辑一致
            this.editingCommentText = quotedCode;

            // 设置行范围信息
            if (comment.rangeInfo) {
                this.lastSelectionRange = { ...comment.rangeInfo };
            }

            // 显示弹框
            this.showManualImprovementModal = true;
            this.manualCommentError = '';
            this.manualEditorView = 'edit';

            // 聚焦到输入框
            this.$nextTick(() => {
                try {
                    // 应用保存的尺寸和位置（如果有）
                    const modalContent = this.$el?.querySelector('.manual-improvement-content');
                    if (modalContent) {
                        // 应用尺寸
                        if (this.manualModalSize.width && this.manualModalSize.height) {
                            modalContent.style.width = `${this.manualModalSize.width}px`;
                            modalContent.style.height = `${this.manualModalSize.height}px`;
                        }
                        // 应用位置（如果已拖拽）
                        if (this.manualModalPosition.left !== null && this.manualModalPosition.top !== null) {
                            modalContent.style.left = `${this.manualModalPosition.left}px`;
                            modalContent.style.top = `${this.manualModalPosition.top}px`;
                            modalContent.style.right = 'auto';
                            modalContent.style.bottom = 'auto';
                            modalContent.style.transform = 'none';
                            modalContent.style.margin = '0';
                        }
                    }
                    const ta = this.$el && this.$el.querySelector('.manual-improvement-input');
                    if (ta) {
                        ta.focus();
                        ta.setSelectionRange(ta.value.length, ta.value.length);
                    }
                } catch (_) { }
            });
        },

        // 提交编辑后的评论
        async submitEditedComment() {
            const content = (this.manualCommentText || '').trim();
            if (!content) {
                this.manualCommentError = '评论内容不能为空';
                return;
            }

            if (!this.editingCommentData || !this.editingCommentData.key) {
                this.manualCommentError = '编辑数据无效';
                return;
            }

            try {
                this.manualSubmitting = true;
                this.manualCommentError = '';
                const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/loading.js');
                showGlobalLoading('正在保存评论...');

                // 验证API地址配置
                if (!window.API_URL) {
                    throw new Error('API地址未配置，无法保存评论');
                }

                // 获取有效的 sessionKey
                const isUUID = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || '').trim());
                let updateFileKey = (this.file?.sessionKey && isUUID(this.file.sessionKey))
                    ? String(this.file.sessionKey)
                    : (this.file?.key && isUUID(this.file.key) ? String(this.file.key) : null);

                if (!updateFileKey || !isUUID(updateFileKey)) {
                    const existingFileKey = this.editingCommentData?.fileKey;
                    if (existingFileKey && isUUID(existingFileKey)) {
                        updateFileKey = existingFileKey;
                    } else {
                        throw new Error('无法找到有效的 sessionKey，评论无法更新');
                    }
                }

                // 保留原始的 rangeInfo
                const originalRangeInfo = this.editingCommentData.rangeInfo || this.lastSelectionRange || { startLine: 1, endLine: 1 };

                // 构建更新数据
                const originalAuthor = this.editingCommentData.author;
                const finalAuthor = originalAuthor === '手动评论' ? '手动评论' : (this.editingCommentAuthor || originalAuthor);

                const updateDataPayload = {
                    key: this.editingCommentData.key,
                    author: finalAuthor,
                    content: content,
                    // 使用编辑表单中的引用代码（editingCommentText），确保与用户编辑的内容一致
                    text: (this.editingCommentText || '').trim() || this.manualQuotedCode || this.editingCommentData.text || '',
                    rangeInfo: originalRangeInfo,
                    fileKey: updateFileKey,
                    updatedAt: new Date().toISOString()
                };

                // 调用API更新评论
                const { postData } = await import('/src/services/modules/crud.js');
                const result = await postData(`${window.API_URL}/`, {
                    module_name: SERVICE_MODULE,
                    method_name: 'update_document',
                    parameters: {
                        cname: 'comments',
                        data: updateDataPayload
                    }
                });

                console.log('[CodeView] 评论更新成功:', result);

                // 显示成功消息
                const { showSuccess } = await import('/src/utils/message.js');
                showSuccess('评论保存成功');

                // 通知评论面板刷新
                window.dispatchEvent(new CustomEvent('reloadComments', {
                    detail: {
                        forceReload: true,
                        showAllComments: false,
                        immediateReload: true,
                        fileKey: updateFileKey
                    }
                }));

                // 同步更新会话消息
                try {
                    const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
                    const sessionSync = getSessionSyncService();
                    const updatedComment = {
                        ...this.editingCommentData,
                        ...updateDataPayload
                    };
                    await sessionSync.syncCommentToMessage(updatedComment, updateFileKey, false);
                    console.log('[CodeView] 会话消息已同步更新');
                } catch (syncError) {
                    console.warn('[CodeView] 同步会话消息失败（已忽略）:', syncError?.message);
                }

                hideGlobalLoading();
                this.closeManualImprovementModal();

            } catch (error) {
                console.error('[CodeView] 评论更新失败:', error);
                this.manualCommentError = `保存失败: ${error.message}`;

                try {
                    const { hideGlobalLoading } = await import('/src/utils/loading.js');
                    hideGlobalLoading();
                } catch (_) { }
            } finally {
                this.manualSubmitting = false;
            }
        },
        setManualEditorView(view) {
            this.manualEditorView = view === 'preview' ? 'preview' : 'edit';
            if (this.manualEditorView === 'edit') {
                this.$nextTick(() => {
                    try {
                        const ta = this.$el && this.$el.querySelector('.manual-improvement-input');
                        if (ta) ta.focus();
                    } catch (_) { }
                });
            }
        },
        insertMarkdown(type) {
            if (this.manualEditorView !== 'edit') {
                this.manualEditorView = 'edit';
            }
            const textarea = this.$el && this.$el.querySelector('.manual-improvement-input');
            if (!textarea) return;
            const start = textarea.selectionStart || 0;
            const end = textarea.selectionEnd || 0;
            const val = this.manualCommentText || '';
            const selected = val.slice(start, end);
            const wrap = (pre, post) => {
                const next = val.slice(0, start) + pre + (selected || '') + post + val.slice(end);
                this.manualCommentText = next;
                this.$nextTick(() => {
                    textarea.focus();
                    textarea.selectionStart = start + pre.length;
                    textarea.selectionEnd = start + pre.length + (selected || '').length;
                });
            };
            switch (type) {
                case 'bold': return wrap('**', '**');
                case 'italic': return wrap('*', '*');
                case 'code': return wrap('`', '`');
                case 'codeblock': return wrap('```\n', '\n```');
                case 'ul': return wrap('- ', '');
                case 'ol': return wrap('1. ', '');
                case 'link': return wrap('[', '](https://)');
            }
        },
        handleManualKeydown(e) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                // 根据模式选择提交方法
                if (this.isEditingCommentMode) {
                    this.submitEditedComment();
                } else {
                    this.submitManualImprovement();
                }
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                this.closeManualImprovementModal();
            }
        },
        async submitManualImprovement() {
            const content = (this.manualCommentText || '').trim();
            if (!content) {
                this.manualCommentError = '评论内容不能为空';
                return;
            }
            if (content.length > this.manualMaxLength) {
                this.manualCommentError = `评论过长（最多 ${this.manualMaxLength} 字）`;
                return;
            }

            // 检查是否有有效的引用文本
            if (!this.lastSelectionText || !this.lastSelectionText.trim()) {
                console.warn('[CodeView] 警告：没有有效的引用代码文本');
                // 不阻止提交，但记录警告
            }

            try {
                // 显示提交状态
                this.manualCommentError = '';
                this.manualSubmitting = true;
                const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/loading.js');
                showGlobalLoading('正在提交评论...');

                // 重构：comment 的 fileKey 必须是对应 session 的 key（sessionKey）
                const isUUID = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || '').trim());
                // 约定：this.file.key 必须与会话 key(sessionKey/UUID)一致，但这里做兜底以避免边缘场景拿不到 sessionKey
                const sessionKey = (this.file?.sessionKey && isUUID(this.file.sessionKey))
                    ? String(this.file.sessionKey)
                    : (this.file?.key && isUUID(this.file.key) ? String(this.file.key) : null);

                if (!sessionKey || !isUUID(sessionKey)) {
                    throw new Error('无法找到有效的 sessionKey，评论无法提交');
                }

                // 验证引用代码
                console.log('[CodeView] 构建评论数据，引用文本:', this.lastSelectionText);
                console.log('[CodeView] 构建评论数据，引用范围:', this.lastSelectionRange);

                let comment = {
                    content,
                    text: this.manualQuotedCode || this.lastSelectionText || '', // 引用的代码文本存储在 text 中
                    rangeInfo: this.lastSelectionRange ? { ...this.lastSelectionRange } : null, // 复制一份用于评论定位
                    fileKey: sessionKey, // 只使用 sessionKey
                    author: '手动评论',
                    fromSystem: null, // 手动评论没有评论者系统
                    status: 'pending',
                    timestamp: Date.now() // 使用毫秒数
                };

                console.log('[CodeView] 准备提交评论:', {
                    fileKey: comment.fileKey,
                    content: comment.content?.substring(0, 50) + '...',
                    text: comment.text?.substring(0, 50) + '...',
                    rangeInfo: comment.rangeInfo
                });

                // 手动设置时间戳字段，不使用 normalizeComment 避免 content/text 被启发式逻辑调换
                comment.createdTime = comment.timestamp; // 毫秒数
                comment.createdAt = comment.timestamp; // 毫秒数

                // 验证API地址配置
                if (!window.API_URL) {
                    throw new Error('API地址未配置，无法提交评论');
                }

                // 调用API提交评论
                const { postData } = await import('/src/services/modules/crud.js');
                const result = await postData(`${window.API_URL}/`, {
                    module_name: SERVICE_MODULE,
                    method_name: 'create_document',
                    parameters: {
                        cname: 'comments',
                        data: comment
                    }
                });

                console.log('[CodeView] 评论提交成功:', result);

                // 显示成功消息
                const { showSuccess } = await import('/src/utils/message.js');
                showSuccess('评论添加成功');

                // 通知评论面板刷新
                window.dispatchEvent(new CustomEvent('reloadComments', {
                    detail: {
                        forceReload: true,
                        showAllComments: false,
                        immediateReload: true,
                        fileKey: comment.fileKey
                    }
                }));

                // 延迟后高亮刚添加的评论位置
                setTimeout(() => {
                    if (comment.rangeInfo && comment.fileKey) {
                        console.log('[CodeView] 高亮新添加的评论位置:', comment.rangeInfo);
                        window.dispatchEvent(new CustomEvent('highlightCodeLines', {
                            detail: {
                                fileKey: comment.fileKey,
                                rangeInfo: comment.rangeInfo,
                                comment: comment,
                                _forwarded: true // 标记为已转发，避免 index.js 重复处理
                            }
                        }));
                    }
                }, 500); // 等待评论面板刷新完成

                hideGlobalLoading();
                this.closeManualImprovementModal();
                this.hideSelectionButton();
                this.manualCommentText = '';
                this.manualQuotedCode = '';
                // 清空选择状态，避免下次评论时重复使用
                this.lastSelectionText = '';
                this.lastSelectionRange = null;

            } catch (error) {
                console.error('[CodeView] 评论提交失败:', error);
                this.manualCommentError = `提交失败: ${error.message}`;

                // 隐藏loading
                try {
                    const { hideGlobalLoading } = await import('/src/utils/loading.js');
                    hideGlobalLoading();
                } catch (_) { }
            } finally {
                // 重置提交状态
                this.manualSubmitting = false;
            }
        },
        // 获取评论状态对应的CSS类名
        getCommentStatusClass(status) {
            if (!status) return 'status-pending';

            switch (status) {
                case 'pending':
                    return 'status-pending';
                case 'resolved':
                    return 'status-resolved';
                case 'closed':
                case 'reopened':
                    return 'status-reopened';
                default:
                    return 'status-pending';
            }
        },

        // 获取评论类型标签
        getCommentTypeLabel(type) {
            const typeLabelMap = {
                'suggestion': '建议',
                'question': '问题',
                'bug': '错误',
                'discussion': '讨论',
                'praise': '表扬',
                'nitpick': '细节'
            };
            return typeLabelMap[type] || '评论';
        },

        // 获取评论类型图标
        getCommentTypeIcon(type) {
            const typeIconMap = {
                'suggestion': 'fa-lightbulb',
                'question': 'fa-question-circle',
                'bug': 'fa-bug',
                'discussion': 'fa-comments',
                'praise': 'fa-thumbs-up',
                'nitpick': 'fa-search-plus'
            };
            return typeIconMap[type] || 'fa-comment';
        },
        // 格式化时间显示
        formatTime(timestamp) {
            if (!timestamp) return '未知时间';
            try {
                const date = new Date(timestamp);
                if (isNaN(date.getTime())) return '无效时间';

                const now = new Date();
                const diff = now - date;
                const seconds = Math.floor(diff / 1000);
                const minutes = Math.floor(seconds / 60);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);

                if (days > 0) {
                    return `${days}天前`;
                } else if (hours > 0) {
                    return `${hours}小时前`;
                } else if (minutes > 0) {
                    return `${minutes}分钟前`;
                } else {
                    return '刚刚';
                }
            } catch (e) {
                return '时间格式错误';
            }
        },
        // 显示评论详情弹窗
        showCommentDetail(comment, event) {
            console.log('[CodeView] 显示评论详情:', comment);

            if (!comment) return;

            // 设置当前评论
            this.currentCommentDetail = { ...comment };

            // 隐藏预览弹窗（如果有）
            this.hideCommentPreview();

            // 显示详情弹窗
            this.showCommentDetailPopup = true;

            // 重置编辑状态
            this.isEditingCommentDetail = false;

            console.log('[CodeView] 评论详情弹窗已显示');
        },

        // 隐藏评论详情弹窗
        hideCommentDetail() {
            console.log('[CodeView] 隐藏评论详情弹窗');
            this.showCommentDetailPopup = false;
            this.currentCommentDetail = null;
            this.isEditingCommentDetail = false;
            this.resetEditingData();
        },

        // 开始编辑评论详情
        startEditCommentDetail(comment) {
            console.log('[CodeView] 开始编辑评论:', comment);

            if (!comment) return;

            // 填充编辑数据
            this.editingCommentAuthor = comment.author || '';

            // 处理评论内容，支持 JSON 对象
            if (typeof comment.content === 'object' && comment.content !== null) {
                this.editingCommentContent = JSON.stringify(comment.content, null, 2);
                this.editingCommentContentIsJson = true;
            } else {
                this.editingCommentContent = comment.content || '';
                this.editingCommentContentIsJson = false;
            }

            this.editingCommentText = comment.text || '';
            this.editingImprovementText = comment.improvementText || '';
            this.editingCommentType = comment.type || '';
            this.editingCommentStatus = comment.status || 'pending';

            // 处理时间戳
            if (comment.timestamp) {
                try {
                    const date = new Date(comment.timestamp);
                    this.editingCommentTimestamp = date.toISOString().slice(0, 16);
                } catch (e) {
                    this.editingCommentTimestamp = new Date().toISOString().slice(0, 16);
                }
            } else {
                this.editingCommentTimestamp = new Date().toISOString().slice(0, 16);
            }

            // 处理位置信息
            if (comment.rangeInfo) {
                this.editingRangeInfo = { ...comment.rangeInfo };
            } else {
                this.editingRangeInfo = { startLine: 1, endLine: 1 };
            }

            // 切换到编辑模式
            this.isEditingCommentDetail = true;

            // 聚焦到评论内容输入框
            this.$nextTick(() => {
                const textarea = this.$el && this.$el.querySelector('.comment-content-textarea');
                if (textarea) {
                    textarea.focus();
                }
            });
        },

        // 取消编辑评论详情
        cancelEditCommentDetail() {
            console.log('[CodeView] 取消编辑评论');
            this.isEditingCommentDetail = false;
            this.resetEditingData();
        },

        // 重置编辑数据
        resetEditingData() {
            this.editingCommentAuthor = '';
            this.editingCommentTimestamp = '';
            this.editingCommentContent = '';
            this.editingCommentContentIsJson = false;
            this.editingCommentText = '';
            this.editingImprovementText = '';
            this.editingCommentType = '';
            this.editingCommentStatus = 'pending';
            this.editingRangeInfo = { startLine: 1, endLine: 1 };
            this.editingSaving = false;
        },

        // 切换评论内容的 JSON 模式
        toggleCommentContentJsonMode() {
            if (this.editingCommentContentIsJson) {
                // 从 JSON 模式切换到文本模式
                try {
                    const parsed = JSON.parse(this.editingCommentContent);
                    this.editingCommentContent = JSON.stringify(parsed, null, 2);
                } catch (e) {
                    // 如果解析失败，保持原内容
                    console.warn('[CodeView] JSON 解析失败，保持原内容');
                }
                this.editingCommentContentIsJson = false;
            } else {
                // 从文本模式切换到 JSON 模式
                try {
                    const parsed = JSON.parse(this.editingCommentContent);
                    this.editingCommentContent = JSON.stringify(parsed, null, 2);
                    this.editingCommentContentIsJson = true;
                } catch (e) {
                    alert('当前内容不是有效的 JSON 格式，无法切换到 JSON 模式');
                }
            }
        },

        // 保存编辑后的评论详情
        async saveEditedCommentDetail() {
            console.log('[CodeView] 保存编辑后的评论');

            if (!this.currentCommentDetail || !this.currentCommentDetail.key) {
                console.error('[CodeView] 没有有效的评论数据');
                return;
            }

            // 验证必填字段
            if (!this.editingCommentContent.trim()) {
                alert('评论内容不能为空');
                return;
            }

            // 如果标记为 JSON 格式，验证 JSON 有效性
            let processedContent = this.editingCommentContent.trim();
            if (this.editingCommentContentIsJson) {
                try {
                    JSON.parse(processedContent);
                } catch (e) {
                    alert('JSON 格式无效，请检查评论内容格式');
                    return;
                }
            }

            this.editingSaving = true;

            try {
                // 显示全局loading
                const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/loading.js');
                showGlobalLoading('正在保存评论...');

                // 构建更新数据
                const processedContentValue = this.editingCommentContentIsJson ? JSON.parse(processedContent) : processedContent;
                // 如果是手动评论，保持author为"手动评论"
                const originalAuthor = this.currentCommentDetail.author;
                const finalAuthor = originalAuthor === '手动评论' ? '手动评论' : this.editingCommentAuthor.trim();
                // 保留原始的 rangeInfo，因为用户不再可以编辑行号
                const originalRangeInfo = this.currentCommentDetail.rangeInfo || { startLine: 1, endLine: 1 };
                let updateData = {
                    key: this.currentCommentDetail.key,
                    author: finalAuthor,
                    content: processedContentValue,
                    text: processedContentValue, // 确保 text 与 content 保持一致
                    improvementText: this.editingImprovementText.trim(),
                    type: this.editingCommentType,
                    status: this.editingCommentStatus,
                    rangeInfo: originalRangeInfo,
                    timestamp: new Date(this.editingCommentTimestamp).getTime(), // 转换为毫秒数
                    fileKey: this.currentCommentDetail.fileKey
                };

                // 规范化评论数据，确保字段一致性
                if (window.aicrStore && window.aicrStore.normalizeComment) {
                    updateData = window.aicrStore.normalizeComment(updateData);
                }

                console.log('[CodeView] 更新评论数据:', updateData);

                // 验证API地址配置
                if (!window.API_URL) {
                    throw new Error('API地址未配置，无法保存评论');
                }

                // 调用API更新评论
                const { postData: apiPost } = await import('/src/services/modules/crud.js');
                const response = await apiPost(`${window.API_URL}/`, {
                    module_name: SERVICE_MODULE,
                    method_name: 'update_document',
                    parameters: {
                        cname: 'comments',
                        data: updateData
                    }
                });

                console.log('[CodeView] 评论更新成功:', response);

                // 显示成功消息
                const { showSuccess } = await import('/src/utils/message.js');
                showSuccess('评论保存成功');

                // 更新当前评论详情
                this.currentCommentDetail = { ...this.currentCommentDetail, ...updateData };

                // 退出编辑模式
                this.isEditingCommentDetail = false;

                // 触发重新加载评论
                this.$emit('reload-comments', {
                    forceReload: true,
                    fileKey: this.currentCommentDetail.fileKey
                });

                hideGlobalLoading();

            } catch (error) {
                console.error('[CodeView] 保存评论失败:', error);

                // 显示错误消息
                try {
                    const { showError } = await import('/src/utils/message.js');
                    showError('保存评论失败: ' + error.message);
                    const { hideGlobalLoading } = await import('/src/utils/loading.js');
                    hideGlobalLoading();
                } catch (_) { }
            } finally {
                this.editingSaving = false;
            }
        },

        // 删除评论详情
        async deleteCommentDetail(commentKey) {
            console.log('[CodeView] 删除评论:', commentKey);

            if (!commentKey) return;

            if (!confirm('确定要删除这条评论吗？此操作不可恢复。')) {
                return;
            }

            try {
                // 显示全局loading
                const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/loading.js');
                showGlobalLoading('正在删除评论...');

                // 验证API地址配置
                if (!window.API_URL) {
                    throw new Error('API地址未配置，无法删除评论');
                }

                // 调用API删除评论
                const { postData: apiPost } = await import('/src/services/modules/crud.js');
                const response = await apiPost(`${window.API_URL}/`, {
                    module_name: SERVICE_MODULE,
                    method_name: 'delete_document',
                    parameters: {
                        cname: 'comments',
                        key: commentKey
                    }
                });

                console.log('[CodeView] 评论删除成功:', response);

                // 显示成功消息
                const { showSuccess } = await import('/src/utils/message.js');
                showSuccess('评论删除成功');

                // 隐藏详情弹窗
                this.hideCommentDetail();

                // 清除被删除评论对应的高亮行
                this.clearCommentHighlight(commentKey);

                // 触发重新加载评论
                this.$emit('reload-comments', {
                    forceReload: true,
                    // 统一：评论关联只看 sessionKey（UUID）
                    sessionKey: this.file ? (this.file.sessionKey || this.file.key || null) : null
                });

                hideGlobalLoading();

            } catch (error) {
                console.error('[CodeView] 删除评论失败:', error);

                // 显示错误消息
                try {
                    const { showError } = await import('/src/utils/message.js');
                    showError('删除评论失败: ' + error.message);
                    const { hideGlobalLoading } = await import('/src/utils/loading.js');
                    hideGlobalLoading();
                } catch (_) { }
            }
        },

        // 解决评论详情
        async resolveCommentDetail(commentKey) {
            console.log('[CodeView] 解决评论:', commentKey);
            await this.updateCommentStatus(commentKey, 'resolved', '评论已标记为已解决');
        },

        // 重新打开评论详情
        async reopenCommentDetail(commentKey) {
            console.log('[CodeView] 重新打开评论:', commentKey);
            await this.updateCommentStatus(commentKey, 'pending', '评论已重新打开');
        },

        // 更新评论状态的通用方法
        async updateCommentStatus(commentKey, newStatus, successMessage) {
            if (!commentKey) return;

            try {
                // 显示全局loading
                const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/loading.js');
                showGlobalLoading('正在更新评论状态...');

                // 验证API地址配置
                if (!window.API_URL) {
                    throw new Error('API地址未配置，无法更新评论状态');
                }

                // 构建更新数据
                const updateData = {
                    key: commentKey,
                    status: newStatus
                };

                // 调用API更新评论状态
                const { postData: apiPost } = await import('/src/services/modules/crud.js');
                const response = await apiPost(`${window.API_URL}/`, {
                    module_name: SERVICE_MODULE,
                    method_name: 'update_document',
                    parameters: {
                        cname: 'comments',
                        data: updateData
                    }
                });

                console.log('[CodeView] 评论状态更新成功:', response);

                // 显示成功消息
                const { showSuccess } = await import('/src/utils/message.js');
                showSuccess(successMessage);

                // 更新当前评论详情的状态
                if (this.currentCommentDetail && this.currentCommentDetail.key === commentKey) {
                    this.currentCommentDetail.status = newStatus;
                }

                // 触发重新加载评论
                this.$emit('reload-comments', {
                    forceReload: true,
                    // 统一：评论关联只看 sessionKey（UUID）
                    sessionKey: this.file ? (this.file.sessionKey || this.file.key || null) : null
                });

                hideGlobalLoading();

            } catch (error) {
                console.error('[CodeView] 更新评论状态失败:', error);

                // 显示错误消息
                try {
                    const { showError } = await import('/src/utils/message.js');
                    showError('更新评论状态失败: ' + error.message);
                    const { hideGlobalLoading } = await import('/src/utils/loading.js');
                    hideGlobalLoading();
                } catch (_) { }
            }
        },

        // 获取评论状态标签
        getCommentStatusLabel(status) {
            switch (status) {
                case 'pending':
                    return '待处理';
                case 'resolved':
                    return '已解决';
                case 'closed':
                    return '已关闭';
                case 'reopened':
                    return '重新打开';
                default:
                    return '待处理';
            }
        },

        // 处理编辑键盘事件
        onCommentDetailEditKeydown(e) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                this.saveEditedCommentDetail();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelEditCommentDetail();
            }
        },

        // 处理引用代码键盘事件
        handleQuotedCodeKeydown(e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                this.handleCodeIndentation(e.target, e.shiftKey);
            }
        },

        // 处理代码缩进/反缩进（增强版）
        handleCodeIndentation(textarea, isReverse = false) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const value = textarea.value;

            // 智能检测缩进字符：优先使用Tab，其次使用4个空格
            const indentChar = this.detectIndentChar(value);

            // 获取选中文本和行范围
            const lines = value.split('\n');
            let startLine = value.substring(0, start).split('\n').length - 1;
            let endLine = value.substring(0, end).split('\n').length - 1;

            // 如果选择了多行或者光标在行首，处理多行缩进
            if (start !== end || this.isAtLineStart(value, start)) {
                const result = this.processMultiLineIndentation(lines, startLine, endLine, indentChar, isReverse);

                // 更新textarea内容
                textarea.value = result.newValue;

                // 重新设置选择范围
                textarea.selectionStart = result.newStart;
                textarea.selectionEnd = result.newEnd;
            } else {
                // 单行处理
                if (isReverse) {
                    // Shift+Tab: 删除光标前的缩进
                    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
                    const lineText = lines[startLine];
                    const leadingSpaces = this.getLeadingWhitespace(lineText);

                    if (leadingSpaces.length > 0) {
                        // 计算要删除的字符数（智能处理Tab和空格混合）
                        const deleteCount = this.calculateDeleteCount(leadingSpaces, indentChar);
                        const newValue = value.substring(0, lineStart) +
                            lineText.substring(deleteCount) +
                            value.substring(lineStart + lineText.length);

                        textarea.value = newValue;
                        textarea.selectionStart = textarea.selectionEnd = start - deleteCount;
                    }
                } else {
                    // Tab: 插入缩进
                    textarea.value = value.substring(0, start) + indentChar + value.substring(end);
                    textarea.selectionStart = textarea.selectionEnd = start + indentChar.length;
                }
            }

            // 触发input事件更新v-model
            textarea.dispatchEvent(new Event('input'));
        },

        // 智能检测缩进字符
        detectIndentChar(text) {
            const lines = text.split('\n');
            let tabCount = 0;
            let spaceCount = 0;
            let spaceIndentSize = 0;

            // 分析前100行（或所有行）的缩进模式
            const sampleLines = lines.slice(0, Math.min(100, lines.length));

            sampleLines.forEach(line => {
                if (line.startsWith('\t')) {
                    tabCount++;
                } else if (line.match(/^[ ]+/)) {
                    spaceCount++;
                    const leadingSpacesMatch = line.match(/^([ ]+)/);
                    if (leadingSpacesMatch) {
                        const leadingSpaces = leadingSpacesMatch[1];
                        if (spaceIndentSize === 0) {
                            spaceIndentSize = leadingSpaces.length;
                        } else {
                            // 检测最常见的缩进大小
                            spaceIndentSize = Math.min(spaceIndentSize, leadingSpaces.length);
                        }
                    }
                }
            });

            // 如果Tab使用频率更高，使用Tab
            if (tabCount > spaceCount) {
                return '\t';
            }

            // 否则使用检测到的空格数量（默认为4）
            return ' '.repeat(Math.max(2, Math.min(8, spaceIndentSize || 4)));
        },

        // 获取行首空白字符
        getLeadingWhitespace(line) {
            const match = line.match(/^(\s*)/);
            return match ? match[1] : '';
        },

        // 计算要删除的缩进字符数
        calculateDeleteCount(leadingSpaces, indentChar) {
            if (indentChar === '\t') {
                // 如果使用Tab缩进，删除一个Tab或4个空格
                if (leadingSpaces.startsWith('\t')) {
                    return 1;
                } else {
                    return Math.min(leadingSpaces.length, 4);
                }
            } else {
                // 如果使用空格缩进，删除一个缩进单位
                return Math.min(leadingSpaces.length, indentChar.length);
            }
        },

        // 判断光标是否在行首或行首空白处
        isAtLineStart(text, position) {
            const lineStart = text.lastIndexOf('\n', position - 1) + 1;
            const beforeCursor = text.substring(lineStart, position);
            return /^\s*$/.test(beforeCursor);
        },

        // 处理多行缩进（增强版）
        processMultiLineIndentation(lines, startLine, endLine, indentChar, isReverse) {
            let newStart, newEnd;
            let startOffset = 0;
            let endOffset = 0;

            for (let i = startLine; i <= endLine; i++) {
                const line = lines[i];

                if (isReverse) {
                    // 反向缩进：删除行首的缩进
                    const leadingSpaces = this.getLeadingWhitespace(line);

                    if (leadingSpaces.length > 0) {
                        const deleteCount = this.calculateDeleteCount(leadingSpaces, indentChar);
                        lines[i] = line.substring(deleteCount);

                        if (i === startLine) startOffset = -deleteCount;
                        if (i === endLine) endOffset = -deleteCount;
                    }
                } else {
                    // 正向缩进：在行首添加缩进（跳过空行）
                    if (line.trim() !== '') {
                        lines[i] = indentChar + line;
                        if (i === startLine) startOffset = indentChar.length;
                        if (i === endLine) endOffset = indentChar.length;
                    }
                }
            }

            const newValue = lines.join('\n');

            // 计算新的选择范围
            const originalStart = lines.slice(0, startLine).join('\n').length + (startLine > 0 ? 1 : 0);
            const originalEnd = lines.slice(0, endLine + 1).join('\n').length;

            newStart = originalStart + startOffset;
            newEnd = newValue.length - (lines.slice(endLine + 1).join('\n').length + (endLine < lines.length - 1 ? 1 : 0)) + endOffset;

            return { newValue, newStart, newEnd };
        },

        // 高亮代码（点击引用代码时触发）
        highlightCode(comment) {
            console.log('[CodeView] 高亮代码:', comment);

            if (comment && comment.rangeInfo) {
                // 触发代码高亮事件
                window.dispatchEvent(new CustomEvent('highlightCodeLines', {
                    detail: {
                        fileKey: comment.fileKey,
                        rangeInfo: comment.rangeInfo,
                        _forwarded: true // 标记为已转发，避免 index.js 重复处理
                    }
                }));
            }
        },
        // 处理评论标记的鼠标事件（悬停预览等）
        handleCommentMarkerMouseEvents(comment, event) {
            if (!comment || !event) return;

            const eventType = event.type;
            console.log('[CodeView] 评论标记鼠标事件:', eventType, comment);

            if (eventType === 'mouseenter') {
                // 显示评论预览提示
                this.showCommentPreview(comment, event);
            } else if (eventType === 'mouseleave') {
                // 隐藏评论预览
                this.hideCommentPreview();
            }
        },

        // 处理评论标记点击事件
        handleCommentMarkerClick(marker, event) {
            if (!marker || !event) return;

            console.log('[CodeView] 评论标记点击:', marker);

            if (!marker.hasMultiple) {
                // 只有一个评论，直接显示详情
                this.showCommentDetail(marker, event);
            } else {
                // 有多个评论，显示选择列表
                this.showCommentSelectMenu(marker, event);
            }
        },

        // 显示评论选择菜单
        showCommentSelectMenu(marker, event) {
            if (!marker || !event) return;

            console.log('[CodeView] 显示评论选择菜单:', marker);

            // 创建临时菜单容器
            const menu = document.createElement('div');
            menu.className = 'comment-select-menu';

            // 计算菜单位置
            const rect = event.target.getBoundingClientRect();
            const position = this.calculateOptimalPreviewPosition(rect);

            menu.style.cssText = `
                    position: fixed;
                    left: ${position.x}px;
                    top: ${position.y}px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-primary);
                    border-radius: 8px;
                    box-shadow: 0 10px 32px rgba(0, 0, 0, 0.16);
                    z-index: 999999;
                    max-width: 300px;
                    max-height: 400px;
                    overflow-y: auto;
                    padding: 8px 0;
                `;

            // 添加标题
            const header = document.createElement('div');
            header.className = 'comment-select-header';
            header.innerHTML = `
                    <div style="padding: 8px 12px; font-size: 12px; font-weight: 600; color: var(--text-primary); border-bottom: 1px solid var(--border-secondary);">
                        <i class="fas fa-comments" style="margin-right: 6px; color: var(--primary);"></i>
                        该行评论 (${marker.count})
                    </div>
                `;
            menu.appendChild(header);

            // 添加评论选项
            marker.allComments.forEach((comment, index) => {
                const item = document.createElement('div');
                item.className = 'comment-select-item';
                item.style.cssText = `
                        padding: 8px 12px;
                        cursor: pointer;
                        border-bottom: 1px solid var(--border-tertiary);
                        transition: background 0.2s ease;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    `;

                const statusColor = this.getStatusColor(comment.status);

                item.innerHTML = `
                        <div class="comment-status-dot" style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColor}; flex-shrink: 0;"></div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 12px; font-weight: 500; color: var(--text-primary); margin-bottom: 2px;">
                                ${comment.author || '匿名用户'}
                                <span style="font-size: 10px; color: var(--text-muted); margin-left: 6px;">
                                    ${this.formatTime(comment.timestamp)}
                                </span>
                            </div>
                            <div style="font-size: 11px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${comment.content ? comment.content.substring(0, 50) + (comment.content.length > 50 ? '...' : '') : '代码评论'}
                            </div>
                        </div>
                    `;

                // 悬停效果
                item.addEventListener('mouseenter', () => {
                    item.style.background = 'var(--hover-bg)';
                });
                item.addEventListener('mouseleave', () => {
                    item.style.background = 'transparent';
                });

                // 点击事件
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showCommentDetail(comment, event);
                    removeMenuSafely();
                });

                menu.appendChild(item);
            });

            // 添加到页面
            document.body.appendChild(menu);

            // 安全移除菜单的函数
            const removeMenuSafely = () => {
                if (menu && menu.parentNode === document.body && !menu.dataset.removed) {
                    menu.dataset.removed = 'true'; // 标记为已移除，防止重复操作
                    try {
                        document.body.removeChild(menu);
                    } catch (error) {
                        console.warn('[CodeView] 菜单移除失败:', error);
                    }
                }
                document.removeEventListener('click', closeMenu);
            };

            // 点击外部关闭菜单
            const closeMenu = (e) => {
                if (menu && !menu.contains(e.target)) {
                    removeMenuSafely();
                }
            };

            setTimeout(() => {
                document.addEventListener('click', closeMenu);
            }, 0);
        },

        // 获取状态对应的颜色
        getStatusColor(status) {
            switch (status) {
                case 'pending':
                    return '#f59e0b'; // warning
                case 'resolved':
                    return '#10b981'; // success
                case 'closed':
                case 'reopened':
                    return '#ef4444'; // error
                default:
                    return '#6366f1'; // primary
            }
        },

        // 获取评论标记的标题
        getCommentMarkerTitle(marker) {
            if (!marker) return '';

            let title = '';

            if (marker.hasMultiple) {
                title = `该行有 ${marker.count} 个评论，点击查看全部`;
            } else {
                title = `${marker.author || '匿名用户'} - ${this.formatTime(marker.timestamp)}`;
            }

            // 如果是跨行评论，添加范围信息
            if (marker.isMultiLine && marker.commentRange) {
                const { start, end } = marker.commentRange;
                title += ` (第${start}-${end}行)`;
            }

            return title;
        },

        // 获取评论标记的图标
        getCommentMarkerIcon(marker) {
            if (!marker) return 'fas fa-comment';

            // 根据标记类型和状态选择图标
            if (marker.hasMultiple) {
                return 'fas fa-comments';
            }

            if (marker.isMultiLine) {
                switch (marker.markerType) {
                    case 'start':
                        return 'fas fa-angle-double-down'; // 开始标记
                    case 'middle':
                        return 'fas fa-minus'; // 中间标记
                    case 'end':
                        return 'fas fa-angle-double-up'; // 结束标记
                    default:
                        return 'fas fa-comment';
                }
            }

            return 'fas fa-comment';
        },
        // 显示评论预览
        showCommentPreview(comment, event) {
            console.log('[CodeView] 显示评论预览:', comment);

            if (!comment || !event) return;

            // 设置预览评论
            this.currentCommentPreview = { ...comment };

            // 智能计算预览弹窗位置
            const rect = event.target.getBoundingClientRect();
            const position = this.calculateOptimalPreviewPosition(rect);
            this.commentPreviewPosition = position;

            // 显示预览弹窗
            this.showCommentPreviewPopup = true;

            console.log('[CodeView] 评论预览已显示，位置:', position);
        },

        // 计算最佳预览弹窗位置
        calculateOptimalPreviewPosition(targetRect) {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const scrollX = window.scrollX || document.documentElement.scrollLeft;
            const scrollY = window.scrollY || document.documentElement.scrollTop;

            // 根据屏幕宽度确定弹窗尺寸
            let popupWidth, popupHeight;
            if (viewportWidth <= 640) {
                popupWidth = Math.min(420, viewportWidth * 0.92); // 小屏幕
                popupHeight = Math.min(400, viewportHeight * 0.7); // 预估高度，考虑视口
            } else if (viewportWidth <= 950) {
                popupWidth = Math.min(500, viewportWidth * 0.88); // 中屏幕
                popupHeight = Math.min(450, viewportHeight * 0.65);
            } else {
                popupWidth = Math.min(550, viewportWidth * 0.8); // 大屏幕
                popupHeight = Math.min(500, viewportHeight * 0.7);
            }

            const padding = 16; // 边距
            const offset = 12; // 与目标元素的距离

            // 计算水平位置（优先右侧）
            let x, y;

            // 尝试在右侧显示
            if (targetRect.right + offset + popupWidth + padding <= viewportWidth) {
                x = targetRect.right + offset;
            }
            // 尝试在左侧显示
            else if (targetRect.left - offset - popupWidth >= padding) {
                x = targetRect.left - offset - popupWidth;
            }
            // 居中显示（当左右都放不下时）
            else {
                x = Math.max(padding, (viewportWidth - popupWidth) / 2);
            }

            // 计算垂直位置（优先与目标垂直居中对齐）
            const targetCenterY = targetRect.top + targetRect.height / 2;
            const idealY = targetCenterY - popupHeight / 2;

            // 检查上下边界，考虑滚动位置
            const topBoundary = scrollY + padding;
            const bottomBoundary = scrollY + viewportHeight - padding;

            if (idealY >= topBoundary && idealY + popupHeight <= bottomBoundary) {
                // 理想位置可用（垂直居中）
                y = idealY;
            } else if (targetRect.bottom + offset + popupHeight <= bottomBoundary) {
                // 在目标下方显示
                y = targetRect.bottom + offset;
            } else if (targetRect.top - offset - popupHeight >= topBoundary) {
                // 在目标上方显示
                y = targetRect.top - offset - popupHeight;
            } else {
                // 调整到可见区域内，优先显示更多内容
                if (targetRect.top > scrollY + viewportHeight / 2) {
                    // 目标在视口下半部分，弹窗向上对齐
                    y = Math.max(topBoundary, bottomBoundary - popupHeight);
                } else {
                    // 目标在视口上半部分，弹窗向下对齐
                    y = Math.min(topBoundary, bottomBoundary - popupHeight);
                }
            }

            // 确保最终位置不会导致弹窗超出视口
            x = Math.max(padding, Math.min(x, viewportWidth - popupWidth - padding));
            y = Math.max(topBoundary, Math.min(y, bottomBoundary - popupHeight));

            return {
                x: Math.round(x),
                y: Math.round(y)
            };
        },

        // 隐藏评论预览
        hideCommentPreview() {
            console.log('[CodeView] 隐藏评论预览');
            this.showCommentPreviewPopup = false;
            this.currentCommentPreview = null;
        },
        // 检查并清除无效的高亮行
        validateAndClearInvalidHighlights(comments) {
            if (!this.highlightedLines || this.highlightedLines.length === 0) {
                return;
            }

            console.log('[CodeView] 检查并清除无效高亮行，当前高亮行:', this.highlightedLines);

            // 获取所有评论涉及的行号
            const commentLines = new Set();
            if (comments && Array.isArray(comments)) {
                comments.forEach(comment => {
                    if (comment.rangeInfo) {
                        const start = parseInt(comment.rangeInfo.startLine) || 1;
                        const end = parseInt(comment.rangeInfo.endLine) || start;
                        for (let i = start; i <= end; i++) {
                            commentLines.add(i);
                        }
                    } else if (comment.line) {
                        // 兼容旧的line字段
                        commentLines.add(parseInt(comment.line) || 1);
                    }
                });
            }

            console.log('[CodeView] 评论涉及的行号:', Array.from(commentLines));

            // 检查当前高亮的行是否还有对应的评论
            const validHighlightedLines = this.highlightedLines.filter(lineNum => {
                const isValid = commentLines.has(lineNum);
                if (!isValid) {
                    console.log(`[CodeView] 行 ${lineNum} 不再有评论，将被清除高亮`);
                }
                return isValid;
            });

            // 如果高亮行有变化，更新高亮状态
            if (validHighlightedLines.length !== this.highlightedLines.length) {
                console.log('[CodeView] 清除无效高亮行，从', this.highlightedLines, '更新为', validHighlightedLines);
                this.highlightedLines = validHighlightedLines;
            }
        },
        clearCommentHighlight(commentKey) {
            if (!commentKey || !this.comments || !Array.isArray(this.comments)) {
                return;
            }

            console.log(`[CodeView] 清除评论 ${commentKey} 对应的高亮行`);

            // 找到要删除的评论
            const commentToDelete = this.comments.find(comment =>
                comment.key === commentKey
            );

            if (!commentToDelete) {
                console.log(`[CodeView] 未找到评论 ${commentKey}`);
                return;
            }

            // 获取评论涉及的行号
            let startLine = null;
            let endLine = null;

            if (commentToDelete.rangeInfo) {
                startLine = parseInt(commentToDelete.rangeInfo.startLine) || 1;
                endLine = parseInt(commentToDelete.rangeInfo.endLine) || startLine;
            } else if (commentToDelete.line) {
                startLine = endLine = parseInt(commentToDelete.line) || 1;
            }

            if (!startLine || !endLine) {
                console.log(`[CodeView] 评论 ${commentKey} 没有有效的行号信息`);
                return;
            }

            console.log(`[CodeView] 评论 ${commentKey} 涉及行号: ${startLine}-${endLine}`);

            // 从高亮行数组中移除这些行号
            const linesToRemove = [];
            for (let i = startLine; i <= endLine; i++) {
                linesToRemove.push(i);
            }

            this.highlightedLines = this.highlightedLines.filter(lineNum => {
                const shouldRemove = linesToRemove.includes(lineNum);
                if (shouldRemove) {
                    console.log(`[CodeView] 移除高亮行 ${lineNum}`);
                }
                return !shouldRemove;
            });

            console.log(`[CodeView] 清除高亮后剩余行:`, this.highlightedLines);
        },
        // 触发文件加载
        triggerFileLoad(file) {
            console.log('[CodeView] 触发文件加载:', file);

            // 检查是否有全局的store可用
            if (window.aicrStore && typeof window.aicrStore.loadFileByKey === 'function') {
                console.log('[CodeView] 使用全局store加载文件');

                // 使用文件的key进行精确加载
                const fileKey = file?.treeKey || file?.path || null;

                if (fileKey) {
                    console.log('[CodeView] 通过store加载文件:', { fileKey });

                    window.aicrStore.loadFileByKey(fileKey)
                        .then((loadedFile) => {
                            if (loadedFile && loadedFile.content) {
                                console.log('[CodeView] 文件加载成功:', loadedFile.name, '内容长度:', loadedFile.content.length);

                                // 更新当前文件对象的内容
                                const currentTreeKey = this.file?.treeKey || this.file?.path || null;
                                if (this.file && currentTreeKey && (currentTreeKey === fileKey)) {
                                    // 使用Vue的响应式API强制更新
                                    const originalFile = this.file;
                                    const updatedFile = { ...originalFile, content: loadedFile.content };

                                    // 强制触发Vue的响应式更新
                                    Object.assign(originalFile, updatedFile);

                                    console.log('[CodeView] 已更新文件内容，当前行数:', this.codeLines.length);

                                    // 强制更新视图
                                    this.$nextTick(() => {
                                        this.$forceUpdate();
                                    });
                                }
                            } else {
                                console.warn('[CodeView] 文件加载失败或无内容');
                            }
                        })
                        .catch((error) => {
                            console.error('[CodeView] 文件加载失败:', error);
                        });
                } else {
                    console.warn('[CodeView] 缺少文件标识信息:', { fileKey });
                }
            } else {
                console.warn('[CodeView] 全局store不可用，无法加载文件');
            }
        },

        // 运行缩进处理测试（开发调试用）
        runIndentationTests() {
            console.log('[CodeView] 运行缩进处理测试');

            const results = [];

            // 测试1：基本行号去除
            const test1 = {
                name: '基本行号去除测试',
                input: `1    function test() {
2        if (condition) {
3            console.log("Hello");
4            return true;
5        }
6        return false;
7    }`,
                expected: 'function test() {\n    if (condition) {\n        console.log("Hello");\n        return true;\n    }\n    return false;\n}'
            };

            const mockSelection1 = {
                toString: () => test1.input,
                isCollapsed: false
            };

            const result1 = this.extractCodeContent(mockSelection1);
            test1.actual = result1;
            test1.passed = result1 === test1.expected;
            results.push(test1);

            // 测试2：Tab缩进检测
            const test2 = {
                name: 'Tab缩进检测测试',
                input: 'function test() {\n\tif (condition) {\n\t\tconsole.log("test");\n\t}\n}',
                expected: '\t'
            };

            const result2 = this.detectIndentChar(test2.input);
            test2.actual = result2;
            test2.passed = result2 === test2.expected;
            results.push(test2);

            // 测试3：空格缩进检测
            const test3 = {
                name: '空格缩进检测测试',
                input: 'function test() {\n    if (condition) {\n        console.log("test");\n    }\n}',
                expected: '    '
            };

            const result3 = this.detectIndentChar(test3.input);
            test3.actual = result3;
            test3.passed = result3 === test3.expected;
            results.push(test3);

            // 测试4：过滤纯数字行测试
            const test4 = {
                name: '过滤纯数字行测试',
                input: `1    function test() {
2        if (condition) {
3            console.log("Hello");
4        }
5    }
6`,
                expected: 'function test() {\n    if (condition) {\n        console.log("Hello");\n    }\n}'
            };

            const mockSelection4 = {
                toString: () => test4.input,
                isCollapsed: false
            };

            const result4 = this.extractCodeContent(mockSelection4);
            test4.actual = result4;
            test4.passed = result4 === test4.expected;
            results.push(test4);

            // 生成测试报告
            const report = results.map(test =>
                `${test.name}: ${test.passed ? '✅ 通过' : '❌ 失败'}\n` +
                `  输入: ${test.input.substring(0, 50)}...\n` +
                `  期望: ${test.expected}\n` +
                `  实际: ${test.actual}\n`
            ).join('\n');

            this.testResults = report;
            console.log('[CodeView] 缩进处理测试完成:', results);

            return results;
        },


    },
    mounted() {
        console.log('[CodeView] 组件挂载');

        // 初始化代码块交互
        this.addCodeBlockInteractions();

        // 添加全局Promise拒绝处理器
        this._unhandledRejectionHandler = (event) => {
            console.error('[CodeView] 未处理的Promise拒绝:', event.reason);
            // 阻止默认行为，避免在控制台显示错误
            event.preventDefault();
        };
        window.addEventListener('unhandledrejection', this._unhandledRejectionHandler);



        // 初始化键盘快捷键
        this.initKeyboardShortcuts();

        // 添加调试方法到全局
        window.debugCodeView = {
            getFileInfo: () => {
                return {
                    file: this.file,
                    hasFile: !!this.file,
                    fileName: this.file?.name,
                    filePath: this.file?.path,
                    fileKey: this.file?.key,
                    hasContent: !!this.file?.content,
                    contentLength: this.file?.content?.length || 0,
                    codeLinesCount: this.codeLines.length,
                    codeLines: this.codeLines.slice(0, 5) // 只显示前5行
                };
            },
            forceUpdate: () => {
                console.log('[CodeView] 强制更新视图');
                this.$forceUpdate();
            },
            reloadFile: () => {
                const treeKey = this.file?.treeKey || this.file?.path;
                if (this.file && treeKey) {
                    console.log('[CodeView] 重新加载文件:', this.file.name);
                    this.triggerFileLoad(this.file);
                } else {
                    console.warn('[CodeView] 无法重新加载文件，缺少key');
                }
            },
            // 测试缩进处理功能
            testIndentation: () => {
                console.log('[CodeView] 测试缩进处理功能');

                // 模拟选择文本（包含行号和缩进）
                const testText = `1    function test() {
2        if (condition) {
3            console.log("Hello");
4            return true;
5        }
6        return false;
7    }`;

                // 创建模拟的selection对象
                const mockSelection = {
                    toString: () => testText,
                    isCollapsed: false
                };

                // 测试提取代码内容
                const result = this.extractCodeContent(mockSelection);
                console.log('[CodeView] 缩进处理测试结果:', {
                    原始文本: testText,
                    处理后: result,
                    保留缩进: result.split('\n').some(line => line.startsWith(' ') || line.startsWith('\t')),
                    行数: result.split('\n').length
                });

                return result;
            },

        };

        // 监听全局高亮事件
        this._hlListener = (e) => this.handleHighlightEvent(e.detail);
        window.addEventListener('highlightCodeLines', this._hlListener);

        // 监听ESC键事件，清除高亮
        this._escListener = (e) => {
            if (e.key === 'Escape') {
                console.log('[CodeView] 收到ESC键事件，清除高亮');
                this.clearHighlight();
            }
        };
        window.addEventListener('keydown', this._escListener);

        // 监听清除高亮事件
        this._clearHighlightListener = () => {
            console.log('[CodeView] 收到清除高亮事件');
            this.clearHighlight();
        };
        window.addEventListener('clearCodeHighlight', this._clearHighlightListener);

        // 监听清除评论高亮事件
        this._clearCommentHighlightListener = (e) => {
            console.log('[CodeView] 收到清除评论高亮事件:', e.detail);
            if (e.detail && e.detail.commentId) {
                this.clearCommentHighlight(e.detail.commentId);
            }
        };
        window.addEventListener('clearCommentHighlight', this._clearCommentHighlightListener);

        // 延迟处理挂起的评论Key，确保评论数据已加载
        this.$nextTick(() => {
            setTimeout(() => {
                this.handlePendingCommentKey();
            }, 500);
        });

        // 监听窗口尺寸变化，重新计算预览弹窗位置
        this._resizeListener = () => {
            if (this.showCommentPreviewPopup && this.currentCommentPreview) {
                // 延迟重新计算位置，避免频繁计算
                clearTimeout(this._resizeTimer);
                this._resizeTimer = setTimeout(() => {
                    // 尝试获取原始目标元素重新计算位置
                    const markers = document.querySelectorAll('.comment-marker');
                    for (const marker of markers) {
                        if (marker.dataset.commentKey === this.currentCommentPreview.key) {
                            const rect = marker.getBoundingClientRect();
                            const newPosition = this.calculateOptimalPreviewPosition(rect);
                            this.commentPreviewPosition = newPosition;
                            break;
                        }
                    }
                }, 150);
            }
        };
        window.addEventListener('resize', this._resizeListener);

        // 监听选择变化
        this._selListener = () => {
            console.log('[CodeView] 选择变化事件触发');
            this.onSelectionChange();
        };
        document.addEventListener('selectionchange', this._selListener);

        // 鼠标松开/键盘选择后也尝试显示按钮（修复部分浏览器不触发 selectionchange 或触发时机问题）
        this._mouseupListener = (e) => {
            console.log('[CodeView] 鼠标松开事件触发');
            // 延迟执行以确保选择已完成
            setTimeout(() => this.onSelectionChange(), 10);
        };
        this._keyupListener = (e) => {
            // 方向键/Shift等键参与的选择
            const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];
            if (e && (e.shiftKey || keys.includes(e.key))) {
                console.log('[CodeView] 键盘选择事件触发');
                setTimeout(() => this.onSelectionChange(), 10);
            }
        };
        document.addEventListener('mouseup', this._mouseupListener, true);
        document.addEventListener('keyup', this._keyupListener, true);

        // 滚动/窗口变化时隐藏按钮，避免错位
        this._scrollListener = () => {
            if (this._buttonVisible) {
                console.log('[CodeView] 滚动/调整窗口，隐藏按钮');
                this.hideSelectionButton();
            }
        };
        window.addEventListener('scroll', this._scrollListener, { passive: true, capture: true });
        window.addEventListener('resize', this._scrollListener, { passive: true });

        // 确保组件内有容器
        this.$nextTick(() => {
            if (this.$el) {
                const codeContent = this.$el.querySelector('.code-content');
                if (codeContent) {
                    let container = codeContent.querySelector('#comment-action-container');
                    if (!container) {
                        container = document.createElement('div');
                        container.id = 'comment-action-container';
                        container.style.position = 'fixed';
                        container.style.zIndex = '999997';
                        container.style.display = 'none';
                        codeContent.appendChild(container);
                        console.log('[CodeView] 创建了组件内评论按钮容器');
                    }
                }
            }
        });
    },
    beforeUnmount() {
        // 清理编辑评论事件监听器
        if (this._openEditCommentListener) {
            window.removeEventListener('openEditCommentModal', this._openEditCommentListener);
            this._openEditCommentListener = null;
        }

        // 清理Promise拒绝处理器
        if (this._unhandledRejectionHandler) {
            window.removeEventListener('unhandledrejection', this._unhandledRejectionHandler);
            this._unhandledRejectionHandler = null;
        }

        // 修复：使用正确的变量名 _resizeListener（与 mounted 中注册时一致）
        if (this._resizeListener) {
            window.removeEventListener('resize', this._resizeListener);
            this._resizeListener = null;
        }

        // 清理定时器
        if (this._resizeTimer) {
            clearTimeout(this._resizeTimer);
            this._resizeTimer = null;
        }

        // 清理 ESC 键监听器
        if (this._escListener) {
            window.removeEventListener('keydown', this._escListener);
            this._escListener = null;
        }

        // 清理选择变化监听器
        if (this._selListener) {
            document.removeEventListener('selectionchange', this._selListener);
            this._selListener = null;
        }

        // 清理鼠标松开监听器
        if (this._mouseupListener) {
            document.removeEventListener('mouseup', this._mouseupListener, true);
            this._mouseupListener = null;
        }

        // 清理键盘松开监听器
        if (this._keyupListener) {
            document.removeEventListener('keyup', this._keyupListener, true);
            this._keyupListener = null;
        }

        // 清理滚动/窗口调整监听器
        if (this._scrollListener) {
            window.removeEventListener('scroll', this._scrollListener, { capture: true });
            window.removeEventListener('resize', this._scrollListener);
            this._scrollListener = null;
        }

        if (this._hlListener) {
            window.removeEventListener('highlightCodeLines', this._hlListener);
            this._hlListener = null;
        }
        if (this._clearHighlightListener) {
            window.removeEventListener('clearCodeHighlight', this._clearHighlightListener);
            this._clearHighlightListener = null;
        }
        if (this._reloadCommentsListener) {
            window.removeEventListener('reloadComments', this._reloadCommentsListener);
            this._reloadCommentsListener = null;
        }
        if (this._clearCommentHighlightListener) {
            window.removeEventListener('clearCommentHighlight', this._clearCommentHighlightListener);
            this._clearCommentHighlightListener = null;
        }
    },
};

// 初始化组件并全局暴露
(async function initComponent() {
    try {
        const CodeView = await defineComponent(componentOptions);
        window.CodeView = CodeView;
        // 触发自定义事件，通知组件已加载完成
        window.dispatchEvent(new CustomEvent('CodeViewLoaded', { detail: CodeView }));
        console.log('[CodeView] 组件初始化完成');
    } catch (error) {
        console.error('CodeView 组件初始化失败:', error);

        // 创建错误恢复组件
        const ErrorRecoveryComponent = {
            name: 'CodeViewErrorRecovery',
            template: `
                <div class="code-view-error-recovery" style="padding: 20px; text-align: center; color: #dc3545;">
                    <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 30px; max-width: 500px; margin: 0 auto;">
                        <h3 style="color: #dc3545; margin-bottom: 20px;">
                            <i class="fas fa-exclamation-triangle" style="margin-right: 10px;"></i>
                            代码查看器加载失败
                        </h3>
                        <p style="margin-bottom: 20px; color: #6c757d;">
                            代码查看组件在初始化过程中遇到了问题。这可能是由于浏览器扩展冲突或网络问题导致的。
                        </p>
                        <div style="background: #fff; border: 1px solid #e9ecef; border-radius: 4px; padding: 15px; margin: 20px 0; text-align: left;">
                            <strong>错误信息:</strong><br>
                            <code style="color: #dc3545; font-size: 12px; word-break: break-all;">${error.message || error}</code>
                        </div>
                        <div style="margin-top: 20px;">
                            <button onclick="window.location.reload()" 
                                    style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px; font-size: 14px;">
                                <i class="fas fa-redo" style="margin-right: 5px;"></i>
                                重新加载
                            </button>
                            <button onclick="retryCodeViewInit()" 
                                    style="padding: 12px 24px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                                <i class="fas fa-sync" style="margin-right: 5px;"></i>
                                重试初始化
                            </button>
                        </div>
                        <div style="margin-top: 20px; font-size: 12px; color: #6c757d;">
                            <p>如果问题持续存在，请尝试：</p>
                            <ul style="text-align: left; display: inline-block;">
                                <li>禁用浏览器扩展后重新加载</li>
                                <li>清除浏览器缓存</li>
                                <li>检查网络连接</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `,
            methods: {
                retryInit() {
                    console.log('[CodeView] 尝试重新初始化组件');
                    window.location.reload();
                }
            }
        };

        // 暴露错误恢复组件
        window.CodeViewErrorRecovery = ErrorRecoveryComponent;

        // 暴露重试函数
        window.retryCodeViewInit = async function () {
            try {
                console.log('[CodeView] 开始重试初始化');
                const CodeView = await defineComponent(componentOptions);
                window.CodeView = CodeView;
                window.dispatchEvent(new CustomEvent('CodeViewLoaded', { detail: CodeView }));
                console.log('[CodeView] 重试初始化成功');

                // 通知父组件重新渲染
                window.dispatchEvent(new CustomEvent('CodeViewRetrySuccess'));
            } catch (retryError) {
                console.error('[CodeView] 重试初始化失败:', retryError);
                alert('重试失败，请刷新页面');
            }
        };

        // 触发错误事件
        window.dispatchEvent(new CustomEvent('CodeViewInitFailed', {
            detail: { error, recoveryComponent: ErrorRecoveryComponent }
        }));
    }
})();
