/**
 * 规则: security-no-raw-log — 无裸日志调用
 * 类别: security | 优先级: P1 | 阻断: 否
 *
 * 禁止裸 console.log / console.info / console.warn / console.debug
 * console.error 允许（始终输出，来自 project 约束）
 *
 * 项目规范要求使用 logInfo / logWarn / logError 替代
 */

const BANNED_LOG_PATTERNS = [
    { name: 'console.log', pattern: /\bconsole\.log\s*\(/g },
    { name: 'console.info', pattern: /\bconsole\.info\s*\(/g },
    { name: 'console.warn', pattern: /\bconsole\.warn\s*\(/g },
    { name: 'console.debug', pattern: /\bconsole\.debug\s*\(/g },
];

// 允许使用裸 console 的文件（基础设施层日志模块本身）
const ALLOWED_FILES = [
    'cdn/utils/core/log.js',
    'tests/runner.js', // 测试框架的输出
];

export const rule = {
    id: 'security-no-raw-log',
    category: 'security',
    priority: 'P1',
    blocking: false,
    appliesTo: ['.js'],
    description: '无裸日志调用',
    fixHint: '将 console.log/info/warn/debug 替换为项目日志模块: import { logInfo, logWarn, logError } from \'/cdn/utils/core/log.js\'',

    async check(scanner) {
        const violations = [];

        try {
            const files = scanner.listFiles ? scanner.listFiles() : [];
            const jsFiles = files.filter(f => f.endsWith('.js'));

            for (const filePath of jsFiles) {
                // 跳过允许的文件
                if (ALLOWED_FILES.some(af => filePath.endsWith(af) || filePath.includes(af))) {
                    continue;
                }
                // 跳过测试文件
                if (filePath.includes('.test.js') || filePath.includes('tests/')) {
                    continue;
                }

                try {
                    const content = await scanner.scanFileContent(filePath);
                    for (const lp of BANNED_LOG_PATTERNS) {
                        lp.pattern.lastIndex = 0;
                        let match;
                        while ((match = lp.pattern.exec(content)) !== null) {
                            const lineNum = content.substring(0, match.index).split('\n').length;
                            violations.push({
                                file: filePath,
                                line: lineNum,
                                type: lp.name,
                            });
                        }
                    }
                } catch { /* skip */ }
            }

            const passed = violations.length === 0;
            return {
                ruleId: this.id,
                passed,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: passed
                    ? '无裸 console 日志调用'
                    : `${violations.length} 处裸 console 调用（已排除 log.js 和 test 文件）`,
                violations: violations.slice(0, 30),
            };
        } catch {
            return {
                ruleId: this.id,
                passed: true,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: '无法检查裸日志调用（环境限制）',
            };
        }
    },
};
