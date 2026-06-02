/**
 * 自主测试 — 报告生成器
 *
 * 将引擎执行结果格式化为 JSON / 终端彩色输出 / 单行摘要。
 * 使用 logInfo / logWarn / logError，不直接调用 console.log。
 *
 * 导出：
 *   toJSON(report)          — 序列化为 JSON 字符串
 *   toConsole(report)       — 终端彩色输出
 *   toSummary(report)       — 单行摘要字符串
 *   createEmptyReport()     — 创建空报告结构
 */

import { logInfo, logWarn, logError } from '/cdn/utils/core/log.js';

/* ── 颜色常量（终端 ANSI） ── */
const C = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    dim: '\x1b[2m',
    bold: '\x1b[1m',
    cyan: '\x1b[36m',
};

/* ── 创建空报告 ── */

export function createEmptyReport() {
    return {
        summary: {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
        },
        mode: 'full',
        checks: [],
        gate: 'PASS',
        timestamp: new Date().toISOString(),
        projectRoot: '',
    };
}

/* ── JSON 输出 ── */

/**
 * @param {object} report — 引擎返回的报告对象
 * @param {number} [indent=2]
 * @returns {string}
 */
export function toJSON(report, indent) {
    indent = indent !== undefined ? indent : 2;
    return JSON.stringify(report, null, indent);
}

/* ── 终端彩色输出 ── */

/**
 * 在控制台输出格式化的报告（使用 logInfo/logWarn/logError）
 * @param {object} report
 */
export function toConsole(report) {
    const { summary, checks, gate, mode } = report;
    const isTTY = typeof window === 'undefined'; // 仅 Node.js 终端支持颜色

    const g = (s) => isTTY ? `${C.green}${s}${C.reset}` : s;
    const r = (s) => isTTY ? `${C.red}${s}${C.reset}` : s;
    const y = (s) => isTTY ? `${C.yellow}${s}${C.reset}` : s;
    const d = (s) => isTTY ? `${C.dim}${s}${C.reset}` : s;
    const b = (s) => isTTY ? `${C.bold}${s}${C.reset}` : s;

    const gateIcon = gate === 'PASS' ? g('✓') : gate === 'WARN' ? y('⚠') : r('✗');

    logInfo(`\n${b('══════ 自主测试报告 ══════')}`);
    logInfo(`模式: ${mode}  |  结果: ${gateIcon} ${gate}  |  ${summary.passed}/${summary.total} 通过  |  ${d(summary.duration + 'ms')}`);

    if (summary.skipped > 0) {
        logInfo(`${d(summary.skipped + ' 项跳过')}`);
    }

    // 按优先级排序：P0 失败 → P0 通过 → P1 失败 → ...
    const sorted = [...checks].sort((a, b) => {
        const pOrder = { P0: 0, P1: 1, P2: 2 };
        const scoreA = (a.passed ? 100 : 0) + (pOrder[a.priority] || 3);
        const scoreB = (b.passed ? 100 : 0) + (pOrder[b.priority] || 3);
        return scoreA - scoreB;
    });

    for (const check of sorted) {
        const icon = check.passed ? g('✓') : r('✗');
        const prio = check.priority === 'P0' ? r(check.priority) : y(check.priority);
        const block = check.blocking ? r('[阻断]') : d('[告警]');
        const dur = d(`${check.duration}ms`);

        if (check.passed) {
            logInfo(`  ${icon} ${prio} ${check.ruleId} ${dur} — ${check.details}`);
        } else {
            logWarn(`  ${icon} ${prio} ${block} ${check.ruleId} ${dur}`);
            logWarn(`    详情: ${check.details}`);
            if (check.file) logWarn(`    文件: ${check.file}${check.line ? ':' + check.line : ''}`);
            if (check.fixHint) logInfo(`    修复: ${check.fixHint}`);
        }
    }

    logInfo(`${b('══════════════════════════')}\n`);
}

/* ── 单行摘要 ── */

/**
 * @param {object} report
 * @returns {string} 如 "✓ 15/15 通过 · 1234ms · full"
 */
export function toSummary(report) {
    const { summary, gate, mode } = report;
    const icon = gate === 'PASS' ? '✓' : gate === 'WARN' ? '⚠' : '✗';
    return `${icon} ${summary.passed}/${summary.total} 通过 · ${summary.duration}ms · ${mode}`;
}
