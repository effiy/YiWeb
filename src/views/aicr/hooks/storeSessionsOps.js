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

    return {
        loadSessions,
        saveSessionSidebarWidth,
        loadSessionSidebarWidth
    };
}
