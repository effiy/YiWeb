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
        toggleSidebar,
        toggleComments,
        // 项目/版本管理
        projects,
        selectedProject,
        selectedVersion,
        availableVersions,
        setSelectedProject,
        setSelectedVersion,
        loadVersions,
        refreshData
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
    const handleCommentSubmit = async (commentData) => {
        return safeExecute(async () => {
            if (!commentData || !commentData.content) {
                throw createError('评论内容不能为空', ErrorTypes.VALIDATION, '评论提交');
            }

            if (!selectedFileId.value) {
                throw createError('请先选择文件', ErrorTypes.VALIDATION, '评论提交');
            }

            console.log('[评论提交] 开始提交评论:', commentData);

            try {
                // 设置loading状态
                loading.value = true;
                console.log('[评论提交] 设置loading状态');
                
                // 显示全局loading
                const { showGlobalLoading, hideGlobalLoading } = await import('/utils/loading.js');
                showGlobalLoading('正在提交评论...');
                console.log('[评论提交] 显示全局loading');

                // 从选择器获取项目/版本信息
                const projectSelect = document.getElementById('projectSelect');
                const versionSelect = document.getElementById('versionSelect');
                
                let projectId = null;
                let versionId = null;
                
                if (projectSelect) {
                    projectId = projectSelect.value;
                }
                
                if (versionSelect) {
                    versionId = versionSelect.value;
                }

                // 构建评论数据
                const comment = {
                    ...commentData,
                    fileId: selectedFileId.value,
                    projectId: projectId,
                    versionId: versionId,
                    timestamp: new Date().toISOString()
                };

                // 处理fromSystem字段
                if (commentData.fromSystem) {
                    console.log('[评论提交] 评论者信息:', commentData.fromSystem);
                    if (Array.isArray(commentData.fromSystem)) {
                        console.log('[评论提交] 多个评论者:', commentData.fromSystem.length);
                        commentData.fromSystem.forEach(commenter => {
                            console.log('[评论提交] 评论者:', commenter.name, commenter.id);
                        });
                    } else {
                        console.log('[评论提交] 单个评论者:', commentData.fromSystem.name);
                    }
                    // 将评论者信息添加到评论数据中
                    comment.fromSystem = commentData.fromSystem;
                }

                console.log('[评论提交] 构建的评论数据:', comment);

                // 调用API提交评论
                const { postData } = await import('/apis/modules/crud.js');
                const result = await postData(`${window.API_URL}/mongodb/?cname=comments`, comment);

                console.log('[评论提交] API调用成功:', result);
                showSuccessMessage('评论添加成功');

                // 清空评论输入
                setNewComment('');

                // 重新加载评论数据
                if (projectId && versionId) {
                    console.log('[评论提交] 重新加载评论数据');
                    await loadComments(projectId, versionId);
                    
                    // 触发评论面板重新加载mongoComments
                    console.log('[评论提交] 触发评论面板重新加载');
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('reloadComments', {
                            detail: { projectId: projectId, versionId: versionId }
                        }));
                    }, 100);
                }

            } catch (error) {
                console.error('[评论提交] 提交失败:', error);
                throw createError(`评论提交失败: ${error.message}`, ErrorTypes.API, '评论提交');
            } finally {
                // 清除loading状态
                loading.value = false;
                console.log('[评论提交] 清除loading状态');
                
                // 隐藏全局loading
                try {
                    const { hideGlobalLoading } = await import('/utils/loading.js');
                    hideGlobalLoading();
                    console.log('[评论提交] 隐藏全局loading');
                } catch (error) {
                    console.error('[评论提交] 隐藏全局loading失败:', error);
                }
            }
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
                if (!Array.isArray(items)) {
                    // 如果是单个节点，直接处理
                    if (items.type === 'folder') {
                        expandedFolders.value.add(items.id);
                        if (items.children) {
                            expandFolder(items.children);
                        }
                    }
                    return;
                }
                
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

    /**
     * 处理评论者选择
     * @param {Array} commenters - 选中的评论者数组
     */
    const handleCommenterSelect = (commenters) => {
        return safeExecute(() => {
            console.log('[评论者选择] 选中的评论者:', commenters);
            
            if (commenters && commenters.length > 0) {
                console.log('[评论者选择] 选中的评论者数量:', commenters.length);
                commenters.forEach(commenter => {
                    console.log('[评论者选择] 评论者:', commenter.name, commenter.id);
                });
            } else {
                console.log('[评论者选择] 没有选中任何评论者');
            }
        }, '评论者选择处理');
    };

    /**
     * 处理评论删除
     * @param {string} commentId - 评论ID
     */
    const handleCommentDelete = async (commentId) => {
        return safeExecute(async () => {
            if (!commentId) {
                throw createError('评论ID不能为空', ErrorTypes.VALIDATION, '评论删除');
            }

            console.log('[评论删除] 开始删除评论:', commentId);

            try {
                // 显示全局loading
                const { showGlobalLoading, hideGlobalLoading } = await import('/utils/loading.js');
                showGlobalLoading('正在删除评论...');
                console.log('[评论删除] 显示全局loading');
                
                // 从选择器获取项目/版本信息
                const projectSelect = document.getElementById('projectSelect');
                const versionSelect = document.getElementById('versionSelect');
                
                let projectId = null;
                let versionId = null;
                
                if (projectSelect) {
                    projectId = projectSelect.value;
                }
                
                if (versionSelect) {
                    versionId = versionSelect.value;
                }

                // 构建删除接口URL
                let url = `${window.API_URL}/mongodb/?cname=comments`;
                
                // 添加项目/版本参数
                if (projectId) {
                    url += `&projectId=${projectId}`;
                }
                if (versionId) {
                    url += `&versionId=${versionId}`;
                }

                // 添加评论key参数
                url += `&key=${commentId}`;

                console.log('[评论删除] 调用删除接口:', url);

                // 调用删除接口
                const { deleteData } = await import('/apis/modules/crud.js');
                const result = await deleteData(url);

                console.log('[评论删除] 删除成功:', result);
                showSuccessMessage('评论删除成功');

                // 重新加载评论数据
                if (selectedProject.value && selectedVersion.value) {
                    console.log('[评论删除] 重新加载评论数据');
                    await loadComments(selectedProject.value, selectedVersion.value);
                    
                    // 触发评论面板重新加载mongoComments
                    console.log('[评论删除] 触发评论面板重新加载');
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('reloadComments', {
                            detail: { projectId: selectedProject.value, versionId: selectedVersion.value }
                        }));
                    }, 100);
                }

            } catch (error) {
                console.error('[评论删除] 删除失败:', error);
                throw createError(`删除评论失败: ${error.message}`, ErrorTypes.API, '评论删除');
            } finally {
                // 隐藏全局loading
                try {
                    const { hideGlobalLoading } = await import('/utils/loading.js');
                    hideGlobalLoading();
                    console.log('[评论删除] 隐藏全局loading');
                } catch (error) {
                    console.error('[评论删除] 隐藏全局loading失败:', error);
                }
            }
        }, '评论删除处理');
    };

    /**
     * 处理评论解决
     * @param {string} commentId - 评论ID
     */
    const handleCommentResolve = async (commentId) => {
        return safeExecute(async () => {
            if (!commentId) {
                throw createError('评论ID不能为空', ErrorTypes.VALIDATION, '评论解决');
            }

            console.log('[评论解决] 开始解决评论:', commentId);

            try {
                // 显示全局loading
                const { showGlobalLoading, hideGlobalLoading } = await import('/utils/loading.js');
                showGlobalLoading('正在解决评论...');
                console.log('[评论解决] 显示全局loading');
                
                // 从选择器获取项目/版本信息
                const projectSelect = document.getElementById('projectSelect');
                const versionSelect = document.getElementById('versionSelect');
                
                let projectId = null;
                let versionId = null;
                
                if (projectSelect) {
                    projectId = projectSelect.value;
                }
                
                if (versionSelect) {
                    versionId = versionSelect.value;
                }

                // 构建解决评论的URL
                let url = `${window.API_URL}/mongodb/?cname=comments`;
                
                // 添加项目/版本参数
                if (projectId) {
                    url += `&projectId=${projectId}`;
                }
                if (versionId) {
                    url += `&versionId=${versionId}`;
                }

                // 添加评论key参数
                url += `&key=${commentId}`;
                url += `&status=resolved`;

                console.log('[评论解决] 调用解决接口:', url);

                // 调用更新接口
                const { updateData } = await import('/apis/modules/crud.js');
                const result = await updateData(url);

                console.log('[评论解决] 解决成功:', result);
                showSuccessMessage('评论已标记为已解决');

                // 重新加载评论数据
                if (selectedProject.value && selectedVersion.value) {
                    console.log('[评论解决] 重新加载评论数据');
                    await loadComments(selectedProject.value, selectedVersion.value);
                    
                    // 触发评论面板重新加载mongoComments
                    console.log('[评论解决] 触发评论面板重新加载');
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('reloadComments', {
                            detail: { projectId: selectedProject.value, versionId: selectedVersion.value }
                        }));
                    }, 100);
                }

            } catch (error) {
                console.error('[评论解决] 解决失败:', error);
                throw createError(`解决评论失败: ${error.message}`, ErrorTypes.API, '评论解决');
            } finally {
                // 隐藏全局loading
                try {
                    const { hideGlobalLoading } = await import('/utils/loading.js');
                    hideGlobalLoading();
                    console.log('[评论解决] 隐藏全局loading');
                } catch (error) {
                    console.error('[评论解决] 隐藏全局loading失败:', error);
                }
            }
        }, '评论解决处理');
    };

    /**
     * 处理评论重新打开
     * @param {string} commentId - 评论ID
     */
    const handleCommentReopen = async (commentId) => {
        return safeExecute(async () => {
            if (!commentId) {
                throw createError('评论ID不能为空', ErrorTypes.VALIDATION, '评论重新打开');
            }

            console.log('[评论重新打开] 开始重新打开评论:', commentId);

            try {
                // 显示全局loading
                const { showGlobalLoading, hideGlobalLoading } = await import('/utils/loading.js');
                showGlobalLoading('正在重新打开评论...');
                console.log('[评论重新打开] 显示全局loading');
                
                // 从选择器获取项目/版本信息
                const projectSelect = document.getElementById('projectSelect');
                const versionSelect = document.getElementById('versionSelect');
                
                let projectId = null;
                let versionId = null;
                
                if (projectSelect) {
                    projectId = projectSelect.value;
                }
                
                if (versionSelect) {
                    versionId = versionSelect.value;
                }

                // 构建重新打开评论的URL
                let url = `${window.API_URL}/mongodb/?cname=comments`;
                
                // 添加项目/版本参数
                if (projectId) {
                    url += `&projectId=${projectId}`;
                }
                if (versionId) {
                    url += `&versionId=${versionId}`;
                }

                // 添加评论key参数
                url += `&key=${commentId}`;
                url += `&status=pending`;

                console.log('[评论重新打开] 调用重新打开接口:', url);

                // 调用更新接口
                const { updateData } = await import('/apis/modules/crud.js');
                const result = await updateData(url);

                console.log('[评论重新打开] 重新打开成功:', result);
                showSuccessMessage('评论已重新打开');

                // 重新加载评论数据
                if (selectedProject.value && selectedVersion.value) {
                    console.log('[评论重新打开] 重新加载评论数据');
                    await loadComments(selectedProject.value, selectedVersion.value);
                    
                    // 触发评论面板重新加载mongoComments
                    console.log('[评论重新打开] 触发评论面板重新加载');
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('reloadComments', {
                            detail: { projectId: selectedProject.value, versionId: selectedVersion.value }
                        }));
                    }, 100);
                }

            } catch (error) {
                console.error('[评论重新打开] 重新打开失败:', error);
                throw createError(`重新打开评论失败: ${error.message}`, ErrorTypes.API, '评论重新打开');
            } finally {
                // 隐藏全局loading
                try {
                    const { hideGlobalLoading } = await import('/utils/loading.js');
                    hideGlobalLoading();
                    console.log('[评论重新打开] 隐藏全局loading');
                } catch (error) {
                    console.error('[评论重新打开] 隐藏全局loading失败:', error);
                }
            }
        }, '评论重新打开处理');
    };

    /**
     * 加载评论数据
     * @param {string} projectId - 项目ID
     * @param {string} versionId - 版本ID
     */
    const loadComments = async (projectId, versionId) => {
        return safeExecute(async () => {
            if (!projectId || !versionId) {
                console.log('[加载评论] 项目/版本信息不完整，跳过加载');
                return;
            }

            console.log('[加载评论] 开始加载评论数据...');
            
            try {
                // 构建获取评论的URL
                let url = `${window.API_URL}/mongodb/?cname=comments`;
                url += `&projectId=${projectId}`;
                url += `&versionId=${versionId}`;

                // 如果有当前选中的文件，也添加到参数中
                if (selectedFileId.value) {
                    url += `&fileId=${selectedFileId.value}`;
                }

                console.log('[加载评论] 调用获取评论接口:', url);

                const { getData } = await import('/apis/modules/crud.js');
                const response = await getData(url);

                // 更新评论数据
                if (response && response.data && response.data.list) {
                    comments.value = response.data.list;
                    console.log('[加载评论] 评论数据更新成功，数量:', comments.value.length);
                } else {
                    comments.value = [];
                    console.log('[加载评论] 没有评论数据');
                }

            } catch (error) {
                console.error('[加载评论] 加载失败:', error);
                comments.value = [];
            }
        }, '评论数据加载');
    };

    /**
     * 更新评论的fromSystem字段
     * @param {Object} commentData - 评论数据
     */
    const updateCommentFromSystem = async (commentData) => {
        return safeExecute(async () => {
            try {
                // 这里可以调用接口更新评论的fromSystem字段
                // 示例接口调用：
                // const response = await fetch('/api/comments/update-from-system', {
                //     method: 'POST',
                //     headers: {
                //         'Content-Type': 'application/json'
                //     },
                //     body: JSON.stringify({
                //         commentId: commentData.id,
                //         fromSystem: commentData.fromSystem
                //     })
                // });
                
                console.log('[评论者选择] 评论fromSystem字段更新成功');
            } catch (error) {
                console.error('[评论者选择] 评论fromSystem字段更新失败:', error);
            }
        }, '更新评论fromSystem字段');
    };

    /**
     * 切换侧边栏
     */
    const handleToggleSidebar = () => {
        return safeExecute(() => {
            toggleSidebar();
            console.log('[侧边栏] 切换侧边栏状态');
        }, '侧边栏切换');
    };

    /**
     * 切换评论区
     */
    const handleToggleComments = () => {
        return safeExecute(() => {
            toggleComments();
            console.log('[评论区] 切换评论区状态');
        }, '评论区切换');
    };

    /**
     * 处理项目切换
     */
    const handleProjectChange = () => {
        return safeExecute(() => {
            if (selectedProject.value) {
                setSelectedProject(selectedProject.value);
                // 加载对应项目的版本列表
                loadVersions(selectedProject.value);
                console.log('[项目切换] 切换到项目:', selectedProject.value);
                
                // 清空评论数据，等待版本选择后重新加载
                comments.value = [];
            }
        }, '项目切换处理');
    };

    /**
     * 处理版本切换
     */
    const handleVersionChange = () => {
        return safeExecute(() => {
            if (selectedVersion.value) {
                setSelectedVersion(selectedVersion.value);
                console.log('[版本切换] 切换到版本:', selectedVersion.value);
                
                // 版本切换后重新加载评论数据
                setTimeout(async () => {
                    if (selectedProject.value && selectedVersion.value) {
                        console.log('[版本切换] 项目/版本信息完整，重新加载评论');
                        await loadComments(selectedProject.value, selectedVersion.value);
                    }
                }, 100);
            }
        }, '版本切换处理');
    };

    /**
     * 刷新数据
     */
    const handleRefreshData = () => {
        return safeExecute(() => {
            refreshData();
            console.log('[数据刷新] 刷新当前项目/版本数据');
        }, '数据刷新处理');
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
        collapseAllFolders,
        handleCommenterSelect,
        handleCommentDelete,
        handleCommentResolve,
        handleCommentReopen,
        loadComments,
        updateCommentFromSystem,
        toggleSidebar: handleToggleSidebar,
        toggleComments: handleToggleComments,
        // 项目/版本管理方法
        handleProjectChange,
        handleVersionChange,
        refreshData: handleRefreshData
    };
};




