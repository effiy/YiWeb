// 代码查看组件 - 轻量实现，满足组件注册与基本展示需求
import { safeExecute } from '/utils/error.js';
import { loadCSSFiles } from '/utils/baseView.js';

// 自动加载相关的CSS文件（如果存在）
loadCSSFiles([
    '/views/aicr/plugins/codeView/index.css'
]);

// 创建组件定义（使用轻量模板，避免复杂依赖导致初始化失败）
const createCodeView = async () => {
    // 按既有模板结构组织最小可用的显示
    return {
        name: 'CodeView',
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
            }
        },
        emits: ['comment-delete', 'comment-resolve', 'comment-reopen', 'reload-comments'],
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
                editingCommentText: '',
                editingImprovementText: '',
                editingCommentType: '',
                editingCommentStatus: 'pending',
                editingRangeInfo: { startLine: 1, endLine: 1 },
                editingSaving: false
            };
        },
        computed: {
            codeLines() {
                const content = (this.file && typeof this.file.content === 'string') ? this.file.content : '';
                return content.split(/\r?\n/);
            },
            languageType() {
                if (!this.file) return 'text';
                const name = (this.file.path || this.file.name || '').toLowerCase();
                if (name.endsWith('.js')) return 'javascript';
                if (name.endsWith('.ts')) return 'typescript';
                if (name.endsWith('.css')) return 'css';
                if (name.endsWith('.html')) return 'html';
                if (name.endsWith('.json')) return 'json';
                if (name.endsWith('.md')) return 'markdown';
                return 'text';
            },
            canSubmitManualComment() {
                const len = (this.manualCommentText || '').trim().length;
                return len > 0 && len <= this.manualMaxLength;
            },
            manualCommentPreviewHtml() {
                return this.renderMarkdown(this.manualCommentText || '');
            },
            // 按行号分组的评论数据
            lineComments() {
                const result = {};
                if (!this.comments || !Array.isArray(this.comments)) {
                    return result;
                }
                
                this.comments.forEach(comment => {
                    // 从评论的rangeInfo中获取行号信息
                    let startLine = null;
                    let endLine = null;
                    
                    if (comment.rangeInfo) {
                        startLine = comment.rangeInfo.startLine;
                        endLine = comment.rangeInfo.endLine || startLine;
                    } else if (comment.line) {
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
                                key: comment.key || comment.id || comment._id || `comment_${Date.now()}_${Math.random()}`,
                                // 标记这是否为评论的起始行
                                isStartLine: lineNum === start,
                                // 标记这是否为评论的结束行
                                isEndLine: lineNum === end,
                                // 标记评论的总行数范围
                                commentRange: { start, end }
                            });
                        }
                    }
                });
                
                return result;
            },
            // 获取每行的主要评论标记（用于显示）
            lineCommentMarkers() {
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
                            const originalId = comment.key || comment.id || comment._id;
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
            }
        },
        methods: {
            escapeHtml(text) {
                try {
                    return String(text)
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                } catch (_) { return text; }
            },
            // 轻量Markdown渲染（与评论面板一致的简化版）
            renderMarkdown(text) {
                if (!text) return '';
                let html = String(text);
                const escape = (s) => s
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
                html = escape(html);
                html = html.replace(/```([\s\S]*?)```/g, (m, code) => `<pre class="md-code"><code>${code}</code></pre>`);
                html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');
                html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, url) => {
                    const safeUrl = /^https?:\/\//i.test(url) ? url : '';
                    const altText = alt || '';
                    return safeUrl ? `<img src="${safeUrl}" alt="${altText}" class="md-image"/>` : m;
                });
                html = html.replace(/^(#{6})\s*(.+)$/gm, '<h6>$2<\/h6>')
                           .replace(/^(#{5})\s*(.+)$/gm, '<h5>$2<\/h5>')
                           .replace(/^(#{4})\s*(.+)$/gm, '<h4>$2<\/h4>')
                           .replace(/^(#{3})\s*(.+)$/gm, '<h3>$2<\/h3>')
                           .replace(/^(#{2})\s*(.+)$/gm, '<h2>$2<\/h2>')
                           .replace(/^#{1}\s*(.+)$/gm, '<h1>$1<\/h1>');
                html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1<\/strong>');
                html = html.replace(/\*([^*]+)\*/g, '<em>$1<\/em>');
                html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1<\/a>');
                html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2<\/li>')
                           .replace(/(<li>[^<]*<\/li>\n?)+/g, (m) => `<ol>${m.replace(/\n/g, '')}<\/ol>`);
                html = html.replace(/^[-*+]\s+(.+)$/gm, '<li>$1<\/li>')
                           .replace(/(<li>[^<]*<\/li>\n?)+/g, (m) => `<ul>${m.replace(/\n/g, '')}<\/ul>`);
                const blockTags = ['h1','h2','h3','h4','h5','h6','pre','ul','ol','li','blockquote'];
                html = html.split(/\n{2,}/).map(block => {
                    const trimmed = block.trim();
                    if (!trimmed) return '';
                    const isBlock = blockTags.some(tag => new RegExp(`^<${tag}[\\s>]`, 'i').test(trimmed));
                    return isBlock ? trimmed : `<p>${trimmed.replace(/\n/g, '<br/>')}<\/p>`;
                }).join('');
                html = html.replace(/<(ul|ol)>\s*<\/(\1)>/g, '');
                html = html.replace(/(?:^|\n)(https?:[^\s]+\.(?:png|jpe?g|gif|webp|svg))(?:\n|$)/gi, (m, url) => `\n<p><img src="${url}" alt="image" class="md-image"\/><\/p>\n`);
                return html;
            },
            // 响应外部的代码高亮事件（轻量实现：仅记录行号并滚动到视区）
            handleHighlightEvent(detail) {
                return safeExecute(() => {
                    const range = detail && detail.rangeInfo ? detail.rangeInfo : null;
                    if (!range) return;
                    const start = Number(range.startLine) || 1;
                    const end = Number(range.endLine) || start;
                    this.highlightedLines = [];
                    for (let i = start; i <= end; i++) this.highlightedLines.push(i);
                    this.$nextTick(() => {
                        try {
                            const el = this.$el && this.$el.querySelector(`[data-line="${start}"]`);
                            if (el && typeof el.scrollIntoView === 'function') {
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        } catch (_) {}
                    });
                }, '处理代码高亮事件');
            },
            // 从选择对象中提取纯代码内容（去除行号）
            extractCodeContent(selection) {
                try {
                    if (!selection || selection.isCollapsed) return '';
                    
                    // 获取原始选择文本
                    const rawText = selection.toString();
                    
                    // 使用正则表达式去除行号
                    // 行号通常是每行开头的数字，后面跟着空格或制表符
                    const lines = rawText.split('\n');
                    const cleanLines = lines.map(line => {
                        // 移除行首的数字行号（可能包含空格或制表符）
                        return line.replace(/^\s*\d+\s*/, '');
                    });
                    
                    const result = cleanLines.join('\n').trim();
                    
                    console.log('[CodeView] 文本清理:', {
                        原始行数: lines.length,
                        清理后: result.substring(0, 100) + (result.length > 100 ? '...' : '')
                    });
                    
                    return result;
                    
                } catch (error) {
                    console.warn('[CodeView] 提取代码内容失败，使用原始选择:', error);
                    return selection.toString().trim();
                }
            },
            // 获取选中文本对应的行号范围
            getSelectionLineRange(range) {
                try {
                    if (!range) return null;
                    
                    const codeRoot = this.$el && this.$el.querySelector('.code-content');
                    if (!codeRoot) return null;
                    
                    // 查找选区开始和结束位置所在的代码行元素（具有data-line属性的code元素）
                    const findLineElement = (node) => {
                        let current = node;
                        while (current && current !== codeRoot) {
                            // 查找最近的具有data-line属性的元素（通常是code元素）
                            if (current.nodeType === 1 && current.hasAttribute && current.hasAttribute('data-line')) {
                                return current;
                            }
                            // 也检查父元素是否有data-line属性
                            if (current.parentNode && current.parentNode.nodeType === 1 && 
                                current.parentNode.hasAttribute && current.parentNode.hasAttribute('data-line')) {
                                return current.parentNode;
                            }
                            current = current.parentNode;
                        }
                        return null;
                    };
                    
                    // 特殊处理：如果选择的是文本节点，需要找到它所在的代码行
                    const getLineFromTextNode = (container, offset) => {
                        if (!container) return null;
                        
                        // 如果是文本节点，找到包含它的代码行
                        let lineElement = findLineElement(container);
                        if (lineElement) {
                            return parseInt(lineElement.getAttribute('data-line'), 10);
                        }
                        
                        // 备用方案：通过遍历所有代码行来定位
                        const allCodeLines = codeRoot.querySelectorAll('[data-line]');
                        for (let i = 0; i < allCodeLines.length; i++) {
                            const line = allCodeLines[i];
                            if (line.contains(container)) {
                                return parseInt(line.getAttribute('data-line'), 10);
                            }
                        }
                        
                        return null;
                    };
                    
                    const startLine = getLineFromTextNode(range.startContainer, range.startOffset);
                    const endLine = getLineFromTextNode(range.endContainer, range.endOffset);
                    
                    // 如果无法获取行号，返回null
                    if (!startLine && !endLine) {
                        console.warn('[CodeView] 无法获取选择范围的行号', { 
                            startContainer: range.startContainer, 
                            endContainer: range.endContainer 
                        });
                        return null;
                    }
                    
                    // 使用获取到的行号，如果只有一个可用，则两端都使用同一个
                    const finalStartLine = startLine || endLine || 1;
                    const finalEndLine = endLine || startLine || finalStartLine;
                    
                    const result = {
                        startLine: Math.min(finalStartLine, finalEndLine),
                        endLine: Math.max(finalStartLine, finalEndLine),
                        startChar: range.startOffset || 0,
                        endChar: range.endOffset || 0
                    };
                    
                    console.log('[CodeView] 计算得到的行号范围:', result);
                    return result;
                } catch (error) {
                    console.error('[CodeView] 计算行号范围失败:', error);
                    return null;
                }
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
                    const codeRoot = this.$el && this.$el.querySelector('.code-content');
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
                    window.dispatchEvent(new CustomEvent('focusCommentPanel'));
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
                    const { showGlobalLoading, hideGlobalLoading } = await import('/utils/loading.js');
                    showGlobalLoading('正在提交评论...');

                    // 获取项目和版本信息
                    const projectSelect = document.getElementById('projectSelect');
                    const versionSelect = document.getElementById('versionSelect');
                    let projectId = null;
                    let versionId = null;
                    
                    if (projectSelect) {
                        projectId = projectSelect.value;
                    }
                    if (versionSelect) {
                        versionId = versionSelect.value;
                    }

                    // 验证引用代码
                    console.log('[CodeView] 构建评论数据，引用文本:', this.lastSelectionText);
                    console.log('[CodeView] 构建评论数据，引用范围:', this.lastSelectionRange);
                    
                    // 构建评论数据
                    const comment = {
                        content,
                        text: this.lastSelectionText || '', // 引用的代码文本
                        rangeInfo: this.lastSelectionRange, // 用于评论定位（不在界面显示行数）
                        fileId: this.file ? (this.file.fileId || this.file.id || this.file.path || this.file.name) : undefined,
                        projectId,
                        versionId,
                        author: '手动评论',
                        fromSystem: null, // 手动评论没有评论者系统
                        status: 'pending',
                        timestamp: new Date().toISOString()
                    };

                    // 调用API提交评论
                    const { postData } = await import('/apis/modules/crud.js');
                    const result = await postData(`${window.API_URL}/mongodb/?cname=comments`, comment);

                    console.log('[CodeView] 评论提交成功:', result);
                    
                    // 显示成功消息
                    const { showSuccess } = await import('/utils/message.js');
                    showSuccess('评论添加成功');

                    // 通知评论面板刷新
                    window.dispatchEvent(new CustomEvent('reloadComments', { 
                        detail: { 
                            forceReload: true, 
                            showAllComments: false, 
                            immediateReload: true,
                            fileId: comment.fileId
                        } 
                    }));

                    // 延迟后高亮刚添加的评论位置
                    setTimeout(() => {
                        if (comment.rangeInfo && comment.fileId) {
                            console.log('[CodeView] 高亮新添加的评论位置:', comment.rangeInfo);
                            window.dispatchEvent(new CustomEvent('highlightCodeLines', {
                                detail: {
                                    fileId: comment.fileId,
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
                        const { hideGlobalLoading } = await import('/utils/loading.js');
                        hideGlobalLoading();
                    } catch (_) {}
                } finally {
                    // 重置提交状态
                    this.manualSubmitting = false;
                }
            },
            // 获取评论状态对应的CSS类名
            getCommentStatusClass(status) {
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
                this.editingCommentContent = comment.content || '';
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
                this.editingCommentText = '';
                this.editingImprovementText = '';
                this.editingCommentType = '';
                this.editingCommentStatus = 'pending';
                this.editingRangeInfo = { startLine: 1, endLine: 1 };
                this.editingSaving = false;
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
                
                this.editingSaving = true;
                
                try {
                    // 显示全局loading
                    const { showGlobalLoading, hideGlobalLoading } = await import('/utils/loading.js');
                    showGlobalLoading('正在保存评论...');
                    
                    // 获取项目和版本信息
                    const projectSelect = document.getElementById('projectSelect');
                    const versionSelect = document.getElementById('versionSelect');
                    const projectId = projectSelect ? projectSelect.value : null;
                    const versionId = versionSelect ? versionSelect.value : null;
                    
                    // 构建更新数据
                    const updateData = {
                        key: this.currentCommentDetail.key,
                        author: this.editingCommentAuthor.trim(),
                        content: this.editingCommentContent.trim(),
                        text: this.editingCommentText.trim(),
                        improvementText: this.editingImprovementText.trim(),
                        type: this.editingCommentType,
                        status: this.editingCommentStatus,
                        rangeInfo: {
                            startLine: parseInt(this.editingRangeInfo.startLine) || 1,
                            endLine: parseInt(this.editingRangeInfo.endLine) || parseInt(this.editingRangeInfo.startLine) || 1
                        },
                        timestamp: new Date(this.editingCommentTimestamp).toISOString(),
                        projectId,
                        versionId,
                        fileId: this.currentCommentDetail.fileId
                    };
                    
                    console.log('[CodeView] 更新评论数据:', updateData);
                    
                    // 调用API更新评论
                    const { updateData: apiUpdate } = await import('/apis/modules/crud.js');
                    const response = await apiUpdate(`${window.API_URL}/mongodb/?cname=comments`, updateData);
                    
                    console.log('[CodeView] 评论更新成功:', response);
                    
                    // 显示成功消息
                    const { showSuccess } = await import('/utils/message.js');
                    showSuccess('评论保存成功');
                    
                    // 更新当前评论详情
                    this.currentCommentDetail = { ...this.currentCommentDetail, ...updateData };
                    
                    // 退出编辑模式
                    this.isEditingCommentDetail = false;
                    
                    // 触发重新加载评论
                    this.$emit('reload-comments', { 
                        forceReload: true, 
                        fileId: this.currentCommentDetail.fileId,
                        projectId,
                        versionId
                    });
                    
                    hideGlobalLoading();
                    
                } catch (error) {
                    console.error('[CodeView] 保存评论失败:', error);
                    
                    // 显示错误消息
                    try {
                        const { showError } = await import('/utils/message.js');
                        showError('保存评论失败: ' + error.message);
                        const { hideGlobalLoading } = await import('/utils/loading.js');
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
                    const { showGlobalLoading, hideGlobalLoading } = await import('/utils/loading.js');
                    showGlobalLoading('正在删除评论...');
                    
                    // 调用API删除评论
                    const { deleteData } = await import('/apis/modules/crud.js');
                    const response = await deleteData(`${window.API_URL}/mongodb/?cname=comments&key=${commentKey}`);
                    
                    console.log('[CodeView] 评论删除成功:', response);
                    
                    // 显示成功消息
                    const { showSuccess } = await import('/utils/message.js');
                    showSuccess('评论删除成功');
                    
                    // 隐藏详情弹窗
                    this.hideCommentDetail();
                    
                    // 触发重新加载评论
                    this.$emit('reload-comments', { 
                        forceReload: true, 
                        fileId: this.file ? (this.file.fileId || this.file.id || this.file.path) : null
                    });
                    
                    hideGlobalLoading();
                    
                } catch (error) {
                    console.error('[CodeView] 删除评论失败:', error);
                    
                    // 显示错误消息
                    try {
                        const { showError } = await import('/utils/message.js');
                        showError('删除评论失败: ' + error.message);
                        const { hideGlobalLoading } = await import('/utils/loading.js');
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
                    const { showGlobalLoading, hideGlobalLoading } = await import('/utils/loading.js');
                    showGlobalLoading('正在更新评论状态...');
                    
                    // 获取项目和版本信息
                    const projectSelect = document.getElementById('projectSelect');
                    const versionSelect = document.getElementById('versionSelect');
                    const projectId = projectSelect ? projectSelect.value : null;
                    const versionId = versionSelect ? versionSelect.value : null;
                    
                    // 构建更新数据
                    const updateData = {
                        key: commentKey,
                        status: newStatus,
                        projectId,
                        versionId
                    };
                    
                    // 调用API更新评论状态
                    const { updateData: apiUpdate } = await import('/apis/modules/crud.js');
                    const response = await apiUpdate(`${window.API_URL}/mongodb/?cname=comments`, updateData);
                    
                    console.log('[CodeView] 评论状态更新成功:', response);
                    
                    // 显示成功消息
                    const { showSuccess } = await import('/utils/message.js');
                    showSuccess(successMessage);
                    
                    // 更新当前评论详情的状态
                    if (this.currentCommentDetail && this.currentCommentDetail.key === commentKey) {
                        this.currentCommentDetail.status = newStatus;
                    }
                    
                    // 触发重新加载评论
                    this.$emit('reload-comments', { 
                        forceReload: true, 
                        fileId: this.file ? (this.file.fileId || this.file.id || this.file.path) : null,
                        projectId,
                        versionId
                    });
                    
                    hideGlobalLoading();
                    
                } catch (error) {
                    console.error('[CodeView] 更新评论状态失败:', error);
                    
                    // 显示错误消息
                    try {
                        const { showError } = await import('/utils/message.js');
                        showError('更新评论状态失败: ' + error.message);
                        const { hideGlobalLoading } = await import('/utils/loading.js');
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
            
            // 处理代码缩进/反缩进
            handleCodeIndentation(textarea, isReverse = false) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const value = textarea.value;
                const indentChar = '    '; // 使用4个空格缩进
                
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
                        const leadingSpaces = lineText.match(/^(\s*)/)[1];
                        
                        if (leadingSpaces.length > 0) {
                            // 计算要删除的字符数（最多删除一个缩进单位）
                            const deleteCount = Math.min(leadingSpaces.length, indentChar.length);
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
            
            // 判断光标是否在行首或行首空白处
            isAtLineStart(text, position) {
                const lineStart = text.lastIndexOf('\n', position - 1) + 1;
                const beforeCursor = text.substring(lineStart, position);
                return /^\s*$/.test(beforeCursor);
            },
            
            // 处理多行缩进
            processMultiLineIndentation(lines, startLine, endLine, indentChar, isReverse) {
                let newStart, newEnd;
                let startOffset = 0;
                let endOffset = 0;
                
                for (let i = startLine; i <= endLine; i++) {
                    const line = lines[i];
                    
                    if (isReverse) {
                        // 反向缩进：删除行首的缩进
                        if (line.startsWith(indentChar)) {
                            lines[i] = line.substring(indentChar.length);
                            if (i === startLine) startOffset = -indentChar.length;
                            if (i === endLine) endOffset = -indentChar.length;
                        } else if (line.match(/^\s+/)) {
                            // 如果不是标准缩进，删除最多4个空格或制表符
                            const leadingSpaces = line.match(/^(\s*)/)[1];
                            const deleteCount = Math.min(leadingSpaces.length, indentChar.length);
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
                            fileId: comment.fileId,
                            rangeInfo: comment.rangeInfo
                        }
                    }));
                }
            },
            // 处理评论标记的鼠标事件（悬停预览等）
            handleCommentMarkerMouseEvents(comment, event) {
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
            }
        },
        mounted() {
            console.log('[CodeView] 组件挂载');
            
            // 监听全局高亮事件
            this._hlListener = (e) => this.handleHighlightEvent(e.detail);
            window.addEventListener('highlightCodeLines', this._hlListener);
            
            // 监听评论重新加载事件
            this._reloadCommentsListener = (e) => {
                console.log('[CodeView] 收到评论重新加载事件:', e.detail);
                // 触发父组件重新获取评论数据
                this.$emit('reload-comments', e.detail);
            };
            window.addEventListener('reloadComments', this._reloadCommentsListener);
            
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
            window.addEventListener('scroll', this._scrollListener, true);
            window.addEventListener('resize', this._scrollListener);
            
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
            if (this._hlListener) {
                window.removeEventListener('highlightCodeLines', this._hlListener);
                this._hlListener = null;
            }
            if (this._reloadCommentsListener) {
                window.removeEventListener('reloadComments', this._reloadCommentsListener);
                this._reloadCommentsListener = null;
            }
            if (this._resizeListener) {
                window.removeEventListener('resize', this._resizeListener);
                this._resizeListener = null;
            }
            if (this._resizeTimer) {
                clearTimeout(this._resizeTimer);
                this._resizeTimer = null;
            }
            if (this._selListener) {
                document.removeEventListener('selectionchange', this._selListener);
                this._selListener = null;
            }
            if (this._mouseupListener) {
                document.removeEventListener('mouseup', this._mouseupListener, true);
                this._mouseupListener = null;
            }
            if (this._keyupListener) {
                document.removeEventListener('keyup', this._keyupListener, true);
                this._keyupListener = null;
            }
            if (this._scrollListener) {
                window.removeEventListener('scroll', this._scrollListener, true);
                window.removeEventListener('resize', this._scrollListener);
                this._scrollListener = null;
            }
        },
        template: `
            <section class="code-view-container" role="main" aria-label="代码查看器">
                <div v-if="loading" class="loading-container" role="status" aria-live="polite">
                    <div class="loading-spinner" aria-hidden="true"></div>
                    <div class="loading-text">正在加载代码...</div>
                </div>
                <div v-else-if="error" class="error-container" role="alert">
                    <div class="error-icon" aria-hidden="true">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="error-message">{{ error }}</div>
                </div>
                <div v-else-if="file" class="code-content">
                    <div class="code-header">
                        <div class="file-name" :title="file.path || file.name">
                            <i class="fas fa-file-code"></i>
                            {{ file.path || file.name }}
                        </div>
                    </div>
                    <pre class="code-block" :class="'language-' + languageType">
                        <code 
                            v-for="(line, index) in codeLines" 
                            :key="index + 1"
                            :class="['code-line', highlightedLines.includes(index + 1) ? 'highlight' : '']"
                            :data-line="index + 1"
                        >
                            <span class="line-number">{{ index + 1 }}</span>
                            <span class="line-content" v-html="escapeHtml(line)"></span>
                            
                            <!-- 评论标记 -->
                            <div v-if="lineCommentMarkers[index + 1]" class="comment-markers">
                                <div 
                                    class="comment-marker"
                                    :class="[
                                        getCommentStatusClass(lineCommentMarkers[index + 1].status), 
                                        { 
                                            'has-multiple': lineCommentMarkers[index + 1].hasMultiple,
                                            'multi-line': lineCommentMarkers[index + 1].isMultiLine,
                                            'start-line': lineCommentMarkers[index + 1].markerType === 'start',
                                            'middle-line': lineCommentMarkers[index + 1].markerType === 'middle',
                                            'end-line': lineCommentMarkers[index + 1].markerType === 'end'
                                        }
                                    ]"
                                    :data-comment-key="lineCommentMarkers[index + 1].key"
                                    @click="handleCommentMarkerClick(lineCommentMarkers[index + 1], $event)"
                                    @mouseenter="handleCommentMarkerMouseEvents(lineCommentMarkers[index + 1], $event)"
                                    @mouseleave="handleCommentMarkerMouseEvents(lineCommentMarkers[index + 1], $event)"
                                    :title="getCommentMarkerTitle(lineCommentMarkers[index + 1])"
                                    role="button"
                                    tabindex="0"
                                >
                                    <i :class="getCommentMarkerIcon(lineCommentMarkers[index + 1])"></i>
                                    <span class="comment-count" v-if="lineCommentMarkers[index + 1].count > 1 && lineCommentMarkers[index + 1].markerType !== 'middle'">
                                        {{ lineCommentMarkers[index + 1].count }}
                                    </span>
                                </div>
                            </div>
                        </code>
                    </pre>
                    <!-- 划词评论按钮容器（全局唯一，通过脚本定位） -->
                    <div id="comment-action-container"></div>

                    <!-- 未选评论者时的手动评论弹框 -->
                    <div 
                        v-if="showManualImprovementModal" 
                        class="manual-improvement-modal" 
                        role="dialog" 
                        aria-label="手动填写评论内容"
                    >
                        <div class="manual-improvement-content">
                            <div class="manual-improvement-header">
                                <h3 class="manual-improvement-title">填写评论内容</h3>
                                <button class="close-btn" @click="closeManualImprovementModal" title="关闭" aria-label="关闭">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <div class="manual-improvement-body">
                                <div class="md-input-preview" :class="{ 'preview-collapsed': manualPreviewCollapsed }">
                                    <div class="md-input">
                                        <div class="md-toolbar" role="toolbar" aria-label="Markdown工具栏">
                                            <button class="md-btn" title="粗体" @click="insertMarkdown('bold')"><i class="fas fa-bold"></i></button>
                                            <button class="md-btn" title="斜体" @click="insertMarkdown('italic')"><i class="fas fa-italic"></i></button>
                                            <button class="md-btn" title="行内代码" @click="insertMarkdown('code')"><i class="fas fa-code"></i></button>
                                            <button class="md-btn" title="代码块" @click="insertMarkdown('codeblock')"><i class="fas fa-file-code"></i></button>
                                            <button class="md-btn" title="无序列表" @click="insertMarkdown('ul')"><i class="fas fa-list-ul"></i></button>
                                            <button class="md-btn" title="有序列表" @click="insertMarkdown('ol')"><i class="fas fa-list-ol"></i></button>
                                            <button class="md-btn" title="链接" @click="insertMarkdown('link')"><i class="fas fa-link"></i></button>
                                            <button class="md-btn" :title="manualPreviewCollapsed ? '展开预览' : '折叠预览'" @click="toggleManualPreviewCollapse"><i class="fas" :class="manualPreviewCollapsed ? 'fa-eye' : 'fa-eye-slash'"></i></button>
                                            <span class="md-toolbar-spacer"></span>
                                            <span class="md-counter" :title="'最多 ' + manualMaxLength + ' 字'">{{ (manualCommentText || '').length }} / {{ manualMaxLength }}</span>
                                        </div>
                                        <textarea 
                                            class="manual-improvement-input"
                                            v-model="manualCommentText" 
                                            placeholder="请输入要发布的评论内容，支持Markdown语法"
                                            rows="10"
                                            @keydown="handleManualKeydown"
                                        ></textarea>
                                        <div v-if="manualCommentError" class="manual-improvement-error">
                                            <i class="fas fa-exclamation-circle"></i> {{ manualCommentError }}
                                        </div>
                                    </div>
                                    <div class="md-preview" v-show="!manualPreviewCollapsed">
                                        <div class="preview-header-row">
                                            <span class="preview-title"><i class="fas fa-eye"></i> 预览</span>
                                        </div>
                                        <div class="md-preview-body" v-html="manualCommentPreviewHtml"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="manual-improvement-actions">
                                <button class="action-button cancel" @click="closeManualImprovementModal">
                                    <i class="fas fa-times"></i> 取消
                                </button>
                                <button class="action-button confirm" :disabled="!canSubmitManualComment" @click="submitManualImprovement">
                                    <i class="fas fa-paper-plane"></i> 提交
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 评论详情遮罩 -->
                    <div 
                        v-if="showCommentDetailPopup"
                        class="comment-detail-overlay"
                        role="presentation"
                        aria-hidden="true"
                        @click="hideCommentDetail"
                    ></div>

                    <!-- 评论详情弹窗 -->
                    <div 
                        v-if="showCommentDetailPopup && currentCommentDetail" 
                        class="comment-detail-popup"
                        role="dialog"
                        aria-label="评论详情"
                    >
                        <div class="comment-detail-header">
                            <div class="comment-author-info">
                                <div class="comment-author-avatar">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="comment-author-details">
                                    <div class="author-name-row">
                                        <span class="comment-author">{{ currentCommentDetail.author }}</span>
                                        <!-- 评论状态 - 移到作者名旁边 -->
                                        <span v-if="currentCommentDetail.status" class="status-badge-inline" :class="getCommentStatusClass(currentCommentDetail.status)">
                                            {{ getCommentStatusLabel(currentCommentDetail.status) }}
                                        </span>
                                    </div>
                                    <time class="comment-time" :datetime="currentCommentDetail.timestamp">
                                        {{ formatTime(currentCommentDetail.timestamp) }}
                                    </time>
                                </div>
                            </div>
                            <button 
                                @click="hideCommentDetail"
                                class="close-button"
                                title="关闭"
                                aria-label="关闭评论详情"
                            >
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="comment-detail-body">
                            <!-- 编辑模式 -->
                            <div v-if="isEditingCommentDetail" class="comment-edit-form">
                                <div class="form-row">
                                    <div class="form-group half-width">
                                        <label>评论者:</label>
                                        <input 
                                            v-model="editingCommentAuthor"
                                            type="text" 
                                            class="form-input"
                                            placeholder="输入评论者姓名"
                                        />
                                    </div>
                                    <div class="form-group half-width">
                                        <label>时间:</label>
                                        <input 
                                            v-model="editingCommentTimestamp"
                                            type="datetime-local" 
                                            class="form-input"
                                            title="编辑时间"
                                        />
                                    </div>
                                </div>

                                <div v-if="currentCommentDetail && currentCommentDetail.rangeInfo" class="form-row">
                                    <div class="form-group half-width">
                                        <label>开始行:</label>
                                        <input 
                                            v-model.number="editingRangeInfo.startLine"
                                            type="number" 
                                            min="1"
                                            class="form-input"
                                            placeholder="开始行号"
                                        />
                                    </div>
                                    <div class="form-group half-width">
                                        <label>结束行:</label>
                                        <input 
                                            v-model.number="editingRangeInfo.endLine"
                                            type="number" 
                                            min="1"
                                            class="form-input"
                                            placeholder="结束行号"
                                        />
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label>引用代码:</label>
                                    <textarea 
                                        v-model="editingCommentText"
                                        class="form-textarea quoted-code-textarea"
                                        placeholder="输入引用的代码（可选）"
                                        rows="12"
                                        wrap="off"
                                        spellcheck="false"
                                        autocapitalize="off"
                                        autocorrect="off"
                                        @keydown="handleQuotedCodeKeydown"
                                    ></textarea>
                                </div>

                                <div class="form-group">
                                    <label>评论内容:</label>
                                    <textarea 
                                        v-model="editingCommentContent"
                                        class="form-textarea comment-content-textarea"
                                        placeholder="编辑评论内容（支持Markdown）"
                                        rows="12"
                                        @keydown="onCommentDetailEditKeydown"
                                    ></textarea>
                                    <div class="textarea-hint">
                                        <i class="fas fa-info-circle"></i>
                                        支持Markdown格式，Ctrl/Cmd + Enter 保存，Esc 取消
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label>改进代码 (可选):</label>
                                    <textarea 
                                        v-model="editingImprovementText"
                                        class="form-textarea improvement-textarea"
                                        placeholder="输入改进后的代码（可选）"
                                        rows="6"
                                    ></textarea>
                                </div>

                                <div class="form-row">
                                    <div class="form-group half-width">
                                        <label>评论类型:</label>
                                        <select v-model="editingCommentType" class="form-select" title="选择评论类型">
                                            <option value="">无类型</option>
                                            <option value="suggestion">建议</option>
                                            <option value="question">问题</option>
                                            <option value="bug">错误</option>
                                            <option value="discussion">讨论</option>
                                            <option value="praise">表扬</option>
                                            <option value="nitpick">细节</option>
                                        </select>
                                    </div>
                                    <div class="form-group half-width">
                                        <label>状态:</label>
                                        <select v-model="editingCommentStatus" class="form-select" title="选择状态">
                                            <option value="pending">待处理</option>
                                            <option value="resolved">已解决</option>
                                            <option value="closed">已关闭</option>
                                            <option value="wontfix">不修复</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="comment-detail-actions">
                                    <button 
                                        @click="saveEditedCommentDetail"
                                        class="action-button save-button"
                                        :disabled="editingSaving"
                                        title="保存 (⌘/Ctrl+Enter)"
                                    >
                                        <i class="fas" :class="editingSaving ? 'fa-spinner fa-spin' : 'fa-save'"></i>
                                        保存
                                    </button>
                                    <button @click="cancelEditCommentDetail" class="action-button cancel-button" :disabled="editingSaving" title="取消 (Esc)">
                                        <i class="fas fa-times"></i>
                                        取消
                                    </button>
                                </div>
                            </div>

                            <!-- 查看模式 -->
                            <div v-else>
                                <!-- 代码位置信息 -->
                                <div v-if="currentCommentDetail.rangeInfo" class="comment-location">
                                    <i class="fas fa-code"></i>
                                    <span class="location-text">
                                        第 {{ currentCommentDetail.rangeInfo.startLine }}{{ currentCommentDetail.rangeInfo.endLine !== currentCommentDetail.rangeInfo.startLine ? "-" + currentCommentDetail.rangeInfo.endLine : "" }} 行
                                    </span>
                                </div>
                                
                                <!-- 引用的代码 -->
                                <div v-if="currentCommentDetail.text" class="comment-quote">
                                    <div class="quote-header">
                                        <i class="fas fa-quote-left"></i>
                                        <span>引用代码</span>
                                    </div>
                                    <pre class="quote-code" @click="highlightCode(currentCommentDetail)">
                                        <code>{{ currentCommentDetailTextDisplay }}</code>
                                    </pre>
                                </div>
                                
                                <!-- 评论内容（Markdown渲染，含图片） -->
                                <div class="comment-content md-preview-body" v-html="currentCommentDetailHtml"></div>
                                
                                <!-- 改进代码 -->
                                <div v-if="currentCommentDetail.improvementText" class="comment-improvement">
                                    <div class="improvement-header">
                                        <i class="fas fa-magic"></i>
                                        <span>改进代码</span>
                                    </div>
                                    <pre class="improvement-code">
                                        <code>{{ currentCommentDetail.improvementText }}</code>
                                    </pre>
                                </div>
                                
                                <!-- 评论操作按钮 -->
                                <div class="comment-detail-actions">
                                    <button 
                                        @click="hideCommentDetail"
                                        class="action-button cancel-button"
                                        title="取消"
                                    >
                                        <i class="fas fa-times"></i>
                                        取消
                                    </button>
                                    <button 
                                        @click="startEditCommentDetail(currentCommentDetail)"
                                        class="action-button edit-button"
                                        title="编辑评论"
                                    >
                                        <i class="fas fa-pen"></i>
                                        编辑
                                    </button>
                                    <button 
                                        v-if="currentCommentDetail.status === 'pending'"
                                        @click="resolveCommentDetail(currentCommentDetail.key)"
                                        class="action-button resolve-button"
                                        title="标记为已解决"
                                    >
                                        <i class="fas fa-check"></i>
                                        解决
                                    </button>
                                    
                                    <button 
                                        v-if="currentCommentDetail.status === 'resolved'"
                                        @click="reopenCommentDetail(currentCommentDetail.key)"
                                        class="action-button reopen-button"
                                        title="重新打开"
                                    >
                                        <i class="fas fa-undo"></i>
                                        重开
                                    </button>
                                    
                                    <button 
                                        @click="deleteCommentDetail(currentCommentDetail.key)"
                                        class="action-button delete-button"
                                        title="删除评论"
                                    >
                                        <i class="fas fa-trash"></i>
                                        删除
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 评论预览弹窗（悬停显示） -->
                    <div 
                        v-if="showCommentPreviewPopup && currentCommentPreview" 
                        class="comment-preview-popup"
                        :style="{
                            left: commentPreviewPosition.x + 'px',
                            top: commentPreviewPosition.y + 'px'
                        }"
                        role="tooltip"
                        aria-label="评论预览"
                    >
                        <div class="preview-header">
                            <div class="preview-author-info">
                                <div class="preview-author-avatar">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="preview-author-details">
                                    <div class="preview-author-name-row">
                                        <span class="preview-author">{{ currentCommentPreview.author }}</span>
                                        <!-- 评论状态 - 移到作者名旁边 -->
                                        <span v-if="currentCommentPreview.status" class="preview-status-badge-inline" :class="getCommentStatusClass(currentCommentPreview.status)">
                                            {{ getCommentStatusLabel(currentCommentPreview.status) }}
                                        </span>
                                    </div>
                                    <time class="preview-time" :datetime="currentCommentPreview.timestamp">
                                        {{ formatTime(currentCommentPreview.timestamp) }}
                                    </time>
                                </div>
                            </div>
                        </div>
                        
                        <div class="preview-body">
                            <!-- 评论内容预览（Markdown渲染，含图片） -->
                            <div class="preview-content md-preview-body" v-html="currentCommentPreviewHtml"></div>
                            
                            <!-- 引用的代码预览（如果有） -->
                            <div v-if="currentCommentPreview.text" class="preview-quote">
                                <div class="preview-quote-header">
                                    <i class="fas fa-quote-left"></i>
                                    <span>引用代码</span>
                                </div>
                                <pre class="preview-quote-code">
                                    <code>{{ currentCommentPreview.text }}</code>
                                </pre>
                            </div>
                            
                            <!-- 改进代码预览（如果有） -->
                            <div v-if="currentCommentPreview.improvementText" class="preview-improvement">
                                <div class="preview-improvement-header">
                                    <i class="fas fa-magic"></i>
                                    <span>改进建议</span>
                                </div>
                                <pre class="preview-improvement-code">
                                    <code>{{ currentCommentPreview.improvementText }}</code>
                                </pre>
                            </div>
                        </div>
                        
                        <!-- 点击查看详情提示 -->
                        <div class="preview-footer">
                            <span class="preview-hint">点击查看完整详情</span>
                        </div>
                    </div>
                </div>
                <div v-else class="empty-state" role="status">
                    <div class="empty-icon" aria-hidden="true">
                        <i class="fas fa-file-code"></i>
                    </div>
                    <div class="empty-title">请选择文件</div>
                    <div class="empty-subtitle">从左侧文件树中选择要查看的文件</div>
                </div>
            </section>
        `
    };
};

// 初始化组件并全局暴露
(async function initComponent() {
    try {
        const CodeView = await createCodeView();
        window.CodeView = CodeView;
        // 触发自定义事件，通知组件已加载完成
        window.dispatchEvent(new CustomEvent('CodeViewLoaded', { detail: CodeView }));
        console.log('[CodeView] 组件初始化完成');
    } catch (error) {
        console.error('CodeView 组件初始化失败:', error);
    }
})();


