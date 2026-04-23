/**
 * Internal Link Plugin
 * Identifies and marks internal file links in markdown
 */

// 简单的 HTML 转义
function escapeHtml(str) {
  if (typeof str !== 'string' && str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 从路径中提取文件名
function getFileName(path) {
  if (!path) return '';
  const p = String(path).replace(/\\/g, '/');
  return p.includes('/') ? p.substring(p.lastIndexOf('/') + 1) : p;
}

// 分离路径和 hash
function parseLinkHref(href) {
  if (!href) return { path: '', hash: '' };
  const h = String(href);
  const hashIndex = h.indexOf('#');
  if (hashIndex < 0) return { path: h, hash: '' };
  return {
    path: h.substring(0, hashIndex),
    hash: h.substring(hashIndex)
  };
}

// 判断是否是内部链接
function isInternalLink(href) {
  if (!href) return false;
  const h = String(href).trim();
  return h.startsWith('./') || h.startsWith('../') || h.startsWith('/') || h.startsWith('#');
}

// 解码 HTML 实体
function decodeHtmlEntities(text) {
  if (typeof text !== 'string' && text == null) return '';
  if (typeof document === 'undefined') return String(text);
  const textarea = document.createElement('textarea');
  textarea.innerHTML = String(text);
  return textarea.value;
}

// 创建代码块内的内部链接
function createCodeBlockLink(href, text) {
  const { path, hash } = parseLinkHref(href);
  const fileName = getFileName(path);
  const linkTitle = path ? `点击打开文件: ${fileName}` : '';

  return `<a href="${escapeHtml(href)}"
             class="md-internal-link"
             data-target-path="${escapeHtml(path)}"
             data-target-hash="${escapeHtml(hash)}"
             title="${escapeHtml(linkTitle)}">
           ${escapeHtml(text)}
         </a>`;
}

// 解析纯文本中的 Markdown 链接，返回替换后的 HTML
function parseMarkdownLinksInText(text) {
  if (typeof text !== 'string') return text;

  const result = [];
  let i = 0;
  let lastIndex = 0;

  while (i < text.length) {
    if (text[i] === '[' && (i === 0 || text[i-1] !== '\\')) {
      // 找到链接开始，先记录之前的文本
      result.push(text.substring(lastIndex, i));
      i++;

      // 解析链接文本，支持嵌套括号
      let linkText = '';
      let bracketDepth = 1;
      while (i < text.length && bracketDepth > 0) {
        if (text[i] === '[' && (i === 0 || text[i-1] !== '\\')) {
          bracketDepth++;
          linkText += text[i];
        } else if (text[i] === ']' && (i === 0 || text[i-1] !== '\\')) {
          bracketDepth--;
          if (bracketDepth > 0) linkText += text[i];
        } else {
          linkText += text[i];
        }
        i++;
      }

      // 检查是否有 (path) 部分
      if (i < text.length && text[i] === '(') {
        i++;
        // 跳过空白
        while (i < text.length && /\s/.test(text[i])) i++;

        // 解析路径
        let linkPath = '';
        let parenDepth = 1;
        while (i < text.length && parenDepth > 0) {
          if (text[i] === '(') {
            parenDepth++;
            linkPath += text[i];
          } else if (text[i] === ')') {
            parenDepth--;
            if (parenDepth > 0) linkPath += text[i];
          } else {
            linkPath += text[i];
          }
          i++;
        }

        // 处理相对路径（./ 或 ../ 开头，或者包含 / 的路径，或者有 .md/.markdown 等扩展名的文件）
        const trimmedPath = linkPath.trim();
        const isRelativePath =
          trimmedPath.startsWith('./') ||
          trimmedPath.startsWith('../') ||
          trimmedPath.includes('/') ||
          trimmedPath.endsWith('.md') ||
          trimmedPath.endsWith('.markdown') ||
          trimmedPath.endsWith('.js') ||
          trimmedPath.endsWith('.vue') ||
          trimmedPath.endsWith('.json');

        if (isRelativePath) {
          result.push(createCodeBlockLink(trimmedPath, linkText));
        } else {
          // 不是内部链接，恢复原样
          result.push(`[${linkText}](${linkPath})`);
        }
        lastIndex = i;
      } else {
        // 没有 (path) 部分，恢复原样
        result.push(`[${linkText}]`);
        lastIndex = i;
      }
    } else {
      i++;
    }
  }
  result.push(text.substring(lastIndex));
  return result.join('');
}

// 主入口：找到所有代码块并处理其中的链接
function replaceLinksInMarkdownCodeBlocks(html) {
  if (typeof html !== 'string' || !html) return html;
  if (typeof document === 'undefined' || typeof DOMParser === 'undefined') {
    return html;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 找到所有代码块（包括未指定语言的）
    const codeBlocks = doc.querySelectorAll('pre code');

    codeBlocks.forEach(codeBlock => {
      // 获取已转义的 HTML 内容
      const escapedContent = codeBlock.innerHTML;

      // 解码 HTML 实体得到纯文本
      const plainText = decodeHtmlEntities(escapedContent);

      // 解析并替换链接
      const processed = parseMarkdownLinksInText(plainText);

      // 设置回 innerHTML，SanitizePlugin 会在之后进行安全清理
      codeBlock.innerHTML = processed;
    });

    // 序列化回 HTML
    return doc.body.innerHTML;
  } catch (e) {
    console.warn('[InternalLinkPlugin] Failed to process code block links:', e);
    return html;
  }
}

// 样式注入
let _internalLinkStylesInjected = false;

const _injectInternalLinkStyles = () => {
  if (_internalLinkStylesInjected || typeof document === 'undefined') return;
  _internalLinkStylesInjected = true;

  try {
    const existing = document.getElementById('md-internal-link-styles');
    if (existing) return;

    const style = document.createElement('style');
    style.id = 'md-internal-link-styles';
    style.textContent = `
      .md-internal-link {
        color: #2563eb;
        text-decoration: none;
        border-bottom: 1px dashed rgba(37, 99, 235, 0.4);
        transition: all 0.15s ease;
        white-space: normal;
        display: inline;
      }
      .md-internal-link:hover {
        color: #1d4ed8;
        border-bottom-color: #1d4ed8;
        background: rgba(37, 99, 235, 0.05);
      }
      .md-internal-link::before {
        content: '📄';
        margin-right: 4px;
        font-size: 0.9em;
        opacity: 0.8;
      }
      /* 代码块内的链接样式优化 */
      pre code .md-internal-link {
        border-bottom: none;
        text-decoration: none;
        white-space: nowrap;
      }
      pre code .md-internal-link::before {
        content: '';
        margin-right: 0;
      }
      pre code .md-internal-link:hover {
        background: transparent;
        text-decoration: underline;
      }
    `.trim();
    document.head.appendChild(style);
  } catch (_) { }
};

// 事件监听初始化
let _internalLinkEventsBound = false;

const _bindInternalLinkEvents = () => {
  if (_internalLinkEventsBound || typeof document === 'undefined') return;
  _internalLinkEventsBound = true;

  document.addEventListener('click', (e) => {
    const target = e?.target;
    if (!target || typeof target.closest !== 'function') return;

    // 内部链接点击处理
    const internalLink = target.closest('.md-internal-link');
    if (internalLink) {
      e.preventDefault();

      const event = new CustomEvent('open-markdown-file', {
        bubbles: true,
        cancelable: true,
        detail: {
          targetPath: internalLink.getAttribute('data-target-path') || '',
          targetHash: internalLink.getAttribute('data-target-hash') || '',
          originalEvent: e
        }
      });

      internalLink.dispatchEvent(event);
    }
  }, { passive: false });
};

// 处理 DOM 中的代码块链接（供兼容层使用）
export const processCodeBlockLinks = (element) => {
  processCodeBlockLinksInDom(element);
};

// 统一初始化函数（供插件系统和兼容层使用）
export const initializeInternalLinks = () => {
  if (typeof document !== 'undefined') {
    setTimeout(() => {
      _injectInternalLinkStyles();
      _bindInternalLinkEvents();
    }, 0);
  }
};

// 处理 HTML 字符串中的代码块链接
export function processCodeBlockLinksInHtml(html) {
  if (typeof html !== 'string' || !html) return html;
  if (typeof document === 'undefined' || typeof DOMParser === 'undefined') {
    return html;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 找到所有代码块（包括未指定语言的）
    const codeBlocks = doc.querySelectorAll('pre code');

    codeBlocks.forEach(codeBlock => {
      // 获取已转义的 HTML 内容
      const escapedContent = codeBlock.innerHTML;

      // 解码 HTML 实体得到纯文本
      const plainText = decodeHtmlEntities(escapedContent);

      // 解析并替换链接
      const processed = parseMarkdownLinksInText(plainText);

      // 只有内容有变化时才更新
      if (processed !== plainText) {
        codeBlock.innerHTML = processed;
      }
    });

    return doc.body.innerHTML;
  } catch (e) {
    console.warn('[InternalLinkPlugin] Failed to process code block links in HTML:', e);
    return html;
  }
}

// 处理 DOM 中的代码块链接
function processCodeBlockLinksInDom(element) {
  if (!element || typeof element.querySelectorAll !== 'function') return;

  try {
    // 找到所有代码块（包括未指定语言的）
    const codeBlocks = element.querySelectorAll('pre code');

    codeBlocks.forEach(codeBlock => {
      // 获取已转义的 HTML 内容
      const escapedContent = codeBlock.innerHTML;

      // 解码 HTML 实体得到纯文本
      const plainText = decodeHtmlEntities(escapedContent);

      // 解析并替换链接
      const processed = parseMarkdownLinksInText(plainText);

      // 只有内容有变化时才更新
      if (processed !== plainText) {
        codeBlock.innerHTML = processed;
      }
    });
  } catch (e) {
    console.warn('[InternalLinkPlugin] Failed to process code block links in DOM:', e);
  }
}

export const InternalLinkPlugin = {
  name: 'internal-link',
  version: '1.0.0',
  priority: 50,  // 在 SanitizePlugin 之前执行 (SanitizePlugin priority 是 200)

  onInit(context) {
    initializeInternalLinks();
  },

  extendRenderer(renderer) {
    const originalLink = renderer.link.bind(renderer);

    renderer.link = (href, title, text) => {
      if (!isInternalLink(href)) {
        return originalLink(href, title, text);
      }

      const { path, hash } = parseLinkHref(href);
      const fileName = getFileName(path);
      const linkTitle = title || (path ? `点击打开文件: ${fileName}` : '');

      return `<a href="${escapeHtml(href)}"
                 class="md-internal-link"
                 data-target-path="${escapeHtml(path)}"
                 data-target-hash="${escapeHtml(hash)}"
                 title="${escapeHtml(linkTitle)}">
               ${text}
             </a>`;
    };
  },

  postprocess(html) {
    return html; // 不在这里处理，使用 onAfterRender
  },

  onAfterRender(element) {
    processCodeBlockLinksInDom(element);
  }
};
