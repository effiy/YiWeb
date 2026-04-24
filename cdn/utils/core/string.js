/**
 * 字符串工具函数
 * author: liangliang
 */

/**
 * 首字母大写
 * @param {string} str - 字符串
 * @returns {string} 处理后的字符串
 */
export function capitalize(str) {
    if (!str || typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * 驼峰转短横线
 * @param {string} str - 字符串
 * @returns {string} 处理后的字符串
 */
export function camelToKebab(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * 短横线转驼峰
 * @param {string} str - 字符串
 * @returns {string} 处理后的字符串
 */
export function kebabToCamel(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 下划线转驼峰
 * @param {string} str - 字符串
 * @returns {string} 处理后的字符串
 */
export function snakeToCamel(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 驼峰转下划线
 * @param {string} str - 字符串
 * @returns {string} 处理后的字符串
 */
export function camelToSnake(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/**
 * 截断字符串
 * @param {string} str - 字符串
 * @param {number} length - 长度
 * @param {string} suffix - 后缀
 * @returns {string} 处理后的字符串
 */
export function truncate(str, length = 50, suffix = '...') {
    if (!str || typeof str !== 'string') return '';
    if (str.length <= length) return str;
    return str.substring(0, length) + suffix;
}

/**
 * 移除HTML标签
 * @param {string} html - HTML字符串
 * @returns {string} 纯文本
 */
export function stripHtml(html) {
    if (!html || typeof html !== 'string') return '';
    return html.replace(/<[^>]*>/g, '');
}

/**
 * 转义HTML
 * @param {string} str - 字符串
 * @returns {string} 转义后的字符串
 */
export function escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return str.replace(/[&<>"']/g, char => map[char]);
}

/**
 * 反转义HTML
 * @param {string} str - 字符串
 * @returns {string} 反转义后的字符串
 */
export function unescapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    const map = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'"
    };
    return str.replace(/&(amp|lt|gt|quot|#39);/g, entity => map[entity]);
}

/**
 * 生成随机字符串
 * @param {number} length - 长度
 * @param {string} chars - 字符集
 * @returns {string} 随机字符串
 */
export function randomString(length = 8, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * 生成UUID
 * @returns {string} UUID
 */
export function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * 字符串模板替换
 * @param {string} template - 模板字符串
 * @param {Object} data - 数据对象
 * @returns {string} 替换后的字符串
 */
export function template(template, data) {
    if (!template || typeof template !== 'string') return '';
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] !== undefined ? data[key] : match;
    });
}

/**
 * 高亮关键词
 * @param {string} text - 文本
 * @param {string} keyword - 关键词
 * @param {string} className - 高亮类名
 * @returns {string} 高亮后的HTML
 */
export function highlight(text, keyword, className = 'highlight') {
    if (!text || !keyword) return text;
    const regex = new RegExp(`(${keyword})`, 'gi');
    return text.replace(regex, `<span class="${className}">$1</span>`);
}

/**
 * 计算字符串字节长度（中文算2个字节）
 * @param {string} str - 字符串
 * @returns {number} 字节长度
 */
export function byteLength(str) {
    if (!str || typeof str !== 'string') return 0;
    let length = 0;
    for (let i = 0; i < str.length; i++) {
        length += str.charCodeAt(i) > 255 ? 2 : 1;
    }
    return length;
}

/**
 * 按字节截断字符串
 * @param {string} str - 字符串
 * @param {number} maxBytes - 最大字节数
 * @param {string} suffix - 后缀
 * @returns {string} 截断后的字符串
 */
export function truncateByBytes(str, maxBytes, suffix = '...') {
    if (!str || typeof str !== 'string') return '';

    let length = 0;
    let result = '';

    for (let i = 0; i < str.length; i++) {
        const charLength = str.charCodeAt(i) > 255 ? 2 : 1;

        if (length + charLength > maxBytes) {
            return result + suffix;
        }

        length += charLength;
        result += str[i];
    }

    return result;
}

/**
 * 格式化数字（添加千分位）
 * @param {number} num - 数字
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的字符串
 */
export function formatNumber(num, decimals = 0) {
    const n = Number(num);
    if (!Number.isFinite(n)) return '0';

    const fixed = n.toFixed(decimals);
    const parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return parts.join('.');
}

/**
 * 解析查询字符串
 * @param {string} query - 查询字符串
 * @returns {Object} 解析后的对象
 */
export function parseQuery(query) {
    if (!query || typeof query !== 'string') return {};

    const params = new URLSearchParams(query);
    const result = {};

    for (const [key, value] of params.entries()) {
        result[key] = value;
    }

    return result;
}

/**
 * 构建查询字符串
 * @param {Object} params - 参数对象
 * @returns {string} 查询字符串
 */
export function buildQuery(params) {
    if (!params || typeof params !== 'object') return '';

    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value !== null && value !== undefined) {
            searchParams.append(key, String(value));
        }
    }

    return searchParams.toString();
}

export default {
    capitalize,
    camelToKebab,
    kebabToCamel,
    snakeToCamel,
    camelToSnake,
    truncate,
    stripHtml,
    escapeHtml,
    unescapeHtml,
    randomString,
    uuid,
    template,
    highlight,
    byteLength,
    truncateByBytes,
    formatNumber,
    parseQuery,
    buildQuery
};
