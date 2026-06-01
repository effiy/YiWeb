// ── 图谱实体常量 ──
export const ENTITY = {
    PROJECT:  'project',
    STORY:    'story',
    SCENARIO: 'scenario',
    SKILL:    'skill',
    TEMPLATE: 'template',
    RULE:     'rule',
    AGENT:    'agent',
    FILE:     'file'
};

export const ENTITY_COLORS = {
    project:  { fill: '#1e293b', stroke: '#4a7c9b', text: '#e2e8f0', badge: '#4a7c9b', accent: '#334155' },
    story:    { fill: '#1a2e1f', stroke: '#5a9e6f', text: '#e2e8f0', badge: '#5a9e6f', accent: '#1e3a24' },
    scenario: { fill: '#172033', stroke: '#7dd3fc', text: '#e2e8f0', badge: '#7dd3fc', accent: '#1e3040' },
    skill:    { fill: '#1f1a2e', stroke: '#a78bfa', text: '#e2e8f0', badge: '#a78bfa', accent: '#282040' },
    template: { fill: '#2a2018', stroke: '#c9a06c', text: '#e2e8f0', badge: '#c9a06c', accent: '#332818' },
    rule:     { fill: '#2a1a1f', stroke: '#b07a8a', text: '#e2e8f0', badge: '#b07a8a', accent: '#331f24' },
    agent:    { fill: '#162b2a', stroke: '#5eead4', text: '#e2e8f0', badge: '#5eead4', accent: '#1a3332' },
    file:     { fill: '#1a1a1a', stroke: '#6b7280', text: '#d1d5db', badge: '#6b7280', accent: '#262626' }
};

export const ENTITY_ICONS = {
    project: '\u{1F4E6}', story: '\u{1F4CB}', scenario: '\u{1F3AC}',
    skill: '\u{26A1}', template: '\u{1F4C4}', rule: '\u{1F4CF}',
    agent: '\u{1F916}', file: '\u{1F4C4}'
};

export const ENTITY_SIZES = {
    project:  { w: 230, h: 62 },
    story:    { w: 195, h: 52 },
    scenario: { w: 185, h: 46 },
    skill:    { w: 170, h: 46 },
    template: { w: 170, h: 46 },
    rule:     { w: 170, h: 46 },
    agent:    { w: 170, h: 46 },
    file:     { w: 170, h: 38 }
};

export const EXT_COLORS = {
    md: '#3b82f6', js: '#f59e0b', ts: '#2563eb', vue: '#10b981',
    css: '#ec4899', html: '#f97316', json: '#6366f1', yml: '#84cc16',
    py: '#8b5cf6', svg: '#ef4444', png: '#14b8a6', default: '#6b7280'
};

// ── 图层配置 ──
export const LAYER_TYPES = {
    1: new Set(['project', 'story']),
    2: new Set(['story', 'scenario']),
    3: new Set(['scenario', 'file'])
};
export const LAYER_LABELS = { 1: 'L1 概览', 2: 'L2 详情', 3: 'L3 深入' };
export const LAYER_HINTS = { 1: '项目 + 故事', 2: '故事 + 场景', 3: '场景 + 文件' };

// ── 边关系类型 ──
export const EDGE_TYPE = {
    CONTAINS:    'contains',
    USES:        'uses',
    IMPLEMENTS:  'implements',
    REFERENCES:  'references'
};

// ── 布局常量 ──
// 垂直层带定义（参考 Dagre/ELK 分层算法）
export const BAND_DEFS = [
    { types: new Set([ENTITY.PROJECT]), label: 'project', yFrac: 0.07 },
    { types: new Set([ENTITY.STORY]),   label: 'story',    yFrac: 0.24 },
    { types: new Set([ENTITY.SCENARIO]),label: 'scenario',  yFrac: 0.40 },
    { types: new Set([ENTITY.SKILL, ENTITY.TEMPLATE, ENTITY.RULE, ENTITY.AGENT]), label: 'capability', yFrac: 0.57 },
    { types: new Set([ENTITY.FILE]),    label: 'file',      yFrac: 0.78 }
];

// 力模拟常量
export const FORCE = {
    // 基础值 — 会按节点数量动态缩放（参考 Understand-Anything 策略）
    CHARGE_STRENGTH_SMALL: -350,
    CHARGE_STRENGTH_LARGE: -600,
    CHARGE_MAX_DIST: 1500,
    CENTER_STRENGTH: 0.03,
    Y_ANCHOR_BASE: 0.1,
    Y_ANCHOR_SUBROW: 0.2,
    X_ANCHOR_STRENGTH: 0.04,
    COLLIDE_STRENGTH: 0.85,
    COLLIDE_ITERATIONS: 4,
    TOTAL_TICKS_MIN: 150,
    TOTAL_TICKS_MAX: 350,
    TICKS_PER_FRAME: 4,
    // 大图阈值
    LARGE_GRAPH_THRESHOLD: 100
};

// 边距离和强度
export const EDGE_FORCE = {
    contains:   { distance: 130, strength: 0.25 },
    uses:       { distance: 180, strength: 0.08 },
    implements: { distance: 110, strength: 0.06 },
    references: { distance: 110, strength: 0.12 }
};

// 碰撞检测常量
export const COLLISION = {
    ROUNDS: 4,
    INITIAL_FORCE: 1.2,
    FORCE_DECAY: 0.4,
    MIN_MOVEMENT: 0.5,
    PADDING: 10,
    // 默认多轮碰撞间距（px），逐轮收紧
    DEFAULT_PADDINGS: [16, 10, 8, 6]
};

// 渲染常量
export const RENDER = {
    CORNER_RADIUS: 6,
    ACCENT_BAR_WIDTH: 3,
    ACCENT_BAR_OFFSET: 6,
    ZOOM_MIN: 0.2,
    ZOOM_MAX: 3.5,
    ZOOM_STEP: 1.25,
    ZOOM_OUT_STEP: 0.8,
    BG_DOT_SPACING: 32,
    MAX_FILE_NODES: 300
};

// 类型显示标签
export const TYPE_LABELS = {
    project:  { zh: '项目',    en: 'PROJECT' },
    story:    { zh: '故事',    en: 'STORY' },
    scenario: { zh: '场景',    en: 'SCENARIO' },
    skill:    { zh: '技能',    en: 'SKILL' },
    template: { zh: '模板',    en: 'TEMPLATE' },
    rule:     { zh: '规则',    en: 'RULE' },
    agent:    { zh: '智能体',  en: 'AGENT' },
    file:     { zh: '文件',    en: 'FILE' }
};

export const RELATION_LABELS = {
    contains: '包含', uses: '使用', implements: '实现', references: '引用'
};
