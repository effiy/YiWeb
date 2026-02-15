export const createSessionChatContextScrollSync = ({
    sessionContextEditorVisible,
    sessionContextMode,
    sessionMessageEditorVisible,
    sessionMessageEditorMode
}) => {
    let sessionContextScrollSyncCleanup = null;
    let sessionMessageEditorScrollSyncCleanup = null;

    const cleanupSessionContextScrollSync = () => {
        if (typeof sessionContextScrollSyncCleanup === 'function') {
            sessionContextScrollSyncCleanup();
        }
        sessionContextScrollSyncCleanup = null;
    };

    const cleanupSessionMessageEditorScrollSync = () => {
        if (typeof sessionMessageEditorScrollSyncCleanup === 'function') {
            sessionMessageEditorScrollSyncCleanup();
        }
        sessionMessageEditorScrollSyncCleanup = null;
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

    const setupSessionMessageEditorScrollSync = () => {
        cleanupSessionMessageEditorScrollSync();

        const root = document.querySelector('.aicr-session-context-modal[aria-label="消息编辑器"]');
        const modal = root ? root.querySelector('.aicr-session-context-modal-body') : null;
        if (!modal) return;

        const split = modal.querySelector('.aicr-session-context-split');
        if (!split) return;

        const textarea = split.querySelector('.aicr-session-context-textarea');
        const preview = split.querySelector('.aicr-session-context-preview');
        if (!(textarea instanceof HTMLElement) || !(preview instanceof HTMLElement)) return;

        let rafId = 0;

        const syncScroll = () => {
            const fromMax = Math.max(0, (textarea.scrollHeight || 0) - (textarea.clientHeight || 0));
            const toMax = Math.max(0, (preview.scrollHeight || 0) - (preview.clientHeight || 0));
            const ratio = fromMax > 0 ? (textarea.scrollTop / fromMax) : 0;
            preview.scrollTop = ratio * toMax;
        };

        const onTextareaScroll = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                rafId = 0;
                syncScroll();
            });
        };

        textarea.addEventListener('scroll', onTextareaScroll, { passive: true });

        sessionMessageEditorScrollSyncCleanup = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = 0;
            textarea.removeEventListener('scroll', onTextareaScroll);
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

    const ensureSessionMessageEditorScrollSync = () => {
        const visible = !!sessionMessageEditorVisible?.value;
        const mode = String(sessionMessageEditorMode?.value || '').toLowerCase();
        if (!visible || mode !== 'split') {
            cleanupSessionMessageEditorScrollSync();
            return;
        }

        const schedule = () => setupSessionMessageEditorScrollSync();
        if (typeof Vue !== 'undefined' && typeof Vue.nextTick === 'function') {
            Vue.nextTick(schedule);
            return;
        }
        setTimeout(schedule, 0);
    };

    return {
        cleanupSessionContextScrollSync,
        cleanupSessionMessageEditorScrollSync,
        ensureSessionContextScrollSync,
        ensureSessionMessageEditorScrollSync
    };
};

