#!/usr/bin/env node
/**
 * Regenerate all knowledge-graph.json files and story-deps.json
 * - Fix scene labels to match actual scene filenames
 * - Fix misclassified nodes
 * - Regenerate story-deps.json with improved structure
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const STORIES_DIR = join(ROOT, 'docs', '故事任务面板');

const STORY_DIRS = readdirSync(STORIES_DIR).filter(f => {
  const p = join(STORIES_DIR, f);
  return statSync(p).isDirectory() && existsSync(join(p, '故事任务.md'));
});

console.log('Found story directories:', STORY_DIRS);

// ── Read scene files from a story directory ──
function readSceneFiles(storyDir) {
  const files = readdirSync(storyDir)
    .filter(f => /^场景\d+[-]/.test(f) && f.endsWith('.md'))
    .sort();
  return files.map(f => ({
    filename: f,
    name: f.replace(/\.md$/, ''),
    num: parseInt((f.match(/^场景(\d+)/) || [])[1], 10),
  }));
}

// ── Extract scene short name from filename (e.g., "场景1-模块定位" → "模块定位") ──
function sceneShortName(sceneName) {
  return sceneName.replace(/^场景\d+[-]/, '');
}

// ── Fix a single KG file ──
function fixKnowledgeGraph(storyDirName, storyDir) {
  const kgPath = join(storyDir, 'knowledge-graph.json');
  if (!existsSync(kgPath)) {
    console.log(`  SKIP: no knowledge-graph.json in ${storyDirName}`);
    return null;
  }

  const kg = JSON.parse(readFileSync(kgPath, 'utf-8'));
  const sceneFiles = readSceneFiles(storyDir);
  console.log(`  Processing ${storyDirName}: ${sceneFiles.length} scenes, ${(kg.graph?.nodes||[]).length} nodes`);

  const sceneNameMap = {};
  for (const sf of sceneFiles) {
    sceneNameMap[sf.num] = sf.name;
  }

  // ── Fix story.scenarios[].name ──
  const scenarios = kg.story?.scenarios || [];
  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i];
    const sceneNum = i + 1;
    if (sceneNameMap[sceneNum]) {
      const oldName = sc.name;
      sc.name = sceneNameMap[sceneNum];
      sc._sourceDir = storyDirName;
      if (oldName !== sc.name) {
        console.log(`    Rename scenario: "${oldName}" → "${sc.name}"`);
      }
    }
  }

  // ── Fix graph nodes ──
  const nodes = kg.graph?.nodes || [];
  let fixCount = 0;

  for (const node of nodes) {
    // Fix misclassified nodes
    if (node.id === 'index-html' && (node.type === 'scenario' || node.type === 'scene')) {
      node.type = 'source';
      node.group = '视图入口';
      node.label = 'index.html — 应用外壳';
      node.description = 'SPA 入口 HTML 文件，挂载所有视图';
      fixCount++;
      console.log(`    Fixed misclassified: ${node.id} → source`);
    }
    if (node.id === 'CLAUDE' && (node.type === 'scenario' || node.type === 'scene')) {
      node.type = 'config';
      node.group = '配置';
      node.label = 'CLAUDE.md — 项目指令';
      node.description = 'CLAUDE.md 项目指令文件，定义项目画像、约束和准则';
      fixCount++;
      console.log(`    Fixed misclassified: ${node.id} → config`);
    }

    // Fix scene node labels to match filenames
    if (node.type === 'scenario' || node.type === 'scene') {
      const match = node.id.match(/-scene-(\d+)$/);
      if (match && sceneNameMap[parseInt(match[1])]) {
        const newLabel = sceneNameMap[parseInt(match[1])];
        if (node.label !== newLabel) {
          const oldLabel = node.label;
          node.label = newLabel;
          fixCount++;
          console.log(`    Fixed scene label: "${oldLabel}" → "${newLabel}"`);
        }
      }
    }

    // Ensure mdFiles reference correct scenario name
    if (Array.isArray(node.mdFiles)) {
      for (const mf of node.mdFiles) {
        const sn = mf.scenario || mf.file || '';
        const snNum = parseInt((sn.match(/^场景(\d+)/) || [])[1], 10);
        if (snNum && sceneNameMap[snNum] && mf.scenario !== sceneNameMap[snNum]) {
          mf.scenario = sceneNameMap[snNum];
          fixCount++;
        }
      }
    }
  }

  // ── Fix edge IDs that reference old scene names ──
  const edges = kg.graph?.edges || [];
  // edges typically reference node IDs (which stay the same), so no changes needed

  console.log(`  Total fixes: ${fixCount}`);

  return kg;
}

// ── Main: Process all KGs ──
console.log('\n=== Fixing knowledge-graph.json files ===\n');
const allKGs = {};

for (const dirName of STORY_DIRS) {
  const dirPath = join(STORIES_DIR, dirName);
  const kg = fixKnowledgeGraph(dirName, dirPath);
  if (kg) {
    // Write fixed KG
    const kgPath = join(dirPath, 'knowledge-graph.json');
    writeFileSync(kgPath, JSON.stringify(kg, null, 2) + '\n', 'utf-8');
    console.log(`  Wrote: ${kgPath}`);

    // Store for story-deps generation
    const nodes = kg.graph?.nodes || [];
    const edges = kg.graph?.edges || [];
    // Prefix node IDs with story name
    const prefixedNodes = nodes.map(n => ({
      ...n,
      id: `${dirName}/${n.id}`,
      storyId: dirName,
      storyLabel: kg.story?.name || dirName,
    }));
    const prefixedEdges = edges.map(e => ({
      ...e,
      id: `${dirName}/${e.id}`,
      source: `${dirName}/${e.source}`,
      target: `${dirName}/${e.target}`,
    }));

    allKGs[dirName] = {
      story: kg.story,
      graph: { nodes: prefixedNodes, edges: prefixedEdges },
      projectRoot: kg.projectRoot,
    };
  }
}

// ── Generate improved story-deps.json ──
console.log('\n=== Generating story-deps.json ===\n');

// Collect all nodes and edges
const allNodes = [];
const allEdges = [];
const nodeIdToStory = {};

for (const [storyName, kg] of Object.entries(allKGs)) {
  for (const n of kg.graph.nodes) {
    allNodes.push(n);
    nodeIdToStory[n.id] = storyName;
  }
  for (const e of kg.graph.edges) {
    allEdges.push(e);
  }
}

// Build cross-story edges
const crossStoryEdges = [];
for (const e of allEdges) {
  const srcStory = nodeIdToStory[e.source];
  const tgtStory = nodeIdToStory[e.target];
  if (srcStory && tgtStory && srcStory !== tgtStory) {
    crossStoryEdges.push({
      source: e.source,
      target: e.target,
      from: srcStory,
      to: tgtStory,
      type: e.relation || e.type || 'references',
      label: e.label || '',
      weight: e.weight || 0.5,
    });
  }
}

// Count node/edge types
const nodeTypeCounts = {};
const edgeTypeCounts = {};
for (const n of allNodes) {
  nodeTypeCounts[n.type] = (nodeTypeCounts[n.type] || 0) + 1;
}
for (const e of allEdges) {
  const et = e.relation || e.type || 'unknown';
  edgeTypeCounts[et] = (edgeTypeCounts[et] || 0) + 1;
}

// Build story cards
const storyCards = [];
for (const dirName of STORY_DIRS) {
  const kg = allKGs[dirName];
  if (!kg) continue;
  const s = kg.story || {};
  const n = kg.graph.nodes;
  const e = kg.graph.edges;
  const scenes = (s.scenarios || []);
  storyCards.push({
    id: dirName,
    label: s.name || dirName,
    summary: s.description || '',
    complexity: scenes.length >= 5 ? 'complex' : scenes.length >= 3 ? 'moderate' : 'simple',
    priority: 'P0',
    status: 'baseline',
    scenes: scenes.length,
    nodes: n.length,
    edges: e.length,
    layers: new Set(n.map(x => x.layer || x.group)).size,
    tags: ['architecture', 'documentation', 'baseline'],
    sceneList: scenes.map(sc => ({
      id: `scene-${(scenes.indexOf(sc) + 1)}`,
      name: sc.name,
      description: sc.description || '',
      nodeCount: (sc.graphNodes || []).length,
      nodes: sc.graphNodes || [],
    })),
    entryDir: `docs/故事任务面板/${dirName}/`,
  });
}

// Build dependency matrix
const storyIds = Object.keys(allKGs);
const matrix = {};
for (const a of storyIds) {
  matrix[a] = {};
  for (const b of storyIds) {
    matrix[a][b] = null;
  }
}
for (const ce of crossStoryEdges) {
  if (matrix[ce.from] && ce.from !== ce.to) {
    matrix[ce.from][ce.to] = matrix[ce.from][ce.to] || ce.type;
  }
}

// Count total scenes
const totalScenes = storyCards.reduce((sum, c) => sum + c.scenes, 0);

const storyDeps = {
  version: '2.1.0',
  kind: 'story-deps',
  generatedAt: new Date().toISOString(),
  project: {
    name: 'YiWeb',
    description: '零构建前端 SPA，浏览器原生 ESM 架构',
    version: '1.0.0',
  },
  stats: {
    storyCount: storyCards.length,
    storyEdgeCount: crossStoryEdges.length,
    knowledgeGraphNodes: allNodes.length,
    knowledgeGraphEdges: allEdges.length,
    crossStoryEdges: crossStoryEdges.length,
    layers: new Set(allNodes.map(n => n.layer || n.group || '')).size,
    totalScenes,
    nodeTypes: nodeTypeCounts,
    edgeTypes: edgeTypeCounts,
  },
  stories: storyCards,
  storyEdges: crossStoryEdges.map(ce => ({
    source: `${ce.from}`,
    target: `${ce.to}`,
    from: ce.from,
    to: ce.to,
    type: ce.type,
    label: `${ce.from} → ${ce.to}`,
    rationale: '',
    direction: 'forward',
    weight: ce.weight,
    criticalPath: false,
  })),
  scenes: {},
  knowledgeGraph: {
    nodes: allNodes.map(n => {
      // Store in Cytoscape compatible format
      const { storyId, storyLabel, ...nd } = n;
      return {
        data: {
          ...nd,
          _storyId: storyId,
          _storyLabel: storyLabel,
        },
        classes: `${nd.type} ${nd.layer || nd.group || ''}`,
      };
    }),
    edges: allEdges.map(e => {
      const { type, relation, label, ...rest } = e;
      const edgeType = type || relation || 'references';
      return {
        data: {
          ...rest,
          type: edgeType,
          relation: edgeType,
          label: label || '',
        },
        classes: edgeType,
      };
    }),
  },
  nodeTypes: {
    story: { label: '故事概念', color: '#EC4899', description: '故事级抽象概念' },
    scene: { label: '场景文档', color: '#8B5CF6', description: '场景文档节点' },
    scenario: { label: '场景文档', color: '#8B5CF6', description: '场景文档节点' },
    source: { label: '源码文件', color: '#3B82F6', description: '源码文件节点' },
    test: { label: '测试文件', color: '#EF4444', description: '测试文件节点' },
    config: { label: '配置文件', color: '#F97316', description: '配置文件节点' },
    doc: { label: '文档文件', color: '#6B7280', description: '文档文件节点' },
  },
  edgeTypes: {
    contains: { label: '包含', color: '#8B5CF6', description: '场景包含源文件' },
    depends_on: { label: '依赖', color: '#64748B', description: '模块间依赖' },
    validates: { label: '验证', color: '#22C55E', description: '测试验证源文件' },
    implements: { label: '实现', color: '#3B82F6', description: '源文件实现功能' },
    references: { label: '引用', color: '#64748B', description: '跨文件引用' },
    informs: { label: '告知', color: '#F59E0B', description: '故事间信息传递' },
  },
  dependencyMatrix: {
    stories: storyIds,
    matrix,
  },
  criticalPath: {
    description: '按故事依赖关系排序的执行顺序',
    orderedSteps: storyCards.map((sc, i) => ({
      order: i + 1,
      story: sc.id,
      action: sc.summary || sc.label,
      output: `knowledge-graph.json + ${sc.scenes} 场景文档`,
    })),
  },
};

// Write story-deps.json
const depsPath = join(STORIES_DIR, 'story-deps.json');
writeFileSync(depsPath, JSON.stringify(storyDeps, null, 2) + '\n', 'utf-8');
console.log(`Wrote story-deps.json: ${allNodes.length} nodes, ${allEdges.length} edges, ${crossStoryEdges.length} cross-story edges`);

// Also fill in scenes map from story cards for easier lookup
storyDeps.scenes = {};
for (const card of storyCards) {
  for (const sl of card.sceneList) {
    const sceneId = `${card.id}/scene-${sl.id.replace('scene-', '')}`;
    storyDeps.scenes[sceneId] = {
      name: sl.name,
      description: sl.description || '',
      story: card.id,
      storyLabel: card.label,
      nodes: sl.nodes || [],
    };
  }
}
writeFileSync(depsPath, JSON.stringify(storyDeps, null, 2) + '\n', 'utf-8');

console.log('\nDone! Processed', STORY_DIRS.length, 'stories');
console.log('Fixed KGs and regenerated story-deps.json');
