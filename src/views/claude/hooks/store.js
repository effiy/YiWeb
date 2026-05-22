/**
 * Claude 管理面板 - 状态管理
 * 管理远端各项目 .claude 目录
 */
import { logInfo, logError } from '/cdn/utils/core/log.js';
import { getAuthHeaders } from '/src/core/services/helper/authUtils.js?v=1';

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
        try {
            const apiUrl = window.API_URL || 'https://api.effiy.cn';
            const authHeaders = getAuthHeaders();
            const body = {
                module_name: 'services.database.data_service',
                method_name: 'query_documents',
                parameters: { cname: 'sessions', limit: 10000 },
            };
            const res = await fetch(apiUrl + '/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...authHeaders,
                },
                credentials: 'omit',
                body: JSON.stringify(body),
            });
            const data = await res.json();
            const items = data?.data?.list || data?.list || [];
            const claudeItems = items.filter(i => isClaudeFile(i.file_path));

            const projectMap = new Map();
            for (const item of claudeItems) {
                const name = extractProjectName(item.file_path);
                if (!name) continue;
                if (!projectMap.has(name)) projectMap.set(name, []);
                projectMap.get(name).push(item);
            }

            const results = [];
            for (const [name, files] of projectMap) {
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
            error.value = err.message || '加载失败';
            logError('[Claude面板] 加载失败:', err);
        } finally {
            loading.value = false;
        }
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
