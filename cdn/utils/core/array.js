/**
 * 数组工具函数
 * author: liangliang
 */

/**
 * 数组去重
 * @param {Array} arr - 数组
 * @param {string|Function} key - 去重键或函数
 * @returns {Array} 去重后的数组
 */
export function unique(arr, key) {
    if (!Array.isArray(arr)) return [];

    if (!key) {
        return [...new Set(arr)];
    }

    const seen = new Set();
    return arr.filter(item => {
        const value = typeof key === 'function' ? key(item) : item[key];
        if (seen.has(value)) {
            return false;
        }
        seen.add(value);
        return true;
    });
}

/**
 * 数组分组
 * @param {Array} arr - 数组
 * @param {string|Function} key - 分组键或函数
 * @returns {Object} 分组后的对象
 */
export function groupBy(arr, key) {
    if (!Array.isArray(arr)) return {};

    return arr.reduce((result, item) => {
        const groupKey = typeof key === 'function' ? key(item) : item[key];
        if (!result[groupKey]) {
            result[groupKey] = [];
        }
        result[groupKey].push(item);
        return result;
    }, {});
}

/**
 * 数组排序
 * @param {Array} arr - 数组
 * @param {string|Function} key - 排序键或函数
 * @param {string} order - 排序顺序 'asc' | 'desc'
 * @returns {Array} 排序后的数组
 */
export function sortBy(arr, key, order = 'asc') {
    if (!Array.isArray(arr)) return [];

    const sorted = [...arr].sort((a, b) => {
        const aValue = typeof key === 'function' ? key(a) : a[key];
        const bValue = typeof key === 'function' ? key(b) : b[key];

        if (aValue < bValue) return -1;
        if (aValue > bValue) return 1;
        return 0;
    });

    return order === 'desc' ? sorted.reverse() : sorted;
}

/**
 * 数组分块
 * @param {Array} arr - 数组
 * @param {number} size - 块大小
 * @returns {Array} 分块后的数组
 */
export function chunk(arr, size = 1) {
    if (!Array.isArray(arr) || size < 1) return [];

    const result = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
}

/**
 * 数组扁平化
 * @param {Array} arr - 数组
 * @param {number} depth - 深度
 * @returns {Array} 扁平化后的数组
 */
export function flatten(arr, depth = Infinity) {
    if (!Array.isArray(arr)) return [];

    if (depth === 1) {
        return arr.flat();
    }

    return arr.flat(depth);
}

/**
 * 数组差集
 * @param {Array} arr1 - 数组1
 * @param {Array} arr2 - 数组2
 * @returns {Array} 差集数组
 */
export function difference(arr1, arr2) {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return [];
    const set2 = new Set(arr2);
    return arr1.filter(item => !set2.has(item));
}

/**
 * 数组交集
 * @param {Array} arr1 - 数组1
 * @param {Array} arr2 - 数组2
 * @returns {Array} 交集数组
 */
export function intersection(arr1, arr2) {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return [];
    const set2 = new Set(arr2);
    return arr1.filter(item => set2.has(item));
}

/**
 * 数组并集
 * @param {Array} arr1 - 数组1
 * @param {Array} arr2 - 数组2
 * @returns {Array} 并集数组
 */
export function union(arr1, arr2) {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return [];
    return [...new Set([...arr1, ...arr2])];
}

/**
 * 数组随机打乱
 * @param {Array} arr - 数组
 * @returns {Array} 打乱后的数组
 */
export function shuffle(arr) {
    if (!Array.isArray(arr)) return [];

    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * 数组随机取样
 * @param {Array} arr - 数组
 * @param {number} count - 取样数量
 * @returns {Array} 取样数组
 */
export function sample(arr, count = 1) {
    if (!Array.isArray(arr) || count < 1) return [];

    const shuffled = shuffle(arr);
    return shuffled.slice(0, Math.min(count, arr.length));
}

/**
 * 数组求和
 * @param {Array} arr - 数组
 * @param {string|Function} key - 求和键或函数
 * @returns {number} 求和结果
 */
export function sum(arr, key) {
    if (!Array.isArray(arr)) return 0;

    return arr.reduce((total, item) => {
        const value = key
            ? (typeof key === 'function' ? key(item) : item[key])
            : item;
        return total + (Number(value) || 0);
    }, 0);
}

/**
 * 数组平均值
 * @param {Array} arr - 数组
 * @param {string|Function} key - 键或函数
 * @returns {number} 平均值
 */
export function average(arr, key) {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    return sum(arr, key) / arr.length;
}

/**
 * 数组最大值
 * @param {Array} arr - 数组
 * @param {string|Function} key - 键或函数
 * @returns {*} 最大值
 */
export function max(arr, key) {
    if (!Array.isArray(arr) || arr.length === 0) return undefined;

    if (!key) {
        return Math.max(...arr);
    }

    return arr.reduce((max, item) => {
        const value = typeof key === 'function' ? key(item) : item[key];
        return value > max ? value : max;
    }, -Infinity);
}

/**
 * 数组最小值
 * @param {Array} arr - 数组
 * @param {string|Function} key - 键或函数
 * @returns {*} 最小值
 */
export function min(arr, key) {
    if (!Array.isArray(arr) || arr.length === 0) return undefined;

    if (!key) {
        return Math.min(...arr);
    }

    return arr.reduce((min, item) => {
        const value = typeof key === 'function' ? key(item) : item[key];
        return value < min ? value : min;
    }, Infinity);
}

/**
 * 数组分页
 * @param {Array} arr - 数组
 * @param {number} page - 页码（从1开始）
 * @param {number} pageSize - 每页大小
 * @returns {Object} 分页结果 {data, total, page, pageSize, totalPages}
 */
export function paginate(arr, page = 1, pageSize = 10) {
    if (!Array.isArray(arr)) {
        return { data: [], total: 0, page: 1, pageSize, totalPages: 0 };
    }

    const total = arr.length;
    const totalPages = Math.ceil(total / pageSize);
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const data = arr.slice(start, end);

    return {
        data,
        total,
        page: currentPage,
        pageSize,
        totalPages
    };
}

/**
 * 数组转树形结构
 * @param {Array} arr - 数组
 * @param {Object} options - 选项
 * @returns {Array} 树形数组
 */
export function arrayToTree(arr, options = {}) {
    if (!Array.isArray(arr)) return [];

    const {
        idKey = 'id',
        parentKey = 'parentId',
        childrenKey = 'children',
        rootValue = null
    } = options;

    const map = new Map();
    const result = [];

    // 创建映射
    arr.forEach(item => {
        map.set(item[idKey], { ...item, [childrenKey]: [] });
    });

    // 构建树
    arr.forEach(item => {
        const node = map.get(item[idKey]);
        const parentId = item[parentKey];

        if (parentId === rootValue || !map.has(parentId)) {
            result.push(node);
        } else {
            const parent = map.get(parentId);
            parent[childrenKey].push(node);
        }
    });

    return result;
}

/**
 * 树形结构转数组
 * @param {Array} tree - 树形数组
 * @param {string} childrenKey - 子节点键名
 * @returns {Array} 扁平数组
 */
export function treeToArray(tree, childrenKey = 'children') {
    if (!Array.isArray(tree)) return [];

    const result = [];

    const traverse = (nodes) => {
        nodes.forEach(node => {
            const { [childrenKey]: children, ...rest } = node;
            result.push(rest);

            if (Array.isArray(children) && children.length > 0) {
                traverse(children);
            }
        });
    };

    traverse(tree);
    return result;
}

/**
 * 数组移动元素
 * @param {Array} arr - 数组
 * @param {number} from - 起始索引
 * @param {number} to - 目标索引
 * @returns {Array} 移动后的数组
 */
export function move(arr, from, to) {
    if (!Array.isArray(arr)) return [];

    const result = [...arr];
    const item = result.splice(from, 1)[0];
    result.splice(to, 0, item);
    return result;
}

/**
 * 数组插入元素
 * @param {Array} arr - 数组
 * @param {number} index - 索引
 * @param {*} item - 元素
 * @returns {Array} 插入后的数组
 */
export function insert(arr, index, item) {
    if (!Array.isArray(arr)) return [];

    const result = [...arr];
    result.splice(index, 0, item);
    return result;
}

/**
 * 数组移除元素
 * @param {Array} arr - 数组
 * @param {number|Function} indexOrPredicate - 索引或判断函数
 * @returns {Array} 移除后的数组
 */
export function remove(arr, indexOrPredicate) {
    if (!Array.isArray(arr)) return [];

    if (typeof indexOrPredicate === 'number') {
        const result = [...arr];
        result.splice(indexOrPredicate, 1);
        return result;
    }

    if (typeof indexOrPredicate === 'function') {
        return arr.filter((item, index) => !indexOrPredicate(item, index));
    }

    return arr;
}

export default {
    unique,
    groupBy,
    sortBy,
    chunk,
    flatten,
    difference,
    intersection,
    union,
    shuffle,
    sample,
    sum,
    average,
    max,
    min,
    paginate,
    arrayToTree,
    treeToArray,
    move,
    insert,
    remove
};
