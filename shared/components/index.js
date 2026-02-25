/**
 * 通用组件库入口（增强版）
 * author: liangliang
 * 说明：提供组件创建和管理的辅助函数 - 整合 YiWeb 组件特性
 * 新增：yiButton/yiLoading/yiModal/yiTag 等组件的增强功能
 */

import { generateId, escapeHtml, sleep } from '../utils/index.js';

// ============================================
// 按钮组件 - 增强版
// ============================================

/**
 * 创建按钮 HTML - 增强版
 * 支持：渐变背景、波纹效果、加载状态、多种尺寸变体
 */
export function createButton(options = {}) {
  const {
    text = '',
    variant = 'primary',
    size = 'md',
    icon = '',
    disabled = false,
    loading = false,
    className = '',
    onclick = null,
    type = 'button',
    ripple = false,
    pulse = false,
    ...attrs
  } = options;

  const classes = ['btn'];
  if (variant) classes.push(`btn-${variant}`);
  if (size && size !== 'md') {
    classes.push(size === 'sm' || size === 'small' ? 'btn-small' : '');
    classes.push(size === 'lg' || size === 'large' ? 'btn-large' : '');
  }
  if (ripple) classes.push('btn-ripple');
  if (pulse) classes.push('btn-pulse');
  if (loading) classes.push('btn-loading');
  if (className) classes.push(className);

  const iconHtml = icon && !loading ? `<span class="btn-icon-content">${icon}</span>` : '';
  const textHtml = text ? `<span class="btn-text">${text}</span>` : '';
  const loadingHtml = loading ? '<span class="spinner spinner-sm"></span>' : '';

  const extraAttrs = Object.entries(attrs)
    .map(([key, value]) => `${key}="${escapeHtml(String(value))}"`)
    .join(' ');

  return `
    <button
      type="${type}"
      class="${classes.join(' ')}"
      ${disabled || loading ? 'disabled aria-disabled="true"' : ''}
      ${onclick ? `onclick="${onclick}"` : ''}
      ${extraAttrs}
    >
      ${loading ? loadingHtml : iconHtml}
      ${textHtml}
    </button>
  `;
}

/**
 * 创建按钮组
 */
export function createButtonGroup(buttons = [], options = {}) {
  const { className = '' } = options;
  const buttonsHtml = buttons.map(btn => createButton(btn)).join('');
  return `<div class="btn-group ${className}">${buttonsHtml}</div>`;
}

// ============================================
// 卡片组件
// ============================================

/**
 * 创建卡片 HTML
 */
export function createCard(options = {}) {
  const {
    header = null,
    body = '',
    footer = null,
    variant = 'default',
    className = '',
    hoverable = false,
    ...attrs
  } = options;

  const classes = ['card'];
  if (variant && variant !== 'default') classes.push(`card-${variant}`);
  if (hoverable) classes.push('card-hover');
  if (className) classes.push(className);

  const extraAttrs = Object.entries(attrs)
    .map(([key, value]) => `${key}="${escapeHtml(String(value))}"`)
    .join(' ');

  const headerHtml = header ? `<div class="card-header">${header}</div>` : '';
  const footerHtml = footer ? `<div class="card-footer">${footer}</div>` : '';

  return `
    <div class="${classes.join(' ')}" ${extraAttrs}>
      ${headerHtml}
      <div class="card-body">${body}</div>
      ${footerHtml}
    </div>
  `;
}

// ============================================
// 标签组件 - 增强版
// ============================================

/**
 * 创建标签 HTML - 增强版
 */
export function createTag(options = {}) {
  const {
    text = '',
    variant = 'primary',
    icon = '',
    size = 'md',
    clickable = false,
    active = false,
    disabled = false,
    className = '',
    onclick = null,
    ...attrs
  } = options;

  const classes = ['tag'];
  if (variant) classes.push(`tag-${variant}`);
  if (size && size !== 'md') {
    classes.push(size === 'sm' || size === 'small' ? 'tag-small' : '');
    classes.push(size === 'lg' || size === 'large' ? 'tag-large' : '');
  }
  if (clickable) classes.push('tag-clickable');
  if (active) classes.push('tag-active');
  if (disabled) classes.push('tag-disabled');
  if (className) classes.push(className);

  const extraAttrs = Object.entries(attrs)
    .map(([key, value]) => `${key}="${escapeHtml(String(value))}"`)
    .join(' ');

  const iconHtml = icon ? `<span class="tag-icon">${icon}</span>` : '';

  return `
    <span
      class="${classes.join(' ')}"
      ${disabled ? 'aria-disabled="true"' : ''}
      ${onclick ? `onclick="${onclick}"` : ''}
      ${extraAttrs}
    >
      ${iconHtml}
      ${escapeHtml(text)}
    </span>
  `;
}

// ============================================
// 提示/Alert 组件
// ============================================

/**
 * 创建提示 HTML
 */
export function createAlert(options = {}) {
  const {
    message = '',
    title = '',
    variant = 'info',
    dismissible = false,
    icon = null,
    id = null,
    className = '',
  } = options;

  const alertId = id || generateId('alert');
  const classes = ['alert', `alert-${variant}`];
  if (className) classes.push(className);

  const defaultIcons = {
    info: '<svg class="alert-icon" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>',
    success: '<svg class="alert-icon" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
    warning: '<svg class="alert-icon" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
    error: '<svg class="alert-icon" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414-1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>'
  };

  const iconHtml = icon || defaultIcons[variant] || defaultIcons.info;
  const titleHtml = title ? `<div class="alert-title">${escapeHtml(title)}</div>` : '';
  const messageHtml = message ? `<div class="alert-message">${escapeHtml(message)}</div>` : '';

  return `
    <div id="${alertId}" class="${classes.join(' ')}" role="alert">
      ${iconHtml}
      <div class="alert-content">
        ${titleHtml}
        ${messageHtml}
      </div>
      ${dismissible ? `
        <button class="alert-close" onclick="document.getElementById('${alertId}').remove()" aria-label="关闭">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      ` : ''}
    </div>
  `;
}

// ============================================
// 加载/Spinner 组件 - 增强版
// ============================================

/**
 * 创建加载旋转器 HTML - 量子美学双环
 */
export function createSpinner(options = {}) {
  const { size = 'md', className = '', type = 'spinner' } = options;

  const sizeClasses = {
    sm: 'small',
    small: 'small',
    md: '',
    lg: 'large',
    large: 'large'
  };

  const classes = ['loading-spinner'];
  if (sizeClasses[size]) classes.push(sizeClasses[size]);
  if (className) classes.push(className);

  if (type === 'dots') {
    return `
      <div class="loading-dots ${className}">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    `;
  }

  if (type === 'pulse') {
    return `<div class="loading-pulse ${className}"></div>`;
  }

  if (type === 'wave') {
    return `
      <div class="loading-wave ${className}">
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
      </div>
    `;
  }

  return `<div class="${classes.join(' ')}"></div>`;
}

/**
 * 创建加载容器（带文字）
 */
export function createLoadingContainer(options = {}) {
  const { text = '加载中...', spinnerType = 'spinner', className = '' } = options;
  return `
    <div class="loading-container ${className}">
      ${createSpinner({ type: spinnerType })}
      ${text ? `<p>${escapeHtml(text)}</p>` : ''}
    </div>
  `;
}

/**
 * 显示全局加载指示器
 */
let globalLoadingEl = null;

export function showGlobalLoading(text = '加载中...') {
  if (globalLoadingEl) {
    hideGlobalLoading();
  }

  globalLoadingEl = document.createElement('div');
  globalLoadingEl.className = 'loading-indicator show';
  globalLoadingEl.innerHTML = `
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <p class="loading-text">${escapeHtml(text)}</p>
    </div>
  `;
  document.body.appendChild(globalLoadingEl);
}

export function hideGlobalLoading() {
  if (globalLoadingEl) {
    globalLoadingEl.classList.remove('show');
    setTimeout(() => {
      if (globalLoadingEl && globalLoadingEl.parentNode) {
        globalLoadingEl.parentNode.removeChild(globalLoadingEl);
      }
      globalLoadingEl = null;
    }, 200);
  }
}

/**
 * 创建骨架屏
 */
export function createSkeleton(options = {}) {
  const { type = 'text', lines = 3, className = '' } = options;

  if (type === 'avatar') {
    return `<div class="skeleton skeleton-avatar ${className}"></div>`;
  }

  if (type === 'button') {
    return `<div class="skeleton skeleton-button ${className}"></div>`;
  }

  let html = '';
  for (let i = 0; i < lines; i++) {
    const widthClass = i === lines - 1 ? 'short' : (i === 0 ? 'long' : 'medium');
    html += `<div class="skeleton skeleton-text ${widthClass}"></div>`;
  }
  return `<div class="${className}">${html}</div>`;
}

/**
 * 创建进度条
 */
export function createProgress(options = {}) {
  const { value = 0, striped = false, animated = false, className = '' } = options;

  const classes = ['progress'];
  if (striped || animated) classes.push('progress-striped');
  if (className) classes.push(className);

  return `
    <div class="${classes.join(' ')}">
      <div class="progress-bar" style="width: ${Math.max(0, Math.min(100, value))}%"></div>
    </div>
  `;
}

// ============================================
// 模态框组件 - 增强版
// ============================================

/**
 * 创建模态框 HTML - 增强版
 */
export function createModal(options = {}) {
  const {
    title = '',
    content = '',
    footer = null,
    size = 'md',
    id = null,
    closeOnOverlay = true,
    closeOnEsc = true,
    className = '',
  } = options;

  const modalId = id || generateId('modal');
  const sizeClasses = { sm: 'modal-sm', md: 'modal-md', lg: 'modal-lg', xl: 'modal-xl', full: 'modal-full' };

  const classes = ['modal', sizeClasses[size] || sizeClasses.md];
  if (className) classes.push(className);

  const footerHtml = footer !== null
    ? `<div class="modal-footer">${footer}</div>`
    : '';

  const closeOnOverlayAttr = closeOnOverlay
    ? `onclick="if(event.target === this || event.target.classList.contains('modal-overlay')) closeModal('${modalId}')"`
    : '';

  const closeOnEscAttr = closeOnEsc
    ? `data-close-on-esc="true"`
    : '';

  return `
    <div id="${modalId}" class="modal-overlay" ${closeOnOverlayAttr} ${closeOnEscAttr} style="display: none;" role="dialog" aria-modal="true">
      <div class="${classes.join(' ')}">
        <div class="modal-header">
          <h3 class="modal-title">${escapeHtml(title)}</h3>
          <button class="modal-close" onclick="closeModal('${modalId}')" aria-label="关闭">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">${content}</div>
        ${footerHtml}
      </div>
    </div>
  `;
}

/**
 * 显示模态框 - 增强版
 */
export function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // ESC 关闭支持
    const closeOnEsc = modal.dataset.closeOnEsc === 'true';
    if (closeOnEsc) {
      const handler = (e) => {
        if (e.key === 'Escape') {
          closeModal(id);
          document.removeEventListener('keydown', handler);
        }
      };
      modal._escHandler = handler;
      document.addEventListener('keydown', handler);
    }
  }
}

/**
 * 关闭模态框 - 增强版
 */
export function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';

    if (modal._escHandler) {
      document.removeEventListener('keydown', modal._escHandler);
      delete modal._escHandler;
    }
  }
}

/**
 * 确认对话框
 */
export async function confirmModal(options = {}) {
  const {
    title = '确认',
    message = '确定要执行此操作吗？',
    confirmText = '确定',
    cancelText = '取消',
    confirmVariant = 'primary',
    onConfirm = null,
    onCancel = null
  } = options;

  const id = generateId('confirm');
  const modalHtml = createModal({
    id,
    title,
    content: `<p>${escapeHtml(message)}</p>`,
    footer: `
      <button class="btn btn-secondary" onclick="closeModal('${id}')">${escapeHtml(cancelText)}</button>
      <button class="btn btn-${confirmVariant}" id="${id}-confirm">${escapeHtml(confirmText)}</button>
    `
  });

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  openModal(id);

  return new Promise((resolve) => {
    const confirmBtn = document.getElementById(`${id}-confirm`);
    const modal = document.getElementById(id);

    const cleanup = () => {
      closeModal(id);
      setTimeout(() => modal.remove(), 300);
    };

    const handleConfirm = () => {
      cleanup();
      if (onConfirm) onConfirm();
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      if (onCancel) onCancel();
      resolve(false);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('modal-overlay')) {
        handleCancel();
      }
    });

    // ESC 取消
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        handleCancel();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  });
}

// ============================================
// 空状态组件
// ============================================

/**
 * 创建空状态 HTML
 */
export function createEmptyState(options = {}) {
  const {
    icon = null,
    title = '暂无数据',
    description = '',
    action = null,
    className = '',
  } = options;

  const defaultIcon = `
    <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
    </svg>
  `;

  const classes = ['empty-state'];
  if (className) classes.push(className);

  const iconHtml = icon || defaultIcon;
  const titleHtml = `<div class="empty-title">${escapeHtml(title)}</div>`;
  const descHtml = description ? `<div class="empty-description">${escapeHtml(description)}</div>` : '';
  const actionHtml = action ? `<div class="empty-actions">${action}</div>` : '';

  return `
    <div class="${classes.join(' ')}">
      ${iconHtml}
      ${titleHtml}
      ${descHtml}
      ${actionHtml}
    </div>
  `;
}

// ============================================
// Toast/Message 组件 - 增强版（带渐变动画）
// ============================================

const messageContainer = {
  element: null,
  position: 'top-right'
};

function ensureMessageContainer(position = 'top-right') {
  if (messageContainer.element && messageContainer.position === position) {
    return messageContainer.element;
  }

  if (messageContainer.element) {
    messageContainer.element.remove();
  }

  const container = document.createElement('div');
  container.className = 'message-container';

  const positions = {
    'top-right': { top: '24px', right: '24px', left: 'auto', bottom: 'auto', alignItems: 'flex-end' },
    'top-left': { top: '24px', left: '24px', right: 'auto', bottom: 'auto', alignItems: 'flex-start' },
    'top-center': { top: '24px', left: '50%', right: 'auto', bottom: 'auto', transform: 'translateX(-50%)', alignItems: 'center' },
    'bottom-right': { bottom: '24px', right: '24px', left: 'auto', top: 'auto', alignItems: 'flex-end' },
    'bottom-left': { bottom: '24px', left: '24px', right: 'auto', top: 'auto', alignItems: 'flex-start' },
    'bottom-center': { bottom: '24px', left: '50%', right: 'auto', top: 'auto', transform: 'translateX(-50%)', alignItems: 'center' }
  };

  const pos = positions[position] || positions['top-right'];
  Object.assign(container.style, pos);

  document.body.appendChild(container);
  messageContainer.element = container;
  messageContainer.position = position;
  return container;
}

/**
 * 显示消息 Toast - 增强版（带渐变、滑入动画）
 */
export function showMessage(message, options = {}) {
  const {
    type = 'info',
    duration = 3000,
    position = 'top-right',
    closable = true,
    icon = null,
    onClose = null
  } = typeof options === 'string' ? { type: options } : options;

  const container = ensureMessageContainer(position);
  const id = generateId('message');

  const icons = {
    success: '<svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
    error: '<svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414-1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>',
    warning: '<svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
    info: '<svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>'
  };

  const iconHtml = icon || icons[type] || icons.info;

  const msgEl = document.createElement('div');
  msgEl.id = id;
  msgEl.className = `message message-${type} animate-in`;
  msgEl.innerHTML = `
    <div>
      <i>${iconHtml}</i>
      <span>${escapeHtml(message)}</span>
    </div>
    ${closable ? `<button class="message-close-btn" aria-label="关闭">×</button>` : ''}
    ${duration > 0 ? `<div class="message-progress" style="animation: progress-stripes ${duration}ms linear forwards; transform: scaleX(0);"></div>` : ''}
  `;

  container.appendChild(msgEl);

  // 触发显示动画
  requestAnimationFrame(() => {
    msgEl.classList.add('message-visible');
    const progress = msgEl.querySelector('.message-progress');
    if (progress) {
      progress.style.transform = 'scaleX(1)';
      progress.style.transition = `transform ${duration}ms linear`;
    }
  });

  let timeoutId = null;

  const close = () => {
    if (timeoutId) clearTimeout(timeoutId);
    msgEl.classList.remove('message-visible');
    msgEl.classList.add('message-exiting', 'animate-out');
    setTimeout(() => {
      if (msgEl.parentNode) {
        msgEl.parentNode.removeChild(msgEl);
      }
      if (onClose) onClose();
    }, 300);
  };

  if (closable) {
    const closeBtn = msgEl.querySelector('.message-close-btn');
    closeBtn.addEventListener('click', close);
  }

  msgEl.addEventListener('click', (e) => {
    if (e.target === msgEl || !closable) {
      close();
    }
  });

  if (duration > 0) {
    timeoutId = setTimeout(close, duration);
  }

  return { id, close };
}

/**
 * Toast 提示（兼容旧接口）
 */
export function showToast(message, type = 'info', duration = 3000) {
  return showMessage(message, { type, duration, position: 'bottom-center' });
}

// 便捷方法
export const message = {
  success: (msg, opts) => showMessage(msg, { type: 'success', ...opts }),
  error: (msg, opts) => showMessage(msg, { type: 'error', ...opts }),
  warning: (msg, opts) => showMessage(msg, { type: 'warning', ...opts }),
  info: (msg, opts) => showMessage(msg, { type: 'info', ...opts }),
  confirm: confirmModal
};

// ============================================
// 输入框组件
// ============================================

/**
 * 创建输入框 HTML
 */
export function createInput(options = {}) {
  const {
    type = 'text',
    placeholder = '',
    value = '',
    size = 'md',
    disabled = false,
    icon = null,
    iconRight = null,
    className = '',
    id = null,
    name = null,
    ...attrs
  } = options;

  const inputId = id || generateId('input');
  const classes = ['input'];
  if (size && size !== 'md') classes.push(`input-${size}`);
  if (className) classes.push(className);

  const extraAttrs = Object.entries(attrs)
    .map(([key, val]) => `${key}="${escapeHtml(String(val))}"`)
    .join(' ');

  const inputHtml = `
    <input
      type="${type}"
      id="${inputId}"
      ${name ? `name="${name}"` : ''}
      class="${classes.join(' ')}"
      placeholder="${escapeHtml(placeholder)}"
      value="${escapeHtml(value)}"
      ${disabled ? 'disabled' : ''}
      ${extraAttrs}
    />
  `;

  if (!icon && !iconRight) {
    return inputHtml;
  }

  const iconLeftHtml = icon ? `<span class="input-icon">${icon}</span>` : '';
  const iconRightHtml = iconRight ? `<span class="input-icon input-icon-right">${iconRight}</span>` : '';
  const wrapperClasses = ['input-wrapper'];
  if (iconRight) wrapperClasses.push('input-right');

  return `
    <div class="${wrapperClasses.join(' ')}">
      ${iconLeftHtml}
      ${inputHtml}
      ${iconRightHtml}
    </div>
  `;
}

// ============================================
// 导出
// ============================================

export default {
  // 按钮
  createButton,
  createButtonGroup,

  // 卡片
  createCard,

  // 标签
  createTag,

  // 提示
  createAlert,

  // 加载
  createSpinner,
  createLoadingContainer,
  showGlobalLoading,
  hideGlobalLoading,
  createSkeleton,
  createProgress,

  // 模态框
  createModal,
  openModal,
  closeModal,
  confirmModal,

  // 空状态
  createEmptyState,

  // Toast/Message
  showToast,
  showMessage,
  message,

  // 输入框
  createInput,

  // 别名 - 兼容 yi 组件命名
  yiButton: createButton,
  yiTag: createTag,
  yiModal: createModal,
  yiLoading: createSpinner,
  yiAlert: createAlert
};
