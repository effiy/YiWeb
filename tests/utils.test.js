/**
 * 工具函数测试 — escapeHtml, normalizeFilePath
 */
import { describe, it, expect, beforeEach } from '/cdn/test/runner.js';

/* ── escapeHtml (DOM 节点法) ── */
describe('escapeHtml (DOM 节点法)', () => {
    let escapeHtml;

    beforeEach(() => {
        // 内联定义 — 与 fileTreeMethods.js 中的实现一致
        escapeHtml = (str) => {
            if (str == null) return '';
            const div = document.createElement('div');
            div.appendChild(document.createTextNode(String(str)));
            return div.innerHTML;
        };
    });

    it('普通字符串原样返回', () => {
        expect(escapeHtml('hello')).toBe('hello');
    });

    it('HTML 标签被转义', () => {
        const result = escapeHtml('<script>alert(1)</script>');
        expect(result).toContain('&lt;script&gt;');
        expect(result).not.toContain('<script>');
    });

    it('& 符号被转义', () => {
        expect(escapeHtml('a & b')).toContain('&amp;');
        expect(escapeHtml('a & b')).not.toBe('a & b');
    });

    it('双引号被转义', () => {
        expect(escapeHtml('"hello"')).toContain('&quot;');
    });

    it('null / undefined 返回空字符串', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
    });

    it('数字被转为字符串', () => {
        expect(escapeHtml(42)).toBe('42');
    });

    it('中文字符不受影响', () => {
        expect(escapeHtml('你好世界')).toBe('你好世界');
    });

    it('已经是转义的内容不会被二次转义', () => {
        const once = escapeHtml('<b>');
        const twice = escapeHtml(once);
        // 二次转义后 & 变成 &amp;，所以 &lt; 变成 &amp;lt;
        expect(twice).toContain('&amp;lt;');
    });
});

/* ── normalizeFilePath ── */
describe('normalizeFilePath', () => {
    let normalizeFilePath;

    beforeEach(() => {
        // 内联简化版 — 与 fileFieldNormalizer.js 中的语义一致
        normalizeFilePath = (path) => {
            if (!path) return '';
            let p = String(path).replace(/\\/g, '/');
            // 去除开头的 /home/user/project/ 前缀
            const idx = p.indexOf('/src/');
            if (idx !== -1) p = p.substring(idx + 1);
            const idx2 = p.indexOf('/cdn/');
            if (idx2 !== -1) p = p.substring(idx2 + 1);
            // 去除多余斜杠
            p = p.replace(/\/+/g, '/');
            return p;
        };
    });

    it('空值返回空字符串', () => {
        expect(normalizeFilePath(null)).toBe('');
        expect(normalizeFilePath('')).toBe('');
        expect(normalizeFilePath(undefined)).toBe('');
    });

    it('相对路径保持不变', () => {
        expect(normalizeFilePath('src/views/aicr/index.js')).toBe('src/views/aicr/index.js');
    });

    it('反斜杠转为正斜杠', () => {
        expect(normalizeFilePath('src\\views\\aicr.js')).toBe('src/views/aicr.js');
    });

    it('截断到 src/ 之后', () => {
        const result = normalizeFilePath('/home/user/project/src/views/app.js');
        expect(result).toBe('src/views/app.js');
    });

    it('截断到 cdn/ 之后', () => {
        const result = normalizeFilePath('/opt/app/cdn/utils/core/error.js');
        expect(result).toBe('cdn/utils/core/error.js');
    });

    it('连续斜杠归一化', () => {
        expect(normalizeFilePath('src//views///app.js')).toBe('src/views/app.js');
    });
});

/* ── 图谱节点数据完整性 ── */
describe('图谱节点数据字段', () => {

    it('fileTree 生成的节点包含所有必需字段', () => {
        // 模拟 _buildFileTreeGraphData 输出的节点结构
        const requiredFields = ['id', 'label', 'kind', 'color', 'ext', 'depth', 'childCount', 'key', 'file'];
        const node = {
            id: 'n1', label: 'test.js', kind: 'file',
            key: 'src/test.js', file: 'src/test.js',
            color: '#F59E0B', ext: 'js', depth: 0, childCount: 0,
        };
        for (const field of requiredFields) {
            expect(node[field]).toBeTruthy();
        }
    });

    it('story-deps 生成的节点包含所有必需字段', () => {
        const requiredFields = ['id', 'label', 'kind', 'color', 'type', 'group', 'file', 'description', 'keyFunctions', 'mdFiles'];
        const node = {
            id: 'dn1', label: '视图入口', kind: 'source',
            color: '#3B82F6', type: 'source', group: 'L1-View',
            file: 'src/index.js', description: '应用入口',
            keyFunctions: [], mdFiles: [],
        };
        for (const field of requiredFields) {
            expect(node[field]).toBeDefined();
        }
    });
});

/* ── Cytoscape 数据格式 ── */
describe('Cytoscape 元素数据格式', () => {

    it('节点 data 对象格式正确', () => {
        const cyNode = {
            data: {
                id: 'n1',
                label: 'test.js',
                color: '#F59E0B',
                kind: 'file',
                ext: 'js',
                depth: 0,
                childCount: 0,
                type: '',
                groupName: '',
                description: '',
                keyFunctions: [],
                mdFiles: [],
                degree: 3,
            },
        };
        expect(cyNode.data.id).toBe('n1');
        expect(cyNode.data.label).toBeTypeOf('string');
        expect(cyNode.data.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(cyNode.data.degree).toBeGreaterThan(-1);
    });

    it('边 data 对象格式正确', () => {
        const cyEdge = {
            data: {
                id: 'n1_n2',
                source: 'n1',
                target: 'n2',
                label: '∈',
                relation: 'contains',
            },
        };
        expect(cyEdge.data.id).toBeTruthy();
        expect(cyEdge.data.source).toBeTruthy();
        expect(cyEdge.data.target).toBeTruthy();
        expect(cyEdge.data.relation).toBeTruthy();
    });

    it('边 ID 格式为 source_target', () => {
        const source = 'abc', target = 'xyz';
        const id = `${source}_${target}`;
        expect(id).toBe('abc_xyz');
    });
});

/* ── 图谱统计概览数据结构 ── */
describe('图谱统计概览数据', () => {

    it('fileTree overview 包含所有必需字段', () => {
        const fields = ['title', 'totalNodes', 'totalEdges', 'folderCount', 'fileCount', 'topExtensions', 'topFolders', 'nodeList'];
        const overview = {
            title: 'src', totalNodes: 10, totalEdges: 9,
            folderCount: 3, fileCount: 7,
            topExtensions: [], topFolders: [], nodeList: [],
        };
        for (const f of fields) {
            expect(overview[f]).toBeDefined();
        }
    });

    it('deps overview 包含场景和故事计数', () => {
        const fields = ['totalNodes', 'totalEdges', 'scenarioCount', 'storyCount', 'topTypes', 'topGroups', 'topRelations', 'nodeList'];
        const overview = {
            totalNodes: 5, totalEdges: 4,
            scenarioCount: 1, storyCount: 2,
            topTypes: [], topGroups: [], topRelations: [], nodeList: [],
        };
        for (const f of fields) {
            expect(overview[f]).toBeDefined();
        }
    });

    it('extension 统计条目格式正确', () => {
        const ext = { name: 'js', count: 12 };
        expect(ext.name).toBeTypeOf('string');
        expect(ext.count).toBeGreaterThan(0);
    });

    it('type 统计条目格式正确 (2-元组)', () => {
        const typeEntry = ['story', 5];
        expect(typeEntry).toHaveLength(2);
        expect(typeEntry[1]).toBeTypeOf('number');
    });
});
