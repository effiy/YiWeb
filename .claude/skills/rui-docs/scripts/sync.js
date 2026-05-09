#!/usr/bin/env node

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const PROJECT = path.basename(process.cwd());
const DOCS_DIR = path.join(process.cwd(), 'docs');
const API_URL = process.env.RUI_DOCS_API_URL || 'https://api.effiy.cn';
const TOKEN = process.env.API_X_TOKEN;

function fail(msg) {
  console.error(`[rui-docs/sync] ${msg}`);
  process.exit(1);
}

async function fetchRemoteFiles() {
  if (!TOKEN) fail('API_X_TOKEN 未设置，无法连接远端');

  const res = await fetch(`${API_URL}/list-files`, {
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) fail(`list-files 失败: ${res.status}`);
  const data = await res.json();
  return (data.files || []).filter(f => f.path.startsWith(`${PROJECT}/docs/`));
}

async function pullFile(remotePath) {
  const res = await fetch(`${API_URL}/read-file`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: remotePath }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).content || '';
}

(async () => {
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
