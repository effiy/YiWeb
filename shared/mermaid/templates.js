/**
 * Mermaid UI 模板
 * author: liangliang
 * 说明：提供图表容器、工具栏、加载状态等 HTML 模板
 */

/**
 * 构建图表容器 HTML
 */
export function buildMermaidDiagramContainerHtml(options = {}) {
  const {
    diagramId,
    code,
    showHeader = true,
    showActions = true,
    headerLabel = 'MERMAID 图表',
    sourceLine = null
  } = options;

  return `
    <div class="mermaid-diagram-wrapper" style="
      margin: 16px 0;
      border: 1px solid var(--border-primary, rgba(255,255,255,0.12));
      border-radius: var(--radius-lg, 0.75rem);
      overflow: hidden;
      background: var(--bg-secondary, #1e293b);
    ">
      ${showHeader ? `
        <div class="mermaid-diagram-header" style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: var(--bg-tertiary, #334155);
          border-bottom: 1px solid var(--border-primary, rgba(255,255,255,0.12));
        ">
          <div class="mermaid-diagram-title" style="
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            font-weight: 600;
            color: var(--text-secondary, #e2e8f0);
          ">
            <svg style="width: 16px; height: 16px; color: var(--primary, #667eea);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/>
            </svg>
            ${headerLabel}
            ${sourceLine ? `<span style="color: var(--text-muted, #94a3b8); font-weight: 400;">(行 ${sourceLine})</span>` : ''}
          </div>
          ${showActions ? buildMermaidToolbarHtml({ diagramId }) : ''}
        </div>
      ` : ''}
      <div class="mermaid-diagram-container" id="${diagramId}" data-mermaid-code="${escapeHtmlAttr(code)}" style="
        padding: 16px;
        overflow-x: auto;
        background: var(--bg-primary, #0f172a);
      "></div>
    </div>
  `;
}

/**
 * 构建工具栏 HTML
 */
export function buildMermaidToolbarHtml(options = {}) {
  const { diagramId } = options;

  return `
    <div class="mermaid-toolbar" style="display: flex; align-items: center; gap: 4px;">
      <button
        class="mermaid-toolbar-btn"
        onclick="window.mermaidUi.copyCode('${diagramId}')"
        title="复制代码"
        style="
          padding: 6px 10px;
          border: none;
          background: transparent;
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          border-radius: var(--radius-md, 0.5rem);
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          transition: all var(--transition-fast, 150ms ease);
        "
        onmouseover="this.style.background='var(--bg-secondary, #1e293b)'; this.style.color='var(--text-secondary, #e2e8f0)';"
        onmouseout="this.style.background='transparent'; this.style.color='var(--text-muted, #94a3b8)';"
      >
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
        复制
      </button>
      <button
        class="mermaid-toolbar-btn"
        onclick="window.mermaidUi.downloadSvg('${diagramId}')"
        title="下载 SVG"
        style="
          padding: 6px 10px;
          border: none;
          background: transparent;
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          border-radius: var(--radius-md, 0.5rem);
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          transition: all var(--transition-fast, 150ms ease);
        "
        onmouseover="this.style.background='var(--bg-secondary, #1e293b)'; this.style.color='var(--text-secondary, #e2e8f0)';"
        onmouseout="this.style.background='transparent'; this.style.color='var(--text-muted, #94a3b8)';"
      >
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
        SVG
      </button>
      <button
        class="mermaid-toolbar-btn"
        onclick="window.mermaidUi.downloadPng('${diagramId}')"
        title="下载 PNG"
        style="
          padding: 6px 10px;
          border: none;
          background: transparent;
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          border-radius: var(--radius-md, 0.5rem);
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          transition: all var(--transition-fast, 150ms ease);
        "
        onmouseover="this.style.background='var(--bg-secondary, #1e293b)'; this.style.color='var(--text-secondary, #e2e8f0)';"
        onmouseout="this.style.background='transparent'; this.style.color='var(--text-muted, #94a3b8)';"
      >
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        PNG
      </button>
      <button
        class="mermaid-toolbar-btn"
        onclick="window.mermaidUi.fullscreen('${diagramId}')"
        title="全屏查看"
        style="
          padding: 6px 10px;
          border: none;
          background: transparent;
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          border-radius: var(--radius-md, 0.5rem);
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          transition: all var(--transition-fast, 150ms ease);
        "
        onmouseover="this.style.background='var(--bg-secondary, #1e293b)'; this.style.color='var(--text-secondary, #e2e8f0)';"
        onmouseout="this.style.background='transparent'; this.style.color='var(--text-muted, #94a3b8)';"
      >
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
        </svg>
        全屏
      </button>
    </div>
  `;
}

/**
 * 构建加载状态 HTML
 */
export function buildMermaidLoadingHtml() {
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
      <span>正在渲染图表...</span>
    </div>
    <style>
      @keyframes mermaid-spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;
}

/**
 * 构建错误状态 HTML
 */
export function buildMermaidErrorHtml(data, helpers = {}) {
  const {
    errorMessage,
    code,
    retryCount = 0,
    maxRetries = 0,
    canRetry = false,
    diagramId = null,
    retryDiagramId = null,
    enableAIFix = false
  } = data;

  const {
    escapeHtml = defaultEscapeHtml,
    escapeJs = defaultEscapeJs
  } = helpers;

  const escapedError = escapeHtml(errorMessage);
  const escapedCode = escapeHtml(code);
  const retryId = retryDiagramId || diagramId;

  return `
    <div class="mermaid-error" style="
      background: var(--bg-secondary, #1e293b);
      border: 1px solid var(--border-error, rgba(239,68,68,0.3));
      border-radius: var(--radius-lg, 0.75rem);
      padding: 16px;
      color: var(--text-error, #ef4444);
    ">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <svg style="width: 20px; height: 20px; flex-shrink: 0;" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <strong>图表渲染失败</strong>
      </div>
      <p style="margin: 0 0 12px 0; font-size: 14px;">${escapedError}</p>
      <details style="margin-bottom: 8px;">
        <summary style="cursor: pointer; font-size: 13px;">查看错误详情</summary>
        <pre style="
          background: var(--bg-tertiary, #334155);
          padding: 12px;
          border-radius: var(--radius-md, 0.5rem);
          overflow-x: auto;
          font-size: 12px;
          margin-top: 8px;
          color: var(--text-secondary, #e2e8f0);
        ">${escapedError}</pre>
      </details>
      <details style="margin-bottom: 12px;">
        <summary style="cursor: pointer; font-size: 13px;">查看原始代码</summary>
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
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        ${canRetry && retryId ? `
          <button
            id="mermaid-retry-${retryId}"
            onclick="window.mermaidRenderer.retryRender('${escapeJs(retryId)}', '${escapeJs(code)}')"
            style="
              background: var(--primary, #667eea);
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: var(--radius-md, 0.5rem);
              cursor: pointer;
              font-size: 13px;
              display: flex;
              align-items: center;
              gap: 6px;
            "
          >
            <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            重试 (${retryCount + 1}/${maxRetries})
          </button>
        ` : ''}
        ${enableAIFix && retryId ? `
          <button
            id="mermaid-ai-fix-${retryId}"
            onclick="window.mermaidRenderer.handleAIFix && window.mermaidRenderer.handleAIFix('${escapeJs(retryId)}', '${escapeJs(code)}', '${escapeJs(errorMessage)}', 'mermaid-ai-fix-${escapeJs(retryId)}')"
            style="
              background: var(--accent, #06b6d4);
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: var(--radius-md, 0.5rem);
              cursor: pointer;
              font-size: 13px;
              display: flex;
              align-items: center;
              gap: 6px;
            "
          >
            <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
            AI 自动修复
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * 构建全屏查看器 HTML
 */
export function buildMermaidFullscreenHtml(svgContent, options = {}) {
  const { title = 'Mermaid 图表' } = options;

  return `
    <div class="mermaid-fullscreen-overlay" id="mermaid-fullscreen-overlay" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      z-index: var(--z-modal-top, 2147483649);
      display: flex;
      flex-direction: column;
      padding: 24px;
    ">
      <div class="mermaid-fullscreen-header" style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 24px;
        background: var(--bg-secondary, #1e293b);
        border-radius: var(--radius-lg, 0.75rem) var(--radius-lg, 0.75rem) 0 0;
      ">
        <h3 style="margin: 0; color: var(--text-primary, #f8fafc); font-size: 16px;">${title}</h3>
        <button
          onclick="window.mermaidUi.closeFullscreen()"
          style="
            background: transparent;
            border: none;
            color: var(--text-muted, #94a3b8);
            cursor: pointer;
            padding: 8px;
            border-radius: var(--radius-md, 0.5rem);
            display: flex;
            align-items: center;
            transition: all var(--transition-fast, 150ms ease);
          "
          onmouseover="this.style.background='var(--bg-tertiary, #334155)'; this.style.color='var(--text-secondary, #e2e8f0)';"
          onmouseout="this.style.background='transparent'; this.style.color='var(--text-muted, #94a3b8)';"
        >
          <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="mermaid-fullscreen-content" style="
        flex: 1;
        overflow: auto;
        background: var(--bg-primary, #0f172a);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      ">
        <div class="mermaid-fullscreen-svg" style="
          background: var(--bg-primary, #0f172a);
          padding: 24px;
          border-radius: var(--radius-lg, 0.75rem);
        ">
          ${svgContent}
        </div>
      </div>
    </div>
  `;
}

// 辅助函数
function defaultEscapeHtml(str) {
  if (typeof str !== 'string' && str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function defaultEscapeJs(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function escapeHtmlAttr(str) {
  return defaultEscapeHtml(str).replace(/"/g, '&quot;');
}

export default {
  buildMermaidDiagramContainerHtml,
  buildMermaidToolbarHtml,
  buildMermaidLoadingHtml,
  buildMermaidErrorHtml,
  buildMermaidFullscreenHtml
};
