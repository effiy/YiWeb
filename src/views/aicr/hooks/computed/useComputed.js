/**
 * 计算属性组合式函数
 * 提供基于代码审查数据的常用计算属性
 * author: liangliang
 * 
 * @param {Object} store - 状态存储对象
 * @returns {Object} 计算属性集合
 */

import { normalizeFilePath } from '../../utils/fileFieldNormalizer.js';

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
            const target = normalizeFilePath(key);

            const findSessionKeyByTreeKey = (nodes, treeKey) => {
                if (!nodes) return null;
                const stack = Array.isArray(nodes) ? [...nodes] : [nodes];
                while (stack.length > 0) {
                    const n = stack.pop();
                    if (!n) continue;
                    const k = normalizeFilePath(n.key || n.path || n.id || '');
                    if (k && k === treeKey) {
                        return n.sessionKey != null ? String(n.sessionKey) : null;
                    }
                    if (Array.isArray(n.children) && n.children.length > 0) {
                        for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]);
                    }
                }
                return null;
            };

            // 严格的匹配逻辑：只匹配完全相同的路径，不匹配文件名相同的文件
            console.log('[currentFile计算属性] 开始查找文件，目标:', target);
            console.log('[currentFile计算属性] store.files.value:', store.files.value);
            console.log('[currentFile计算属性] store.files.value.length:', store.files.value?.length);

            const currentFile = store.files.value.find(f => {
                if (!f) return false;

                // 检查多个可能的标识字段
                const candidates = [
                    f.key,
                    f.path,
                    f.treeKey
                ].filter(Boolean).map(normalizeFilePath);

                console.log('[currentFile计算属性] 正在检查文件:', {
                    target: target,
                    candidates: candidates,
                    file: {
                        key: f.key,
                        path: f.path,
                        treeKey: f.treeKey,
                        name: f.name,
                        hasContentBase64: !!f.contentBase64,
                        contentBase64Len: f.contentBase64?.length || 0,
                        hasContent: !!f.content,
                        contentLen: f.content?.length || 0
                    }
                });

                // 检查是否与目标匹配
                return candidates.some(c => {
                    // 只接受完全匹配
                    if (c === target) {
                        console.log('[currentFile计算属性] 找到完全匹配的文件:', c);
                        return true;
                    }

                    return false;
                });
            });

            console.log('[currentFile计算属性] 查找结果 currentFile:', currentFile);

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
                const result = { ...currentFile, treeKey: currentFile.treeKey || currentFile.path || target };
                // 确保 content 和 contentBase64 被保留
                result.content = currentFile.content || '';
                result.contentBase64 = currentFile.contentBase64 || '';
                console.log('[currentFile计算属性] 没有sessionKeyFromTree，返回结果:', {
                    name: result.name,
                    hasContentBase64: !!result.contentBase64,
                    contentBase64Len: result.contentBase64?.length || 0
                });
                return result;
            }

            // 统一 file 对象结构：
            // - key / sessionKey：会话 UUID
            // - treeKey：文件树 key（通常是路径）
            // - path：静态文件路径（通常同 treeKey）
            // 注意：显式复制所有需要的属性，避免展开运算符的问题
            const result = {
                // 从 currentFile 复制的属性
                name: currentFile.name,
                type: currentFile.type,
                content: currentFile.content || '',
                contentBase64: currentFile.contentBase64 || '',
                __fromStatic: currentFile.__fromStatic,
                createdAt: currentFile.createdAt,
                updatedAt: currentFile.updatedAt,
                // 新设置或覆盖的属性
                sessionKey: String(sessionKeyFromTree),
                key: String(sessionKeyFromTree),
                treeKey: currentFile.treeKey || currentFile.path || target,
                path: currentFile.path || target
            };

            // 调试信息：输出当前文件内容长度和文件名
            console.log('[currentFile计算属性] 文件对象:', result);
            console.log('[currentFile计算属性] currentFile源对象:', currentFile);
            console.log('[currentFile计算属性] currentFile.contentBase64:', currentFile.contentBase64 ? currentFile.contentBase64.substring(0, 50) + '...' : 'empty');
            console.log('[currentFile计算属性] result.contentBase64:', result.contentBase64 ? result.contentBase64.substring(0, 50) + '...' : 'empty');
            if (result.content) {
                console.log('[currentFile计算属性] 文件内容长度:', result.content.length, '文件名:', result.name);
            } else if (result.contentBase64) {
                console.log('[currentFile计算属性] 内容为base64，长度:', result.contentBase64.length, '文件名:', result.name);
            } else {
                console.warn('[currentFile计算属性] 文件内容为空，文件名:', result.name);
            }

            return result;
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
