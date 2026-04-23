/**
 * 文件树展开折叠操作模块
 * 负责文件夹的展开、折叠和路径展开
 * author: Claude
 */

/**
 * 创建文件树展开折叠操作
 * @param {Object} deps - 依赖项
 * @param {Function} deps.safeExecute - 安全执行函数
 * @param {Function} deps.normalizeFilePath - 路径规范化函数
 * @param {Object} state - 状态对象
 * @returns {Object} 展开折叠操作方法
 */
export function createFileTreeExpandOps(deps, state) {
    const { safeExecute, normalizeFilePath } = deps;

    /**
     * 展开所有文件夹
     */
    const expandAllFolders = () => {
        const all = new Set();
        const collect = (nodes) => {
            if (!nodes) return;
            if (!Array.isArray(nodes)) {
                if (nodes.type === 'folder') {
                    all.add(nodes.key);
                    if (nodes.children) collect(nodes.children);
                }
                return;
            }
            nodes.forEach(n => {
                if (n.type === 'folder') {
                    all.add(n.key);
                    if (n.children) collect(n.children);
                }
            });
        };
        collect(state.fileTree.value);
        state.expandedFolders.value = all;
    };

    /**
     * 展开到指定文件的路径
     * @param {string} fileKey - 文件Key
     * @returns {Array} 展开的文件夹列表
     */
    const expandPathToFile = (fileKey) => {
        return safeExecute(() => {
            if (!fileKey || typeof fileKey !== 'string') return [];

            console.log('[expandPathToFile] 收到请求，fileKey:', fileKey);

            // 规范化路径
            const normalizedKey = normalizeFilePath(fileKey);
            console.log('[expandPathToFile] 规范化后:', normalizedKey);

            // 解析路径得到所有父文件夹
            // 例如: "src/views/aicr/index.js"
            // 父文件夹: "src", "src/views", "src/views/aicr"
            const parts = normalizedKey.split('/');
            const folders = [];
            for (let i = 0; i < parts.length - 1; i++) {
                const folder = parts.slice(0, i + 1).join('/');
                if (folder) {
                    folders.push(folder);
                }
            }

            console.log('[expandPathToFile] 需要展开的文件夹:', folders);

            // 为了触发 Vue 响应式更新，我们创建一个新的 Set
            if (state.expandedFolders?.value) {
                const newSet = new Set(state.expandedFolders.value);
                folders.forEach(folder => {
                    if (folder) {
                        newSet.add(folder);
                    }
                });
                // 替换整个 Set 来触发响应式更新
                state.expandedFolders.value = newSet;
                console.log('[expandPathToFile] 更新后的 expandedFolders:', Array.from(newSet));
            }

            return folders;
        }, '展开文件路径');
    };

    /**
     * 切换文件夹展开状态
     * @param {string} key - 文件夹Key
     */
    const toggleFolder = (key) => {
        if (state.expandedFolders.value.has(key)) {
            state.expandedFolders.value.delete(key);
        } else {
            state.expandedFolders.value.add(key);
        }
    };

    return {
        expandAllFolders,
        expandPathToFile,
        toggleFolder
    };
}
