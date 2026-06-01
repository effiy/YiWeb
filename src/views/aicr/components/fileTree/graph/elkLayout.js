/**
 * ELK.js 布局适配器 — Understand-Anything 同款布局引擎
 *
 * ELK (Eclipse Layout Kernel) 是专业的图布局算法库，其 layered 算法
 * 基于 Sugiyama 框架，能保证节点不重叠并提供最优的边交叉最小化。
 *
 * 架构角色：
 *   1. 替代 dagreLayout.js 作为主布局引擎
 *   2. ELK 保证节点间距（nodeNode ≥ 50px），从根本上防止重叠
 *   3. dagreLayout 保留作为 ELK 不可用时的回退方案
 *
 * 使用方式：
 *   await applyElkLayout(nodes, edges, nodeMap, W, H);
 *   // 节点 x,y 已被 ELK 更新，后续可选运行力模拟微调
 */

import { ENTITY_SIZES, BAND_DEFS, ENTITY } from './constants.js';

// ELK 布局选项（参考 Understand-Anything / ELK 官方推荐配置）
const ELK_OPTIONS = {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    // 同层节点最小间距 — 这是防止重叠的关键参数
    'elk.spacing.nodeNode': '50',
    // 层间最小间距
    'elk.layered.spacing.nodeNodeBetweenLayers': '70',
    // 边路由：ORTHOGONAL 直角走线，避免边穿过节点
    'elk.edgeRouting': 'ORTHOGONAL',
    // 交叉最小化策略
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    // 整体内边距
    'elk.padding': '[top=40,left=30,bottom=40,right=30]'
};

/**
 * 检查 ELK.js 是否可用
 * @returns {boolean}
 */
export function isElkAvailable() {
    return typeof ELK !== 'undefined';
}

/**
 * 将 YiWeb 图谱数据转换为 ELK 输入格式
 *
 * @param {Array} nodes - YiWeb 节点数组
 * @param {Array} edges - YiWeb 边数组
 * @param {Map} nodeMap - key → node 映射
 * @param {Object} [options] - 可选覆盖
 * @returns {{ children: Array, edges: Array, idMap: Map }}
 */
function toElkGraph(nodes, edges, nodeMap, options = {}) {
    // 只转换可见节点
    const visibleNodes = nodes.filter(n => n._visible !== false);
    const visibleIds = new Set(visibleNodes.map(n => n.key));

    // 节点 → ELK children（ELK 使用左上角坐标 + 宽高）
    const children = visibleNodes.map(n => ({
        id: n.key,
        width: n.w,
        height: n.h
    }));

    // 边 → ELK edges（只保留两端均可见的边）
    const elkEdges = [];
    for (const e of edges) {
        if (e._visible === false) continue;
        if (!visibleIds.has(e.from) || !visibleIds.has(e.to)) continue;
        elkEdges.push({
            id: `${e.from}→${e.to}`,
            sources: [e.from],
            targets: [e.to]
        });
    }

    return { children, edges: elkEdges };
}

/**
 * 将 ELK 布局结果应用回 YiWeb 节点
 *
 * ELK 使用左上角坐标 (x, y)，YiWeb 使用中心坐标。
 * 转换公式：YiWeb.(x,y) = ELK.(x,y) + (w/2, h/2)
 *
 * @param {Array} nodes - YiWeb 节点数组
 * @param {Map} posMap - ELK key → { x, y }（左上角坐标）
 * @param {number} W - 画布宽度
 */
function applyElkPositions(nodes, posMap, W) {
    for (const n of nodes) {
        const pos = posMap.get(n.key);
        if (!pos) continue;

        const elkCenterX = pos.x + n.w / 2;
        const elkCenterY = pos.y + n.h / 2;

        // 水平：使用 ELK 计算的 X 位置（保证不重叠的最小间距）
        // 对于过宽的布局，平移使其居中
        n.x = elkCenterX;

        // 垂直：ELK 的层级与我们预定义的 layer 可能不完全一致，
        // 保留 ELK 的 Y 位置以获得最优的层间间距
        n.y = elkCenterY;
    }
}

/**
 * 计算 ELK 生成布局的包围盒
 *
 * @param {Array} nodes
 * @param {Map} posMap
 * @returns {{ minX: number, maxX: number, minY: number, maxY: number }}
 */
function computeElkBBox(nodes, posMap) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
        const pos = posMap.get(n.key);
        if (!pos) continue;
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + n.w);
        maxY = Math.max(maxY, pos.y + n.h);
    }
    return { minX, minY, maxX, maxY };
}

/**
 * 运行 ELK 布局 — 主入口
 *
 * ELK 的 layered 算法基于 Sugiyama 框架：
 *   1. Cycle breaking  — 将图转为无环
 *   2. Layer assignment — 将节点分配到各层
 *   3. Crossing reduction — Barycenter 启发式最小化边交叉
 *   4. Position assignment — 在保证 nodeNode 最小间距的前提下分配坐标
 *
 * 相比自研 dagreLayout 的优势：
 *   - 经过工业级验证的布局算法，保证不重叠
 *   - 自动处理复杂拓扑（循环、多边、大图）
 *   - Understand-Anything 验证过的配置
 *
 * @param {Array} nodes - YiWeb 节点数组（会被原地修改 x, y）
 * @param {Array} edges - YiWeb 边数组
 * @param {Map} nodeMap - key → node 映射
 * @param {number} W - 画布宽度
 * @param {number} H - 画布高度
 * @returns {Promise<boolean>} 是否成功完成布局
 */
export async function applyElkLayout(nodes, edges, nodeMap, W, H) {
    if (!isElkAvailable()) {
        console.warn('[ELK] ELK.js 未加载，回退到 dagreLayout');
        return false;
    }

    const { children, edges: elkEdges } = toElkGraph(nodes, edges, nodeMap);

    if (children.length === 0) return true;
    if (children.length > 500) {
        // 超大图：ELK 可能较慢，跳过
        console.warn('[ELK] 节点数超过 500，跳过 ELK 布局以保持性能');
        return false;
    }

    const graph = {
        id: 'root',
        layoutOptions: { ...ELK_OPTIONS },
        children,
        edges: elkEdges
    };

    try {
        const elk = new ELK();
        const result = await elk.layout(graph);

        if (!result.children || result.children.length === 0) {
            console.warn('[ELK] 布局返回空结果');
            return false;
        }

        // 构建位置映射（ELK 左上角坐标）
        const posMap = new Map();
        for (const child of result.children) {
            if (child.x != null && child.y != null) {
                posMap.set(child.id, { x: child.x, y: child.y });
            }
        }

        if (posMap.size === 0) return false;

        // 应用 ELK 位置
        applyElkPositions(nodes, posMap, W);

        // 记录 Y 锚点供力模拟使用
        for (const n of nodes) {
            n._anchorY = n.y;
        }

        // 计算全局偏移使其在画布中居中
        const bbox = computeElkBBox(nodes, posMap);
        const layoutW = bbox.maxX - bbox.minX || 1;
        const offsetX = W / 2 - (bbox.minX + layoutW / 2);
        const offsetY = 60; // 顶部留白

        for (const n of nodes) {
            const pos = posMap.get(n.key);
            if (!pos) continue;
            n.x += offsetX;
            n.y += offsetY;
        }

        return true;
    } catch (err) {
        console.warn('[ELK] 布局失败:', err.message || err);
        return false;
    }
}
