#!/usr/bin/env node

/**
 * rui-state — 断点续传状态管理
 *
 * Usage:
 *   node scripts/rui-state.js save --command <cmd> --name <story-name> --stage <stage> [--blocked] [--reason <text>] [--prev-stage <stage>] [--trigger <trigger>]
 *   node scripts/rui-state.js load [--name <story-name>] [--json]
 *   node scripts/rui-state.js clear [--name <story-name>]
 *   node scripts/rui-state.js next-step
 *   node scripts/rui-state.js all-init [--file <path>] [--force]
 *   node scripts/rui-state.js all-module-done --name <module-name> [--stories <csv>]
 *   node scripts/rui-state.js all-module-blocked --name <module-name> --reason <text>
 *   node scripts/rui-state.js all-status [--json]
 *
 * Storage:
 *   Global: docs/.memory/rui-state.json (session state + next-step context)
 *   Per-story: docs/故事任务面板/<name>/.memory/rui-state.json (pipeline progress + change history)
 *   All-run: docs/.memory/all-modules.json (module-level tracking for --all mode)
 *
 * Schema:
 *   session_id, command, name, story_name, current_stage, blocked, block_reason, timestamp, storyboard
 *   pipeline_progress: { phase: "completed"|"in_progress"|"blocked"|"not_started" }
 *   change_history: [{ timestamp, from_stage, to_stage, trigger }]
 *   related_proposals: string[]
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const MEMORY_DIR = path.join(REPO_ROOT, 'docs', '.memory');
const STATE_FILE = path.join(MEMORY_DIR, 'rui-state.json');
const ALL_MODULES_FILE = path.join(MEMORY_DIR, 'all-modules.json');
const STORIES_DIR = path.join(REPO_ROOT, 'docs', '故事任务面板');

function storyMemoryDir(name) { return path.join(STORIES_DIR, name, '.memory'); }
function storyStateFile(name) { return path.join(storyMemoryDir(name), 'rui-state.json'); }

const ALL_PHASES = ['自适应规划', '影响分析', '架构设计', '文档生成', '预检', '测试先行', '实现', '验证', '自改进'];
const UPDATE_PHASES = ['存在性检查', '版本/结构检测', '结构补齐', '上下文解析', '变更分级', '增量更新'];

function parseArgs(argv) {
  const out = { command: null, name: null, stage: null, blocked: false, reason: '', json: false, prevStage: null, trigger: null, file: null, stories: null, force: false };
  const args = argv.slice(2);
  out.action = args[0];
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === '--command') out.command = args[++i];
    else if (a === '--name') out.name = args[++i];
    else if (a === '--stage') out.stage = args[++i];
    else if (a === '--blocked') out.blocked = true;
    else if (a === '--reason') out.reason = args[++i];
    else if (a === '--prev-stage') out.prevStage = args[++i];
    else if (a === '--trigger') out.trigger = args[++i];
    else if (a === '--json') out.json = true;
    else if (a === '--file') out.file = args[++i];
    else if (a === '--stories') out.stories = args[++i];
    else if (a === '--force') out.force = true;
  }
  return out;
}

async function ensureDir() {
  await fsp.mkdir(MEMORY_DIR, { recursive: true });
}

async function readExistingState(name) {
  const file = name ? storyStateFile(name) : STATE_FILE;
  try {
    const raw = await fsp.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch { return null; }
}

function getPhasesForCommand(command) {
  if (command === 'update') return UPDATE_PHASES;
  return ALL_PHASES;
}

function initPipelineProgress(currentStage, command) {
  const phases = getPhasesForCommand(command);
  const progress = {};
  let found = false;
  for (const phase of phases) {
    if (phase === currentStage) { progress[phase] = 'in_progress'; found = true; }
    else if (!found) progress[phase] = 'completed';
    else progress[phase] = 'not_started';
  }
  return progress;
}

async function cmdSave(opts) {
  if (!opts.command || !opts.name || !opts.stage) {
    console.error('save requires --command, --name, and --stage');
    process.exit(1);
  }

  const existing = await readExistingState(opts.name);
  const now = new Date().toISOString();

  // Build pipeline_progress
  let pipelineProgress;
  if (existing && existing.pipeline_progress) {
    pipelineProgress = existing.pipeline_progress;
    if (opts.blocked) {
      pipelineProgress[opts.stage] = 'blocked';
    } else {
      pipelineProgress[opts.stage] = 'in_progress';
      // Mark previous phases as completed
      let found = false;
      for (const phase of ALL_PHASES) {
        if (phase === opts.stage) { found = true; continue; }
        if (!found) pipelineProgress[phase] = 'completed';
      }
    }
  } else {
    pipelineProgress = initPipelineProgress(opts.stage, opts.command);
    if (opts.blocked) pipelineProgress[opts.stage] = 'blocked';
  }

  // Build change_history
  const changeHistory = (existing && existing.change_history) ? existing.change_history : [];
  if (opts.prevStage || changeHistory.length === 0) {
    changeHistory.push({
      timestamp: now,
      from_stage: opts.prevStage || null,
      to_stage: opts.stage,
      trigger: opts.trigger || opts.command,
    });
  }

  const state = {
    session_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    command: opts.command,
    name: opts.name,
    story_name: opts.name,
    current_stage: opts.stage,
    blocked: opts.blocked,
    block_reason: opts.blocked ? (opts.reason || 'Not specified') : null,
    timestamp: now,
    storyboard: `docs/故事任务面板/${opts.name}/01-故事任务.md`,
    pipeline_progress: pipelineProgress,
    change_history: changeHistory,
    related_proposals: (existing && existing.related_proposals) ? existing.related_proposals : [],
  };

  const json = JSON.stringify(state, null, 2);

  // Always write to global
  await ensureDir();
  await fsp.writeFile(STATE_FILE, json, 'utf8');

  // Dual-write to per-story
  const sDir = storyMemoryDir(opts.name);
  await fsp.mkdir(sDir, { recursive: true });
  await fsp.writeFile(storyStateFile(opts.name), json, 'utf8');

  console.log(`State saved: ${opts.command} ${opts.name} @ ${opts.stage}${opts.blocked ? ' (BLOCKED: ' + (opts.reason || 'Not specified') + ')' : ''}`);
}

async function cmdLoad(opts) {
  const file = opts.name ? storyStateFile(opts.name) : STATE_FILE;
  try {
    const raw = await fsp.readFile(file, 'utf8');
    const state = JSON.parse(raw);

    if (opts.json) {
      console.log(JSON.stringify(state, null, 2));
      return;
    }

    const statusBadge = state.blocked ? 'BLOCKED' : 'IN PROGRESS';
    console.log(`# rui State: ${statusBadge}${opts.name ? ' · ' + opts.name : ''}`);
    console.log(`- Command: ${state.command}`);
    console.log(`- Name: ${state.name}`);
    console.log(`- Stage: ${state.current_stage}`);
    console.log(`- Timestamp: ${state.timestamp}`);
    if (state.pipeline_progress) {
      const phases = Object.entries(state.pipeline_progress)
        .map(([p, s]) => `${p}: ${s}`).join(', ');
      console.log(`- Pipeline: ${phases}`);
    }
    if (state.blocked) {
      console.log(`- Block Reason: ${state.block_reason}`);
      console.log(`\n→ Re-run the same /rui command to resume from ${state.current_stage}`);
    }
  } catch {
    if (opts.json) {
      console.log('null');
    } else {
      console.log(`> No active rui session found${opts.name ? ' for ' + opts.name : ''}.`);
    }
  }
}

async function cmdClear(opts) {
  const files = [];
  if (opts.name) {
    files.push(storyStateFile(opts.name));
  } else {
    files.push(STATE_FILE);
  }
  let cleared = 0;
  for (const f of files) {
    try { await fsp.unlink(f); cleared++; } catch {}
  }
  if (cleared > 0) console.log('State cleared.');
  else console.log('> No state file to clear.');
}

async function cmdNextStep() {
  const state = await readState();
  const storyboards = await findStoryboards();

  // Blocked → resume with pipeline context
  if (state && state.blocked) {
    const stageInfo = state.current_stage ? ` (从 ${state.current_stage} 恢复)` : '';
    const pp = state.pipeline_progress;
    if (pp) {
      const blockedPhases = Object.entries(pp).filter(([, s]) => s === 'blocked').map(([p]) => p);
      if (blockedPhases.length > 0) {
        console.log(`阻断阶段: ${blockedPhases.join(', ')}`);
      }
    }
    console.log(`重新运行 \`/rui ${state.command} ${state.name}\`${stageInfo}。阻断原因: ${state.block_reason || '未指定'}`);
    return;
  }

  // No state at all
  if (!state) {
    if (storyboards.length > 0) {
      const names = storyboards;
      // Check each storyboard's per-story state for richer suggestion
      const storyDetails = [];
      for (const n of names) {
        const ps = await readExistingState(n);
        if (ps && ps.pipeline_progress) {
          const inProgress = Object.entries(ps.pipeline_progress).find(([, s]) => s === 'in_progress');
          const blocked = Object.entries(ps.pipeline_progress).find(([, s]) => s === 'blocked');
          if (blocked) storyDetails.push(`${n}(阻断@${blocked[0]})`);
          else if (inProgress) storyDetails.push(`${n}(${inProgress[0]})`);
          else storyDetails.push(`${n}(文档完成)`);
        } else {
          storyDetails.push(n);
        }
      }
      console.log(`运行 \`/rui <name>\` 开始端到端流程。已有故事板: ${storyDetails.join(', ')}`);
    } else {
      console.log('运行 `/rui init` 初始化项目，或 `/rui doc <requirement>` 开始第一个故事。');
    }
    return;
  }

  // Not blocked, normal completion — enriched with pipeline_progress
  const { command, name } = state;
  const pp = state.pipeline_progress;

  if (command === 'init') {
    console.log('运行 `/rui doc <requirement>` 拆分需求为故事。');
  } else if (command === 'doc') {
    console.log(`运行 \`/rui code ${name}\` 开始编码实现。`);
  } else if (command === 'update') {
    // After update: suggest next based on pipeline state
    if (pp && pp['实现'] === 'completed') {
      console.log(`运行 \`/rui code ${name}\` 重新验证更新后的代码。`);
    } else if (pp && pp['文档生成'] === 'completed') {
      console.log(`运行 \`/rui code ${name}\` 开始编码。或继续 \`/rui update ${name}\` 补充更多信息。`);
    } else {
      console.log(`文档已更新。运行 \`/rui code ${name}\` 开始编码，或查看 \`/rui list\` 了解全局进度。`);
    }
  } else if (command === 'code') {
    const remaining = storyboards.filter(n => n !== name);
    if (remaining.length > 0) {
      console.log(`运行 \`/rui code ${remaining[0]}\` 继续下一个故事。剩余故事: ${remaining.join(', ')}`);
    } else {
      console.log('所有故事已处理完毕。运行 `/rui init` 进行健康检查，或创建新故事。');
    }
  } else {
    // Full pipeline (端到端)
    if (storyboards.length > 0) {
      const remaining = storyboards.filter(n => n !== name);
      if (remaining.length > 0) {
        console.log(`运行 \`/rui ${remaining[0]}\` 继续下一个故事。剩余故事: ${remaining.join(', ')}`);
      } else {
        console.log('所有故事已处理完毕。');
      }
    } else {
      console.log('运行 `/rui <name>` 开始下一个端到端流程。');
    }
  }
}

async function readState() {
  try {
    const raw = await fsp.readFile(STATE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function findStoryboards() {
  const dir = path.join(REPO_ROOT, 'docs', '故事任务面板');
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => e.name)
      .sort();
  } catch {
    return [];
  }
}

// ── all-modules helpers ──

async function readAllModules() {
  try {
    const raw = await fsp.readFile(ALL_MODULES_FILE, 'utf8');
    return JSON.parse(raw);
  } catch { return null; }
}

async function writeAllModules(data) {
  await ensureDir();
  data.updated_at = new Date().toISOString();
  await fsp.writeFile(ALL_MODULES_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) { resolve(''); return; }
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

function validateModules(modules) {
  if (!Array.isArray(modules) || modules.length === 0) {
    return 'modules must be a non-empty array';
  }
  const names = new Set();
  for (let i = 0; i < modules.length; i++) {
    const m = modules[i];
    if (!m.name || typeof m.name !== 'string' || !m.name.trim()) {
      return `modules[${i}].name is required and must be a non-empty string`;
    }
    if (names.has(m.name)) {
      return `duplicate module name: "${m.name}"`;
    }
    names.add(m.name);
  }
  return null;
}

function normalizeModules(modules) {
  return modules.map((m, i) => ({
    name: m.name.trim(),
    description: m.description || '',
    source_dirs: Array.isArray(m.source_dirs) ? m.source_dirs : [],
    order: m.order != null ? m.order : i + 1,
    status: 'pending',
    block_reason: null,
    stories_created: [],
    started_at: null,
    completed_at: null,
  }));
}

function formatDuration(startedAt) {
  const ms = Date.now() - new Date(startedAt).getTime();
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}min`;
  return `${Math.round(ms / 3600000)}h${Math.round((ms % 3600000) / 60000)}min`;
}

// ── all-* commands ──

async function cmdAllInit(opts) {
  // Check for existing run
  const existing = await readAllModules();
  if (existing && (existing.status === 'in_progress' || existing.status === 'blocked') && !opts.force) {
    const pending = existing.modules.filter(m => m.status === 'pending' || m.status === 'in_progress');
    const blocked = existing.modules.filter(m => m.status === 'blocked');
    console.error(`⚠ Existing --all run found (status: ${existing.status}) with ${pending.length} pending, ${blocked.length} blocked modules.`);
    console.error(`  Run \`node skills/rui/scripts/rui-state.js all-status\` to see progress. Use --force to overwrite.`);
    process.exit(1);
  }

  // Read input
  let input;
  if (opts.file) {
    input = await fsp.readFile(opts.file, 'utf8');
  } else {
    input = await readStdin();
  }

  if (!input || !input.trim()) {
    console.error('No input provided. Pipe JSON to stdin or use --file <path>.');
    console.error('Expected format: {"modules":[{"name":"...","description":"...","source_dirs":[...]},...]}');
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch (e) {
    console.error(`Invalid JSON input: ${e.message}`);
    process.exit(1);
  }

  const err = validateModules(parsed.modules);
  if (err) {
    console.error(`Validation error: ${err}`);
    process.exit(1);
  }

  const now = new Date().toISOString();
  const data = {
    session_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    started_at: now,
    updated_at: now,
    status: 'in_progress',
    modules: normalizeModules(parsed.modules),
  };

  await writeAllModules(data);
  console.log(`All run initialized: ${data.modules.length} modules pending`);
}

async function cmdAllModuleDone(opts) {
  if (!opts.name) {
    console.error('--name <module-name> is required');
    process.exit(1);
  }

  const data = await readAllModules();
  if (!data) {
    console.error('No active --all run found. Run all-init first.');
    process.exit(1);
  }

  const mod = data.modules.find(m => m.name === opts.name);
  if (!mod) {
    console.error(`Module "${opts.name}" not found in module list.`);
    process.exit(1);
  }

  const now = new Date().toISOString();
  mod.status = 'completed';
  mod.completed_at = now;
  if (!mod.started_at) mod.started_at = now;
  if (opts.stories) {
    const newStories = opts.stories.split(',').map(s => s.trim()).filter(Boolean);
    for (const s of newStories) {
      if (!mod.stories_created.includes(s)) mod.stories_created.push(s);
    }
  }

  // Update top-level status
  const allTerminal = data.modules.every(m => m.status === 'completed' || m.status === 'blocked');
  if (allTerminal) {
    data.status = data.modules.some(m => m.status === 'blocked') ? 'blocked' : 'completed';
  }

  const done = data.modules.filter(m => m.status === 'completed').length;
  const total = data.modules.length;
  await writeAllModules(data);
  console.log(`Module "${opts.name}" marked as completed [${done}/${total} done]`);
}

async function cmdAllModuleBlocked(opts) {
  if (!opts.name) {
    console.error('--name <module-name> is required');
    process.exit(1);
  }
  if (!opts.reason) {
    console.error('--reason <text> is required');
    process.exit(1);
  }

  const data = await readAllModules();
  if (!data) {
    console.error('No active --all run found. Run all-init first.');
    process.exit(1);
  }

  const mod = data.modules.find(m => m.name === opts.name);
  if (!mod) {
    console.error(`Module "${opts.name}" not found in module list.`);
    process.exit(1);
  }

  mod.status = 'blocked';
  mod.block_reason = opts.reason;
  mod.completed_at = null;
  data.status = 'blocked';

  await writeAllModules(data);
  console.log(`Module "${opts.name}" blocked: ${opts.reason}`);
}

async function cmdAllStatus(opts) {
  const data = await readAllModules();
  if (!data) {
    console.log('> No active --all run found. Run /rui init --all first.');
    process.exit(0);
  }

  if (opts.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const done = data.modules.filter(m => m.status === 'completed').length;
  const blocked = data.modules.filter(m => m.status === 'blocked').length;
  const total = data.modules.length;
  const duration = formatDuration(data.started_at);

  const statusBadge = data.status === 'completed' ? '✅ 完成' :
    data.status === 'blocked' ? '⛔ 有阻断' : '🔄 进行中';

  console.log(`📦 rui init --all 模块进度 · ${statusBadge} · ${done}/${total} 完成 · 已运行 ${duration}\n`);
  console.log('| # | 模块 | 状态 | 故事数 | 备注 |');
  console.log('|---|------|------|--------|------|');

  const statusIcon = { pending: '⏳', in_progress: '🔄', completed: '✅', blocked: '⛔' };
  const statusLabel = { pending: '待处理', in_progress: '进行中', completed: '完成', blocked: '阻断' };

  for (const m of data.modules) {
    const icon = statusIcon[m.status] || '?';
    const label = statusLabel[m.status] || m.status;
    const storyCount = m.stories_created.length;
    const note = m.status === 'blocked' ? m.block_reason || '—' : '—';
    console.log(`| ${m.order} | ${m.name} | ${icon} ${label} | ${storyCount} | ${note} |`);
  }

  const blockedMods = data.modules.filter(m => m.status === 'blocked');
  if (blockedMods.length > 0) {
    console.log(`\n阻断: ${blockedMods.length} 个模块需要人工介入`);
  }
}

async function main() {
  const opts = parseArgs(process.argv);
  switch (opts.action) {
    case 'save': await cmdSave(opts); break;
    case 'load': await cmdLoad(opts); break;
    case 'clear': await cmdClear(opts); break;
    case 'next-step': await cmdNextStep(); break;
    case 'all-init': await cmdAllInit(opts); break;
    case 'all-module-done': await cmdAllModuleDone(opts); break;
    case 'all-module-blocked': await cmdAllModuleBlocked(opts); break;
    case 'all-status': await cmdAllStatus(opts); break;
    default:
      console.error(`Unknown action: ${opts.action}`);
      process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });