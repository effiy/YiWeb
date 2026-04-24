/**
 * 对象工具函数
 * author: liangliang
 */

/**
 * 深度合并对象
 * @param {Object} target - 目标对象
 * @param {...Object} sources - 源对象
 * @returns {Object} 合并后的对象
 */
export function deepMerge(target, ...sources) {
    if (!sources.length) return target;

    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) {
                    Object.assign(target, { [key]: {} });
                }
                deepMerge(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return deepMerge(target, ...sources);
}

/**
 * 判断是否为对象
 * @param {*} obj - 值
 * @returns {boolean} 是否为对象
 */
export function isObject(obj) {
    return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

/**
 * 判断是否为空对象
 * @param {Object} obj - 对象
 * @returns {boolean} 是否为空
 */
export function isEmpty(obj) {
    if (!isObject(obj)) return true;
    return Object.keys(obj).length === 0;
}

/**
 * 获取对象属性值（支持路径）
 * @param {Object} obj - 对象
 * @param {string} path - 路径（如 'a.b.c'）
 * @param {*} defaultValue - 默认值
 * @returns {*} 属性值
 */
export function get(obj, path, defaultValue) {
    if (!isObject(obj) || !path) return defaultValue;

    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
        if (result === null || result === undefined) {
            return defaultValue;
        }
        result = result[key];
    }

    return result !== undefined ? result : defaultValue;
}

/**
 * 设置对象属性值（支持路径）
 * @param {Object} obj - 对象
 * @param {string} path - 路径
 * @param {*} value - 值
 * @returns {Object} 对象
 */
export function set(obj, path, value) {
    if (!isObject(obj) || !path) return obj;

    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;

    for (const key of keys) {
        if (!isObject(current[key])) {
            current[key] = {};
        }
        current = current[key];
    }

    current[lastKey] = value;
    return obj;
}

/**
 * 删除对象属性（支持路径）
 * @param {Object} obj - 对象
 * @param {string} path - 路径
 * @returns {boolean} 是否删除成功
 */
export function unset(obj, path) {
    if (!isObject(obj) || !path) return false;

    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;

    for (const key of keys) {
        if (!isObject(current[key])) {
            return false;
        }
        current = current[key];
    }

    return delete current[lastKey];
}

/**
 * 判断对象是否有属性（支持路径）
 * @param {Object} obj - 对象
 * @param {string} path - 路径
 * @returns {boolean} 是否有属性
 */
export function has(obj, path) {
    if (!isObject(obj) || !path) return false;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
        if (!Object.prototype.hasOwnProperty.call(current, key)) {
            return false;
        }
        current = current[key];
    }

    return true;
}

/**
 * 对象键值对调
 * @param {Object} obj - 对象
 * @returns {Object} 调换后的对象
 */
export function invert(obj) {
    if (!isObject(obj)) return {};

    return Object.entries(obj).reduce((result, [key, value]) => {
        result[value] = key;
        return result;
    }, {});
}

/**
 * 提取对象属性
 * @param {Object} obj - 对象
 * @param {Array<string>} keys - 键数组
 * @returns {Object} 提取后的对象
 */
export function pick(obj, keys) {
    if (!isObject(obj) || !Array.isArray(keys)) return {};

    return keys.reduce((result, key) => {
        if (key in obj) {
            result[key] = obj[key];
        }
        return result;
    }, {});
}

/**
 * 排除对象属性
 * @param {Object} obj - 对象
 * @param {Array<string>} keys - 键数组
 * @returns {Object} 排除后的对象
 */
export function omit(obj, keys) {
    if (!isObject(obj) || !Array.isArray(keys)) return {};

    const result = { ...obj };
    keys.forEach(key => {
        delete result[key];
    });
    return result;
}

/**
 * 对象映射
 * @param {Object} obj - 对象
 * @param {Function} fn - 映射函数
 * @returns {Object} 映射后的对象
 */
export function mapValues(obj, fn) {
    if (!isObject(obj) || typeof fn !== 'function') return {};

    return Object.entries(obj).reduce((result, [key, value]) => {
        result[key] = fn(value, key, obj);
        return result;
    }, {});
}

/**
 * 对象键映射
 * @param {Object} obj - 对象
 * @param {Function} fn - 映射函数
 * @returns {Object} 映射后的对象
 */
export function mapKeys(obj, fn) {
    if (!isObject(obj) || typeof fn !== 'function') return ;

    return Object.entries(obj).reduce((result, [key, value]) => {
        const newKey = fn(key, value, obj);
        result[newKey] = value;
        return result;
    }, {});
}

/**
 * 对象过滤
 * @param {Object} obj - 对象
 * @param {Function} fn - 过滤函数
 * @returns {Object} 过滤后的对象
 */
export function filterObject(obj, fn) {
    if (!isObject(obj) || typeof fn !== 'function') return {};

    return Object.entries(obj).reduce((result, [key, value]) => {
        if (fn(value, key, obj)) {
            result[key] = value;
        }
        return result;
    }, {});
}

/**
 * 对象扁平化
 * @param {Object} obj - 对象
 * @param {string} separator - 分隔符
 * @returns {Object} 扁平化后的对象
 */
export function flattenObject(obj, separator = '.') {
    if (!isObject(obj)) return {};

    const result = {};

    const flatten = (current, prefix = '') => {
        for (const [key, value] of Object.entries(current)) {
            const newKey = prefix ? `${prefix}${separator}${key}` : key;

            if (isObject(value) && !Array.isArray(value)) {
                flatten(value, newKey);
            } else {
                result[newKey] = value;
            }
        }
    };

    flatten(obj);
    return result;
}

/**
 * 对象反扁平化
 * @param {Object} obj - 扁平对象
 * @param {string} separator - 分隔符
 * @returns {Object} 反扁平化后的对象
 */
export function unflattenObject(obj, separator = '.') {
    if (!isObject(obj)) return {};

    const result = {};

    for (const [key, value] of Object.entries(obj)) {
        set(result, key.split(separator).join('.'), value);
    }

    return result;
}

/**
 * 对象深度冻结
 * @param {Object} obj - 对象
 * @returns {Object} 冻结后的对象
 */
export function deepFreeze(obj) {
    if (!isObject(obj)) return obj;

    Object.freeze(obj);

    Object.values(obj).forEach(value => {
        if (isObject(value)) {
            deepFreeze(value);
        }
    });

    return obj;
}

/**
 * 对象深度比较
 * @param {*} obj1 - 对象1
 * @param {*} obj2 - 对象2
 * @returns {boolean} 是否相等
 */
export function deepEqual(obj1, obj2) {
    if (obj1 === obj2) return true;

    if (obj1 === null || obj2 === null) return false;
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
        if (!keys2.includes(key)) return false;
        if (!deepEqual(obj1[key], obj2[key])) return false;
    }

    return true;
}

/**
 * 对象差异比较
 * @param {Object} obj1 - 对象1
 * @param {Object} obj2 - 对象2
 * @returns {Object} 差异对象
 */
export function diff(obj1, obj2) {
    if (!isObject(obj1) || !isObject(obj2)) return {};

    const result = {};

    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    for (const key of allKeys) {
        if (!deepEqual(obj1[key], obj2[key])) {
            result[key] = {
                old: obj1[key],
                new: obj2[key]
            };
        }
    }

    return result;
}

export default {
    deepMerge,
    isObject,
    isEmpty,
    get,
    set,
    unset,
    has,
    invert,
    pick,
    omit,
    mapValues,
    mapKeys,
    filterObject,
    flattenObject,
    unflattenObject,
    deepFreeze,
    deepEqual,
    diff
};
