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
            }
        },
        emits: ['comment-delete', 'comment-resolve', 'comment-reopen'],
        data() {
            return {
                highlightedLines: [],
                // 划词评论与手动Markdown弹框
                showManualImprovementModal: false,
                manualCommentText: '',
                manualPreviewCollapsed: false,
                manualMaxLength: 4000,
                manualCommentError: '',
                lastSelectionText: '',
                lastSelectionRange: null, // 用于评论定位，不在界面显示
                _containerHover: false,
                _lastShowTs: 0,
                _buttonVisible: false
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
                }
            }
        },
        mounted() {
            console.log('[CodeView] 组件挂载');
            
            // 监听全局高亮事件
            this._hlListener = (e) => this.handleHighlightEvent(e.detail);
            window.addEventListener('highlightCodeLines', this._hlListener);
            
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
                                <!-- 引用代码区域（独立显示在编辑框外） -->
                                <div v-if="lastSelectionText" class="quote-section">
                                    <div class="quote-header">
                                        <i class="fas fa-quote-left"></i>
                                        <span>引用代码</span>
                                    </div>
                                    <pre class="quote-code">{{ lastSelectionText }}</pre>
                                </div>
                                
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


