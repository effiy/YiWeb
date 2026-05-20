/**
 * 故事任务面板 - 状态管理
 */
import { logInfo, logError } from '/cdn/utils/core/log.js';
import { getAuthHeaders } from '/src/core/services/helper/authUtils.js?v=1';

const { ref } = Vue;

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
                parameters: { cname: 'sessions', limit: 10000 }
            };
            const res = await fetch(apiUrl + '/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...authHeaders
                },
                credentials: 'omit',
                body: JSON.stringify(body)
            });
            const data = await res.json();
            const items = data?.data?.list || data?.list || [];
            const panelItems = items.filter(i => (i.file_path || '').startsWith('故事任务面板/'));

            const storyMap = new Map();
            for (const item of panelItems) {
                const parts = (item.file_path || '').split('/');
                if (parts.length >= 3) {
                    const name = parts[1];
                    if (!storyMap.has(name)) storyMap.set(name, []);
                    storyMap.get(name).push(item);
                }
            }

            const results = [];
            for (const [name, files] of storyMap) {
                const filenames = files.map(f => (f.file_path || '').split('/').pop());
                const has = (n) => filenames.some(fn => fn.includes('-' + n + '-'));
                const has_01 = has('01');
                const has_02 = has('02');
                const has_03 = has('03');
                const has_04 = has('04');
                const has_05 = has('05');
                const has_06 = has('06');
                const has_07 = has('07');
                const has_08 = has('08');
                const has_00 = has('00');
                const has_10 = has('10');

                let status = 'not_started';
                if (has_01) {
                    if (has_02 && has_05 && (has_03 || has_04)) {
                        if (has_06 || has_07) {
                            status = has_08 ? 'code_done' : 'code_in_progress';
                        } else {
                            status = 'docs_done';
                        }
                    } else {
                        status = 'docs_in_progress';
                    }
                }

                const hasBackend = has_03 || has_06;
                const hasFrontend = has_04 || has_07;
                let type = 'meta';
                if (hasBackend && hasFrontend) type = 'fullstack';
                else if (hasBackend) type = 'backend';
                else if (hasFrontend) type = 'frontend';

                const maxTs = Math.max(...files.map(f => f.updatedAt || 0));
                const createdTs = Math.min(...files.map(f => f.createdAt || Infinity));

                // 描述：从 01 文件的 title 字段提取，降级为空
                const file01 = files.find(f => {
                    const fn = (f.file_path || '').split('/').pop();
                    return fn.includes('-01-');
                });
                const description = file01?.title || '';

                // 下一步：从状态推导
                const nextStepMap = {
                    not_started: '启动文档管线',
                    docs_in_progress: '补齐文档基线',
                    docs_done: '启动编码实现',
                    code_in_progress: '继续实现验证',
                    code_done: '交付三步收口',
                    blocked: '解除阻断'
                };
                const nextStep = nextStepMap[status] || '';

                // 消息通知：00 文件
                const file00 = files.find(f => {
                    const fn = (f.file_path || '').split('/').pop();
                    return fn.includes('-00-');
                });
                const hasNotify = has_00;
                const notifyUpdatedAt = file00?.updatedAt || 0;

                // 交互日志：10 文件
                const file10 = files.find(f => {
                    const fn = (f.file_path || '').split('/').pop();
                    return fn.includes('-10-');
                });
                const hasLog = has_10;
                const logUpdatedAt = file10?.updatedAt || 0;

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
                        title: f.title || ''
                    })),
                    lastModified: maxTs,
                    createdAt: createdTs === Infinity ? 0 : createdTs
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
        clearSelection
    };
}
