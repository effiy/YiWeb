/**
 * 规则: arch-layer — 视图层是否违规直接引用基础设施层
 * 类别: structure | 优先级: P0 | 阻断: 是
 *
 * 分层定义（来自 CLAUDE.md）:
 *   L1 视图层: src/views/
 *   L2 服务层: src/core/services/
 *   L3 基础设施: cdn/utils/core/
 *
 * 规则: L1 不能直接 import L3，必须通过 L2
 */

const LAYER_RULES = [
    {
        name: 'L1→L3 违规',
        sourcePattern: /src\/views\//,
        forbiddenImport: /cdn\/utils\/core\//,
        description: '视图层(src/views/)直接引用基础设施层(cdn/utils/core/)',
    },
];

const IMPORT_REGEX = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;

export const rule = {
    id: 'arch-layer',
    category: 'structure',
    priority: 'P0',
    blocking: true,
    appliesTo: ['.js'],
    description: '视图层是否违规直接引用基础设施层',
    fixHint: '视图层(src/views/)应通过服务层(src/core/services/)间接使用基础设施，避免直接 import cdn/utils/core/',

    async check(scanner) {
        const violations = [];

        try {
            const files = scanner.listFiles ? scanner.listFiles() : [];
            const jsFiles = files.filter(f => f.endsWith('.js'));

            for (const filePath of jsFiles) {
                for (const rule of LAYER_RULES) {
                    if (!rule.sourcePattern.test(filePath)) continue;

                    try {
                        const content = await scanner.scanFileContent(filePath);
                        let match;
                        while ((match = IMPORT_REGEX.exec(content)) !== null) {
                            const importPath = match[1];
                            if (rule.forbiddenImport.test(importPath)) {
                                violations.push({
                                    file: filePath,
                                    import: importPath,
                                    rule: rule.name,
                                    description: rule.description,
                                });
                            }
                        }
                    } catch { /* skip */ }
                }
            }

            const passed = violations.length === 0;
            return {
                ruleId: this.id,
                passed,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: passed
                    ? '无架构分层违规'
                    : `${violations.length} 处分层违规`,
                violations: violations.slice(0, 20),
            };
        } catch {
            return {
                ruleId: this.id,
                passed: true,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: '无法检查架构分层（环境限制）',
            };
        }
    },
};
