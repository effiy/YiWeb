/**
 * Claude 管理面板 - 状态管理
 * 管理远端各项目 .claude 目录
 */
import { logInfo, logError } from '/cdn/utils/core/log.js';
import { getData } from '/src/core/services/index.js';
import { buildServiceUrl } from '/src/core/services/helper/requestHelper.js';
import { safeExecuteAsync } from '/cdn/utils/core/error.js';

const { ref } = Vue;

function extractProjectName(filePath) {
    const parts = (filePath || '').split('/');
    if (parts.length < 2) return null;
    return parts[0];
}

function isClaudeFile(filePath) {
    return (filePath || '').includes('/.claude/');
}

function countByDir(files, subdir) {
    const seen = new Set();
    for (const f of files) {
        const m = (f.file_path || '').match(new RegExp(`\\.claude/${subdir}/([^/]+)`));
        if (m) seen.add(m[1]);
    }
    return seen.size;
}

export function createStore() {
    const projects = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const selectedProject = ref(null);

    async function fetchProjects() {
        loading.value = true;
        error.value = null;
        await safeExecuteAsync(async () => {
            try {
                const url = buildServiceUrl('query_documents', { cname: 'sessions', limit: 10000 });
                const response = await getData(url, {}, false);

                let items = [];
                if (Array.isArray(response)) {
                    items = response;
                } else if (response && Array.isArray(response.data)) {
                    items = response.data;
                } else if (response && response.data && Array.isArray(response.data.list)) {
                    items = response.data.list;
                } else if (response && Array.isArray(response.list)) {
                    items = response.list;
                }

                if (!Array.isArray(items) || items.length === 0) {
                    error.value = '未获取到会话数据';
                    return;
                }

                const claudeItems = items.filter(i => isClaudeFile(i.file_path));

                const projectMap = new Map();
                for (const item of claudeItems) {
                    const name = extractProjectName(item.file_path);
                    if (!name) continue;
                    if (!projectMap.has(name)) projectMap.set(name, []);
                    projectMap.get(name).push(item);
                }

                const readmeMap = new Map();
                const claudeMdMap = new Map();
                for (const item of items) {
                    const fp = item.file_path || '';
                    const parts = fp.split('/');
                    if (parts.length < 2) continue;
                    const filename = parts[parts.length - 1];

                    if (!fp.includes('/.claude/')) {
                        if (filename.toLowerCase() === 'readme.md') {
                            const proj = parts[0];
                            if (!readmeMap.has(proj)) readmeMap.set(proj, item);
                        }
                    }

                    if (filename === 'CLAUDE.md') {
                        const proj = parts[0];
                        if (!claudeMdMap.has(proj)) claudeMdMap.set(proj, item);
                    }
                }

                const results = [];
                for (const [name, files] of projectMap) {
                    const claudeMdItem = claudeMdMap.get(name);
                    if (claudeMdItem && !isClaudeFile(claudeMdItem.file_path)) {
                        const alreadyHas = files.some(f => (f.file_path || '').split('/').pop() === 'CLAUDE.md');
                        if (!alreadyHas) {
                            files.push(claudeMdItem);
                        }
                    }

                    const readmeItem = readmeMap.get(name);
                    if (readmeItem) {
                        const alreadyHas = files.some(f => (f.file_path || '').split('/').pop().toLowerCase() === 'readme.md');
                        if (!alreadyHas) {
                            files.push(readmeItem);
                        }
                    }

                    const skillCount = countByDir(files, 'skills');
                    const agentCount = countByDir(files, 'agents');
                    const ruleCount = countByDir(files, 'rules');
                    const templateCount = countByDir(files, 'templates');
                    const filenames = files.map(f => (f.file_path || '').split('/').pop());

                    const hasClaudeMd = filenames.some(fn => fn === 'CLAUDE.md');
                    const hasSettings = filenames.some(fn => fn === 'settings.json');
                    const hasScheduledTasks = filenames.some(fn => fn === 'scheduled_tasks.json');
                    const hasMemory = files.some(f => (f.file_path || '').includes('/.claude/memory/'));
                    const hasHooks = files.some(f => (f.file_path || '').includes('/.claude/hooks/'));
                    const hasRules = ruleCount > 0;
                    const hasTemplates = templateCount > 0;

                    const memoryFiles = files.filter(f =>
                        (f.file_path || '').includes('/.claude/memory/') &&
                        !(f.file_path || '').endsWith('/')
                    );

                    const mcpCount = files.filter(f =>
                        (f.file_path || '').includes('/.claude/mcp/')
                    ).length;

                    const maxTs = Math.max(...files.map(f => f.updatedAt || 0));
                    const createdTs = Math.min(...files.map(f => f.createdAt || Infinity));

                    const hasReadmeMd = readmeMap.has(name);

                    results.push({
                        name,
                        skillCount,
                        agentCount,
                        mcpCount,
                        hasClaudeMd,
                        hasSettings,
                        hasScheduledTasks,
                        hasMemory,
                        hasHooks,
                        hasRules,
                        hasTemplates,
                        hasReadmeMd,
                        ruleCount,
                        templateCount,
                        memoryFileCount: memoryFiles.length,
                        fileCount: files.length,
                        files: files.map(f => ({
                            filePath: f.file_path,
                            fileName: (f.file_path || '').split('/').pop(),
                            updatedAt: f.updatedAt,
                            createdAt: f.createdAt,
                            title: f.title || '',
                        })),
                        lastModified: maxTs,
                        createdAt: createdTs === Infinity ? 0 : createdTs,
                    });
                }

                results.sort((a, b) => b.lastModified - a.lastModified);
                projects.value = results;
                logInfo('[Claude面板] 加载完成:', results.length, '个项目');
            } catch (err) {
                error.value = err?.message || '加载失败';
                logError('[Claude面板] 加载失败:', err);
            }
        }, '加载Claude项目列表');

        if (!projects.value.length && !error.value) {
            error.value = '未找到项目数据';
        }
        loading.value = false;
    }

    function selectProject(name) {
        const p = projects.value.find(p => p.name === name);
        if (p) selectedProject.value = p;
    }

    function clearSelection() {
        selectedProject.value = null;
    }

    return {
        projects,
        loading,
        error,
        selectedProject,
        fetchProjects,
        selectProject,
        clearSelection,
    };
}
