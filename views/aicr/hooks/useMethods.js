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
    // 添加调试信息
    console.log('[useMethods] store对象:', store);
    console.log('[useMethods] searchQuery状态:', store.searchQuery);
    
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
        // 重构后的项目/版本管理
        projects,
        selectedProject,
        selectedVersion,
        availableVersions,
        setSelectedProject,
        setSelectedVersion,
        getVersionsByProject, // 重构后的方法
        loadFileTree,
        loadFiles,
        refreshData,

        // 搜索相关状态
        searchQuery,
        // 加载状态
        loading
    } = store;

    // 搜索相关状态
    let searchTimeout = null;
    
    // 添加searchQuery状态检查
    console.log('[useMethods] 解构后的searchQuery:', searchQuery);
    if (!searchQuery) {
        console.warn('[useMethods] searchQuery未在store中找到');
    }

    /**
     * 处理搜索输入
     * @param {Event} event - 输入事件
     */
    const handleSearchInput = (event) => {
        return safeExecute(() => {
            const value = event.target.value;
            
            // 添加安全检查
            if (searchQuery && typeof searchQuery.value !== 'undefined') {
                searchQuery.value = value;
            } else {
                console.warn('[搜索输入] searchQuery未定义或无效');
                return;
            }
            
            // 清除之前的定时器
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            // 设置防抖搜索
            searchTimeout = setTimeout(() => {
                performSearch(value);
            }, 300);
            
            console.log('[搜索输入] 搜索关键词:', value);
        }, '搜索输入处理');
    };

    /**
     * 执行搜索
     * @param {string} query - 搜索关键词
     */
    const performSearch = (query) => {
        return safeExecute(() => {
            if (!query || query.trim() === '') {
                // 清空搜索，显示所有内容
                clearSearchResults();
                return;
            }
            
            console.log('[搜索执行] 执行搜索:', query);
            
            // 这里可以实现具体的搜索逻辑
            // 例如：搜索文件、评论、代码内容等
            searchInFileTree(query);
            searchInComments(query);
            searchInCode(query);
            
        }, '搜索执行');
    };

    /**
     * 在文件树中搜索
     * @param {string} query - 搜索关键词
     */
    const searchInFileTree = (query) => {
        return safeExecute(() => {
            console.log('[文件树搜索] 搜索关键词:', query);
            // 实现文件树搜索逻辑
        }, '文件树搜索');
    };

    /**
     * 在评论中搜索
     * @param {string} query - 搜索关键词
     */
    const searchInComments = (query) => {
        return safeExecute(() => {
            console.log('[评论搜索] 搜索关键词:', query);
            // 实现评论搜索逻辑
        }, '评论搜索');
    };

    /**
     * 在代码中搜索
     * @param {string} query - 搜索关键词
     */
    const searchInCode = (query) => {
        return safeExecute(() => {
            console.log('[代码搜索] 搜索关键词:', query);
            // 实现代码搜索逻辑
        }, '代码搜索');
    };

    /**
     * 清除搜索结果
     */
    const clearSearchResults = () => {
        return safeExecute(() => {
            console.log('[清除搜索] 清除搜索结果');
            // 清除搜索高亮、恢复原始显示等
        }, '清除搜索结果');
    };

    /**
     * 清除搜索
     */
    const clearSearch = () => {
        return safeExecute(() => {
            // 清空搜索输入框
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.value = '';
            }
            
            // 清空搜索状态 - 添加安全检查
            if (searchQuery && typeof searchQuery.value !== 'undefined') {
                searchQuery.value = '';
            } else {
                console.warn('[清除搜索] searchQuery未定义或无效');
            }
            
            // 清除搜索结果
            clearSearchResults();
            
            console.log('[清除搜索] 搜索已清除');
        }, '清除搜索');
    };

    /**
     * 处理消息输入键盘事件
     * @param {Event} event - 键盘事件
     */
    const handleMessageInput = async (event) => {
        return safeExecute(() => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                // 执行搜索 - 添加安全检查
                const query = searchQuery && typeof searchQuery.value !== 'undefined' ? searchQuery.value : '';
                performSearch(query);
            } else if (event.key === 'Escape') {
                event.preventDefault();
                clearSearch();
            }
        }, '消息输入键盘事件处理');
    };

    /**
     * 处理输入法开始事件
     * @param {Event} event - 输入法开始事件
     */
    const handleCompositionStart = (event) => {
        return safeExecute(() => {
            console.log('[输入法] 开始输入');
        }, '输入法开始处理');
    };

    /**
     * 处理输入法结束事件
     * @param {Event} event - 输入法结束事件
     */
    const handleCompositionEnd = (event) => {
        return safeExecute(() => {
            console.log('[输入法] 结束输入');
            // 输入法结束后执行搜索
            performSearch(event.target.value);
        }, '输入法结束处理');
    };

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
                            console.log('[评论提交] 评论者:', commenter.name, commenter.key);
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

                // 立即在UI中显示新评论
                let commentAdded = false;
                
                // 方法1：通过ref直接调用组件方法
                if (window.aicrApp && window.aicrApp.$refs) {
                    const commentPanelRef = window.aicrApp.$refs['comment-panel'];
                    if (commentPanelRef && commentPanelRef.addCommentToLocalData) {
                        console.log('[评论提交] 方法1：通过ref直接调用组件方法');
                        commentPanelRef.addCommentToLocalData(comment);
                        commentAdded = true;
                    } else {
                        console.log('[评论提交] 方法1失败：无法获取评论面板组件引用或方法不存在');
                        console.log('[评论提交] commentPanelRef:', commentPanelRef);
                        console.log('[评论提交] aicrApp.$refs:', window.aicrApp.$refs);
                    }
                } else {
                    console.log('[评论提交] 方法1失败：无法获取aicrApp或$refs');
                }
                
                // 方法2：通过全局方法调用
                if (!commentAdded) {
                    try {
                        // 查找评论面板组件实例
                        const commentPanelElement = document.querySelector('.comment-panel-container');
                        if (commentPanelElement && commentPanelElement.__vueParentComponent) {
                            const componentInstance = commentPanelElement.__vueParentComponent.component;
                            if (componentInstance && componentInstance.addCommentGlobally) {
                                console.log('[评论提交] 方法2：通过全局方法调用');
                                componentInstance.addCommentGlobally(comment);
                                commentAdded = true;
                            }
                        }
                    } catch (error) {
                        console.log('[评论提交] 方法2失败:', error);
                    }
                }
                
                // 方法3：通过全局事件传递新评论数据
                if (!commentAdded) {
                    console.log('[评论提交] 方法3：通过全局事件传递新评论数据');
                    window.dispatchEvent(new CustomEvent('addNewComment', {
                        detail: { comment: comment }
                    }));
                }
                
                // 方法4：备用方案：直接触发重新加载评论
                if (!commentAdded) {
                    console.log('[评论提交] 方法4：使用备用方案：触发重新加载评论');
                    window.dispatchEvent(new CustomEvent('reloadComments', {
                        detail: { projectId: projectId, versionId: versionId, forceReload: true }
                    }));
                }
                
                // 方法5：额外确保comment-panel同步 - 增加延迟确保事件被正确处理
                console.log('[评论提交] 方法5：额外确保comment-panel同步');
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('addNewComment', {
                        detail: { comment: comment }
                    }));
                }, 100);
                
                // 方法6：最终备用方案 - 强制重新加载
                setTimeout(() => {
                    console.log('[评论提交] 方法6：最终备用方案 - 强制重新加载');
                    window.dispatchEvent(new CustomEvent('reloadComments', {
                        detail: { projectId: projectId, versionId: versionId, forceReload: true }
                    }));
                }, 1000);

                // 清空评论输入
                setNewComment('');

                // 重新加载评论数据 - 增加延迟和重试机制
                if (projectId && versionId) {
                    console.log('[评论提交] 开始重新加载评论数据');
                    
                    // 延迟重新加载，确保数据库写入完成
                    const reloadCommentsWithRetry = async (retryCount = 0) => {
                        try {
                            console.log(`[评论提交] 第${retryCount + 1}次尝试重新加载评论`);
                            await loadComments(projectId, versionId);
                            
                            // 触发评论面板重新加载mongoComments
                            console.log('[评论提交] 触发评论面板重新加载');
                            window.dispatchEvent(new CustomEvent('reloadComments', {
                                detail: { projectId: projectId, versionId: versionId }
                            }));
                            
                            // 验证评论是否成功加载
                            setTimeout(async () => {
                                try {
                                    // 验证评论是否已加载
                                    const { getData: verifyGetData } = await import('/apis/modules/crud.js');
                                    const verifyUrl = `${window.API_URL}/mongodb/?cname=comments&projectId=${projectId}&versionId=${versionId}`;
                                    if (selectedFileId.value) {
                                        verifyUrl += `&fileId=${selectedFileId.value}`;
                                    }
                                    
                                    const verifyResponse = await verifyGetData(verifyUrl);
                                    const newComments = verifyResponse.data.list || [];
                                    
                                    console.log('[评论提交] 验证评论加载结果:', newComments.length, '条评论');
                                    
                                    // 如果评论数量没有增加，且还有重试次数，则重试
                                    if (newComments.length <= comments.value.length && retryCount < 2) {
                                        console.log('[评论提交] 评论数量未增加，准备重试');
                                        setTimeout(() => {
                                            reloadCommentsWithRetry(retryCount + 1);
                                        }, 1000); // 1秒后重试
                                    } else {
                                        console.log('[评论提交] 评论重新加载完成');
                                    }
                                } catch (error) {
                                    console.error('[评论提交] 验证评论加载失败:', error);
                                }
                            }, 500);
                            
                        } catch (error) {
                            console.error(`[评论提交] 第${retryCount + 1}次重新加载失败:`, error);
                            if (retryCount < 2) {
                                console.log('[评论提交] 准备重试重新加载');
                                setTimeout(() => {
                                    reloadCommentsWithRetry(retryCount + 1);
                                }, 1000); // 1秒后重试
                            }
                        }
                    };
                    
                    // 延迟500ms后开始重新加载，确保数据库写入完成
                    setTimeout(() => {
                        reloadCommentsWithRetry();
                    }, 500);
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
                    console.log('[评论者选择] 评论者:', commenter.name, commenter.key);
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
                        console.log('[评论删除] 发送reloadComments事件');
                        window.dispatchEvent(new CustomEvent('reloadComments', {
                            detail: { projectId: selectedProject.value, versionId: selectedVersion.value }
                        }));
                    }, 200); // 增加延迟时间到200ms
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
                const result = await updateData(url, { key: commentId, status: 'resolved' });

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
                    }, 200); // 增加延迟时间到200ms
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
                const result = await updateData(url, { key: commentId, status: 'pending' });

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
                    }, 200); // 增加延迟时间到200ms
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
    const handleProjectChange = (projectId) => {
        return safeExecute(async () => {
            if (projectId) {
                console.log('[项目切换] 开始切换到项目:', projectId);
                
                // 设置loading状态
                loading.value = true;
                
                try {
                    // 设置选中的项目（这会自动更新版本列表）
                    setSelectedProject(projectId);
                    console.log('[项目切换] 项目已设置:', projectId);
                    
                    // 清空版本选择
                    setSelectedVersion('');
                    
                    // 清空评论数据，等待版本选择后重新加载
                    comments.value = [];
                    
                    // 清空评论者数据
                    if (store.commenters) {
                        store.commenters.value = [];
                        console.log('[项目切换] 评论者数据已清空');
                    }
                    
                    // 清空文件选择
                    setSelectedFileId(null);
                    
                    // 版本列表现在通过setSelectedProject自动更新
                    console.log('[项目切换] 版本列表已自动更新');
                    
                    // 显示成功消息
                    showSuccessMessage(`已切换到项目: ${projectId}`);
                    
                } catch (error) {
                    console.error('[项目切换] 项目切换失败:', error);
                    throw createError(`项目切换失败: ${error.message}`, ErrorTypes.API, '项目切换');
                } finally {
                    // 清除loading状态
                    loading.value = false;
                }
            }
        }, '项目切换处理');
    };

    /**
     * 处理版本切换
     */
    const handleVersionChange = (event) => {
        return safeExecute(async () => {
            const versionId = event.target.value;
            console.log('[版本切换] 开始处理版本切换:', versionId);
            console.log('[版本切换] 当前selectedVersion:', selectedVersion?.value);
            console.log('[版本切换] 当前availableVersions:', availableVersions?.value);
            
            if (versionId && versionId !== '') {
                console.log('[版本切换] 开始切换到版本:', versionId);
                
                // 设置loading状态
                loading.value = true;
                
                try {
                    // 设置选中的版本
                    setSelectedVersion(versionId);
                    console.log('[版本切换] 版本已设置:', versionId);
                    
                    // 清空文件选择
                    setSelectedFileId(null);
                    
                    // 清空评论数据
                    comments.value = [];
                    
                    // 加载文件树和文件数据
                    console.log('[版本切换] 开始加载文件树和文件数据...');
                    await Promise.all([
                        loadFileTree(selectedProject.value, versionId),
                        loadFiles(selectedProject.value, versionId)
                    ]);
                    console.log('[版本切换] 文件树和文件数据加载完成');
                    
                    // 加载评论数据
                    console.log('[版本切换] 开始加载评论数据...');
                    await loadComments(selectedProject.value, versionId);
                    console.log('[版本切换] 评论数据加载完成');
                    
                    // 重新加载评论者数据
                    console.log('[版本切换] 开始重新加载评论者数据...');
                    if (store.loadCommenters) {
                        await store.loadCommenters(selectedProject.value, versionId);
                        console.log('[版本切换] 评论者数据重新加载完成');
                    } else {
                        console.warn('[版本切换] store中loadCommenters方法不可用');
                    }
                    
                    // 触发项目/版本就绪事件，通知评论面板重新加载
                    console.log('[版本切换] 触发projectVersionReady事件');
                    window.dispatchEvent(new CustomEvent('projectVersionReady', {
                        detail: {
                            projectId: selectedProject.value,
                            versionId: versionId
                        }
                    }));
                    
                    // 显示成功消息
                    showSuccessMessage(`已切换到版本: ${versionId}`);
                    
                } catch (error) {
                    console.error('[版本切换] 版本切换失败:', error);
                    throw createError(`版本切换失败: ${error.message}`, ErrorTypes.API, '版本切换');
                } finally {
                    // 清除loading状态
                    loading.value = false;
                }
            } else {
                console.warn('[版本切换] versionId为空或无效');
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

    /**
     * 版本选择器已改为select元素，不再需要切换方法
     */

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
        refreshData: handleRefreshData,
        // 搜索相关方法
        handleSearchInput,
        clearSearch,
        handleMessageInput,
        handleCompositionStart,
        handleCompositionEnd
    };
};







