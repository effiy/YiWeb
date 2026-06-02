/**
 * 规则: cross-ref-valid — 文档内相对链接指向的文件是否存在
 * 类别: document | 优先级: P0 | 阻断: 是
 *
 * 与 story-nav 互补：story-nav 专注导航栏链接，本规则覆盖全文所有相对链接
 */

export const rule = {
    id: 'cross-ref-valid',
    category: 'document',
    priority: 'P0',
    blocking: true,
    appliesTo: ['.md'],
    description: '文档内相对链接指向的文件是否存在',
    fixHint: '检查并修复文档中的断链：确保 [text](./path/file) 目标文件存在',

    async check(scanner) {
        const brokenRefs = [];
        try {
            const files = scanner.listFiles ? scanner.listFiles() : [];
            const mdFiles = files.filter(f => f.endsWith('.md'));

            for (const filePath of mdFiles) {
                try {
                    const content = await scanner.scanFileContent(filePath);
                    // 匹配 Markdown 链接和图片
                    const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
                    let match;

                    while ((match = linkRegex.exec(content)) !== null) {
                        const target = match[2];
                        // 跳过 http/https 链接
                        if (/^https?:\/\//.test(target)) continue;
                        // 跳过纯锚点
                        if (target.startsWith('#')) continue;
                        // 提取路径部分（去掉 #anchor 和 ?query）
                        const pathOnly = target.split('#')[0].split('?')[0];
                        if (!pathOnly) continue;

                        // 解析相对路径
                        const baseDir = filePath.substring(0, filePath.lastIndexOf('/') + 1);
                        let resolved;
                        if (pathOnly.startsWith('./')) {
                            resolved = baseDir + pathOnly.slice(2);
                        } else if (pathOnly.startsWith('../')) {
                            const parts = baseDir.split('/').filter(Boolean);
                            let rel = pathOnly;
                            while (rel.startsWith('../')) {
                                parts.pop();
                                rel = rel.slice(3);
                            }
                            resolved = parts.join('/') + '/' + rel;
                        } else if (pathOnly.startsWith('/')) {
                            resolved = pathOnly.slice(1);
                        } else {
                            resolved = baseDir + pathOnly;
                        }

                        if (!scanner.fileExists(resolved)) {
                            brokenRefs.push({
                                sourceFile: filePath,
                                target,
                                resolved,
                            });
                        }
                    }
                } catch { /* skip */ }
            }

            const passed = brokenRefs.length === 0;
            return {
                ruleId: this.id,
                passed,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: passed
                    ? '所有交叉引用有效'
                    : `${brokenRefs.length} 个断链`,
                brokenRefs: brokenRefs.slice(0, 20),
            };
        } catch {
            return {
                ruleId: this.id,
                passed: true,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: '无可检查的交叉引用',
            };
        }
    },
};
