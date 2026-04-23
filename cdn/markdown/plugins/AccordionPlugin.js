/**
 * Accordion Plugin
 * Handles <Accordion> and <AccordionGroup> components
 */

const iconMap = {
  'wand-magic-sparkles': '✨',
  'hammer': '🔨',
  'wrench': '🔧',
  'lightbulb': '💡',
  'info': 'ℹ️',
  'warning': '⚠️',
  'error': '❌',
  'success': '✅',
  'check': '✓',
  'star': '⭐',
  'fire': '🔥',
  'rocket': '🚀',
  'code': '💻',
  'terminal': '⌨️',
  'folder': '📁',
  'file': '📄',
  'document': '📝',
  'search': '🔍',
  'settings': '⚙️',
  'gear': '⚙️',
  'user': '👤',
  'users': '👥',
  'heart': '❤️',
  'thumbs-up': '👍',
  'thumbs-down': '👎',
  'link': '🔗',
  'lock': '🔒',
  'unlock': '🔓',
  'key': '🔑',
  'bell': '🔔',
  'clock': '⏰',
  'calendar': '📅',
  'tag': '🏷️',
  'bookmark': '🔖',
  'flag': '🚩'
};

function getIconEmoji(iconName) {
  if (!iconName) return '';
  const name = String(iconName).toLowerCase().trim();
  return iconMap[name] || '';
}

function escapeHtml(str) {
  if (typeof str !== 'string' && str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const AccordionPlugin = {
  name: 'accordion',
  version: '1.0.0',
  priority: 110,

  _stylesInjected: false,

  _injectStyles() {
    if (this._stylesInjected || typeof document === 'undefined') return;
    this._stylesInjected = true;

    try {
      const existing = document.getElementById('md-accordion-styles');
      if (existing) return;

      const style = document.createElement('style');
      style.id = 'md-accordion-styles';
      style.textContent = `
        .md-accordion-group {
          margin: 16px 0;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(128, 128, 128, 0.2);
          background: rgba(128, 128, 128, 0.05);
        }
        .md-accordion {
          border-bottom: 1px solid rgba(128, 128, 128, 0.15);
        }
        .md-accordion:last-child {
          border-bottom: none;
        }
        .md-accordion-header { margin: 0; }
        .md-accordion-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          font-size: 15px;
          font-weight: 600;
          color: inherit;
          transition: background 0.2s ease;
        }
        .md-accordion-trigger:hover {
          background: rgba(128, 128, 128, 0.08);
        }
        .md-accordion-trigger:focus {
          outline: none;
          background: rgba(59, 130, 246, 0.1);
        }
        .md-accordion-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }
        .md-accordion-icon {
          font-size: 18px;
          line-height: 1;
          flex-shrink: 0;
        }
        .md-accordion-title { line-height: 1.4; }
        .md-accordion-chevron {
          font-size: 12px;
          line-height: 1;
          flex-shrink: 0;
          transition: transform 0.2s ease;
          color: rgba(128, 128, 128, 0.6);
        }
        .md-accordion.is-open .md-accordion-chevron {
          transform: rotate(180deg);
        }
        .md-accordion-panel { overflow: hidden; }
        .md-accordion-panel[hidden] { display: none; }
        .md-accordion-content {
          padding: 0 16px 16px 16px;
        }
        .md-accordion-content > :first-child { margin-top: 0; }
        .md-accordion-content > :last-child { margin-bottom: 0; }
        .md-accordion-content p { margin: 8px 0; }
        .md-accordion-content ul,
        .md-accordion-content ol {
          margin: 8px 0;
          padding-left: 24px;
        }
        .md-accordion-content code {
          background: rgba(0, 0, 0, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.9em;
        }
      `.trim();
      document.head.appendChild(style);
    } catch (_) { }
  },

  preprocess(markdown) {
    this._injectStyles();

    const text = String(markdown || '');
    if (!text.includes('<Accordion') && !text.includes('<accordion')) return text;

    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const result = [];
    const stack = [];
    const codeBlockStack = []; // 使用堆栈支持嵌套代码块

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('`')) {
        const match = trimmedLine.match(/^(`+)/);
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

      const closingGroupMatch = trimmedLine.match(/^<\/(AccordionGroup|accordiongroup)\s*>$/i);
      if (closingGroupMatch && stack.length > 0 && stack[stack.length - 1].type === 'group') {
        stack.pop();
        result.push('</div>');
        continue;
      }

      const closingAccordionMatch = trimmedLine.match(/^<\/(Accordion|accordion)\s*>$/i);
      if (closingAccordionMatch && stack.length > 0 && stack[stack.length - 1].type === 'accordion') {
        stack.pop();
        result.push('</div></div>');
        continue;
      }

      const openingGroupMatch = trimmedLine.match(/^<(AccordionGroup|accordiongroup)(\s[^>]*)?\s*(\/)?>$/i);
      if (openingGroupMatch) {
        const isSelfClosing = !!openingGroupMatch[3];
        stack.push({ type: 'group' });
        result.push('<div class="md-accordion-group">');
        if (isSelfClosing) {
          stack.pop();
          result.push('</div>');
        }
        continue;
      }

      const openingAccordionMatch = trimmedLine.match(/^<(Accordion|accordion)(\s[^>]*)?\s*(\/)?>$/i);
      if (openingAccordionMatch) {
        const attrs = openingAccordionMatch[2] || '';
        const isSelfClosing = !!openingAccordionMatch[3];

        const titleMatch = attrs.match(/title=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
        const iconMatch = attrs.match(/icon=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);

        const title = titleMatch ? (titleMatch[1] || titleMatch[2] || titleMatch[3] || '') : '';
        const icon = iconMatch ? (iconMatch[1] || iconMatch[2] || iconMatch[3] || '') : '';
        const iconEmoji = getIconEmoji(icon);
        const accordionId = `accordion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        stack.push({ type: 'accordion' });

        let html = `<div class="md-accordion" data-accordion-id="${escapeHtml(accordionId)}">`;
        html += `<div class="md-accordion-header">`;
        html += `<button class="md-accordion-trigger" type="button" aria-expanded="false">`;
        html += `<span class="md-accordion-title-wrap">`;
        if (iconEmoji) {
          html += `<span class="md-accordion-icon">${iconEmoji}</span>`;
        }
        if (title) {
          html += `<span class="md-accordion-title">${escapeHtml(title)}</span>`;
        }
        html += `</span>`;
        html += `<span class="md-accordion-chevron">▼</span>`;
        html += `</button>`;
        html += `</div>`;
        html += `<div class="md-accordion-panel" hidden>`;
        html += `<div class="md-accordion-content">`;

        result.push(html);

        if (isSelfClosing) {
          stack.pop();
          result.push('</div></div></div>');
        }
        continue;
      }

      result.push(line);
    }

    while (stack.length > 0) {
      const item = stack.pop();
      if (item.type === 'accordion') {
        result.push('</div></div></div>');
      } else if (item.type === 'group') {
        result.push('</div>');
      }
    }

    return result.join('\n');
  }
};
