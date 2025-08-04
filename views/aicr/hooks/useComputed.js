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
    const { 
        fileTree,
        files, 
        comments, 
        selectedFileId,
        expandedFolders,
        loading,
        error,
        // 项目/版本管理
        projects,
        selectedProject,
        selectedVersion,
        availableVersions,
        // 搜索相关状态
        searchQuery
    } = store;

    return {
        /**
         * 是否有文件树数据
         */
        hasFileTree: computed(() => {
            return fileTree.value && fileTree.value.length > 0;
        }),

        /**
         * 是否有文件数据
         */
        hasFiles: computed(() => {
            return files.value && files.value.length > 0;
        }),

        /**
         * 当前选中的文件
         */
        currentFile: computed(() => {
            if (!selectedFileId.value || !files.value) return null;
            return files.value.find(f => f.fileId === selectedFileId.value);
        }),

        /**
         * 当前文件的评论
         */
        currentComments: computed(() => {
            if (!selectedFileId.value || !comments.value) return [];
            return comments.value.filter(c => {
                // 兼容不同的文件标识方式
                return c.fileId === selectedFileId.value || (c.fileInfo && c.fileInfo.path === selectedFileId.value);
            });
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
            
            if (fileTree.value) {
                countItems(fileTree.value);
            }
            
            return stats;
        }),

        /**
         * 评论统计信息
         */
        commentStats: computed(() => {
            const stats = { total: 0, byFile: {} };
            
            if (comments.value) {
                stats.total = comments.value.length;
                
                comments.value.forEach(comment => {
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
         * 是否正在加载
         */
        isLoading: computed(() => {
            return loading.value;
        }),

        /**
         * 是否有错误
         */
        hasError: computed(() => {
            return !!error.value;
        }),

        /**
         * 文件夹是否展开
         */
        isFolderExpanded: computed(() => {
            return (folderId) => expandedFolders.value.has(folderId);
        }),

        /**
         * 当前文件的语言类型
         */
        currentFileLanguage: computed(() => {
            const file = files.value?.find(f => f.fileId === selectedFileId.value);
            return file?.language || 'text';
        }),

        /**
         * 当前文件的评论数量
         */
        currentFileCommentCount: computed(() => {
            if (!selectedFileId.value || !comments.value) return 0;
            return comments.value.filter(c => c.fileId === selectedFileId.value).length;
        }),

        /**
         * 是否有项目数据
         */
        hasProjects: computed(() => {
            return projects.value && projects.value.length > 0;
        }),

        /**
         * 是否有版本数据
         */
        hasVersions: computed(() => {
            return availableVersions.value && availableVersions.value.length > 0;
        }),

        /**
         * 是否已选择项目
         */
        isProjectSelected: computed(() => {
            return !!selectedProject.value;
        }),

        /**
         * 是否已选择版本
         */
        isVersionSelected: computed(() => {
            return !!selectedVersion.value;
        }),

        /**
         * 当前项目信息
         */
        currentProject: computed(() => {
            if (!selectedProject.value || !projects.value) return null;
            return projects.value.find(p => p.id === selectedProject.value);
        }),

        /**
         * 当前版本信息
         */
        currentVersion: computed(() => {
            if (!selectedVersion.value || !availableVersions.value) return null;
            return availableVersions.value.find(v => v.id === selectedVersion.value);
        }),

        /**
         * 搜索查询值 - 用于模板中的条件判断
         */
        searchQueryValue: computed(() => {
            // 添加调试信息
            console.log('[searchQueryValue] searchQuery状态:', searchQuery);
            console.log('[searchQueryValue] searchQuery.value:', searchQuery?.value);
            
            // 安全地获取搜索查询值
            const query = searchQuery && typeof searchQuery.value !== 'undefined' ? searchQuery.value : '';
            console.log('[searchQueryValue] 返回的查询值:', query);
            
            return query;
        })
    };
};



