/**
 * 规则: claude-completeness — CLAUDE.md 五大标记段完整性
 * 类别: document | 优先级: P0 | 阻断: 是
 */
export const rule = {
    id: 'claude-completeness',
    category: 'document',
    priority: 'P0',
    blocking: true,
    appliesTo: ['.md'],
    description: 'CLAUDE.md 五大标记段是否完整',
    fixHint: '确保 CLAUDE.md 包含: 项目画像, 项目约束, 执行准则, 退化对策, 安全面',

    async check(scanner) {
        const requiredSections = ['项目画像', '项目约束', '执行准则', '退化对策', '安全面'];
        try {
            const content = await scanner.scanFileContent('CLAUDE.md');
            const missing = requiredSections.filter(s => !content.includes(s));
            return {
                ruleId: this.id,
                passed: missing.length === 0,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: missing.length
                    ? `缺少标记段: ${missing.join(', ')}`
                    : '五大标记段完整',
                file: 'CLAUDE.md',
                missing,
            };
        } catch {
            return {
                ruleId: this.id,
                passed: false,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: 'CLAUDE.md 文件不存在或无法读取',
                file: 'CLAUDE.md',
            };
        }
    },
};
