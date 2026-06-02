/**
 * 规则: config-env — 环境配置仅支持规定的两种环境名
 * 类别: structure | 优先级: P0 | 阻断: 是
 *
 * 检查 src/core/config.js 中 env 配置是否仅使用 'local' 和 'prod'
 */

const ALLOWED_ENV_NAMES = ['local', 'prod'];

export const rule = {
    id: 'config-env',
    category: 'structure',
    priority: 'P0',
    blocking: true,
    appliesTo: ['.js'],
    description: '环境配置仅支持规定的两种环境名',
    fixHint: '确保 src/core/config.js 中仅使用 local 和 prod 环境名，移除其他环境配置',

    async check(scanner) {
        try {
            const content = await scanner.scanFileContent('src/core/config.js');

            // 搜索所有可能的环境名定义
            const envNamePattern = /['"](\w+)['"]\s*:/g;
            const envPattern = /case\s+['"](\w+)['"]/g;
            const envSwitchPattern = /switch\s*\([^)]*env[^)]*\)/;

            const foundEnvs = new Set();

            // 搜索环境名赋值
            let match;
            while ((match = envNamePattern.exec(content)) !== null) {
                const name = match[1];
                if (name === 'local' || name === 'prod' || name === 'name') {
                    foundEnvs.add(name);
                }
            }

            // 搜索 case 中的环境名
            while ((match = envPattern.exec(content)) !== null) {
                foundEnvs.add(match[1]);
            }

            // 检查是否有非允许的环境名
            const illegalEnvs = [...foundEnvs].filter(e => !ALLOWED_ENV_NAMES.includes(e) && e !== 'name');

            const passed = illegalEnvs.length === 0 && foundEnvs.has('local') && foundEnvs.has('prod');

            return {
                ruleId: this.id,
                passed,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: passed
                    ? `环境配置仅包含允许的环境名: ${[...foundEnvs].filter(e => e !== 'name').join(', ')}`
                    : illegalEnvs.length > 0
                        ? `发现非法环境名: ${illegalEnvs.join(', ')}`
                        : '缺少 local 或 prod 环境配置',
                file: 'src/core/config.js',
                foundEnvs: [...foundEnvs],
            };
        } catch {
            return {
                ruleId: this.id,
                passed: false,
                priority: this.priority,
                blocking: this.blocking,
                duration: 0,
                details: 'src/core/config.js 不存在或无法读取',
                file: 'src/core/config.js',
            };
        }
    },
};
