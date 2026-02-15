import { escapeHtml, sanitizeUrl } from './markdownRenderer.utils.js';

const sanitizeClassName = (className) => {
    if (!className || typeof className !== 'string') return '';
    const cleaned = className.replace(/[^a-zA-Z0-9 _-]/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned.length > 128 ? cleaned.slice(0, 128).trim() : cleaned;
};

const isSafeCssColor = (color) => {
    if (!color || typeof color !== 'string') return false;
    const value = color.trim();
    if (!value || value.length > 48) return false;
    if (/^#[0-9a-fA-F]{3}$/.test(value) || /^#[0-9a-fA-F]{6}$/.test(value)) return true;
    if (/^[a-zA-Z]+$/.test(value)) return true;
    const rgbMatch = value.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
    if (rgbMatch) {
        const r = Number(rgbMatch[1]);
        const g = Number(rgbMatch[2]);
        const b = Number(rgbMatch[3]);
        return r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255;
    }
    const rgbaMatch = value.match(/^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|1|0?\.\d+)\s*\)$/i);
    if (rgbaMatch) {
        const r = Number(rgbaMatch[1]);
        const g = Number(rgbaMatch[2]);
        const b = Number(rgbaMatch[3]);
        const a = Number(rgbaMatch[4]);
        return r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255 && a >= 0 && a <= 1;
    }
    return false;
};

const isSafeCssLength = (value) => {
    if (!value || typeof value !== 'string') return false;
    const v = value.trim();
    if (/^-?0+(?:\.0+)?$/.test(v)) return true;
    const m = v.match(/^(-?\d+(?:\.\d+)?)(px|em|rem|%|vh|vw)$/i);
    if (!m) return false;
    const num = Number(m[1]);
    if (!Number.isFinite(num)) return false;
    return num >= -2000 && num <= 2000;
};

const sanitizeStyleText = (styleText) => {
    if (!styleText || typeof styleText !== 'string') return '';
    const text = styleText.trim();
    if (!text) return '';
    const lowered = text.toLowerCase();
    if (lowered.includes('expression(') || lowered.includes('javascript:') || lowered.includes('vbscript:') || lowered.includes('url(')) {
        return '';
    }

    const allowedProps = new Set([
        'color',
        'background-color',
        'font-weight',
        'font-style',
        'text-decoration',
        'font-size',
        'line-height',
        'font-family',
        'text-align',
        'white-space',
        'word-break',
        'overflow',
        'overflow-x',
        'overflow-y',
        'max-width',
        'min-width',
        'width',
        'height',
        'margin',
        'margin-top',
        'margin-right',
        'margin-bottom',
        'margin-left',
        'padding',
        'padding-top',
        'padding-right',
        'padding-bottom',
        'padding-left',
        'border',
        'border-radius',
        'border-width',
        'border-style',
        'border-color',
        'display'
    ]);

    const parts = text.split(';').map(s => s.trim()).filter(Boolean);
    const safe = [];
    for (const part of parts) {
        const idx = part.indexOf(':');
        if (idx <= 0) continue;
        const prop = part.slice(0, idx).trim().toLowerCase();
        let value = part.slice(idx + 1).trim();
        if (!allowedProps.has(prop)) continue;
        if (!value || value.length > 128) continue;
        const vLower = value.toLowerCase();
        if (vLower.includes('expression(') || vLower.includes('javascript:') || vLower.includes('vbscript:') || vLower.includes('url(')) continue;

        if (prop === 'color' || prop === 'background-color' || prop === 'border-color') {
            if (!isSafeCssColor(value)) continue;
        }
        if (prop === 'font-size' || prop === 'line-height' || prop === 'width' || prop === 'height' || prop === 'max-width' || prop === 'min-width') {
            if (!(isSafeCssLength(value) || /^\d+$/.test(value))) continue;
        }
        if (prop.startsWith('margin') || prop.startsWith('padding') || prop === 'border-radius' || prop === 'border-width') {
            const chunks = value.split(/\s+/).filter(Boolean);
            if (!chunks.length || chunks.length > 4) continue;
            const ok = chunks.every(c => isSafeCssLength(c) || /^\d+$/.test(c));
            if (!ok) continue;
        }
        if (prop === 'display') {
            const allowDisplay = new Set(['block', 'inline', 'inline-block', 'flex', 'grid', 'none']);
            if (!allowDisplay.has(vLower)) continue;
        }
        if (prop === 'font-weight') {
            if (!/^(normal|bold|bolder|lighter|[1-9]00)$/.test(vLower)) continue;
        }
        if (prop === 'font-style') {
            if (!(vLower === 'normal' || vLower === 'italic' || vLower === 'oblique')) continue;
        }
        if (prop === 'text-decoration') {
            const allowDeco = new Set(['none', 'underline', 'line-through', 'overline']);
            if (!allowDeco.has(vLower)) continue;
        }
        if (prop === 'text-align') {
            const allowAlign = new Set(['left', 'right', 'center', 'justify', 'start', 'end']);
            if (!allowAlign.has(vLower)) continue;
        }
        if (prop === 'white-space') {
            const allowWs = new Set(['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line']);
            if (!allowWs.has(vLower)) continue;
        }
        if (prop === 'word-break') {
            const allowWb = new Set(['normal', 'break-all', 'break-word', 'keep-all']);
            if (!allowWb.has(vLower)) continue;
        }
        if (prop.startsWith('overflow')) {
            const allowOv = new Set(['visible', 'hidden', 'scroll', 'auto', 'clip']);
            if (!allowOv.has(vLower)) continue;
        }
        if (prop === 'border-style') {
            const allowBorderStyle = new Set(['none', 'solid', 'dashed', 'dotted', 'double']);
            if (!allowBorderStyle.has(vLower)) continue;
        }
        if (prop === 'border') {
            const allowBorder = /^(\d+(?:\.\d+)?(px|em|rem)?)\s+(solid|dashed|dotted|double)\s+(.+)$/i;
            const m = value.match(allowBorder);
            if (!m) continue;
            const w = m[1];
            const s = m[3].toLowerCase();
            const c = m[4].trim();
            if (!(isSafeCssLength(w) || /^\d+$/.test(w))) continue;
            if (!new Set(['solid', 'dashed', 'dotted', 'double']).has(s)) continue;
            if (!isSafeCssColor(c)) continue;
        }
        safe.push(`${prop}: ${value}`);
    }
    return safe.join('; ');
};

export const sanitizeMarkdownHtml = (html) => {
    try {
        const raw = String(html ?? '');
        if (!raw) return '';
        if (typeof document === 'undefined') return escapeHtml(raw);

        const template = document.createElement('template');
        template.innerHTML = raw;

        const moveChildren = (from, to) => {
            while (from.firstChild) to.appendChild(from.firstChild);
        };

        const replaceWith = (from, to) => {
            const parent = from.parentNode;
            if (!parent) return;
            parent.insertBefore(to, from);
            parent.removeChild(from);
        };

        const normalizeComponentName = (el) => {
            try {
                const name = String(el?.tagName || '').toLowerCase();
                return name || '';
            } catch (_) {
                return '';
            }
        };

        const pickAttr = (el, names) => {
            if (!el || !el.getAttribute) return '';
            for (const n of names) {
                const v = el.getAttribute(n);
                if (v != null && String(v).trim()) return String(v);
            }
            return '';
        };

        const toSafeText = (v, maxLen = 200) => {
            const s = String(v ?? '').replace(/\s+/g, ' ').trim();
            if (!s) return '';
            if (s.length <= maxLen) return s;
            return s.slice(0, maxLen).trim();
        };

        const isInsideCodeBlock = (el) => {
            if (!el || typeof el.closest !== 'function') return false;
            return !!el.closest('pre, code');
        };

        const extractMarkdownSource = (el) => {
            try {
                if (!el) return '';
                const attr = pickAttr(el, ['md', 'markdown', 'text', 'content']);
                if (attr) return String(attr);
                const txt = el.textContent;
                return String(txt ?? '');
            } catch (_) {
                return '';
            }
        };

        const normalizeMarkdownText = (text) => {
            const rawText = String(text ?? '');
            const lines = rawText.replace(/\r\n/g, '\n').split('\n');
            const meaningful = lines.filter(l => String(l).trim().length > 0);
            if (meaningful.length <= 1) return rawText.trim();
            const indents = meaningful.map((line) => {
                let count = 0;
                for (const ch of line) {
                    if (ch === ' ') count += 1;
                    else if (ch === '\t') count += 4;
                    else break;
                }
                return count;
            });
            const minIndent = Math.min(...indents);
            if (!Number.isFinite(minIndent) || minIndent <= 0) return rawText.trim();
            return lines
                .map((line) => {
                    let remaining = String(line || '');
                    let toRemove = minIndent;
                    while (toRemove > 0 && remaining) {
                        if (remaining[0] === ' ') {
                            remaining = remaining.slice(1);
                            toRemove -= 1;
                            continue;
                        }
                        if (remaining[0] === '\t') {
                            remaining = remaining.slice(1);
                            toRemove -= 4;
                            continue;
                        }
                        break;
                    }
                    return remaining;
                })
                .join('\n')
                .trim();
        };

        const hasRenderedMarkdown = (el) => !!el && el.__yiwebMdRendered === true;
        const markRenderedMarkdown = (el) => {
            try { el.__yiwebMdRendered = true; } catch (_) { }
        };

        const transformComponents = (rootEl) => {
            if (!rootEl || typeof rootEl.querySelectorAll !== 'function') return;
            if (typeof window.marked === 'undefined' || typeof window.marked.parse !== 'function') return;

            const handleMermaidTag = () => {
                const nodes = Array.from(rootEl.querySelectorAll('mermaid'));
                nodes.forEach((el) => {
                    if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
                    if (isInsideCodeBlock(el)) return;
                    if (hasRenderedMarkdown(el)) return;

                    const diagramCode = normalizeMarkdownText(extractMarkdownSource(el));
                    if (!String(diagramCode || '').trim()) return;

                    const diagramId = `md-mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
                    if (
                        window.mermaidRenderer &&
                        typeof window.mermaidRenderer.createDiagramContainer === 'function' &&
                        typeof window.mermaidRenderer.renderDiagram === 'function'
                    ) {
                        const containerHtml = window.mermaidRenderer.createDiagramContainer(diagramId, diagramCode, {
                            showHeader: false,
                            showActions: true,
                            headerLabel: 'MERMAID 图表',
                            sourceLine: null
                        });
                        const tpl = document.createElement('template');
                        tpl.innerHTML = String(containerHtml || '');
                        const wrapper = tpl.content && tpl.content.firstElementChild ? tpl.content.firstElementChild : null;
                        if (wrapper) {
                            replaceWith(el, wrapper);
                            markRenderedMarkdown(wrapper);
                            setTimeout(() => {
                                try {
                                    window.mermaidRenderer.renderDiagram(diagramId, diagramCode, { showLoading: false });
                                } catch (_) { }
                            }, 0);
                            return;
                        }
                    }

                    const pre = document.createElement('pre');
                    pre.className = 'md-code';
                    const codeEl = document.createElement('code');
                    codeEl.className = 'language-mermaid';
                    codeEl.textContent = diagramCode;
                    pre.appendChild(codeEl);
                    replaceWith(el, pre);
                    markRenderedMarkdown(pre);
                });
            };

            const renderMarkdownInCustomTags = (root) => {
                const selector = [
                    'tabs',
                    'card',
                    'tab',
                    'tabitem',
                    'note',
                    'info',
                    'warning',
                    'danger',
                    'caution',
                    'success'
                ].join(',');

                for (let pass = 0; pass < 5; pass++) {
                    let changed = false;
                    const nodes = Array.from(root.querySelectorAll(selector));
                    for (const el of nodes) {
                        if (!el || el.nodeType !== Node.ELEMENT_NODE) continue;
                        if (isInsideCodeBlock(el)) continue;
                        if (hasRenderedMarkdown(el)) continue;

                        const md = normalizeMarkdownText(extractMarkdownSource(el));
                        if (!String(md || '').trim()) continue;

                        const tpl = document.createElement('template');
                        try {
                            tpl.innerHTML = String(window.marked.parse(String(md), { gfm: true, breaks: true }) || '');
                        } catch (_) {
                            try {
                                tpl.innerHTML = String(window.marked.parse(String(md)) || '');
                            } catch (_) {
                                continue;
                            }
                        }

                        while (el.firstChild) el.removeChild(el.firstChild);
                        moveChildren(tpl.content, el);
                        markRenderedMarkdown(el);
                        changed = true;
                    }
                    if (!changed) break;
                }
            };

            const handleCardGroup = () => {
                const nodes = Array.from(rootEl.querySelectorAll('cardgroup'));
                nodes.forEach((el) => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'pet-card-group';
                    moveChildren(el, wrapper);
                    replaceWith(el, wrapper);
                });
            };

            const handleCard = () => {
                const nodes = Array.from(rootEl.querySelectorAll('card'));
                nodes.forEach((el) => {
                    const title = toSafeText(pickAttr(el, ['title', 'name', 'header']));
                    const desc = toSafeText(pickAttr(el, ['desc', 'description', 'subtitle']), 400);
                    const icon = toSafeText(pickAttr(el, ['icon', 'emoji']), 24);
                    const hrefRaw = pickAttr(el, ['href', 'link', 'to', 'url']);
                    const href = hrefRaw ? String(hrefRaw).trim() : '';

                    const outer = href ? document.createElement('a') : document.createElement('div');
                    outer.className = 'pet-card';
                    if (href && outer.tagName === 'A') {
                        const safeHref = sanitizeUrl(href);
                        if (safeHref) {
                            outer.setAttribute('href', safeHref);
                            outer.setAttribute('target', '_blank');
                            outer.setAttribute('rel', 'noopener noreferrer');
                        }
                    }

                    const header = document.createElement('div');
                    header.className = 'pet-card__header';

                    if (icon) {
                        const iconEl = document.createElement('span');
                        iconEl.className = 'pet-card__icon';
                        iconEl.textContent = icon;
                        header.appendChild(iconEl);
                    }

                    if (title) {
                        const titleEl = document.createElement('span');
                        titleEl.className = 'pet-card__title';
                        titleEl.textContent = title;
                        header.appendChild(titleEl);
                    }

                    if (header.childNodes.length) outer.appendChild(header);

                    if (desc) {
                        const descEl = document.createElement('div');
                        descEl.className = 'pet-card__desc';
                        descEl.textContent = desc;
                        outer.appendChild(descEl);
                    }

                    const body = document.createElement('div');
                    body.className = 'pet-card__body';
                    moveChildren(el, body);
                    if (body.childNodes.length) outer.appendChild(body);

                    replaceWith(el, outer);
                });
            };

            const handleAdmonitions = () => {
                const tags = ['note', 'info', 'warning', 'danger', 'caution', 'success'];
                const selector = tags.join(',');
                const nodes = Array.from(rootEl.querySelectorAll(selector));
                nodes.forEach((el) => {
                    const tagName = String(el?.tagName || '').toLowerCase();
                    const defaultType =
                        tagName === 'note'
                            ? 'note'
                            : tagName === 'warning'
                                ? 'warning'
                                : tagName === 'danger'
                                    ? 'danger'
                                    : tagName === 'caution'
                                        ? 'caution'
                                        : tagName === 'success'
                                            ? 'success'
                                            : 'info';

                    const rawType = toSafeText(pickAttr(el, ['type', 'kind', 'variant']), 32).toLowerCase();
                    const normalized = rawType || defaultType;
                    const type = ['info', 'note', 'warning', 'danger', 'caution', 'success'].includes(normalized)
                        ? normalized
                        : defaultType;

                    const title = toSafeText(pickAttr(el, ['title', 'header']), 120);

                    const outer = document.createElement('div');
                    outer.className = `pet-tip pet-tip--${type}`;

                    if (title) {
                        const titleEl = document.createElement('div');
                        titleEl.className = 'pet-tip__title';
                        titleEl.textContent = title;
                        outer.appendChild(titleEl);
                    }

                    const content = document.createElement('div');
                    content.className = 'pet-tip__content';
                    moveChildren(el, content);
                    outer.appendChild(content);

                    replaceWith(el, outer);
                });
            };

            const handleTabs = () => {
                const nodes = Array.from(rootEl.querySelectorAll('tabs'));
                nodes.forEach((tabsEl) => {
                    const outer = document.createElement('div');
                    outer.className = 'pet-tabs';
                    const nav = document.createElement('div');
                    nav.className = 'pet-tabs__nav';
                    const panels = document.createElement('div');
                    panels.className = 'pet-tabs__panels';
                    const items = Array.from(tabsEl.querySelectorAll('tab, tabitem')).filter((tabEl) => {
                        if (typeof tabEl?.closest === 'function') return tabEl.closest('tabs') === tabsEl;
                        return true;
                    });

                    const finalItems = items.length ? items : [tabsEl];
                    finalItems.forEach((itemEl, idx) => {
                        const label =
                            toSafeText(pickAttr(itemEl, ['label', 'title', 'name', 'value']), 120) ||
                            `Tab ${idx + 1}`;
                        const tabEl = document.createElement('div');
                        tabEl.className = `pet-tabs__tab${idx === 0 ? ' is-active' : ''}`;
                        tabEl.textContent = label;
                        nav.appendChild(tabEl);

                        const panel = document.createElement('div');
                        panel.className = `pet-tabs__panel${idx === 0 ? ' is-active' : ''}`;
                        const sourceEl = itemEl === tabsEl ? tabsEl : itemEl;
                        moveChildren(sourceEl, panel);
                        panels.appendChild(panel);
                    });

                    outer.appendChild(nav);
                    outer.appendChild(panels);
                    replaceWith(tabsEl, outer);
                });
            };

            const handleStandaloneTab = () => {
                const nodes = Array.from(rootEl.querySelectorAll('tab, tabitem'));
                nodes.forEach((tabEl, idx) => {
                    if (typeof tabEl.closest === 'function' && tabEl.closest('tabs')) return;

                    const wrapper = tabEl.parentElement;
                    const wrapperTag = normalizeComponentName(wrapper);
                    const wrapperIsSimple =
                        wrapper && (wrapperTag === 'p' || wrapperTag === 'div' || wrapperTag === 'span');

                    const wrapperIsSolo = (() => {
                        if (!wrapperIsSimple) return false;
                        const meaningful = Array.from(wrapper.childNodes || []).filter((n) => {
                            if (!n) return false;
                            if (n.nodeType === Node.ELEMENT_NODE) return true;
                            if (n.nodeType === Node.TEXT_NODE) return String(n.textContent || '').trim().length > 0;
                            return false;
                        });
                        return meaningful.length === 1 && meaningful[0] === tabEl;
                    })();

                    const outer = document.createElement('div');
                    outer.className = 'pet-tabs';

                    const nav = document.createElement('div');
                    nav.className = 'pet-tabs__nav';
                    const label = toSafeText(pickAttr(tabEl, ['label', 'title', 'name', 'value']), 120) || `Tab ${idx + 1}`;
                    const tabButton = document.createElement('div');
                    tabButton.className = 'pet-tabs__tab is-active';
                    tabButton.textContent = label;
                    nav.appendChild(tabButton);

                    const panels = document.createElement('div');
                    panels.className = 'pet-tabs__panels';
                    const panel = document.createElement('div');
                    panel.className = 'pet-tabs__panel is-active';
                    moveChildren(tabEl, panel);
                    panels.appendChild(panel);

                    outer.appendChild(nav);
                    outer.appendChild(panels);

                    replaceWith(wrapperIsSolo ? wrapper : tabEl, outer);
                });
            };

            handleMermaidTag();
            renderMarkdownInCustomTags(rootEl);
            handleCardGroup();
            handleTabs();
            handleStandaloneTab();
            handleCard();
            handleAdmonitions();
        };

        try {
            transformComponents(template.content);
        } catch (_) { }

        const allowedTags = new Set([
            'a', 'b', 'blockquote', 'br', 'button', 'code', 'del', 'details', 'div', 'em',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'input', 'kbd', 'li',
            'mark', 'ol', 'p', 'pre', 'small', 'span', 'strong', 'sub', 'summary',
            'sup', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul'
        ]);

        const removeTags = new Set(['script', 'iframe', 'object', 'embed', 'link', 'meta', 'style']);

        const sanitizeElement = (el) => {
            const tag = String(el.tagName || '').toLowerCase();
            const insideMermaid = typeof el.closest === 'function' && !!el.closest('.mermaid-diagram-wrapper');

            for (const child of Array.from(el.childNodes)) {
                if (child.nodeType === Node.ELEMENT_NODE) {
                    sanitizeElement(child);
                } else if (child.nodeType === Node.COMMENT_NODE) {
                    child.parentNode && child.parentNode.removeChild(child);
                }
            }

            if (removeTags.has(tag)) {
                el.parentNode && el.parentNode.removeChild(el);
                return;
            }

            if (!allowedTags.has(tag)) {
                const parent = el.parentNode;
                if (parent) {
                    while (el.firstChild) {
                        parent.insertBefore(el.firstChild, el);
                    }
                    parent.removeChild(el);
                }
                return;
            }

            for (const attr of Array.from(el.attributes)) {
                const name = attr.name.toLowerCase();
                if (name === 'onclick') {
                    if (tag === 'button' && insideMermaid) {
                        const v = String(attr.value || '').trim();
                        const ok = /^window\.(copyMermaidCode|downloadMermaidSVG|openMermaidLive|downloadMermaidPNG|openMermaidFullscreen)\(['"][A-Za-z0-9_-]{1,80}['"]\)\s*;?\s*$/.test(v);
                        if (ok) {
                            el.setAttribute('onclick', v);
                            continue;
                        }
                    }
                    el.removeAttribute(attr.name);
                    continue;
                }
                if (name.startsWith('on')) {
                    el.removeAttribute(attr.name);
                    continue;
                }
                if (name === 'style') {
                    const safeStyle = sanitizeStyleText(attr.value || '');
                    if (safeStyle) el.setAttribute('style', safeStyle);
                    else el.removeAttribute('style');
                    continue;
                }
                if (name === 'class') {
                    const safeClass = sanitizeClassName(attr.value || '');
                    if (safeClass) el.setAttribute('class', safeClass);
                    else el.removeAttribute('class');
                    continue;
                }
                if (name === 'id') {
                    const rawId = String(attr.value || '').trim();
                    const safeId = /^[A-Za-z][A-Za-z0-9:_-]{0,127}$/.test(rawId) ? rawId : '';
                    if (safeId) el.setAttribute('id', safeId);
                    else el.removeAttribute('id');
                    continue;
                }
                if (name === 'data-mermaid-code' && insideMermaid) {
                    const rawCode = String(attr.value || '');
                    if (rawCode && rawCode.length <= 50000) el.setAttribute('data-mermaid-code', rawCode);
                    else el.removeAttribute('data-mermaid-code');
                    continue;
                }
                if (name === 'data-source-line' && insideMermaid) {
                    const rawLine = String(attr.value || '').trim();
                    if (/^\d{1,7}$/.test(rawLine) || rawLine === '') el.setAttribute('data-source-line', rawLine);
                    else el.removeAttribute('data-source-line');
                    continue;
                }
                if (tag === 'button' && (name === 'type' || name === 'title' || name === 'aria-label')) {
                    if (name === 'type') {
                        const t = String(attr.value || '').toLowerCase();
                        if (t === 'button' || t === 'submit' || t === 'reset') el.setAttribute('type', t);
                        else el.setAttribute('type', 'button');
                    } else {
                        el.setAttribute(name, String(attr.value || '').slice(0, 200));
                    }
                    continue;
                }

                if (tag === 'a' && (name === 'href' || name === 'title' || name === 'target' || name === 'rel')) {
                    if (name === 'href') {
                        const safeHref = sanitizeUrl(attr.value || '');
                        if (safeHref) el.setAttribute('href', safeHref);
                        else el.removeAttribute('href');
                    } else if (name === 'target') {
                        const v = String(attr.value || '').toLowerCase();
                        if (v === '_blank' || v === '_self') el.setAttribute('target', v);
                        else el.removeAttribute('target');
                    } else if (name === 'rel') {
                        el.setAttribute('rel', 'noopener noreferrer');
                    } else {
                        el.setAttribute(name, String(attr.value || '').slice(0, 120));
                    }
                    continue;
                }

                if (tag === 'img' && (name === 'src' || name === 'alt' || name === 'title' || name === 'width' || name === 'height' || name === 'loading' || name === 'decoding')) {
                    if (name === 'src') {
                        const safeSrc = sanitizeUrl(attr.value || '');
                        if (safeSrc) el.setAttribute('src', safeSrc);
                        else el.removeAttribute('src');
                    } else if (name === 'width' || name === 'height') {
                        const v = String(attr.value || '').trim();
                        if (/^\d{1,4}$/.test(v)) el.setAttribute(name, v);
                        else el.removeAttribute(name);
                    } else if (name === 'loading') {
                        const v = String(attr.value || '').toLowerCase();
                        if (v === 'lazy' || v === 'eager') el.setAttribute('loading', v);
                        else el.setAttribute('loading', 'lazy');
                    } else if (name === 'decoding') {
                        const v = String(attr.value || '').toLowerCase();
                        if (v === 'async' || v === 'sync' || v === 'auto') el.setAttribute('decoding', v);
                        else el.setAttribute('decoding', 'async');
                    } else {
                        el.setAttribute(name, escapeHtml(String(attr.value || '')).slice(0, 200));
                    }
                    continue;
                }

                if (tag === 'input' && (name === 'type' || name === 'checked' || name === 'disabled')) {
                    if (name === 'type') {
                        const v = String(attr.value || '').toLowerCase();
                        if (v === 'checkbox') el.setAttribute('type', 'checkbox');
                        else el.removeAttribute('type');
                    } else {
                        el.setAttribute(name, '');
                    }
                    continue;
                }

                if ((name === 'title' || name === 'aria-label') && attr.value) {
                    el.setAttribute(name, String(attr.value).slice(0, 200));
                    continue;
                }

                el.removeAttribute(attr.name);
            }

            if (tag === 'a' && el.getAttribute('target') === '_blank') {
                el.setAttribute('rel', 'noopener noreferrer');
            }

            if (tag === 'img') {
                if (!el.getAttribute('loading')) el.setAttribute('loading', 'lazy');
                if (!el.getAttribute('decoding')) el.setAttribute('decoding', 'async');
            }

            if (tag === 'input') {
                const t = String(el.getAttribute('type') || '').toLowerCase();
                if (t !== 'checkbox') {
                    el.parentNode && el.parentNode.removeChild(el);
                    return;
                }
                el.setAttribute('type', 'checkbox');
                el.setAttribute('disabled', '');
                if (el.hasAttribute('checked')) el.setAttribute('checked', '');
            }
        };

        for (const node of Array.from(template.content.childNodes)) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                sanitizeElement(node);
            } else if (node.nodeType === Node.COMMENT_NODE) {
                node.parentNode && node.parentNode.removeChild(node);
            }
        }

        const container = document.createElement('div');
        container.appendChild(template.content.cloneNode(true));
        return container.innerHTML;
    } catch (_) {
        return '';
    }
};
