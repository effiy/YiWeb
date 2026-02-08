let _markedConfigured = false;
let _markedRenderer = null;

export const escapeHtml = (v) => {
    if (typeof v !== 'string' && v == null) return '';
    const unescaped = String(v)
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
    return unescaped
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

export const sanitizeUrl = (href) => {
    let raw = String(href ?? '').trim();
    if (!raw) return '';
    for (let i = 0; i < 4; i++) {
        const next = (() => {
            if (raw.length >= 2 && raw.startsWith('`') && raw.endsWith('`')) return raw.slice(1, -1).trim();
            if (raw.length >= 2 && raw.startsWith('<') && raw.endsWith('>')) return raw.slice(1, -1).trim();
            return raw;
        })();
        if (next === raw) break;
        raw = next;
    }
    if (raw.startsWith('#') || raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../')) return raw;
    try {
        const u = new URL(raw, window.location.origin);
        const p = String(u.protocol || '').toLowerCase();
        if (p === 'http:' || p === 'https:' || p === 'mailto:') return u.href;
        return '';
    } catch (_) {
        return '';
    }
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

        renderer.html = (html) => {
            return escapeHtml(html);
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

        renderer.code = (code, language, isEscaped) => {
            const lang = String(language || '').trim().toLowerCase();
            const src = String(code || '');
            if (lang === 'mermaid' || lang === 'mmd') {
                const diagramId = `md-mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
                const diagramCode = String(src || '').trim();
                if (
                    window.mermaidRenderer &&
                    typeof window.mermaidRenderer.createDiagramContainer === 'function' &&
                    typeof window.mermaidRenderer.renderDiagram === 'function'
                ) {
                    const container = window.mermaidRenderer.createDiagramContainer(diagramId, diagramCode, {
                        showHeader: false,
                        showActions: true,
                        headerLabel: 'MERMAID 图表',
                        sourceLine: null
                    });
                    setTimeout(() => {
                        try {
                            window.mermaidRenderer.renderDiagram(diagramId, diagramCode, { showLoading: false });
                        } catch (_) { }
                    }, 0);
                    return container;
                }
                return `<pre class="md-code"><code class="language-mermaid">${escapeHtml(diagramCode)}</code></pre>`;
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

        if (typeof window.marked === 'undefined') {
            return escapeHtml(raw).replace(/\n/g, '<br/>');
        }

        ensureMarkedRenderer();

        const breaks = options && typeof options.breaks === 'boolean' ? options.breaks : true;
        const gfm = options && typeof options.gfm === 'boolean' ? options.gfm : true;

        try {
            if (typeof window.marked.parse === 'function') {
                return window.marked.parse(raw, {
                    renderer: _markedRenderer || undefined,
                    breaks,
                    gfm
                });
            }
            return window.marked(raw);
        } catch (_) {
            return escapeHtml(raw).replace(/\n/g, '<br/>');
        }
    } catch (_) {
        return '';
    }
};

export const renderStreamingHtml = (text) => {
    try {
        const raw = text == null ? '' : String(text);
        if (!raw) return '';
        return escapeHtml(raw).replace(/\n/g, '<br/>');
    } catch (_) {
        return '';
    }
};
