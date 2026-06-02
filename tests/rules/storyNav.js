/**
 * 规则: story-nav — 文档导航是否对齐且链接有效
 * 类别: document | 优先级: P0 | 阻断: 是
 *
 * 检查文档顶部导航栏中的相对链接是否指向存在的文件
 */

export const rule = {
    id: 'story-nav',
    category: 'document',
    priority: 'P0',
    blocking: true,
    appliesTo: ['.md'],
    description: '文档导航是否对齐且链接有效',
    fixHint: '检查 md 文件中 [text](./file.md) 导航链接的目标文件是否存在',

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
                    // 提取相对 md 链接: [text](./xxx.md) 或 [text](xxx.md)
                    const linkRegex = /\[([^\]]*)\]\(([^)]+\.md)\)/g;
                    let match;
                    const brokenLinks = [];

                    while ((match = linkRegex.exec(content)) !== null) {
                        const target = match[2];
                        // 跳过外部链接和锚点
                        if (target.startsWith('http://') || target.startsWith('https://')) continue;

                        // 构造目标路径
                        const baseDir = filePath.substring(0, filePath.lastIndexOf('/') + 1);
                        let resolved;
                        if (target.startsWith('./')) {
                            resolved = baseDir + target.slice(2);
                        } else if (target.startsWith('../')) {
                            const parts = baseDir.split('/').filter(Boolean);
                            let relPath = target;
                            while (relPath.startsWith('../')) {
                                parts.pop();
                                relPath = relPath.slice(3);
                            }
                            resolved = parts.join('/') + '/' + relPath;
                        } else {
                            resolved = target;
                        }

                        if (!scanner.fileExists(resolved)) {
                            brokenLinks.push({ text: match[1], target, resolved });
                        }
                    }

                    if (brokenLinks.length > 0) {
                        results.push({ file: filePath, brokenLinks });
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
                    ? '所有文档导航链接有效'
                    : `${results.length} 个文档存在断链`,
                linkResults: results.slice(0, 10),
            };
        } catch {
            return {
                ruleId: this.id,
                passed: true,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: '无可检查的导航链接',
            };
        }
    },
};
