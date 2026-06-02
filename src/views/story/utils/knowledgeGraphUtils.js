/**
 * 知识图谱工具函数
 * 用于加载、解析和查询知识图谱数据，建立文件到故事/场景的映射
 */

import { logInfo, logWarn, logError } from '/cdn/utils/core/log.js';

// 全局缓存的知识图谱数据
let allKnowledgeGraphs = null;
let fileToStoriesMap = null;

/**
 * 单个知识图谱文件的解析器
 * @param {Object} graphData - 知识图谱JSON数据
 * @param {string} directory - 故事目录名称
 * @returns {Object} 标准化的故事数据
 */
function parseKnowledgeGraph(graphData, directory) {
    if (!graphData || !graphData.story) {
        logWarn(`[知识图谱] 无效的图谱数据格式: ${directory}`);
        return null;
    }

    const story = graphData.story;
    return {
        directory,
        name: story.name || directory,
        description: story.description || '',
        scenarios: (story.scenarios || []).map(scenario => ({
            name: scenario.name || '未命名场景',
            description: scenario.description || '',
            sourceFiles: (scenario.sourceFiles || []).map(file => ({
                type: file.type || 'unknown',
                file: file.file,
                keyContent: file.keyContent || '',
                description: file.description || '',
                code: file.code || null
            })),
            raw: scenario
        })),
        raw: graphData
    };
}

/**
 * 加载所有知识图谱文件
 * @returns {Promise<Array>} 所有故事的知识图谱数据
 */
async function loadAllKnowledgeGraphs() {
    if (allKnowledgeGraphs) {
        return allKnowledgeGraphs;
    }

    try {
        // 首先加载故事依赖.json以获取所有故事目录
        const depsResponse = await fetch('/docs/故事任务面板/故事依赖.json', { credentials: 'omit' });
        if (!depsResponse.ok) {
            logError('[知识图谱] 无法加载故事依赖.json:', depsResponse.status);
            return [];
        }

        const depsData = await depsResponse.json();
        if (!depsData.stories) {
            logError('[知识图谱] 故事依赖.json格式无效');
            return [];
        }

        const stories = depsData.stories;
        const graphs = [];

        // 逐个加载每个故事的知识图谱.json
        for (const story of stories) {
            try {
                const graphPath = `/docs/故事任务面板/${story.directory}/知识图谱.json`;
                const response = await fetch(graphPath, { credentials: 'omit' });
                
                if (response.ok) {
                    const graphData = await response.json();
                    const parsedGraph = parseKnowledgeGraph(graphData, story.directory);
                    if (parsedGraph) {
                        parsedGraph.storyMetadata = story;
                        graphs.push(parsedGraph);
                    }
                } else {
                    logWarn(`[知识图谱] 无法找到图谱文件: ${graphPath}`);
                }
            } catch (err) {
                logError(`[知识图谱] 加载故事 ${story.directory} 失败:`, err);
            }
        }

        allKnowledgeGraphs = graphs;
        logInfo(`[知识图谱] 成功加载 ${graphs.length} 个知识图谱`);
        return graphs;
    } catch (err) {
        logError('[知识图谱] 加载所有知识图谱失败:', err);
        return [];
    }
}

/**
 * 构建文件到故事/场景的映射索引
 * @returns {Promise<Object>} 文件路径到故事/场景的映射
 */
async function buildFileToStoriesMap() {
    if (fileToStoriesMap) {
        return fileToStoriesMap;
    }

    const graphs = await loadAllKnowledgeGraphs();
    const map = {};

    for (const graph of graphs) {
        const storyDirectory = graph.directory;
        const storyName = graph.name;
        const storyMetadata = graph.storyMetadata || {};

        // 策略A: 从 scenarios.sourceFiles 索引
        for (const scenario of graph.scenarios) {
            for (const fileRef of scenario.sourceFiles) {
                const filePath = fileRef.file;
                if (!filePath || typeof filePath !== 'string') continue;
                // 跳过非真实文件路径的占位符
                if (filePath.includes('全项目 import') || filePath === '模块地图总表') {
                    continue;
                }

                if (!map[filePath]) {
                    map[filePath] = [];
                }

                map[filePath].push({
                    storyDirectory,
                    storyName,
                    storyMetadata,
                    scenarioName: scenario.name,
                    scenarioDescription: scenario.description,
                    fileRef,
                    matchedAt: new Date().toISOString()
                });
            }
        }

        // 策略B: 从 v2.0 graph.nodes 索引（补充没有出现在 scenarios 中的文件）
        const rawData = graph.raw;
        if (rawData && rawData.graph && Array.isArray(rawData.graph.nodes)) {
            for (const node of rawData.graph.nodes) {
                const filePath = node.file;
                if (!filePath || typeof filePath !== 'string') continue;
                if (filePath.includes('全项目 import')) continue;
                if (map[filePath]) continue; // 已通过 scenarios 索引

                if (!map[filePath]) {
                    map[filePath] = [];
                }

                map[filePath].push({
                    storyDirectory,
                    storyName,
                    storyMetadata,
                    scenarioName: node.group || node.type || '',
                    scenarioDescription: node.description || '',
                    fileRef: {
                        type: node.type || 'unknown',
                        file: filePath,
                        keyContent: (node.keyFunctions || []).join(', '),
                        description: node.description || '',
                    },
                    matchedAt: new Date().toISOString()
                });
            }
        }
    }

    fileToStoriesMap = map;
    logInfo(`[知识图谱] 构建文件映射完成，共 ${Object.keys(map).length} 个文件被映射到 ${graphs.length} 个故事`);
    return map;
}

/**
 * 查询特定文件路径所属的所有故事和场景
 * @param {string} filePath - 要查询的文件路径
 * @returns {Promise<Array>} 包含故事和场景信息的数组
 */
export async function getStoriesForFile(filePath) {
    if (!filePath || typeof filePath !== 'string') {
        return [];
    }

    const map = await buildFileToStoriesMap();
    const variants = getFilePathVariants(filePath);

    // 策略1: 精确匹配 — 尝试所有路径变体
    for (const variant of variants) {
        if (map[variant]) {
            return map[variant];
        }
    }

    // 策略2: 模糊匹配 — 检查存储路径是否包含变体中的任意一个
    const matches = [];
    const seen = new Set();
    for (const variant of variants) {
        for (const [storedPath, entries] of Object.entries(map)) {
            if (seen.has(storedPath)) continue;
            if (storedPath.includes(variant) || variant.includes(storedPath)) {
                seen.add(storedPath);
                matches.push(...entries);
            }
        }
    }

    // 策略3: 文件名匹配 — 仅匹配文件名部分
    if (matches.length === 0) {
        const fileName = variants[0]?.split('/').pop();
        if (fileName) {
            for (const [storedPath, entries] of Object.entries(map)) {
                if (seen.has(storedPath)) continue;
                const storedFileName = storedPath.split('/').pop();
                if (storedFileName === fileName) {
                    seen.add(storedPath);
                    matches.push(...entries);
                }
            }
        }
    }

    return matches;
}

/**
 * 获取所有故事的知识图谱数据
 * @returns {Promise<Array>} 所有故事数据
 */
export async function getAllStories() {
    return await loadAllKnowledgeGraphs();
}

/**
 * 获取单个故事的知识图谱数据
 * @param {string} directory - 故事目录名称
 * @returns {Promise<Object|null>} 故事数据
 */
export async function getStoryByDirectory(directory) {
    const graphs = await loadAllKnowledgeGraphs();
    return graphs.find(graph => graph.directory === directory) || null;
}

/**
 * 标准化文件路径格式
 * 处理各种来源的路径变体（AICR fileTree、CodeView、story panel）
 * @param {string} filePath - 原始文件路径
 * @returns {string} 标准化后的路径
 */
export function normalizeFilePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
        return '';
    }

    let normalized = filePath.trim();

    // 统一使用正斜杠
    normalized = normalized.replace(/\\/g, '/');

    // 移除开头的 ./ 或 /
    normalized = normalized.replace(/^[./\\]+/, '');

    // 移除末尾的斜杠
    normalized = normalized.replace(/\/+$/, '');

    // 移除常见的项目名前缀（如 YiWeb/、YiWeb-arch/ 等）
    // AICR file tree 路径通常包含项目名作为第一级目录
    const projectPrefixes = ['YiWeb/', 'YiWeb-arch/', 'aicr/', 'claude/', 'story/'];
    for (const prefix of projectPrefixes) {
        if (normalized.startsWith(prefix)) {
            normalized = normalized.slice(prefix.length);
            break;
        }
    }

    // 如果路径以 docs/ 或 故事任务面板/ 开头，尝试提取实际文件路径
    // 这些是面板文件路径，不是源代码文件路径

    return normalized;
}

/**
 * 生成文件路径的多个匹配变体
 * 用于模糊匹配时尝试不同的路径格式
 * @param {string} filePath - 原始文件路径
 * @returns {string[]} 路径变体数组
 */
export function getFilePathVariants(filePath) {
    if (!filePath || typeof filePath !== 'string') {
        return [];
    }

    const normalized = normalizeFilePath(filePath);
    const variants = [normalized];

    // 变体1: 仅文件名（最后一段）
    const parts = normalized.split('/');
    if (parts.length > 1) {
        variants.push(parts[parts.length - 1]);
        // 变体2: 最后两级（目录/文件名）
        if (parts.length > 2) {
            variants.push(parts.slice(-2).join('/'));
        }
        // 变体3: 最后三级
        if (parts.length > 3) {
            variants.push(parts.slice(-3).join('/'));
        }
    }

    // 变体4: 不带项目前缀的原始路径
    variants.push(filePath.replace(/\\/g, '/').replace(/^[./\\]+/, '').replace(/\/+$/, ''));

    // 去重
    return [...new Set(variants)].filter(Boolean);
}

/**
 * 刷新缓存的映射数据
 */
export async function refreshCache() {
    allKnowledgeGraphs = null;
    fileToStoriesMap = null;
    await buildFileToStoriesMap();
}

/**
 * 获取文件映射的统计信息
 * @returns {Promise<Object>} 统计信息
 */
export async function getKnowledgeGraphStats() {
    const map = await buildFileToStoriesMap();
    const graphs = await loadAllKnowledgeGraphs();

    return {
        totalFiles: Object.keys(map).length,
        totalStories: graphs.length,
        totalScenarios: graphs.reduce((sum, g) => sum + g.scenarios.length, 0),
        stories: graphs.map(g => ({
            directory: g.directory,
            name: g.name,
            scenarioCount: g.scenarios.length
        }))
    };
}

/**
 * 根据 MD 文件名查找知识图谱中关联的所有节点
 * 用于实现 "点击 MD 文件 → 高亮图中相关节点" 的联动
 *
 * @param {string} storyDir - 故事目录名称（如 'yiweb-arch'）
 * @param {string} mdFileName - MD 文件名（如 '场景1-模块定位.md'）
 * @returns {Promise<Array>} 相关节点数组 [{id, label, file, type, group}]
 */
export async function findNodesByMdFile(storyDir, mdFileName) {
    if (!storyDir || !mdFileName) return [];

    try {
        const graphPath = `/docs/故事任务面板/${storyDir}/知识图谱.json`;
        const response = await fetch(graphPath, { credentials: 'omit' });
        if (!response.ok) {
            logWarn(`[知识图谱] 无法加载图谱: ${graphPath}`);
            return [];
        }

        const data = await response.json();
        const graph = data.graph;
        if (!graph || !Array.isArray(graph.nodes)) return [];

        // 策略 A: 从节点的 mdFiles 字段精确匹配
        const matchedByMdFiles = graph.nodes.filter(n => {
            if (!Array.isArray(n.mdFiles)) return false;
            return n.mdFiles.some(m => {
                const mf = m.file || '';
                // 支持完整文件名匹配和部分匹配
                return mf === mdFileName ||
                       mf.endsWith('/' + mdFileName) ||
                       mdFileName.endsWith('/' + mf) ||
                       mf.includes(mdFileName) ||
                       mdFileName.includes(mf);
            });
        });

        if (matchedByMdFiles.length > 0) {
            logInfo(`[知识图谱] 通过 mdFiles 匹配到 ${matchedByMdFiles.length} 个节点`, { storyDir, mdFileName });
            return matchedByMdFiles.map(n => ({
                id: n.id,
                label: n.label,
                file: n.file,
                type: n.type,
                group: n.group,
            }));
        }

        // 策略 B: 从 scenario 的 graphNodes 字段匹配
        const scenarios = data.story?.scenarios || [];
        for (const scenario of scenarios) {
            const scenarioFile = scenario.name || '';
            // 检查场景是否匹配（通过名称推断文件名）
            if (scenarioFile.includes(mdFileName.replace('.md', '')) ||
                mdFileName.includes(scenarioFile.replace('场景', '').split('·')[0]?.trim())) {
                const graphNodeIds = scenario.graphNodes || [];
                if (graphNodeIds.length > 0) {
                    const matched = graph.nodes.filter(n => graphNodeIds.includes(n.id));
                    if (matched.length > 0) {
                        logInfo(`[知识图谱] 通过 graphNodes 匹配到 ${matched.length} 个节点`, { storyDir, mdFileName });
                        return matched.map(n => ({
                            id: n.id,
                            label: n.label,
                            file: n.file,
                            type: n.type,
                            group: n.group,
                        }));
                    }
                }
            }
        }

        // 策略 C: 模糊匹配 — MD 文件名中的关键词与节点 file/label 匹配
        const keywords = mdFileName.replace('.md', '').split(/[-·\s]/).filter(k => k.length > 1);
        const fuzzyMatched = graph.nodes.filter(n => {
            const searchText = `${n.file || ''} ${n.label || ''} ${n.description || ''}`;
            return keywords.some(kw => searchText.includes(kw));
        });

        if (fuzzyMatched.length > 0) {
            logInfo(`[知识图谱] 通过模糊匹配到 ${fuzzyMatched.length} 个节点`, { keywords });
            return fuzzyMatched.slice(0, 20).map(n => ({
                id: n.id,
                label: n.label,
                file: n.file,
                type: n.type,
                group: n.group,
            }));
        }

        return [];
    } catch (err) {
        logWarn(`[知识图谱] 查找 MD 文件关联节点失败:`, err.message);
        return [];
    }
}
