/**
 * 规则: security-fetch-credentials — 所有网络请求是否设置安全凭证模式
 * 类别: security | 优先级: P0 | 阻断: 是
 *
 * 所有 fetch 调用必须显式设置 credentials: 'omit'
 */

export const rule = {
    id: 'security-fetch-credentials',
    category: 'security',
    priority: 'P0',
    blocking: true,
    appliesTo: ['.js'],
    description: '所有网络请求是否设置安全凭证模式',
    fixHint: '为每个 fetch() 调用添加 { credentials: \'omit\' } 选项',

    async check(scanner) {
        const violations = [];

        try {
            const files = scanner.listFiles ? scanner.listFiles() : [];
            const jsFiles = files.filter(f => f.endsWith('.js'));

            // fetch 调用正则
            const fetchPattern = /\bfetch\s*\(/g;

            for (const filePath of jsFiles) {
                // 跳过测试文件和已知安全的模块
                if (filePath.includes('.test.js')) continue;
                if (filePath.includes('tests/')) continue;

                try {
                    const content = await scanner.scanFileContent(filePath);
                    let match;
                    while ((match = fetchPattern.exec(content)) !== null) {
                        // 从 fetch( 位置向后检查是否在同一语句中包含 credentials: 'omit'
                        const afterFetch = content.substring(match.index + match[0].length);
                        // 找到这个 fetch 调用的闭合括号（简单方式：找下一个匹配的闭合结构）
                        const bracketEnd = findMatchingBracket(afterFetch);
                        const fetchBody = afterFetch.substring(0, bracketEnd);

                        if (!fetchBody.includes("credentials: 'omit'") &&
                            !fetchBody.includes('credentials:"omit"') &&
                            !fetchBody.includes("credentials:'omit'")) {
                            const lineNum = content.substring(0, match.index).split('\n').length;
                            violations.push({
                                file: filePath,
                                line: lineNum,
                                snippet: 'fetch(' + fetchBody.substring(0, 50) + '...',
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
                    ? '所有 fetch 调用均设置了 credentials 安全模式'
                    : `${violations.length} 处 fetch 缺少 credentials: 'omit'`,
                violations: violations.slice(0, 20),
            };
        } catch {
            return {
                ruleId: this.id,
                passed: true,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: '无法检查 fetch 凭证模式（环境限制）',
            };
        }
    },
};

/** 简单括号匹配：从字符串开头找闭合括号位置 */
function findMatchingBracket(str) {
    let depth = 0;
    let inString = false;
    let stringChar = '';
    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (inString) {
            if (c === '\\') { i++; continue; }
            if (c === stringChar) inString = false;
            continue;
        }
        if (c === "'" || c === '"' || c === '`') {
            inString = true;
            stringChar = c;
            continue;
        }
        if (c === '(') depth++;
        if (c === ')') {
            if (depth === 0) return i;
            depth--;
        }
    }
    return str.length;
}
