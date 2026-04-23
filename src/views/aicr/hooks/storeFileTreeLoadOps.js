/**
 * 文件树加载操作模块
 * 负责文件树数据的加载和初始化
 * author: Claude
 */

/**
 * 创建文件树加载操作
 * @param {Object} deps - 依赖项
 * @param {Function} deps.safeExecute - 安全执行函数
 * @param {Function} deps.safeExecuteAsync - 异步安全执行函数
 * @param {Function} deps.buildFileTreeFromSessions - 从会话构建文件树的函数
 * @param {Object} state - 状态对象
 * @param {Object} extra - 额外依赖
 * @param {Function} extra.loadSessions - 加载会话的函数
 * @returns {Object} 文件树加载操作方法
 */
export function createFileTreeLoadOps(deps, state, extra) {
    const { safeExecuteAsync, buildFileTreeFromSessions } = deps;
    const { loadSessions } = extra;

    /**
     * 加载文件树数据
     * @param {boolean} forceClear - 是否强制清空
     * @returns {Promise<Array>} 文件树数据
     */
    const loadFileTree = async (forceClear = false) => {
        return safeExecuteAsync(async () => {
            state.loading.value = true;
            state.error.value = null;
            state.errorMessage.value = '';

            console.log('[loadFileTree] 正在加载全局文件树数据...');

            if (!state.sessions.value || state.sessions.value.length === 0) {
                await loadSessions();
            }

            const allSessions = state.sessions.value;
            console.log('[loadFileTree] 会话总数:', allSessions.length);

            if (allSessions.length === 0) {
                if (forceClear) state.fileTree.value = [];
                return [];
            }

            const { treeRoots, expandedFolders: folderSet } = buildFileTreeFromSessions(allSessions);

            state.fileTree.value = treeRoots;
            state.fileTreeDocKey.value = '';

            console.log(`[loadFileTree] 成功构建文件树, 包含 ${allSessions.length} 个文件`);

            state.expandedFolders.value = folderSet;

            return state.fileTree.value;
        }, '文件树数据加载', (errorInfo) => {
            const debug = (() => {
                try { return !!(window.__ENV__ && window.__ENV__.DEBUG); } catch (_) { return false; }
            })();
            const code = errorInfo && errorInfo.code ? String(errorInfo.code) : '';
            const message = debug && code ? `[${code}] ${errorInfo.message}` : errorInfo.message;
            state.error.value = message;
            state.errorMessage.value = message;
            if (forceClear) state.fileTree.value = [];
        }).finally(() => {
            state.loading.value = false;
        });
    };

    return {
        loadFileTree
    };
}
