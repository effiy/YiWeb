/**
 * 图谱引擎 — 主入口
 *
 * 参考 Understand-Anything 架构，协调以下模块：
 *   - dagreLayout.js      分层布局算法（Dagre 风格）
 *   - forceLayout.js      d3-force 力模拟 + 分层约束
 *   - collisionDetection.js 自研多轮碰撞检测
 *   - graphDataBuilder.js  节点/边数据构建
 *   - graphRenderer.js     Canvas 渲染 + 迷你地图
 *
 * 架构特点：
 *   1. Dagre 分层算法 → 初始布局（垂直分层 + Barycenter 排序）
 *   2. d3-force → 力导向微调（link + charge + center + collide + Y/X anchor）
 *   3. 自研多轮碰撞检测 → 最终去重叠（4 轮递减力度）
 *   4. Canvas 2D → 高性能渲染（Understand-Anything CustomNode 设计语言）
 *
 * 图层导航（点击驱动）：
 *   L1 (默认) → 项目 + 故事  |  点击故事 → L2 故事 + 场景
 *   L2 → 故事 + 场景          |  点击场景 → L3 场景 + 文件
 *   双击空白 → 回到 L1
 */

import { ENTITY, ENTITY_SIZES, LAYER_TYPES, LAYER_LABELS, LAYER_HINTS, RENDER, FORCE, TYPE_LABELS, RELATION_LABELS } from './constants.js';
import { applyLayout } from './dagreLayout.js';
import { createSimulation, syncPositions, runSimulation, stopSimulation } from './forceLayout.js';
import { multiRoundCollision, intraBandCollision } from './collisionDetection.js';
import { buildGraphData, recomputeFilterHighlight, clearScenarioCache, getScenarioCache } from './graphDataBuilder.js';
import { renderGraph, renderMiniMap, findNodeAt } from './graphRenderer.js';

// ── 模块级运行时状态 ──
let _state = {
    nodes: [],
    edges: [],
    nodeMap: null,
    hoveredKey: null,
    selectedKey: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    dragging: null,
    dragStartX: 0,
    dragStartY: 0,
    simRunning: false,
    simTimer: null,
    _simulation: null,
    _simNodes: null,
    _currentLayer: 1,
    _drillKey: null,
    _hasFittedOnce: false,
    _hasActiveFilter: false,
    _graphW: 0,
    _graphH: 0
};

let _graphCtx = null;

/**
 * 获取当前运行时状态引用（供外部方法读取）
 */
export function getState() {
    return _state;
}

export function getGraphCtx() {
    return _graphCtx;
}

export function getGraphDimensions() {
    return { W: _state._graphW, H: _state._graphH };
}

export function getCurrentLayer() {
    return _state._currentLayer;
}

// ── 初始化 ──

export function initGraph(canvas, container) {
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    _graphCtx = ctx;
    _state._graphW = rect.width;
    _state._graphH = rect.height;
    _state._currentLayer = 1;
    _state._drillKey = null;
    _state._hasFittedOnce = false;
    _state._hasActiveFilter = false;
    _state.nodes = [];
    _state.edges = [];
    _state.nodeMap = null;
}

/**
 * 构建图谱数据 + 布局 + 力模拟
 */
export function buildAndLayout(ctx, rebuild = false) {
    const W = _state._graphW;
    const H = _state._graphH;

    let oldPositions = null;
    if (rebuild && _state.nodes.length > 0) {
        oldPositions = new Map();
        for (const n of _state.nodes) {
            oldPositions.set(n.key, { x: n.x, y: n.y, vx: n.vx, vy: n.vy });
        }
    }

    const dataCtx = {
        sessions: ctx.sessions,
        tree: ctx.tree,
        sortedTree: ctx.sortedTree,
        selectedTags: ctx.selectedTags,
        selectedSkillTags: ctx.selectedSkillTags,
        selectedTemplateTags: ctx.selectedTemplateTags,
        selectedRuleTags: ctx.selectedRuleTags,
        selectedAgentTags: ctx.selectedAgentTags,
        W, H
    };

    const { nodes, edges, nodeMap } = buildGraphData(dataCtx, oldPositions);
    _state.nodes = nodes;
    _state.edges = edges;
    _state.nodeMap = nodeMap;

    // 默认 L1: 项目 + 故事
    _state._hasActiveFilter = false;
    _applyVisibility();

    applyLayout(_state.nodes, _state.edges, _state.nodeMap, W, H);
}

/**
 * 启动力模拟（异步渐进式渲染）
 */
export async function startForceSimulation(onRender) {
    stopSimulation(_state);

    const { nodes, edges, nodeMap } = _state;
    const W = _state._graphW;
    const H = _state._graphH;

    if (!nodes || nodes.length === 0) return;

    const { sim, simNodes, simNodeMap } = createSimulation(
        nodes, edges, nodeMap, W, H, _state.dragging
    );

    _state._simulation = sim;
    _state._simNodes = simNodes;
    _state.simRunning = true;

    const renderFn = onRender || (() => renderGraph(_graphCtx, W, H, _state));

    await runSimulation(sim, simNodes, nodeMap, nodes, renderFn, _state);

    syncPositions(simNodes, nodeMap, _state.dragging);
    multiRoundCollision(nodes);
    renderFn();

    // 默认适配窗口
    if (!_state._hasFittedOnce) {
        _state._hasFittedOnce = true;
        fitToWindow();
    }
}

// ── 渲染 ──

export function renderCurrentGraph() {
    if (!_graphCtx) return;
    renderGraph(_graphCtx, _state._graphW, _state._graphH, _state);
}

export function renderCurrentMiniMap(miniCanvas) {
    _state._renderMiniMapCanvas = miniCanvas;
    if (!miniCanvas) return;
    renderMiniMap(miniCanvas, _state);
}

// ── 图层导航（点击驱动） ──

/**
 * 统一可见性计算入口 — 所有路径都经由此函数决定节点/边是否可见
 *
 * 优先级：layer 类型 > filterMatch > drill 聚焦
 */
function _applyVisibility() {
    const { nodes, edges, nodeMap } = _state;
    if (!nodes || nodes.length === 0) return;

    const allowedTypes = LAYER_TYPES[_state._currentLayer] || LAYER_TYPES[1];

    // 1. 图层约束 + 筛选约束
    for (const n of nodes) {
        if (!allowedTypes.has(n.entityType)) {
            n._visible = false;
        } else if (_state._hasActiveFilter && n.filterMatch === false) {
            n._visible = false;
        } else {
            n._visible = true;
        }
    }

    // 2. 钻取聚焦：进一步收窄
    if (_state._drillKey && _state._currentLayer !== 1) {
        const focusNode = nodeMap.get(_state._drillKey);
        if (focusNode) {
            const relatedKeys = new Set();
            relatedKeys.add(focusNode.key);

            for (const e of edges) {
                if (e.from === focusNode.key && (e.type === 'contains' || e.type === 'references')) {
                    const toNode = nodeMap.get(e.to);
                    if (toNode && allowedTypes.has(toNode.entityType)) relatedKeys.add(e.to);
                }
            }

            const focusProject = focusNode._projectName || (focusNode.extra && focusNode.extra.project);
            for (const n of nodes) {
                if (!n._visible) continue;
                if (relatedKeys.has(n.key)) continue;
                // 钻取时保留：L2 中同项目的 story + 聚焦节点的直连子节点
                if (_state._currentLayer === 2 && n.entityType === ENTITY.STORY && n._projectName === focusProject) {
                    continue;
                }
                if (focusProject && n._projectName === focusProject && n.key !== focusNode.key) {
                    continue;
                }
                n._visible = false;
            }
        }
    }

    // 3. 边可见性：两端点均可见
    for (const e of edges) {
        const a = nodeMap.get(e.from);
        const b = nodeMap.get(e.to);
        e._visible = a && a._visible && b && b._visible;
    }
}

/**
 * 导航到指定图层并聚焦节点
 */
export function navigateToLayer(level, focusNode) {
    _state._currentLayer = Math.max(1, Math.min(3, level));
    _state._drillKey = focusNode ? focusNode.key : null;
    _state.selectedKey = focusNode ? focusNode.key : _state.selectedKey;
    _applyVisibility();
    fitToWindow();
}

/**
 * 重置到 L1 默认视图
 */
export function resetToL1() {
    _state._currentLayer = 1;
    _state._drillKey = null;
    _state.selectedKey = null;
    _applyVisibility();
    fitToWindow();
}

// ── 筛选高亮 ──

export function applyFilterHighlight(ctx) {
    if (!_state.nodes || _state.nodes.length === 0) return;

    recomputeFilterHighlight(_state.nodes, _state.edges, _state.nodeMap, ctx);

    const hasAnyFilter = (ctx.selectedTags && ctx.selectedTags.length > 0) ||
        (ctx.selectedSkillTags && ctx.selectedSkillTags.length > 0) ||
        (ctx.selectedTemplateTags && ctx.selectedTemplateTags.length > 0) ||
        (ctx.selectedRuleTags && ctx.selectedRuleTags.length > 0) ||
        (ctx.selectedAgentTags && ctx.selectedAgentTags.length > 0);

    _state._hasActiveFilter = hasAnyFilter;
    _applyVisibility();

    renderCurrentGraph();
    if (_state._renderMiniMapCanvas) renderCurrentMiniMap(_state._renderMiniMapCanvas);
}

// ── 交互 — 鼠标事件 ──

export function handleWheel(deltaY) {
    const delta = deltaY > 0 ? 0.88 : 1.12;
    _state.zoom = Math.max(RENDER.ZOOM_MIN, Math.min(RENDER.ZOOM_MAX, _state.zoom * delta));
    renderCurrentGraph();
    if (_state._renderMiniMapCanvas) renderCurrentMiniMap(_state._renderMiniMapCanvas);
}

export function handleMouseMove(e, canvas, tooltipCallback) {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const W = _state._graphW, H = _state._graphH;

    if (_state.dragging && _state.dragging.__pan) {
        const dx = e.clientX - _state.dragStartX;
        const dy = e.clientY - _state.dragStartY;
        _state.panX += dx;
        _state.panY += dy;
        _state.dragStartX = e.clientX;
        _state.dragStartY = e.clientY;
        renderCurrentGraph();
        if (_state._renderMiniMapCanvas) renderCurrentMiniMap(_state._renderMiniMapCanvas);
        return null;
    }

    if (_state.dragging && !_state.dragging.__pan) {
        const dn = _state.dragging;
        const gx = (x - _state.panX - W / 2) / _state.zoom + W / 2;
        const gy = (y - _state.panY - H / 2) / _state.zoom + H / 2;
        dn.x = gx;
        dn.y = gy;
        const simNode = _state._simNodes && _state._simNodes.find(sn => sn.id === dn.key);
        if (simNode) { simNode.fx = gx; simNode.fy = gy; }
        renderCurrentGraph();
        if (_state._renderMiniMapCanvas) renderCurrentMiniMap(_state._renderMiniMapCanvas);
        return null;
    }

    const node = findNodeAt(x, y, _state, W, H);
    if (node) {
        _state.hoveredKey = node.key;
        canvas.style.cursor = 'pointer';
        if (tooltipCallback) tooltipCallback(node, x, y);
    } else {
        _state.hoveredKey = null;
        canvas.style.cursor = 'grab';
        if (tooltipCallback) tooltipCallback(null, x, y);
    }
    renderCurrentGraph();
    if (_state._renderMiniMapCanvas) renderCurrentMiniMap(_state._renderMiniMapCanvas);
    return node;
}

export function handleMouseDown(e, canvas) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const node = findNodeAt(x, y, _state, _state._graphW, _state._graphH);

    if (node) {
        _state.dragging = node;
        _state.dragStartX = e.clientX;
        _state.dragStartY = e.clientY;
        const simNode = _state._simNodes && _state._simNodes.find(sn => sn.id === node.key);
        if (simNode) { simNode.fx = node.x; simNode.fy = node.y; }
    } else {
        _state.dragging = { __pan: true };
        _state.dragStartX = e.clientX;
        _state.dragStartY = e.clientY;
        canvas.style.cursor = 'grabbing';
    }
}

export function handleMouseUp(canvas) {
    if (canvas) canvas.style.cursor = _state.hoveredKey ? 'pointer' : 'grab';
    if (_state.dragging && !_state.dragging.__pan) {
        const simNode = _state._simNodes && _state._simNodes.find(sn => sn.id === _state.dragging.key);
        if (simNode) { simNode.fx = null; simNode.fy = null; }
    }
    _state.dragging = null;
}

export function handleClick(e, canvas, clickCallback) {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const node = findNodeAt(x, y, _state, _state._graphW, _state._graphH);

    if (!node) {
        // 点击空白 → 回到 L1（如有钻取）
        if (_state._drillKey) {
            resetToL1();
        } else if (_state.selectedKey) {
            _state.selectedKey = null;
            renderCurrentGraph();
            if (_state._renderMiniMapCanvas) renderCurrentMiniMap(_state._renderMiniMapCanvas);
        }
        return null;
    }

    if (_state.selectedKey !== node.key) {
        _state.selectedKey = node.key;
        renderCurrentGraph();
        if (_state._renderMiniMapCanvas) renderCurrentMiniMap(_state._renderMiniMapCanvas);
    }

    if (clickCallback) clickCallback(node);
    return node;
}

export function handleMouseLeave() {
    _state.hoveredKey = null;
    if (!_state.dragging) {
        renderCurrentGraph();
        if (_state._renderMiniMapCanvas) renderCurrentMiniMap(_state._renderMiniMapCanvas);
    }
}

export function handleDblClick(ctx) {
    clearScenarioCache();
    _state._currentLayer = 1;
    _state._drillKey = null;
    _state.selectedKey = null;
    _state._hasFittedOnce = false;
    buildAndLayout(ctx);
    startForceSimulation(() => {
        renderCurrentGraph();
        if (_state._renderMiniMapCanvas) renderCurrentMiniMap(_state._renderMiniMapCanvas);
    });
}

// ── 缩放控件 ──

export function getZoomPercent() {
    return Math.round(_state.zoom * 100);
}

export function zoomIn() {
    _state.zoom = Math.min(RENDER.ZOOM_MAX, _state.zoom * RENDER.ZOOM_STEP);
    renderCurrentGraph();
    if (_state._renderMiniMapCanvas) renderCurrentMiniMap(_state._renderMiniMapCanvas);
}

export function zoomOut() {
    _state.zoom = Math.max(RENDER.ZOOM_MIN, _state.zoom * RENDER.ZOOM_OUT_STEP);
    renderCurrentGraph();
    if (_state._renderMiniMapCanvas) renderCurrentMiniMap(_state._renderMiniMapCanvas);
}

/**
 * 适配窗口 — 计算所有可见节点包围盒，自动缩放+平移使内容完整显示
 */
export function fitToWindow() {
    const visibleNodes = _state.nodes.filter(n => n._visible !== false);
    if (visibleNodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of visibleNodes) {
        minX = Math.min(minX, n.x - n.w / 2);
        minY = Math.min(minY, n.y - n.h / 2);
        maxX = Math.max(maxX, n.x + n.w / 2);
        maxY = Math.max(maxY, n.y + n.h / 2);
    }

    const W = _state._graphW, H = _state._graphH;
    const pad = 60;
    const contentW = maxX - minX + pad * 2;
    const contentH = maxY - minY + pad * 2;
    const newZoom = Math.min(RENDER.ZOOM_MAX, Math.max(RENDER.ZOOM_MIN,
        Math.min(W / contentW, H / contentH) * 1.0));

    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;

    _state.zoom = newZoom;
    _state.panX = (W / 2 - cx) * newZoom;
    _state.panY = (H / 2 - cy) * newZoom;

    renderCurrentGraph();
    if (_state._renderMiniMapCanvas) renderCurrentMiniMap(_state._renderMiniMapCanvas);
}

/**
 * 重置视图 — 适配窗口并回到 L1
 */
export function zoomReset() {
    if (_state._drillKey || _state._currentLayer !== 1) {
        _state._currentLayer = 1;
        _state._drillKey = null;
        _state.selectedKey = null;
        _applyVisibility();
    }
    fitToWindow();
}

/**
 * 聚焦匹配节点 — 适配窗口到筛选高亮节点
 */
export function focusFiltered() {
    const matchingNodes = _state.nodes.filter(n => n._visible !== false);
    if (matchingNodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of matchingNodes) {
        minX = Math.min(minX, n.x - n.w / 2);
        minY = Math.min(minY, n.y - n.h / 2);
        maxX = Math.max(maxX, n.x + n.w / 2);
        maxY = Math.max(maxY, n.y + n.h / 2);
    }
    const pad = 60;
    const gw = maxX - minX + pad * 2, gh = maxY - minY + pad * 2;
    const W = _state._graphW, H = _state._graphH;
    const newZoom = Math.min(RENDER.ZOOM_MAX, Math.max(RENDER.ZOOM_MIN,
        Math.min(W / gw, H / gh) * 0.92));
    const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;

    _state.zoom = newZoom;
    _state.panX = (W / 2 - centerX) * newZoom;
    _state.panY = (H / 2 - centerY) * newZoom;
    renderCurrentGraph();
    if (_state._renderMiniMapCanvas) renderCurrentMiniMap(_state._renderMiniMapCanvas);
}

// ── 搜索 ──

export function searchNodes(query) {
    if (!_state.nodes || _state.nodes.length === 0) return [];
    if (!query) {
        for (const n of _state.nodes) n._searchMatch = false;
        return [];
    }
    const q = query.toLowerCase();
    const matches = _state.nodes.filter(n => (n.name || '').toLowerCase().includes(q));
    for (const n of _state.nodes) n._searchMatch = false;
    for (const m of matches) m._searchMatch = true;
    return matches;
}

export function focusNode(node) {
    const W = _state._graphW, H = _state._graphH;
    _state.panX = (W / 2 - node.x) * _state.zoom;
    _state.panY = (H / 2 - node.y) * _state.zoom;
    renderCurrentGraph();
    if (_state._renderMiniMapCanvas) renderCurrentMiniMap(_state._renderMiniMapCanvas);
}

// ── 迷你地图点击 ──

export function handleMiniMapClick(e, miniCanvas) {
    if (!miniCanvas || !_state.nodes || _state.nodes.length === 0) return;
    const mw = 160, mh = 120;
    const rect = miniCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of _state.nodes) {
        minX = Math.min(minX, n.x - n.w);
        minY = Math.min(minY, n.y - n.h);
        maxX = Math.max(maxX, n.x + n.w);
        maxY = Math.max(maxY, n.y + n.h);
    }
    const worldW = maxX - minX || 1;
    const worldH = maxY - minY || 1;
    const pad = 8;
    const scale = Math.min((mw - pad * 2) / worldW, (mh - pad * 2) / worldH);
    const worldX = (mx - pad) / scale + minX;
    const worldY = (my - pad) / scale + minY;

    _state.panX = (_state._graphW / 2 - worldX) * _state.zoom;
    _state.panY = (_state._graphH / 2 - worldY) * _state.zoom;
    renderCurrentGraph();
    if (_state._renderMiniMapCanvas) renderCurrentMiniMap(_state._renderMiniMapCanvas);
}

// ── 缩放调整 ──

export function handleResize(canvas, container, ctx) {
    if (!canvas || !container) return false;
    const rect = container.getBoundingClientRect();
    if (Math.abs(rect.width - _state._graphW) > 2 || Math.abs(rect.height - _state._graphH) > 2) {
        _state._graphW = rect.width;
        _state._graphH = rect.height;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        const newCtx = canvas.getContext('2d');
        newCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        _graphCtx = newCtx;
        _state._hasFittedOnce = false;
        buildAndLayout(ctx);
        startForceSimulation(() => {
            renderCurrentGraph();
            if (_state._renderMiniMapCanvas) renderCurrentMiniMap(_state._renderMiniMapCanvas);
        });
        return true;
    }
    return false;
}

// ── 脱离 — 清理 ──

export function destroy() {
    stopSimulation(_state);
    _state.nodes = [];
    _state.edges = [];
    _state.nodeMap = null;
    _state.hoveredKey = null;
    _state.selectedKey = null;
    _state.dragging = null;
    _graphCtx = null;
    clearScenarioCache();
}

// ── 常量导出 ──
export {
    ENTITY, ENTITY_SIZES, LAYER_TYPES, LAYER_LABELS, LAYER_HINTS,
    TYPE_LABELS, RELATION_LABELS, RENDER
};
export { getScenarioCache };
