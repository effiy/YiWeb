#!/usr/bin/env node

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../../../../');

// ---- Detect project and story from file path ----
function parsePath(filePath) {
  const rel = path.relative(REPO_ROOT, filePath);
  const parts = rel.split(path.sep);
  const project = parts[0]; // e.g., YiPet, Blog, etc.
  const docsIdx = parts.indexOf('docs');
  // story is the directory after 故事任务面板/ or the whole subpath
  let story = '(root)';
  if (docsIdx !== -1) {
    const afterDocs = parts.slice(docsIdx + 1);
    if (afterDocs[0] === '故事任务面板' && afterDocs.length > 1) {
      story = afterDocs[1];
    } else if (afterDocs.length > 0 && afterDocs[0] !== '自改进故事面板') {
      story = afterDocs[0];
    }
  }
  return { project, story };
}

// ---- Determine document type from filename and heading ----
function detectType(filename, firstHeading) {
  const h = (firstHeading || '').replace(/^#\s*/, '');
  const name = filename.replace(/^\d{2}-/, '').replace(/\.md$/, '');

  const typeMap = [
    { pattern: /故事任务/, type: '故事任务' },
    { pattern: /技术评审/, type: '技术评审' },
    { pattern: /实施报告/, type: '实施报告' },
    { pattern: /测试用例评审/, type: '测试用例评审' },
    { pattern: /测试用例报告/, type: '测试用例报告' },
    { pattern: /自改进复盘/, type: '自改进复盘' },
    { pattern: /消息通知/, type: '消息通知' },
    { pattern: /复盘/, type: '复盘' },
  ];

  for (const m of typeMap) {
    if (m.pattern.test(name) || m.pattern.test(h)) return m.type;
  }
  // fallback: use first heading or filename
  return h.split('—')[0].split(':')[0].trim() || name;
}

// ---- Extract first heading from content ----
function extractTitle(content) {
  const m = content.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : '';
}

// ---- Check if file has frontmatter ----
function hasFrontmatter(content) {
  return /^---\s*\n[\s\S]*?\n---/.test(content);
}

// ---- Build frontmatter string ----
function buildFrontmatter(filePath, content) {
  const title = extractTitle(content);
  const { project, story } = parsePath(filePath);
  const type = detectType(path.basename(filePath), title);
  let mtime;
  try { mtime = fs.statSync(filePath).mtime; } catch { mtime = new Date(); }
  const date = mtime.toISOString().split('T')[0];

  const fm = [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    `project: ${project}`,
    `story: ${story}`,
    `type: ${type}`,
    `date: ${date}`,
    '---',
  ].join('\n');
  return fm + '\n\n';
}

// ---- Fix broken links in content ----
function fixLinks(content, dirPath) {
  // Find all relative .md links
  const linkRe = /\[([^\]]*)\]\(\.\/([^)]+\.md)\)/g;
  return content.replace(linkRe, (match, text, linkTarget) => {
    const fullTarget = path.join(dirPath, linkTarget);
    if (fs.existsSync(fullTarget)) return match; // link is fine

    // Try to find matching file without number prefix
    const stripped = linkTarget.replace(/^\d{2}-/, '');
    const fullStripped = path.join(dirPath, stripped);
    if (fs.existsSync(fullStripped)) {
      return `[${text}](./${stripped})`;
    }

    // If the stripped target has a different number prefix than the file, try matching by suffix
    // e.g., 03-测试用例评审.md → look for file ending with 测试用例评审.md
    if (!fs.existsSync(fullStripped)) {
      let found = null;
      try {
        const dirFiles = fs.readdirSync(dirPath);
        found = dirFiles.find(f => f.endsWith(stripped));
      } catch {}
      if (found) return `[${text}](./${found})`;
    }

    // If link target is 03-测试用例评审.md but 03-前端技术评审.md exists (number typo),
    // try common substitutions
    if (/^\d{2}-/.test(linkTarget)) {
      const altPatterns = [
        linkTarget.replace(/测试用例评审/, '前端技术评审'),
        linkTarget.replace(/测试用例评审/, '后端技术评审'),
      ];
      for (const alt of altPatterns) {
        const fullAlt = path.join(dirPath, alt);
        if (fs.existsSync(fullAlt)) return `[${text}](./${alt})`;
      }
    }

    return match; // no fix found, leave as-is
  });
}

// ---- Main ----
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const target = args.includes('--project') ? args[args.indexOf('--project') + 1] : null;

  const allProjects = [];
  let totalFixed = 0;
  let totalFmAdded = 0;
  let totalLinksFixed = 0;

  // Collect all docs directories
  const entries = fs.readdirSync(REPO_ROOT);
  for (const entry of entries) {
    const docsDir = path.join(REPO_ROOT, entry, 'docs');
    if (!fs.existsSync(docsDir) || !fs.statSync(docsDir).isDirectory()) continue;
    if (target && entry !== target) continue;
    allProjects.push({ name: entry, docsDir });
  }

  for (const proj of allProjects) {
    const mdFiles = [];
    function walk(dir) {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const full = path.join(dir, item);
        let st;
        try { st = fs.statSync(full); } catch { continue; }
        if (st.isDirectory()) walk(full);
        else if (st.isFile() && item.endsWith('.md')) mdFiles.push(full);
      }
    }
    walk(proj.docsDir);

    for (const file of mdFiles) {
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;

      // 1. Add frontmatter if missing
      if (!hasFrontmatter(content)) {
        const fm = buildFrontmatter(file, content);
        content = fm + content;
        totalFmAdded++;
        modified = true;
      }

      // 2. Fix broken links
      const dirPath = path.dirname(file);
      const fixedContent = fixLinks(content, dirPath);
      if (fixedContent !== content) {
        // Count links fixed
        const oldLinks = content.match(/\[([^\]]*)\]\(\.\/([^)]+\.md)\)/g) || [];
        const newLinks = fixedContent.match(/\[([^\]]*)\]\(\.\/([^)]+\.md)\)/g) || [];
        totalLinksFixed += (oldLinks.length - newLinks.length) +
          (fixedContent.match(/\[([^\]]*)\]\(\.\/([^)]+\.md)\)/g) || []).filter((l, i) => l !== (oldLinks[i] || '')).length;
        // Simpler: count instances where links changed
        let linkChanges = 0;
        const re = /\[([^\]]*)\]\(\.\/([^)]+\.md)\)/g;
        let m1, m2;
        const c1 = [...content.matchAll(re)];
        const c2 = [...fixedContent.matchAll(re)];
        for (let i = 0; i < c1.length; i++) {
          if (c1[i][0] !== c2[i]?.[0]) linkChanges++;
        }
        totalLinksFixed += linkChanges;
        content = fixedContent;
        modified = true;
      }

      if (modified) {
        totalFixed++;
        if (!dryRun) {
          await fsp.writeFile(file, content, 'utf8');
        }
      }
    }
  }

  console.log(`\nFix summary:`);
  console.log(`  Projects scanned: ${allProjects.length}`);
  console.log(`  Files modified:   ${totalFixed}`);
  console.log(`  Frontmatter added: ${totalFmAdded}`);
  console.log(`  Links fixed:       ${totalLinksFixed}`);
  if (dryRun) console.log(`  (dry-run, no files written)`);
}

main().catch(err => { console.error(err); process.exit(1); });
