/**
 * API 认证工具函数
 * 用于管理 X-Token 的存储和获取
 * 作者：liangliang
 */

// ---------- 常量定义 ----------
const API_TOKEN_KEY = "YiWeb.apiToken.v1";
const API_MODEL_KEY = "YiWeb.apiModel.v1";
const DEFAULT_API_MODEL = "qwen3.5";

// ---------- 模型服务相关状态 ----------
let ModelService = null;

// ---------- 基础存储函数 ----------

/**
 * 获取存储的 Token
 * @returns {string} 存储的 token，如果没有则返回空字符串
 */
export const getStoredToken = () => {
  try {
    return String(localStorage.getItem(API_TOKEN_KEY) || "").trim();
  } catch (_) {
    return "";
  }
};

export const getStoredModel = () => {
  try {
    const v = String(localStorage.getItem(API_MODEL_KEY) || "").trim();
    return v || DEFAULT_API_MODEL;
  } catch (_) {
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
  } catch (_) {
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
  } catch (_) {
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
  } catch (_) {
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

// ---------- 模型列表获取 ----------

const fetchModels = async () => {
  try {
    if (!ModelService) {
      try {
        const module = await import('/src/views/aicr/utils/modelService.js?v=1');
        ModelService = module.default || module;
      } catch (e) {
        console.warn('[authUtils] 无法加载模型服务:', e);
        return [];
      }
    }

    if (ModelService && ModelService.fetchOllamaModels) {
      const result = await ModelService.fetchOllamaModels();
      if (result && result.data && result.data.length > 0) {
        return result.data;
      }
    }
  } catch (e) {
    console.warn('[authUtils] 获取模型列表失败:', e);
  }

  return [];
};

// ---------- 对话框创建 ----------

let __authSettingsDialog = null;
let __authSettingsTokenInput = null;
let __authSettingsModelSelect = null;
let __authSettingsModelInput = null;
let __modelToggleBtn = null;
let __modelRefreshBtn = null;
let __modelSelectWrapper = null;
let __modelManualInput = null;
let __useManualInput = false;

const ensureAuthSettingsDialog = () => {
  try {
    if (__authSettingsDialog && __authSettingsTokenInput && __authSettingsModelSelect) {
      return {
        dialog: __authSettingsDialog,
        tokenInput: __authSettingsTokenInput,
        modelSelect: __authSettingsModelSelect,
        modelInput: __authSettingsModelInput
      };
    }
    if (typeof document === 'undefined') return null;

    // 添加样式
    if (!document.getElementById('yiweb-auth-settings-dialog-style')) {
      const style = document.createElement('style');
      style.id = 'yiweb-auth-settings-dialog-style';
      style.textContent = `
        dialog.yiweb-auth-dialog{border:1px solid rgba(255,255,255,0.14);border-radius:14px;background:rgba(15,23,42,0.92);color:var(--text-primary);padding:0;max-width:560px;width:420px;box-shadow:0 22px 70px rgba(0,0,0,0.55);backdrop-filter:blur(14px);position:fixed;inset:auto auto auto auto;top:var(--yiweb-auth-top, 86px);left:var(--yiweb-auth-left, auto);right:var(--yiweb-auth-right, 24px);margin:0;transform:translate3d(0,-6px,0) scale(.98);opacity:0;pointer-events:none}
        dialog.yiweb-auth-dialog[open]{opacity:1;pointer-events:auto;transform:translate3d(0,0,0) scale(1);transition:transform 180ms cubic-bezier(.2,.9,.2,1),opacity 160ms ease}
        dialog.yiweb-auth-dialog::backdrop{background:rgba(2,6,23,0.55);backdrop-filter:blur(2px)}
        @media (max-width: 560px){dialog.yiweb-auth-dialog{width:calc(100vw - 24px);left:12px;right:12px;top:72px}}
        .yiweb-auth-form{display:flex;flex-direction:column;gap:12px;padding:14px}
        .yiweb-auth-title-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
        .yiweb-auth-title{font-size:14px;font-weight:700;letter-spacing:.02em}
        .yiweb-auth-close{width:30px;height:30px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:var(--text-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center}
        .yiweb-auth-close:hover{background:rgba(255,255,255,0.10);color:var(--text-primary)}
        .yiweb-auth-label{font-size:12px;color:var(--text-secondary)}
        .yiweb-auth-label-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
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
        .yiweb-auth-btn.small{height:30px;padding:0 10px;font-size:12px}
        .yiweb-auth-hint{font-size:12px;color:var(--text-tertiary)}

        /* 模型下拉框样式 */
        .yiweb-auth-select-wrapper{position:relative;flex:1}
        .yiweb-auth-select{width:100%;height:38px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:var(--text-primary);padding:0 36px 0 12px;outline:none;cursor:pointer;appearance:none;-webkit-appearance:none}
        .yiweb-auth-select:focus{border-color:rgba(99,102,241,0.7);box-shadow:0 0 0 3px rgba(99,102,241,0.18)}
        .yiweb-auth-select:disabled{opacity:0.6;cursor:not-allowed}
        .yiweb-auth-select-arrow{position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--text-secondary)}
        .yiweb-auth-manual-input{display:none;margin-top:8px}
        .yiweb-auth-manual-input.show{display:block}
      `;
      document.head.appendChild(style);
    }

    // 创建对话框
    const dialog = document.createElement('dialog');
    dialog.className = 'yiweb-auth-dialog';
    dialog.setAttribute('aria-label', 'API 设置');

    const form = document.createElement('div');
    form.className = 'yiweb-auth-form';

    // 标题行
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

    // Token 输入
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

    // 模型标签行
    const modelLabelRow = document.createElement('div');
    modelLabelRow.className = 'yiweb-auth-label-row';

    const modelLabel = document.createElement('div');
    modelLabel.className = 'yiweb-auth-label';
    modelLabel.textContent = '模型（用于项目所有接口请求）';

    const modelToggleBtn = document.createElement('button');
    modelToggleBtn.type = 'button';
    modelToggleBtn.className = 'yiweb-auth-btn small';
    modelToggleBtn.textContent = '手动输入';
    modelToggleBtn.title = '切换到手动输入模式';

    modelLabelRow.appendChild(modelLabel);
    modelLabelRow.appendChild(modelToggleBtn);

    // 模型下拉框
    const modelSelectWrapper = document.createElement('div');
    modelSelectWrapper.className = 'yiweb-auth-input-row';

    const modelSelectContainer = document.createElement('div');
    modelSelectContainer.className = 'yiweb-auth-select-wrapper';

    const modelSelect = document.createElement('select');
    modelSelect.className = 'yiweb-auth-select';
    modelSelect.id = 'yiweb-auth-model-select';

    const modelSelectArrow = document.createElement('span');
    modelSelectArrow.className = 'yiweb-auth-select-arrow';
    modelSelectArrow.innerHTML = '▼';

    modelSelectContainer.appendChild(modelSelect);
    modelSelectContainer.appendChild(modelSelectArrow);

    const modelRefreshBtn = document.createElement('button');
    modelRefreshBtn.type = 'button';
    modelRefreshBtn.className = 'yiweb-auth-toggle';
    modelRefreshBtn.innerHTML = '🔄';
    modelRefreshBtn.title = '刷新模型列表';

    modelSelectWrapper.appendChild(modelSelectContainer);
    modelSelectWrapper.appendChild(modelRefreshBtn);

    // 手动输入
    const modelManualInput = document.createElement('div');
    modelManualInput.className = 'yiweb-auth-manual-input';

    const modelInput = document.createElement('input');
    modelInput.className = 'yiweb-auth-input';
    modelInput.type = 'text';
    modelInput.autocomplete = 'off';
    modelInput.spellcheck = false;
    modelInput.placeholder = DEFAULT_API_MODEL;

    modelManualInput.appendChild(modelInput);

    // 提示
    const hint = document.createElement('div');
    hint.className = 'yiweb-auth-hint';
    hint.textContent = 'Token 留空保存会清除；模型留空会重置为默认值';

    // 按钮
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

    // 渲染模型选项
    const renderModelOptions = (models) => {
      modelSelect.innerHTML = '';

      // 添加空选项
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = `默认 (${DEFAULT_API_MODEL})`;
      modelSelect.appendChild(emptyOption);

      // 添加模型选项
      (models || []).forEach(model => {
        if (!model) return;
        const modelName = String(model.name || '').trim();
        if (!modelName) return;

        const option = document.createElement('option');
        option.value = modelName;

        if (model.sizeFormatted && String(model.sizeFormatted).trim()) {
          option.textContent = `${modelName} (${model.sizeFormatted})`;
        } else {
          option.textContent = modelName;
        }
        modelSelect.appendChild(option);
      });

      // 设置当前值
      const currentModel = String(getStoredModel() || '');
      if (currentModel && currentModel !== DEFAULT_API_MODEL) {
        modelSelect.value = currentModel;
        modelInput.value = currentModel;
      } else {
        modelSelect.value = '';
        modelInput.value = '';
      }
    };

    // 加载模型列表
    let isLoading = false;
    const loadModelList = async () => {
      if (isLoading) return;
      isLoading = true;
      modelRefreshBtn.disabled = true;
      modelRefreshBtn.innerHTML = '⏳';

      try {
        const models = await fetchModels();
        renderModelOptions(models);
      } catch (e) {
        console.warn('[authUtils] 加载模型列表失败:', e);
        renderModelOptions([]);
      } finally {
        isLoading = false;
        modelRefreshBtn.disabled = false;
        modelRefreshBtn.innerHTML = '🔄';
      }
    };

    // 切换输入模式
    const toggleInputMode = () => {
      __useManualInput = !__useManualInput;
      if (__useManualInput) {
        modelToggleBtn.textContent = '下拉选择';
        modelToggleBtn.title = '切换到下拉选择模式';
        modelSelectWrapper.style.display = 'none';
        modelManualInput.classList.add('show');
        if (modelSelect.value && !modelInput.value) {
          modelInput.value = modelSelect.value;
        }
      } else {
        modelToggleBtn.textContent = '手动输入';
        modelToggleBtn.title = '切换到手动输入模式';
        modelSelectWrapper.style.display = 'flex';
        modelManualInput.classList.remove('show');
      }
    };

    // 应用值
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

        let nextModel = '';
        if (__useManualInput) {
          nextModel = String(modelInput.value || '').trim();
        } else {
          nextModel = String(modelSelect.value || '').trim();
        }

        if (!nextModel) clearModel();
        else saveModel(nextModel);

        dialog.close('saved');
      } catch (_) {
        try { dialog.close('error'); } catch (_) {}
      }
    };

    // 绑定事件
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

    modelToggleBtn.addEventListener('click', toggleInputMode);
    modelRefreshBtn.addEventListener('click', () => loadModelList());

    dialog.addEventListener('click', (e) => {
      try {
        if (e && e.target === dialog) applyValue('cancel');
      } catch (_) {}
    });

    dialog.addEventListener('cancel', (e) => {
      try { if (e && typeof e.preventDefault === 'function') e.preventDefault(); } catch (_) {}
      try { dialog.close('cancel'); } catch (_) {}
    });

    // 组装表单
    actions.appendChild(cancelBtn);
    actions.appendChild(resetBtn);
    actions.appendChild(saveBtn);

    form.appendChild(titleRow);
    form.appendChild(tokenLabel);
    form.appendChild(tokenInputRow);
    form.appendChild(modelLabelRow);
    form.appendChild(modelSelectWrapper);
    form.appendChild(modelManualInput);
    form.appendChild(hint);
    form.appendChild(actions);

    dialog.appendChild(form);
    document.body.appendChild(dialog);

    // 保存引用
    __authSettingsDialog = dialog;
    __authSettingsTokenInput = tokenInput;
    __authSettingsModelSelect = modelSelect;
    __authSettingsModelInput = modelInput;
    __modelToggleBtn = modelToggleBtn;
    __modelRefreshBtn = modelRefreshBtn;
    __modelSelectWrapper = modelSelectWrapper;
    __modelManualInput = modelManualInput;

    // 重写 showModal 以加载模型
    const originalShowModal = dialog.showModal.bind(dialog);
    dialog.showModal = () => {
      // 重置状态
      __useManualInput = false;
      modelToggleBtn.textContent = '手动输入';
      modelSelectWrapper.style.display = 'flex';
      modelManualInput.classList.remove('show');

      // 设置初始值
      tokenInput.value = String(getStoredToken() || '');
      const currentModelValue = String(getStoredModel() || '');
      modelInput.value = currentModelValue === DEFAULT_API_MODEL ? '' : currentModelValue;

      // 加载模型列表
      loadModelList();

      originalShowModal();
      setTimeout(() => {
        try {
          tokenInput.focus();
          tokenInput.select();
        } catch (_) {}
      }, 0);
    };

    return { dialog, tokenInput, modelSelect, modelInput };
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

      dialogInfo.dialog.showModal();
      return;
    }

    // 降级到 prompt
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
