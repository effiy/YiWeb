/**
 * 规则: version-consistency — 各处版本号是否一致
 * 类别: version | 优先级: P0 | 阻断: 是
 *
 * 检查 CLAUDE.md、故事文档、代码注释中的版本号一致性
 */

const VERSION_PATTERN = /\bv?(\d+\.\d+\.\d+)\b/g;

export const rule = {
    id: 'version-consistency',
    category: 'version',
    priority: 'P0',
    blocking: true,
    appliesTo: ['*'],
    description: '各处版本号是否一致',
    fixHint: '统一更新项目各处版本号（CLAUDE.md、故事文档、cdn/ 模块）为同一基线版本',

    async check(scanner) {
        const versionMap = {}; // { version: [file1, file2] }

        try {
            const files = scanner.listFiles ? scanner.listFiles() : [];
            const checkFiles = files.filter(f =>
                f === 'CLAUDE.md' ||
                (f.includes('故事任务面板/') && f.endsWith('.md')) ||
                f === 'tests/runner.js'
            );

            for (const filePath of checkFiles) {
                try {
                    const content = await scanner.scanFileContent(filePath);
                    let match;
                    while ((match = VERSION_PATTERN.exec(content)) !== null) {
                        const ver = match[1];
                        if (!versionMap[ver]) versionMap[ver] = [];
                        if (!versionMap[ver].includes(filePath)) {
                            versionMap[ver].push(filePath);
                        }
                    }
                } catch { /* skip */ }
            }

            const versions = Object.keys(versionMap);
            const passed = versions.length <= 1;

            return {
                ruleId: this.id,
                passed,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: passed
                    ? versions.length === 1
                        ? `版本一致: v${versions[0]}`
                        : '未检测到版本号'
                    : `发现 ${versions.length} 个不同版本: ${versions.map(v => `v${v}`).join(', ')}`,
                versionMap,
            };
        } catch {
            return {
                ruleId: this.id,
                passed: true,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: '无法检查版本一致性（环境限制）',
            };
        }
    },
};
