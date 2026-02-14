export const createSessionChatContextMethods = ({
    store,
    safeExecute,
    postData,
    SERVICE_MODULE,
    renderMarkdownHtml,
    renderStreamingHtml,
    getPromptUrl
}) => {
    const {
        files,
        selectedKey,
        setSelectedKey,
        loadFileByKey,
        activeSession,
        activeSessionLoading,
        activeSessionError,
        sessionChatInput,
        sessionContextEnabled,
        sessionContextDraft,
        sessionContextMode,
        sessionContextEditorVisible,
        sessionContextUserEdited,
        sessionContextOptimizing,
        sessionContextOptimizeStatus,
        sessionContextOptimizeBackup,
        sessionContextUndoVisible,
        sessionContextTranslating,
        sessionContextSaving,
        sessionContextSaveStatus,
        sessionContextRefreshConfirmUntil,
        sessionContextRefreshStatus,
        sessionSettingsVisible,
        sessionBotModel,
        sessionBotSystemPrompt,
        sessionBotModelDraft,
        sessionBotSystemPromptDraft,
        weChatSettingsVisible,
        weChatRobots,
        weChatRobotsDraft,
    } = store || {};
 
    const defaultSessionBotSystemPrompt = '你是一个专业、简洁且可靠的 AI 助手。';
 
    const _sessionContextTimeouts = new Set();
    let _sessionContextKeydownHandler = null;
    let _sessionContextPreviewClickHandler = null;
    let __aicrImagePreviewRoot = null;
 
    let sessionContextScrollSyncCleanup = null;
 
    const _escapeHtml = (v) => {
        return String(v ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };
 
    const _insertTextAtTextarea = (textarea, text, fallbackValue = '') => {
        try {
            const t = textarea;
            if (!t || typeof t.selectionStart !== 'number' || typeof t.selectionEnd !== 'number') {
                return String(fallbackValue || '') + String(text || '');
            }
            const value = typeof t.value === 'string' ? t.value : String(fallbackValue || '');
            const start = t.selectionStart;
            const end = t.selectionEnd;
            const before = value.slice(0, start);
            const after = value.slice(end);
            const next = before + String(text || '') + after;
            try {
                t.value = next;
                const nextPos = start + String(text || '').length;
                t.selectionStart = nextPos;
                t.selectionEnd = nextPos;
            } catch (_) { }
            return next;
        } catch (_) {
            return String(fallbackValue || '') + String(text || '');
        }
    };
 
    const _openAicrImagePreview = (src) => {
        try {
            const url = String(src || '').trim();
            if (!url) return;
            if (!__aicrImagePreviewRoot) {
                const root = document.createElement('div');
                root.id = 'aicr-image-preview';
                root.style.cssText = 'position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.72);backdrop-filter:blur(2px)';
                root.innerHTML = `
                    <div style="position:relative;max-width:min(92vw,1200px);max-height:92vh;">
                        <img class="aicr-image-preview-img" style="max-width:92vw;max-height:92vh;border-radius:12px;box-shadow:0 20px 80px rgba(0,0,0,.55);background:rgba(255,255,255,0.06);" />
                        <button type="button" class="aicr-image-preview-close" style="position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:12px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.35);color:#fff;font-size:18px;cursor:pointer;">✕</button>
                    </div>
                `;
                root.addEventListener('click', (e) => {
                    try {
                        const t = e && e.target;
                        const close = t && t.closest ? t.closest('.aicr-image-preview-close') : null;
                        if (close) {
                            _closeAicrImagePreview();
                            return;
                        }
                        const img = t && t.closest ? t.closest('.aicr-image-preview-img') : null;
                        if (!img) _closeAicrImagePreview();
                    } catch (_) { }
                });
                document.body.appendChild(root);
                __aicrImagePreviewRoot = root;
            }
            const img = __aicrImagePreviewRoot.querySelector('.aicr-image-preview-img');
            if (img) img.src = url;
            __aicrImagePreviewRoot.style.display = 'flex';
        } catch (_) { }
    };
 
    const _closeAicrImagePreview = () => {
        try {
            if (__aicrImagePreviewRoot) __aicrImagePreviewRoot.style.display = 'none';
        } catch (_) { }
    };
 
    const _isAicrImagePreviewOpen = () => {
        try {
            return !!(__aicrImagePreviewRoot && __aicrImagePreviewRoot.style.display === 'flex');
        } catch (_) {
            return false;
        }
    };
 
    const _sessionContextSetStatus = (refObj, value, resetMs = 0, resetValue = '') => {
        try {
            if (!refObj) return;
            refObj.value = value;
            const ms = Number(resetMs);
            if (Number.isFinite(ms) && ms > 0) {
                const t = setTimeout(() => {
                    try { refObj.value = resetValue; } catch (_) { }
                }, ms);
                _sessionContextTimeouts.add(t);
            }
        } catch (_) { }
    };
 
    const cleanupSessionContextScrollSync = () => {
        if (typeof sessionContextScrollSyncCleanup === 'function') {
            sessionContextScrollSyncCleanup();
        }
        sessionContextScrollSyncCleanup = null;
    };
 
    const setupSessionContextScrollSync = () => {
        cleanupSessionContextScrollSync();
 
        const modal = document.querySelector('.aicr-session-context-modal-body');
        if (!modal) return;
 
        const split = modal.querySelector('.aicr-session-context-split');
        if (!split) return;
 
        const textarea = split.querySelector('.aicr-session-context-textarea');
        const preview = split.querySelector('.aicr-session-context-preview');
        if (!(textarea instanceof HTMLElement) || !(preview instanceof HTMLElement)) return;
 
        let lock = null;
        let rafId = 0;
 
        const syncScroll = (fromEl, toEl) => {
            const fromMax = Math.max(0, (fromEl.scrollHeight || 0) - (fromEl.clientHeight || 0));
            const toMax = Math.max(0, (toEl.scrollHeight || 0) - (toEl.clientHeight || 0));
            const ratio = fromMax > 0 ? (fromEl.scrollTop / fromMax) : 0;
            toEl.scrollTop = ratio * toMax;
        };
 
        const scheduleUnlock = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                lock = null;
                rafId = 0;
            });
        };
 
        const onTextareaScroll = () => {
            if (lock === 'preview') return;
            lock = 'textarea';
            syncScroll(textarea, preview);
            scheduleUnlock();
        };
 
        const onPreviewScroll = () => {
            if (lock === 'textarea') return;
            lock = 'preview';
            syncScroll(preview, textarea);
            scheduleUnlock();
        };
 
        textarea.addEventListener('scroll', onTextareaScroll, { passive: true });
        preview.addEventListener('scroll', onPreviewScroll, { passive: true });
 
        sessionContextScrollSyncCleanup = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = 0;
            lock = null;
            textarea.removeEventListener('scroll', onTextareaScroll);
            preview.removeEventListener('scroll', onPreviewScroll);
        };
    };
 
    const ensureSessionContextScrollSync = () => {
        const visible = !!sessionContextEditorVisible?.value;
        const mode = String(sessionContextMode?.value || '').toLowerCase();
        if (!visible || mode !== 'split') {
            cleanupSessionContextScrollSync();
            return;
        }
 
        const schedule = () => setupSessionContextScrollSync();
        if (typeof Vue !== 'undefined' && typeof Vue.nextTick === 'function') {
            Vue.nextTick(schedule);
            return;
        }
        setTimeout(schedule, 0);
    };
 
    const _closeSessionContextEditorInternal = () => {
        try {
            if (sessionContextEditorVisible) sessionContextEditorVisible.value = false;
            if (sessionContextDraft) sessionContextDraft.value = '';
            if (sessionContextMode) sessionContextMode.value = sessionContextMode.value || 'edit';
            if (sessionContextOptimizeBackup) sessionContextOptimizeBackup.value = '';
            if (sessionContextUndoVisible) sessionContextUndoVisible.value = false;
            if (sessionContextUserEdited) sessionContextUserEdited.value = false;
            if (sessionContextRefreshConfirmUntil) sessionContextRefreshConfirmUntil.value = 0;
            if (sessionContextRefreshStatus) sessionContextRefreshStatus.value = '';
            if (sessionContextOptimizeStatus) sessionContextOptimizeStatus.value = '';
            if (sessionContextSaveStatus) sessionContextSaveStatus.value = '';
            if (sessionContextTranslating) sessionContextTranslating.value = '';
            if (sessionContextOptimizing) sessionContextOptimizing.value = false;
            if (sessionContextSaving) sessionContextSaving.value = false;
            cleanupSessionContextScrollSync();
            try {
                if (_sessionContextKeydownHandler) {
                    document.removeEventListener('keydown', _sessionContextKeydownHandler, true);
                    _sessionContextKeydownHandler = null;
                }
            } catch (_) { }
            try {
                if (_sessionContextPreviewClickHandler) {
                    document.removeEventListener('click', _sessionContextPreviewClickHandler, true);
                    _sessionContextPreviewClickHandler = null;
                }
            } catch (_) { }
            try {
                _closeAicrImagePreview();
            } catch (_) { }
        } catch (_) { }
    };
 
    const _sessionContextChatOnce = async ({ system, user }) => {
        const { streamPromptJSON } = await import('/src/services/modules/crud.js');
        const promptUrl = typeof getPromptUrl === 'function'
            ? getPromptUrl()
            : `${String(window.API_URL || '').trim().replace(/\/$/, '')}/`;
        const res = await streamPromptJSON(promptUrl, {
            module_name: 'services.ai.chat_service',
            method_name: 'chat',
            parameters: {
                system: String(system || '').trim(),
                user: String(user || '').trim(),
                stream: false,
                ...(String(sessionBotModel?.value || '').trim()
                    ? { model: String(sessionBotModel.value || '').trim() }
                    : {})
            }
        });
        const text = String(res?.data?.message || res?.data?.content || res?.data || '').trim();
        return text;
    };
 
    const loadSessionBotSettings = () => {
        try {
            if (sessionBotModel) {
                const model = localStorage.getItem('aicr_session_bot_model');
                if (model != null) sessionBotModel.value = String(model || '').trim();
            }
            if (sessionBotSystemPrompt) {
                const prompt = localStorage.getItem('aicr_session_bot_system_prompt');
                if (prompt != null) {
                    const normalized = String(prompt || '').trim();
                    sessionBotSystemPrompt.value = normalized || defaultSessionBotSystemPrompt;
                }
            }
        } catch (_) { }
    };
 
    const persistSessionBotSettings = () => {
        try {
            if (sessionBotModel) localStorage.setItem('aicr_session_bot_model', String(sessionBotModel.value || '').trim());
            if (sessionBotSystemPrompt) localStorage.setItem('aicr_session_bot_system_prompt', String(sessionBotSystemPrompt.value || '').trim());
        } catch (_) { }
    };
 
    const loadWeChatSettings = () => {
        try {
            const raw = localStorage.getItem('aicr_wechat_robots');
            const arr = raw ? JSON.parse(raw) : [];
            if (Array.isArray(arr)) weChatRobots.value = arr.filter(r => r && typeof r === 'object');
            if ((!Array.isArray(weChatRobots.value) || weChatRobots.value.length === 0)) {
                const enabledRaw = localStorage.getItem('aicr_wechat_enabled');
                const webhookRaw = localStorage.getItem('aicr_wechat_webhook');
                const autoRaw = localStorage.getItem('aicr_wechat_auto_forward');
                const enabled = enabledRaw === 'true';
                const webhook = String(webhookRaw || '').trim();
                const autoForward = autoRaw === 'true';
                if (webhook) {
                    weChatRobots.value = [{
                        id: 'wr_' + Date.now(),
                        name: '机器人',
                        webhook,
                        enabled,
                        autoForward
                    }];
                }
            }
        } catch (_) { }
    };
 
    const persistWeChatSettings = () => {
        try {
            const arr = Array.isArray(weChatRobots?.value) ? weChatRobots.value : [];
            localStorage.setItem('aicr_wechat_robots', JSON.stringify(arr));
        } catch (_) { }
    };
 
    loadSessionBotSettings();
    loadWeChatSettings();
 
    const selectSessionForChat = async (session, { toggleActive = true, openContextEditor = false, syncSelectedKey = true, fileKeyOverride = null } = {}) => {
        if (!session || !session.key) {
            if (window.showError) window.showError('无效的会话数据');
            return;
        }
 
        const targetSessionKey = String(session.key);
 
        if (toggleActive && activeSession?.value && String(activeSession.value.key || '') === targetSessionKey) {
            if (setSelectedKey) setSelectedKey(null);
            if (activeSession) activeSession.value = null;
            if (sessionChatInput) sessionChatInput.value = '';
            if (sessionContextEditorVisible) sessionContextEditorVisible.value = false;
            if (sessionContextDraft) sessionContextDraft.value = '';
            return;
        }
 
        try {
            if ((!store.sessions?.value || store.sessions.value.length === 0) && typeof store.loadSessions === 'function') {
                await store.loadSessions(false);
            }
        } catch (_) { }
 
        let fileKey = null;
        const findNodeBySessionKey = (nodes) => {
            if (!nodes) return null;
            const list = Array.isArray(nodes) ? nodes : [nodes];
            for (const node of list) {
                if (node && node.type === 'file' && String(node.sessionKey || '') === targetSessionKey) return node;
                if (node && node.children) {
                    const found = findNodeBySessionKey(node.children);
                    if (found) return found;
                }
            }
            return null;
        };
 
        const foundNode = findNodeBySessionKey(store.fileTree?.value);
        if (foundNode) {
            fileKey = foundNode.key;
        } else {
            const tags = Array.isArray(session.tags) ? session.tags : [];
            let currentPath = '';
            tags.forEach((folderName) => {
                if (!folderName || (folderName.toLowerCase && folderName.toLowerCase() === 'default')) return;
                currentPath = currentPath ? currentPath + '/' + folderName : folderName;
            });
            let fileName = session.title || 'Untitled';
            fileName = String(fileName).trim().replace(/\s+/g, '_').replace(/\//g, '-');
            fileKey = currentPath ? currentPath + '/' + fileName : fileName;
        }
 
        if (fileKeyOverride != null && String(fileKeyOverride).trim()) {
            fileKey = String(fileKeyOverride).trim();
        }
 
        if (syncSelectedKey) {
            if (setSelectedKey) {
                setSelectedKey(fileKey);
            } else if (selectedKey) {
                selectedKey.value = fileKey;
            }
        }
 
        if (activeSessionLoading) activeSessionLoading.value = true;
        if (activeSessionError) activeSessionError.value = null;
        if (activeSession) {
            const baseSession = { ...(session || {}), key: targetSessionKey };
            if (!baseSession.messages || !Array.isArray(baseSession.messages)) baseSession.messages = [];
            activeSession.value = baseSession;
        }
 
        try {
            let fullSession = null;
            try {
                const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                const sessionSync = getSessionSyncService();
                fullSession = await sessionSync.getSession(targetSessionKey);
                console.log('[selectSessionForChat] 从后端加载会话数据，消息数量:', fullSession?.messages?.length || 0);
            } catch (e) {
                console.warn('[selectSessionForChat] 加载完整会话数据失败，使用传入的会话数据:', e);
            }
 
            const sourceSession = fullSession || session;
            const normalized = { ...(sourceSession || {}), key: targetSessionKey };
            if (!normalized.messages || !Array.isArray(normalized.messages)) {
                normalized.messages = [];
            }
            normalized.messages = normalized.messages.map(m => ({
                type: m?.type === 'pet' ? 'pet' : 'user',
                message: String(m?.message || m?.content || ''),
                timestamp: typeof m?.timestamp === 'number' ? m.timestamp : Date.now(),
                imageDataUrl: m?.imageDataUrl,
                imageDataUrls: Array.isArray(m?.imageDataUrls) ? m.imageDataUrls : (m?.imageDataUrl ? [m.imageDataUrl] : [])
            }));
 
            if (activeSession) activeSession.value = normalized;
 
            if (sessionContextEnabled) {
                try {
                    const saved = localStorage.getItem('aicr_context_switch_enabled');
                    if (saved === '0') sessionContextEnabled.value = false;
                    if (saved === '1') sessionContextEnabled.value = true;
                } catch (_) { }
            }
 
            if (sessionContextMode) sessionContextMode.value = openContextEditor ? 'split' : (sessionContextMode.value || 'edit');
 
            const apiBase = (window.API_URL && /^https?:\/\//i.test(window.API_URL)) ? String(window.API_URL).replace(/\/+$/, '') : '';
            let staticContent = '';
 
            if (apiBase) {
                let cleanPath = '';
 
                if (fileKey) {
                    cleanPath = String(fileKey || '').replace(/\\/g, '/').replace(/^\/+/, '');
                    if (cleanPath.startsWith('static/')) {
                        cleanPath = cleanPath.substring(7);
                    }
                    cleanPath = cleanPath.replace(/^\/+/, '');
                } else {
                    const tags = Array.isArray(session.tags) ? session.tags : [];
                    let currentPath = '';
                    tags.forEach((folderName) => {
                        if (!folderName || (folderName.toLowerCase && folderName.toLowerCase() === 'default')) return;
                        currentPath = currentPath ? currentPath + '/' + folderName : folderName;
                    });
                    let fileName = session.title || 'Untitled';
                    fileName = String(fileName).trim().replace(/\s+/g, '_').replace(/\//g, '-');
                    cleanPath = currentPath ? currentPath + '/' + fileName : fileName;
                    cleanPath = cleanPath.replace(/\\/g, '/').replace(/^\/+/, '');
                    if (cleanPath.startsWith('static/')) {
                        cleanPath = cleanPath.substring(7);
                    }
                    cleanPath = cleanPath.replace(/^\/+/, '');
                }
 
                if (!cleanPath) {
                    const pageDesc = session.pageDescription || '';
                    if (pageDesc && pageDesc.includes('文件：')) {
                        cleanPath = pageDesc.replace('文件：', '').trim();
                        cleanPath = cleanPath.replace(/\\/g, '/').replace(/^\/+/, '');
                        if (cleanPath.startsWith('static/')) {
                            cleanPath = cleanPath.substring(7);
                        }
                        cleanPath = cleanPath.replace(/^\/+/, '');
                    }
                }
 
                if (!cleanPath && targetSessionKey) {
                    cleanPath = `session_${targetSessionKey}.txt`;
                }
 
                if (cleanPath) {
                    try {
                        console.log('[selectSessionForChat] 调用 read-file 接口，路径:', cleanPath);
                        const res = await fetch(`${apiBase}/read-file`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ target_file: cleanPath })
                        });
                        if (res.ok) {
                            const json = await res.json();
                            if ((json.code === 200 || json.code === 0) && json.data && json.data.content) {
                                if (json.data.type !== 'base64') {
                                    staticContent = json.data.content;
                                    console.log('[selectSessionForChat] read-file 接口调用成功，内容长度:', staticContent.length);
                                } else {
                                    console.log('[selectSessionForChat] read-file 接口返回 base64 类型，跳过');
                                }
                            } else {
                                console.warn('[selectSessionForChat] read-file 接口返回异常:', json);
                            }
                        } else {
                            console.warn('[selectSessionForChat] read-file 接口调用失败，状态码:', res.status);
                        }
                    } catch (error) {
                        console.error('[selectSessionForChat] read-file 接口调用异常:', error);
                    }
                } else {
                    console.warn('[selectSessionForChat] 无法确定文件路径，跳过 read-file 接口调用');
                }
            } else {
                console.warn('[selectSessionForChat] API_URL 未配置，跳过 read-file 接口调用');
            }
            if (sessionContextDraft) sessionContextDraft.value = String(staticContent || '');
            if (activeSession?.value) {
                activeSession.value = { ...activeSession.value, pageContent: String(staticContent || '') };
            }
            if (sessionContextEditorVisible) sessionContextEditorVisible.value = !!openContextEditor;
            ensureSessionContextScrollSync();
            if (sessionChatInput) sessionChatInput.value = '';
 
            setTimeout(() => {
                const el = document.getElementById('pet-chat-messages');
                if (el) el.scrollTop = el.scrollHeight;
            }, 0);
        } catch (e) {
            if (activeSessionError) activeSessionError.value = e?.message || '加载会话失败';
            if (window.showError) window.showError(activeSessionError?.value || '加载会话失败');
        } finally {
            if (activeSessionLoading) activeSessionLoading.value = false;
        }
    };
 
    const formatDate = (date) => {
        try {
            if (!date || !(date instanceof Date)) {
                if (typeof date === 'number') {
                    date = new Date(date);
                } else {
                    return '';
                }
            }
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hour = String(date.getHours()).padStart(2, '0');
            const minute = String(date.getMinutes()).padStart(2, '0');
            return `${year}/${month}/${day} ${hour}:${minute}`;
        } catch (_) {
            return '';
        }
    };
 
    const buildWelcomeCardHtml = (pageInfo, session = null) => {
        try {
            const sessionTags = session && Array.isArray(session.tags) ? session.tags.filter(t => t && t.trim()) : [];
            const sessionMessages = session && Array.isArray(session.messages) ? session.messages : [];
            const sessionCreatedAt = session && session.createdAt ? session.createdAt : null;
            const sessionUpdatedAt = session && session.updatedAt ? session.updatedAt : null;
 
            const hasSessionUrl = session && session.url && session.url.trim();
            const shouldShowUrl = !session || hasSessionUrl;
 
            let pageInfoHtml = '<div class="welcome-card">';
 
            const hasTitle = pageInfo && pageInfo.title && pageInfo.title.trim();
            const hasUrl = shouldShowUrl && pageInfo && pageInfo.url && pageInfo.url.trim();
            const hasDescription = pageInfo && pageInfo.description && pageInfo.description.trim();
            const hasAnyContent = hasTitle || hasUrl || hasDescription || sessionTags.length > 0 ||
                sessionMessages.length > 0 || sessionCreatedAt || sessionUpdatedAt;
 
            if (!hasAnyContent) {
                pageInfoHtml += `
                        <div class="welcome-card-header">
                            <span class="welcome-card-title">当前页面</span>
                        </div>
                        <div class="welcome-card-section">
                            <div class="welcome-card-empty">暂无页面信息</div>
                        </div>
                    `;
                pageInfoHtml += '</div>';
                return pageInfoHtml;
            }
 
            if (hasTitle) {
                pageInfoHtml += `
                        <div class="welcome-card-header">
                            <span class="welcome-card-title">${_escapeHtml(pageInfo.title)}</span>
                        </div>
                    `;
            }
 
            if (hasUrl) {
                const urlId = `welcome-url-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                pageInfoHtml += `
                        <div class="welcome-card-section">
                            <div class="welcome-card-section-header">
                                <div class="welcome-card-section-title">🔗 网址</div>
                                <button type="button" class="welcome-card-action-btn" data-copy-target="${urlId}" title="复制网址" aria-label="复制网址">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                            <a href="${_escapeHtml(pageInfo.url)}" target="_blank" class="welcome-card-url" id="${urlId}">${_escapeHtml(pageInfo.url)}</a>
                        </div>
                    `;
            }
 
            if (hasDescription) {
                const descId = `welcome-desc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                pageInfoHtml += `
                        <div class="welcome-card-section welcome-card-description">
                            <div class="welcome-card-section-header">
                                <div class="welcome-card-section-title">📝 页面描述</div>
                                <button type="button" class="welcome-card-action-btn" data-copy-text="${_escapeHtml(pageInfo.description)}" title="复制描述" aria-label="复制描述">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                            <div class="markdown-content md-preview-body" id="${descId}">${renderMarkdownHtml(pageInfo.description, { breaks: true, gfm: true })}</div>
                        </div>
                    `;
            }
 
            if (sessionTags.length > 0) {
                const tagsHtml = sessionTags.map(tag => {
                    const escapedTag = _escapeHtml(tag);
                    return `<span class="welcome-card-tag">${escapedTag}</span>`;
                }).join('');
                pageInfoHtml += `
                        <div class="welcome-card-section">
                            <div class="welcome-card-section-title">🏷️ 标签</div>
                            <div class="welcome-card-tags">${tagsHtml}</div>
                        </div>
                    `;
            }
 
            if (sessionMessages.length > 0) {
                const userMessages = sessionMessages.filter(m => m.type === 'user' || m.role === 'user').length;
                pageInfoHtml += `
                        <div class="welcome-card-section">
                            <div class="welcome-card-section-title">💬 对话记录</div>
                            <div class="welcome-card-meta">
                                <span>共 ${sessionMessages.length} 条消息</span>
                                ${userMessages > 0 ? `<span>（用户: ${userMessages} 条）</span>` : ''}
                            </div>
                        </div>
                    `;
            }
 
            if (sessionCreatedAt || sessionUpdatedAt) {
                const createdDate = sessionCreatedAt ? new Date(sessionCreatedAt) : null;
                const updatedDate = sessionUpdatedAt ? new Date(sessionUpdatedAt) : null;
                const hasValidCreated = createdDate && !isNaN(createdDate.getTime());
                const hasValidUpdated = updatedDate && !isNaN(updatedDate.getTime());
                const isSameTime = hasValidCreated && hasValidUpdated &&
                    Math.abs(createdDate.getTime() - updatedDate.getTime()) < 60000;
 
                if (hasValidCreated || hasValidUpdated) {
                    pageInfoHtml += `
                            <div class="welcome-card-section">
                                <div class="welcome-card-section-title">⏰ 时间信息</div>
                                <div class="welcome-card-meta">
                                    ${hasValidCreated ? `<span>创建: ${_escapeHtml(formatDate(createdDate))}</span>` : ''}
                                    ${hasValidUpdated && !isSameTime ? `<span>更新: ${_escapeHtml(formatDate(updatedDate))}</span>` : ''}
                                </div>
                            </div>
                        `;
                }
            }
 
            pageInfoHtml += '</div>';
            return pageInfoHtml;
        } catch (_) {
            return '<div class="welcome-card"><div class="welcome-card-empty">构建欢迎卡片失败</div></div>';
        }
    };
 
    const buildWelcomeCardHtmlForSession = (session) => {
        if (!session) return '';
        try {
            const pageInfo = {
                title: session.title || '当前页面',
                url: session.url || '',
                description: session.pageDescription || ''
            };
            return buildWelcomeCardHtml(pageInfo, session);
        } catch (_) {
            return '';
        }
    };
 
    const sessionChatMethods = {
        selectSessionForChat,
        handleSessionSelect: async (session) => {
            return safeExecute(async () => {
                await selectSessionForChat(session, { toggleActive: false, openContextEditor: false });
            }, '选择会话');
        },
        renderSessionChatMarkdown: (text) => {
            return renderMarkdownHtml(text, { breaks: true, gfm: true });
        },
        renderSessionChatStreamingHtml: (text) => {
            return renderStreamingHtml(text);
        },
        formatDate,
        buildWelcomeCardHtml,
        buildWelcomeCardHtmlForSession
    };
 
    const sessionContextMethods = {
        toggleSessionContextSwitch: () => {
            if (!sessionContextEnabled) return;
            sessionContextEnabled.value = !sessionContextEnabled.value;
            try {
                localStorage.setItem('aicr_context_switch_enabled', sessionContextEnabled.value ? '1' : '0');
            } catch (_) { }
        },
        setSessionContextEnabled: (enabled) => {
            if (!sessionContextEnabled) return;
            sessionContextEnabled.value = !!enabled;
            try {
                localStorage.setItem('aicr_context_switch_enabled', sessionContextEnabled.value ? '1' : '0');
            } catch (_) { }
        },
        openSessionContextEditor: async () => {
            if (sessionContextMode) sessionContextMode.value = 'split';
            if (sessionContextOptimizeBackup) sessionContextOptimizeBackup.value = '';
            if (sessionContextUndoVisible) sessionContextUndoVisible.value = false;
            if (sessionContextUserEdited) sessionContextUserEdited.value = false;
            if (sessionContextRefreshConfirmUntil) sessionContextRefreshConfirmUntil.value = 0;
            if (sessionContextRefreshStatus) sessionContextRefreshStatus.value = '';
            if (sessionContextOptimizeStatus) sessionContextOptimizeStatus.value = '';
            if (sessionContextSaveStatus) sessionContextSaveStatus.value = '';
            if (sessionContextTranslating) sessionContextTranslating.value = '';
            if (sessionContextOptimizing) sessionContextOptimizing.value = false;
            if (sessionContextSaving) sessionContextSaving.value = false;
 
            const key = selectedKey?.value;
            let staticFile = null;
            if (key && typeof loadFileByKey === 'function') {
                staticFile = await loadFileByKey(key);
            }
            const staticContent = staticFile && typeof staticFile.content === 'string' ? staticFile.content : '';
            if (sessionContextDraft) sessionContextDraft.value = String(staticContent || '');
            if (activeSession?.value) {
                activeSession.value = { ...activeSession.value, pageContent: String(staticContent || '') };
            }
            if (sessionContextEditorVisible) sessionContextEditorVisible.value = true;
            ensureSessionContextScrollSync();
            try {
                if (_sessionContextKeydownHandler) {
                    document.removeEventListener('keydown', _sessionContextKeydownHandler, true);
                    _sessionContextKeydownHandler = null;
                }
                _sessionContextKeydownHandler = (e) => {
                    try {
                        if (!sessionContextEditorVisible?.value) return;
                        if (!e) return;
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            if (_isAicrImagePreviewOpen()) {
                                _closeAicrImagePreview();
                                return;
                            }
                            _closeSessionContextEditorInternal();
                            return;
                        }
                        const isSave = (e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey);
                        if (isSave) {
                            e.preventDefault();
                            if (typeof window.aicrApp?.saveSessionContext === 'function') {
                                window.aicrApp.saveSessionContext();
                            }
                        }
                    } catch (_) { }
                };
                document.addEventListener('keydown', _sessionContextKeydownHandler, true);
            } catch (_) { }
 
            try {
                if (_sessionContextPreviewClickHandler) {
                    document.removeEventListener('click', _sessionContextPreviewClickHandler, true);
                    _sessionContextPreviewClickHandler = null;
                }
                _sessionContextPreviewClickHandler = (e) => {
                    try {
                        if (!sessionContextEditorVisible?.value) return;
                        const t = e && e.target;
                        if (!t || t.nodeType !== 1) return;
                        const preview = t.closest ? t.closest('.aicr-session-context-preview') : null;
                        if (!preview) return;
                        if (String(t.tagName || '').toLowerCase() !== 'img') return;
                        const src = t.getAttribute ? (t.getAttribute('src') || '') : '';
                        if (!src) return;
                        if (e && typeof e.preventDefault === 'function') e.preventDefault();
                        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                        _openAicrImagePreview(src);
                    } catch (_) { }
                };
                document.addEventListener('click', _sessionContextPreviewClickHandler, true);
            } catch (_) { }
        },
        closeSessionContextEditor: () => {
            _closeSessionContextEditorInternal();
        },
        setSessionContextMode: (mode) => {
            if (!sessionContextMode) return;
            const v = String(mode || '').toLowerCase();
            sessionContextMode.value = v === 'preview' ? 'preview' : (v === 'split' ? 'split' : 'edit');
            ensureSessionContextScrollSync();
        },
        setSessionContextDraft: (v) => {
            if (!sessionContextDraft) return;
            sessionContextDraft.value = String(v ?? '');
            if (sessionContextUserEdited) sessionContextUserEdited.value = true;
        },
        onSessionContextPaste: async (e) => {
            let hideGlobalLoading = null;
            try {
                const clipboard = e?.clipboardData;
                const items = clipboard?.items;
                if (!items || typeof items.length !== 'number') return;
 
                const imageFiles = [];
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (!item || typeof item.type !== 'string') continue;
                    if (!item.type.includes('image')) continue;
                    const file = item.getAsFile && item.getAsFile();
                    if (file) imageFiles.push(file);
                }
                if (imageFiles.length === 0) return;
 
                if (e && typeof e.preventDefault === 'function') e.preventDefault();
 
                try {
                    const mod = await import('/src/utils/ui/loading.js');
                    if (mod && typeof mod.showGlobalLoading === 'function') mod.showGlobalLoading('正在上传图片...');
                    if (mod && typeof mod.hideGlobalLoading === 'function') hideGlobalLoading = mod.hideGlobalLoading;
                } catch (_) { }
 
                const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                const sessionSync = getSessionSyncService();
 
                const toDataUrl = (file) => new Promise((resolve, reject) => {
                    try {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result || '').trim());
                        reader.onerror = () => reject(new Error('读取图片失败'));
                        reader.readAsDataURL(file);
                    } catch (err) {
                        reject(err);
                    }
                });
 
                const picked = imageFiles.slice(0, 4);
                const dataUrls = (await Promise.all(picked.map(toDataUrl))).filter(v => v && v.startsWith('data:image/'));
                const urls = (await Promise.all(dataUrls.map((src) => sessionSync.uploadImageToOss(src, 'aicr/images')))).filter(Boolean);
                if (urls.length === 0) return;
 
                const md = urls.map(u => `![](${u})`).join('\n\n');
                const insertion = `\n\n${md}\n\n`;
 
                const textarea = e && e.target;
                const current = String(sessionContextDraft?.value ?? '');
                const next = _insertTextAtTextarea(textarea, insertion, current);
                if (sessionContextDraft) sessionContextDraft.value = next;
                if (sessionContextUserEdited) sessionContextUserEdited.value = true;
                if (activeSession?.value) {
                    activeSession.value = { ...activeSession.value, pageContent: next };
                }
                if (window.showSuccess) window.showSuccess('已插入图片');
            } catch (_) {
                if (window.showError) window.showError('图片粘贴失败');
            } finally {
                try { if (typeof hideGlobalLoading === 'function') hideGlobalLoading(); } catch (_) { }
            }
        },
        isSessionContextActionBusy: () => {
            try {
                const optimizing = !!sessionContextOptimizing?.value;
                const saving = !!sessionContextSaving?.value;
                const translating = !!String(sessionContextTranslating?.value || '').trim();
                return optimizing || saving || translating;
            } catch (_) {
                return false;
            }
        },
        copySessionContextDraft: async () => {
            return safeExecute(async () => {
                const content = String(sessionContextDraft?.value ?? '').trim();
                if (!content) return;
                if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                    await navigator.clipboard.writeText(content);
                    if (window.showSuccess) window.showSuccess('已复制');
                    return;
                }
                const ta = document.createElement('textarea');
                ta.value = content;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                ta.style.top = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                if (window.showSuccess) window.showSuccess('已复制');
            }, '复制页面上下文');
        },
        sessionContextOptimizeButtonLabel: () => {
            try {
                if (sessionContextOptimizing?.value) return '⏳';
                const status = String(sessionContextOptimizeStatus?.value || '');
                if (status === 'success') return '✅';
                if (status === 'error') return '✕';
                return '✨';
            } catch (_) {
                return '✨';
            }
        },
        sessionContextOptimizeButtonTitle: () => {
            return '智能优化上下文内容';
        },
        optimizeSessionContextDraft: async () => {
            return safeExecute(async () => {
                if (!sessionContextDraft) return;
                const raw = String(sessionContextDraft.value ?? '');
                if (!raw.trim()) return;
                if (sessionContextOptimizing?.value) return;
 
                if (sessionContextOptimizeBackup) sessionContextOptimizeBackup.value = raw;
                if (sessionContextUndoVisible) sessionContextUndoVisible.value = true;
 
                if (sessionContextOptimizing) sessionContextOptimizing.value = true;
                if (sessionContextOptimizeStatus) sessionContextOptimizeStatus.value = '';
                _sessionContextSetStatus(sessionContextOptimizeStatus, 'loading');
 
                try {
                    const systemPrompt = `你是一个专业的“页面上下文清理与排版”专家。
你的任务不是总结或改写，而是：在不新增信息、不遗漏关键信息的前提下，把页面渲染后的上下文内容清理干净并排版成更易读的 Markdown。
必须遵守：
1. 不总结、不提炼、不下结论，不添加原文没有的新信息
2. 尽量保持原文的信息顺序与层级，只做清理与格式化
3. 删除与正文无关的内容：广告/赞助、导航菜单、推荐/相关阅读、评论区、页脚版权、Cookie/订阅/登录提示、分享按钮文案等
4. 保留代码块、表格、列表、链接文字等结构；必要时仅做轻量的结构化（如把连续短句整理成列表）
5. 输出必须是有效的 Markdown，且只输出 Markdown 正文，不要任何解释`;
 
                    const cleaned = await _sessionContextChatOnce({ system: systemPrompt, user: raw });
                    if (!cleaned.trim()) throw new Error('未获取到优化结果');
                    sessionContextDraft.value = cleaned;
                    if (sessionContextUserEdited) sessionContextUserEdited.value = true;
                    _sessionContextSetStatus(sessionContextOptimizeStatus, 'success', 2000);
                    if (window.showSuccess) window.showSuccess('已优化');
                } catch (e) {
                    _sessionContextSetStatus(sessionContextOptimizeStatus, 'error', 2000);
                    throw e;
                } finally {
                    if (sessionContextOptimizing) {
                        const t = setTimeout(() => {
                            try { sessionContextOptimizing.value = false; } catch (_) { }
                        }, 2000);
                        _sessionContextTimeouts.add(t);
                    }
                }
            }, '智能优化页面上下文');
        },
        sessionContextTranslateButtonLabel: (target) => {
            try {
                const t = String(target || '').toLowerCase();
                if (String(sessionContextTranslating?.value || '').toLowerCase() === t) return '⏳';
                return t === 'en' ? '🇺🇸' : '🇨🇳';
            } catch (_) {
                return String(target || '').toLowerCase() === 'en' ? '🇺🇸' : '🇨🇳';
            }
        },
        translateSessionContextDraft: async (target = 'zh') => {
            return safeExecute(async () => {
                if (!sessionContextDraft) return;
                const raw = String(sessionContextDraft.value ?? '');
                if (!raw.trim()) return;
                const t = String(target || '').toLowerCase() === 'en' ? 'en' : 'zh';
                if (String(sessionContextTranslating?.value || '').trim()) return;
                if (sessionContextTranslating) sessionContextTranslating.value = t;
                try {
                    const systemPrompt = '你是一个专业翻译。只输出翻译后的正文，不要解释。保留 Markdown 结构（标题/列表/表格/代码块/链接）。不要改写，不要总结。';
                    const userPrompt = t === 'en'
                        ? `把下面的 Markdown 内容翻译成英文：\n\n${raw}`
                        : `把下面的 Markdown 内容翻译成中文：\n\n${raw}`;
                    const translated = await _sessionContextChatOnce({ system: systemPrompt, user: userPrompt });
                    if (!translated.trim()) throw new Error('未获取到翻译结果');
                    sessionContextDraft.value = translated;
                    if (sessionContextUserEdited) sessionContextUserEdited.value = true;
                    if (window.showSuccess) window.showSuccess('已翻译');
                } finally {
                    if (sessionContextTranslating) sessionContextTranslating.value = '';
                }
            }, '翻译页面上下文');
        },
        sessionContextSaveButtonLabel: () => {
            try {
                if (sessionContextSaving?.value) return '⏳';
                const status = String(sessionContextSaveStatus?.value || '');
                if (status === 'success') return '✅';
                if (status === 'error') return '✕';
                return '💾';
            } catch (_) {
                return '💾';
            }
        },
        sessionContextSaveButtonTitle: () => {
            return '保存修改 (Ctrl+S / Cmd+S)';
        },
        undoOptimizeSessionContextDraft: async () => {
            return safeExecute(async () => {
                const backup = String(sessionContextOptimizeBackup?.value ?? '');
                if (!backup) return;
                if (sessionContextDraft) sessionContextDraft.value = backup;
                if (sessionContextUndoVisible) sessionContextUndoVisible.value = false;
                if (sessionContextOptimizeBackup) sessionContextOptimizeBackup.value = '';
                if (window.showSuccess) window.showSuccess('已撤销');
            }, '撤销优化');
        },
        saveSessionContext: async () => {
            return safeExecute(async () => {
                if (sessionContextSaving?.value) return;
                if (sessionContextSaving) sessionContextSaving.value = true;
                if (sessionContextSaveStatus) sessionContextSaveStatus.value = '';
                _sessionContextSetStatus(sessionContextSaveStatus, 'loading');
 
                try {
                    const content = String(sessionContextDraft?.value ?? '');
                    const key = selectedKey?.value;
 
                    const apiBase = (window.API_URL && /^https?:\/\//i.test(window.API_URL))
                        ? String(window.API_URL).replace(/\/+$/, '')
                        : '';
 
                    if (apiBase && key) {
                        const file = Array.isArray(files?.value)
                            ? files.value.find(f => f && (f.key === key || f.path === key))
                            : null;
                        const path = String(file?.path || file?.key || key || '').replace(/\\/g, '/').replace(/^\/+/, '');
                        const cleanPath = path.startsWith('static/') ? path.slice(7) : path;
 
                        const res = await fetch(`${apiBase}/write-file`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ target_file: cleanPath, content, is_base64: false })
                        });
                        if (!res.ok) {
                            const errorData = await res.json().catch(() => ({}));
                            throw new Error(errorData.message || `保存失败: ${res.status}`);
                        }
                        const result = await res.json().catch(() => ({}));
                        if (result && result.code != null && result.code !== 0 && result.code !== 200) {
                            throw new Error(result.message || '保存失败');
                        }
 
                        if (Array.isArray(files?.value)) {
                            const idx = files.value.findIndex(f => f && (f.key === key || f.path === key));
                            if (idx >= 0) {
                                files.value[idx] = { ...files.value[idx], content, __fromStatic: true };
                            }
                        }
                    }
 
                    if (activeSession?.value) {
                        const prev = activeSession.value;
                        activeSession.value = { ...prev, pageContent: content, updatedAt: Date.now(), lastAccessTime: Date.now() };
                    }
 
                    if (sessionContextUserEdited) sessionContextUserEdited.value = false;
                    _sessionContextSetStatus(sessionContextSaveStatus, 'success', 2000);
                    if (window.showSuccess) window.showSuccess('已保存');
                } catch (e) {
                    _sessionContextSetStatus(sessionContextSaveStatus, 'error', 2000);
                    throw e;
                } finally {
                    if (sessionContextSaving) {
                        const t = setTimeout(() => {
                            try { sessionContextSaving.value = false; } catch (_) { }
                        }, 2000);
                        _sessionContextTimeouts.add(t);
                    }
                }
            }, '保存页面上下文');
        },
        downloadSessionContextDraft: async () => {
            return safeExecute(async () => {
                const content = String(sessionContextDraft?.value ?? '');
                if (!content.trim()) return;
                const key = selectedKey?.value;
                const file = Array.isArray(files?.value)
                    ? files.value.find(f => f && (f.key === key || f.path === key))
                    : null;
                const baseName = String(file?.name || file?.path || file?.key || key || 'page_context').split('/').pop() || 'page_context';
                const name = baseName.toLowerCase().endsWith('.md') ? baseName : `${baseName}.md`;
                const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                try {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = String(name || '').replace(/\s+/g, '_');
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                } finally {
                    URL.revokeObjectURL(url);
                }
                if (window.showSuccess) window.showSuccess('已下载');
            }, '下载页面上下文');
        }
    };
 
    const sessionSettingsMethods = {
        openSessionSettings: () => {
            if (store.sessionFaqVisible) store.sessionFaqVisible.value = false;
            _closeSessionContextEditorInternal();
            if (sessionBotModelDraft) sessionBotModelDraft.value = String(sessionBotModel?.value || '').trim();
            if (sessionBotSystemPromptDraft) sessionBotSystemPromptDraft.value = String(sessionBotSystemPrompt?.value || defaultSessionBotSystemPrompt).trim();
            if (sessionSettingsVisible) sessionSettingsVisible.value = true;
        },
        openWeChatSettings: () => {
            if (store.sessionFaqVisible) store.sessionFaqVisible.value = false;
            _closeSessionContextEditorInternal();
            const src = Array.isArray(weChatRobots?.value) ? weChatRobots.value : [];
            if (weChatRobotsDraft) weChatRobotsDraft.value = src.map(r => ({ ...r }));
            if (weChatSettingsVisible) weChatSettingsVisible.value = true;
        },
        closeSessionSettings: () => {
            if (sessionSettingsVisible) sessionSettingsVisible.value = false;
        },
        closeWeChatSettings: () => {
            if (weChatSettingsVisible) weChatSettingsVisible.value = false;
        },
        restoreSessionSettingsDefaults: () => {
            if (sessionBotModelDraft) sessionBotModelDraft.value = '';
            if (sessionBotSystemPromptDraft) sessionBotSystemPromptDraft.value = defaultSessionBotSystemPrompt;
        },
        restoreWeChatSettingsDefaults: () => {
            if (weChatRobotsDraft) weChatRobotsDraft.value = [];
        },
        saveSessionSettings: () => {
            const model = String(sessionBotModelDraft?.value || '').trim();
            const prompt = String(sessionBotSystemPromptDraft?.value || '').trim() || defaultSessionBotSystemPrompt;
            if (sessionBotModel) sessionBotModel.value = model;
            if (sessionBotSystemPrompt) sessionBotSystemPrompt.value = prompt;
            persistSessionBotSettings();
            if (sessionSettingsVisible) sessionSettingsVisible.value = false;
            if (window.showSuccess) window.showSuccess('已保存');
        },
        saveWeChatSettings: () => {
            const src = Array.isArray(weChatRobotsDraft?.value) ? weChatRobotsDraft.value : [];
            const normalized = src
                .map((r) => ({
                    id: r.id || ('wr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
                    name: String(r.name || '').trim() || '机器人',
                    webhook: String(r.webhook || '').trim(),
                    enabled: !!r.enabled,
                    autoForward: !!r.autoForward
                }))
                .filter(r => r.webhook);
            if (weChatRobots) weChatRobots.value = normalized;
            persistWeChatSettings();
            if (weChatSettingsVisible) weChatSettingsVisible.value = false;
            if (window.showSuccess) window.showSuccess('已保存');
        },
        addWeChatRobotDraft: () => {
            const list = Array.isArray(weChatRobotsDraft?.value) ? [...weChatRobotsDraft.value] : [];
            const idx = list.length + 1;
            list.push({
                id: 'wr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                name: '机器人' + idx,
                webhook: '',
                enabled: true,
                autoForward: true
            });
            weChatRobotsDraft.value = list;
        },
        removeWeChatRobotDraft: (index) => {
            const i = Number(index);
            const list = Array.isArray(weChatRobotsDraft?.value) ? [...weChatRobotsDraft.value] : [];
            if (!Number.isFinite(i) || i < 0 || i >= list.length) return;
            list.splice(i, 1);
            weChatRobotsDraft.value = list;
        }
    };
 
    return {
        ...sessionChatMethods,
        ...sessionContextMethods,
        ...sessionSettingsMethods,
        postData,
        SERVICE_MODULE
    };
};
