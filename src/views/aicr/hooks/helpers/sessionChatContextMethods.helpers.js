export const insertTextAtTextarea = (textarea, text, fallbackValue = '') => {
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

export const isAbortError = (e) => {
    try {
        if (!e) return false;
        if (e.name === 'AbortError') return true;
        const msg = typeof e.message === 'string' ? e.message : '';
        return msg.toLowerCase().includes('aborted');
    } catch (_) {
        return false;
    }
};

export const truncateText = (v, maxLen) => {
    const s = String(v ?? '');
    const limit = Math.max(0, Number(maxLen) || 0);
    if (!limit || s.length <= limit) return s;
    return `${s.slice(0, limit)}\n\n...(内容已截断)`;
};

export const buildSessionChatHistoryText = (messages, endIndexExclusive) => {
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

export const buildSessionChatUserPrompt = ({ text, images, pageContent, includeContext, historyText }) => {
    const imageList = Array.isArray(images) ? images.filter(Boolean) : [];
    if (imageList.length > 0) {
        return String(text || '用户发送了图片，请结合图片内容回答。').trim();
    }
    const current = String(text || '').trim() || '请继续。';
    const parts = [];
    const ctx = String(pageContent || '').trim();
    const hist = String(historyText || '').trim();
    if (includeContext && ctx) {
        parts.push(`## 页面上下文\n\n${truncateText(ctx, 12000)}`);
    }
    if (hist) {
        parts.push(`## 会话历史\n\n${truncateText(hist, 12000)}`);
    }
    parts.push(`## 当前消息\n\n${truncateText(current, 8000)}`);
    return parts.join('\n\n');
};

export const sessionChatMessageKey = (m, idx) => {
    const ts = typeof m?.timestamp === 'number' ? m.timestamp : null;
    if (typeof ts === 'number' && Number.isFinite(ts)) return `ts_${ts}`;
    const i = Number(idx);
    if (Number.isFinite(i)) return `idx_${i}`;
    return `k_${Date.now()}`;
};

export const setFeedbackFlag = (refMap, key, durationMs) => {
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

