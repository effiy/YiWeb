import { createHeadingSlugger, decodeHtmlText, ensureMermaidLoaded, escapeHtml, sanitizeUrl, stripInlineHtml } from './markdownRenderer.utils.js';
import { parseMarkdownFrontmatter, renderFrontmatterHtml } from './markdownRenderer.frontmatter.js';
import { sanitizeMarkdownHtml } from './markdownRenderer.sanitize.js';

let _markedConfigured = false;
let _markedRenderer = null;
let _markdownInteractionsBound = false;

export { escapeHtml, sanitizeUrl, parseMarkdownFrontmatter };

const ensureMarkdownInteractions = () => {
    if (_markdownInteractionsBound) return;
    if (typeof window === 'undefined' || typeof window.document === 'undefined') return;
    _markdownInteractionsBound = true;

    document.addEventListener('click', (e) => {
        const target = e?.target;
        if (!target || typeof target.closest !== 'function') return;
        const tabBtn = target.closest('.pet-tabs__tab');
        if (!tabBtn) return;
        const tabsEl = tabBtn.closest('.pet-tabs');
        if (!tabsEl) return;
        const nav = tabsEl.querySelector('.pet-tabs__nav');
        const panelsWrap = tabsEl.querySelector('.pet-tabs__panels');
        if (!nav || !panelsWrap) return;
        const tabButtons = Array.from(nav.querySelectorAll('.pet-tabs__tab'));
        const panels = Array.from(panelsWrap.querySelectorAll('.pet-tabs__panel'));
        const idx = tabButtons.indexOf(tabBtn);
        if (idx < 0) return;
        const activeIdx = Math.max(0, Math.min(idx, Math.min(tabButtons.length, panels.length) - 1));
        tabButtons.forEach((btn, i) => btn.classList.toggle('is-active', i === activeIdx));
        panels.forEach((panel, i) => panel.classList.toggle('is-active', i === activeIdx));
    }, { passive: true });
};

const ensureMarkedRenderer = () => {
    if (_markedConfigured) return;
    _markedConfigured = true;

    if (typeof window.marked === 'undefined' || typeof window.marked.Renderer !== 'function') {
        _markedRenderer = null;
        return;
    }

    try {
        const renderer = new window.marked.Renderer();
        const originalCodeRenderer = renderer.code ? renderer.code.bind(renderer) : null;
        const originalHeadingRenderer = renderer.heading ? renderer.heading.bind(renderer) : null;

        renderer.html = (html) => {
            if (typeof html === 'string') return html;
            return (html && (html.raw || html.text)) || '';
        };

        renderer.link = (href, title, text) => {
            const safeHref = sanitizeUrl(href);
            const safeText = escapeHtml(text == null ? '' : String(text));
            if (!safeHref) return safeText;
            const safeTitle = title == null ? '' : String(title);
            const titleAttr = safeTitle ? ` title="${escapeHtml(safeTitle)}"` : '';
            return `<a href="${escapeHtml(safeHref)}"${titleAttr} target="_blank" rel="noopener noreferrer">${safeText}</a>`;
        };

        renderer.image = (href, title, text) => {
            const safeHref = sanitizeUrl(href);
            const alt = escapeHtml(text == null ? '' : String(text));
            if (!safeHref) return alt;
            const safeTitle = title == null ? '' : String(title);
            const titleAttr = safeTitle ? ` title="${escapeHtml(safeTitle)}"` : '';
            return `<img src="${escapeHtml(safeHref)}" alt="${alt}" loading="lazy" decoding="async"${titleAttr} />`;
        };

        renderer.heading = (text, level, raw, slugger) => {
            const html = typeof text === 'string' ? text : (text && (text.raw || text.text)) || '';
            const plain = decodeHtmlText(stripInlineHtml(html));
            const l = Number(level) || 1;

            const s =
                (renderer && renderer.__yiwebHeadingSlugger && typeof renderer.__yiwebHeadingSlugger.slug === 'function')
                    ? renderer.__yiwebHeadingSlugger
                    : (slugger && typeof slugger.slug === 'function')
                        ? slugger
                        : null;

            const id = s ? s.slug(plain) : createHeadingSlugger().slug(plain);
            const safeLevel = Math.max(1, Math.min(6, l));
            if (typeof originalHeadingRenderer === 'function') {
                try {
                    const rendered = originalHeadingRenderer(text, safeLevel, raw, slugger);
                    if (typeof rendered === 'string' && rendered.includes('<h') && !rendered.includes(' id=')) {
                        return rendered.replace(/^(<h[1-6])(\b[^>]*)>/i, `$1$2 id="${escapeHtml(id)}">`);
                    }
                } catch (_) { }
            }
            return `<h${safeLevel} id="${escapeHtml(id)}">${html}</h${safeLevel}>`;
        };

        renderer.code = (code, language, isEscaped) => {
            const lang = String(language || '').trim().toLowerCase();
            const src = String(code || '');
            if (lang === 'mermaid' || lang === 'mmd') {
                const diagramId = `md-mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
                const diagramCode = String(src || '').trim();
                const containerHtml = `
                    <div class="mermaid-diagram-wrapper" data-source-line="">
                        <div class="mermaid-diagram-container" id="${escapeHtml(diagramId)}" data-mermaid-code="${escapeHtml(diagramCode)}"></div>
                    </div>
                `;
                setTimeout(() => {
                    (async () => {
                        const ok = await ensureMermaidLoaded();
                        if (!ok || !window.mermaidRenderer || typeof window.mermaidRenderer.renderDiagram !== 'function') {
                            const el = document.getElementById(diagramId);
                            if (el) el.innerHTML = `<pre class="md-code"><code class="language-mermaid">${escapeHtml(diagramCode)}</code></pre>`;
                            return;
                        }
                        try {
                            await window.mermaidRenderer.renderDiagram(diagramId, diagramCode, { showLoading: false });
                        } catch (_) {
                            const el = document.getElementById(diagramId);
                            if (el) el.innerHTML = `<pre class="md-code"><code class="language-mermaid">${escapeHtml(diagramCode)}</code></pre>`;
                        }
                    })();
                }, 0);
                return containerHtml;
            }

            if (typeof originalCodeRenderer === 'function') {
                return originalCodeRenderer(src, language, isEscaped);
            }
            return `<pre class="md-code"><code class="language-${escapeHtml(lang || 'text')}">${escapeHtml(src)}</code></pre>`;
        };

        _markedRenderer = renderer;
    } catch (_) {
        _markedRenderer = null;
    }
};

export const renderMarkdownHtml = (text, options = {}) => {
    try {
        const raw = text == null ? '' : String(text);
        if (!raw) return '';

        const keepFrontmatter = !!(options && (options.keepFrontmatter === true || options.frontmatter === 'keep'));
        const { frontmatter, content } = parseMarkdownFrontmatter(raw);
        const markdownText = keepFrontmatter ? raw : content;

        const fmHtml = !keepFrontmatter && frontmatter ? renderFrontmatterHtml(frontmatter) : '';
        const frontmatterOnly = !keepFrontmatter && frontmatter && !String(markdownText || '').trim();
        if (frontmatterOnly) {
            if (!fmHtml) return '';
            if (typeof window === 'undefined' || typeof window.document === 'undefined') return fmHtml;
            return sanitizeMarkdownHtml(fmHtml);
        }

        if (typeof window === 'undefined' || typeof window.marked === 'undefined') {
            return `${fmHtml}${escapeHtml(markdownText).replace(/\n/g, '<br/>')}`;
        }

        ensureMarkedRenderer();
        ensureMarkdownInteractions();

        const breaks = options && typeof options.breaks === 'boolean' ? options.breaks : true;
        const gfm = options && typeof options.gfm === 'boolean' ? options.gfm : true;

        try {
            if (typeof window.marked.parse === 'function') {
                if (_markedRenderer) {
                    _markedRenderer.__yiwebHeadingSlugger = createHeadingSlugger();
                }
                const rendered = window.marked.parse(markdownText, {
                    renderer: _markedRenderer || undefined,
                    breaks,
                    gfm
                });
                return sanitizeMarkdownHtml(`${fmHtml}${rendered}`);
            }
            return sanitizeMarkdownHtml(`${fmHtml}${window.marked(markdownText)}`);
        } catch (_) {
            return `${fmHtml}${escapeHtml(markdownText).replace(/\n/g, '<br/>')}`;
        }
    } catch (_) {
        return '';
    }
};

export const getMarkdownToc = (text, options = {}) => {
    try {
        const raw = text == null ? '' : String(text);
        if (!raw) return [];

        const { content } = parseMarkdownFrontmatter(raw);
        const markdownText = content;

        const minDepth = Math.max(1, Math.min(6, Number(options.minDepth || 1) || 1));
        const maxDepth = Math.max(minDepth, Math.min(6, Number(options.maxDepth || 4) || 4));
        const slugger = createHeadingSlugger();

        const marked = typeof window !== 'undefined' ? window.marked : null;
        const lexer =
            marked && typeof marked.lexer === 'function'
                ? marked.lexer.bind(marked)
                : marked && marked.Lexer && typeof marked.Lexer.lex === 'function'
                    ? (src, opt) => marked.Lexer.lex(src, opt)
                    : null;

        const pickHeadingText = (token) => {
            const t = token && (token.text || token.raw || '');
            return decodeHtmlText(stripInlineHtml(t));
        };

        const items = [];

        if (lexer) {
            let tokens = [];
            try {
                tokens = lexer(markdownText, { gfm: true, breaks: true }) || [];
            } catch (_) {
                try { tokens = lexer(markdownText) || []; } catch (_) { tokens = []; }
            }

            const walk = (arr) => {
                if (!Array.isArray(arr)) return;
                for (const token of arr) {
                    if (!token) continue;
                    if (token.type === 'heading' || token.type === 'heading_open') {
                        const depth = Number(token.depth || token.level || token.rank || token.headingLevel || 0) || 0;
                        const level = depth > 0 ? depth : Number(token.depth) || 0;
                        const finalLevel = level > 0 ? level : Number(token.level) || 0;
                        const l = finalLevel || 0;
                        if (l >= minDepth && l <= maxDepth) {
                            const plain = pickHeadingText(token);
                            const id = slugger.slug(plain);
                            items.push({ id, level: l, text: plain });
                        }
                    } else if (token.type === 'heading') {
                        const l = Number(token.depth || 0) || 0;
                        if (l >= minDepth && l <= maxDepth) {
                            const plain = pickHeadingText(token);
                            const id = slugger.slug(plain);
                            items.push({ id, level: l, text: plain });
                        }
                    }
                    if (token.tokens) walk(token.tokens);
                    if (token.items) walk(token.items);
                    if (token.children) walk(token.children);
                    if (token.blocks) walk(token.blocks);
                }
            };
            walk(tokens);
            return items;
        }

        const lines = markdownText.replace(/\r\n/g, '\n').split('\n');
        for (const line of lines) {
            const m = String(line || '').match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
            if (!m) continue;
            const l = m[1].length;
            if (l < minDepth || l > maxDepth) continue;
            const plain = decodeHtmlText(stripInlineHtml(m[2]));
            const id = slugger.slug(plain);
            items.push({ id, level: l, text: plain });
        }
        return items;
    } catch (_) {
        return [];
    }
};

export const renderStreamingHtml = (text) => {
    try {
        const raw = text == null ? '' : String(text);
        if (!raw) return '';
        const { frontmatter, content } = parseMarkdownFrontmatter(raw);
        if (frontmatter && !String(content || '').trim()) {
            const fmHtml = renderFrontmatterHtml(frontmatter);
            if (!fmHtml) return '';
            if (typeof window === 'undefined' || typeof window.document === 'undefined') return fmHtml;
            return sanitizeMarkdownHtml(fmHtml);
        }
        return escapeHtml(raw).replace(/\n/g, '<br/>');
    } catch (_) {
        return '';
    }
};
