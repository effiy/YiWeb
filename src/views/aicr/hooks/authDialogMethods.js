export const createAuthDialogMethods = ({
    getStoredToken,
    saveToken,
    clearStoredToken,
    openAuthSettings
}) => {
    let __aicrAuthDialog = null;
    let __aicrAuthDialogInput = null;

    const notifyAuth = (type, message) => {
        try {
            if (type === 'success' && typeof window.showSuccess === 'function') return window.showSuccess(message);
            if (type === 'info' && typeof window.showInfo === 'function') return window.showInfo(message);
            if (type === 'error' && typeof window.showError === 'function') return window.showError(message);
            window.alert(message);
        } catch (_) { }
    };

    const ensureAuthDialog = () => {
        try {
            if (__aicrAuthDialog && __aicrAuthDialogInput) return { dialog: __aicrAuthDialog, input: __aicrAuthDialogInput };
            if (typeof document === 'undefined') return null;
            if (!document.getElementById('aicr-auth-dialog-style')) {
                const style = document.createElement('style');
                style.id = 'aicr-auth-dialog-style';
                style.textContent = `
                    dialog.aicr-auth-dialog{border:1px solid rgba(255,255,255,0.14);border-radius:14px;background:rgba(15,23,42,0.92);color:var(--text-primary);padding:0;max-width:520px;width:360px;box-shadow:0 22px 70px rgba(0,0,0,0.55);backdrop-filter:blur(14px);position:fixed;inset:auto auto auto auto;top:var(--aicr-auth-top, 86px);left:var(--aicr-auth-left, auto);right:var(--aicr-auth-right, 24px);margin:0;transform:translate3d(0,-6px,0) scale(.98);opacity:0;pointer-events:none}
                    dialog.aicr-auth-dialog[open]{opacity:1;pointer-events:auto;transform:translate3d(0,0,0) scale(1);transition:transform 180ms cubic-bezier(.2,.9,.2,1),opacity 160ms ease}
                    dialog.aicr-auth-dialog::backdrop{background:rgba(2,6,23,0.55);backdrop-filter:blur(2px)}
                    @media (max-width: 520px){dialog.aicr-auth-dialog{width:calc(100vw - 24px);left:12px;right:12px;top:72px}}
                    .aicr-auth-form{display:flex;flex-direction:column;gap:12px;padding:14px}
                    .aicr-auth-title-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
                    .aicr-auth-title{font-size:14px;font-weight:700;letter-spacing:.02em}
                    .aicr-auth-close{width:30px;height:30px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:var(--text-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center}
                    .aicr-auth-close:hover{background:rgba(255,255,255,0.10);color:var(--text-primary)}
                    .aicr-auth-label{font-size:12px;color:var(--text-secondary)}
                    .aicr-auth-input-row{display:flex;align-items:center;gap:10px}
                    .aicr-auth-input{flex:1;width:100%;height:38px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:var(--text-primary);padding:0 12px;outline:none}
                    .aicr-auth-input:focus{border-color:rgba(99,102,241,0.7);box-shadow:0 0 0 3px rgba(99,102,241,0.18)}
                    .aicr-auth-toggle{width:44px;height:38px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:var(--text-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center}
                    .aicr-auth-toggle:hover{background:rgba(255,255,255,0.10);color:var(--text-primary)}
                    .aicr-auth-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:4px}
                    .aicr-auth-btn{height:34px;padding:0 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:var(--text-primary);cursor:pointer}
                    .aicr-auth-btn:hover{background:rgba(255,255,255,0.10)}
                    .aicr-auth-btn.primary{border-color:rgba(99,102,241,0.55);background:rgba(99,102,241,0.22)}
                    .aicr-auth-btn.primary:hover{background:rgba(99,102,241,0.30)}
                    .aicr-auth-hint{font-size:12px;color:var(--text-tertiary)}
                `;
                document.head.appendChild(style);
            }

            const dialog = document.createElement('dialog');
            dialog.className = 'aicr-auth-dialog';
            dialog.setAttribute('aria-label', 'API 鉴权');

            const form = document.createElement('div');
            form.className = 'aicr-auth-form';

            const titleRow = document.createElement('div');
            titleRow.className = 'aicr-auth-title-row';

            const title = document.createElement('div');
            title.className = 'aicr-auth-title';
            title.textContent = 'API 鉴权';

            const closeBtnX = document.createElement('button');
            closeBtnX.type = 'button';
            closeBtnX.className = 'aicr-auth-close';
            closeBtnX.setAttribute('aria-label', '关闭');
            closeBtnX.textContent = '×';

            titleRow.appendChild(title);
            titleRow.appendChild(closeBtnX);

            const label = document.createElement('div');
            label.className = 'aicr-auth-label';
            label.textContent = 'X-Token（用于访问 API）';

            const input = document.createElement('input');
            input.className = 'aicr-auth-input';
            input.type = 'password';
            input.autocomplete = 'off';
            input.spellcheck = false;

            const toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = 'aicr-auth-toggle';
            toggleBtn.setAttribute('aria-label', '显示或隐藏');
            toggleBtn.textContent = '👁';

            const inputRow = document.createElement('div');
            inputRow.className = 'aicr-auth-input-row';
            inputRow.appendChild(input);
            inputRow.appendChild(toggleBtn);

            const hint = document.createElement('div');
            hint.className = 'aicr-auth-hint';
            hint.textContent = '留空并保存会清除 Token';

            const actions = document.createElement('div');
            actions.className = 'aicr-auth-actions';

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'aicr-auth-btn';
            cancelBtn.textContent = '取消';

            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'aicr-auth-btn';
            clearBtn.textContent = '清除';

            const saveBtn = document.createElement('button');
            saveBtn.type = 'button';
            saveBtn.className = 'aicr-auth-btn primary';
            saveBtn.textContent = '保存';

            const applyValue = (mode) => {
                try {
                    if (mode === 'cancel') {
                        dialog.close('cancel');
                        return;
                    }
                    if (mode === 'clear') {
                        clearStoredToken();
                        dialog.close('cleared');
                        notifyAuth('info', 'Token 已清除');
                        return;
                    }
                    const next = String(input.value || '').trim();
                    if (!next) {
                        clearStoredToken();
                        dialog.close('cleared');
                        notifyAuth('info', 'Token 已清除');
                        return;
                    }
                    saveToken(next);
                    dialog.close('saved');
                    notifyAuth('success', 'Token 已保存');
                } catch (e) {
                    try { dialog.close('error'); } catch (_) { }
                    notifyAuth('error', 'API 鉴权失败，请重试');
                }
            };

            closeBtnX.addEventListener('click', () => applyValue('cancel'));
            cancelBtn.addEventListener('click', () => applyValue('cancel'));
            clearBtn.addEventListener('click', () => applyValue('clear'));
            saveBtn.addEventListener('click', () => applyValue('save'));

            toggleBtn.addEventListener('click', () => {
                try {
                    const nextType = input.type === 'password' ? 'text' : 'password';
                    input.type = nextType;
                    input.focus();
                    try { input.setSelectionRange(input.value.length, input.value.length); } catch (_) { }
                } catch (_) { }
            });

            input.addEventListener('keydown', (e) => {
                if (e && e.key === 'Enter') {
                    e.preventDefault();
                    applyValue('save');
                }
            });

            dialog.addEventListener('click', (e) => {
                try {
                    if (e && e.target === dialog) applyValue('cancel');
                } catch (_) { }
            });

            dialog.addEventListener('cancel', (e) => {
                try { if (e && typeof e.preventDefault === 'function') e.preventDefault(); } catch (_) { }
                try { dialog.close('cancel'); } catch (_) { }
            });

            actions.appendChild(cancelBtn);
            actions.appendChild(clearBtn);
            actions.appendChild(saveBtn);

            form.appendChild(titleRow);
            form.appendChild(label);
            form.appendChild(inputRow);
            form.appendChild(hint);
            form.appendChild(actions);

            dialog.appendChild(form);
            document.body.appendChild(dialog);

            __aicrAuthDialog = dialog;
            __aicrAuthDialogInput = input;

            return { dialog, input };
        } catch (_) {
            return null;
        }
    };

    const openAuth = (event) => {
        try {
            openAuthSettings(event);
            return;
        } catch (_) { }
        try {
            const current = getStoredToken();
            const dialogInfo = ensureAuthDialog();
            if (dialogInfo && dialogInfo.dialog && typeof dialogInfo.dialog.showModal === 'function') {
                try {
                    const rect = event && event.currentTarget && typeof event.currentTarget.getBoundingClientRect === 'function'
                        ? event.currentTarget.getBoundingClientRect()
                        : null;
                    const vw = window.innerWidth || 0;
                    const vh = window.innerHeight || 0;
                    const padding = 12;
                    const desiredTop = rect ? rect.bottom + 10 : 86;
                    const desiredRight = rect ? Math.max(padding, vw - rect.right) : 24;
                    const maxTop = Math.max(padding, vh - 220);
                    const top = Math.min(Math.max(padding, desiredTop), maxTop);
                    dialogInfo.dialog.style.setProperty('--aicr-auth-top', `${top}px`);
                    dialogInfo.dialog.style.setProperty('--aicr-auth-right', `${desiredRight}px`);
                    dialogInfo.dialog.style.setProperty('--aicr-auth-left', 'auto');
                } catch (_) { }
                dialogInfo.input.value = String(current || '');
                dialogInfo.dialog.showModal();
                setTimeout(() => {
                    try {
                        dialogInfo.input.focus();
                        dialogInfo.input.select();
                    } catch (_) { }
                }, 0);
                return;
            }

            const token = window.prompt('请输入 X-Token（用于访问 API）', current);
            if (token === null) return;
            const next = String(token || '').trim();
            if (!next) {
                clearStoredToken();
                notifyAuth('info', 'Token 已清除');
                return;
            }
            saveToken(next);
            notifyAuth('success', 'Token 已保存');
        } catch (_) {
            notifyAuth('error', 'API 鉴权失败，请重试');
        }
    };

    return {
        openAuth
    };
};
