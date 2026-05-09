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

// ---- 业务无关项（可自动补齐） ----

const INFRA_FILES = {
  '.mcp.json': JSON.stringify({ mcpServers: {} }, null, 2) + '\n',
  'settings.json': JSON.stringify({ permissions: {} }, null, 2) + '\n',
  'settings.local.json': JSON.stringify({}, null, 2) + '\n',
};

const INFRA_DIRS = ['templates'];

// ---- 业务相关项（禁止自动生成，但可从根同步） ----

const BUSINESS_FILES = [
  'CLAUDE.md',
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
  'rules/rui-docs.md',
];

// ---- 可从根同步的目录 — 递归复制整个目录 ----

const SYNCABLE_DIRS = ['skills', 'templates'];

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
  'rules/rui-docs.md',
];

// ---- 禁止同步（项目特定） ----

const NO_SYNC = ['CLAUDE.md', 'README.md', '.git', 'docs'];

function isDirEmpty(dir) {
  if (!fs.existsSync(dir)) return true;
  return fs.readdirSync(dir).length === 0;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dst, dryRun, results) {
  if (!fs.existsSync(src)) return;
  ensureDir(dst);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) {
      copyDir(s, d, dryRun, results);
    } else if (fs.existsSync(d)) {
      results.skipped.push({ path: d, reason: '已存在' });
    } else if (dryRun) {
      results.copied.push({ path: d, action: '将复制' });
    } else {
      ensureDir(path.dirname(d));
      fs.copyFileSync(s, d);
      results.copied.push({ path: d, action: '复制' });
    }
  }
}

function syncSkillDir(srcSkill, dstSkill, dryRun, results) {
  if (!fs.existsSync(srcSkill)) return;
  // Always delegate to copyDir for granular per-file syncing — it skips existing files
  if (!fs.existsSync(dstSkill)) {
    if (dryRun) {
      results.copied.push({ path: dstSkill, action: '将创建目录并复制所有文件' });
      return;
    }
  }
  copyDir(srcSkill, dstSkill, dryRun, results);
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

// ---- 从根同步业务文件到子项目 ----

function syncFromRoot(projectName, dryRun) {
  const targetClaude = path.join(REPO_ROOT, projectName, '.claude');
  const results = {
    project: projectName,
    source: ROOT_CLAUDE,
    target: targetClaude,
    copied: [],
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

  // 2. 同步 skills 目录（整目录复制缺失的 skill）
  const rootSkills = path.join(ROOT_CLAUDE, 'skills');
  const targetSkills = path.join(targetClaude, 'skills');
  if (fs.existsSync(rootSkills)) {
    ensureDir(targetSkills);
    const skillNames = fs.readdirSync(rootSkills, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);
    for (const name of skillNames) {
      syncSkillDir(
        path.join(rootSkills, name),
        path.join(targetSkills, name),
        dryRun,
        results
      );
    }
  }

  // 3. 同步 agents/ 和 rules/ 单文件
  for (const rel of SYNCABLE_FILES) {
    const src = path.join(ROOT_CLAUDE, rel);
    const dst = path.join(targetClaude, rel);
    if (!fs.existsSync(src)) continue;
    if (fs.existsSync(dst)) {
      results.skipped.push({ path: rel, reason: '已存在' });
    } else if (dryRun) {
      results.copied.push({ path: rel, action: '将复制' });
    } else {
      try {
        ensureDir(path.dirname(dst));
        fs.copyFileSync(src, dst);
        results.copied.push({ path: rel, action: '复制' });
      } catch (e) {
        results.skipped.push({ path: rel, reason: `复制失败: ${e.message}` });
      }
    }
  }

  // 4. 同步 templates/ 目录（整目录复制内容）
  const rootTemplates = path.join(ROOT_CLAUDE, 'templates');
  const targetTemplates = path.join(targetClaude, 'templates');
  if (fs.existsSync(rootTemplates)) {
    copyDir(rootTemplates, targetTemplates, dryRun, results);
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

// ---- 原始检查（无 --project 时） ----

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

function syncAll(dryRun) {
  const projects = findSubprojects();
  const allResults = [];
  for (const proj of projects) {
    const r = syncFromRoot(proj, dryRun);
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

function reportSync(results) {
  console.log(`🔧 rui-claude fix --project ${results.project}\n`);
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

  // 已复制
  if (results.copied.length > 0) {
    console.log(`从根同步（${results.copied.length} 项）：`);
    for (const item of results.copied) {
      console.log(`  ✅ ${item.action}: ${item.path}`);
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

  const total = results.copied.length + results.nosync.length;
  if (total === 0) {
    console.log('✅ 子项目配置完整，无需同步。');
  }
}

function reportAll(allResults) {
  const label = '🔧 rui-claude fix --all\n';
  console.log(label);

  let totalCopied = 0;
  let totalSkipped = 0;
  let totalNosync = 0;

  for (const r of allResults) {
    const copied = r.copied.length;
    const infraFixed = r.infrastructure ? r.infrastructure.fixed.length : 0;
    const skipped = r.skipped.length;
    const nosync = r.nosync.length;
    totalCopied += copied + infraFixed;
    totalSkipped += skipped;
    totalNosync += nosync;

    const parts = [];
    if (copied + infraFixed > 0) parts.push(`同步 ${copied + infraFixed}`);
    if (skipped > 0) parts.push(`跳过 ${skipped}`);
    if (nosync > 0) parts.push(`禁止 ${nosync}`);
    if (r.error) parts.push(`❌ ${r.error}`);

    const status = parts.length > 0 ? parts.join(' / ') : '已完整';
    console.log(`  ${r.project}: ${status}`);
  }

  console.log('');
  console.log(`合计: ${allResults.length} 个项目 — 同步 ${totalCopied} / 跳过 ${totalSkipped} / 禁止 ${totalNosync}`);
}

// ---- CLI ----

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const dryRun = args.includes('--dry-run');
const allMode = args.includes('--all');

// 解析 --project <name>
const projectIdx = args.indexOf('--project');
const projectName = projectIdx !== -1 ? args[projectIdx + 1] : null;

if (args.includes('--help') || args.includes('-h')) {
  console.log('用法: node fix.js [--json] [--dry-run] [--project <name> | --all]');
  console.log('  --json        输出 JSON');
  console.log('  --dry-run     仅检查，不写入');
  console.log('  --project     指定子项目，从根 .claude/ 同步 skills/rules/agents/templates');
  console.log('  --all         批量同步所有子项目的 .claude/');
  process.exit(0);
}

if (allMode) {
  // 批量同步所有子项目
  const allResults = syncAll(dryRun);
  if (jsonOutput) {
    console.log(JSON.stringify(allResults, null, 2));
  } else {
    reportAll(allResults);
  }
} else if (projectName) {
  // 从根同步到子项目
  const results = syncFromRoot(projectName, dryRun);
  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    reportSync(results);
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
} else {
  // 默认：执行本地补齐
  const results = checkLocal(false);
  if (jsonOutput) {
    console.log(JSON.stringify({ project: PROJECT, ...results }, null, 2));
  } else {
    reportLocal(results);
  }
}
