/**
 * 规则: story-changelog — 每个文档底部是否包含变更记录表
 * 类别: document | 优先级: P0 | 阻断: 是
 */

const CHANGELOG_PATTERN = />\s*\*{0,2}变更记录\*{0,2}/;

export const rule = {
    id: 'story-changelog',
    category: 'document',
    priority: 'P0',
    blocking: true,
    appliesTo: ['.md'],
    description: '每个文档底部是否包含变更记录表',
    fixHint: '在每个故事/场景 .md 文件末尾添加: > **变更记录** | 日期 | 变更 | 触发 | 证据 |',

    async check(scanner) {
        const results = [];
        try {
            const files = scanner.listFiles ? scanner.listFiles() : [];
            const storyMdFiles = files.filter(f =>
                f.includes('故事任务面板/') && f.endsWith('.md')
            );

            for (const filePath of storyMdFiles) {
                try {
                    const content = await scanner.scanFileContent(filePath);
                    if (!CHANGELOG_PATTERN.test(content)) {
                        results.push(filePath);
                    }
                } catch { /* skip */ }
            }

            const passed = results.length === 0;
            return {
                ruleId: this.id,
                passed,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: passed
                    ? '所有文档包含变更记录表'
                    : `${results.length} 个文档缺少变更记录表: ${results.slice(0, 5).join(', ')}`,
                missingChangelogs: results.slice(0, 10),
            };
        } catch {
            return {
                ruleId: this.id,
                passed: true,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: '无可检查的文档',
            };
        }
    },
};
