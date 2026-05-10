#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PROJECT = path.basename(process.cwd());
const CLAUDE_DIR = path.join(process.cwd(), '.claude');

// 向上查找 repo 根：包含完整 .claude/（有 skills/rui-claude 即认为是根）
function findRepoRoot() {
  let dir = process.cwd();
  while (true) {
    const claude = path.join(dir, '.claude');
    if (fs.existsSync(path.join(claude, 'skills', 'rui-claude'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd(); // 兜底
    dir = parent;
  }
}

const REPO_ROOT = findRepoRoot();
const ROOT_CLAUDE = path.join(REPO_ROOT, '.claude');

// ---- 同步模式 ----
// missing: 仅复制缺失文件（默认，向后兼容）
// sync:    缺失复制 + 内容差异时更新（并集同步）
// force:   无条件覆盖（强制统一）

const MODE = { MISSING: 'missing', SYNC: 'sync', FORCE: 'force' };

// ---- 业务无关项（可自动补齐） ----

const INFRA_FILES = {
  '.mcp.json': JSON.stringify({ mcpServers: {} }, null, 2) + '\n',
  'settings.json': JSON.stringify({ permissions: {} }, null, 2) + '\n',
  'settings.local.json': JSON.stringify({}, null, 2) + '\n',
};

const INFRA_DIRS = ['templates'];

// ---- 可从根同步的单文件 ----

const SYNCABLE_FILES = [
  'agents/AGENT.md',
  'agents/pm.md',
  'agents/coder.md',
  'agents/tester.md',
  'agents/reporter.md',
  'agents/security.md',
  'agents/self-improve.md',
  'rules/code-pipeline.md',
  'rules/doc-generation.md',
  'rules/gate-rules.md',
  'rules/self-improve.md',
  'rules/rui-claude.md',
];

// ---- 可从根同步的目录（递归，按文件粒度比较） ----

const SYNCABLE_DIRS = ['skills', 'templates'];

// ---- 禁止同步（项目特定） ----

const NO_SYNC = ['CLAUDE.md', 'README.md', '.git', 'docs'];

// ---- 工具函数 ----

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function filesDiffer(src, dst) {
  if (!fs.existsSync(dst)) return true; // 缺失视为差异
  try {
    return fs.readFileSync(src, 'utf8') !== fs.readFileSync(dst, 'utf8');
  } catch {
    return true; // 读取失败视为差异
  }
}

function relPath(absPath, baseClaude) {
  return path.relative(baseClaude, absPath);
}

// ---- 单文件同步（按模式） ----

function syncFile(src, dst, mode, dryRun, results) {
  const exists = fs.existsSync(dst);

  if (!exists) {
    // 缺失 → 始终复制
    if (dryRun) {
      results.copied.push({ path: dst, action: '将复制' });
    } else {
      ensureDir(path.dirname(dst));
      fs.copyFileSync(src, dst);
      results.copied.push({ path: dst, action: '复制' });
    }
  } else if (mode === MODE.FORCE) {
    // 强制覆盖
    if (dryRun) {
      results.updated.push({ path: dst, action: '将强制覆盖' });
    } else {
      fs.copyFileSync(src, dst);
      results.updated.push({ path: dst, action: '强制覆盖' });
    }
  } else if (mode === MODE.SYNC && filesDiffer(src, dst)) {
    // 内容差异 → 更新
    if (dryRun) {
      results.updated.push({ path: dst, action: '将更新（内容差异）' });
    } else {
      fs.copyFileSync(src, dst);
      results.updated.push({ path: dst, action: '更新（内容差异）' });
    }
  } else {
    results.skipped.push({ path: dst, reason: exists ? '已存在且内容一致' : '已存在' });
  }
}

// ---- 目录递归同步（按文件粒度 + 模式） ----

function syncDirContent(srcDir, dstDir, mode, dryRun, results) {
  if (!fs.existsSync(srcDir)) return;
  ensureDir(dstDir);

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(srcDir, e.name);
    const d = path.join(dstDir, e.name);

    if (e.isDirectory()) {
      syncDirContent(s, d, mode, dryRun, results);
    } else {
      syncFile(s, d, mode, dryRun, results);
    }
  }
}

// ---- 并集同步 skill 目录 ----
// 不仅检查目录是否存在，还会：
// 1. 缺失的 skill 整目录递归复制
// 2. sync/force 模式下，已有 skill 也逐文件比对更新
// 3. 确保子项目的 skill 内容与根一致（并集 = 根的内容）

function syncSkillUnion(rootSkills, targetSkills, mode, dryRun, results) {
  if (!fs.existsSync(rootSkills)) return;
  ensureDir(targetSkills);

  const rootSkillNames = fs.readdirSync(rootSkills, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);

  for (const name of rootSkillNames) {
    const srcSkillDir = path.join(rootSkills, name);
    const dstSkillDir = path.join(targetSkills, name);

    if (!fs.existsSync(dstSkillDir)) {
      // 整个 skill 目录缺失 → 全部复制
      if (dryRun) {
        results.copied.push({ path: dstSkillDir, action: '将创建目录并复制所有文件' });
      } else {
        syncDirContent(srcSkillDir, dstSkillDir, MODE.FORCE, dryRun, results);
      }
    } else if (mode === MODE.MISSING) {
      // 默认模式：目录存在则跳过，但仍检查目录内缺失文件（并集补充）
      syncDirContent(srcSkillDir, dstSkillDir, MODE.MISSING, dryRun, results);
    } else {
      // sync/force 模式：逐文件比对，更新差异
      syncDirContent(srcSkillDir, dstSkillDir, mode, dryRun, results);
    }
  }
}

// ---- 检查基础设施 ----

function checkInfra(targetClaude, dryRun) {
  const results = { fixed: [], skipped: [], business: [] };

  ensureDir(targetClaude);

  for (const [filename, content] of Object.entries(INFRA_FILES)) {
    const fp = path.join(targetClaude, filename);
    if (fs.existsSync(fp)) {
      results.skipped.push({ path: filename, reason: '已存在' });
    } else if (dryRun) {
      results.fixed.push({ path: filename, action: '将创建' });
    } else {
      try {
        fs.writeFileSync(fp, content, 'utf8');
        results.fixed.push({ path: filename, action: '创建' });
      } catch (e) {
        results.skipped.push({ path: filename, reason: `写入失败: ${e.message}` });
      }
    }
  }

  for (const dir of INFRA_DIRS) {
    const dp = path.join(targetClaude, dir);
    if (fs.existsSync(dp)) {
      results.skipped.push({ path: `${dir}/`, reason: '已存在' });
    } else if (dryRun) {
      results.fixed.push({ path: `${dir}/`, action: '将创建空目录' });
    } else {
      try {
        ensureDir(dp);
        results.fixed.push({ path: `${dir}/`, action: '创建空目录' });
      } catch (e) {
        results.skipped.push({ path: `${dir}/`, reason: `创建失败: ${e.message}` });
      }
    }
  }

  return results;
}

// ---- 从根同步到子项目 ----

function syncFromRoot(projectName, dryRun, mode) {
  const targetClaude = path.join(REPO_ROOT, projectName, '.claude');
  const results = {
    project: projectName,
    source: ROOT_CLAUDE,
    target: targetClaude,
    copied: [],
    updated: [],
    skipped: [],
    nosync: [],
    infrastructure: null,
  };

  if (!fs.existsSync(targetClaude)) {
    results.error = `子项目 ${projectName} 的 .claude/ 不存在`;
    return results;
  }

  // 1. 补齐基础设施
  results.infrastructure = checkInfra(targetClaude, dryRun);

  // 2. 并集同步 skills 目录
  const rootSkills = path.join(ROOT_CLAUDE, 'skills');
  const targetSkills = path.join(targetClaude, 'skills');
  syncSkillUnion(rootSkills, targetSkills, mode, dryRun, results);

  // 3. 同步 agents/ 和 rules/ 单文件（按模式）
  for (const rel of SYNCABLE_FILES) {
    const src = path.join(ROOT_CLAUDE, rel);
    const dst = path.join(targetClaude, rel);
    if (!fs.existsSync(src)) continue;
    syncFile(src, dst, mode, dryRun, results);
  }

  // 4. 同步 templates/ 目录（按文件粒度 + 模式）
  const rootTemplates = path.join(ROOT_CLAUDE, 'templates');
  const targetTemplates = path.join(targetClaude, 'templates');
  if (fs.existsSync(rootTemplates)) {
    syncDirContent(rootTemplates, targetTemplates, mode, dryRun, results);
  }

  // 5. 报告禁止同步项
  for (const name of NO_SYNC) {
    const src = path.join(ROOT_CLAUDE, name);
    const dst = path.join(targetClaude, name);
    if (fs.existsSync(src) && !fs.existsSync(dst)) {
      results.nosync.push({ path: name, reason: '项目特定文件，禁止自动同步' });
    }
  }

  return results;
}

// ---- 本地补齐（无 --project 时） ----

function checkLocal(dryRun) {
  return checkInfra(CLAUDE_DIR, dryRun);
}

// ---- 发现所有子项目 ----

function findSubprojects() {
  const entries = fs.readdirSync(REPO_ROOT, { withFileTypes: true });
  return entries
    .filter(e => {
      if (!e.isDirectory()) return false;
      if (e.name.startsWith('.')) return false;
      return fs.existsSync(path.join(REPO_ROOT, e.name, '.claude'));
    })
    .map(e => e.name)
    .sort();
}

// ---- --all: 批量同步所有子项目 ----

function syncAll(dryRun, mode) {
  const projects = findSubprojects();
  const allResults = [];
  for (const proj of projects) {
    const r = syncFromRoot(proj, dryRun, mode);
    allResults.push(r);
  }
  return allResults;
}

// ---- 输出 ----

function reportLocal(results) {
  console.log(`🔧 rui-claude fix: ${PROJECT}\n`);

  if (results.fixed.length > 0) {
    console.log(`已补齐（${results.fixed.length} 项）：`);
    for (const item of results.fixed) {
      console.log(`  ✅ ${item.action}: ${item.path}`);
    }
    console.log('');
  }

  if (results.skipped.length > 0) {
    console.log(`跳过（${results.skipped.length} 项）：`);
    for (const item of results.skipped) {
      console.log(`  ⏭️  ${item.path} — ${item.reason}`);
    }
    console.log('');
  }

  if (results.business && results.business.length > 0) {
    console.log(`禁止补齐 — 业务相关内容（${results.business.length} 项）：`);
    for (const item of results.business) {
      console.log(`  🚫 ${item.path} — ${item.reason}`);
    }
    console.log('');
    console.log(`> 以上 ${results.business.length} 项涉及业务定义，不可自动生成。请通过 /rui init 或 /rui-claude sync 获取。`);
    console.log('');
  }

  if (results.fixed.length === 0 && (!results.business || results.business.length === 0)) {
    console.log('✅ 配置完整，无需补齐。');
  }
}

function reportSync(results, mode) {
  const modeLabel = mode === MODE.FORCE ? ' (--force)' : mode === MODE.SYNC ? ' (--sync)' : '';
  console.log(`🔧 rui-claude fix --project ${results.project}${modeLabel}\n`);
  console.log(`源: ${results.source}`);
  console.log(`目标: ${results.target}\n`);

  if (results.error) {
    console.log(`❌ ${results.error}`);
    return;
  }

  // 基础设施
  if (results.infrastructure) {
    const infra = results.infrastructure;
    if (infra.fixed.length > 0) {
      console.log(`基础设施（${infra.fixed.length} 项）：`);
      for (const item of infra.fixed) {
        console.log(`  ✅ ${item.action}: ${item.path}`);
      }
      console.log('');
    }
  }

  // 已复制（缺失补齐）
  if (results.copied.length > 0) {
    console.log(`缺失补齐（${results.copied.length} 项）：`);
    for (const item of results.copied) {
      console.log(`  📥 ${item.action}: ${item.path}`);
    }
    console.log('');
  }

  // 已更新（内容差异同步）
  if (results.updated.length > 0) {
    console.log(`内容同步（${results.updated.length} 项）：`);
    for (const item of results.updated) {
      console.log(`  🔄 ${item.action}: ${item.path}`);
    }
    console.log('');
  }

  // 跳过
  if (results.skipped.length > 0) {
    console.log(`跳过（${results.skipped.length} 项）：`);
    for (const item of results.skipped) {
      console.log(`  ⏭️  ${item.path} — ${item.reason}`);
    }
    console.log('');
  }

  // 禁止同步
  if (results.nosync.length > 0) {
    console.log(`禁止同步（${results.nosync.length} 项）：`);
    for (const item of results.nosync) {
      console.log(`  🚫 ${item.path} — ${item.reason}`);
    }
    console.log('');
  }

  const total = results.copied.length + results.updated.length + results.nosync.length;
  if (total === 0) {
    console.log('✅ 子项目配置完整且与根一致，无需同步。');
  }
}

function reportAll(allResults, mode) {
  const modeLabel = mode === MODE.FORCE ? ' --force' : mode === MODE.SYNC ? ' --sync' : '';
  const label = `🔧 rui-claude fix --all${modeLabel}\n`;
  console.log(label);

  let totalCopied = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalNosync = 0;

  for (const r of allResults) {
    const copied = r.copied.length;
    const updated = r.updated.length;
    const infraFixed = r.infrastructure ? r.infrastructure.fixed.length : 0;
    const skipped = r.skipped.length;
    const nosync = r.nosync.length;
    totalCopied += copied + infraFixed;
    totalUpdated += updated;
    totalSkipped += skipped;
    totalNosync += nosync;

    const parts = [];
    if (copied + infraFixed > 0) parts.push(`补齐 ${copied + infraFixed}`);
    if (updated > 0) parts.push(`同步 ${updated}`);
    if (skipped > 0) parts.push(`跳过 ${skipped}`);
    if (nosync > 0) parts.push(`禁止 ${nosync}`);
    if (r.error) parts.push(`❌ ${r.error}`);

    const status = parts.length > 0 ? parts.join(' / ') : '已完整';
    console.log(`  ${r.project}: ${status}`);
  }

  console.log('');
  const syncPart = totalUpdated > 0 ? ` / 同步 ${totalUpdated}` : '';
  console.log(`合计: ${allResults.length} 个项目 — 补齐 ${totalCopied}${syncPart} / 跳过 ${totalSkipped} / 禁止 ${totalNosync}`);
}

// ---- CLI ----

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const dryRun = args.includes('--dry-run');
const allMode = args.includes('--all');
const forceMode = args.includes('--force');
const syncMode = args.includes('--sync');

// 解析 --project <name>
const projectIdx = args.indexOf('--project');
const projectName = projectIdx !== -1 ? args[projectIdx + 1] : null;

// 确定同步模式
const mode = forceMode ? MODE.FORCE : syncMode ? MODE.SYNC : MODE.MISSING;

if (args.includes('--help') || args.includes('-h')) {
  console.log('用法: node fix.js [选项] [--project <name> | --all]');
  console.log('');
  console.log('同步模式:');
  console.log('  （默认）     缺失补齐 — 仅复制子项目中不存在的文件');
  console.log('  --sync       并集同步 — 缺失补齐 + 内容差异时更新（推荐日常使用）');
  console.log('  --force      强制覆盖 — 无条件用根版本覆盖子项目所有文件');
  console.log('');
  console.log('选项:');
  console.log('  --json        输出 JSON 格式');
  console.log('  --dry-run     仅检查，不写入');
  console.log('  --project     指定子项目，从根 .claude/ 同步 skills/rules/agents/templates');
  console.log('  --all         批量同步所有子项目的 .claude/');
  console.log('  --sync        并集同步模式：缺失补齐 + 内容差异更新');
  console.log('  --force       强制覆盖模式：根版本无条件覆盖子项目');
  console.log('');
  console.log('示例:');
  console.log('  node fix.js                           # 本地基础设施补齐');
  console.log('  node fix.js --project YiAi            # 缺失补齐到 YiAi');
  console.log('  node fix.js --project YiAi --sync     # 并集同步到 YiAi（推荐）');
  console.log('  node fix.js --all --sync              # 并集同步全部子项目');
  console.log('  node fix.js --all --sync --dry-run    # 预览全部子项目同步计划');
  process.exit(0);
}

if (allMode) {
  const allResults = syncAll(dryRun, mode);
  if (jsonOutput) {
    console.log(JSON.stringify(allResults, null, 2));
  } else {
    reportAll(allResults, mode);
  }
} else if (projectName) {
  const results = syncFromRoot(projectName, dryRun, mode);
  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    reportSync(results, mode);
  }
} else if (dryRun) {
  const results = checkLocal(true);
  if (jsonOutput) {
    console.log(JSON.stringify({ project: PROJECT, ...results }, null, 2));
  } else {
    if (results.business && results.business.length > 0) {
      console.log(`业务相关缺失（${results.business.length} 项，不自动补齐）：`);
      for (const item of results.business) {
        console.log(`  🚫 ${item.path} — ${item.reason}`);
      }
    }
    const infraMissing = results.fixed ? results.fixed.length : 0;
    if (infraMissing > 0) {
      console.log(`\n可补齐基础设施（${infraMissing} 项），执行 /rui-claude fix 应用。`);
    } else if (!results.business || results.business.length === 0) {
      console.log('✅ 配置完整。');
    }
  }
} else if (syncMode || forceMode) {
  // 本地 --sync / --force：等同于从根同步到当前项目
  const results = syncFromRoot(PROJECT, false, mode);
  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    reportSync(results, mode);
  }
} else {
  // 默认：执行本地补齐
  const results = checkLocal(false);
  if (jsonOutput) {
    console.log(JSON.stringify({ project: PROJECT, ...results }, null, 2));
  } else {
    reportLocal(results);
  }
}
