/**
 * 场景4 · 安全回归 — 测试
 *
 * 验证 5 项安全检查：硬编码密钥、fetch 凭证模式、
 * 裸日志调用、P0 阻断 / P1 告警逻辑。
 */
import { createEngine } from '/tests/engine.js';
import { createMockScanner } from '/tests/scanner.js';
import { getRuleById } from '/tests/ruleRegistry.js';

/* ── 辅助 ── */
function makeScanner(files) {
    return createMockScanner(files);
}

/* ── security-no-secrets ── */
describe('security-no-secrets (硬编码密钥检测)', () => {
    const ruleId = 'security-no-secrets';

    it('检测 password = "..." 模式', async () => {
        const scanner = makeScanner({
            'src/app.js': 'const password = "admin123";\nconst x = 1;',
        });
        const rule = getRuleById(ruleId);
        const result = await rule.check(scanner);
        expect(result.passed).toBe(false);
    });

    it('检测 token: "..." 模式', async () => {
        const scanner = makeScanner({
            'src/config.js': 'const config = { token: "sk-abc123xyz" };',
        });
        const rule = getRuleById(ruleId);
        const result = await rule.check(scanner);
        expect(result.passed).toBe(false);
    });

    it('检测 apiKey = "..." 模式', async () => {
        const scanner = makeScanner({
            'src/api.js': 'const apiKey = "secret-key-here";',
        });
        const rule = getRuleById(ruleId);
        const result = await rule.check(scanner);
        expect(result.passed).toBe(false);
    });

    it('干净的代码通过检查', async () => {
        const scanner = makeScanner({
            'src/clean.js': 'import { getAuthHeaders } from "./auth.js";\nconst token = getAuthHeaders()["X-Token"];',
        });
        const rule = getRuleById(ruleId);
        const result = await rule.check(scanner);
        expect(result.passed).toBe(true);
    });

    it('X-Token 引用不触发误报', async () => {
        const scanner = makeScanner({
            'src/auth.js': "headers['X-Token'] = token;\nfetch(url, { headers: { 'X-Token': value } });",
        });
        const rule = getRuleById(ruleId);
        const result = await rule.check(scanner);
        expect(result.passed).toBe(true);
    });

    it('process.env 引用不触发误报', async () => {
        const scanner = makeScanner({
            'src/env.js': 'const token = process.env.API_TOKEN;',
        });
        const rule = getRuleById(ruleId);
        const result = await rule.check(scanner);
        expect(result.passed).toBe(true);
    });
});

/* ── security-fetch-credentials ── */
describe('security-fetch-credentials (Fetch 凭证模式)', () => {
    const ruleId = 'security-fetch-credentials';

    it('缺少 credentials: omit 时失败', async () => {
        const scanner = makeScanner({
            'src/api.js': "fetch('/api/data', { headers: {} });",
        });
        const rule = getRuleById(ruleId);
        const result = await rule.check(scanner);
        expect(result.passed).toBe(false);
    });

    it('无第二个参数时失败', async () => {
        const scanner = makeScanner({
            'src/simple.js': "fetch('/api/ping');",
        });
        const rule = getRuleById(ruleId);
        const result = await rule.check(scanner);
        expect(result.passed).toBe(false);
    });

    it('包含 credentials: omit 时通过', async () => {
        const scanner = makeScanner({
            'src/secure.js': "fetch('/api/data', { credentials: 'omit', headers: { 'X-Token': 'x' } });",
        });
        const rule = getRuleById(ruleId);
        const result = await rule.check(scanner);
        expect(result.passed).toBe(true);
    });

    it('测试文件被跳过', async () => {
        const scanner = makeScanner({
            'tests/some.test.js': "fetch('/api/data');",
        });
        const rule = getRuleById(ruleId);
        const result = await rule.check(scanner);
        expect(result.passed).toBe(true);
    });
});

/* ── security-no-raw-log ── */
describe('security-no-raw-log (裸日志检测)', () => {
    const ruleId = 'security-no-raw-log';

    it('console.log 应失败', async () => {
        const scanner = makeScanner({
            'src/debug.js': "console.log('debug info');",
        });
        const rule = getRuleById(ruleId);
        const result = await rule.check(scanner);
        expect(result.passed).toBe(false);
    });

    it('console.info / console.warn / console.debug 应失败', async () => {
        const scanner = makeScanner({
            'src/debug.js': "console.info('a'); console.warn('b'); console.debug('c');",
        });
        const rule = getRuleById(ruleId);
        const result = await rule.check(scanner);
        expect(result.passed).toBe(false);
    });

    it('logInfo/logWarn/logError 正常通过', async () => {
        const scanner = makeScanner({
            'src/good.js': "import { logInfo, logWarn, logError } from '/cdn/utils/core/log.js';\nlogInfo('ok');\nlogWarn('warning');\nlogError('err');",
        });
        const rule = getRuleById(ruleId);
        const result = await rule.check(scanner);
        expect(result.passed).toBe(true);
    });

    it('log.js 本身被跳过', async () => {
        const scanner = makeScanner({
            'cdn/utils/core/log.js': "console.log('internal log');",
        });
        const rule = getRuleById(ruleId);
        const result = await rule.check(scanner);
        expect(result.passed).toBe(true);
    });

    it('测试文件被跳过', async () => {
        const scanner = makeScanner({
            'tests/test.js': "console.log('test output');",
        });
        const rule = getRuleById(ruleId);
        const result = await rule.check(scanner);
        expect(result.passed).toBe(true);
    });
});

/* ── 安全回归规则优先级 ── */
describe('安全回归 — 优先级与阻断', () => {

    it('security-no-secrets 为 P0 阻断', () => {
        const rule = getRuleById('security-no-secrets');
        expect(rule.priority).toBe('P0');
        expect(rule.blocking).toBe(true);
    });

    it('security-fetch-credentials 为 P0 阻断', () => {
        const rule = getRuleById('security-fetch-credentials');
        expect(rule.priority).toBe('P0');
        expect(rule.blocking).toBe(true);
    });

    it('security-no-raw-log 为 P1 非阻断', () => {
        const rule = getRuleById('security-no-raw-log');
        expect(rule.priority).toBe('P1');
        expect(rule.blocking).toBe(false);
    });
});

/* ── 综合安全场景 ── */
describe('安全回归 — 综合场景', () => {

    it('合规代码全部通过', async () => {
        const scanner = makeScanner({
            'CLAUDE.md': '# YiWeb\n\n## 项目画像\n## 项目约束\n## 执行准则\n## 退化对策\n## 安全面',
            'src/secure.js': [
                "import { logInfo, logError } from '/cdn/utils/core/log.js';",
                "import { getAuthHeaders } from '/src/core/services/helper/authUtils.js';",
                '',
                'async function init() {',
                "  logInfo('App started');",
                "  const res = await fetch('/api/data', {",
                "    headers: getAuthHeaders(),",
                "    credentials: 'omit',",
                '  });',
                '  return res.json();',
                '}',
            ].join('\n'),
        });

        const engine = createEngine({ scanner });
        const report = await engine.runFull();
        const securityChecks = report.checks.filter(c =>
            ['security-no-secrets', 'security-fetch-credentials', 'security-no-raw-log'].includes(c.ruleId)
        );

        for (const c of securityChecks) {
            expect(c.passed).toBe(true);
        }
    });

    it('违规代码检出至少 2 项安全问题', async () => {
        const scanner = makeScanner({
            'CLAUDE.md': '# YiWeb\n\n## 项目画像\n## 项目约束\n## 执行准则\n## 退化对策\n## 安全面',
            'src/vuln.js': "const password = 'hardcoded123';\nconsole.log('bare log');\nfetch('/api/data');",
        });

        const engine = createEngine({ scanner });
        const report = await engine.runFull();
        const failedSecurity = report.checks.filter(c =>
            ['security-no-secrets', 'security-fetch-credentials', 'security-no-raw-log'].includes(c.ruleId) && !c.passed
        );

        expect(failedSecurity.length).toBeGreaterThan(1);
    });

    it('P0 安全问题导致 gate FAIL', async () => {
        const scanner = makeScanner({
            'CLAUDE.md': '# YiWeb\n\n## 项目画像\n## 项目约束\n## 执行准则\n## 退化对策\n## 安全面',
            // Token 硬编码模式要求 ≥8 字符，使用足够长的字符串触发检测
            'src/vuln.js': "const apiKey = 'abc1234567890';\nfetch('/api/data');",
        });

        const engine = createEngine({ scanner });
        const report = await engine.runFull();

        // 至少 security-no-secrets (P0) 会失败
        const secretsCheck = report.checks.find(c => c.ruleId === 'security-no-secrets');
        expect(secretsCheck.passed).toBe(false);

        // P0 失败 → gate FAIL
        expect(report.gate).toBe('FAIL');
    });
});
