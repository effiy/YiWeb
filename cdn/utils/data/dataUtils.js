/**
 * 数据处理工具函数
 * author: liangliang
 */

/**
 * 数据脱敏
 * @param {string} str - 原始字符串
 * @param {string} type - 脱敏类型
 * @returns {string} 脱敏后的字符串
 */
export function maskData(str, type = 'phone') {
    if (!str || typeof str !== 'string') return '';

    switch (type) {
        case 'phone':
            // 手机号脱敏：138****5678
            return str.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');

        case 'email':
            // 邮箱脱敏：abc***@example.com
            return str.replace(/(.{3}).*(@.*)/, '$1***$2');

        case 'idCard':
            // 身份证脱敏：110***********1234
            return str.replace(/(\d{3})\d*(\d{4})/, '$1***********$2');

        case 'bankCard':
            // 银行卡脱敏：6222 **** **** 1234
            return str.replace(/(\d{4})\d*(\d{4})/, '$1 **** **** $2');

        case 'name':
            // 姓名脱敏：张*
            return str.charAt(0) + '*'.repeat(str.length - 1);

        default:
            return str;
    }
}

/**
 * 数据转换
 * @param {*} data - 数据
 * @param {string} from - 源格式
 * @param {string} to - 目标格式
 * @returns {*} 转换后的数据
 */
export function convertData(data, from, to) {
    if (from === 'json' && to === 'formData') {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            formData.append(key, value);
        });
        return formData;
    }

    if (from === 'formData' && to === 'json') {
        const json = {};
        for (const [key, value] of data.entries()) {
            json[key] = value;
        }
        return json;
    }

    if (from === 'json' && to === 'urlencoded') {
        return new URLSearchParams(data).toString();
    }

    if (from === 'urlencoded' && to === 'json') {
        const params = new URLSearchParams(data);
        const json = {};
        for (const [key, value] of params.entries()) {
            json[key] = value;
        }
        return json;
    }

    return data;
}

/**
 * 数据标准化
 * @param {*} data - 数据
 * @param {Object} schema - 数据模式
 * @returns {*} 标准化后的数据
 */
export function normalizeData(data, schema) {
    if (!schema || typeof schema !== 'object') return data;

    const normalized = {};

    for (const [key, config] of Object.entries(schema)) {
        const value = data[key];

        // 类型转换
        if (config.type) {
            switch (config.type) {
                case 'string':
                    normalized[key] = String(value || '');
                    break;
                case 'number':
                    normalized[key] = Number(value) || 0;
                    break;
                case 'boolean':
                    normalized[key] = Boolean(value);
                    break;
                case 'array':
                    normalized[key] = Array.isArray(value) ? value : [];
                    break;
                case 'object':
                    normalized[key] = typeof value === 'object' ? value : {};
                    break;
                default:
                    normalized[key] = value;
            }
        } else {
            normalized[key] = value;
        }

        // 默认值
        if (normalized[key] === undefined && config.default !== undefined) {
            normalized[key] = config.default;
        }

        // 转换函数
        if (config.transform && typeof config.transform === 'function') {
            normalized[key] = config.transform(normalized[key]);
        }
    }

    return normalized;
}

/**
 * 数据清洗
 * @param {Object} data - 数据对象
 * @param {Object} options - 选项
 * @returns {Object} 清洗后的数据
 */
export function cleanData(data, options = {}) {
    const {
        removeNull = true,
        removeUndefined = true,
        removeEmpty = false,
        trim = true
    } = options;

    if (!data || typeof data !== 'object') return data;

    const cleaned = {};

    for (const [key, value] of Object.entries(data)) {
        // 移除null
        if (removeNull && value === null) continue;

        // 移除undefined
        if (removeUndefined && value === undefined) continue;

        // 移除空字符串
        if (removeEmpty && value === '') continue;

        // 字符串trim
        if (trim && typeof value === 'string') {
            cleaned[key] = value.trim();
        } else {
            cleaned[key] = value;
        }
    }

    return cleaned;
}

/**
 * 数据合并
 * @param {...Object} objects - 对象数组
 * @returns {Object} 合并后的对象
 */
export function mergeData(...objects) {
    return objects.reduce((result, obj) => {
        if (!obj || typeof obj !== 'object') return result;

        for (const [key, value] of Object.entries(obj)) {
            if (Array.isArray(value)) {
                result[key] = [...(result[key] || []), ...value];
            } else if (typeof value === 'object' && value !== null) {
                result[key] = mergeData(result[key] || {}, value);
            } else {
                result[key] = value;
            }
        }

        return result;
    }, {});
}

/**
 * 数据分页
 * @param {Array} data - 数据数组
 * @param {number} page - 页码
 * @param {number} pageSize - 每页大小
 * @returns {Object} 分页结果
 */
export function paginateData(data, page = 1, pageSize = 10) {
    if (!Array.isArray(data)) {
        return { data: [], total: 0, page: 1, pageSize, totalPages: 0 };
    }

    const total = data.length;
    const totalPages = Math.ceil(total / pageSize);
    const currentPage = Math.max(1, Math.min(page, totalPages || 1));
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;

    return {
        data: data.slice(start, end),
        total,
        page: currentPage,
        pageSize,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
    };
}

/**
 * 数据排序
 * @param {Array} data - 数据数组
 * @param {string|Function} key - 排序键或函数
 * @param {string} order - 排序顺序
 * @returns {Array} 排序后的数组
 */
export function sortData(data, key, order = 'asc') {
    if (!Array.isArray(data)) return [];

    const sorted = [...data].sort((a, b) => {
        const aValue = typeof key === 'function' ? key(a) : a[key];
        const bValue = typeof key === 'function' ? key(b) : b[key];

        if (aValue < bValue) return order === 'asc' ? -1 : 1;
        if (aValue > bValue) return order === 'asc' ? 1 : -1;
        return 0;
    });

    return sorted;
}

/**
 * 数据过滤
 * @param {Array} data - 数据数组
 * @param {Object|Function} filter - 过滤条件
 * @returns {Array} 过滤后的数组
 */
export function filterData(data, filter) {
    if (!Array.isArray(data)) return [];

    if (typeof filter === 'function') {
        return data.filter(filter);
    }

    if (typeof filter === 'object' && filter !== null) {
        return data.filter(item => {
            return Object.entries(filter).every(([key, value]) => {
                if (typeof value === 'function') {
                    return value(item[key]);
                }
                return item[key] === value;
            });
        });
    }

    return data;
}

/**
 * 数据搜索
 * @param {Array} data - 数据数组
 * @param {string} query - 搜索查询
 * @param {Array<string>} fields - 搜索字段
 * @returns {Array} 搜索结果
 */
export function searchData(data, query, fields = []) {
    if (!Array.isArray(data) || !query) return data;

    const lowerQuery = query.toLowerCase();

    return data.filter(item => {
        if (fields.length === 0) {
            // 搜索所有字段
            return Object.values(item).some(value =>
                String(value).toLowerCase().includes(lowerQuery)
            );
        }

        // 搜索指定字段
        return fields.some(field =>
            String(item[field] || '').toLowerCase().includes(lowerQuery)
        );
    });
}

/**
 * 数据分组统计
 * @param {Array} data - 数据数组
 * @param {string|Function} key - 分组键
 * @returns {Object} 统计结果
 */
export function groupStats(data, key) {
    if (!Array.isArray(data)) return {};

    const groups = {};

    data.forEach(item => {
        const groupKey = typeof key === 'function' ? key(item) : item[key];

        if (!groups[groupKey]) {
            groups[groupKey] = {
                count: 0,
                items: []
            };
        }

        groups[groupKey].count++;
        groups[groupKey].items.push(item);
    });

    return groups;
}

/**
 * 数据导出
 * @param {Array} data - 数据数组
 * @param {string} format - 导出格式
 * @returns {string|Blob} 导出数据
 */
export function exportData(data, format = 'json') {
    if (!Array.isArray(data)) return '';

    switch (format) {
        case 'json':
            return JSON.stringify(data, null, 2);

        case 'csv': {
            if (data.length === 0) return '';

            const headers = Object.keys(data[0]);
            const csvRows = [
                headers.join(','),
                ...data.map(row =>
                    headers.map(header => {
                        const value = row[header];
                        return typeof value === 'string' && value.includes(',')
                            ? `"${value}"`
                            : value;
                    }).join(',')
                )
            ];

            return csvRows.join('\n');
        }

        case 'tsv': {
            if (data.length === 0) return '';

            const headers = Object.keys(data[0]);
            const tsvRows = [
                headers.join('\t'),
                ...data.map(row =>
                    headers.map(header => row[header]).join('\t')
                )
            ];

            return tsvRows.join('\n');
        }

        default:
            return JSON.stringify(data);
    }
}

export default {
    maskData,
    convertData,
    normalizeData,
    cleanData,
    mergeData,
    paginateData,
    sortData,
    filterData,
    searchData,
    groupStats,
    exportData
};
