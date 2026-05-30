/**
 * 图谱力模拟 — d3-force + 分层约束 + 自研碰撞检测
 *
 * 参考 Understand-Anything 项目，采用混合策略：
 *   1. d3-force 提供基础力场（link, charge, center, y/x anchoring）
 *   2. d3.forceCollide 提供首轮碰撞检测
 *   3. 自研 multiRoundCollision 每 tick 后进行补充碰撞检测
 *   4. 分层约束确保节点保持在分配的垂直带
 *   5. 项目群组约束确保同项目节点聚集
 */

import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY } from 'https://cdn.jsdelivr.net/npm/d3-force@3.0.0/+esm';
import { ENTITY, FORCE, EDGE_FORCE } from './constants.js';
import { intraBandCollision, multiRoundCollision } from './collisionDetection.js';

/**
 * 创建力模拟
 *
 * @param {Array} nodes - 图谱节点
 * @param {Array} edges - 图谱边
 * @param {Map} nodeMap - key→node 映射
 * @param {number} W - 画布宽度
 * @param {number} H - 画布高度
 * @param {Object} [dragging] - 当前拖拽的节点
 * @returns {{ sim: Object, simNodes: Array, simNodeMap: Map }}
 */
export function createSimulation(nodes, edges, nodeMap, W, H, dragging) {
    // 构建模拟节点
    const simNodes = nodes.map(n => ({
        id: n.key,
        x: n.x, y: n.y,
        vx: n.vx || 0, vy: n.vy || 0,
        _ref: n,
        _radius: Math.max(n.w, n.h) / 2 + 8,
        _anchorY: n._anchorY != null ? n._anchorY : (n._targetY || H / 2),
        _subRow: n._subRow,
        _projectName: n._projectName,
        _entityType: n.entityType
    }));

    const simNodeMap = new Map(simNodes.map(sn => [sn.id, sn]));

    // 构建链路（仅可见边）
    const simLinks = [];
    for (const e of edges) {
        if (e._visible === false) continue;
        if (simNodeMap.has(e.from) && simNodeMap.has(e.to)) {
            simLinks.push({ source: e.from, target: e.to, type: e.type });
        }
    }

    // 项目中心映射（X 锚定）
    const projCenterMap = new Map();
    for (const n of nodes) {
        if (n.entityType === ENTITY.PROJECT) projCenterMap.set(n.name, n.x);
    }

    const sim = forceSimulation(simNodes)
        .force('link', forceLink(simLinks)
            .id(d => d.id)
            .distance(d => (EDGE_FORCE[d.type] || EDGE_FORCE.contains).distance)
            .strength(d => (EDGE_FORCE[d.type] || EDGE_FORCE.contains).strength)
        )
        .force('charge', forceManyBody()
            .strength(FORCE.CHARGE_STRENGTH)
            .distanceMax(FORCE.CHARGE_MAX_DIST)
        )
        .force('center', forceCenter(W / 2, H / 2)
            .strength(FORCE.CENTER_STRENGTH)
        )
        .force('collide', forceCollide()
            .radius(d => d._radius)
            .strength(FORCE.COLLIDE_STRENGTH)
            .iterations(FORCE.COLLIDE_ITERATIONS)
        )
        // Y 层锚定
        .force('y', forceY(d => d._anchorY)
            .strength(d => d._subRow != null ? FORCE.Y_ANCHOR_SUBROW : FORCE.Y_ANCHOR_BASE)
        )
        // X 项目群组锚定
        .force('x', forceX(d => {
            if (!d._projectName) return d.x;
            const cx = projCenterMap.get(d._projectName);
            return cx != null ? cx : d.x;
        }).strength(FORCE.X_ANCHOR_STRENGTH))
        .stop();

    return { sim, simNodes, simNodeMap };
}

/**
 * 同步模拟节点位置回图谱节点
 *
 * @param {Array} simNodes
 * @param {Map} nodeMap
 * @param {Object|null} dragging
 */
export function syncPositions(simNodes, nodeMap, dragging) {
    for (const sn of simNodes) {
        const gn = nodeMap.get(sn.id);
        if (gn && dragging !== gn) {
            gn.x = sn.x;
            gn.y = sn.y;
        }
    }
}

/**
 * 渐进式运行力模拟
 *
 * @param {Object} sim - d3 力模拟实例
 * @param {Array} simNodes
 * @param {Map} nodeMap
 * @param {Array} allNodes - 所有图谱节点
 * @param {Function} renderFn - 渲染回调
 * @param {Object} stateRef - 运行时状态引用 { simRunning, simTimer, dragging }
 * @returns {Promise<void>} 模拟完成时 resolve
 */
export function runSimulation(sim, simNodes, nodeMap, allNodes, renderFn, stateRef) {
    return new Promise((resolve) => {
        const totalTicks = Math.min(FORCE.TOTAL_TICKS_MAX,
            Math.max(FORCE.TOTAL_TICKS_MIN, allNodes.length * 2));
        let tickCount = 0;

        const step = () => {
            if (!stateRef.simRunning) {
                resolve();
                return;
            }

            const batchSize = FORCE.TICKS_PER_FRAME;
            for (let i = 0; i < batchSize && tickCount < totalTicks; i++, tickCount++) {
                sim.tick();
            }

            syncPositions(simNodes, nodeMap, stateRef.dragging);

            // 每 20 tick 运行一次层内碰撞检测
            if (tickCount % 20 === 0) {
                intraBandCollision(allNodes, 0.4);
            }

            renderFn();

            if (tickCount < totalTicks && stateRef.simRunning) {
                stateRef.simTimer = requestAnimationFrame(step);
            } else {
                // 最终多轮碰撞检测（Understand-Anything 风格）
                syncPositions(simNodes, nodeMap, stateRef.dragging);
                multiRoundCollision(allNodes);
                renderFn();
                stateRef.simRunning = false;
                stateRef.simTimer = null;
                resolve();
            }
        };

        stateRef.simTimer = requestAnimationFrame(step);
    });
}

/**
 * 停止力模拟
 *
 * @param {Object} stateRef
 */
export function stopSimulation(stateRef) {
    if (stateRef.simTimer) {
        cancelAnimationFrame(stateRef.simTimer);
        stateRef.simTimer = null;
    }
    if (stateRef.simulation) {
        stateRef.simulation.stop();
        stateRef.simulation = null;
    }
    stateRef.simNodes = null;
    stateRef.simRunning = false;
}
