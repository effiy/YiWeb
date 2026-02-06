/**
 * 方法函数组合式
 * 提供与代码审查相关的常用操作方法
 * author: liangliang
 * 
 * @param {Object} store - 状态存储对象
 * @returns {Object} 方法集合
 */
import { safeExecute, createError, ErrorTypes, showSuccessMessage } from '/src/utils/error.js';
import { getData, postData, deleteData, batchOperations } from '/src/services/index.js';
import {
    normalizeFilePath,
    normalizeFileObject,
    normalizeTreeNode,
    extractFileName
} from '/src/views/aicr/utils/fileFieldNormalizer.js';
import { buildServiceUrl, SERVICE_MODULE } from '/src/services/helper/requestHelper.js';
import { getFileDeleteService, buildFileTreeFromSessions } from './store.js';

export const useMethods = (store) => {
    const {
        fileTree,
        selectedKey,
        expandedFolders,
        setSelectedKey,
        normalizeKey,
        toggleFolder,
        toggleSidebar,
        loadFileTree,
        loadFiles,
        loadFileByKey,
        refreshData,
        // 文件树CRUD
        createFolder,
        createFile,
        renameItem,
        deleteItem,
        // 本地持久化
        // 会话相关方法
        loadSessions,

        // 搜索相关状态
        searchQuery,
        // 加载状态
        loading,
        files,
        // 视图模式
        viewMode,

        // 会话批量选择相关状态
        sessionBatchMode,
        selectedSessionKeys,

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
        sessionContextEditorVisible,
        sessionContextDraft,
        sessionContextMode,
        sessionContextUndoVisible,
        sessionContextOptimizeBackup,
        sessionMessageEditorVisible,
        sessionMessageEditorDraft,
        sessionMessageEditorMode,
        sessionMessageEditorIndex,
        sessionFaqVisible,
        sessionFaqSearchKeyword,
        sessionFaqItems,
        sessionFaqLoading,
        sessionFaqError,
        sessionFaqSelectedTags,
        sessionFaqTagFilterReverse,
        sessionFaqTagFilterNoTags,
        sessionFaqTagFilterExpanded,
        sessionFaqTagFilterVisibleCount,
        sessionFaqTagFilterSearchKeyword,
        sessionFaqTagManagerVisible,
        sessionSettingsVisible,
        sessionBotModel,
        sessionBotSystemPrompt,
        sessionBotModelDraft,
        sessionBotSystemPromptDraft,
        weChatSettingsVisible,
        weChatRobots,
        weChatRobotsDraft
    } = store;

    const defaultSessionBotSystemPrompt = '你是一个专业、简洁且可靠的 AI 助手。';
    let _sessionChatIsComposing = false;
    let _sessionChatCompositionEndTime = 0;
    const _SESSION_CHAT_COMPOSITION_END_DELAY = 100;
    let _sessionMarkedConfigured = false;
    let _sessionMarkedRenderer = null;
    let _sessionFaqEscHandler = null;
    let _sessionFaqLastActiveElement = null;
    const { computed } = Vue;

    const getApiBaseUrl = () => {
        return String(window.API_URL || '').trim().replace(/\/$/, '');
    };

    const getPromptUrl = () => {
        return `${getApiBaseUrl()}/`;
    };

    const _isAbortError = (e) => {
        try {
            if (!e) return false;
            if (e.name === 'AbortError') return true;
            const msg = typeof e.message === 'string' ? e.message : '';
            return msg.toLowerCase().includes('aborted');
        } catch (_) {
            return false;
        }
    };

    // 转义HTML（增加反转义逻辑防止双重转义）
    const _escapeHtml = (v) => {
        if (typeof v !== 'string' && v == null) return '';
        // 先反转义可能存在的实体
        const unescaped = String(v)
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&');
        
        return unescaped
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    const _sanitizeUrl = (href) => {
        const raw = String(href ?? '').trim();
        if (!raw) return '';
        if (raw.startsWith('#') || raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../')) return raw;
        try {
            const u = new URL(raw, window.location.origin);
            const p = String(u.protocol || '').toLowerCase();
            if (p === 'http:' || p === 'https:' || p === 'mailto:') return u.href;
            return '';
        } catch (_) {
            return '';
        }
    };

    const _truncateText = (v, maxLen) => {
        const s = String(v ?? '');
        const limit = Math.max(0, Number(maxLen) || 0);
        if (!limit || s.length <= limit) return s;
        return `${s.slice(0, limit)}\n\n...(内容已截断)`;
    };

    const _buildSessionChatHistoryText = (messages, endIndexExclusive) => {
        const list = Array.isArray(messages) ? messages : [];
        const end = Number(endIndexExclusive);
        const upto = Number.isFinite(end) ? Math.max(0, Math.min(list.length, end)) : list.length;
        const cleaned = list
            .slice(0, upto)
            .filter(m => m && (String(m.message ?? m.content ?? '').trim() || (m.imageDataUrl || (Array.isArray(m.imageDataUrls) && m.imageDataUrls.length > 0))))
            .slice(-30)
            .map(m => {
                const role = m.type === 'pet' ? '助手' : '用户';
                const contentText = String(m.message ?? m.content ?? '').trim();
                const imageCount = Array.isArray(m.imageDataUrls) ? m.imageDataUrls.length : (m.imageDataUrl ? 1 : 0);
                const content = (() => {
                    if (contentText) return contentText;
                    if (imageCount > 0) return imageCount === 1 ? '[图片]' : `[图片 x${imageCount}]`;
                    return '';
                })();
                return `${role}：${content}`;
            })
            .join('\n\n');
        return cleaned;
    };

    const _buildSessionChatUserPrompt = ({ text, images, pageContent, includeContext, historyText }) => {
        const imageList = Array.isArray(images) ? images.filter(Boolean) : [];
        if (imageList.length > 0) {
            return String(text || '用户发送了图片，请结合图片内容回答。').trim();
        }
        const current = String(text || '').trim() || '请继续。';
        const parts = [];
        const ctx = String(pageContent || '').trim();
        const hist = String(historyText || '').trim();
        if (includeContext && ctx) {
            parts.push(`## 页面上下文\n\n${_truncateText(ctx, 12000)}`);
        }
        if (hist) {
            parts.push(`## 会话历史\n\n${_truncateText(hist, 12000)}`);
        }
        parts.push(`## 当前消息\n\n${_truncateText(current, 8000)}`);
        return parts.join('\n\n');
    };

    const _sessionChatMessageKey = (m, idx) => {
        const ts = typeof m?.timestamp === 'number' ? m.timestamp : null;
        if (typeof ts === 'number' && Number.isFinite(ts)) return `ts_${ts}`;
        const i = Number(idx);
        if (Number.isFinite(i)) return `idx_${i}`;
        return `k_${Date.now()}`;
    };

    const _setFeedbackFlag = (refMap, key, durationMs) => {
        try {
            if (!refMap) return;
            const now = Date.now();
            const expiresAt = now + Math.max(0, Number(durationMs) || 0);
            const current = refMap.value && typeof refMap.value === 'object' ? refMap.value : {};
            refMap.value = { ...current, [key]: expiresAt };
            setTimeout(() => {
                try {
                    const cur = refMap.value && typeof refMap.value === 'object' ? refMap.value : {};
                    if (cur[key] !== expiresAt) return;
                    const next = { ...cur };
                    delete next[key];
                    refMap.value = next;
                } catch (_) { }
            }, Math.max(0, expiresAt - Date.now()) + 20);
        } catch (_) { }
    };

    const _isStreamingMessage = (m) => {
        try {
            const sending = !!sessionChatSending?.value;
            if (!sending) return false;
            const targetTs = sessionChatStreamingTargetTimestamp?.value;
            if (typeof targetTs !== 'number' || !Number.isFinite(targetTs)) return false;
            const ts = typeof m?.timestamp === 'number' ? m.timestamp : null;
            if (typeof ts !== 'number' || !Number.isFinite(ts)) return false;
            return ts === targetTs;
        } catch (_) {
            return false;
        }
    };

    const _isPetSessionMessage = (m) => {
        return !!(m && m.type === 'pet');
    };

    const _getSessionMessageMoveBlock = (messages, idx) => {
        const list = Array.isArray(messages) ? messages : [];
        const i = Number(idx);
        if (!Number.isFinite(i) || i < 0 || i >= list.length) return { start: -1, end: -1 };
        const cur = list[i];
        if (_isPetSessionMessage(cur)) {
            const prev = list[i - 1];
            if (prev && !_isPetSessionMessage(prev)) return { start: i - 1, end: i + 1 };
            return { start: i, end: i + 1 };
        }
        const next = list[i + 1];
        if (next && _isPetSessionMessage(next)) return { start: i, end: i + 2 };
        return { start: i, end: i + 1 };
    };

    const _getPrevSessionMessageBlock = (messages, blockStart) => {
        const list = Array.isArray(messages) ? messages : [];
        const end = Number(blockStart);
        if (!Number.isFinite(end) || end <= 0) return { start: -1, end: -1 };
        const lastIdx = end - 1;
        const last = list[lastIdx];
        if (_isPetSessionMessage(last)) {
            const maybeUserIdx = lastIdx - 1;
            const maybeUser = list[maybeUserIdx];
            if (maybeUser && !_isPetSessionMessage(maybeUser)) return { start: maybeUserIdx, end };
            return { start: lastIdx, end };
        }
        return { start: lastIdx, end };
    };

    const _getNextSessionMessageBlock = (messages, blockEnd) => {
        const list = Array.isArray(messages) ? messages : [];
        const start = Number(blockEnd);
        if (!Number.isFinite(start) || start < 0 || start >= list.length) return { start: -1, end: -1 };
        const first = list[start];
        if (!_isPetSessionMessage(first)) {
            const next = list[start + 1];
            if (next && _isPetSessionMessage(next)) return { start, end: start + 2 };
            return { start, end: start + 1 };
        }
        return { start, end: start + 1 };
    };

    const _scrollSessionChatToIndex = (idx) => {
        try {
            const i = Number(idx);
            if (!Number.isFinite(i) || i < 0) return;
            setTimeout(() => {
                try {
                    const el = document.querySelector(`[data-chat-idx="${i}"]`);
                    if (el && typeof el.scrollIntoView === 'function') {
                        el.scrollIntoView({ block: 'nearest' });
                        return;
                    }
                    const container = document.getElementById('pet-chat-messages');
                    if (container) container.scrollTop = container.scrollHeight;
                } catch (_) { }
            }, 0);
        } catch (_) { }
    };

    const _saveActiveSession = async (nextSession) => {
        try {
            if (!nextSession) return;
            const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
            const sessionSync = getSessionSyncService();
            await sessionSync.saveSession(nextSession);
        } catch (_) { }
    };

    const _moveSessionChatMessageBlock = async (idx, direction) => {
        const s = activeSession?.value;
        if (!s) return;
        const messages = Array.isArray(s.messages) ? [...s.messages] : [];
        const i = Number(idx);
        if (!Number.isFinite(i) || i < 0 || i >= messages.length) return;

        if (String(direction) === 'up') {
            if (i <= 0) return;
            const nextMessages = [...messages];
            const tmp = nextMessages[i - 1];
            nextMessages[i - 1] = nextMessages[i];
            nextMessages[i] = tmp;
            const now = Date.now();
            const nextSession = { ...s, messages: nextMessages, updatedAt: now, lastAccessTime: now };
            activeSession.value = nextSession;
            await _saveActiveSession(nextSession);
            _scrollSessionChatToIndex(i - 1);
            return;
        }

        if (String(direction) === 'down') {
            if (i >= messages.length - 1) return;
            const nextMessages = [...messages];
            const tmp = nextMessages[i + 1];
            nextMessages[i + 1] = nextMessages[i];
            nextMessages[i] = tmp;
            const now = Date.now();
            const nextSession = { ...s, messages: nextMessages, updatedAt: now, lastAccessTime: now };
            activeSession.value = nextSession;
            await _saveActiveSession(nextSession);
            _scrollSessionChatToIndex(i + 1);
        }
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

    loadSessionBotSettings();

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

    loadWeChatSettings();

    const _normalizeFaqTags = (tags) => {
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

    const _normalizeFaqDoc = (doc) => {
        const key = String(doc?.key ?? doc?.id ?? '').trim();
        return {
            key,
            title: String(doc?.title ?? '').trim(),
            prompt: String(doc?.prompt ?? doc?.text ?? '').trim(),
            tags: _normalizeFaqTags(doc?.tags),
            order: Number.isFinite(Number(doc?.order)) ? Number(doc.order) : 0,
            updatedTime: doc?.updatedTime
        };
    };

    const _getFaqQueryUrl = () => {
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
            const res = await getData(_getFaqQueryUrl(), {}, shouldUseCache);
            const list = Array.isArray(res?.data?.list)
                ? res.data.list
                : (Array.isArray(res?.data) ? res.data : []);
            const normalized = list.map(_normalizeFaqDoc).filter(i => i.key && (i.prompt || i.title));
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

    const _focusSessionFaqSearchInput = () => {
        try {
            const el = document.querySelector('.aicr-session-faq-search-input');
            if (el && typeof el.focus === 'function') el.focus();
        } catch (_) { }
    };

    const _updateFaqDocument = async (key, patch) => {
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

    const _patchLocalFaq = (key, patch) => {
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
        const currentTags = _normalizeFaqTags(item?.tags);
        const nextRaw = window.prompt('编辑标签（逗号分隔）：', currentTags.join(', '));
        if (nextRaw == null) return;
        const nextTags = _normalizeFaqTags(nextRaw);
        try {
            if (sessionFaqLoading) sessionFaqLoading.value = true;
            await _updateFaqDocument(key, { tags: nextTags });
            _patchLocalFaq(key, { tags: nextTags });
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
                const tags = _normalizeFaqTags((it.tags || []).map(t => (t === oldTag ? newTag : t)));
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
                const tags = _normalizeFaqTags((it.tags || []).map(t => (t === oldTag ? newTag : t)));
                _patchLocalFaq(it.key, { tags });
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
                const tags = _normalizeFaqTags((it.tags || []).filter(t => t !== target));
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
                const tags = _normalizeFaqTags((it.tags || []).filter(t => t !== target));
                _patchLocalFaq(it.key, { tags });
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

    // 搜索相关状态
    let searchTimeout = null;

    /**
     * 处理搜索输入
     * @param {Event} event - 输入事件
     */
    const handleSearchInput = (event) => {
        return safeExecute(() => {
            const value = event.target.value;

            // 添加安全检查
            if (searchQuery && typeof searchQuery.value !== 'undefined') {
                searchQuery.value = value;
            } else {
                console.warn('[搜索输入] searchQuery未定义或无效');
                return;
            }

            // 清除之前的定时器
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }

            // 设置防抖搜索
            searchTimeout = setTimeout(() => {
                performSearch(value);
            }, 300);

            console.log('[搜索输入] 搜索关键词:', value);
        }, '搜索输入处理');
    };

    /**
     * 执行搜索
     * @param {string} query - 搜索关键词
     */
    const performSearch = (query) => {
        return safeExecute(() => {
            if (!query || query.trim() === '') {
                // 清空搜索，显示所有内容
                clearSearchResults();
                return;
            }

            console.log('[搜索执行] 执行搜索:', query);

            // 这里可以实现具体的搜索逻辑
            // 例如：搜索文件、代码内容等
            searchInFileTree(query);
            searchInCode(query);

        }, '搜索执行');
    };

    /**
     * 在文件树中搜索
     * @param {string} query - 搜索关键词
     */
    const searchInFileTree = (query) => {
        return safeExecute(() => {
            console.log('[文件树搜索] 搜索关键词:', query);
            // 实现文件树搜索逻辑
        }, '文件树搜索');
    };

    /**
     * 处理文件树搜索变化
     * @param {string} query - 搜索关键词
     */
    const handleSearchChange = (query) => {
        return safeExecute(() => {
            if (searchQuery && typeof searchQuery.value !== 'undefined') {
                searchQuery.value = query || '';
                console.log('[文件树搜索] 搜索关键词已更新:', query);
            } else {
                console.warn('[文件树搜索] searchQuery未定义或无效');
            }
        }, '文件树搜索变化处理');
    };

    /**
     * 在代码中搜索
     * @param {string} query - 搜索关键词
     */
    const searchInCode = (query) => {
        return safeExecute(() => {
            console.log('[代码搜索] 搜索关键词:', query);
            // 实现代码搜索逻辑
        }, '代码搜索');
    };

    /**
     * 清除搜索结果
     */
    const clearSearchResults = () => {
        return safeExecute(() => {
            console.log('[清除搜索] 清除搜索结果');
            // 清除搜索高亮、恢复原始显示等
        }, '清除搜索结果');
    };

    /**
     * 清除搜索
     */
    const clearSearch = () => {
        return safeExecute(() => {
            // 清空搜索输入框
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.value = '';
            }

            // 清空搜索状态 - 添加安全检查
            if (searchQuery && typeof searchQuery.value !== 'undefined') {
                searchQuery.value = '';
            } else {
                console.warn('[清除搜索] searchQuery未定义或无效');
            }

            // 清除搜索结果
            clearSearchResults();

            console.log('[清除搜索] 搜索已清除');
        }, '清除搜索');
    };

    /**
     * 处理删除项
     * @param {Object} payload - 删除事件负载 { itemId }
     */
    const handleDeleteItem = async (payload) => {
        return safeExecute(async () => {
            // 兼容 { key: '...' } 和 { itemId: '...' } 两种格式，统一使用 key
            const key = (payload && payload.key) || (payload && payload.itemId);
            if (!key) {
                console.warn('[handleDeleteItem] 缺少 key 或 itemId:', payload);
                return;
            }

            if (!confirm('确定删除该项及其子项？此操作不可撤销。')) return;

            // 统一传递 key 参数
            await deleteItem({ key });
            showSuccessMessage('删除成功');

            // 若删除的是当前选中文件，则清空选择
            if (selectedKey && selectedKey.value && (selectedKey.value === key || selectedKey.value.startsWith(key + '/'))) {
                setSelectedKey(null);
            }
        }, '删除');
    };

    /**
     * 处理标签选择
     * @param {string|Array} tag - 标签名称或标签数组
     */
    const handleTagSelect = (tag) => {
        return safeExecute(() => {
            if (!store.selectedSessionTags) return;

            // 如果传入的是数组（来自文件树的多选或排序更新），直接替换
            if (Array.isArray(tag)) {
                store.selectedSessionTags.value = tag;
                return;
            }

            // 单个标签切换
            const currentTags = new Set(store.selectedSessionTags.value || []);
            if (currentTags.has(tag)) {
                currentTags.delete(tag);
            } else {
                currentTags.add(tag);
            }
            store.selectedSessionTags.value = Array.from(currentTags);

            console.log('[TagSelect] 选中标签:', store.selectedSessionTags.value);
        }, '处理标签选择');
    };

    /**
     * 清除所有标签过滤
     */
    const handleTagClear = () => {
        return safeExecute(() => {
            if (store.selectedSessionTags) store.selectedSessionTags.value = [];
            if (store.tagFilterNoTags) store.tagFilterNoTags.value = false;
            if (store.tagFilterSearchKeyword) store.tagFilterSearchKeyword.value = '';
            // 不清除反向过滤状态，或者根据需求清除
            // if (store.tagFilterReverse) store.tagFilterReverse.value = false;
        }, '清除标签过滤');
    };

    /**
     * 切换反向过滤
     */
    const handleTagFilterReverse = () => {
        return safeExecute(() => {
            if (store.tagFilterReverse) {
                store.tagFilterReverse.value = !store.tagFilterReverse.value;
            }
        }, '切换反向过滤');
    };

    /**
     * 切换无标签筛选
     */
    const handleTagFilterNoTags = () => {
        return safeExecute(() => {
            if (store.tagFilterNoTags) {
                store.tagFilterNoTags.value = !store.tagFilterNoTags.value;
            }
        }, '切换无标签筛选');
    };

    /**
     * 切换标签列表展开/折叠
     */
    const handleTagFilterExpand = () => {
        return safeExecute(() => {
            if (store.tagFilterExpanded) {
                store.tagFilterExpanded.value = !store.tagFilterExpanded.value;
            }
        }, '切换标签列表展开');
    };

    /**
     * 处理标签搜索
     */
    const handleTagFilterSearch = (keyword) => {
        return safeExecute(() => {
            if (store.tagFilterSearchKeyword) {
                store.tagFilterSearchKeyword.value = keyword || '';
            }
        }, '处理标签搜索');
    };

    /**
     * 处理消息输入键盘事件
     * @param {Event} event - 键盘事件
     */
    const handleMessageInput = async (event) => {
        return safeExecute(() => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                // 执行搜索 - 添加安全检查
                const query = searchQuery && typeof searchQuery.value !== 'undefined' ? searchQuery.value : '';
                performSearch(query);
            } else if (event.key === 'Escape') {
                event.preventDefault();
                clearSearch();
            }
        }, '消息输入键盘事件处理');
    };

    /**
     * 处理输入法开始事件
     * @param {Event} event - 输入法开始事件
     */
    const handleCompositionStart = (event) => {
        return safeExecute(() => {
            console.log('[输入法] 开始输入');
        }, '输入法开始处理');
    };

    /**
     * 处理输入法结束事件
     * @param {Event} event - 输入法结束事件
     */
    const handleCompositionEnd = (event) => {
        return safeExecute(() => {
            console.log('[输入法] 结束输入');
            // 输入法结束后执行搜索
            performSearch(event.target.value);
        }, '输入法结束处理');
    };

    /**
     * 下载当前项目为ZIP
     */
    // 已移除下载功能
    const handleDownloadProjectVersion = async () => {
        console.warn('[handleDownloadProjectVersion] 该功能已被禁用');
    };

    /**
     * 上传ZIP并覆盖当前项目
     */
    const handleUploadProjectVersion = async (zipFileOrEvent) => {
        return safeExecute(async () => {
            // 兼容事件或直接传入 File
            let zipFile = zipFileOrEvent;
            if (zipFileOrEvent && zipFileOrEvent.target && zipFileOrEvent.target.files) {
                zipFile = zipFileOrEvent.target.files[0];
            }

            if (!zipFile) return;

            // 动态加载依赖与工具
            const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/loading.js');
            let __uploadLoadingShown = false;
            try {
                // 显示loading
                if (!__uploadLoadingShown) {
                    showGlobalLoading(`正在上传并解析 ...`);
                    __uploadLoadingShown = true;
                }

                // 读取ZIP
                const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')).default || window.JSZip || (await import('jszip')).default;
                const zip = await JSZip.loadAsync(zipFile);

                // 展平文件列表（忽略目录项）
                const entries = [];
                zip.forEach((relativePath, fileObj) => {
                    if (!fileObj.dir) {
                        entries.push({ path: relativePath, file: fileObj });
                    }
                });
                if (entries.length === 0) {
                    throw createError('ZIP 中未发现文件', ErrorTypes.VALIDATION, '项目上传');
                }

                // 过滤规则
                const MAX_SIZE = 1 * 1024 * 1024; // 1MB (所有文件)
                const EXCLUDED_DIRS = ['.git', 'node_modules', '.svn', '.hg', '__MACOSX'];
                const EXCLUDED_FILES = ['.DS_Store', 'Thumbs.db'];

                // 图片文件类型检测
                const isImageFile = (filename) => {
                    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif', '.jfif', '.pjpeg', '.pjp'];
                    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
                    return imageExtensions.includes(ext);
                };
                const normalizePathForFilter = (p) => String(p || '').replace(/\\/g, '/').replace(/^\/+/, '');
                const hasExcludedSegment = (p) => {
                    const segs = p.split('/');
                    return segs.some(seg => EXCLUDED_DIRS.includes(seg));
                };
                const isExcludedFile = (p) => {
                    const name = p.split('/').pop();
                    return EXCLUDED_FILES.includes(name);
                };

                let STRIP_PREFIX = '';
                const normalizedAll = entries.map(e => normalizePathForFilter(e.path)).filter(Boolean);

                if (normalizedAll.length > 0) {
                    // 检测所有文件路径是否都在一个共同的根目录下
                    const firstLevelDirs = new Set();
                    normalizedAll.forEach(p => {
                        const parts = p.split('/').filter(Boolean);
                        if (parts.length > 0) {
                            firstLevelDirs.add(parts[0]);
                        }
                    });

                    // 如果所有文件都在同一个根目录下，剥离这个根目录
                    if (firstLevelDirs.size === 1) {
                        const commonRootDir = Array.from(firstLevelDirs)[0];
                        STRIP_PREFIX = commonRootDir + '/';
                        console.log('[路径剥离] 检测到共同根目录，将剥离:', STRIP_PREFIX);
                    }
                }

                console.log('[路径剥离] 最终剥离前缀:', STRIP_PREFIX || '(无)');
                let skippedExcluded = 0;
                let skippedImages = 0;
                let skippedLarge = 0;
                let processed = 0;
                let deepFilesProcessed = 0;
                let moreButtonProcessed = false;
                const filesPayload = [];
                for (const { path, file } of entries) {
                    let normPath = normalizePathForFilter(path);
                    const originalPath = normPath;

                    // 特别关注 MoreButton.vue 的处理过程
                    if (path.includes('MoreButton.vue')) {
                        console.log(`[文件处理] 开始处理 MoreButton.vue: 原始路径="${path}", 规范化后="${normPath}"`);
                    }

                    if (STRIP_PREFIX && normPath.startsWith(STRIP_PREFIX)) {
                        normPath = normPath.slice(STRIP_PREFIX.length);
                        console.log(`[文件处理] 路径剥离: "${originalPath}" -> "${normPath}"`);

                        // 特别关注 MoreButton.vue 的路径剥离
                        if (path.includes('MoreButton.vue')) {
                            console.log(`[文件处理] MoreButton.vue 路径剥离: "${originalPath}" -> "${normPath}"`);
                        }
                    }

                    if (!normPath) {
                        console.log(`[文件处理] 跳过空路径文件: "${originalPath}"`);
                        if (path.includes('MoreButton.vue')) {
                            console.log(`[文件处理] ❌ MoreButton.vue 被跳过：空路径`);
                        }
                        continue;
                    }

                    // 目录/文件名过滤
                    if (hasExcludedSegment(normPath) || isExcludedFile(normPath)) {
                        console.log(`[文件处理] 跳过排除文件: "${normPath}"`);
                        if (path.includes('MoreButton.vue')) {
                            console.log(`[文件处理] ❌ MoreButton.vue 被跳过：排除文件`);
                        }
                        skippedExcluded++;
                        continue;
                    }

                    // 图片文件过滤
                    const filename = normPath.split('/').pop();
                    if (isImageFile(filename)) {
                        console.log(`[文件处理] 跳过图片文件: "${normPath}"`);
                        if (path.includes('MoreButton.vue')) {
                            console.log(`[文件处理] ❌ MoreButton.vue 被跳过：图片文件`);
                        }
                        skippedImages++;
                        continue;
                    }

                    // 特别关注深层次文件
                    if (normPath.includes('/') && normPath.split('/').length > 3) {
                        console.log(`[文件处理] 处理深层次文件: "${normPath}" (${normPath.split('/').length} 层)`);
                        deepFilesProcessed++;
                    }

                    // 特别关注 MoreButton.vue 文件
                    if (normPath.includes('MoreButton.vue')) {
                        console.log(`[文件处理] 发现 MoreButton.vue 文件: "${originalPath}" -> "${normPath}"`);
                        moreButtonProcessed = true;
                    }
                    // 大小过滤：优先用内部尺寸；否则读取为blob判断大小
                    let size = (file && file._data && Number.isFinite(file._data.uncompressedSize)) ? file._data.uncompressedSize : null;
                    let blob = null;
                    if (!size) {
                        try {
                            blob = await file.async('blob');
                            size = blob.size;
                        } catch (_) {
                            size = 0;
                        }
                    }

                    // 文件大小过滤
                    if (size > MAX_SIZE) {
                        const sizeMB = (size / (1024 * 1024)).toFixed(2);
                        const maxSizeMB = (MAX_SIZE / (1024 * 1024)).toFixed(0);
                        console.log(`[文件过滤] 跳过过大的文件: "${normPath}" (${sizeMB}MB > ${maxSizeMB}MB)`);
                        skippedLarge++;
                        continue;
                    }
                    // 读取文本内容（尽量复用 blob）
                    let content = '';
                    try {
                        if (blob) {
                            content = await blob.text();
                        } else {
                            content = await file.async('string');
                        }
                    } catch (_) {
                        try {
                            const b64 = await file.async('base64');
                            content = atob(b64);
                        } catch (e) {
                            content = '';
                        }
                    }
                    // 记录精确字节数，优先用上面计算到的 size；若不可用则回退用 TextEncoder 重新计算
                    const payloadSize = Number.isFinite(size)
                        ? size
                        : ((typeof TextEncoder !== 'undefined' && typeof content === 'string')
                            ? new TextEncoder().encode(content).length
                            : ((content || '').length));

                    // 使用统一的字段规范化工具
                    const normalizedFile = normalizeFileObject({
                        fileKey: normPath,
                        key: normPath,
                        path: normPath,
                        name: extractFileName(normPath),
                        content: content || '',
                        size: payloadSize,
                        type: 'file'
                    });

                    if (normalizedFile) {
                        filesPayload.push(normalizedFile);
                    }
                    processed++;

                    // 特别确认 MoreButton.vue 的处理结果
                    if (path.includes('MoreButton.vue')) {
                        console.log(`[文件处理] ✅ MoreButton.vue 成功添加到文件载荷: "${normPath}"`);
                        console.log(`[文件处理] MoreButton.vue 内容长度: ${(content || '').length} 字符`);
                    }
                }

                // 输出处理统计信息
                console.log(`[文件处理统计] 总文件数: ${entries.length}`);
                console.log(`[文件处理统计] 成功处理: ${processed}`);
                console.log(`[文件处理统计] 深层次文件处理: ${deepFilesProcessed}`);
                console.log(`[文件处理统计] 跳过排除项: ${skippedExcluded}`);
                console.log(`[文件处理统计] 跳过图片文件: ${skippedImages}`);
                console.log(`[文件处理统计] 跳过大文件(>1MB): ${skippedLarge}`);
                console.log(`[文件处理统计] MoreButton.vue 处理: ${moreButtonProcessed ? '是' : '否'}`);
                console.log(`[文件处理统计] 最终文件载荷数量: ${filesPayload.length}`);

                // 专门检查 MoreButton.vue 是否在文件载荷中
                const moreButtonInPayload = filesPayload.find(f => f.name === 'MoreButton.vue' || f.path.includes('MoreButton.vue'));
                if (moreButtonInPayload) {
                    console.log(`[文件处理统计] ✅ MoreButton.vue 在文件载荷中:`, moreButtonInPayload);
                } else {
                    console.log(`[文件处理统计] ❌ MoreButton.vue 不在文件载荷中！`);
                    console.log(`[文件处理统计] 文件载荷中的文件列表:`, filesPayload.map(f => f.path));
                }

                // 构建树（基于路径）- 修复深层次文件丢失问题
                // 根节点的 key 和 path 使用 root
                const root = { key: 'root', name: 'root', type: 'folder', path: 'root', children: [] };
                const folderMap = new Map();
                folderMap.set('', root);

                // 使用统一的路径规范化函数
                const normalizePath = (path) => normalizeFilePath(path);

                // 确保路径规范化
                const removeProjectIdPrefix = (path) => normalizeFilePath(path);

                // 用于跟踪所有文件路径，避免创建与文件同名的文件夹
                const filePathsSet = new Set();

                // 改进的文件夹确保函数 - 修复递归创建逻辑
                const ensureFolder = (folderPath) => {
                    const norm = normalizePath(folderPath);

                    // 如果路径为空，返回根节点
                    if (!norm) return root;


                    const folderKeyWithoutProjectId = removeProjectIdPrefix(norm);

                    // 如果已经存在，直接返回
                    if (folderMap.has(folderKeyWithoutProjectId)) return folderMap.get(folderKeyWithoutProjectId);

                    // 检查是否与文件路径冲突（避免创建与文件同名的文件夹）
                    if (filePathsSet.has(folderKeyWithoutProjectId)) {
                        console.warn(`[ensureFolder] 跳过创建文件夹 "${folderKeyWithoutProjectId}"，因为已存在同名文件`);
                        // 返回父级目录
                        const parentPath = folderKeyWithoutProjectId.split('/').slice(0, -1).join('/');
                        return ensureFolder(parentPath);
                    }

                    // 递归创建父目录
                    const pathSegments = folderKeyWithoutProjectId.split('/').filter(Boolean);
                    let currentPath = '';
                    let parent = root;

                    // 特别关注深层次路径
                    if (pathSegments.length > 3) {
                        console.log(`[ensureFolder] 创建深层次路径: ${folderIdWithoutProjectId} (${pathSegments.length} 层)`);
                    }

                    // 逐级创建路径中的每个文件夹
                    for (let i = 0; i < pathSegments.length; i++) {
                        const segment = pathSegments[i];
                        currentPath = currentPath ? `${currentPath}/${segment}` : segment;

                        // 检查当前路径是否与文件路径冲突
                        if (filePathsSet.has(currentPath)) {
                            console.warn(`[ensureFolder] 跳过创建文件夹 "${currentPath}"，因为已存在同名文件`);
                            // 如果冲突，尝试使用父级目录
                            if (i > 0) {
                                const parentPath = pathSegments.slice(0, i).join('/');
                                parent = ensureFolder(parentPath);
                                break;
                            } else {
                                parent = root;
                                break;
                            }
                        }

                        if (!folderMap.has(currentPath)) {
                            // 使用统一的节点规范化工具创建文件夹节点
                            const node = normalizeTreeNode({
                                key: currentPath,
                                name: segment,
                                type: 'folder',
                                children: []
                            });

                            if (node) {
                                parent.children.push(node);
                                folderMap.set(currentPath, node);
                            }

                            // 特别关注深层次文件夹的创建
                            if (pathSegments.length > 3) {
                                console.log(`[ensureFolder] 创建深层次文件夹: ${currentPath} (第 ${i + 1} 层)`);
                            }
                        }
                        parent = folderMap.get(currentPath);
                    }

                    return parent;
                };

                // 处理所有文件，确保其父目录存在
                console.log(`[文件树构建] 开始处理 ${filesPayload.length} 个文件`);

                // 首先收集所有文件路径，用于检查文件夹与文件同名冲突
                for (const f of filesPayload) {
                    const filePath = normalizePath(f.path);
                    if (!filePath) {
                        continue;
                    }
                    const filePathWithoutProjectId = removeProjectIdPrefix(filePath);
                    if (filePathWithoutProjectId) {
                        filePathsSet.add(filePathWithoutProjectId);
                    }
                }
                console.log(`[文件树构建] 已收集 ${filePathsSet.size} 个文件路径用于冲突检查`);

                let deepFilesInTree = 0;
                let moreButtonInTree = false;
                for (const f of filesPayload) {
                    const filePath = normalizePath(f.path);
                    if (!filePath) {
                        console.warn('[文件树构建] 跳过无效路径的文件:', f);
                        continue;
                    }


                    const filePathWithoutProjectId = removeProjectIdPrefix(filePath);


                    const pathSegments = filePathWithoutProjectId.split('/').filter(Boolean);
                    const dir = pathSegments.length > 1
                        ? pathSegments.slice(0, -1).join('/')
                        : '';

                    // 特别关注深层次文件
                    if (pathSegments.length > 3) {
                        console.log(`[文件树构建] 处理深层次文件: ${filePathWithoutProjectId} (${pathSegments.length} 层), 父目录: ${dir || '根目录'}`);
                        deepFilesInTree++;
                    }

                    // 特别关注 MoreButton.vue 文件
                    if (f.name === 'MoreButton.vue' || filePathWithoutProjectId.includes('MoreButton.vue')) {
                        console.log(`[文件树构建] 发现 MoreButton.vue 文件: ${filePathWithoutProjectId}, 父目录: ${dir || '根目录'}`);
                        moreButtonInTree = true;
                    }

                    // 确保父目录存在
                    const parent = ensureFolder(dir);

                    // 检查父目录中是否已存在同名文件或文件夹
                    const existingFileItem = parent.children.find(child =>
                        (child.name === f.name) && child.type === 'file'
                    );

                    const existingFolderItem = parent.children.find(child =>
                        (child.name === f.name) && child.type === 'folder'
                    );

                    if (existingFileItem) {
                        console.warn(`[文件树构建] 跳过重复文件: ${filePathWithoutProjectId}`);
                        continue;
                    }

                    if (existingFolderItem) {
                        // 如果存在同名文件夹，说明文件路径结构错误
                        // 不应该将文件添加到同名文件夹中，而应该跳过或报错
                        console.error(`[文件树构建] 发现同名文件夹，无法创建文件节点: ${filePathWithoutProjectId}`);
                        console.error(`[文件树构建] 文件路径结构错误，已存在文件夹节点: ${existingFolderItem.key}`);
                        // 跳过该文件，避免创建冲突
                        continue;
                    }

                    // 使用统一的节点规范化工具创建文件节点
                    const fileNode = normalizeTreeNode({
                        key: filePathWithoutProjectId,
                        name: f.name,
                        type: 'file',
                        size: (Number.isFinite(f.size) ? f.size : ((f.content || '').length)),
                        modified: Date.now()
                    });

                    if (fileNode) {
                        parent.children.push(fileNode);
                    }

                    // 特别关注深层次文件的添加过程
                    if (pathSegments.length > 3) {
                        console.log(`[文件树构建] 成功添加深层次文件: ${f.name} 到父目录: ${dir || '根目录'}`);
                        console.log(`[文件树构建] 父目录当前子节点数量: ${parent.children.length}`);
                    }
                }

                console.log(`[文件树构建] 文件树构建完成，共创建 ${folderMap.size} 个文件夹节点`);
                console.log(`[文件树构建统计] 深层次文件添加到树中: ${deepFilesInTree}`);
                console.log(`[文件树构建统计] MoreButton.vue 添加到树中: ${moreButtonInTree ? '是' : '否'}`);

                // 覆盖导入：采用并集策略，已存在的文件覆盖，不存在的文件补充
                // 提示：前面已导入 CRUD

                // 1. 从 fileTree 中提取现有的文件列表，用于判断是更新还是新增，以及构建完整的文件树
                // 不再调用 projectFiles 接口，直接从内存中的文件树提取
                let existingFilesMap = new Map(); // key -> { key, ... }
                let allFilesForTree = [...filesPayload]; // 包含所有文件（现有 + 新导入）用于构建文件树

                try {
                    // 从 fileTree 中提取所有文件节点
                    const extractFilesFromTree = (nodes) => {
                        const fileList = [];
                        const traverse = (node) => {
                            if (!node || typeof node !== 'object') return;

                            // 如果是文件节点，添加到列表
                            if (node.type === 'file' || (node.type !== 'folder' && !node.children)) {
                                const fileKey = node.key || node.path || node.fileKey || '';
                                if (fileKey) {
                                    fileList.push({
                                        fileKey: fileKey,
                                        key: fileKey,
                                        path: fileKey,
                                        name: node.name || (fileKey ? fileKey.split('/').pop() : ''),
                                        content: node.content || '',
                                        size: node.size || (node.content ? node.content.length : 0)
                                    });
                                }
                            }

                            // 递归处理子节点
                            if (node.children && Array.isArray(node.children)) {
                                node.children.forEach(child => traverse(child));
                            }
                        };

                        if (Array.isArray(nodes)) {
                            nodes.forEach(node => traverse(node));
                        } else if (nodes) {
                            traverse(nodes);
                        }

                        return fileList;
                    };

                    // 从当前文件树中提取现有文件
                    const root = Array.isArray(fileTree.value) ? fileTree.value[0] : fileTree.value;
                    const existingFilesList = root ? extractFilesFromTree(root) : [];

                    for (const doc of existingFilesList) {
                        const fileKey = doc?.fileKey || doc?.key || doc?.path;
                        if (fileKey) {
                            existingFilesMap.set(fileKey, {
                                key: fileKey,
                                ...doc
                            });

                            // 如果现有文件不在新导入的文件列表中，添加到文件树构建列表
                            const isInNewFiles = filesPayload.some(f => {
                                const newFileKey = f.fileKey || f.key || f.path;
                                return newFileKey === fileKey;
                            });

                            if (!isInNewFiles) {
                                // 现有文件不在新导入列表中，需要保留在文件树中
                                allFilesForTree.push({
                                    fileKey: fileKey,
                                    key: fileKey,
                                    path: fileKey,
                                    name: doc.name || (typeof fileKey === 'string' ? fileKey.split('/').pop() : ''),
                                    content: doc.content || '',
                                    size: doc.size || (doc.content ? doc.content.length : 0)
                                });
                            }
                        }
                    }
                    console.log(`[覆盖导入] 从文件树中找到 ${existingFilesMap.size} 个已存在的文件`);
                    console.log(`[覆盖导入] 文件树将包含 ${allFilesForTree.length} 个文件（新导入: ${filesPayload.length}，现有保留: ${allFilesForTree.length - filesPayload.length}）`);
                } catch (e) {
                    console.warn('[覆盖导入] 从文件树提取现有文件列表失败:', e);
                }

                // 2. 基于所有文件（现有 + 新导入）重新构建完整的文件树
                // 重新构建文件树，包含所有文件
                const mergedRoot = { key: 'root', name: 'root', type: 'folder', path: 'root', children: [] };
                const mergedFolderMap = new Map();
                mergedFolderMap.set('', mergedRoot);

                // 用于跟踪所有文件路径，避免创建与文件同名的文件夹（用于最终文件树构建）
                const mergedFilePathsSet = new Set();

                // 使用统一的规范化函数
                const normalizePathForTree = (path) => normalizeFilePath(path);
                const removeProjectIdPrefixForTree = (path) => normalizeFilePath(path);

                const ensureFolderForTree = (folderPath) => {
                    const norm = normalizePathForTree(folderPath);
                    if (!norm) return mergedRoot;

                    const folderIdWithoutProjectId = removeProjectIdPrefixForTree(norm);
                    if (mergedFolderMap.has(folderIdWithoutProjectId)) {
                        return mergedFolderMap.get(folderIdWithoutProjectId);
                    }

                    // 检查是否与文件路径冲突（避免创建与文件同名的文件夹）
                    if (mergedFilePathsSet.has(folderIdWithoutProjectId)) {
                        console.warn(`[ensureFolderForTree] 跳过创建文件夹 "${folderIdWithoutProjectId}"，因为已存在同名文件`);
                        // 返回父级目录
                        const parentPath = folderIdWithoutProjectId.split('/').slice(0, -1).join('/');
                        return ensureFolderForTree(parentPath);
                    }

                    const pathSegments = folderIdWithoutProjectId.split('/').filter(Boolean);
                    let currentPath = '';
                    let parent = mergedRoot;

                    for (let i = 0; i < pathSegments.length; i++) {
                        const segment = pathSegments[i];
                        currentPath = currentPath ? `${currentPath}/${segment}` : segment;

                        // 检查当前路径是否与文件路径冲突
                        if (mergedFilePathsSet.has(currentPath)) {
                            console.warn(`[ensureFolderForTree] 跳过创建文件夹 "${currentPath}"，因为已存在同名文件`);
                            // 如果冲突，尝试使用父级目录
                            if (i > 0) {
                                const parentPath = pathSegments.slice(0, i).join('/');
                                parent = ensureFolderForTree(parentPath);
                                break;
                            } else {
                                parent = mergedRoot;
                                break;
                            }
                        }

                        if (!mergedFolderMap.has(currentPath)) {
                            // 使用统一的节点规范化工具创建文件夹节点
                            const node = normalizeTreeNode({
                                key: currentPath,
                                name: segment,
                                type: 'folder',
                                children: []
                            });

                            if (node) {
                                parent.children.push(node);
                                mergedFolderMap.set(currentPath, node);
                            }
                        }
                        parent = mergedFolderMap.get(currentPath);
                    }

                    return parent;
                };

                // 首先收集所有文件路径，用于检查文件夹与文件同名冲突（用于最终文件树构建）
                for (const f of allFilesForTree) {
                    const filePath = normalizePathForTree(f.path);
                    if (!filePath) continue;
                    const filePathWithoutProjectId = removeProjectIdPrefixForTree(filePath);
                    if (filePathWithoutProjectId) {
                        mergedFilePathsSet.add(filePathWithoutProjectId);
                    }
                }
                console.log(`[文件树合并] 已收集 ${mergedFilePathsSet.size} 个文件路径用于冲突检查`);

                // 处理所有文件（现有 + 新导入）构建完整的文件树
                console.log(`[文件树合并] 开始处理 ${allFilesForTree.length} 个文件构建完整文件树`);
                for (const f of allFilesForTree) {
                    const filePath = normalizePathForTree(f.path);
                    if (!filePath) continue;

                    const filePathWithoutProjectId = removeProjectIdPrefixForTree(filePath);
                    const pathSegments = filePathWithoutProjectId.split('/').filter(Boolean);
                    const dir = pathSegments.length > 1
                        ? pathSegments.slice(0, -1).join('/')
                        : '';

                    const parent = ensureFolderForTree(dir);

                    // 检查文件节点是否已存在（避免重复）
                    const existingFileNode = parent.children.find(child =>
                        child.name === f.name && child.type === 'file'
                    );

                    // 检查父目录中是否已存在同名文件夹（避免文件与文件夹同名冲突）
                    const existingFolderNode = parent.children.find(child =>
                        child.name === f.name && child.type === 'folder'
                    );

                    if (existingFolderNode) {
                        // 如果存在同名文件夹，说明文件路径结构错误
                        // 不应该将文件添加到同名文件夹中，而应该跳过或报错
                        console.error(`[文件树合并] 发现同名文件夹，无法创建文件节点: ${filePathWithoutProjectId}`);
                        console.error(`[文件树合并] 文件路径结构错误，已存在文件夹节点: ${existingFolderNode.key}`);
                        // 跳过该文件，避免创建冲突
                        continue;
                    }

                    if (!existingFileNode) {
                        // 使用统一的节点规范化工具创建文件节点
                        const fileNode = normalizeTreeNode({
                            key: filePathWithoutProjectId,
                            name: f.name,
                            type: 'file',
                            size: (Number.isFinite(f.size) ? f.size : ((f.content || '').length)),
                            modified: Date.now()
                        });

                        if (fileNode) {
                            parent.children.push(fileNode);
                        }
                    } else {
                        // 更新现有文件节点的信息
                        existingFileNode.name = f.name;
                        existingFileNode.size = (Number.isFinite(f.size) ? f.size : ((f.content || '').length));
                        existingFileNode.modified = Date.now();
                    }
                }

                console.log(`[文件树合并] 合并完成，共 ${mergedFolderMap.size} 个文件夹节点`);

                // 3. 更新文件树到数据库
                // 3. 批量处理文件：同步到会话
                console.log(`[数据库保存] 开始同步 ${filesPayload.length} 个文件到会话`);
                let deepFilesSaved = 0;
                let moreButtonSaved = false;
                let filesUploaded = 0;
                let filesUpdated = 0;
                let filesCreated = 0;
                let filesFailed = 0;
                const failedFiles = [];

                // 导入会话同步服务（与新建文件保持一致）
                const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
                const sessionSync = getSessionSyncService();

                for (const payload of filesPayload) {
                    try {
                        const fileKey = payload.fileKey || payload.key || payload.path;
                        const existingFile = existingFilesMap.get(fileKey);
                        const isFile = payload.type === 'file' || (!payload.type && fileKey && !fileKey.endsWith('/'));

                        const isExistingFile = existingFile && existingFile.key;

                        // 仅处理文件，忽略文件夹
                        if (isFile && fileKey) {
                            try {
                                // 使用统一的字段规范化工具确保字段一致性
                                const normalizedFileObj = normalizeFileObject(payload);
                                if (normalizedFileObj) {
                                    // 强制更新模式 (Upsert)，确保覆盖旧内容
                                    await sessionSync.syncFileToSession(normalizedFileObj, false, true);

                                    filesUploaded++;
                                    if (isExistingFile) {
                                        filesUpdated++;
                                        console.log(`[数据库保存] 文件已更新到会话: ${fileKey}`);
                                    } else {
                                        filesCreated++;
                                        console.log(`[数据库保存] 文件已创建到会话: ${fileKey}`);
                                    }
                                }
                            } catch (syncError) {
                                console.warn(`[数据库保存] 同步文件到会话失败（已忽略）: ${fileKey}`, syncError?.message);
                                filesFailed++;
                            }
                        }

                        // 统计深层次文件保存
                        if (payload.path && payload.path.includes('/') && payload.path.split('/').length > 3) {
                            deepFilesSaved++;
                        }

                        // 统计 MoreButton.vue 保存
                        if (payload.name === 'MoreButton.vue' || payload.path.includes('MoreButton.vue')) {
                            moreButtonSaved = true;
                        }
                    } catch (error) {
                        filesFailed++;
                        failedFiles.push({
                            path: payload.path,
                            name: payload.name,
                            error: error?.message || '未知错误'
                        });
                        console.error(`[数据库保存] 文件处理失败: ${payload.path}`, error);
                    }
                }
                console.log(`[数据库保存统计] 成功处理: ${filesUploaded} 个文件（更新: ${filesUpdated}，新增: ${filesCreated}）`);
                console.log(`[数据库保存统计] 上传失败: ${filesFailed} 个文件`);
                console.log(`[数据库保存统计] 深层次文件保存: ${deepFilesSaved}`);
                console.log(`[数据库保存统计] MoreButton.vue 保存: ${moreButtonSaved ? '是' : '否'}`);

                if (failedFiles.length > 0) {
                    console.log(`[数据库保存统计] 失败文件列表:`, failedFiles);
                }

                // 刷新本地数据，并自动切换到最新上传的项目
                try {
                    if (typeof store.loadProjects === 'function') {
                        await store.loadProjects();
                    }
                } catch (_) { }

                // 更新选择到刚上传的项目


                // 加载界面所需数据（上传项目后需要重新加载，使用 forceClear: true）
                await Promise.all([
                    loadFileTree(true),  // forceClear: true，上传后需要重新加载
                    loadFiles()
                ]);

                // 刷新会话列表（转换成树文件后需要刷新）
                try {
                    if (typeof store.loadSessions === 'function') {
                        await store.loadSessions(true);
                    }
                } catch (_) { }

                // 广播项目就绪事件
                try {
                    window.dispatchEvent(new CustomEvent('projectReady', { detail: {} }));
                } catch (_) { }

                const { showSuccess, showWarning } = await import('/src/utils/message.js');
                let msg = `导入完成：成功处理 ${filesUploaded} 个文件`;
                if (filesUpdated > 0 && filesCreated > 0) {
                    msg += `（更新 ${filesUpdated} 个，新增 ${filesCreated} 个）`;
                } else if (filesUpdated > 0) {
                    msg += `（更新 ${filesUpdated} 个）`;
                } else if (filesCreated > 0) {
                    msg += `（新增 ${filesCreated} 个）`;
                }
                if (filesFailed > 0) {
                    msg += `，失败 ${filesFailed} 个文件`;
                }
                msg += `，跳过排除项 ${skippedExcluded} 个`;
                if (skippedImages > 0) {
                    msg += `，跳过图片文件 ${skippedImages} 个`;
                }
                if (skippedLarge > 0) {
                    msg += `，跳过大文件(>1MB) ${skippedLarge} 个`;
                }
                msg += `。已切换到新项目`;

                if (filesFailed > 0) {
                    showWarning(msg);
                } else {
                    showSuccess(msg);
                }
            } finally {
                try { if (__uploadLoadingShown) hideGlobalLoading(); } catch (_) { }
            }
        }, '项目上传');
    };

    // 触发隐藏的文件选择
    // 已移除上传功能
    const triggerUploadProjectVersion = () => {
        console.warn('[triggerUploadProjectVersion] 该功能已被禁用');
    };

    /**
     * 打开链接
     * @param {string} url - 链接地址
     */
    const openLink = (url) => {
        if (!url) return;
        if (/^https?:\/\//.test(url)) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            window.location.href = url;
        }
    };

    /**
     * 处理文件选择
     * @param {string|Object} key - 文件Key或节点对象
     */
    const handleFileSelect = (key) => {
        return safeExecute(async () => {
            console.log('[文件选择] 收到文件选择请求:', key);

            // 支持对象入参：优先使用 key，最后是 name
            let targetKey = key;
            if (key && typeof key === 'object') {
                const node = key;
                // 优先使用 key，最后是 name
                targetKey = node.key || node.name || '';
                console.log('[文件选择] 从对象中提取文件Key:', targetKey, '原始对象:', node);

                // 如果有 key 信息，保存到全局变量供后续使用
                if (node.key) {
                    window.__aicrPendingFileKey = node.key;
                    console.log('[文件选择] 保存文件Key:', window.__aicrPendingFileKey);
                }
            }

            // 使用统一的文件Key规范化函数
            const keyNorm = normalizeKey(targetKey);
            if (!keyNorm) {
                throw createError('文件Key无效', ErrorTypes.VALIDATION, '文件选择');
            }

            // 如果点击的是当前选中的文件，则取消选中（恢复刷新页面时的状态）
            if (selectedKey.value === keyNorm) {
                console.log('[文件选择] 取消选中文件:', keyNorm);
                setSelectedKey(null);
                window.__aicrPendingFileKey = null;
                return;
            }

            console.log('[文件选择] 设置选中的文件Key:', keyNorm);
            setSelectedKey(keyNorm);

            // 若项目就绪，尝试按需加载内容
            try {
                if (typeof loadFileByKey === 'function') {
                    const fileKey = window.__aicrPendingFileKey || null;
                    console.log('[文件选择] 开始按需加载文件内容:', { key: keyNorm, fileKey });
                    // 正确传递参数：targetKey
                    const loadedFile = await loadFileByKey(keyNorm);
                    if (loadedFile && loadedFile.content) {
                        console.log('[文件选择] 文件内容加载成功，内容长度:', loadedFile.content.length);
                    } else {
                        console.warn('[文件选择] 文件内容为空或未加载');
                    }
                }
            } catch (e) {
                console.warn('[文件选择] 按需加载失败(忽略):', e?.message || e);
            }
        }, '文件选择处理');
    };

    /**
     * 处理文件夹切换
     * @param {string} folderId - 文件夹ID
     */
    const handleFolderToggle = (folderId) => {
        return safeExecute(() => {
            if (!folderId || typeof folderId !== 'string') {
                throw createError('文件夹ID无效', ErrorTypes.VALIDATION, '文件夹切换');
            }

            toggleFolder(folderId);
            const isExpanded = expandedFolders.value.has(folderId);
            console.log(`[文件夹切换] ${folderId}: ${isExpanded ? '展开' : '收起'}`);
        }, '文件夹切换处理');
    };

    /**
     * 展开所有文件夹
     */
    const expandAllFolders = () => {
        return safeExecute(() => {
            const expandFolder = (items) => {
                if (!Array.isArray(items)) {
                    // 如果是单个节点，直接处理
                    if (items.type === 'folder') {
                        expandedFolders.value.add(items.key);
                        if (items.children) {
                            expandFolder(items.children);
                        }
                    }
                    return;
                }

                items.forEach(item => {
                    if (item.type === 'folder') {
                        expandedFolders.value.add(item.key);
                        if (item.children) {
                            expandFolder(item.children);
                        }
                    }
                });
            };

            if (fileTree.value) {
                expandFolder(fileTree.value);
                showSuccessMessage('已展开所有文件夹');
            }
        }, '展开所有文件夹');
    };

    /**
     * 收起所有文件夹
     */
    const collapseAllFolders = () => {
        return safeExecute(() => {
            expandedFolders.value.clear();
            showSuccessMessage('已收起所有文件夹');
        }, '收起所有文件夹');
    };




    /**
     * 初始化项目根目录
     */
    const initializeProjectRootDirectory = async () => {
        return safeExecuteAsync(async () => {
            console.log('[初始化根目录] 开始初始化项目');

            try {
                // 导入会话同步服务
                const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
                const sessionSync = getSessionSyncService();

                // 创建 README.md 文件对象
                const readmeFile = {
                    key: 'README.md',
                    path: 'README.md',
                    name: 'README.md',
                    content: `# New Project\n\n项目描述：这是一个新创建的项目。\n\n## 开始使用\n\n请在此处添加项目的使用说明。`,
                    type: 'file'
                };

                // 同步到会话 (forceUpdate = true)
                console.log('[初始化根目录]正在创建README.md会话...');
                await sessionSync.syncFileToSession(readmeFile, false, true);

                console.log('[初始化根目录] 项目初始化完成 (README.md 已创建)');

            } catch (error) {
                console.error('[初始化根目录] 初始化失败:', error);
                throw error;
            }
        }, '初始化项目根目录');
    };

    /**
     * 切换侧边栏
     */
    const handleToggleSidebar = () => {
        return safeExecute(() => {
            toggleSidebar();
            console.log('[侧边栏] 切换侧边栏状态');
        }, '侧边栏切换');
    };

    /**
     * 处理项目切换
     */
    const handleProjectChange = () => {
        return safeExecute(async () => {
            console.log('[项目切换] 全局模式下忽略项目切换');
        }, '项目切换处理');
    };


    /**
     * 刷新数据
     */
    const handleRefreshData = () => {
        return safeExecute(() => {
            refreshData();
            console.log('[数据刷新] 刷新当前项目数据');
        }, '数据刷新处理');
    };

    /**
     * 切换批量选择模式 (文件树)
     */
    const toggleBatchMode = () => {
        return safeExecute(() => {
            const { batchMode, selectedKeys } = store;
            if (batchMode && typeof batchMode.value !== 'undefined') {
                batchMode.value = !batchMode.value;
                // 退出批量模式时清空选中项
                if (!batchMode.value && selectedKeys && selectedKeys.value) {
                    selectedKeys.value.clear();
                }
                console.log('[批量选择] 批量模式:', batchMode.value ? '开启' : '关闭');
            }
        }, '批量模式切换');
    };

    /**
     * 切换会话批量选择模式
     */
    const toggleSessionBatchMode = () => {
        return safeExecute(() => {
            const { sessionBatchMode, selectedSessionKeys } = store;
            if (sessionBatchMode && typeof sessionBatchMode.value !== 'undefined') {
                sessionBatchMode.value = !sessionBatchMode.value;
                // 退出批量模式时清空选中项
                if (!sessionBatchMode.value && selectedSessionKeys && selectedSessionKeys.value) {
                    selectedSessionKeys.value.clear();
                }
                console.log('[会话批量] 模式切换:', sessionBatchMode.value ? '开启' : '关闭');
            }
        }, '会话批量模式切换');
    };

    /**
     * 处理会话批量选择
     * @param {string} sessionKey - 会话Key
     */
    const handleSessionBatchSelect = (sessionKey) => {
        return safeExecute(() => {
            const { sessionBatchMode, selectedSessionKeys } = store;

            if (!sessionBatchMode || !sessionBatchMode.value) {
                console.warn('[会话批量] 未开启批量模式');
                return;
            }

            if (!selectedSessionKeys || !selectedSessionKeys.value) {
                console.warn('[会话批量] selectedSessionKeys 未初始化');
                return;
            }

            if (selectedSessionKeys.value.has(sessionKey)) {
                selectedSessionKeys.value.delete(sessionKey);
            } else {
                selectedSessionKeys.value.add(sessionKey);
            }

            console.log('[会话批量] 当前选中数量:', selectedSessionKeys.value.size);
        }, '会话批量选择');
    };

    /**
     * 处理全选/取消全选会话
     * @param {Object} payload - { ids: [], isSelect: boolean }，如果为空则默认全选/取消全选当前store中的所有会话
     */
    const handleToggleSelectAllSessions = (payload) => {
        return safeExecute(() => {
            const { selectedSessionKeys, sessions } = store;

            if (!selectedSessionKeys || !selectedSessionKeys.value) return;

            // 1. 如果传入了具体的ID列表（通常来自 filteredSessions）
            if (payload && Array.isArray(payload.ids)) {
                const { ids, isSelect } = payload;
                if (isSelect) {
                    ids.forEach(id => selectedSessionKeys.value.add(id));
                } else {
                    ids.forEach(id => selectedSessionKeys.value.delete(id));
                }
                console.log('[会话批量] 指定范围全选/取消:', isSelect, '数量:', ids.length);
                return;
            }

            // 2. 如果没有传入参数，则根据当前选中状态切换（全选所有/清空）
            // 这种情况下，我们只能操作 store.sessions 中的所有会话
            const allSessions = sessions.value || [];
            const allIds = allSessions.map(s => s && s.key).filter(Boolean);

            // 检查是否已全选 (所有有效ID都在选中集合中)
            const isAllSelected = allIds.length > 0 && allIds.every(id => selectedSessionKeys.value.has(id));

            if (isAllSelected) {
                // 取消全选
                selectedSessionKeys.value.clear();
                console.log('[会话批量] 取消全选');
            } else {
                // 全选
                allIds.forEach(id => selectedSessionKeys.value.add(id));
                console.log('[会话批量] 全选所有会话, 数量:', allIds.length);
            }
        }, '会话全选/取消全选');
    };

    /**
     * 处理批量删除会话
     * @param {Array} payloadIds - 可选：要删除的会话ID列表（如果不传则删除所有选中的）
     */
    const handleBatchDeleteSessions = async (payloadIds) => {
        return safeExecute(async () => {
            const { selectedSessionKeys } = store;

            // 确定要删除的ID列表
            let keysToDelete = [];

            // 检查 payloadIds 是否为数组且不为空
            // 注意：payloadIds 可能是 event 对象，所以要严格检查是否为数组
            if (Array.isArray(payloadIds) && payloadIds.length > 0) {
                keysToDelete = payloadIds;
            } else {
                // 如果没有传入ID列表，则使用 selectedSessionKeys
                if (!selectedSessionKeys || !selectedSessionKeys.value || selectedSessionKeys.value.size === 0) {
                    if (window.showError) window.showError('请先选择要删除的会话');
                    return;
                }
                keysToDelete = Array.from(selectedSessionKeys.value);
            }

            const count = keysToDelete.length;
            if (count === 0) return;

            if (!confirm(`确定要删除选中的 ${count} 个会话吗？此操作不可撤销。`)) {
                return;
            }

            console.log('[会话批量] 开始删除, 数量:', count);

            const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
            const sessionSync = getSessionSyncService();

            let successCount = 0;
            let failCount = 0;

            // 批量删除
            // 为了避免请求过多，可以分组处理或串行处理
            // 这里使用 Promise.all 并发处理，但建议数量大时分批
            const deletePromises = keysToDelete.map(async (key) => {
                try {
                    // 检查是否为树文件类型的会话
                    // 我们需要从 store.sessions 中找到对应的会话对象来检查 URL
                    const session = store.sessions.value.find(s => s.key === key);
                    if (session && session.url && String(session.url).startsWith('aicr-session://')) {
                        console.warn(`[会话批量] 跳过树文件会话: ${key}`);
                        return { success: false, key, reason: 'skip_tree_file' };
                    }

                    await sessionSync.deleteSession(key);
                    return { success: true, key };
                } catch (e) {
                    console.error(`[会话批量] 删除失败: ${key}`, e);
                    return { success: false, key, reason: e.message };
                }
            });

            const results = await Promise.all(deletePromises);

            results.forEach(res => {
                if (res.success) {
                    successCount++;
                    // 从选中集合中移除
                    if (selectedSessionKeys && selectedSessionKeys.value) {
                        selectedSessionKeys.value.delete(res.key);
                    }
                } else {
                    if (res.reason !== 'skip_tree_file') {
                        failCount++;
                    }
                }
            });

            // 更新本地 sessions 列表
            // 过滤掉已删除的
            const deletedKeys = new Set(results.filter(r => r.success).map(r => r.key));
            if (store.sessions && store.sessions.value) {
                store.sessions.value = store.sessions.value.filter(s => !deletedKeys.has(s.key));
            }

            // 提示结果
            let msg = `批量删除完成: 成功 ${successCount} 个`;
            if (failCount > 0) {
                msg += `, 失败 ${failCount} 个`;
                if (window.showError) window.showError(msg);
            } else {
                if (window.showSuccess) window.showSuccess(msg);
            }

            // 如果全部删除了，退出批量模式
            if (selectedSessionKeys.value.size === 0) {
                // toggleSessionBatchMode(); // 可选：保持批量模式还是退出？通常保持方便继续操作，但如果空了就无所谓
            }

        }, '批量删除会话');
    };

    /**
     * 切换文件选中状态（批量选择模式下）
     */
    const toggleFileSelection = (key) => {
        return safeExecute(() => {
            const { batchMode, selectedKeys } = store;
            if (!batchMode || !batchMode.value) {
                console.warn('[批量选择] 未开启批量模式');
                return;
            }

            if (!selectedKeys || !selectedKeys.value) {
                console.warn('[批量选择] selectedKeys 未初始化');
                return;
            }

            const normalizedKey = normalizeKey ? normalizeKey(key) : String(key || '');

            if (selectedKeys.value.has(normalizedKey)) {
                selectedKeys.value.delete(normalizedKey);
                console.log('[批量选择] 取消选中文件:', normalizedKey);
            } else {
                selectedKeys.value.add(normalizedKey);
                console.log('[批量选择] 选中文件:', normalizedKey);
            }

            console.log('[批量选择] 当前选中文件数:', selectedKeys.value.size);
        }, '文件选择切换');
    };

    /**
     * 版本选择器已改为select元素，不再需要切换方法
     */

    let sessionContextScrollSyncCleanup = null;

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

    const selectSessionForChat = async (session, { toggleActive = true, openContextEditor = false } = {}) => {
        if (!session || !session.key) {
            if (window.showError) window.showError('无效的会话数据');
            return;
        }

        const targetSessionKey = String(session.key);

        if (
            toggleActive &&
            activeSession?.value &&
            String(activeSession.value.key || '') === targetSessionKey
        ) {
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
            let fileName = session.title || session.pageTitle || 'Untitled';
            fileName = String(fileName).replace(/\//g, '-');
            fileKey = currentPath ? currentPath + '/' + fileName : fileName;
        }

        if (setSelectedKey) {
            setSelectedKey(fileKey);
        } else if (selectedKey) {
            selectedKey.value = fileKey;
        }

        if (activeSessionLoading) activeSessionLoading.value = true;
        if (activeSessionError) activeSessionError.value = null;
        if (activeSession) {
            const baseSession = { ...(session || {}), key: targetSessionKey };
            if (!baseSession.messages || !Array.isArray(baseSession.messages)) baseSession.messages = [];
            activeSession.value = baseSession;
        }

        try {
            // 从后端加载完整的会话数据（包括消息）
            let fullSession = null;
            try {
                const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
                const sessionSync = getSessionSyncService();
                fullSession = await sessionSync.getSession(targetSessionKey);
                console.log('[selectSessionForChat] 从后端加载会话数据，消息数量:', fullSession?.messages?.length || 0);
            } catch (e) {
                console.warn('[selectSessionForChat] 加载完整会话数据失败，使用传入的会话数据:', e);
            }

            // 优先使用从后端加载的完整会话数据，否则使用传入的会话数据
            const sourceSession = fullSession || session;
            const normalized = { ...(sourceSession || {}), key: targetSessionKey };
            
            // 确保 messages 字段存在且是数组
            if (!normalized.messages || !Array.isArray(normalized.messages)) {
                normalized.messages = [];
            }
            
            // 规范化消息格式（保持接口返回的顺序，不进行排序）
            // 接口返回的消息顺序应该是正确的，如果接口顺序不对，应该在接口层面修复
            normalized.messages = normalized.messages.map(m => ({
                type: m?.type === 'pet' ? 'pet' : 'user',
                message: String(m?.message || m?.content || ''),
                timestamp: typeof m?.timestamp === 'number' ? m.timestamp : Date.now(),
                imageDataUrl: m?.imageDataUrl,
                imageDataUrls: Array.isArray(m?.imageDataUrls) ? m.imageDataUrls : (m?.imageDataUrl ? [m.imageDataUrl] : [])
            }));

            // 不再进行排序，保持接口返回的顺序
            // 如果接口返回的顺序不正确，应该在接口层面修复

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

            // 确保一定会调用 read-file 接口
            if (apiBase) {
                let cleanPath = '';

                // 优先使用 fileKey
                if (fileKey) {
                    cleanPath = String(fileKey || '').replace(/\\/g, '/').replace(/^\/+/, '');
                    if (cleanPath.startsWith('static/')) {
                        cleanPath = cleanPath.substring(7);
                    }
                    cleanPath = cleanPath.replace(/^\/+/, '');
                } else {
                    // 如果没有 fileKey，从会话信息构建路径
                    const tags = Array.isArray(session.tags) ? session.tags : [];
                    let currentPath = '';
                    tags.forEach((folderName) => {
                        if (!folderName || (folderName.toLowerCase && folderName.toLowerCase() === 'default')) return;
                        currentPath = currentPath ? currentPath + '/' + folderName : folderName;
                    });
                    let fileName = session.title || session.pageTitle || 'Untitled';
                    fileName = String(fileName).replace(/\//g, '-');
                    cleanPath = currentPath ? currentPath + '/' + fileName : fileName;
                    cleanPath = cleanPath.replace(/\\/g, '/').replace(/^\/+/, '');
                    if (cleanPath.startsWith('static/')) {
                        cleanPath = cleanPath.substring(7);
                    }
                    cleanPath = cleanPath.replace(/^\/+/, '');
                }

                // 如果 cleanPath 仍然为空，使用会话的 pageDescription 或其他信息
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

                // 如果还是没有路径，使用会话的 key 作为文件名（作为最后的备选方案）
                if (!cleanPath && targetSessionKey) {
                    cleanPath = `session_${targetSessionKey}.txt`;
                }

                // 确保有路径后才调用接口
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

    return {
        openLink,
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
        handleFileSelect,
        handleFolderToggle,
        // 文件树CRUD
        handleCreateFolder: async (payload) => {
            return safeExecute(async () => {
                const parentId = payload && (payload.parentId || payload.parentKey);
                const name = window.prompt('新建文件夹名称：');
                if (!name) return;
                await createFolder({ parentId, name });
                showSuccessMessage('文件夹创建成功');
            }, '新建文件夹');
        },
        handleCreateFile: async (payload) => {
            return safeExecute(async () => {
                const parentId = payload && (payload.parentId || payload.parentKey);
                const name = window.prompt('新建文件名称（含扩展名）：');
                if (!name) return;
                await createFile({ parentId, name, content: '' });
                showSuccessMessage('文件创建成功');
            }, '新建文件');
        },
        handleRenameItem: async (payload) => {
            return safeExecute(async () => {
                const itemId = payload && (payload.itemId || payload.key);
                const oldName = payload && payload.name;
                if (!itemId) return;
                const newName = window.prompt('输入新名称：', oldName || '');
                if (!newName) return;
                await renameItem({ itemId, newName });
                showSuccessMessage('重命名成功');
            }, '重命名');
        },
        handleDeleteItem: async (payload) => {
            return safeExecute(async () => {
                const itemId = payload && (payload.itemId || payload.key);
                if (!itemId) return;
                if (!confirm('确定删除该项及其子项？此操作不可撤销。')) return;
                await deleteItem({ itemId });
                showSuccessMessage('删除成功');
                // 若删除的是当前选中文件，则清空选择
                if (selectedKey?.value && (selectedKey.value === itemId || selectedKey.value.startsWith(itemId + '/'))) {
                    setSelectedKey(null);
                }
            }, '删除');
        },
        // 会话列表相关方法（已废弃，使用 setViewMode 代替）
        toggleSessionList: async () => {
            return safeExecute(async () => {
                console.log('[toggleSessionList] 切换会话列表（已废弃，使用 setViewMode 代替）');
                // 如果当前是树形视图，切换到标签视图；否则切换回树形视图
                if (viewMode && viewMode.value === 'tree') {
                    // 直接设置视图模式，会触发 setViewMode 的逻辑
                    viewMode.value = 'tags';
                    // 加载会话数据
                    if (loadSessions && typeof loadSessions === 'function') {
                        try {
                            await loadSessions(true);
                        } catch (error) {
                            console.error('[toggleSessionList] 加载会话数据失败:', error);
                        }
                    } else if (store.loadSessions && typeof store.loadSessions === 'function') {
                        try {
                            await store.loadSessions(true);
                        } catch (error) {
                            console.error('[toggleSessionList] 加载会话数据失败:', error);
                        }
                    }
                } else {
                    viewMode.value = 'tree';
                }
            }, '切换会话列表');
        },

        handleSessionSelect: async (session) => {
            return safeExecute(async () => {
                await selectSessionForChat(session, { toggleActive: false, openContextEditor: false });
            }, '选择会话');
        },

        sessionChatMessages: (session) => {
            try {
                const msgs = Array.isArray(session?.messages) ? session.messages : [];
                // 保持接口返回的顺序，不进行排序
                // 如果接口返回的顺序不正确，应该在接口层面修复
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
            try {
                const raw = text == null ? '' : String(text);
                if (!raw) return '';
                if (typeof window.marked === 'undefined') {
                    return raw
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/\n/g, '<br/>');
                }
                if (!_sessionMarkedConfigured) {
                    try {
                        const renderer = new window.marked.Renderer();
                        const originalCodeRenderer = renderer.code.bind(renderer);

                        renderer.html = (html) => {
                            return _escapeHtml(html);
                        };

                        renderer.link = (href, title, text) => {
                            const safeHref = _sanitizeUrl(href);
                            const safeText = _escapeHtml(text == null ? '' : String(text));
                            if (!safeHref) return safeText;
                            const safeTitle = title == null ? '' : String(title);
                            const titleAttr = safeTitle ? ` title="${_escapeHtml(safeTitle)}"` : '';
                            return `<a href="${_escapeHtml(safeHref)}"${titleAttr} target="_blank" rel="noopener noreferrer">${safeText}</a>`;
                        };

                        renderer.image = (href, title, text) => {
                            const safeHref = _sanitizeUrl(href);
                            const alt = _escapeHtml(text == null ? '' : String(text));
                            if (!safeHref) return alt;
                            const safeTitle = title == null ? '' : String(title);
                            const titleAttr = safeTitle ? ` title="${_escapeHtml(safeTitle)}"` : '';
                            return `<img src="${_escapeHtml(safeHref)}" alt="${alt}" loading="lazy"${titleAttr} />`;
                        };

                        renderer.code = (code, language, isEscaped) => {
                            const lang = String(language || '').trim().toLowerCase();
                            const src = String(code || '');
                            if (lang === 'mermaid') {
                                const diagramId = `aicr-chat-mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
                                const diagramCode = String(src || '').trim();
                                if (window.mermaidRenderer && typeof window.mermaidRenderer.createDiagramContainer === 'function' && typeof window.mermaidRenderer.renderDiagram === 'function') {
                                    const container = window.mermaidRenderer.createDiagramContainer(diagramId, diagramCode, {
                                        showHeader: false,
                                        showActions: true,
                                        headerLabel: 'MERMAID 图表',
                                        sourceLine: null
                                    });
                                    setTimeout(() => {
                                        try {
                                            window.mermaidRenderer.renderDiagram(diagramId, diagramCode, { showLoading: false });
                                        } catch (_) { }
                                    }, 0);
                                    return container;
                                }
                                return `<pre class="md-code"><code class="language-mermaid">${_escapeHtml(diagramCode)}</code></pre>`;
                            }

                            if (window.hljs) {
                                const desiredLanguage = lang || 'plaintext';
                                const validLanguage = window.hljs.getLanguage(desiredLanguage) ? desiredLanguage : 'plaintext';
                                try {
                                    const highlighted = window.hljs.highlight(src, { language: validLanguage }).value;
                                    return `<pre><code class="hljs language-${validLanguage}">${highlighted}</code></pre>`;
                                } catch (_) { }
                            }

                            return originalCodeRenderer(src, language, isEscaped);
                        };

                        _sessionMarkedRenderer = renderer;
                        _sessionMarkedConfigured = true;
                    } catch (_) {
                        _sessionMarkedRenderer = null;
                        _sessionMarkedConfigured = true;
                    }
                }

                try {
                    if (typeof window.marked.parse === 'function') {
                        return window.marked.parse(raw, {
                            renderer: _sessionMarkedRenderer || undefined,
                            breaks: true,
                            gfm: true
                        });
                    }
                    return window.marked(raw);
                } catch (_) {
                    return _escapeHtml(raw).replace(/\n/g, '<br/>');
                }
            } catch (_) {
                return '';
            }
        },

        renderSessionChatStreamingHtml: (text) => {
            try {
                const raw = text == null ? '' : String(text);
                if (!raw) return '';
                return _escapeHtml(raw).replace(/\n/g, '<br/>');
            } catch (_) {
                return '';
            }
        },

        // 格式化日期为 YYYY/MM/DD HH:mm
        formatDate: (date) => {
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
        },

        // 构建欢迎卡片 HTML
        buildWelcomeCardHtml: (pageInfo, session = null) => {
            try {
                // 获取会话信息（如果有）
                const sessionTags = session && Array.isArray(session.tags) ? session.tags.filter(t => t && t.trim()) : [];
                const sessionMessages = session && Array.isArray(session.messages) ? session.messages : [];
                const sessionCreatedAt = session && session.createdAt ? session.createdAt : null;
                const sessionUpdatedAt = session && session.updatedAt ? session.updatedAt : null;

                // 检查会话是否有有效的 URL
                const hasSessionUrl = session && session.url && session.url.trim();
                const shouldShowUrl = !session || hasSessionUrl;

                // 构建欢迎卡片 HTML
                let pageInfoHtml = '<div class="welcome-card">';

                // 检查是否有任何内容可显示
                const hasTitle = pageInfo && pageInfo.title && pageInfo.title.trim();
                const hasUrl = shouldShowUrl && pageInfo && pageInfo.url && pageInfo.url.trim();
                const hasDescription = pageInfo && pageInfo.description && pageInfo.description.trim();
                const hasAnyContent = hasTitle || hasUrl || hasDescription || sessionTags.length > 0 || 
                                     sessionMessages.length > 0 || sessionCreatedAt || sessionUpdatedAt;

                // 如果没有任何内容，显示空状态提示
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

                // 标题（如果有）
                if (hasTitle) {
                    pageInfoHtml += `
                        <div class="welcome-card-header">
                            <span class="welcome-card-title">${_escapeHtml(pageInfo.title)}</span>
                        </div>
                    `;
                }

                // 网址（如果有且应该显示）
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

                // 页面描述（如果有）
                if (hasDescription) {
                    const descId = `welcome-desc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    // 使用 renderSessionChatMarkdown 方法（需要在返回对象中定义后才能使用）
                    const renderMarkdown = (text) => {
                        try {
                            const raw = text == null ? '' : String(text);
                            if (!raw) return '';
                            if (typeof window.marked === 'undefined') {
                                return raw
                                    .replace(/&/g, '&amp;')
                                    .replace(/</g, '&lt;')
                                    .replace(/>/g, '&gt;')
                                    .replace(/\n/g, '<br/>');
                            }
                            return window.marked.parse(raw, { breaks: true, gfm: true });
                        } catch (_) {
                            return _escapeHtml(raw).replace(/\n/g, '<br/>');
                        }
                    };
                    pageInfoHtml += `
                        <div class="welcome-card-section welcome-card-description">
                            <div class="welcome-card-section-header">
                                <div class="welcome-card-section-title">📝 页面描述</div>
                                <button type="button" class="welcome-card-action-btn" data-copy-text="${_escapeHtml(pageInfo.description)}" title="复制描述" aria-label="复制描述">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                            <div class="markdown-content" id="${descId}">${renderMarkdown(pageInfo.description)}</div>
                        </div>
                    `;
                }

                // 标签（如果有）
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

                // 消息数量（如果有消息）
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

                // 时间信息（合并显示创建时间和更新时间）
                if (sessionCreatedAt || sessionUpdatedAt) {
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
                    const createdDate = sessionCreatedAt ? new Date(sessionCreatedAt) : null;
                    const updatedDate = sessionUpdatedAt ? new Date(sessionUpdatedAt) : null;
                    const hasValidCreated = createdDate && !isNaN(createdDate.getTime());
                    const hasValidUpdated = updatedDate && !isNaN(updatedDate.getTime());
                    const isSameTime = hasValidCreated && hasValidUpdated && 
                                      Math.abs(createdDate.getTime() - updatedDate.getTime()) < 60000; // 1分钟内视为相同
                    
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
            } catch (error) {
                console.error('[buildWelcomeCardHtml] 构建欢迎卡片失败:', error);
                return '<div class="welcome-card"><div class="welcome-card-empty">构建欢迎卡片失败</div></div>';
            }
        },

        // 为会话构建欢迎卡片 HTML（供模板使用）
        buildWelcomeCardHtmlForSession: (session) => {
            if (!session) return '';
            try {
                const pageInfo = {
                    title: session.pageTitle || session.title || '当前页面',
                    url: session.url || '',
                    description: session.pageDescription || ''
                };
                // 直接调用 buildWelcomeCardHtml，因为它们在同一个返回对象中
                // 这里需要延迟调用，因为方法还未定义，所以使用内联实现
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
                    pageInfoHtml += '<div class="welcome-card-header"><span class="welcome-card-title">当前页面</span></div><div class="welcome-card-section"><div class="welcome-card-empty">暂无页面信息</div></div>';
                    pageInfoHtml += '</div>';
                    return pageInfoHtml;
                }
                if (hasTitle) {
                    pageInfoHtml += `<div class="welcome-card-header"><span class="welcome-card-title">${_escapeHtml(pageInfo.title)}</span></div>`;
                }
                if (hasUrl) {
                    const urlId = `welcome-url-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    pageInfoHtml += `<div class="welcome-card-section"><div class="welcome-card-section-header"><div class="welcome-card-section-title">🔗 网址</div><button type="button" class="welcome-card-action-btn" data-copy-target="${urlId}" title="复制网址" aria-label="复制网址"><i class="fas fa-copy"></i></button></div><a href="${_escapeHtml(pageInfo.url)}" target="_blank" class="welcome-card-url" id="${urlId}">${_escapeHtml(pageInfo.url)}</a></div>`;
                }
                if (hasDescription) {
                    const descId = `welcome-desc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    const renderMarkdown = (text) => {
                        try {
                            const raw = text == null ? '' : String(text);
                            if (!raw) return '';
                            if (typeof window.marked === 'undefined') {
                                return raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
                            }
                            return window.marked.parse(raw, { breaks: true, gfm: true });
                        } catch (_) {
                            return _escapeHtml(String(text || '')).replace(/\n/g, '<br/>');
                        }
                    };
                    pageInfoHtml += `<div class="welcome-card-section welcome-card-description"><div class="welcome-card-section-header"><div class="welcome-card-section-title">📝 页面描述</div><button type="button" class="welcome-card-action-btn" data-copy-text="${_escapeHtml(pageInfo.description)}" title="复制描述" aria-label="复制描述"><i class="fas fa-copy"></i></button></div><div class="markdown-content" id="${descId}">${renderMarkdown(pageInfo.description)}</div></div>`;
                }
                if (sessionTags.length > 0) {
                    const tagsHtml = sessionTags.map(tag => `<span class="welcome-card-tag">${_escapeHtml(tag)}</span>`).join('');
                    pageInfoHtml += `<div class="welcome-card-section"><div class="welcome-card-section-title">🏷️ 标签</div><div class="welcome-card-tags">${tagsHtml}</div></div>`;
                }
                if (sessionMessages.length > 0) {
                    const userMessages = sessionMessages.filter(m => m.type === 'user' || m.role === 'user').length;
                    pageInfoHtml += `<div class="welcome-card-section"><div class="welcome-card-section-title">💬 对话记录</div><div class="welcome-card-meta"><span>共 ${sessionMessages.length} 条消息</span>${userMessages > 0 ? `<span>（用户: ${userMessages} 条）</span>` : ''}</div></div>`;
                }
                if (sessionCreatedAt || sessionUpdatedAt) {
                    const formatDate = (date) => {
                        try {
                            if (!date || !(date instanceof Date)) {
                                if (typeof date === 'number') date = new Date(date);
                                else return '';
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
                    const createdDate = sessionCreatedAt ? new Date(sessionCreatedAt) : null;
                    const updatedDate = sessionUpdatedAt ? new Date(sessionUpdatedAt) : null;
                    const hasValidCreated = createdDate && !isNaN(createdDate.getTime());
                    const hasValidUpdated = updatedDate && !isNaN(updatedDate.getTime());
                    const isSameTime = hasValidCreated && hasValidUpdated && Math.abs(createdDate.getTime() - updatedDate.getTime()) < 60000;
                    if (hasValidCreated || hasValidUpdated) {
                        pageInfoHtml += `<div class="welcome-card-section"><div class="welcome-card-section-title">⏰ 时间信息</div><div class="welcome-card-meta">${hasValidCreated ? `<span>创建: ${_escapeHtml(formatDate(createdDate))}</span>` : ''}${hasValidUpdated && !isSameTime ? `<span>更新: ${_escapeHtml(formatDate(updatedDate))}</span>` : ''}</div></div>`;
                    }
                }
                pageInfoHtml += '</div>';
                return pageInfoHtml;
            } catch (error) {
                console.error('[buildWelcomeCardHtmlForSession] 构建欢迎卡片失败:', error);
                return '';
            }
        },

        // 绑定欢迎卡片事件
        bindWelcomeCardEvents: (container) => {
            if (!container) return;

            // 复制功能
            const copyButtons = container.querySelectorAll('[data-copy-target], [data-copy-text]');
            copyButtons.forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    let textToCopy = '';
                    
                    // 从目标元素复制
                    const copyTarget = btn.getAttribute('data-copy-target');
                    if (copyTarget) {
                        const targetElement = container.querySelector(`#${copyTarget}`);
                        if (targetElement) {
                            textToCopy = targetElement.textContent || targetElement.innerText || '';
                        }
                    }
                    
                    // 从属性复制
                    if (!textToCopy) {
                        const copyText = btn.getAttribute('data-copy-text');
                        if (copyText) {
                            textToCopy = copyText;
                        }
                    }
                    
                    if (textToCopy) {
                        try {
                            await navigator.clipboard.writeText(textToCopy);
                            // 显示成功反馈
                            const icon = btn.querySelector('i');
                            if (icon) {
                                const originalClass = icon.className;
                                icon.className = 'fas fa-check';
                                btn.style.color = 'rgba(34, 197, 94, 0.9)';
                                setTimeout(() => {
                                    icon.className = originalClass;
                                    btn.style.color = '';
                                }, 2000);
                            }
                        } catch (err) {
                            console.warn('复制失败:', err);
                            // 降级方案：使用传统方法
                            const textArea = document.createElement('textarea');
                            textArea.value = textToCopy;
                            textArea.style.position = 'fixed';
                            textArea.style.opacity = '0';
                            document.body.appendChild(textArea);
                            textArea.select();
                            try {
                                document.execCommand('copy');
                                const icon = btn.querySelector('i');
                                if (icon) {
                                    const originalClass = icon.className;
                                    icon.className = 'fas fa-check';
                                    btn.style.color = 'rgba(34, 197, 94, 0.9)';
                                    setTimeout(() => {
                                        icon.className = originalClass;
                                        btn.style.color = '';
                                    }, 2000);
                                }
                            } catch (e) {
                                console.warn('降级复制也失败:', e);
                            }
                            document.body.removeChild(textArea);
                        }
                    }
                });
            });
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
            _sessionChatIsComposing = true;
            _sessionChatCompositionEndTime = 0;
        },

        onSessionChatCompositionUpdate: () => {
            _sessionChatIsComposing = true;
            _sessionChatCompositionEndTime = 0;
        },

        onSessionChatCompositionEnd: () => {
            _sessionChatIsComposing = false;
            _sessionChatCompositionEndTime = Date.now();
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
                const files = input && input.files ? Array.from(input.files).filter(Boolean) : [];
                if (!files || files.length === 0) return;

                const current = Array.isArray(sessionChatDraftImages?.value) ? [...sessionChatDraftImages.value] : [];
                const remaining = Math.max(0, 4 - current.length);
                if (remaining <= 0) {
                    if (window.showError) window.showError('最多支持 4 张图片');
                    return;
                }

                const picked = files.slice(0, remaining);
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
        },

        openSessionFaq: async () => {
            if (sessionFaqVisible) sessionFaqVisible.value = true;
            if (sessionFaqSearchKeyword) sessionFaqSearchKeyword.value = '';
            if (sessionSettingsVisible) sessionSettingsVisible.value = false;
            if (sessionContextEditorVisible) sessionContextEditorVisible.value = false;
            try {
                _sessionFaqLastActiveElement = document.activeElement || null;
            } catch (_) {
                _sessionFaqLastActiveElement = null;
            }
            try {
                const hasItems = Array.isArray(sessionFaqItems?.value) && sessionFaqItems.value.length > 0;
                if (!hasItems) {
                    await loadSessionFaqs({ force: false });
                }
            } catch (_) { }
            try {
                if (_sessionFaqEscHandler) {
                    document.removeEventListener('keydown', _sessionFaqEscHandler);
                    _sessionFaqEscHandler = null;
                }
                _sessionFaqEscHandler = (e) => {
                    try {
                        if (e && e.key === 'Escape') {
                            if (sessionFaqVisible) sessionFaqVisible.value = false;
                        }
                    } catch (_) { }
                };
                document.addEventListener('keydown', _sessionFaqEscHandler);
            } catch (_) { }
            setTimeout(() => _focusSessionFaqSearchInput(), 0);
        },

        openSessionSettings: () => {
            if (sessionFaqVisible) sessionFaqVisible.value = false;
            if (sessionContextEditorVisible) sessionContextEditorVisible.value = false;
            if (sessionBotModelDraft) sessionBotModelDraft.value = String(sessionBotModel?.value || '').trim();
            if (sessionBotSystemPromptDraft) sessionBotSystemPromptDraft.value = String(sessionBotSystemPrompt?.value || defaultSessionBotSystemPrompt).trim();
            if (sessionSettingsVisible) sessionSettingsVisible.value = true;
        },

        openWeChatSettings: () => {
            if (sessionFaqVisible) sessionFaqVisible.value = false;
            if (sessionContextEditorVisible) sessionContextEditorVisible.value = false;
            const src = Array.isArray(weChatRobots?.value) ? weChatRobots.value : [];
            if (weChatRobotsDraft) weChatRobotsDraft.value = src.map(r => ({ ...r }));
            if (weChatSettingsVisible) weChatSettingsVisible.value = true;
        },

        closeSessionFaq: () => {
            if (sessionFaqVisible) sessionFaqVisible.value = false;
            try {
                if (_sessionFaqEscHandler) {
                    document.removeEventListener('keydown', _sessionFaqEscHandler);
                    _sessionFaqEscHandler = null;
                }
            } catch (_) { }
            try {
                const chatInput = document.getElementById('pet-chat-input');
                if (chatInput && typeof chatInput.focus === 'function') {
                    chatInput.focus();
                    _sessionFaqLastActiveElement = null;
                    return;
                }
            } catch (_) { }
            try {
                const el = _sessionFaqLastActiveElement;
                _sessionFaqLastActiveElement = null;
                if (el && typeof el.focus === 'function') el.focus();
            } catch (_) { }
        },

        clearSessionFaqSearch: () => {
            try {
                if (sessionFaqSearchKeyword) sessionFaqSearchKeyword.value = '';
            } catch (_) { }
            _focusSessionFaqSearchInput();
        },

        clearSessionFaqTagSearch: () => {
            try {
                if (sessionFaqTagFilterSearchKeyword) sessionFaqTagFilterSearchKeyword.value = '';
            } catch (_) { }
        },

        addSessionFaqFromInput: async () => {
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
                _focusSessionFaqSearchInput();
                if (window.showSuccess) window.showSuccess('已添加常见问题');
            }, '新增常见问题');
        },

        deleteSessionFaqItem: async (item) => {
            return safeExecute(async () => {
                const key = String(item?.key || '').trim();
                if (!key) return;
                if (!confirm('确定要删除这条常见问题吗？')) return;
                const payload = {
                    module_name: SERVICE_MODULE,
                    method_name: 'delete_document',
                    parameters: { cname: 'faqs', key }
                };
                await postData(`${window.API_URL}/`, payload);
                await loadSessionFaqs({ force: true });
                if (window.showSuccess) window.showSuccess('已删除常见问题');
            }, '删除常见问题');
        },

        closeSessionSettings: () => {
            if (sessionSettingsVisible) sessionSettingsVisible.value = false;
        },

        closeWeChatSettings: () => {
            if (weChatSettingsVisible) weChatSettingsVisible.value = false;
        },

        applySessionFaqItem: (item, mode = 'insert') => {
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
        },

        closeSessionContextEditor: () => {
            if (sessionContextEditorVisible) sessionContextEditorVisible.value = false;
            if (sessionContextUndoVisible) sessionContextUndoVisible.value = false;
            if (sessionContextOptimizeBackup) sessionContextOptimizeBackup.value = '';
            cleanupSessionContextScrollSync();
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

        optimizeSessionContextDraft: async () => {
            return safeExecute(async () => {
                if (!sessionContextDraft) return;
                const raw = String(sessionContextDraft.value ?? '');
                if (!raw.trim()) return;

                if (sessionContextOptimizeBackup) sessionContextOptimizeBackup.value = raw;
                if (sessionContextUndoVisible) sessionContextUndoVisible.value = true;

                const normalized = raw
                    .replace(/\r\n/g, '\n')
                    .replace(/[ \t]+\n/g, '\n')
                    .replace(/\n{3,}/g, '\n\n')
                    .trim();

                sessionContextDraft.value = normalized;
                if (window.showSuccess) window.showSuccess('已优化');
            }, '智能优化页面上下文');
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

                if (sessionContextEditorVisible) sessionContextEditorVisible.value = false;
                if (sessionContextUndoVisible) sessionContextUndoVisible.value = false;
                if (sessionContextOptimizeBackup) sessionContextOptimizeBackup.value = '';
                if (window.showSuccess) window.showSuccess('已保存');
            }, '保存页面上下文');
        },

        onSessionChatKeydown: (e) => {
            try {
                if (!e) return;
                if (e.isComposing || _sessionChatIsComposing) return;
                if (e.key === 'Enter' && _sessionChatCompositionEndTime > 0) {
                    if (Date.now() - _sessionChatCompositionEndTime < _SESSION_CHAT_COMPOSITION_END_DELAY) return;
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (typeof window.aicrApp?.sendSessionChatMessage === 'function') {
                        window.aicrApp.sendSessionChatMessage();
                    }
                    _sessionChatCompositionEndTime = 0;
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

        isSessionChatStreamingMessage: (m, idx) => {
            try {
                return _isStreamingMessage(m);
            } catch (_) {
                return false;
            }
        },

        isSessionChatRegenerating: (m, idx) => {
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
                
                // 打开消息编辑模态框
                if (sessionMessageEditorMode) sessionMessageEditorMode.value = 'split';
                if (sessionMessageEditorDraft) sessionMessageEditorDraft.value = text;
                if (sessionMessageEditorIndex) sessionMessageEditorIndex.value = i;
                if (sessionMessageEditorVisible) sessionMessageEditorVisible.value = true;
            } catch (_) { }
        },

        closeSessionMessageEditor: () => {
            if (sessionMessageEditorVisible) sessionMessageEditorVisible.value = false;
            if (sessionMessageEditorDraft) sessionMessageEditorDraft.value = '';
            if (sessionMessageEditorIndex) sessionMessageEditorIndex.value = -1;
        },

        setSessionMessageEditorMode: (v) => {
            if (!sessionMessageEditorMode) return;
            sessionMessageEditorMode.value = v === 'preview' ? 'preview' : (v === 'split' ? 'split' : 'edit');
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

                // 更新消息内容，只更新 message 字段
                messages[idx] = { ...m, message: content };

                // 更新会话
                const now = Date.now();
                const updatedSession = { ...s, messages, updatedAt: now, lastAccessTime: now };
                if (activeSession) activeSession.value = updatedSession;

                // 使用 update_document 接口保存到服务器
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

                    // 更新本地会话列表
                    if (store.sessions && store.sessions.value) {
                        const sessionIndex = store.sessions.value.findIndex(sess => sess && sess.key === s.key);
                        if (sessionIndex >= 0) {
                            store.sessions.value = [...store.sessions.value];
                            store.sessions.value[sessionIndex] = updatedSession;
                        }
                    }
                } catch (error) {
                    console.error('[保存消息编辑] 保存到服务器失败:', error);
                    throw error; // 重新抛出错误，让 safeExecute 处理
                }

                // 关闭编辑器
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

                const target = messages[i];
                const next = messages[i + 1];
                if (target && target.type !== 'pet' && next && next.type === 'pet') {
                    messages.splice(i, 2);
                } else {
                    messages.splice(i, 1);
                }

                const now = Date.now();
                const nextSession = { ...s, messages, updatedAt: now, lastAccessTime: now };
                activeSession.value = nextSession;

                try {
                    const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
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

                const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
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
                    const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
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
                    const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
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
                    const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
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

        sendSessionChatMessageToRobot: async (robot, m, idx) => {
            return safeExecute(async () => {
                const r = robot || {};
                const webhook = String(r.webhook || '').trim();
                if (!webhook) return;
                const content = String((m && (m.message || m.content)) || '').trim();
                if (!content) return;
                
                // 调用后端接口发送消息
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
                    
                    // 检查业务错误码
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
                const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
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
                    const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
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

        handleSessionDelete: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionDelete] 删除会话:', sessionKey);

                // 1. 获取会话对象 (仅通过 key 查找)
                const sessions = store.sessions?.value || [];
                let session = sessions.find(s => s && s.key === sessionKey);

                // 尝试在文件树中查找对应的节点，以便复用文件删除逻辑
                // 确保文件树已加载
                if (!fileTree.value || fileTree.value.length === 0) {
                    console.log('[handleSessionDelete] 文件树为空，尝试加载...');
                    if (loadFileTree) {
                        await loadFileTree();
                    }
                }

                // 递归查找节点
                const findNode = (nodes) => {
                    if (!nodes || !Array.isArray(nodes)) return null;
                    for (const node of nodes) {
                        // 直接匹配 key
                        if (node.key === sessionKey) return node;
                        // 兼容 sessionKey 匹配
                        if (node.sessionKey === sessionKey) return node;

                        if (node.children) {
                            const found = findNode(node.children);
                            if (found) return found;
                        }
                    }
                    return null;
                };

                const node = findNode(fileTree.value);

                if (node) {
                    console.log('[handleSessionDelete] 找到对应文件节点，使用文件删除逻辑:', node.key);
                    const itemId = node.key;
                    if (!confirm('确定删除该会话及其对应文件？此操作不可撤销。')) return;

                    // 调用 store 的 deleteItem
                    if (deleteItem) {
                        await deleteItem({ itemId });
                        showSuccessMessage('删除成功');
                    }
                    return;
                }

                console.warn('[handleSessionDelete] 未找到对应文件节点，回退到普通会话删除逻辑');

                try {
                    // 如果从列表中找不到，尝试获取完整会话信息
                    if (!session) {
                        try {
                            const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();
                            session = await sessionSync.getSession(sessionKey);
                        } catch (e) {
                            console.warn('[handleSessionDelete] 获取会话信息失败:', e);
                        }
                    }

                    if (!confirm('确定删除该会话？此操作不可撤销。')) return;

                    // 判断是否为树文件类型的会话（通过URL判断）
                    if (session && session.url && String(session.url).startsWith('aicr-session://')) {
                        if (window.showError) {
                            window.showError('不允许在会话视图删除树文件类型的会话');
                        }
                        return; // 阻止删除
                    }

                    // 使用 SessionSyncService 删除会话
                    const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
                    const sessionSync = getSessionSyncService();
                    await sessionSync.deleteSession(sessionKey);

                    // 从列表中移除
                    if (store.sessions && store.sessions.value && Array.isArray(store.sessions.value)) {
                        store.sessions.value = store.sessions.value.filter(s => s && s.key !== sessionKey);
                    }

                    if (window.showSuccess) {
                        window.showSuccess('会话已删除');
                    }
                } catch (error) {
                    console.error('[handleSessionDelete] 删除会话失败:', error);
                    if (window.showError) {
                        window.showError(`删除会话失败：${error.message || '未知错误'}`);
                    }
                }
            }, '删除会话');
        },

        handleSessionCreate: async () => {
            return safeExecute(async () => {
                // 使用 prompt 获取会话名称（与新建文件保持一致）
                const title = window.prompt('新建会话名称：');
                if (!title || !title.trim()) return;

                const sessionTitle = title.trim();

                // 生成 UUID 格式的会话 key
                const generateUUID = () => {
                    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                        return crypto.randomUUID();
                    }
                    // 兜底方案：生成类似 UUID 的字符串
                    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                        const r = Math.random() * 16 | 0;
                        const v = c === 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                    });
                };

                const sessionKey = generateUUID();

                // 获取当前时间戳
                const now = Date.now();

                // 生成唯一的随机 URL
                const timestamp = Date.now();
                const randomStr = Math.random().toString(36).substring(2, 11);
                const uniqueUrl = `aicr-session://${timestamp}-${randomStr}`;

                // 构建会话数据
                const sessionData = {
                    key: sessionKey,
                    url: uniqueUrl,
                    title: sessionTitle,
                    pageTitle: sessionTitle,
                    pageDescription: '',
                    pageContent: '',
                    messages: [],
                    tags: [],
                    createdAt: now,
                    updatedAt: now,
                    lastAccessTime: now
                };

                // 调用会话保存接口
                const payload = {
                    module_name: SERVICE_MODULE,
                    method_name: 'create_document',
                    parameters: {
                        cname: 'sessions',
                        data: sessionData
                    }
                };

                const saveResult = await postData(`${window.API_URL}/`, payload);

                if (saveResult && saveResult.success !== false) {
                    // 生成文件路径（基于会话标题）
                    const sanitizeFileName = (name) => String(name || '').replace(/\//g, '-');
                    const fileName = sanitizeFileName(sessionTitle);
                    
                    // 根据会话的 tags 构建文件夹路径（如果有）
                    const tags = Array.isArray(sessionData.tags) ? sessionData.tags : [];
                    const folderParts = tags
                        .map(t => (t == null ? '' : String(t)).trim())
                        .filter(t => t.length > 0 && String(t).toLowerCase() !== 'default');
                    
                    let filePath = '';
                    if (folderParts.length > 0) {
                        const folderPath = folderParts.join('/');
                        filePath = normalizeFilePath(`${folderPath}/${fileName}`);
                    } else {
                        filePath = normalizeFilePath(fileName);
                    }

                    // 调用 write-file 接口创建实际文件（与新建文件保持一致）
                    try {
                        const baseUrl = window.API_URL || '';
                        const url = `${baseUrl.replace(/\/$/, '')}/write-file`;
                        
                        // 清理路径：移除 static/ 前缀（如果有）
                        const cleanPath = filePath.startsWith('static/') 
                            ? filePath.slice(7) 
                            : filePath;

                        const response = await fetch(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                target_file: cleanPath,
                                content: sessionData.pageContent || '',
                                is_base64: false
                            })
                        });

                        if (!response.ok) {
                            const errorData = await response.json().catch(() => ({}));
                            throw new Error(errorData.message || `创建文件失败: ${response.status}`);
                        }

                        const result = await response.json();
                        if (result.code !== 0 && result.code !== 200) {
                            throw new Error(result.message || '创建文件失败');
                        }

                        console.log('[handleSessionCreate] 文件已通过 write-file 创建:', cleanPath);
                    } catch (writeError) {
                        console.warn('[handleSessionCreate] 通过 write-file 创建文件失败（已忽略）:', writeError?.message);
                        // 不阻止流程继续，因为会话已创建
                    }

                    // 添加到本地列表（确保新会话立即可用）
                    if (store.sessions && store.sessions.value) {
                        store.sessions.value = [sessionData, ...store.sessions.value];
                    }

                    // 刷新会话列表（从后端获取最新数据）
                    if (loadSessions && typeof loadSessions === 'function') {
                        await loadSessions(true);
                    }

                    // 刷新文件树（确保新创建的文件显示在文件树中）
                    if (store.loadFileTree && typeof store.loadFileTree === 'function') {
                        try {
                            await store.loadFileTree();
                        } catch (refreshError) {
                            console.warn('[handleSessionCreate] 刷新文件树失败（已忽略）:', refreshError?.message);
                        }
                    }

                    // 选中新创建的会话
                    const sessions = store.sessions?.value || [];
                    const newSession = sessions.find(s => s && s.key === sessionKey);
                    if (newSession) {
                        await selectSessionForChat(newSession, { toggleActive: false, openContextEditor: false });
                    }

                    showSuccessMessage('会话创建成功');
                } else {
                    throw new Error(saveResult?.message || '创建会话失败');
                }
            }, '创建会话');
        },

        handleTagSelect: (tags) => {
            return safeExecute(() => {
                if (store.selectedSessionTags) {
                    store.selectedSessionTags.value = tags;
                }
            }, '选择标签');
        },

        handleTagClear: () => {
            return safeExecute(() => {
                if (store.selectedSessionTags) {
                    store.selectedSessionTags.value = [];
                }
            }, '清除标签');
        },

        handleTagFilterReverse: (reverse) => {
            return safeExecute(() => {
                if (store.tagFilterReverse) {
                    store.tagFilterReverse.value = reverse;
                }
            }, '切换反向过滤');
        },

        handleTagFilterNoTags: (noTags) => {
            return safeExecute(() => {
                if (store.tagFilterNoTags) {
                    store.tagFilterNoTags.value = noTags;
                }
            }, '切换无标签筛选');
        },

        handleTagFilterExpand: (expanded) => {
            return safeExecute(() => {
                if (store.tagFilterExpanded) {
                    store.tagFilterExpanded.value = expanded;
                }
            }, '切换标签展开/折叠');
        },

        handleTagFilterSearch: (keyword) => {
            return safeExecute(() => {
                if (store.tagFilterSearchKeyword) {
                    store.tagFilterSearchKeyword.value = keyword || '';
                }
            }, '标签搜索');
        },

        handleSessionSearchChange: (query) => {
            return safeExecute(() => {
                if (store.sessionSearchQuery) {
                    store.sessionSearchQuery.value = query || '';
                }
            }, '会话搜索变化');
        },

        // 切换会话收藏状态
        handleSessionToggleFavorite: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionToggleFavorite] 切换收藏状态:', sessionKey);
                try {
                    // 找到会话
                    const sessions = store.sessions?.value || [];
                    let session = sessions.find(s => s && s.key === sessionKey);

                    if (!session) {
                        try {
                            const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();
                            session = await sessionSync.getSession(sessionKey);
                        } catch (e) {
                            console.warn('[handleSessionToggleFavorite] 获取会话信息失败:', e);
                        }
                    }

                    if (!session) {
                        throw new Error('会话不存在');
                    }

                    // 切换收藏状态
                    const newFavoriteState = !(session.isFavorite || false);
                    session.isFavorite = newFavoriteState;

                    // 更新后端
                    // const { postData } = await import('/src/services/index.js');
                    const updateData = {
                        key: sessionKey,
                        isFavorite: newFavoriteState
                    };
                    // await postData(`${window.API_URL}/session/save`, updateData);

                    const payload = {
                        module_name: SERVICE_MODULE,
                        method_name: 'update_document',
                        parameters: {
                            cname: 'sessions',
                            key: sessionKey,
                            data: updateData
                        }
                    };
                    await postData(`${window.API_URL}/`, payload);

                    // 更新本地状态
                    if (store.sessions && store.sessions.value) {
                        store.sessions.value = [...store.sessions.value];
                    }

                    if (window.showSuccess) {
                        window.showSuccess(newFavoriteState ? '已收藏' : '已取消收藏');
                    }
                } catch (error) {
                    console.error('[handleSessionToggleFavorite] 切换收藏状态失败:', error);
                    if (window.showError) {
                        window.showError(`操作失败：${error.message || '未知错误'}`);
                    }
                }
            }, '切换收藏状态');
        },

        // 会话收藏（别名，用于模板中）
        handleSessionFavorite: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionFavorite] 切换收藏状态:', sessionKey);
                try {
                    // 找到会话
                    const sessions = store.sessions?.value || [];
                    let session = sessions.find(s => s && s.key === sessionKey);

                    if (!session) {
                        try {
                            const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();
                            session = await sessionSync.getSession(sessionKey);
                        } catch (e) {
                            console.warn('[handleSessionFavorite] 获取会话信息失败:', e);
                        }
                    }

                    if (!session) {
                        throw new Error('会话不存在');
                    }

                    // 切换收藏状态
                    const newFavoriteState = !(session.isFavorite || false);
                    session.isFavorite = newFavoriteState;

                    // 更新后端
                    // const { postData } = await import('/src/services/index.js');
                    const updateData = {
                        key: sessionKey,
                        isFavorite: newFavoriteState
                    };
                    // await postData(`${window.API_URL}/session/save`, updateData);

                    const payload = {
                        module_name: SERVICE_MODULE,
                        method_name: 'update_document',
                        parameters: {
                            cname: 'sessions',
                            key: sessionKey,
                            data: updateData
                        }
                    };
                    await postData(`${window.API_URL}/`, payload);

                    // 更新本地状态
                    if (store.sessions && store.sessions.value) {
                        store.sessions.value = [...store.sessions.value];
                    }

                    if (window.showSuccess) {
                        window.showSuccess(newFavoriteState ? '已收藏' : '已取消收藏');
                    }
                } catch (error) {
                    console.error('[handleSessionFavorite] 切换收藏状态失败:', error);
                    if (window.showError) {
                        window.showError(`操作失败：${error.message || '未知错误'}`);
                    }
                }
            }, '切换收藏状态');
        },

        // 编辑会话（打开编辑模态框）
        handleSessionEdit: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionEdit] 打开编辑模态框:', sessionKey);

                // 获取会话对象（优先从本地获取）
                const sessions = store.sessions?.value || [];
                let session = sessions.find(s => s && s.key === sessionKey);

                if (!session) {
                    console.log('[handleSessionEdit] 本地未找到会话，尝试从服务端获取');
                    try {
                        const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
                        const sessionSync = getSessionSyncService();
                        const serverSession = await sessionSync.getSession(sessionKey);
                        
                        if (serverSession) {
                            // 如果本地有会话，合并数据；否则使用服务端会话
                            if (session) {
                                session = { ...session, ...serverSession };
                            } else {
                                session = serverSession;
                            }
                        }
                    } catch (e) {
                        console.warn('[handleSessionEdit] 获取会话信息失败:', e);
                    }
                }

                if (!session) {
                    if (window.showError) {
                        window.showError('会话不存在');
                    }
                    return;
                }

                // 设置编辑模态框数据
                if (store.sessionEditKey) {
                    store.sessionEditKey.value = sessionKey;
                }
                if (store.sessionEditTitle) {
                    store.sessionEditTitle.value = session.pageTitle || session.title || '';
                }
                if (store.sessionEditUrl) {
                    store.sessionEditUrl.value = session.url || '';
                }
                if (store.sessionEditDescription) {
                    store.sessionEditDescription.value = session.pageDescription || '';
                }
                // 缓存完整的会话数据（包括 pageContent），避免在生成描述时重复获取
                if (store.sessionEditData) {
                    store.sessionEditData.value = session;
                }
                if (store.sessionEditVisible) {
                    store.sessionEditVisible.value = true;
                }
            }, '打开编辑模态框');
        },

        // 关闭会话编辑模态框
        closeSessionEdit: () => {
            if (store.sessionEditVisible) {
                store.sessionEditVisible.value = false;
            }
            if (store.sessionEditKey) {
                store.sessionEditKey.value = null;
            }
            if (store.sessionEditTitle) {
                store.sessionEditTitle.value = '';
            }
            if (store.sessionEditUrl) {
                store.sessionEditUrl.value = '';
            }
            if (store.sessionEditDescription) {
                store.sessionEditDescription.value = '';
            }
            if (store.sessionEditGenerating) {
                store.sessionEditGenerating.value = false;
            }
            // 清空缓存的会话数据
            if (store.sessionEditData) {
                store.sessionEditData.value = null;
            }
        },

        // 保存会话编辑
        saveSessionEdit: async () => {
            return safeExecute(async () => {
                const sessionKey = store.sessionEditKey?.value;
                const title = store.sessionEditTitle?.value?.trim() || '';
                const url = store.sessionEditUrl?.value?.trim() || '';
                const description = store.sessionEditDescription?.value?.trim() || '';

                if (!sessionKey) {
                    throw new Error('会话Key不存在');
                }

                if (!title) {
                    throw new Error('标题不能为空');
                }

                // 获取当前会话数据
                const sessions = store.sessions?.value || [];
                const session = sessions.find(s => s && s.key === sessionKey);
                if (!session) {
                    throw new Error('会话不存在');
                }

                const oldTitle = session.pageTitle || session.title || '';
                const titleChanged = title !== oldTitle;

                // 如果标题改变，需要同步更新静态文件名
                if (titleChanged) {
                    console.log('[saveSessionEdit] 标题已改变，需要同步更新静态文件名:', oldTitle, '->', title);
                    
                    // 确保文件树已加载
                    if (!fileTree.value || fileTree.value.length === 0) {
                        if (loadFileTree) {
                            await loadFileTree();
                        }
                    }

                    // 在文件树中查找对应的文件节点
                    const findNodeBySessionKey = (nodes, targetSessionKey) => {
                        if (!nodes || !Array.isArray(nodes)) return null;
                        for (const node of nodes) {
                            if (node.sessionKey === targetSessionKey || node.key === targetSessionKey) {
                                return node;
                            }
                            if (node.children) {
                                const found = findNodeBySessionKey(node.children, targetSessionKey);
                                if (found) return found;
                            }
                        }
                        return null;
                    };

                    const fileNode = findNodeBySessionKey(fileTree.value, sessionKey);
                    
                    if (fileNode && fileNode.key) {
                        // 找到文件节点，需要重命名静态文件
                        const oldPath = normalizeFilePath(fileNode.key);
                        const parentPath = oldPath.split('/').slice(0, -1).join('/');
                        
                        // 清理文件名（移除特殊字符，避免路径问题）
                        const sanitizeFileName = (name) => String(name || '').replace(/[\/\\:*?"<>|]/g, '-').trim();
                        const newFileName = sanitizeFileName(title);
                        
                        if (!newFileName) {
                            throw new Error('清理后的文件名为空，请使用有效的文件名');
                        }

                        // 计算新路径
                        const newPath = normalizeFilePath(parentPath ? `${parentPath}/${newFileName}` : newFileName);
                        
                        if (oldPath !== newPath) {
                            console.log('[saveSessionEdit] 准备重命名静态文件:', oldPath, '->', newPath);
                            
                            // 使用 store 中的 findNodeAndParentByKey 查找节点和父节点
                            const findNodeAndParentByKey = (rootNodes, targetKey) => {
                                const stack = Array.isArray(rootNodes) ? rootNodes.map(n => ({ node: n, parent: null })) : [{ node: rootNodes, parent: null }];
                                while (stack.length) {
                                    const { node, parent } = stack.pop();
                                    if (!node) continue;
                                    if (node.key === targetKey) return { node, parent };
                                    if (node.type === 'folder' && Array.isArray(node.children)) {
                                        for (const child of node.children) {
                                            stack.push({ node: child, parent: node });
                                        }
                                    } else if (node.children && Array.isArray(node.children)) {
                                        for (const child of node.children) {
                                            stack.push({ node: child, parent: node });
                                        }
                                    }
                                }
                                return { node: null, parent: null };
                            };
                            
                            const { node: foundNode, parent: parentNode } = findNodeAndParentByKey(fileTree.value, oldPath);
                            
                            // 检查同级是否有同名文件
                            const siblings = parentNode ? (parentNode.children || []) : (Array.isArray(fileTree.value) ? fileTree.value : []);
                            if (siblings.some(ch => ch !== fileNode && ch.name === newFileName)) {
                                throw new Error('同级存在同名文件，请使用不同的文件名');
                            }

                            // 重命名静态文件
                            const fileDeleteService = getFileDeleteService();
                            const renameResult = await fileDeleteService.renameFile(oldPath, newPath);
                            
                            if (!renameResult.success) {
                                throw new Error('静态文件重命名失败: ' + (renameResult.error || '未知错误'));
                            }

                            // 更新文件树节点
                            fileNode.name = newFileName;
                            fileNode.key = newPath;
                            fileNode.path = newPath;

                            // 更新本地 files 列表
                            if (Array.isArray(files.value)) {
                                files.value = files.value.map(f => {
                                    const normalizedOldPath = normalizeFilePath(oldPath);
                                    const ids = [f.key, f.path].filter(Boolean).map(id => normalizeFilePath(id));
                                    const matched = ids.some(v => v === normalizedOldPath || v.startsWith(normalizedOldPath + '/'));
                                    if (matched) {
                                        const oldFilePath = normalizeFilePath(f.path || f.key);
                                        const replacedPath = oldFilePath.replace(normalizedOldPath, newPath);
                                        const normalized = normalizeFileObject({
                                            ...f,
                                            key: replacedPath,
                                            path: replacedPath,
                                            name: replacedPath.split('/').pop()
                                        });
                                        return normalized || f;
                                    }
                                    return f;
                                });
                            }

                            // 使用 renameSession 更新会话（这会更新会话的元数据，包括 title, pageTitle, tags 等）
                            const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();
                            
                            // 构造新的文件对象
                            const updatedFile = {
                                key: newPath,
                                path: newPath,
                                name: newFileName,
                                content: fileNode.content || session.pageContent || '',
                                type: 'file'
                            };
                            
                            // 调用 renameSession 更新会话
                            await sessionSync.renameSession(sessionKey, newPath, updatedFile);
                            
                            console.log('[saveSessionEdit] 静态文件和会话已同步更新');
                            
                            // 刷新文件树和会话列表
                            if (loadFileTree) {
                                await loadFileTree();
                            }
                            if (loadSessions) {
                                await loadSessions(true);
                            }
                        } else {
                            // 路径没有改变，只需要更新会话元数据（url 和 description）
                            console.log('[saveSessionEdit] 路径未改变，仅更新会话元数据');
                            const updateData = {
                                key: sessionKey,
                                pageTitle: title,
                                title: title,
                                url: url,
                                pageDescription: description
                            };

                            const payload = {
                                module_name: SERVICE_MODULE,
                                method_name: 'update_document',
                                parameters: {
                                    cname: 'sessions',
                                    key: sessionKey,
                                    data: updateData
                                }
                            };
                            await postData(`${window.API_URL}/`, payload);
                        }
                    } else {
                        // 未找到文件节点，可能不是从文件创建的会话，仅更新会话元数据
                        console.log('[saveSessionEdit] 未找到对应的文件节点，仅更新会话元数据');
                        const updateData = {
                            key: sessionKey,
                            pageTitle: title,
                            title: title,
                            url: url,
                            pageDescription: description
                        };

                        const payload = {
                            module_name: SERVICE_MODULE,
                            method_name: 'update_document',
                            parameters: {
                                cname: 'sessions',
                                key: sessionKey,
                                data: updateData
                            }
                        };
                        await postData(`${window.API_URL}/`, payload);
                    }
                } else {
                    // 标题未改变，仅更新 url 和 description
                    console.log('[saveSessionEdit] 标题未改变，仅更新 url 和 description');
                    const updateData = {
                        key: sessionKey,
                        pageTitle: title,
                        title: title,
                        url: url,
                        pageDescription: description
                    };

                    const payload = {
                        module_name: SERVICE_MODULE,
                        method_name: 'update_document',
                        parameters: {
                            cname: 'sessions',
                            key: sessionKey,
                            data: updateData
                        }
                    };
                    await postData(`${window.API_URL}/`, payload);
                }

                // 更新本地状态
                if (session) {
                    session.pageTitle = title;
                    session.title = title;
                    session.url = url;
                    session.pageDescription = description;
                    if (store.sessions && store.sessions.value) {
                        store.sessions.value = [...store.sessions.value];
                    }
                }

                // 如果当前编辑的会话是 activeSession，也要更新 activeSession，以刷新 welcome-card
                if (activeSession && activeSession.value && activeSession.value.key === sessionKey) {
                    activeSession.value = {
                        ...activeSession.value,
                        pageTitle: title,
                        title: title,
                        url: url,
                        pageDescription: description,
                        updatedAt: Date.now() // 更新更新时间
                    };
                    console.log('[saveSessionEdit] 已更新 activeSession，welcome-card 将自动刷新');
                }

                // 关闭模态框
                if (store.sessionEditVisible) {
                    store.sessionEditVisible.value = false;
                }

                if (window.showSuccess) {
                    window.showSuccess('会话已更新');
                }
            }, '保存会话编辑');
        },

        // AI智能生成描述
        generateSessionDescription: async () => {
            return safeExecute(async () => {
                const sessionKey = store.sessionEditKey?.value;
                if (!sessionKey) {
                    throw new Error('会话Key不存在');
                }

                // 防止重复调用：如果正在生成中，直接返回
                if (store.sessionEditGenerating && store.sessionEditGenerating.value) {
                    console.log('[generateSessionDescription] 正在生成中，跳过重复调用');
                    return;
                }

                // 设置生成中状态
                if (store.sessionEditGenerating) {
                    store.sessionEditGenerating.value = true;
                }

                try {
                    // 优先使用编辑框中缓存的会话数据（在 handleSessionEdit 中已获取完整数据，包括 pageContent）
                    let session = store.sessionEditData?.value;
                    
                    // 如果缓存中没有，从本地 sessions 列表获取
                    if (!session) {
                        const sessions = store.sessions?.value || [];
                        session = sessions.find(s => s && s.key === sessionKey);
                    }
                    
                    // 获取页面上下文内容
                    let pageContent = session?.pageContent || '';
                    const pageTitle = session?.pageTitle || session?.title || '';

                    // 注意：handleSessionEdit 已经获取了完整数据（包括 pageContent）并缓存到 sessionEditData
                    // 所以这里不应该再次调用 getSession，除非缓存真的没有数据
                    // 如果缓存和本地都没有 pageContent，说明 handleSessionEdit 获取失败，这里也不应该再次获取
                    // 因为请求去重机制已经处理了并发请求，如果 handleSessionEdit 正在获取，这里会复用该请求
                    if (!session) {
                        console.warn('[generateSessionDescription] 会话不存在，无法生成描述');
                        throw new Error('会话不存在');
                    }
                    
                    if (!pageContent || pageContent.trim() === '') {
                        console.warn('[generateSessionDescription] 会话缺少 pageContent，将仅使用标题生成描述');
                        // 不再次调用 getSession，因为 handleSessionEdit 已经尝试过了
                        // 如果还是没有，说明服务端也没有，或者获取失败
                    } else {
                        console.log('[generateSessionDescription] 使用缓存的会话数据，pageContent长度:', pageContent.length);
                    }

                    if (!session) {
                        throw new Error('会话不存在');
                    }

                    // 如果 pageContent 仍然为空，尝试从文件树中获取（不调用 loadFileTree，避免触发 loadSessions）
                    if (!pageContent || pageContent.trim() === '') {
                        console.log('[generateSessionDescription] pageContent 仍为空，尝试从文件树获取');
                        try {
                            // 直接使用现有的文件树，不重新加载
                            if (fileTree.value && fileTree.value.length > 0) {
                                // 递归查找对应的文件节点
                                const findNode = (nodes) => {
                                    if (!nodes || !Array.isArray(nodes)) return null;
                                    for (const node of nodes) {
                                        if (node.sessionKey === sessionKey || node.key === sessionKey) {
                                            return node;
                                        }
                                        if (node.children) {
                                            const found = findNode(node.children);
                                            if (found) return found;
                                        }
                                    }
                                    return null;
                                };

                                const node = findNode(fileTree.value);
                                if (node && node.content) {
                                    pageContent = node.content;
                                    console.log('[generateSessionDescription] 从文件树获取到内容，长度:', pageContent.length);
                                } else {
                                    // 如果文件树中也没有，尝试通过 loadFileByKey 加载（仅加载单个文件，不会触发会话列表查询）
                                    if (node && node.key && loadFileByKey) {
                                        const file = await loadFileByKey(node.key);
                                        if (file && file.content) {
                                            pageContent = file.content;
                                            console.log('[generateSessionDescription] 通过 loadFileByKey 获取到内容，长度:', pageContent.length);
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('[generateSessionDescription] 从文件树获取内容失败:', e);
                        }
                    }

                    // 如果仍然没有内容，使用标题作为上下文
                    if (!pageContent || pageContent.trim() === '') {
                        console.warn('[generateSessionDescription] 无法获取页面上下文内容，仅使用标题');
                        pageContent = '';
                    }

                    // 构建用于生成描述的 prompt
                    let contextText = '';
                    if (pageContent && pageContent.trim()) {
                        contextText = `会话标题：${pageTitle}\n\n页面上下文内容：\n${pageContent.substring(0, 10000)}`; // 限制内容长度避免过长
                    } else {
                        contextText = `会话标题：${pageTitle}`;
                    }

                    console.log('[generateSessionDescription] 准备调用AI，上下文长度:', contextText.length);
                    console.log('[generateSessionDescription] 上下文内容预览:', contextText.substring(0, 200));

                    // 调用 AI 接口生成描述
                    const { streamPromptJSON } = await import('/src/services/modules/crud.js');
                    const getPromptUrl = () => `${String(window.API_URL || '').trim().replace(/\/$/, '')}/`;

                    const descriptionResponse = await streamPromptJSON(getPromptUrl(), {
                        module_name: 'services.ai.chat_service',
                        method_name: 'chat',
                        parameters: {
                            system: '请根据以下会话信息生成一个简洁的描述（不超过200字），描述应该概括会话的主要内容和用途。',
                            user: contextText
                        }
                    });

                    console.log('[generateSessionDescription] AI响应:', descriptionResponse);

                    // 提取生成的描述
                    let pageDescription = '';
                    if (typeof descriptionResponse === 'string') {
                        pageDescription = descriptionResponse;
                    } else if (descriptionResponse && descriptionResponse.data) {
                        if (Array.isArray(descriptionResponse.data) && descriptionResponse.data.length > 0) {
                            const firstItem = descriptionResponse.data[0];
                            pageDescription = typeof firstItem === 'string' ? firstItem : JSON.stringify(firstItem, null, 2);
                        } else if (typeof descriptionResponse.data === 'string') {
                            pageDescription = descriptionResponse.data;
                        }
                    }

                    // 如果描述为空，使用默认描述
                    if (!pageDescription || pageDescription.trim() === '') {
                        pageDescription = `会话：${pageTitle}`;
                    }

                    // 更新编辑框中的描述
                    if (store.sessionEditDescription) {
                        store.sessionEditDescription.value = pageDescription.trim();
                    }

                    if (window.showSuccess) {
                        window.showSuccess('描述生成成功');
                    }
                } catch (error) {
                    console.error('[generateSessionDescription] 生成描述失败:', error);
                    if (window.showError) {
                        window.showError(`生成描述失败：${error.message || '未知错误'}`);
                    }
                } finally {
                    if (store.sessionEditGenerating) {
                        store.sessionEditGenerating.value = false;
                    }
                }
            }, 'AI生成描述');
        },

        // 管理会话标签（参考 YiPet 的实现）
        handleSessionManageTags: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionManageTags] 管理标签:', sessionKey);
                try {
                    const sessions = store.sessions?.value || [];
                    let session = sessions.find(s => s && s.key === sessionKey);

                    if (!session) {
                        try {
                            const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();
                            session = await sessionSync.getSession(sessionKey);
                        } catch (e) {
                            console.warn('[handleSessionManageTags] 获取会话信息失败:', e);
                        }
                    }

                    if (!session) {
                        throw new Error('会话不存在');
                    }

                    // 打开标签管理弹窗（传递 store 引用）
                    await openTagManager(session.key, session, store);
                } catch (error) {
                    console.error('[handleSessionManageTags] 管理标签失败:', error);
                    if (window.showError) {
                        window.showError(`操作失败：${error.message || '未知错误'}`);
                    }
                }
            }, '管理标签');
        },

        // 会话标签管理（别名，用于模板中）
        handleSessionTag: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionTag] 管理标签:', sessionKey);
                try {
                    const sessions = store.sessions?.value || [];
                    let session = sessions.find(s => s && s.key === sessionKey);

                    if (!session) {
                        try {
                            const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();
                            session = await sessionSync.getSession(sessionKey);
                        } catch (e) {
                            console.warn('[handleSessionTag] 获取会话信息失败:', e);
                        }
                    }

                    if (!session) {
                        throw new Error('会话不存在');
                    }

                    // 打开标签管理弹窗
                    await openTagManager(session.key, session, store);
                } catch (error) {
                    console.error('[handleSessionTag] 管理标签失败:', error);
                    if (window.showError) {
                        window.showError(`操作失败：${error.message || '未知错误'}`);
                    }
                }
            }, '管理标签');
        },

        // 创建会话副本
        handleSessionDuplicate: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionDuplicate] 创建副本:', sessionKey);
                try {
                    const sessions = store.sessions?.value || [];
                    let sourceSession = sessions.find(s => s && s.key === sessionKey);

                    if (!sourceSession) {
                        try {
                            const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
                            const sessionSync = getSessionSyncService();
                            sourceSession = await sessionSync.getSession(sessionKey);
                        } catch (e) {
                            console.warn('[handleSessionDuplicate] 获取会话信息失败:', e);
                        }
                    }

                    if (!sourceSession) {
                        throw new Error('会话不存在');
                    }

                    // 生成新会话ID
                    const newSessionKey = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                    const now = Date.now();

                    // 创建副本
                    const duplicatedSession = {
                        key: newSessionKey,
                        url: sourceSession.url || '',
                        pageTitle: sourceSession.pageTitle ? `${sourceSession.pageTitle} (副本)` : '新会话 (副本)',
                        title: sourceSession.pageTitle ? `${sourceSession.pageTitle} (副本)` : '新会话 (副本)',
                        pageDescription: sourceSession.pageDescription || '',
                        pageContent: sourceSession.pageContent || '',
                        messages: sourceSession.messages ? JSON.parse(JSON.stringify(sourceSession.messages)) : [],
                        tags: sourceSession.tags ? [...sourceSession.tags] : [],
                        isFavorite: false, // 副本默认不收藏
                        createdAt: now,
                        updatedAt: now,
                        lastAccessTime: now
                    };

                    // 保存到后端
                    // const { postData } = await import('/src/services/index.js');
                    // await postData(`${window.API_URL}/session/save`, duplicatedSession);

                    const payload = {
                        module_name: SERVICE_MODULE,
                        method_name: 'create_document',
                        parameters: {
                            cname: 'sessions',
                            data: duplicatedSession
                        }
                    };
                    await postData(`${window.API_URL}/`, payload);

                    // 添加到本地列表
                    if (store.sessions && store.sessions.value) {
                        store.sessions.value = [duplicatedSession, ...store.sessions.value];
                    }

                    // 重新加载会话列表
                    if (store.loadSessions && typeof store.loadSessions === 'function') {
                        await store.loadSessions(true);
                    }

                    if (window.showSuccess) {
                        window.showSuccess('会话副本已创建');
                    }
                } catch (error) {
                    console.error('[handleSessionDuplicate] 创建副本失败:', error);
                    if (window.showError) {
                        window.showError(`创建副本失败：${error.message || '未知错误'}`);
                    }
                }
            }, '创建副本');
        },

        handleSessionContext: async (sessionKey) => {
            return safeExecute(async () => {
                try {
                    const sessions = store.sessions?.value || [];
                    const session = sessions.find(s => s && s.key === sessionKey);
                    if (!session) {
                        throw new Error('会话不存在');
                    }

                    if (viewMode && viewMode.value !== 'tags') {
                        viewMode.value = 'tags';
                    }

                    await selectSessionForChat(session, { toggleActive: false, openContextEditor: true });
                } catch (error) {
                    console.error('[handleSessionContext] 打开页面上下文失败:', error);
                    if (window.showError) {
                        window.showError(`操作失败：${error.message || '未知错误'}`);
                    }
                }
            }, '打开页面上下文');
        },

        // 打开会话URL（如果URL以https://开头）
        handleSessionOpenUrl: async (sessionKey) => {
            return safeExecute(async () => {
                console.log('[handleSessionOpenUrl] 打开URL:', sessionKey);
                try {
                    const sessions = store.sessions?.value || [];
                    const session = sessions.find(s => s && s.key === sessionKey);
                    if (!session || !session.url || !session.url.startsWith('https://')) {
                        return;
                    }

                    window.open(session.url, '_blank');
                } catch (error) {
                    console.error('[handleSessionOpenUrl] 打开URL失败:', error);
                    if (window.showError) {
                        window.showError(`打开URL失败：${error.message || '未知错误'}`);
                    }
                }
            }, '打开URL');
        },


        handleCreateSession: async (payload) => {
            console.log('[handleCreateSession] 收到创建会话请求:', payload);
            return safeExecute(async () => {
                const fileKey = payload?.key || payload?.fileKey || payload?.path;
                console.log('[handleCreateSession] 文件Key:', fileKey);
                if (!fileKey) {
                    console.error('[handleCreateSession] 无效的文件Key');
                    if (window.showError) {
                        window.showError('无效的文件Key');
                    }
                    return;
                }

                try {
                    // 显示加载状态
                    if (window.showGlobalLoading) {
                        window.showGlobalLoading('正在获取文件内容并生成会话描述...');
                    }

                    // 获取文件内容
                    let fileContent = '';
                    let fileData = null;

                    if (typeof loadFileByKey === 'function') {
                        fileData = await loadFileByKey(fileKey);
                        if (fileData && fileData.content) {
                            fileContent = fileData.content;
                        }
                    }

                    if (!fileContent) {
                        throw new Error('无法获取文件内容');
                    }

                    // 调用 prompt 接口生成描述
                    const { streamPromptJSON } = await import('/src/services/modules/crud.js');

                    // 构建用于生成描述的 prompt
                    const fileInfoText = `文件路径：${fileKey}\n文件名称：${payload?.name || fileKey.split('/').pop()}\n\n文件内容：\n${fileContent.substring(0, 10000)}`; // 限制内容长度避免过长

                    // 调用 prompt 接口生成描述
                    const descriptionResponse = await streamPromptJSON(getPromptUrl(), {
                        module_name: 'services.ai.chat_service',
                        method_name: 'chat',
                        parameters: {
                            system: '请根据以下文件内容生成一个简洁的文件描述（不超过200字），描述应该概括文件的主要功能和用途。',
                            user: fileInfoText
                        }
                    });

                    // 提取生成的描述
                    let pageDescription = '';
                    if (typeof descriptionResponse === 'string') {
                        pageDescription = descriptionResponse;
                    } else if (descriptionResponse && descriptionResponse.data) {
                        if (Array.isArray(descriptionResponse.data) && descriptionResponse.data.length > 0) {
                            const firstItem = descriptionResponse.data[0];
                            pageDescription = typeof firstItem === 'string' ? firstItem : JSON.stringify(firstItem, null, 2);
                        } else if (typeof descriptionResponse.data === 'string') {
                            pageDescription = descriptionResponse.data;
                        }
                    }

                    // 如果描述为空，使用默认描述
                    if (!pageDescription || pageDescription.trim() === '') {
                        pageDescription = `文件：${payload?.name || fileKey}`;
                    }

                    // 生成 UUID 格式的会话 key
                    const generateUUID = () => {
                        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                            return crypto.randomUUID();
                        }
                        // 兜底方案：生成类似 UUID 的字符串
                        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                            const r = Math.random() * 16 | 0;
                            const v = c === 'x' ? r : (r & 0x3 | 0x8);
                            return v.toString(16);
                        });
                    };

                    const sessionKey = generateUUID();

                    // 获取当前时间戳
                    const now = Date.now();

                    // 生成唯一的随机 URL
                    const timestamp = Date.now();
                    const randomStr = Math.random().toString(36).substring(2, 11);
                    const uniqueUrl = `aicr-session://${timestamp}-${randomStr}`;

                    // 构建会话数据
                    const sessionData = {
                        key: sessionKey,
                        url: uniqueUrl,
                        title: fileKey, // 使用 fileKey 作为会话标题
                        pageTitle: fileKey,
                        pageDescription: pageDescription.trim(),
                        pageContent: fileContent, // 使用文件内容作为页面上下文
                        messages: [],
                        tags: [],
                        createdAt: now,
                        updatedAt: now,
                        lastAccessTime: now
                    };

                    // 调用会话保存接口
                    const payload = {
                        module_name: SERVICE_MODULE,
                        method_name: 'create_document',
                        parameters: {
                            cname: 'sessions',
                            data: sessionData
                        }
                    };
                    const saveResult = await postData(`${window.API_URL}/`, payload);

                    if (window.hideGlobalLoading) {
                        window.hideGlobalLoading();
                    }

                    if (saveResult && saveResult.success !== false) {
                        if (window.showSuccess) {
                            window.showSuccess(`已成功创建 YiPet 会话：${fileKey}`);
                        }
                        console.log('[创建会话] 会话创建成功:', saveResult);
                    } else {
                        throw new Error(saveResult?.message || '创建会话失败');
                    }
                } catch (error) {
                    if (window.hideGlobalLoading) {
                        window.hideGlobalLoading();
                    }
                    console.error('[创建会话] 创建会话失败:', error);
                    if (window.showError) {
                        window.showError(`创建会话失败：${error.message || '未知错误'}`);
                    }
                }
            }, '创建会话');
        },
        expandAllFolders,
        collapseAllFolders,
        toggleSidebar: handleToggleSidebar,
        // 项目/版本管理方法
        handleProjectChange,
        refreshData: handleRefreshData,
        // 搜索相关方法
        handleSearchInput,
        handleSearchChange,
        performSearch,
        searchInFileTree,
        searchInCode,
        clearSearchResults,
        clearSearch,
        handleMessageInput,
        handleCompositionStart,
        handleCompositionEnd,
        handleDownloadProjectVersion,
        handleUploadProjectVersion,
        triggerUploadProjectVersion,
        toggleBatchMode: toggleBatchMode,
        toggleFileSelection: toggleFileSelection,
        // 视图模式切换
        setViewMode: async (mode) => {
            return safeExecute(async () => {
                if (viewMode && (mode === 'tree' || mode === 'tags')) {
                    const previousMode = viewMode.value;
                    viewMode.value = mode;
                    console.log('[useMethods] 视图模式已切换:', previousMode, '->', mode);

                    // 在切换视图前，将 activeSession 的最新消息同步到 store.sessions
                    if (activeSession?.value && store.sessions?.value) {
                        const activeKey = String(activeSession.value.key || '');
                        if (activeKey) {
                            const activeMessages = activeSession.value.messages;
                            if (Array.isArray(activeMessages)) {
                                const sessionIndex = store.sessions.value.findIndex(s => {
                                    const sKey = String(s.key || s.id || '');
                                    return sKey === activeKey;
                                });
                                if (sessionIndex !== -1) {
                                    // 更新 store.sessions 中对应会话的 messages
                                    store.sessions.value[sessionIndex] = {
                                        ...store.sessions.value[sessionIndex],
                                        messages: activeMessages,
                                        updatedAt: activeSession.value.updatedAt || Date.now()
                                    };
                                    console.log('[useMethods] 已同步 activeSession 的消息到 store.sessions，消息数量:', activeMessages.length);
                                }
                            }
                        }
                    }

                    // 保存当前选中的文件Key（如果从文件视图切换到会话视图）
                    let pendingFileKey = null;
                    if (previousMode === 'tree' && mode === 'tags') {
                        if (selectedKey && selectedKey.value) {
                            pendingFileKey = selectedKey.value;
                            console.log('[useMethods] 保存当前选中的文件Key:', pendingFileKey);
                        }
                    }

                    // 保存当前选中的会话（如果从会话视图切换到文件视图）
                    let pendingSessionKey = null;
                    let pendingSessionMessages = null;
                    if (previousMode === 'tags' && mode === 'tree') {
                        // 优先使用 activeSession，否则使用 externalSelectedSessionKey
                        if (activeSession && activeSession.value) {
                            const sessionKey = activeSession.value.key;
                            if (sessionKey) {
                                pendingSessionKey = String(sessionKey);
                                // 保存当前的消息，以便后续使用
                                pendingSessionMessages = activeSession.value.messages;
                                console.log('[useMethods] 保存当前选中的会话Key:', pendingSessionKey, '消息数量:', pendingSessionMessages?.length || 0);
                            }
                        } else if (store.externalSelectedSessionKey && store.externalSelectedSessionKey.value) {
                            pendingSessionKey = String(store.externalSelectedSessionKey.value);
                            console.log('[useMethods] 保存当前选中的会话Key（从externalSelectedSessionKey）:', pendingSessionKey);
                        }
                    }

                    if (previousMode !== mode) {
                        try {
                            if (mode === 'tree' && typeof window.aicrApp?.abortSessionChatRequest === 'function') {
                                window.aicrApp.abortSessionChatRequest();
                            }
                        } catch (_) { }

                        // 只有在不是从会话视图切换到树形视图时才清空selectedKey
                        // 如果是从会话视图切换到树形视图，我们会在后面根据会话选中对应的文件
                        if (!(previousMode === 'tags' && mode === 'tree' && pendingSessionKey)) {
                            if (typeof setSelectedKey === 'function') {
                                setSelectedKey(null);
                            } else if (selectedKey) {
                                selectedKey.value = null;
                            }
                        }

                        // 只有在没有待处理的会话/文件时才清空会话状态
                        // 如果有待处理的会话/文件，保留当前状态以便后续同步
                        const hasPendingSync = (previousMode === 'tree' && mode === 'tags' && pendingFileKey) ||
                            (previousMode === 'tags' && mode === 'tree' && pendingSessionKey);
                        if (!hasPendingSync) {
                            if (activeSession) activeSession.value = null;
                            if (activeSessionError) activeSessionError.value = null;
                            if (activeSessionLoading) activeSessionLoading.value = false;
                            if (sessionChatInput) sessionChatInput.value = '';
                            if (sessionContextEditorVisible) sessionContextEditorVisible.value = false;
                            if (sessionContextDraft) sessionContextDraft.value = '';
                        }

                        window.dispatchEvent(new CustomEvent('clearCodeHighlight'));
                    }

                    // 如果切换到标签视图，自动加载会话数据
                    if (mode === 'tags') {
                        // 检查会话数据是否已存在，如果存在则不需要重新加载
                        const hasSessions = store.sessions && store.sessions.value && store.sessions.value.length > 0;

                        if (!hasSessions) {
                            console.log('[useMethods] 切换到标签视图，自动加载会话数据');

                            // 加载会话数据
                            if (loadSessions && typeof loadSessions === 'function') {
                                try {
                                    console.log('[useMethods] 开始加载会话数据...');
                                    await loadSessions(true);
                                    console.log('[useMethods] 会话数据加载完成');
                                } catch (error) {
                                    console.error('[useMethods] 加载会话数据失败:', error);
                                }
                            } else if (store.loadSessions && typeof store.loadSessions === 'function') {
                                try {
                                    console.log('[useMethods] 从 store 加载会话数据...');
                                    await store.loadSessions(true);
                                    console.log('[useMethods] 会话数据加载完成');
                                } catch (error) {
                                    console.error('[useMethods] 加载会话数据失败:', error);
                                }
                            }
                        } else {
                            console.log('[useMethods] 切换到标签视图，会话数据已存在，跳过加载');
                        }

                        // 如果有待处理的文件Key，尝试选中对应的会话
                        if (pendingFileKey) {
                            // 等待DOM更新完成
                            await new Promise(resolve => setTimeout(resolve, 100));

                            try {
                                // 从文件树中查找对应的sessionKey
                                const normalize = (v) => {
                                    if (!v) return '';
                                    let s = String(v).replace(/\\/g, '/');
                                    s = s.replace(/^\.\//, '');
                                    s = s.replace(/^\/+/, '');
                                    s = s.replace(/\/\/+/g, '/');
                                    return s;
                                };

                                const targetTreeKey = normalize(pendingFileKey);
                                let targetSessionKey = null;

                                // 在文件树中查找对应的sessionKey
                                const findSessionKeyByTreeKey = (nodes, treeKey) => {
                                    if (!nodes) return null;
                                    const stack = Array.isArray(nodes) ? [...nodes] : [nodes];
                                    while (stack.length > 0) {
                                        const n = stack.pop();
                                        if (!n) continue;
                                        const k = normalize(n.key || n.path || n.id || '');
                                        if (k && k === treeKey) {
                                            return n.sessionKey != null ? String(n.sessionKey) : null;
                                        }
                                        if (Array.isArray(n.children) && n.children.length > 0) {
                                            for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]);
                                        }
                                    }
                                    return null;
                                };

                                targetSessionKey = findSessionKeyByTreeKey(store.fileTree?.value, targetTreeKey);

                                if (targetSessionKey) {
                                    console.log('[useMethods] 找到对应的sessionKey:', targetSessionKey);

                                    // 在会话列表中查找对应的会话
                                    const sessions = store.sessions?.value || [];
                                    let targetSession = sessions.find(s => {
                                        const sessionKey = String(s.key || '');
                                        return sessionKey === targetSessionKey;
                                    });

                                    // 如果当前有 activeSession 且与目标会话相同，使用 activeSession 的 messages（保留最新聊天记录）
                                    if (targetSession && activeSession?.value) {
                                        const activeKey = String(activeSession.value.key || '');
                                        if (activeKey === targetSessionKey) {
                                            const activeMessages = activeSession.value.messages;
                                            if (Array.isArray(activeMessages) && activeMessages.length > 0) {
                                                console.log('[useMethods] 使用 activeSession 的最新 messages，数量:', activeMessages.length);
                                                targetSession = { ...targetSession, messages: activeMessages };
                                            }
                                        }
                                    }

                                    if (targetSession) {
                                        console.log('[useMethods] 找到对应的会话，准备选中并滚动:', targetSession.key);

                                        // 设置外部选中的会话Key（用于更新sessionList组件的选中状态）
                                        if (store.externalSelectedSessionKey) {
                                            store.externalSelectedSessionKey.value = targetSessionKey;
                                        }

                                        // 直接调用 selectSessionForChat 选择会话（确保调用 read-file 接口）
                                        await selectSessionForChat(targetSession, { toggleActive: false, openContextEditor: false });

                                        // 等待DOM更新后滚动到位置
                                        await new Promise(resolve => setTimeout(resolve, 200));

                                        // 滚动到对应的会话项
                                        const sessionKey = targetSession.key;
                                        const sessionItem = document.querySelector(`.session-item[data-key="${sessionKey}"], .session-item[data-session-key="${sessionKey}"]`);

                                        if (sessionItem) {
                                            // 滚动到会话项位置
                                            sessionItem.scrollIntoView({ behavior: 'smooth', block: 'center' });

                                            // 添加高亮效果
                                            sessionItem.classList.add('highlight-session');
                                            setTimeout(() => {
                                                sessionItem.classList.remove('highlight-session');
                                            }, 2000);

                                            console.log('[useMethods] 已滚动到会话位置:', sessionKey);
                                        } else {
                                            // 如果通过data-key没找到，尝试通过标题匹配（作为备选方案）
                                            console.warn('[useMethods] 未找到会话项，尝试通过标题匹配');
                                            const sessionItems = document.querySelectorAll('.session-item');
                                            for (const item of sessionItems) {
                                                const titleElement = item.querySelector('.session-title-text');
                                                if (titleElement && targetSession.pageTitle) {
                                                    const itemTitle = titleElement.textContent?.trim();
                                                    const targetTitle = targetSession.pageTitle?.trim();
                                                    if (itemTitle === targetTitle) {
                                                        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        item.classList.add('highlight-session');
                                                        setTimeout(() => {
                                                            item.classList.remove('highlight-session');
                                                        }, 2000);
                                                        console.log('[useMethods] 已滚动到会话位置（通过标题匹配）');
                                                        break;
                                                    }
                                                }
                                            }
                                        }

                                        // 清理外部选中的会话Key（延迟清理，确保组件已更新）
                                        setTimeout(() => {
                                            if (store.externalSelectedSessionKey) {
                                                store.externalSelectedSessionKey.value = null;
                                            }
                                        }, 1000);
                                    } else {
                                        console.warn('[useMethods] 未找到对应的会话，sessionKey:', targetSessionKey);
                                    }
                                } else {
                                    console.warn('[useMethods] 未找到对应的sessionKey，文件Key:', pendingFileKey);
                                }
                            } catch (error) {
                                console.error('[useMethods] 选中对应会话失败:', error);
                            }
                        }
                    }

                    // 如果切换到树形视图，尝试选中对应的文件
                    if (mode === 'tree' && pendingSessionKey) {
                        // 等待DOM更新完成
                        await new Promise(resolve => setTimeout(resolve, 100));

                        try {
                            // 在文件树中查找对应的文件节点
                            const findNodeBySessionKey = (nodes, targetSessionKey) => {
                                if (!nodes) return null;
                                const stack = Array.isArray(nodes) ? [...nodes] : [nodes];
                                while (stack.length > 0) {
                                    const n = stack.pop();
                                    if (!n) continue;
                                    if (n.type === 'file') {
                                        const nodeSessionKey = String(n.sessionKey || '');
                                        if (nodeSessionKey === targetSessionKey) {
                                            return n;
                                        }
                                    }
                                    if (Array.isArray(n.children) && n.children.length > 0) {
                                        for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]);
                                    }
                                }
                                return null;
                            };

                            const targetNode = findNodeBySessionKey(store.fileTree?.value, pendingSessionKey);

                            if (targetNode && targetNode.key) {
                                const targetFileKey = targetNode.key;
                                console.log('[useMethods] 找到对应的文件节点，准备选中并滚动:', targetFileKey);

                                // 展开所有父文件夹，确保文件可见
                                const expandParentFolders = (nodes, targetKey) => {
                                    if (!nodes) return false;
                                    const stack = Array.isArray(nodes) ? [...nodes] : [nodes];
                                    const path = [];

                                    const findPath = (nodeList, target, currentPath = []) => {
                                        for (const node of nodeList) {
                                            if (!node) continue;
                                            const nodeKey = node.key || '';

                                            if (node.type === 'file' && nodeKey === target) {
                                                return [...currentPath];
                                            }

                                            if (node.type === 'folder' && node.children) {
                                                const newPath = [...currentPath, nodeKey];
                                                const found = findPath(node.children, target, newPath);
                                                if (found) return found;
                                            }
                                        }
                                        return null;
                                    };

                                    const folderPath = findPath(stack, targetKey);
                                    if (folderPath && folderPath.length > 0) {
                                        folderPath.forEach(folderKey => {
                                            if (expandedFolders && !expandedFolders.value.has(folderKey)) {
                                                if (typeof toggleFolder === 'function') {
                                                    toggleFolder(folderKey);
                                                } else if (expandedFolders.value instanceof Set) {
                                                    expandedFolders.value.add(folderKey);
                                                }
                                            }
                                        });
                                    }
                                };

                                // 展开父文件夹
                                expandParentFolders(store.fileTree?.value, targetFileKey);

                                // 选中文件
                                if (typeof setSelectedKey === 'function') {
                                    setSelectedKey(targetFileKey);
                                } else if (selectedKey) {
                                    selectedKey.value = targetFileKey;
                                }

                                // 调用 loadFileByKey 确保 read-file 接口被调用
                                if (typeof loadFileByKey === 'function') {
                                    try {
                                        console.log('[useMethods] 调用 loadFileByKey 加载文件内容:', targetFileKey);
                                        await loadFileByKey(targetFileKey);
                                    } catch (error) {
                                        console.warn('[useMethods] loadFileByKey 调用失败:', error);
                                    }
                                }

                                // 等待DOM更新后滚动到位置
                                await new Promise(resolve => setTimeout(resolve, 300));

                                // 滚动到对应的文件项
                                const normalize = (v) => {
                                    if (!v) return '';
                                    let s = String(v).replace(/\\/g, '/');
                                    s = s.replace(/^\.\//, '');
                                    s = s.replace(/^\/+/, '');
                                    s = s.replace(/\/\/+/g, '/');
                                    return s;
                                };

                                const normalizedTargetKey = normalize(targetFileKey);

                                // 优先通过 data-key 属性查找
                                const fileItem = document.querySelector(`.file-tree-item.file-item[data-key="${targetFileKey}"], .file-tree-item.file-item[data-file-key="${targetFileKey}"]`);

                                if (fileItem) {
                                    // 滚动到文件项位置
                                    fileItem.scrollIntoView({ behavior: 'smooth', block: 'center' });

                                    // 添加高亮效果
                                    fileItem.classList.add('highlight-file');
                                    setTimeout(() => {
                                        fileItem.classList.remove('highlight-file');
                                    }, 2000);

                                    console.log('[useMethods] 已滚动到文件位置:', targetFileKey);
                                } else {
                                    // 如果通过data-key没找到，尝试通过文件名匹配（作为备选方案）
                                    console.warn('[useMethods] 未找到文件项，尝试通过文件名匹配');
                                    const fileItems = document.querySelectorAll('.file-tree-item.file-item');
                                    for (const item of fileItems) {
                                        const fileNameElement = item.querySelector('.file-name');
                                        if (fileNameElement) {
                                            const itemName = fileNameElement.textContent?.trim();
                                            const targetName = targetNode.name || targetFileKey.split('/').pop();
                                            if (itemName === targetName) {
                                                // 进一步验证：检查data-session-key是否匹配
                                                const itemSessionKey = item.getAttribute('data-session-key');
                                                if (!itemSessionKey || itemSessionKey === pendingSessionKey) {
                                                    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    item.classList.add('highlight-file');
                                                    setTimeout(() => {
                                                        item.classList.remove('highlight-file');
                                                    }, 2000);
                                                    console.log('[useMethods] 已滚动到文件位置（通过文件名匹配）:', targetFileKey);
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                console.warn('[useMethods] 未找到对应的文件节点，sessionKey:', pendingSessionKey);
                            }
                        } catch (error) {
                            console.error('[useMethods] 选中对应文件失败:', error);
                        }
                    }

                    setTimeout(() => {
                        try {
                            const sidebar = document.querySelector('.aicr-sidebar');
                            if (!sidebar) return;
                            if (mode === 'tags') {
                                const w = store.sessionSidebarWidth?.value;
                                if (typeof w === 'number' && w > 0) sidebar.style.width = `${w}px`;
                            } else {
                                const w = store.sidebarWidth?.value;
                                if (typeof w === 'number' && w > 0) sidebar.style.width = `${w}px`;
                            }
                        } catch (_) { }
                    }, 0);
                }
            }, '视图模式切换');
        },

        // 从会话视图返回文件树视图
        handleSessionViewBack: () => {
            return safeExecute(() => {
                console.log('[useMethods] 从会话视图返回文件树视图');
                try {
                    if (typeof window.aicrApp?.abortSessionChatRequest === 'function') {
                        window.aicrApp.abortSessionChatRequest();
                    }
                } catch (_) { }
                if (viewMode) {
                    viewMode.value = 'tree';
                }

                if (typeof setSelectedKey === 'function') {
                    setSelectedKey(null);
                } else if (selectedKey) {
                    selectedKey.value = null;
                }

                if (activeSession) activeSession.value = null;
                if (activeSessionError) activeSessionError.value = null;
                if (activeSessionLoading) activeSessionLoading.value = false;
                if (sessionChatInput) sessionChatInput.value = '';
                if (sessionContextEditorVisible) sessionContextEditorVisible.value = false;
                if (sessionContextDraft) sessionContextDraft.value = '';

                window.dispatchEvent(new CustomEvent('clearCodeHighlight'));

                setTimeout(() => {
                    try {
                        const sidebar = document.querySelector('.aicr-sidebar');
                        const w = store.sidebarWidth?.value;
                        if (sidebar && typeof w === 'number' && w > 0) sidebar.style.width = `${w}px`;
                    } catch (_) { }
                }, 0);
            }, '返回文件树视图');
        },

        // 切换会话批量选择模式
        toggleSessionBatchMode: () => {
            return safeExecute(() => {
                if (sessionBatchMode) {
                    sessionBatchMode.value = !sessionBatchMode.value;
                    if (!sessionBatchMode.value && selectedSessionKeys) {
                        selectedSessionKeys.value.clear();
                    }
                    console.log('[useMethods] 会话批量选择模式:', sessionBatchMode.value);
                }
            }, '切换会话批量选择模式');
        },

        // 切换会话选择状态（批量选择）
        toggleSessionSelection: (sessionKey) => {
            return safeExecute(() => {
                if (!selectedSessionKeys || !selectedSessionKeys.value) {
                    console.warn('[useMethods] selectedSessionKeys 未初始化');
                    return;
                }

                if (selectedSessionKeys.value.has(sessionKey)) {
                    selectedSessionKeys.value.delete(sessionKey);
                } else {
                    selectedSessionKeys.value.add(sessionKey);
                }
                console.log('[useMethods] 会话选择状态已切换:', sessionKey, '选中数量:', selectedSessionKeys.value.size);
            }, '切换会话选择状态');
        },

        // 全选/取消全选会话
        toggleSelectAllSessions: (ids, isSelect) => {
            return safeExecute(() => {
                if (!store.sessions || !store.sessions.value || !Array.isArray(store.sessions.value)) {
                    console.warn('[useMethods] 会话列表为空');
                    return;
                }

                if (!selectedSessionKeys || !selectedSessionKeys.value) {
                    console.warn('[useMethods] selectedSessionKeys 未初始化');
                    return;
                }

                // 如果传入了 ids，使用 ids，否则使用所有会话
                let targetSessions = [];
                if (ids && Array.isArray(ids) && ids.length > 0) {
                    targetSessions = store.sessions.value.filter(s => ids.includes(s.key));
                } else {
                    targetSessions = store.sessions.value;
                }

                if (targetSessions.length === 0) {
                    return;
                }

                // 如果 explicit isSelect provided, use it
                // If not provided (undefined), toggle based on current state (legacy behavior)
                let shouldSelect = isSelect;

                if (typeof shouldSelect !== 'boolean') {
                    // Legacy toggle logic
                    const allSelected = targetSessions.every(session => selectedSessionKeys.value.has(session.key));
                    shouldSelect = !allSelected;
                }

                if (shouldSelect) {
                    // 全选
                    targetSessions.forEach(session => {
                        selectedSessionKeys.value.add(session.key);
                    });
                    console.log('[useMethods] 已全选，选中数量:', targetSessions.length);
                } else {
                    // 取消全选
                    targetSessions.forEach(session => {
                        selectedSessionKeys.value.delete(session.key);
                    });
                    console.log('[useMethods] 已取消全选，取消数量:', targetSessions.length);
                }
            }, '全选/取消全选会话');
        },

        // 处理会话导入（触发文件选择对话框）
        handleSessionImport: () => {
            return safeExecute(() => {
                // 直接查找文件输入框并触发点击
                const importInput = document.querySelector('input[type="file"][accept=".json,.zip"]');
                if (importInput) {
                    importInput.click();
                } else {
                    console.warn('[useMethods] 未找到导入文件输入框');
                    // 尝试通过 ref 查找
                    if (window.aicrApp && window.aicrApp.$refs && window.aicrApp.$refs.sessionImportInput) {
                        window.aicrApp.$refs.sessionImportInput.click();
                    }
                }
            }, '触发会话导入');
        },

        // 处理会话导入文件
        handleSessionImportFile: async (event) => {
            return safeExecuteAsync(async () => {
                const file = event.target?.files?.[0];
                if (!file) {
                    console.warn('[useMethods] 未选择文件');
                    return;
                }

                console.log('[useMethods] 导入会话文件:', file.name);

                const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/loading.js');
                showGlobalLoading('正在导入会话...');

                try {
                    const fileContent = await file.text();
                    let sessionsData = [];

                    // 解析文件内容
                    if (file.name.endsWith('.json')) {
                        sessionsData = JSON.parse(fileContent);
                        if (!Array.isArray(sessionsData)) {
                            sessionsData = [sessionsData];
                        }
                    } else if (file.name.endsWith('.zip')) {
                        // 处理 ZIP 文件
                        const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')).default || window.JSZip;
                        const zip = await JSZip.loadAsync(file);
                        const fileNames = Object.keys(zip.files);

                        for (const fileName of fileNames) {
                            if (fileName.endsWith('.json')) {
                                const content = await zip.files[fileName].async('string');
                                const data = JSON.parse(content);
                                if (Array.isArray(data)) {
                                    sessionsData.push(...data);
                                } else {
                                    sessionsData.push(data);
                                }
                            }
                        }
                    }

                    console.log('[useMethods] 导入会话');

                    // 导入会话到服务器
                    const { postData } = await import('/src/services/index.js');
                    let successCount = 0;
                    let failCount = 0;

                    // 从文件路径提取标签的辅助函数（与 sessionSyncService 保持一致）
                    const extractTagsFromPath = (filePath) => {
                        if (!filePath) return [];
                        const parts = filePath.split('/').filter(p => p && p.trim());
                        if (parts.length <= 1) return [];
                        // 移除文件名，只保留目录路径作为标签
                        const dirs = parts.slice(0, -1);
                        return dirs;
                    };

                    for (const session of sessionsData) {
                        try {
                            // 确保 tags 字段存在且为数组
                            if (!session.tags || !Array.isArray(session.tags)) {
                                session.tags = [];
                            }

                            // 规范化标签：去除空值和无效值，trim处理
                            session.tags = session.tags
                                .map(tag => (typeof tag === 'string' ? tag.trim() : String(tag || '').trim()))
                                .filter(tag => tag.length > 0);

                            // 如果标签为空，尝试从 pageDescription 中提取路径并生成标签
                            if (session.tags.length === 0 && session.pageDescription) {
                                const pathMatch = session.pageDescription.match(/文件[：:]\s*(.+)/);
                                if (pathMatch && pathMatch[1]) {
                                    const filePath = pathMatch[1].trim();
                                    const extractedTags = extractTagsFromPath(filePath);

                                    // 如果从路径提取到标签，使用这些标签
                                    if (extractedTags.length > 0) {
                                        session.tags = extractedTags;
                                        console.log('[useMethods] 从 pageDescription 提取标签:', session.key, extractedTags);
                                    }

                                }
                                // 无法从 pageDescription 提取路径，标签保持为空
                            }

                            // 确保 "knowledge" 标签是第一个标签
                            const knowledgeTag = 'knowledge';
                            // 移除所有已存在的 knowledge 标签（无论位置）
                            session.tags = session.tags.filter(tag => tag !== knowledgeTag);
                            // 在开头添加 knowledge 标签
                            session.tags.unshift(knowledgeTag);

                            // 确保 tags 数组被正确设置（防止被覆盖）
                            if (!Array.isArray(session.tags) || session.tags.length === 0 || session.tags[0] !== knowledgeTag) {
                                console.warn('[useMethods] 标签数组异常，重新设置:', session.key, session.tags);
                                session.tags = [knowledgeTag, ...session.tags.filter(tag => tag !== knowledgeTag)];
                            }

                            console.log('[useMethods] 确保 knowledge 标签在第一个位置:', session.key, session.tags);

                            // 确保保存时包含完整的 tags 数组
                            const sessionToSave = {
                                ...session,
                                tags: session.tags // 明确设置 tags 字段
                            };

                            // 检查会话是否存在
                            const checkUrl = buildServiceUrl('query_documents', {
                                cname: 'sessions',
                                filter: { id: sessionToSave.key },
                                limit: 1
                            });
                            const checkResp = await getData(checkUrl, {}, false);
                            const existingItem = checkResp?.data?.list?.[0];

                            let savePayload;
                            if (existingItem) {
                                savePayload = {
                                    module_name: SERVICE_MODULE,
                                    method_name: 'update_document',
                                    parameters: {
                                        cname: 'sessions',
                                        id: existingItem.id,
                                        data: sessionToSave
                                    }
                                };
                            } else {
                                savePayload = {
                                    module_name: SERVICE_MODULE,
                                    method_name: 'create_document',
                                    parameters: {
                                        cname: 'sessions',
                                        data: sessionToSave
                                    }
                                };
                            }

                            await postData(`${window.API_URL}/`, savePayload);
                            successCount++;
                        } catch (error) {
                            console.error('[useMethods] 导入会话失败:', session.key, error);
                            failCount++;
                        }
                    }

                    // 刷新会话列表
                    if (loadSessions && typeof loadSessions === 'function') {
                        await loadSessions(true);
                    }

                    hideGlobalLoading();

                    if (window.showSuccess) {
                        window.showSuccess(`导入完成：成功 ${successCount} 个，失败 ${failCount} 个`);
                    }
                } catch (error) {
                    hideGlobalLoading();
                    console.error('[useMethods] 导入会话文件失败:', error);
                    if (window.showError) {
                        window.showError(`导入失败：${error.message || '未知错误'}`);
                    }
                }
            }, '处理会话导入文件');
        },

        // 处理会话导出
        handleSessionExport: async () => {
            return safeExecuteAsync(async () => {
                if (!store.sessions || !store.sessions.value || store.sessions.value.length === 0) {
                    console.warn('[useMethods] 没有可导出的会话');
                    if (window.showError) {
                        window.showError('没有可导出的会话');
                    }
                    return;
                }

                console.log('[useMethods] 导出会话，数量:', store.sessions.value.length);

                const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/loading.js');
                showGlobalLoading('正在导出会话...');

                try {
                    // 确定要导出的会话
                    let sessionsToExport = [];
                    if (sessionBatchMode && sessionBatchMode.value && selectedSessionKeys && selectedSessionKeys.value.size > 0) {
                        // 批量导出选中的会话
                        sessionsToExport = store.sessions.value.filter(s => selectedSessionKeys.value.has(s.key));
                    } else {
                        // 导出所有会话
                        sessionsToExport = store.sessions.value;
                    }

                    if (sessionsToExport.length === 0) {
                        hideGlobalLoading();
                        if (window.showError) {
                            window.showError('请先选择要导出的会话');
                        }
                        return;
                    }

                    // 生成导出数据
                    const exportData = {
                        version: '1.0',
                        exportTime: new Date().toISOString(),
                        count: sessionsToExport.length,
                        sessions: sessionsToExport
                    };

                    // 创建 JSON 文件并下载
                    const jsonStr = JSON.stringify(exportData, null, 2);
                    const blob = new Blob([jsonStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `sessions_export_${new Date().toISOString().slice(0, 10)}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    hideGlobalLoading();

                    if (window.showSuccess) {
                        window.showSuccess(`成功导出 ${sessionsToExport.length} 个会话`);
                    }
                } catch (error) {
                    hideGlobalLoading();
                    console.error('[useMethods] 导出会话失败:', error);
                    if (window.showError) {
                        window.showError(`导出失败：${error.message || '未知错误'}`);
                    }
                }
            }, '处理会话导出');
        },

        // 批量删除会话（参考 YiPet 的实现）
        handleBatchDeleteSessions: async () => {
            return safeExecuteAsync(async () => {
                if (!selectedSessionKeys || !selectedSessionKeys.value || selectedSessionKeys.value.size === 0) {
                    if (window.showError) {
                        window.showError('请先选择要删除的会话');
                    }
                    return;
                }

                // 检查并过滤掉树文件类型的会话
                const sessionKeys = Array.from(selectedSessionKeys.value);
                const treeFileSessionKeys = [];
                const allowedSessionKeys = [];

                // 从会话列表中检查每个会话
                if (store.sessions && store.sessions.value && Array.isArray(store.sessions.value)) {
                    for (const sessionKey of sessionKeys) {
                        const session = store.sessions.value.find(s => s && s.key === sessionKey);
                        if (session && session.url && String(session.url).startsWith('aicr-session://')) {
                            treeFileSessionKeys.push(sessionKey);
                        } else {
                            allowedSessionKeys.push(sessionKey);
                        }
                    }
                } else {
                    // 如果无法从列表获取，尝试获取完整会话信息
                    const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
                    const sessionSync = getSessionSyncService();
                    for (const sessionKey of sessionKeys) {
                        try {
                            const session = await sessionSync.getSession(sessionKey);
                            if (session && session.url && String(session.url).startsWith('aicr-session://')) {
                                treeFileSessionKeys.push(sessionKey);
                            } else {
                                allowedSessionKeys.push(sessionKey);
                            }
                        } catch (e) {
                            // 获取失败，允许删除（可能是其他类型的会话）
                            allowedSessionKeys.push(sessionKey);
                        }
                    }
                }

                // 如果有树文件类型的会话，提示用户
                if (treeFileSessionKeys.length > 0) {
                    if (window.showError) {
                        window.showError(`不允许在会话视图删除树文件类型的会话（已过滤 ${treeFileSessionKeys.length} 个）`);
                    }
                    // 从选中列表中移除树文件类型的会话
                    for (const treeSessionKey of treeFileSessionKeys) {
                        if (selectedSessionKeys && selectedSessionKeys.value) {
                            selectedSessionKeys.value.delete(treeSessionKey);
                        }
                    }
                    // 如果没有可删除的会话，直接返回
                    if (allowedSessionKeys.length === 0) {
                        return;
                    }
                }

                const count = allowedSessionKeys.length;
                const confirmMessage = `确定要删除选中的 ${count} 个会话吗？此操作不可撤销。`;
                if (!confirm(confirmMessage)) {
                    return;
                }

                const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/loading.js');
                showGlobalLoading(`正在删除 ${count} 个会话...`);

                try {
                    // 使用标准服务接口逐个删除（只删除允许删除的会话）
                    let deletedCount = 0;
                    let failedCount = 0;

                    // 获取 SessionSyncService 实例
                    let sessionSync;
                    try {
                        const { getSessionSyncService } = await import('/src/views/aicr/services/sessionSyncService.js');
                        sessionSync = getSessionSyncService();
                    } catch (e) {
                        console.error('[useMethods] 无法加载 SessionSyncService:', e);
                        throw new Error('服务加载失败');
                    }

                    for (const skey of allowedSessionKeys) {
                        try {
                            // 直接使用 sessionKey 调用 deleteSession，确保与 session.key 一致
                            await sessionSync.deleteSession(skey);
                            deletedCount++;
                        } catch (e) {
                            console.error(`[useMethods] 删除会话失败: ${skey}`, e);
                            failedCount++;
                        }
                    }

                    if (deletedCount > 0) {
                        // 清空选中状态
                        if (selectedSessionKeys) {
                            selectedSessionKeys.value.clear();
                        }

                        // 退出批量模式
                        if (sessionBatchMode) {
                            sessionBatchMode.value = false;
                        }

                        // 刷新会话列表
                        if (loadSessions && typeof loadSessions === 'function') {
                            await loadSessions(true);
                        } else if (store && store.loadSessions && typeof store.loadSessions === 'function') {
                            await store.loadSessions(true);
                        }

                        hideGlobalLoading();

                        if (window.showSuccess) {
                            let successMessage = `已成功删除 ${deletedCount} 个会话`;
                            if (treeFileSessionKeys.length > 0) {
                                successMessage += `（已跳过 ${treeFileSessionKeys.length} 个树文件类型的会话）`;
                            }
                            if (failedCount > 0) {
                                successMessage += `，其中 ${failedCount} 个删除失败`;
                            }
                            window.showSuccess(successMessage);
                        }
                    } else {
                        throw new Error('批量删除失败');
                    }
                } catch (error) {
                    hideGlobalLoading();
                    console.error('[useMethods] 批量删除会话失败:', error);
                    if (window.showError) {
                        window.showError(`批量删除失败：${error.message || '未知错误'}`);
                    }
                }
            }, '批量删除会话');
        },

        /**
         * 处理复制为Prompt
         * @param {Object} payload - 文件信息
         */
        handleCopyAsPrompt: async (payload) => {
            return safeExecute(async () => {
                const { key, name, path, type } = payload;
                console.log('[handleCopyAsPrompt] Processing:', payload);

                // 如果是文件夹，目前暂不支持或仅提示
                if (type === 'folder') {
                    if (window.showSuccess) {
                        window.showSuccess('文件夹暂不支持直接复制为Prompt，请选择具体文件');
                    }
                    return;
                }

                // 尝试获取文件内容
                let content = '';
                // 检查缓存
                if (files && files.value && files.value[key] && files.value[key].content) {
                    content = files.value[key].content;
                } else {
                    // 加载文件
                    await loadFileByKey(key);
                    if (files && files.value && files.value[key]) {
                        content = files.value[key].content;
                    }
                }

                if (!content) {
                    throw createError(`无法获取文件 ${name} 的内容`, ErrorTypes.VALIDATION, '复制为Prompt');
                }

                // 格式化为Prompt
                // 使用简单的 XML 格式 <file path="...">...</file>
                const promptText = `<file path="${path}">\n${content}\n</file>`;

                // 写入剪贴板
                await navigator.clipboard.writeText(promptText);

                if (window.showSuccess) {
                    window.showSuccess(`${name} 已复制为 Prompt`);
                }
            }, '复制为Prompt');
        },

        // 切换批量选择模式
        toggleSessionBatchMode: () => {
            return safeExecute(() => {
                if (store.sessionBatchMode) {
                    store.sessionBatchMode.value = !store.sessionBatchMode.value;
                    if (!store.sessionBatchMode.value && store.selectedSessionKeys) {
                        store.selectedSessionKeys.value.clear();
                    }
                }
            }, '切换批量选择模式');
        },

        // 导出会话
        handleSessionExport: async () => {
            return safeExecute(async () => {
                if (!store.sessions || !store.sessions.value || store.sessions.value.length === 0) {
                    alert('没有可导出的会话');
                    return;
                }

                try {
                    const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/loading.js');
                    showGlobalLoading('正在导出会话...');

                    const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')).default || window.JSZip || (await import('jszip')).default;
                    const zip = new JSZip();

                    // 导出所有会话为 JSON 文件
                    store.sessions.value.forEach(session => {
                        let fileName = session.title || session.pageTitle || 'Untitled';
                        fileName = fileName.replace(/[\\/:*?"<>|]/g, '_'); // 替换非法字符
                        const content = JSON.stringify(session, null, 2);
                        zip.file(`${fileName}.json`, content);
                    });

                    const content = await zip.generateAsync({ type: 'blob' });
                    const url = URL.createObjectURL(content);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `sessions_export_${new Date().toISOString().slice(0, 10)}.zip`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);

                    hideGlobalLoading();
                    if (window.showSuccess) window.showSuccess('导出成功');
                } catch (error) {
                    console.error('导出失败:', error);
                    // hideGlobalLoading();
                    alert('导出失败: ' + error.message);
                }
            }, '导出会话');
        },

        // 导入会话文件
        handleSessionImportFile: async (event) => {
            return safeExecute(async () => {
                const file = event.target.files[0];
                if (!file) return;

                try {
                    const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/loading.js');
                    showGlobalLoading('正在导入会话...');

                    const sessionSync = (await import('/src/views/aicr/services/sessionSyncService.js')).getSessionSyncService();

                    if (file.name.endsWith('.json')) {
                        const text = await file.text();
                        const sessionData = JSON.parse(text);

                        await sessionSync.syncFileToSession({
                            name: file.name,
                            content: JSON.stringify(sessionData),
                            type: 'file'
                        }, false, true); // isUpdate=false, isImport=true
                    } else if (file.name.endsWith('.zip')) {
                        const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')).default || window.JSZip || (await import('jszip')).default;
                        const zip = await JSZip.loadAsync(file);

                        const promises = [];
                        zip.forEach((relativePath, zipEntry) => {
                            if (!zipEntry.dir && zipEntry.name.endsWith('.json')) {
                                promises.push(async () => {
                                    const text = await zipEntry.async('string');
                                    try {
                                        // verify json
                                        JSON.parse(text);
                                        await sessionSync.syncFileToSession({
                                            name: zipEntry.name.split('/').pop(),
                                            content: text,
                                            type: 'file'
                                        }, false, true);
                                    } catch (e) {
                                        console.warn('Skipping invalid JSON:', zipEntry.name);
                                    }
                                });
                            }
                        });

                        await Promise.all(promises.map(p => p()));
                    }

                    if (store.loadSessions) {
                        await store.loadSessions(true);
                    }
                    hideGlobalLoading();
                    if (window.showSuccess) window.showSuccess('导入成功');
                } catch (e) {
                    console.error(e);
                    alert('导入失败: ' + e.message);
                }
            }, '导入会话文件');
        },

        // 标签管理
        openTagManager,
        closeTagManager
    };

    /**
     * 标签管理相关函数（参考 YiPet 的实现）
     */

    function getTagManagerStore(modal, store) {
        return store || modal?._store || window.aicrStore || (window.app && window.app._instance && window.app._instance.setupState);
    }

    function findSessionBySessionKey(store, sessionKey) {
        const normalizedSessionKey = sessionKey == null ? '' : String(sessionKey);
        const sessions = store?.sessions?.value || [];
        return sessions.find(s => {
            if (!s) return false;
            const key = s.key == null ? '' : String(s.key);
            return key === normalizedSessionKey;
        });
    }

    // 打开标签管理弹窗
    async function openTagManager(sessionKey, session, store) {
        if (!sessionKey || !session) {
            console.warn('会话不存在，无法管理标签:', sessionKey);
            return;
        }

        // 创建标签副本，避免直接修改 session.tags
        const currentTags = [...(session.tags || [])];

        // 创建标签管理弹窗
        ensureTagManagerUi();
        const modal = document.querySelector('#aicr-tag-manager');
        if (!modal) {
            console.error('标签管理弹窗未找到');
            return;
        }

        modal._store = store;
        modal._currentTags = currentTags;

        // 显示弹窗
        modal.style.display = 'flex';
        modal.dataset.sessionKey = sessionKey;

        // 加载当前标签
        loadTagsIntoManager(sessionKey, currentTags, modal);

        // 添加关闭事件
        const closeBtn = modal.querySelector('.tag-manager-close');
        if (closeBtn) {
            closeBtn.onclick = () => closeTagManager(sessionKey, store);
        }

        // 添加保存事件
        const saveBtn = modal.querySelector('.tag-manager-save');
        if (saveBtn) {
            saveBtn.onclick = () => saveTags(sessionKey, store);
        }

        // 添加输入框回车事件（兼容中文输入法）
        const tagInput = modal.querySelector('.tag-manager-input');
        if (tagInput) {
            // 确保输入法组合状态已初始化
            if (tagInput._isComposing === undefined) {
                tagInput._isComposing = false;
                tagInput.addEventListener('compositionstart', () => {
                    tagInput._isComposing = true;
                });
                tagInput.addEventListener('compositionend', () => {
                    tagInput._isComposing = false;
                });
            }

            // 添加回车键事件处理
            const existingHandler = tagInput._enterKeyHandler;
            if (existingHandler) {
                tagInput.removeEventListener('keydown', existingHandler);
            }

            const enterKeyHandler = (e) => {
                // 如果在输入法组合过程中，忽略回车键
                if (tagInput._isComposing) {
                    return;
                }

                if (e.key === 'Enter') {
                    e.preventDefault();
                    addTagFromInput(sessionKey, modal, store);
                }
            };

            tagInput._enterKeyHandler = enterKeyHandler;
            tagInput.addEventListener('keydown', enterKeyHandler);

            tagInput.focus();
        }

        // ESC 键关闭
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeTagManager(sessionKey, store);
            }
        };

        // 移除旧的监听器（如果有）
        if (modal._escHandler) {
            document.removeEventListener('keydown', modal._escHandler);
        }

        modal._escHandler = escHandler;
        document.addEventListener('keydown', escHandler);
    }

    // 确保标签管理UI存在
    function ensureTagManagerUi() {
        if (document.querySelector('#aicr-tag-manager')) return;

        const modal = document.createElement('div');
        modal.id = 'aicr-tag-manager';
        modal.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: rgba(0, 0, 0, 0.75) !important;
        backdrop-filter: blur(8px) !important;
        display: none !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 10000 !important;
    `;

        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                const sessionKey = modal.dataset.sessionKey;
                if (sessionKey) {
                    const store = getTagManagerStore(modal);
                    closeTagManager(sessionKey, store);
                }
            }
        });

        const panel = document.createElement('div');
        panel.style.cssText = `
        background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%) !important;
        border-radius: 24px !important;
        padding: 32px !important;
        width: 90% !important;
        max-width: 640px !important;
        max-height: 85vh !important;
        overflow-y: auto !important;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08) inset !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        backdrop-filter: blur(20px) !important;
        color: #f8fafc !important;
    `;

        // 标题
        const header = document.createElement('div');
        header.style.cssText = `
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        margin-bottom: 24px !important;
        padding-bottom: 16px !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
    `;

        const title = document.createElement('h3');
        title.textContent = '管理标签';
        title.style.cssText = `
        margin: 0 !important;
        font-size: 18px !important;
        font-weight: 600 !important;
        color: #f8fafc !important;
        letter-spacing: -0.01em !important;
    `;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'tag-manager-close';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>'; // 使用 FontAwesome 图标
        if (!closeBtn.querySelector('i')) closeBtn.innerHTML = '✕'; // Fallback

        closeBtn.style.cssText = `
        background: transparent !important;
        border: none !important;
        font-size: 16px !important;
        cursor: pointer !important;
        color: #94a3b8 !important;
        padding: 8px !important;
        width: 32px !important;
        height: 32px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 50% !important;
        transition: all 0.2s ease !important;
    `;
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            closeBtn.style.color = '#f8fafc';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'transparent';
            closeBtn.style.color = '#94a3b8';
        });

        header.appendChild(title);
        header.appendChild(closeBtn);

        // 输入区域
        const inputGroup = document.createElement('div');
        inputGroup.className = 'tag-manager-input-group';
        inputGroup.style.cssText = `
        display: flex !important;
        gap: 12px !important;
        margin-bottom: 24px !important;
    `;

        const tagInput = document.createElement('input');
        tagInput.className = 'tag-manager-input';
        tagInput.type = 'text';
        tagInput.placeholder = '输入标签名称，按回车添加';
        tagInput.style.cssText = `
        flex: 1 !important;
        padding: 12px 16px !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 12px !important;
        font-size: 14px !important;
        outline: none !important;
        background: rgba(15, 23, 42, 0.6) !important;
        color: #f8fafc !important;
        transition: all 0.2s ease !important;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2) !important;
    `;

        tagInput._isComposing = false;
        tagInput.addEventListener('compositionstart', () => {
            tagInput._isComposing = true;
        });
        tagInput.addEventListener('compositionend', () => {
            tagInput._isComposing = false;
        });

        tagInput.addEventListener('focus', () => {
            tagInput.style.borderColor = '#6366f1';
            tagInput.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.25)';
            tagInput.style.background = 'rgba(15, 23, 42, 0.8) !important';
        });
        tagInput.addEventListener('blur', () => {
            tagInput.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            tagInput.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.2)';
            tagInput.style.background = 'rgba(15, 23, 42, 0.6) !important';
        });

        const addBtn = document.createElement('button');
        addBtn.textContent = '添加';
        addBtn.style.cssText = `
        padding: 12px 24px !important;
        background: #4f46e5 !important;
        color: white !important;
        border: none !important;
        border-radius: 12px !important;
        cursor: pointer !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        transition: all 0.2s ease !important;
        box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.1), 0 2px 4px -1px rgba(79, 70, 229, 0.06) !important;
    `;
        addBtn.addEventListener('mouseenter', () => {
            addBtn.style.background = '#4338ca';
            addBtn.style.transform = 'translateY(-1px)';
        });
        addBtn.addEventListener('mouseleave', () => {
            addBtn.style.background = '#4f46e5';
            addBtn.style.transform = 'translateY(0)';
        });
        addBtn.addEventListener('click', () => {
            const sessionKey = modal.dataset.sessionKey;
            if (sessionKey) {
                const store = getTagManagerStore(modal);
                addTagFromInput(sessionKey, modal, store);
            }
        });

        // 智能生成标签按钮
        const smartGenerateBtn = document.createElement('button');
        smartGenerateBtn.className = 'tag-manager-smart-generate';
        smartGenerateBtn.textContent = '✨ 智能生成';
        smartGenerateBtn.style.cssText = `
        padding: 12px 24px !important;
        background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%) !important;
        color: white !important;
        border: none !important;
        border-radius: 12px !important;
        cursor: pointer !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        transition: all 0.3s ease !important;
        white-space: nowrap !important;
        box-shadow: 0 4px 6px -1px rgba(139, 92, 246, 0.2), 0 2px 4px -1px rgba(139, 92, 246, 0.1) !important;
    `;
        smartGenerateBtn.addEventListener('mouseenter', () => {
            if (!smartGenerateBtn.disabled) {
                smartGenerateBtn.style.filter = 'brightness(1.1)';
                smartGenerateBtn.style.transform = 'translateY(-1px)';
                smartGenerateBtn.style.boxShadow = '0 10px 15px -3px rgba(139, 92, 246, 0.3), 0 4px 6px -2px rgba(139, 92, 246, 0.1) !important';
            }
        });
        smartGenerateBtn.addEventListener('mouseleave', () => {
            if (!smartGenerateBtn.disabled) {
                smartGenerateBtn.style.filter = 'brightness(1)';
                smartGenerateBtn.style.transform = 'translateY(0)';
                smartGenerateBtn.style.boxShadow = '0 4px 6px -1px rgba(139, 92, 246, 0.2), 0 2px 4px -1px rgba(139, 92, 246, 0.1) !important';
            }
        });
        smartGenerateBtn.addEventListener('click', () => {
            const sessionKey = modal.dataset.sessionKey;
            if (sessionKey) {
                const store = getTagManagerStore(modal);
                generateSmartTags(sessionKey, smartGenerateBtn, modal, store);
            }
        });

        inputGroup.appendChild(tagInput);
        inputGroup.appendChild(addBtn);
        inputGroup.appendChild(smartGenerateBtn);

        // 快捷标签按钮容器（参考 tags-list 样式）
        const quickTagsContainer = document.createElement('div');
        quickTagsContainer.className = 'tag-manager-quick-tags';
        quickTagsContainer.style.cssText = `
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
        margin-bottom: 24px !important;
    `;

        // 获取所有标签（与标签筛选模块保持一致）
        const getAllTags = () => {
            const store = getTagManagerStore(modal);
            const sessions = store?.sessions?.value || [];

            // 提取所有标签
            const tagSet = new Set();
            sessions.forEach(session => {
                if (session && session.tags && Array.isArray(session.tags)) {
                    session.tags.forEach(tag => {
                        if (tag && tag.trim()) {
                            tagSet.add(tag.trim());
                        }
                    });
                }
            });

            // 按字母顺序排序
            const allTagsArray = Array.from(tagSet);
            allTagsArray.sort();

            const defaultOrder = allTagsArray;

            // 应用保存的标签顺序（从 localStorage）
            try {
                const saved = localStorage.getItem('aicr_tag_order');
                const savedOrder = saved ? JSON.parse(saved) : null;
                if (savedOrder && Array.isArray(savedOrder) && savedOrder.length > 0) {
                    // 使用保存的顺序，但只包含当前存在的标签
                    const orderedTags = savedOrder.filter(tag => tagSet.has(tag));
                    // 添加新标签（不在保存顺序中的）到末尾，按字母顺序
                    const newTags = allTagsArray.filter(tag => !savedOrder.includes(tag));
                    return [...orderedTags, ...newTags];
                }
            } catch (e) {
                console.warn('[标签管理] 加载标签顺序失败:', e);
            }

            return defaultOrder;
        };

        // 获取所有标签
        const quickTags = getAllTags();

        // 如果没有标签，显示提示
        if (quickTags.length === 0) {
            const emptyHint = document.createElement('div');
            emptyHint.textContent = '暂无可用标签';
            emptyHint.style.cssText = `
            width: 100% !important;
            text-align: center !important;
            color: #94a3b8 !important;
            padding: 12px !important;
            font-size: 13px !important;
            font-weight: 500 !important;
        `;
            quickTagsContainer.appendChild(emptyHint);
        } else {
            // 获取当前会话的标签（用于判断快捷标签是否已添加）
            const sessionKey = modal.dataset.sessionKey;
            const store = getTagManagerStore(modal);
            const session = findSessionBySessionKey(store, sessionKey);
            const currentTags = session?.tags || [];

            quickTags.forEach(tagName => {
                const isAdded = currentTags && currentTags.includes(tagName);
                const quickTagBtn = document.createElement('button');
                quickTagBtn.textContent = tagName;
                quickTagBtn.className = 'tag-manager-quick-tag-btn';
                quickTagBtn.dataset.tagName = tagName;
                
                quickTagBtn.style.cssText = `
                    padding: 8px 16px !important;
                    background: ${isAdded ? 'rgba(99, 102, 241, 0.2)' : 'rgba(30, 41, 59, 0.6)'} !important;
                    color: ${isAdded ? '#a5b4fc' : '#94a3b8'} !important;
                    border: 1px solid ${isAdded ? 'rgba(99, 102, 241, 0.3)' : 'rgba(51, 65, 85, 0.5)'} !important;
                    border-radius: 8px !important;
                    cursor: ${isAdded ? 'not-allowed' : 'pointer'} !important;
                    font-size: 13px !important;
                    font-weight: 500 !important;
                    transition: all 0.2s ease !important;
                    opacity: ${isAdded ? '0.8' : '1'} !important;
                    box-shadow: ${isAdded ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.2)'} !important;
                `;

                if (!isAdded) {
                    quickTagBtn.addEventListener('mouseenter', () => {
                        quickTagBtn.style.background = 'rgba(51, 65, 85, 0.8)';
                        quickTagBtn.style.borderColor = '#6366f1';
                        quickTagBtn.style.color = '#f8fafc';
                        quickTagBtn.style.transform = 'translateY(-1px)';
                        quickTagBtn.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.3)';
                    });
                    quickTagBtn.addEventListener('mouseleave', () => {
                        quickTagBtn.style.background = 'rgba(30, 41, 59, 0.6)';
                        quickTagBtn.style.borderColor = 'rgba(51, 65, 85, 0.5)';
                        quickTagBtn.style.color = '#94a3b8';
                        quickTagBtn.style.transform = 'translateY(0)';
                        quickTagBtn.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.2)';
                    });
                }

                quickTagBtn.addEventListener('click', () => {
                    if (isAdded || quickTagBtn.style.cursor === 'not-allowed') {
                        return;
                    }
                    const sessionKey = modal.dataset.sessionKey;
                    if (sessionKey) {
                        const store = getTagManagerStore(modal);
                        addQuickTag(sessionKey, tagName, modal, store);
                    }
                });
                quickTagsContainer.appendChild(quickTagBtn);
            });
        }

        // 标签列表
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'tag-manager-tags';
        tagsContainer.style.cssText = `
        min-height: 100px !important;
        max-height: 300px !important;
        overflow-y: auto !important;
        margin-bottom: 24px !important;
        padding: 16px !important;
        background: rgba(0, 0, 0, 0.2) !important;
        border-radius: 16px !important;
        border: 1px dashed rgba(255, 255, 255, 0.1) !important;
    `;

        // 底部按钮
        const footer = document.createElement('div');
        footer.style.cssText = `
        display: flex !important;
        justify-content: flex-end !important;
        gap: 12px !important;
    `;

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = `
        padding: 12px 24px !important;
        background: transparent !important;
        color: #94a3b8 !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 12px !important;
        cursor: pointer !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        transition: all 0.2s ease !important;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
    `;
        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.background = 'rgba(255, 255, 255, 0.05)';
            cancelBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            cancelBtn.style.color = '#f8fafc';
        });
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.background = 'transparent';
            cancelBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            cancelBtn.style.color = '#94a3b8';
        });
        cancelBtn.addEventListener('click', () => {
            const sessionKey = modal.dataset.sessionKey;
            if (sessionKey) {
                const store = getTagManagerStore(modal);
                closeTagManager(sessionKey, store);
            }
        });

        const saveBtn = document.createElement('button');
        saveBtn.className = 'tag-manager-save';
        saveBtn.textContent = '保存';
        saveBtn.style.cssText = `
        padding: 12px 24px !important;
        background: #4f46e5 !important;
        color: white !important;
        border: none !important;
        border-radius: 12px !important;
        cursor: pointer !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        transition: all 0.2s ease !important;
        box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.1), 0 2px 4px -1px rgba(79, 70, 229, 0.06) !important;
    `;
        saveBtn.addEventListener('mouseenter', () => {
            saveBtn.style.background = '#4338ca';
            saveBtn.style.transform = 'translateY(-1px)';
        });
        saveBtn.addEventListener('mouseleave', () => {
            saveBtn.style.background = '#4f46e5';
            saveBtn.style.transform = 'translateY(0)';
        });

        footer.appendChild(cancelBtn);
        footer.appendChild(saveBtn);

        panel.appendChild(header);
        panel.appendChild(inputGroup);
        panel.appendChild(quickTagsContainer);
        panel.appendChild(tagsContainer);
        panel.appendChild(footer);
        modal.appendChild(panel);
        document.body.appendChild(modal);

        // 添加拖拽样式（通过 style 标签注入）
        if (!document.getElementById('tag-manager-drag-styles')) {
            const style = document.createElement('style');
            style.id = 'tag-manager-drag-styles';
            style.textContent = `
            .tag-manager-tag-item.tag-dragging {
                opacity: 0.5 !important;
                transform: scale(0.95) !important;
            }
            .tag-manager-tag-item.tag-drag-over-top::before {
                content: '' !important;
                position: absolute !important;
                top: -2px !important;
                left: 0 !important;
                right: 0 !important;
                height: 3px !important;
                background: #6366f1 !important;
                border-radius: 2px !important;
                z-index: 10 !important;
            }
            .tag-manager-tag-item.tag-drag-over-bottom::after {
                content: '' !important;
                position: absolute !important;
                bottom: -2px !important;
                left: 0 !important;
                right: 0 !important;
                height: 3px !important;
                background: #6366f1 !important;
                border-radius: 2px !important;
                z-index: 10 !important;
            }
            .tag-manager-tag-item.tag-drag-hover {
                transform: scale(1.05) !important;
                box-shadow: 0 4px 8px rgba(99, 102, 241, 0.3) !important;
            }
            .tag-manager-tag-item {
                position: relative !important;
            }
            /* 滚动条样式 */
            .tag-manager-tags::-webkit-scrollbar {
                width: 6px !important;
            }
            .tag-manager-tags::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.05) !important;
                border-radius: 3px !important;
            }
            .tag-manager-tags::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2) !important;
                border-radius: 3px !important;
            }
            .tag-manager-tags::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.3) !important;
            }
            .tag-manager-panel::-webkit-scrollbar {
                width: 6px !important;
            }
            .tag-manager-panel::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.05) !important;
                border-radius: 3px !important;
            }
            .tag-manager-panel::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2) !important;
                border-radius: 3px !important;
            }
        `;
            document.head.appendChild(style);
        }
    }

    // 加载标签到管理器
    function loadTagsIntoManager(sessionKey, tags, modal) {
        if (!modal) {
            modal = document.querySelector('#aicr-tag-manager');
        }
        if (!modal) return;

        const tagsContainer = modal.querySelector('.tag-manager-tags');
        if (!tagsContainer) return;

        tagsContainer.innerHTML = '';

        if (!tags || tags.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.textContent = '暂无标签';
            emptyMsg.style.cssText = `
            text-align: center !important;
            color: #94a3b8 !important;
            padding: 20px !important;
            font-size: 14px !important;
            font-weight: 500 !important;
        `;
            tagsContainer.appendChild(emptyMsg);
            return;
        }

        // 标签颜色方案（更丰富的配色 - 柔和风格 - 深色适配）
        const tagColors = [
            { bg: 'rgba(99, 102, 241, 0.2)', text: '#e0e7ff', border: 'rgba(99, 102, 241, 0.4)' }, // Indigo
            { bg: 'rgba(34, 197, 94, 0.2)', text: '#dcfce7', border: 'rgba(34, 197, 94, 0.4)' }, // Green
            { bg: 'rgba(245, 158, 11, 0.2)', text: '#fef3c7', border: 'rgba(245, 158, 11, 0.4)' }, // Amber
            { bg: 'rgba(239, 68, 68, 0.2)', text: '#fee2e2', border: 'rgba(239, 68, 68, 0.4)' }, // Red
            { bg: 'rgba(139, 92, 246, 0.2)', text: '#ede9fe', border: 'rgba(139, 92, 246, 0.4)' }, // Violet
            { bg: 'rgba(6, 182, 212, 0.2)', text: '#cffafe', border: 'rgba(6, 182, 212, 0.4)' }, // Cyan
            { bg: 'rgba(236, 72, 153, 0.2)', text: '#fce7f3', border: 'rgba(236, 72, 153, 0.4)' }, // Pink
            { bg: 'rgba(20, 184, 166, 0.2)', text: '#ccfbf1', border: 'rgba(20, 184, 166, 0.4)' }  // Teal
        ];

        tags.forEach((tag, index) => {
            const colorScheme = tagColors[index % tagColors.length];
            const tagItem = document.createElement('div');
            tagItem.className = 'tag-manager-tag-item';
            tagItem.dataset.tagName = tag;
            tagItem.dataset.tagIndex = index;
            tagItem.draggable = true;
            tagItem.style.cssText = `
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            background: ${colorScheme.bg} !important;
            color: ${colorScheme.text} !important;
            border: 1px solid ${colorScheme.border} !important;
            padding: 5px 12px !important;
            border-radius: 9999px !important;
            margin: 4px !important;
            font-size: 13px !important;
            font-weight: 500 !important;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
            transition: all 0.2s ease !important;
            cursor: move !important;
            user-select: none !important;
        `;

            const tagText = document.createElement('span');
            tagText.textContent = tag;

            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '✕';
            removeBtn.style.cssText = `
            background: rgba(255, 255, 255, 0.1) !important;
            border: none !important;
            color: ${colorScheme.text} !important;
            width: 20px !important;
            height: 20px !important;
            border-radius: 50% !important;
            cursor: pointer !important;
            font-size: 11px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0 !important;
            transition: all 0.2s ease !important;
            font-weight: 700 !important;
            flex-shrink: 0 !important;
            opacity: 0.7 !important;
        `;
            removeBtn.addEventListener('mouseenter', () => {
                removeBtn.style.background = 'rgba(255, 255, 255, 0.25)';
                removeBtn.style.transform = 'scale(1.1)';
                removeBtn.style.opacity = '1';
            });
            removeBtn.addEventListener('mouseleave', () => {
                removeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                removeBtn.style.transform = 'scale(1)';
                removeBtn.style.opacity = '0.7';
            });
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault(); // 防止触发拖拽
                const sessionKey = modal.dataset.sessionKey;
                if (sessionKey) {
                    const store = getTagManagerStore(modal);
                    removeTag(sessionKey, index, modal, store);
                }
            });

            // 防止删除按钮触发拖拽
            removeBtn.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });

            // 拖拽开始
            tagItem.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', tag);
                e.dataTransfer.setData('application/tag-index', index.toString());
                tagItem.classList.add('tag-dragging');

                // 设置自定义拖拽图像
                const dragImage = tagItem.cloneNode(true);
                dragImage.style.opacity = '0.8';
                dragImage.style.transform = 'rotate(3deg)';
                dragImage.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.3)';
                dragImage.style.position = 'absolute';
                dragImage.style.top = '-1000px';
                document.body.appendChild(dragImage);
                e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);

                setTimeout(() => {
                    if (dragImage.parentNode) {
                        dragImage.parentNode.removeChild(dragImage);
                    }
                }, 0);
            });

            // 拖拽结束
            tagItem.addEventListener('dragend', (e) => {
                tagItem.classList.remove('tag-dragging');

                // 移除所有拖拽相关的样式
                const allTagItems = tagsContainer.querySelectorAll('.tag-manager-tag-item');
                allTagItems.forEach(item => {
                    item.classList.remove('tag-drag-over-top', 'tag-drag-over-bottom', 'tag-drag-hover');
                });
            });

            // 拖拽经过
            tagItem.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';

                if (tagItem.classList.contains('tag-dragging')) {
                    return;
                }

                const rect = tagItem.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;

                // 移除所有拖拽指示样式
                const allTagItems = tagsContainer.querySelectorAll('.tag-manager-tag-item');
                allTagItems.forEach(item => {
                    if (!item.classList.contains('tag-dragging')) {
                        item.classList.remove('tag-drag-over-top', 'tag-drag-over-bottom', 'tag-drag-hover');
                    }
                });

                // 根据鼠标位置显示插入位置指示
                if (e.clientY < midY) {
                    tagItem.classList.add('tag-drag-over-top');
                    tagItem.classList.remove('tag-drag-over-bottom');
                } else {
                    tagItem.classList.add('tag-drag-over-bottom');
                    tagItem.classList.remove('tag-drag-over-top');
                }

                tagItem.classList.add('tag-drag-hover');
            });

            // 拖拽离开
            tagItem.addEventListener('dragleave', (e) => {
                const rect = tagItem.getBoundingClientRect();
                const x = e.clientX;
                const y = e.clientY;

                if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                    tagItem.classList.remove('tag-drag-over-top', 'tag-drag-over-bottom', 'tag-drag-hover');
                }
            });

            // 放置
            tagItem.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const draggedTag = e.dataTransfer.getData('text/plain');
                const draggedIndex = parseInt(e.dataTransfer.getData('application/tag-index') || '0', 10);
                const targetIndex = parseInt(tagItem.dataset.tagIndex || '0', 10);

                if (draggedTag === tag || draggedIndex === targetIndex) {
                    return;
                }

                const sessionKey = modal.dataset.sessionKey;
                if (!sessionKey) return;

                // 使用临时标签数据
                if (!modal._currentTags) return;
                const currentTags = modal._currentTags;

                // 计算新的插入位置
                const rect = tagItem.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                let insertIndex = targetIndex;
                if (e.clientY < midY) {
                    insertIndex = targetIndex;
                } else {
                    insertIndex = targetIndex + 1;
                }

                // 调整插入位置（如果拖拽的元素在目标位置之前，需要减1）
                if (draggedIndex < insertIndex) {
                    insertIndex -= 1;
                }

                // 重新排序标签数组
                const newTags = [...currentTags];
                newTags.splice(draggedIndex, 1);
                newTags.splice(insertIndex, 0, draggedTag);

                // 更新临时标签
                modal._currentTags = newTags;

                // 重新加载标签列表
                loadTagsIntoManager(sessionKey, newTags, modal);

                // 更新快捷标签按钮状态
                updateQuickTagButtons(modal, newTags);
            });

            tagItem.appendChild(tagText);
            tagItem.appendChild(removeBtn);
            tagsContainer.appendChild(tagItem);
        });

        // 更新快捷标签按钮状态
        updateQuickTagButtons(modal, tags);
    }

    // 更新快捷标签按钮状态
    function updateQuickTagButtons(modal, currentTags) {
        if (!modal) return;

        const quickTagButtons = modal.querySelectorAll('.tag-manager-quick-tag-btn');
        quickTagButtons.forEach(btn => {
            const tagName = btn.dataset.tagName;
            const isAdded = currentTags && currentTags.includes(tagName);

            if (isAdded) {
                btn.style.background = 'rgba(99, 102, 241, 0.2)';
                btn.style.color = '#a5b4fc';
                btn.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                btn.style.opacity = '0.8';
                btn.style.cursor = 'not-allowed';
                btn.style.boxShadow = 'none';
            } else {
                btn.style.background = 'rgba(30, 41, 59, 0.6)';
                btn.style.color = '#94a3b8';
                btn.style.borderColor = 'rgba(51, 65, 85, 0.5)';
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
                btn.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.2)';
            }
        });
    }

    // 刷新快捷标签列表（当标签变化时）
    function refreshQuickTags(modal) {
        if (!modal) return;

        const quickTagsContainer = modal.querySelector('.tag-manager-quick-tags');
        if (!quickTagsContainer) return;

        // 获取所有标签（与标签筛选模块保持一致）
        const getAllTags = () => {
            const store = getTagManagerStore(modal);
            const sessions = store?.sessions?.value || [];

            // 提取所有标签
            const tagSet = new Set();
            sessions.forEach(session => {
                if (session && session.tags && Array.isArray(session.tags)) {
                    session.tags.forEach(tag => {
                        if (tag && tag.trim()) {
                            tagSet.add(tag.trim());
                        }
                    });
                }
            });

            // 按字母顺序排序
            const allTagsArray = Array.from(tagSet);
            allTagsArray.sort();

            const defaultOrder = allTagsArray;

            // 应用保存的标签顺序（从 localStorage）
            try {
                const saved = localStorage.getItem('aicr_tag_order');
                const savedOrder = saved ? JSON.parse(saved) : null;
                if (savedOrder && Array.isArray(savedOrder) && savedOrder.length > 0) {
                    // 使用保存的顺序，但只包含当前存在的标签
                    const orderedTags = savedOrder.filter(tag => tagSet.has(tag));
                    // 添加新标签（不在保存顺序中的）到末尾，按字母顺序
                    const newTags = allTagsArray.filter(tag => !savedOrder.includes(tag));
                    return [...orderedTags, ...newTags];
                }
            } catch (e) {
                console.warn('[标签管理] 加载标签顺序失败:', e);
            }

            return defaultOrder;
        };

        // 获取所有标签
        const quickTags = getAllTags();

        // 清空现有按钮
        quickTagsContainer.innerHTML = '';

        // 如果没有标签，显示提示
        if (quickTags.length === 0) {
            const emptyHint = document.createElement('div');
            emptyHint.textContent = '暂无可用标签';
            emptyHint.style.cssText = `
            width: 100% !important;
            text-align: center !important;
            color: #94a3b8 !important;
            padding: 12px !important;
            font-size: 13px !important;
            font-weight: 500 !important;
        `;
            quickTagsContainer.appendChild(emptyHint);
            return;
        }

        // 获取当前会话的标签
        const sessionKey = modal.dataset.sessionKey;
        const store = getTagManagerStore(modal);
        const session = findSessionBySessionKey(store, sessionKey);
        const currentTags = session?.tags || [];

        // 创建快捷标签按钮
        quickTags.forEach(tagName => {
            const isAdded = currentTags && currentTags.includes(tagName);
            const quickTagBtn = document.createElement('button');
            quickTagBtn.textContent = tagName;
            quickTagBtn.className = 'tag-manager-quick-tag-btn';
            quickTagBtn.dataset.tagName = tagName;
            quickTagBtn.style.cssText = `
            padding: 8px 16px !important;
            background: ${isAdded ? 'rgba(99, 102, 241, 0.2)' : 'rgba(30, 41, 59, 0.6)'} !important;
            color: ${isAdded ? '#a5b4fc' : '#94a3b8'} !important;
            border: 1px solid ${isAdded ? 'rgba(99, 102, 241, 0.3)' : 'rgba(51, 65, 85, 0.5)'} !important;
            border-radius: 8px !important;
            cursor: ${isAdded ? 'not-allowed' : 'pointer'} !important;
            font-size: 13px !important;
            font-weight: 500 !important;
            transition: all 0.2s ease !important;
            opacity: ${isAdded ? '0.8' : '1'} !important;
            box-shadow: ${isAdded ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.2)'} !important;
        `;

            if (!isAdded) {
                quickTagBtn.addEventListener('mouseenter', () => {
                    quickTagBtn.style.background = 'rgba(51, 65, 85, 0.8)';
                    quickTagBtn.style.borderColor = '#6366f1';
                    quickTagBtn.style.color = '#f8fafc';
                    quickTagBtn.style.transform = 'translateY(-1px)';
                    quickTagBtn.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.3)';
                });
                quickTagBtn.addEventListener('mouseleave', () => {
                    quickTagBtn.style.background = 'rgba(30, 41, 59, 0.6)';
                    quickTagBtn.style.borderColor = 'rgba(51, 65, 85, 0.5)';
                    quickTagBtn.style.color = '#94a3b8';
                    quickTagBtn.style.transform = 'translateY(0)';
                    quickTagBtn.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.2)';
                });
            }

            quickTagBtn.addEventListener('click', () => {
                if (isAdded || quickTagBtn.style.cursor === 'not-allowed') {
                    return;
                }
                const sessionKey = modal.dataset.sessionKey;
                if (sessionKey) {
                    const store = getTagManagerStore(modal);
                    addQuickTag(sessionKey, tagName, modal, store);
                }
            });

            quickTagsContainer.appendChild(quickTagBtn);
        });
    }

    // 从输入框添加标签
    function addTagFromInput(sessionKey, modal, store) {
        if (!modal) {
            modal = document.querySelector('#aicr-tag-manager');
        }
        if (!modal) return;

        const tagInput = modal.querySelector('.tag-manager-input');
        if (!tagInput) return;

        const tagName = tagInput.value.trim();
        if (!tagName) return;

        // 使用临时标签数据
        if (!modal._currentTags) modal._currentTags = [];
        const currentTags = modal._currentTags;

        // 检查标签是否已存在
        if (currentTags.includes(tagName)) {
            tagInput.value = '';
            tagInput.focus();
            return;
        }

        // 添加标签
        currentTags.push(tagName);
        tagInput.value = '';
        tagInput.focus();

        // 重新加载标签列表
        loadTagsIntoManager(sessionKey, currentTags, modal);

        // 更新快捷标签按钮状态
        updateQuickTagButtons(modal, currentTags);

        // 如果添加了新标签，刷新快捷标签列表
        setTimeout(() => {
            refreshQuickTags(modal);
        }, 100);
    }

    // 添加快捷标签
    function addQuickTag(sessionKey, tagName, modal, store) {
        if (!modal) {
            modal = document.querySelector('#aicr-tag-manager');
        }
        if (!modal) return;

        // 使用临时标签数据
        if (!modal._currentTags) modal._currentTags = [];
        const currentTags = modal._currentTags;

        // 检查标签是否已存在
        if (currentTags.includes(tagName)) {
            return;
        }

        // 添加标签
        currentTags.push(tagName);

        // 重新加载标签列表
        loadTagsIntoManager(sessionKey, currentTags, modal);

        // 更新快捷标签按钮状态
        updateQuickTagButtons(modal, currentTags);
    }

    // 删除标签
    function removeTag(sessionKey, index, modal, store) {
        if (!modal) {
            modal = document.querySelector('#aicr-tag-manager');
        }
        if (!modal) return;

        // 使用临时标签数据
        if (!modal._currentTags) return;
        const currentTags = modal._currentTags;

        currentTags.splice(index, 1);
        loadTagsIntoManager(sessionKey, currentTags, modal);

        // 更新快捷标签按钮状态
        updateQuickTagButtons(modal, currentTags);

        // 如果删除的标签不再被任何会话使用，刷新快捷标签列表
        setTimeout(() => {
            refreshQuickTags(modal);
        }, 100);
    }

    // 智能生成标签
    async function generateSmartTags(sessionKey, buttonElement, modal, store) {
        if (!sessionKey) {
            console.warn('会话不存在，无法生成标签:', sessionKey);
            return;
        }

        store = getTagManagerStore(modal, store);
        const session = findSessionBySessionKey(store, sessionKey);
        if (!session) {
            console.warn('会话不存在，无法生成标签:', sessionKey);
            return;
        }

        if (!modal) {
            modal = document.querySelector('#aicr-tag-manager');
        }

        if (!modal) {
            console.error('标签管理弹窗未找到');
            return;
        }

        // 禁用按钮，显示加载状态
        if (buttonElement) {
            buttonElement.disabled = true;
            buttonElement.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)';
            buttonElement.style.cursor = 'not-allowed';
            buttonElement.style.boxShadow = 'none';
            const originalText = buttonElement.textContent;
            buttonElement.textContent = '生成中...';
        }

        try {
            // 收集页面上下文信息
            const pageTitle = session.pageTitle || '当前页面';
            const pageUrl = session.url || window.location.href;
            const pageDescription = session.pageDescription || '';

            // 获取会话消息摘要（取前5条消息作为上下文）
            let messageSummary = '';
            if (session.messages && Array.isArray(session.messages) && session.messages.length > 0) {
                const recentMessages = session.messages.slice(0, 5);
                messageSummary = recentMessages.map((msg, idx) => {
                    const roleRaw = String(msg.type || msg.role || '').toLowerCase();
                    const role = roleRaw === 'user' || roleRaw === 'me' ? '用户' : '助手';
                    const content = String(msg.message || msg.content || msg.text || '');
                    return `${idx + 1}. ${role}: ${content}`;
                }).join('\n');
            }

            // 构建系统提示词
            const systemPrompt = `你是一个专业的标签生成助手。根据用户提供的页面上下文和会话内容，生成合适的标签。

标签要求：
1. 标签应该简洁明了，每个标签2-6个汉字或3-12个英文字符
2. 标签应该准确反映页面或会话的核心主题
3. 生成3-8个标签
4. 标签之间用逗号分隔
5. 只返回标签，不要返回其他说明文字
6. 如果已有标签，避免生成重复的标签

输出格式示例：技术,编程,前端开发,JavaScript`;

            // 构建用户提示词
            let userPrompt = `页面信息：
- 标题：${pageTitle}
- 网址：${pageUrl}`;

            if (pageDescription) {
                userPrompt += `\n- 描述：${pageDescription}`;
            }

            if (messageSummary) {
                userPrompt += `\n\n会话内容摘要：\n${messageSummary}`;
            }

            const currentTags = modal._currentTags || [];
            if (currentTags.length > 0) {
                userPrompt += `\n\n已有标签：${currentTags.join(', ')}\n请避免生成重复的标签。`;
            }

            userPrompt += `\n\n请根据以上信息生成合适的标签。`;

            // 调用 prompt 接口
            const { streamPromptJSON } = await import('/src/services/modules/crud.js');
            const response = await streamPromptJSON(getPromptUrl(), {
                module_name: 'services.ai.chat_service',
                method_name: 'chat',
                parameters: {
                    system: systemPrompt,
                    user: userPrompt
                }
            });

            // 解析返回的标签
            let generatedTags = [];
            let content = '';
            if (response.data) {
                content = Array.isArray(response.data) ? response.data.join('') : String(response.data);
            } else if (response.content) {
                content = Array.isArray(response.content) ? response.content.join('') : String(response.content);
            } else if (response.response) {
                content = Array.isArray(response.response) ? response.response.join('') : String(response.response);
            }

            if (content) {
                const trimmedContent = content.trim();

                // 尝试解析 JSON 格式
                try {
                    const parsed = JSON.parse(trimmedContent);
                    if (Array.isArray(parsed)) {
                        generatedTags = parsed;
                    } else if (typeof parsed === 'object' && parsed.tags) {
                        generatedTags = Array.isArray(parsed.tags) ? parsed.tags : [];
                    }
                } catch (e) {
                    // 如果不是 JSON，尝试按逗号分割
                    generatedTags = trimmedContent.split(/[,，、]/).map(tag => tag.trim()).filter(tag => tag.length > 0);
                }
            }

            if (generatedTags.length === 0) {
                throw new Error('未能生成有效标签，请重试');
            }

            // 确保标签数组存在
            if (!modal._currentTags) {
                modal._currentTags = [];
            }
            const tagsList = modal._currentTags;

            // 添加新标签（排除已存在的标签）
            let addedCount = 0;
            generatedTags.forEach(tag => {
                const trimmedTag = tag.trim();
                if (trimmedTag && !tagsList.includes(trimmedTag)) {
                    tagsList.push(trimmedTag);
                    addedCount++;
                }
            });

            if (addedCount > 0) {
                // 重新加载标签列表
                loadTagsIntoManager(sessionKey, tagsList, modal);

                // 更新快捷标签按钮状态和列表
                updateQuickTagButtons(modal, tagsList);
                setTimeout(() => {
                    refreshQuickTags(modal);
                }, 100);

                console.log(`成功生成并添加 ${addedCount} 个标签:`, generatedTags.filter(tag => tagsList.includes(tag.trim())));
            } else {
                console.log('生成的标签都已存在，未添加新标签');
            }

        } catch (error) {
            console.error('智能生成标签失败:', error);

            // 在弹框内显示错误提示
            const existingError = modal.querySelector('.tag-error-message');
            if (existingError) {
                existingError.remove();
            }

            const errorDiv = document.createElement('div');
            errorDiv.className = 'tag-error-message';
            const errorMessage = error.message || '未知错误';
            const errorText = errorMessage.includes('Failed to fetch')
                ? '网络连接失败，请检查网络后重试'
                : `生成标签失败：${errorMessage}`;
            errorDiv.textContent = errorText;
            errorDiv.style.cssText = `
                padding: 12px 16px !important;
                margin: 10px 0 !important;
                background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%) !important;
                color: #dc2626 !important;
                border: 1.5px solid #fca5a5 !important;
                border-radius: 10px !important;
                font-size: 13px !important;
                font-weight: 500 !important;
                box-shadow: 0 2px 4px rgba(239, 68, 68, 0.1) !important;
                animation: fadeIn 0.3s ease !important;
            `;

            const inputGroup = modal.querySelector('.tag-manager-input-group');
            if (inputGroup && inputGroup.parentNode) {
                const tagsContainer = modal.querySelector('.tag-manager-tags');
                if (tagsContainer && tagsContainer.parentNode) {
                    tagsContainer.parentNode.insertBefore(errorDiv, tagsContainer);
                } else {
                    inputGroup.parentNode.insertBefore(errorDiv, inputGroup.nextSibling);
                }

                // 3秒后自动移除错误提示
                setTimeout(() => {
                    if (errorDiv.parentNode) {
                        errorDiv.style.opacity = '0';
                        errorDiv.style.transition = 'opacity 0.3s ease';
                        setTimeout(() => {
                            if (errorDiv.parentNode) {
                                errorDiv.remove();
                            }
                        }, 300);
                    }
                }, 3000);
            }
        } finally {
            // 恢复按钮状态
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.style.background = 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)';
                buttonElement.style.cursor = 'pointer';
                buttonElement.style.boxShadow = '0 4px 6px -1px rgba(99, 102, 241, 0.3), 0 2px 4px -1px rgba(99, 102, 241, 0.1)';
                buttonElement.textContent = '✨ 智能生成';
            }
        }
    }

    // 保存标签
    async function saveTags(sessionKey, store) {
        if (!sessionKey) {
            console.warn('会话不存在，无法保存标签:', sessionKey);
            return;
        }

        let sessionRef = null;
        let previousTags = null;

        try {
            const modalEl = document.querySelector('#aicr-tag-manager');
            store = getTagManagerStore(modalEl, store);
            const session = findSessionBySessionKey(store, sessionKey);
            if (!session) {
                throw new Error('会话不存在');
            }
            sessionRef = session;
            previousTags = Array.isArray(session.tags) ? [...session.tags] : [];

            if (store.loadSessions && (!store.sessions?.value || store.sessions.value.length === 0)) {
                await store.loadSessions(false);
            }

            let oldPath = null;
            let fileNode = null;

            const findNode = (nodes) => {
                if (!nodes) return null;
                if (Array.isArray(nodes)) {
                    for (const node of nodes) {
                        const res = findNode(node);
                        if (res) return res;
                    }
                } else {
                    if (nodes.sessionKey === sessionKey) return nodes;
                    if (nodes.children) return findNode(nodes.children);
                }
                return null;
            };

            if (store.fileTree && store.fileTree.value) {
                fileNode = findNode(store.fileTree.value);
                if (fileNode) {
                    oldPath = fileNode.key;
                }
            }

            if (!fileNode && store.loadFileTree) {
                await store.loadFileTree();
                if (store.fileTree && store.fileTree.value) {
                    fileNode = findNode(store.fileTree.value);
                    if (fileNode) {
                        oldPath = fileNode.key;
                    }
                }
            }

            let newTags = [];
            if (modalEl && modalEl._currentTags) {
                newTags = [...modalEl._currentTags];
            } else if (session.tags) {
                newTags = [...session.tags];
            }

            const normalizedTags = newTags
                .map(tag => tag ? tag.trim() : '')
                .filter(tag => tag.length > 0);
            const uniqueTags = [...new Set(normalizedTags)];

            const sessionsList = store.sessions?.value || [];

            const oldSessionKey = String(session.key || sessionKey || '');
            const { sessionPathMap: oldMap } = buildFileTreeFromSessions(sessionsList);

            const draftSessions = sessionsList.map(s => (s === session ? { ...s, tags: uniqueTags } : s));
            const { sessionPathMap: newMap } = buildFileTreeFromSessions(draftSessions);

            const safeToken = (value) => {
                const str = String(value ?? '');
                return str.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48) || 'x';
            };

            const buildTmpPath = (path, token) => {
                const parts = String(path || '').split('/');
                const fileName = parts.pop() || '';
                const dir = parts.join('/');
                const tmpName = `${fileName}.__tmp__${safeToken(token)}__${Date.now()}`;
                return dir ? `${dir}/${tmpName}` : tmpName;
            };

            const fileDeleteService = getFileDeleteService();
            const renamePlans = [];

            for (const s of sessionsList) {
                if (!s) continue;
                const sessionKey = String(s.key || '');
                if (!sessionKey) continue;

                const oldPathByRule = oldMap.get(sessionKey) || null;
                const newPathByRule = newMap.get(sessionKey) || null;
                if (!oldPathByRule || !newPathByRule) continue;
                if (oldPathByRule === newPathByRule) continue;

                const candidates = [String(oldPathByRule)];
                if (sessionKey === oldSessionKey) {
                    if (oldPath) candidates.unshift(String(oldPath));
                }
                const uniqueCandidates = Array.from(new Set(candidates)).filter(Boolean);

                renamePlans.push({
                    sessionKey,
                    candidates: uniqueCandidates,
                    oldPath: String(oldPathByRule),
                    newPath: String(newPathByRule),
                    tmpPath: buildTmpPath(oldPathByRule, sessionKey)
                });
            }

            if (!newMap.get(oldSessionKey)) {
                throw new Error('无法计算新路径，已取消保存以保持结构一致');
            }

            const staged = [];
            const moved = [];
            try {
                for (const plan of renamePlans) {
                    let actualOldPath = null;
                    for (const candidate of plan.candidates) {
                        const res = await fileDeleteService.renameFile(candidate, plan.tmpPath);
                        if (res.success) {
                            actualOldPath = candidate;
                            break;
                        }
                    }
                    if (!actualOldPath) {
                        throw new Error(`静态文件移动失败，已取消保存以保持结构一致: ${plan.oldPath} -> ${plan.newPath}`);
                    }
                    staged.push({ ...plan, actualOldPath });
                }

                for (const plan of staged) {
                    const res = await fileDeleteService.renameFile(plan.tmpPath, plan.newPath);
                    if (!res.success) {
                        throw new Error(`静态文件移动失败，已取消保存以保持结构一致: ${plan.actualOldPath} -> ${plan.newPath}`);
                    }
                    moved.push(plan);
                }
            } catch (e) {
                try {
                    for (let i = moved.length - 1; i >= 0; i--) {
                        const plan = moved[i];
                        await fileDeleteService.renameFile(plan.newPath, plan.actualOldPath);
                    }
                    for (let i = staged.length - 1; i >= 0; i--) {
                        const plan = staged[i];
                        const wasMoved = moved.some(m => m.sessionKey === plan.sessionKey);
                        if (wasMoved) continue;
                        await fileDeleteService.renameFile(plan.tmpPath, plan.actualOldPath);
                    }
                } catch (rollbackError) { }
                throw e;
            }

            session.tags = uniqueTags;
            session.updatedAt = Date.now();

            // 更新后端（标准服务接口）
            const payload = {
                module_name: SERVICE_MODULE,
                method_name: 'update_document',
                parameters: {
                    cname: 'sessions',
                    key: sessionKey,
                    data: {
                        key: sessionKey,
                        tags: session.tags,
                        updatedAt: Date.now()
                    }
                }
            };
            await postData(`${window.API_URL}/`, payload);

            // 更新本地状态
            if (store.sessions && store.sessions.value) {
                store.sessions.value = [...store.sessions.value];
            }

            // 刷新文件树以反映标签更改（目录结构变化）
            if (store.loadFileTree) {
                await store.loadFileTree();
            }

            // 关闭弹窗
            closeTagManager(sessionKey, store);

            if (window.showSuccess) {
                window.showSuccess('标签已保存');
            }
            console.log('标签已保存:', session.tags);
        } catch (error) {
            console.error('保存标签失败:', error);
            try {
                if (sessionRef && Array.isArray(previousTags)) {
                    sessionRef.tags = previousTags;
                }
                if (store && store.loadFileTree) {
                    await store.loadFileTree();
                }
            } catch (e) { }
            if (window.showError) {
                window.showError('保存标签失败，请重试');
            }
        }
    }

    // 关闭标签管理器（放弃未保存的更改）
    async function closeTagManager(sessionKey, store) {
        const modal = document.querySelector('#aicr-tag-manager');
        if (modal) {
            // 清理临时数据
            if (modal._currentTags) {
                delete modal._currentTags;
            }

            if (modal._escHandler) {
                document.removeEventListener('keydown', modal._escHandler);
                delete modal._escHandler;
            }

            modal.style.display = 'none';

            const tagInput = modal.querySelector('.tag-manager-input');
            if (tagInput) {
                tagInput.value = '';
            }
        }
    }



};
