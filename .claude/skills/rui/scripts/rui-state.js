#!/usr/bin/env node

/**
 * rui-state — 断点续传状态管理
 *
 * Usage:
 *   node scripts/rui-state.js save --command <cmd> --name <story-name> --stage <stage> [--blocked] [--reason <text>] [--prev-stage <stage>] [--trigger <trigger>]
 *   node scripts/rui-state.js load [--name <story-name>] [--json]
 *   node scripts/rui-state.js clear [--name <story-name>]
 *   node scripts/rui-state.js next-step
 *
 * Storage:
 *   Global: docs/.memory/rui-state.json (session state + next-step context)
 *   Per-story: docs/故事任务面板/<name>/.memory/rui-state.json (pipeline progress + change history)
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
const STORIES_DIR = path.join(REPO_ROOT, 'docs', '故事任务面板');

function storyMemoryDir(name) { return path.join(STORIES_DIR, name, '.memory'); }
function storyStateFile(name) { return path.join(storyMemoryDir(name), 'rui-state.json'); }

const ALL_PHASES = ['自适应规划', '影响分析', '架构设计', '文档生成', '预检', '测试先行', '实现', '验证', '自改进'];
const UPDATE_PHASES = ['存在性检查', '版本/结构检测', '结构补齐', '上下文解析', '变更分级', '增量更新'];

function parseArgs(argv) {
  const out = { command: null, name: null, stage: null, blocked: false, reason: '', json: false, prevStage: null, trigger: null };
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

async function main() {
  const opts = parseArgs(process.argv);
  switch (opts.action) {
    case 'save': await cmdSave(opts); break;
    case 'load': await cmdLoad(opts); break;
    case 'clear': await cmdClear(opts); break;
    case 'next-step': await cmdNextStep(); break;
    default:
      console.error(`Unknown action: ${opts.action}`);
      process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });