#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const http = require('https');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dir: process.cwd(),
  exts: ['md'],
  token: process.env.API_X_TOKEN || null,
  apiUrl: 'https://api.effiy.cn',
  prefix: []
};

for (let i = 0; i < args.length; i++) {
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

Usage: node import-docs.js [options]

Options:
  --dir, -d     Directory to traverse (default: current directory)
  --exts, -e    File extensions (comma-separated, default: md)
  --token, -t   X-Token authentication (default from API_X_TOKEN env var)
  --api-url, -a API base URL (default: https://api.effiy.cn)
  --prefix, -p  Path prefix (comma-separated, e.g. Projects,YiWeb)
  --help, -h    Show this help message
`);
    process.exit(0);
  }
}

if (!options.token) {
  console.error('Error: --token is required or set API_X_TOKEN environment variable');
  process.exit(1);
}

console.log('=== YiDocs Import ===');
console.log('Directory:', options.dir);
console.log('Extensions:', options.exts.join(', '));
console.log('API:', options.apiUrl);
if (options.prefix.length > 0) {
  console.log('Prefix:', options.prefix.join('/'));
}
console.log();

// Recursively find files with matching extensions
async function findFiles(dir, exts) {
  const results = [];

  async function traverse(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await traverse(fullPath);
      } else if (entry.isFile()) {
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

// Helper to make HTTPS requests
function request(apiUrl, endpoint, method, token, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, apiUrl);
    const postData = data ? JSON.stringify(data) : null;

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['X-Token'] = token;
    }

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result);
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

// Query existing sessions for deduplication
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
  // Create a Set for quick lookup: file_path
  const existingSet = new Set();

  for (const s of sessions) {
    if (s.file_path) {
      existingSet.add(s.file_path);
    }
  }

  return { sessions, existingSet };
}

// Import a single file
async function importFile(fullPath, baseDir, apiUrl, token, existingSet, prefix) {
  const relativePath = path.relative(baseDir, fullPath);
  // Normalize path to use / separators and replace spaces with _
  const relativeTargetPath = relativePath.split(path.sep).map(p => p.replace(/\s+/g, '_')).join('/');

  // Get root directory name (current working directory)
  const rootDirName = path.basename(process.cwd()).replace(/\s+/g, '_');

  // Get --dir directory name
  const baseDirName = path.basename(baseDir);
  const isCurrentDir = baseDir === '.' || baseDir === process.cwd();
  const dirName = isCurrentDir ? null : baseDirName.replace(/\s+/g, '_');

  // Add prefix, root dir name, dir name, and relative path to target_file
  const targetPathParts = [];
  if (prefix.length > 0) {
    targetPathParts.push(...prefix.map(p => p.replace(/\s+/g, '_')));
  }
  targetPathParts.push(rootDirName);
  if (dirName) {
    targetPathParts.push(dirName);
  }
  targetPathParts.push(relativeTargetPath);
  const targetPath = targetPathParts.join('/');

  // Calculate tags (including prefix) and title
  const allParts = targetPath.split('/');
  const title = allParts[allParts.length - 1];
  const tags = allParts.slice(0, -1);

  // Check for duplicate using file_path
  const isDuplicate = existingSet.has(targetPath);

  // Read file content
  const content = await fs.readFile(fullPath, 'utf-8');

  // Always write file (overwrite if exists)
  await request(apiUrl, '/write-file', 'POST', token, {
    target_file: targetPath,
    content: content,
    is_base64: false
  });

  let status;
  if (isDuplicate) {
    status = 'overwritten';
  } else {
    // Create session only if not duplicate
    const now = Date.now();
    const random = Math.random().toString(36).slice(2, 11);
    await request(apiUrl, '/', 'POST', token, {
      module_name: 'services.database.data_service',
      method_name: 'create_document',
      parameters: {
        cname: 'sessions',
        data: {
          url: `aicr-session://${now}-${random}`,
          title: title,
          file_path: targetPath,
          messages: [],
          tags: tags,
          isFavorite: false,
          createdAt: now,
          updatedAt: now,
          lastAccessTime: now
        }
      }
    });

    // Add to existingSet to prevent duplicates in same run
    existingSet.add(targetPath);
    status = 'ok';
  }

  return { status, path: targetPath };
}

// Main execution
(async function main() {
  try {
    const files = await findFiles(options.dir, options.exts);
    console.log(`Found ${files.length} files`);

    if (files.length === 0) {
      console.log('No files to process');
      return;
    }

    console.log('Querying existing sessions...');
    const { existingSet } = await getExistingSessions(options.apiUrl, options.token);
    console.log(`Found ${existingSet.size} existing sessions with file_path`);
    console.log();

    // Process files
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
