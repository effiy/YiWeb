export const decodeHtmlText = (v) => {
    try {
        const raw = v == null ? '' : String(v);
        if (!raw) return '';
        if (typeof document === 'undefined') {
            return raw
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&amp;/g, '&');
        }
        const textarea = document.createElement('textarea');
        textarea.innerHTML = raw;
        return String(textarea.value || '');
    } catch (_) {
        return '';
    }
};

export const stripInlineHtml = (v) => {
    try {
        const raw = v == null ? '' : String(v);
        if (!raw) return '';
        return raw.replace(/<[^>]*>/g, ' ');
    } catch (_) {
        return '';
    }
};

export const createHeadingSlugger = () => {
    const used = new Map();
    const toBaseSlug = (value) => {
        const decoded = decodeHtmlText(stripInlineHtml(value));
        const lowered = decoded
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
        const cleaned = lowered
            .replace(/[^a-z0-9\u4e00-\u9fa5\s_-]/g, ' ')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
        let slug = cleaned || 'section';
        if (!/^[a-z\u4e00-\u9fa5]/i.test(slug)) slug = `s-${slug}`;
        if (slug.length > 96) slug = slug.slice(0, 96).replace(/-+$/g, '');
        return slug || 'section';
    };
    const slug = (value) => {
        const base = toBaseSlug(value);
        const current = used.get(base) || 0;
        used.set(base, current + 1);
        if (current === 0) return base;
        return `${base}-${current + 1}`;
    };
    return { slug };
};

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

let _mermaidLoadPromise = null;
export const ensureMermaidLoaded = async () => {
    try {
        if (
            typeof window !== 'undefined' &&
            window.mermaidRenderer &&
            typeof window.mermaidRenderer.renderDiagram === 'function'
        ) {
            return true;
        }

        if (_mermaidLoadPromise) return await _mermaidLoadPromise;

        _mermaidLoadPromise = (async () => {
            const w = typeof window !== 'undefined' ? window : null;
            if (!w || typeof document === 'undefined') return false;

            const ensureMermaidScript = async () => {
                if (typeof w.mermaid !== 'undefined') return true;

                const existing = document.querySelector('script[data-yiweb-mermaid="cdn"]');
                if (existing) {
                    await new Promise((resolve, reject) => {
                        if (typeof w.mermaid !== 'undefined') return resolve(true);
                        existing.addEventListener('load', () => resolve(true), { once: true });
                        existing.addEventListener('error', () => reject(new Error('Mermaid.js 加载失败')), { once: true });
                    });
                    return typeof w.mermaid !== 'undefined';
                }

                await new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js';
                    s.crossOrigin = 'anonymous';
                    s.referrerPolicy = 'no-referrer';
                    s.setAttribute('data-yiweb-mermaid', 'cdn');
                    s.onload = () => resolve(true);
                    s.onerror = () => reject(new Error('Mermaid.js 加载失败'));
                    document.head.appendChild(s);
                });

                return typeof w.mermaid !== 'undefined';
            };

            const ok = await ensureMermaidScript();
            if (!ok) return false;

            try { await import('/src/markdown/mermaid/mermaid.js'); } catch (_) { }
            try { await import('/src/markdown/mermaid/mermaidRenderer.js'); } catch (_) { }

            return !!(
                w.mermaidRenderer &&
                typeof w.mermaidRenderer.renderDiagram === 'function' &&
                typeof w.mermaidRenderer.createDiagramContainer === 'function'
            );
        })();

        return await _mermaidLoadPromise;
    } catch (_) {
        return false;
    }
};
