/**
 * 通用工具函数库（增强版）
 * author: liangliang
 * 说明：提供所有项目共享的工具函数 - 补充更多实用工具
 */

// ============================================
// HTML 转义与处理
// ============================================

/**
 * HTML 转义
 */
export function escapeHtml(str) {
  if (typeof str !== 'string' && str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * HTML 反转义
 */
export function unescapeHtml(str) {
  if (typeof str !== 'string') return str;
  return String(str)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * HTML 属性转义
 */
export function escapeHtmlAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

/**
 * JavaScript 字符串转义
 */
export function escapeJs(str) {
  return String(str ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * 移除 HTML 标签
 */
export function stripHtml(str) {
  return String(str ?? '').replace(/<[^>]*>/g, '');
}

// ============================================
// URL 与安全
// ============================================

/**
 * URL 安全检查
 */
export function sanitizeUrl(href) {
  const raw = String(href ?? '').trim();
  if (!raw) return '';
  if (raw.startsWith('import-')) return '';
  if (raw.startsWith('#') || raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../')) return raw;
  try {
    const u = new URL(raw, window.location.origin);
    const p = String(u.protocol ?? '').toLowerCase();
    if (p === 'http:' || p === 'https:' || p === 'mailto:') return u.href;
    return '';
  } catch (_) {
    return '';
  }
}

/**
 * 解析 URL 查询参数
 */
export function parseQuery(query = window.location.search) {
  const params = {};
  const search = query.startsWith('?') ? query.slice(1) : query;
  if (!search) return params;
  search.split('&').forEach(pair => {
    const [key, value] = pair.split('=');
    if (key) {
      params[decodeURIComponent(key)] = value !== undefined ? decodeURIComponent(value) : '';
    }
  });
  return params;
}

/**
 * 构建 URL 查询字符串
 */
export function buildQuery(params = {}) {
  return Object.entries(params)
    .filter(([_, v]) => v != null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

// ============================================
// 字符串处理
// ============================================

/**
 * 截断字符串
 */
export function truncate(str, maxLen = 100, suffix = '...') {
  const s = String(str ?? '');
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - suffix.length) + suffix;
}

/**
 * 首字母大写
 */
export function capitalize(str) {
  const s = String(str ?? '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * 首字母小写
 */
export function uncapitalize(str) {
  const s = String(str ?? '');
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * 驼峰转 kebab-case
 */
export function camelToKebab(str) {
  return String(str ?? '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * kebab-case 转驼峰
 */
export function kebabToCamel(str) {
  return String(str ?? '')
    .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * 蛇形转驼峰
 */
export function snakeToCamel(str) {
  return String(str ?? '')
    .replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * 驼峰转蛇形
 */
export function camelToSnake(str) {
  return String(str ?? '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * 生成唯一 ID
 */
export function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * UUID 生成（简单版）
 */
export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 简单的模板字符串替换
 */
export function template(tpl, data) {
  return String(tpl ?? '').replace(/\{(\w+)\}/g, (_, key) =>
    data[key] !== undefined ? data[key] : `{${key}}`
  );
}

/**
 * 开头/结尾移除
 */
export function trimStart(str, chars = ' \t\n\r') {
  let s = String(str ?? '');
  let i = 0;
  while (i < s.length && chars.includes(s[i])) i++;
  return s.slice(i);
}

export function trimEnd(str, chars = ' \t\n\r') {
  let s = String(str ?? '');
  let i = s.length - 1;
  while (i >= 0 && chars.includes(s[i])) i--;
  return s.slice(0, i + 1);
}

/**
 * 单词首字母大写
 */
export function titleize(str) {
  return String(str ?? '')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * 计算字符串长度（中文算2字符）
 */
export function strWidth(str) {
  return String(str ?? '').split('').reduce((len, c) =>
    len + (c.charCodeAt(0) > 127 ? 2 : 1), 0);
}

// ============================================
// 数字处理
// ============================================

/**
 * 限制数值范围
 */
export function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

/**
 * 数字格式化
 */
export function formatNumber(num, options = {}) {
  const {
    decimals = 0,
    thousands = ',',
    decimal = '.',
    prefix = '',
    suffix = ''
  } = options;

  const n = Number(num ?? 0);
  const fixed = n.toFixed(decimals);
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
  return `${prefix}${parts.join(decimal)}${suffix}`;
}

/**
 * 文件大小格式化
 */
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * 序数词（1st, 2nd, 3rd...）
 */
export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * 判断是否为整数
 */
export function isInteger(n) {
  return Number.isInteger(Number(n));
}

/**
 * 安全的数字解析
 */
export function toNumber(val, defaultValue = 0) {
  const n = Number(val);
  return isNaN(n) ? defaultValue : n;
}

/**
 * 百分比
 */
export function percent(current, total, decimals = 1) {
  if (!total) return '0%';
  return ((current / total) * 100).toFixed(decimals) + '%';
}

// ============================================
// 数组处理
// ============================================

/**
 * 数组去重
 */
export function unique(arr, key) {
  if (!Array.isArray(arr)) return [];
  if (key) {
    const seen = new Set();
    return arr.filter(item => {
      const k = item[key];
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  return [...new Set(arr)];
}

/**
 * 数组分组
 */
export function groupBy(arr, key) {
  if (!Array.isArray(arr)) return {};
  return arr.reduce((acc, item) => {
    const k = typeof key === 'function' ? key(item) : item[key];
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {});
}

/**
 * 数组分块
 */
export function chunk(arr, size = 10) {
  if (!Array.isArray(arr)) return [];
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * 数组打乱
 */
export function shuffle(arr) {
  const result = [...(arr || [])];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 数组查找（多个）
 */
export function findAll(arr, predicate) {
  return Array.isArray(arr) ? arr.filter(predicate) : [];
}

/**
 * 移除数组元素
 */
export function remove(arr, item) {
  if (!Array.isArray(arr)) return [];
  const idx = arr.indexOf(item);
  if (idx > -1) arr.splice(idx, 1);
  return arr;
}

/**
 * 扁平化数组
 */
export function flatten(arr, depth = 1) {
  return Array.isArray(arr) ? arr.flat(depth) : [];
}

/**
 * 数组交集
 */
export function intersection(arr1, arr2) {
  const set = new Set(arr2);
  return arr1.filter(x => set.has(x));
}

/**
 * 数组差集
 */
export function difference(arr1, arr2) {
  const set = new Set(arr2);
  return arr1.filter(x => !set.has(x));
}

// ============================================
// 对象处理
// ============================================

/**
 * 深拷贝（简单版）
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof Map) return new Map(Array.from(obj, ([k, v]) => [k, deepClone(v)]));
  if (obj instanceof Set) return new Set(Array.from(obj, v => deepClone(v)));
  const copy = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      copy[key] = deepClone(obj[key]);
    }
  }
  return copy;
}

/**
 * 安全获取对象属性
 */
export function get(obj, path, defaultValue) {
  const keys = String(path ?? '').split(/[.[\]]/).filter(Boolean);
  let result = obj;
  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = result[key];
  }
  return result === undefined ? defaultValue : result;
}

/**
 * 安全设置对象属性
 */
export function set(obj, path, value) {
  const keys = String(path ?? '').split(/[.[\]]/).filter(Boolean);
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
  return obj;
}

/**
 * 对象浅合并
 */
export function merge(...objects) {
  return objects.reduce((acc, obj) => ({ ...acc, ...obj }), {});
}

/**
 * 对象深合并
 */
export function deepMerge(target, source) {
  if (source == null) return target;
  const result = { ...target };
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (isObject(source[key]) && isObject(result[key])) {
        result[key] = deepMerge(result[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  return result;
}

/**
 * 选择对象的部分属性
 */
export function pick(obj, keys) {
  if (!obj || !Array.isArray(keys)) return {};
  return keys.reduce((acc, key) => {
    if (obj.hasOwnProperty(key)) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
}

/**
 * 排除对象的部分属性
 */
export function omit(obj, keys) {
  if (!obj || !Array.isArray(keys)) return { ...obj };
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}

/**
 * 对象映射
 */
export function mapKeys(obj, fn) {
  const result = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[fn(key, obj[key])] = obj[key];
    }
  }
  return result;
}

export function mapValues(obj, fn) {
  const result = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = fn(obj[key], key);
    }
  }
  return result;
}

/**
 * 对象转数组
 */
export function toPairs(obj) {
  return Object.entries(obj || {});
}

export function fromPairs(pairs) {
  return Object.fromEntries(pairs || []);
}

// ============================================
// 时间处理
// ============================================

/**
 * 格式化时间
 */
export function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 相对时间
 */
export function timeAgo(date) {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);

  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
  return formatDate(d, 'YYYY-MM-DD');
}

/**
 * 判断是否为今天
 */
export function isToday(date) {
  const d = date instanceof Date ? date : new Date(date);
  const today = new Date();
  return d.getFullYear() === today.getFullYear() &&
         d.getMonth() === today.getMonth() &&
         d.getDate() === today.getDate();
}

/**
 * 判断是否为同一天
 */
export function isSameDay(date1, date2) {
  const d1 = date1 instanceof Date ? date1 : new Date(date1);
  const d2 = date2 instanceof Date ? date2 : new Date(date2);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

/**
 * 获取一天的开始/结束
 */
export function startOfDay(date) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// ============================================
// 防抖与节流
// ============================================

/**
 * 防抖
 */
export function debounce(fn, delay = 300) {
  let timer = null;
  const debounced = function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return debounced;
}

/**
 * 节流
 */
export function throttle(fn, delay = 300) {
  let last = 0;
  let timer = null;
  const throttled = function(...args) {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn.apply(this, args);
      }, delay - (now - last));
    }
  };
  throttled.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return throttled;
}

// ============================================
// 存储
// ============================================

/**
 * LocalStorage 封装
 */
export const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (_) {
      return defaultValue;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  },
  remove(key) {
    localStorage.removeItem(key);
  },
  clear() {
    localStorage.clear();
  }
};

/**
 * SessionStorage 封装
 */
export const sessionStorage = {
  get(key, defaultValue = null) {
    try {
      const item = window.sessionStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (_) {
      return defaultValue;
    }
  },
  set(key, value) {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  },
  remove(key) {
    window.sessionStorage.removeItem(key);
  },
  clear() {
    window.sessionStorage.clear();
  }
};

/**
 * Cookie 处理
 */
export function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

export function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

// ============================================
// 判断与验证
// ============================================

/**
 * 判断类型
 */
export function isType(val, type) {
  return Object.prototype.toString.call(val) === `[object ${type}]`;
}

export const isString = val => typeof val === 'string';
export const isNumber = val => typeof val === 'number' && !isNaN(val);
export const isBoolean = val => typeof val === 'boolean';
export const isArray = val => Array.isArray(val);
export const isObject = val => val !== null && typeof val === 'object' && !isArray(val);
export const isFunction = val => typeof val === 'function';
export const isEmpty = val => {
  if (val == null) return true;
  if (isString(val) || isArray(val)) return val.length === 0;
  if (isObject(val)) return Object.keys(val).length === 0;
  return false;
};

/**
 * 邮箱验证
 */
export function isEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str));
}

/**
 * 手机号验证（中国大陆）
 */
export function isPhone(str) {
  return /^1[3-9]\d{9}$/.test(String(str));
}

/**
 * URL 验证
 */
export function isUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * 颜色验证
 */
export function isHexColor(str) {
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(String(str));
}

// ============================================
// 颜色处理
// ============================================

/**
 * Hex 转 RGB
 */
export function hexToRgb(hex) {
  const match = String(hex ?? '').replace('#', '').match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16)
  };
}

/**
 * RGB 转 Hex
 */
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(clamp(x, 0, 255)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * 获取颜色的对比度色（黑/白）
 */
export function getContrastColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000000';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * 颜色透明度
 */
export function colorAlpha(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1)})`;
}

/**
 * 颜色变亮/变暗
 */
export function lighten(hex, percent) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const amount = Math.round(255 * percent / 100);
  return rgbToHex(
    Math.min(255, rgb.r + amount),
    Math.min(255, rgb.g + amount),
    Math.min(255, rgb.b + amount)
  );
}

export function darken(hex, percent) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const amount = Math.round(255 * percent / 100);
  return rgbToHex(
    Math.max(0, rgb.r - amount),
    Math.max(0, rgb.g - amount),
    Math.max(0, rgb.b - amount)
  );
}

// ============================================
// 随机
// ============================================

/**
 * 生成随机数
 */
export function random(min = 0, max = 1) {
  return Math.random() * (max - min) + min;
}

/**
 * 生成随机整数
 */
export function randomInt(min = 0, max = 100) {
  return Math.floor(random(min, max + 1));
}

/**
 * 从数组随机选择
 */
export function sample(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  return arr[randomInt(0, arr.length - 1)];
}

/**
 * 随机字符串
 */
export function randomString(length = 8, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomInt(0, chars.length - 1)];
  }
  return result;
}

/**
 * 随机颜色
 */
export function randomColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

// ============================================
// 浏览器相关
// ============================================

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch (_) {
      return false;
    }
  }
}

/**
 * 下载文件
 */
export function downloadFile(data, filename, type = 'application/octet-stream') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 安全的 JSON 解析
 */
export function safeJsonParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch (_) {
    return defaultValue;
  }
}

/**
 * 滚动到顶部
 */
export function scrollToTop(smooth = true) {
  window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
}

/**
 * 滚动到元素
 */
export function scrollToElement(element, options = {}) {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start', ...options });
  }
}

/**
 * 获取选中文本
 */
export function getSelectedText() {
  return window.getSelection()?.toString() || '';
}

/**
 * 全屏切换
 */
export async function toggleFullscreen(element = document.documentElement) {
  try {
    if (!document.fullscreenElement) {
      await element.requestFullscreen();
      return true;
    } else {
      await document.exitFullscreen();
      return false;
    }
  } catch {
    return null;
  }
}

/**
 * 元素是否在视口中
 */
export function isInViewport(element) {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * 打印元素
 */
export function printElement(element) {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (!el) return;
  const content = el.innerHTML;
  const w = window.open('', '', 'width=800,height=600');
  w.document.write(`<!DOCTYPE html><html><body>${content}</body></html>`);
  w.document.close();
  w.print();
  w.close();
}

// ============================================
// 延迟与等待
// ============================================

/**
 * 延迟
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带超时的 Promise
 */
export function withTimeout(promise, timeout, timeoutError = new Error('Timeout')) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(timeoutError), timeout))
  ]);
}

/**
 * 重试函数
 */
export async function retry(fn, times = 3, delay = 100) {
  let lastError;
  for (let i = 0; i < times; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < times - 1) await sleep(delay);
    }
  }
  throw lastError;
}

// ============================================
// 函数组合
// ============================================

/**
 * 管道函数
 */
export function pipe(...fns) {
  return x => fns.reduce((v, f) => f(v), x);
}

/**
 * 组合函数
 */
export function compose(...fns) {
  return x => fns.reduceRight((v, f) => f(v), x);
}

/**
 * 柯里化
 */
export function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return (...more) => curried.apply(this, [...args, ...more]);
  };
}

/**
 * 记忆化
 */
export function memoize(fn) {
  const cache = new Map();
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// ============================================
// DOM 操作
// ============================================

/**
 * 查询元素
 */
export function $(selector, context = document) {
  return context.querySelector(selector);
}

/**
 * 查询所有元素
 */
export function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

/**
 * 创建元素
 */
export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);

  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value);
    }
  });

  children.forEach(child => {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  });

  return el;
}

/**
 * 添加类名
 */
export function addClass(element, ...classes) {
  const el = typeof element === 'string' ? $(element) : element;
  if (el) el.classList.add(...classes);
  return el;
}

/**
 * 移除类名
 */
export function removeClass(element, ...classes) {
  const el = typeof element === 'string' ? $(element) : element;
  if (el) el.classList.remove(...classes);
  return el;
}

/**
 * 切换类名
 */
export function toggleClass(element, className) {
  const el = typeof element === 'string' ? $(element) : element;
  if (el) el.classList.toggle(className);
  return el;
}

/**
 * 判断是否有类名
 */
export function hasClass(element, className) {
  const el = typeof element === 'string' ? $(element) : element;
  return el ? el.classList.contains(className) : false;
}

/**
 * 设置样式
 */
export function setStyle(element, styles) {
  const el = typeof element === 'string' ? $(element) : element;
  if (el && typeof styles === 'object') {
    Object.assign(el.style, styles);
  }
  return el;
}

/**
 * 获取样式
 */
export function getStyle(element, prop) {
  const el = typeof element === 'string' ? $(element) : element;
  if (!el) return null;
  return window.getComputedStyle(el)[prop];
}

/**
 * 显示元素
 */
export function show(element, display = 'block') {
  const el = typeof element === 'string' ? $(element) : element;
  if (el) el.style.display = display;
  return el;
}

/**
 * 隐藏元素
 */
export function hide(element) {
  const el = typeof element === 'string' ? $(element) : element;
  if (el) el.style.display = 'none';
  return el;
}

/**
 * 切换显示/隐藏
 */
export function toggle(element, display = 'block') {
  const el = typeof element === 'string' ? $(element) : element;
  if (!el) return null;
  if (el.style.display === 'none') {
    el.style.display = display;
  } else {
    el.style.display = 'none';
  }
  return el;
}

/**
 * 获取/设置属性
 */
export function attr(element, name, value) {
  const el = typeof element === 'string' ? $(element) : element;
  if (!el) return null;

  if (value === undefined) {
    return el.getAttribute(name);
  }

  if (value === null) {
    el.removeAttribute(name);
  } else {
    el.setAttribute(name, value);
  }
  return el;
}

/**
 * 获取/设置 data 属性
 */
export function data(element, key, value) {
  const el = typeof element === 'string' ? $(element) : element;
  if (!el) return null;

  if (value === undefined) {
    return el.dataset[key];
  }

  el.dataset[key] = value;
  return el;
}

/**
 * 添加事件监听
 */
export function on(element, event, handler, options) {
  const el = typeof element === 'string' ? $(element) : element;
  if (el) el.addEventListener(event, handler, options);
  return el;
}

/**
 * 移除事件监听
 */
export function off(element, event, handler, options) {
  const el = typeof element === 'string' ? $(element) : element;
  if (el) el.removeEventListener(event, handler, options);
  return el;
}

/**
 * 触发事件
 */
export function trigger(element, eventName, detail) {
  const el = typeof element === 'string' ? $(element) : element;
  if (!el) return null;

  const event = new CustomEvent(eventName, { detail, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return el;
}

/**
 * 获取元素位置
 */
export function offset(element) {
  const el = typeof element === 'string' ? $(element) : element;
  if (!el) return { top: 0, left: 0 };

  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.pageYOffset,
    left: rect.left + window.pageXOffset,
    width: rect.width,
    height: rect.height
  };
}

/**
 * 获取元素尺寸
 */
export function size(element) {
  const el = typeof element === 'string' ? $(element) : element;
  if (!el) return { width: 0, height: 0 };

  return {
    width: el.offsetWidth,
    height: el.offsetHeight
  };
}

// ============================================
// 网络请求
// ============================================

/**
 * 简单的 fetch 封装
 */
export async function request(url, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body = null,
    timeout = 30000,
    ...rest
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : null,
      signal: controller.signal,
      ...rest
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

/**
 * GET 请求
 */
export function get(url, params = {}, options = {}) {
  const query = buildQuery(params);
  const fullUrl = query ? `${url}?${query}` : url;
  return request(fullUrl, { method: 'GET', ...options });
}

/**
 * POST 请求
 */
export function post(url, data = {}, options = {}) {
  return request(url, { method: 'POST', body: data, ...options });
}

/**
 * PUT 请求
 */
export function put(url, data = , options = {}) {
  return request(url, { method: 'PUT', body: data, ...options });
}

/**
 * DELETE 请求
 */
export function del(url, options = {}) {
  return request(url, { method: 'DELETE', ...options });
}

/**
 * PATCH 请求
 */
export function patch(url, data = {}, options = {}) {
  return request(url, { method: 'PATCH', body: data, ...options });
}

// ============================================
// 事件总线
// ============================================

class EventBus {
  constructor() {
    this.events = new Map();
  }

  on(event, handler) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (!this.events.has(event)) return;

    if (!handler) {
      this.events.delete(event);
      return;
    }

    const handlers = this.events.get(event);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  emit(event, ...args) {
    if (!this.events.has(event)) return;

    this.events.get(event).forEach(handler => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }
    });
  }

  once(event, handler) {
    const wrapper = (...args) => {
      handler(...args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  clear() {
    this.events.clear();
  }
}

export const eventBus = new EventBus();

// ============================================
// 性能优化
// ============================================

/**
 * 请求动画帧节流
 */
export function rafThrottle(fn) {
  let rafId = null;
  return function(...args) {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      fn.apply(this, args);
      rafId = null;
    });
  };
}

/**
 * 空闲时执行
 */
export function idle(fn, options = {}) {
  if ('requestIdleCallback' in window) {
    return requestIdleCallback(fn, options);
  }
  return setTimeout(fn, 1);
}

/**
 * 批量执行
 */
export function batch(tasks = [], batchSize = 10, delay = 0) {
  return new Promise((resolve) => {
    const results = [];
    let index = 0;

    function executeBatch() {
      const end = Math.min(index + batchSize, tasks.length);

      for (let i = index; i < end; i++) {
        results.push(tasks[i]());
      }

      index = end;

      if (index < tasks.length) {
        setTimeout(executeBatch, delay);
      } else {
        resolve(results);
      }
    }

    executeBatch();
  });
}

// ============================================
// 数据处理
// ============================================

/**
 * 树形数据扁平化
 */
export function flattenTree(tree, childrenKey = 'children') {
  const result = [];

  function traverse(nodes) {
    nodes.forEach(node => {
      result.push(node);
      if (node[childrenKey] && Array.isArray(node[childrenKey])) {
        traverse(node[childrenKey]);
      }
    });
  }

  traverse(Array.isArray(tree) ? tree : [tree]);
  return result;
}

/**
 * 扁平数据转树形
 */
export function arrayToTree(items, options = {}) {
  const {
    idKey = 'id',
    parentKey = 'parentId',
    childrenKey = 'children',
    rootValue = null
  } = options;

  const map = new Map();
  const roots = [];

  items.forEach(item => {
    map.set(item[idKey], { ...item, [childrenKey]: [] });
  });

  items.forEach(item => {
    const node = map.get(item[idKey]);
    const parentId = item[parentKey];

    if (parentId === rootValue || !map.has(parentId)) {
      roots.push(node);
    } else {
      const parent = map.get(parentId);
      parent[childrenKey].push(node);
    }
  });

  return roots;
}

/**
 * 查找树节点
 */
export function findTreeNode(tree, predicate, childrenKey = 'children') {
  for (const node of tree) {
    if (predicate(node)) return node;
    if (node[childrenKey]) {
      const found = findTreeNode(node[childrenKey], predicate, childrenKey);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 过滤树节点
 */
export function filterTree(tree, predicate, childrenKey = 'children') {
  return tree.reduce((acc, node) => {
    if (predicate(node)) {
      const newNode = { ...node };
      if (node[childrenKey]) {
        newNode[childrenKey] = filterTree(node[childrenKey], predicate, childrenKey);
      }
      acc.push(newNode);
    }
    return acc;
  }, []);
}

/**
 * 遍历树
 */
export function traverseTree(tree, callback, childrenKey = 'children') {
  function traverse(nodes, parent = null, level = 0) {
    nodes.forEach((node, index) => {
      callback(node, parent, level, index);
      if (node[childrenKey]) {
        traverse(node[childrenKey], node, level + 1);
      }
    });
  }

  traverse(Array.isArray(tree) ? tree : [tree]);
}

// ============================================
// 导出默认对象
// ============================================

export default {
  // HTML
  escapeHtml,
  unescapeHtml,
  escapeHtmlAttr,
  escapeJs,
  stripHtml,

  // URL
  sanitizeUrl,
  parseQuery,
  buildQuery,

  // 字符串
  truncate,
  capitalize,
  uncapitalize,
  camelToKebab,
  kebabToCamel,
  snakeToCamel,
  camelToSnake,
  generateId,
  uuid,
  template,
  trimStart,
  trimEnd,
  titleize,
  strWidth,

  // 数字
  clamp,
  formatNumber,
  formatFileSize,
  ordinal,
  isInteger,
  toNumber,
  percent,

  // 数组
  unique,
  groupBy,
  chunk,
  shuffle,
  findAll,
  remove,
  flatten,
  intersection,
  difference,

  // 对象
  deepClone,
  get,
  set,
  merge,
  deepMerge,
  pick,
  omit,
  mapKeys,
  mapValues,
  toPairs,
  fromPairs,

  // 时间
  formatDate,
  timeAgo,
  isToday,
  isSameDay,
  startOfDay,
  endOfDay,

  // 防抖节流
  debounce,
  throttle,

  // 存储
  storage,
  sessionStorage,
  getCookie,
  setCookie,
  deleteCookie,

  // 类型判断
  isType,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isObject,
  isFunction,
  isEmpty,
  isEmail,
  isPhone,
  isUrl,
  isHexColor,

  // 颜色
  hexToRgb,
  rgbToHex,
  getContrastColor,
  colorAlpha,
  lighten,
  darken,

  // 随机
  random,
  randomInt,
  sample,
  randomString,
  randomColor,

  // 浏览器
  copyToClipboard,
  downloadFile,
  safeJsonParse,
  scrollToTop,
  scrollToElement,
  getSelectedText,
  toggleFullscreen,
  isInViewport,
  printElement,

  // 异步
  sleep,
  withTimeout,
  retry,

  // 函数式
  pipe,
  compose,
  curry,
  memoize,

  // DOM 操作
  $,
  $$,
  createElement,
  addClass,
  removeClass,
  toggleClass,
  hasClass,
  setStyle,
  getStyle,
  show,
  hide,
  toggle,
  attr,
  data,
  on,
  off,
  trigger,
  offset,
  size,

  // 网络请求
  request,
  get,
  post,
  put,
  del,
  patch,

  // 事件总线
  eventBus,

  // 性能优化
  rafThrottle,
  idle,
  batch,

  // 数据处理
  flattenTree,
  arrayToTree,
  findTreeNode,
  filterTree,
  traverseTree
};

// Component Loader
export * from './view/componentLoader.js';

// ============================================
// 从子模块导出（新增）
// ============================================

// 核心工具
export * from '/cdn/utils/core/index.js';

// 浏览器工具
export * from '/cdn/utils/browser/index.js';

// 时间工具
export * from '/cdn/utils/time/index.js';

// 视图工具
export * from '/cdn/utils/view/index.js';

// 渲染工具
export * from '/cdn/utils/render/index.js';

// 数据工具
export * from '/cdn/utils/data/domain.js';

// IO工具
export * from '/cdn/utils/io/exportUtils.js';

// UI工具
export * from '/cdn/utils/ui/loading.js';
export * from '/cdn/utils/ui/message.js';
export * from '/cdn/utils/ui/template.js';

// 导出常用工具的快捷访问
export { storage, sessionStorage, cookie } from '/cdn/utils/core/storage.js';
export { eventBus } from '/cdn/utils/core/eventBus.js';
export { default as http } from '/cdn/utils/core/http.js';
export { default as animation } from '/cdn/utils/core/animation.js';
export { default as validation } from '/cdn/utils/core/validation.js';
export { default as performance } from '/cdn/utils/core/performance.js';
