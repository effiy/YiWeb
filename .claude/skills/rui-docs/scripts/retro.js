#!/usr/bin/env node

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const PROJECT = path.basename(process.cwd());
const REPO_ROOT = path.resolve(__dirname, '../../../../');
const OUTPUT_DIR = path.join(REPO_ROOT, 'docs', '自改进故事面板');
const DOCS_DIR = path.join(process.cwd(), 'docs');

function table(headers, rows) {
  let out = `| ${headers.join(' | ')} |\n`;
  out += `|${headers.map(() => '------').join('|')}|\n`;
  for (const row of rows) out += `| ${row.join(' | ')} |\n`;
  return out;
}

// ---------- frontmatter 检测 ----------

function hasFrontmatter(content) {
  return /^---\s*\n[\s\S]*?\n---/.test(content);
}

function parseFrontmatter(content) {
  const m = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

// ---------- 采集 docs/ 结构 ----------

function collectStats() {
  const stats = {
    categories: {},
    totalFiles: 0,
    totalLines: 0,
    withFrontmatter: 0,
    staleCount: 0,
    brokenLinks: 0,
    oldestFile: null,
    newestFile: null,
  };

  if (!fs.existsSync(DOCS_DIR)) return stats;

  const now = Date.now();
  const staleThreshold = 14 * 24 * 60 * 60 * 1000; // 14 days
  const allFiles = [];

  function walk(dir, cat) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const full = path.join(dir, entry);
      let stat;
      try { stat = fs.statSync(full); } catch { continue; }
      if (stat.isDirectory()) {
        walk(full, entry);
      } else if (stat.isFile() && entry.endsWith('.md')) {
        let content = '';
        try { content = fs.readFileSync(full, 'utf8'); } catch {}
        const lines = content.split('\n').length;
        const fm = hasFrontmatter(content);
        const mtime = stat.mtimeMs;
        const fstat = { path: path.relative(DOCS_DIR, full), name: entry, lines, hasFm: fm, mtime, age: now - mtime };

        if (!stats.categories[cat]) stats.categories[cat] = { files: 0, lines: 0, names: [] };
        stats.categories[cat].files++;
        stats.categories[cat].lines += lines;
        stats.categories[cat].names.push(entry);

        stats.totalFiles++;
        stats.totalLines += lines;
        if (fm) stats.withFrontmatter++;
        if (fstat.age > staleThreshold) stats.staleCount++;

        allFiles.push(fstat);
      }
    }
  }

  walk(DOCS_DIR, '(root)');

  if (allFiles.length > 0) {
    allFiles.sort((a, b) => a.mtime - b.mtime);
    stats.oldestFile = allFiles[0];
    stats.newestFile = allFiles[allFiles.length - 1];
  }

  // 交叉引用断裂检测
  const allPaths = new Set(allFiles.map(f => f.path));
  for (const f of allFiles) {
    let content = '';
    try { content = fs.readFileSync(path.join(DOCS_DIR, f.path), 'utf8'); } catch { continue; }
    const refs = content.match(/\[[^\]]+\]\(([^)]+\.md)\)/g);
    if (!refs) continue;
    for (const ref of refs) {
      const link = ref.match(/\(([^)]+)\)/)[1];
      if (!allPaths.has(link) && !link.startsWith('http')) {
        stats.brokenLinks++;
      }
    }
  }

  return stats;
}

// ---------- 生成复盘文档 ----------

function generateDoc(stats, opts) {
  const now = new Date();
  const ds = now.toISOString().split('T')[0];
  const ts = now.toISOString().split('T')[1].slice(0, 8);

  const hasDir = fs.existsSync(DOCS_DIR);

  let md = '';
  md += `# docs/ 文档复盘: ${PROJECT}\n\n`;
  md += `> | ${ds} ${ts} | claude | 🌿 main |\n`;
  if (opts.name) md += `> 关联故事: ${opts.name}\n\n`;
  else md += `> 独立复盘（非故事驱动）\n\n`;
  md += `---\n\n`;

  // §1 文档结构
  md += `## 1. 文档结构总览\n\n`;

  if (!hasDir) {
    md += `> ⚠️ docs/ 目录不存在。执行 \`/rui-docs sync\` 从远端拉取文档。\n\n`;
    md += `---\n\n> 生成方式: /rui-docs retro\n`;
    return md;
  }

  const catKeys = Object.keys(stats.categories).sort();
  md += table(
    ['目录', '文件数', '总行数'],
    catKeys.map(k => [`${k}/`, `${stats.categories[k].files}`, `${stats.categories[k].lines}`])
  );
  md += '\n';

  md += `| 总量 | 数值 |\n`;
  md += `|------|------|\n`;
  md += `| 总文件数 | ${stats.totalFiles} |\n`;
  md += `| 总行数 | ${stats.totalLines} |\n`;
  md += `| 含 frontmatter | ${stats.withFrontmatter} / ${stats.totalFiles} (${stats.totalFiles > 0 ? Math.round(stats.withFrontmatter / stats.totalFiles * 100) : 0}%) |\n`;
  md += '\n';

  for (const k of catKeys) {
    const cat = stats.categories[k];
    md += `### ${k}/\n\n`;
    for (const f of cat.names) md += `- ${f}\n`;
    md += '\n';
  }

  // §2 健康度
  md += `## 2. 文档健康度\n\n`;

  const fmRate = stats.totalFiles > 0 ? stats.withFrontmatter / stats.totalFiles : 0;
  const checks = [
    ['目录存在', '✅', ''],
    ['总文件数', stats.totalFiles > 0 ? '✅' : '⚠️', stats.totalFiles === 0 ? 'docs/ 为空' : ''],
    ['frontmatter 覆盖率', fmRate >= 0.8 ? '✅' : fmRate > 0 ? '⚠️' : '❌', fmRate < 0.8 ? `${Math.round(fmRate * 100)}% 低于 80% 阈值` : `${Math.round(fmRate * 100)}%`],
    ['陈旧文档', stats.staleCount === 0 ? '✅' : '⚠️', stats.staleCount > 0 ? `${stats.staleCount} 个文件 >14 天未更新` : '无陈旧文档'],
    ['断裂链接', stats.brokenLinks === 0 ? '✅' : '⚠️', stats.brokenLinks > 0 ? `${stats.brokenLinks} 处死链` : '无断裂链接'],
  ];

  md += table(['检查项', '状态', '详情'], checks);
  md += '\n';

  if (stats.oldestFile) {
    const oldestAge = Math.round(stats.oldestFile.age / (24 * 60 * 60 * 1000));
    const newestAge = Math.round(stats.newestFile.age / (24 * 60 * 60 * 1000));
    md += `| 最旧文件 | ${stats.oldestFile.path} (${oldestAge} 天前) |\n`;
    md += `| 最新文件 | ${stats.newestFile.path} (${newestAge} 天前) |\n\n`;
  }

  // §3 改进项
  md += `## 3. 改进项\n\n`;

  md += `### 3.1 文档质量\n\n`;
  const items = [];

  if (fmRate < 0.8) {
    items.push(['P0', '补齐缺失的 frontmatter', '元数据不完整影响文档可追溯性']);
  }
  if (stats.staleCount > 0) {
    items.push(['P1', `审查 ${stats.staleCount} 个陈旧文档`, '过期文档需归档或更新']);
  }
  if (stats.brokenLinks > 0) {
    items.push(['P1', `修复 ${stats.brokenLinks} 处断裂链接`, '死链破坏文档网络可导航性']);
  }
  items.push(
    ['P2', '评估文档分类完整性', '缺关键目录意味着管线产出未收敛'],
    ['P2', '检查模板合规度', '偏离模板的文档增加理解成本']
  );

  md += table(['优先级', '改进动作', '原因'], items);
  md += '\n';

  md += `### 3.2 流程改进\n\n`;
  md += `| # | 优先级 | 改进动作 | 原因 |\n`;
  md += `|---|--------|----------|------|\n`;
  md += `| 1 | P2 | 定期执行 retro 复盘 | 文档漂移需要可追溯 |\n`;
  md += `| 2 | P2 | 复盘文档纳入版本管理 | 团队可见文档演化历史 |\n`;
  md += `| 3 | P2 | sync 前先 retro | 拉取远端前了解本地状态 |\n`;
  md += '\n';

  md += `---\n\n`;
  md += `> 生成方式: /rui-docs retro | 数据范围: docs/ 目录\n`;

  return md;
}

// ---------- Main ----------

async function main() {
  const args = process.argv.slice(2);
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
  const filename = `${PROJECT}-docs-${new Date().toISOString().split('T')[0]}.md`;
  const outPath = path.join(OUTPUT_DIR, filename);
  await fsp.writeFile(outPath, doc, 'utf8');

  console.log(doc);
  console.log(`> 复盘文档已保存: ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
