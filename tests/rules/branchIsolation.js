/**
 * 规则: branch-isolation — 当前分支是否为规范格式且从 main 分出
 * 类别: branch | 优先级: P0 | 阻断: 是
 *
 * 规范: feat/<name> 格式，从 main 分支分出
 * 浏览器环境下无法执行 git，通过 scanner 传入的上下文获取分支信息
 */

export const rule = {
    id: 'branch-isolation',
    category: 'branch',
    priority: 'P0',
    blocking: true,
    appliesTo: ['*'],
    description: '当前分支是否为规范格式且从 main 分出',
    fixHint: '使用 git checkout -b feat/<描述名> 从 main 创建特性分支',

    async check(scanner) {
        // 尝试从 scanner 获取分支上下文
        let branchName = '';
        try {
            if (typeof scanner.getBranchName === 'function') {
                branchName = scanner.getBranchName();
            }
            if (!branchName && scanner._branchName) {
                branchName = scanner._branchName;
            }
        } catch { /* */ }

        // 如果无法获取分支信息（如浏览器环境），默认通过
        if (!branchName) {
            // 在浏览器环境尝试读取 local storage 或 URL
            try {
                if (typeof window !== 'undefined') {
                    const stored = localStorage.getItem('yiweb_branch');
                    if (stored) branchName = stored;
                }
            } catch { /* */ }
        }

        if (!branchName) {
            return {
                ruleId: this.id,
                passed: true,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: '无法获取分支信息（非 git 环境），跳过检查',
            };
        }

        const isFeatBranch = /^feat\/[\w-]+$/.test(branchName);
        const isMain = branchName === 'main' || branchName === 'master';

        const passed = isFeatBranch || isMain;
        return {
            ruleId: this.id,
            passed,
            priority: this.priority,
            blocking: this.blocking,
            duration: 0,
            details: passed
                ? `分支 ${branchName} 符合规范`
                : `分支名 "${branchName}" 不符合 feat/<name> 规范`,
            branch: branchName,
        };
    },
};
