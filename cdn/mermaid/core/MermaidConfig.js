/**
 * Mermaid Configuration
 */

export const VALID_DIAGRAM_TYPES = [
  'graph', 'flowchart', 'sequenceDiagram', 'classDiagram',
  'stateDiagram', 'stateDiagram-v2', 'gantt', 'pie',
  'gitgraph', 'erDiagram', 'journey', 'requirementDiagram',
  'c4Context', 'c4Container', 'c4Component', 'mindmap',
  'timeline', 'sankey', 'xychart'
];

export const DEFAULT_CONFIG = {
  startOnLoad: false,
  securityLevel: 'loose', // 确保安全级别允许 HTML 标签
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
    tertiaryBkg: '#475569'
  },
  fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif',
  fontSize: 14,
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true, // 显式启用 HTML 标签支持
    curve: 'basis',
    wrap: true // 启用自动换行
  },
  sequence: {
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
    wrap: true // 时序图也启用自动换行
  },
  gantt: {
    titleTopMargin: 25,
    barHeight: 20,
    fontSize: 11,
    fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
    sectionFontSize: 11,
    numberSectionStyles: 4,
    useMaxWidth: false
  },
  gitgraph: {
    mainBranchName: 'main',
    showCommitLabel: true,
    showBranches: true,
    rotateCommitLabel: false
  }
};

export function getMermaidConfig(overrides = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    themeVariables: {
      ...DEFAULT_CONFIG.themeVariables,
      ...overrides.themeVariables
    }
  };
}
