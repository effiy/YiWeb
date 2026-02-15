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
