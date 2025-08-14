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
         * 选中的文件ID
         */
        selectedFileId: computed(() => {
            return store.selectedFileId?.value;
        }),

        /**
         * 当前选中的文件
         */
        currentFile: computed(() => {
            const fileId = store.selectedFileId?.value;
            console.log('[currentFile] 当前文件ID:', fileId);
            console.log('[currentFile] store.files:', store.files);
            if (!fileId) return null;
            const filesArr = Array.isArray(store.files?.value) ? store.files.value : [];
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
            const target = normalize(fileId);
            if (!filesArr.length) {
                // 返回占位对象以触发 CodeView 懒加载逻辑
                const name = target.split('/').pop();
                return { fileId: target, id: target, path: target, name, content: '' };
            }
            const currentFile = filesArr.find(f => {
                const d = (f && typeof f === 'object' && f.data && typeof f.data === 'object') ? f.data : {};
                const candidates = [f.fileId, f.id, f.path, f.name, d.fileId, d.id, d.path, d.name].filter(Boolean).map(normalize);
                const matched = candidates.some(c => {
                    if (c === target) return true; // 完全匹配
                    if (c.endsWith('/' + target) || target.endsWith('/' + c)) return true; // 路径结尾匹配
                    const cName = c.split('/').pop();
                    const tName = target.split('/').pop();
                    if (cName && tName && cName === tName) return true; // 文件名匹配
                    return false;
                });
                console.log('[currentFile] 检查文件:', f.name, '候选:', candidates, '匹配:', matched);
                return matched;
            });
            console.log('[currentFile] 找到的当前文件:', currentFile);
            if (!currentFile) {
                const name = target.split('/').pop();
                return { fileId: target, id: target, path: target, name, content: '' };
            }
            return currentFile;
        }),

        /**
         * 当前文件的评论
         */
        currentComments: computed(() => {
            const fileId = store.selectedFileId?.value;
            console.log('[currentComments] 当前文件ID:', fileId);
            console.log('[currentComments] store.comments:', store.comments);
            
            if (!fileId) return [];
            
            // 合并本地评论和store中的评论
            const localComments = []; // 这里可以添加本地评论逻辑
            const storeComments = store.comments?.value ? store.comments.value.filter(c => {
                // 兼容不同的文件标识方式
                const commentFileId = c.fileId || (c.fileInfo && c.fileInfo.path);
                console.log('[currentComments] 评论文件ID:', commentFileId, '当前文件ID:', fileId);
                return commentFileId === fileId;
            }) : [];
            const allComments = [...localComments, ...storeComments];
            
            console.log('[currentComments] 本地评论数量:', localComments.length);
            console.log('[currentComments] store评论数量:', storeComments.length);
            console.log('[currentComments] 总评论数量:', allComments.length);
            console.log('[currentComments] 所有评论详情:', allComments);
            
            // 确保返回的评论有正确的key属性
            return allComments.map(comment => ({
                ...comment,
                key: comment.key || comment.id || `comment_${Date.now()}_${Math.random()}`
            }));
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
         * 评论统计信息
         */
        commentStats: computed(() => {
            const stats = { total: 0, byFile: {} };
            
            if (store.comments?.value) {
                stats.total = store.comments.value.length;
                
                store.comments.value.forEach(comment => {
                    const fileId = comment.fileId;
                    if (!stats.byFile[fileId]) {
                        stats.byFile[fileId] = 0;
                    }
                    stats.byFile[fileId]++;
                });
            }
            
            return stats;
        }),

        /**
         * 选中的版本名称
         */
        selectedVersionName: computed(() => {
            // 仅使用版本ID模式时，此处返回ID
            if (!store.selectedVersion?.value) return '';
            const id = store.selectedVersion.value;
            // 若 future 再次支持对象，可在此兼容
            return id;
        }),

        /**
         * 选中的项目名称
         */
        selectedProjectName: computed(() => {
            // 仅使用项目ID模式时，此处返回ID
            if (!store.selectedProject?.value) return '';
            return store.selectedProject.value;
        }),

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
            const file = store.files?.value?.find(f => f.fileId === store.selectedFileId?.value);
            return file?.language || 'text';
        }),

        /**
         * 当前文件的评论数量
         */
        currentFileCommentCount: computed(() => {
            if (!store.selectedFileId?.value || !store.comments?.value) return 0;
            return store.comments.value.filter(c => c.fileId === store.selectedFileId.value).length;
        }),

        /**
         * 是否有项目数据
         */
        hasProjects: computed(() => {
            return store.projects?.value && store.projects.value.length > 0;
        }),

        /**
         * 是否有版本数据
         */
        hasVersions: computed(() => {
            return store.availableVersions?.value && store.availableVersions.value.length > 0;
        }),

        /**
         * 是否已选择项目
         */
        isProjectSelected: computed(() => {
            return !!store.selectedProject?.value;
        }),

        /**
         * 是否已选择版本
         */
        isVersionSelected: computed(() => {
            return !!store.selectedVersion?.value;
        }),

        /**
         * 当前项目信息
         */
        currentProject: computed(() => {
            if (!store.selectedProject?.value || !store.projects?.value) return null;
            return store.projects.value.find(p => p.id === store.selectedProject.value);
        }),

        /**
         * 当前版本信息
         */
        currentVersion: computed(() => {
            if (!store.selectedVersion?.value || !store.availableVersions?.value) return null;
            return store.availableVersions.value.find(v => v.id === store.selectedVersion.value);
        }),

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
         * 选中的版本名称
         */
        selectedVersionName: computed(() => {
            if (!store.selectedVersion?.value) return '';
            return store.selectedVersion.value;
        })
    };
};




