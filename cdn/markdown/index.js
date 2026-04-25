/**
 * Markdown - Preset Export
 * Contains commonly used plugins
 */

import { MarkdownRenderer } from './core/index.js';
import { ContainersPlugin } from './plugins/index.js';
import { AccordionPlugin } from './plugins/index.js';
import { FrontmatterPlugin } from './plugins/index.js';
import { TocPlugin } from './plugins/index.js';
import { InternalLinkPlugin } from './plugins/index.js';
import { initializeInternalLinks, processCodeBlockLinksInHtml } from './plugins/InternalLinkPlugin.js';
import { SanitizePlugin } from './plugins/index.js';
import { MermaidPlugin } from './plugins/index.js';
import { TableCellMarkdownPlugin } from './plugins/index.js';
import { NestedMarkdownPlugin } from './plugins/index.js';

export function createMarkdownRendererWithPlugins(options = {}) {
  const renderer = new MarkdownRenderer(options);
  renderer.use(ContainersPlugin);
  renderer.use(AccordionPlugin);
  renderer.use(FrontmatterPlugin);
  renderer.use(TocPlugin);
  renderer.use(InternalLinkPlugin);
  renderer.use(SanitizePlugin);
  renderer.use(MermaidPlugin);
  renderer.use(TableCellMarkdownPlugin);
  renderer.use(NestedMarkdownPlugin, { rendererRef: renderer });
  return renderer;
}

export { MarkdownRenderer };
export * from './core/index.js';
export * from './plugins/index.js';

// ============================================================================
// BACKWARD COMPATIBILITY LAYER
// ============================================================================

// Utility functions
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

// Container syntax preprocessing
let _containerStylesInjected = false;

const _injectContainerStyles = () => {
  if (_containerStylesInjected || typeof document === 'undefined') return;
  _containerStylesInjected = true;

  try {
    const existing = document.getElementById('md-container-styles');
    if (existing) return;

    const style = document.createElement('style');
    style.id = 'md-container-styles';
    style.textContent = `
      .md-container {
        margin: 16px 0;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid transparent;
        position: relative;
      }
      .md-container-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        font-weight: 600;
        font-size: 14px;
      }
      .md-container-icon {
        font-size: 16px;
        line-height: 1;
        flex-shrink: 0;
      }
      .md-container-title {
        line-height: 1.4;
      }
      .md-container-body {
        padding: 12px 16px 14px;
      }
      .md-container-body > :first-child { margin-top: 0; }
      .md-container-body > :last-child { margin-bottom: 0; }
      .md-container-body p { margin: 8px 0; }
      .md-container-body ul,
      .md-container-body ol {
        margin: 8px 0;
        padding-left: 24px;
      }
      .md-container-body code {
        background: rgba(0, 0, 0, 0.1);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.9em;
      }
      .md-container-default {
        background: rgba(128, 128, 128, 0.1);
        border-color: rgba(128, 128, 128, 0.2);
      }
      .md-container-default .md-container-header {
        background: rgba(128, 128, 128, 0.15);
      }
      .md-container-tip {
        background: rgba(87, 186, 143, 0.1);
        border-color: rgba(87, 186, 143, 0.3);
      }
      .md-container-tip .md-container-header {
        background: rgba(87, 186, 143, 0.18);
        color: #41b583;
      }
      .md-container-warning {
        background: rgba(245, 158, 11, 0.1);
        border-color: rgba(245, 158, 11, 0.35);
      }
      .md-container-warning .md-container-header {
        background: rgba(245, 158, 11, 0.2);
        color: #d99009;
      }
      .md-container-danger {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.35);
      }
      .md-container-danger .md-container-header {
        background: rgba(239, 68, 68, 0.2);
        color: #e04444;
      }
      .md-container-note, .md-container-info {
        background: rgba(59, 130, 246, 0.1);
        border-color: rgba(59, 130, 246, 0.3);
      }
      .md-container-note .md-container-header,
      .md-container-info .md-container-header {
        background: rgba(59, 130, 246, 0.18);
        color: #3b82f6;
      }
      .md-container-success {
        background: rgba(34, 197, 94, 0.1);
        border-color: rgba(34, 197, 94, 0.35);
      }
      .md-container-success .md-container-header {
        background: rgba(34, 197, 94, 0.2);
        color: #16a34a;
      }
    `.trim();
    document.head.appendChild(style);
  } catch (_) { }
};

// Nested markdown styles
let _nestedMarkdownStylesInjected = false;

const _injectNestedMarkdownStyles = () => {
  if (_nestedMarkdownStylesInjected || typeof document === 'undefined') return;
  _nestedMarkdownStylesInjected = true;

  try {
    const existing = document.getElementById('md-nested-markdown-styles');
    if (existing) return;

    const style = document.createElement('style');
    style.id = 'md-nested-markdown-styles';
    style.textContent = `
      .md-nested-markdown-wrapper {
        margin: 16px 0;
        border-radius: 12px;
        border: 1px solid rgba(128, 128, 128, 0.2);
        background: rgba(128, 128, 128, 0.05);
        overflow: hidden;
      }
      .md-nested-markdown-container {
        padding: 16px;
      }
      .md-nested-markdown-container > :first-child {
        margin-top: 0;
      }
      .md-nested-markdown-container > :last-child {
        margin-bottom: 0;
      }
      .md-nested-markdown-loading {
        color: rgba(128, 128, 128, 0.5);
        font-style: italic;
      }
    `.trim();
    document.head.appendChild(style);
  } catch (_) { }
};

const preprocessMarkdownContainers = (text) => {
  if (!text || typeof text !== 'string') return text;

  _injectContainerStyles();

  const containerTypes = {
    '': { class: 'md-container md-container-default', icon: '', title: '' },
    'tip': { class: 'md-container md-container-tip', icon: '💡', title: '提示' },
    'warning': { class: 'md-container md-container-warning', icon: '⚠️', title: '警告' },
    'danger': { class: 'md-container md-container-danger', icon: '❌', title: '危险' },
    'note': { class: 'md-container md-container-note', icon: '📝', title: '注意' },
    'info': { class: 'md-container md-container-info', icon: 'ℹ️', title: '信息' },
    'success': { class: 'md-container md-container-success', icon: '✅', title: '成功' }
  };

  const txt = String(text || '');
  if (!txt.includes(':::')) return txt;

  const lines = txt.replace(/\r\n/g, '\n').split('\n');
  const result = [];
  const stack = [];
  const codeBlockStack = []; // 使用堆栈支持嵌套代码块

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('`')) {
      const match = line.trim().match(/^(`+)/);
      if (match) {
        const fenceCount = match[1].length;
        if (fenceCount >= 3) {
          // 检查是否是闭合当前代码块的标签
          if (codeBlockStack.length > 0 && codeBlockStack[codeBlockStack.length - 1] === fenceCount) {
            codeBlockStack.pop();
          } else {
            // 开启新的代码块层级
            codeBlockStack.push(fenceCount);
          }
        }
      }
      result.push(line);
      continue;
    }

    if (codeBlockStack.length > 0) {
      result.push(line);
      continue;
    }

    const closingMatch = line.match(/^\s*:::\s*$/);
    if (closingMatch && stack.length > 0) {
      stack.pop();
      result.push('</div></div>');
      continue;
    }

    const openingMatch = line.match(/^\s*:::\s*(\w*)(?:\s+(.+?))?\s*$/);
    if (openingMatch) {
      const type = (openingMatch[1] || '').toLowerCase();
      const customTitle = openingMatch[2] || '';
      const config = containerTypes[type] || containerTypes[''];
      const title = customTitle || config.title;

      stack.push({ type, config, hasHeader: !!(title || config.icon) });

      let html = `<div class="${config.class}">`;
      if (title || config.icon) {
        html += `<div class="md-container-header">`;
        if (config.icon) {
          html += `<span class="md-container-icon">${config.icon}</span>`;
        }
        if (title) {
          html += `<span class="md-container-title">${escapeHtml(title)}</span>`;
        }
        html += `</div>`;
      }
      html += `<div class="md-container-body">`;
      result.push(html);
      continue;
    }

    result.push(line);
  }

  while (stack.length > 0) {
    stack.pop();
    result.push('</div></div>');
  }

  return result.join('\n');
};

// Frontmatter parsing
export const parseMarkdownFrontmatter = (text) => {
  try {
    const raw = text == null ? '' : String(text);
    if (!raw) return { frontmatter: null, content: raw };

    const match = raw.match(/^---\\s*[\\r\\n]+([\\s\\S]*?)[\\r\\n]+---(?:[\\r\\n]+([\\s\\S]*))?$/);
    if (!match) return { frontmatter: null, content: raw };

    const fmRaw = match[1] || '';
    const content = match[2] || '';

    const frontmatter = {};
    const lines = fmRaw.replace(/\\r\\n/g, '\\n').split('\\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIdx = trimmed.indexOf(':');
      if (colonIdx <= 0) continue;

      const key = trimmed.slice(0, colonIdx).trim();
      let value = trimmed.slice(colonIdx + 1).trim();

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (value === 'true') frontmatter[key] = true;
      else if (value === 'false') frontmatter[key] = false;
      else if (value === 'null' || value === '') frontmatter[key] = null;
      else if (/^-?\\d+$/.test(value)) frontmatter[key] = parseInt(value, 10);
      else if (/^-?\\d+\\.\\d+$/.test(value)) frontmatter[key] = parseFloat(value);
      else frontmatter[key] = value;
    }

    return { frontmatter: Object.keys(frontmatter).length > 0 ? frontmatter : null, content };
  } catch (_) {
    return { frontmatter: null, content: text };
  }
};

// HTML sanitization (simple version)
const sanitizeMarkdownHtml = (html) => {
  if (!html) return '';
  return html;
};

// Render frontmatter HTML
const renderFrontmatterHtml = (frontmatter) => {
  if (!frontmatter || typeof frontmatter !== 'object') return '';

  const entries = Object.entries(frontmatter);
  if (entries.length === 0) return '';

  let html = '<div class="md-frontmatter">';
  for (const [key, value] of entries) {
    html += `<div class="md-frontmatter-item">
      <span class="md-frontmatter-key">${escapeHtml(key)}:</span>
      <span class="md-frontmatter-value">${escapeHtml(String(value))}</span>
    </div>`;
  }
  html += '</div>';
  return html;
};

// Mermaid renderer cache for backward compatibility layer
let _mermaidRendererCache = null;

async function _getMermaidRendererForBackwardCompat() {
  if (_mermaidRendererCache) return _mermaidRendererCache;

  try {
    const { createMermaidRenderer } = await import('../mermaid/index.js');
    _mermaidRendererCache = createMermaidRenderer();
    return _mermaidRendererCache;
  } catch (e) {
    console.warn('[renderMarkdownHtml] Failed to load mermaid renderer:', e);
    return null;
  }
}

async function _processMermaidInContainerForBackwardCompat(container) {
  if (!container || typeof document === 'undefined') return;

  const mermaidContainers = container.querySelectorAll('.mermaid-diagram-container');
  if (!mermaidContainers || mermaidContainers.length === 0) return;

  const mermaidRenderer = await _getMermaidRendererForBackwardCompat();
  if (!mermaidRenderer) return;

  await mermaidRenderer.initialize();

  for (const el of mermaidContainers) {
    const diagramId = el.id;
    const diagramCode = el.getAttribute('data-mermaid-code');
    if (diagramId && diagramCode) {
      await mermaidRenderer.renderDiagram(diagramId, diagramCode);
    }
  }
}

// Main render function - SYNCHRONOUS like original
export const renderMarkdownHtml = (text, options = {}) => {
  try {
    // 初始化内部链接样式和事件监听
    initializeInternalLinks();
    // Inject nested markdown styles
    _injectNestedMarkdownStyles();

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
      return `${fmHtml}${escapeHtml(markdownText).replace(/\\n/g, '<br/>')}`;
    }

    // Preprocess container syntax
    const processedText = preprocessMarkdownContainers(markdownText);

    const breaks = options && typeof options.breaks === 'boolean' ? options.breaks : true;
    const gfm = options && typeof options.gfm === 'boolean' ? options.gfm : true;

    try {
      // Create custom renderer to handle mermaid code blocks and table cell markdown
      let renderer;
      if (typeof window.marked.Renderer === 'function') {
        renderer = new window.marked.Renderer();
      }

      // Add heading id attribute for anchor links
      const tocSlugger = createHeadingSlugger();
      if (renderer) {
        const originalHeading = renderer.heading ? renderer.heading.bind(renderer) : null;
        renderer.heading = function(text, level, raw) {
          const plain = decodeHtmlText(stripInlineHtml(raw || text));
          const id = tocSlugger.slug(plain);
          const l = Math.max(1, Math.min(6, Number(level) || 1));

          if (originalHeading) {
            try {
              const rendered = originalHeading(text, l, raw);
              if (typeof rendered === 'string' && rendered.includes('<h') && !rendered.includes(' id=')) {
                return rendered.replace(/^(<h[1-6])(\b[^>]*)>/i, `$1$2 id="${id}">`);
              }
              return rendered;
            } catch (_) { }
          }
          return `<h${l} id="${id}">${text}</h${l}>`;
        };
      }

      // Keep track of mermaid diagrams that need rendering
      const mermaidDiagrams = [];
      // Keep track of nested markdown blocks that need rendering
      const nestedMarkdownBlocks = [];

      // Unescape markdown content for nested rendering
      const unescapeNestedMarkdown = (content) => {
        if (typeof content !== 'string') return '';
        return content
          .replace(/\\`/g, '`')
          .replace(/\\\\/g, '\\');
      };

      // Table cell inline markdown renderer (for backward compatibility layer)
      // FIXED: First protect links, never process _ as italic in filenames!
      const renderTableCellInlineMarkdown = (content) => {
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
          const placeholder = `__BC_IMAGE_${linkIndex}__`;
          const sanitizedUrl = sanitizeUrl(url);
          if (sanitizedUrl) {
            linkPlaceholders.push({
              placeholder,
              html: `<img src="${sanitizedUrl}" alt="${escapeHtml(alt)}" />`
            });
          } else {
            linkPlaceholders.push({ placeholder, html: `![${alt}](${url})` });
          }
          linkIndex++;
          return placeholder;
        });

        // Process links
        result = result.replace(/\[([^\]]*?)\]\(([^)]+?)\)/g, (_, text, url) => {
          const placeholder = `__BC_LINK_${linkIndex}__`;
          const sanitizedUrl = sanitizeUrl(url);
          if (sanitizedUrl) {
            // Use internal link format with data attributes (md-internal-link)
            let path = sanitizedUrl;
            let hash = '';
            const hashIdx = sanitizedUrl.indexOf('#');
            if (hashIdx >= 0) {
              path = sanitizedUrl.substring(0, hashIdx);
              hash = sanitizedUrl.substring(hashIdx);
            }

            const getFileName = (p) => {
              if (!p) return '';
              const cleaned = String(p).replace(/\\/g, '/');
              return cleaned.includes('/') ? cleaned.substring(cleaned.lastIndexOf('/') + 1) : cleaned;
            };
            const fileName = getFileName(path);
            const linkTitle = `点击打开文件: ${fileName}`;

            linkPlaceholders.push({
              placeholder,
              html: `<a href="${escapeHtml(sanitizedUrl)}"
                         class="md-internal-link"
                         data-target-path="${escapeHtml(path)}"
                         data-target-hash="${escapeHtml(hash)}"
                         title="${escapeHtml(linkTitle)}">
                       ${text}
                     </a>`
            });
          } else {
            linkPlaceholders.push({ placeholder, html: `[${text}](${url})` });
          }
          linkIndex++;
          return placeholder;
        });

        // Now protect code spans
        const codePlaceholders = [];
        let codeIndex = 0;
        result = result.replace(/`([^`]+)`/g, (_, code) => {
          const placeholder = `__BC_CODE_${codeIndex}__`;
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
        result = result.replace(/\*\*([^*]+?)\*\*/g, (_, text) => `<strong>${text}</strong>`);

        // Process bold: __text__ (but be careful - only match at word boundaries)
        result = result.replace(/(^|\s)__([^\s_]+?)__(?=$|\s|[.,!?])/g, (_, prefix, text) => `${prefix}<strong>${text}</strong>`);

        // Process italic: *text* (only asterisks, NOT underscores!)
        result = result.replace(/(^|\s)\*([^*]+?)\*(?=$|\s|[.,!?])/g, (_, prefix, text) => `${prefix}<em>${text}</em>`);

        // NO _text_ italic processing - it breaks filenames!

        // Process strikethrough: ~~text~~
        result = result.replace(/~~([^~]+?)~~/g, (_, text) => `<del>${text}</del>`);

        // Restore code spans
        for (const { placeholder, code } of codePlaceholders) {
          result = result.replace(placeholder, `<code>${escapeHtml(code)}</code>`);
        }

        // Restore links and images
        for (const { placeholder, html } of linkPlaceholders) {
          result = result.replace(placeholder, html);
        }

        return result;
      };

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

      // Override code block rendering
      const originalCode = renderer?.code ? renderer.code.bind(renderer) : null;

      if (renderer) {
        renderer.code = function(code, language) {
          const lang = String(language || '').toLowerCase();

          if (lang === 'mermaid' || lang === 'mmd') {
            const diagramId = `md-mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
            const diagramCode = String(code || '').trim();

            // Store for later rendering
            mermaidDiagrams.push({ diagramId, diagramCode });

            return `
              <div class="mermaid-diagram-wrapper">
                <div class="mermaid-diagram-container" id="${escapeHtml(diagramId)}" data-mermaid-code="${escapeHtml(diagramCode)}"></div>
              </div>
            `;
          }

          if (lang === 'markdown' || lang === 'md') {
            const blockId = `md-nested-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
            const markdownContent = unescapeNestedMarkdown(String(code || ''));

            // Store for later rendering
            nestedMarkdownBlocks.push({ blockId, markdownContent });

            return `
              <div class="md-nested-markdown-wrapper">
                <div class="md-nested-markdown-container" id="${escapeHtml(blockId)}" data-markdown-content="${escapeHtml(markdownContent)}">
                  <div class="md-nested-markdown-loading"></div>
                </div>
              </div>
            `;
          }

          if (originalCode) {
            return originalCode(code, language);
          }
          return `<pre class="md-code"><code class="language-${escapeHtml(lang || 'text')}">${escapeHtml(code)}</code></pre>`;
        };

        // Override table cell rendering
        const originalTableCell = renderer.tablecell ? renderer.tablecell.bind(renderer) : null;
        if (originalTableCell) {
          renderer.tablecell = function(content, flags) {
            const unescaped = unescapeHtmlContent(content);
            const renderedContent = renderTableCellInlineMarkdown(unescaped);
            const tag = flags?.header ? 'th' : 'td';
            const align = flags?.align ? ` align="${flags.align}"` : '';
            return `<${tag}${align}>${renderedContent}</${tag}>`;
          };
        }

        // 保存原始 link renderer 并添加内部链接处理
        const originalLinkForCompat = renderer?.link ? renderer.link.bind(renderer) : null;

        if (originalLinkForCompat) {
          renderer.link = function(href, title, text) {
            // 判断是否是内部链接
            const isInternal = (h) => {
              if (!h) return false;
              const trimmed = String(h).trim();
              return trimmed.startsWith('./') || trimmed.startsWith('../') || trimmed.startsWith('/') || trimmed.startsWith('#');
            };

            if (isInternal(href)) {
              // 分离路径和 hash
              let path = href;
              let hash = '';
              const hashIdx = href.indexOf('#');
              if (hashIdx >= 0) {
                path = href.substring(0, hashIdx);
                hash = href.substring(hashIdx);
              }

              // 获取文件名
              const getFileName = (p) => {
                if (!p) return '';
                const cleaned = String(p).replace(/\\/g, '/');
                return cleaned.includes('/') ? cleaned.substring(cleaned.lastIndexOf('/') + 1) : cleaned;
              };
              const fileName = getFileName(path);
              const linkTitle = title || (path ? `点击打开文件: ${fileName}` : '');

              // 简单的 HTML 转义
              const escapeHtml = (str) => {
                if (typeof str !== 'string' && str == null) return '';
                return String(str)
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#39;');
              };

              return `<a href="${escapeHtml(href)}"
                         class="md-internal-link"
                         data-target-path="${escapeHtml(path)}"
                         data-target-hash="${escapeHtml(hash)}"
                         title="${escapeHtml(linkTitle)}">
                       ${text}
                     </a>`;
            }

            // 非内部链接使用原始渲染
            return originalLinkForCompat(href, title, text);
          };
        }

        // Override table header rendering for consistency
        const originalTableHeader = renderer.tableheader ? renderer.tableheader.bind(renderer) : null;
        if (originalTableHeader) {
          renderer.tableheader = function(content, flags) {
            const unescaped = unescapeHtmlContent(content);
            const renderedContent = renderTableCellInlineMarkdown(unescaped);
            const align = flags?.align ? ` align="${flags.align}"` : '';
            return `<th${align}>${renderedContent}</th>`;
          };
        }
      }

      let rendered;
      const parseOptions = { breaks, gfm, renderer: renderer || undefined };

      if (typeof window.marked.parse === 'function') {
        rendered = window.marked.parse(processedText, parseOptions);
      } else {
        rendered = window.marked(processedText, parseOptions);
      }

      // Schedule mermaid rendering after HTML is in DOM
      if (mermaidDiagrams.length > 0) {
        requestAnimationFrame(async () => {
          console.log('[Markdown] Starting mermaid rendering for', mermaidDiagrams.length, 'diagrams');

          try {
            // 使用带插件的 MermaidRenderer，获得工具栏功能
            const { createMermaidRendererWithPlugins } = await import('../mermaid/index.js');
            const renderer = createMermaidRendererWithPlugins();
            await renderer.initialize();

            for (const { diagramId, diagramCode } of mermaidDiagrams) {
              const el = document.getElementById(diagramId);
              if (!el) continue;

              try {
                console.log('[Markdown] Rendering diagram', diagramId, 'with code:', diagramCode);
                await renderer.renderDiagram(diagramId, diagramCode);
                console.log('[Markdown] Diagram', diagramId, 'rendered successfully with plugins');
              } catch (renderError) {
                console.error('[Markdown] Failed to render diagram', diagramId, ':', renderError);
                el.innerHTML = `<pre class="md-code"><code class="language-mermaid">${escapeHtml(diagramCode)}</code></pre><div style="color:#ef4444;padding:8px 12px;font-size:12px;">渲染失败: ${escapeHtml(String(renderError.message || renderError))}</div>`;
              }
            }
          } catch (error) {
            console.error('[Markdown] Mermaid rendering setup failed:', error);
            // 降级到直接 mermaid 渲染
            try {
              if (typeof mermaid !== 'undefined') {
                mermaid.initialize({
                  startOnLoad: false,
                  securityLevel: 'loose',
                  theme: 'dark',
                  flowchart: {
                    useMaxWidth: false,
                    htmlLabels: true,
                    curve: 'basis',
                    wrap: true
                  }
                });

                for (const { diagramId, diagramCode } of mermaidDiagrams) {
                  const el = document.getElementById(diagramId);
                  if (!el) continue;

                  try {
                    const renderId = `md-mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
                    const { svg } = await mermaid.render(renderId, diagramCode);
                    el.innerHTML = svg;
                    el.setAttribute('data-mermaid-rendered', 'true');
                  } catch (renderError) {
                    console.error('[Markdown] Fallback render failed for diagram', diagramId, ':', renderError);
                    el.innerHTML = `<pre class="md-code"><code class="language-mermaid">${escapeHtml(diagramCode)}</code></pre><div style="color:#ef4444;padding:8px 12px;font-size:12px;">渲染失败: ${escapeHtml(String(renderError.message || renderError))}</div>`;
                  }
                }
              }
            } catch (fallbackError) {
              console.error('[Markdown] Fallback also failed:', fallbackError);
            }
          }
        });
      }

      // Schedule nested markdown rendering after HTML is in DOM
      if (nestedMarkdownBlocks.length > 0) {
        setTimeout(async () => {
          for (const { blockId, markdownContent } of nestedMarkdownBlocks) {
            const el = document.getElementById(blockId);
            if (!el) continue;

            try {
              let renderedHtml = '';
              if (typeof window.marked !== 'undefined') {
                // Create a custom renderer that handles code blocks specially
                const tempRenderer = new window.marked.Renderer();

                // Keep track of mermaid blocks we find
                const mermaidBlocks = [];
                let mermaidIndex = 0;

                // Override code block rendering
                const originalCode = tempRenderer.code ? tempRenderer.code.bind(tempRenderer) : null;
                tempRenderer.code = function(code, language) {
                  const lang = String(language || '').toLowerCase();

                  if (lang === 'mermaid' || lang === 'mmd') {
                    const placeholderId = `nested-mermaid-placeholder-${mermaidIndex}`;
                    mermaidBlocks.push({ id: placeholderId, code: code });
                    mermaidIndex++;
                    return `<div id="${placeholderId}" class="nested-mermaid-placeholder" data-code="${escapeHtml(code)}"></div>`;
                  }

                  if (originalCode) {
                    return originalCode(code, language);
                  }
                  return `<pre class="md-code"><code class="language-${escapeHtml(language || 'text')}">${escapeHtml(code)}</code></pre>`;
                };

                // Render with our custom renderer
                if (typeof window.marked.parse === 'function') {
                  renderedHtml = window.marked.parse(markdownContent, {
                    renderer: tempRenderer,
                    breaks: true,
                    gfm: true
                  });
                } else {
                  renderedHtml = window.marked(markdownContent, {
                    renderer: tempRenderer,
                    breaks: true,
                    gfm: true
                  });
                }

                el.innerHTML = renderedHtml;
                el.classList.add('md-nested-markdown-rendered');

                // Now process the mermaid blocks
                if (mermaidBlocks.length > 0) {
                  const mermaidRenderer = await _getMermaidRendererForBackwardCompat();
                  if (mermaidRenderer) {
                    await mermaidRenderer.initialize();

                    for (const block of mermaidBlocks) {
                      const placeholder = document.getElementById(block.id);
                      if (placeholder) {
                        // Replace placeholder with proper mermaid container
                        const diagramId = `md-nested-mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
                        const container = document.createElement('div');
                        container.className = 'mermaid-diagram-wrapper';
                        container.innerHTML = `<div class="mermaid-diagram-container" id="${diagramId}" data-mermaid-code="${escapeHtml(block.code)}"></div>`;
                        placeholder.parentNode.replaceChild(container, placeholder);

                        // Render the diagram
                        await mermaidRenderer.renderDiagram(diagramId, block.code);
                      }
                    }
                  }
                }
              } else {
                // Fallback: simple line break rendering
                renderedHtml = markdownContent.replace(/\n/g, '<br/>');
                el.innerHTML = renderedHtml;
              }

              // Dispatch event for any plugins that need to process new content
              const event = new CustomEvent('md-nested-markdown-rendered', {
                detail: { element: el, markdownContent }
              });
              document.dispatchEvent(event);

            } catch (e) {
              console.warn('[renderMarkdownHtml] Failed to render nested markdown:', e);
              el.innerHTML = `<pre class="md-code"><code class="language-markdown">${escapeHtml(markdownContent)}</code></pre>`;
            }
          }
        }, 0);
      }

      const sanitizedHtml = sanitizeMarkdownHtml(`${fmHtml}${rendered}`);
      // 处理代码块内的链接
      return processCodeBlockLinksInHtml(sanitizedHtml);
    } catch (_) {
      return `${fmHtml}${escapeHtml(processedText).replace(/\\n/g, '<br/>')}`;
    }
  } catch (_) {
    return '';
  }
};

// TOC generation
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

// Streaming render (simple fallback)
export const renderStreamingHtml = (text) => {
  return renderMarkdownHtml(text);
};
