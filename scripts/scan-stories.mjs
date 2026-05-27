/**
 * 扫描 docs/故事任务面板/ 生成 _manifest.json
 *
 * 用法: node scripts/scan-stories.mjs
 * 输出: docs/故事任务面板/_manifest.json
 */
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = new URL('.', import.meta.url).pathname;

const ROOT = join(__dirname, '..');
const PANEL_DIR = join(ROOT, 'docs', '故事任务面板');
const MANIFEST_PATH = join(PANEL_DIR, '_manifest.json');

const PROJECT_NAME = 'YiWeb';
const PROJECT_PREFIX = PROJECT_NAME + '-';
const BASELINE_DOCS = ['使用场景', '技术评审', '测试设计', '安全审计'];

// --- Logic mirrors src/views/story/hooks/store.js ---

function extractProjectTags(filenames) {
    const tags = new Set();
    for (const fn of filenames) {
        const m = fn.match(/^([A-Za-z][A-Za-z0-9]*)-/);
        if (m) tags.add(m[1]);
    }
    return [...tags].sort();
}

function hasProjectFile(filenames, docType) {
    const target = PROJECT_PREFIX + docType + '.md';
    return filenames.includes(target);
}

function determineStatus(filenames) {
    if (!hasProjectFile(filenames, '故事任务')) return 'not_started';

    const baselineComplete = BASELINE_DOCS.every((doc) =>
        hasProjectFile(filenames, doc)
    );
    if (!baselineComplete) return 'docs_in_progress';

    if (!hasProjectFile(filenames, '实施报告')) return 'docs_done';

    if (!hasProjectFile(filenames, '测试报告')) return 'code_in_progress';

    if (!hasProjectFile(filenames, '自改进复盘')) return 'code_done';

    return 'self_improve';
}

async function inferType(dirPath, filenames) {
    const reviewFile = filenames.find(
        (fn) => fn === PROJECT_PREFIX + '技术评审.md'
    );
    if (!reviewFile) return 'meta';

    try {
        const content = await readFile(join(dirPath, reviewFile), 'utf-8');
        const lower = content.toLowerCase();

        const hasBackend = /\b(api|数据|后端|服务端|接口|数据库|server|backend|服务|路由)\b/i.test(lower);
        const hasFrontend = /\b(组件|交互|样式|前端|页面|ui|frontend|界面|布局|渲染|响应式)\b/i.test(lower);

        if (hasBackend && hasFrontend) return 'fullstack';
        if (hasBackend) return 'backend';
        if (hasFrontend) return 'frontend';
        return 'meta';
    } catch {
        return 'meta';
    }
}

const NEXT_STEP_MAP = {
    not_started: '启动文档管线',
    docs_in_progress: '补齐文档基线',
    docs_done: '启动编码实现',
    code_in_progress: '继续实现验证',
    self_improve: '执行自改进',
    code_done: '交付三步收口',
};

async function scan() {
    const entries = await readdir(PANEL_DIR, { withFileTypes: true });
    const storyDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'));

    const results = [];

    for (const dir of storyDirs) {
        const dirPath = join(PANEL_DIR, dir.name);
        const files = await readdir(dirPath);
        const mdFiles = files.filter((f) => f.endsWith('.md'));

        // Skip _manifest.json itself and non-story dirs
        if (mdFiles.length === 0) continue;

        const filenames = mdFiles;
        const projectTags = extractProjectTags(filenames);
        const status = determineStatus(filenames);
        const type = await inferType(dirPath, filenames);

        // Description from 故事任务.md — extract overview paragraph
        let description = '';
        const storyTaskFile = filenames.find((fn) => fn.endsWith('-故事任务.md'));
        if (storyTaskFile) {
            try {
                const content = await readFile(join(dirPath, storyTaskFile), 'utf-8');
                // Try multiple heading patterns to locate the overview section
                for (const pattern of [/^##\s*概述/m, /^###\s*需求概述/m]) {
                    const match = content.match(pattern);
                    if (match) {
                        const after = content.slice(match.index);
                        const lines = after.split('\n');
                        for (let i = 1; i < lines.length; i++) {
                            const line = lines[i].trim();
                            if (!line || line.startsWith('#') || line.startsWith('>')) continue;
                            description = line.slice(0, 200);
                            break;
                        }
                        break;
                    }
                }
                // Fallback: blockquote line after title line (e.g. "> 统一整个项目的主题样式")
                if (!description) {
                    for (const pattern of [/^>\s*(.+)$/m]) {
                        const match = content.match(pattern);
                        if (match) {
                            const text = match[1].trim();
                            // Skip metadata lines (contain | separators or markdown links)
                            if (text && !text.includes('|') && !text.startsWith('[') && text.length > 4) {
                                description = text.slice(0, 200);
                                break;
                            }
                        }
                    }
                }
            } catch {
                // ignore
            }
        }

        const nextStep = NEXT_STEP_MAP[status] || '';

        const hasNotify = filenames.some((fn) => fn.endsWith('-消息通知列表.md'));
        const hasLog = filenames.some((fn) => fn.endsWith('-交互日志.md'));

        // Build file metadata
        const fileMetas = [];
        let maxMtime = 0;
        let minBirthtime = Infinity;

        for (const fn of mdFiles) {
            const fp = join(dirPath, fn);
            try {
                const s = await stat(fp);
                const mtimeMs = s.mtimeMs;
                const birthtimeMs = s.birthtimeMs;

                if (mtimeMs > maxMtime) maxMtime = mtimeMs;
                if (birthtimeMs < minBirthtime) minBirthtime = birthtimeMs;

                // Try to read title from first line pattern: > | vX.Y.Z | date | ...
                let title = '';
                try {
                    const head = await readFile(fp, 'utf-8');
                    const firstLine = head.split('\n')[0] || '';
                    const titleMatch = firstLine.match(/^>\s*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|/);
                    if (titleMatch) {
                        // Use filename as title fallback
                        title = fn;
                    }
                } catch {
                    // ignore
                }

                fileMetas.push({
                    filePath: `故事任务面板/${dir.name}/${fn}`,
                    fileName: fn,
                    updatedAt: mtimeMs,
                    createdAt: birthtimeMs,
                    title,
                });
            } catch {
                // skip files we can't stat
            }
        }

        results.push({
            name: dir.name,
            status,
            type,
            description,
            nextStep,
            projectTags,
            hasNotify,
            hasLog,
            notifyUpdatedAt: 0,
            logUpdatedAt: 0,
            fileCount: mdFiles.length,
            files: fileMetas,
            lastModified: maxMtime,
            createdAt: minBirthtime === Infinity ? 0 : minBirthtime,
        });
    }

    results.sort((a, b) => b.lastModified - a.lastModified);

    return results;
}

async function main() {
    console.log('[scan-stories] Scanning', PANEL_DIR);
    const stories = await scan();
    const manifest = {
        generated_at: new Date().toISOString(),
        generated_by: 'scripts/scan-stories.mjs',
        project: PROJECT_NAME,
        story_count: stories.length,
        stories,
    };

    await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(
        `[scan-stories] Wrote ${MANIFEST_PATH} (${stories.length} stories)`
    );
}

main().catch((err) => {
    console.error('[scan-stories] Error:', err);
    process.exit(1);
});
