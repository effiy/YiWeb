/**
 * AI 增强搜索方法模块
 * 通过调用 services.ai.chat_service 解析自然语言搜索意图，
 * 结合 services.database.data_service → query_documents 查询文档，
 * 自动应用筛选条件。
 */
import { safeExecute, safeExecuteAsync } from '/cdn/utils/core/error.js';
import { getAuthHeaders, getStoredModel } from '/src/core/services/helper/authUtils.js';
import { getData } from '/src/core/services/index.js';
import { buildServiceUrl, SERVICE_MODULE } from '/src/core/services/helper/requestHelper.js';

const AI_SEARCH_SYSTEM_PROMPT = `你是一个搜索意图解析器。根据用户的自然语言查询，返回一个 JSON 对象，包含筛选条件。

可用筛选键：
- tags: 项目名称数组（一级目录名）
- storyTags: 故事名称数组（二级目录名）
- suffixTags: 后缀数组（可选值："故事任务"、"使用场景"、"技术评审"、"自改进复盘"）
- prefixTags: 前缀数组
- searchQuery: 文本搜索字符串
- noTags: 布尔值，筛选无标签的文件
- clearAll: 布尔值，清除所有筛选

示例：
- "显示所有的故事任务" → {"suffixTags": ["故事任务"]}
- "显示项目A的故事任务" → {"tags": ["项目A"], "suffixTags": ["故事任务"]}
- "查找使用场景和技术评审" → {"suffixTags": ["使用场景", "技术评审"]}
- "用户登录相关" → {"searchQuery": "用户登录"}
- "清除所有筛选" → {"clearAll": true}
- "显示没有故事的文件" → {"noTags": true}

只返回有效的 JSON，不要包含其他文本。`;

export const createAiSearchMethods = ({ store }) => {
    const { aiSearchEnabled, aiSearchLoading, aiSearchError, sessionSearchQuery, searchQuery } = store;

    const getApiBaseUrl = () => {
        return String(window.API_URL || '').trim().replace(/\/$/, '');
    };

    /**
     * 切换 AI 搜索模式
     */
    const handleAiSearchToggle = () => {
        return safeExecute(() => {
            const newValue = !aiSearchEnabled.value;
            aiSearchEnabled.value = newValue;
            aiSearchError.value = null;
            if (!newValue) {
                aiSearchLoading.value = false;
            }
        }, '切换AI搜索模式');
    };

    /**
     * 构建 AI 搜索请求载荷
     */
    const buildAiSearchPayload = (query) => {
        return {
            module_name: 'services.ai.chat_service',
            method_name: 'chat',
            parameters: {
                messages: [
                    { role: 'system', content: AI_SEARCH_SYSTEM_PROMPT },
                    { role: 'user', content: query }
                ],
                model: getStoredModel() || 'qwen3.5'
            }
        };
    };

    /**
     * 解析 AI 响应中的 JSON
     */
    const parseAiJsonResponse = (text) => {
        if (!text || typeof text !== 'string') return null;

        // 尝试直接解析
        try {
            return JSON.parse(text.trim());
        } catch (_) { /* continue */ }

        // 尝试从 markdown 代码块中提取
        const codeBlock = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
        if (codeBlock) {
            try {
                return JSON.parse(codeBlock[1].trim());
            } catch (_) { /* continue */ }
        }

        // 尝试找到第一个 JSON 对象
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (_) { /* continue */ }
        }

        return null;
    };

    /**
     * 调用 query_documents 查询匹配的文档
     */
    const queryDocuments = async (filters) => {
        const params = { cname: 'sessions' };

        if (filters.tags && filters.tags.length > 0) {
            params.tags = filters.tags;
        }
        if (filters.searchQuery) {
            params.search = filters.searchQuery;
        }

        try {
            const url = buildServiceUrl('query_documents', params);
            await getData(url, {}, true);
        } catch (e) {
            console.warn('[AI搜索] query_documents 调用失败:', e?.message || e);
        }
    };

    /**
     * 应用 AI 解析出的筛选条件
     */
    const applyAiFilters = async (filters) => {
        if (!filters || typeof filters !== 'object') return false;

        // 清除所有筛选
        if (filters.clearAll) {
            if (store.selectedSessionTags) store.selectedSessionTags.value = [];
            if (store.tagFilterNoTags) store.tagFilterNoTags.value = false;
            if (sessionSearchQuery) sessionSearchQuery.value = '';
            if (searchQuery) searchQuery.value = '';
            return true;
        }

        // 应用标签筛选（项目 + 故事）
        const allTags = [];
        if (Array.isArray(filters.tags)) allTags.push(...filters.tags);
        if (Array.isArray(filters.storyTags)) allTags.push(...filters.storyTags);

        if (allTags.length > 0 && store.selectedSessionTags) {
            const current = store.selectedSessionTags.value || [];
            const merged = [...new Set([...current, ...allTags])];
            store.selectedSessionTags.value = merged;
        }

        // 应用无标签筛选
        if (typeof filters.noTags === 'boolean' && store.tagFilterNoTags) {
            store.tagFilterNoTags.value = filters.noTags;
        }

        // 应用文本搜索
        if (typeof filters.searchQuery === 'string' && filters.searchQuery.trim()) {
            if (sessionSearchQuery) sessionSearchQuery.value = filters.searchQuery.trim();
        }

        // 可选：通过 query_documents 查询匹配文档
        if (filters.tags || filters.searchQuery) {
            await queryDocuments(filters);
        }

        return true;
    };

    /**
     * 调用 AI 服务解析搜索意图
     */
    const callAiService = async (query) => {
        const url = `${getApiBaseUrl()}/`;
        const payload = buildAiSearchPayload(query);
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...getAuthHeaders()
        };

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('认证失败，请重新登录');
            }
            throw new Error(`AI 服务返回错误: ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/event-stream')) {
            // 处理 SSE 流式响应 — 收集全部文本
            const text = await response.text();
            const lines = text.split('\n');
            let fullContent = '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        const content = data?.choices?.[0]?.delta?.content
                            || data?.message?.content
                            || data?.content
                            || '';
                        fullContent += content;
                    } catch (_) {
                        // 非 JSON data 行，跳过
                    }
                }
            }
            return fullContent;
        }

        // 普通 JSON 响应
        const data = await response.json();
        return data?.content || data?.message?.content || data?.choices?.[0]?.message?.content || JSON.stringify(data);
    };

    /**
     * 执行 AI 增强搜索
     * @param {string} query - 用户输入的自然语言查询
     */
    const handleAiSearch = async (query) => {
        return safeExecuteAsync(async () => {
            if (!query || !query.trim()) {
                aiSearchLoading.value = false;
                aiSearchError.value = null;
                return;
            }

            aiSearchLoading.value = true;
            aiSearchError.value = null;

            try {
                const responseText = await callAiService(query);
                const filters = parseAiJsonResponse(responseText);

                if (filters) {
                    await applyAiFilters(filters);
                } else {
                    // AI 未返回有效 JSON，降级为普通文本搜索
                    if (sessionSearchQuery) sessionSearchQuery.value = query;
                }
            } catch (error) {
                aiSearchError.value = error.message || 'AI 搜索失败';
                // 降级：使用原始查询作为文本搜索
                if (sessionSearchQuery) sessionSearchQuery.value = query;
            } finally {
                aiSearchLoading.value = false;
            }
        }, 'AI增强搜索');
    };

    return {
        handleAiSearchToggle,
        handleAiSearch
    };
};
