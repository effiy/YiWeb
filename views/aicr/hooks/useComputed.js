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
        error
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
        })
    };
};

