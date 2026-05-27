import { getAuthHeaders } from '/src/core/services/helper/authUtils.js';

export function createAicrStoreSessionsOps(deps, state) {
    const { safeExecuteAsync, buildServiceUrl, getData } = deps;

    const loadSessions = async (forceRefresh = false) => {
        return safeExecuteAsync(async () => {
            console.log('[loadSessions] 开始加载会话列表, forceRefresh:', forceRefresh);
            state.sessionLoading.value = true;
            state.sessionError.value = null;

            try {
                const url = buildServiceUrl('query_documents', { cname: 'sessions' });
                console.log('[loadSessions] 请求URL:', url);
                const response = await getData(url, {}, false);
                console.log('[loadSessions] API响应:', response);

                let sessionList = [];
                if (Array.isArray(response)) {
                    sessionList = response;
                } else if (response && Array.isArray(response.sessions)) {
                    sessionList = response.sessions;
                } else if (response && Array.isArray(response.data)) {
                    sessionList = response.data;
                } else if (response && response.data && Array.isArray(response.data.sessions)) {
                    sessionList = response.data.sessions;
                } else if (response && response.data && response.data.list && Array.isArray(response.data.list)) {
                    sessionList = response.data.list;
                }

                if (!Array.isArray(sessionList)) {
                    console.warn('[loadSessions] 返回数据不是数组格式:', sessionList);
                    sessionList = [];
                }
                sessionList = sessionList.filter(s => s);

                sessionList.forEach(s => {
                    if (!s.tags) {
                        s.tags = [];
                    } else if (typeof s.tags === 'string') {
                        try {
                            if (s.tags.startsWith('[')) {
                                s.tags = JSON.parse(s.tags);
                            } else {
                                s.tags = s.tags.split(',').map(t => t.trim()).filter(Boolean);
                            }
                        } catch (e) {
                            console.warn('[loadSessions] 标签解析失败:', s.tags, e);
                            s.tags = [s.tags];
                        }
                    }

                    if (!Array.isArray(s.tags)) {
                        console.warn('[loadSessions] 标签格式错误 (非数组):', s.tags);
                        s.tags = [];
                    }

                    if (Object.prototype.hasOwnProperty.call(s, 'pageContent')) {
                        delete s.pageContent;
                    }
                });

                sessionList.forEach(s => {
                    const rawTitle = s.title != null ? s.title : (s.pageTitle != null ? s.pageTitle : '');
                    const normalizedTitle = String(rawTitle || '').trim().replace(/\s+/g, '_');
                    if (normalizedTitle) {
                        s.title = normalizedTitle;
                    }
                    if (Object.prototype.hasOwnProperty.call(s, 'pageTitle')) {
                        delete s.pageTitle;
                    }

                    const rawKey = s.key ? String(s.key) : '';
                    const badKey = !rawKey || /^[0-9a-fA-F]{24}$/.test(rawKey);
                    if (badKey) {
                        const title = s.title;
                        const tags = Array.isArray(s.tags) ? s.tags : [];
                        const pathTags = tags.filter(t => t && t !== 'default' && t !== 'Default');
                        if (title) {
                            const safeTitle = String(title).replace(/\//g, '-');
                            s.key = pathTags.length > 0 ? `${pathTags.join('/')}/${safeTitle}` : safeTitle;
                        }
                    } else {
                        s.key = rawKey;
                    }
                });

                sessionList = sessionList.filter(s => s && s.key);

                console.log('[loadSessions] 处理后会话示例:', sessionList[0]);

                sessionList.sort((a, b) => {
                    const aFavorite = a.isFavorite || false;
                    const bFavorite = b.isFavorite || false;

                    if (aFavorite !== bFavorite) {
                        return bFavorite ? 1 : -1;
                    }

                    const aTime = a.updatedAt || a.createdAt || 0;
                    const bTime = b.updatedAt || b.createdAt || 0;
                    return bTime - aTime;
                });

                state.sessions.value = sessionList;
                console.log('[loadSessions] 会话列表加载成功，共', sessionList.length, '个会话');
            } catch (error) {
                console.error('[loadSessions] 加载会话列表失败:', error);
                state.sessionError.value = error?.message || '加载会话列表失败';
                state.sessions.value = [];
            } finally {
                state.sessionLoading.value = false;
            }
        }, '加载会话列表');
    };

    const saveSessionSidebarWidth = (width) => {
        try {
            state.sessionSidebarWidth.value = width;
            localStorage.setItem('aicrSessionSidebarWidth', width.toString());
        } catch (error) {
            console.warn('[saveSessionSidebarWidth] 保存会话侧边栏宽度失败:', error);
        }
    };

    const loadSessionSidebarWidth = () => {
        try {
            const savedWidth = localStorage.getItem('aicrSessionSidebarWidth');
            if (savedWidth) {
                const width = Math.max(50, parseInt(savedWidth, 10));
                if (!isNaN(width)) {
                    state.sessionSidebarWidth.value = width;
                }
            }
        } catch (error) {
            console.warn('[loadSessionSidebarWidth] 加载会话侧边栏宽度失败:', error);
        }
    };

    const extractStoryName = (filePath) => {
        const parts = (filePath || '').split('/');
        const idx = parts.indexOf('故事任务面板');
        if (idx === -1 || idx + 2 >= parts.length) return null;
        return parts[idx + 1];
    };

    const DEFAULT_DOC_TYPES = ['故事任务', '使用场景', '技术评审', '测试设计', '安全审计', '实施报告', '测试报告', '自改进复盘'];

    const extractDocType = (filePath) => {
        const parts = (filePath || '').split('/');
        const last = parts[parts.length - 1] || '';
        return last.replace(/\.md$/i, '') || null;
    };

    const extractFromSessions = (sessions) => {
        const names = new Set();
        const docTypes = new Set();
        for (const s of sessions) {
            const fp = s.file_path || s.filePath || '';
            if (fp.startsWith('故事任务面板/')) {
                const name = extractStoryName(fp);
                if (name) names.add(name);
                const docType = extractDocType(fp);
                if (docType) docTypes.add(docType);
            }
        }
        return { names, docTypes };
    };

    const fallbackStoryNames = () => {
        const names = new Set();
        for (const s of (state.sessions?.value || [])) {
            const tags = Array.isArray(s.tags) ? s.tags : [];
            const firstTag = tags[0];
            if (firstTag && firstTag.toLowerCase() !== 'default') {
                names.add(firstTag);
            }
        }
        return [...names].sort();
    };

    const loadStoryNames = () => {
        return safeExecuteAsync(async () => {
            // 优先从文件树提取（数据源：项目目录 + docs + 故事任务面板下目录名）
            const tree = state.fileTree?.value;
            if (tree && Array.isArray(tree) && tree.length > 0) {
                // 运行时 import 避免循环依赖
                const { extractStoryNames, extractDocTypes } = await import('/src/views/aicr/utils/filterHelpers.js');
                state.storyNames.value = extractStoryNames(tree);
                state.storyDocTypes.value = extractDocTypes(tree);
                console.log('[loadStoryNames] 从文件树提取:', state.storyNames.value.length, '个故事,', state.storyDocTypes.value.length, '种类型');
                return;
            }

            // 文件树未加载时回退到 API
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
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...authHeaders },
                    credentials: 'omit',
                    body: JSON.stringify(body),
                });

                const data = await res.json();
                const items = data?.data?.list || data?.list || [];
                const apiResult = extractFromSessions(items);

                if (apiResult.names.size > 0) {
                    state.storyNames.value = [...apiResult.names].sort();
                    state.storyDocTypes.value = [...apiResult.docTypes].sort();
                    console.log('[loadStoryNames] API 加载:', state.storyNames.value.length, '个故事,', state.storyDocTypes.value.length, '种类型');
                    return;
                }

                // API returned no matches — try extracting from already-loaded sessions
                const sessionResult = extractFromSessions(state.sessions?.value || []);
                if (sessionResult.names.size > 0) {
                    state.storyNames.value = [...sessionResult.names].sort();
                    state.storyDocTypes.value = [...sessionResult.docTypes].sort();
                    console.log('[loadStoryNames] 从已加载会话中提取:', state.storyNames.value.length, '个故事');
                    return;
                }

                // Both failed — use fallback
                state.storyNames.value = fallbackStoryNames();
                state.storyDocTypes.value = DEFAULT_DOC_TYPES;
                console.log('[loadStoryNames] 使用回退策略:', state.storyNames.value.length, '个故事');
            } catch (error) {
                console.warn('[loadStoryNames] API 调用失败，尝试从已加载会话中提取:', error);

                const sessionResult = extractFromSessions(state.sessions?.value || []);
                if (sessionResult.names.size > 0) {
                    state.storyNames.value = [...sessionResult.names].sort();
                    state.storyDocTypes.value = [...sessionResult.docTypes].sort();
                    console.log('[loadStoryNames] 从已加载会话中提取:', state.storyNames.value.length, '个故事');
                    return;
                }

                state.storyNames.value = fallbackStoryNames();
                state.storyDocTypes.value = DEFAULT_DOC_TYPES;
                console.log('[loadStoryNames] 回退:', state.storyNames.value.length, '个故事,', state.storyDocTypes.value.length, '种类型');
            }
        }, '提取故事元数据');
    };

    return {
        loadSessions,
        loadStoryNames,
        saveSessionSidebarWidth,
        loadSessionSidebarWidth
    };
}
