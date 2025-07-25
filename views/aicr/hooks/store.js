/**
 * 代码审查页面数据存储管理
 * author: liangliang
 */

import { getData } from '/apis/index.js';
import { safeExecuteAsync, createError, ErrorTypes } from '/utils/error.js';

// 兼容Vue2和Vue3的ref获取方式
const vueRef = typeof Vue !== 'undefined' && Vue.ref ? Vue.ref : (val) => ({ value: val });

/**
 * 数据存储工厂函数
 * 管理文件树、代码文件、评论数据、选中状态、加载状态和错误信息
 * @returns {Object} store对象，包含fileTree, files, comments, selectedFileId等方法
 */
export const createStore = () => {
    // 文件目录树
    const fileTree = vueRef([]);
    // 代码文件内容
    const files = vueRef([]);
    // 评论数据
    const comments = vueRef([]);
    // 当前选中的文件ID
    const selectedFileId = vueRef(null);
    // 加载状态
    const loading = vueRef(false);
    // 错误信息
    const error = vueRef(null);
    // 错误消息
    const errorMessage = vueRef('');
    // 展开的文件夹状态
    const expandedFolders = vueRef(new Set());
    // 新评论内容
    const newComment = vueRef('');
    // 侧边栏收缩状态
    const sidebarCollapsed = vueRef(false);
    // 评论区收缩状态
    const commentsCollapsed = vueRef(false);

    /**
     * 异步加载文件树数据
     */
    const loadFileTree = async () => {
        return safeExecuteAsync(async () => {
            loading.value = true;
            error.value = null;
            errorMessage.value = '';
            
            console.log('[loadFileTree] 正在加载文件树数据...');
            
            const response = await getData('/views/aicr/mock/fileTree.json');
            
            if (!Array.isArray(response)) {
                throw createError('文件树数据格式错误', ErrorTypes.API, '文件树加载');
            }
            
            fileTree.value = response;
            console.log(`[loadFileTree] 成功加载文件树数据`);

            // 默认展开所有文件夹
            function collectAllFolderIds(nodes, set) {
                nodes.forEach(item => {
                    if (item.type === 'folder') {
                        set.add(item.id);
                        if (item.children) collectAllFolderIds(item.children, set);
                    }
                });
            }
            const allFolders = new Set();
            collectAllFolderIds(response, allFolders);
            expandedFolders.value = allFolders;
            
            return response;
        }, '文件树数据加载', (errorInfo) => {
            error.value = errorInfo.message;
            errorMessage.value = errorInfo.message;
            fileTree.value = [];
        }).finally(() => {
            loading.value = false;
        });
    };

    /**
     * 异步加载代码文件数据
     */
    const loadFiles = async () => {
        return safeExecuteAsync(async () => {
            console.log('[loadFiles] 正在加载代码文件数据...');
            
            const response = await getData('https://data.effiy.cn/mock/aicr/2025-07-25/files.json');
            
            if (!Array.isArray(response)) {
                throw createError('代码文件数据格式错误', ErrorTypes.API, '代码文件加载');
            }
            
            files.value = response;
            console.log(`[loadFiles] 成功加载 ${response.length} 个代码文件`);
            
            return response;
        }, '代码文件数据加载', (errorInfo) => {
            error.value = errorInfo.message;
            errorMessage.value = errorInfo.message;
            files.value = [];
        });
    };

    /**
     * 异步加载评论数据
     */
    const loadComments = async () => {
        return safeExecuteAsync(async () => {
            console.log('[loadComments] 正在加载评论数据...');
            
            const response = await getData('/views/aicr/mock/comments.json');
            
            if (!Array.isArray(response)) {
                throw createError('评论数据格式错误', ErrorTypes.API, '评论加载');
            }
            
            comments.value = response;
            console.log(`[loadComments] 成功加载 ${response.length} 条评论`);
            console.log('[loadComments] 评论数据详情:', response);
            
            return response;
        }, '评论数据加载', (errorInfo) => {
            error.value = errorInfo.message;
            errorMessage.value = errorInfo.message;
            comments.value = [];
        });
    };

    /**
     * 设置选中的文件ID
     * @param {string} fileId - 文件ID
     */
    const setSelectedFileId = (fileId) => {
        if (typeof fileId === 'string' || fileId === null) {
            selectedFileId.value = fileId;
        }
    };

    /**
     * 切换文件夹展开状态
     * @param {string} folderId - 文件夹ID
     */
    const toggleFolder = (folderId) => {
        if (expandedFolders.value.has(folderId)) {
            expandedFolders.value.delete(folderId);
        } else {
            expandedFolders.value.add(folderId);
        }
    };

    /**
     * 添加评论
     * @param {Object} commentData - 评论数据
     */
    const addComment = (commentData) => {
        if (!commentData || !commentData.content) return;
        
        const newCommentObj = {
            id: Date.now(),
            fileId: commentData.fileId,
            line: commentData.line || 0,
            author: commentData.author || 'liangliang',
            content: commentData.content,
            replies: [],
            timestamp: new Date().toISOString()
        };
        
        comments.value.push(newCommentObj);
    };

    /**
     * 设置新评论内容
     * @param {string} content - 评论内容
     */
    const setNewComment = (content) => {
        newComment.value = content;
    };

    /**
     * 切换侧边栏状态
     */
    const toggleSidebar = () => {
        sidebarCollapsed.value = !sidebarCollapsed.value;
    };

    /**
     * 切换评论区状态
     */
    const toggleComments = () => {
        commentsCollapsed.value = !commentsCollapsed.value;
    };

    /**
     * 清空错误
     */
    const clearError = () => {
        error.value = null;
        errorMessage.value = '';
    };

    // 返回状态和方法
    return {
        // 响应式数据
        fileTree,
        files,
        comments,
        selectedFileId,
        loading,
        error,
        errorMessage,
        expandedFolders,
        newComment,
        sidebarCollapsed,
        commentsCollapsed,
        
        // 方法
        loadFileTree,
        loadFiles,
        loadComments,
        setSelectedFileId,
        toggleFolder,
        addComment,
        setNewComment,
        toggleSidebar,
        toggleComments,
        clearError
    };
};



