#!/usr/bin/env node

/**
 * self-improve — 状态采集 + 效果回顾 for 自改进管线
 *
 * Commands:
 *   snapshot  — 状态采集 (memory, git, deps, large files)
 *   proposals — List/filter proposals
 *   resolve   — Mark proposal done/superseded
 *   evaluate  — 效果评估: evaluate proposal effectiveness (before/after metrics)
 *   retro     — 回顾报告: retrospective report (trends + proposal closure)
 *   health    — 健康评分: composite health score (0-100)
 *   feedback  — Record user feedback on a proposal
 *
 * Storage: docs/.improvement/proposals.jsonl
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { execSync } = require('child_process');
const { getNaturalWeekRange } = require('./natural-week.js');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const IMPROVEMENT_DIR = path.join(REPO_ROOT, 'docs', '.improvement');
const PROPOSALS_FILE = path.join(IMPROVEMENT_DIR, 'proposals.jsonl');
const HEALTH_CACHE_FILE = path.join(IMPROVEMENT_DIR, '.last-health.json');
const STORIES_DIR = path.join(REPO_ROOT, 'docs', '故事任务面板');

function storyImprovementDir(name) { return path.join(STORIES_DIR, name, '.improvement'); }
function storyProposalsFile(name) { return path.join(storyImprovementDir(name), 'proposals.jsonl'); }

const RATING_VALUES = new Set(['helpful', 'neutral', 'harmful']);

function safeExec(cmd, defaultVal = '') {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return defaultVal;
  }
}

// ---------- 状态采集: State Collection ----------

function collectMemoryStats() {
  const script = path.join(__dirname, 'execution-memory.js');
  try {
    const out = execSync(`node "${script}" stats --json`, {
      encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    return JSON.parse(out);
  } catch {
    return null;
  }
}

function collectGitHeatmap(weeks = 4) {
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);
  const sinceIso = since.toISOString().split('T')[0];

  const shortStatLines = safeExec(
    `git log --since="${sinceIso}" --shortstat --format=""`,
    ''
  ).split('\n').filter(Boolean);

  let totalFiles = 0, totalInsertions = 0, totalDeletions = 0;
  for (const line of shortStatLines) {
    const m = line.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/);
    if (m) {
      totalFiles += parseInt(m[1], 10) || 0;
      totalInsertions += parseInt(m[2], 10) || 0;
      totalDeletions += parseInt(m[3], 10) || 0;
    }
  }

  const fileChanges = safeExec(
    `git log --since="${sinceIso}" --name-only --pretty=format: | grep -v '^$' | sort | uniq -c | sort -rn | head -20`,
    ''
  ).split('\n').filter(Boolean).map(line => {
    const m = line.match(/^\s*(\d+)\s+(.+)$/);
    return m ? { file: m[2], changes: parseInt(m[1], 10) } : null;
  }).filter(Boolean);

  const featCount = safeExec(`git log --since="${sinceIso}" --oneline --grep="^feat" | wc -l`, '0');
  const fixCount = safeExec(`git log --since="${sinceIso}" --oneline --grep="^fix" | wc -l`, '0');
  const refactorCount = safeExec(`git log --since="${sinceIso}" --oneline --grep="^refactor" | wc -l`, '0');
  const docsCount = safeExec(`git log --since="${sinceIso}" --oneline --grep="^docs" | wc -l`, '0');

  return {
    period: `${sinceIso} ~ now`,
    totalFiles,
    totalInsertions,
    totalDeletions,
    fileHeatmap: fileChanges,
    commitTypes: {
      feat: parseInt(featCount, 10) || 0,
      fix: parseInt(fixCount, 10) || 0,
      refactor: parseInt(refactorCount, 10) || 0,
      docs: parseInt(docsCount, 10) || 0,
    },
  };
}

function collectDependencyMatrix() {
  const patterns = [
    { regex: /['"`](\/api\/[^'"`]+)['"`]/g, type: 'api-route' },
    { regex: /fetch\s*\(\s*['"`]([^'"`]+api[^'"`]*)['"`]/gi, type: 'fetch-url' },
    { regex: /from\s+['"`](\.\.?\/[^'"`]+)['"`]/g, type: 'local-import' },
  ];

  const deps = [];
  for (const p of patterns) {
    const files = safeExec(
      `grep -rn --include="*.js" --include="*.jsx" --include="*.ts" --include="*.py" ` +
      `--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude-dir=libs ` +
      `-l '' . | head -50`,
      ''
    ).split('\n').filter(Boolean);

    for (const file of files.slice(0, 30)) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        let match;
        while ((match = p.regex.exec(content)) !== null) {
          deps.push({ source: file, target: match[1], type: p.type });
        }
      } catch { /* skip unreadable */ }
    }
  }

  const fanIn = {};
  for (const d of deps) {
    fanIn[d.target] = (fanIn[d.target] || 0) + 1;
  }

  const hotspots = Object.entries(fanIn)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([target, count]) => ({ target, fanIn: count }));

  return { totalDeps: deps.length, hotspots };
}

function collectLargeFiles() {
  const result = safeExec(
    `find . -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.py" | ` +
    `grep -v node_modules | grep -v dist | grep -v .git | grep -v libs | ` +
    `xargs wc -l 2>/dev/null | sort -rn | head -15`,
    ''
  ).split('\n').filter(Boolean).map(line => {
    const m = line.match(/^\s*(\d+)\s+(.+)$/);
    return m ? { file: m[2], lines: parseInt(m[1], 10) } : null;
  }).filter(Boolean).filter(f => f.lines >= 300);

  return result;
}

// ---------- Memory Data Access ----------

function readMemoryRecords() {
  const script = path.join(__dirname, 'execution-memory.js');
  try {
    const out = execSync(`node "${script}" ls --limit 9999 --json`, {
      encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    return JSON.parse(out);
  } catch {
    return [];
  }
}

function filterRecordsByDateRange(records, startDate, endDate) {
  return records.filter(r => {
    const ts = r.timestamp || r.date;
    if (!ts) return false;
    const d = new Date(ts);
    return d >= new Date(startDate) && d <= new Date(endDate);
  });
}

function computeMetrics(records) {
  if (records.length === 0) return null;
  const total = records.length;
  const blocked = records.filter(r => r.was_blocked).length;
  const blockedRate = blocked / total;

  let p0Count = 0, p1Count = 0, p2Count = 0;
  const changeLevels = { T1: 0, T2: 0, T3: 0 };

  records.forEach(r => {
    p0Count += r.quality_issues?.P0?.length || 0;
    p1Count += r.quality_issues?.P1?.length || 0;
    p2Count += r.quality_issues?.P2?.length || 0;
    if (r.actual_change_level) changeLevels[r.actual_change_level] = (changeLevels[r.actual_change_level] || 0) + 1;
  });

  const p0Rate = total > 0 ? p0Count / total : 0;

  return {
    total,
    blocked,
    blockedRate,
    p0Count,
    p1Count,
    p2Count,
    p0Rate,
    changeLevels,
    badCases: records.flatMap(r => (r.bad_cases || []).map(b => `${b.agent}::${b.lesson}`)),
  };
}

// ---------- Proposals Management ----------

async function ensureProposalsFile() {
  await fsp.mkdir(IMPROVEMENT_DIR, { recursive: true });
  try { await fsp.access(PROPOSALS_FILE); } catch {
    await fsp.writeFile(PROPOSALS_FILE, '', 'utf8');
  }
}

async function readProposals() {
  await ensureProposalsFile();
  const text = await fsp.readFile(PROPOSALS_FILE, 'utf8');
  return text.split('\n').filter(l => l.trim()).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

async function writeProposals(proposals) {
  await ensureProposalsFile();
  await fsp.writeFile(PROPOSALS_FILE, proposals.map(p => JSON.stringify(p)).join('\n') + '\n', 'utf8');
}

async function writeProposal(proposal, opts) {
  await ensureProposalsFile();
  if (!proposal.id) {
    const hash = Math.random().toString(36).slice(2, 8);
    proposal.id = `${Date.now()}-${hash}`;
  }
  if (!proposal.date) proposal.date = new Date().toISOString().split('T')[0];
  if (!proposal.status) proposal.status = 'open';
  if (!proposal.trigger_op) proposal.trigger_op = 'init';
  if (!proposal.feedback) proposal.feedback = [];
  if (!proposal.eval_result) proposal.eval_result = null;
  // Enriched fields
  if (!proposal.story_name && opts && opts.name) proposal.story_name = opts.name;
  if (!proposal.source_phase) proposal.source_phase = null;
  if (!proposal.actionable_command) proposal.actionable_command = null;
  if (!proposal.linked_memory_ids) proposal.linked_memory_ids = [];

  const line = JSON.stringify(proposal);

  // Always write to global
  await fsp.appendFile(PROPOSALS_FILE, line + '\n', 'utf8');

  // Dual-write to per-story if --name provided
  const name = (opts && opts.name) || proposal.story_name;
  if (name) {
    const dir = storyImprovementDir(name);
    const file = storyProposalsFile(name);
    await fsp.mkdir(dir, { recursive: true });
    await fsp.appendFile(file, line + '\n', 'utf8');
  }

  return proposal.id;
}

async function resolveProposal(proposalId, resolvedBy, status = 'done') {
  const proposals = await readProposals();
  const idx = proposals.findIndex(p => p.id === proposalId);
  if (idx === -1) {
    console.error(`Proposal ${proposalId} not found`);
    process.exit(1);
  }
  proposals[idx].status = status;
  proposals[idx].resolvedDate = new Date().toISOString().split('T')[0];
  proposals[idx].resolved_by = resolvedBy || 'N/A';
  proposals[idx].eval_result = 'pending';
  await writeProposals(proposals);
  console.log(`Proposal ${proposalId} marked as ${status}`);
}

// ---------- 效果评估: Evaluate ----------

async function cmdEvaluate(opts) {
  const proposals = await readProposals();
  let targets = proposals.filter(p => p.status === 'done');

  if (opts.proposal) {
    targets = targets.filter(p => p.id === opts.proposal);
  }
  if (opts.since) {
    targets = targets.filter(p => p.resolvedDate >= opts.since);
  }

  if (targets.length === 0) {
    if (opts.json) {
      console.log(JSON.stringify([], null, 2));
    } else {
      console.log('> No resolved proposals to evaluate.');
    }
    return;
  }

  const records = readMemoryRecords();
  const results = [];

  for (const prop of targets) {
    const resolveDate = prop.resolvedDate;
    if (!resolveDate) continue;

    const beforeStart = new Date(resolveDate);
    beforeStart.setDate(beforeStart.getDate() - 28);
    const beforeEnd = new Date(resolveDate);
    const afterStart = new Date(resolveDate);
    const afterEnd = new Date(resolveDate);
    afterEnd.setDate(afterEnd.getDate() + 28);
    const todayStr = new Date().toISOString().split('T')[0];
    const afterEndStr = afterEnd.toISOString().split('T')[0];
    const effectiveAfterEnd = afterEndStr > todayStr ? todayStr : afterEndStr;

    const beforeRecords = filterRecordsByDateRange(records, beforeStart.toISOString().split('T')[0], resolveDate);
    const afterRecords = filterRecordsByDateRange(records, resolveDate, effectiveAfterEnd);

    const beforeMetrics = computeMetrics(beforeRecords);
    const afterMetrics = computeMetrics(afterRecords);

    if (!beforeMetrics || !afterMetrics) {
      results.push({
        proposal_id: prop.id,
        title: prop.title,
        resolved_date: resolveDate,
        verdict: 'insufficient_data',
        confidence: 'low',
        before: null,
        after: null,
      });
      continue;
    }

    // Determine verdict
    const blockedImproved = afterMetrics.blockedRate <= beforeMetrics.blockedRate;
    const p0Improved = afterMetrics.p0Rate <= beforeMetrics.p0Rate;
    const relatedBadCases = (prop.related_bad_cases || []);
    const badCasesDisappeared = relatedBadCases.filter(bc =>
      !afterMetrics.badCases.includes(bc)
    ).length;
    const badCasesStillPresent = relatedBadCases.filter(bc =>
      afterMetrics.badCases.includes(bc)
    ).length;

    let verdict;
    const improvements = [blockedImproved, p0Improved, badCasesDisappeared > badCasesStillPresent].filter(Boolean).length;
    const degradations = [!blockedImproved, !p0Improved, badCasesStillPresent > badCasesDisappeared].filter(Boolean).length;

    if (improvements > degradations) verdict = 'improved';
    else if (degradations > improvements) verdict = 'degraded';
    else verdict = 'neutral';

    const totalBefore = beforeMetrics.total;
    const totalAfter = afterMetrics.total;
    const confidence = (totalBefore >= 5 && totalAfter >= 5) ? 'high'
      : (totalBefore >= 3 && totalAfter >= 3) ? 'medium' : 'low';

    const evalResult = {
      proposal_id: prop.id,
      title: prop.title,
      resolved_date: resolveDate,
      before: {
        blocked_rate: beforeMetrics.blockedRate,
        p0_rate: beforeMetrics.p0Rate,
        related_bad_cases: relatedBadCases.length,
      },
      after: {
        blocked_rate: afterMetrics.blockedRate,
        p0_rate: afterMetrics.p0Rate,
        related_bad_cases_remaining: badCasesStillPresent,
      },
      verdict,
      confidence,
    };

    results.push(evalResult);

    // Write eval_result back to proposals.jsonl
    const idx = proposals.findIndex(p => p.id === prop.id);
    if (idx !== -1) {
      proposals[idx].eval_result = verdict;
      proposals[idx].eval_date = new Date().toISOString().split('T')[0];
    }
  }

  await writeProposals(proposals);

  if (opts.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  console.log(`# Proposal Effectiveness Evaluation (${results.length} proposals)\n`);
  if (results.length === 0) {
    console.log('> No evaluations produced.');
    return;
  }

  console.log(`| Proposal | Resolved | Blocked | P0 | Bad Cases | Verdict | Confidence |`);
  console.log(`|----------|----------|---------|-----|-----------|---------|------------|`);
  for (const r of results) {
    const beforeBlocked = r.before ? `${(r.before.blocked_rate * 100).toFixed(0)}%` : 'N/A';
    const afterBlocked = r.after ? `${(r.after.blocked_rate * 100).toFixed(0)}%` : 'N/A';
    const blockedArrow = r.before && r.after ? (r.after.blocked_rate < r.before.blocked_rate ? '↓' : r.after.blocked_rate > r.before.blocked_rate ? '↑' : '=') : '?';
    const beforeP0 = r.before ? `${(r.before.p0_rate * 100).toFixed(0)}%` : 'N/A';
    const afterP0 = r.after ? `${(r.after.p0_rate * 100).toFixed(0)}%` : 'N/A';
    const p0Arrow = r.before && r.after ? (r.after.p0_rate < r.before.p0_rate ? '↓' : r.after.p0_rate > r.before.p0_rate ? '↑' : '=') : '?';
    const badge = r.verdict === 'improved' ? '✅' : r.verdict === 'degraded' ? '❌' : r.verdict === 'neutral' ? '➡️' : '⚠️';
    console.log(`| ${r.title || r.proposal_id} | ${r.resolved_date} | ${beforeBlocked}→${afterBlocked}${blockedArrow} | ${beforeP0}→${afterP0}${p0Arrow} | ${r.before?.related_bad_cases || '?'}→${r.after?.related_bad_cases_remaining || '?'} | ${badge} ${r.verdict} | ${r.confidence} |`);
  }
}

// ---------- 回顾报告: Retro ----------

async function cmdRetro(opts) {
  const weeks = opts.weeks || 8;
  const records = readMemoryRecords();
  const proposals = await readProposals();

  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);
  const sinceStr = since.toISOString().split('T')[0];

  const recentRecords = filterRecordsByDateRange(records, sinceStr, new Date().toISOString().split('T')[0]);

  // 2-week window bucketing
  const windows = [];
  const windowSize = 14;
  for (let i = 0; i < weeks * 7; i += windowSize) {
    const winStart = new Date(since);
    winStart.setDate(winStart.getDate() + i);
    const winEnd = new Date(winStart);
    winEnd.setDate(winEnd.getDate() + windowSize - 1);
    const winRecords = filterRecordsByDateRange(recentRecords, winStart.toISOString().split('T')[0], winEnd.toISOString().split('T')[0]);
    const metrics = computeMetrics(winRecords);
    windows.push({
      label: `${winStart.toISOString().split('T')[0]}~${winEnd.toISOString().split('T')[0]}`,
      records: winRecords.length,
      metrics,
    });
  }

  // Proposal stats
  const openCount = proposals.filter(p => p.status === 'open').length;
  const doneCount = proposals.filter(p => p.status === 'done').length;
  const supersededCount = proposals.filter(p => p.status === 'superseded').length;
  const closureRate = (openCount + doneCount) > 0 ? doneCount / (openCount + doneCount) : 0;

  const evalResults = {};
  proposals.filter(p => p.eval_result && p.eval_result !== 'pending' && p.eval_result !== null).forEach(p => {
    evalResults[p.eval_result] = (evalResults[p.eval_result] || 0) + 1;
  });

  // Feedback stats
  const feedbackStats = { helpful: 0, neutral: 0, harmful: 0 };
  proposals.forEach(p => {
    (p.feedback || []).forEach(f => {
      if (feedbackStats[f.rating] !== undefined) feedbackStats[f.rating]++;
    });
  });

  // Detect degrading signals
  const degradingSignals = [];
  for (let i = 1; i < windows.length; i++) {
    const prev = windows[i - 1].metrics;
    const curr = windows[i].metrics;
    if (!prev || !curr) continue;
    if (curr.blockedRate > prev.blockedRate && i >= 2) {
      const prevPrev = windows[i - 2]?.metrics;
      if (prevPrev && prev.blockedRate > prevPrev.blockedRate) {
        degradingSignals.push(`Blocked rate rising for 2 consecutive windows: ${windows[i].label}`);
      }
    }
    if (curr.p0Rate > prev.p0Rate && i >= 2) {
      const prevPrev = windows[i - 2]?.metrics;
      if (prevPrev && prev.p0Rate > prevPrev.p0Rate) {
        degradingSignals.push(`P0 rate rising for 2 consecutive windows: ${windows[i].label}`);
      }
    }
  }

  // Attention items: open P0 proposals + degrading signals
  const openP0 = proposals.filter(p => p.status === 'open' && p.priority === 'P0');
  const attentionItems = [
    ...degradingSignals.map(s => ({ type: 'degrading', description: s })),
    ...openP0.map(p => ({ type: 'open_p0', description: `${p.title} (${p.id})` })),
  ];

  const retro = {
    period: `${sinceStr} ~ now`,
    total_records: recentRecords.length,
    windows,
    proposals: { open: openCount, done: doneCount, superseded: supersededCount, closureRate },
    eval_results: evalResults,
    feedback: feedbackStats,
    attention_items: attentionItems,
  };

  if (opts.json) {
    console.log(JSON.stringify(retro, null, 2));
    return;
  }

  console.log(`# Retrospective Report (${retro.period})\n`);
  console.log(`## Execution Memory Trends\n`);
  console.log(`| Window | Records | Blocked | P0 Rate | T1 | T2 | T3 |`);
  console.log(`|--------|---------|---------|---------|----|----|-----|`);
  for (const w of windows) {
    const m = w.metrics;
    if (!m) {
      console.log(`| ${w.label} | ${w.records} | N/A | N/A | N/A | N/A | N/A |`);
    } else {
      console.log(`| ${w.label} | ${w.records} | ${(m.blockedRate * 100).toFixed(0)}% | ${(m.p0Rate * 100).toFixed(0)}% | ${m.changeLevels.T1} | ${m.changeLevels.T2} | ${m.changeLevels.T3} |`);
    }
  }
  console.log();

  console.log(`## Proposal Status\n`);
  console.log(`- Open: ${openCount} | Done: ${doneCount} | Superseded: ${supersededCount}`);
  console.log(`- Closure rate: ${(closureRate * 100).toFixed(0)}%`);
  if (Object.keys(evalResults).length > 0) {
    console.log(`- Evaluation results: ${Object.entries(evalResults).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  }
  if (feedbackStats.helpful + feedbackStats.neutral + feedbackStats.harmful > 0) {
    console.log(`- Feedback: helpful=${feedbackStats.helpful}, neutral=${feedbackStats.neutral}, harmful=${feedbackStats.harmful}`);
  }
  console.log();

  if (attentionItems.length > 0) {
    console.log(`## Attention Items\n`);
    attentionItems.forEach(a => {
      const badge = a.type === 'degrading' ? '⚠️' : '🔴';
      console.log(`- ${badge} ${a.description}`);
    });
    console.log();
  }
}

// ---------- 健康评分: Health Score ----------

async function cmdHealth(opts) {
  const memoryStats = collectMemoryStats();
  const largeFiles = collectLargeFiles();
  const proposals = await readProposals();

  // 1. Stability score (T1 ratio)
  let stabilityScore = null;
  if (memoryStats) {
    const t1 = memoryStats.changeLevels?.T1 || 0;
    const t2 = memoryStats.changeLevels?.T2 || 0;
    const t3 = memoryStats.changeLevels?.T3 || 0;
    const total = t1 + t2 + t3;
    if (total > 0) {
      const t1Ratio = t1 / total;
      stabilityScore = Math.round(Math.min(100, t1Ratio / 0.7 * 100));
    }
  }

  // 2. Quality score (P0 rate)
  let qualityScore = null;
  if (memoryStats) {
    const total = memoryStats.total || 0;
    const p0 = (memoryStats.qualityIssues?.P0 || 0);
    if (total > 0) {
      const p0Rate = p0 / total;
      qualityScore = Math.round(Math.max(0, 100 - p0Rate * 200));
    } else {
      qualityScore = 100;
    }
  }

  // 3. Blocked rate score
  let blockedScore = null;
  if (memoryStats) {
    const total = memoryStats.total || 0;
    const blocked = memoryStats.blocked || 0;
    if (total > 0) {
      const blockedRate = blocked / total;
      blockedScore = Math.round(Math.max(0, 100 - blockedRate * 200));
    } else {
      blockedScore = 100;
    }
  }

  // 4. Proposal closure score
  const openCount = proposals.filter(p => p.status === 'open').length;
  const doneCount = proposals.filter(p => p.status === 'done').length;
  let closureScore = (openCount + doneCount) > 0 ? Math.round(doneCount / (openCount + doneCount) * 100) : 100;

  // 5. Cohesion score (large files)
  let cohesionScore = largeFiles.length === 0 ? 100 : Math.round(Math.max(0, 100 - largeFiles.length * 15));

  // Composite
  const weights = { stability: 0.20, quality: 0.25, blocked: 0.20, closure: 0.20, cohesion: 0.15 };
  const scores = { stability: stabilityScore, quality: qualityScore, blocked: blockedScore, closure: closureScore, cohesion: cohesionScore };

  let composite = 0;
  let totalWeight = 0;
  for (const [dim, weight] of Object.entries(weights)) {
    if (scores[dim] !== null) {
      composite += scores[dim] * weight;
      totalWeight += weight;
    }
  }
  composite = totalWeight > 0 ? Math.round(composite / totalWeight) : null;

  // Compare with last health score
  let lastHealth = null;
  try {
    const raw = await fsp.readFile(HEALTH_CACHE_FILE, 'utf8');
    lastHealth = JSON.parse(raw);
  } catch { /* no previous score */ }

  const healthResult = {
    timestamp: new Date().toISOString(),
    composite,
    dimensions: scores,
    last: lastHealth ? { composite: lastHealth.composite, date: lastHealth.timestamp } : null,
    delta: lastHealth && composite !== null && lastHealth.composite !== null ? composite - lastHealth.composite : null,
  };

  // Save current health
  await fsp.mkdir(IMPROVEMENT_DIR, { recursive: true });
  await fsp.writeFile(HEALTH_CACHE_FILE, JSON.stringify(healthResult), 'utf8');

  if (opts.json) {
    console.log(JSON.stringify(healthResult, null, 2));
    return;
  }

  console.log(`# Project Health Score\n`);
  console.log(`> Generated at: ${healthResult.timestamp}\n`);
  if (composite !== null) {
    const deltaStr = healthResult.delta !== null ? ` (${healthResult.delta > 0 ? '+' : ''}${healthResult.delta})` : '';
    console.log(`**Composite: ${composite}/100**${deltaStr}\n`);
  }

  console.log(`| Dimension | Score | Weight | Full Score |`);
  console.log(`|------------|-------|--------|------------|`);
  for (const [dim, weight] of Object.entries(weights)) {
    const s = scores[dim];
    const full = s !== null ? Math.round(s * weight) : null;
    console.log(`| ${dim} | ${s !== null ? s : 'N/A'} | ${(weight * 100).toFixed(0)}% | ${full !== null ? full : 'N/A'} |`);
  }
  console.log();

  if (lastHealth) {
    console.log(`> Previous score: ${lastHealth.composite || 'N/A'} (at ${lastHealth.timestamp})\n`);
  }
}

// ---------- Feedback ----------

async function cmdFeedback(proposalId, rating, note) {
  if (!proposalId) {
    console.error('Usage: node self-improve.js feedback <proposal-id> --rating <helpful|neutral|harmful> [--note "..."]');
    process.exit(1);
  }
  if (!rating || !RATING_VALUES.has(rating)) {
    console.error(`Rating must be one of: helpful, neutral, harmful`);
    process.exit(1);
  }

  const proposals = await readProposals();
  const idx = proposals.findIndex(p => p.id === proposalId);
  if (idx === -1) {
    console.error(`Proposal ${proposalId} not found`);
    process.exit(1);
  }

  if (!proposals[idx].feedback) proposals[idx].feedback = [];
  proposals[idx].feedback.push({
    rating,
    note: note || '',
    date: new Date().toISOString().split('T')[0],
  });

  await writeProposals(proposals);
  console.log(`Feedback recorded for ${proposalId}: ${rating}${note ? ` — "${note}"` : ''}`);
}

// ---------- Existing Commands ----------

function cmdSnapshot(jsonOutput) {
  const memory = collectMemoryStats();
  const git = collectGitHeatmap();
  const deps = collectDependencyMatrix();
  const largeFiles = collectLargeFiles();

  const snapshot = {
    timestamp: new Date().toISOString(),
    memory,
    git,
    dependencies: deps,
    cohesionRisks: largeFiles,
  };

  if (jsonOutput) {
    console.log(JSON.stringify(snapshot, null, 2));
  } else {
    console.log(`# Project State Snapshot`);
    console.log(`> Generated at: ${snapshot.timestamp}\n`);

    if (memory) {
      console.log(`## Execution Memory`);
      console.log(`- Total records: ${memory.total || 0}`);
      console.log(`- Blocked: ${memory.blocked || 0}`);
      console.log(`- Change levels: T1=${memory.changeLevels?.T1 || 0}, T2=${memory.changeLevels?.T2 || 0}, T3=${memory.changeLevels?.T3 || 0}\n`);
    }

    console.log(`## Git Heatmap (${git.period})`);
    console.log(`- Files changed: ${git.totalFiles}, +${git.totalInsertions}/-${git.totalDeletions}`);
    console.log(`- Commits: feat=${git.commitTypes.feat}, fix=${git.commitTypes.fix}, refactor=${git.commitTypes.refactor}, docs=${git.commitTypes.docs}\n`);
    if (git.fileHeatmap.length > 0) {
      console.log(`| File | Changes |`);
      console.log(`|------|---------|`);
      git.fileHeatmap.forEach(f => console.log(`| ${f.file} | ${f.changes} |`));
      console.log();
    }

    console.log(`## Dependency Hotspots (Fan-In)`);
    if (deps.hotspots.length > 0) {
      console.log(`| Target | Fan-In |`);
      console.log(`|--------|--------|`);
      deps.hotspots.forEach(h => console.log(`| ${h.target} | ${h.fanIn} |`));
    } else {
      console.log('> No cross-project dependency hotspots detected.');
    }
    console.log();

    if (largeFiles.length > 0) {
      console.log(`## Cohesion Risks (Files >300 lines)`);
      console.log(`| File | Lines |`);
      console.log(`|------|-------|`);
      largeFiles.forEach(f => console.log(`| ${f.file} | ${f.lines} |`));
      console.log();
    }
  }
}

async function cmdProposals(statusFilter, triggerFilter, jsonOutput, nameFilter) {
  const proposals = await readProposals();
  let filtered = proposals;
  if (statusFilter) {
    filtered = filtered.filter(p => p.status === statusFilter);
  }
  if (triggerFilter) {
    filtered = filtered.filter(p => p.trigger_op === triggerFilter);
  }
  if (nameFilter) {
    filtered = filtered.filter(p => (p.story_name || '') === nameFilter);
  }

  if (jsonOutput) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }

  console.log(`# Improvement Proposals (${filtered.length} total)\n`);
  if (filtered.length === 0) {
    console.log('> No proposals found.');
    return;
  }

  filtered.forEach((p, i) => {
    const badge = p.status === 'open' ? '🟡' : p.status === 'done' ? '✅' : '⏭️';
    const evalBadge = p.eval_result === 'improved' ? '📈' : p.eval_result === 'degraded' ? '📉' : p.eval_result === 'neutral' ? '➡️' : p.eval_result === 'pending' ? '⏳' : '';
    console.log(`${i + 1}. ${badge} ${evalBadge} [${p.priority}] ${p.title}`);
    console.log(`   Type: ${p.type} | Source: ${p.problem_source || 'N/A'}${p.story_name ? ' | Story: ' + p.story_name : ''}${p.source_phase ? ' | Phase: ' + p.source_phase : ''}`);
    console.log(`   ID: ${p.id} | Date: ${p.date} | Status: ${p.status}`);
    if (p.evidence) console.log(`   Evidence: ${p.evidence}`);
    if (p.actionable_command) console.log(`   Command: \`${p.actionable_command}\``);
    if (p.current_state) console.log(`   Current: ${p.current_state}`);
    if (p.target_state) console.log(`   Target: ${p.target_state}`);
    if (p.s1_metrics) console.log(`   架构: coupling=${p.s1_metrics.coupling_hotspots} cohesion=${p.s1_metrics.cohesion_risks} boundary=${p.s1_metrics.boundary_gaps}`);
    if (p.s2_metrics) console.log(`   工流: blocked_rate=${p.s2_metrics.blocked_rate} avg_p0_rounds=${p.s2_metrics.avg_p0_rounds}`);
    if (p.resolved_by) console.log(`   Resolved by: ${p.resolved_by}`);
    if (p.eval_result) console.log(`   Eval: ${p.eval_result} (${p.eval_date || 'N/A'})`);
    if ((p.linked_memory_ids || []).length > 0) console.log(`   Linked memories: ${p.linked_memory_ids.join(', ')}`);
    if ((p.feedback || []).length > 0) {
      const fSummary = p.feedback.map(f => `${f.rating}`).join(',');
      console.log(`   Feedback: ${fSummary}`);
    }
    console.log();
  });
}

async function cmdResolve(proposalId, resolvedBy) {
  if (!proposalId) {
    console.error('Usage: node self-improve.js resolve <proposal-id> [--resolved-by "<description>"]');
    process.exit(1);
  }
  await resolveProposal(proposalId, resolvedBy);
}

// ---------- Main ----------

async function main() {
  const args = process.argv.slice(2);

  const command = args[0];
  const jsonOutput = args.includes('--json');
  const outputIdx = args.indexOf('--output');
  const outputPath = outputIdx !== -1 ? args[outputIdx + 1] : null;
  const statusIdx = args.indexOf('--status');
  const statusFilter = statusIdx !== -1 ? args[statusIdx + 1] : null;
  const triggerIdx = args.indexOf('--trigger');
  const triggerFilter = triggerIdx !== -1 ? args[triggerIdx + 1] : null;
  const proposalIdx = args.indexOf('--proposal');
  const proposalFilter = proposalIdx !== -1 ? args[proposalIdx + 1] : null;
  const sinceIdx = args.indexOf('--since');
  const sinceFilter = sinceIdx !== -1 ? args[sinceIdx + 1] : null;
  const weeksIdx = args.indexOf('--weeks');
  const weeks = weeksIdx !== -1 ? parseInt(args[weeksIdx + 1], 10) : null;
  const ratingIdx = args.indexOf('--rating');
  const rating = ratingIdx !== -1 ? args[ratingIdx + 1] : null;
  const noteIdx = args.indexOf('--note');
  const note = noteIdx !== -1 ? args[noteIdx + 1] : null;
  const resolvedByIdx = args.indexOf('--resolved-by');
  const resolvedBy = resolvedByIdx !== -1 ? args[resolvedByIdx + 1] : null;
  const nameIdx = args.indexOf('--name');
  const nameFilter = nameIdx !== -1 ? args[nameIdx + 1] : null;

  const opts = { name: nameFilter };

  switch (command) {
    case 'snapshot':
      if (outputPath) {
        const origLog = console.log;
        const captured = [];
        console.log = (...a) => captured.push(a.map(String).join(' '));
        cmdSnapshot(jsonOutput);
        console.log = origLog;
        fs.writeFileSync(outputPath, captured.join('\n'), 'utf8');
        console.error(`Saved to: ${outputPath}`);
      } else {
        cmdSnapshot(jsonOutput);
      }
      break;
    case 'proposals':
      await cmdProposals(statusFilter, triggerFilter, jsonOutput, nameFilter);
      break;
    case 'resolve':
      await cmdResolve(args[1], resolvedBy);
      break;
    case 'evaluate':
      await cmdEvaluate({ proposal: proposalFilter, since: sinceFilter, json: jsonOutput });
      break;
    case 'retro':
      await cmdRetro({ weeks: weeks || 8, json: jsonOutput });
      break;
    case 'health':
      await cmdHealth({ json: jsonOutput });
      break;
    case 'feedback':
      await cmdFeedback(args[1], rating, note);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });