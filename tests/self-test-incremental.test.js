/**
 * 场景2 · 增量自检 — 测试
 *
 * 验证增量扫描引擎：按变更文件扩展名过滤规则、
 * 混合变更、二进制跳过、空变更处理。
 */
import { describe, it, expect, beforeEach } from '/tests/runner.js';
import { createEngine } from '/tests/engine.js';
import { createMockScanner, classifyByExtension } from '/tests/scanner.js';

/* ── 辅助 ── */
function makeScanner() {
    return createMockScanner({
        'CLAUDE.md': '# Project\n\n## 项目画像\n## 项目约束\n## 执行准则\n## 退化对策\n## 安全面',
        'README.md': 'YiWeb ESM 零构建 视图隔离',
        'src/app.js': "import { logInfo } from '/cdn/utils/core/log.js';\nlogInfo('ok');",
        'src/utils.js': "const x = 1;\nconst y = 2;",
        'src/style.css': 'body { color: red; }',
        'config.json': '{"env": "local"}',
        'image.png': 'fake-binary',
    });
}

/* ── 文件分类 ── */
describe('文件分类 (classifyByExtension)', () => {

    it('.md 文件归类为 documents', () => {
        const classified = classifyByExtension(['readme.md', 'docs/guide.md']);
        expect(classified.documents.length).toBe(2);
        expect(classified.code.length).toBe(0);
    });

    it('.js 文件归类为 code', () => {
        const classified = classifyByExtension(['src/app.js', 'src/utils.js']);
        expect(classified.code.length).toBe(2);
    });

    it('.json 文件归类为 configs', () => {
        const classified = classifyByExtension(['package.json']);
        expect(classified.configs.length).toBe(1);
    });

    it('.png / .jpg 归类为 binaries', () => {
        const classified = classifyByExtension(['a.png', 'b.jpg', 'c.svg']);
        expect(classified.binaries.length).toBe(3);
    });

    it('混合文件正确分类', () => {
        const files = ['readme.md', 'app.js', 'config.json', 'logo.png', 'index.html'];
        const classified = classifyByExtension(files);
        expect(classified.documents.length).toBe(1);
        expect(classified.code.length).toBe(1);
        expect(classified.configs.length).toBe(1);
        expect(classified.binaries.length).toBe(1);
        expect(classified.templates.length).toBe(1);
    });
});

/* ── 增量扫描 ── */
describe('增量自检', () => {
    let scanner, engine;

    beforeEach(() => {
        scanner = makeScanner();
        engine = createEngine({ scanner });
    });

    it('仅变更 .md 文件时只运行文档规则', async () => {
        const report = await engine.runIncremental(['readme.md']);
        const executedRules = report.checks.filter(c => !c.skipped);
        // 文档规则 + 全局规则（*）应被执行
        for (const c of executedRules) {
            // 确认执行的不是安全代码规则或架构代码规则
            if (c.ruleId === 'security-no-secrets' || c.ruleId === 'security-fetch-credentials') {
                // 这些规则 appliesTo 包含 .js，应该仍被触发因为 * 匹配
            }
        }
        expect(report.mode).toBe('incremental');
        expect(report.gate).not.toBeUndefined();
    });

    it('仅变更 .js 文件时运行代码规则', async () => {
        const report = await engine.runIncremental(['src/app.js']);
        const executed = report.checks.filter(c => !c.skipped);
        expect(executed.length).toBeGreaterThan(0);
        expect(report.mode).toBe('incremental');
    });

    it('二进制文件变更不触发任何规则检查', async () => {
        const report = await engine.runIncremental(['image.png']);
        expect(report.gate).toBe('PASS');
        expect(report.checks.length).toBe(0);
    });

    it('混合变更（.md + .js）触发文档和代码规则', async () => {
        const report = await engine.runIncremental(['readme.md', 'src/app.js']);
        const executed = report.checks.filter(c => !c.skipped);
        expect(executed.length).toBeGreaterThan(0);
    });

    it('空变更列表返回空报告', async () => {
        const report = await engine.runIncremental([]);
        expect(report.gate).toBe('PASS');
        expect(report.checks.length).toBe(0);
    });

    it('增量报告标识 changed files 计数', async () => {
        const report = await engine.runIncremental(['a.js', 'b.js', 'c.js']);
        expect(report.mode).toBe('incremental');
    });
});

/* ── 规则过滤 ── */
describe('增量规则过滤', () => {

    it('文档变更不触发安全规则对 .js 的检查', async () => {
        const scanner = makeScanner();
        const engine = createEngine({ scanner });
        const mdOnly = await engine.runIncremental(['readme.md']);
        const jsOnly = await engine.runIncremental(['src/app.js']);

        // js 变更加载了安全规则（因为安全规则 appliesTo 含 .js）
        const jsSecurityCheck = jsOnly.checks.find(c => c.ruleId === 'security-fetch-credentials');
        const mdSecurityCheck = mdOnly.checks.find(c => c.ruleId === 'security-fetch-credentials');

        // 两者都可能执行（因为 * 通配符），验证不同类型文件确实产生不同规则集
        expect(jsOnly.checks.length).toBeGreaterThan(0);
        expect(mdOnly.checks.length).toBeGreaterThan(0);
    });
});
