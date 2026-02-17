export const createSessionChatContextChatStreamingMethods = (ctx) => {
    const {
        safeExecute,
        postData,
        getPromptUrl,
        activeSession,
        sessionChatInput,
        sessionChatDraftImages,
        sessionChatLastDraftText,
        sessionChatLastDraftImages,
        sessionChatSending,
        sessionChatAbortController,
        sessionChatStreamingTargetTimestamp,
        sessionChatStreamingType,
        sessionChatRegenerateFeedback,
        sessionChatScrollRequest,
        sessionContextEnabled,
        sessionContextDraft,
        sessionBotModel,
        sessionBotSystemPrompt,
        defaultSessionBotSystemPrompt,
        weChatRobots,
        _isAbortError,
        _sessionChatMessageKey,
        _setFeedbackFlag,
        _buildSessionChatHistoryText,
        _buildSessionChatUserPrompt
    } = ctx || {};

    return {
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
                if (sessionChatScrollRequest) {
                    sessionChatScrollRequest.value = { type: 'index', index: i + 1 };
                }

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
                            accumulated += String(chunk || '');
                            try {
                                const cur = activeSession.value || nextSession;
                                const msgs = Array.isArray(cur.messages) ? [...cur.messages] : [];
                                const targetIdx = msgs.findIndex(m => m && m.type === 'pet' && m.timestamp === insertedPet.timestamp);
                                if (targetIdx >= 0) {
                                    msgs[targetIdx] = { ...msgs[targetIdx], message: accumulated, error: false, aborted: false };
                                    activeSession.value = { ...cur, messages: msgs };
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

                const now = Date.now();
                const petTimestamp = typeof originalPet.timestamp === 'number' ? originalPet.timestamp : now;
                const resetMessages = [...originalMessages];
                resetMessages[petIdx] = { ...originalPet, type: 'pet', timestamp: petTimestamp, message: '', error: false, aborted: false };
                activeSession.value = { ...currentSession, messages: resetMessages, updatedAt: now, lastAccessTime: now };
                if (sessionChatScrollRequest) {
                    sessionChatScrollRequest.value = { type: 'index', index: petIdx };
                }

                const pageContent = String(sessionContextDraft?.value ?? currentSession.pageContent ?? '').trim();
                const includeContext = sessionContextEnabled?.value === true;
                const history = _buildSessionChatHistoryText(originalMessages, petIdx);
                const fromSystem = String(sessionBotSystemPrompt?.value || defaultSessionBotSystemPrompt).trim() || defaultSessionBotSystemPrompt;
                const fromUser = _buildSessionChatUserPrompt({ text, images, pageContent, includeContext, historyText: history });

                const { streamPrompt } = await import('/src/services/modules/crud.js');
                const promptUrl = getPromptUrl();

                let accumulated = '';
                let lastScrollRequestAt = 0;
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
                            accumulated += String(chunk || '');
                            try {
                                const cur = activeSession.value;
                                const msgs = Array.isArray(cur.messages) ? [...cur.messages] : [];
                                const targetIdx = msgs.findIndex(m => m && m.type === 'pet' && m.timestamp === petTimestamp);
                                const useIdx = targetIdx >= 0 ? targetIdx : petIdx;
                                if (useIdx >= 0 && msgs[useIdx] && msgs[useIdx].type === 'pet') {
                                    msgs[useIdx] = { ...msgs[useIdx], message: accumulated, error: false, aborted: false };
                                    activeSession.value = { ...cur, messages: msgs };
                                    if (sessionChatScrollRequest) {
                                        const ts = Date.now();
                                        if (ts - lastScrollRequestAt > 120) {
                                            lastScrollRequestAt = ts;
                                            sessionChatScrollRequest.value = { type: 'autoIndex', index: useIdx };
                                        }
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
                if (sessionChatScrollRequest) {
                    sessionChatScrollRequest.value = { type: 'bottom' };
                }

                const pageContent = String(sessionContextDraft?.value ?? currentSession.pageContent ?? '').trim();
                const includeContext = sessionContextEnabled?.value === true;
                const history = _buildSessionChatHistoryText(originalMessages, petIdx);
                const fromSystem = String(sessionBotSystemPrompt?.value || defaultSessionBotSystemPrompt).trim() || defaultSessionBotSystemPrompt;

                const fromUser = _buildSessionChatUserPrompt({ text, images, pageContent, includeContext, historyText: history });

                const { streamPrompt } = await import('/src/services/modules/crud.js');
                const promptUrl = getPromptUrl();

                let accumulated = '';
                let lastScrollRequestAt = 0;
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
                                    if (sessionChatScrollRequest) {
                                        const ts = Date.now();
                                        if (ts - lastScrollRequestAt > 120) {
                                            lastScrollRequestAt = ts;
                                            sessionChatScrollRequest.value = { type: 'autoBottom' };
                                        }
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
                    _setFeedbackFlag(ctx?.sessionChatCopyFeedback, _sessionChatMessageKey(m, idx), 1200);
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
                _setFeedbackFlag(ctx?.sessionChatCopyFeedback, _sessionChatMessageKey(m, idx), 1200);
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
                    if (typeof postData !== 'function') {
                        throw new Error('请求能力不可用');
                    }
                    const data = await postData(apiUrl, payload, {}, { showError: false, promptLogin: false });
                    if (data && typeof data.code !== 'undefined' && data.code !== 0 && data.code !== 200) {
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
                if (sessionChatScrollRequest) {
                    sessionChatScrollRequest.value = { type: 'bottom' };
                }

                const pageContent = String(sessionContextDraft?.value ?? nextSession.pageContent ?? '').trim();
                const includeContext = sessionContextEnabled?.value === true;
                const history = _buildSessionChatHistoryText(prevMessages, prevMessages.length);
                const fromSystem = String(sessionBotSystemPrompt?.value || defaultSessionBotSystemPrompt).trim() || defaultSessionBotSystemPrompt;
                const fromUser = _buildSessionChatUserPrompt({ text, images: imageUrls, pageContent, includeContext, historyText: history });

                const { streamPrompt } = await import('/src/services/modules/crud.js');
                const promptUrl = getPromptUrl();

                let accumulated = '';
                let lastScrollRequestAt = 0;
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
                                        if (sessionChatScrollRequest) {
                                            const ts = Date.now();
                                            if (ts - lastScrollRequestAt > 120) {
                                                lastScrollRequestAt = ts;
                                                sessionChatScrollRequest.value = { type: 'autoBottom' };
                                            }
                                        }
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
                            try {
                                if (typeof postData !== 'function') return;
                                await postData(
                                    String(r.webhook),
                                    { msgtype: 'text', text: { content } },
                                    {},
                                    { showError: false, promptLogin: false, autoClearToken: false, withAuth: false }
                                );
                            } catch (_) { }
                        }));
                    }
                } catch (_) { }

                if (streamErrorMessage && window.showError) {
                    window.showError(streamErrorMessage);
                }
            }, '发送会话消息', (info) => { try { if (window.showError) window.showError(String(info?.message || '发送失败')); } catch (_) { } });
        }
    };
};
