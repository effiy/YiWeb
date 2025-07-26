/**
 * 方法函数组合式
 * 提供与代码审查相关的常用操作方法
 * author: liangliang
 * 
 * @param {Object} store - 状态存储对象
 * @returns {Object} 方法集合
 */
import { safeExecute, createError, ErrorTypes, showSuccessMessage } from '/utils/error.js';

export const useMethods = (store) => {
    const { 
        fileTree,
        comments,
        selectedFileId,
        expandedFolders,
        newComment,
        setSelectedFileId,
        toggleFolder,
        addComment,
        setNewComment,
    } = store;

    /**
     * 打开链接
     * @param {string} url - 链接地址
     */
    const openLink = (url) => {
        if (url) {
            window.open(url, '_blank');
        }
    };

    /**
     * 处理文件选择
     * @param {string} fileId - 文件ID
     */
    const handleFileSelect = (fileId) => {
        return safeExecute(() => {
            if (!fileId || typeof fileId !== 'string') {
                throw createError('文件ID无效', ErrorTypes.VALIDATION, '文件选择');
            }

            setSelectedFileId(fileId);
            showSuccessMessage(`已选择文件: ${fileId}`);
            console.log(`[文件选择] 选择文件: ${fileId}`);
        }, '文件选择处理');
    };

    /**
     * 处理文件夹切换
     * @param {string} folderId - 文件夹ID
     */
    const handleFolderToggle = (folderId) => {
        return safeExecute(() => {
            if (!folderId || typeof folderId !== 'string') {
                throw createError('文件夹ID无效', ErrorTypes.VALIDATION, '文件夹切换');
            }

            toggleFolder(folderId);
            const isExpanded = expandedFolders.value.has(folderId);
            console.log(`[文件夹切换] ${folderId}: ${isExpanded ? '展开' : '收起'}`);
        }, '文件夹切换处理');
    };

    /**
     * 处理评论提交
     * @param {Object} commentData - 评论数据
     */
    const handleCommentSubmit = (commentData) => {
        return safeExecute(() => {
            if (!commentData || !commentData.content) {
                throw createError('评论内容不能为空', ErrorTypes.VALIDATION, '评论提交');
            }

            if (!selectedFileId.value) {
                throw createError('请先选择文件', ErrorTypes.VALIDATION, '评论提交');
            }

            const comment = {
                ...commentData,
                fileId: selectedFileId.value
            };

            addComment(comment);
            setNewComment('');
            showSuccessMessage('评论添加成功');
            console.log(`[评论提交] 为文件 ${selectedFileId.value} 添加评论`);
        }, '评论提交处理');
    };

    /**
     * 处理评论输入
     * @param {Event} event - 输入事件
     */
    const handleCommentInput = (event) => {
        return safeExecute(() => {
            const value = event.target.value;
            setNewComment(value);
        }, '评论输入处理');
    };

    /**
     * 处理评论键盘事件
     * @param {Event} event - 键盘事件
     */
    const handleCommentKeydown = (event) => {
        return safeExecute(() => {
            if (event.key === 'Escape') {
                setNewComment('');
            } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                if (newComment.value.trim()) {
                    handleCommentSubmit({ content: newComment.value.trim() });
                }
            }
        }, '评论键盘事件处理');
    };

    /**
     * 清空所有评论
     */
    const clearAllComments = () => {
        return safeExecute(() => {
            if (comments.value.length === 0) {
                throw createError('没有评论可清空', ErrorTypes.VALIDATION, '清空评论');
            }

            if (confirm('确定要清空所有评论吗？此操作不可撤销。')) {
                comments.value.length = 0;
                showSuccessMessage('已清空所有评论');
            }
        }, '清空评论');
    };

    /**
     * 展开所有文件夹
     */
    const expandAllFolders = () => {
        return safeExecute(() => {
            const expandFolder = (items) => {
                items.forEach(item => {
                    if (item.type === 'folder') {
                        expandedFolders.value.add(item.id);
                        if (item.children) {
                            expandFolder(item.children);
                        }
                    }
                });
            };

            if (fileTree.value) {
                expandFolder(fileTree.value);
                showSuccessMessage('已展开所有文件夹');
            }
        }, '展开所有文件夹');
    };

    /**
     * 收起所有文件夹
     */
    const collapseAllFolders = () => {
        return safeExecute(() => {
            expandedFolders.value.clear();
            showSuccessMessage('已收起所有文件夹');
        }, '收起所有文件夹');
    };

    return {
        openLink,
        handleFileSelect,
        handleFolderToggle,
        handleCommentSubmit,
        handleCommentInput,
        handleCommentKeydown,
        clearAllComments,
        expandAllFolders,
        collapseAllFolders
    };
};
