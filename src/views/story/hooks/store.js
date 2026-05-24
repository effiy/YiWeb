/**
 * 故事任务面板 - 状态管理
 *
 * 数据源：远端 API query_documents，filter 服务端过滤 故事任务面板/ 目录。
 * 状态判定基于语义文档名（{project}-故事任务.md 等），按 5 阶段文档存在性定级
 */
import { logInfo, logError } from '/cdn/utils/core/log.js';
import { getAuthHeaders } from '/src/core/services/helper/authUtils.js?v=1';

const { ref } = Vue;

const PROJECT_NAME = (typeof window !== 'undefined' && window.PROJECT_NAME) || 'YiWeb';
const PROJECT_PREFIX = PROJECT_NAME + '-';

function extractProjectTags(filenames) {
    const tags = new Set();
    for (const fn of filenames) {
        const m = fn.match(/^([A-Za-z][A-Za-z0-9]*)-/);
        if (m) tags.add(m[1]);
    }
    return [...tags].sort();
}

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

function determineStatus(filenames) {
    if (hasProjectFile(filenames, '自改进复盘')) return 'operations';
    if (hasProjectFile(filenames, '测试报告'))   return 'testing';
    if (hasProjectFile(filenames, '实施报告'))   return 'develop';
    if (hasProjectFile(filenames, '使用场景'))   return 'design';
    if (hasProjectFile(filenames, '故事任务'))   return 'planning';
    return 'planning';
}

export function createStore() {
    const stories = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const selectedStory = ref(null);
    const allProjectTags = ref([]);

    async function fetchStories() {
        loading.value = true;
        error.value = null;
        try {
            const apiUrl = window.API_URL || 'https://api.effiy.cn';
            const authHeaders = getAuthHeaders();
            const body = {
                module_name: 'services.database.data_service',
                method_name: 'query_documents',
                parameters: { cname: 'sessions', limit: 10000, filter: { file_path: '故事任务面板/' } },
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
                allProjectTags.value = [];
                loading.value = false;
                return;
            }

            const results = [];
            for (const [name, files] of storyMap) {
                const filenames = files.map(f =>
                    (f.file_path || '').split('/').pop()
                );

                const projectTags = extractProjectTags(filenames);

                const status = determineStatus(filenames);

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
                    planning: '创建故事任务',
                    design: '编写使用场景',
                    develop: '编写实施报告',
                    testing: '编写测试报告',
                    operations: '执行自改进复盘',
                };
                const nextStep = nextStepMap[status] || '';

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

                const healthDocs = ['故事任务', '使用场景', '实施报告', '测试报告', '自改进复盘'];
                const healthScore = healthDocs.filter(doc => filenames.includes(PROJECT_PREFIX + doc + '.md')).length;

                results.push({
                    name,
                    status,
                    description,
                    nextStep,
                    projectTags,
                    hasNotify,
                    hasLog,
                    notifyUpdatedAt,
                    logUpdatedAt,
                    healthScore,
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

            const tagSet = new Set();
            for (const r of results) {
                for (const t of r.projectTags) tagSet.add(t);
            }
            allProjectTags.value = [...tagSet].sort();
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
        allProjectTags,
        fetchStories,
        selectStory,
        clearSelection,
    };
}
