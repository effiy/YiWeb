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
                highlightedLines: []
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
            }
        },
        mounted() {
            // 监听全局高亮事件
            this._hlListener = (e) => this.handleHighlightEvent(e.detail);
            window.addEventListener('highlightCodeLines', this._hlListener);
        },
        beforeUnmount() {
            if (this._hlListener) {
                window.removeEventListener('highlightCodeLines', this._hlListener);
                this._hlListener = null;
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


