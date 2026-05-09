#!/usr/bin/env node

/**
 * self-improve-loop — multi-round improvement orchestrator
 *
 * Usage:
 *   node scripts/loop.js run --storyboard <path>     Append to a storyboard file
 *   node scripts/loop.js run --all                   Append to all storyboards
 *   node scripts/loop.js status [--json]
 *   node scripts/loop.js report [--json]             Output report to stdout only
 *
 * Output is appended to docs/storyboards/<name>.md after the existing content.
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const SELF_IMPROVE = path.join(__dirname, 'self-improve.js');
const EXEC_MEMORY = path.join(__dirname, 'execution-memory.js');
const STORYBOARDS_DIR = path.join(REPO_ROOT, 'docs', '故事任务面板');
function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], cwd: REPO_ROOT }).trim();
  } catch { return ''; }
}

function shJson(cmd) {
  const out = sh(cmd);
  if (!out) return null;
  try { return JSON.parse(out); } catch { return null; }
}

// ── Data collection ──

function collect() {
  const health = shJson(`node "${SELF_IMPROVE}" health --json`);
  const trends = shJson(`node "${EXEC_MEMORY}" trends --weeks 8 --json`);
  const proposals = shJson(`node "${SELF_IMPROVE}" proposals --json`) || [];
  const retro = shJson(`node "${SELF_IMPROVE}" retro --weeks 8 --json`);
  const snapshot = shJson(`node "${SELF_IMPROVE}" snapshot --json`);

  const openProposals = proposals.filter(p => p.status === 'open');
  const openP0 = openProposals.filter(p => p.priority === 'P0');
  const openP1 = openProposals.filter(p => p.priority === 'P1');
  const degradingSignals = trends?.degradingSignals || [];
  const largeFiles = snapshot?.cohesionRisks || [];
  const hotspots = snapshot?.dependencies?.hotspots || [];
  const evalResults = proposals.filter(p => p.eval_result && p.eval_result !== 'pending');
  const improved = evalResults.filter(e => e.eval_result === 'improved').length;
  const degraded = evalResults.filter(e => e.eval_result === 'degraded').length;

  return {
    health,
    openP0,
    openP1,
    degradingSignals,
    largeFiles,
    hotspots,
    improved,
    degraded,
    totalOpen: openProposals.length,
    totalProposals: proposals.length,
    closureRate: retro?.proposals?.closureRate,
    attentionItems: retro?.attention_items || [],
  };
}

// ── Report generator (compact, for appending to storyboards) ──

function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function generate(data) {
  const lines = [];
  lines.push('---');
  lines.push('');
  lines.push('## 自我改进循环');
  lines.push('');
  lines.push(`> 运行时间: ${now()} · 健康评分: **${data.health?.composite ?? 'N/A'}/100** · 开放提案: ${data.totalOpen}`);
  lines.push('');

  // ── 改进清单 ──
  lines.push('### 改进清单');
  lines.push('');

  let itemNum = 0;
  const items = [];

  for (const p of data.openP0) {
    items.push({ priority: 'P0', task: p.title, rationale: p.evidence || p.problem_source || '—' });
  }
  for (const s of data.degradingSignals) {
    items.push({ priority: 'P1', task: `修复 ${s.dimension} 退化趋势`, rationale: `连续窗口上升 (${s.window})` });
  }
  for (const p of data.openP1.slice(0, 3)) {
    items.push({ priority: 'P1', task: p.title, rationale: p.evidence || p.problem_source || '—' });
  }
  for (const f of data.largeFiles.slice(0, 3)) {
    items.push({ priority: 'P2', task: `拆分 \`${f.file}\` (${f.lines} lines)`, rationale: '文件过大，降低耦合度' });
  }

  if (items.length === 0) {
    lines.push('> 无待改进项');
    lines.push('');
  } else {
    lines.push('| # | Priority | Task | Rationale | Status |');
    lines.push('|---|----------|------|-----------|--------|');
    for (const item of items) {
      itemNum++;
      lines.push(`| ${itemNum} | ${item.priority} | ${item.task} | ${item.rationale} | pending |`);
    }
    lines.push('');
  }

  // ── 系统架构演进任务 ──
  lines.push('### 系统架构演进任务');
  lines.push('');

  const tasks = [];
  let taskNum = 0;

  // Near-term: P0 proposals + degrading signals
  for (const p of data.openP0) {
    tasks.push({ priority: 'P0', task: p.title, rationale: p.evidence || 'P0 开放提案', status: 'pending' });
  }
  for (const s of data.degradingSignals) {
    tasks.push({ priority: 'P1', task: `修复 ${s.dimension} 退化趋势`, rationale: `连续窗口上升 (${s.window})`, status: 'pending' });
  }

  // Mid-term: large file splits, degraded proposals
  if (data.largeFiles.length > 0) {
    tasks.push({ priority: 'P2', task: `拆分 ${data.largeFiles.length} 个大文件 (>300行)`, rationale: '降低耦合度，提升内聚性', status: 'pending' });
  }
  if (data.degraded > 0) {
    tasks.push({ priority: 'P2', task: `处理 ${data.degraded} 个退化提案`, rationale: '已评估为 degraded', status: 'pending' });
  }
  if (data.hotspots.length > 0) {
    const top = data.hotspots[0];
    tasks.push({ priority: 'P2', task: `解耦依赖热点: ${top.target}`, rationale: `Fan-in: ${top.fanIn}`, status: 'pending' });
  }

  // Long-term
  if (data.closureRate !== undefined && data.closureRate < 0.5) {
    tasks.push({ priority: 'P3', task: `提升提案闭合率 (当前 ${(data.closureRate * 100).toFixed(0)}%)`, rationale: '改进引擎效果跟踪', status: 'pending' });
  }
  if (data.health?.composite !== null && data.health?.composite < 70) {
    const dims = Object.entries(data.health?.dimensions || {}).filter(([, v]) => v !== null && v < 70).map(([k]) => k);
    if (dims.length > 0) {
      tasks.push({ priority: 'P3', task: `提升健康维度: ${dims.join(', ')}`, rationale: `当前综合评分 ${data.health.composite}/100`, status: 'pending' });
    }
  }

  // Already resolved (from eval)
  const resolvedCount = data.improved || 0;
  if (resolvedCount > 0) {
    tasks.push({ priority: 'done', task: `${resolvedCount} 个提案验证改善`, rationale: 'eval_result=improved', status: 'done' });
  }

  if (tasks.length === 0) {
    lines.push('> 无演进任务');
    lines.push('');
  } else {
    lines.push('| # | Priority | Task | Rationale | Status |');
    lines.push('|---|----------|------|-----------|--------|');
    for (const t of tasks) {
      taskNum++;
      const status = t.status === 'done' ? 'done' : 'pending';
      lines.push(`| ${taskNum} | ${t.priority} | ${t.task} | ${t.rationale} | ${status} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ── Storyboard operations ──

const SECTION_MARKER = '## 自我改进循环';

function stripExistingLoopSection(content) {
  const idx = content.indexOf(`\n${SECTION_MARKER}`);
  if (idx === -1) return content;
  return content.slice(0, idx).trimEnd();
}

async function appendToStoryboard(filePath, data) {
  let content;
  try {
    content = await fsp.readFile(filePath, 'utf8');
  } catch {
    console.error(`  skip: cannot read ${filePath}`);
    return false;
  }

  content = stripExistingLoopSection(content);
  const report = generate(data);
  await fsp.writeFile(filePath, content.trimEnd() + '\n\n' + report + '\n', 'utf8');
  return true;
}

async function findStoryboards() {
  try {
    const entries = await fsp.readdir(STORYBOARDS_DIR, { withFileTypes: true });
    const results = [];
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith('.')) {
        const storyFile = path.join(STORYBOARDS_DIR, e.name, '01-故事任务.md');
        try { await fsp.access(storyFile); results.push(storyFile); } catch {}
      }
    }
    return results;
  } catch {
    return [];
  }
}

// ── Commands ──

async function cmdRun(opts) {
  const data = collect();
  const report = generate(data);

  let files = [];
  if (opts.storyboard) {
    files = [opts.storyboard];
  } else if (opts.all) {
    files = await findStoryboards();
  }

  let appended = 0;
  if (files.length > 0) {
    for (const f of files) {
      const ok = await appendToStoryboard(f, data);
      if (ok) appended++;
    }
  }

  if (opts.json) {
    console.log(JSON.stringify({
      health: data.health?.composite,
      openProposals: data.totalOpen,
      improvements: data.openP0.length + data.openP1.length,
      degraded: data.degraded,
      appended,
      files: files.map(f => path.relative(REPO_ROOT, f)),
    }, null, 2));
  } else {
    console.log(`Self-improve loop done.`);
    console.log(`  Health: ${data.health?.composite}/100 | Open: ${data.totalOpen} | Improved: ${data.improved} | Degraded: ${data.degraded}`);
    if (files.length > 0) console.log(`  Appended to ${appended} storyboard(s)`);
    else console.log(`  Report (stdout only):\n${report}`);
  }
}

async function cmdReport(opts) {
  const data = collect();
  const report = generate(data);
  if (opts.json) {
    console.log(JSON.stringify({ report }, null, 2));
  } else {
    console.log(report);
  }
}

async function cmdStatus(opts) {
  const data = collect();
  if (opts.json) {
    console.log(JSON.stringify({
      health: data.health?.composite,
      openProposals: data.totalOpen,
      improvements: data.openP0.length + data.openP1.length,
      degraded: data.degraded,
      largeFiles: data.largeFiles.length,
    }, null, 2));
  } else {
    console.log(`# Self-Improve Loop Status`);
    console.log(`- Health: ${data.health?.composite ?? 'N/A'}/100`);
    console.log(`- Open proposals: ${data.totalOpen}`);
    console.log(`- Improvements: ${data.openP0.length + data.openP1.length}`);
    console.log(`- Degraded: ${data.degraded}`);
  }
}

// ── Main ──

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const opts = { storyboard: null, all: false, json: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--storyboard') opts.storyboard = path.resolve(args[++i]);
    else if (args[i] === '--all') opts.all = true;
    else if (args[i] === '--json') opts.json = true;
  }

  if (cmd === 'run') await cmdRun(opts);
  else if (cmd === 'report') await cmdReport(opts);
  else if (cmd === 'status') await cmdStatus(opts);
  else {
    console.error(`Usage: node scripts/loop.js <run|report|status> [--storyboard <path>|--all] [--json]`);
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
