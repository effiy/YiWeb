#!/usr/bin/env node

/**
 * execution-memory
 *
 * Execution memory system: records the full context and result of each rui
 * document execution, for doc-planner to query historical similar cases,
 * and for self-improve.js to analyze improvement patterns.
 *
 * Usage:
 *   node scripts/execution-memory.js write <json-file> [--name <story-name>]
 *   node scripts/execution-memory.js query [--feature <name>] [--keyword <k>] [--limit <n>] [--name <story-name>]
 *   node scripts/execution-memory.js stats [--week <YYYY-MM-DD>]
 *   node scripts/execution-memory.js ls [--limit <n>]
 *
 * Storage:
 *   Global: docs/.memory/execution-memory.jsonl (cross-story analysis)
 *   Per-story: docs/故事任务面板/<name>/.memory/execution-memory.jsonl (when --name provided)
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { getNaturalWeekRange } = require('./natural-week.js');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const MEMORY_DIR = path.join(REPO_ROOT, 'docs', '.memory');
const MEMORY_FILE = path.join(MEMORY_DIR, 'execution-memory.jsonl');
const STORIES_DIR = path.join(REPO_ROOT, 'docs', '故事任务面板');

function storyMemoryDir(name) { return path.join(STORIES_DIR, name, '.memory'); }
function storyMemoryFile(name) { return path.join(storyMemoryDir(name), 'execution-memory.jsonl'); }

function parseArgs(argv) {
  const out = { command: null, file: null, feature: null, keyword: null, limit: 10, week: null, weeks: 8, json: false, name: null };
  const args = argv.slice(2);
  out.command = args[0];
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === '--feature') out.feature = args[++i];
    else if (a === '--name') out.name = args[++i];
    else if (a === '--keyword') out.keyword = args[++i];
    else if (a === '--limit') out.limit = parseInt(args[++i], 10) || 10;
    else if (a === '--week') out.week = args[++i];
    else if (a === '--weeks') out.weeks = parseInt(args[++i], 10) || 8;
    else if (a === '--json') out.json = true;
    else if (!out.file && !a.startsWith('-')) out.file = a;
  }
  return out;
}

async function ensureMemoryFile() {
  await fsp.mkdir(MEMORY_DIR, { recursive: true });
  try {
    await fsp.access(MEMORY_FILE);
  } catch {
    await fsp.writeFile(MEMORY_FILE, '', 'utf8');
  }
}

async function readAllRecords() {
  await ensureMemoryFile();
  const text = await fsp.readFile(MEMORY_FILE, 'utf8');
  const lines = text.split('\n').filter(l => l.trim() !== '');
  return lines.map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

function matchName(record, name) {
  if (!name) return true;
  return (record.story_name || '').toLowerCase() === name.toLowerCase();
}

function matchFeature(record, featureName) {
  if (!featureName) return true;
  const f = featureName.toLowerCase();
  return (record.feature || '').toLowerCase().includes(f) ||
    (record.description || '').toLowerCase().includes(f);
}

function matchKeyword(record, keyword) {
  if (!keyword) return true;
  const k = keyword.toLowerCase();
  const haystack = [
    record.feature,
    record.description,
    ...(record.feature_fingerprint || []),
    ...(record.agents_called || []),
    ...(record.bad_cases || []).map(b => `${b.agent} ${b.lesson}`),
    ...(record.quality_issues?.P0 || []).map(q => `${q.doc_type} ${q.section} ${q.issue}`),
    ...(record.quality_issues?.P1 || []).map(q => `${q.doc_type} ${q.section} ${q.issue}`),
  ].join(' ').toLowerCase();
  return haystack.includes(k);
}

function matchWeek(record, weekDate) {
  if (!weekDate) return true;
  const weekRange = getNaturalWeekRange(new Date(weekDate));
  const ts = new Date(record.timestamp || 0);
  const recordWeek = getNaturalWeekRange(ts);
  return recordWeek.range === weekRange.range;
}

function scoreRelevance(record, featureName, keyword) {
  let score = 0;
  if (featureName) {
    const f = featureName.toLowerCase();
    if ((record.feature || '').toLowerCase() === f) score += 100;
    else if ((record.feature || '').toLowerCase().includes(f)) score += 50;
  }
  if (keyword) {
    const k = keyword.toLowerCase();
    const fp = (record.feature_fingerprint || []).join(' ').toLowerCase();
    if (fp.includes(k)) score += 30;
  }
  score += (record.quality_issues?.P0?.length || 0) * 5;
  score += (record.bad_cases?.length || 0) * 3;
  return score;
}

async function cmdWrite(filePath, opts) {
  if (!filePath) { console.error('Error: write command requires json-file argument'); process.exit(1); }
  const raw = await fsp.readFile(filePath, 'utf8');
  const record = JSON.parse(raw);
  if (!record.session_id) record.session_id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  if (!record.timestamp) record.timestamp = new Date().toISOString();

  // Enriched schema defaults
  if (!record.story_name && opts.name) record.story_name = opts.name;
  if (!record.phase_transitions) record.phase_transitions = [];
  if (!record.update_context) record.update_context = null;

  const line = JSON.stringify(record);

  // Always write to global
  await ensureMemoryFile();
  await fsp.appendFile(MEMORY_FILE, line + '\n', 'utf8');

  // Dual-write to per-story if --name provided
  if (opts.name) {
    const dir = storyMemoryDir(opts.name);
    const file = storyMemoryFile(opts.name);
    await fsp.mkdir(dir, { recursive: true });
    await fsp.appendFile(file, line + '\n', 'utf8');
  }

  console.log(`✓ Execution memory written (session_id: ${record.session_id}${opts.name ? ', story: ' + opts.name : ''})`);
}

async function cmdQuery(opts) {
  const records = await readAllRecords();
  let filtered = records.filter(r => matchFeature(r, opts.feature) && matchKeyword(r, opts.keyword) && matchWeek(r, opts.week) && matchName(r, opts.name));
  filtered.sort((a, b) => scoreRelevance(b, opts.feature, opts.keyword) - scoreRelevance(a, opts.feature, opts.keyword));
  filtered = filtered.slice(0, opts.limit);

  if (opts.json) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }

  console.log(`# Execution Memory Query Results (${filtered.length} records)\n`);
  if (filtered.length === 0) {
    console.log('> No matching records.');
    return;
  }
  filtered.forEach((r, i) => {
    console.log(`## ${i + 1}. ${r.feature || 'Unnamed'} · ${r.actual_change_level || '?'} · ${r.timestamp ? r.timestamp.slice(0, 10) : 'Unknown date'}`);
    console.log(`- **session_id**: ${r.session_id}`);
    console.log(`- **Description**: ${r.description || 'None'}`);
    console.log(`- **Fingerprint**: ${(r.feature_fingerprint || []).join(', ') || 'None'}`);
    console.log(`- **Change level**: planned=${r.planned_change_level || '?'} / actual=${r.actual_change_level || '?'}`);
    console.log(`- **Agents called**: ${(r.agents_called || []).join(', ') || 'None'}`);
    const p0 = r.quality_issues?.P0?.length || 0;
    const p1 = r.quality_issues?.P1?.length || 0;
    const p2 = r.quality_issues?.P2?.length || 0;
    console.log(`- **Quality issues**: P0=${p0} / P1=${p1} / P2=${p2}`);
    if (r.was_blocked) console.log(`- **Blocked**: ${r.block_reason || 'Not specified'}`);
    if ((r.bad_cases || []).length > 0) {
      console.log(`- **Bad cases**:`);
      r.bad_cases.forEach(b => console.log(`  - ${b.agent}: ${b.lesson}`));
    }
    console.log('');
  });
}

async function cmdStats(opts) {
  const records = await readAllRecords();
  const filtered = records.filter(r => matchWeek(r, opts.week));

  const total = filtered.length;
  const blocked = filtered.filter(r => r.was_blocked).length;
  const changeLevels = { T1: 0, T2: 0, T3: 0 };
  const agentFreq = {};
  const docTypeIssues = {};
  const sectionIssues = {};
  const lessonFreq = {};
  let p0Count = 0, p1Count = 0, p2Count = 0;

  filtered.forEach(r => {
    if (r.actual_change_level) changeLevels[r.actual_change_level] = (changeLevels[r.actual_change_level] || 0) + 1;
    (r.agents_called || []).forEach(a => { agentFreq[a] = (agentFreq[a] || 0) + 1; });
    ['P0', 'P1', 'P2'].forEach(lv => {
      (r.quality_issues?.[lv] || []).forEach(q => {
        const key = `${q.doc_type || 'unknown'}::${q.section || 'unknown'}`;
        docTypeIssues[key] = (docTypeIssues[key] || 0) + 1;
      });
    });
    ['P0', 'P1', 'P2'].forEach(lv => {
      (r.quality_issues?.[lv] || []).forEach(q => {
        const key = `${q.section || 'unknown'}::${q.issue || 'unknown'}`;
        sectionIssues[key] = (sectionIssues[key] || 0) + 1;
      });
    });
    p0Count += (r.quality_issues?.P0 || []).length;
    p1Count += (r.quality_issues?.P1 || []).length;
    p2Count += (r.quality_issues?.P2 || []).length;
    (r.bad_cases || []).forEach(b => {
      const key = `${b.agent}::${b.lesson}`;
      lessonFreq[key] = (lessonFreq[key] || 0) + 1;
    });
  });

  const topDocTypeIssues = Object.entries(docTypeIssues).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topSectionIssues = Object.entries(sectionIssues).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topLessons = Object.entries(lessonFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (opts.json) {
    console.log(JSON.stringify({ total, blocked, changeLevels, qualityIssues: { P0: p0Count, P1: p1Count, P2: p2Count }, agentFreq, topDocTypeIssues, topSectionIssues, topLessons }, null, 2));
    return;
  }

  console.log(`# Execution Memory Statistics${opts.week ? ' · ' + getNaturalWeekRange(new Date(opts.week)).range : ''}\n`);
  console.log(`- **Total records**: ${total}`);
  console.log(`- **Blocked count**: ${blocked}`);
  console.log(`- **Quality issues**: P0=${p0Count}, P1=${p1Count}, P2=${p2Count}`);
  console.log(`- **Change level distribution**: T1=${changeLevels.T1}, T2=${changeLevels.T2}, T3=${changeLevels.T3}`);
  console.log(`\n## Agent Invocation Frequency`);
  Object.entries(agentFreq).sort((a, b) => b[1] - a[1]).forEach(([a, c]) => console.log(`- ${a}: ${c}`));
  console.log(`\n## High-Frequency Quality Issues (doc type::section)`);
  topDocTypeIssues.forEach(([k, c]) => console.log(`- ${k}: ${c} times`));
  console.log(`\n## High-Frequency Section Issues (section::issue description)`);
  topSectionIssues.forEach(([k, c]) => console.log(`- ${k}: ${c} times`));
  console.log(`\n## High-Frequency Bad Case Lessons (agent::lesson)`);
  topLessons.forEach(([k, c]) => console.log(`- ${k}: ${c} times`));
}

async function cmdLs(opts) {
  const records = await readAllRecords();
  const filtered = records.filter(r => matchWeek(r, opts.week)).slice(-opts.limit);
  if (opts.json) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }
  console.log(`# Recent ${filtered.length} Execution Memory Records\n`);
  filtered.forEach((r, i) => {
    const p0 = r.quality_issues?.P0?.length || 0;
    const flag = r.was_blocked ? '❌ Blocked' : (p0 > 0 ? '⚠️ P0' : '✅');
    console.log(`${i + 1}. [${flag}] ${r.feature || 'Unnamed'} · ${r.actual_change_level || '?'} · ${r.timestamp ? r.timestamp.slice(0, 10) : '?'}`);
  });
}

async function cmdTrends(opts) {
  const records = await readAllRecords();
  const weeks = opts.weeks || 8;

  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);
  const sinceStr = since.toISOString().split('T')[0];

  const recentRecords = records.filter(r => {
    const ts = r.timestamp || 0;
    return new Date(ts) >= new Date(sinceStr);
  });

  // 2-week window bucketing using natural-week boundaries
  const windowSize = 14;
  const windows = [];
  for (let i = 0; i < weeks * 7; i += windowSize) {
    const winStart = new Date(since);
    winStart.setDate(winStart.getDate() + i);
    const winEnd = new Date(winStart);
    winEnd.setDate(winEnd.getDate() + windowSize - 1);
    const winStartStr = winStart.toISOString().split('T')[0];
    const winEndStr = winEnd.toISOString().split('T')[0];

    const winRecords = recentRecords.filter(r => {
      const ts = r.timestamp || 0;
      const d = new Date(ts);
      return d >= new Date(winStartStr) && d <= new Date(winEndStr);
    });

    const total = winRecords.length;
    const blocked = winRecords.filter(r => r.was_blocked).length;
    const blockedRate = total > 0 ? blocked / total : null;

    let p0Count = 0;
    const changeLevels = { T1: 0, T2: 0, T3: 0 };
    winRecords.forEach(r => {
      p0Count += r.quality_issues?.P0?.length || 0;
      if (r.actual_change_level) changeLevels[r.actual_change_level] = (changeLevels[r.actual_change_level] || 0) + 1;
    });
    const p0Rate = total > 0 ? p0Count / total : null;

    windows.push({
      label: `${winStartStr}~${winEndStr}`,
      total,
      blockedRate,
      p0Rate,
      changeLevels,
    });
  }

  // Compute deltas and detect degrading signals
  const degradingSignals = [];
  for (let i = 2; i < windows.length; i++) {
    const w0 = windows[i - 2];
    const w1 = windows[i - 1];
    const w2 = windows[i];
    if (w0.blockedRate === null || w1.blockedRate === null || w2.blockedRate === null) continue;
    if (w1.blockedRate > w0.blockedRate && w2.blockedRate > w1.blockedRate) {
      degradingSignals.push({ dimension: 'blocked', window: w2.label });
    }
    if (w0.p0Rate === null || w1.p0Rate === null || w2.p0Rate === null) continue;
    if (w1.p0Rate > w0.p0Rate && w2.p0Rate > w1.p0Rate) {
      degradingSignals.push({ dimension: 'p0', window: w2.label });
    }
  }

  // Compute trend arrows
  for (let i = 1; i < windows.length; i++) {
    const prev = windows[i - 1];
    const curr = windows[i];
    if (prev.blockedRate !== null && curr.blockedRate !== null) {
      curr.blockedDelta = curr.blockedRate - prev.blockedRate;
    }
    if (prev.p0Rate !== null && curr.p0Rate !== null) {
      curr.p0Delta = curr.p0Rate - prev.p0Rate;
    }
  }

  const trendResult = {
    period: `${sinceStr} ~ now`,
    windows,
    degradingSignals,
  };

  if (opts.json) {
    console.log(JSON.stringify(trendResult, null, 2));
    return;
  }

  console.log(`# Execution Memory Trends (${trendResult.period})\n`);
  console.log(`| Window | Records | Blocked | P0 Rate | T1 | T2 | T3 | Trend |`);
  console.log(`|--------|---------|---------|---------|----|----|-----|--------|`);
  for (const w of windows) {
    const blockedStr = w.blockedRate !== null ? `${(w.blockedRate * 100).toFixed(0)}%` : 'N/A';
    const p0Str = w.p0Rate !== null ? `${(w.p0Rate * 100).toFixed(0)}%` : 'N/A';
    let trendArrow = '—';
    if (w.blockedDelta !== undefined) {
      if (w.blockedDelta < 0 && (w.p0Delta === undefined || w.p0Delta < 0)) trendArrow = '↑ improving';
      else if (w.blockedDelta > 0 && (w.p0Delta === undefined || w.p0Delta > 0)) trendArrow = '↓ degrading';
      else trendArrow = '= mixed';
    }
    const isDegrading = degradingSignals.some(s => s.window === w.label);
    const flag = isDegrading ? '⚠️' : '';
    console.log(`| ${w.label} | ${w.total} | ${blockedStr} | ${p0Str} | ${w.changeLevels.T1} | ${w.changeLevels.T2} | ${w.changeLevels.T3} | ${trendArrow} ${flag} |`);
  }

  if (degradingSignals.length > 0) {
    console.log(`\n## Degrading Signals\n`);
    degradingSignals.forEach(s => {
      console.log(`- ⚠️ ${s.dimension} rate rising for 2 consecutive windows (detected at ${s.window})`);
    });
  }
  console.log();
}

async function main() {
  const opts = parseArgs(process.argv);
  switch (opts.command) {
    case 'write': await cmdWrite(opts.file, opts); break;
    case 'query': await cmdQuery(opts); break;
    case 'stats': await cmdStats(opts); break;
    case 'ls': await cmdLs(opts); break;
    case 'trends': await cmdTrends(opts); break;
    default:
      console.error(`Error: unknown command ${opts.command}`);
      process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
