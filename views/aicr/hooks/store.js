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
    
    // 项目/版本管理
    const projects = vueRef([]);
    const selectedProject = vueRef('');
    const selectedVersion = vueRef('');
    const availableVersions = vueRef([]);

    /**
     * 异步加载文件树数据
     */
    const loadFileTree = async (projectId = null, versionId = null) => {
        return safeExecuteAsync(async () => {
            loading.value = true;
            error.value = null;
            errorMessage.value = '';
            
            console.log('[loadFileTree] 正在加载文件树数据...', { projectId, versionId });
            
            // 构建动态URL
            const project = projectId || selectedProject.value || 'YiAi';
            const version = versionId || selectedVersion.value || '2025-07-30';
            const url = `${window.DATA_URL}/aicr/${project}/${version}/tree.json`;
            
            const response = await getData(url);
            
            if (!response || typeof response !== 'object') {
                throw createError('文件树数据格式错误', ErrorTypes.API, '文件树加载');
            }
            
            // 将单个文件树对象包装成数组，以符合组件期望的格式
            fileTree.value = [response];
            console.log(`[loadFileTree] 成功加载文件树数据`);

            // 默认展开所有文件夹
            function collectAllFolderIds(nodes, set) {
                if (!Array.isArray(nodes)) {
                    // 如果是单个节点，直接处理
                    if (nodes.type === 'folder') {
                        set.add(nodes.id);
                        if (nodes.children) collectAllFolderIds(nodes.children, set);
                    }
                    return;
                }
                
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
    const loadFiles = async (projectId = null, versionId = null) => {
        return safeExecuteAsync(async () => {
            console.log('[loadFiles] 正在加载代码文件数据...', { projectId, versionId });
            
            // 构建动态URL
            const project = projectId || selectedProject.value || 'YiAi';
            const version = versionId || selectedVersion.value || '2025-07-30';
            const url = `${window.DATA_URL}/aicr/${project}/${version}/files.json`;
            
            const response = await getData(url);
            
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
    const loadComments = async (projectId = null, versionId = null) => {
        return safeExecuteAsync(async () => {
            console.log('[loadComments] 正在加载评论数据...', { projectId, versionId });
            
            // 检查是否有项目/版本信息
            const project = projectId || selectedProject.value;
            const version = versionId || selectedVersion.value;
            
            if (!project || !version) {
                console.log('[loadComments] 项目/版本信息不完整，跳过评论加载');
                comments.value = [];
                return [];
            }
            
            console.log('[loadComments] 项目/版本信息完整，开始加载评论');
            
            // 这里可以调用MongoDB接口获取评论数据
            // 目前返回空数组，实际应该调用MongoDB接口
            const response = [];
            
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
            key: Date.now(),
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
     * 加载项目列表
     */
    const loadProjects = async () => {
        return safeExecuteAsync(async () => {
            console.log('[loadProjects] 正在加载项目列表...');
            
            // 模拟项目数据，实际应该从API获取
            const mockProjects = [
                { id: 'YiAi', name: 'YiAI项目' },
                { id: 'YiWeb', name: 'YiWeb项目' },
                { id: 'YiMobile', name: 'YiMobile项目' }
            ];
            
            projects.value = mockProjects;
            console.log('[loadProjects] 成功加载项目列表:', mockProjects);
            
            return mockProjects;
        }, '项目列表加载', (errorInfo) => {
            error.value = errorInfo.message;
            errorMessage.value = errorInfo.message;
            projects.value = [];
        });
    };

    /**
     * 加载版本列表
     */
    const loadVersions = async (projectId) => {
        return safeExecuteAsync(async () => {
            console.log('[loadVersions] 正在加载版本列表...', { projectId });
            
            // 模拟版本数据，实际应该从API获取
            const mockVersions = [
                { id: '2025-07-30', name: '2025-07-30版本' },
                { id: '2025-07-29', name: '2025-07-29版本' },
                { id: '2025-07-28', name: '2025-07-28版本' }
            ];
            
            availableVersions.value = mockVersions;
            console.log('[loadVersions] 成功加载版本列表:', mockVersions);
            
            return mockVersions;
        }, '版本列表加载', (errorInfo) => {
            error.value = errorInfo.message;
            errorMessage.value = errorInfo.message;
            availableVersions.value = [];
        });
    };

    /**
     * 设置选中的项目
     */
    const setSelectedProject = (projectId) => {
        selectedProject.value = projectId;
        selectedVersion.value = ''; // 清空版本选择
        availableVersions.value = []; // 清空版本列表
    };

    /**
     * 设置选中的版本
     */
    const setSelectedVersion = (versionId) => {
        selectedVersion.value = versionId;
    };

    /**
     * 刷新数据
     */
    const refreshData = async () => {
        if (!selectedProject.value || !selectedVersion.value) {
            console.warn('[refreshData] 请先选择项目和版本');
            return;
        }
        
        console.log('[refreshData] 正在刷新数据...', { 
            project: selectedProject.value, 
            version: selectedVersion.value 
        });
        
        try {
            await Promise.all([
                loadFileTree(selectedProject.value, selectedVersion.value),
                loadFiles(selectedProject.value, selectedVersion.value),
                loadComments(selectedProject.value, selectedVersion.value)
            ]);
            
            // 清空选中的文件
            selectedFileId.value = null;
            
            console.log('[refreshData] 数据刷新完成');
        } catch (error) {
            console.error('[refreshData] 数据刷新失败:', error);
        }
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
        
        // 项目/版本管理
        projects,
        selectedProject,
        selectedVersion,
        availableVersions,
        
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
        loadProjects,
        loadVersions,
        setSelectedProject,
        setSelectedVersion,
        refreshData,
        clearError
    };
};






