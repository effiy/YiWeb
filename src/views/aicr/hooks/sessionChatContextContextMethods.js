import { normalizeFilePath } from '../utils/fileFieldNormalizer.js';

export const createSessionChatContextContextMethods = (ctx) => {
    const {
        store,
        safeExecute,
        files,
        selectedKey,
        loadFileByKey,
        activeSession,
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
        getSessionContextTimeouts,
        getSessionContextKeydownHandler,
        setSessionContextKeydownHandler,
        getSessionContextPreviewClickHandler,
        setSessionContextPreviewClickHandler,
        _isAicrImagePreviewOpen,
        _closeAicrImagePreview,
        _openAicrImagePreview,
        _closeSessionContextEditorInternal,
        _insertTextAtTextarea,
        _sessionContextSetStatus,
        _sessionContextChatOnce,
        ensureSessionContextScrollSync
    } = ctx || {};

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
                const existing = typeof getSessionContextKeydownHandler === 'function' ? getSessionContextKeydownHandler() : null;
                if (existing) {
                    document.removeEventListener('keydown', existing, true);
                    if (typeof setSessionContextKeydownHandler === 'function') setSessionContextKeydownHandler(null);
                }
                const nextHandler = (e) => {
                    try {
                        if (!sessionContextEditorVisible?.value) return;
                        if (!e) return;
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            if (typeof _isAicrImagePreviewOpen === 'function' && _isAicrImagePreviewOpen()) {
                                if (typeof _closeAicrImagePreview === 'function') _closeAicrImagePreview();
                                return;
                            }
                            if (typeof _closeSessionContextEditorInternal === 'function') _closeSessionContextEditorInternal();
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
                if (typeof setSessionContextKeydownHandler === 'function') setSessionContextKeydownHandler(nextHandler);
                document.addEventListener('keydown', nextHandler, true);
            } catch (_) { }

            try {
                const existing = typeof getSessionContextPreviewClickHandler === 'function'
                    ? getSessionContextPreviewClickHandler()
                    : null;
                if (existing) {
                    document.removeEventListener('click', existing, true);
                    if (typeof setSessionContextPreviewClickHandler === 'function') setSessionContextPreviewClickHandler(null);
                }
                const nextHandler = (e) => {
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
                        if (typeof _openAicrImagePreview === 'function') _openAicrImagePreview(src);
                    } catch (_) { }
                };
                if (typeof setSessionContextPreviewClickHandler === 'function') setSessionContextPreviewClickHandler(nextHandler);
                document.addEventListener('click', nextHandler, true);
            } catch (_) { }
        },
        closeSessionContextEditor: () => {
            if (typeof _closeSessionContextEditorInternal === 'function') _closeSessionContextEditorInternal();
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
                    const mod = await import('/cdn/utils/ui/loading.js');
                    if (mod && typeof mod.showGlobalLoading === 'function') mod.showGlobalLoading('正在上传图片...');
                    if (mod && typeof mod.hideGlobalLoading === 'function') hideGlobalLoading = mod.hideGlobalLoading;
                } catch (_) { }

                const { getSessionSyncService } = await import('/src/core/services/aicr/sessionSyncService.js');
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
                const next = typeof _insertTextAtTextarea === 'function'
                    ? _insertTextAtTextarea(textarea, insertion, current)
                    : (current + insertion);
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
                if (typeof _sessionContextSetStatus === 'function') _sessionContextSetStatus(sessionContextOptimizeStatus, 'loading');

                try {
                    const systemPrompt = `你是一个专业的“页面上下文清理与排版”专家。
你的任务不是总结或改写，而是：在不新增信息、不遗漏关键信息的前提下，把页面渲染后的上下文内容清理干净并排版成更易读的 Markdown。
必须遵守：
1. 不总结、不提炼、不下结论，不添加原文没有的新信息
2. 尽量保持原文的信息顺序与层级，只做清理与格式化
3. 删除与正文无关的内容：广告/赞助、导航菜单、推荐/相关阅读、评论区、页脚版权、Cookie/订阅/登录提示、分享按钮文案等
4. 保留代码块、表格、列表、链接文字等结构；必要时仅做轻量的结构化（如把连续短句整理成列表）
5. 输出必须是有效的 Markdown，且只输出 Markdown 正文，不要任何解释`;

                    const cleaned = typeof _sessionContextChatOnce === 'function'
                        ? await _sessionContextChatOnce({ system: systemPrompt, user: raw })
                        : '';
                    if (!cleaned.trim()) throw new Error('未获取到优化结果');
                    sessionContextDraft.value = cleaned;
                    if (sessionContextUserEdited) sessionContextUserEdited.value = true;
                    if (typeof _sessionContextSetStatus === 'function') _sessionContextSetStatus(sessionContextOptimizeStatus, 'success', 2000);
                    if (window.showSuccess) window.showSuccess('已优化');
                } catch (e) {
                    if (typeof _sessionContextSetStatus === 'function') _sessionContextSetStatus(sessionContextOptimizeStatus, 'error', 2000);
                    throw e;
                } finally {
                    if (sessionContextOptimizing) {
                        const t = setTimeout(() => {
                            try { sessionContextOptimizing.value = false; } catch (_) { }
                        }, 2000);
                        const timeouts = typeof getSessionContextTimeouts === 'function' ? getSessionContextTimeouts() : null;
                        if (timeouts) timeouts.add(t);
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
                    const translated = typeof _sessionContextChatOnce === 'function'
                        ? await _sessionContextChatOnce({ system: systemPrompt, user: userPrompt })
                        : '';
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
                if (typeof _sessionContextSetStatus === 'function') _sessionContextSetStatus(sessionContextSaveStatus, 'loading');

                try {
                    const content = String(sessionContextDraft?.value ?? '');
                    const key = selectedKey?.value;

                    if (key && typeof store?.saveFileContent === 'function') {
                        const file = Array.isArray(files?.value)
                            ? files.value.find(f => f && (f.key === key || f.path === key))
                            : null;
                        const path = normalizeFilePath(file?.path || file?.key || key || '');
                        await store.saveFileContent(path, content, { isBase64: false });
                    }

                    if (activeSession?.value) {
                        const prev = activeSession.value;
                        activeSession.value = { ...prev, pageContent: content, updatedAt: Date.now(), lastAccessTime: Date.now() };
                    }

                    if (sessionContextUserEdited) sessionContextUserEdited.value = false;
                    if (typeof _sessionContextSetStatus === 'function') _sessionContextSetStatus(sessionContextSaveStatus, 'success', 2000);
                    if (window.showSuccess) window.showSuccess('已保存');
                } catch (e) {
                    if (typeof _sessionContextSetStatus === 'function') _sessionContextSetStatus(sessionContextSaveStatus, 'error', 2000);
                    throw e;
                } finally {
                    if (sessionContextSaving) {
                        const t = setTimeout(() => {
                            try { sessionContextSaving.value = false; } catch (_) { }
                        }, 2000);
                        const timeouts = typeof getSessionContextTimeouts === 'function' ? getSessionContextTimeouts() : null;
                        if (timeouts) timeouts.add(t);
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

    return sessionContextMethods;
};
