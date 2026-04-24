/**
 * Mermaid Plugin
 * Integrates mermaid diagram rendering into markdown
 */

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

export const MermaidPlugin = {
  name: 'mermaid',
  version: '1.0.0',
  priority: 120,

  _mermaidRenderer: null,

  constructor(options = {}) {
    this._mermaidRenderer = options.mermaidRenderer || null;
  },

  async _getMermaidRenderer() {
    if (this._mermaidRenderer) return this._mermaidRenderer;

    if (_mermaidRendererCache) {
      this._mermaidRenderer = _mermaidRendererCache;
      return this._mermaidRenderer;
    }

    try {
      const { createMermaidRendererWithPlugins } = await import('../../mermaid/index.js');
      _mermaidRendererCache = createMermaidRendererWithPlugins();
      this._mermaidRenderer = _mermaidRendererCache;
      return this._mermaidRenderer;
    } catch (e) {
      console.warn('[MermaidPlugin] Failed to load mermaid renderer:', e);
      return null;
    }
  },

  extendRenderer(renderer) {
    const self = this;
    const originalCode = renderer.code ? renderer.code.bind(renderer) : null;

    renderer.code = function(code, language) {
      const lang = String(language || '').toLowerCase();

      if (lang === 'mermaid' || lang === 'mmd') {
        const diagramId = `md-mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const diagramCode = String(code || '').trim();

        requestAnimationFrame(async () => {
          const renderer = await self._getMermaidRenderer();
          if (renderer) {
            await renderer.initialize();
            await renderer.renderDiagram(diagramId, diagramCode);
          } else {
            const el = document.getElementById(diagramId);
            if (el) {
              el.innerHTML = `<pre class="md-code"><code class="language-mermaid">${escapeHtml(diagramCode)}</code></pre>`;
            }
          }
        });

        return `
          <div class="mermaid-diagram-wrapper">
            <div class="mermaid-diagram-container" id="${escapeHtml(diagramId)}" data-mermaid-code="${escapeHtml(diagramCode)}"></div>
          </div>
        `;
      }

      if (originalCode) {
        return originalCode(code, language);
      }
      return `<pre class="md-code"><code class="language-${escapeHtml(lang || 'text')}">${escapeHtml(code)}</code></pre>`;
    };
  }
};