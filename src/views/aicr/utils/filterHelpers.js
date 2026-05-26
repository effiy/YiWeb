/**
 * 筛选工具函数 — 二级联动筛选共享模块
 * 提取 getSuffix / buildParentChildMap / getFirstLevelNames
 */

/**
 * 提取文件名后缀（去掉扩展名后，按 `-` 分割的最后一段）
 */
export function getSuffix(name) {
    const lastDot = name.lastIndexOf('.');
    const base = lastDot > 0 ? name.substring(0, lastDot) : name;
    const parts = base.split('-');
    if (parts.length <= 1) return null;
    return parts[parts.length - 1];
}

/**
 * 构建子→父映射：二级目录名 → 其父一级目录名
 * O(n) 构建一次，后续 O(1) 查询
 * @param {Array} fileTree — 文件树根节点数组
 * @returns {Map<string, string>} childName → parentName
 */
export function buildParentChildMap(fileTree) {
    const map = new Map();
    if (!fileTree || !Array.isArray(fileTree)) return map;
    for (const item of fileTree) {
        if (item.type === 'folder' && Array.isArray(item.children)) {
            for (const child of item.children) {
                if (child.type === 'folder') {
                    map.set(child.name, item.name);
                }
            }
        }
    }
    return map;
}

/**
 * 获取一级目录名集合
 * @param {Array} fileTree — 文件树根节点数组
 * @returns {Set<string>}
 */
export function getFirstLevelNames(fileTree) {
    const names = new Set();
    if (!fileTree || !Array.isArray(fileTree)) return names;
    for (const item of fileTree) {
        if (item.type === 'folder') names.add(item.name);
    }
    return names;
}

/**
 * 递归检查文件夹树中是否包含任意文件
 * @param {Array} items — 子节点数组
 * @returns {boolean}
 */
export function folderHasMatchingFile(items) {
    if (!Array.isArray(items)) return false;
    for (const item of items) {
        if (item.type === 'file') return true;
        if (item.type === 'folder' && item.children && folderHasMatchingFile(item.children)) return true;
    }
    return false;
}

/**
 * 递归统计文件夹中的文件数
 * @param {Array} items — 子节点数组
 * @returns {number}
 */
export function countFilesInFolder(items) {
    let fileCount = 0;
    if (!Array.isArray(items)) return fileCount;
    for (const item of items) {
        if (item.type === 'file') {
            fileCount++;
        } else if (item.type === 'folder' && item.children) {
            fileCount += countFilesInFolder(item.children);
        }
    }
    return fileCount;
}

/**
 * 根据类型标签检查文件名是否匹配
 * @param {string} name — 文件名
 * @param {string[]} selectedTypes — 选中的类型列表
 * @returns {boolean}
 */
export function fileMatchesType(name, selectedTypes) {
    if (!selectedTypes || selectedTypes.length === 0) return true;
    const s = getSuffix(name);
    return s !== null && selectedTypes.includes(s);
}

/**
 * 递归检查文件夹树中是否有任意文件匹配类型筛选
 * @param {Array} items — 子节点数组
 * @param {string[]} selectedTypes
 * @returns {boolean}
 */
export function folderHasMatchingType(items, selectedTypes) {
    if (!Array.isArray(items)) return false;
    for (const item of items) {
        if (item.type === 'file' && fileMatchesType(item.name || '', selectedTypes)) return true;
        if (item.type === 'folder' && item.children && folderHasMatchingType(item.children, selectedTypes)) return true;
    }
    return false;
}

/**
 * 递归统计文件夹中匹配类型的文件数
 * @param {Array} items — 子节点数组
 * @param {string[]} selectedTypes
 * @returns {number}
 */
export function countFilesByType(items, selectedTypes) {
    let fileCount = 0;
    if (!Array.isArray(items)) return fileCount;
    for (const item of items) {
        if (item.type === 'file') {
            if (fileMatchesType(item.name || '', selectedTypes)) fileCount++;
        } else if (item.type === 'folder' && item.children) {
            fileCount += countFilesByType(item.children, selectedTypes);
        }
    }
    return fileCount;
}
