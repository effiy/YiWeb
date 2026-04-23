/**
 * TOC Plugin
 * Generates Table of Contents from headings
 */

const decodeHtmlText = (v) => {
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

const stripInlineHtml = (v) => {
  try {
    const raw = v == null ? '' : String(v);
    if (!raw) return '';
    return raw.replace(/<[^>]*>/g, ' ');
  } catch (_) {
    return '';
  }
};

const createHeadingSlugger = () => {
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

export const TocPlugin = {
  name: 'toc',
  version: '1.0.0',
  priority: 150,

  _headings: [],
  _slugger: null,

  onInit() {
    this._headings = [];
    this._slugger = createHeadingSlugger();
  },

  extendRenderer(renderer) {
    const self = this;
    const originalHeading = renderer.heading ? renderer.heading.bind(renderer) : null;

    renderer.heading = function(text, level, raw, slugger) {
      const plain = String(text || '').replace(/<[^>]+>/g, '');
      const id = self._slugger.slug(plain);
      const l = Math.max(1, Math.min(6, Number(level) || 1));

      self._headings.push({ id, level: l, text: plain });

      if (originalHeading) {
        try {
          const rendered = originalHeading(text, l, raw, slugger);
          if (typeof rendered === 'string' && rendered.includes('<h') && !rendered.includes(' id=')) {
            return rendered.replace(/^(<h[1-6])(\b[^>]*)>/i, `$1$2 id="${id}">`);
          }
          return rendered;
        } catch (_) { }
      }
      return `<h${l} id="${id}">${text}</h${l}>`;
    };
  },

  getHeadings() {
    return [...this._headings];
  },

  getToc(options = {}) {
    const minDepth = Math.max(1, Math.min(6, options.minDepth || 1));
    const maxDepth = Math.max(minDepth, Math.min(6, options.maxDepth || 4));
    return this._headings.filter(h => h.level >= minDepth && h.level <= maxDepth);
  }
};
