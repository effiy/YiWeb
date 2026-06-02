/**
 * 规则: story-structure — 每个故事目录是否包含完整基线文档
 * 类别: structure | 优先级: P0 | 阻断: 是
 *
 * 基线文档清单: 故事任务.md, 知识图谱.json, 至少 1 个场景文档
 */

const BASELINE_FILES = ['故事任务.md', '知识图谱.json'];

export const rule = {
    id: 'story-structure',
    category: 'structure',
    priority: 'P0',
    blocking: true,
    appliesTo: ['*'],
    description: '每个故事目录是否包含完整基线文档',
    fixHint: '确保 docs/故事任务面板/<故事>/ 下包含: 故事任务.md + 知识图谱.json + 至少1个场景文档',

    async check(scanner) {
        // 通过 scanner 检查已知的故事目录
        const storyDirs = [
            '系统架构', '分层结构', '模块地图', '数据流',
            '安全边界', '依赖矩阵', '自主测试',
        ];

        const results = [];
        for (const dir of storyDirs) {
            const missing = [];
            const dirPrefix = `docs/故事任务面板/${dir}/`;

            for (const baseFile of BASELINE_FILES) {
                const filePath = dirPrefix + baseFile;
                if (!scanner.fileExists || scanner.fileExists(filePath)) {
                    try {
                        await scanner.scanFileContent(filePath);
                    } catch {
                        missing.push(baseFile);
                    }
                }
            }

            // 检查至少有一个场景文档
            const sceneFiles = ['场景1', '场景2', '场景3', '场景4'];
            let hasScene = false;
            for (const sf of sceneFiles) {
                try {
                    for (const file of scanner.listFiles ? scanner.listFiles() : []) {
                        if (file.includes(dirPrefix) && file.includes(sf) && file.endsWith('.md')) {
                            hasScene = true;
                            break;
                        }
                    }
                } catch { /* skip */ }
            }
            if (!hasScene) {
                missing.push('场景文档(≥1)');
            }

            if (missing.length > 0) {
                results.push({ dir, missing });
            }
        }

        const passed = results.length === 0;
        return {
            ruleId: this.id,
            passed,
            priority: this.priority,
            blocking: this.blocking,
            duration: 0,
            details: passed
                ? '所有故事目录基线文档完整'
                : `${results.length} 个故事目录缺少基线文档: ${results.map(r => `${r.dir}(缺${r.missing.join(',')})`).join('; ')}`,
            dirResults: results,
        };
    },
};
