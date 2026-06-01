#!/usr/bin/env python3
"""
Rebuild story-deps.json by merging all story directories' knowledge-graph.json files.

Usage:
  python3 rebuild-story-deps.py

The script:
  1. Scans each subdirectory under docs/故事任务面板/ for knowledge-graph.json
  2. Merges all scenario/source/test nodes with directory-prefixed IDs
  3. Adds canonical story-level nodes (one per directory)
  4. Adds inter-story dependency edges
  5. Writes the merged result to story-deps.json
"""
import json, os, sys

DOCS_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(DOCS_DIR, 'story-deps.json')

# ── Story dependency metadata ──
# Each entry maps directory → { name, type, priority, group, parent?, children?, dependsOn? }
STORY_META = {
    'yiweb-arch': {
        'name': 'YiWeb 系统架构',
        'type': 'parent',
        'priority': 'P0',
        'group': '父故事',  # 父故事
        'children': [
            'yiweb-arch-layers',
            'yiweb-arch-modules',
            'yiweb-arch-dataflow',
            'yiweb-arch-security',
            'yiweb-arch-deps',
        ],
    },
    'yiweb-arch-layers': {
        'name': '系统架构-分层结构',  # 系统架构-分层结构
        'type': 'sub',
        'priority': 'P0',
        'group': 'P0 子故事',  # P0 子故事
        'parent': 'yiweb-arch',
    },
    'yiweb-arch-modules': {
        'name': '系统架构-模块地图',  # 系统架构-模块地图
        'type': 'sub',
        'priority': 'P0',
        'group': 'P0 子故事',
        'parent': 'yiweb-arch',
    },
    'yiweb-arch-dataflow': {
        'name': '系统架构-数据流',  # 系统架构-数据流
        'type': 'sub',
        'priority': 'P1',
        'group': 'P1 子故事',
        'parent': 'yiweb-arch',
        'dependsOn': [
            {'directory': 'yiweb-arch-layers', 'relation': 'informs'},
            {'directory': 'yiweb-arch-modules', 'relation': 'informs'},
        ],
    },
    'yiweb-arch-security': {
        'name': '系统架构-安全边界',  # 系统架构-安全边界
        'type': 'sub',
        'priority': 'P0',
        'group': 'P0 子故事',
        'parent': 'yiweb-arch',
        'dependsOn': [
            {'directory': 'yiweb-arch-layers', 'relation': 'informs'},
            {'directory': 'yiweb-arch-modules', 'relation': 'informs'},
        ],
    },
    'yiweb-arch-deps': {
        'name': '系统架构-依赖矩阵',  # 系统架构-依赖矩阵
        'type': 'sub',
        'priority': 'P1',
        'group': 'P1 子故事',
        'parent': 'yiweb-arch',
        'dependsOn': [
            {'directory': 'yiweb-arch-layers', 'relation': 'informs'},
            {'directory': 'yiweb-arch-modules', 'relation': 'informs'},
        ],
    },
    'yiweb-self-test': {
        'name': 'YiWeb 自主测试方案',  # YiWeb 自主测试方案
        'type': 'independent',
        'priority': 'P0',
        'group': '独立故事',  # 独立故事
        'dependsOn': [
            {'directory': 'yiweb-arch', 'relation': 'references'},
        ],
    },
}


def load_kg(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def main():
    # ── 1. Discover story directories ──
    story_dirs = []
    for entry in sorted(os.listdir(DOCS_DIR)):
        story_dir = os.path.join(DOCS_DIR, entry)
        if not os.path.isdir(story_dir):
            continue
        kg_file = os.path.join(story_dir, 'knowledge-graph.json')
        if not os.path.exists(kg_file):
            continue
        story_dirs.append((entry, story_dir, kg_file))

    if not story_dirs:
        print('ERROR: No story directories with knowledge-graph.json found', file=sys.stderr)
        sys.exit(1)

    # ── 2. Merge all knowledge graphs ──
    stories = []
    all_nodes = []
    all_edges = []
    all_scenarios = []

    for entry, story_dir, kg_file in story_dirs:
        kg = load_kg(kg_file)
        graph = kg.get('graph', {})
        nodes = graph.get('nodes', [])
        edges = graph.get('edges', [])

        id_prefix = entry + '/'
        kept_ids = set()

        for n in nodes:
            ntype = n.get('type', '')
            if ntype == 'story':
                continue  # Skip per-KG story nodes; canonical ones added below
            nid = n.get('id', '')
            new_id = id_prefix + nid
            n['id'] = new_id
            n['_story_dir'] = entry
            kept_ids.add(nid)
            all_nodes.append(n)

        for e in edges:
            src = e.get('source', '')
            tgt = e.get('target', '')
            if src not in kept_ids or tgt not in kept_ids:
                continue
            e['source'] = id_prefix + src
            e['target'] = id_prefix + tgt
            all_edges.append(e)

        for sc in kg.get('story', {}).get('scenarios', []):
            sc['_story_dir'] = entry
            all_scenarios.append(sc)

        stories.append({
            'name': kg.get('story', {}).get('name', entry),
            'directory': entry,
            'description': kg.get('story', {}).get('description', ''),
            'scenario_count': len(kg.get('story', {}).get('scenarios', [])),
            'node_count': len(nodes),
            'edge_count': len(edges),
        })
        print(f'  {entry}: {len(kept_ids)} nodes, {len(all_edges)} edges ({len(all_scenarios)} scenarios)')

    # ── 3. Add canonical story nodes ──
    known_dirs = {s['directory'] for s in stories}
    edge_count_before = len(all_edges)

    for directory, meta in STORY_META.items():
        if directory not in known_dirs:
            print(f'  WARNING: Story metadata references unknown directory: {directory}')
            continue
        story_node = {
            'id': directory,
            'label': meta['name'],
            'type': 'story',
            'group': meta['group'],
            'file': f'docs/故事任务面板/{directory}/knowledge-graph.json',
            'description': f"{meta['priority']} · {meta['type']}",
            'priority': meta['priority'],
        }
        if meta.get('children'):
            story_node['children'] = meta['children']
        if meta.get('parent'):
            story_node['parent'] = meta['parent']
        all_nodes.append(story_node)
        print(f'  + story: {directory} ({meta["group"]})')

    # ── 4. Add inter-story edges ──
    for directory, meta in STORY_META.items():
        if directory not in known_dirs:
            continue
        parent = meta.get('parent')
        if parent and parent in STORY_META and parent in known_dirs:
            all_edges.append({
                'source': parent, 'target': directory,
                'relation': 'contains', 'label': 'contains',
            })
        for dep in meta.get('dependsOn', []):
            dep_dir = dep['directory']
            if dep_dir in STORY_META and dep_dir in known_dirs:
                all_edges.append({
                    'source': dep_dir, 'target': directory,
                    'relation': dep['relation'], 'label': dep['relation'],
                })

    inter_story_edges = len(all_edges) - edge_count_before

    # ── 5. Write output ──
    output = {
        'version': '3.0.0',
        'generatedAt': '2026-06-01T00:00:00Z',
        'merged': True,
        'sourceFiles': len(stories),
        'stories': stories,
        'story': {
            'name': 'YiWeb 全景知识图谱',
            'description': f'合并 {len(stories)} 个故事，共 {len(all_nodes)} 个节点、{len(all_edges)} 条边',
            'scenarios': all_scenarios,
        },
        'graph': {
            'nodes': all_nodes,
            'edges': all_edges,
        },
    }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # ── Summary ──
    from collections import Counter
    types = Counter(n.get('type', '') for n in all_nodes)
    print(f'\n=== story-deps.json regenerated ===')
    print(f'  Stories:  {len(stories)}')
    print(f'  Nodes:    {len(all_nodes)}  {dict(types)}')
    print(f'  Edges:    {len(all_edges)}  (+{inter_story_edges} inter-story)')
    print(f'  Scenarios:{len(all_scenarios)}')
    print(f'  Output:   {OUTPUT_FILE}')


if __name__ == '__main__':
    main()
