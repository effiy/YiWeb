import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';
import { safeExecute, safeExecuteAsync } from '/cdn/utils/core/error.js';
import { normalizeFilePath } from '../../utils/fileFieldNormalizer.js';
import { postData } from '/src/core/services/index.js';

const normalizePath = (v) => normalizeFilePath(v);

// 规范化路径（处理 . 和 ..）
function normalizePathWithDotDot(path) {
    if (!path) return '';
    const parts = String(path).replace(/\\/g, '/').split('/');
    const result = [];
    for (const part of parts) {
        if (part === '' || part === '.') continue;
        if (part === '..') {
            if (result.length > 0) {
                result.pop();
            } else {
                // 如果已经在根目录，保留 .. 用于后续安全检查
                result.push('..');
            }
        } else {
            result.push(part);
        }
    }
    return result.join('/');
}

// 解析绝对路径
function resolveAbsolutePath(basePath, targetPath) {
    if (!targetPath) return '';

    const target = String(targetPath).replace(/\\/g, '/');

    // 绝对路径（以 / 开头）
    if (target.startsWith('/')) {
        return normalizePathWithDotDot(target);
    }

    // 相对路径：基于 basePath 解析
    const base = String(basePath || '').replace(/\\/g, '/');
    const baseDir = base.includes('/')
        ? base.substring(0, base.lastIndexOf('/'))
        : '';

    const combined = baseDir ? `${baseDir}/${target}` : target;
    return normalizePathWithDotDot(combined);
}

const decodeBase64Utf8 = (b64) => {
    try {
        const bin = atob(String(b64 || ''));
        const bytes = Uint8Array.from(bin, ch => ch.charCodeAt(0));
        return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch (_) {
        try {
            return atob(String(b64 || ''));
        } catch (_) {
            return '';
        }
    }
};

// 图片预览相关的私有变量
let __codeViewImagePreviewRoot = null;
let __codeViewImagePreviewSrc = '';
let __codeViewImagePreviewKeydownHandler = null;
let __codeViewImagePreviewStyleMounted = false;
let __codeViewImagePreviewCloseTimer = 0;
let __codeViewImagePreviewPrevActiveEl = null;

const guessLanguage = (name) => {
    const n = String(name || '').toLowerCase();
    console.log('[guessLanguage] 文件名:', n);

    // 首先检查是否是图片文件
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'];
    for (const ext of imageExtensions) {
        if (n.endsWith(ext)) {
            console.log('[guessLanguage] 识别到图片文件');
            return 'image';
        }
    }

    // 检查是否是 Markdown 文件
    if (n.endsWith('.md') || n.endsWith('.markdown') || n === 'readme') {
        console.log('[guessLanguage] 识别到 Markdown 文件');
        return 'markdown';
    }

    const ext = n.includes('.') ? n.split('.').pop() : '';
    console.log('[guessLanguage] 文件扩展名:', ext);

    if (n.endsWith('.d.ts')) return 'typescript';

    switch (ext) {
        case 'js': return 'javascript';
        case 'jsx': return 'javascript';
        case 'ts': return 'typescript';
        case 'tsx': return 'typescript';
        case 'json': return 'json';
        case 'html': return 'html';
        case 'htm': return 'html';
        case 'css': return 'css';
        case 'scss': return 'scss';
        case 'less': return 'less';
        case 'vue': return 'vue';
        case 'py': return 'python';
        case 'go': return 'go';
        case 'java': return 'java';
        case 'kt': return 'kotlin';
        case 'rs': return 'rust';
        case 'sh': return 'bash';
        case 'yaml': return 'yaml';
        case 'yml': return 'yaml';
        case 'toml': return 'toml';
        case 'xml': return 'xml';
        default:
            console.log('[guessLanguage] 未匹配到扩展名，返回默认类型：text');
            return 'text';
    }
};

// ── 关系类型中文标签（模块级共享）──
const RELATION_LABELS = {
    imports: '导入', contains: '包含', depends_on: '依赖', tests: '测试',
    re_exports: '重导出', creates: '创建', triggers: '触发', mutates: '变更',
    calls: '调用', derives: '派生', checks: '校验', injects: '注入',
    validates: '验证', manages: '管理', protects: '保护', cooperates: '协作',
    reads: '读取', reads_writes: '读写', belongs_to: '归属', layer_depends: '层级依赖',
    loads: '加载', registered_by: '被注册', used_by: '被使用', documents: '文档化',
    parallel: '并行', compares: '对比', executes: '执行', drives: '驱动',
    produces: '产出', implements: '实现',
};

const componentOptions = {
    name: 'CodeView',
    css: '/src/views/aicr/components/codeView/index.css',
    html: '/src/views/aicr/components/codeView/index.html',
    emits: ['create-session'],
    setup() {
        if (typeof Vue === 'undefined' || typeof Vue.inject !== 'function') return {};
        return { viewContext: Vue.inject('viewContext', null) };
    },
    props: {
        file: {
            type: [Object, null],
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
    data() {
        return {
            highlightedLines: [],
            isEditingFile: false,
            editingFileContent: '',
            originalFileContent: '',
            editSaving: false,
            saveError: '',
            searchQuery: '',
            matchLines: [],
            activeMatchIndex: -1,
            wrapEnabled: false,
            fontSize: 13,
            fontSizeMin: 11,
            fontSizeMax: 18,
            hoveredLine: null,
            isFullscreen: false,
            showSearchBar: false,
            showKnowledgeGraph: false,
            kgLoading: false,
            kgError: '',
            kgGraphData: null,
            kgTitle: '',
            kgAllNodes: null,
            kgSelectedNode: null,
            kgMatchedIds: null,
            kgSourceScenarios: null,
            kgGraphOverview: null,
            kgBreadcrumb: { path: [], layer: 1 },
            kgActiveFilter: null,
            kgActiveFilterNodeIds: null,
            kgLayer: 1,
            kgFullscreen: false
        };
    },
    computed: {
        fullFilePath() {
            const f = this.file || {};
            return String(f.path || f.treeKey || f.name || f.key || '');
        },
        displayFileName() {
            const f = this.file || {};
            console.log('[displayFileName] 文件对象:', f);
            const p = String(f.path || f.treeKey || f.key || '').trim();
            console.log('[displayFileName] 从 file.path/treeKey/key 获取到的路径:', p);
            if (p) return p;
            const n = String(f.name || '').trim();
            console.log('[displayFileName] 从 file.name 获取到的文件名:', n);
            return n;
        },
        hasUnsavedChanges() {
            if (!this.isEditingFile) return false;
            return this.editingFileContent !== this.originalFileContent;
        },
        languageType() {
            const fileName = this.displayFileName || this.fullFilePath;
            console.log('[languageType] 文件名:', fileName);
            const language = guessLanguage(fileName);
            console.log('[languageType] 识别到的语言:', language);
            return language;
        },
        shouldShowMarkdownPreview() {
            const shouldShow = this.languageType === 'markdown';
            console.log('[shouldShowMarkdownPreview] 是否显示markdown预览:', shouldShow);
            return shouldShow;
        },
        shouldShowImagePreview() {
            const shouldShow = this.languageType === 'image';
            console.log('[shouldShowImagePreview] 是否显示图片预览:', shouldShow, 'languageType:', this.languageType);
            return shouldShow;
        },
        imageSrc() {
            const f = this.file || {};
            console.log('[imageSrc] 准备图片源，文件对象:', f);
            console.log('[imageSrc] 文件对象键:', Object.keys(f));
            console.log('[imageSrc] contentBase64:', typeof f.contentBase64, f.contentBase64 ? f.contentBase64.substring(0, 50) + '...' : 'empty');
            console.log('[imageSrc] content:', typeof f.content, f.content ? f.content.substring(0, 50) + '...' : 'empty');

            // 如果是 contentBase64，构建 data URL
            if (typeof f.contentBase64 === 'string' && f.contentBase64) {
                // 检查是否已经是 data URL 格式
                if (f.contentBase64.startsWith('data:')) {
                    console.log('[imageSrc] contentBase64 已经是 data URL 格式');
                    return f.contentBase64;
                }

                const ext = (this.displayFileName || '').toLowerCase().split('.').pop() || 'png';
                let mimeType = 'image/png';
                switch (ext) {
                    case 'jpg':
                    case 'jpeg': mimeType = 'image/jpeg'; break;
                    case 'gif': mimeType = 'image/gif'; break;
                    case 'webp': mimeType = 'image/webp'; break;
                    case 'svg': mimeType = 'image/svg+xml'; break;
                    case 'bmp': mimeType = 'image/bmp'; break;
                    case 'ico': mimeType = 'image/x-icon'; break;
                }
                const dataUrl = `data:${mimeType};base64,${f.contentBase64}`;
                console.log('[imageSrc] 使用 base64 构建 data URL，长度:', dataUrl.length);
                return dataUrl;
            }

            // 如果是 content，直接使用
            if (typeof f.content === 'string' && f.content) {
                console.log('[imageSrc] 使用 content 作为图片源，长度:', f.content.length);
                return f.content;
            }

            console.log('[imageSrc] 未找到图片数据');
            return '';
        },
        rawContent() {
            const f = this.file || {};
            console.log('[CodeView] 原始文件对象:', f);
            if (typeof f.content === 'string') {
                console.log('[CodeView] 获取到文本内容，长度:', f.content.length);
                return f.content;
            }
            if (Array.isArray(f.content)) {
                const joinedContent = f.content.map(v => (v == null ? '' : String(v))).join('\n');
                console.log('[CodeView] 获取到数组内容，长度:', joinedContent.length);
                return joinedContent;
            }
            if (typeof f.contentBase64 === 'string' && f.contentBase64) {
                const decoded = decodeBase64Utf8(f.contentBase64);
                console.log('[CodeView] 获取到base64内容，解码后长度:', decoded.length);
                return decoded;
            }
            console.log('[CodeView] 未获取到任何内容');
            return '';
        },
        codeLines() {
            const content = String(this.rawContent || '');
            return content.split('\n');
        },
        searchMatchCount() {
            return Array.isArray(this.matchLines) ? this.matchLines.length : 0;
        },
        codeContentStyle() {
            return {
                '--code-font-size': `${this.fontSize}px`
            };
        },
        canShowKnowledgeGraph() {
            if (!this.file) return false;
            const name = (this.displayFileName || this.fullFilePath || '').toLowerCase();
            // MD files: show KG if they're under 故事任务面板
            if (name.endsWith('.md') || this.languageType === 'markdown') {
                return (this.fullFilePath || '').includes('故事任务面板');
            }
            // knowledge-graph.json files
            if (name.endsWith('knowledge-graph.json') || name.includes('knowledge-graph')) {
                return true;
            }
            // story-deps.json
            if (name.includes('story-deps.json')) {
                return true;
            }
            return false;
        },
        graphReaderHeight() {
            // Match code-reader height
            return this.isFullscreen ? window.innerHeight - 120 : 0;
        },
        kgSourceStoryDir() {
            // Extract story directory from file path
            const fp = this.fullFilePath || '';
            const m = fp.match(/故事任务面板\/([^/]+)\//);
            return m ? m[1] : '';
        },
        kgSourceFileName() {
            const fp = this.fullFilePath || '';
            const parts = fp.split('/');
            return parts[parts.length - 1] || '';
        }
    },
    watch: {
        file() {
            this.highlightedLines = [];
            this.searchQuery = '';
            this.matchLines = [];
            this.activeMatchIndex = -1;
            if (this.isEditingFile) {
                this.isEditingFile = false;
                this.editingFileContent = '';
                this.saveError = '';
            }

            // 故事任务 MD / 知识图谱 JSON → 自动展示图谱
            if (this.canShowKnowledgeGraph) {
                this.showKnowledgeGraph = true;
                this.kgGraphData = null;
                this.kgError = '';
                this.$nextTick(() => this.loadKnowledgeGraph());
                return;
            }

            // 非兼容文件 → 关闭图谱
            this.showKnowledgeGraph = false;
            this.kgGraphData = null;
            this.kgError = '';
            this.kgLoading = false;
            this.loadHighlightFromURL();
        },
        searchQuery() {
            this.updateSearchMatches();
        },
        highlightedLines() {
            // 当高亮行改变时，更新 URL
            this.updateURLWithHighlight();
        },
        showKnowledgeGraph(val) {
            if (val && this.kgGraphData) {
                this.$nextTick(() => this.renderKgGraph());
            }
            if (!val) {
                this._destroyCyGraph();
            }
        }
    },
    mounted() {
        // 加载 URL 中的高亮行
        this.loadHighlightFromURL();

        this._onHighlightCodeLines = (e) => {
            const detail = (e && e.detail) ? e.detail : {};
            const rangeInfo = detail.rangeInfo || null;
            if (!rangeInfo) return;
            const startLine = Number(rangeInfo.startLine);
            const endLine = Number(rangeInfo.endLine);
            if (!Number.isFinite(startLine) || !Number.isFinite(endLine)) return;
            const f = this.file || {};
            const currentKey = normalizePath(f.treeKey || f.path || f.key || '');
            const incomingKey = normalizePath(detail.fileKey || '');
            if (incomingKey && currentKey && incomingKey !== currentKey) return;
            const s = Math.max(1, Math.min(startLine, endLine));
            const t = Math.max(1, Math.max(startLine, endLine));
            const maxLine = this.codeLines.length || t;
            const hi = [];
            for (let i = s; i <= t && i <= maxLine; i++) hi.push(i);
            this.highlightedLines = hi;
            this.$nextTick(() => {
                try {
                    const el = document.getElementById(`L${s}`);
                    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } catch (_) { }
            });
        };
        this._onClearCodeHighlight = () => {
            this.highlightedLines = [];
        };
        window.addEventListener('highlightCodeLines', this._onHighlightCodeLines);
        window.addEventListener('clearCodeHighlight', this._onClearCodeHighlight);

        this._onCodeKeydown = (e) => {
            if (!e) return;
            if (this.isEditingFile) return;
            const key = String(e.key || '');
            const ctrl = !!(e.ctrlKey || e.metaKey);
            if (key === 'Escape') {
                if (this.showSearchBar) {
                    e.preventDefault();
                    this.toggleSearchBar();
                } else if (this.kgFullscreen) {
                    e.preventDefault();
                    this.toggleKgFullscreen();
                } else if (this.isFullscreen) {
                    e.preventDefault();
                    this.toggleFullscreen();
                }
            }
            if (ctrl && (key === 'f' || key === 'F')) {
                e.preventDefault();
                if (!this.showSearchBar) this.toggleSearchBar();
            }
        };
        window.addEventListener('keydown', this._onCodeKeydown);

        this._onOpenMarkdownFile = (e) => {
            safeExecute(() => {
                const detail = (e && e.detail) || {};
                this.handleOpenMarkdownFile(detail);
            }, '处理 Markdown 内部链接');
        };
        window.addEventListener('open-markdown-file', this._onOpenMarkdownFile);
    },
    beforeUnmount() {
        if (this._onHighlightCodeLines) window.removeEventListener('highlightCodeLines', this._onHighlightCodeLines);
        if (this._onClearCodeHighlight) window.removeEventListener('clearCodeHighlight', this._onClearCodeHighlight);
        if (this._onCodeKeydown) window.removeEventListener('keydown', this._onCodeKeydown);
        if (this._onOpenMarkdownFile) {
            window.removeEventListener('open-markdown-file', this._onOpenMarkdownFile);
        }
        this._destroyCyGraph();
    },
    methods: {
        emitCreateSession() {
            try {
                this.$emit('create-session');
            } catch (_) { }
        },
        escapeHtml(input) {
            return String(input || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },
        focusSearch() {
            try {
                const input = this.$refs && this.$refs.searchInput;
                if (input && input.focus) {
                    input.focus();
                    if (input.select) input.select();
                }
            } catch (_) { }
        },
        focusFileTree() {
            try {
                const sidebar = document.querySelector('.aicr-sidebar') || document.querySelector('.file-tree-container');
                if (sidebar && sidebar.scrollIntoView) {
                    sidebar.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                }
                const focusTarget = (sidebar && sidebar.querySelector)
                    ? sidebar.querySelector('input, button, [tabindex]:not([tabindex="-1"])')
                    : null;
                if (focusTarget && focusTarget.focus) {
                    focusTarget.focus({ preventScroll: true });
                }
            } catch (_) { }
        },
        updateSearchMatches() {
            const q = String(this.searchQuery || '').trim();
            if (!q) {
                this.matchLines = [];
                this.activeMatchIndex = -1;
                return;
            }
            const needle = q.toLowerCase();
            const lines = this.codeLines || [];
            const matches = [];
            for (let i = 0; i < lines.length; i++) {
                const text = String(lines[i] || '');
                if (text.toLowerCase().includes(needle)) matches.push(i + 1);
            }
            const currentLine = this.matchLines && this.activeMatchIndex >= 0 ? this.matchLines[this.activeMatchIndex] : null;
            this.matchLines = matches;
            if (!matches.length) {
                this.activeMatchIndex = -1;
                return;
            }
            const idx = currentLine ? matches.indexOf(currentLine) : -1;
            this.activeMatchIndex = idx >= 0 ? idx : 0;
        },
        toggleSearchBar() {
            this.showSearchBar = !this.showSearchBar;
            if (this.showSearchBar) {
                this.$nextTick(() => {
                    const input = this.$refs && this.$refs.codeSearchInput;
                    if (input && input.focus) input.focus();
                });
            } else {
                this.clearSearch();
            }
        },
        onCodeSearchKeydown(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.toggleSearchBar();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) {
                    this.findPrevMatch();
                } else {
                    this.findNextMatch();
                }
            }
        },
        clearSearch() {
            this.searchQuery = '';
            this.matchLines = [];
            this.activeMatchIndex = -1;
        },
        isActiveMatchLine(lineNumber) {
            if (!this.searchMatchCount || this.activeMatchIndex < 0) return false;
            return this.matchLines[this.activeMatchIndex] === lineNumber;
        },
        scrollToLine(lineNumber, behavior = 'smooth') {
            try {
                const el = document.getElementById(`L${lineNumber}`);
                if (el && el.scrollIntoView) el.scrollIntoView({ behavior, block: 'center' });
            } catch (_) { }
        },
        findNextMatch() {
            if (!this.searchMatchCount) return;
            this.activeMatchIndex = (this.activeMatchIndex + 1) % this.searchMatchCount;
            const line = this.matchLines[this.activeMatchIndex];
            this.$nextTick(() => this.scrollToLine(line));
        },
        findPrevMatch() {
            if (!this.searchMatchCount) return;
            this.activeMatchIndex = (this.activeMatchIndex - 1 + this.searchMatchCount) % this.searchMatchCount;
            const line = this.matchLines[this.activeMatchIndex];
            this.$nextTick(() => this.scrollToLine(line));
        },
        renderLineContent(line) {
            const text = String(line == null ? '' : line);
            const q = String(this.searchQuery || '').trim();
            if (!q) return this.escapeHtml(text);
            const hay = text;
            const hayLower = hay.toLowerCase();
            const needleLower = q.toLowerCase();
            let out = '';
            let pos = 0;
            while (pos < hay.length) {
                const idx = hayLower.indexOf(needleLower, pos);
                if (idx === -1) {
                    out += this.escapeHtml(hay.slice(pos));
                    break;
                }
                out += this.escapeHtml(hay.slice(pos, idx));
                out += `<mark class="code-search-hit">${this.escapeHtml(hay.slice(idx, idx + q.length))}</mark>`;
                pos = idx + q.length;
                if (q.length === 0) break;
            }
            return out;
        },
        toggleWrap() {
            this.wrapEnabled = !this.wrapEnabled;
        },
        increaseFont() {
            this.fontSize = Math.min(this.fontSizeMax, (this.fontSize || 13) + 1);
        },
        decreaseFont() {
            this.fontSize = Math.max(this.fontSizeMin, (this.fontSize || 13) - 1);
        },
        resetFont() {
            this.fontSize = 13;
        },
        onLineNumberClick(lineNumber) {
            const n = Number(lineNumber);
            if (!Number.isFinite(n) || n <= 0) return;
            if (this.highlightedLines && this.highlightedLines.length === 1 && this.highlightedLines[0] === n) {
                this.highlightedLines = [];
            } else {
                this.highlightedLines = [n];
            }
            const hash = `#L${n}`;
            try {
                if (history && history.replaceState) {
                    history.replaceState(null, '', hash);
                } else {
                    window.location.hash = hash;
                }
            } catch (_) { }
            const textToCopy = `${window.location.origin}${window.location.pathname}${window.location.search}${hash}`;
            safeExecuteAsync(async () => {
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(textToCopy);
                    } else {
                        const ta = document.createElement('textarea');
                        ta.value = textToCopy;
                        ta.style.position = 'fixed';
                        ta.style.left = '-9999px';
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                    }
                    if (window.showSuccess) window.showSuccess('已复制行链接');
                } catch (_) { }
            }, '复制行链接');
        },
        startEditFile() {
            return safeExecute(() => {
                if (!this.file) return;
                this.isEditingFile = true;
                this.saveError = '';
                const content = String(this.rawContent || '');
                this.editingFileContent = content;
                this.originalFileContent = content;
                this.$nextTick(() => {
                    try {
                        const el = this.$el && this.$el.querySelector ? this.$el.querySelector('.edit-textarea') : null;
                        if (el && el.focus) el.focus();
                    } catch (_) { }
                });
            }, '开始编辑文件');
        },
        cancelEditFile() {
            return safeExecute(() => {
                if (this.hasUnsavedChanges) {
                    if (!confirm('有未保存的更改，确定要放弃吗？')) {
                        return;
                    }
                }
                this.isEditingFile = false;
                this.editingFileContent = '';
                this.originalFileContent = '';
                this.saveError = '';
            }, '取消编辑文件');
        },
        onEditKeydown(e) {
            if (!e) return;
            const key = String(e.key || '');
            const isMeta = !!(e.metaKey || e.ctrlKey);
            if (isMeta && (key === 's' || key === 'S')) {
                e.preventDefault();
                this.saveEditedFile();
                return;
            }
            if (key === 'Escape') {
                e.preventDefault();
                this.cancelEditFile();
            }
        },
        onEditPaste(e) {
            return safeExecute(() => {
                if (!this.isEditingFile || !e) return;

                const clipboard = e.clipboardData;
                const items = clipboard?.items;
                if (!items || typeof items.length !== 'number') return;

                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (!item || typeof item.type !== 'string') continue;
                    if (!item.type.includes('image')) continue;

                    const file = item.getAsFile && item.getAsFile();
                    if (!file) continue;

                    e.preventDefault();
                    this.handlePastedImage(file);
                    break;
                }
            }, '处理编辑区粘贴事件');
        },
        handlePastedImage(file) {
            return safeExecuteAsync(async () => {
                if (!file) return;

                // 转换为 Data URL
                const dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result || ''));
                    reader.onerror = () => reject(new Error('读取图片失败'));
                    reader.readAsDataURL(file);
                });

                if (!dataUrl || !dataUrl.startsWith('data:image/')) {
                    throw new Error('图片数据无效');
                }

                // 生成文件名
                const fileName = this.generateImageFileName(file);

                // 上传图片到 OSS
                const imageUrl = await this.saveImageToProject(dataUrl, fileName);

                // 插入 Markdown 链接
                this.insertMarkdownImageLink(imageUrl);

                if (window.showSuccess) {
                    window.showSuccess('图片已插入');
                }
            }, '处理粘贴的图片', (errorInfo) => {
                if (window.showError) {
                    window.showError('图片处理失败：' + (errorInfo?.message || '未知错误'));
                }
            });
        },
        generateImageFileName(file) {
            // 尝试从 file 对象获取文件名
            let name = file?.name ? String(file.name).trim() : '';

            // 如果没有文件名或文件名无效，使用时间戳
            if (!name || name === 'image.png' || name === 'image.jpg' || name === 'image.jpeg') {
                const now = new Date();
                const pad = (n) => String(n).padStart(2, '0');
                const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

                // 从 MIME 类型获取扩展名
                const mimeType = file?.type || 'image/png';
                let ext = 'png';
                if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
                else if (mimeType.includes('gif')) ext = 'gif';
                else if (mimeType.includes('webp')) ext = 'webp';
                else if (mimeType.includes('bmp')) ext = 'bmp';
                else if (mimeType.includes('svg')) ext = 'svg';

                name = `${timestamp}.${ext}`;
            }

            return name;
        },
        saveImageToProject(dataUrl, filename) {
            return safeExecuteAsync(async () => {
                const apiUrl = window.API_URL || 'https://api.effiy.cn';

                const header = dataUrl.slice(0, dataUrl.indexOf(','));
                const mimeMatch = header.match(/^data:([^;]+);/i);
                const mime = mimeMatch ? mimeMatch[1] : 'image/png';
                const extRaw = String(mime.split('/')[1] || 'png').toLowerCase();
                const ext = extRaw === 'jpeg' ? 'jpg' : extRaw;

                let finalFilename = filename;
                if (!finalFilename) {
                    finalFilename = `aicr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
                }

                const resp = await postData(`${apiUrl}/upload/upload-image-to-oss`, {
                    data_url: dataUrl,
                    filename: finalFilename,
                    directory: 'aicr/images'
                });

                const pickUrl = (r) => {
                    if (!r) return '';
                    if (typeof r === 'string') return r;
                    const d = r.data;
                    if (typeof d === 'string') return d;
                    if (typeof r.url === 'string') return r.url;
                    if (d && typeof d.url === 'string') return d.url;
                    const dd = d && d.data;
                    if (typeof dd === 'string') return dd;
                    if (dd && typeof dd.url === 'string') return dd.url;
                    return '';
                };

                const url = pickUrl(resp);
                if (!url) {
                    throw new Error('上传图片失败');
                }
                return String(url);
            }, '上传图片到 OSS');
        },
        insertMarkdownImageLink(imageUrl) {
            return safeExecute(() => {
                if (!imageUrl) return;

                // 获取 textarea 元素
                const textarea = this.$el && this.$el.querySelector ? this.$el.querySelector('.edit-textarea') : null;
                if (!textarea) return;

                // 获取光标位置
                const start = textarea.selectionStart || 0;
                const end = textarea.selectionEnd || 0;
                const content = this.editingFileContent || '';

                // 插入 Markdown 图片链接
                const mdLink = `![图片](${imageUrl})`;
                const newContent = content.substring(0, start) + mdLink + content.substring(end);

                // 更新内容
                this.editingFileContent = newContent;

                // 设置光标位置在链接后面
                this.$nextTick(() => {
                    try {
                        const newCursorPos = start + mdLink.length;
                        textarea.focus();
                        textarea.setSelectionRange(newCursorPos, newCursorPos);
                    } catch (_) {}
                });
            }, '插入 Markdown 图片链接');
        },
        async saveEditedFile() {
            if (this.editSaving) return;
            return safeExecuteAsync(async () => {
                const f = this.file || {};
                const rawPath = String(f.path || f.treeKey || '').trim();
                if (!rawPath) {
                    throw new Error('文件路径无效，无法保存');
                }
                const saveFn = this.viewContext && typeof this.viewContext.saveFileContent === 'function'
                    ? this.viewContext.saveFileContent
                    : null;
                if (!saveFn) {
                    throw new Error('保存能力不可用');
                }
                this.editSaving = true;
                this.saveError = '';
                const content = String(this.editingFileContent || '');
                try {
                    await saveFn(rawPath, content);
                } finally {
                    this.editSaving = false;
                }
                if (f) {
                    try {
                        f.content = content;
                        if (f.contentBase64) f.contentBase64 = '';
                    } catch (_) { }
                }
                this.isEditingFile = false;
                this.editingFileContent = '';
                this.originalFileContent = '';
            }, '保存文件编辑', (errorInfo) => {
                try {
                    this.saveError = errorInfo?.message || '保存失败';
                    this.editSaving = false;
                } catch (_) { }
            });
        },
        copyEntireFile() {
            return safeExecuteAsync(async () => {
                const text = String(this.rawContent || '');
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(text);
                    if (window.showSuccess) window.showSuccess('已复制全部代码');
                    return;
                }
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                if (window.showSuccess) window.showSuccess('已复制全部代码');
            }, '复制文件内容');
        },
        downloadCurrentFile() {
            return safeExecute(() => {
                if (!this.file) return;
                const filename = String(this.displayFileName || 'file.txt').replace(/\s+/g, '_');

                let url;
                if (this.shouldShowImagePreview && this.imageSrc) {
                    // 对于图片，直接使用 imageSrc（可能是 data URL 或 HTTP URL）
                    url = this.imageSrc;
                } else {
                    // 对于文本文件，使用原来的方式
                    const blob = new Blob([String(this.rawContent || '')], { type: 'text/plain;charset=utf-8' });
                    url = URL.createObjectURL(blob);
                }

                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();

                // 只有是 blob URL 时才释放
                if (!this.shouldShowImagePreview) {
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                }
            }, '下载文件');
        },
        scrollToFileInTree() {
            return safeExecute(() => {
                if (!this.file) {
                    console.log('[scrollToFileInTree] 没有文件对象');
                    return;
                }

                console.log('[scrollToFileInTree] 当前文件对象:', this.file);

                const fileKey = normalizePath(this.file.path || this.file.treeKey || '');
                console.log('[scrollToFileInTree] 计算的文件Key:', fileKey);

                if (!fileKey) {
                    if (window.showWarning) window.showWarning('无法定位文件');
                    return;
                }

                // 0. 自动展开侧边栏（如果已收起）
                const sidebarWasCollapsed = this.viewContext?.sidebarCollapsed?.value === true;
                if (sidebarWasCollapsed) {
                    console.log('[scrollToFileInTree] 侧边栏已收起，自动展开');
                    this.viewContext.sidebarCollapsed.value = false;
                }

                // 1. 展开文件所在路径的所有父文件夹
                let expandMethodCalled = false;
                if (this.viewContext?.expandPathToFile) {
                    console.log('[scrollToFileInTree] 使用 viewContext.expandPathToFile');
                    this.viewContext.expandPathToFile(fileKey);
                    expandMethodCalled = true;
                } else if (window.aicrStore?.expandPathToFile) {
                    console.log('[scrollToFileInTree] 使用 window.aicrStore.expandPathToFile');
                    window.aicrStore.expandPathToFile(fileKey);
                    expandMethodCalled = true;
                } else {
                    console.log('[scrollToFileInTree] 没有找到 expandPathToFile 方法');
                    console.log('[scrollToFileInTree] viewContext:', this.viewContext);
                    console.log('[scrollToFileInTree] window.aicrStore:', window.aicrStore);
                }

                // 2. 等待Vue更新DOM（侧边栏展开需额外等待CSS过渡 0.3s）
                this.$nextTick(() => {
                    const delay = sidebarWasCollapsed ? 350 : 200;
                    setTimeout(() => {
                        const fileTreeContainer = document.querySelector('.file-tree-container');
                        if (!fileTreeContainer) {
                            console.log('[scrollToFileInTree] 未找到 .file-tree-container');
                            if (window.showWarning) window.showWarning('文件树未找到');
                            return;
                        }

                        console.log('[scrollToFileInTree] 找到文件树容器');

                        // 输出所有 data-file-key 用于调试
                        const allFileElements = fileTreeContainer.querySelectorAll('[data-file-key]');
                        console.log('[scrollToFileInTree] 找到的文件元素数量:', allFileElements.length);
                        const allKeys = Array.from(allFileElements).map(el => el.getAttribute('data-file-key'));
                        console.log('[scrollToFileInTree] 所有文件keys:', allKeys);

                        // 3. 查找文件元素 - 使用多种策略
                        let fileElement = null;

                        // 策略1: 直接选择器查找
                        fileElement = fileTreeContainer.querySelector(`[data-file-key="${fileKey}"]`);
                        if (fileElement) {
                            console.log('[scrollToFileInTree] 策略1成功: 直接选择器找到');
                        }

                        // 策略2: 遍历所有元素，松散比对
                        if (!fileElement) {
                            console.log('[scrollToFileInTree] 策略1失败，尝试策略2: 遍历比对');
                            for (const el of allFileElements) {
                                const elKeyRaw = el.getAttribute('data-file-key') || '';
                                const elKey = normalizePath(elKeyRaw);
                                console.log('[scrollToFileInTree] 比对:', { target: fileKey, current: elKey, raw: elKeyRaw });
                                if (elKey === fileKey || elKeyRaw === fileKey) {
                                    fileElement = el;
                                    console.log('[scrollToFileInTree] 策略2成功: 找到匹配元素');
                                    break;
                                }
                            }
                        }

                        // 策略3: 尝试不规范化，直接比对
                        if (!fileElement) {
                            console.log('[scrollToFileInTree] 策略2失败，尝试策略3: 直接原始值比对');
                            const rawFileKey = this.file.key || this.file.path || this.file.treeKey || '';
                            for (const el of allFileElements) {
                                const elKeyRaw = el.getAttribute('data-file-key') || '';
                                if (elKeyRaw === rawFileKey) {
                                    fileElement = el;
                                    console.log('[scrollToFileInTree] 策略3成功: 原始值匹配');
                                    break;
                                }
                            }
                        }

                        if (!fileElement) {
                            console.log('[scrollToFileInTree] 所有策略都失败');
                            if (window.showWarning) window.showWarning('文件在树中未找到');
                            return;
                        }

                        // 4. 滚动到视图
                        console.log('[scrollToFileInTree] 开始滚动到元素');
                        fileElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                            inline: 'nearest'
                        });

                        // 5. 高亮显示
                        fileElement.classList.add('file-tree-highlight');
                        setTimeout(() => {
                            fileElement.classList.remove('file-tree-highlight');
                        }, 2000);

                        if (window.showSuccess) window.showSuccess('已定位到文件');
                    }, delay);
                });
            }, '在文件树中定位');
        },
        showCopyButton(lineNumber) {
            this.hoveredLine = lineNumber;
        },
        hideCopyButton() {
            this.hoveredLine = null;
        },
        copyLine(lineNumber) {
            return safeExecuteAsync(async () => {
                const lineIndex = lineNumber - 1;
                if (lineIndex < 0 || lineIndex >= this.codeLines.length) return;

                const lineText = String(this.codeLines[lineIndex] || '');

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(lineText);
                } else {
                    const ta = document.createElement('textarea');
                    ta.value = lineText;
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                }

                if (window.showSuccess) window.showSuccess(`已复制第 ${lineNumber} 行`);
            }, '复制代码行');
        },
        loadHighlightFromURL() {
            return safeExecute(() => {
                const hash = window.location.hash;
                if (!hash || !hash.startsWith('#L')) return;

                // 支持单行 #L10 或范围 #L10-L20
                const match = hash.match(/#L(\d+)(?:-L(\d+))?/);
                if (!match) return;

                const startLine = parseInt(match[1], 10);
                const endLine = match[2] ? parseInt(match[2], 10) : startLine;

                if (!Number.isFinite(startLine) || startLine <= 0) return;

                const lines = [];
                for (let i = startLine; i <= endLine && i <= this.codeLines.length; i++) {
                    lines.push(i);
                }

                if (lines.length > 0) {
                    this.highlightedLines = lines;
                    this.$nextTick(() => {
                        this.scrollToLine(startLine, 'smooth');
                    });
                }
            }, '从 URL 加载高亮行');
        },
        updateURLWithHighlight() {
            return safeExecute(() => {
                if (!this.highlightedLines || this.highlightedLines.length === 0) {
                    // 清除 hash
                    if (window.location.hash) {
                        history.replaceState(null, '', window.location.pathname + window.location.search);
                    }
                    return;
                }

                const lines = [...this.highlightedLines].sort((a, b) => a - b);
                let hash;

                if (lines.length === 1) {
                    hash = `#L${lines[0]}`;
                } else {
                    // 检查是否是连续范围
                    const isRange = lines.every((line, idx) => idx === 0 || line === lines[idx - 1] + 1);
                    if (isRange) {
                        hash = `#L${lines[0]}-L${lines[lines.length - 1]}`;
                    } else {
                        // 只使用第一行
                        hash = `#L${lines[0]}`;
                    }
                }

                if (history && history.replaceState) {
                    history.replaceState(null, '', window.location.pathname + window.location.search + hash);
                } else {
                    window.location.hash = hash;
                }
            }, '更新 URL 高亮行');
        },
        toggleFullscreen() {
            return safeExecute(() => {
                this.isFullscreen = !this.isFullscreen;

                const sidebar = document.querySelector('.aicr-sidebar');
                const chatPanel = document.querySelector('.aicr-code-chat');
                const chatToggle = document.querySelector('.chat-panel-toggle');
                const codeMain = document.querySelector('.aicr-code-main');

                if (this.isFullscreen) {
                    // 进入全屏模式
                    if (sidebar) sidebar.style.display = 'none';
                    if (chatPanel) chatPanel.style.display = 'none';
                    if (chatToggle) chatToggle.style.display = 'none';
                    if (codeMain) {
                        codeMain.style.flex = '1';
                        codeMain.style.maxWidth = '100%';
                    }

                    // 添加全屏样式类
                    const codeArea = document.querySelector('.aicr-code');
                    if (codeArea) codeArea.classList.add('fullscreen-mode');

                    if (window.showSuccess) window.showSuccess('已进入全屏模式，按 ESC 退出');
                } else {
                    // 退出全屏模式
                    if (sidebar) sidebar.style.display = '';
                    if (chatPanel) chatPanel.style.display = '';
                    if (chatToggle) chatToggle.style.display = '';
                    if (codeMain) {
                        codeMain.style.flex = '';
                        codeMain.style.maxWidth = '';
                    }

                    // 移除全屏样式类
                    const codeArea = document.querySelector('.aicr-code');
                    if (codeArea) codeArea.classList.remove('fullscreen-mode');

                    if (window.showSuccess) window.showSuccess('已退出全屏模式');
                }

                // 图谱自适应：全屏切换后延迟 refit，等待 CSS 过渡完成
                this.$nextTick(() => {
                    setTimeout(() => this._refitCyGraph(), 350);
                });
            }, '切换全屏模式');
        },
        openExternalUrl() {
            return safeExecute(() => {
                if (!this.file) return;

                const fileName = this.displayFileName || this.fullFilePath || '';
                if (!fileName) {
                    if (window.showWarning) window.showWarning('无法获取文件名');
                    return;
                }

                // 确保文件名不以 / 开头
                const cleanFileName = fileName.startsWith('/') ? fileName.substring(1) : fileName;
                const url = `https://api.effiy.cn/static/${cleanFileName}`;

                window.open(url, '_blank', 'noopener,noreferrer');
            }, '在新标签页中打开静态文件');
        },
        openImagePreview() {
            return safeExecute(() => {
                const url = this.imageSrc;
                if (!url) return;

                this._ensureCodeViewImagePreviewStyle();
                this._createCodeViewImagePreviewRoot();
                this._showCodeViewImagePreview(url);
            }, '打开图片预览');
        },
        _ensureCodeViewImagePreviewStyle() {
            try {
                if (__codeViewImagePreviewStyleMounted) return;
                if (typeof document === 'undefined') return;
                const existing = document.getElementById('codeview-image-preview-style');
                if (existing) {
                    __codeViewImagePreviewStyleMounted = true;
                    return;
                }
                const style = document.createElement('style');
                style.id = 'codeview-image-preview-style';
                style.textContent = `
                    #codeview-image-preview{color:var(--yi-text-on-primary);opacity:0;pointer-events:auto;transition:opacity 140ms ease}
                    #codeview-image-preview.is-open{opacity:1}
                    #codeview-image-preview .codeview-image-preview-frame{position:relative;max-width:min(96vw,1400px);max-height:96vh;transform:translate3d(0,6px,0) scale(.985);opacity:.98;transition:transform 160ms cubic-bezier(.2,.9,.2,1),opacity 160ms ease}
                    #codeview-image-preview.is-open .codeview-image-preview-frame{transform:translate3d(0,0,0) scale(1);opacity:1}
                    #codeview-image-preview .codeview-image-preview-img{display:block;max-width:96vw;max-height:96vh;border-radius:14px;box-shadow:0 20px 80px rgba(0,0,0,.55);background:rgba(255,255,255,0.06);object-fit:contain}
                    #codeview-image-preview .codeview-image-preview-toolbar{position:absolute;top:10px;right:10px;display:flex;gap:8px;align-items:center}
                    #codeview-image-preview .codeview-image-preview-btn{position:relative;top:auto;right:auto;transform:none;height:34px;padding:0 12px;border-radius:12px;border:1px solid rgba(var(--yi-dark-text-secondary-rgb), 0.22);background:rgba(var(--yi-dark-surface-rgb), 0.38);color:var(--yi-text-on-primary);font-size:13px;cursor:pointer;backdrop-filter:blur(10px)}
                    #codeview-image-preview .codeview-image-preview-close{position:relative;top:auto;right:auto;transform:none;width:38px;height:38px;padding:0;font-size:18px;background:rgba(var(--yi-dark-surface-rgb), 0.46)}
                    #codeview-image-preview .codeview-image-preview-btn:hover{background:rgba(var(--yi-dark-surface-rgb), 0.6);border-color:rgba(var(--yi-dark-text-secondary-rgb), 0.3)}
                    #codeview-image-preview .codeview-image-preview-btn:active{transform:translateY(1px)}
                `.trim();
                document.head.appendChild(style);
                __codeViewImagePreviewStyleMounted = true;
            } catch (_) { }
        },
        _createCodeViewImagePreviewRoot() {
            if (__codeViewImagePreviewRoot) return;

            const root = document.createElement('div');
            root.id = 'codeview-image-preview';
            root.className = 'codeview-image-preview';
            root.setAttribute('role', 'dialog');
            root.setAttribute('aria-modal', 'true');
            root.style.cssText = 'position:fixed;inset:0;z-index:var(--z-overlay);display:none;align-items:center;justify-content:center;padding:18px;background:rgba(var(--yi-dark-surface-rgb), 0.72);backdrop-filter:blur(2px)';
            root.innerHTML = `
                <div class="codeview-image-preview-frame">
                    <img class="codeview-image-preview-img" alt="预览图片" />
                    <div class="codeview-image-preview-toolbar" aria-label="图片工具栏">
                        <button type="button" class="codeview-image-preview-btn codeview-image-preview-download" title="下载" aria-label="下载">下载</button>
                        <button type="button" class="codeview-image-preview-btn codeview-image-preview-close" title="关闭（Esc）" aria-label="关闭">✕</button>
                    </div>
                </div>
            `;

            root.addEventListener('click', (e) => {
                try {
                    const t = e && e.target;
                    const close = t && t.closest ? t.closest('.codeview-image-preview-close') : null;
                    if (close) {
                        if (e && typeof e.preventDefault === 'function') e.preventDefault();
                        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                        this._closeCodeViewImagePreview({ immediate: true });
                        return;
                    }
                    const download = t && t.closest ? t.closest('.codeview-image-preview-download') : null;
                    if (download) {
                        if (e && typeof e.preventDefault === 'function') e.preventDefault();
                        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                        this._downloadCodeViewPreviewImage();
                        return;
                    }
                    const frame = t && t.closest ? t.closest('.codeview-image-preview-frame') : null;
                    if (!frame) this._closeCodeViewImagePreview({ immediate: false });
                } catch (_) { }
            });

            document.body.appendChild(root);
            __codeViewImagePreviewRoot = root;

            if (!__codeViewImagePreviewKeydownHandler) {
                __codeViewImagePreviewKeydownHandler = (e) => {
                    try {
                        if (!this._isCodeViewImagePreviewOpen()) return;
                        if (!e) return;
                        const key = String(e.key || '');
                        if (key !== 'Escape' && key !== 'Esc') return;
                        if (typeof e.preventDefault === 'function') e.preventDefault();
                        if (typeof e.stopPropagation === 'function') e.stopPropagation();
                        this._closeCodeViewImagePreview({ immediate: true });
                    } catch (_) { }
                };
                document.addEventListener('keydown', __codeViewImagePreviewKeydownHandler, true);
            }
        },
        _showCodeViewImagePreview(url) {
            if (!__codeViewImagePreviewRoot) return;

            const img = __codeViewImagePreviewRoot.querySelector('.codeview-image-preview-img');
            if (img) img.src = url;

            if (__codeViewImagePreviewCloseTimer) clearTimeout(__codeViewImagePreviewCloseTimer);
            __codeViewImagePreviewCloseTimer = 0;

            __codeViewImagePreviewRoot.style.display = 'flex';
            if (__codeViewImagePreviewRoot.classList) __codeViewImagePreviewRoot.classList.remove('is-open');

            requestAnimationFrame(() => {
                try {
                    if (__codeViewImagePreviewRoot && __codeViewImagePreviewRoot.classList) {
                        __codeViewImagePreviewRoot.classList.add('is-open');
                    }
                } catch (_) { }
            });

            __codeViewImagePreviewSrc = url;

            try {
                __codeViewImagePreviewPrevActiveEl = document.activeElement || null;
                const closeBtn = __codeViewImagePreviewRoot.querySelector('.codeview-image-preview-close');
                if (closeBtn && typeof closeBtn.focus === 'function') {
                    closeBtn.focus({ preventScroll: true });
                }
            } catch (_) { }
        },
        _closeCodeViewImagePreview(options = {}) {
            try {
                if (!__codeViewImagePreviewRoot) return;

                if (__codeViewImagePreviewCloseTimer) clearTimeout(__codeViewImagePreviewCloseTimer);
                __codeViewImagePreviewCloseTimer = 0;

                if (__codeViewImagePreviewRoot.classList) {
                    __codeViewImagePreviewRoot.classList.remove('is-open');
                }

                const immediate = options && options.immediate === true;
                if (immediate) {
                    __codeViewImagePreviewRoot.style.display = 'none';
                } else {
                    const root = __codeViewImagePreviewRoot;
                    __codeViewImagePreviewCloseTimer = setTimeout(() => {
                        try {
                            if (root) root.style.display = 'none';
                        } catch (_) { }
                    }, 170);
                }

                __codeViewImagePreviewSrc = '';

                try {
                    const prev = __codeViewImagePreviewPrevActiveEl;
                    __codeViewImagePreviewPrevActiveEl = null;
                    if (prev && typeof prev.focus === 'function') {
                        prev.focus({ preventScroll: true });
                    }
                } catch (_) { }
            } catch (_) { }
        },
        _isCodeViewImagePreviewOpen() {
            try {
                return !!(__codeViewImagePreviewRoot && __codeViewImagePreviewRoot.style.display === 'flex');
            } catch (_) {
                return false;
            }
        },
        _downloadCodeViewPreviewImage() {
            return safeExecute(() => {
                const url = __codeViewImagePreviewSrc;
                if (!url) return;

                const filename = String(this.displayFileName || 'image.png').replace(/\s+/g, '_');
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();

                if (window.showSuccess) window.showSuccess('开始下载图片');
            }, '下载图片');
        },

        /* ── 知识图谱 ── */

        // 规范化图谱数据：兼容 Cytoscape 格式 { data: {...}, classes: "..." } → 扁平对象
        _normalizeGraphNodes(rawNodes) {
            if (!Array.isArray(rawNodes)) return [];
            return rawNodes.map(n => {
                // Cytoscape 格式：属性嵌套在 data 下
                if (n.data && typeof n.data === 'object') {
                    return { ...n.data, _classes: n.classes || '' };
                }
                return n;
            });
        },
        _normalizeGraphEdges(rawEdges) {
            if (!Array.isArray(rawEdges)) return [];
            return rawEdges.map(e => {
                if (e.data && typeof e.data === 'object') {
                    const flat = { ...e.data, _classes: e.classes || '' };
                    // 兼容 type → relation 映射
                    if (!flat.relation && flat.type) flat.relation = flat.type;
                    return flat;
                }
                // 扁平格式也做兼容映射
                if (!e.relation && e.type) e.relation = e.type;
                return e;
            });
        },

        toggleKnowledgeGraph() {
            if (this.showKnowledgeGraph) {
                this.closeKnowledgeGraph();
                return;
            }
            this.showKnowledgeGraph = true;
            this.kgError = '';
            if (!this.kgGraphData) {
                this.loadKnowledgeGraph();
            }
        },

        closeKnowledgeGraph() {
            this.showKnowledgeGraph = false;
        },

        async loadKnowledgeGraph() {
            if (this.kgLoading) return;
            this.kgLoading = true;
            this.kgError = '';

            try {
                const langType = this.languageType;
                const filePath = this.fullFilePath || '';
                const fileName = this.kgSourceFileName;

                // Case 1: File is already a knowledge-graph.json → parse from loaded content
                if (langType === 'json' && (fileName === 'knowledge-graph.json' || filePath.includes('knowledge-graph.json'))) {
                    const raw = String(this.rawContent || '');
                    const data = raw ? JSON.parse(raw) : await this._fetchKgJson(this._resolveKgUrl(filePath, this.kgSourceStoryDir));
                    const nodes = this._normalizeGraphNodes(data.graph?.nodes || []);
                    const edges = this._normalizeGraphEdges(data.graph?.edges || []);
                    this.kgGraphData = { nodes, edges };
                    this.kgTitle = (data.story && data.story.name) || fileName;
                    this.kgAllNodes = nodes;
                    this.kgMatchedIds = null;
                    this.kgSourceScenarios = (data.story && data.story.scenarios) || [];
                    this.kgGraphOverview = this._buildGraphOverview(nodes, edges, data, false, 0);
                    return;
                }

                // Case 2: File is story-deps.json → parse from loaded content
                if (fileName === 'story-deps.json' || filePath.includes('story-deps.json')) {
                    const raw = String(this.rawContent || '');
                    const data = raw ? JSON.parse(raw) : await this._fetchKgJson(this._resolveKgUrl(filePath, ''));
                    // story-deps.json uses "knowledgeGraph" key (not "graph")
                    const nodes = this._normalizeGraphNodes(data.knowledgeGraph?.nodes || []);
                    const edges = this._normalizeGraphEdges(data.knowledgeGraph?.edges || []);
                    this.kgGraphData = { nodes, edges };
                    // story-deps.json has "project.name" for display title
                    this.kgTitle = (data.project && data.project.name) || '故事依赖关系图';
                    this.kgAllNodes = nodes;
                    this.kgMatchedIds = null;
                    // story-deps.json uses "scenes" (map) instead of "story.scenarios" (array)
                    const scenesMap = data.scenes || {};
                    this.kgSourceScenarios = Object.entries(scenesMap).map(([id, sc]) => ({
                        id,
                        name: sc.name || id,
                        description: sc.description || '',
                        graphNodes: sc.nodes || [],
                        story: sc.story || '',
                        storyLabel: sc.storyLabel || '',
                    }));
                    this.kgGraphOverview = this._buildGraphOverview(nodes, edges, data, false, 0);
                    return;
                }

                // Case 3: MD file under 故事任务面板 → find story dir and load KG directly
                const storyDir = this.kgSourceStoryDir;
                if (!storyDir) {
                    this.kgError = '无法确定故事目录';
                    return;
                }

                const kgFilePath = `docs/故事任务面板/${storyDir}/knowledge-graph.json`;
                const data = await this._fetchKgJson(`/${kgFilePath}`);
                const allNodes = this._normalizeGraphNodes(data.graph?.nodes || []);
                const allEdges = this._normalizeGraphEdges(data.graph?.edges || []);
                this.kgAllNodes = allNodes;
                this.kgSourceScenarios = (data.story && data.story.scenarios) || [];

                // Find nodes related to this MD file
                const relatedNodeIds = new Set();
                const fileNameClean = fileName.replace(/\\/g, '/').split('/').pop() || '';
                const fileBase = fileNameClean.replace(/\.md$/i, '');
                const fileSceneIdx = (fileBase.match(/^场景(\d+)/) || [])[1];
                const fileSceneNum = fileSceneIdx ? parseInt(fileSceneIdx, 10) : null;
                const scenarios = data.story?.scenarios || [];

                // Strategy A: Search node.mdFiles for matching file name
                for (const node of allNodes) {
                    for (const mf of (node.mdFiles || [])) {
                        const mfFile = (mf.file || '').replace(/\\/g, '/').split('/').pop() || '';
                        if (mfFile === fileNameClean ||
                            mfFile === fileBase ||
                            mfFile.includes(fileBase) ||
                            fileBase.includes(mfFile)) {
                            relatedNodeIds.add(node.id);
                            break;
                        }
                    }
                }

                // Strategy B: Direct scenarioIndex matching (most reliable)
                if (fileSceneNum !== null) {
                    // B1: Match mdFiles with same scenarioIndex
                    for (const node of allNodes) {
                        for (const mf of (node.mdFiles || [])) {
                            if (mf.scenarioIndex === fileSceneNum - 1) {
                                relatedNodeIds.add(node.id);
                                break;
                            }
                        }
                    }
                    // B2: Add all graphNodes from the matching scenario
                    const scenarioIdx = fileSceneNum - 1;
                    if (scenarioIdx >= 0 && scenarioIdx < scenarios.length) {
                        for (const nid of (scenarios[scenarioIdx].graphNodes || [])) {
                            relatedNodeIds.add(nid);
                        }
                    }
                }

                // Strategy C: Scenario name fuzzy matching
                if (relatedNodeIds.size === 0) {
                    for (let si = 0; si < scenarios.length; si++) {
                        const sn = (scenarios[si].name || '');
                        const snNorm = sn.replace(/[·•—–]\s*/g, '-').replace(/\s+/g, '');
                        const fbNorm = fileBase.replace(/[·•—–]\s*/g, '-').replace(/\s+/g, '');
                        const sceneNum = sn.match(/^场景(\d+)/);
                        if (snNorm.includes(fbNorm) ||
                            fbNorm.includes(snNorm.split('-')[0] || '') ||
                            (sceneNum && fileSceneNum === parseInt(sceneNum[1], 10))) {
                            for (const nid of (scenarios[si].graphNodes || [])) {
                                relatedNodeIds.add(nid);
                            }
                        }
                    }
                }

                // Strategy D: Keyword-based matching
                if (relatedNodeIds.size === 0) {
                    const keywords = fileBase.split(/[-·•\s]+/).filter(k => k.length > 1);
                    for (const node of allNodes) {
                        const searchText = `${node.file || ''} ${node.label || ''} ${node.description || ''} ${(node.keyFunctions || []).join(' ')}`;
                        if (keywords.some(kw => searchText.includes(kw))) {
                            relatedNodeIds.add(node.id);
                        }
                    }
                }

                // 始终展示完整图谱，关联节点高亮 + 其余 dim
                this.kgMatchedIds = relatedNodeIds.size > 0 ? new Set(relatedNodeIds) : null;
                const hasMatches = relatedNodeIds.size > 0;

                // 使用全部节点，不裁剪 — matched 类用于高亮
                this.kgGraphData = { nodes: allNodes, edges: allEdges };
                this.kgTitle = hasMatches
                    ? `${(data.story && data.story.name) || storyDir} · ${fileNameClean.replace(/\.md$/i, '')}`
                    : `${(data.story && data.story.name) || storyDir} (全部节点)`;

                // Build overview
                this.kgGraphOverview = this._buildGraphOverview(
                    allNodes, allEdges, data, hasMatches,
                    this.kgMatchedIds ? this.kgMatchedIds.size : 0
                );
                if (!this.kgGraphOverview.storyName) {
                    this.kgGraphOverview.storyName = storyDir;
                }

            } catch (err) {
                console.error('[CodeView] 加载知识图谱失败:', err);
                this.kgError = err.message || '加载知识图谱失败';
                this.kgGraphData = null;
            } finally {
                this.kgLoading = false;
                if (this.kgGraphData) {
                    this.$nextTick(() => this.renderKgGraph());
                }
            }
        },

        async _fetchKgJson(url) {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`无法加载知识图谱: HTTP ${resp.status}，URL: ${url}`);
            const ct = resp.headers.get('content-type') || '';
            if (!ct.includes('application/json') && !ct.includes('text/json')) {
                throw new Error(`知识图谱文件响应非 JSON 格式（${ct || '未知'}），URL: ${url}`);
            }
            return resp.json();
        },

        _resolveKgUrl(filePath, storyDir) {
            // 策略 1: filePath 已含 docs/ 前缀 → 直接使用
            const fp = String(filePath || '');
            if (fp.startsWith('docs/')) return `/${fp}`;
            if (fp.startsWith('故事任务面板/')) return `/docs/${fp}`;

            // 策略 2: 从 filePath 提取故事目录名，构造 docs/故事任务面板/<dir>/<file> 路径
            const fileName = fp.split('/').pop() || '';
            const m = fp.match(/故事任务面板\/([^/]+)\//);
            const dir = m ? m[1] : (storyDir || this.kgSourceStoryDir || '');
            if (dir && fileName) {
                return `/docs/故事任务面板/${dir}/${fileName}`;
            }

            return `/${fp}`;
        },

        closeKnowledgeGraph() {
            this.showKnowledgeGraph = false;
            this.kgFullscreen = false;
            this._destroyCyGraph();
        },

        toggleKgFullscreen() {
            this.kgFullscreen = !this.kgFullscreen;
            this.$nextTick(() => {
                if (this._cy) {
                    this._cy.resize();
                    this._smartFit(40);
                }
            });
        },

        /* ── 图谱渲染 ── */

        renderKgGraph() {
            if (typeof cytoscape === 'undefined') {
                this.kgError = 'Cytoscape.js 未加载';
                return;
            }
            // 手动注册 dagre 布局（cytoscape-dagre CDN 不会自动注册）
            if (typeof cytoscapeDagre !== 'undefined' && typeof cytoscapeDagre === 'function') {
                try { cytoscapeDagre(cytoscape); } catch (_) {}
            }
            this.$nextTick(() => {
                const container = this.$refs.kgCanvas;
                if (!container || !this.kgGraphData) return;
                this._initCyGraph(container);
            });
        },

        _initCyGraph(container) {
            if (this._cy) { this._cy.destroy(); this._cy = null; }
            this.kgSelectedNode = null;
            this.kgBreadcrumb = { path: [], layer: this.kgLayer };

            // 清理旧 resize 观察器
            if (this._kgResizeObserver) {
                this._kgResizeObserver.disconnect();
                this._kgResizeObserver = null;
            }

            const data = this.kgGraphData;
            if (!data || !data.nodes || !data.nodes.length) return;
            const matchedIds = this.kgMatchedIds; // Set or null

            // ── 节点类型 → 形状 + 色彩映射 ──
            const TYPE_DEFS = {
                story:    { color: '#F59E0B', shape: 'round-rectangle', label: '故事' },
                scenario: { color: '#7DD3FC', shape: 'diamond',        label: '场景' },
                source:   { color: '#4ADE80', shape: 'ellipse',        label: '源码' },
                test:     { color: '#DC2626', shape: 'vee',            label: '测试' },
                view:     { color: '#3B82F6', shape: 'ellipse',        label: '视图' },
                entry:    { color: '#10B981', shape: 'ellipse',        label: '入口' },
                service:  { color: '#F59E0B', shape: 'ellipse',        label: '服务' },
                utility:  { color: '#A855F7', shape: 'ellipse',        label: '工具' },
                component:{ color: '#06B6D4', shape: 'ellipse',        label: '组件' },
                framework:{ color: '#8B5CF6', shape: 'ellipse',        label: '框架' },
                config:   { color: '#F97316', shape: 'rectangle',      label: '配置' },
                state:    { color: '#EC4899', shape: 'ellipse',        label: '状态' },
                event:    { color: '#EF4444', shape: 'ellipse',        label: '事件' },
                method:   { color: '#6366F1', shape: 'ellipse',        label: '方法' },
                doc:      { color: '#6B7280', shape: 'ellipse',        label: '文档' },
                external: { color: '#9CA3AF', shape: 'ellipse',        label: '外部' },
                storage:  { color: '#EC4899', shape: 'ellipse',        label: '存储' },
            };

            // 颜色 + 形状分配：TYPE_DEFS 查找，hash 兜底
            const resolveNodeDef = (n) => {
                const file = n.file || '';
                const isTestFile = /[\/\\](test|tests|__tests__)[\/\\]/.test(file) ||
                    /\.(test|spec)\.\w+$/.test(file) ||
                    /[\/\\](test|spec)_\w+\.\w+$/.test(file) ||
                    /^test[\/\\]/.test(file) ||
                    n.type === 'test';
                if (isTestFile) return { color: '#DC2626', shape: 'vee' };
                if (TYPE_DEFS[n.type]) return { ...TYPE_DEFS[n.type] };
                // 基于 id 哈希分配颜色
                const hash = String(n.id || '').split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);
                const hue = Math.abs(hash) % 360;
                return { color: `hsl(${hue}, 55%, 50%)`, shape: 'ellipse' };
            };

            // ── 度数统计 + 对数尺度节点大小 ──
            const degree = {};
            for (const e of data.edges) {
                degree[e.source] = (degree[e.source] || 0) + 1;
                degree[e.target] = (degree[e.target] || 0) + 1;
            }
            const maxDeg = Math.max(1, ...Object.values(degree));
            const BASE_SIZES = { story: 28, scenario: 22, source: 16, test: 14 };
            // 对数尺度: size = base + log2(1 + degree) * scale
            const nodeSize = (type, d) => {
                const base = BASE_SIZES[type] || 16;
                const logScale = Math.log2(1 + d);
                return base + logScale * 6;
            };

            const elements = [];
            for (const n of data.nodes) {
                const d = degree[n.id] || 0;
                const { color, shape } = resolveNodeDef(n);
                const isMatched = matchedIds ? matchedIds.has(n.id) : false;
                const size = isMatched ? nodeSize(n.type, d) + 8 : nodeSize(n.type, d);
                elements.push({
                    group: 'nodes',
                    classes: isMatched ? 'matched' : '',
                    data: {
                        id: n.id, label: n.label || n.id,
                        color, shape,
                        file: n.file || '', description: n.description || '',
                        degree: d, size, matched: isMatched,
                        functions: (n.keyFunctions || []).join(', '),
                        type: n.type || '', group: n.group || '',
                        mdFiles: n.mdFiles || [],
                    },
                });
            }
            for (const e of data.edges) {
                elements.push({
                    group: 'edges',
                    data: {
                        id: `${e.source}_${e.relation}_${e.target}`,
                        source: e.source, target: e.target,
                        label: e.label || '', relation: e.relation || '',
                    },
                });
            }

            const cy = cytoscape({
                container,
                elements,
                style: [
                    // ── 基础节点 ──
                    { selector: 'node', style: {
                        'background-color': 'data(color)',
                        'background-opacity': 0.82,
                        'label': 'data(label)',
                        'color': '#F1F5F9', 'font-size': '12px', 'font-weight': '600',
                        'text-valign': 'bottom', 'text-halign': 'center',
                        'text-margin-y': 8, 'text-max-width': '160px',
                        'text-wrap': 'ellipsis',
                        'width': 'data(size)', 'height': 'data(size)',
                        'border-width': 2, 'border-color': '#FFFFFF',
                        'border-opacity': 0.25, 'shape': 'data(shape)',
                        'transition-property': 'border-color, border-width, border-opacity, width, height, background-opacity',
                        'transition-duration': 200,
                        'text-opacity': 0.85,
                    }},
                    // ── 选中节点: 白色光环 + 强阴影 ──
                    { selector: 'node:selected', style: {
                        'border-width': 5, 'border-color': '#FFFFFF', 'border-opacity': 1,
                        'shadow-blur': 20, 'shadow-color': 'data(color)', 'shadow-opacity': 0.6,
                        'shadow-offset-x': 0, 'shadow-offset-y': 0,
                        'background-opacity': 0.95,
                    }},
                    // ── 高亮节点: 白环 ──
                    { selector: 'node.highlighted', style: {
                        'border-width': 5, 'border-color': '#FFFFFF', 'border-opacity': 0.95,
                        'shadow-blur': 14, 'shadow-color': 'data(color)', 'shadow-opacity': 0.45,
                        'background-opacity': 0.9,
                    }},
                    // ── 暗化: 几乎透明 ──
                    { selector: 'node.dimmed', style: { 'opacity': 0.08, 'text-opacity': 0 }},
                    // ── MD文件关联节点: 金色光环 ──
                    { selector: 'node.matched', style: {
                        'border-width': 6, 'border-color': '#FBBF24', 'border-opacity': 1,
                        'shadow-blur': 28, 'shadow-color': '#F59E0B', 'shadow-opacity': 0.7,
                        'shadow-spread': 12, 'z-index': 100, 'background-opacity': 0.95,
                    }},
                    { selector: 'edge', style: {
                        'width': 1.6, 'line-color': '#475569', 'target-arrow-color': '#64748B',
                        'target-arrow-shape': 'triangle', 'arrow-scale': 0.9,
                        'curve-style': 'bezier', 'label': '',
                        'color': '#64748B', 'font-size': '9px',
                        'text-rotation': 'autorotate', 'opacity': 0.55,
                        'transition-property': 'opacity, width, line-color, target-arrow-color',
                        'transition-duration': 180,
                    }},
                    { selector: 'edge.highlighted', style: {
                        'width': 3, 'line-color': '#E2E8F0', 'target-arrow-color': '#E2E8F0',
                        'opacity': 0.95, 'label': 'data(label)',
                    }},
                    { selector: 'edge.dimmed', style: { 'opacity': 0.03 }},
                    { selector: 'edge.matched', style: {
                        'width': 3, 'line-color': '#FBBF24', 'target-arrow-color': '#F59E0B',
                        'opacity': 0.9, 'z-index': 50,
                    }},
                    { selector: 'node.hover', style: {
                        'border-width': 5, 'border-color': '#FFFFFF', 'border-opacity': 0.8,
                        'z-index': 10,
                        'transition-duration': 120,
                    }},
                    { selector: 'edge.hover', style: {
                        'width': 2.8, 'line-color': '#60A5FA', 'target-arrow-color': '#60A5FA',
                        'opacity': 0.85, 'z-index': 5, 'label': 'data(label)',
                    }},
                ],
                layout: { name: 'preset' },
                minZoom: 0.02, maxZoom: 10, wheelSensitivity: 0.3,
                // Enable box selection for multi-node operations
                boxSelectionEnabled: true,
                selectionType: 'additive',
                autounselectify: false,
            });

            this._cy = cy;

            // ── 缩放自适应标签：缩小时隐藏标签，放大时显示 ──
            const updateLabelVisibility = () => {
                const zoom = cy.zoom();
                if (zoom < 0.25) {
                    cy.nodes().style({ 'font-size': '0px', 'text-margin-y': 0, 'text-opacity': 0 });
                } else if (zoom < 0.5) {
                    cy.nodes().style({ 'font-size': '9px', 'text-margin-y': 4, 'text-opacity': 0.6 });
                } else if (zoom < 0.8) {
                    cy.nodes().style({ 'font-size': '11px', 'text-margin-y': 6, 'text-opacity': 0.8 });
                } else {
                    cy.nodes().style({ 'font-size': '12px', 'text-margin-y': 8, 'text-opacity': 0.9 });
                }
            };
            cy.on('zoom', updateLabelVisibility);

            // ── 节点拖拽：允许手动调整布局 ──
            cy.nodes().ungrabify(); // 默认不可拖拽，防止误操作
            // Alt+拖拽 可移动节点
            let _dragEnabled = false;
            const toggleDrag = (e) => {
                if (e.key === 'Alt') {
                    if (e.type === 'keydown' && !_dragEnabled) {
                        _dragEnabled = true;
                        cy.nodes().grabify();
                        container.style.cursor = 'grab';
                    } else if (e.type === 'keyup' && _dragEnabled) {
                        _dragEnabled = false;
                        cy.nodes().ungrabify();
                        container.style.cursor = '';
                    }
                }
            };
            window.addEventListener('keydown', toggleDrag);
            window.addEventListener('keyup', toggleDrag);
            // 清理函数存储到实例
            cy._cleanupDragKeys = () => {
                window.removeEventListener('keydown', toggleDrag);
                window.removeEventListener('keyup', toggleDrag);
            };

            // Hover effects — separate hover class, with edge label reveal
            cy.on('mouseover', 'node', (evt) => {
                const node = evt.target;
                node.addClass('hover');
                const connected = node.connectedEdges();
                connected.addClass('hover');
                container.style.cursor = 'pointer';
            });
            cy.on('mouseout', 'node', (evt) => {
                evt.target.removeClass('hover');
                evt.target.connectedEdges().removeClass('hover');
                container.style.cursor = '';
            });
            // Edge hover: show label
            cy.on('mouseover', 'edge', (evt) => {
                const edge = evt.target;
                edge.style({ 'label': edge.data('label'), 'opacity': 0.9, 'width': 2.8, 'line-color': '#94A3B8', 'target-arrow-color': '#94A3B8', 'transition-duration': 120 });
                container.style.cursor = 'crosshair';
            });
            cy.on('mouseout', 'edge', (evt) => {
                const edge = evt.target;
                if (!edge.hasClass('highlighted') && !edge.hasClass('matched')) {
                    edge.style({ 'label': '', 'opacity': 0.55, 'width': 1.6, 'line-color': '#475569', 'target-arrow-color': '#64748B' });
                }
                container.style.cursor = '';
            });

            // ── 单击 / 双击去抖 ──
            let _tapTimer = null;

            cy.on('tap', 'node', (evt) => {
                if (_tapTimer) { clearTimeout(_tapTimer); _tapTimer = null; }
                const node = evt.target;
                _tapTimer = setTimeout(() => {
                    _tapTimer = null;
                    if (!node.removed()) this._selectKgNodeDetail(node, cy);
                }, 280);
            });

            cy.on('tap', (evt) => {
                if (evt.target === cy) {
                    cy.elements().removeClass('highlighted dimmed');
                    if (this.kgMatchedIds && this.kgMatchedIds.size > 0) {
                        const matched = cy.nodes().filter(n => this.kgMatchedIds.has(n.data('id')));
                        matched.addClass('matched');
                        cy.nodes().not(matched).addClass('dimmed');
                        cy.edges().addClass('dimmed');
                        matched.connectedEdges().removeClass('dimmed');
                    }
                    this.kgSelectedNode = null;
                    this._updateBreadcrumb();
                }
            });

            cy.on('dbltap', 'node', (evt) => {
                if (_tapTimer) { clearTimeout(_tapTimer); _tapTimer = null; }
                const node = evt.target;
                const nd = node.data();
                const kind = this._getNodeKind(nd);
                const neighbors = node.closedNeighborhood();

                if (this.kgLayer === 1 && kind === 'source') {
                    this.kgLayer = 2;
                    cy.elements().removeClass('highlighted dimmed');
                    node.addClass('highlighted');
                    neighbors.nodes().removeClass('dimmed');
                    neighbors.edges().removeClass('dimmed').addClass('highlighted');
                    cy.nodes().not(neighbors.nodes()).addClass('dimmed');
                    cy.edges().not(neighbors.edges()).addClass('dimmed');
                } else {
                    cy.elements().removeClass('highlighted dimmed');
                    node.addClass('highlighted');
                    neighbors.nodes().removeClass('dimmed');
                    neighbors.edges().removeClass('dimmed').addClass('highlighted');
                    cy.nodes().not(neighbors.nodes()).addClass('dimmed');
                    cy.edges().not(neighbors.edges()).addClass('dimmed');
                }

                // 脉冲动画：白 → 金 → 白
                node.style({ 'border-width': 8, 'border-color': '#FFFFFF', 'border-opacity': 1, 'transition-duration': 80 });
                setTimeout(() => {
                    if (!node.removed()) {
                        node.style({ 'border-width': 5, 'border-color': '#F59E0B', 'border-opacity': 0.95, 'shadow-blur': 18, 'shadow-color': '#F59E0B', 'shadow-opacity': 0.55, 'transition-duration': 180 });
                    }
                }, 100);
                setTimeout(() => {
                    if (!node.removed()) {
                        node.style({ 'border-width': 3, 'border-color': '#FFFFFF', 'border-opacity': 0.9, 'shadow-blur': 0, 'shadow-opacity': 0, 'transition-duration': 250 });
                    }
                }, 350);

                // 平滑缩放过渡
                cy.stop();
                cy.fit(neighbors.nodes(), 50);
                const tZoom = cy.zoom();
                const tPan = cy.pan();
                cy.zoom(tZoom * 0.82);
                cy.pan(tPan);
                cy.animate({ zoom: tZoom, pan: tPan }, { duration: 420, easing: 'ease-in-out-cubic' });

                if (!node.removed()) this._selectKgNodeDetail(node, cy);
            });

            cy.on('dbltap', (evt) => {
                if (evt.target !== cy) return;
                if (this.kgLayer > 1) {
                    this.kgLayer--;
                    this._applyLayerFilter(cy);
                } else {
                    this.resetKgFilter();
                }
            });

            // ── Run dynamic layout: COSE 力导向优先 → dagre → breadthfirst → grid ──
            const layouts = [
                { name: 'cose', animate: true, animationDuration: 800, fit: true, padding: 50,
                    nodeRepulsion: 12000, idealEdgeLength: 120, edgeElasticity: 0.35,
                    gravity: 0.25, numIter: 3000, initialTemp: 200, coolingFactor: 0.92,
                    nodeDimensionsIncludeLabels: true, randomize: true },
                { name: 'dagre', rankDir: 'TB', spacingFactor: 1.5, nodeDimensionsIncludeLabels: true, animate: true, animationDuration: 500, fit: true, padding: 50 },
                { name: 'breadthfirst', directed: true, spacingFactor: 1.4, animate: true, fit: true, padding: 50 },
                { name: 'cose', animate: true, fit: true, padding: 50, nodeRepulsion: 8000, idealEdgeLength: 100 },
                { name: 'grid', animate: false, fit: true, padding: 50 },
            ];
            let layoutApplied = false;
            for (const opts of layouts) {
                try {
                    const run = cy.layout(opts);
                    run.run();
                    layoutApplied = true;
                    break;
                } catch (_) {}
            }
            // 如果所有布局都失败了，使用 preset 布局
            if (!layoutApplied) {
                try { cy.layout({ name: 'preset', fit: true, padding: 50 }).run(); } catch (_) {}
            }

            // MD 文件关联：高亮匹配节点 + dim 其余 + 聚焦匹配区域
            if (this.kgMatchedIds && this.kgMatchedIds.size > 0) {
                const matchedNodes = cy.nodes().filter(n => this.kgMatchedIds.has(n.data('id')));
                matchedNodes.addClass('matched');
                // 非匹配节点和边 dim
                cy.nodes().not(matchedNodes).addClass('dimmed');
                cy.edges().addClass('dimmed');
                // 匹配节点的边恢复可见
                matchedNodes.connectedEdges().removeClass('dimmed');
                // 聚焦到匹配节点
                if (matchedNodes.length <= 20) {
                    cy.fit(matchedNodes, 60);
                }
            }

            // 自适应视图：ResizeObserver 监听容器尺寸变化
            this._kgResizeObserver = new ResizeObserver(() => {
                if (this._cy) {
                    this._cy.resize();
                    this._smartFit(30);
                }
            });
            this._kgResizeObserver.observe(container);

            // 初始应用层级过滤（默认 L2 显示全部节点）
            this.$nextTick(() => this._applyLayerFilter(cy));
        },

        _refitCyGraph() {
            if (this._cy) {
                this._cy.resize();
                if (!this.kgActiveFilter) {
                    this._smartFit(30);
                }
            }
        },

        // ── 节点分类：故事 / 场景 / 源码 ──
        _getNodeKind(nd) {
            const type = nd.type || '';
            const file = nd.file || '';
            if (type === 'story') return 'story';
            if (type === 'scenario' || type === 'doc' || file.endsWith('.md')) return 'scenario';
            return 'source';
        },

        firstSentence(text) {
            if (!text) return '';
            const s = String(text);
            // 在第一个句末标点处截断
            const m = s.match(/^(.+?)[.。；;！!\n](.*)/s);
            if (m && m[1].length > 10) return m[1] + '。';
            // 如果第一句太短或没找到标点，返回前 80 字
            return s.length > 80 ? s.slice(0, 80) + '...' : s;
        },

        fitView() {
            if (this._cy) {
                this._cy.stop();
                this._smartFit(40);
            }
        },

        _smartFit(padding = 40) {
            if (!this._cy) return;
            const highlighted = this._cy.elements('.highlighted');
            if (highlighted.length > 0) {
                this._cy.fit(highlighted, padding);
                return;
            }
            const matched = this._cy.elements('.matched');
            if (matched.length > 0) {
                this._cy.fit(matched, padding);
                return;
            }
            this._cy.fit(undefined, padding);
        },

        // ── 按层级过滤图谱节点显示 ──
        _applyLayerFilter(cy) {
            cy.batch(() => {
                cy.elements().removeClass('highlighted dimmed');
                cy.elements().show();
                this._updateBreadcrumb();
            });
            // 更新概述统计匹配画布实际显示的节点/边数
            if (this.kgGraphOverview) {
                this.kgGraphOverview = {
                    ...this.kgGraphOverview,
                    totalNodes: cy.nodes().length,
                    totalEdges: cy.edges().length,
                };
            }
            cy.fit(undefined, 40);
        },

        /* ── 详情面板交互：点击关联边 / 邻居节点 → 图谱高亮 ── */

        toggleEdgeGroup(grp) {
            if (!grp || !this.kgSelectedNode) return;
            grp._expanded = !grp._expanded;
            if (grp._expanded) {
                grp._outShow = grp.outgoing;
                grp._inShow = grp.incoming;
            } else {
                grp._outShow = grp.outgoing.slice(0, 5);
                grp._inShow = grp.incoming.slice(0, 5);
            }
            // 触发响应式更新
            this.kgSelectedNode = { ...this.kgSelectedNode, edgeGroups: [...this.kgSelectedNode.edgeGroups] };
        },

        highlightKgEdge(edgeId) {
            if (!this._cy || !edgeId) return;
            const cy = this._cy;
            const edge = cy.getElementById(edgeId);
            if (!edge.length) return;
            // 脉冲高亮边
            cy.elements().removeClass('highlighted');
            edge.addClass('highlighted');
            edge.style({
                'line-color': '#FBBF24',
                'target-arrow-color': '#FBBF24',
                'width': 3,
                'opacity': 1,
                'transition-duration': 150,
            });
            // 高亮两端节点
            edge.connectedNodes().addClass('highlighted');
            // 动画居中
            cy.animate({ center: { eles: edge }, zoom: cy.zoom() }, { duration: 300 });
            // 短暂脉冲后恢复
            setTimeout(() => {
                if (!edge.removed()) {
                    edge.style({
                        'line-color': '#475569',
                        'target-arrow-color': '#64748B',
                        'width': 1.4,
                        'opacity': 0.5,
                    });
                }
            }, 1500);
        },

        focusKgNode(nodeId) {
            if (!this._cy || !nodeId) return;
            const cy = this._cy;
            const target = cy.getElementById(nodeId);
            if (!target.length) return;
            // 清除旧状态，高亮目标节点
            cy.elements().removeClass('highlighted dimmed');
            target.addClass('highlighted');
            // 高亮关联边
            target.connectedEdges().addClass('highlighted');
            // 动画聚焦
            cy.animate({ center: { eles: target }, zoom: 1.3 }, { duration: 400 });
            // 选中并展示详情
            this._selectKgNodeDetail(target, cy);
        },

        /* ── 节点详情提取（单击/双击共用）── */
        _selectKgNodeDetail(node, cy) {
            const nd = node.data();

            cy.elements().removeClass('highlighted dimmed');
            node.addClass('highlighted');
            node.connectedEdges().addClass('highlighted');
            node.connectedEdges().connectedNodes().removeClass('dimmed');
            // 恢复 matched 状态
            if (this.kgMatchedIds && this.kgMatchedIds.size > 0) {
                const matched = cy.nodes().filter(n => this.kgMatchedIds.has(n.data('id')));
                matched.addClass('matched');
            }

            // ── 关联边：按关系类型分组，区分出边 / 入边 ──
            const connectedEdges = node.connectedEdges();
            const edgeGroups = {}; // { relation: { label, outgoing: [], incoming: [], count, outgoingCount, incomingCount } }
            connectedEdges.forEach(e => {
                const src = e.source().data();
                const tgt = e.target().data();
                const isOut = src.id === nd.id;
                const rel = e.data('relation') || 'other';
                if (!edgeGroups[rel]) {
                    edgeGroups[rel] = {
                        relation: rel,
                        label: RELATION_LABELS[rel] || rel,
                        outgoing: [],
                        incoming: [],
                        count: 0,
                        outgoingCount: 0,
                        incomingCount: 0,
                    };
                }
                const grp = edgeGroups[rel];
                grp.count++;
                const edgeObj = {
                    edgeId: e.id(),
                    label: e.data('label'),
                    relation: rel,
                    sourceLabel: src.label,
                    targetLabel: tgt.label,
                    sourceId: src.id,
                    targetId: tgt.id,
                    isOut: isOut,
                };
                if (isOut) {
                    grp.outgoing.push(edgeObj);
                    grp.outgoingCount++;
                } else {
                    grp.incoming.push(edgeObj);
                    grp.incomingCount++;
                }
            });
            // 按边数量降序排列，每个组内最多默认展示 5 条
            const sortedEdgeGroups = Object.values(edgeGroups)
                .sort((a, b) => b.count - a.count)
                .map(grp => ({
                    ...grp,
                    _expanded: false,
                    _outShow: grp.outgoing.slice(0, 5),
                    _outMore: Math.max(0, grp.outgoing.length - 5),
                    _inShow: grp.incoming.slice(0, 5),
                    _inMore: Math.max(0, grp.incoming.length - 5),
                }));
            const totalEdges = connectedEdges.length;

            // ── 邻居节点（带关系方向）──
            const neighborMap = {}; // { id: { id, label, color, relations: [] } }
            connectedEdges.forEach(e => {
                const src = e.source().data();
                const tgt = e.target().data();
                const rel = e.data('relation') || '';
                const isOut = src.id === nd.id;
                const nbId = isOut ? tgt.id : src.id;
                if (!neighborMap[nbId]) {
                    neighborMap[nbId] = { id: nbId, label: isOut ? tgt.label : src.label, color: isOut ? tgt.color : src.color, relations: [] };
                }
                const cnLabel = RELATION_LABELS[rel] || rel;
                if (cnLabel && !neighborMap[nbId].relations.includes(cnLabel)) {
                    neighborMap[nbId].relations.push(isOut ? `→${cnLabel}` : `←${cnLabel}`);
                }
            });
            const neighbors = Object.values(neighborMap);

            // ── 面包屑联动过滤：仅展示当前场景/筛选范围内的邻居和边 ──
            const filterNodeIds = this.kgActiveFilterNodeIds;
            if (filterNodeIds && filterNodeIds.size > 0) {
                // 过滤 edgeGroups：出边看 targetId，入边看 sourceId 是否在筛选范围内
                const filteredEdgeGroups = {};
                let filteredTotalEdges = 0;
                for (const grp of sortedEdgeGroups) {
                    const filteredOut = grp.outgoing.filter(e => filterNodeIds.has(e.targetId));
                    const filteredIn = grp.incoming.filter(e => filterNodeIds.has(e.sourceId));
                    const totalFiltered = filteredOut.length + filteredIn.length;
                    if (totalFiltered > 0) {
                        const newGrp = {
                            ...grp,
                            outgoing: filteredOut,
                            incoming: filteredIn,
                            count: totalFiltered,
                            outgoingCount: filteredOut.length,
                            incomingCount: filteredIn.length,
                            _outShow: filteredOut.slice(0, 5),
                            _outMore: Math.max(0, filteredOut.length - 5),
                            _inShow: filteredIn.slice(0, 5),
                            _inMore: Math.max(0, filteredIn.length - 5),
                        };
                        filteredEdgeGroups[grp.relation] = newGrp;
                        filteredTotalEdges += totalFiltered;
                    }
                }
                sortedEdgeGroups.length = 0;
                sortedEdgeGroups.push(...Object.values(filteredEdgeGroups).sort((a, b) => b.count - a.count));
                // neighbors 也过滤到筛选范围内的节点
                const filteredNeighbors = neighbors.filter(n => filterNodeIds.has(n.id));
                this._filteredEdgesTotal = filteredTotalEdges || connectedEdges.length;
                this._filteredNeighbors = filteredNeighbors.length > 0 ? filteredNeighbors : neighbors;
            } else {
                this._filteredEdgesTotal = null;
                this._filteredNeighbors = null;
            }
            let mdFiles = [];
            try {
                const raw = nd.mdFiles;
                if (Array.isArray(raw)) {
                    mdFiles = raw;
                } else if (typeof raw === 'string' && raw) {
                    mdFiles = JSON.parse(raw);
                }
            } catch (_) { mdFiles = []; }

            // ── 架构角色描述 ──
            const typeLabels = { view: '视图', service: '服务', utility: '工具', component: '组件', config: '配置', doc: '文档', framework: '框架', test: '测试', entry: '入口', external: '外部', state: '状态', event: '事件', method: '方法' };
            const typeLabel = typeLabels[nd.type] || nd.type || '';
            const roleParts = [];
            if (typeLabel) roleParts.push(`**${typeLabel}**`);
            if (nd.group) roleParts.push(`归属 ${nd.group}`);
            const roleSummary = roleParts.join(' · ');

            // ── 依赖关系统计 ──
            const rawOutgoing = connectedEdges.filter(e => e.source().id() === nd.id).length;
            const rawIncoming = connectedEdges.length - rawOutgoing;
            const outgoing = this._filteredEdgesTotal != null
                ? sortedEdgeGroups.reduce((sum, grp) => sum + grp.outgoingCount, 0)
                : rawOutgoing;
            const incoming = this._filteredEdgesTotal != null
                ? sortedEdgeGroups.reduce((sum, grp) => sum + grp.incomingCount, 0)
                : rawIncoming;
            const depParts = [];
            if (outgoing > 0) depParts.push(`依赖 ${outgoing} 个模块`);
            if (incoming > 0) depParts.push(`被 ${incoming} 个模块依赖`);
            const depText = depParts.length ? depParts.join('，') : '无直接依赖关系';

            // ── 场景来源汇总 — 附带场景描述和索引 ──
            const scenarios = this.kgSourceScenarios || [];
            const sceneDescMap = {};
            const sceneIndexMap = {};
            for (let si = 0; si < scenarios.length; si++) {
                const sc = scenarios[si];
                sceneDescMap[sc.name || ''] = sc.description || '';
                sceneIndexMap[sc.name || ''] = si;
            }
            let enrichedMdFiles = mdFiles.map(mf => ({
                ...mf,
                _desc: sceneDescMap[mf.scenario || ''] || '',
                _sceneIdx: sceneIndexMap[mf.scenario || ''],
            }));

            // ── 上下文过滤：有激活的场景筛选 或 选中的是场景节点时，只保留当前场景的内容 ──
            const activeSceneName = (this.kgActiveFilter && this.kgActiveFilter.value) || '';
            const isSceneNode = nd.type === 'scene';
            if (activeSceneName) {
                // 只显示与当前筛选场景相关的 mdFiles
                enrichedMdFiles = enrichedMdFiles.filter(mf =>
                    (mf.scenario || '') === activeSceneName ||
                    (mf.scenario || '').includes(activeSceneName) ||
                    activeSceneName.includes(mf.scenario || '')
                );
                // 邻居节点也只保留当前场景内的（scene → contains → source）
                if (isSceneNode) {
                    // 场景节点自身：显示所包含的源节点
                    // neighbors 已从 connectedEdges 计算，保持不变
                }
            } else if (isSceneNode) {
                // 选中场景节点时，mdFiles 通常会自身引用自身，已足够
                // 无需额外过滤
            }

            const sceneSourceText = enrichedMdFiles.length
                ? `被 ${enrichedMdFiles.length} 个场景文档引用`
                : '暂无关联场景文档';

            // ── 场景名称列表 ──
            const sceneNames = enrichedMdFiles.map(m => m.scenario || '').filter(Boolean);

            // ── 架构关系叙事 ──
            const relNarrative = [
                `**模块类型**：${typeLabel || '未分类'}`,
                `**依赖关系**：${depText}`,
                totalEdges > 0 ? `**关联总数**：${totalEdges} 条边，分布于 ${sortedEdgeGroups.length} 种关系类型` : '',
                sceneNames.length ? `**场景溯源**：此模块在 ${sceneNames.length} 个场景文档的 §7 关联源码中被引用` : '',
                nd.description ? `**功能描述**：${nd.description}` : '',
            ].filter(Boolean).join('\n\n');

            // ── 关键函数拆分为列表 ──
            let functionList = [];
            try {
                const fns = nd.keyFunctions || nd.functions;
                if (Array.isArray(fns)) {
                    functionList = fns;
                } else if (typeof fns === 'string' && fns) {
                    functionList = fns.split(/[,，;；\n]+/).map(f => f.trim()).filter(Boolean);
                }
            } catch (_) { functionList = []; }

            // ── 使用过滤后的边总数和邻居（如有面包屑联动过滤）──
            const displayTotalEdges = this._filteredEdgesTotal != null ? this._filteredEdgesTotal : totalEdges;
            const displayNeighbors = this._filteredNeighbors || neighbors;

            // ── 面包屑上下文路径（用于 header 显示）──
            const contextPath = [];
            if (this.kgTitle) contextPath.push(this.kgTitle);
            if (activeSceneName) contextPath.push(activeSceneName);
            contextPath.push(nd.label);

            // ── 场景节点特有信息 ──
            let sceneOwnDescription = '';
            let sceneContainedNodes = [];
            if (isSceneNode && this.kgSourceScenarios) {
                for (const sc of this.kgSourceScenarios) {
                    if ((sc.name || '') === nd.label || nd.label.includes(sc.name || '') || (sc.name || '').includes(nd.label)) {
                        sceneOwnDescription = sc.description || '';
                        // 收集该场景包含的节点详情
                        const containedIds = new Set(sc.graphNodes || []);
                        for (const n of this.kgAllNodes || []) {
                            if (containedIds.has(n.id)) {
                                sceneContainedNodes.push({
                                    id: n.id,
                                    label: n.label || n.id,
                                    type: n.type || '',
                                    group: n.group || '',
                                    file: n.file || '',
                                    color: nd.color || '#7DD3FC',
                                });
                            }
                        }
                        break;
                    }
                }
            }

            this.kgSelectedNode = {
                label: nd.label, type: nd.type, group: nd.group,
                typeLabel: typeLabel,
                description: nd.description, file: nd.file,
                functions: functionList.length ? functionList.join(', ') : '',
                functionList: functionList,
                degree: nd.degree, id: nd.id, size: Math.round(nd.size || 0),
                color: nd.color,
                edgeGroups: sortedEdgeGroups,
                totalEdges: displayTotalEdges,
                neighbors: displayNeighbors,
                sceneCount: enrichedMdFiles.length,
                totalSceneCount: (this.kgSourceScenarios || []).length,
                neighborCount: 1 + displayNeighbors.length,
                mdFiles: enrichedMdFiles,
                roleSummary: roleSummary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                sceneSourceText: sceneSourceText,
                depText: depText,
                outgoing: outgoing,
                incoming: incoming,
                relNarrative: relNarrative.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n\n/g, '<br><br>'),
                // 面包屑联动上下文
                contextPath: contextPath,
                isSceneNode: isSceneNode,
                sceneOwnDescription: sceneOwnDescription,
                sceneContainedNodes: sceneContainedNodes,
                hasActiveFilter: !!this.kgActiveFilter,
                activeFilteredCount: this.kgActiveFilterNodeIds ? this.kgActiveFilterNodeIds.size : 0,
            };
            this._updateBreadcrumb();
        },

        // ── 关闭节点详情：按面包屑层级回退 ──
        closeNodeDetail() {
            if (this.kgActiveFilter) {
                // 有激活筛选 + 选中节点 → 退回到筛选概览（保留筛选）
                this.kgSelectedNode = null;
                this._updateBreadcrumb();
                // 重新显示筛选后的概览
                if (this.kgGraphOverview) {
                    this.kgGraphOverview = this._buildGraphOverview(
                        this.kgAllNodes, this.kgGraphData?.edges || [],
                        { story: { name: this.kgTitle || '', description: '', scenarios: this.kgSourceScenarios || [] } },
                        true, this.kgActiveFilterNodeIds ? this.kgActiveFilterNodeIds.size : 0
                    );
                }
            } else if (this.kgSelectedNode) {
                // 无筛选 + 选中节点 → 退回到全景概览
                this.kgSelectedNode = null;
                this._updateBreadcrumb();
                this.fitKgGraph();
            }
        },

        // ── 更新面包屑：路径（故事 → 场景 → 节点）与层级切换分离 ──
        _updateBreadcrumb() {
            const path = [];
            const storyName = this.kgTitle || '知识图谱';

            // 第一级：故事名（始终显示）
            path.push({ label: storyName, action: 'overview' });

            // 第二级：场景筛选（如果存在）
            if (this.kgActiveFilter) {
                path.push({ label: this.kgActiveFilter.value, action: 'scenario' });
            }

            // 第三级：选中节点（如果存在）
            if (this.kgSelectedNode) {
                const kind = this._getNodeKind(this.kgSelectedNode);
                const kindPrefix = kind === 'story' ? '故事' : kind === 'scenario' ? '场景' : '源码';
                path.push({ label: this.kgSelectedNode.label, action: 'node', id: this.kgSelectedNode.id, kind: kindPrefix });
            }

            // 标记最后一个为 current
            path.forEach((it, i) => { it.current = i === path.length - 1; });

            this.kgBreadcrumb = { path, layer: this.kgLayer };
        },

        // ── 面包屑导航 ──
        navigateBreadcrumb(item) {
            if (!item) return;
            if (item.action === 'overview') {
                this.kgSelectedNode = null;
                this.kgActiveFilter = null;
                this.kgActiveFilterNodeIds = null;
                this._updateBreadcrumb();
                this.fitKgGraph();
            } else if (item.action === 'node' && item.id) {
                this.focusKgNode(item.id);
            } else if (item.action === 'scenario') {
                this.filterKgByScenario(item.label);
            }
        },

        // ── 层级切换 ──
        switchToLayer(layer) {
            if (!this._cy || this.kgLayer === layer) return;
            this.kgLayer = layer;
            this._applyLayerFilter(this._cy);
            this._updateBreadcrumb();
        },

        // ── 按场景筛选图谱：高亮场景关联节点，其余 dim ──
        filterKgByScenario(sceneName) {
            if (!this._cy || !this.kgAllNodes) return;
            const cy = this._cy;
            const scenarios = this.kgSourceScenarios || [];

            // 找到对应场景的 graphNodes
            let sceneNodeIds = new Set();
            // 策略 A: 精确匹配 sc.name
            for (const sc of scenarios) {
                if ((sc.name || '') === sceneName) {
                    for (const nid of (sc.graphNodes || [])) {
                        sceneNodeIds.add(nid);
                    }
                    break;
                }
            }
            // 策略 B: 模糊匹配 — sc.name 是 sceneName 的子串，或反之
            if (sceneNodeIds.size === 0) {
                for (const sc of scenarios) {
                    const scName = sc.name || '';
                    if (scName && (sceneName.includes(scName) || scName.includes(sceneName))) {
                        for (const nid of (sc.graphNodes || [])) {
                            sceneNodeIds.add(nid);
                        }
                        break;
                    }
                }
            }
            // 策略 C: 从节点 mdFiles 直接查找 — mdFiles[].scenario 匹配 sceneName
            if (sceneNodeIds.size === 0) {
                for (const n of this.kgAllNodes) {
                    for (const mf of (n.mdFiles || [])) {
                        if ((mf.scenario || '') === sceneName) {
                            sceneNodeIds.add(n.id);
                            break;
                        }
                    }
                }
            }

            if (sceneNodeIds.size === 0) return;

            // 更新 filter 状态
            this.kgSelectedNode = null;
            this.kgActiveFilter = { type: 'scenario', value: sceneName };
            this.kgActiveFilterNodeIds = sceneNodeIds;
            this._updateBreadcrumb();

            // Dim 所有非场景节点，双重高亮场景关联节点 (matched + highlighted)
            cy.elements().removeClass('highlighted dimmed matched');
            const matchedNodes = cy.nodes().filter(n => sceneNodeIds.has(n.data('id')));
            // 非场景节点 dim
            cy.nodes().not(matchedNodes).addClass('dimmed');
            // 场景节点双重高亮: matched (琥珀色) + highlighted (白色边框)
            matchedNodes.addClass('matched highlighted');
            // 高亮场景内部边: matched (琥珀色边) + highlighted (白色边)
            const sceneEdges = matchedNodes.connectedEdges().filter(e => {
                const srcId = e.source().data('id');
                const tgtId = e.target().data('id');
                return sceneNodeIds.has(srcId) && sceneNodeIds.has(tgtId);
            });
            sceneEdges.addClass('matched');
            // 场景对外边 dim
            matchedNodes.connectedEdges().not(sceneEdges).addClass('dimmed');
            // 其余边 dim
            cy.edges().not(matchedNodes.connectedEdges()).addClass('dimmed');

            // 动画聚焦到场景节点区域，动画结束后自适应视图
            if (matchedNodes.length > 0) {
                cy.animate({
                    center: { eles: matchedNodes },
                    zoom: Math.min(cy.zoom(), 1.2),
                }, { duration: 500, easing: 'ease-in-out-cubic' });
                setTimeout(() => { if (this._cy) this._smartFit(40); }, 550);
            }

            this.kgSelectedNode = null;
            this.kgGraphOverview = this._buildGraphOverview(
                this.kgAllNodes, this.kgGraphData?.edges || [],
                { story: { name: `${this.kgTitle || ''} · ${sceneName}`, description: '', scenarios: scenarios } },
                true, sceneNodeIds.size
            );
            this.$nextTick(() => this._refitCyGraph());
        },

        // ── 按故事类型筛选图谱：高亮所有 story 类型节点 ──
        filterKgByStoryType() {
            if (!this._cy || !this.kgAllNodes) return;
            const cy = this._cy;

            // 如果已激活故事筛选，则取消
            if (this.kgActiveFilter && this.kgActiveFilter.type === 'story') {
                this.resetKgFilter();
                return;
            }

            // 收集所有 story 类型节点
            const storyNodeIds = new Set();
            for (const n of this.kgAllNodes) {
                if (n.type === 'story') storyNodeIds.add(n.id);
            }
            if (storyNodeIds.size === 0) return;

            this.kgSelectedNode = null;
            this.kgActiveFilter = { type: 'story', value: '故事节点' };
            this.kgActiveFilterNodeIds = storyNodeIds;
            this._updateBreadcrumb();

            cy.elements().removeClass('highlighted dimmed matched');
            const matchedNodes = cy.nodes().filter(n => storyNodeIds.has(n.data('id')));
            cy.nodes().not(matchedNodes).addClass('dimmed');
            matchedNodes.addClass('matched highlighted');
            // 故事节点间的边高亮
            const storyEdges = matchedNodes.connectedEdges().filter(e => {
                const srcId = e.source().data('id');
                const tgtId = e.target().data('id');
                return storyNodeIds.has(srcId) && storyNodeIds.has(tgtId);
            });
            storyEdges.addClass('matched');
            matchedNodes.connectedEdges().not(storyEdges).addClass('dimmed');
            cy.edges().not(matchedNodes.connectedEdges()).addClass('dimmed');

            if (matchedNodes.length > 0) {
                cy.animate({
                    center: { eles: matchedNodes },
                    zoom: Math.min(cy.zoom(), 1.2),
                }, { duration: 500, easing: 'ease-in-out-cubic' });
                setTimeout(() => { if (this._cy) this._smartFit(40); }, 550);
            }

            this.kgGraphOverview = this._buildGraphOverview(
                this.kgAllNodes, this.kgGraphData?.edges || [],
                { story: { name: `${this.kgTitle || ''} · 故事`, description: '', scenarios: this.kgSourceScenarios || [] } },
                true, storyNodeIds.size
            );
            this.$nextTick(() => this._refitCyGraph());
        },

        // ── 清除场景/关系筛选，恢复默认状态 ──
        resetKgFilter() {
            if (!this._cy) return;
            this.kgActiveFilter = null;
            this.kgActiveFilterNodeIds = null;
            this.kgSelectedNode = null;
            this.kgLayer = 1;
            this._applyLayerFilter(this._cy);
            const cy = this._cy;
            cy.elements().removeClass('highlighted dimmed matched');
            // 恢复默认 matched 状态
            if (this.kgMatchedIds && this.kgMatchedIds.size > 0) {
                const matched = cy.nodes().filter(n => this.kgMatchedIds.has(n.data('id')));
                matched.addClass('matched');
            }
            this.fitKgGraph();
        },

        fitKgGraph() {
            if (this._cy) {
                this.kgSelectedNode = null;
                this.kgActiveFilter = null;
                this.kgActiveFilterNodeIds = null;
                this._updateBreadcrumb();
                this._cy.elements().removeClass('highlighted dimmed');
                if (this.kgMatchedIds && this.kgMatchedIds.size > 0) {
                    const matched = this._cy.nodes().filter(n => this.kgMatchedIds.has(n.data('id')));
                    matched.addClass('matched');
                }
                const layouts = [
                    { name: 'cose', animate: true, animationDuration: 600, fit: true, padding: 50,
                        nodeRepulsion: 10000, idealEdgeLength: 120, edgeElasticity: 0.35,
                        gravity: 0.25, numIter: 2000, nodeDimensionsIncludeLabels: true },
                    { name: 'dagre', rankDir: 'TB', spacingFactor: 1.5, nodeDimensionsIncludeLabels: true, animate: true, fit: true, padding: 50 },
                    { name: 'breadthfirst', directed: true, spacingFactor: 1.4, animate: true, fit: true, padding: 50 },
                ];
                for (const opts of layouts) {
                    try { this._cy.layout(opts).run(); return; } catch (_) {}
                }
            }
        },

        _buildGraphOverview(nodes, edges, data, hasFilter, matchedCount) {
            const groupCounts = {};
            const relationCounts = {};
            let storyNodeCount = 0;
            for (const n of nodes) {
                const g = n.group || n.type || 'other';
                groupCounts[g] = (groupCounts[g] || 0) + 1;
                if (n.type === 'story') storyNodeCount++;
            }
            for (const e of edges) {
                const r = e.relation || e.label || 'other';
                const label = RELATION_LABELS[r] || r;
                relationCounts[label] = (relationCounts[label] || 0) + 1;
            }
            const topGroups = Object.entries(groupCounts).sort((a, b) => b[1] - a[1]);
            const topRelations = Object.entries(relationCounts).sort((a, b) => b[1] - a[1]);
            // story-deps.json uses "project.description"; per-story KG uses "story.description"
            const storyDesc = (data.story && data.story.description) || (data.project && data.project.description) || '';
            // story-deps.json scenes are pre-processed into this.kgSourceScenarios; per-story KG uses data.story.scenarios
            const scenarios = (data.story && data.story.scenarios) || this.kgSourceScenarios || [];
            // 故事数：优先统计节点中的 story 类型，其次 data.stories 数组长度，否则以 data.story 存在为 1
            const storyCount = storyNodeCount > 0 ? storyNodeCount
                : (Array.isArray(data.stories) ? data.stories.length : 0)
                || (data.story && data.story.name ? 1 : 0);

            // 构建 场景 → 节点 映射（每个场景引用了哪些图谱节点）
            const sceneNodeMap = {}; // { sceneName: [{ id, label, file, group, description }] }
            const nodeSceneMap = {}; // { nodeId: [sceneName, ...] }
            const sceneDescs = {};   // { sceneName: description }
            for (const sc of scenarios) {
                sceneDescs[sc.name || ''] = sc.description || '';
            }
            for (const n of nodes) {
                const mdFiles = n.mdFiles || [];
                for (const mf of mdFiles) {
                    const sceneName = mf.scenario || mf.file || '';
                    if (!sceneName) continue;
                    if (!sceneNodeMap[sceneName]) sceneNodeMap[sceneName] = [];
                    sceneNodeMap[sceneName].push({
                        id: n.id,
                        label: n.label || n.id,
                        file: n.file || '',
                        group: n.group || n.type || '',
                        description: n.description || '',
                        section: mf.section || '',
                    });
                    if (!nodeSceneMap[n.id]) nodeSceneMap[n.id] = [];
                    nodeSceneMap[n.id].push(sceneName);
                }
            }
            // 转换为排序数组，附加场景描述
            const sceneNodes = Object.entries(sceneNodeMap)
                .sort(([, a], [, b]) => b.length - a.length)
                .map(([name, nodeList]) => ({
                    name,
                    desc: sceneDescs[name] || '',
                    count: nodeList.length,
                    nodes: nodeList,
                }));

            // 构建 节点 → 场景来源 一览（每个节点被哪些场景引用）
            const nodeSceneList = nodes
                .filter(n => nodeSceneMap[n.id] && nodeSceneMap[n.id].length > 0)
                .map(n => ({
                    id: n.id,
                    label: n.label || n.id,
                    file: n.file || '',
                    description: n.description || '',
                    group: n.group || n.type || '',
                    sceneCount: nodeSceneMap[n.id].length,
                    scenes: nodeSceneMap[n.id] || [],
                }))
                .sort((a, b) => b.sceneCount - a.sceneCount);

            // ── Build story cards from data.stories (story-deps.json) or data.story (per-story KG) ──
            let storyCards = [];
            let crossStoryEdgesCount = 0;
            let storyDeps = [];
            const version = data.version || '';

            if (Array.isArray(data.stories) && data.stories.length > 0) {
                // story-deps.json has rich story cards
                storyCards = data.stories.map(s => ({
                    id: s.id || '',
                    label: s.label || s.id || '',
                    summary: s.summary || '',
                    complexity: s.complexity || 'simple',
                    priority: s.priority || '',
                    status: s.status || '',
                    scenes: s.scenes || 0,
                    nodes: s.nodes || 0,
                    edges: s.edges || 0,
                    layers: s.layers || 0,
                    tags: s.tags || [],
                }));
                crossStoryEdgesCount = data.stats?.crossStoryEdges || 0;
                storyDeps = (data.storyEdges || []).map(e => ({
                    from: e.from || '',
                    to: e.to || '',
                    fromLabel: e.from || '',
                    toLabel: e.to || '',
                    typeLabel: e.type || e.label || '',
                }));
            } else if (data.story && data.story.name) {
                // Per-story KG — single story card
                storyCards = [{
                    id: data.projectRoot || '',
                    label: data.story.name,
                    summary: data.story.description || '',
                    complexity: (data.story.scenarios || []).length >= 5 ? 'complex' : 'moderate',
                    priority: 'P0',
                    status: 'baseline',
                    scenes: (data.story.scenarios || []).length,
                    nodes: nodes.length,
                    edges: edges.length,
                    layers: new Set(nodes.map(n => n.layer || n.group || '')).size,
                    tags: data.story.tags || [],
                }];
            }

            return {
                storyName: (data.story && data.story.name) || (data.project && data.project.name) || '',
                description: storyDesc,
                totalNodes: nodes.length,
                totalEdges: edges.length,
                matchedNodes: matchedCount,
                storyCount,
                scenarioCount: scenarios.length,
                topGroups,
                topRelations,
                hasFilter,
                sceneNodes,
                nodeSceneList,
                version,
                storyCards,
                crossStoryEdges: crossStoryEdgesCount,
                storyDeps,
            };
        },

        _destroyCyGraph() {
            if (this._kgResizeObserver) {
                this._kgResizeObserver.disconnect();
                this._kgResizeObserver = null;
            }
            if (this._cy) {
                if (this._cy._cleanupDragKeys) {
                    this._cy._cleanupDragKeys();
                }
                this._cy.destroy();
                this._cy = null;
            }
        },

        handleOpenMarkdownFile(detail) {
            const { targetPath, targetHash } = detail || {};

            // 处理同一文件内的锚点链接（只有 hash，没有路径）
            if (!targetPath && targetHash) {
                this.scrollToHash(targetHash);
                return;
            }

            // 使用当前文件路径作为基准
            const basePath = this.fullFilePath || '';
            const absolutePath = resolveAbsolutePath(basePath, targetPath);

            if (!absolutePath) {
                if (window.showWarning) window.showWarning('无法解析文件路径');
                return;
            }

            // 防止路径跳出项目根目录
            if (absolutePath.startsWith('..')) {
                if (window.showWarning) window.showWarning('无法访问项目目录外的文件');
                return;
            }

            const targetKey = normalizePath(absolutePath);

            const setSelectedKey = this.viewContext?.setSelectedKey;
            const loadFileByKey = this.viewContext?.loadFileByKey;

            if (typeof setSelectedKey === 'function') {
                setSelectedKey(targetKey);
            }

            if (typeof loadFileByKey === 'function') {
                safeExecuteAsync(async () => {
                    const result = await loadFileByKey(null, targetKey);

                    // 如果文件加载失败，显示提示
                    if (!result) {
                        if (window.showWarning) window.showWarning(`文件不存在: ${targetKey}`);
                        return;
                    }

                    if (targetHash) {
                        this.$nextTick(() => {
                            this.scrollToHash(targetHash);
                        });
                    }
                }, '加载链接目标文件');
            }
        },

        scrollToHash(hash) {
            safeExecute(() => {
                const id = hash.replace(/^#/, '');
                if (!id) return;

                let el = document.getElementById(id);
                if (!el) {
                    try {
                        el = document.querySelector(`[name="${CSS.escape(id)}"]`);
                    } catch (_) { }
                }
                if (!el) {
                    try {
                        el = document.querySelector(`[data-slug="${CSS.escape(id)}"]`);
                    } catch (_) { }
                }

                if (el && el.scrollIntoView) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, '滚动到锚点');
        }
    }
};

registerGlobalComponent(componentOptions);
