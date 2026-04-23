/**
 * Nested Markdown Plugin
 * Renders markdown content inside ```markdown code blocks
 */

let _nestedMarkdownStylesInjected = false;
let _mermaidRendererCache = null;

function escapeHtml(str) {
  if (typeof str !== 'string' && str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Unescape markdown content that was escaped for code blocks
 * This handles both regular backticks and escaped backticks
 */
function unescapeMarkdownContent(content) {
  if (typeof content !== 'string') return '';
  return content
    .replace(/\\`/g, '`')
    .replace(/\\\\/g, '\\');
}

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

async function _getMermaidRenderer() {
  if (_mermaidRendererCache) return _mermaidRendererCache;

  try {
    const { createMermaidRenderer } = await import('../../mermaid/index.js');
    _mermaidRendererCache = createMermaidRenderer();
    return _mermaidRendererCache;
  } catch (e) {
    console.warn('[NestedMarkdownPlugin] Failed to load mermaid renderer:', e);
    return null;
  }
}

async function _processMermaidInContainer(container) {
  if (!container || typeof document === 'undefined') return;

  // Find all mermaid diagram containers
  const mermaidContainers = container.querySelectorAll('.mermaid-diagram-container');
  if (!mermaidContainers || mermaidContainers.length === 0) return;

  const mermaidRenderer = await _getMermaidRenderer();
  if (!mermaidRenderer) return;

  await mermaidRenderer.initialize();

  // Process each mermaid diagram
  for (const el of mermaidContainers) {
    const diagramId = el.id;
    let diagramCode = el.getAttribute('data-mermaid-code');

    // If no code in attribute, try to extract from the content
    if (!diagramCode && el.innerHTML) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = el.innerHTML;
      const codeEl = tempDiv.querySelector('code');
      if (codeEl) {
        diagramCode = codeEl.textContent || codeEl.innerText;
      }
    }

    if (diagramId && diagramCode) {
      // Clear any existing content and reset rendered state
      el.innerHTML = '';
      el.removeAttribute('data-mermaid-rendered');
      await mermaidRenderer.renderDiagram(diagramId, diagramCode, { container: el });
    }
  }
}

export const NestedMarkdownPlugin = {
  name: 'nested-markdown',
  version: '1.0.0',
  priority: 110,

  constructor(options = {}) {
    this._rendererRef = options.rendererRef || null;
  },

  preprocess(markdown) {
    _injectNestedMarkdownStyles();
    return markdown;
  },

  extendRenderer(renderer) {
    const self = this;
    const originalCode = renderer.code ? renderer.code.bind(renderer) : null;

    renderer.code = function(code, language) {
      const lang = String(language || '').toLowerCase();

      if (lang === 'markdown' || lang === 'md') {
        const blockId = `md-nested-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const markdownContent = unescapeMarkdownContent(String(code || ''));

        // Store content for post-rendering
        if (!self._pendingBlocks) {
          self._pendingBlocks = [];
        }
        self._pendingBlocks.push({ blockId, markdownContent });

        setTimeout(async () => {
          const el = document.getElementById(blockId);
          if (!el) return;

          try {
            // Use marked directly to render the markdown content
            let renderedHtml = '';

            if (typeof window.marked !== 'undefined') {
              // Create a custom renderer that handles code blocks specially
              const tempRenderer = new window.marked.Renderer();

              // Keep track of mermaid blocks we find
              const mermaidBlocks = [];
              let mermaidIndex = 0;

              // Override code block rendering
              const originalCode = tempRenderer.code.bind(tempRenderer);
              tempRenderer.code = function(code, language) {
                const lang = String(language || '').toLowerCase();

                if (lang === 'mermaid' || lang === 'mmd') {
                  const placeholderId = `nested-mermaid-placeholder-${mermaidIndex}`;
                  mermaidBlocks.push({ id: placeholderId, code: code });
                  mermaidIndex++;
                  return `<div id="${placeholderId}" class="nested-mermaid-placeholder" data-code="${escapeHtml(code)}"></div>`;
                }

                return originalCode(code, language);
              };

              // Render with our custom renderer
              renderedHtml = window.marked.parse(markdownContent, {
                renderer: tempRenderer,
                breaks: true,
                gfm: true
              });

              el.innerHTML = renderedHtml;
              el.classList.add('md-nested-markdown-rendered');

              // Now process the mermaid blocks
              if (mermaidBlocks.length > 0) {
                const mermaidRenderer = await _getMermaidRenderer();
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
              // Final fallback: simple rendering
              renderedHtml = markdownContent.replace(/\n/g, '<br/>');
              el.innerHTML = renderedHtml;
            }

            // Dispatch event to notify plugins that need to process new content
            const event = new CustomEvent('md-nested-markdown-rendered', {
              detail: { element: el, markdownContent }
            });
            document.dispatchEvent(event);

          } catch (e) {
            console.warn('[NestedMarkdownPlugin] Failed to render nested markdown:', e);
            el.innerHTML = `<pre class="md-code"><code class="language-markdown">${escapeHtml(markdownContent)}</code></pre>`;
          }
        }, 0);

        return `
          <div class="md-nested-markdown-wrapper">
            <div class="md-nested-markdown-container" id="${escapeHtml(blockId)}" data-markdown-content="${escapeHtml(markdownContent)}">
              <div class="md-nested-markdown-loading">Loading...</div>
            </div>
          </div>
        `;
      }

      if (originalCode) {
        return originalCode(code, language);
      }
      return `<pre class="md-code"><code class="language-${escapeHtml(lang || 'text')}">${escapeHtml(code)}</code></pre>`;
    };
  },

  onAfterRender(element) {
    // Store renderer reference for later use
    if (element && element._markdownRenderer) {
      window._markdownRendererInstance = element._markdownRenderer;
    }
  }
};
