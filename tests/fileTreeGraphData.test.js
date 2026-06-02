/**
 * 文件树图谱数据构建 - 单元测试
 * 测试 _buildFileTreeGraphData, _buildGraphFromStoryDeps,
 *       _buildFtGraphOverview, _buildFtGraphOverviewFromDeps
 */
import { describe, it, expect } from '/tests/runner.js';
import { fileTreeMethods } from '/src/views/aicr/components/fileTree/fileTreeMethods.js';

/* ── 测试辅助 ── */
function ctx(overrides) {
    return { tree: [], selectedTags: [], ...overrides };
}

/* ────────────────────────────────────────────── */
/* _buildFileTreeGraphData ── 文件树 → 图谱数据  */
/* ────────────────────────────────────────────── */

describe('_buildFileTreeGraphData', () => {

    it('空树返回空的节点和边', () => {
        const { nodes, edges } = fileTreeMethods._buildFileTreeGraphData.call(ctx());
        expect(nodes).toHaveLength(0);
        expect(edges).toHaveLength(0);
    });

    it('单个文件生成一个节点零条边', () => {
        const tree = [{ name: 'readme.md', type: 'file', key: 'readme.md' }];
        const { nodes, edges } = fileTreeMethods._buildFileTreeGraphData.call(ctx({ tree }));
        expect(nodes).toHaveLength(1);
        expect(edges).toHaveLength(0);
        expect(nodes[0].label).toBe('readme.md');
        expect(nodes[0].kind).toBe('file');
        expect(nodes[0].ext).toBe('md');
        expect(nodes[0].depth).toBe(0);
    });

    it('文件夹包含子项生成节点和父子边', () => {
        const tree = [{
            name: 'src', type: 'folder', key: 'src', children: [
                { name: 'index.js', type: 'file', key: 'src/index.js' },
            ],
        }];
        const { nodes, edges } = fileTreeMethods._buildFileTreeGraphData.call(ctx({ tree }));
        expect(nodes).toHaveLength(2);
        expect(edges).toHaveLength(1);
        expect(edges[0].relation).toBe('contains');
    });

    it('文件夹节点颜色为目录色', () => {
        const tree = [{ name: 'src', type: 'folder', key: 'src', children: [] }];
        const { nodes } = fileTreeMethods._buildFileTreeGraphData.call(ctx({ tree }));
        expect(nodes[0].color).toBe('#F59E0B');
        expect(nodes[0].kind).toBe('folder');
    });

    it('JS 文件节点颜色和扩展名正确', () => {
        const tree = [{ name: 'app.js', type: 'file', key: 'app.js' }];
        const { nodes } = fileTreeMethods._buildFileTreeGraphData.call(ctx({ tree }));
        expect(nodes[0].color).toBe('#F59E0B');
        expect(nodes[0].kind).toBe('file');
        expect(nodes[0].ext).toBe('js');
    });

    it('深层嵌套正确处理 depth 和 childCount', () => {
        const tree = [{
            name: 'a', type: 'folder', key: 'a', children: [{
                name: 'b', type: 'folder', key: 'a/b', children: [
                    { name: 'c.js', type: 'file', key: 'a/b/c.js' },
                    { name: 'd.js', type: 'file', key: 'a/b/d.js' },
                ],
            }],
        }];
        const { nodes } = fileTreeMethods._buildFileTreeGraphData.call(ctx({ tree }));
        const folderA = nodes.find(n => n.label === 'a');
        const folderB = nodes.find(n => n.label === 'b');
        expect(folderA.depth).toBe(0);
        expect(folderA.childCount).toBe(1);
        expect(folderB.depth).toBe(1);
        expect(folderB.childCount).toBe(2);
    });

    it('按选中的标签过滤顶层目录', () => {
        const tree = [
            { name: 'projA', type: 'folder', key: 'projA', children: [{ name: 'a.js', type: 'file', key: 'projA/a.js' }] },
            { name: 'projB', type: 'folder', key: 'projB', children: [{ name: 'b.js', type: 'file', key: 'projB/b.js' }] },
        ];
        const { nodes } = fileTreeMethods._buildFileTreeGraphData.call(ctx({ tree, selectedTags: ['projA'] }));
        const names = nodes.map(n => n.label);
        expect(names).toContain('projA');
        expect(names).not.toContain('projB');
    });

    it('长文件名被截断', () => {
        const longName = 'a'.repeat(50) + '.js';
        const tree = [{ name: longName, type: 'file', key: longName }];
        const { nodes } = fileTreeMethods._buildFileTreeGraphData.call(ctx({ tree }));
        expect(nodes[0].label.length).toBeLessThan(35);
    });
});

/* ────────────────────────────────────────────── */
/* _buildGraphFromStoryDeps ── deps JSON → 图谱   */
/* ────────────────────────────────────────────── */

describe('_buildGraphFromStoryDeps', () => {

    it('空的 deps 数据返回空节点和边', () => {
        const data = { graph: { nodes: [], edges: [] } };
        const { nodes, edges } = fileTreeMethods._buildGraphFromStoryDeps.call(ctx(), data);
        expect(nodes).toHaveLength(0);
        expect(edges).toHaveLength(0);
    });

    it('节点正确映射并分配 ID', () => {
        const data = { graph: { nodes: [{ id: 'n1', label: '节点1', type: 'source' }], edges: [] } };
        const { nodes, edges } = fileTreeMethods._buildGraphFromStoryDeps.call(ctx(), data);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].label).toBe('节点1');
        expect(nodes[0].kind).toBe('source');
        expect(edges).toHaveLength(0);
    });

    it('节点边正确关联', () => {
        const data = {
            graph: {
                nodes: [
                    { id: 'a', label: 'A', type: 'source' },
                    { id: 'b', label: 'B', type: 'test' },
                ],
                edges: [{ source: 'a', target: 'b', relation: 'depends_on' }],
            },
        };
        const { nodes, edges } = fileTreeMethods._buildGraphFromStoryDeps.call(ctx(), data);
        expect(nodes).toHaveLength(2);
        expect(edges).toHaveLength(1);
        expect(edges[0].relation).toBe('depends_on');
    });

    it('故事名存入 _ftStoryTitle', () => {
        const data = { story: { name: '登录模块' }, graph: { nodes: [], edges: [] } };
        const c = ctx();
        fileTreeMethods._buildGraphFromStoryDeps.call(c, data);
        expect(c._ftStoryTitle).toBe('登录模块');
    });

    it('节点颜色按 group 映射', () => {
        const data = {
            graph: {
                nodes: [
                    { id: 'v1', label: '视图', group: 'L1-View', type: 'source' },
                    { id: 'f1', label: '基础', group: 'L3-Foundation', type: 'source' },
                ],
                edges: [],
            },
        };
        const { nodes } = fileTreeMethods._buildGraphFromStoryDeps.call(ctx(), data);
        expect(nodes[0].color).toBe('#3B82F6');
        expect(nodes[1].color).toBe('#06B6D4');
    });

    it('兼容 Cytoscape data 嵌套格式', () => {
        const data = {
            graph: {
                nodes: [{ data: { id: 'x', label: 'X', type: 'story' } }],
                edges: [{ data: { source: 'x', target: 'y', relation: 'uses' } }],
            },
        };
        const { nodes, edges } = fileTreeMethods._buildGraphFromStoryDeps.call(ctx(), data);
        expect(nodes).toHaveLength(1);
        expect(edges).toHaveLength(0);
    });

    it('按 selectedTags 过滤节点', () => {
        const data = {
            graph: {
                nodes: [
                    { id: 'a', label: 'A', type: 'story', file: 'proj1/src/a.js' },
                    { id: 'b', label: 'B', type: 'story', file: 'proj2/src/b.js' },
                ],
                edges: [],
            },
        };
        const { nodes } = fileTreeMethods._buildGraphFromStoryDeps.call(
            ctx({ selectedTags: ['proj1'] }), data
        );
        expect(nodes).toHaveLength(1);
        expect(nodes[0].label).toBe('A');
    });
});

/* ────────────────────────────────────────────── */
/* _buildFtGraphOverview ── 文件树图谱统计        */
/* ────────────────────────────────────────────── */

describe('_buildFtGraphOverview', () => {

    it('空数据返回零统计', () => {
        const o = fileTreeMethods._buildFtGraphOverview.call(ctx(), [], []);
        expect(o.totalNodes).toBe(0);
        expect(o.totalEdges).toBe(0);
        expect(o.folderCount).toBe(0);
        expect(o.fileCount).toBe(0);
        expect(o.nodeList).toHaveLength(0);
    });

    it('正确统计文件夹和文件数量', () => {
        const nodes = [
            { id: 'n1', label: 'src', kind: 'folder', depth: 0, childCount: 3, color: '#F59E0B' },
            { id: 'n2', label: 'a.js', kind: 'file', ext: 'js', depth: 1, childCount: 0, color: '#F59E0B' },
            { id: 'n3', label: 'b.css', kind: 'file', ext: 'css', depth: 1, childCount: 0, color: '#06B6D4' },
        ];
        const o = fileTreeMethods._buildFtGraphOverview.call(ctx(), nodes, []);
        expect(o.folderCount).toBe(1);
        expect(o.fileCount).toBe(2);
        expect(o.totalNodes).toBe(3);
    });

    it('nodeList 按文件夹优先、关联度降序排列', () => {
        const nodes = [
            { id: 'a', label: 'file.js', kind: 'file', ext: 'js', depth: 1, childCount: 0, color: '#F59E0B' },
            { id: 'b', label: 'src', kind: 'folder', depth: 0, childCount: 2, color: '#F59E0B' },
        ];
        const edges = [{ source: 'b', target: 'a', relation: 'contains' }];
        const o = fileTreeMethods._buildFtGraphOverview.call(ctx(), nodes, edges);
        expect(o.nodeList[0].kind).toBe('folder');
    });

    it('topExtensions 正确统计扩展名', () => {
        const nodes = [
            { id: 'n1', label: 'a.js', kind: 'file', ext: 'js', depth: 0, childCount: 0, color: '#F59E0B' },
            { id: 'n2', label: 'b.js', kind: 'file', ext: 'js', depth: 0, childCount: 0, color: '#F59E0B' },
            { id: 'n3', label: 'c.css', kind: 'file', ext: 'css', depth: 0, childCount: 0, color: '#06B6D4' },
        ];
        const o = fileTreeMethods._buildFtGraphOverview.call(ctx(), nodes, []);
        const jsExt = o.topExtensions.find(e => e.name === 'js');
        expect(jsExt).toBeTruthy();
        expect(jsExt.count).toBe(2);
    });
});

/* ────────────────────────────────────────────── */
/* _buildFtGraphOverviewFromDeps ── deps 统计     */
/* ────────────────────────────────────────────── */

describe('_buildFtGraphOverviewFromDeps', () => {

    it('空数据返回零统计', () => {
        const o = fileTreeMethods._buildFtGraphOverviewFromDeps.call(ctx(), [], []);
        expect(o.totalNodes).toBe(0);
        expect(o.totalEdges).toBe(0);
        expect(o.scenarioCount).toBe(0);
        expect(o.storyCount).toBe(0);
    });

    it('story 和 scenario 正确计数', () => {
        const nodes = [
            { id: 'n1', label: 'S1', type: 'story', group: '', color: '#8B5CF6', description: '' },
            { id: 'n2', label: 'SC1', type: 'scenario', group: '', color: '#F59E0B', description: '' },
            { id: 'n3', label: 'T1', type: 'test', group: '', color: '#10B981', description: '' },
        ];
        const o = fileTreeMethods._buildFtGraphOverviewFromDeps.call(ctx(), nodes, []);
        expect(o.storyCount).toBe(1);
        expect(o.scenarioCount).toBe(1);
        expect(o.totalNodes).toBe(3);
    });

    it('nodeList 按关联度降序排列', () => {
        const nodes = [
            { id: 'a', label: 'A', type: 'source', group: '', color: '#3B82F6', description: '' },
            { id: 'b', label: 'B', type: 'source', group: '', color: '#3B82F6', description: '' },
            { id: 'c', label: 'C', type: 'source', group: '', color: '#3B82F6', description: '' },
        ];
        const edges = [
            { source: 'a', target: 'b', relation: 'uses' },
            { source: 'a', target: 'c', relation: 'uses' },
        ];
        const o = fileTreeMethods._buildFtGraphOverviewFromDeps.call(ctx(), nodes, edges);
        expect(o.nodeList).toHaveLength(3);
        expect(o.nodeList[0].degree).toBeGreaterThan(0);
    });

    it('topTypes 按类型正确统计', () => {
        const nodes = [
            { id: 'a', label: 'A', type: 'story', group: '', color: '#8B5CF6', description: '' },
            { id: 'b', label: 'B', type: 'story', group: '', color: '#8B5CF6', description: '' },
            { id: 'c', label: 'C', type: 'test', group: '', color: '#10B981', description: '' },
        ];
        const o = fileTreeMethods._buildFtGraphOverviewFromDeps.call(ctx(), nodes, []);
        const storyType = o.topTypes.find(t => t[0] === 'story');
        expect(storyType).toBeTruthy();
        expect(storyType[1]).toBe(2);
    });
});
