/**
 * 自主测试 — 执行引擎
 *
 * 负责按指定模式执行规则检查，聚合结果。
 *
 * 导出：
 *   createEngine(options)         — 创建引擎实例
 *   engine.runFull(rules?)        — 全量扫描（同类别内并行）
 *   engine.runIncremental(changedFiles, rules?) — 增量扫描
 *   engine.runSequential(rules?)  — 顺序执行（遇 P0 失败中断）
 *   engine.runDegraded(availableToolIds, rules?) — 降级模式
 *
 * 选项：
 *   { scanner, reporter?, onCheckStart?, onCheckEnd? }
 */

import { getAllRules, getRulesForFileExtension, getRuleCount } from './ruleRegistry.js';
import { createEmptyReport } from './reporter.js';
import { classifyByExtension } from './scanner.js';
import { logInfo, logWarn } from '/cdn/utils/core/log.js';

/* ── CheckResult 工厂 ── */

function makeResult(rule, passed, details, file, extra) {
    return {
        ruleId: rule.id,
        passed,
        priority: rule.priority,
        blocking: rule.blocking,
        duration: 0,
        details,
        file: file || '',
        fixHint: rule.fixHint || '',
        ...extra,
    };
}

/* ── 执行单个规则 ── */

async function executeRule(rule, scanner, onCheckStart, onCheckEnd) {
    const t0 = performance.now();
    if (onCheckStart) onCheckStart(rule.id);

    let result;
    try {
        result = await rule.check(scanner);
        // 确保结果包含必需字段
        result.ruleId = result.ruleId || rule.id;
        result.priority = result.priority || rule.priority;
        result.blocking = result.blocking !== undefined ? result.blocking : rule.blocking;
        result.fixHint = result.fixHint || rule.fixHint || '';
        result.duration = +(performance.now() - t0).toFixed(1);
    } catch (err) {
        result = makeResult(rule, false, `检查异常: ${err.message}`, '');
        result.duration = +(performance.now() - t0).toFixed(1);
    }

    if (onCheckEnd) onCheckEnd(rule.id, result);
    return result;
}

/* ── 引擎工厂 ── */

export function createEngine(options) {
    options = options || {};
    const { scanner, reporter, onCheckStart, onCheckEnd } = options;

    if (!scanner) {
        throw new Error('createEngine: scanner 是必需的选项');
    }

    /* ── 全量扫描 ── */
    async function runFull(rules) {
        const ruleList = (rules && rules.length) ? rules : getAllRules();
        const t0 = performance.now();
        const checks = [];

        // 按类别分组
        const groups = {};
        for (const r of ruleList) {
            const cat = r.category || 'other';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(r);
        }

        // 类别间顺序执行，类别内并行
        for (const [cat, catRules] of Object.entries(groups)) {
            logInfo(`[Engine] 执行 ${cat} 类别 (${catRules.length} 项)...`);
            // 并行执行同类别规则
            const results = await Promise.all(
                catRules.map(r => executeRule(r, scanner, onCheckStart, onCheckEnd))
            );
            checks.push(...results);
        }

        const duration = +(performance.now() - t0).toFixed(1);
        return buildReport(checks, 'full', duration);
    }

    /* ── 增量扫描 ── */
    async function runIncremental(changedFiles, rules) {
        const ruleList = (rules && rules.length) ? rules : getAllRules();
        const t0 = performance.now();

        if (!changedFiles || changedFiles.length === 0) {
            const report = createEmptyReport();
            report.mode = 'incremental';
            report.summary.duration = 0;
            report.gate = 'PASS';
            return report;
        }

        // 按变更文件类型确定需要执行的规则
        const classified = classifyByExtension(changedFiles);
        const relevantExts = new Set();

        // 确定哪些扩展名需要检查
        if (classified.documents.length > 0) relevantExts.add('.md');
        if (classified.code.length > 0) relevantExts.add('.js');
        if (classified.configs.length > 0) relevantExts.add('.json');
        if (classified.templates.length > 0) relevantExts.add('.html');
        if (classified.styles.length > 0) relevantExts.add('.css');

        // 二进制文件不触发任何规则
        const skippedBinaries = classified.binaries.length;

        // 如果只有二进制和其他文件，没有规则需要执行
        if (relevantExts.size === 0) {
            const report = createEmptyReport();
            report.mode = 'incremental';
            report.summary.duration = +(performance.now() - t0).toFixed(1);
            report.gate = 'PASS';
            report._skippedBinaries = skippedBinaries;
            report._changedFiles = changedFiles.length;
            return report;
        }

        // 筛选适用的规则
        const applicableRules = ruleList.filter(r => {
            if (r.appliesTo.includes('*')) return true;
            return r.appliesTo.some(ext => relevantExts.has(ext));
        });

        logInfo(`[Engine] 增量扫描: ${changedFiles.length} 变更文件, ${applicableRules.length}/${ruleList.length} 规则, ${skippedBinaries} 二进制跳过`);

        // 并行执行适用规则
        const checks = await Promise.all(
            applicableRules.map(r => executeRule(r, scanner, onCheckStart, onCheckEnd))
        );

        const duration = +(performance.now() - t0).toFixed(1);
        const report = buildReport(checks, 'incremental', duration);
        report._changedFiles = changedFiles.length;
        report._skippedBinaries = skippedBinaries;
        return report;
    }

    /* ── 顺序执行 ── */
    async function runSequential(rules) {
        const ruleList = (rules && rules.length) ? rules : getAllRules();
        const t0 = performance.now();
        const checks = [];

        for (const r of ruleList) {
            const result = await executeRule(r, scanner, onCheckStart, onCheckEnd);
            checks.push(result);

            // P0 失败立即中断
            if (!result.passed && r.priority === 'P0' && r.blocking) {
                logWarn(`[Engine] 顺序模式: ${r.id} (P0) 失败，中断执行`);
                break;
            }
        }

        const duration = +(performance.now() - t0).toFixed(1);
        // 对未执行的规则标记跳过
        const allChecks = [...checks];
        for (const r of ruleList) {
            if (!allChecks.find(c => c.ruleId === r.id)) {
                allChecks.push({
                    ruleId: r.id,
                    passed: true,
                    skipped: true,
                    priority: r.priority,
                    blocking: r.blocking,
                    duration: 0,
                    details: '因前序 P0 阻断，跳过执行',
                    file: '',
                    fixHint: '',
                });
            }
        }
        return buildReport(allChecks, 'sequential', duration);
    }

    /* ── 降级模式 ── */
    async function runDegraded(availableToolIds, rules) {
        const ruleList = (rules && rules.length) ? rules : getAllRules();
        const t0 = performance.now();

        if (!availableToolIds || availableToolIds.length === 0) {
            const checks = ruleList.map(r =>
                makeResult(r, true, '工具不可用，降级跳过', '')
            );
            const report = buildReport(checks, 'degraded', 0);
            report.gate = 'WARN';
            return report;
        }

        const checks = [];

        for (const r of ruleList) {
            // 检查规则依赖的工具是否可用（通过规则类别映射到工具）
            // 简化：如果 availableToolIds 包含 'all' 或规则类别，则执行
            const toolCategory = r.category;
            if (availableToolIds.includes('all') || availableToolIds.includes(toolCategory)) {
                const result = await executeRule(r, scanner, onCheckStart, onCheckEnd);
                checks.push(result);
            } else {
                checks.push(makeResult(r, true, `工具不可用 (${toolCategory})，降级跳过`, ''));
            }
        }

        const duration = +(performance.now() - t0).toFixed(1);
        return buildReport(checks, 'degraded', duration);
    }

    /* ── 构建报告 ── */
    function buildReport(checks, mode, duration) {
        const nonSkipped = checks.filter(c => !c.skipped);
        const total = nonSkipped.length;
        const passed = nonSkipped.filter(c => c.passed).length;
        const failed = nonSkipped.filter(c => !c.passed).length;
        const skipped = checks.filter(c => c.skipped).length;

        // Gate 判定
        let gate = 'PASS';
        const p0Failed = nonSkipped.filter(c => !c.passed && c.priority === 'P0');
        const p1Failed = nonSkipped.filter(c => !c.passed && c.priority === 'P1');

        if (p0Failed.length > 0) {
            gate = 'FAIL';
        } else if (p1Failed.length > 0) {
            gate = 'WARN';
        }

        return {
            summary: { total, passed, failed, skipped, duration },
            mode,
            checks,
            gate,
            timestamp: new Date().toISOString(),
            projectRoot: '',
        };
    }

    return {
        runFull,
        runIncremental,
        runSequential,
        runDegraded,
        scanner,
    };
}
