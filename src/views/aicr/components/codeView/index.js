import { registerGlobalComponent } from '/src/utils/view/componentLoader.js';
import { safeExecute, safeExecuteAsync } from '/src/utils/core/error.js';
import { normalizeFilePath } from '/src/utils/aicr/fileFieldNormalizer.js';

const normalizePath = (v) => normalizeFilePath(v);

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

const guessLanguage = (name) => {
    const n = String(name || '').toLowerCase();
    const ext = n.includes('.') ? n.split('.').pop() : '';
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
        case 'md': return 'markdown';
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
        default: return 'text';
    }
};

const componentOptions = {
    name: 'CodeView',
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
            editSaving: false,
            saveError: '',
            searchQuery: '',
            matchLines: [],
            activeMatchIndex: -1,
            wrapEnabled: false,
            fontSize: 13,
            fontSizeMin: 11,
            fontSizeMax: 18
        };
    },
    computed: {
        fullFilePath() {
            const f = this.file || {};
            return String(f.path || f.treeKey || f.name || f.key || '');
        },
        displayFileName() {
            const f = this.file || {};
            const n = String(f.name || '').trim();
            if (n) return n;
            const p = String(f.path || f.treeKey || f.key || '').trim();
            if (!p) return '';
            const parts = p.split('/');
            return parts[parts.length - 1] || p;
        },
        languageType() {
            return guessLanguage(this.displayFileName || this.fullFilePath);
        },
        shouldShowMarkdownPreview() {
            return this.languageType === 'markdown';
        },
        rawContent() {
            const f = this.file || {};
            if (typeof f.content === 'string') return f.content;
            if (Array.isArray(f.content)) return f.content.map(v => (v == null ? '' : String(v))).join('\n');
            if (typeof f.contentBase64 === 'string' && f.contentBase64) return decodeBase64Utf8(f.contentBase64);
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
        },
        searchQuery() {
            this.updateSearchMatches();
        }
    },
    mounted() {
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
            const isMeta = !!(e.metaKey || e.ctrlKey);
            if (isMeta && (key === 'f' || key === 'F')) {
                e.preventDefault();
                this.focusSearch();
                return;
            }
            if (key === 'F3') {
                e.preventDefault();
                if (e.shiftKey) {
                    this.findPrevMatch();
                } else {
                    this.findNextMatch();
                }
                return;
            }
            if (key === 'Escape') {
                if (this.searchQuery) {
                    e.preventDefault();
                    this.clearSearch();
                }
            }
        };
        window.addEventListener('keydown', this._onCodeKeydown);
    },
    beforeUnmount() {
        if (this._onHighlightCodeLines) window.removeEventListener('highlightCodeLines', this._onHighlightCodeLines);
        if (this._onClearCodeHighlight) window.removeEventListener('clearCodeHighlight', this._onClearCodeHighlight);
        if (this._onCodeKeydown) window.removeEventListener('keydown', this._onCodeKeydown);
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
                this.editingFileContent = String(this.rawContent || '');
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
                this.isEditingFile = false;
                this.editingFileContent = '';
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
                const blob = new Blob([String(this.rawContent || '')], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            }, '下载文件');
        }
    }
};

registerGlobalComponent(componentOptions);
