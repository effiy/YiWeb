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
        resendSessionChatMessageAt: async (idx) => {
            return safeExecute(async () => {
                if (sessionChatSending?.value) return;
                const s = activeSession?.value;
                if (!s) return;
                const originalMessages = Array.isArray(s.messages) ? s.messages : [];
                const i = Number(idx);
                if (!Number.isFinite(i) || i < 0 || i >= originalMessages.length) return;
                const userMsg = originalMessages[i];
                if (!userMsg || userMsg.type === 'pet') return;

                const text = String(userMsg.message ?? userMsg.content ?? '').trim();
                const images = (() => {
                    const list = Array.isArray(userMsg.imageDataUrls) ? userMsg.imageDataUrls.filter(Boolean) : [];
                    const first = String(userMsg.imageDataUrl || '').trim();
                    if (first) list.unshift(first);
                    return Array.from(new Set(list)).slice(0, 4);
                })();
                if (!text && images.length === 0) return;

                const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                const sessionSync = getSessionSyncService();
                const uploadOne = async (src) => {
                    const raw = String(src || '').trim();
                    if (!raw) return '';
                    if (/^https?:\/\//i.test(raw)) return raw;
                    if (!raw.startsWith('data:image/')) {
                        throw new Error('图片格式不支持');
                    }
                    return await sessionSync.uploadImageToOss(raw, 'aicr/images');
                };
                const imageUrls = images.length > 0
                    ? (await Promise.all(images.map((src, idx) => uploadOne(src, idx)))).filter(Boolean)
                    : [];
                if (images.length > 0 && imageUrls.length === 0) {
                    throw new Error('上传图片失败');
                }

                const shouldAutoScroll = () => {
                    try {
                        const el = document.getElementById('pet-chat-messages');
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
                        const container = document.getElementById('pet-chat-messages');
                        if (container) container.scrollTop = container.scrollHeight;
                    } catch (_) { }
                };

                const now = Date.now();
                const insertedPet = { type: 'pet', message: '', timestamp: now + 1 };
                const updatedUserMsg = imageUrls.length > 0
                    ? { ...userMsg, imageDataUrls: imageUrls, imageDataUrl: imageUrls[0] }
                    : userMsg;
                const nextMessages = [...originalMessages];
                nextMessages[i] = updatedUserMsg;
                nextMessages.splice(i + 1, 0, insertedPet);
                const nextSession = { ...s, messages: nextMessages, updatedAt: now, lastAccessTime: now };
                activeSession.value = nextSession;
                setTimeout(() => scrollToIndex(i + 1), 0);

                const pageContent = String(sessionContextDraft?.value ?? s.pageContent ?? '').trim();
                const includeContext = sessionContextEnabled?.value === true;
                const history = _buildSessionChatHistoryText(originalMessages, i);
                const fromSystem = String(sessionBotSystemPrompt?.value || defaultSessionBotSystemPrompt).trim() || defaultSessionBotSystemPrompt;
                const fromUser = _buildSessionChatUserPrompt({ text, images: imageUrls, pageContent, includeContext, historyText: history });

                const { streamPrompt } = await import('/src/services/modules/crud.js');
                const promptUrl = getPromptUrl();

                let accumulated = '';
                if (sessionChatStreamingTargetTimestamp) sessionChatStreamingTargetTimestamp.value = insertedPet.timestamp;
                if (sessionChatStreamingType) sessionChatStreamingType.value = 'resend';
                if (sessionChatSending) sessionChatSending.value = true;
                const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                if (sessionChatAbortController) sessionChatAbortController.value = controller;
                let streamErrorMessage = '';
                let streamAborted = false;

                try {
                    await streamPrompt(
                        promptUrl,
                        {
                            module_name: 'services.ai.chat_service',
                            method_name: 'chat',
                            parameters: {
                                system: fromSystem,
                                user: fromUser,
                                stream: true,
                                ...(String(sessionBotModel?.value || '').trim()
                                    ? { model: String(sessionBotModel.value || '').trim() }
                                    : {}),
                                ...(imageUrls.length > 0 ? { images: imageUrls } : {})
                            }
                        },
                        controller ? { signal: controller.signal } : {},
                        (chunk) => {
                            const autoScroll = shouldAutoScroll();
                            accumulated += String(chunk || '');
                            try {
                                const cur = activeSession.value || nextSession;
                                const msgs = Array.isArray(cur.messages) ? [...cur.messages] : [];
                                const targetIdx = msgs.findIndex(m => m && m.type === 'pet' && m.timestamp === insertedPet.timestamp);
                                if (targetIdx >= 0) {
                                    msgs[targetIdx] = { ...msgs[targetIdx], message: accumulated, error: false, aborted: false };
                                    activeSession.value = { ...cur, messages: msgs };
                                    if (autoScroll) scrollToIndex(targetIdx);
                                }
                            } catch (_) { }
                        }
                    );
                } catch (e) {
                    const aborted = _isAbortError(e);
                    if (aborted) {
                        streamAborted = true;
                    } else {
                        streamErrorMessage = String(e?.message || '请求失败');
                    }
                } finally {
                    if (sessionChatSending) sessionChatSending.value = false;
                    if (sessionChatAbortController) sessionChatAbortController.value = null;
                    if (sessionChatStreamingTargetTimestamp) sessionChatStreamingTargetTimestamp.value = null;
                    if (sessionChatStreamingType) sessionChatStreamingType.value = '';
                }

                const finalSession = (() => {
                    const cur = activeSession.value || nextSession;
                    const msgs = Array.isArray(cur.messages) ? [...cur.messages] : [];
                    const targetIdx = msgs.findIndex(m => m && m.type === 'pet' && m.timestamp === insertedPet.timestamp);
                    if (targetIdx >= 0) {
                        const trimmed = String(accumulated || '').trim();
                        const content = streamErrorMessage
                            ? (trimmed || `请求失败：${streamErrorMessage}`)
                            : (streamAborted && !trimmed ? '已停止' : trimmed);
                        msgs[targetIdx] = {
                            ...msgs[targetIdx],
                            message: content,
                            ...(streamErrorMessage ? { error: true } : {}),
                            ...(streamAborted ? { aborted: true } : {})
                        };
                    }
                    return { ...cur, messages: msgs, pageContent: String(sessionContextDraft?.value ?? cur.pageContent ?? '') };
                })();
                activeSession.value = finalSession;

                try {
                    const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                    const sessionSync = getSessionSyncService();
                    await sessionSync.saveSession({ ...finalSession, updatedAt: Date.now(), lastAccessTime: Date.now() });
                } catch (_) { }

                if (streamErrorMessage && window.showError) {
                    window.showError(streamErrorMessage);
                }
            }, '重新发送消息', (info) => { try { if (window.showError) window.showError(String(info?.message || '重试失败')); } catch (_) { } });
        },
        regenerateSessionChatMessageAt: async (idx) => {
            return safeExecute(async () => {
                if (sessionChatSending?.value) return;
                const currentSession = activeSession?.value;
                if (!currentSession) return;
                const originalMessages = Array.isArray(currentSession.messages) ? currentSession.messages : [];
                const petIdx = Number(idx);
                if (!Number.isFinite(petIdx) || petIdx < 0 || petIdx >= originalMessages.length) return;
                const originalPet = originalMessages[petIdx];
                if (!originalPet || originalPet.type !== 'pet') return;

                let userIdx = -1;
                for (let i = petIdx - 1; i >= 0; i--) {
                    const m = originalMessages[i];
                    if (m && m.type !== 'pet') {
                        userIdx = i;
                        break;
                    }
                }
                if (userIdx < 0) return;

                const userMsg = originalMessages[userIdx] || {};
                const text = String(userMsg.message ?? userMsg.content ?? '').trim();
                const images = (() => {
                    const list = Array.isArray(userMsg.imageDataUrls) ? userMsg.imageDataUrls.filter(Boolean) : [];
                    const first = String(userMsg.imageDataUrl || '').trim();
                    if (first) list.unshift(first);
                    return Array.from(new Set(list)).slice(0, 4);
                })();
                if (!text && images.length === 0) return;

                if (sessionChatLastDraftText) sessionChatLastDraftText.value = text;
                if (sessionChatLastDraftImages) sessionChatLastDraftImages.value = images;

                const shouldAutoScroll = () => {
                    try {
                        const el = document.getElementById('pet-chat-messages');
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
                        const container = document.getElementById('pet-chat-messages');
                        if (container) container.scrollTop = container.scrollHeight;
                    } catch (_) { }
                };

                const now = Date.now();
                const petTimestamp = typeof originalPet.timestamp === 'number' ? originalPet.timestamp : now;
                const resetMessages = [...originalMessages];
                resetMessages[petIdx] = { ...originalPet, type: 'pet', timestamp: petTimestamp, message: '', error: false, aborted: false };
                activeSession.value = { ...currentSession, messages: resetMessages, updatedAt: now, lastAccessTime: now };
                setTimeout(() => scrollToIndex(petIdx), 0);

                const pageContent = String(sessionContextDraft?.value ?? currentSession.pageContent ?? '').trim();
                const includeContext = sessionContextEnabled?.value === true;
                const history = _buildSessionChatHistoryText(originalMessages, petIdx);
                const fromSystem = String(sessionBotSystemPrompt?.value || defaultSessionBotSystemPrompt).trim() || defaultSessionBotSystemPrompt;
                const fromUser = _buildSessionChatUserPrompt({ text, images, pageContent, includeContext, historyText: history });

                const { streamPrompt } = await import('/src/services/modules/crud.js');
                const promptUrl = getPromptUrl();

                let accumulated = '';
                if (sessionChatStreamingTargetTimestamp) sessionChatStreamingTargetTimestamp.value = petTimestamp;
                if (sessionChatStreamingType) sessionChatStreamingType.value = 'regenerate';
                if (sessionChatSending) sessionChatSending.value = true;
                const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                if (sessionChatAbortController) sessionChatAbortController.value = controller;
                let streamErrorMessage = '';
                let streamAborted = false;

                try {
                    await streamPrompt(
                        promptUrl,
                        {
                            module_name: 'services.ai.chat_service',
                            method_name: 'chat',
                            parameters: {
                                system: fromSystem,
                                user: fromUser,
                                stream: true,
                                ...(String(sessionBotModel?.value || '').trim()
                                    ? { model: String(sessionBotModel.value || '').trim() }
                                    : {}),
                                ...(images.length > 0 ? { images } : {})
                            }
                        },
                        controller ? { signal: controller.signal } : {},
                        (chunk) => {
                            const autoScroll = shouldAutoScroll();
                            accumulated += String(chunk || '');
                            try {
                                const cur = activeSession.value;
                                const msgs = Array.isArray(cur.messages) ? [...cur.messages] : [];
                                const targetIdx = msgs.findIndex(m => m && m.type === 'pet' && m.timestamp === petTimestamp);
                                const useIdx = targetIdx >= 0 ? targetIdx : petIdx;
                                if (useIdx >= 0 && msgs[useIdx] && msgs[useIdx].type === 'pet') {
                                    msgs[useIdx] = { ...msgs[useIdx], message: accumulated, error: false, aborted: false };
                                    activeSession.value = { ...cur, messages: msgs };
                                    if (autoScroll) scrollToIndex(useIdx);
                                }
                            } catch (_) { }
                        }
                    );
                } catch (e) {
                    const aborted = _isAbortError(e);
                    if (aborted) {
                        streamAborted = true;
                    } else {
                        streamErrorMessage = String(e?.message || '请求失败');
                    }
                } finally {
                    if (sessionChatSending) sessionChatSending.value = false;
                    if (sessionChatAbortController) sessionChatAbortController.value = null;
                    if (sessionChatStreamingTargetTimestamp) sessionChatStreamingTargetTimestamp.value = null;
                    if (sessionChatStreamingType) sessionChatStreamingType.value = '';
                }

                const finalSession = (() => {
                    const cur = activeSession.value || currentSession;
                    const msgs = Array.isArray(cur.messages) ? [...cur.messages] : [];
                    const targetIdx = msgs.findIndex(m => m && m.type === 'pet' && m.timestamp === petTimestamp);
                    const useIdx = targetIdx >= 0 ? targetIdx : petIdx;
                    if (useIdx >= 0 && msgs[useIdx] && msgs[useIdx].type === 'pet') {
                        const trimmed = String(accumulated || '').trim();
                        const content = streamErrorMessage
                            ? (trimmed || `请求失败：${streamErrorMessage}`)
                            : (streamAborted && !trimmed ? '已停止' : trimmed);
                        msgs[useIdx] = {
                            ...msgs[useIdx],
                            message: content,
                            ...(streamErrorMessage ? { error: true } : {}),
                            ...(streamAborted ? { aborted: true } : {})
                        };
                    }
                    return { ...cur, messages: msgs, pageContent: String(sessionContextDraft?.value ?? cur.pageContent ?? '') };
                })();
                activeSession.value = finalSession;

                try {
                    const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                    const sessionSync = getSessionSyncService();
                    await sessionSync.saveSession({ ...finalSession, updatedAt: Date.now(), lastAccessTime: Date.now() });
                } catch (_) { }

                try {
                    const key = _sessionChatMessageKey({ timestamp: petTimestamp }, petIdx);
                    if (!streamErrorMessage && !streamAborted && String(accumulated || '').trim()) {
                        _setFeedbackFlag(sessionChatRegenerateFeedback, key, 1200);
                    }
                } catch (_) { }

                if (streamErrorMessage && window.showError) {
                    window.showError(streamErrorMessage);
                }
            }, '重新生成回复');
        },
        retryLastSessionChatMessage: async () => {
            return safeExecute(async () => {
                if (sessionChatSending?.value) return;
                const currentSession = activeSession?.value;
                if (!currentSession) return;
                const originalMessages = Array.isArray(currentSession.messages) ? currentSession.messages : [];
                if (originalMessages.length === 0) return;

                let petIdx = -1;
                for (let i = originalMessages.length - 1; i >= 0; i--) {
                    const m = originalMessages[i];
                    if (m && m.type === 'pet') {
                        petIdx = i;
                        break;
                    }
                }
                if (petIdx < 0) return;

                const originalPet = originalMessages[petIdx] || {};
                if (!originalPet.error && !originalPet.aborted) return;

                let userIdx = -1;
                for (let i = petIdx - 1; i >= 0; i--) {
                    const m = originalMessages[i];
                    if (m && m.type !== 'pet') {
                        userIdx = i;
                        break;
                    }
                }
                if (userIdx < 0) return;

                const userMsg = originalMessages[userIdx] || {};
                const text = String(userMsg.message ?? userMsg.content ?? '').trim();
                const images = (() => {
                    const list = Array.isArray(userMsg.imageDataUrls)
                        ? userMsg.imageDataUrls.filter(Boolean)
                        : [];
                    const first = String(userMsg.imageDataUrl || '').trim();
                    if (first) list.unshift(first);
                    return Array.from(new Set(list)).slice(0, 4);
                })();
                if (!text && images.length === 0) return;

                if (sessionChatLastDraftText) sessionChatLastDraftText.value = text;
                if (sessionChatLastDraftImages) sessionChatLastDraftImages.value = images;

                const shouldAutoScroll = () => {
                    try {
                        const el = document.getElementById('pet-chat-messages');
                        if (!el) return true;
                        const distance = (el.scrollHeight || 0) - (el.scrollTop || 0) - (el.clientHeight || 0);
                        return distance < 140;
                    } catch (_) {
                        return true;
                    }
                };

                const scrollToBottom = () => {
                    try {
                        const el = document.getElementById('pet-chat-messages');
                        if (el) el.scrollTop = el.scrollHeight;
                    } catch (_) { }
                };

                const now = Date.now();
                const petTimestamp = typeof originalPet.timestamp === 'number' ? originalPet.timestamp : now;
                const resetMessages = [...originalMessages];
                resetMessages[petIdx] = {
                    ...originalPet,
                    type: 'pet',
                    timestamp: petTimestamp,
                    message: '',
                    error: false,
                    aborted: false
                };
                activeSession.value = {
                    ...currentSession,
                    messages: resetMessages,
                    updatedAt: now,
                    lastAccessTime: now
                };
                setTimeout(scrollToBottom, 0);

                const pageContent = String(sessionContextDraft?.value ?? currentSession.pageContent ?? '').trim();
                const includeContext = sessionContextEnabled?.value === true;
                const history = _buildSessionChatHistoryText(originalMessages, petIdx);
                const fromSystem = String(sessionBotSystemPrompt?.value || defaultSessionBotSystemPrompt).trim() || defaultSessionBotSystemPrompt;

                const fromUser = _buildSessionChatUserPrompt({ text, images, pageContent, includeContext, historyText: history });

                const { streamPrompt } = await import('/src/services/modules/crud.js');
                const promptUrl = getPromptUrl();

                let accumulated = '';
                if (sessionChatStreamingTargetTimestamp) sessionChatStreamingTargetTimestamp.value = petTimestamp;
                if (sessionChatStreamingType) sessionChatStreamingType.value = 'send';
                if (sessionChatSending) sessionChatSending.value = true;
                const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                if (sessionChatAbortController) sessionChatAbortController.value = controller;
                let streamErrorMessage = '';
                let streamAborted = false;

                try {
                    await streamPrompt(
                        promptUrl,
                        {
                            module_name: 'services.ai.chat_service',
                            method_name: 'chat',
                            parameters: {
                                system: fromSystem,
                                user: fromUser,
                                stream: true,
                                ...(String(sessionBotModel?.value || '').trim()
                                    ? { model: String(sessionBotModel.value || '').trim() }
                                    : {}),
                                ...(images.length > 0 ? { images } : {})
                            }
                        },
                        controller ? { signal: controller.signal } : {},
                        (chunk) => {
                            const autoScroll = shouldAutoScroll();
                            accumulated += String(chunk || '');
                            try {
                                const s = activeSession.value;
                                const msgs = Array.isArray(s.messages) ? [...s.messages] : [];
                                let idx = -1;
                                for (let i = msgs.length - 1; i >= 0; i--) {
                                    const m = msgs[i];
                                    if (m && m.type === 'pet' && m.timestamp === petTimestamp) {
                                        idx = i;
                                        break;
                                    }
                                }
                                if (idx < 0) idx = petIdx;
                                if (idx >= 0 && msgs[idx] && msgs[idx].type === 'pet') {
                                    msgs[idx] = { ...msgs[idx], message: accumulated, error: false, aborted: false };
                                    activeSession.value = { ...s, messages: msgs };
                                    if (autoScroll) scrollToBottom();
                                }
                            } catch (_) { }
                        }
                    );
                } catch (e) {
                    const aborted = _isAbortError(e);
                    if (aborted) {
                        streamAborted = true;
                    } else {
                        streamErrorMessage = String(e?.message || '请求失败');
                    }
                } finally {
                    if (sessionChatSending) sessionChatSending.value = false;
                    if (sessionChatAbortController) sessionChatAbortController.value = null;
                    if (sessionChatStreamingTargetTimestamp) sessionChatStreamingTargetTimestamp.value = null;
                    if (sessionChatStreamingType) sessionChatStreamingType.value = '';
                }

                const finalSession = (() => {
                    const s = activeSession.value || currentSession;
                    const msgs = Array.isArray(s.messages) ? [...s.messages] : [];
                    let idx = -1;
                    for (let i = msgs.length - 1; i >= 0; i--) {
                        const m = msgs[i];
                        if (m && m.type === 'pet' && m.timestamp === petTimestamp) {
                            idx = i;
                            break;
                        }
                    }
                    if (idx < 0) idx = petIdx;
                    if (idx >= 0 && msgs[idx] && msgs[idx].type === 'pet') {
                        const trimmed = String(accumulated || '').trim();
                        const content = streamErrorMessage
                            ? (trimmed || `请求失败：${streamErrorMessage}`)
                            : (streamAborted && !trimmed ? '已停止' : trimmed);
                        msgs[idx] = {
                            ...msgs[idx],
                            message: content,
                            ...(streamErrorMessage ? { error: true } : {}),
                            ...(streamAborted ? { aborted: true } : {})
                        };
                    }
                    return { ...s, messages: msgs, pageContent: String(sessionContextDraft?.value ?? s.pageContent ?? '') };
                })();
                activeSession.value = finalSession;

                try {
                    const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                    const sessionSync = getSessionSyncService();
                    await sessionSync.saveSession({ ...finalSession, updatedAt: Date.now(), lastAccessTime: Date.now() });
                } catch (_) { }

                if (streamErrorMessage && window.showError) {
                    window.showError(streamErrorMessage);
                }
            }, '重试会话消息');
        },
        copySessionChatMessage: async (text, m, idx) => {
            return safeExecute(async () => {
                const content = String(text ?? '').trim();
                if (!content) return;
                if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                    await navigator.clipboard.writeText(content);
                    _setFeedbackFlag(sessionChatCopyFeedback, _sessionChatMessageKey(m, idx), 1200);
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
                _setFeedbackFlag(sessionChatCopyFeedback, _sessionChatMessageKey(m, idx), 1200);
                if (window.showSuccess) window.showSuccess('已复制');
            }, '复制消息');
        },
        sendSessionChatMessageToRobot: async (robot, m, _idx) => {
            return safeExecute(async () => {
                const r = robot || {};
                const webhook = String(r.webhook || '').trim();
                if (!webhook) return;
                const content = String((m && (m.message || m.content)) || '').trim();
                if (!content) return;

                if (!window.API_URL) {
                    throw new Error('API地址未配置');
                }

                try {
                    const apiUrl = `${window.API_URL}/wework/send-message`;
                    const payload = {
                        webhook_url: webhook,
                        content: content
                    };

                    const res = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const data = await res.json().catch(() => ({}));

                    if (!res.ok) {
                        throw new Error(data?.message || data?.errmsg || `发送失败: ${res.status}`);
                    }

                    if (data.code !== 0 && data.code !== undefined) {
                        throw new Error(data.message || data.errmsg || '发送失败');
                    }

                    if (window.showSuccess) window.showSuccess('已发送到机器人');
                } catch (e) {
                    if (window.showError) window.showError(e?.message || '发送失败');
                    throw e;
                }
            }, '发送到机器人');
        },
        sendSessionChatMessage: async () => {
            return safeExecute(async () => {
                if (!activeSession?.value) return;
                if (sessionChatSending?.value) return;
                const rawText = String(sessionChatInput?.value ?? '');
                const text = rawText.trim();
                const images = Array.isArray(sessionChatDraftImages?.value) ? sessionChatDraftImages.value.filter(Boolean).slice(0, 4) : [];
                if (!text && images.length === 0) return;

                if (sessionChatLastDraftText) sessionChatLastDraftText.value = text;
                if (sessionChatLastDraftImages) sessionChatLastDraftImages.value = images;

                const now = Date.now();
                const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                const sessionSync = getSessionSyncService();
                const uploadOne = async (src) => {
                    const raw = String(src || '').trim();
                    if (!raw) return '';
                    if (/^https?:\/\//i.test(raw)) return raw;
                    if (!raw.startsWith('data:image/')) {
                        throw new Error('图片格式不支持');
                    }
                    return await sessionSync.uploadImageToOss(raw, 'aicr/images');
                };
                const imageUrls = images.length > 0
                    ? (await Promise.all(images.map((src) => uploadOne(src)))).filter(Boolean)
                    : [];
                if (images.length > 0 && imageUrls.length === 0) {
                    throw new Error('上传图片失败');
                }

                const userMessage = {
                    type: 'user',
                    message: text,
                    timestamp: now,
                    ...(imageUrls.length > 0 ? { imageDataUrls: imageUrls, imageDataUrl: imageUrls[0] } : {})
                };
                const petMessage = { type: 'pet', message: '', timestamp: now + 1 };

                const prevSession = activeSession.value;
                const prevMessages = Array.isArray(prevSession.messages) ? prevSession.messages : [];
                const nextSession = {
                    ...prevSession,
                    messages: [...prevMessages, userMessage, petMessage],
                    updatedAt: now,
                    lastAccessTime: now
                };

                activeSession.value = nextSession;
                if (sessionChatInput) sessionChatInput.value = '';
                if (sessionChatDraftImages) sessionChatDraftImages.value = [];

                const shouldAutoScroll = () => {
                    try {
                        const el = document.getElementById('pet-chat-messages');
                        if (!el) return true;
                        const distance = (el.scrollHeight || 0) - (el.scrollTop || 0) - (el.clientHeight || 0);
                        return distance < 140;
                    } catch (_) {
                        return true;
                    }
                };

                const scrollToBottom = () => {
                    try {
                        const el = document.getElementById('pet-chat-messages');
                        if (el) el.scrollTop = el.scrollHeight;
                    } catch (_) { }
                };
                setTimeout(scrollToBottom, 0);

                const pageContent = String(sessionContextDraft?.value ?? nextSession.pageContent ?? '').trim();
                const includeContext = sessionContextEnabled?.value === true;
                const history = _buildSessionChatHistoryText(prevMessages, prevMessages.length);
                const fromSystem = String(sessionBotSystemPrompt?.value || defaultSessionBotSystemPrompt).trim() || defaultSessionBotSystemPrompt;
                const fromUser = _buildSessionChatUserPrompt({ text, images: imageUrls, pageContent, includeContext, historyText: history });

                const { streamPrompt } = await import('/src/services/modules/crud.js');
                const promptUrl = getPromptUrl();

                let accumulated = '';
                if (sessionChatStreamingTargetTimestamp) sessionChatStreamingTargetTimestamp.value = petMessage.timestamp;
                if (sessionChatStreamingType) sessionChatStreamingType.value = 'send';
                if (sessionChatSending) sessionChatSending.value = true;
                const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                if (sessionChatAbortController) sessionChatAbortController.value = controller;
                let streamErrorMessage = '';
                let streamAborted = false;

                try {
                    await streamPrompt(
                        promptUrl,
                        {
                            module_name: 'services.ai.chat_service',
                            method_name: 'chat',
                            parameters: {
                                system: fromSystem,
                                user: fromUser,
                                stream: true,
                                ...(String(sessionBotModel?.value || '').trim()
                                    ? { model: String(sessionBotModel.value || '').trim() }
                                    : {}),
                                ...(imageUrls.length > 0 ? { images: imageUrls } : {})
                            }
                        },
                        controller ? { signal: controller.signal } : {},
                        (chunk) => {
                            const autoScroll = shouldAutoScroll();
                            accumulated += String(chunk || '');
                            try {
                                const s = activeSession.value;
                                const msgs = Array.isArray(s.messages) ? [...s.messages] : [];
                                const lastIdx = msgs.length - 1;
                                if (lastIdx >= 0) {
                                    const last = msgs[lastIdx];
                                    if (last && last.type === 'pet' && last.timestamp === petMessage.timestamp) {
                                        msgs[lastIdx] = { ...last, message: accumulated, error: false, aborted: false };
                                        activeSession.value = { ...s, messages: msgs };
                                        if (autoScroll) scrollToBottom();
                                    }
                                }
                            } catch (_) { }
                        }
                    );
                } catch (e) {
                    const aborted = _isAbortError(e);
                    if (aborted) {
                        streamAborted = true;
                    } else {
                        streamErrorMessage = String(e?.message || '请求失败');
                    }
                } finally {
                    if (sessionChatSending) sessionChatSending.value = false;
                    if (sessionChatAbortController) sessionChatAbortController.value = null;
                    if (sessionChatStreamingTargetTimestamp) sessionChatStreamingTargetTimestamp.value = null;
                    if (sessionChatStreamingType) sessionChatStreamingType.value = '';
                }

                const finalSession = (() => {
                    const s = activeSession.value || nextSession;
                    const msgs = Array.isArray(s.messages) ? [...s.messages] : [];
                    const lastIdx = msgs.length - 1;
                    if (lastIdx >= 0) {
                        const last = msgs[lastIdx];
                        if (last && last.type === 'pet' && last.timestamp === petMessage.timestamp) {
                            const trimmed = String(accumulated || '').trim();
                            const content = streamErrorMessage
                                ? (trimmed || `请求失败：${streamErrorMessage}`)
                                : (streamAborted && !trimmed ? '已停止' : trimmed);
                            msgs[lastIdx] = {
                                ...last,
                                message: content,
                                ...(streamErrorMessage ? { error: true } : {}),
                                ...(streamAborted ? { aborted: true } : {})
                            };
                        }
                    }
                    return { ...s, messages: msgs, pageContent: String(sessionContextDraft?.value ?? s.pageContent ?? '') };
                })();
                activeSession.value = finalSession;

                try {
                    const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                    const sessionSync = getSessionSyncService();
                    await sessionSync.saveSession({ ...finalSession, updatedAt: Date.now(), lastAccessTime: Date.now() });
                } catch (_) { }

                try {
                    const robots = Array.isArray(weChatRobots?.value) ? weChatRobots.value : [];
                    const msgs = Array.isArray(finalSession.messages) ? finalSession.messages : [];
                    const last = msgs[msgs.length - 1];
                    const content = String(last?.message || last?.content || '').trim();
                    if (content) {
                        const targets = robots.filter(r => r && r.enabled && r.autoForward && r.webhook);
                        await Promise.all(targets.map(async (r) => {
                            await fetch(String(r.webhook), {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ msgtype: 'text', text: { content } })
                            }).catch(() => { });
                        }));
                    }
                } catch (_) { }

                if (streamErrorMessage && window.showError) {
                    window.showError(streamErrorMessage);
                }
            }, '发送会话消息', (info) => { try { if (window.showError) window.showError(String(info?.message || '发送失败')); } catch (_) { } });
        },
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
