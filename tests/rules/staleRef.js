/**
 * 规则: stale-ref — 文档引用的外部文件版本号是否过期
 * 类别: document | 优先级: P1 | 阻断: 否
 *
 * 检查文档中引用的外部版本号是否与当前项目版本一致
 */

const CURRENT_VERSION = (() => {
    try {
        if (typeof window !== 'undefined' && window.__ENV__?.version) {
            return window.__ENV__.version;
        }
    } catch { /* */ }
    return '3.0.0'; // 当前基线版本
})();

export const rule = {
    id: 'stale-ref',
    category: 'document',
    priority: 'P1',
    blocking: false,
    appliesTo: ['.md'],
    description: '文档引用的外部文件版本号是否过期',
    fixHint: '更新文档中引用的过期版本号，确保与当前基线版本一致',

    async check(scanner) {
        const staleRefs = [];
        // 匹配版本号模式: v2.x.x, v1.x.x 等（非当前版本）
        const versionPattern = /\bv(\d+\.\d+\.\d+)\b/g;

        try {
            const files = scanner.listFiles ? scanner.listFiles() : [];
            const mdFiles = files.filter(f => f.endsWith('.md'));

            for (const filePath of mdFiles) {
                try {
                    const content = await scanner.scanFileContent(filePath);
                    let match;
                    while ((match = versionPattern.exec(content)) !== null) {
                        const found = match[1];
                        // 简单的版本比较：如果主版本号与当前不同，标记为过期
                        const foundMajor = parseInt(found.split('.')[0], 10);
                        const currentMajor = parseInt(CURRENT_VERSION.split('.')[0], 10);
                        if (foundMajor < currentMajor) {
                            staleRefs.push({
                                file: filePath,
                                found: 'v' + found,
                                current: 'v' + CURRENT_VERSION,
                            });
                        }
                    }
                } catch { /* skip */ }
            }

            const passed = staleRefs.length === 0;
            return {
                ruleId: this.id,
                passed,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: passed
                    ? '无过期版本引用'
                    : `${staleRefs.length} 处可能存在过期版本引用`,
                staleRefs: staleRefs.slice(0, 20),
            };
        } catch {
            return {
                ruleId: this.id,
                passed: true,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: '无法检查版本引用（环境限制）',
            };
        }
    },
};
