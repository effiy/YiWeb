export const createSessionFaqMethods = ({
    store,
    safeExecute,
    getData,
    postData,
    batchOperations,
    buildServiceUrl,
    SERVICE_MODULE,
    closeSessionContextEditor
}) => {
    const { computed } = Vue;

    const {
        sessionFaqVisible,
        sessionFaqSearchKeyword,
        sessionFaqItems,
        sessionFaqLoading,
        sessionFaqError,
        sessionFaqDeletingMap,
        sessionFaqSelectedTags,
        sessionFaqTagFilterReverse,
        sessionFaqTagFilterNoTags,
        sessionFaqTagFilterExpanded,
        sessionFaqTagFilterVisibleCount,
        sessionFaqTagFilterSearchKeyword,
        sessionFaqTagManagerVisible,
        sessionSettingsVisible,
        sessionChatInput
    } = store || {};

    let sessionFaqEscHandler = null;
    let sessionFaqLastActiveElement = null;

    const normalizeFaqTags = (tags) => {
        if (!tags) return [];
        const raw = Array.isArray(tags) ? tags : String(tags).split(',');
        const seen = new Set();
        const out = [];
        for (const t of raw) {
            const s = String(t ?? '').trim();
            if (!s) continue;
            const k = s.toLowerCase();
            if (seen.has(k)) continue;
            seen.add(k);
            out.push(s);
        }
        return out;
    };

    const normalizeFaqDoc = (doc) => {
        const key = String(doc?.key ?? doc?.id ?? '').trim();
        return {
            key,
            title: String(doc?.title ?? '').trim(),
            prompt: String(doc?.prompt ?? doc?.text ?? '').trim(),
            tags: normalizeFaqTags(doc?.tags),
            order: Number.isFinite(Number(doc?.order)) ? Number(doc.order) : 0,
            updatedTime: doc?.updatedTime
        };
    };

    const getFaqQueryUrl = () => {
        return buildServiceUrl('query_documents', {
            cname: 'faqs',
            pageNum: 1,
            pageSize: 2000,
            orderBy: 'order',
            orderType: 'asc'
        });
    };

    const loadSessionFaqs = async ({ force = false } = {}) => {
        if (!sessionFaqItems || !sessionFaqLoading || !sessionFaqError) return [];
        if (!window.API_URL) {
            const msg = 'API地址未配置，无法加载常见问题';
            sessionFaqError.value = msg;
            return [];
        }

        const shouldUseCache = !force;
        sessionFaqLoading.value = true;
        sessionFaqError.value = null;
        try {
            const res = await getData(getFaqQueryUrl(), {}, shouldUseCache);
            const list = Array.isArray(res?.data?.list)
                ? res.data.list
                : (Array.isArray(res?.data) ? res.data : []);
            const normalized = list.map(normalizeFaqDoc).filter(i => i.key && (i.prompt || i.title));
            sessionFaqItems.value = normalized;
            return normalized;
        } catch (e) {
            const msg = e?.message || '加载常见问题失败';
            sessionFaqError.value = msg;
            sessionFaqItems.value = [];
            return [];
        } finally {
            sessionFaqLoading.value = false;
        }
    };

    const sessionFaqAllTags = computed(() => {
        const items = Array.isArray(sessionFaqItems?.value) ? sessionFaqItems.value : [];
        const map = new Map();
        for (const it of items) {
            const tags = Array.isArray(it?.tags) ? it.tags : [];
            for (const t of tags) {
                const s = String(t ?? '').trim();
                if (!s) continue;
                const k = s.toLowerCase();
                if (!map.has(k)) map.set(k, s);
            }
        }
        return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    });

    const sessionFaqVisibleTags = computed(() => {
        const kw = String(sessionFaqTagFilterSearchKeyword?.value || '').trim().toLowerCase();
        const all = Array.isArray(sessionFaqAllTags.value) ? sessionFaqAllTags.value : [];
        const filtered = kw ? all.filter(t => String(t).toLowerCase().includes(kw)) : all;
        const expanded = !!sessionFaqTagFilterExpanded?.value;
        const visibleCount = Math.max(0, Number(sessionFaqTagFilterVisibleCount?.value) || 0);
        return expanded ? filtered : filtered.slice(0, visibleCount || 0);
    });

    const filteredSessionFaqItems = computed(() => {
        const items = Array.isArray(sessionFaqItems?.value) ? sessionFaqItems.value : [];
        const searchKw = String(sessionFaqSearchKeyword?.value || '').trim().toLowerCase();
        const selectedTags = Array.isArray(sessionFaqSelectedTags?.value) ? sessionFaqSelectedTags.value : [];
        const reverse = !!sessionFaqTagFilterReverse?.value;
        const noTags = !!sessionFaqTagFilterNoTags?.value;

        return items.filter((it) => {
            if (searchKw) {
                const hay = `${String(it?.title || '')}\n${String(it?.prompt || '')}`.toLowerCase();
                if (!hay.includes(searchKw)) return false;
            }

            const tags = Array.isArray(it?.tags) ? it.tags : [];
            if (noTags) {
                return tags.length === 0;
            }

            if (selectedTags.length === 0) return true;

            const hasAny = tags.some(t => selectedTags.includes(t));
            return reverse ? !hasAny : hasAny;
        });
    });

    const toggleSessionFaqTag = (tag) => {
        const t = String(tag ?? '').trim();
        if (!t || !sessionFaqSelectedTags) return;
        const current = Array.isArray(sessionFaqSelectedTags.value) ? [...sessionFaqSelectedTags.value] : [];
        const idx = current.indexOf(t);
        if (idx >= 0) current.splice(idx, 1);
        else current.push(t);
        sessionFaqSelectedTags.value = current;
        if (sessionFaqTagFilterNoTags) sessionFaqTagFilterNoTags.value = false;
    };

    const clearSessionFaqTagFilters = () => {
        if (sessionFaqSelectedTags) sessionFaqSelectedTags.value = [];
        if (sessionFaqTagFilterReverse) sessionFaqTagFilterReverse.value = false;
        if (sessionFaqTagFilterNoTags) sessionFaqTagFilterNoTags.value = false;
    };

    const toggleSessionFaqTagReverse = () => {
        if (!sessionFaqTagFilterReverse) return;
        sessionFaqTagFilterReverse.value = !sessionFaqTagFilterReverse.value;
        if (sessionFaqTagFilterNoTags) sessionFaqTagFilterNoTags.value = false;
    };

    const toggleSessionFaqNoTags = () => {
        if (!sessionFaqTagFilterNoTags) return;
        const next = !sessionFaqTagFilterNoTags.value;
        sessionFaqTagFilterNoTags.value = next;
        if (next) {
            if (sessionFaqSelectedTags) sessionFaqSelectedTags.value = [];
            if (sessionFaqTagFilterReverse) sessionFaqTagFilterReverse.value = false;
        }
    };

    const toggleSessionFaqTagExpanded = () => {
        if (!sessionFaqTagFilterExpanded) return;
        sessionFaqTagFilterExpanded.value = !sessionFaqTagFilterExpanded.value;
    };

    const toggleSessionFaqTagManager = () => {
        if (!sessionFaqTagManagerVisible) return;
        sessionFaqTagManagerVisible.value = !sessionFaqTagManagerVisible.value;
    };

    const focusSessionFaqSearchInput = () => {
        try {
            const el = document.querySelector('.aicr-session-faq-search-input');
            if (el && typeof el.focus === 'function') el.focus();
        } catch (_) { }
    };

    const updateFaqDocument = async (key, patch) => {
        const faqKey = String(key ?? '').trim();
        if (!faqKey || !patch || typeof patch !== 'object') return null;
        if (!window.API_URL) throw new Error('API地址未配置');
        const payload = {
            module_name: SERVICE_MODULE,
            method_name: 'update_document',
            parameters: {
                cname: 'faqs',
                data: {
                    key: faqKey,
                    ...patch
                }
            }
        };
        return postData(`${window.API_URL}/`, payload);
    };

    const patchLocalFaq = (key, patch) => {
        const faqKey = String(key ?? '').trim();
        if (!faqKey || !sessionFaqItems) return;
        const current = Array.isArray(sessionFaqItems.value) ? sessionFaqItems.value : [];
        sessionFaqItems.value = current.map(it => (it && String(it.key) === faqKey ? { ...it, ...patch } : it));
    };

    const refreshSessionFaqs = async () => {
        return loadSessionFaqs({ force: true });
    };

    const editSessionFaqTags = async (item) => {
        const key = String(item?.key ?? '').trim();
        if (!key) return;
        const currentTags = normalizeFaqTags(item?.tags);
        const nextRaw = window.prompt('编辑标签（逗号分隔）：', currentTags.join(', '));
        if (nextRaw == null) return;
        const nextTags = normalizeFaqTags(nextRaw);
        try {
            if (sessionFaqLoading) sessionFaqLoading.value = true;
            await updateFaqDocument(key, { tags: nextTags });
            patchLocalFaq(key, { tags: nextTags });
            if (window.showSuccess) window.showSuccess('已更新标签');
        } catch (e) {
            if (window.showError) window.showError(e?.message || '更新标签失败');
        } finally {
            if (sessionFaqLoading) sessionFaqLoading.value = false;
        }
    };

    const renameSessionFaqTag = async (tag) => {
        const oldTag = String(tag ?? '').trim();
        if (!oldTag) return;
        const nextRaw = window.prompt('重命名标签为：', oldTag);
        if (nextRaw == null) return;
        const newTag = String(nextRaw ?? '').trim();
        if (!newTag || newTag === oldTag) return;

        const items = Array.isArray(sessionFaqItems?.value) ? sessionFaqItems.value : [];
        const affected = items.filter(it => Array.isArray(it?.tags) && it.tags.includes(oldTag));
        if (affected.length === 0) return;

        try {
            if (sessionFaqLoading) sessionFaqLoading.value = true;
            const url = `${window.API_URL}/`;
            const ops = affected.map(it => {
                const tags = normalizeFaqTags((it.tags || []).map(t => (t === oldTag ? newTag : t)));
                return {
                    type: 'POST',
                    url,
                    data: {
                        module_name: SERVICE_MODULE,
                        method_name: 'update_document',
                        parameters: { cname: 'faqs', data: { key: it.key, tags } }
                    }
                };
            });
            const res = await batchOperations(ops);
            for (const it of affected) {
                const tags = normalizeFaqTags((it.tags || []).map(t => (t === oldTag ? newTag : t)));
                patchLocalFaq(it.key, { tags });
            }
            if (res?.errorCount) {
                if (window.showError) window.showError(`部分标签更新失败（${res.errorCount}条）`);
            } else if (window.showSuccess) {
                window.showSuccess('已重命名标签');
            }
        } catch (e) {
            if (window.showError) window.showError(e?.message || '重命名标签失败');
        } finally {
            if (sessionFaqLoading) sessionFaqLoading.value = false;
        }
    };

    const deleteSessionFaqTag = async (tag) => {
        const target = String(tag ?? '').trim();
        if (!target) return;
        if (!confirm(`确定删除标签「${target}」？会从所有常见问题中移除。`)) return;

        const items = Array.isArray(sessionFaqItems?.value) ? sessionFaqItems.value : [];
        const affected = items.filter(it => Array.isArray(it?.tags) && it.tags.includes(target));
        if (affected.length === 0) return;

        try {
            if (sessionFaqLoading) sessionFaqLoading.value = true;
            const url = `${window.API_URL}/`;
            const ops = affected.map(it => {
                const tags = normalizeFaqTags((it.tags || []).filter(t => t !== target));
                return {
                    type: 'POST',
                    url,
                    data: {
                        module_name: SERVICE_MODULE,
                        method_name: 'update_document',
                        parameters: { cname: 'faqs', data: { key: it.key, tags } }
                    }
                };
            });
            const res = await batchOperations(ops);
            for (const it of affected) {
                const tags = normalizeFaqTags((it.tags || []).filter(t => t !== target));
                patchLocalFaq(it.key, { tags });
            }
            if (Array.isArray(sessionFaqSelectedTags?.value) && sessionFaqSelectedTags.value.includes(target)) {
                sessionFaqSelectedTags.value = sessionFaqSelectedTags.value.filter(t => t !== target);
            }
            if (res?.errorCount) {
                if (window.showError) window.showError(`部分标签删除失败（${res.errorCount}条）`);
            } else if (window.showSuccess) {
                window.showSuccess('已删除标签');
            }
        } catch (e) {
            if (window.showError) window.showError(e?.message || '删除标签失败');
        } finally {
            if (sessionFaqLoading) sessionFaqLoading.value = false;
        }
    };

    const openSessionFaq = async () => {
        if (sessionFaqVisible) sessionFaqVisible.value = true;
        if (sessionFaqSearchKeyword) sessionFaqSearchKeyword.value = '';
        if (sessionSettingsVisible) sessionSettingsVisible.value = false;
        try {
            if (typeof closeSessionContextEditor === 'function') closeSessionContextEditor();
        } catch (_) { }
        try {
            sessionFaqLastActiveElement = document.activeElement || null;
        } catch (_) {
            sessionFaqLastActiveElement = null;
        }
        try {
            const hasItems = Array.isArray(sessionFaqItems?.value) && sessionFaqItems.value.length > 0;
            if (!hasItems) {
                await loadSessionFaqs({ force: false });
            }
        } catch (_) { }
        try {
            if (sessionFaqEscHandler) {
                document.removeEventListener('keydown', sessionFaqEscHandler);
                sessionFaqEscHandler = null;
            }
            sessionFaqEscHandler = (e) => {
                try {
                    if (e && e.key === 'Escape') {
                        if (sessionFaqVisible) sessionFaqVisible.value = false;
                    }
                } catch (_) { }
            };
            document.addEventListener('keydown', sessionFaqEscHandler);
        } catch (_) { }
        setTimeout(() => focusSessionFaqSearchInput(), 0);
    };

    const closeSessionFaq = () => {
        if (sessionFaqVisible) sessionFaqVisible.value = false;
        try {
            if (sessionFaqEscHandler) {
                document.removeEventListener('keydown', sessionFaqEscHandler);
                sessionFaqEscHandler = null;
            }
        } catch (_) { }
        try {
            const chatInput = document.getElementById('pet-chat-input');
            if (chatInput && typeof chatInput.focus === 'function') {
                chatInput.focus();
                sessionFaqLastActiveElement = null;
                return;
            }
        } catch (_) { }
        try {
            const el = sessionFaqLastActiveElement;
            sessionFaqLastActiveElement = null;
            if (el && typeof el.focus === 'function') el.focus();
        } catch (_) { }
    };

    const clearSessionFaqSearch = () => {
        try {
            if (sessionFaqSearchKeyword) sessionFaqSearchKeyword.value = '';
        } catch (_) { }
        focusSessionFaqSearchInput();
    };

    const clearSessionFaqTagSearch = () => {
        try {
            if (sessionFaqTagFilterSearchKeyword) sessionFaqTagFilterSearchKeyword.value = '';
        } catch (_) { }
    };

    const addSessionFaqFromInput = async () => {
        return safeExecute(async () => {
            if (!window.API_URL) throw new Error('API地址未配置');
            const el = document.querySelector('.aicr-session-faq-input');
            const raw = String(el?.value || '').trim();
            if (!raw) return;
            const lines = raw.split('\n');
            const title = String(lines[0] || '').trim();
            const prompt = String(lines.slice(1).join('\n') || '').trim();
            const data = {
                key: `faq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                title: title || (prompt ? prompt.slice(0, 40) : '常见问题'),
                prompt,
                tags: []
            };
            const payload = {
                module_name: SERVICE_MODULE,
                method_name: 'create_document',
                parameters: { cname: 'faqs', data }
            };
            await postData(`${window.API_URL}/`, payload);
            if (el) el.value = '';
            await loadSessionFaqs({ force: true });
            focusSessionFaqSearchInput();
            if (window.showSuccess) window.showSuccess('已添加常见问题');
        }, '新增常见问题');
    };

    const deleteSessionFaqItem = async (item) => {
        return safeExecute(async () => {
            const key = String(item?.key || '').trim();
            if (!key) return;
            if (!confirm('确定要删除这条常见问题吗？')) return;
            try {
                const prev = sessionFaqDeletingMap?.value && typeof sessionFaqDeletingMap.value === 'object'
                    ? sessionFaqDeletingMap.value
                    : {};
                if (sessionFaqDeletingMap) sessionFaqDeletingMap.value = { ...prev, [key]: true };
            } catch (_) { }
            const payload = {
                module_name: SERVICE_MODULE,
                method_name: 'delete_document',
                parameters: { cname: 'faqs', key }
            };
            try {
                await postData(`${window.API_URL}/`, payload);
                await loadSessionFaqs({ force: true });
                if (window.showSuccess) window.showSuccess('已删除常见问题');
            } finally {
                try {
                    const prev = sessionFaqDeletingMap?.value && typeof sessionFaqDeletingMap.value === 'object'
                        ? sessionFaqDeletingMap.value
                        : {};
                    const { [key]: _removed, ...rest } = prev;
                    if (sessionFaqDeletingMap) sessionFaqDeletingMap.value = rest;
                } catch (_) { }
            }
        }, '删除常见问题');
    };

    const applySessionFaqItem = (item, mode = 'insert') => {
        const title = String(item?.title || '').trim();
        const prompt = String(item?.prompt || '').trim();
        const text = title && prompt ? `${title}\n\n${prompt}` : (prompt || title);
        if (!text) return;
        const current = String(sessionChatInput?.value || '');
        const next = current ? `${current}\n\n${text}` : text;
        if (sessionChatInput) sessionChatInput.value = next;
        try {
            const el = document.getElementById('pet-chat-input');
            if (el) {
                el.focus();
                el.style.height = 'auto';
                const min = 60;
                const max = 220;
                const nextH = Math.max(min, Math.min(max, el.scrollHeight || min));
                el.style.height = `${nextH}px`;
            }
        } catch (_) { }
        if (String(mode) === 'send') {
            setTimeout(() => {
                try {
                    if (typeof window.aicrApp?.sendSessionChatMessage === 'function') {
                        window.aicrApp.sendSessionChatMessage();
                    }
                } catch (_) { }
            }, 0);
        }
    };

    const copySessionFaqItem = async (item) => {
        return safeExecute(async () => {
            const title = String(item?.title || '').trim();
            const prompt = String(item?.prompt || '').trim();
            const text = title && prompt ? `${title}\n\n${prompt}` : (prompt || title);
            const content = String(text ?? '').trim();
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
        }, '复制常见问题');
    };

    return {
        sessionFaqItems,
        sessionFaqAllTags,
        sessionFaqVisibleTags,
        filteredSessionFaqItems,
        loadSessionFaqs,
        refreshSessionFaqs,
        toggleSessionFaqTag,
        clearSessionFaqTagFilters,
        toggleSessionFaqTagReverse,
        toggleSessionFaqNoTags,
        toggleSessionFaqTagExpanded,
        toggleSessionFaqTagManager,
        editSessionFaqTags,
        renameSessionFaqTag,
        deleteSessionFaqTag,
        openSessionFaq,
        closeSessionFaq,
        clearSessionFaqSearch,
        clearSessionFaqTagSearch,
        addSessionFaqFromInput,
        deleteSessionFaqItem,
        applySessionFaqItem,
        copySessionFaqItem
    };
};
