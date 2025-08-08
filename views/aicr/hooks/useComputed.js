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
         * 当前选中的文件
         */
        currentFile: computed(() => {
            if (!store.selectedFileId?.value || !store.files?.value) return null;
            return store.files.value.find(f => f.fileId === store.selectedFileId.value);
        }),

        /**
         * 当前文件的评论
         */
        currentComments: computed(() => {
            if (!store.selectedFileId?.value || !store.comments?.value) return [];
            return store.comments.value.filter(c => {
                // 兼容不同的文件标识方式
                return c.fileId === store.selectedFileId.value || (c.fileInfo && c.fileInfo.path === store.selectedFileId.value);
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
            if (!store.selectedVersion?.value || !store.availableVersions?.value) return '';
            const selectedVersion = store.availableVersions.value.find(v => v.id === store.selectedVersion.value);
            return selectedVersion ? selectedVersion.name : '';
        })
    };
};



