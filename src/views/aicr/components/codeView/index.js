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
            isFullscreen: false
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
            // 加载 URL 中的高亮行
            this.loadHighlightFromURL();
        },
        searchQuery() {
            this.updateSearchMatches();
        },
        highlightedLines() {
            // 当高亮行改变时，更新 URL
            this.updateURLWithHighlight();
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
            if (key === 'Escape') {
                if (this.isFullscreen) {
                    e.preventDefault();
                    this.toggleFullscreen();
                }
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

                // 2. 等待Vue更新DOM
                this.$nextTick(() => {
                    // 再给多一点时间确保DOM完全更新
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
                    }, 200);
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
                    #codeview-image-preview{color:#fff;opacity:0;pointer-events:auto;transition:opacity 140ms ease}
                    #codeview-image-preview.is-open{opacity:1}
                    #codeview-image-preview .codeview-image-preview-frame{position:relative;max-width:min(96vw,1400px);max-height:96vh;transform:translate3d(0,6px,0) scale(.985);opacity:.98;transition:transform 160ms cubic-bezier(.2,.9,.2,1),opacity 160ms ease}
                    #codeview-image-preview.is-open .codeview-image-preview-frame{transform:translate3d(0,0,0) scale(1);opacity:1}
                    #codeview-image-preview .codeview-image-preview-img{display:block;max-width:96vw;max-height:96vh;border-radius:14px;box-shadow:0 20px 80px rgba(0,0,0,.55);background:rgba(255,255,255,0.06);object-fit:contain}
                    #codeview-image-preview .codeview-image-preview-toolbar{position:absolute;top:10px;right:10px;display:flex;gap:8px;align-items:center}
                    #codeview-image-preview .codeview-image-preview-btn{position:relative;top:auto;right:auto;transform:none;height:34px;padding:0 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.22);background:rgba(0,0,0,0.38);color:#fff;font-size:13px;cursor:pointer;backdrop-filter:blur(10px)}
                    #codeview-image-preview .codeview-image-preview-close{position:relative;top:auto;right:auto;transform:none;width:38px;height:38px;padding:0;font-size:18px;background:rgba(0,0,0,0.46)}
                    #codeview-image-preview .codeview-image-preview-btn:hover{background:rgba(0,0,0,0.6);border-color:rgba(255,255,255,0.3)}
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
            root.style.cssText = 'position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,0.72);backdrop-filter:blur(2px)';
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
