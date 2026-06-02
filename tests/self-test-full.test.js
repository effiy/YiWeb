/**
 * 场景1 · 全量自检 — 测试
 *
 * 验证全量扫描引擎：15 规则加载、合规/违规项目检测、
 * 并行/顺序/降级模式、报告格式、P0 阻断逻辑。
 */
import { getAllRules, getRulesByCategory, getRulesByPriority, getRuleById, getRuleCount } from '/tests/ruleRegistry.js';
import { createEngine } from '/tests/engine.js';
import { createMockScanner } from '/tests/scanner.js';
import { toJSON, toSummary, createEmptyReport } from '/tests/reporter.js';

/* ── 辅助：创建合规项目 mock ── */
function mockCompliantProject() {
    return createMockScanner({
        'CLAUDE.md': `# YiWeb\n\n## 项目画像\n\n零构建 ESM 项目\n\n## 项目约束\n\n浏览器原生 ESM\n\n## 执行准则\n\n所有修改走 feat 分支\n\n## 退化对策\n\n无构建链\n\n## 安全面\n\nfetch credentials: 'omit'`,
        'README.md': 'YiWeb 是一个零构建 ESM 项目，使用 createBaseView 视图隔离架构，vueRef 响应式状态管理，通过 CDN 加载外部组件。',
        // 使用 'local': / 'prod': 引号键名以匹配 config-env 规则的正则
        'src/core/config.js': "const ENDPOINTS = {\n  'local': { DATA_URL: 'http://localhost:9000' },\n  'prod': { DATA_URL: 'https://data.effiy.cn' }\n};\nlet ENV = 'local';",
        'src/app.js': "import { logInfo, logError } from '/cdn/utils/core/log.js';\nimport { getAuthHeaders } from '/src/core/services/helper/authUtils.js';\n\nasync function main() {\n  logInfo('Starting...');\n  const res = await fetch('/api/data', {\n    headers: getAuthHeaders(),\n    credentials: 'omit',\n  });\n}",
        // 统一使用 v3.0.0 版本号（version-consistency + stale-ref）
        'docs/故事任务面板/自主测试/故事任务.md': '# 自主测试 · 故事任务\n\nv3.0.0 | 2026-05-31\n\n[场景1](./场景1-全量自检.md)\n\n## §1 Story\n\n> **变更记录**\n> | 日期 | 变更 |\n> |------|------|',
        'docs/故事任务面板/自主测试/场景1-全量自检.md': '# 场景1 · 全量自检\n\n> v3.0.0 | 2026-05-29\n\n[← 故事任务](./故事任务.md)\n\n## §1 使用场景\n\n## §7 关联源码\n\n> **变更记录**\n> | 日期 | 变更 |\n> |------|------|',
        'docs/故事任务面板/自主测试/场景2-增量自检.md': '# 场景2 · 增量自检\n\n> v3.0.0 | 2026-05-29\n\n[← 故事任务](./故事任务.md)\n\n## §1 使用场景\n\n> **变更记录**\n> | 日期 | 变更 |\n> |------|------|',
        'docs/故事任务面板/自主测试/场景3-一致性校验.md': '# 场景3 · 一致性校验\n\n> v3.0.0 | 2026-05-29\n\n[← 故事任务](./故事任务.md)\n\n## §1 使用场景\n\n> **变更记录**\n> | 日期 | 变更 |\n> |------|------|',
        'docs/故事任务面板/自主测试/场景4-安全回归.md': '# 场景4 · 安全回归\n\n> v3.0.0 | 2026-05-29\n\n[← 故事任务](./故事任务.md)\n\n## §1 使用场景\n\n> **变更记录**\n> | 日期 | 变更 |\n> |------|------|',
        'docs/故事任务面板/自主测试/知识图谱.json': '{"version":"3.0.0","graph":{"nodes":[],"edges":[]}}',
        // 补充其余 6 个故事目录（story-structure 规则会检查全部 7 个目录）
        'docs/故事任务面板/系统架构/故事任务.md': '# 系统架构 · 故事任务\n\nv3.0.0 | 2026-05-31\n\n[场景1](./场景1-模块定位.md)\n\n> **变更记录**\n> | 日期 | 变更 |\n> |------|------|',
        'docs/故事任务面板/系统架构/场景1-模块定位.md': '# 场景1 · 模块定位\n\n> v3.0.0 | 2026-05-29\n\n[← 故事任务](./故事任务.md)\n\n## §1 使用场景\n\n> **变更记录**\n> | 日期 | 变更 |\n> |------|------|',
        'docs/故事任务面板/系统架构/知识图谱.json': '{"version":"3.0.0","graph":{"nodes":[],"edges":[]}}',
        'docs/故事任务面板/分层结构/故事任务.md': '# 分层结构 · 故事任务\n\nv3.0.0 | 2026-05-31\n\n[场景1](./场景1-新人上手-分层认知.md)\n\n> **变更记录**\n> | 日期 | 变更 |\n> |------|------|',
        'docs/故事任务面板/分层结构/场景1-新人上手-分层认知.md': '# 场景1 · 新人上手\n\n> v3.0.0 | 2026-05-29\n\n[← 故事任务](./故事任务.md)\n\n## §1 使用场景\n\n> **变更记录**\n> | 日期 | 变更 |\n> |------|------|',
        'docs/故事任务面板/分层结构/知识图谱.json': '{"version":"3.0.0","graph":{"nodes":[],"edges":[]}}',
        'docs/故事任务面板/模块地图/故事任务.md': '# 模块地图 · 故事任务\n\nv3.0.0 | 2026-05-31\n\n[场景1](./场景1-查下游.md)\n\n> **变更记录**\n> | 日期 | 变更 |\n> |------|------|',
        'docs/故事任务面板/模块地图/场景1-查下游.md': '# 场景1 · 查下游\n\n> v3.0.0 | 2026-05-29\n\n[← 故事任务](./故事任务.md)\n\n## §1 使用场景\n\n> **变更记录**\n> | 日期 | 变更 |\n> |------|------|',
        'docs/故事任务面板/模块地图/知识图谱.json': '{"version":"3.0.0","graph":{"nodes":[],"edges":[]}}',
        'docs/故事任务面板/数据流/故事任务.md': '# 数据流 · 故事任务\n\nv3.0.0 | 2026-05-31\n\n[场景1](./场景1-命令流排查.md)\n\n> **变更记录**\n> | 日期 | 变更 |\n> |------|------|',
        'docs/故事任务面板/数据流/场景1-命令流排查.md': '# 场景1 · 命令流排查\n\n> v3.0.0 | 2026-05-29\n\n[← 故事任务](./故事任务.md)\n\n## §1 使用场景\n\n> **变更记录**\n> | 日期 | 变更 |\n> |------|------|',
        'docs/故事任务面板/数据流/知识图谱.json': '{"version":"3.0.0","graph":{"nodes":[],"edges":[]}}',
        'docs/故事任务面板/安全边界/故事任务.md': '# 安全边界 · 故事任务\n\nv3.0.0 | 2026-05-31\n\n[场景1](./场景1-安全审计.md)\n\n> **变更记录**\n> | 日期 | 变更 |\n> |------|------|',
        'docs/故事任务面板/安全边界/场景1-安全审计.md': '# 场景1 · 安全审计\n\n> v3.0.0 | 2026-05-29\n\n[← 故事任务](./故事任务.md)\n\n## §1 使用场景\n\n> **变更记录**\n> | 日期 | 变更 |\n> |------|------|',
        'docs/故事任务面板/安全边界/知识图谱.json': '{"version":"3.0.0","graph":{"nodes":[],"edges":[]}}',
        'docs/故事任务面板/依赖矩阵/故事任务.md': '# 依赖矩阵 · 故事任务\n\nv3.0.0 | 2026-05-31\n\n[场景1](./场景1-影响评估.md)\n\n> **变更记录**\n> | 日期 | 变更 |\n> |------|------|',
        'docs/故事任务面板/依赖矩阵/场景1-影响评估.md': '# 场景1 · 影响评估\n\n> v3.0.0 | 2026-05-29\n\n[← 故事任务](./故事任务.md)\n\n## §1 使用场景\n\n> **变更记录**\n> | 日期 | 变更 |\n> |------|------|',
        'docs/故事任务面板/依赖矩阵/知识图谱.json': '{"version":"3.0.0","graph":{"nodes":[],"edges":[]}}',
    });
}

/* ── 辅助：创建违规项目 mock ── */
function mockNonCompliantProject() {
    return createMockScanner({
        'CLAUDE.md': '# Just a readme\n\nNo proper sections here.',
        'src/app.js': "const password = 'admin123';\nconsole.log('debug info');\nfetch('/api/data');",
    });
}

/* ── 规则加载 ── */
describe('规则注册表', () => {

    it('应加载正好 15 条规则', () => {
        expect(getRuleCount()).toBe(15);
    });

    it('每条规则包含必需字段', () => {
        for (const r of getAllRules()) {
            expect(r.id).toBeTruthy();
            expect(r.category).toBeTruthy();
            expect(r.priority).toBeTruthy();
            expect(r.appliesTo).toBeTruthy();
            expect(typeof r.check).toBe('function');
        }
    });

    it('按类别过滤正确', () => {
        const docRules = getRulesByCategory('document');
        expect(docRules.length).toBeGreaterThan(0);
        // 所有文档规则都是 P0 或 P1
        for (const r of docRules) {
            expect(['P0', 'P1']).toContain(r.priority);
        }
    });

    it('按优先级过滤正确', () => {
        const p0Rules = getRulesByPriority('P0');
        expect(p0Rules.length).toBeGreaterThan(0);
        for (const r of p0Rules) {
            expect(r.priority).toBe('P0');
        }
    });

    it('按 ID 查找规则', () => {
        const r = getRuleById('claude-completeness');
        expect(r).toBeTruthy();
        expect(r.category).toBe('document');
    });
});

/* ── 全量扫描 — 合规项目 ── */
describe('全量自检 — 合规项目', () => {
    let scanner, engine, report;

    beforeEach(async () => {
        scanner = mockCompliantProject();
        engine = createEngine({ scanner });
        report = await engine.runFull();
    });

    it('报告 gate 应为 PASS', () => {
        expect(report.gate).toBe('PASS');
    });

    it('所有检查应通过', () => {
        const nonSkipped = report.checks.filter(c => !c.skipped);
        const failed = nonSkipped.filter(c => !c.passed);
        expect(failed.length).toBe(0);
    });

    it('报告包含 summary 和 checks', () => {
        expect(report.summary).toBeTruthy();
        expect(report.checks).toBeTruthy();
        expect(report.checks.length).toBeGreaterThan(0);
    });

    it('summary.total 应为 15', () => {
        expect(report.summary.total).toBe(15);
    });

    it('报告可序列化为 JSON', () => {
        const json = toJSON(report);
        expect(json).toBeTruthy();
        expect(() => JSON.parse(json)).not.toThrow();
    });
});

/* ── 全量扫描 — 违规项目 ── */
describe('全量自检 — 违规项目', () => {
    let scanner, engine, report;

    beforeEach(async () => {
        scanner = mockNonCompliantProject();
        engine = createEngine({ scanner });
        report = await engine.runFull();
    });

    it('应检出 claude-completeness 失败', () => {
        const check = report.checks.find(c => c.ruleId === 'claude-completeness');
        expect(check).toBeTruthy();
        expect(check.passed).toBe(false);
    });

    it('应检出 security-no-secrets 失败', () => {
        const check = report.checks.find(c => c.ruleId === 'security-no-secrets');
        expect(check).toBeTruthy();
        expect(check.passed).toBe(false);
    });

    it('gate 应为 FAIL（有 P0 失败）', () => {
        expect(report.gate).toBe('FAIL');
    });

    it('report summary 应反映失败数', () => {
        expect(report.summary.failed).toBeGreaterThan(0);
    });
});

/* ── 执行模式 ── */
describe('执行模式', () => {
    let scanner;

    beforeEach(() => {
        scanner = mockCompliantProject();
    });

    it('顺序模式与全量模式产生相同 gate', async () => {
        const engine = createEngine({ scanner });
        const fullReport = await engine.runFull();
        const seqReport = await engine.runSequential();
        expect(fullReport.gate).toBe(seqReport.gate);
    });

    it('降级模式: 无工具时全部跳过', async () => {
        const engine = createEngine({ scanner });
        const report = await engine.runDegraded([]);
        expect(report.gate).toBe('WARN');
    });

    it('降级模式: 有工具时正常执行', async () => {
        const engine = createEngine({ scanner });
        const report = await engine.runDegraded(['all']);
        expect(report.gate).toBe('PASS');
    });
});

/* ── 报告格式 ── */
describe('报告格式', () => {
    it('createEmptyReport 生成正确结构', () => {
        const report = createEmptyReport();
        expect(report.summary).toBeTruthy();
        expect(report.summary.total).toBe(0);
        expect(report.gate).toBe('PASS');
        expect(report.mode).toBe('full');
    });

    it('toSummary 返回单行字符串', () => {
        const report = createEmptyReport();
        report.gate = 'PASS';
        report.summary.passed = 10;
        report.summary.total = 10;
        const summary = toSummary(report);
        expect(summary).toContain('10/10');
    });

    it('toJSON 可解析回对象', () => {
        const report = createEmptyReport();
        report.checks = [{
            ruleId: 'test-rule',
            passed: true,
            priority: 'P0',
            blocking: true,
            duration: 12.3,
            details: 'all good',
            file: 'test.js',
            fixHint: '',
        }];
        const json = toJSON(report);
        const parsed = JSON.parse(json);
        expect(parsed.checks[0].ruleId).toBe('test-rule');
    });
});
