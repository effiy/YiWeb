/**
 * 统一 Mermaid 配置系统
 * author: liangliang
 * 说明：提供统一的 Mermaid 主题和配置，适用于所有项目
 */

// 量子美学主题配置
export const MERMAID_THEME = {
  theme: 'dark',
  themeVariables: {
    primaryTextColor: '#ffffff',
    primaryColor: '#4f46e5',
    primaryBorderColor: '#6366f1',
    lineColor: '#e5e7eb',
    sectionBkgColor: '#1e293b',
    altSectionBkgColor: '#334155',
    gridColor: '#374151',
    secondaryColor: '#7c3aed',
    tertiaryColor: '#a855f7',
    background: '#0f172a',
    mainBkg: '#1e293b',
    secondBkg: '#334155',
    tertiaryBkg: '#475569',
    noteBkgColor: '#f59e0b',
    noteTextColor: '#0f172a',
    noteBorderColor: '#d97706',
    actorBorder: '#6366f1',
    actorBkg: '#4f46e5',
    actorTextColor: '#ffffff',
    actorLineColor: '#e5e7eb',
    signalColor: '#e5e7eb',
    signalTextColor: '#e2e8f0',
    labelBoxBkgColor: '#1e293b',
    labelBoxBorderColor: '#6366f1',
    labelTextColor: '#ffffff',
    loopTextColor: '#ffffff',
    activationBorderColor: '#6366f1',
    activationBkgColor: '#4f46e5',
    sequenceNumberColor: '#ffffff'
  }
};

// 统一字体配置
export const MERMAID_FONT = {
  fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif',
  fontSize: 14
};

// 流程图配置
export const MERMAID_FLOWCHART = {
  useMaxWidth: false,
  htmlLabels: true,
  curve: 'basis',
  wrap: false,
  padding: 15,
  diagramPadding: 8
};

// 时序图配置
export const MERMAID_SEQUENCE = {
  diagramMarginX: 50,
  diagramMarginY: 10,
  actorMargin: 50,
  width: 150,
  height: 65,
  boxMargin: 10,
  boxTextMargin: 5,
  noteMargin: 10,
  messageMargin: 35,
  mirrorActors: true,
  bottomMarginAdj: 1,
  useMaxWidth: false,
  rightAngles: false,
  showSequenceNumbers: false,
  wrap: false,
  actorFontSize: 14,
  actorFontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif',
  noteFontSize: 14,
  noteFontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif',
  messageFontSize: 14,
  messageFontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif'
};

// 甘特图配置
export const MERMAID_GANTT = {
  titleTopMargin: 25,
  barHeight: 20,
  barGap: 4,
  topPadding: 50,
  leftPadding: 75,
  gridLineStartPadding: 35,
  fontSize: 11,
  fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif',
  sectionFontSize: 11,
  numberSectionStyles: 4,
  useMaxWidth: false
};

// Git 图配置
export const MERMAID_GITGRAPH = {
  mainBranchName: 'main',
  showCommitLabel: true,
  showBranches: true,
  rotateCommitLabel: false
};

// C4 模型配置
export const MERMAID_C4C = {
  diagramMarginX: 50,
  diagramMarginY: 10,
  c4ShapeMargin: 50,
  c4ShapeInRow: 4,
  width: 216,
  height: 60,
  boxMargin: 10,
  c4ShapeTextMargin: 5,
  c4BoundaryInRow: 2,
  personFontSize: 14,
  personFontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif',
  personFontWeight: 'normal',
  external_personFontSize: 14,
  external_personFontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif',
  external_personFontWeight: 'normal'
};

// 饼图配置
export const MERMAID_PIE = {
  useMaxWidth: false,
  textPosition: 0.75
};

// 状态图配置
export const MERMAID_STATE = {
  useMaxWidth: false
};

// 类图配置
export const MERMAID_CLASS = {
  useMaxWidth: false
};

// 旅程图配置
export const MERMAID_JOURNEY = {
  useMaxWidth: false
};

// 完整配置对象
export const MERMAID_CONFIG = {
  startOnLoad: false,
  securityLevel: 'loose',
  suppressErrorRendering: false,
  ...MERMAID_THEME,
  ...MERMAID_FONT,
  flowchart: MERMAID_FLOWCHART,
  sequence: MERMAID_SEQUENCE,
  gantt: MERMAID_GANTT,
  gitgraph: MERMAID_GITGRAPH,
  c4c: MERMAID_C4C,
  pie: MERMAID_PIE,
  state: MERMAID_STATE,
  class: MERMAID_CLASS,
  journey: MERMAID_JOURNEY
};

// 有效图表类型列表
export const VALID_DIAGRAM_TYPES = [
  'graph', 'flowchart', 'sequenceDiagram', 'classDiagram',
  'stateDiagram', 'stateDiagram-v2', 'gantt', 'pie',
  'gitgraph', 'erDiagram', 'journey', 'requirementDiagram',
  'c4Context', 'mindmap', 'timeline', 'sankey', 'xychart'
];

// 获取配置（支持自定义覆盖）
export function getMermaidConfig(customConfig = {}) {
  return {
    ...MERMAID_CONFIG,
    ...customConfig,
    themeVariables: {
      ...MERMAID_CONFIG.themeVariables,
      ...(customConfig.themeVariables || {})
    },
    flowchart: {
      ...MERMAID_CONFIG.flowchart,
      ...(customConfig.flowchart || {})
    },
    sequence: {
      ...MERMAID_CONFIG.sequence,
      ...(customConfig.sequence || {})
    },
    gantt: {
      ...MERMAID_CONFIG.gantt,
      ...(customConfig.gantt || {})
    },
    gitgraph: {
      ...MERMAID_CONFIG.gitgraph,
      ...(customConfig.gitgraph || {})
    },
    c4c: {
      ...MERMAID_CONFIG.c4c,
      ...(customConfig.c4c || {})
    }
  };
}

// 获取 CSS 变量中的颜色值
export function getColorFromCSS(varName) {
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return null;
  }
  const style = getComputedStyle(document.documentElement);
  return style.getPropertyValue(varName).trim();
}

// 从 CSS 变量更新主题
export function updateThemeFromCSS() {
  const primary = getColorFromCSS('--primary-dark');
  const primaryLight = getColorFromCSS('--primary');
  const accent = getColorFromCSS('--accent');
  const bgPrimary = getColorFromCSS('--bg-primary');
  const bgSecondary = getColorFromCSS('--bg-secondary');
  const bgTertiary = getColorFromCSS('--bg-tertiary');
  const textPrimary = getColorFromCSS('--text-primary');
  const textSecondary = getColorFromCSS('--text-secondary');

  return {
    themeVariables: {
      ...(primary ? { primaryColor: primary } : {}),
      ...(primaryLight ? { primaryBorderColor: primaryLight } : {}),
      ...(accent ? { secondaryColor: accent } : {}),
      ...(bgPrimary ? { background: bgPrimary } : {}),
      ...(bgSecondary ? { mainBkg: bgSecondary, sectionBkgColor: bgSecondary } : {}),
      ...(bgTertiary ? { secondBkg: bgTertiary, altSectionBkgColor: bgTertiary } : {}),
      ...(textPrimary ? { primaryTextColor: textPrimary } : {}),
      ...(textSecondary ? { lineColor: textSecondary } : {})
    }
  };
}

// 导出默认配置
export default MERMAID_CONFIG;
