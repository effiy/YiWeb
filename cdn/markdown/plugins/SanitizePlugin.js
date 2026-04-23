/**
 * Sanitize Plugin
 * Cleans HTML to prevent XSS
 */

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
    'color', 'background-color', 'font-weight', 'font-style', 'text-decoration',
    'font-size', 'line-height', 'font-family', 'text-align', 'white-space',
    'word-break', 'overflow', 'overflow-x', 'overflow-y', 'max-width', 'min-width',
    'width', 'height', 'margin', 'margin-top', 'margin-right', 'margin-bottom',
    'margin-left', 'padding', 'padding-top', 'padding-right', 'padding-bottom',
    'padding-left', 'border', 'border-radius', 'border-width', 'border-style',
    'border-color', 'display'
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
    safe.push(`${prop}: ${value}`);
  }
  return safe.join('; ');
};

function escapeHtml(str) {
  if (typeof str !== 'string' && str == null) return '';
  const unescaped = String(str)
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
}

const sanitizeUrl = (href) => {
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

export const SanitizePlugin = {
  name: 'sanitize',
  version: '1.0.0',
  priority: 200,

  postprocess(html) {
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
          if (name.startsWith('on')) {
            el.removeAttribute(attr.name);
            continue;
          }
          if (name.startsWith('data-')) {
            // 允许所有 data-* 属性，值进行转义并限制长度
            el.setAttribute(name, escapeHtml(String(attr.value || '')).slice(0, 512));
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
  }
};
