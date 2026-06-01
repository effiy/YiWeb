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
            kgBreadcrumb: [],
            kgActiveFilter: null,
            kgLayer: 1
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
                const codeMain = document.querySelector('.aicr-code-main');

                if (this.isFullscreen) {
                    // 进入全屏模式
                    if (sidebar) sidebar.style.display = 'none';
                    if (chatPanel) chatPanel.style.display = 'none';
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
                    const nodes = data.graph?.nodes || [];
                    const edges = data.graph?.edges || [];
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
                    const nodes = data.graph?.nodes || [];
                    const edges = data.graph?.edges || [];
                    this.kgGraphData = { nodes, edges };
                    this.kgTitle = (data.story && data.story.name) || '故事依赖关系图';
                    this.kgAllNodes = nodes;
                    this.kgMatchedIds = null;
                    this.kgSourceScenarios = (data.story && data.story.scenarios) || [];
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
                const allNodes = data.graph?.nodes || [];
                const allEdges = data.graph?.edges || [];
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
            this._destroyCyGraph();
        },

        /* ── 图谱渲染 ── */

        renderKgGraph() {
            if (typeof cytoscape === 'undefined') {
                this.kgError = 'Cytoscape.js 未加载';
                return;
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
            this.kgBreadcrumb = [];

            // 清理旧 resize 观察器
            if (this._kgResizeObserver) {
                this._kgResizeObserver.disconnect();
                this._kgResizeObserver = null;
            }

            const data = this.kgGraphData;
            if (!data || !data.nodes || !data.nodes.length) return;
            const matchedIds = this.kgMatchedIds; // Set or null

            // 类型色板：按节点 type 分配高区分度颜色
            const TYPE_COLORS = {
                view: '#3B82F6',       // 蓝 — 视图
                entry: '#10B981',      // 绿 — 入口
                service: '#F59E0B',    // 琥珀 — 服务
                utility: '#A855F7',    // 紫 — 工具
                component: '#06B6D4',  // 青 — 组件
                framework: '#8B5CF6',  // 紫罗兰 — 框架
                config: '#F97316',     // 橙 — 配置
                state: '#EC4899',      // 粉 — 状态
                event: '#EF4444',      // 红 — 事件
                method: '#6366F1',     // 靛蓝 — 方法
                test: '#DC2626',       // 深红 — 测试
                doc: '#6B7280',        // 灰 — 文档
                external: '#9CA3AF',   // 浅灰 — 外部
                storage: '#EC4899',    // 粉 — 存储
            };

            const GROUP_COLORS = {
                'L1-Views': '#3B82F6', 'L2-Services': '#F59E0B', 'L3-Framework': '#8B5CF6',
                'Tests': '#EF4444', 'Documentation': '#6B7280', 'External': '#9CA3AF',
                'L0-Entry': '#10B981', 'L1-AICR': '#3B82F6', 'L1-Claude': '#6366F1', 'L1-Story': '#8B5CF6',
                'L2-DataOps': '#F59E0B', 'L2-Helpers': '#F97316', 'L2-Services': '#F59E0B',
                'L2-Sync': '#F59E0B', 'L2-Config': '#F59E0B',
                'L3-Framework': '#8B5CF6', 'L3-Utilities': '#A855F7',
                'CDN-Icons': '#06B6D4', 'CDN-Components': '#06B6D4', 'CDN-Markdown': '#06B6D4',
                'Storage': '#EC4899',
                '视图工厂': '#8B5CF6', '组件系统': '#8B5CF6', '基础设施': '#8B5CF6',
                '配置': '#F59E0B', '服务聚合': '#F59E0B', '数据操作': '#F59E0B',
                '请求工具': '#F59E0B', '认证': '#F59E0B', '同步服务': '#F59E0B',
                '视图入口': '#3B82F6', '共享工具': '#3B82F6',
                '通用组件': '#06B6D4', '业务组件': '#06B6D4', '渲染系统': '#06B6D4',
                '🔴 高风险': '#EF4444', '🟡 中风险': '#F59E0B', '🟢 低风险': '#10B981',
                '⚠️ 违规': '#DC2626', '消费者': '#3B82F6',
                '检查模式': '#3B82F6', '规则引擎': '#F59E0B', '输出': '#10B981',
                '规则项': '#8B5CF6', '参照基线': '#6B7280',
                '父故事': '#3B82F6', 'P0 子故事': '#10B981', 'P1 子故事': '#F59E0B', '独立故事': '#8B5CF6',
                '①事件层':'#3B82F6','②方法层':'#6366F1','③状态层':'#8B5CF6','④派生层':'#A855F7',
                '⑤数据层':'#F59E0B','⑥网络层':'#F97316','⑦认证层':'#EF4444','⑧错误层':'#DC2626',
                '⑨校验层':'#10B981','⑩渲染层':'#06B6D4',
                '输入面':'#EF4444','接口面':'#F59E0B','存储面':'#8B5CF6','认证面':'#EC4899','渲染面':'#06B6D4',
                '文档':'#6B7280','测试':'#EF4444','外部':'#9CA3AF',
            };

            // 颜色分配：GROUP_COLORS > TYPE_COLORS > hash-derived hue
            const resolveNodeColor = (n) => {
                if (GROUP_COLORS[n.group]) return GROUP_COLORS[n.group];
                if (GROUP_COLORS[n.type]) return GROUP_COLORS[n.type];
                if (TYPE_COLORS[n.type]) return TYPE_COLORS[n.type];
                // 基于 id 哈希的非灰色色相兜底
                const hash = String(n.id || '').split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);
                const hue = Math.abs(hash) % 360;
                return `hsl(${hue}, 55%, 50%)`;
            };

            // Calculate node importance from edge degree
            const degree = {};
            for (const e of data.edges) {
                degree[e.source] = (degree[e.source] || 0) + 1;
                degree[e.target] = (degree[e.target] || 0) + 1;
            }
            const maxDeg = Math.max(1, ...Object.values(degree));

            const elements = [];
            for (const n of data.nodes) {
                const d = degree[n.id] || 0;
                const isMatched = matchedIds ? matchedIds.has(n.id) : false;
                const size = isMatched ? (24 + (d / maxDeg) * 22) : (18 + (d / maxDeg) * 16);
                elements.push({
                    group: 'nodes',
                    classes: isMatched ? 'matched' : '',
                    data: {
                        id: n.id, label: n.label || n.id,
                        color: resolveNodeColor(n),
                        file: n.file || '', description: n.description || '',
                        degree: d, size: size, matched: isMatched,
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
                    { selector: 'node', style: {
                        'background-color': 'data(color)', 'label': 'data(label)',
                        'color': '#E2E8F0', 'font-size': '11px', 'font-weight': '500',
                        'text-valign': 'bottom', 'text-halign': 'center',
                        'text-margin-y': 6, 'text-max-width': '140px',
                        'text-wrap': 'ellipsis',
                        'width': 'data(size)', 'height': 'data(size)',
                        'border-width': 2, 'border-color': 'data(color)',
                        'border-opacity': 0.35, 'shape': 'ellipse',
                        'transition-property': 'border-color, border-width',
                        'transition-duration': 150,
                    }},
                    { selector: 'node:selected', style: {
                        'border-width': 3, 'border-color': '#FFFFFF', 'border-opacity': 0.95,
                        'shadow-blur': 12, 'shadow-color': 'data(color)', 'shadow-opacity': 0.4,
                    }},
                    { selector: 'node.highlighted', style: {
                        'border-width': 3, 'border-color': '#FFFFFF', 'border-opacity': 0.9,
                    }},
                    { selector: 'node.dimmed', style: { 'opacity': 0.15 }},
                    { selector: 'node.matched', style: {
                        'border-width': 3, 'border-color': '#F59E0B', 'border-opacity': 0.9,
                        'shadow-blur': 12, 'shadow-color': '#F59E0B', 'shadow-opacity': 0.35,
                        'z-index': 100,
                    }},
                    { selector: 'edge', style: {
                        'width': 1.4, 'line-color': '#475569', 'target-arrow-color': '#64748B',
                        'target-arrow-shape': 'triangle', 'arrow-scale': 0.8,
                        'curve-style': 'bezier', 'label': 'data(label)',
                        'color': '#64748B', 'font-size': '8px',
                        'text-rotation': 'autorotate', 'opacity': 0.5,
                    }},
                    { selector: 'edge.highlighted', style: {
                        'width': 2.5, 'line-color': '#E2E8F0', 'target-arrow-color': '#E2E8F0',
                        'opacity': 0.9,
                    }},
                    { selector: 'edge.dimmed', style: { 'opacity': 0.05 }},
                ],
                layout: { name: 'preset' },
                minZoom: 0.08, maxZoom: 4, wheelSensitivity: 0.25,
            });

            this._cy = cy;

            // Hover effects
            cy.on('mouseover', 'node', (evt) => {
                const node = evt.target;
                cy.nodes().not(node).addClass('dimmed');
                cy.edges().addClass('dimmed');
                node.connectedEdges().removeClass('dimmed').addClass('highlighted');
                node.connectedEdges().connectedNodes().removeClass('dimmed');
                node.addClass('highlighted');
                container.style.cursor = 'pointer';
            });
            cy.on('mouseout', 'node', () => {
                cy.elements().removeClass('highlighted dimmed');
                container.style.cursor = '';
            });

            // Node click → select + show detail
            cy.on('tap', 'node', (evt) => {
                this._selectKgNodeDetail(evt.target, cy);
            });

            // Tap background → deselect
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

            // Double-click node → 展开到下一层
            cy.on('dbltap', 'node', (evt) => {
                const node = evt.target;
                const nd = node.data();
                const kind = this._getNodeKind(nd);

                // 层级推进：双击故事/场景节点展开显示源码
                if (this.kgLayer === 1 && (kind === 'story' || kind === 'scenario')) {
                    this.kgLayer = 2;
                    this._applyLayerFilter(cy);
                    // 聚焦到该节点及其邻居
                    const neighbors = node.closedNeighborhood();
                    cy.fit(neighbors.nodes(), 50);
                } else if (this.kgLayer === 2 && kind === 'source') {
                    // 源码节点 → 第三层（本节点+直接邻居焦点视图）
                    this.kgLayer = 3;
                    cy.elements().removeClass('highlighted dimmed');
                    const neighbors = node.closedNeighborhood();
                    cy.nodes().not(neighbors.nodes()).addClass('dimmed');
                    cy.edges().not(neighbors.edges()).addClass('dimmed');
                    node.addClass('highlighted');
                    neighbors.nodes().removeClass('dimmed');
                    neighbors.edges().removeClass('dimmed').addClass('highlighted');
                    cy.fit(neighbors.nodes(), 50);
                } else {
                    // 视觉反馈 + 聚焦
                    node.style({
                        'border-width': 6, 'border-color': '#FFFFFF', 'border-opacity': 1, 'transition-duration': 100,
                    });
                    setTimeout(() => {
                        if (!node.removed()) {
                            node.style({
                                'border-width': 3, 'border-color': '#F59E0B', 'border-opacity': 0.9,
                            });
                        }
                    }, 300);
                    const neighbors = node.closedNeighborhood();
                    cy.fit(neighbors.nodes(), 50);
                }

                this._selectKgNodeDetail(node, cy);
            });

            // Double-click 空白背景 → 退回上一层
            cy.on('dbltap', (evt) => {
                if (evt.target !== cy) return;
                if (this.kgLayer > 1) {
                    this.kgLayer--;
                    this._applyLayerFilter(cy);
                } else {
                    this.resetKgGraph();
                }
            });

            // Run layout
            const layouts = [
                { name: 'dagre', rankDir: 'TB', spacingFactor: 1.4, nodeDimensionsIncludeLabels: true, animate: true, animationDuration: 400, fit: true, padding: 40 },
                { name: 'breadthfirst', directed: true, spacingFactor: 1.3, animate: true, fit: true, padding: 40 },
                { name: 'cose', animate: true, animationDuration: 500, fit: true, padding: 40, nodeRepulsion: 6000, idealEdgeLength: 100 },
                { name: 'grid', animate: false, fit: true, padding: 40 },
            ];
            for (const opts of layouts) {
                try { cy.layout(opts).run(); break; } catch (_) {}
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
                    this._cy.fit(undefined, 30);
                }
            });
            this._kgResizeObserver.observe(container);

            // 初始应用层级过滤
            this.kgLayer = 1;
            this.$nextTick(() => this._applyLayerFilter(cy));
        },

        _refitCyGraph() {
            if (this._cy) {
                this._cy.resize();
                this._cy.fit(undefined, 30);
            }
        },

        // ── 节点分类：故事 / 场景 / 源码 ──
        _getNodeKind(nd) {
            const type = nd.type || '';
            const file = nd.file || '';
            if (type === 'story') return 'story';
            if (type === 'doc' || file.endsWith('.md')) return 'scenario';
            return 'source';
        },

        // ── 按层级过滤图谱节点显示 ──
        _applyLayerFilter(cy) {
            const layer = this.kgLayer;
            cy.batch(() => {
                // 清除所有高亮/dim 状态
                cy.elements().removeClass('highlighted dimmed');
                if (layer === 1) {
                    // 仅显示故事 + 场景节点 + 它们之间的边
                    const visibleNodes = cy.nodes().filter(n => {
                        const k = this._getNodeKind(n.data());
                        return k === 'story' || k === 'scenario';
                    });
                    const visIds = new Set(visibleNodes.map(n => n.id()));
                    cy.nodes().hide();
                    visibleNodes.show();
                    cy.edges().hide();
                    cy.edges().filter(e => visIds.has(e.source().id()) && visIds.has(e.target().id())).show();
                } else {
                    // 显示所有节点和边
                    cy.elements().show();
                }
                this._updateBreadcrumb();
            });
            // 图层切换后重新适应视图
            cy.fit(undefined, 40);
        },

        /* ── 详情面板交互：点击关联边 / 邻居节点 → 图谱高亮 ── */

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

            // ── 中文关系标签 ──
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

            // ── 关联边：按关系类型分组 ──
            const connectedEdges = node.connectedEdges();
            const edgeGroups = {}; // { relation: { label, count, edges[] } }
            connectedEdges.forEach(e => {
                const src = e.source().data();
                const tgt = e.target().data();
                const isOut = src.id === nd.id;
                const rel = e.data('relation') || 'other';
                if (!edgeGroups[rel]) {
                    edgeGroups[rel] = { relation: rel, label: RELATION_LABELS[rel] || rel, count: 0, edges: [] };
                }
                edgeGroups[rel].count++;
                if (edgeGroups[rel].edges.length < 8) {
                    edgeGroups[rel].edges.push({
                        edgeId: e.id(),
                        label: e.data('label'),
                        relation: rel,
                        sourceId: src.id,
                        targetId: isOut ? tgt.id : src.id,
                        targetLabel: isOut ? tgt.label : src.label,
                        direction: isOut ? '→' : '←',
                    });
                }
            });
            // 按边数量降序排列
            const sortedEdgeGroups = Object.values(edgeGroups).sort((a, b) => b.count - a.count);
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
            const neighbors = Object.values(neighborMap).slice(0, 15);

            // ── 解析 mdFiles ──
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
            const outgoing = connectedEdges.filter(e => e.source().id() === nd.id).length;
            const incoming = totalEdges - outgoing;
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
            const enrichedMdFiles = mdFiles.map(mf => ({
                ...mf,
                _desc: sceneDescMap[mf.scenario || ''] || '',
                _sceneIdx: sceneIndexMap[mf.scenario || ''],
            }));
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

            this.kgSelectedNode = {
                label: nd.label, type: nd.type, group: nd.group,
                description: nd.description, file: nd.file,
                functions: functionList.length ? functionList.join(', ') : '',
                functionList: functionList,
                degree: nd.degree, id: nd.id, size: Math.round(nd.size || 0),
                color: nd.color,
                edgeGroups: sortedEdgeGroups,
                totalEdges: totalEdges,
                neighbors: neighbors,
                mdFiles: enrichedMdFiles,
                roleSummary: roleSummary,
                sceneSourceText: sceneSourceText,
                depText: depText,
                outgoing: outgoing,
                incoming: incoming,
                relNarrative: relNarrative,
            };
            this._updateBreadcrumb();
        },

        // ── 更新面包屑：与详情面板内容联动 ──
        _updateBreadcrumb() {
            const items = [];
            const storyName = this.kgTitle || '知识图谱';
            const layerNames = { 1: 'L1 故事·场景', 2: 'L2 全部', 3: 'L3 聚焦' };

            // 场景筛选优先
            if (this.kgActiveFilter) {
                items.push({ label: storyName, action: 'overview' });
                items.push({ label: this.kgActiveFilter.value, action: 'scenario' });
            } else if (this.kgSelectedNode) {
                items.push({ label: storyName, action: 'overview' });
                const kind = this._getNodeKind(this.kgSelectedNode);
                const kindPrefix = kind === 'story' ? '故事' : kind === 'scenario' ? '场景' : '源码';
                items.push({ label: `${kindPrefix} · ${this.kgSelectedNode.label}`, action: 'node', id: this.kgSelectedNode.id });
            } else {
                items.push({ label: storyName, action: 'overview', current: true });
            }

            // 层级标签
            items.push({ label: layerNames[this.kgLayer] || 'L1', action: 'layer', layer: this.kgLayer });

            // 标记最后一个非 layer 项为 current
            const nonLayer = items.filter(it => it.action !== 'layer');
            if (nonLayer.length > 0) {
                items.forEach(it => { it.current = false; });
                nonLayer[nonLayer.length - 1].current = true;
            }
            this.kgBreadcrumb = items;
        },

        // ── 面包屑点击导航 ──
        navigateBreadcrumb(item) {
            if (!item) return;
            if (item.action === 'overview') {
                this.resetKgFilter();
            } else if (item.action === 'node' && item.id) {
                this.focusKgNode(item.id);
            } else if (item.action === 'scenario') {
                this.filterKgByScenario(item.label);
            } else if (item.action === 'layer') {
                if (!this._cy) return;
                this.kgSelectedNode = null;
                this.kgActiveFilter = null;
                this.fitKgGraph();
                this.$nextTick(() => {
                    this.kgLayer = item.layer;
                    this._applyLayerFilter(this._cy);
                });
            }
        },

        // ── 按场景筛选图谱：高亮场景关联节点，其余 dim ──
        filterKgByScenario(sceneName) {
            if (!this._cy || !this.kgAllNodes) return;
            const cy = this._cy;
            const scenarios = this.kgSourceScenarios || [];

            // 找到对应场景的 graphNodes
            let sceneNodeIds = new Set();
            for (const sc of scenarios) {
                if ((sc.name || '') === sceneName) {
                    for (const nid of (sc.graphNodes || [])) {
                        sceneNodeIds.add(nid);
                    }
                    break;
                }
            }

            if (sceneNodeIds.size === 0) return;

            // 更新 filter 状态
            this.kgSelectedNode = null;
            this.kgActiveFilter = { type: 'scenario', value: sceneName };
            this._updateBreadcrumb();

            // Dim 所有节点，高亮场景关联节点
            cy.elements().removeClass('highlighted dimmed matched');
            const matchedNodes = cy.nodes().filter(n => sceneNodeIds.has(n.data('id')));
            matchedNodes.addClass('matched');
            // 高亮关联节点的内部边
            matchedNodes.connectedEdges().filter(e => {
                const srcId = e.source().data('id');
                const tgtId = e.target().data('id');
                return sceneNodeIds.has(srcId) && sceneNodeIds.has(tgtId);
            }).addClass('matched');

            this.kgSelectedNode = null;
            this.kgGraphOverview = this._buildGraphOverview(
                this.kgAllNodes, this.kgGraphData?.edges || [],
                { story: { name: `${this.kgTitle || ''} · ${sceneName}`, description: '', scenarios: scenarios } },
                true, sceneNodeIds.size
            );
            this.$nextTick(() => this._refitCyGraph());
        },

        // ── 清除场景/关系筛选，恢复默认状态 ──
        resetKgFilter() {
            if (!this._cy) return;
            this.kgActiveFilter = null;
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
                this._updateBreadcrumb();
                this._cy.elements().removeClass('highlighted dimmed');
                if (this.kgMatchedIds && this.kgMatchedIds.size > 0) {
                    const matched = this._cy.nodes().filter(n => this.kgMatchedIds.has(n.data('id')));
                    matched.addClass('matched');
                }
                const layouts = [
                    { name: 'dagre', rankDir: 'TB', spacingFactor: 1.4, nodeDimensionsIncludeLabels: true, animate: true, fit: true, padding: 40 },
                    { name: 'breadthfirst', directed: true, spacingFactor: 1.3, animate: true, fit: true, padding: 40 },
                ];
                for (const opts of layouts) {
                    try { this._cy.layout(opts).run(); return; } catch (_) {}
                }
            }
        },

        fitKgGraph() {
            this.resetKgGraph();
        },

        _buildGraphOverview(nodes, edges, data, hasFilter, matchedCount) {
            const groupCounts = {};
            const relationCounts = {};
            for (const n of nodes) {
                const g = n.group || n.type || 'other';
                groupCounts[g] = (groupCounts[g] || 0) + 1;
            }
            for (const e of edges) {
                const r = e.relation || e.label || 'other';
                relationCounts[r] = (relationCounts[r] || 0) + 1;
            }
            const topGroups = Object.entries(groupCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
            const topRelations = Object.entries(relationCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
            const storyDesc = (data.story && data.story.description) || '';
            const scenarios = data.story?.scenarios || [];

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
                    nodes: nodeList.slice(0, 12),
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

            return {
                storyName: (data.story && data.story.name) || '',
                description: storyDesc,
                totalNodes: nodes.length,
                totalEdges: edges.length,
                matchedNodes: matchedCount,
                scenarioCount: scenarios.length,
                topGroups,
                topRelations,
                hasFilter,
                sceneNodes,
                nodeSceneList,
            };
        },

        _destroyCyGraph() {
            if (this._kgResizeObserver) {
                this._kgResizeObserver.disconnect();
                this._kgResizeObserver = null;
            }
            if (this._cy) { this._cy.destroy(); this._cy = null; }
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
