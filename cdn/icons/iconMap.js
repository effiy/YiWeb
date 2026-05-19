/**
 * 统一图标映射表 — YiWeb 图标单一真相源
 * 语义名 → Font Awesome CSS 类
 * 新增图标只需在此添加一行；更换图标库只改此文件。
 */
export const iconMap = {
  // ── 操作 ──
  'search': 'fas fa-search',
  'refresh': 'fas fa-sync-alt',
  'close': 'fas fa-times',
  'download': 'fas fa-download',
  'upload': 'fas fa-upload',
  'copy': 'fas fa-copy',
  'edit': 'fas fa-pen',
  'add': 'fas fa-plus',
  'delete': 'fas fa-ban',
  'save': 'fas fa-save',
  'redo': 'fas fa-redo',
  'rotate-right': 'fas fa-rotate-right',
  'exchange': 'fas fa-exchange-alt',
  'i-cursor': 'fas fa-i-cursor',

  // ── 导航 ──
  'chevron-left': 'fas fa-chevron-left',
  'chevron-right': 'fas fa-chevron-right',
  'chevron-up': 'fas fa-chevron-up',
  'chevron-down': 'fas fa-chevron-down',
  'arrow-left': 'fas fa-arrow-left',
  'external-link': 'fas fa-external-link-alt',
  'expand': 'fas fa-expand',
  'compress': 'fas fa-compress',

  // ── 文件 ──
  'file': 'fas fa-file',
  'file-alt': 'fas fa-file-alt',
  'file-code': 'fas fa-file-code',
  'file-image': 'fas fa-file-image',
  'file-upload': 'fas fa-file-upload',
  'folder-open': 'fas fa-folder-open',
  'folder-plus': 'fas fa-folder-plus',
  'image': 'fas fa-image',

  // ── 状态 ──
  'loading': 'fas fa-spinner',
  'success': 'fas fa-check',
  'warning': 'fas fa-exclamation-triangle',
  'error': 'fas fa-exclamation-circle',
  'info': 'fas fa-info-circle',
  'inbox': 'fas fa-inbox',

  // ── 视图 ──
  'list': 'fas fa-list',
  'columns': 'fas fa-columns',
  'tag': 'fas fa-tag',

  // ── 品牌 ──
  'github': 'fab fa-github',
  'youtube': 'fab fa-youtube',
  'stack-overflow': 'fab fa-stack-overflow',
  'git': 'fab fa-git-alt',

  // ── 杂项 ──
  'globe': 'fas fa-globe',
  'globe-asia': 'fas fa-globe-asia',
  'keyboard': 'fas fa-keyboard',
  'lightbulb': 'fas fa-lightbulb',
  'palette': 'fas fa-palette',
  'users': 'fas fa-users',
  'book': 'fas fa-book',
  'code': 'fas fa-code',
  'cloud': 'fas fa-cloud',
  'newspaper': 'fas fa-newspaper',
  'share': 'fas fa-share-alt',
  'blog': 'fas fa-blog',
  'question': 'fas fa-question-circle',
  'crosshairs': 'fas fa-crosshairs',
  'key': 'fas fa-key',
};

/**
 * 根据语义名获取 Font Awesome CSS 类
 * @param {string} name 图标语义名
 * @returns {string} CSS 类字符串
 */
export function getIconClass(name) {
  return iconMap[name] || 'fas fa-question-circle';
}
