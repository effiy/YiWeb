/**
 * 自主测试 — 检查项注册表
 *
 * 聚合所有 15 条检查规则，提供按类别/优先级/文件类型过滤。
 *
 * 导出：
 *   getAllRules()              — 全部 15 条规则
 *   getRulesByCategory(cat)    — 按类别过滤
 *   getRulesByPriority(pri)    — 按优先级过滤
 *   getRulesForFileExtension(ext) — 按文件扩展名过滤
 *   getRuleById(id)            — 按 ID 查找
 */

import { rule as claudeCompleteness } from './rules/claudeCompleteness.js';
import { rule as readmeDomain } from './rules/readmeDomain.js';
import { rule as storyStructure } from './rules/storyStructure.js';
import { rule as storyFmeta } from './rules/storyFmeta.js';
import { rule as storyNav } from './rules/storyNav.js';
import { rule as storyChangelog } from './rules/storyChangelog.js';
import { rule as crossRefValid } from './rules/crossRefValid.js';
import { rule as staleRef } from './rules/staleRef.js';
import { rule as branchIsolation } from './rules/branchIsolation.js';
import { rule as versionConsistency } from './rules/versionConsistency.js';
import { rule as archLayer } from './rules/archLayer.js';
import { rule as securityNoSecrets } from './rules/securityNoSecrets.js';
import { rule as securityFetchCreds } from './rules/securityFetchCreds.js';
import { rule as securityNoRawLog } from './rules/securityNoRawLog.js';
import { rule as configEnv } from './rules/configEnv.js';

/* ── 全部规则列表 ── */

const ALL_RULES = [
    claudeCompleteness,
    readmeDomain,
    storyStructure,
    storyFmeta,
    storyNav,
    storyChangelog,
    crossRefValid,
    staleRef,
    branchIsolation,
    versionConsistency,
    archLayer,
    securityNoSecrets,
    securityFetchCreds,
    securityNoRawLog,
    configEnv,
];

/* ── 索引 ── */

const rulesById = {};
for (const r of ALL_RULES) {
    rulesById[r.id] = r;
}

/* ── 导出查询方法 ── */

/** @returns {object[]} 全部规则 */
export function getAllRules() {
    return [...ALL_RULES];
}

/**
 * @param {string} category — 'document' | 'structure' | 'security' | 'branch' | 'version'
 * @returns {object[]}
 */
export function getRulesByCategory(category) {
    return ALL_RULES.filter(r => r.category === category);
}

/**
 * @param {string} priority — 'P0' | 'P1' | 'P2'
 * @returns {object[]}
 */
export function getRulesByPriority(priority) {
    return ALL_RULES.filter(r => r.priority === priority);
}

/**
 * @param {string} ext — 文件扩展名，如 '.js', '.md', '*'
 * @returns {object[]} 适用于该文件类型的规则
 */
export function getRulesForFileExtension(ext) {
    return ALL_RULES.filter(r =>
        r.appliesTo.includes('*') || r.appliesTo.includes(ext)
    );
}

/**
 * @param {string} id
 * @returns {object|undefined}
 */
export function getRuleById(id) {
    return rulesById[id];
}

/**
 * 导出规则元数据（可序列化为 JSON 用于报告/审计）
 * @returns {object[]} 不含 check 函数的规则元数据数组
 */
export function getRulesMetadata() {
    return ALL_RULES.map(({ check, ...meta }) => meta);
}

/**
 * @returns {number}
 */
export function getRuleCount() {
    return ALL_RULES.length;
}
