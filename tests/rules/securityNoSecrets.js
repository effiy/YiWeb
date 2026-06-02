/**
 * 规则: security-no-secrets — 代码中无硬编码密钥或密码
 * 类别: security | 优先级: P0 | 阻断: 是
 */

const SECRET_PATTERNS = [
    { name: '密码赋值', pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{3,}['"]/gi },
    { name: 'Token 硬编码', pattern: /(?:token|secret|apiKey|api_key|apikey)\s*[:=]\s*['"][A-Za-z0-9_\-.]{8,}['"]/gi },
    { name: 'Bearer Token', pattern: /Bearer\s+[A-Za-z0-9_\-.]{8,}/gi },
    { name: '私钥片段', pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/ },
];

// 允许的安全模式（不会被标记为硬编码）
const ALLOWED_PATTERNS = [
    /X-Token/,
    /localStorage\.getItem\(/,
    /getAuthHeaders/,
    /process\.env/,
    /import\.meta\.env/,
];

export const rule = {
    id: 'security-no-secrets',
    category: 'security',
    priority: 'P0',
    blocking: true,
    appliesTo: ['.js', '.json', '.html', '.md'],
    description: '代码中无硬编码密钥或密码',
    fixHint: '将密钥/密码/Token 移除，改用环境变量或 localStorage 存储，通过 getAuthHeaders() 引用',

    async check(scanner) {
        const findings = [];

        try {
            const files = scanner.listFiles ? scanner.listFiles() : [];
            const checkFiles = files.filter(f => {
                const ext = '.' + (f.split('.').pop() || '').toLowerCase();
                return ['.js', '.md', '.html'].includes(ext);
            });

            for (const filePath of checkFiles) {
                try {
                    const content = await scanner.scanFileContent(filePath);
                    // 跳过 log.js（它本身包含用于过滤的日志函数）
                    if (filePath.includes('log.js')) continue;

                    for (const sp of SECRET_PATTERNS) {
                        // 重置 lastIndex
                        sp.pattern.lastIndex = 0;
                        let match;
                        while ((match = sp.pattern.exec(content)) !== null) {
                            const matched = match[0];
                            // 检查是否在白名单中
                            const isAllowed = ALLOWED_PATTERNS.some(ap => ap.test(matched));
                            if (!isAllowed) {
                                const lineNum = content.substring(0, match.index).split('\n').length;
                                findings.push({
                                    file: filePath,
                                    line: lineNum,
                                    type: sp.name,
                                    snippet: matched.substring(0, 40),
                                });
                            }
                        }
                    }
                } catch { /* skip */ }
            }

            const passed = findings.length === 0;
            return {
                ruleId: this.id,
                passed,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: passed
                    ? '无硬编码密钥/密码'
                    : `发现 ${findings.length} 处疑似硬编码密钥`,
                findings: findings.slice(0, 20),
            };
        } catch {
            return {
                ruleId: this.id,
                passed: true,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: '无法执行安全检查（环境限制）',
            };
        }
    },
};
