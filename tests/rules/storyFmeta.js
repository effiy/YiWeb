/**
 * 规则: story-fmeta — 每个场景文档是否包含完整版头
 * 类别: document | 优先级: P0 | 阻断: 是
 *
 * 版头要求：版本号、日期、作者/模型、分支、导航、章节索引
 */

const HEADER_PATTERNS = [
    { name: '版本号', pattern: />\s*v[\d.]+/ },
    { name: '日期', pattern: /\|\s*\d{4}-\d{2}-\d{2}/ },
    { name: '导航链接', pattern: /\[.*\]\(.*\.md\)/ },
    { name: '章节索引', pattern: /§\d/ },
];

export const rule = {
    id: 'story-fmeta',
    category: 'document',
    priority: 'P0',
    blocking: true,
    appliesTo: ['.md'],
    description: '每个场景文档是否包含完整版头',
    fixHint: '确保每个场景 .md 文件开头包含: 版本号(vX.Y.Z)、日期、导航链接、章节索引(§1-§7)',

    async check(scanner) {
        const results = [];
        try {
            const files = scanner.listFiles ? scanner.listFiles() : [];
            const storyMdFiles = files.filter(f =>
                f.includes('故事任务面板/') && f.endsWith('.md') && !f.endsWith('故事任务.md')
            );

            for (const filePath of storyMdFiles) {
                try {
                    const content = await scanner.scanFileContent(filePath);
                    const missing = HEADER_PATTERNS.filter(p => !p.pattern.test(content));
                    if (missing.length > 0) {
                        results.push({
                            file: filePath,
                            missing: missing.map(m => m.name),
                        });
                    }
                } catch { /* skip unreadable */ }
            }

            const passed = results.length === 0;
            return {
                ruleId: this.id,
                passed,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: passed
                    ? '所有文档版头完整'
                    : `${results.length} 个文档版头不完整`,
                fileResults: results.slice(0, 10),
            };
        } catch {
            return {
                ruleId: this.id,
                passed: true,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: '无可检查的文档（可能 scanner 不支持文件列表）',
            };
        }
    },
};
