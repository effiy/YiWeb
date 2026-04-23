/**
 * Mermaid Renderer
 * Core diagram rendering with plugin support
 */

import { getMermaidConfig, VALID_DIAGRAM_TYPES } from './MermaidConfig.js';

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

export class MermaidRenderer {
  constructor(options = {}) {
    this.options = {
      autoAdjustSize: true,
      showLoading: true,
      showErrorDetails: true,
      enableRetry: true,
      maxRetries: 2,
      ...options
    };

    this.config = getMermaidConfig(options.config || {});
    this.isInitialized = false;
    this.renderQueue = [];
    this._plugins = [];
    this._stats = {
      total: 0,
      rendered: 0,
      errors: 0,
      retries: 0
    };
  }

  use(plugin, pluginOptions = {}) {
    if (!plugin || typeof plugin !== 'object') {
      throw new Error('Plugin must be an object');
    }
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new Error('Plugin must have a name property');
    }

    this._plugins.push({
      ...plugin,
      _pluginOptions: pluginOptions
    });

    if (plugin.onInit && typeof plugin.onInit === 'function') {
      plugin.onInit({ renderer: this, options: pluginOptions });
    }

    return this;
  }

  async initialize() {
    if (this.isInitialized) return true;

    if (typeof mermaid === 'undefined') {
      console.warn('[MermaidRenderer] Mermaid.js not loaded');
      return false;
    }

    try {
      mermaid.initialize(this.config);
      this.isInitialized = true;

      this.processRenderQueue();
      return true;
    } catch (error) {
      console.error('[MermaidRenderer] Initialization failed:', error);
      return false;
    }
  }

  processRenderQueue() {
    if (this.renderQueue.length === 0) return;

    const tasks = [...this.renderQueue];
    this.renderQueue = [];

    tasks.forEach(task => {
      this.renderDiagram(task.diagramId, task.code, task.options);
    });
  }

  validateCode(code) {
    if (!code || typeof code !== 'string') {
      return { valid: false, error: 'Code is empty or not a string' };
    }

    const cleanCode = code.trim();
    if (!cleanCode) {
      return { valid: false, error: 'Code is empty after trimming' };
    }

    // 非常宽松的验证：只要代码不为空，就让 mermaid 尝试渲染
    // 不进行严格的类型检查，让 mermaid 自己处理
    return { valid: true, type: 'unknown', code: cleanCode };
  }

  cleanCode(code) {
    if (!code) return '';

    // 简化版本：仅进行必要的 HTML 实体解码
    // 避免过度处理，确保 mermaid 代码完整性
    let decoded = code;

    // 使用 textarea 进行可靠的 HTML 实体解码
    try {
      if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = code;
        decoded = textarea.value || code;
      } else {
        // 非浏览器环境：简单替换
        decoded = code
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
      }
    } catch (_) {
      decoded = code;
    }

    // 基本的空白字符处理
    return decoded
      .trim()
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  }

  async renderDiagram(diagramId, code, options = {}) {
    const {
      showLoading = this.options.showLoading,
      onSuccess = null,
      onError = null,
      container = null,
      retryCount = 0,
      maxRetries = this.options.maxRetries
    } = options;

    this._stats.total++;

    if (!this.isInitialized) {
      this.renderQueue.push({ diagramId, code, options });
      await this.initialize();
      return;
    }

    const diagram = container || document.getElementById(diagramId);
    if (!diagram) {
      const error = new Error(`Diagram element not found: ${diagramId}`);
      console.warn(`[MermaidRenderer] ${error.message}`);
      this._stats.errors++;
      if (onError) onError(error);
      return;
    }

    if (diagram.hasAttribute('data-mermaid-rendered')) {
      return;
    }

    // 简化：直接清理代码，不做严格验证
    const finalCode = this.cleanCode(code);
    console.log(`[MermaidRenderer] Rendering diagram ${diagramId} with code:`, finalCode);

    if (showLoading) {
      diagram.innerHTML = this.createLoadingHtml();
    }

    try {
      const renderId = `mermaid-svg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const { svg } = await mermaid.render(renderId, finalCode);

      diagram.innerHTML = svg;
      diagram.setAttribute('data-mermaid-rendered', 'true');
      diagram.setAttribute('data-mermaid-code', escapeHtml(finalCode));

      this._stats.rendered++;
      console.log(`[MermaidRenderer] Diagram ${diagramId} rendered successfully`);

      if (this.options.autoAdjustSize) {
        this.adjustSizeAfterRender(diagram);
      }

      for (const plugin of this._plugins) {
        if (plugin.afterRender && typeof plugin.afterRender === 'function') {
          plugin.afterRender({ diagram, code: finalCode, renderer: this });
        }
      }

      if (onSuccess) onSuccess(svg);
    } catch (error) {
      console.error(`[MermaidRenderer] Diagram ${diagramId} render failed:`, error);
      console.error(`[MermaidRenderer] Failed code was:`, finalCode);

      if (this.options.enableRetry && retryCount < maxRetries) {
        this._stats.retries++;
        setTimeout(() => {
          this.renderDiagram(diagramId, code, {
            ...options,
            retryCount: retryCount + 1,
            showLoading: false
          });
        }, 1000 * (retryCount + 1));
        return;
      }

      this._stats.errors++;
      diagram.innerHTML = this.createErrorHtml(error.message, finalCode, {
        retryCount,
        maxRetries,
        canRetry: retryCount < maxRetries,
        diagramId
      });

      if (onError) onError(error);
    }
  }

  async renderDiagrams(selector = '.mermaid-diagram-container') {
    const diagrams = document.querySelectorAll(selector);

    const renderPromises = Array.from(diagrams).map(diagram => {
      const code = diagram.getAttribute('data-mermaid-code');
      if (!code) return Promise.resolve();
      return this.renderDiagram(diagram.id, code, {
        container: diagram,
        showLoading: true
      });
    });

    await Promise.all(renderPromises);
  }

  createLoadingHtml() {
    return `
      <div class="mermaid-loading" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        color: var(--text-muted, #94a3b8);
      ">
        <div class="mermaid-spinner" style="
          width: 40px;
          height: 40px;
          border: 3px solid var(--bg-tertiary, #334155);
          border-top-color: var(--primary, #667eea);
          border-radius: 50%;
          animation: mermaid-spin 1s linear infinite;
          margin-bottom: 16px;
        "></div>
        <span>Rendering diagram...</span>
      </div>
      <style>
        @keyframes mermaid-spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
  }

  createErrorHtml(errorMessage, code, options = {}) {
    const {
      retryCount = 0,
      maxRetries = 0,
      canRetry = false,
      diagramId = null
    } = options;

    const escapedError = escapeHtml(errorMessage);
    const escapedCode = escapeHtml(code);

    return `
      <div class="mermaid-error" style="
        background: var(--bg-secondary, #1e293b);
        border: 1px solid var(--border-error, rgba(239,68,68,0.3));
        border-radius: var(--radius-lg, 0.75rem);
        padding: 16px;
        color: var(--text-error, #ef4444);
      ">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <span style="font-size: 20px;">⚠️</span>
          <strong>Diagram render failed</strong>
        </div>
        <p style="margin: 0 0 12px 0; font-size: 14px;">${escapedError}</p>
        <details style="margin-bottom: 8px;">
          <summary style="cursor: pointer; font-size: 13px;">View raw code</summary>
          <pre style="
            background: var(--bg-tertiary, #334155);
            padding: 12px;
            border-radius: var(--radius-md, 0.5rem);
            overflow-x: auto;
            font-size: 12px;
            margin-top: 8px;
            color: var(--text-secondary, #e2e8f0);
          "><code>${escapedCode}</code></pre>
        </details>
      </div>
    `;
  }

  adjustSizeAfterRender(diagram) {
    const adjustSize = () => {
      const svg = diagram.querySelector('svg');
      if (svg) {
        const hasContent = svg.children.length > 0 || svg.innerHTML.trim().length > 0;
        if (hasContent) {
          this.adjustMermaidSize(diagram);
        } else {
          setTimeout(adjustSize, 100);
        }
      } else {
        setTimeout(adjustSize, 100);
      }
    };

    requestAnimationFrame(() => adjustSize());
    setTimeout(() => adjustSize(), 100);
    setTimeout(() => adjustSize(), 500);
  }

  adjustMermaidSize(mermaidDiv) {
    if (!mermaidDiv) return;

    const svg = mermaidDiv.querySelector('svg');
    if (!svg) return;

    try {
      const parent = mermaidDiv.parentElement;
      let maxContainerWidth = parent
        ? parent.clientWidth - 32
        : window.innerWidth - 100;

      maxContainerWidth = Math.max(maxContainerWidth, 100);

      let svgWidth, svgHeight;

      try {
        const bbox = svg.getBBox();
        if (bbox && bbox.width > 0 && bbox.height > 0) {
          svgWidth = bbox.width;
          svgHeight = bbox.height;
        }
      } catch (e) { }

      if (!svgWidth || !svgHeight) {
        const widthAttr = svg.getAttribute('width');
        const heightAttr = svg.getAttribute('height');
        const viewBox = svg.getAttribute('viewBox');

        if (widthAttr && heightAttr) {
          svgWidth = parseFloat(widthAttr);
          svgHeight = parseFloat(heightAttr);
        } else if (viewBox) {
          const parts = viewBox.split(/\s+/);
          if (parts.length >= 4) {
            svgWidth = parseFloat(parts[2]);
            svgHeight = parseFloat(parts[3]);
          }
        }
      }

      if (!svgWidth || !svgHeight) {
        svgWidth = svg.clientWidth || svg.offsetWidth || svg.scrollWidth;
        svgHeight = svg.clientHeight || svg.offsetHeight || svg.scrollHeight;
      }

      svgWidth = Math.max(0, svgWidth || 0);
      svgHeight = Math.max(0, svgHeight || 0);

      if (svgWidth > 0 && svgHeight > 0) {
        if (!svg.getAttribute('viewBox')) {
          svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        }

        if (svgWidth > maxContainerWidth && maxContainerWidth > 0) {
          const scale = maxContainerWidth / svgWidth;
          svgWidth = maxContainerWidth;
          svgHeight = svgHeight * scale;
          svgWidth = Math.max(0, svgWidth);
          svgHeight = Math.max(0, svgHeight);
        }

        if (svgWidth > 0 && svgHeight > 0) {
          svg.setAttribute('width', svgWidth);
          svg.setAttribute('height', svgHeight);
        }

        mermaidDiv.style.width = 'auto';
        mermaidDiv.style.height = 'auto';
        mermaidDiv.style.maxWidth = '100%';
        mermaidDiv.style.minWidth = '0';
      }
    } catch (e) {
      console.warn('[MermaidRenderer] Size adjustment failed', e);
      mermaidDiv.style.maxWidth = '100%';
      mermaidDiv.style.overflowX = 'auto';
    }
  }

  updateConfig(newConfig) {
    this.config = getMermaidConfig(newConfig);
    if (this.isInitialized && typeof mermaid !== 'undefined') {
      mermaid.initialize(this.config);
    }
  }

  resetRenderedState(selector = '.mermaid-diagram-container') {
    const diagrams = document.querySelectorAll(selector);
    diagrams.forEach(diagram => {
      diagram.removeAttribute('data-mermaid-rendered');
    });
  }

  getStats() {
    const diagrams = document.querySelectorAll('.mermaid-diagram-container');
    const rendered = document.querySelectorAll('.mermaid-diagram-container[data-mermaid-rendered="true"]');
    const errors = document.querySelectorAll('.mermaid-error');

    return {
      ...this._stats,
      domTotal: diagrams.length,
      domRendered: rendered.length,
      domErrors: errors.length,
      isInitialized: this.isInitialized,
      queueLength: this.renderQueue.length
    };
  }

  async reRenderAll() {
    this.resetRenderedState();
    await this.renderDiagrams();
    return this.getStats();
  }
}

// Create global instance factory function
export function createMermaidRenderer(options = {}) {
  return new MermaidRenderer(options);
}

export default MermaidRenderer;
