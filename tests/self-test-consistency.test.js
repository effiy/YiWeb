/**
 * 场景3 · 一致性校验 — 测试
 *
 * 验证文档声称 vs 代码实际的双向对比逻辑。
 */
import { createMockScanner } from '/tests/scanner.js';

/**
 * 一致性校验逻辑（内联，与规则模块分离以简化测试）
 */
function checkConsistency(docEntries, codeDirs) {
    const docOnly = [];
    const codeOnly = [];
    const matched = [];

    const docSet = new Set(docEntries.map(d => d.replace(/\/$/, '')));
    const codeSet = new Set(codeDirs.map(d => d.replace(/\/$/, '')));

    for (const entry of docSet) {
        if (codeSet.has(entry)) {
            matched.push(entry);
        } else {
            docOnly.push(entry);
        }
    }

    for (const entry of codeSet) {
        if (!docSet.has(entry)) {
            codeOnly.push(entry);
        }
    }

    return {
        docOnly,
        codeOnly,
        matched,
        differences: docOnly.length + codeOnly.length,
    };
}

/* ── 一致性校验 ── */
describe('一致性校验', () => {

    it('文档与代码完全一致时差异为 0', () => {
        const docEntries = ['src/views/aicr', 'src/views/story', 'src/core/services'];
        const codeDirs = ['src/views/aicr', 'src/views/story', 'src/core/services'];
        const result = checkConsistency(docEntries, codeDirs);

        expect(result.docOnly.length).toBe(0);
        expect(result.codeOnly.length).toBe(0);
        expect(result.matched.length).toBe(3);
        expect(result.differences).toBe(0);
    });

    it('文档有但代码无 → docOnly', () => {
        const docEntries = ['src/views/aicr', 'src/views/foo'];
        const codeDirs = ['src/views/aicr'];
        const result = checkConsistency(docEntries, codeDirs);

        expect(result.docOnly).toContain('src/views/foo');
        expect(result.codeOnly.length).toBe(0);
        expect(result.differences).toBe(1);
    });

    it('代码有但文档无 → codeOnly', () => {
        const docEntries = ['src/views/aicr'];
        const codeDirs = ['src/views/aicr', 'src/views/bar'];
        const result = checkConsistency(docEntries, codeDirs);

        expect(result.codeOnly).toContain('src/views/bar');
        expect(result.docOnly.length).toBe(0);
        expect(result.differences).toBe(1);
    });

    it('双向差异同时存在', () => {
        const docEntries = ['src/views/aicr', 'src/views/old-deprecated'];
        const codeDirs = ['src/views/aicr', 'src/views/new-feature'];
        const result = checkConsistency(docEntries, codeDirs);

        expect(result.docOnly).toContain('src/views/old-deprecated');
        expect(result.codeOnly).toContain('src/views/new-feature');
        expect(result.matched).toContain('src/views/aicr');
        expect(result.differences).toBe(2);
    });

    it('空文档 → 全部代码为 codeOnly', () => {
        const result = checkConsistency([], ['src/views/aicr', 'src/views/story']);
        expect(result.docOnly.length).toBe(0);
        expect(result.codeOnly.length).toBe(2);
    });

    it('空代码 → 全部文档为 docOnly', () => {
        const result = checkConsistency(['src/views/aicr', 'src/views/story'], []);
        expect(result.codeOnly.length).toBe(0);
        expect(result.docOnly.length).toBe(2);
    });

    it('带尾斜杠的路径被归一化', () => {
        const docEntries = ['src/views/aicr/'];
        const codeDirs = ['src/views/aicr'];
        const result = checkConsistency(docEntries, codeDirs);
        expect(result.differences).toBe(0);
        expect(result.matched.length).toBe(1);
    });
});

/* ── cross-ref 校验 ── */
describe('跨引用校验 (crossRefValid)', () => {
    let scanner;

    beforeEach(() => {
        scanner = createMockScanner({
            'README.md': 'See [docs](./docs/index.md) and [CLAUDE.md](./CLAUDE.md)',
            'CLAUDE.md': '# Project',
            'docs/index.md': '# Docs',
        });
    });

    it('存在的引用文件应通过', async () => {
        // scanner.fileExists 已由 mock scanner 实现
        expect(await scanner.fileExists('CLAUDE.md')).toBe(true);
        expect(await scanner.fileExists('docs/index.md')).toBe(true);
    });

    it('不存在的引用文件应失败', async () => {
        expect(await scanner.fileExists('missing.md')).toBe(false);
    });
});

/* ── 差异清单格式 ── */
describe('一致性校验结果格式', () => {

    it('结果对象包含必需字段', () => {
        const result = checkConsistency(['a'], ['b']);
        expect(result.docOnly).toBeTruthy();
        expect(result.codeOnly).toBeTruthy();
        expect(result.matched).toBeTruthy();
        expect(result.differences).toBeTypeOf('number');
    });

    it('differences = docOnly + codeOnly', () => {
        const result = checkConsistency(['a', 'b'], ['b', 'c']);
        expect(result.differences).toBe(result.docOnly.length + result.codeOnly.length);
    });
});
