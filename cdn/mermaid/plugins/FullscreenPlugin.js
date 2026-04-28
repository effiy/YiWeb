/**
 * Fullscreen Plugin
 * Adds fullscreen viewing capability
 */

function createFullscreenStyle() {
  const style = document.createElement('style');
  style.textContent = `
    .mermaid-fullscreen-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .mermaid-fullscreen-overlay.hidden {
      display: none;
    }
    .mermaid-fullscreen-overlay svg {
      max-width: 90vw;
      max-height: 90vh;
      width: auto;
      height: auto;
    }
    .mermaid-fullscreen-close {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid #475569;
      border-radius: 6px;
      color: #e2e8f0;
      padding: 8px 12px;
      font-size: 16px;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .mermaid-fullscreen-close:hover {
      background: rgba(59, 130, 246, 0.3);
      border-color: #3b82f6;
    }
  `;
  document.head.appendChild(style);
  return style;
}

let _styleInjected = false;
let _overlay = null;
let _escHandler = null;

function openFullscreen(diagram) {
  const svg = diagram.querySelector('svg');
  if (!svg) return;

  // 创建overlay
  if (!_overlay) {
    _overlay = document.createElement('div');
    _overlay.className = 'mermaid-fullscreen-overlay hidden';
    _overlay.setAttribute('data-testid', 'mermaid-fullscreen-overlay');

    const closeBtn = document.createElement('button');
    closeBtn.className = 'mermaid-fullscreen-close';
    closeBtn.setAttribute('data-testid', 'mermaid-fullscreen-close-btn');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', closeFullscreen);

    _overlay.appendChild(closeBtn);
    _overlay.addEventListener('click', (e) => {
      if (e.target === _overlay) closeFullscreen();
    });

    document.body.appendChild(_overlay);
  }

  // 克隆SVG并添加到overlay
  const existingSvg = _overlay.querySelector('svg');
  if (existingSvg) existingSvg.remove();

  const clonedSvg = svg.cloneNode(true);
  _overlay.appendChild(clonedSvg);

  // ESC键处理
  if (_escHandler) {
    document.removeEventListener('keydown', _escHandler);
  }
  _escHandler = (e) => {
    if (e.key === 'Escape') closeFullscreen();
  };
  document.addEventListener('keydown', _escHandler);

  // 显示overlay
  _overlay.classList.remove('hidden');
}

function closeFullscreen() {
  if (!_overlay) return;

  _overlay.classList.add('hidden');

  if (_escHandler) {
    document.removeEventListener('keydown', _escHandler);
    _escHandler = null;
  }

  const svg = _overlay.querySelector('svg');
  if (svg) svg.remove();
}

export const FullscreenPlugin = {
  name: 'fullscreen',
  version: '1.0.0',

  onInit() {
    if (!_styleInjected) {
      createFullscreenStyle();
      _styleInjected = true;
    }
  },

  afterRender({ diagram, code, renderer }) {
    const wrapper = diagram.parentElement;
    if (!wrapper) return;

    const toolbar = wrapper.querySelector('.mermaid-toolbar');
    if (!toolbar) return;

    // 检查是否已有全屏按钮
    let btn = toolbar.querySelector('[data-action="fullscreen"]');
    if (btn) return;

    // 创建全屏按钮
    btn = document.createElement('button');
    btn.className = 'mermaid-toolbar-btn';
    btn.setAttribute('data-testid', 'mermaid-toolbar-fullscreen-btn');
    btn.setAttribute('data-action', 'fullscreen');
    btn.setAttribute('aria-label', '全屏查看');
    btn.textContent = '⛶';

    btn.addEventListener('click', () => openFullscreen(diagram));

    toolbar.appendChild(btn);
  }
};