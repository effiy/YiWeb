/**
 * 代码审查页面数据存储管理
 * author: liangliang
 */

import { getData, postData, deleteData, updateData } from '/apis/index.js';
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
    // 侧边栏收缩状态
    const sidebarCollapsed = vueRef(false);
    // 评论区收缩状态
    const commentsCollapsed = vueRef(false);
    
    // 项目/版本管理
    const projects = vueRef([]);
    const selectedProject = vueRef('');
    const selectedVersion = vueRef('');
    const availableVersions = vueRef([]);
    // 版本选择器状态
    const versionSelectorExpanded = vueRef(false);
    
    // 搜索相关状态
    const searchQuery = vueRef('');
    // 新增评论内容
    const newComment = vueRef('');
    
    // 评论者相关状态
    const commenters = vueRef([]);
    const selectedCommenterIds = vueRef([]);
    const commentersLoading = vueRef(false);
    const commentersError = vueRef('');

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
            
            try {
                // 调用MongoDB接口获取评论数据
                let url = `${window.API_URL}/mongodb/?cname=comments`;
                url += `&projectId=${project}`;
                url += `&versionId=${version}`;
                
                // 如果有当前选中的文件，也添加到参数中
                if (selectedFileId.value) {
                    url += `&fileId=${selectedFileId.value}`;
                }
                
                console.log('[loadComments] 调用MongoDB接口:', url);
                const response = await getData(url);
                
                if (response && response.data && response.data.list) {
                    comments.value = response.data.list;
                    console.log(`[loadComments] 成功加载 ${comments.value.length} 条评论`);
                    console.log('[loadComments] 评论数据详情:', comments.value);
                    return comments.value;
                } else {
                    comments.value = [];
                    console.log('[loadComments] 没有评论数据');
                    return [];
                }
            } catch (error) {
                console.error('[loadComments] 加载评论失败:', error);
                comments.value = [];
                return [];
            }
        }, '评论数据加载', (errorInfo) => {
            error.value = errorInfo.message;
            errorMessage.value = errorInfo.message;
            comments.value = [];
        });
    };

    /**
     * 异步加载评论者数据
     */
    const loadCommenters = async (projectId = null, versionId = null) => {
        return safeExecuteAsync(async () => {
            commentersLoading.value = true;
            commentersError.value = '';
            
            console.log('[loadCommenters] 正在加载评论者数据...', { projectId, versionId });
            
            // 检查是否有项目/版本信息
            const project = projectId || selectedProject.value;
            const version = versionId || selectedVersion.value;
            
            if (!project || !version) {
                console.log('[loadCommenters] 项目/版本信息不完整，跳过评论者加载');
                commenters.value = [];
                return [];
            }
            
            console.log('[loadCommenters] 项目/版本信息完整，开始加载评论者');
            
            try {
                let url = `${window.API_URL}/mongodb/?cname=commenters`;
                url += `&projectId=${project}`;
                url += `&versionId=${version}`;
                
                console.log('[loadCommenters] 调用MongoDB接口:', url);
                const response = await getData(url);
                
                if (response && response.data && response.data.list) {
                    commenters.value = response.data.list;
                    console.log(`[loadCommenters] 成功加载 ${commenters.value.length} 个评论者`);
                    return commenters.value;
                } else {
                    commenters.value = [];
                    console.log('[loadCommenters] 没有评论者数据');
                    return [];
                }
            } catch (error) {
                console.error('[loadCommenters] 加载评论者失败:', error);
                commenters.value = [];
                return [];
            }
        }, '评论者数据加载', (errorInfo) => {
            commentersError.value = errorInfo.message;
            commenters.value = [];
        }).finally(() => {
            commentersLoading.value = false;
        });
    };

    /**
     * 添加评论者
     */
    const addCommenter = async (commenterData, projectId = null, versionId = null) => {
        return safeExecuteAsync(async () => {
            console.log('[addCommenter] 正在添加评论者...', { commenterData, projectId, versionId });
            
            // 检查是否有项目/版本信息
            const project = projectId || selectedProject.value;
            const version = versionId || selectedVersion.value;
            
            if (!project || !version) {
                throw new Error('项目/版本信息不完整，无法添加评论者');
            }
            
            // 构建添加URL
            let url = `${window.API_URL}/mongodb/?cname=commenters`;
            
            // 构建请求数据
            const requestData = {
                ...commenterData,
                projectId: project,
                versionId: version
            };
            
            console.log('[addCommenter] 调用MongoDB接口:', url, requestData);
            
            try {
                // 检查网络连接
                if (!navigator.onLine) {
                    throw new Error('网络连接不可用，请检查网络设置');
                }
                
                // 检查API_URL是否可用
                if (!window.API_URL) {
                    throw new Error('API配置错误：API_URL未定义');
                }
                
                console.log('[addCommenter] API_URL:', window.API_URL);
                console.log('[addCommenter] 完整请求URL:', url);
                
                // 使用POST方法添加评论者
                const response = await postData(url, requestData);
                
                console.log('[addCommenter] 添加响应:', response);
                
                if (response && response.status === 200) {
                    console.log('[addCommenter] 评论者添加成功');
                    // 重新加载评论者列表
                    await loadCommenters(project, version);
                    return response.data;
                } else {
                    const errorMsg = response?.message || response?.error || '服务器返回错误';
                    console.error('[addCommenter] 服务器返回错误:', response);
                    throw new Error('添加评论者失败: ' + errorMsg);
                }
            } catch (error) {
                console.error('[addCommenter] 添加请求失败:', error);
                
                // 提供更详细的错误信息
                let errorMessage = '添加评论者失败: ';
                
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    errorMessage += '网络请求失败，可能是网络连接问题或API服务器不可用';
                } else if (error.status === 404) {
                    errorMessage += 'API接口不存在';
                } else if (error.status === 500) {
                    errorMessage += '服务器内部错误';
                } else if (error.status === 403) {
                    errorMessage += '访问被拒绝，请检查权限';
                } else if (error.message.includes('timeout')) {
                    errorMessage += '请求超时，请检查网络连接';
                } else {
                    errorMessage += error.message || '未知错误';
                }
                
                console.error('[addCommenter] 详细错误信息:', {
                    name: error.name,
                    message: error.message,
                    status: error.status,
                    stack: error.stack
                });
                
                throw new Error(errorMessage);
            }
        }, '添加评论者', (errorInfo) => {
            commentersError.value = errorInfo.message;
        });
    };

    /**
     * 更新评论者
     */
    const updateCommenter = async (commenterKey, commenterData, projectId = null, versionId = null) => {
        return safeExecuteAsync(async () => {
            console.log('[updateCommenter] 正在更新评论者...', { commenterKey, commenterData, projectId, versionId });
            
            // 检查是否有项目/版本信息
            const project = projectId || selectedProject.value;
            const version = versionId || selectedVersion.value;
            
            if (!project || !version) {
                throw new Error('项目/版本信息不完整，无法更新评论者');
            }
            
            // 构建更新URL
            let url = `${window.API_URL}/mongodb/?cname=commenters`;
            
            console.log('[updateCommenter] 调用MongoDB接口:', url);
            
            try {
                // 使用PUT方法更新评论者
                const response = await updateData(url, {
                  ...commenterData,
                  key: commenterKey,
                  projectId: project,
                  versionId: version
                });
                
                console.log('[updateCommenter] 更新响应:', response);
                
                if (response && response.status === 200) {
                    console.log('[updateCommenter] 评论者更新成功');
                    // 重新加载评论者列表
                    await loadCommenters(project, version);
                    return response.data;
                } else {
                    throw new Error('更新评论者失败: ' + (response?.message || '未知错误'));
                }
            } catch (error) {
                console.error('[updateCommenter] 更新请求失败:', error);
                throw new Error('更新评论者失败: ' + error.message);
            }
        }, '更新评论者', (errorInfo) => {
            commentersError.value = errorInfo.message;
        });
    };

    /**
     * 删除评论者
     */
    const deleteCommenter = async (commenterKey, projectId = null, versionId = null) => {
        return safeExecuteAsync(async () => {
            console.log('[deleteCommenter] 正在删除评论者...', { commenterKey, projectId, versionId });
            
            // 验证评论者key
            if (!commenterKey) {
                throw new Error('评论者key不能为空');
            }
            
            // 检查是否有项目/版本信息
            const project = projectId || selectedProject.value;
            const version = versionId || selectedVersion.value;
            
            if (!project || !version) {
                throw new Error('项目/版本信息不完整，无法删除评论者');
            }
            
            // 构建删除URL
            let url = `${window.API_URL}/mongodb/?cname=commenters&key=${commenterKey}`;
            
            console.log('[deleteCommenter] 调用MongoDB接口:', url);
            
            try {
                // 使用DELETE方法删除评论者
                const response = await deleteData(url);
                
                console.log('[deleteCommenter] 删除响应:', response);
                
                if (response && response.status === 200) {
                    console.log('[deleteCommenter] 评论者删除成功');
                    // 重新加载评论者列表
                    await loadCommenters(project, version);
                    return response.data;
                } else {
                    throw new Error('删除评论者失败: ' + (response?.message || '未知错误'));
                }
            } catch (error) {
                console.error('[deleteCommenter] 删除请求失败:', error);
                throw new Error('删除评论者失败: ' + error.message);
            }
        }, '删除评论者', (errorInfo) => {
            commentersError.value = errorInfo.message;
        });
    };

    /**
     * 设置选中的评论者ID列表
     */
    const setSelectedCommenterIds = (commenterIds) => {
        if (Array.isArray(commenterIds)) {
            selectedCommenterIds.value = commenterIds;
        }
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
                { id: 'YiAi', name: 'YiAI' },
                { id: 'YiWeb', name: 'YiWeb' },
                { id: 'YiMobile', name: 'YiMobile' }
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
                { id: '2025-07-30', name: '2025-07-30' },
                { id: '2025-07-29', name: '2025-07-29' },
                { id: '2025-07-28', name: '2025-07-28' }
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
     * 设置新增评论内容
     * @param {string} content - 评论内容
     */
    const setNewComment = (content) => {
        newComment.value = content;
        console.log('[setNewComment] 设置评论内容:', content);
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
                loadComments(selectedProject.value, selectedVersion.value),
                loadCommenters(selectedProject.value, selectedVersion.value)
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
        sidebarCollapsed,
        commentsCollapsed,
        
        // 项目/版本管理
        projects,
        selectedProject,
        selectedVersion,
        availableVersions,
        versionSelectorExpanded,
        
        // 搜索相关状态
        searchQuery,
        newComment,
        
        // 评论者相关状态
        commenters,
        selectedCommenterIds,
        commentersLoading,
        commentersError,
        
        // 方法
        loadFileTree,
        loadFiles,
        loadComments,
        loadCommenters,
        addCommenter,
        updateCommenter,
        deleteCommenter,
        setSelectedCommenterIds,
        setSelectedFileId,
        toggleFolder,
        addComment,
        toggleSidebar,
        toggleComments,
        loadProjects,
        loadVersions,
        setSelectedProject,
        setSelectedVersion,
        setNewComment,
        refreshData,
        clearError
    };
};








