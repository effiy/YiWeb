import { createSessionChatContextChatStreamingMethods } from './sessionChatContextChatMethods.streaming.js';

export const createSessionChatContextChatMethods = (ctx) => {
    const {
        store,
        safeExecute,
        postData,
        SERVICE_MODULE,
        renderMarkdownHtml,
        renderStreamingHtml,
        getPromptUrl,
        files,
        selectedKey,
        loadFileByKey,
        activeSession,
        activeSessionLoading,
        activeSessionError,
        sessionChatInput,
        sessionChatDraftImages,
        sessionChatLastDraftText,
        sessionChatLastDraftImages,
        sessionChatSending,
        sessionChatAbortController,
        sessionChatStreamingTargetTimestamp,
        sessionChatStreamingType,
        sessionChatCopyFeedback,
        sessionChatRegenerateFeedback,
        sessionChatScrollRequest,
        sessionContextEnabled,
        sessionContextDraft,
        sessionBotModel,
        sessionBotSystemPrompt,
        defaultSessionBotSystemPrompt,
        weChatRobots,
        sessionMessageEditorVisible,
        sessionMessageEditorDraft,
        sessionMessageEditorMode,
        sessionMessageEditorIndex,
        selectSessionForChat,
        ensureSessionContextScrollSync,
        ensureSessionMessageEditorScrollSync,
        cleanupSessionMessageEditorScrollSync,
        _isAbortError,
        _isStreamingMessage,
        _sessionChatMessageKey,
        _setFeedbackFlag,
        _moveSessionChatMessageBlock,
        _buildSessionChatHistoryText,
        _buildSessionChatUserPrompt,
        getSessionChatIsComposing,
        setSessionChatIsComposing,
        getSessionChatCompositionEndTime,
        setSessionChatCompositionEndTime,
        SESSION_CHAT_COMPOSITION_END_DELAY,
        formatDate,
        buildWelcomeCardHtml,
        buildWelcomeCardHtmlForSession,
        bindWelcomeCardEvents
    } = ctx || {};

    try {
        if (sessionChatScrollRequest && Vue && typeof Vue.watch === 'function') {
            Vue.watch(
                () => sessionChatScrollRequest.value,
                (req) => {
                    if (!req || typeof req !== 'object') return;

                    const run = () => {
                        const getContainer = () => {
                            try {
                                return document.getElementById('pet-chat-messages');
                            } catch (_) {
                                return null;
                            }
                        };

                        const shouldAutoScroll = () => {
                            try {
                                const el = getContainer();
                                if (!el) return true;
                                const distance = (el.scrollHeight || 0) - (el.scrollTop || 0) - (el.clientHeight || 0);
                                return distance < 140;
                            } catch (_) {
                                return true;
                            }
                        };

                        const scrollToIndex = (targetIdx) => {
                            try {
                                const el = document.querySelector(`[data-chat-idx="${targetIdx}"]`);
                                if (el && typeof el.scrollIntoView === 'function') {
                                    el.scrollIntoView({ block: 'nearest' });
                                    return;
                                }
                                const container = getContainer();
                                if (container) container.scrollTop = container.scrollHeight;
                            } catch (_) { }
                        };

                        const scrollToBottom = () => {
                            try {
                                const el = getContainer();
                                if (el) el.scrollTop = el.scrollHeight;
                            } catch (_) { }
                        };

                        const type = String(req.type || '');
                        if (type === 'index') {
                            scrollToIndex(Number(req.index));
                            return;
                        }
                        if (type === 'autoIndex') {
                            if (shouldAutoScroll()) scrollToIndex(Number(req.index));
                            return;
                        }
                        if (type === 'bottom') {
                            scrollToBottom();
                            return;
                        }
                        if (type === 'autoBottom') {
                            if (shouldAutoScroll()) scrollToBottom();
                            return;
                        }
                    };

                    setTimeout(run, 0);
                    sessionChatScrollRequest.value = null;
                },
                { deep: false }
            );
        }
    } catch (_) { }

    const sessionChatMethods = {
        selectSessionForChat,
        handleSessionSelect: async (session) => {
            return safeExecute(async () => {
                await selectSessionForChat(session, { toggleActive: false, openContextEditor: false });
            }, '选择会话');
        },
        sessionChatMessages: (session) => {
            try {
                const msgs = Array.isArray(session?.messages) ? session.messages : [];
                return [...msgs].map(m => {
                    const timestamp = typeof m?.timestamp === 'number' ? m.timestamp : Date.now();
                    const imageDataUrls = Array.isArray(m?.imageDataUrls) ? m.imageDataUrls.filter(Boolean) : [];
                    const imageDataUrl = String(m?.imageDataUrl || (imageDataUrls[0] || '') || '');
                    const message = String(m?.message || m?.content || m?.text || '');
                    return {
                        type: m?.type === 'pet' ? 'pet' : 'user',
                        message,
                        content: message,
                        timestamp,
                        imageDataUrls,
                        imageDataUrl,
                        error: !!m?.error,
                        aborted: !!m?.aborted
                    };
                });
            } catch (_) {
                return [];
            }
        },
        renderSessionChatMarkdown: (text) => {
            return renderMarkdownHtml(text, { breaks: true, gfm: true });
        },
        renderSessionChatStreamingHtml: (text) => {
            return renderStreamingHtml(text);
        },
        setSessionChatInput: (v) => {
            if (!sessionChatInput) return;
            sessionChatInput.value = String(v ?? '');
        },
        onSessionChatInput: (e) => {
            try {
                const v = e && e.target ? e.target.value : '';
                if (sessionChatInput) sessionChatInput.value = String(v ?? '');
                const el = e && e.target;
                if (el && el.style) {
                    el.style.height = 'auto';
                    const min = 60;
                    const max = 220;
                    const next = Math.max(min, Math.min(max, el.scrollHeight || min));
                    el.style.height = `${next}px`;
                }
            } catch (_) { }
        },
        onSessionChatCompositionStart: () => {
            if (typeof setSessionChatIsComposing === 'function') setSessionChatIsComposing(true);
            if (typeof setSessionChatCompositionEndTime === 'function') setSessionChatCompositionEndTime(0);
        },
        onSessionChatCompositionUpdate: () => {
            if (typeof setSessionChatIsComposing === 'function') setSessionChatIsComposing(true);
            if (typeof setSessionChatCompositionEndTime === 'function') setSessionChatCompositionEndTime(0);
        },
        onSessionChatCompositionEnd: () => {
            if (typeof setSessionChatIsComposing === 'function') setSessionChatIsComposing(false);
            if (typeof setSessionChatCompositionEndTime === 'function') setSessionChatCompositionEndTime(Date.now());
        },
        onSessionChatPaste: (e) => {
            try {
                const clipboard = e?.clipboardData;
                const items = clipboard?.items;
                if (!items || typeof items.length !== 'number') return;

                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (!item || typeof item.type !== 'string') continue;
                    if (!item.type.includes('image')) continue;
                    const file = item.getAsFile && item.getAsFile();
                    if (!file) continue;

                    e.preventDefault();

                    const reader = new FileReader();
                    reader.onload = () => {
                        try {
                            const dataUrl = String(reader.result || '').trim();
                            if (!dataUrl) return;
                            const current = Array.isArray(sessionChatDraftImages?.value) ? [...sessionChatDraftImages.value] : [];
                            if (current.length >= 4) {
                                if (window.showError) window.showError('最多支持 4 张图片');
                                return;
                            }
                            current.push(dataUrl);
                            if (sessionChatDraftImages) sessionChatDraftImages.value = current;
                            if (window.showSuccess) window.showSuccess('已添加图片');
                        } catch (_) { }
                    };
                    reader.readAsDataURL(file);
                    break;
                }
            } catch (_) { }
        },
        openSessionChatImagePicker: () => {
            try {
                const input = document.getElementById('pet-chat-image-input');
                if (input && typeof input.click === 'function') input.click();
            } catch (_) { }
        },
        onSessionChatImageInputChange: async (e) => {
            try {
                const input = e && e.target;
                const pickedFiles = input && input.files ? Array.from(input.files).filter(Boolean) : [];
                if (!pickedFiles || pickedFiles.length === 0) return;

                const current = Array.isArray(sessionChatDraftImages?.value) ? [...sessionChatDraftImages.value] : [];
                const remaining = Math.max(0, 4 - current.length);
                if (remaining <= 0) {
                    if (window.showError) window.showError('最多支持 4 张图片');
                    return;
                }

                const picked = pickedFiles.slice(0, remaining);
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

                const dataUrls = await Promise.all(picked.map(toDataUrl));
                const next = [...current, ...dataUrls.filter(v => v && v.startsWith('data:image/'))].slice(0, 4);
                if (sessionChatDraftImages) sessionChatDraftImages.value = next;
                if (window.showSuccess && next.length > current.length) window.showSuccess('已添加图片');
            } catch (_) {
            } finally {
                try {
                    const input = e && e.target;
                    if (input) input.value = '';
                } catch (_) { }
            }
        },
        removeSessionChatDraftImage: (idx) => {
            try {
                const list = Array.isArray(sessionChatDraftImages?.value) ? [...sessionChatDraftImages.value] : [];
                const i = Number(idx);
                if (!Number.isFinite(i) || i < 0 || i >= list.length) return;
                list.splice(i, 1);
                if (sessionChatDraftImages) sessionChatDraftImages.value = list;
            } catch (_) { }
        },
        clearSessionChatDraftImages: () => {
            if (sessionChatDraftImages) sessionChatDraftImages.value = [];
        },
        clearSessionChatInput: () => {
            if (!sessionChatInput) return;
            sessionChatInput.value = '';
        },
        onSessionChatKeydown: (e) => {
            try {
                if (!e) return;
                const composing = typeof getSessionChatIsComposing === 'function' ? getSessionChatIsComposing() : false;
                if (e.isComposing || composing) return;
                const compositionEndTime = typeof getSessionChatCompositionEndTime === 'function'
                    ? getSessionChatCompositionEndTime()
                    : 0;
                if (e.key === 'Enter' && compositionEndTime > 0) {
                    const delay = typeof SESSION_CHAT_COMPOSITION_END_DELAY === 'number'
                        ? SESSION_CHAT_COMPOSITION_END_DELAY
                        : 160;
                    if (Date.now() - compositionEndTime < delay) return;
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (typeof window.aicrApp?.sendSessionChatMessage === 'function') {
                        window.aicrApp.sendSessionChatMessage();
                    }
                    if (typeof setSessionChatCompositionEndTime === 'function') setSessionChatCompositionEndTime(0);
                    return;
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    if (sessionChatInput) sessionChatInput.value = '';
                    if (sessionChatDraftImages) sessionChatDraftImages.value = [];
                    try {
                        const el = document.getElementById('pet-chat-input');
                        if (el && el.style) {
                            el.style.height = '60px';
                            el.blur();
                        }
                    } catch (_) { }
                }
            } catch (_) { }
        },
        abortSessionChatRequest: () => {
            try {
                const controller = sessionChatAbortController?.value;
                if (controller && typeof controller.abort === 'function') {
                    controller.abort();
                }
            } catch (_) { }
        },
        isSessionChatStreamingMessage: (m, _idx) => {
            try {
                return _isStreamingMessage(m);
            } catch (_) {
                return false;
            }
        },
        isSessionChatRegenerating: (m, _idx) => {
            try {
                if (String(sessionChatStreamingType?.value || '') !== 'regenerate') return false;
                return _isStreamingMessage(m);
            } catch (_) {
                return false;
            }
        },
        sessionChatCopyButtonLabel: (m, idx) => {
            try {
                const key = _sessionChatMessageKey(m, idx);
                const map = sessionChatCopyFeedback?.value && typeof sessionChatCopyFeedback.value === 'object'
                    ? sessionChatCopyFeedback.value
                    : {};
                const expiresAt = map[key];
                if (typeof expiresAt === 'number' && Date.now() < expiresAt) return '已复制';
                return '复制';
            } catch (_) {
                return '复制';
            }
        },
        sessionChatRegenerateButtonLabel: (m, idx) => {
            try {
                if (String(sessionChatStreamingType?.value || '') === 'regenerate' && _isStreamingMessage(m)) {
                    return '生成中';
                }
                const key = _sessionChatMessageKey(m, idx);
                const map = sessionChatRegenerateFeedback?.value && typeof sessionChatRegenerateFeedback.value === 'object'
                    ? sessionChatRegenerateFeedback.value
                    : {};
                const expiresAt = map[key];
                if (typeof expiresAt === 'number' && Date.now() < expiresAt) return '已生成';
                if (m && (m.error || m.aborted)) return '重试';
                return '重新生成';
            } catch (_) {
                return '重新生成';
            }
        },
        canRegenerateSessionChatMessage: (session, idx) => {
            try {
                if (!session) return false;
                const messages = Array.isArray(session?.messages) ? session.messages : [];
                const i = Number(idx);
                if (!Number.isFinite(i) || i < 0 || i >= messages.length) return false;
                const m = messages[i];
                if (!m || m.type !== 'pet') return false;
                for (let j = i - 1; j >= 0; j--) {
                    const prev = messages[j];
                    if (!prev || prev.type === 'pet') continue;
                    const text = String(prev.message ?? prev.content ?? '').trim();
                    const hasImages =
                        (Array.isArray(prev.imageDataUrls) && prev.imageDataUrls.some(Boolean)) ||
                        !!String(prev.imageDataUrl || '').trim();
                    return !!(text || hasImages);
                }
                return false;
            } catch (_) {
                return false;
            }
        },
        editSessionChatMessageAt: (idx) => {
            try {
                const s = activeSession?.value;
                const messages = Array.isArray(s?.messages) ? s.messages : [];
                const i = Number(idx);
                if (!Number.isFinite(i) || i < 0 || i >= messages.length) return;
                const m = messages[i];
                if (!m) return;
                const text = String(m.message ?? m.content ?? '');

                if (sessionMessageEditorMode) sessionMessageEditorMode.value = 'split';
                if (sessionMessageEditorDraft) sessionMessageEditorDraft.value = text;
                if (sessionMessageEditorIndex) sessionMessageEditorIndex.value = i;
                if (sessionMessageEditorVisible) sessionMessageEditorVisible.value = true;
                ensureSessionMessageEditorScrollSync();
            } catch (_) { }
        },
        closeSessionMessageEditor: () => {
            if (sessionMessageEditorVisible) sessionMessageEditorVisible.value = false;
            if (sessionMessageEditorDraft) sessionMessageEditorDraft.value = '';
            if (sessionMessageEditorIndex) sessionMessageEditorIndex.value = -1;
            cleanupSessionMessageEditorScrollSync();
        },
        setSessionMessageEditorMode: (v) => {
            if (!sessionMessageEditorMode) return;
            sessionMessageEditorMode.value = v === 'preview' ? 'preview' : (v === 'split' ? 'split' : 'edit');
            ensureSessionMessageEditorScrollSync();
        },
        setSessionMessageEditorDraft: (v) => {
            if (!sessionMessageEditorDraft) return;
            sessionMessageEditorDraft.value = String(v ?? '');
        },
        saveSessionMessageEdit: async () => {
            return safeExecute(async () => {
                const content = String(sessionMessageEditorDraft?.value ?? '').trim();
                const idx = Number(sessionMessageEditorIndex?.value ?? -1);

                if (!Number.isFinite(idx) || idx < 0) {
                    throw new Error('无效的消息索引');
                }

                const s = activeSession?.value;
                if (!s || !s.key) {
                    throw new Error('未选择会话或会话缺少key');
                }

                const messages = Array.isArray(s.messages) ? [...s.messages] : [];
                if (idx >= messages.length) {
                    throw new Error('消息索引超出范围');
                }

                const m = messages[idx];
                if (!m) {
                    throw new Error('消息不存在');
                }

                messages[idx] = { ...m, message: content };

                const now = Date.now();
                const updatedSession = { ...s, messages, updatedAt: now, lastAccessTime: now };
                if (activeSession) activeSession.value = updatedSession;

                try {
                    const updateData = {
                        key: s.key,
                        messages: messages,
                        updatedAt: now,
                        lastAccessTime: now
                    };

                    const payload = {
                        module_name: SERVICE_MODULE,
                        method_name: 'update_document',
                        parameters: {
                            cname: 'sessions',
                            key: s.key,
                            data: updateData
                        }
                    };

                    const result = await postData(`${window.API_URL}/`, payload);

                    if (result && result.success === false) {
                        throw new Error(result.message || '保存失败');
                    }

                    if (store.sessions && store.sessions.value) {
                        const sessionIndex = store.sessions.value.findIndex(sess => sess && sess.key === s.key);
                        if (sessionIndex >= 0) {
                            store.sessions.value = [...store.sessions.value];
                            store.sessions.value[sessionIndex] = updatedSession;
                        }
                    }
                } catch (error) {
                    console.error('[保存消息编辑] 保存到服务器失败:', error);
                    throw error;
                }

                if (sessionMessageEditorVisible) sessionMessageEditorVisible.value = false;
                if (sessionMessageEditorDraft) sessionMessageEditorDraft.value = '';
                if (sessionMessageEditorIndex) sessionMessageEditorIndex.value = -1;

                if (window.showSuccess) window.showSuccess('已保存');
            }, '保存消息编辑');
        },
        deleteSessionChatMessageAt: async (idx) => {
            return safeExecute(async () => {
                if (sessionChatSending?.value) return;
                const s = activeSession?.value;
                if (!s) return;
                const messages = Array.isArray(s.messages) ? [...s.messages] : [];
                const i = Number(idx);
                if (!Number.isFinite(i) || i < 0 || i >= messages.length) return;
                if (!confirm('确定删除这条消息吗？')) return;

                messages.splice(i, 1);

                const now = Date.now();
                const nextSession = { ...s, messages, updatedAt: now, lastAccessTime: now };
                activeSession.value = nextSession;

                try {
                    const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                    const sessionSync = getSessionSyncService();
                    await sessionSync.saveSession(nextSession);
                } catch (_) { }
            }, '删除消息');
        },
        canMoveSessionChatMessageUp: (session, idx) => {
            try {
                const s = session || activeSession?.value;
                const messages = Array.isArray(s?.messages) ? s.messages : [];
                const i = Number(idx);
                if (!Number.isFinite(i) || i <= 0) return false;
                return i < messages.length;
            } catch (_) {
                return false;
            }
        },
        canMoveSessionChatMessageDown: (session, idx) => {
            try {
                const s = session || activeSession?.value;
                const messages = Array.isArray(s?.messages) ? s.messages : [];
                const i = Number(idx);
                if (!Number.isFinite(i) || i < 0) return false;
                return i < messages.length - 1;
            } catch (_) {
                return false;
            }
        },
        moveSessionChatMessageUp: async (idx) => {
            return safeExecute(async () => {
                await _moveSessionChatMessageBlock(idx, 'up');
            }, '上移消息');
        },
        moveSessionChatMessageDown: async (idx) => {
            return safeExecute(async () => {
                await _moveSessionChatMessageBlock(idx, 'down');
            }, '下移消息');
        },
        ...createSessionChatContextChatStreamingMethods(ctx),
        canSendSessionChat: Vue.computed(() => {
            try {
                const hasSession = !!(activeSession && activeSession.value);
                const text = String(sessionChatInput?.value ?? '').trim();
                const hasImages = Array.isArray(sessionChatDraftImages?.value) && sessionChatDraftImages.value.some(Boolean);
                const sending = !!sessionChatSending?.value;
                return hasSession && !sending && (!!text || hasImages);
            } catch (_) {
                return false;
            }
        }),
        formatDate,
        buildWelcomeCardHtml,
        buildWelcomeCardHtmlForSession,
        bindWelcomeCardEvents
    };

    return sessionChatMethods;
};
