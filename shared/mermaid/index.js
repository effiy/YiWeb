/**
 * 统一 Mermaid 组件库入口
 * author: liangliang
 * 说明：整合所有 Mermaid 相关功能，提供统一的 API
 */

// 导出配置
export {
  MERMAID_CONFIG,
  MERMAID_THEME,
  MERMAID_FONT,
  MERMAID_FLOWCHART,
  MERMAID_SEQUENCE,
  MERMAID_GANTT,
  MERMAID_GITGRAPH,
  MERMAID_C4C,
  MERMAID_PIE,
  MERMAID_STATE,
  MERMAID_CLASS,
  MERMAID_JOURNEY,
  VALID_DIAGRAM_TYPES,
  getMermaidConfig,
  getColorFromCSS,
  updateThemeFromCSS
} from './config.js';

// 导出渲染器
export {
  MermaidRenderer,
  createMermaidRenderer
} from './renderer.js';

// 导出模板
export {
  buildMermaidDiagramContainerHtml,
  buildMermaidToolbarHtml,
  buildMermaidLoadingHtml,
  buildMermaidErrorHtml,
  buildMermaidFullscreenHtml
} from './templates.js';

// 导出 UI
export {
  MermaidUi,
  createMermaidUi
} from './ui.js';

// 导出默认整合
import { getMermaidConfig } from './config.js';
import { MermaidRenderer, createMermaidRenderer } from './renderer.js';
import { MermaidUi, createMermaidUi } from './ui.js';

/**
 * 初始化统一 Mermaid 系统
 * @param {Object} options - 配置选项
 * @param {Object} options.config - Mermaid 配置
 * @param {boolean} options.debug - 调试模式
 * @param {Object} options.rendererOptions - 渲染器选项
 * @param {Object} options.uiOptions - UI 选项
 * @returns {Object} 包含 renderer 和 ui 的实例
 */
export function initUnifiedMermaid(options = {}) {
  const {
    config = {},
    debug = false,
    rendererOptions = {},
    uiOptions = {}
  } = options;

  // 创建渲染器实例
  const renderer = createMermaidRenderer({
    debugMode: debug,
    config: getMermaidConfig(config),
    ...rendererOptions
  });

  // 创建 UI 实例
  const ui = createMermaidUi(uiOptions);

  // 挂载到全局
  if (typeof window !== 'undefined') {
    window.mermaidRenderer = renderer;
    window.mermaidUi = ui;
  }

  // 初始化
  renderer.initialize();

  return { renderer, ui };
}

/**
 * 在 Markdown 渲染器中使用的 Mermaid 代码块处理器
 * @param {string} code - Mermaid 代码
 * @param {string} lang - 语言
 * @param {Object} options - 选项
 * @returns {string} HTML
 */
export function renderMermaidCodeBlock(code, lang, options = {}) {
  if (lang !== 'mermaid' && lang !== 'mmd') {
    return null;
  }

  const {
    showHeader = true,
    showActions = true,
    headerLabel = 'MERMAID 图表'
  } = options;

  const diagramId = `md-mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  // 延迟渲染
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      if (window.mermaidRenderer) {
        window.mermaidRenderer.renderDiagram(diagramId, code);
      }
    }, 0);
  }

  // 导入模板函数（动态导入以避免循环依赖）
  let containerHtml = '';
  try {
    const { buildMermaidDiagramContainerHtml } = require('./templates.js');
    containerHtml = buildMermaidDiagramContainerHtml({
      diagramId,
      code,
      showHeader,
      showActions,
      headerLabel
    });
  } catch (e) {
    // 降级方案
    containerHtml = `
      <div class="mermaid-diagram-container" id="${diagramId}" data-mermaid-code="${escapeHtmlAttr(code)}" style="padding: 16px;"></div>
    `;
  }

  return containerHtml;
}

/**
 * 简单的 HTML 属性转义
 */
function escapeHtmlAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 默认导出
export default {
  initUnifiedMermaid,
  renderMermaidCodeBlock
};
