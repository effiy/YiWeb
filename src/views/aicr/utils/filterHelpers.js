/**
 * 筛选工具函数 — 三级联动筛选共享模块
 */

/**
 * 构建子→父映射：递归将所有嵌套目录映射到其根项目目录
 * O(n) 构建一次，后续 O(1) 查询
 * @param {Array} fileTree — 文件树根节点数组
 * @returns {Map<string, string>} childName → rootProjectName
 */
export function buildParentChildMap(fileTree) {
    const map = new Map();
    if (!fileTree || !Array.isArray(fileTree)) return map;

    const mapRecursive = (items, rootParent) => {
        if (!Array.isArray(items)) return;
        for (const item of items) {
            if (item.type === 'folder') {
                map.set(item.name, rootParent);
                if (item.children) mapRecursive(item.children, rootParent);
            }
        }
    };

    for (const item of fileTree) {
        if (item.type === 'folder' && Array.isArray(item.children)) {
            mapRecursive(item.children, item.name);
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
 * 检查文件夹名是否在类型标签集中（用于深度1文件夹级别类型匹配）
 * @param {string} folderName
 * @param {string[]} selectedTypes
 * @returns {boolean}
 */
export function folderNameInTypes(folderName, selectedTypes) {
    if (!selectedTypes || selectedTypes.length === 0) return true;
    return selectedTypes.includes(folderName);
}

/**
 * 从文件树中提取故事名称（仅从「故事任务面板」目录下提取）
 * @param {Array} fileTree — 文件树根节点数组
 * @returns {string[]} 排序后的故事名称数组
 */
export function extractStoryNames(fileTree) {
    const names = new Set();
    if (!fileTree || !Array.isArray(fileTree)) return [];

    // 只从「故事任务面板」目录下提取故事名
    const findPanelChildren = (items) => {
        if (!Array.isArray(items)) return;
        for (const item of items) {
            if (item.type === 'folder') {
                if (item.name === '故事任务面板' && Array.isArray(item.children)) {
                    for (const child of item.children) {
                        if (child.type === 'folder') {
                            names.add(child.name);
                        }
                    }
                }
                if (item.children) findPanelChildren(item.children);
            }
        }
    };
    findPanelChildren(fileTree);

    return [...names].sort();
}


