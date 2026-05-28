/**
 * 故事任务面板 - 数据方法
 *
 * 对标 aicr hooks/methods/ 下的模块模式。
 * 所有方法通过依赖注入接收 state，不直接引用外部模块变量。
 */

import { logInfo, logError } from '/cdn/utils/core/log.js';
import { getAuthHeaders } from '/src/core/services/helper/authUtils.js?v=1';
import {
    validateApiResponse,
    validateApiItem,
    validateStory,
    validateStoryCount,
} from '../validators.js';
import { buildFileTreeFromSessions } from '/src/views/aicr/hooks/storeFileTreeBuilders.js';

const PROJECT_NAME = (typeof window !== 'undefined' && window.PROJECT_NAME) || 'YiWeb';
const PROJECT_PREFIX = PROJECT_NAME + '-';

const STATUS_FILE_SUFFIXES = [
    { suffix: '自改进复盘.md', status: 'operations' },
    { suffix: '测试报告.md',   status: 'testing' },
    { suffix: '测试设计.md',   status: 'testing' },
    { suffix: '实施报告.md',   status: 'develop' },
    { suffix: '使用场景.md',   status: 'design' },
];

const HEALTH_DOC_SUFFIXES = [
    '故事任务.md', '使用场景.md', '实施报告.md',
    '测试设计.md', '测试报告.md', '自改进复盘.md',
];

const NEXT_STEP_MAP = {
    planning:   '创建故事任务',
    design:     '编写使用场景',
    develop:    '编写实施报告',
    testing:    '编写测试报告',
    operations: '执行自改进复盘',
};

/* ---- 路径解析 ---- */

function isPanelFile(filePath) {
    return (filePath || '').includes('故事任务面板/');
}

function extractStoryName(filePath) {
    const parts = (filePath || '').split('/');
    const idx = parts.indexOf('故事任务面板');
    if (idx === -1 || idx + 2 >= parts.length) return null;
    return parts[idx + 1];
}

function extractProjectTag(item) {
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const normalized = tags
        .map(t => (t == null ? '' : String(t)).trim())
        .filter(t => t.length > 0 && String(t).toLowerCase() !== 'default');
    return normalized.length > 0 ? normalized[0] : null;
}

function determineStatus(filenames) {
    if (!Array.isArray(filenames)) return 'planning';
    for (const { suffix, status } of STATUS_FILE_SUFFIXES) {
        if (filenames.some(f => typeof f === 'string' && f.endsWith(suffix))) return status;
    }
    return 'planning';
}

/* ---- 主数据方法 ---- */

export function createStoryDataMethods(state) {
    async function fetchStories() {
        state.loading.value = true;
        state.error.value = null;
        try {
            const apiUrl = window.API_URL || 'https://api.effiy.cn';
            const body = {
                module_name: 'services.database.data_service',
                method_name: 'query_documents',
                parameters: { cname: 'sessions', limit: 10000 },
            };
            logInfo('[故事面板] 加载数据, API:', apiUrl);
            const res = await fetch(apiUrl + '/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...getAuthHeaders(),
                },
                credentials: 'omit',
                body: JSON.stringify(body),
            });
            const data = await res.json();
            const items = validateApiResponse(data);

            // 构建文件树（对标 AICR 数据管线）
            try {
                const { treeRoots } = buildFileTreeFromSessions(items);
                state.fileTree.value = treeRoots || [];
                logInfo('[故事面板] 文件树已构建，根节点:', state.fileTree.value.length);
            } catch (e) {
                logError('[故事面板] 文件树构建失败:', e);
                state.fileTree.value = [];
            }

            // 客户端过滤：匹配包含 故事任务面板/ 的 file_path，同时校验每条记录
            const panelItems = items.filter((item, i) =>
                validateApiItem(item, i) && isPanelFile(item.file_path)
            );
            logInfo('[故事面板] 共', items.length, '条记录, 面板相关', panelItems.length, '条');

            // 按故事名称分组
            const storyMap = new Map();
            for (const item of panelItems) {
                const name = extractStoryName(item.file_path);
                if (!name || typeof name !== 'string' || name.length === 0) continue;
                if (!storyMap.has(name)) storyMap.set(name, []);
                storyMap.get(name).push(item);
            }
            logInfo('[故事面板] 分组:', storyMap.size, '个故事');

            if (storyMap.size === 0) {
                state.stories.value = [];
                state.allProjectTags.value = [];
                state.loading.value = false;
                return;
            }

            // 处理每个故事
            const results = [];
            for (const [name, files] of storyMap) {
                const filenames = files.map(f =>
                    (f.file_path || '').split('/').pop()
                );
                const status = determineStatus(filenames);

                const projectTagsSet = new Set();
                for (const f of files) {
                    const tag = extractProjectTag(f);
                    if (tag) projectTagsSet.add(tag);
                }
                const projectTags = [...projectTagsSet].sort();

                const maxTs = Math.max(...files.map(f => f.updatedAt || 0));
                const createdTs = Math.min(
                    ...files.map(f => f.createdAt || Infinity)
                );

                const storyTaskFile = files.find(f => {
                    const fn = (f.file_path || '').split('/').pop();
                    return fn === '故事任务.md' || fn === PROJECT_PREFIX + '故事任务.md';
                });

                const healthScore = HEALTH_DOC_SUFFIXES.filter(suffix =>
                    filenames.some(f => f.endsWith(suffix))
                ).length;

                results.push(validateStory({
                    name,
                    status,
                    description: storyTaskFile?.title || '',
                    nextStep: NEXT_STEP_MAP[status] || '',
                    projectTags,
                    healthScore: Math.min(healthScore, 5),
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
                }));
            }

            results.sort((a, b) => b.lastModified - a.lastModified);
            state.stories.value = validateStoryCount(results, 5000);

            // 聚合项目标签
            const tagSet = new Set();
            for (const r of results) {
                for (const t of r.projectTags) tagSet.add(t);
            }
            state.allProjectTags.value = [...tagSet].sort();

            // 数据流日志
            const statusSummary = {};
            for (const r of results) {
                statusSummary[r.status] = (statusSummary[r.status] || 0) + 1;
                const ptags = r.projectTags.length > 0 ? r.projectTags.join(',') : '(无标签)';
                logInfo(`  [${r.status}] ${r.name} | ${ptags} | ${r.fileCount}文件 | 健康${r.healthScore}/5`);
            }
            logInfo('[故事面板] 标签:', [...tagSet].sort().join(', ') || '(无)');
            logInfo('[故事面板] 状态:', JSON.stringify(statusSummary));
            logInfo('[故事面板] 完成:', results.length, '个故事');
        } catch (err) {
            state.error.value = err.message || '加载失败';
            logError('[故事面板] 加载失败:', err);
        } finally {
            state.loading.value = false;
        }
    }

    function selectStory(name) {
        const story = state.stories.value.find(s => s.name === name);
        if (story) {
            state.selectedStory.value = story;
        }
    }

    function clearSelection() {
        state.selectedStory.value = null;
    }

    return {
        fetchStories,
        selectStory,
        clearSelection,
    };
}
