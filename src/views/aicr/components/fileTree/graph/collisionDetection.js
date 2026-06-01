/**
 * 图谱碰撞检测 — 自研多轮碰撞检测算法
 *
 * 参考 Understand-Anything 项目，实现多轮迭代碰撞检测：
 *   - Round 1: 大力度推开严重重叠
 *   - Round 2-3: 中等力度精细调整
 *   - Round 4: 小力度微调，确保最小间距
 *
 * 相比 d3.forceCollide 的优势：
 *   1. 多轮递减力度，避免抖动和过度回弹
 *   2. 每轮可设置不同 padding，逐轮收紧
 *   3. 支持节点级自定义碰撞半径
 *   4. 支持仅水平/仅垂直碰撞模式（层内优化）
 */

import { COLLISION } from './constants.js';

/**
 * 计算两矩形节点之间的重叠量
 *
 * @param {Object} a - 节点 a { x, y, w, h }
 * @param {Object} b - 节点 b { x, y, w, h }
 * @param {number} padding - 最小间距
 * @returns {{ overlapX: number, overlapY: number } | null}
 */
function computeOverlap(a, b, padding) {
    const ahw = a.w / 2 + padding;
    const ahh = a.h / 2 + padding;
    const bhw = b.w / 2 + padding;
    const bhh = b.h / 2 + padding;

    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);

    const overlapX = ahw + bhw - dx;
    const overlapY = ahh + bhh - dy;

    if (overlapX <= 0 || overlapY <= 0) return null;

    return { overlapX, overlapY };
}

/**
 * 单轮碰撞检测 — 对重叠节点对施加分离力
 *
 * @param {Array} nodes - 节点数组（会被原地修改 x, y）
 * @param {number} force - 分离力强度 (0-1)
 * @param {number} padding - 最小间距
 * @param {boolean} horizontalOnly - 仅水平方向分离（用于同层节点）
 * @returns {number} 本轮产生的移动总量
 */
function collisionRound(nodes, force, padding, horizontalOnly) {
    let totalMovement = 0;

    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];

            // 跳过不可见节点
            if (a._visible === false || b._visible === false) continue;

            const overlap = computeOverlap(a, b, padding);
            if (!overlap) continue;

            const { overlapX, overlapY } = overlap;

            // 选择分离方向：沿最小重叠轴
            let sepX, sepY;

            if (horizontalOnly) {
                sepX = overlapX * force;
                sepY = 0;
            } else if (overlapX < overlapY) {
                // 水平重叠更小 → 水平推开
                sepX = overlapX * force;
                sepY = overlapY * force * 0.2;
            } else {
                // 垂直重叠更小 → 垂直推开
                sepX = overlapX * force * 0.2;
                sepY = overlapY * force;
            }

            // 方向：从 a 指向 b
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const sx = dx >= 0 ? 1 : -1;
            const sy = dy >= 0 ? 1 : -1;

            // 分布移动（较轻的节点移动更多）
            const aWeight = 0.5, bWeight = 0.5;

            a.x -= sepX * sx * aWeight;
            a.y -= sepY * sy * aWeight;
            b.x += sepX * sx * bWeight;
            b.y += sepY * sy * bWeight;

            totalMovement += Math.abs(sepX) + Math.abs(sepY);
        }
    }

    return totalMovement;
}

/**
 * 多轮碰撞检测 — 主入口
 *
 * 执行 4 轮迭代碰撞检测，力度逐轮递减：
 *   Round 1: force = 1.2, padding = 12  — 推开严重重叠
 *   Round 2: force = 0.8, padding = 8   — 中等调整
 *   Round 3: force = 0.4, padding = 6   — 精细调整
 *   Round 4: force = 0.2, padding = 4   — 微调
 *
 * @param {Array} nodes - 节点数组（会被原地修改）
 * @param {Object} [options]
 * @param {number} [options.rounds=4] - 碰撞检测轮数
 * @param {number} [options.initialForce=1.2] - 初始力度
 * @param {number} [options.forceDecay=0.4] - 力度衰减系数
 * @param {number[]} [options.paddings] - 每轮 padding（长度需等于 rounds）
 * @param {boolean} [options.horizontalOnly=false] - 仅水平分离
 */
export function multiRoundCollision(nodes, options = {}) {
    const {
        rounds = COLLISION.ROUNDS,
        initialForce = COLLISION.INITIAL_FORCE,
        forceDecay = COLLISION.FORCE_DECAY,
        paddings = null,
        horizontalOnly = false
    } = options;

    const padArray = paddings || COLLISION.DEFAULT_PADDINGS;

    let totalMoved = 0;

    for (let r = 0; r < rounds; r++) {
        const force = initialForce - r * forceDecay;
        const padding = padArray[Math.min(r, padArray.length - 1)];

        const moved = collisionRound(nodes, Math.max(0.1, force), padding, horizontalOnly);
        totalMoved += moved;

        // 几乎无移动 → 提前退出
        if (moved < COLLISION.MIN_MOVEMENT * nodes.length) break;
    }

    return totalMoved;
}

/**
 * 层内碰撞检测 — 仅处理同 band 节点之间的碰撞
 *
 * 在力模拟每 tick 后调用，防止同层节点重叠
 *
 * @param {Array} nodes
 * @param {number} force
 */
export function intraBandCollision(nodes, force = 0.6) {
    const bands = new Map();
    for (const n of nodes) {
        if (n._visible === false) continue;
        const b = n._band ?? 99;
        if (!bands.has(b)) bands.set(b, []);
        bands.get(b).push(n);
    }

    let totalMoved = 0;
    for (const [, bandNodes] of bands) {
        if (bandNodes.length <= 1) continue;
        // 水平碰撞使用稍大间距以适应不同节点宽度
        totalMoved += collisionRound(bandNodes, force, 8, true);
    }
    return totalMoved;
}

/**
 * 项目群组垂直碰撞 — 确保不同项目群组在垂直方向不重叠
 *
 * @param {Array} nodes
 * @param {number} force
 */
export function interProjectCollision(nodes, force = 0.4) {
    const groups = new Map();
    for (const n of nodes) {
        if (n._visible === false) continue;
        const key = n._projectName || '__orphan__';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(n);
    }

    const groupBounds = [];
    for (const [, gnodes] of groups) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of gnodes) {
            minX = Math.min(minX, n.x - n.w / 2);
            minY = Math.min(minY, n.y - n.h / 2);
            maxX = Math.max(maxX, n.x + n.w / 2);
            maxY = Math.max(maxY, n.y + n.h / 2);
        }
        groupBounds.push({
            x: (minX + maxX) / 2,
            y: (minY + maxY) / 2,
            w: maxX - minX,
            h: maxY - minY,
            nodes: gnodes
        });
    }

    let totalMoved = 0;
    for (let i = 0; i < groupBounds.length; i++) {
        for (let j = i + 1; j < groupBounds.length; j++) {
            const a = groupBounds[i];
            const b = groupBounds[j];
            const overlap = computeOverlap(a, b, 20);
            if (!overlap) continue;

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const sx = dx >= 0 ? 1 : -1;
            const sy = dy >= 0 ? 1 : -1;

            const shiftX = overlap.overlapX * force * 0.5;
            const shiftY = overlap.overlapY * force * 0.5;

            for (const n of a.nodes) {
                n.x -= shiftX * sx;
                n.y -= shiftY * sy;
            }
            for (const n of b.nodes) {
                n.x += shiftX * sx;
                n.y += shiftY * sy;
            }
            totalMoved += Math.abs(shiftX) + Math.abs(shiftY);
        }
    }
    return totalMoved;
}
