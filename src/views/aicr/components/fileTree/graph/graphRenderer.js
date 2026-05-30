/**
 * 图谱 Canvas 渲染器 — 参考 Understand-Anything 设计系统
 *
 * 渲染管线：
 *   1. 背景点阵网格
 *   2. 项目群组背景区域
 *   3. 边（Bezier 曲线 + 多边分散 + 箭头）
 *   4. 节点卡片（左侧色条 + 类型标签 + 名称 + 统计徽章 + 副标题）
 *   5. 选中/悬停/搜索高亮效果
 *   6. 迷你地图
 */

import {
    ENTITY, ENTITY_COLORS, RENDER, TYPE_LABELS, RELATION_LABELS, EXT_COLORS
} from './constants.js';
import { getEdgePorts } from './dagreLayout.js';

const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
};

const highlightText = (text, query) => {
    if (!query || !text) return escapeHtml(text);
    const escapedQuery = escapeHtml(query);
    const escapedText = escapeHtml(text);
    const regex = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
};

// ── 边对分组（用于多边分散绘制） ──
function buildEdgeGroups(edges, nodeMap) {
    const edgePairMap = new Map();
    const visibleEdgeList = [];
    for (const e of edges) {
        if (e._visible === false) continue;
        const a = nodeMap.get(e.from), b = nodeMap.get(e.to);
        if (!a || !b) continue;
        const pairKey = a.key < b.key ? a.key + '||' + b.key : b.key + '||' + a.key;
        if (!edgePairMap.has(pairKey)) edgePairMap.set(pairKey, []);
        edgePairMap.get(pairKey).push(e);
        visibleEdgeList.push({ e, a, b, pairKey });
    }
    const edgeGroupIndex = new Map();
    for (const [, group] of edgePairMap) {
        group.forEach((e, i) => edgeGroupIndex.set(e, { index: i, total: group.length }));
    }
    return { visibleEdgeList, edgeGroupIndex };
}

/**
 * 主渲染函数
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w - 画布 CSS 宽
 * @param {number} h - 画布 CSS 高
 * @param {Object} state - 图谱状态 { nodes, edges, nodeMap, zoom, panX, panY, hoveredKey, selectedKey }
 */
export function renderGraph(ctx, w, h, state) {
    const { nodes, edges, nodeMap, zoom, panX, panY, hoveredKey, selectedKey } = state;
    const E = ENTITY;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(panX + w / 2, panY + h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-w / 2, -h / 2);

    // ── 背景点阵 ──
    drawBackgroundGrid(ctx, w, h, zoom, panX, panY);

    // ── 项目群组背景区域 ──
    drawProjectClusters(ctx, nodes, E);

    // ── 边渲染 ──
    const { visibleEdgeList, edgeGroupIndex } = buildEdgeGroups(edges, nodeMap);
    const selEdgeSet = buildSelectedEdgeSet(selectedKey, edges, nodeMap);
    drawEdges(ctx, visibleEdgeList, edgeGroupIndex, hoveredKey, selectedKey, selEdgeSet, nodeMap);

    // ── 节点渲染 ──
    const selNeighborKeys = buildNeighborKeys(selectedKey, edges, nodeMap);
    drawNodes(ctx, nodes, edges, nodeMap, hoveredKey, selectedKey, selNeighborKeys);

    ctx.restore();
}

// ── 背景点阵 ──
function drawBackgroundGrid(ctx, w, h, zoom, panX, panY) {
    const spacing = RENDER.BG_DOT_SPACING;
    const dotSize = 1.0;
    const viewLeft = w / 2 - (panX + w / 2) / zoom;
    const viewTop = h / 2 - (panY + h / 2) / zoom;
    const viewRight = viewLeft + w / zoom;
    const viewBottom = viewTop + h / zoom;
    const gsx = Math.floor(viewLeft / spacing) * spacing;
    const gsy = Math.floor(viewTop / spacing) * spacing;

    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let gx = gsx; gx <= viewRight; gx += spacing) {
        for (let gy = gsy; gy <= viewBottom; gy += spacing) {
            ctx.fillRect(gx - dotSize / 2, gy - dotSize / 2, dotSize, dotSize);
        }
    }
}

// ── 项目群组背景 ──
function drawProjectClusters(ctx, nodes, E) {
    const projectNodes = nodes.filter(n => n.entityType === E.PROJECT);
    if (projectNodes.length <= 1) return;

    const clusterColors = [
        'rgba(74,124,155,0.04)', 'rgba(90,158,111,0.04)',
        'rgba(139,111,176,0.04)', 'rgba(201,160,108,0.04)',
        'rgba(176,122,138,0.04)', 'rgba(94,234,212,0.04)'
    ];
    const clusterBorders = [
        'rgba(74,124,155,0.10)', 'rgba(90,158,111,0.10)',
        'rgba(139,111,176,0.10)', 'rgba(201,160,108,0.10)',
        'rgba(176,122,138,0.10)', 'rgba(94,234,212,0.10)'
    ];

    const projGroups = new Map();
    for (const pn of projectNodes) {
        projGroups.set(pn.name, { nodes: [pn], minX: pn.x, maxX: pn.x, minY: pn.y, maxY: pn.y });
    }
    for (const n of nodes) {
        if (n.entityType === E.PROJECT || n._visible === false) continue;
        const projName = n._projectName;
        if (projName && projGroups.has(projName)) {
            const g = projGroups.get(projName);
            g.nodes.push(n);
            g.minX = Math.min(g.minX, n.x - n.w / 2);
            g.maxX = Math.max(g.maxX, n.x + n.w / 2);
            g.minY = Math.min(g.minY, n.y - n.h / 2);
            g.maxY = Math.max(g.maxY, n.y + n.h / 2);
        }
    }

    let ci = 0;
    for (const [, g] of projGroups) {
        if (g.nodes.length <= 1) { ci++; continue; }
        const padX = 24, padY = 16;
        const rx = g.minX - padX, ry = g.minY - padY;
        const rw = g.maxX - g.minX + padX * 2;
        const rh = g.maxY - g.minY + padY * 2;
        const cr = 10;

        ctx.beginPath();
        ctx.moveTo(rx + cr, ry);
        ctx.lineTo(rx + rw - cr, ry);
        ctx.arcTo(rx + rw, ry, rx + rw, ry + cr, cr);
        ctx.lineTo(rx + rw, ry + rh - cr);
        ctx.arcTo(rx + rw, ry + rh, rx + rw - cr, ry + rh, cr);
        ctx.lineTo(rx + cr, ry + rh);
        ctx.arcTo(rx, ry + rh, rx, ry + rh - cr, cr);
        ctx.lineTo(rx, ry + cr);
        ctx.arcTo(rx, ry, rx + cr, ry, cr);
        ctx.closePath();

        ctx.fillStyle = clusterColors[ci % clusterColors.length];
        ctx.fill();
        ctx.strokeStyle = clusterBorders[ci % clusterBorders.length];
        ctx.lineWidth = 0.5;
        ctx.setLineDash([4, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
        ci++;
    }
}

// ── 边绘制 ──
function buildSelectedEdgeSet(selectedKey, edges, nodeMap) {
    const selSet = new Set();
    if (selectedKey && nodeMap.has(selectedKey)) {
        for (const e of edges) {
            if (e._visible === false) continue;
            if (e.from === selectedKey || e.to === selectedKey) selSet.add(e);
        }
    }
    return selSet;
}

function drawEdges(ctx, visibleEdgeList, edgeGroupIndex, hoveredKey, selectedKey, selEdgeSet, nodeMap) {
    const hasEdgeSelection = selectedKey != null && selEdgeSet.size > 0;

    for (const { e, a, b } of visibleEdgeList) {
        const isHovered = hoveredKey && (hoveredKey === a.key || hoveredKey === b.key);

        let strokeColor, lineWidth, dashPattern;
        switch (e.type) {
            case 'contains':
                strokeColor = isHovered ? '#60a5fa' : '#94a3b8';
                lineWidth = isHovered ? 2.0 : 1;
                dashPattern = [];
                break;
            case 'uses':
                strokeColor = isHovered ? '#a78bfa' : '#cbd5e1';
                lineWidth = isHovered ? 1.6 : 0.8;
                dashPattern = [6, 4];
                break;
            case 'implements':
                strokeColor = isHovered ? '#34d399' : '#e2e8f0';
                lineWidth = isHovered ? 1.4 : 0.6;
                dashPattern = [3, 5];
                break;
            case 'references':
                strokeColor = isHovered ? '#38bdf8' : '#e0f2fe';
                lineWidth = isHovered ? 1.5 : 0.7;
                dashPattern = [2, 6];
                break;
            default:
                strokeColor = '#d1d5db';
                lineWidth = 0.6;
                dashPattern = [];
        }

        ctx.beginPath();
        if (dashPattern.length > 0) ctx.setLineDash(dashPattern);

        // Dagre 风格层间路由：计算出入口
        const { ax, ay, bx, by, dist } = getEdgePorts(a, b);

        if (dist < 1) {
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
        } else {
            // Bezier 控制点
            const mx = (ax + bx) / 2, my = (ay + by) / 2;
            const perpX = -(by - ay), perpY = (bx - ax);
            const perpLen = Math.sqrt(perpX * perpX + perpY * perpY);
            const baseCurve = Math.min(dist * 0.16, 45);
            const gi = edgeGroupIndex.get(e) || { index: 0, total: 1 };
            const sign = gi.index % 2 === 0 ? 1 : -1;
            const mag = 1 + Math.floor(gi.index / 2) * 0.8;
            const curveOffset = baseCurve * sign * mag;
            const cx = mx + (perpX / perpLen) * curveOffset;
            const cy = my + (perpY / perpLen) * curveOffset;

            ctx.moveTo(ax, ay);
            ctx.quadraticCurveTo(cx, cy, bx, by);

            // 箭头
            if (isHovered) {
                const arrowSize = 5;
                const ux = bx - cx, uy = by - cy;
                const ul = Math.sqrt(ux * ux + uy * uy);
                if (ul > arrowSize * 2) {
                    const uxn = ux / ul, uyn = uy / ul;
                    const p1x = bx - uxn * arrowSize + uyn * arrowSize * 0.5;
                    const p1y = by - uyn * arrowSize - uxn * arrowSize * 0.5;
                    const p2x = bx - uxn * arrowSize - uyn * arrowSize * 0.5;
                    const p2y = by - uyn * arrowSize + uxn * arrowSize * 0.5;
                    ctx.moveTo(p1x, p1y);
                    ctx.lineTo(bx, by);
                    ctx.lineTo(p2x, p2y);
                }
            }
        }

        // Understand-Anything 风格透明度：默认极低，选中/悬停时高亮
        let edgeAlpha = 0.1;
        if (isHovered) edgeAlpha = 1;
        else if (hasEdgeSelection) edgeAlpha = selEdgeSet.has(e) ? 1 : 0.03;
        ctx.globalAlpha = edgeAlpha;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        ctx.setLineDash([]);

        // 边类型标签（悬停时）
        if (isHovered) {
            const lmx = (a.x + b.x) / 2, lmy = (a.y + b.y) / 2;
            const lPerpX = -(b.y - a.y), lPerpY = (b.x - a.x);
            const lPerpLen = Math.sqrt(lPerpX * lPerpX + lPerpY * lPerpY) || 1;
            const lgi = edgeGroupIndex.get(e) || { index: 0, total: 1 };
            const lsign = lgi.index % 2 === 0 ? 1 : -1;
            const lmag = 1 + Math.floor(lgi.index / 2) * 0.8;
            const lCurveOffset = Math.min(dist * 0.16, 45) * lsign * lmag;
            const lx = lmx + (lPerpX / lPerpLen) * lCurveOffset;
            const ly = lmy + (lPerpY / lPerpLen) * lCurveOffset;
            const label = RELATION_LABELS[e.type] || e.type;

            ctx.globalAlpha = 1;
            ctx.font = '9px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
            const lm = ctx.measureText(label);
            const lw = lm.width + 8, lh = 16;
            const lrx = lx - lw / 2, lry = ly - lh / 2;

            ctx.fillStyle = 'rgba(255,255,255,0.94)';
            ctx.beginPath();
            ctx.moveTo(lrx + 4, lry);
            ctx.lineTo(lrx + lw - 4, lry);
            ctx.arcTo(lrx + lw, lry, lrx + lw, lry + 4, 4);
            ctx.lineTo(lrx + lw, lry + lh - 4);
            ctx.arcTo(lrx + lw, lry + lh, lrx + lw - 4, lry + lh, 4);
            ctx.lineTo(lrx + 4, lry + lh);
            ctx.arcTo(lrx, lry + lh, lrx, lry + lh - 4, 4);
            ctx.lineTo(lrx, lry + 4);
            ctx.arcTo(lrx, lry, lrx + 4, lry, 4);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 0.5;
            ctx.stroke();

            ctx.fillStyle = '#374151';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, lx, ly);
            ctx.textAlign = 'start';
            ctx.textBaseline = 'alphabetic';
        }

        ctx.globalAlpha = 1;
    }
}

// ── 节点邻居集 ──
function buildNeighborKeys(selectedKey, edges, nodeMap) {
    const neighbors = new Set();
    if (selectedKey && nodeMap.has(selectedKey)) {
        for (const e of edges) {
            if (e._visible === false) continue;
            if (e.from === selectedKey || e.to === selectedKey) {
                neighbors.add(e.from === selectedKey ? e.to : e.from);
            }
        }
    }
    return neighbors;
}

// ── 单节点渲染 ──
function drawNodes(ctx, nodes, edges, nodeMap, hoveredKey, selectedKey, selNeighborKeys) {
    const hasSelection = selectedKey != null && selNeighborKeys.size > 0;

    for (const n of nodes) {
        if (n._visible === false) continue;
        const isHovered = hoveredKey === n.key;
        const isSelected = selectedKey === n.key;
        const isNeighbor = selNeighborKeys.has(n.key);
        const isSearchMatch = n._searchMatch === true;
        const isSelDimmed = hasSelection && !isSelected && !isNeighbor;
        const colors = ENTITY_COLORS[n.entityType] || ENTITY_COLORS.file;
        const rx = n.x - n.w / 2, ry = n.y - n.h / 2;
        const cr = RENDER.CORNER_RADIUS;

        // 全局透明度
        const nodeAlpha = isSelDimmed ? 0.18 : (hasSelection && isNeighbor ? 0.75 : 1);
        ctx.globalAlpha = nodeAlpha;

        // 阴影
        ctx.shadowColor = 'rgba(0,0,0,0.30)';
        ctx.shadowBlur = isHovered || isSelected ? 12 : 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = isHovered || isSelected ? 3 : 2;

        // 选中光环
        if (isSelected) {
            drawGlowRing(ctx, rx, ry, n.w, n.h, cr, colors.stroke, 3, 16, 2);
        }

        // 邻居光环
        if (isNeighbor && !isSelected) {
            drawGlowRing(ctx, rx, ry, n.w, n.h, cr, 'rgba(212,165,116,0.55)', 1, 8, 1.2);
        }

        // 搜索匹配光晕
        if (isSearchMatch) {
            drawGlowRing(ctx, rx, ry, n.w, n.h, cr, '#f59e0b', 2, 14, 2);
        }

        // ── 节点主体 ──
        drawRoundedRect(ctx, rx, ry, n.w, n.h, cr);
        const bgColor = isHovered || isSelected ? colors.accent : colors.fill;
        ctx.fillStyle = bgColor;
        ctx.fill();

        const borderColor = isSelected ? colors.stroke :
            isHovered ? colors.stroke : 'rgba(255,255,255,0.06)';
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = isSelected || isHovered ? 1.5 : 0.8;
        ctx.stroke();

        // ── 左侧色条 ──
        ctx.fillStyle = colors.badge;
        ctx.fillRect(rx + 1, ry + 6, RENDER.ACCENT_BAR_WIDTH, n.h - 12);

        // 清除阴影
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // ── 类型标签 ──
        const typeLabel = (TYPE_LABELS[n.entityType] || {}).en || n.entityType.toUpperCase();
        ctx.font = '600 9px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
        ctx.fillStyle = colors.badge;
        ctx.textBaseline = 'middle';
        ctx.fillText(typeLabel, rx + 10, ry + 14);

        // ── 统计徽章 ──
        drawBadge(ctx, n, rx, ry, colors);

        // ── 名称 ──
        const nameX = rx + 10;
        const nameY = n.h > 40 ? ry + 32 : ry + n.h / 2 + 1;
        ctx.fillStyle = colors.text;
        ctx.font = (n.entityType === ENTITY.PROJECT ? '600 12px' :
            n.entityType === ENTITY.STORY ? '600 11px' :
            n.entityType === ENTITY.FILE ? '500 10px' :
            '600 10.5px') +
            ' -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
        ctx.textBaseline = 'middle';
        const maxTW = n.w - 30;
        let dt = n.name || '';
        const tm = ctx.measureText(dt);
        if (tm.width > maxTW) {
            let cut = Math.floor(dt.length * maxTW / tm.width) - 1;
            if (cut < 3) cut = 3;
            dt = dt.substring(0, cut) + '…';
        }
        ctx.fillText(dt, nameX, nameY, maxTW);

        // ── 副标题 ──
        drawSubtitle(ctx, n, rx, ry, nameX, colors);

        ctx.globalAlpha = 1;
    }
}

function drawGlowRing(ctx, rx, ry, w, h, cr, strokeColor, pad, blur, lineWidth) {
    ctx.save();
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = blur;
    drawRoundedRect(ctx, rx - pad, ry - pad, w + pad * 2, h + pad * 2, cr);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.restore();
}

function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

function drawBadge(ctx, n, rx, ry, colors) {
    let badgeText = '';
    if (n.entityType === ENTITY.PROJECT && n.extra) {
        const total = (n.extra.storyCount || 0) + (n.extra.scenarioCount || 0) +
            (n.extra.skillCount || 0) + (n.extra.count || 0);
        if (total > 0) badgeText = total + '';
    } else if (n.entityType === ENTITY.STORY && n._childrenKeys) {
        badgeText = n._childrenKeys.length > 0 ? n._childrenKeys.length + '' : '';
    } else if (n.entityType === ENTITY.FILE && n.size) {
        badgeText = n.size > 1024 ? Math.round(n.size / 1024) + 'KB' : n.size + 'B';
    }
    if (!badgeText) return;

    ctx.font = '500 8px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    const bm = ctx.measureText(badgeText);
    const bw = bm.width + 10, bh = 15;
    const bbx = rx + n.w - bw - 4, bby = ry + 5;

    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.moveTo(bbx + 3, bby);
    ctx.lineTo(bbx + bw - 3, bby);
    ctx.arcTo(bbx + bw, bby, bbx + bw, bby + 3, 3);
    ctx.lineTo(bbx + bw, bby + bh - 3);
    ctx.arcTo(bbx + bw, bby + bh, bbx + bw - 3, bby + bh, 3);
    ctx.lineTo(bbx + 3, bby + bh);
    ctx.arcTo(bbx, bby + bh, bbx, bby + bh - 3, 3);
    ctx.lineTo(bbx, bby + 3);
    ctx.arcTo(bbx, bby, bbx + 3, bby, 3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colors.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, bbx + bw / 2, bby + bh / 2);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
}

function drawSubtitle(ctx, n, rx, ry, nameX, colors) {
    if (n.h <= 36) return;
    let subText = '';

    if (n.entityType === ENTITY.PROJECT && n.extra) {
        const parts = [];
        if (n.extra.storyCount) parts.push(n.extra.storyCount + ' stories');
        if (n.extra.scenarioCount) parts.push(n.extra.scenarioCount + ' scenarios');
        subText = parts.join(' · ') || (n.extra.count || 0) + ' files';
    } else if (n.entityType === ENTITY.STORY) {
        const proj = n.extra && n.extra.project;
        const childCount = (n._childrenKeys && n._childrenKeys.length) || 0;
        subText = proj || '';
        if (childCount > 0) subText += (subText ? ' · ' : '') + childCount + ' scenarios';
    } else if (n.entityType === ENTITY.SCENARIO && n.extra && n.extra.pageDescription) {
        subText = n.extra.pageDescription.length > 30
            ? n.extra.pageDescription.substring(0, 28) + '…'
            : n.extra.pageDescription;
    } else if ((n.entityType === ENTITY.SKILL || n.entityType === ENTITY.TEMPLATE ||
        n.entityType === ENTITY.RULE || n.entityType === ENTITY.AGENT) && n.extra && n.extra.project) {
        subText = n.extra.project;
    } else if (n.entityType === ENTITY.FILE && n.extension) {
        subText = '.' + n.extension;
    }

    if (subText) {
        const subY = ry + n.h - 10;
        ctx.font = '9px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
        const origAlpha = ctx.globalAlpha;
        ctx.globalAlpha = origAlpha * 0.55;
        ctx.fillStyle = colors.text;
        ctx.fillText(subText, nameX, subY, n.w - 25);
        ctx.globalAlpha = origAlpha;
    }
}

// ── 迷你地图渲染 ──
export function renderMiniMap(miniCanvas, state) {
    if (!miniCanvas) return;
    const mw = 160, mh = 120;
    miniCanvas.width = mw * 2;
    miniCanvas.height = mh * 2;
    miniCanvas.style.width = mw + 'px';
    miniCanvas.style.height = mh + 'px';
    const ctx = miniCanvas.getContext('2d');
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, mw, mh);

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(0, 0, mw, mh);

    const { nodes, edges, nodeMap, zoom, panX, panY } = state;
    if (!nodes || nodes.length === 0) return;

    // 计算世界范围
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
        minX = Math.min(minX, n.x - n.w);
        minY = Math.min(minY, n.y - n.h);
        maxX = Math.max(maxX, n.x + n.w);
        maxY = Math.max(maxY, n.y + n.h);
    }
    const worldW = maxX - minX || 1;
    const worldH = maxY - minY || 1;
    const pad = 8;
    const scaleX = (mw - pad * 2) / worldW;
    const scaleY = (mh - pad * 2) / worldH;
    const scale = Math.min(scaleX, scaleY);
    const ox = pad - minX * scale;
    const oy = pad - minY * scale;

    const tx = (x) => ox + x * scale;
    const ty = (y) => oy + y * scale;

    // 聚类区域
    const projectNodes = nodes.filter(n => n.entityType === ENTITY.PROJECT);
    if (projectNodes.length > 1) {
        for (const pn of projectNodes) {
            let maxR = 0;
            for (const n of nodes) {
                if (n.entityType === ENTITY.PROJECT || n.filterMatch === false) continue;
                const d = Math.sqrt((n.x - pn.x) ** 2 + (n.y - pn.y) ** 2);
                if (d > maxR && d < 300) maxR = d;
            }
            if (maxR > 0) {
                ctx.beginPath();
                ctx.arc(tx(pn.x), ty(pn.y), Math.max(maxR * scale, 6), 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(59,130,246,0.12)';
                ctx.fill();
            }
        }
    }

    // 边
    for (const e of edges) {
        const a = nodeMap.get(e.from), b = nodeMap.get(e.to);
        if (!a || !b) continue;
        ctx.beginPath();
        ctx.moveTo(tx(a.x), ty(a.y));
        ctx.lineTo(tx(b.x), ty(b.y));
        ctx.strokeStyle = 'rgba(209,213,219,0.4)';
        ctx.lineWidth = 0.3;
        ctx.stroke();
    }

    // 节点
    for (const n of nodes) {
        const sz = Math.max(1.5, Math.min(4, (n.w + n.h) / 2 * scale * 0.5));
        const colors = ENTITY_COLORS[n.entityType] || ENTITY_COLORS.file;
        ctx.fillStyle = n.filterMatch === false ? 'rgba(209,213,219,0.3)' : colors.stroke;
        ctx.fillRect(tx(n.x) - sz, ty(n.y) - sz, sz * 2, sz * 2);
    }

    // 视口框
    const W = state._graphW || 800, H = state._graphH || 600;
    const vx = (W / 2 - panX - W / (2 * zoom)) * scale / zoom + ox;
    const vy = (H / 2 - panY - H / (2 * zoom)) * scale / zoom + oy;
    const vw = W * scale / zoom;
    const vh = H * scale / zoom;
    ctx.strokeStyle = 'rgba(59,130,246,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(vx, vy, vw, vh);
}

// ── 命中检测 ──
export function findNodeAt(sx, sy, state, W, H) {
    const { nodes, zoom, panX, panY } = state;
    const gx = (sx - panX - W / 2) / zoom + W / 2;
    const gy = (sy - panY - H / 2) / zoom + H / 2;
    for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        if (n._visible === false) continue;
        if (gx >= n.x - n.w / 2 && gx <= n.x + n.w / 2 &&
            gy >= n.y - n.h / 2 && gy <= n.y + n.h / 2) return n;
    }
    return null;
}

// ── 工具函数导出 ──
export { escapeHtml, highlightText };
