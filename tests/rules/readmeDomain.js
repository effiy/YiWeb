/**
 * 规则: readme-domain — 项目说明书是否包含 ≥3 个领域术语
 * 类别: document | 优先级: P0 | 阻断: 是
 */

// 项目领域关键词（从 CLAUDE.md 和项目文档中提取）
const DOMAIN_TERMS = [
    'ESM', '零构建', '浏览器原生', 'createBaseView', 'vueRef',
    '视图隔离', 'store', 'computed', 'methods', 'CDN',
    'fetch', 'X-Token', 'localStorage', 'Markdown', 'Mermaid',
    '故事任务', '知识图谱', '自主测试', '安全面', '分层',
];

export const rule = {
    id: 'readme-domain',
    category: 'document',
    priority: 'P0',
    blocking: true,
    appliesTo: ['.md'],
    description: '项目说明书是否包含 ≥3 个领域术语',
    fixHint: '在 README.md 或项目说明中补充至少 3 个项目领域术语',

    async check(scanner) {
        try {
            // 检查 README.md 或 <项目名>.md
            let content = '';
            try {
                content = await scanner.scanFileContent('README.md');
            } catch {
                // 尝试 CLAUDE.md 作为备选
                content = await scanner.scanFileContent('CLAUDE.md');
            }

            const found = DOMAIN_TERMS.filter(term => content.includes(term));
            const passed = found.length >= 3;
            return {
                ruleId: this.id,
                passed,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: passed
                    ? `找到 ${found.length} 个领域术语: ${found.slice(0, 5).join(', ')}`
                    : `仅找到 ${found.length} 个领域术语，需 ≥3 个`,
                file: 'README.md',
                foundTerms: found,
            };
        } catch {
            return {
                ruleId: this.id,
                passed: false,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: 'README.md 不存在或无法读取',
                file: 'README.md',
            };
        }
    },
};
