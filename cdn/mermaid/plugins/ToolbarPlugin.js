/**
 * Toolbar Plugin
 * Adds toolbar UI to diagrams
 */

function createToolbarStyle() {
  const style = document.createElement('style');
  style.textContent = `
    .mermaid-toolbar {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 10;
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
    }
    .mermaid-toolbar.visible {
      opacity: 1;
      pointer-events: auto;
    }
    .mermaid-toolbar-btn {
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid #475569;
      border-radius: 6px;
      color: #e2e8f0;
      padding: 6px 10px;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .mermaid-toolbar-btn:hover {
      background: rgba(59, 130, 246, 0.3);
      border-color: #3b82f6;
    }
  `;
  document.head.appendChild(style);
  return style;
}

let _styleInjected = false;

export const ToolbarPlugin = {
  name: 'toolbar',
  version: '1.0.0',

  onInit() {
    if (!_styleInjected) {
      createToolbarStyle();
      _styleInjected = true;
    }
  },

  afterRender({ diagram, code, renderer }) {
    const wrapper = diagram.parentElement;
    if (!wrapper) return;

    // 确保wrapper是relative定位
    if (window.getComputedStyle(wrapper).position === 'static') {
      wrapper.style.position = 'relative';
    }

    // 检查是否已有工具栏
    let toolbar = wrapper.querySelector('.mermaid-toolbar');
    if (toolbar) return;

    // 创建工具栏
    toolbar = document.createElement('div');
    toolbar.className = 'mermaid-toolbar';
    toolbar.setAttribute('data-testid', 'mermaid-toolbar');

    // 悬停显示/隐藏
    wrapper.addEventListener('mouseenter', () => {
      toolbar.classList.add('visible');
    });
    wrapper.addEventListener('mouseleave', () => {
      toolbar.classList.remove('visible');
    });

    wrapper.appendChild(toolbar);
  }
};