/**
 * Table Cell Markdown Plugin
 * Enables markdown rendering inside table cells
 */

export const TableCellMarkdownPlugin = {
  name: 'table-cell-markdown',
  version: '1.0.0',
  priority: 80,

  /**
   * Escape HTML special characters to prevent XSS
   * @param {string} str - Input string
   * @returns {string} Escaped string
   */
  escapeHtml(str) {
    if (typeof str !== 'string' && str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * Sanitize URL to only allow safe protocols
   * @param {string} href - Input URL
   * @returns {string} Sanitized URL or empty string if unsafe
   */
  _sanitizeUrl(href) {
    let raw = String(href ?? '').trim();
    if (!raw) return '';

    // Strip any wrapping backticks or angle brackets
    for (let i = 0; i < 4; i++) {
      const next = (() => {
        if (raw.length >= 2 && raw.startsWith('`') && raw.endsWith('`')) return raw.slice(1, -1).trim();
        if (raw.length >= 2 && raw.startsWith('<') && raw.endsWith('>')) return raw.slice(1, -1).trim();
        return raw;
      })();
      if (next === raw) break;
      raw = next;
    }

    // Allow relative paths and anchors
    if (raw.startsWith('#') || raw.startsWith('/') ||
        raw.startsWith('./') || raw.startsWith('../')) {
      return raw;
    }

    try {
      const u = new URL(raw, window.location.origin);
      const p = String(u.protocol || '').toLowerCase();
      if (p === 'http:' || p === 'https:' || p === 'mailto:') {
        return u.href;
      }
      return '';
    } catch (_) {
      return '';
    }
  },

  /**
   * Render inline markdown content manually
   * FIXED: First protect links, never process _ as italic in filenames!
   */
  renderInlineMarkdown(content) {
    if (!content || typeof content !== 'string') return '';

    let result = String(content);

    // ============================================
    // CRITICAL: FIRST PROTECT ALL LINKS AND IMAGES!
    // This ensures URL paths with underscores are NEVER processed as italic
    // ============================================
    const linkPlaceholders = [];
    let linkIndex = 0;

    // Process images first (before links)
    result = result.replace(/!\[([^\]]*?)\]\(([^)]+?)\)/g, (_, alt, url) => {
      const placeholder = `__IMAGE_${linkIndex}__`;
      const sanitizedUrl = this._sanitizeUrl(url);
      if (sanitizedUrl) {
        linkPlaceholders.push({
          placeholder,
          html: `<img src="${sanitizedUrl}" alt="${this.escapeHtml(alt)}" />`
        });
      } else {
        linkPlaceholders.push({
          placeholder,
          html: `![${alt}](${url})`
        });
      }
      linkIndex++;
      return placeholder;
    });

    // Process links
    result = result.replace(/\[([^\]]*?)\]\(([^)]+?)\)/g, (_, text, url) => {
      const placeholder = `__LINK_${linkIndex}__`;
      const sanitizedUrl = this._sanitizeUrl(url);
      if (sanitizedUrl) {
        linkPlaceholders.push({
          placeholder,
          html: `<a href="${sanitizedUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`
        });
      } else {
        linkPlaceholders.push({
          placeholder,
          html: `[${text}](${url})`
        });
      }
      linkIndex++;
      return placeholder;
    });

    // Now protect code spans
    const codePlaceholders = [];
    let codeIndex = 0;
    result = result.replace(/`([^`]+)`/g, (_, code) => {
      const placeholder = `__CODE_${codeIndex}__`;
      codePlaceholders.push({ placeholder, code });
      codeIndex++;
      return placeholder;
    });

    // ============================================
    // Process other markdown formatting
    // NOTE: WE DO NOT PROCESS _text_ FOR ITALIC!
    // It breaks filenames with underscores like /path_name/file.md
    // ============================================

    // Process bold: **text**
    result = result.replace(/\*\*([^*]+?)\*\*/g, (_, text) =>
      `<strong>${text}</strong>`
    );

    // Process bold: __text__ (only at word boundaries)
    result = result.replace(/(^|\s)__([^\s_]+?)__(?=$|\s|[.,!?])/g, (_, prefix, text) =>
      `${prefix}<strong>${text}</strong>`
    );

    // Process italic: *text* (only asterisks, NOT underscores!)
    result = result.replace(/(^|\s)\*([^*]+?)\*(?=$|\s|[.,!?])/g, (_, prefix, text) =>
      `${prefix}<em>${text}</em>`
    );

    // NO _text_ italic processing - it breaks filenames!

    // Process strikethrough: ~~text~~
    result = result.replace(/~~([^~]+?)~~/g, (_, text) =>
      `<del>${text}</del>`
    );

    // Restore code spans
    for (const { placeholder, code } of codePlaceholders) {
      result = result.replace(placeholder, `<code>${this.escapeHtml(code)}</code>`);
    }

    // Restore links and images
    for (const { placeholder, html } of linkPlaceholders) {
      result = result.replace(placeholder, html);
    }

    return result;
  },

  /**
   * Extend marked.js renderer to handle table cells
   * @param {object} renderer - marked.js renderer instance
   */
  extendRenderer(renderer) {
    const self = this;

    // Save original renderer methods
    const originalTableCell = renderer.tablecell ? renderer.tablecell.bind(renderer) : null;
    const originalTableHeader = renderer.tableheader ? renderer.tableheader.bind(renderer) : null;

    // Unescape HTML entities helper
    const unescapeHtmlContent = (content) => {
      try {
        if (typeof document !== 'undefined') {
          const textarea = document.createElement('textarea');
          textarea.innerHTML = content;
          return textarea.value || '';
        }
        return String(content)
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
      } catch (_) {
        return content;
      }
    };

    // Override tablecell renderer
    if (originalTableCell) {
      renderer.tablecell = function(content, flags) {
        // content is already escaped HTML from marked's inline parser
        // We need to unescape it first to process markdown
        let unescaped = content;
        try {
          unescaped = unescapeHtmlContent(content);
        } catch (_) {
          unescaped = content;
        }

        // Render inline markdown in the cell content
        const renderedContent = self.renderInlineMarkdown(unescaped);

        const tag = flags?.header ? 'th' : 'td';
        const align = flags?.align ? ` align="${flags.align}"` : '';
        return `<${tag}${align}>${renderedContent}</${tag}>`;
      };
    }

    // Override tableheader for consistency
    if (originalTableHeader) {
      renderer.tableheader = function(content, flags) {
        let unescaped = content;
        try {
          unescaped = unescapeHtmlContent(content);
        } catch (_) {
          unescaped = content;
        }

        const renderedContent = self.renderInlineMarkdown(unescaped);
        const align = flags?.align ? ` align="${flags.align}"` : '';
        return `<th${align}>${renderedContent}</th>`;
      };
    }
  }
};
