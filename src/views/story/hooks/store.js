/**
 * 故事任务面板 - 状态管理
 * 状态判定逻辑与 rui-story.mjs 对齐：
 *   基于语义文档名（{project}-故事任务.md 等）而非数字编号前缀
 *   类型推断通过读取远端技术评审文档内容
 *   阻断状态检查远端 .memory/rui-state.json
 */
import { logInfo, logError } from '/cdn/utils/core/log.js';
import { getAuthHeaders } from '/src/core/services/helper/authUtils.js?v=1';

const { ref } = Vue;

const PROJECT_NAME = (typeof window !== 'undefined' && window.PROJECT_NAME) || 'YiWeb';
const PROJECT_PREFIX = PROJECT_NAME + '-';

const BASELINE_DOCS = ['使用场景', '技术评审', '测试设计', '安全审计'];

const TYPE_CONCURRENCY = 4;

function extractStoryName(filePath) {
    const parts = (filePath || '').split('/');
    const idx = parts.indexOf('故事任务面板');
    if (idx === -1 || idx + 2 >= parts.length) return null;
    return parts[idx + 1];
}

function hasProjectFile(filenames, docType) {
    const target = PROJECT_PREFIX + docType + '.md';
    return filenames.includes(target);
}

function determineStatus(filenames, blockedState) {
    if (!hasProjectFile(filenames, '故事任务'))
        return 'not_started';

    const baselineComplete = BASELINE_DOCS.every(doc =>
        hasProjectFile(filenames, doc)
    );
    if (!baselineComplete)
        return 'docs_in_progress';

    if (!hasProjectFile(filenames, '实施报告'))
        return 'docs_done';

    if (!hasProjectFile(filenames, '测试报告'))
        return 'code_in_progress';

    if (blockedState?.blocked)
        return 'blocked';

    return 'code_done';
}

async function inferType(apiUrl, files, authHeaders) {
    const reviewFile = files.find(f => {
        const fn = (f.file_path || '').split('/').pop();
        return fn === PROJECT_PREFIX + '技术评审.md';
    });
    if (!reviewFile) return 'meta';

    try {
        const res = await fetch(apiUrl + '/read-file', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...authHeaders,
            },
            credentials: 'omit',
            body: JSON.stringify({ target_file: reviewFile.file_path }),
        });
        const data = await res.json();
        const content = (data?.data?.content ?? data?.content ?? '').toLowerCase();

        const hasBackend = /\b(api|数据|后端|服务端|接口|数据库|server|backend|服务|路由)\b/i.test(content);
        const hasFrontend = /\b(组件|交互|样式|前端|页面|ui|frontend|界面|布局|渲染|响应式)\b/i.test(content);

        if (hasBackend && hasFrontend) return 'fullstack';
        if (hasBackend) return 'backend';
        if (hasFrontend) return 'frontend';
        return 'meta';
    } catch {
        return 'meta';
    }
}

async function inferTypesBatch(apiUrl, storyFilesMap, authHeaders) {
    const entries = [...storyFilesMap.entries()];
    const results = new Map();
    const queue = [...entries];

    async function worker() {
        while (queue.length > 0) {
            const [name, files] = queue.shift();
            results.set(name, await inferType(apiUrl, files, authHeaders));
        }
    }

    const workers = Array.from(
        { length: Math.min(TYPE_CONCURRENCY, entries.length) },
        worker
    );
    await Promise.all(workers);
    return results;
}

async function checkBlockedState(apiUrl, storyFiles, authHeaders) {
    const stateFile = storyFiles.find(f =>
        (f.file_path || '').includes('.memory/rui-state.json')
    );
    if (!stateFile) return null;

    try {
        const res = await fetch(apiUrl + '/read-file', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...authHeaders,
            },
            credentials: 'omit',
            body: JSON.stringify({ target_file: stateFile.file_path }),
        });
        const data = await res.json();
        const raw = data?.data?.content ?? data?.content ?? '{}';
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return {
            blocked: parsed.blocked === true,
            block_reason: parsed.block_reason || null,
        };
    } catch {
        return null;
    }
}

export function createStore() {
    const stories = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const selectedStory = ref(null);

    async function fetchStories() {
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
            const panelItems = items.filter(i =>
                (i.file_path || '').startsWith('故事任务面板/')
            );

            // 按故事名分组
            const storyMap = new Map();
            for (const item of panelItems) {
                const name = extractStoryName(item.file_path);
                if (!name) continue;
                if (!storyMap.has(name)) storyMap.set(name, []);
                storyMap.get(name).push(item);
            }

            if (storyMap.size === 0) {
                stories.value = [];
                loading.value = false;
                return;
            }

            // 批量类型推断
            const typeMap = await inferTypesBatch(apiUrl, storyMap, authHeaders);

            const results = [];
            for (const [name, files] of storyMap) {
                const filenames = files.map(f =>
                    (f.file_path || '').split('/').pop()
                );

                // 阻断状态（远端 .memory/rui-state.json）
                const blockedState = await checkBlockedState(apiUrl, files, authHeaders);

                const status = determineStatus(filenames, blockedState);
                const type = typeMap.get(name) || 'meta';

                const maxTs = Math.max(...files.map(f => f.updatedAt || 0));
                const createdTs = Math.min(
                    ...files.map(f => f.createdAt || Infinity)
                );

                // 描述：从 故事任务.md 的 title 字段提取
                const storyTaskFile = files.find(f => {
                    const fn = (f.file_path || '').split('/').pop();
                    return fn === PROJECT_PREFIX + '故事任务.md';
                });
                const description = storyTaskFile?.title || '';

                const nextStepMap = {
                    not_started: '启动文档管线',
                    docs_in_progress: '补齐文档基线',
                    docs_done: '启动编码实现',
                    code_in_progress: '继续实现验证',
                    code_done: '交付三步收口',
                    blocked: '解除阻断',
                };
                const nextStep = blockedState?.block_reason
                    ? `阻断: ${blockedState.block_reason}`
                    : (nextStepMap[status] || '');

                // 消息通知列表
                const notifyFile = files.find(f => {
                    const fn = (f.file_path || '').split('/').pop();
                    return fn === PROJECT_PREFIX + '消息通知列表.md';
                });
                const hasNotify = !!notifyFile;
                const notifyUpdatedAt = notifyFile?.updatedAt || 0;

                // 交互日志
                const logFile = files.find(f => {
                    const fn = (f.file_path || '').split('/').pop();
                    return fn === PROJECT_PREFIX + '交互日志.md';
                });
                const hasLog = !!logFile;
                const logUpdatedAt = logFile?.updatedAt || 0;

                results.push({
                    name,
                    status,
                    type,
                    description,
                    nextStep,
                    hasNotify,
                    hasLog,
                    notifyUpdatedAt,
                    logUpdatedAt,
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
            stories.value = results;
            logInfo('[故事面板] 加载完成:', results.length, '个故事');
        } catch (err) {
            error.value = err.message || '加载失败';
            logError('[故事面板] 加载失败:', err);
        } finally {
            loading.value = false;
        }
    }

    function selectStory(name) {
        const story = stories.value.find(s => s.name === name);
        if (story) {
            selectedStory.value = story;
        }
    }

    function clearSelection() {
        selectedStory.value = null;
    }

    return {
        stories,
        loading,
        error,
        selectedStory,
        fetchStories,
        selectStory,
        clearSelection,
    };
}
