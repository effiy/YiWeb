/**
 * Containers Plugin
 * Handles :::tip, :::warning, :::danger, etc. container syntax
 */

const containerTypes = {
  '': { class: 'md-container md-container-default', icon: '', title: '' },
  'tip': { class: 'md-container md-container-tip', icon: '💡', title: '提示' },
  'warning': { class: 'md-container md-container-warning', icon: '⚠️', title: '警告' },
  'danger': { class: 'md-container md-container-danger', icon: '❌', title: '危险' },
  'note': { class: 'md-container md-container-note', icon: '📝', title: '注意' },
  'info': { class: 'md-container md-container-info', icon: 'ℹ️', title: '信息' },
  'success': { class: 'md-container md-container-success', icon: '✅', title: '成功' }
};

function escapeHtml(str) {
  if (typeof str !== 'string' && str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const ContainersPlugin = {
  name: 'containers',
  version: '1.0.0',
  priority: 100,

  _stylesInjected: false,

  _injectStyles() {
    if (this._stylesInjected || typeof document === 'undefined') return;
    this._stylesInjected = true;

    try {
      const existing = document.getElementById('md-container-styles');
      if (existing) return;

      const style = document.createElement('style');
      style.id = 'md-container-styles';
      style.textContent = `
        .md-container {
          margin: 16px 0;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid transparent;
          position: relative;
        }
        .md-container-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          font-weight: 600;
          font-size: 14px;
        }
        .md-container-icon {
          font-size: 16px;
          line-height: 1;
          flex-shrink: 0;
        }
        .md-container-title {
          line-height: 1.4;
        }
        .md-container-body {
          padding: 12px 16px 14px;
        }
        .md-container-body > :first-child { margin-top: 0; }
        .md-container-body > :last-child { margin-bottom: 0; }
        .md-container-body p { margin: 8px 0; }
        .md-container-body ul,
        .md-container-body ol {
          margin: 8px 0;
          padding-left: 24px;
        }
        .md-container-body code {
          background: rgba(0, 0, 0, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.9em;
        }
        .md-container-default {
          background: rgba(128, 128, 128, 0.1);
          border-color: rgba(128, 128, 128, 0.2);
        }
        .md-container-default .md-container-header {
          background: rgba(128, 128, 128, 0.15);
        }
        .md-container-tip {
          background: rgba(87, 186, 143, 0.1);
          border-color: rgba(87, 186, 143, 0.3);
        }
        .md-container-tip .md-container-header {
          background: rgba(87, 186, 143, 0.18);
          color: #41b583;
        }
        .md-container-warning {
          background: rgba(245, 158, 11, 0.1);
          border-color: rgba(245, 158, 11, 0.35);
        }
        .md-container-warning .md-container-header {
          background: rgba(245, 158, 11, 0.2);
          color: #d99009;
        }
        .md-container-danger {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.35);
        }
        .md-container-danger .md-container-header {
          background: rgba(239, 68, 68, 0.2);
          color: #e04444;
        }
        .md-container-note, .md-container-info {
          background: rgba(59, 130, 246, 0.1);
          border-color: rgba(59, 130, 246, 0.3);
        }
        .md-container-note .md-container-header,
        .md-container-info .md-container-header {
          background: rgba(59, 130, 246, 0.18);
          color: #3b82f6;
        }
        .md-container-success {
          background: rgba(34, 197, 94, 0.1);
          border-color: rgba(34, 197, 94, 0.35);
        }
        .md-container-success .md-container-header {
          background: rgba(34, 197, 94, 0.2);
          color: #16a34a;
        }
      `.trim();
      document.head.appendChild(style);
    } catch (_) { }
  },

  preprocess(markdown) {
    this._injectStyles();

    const text = String(markdown || '');
    if (!text.includes(':::')) return text;

    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const result = [];
    const stack = [];
    const codeBlockStack = []; // 使用堆栈支持嵌套代码块

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim().startsWith('`')) {
        const match = line.trim().match(/^(`+)/);
        if (match) {
          const fenceCount = match[1].length;
          if (fenceCount >= 3) {
            // 检查是否是闭合当前代码块的标签
            if (codeBlockStack.length > 0 && codeBlockStack[codeBlockStack.length - 1] === fenceCount) {
              codeBlockStack.pop();
            } else {
              // 开启新的代码块层级
              codeBlockStack.push(fenceCount);
            }
          }
        }
        result.push(line);
        continue;
      }

      if (codeBlockStack.length > 0) {
        result.push(line);
        continue;
      }

      const closingMatch = line.match(/^\s*:::\s*$/);
      if (closingMatch && stack.length > 0) {
        stack.pop();
        result.push('</div></div>');
        continue;
      }

      const openingMatch = line.match(/^\s*:::\s*(\w*)(?:\s+(.+?))?\s*$/);
      if (openingMatch) {
        const type = (openingMatch[1] || '').toLowerCase();
        const customTitle = openingMatch[2] || '';
        const config = containerTypes[type] || containerTypes[''];
        const title = customTitle || config.title;

        stack.push({ type, config, hasHeader: !!(title || config.icon) });

        let html = `<div class="${config.class}">`;
        if (title || config.icon) {
          html += `<div class="md-container-header">`;
          if (config.icon) {
            html += `<span class="md-container-icon">${config.icon}</span>`;
          }
          if (title) {
            html += `<span class="md-container-title">${escapeHtml(title)}</span>`;
          }
          html += `</div>`;
        }
        html += `<div class="md-container-body">`;
        result.push(html);
        continue;
      }

      result.push(line);
    }

    while (stack.length > 0) {
      stack.pop();
      result.push('</div></div>');
    }

    return result.join('\n');
  }
};
