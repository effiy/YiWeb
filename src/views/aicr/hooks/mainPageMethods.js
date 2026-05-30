import { useMethods } from '/src/views/aicr/hooks/useMethods.js';
import { logInfo, logWarn, logError } from '/cdn/utils/core/log.js';
import { formatTime as formatTimeUtil } from '/cdn/utils/core/common.js';

export const createMainPageMethods = (store) => {
    return {
        formatTime: function (timestamp) {
            try {
                return formatTimeUtil(timestamp, 'ago');
            } catch (_) {
                return '';
            }
        },
        handleFolderToggle: function (folderId) {
            logInfo('[主页面] 收到文件夹切换事件:', folderId);
            try {
                const methods = useMethods(store);
                methods.handleFolderToggle(folderId);
            } catch (error) {
                logError('[主页面] 文件夹切换处理失败:', error);
            }
        },
        handleCreateFolder: async function (payload) {
            try {
                const methods = useMethods(store);
                await methods.handleCreateFolder(payload);
                if (store) {
                    await store.loadFileTree();
                }
            } catch (error) {
                logError('[主页面] 新建文件夹失败:', error);
            }
        },
        handleCreateFile: async function (payload) {
            try {
                const methods = useMethods(store);
                await methods.handleCreateFile(payload);
                if (store) {
                    await Promise.all([
                        store.loadFileTree(),
                        store.loadFiles()
                    ]);
                }
            } catch (error) {
                logError('[主页面] 新建文件失败:', error);
            }
        },
        handleRenameItem: async function (payload) {
            try {
                const methods = useMethods(store);
                await methods.handleRenameItem(payload);
                if (store) {
                    await Promise.all([
                        store.loadFileTree(),
                        store.loadFiles()
                    ]);
                }
            } catch (error) {
                logError('[主页面] 重命名失败:', error);
            }
        },
        handleDeleteItem: async function (payload) {
            try {
                const methods = useMethods(store);
                const { showGlobalLoading, hideGlobalLoading } = await import('/cdn/utils/ui/loading.js');
                showGlobalLoading('正在删除，请稍候...');
                try {
                    await methods.handleDeleteItem(payload);
                    if (store) {
                        await Promise.all([
                            store.loadFileTree(),
                            store.loadFiles()
                        ]);
                    }
                } finally {
                    try { hideGlobalLoading(); } catch (_) { }
                }
            } catch (error) {
                logError('[主页面] 删除失败:', error);
            }
        },
        handleFolderImport: async function (payload) {
            try {
                const methods = useMethods(store);
                await methods.handleFolderImport(payload);
            } catch (error) {
                logError('[主页面] 目录导入失败:', error);
                alert('导入失败：' + (error?.message || '未知错误'));
            }
        },
        handleFileImport: async function (payload) {
            try {
                const methods = useMethods(store);
                await methods.handleFileImport(payload);
            } catch (error) {
                logError('[主页面] 文件导入失败:', error);
                alert('导入失败：' + (error?.message || '未知错误'));
            }
        },
        handleFolderExport: async function (payload) {
            try {
                const methods = useMethods(store);
                await methods.handleFolderExport(payload);
            } catch (error) {
                logError('[主页面] 目录导出失败:', error);
                alert('导出失败：' + (error?.message || '未知错误'));
            }
        },
        handleSearchInput: function (event) {
            logInfo('[主页面] 收到搜索输入事件');
            try {
                const methods = useMethods(store);
                methods.handleSearchInput(event);
            } catch (error) {
                logError('[主页面] 搜索输入处理失败:', error);
            }
        },
        handleSearchChange: function (query) {
            logInfo('[主页面] 收到文件树搜索变化事件:', query);
            try {
                const methods = useMethods(store);
                methods.handleSearchChange(query);
            } catch (error) {
                logError('[主页面] 文件树搜索变化处理失败:', error);
            }
        },
        clearSearch: function () {
            logInfo('[主页面] 收到清除搜索事件');
            try {
                const methods = useMethods(store);
                methods.clearSearch();
            } catch (error) {
                logError('[主页面] 清除搜索失败:', error);
            }
        },
        handleMessageInput: function (event) {
            logInfo('[主页面] 收到消息输入事件');
            try {
                const methods = useMethods(store);
                methods.handleMessageInput(event);
            } catch (error) {
                logError('[主页面] 消息输入处理失败:', error);
            }
        },
        handleCompositionStart: function (event) {
            logInfo('[主页面] 收到输入法开始事件');
            try {
                const methods = useMethods(store);
                methods.handleCompositionStart(event);
            } catch (error) {
                logError('[主页面] 输入法开始处理失败:', error);
            }
        },
        handleCompositionEnd: function (event) {
            logInfo('[主页面] 收到输入法结束事件');
            try {
                const methods = useMethods(store);
                methods.handleCompositionEnd(event);
            } catch (error) {
                logError('[主页面] 输入法结束处理失败:', error);
            }
        },
        handleDownloadProjectVersion: async function () {
            logInfo('[主页面] 触发项目版本下载');
            try {
                const methods = useMethods(store);
                await methods.handleDownloadProjectVersion();
            } catch (error) {
                logError('[主页面] 项目版本下载失败:', error);
                alert('下载失败：' + (error?.message || '未知错误'));
            }
        },
        triggerUploadProjectVersion: function () {
            try {
                const methods = useMethods(store);
                methods.triggerUploadProjectVersion();
            } catch (e) {
                logError('[主页面] 触发上传选择失败:', e);
            }
        },
        handleUploadProjectVersion: async function (e) {
            try {
                const methods = useMethods(store);
                await methods.handleUploadProjectVersion(e);
            } catch (error) {
                logError('[主页面] 项目版本上传失败:', error);
                alert('上传失败：' + (error?.message || '未知错误'));
            } finally {
                try { e.target.value = ''; } catch (_) { }
            }
        },
        toggleBatchMode: function () {
            logInfo('[主页面] 收到批量模式切换事件');
            try {
                const methods = useMethods(store);
                methods.toggleBatchMode();
            } catch (error) {
                logError('[主页面] 批量模式切换失败:', error);
            }
        },
        toggleFileSelection: function (fileKey) {
            logInfo('[主页面] 收到文件选择切换事件:', fileKey);
            try {
                const methods = useMethods(store);
                methods.toggleFileSelection(fileKey);
            } catch (error) {
                logError('[主页面] 文件选择切换失败:', error);
            }
        },
        refreshData: function () {
            logInfo('[主页面] 收到刷新数据事件');
            try {
                const methods = useMethods(store);
                methods.refreshData();
            } catch (error) {
                logError('[主页面] 刷新数据处理失败:', error);
            }
        },
        toggleSidebar: function () {
            logInfo('[主页面] 收到侧边栏切换事件');
            try {
                const methods = useMethods(store);
                methods.handleToggleSidebar();
            } catch (error) {
                logError('[主页面] 侧边栏切换处理失败:', error);
            }
        },
        setViewMode: function (mode) {
            const methods = useMethods(store);
            if (methods.setViewMode) {
                methods.setViewMode(mode);
                logInfo('[主页面] 视图模式已切换:', mode);
            } else if (store && store.viewMode) {
                store.viewMode.value = mode;
                logInfo('[主页面] 视图模式已切换（备用方法）:', mode);
            }
        },
        handleProjectChange: function () {
            logInfo('[主页面] 收到项目切换事件（已忽略）');
            try {
                const methods = useMethods(store);
                methods.handleProjectChange();
            } catch (error) {
                logError('[主页面] 项目切换处理失败:', error);
            }
        },
        handleFileSelect: function (payload) {
            logInfo('[主页面] 收到文件选择事件:', payload);
            try {
                const methods = useMethods(store);
                methods.handleFileSelect(payload);
            } catch (error) {
                logError('[主页面] 文件选择处理失败:', error);
            }
        },
        handleCreateSession: function (payload) {
            logInfo('[主页面] 收到创建会话事件:', payload);
            try {
                const methods = useMethods(store);
                methods.handleCreateSession(payload);
            } catch (error) {
                logError('[主页面] 创建会话处理失败:', error);
            }
        },
        toggleSessionList: async function () {
            logInfo('[主页面] 切换会话列表');
            try {
                const methods = useMethods(store);
                await methods.toggleSessionList();
            } catch (error) {
                logError('[主页面] 切换会话列表失败:', error);
            }
        },
        handleSessionSelect: async function (session) {
            logInfo('[主页面] 收到会话选择事件:', session);
            try {
                const methods = useMethods(store);
                await methods.handleSessionSelect(session);
            } catch (error) {
                logError('[主页面] 会话选择处理失败:', error);
            }
        },
        focusSessionList: function () {
            try {
                const methods = useMethods(store);

                if (store?.sidebarCollapsed?.value && methods.handleToggleSidebar) {
                    methods.handleToggleSidebar();
                }

                this.$nextTick(() => {
                    const sidebar = document.querySelector('.aicr-sidebar .sidebar-scroll-container');
                    if (sidebar && typeof sidebar.scrollTo === 'function') {
                        sidebar.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                });
            } catch (error) {
                logError('[主页面] 聚焦会话列表失败:', error);
            }
        },
        handleSessionDelete: async function (sessionKey) {
            logInfo('[主页面] 收到会话删除事件:', sessionKey);
            try {
                const methods = useMethods(store);
                await methods.handleSessionDelete(sessionKey);
            } catch (error) {
                logError('[主页面] 会话删除失败:', error);
            }
        },
        handleSyncKnowledge: async function () {
            logInfo('[主页面] 触发同步知识库');
            try {
                const methods = useMethods(store);
                await methods.handleSyncKnowledge();
            } catch (error) {
                logError('[主页面] 同步知识库失败:', error);
            }
        },
        handleSessionCreate: async function () {
            logInfo('[主页面] 收到创建会话事件');
            try {
                const methods = useMethods(store);
                await methods.handleSessionCreate();
            } catch (error) {
                logError('[主页面] 创建会话处理失败:', error);
            }
        },
        handleSessionFavorite: async function (sessionKey) {
            logInfo('[主页面] 收到会话收藏事件:', sessionKey);
            try {
                const methods = useMethods(store);
                await methods.handleSessionToggleFavorite(sessionKey);
            } catch (error) {
                logError('[主页面] 会话收藏处理失败:', error);
            }
        },
        handleSessionEdit: async function (sessionKey) {
            logInfo('[主页面] 收到会话编辑事件:', sessionKey);
            try {
                const methods = useMethods(store);
                await methods.handleSessionEdit(sessionKey);
            } catch (error) {
                logError('[主页面] 会话编辑处理失败:', error);
            }
        },
        closeSessionEdit: function () {
            try {
                const methods = useMethods(store);
                methods.closeSessionEdit();
            } catch (error) {
                logError('[主页面] 关闭会话编辑失败:', error);
            }
        },
        saveSessionEdit: async function () {
            try {
                const methods = useMethods(store);
                await methods.saveSessionEdit();
            } catch (error) {
                logError('[主页面] 保存会话编辑失败:', error);
            }
        },
        generateSessionDescription: async function () {
            try {
                const methods = useMethods(store);
                await methods.generateSessionDescription();
            } catch (error) {
                logError('[主页面] 生成会话描述失败:', error);
            }
        },
        handleSessionTag: async function (sessionKey) {
            logInfo('[主页面] 收到会话标签管理事件:', sessionKey);
            try {
                const methods = useMethods(store);
                await methods.handleSessionManageTags(sessionKey);
            } catch (error) {
                logError('[主页面] 会话标签管理处理失败:', error);
            }
        },
        handleSessionDuplicate: async function (sessionKey) {
            logInfo('[主页面] 收到会话副本事件:', sessionKey);
            try {
                const methods = useMethods(store);
                await methods.handleSessionDuplicate(sessionKey);
            } catch (error) {
                logError('[主页面] 会话副本处理失败:', error);
            }
        },
        handleSessionContext: async function (sessionId) {
            logInfo('[主页面] 收到会话上下文事件:', sessionId);
            try {
                const methods = useMethods(store);
                await methods.handleSessionContext(sessionId);
            } catch (error) {
                logError('[主页面] 会话上下文处理失败:', error);
            }
        },
        handleSessionOpenUrl: async function (sessionId) {
            logInfo('[主页面] 收到会话打开URL事件:', sessionId);
            try {
                const methods = useMethods(store);
                await methods.handleSessionOpenUrl(sessionId);
            } catch (error) {
                logError('[主页面] 会话打开URL处理失败:', error);
            }
        },
        handleTagSelect: function (tags) {
            logInfo('[主页面] 收到标签选择事件:', tags);
            try {
                const methods = useMethods(store);
                methods.handleTagSelect(tags);
            } catch (error) {
                logError('[主页面] 标签选择处理失败:', error);
            }
        },
        handleTagClear: function () {
            logInfo('[主页面] 收到清除标签事件');
            try {
                const methods = useMethods(store);
                methods.handleTagClear();
            } catch (error) {
                logError('[主页面] 清除标签处理失败:', error);
            }
        },
        handleTagFilterNoTags: function (noTags) {
            logInfo('[主页面] 收到无标签筛选切换事件:', noTags);
            try {
                const methods = useMethods(store);
                methods.handleTagFilterNoTags(noTags);
            } catch (error) {
                logError('[主页面] 无标签筛选切换处理失败:', error);
            }
        },
        handleSessionSearchChange: function (query) {
            logInfo('[主页面] 收到会话搜索变化事件:', query);
            try {
                const methods = useMethods(store);
                methods.handleSessionSearchChange(query);
            } catch (error) {
                logError('[主页面] 会话搜索变化处理失败:', error);
            }
        },
        handleSessionViewBack: function () {
            logInfo('[主页面] 从会话视图返回文件树视图');
            try {
                const methods = useMethods(store);
                methods.handleSessionViewBack();
            } catch (error) {
                logError('[主页面] 返回文件树视图失败:', error);
            }
        },
        toggleSessionBatchMode: function () {
            logInfo('[主页面] 切换会话批量选择模式');
            try {
                const methods = useMethods(store);
                methods.toggleSessionBatchMode();
            } catch (error) {
                logError('[主页面] 切换会话批量选择模式失败:', error);
            }
        },
        handleSessionImport: function () {
            logInfo('[主页面] 触发会话导入');
            try {
                this.$nextTick(() => {
                    const importInput = document.querySelector('input[type="file"][accept=".json,.zip"]');
                    if (importInput) {
                        importInput.click();
                    } else {
                        logWarn('[主页面] 未找到导入文件输入框');
                    }
                });
            } catch (error) {
                logError('[主页面] 触发会话导入失败:', error);
            }
        },
        handleSessionImportFile: async function (event) {
            logInfo('[主页面] 处理会话导入文件');
            try {
                const methods = useMethods(store);
                await methods.handleSessionImportFile(event);
            } catch (error) {
                logError('[主页面] 处理会话导入文件失败:', error);
            } finally {
                if (event.target) {
                    event.target.value = '';
                }
            }
        },
        handleSessionExport: async function () {
            logInfo('[主页面] 处理会话导出');
            try {
                const methods = useMethods(store);
                await methods.handleSessionExport();
            } catch (error) {
                logError('[主页面] 处理会话导出失败:', error);
            }
        },
        handleBatchDeleteSessions: async function () {
            logInfo('[主页面] 批量删除会话');
            try {
                const methods = useMethods(store);
                await methods.handleBatchDeleteSessions();
            } catch (error) {
                logError('[主页面] 批量删除会话失败:', error);
            }
        },
        handleSessionBatchSelect: function (sessionKey) {
            logInfo('[主页面] 切换会话选择状态:', sessionKey);
            try {
                const methods = useMethods(store);
                if (methods.toggleSessionSelection) {
                    methods.toggleSessionSelection(sessionKey);
                } else {
                    if (store && store.selectedSessionKeys && store.selectedSessionKeys.value) {
                        if (store.selectedSessionKeys.value.has(sessionId)) {
                            store.selectedSessionKeys.value.delete(sessionId);
                        } else {
                            store.selectedSessionKeys.value.add(sessionId);
                        }
                    }
                }
            } catch (error) {
                logError('[主页面] 切换会话选择状态失败:', error);
            }
        },
        handleSkillTagToggle: function (skillName) {
            logInfo('[主页面] 切换 Skills 标签:', skillName);
            try {
                const methods = useMethods(store);
                methods.handleSkillTagToggle(skillName);
            } catch (error) {
                logError('[主页面] Skills 标签切换失败:', error);
            }
        },
        handleSkillTagsClear: function () {
            logInfo('[主页面] 清除 Skills 标签');
            try {
                const methods = useMethods(store);
                methods.handleSkillTagsClear();
            } catch (error) {
                logError('[主页面] 清除 Skills 标签失败:', error);
            }
        },
        handleTemplateTagToggle: function (templateName) {
            logInfo('[主页面] 切换 Templates 标签:', templateName);
            try {
                const methods = useMethods(store);
                methods.handleTemplateTagToggle(templateName);
            } catch (error) {
                logError('[主页面] Templates 标签切换失败:', error);
            }
        },
        handleTemplateTagsClear: function () {
            logInfo('[主页面] 清除 Templates 标签');
            try {
                const methods = useMethods(store);
                methods.handleTemplateTagsClear();
            } catch (error) {
                logError('[主页面] 清除 Templates 标签失败:', error);
            }
        },
        handleRuleTagToggle: function (ruleName) {
            logInfo('[主页面] 切换 Rules 标签:', ruleName);
            try {
                const methods = useMethods(store);
                methods.handleRuleTagToggle(ruleName);
            } catch (error) {
                logError('[主页面] Rules 标签切换失败:', error);
            }
        },
        handleRuleTagsClear: function () {
            logInfo('[主页面] 清除 Rules 标签');
            try {
                const methods = useMethods(store);
                methods.handleRuleTagsClear();
            } catch (error) {
                logError('[主页面] 清除 Rules 标签失败:', error);
            }
        },
        handleAgentTagToggle: function (agentName) {
            logInfo('[主页面] 切换 Agents 标签:', agentName);
            try {
                const methods = useMethods(store);
                methods.handleAgentTagToggle(agentName);
            } catch (error) {
                logError('[主页面] Agents 标签切换失败:', error);
            }
        },
        handleAgentTagsClear: function () {
            logInfo('[主页面] 清除 Agents 标签');
            try {
                const methods = useMethods(store);
                methods.handleAgentTagsClear();
            } catch (error) {
                logError('[主页面] 清除 Agents 标签失败:', error);
            }
        },
        handleBatchSelectAllCards: function (keys) {
            logInfo('[主页面] 卡片视图全选');
            try {
                const methods = useMethods(store);
                if (methods.handleBatchSelectAllCards) {
                    methods.handleBatchSelectAllCards(keys);
                }
            } catch (error) {
                logError('[主页面] 卡片全选失败:', error);
            }
        },
        handleBatchDeselectAllCards: function () {
            logInfo('[主页面] 卡片视图取消全选');
            try {
                const methods = useMethods(store);
                if (methods.handleBatchDeselectAllCards) {
                    methods.handleBatchDeselectAllCards();
                }
            } catch (error) {
                logError('[主页面] 卡片取消全选失败:', error);
            }
        },
        handleBatchDeleteFiles: async function () {
            logInfo('[主页面] 卡片视图批量删除文件');
            try {
                const selectedKeys = store.selectedKeys?.value;
                if (!selectedKeys || selectedKeys.size === 0) return;

                const count = selectedKeys.size;
                if (!confirm(`确定删除选中的 ${count} 个文件？此操作不可撤销。`)) return;

                const { showGlobalLoading, hideGlobalLoading } = await import('/cdn/utils/ui/loading.js');
                showGlobalLoading('正在批量删除，请稍候...');

                try {
                    const { getFileDeleteService } = await import('/src/views/aicr/hooks/fileDeleteService.js');
                    const fileDeleteService = getFileDeleteService();

                    // 从 fileTree / files 中匹配选中 key 的文件对象
                    const filesToDelete = [];
                    const selectedArr = [...selectedKeys];

                    const collectFiles = (nodes) => {
                        if (!Array.isArray(nodes)) return;
                        for (const node of nodes) {
                            if (node.type === 'file' && selectedKeys.has(node.key)) {
                                const sessionKey = node.sessionKey || node.key;
                                filesToDelete.push({
                                    key: node.key,
                                    path: node.path || node.key,
                                    type: 'file',
                                    sessionKey,
                                    data: { key: node.key, path: node.path || node.key }
                                });
                            }
                            if (node.type === 'folder' && Array.isArray(node.children)) {
                                collectFiles(node.children);
                            }
                        }
                    };

                    if (store.fileTree?.value) {
                        collectFiles(store.fileTree.value);
                    }

                    // 对于在 files 中但不在 tree 中的文件
                    const allFiles = store.files?.value || [];
                    for (const key of selectedArr) {
                        const alreadyIncluded = filesToDelete.some(f => f.key === key);
                        if (!alreadyIncluded) {
                            const match = allFiles.find(f => f.key === key || f.path === key);
                            if (match) {
                                filesToDelete.push({
                                    key: match.key || key,
                                    path: match.path || key,
                                    type: 'file',
                                    sessionKey: match.sessionKey || match.key || key,
                                    data: { key: match.key || key, path: match.path || key }
                                });
                            } else {
                                filesToDelete.push({
                                    key,
                                    path: key,
                                    type: 'file',
                                    sessionKey: key,
                                    data: { key, path: key }
                                });
                            }
                        }
                    }

                    // 从 fileTree 中移除已删除节点
                    const removeDeletedFromTree = (nodes) => {
                        if (!Array.isArray(nodes)) return nodes;
                        return nodes.filter(node => {
                            if (node.type === 'file' && selectedKeys.has(node.key)) {
                                return false;
                            }
                            if (node.type === 'folder' && Array.isArray(node.children)) {
                                node.children = removeDeletedFromTree(node.children);
                            }
                            return true;
                        });
                    };

                    if (store.fileTree?.value) {
                        store.fileTree.value = removeDeletedFromTree(store.fileTree.value);
                    }

                    // 从 files 中移除
                    if (store.files?.value) {
                        store.files.value = store.files.value.filter(f => !selectedKeys.has(f.key) && !selectedKeys.has(f.path));
                    }

                    // 从 sessions 中移除
                    if (store.sessions?.value) {
                        const deletedSessionKeys = new Set(filesToDelete.map(f => f.sessionKey).filter(Boolean));
                        store.sessions.value = store.sessions.value.filter(s => !deletedSessionKeys.has(String(s.key || '')));
                    }

                    // 调用远端删除
                    if (filesToDelete.length > 0) {
                        await fileDeleteService.deleteFiles(filesToDelete);
                    }

                    // 退出批量模式并刷新
                    if (store.batchMode) store.batchMode.value = false;
                    selectedKeys.clear();

                    if (store.loadFileTree) await store.loadFileTree();
                    if (store.loadSessions) await store.loadSessions(false);

                    const { showSuccessMessage } = await import('/cdn/utils/core/error.js');
                    showSuccessMessage(`已删除 ${count} 个文件`);
                } finally {
                    try { hideGlobalLoading(); } catch (_) { }
                }
            } catch (error) {
                logError('[主页面] 批量删除文件失败:', error);
            }
        },
        handleToggleSelectAllSessions: function (payload) {
            logInfo('[主页面] 全选/取消全选会话', payload);
            try {
                const methods = useMethods(store);
                if (methods.toggleSelectAllSessions) {
                    if (payload && typeof payload === 'object' && Array.isArray(payload.ids)) {
                        methods.toggleSelectAllSessions(payload.ids, payload.isSelect);
                    } else {
                        methods.toggleSelectAllSessions();
                    }
                }
            } catch (error) {
                logError('[主页面] 全选/取消全选会话失败:', error);
            }
        },
    };
};
