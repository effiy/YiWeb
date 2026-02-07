/**
 * API 认证工具函数
 * 用于管理 X-Token 的存储和获取
 * 作者：liangliang
 */

// ---------- 常量定义 ----------
const API_TOKEN_KEY = "YiWeb.apiToken.v1";
const API_MODEL_KEY = "YiWeb.apiModel.v1";
const DEFAULT_API_MODEL = "qwen3";

/**
 * 获取存储的 Token
 * @returns {string} 存储的 token，如果没有则返回空字符串
 */
export const getStoredToken = () => {
  try {
    return String(localStorage.getItem(API_TOKEN_KEY) || "").trim();
  } catch {
    return "";
  }
};

export const getStoredModel = () => {
  try {
    const v = String(localStorage.getItem(API_MODEL_KEY) || "").trim();
    return v || DEFAULT_API_MODEL;
  } catch {
    return DEFAULT_API_MODEL;
  }
};

/**
 * 保存 Token 到本地存储
 * @param {string} token - 要保存的 token
 */
export const saveToken = (token) => {
  try {
    localStorage.setItem(API_TOKEN_KEY, String(token || "").trim());
  } catch {
    // ignore
  }
};

export const saveModel = (model) => {
  try {
    const next = String(model || "").trim();
    if (!next || next === DEFAULT_API_MODEL) {
      localStorage.removeItem(API_MODEL_KEY);
      return;
    }
    localStorage.setItem(API_MODEL_KEY, next);
  } catch {
    // ignore
  }
};

/**
 * 获取认证请求头
 * @param {string} token - 可选的 token，如果不提供则从存储中获取
 * @returns {Object} 包含 X-Token 的请求头对象，如果没有 token 则返回空对象
 */
export const getAuthHeaders = (token) => {
  const authToken = token || getStoredToken();
  if (!authToken) return {};
  return { "X-Token": authToken };
};

/**
 * 清除 Token（别名函数，用于统一接口）
 */
export const clearToken = () => {
  saveToken('');
};

export const clearModel = () => {
  try {
    localStorage.removeItem(API_MODEL_KEY);
  } catch {
    // ignore
  }
};

/**
 * 检查是否有有效的 Token
 * @returns {boolean} 是否有有效的 token
 */
export const hasValidToken = () => {
  const token = getStoredToken();
  return token && token.trim().length > 0;
};

let __authSettingsDialog = null;
let __authSettingsTokenInput = null;
let __authSettingsModelInput = null;

const ensureAuthSettingsDialog = () => {
  try {
    if (__authSettingsDialog && __authSettingsTokenInput && __authSettingsModelInput) {
      return { dialog: __authSettingsDialog, tokenInput: __authSettingsTokenInput, modelInput: __authSettingsModelInput };
    }
    if (typeof document === 'undefined') return null;

    if (!document.getElementById('yiweb-auth-settings-dialog-style')) {
      const style = document.createElement('style');
      style.id = 'yiweb-auth-settings-dialog-style';
      style.textContent = `
        dialog.yiweb-auth-dialog{border:1px solid rgba(255,255,255,0.14);border-radius:14px;background:rgba(15,23,42,0.92);color:var(--text-primary);padding:0;max-width:560px;width:380px;box-shadow:0 22px 70px rgba(0,0,0,0.55);backdrop-filter:blur(14px);position:fixed;inset:auto auto auto auto;top:var(--yiweb-auth-top, 86px);left:var(--yiweb-auth-left, auto);right:var(--yiweb-auth-right, 24px);margin:0;transform:translate3d(0,-6px,0) scale(.98);opacity:0;pointer-events:none}
        dialog.yiweb-auth-dialog[open]{opacity:1;pointer-events:auto;transform:translate3d(0,0,0) scale(1);transition:transform 180ms cubic-bezier(.2,.9,.2,1),opacity 160ms ease}
        dialog.yiweb-auth-dialog::backdrop{background:rgba(2,6,23,0.55);backdrop-filter:blur(2px)}
        @media (max-width: 560px){dialog.yiweb-auth-dialog{width:calc(100vw - 24px);left:12px;right:12px;top:72px}}
        .yiweb-auth-form{display:flex;flex-direction:column;gap:12px;padding:14px}
        .yiweb-auth-title-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
        .yiweb-auth-title{font-size:14px;font-weight:700;letter-spacing:.02em}
        .yiweb-auth-close{width:30px;height:30px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:var(--text-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center}
        .yiweb-auth-close:hover{background:rgba(255,255,255,0.10);color:var(--text-primary)}
        .yiweb-auth-label{font-size:12px;color:var(--text-secondary)}
        .yiweb-auth-input-row{display:flex;align-items:center;gap:10px}
        .yiweb-auth-input{flex:1;width:100%;height:38px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:var(--text-primary);padding:0 12px;outline:none}
        .yiweb-auth-input:focus{border-color:rgba(99,102,241,0.7);box-shadow:0 0 0 3px rgba(99,102,241,0.18)}
        .yiweb-auth-toggle{width:44px;height:38px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:var(--text-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center}
        .yiweb-auth-toggle:hover{background:rgba(255,255,255,0.10);color:var(--text-primary)}
        .yiweb-auth-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:4px}
        .yiweb-auth-btn{height:34px;padding:0 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:var(--text-primary);cursor:pointer}
        .yiweb-auth-btn:hover{background:rgba(255,255,255,0.10)}
        .yiweb-auth-btn.primary{border-color:rgba(99,102,241,0.55);background:rgba(99,102,241,0.22)}
        .yiweb-auth-btn.primary:hover{background:rgba(99,102,241,0.30)}
        .yiweb-auth-hint{font-size:12px;color:var(--text-tertiary)}
      `;
      document.head.appendChild(style);
    }

    const dialog = document.createElement('dialog');
    dialog.className = 'yiweb-auth-dialog';
    dialog.setAttribute('aria-label', 'API 设置');

    const form = document.createElement('div');
    form.className = 'yiweb-auth-form';

    const titleRow = document.createElement('div');
    titleRow.className = 'yiweb-auth-title-row';

    const title = document.createElement('div');
    title.className = 'yiweb-auth-title';
    title.textContent = 'API 设置';

    const closeBtnX = document.createElement('button');
    closeBtnX.type = 'button';
    closeBtnX.className = 'yiweb-auth-close';
    closeBtnX.setAttribute('aria-label', '关闭');
    closeBtnX.textContent = '×';

    titleRow.appendChild(title);
    titleRow.appendChild(closeBtnX);

    const tokenLabel = document.createElement('div');
    tokenLabel.className = 'yiweb-auth-label';
    tokenLabel.textContent = 'X-Token（用于访问 API）';

    const tokenInput = document.createElement('input');
    tokenInput.className = 'yiweb-auth-input';
    tokenInput.type = 'password';
    tokenInput.autocomplete = 'off';
    tokenInput.spellcheck = false;

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'yiweb-auth-toggle';
    toggleBtn.setAttribute('aria-label', '显示或隐藏');
    toggleBtn.textContent = '👁';

    const tokenInputRow = document.createElement('div');
    tokenInputRow.className = 'yiweb-auth-input-row';
    tokenInputRow.appendChild(tokenInput);
    tokenInputRow.appendChild(toggleBtn);

    const modelLabel = document.createElement('div');
    modelLabel.className = 'yiweb-auth-label';
    modelLabel.textContent = '模型（用于项目所有接口请求）';

    const modelInput = document.createElement('input');
    modelInput.className = 'yiweb-auth-input';
    modelInput.type = 'text';
    modelInput.autocomplete = 'off';
    modelInput.spellcheck = false;
    modelInput.placeholder = DEFAULT_API_MODEL;
    modelInput.setAttribute('list', 'yiweb-model-suggestions');

    const modelDataList = document.createElement('datalist');
    modelDataList.id = 'yiweb-model-suggestions';
    const modelOptions = [DEFAULT_API_MODEL, 'qwen2.5', 'qwen2.5-coder', 'deepseek-r1', 'gpt-4.1'];
    modelOptions.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m;
      modelDataList.appendChild(opt);
    });

    const modelInputRow = document.createElement('div');
    modelInputRow.className = 'yiweb-auth-input-row';
    modelInputRow.appendChild(modelInput);

    const hint = document.createElement('div');
    hint.className = 'yiweb-auth-hint';
    hint.textContent = 'Token 留空保存会清除；模型留空会重置为默认值';

    const actions = document.createElement('div');
    actions.className = 'yiweb-auth-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'yiweb-auth-btn';
    cancelBtn.textContent = '取消';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'yiweb-auth-btn';
    resetBtn.textContent = '重置';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'yiweb-auth-btn primary';
    saveBtn.textContent = '保存';

    const applyValue = (mode) => {
      try {
        if (mode === 'cancel') {
          dialog.close('cancel');
          return;
        }
        if (mode === 'reset') {
          clearToken();
          clearModel();
          dialog.close('reset');
          return;
        }

        const nextToken = String(tokenInput.value || '').trim();
        if (!nextToken) clearToken();
        else saveToken(nextToken);

        const nextModel = String(modelInput.value || '').trim();
        if (!nextModel) clearModel();
        else saveModel(nextModel);

        dialog.close('saved');
      } catch (_) {
        try { dialog.close('error'); } catch (_) {}
      }
    };

    closeBtnX.addEventListener('click', () => applyValue('cancel'));
    cancelBtn.addEventListener('click', () => applyValue('cancel'));
    resetBtn.addEventListener('click', () => applyValue('reset'));
    saveBtn.addEventListener('click', () => applyValue('save'));

    toggleBtn.addEventListener('click', () => {
      try {
        const nextType = tokenInput.type === 'password' ? 'text' : 'password';
        tokenInput.type = nextType;
        tokenInput.focus();
        try { tokenInput.setSelectionRange(tokenInput.value.length, tokenInput.value.length); } catch (_) {}
      } catch (_) {}
    });

    tokenInput.addEventListener('keydown', (e) => {
      if (e && e.key === 'Enter') {
        e.preventDefault();
        applyValue('save');
      }
    });
    modelInput.addEventListener('keydown', (e) => {
      if (e && e.key === 'Enter') {
        e.preventDefault();
        applyValue('save');
      }
    });

    dialog.addEventListener('click', (e) => {
      try {
        if (e && e.target === dialog) applyValue('cancel');
      } catch (_) {}
    });

    dialog.addEventListener('cancel', (e) => {
      try { if (e && typeof e.preventDefault === 'function') e.preventDefault(); } catch (_) {}
      try { dialog.close('cancel'); } catch (_) {}
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(resetBtn);
    actions.appendChild(saveBtn);

    form.appendChild(titleRow);
    form.appendChild(tokenLabel);
    form.appendChild(tokenInputRow);
    form.appendChild(modelLabel);
    form.appendChild(modelInputRow);
    form.appendChild(modelDataList);
    form.appendChild(hint);
    form.appendChild(actions);

    dialog.appendChild(form);
    document.body.appendChild(dialog);

    __authSettingsDialog = dialog;
    __authSettingsTokenInput = tokenInput;
    __authSettingsModelInput = modelInput;

    return { dialog, tokenInput, modelInput };
  } catch (_) {
    return null;
  }
};

export const openAuth = (event) => {
  try {
    const dialogInfo = ensureAuthSettingsDialog();
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
        const maxTop = Math.max(padding, vh - 260);
        const top = Math.min(Math.max(padding, desiredTop), maxTop);
        dialogInfo.dialog.style.setProperty('--yiweb-auth-top', `${top}px`);
        dialogInfo.dialog.style.setProperty('--yiweb-auth-right', `${desiredRight}px`);
        dialogInfo.dialog.style.setProperty('--yiweb-auth-left', 'auto');
      } catch (_) {}

      dialogInfo.tokenInput.value = String(getStoredToken() || '');
      dialogInfo.modelInput.value = String(getStoredModel() || DEFAULT_API_MODEL);
      dialogInfo.dialog.showModal();
      setTimeout(() => {
        try {
          dialogInfo.tokenInput.focus();
          dialogInfo.tokenInput.select();
        } catch (_) {}
      }, 0);
      return;
    }

    const token = window.prompt('请输入 X-Token（用于访问 API；留空清除）', getStoredToken());
    if (token === null) return;
    const nextToken = String(token || '').trim();
    if (!nextToken) clearToken();
    else saveToken(nextToken);

    const model = window.prompt(`请输入模型（用于项目所有接口请求；留空重置为 ${DEFAULT_API_MODEL}）`, getStoredModel());
    if (model === null) return;
    const nextModel = String(model || '').trim();
    if (!nextModel) clearModel();
    else saveModel(nextModel);
  } catch (_) {}
};

// 在全局作用域中暴露（用于非模块环境）
if (typeof window !== 'undefined') {
  window.getStoredToken = getStoredToken;
  window.saveToken = saveToken;
  window.getAuthHeaders = getAuthHeaders;
  window.clearToken = clearToken;
  window.hasValidToken = hasValidToken;
  window.getStoredModel = getStoredModel;
  window.saveModel = saveModel;
  window.clearModel = clearModel;
  if (!window.openAuth) window.openAuth = openAuth;
}

