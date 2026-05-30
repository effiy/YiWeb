/**
 * 图谱布局引擎 — Dagre 风格分层约束布局
 *
 * 参考 Understand-Anything 项目，结合 Dagre 分层算法思想与自研力导向：
 *   1. Rank assignment    — 按实体类型分配垂直层（BAND_DEFS）
 *   2. Ordering            — Barycenter 启发式最小化跨层边交叉
 *   3. Position assignment — 水平间距均匀排列 + 项目群组约束
 *   4. 边路由              — 层间 Bezier 曲线 + 出入口计算
 *
 * 不依赖 @dagrejs/dagre 库（避免 ESM CDN 兼容问题），
 * 自研实现同等级的分层布局能力。
 */

import { ENTITY, ENTITY_SIZES, BAND_DEFS } from './constants.js';

// ── 单节点布局（轻量，仅水平重排） ──
export function layoutNodesInBands(nodes, W, H) {
    const projectNodes = nodes.filter(n => n.entityType === ENTITY.PROJECT);
    const otherNodes = nodes.filter(n => n.entityType !== ENTITY.PROJECT);

    // Step 1: 分配 band 和 targetY
    for (const n of nodes) {
        let assigned = false;
        for (let bi = 0; bi < BAND_DEFS.length; bi++) {
            if (BAND_DEFS[bi].types.has(n.entityType)) {
                n._band = bi;
                n._targetY = H * BAND_DEFS[bi].yFrac;
                assigned = true;
                break;
            }
        }
        if (!assigned) { n._band = 4; n._targetY = H * 0.85; }
    }

    // Step 2: 建立项目→节点关联
    const projectChildren = new Map();
    for (const pn of projectNodes) projectChildren.set(pn.name, []);
    const orphanNodes = [];

    for (const n of otherNodes) {
        let projName = n.extra && n.extra.project;
        if (!projName && n._projectName) projName = n._projectName;
        if (projName && projectChildren.has(projName)) {
            projectChildren.get(projName).push(n);
            n._projectName = projName;
        } else {
            orphanNodes.push(n);
        }
    }

    // Step 3: 水平布局项目节点（多行换行）
    if (projectNodes.length > 0) {
        const pad = 100;
        const availW = W - pad * 2;
        const projNodeW = ENTITY_SIZES.project.w;
        const minProjGap = 20;

        const singleRowW = projectNodes.length * projNodeW + (projectNodes.length - 1) * minProjGap;
        const rowsNeeded = singleRowW > availW ? Math.ceil(singleRowW / availW) : 1;
        const perRow = Math.ceil(projectNodes.length / rowsNeeded);
        const rowH = 64;

        for (let ri = 0; ri < rowsNeeded; ri++) {
            const rowNodes = projectNodes.slice(ri * perRow, Math.min((ri + 1) * perRow, projectNodes.length));
            const totalW = rowNodes.length * projNodeW + (rowNodes.length - 1) * minProjGap;
            const startX = W / 2 - totalW / 2;
            const rowOffY = rowsNeeded > 1 ? -(rowsNeeded - 1) * rowH / 2 + ri * rowH : 0;

            rowNodes.forEach((n, ni) => {
                n.x = startX + ni * (projNodeW + minProjGap) + projNodeW / 2;
                n.y = n._targetY + rowOffY;
                n._projCenterX = n.x;
                n._subRow = ri;
            });
        }

        // Step 4: Dagre 风格项目区域划分
        const sortedProj = [...projectNodes].sort((a, b) => a.x - b.x);
        const projRegions = new Map();
        sortedProj.forEach((pn, i) => {
            const prevX = i > 0 ? (sortedProj[i - 1].x + pn.x) / 2 : 60;
            const nextX = i < sortedProj.length - 1 ? (pn.x + sortedProj[i + 1].x) / 2 : W - 60;
            projRegions.set(pn.name, {
                centerX: pn.x,
                leftX: prevX + 30,
                rightX: nextX - 30
            });
        });

        // Step 5: 各层内 Dagre 风格排列（Barycenter 排序 + 贪心分行）
        for (let bi = 1; bi < BAND_DEFS.length; bi++) {
            const bandNodes = nodes.filter(n => n._band === bi);
            if (bandNodes.length === 0) continue;

            // 按项目分组
            const byProject = new Map();
            for (const n of bandNodes) {
                const key = n._projectName || '__orphan__';
                if (!byProject.has(key)) byProject.set(key, []);
                byProject.get(key).push(n);
            }

            for (const [projName, groupNodes] of byProject) {
                const region = projRegions.get(projName);
                let groupCenterX, groupWidth;
                if (region) {
                    groupCenterX = region.centerX;
                    groupWidth = region.rightX - region.leftX;
                } else {
                    groupCenterX = W / 2;
                    groupWidth = W - 120;
                }

                const minNodeGap = 16;
                const rowHeight = 52;
                const rows = [];
                let currentRow = [];
                let currentRowW = 0;

                for (const n of groupNodes) {
                    const nodeW = n.w + minNodeGap;
                    if (currentRow.length > 0 && currentRowW + nodeW > groupWidth) {
                        rows.push(currentRow);
                        currentRow = [n];
                        currentRowW = nodeW;
                    } else {
                        currentRow.push(n);
                        currentRowW += nodeW;
                    }
                }
                if (currentRow.length > 0) rows.push(currentRow);

                const totalRows = rows.length;
                const rowOffsetY = totalRows > 1 ? -(totalRows - 1) * rowHeight / 2 : 0;

                rows.forEach((rowNodes, ri) => {
                    const rowTotalW = rowNodes.reduce((sum, n) => sum + n.w, 0)
                        + minNodeGap * (rowNodes.length - 1);
                    const startX = groupCenterX - rowTotalW / 2;
                    const rowY = rowNodes[0]._targetY + rowOffsetY + ri * rowHeight;

                    let cursorX = startX;
                    rowNodes.forEach((n) => {
                        n.x = cursorX + n.w / 2 + (Math.random() - 0.5) * 4;
                        n.y = rowY + (Math.random() - 0.5) * 6;
                        n._groupKey = projName;
                        n._subRow = ri;
                        cursorX += n.w + minNodeGap;
                    });
                });
            }
        }
    } else {
        // 无项目节点时的回退布局
        for (let bi = 0; bi < BAND_DEFS.length; bi++) {
            const bandNodes = nodes.filter(n => n._band === bi);
            if (bandNodes.length === 0) continue;
            const minGap = 16;
            const rowH = 52;
            const availW = W - 120;
            const rows = [];
            let curRow = [], curW = 0;
            for (const n of bandNodes) {
                const nw = n.w + minGap;
                if (curRow.length > 0 && curW + nw > availW) {
                    rows.push(curRow);
                    curRow = [n];
                    curW = nw;
                } else {
                    curRow.push(n);
                    curW += nw;
                }
            }
            if (curRow.length > 0) rows.push(curRow);
            const rowOffY = rows.length > 1 ? -(rows.length - 1) * rowH / 2 : 0;
            rows.forEach((rn, ri) => {
                const totalW = rn.reduce((s, n) => s + n.w, 0) + minGap * (rn.length - 1);
                const sx = W / 2 - totalW / 2;
                let cx = sx;
                rn.forEach((n) => {
                    n.x = cx + n.w / 2;
                    n.y = n._targetY + rowOffY + ri * rowH;
                    n._subRow = ri;
                    cx += n.w + minGap;
                });
            });
        }
    }

    // Step 6: 记录 Y 锚点供力模拟使用
    for (const n of nodes) {
        n._anchorY = n.y;
    }
}

/**
 * Barycenter 排序 — Dagre 风格最小化边交叉
 *
 * 对同层同项目组内的节点，根据其相邻层连接节点的水平位置均值
 * （barycenter）重新排序，减少跨层边的交叉。
 */
export function barycenterOrdering(nodes, edges, nodeMap) {
    // 按 (band, project) 分组
    const groups = new Map();
    for (const n of nodes) {
        if (n._band == null) continue;
        const gkey = n._band + '::' + (n._projectName || '__orphan__');
        if (!groups.has(gkey)) groups.set(gkey, []);
        groups.get(gkey).push(n);
    }

    for (const [, group] of groups) {
        if (group.length <= 1) continue;

        // 为每个节点计算 barycenter
        const barycenters = new Map();
        for (const n of group) {
            let sumX = 0, count = 0;
            for (const e of edges) {
                let otherKey = null;
                if (e.from === n.key) otherKey = e.to;
                else if (e.to === n.key) otherKey = e.from;
                if (!otherKey) continue;
                const other = nodeMap.get(otherKey);
                if (other && other._band !== n._band) {
                    sumX += other.x;
                    count++;
                }
            }
            barycenters.set(n.key, count > 0 ? sumX / count : n.x);
        }

        // 按 barycenter 排序（Dagre 核心算法）
        group.sort((a, b) => {
            const ba = barycenters.get(a.key) ?? a.x;
            const bb = barycenters.get(b.key) ?? b.x;
            return ba - bb;
        });
    }
}

/**
 * 计算边出入口坐标（Dagre 风格层间路由）
 *
 * @param {Object} a - 源节点
 * @param {Object} b - 目标节点
 * @returns {{ ax: number, ay: number, bx: number, by: number }}
 */
export function getEdgePorts(a, b) {
    const aBand = a._band ?? 99;
    const bBand = b._band ?? 99;
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    let ax, ay, bx, by;

    if (aBand < bBand) {
        // 源在上 → 从底部出；目标在下 → 从顶部入
        ax = a.x;
        ay = a.y + a.h / 2 + 2;
        bx = b.x;
        by = b.y - b.h / 2 - 2;
    } else if (aBand > bBand) {
        // 源在下 → 从顶部出；目标在上 → 从底部入
        ax = a.x;
        ay = a.y - a.h / 2 - 2;
        bx = b.x;
        by = b.y + b.h / 2 + 2;
    } else {
        // 同层 → 水平出入口
        const sx = Math.sign(dx) || 1;
        ax = a.x + sx * (a.w / 2 + 2);
        ay = a.y;
        bx = b.x - sx * (b.w / 2 + 2);
        by = b.y;
    }

    return { ax, ay, bx, by, dist: Math.sqrt(dx * dx + dy * dy) };
}

/**
 * 主布局入口 — 组合分层布局
 *
 * @param {Array} nodes - 图谱节点
 * @param {Array} edges - 图谱边
 * @param {Map} nodeMap - key→node 映射
 * @param {number} W - 画布宽度
 * @param {number} H - 画布高度
 */
export function applyLayout(nodes, edges, nodeMap, W, H) {
    layoutNodesInBands(nodes, W, H);
    barycenterOrdering(nodes, edges, nodeMap);
    // 重新应用位置（barycenter 改变了组内顺序，需要重新布局水平位置）
    layoutNodesInBands(nodes, W, H);
}
