#!/usr/bin/env node

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const PROJECT = path.basename(process.cwd());
const DOCS_DIR = path.join(process.cwd(), 'docs');
const API_URL = process.env.RUI_DOCS_API_URL || 'https://api.effiy.cn';
const TOKEN = process.env.API_X_TOKEN;
const ALL_MODE = process.argv.includes('--all');
const LIST_MODE = !ALL_MODE;

function fail(msg) {
  console.error(`[rui-docs/sync] ${msg}`);
  process.exit(1);
}

async function fetchRemoteFiles() {
  if (!TOKEN) fail('API_X_TOKEN 未设置，无法连接远端');

  const res = await fetch(`${API_URL}/list-files`, {
    headers: { 'X-Token': TOKEN, 'Content-Type': 'application/json' },
  });
  if (!res.ok) fail(`list-files 失败: ${res.status}`);
  const data = await res.json();
  return (data.files || []).filter(f => f.path.startsWith(`${PROJECT}/docs/`));
}

async function pullFile(remotePath) {
  const res = await fetch(`${API_URL}/read-file`, {
    method: 'POST',
    headers: { 'X-Token': TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: remotePath }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).content || '';
}

function formatMtime(f) {
  if (!f.mtime) return '';
  const d = new Date(f.mtime);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function classifyFile(filePath) {
  if (filePath.includes('/故事任务/')) return 'story';
  if (filePath.includes('/技术评审/')) return 'review';
  if (filePath.includes('/实施报告/')) return 'report';
  if (filePath.includes('/自改进故事面板/')) return 'retro';
  return 'other';
}

const CLASS_LABEL = { story: '故事任务', review: '技术评审', report: '实施报告', retro: '复盘', other: '其他' };

async function listRemote() {
  if (!TOKEN) fail('API_X_TOKEN 未设置');

  const remoteFiles = await fetchRemoteFiles();
  if (remoteFiles.length === 0) {
    console.log('远端无文件。');
    return;
  }

  const stories = remoteFiles.filter(f => classifyFile(f.path) === 'story');
  const others = remoteFiles.filter(f => classifyFile(f.path) !== 'story');

  console.log(`\n📋 远端故事任务 — ${PROJECT}（共 ${stories.length} 个）\n`);

  if (stories.length === 0) {
    console.log('  (无故事任务)\n');
  } else {
    stories.forEach((f, i) => {
      const name = path.basename(f.path, '.md');
      const mtime = formatMtime(f);
      const size = f.size ? `${(f.size / 1024).toFixed(1)}KB` : '';
      const meta = [mtime, size].filter(Boolean).join(' | ');
      console.log(`  ${i + 1}. ${name}${meta ? `  (${meta})` : ''}`);
    });
    console.log('');
  }

  if (others.length > 0) {
    console.log(`其他远端文件（${others.length} 个）：`);
    const byClass = {};
    for (const f of others) {
      const c = classifyFile(f.path);
      if (!byClass[c]) byClass[c] = [];
      byClass[c].push(f);
    }
    for (const [c, files] of Object.entries(byClass)) {
      console.log(`  ${CLASS_LABEL[c]}: ${files.length} 个文件`);
    }
    console.log('');
  }

  console.log('使用 /rui-docs sync --all 拉取全部文件到本地。');
}

(async () => {
  if (LIST_MODE) {
    await listRemote();
    return;
  }

  if (!TOKEN) fail('API_X_TOKEN 未设置');

  const remoteFiles = await fetchRemoteFiles();
  if (remoteFiles.length === 0) {
    console.log('远端无文件，跳过。');
    return;
  }

  // 删除本地 docs/
  if (fs.existsSync(DOCS_DIR)) {
    await fsp.rm(DOCS_DIR, { recursive: true });
  }

  console.log(`从远端拉取 ${remoteFiles.length} 个文件...`);

  let count = 0;
  for (const f of remoteFiles) {
    const rel = f.path.replace(`${PROJECT}/docs/`, '');
    try {
      const content = await pullFile(f.path);
      const localPath = path.join(DOCS_DIR, rel);
      await fsp.mkdir(path.dirname(localPath), { recursive: true });
      await fsp.writeFile(localPath, content, 'utf8');
      console.log(`  + ${rel}`);
      count++;
    } catch (e) {
      console.error(`  失败: ${rel} (${e.message})`);
    }
  }

  console.log(`\n完成: ${count} / ${remoteFiles.length} 个文件`);
})().catch(err => { console.error(err); process.exit(1); });
