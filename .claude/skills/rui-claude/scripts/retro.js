#!/usr/bin/env node

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const PROJECT = path.basename(process.cwd());
const OUTPUT_DIR = path.join(process.cwd(), 'docs', '自改进故事面板');
const CLAUDE_DIR = path.join(process.cwd(), '.claude');

function table(headers, rows) {
  let out = `| ${headers.join(' | ')} |\n`;
  out += `|${headers.map(() => '------').join('|')}|\n`;
  for (const row of rows) out += `| ${row.join(' | ')} |\n`;
  return out;
}

// ---------- 采集 .claude 结构 ----------

function collectStats() {
  const stats = {
    agents: { files: 0, lines: 0, names: [] },
    rules: { files: 0, lines: 0, names: [] },
    templates: { files: 0, lines: 0, names: [] },
    skills: { files: 0, lines: 0, names: [] },
    rootFiles: [],
  };

  if (!fs.existsSync(CLAUDE_DIR)) return stats;

  for (const sub of ['agents', 'rules']) {
    const dir = path.join(CLAUDE_DIR, sub);
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir).filter(f => {
      try { return fs.statSync(path.join(dir, f)).isFile(); } catch { return false; }
    });
    let lines = 0;
    for (const f of entries) {
      try {
        lines += fs.readFileSync(path.join(dir, f), 'utf8').split('\n').length;
      } catch {}
    }
    stats[sub] = { files: entries.length, lines, names: entries };
  }

  // templates: 实际路径在 skills/rui/templates/
  {
    const tdir = path.join(CLAUDE_DIR, 'skills', 'rui', 'templates');
    if (fs.existsSync(tdir)) {
      const entries = fs.readdirSync(tdir).filter(f => {
        try { return fs.statSync(path.join(tdir, f)).isFile(); } catch { return false; }
      });
      let lines = 0;
      for (const f of entries) {
        try { lines += fs.readFileSync(path.join(tdir, f), 'utf8').split('\n').length; } catch {}
      }
      stats.templates = { files: entries.length, lines, names: entries };
    }
  }

  // skills: 递归扫描子目录（skill 定义在 skills/<name>/ 下）
  {
    const sdir = path.join(CLAUDE_DIR, 'skills');
    if (fs.existsSync(sdir)) {
      const entries = [];
      const skillDirs = fs.readdirSync(sdir).filter(f => {
        try { return fs.statSync(path.join(sdir, f)).isDirectory(); } catch { return false; }
      });
      for (const sd of skillDirs) {
        const ssub = path.join(sdir, sd);
        const files = fs.readdirSync(ssub, { recursive: true }).filter(f => {
          try { return fs.statSync(path.join(ssub, f)).isFile(); } catch { return false; }
        });
        for (const f of files) {
          if (f.includes('templates/')) continue; // 模板已在独立区统计
          entries.push(`${sd}/${f}`);
        }
      }
      let lines = 0;
      for (const f of entries) {
        try { lines += fs.readFileSync(path.join(sdir, f), 'utf8').split('\n').length; } catch {}
      }
      stats.skills = { files: entries.length, lines, names: entries.sort() };
    }
  }

  for (const f of ['CLAUDE.md', '.mcp.json', 'settings.json', 'settings.local.json']) {
    const fp = path.join(CLAUDE_DIR, f);
    if (!fs.existsSync(fp)) continue;
    try {
      stats.rootFiles.push({ name: f, lines: fs.readFileSync(fp, 'utf8').split('\n').length });
    } catch {
      stats.rootFiles.push({ name: f, lines: -1 });
    }
  }

  return stats;
}

// ---------- 生成复盘文档 ----------

function generateDoc(stats, opts) {
  const now = new Date();
  const ds = now.toISOString().split('T')[0];
  const ts = now.toISOString().split('T')[1].slice(0, 8);

  const hasDir = fs.existsSync(CLAUDE_DIR);

  let md = '';
  md += `# .claude 配置复盘: ${PROJECT}\n\n`;
  md += `> | ${ds} ${ts} | claude | 🌿 main |\n`;
  if (opts.name) md += `> 关联故事: ${opts.name}\n\n`;
  else md += `> 独立复盘（非故事驱动）\n\n`;
  md += `---\n\n`;

  // §1 配置结构
  md += `## 1. 配置结构总览\n\n`;

  if (!hasDir) {
    md += `> ⚠️ .claude/ 目录不存在。执行 \`/rui-claude sync\` 从远端拉取配置。\n\n`;
    md += `---\n\n> 生成方式: /rui-claude retro\n`;
    return md;
  }

  md += table(
    ['目录', '文件数', '总行数'],
    [
      ['agents/', `${stats.agents.files}`, `${stats.agents.lines}`],
      ['rules/', `${stats.rules.files}`, `${stats.rules.lines}`],
      ['templates/', `${stats.templates.files}`, `${stats.templates.lines}`],
      ['skills/', `${stats.skills.files}`, `${stats.skills.lines}`],
    ]
  );
  md += '\n';

  if (stats.rootFiles.length > 0) {
    md += `### 根文件\n\n`;
    md += table(
      ['文件', '行数'],
      stats.rootFiles.map(f => [f.name, `${f.lines}`])
    );
    md += '\n';
  }

  for (const sub of ['agents', 'rules', 'skills']) {
    if (stats[sub].files > 0) {
      md += `### ${sub}/\n\n`;
      for (const f of stats[sub].names) md += `- ${f}\n`;
      md += '\n';
    }
  }

  // §2 健康度
  md += `## 2. 配置健康度\n\n`;

  const checks = [];
  if (stats.agents.files === 0) checks.push(['agents/ 为空', '⚠️', '需 AGENT.md 定义 Agent 身份']);
  else checks.push(['agents/ 已配置', '✅', '']);

  if (stats.rules.files === 0) checks.push(['rules/ 为空', '⚠️', '至少需 gate-rules.md']);
  else checks.push(['rules/ 已配置', '✅', '']);

  const hasClaudeMd = stats.rootFiles.some(f => f.name === 'CLAUDE.md');
  checks.push([hasClaudeMd ? 'CLAUDE.md 存在' : '缺少 CLAUDE.md',
    hasClaudeMd ? '✅' : '❌',
    hasClaudeMd ? '' : '项目级 CLAUDE.md 必须存在']);

  const hasMcp = stats.rootFiles.some(f => f.name === '.mcp.json');
  checks.push([hasMcp ? '.mcp.json 存在' : '缺少 .mcp.json',
    hasMcp ? '✅' : '⚠️',
    hasMcp ? '' : '缺少 MCP 工具配置']);

  md += table(['检查项', '状态', '建议'], checks);
  md += '\n';

  // §3 改进项
  md += `## 3. 改进项\n\n`;

  md += `### 3.1 配置架构\n\n`;
  const items = [
    ['P1', '评估 agents/ 角色覆盖完整性', '缺角色会导致特定管线阶段无 Agent 可用'],
    ['P1', '检查 rules/ 是否覆盖关键约束', '规则缺口 = 行为不可预期'],
    ['P2', '检查 skills/ 是否匹配项目工具链', '冗余 skill 增加维护成本'],
  ];
  if (stats.templates.files === 0) {
    items.unshift(['P0', 'templates/ 为空，补充核心模板', '无模板则管线产出格式不一致']);
  }
  if (!hasClaudeMd) {
    items.unshift(['P0', '创建项目级 CLAUDE.md', '缺少 CLAUDE.md 会导致 Agent 无原则约束']);
  }

  md += table(['优先级', '改进动作', '原因'], items);
  md += '\n';

  md += `### 3.2 流程改进\n\n`;
  md += `| # | 优先级 | 改进动作 | 原因 |\n`;
  md += `|---|--------|----------|------|\n`;
  md += `| 1 | P2 | 定期执行 retro 复盘 | 配置漂移需要可追溯 |\n`;
  md += `| 2 | P2 | 复盘文档纳入版本管理 | 团队可见配置演化历史 |\n`;
  md += '\n';

  md += `---\n\n`;
  md += `> 生成方式: /rui-claude retro | 数据范围: .claude/ 目录\n`;

  return md;
}

// ---------- Main ----------

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('用法: node retro.js [选项]');
    console.log('');
    console.log('  采集 .claude/ 目录统计（agents/rules/templates/skills），');
    console.log('  生成配置健康度复盘文档。');
    console.log('');
    console.log('选项:');
    console.log('  --help          显示此帮助');
    console.log('  --name <story>  关联故事名，写入文档元信息');
    console.log('  --json          输出原始统计数据（JSON），不写文件');
    console.log('');
    console.log('输出路径: docs/自改进故事面板/<project>-<date>.md');
    console.log('数据范围: .claude/ 目录，不涉及执行记忆或项目代码');
    process.exit(0);
  }

  const jsonOutput = args.includes('--json');
  const nameIdx = args.indexOf('--name');
  const storyName = nameIdx !== -1 ? args[nameIdx + 1] : null;

  const stats = collectStats();

  if (jsonOutput) {
    console.log(JSON.stringify({ project: PROJECT, stats }, null, 2));
    return;
  }

  const doc = generateDoc(stats, { name: storyName });

  await fsp.mkdir(OUTPUT_DIR, { recursive: true });
  const filename = `${PROJECT}-${new Date().toISOString().split('T')[0]}.md`;
  const outPath = path.join(OUTPUT_DIR, filename);
  await fsp.writeFile(outPath, doc, 'utf8');

  console.log(doc);
  console.log(`> 复盘文档已保存: ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
