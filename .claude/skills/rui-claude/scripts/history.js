#!/usr/bin/env node

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');

const PROJECT = path.basename(process.cwd());
const CLAUDE_DIR = path.join(process.cwd(), '.claude');
const HISTORY_DIR = path.join(CLAUDE_DIR, '.history');
const HISTORY_FILE = path.join(HISTORY_DIR, 'rui-claude-history.jsonl');

function uid() {
  return crypto.randomUUID().slice(0, 8);
}

function ts() {
  return new Date().toISOString();
}

// ---------- record ----------

async function record(opts) {
  await fsp.mkdir(HISTORY_DIR, { recursive: true });

  const entry = {
    session_id: uid(),
    timestamp: ts(),
    command: opts.command,
    args: opts.args || {},
    project: PROJECT,
    outcome: opts.outcome || 'unknown',
    duration_ms: opts.durationMs || null,
    summary: opts.summary || '',
  };

  const line = JSON.stringify(entry) + '\n';
  await fsp.appendFile(HISTORY_FILE, line, 'utf8');

  if (!opts.quiet) {
    console.log(`📝 已记录: ${opts.command} (${entry.session_id})`);
  }

  return entry;
}

// ---------- list ----------

async function listHistory(opts) {
  if (!fs.existsSync(HISTORY_FILE)) {
    if (opts.json) {
      console.log(JSON.stringify([]));
    } else {
      console.log('📭 暂无 rui-claude 操作记录。');
      console.log(`   记录文件: ${HISTORY_FILE}`);
    }
    return;
  }

  const raw = await fsp.readFile(HISTORY_FILE, 'utf8');
  const lines = raw.trim().split('\n').filter(Boolean);
  const entries = lines.map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);

  const limit = opts.limit || 20;
  const recent = entries.slice(-limit).reverse();

  if (opts.json) {
    console.log(JSON.stringify(recent, null, 2));
    return;
  }

  if (entries.length === 0) {
    console.log('📭 暂无 rui-claude 操作记录。');
    return;
  }

  console.log(`📋 rui-claude 操作历史（最近 ${Math.min(limit, entries.length)} 条，共 ${entries.length} 条）\n`);

  for (const e of recent) {
    const cmd = e.command || '?';
    const when = e.timestamp ? e.timestamp.replace('T', ' ').slice(0, 19) : '?';
    const outcome = { success: '✅', failure: '❌', blocked: '🚫', unknown: '⬜' }[e.outcome] || '⬜';
    let line = `${outcome} ${when}  /rui-claude ${cmd}`;
    if (e.args && Object.keys(e.args).length > 0) {
      line += `  ${JSON.stringify(e.args)}`;
    }
    if (e.summary) line += `\n   ${e.summary}`;
    if (e.duration_ms) line += `  (${(e.duration_ms / 1000).toFixed(1)}s)`;
    console.log(line);
  }

  console.log(`\n> 完整记录: ${HISTORY_FILE}`);
}

// ---------- stats ----------

async function stats(opts) {
  if (!fs.existsSync(HISTORY_FILE)) {
    if (opts.json) {
      console.log(JSON.stringify({ total: 0, by_command: {}, by_outcome: {} }));
    } else {
      console.log('📭 暂无 rui-claude 操作记录。');
    }
    return;
  }

  const raw = await fsp.readFile(HISTORY_FILE, 'utf8');
  const lines = raw.trim().split('\n').filter(Boolean);
  const entries = lines.map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);

  const byCommand = {};
  const byOutcome = {};
  for (const e of entries) {
    byCommand[e.command] = (byCommand[e.command] || 0) + 1;
    byOutcome[e.outcome] = (byOutcome[e.outcome] || 0) + 1;
  }

  if (opts.json) {
    console.log(JSON.stringify({ total: entries.length, by_command: byCommand, by_outcome: byOutcome }, null, 2));
    return;
  }

  console.log(`📊 rui-claude 操作统计（共 ${entries.length} 条）\n`);
  console.log('按命令:');
  for (const [cmd, n] of Object.entries(byCommand).sort()) {
    console.log(`  ${cmd}: ${n}`);
  }
  console.log('\n按结果:');
  const outcomeLabels = { success: '成功', failure: '失败', blocked: '阻断', unknown: '未知' };
  for (const [o, n] of Object.entries(byOutcome).sort()) {
    console.log(`  ${outcomeLabels[o] || o}: ${n}`);
  }
}

// ---------- CLI ----------

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('用法: node history.js <subcommand> [选项]');
    console.log('');
    console.log('子命令:');
    console.log('  record   记录一次操作');
    console.log('  list     列出最近操作历史');
    console.log('  stats    操作统计摘要');
    console.log('');
    console.log('record 选项:');
    console.log('  --command <cmd>   命令名 (sync|retro|<requirement>)');
    console.log('  --outcome <val>   结果 (success|failure|blocked)');
    console.log('  --summary <text>  操作摘要');
    console.log('  --duration <ms>   耗时（毫秒）');
    console.log('  --quiet           静默模式，不输出确认信息');
    console.log('');
    console.log('list 选项:');
    console.log('  --limit <n>       显示最近 N 条（默认 20）');
    console.log('  --json            输出 JSON');
    console.log('');
    console.log('stats 选项:');
    console.log('  --json            输出 JSON');
    console.log('');
    console.log('记录文件: .claude/.history/rui-claude-history.jsonl');
    process.exit(0);
  }

  const sub = args[0];

  if (sub === 'record') {
    const getArg = (name) => {
      const i = args.indexOf(name);
      return i !== -1 ? args[i + 1] : null;
    };
    await record({
      command: getArg('--command') || '?',
      outcome: getArg('--outcome') || 'unknown',
      summary: getArg('--summary') || '',
      durationMs: parseInt(getArg('--duration')) || null,
      quiet: args.includes('--quiet'),
    });
  } else if (sub === 'list') {
    await listHistory({
      limit: parseInt(args.includes('--limit') ? args[args.indexOf('--limit') + 1] : 20),
      json: args.includes('--json'),
    });
  } else if (sub === 'stats') {
    await stats({
      json: args.includes('--json'),
    });
  } else {
    console.error(`未知子命令: ${sub}`);
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
