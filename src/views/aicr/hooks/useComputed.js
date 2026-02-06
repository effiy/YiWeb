/**
 * 计算属性组合式函数
 * 提供基于代码审查数据的常用计算属性
 * author: liangliang
 * 
 * @param {Object} store - 状态存储对象
 * @returns {Object} 计算属性集合
 */

export const useComputed = (store) => {
    const { computed } = Vue;

    return {
        /**
         * 是否有文件树数据
         */
        hasFileTree: computed(() => {
            return store.fileTree?.value && store.fileTree.value.length > 0;
        }),

        /**
         * 是否有文件数据
         */
        hasFiles: computed(() => {
            return store.files?.value && store.files.value.length > 0;
        }),

        /**
         * 选中的文件Key
         */
        selectedKey: computed(() => {
            return store.selectedKey?.value;
        }),

        /**
         * 当前选中的文件
         */
        currentFile: computed(() => {
            const key = store.selectedKey?.value;
            if (!key) return null;
            const normalize = (v) => {
                try {
                    if (v == null) return '';
                    let s = String(v);
                    s = s.replace(/\\/g, '/');
                    s = s.replace(/^\.\//, '');
                    s = s.replace(/^\/+/, '');
                    s = s.replace(/\/\/+/, '/');
                    return s;
                } catch (e) {
                    return String(v);
                }
            };
            const target = normalize(key);

            const findSessionKeyByTreeKey = (nodes, treeKey) => {
                if (!nodes) return null;
                const stack = Array.isArray(nodes) ? [...nodes] : [nodes];
                while (stack.length > 0) {
                    const n = stack.pop();
                    if (!n) continue;
                    const k = normalize(n.key || n.path || n.id || '');
                    if (k && k === treeKey) {
                        return n.sessionKey != null ? String(n.sessionKey) : null;
                    }
                    if (Array.isArray(n.children) && n.children.length > 0) {
                        for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]);
                    }
                }
                return null;
            };

            // 更灵活的匹配逻辑：检查多个可能的标识字段
            const currentFile = store.files.value.find(f => {
                if (!f) return false;

                // 检查多个可能的标识字段
                const candidates = [
                    f.key,
                    f.path,
                    f.name
                ].filter(Boolean).map(normalize);

                // 检查是否与目标匹配
                return candidates.some(c => {
                    // 完全匹配
                    if (c === target) return true;

                    // 路径匹配：检查是否是父子路径关系
                    if (c.endsWith('/' + target) && target && target.length > 0) return true;
                    if (target.endsWith('/' + c) && c && c.length > 0) return true;

                    // 文件名匹配：检查文件名是否相同
                    const cName = c.split('/').pop();
                    const targetName = target.split('/').pop();
                    if (cName && targetName && cName === targetName) {
                        // 检查路径部分是否一致（或都为空）
                        const cPath = c.substring(0, c.lastIndexOf('/'));
                        const targetPath = target.substring(0, target.lastIndexOf('/'));
                        return cPath === targetPath || (!cPath && !targetPath);
                    }

                    return false;
                });
            });

            if (!currentFile) {
                const sessionKeyFromTree = findSessionKeyByTreeKey(store.fileTree?.value, target);
                if (sessionKeyFromTree) {
                    // 约定：file.key 必须与会话 key(sessionKey/UUID)一致
                    // 同时保留 treeKey/path 用于文件树定位与静态文件加载
                    return {
                        key: String(sessionKeyFromTree),
                        sessionKey: String(sessionKeyFromTree),
                        treeKey: target,
                        path: target,
                        name: target.split('/').pop() || target
                    };
                }
                return null;
            }

            const sessionKeyFromTree = currentFile.sessionKey || findSessionKeyByTreeKey(store.fileTree?.value, target);
            if (!sessionKeyFromTree) {
                // 尽量补齐 treeKey，避免下游误把 key 当路径
                return { ...currentFile, treeKey: currentFile.treeKey || currentFile.path || target };
            }

            // 统一 file 对象结构：
            // - key / sessionKey：会话 UUID
            // - treeKey：文件树 key（通常是路径）
            // - path：静态文件路径（通常同 treeKey）
            return {
                ...currentFile,
                sessionKey: String(sessionKeyFromTree),
                key: String(sessionKeyFromTree),
                treeKey: currentFile.treeKey || currentFile.path || target,
                path: currentFile.path || target
            };
        }),

        /**
         * 文件树统计信息
         */
        fileTreeStats: computed(() => {
            const stats = { folders: 0, files: 0 };

            const countItems = (items) => {
                if (!Array.isArray(items)) {
                    // 如果是单个节点，直接处理
                    if (items.type === 'folder') {
                        stats.folders++;
                        if (items.children) {
                            countItems(items.children);
                        }
                    } else {
                        stats.files++;
                    }
                    return;
                }

                items.forEach(item => {
                    if (item.type === 'folder') {
                        stats.folders++;
                        if (item.children) {
                            countItems(item.children);
                        }
                    } else {
                        stats.files++;
                    }
                });
            };

            if (store.fileTree?.value) {
                countItems(store.fileTree.value);
            }

            return stats;
        }),



        /**
         * 选中的项目名称
         */
        /**
         * 版本选择器已改为select元素，不再需要展开状态
         */

        /**
         * 是否正在加载
         */
        isLoading: computed(() => {
            return store.loading?.value;
        }),

        /**
         * 是否有错误
         */
        hasError: computed(() => {
            return !!store.error?.value;
        }),

        /**
         * 文件夹是否展开
         */
        isFolderExpanded: computed(() => {
            return (folderId) => store.expandedFolders?.value?.has(folderId);
        }),

        /**
         * 当前文件的语言类型
         */
        currentFileLanguage: computed(() => {
            const file = store.files?.value?.find(f => f.key === store.selectedKey?.value);
            return file?.language || 'text';
        }),

        /**
         * 是否有项目数据
         */
        // hasProjects: computed(() => {
        //     return store.projects?.value && store.projects.value.length > 0;
        // }),


        /**
         * 当前项目信息
         */
        // currentProject: computed(() => {
        //     if (!store.selectedProject?.value || !store.projects?.value) return null;
        //     return store.projects.value.find(p => p.id === store.selectedProject.value);
        // }),


        /**
         * 搜索查询值 - 用于模板中的条件判断
         */
        searchQueryValue: computed(() => {
            // 添加调试信息
            console.log('[searchQueryValue] searchQuery状态:', store.searchQuery);
            console.log('[searchQueryValue] searchQuery.value:', store.searchQuery?.value);

            // 安全地获取搜索查询值
            const query = store.searchQuery && typeof store.searchQuery.value !== 'undefined' ? store.searchQuery.value : '';
            console.log('[searchQueryValue] 返回的查询值:', query);

            return query;
        }),

        /**
         * 是否所有会话都已选中（用于全选/取消全选按钮）
         */
        isAllSessionsSelected: computed(() => {
            if (!store || !store.sessions || !store.sessions.value || !Array.isArray(store.sessions.value)) {
                return false;
            }
            if (!store.selectedSessionKeys || !store.selectedSessionKeys.value) {
                return false;
            }
            const visibleSessions = store.sessions.value;
            if (visibleSessions.length === 0) {
                return false;
            }
            return visibleSessions.every(session => store.selectedSessionKeys.value.has(session.key));
        }),

    };
};

