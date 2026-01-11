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
        emits: ['comment-delete', 'comment-resolve', 'comment-reopen', 'reload-comments'],
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
                // 划词评论与手动Markdown弹框
                showManualImprovementModal: false,
                manualCommentText: '',
                manualPreviewCollapsed: false,
                manualMaxLength: 4000,
                manualCommentError: '',
                manualSubmitting: false,
                lastSelectionText: '',
                lastSelectionRange: null, // 用于评论定位，不在界面显示
                _containerHover: false,
                _lastShowTs: 0,
                _buttonVisible: false,
                
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
            };
        },
        watch: {
            // 监听文件变化，清除高亮并处理文件加载
            file: {
                handler(newFile, oldFile) {
                    // 当文件变化时，清除之前的高亮
                    if (newFile !== oldFile) {
                        console.log('[CodeView] 文件变化，清除高亮');
                        this.clearHighlight();
                        
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
            canSubmitManualComment() {
                try {
                    const len = (this.manualCommentText || '').trim().length;
                    return len > 0 && len <= this.manualMaxLength;
                } catch (error) {
                    console.error('[CodeView] canSubmitManualComment计算失败:', error);
                    return false;
                }
            },
            manualCommentPreviewHtml() {
                try {
                    return this.renderMarkdown(this.manualCommentText || '');
                } catch (error) {
                    console.error('[CodeView] manualCommentPreviewHtml计算失败:', error);
                    return '';
                }
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
            
            // 添加目录导航
            addTableOfContents() {
                const content = this.$el.querySelector('.markdown-preview-content');
                if (!content) return;
                
                const headings = content.querySelectorAll('h1, h2, h3, h4, h5, h6');
                if (headings.length === 0) return;
                
                // 创建目录
                const toc = document.createElement('div');
                toc.className = 'md-toc';
                toc.innerHTML = `
                    <div class="md-toc-header">
                        <h4>目录</h4>
                        <button type="button" class="md-toc-toggle" onclick="this.parentElement.parentElement.classList.toggle('collapsed')">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                    <div class="md-toc-content"></div>
                `;
                
                const tocContent = toc.querySelector('.md-toc-content');
                headings.forEach((heading, index) => {
                    const id = `heading-${index}`;
                    heading.id = id;
                    
                    const level = parseInt(heading.tagName.charAt(1));
                    const item = document.createElement('div');
                    item.className = `md-toc-item level-${level}`;
                    item.innerHTML = `<a href="#${id}" class="md-toc-link">${heading.textContent}</a>`;
                    tocContent.appendChild(item);
                });
                
                // 插入到内容前面
                content.insertBefore(toc, content.firstChild);
            },
            
            // 添加代码高亮
            addCodeHighlighting() {
                const codeBlocks = this.$el.querySelectorAll('.md-code-block code');
                codeBlocks.forEach(block => {
                    const language = block.className.match(/language-(\w+)/);
                    if (language) {
                        this.highlightCodeBlock(block, language[1]);
                    }
                });
            },
            
            // 代码块高亮处理
            highlightCodeBlock(block, language) {
                // 简单的语法高亮实现
                const code = block.textContent;
                let highlighted = code;
                
                // 根据语言进行不同的高亮处理
                switch (language.toLowerCase()) {
                    case 'javascript':
                    case 'js':
                        highlighted = this.highlightJavaScript(code);
                        break;
                    case 'typescript':
                    case 'ts':
                        highlighted = this.highlightTypeScript(code);
                        break;
                    case 'python':
                    case 'py':
                        highlighted = this.highlightPython(code);
                        break;
                    case 'css':
                        highlighted = this.highlightCSS(code);
                        break;
                    case 'scss':
                    case 'sass':
                        highlighted = this.highlightSCSS(code);
                        break;
                    case 'html':
                    case 'xml':
                        highlighted = this.highlightHTML(code);
                        break;
                    case 'json':
                        highlighted = this.highlightJSON(code);
                        break;
                    case 'yaml':
                    case 'yml':
                        highlighted = this.highlightYAML(code);
                        break;
                    case 'bash':
                    case 'shell':
                    case 'sh':
                        highlighted = this.highlightBash(code);
                        break;
                    case 'sql':
                        highlighted = this.highlightSQL(code);
                        break;
                    case 'java':
                        highlighted = this.highlightJava(code);
                        break;
                    case 'cpp':
                    case 'c++':
                        highlighted = this.highlightCpp(code);
                        break;
                    case 'c':
                        highlighted = this.highlightC(code);
                        break;
                    case 'go':
                        highlighted = this.highlightGo(code);
                        break;
                    case 'rust':
                        highlighted = this.highlightRust(code);
                        break;
                    case 'php':
                        highlighted = this.highlightPHP(code);
                        break;
                    case 'ruby':
                        highlighted = this.highlightRuby(code);
                        break;
                    case 'swift':
                        highlighted = this.highlightSwift(code);
                        break;
                    case 'kotlin':
                        highlighted = this.highlightKotlin(code);
                        break;
                    case 'dart':
                        highlighted = this.highlightDart(code);
                        break;
                    case 'markdown':
                    case 'md':
                        highlighted = this.highlightMarkdown(code);
                        break;
                    default:
                        highlighted = this.highlightGeneric(code);
                }
                
                block.innerHTML = highlighted;
            },
            
            // JavaScript语法高亮
            highlightJavaScript(code) {
                return code
                    .replace(/\b(function|const|let|var|if|else|for|while|return|class|import|export|from|async|await)\b/g, '<span class="md-keyword">$1</span>')
                    .replace(/\b(true|false|null|undefined)\b/g, '<span class="md-literal">$1</span>')
                    .replace(/"([^"]*)"/g, '<span class="md-string">"$1"</span>')
                    .replace(/'([^']*)'/g, '<span class="md-string">\'$1\'</span>')
                    .replace(/\/\/.*$/gm, '<span class="md-comment">$&</span>')
                    .replace(/\/\*[\s\S]*?\*\//g, '<span class="md-comment">$&</span>');
            },
            
            // Python语法高亮
            highlightPython(code) {
                return code
                    .replace(/\b(def|class|if|elif|else|for|while|import|from|return|yield|lambda|with|as|try|except|finally|raise|assert|pass|break|continue)\b/g, '<span class="md-keyword">$1</span>')
                    .replace(/\b(True|False|None)\b/g, '<span class="md-literal">$1</span>')
                    .replace(/"([^"]*)"/g, '<span class="md-string">"$1"</span>')
                    .replace(/'([^']*)'/g, '<span class="md-string">\'$1\'</span>')
                    .replace(/#.*$/gm, '<span class="md-comment">$&</span>');
            },
            
            // CSS语法高亮
            highlightCSS(code) {
                return code
                    .replace(/([.#]?[a-zA-Z-]+)\s*\{/g, '<span class="md-selector">$1</span> {')
                    .replace(/([a-zA-Z-]+)\s*:/g, '<span class="md-property">$1</span>:')
                    .replace(/([a-zA-Z-]+)\s*;/g, '<span class="md-value">$1</span>;')
                    .replace(/\/\*[\s\S]*?\*\//g, '<span class="md-comment">$&</span>');
            },
            
            // HTML语法高亮
            highlightHTML(code) {
                return code
                    .replace(/&lt;(\/?[a-zA-Z][^&]*?)&gt;/g, '<span class="md-tag">&lt;$1&gt;</span>')
                    .replace(/([a-zA-Z-]+)=/g, '<span class="md-attribute">$1</span>=')
                    .replace(/"([^"]*)"/g, '<span class="md-string">"$1"</span>')
                    .replace(/'([^']*)'/g, '<span class="md-string">\'$1\'</span>');
            },
            
            // TypeScript语法高亮
            highlightTypeScript(code) {
                return code
                    .replace(/\b(function|const|let|var|if|else|for|while|return|class|import|export|from|async|await|interface|type|enum|namespace|module|declare|public|private|protected|static|readonly|abstract|extends|implements)\b/g, '<span class="md-keyword">$1</span>')
                    .replace(/\b(true|false|null|undefined)\b/g, '<span class="md-literal">$1</span>')
                    .replace(/"([^"]*)"/g, '<span class="md-string">"$1"</span>')
                    .replace(/'([^']*)'/g, '<span class="md-string">\'$1\'</span>')
                    .replace(/`([^`]*)`/g, '<span class="md-string">`$1`</span>')
                    .replace(/\/\/.*$/gm, '<span class="md-comment">$&</span>')
                    .replace(/\/\*[\s\S]*?\*\//g, '<span class="md-comment">$&</span>')
                    .replace(/\b\d+\.?\d*\b/g, '<span class="md-number">$&</span>')
                    .replace(/\b[A-Z][a-zA-Z0-9]*\b/g, '<span class="md-type">$&</span>');
            },
            
            // JSON语法高亮
            highlightJSON(code) {
                return code
                    .replace(/"([^"]*)"\s*:/g, '<span class="md-property">"$1"</span>:')
                    .replace(/"([^"]*)"/g, '<span class="md-string">"$1"</span>')
                    .replace(/\b(true|false|null)\b/g, '<span class="md-literal">$1</span>')
                    .replace(/\b\d+\.?\d*\b/g, '<span class="md-number">$1</span>');
            },
            
            // YAML语法高亮
            highlightYAML(code) {
                return code
                    .replace(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm, '$1<span class="md-property">$2</span>:')
                    .replace(/"([^"]*)"/g, '<span class="md-string">"$1"</span>')
                    .replace(/'([^']*)'/g, '<span class="md-string">\'$1\'</span>')
                    .replace(/\b(true|false|null|~)\b/g, '<span class="md-literal">$1</span>')
                    .replace(/\b\d+\.?\d*\b/g, '<span class="md-number">$&</span>')
                    .replace(/#.*$/gm, '<span class="md-comment">$&</span>');
            },
            
            // Bash语法高亮
            highlightBash(code) {
                return code
                    .replace(/\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|break|continue|exit)\b/g, '<span class="md-keyword">$1</span>')
                    .replace(/\b(true|false)\b/g, '<span class="md-literal">$1</span>')
                    .replace(/"([^"]*)"/g, '<span class="md-string">"$1"</span>')
                    .replace(/'([^']*)'/g, '<span class="md-string">\'$1\'</span>')
                    .replace(/\$[a-zA-Z_][a-zA-Z0-9_]*/g, '<span class="md-variable">$&</span>')
                    .replace(/#.*$/gm, '<span class="md-comment">$&</span>');
            },
            
            // SQL语法高亮
            highlightSQL(code) {
                return code
                    .replace(/\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TABLE|INDEX|VIEW|DATABASE|SCHEMA|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|HAVING|UNION|DISTINCT|LIMIT|OFFSET|AS|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|IS|NULL|TRUE|FALSE)\b/gi, '<span class="md-keyword">$1</span>')
                    .replace(/"([^"]*)"/g, '<span class="md-string">"$1"</span>')
                    .replace(/'([^']*)'/g, '<span class="md-string">\'$1\'</span>')
                    .replace(/\b\d+\.?\d*\b/g, '<span class="md-number">$&</span>')
                    .replace(/--.*$/gm, '<span class="md-comment">$&</span>')
                    .replace(/\/\*[\s\S]*?\*\//g, '<span class="md-comment">$&</span>');
            },
            
            // 通用语法高亮
            highlightGeneric(code) {
                return code
                    .replace(/"([^"]*)"/g, '<span class="md-string">"$1"</span>')
                    .replace(/'([^']*)'/g, '<span class="md-string">\'$1\'</span>')
                    .replace(/\b\d+\.?\d*\b/g, '<span class="md-number">$&</span>');
            },
            
            // 添加图片灯箱效果（带懒加载）
            addImageLightbox() {
                const images = this.$el.querySelectorAll('.md-image');
                
                // 使用Intersection Observer进行懒加载
                if ('IntersectionObserver' in window) {
                    const imageObserver = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                const img = entry.target;
                                img.style.cursor = 'pointer';
                                img.addEventListener('click', () => {
                                    this.showImageLightbox(img.src, img.alt);
                                });
                                imageObserver.unobserve(img);
                            }
                        });
                    }, { rootMargin: '50px' });
                    
                    // 安全地观察每个图片元素
                    images.forEach(img => {
                        if (img && img instanceof Node) {
                            imageObserver.observe(img);
                        }
                    });
                } else {
                    // 降级处理
                    images.forEach(img => {
                        if (img && img instanceof HTMLElement) {
                            img.style.cursor = 'pointer';
                            img.addEventListener('click', () => {
                                this.showImageLightbox(img.src, img.alt);
                            });
                        }
                    });
                }
            },
            
            // 显示图片灯箱
            showImageLightbox(src, alt) {
                const lightbox = document.createElement('div');
                lightbox.className = 'md-lightbox';
                lightbox.innerHTML = `
                    <div class="md-lightbox-content">
                        <img src="${src}" alt="${alt}" class="md-lightbox-image">
                        <button class="md-lightbox-close" onclick="this.parentElement.parentElement.remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                document.body.appendChild(lightbox);
            },
            
            // 添加平滑滚动
            addSmoothScrolling() {
                const links = this.$el.querySelectorAll('.md-toc-link');
                links.forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const targetId = link.getAttribute('href').substring(1);
                        const target = document.getElementById(targetId);
                        if (target) {
                            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    });
                });
            },
            
            // 性能监控
            measurePerformance(name, fn) {
                const start = performance.now();
                const result = fn();
                const end = performance.now();
                console.log(`[MD Preview] ${name}: ${(end - start).toFixed(2)}ms`);
                return result;
            },
            
            // 清理资源
            cleanup() {
                if (this.interactionTimeout) {
                    clearTimeout(this.interactionTimeout);
                }
                
                // 清理事件监听器
                const images = this.$el.querySelectorAll('.md-image');
                images.forEach(img => {
                    img.removeEventListener('click', this.showImageLightbox);
                });
                
                // 清理缓存
                if (this.markdownCache) {
                    this.markdownCache = {};
                }
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
                        this.bindEventListeners();
                        this.addSmoothScrolling();
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
                this.scrollToCommentPosition(lineNumber, null);
                
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
                    
                    // 为表格添加折叠功能
                    this.addCollapseToTables();
                    
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
                            console.log('[CodeView] 代码块已复制到剪贴板');
                            // 可以添加成功提示
                        }).catch(err => {
                            console.error('[CodeView] 复制失败:', err);
                            // 降级到传统复制方法
                            this.fallbackCopyToClipboard(code);
                        });
                    } else {
                        // 降级到传统复制方法
                        this.fallbackCopyToClipboard(code);
                    }
                }
            },
            
            // 降级复制方法
            fallbackCopyToClipboard(text) {
                try {
                    const textArea = document.createElement('textarea');
                    textArea.value = text;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    textArea.style.top = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    
                    if (successful) {
                        console.log('[CodeView] 代码块已复制到剪贴板（降级方法）');
                    } else {
                        console.error('[CodeView] 复制失败（降级方法）');
                    }
                } catch (err) {
                    console.error('[CodeView] 复制失败（降级方法）:', err);
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
            
            // 切换内容折叠/展开
            toggleContentCollapse(element) {
                if (element) {
                    element.classList.toggle('collapsed');
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
                    
                    // 构建跳转URL，传递文件信息
                    const params = new URLSearchParams({
                        key: this.file.key || this.file.name || this.file.path,
                        fileName: this.file.name || this.file.path || '',
                        filePath: this.file.path || this.file.name || ''
                    });
                    
                    // 如果文件有 key 信息，也传递过去（用于精确查找）
                    if (this.file.key) {
                        params.set('fileKey', this.file.key);
                    }
                    
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
                        if (ta) ta.focus();
                    });
                } catch (_) {}
            },
            cancelEditFile() {
                this.isEditingFile = false;
                this.editingFileContent = '';
                this.saveError = '';
            },
            async saveEditedFile() {
                if (!this.file) return;
                const content = String(this.editingFileContent ?? '');
                if (content === (this.file.content || '')) {
                    this.isEditingFile = false;
                    return;
                }
                this.editSaving = true;
                this.saveError = '';
                try {
                    // 获取文件路径
                    const targetFile = this.file.path || this.file.key;
                    
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
                            const idx = store.files.value.findIndex(f => {
                                return f.key === this.file.key || f.path === this.file.path;
                            });
                            if (idx >= 0) {
                                const prev = store.files.value[idx];
                                store.files.value[idx] = { ...prev, content };
                            }
                        }
                    } catch (_) {}

                    this.isEditingFile = false;
                    this.editingFileContent = '';
                    this.saveError = '';
                    
                    // 发射文件保存成功事件
                    this.$emit('file-saved', {
                        fileKey: this.file.key,
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
                } catch (_) {}
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
                    
                    // 后处理：添加自定义样式类和行号信息
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
                
                // 为表格添加折叠功能 - 默认展开
                html = html.replace(/<table>/g, '<div class="md-table-wrapper"><table>');
                html = html.replace(/<\/table>/g, '</table><button class="collapse-toggle" onclick="this.parentElement.classList.toggle(\'collapsed\')"><i class="fas fa-chevron-up"></i> 折叠表格</button></div>');
                
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
            
            // 为表格添加折叠功能 - 默认展开
            addCollapseToTables() {
                const tableWrappers = this.$el?.querySelectorAll('.md-table-wrapper');
                tableWrappers?.forEach(wrapper => {
                    const toggleBtn = wrapper.querySelector('.collapse-toggle');
                    if (toggleBtn) {
                        // 确保初始状态是展开的（没有 collapsed 类）
                        if (!wrapper.classList.contains('collapsed')) {
                            toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i> 折叠表格';
                        }
                        
                        toggleBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            const isCollapsed = wrapper.classList.contains('collapsed');
                            if (isCollapsed) {
                                wrapper.classList.remove('collapsed');
                                toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i> 折叠表格';
                            } else {
                                wrapper.classList.add('collapsed');
                                toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i> 展开表格';
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
                
                // 查找 mermaid 代码块
                const mermaidRegex = /<pre class="md-code-block"[^>]*>\s*<code class="language-mermaid">([\s\S]*?)<\/code>\s*<\/pre>/g;
                
                let processedHtml = html;
                let match;
                let diagramIndex = 0;
                
                while ((match = mermaidRegex.exec(html)) !== null) {
                    // 解码 HTML 实体并清理代码
                    let mermaidCode = match[1];
                    
                    // 解码 HTML 实体
                    mermaidCode = this.unescapeHtml(mermaidCode);
                    
                    // 清理代码：保留必要的换行，只移除多余的空白
                    mermaidCode = mermaidCode
                        .trim()
                        .replace(/[ \t]+$/gm, '') // 只移除每行末尾的空格和制表符，保留换行
                        .replace(/\n{3,}/g, '\n\n') // 将多个连续换行替换为最多两个
                        .replace(/^[ \t]+/gm, ''); // 移除每行开头的空格和制表符，但保留换行结构
                    
                    if (!mermaidCode) {
                        console.warn('[CodeView] Mermaid 代码为空，跳过');
                        continue;
                    }
                    
                    const diagramId = `mermaid-diagram-${Date.now()}-${diagramIndex++}`;
                    
                    console.log('[CodeView] 处理 Mermaid 代码:', mermaidCode);
                    
                    // 使用统一的渲染管理器创建图表容器
                    const mermaidContainer = window.mermaidRenderer.createDiagramContainer(diagramId, mermaidCode, {
                        showHeader: true,
                        showActions: true,
                        headerLabel: 'MERMAID 图表',
                        sourceLine: this.getCurrentSourceLine()
                    });
                    
                    // 替换原来的代码块
                    processedHtml = processedHtml.replace(match[0], mermaidContainer);
                }
                
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
                    const range = detail && detail.rangeInfo ? detail.rangeInfo : null;
                    const comment = detail && detail.comment ? detail.comment : null;
                    
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
                    
                    // 不需要自动滚动，仅高亮
                    console.log('[CodeView] 已高亮代码行，不执行滚动');
                    
                }, '处理代码高亮事件');
            },
            
            // 滚动到评论位置并可选择性打开评论详情
            scrollToCommentPosition(startLine, comment = null) {
                // 仅更新高亮行，不再执行滚动查找逻辑
                this.highlightedLines = [];
                if (comment && comment.rangeInfo) {
                    const start = Number(comment.rangeInfo.startLine) || 1;
                    const end = Number(comment.rangeInfo.endLine) || start;
                    for (let i = start; i <= end; i++) {
                        this.highlightedLines.push(i);
                    }
                } else if (startLine) {
                    this.highlightedLines.push(Number(startLine));
                }
                
                console.log('[CodeView] 已高亮位置 (不滚动):', { startLine, comment: comment?.key });
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
                    
                    // 5. 最终清理：移除首尾的空白字符，但保留行内缩进
                    result = result.trim();
                    
                    console.log('[CodeView] 优化文本清理:', {
                        原始行数: lines.length,
                        清理后行数: nonEmptyLines.length,
                        过滤空行和数字行: lines.length - nonEmptyLines.length,
                        清理后: result.substring(0, 100) + (result.length > 100 ? '...' : ''),
                        包含换行符: result.includes('\n'),
                        换行符数量: (result.match(/\n/g) || []).length,
                        最终长度: result.length,
                        保留缩进: result.split('\n').some(line => line.startsWith(' ') || line.startsWith('\t'))
                    });
                    
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
            positionSelectionButton(rect) {
                console.log('[CodeView] 定位评论按钮', rect);
                const container = this.getActionContainer();
                
                // 保存当前选择的文本，防止按钮点击时选区丢失
                const currentSelection = window.getSelection();
                if (currentSelection && !currentSelection.isCollapsed) {
                    // 获取选择的原始文本
                    const rawText = String(currentSelection.toString() || '').trim();
                    
                    // 从选择的文本中提取纯代码内容（去除行号）
                    const cleanText = this.extractCodeContent(currentSelection);
                    
                    // 计算选择范围（用于评论定位）
                    // const currentRange = currentSelection.rangeCount > 0 ? currentSelection.getRangeAt(0) : null;
                    // const rangeInfo = this.getSelectionLineRange(currentRange);
                    
                    // 更新保存的选择信息
                    this.lastSelectionText = cleanText;
                    this.lastSelectionRange = null; // 不再计算行号范围
                    
                    console.log('[CodeView] 在按钮定位时保存选择信息:', {
                        raw: rawText.substring(0, 50) + (rawText.length > 50 ? '...' : ''),
                        clean: cleanText.substring(0, 50) + (cleanText.length > 50 ? '...' : ''),
                        cleanLength: cleanText.length,
                        range: rangeInfo
                    });
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
                
                // 计算位置（避免超出视口边界）
                const padding = 8;
                const vw = window.innerWidth || document.documentElement.clientWidth;
                const vh = window.innerHeight || document.documentElement.clientHeight;
                let left = Math.min(rect.right + padding, vw - 180);
                let top = Math.max(10, Math.min(rect.top, vh - 48));
                
                // 应用样式
                container.style.position = 'fixed';
                container.style.left = `${left}px`;
                container.style.top = `${top}px`;
                container.style.display = 'flex';
                container.style.opacity = '1';
                container.style.pointerEvents = 'auto';
                container.classList.add('visible');
                
                // 记录状态
                this._lastShowTs = Date.now();
                this._buttonVisible = true;
                console.log('[CodeView] 评论按钮已显示', {left, top});
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
                
                // 查询当前选中的评论者
                let selected = [];
                try {
                    window.dispatchEvent(new CustomEvent('getSelectedCommenters', { 
                        detail: { 
                            callback: (arr) => { 
                                selected = Array.isArray(arr) ? arr : [];
                                console.log('[CodeView] 获取到选中的评论者:', selected); 
                            } 
                        } 
                    }));
                } catch (err) {
                    console.error('[CodeView] 获取评论者失败:', err);
                }
                
                // 根据评论者选择状态决定行为
                if (!selected || selected.length === 0) {
                    console.log('[CodeView] 未选择评论者，打开手动评论弹框');
                    this.openManualImprovementModal();
                } else {
                    console.log('[CodeView] 已选择评论者，聚焦评论面板');
                    // 传递划词数据到评论面板
                    window.dispatchEvent(new CustomEvent('focusCommentPanel', {
                        detail: {
                            text: this.lastSelectionText || '',
                            rangeInfo: this.lastSelectionRange || null
                        }
                    }));
                }
            },
            openManualImprovementModal() {
                this.showManualImprovementModal = true;
                this.manualCommentError = '';
                this.$nextTick(() => {
                    try {
                        const ta = this.$el && this.$el.querySelector('.manual-improvement-input');
                        if (ta) ta.focus();
                    } catch (_) {}
                });
            },
            closeManualImprovementModal() {
                this.showManualImprovementModal = false;
                this.manualCommentError = '';
                // 清空选择状态，确保下次打开时重新选择
                this.lastSelectionText = '';
                this.lastSelectionRange = null;
            },
            toggleManualPreviewCollapse() {
                this.manualPreviewCollapsed = !this.manualPreviewCollapsed;
            },
            insertMarkdown(type) {
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
                    this.submitManualImprovement();
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

                    // 验证引用代码
                    console.log('[CodeView] 构建评论数据，引用文本:', this.lastSelectionText);
                    console.log('[CodeView] 构建评论数据，引用范围:', this.lastSelectionRange);
                    
                    // 构建评论数据
                    // text 字段存储引用的代码内容，content 字段存储评论内容
                    let comment = {
                        content,
                        text: this.lastSelectionText || '', // 引用的代码文本存储在 text 中
                        rangeInfo: this.lastSelectionRange, // 用于评论定位（不在界面显示行数）
                        fileKey: this.file ? (this.file.key || this.file.id || this.file.path || this.file.name) : undefined,
                        author: '手动评论',
                        fromSystem: null, // 手动评论没有评论者系统
                        status: 'pending',
                        timestamp: Date.now() // 使用毫秒数
                    };
                    
                    // 规范化评论数据，确保字段一致性
                    if (window.aicrStore && window.aicrStore.normalizeComment) {
                        comment = window.aicrStore.normalizeComment(comment);
                    } else {
                        // 如果没有规范化函数，手动设置字段
                        // 保留 text 字段（引用代码），不要覆盖为 content
                        comment.createdTime = comment.timestamp; // 毫秒数
                        comment.createdAt = comment.timestamp; // 毫秒数
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
                                    comment: comment
                                }
                            }));
                        }
                    }, 500); // 等待评论面板刷新完成

                    hideGlobalLoading();
                    this.closeManualImprovementModal();
                    this.hideSelectionButton();
                    this.manualCommentText = '';
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
                    } catch (_) {}
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
                    } catch (_) {}
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
                        fileKey: this.file ? (this.file.key || this.file.id || this.file.path) : null
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
                    } catch (_) {}
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
                        fileKey: this.file ? this.file.key : null
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
                    } catch (_) {}
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
                            rangeInfo: comment.rangeInfo
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
                    const fileKey = file.key;
                    
                    if (fileKey) {
                        console.log('[CodeView] 通过store加载文件:', { fileKey });
                        
                        window.aicrStore.loadFileByKey(fileKey)
                            .then((loadedFile) => {
                                if (loadedFile && loadedFile.content) {
                                    console.log('[CodeView] 文件加载成功:', loadedFile.name, '内容长度:', loadedFile.content.length);
                                    
                                    // 更新当前文件对象的内容
                                    if (this.file && (this.file.key === fileKey)) {
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
                    if (this.file && this.file.key) {
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
            
            // 监听评论重新加载事件
            this._reloadCommentsListener = (e) => {
                console.log('[CodeView] 收到评论重新加载事件:', e.detail);
                // 触发父组件重新获取评论数据
                this.$emit('reload-comments', e.detail);
            };
            window.addEventListener('reloadComments', this._reloadCommentsListener);
            
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
                const keys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'];
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
            // 清理Promise拒绝处理器
            if (this._unhandledRejectionHandler) {
                window.removeEventListener('unhandledrejection', this._unhandledRejectionHandler);
                this._unhandledRejectionHandler = null;
            }
            
            
            // 清理窗口大小变化监听器
            if (this._resizeHandler) {
                window.removeEventListener('resize', this._resizeHandler);
                this._resizeHandler = null;
            }
            
            // 清理定时器
            if (this._resizeTimer) {
                clearTimeout(this._resizeTimer);
                this._resizeTimer = null;
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
        window.retryCodeViewInit = async function() {
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










