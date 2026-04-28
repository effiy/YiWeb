#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const http = require('https');

const args = process.argv.slice(2);
const options = {
  dir: process.cwd(),
  exts: ['md'],
  token: process.env.API_X_TOKEN || null,
  apiUrl: 'https://api.effiy.cn',
  prefix: []
};

let command = 'import';
let argStartIndex = 0;
if (args[0] && !args[0].startsWith('-')) {
  command = args[0];
  argStartIndex = 1;
}

if (!['import', 'list'].includes(command)) {
  console.error(`Error: unsupported command "${command}". Use "import" or "list".`);
  process.exit(1);
}

for (let i = argStartIndex; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--dir' || arg === '-d') {
    options.dir = path.resolve(args[++i]);
  } else if (arg === '--exts' || arg === '-e') {
    options.exts = args[++i].split(',').map(e => e.trim().toLowerCase());
  } else if (arg === '--token' || arg === '-t') {
    options.token = args[++i];
  } else if (arg === '--api-url' || arg === '-a') {
    options.apiUrl = args[++i];
  } else if (arg === '--prefix' || arg === '-p') {
    options.prefix = args[++i].split(',').map(p => p.trim()).filter(Boolean);
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
YiDocs Import - Import documentation files to YiAi

Usage:
  node .claude/skills/import-docs/scripts/import-docs.js import [options]
  node .claude/skills/import-docs/scripts/import-docs.js list [options]
  node .claude/skills/import-docs/scripts/import-docs.js [options]   # defaults to import

Options:
  --dir, -d     Directory to traverse (default: current directory for import, ./docs for list)
  --exts, -e    File extensions (comma-separated, default: md)
  --token, -t   X-Token authentication (default from API_X_TOKEN env var, import only)
  --api-url, -a API base URL (default: https://api.effiy.cn)
  --prefix, -p  Path prefix (comma-separated, e.g. Projects,YiWeb)
  --help, -h    Show this help message
`);
    process.exit(0);
  }
}

if (command === 'list' && options.dir === process.cwd()) {
  options.dir = path.resolve(process.cwd(), 'docs');
}

const targetDirName = path.basename(options.dir);
const shouldImportAllFiles = ['.claude', '.cursor'].includes(targetDirName);

console.log('=== YiDocs Import ===');
console.log('Command:', command);
console.log('Directory:', options.dir);
if (shouldImportAllFiles) {
  console.log('Extensions: all files (forced for .claude/.cursor)');
} else {
  console.log('Extensions:', options.exts.join(', '));
}
if (command === 'import') {
  console.log('API:', options.apiUrl);
  if (options.prefix.length > 0) {
    console.log('Prefix:', options.prefix.join('/'));
  }
}
console.log();

async function findFiles(dir, exts, includeAllFiles = false) {
  const results = [];

  async function traverse(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await traverse(fullPath);
      } else if (entry.isFile()) {
        if (includeAllFiles) {
          results.push(fullPath);
          continue;
        }
        const ext = path.extname(entry.name).slice(1).toLowerCase();
        if (exts.includes(ext)) {
          results.push(fullPath);
        }
      }
    }
  }

  await traverse(dir);
  return results;
}

function request(apiUrl, endpoint, method, token, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, apiUrl);
    const postData = data ? JSON.stringify(data) : null;

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      requestOptions.headers['X-Token'] = token;
    }

    if (postData) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(requestOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

async function getExistingSessions(apiUrl, token) {
  const result = await request(apiUrl, '/', 'POST', token, {
    module_name: 'services.database.data_service',
    method_name: 'query_documents',
    parameters: {
      cname: 'sessions',
      limit: 10000
    }
  });

  const sessions = result?.data?.list || [];
  const existingSet = new Set();

  for (const session of sessions) {
    if (session.file_path) {
      existingSet.add(session.file_path);
    }
  }

  return { sessions, existingSet };
}

async function importFile(fullPath, baseDir, apiUrl, token, existingSet, prefix) {
  const relativePath = path.relative(baseDir, fullPath);
  const relativeTargetPath = relativePath
    .split(path.sep)
    .map(part => part.replace(/\s+/g, '_'))
    .join('/');

  const rootDirName = path.basename(process.cwd()).replace(/\s+/g, '_');
  const baseDirName = path.basename(baseDir);
  const isCurrentDir = baseDir === '.' || baseDir === process.cwd();
  const dirName = isCurrentDir ? null : baseDirName.replace(/\s+/g, '_');

  const targetPathParts = [];
  if (prefix.length > 0) {
    targetPathParts.push(...prefix.map(part => part.replace(/\s+/g, '_')));
  }
  targetPathParts.push(rootDirName);
  if (dirName) {
    targetPathParts.push(dirName);
  }
  targetPathParts.push(relativeTargetPath);

  const targetPath = targetPathParts.join('/');
  const allParts = targetPath.split('/');
  const title = allParts[allParts.length - 1];
  const tags = allParts.slice(0, -1);
  const isDuplicate = existingSet.has(targetPath);
  const content = await fs.readFile(fullPath, 'utf-8');

  await request(apiUrl, '/write-file', 'POST', token, {
    target_file: targetPath,
    content,
    is_base64: false
  });

  if (isDuplicate) {
    return { status: 'overwritten', path: targetPath };
  }

  const now = Date.now();
  const random = Math.random().toString(36).slice(2, 11);
  await request(apiUrl, '/', 'POST', token, {
    module_name: 'services.database.data_service',
    method_name: 'create_document',
    parameters: {
      cname: 'sessions',
      data: {
        url: `aicr-session://${now}-${random}`,
        title,
        file_path: targetPath,
        messages: [],
        tags,
        isFavorite: false,
        createdAt: now,
        updatedAt: now,
        lastAccessTime: now
      }
    }
  });

  existingSet.add(targetPath);
  return { status: 'ok', path: targetPath };
}

function toSortedRelativePaths(files, baseDir) {
  return files
    .map(file => path.relative(baseDir, file).split(path.sep).join('/'))
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
}

(async function main() {
  try {
    const files = await findFiles(options.dir, options.exts, shouldImportAllFiles);
    console.log(`Found ${files.length} files`);

    if (files.length === 0) {
      console.log('No files to process');
      return;
    }

    if (command === 'list') {
      const relativePaths = toSortedRelativePaths(files, options.dir);
      console.log('Files:');
      for (const relativePath of relativePaths) {
        console.log(`- ${relativePath}`);
      }
      return;
    }

    if (!options.token) {
      console.error('Error: --token is required or set API_X_TOKEN environment variable');
      process.exit(1);
    }

    console.log('Querying existing sessions...');
    const { existingSet } = await getExistingSessions(options.apiUrl, options.token);
    console.log(`Found ${existingSet.size} existing sessions with file_path`);
    console.log();

    const stats = { ok: 0, overwritten: 0, failed: 0 };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = path.relative(options.dir, file);
      console.log(`[${i + 1}/${files.length}] Processing: ${relativePath}`);

      try {
        const result = await importFile(file, options.dir, options.apiUrl, options.token, existingSet, options.prefix);
        if (result.status === 'ok') {
          console.log(`  ✓ ${result.path} (created)`);
          stats.ok++;
        } else if (result.status === 'overwritten') {
          console.log(`  ✓ ${result.path} (file overwritten, session exists)`);
          stats.overwritten++;
        }
      } catch (error) {
        console.log(`  ✗ ${relativePath} - ${error.message}`);
        stats.failed++;
      }
    }

    console.log();
    console.log(`Done: ${stats.ok} created, ${stats.overwritten} overwritten, ${stats.failed} failed`);

    if (stats.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
