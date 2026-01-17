// aicr-code 页面 - 专门的代码查看页面
import { safeExecute } from '/src/utils/error.js';
import { loadCSSFiles } from '/src/utils/baseView.js';
import { showSuccess, showError } from '/src/utils/message.js';
import { buildServiceUrl, SERVICE_MODULE } from '/src/services/helper/requestHelper.js';
import { postData } from '/src/services/modules/crud.js';

// 自动加载相关的CSS文件
loadCSSFiles([
    '/src/views/aicr/index.css',
    '/src/views/aicr/components/codeView/index.css',
    '/src/views/aicr/components/commentPanel/index.css'
]);

// 等待组件加载完成
async function waitForComponents() {
    const maxAttempts = 50;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        if (window.CodeView && window.CommentPanel) {
            console.log('[aicr-code] 组件加载完成');
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    console.warn('[aicr-code] 组件加载超时');
    return false;
}

// 创建应用实例
async function createApp() {
    // 等待组件加载
    await waitForComponents();
    
    const { createApp } = Vue;
    
    const app = createApp({
        data() {
            return {
                // 文件信息
                fileInfo: {
                    fileName: '',
                    filePath: '',
                    version: '',
                    fileKey: ''
                },
                
                // 当前文件
                currentFile: null,
                
                // 加载状态
                loading: false,
                error: '',
                
                // 评论相关
                currentComments: [],
                newComment: {
                    content: '',
                    author: '',
                    text: '',
                    improvementText: '',
                    type: '',
                    status: 'pending'
                },
                
                // 界面控制
                showComments: true,
                
                // 移动端检测
                isMobile: false
            };
        },
        
        async mounted() {
            try {
                console.log('[aicr-code] 组件已挂载，开始初始化');
                
                // 检测移动端
                this.isMobile = window.innerWidth <= 768;
                
                // 监听窗口大小变化
                window.addEventListener('resize', () => {
                    this.isMobile = window.innerWidth <= 768;
                });
                
                // 从URL参数获取文件信息
                this.parseUrlParams();
                
                // 加载文件内容
                await this.loadFileContent();
                
                // 加载评论
                await this.loadComments();
                
            } catch (error) {
                console.error('页面初始化失败:', error);
                this.error = '页面初始化失败: ' + (error.message || error);
            }
        },
        
        methods: {
        isUUID(v) {
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || '').trim());
        },
        resolveSessionKey() {
            const direct = this.fileInfo.sessionKey || this.currentFile?.sessionKey;
            if (this.isUUID(direct)) return String(direct);
            if (this.isUUID(this.fileInfo.fileKey)) return String(this.fileInfo.fileKey);
            try {
                const root = window.aicrStore?.fileTree?.value || window.aicrStore?.fileTree;
                const targetTreeKey = String(this.fileInfo.fileKey || '').trim();
                if (targetTreeKey && Array.isArray(root)) {
                    const stack = [...root];
                    while (stack.length) {
                        const node = stack.pop();
                        if (!node) continue;
                        if (String(node.key || '') === targetTreeKey && this.isUUID(node.sessionKey)) {
                            return String(node.sessionKey);
                        }
                        if (Array.isArray(node.children)) stack.push(...node.children);
                    }
                }
            } catch (_) {}
            return null;
        },
        // 解析URL参数
        parseUrlParams() {
            const urlParams = new URLSearchParams(window.location.search);
            this.fileInfo = {
                fileName: urlParams.get('fileName') || '',
                filePath: urlParams.get('filePath') || '',
                project: urlParams.get('project') || '',
                version: urlParams.get('version') || '',
                fileKey: urlParams.get('fileKey') || '',
                sessionKey: urlParams.get('sessionKey') || urlParams.get('sessionkey') || ''
            };
            
            console.log('[parseUrlParams] 解析到的文件信息:', this.fileInfo);
            console.log('[parseUrlParams] 当前URL:', window.location.href);
            
            // 更新页面标题
            if (this.fileInfo.fileName) {
                document.title = `YiWeb - ${this.fileInfo.fileName}`;
            }
        },
        
        // 加载文件内容
        async loadFileContent() {
            if (!this.fileInfo.fileKey) {
                this.error = '未指定文件Key';
                return;
            }
            
            this.loading = true;
            this.error = '';
            
            try {
                // 优先尝试使用全局 store 的 loadFileByKey 方法加载文件
                if (window.aicrStore && typeof window.aicrStore.loadFileByKey === 'function') {
                    console.log('[loadFileContent] 使用 store 加载文件:', { fileKey: this.fileInfo.fileKey });
                    try {
                        // 使用 fileKey 进行精确查找
                        const loadedFile = await window.aicrStore.loadFileByKey(this.fileInfo.fileKey);
                        if (loadedFile && loadedFile.content) {
                            if (loadedFile.sessionKey) {
                                this.fileInfo.sessionKey = loadedFile.sessionKey;
                            }
                            const resolvedSessionKey = this.resolveSessionKey() || loadedFile.sessionKey || this.fileInfo.sessionKey || '';
                            const treeKey = loadedFile.key || loadedFile.path || this.fileInfo.fileKey || '';
                            this.currentFile = {
                                name: loadedFile.name || this.fileInfo.fileName,
                                path: loadedFile.path || this.fileInfo.filePath,
                                content: loadedFile.content,
                                type: loadedFile.type || 'text',
                                size: loadedFile.size || 0,
                                lastModified: loadedFile.lastModified || new Date().toISOString(),
                                // 约定：file.key 与会话 key(sessionKey/UUID)一致
                                key: resolvedSessionKey,
                                sessionKey: resolvedSessionKey,
                                // 额外保留 treeKey，用于文件树/静态文件定位
                                treeKey: treeKey
                            };
                            if (resolvedSessionKey) {
                                this.fileInfo.sessionKey = resolvedSessionKey;
                                this.currentFile.sessionKey = resolvedSessionKey;
                                this.currentFile.key = resolvedSessionKey;
                            }
                            console.log('[loadFileContent] 通过 store 加载文件成功:', this.currentFile.name);
                            return;
                        }
                    } catch (storeError) {
                        console.warn('[loadFileContent] store 加载失败，尝试 API 方式:', storeError);
                    }
                }
                
                // 如果 store 方法不可用或失败，使用 API 方式
                // 构建 API URL，version 参数可以为空（系统已简化，不再有版本概念）
                const queryParams = {
                    cname: 'projectVersionFiles',
                    key: this.fileInfo.fileKey
                };
                if (this.fileInfo.version) {
                    queryParams.versionId = this.fileInfo.version;
                }
                
                const url = buildServiceUrl('query_documents', queryParams);
                console.log('[loadFileContent] 请求URL:', url);
                
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                let list = (data?.data?.list && Array.isArray(data.data.list)) ? data.data.list : (Array.isArray(data) ? data : []);
                console.log('[loadFileContent] 查询结果数量:', list.length);
                
                if (list.length > 0) {
                    const item = list[0];
                    const itemData = (item && typeof item === 'object' && item.data && typeof item.data === 'object') ? item.data : {};
                    
                    // 尝试从多个位置获取文件内容
                    let content = '';
                    if (itemData.content) {
                        content = itemData.content;
                    } else if (item.content) {
                        content = item.content;
                    } else if (itemData.data && typeof itemData.data === 'string') {
                        content = itemData.data;
                    } else if (item.data && typeof item.data === 'string') {
                        content = item.data;
                    }
                    
                    this.currentFile = {
                        name: item.name || itemData.name || this.fileInfo.fileName,
                        path: item.path || itemData.path || this.fileInfo.filePath,
                        content: content,
                        type: itemData.type || item.type || 'text',
                        size: itemData.size || item.size || 0,
                        lastModified: itemData.lastModified || item.lastModified || new Date().toISOString(),
                        // 约定：file.key 与会话 key(sessionKey/UUID)一致
                        key: this.resolveSessionKey(),
                        sessionKey: this.resolveSessionKey(),
                        treeKey: item.key || item.path || itemData.path || this.fileInfo.fileKey
                    };
                    
                    console.log('[loadFileContent] 文件加载成功:', this.currentFile.name, '内容长度:', content.length);
                } else {
                    throw new Error('未找到指定的文件');
                }
            } catch (error) {
                console.error('加载文件内容失败:', error);
                this.error = '加载文件内容失败: ' + (error.message || error);
            } finally {
                this.loading = false;
            }
        },
        
        // 加载评论
        async loadComments() {
            if (!this.fileInfo.fileKey) return;
            
            try {
                const targetKey = this.resolveSessionKey();
                if (!targetKey) return;
                // 使用与主页面相同的MongoDB API
                const queryParams = {
                    cname: 'comments',
                    fileKey: targetKey
                };
                if (this.fileInfo.version) {
                    queryParams.versionId = this.fileInfo.version;
                }
                
                const url = buildServiceUrl('query_documents', queryParams);
                
                console.log('[loadComments] 请求URL:', url);
                
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                // 处理响应数据
                let comments = [];
                if (data && data.data && data.data.list) {
                    comments = data.data.list;
                } else if (Array.isArray(data)) {
                    comments = data;
                } else if (data && Array.isArray(data.data)) {
                    comments = data.data;
                }

                this.currentComments = comments;
                console.log('[loadComments] 加载评论成功，数量:', comments.length);
                
            } catch (error) {
                console.error('加载评论失败:', error);
                this.currentComments = [];
            }
        },
        
        // 处理评论提交
        async handleCommentSubmit(commentData) {
            try {
                // 确保使用UUID格式的fileKey
                const targetKey = this.resolveSessionKey();
                if (!targetKey || !this.isUUID(targetKey)) {
                    throw new Error('无法找到有效的文件UUID，评论无法提交');
                }
                
                // 构建创建请求 payload
                const payload = {
                    module_name: SERVICE_MODULE,
                    method_name: 'create_document',
                    parameters: {
                        cname: 'comments',
                        data: {
                            fileKey: targetKey, // 确保是UUID格式
                            ...commentData
                        }
                    }
                };
                
                console.log('[handleCommentSubmit] 提交评论数据:', payload);
                
                const response = await postData(`${window.API_URL}/`, payload);
                
                if (response && (response.code === 200 || response.success !== false)) {
                    showSuccess('评论提交成功');
                    // 重新加载评论
                    await this.loadComments();
                } else {
                    throw new Error(response.message || '提交评论失败');
                }
                
            } catch (error) {
                console.error('提交评论失败:', error);
                showError('提交评论失败: ' + (error.message || error));
            }
        },
        
        // 处理评论输入
        handleCommentInput(commentData) {
            this.newComment = { ...this.newComment, ...commentData };
        },
        
        // 处理评论删除
        async handleCommentDelete(commentKey) {
            try {
                const payload = {
                    module_name: SERVICE_MODULE,
                    method_name: 'delete_document',
                    parameters: {
                        cname: 'comments',
                        key: commentKey
                    }
                };
                
                console.log('[handleCommentDelete] 删除评论数据:', payload);
                
                const response = await postData(`${window.API_URL}/`, payload);
                
                if (response && (response.code === 200 || response.success !== false)) {
                    showSuccess('评论删除成功');
                    // 重新加载评论
                    await this.loadComments();
                } else {
                    throw new Error(response.message || '删除评论失败');
                }
                
            } catch (error) {
                console.error('删除评论失败:', error);
                showError('删除评论失败: ' + (error.message || error));
            }
        },
        
        // 处理评论解决
        async handleCommentResolve(commentKey) {
            try {
                const payload = {
                    module_name: SERVICE_MODULE,
                    method_name: 'update_document',
                    parameters: {
                        cname: 'comments',
                        key: commentKey,
                        data: {
                            status: 'resolved'
                        }
                    }
                };
                
                console.log('[handleCommentResolve] 解决评论数据:', payload);
                
                const response = await postData(`${window.API_URL}/`, payload);
                
                if (response && (response.code === 200 || response.success !== false)) {
                    showSuccess('评论已标记为已解决');
                    // 重新加载评论
                    await this.loadComments();
                } else {
                    throw new Error(response.message || '标记评论失败');
                }
                
            } catch (error) {
                console.error('标记评论失败:', error);
                showError('标记评论失败: ' + (error.message || error));
            }
        },
        
        // 处理评论重新打开
        async handleCommentReopen(commentKey) {
            try {
                const payload = {
                    module_name: SERVICE_MODULE,
                    method_name: 'update_document',
                    parameters: {
                        cname: 'comments',
                        key: commentKey,
                        data: {
                            status: 'pending'
                        }
                    }
                };
                
                console.log('[handleCommentReopen] 重新打开评论数据:', payload);
                
                const response = await postData(`${window.API_URL}/`, payload);
                
                if (response && (response.code === 200 || response.success !== false)) {
                    showSuccess('评论已重新打开');
                    // 重新加载评论
                    await this.loadComments();
                } else {
                    throw new Error(response.message || '重新打开评论失败');
                }
                
            } catch (error) {
                console.error('重新打开评论失败:', error);
                showError('重新打开评论失败: ' + (error.message || error));
            }
        },
        
        // 重新加载评论
        async handleReloadComments() {
            await this.loadComments();
        },
        
        // 处理文件保存成功事件
        handleFileSaved(savedFile) {
            console.log('[aicr-code] 文件保存成功:', savedFile);
            showSuccess('文件保存成功');
            
            // 更新当前文件信息
            if (savedFile && this.currentFile) {
                this.currentFile.content = savedFile.content || this.currentFile.content;
                this.currentFile.lastModified = savedFile.lastModified || new Date().toISOString();
            }
        },
        
        // 切换评论区显示
        toggleComments() {
            this.showComments = !this.showComments;
        },
        
        // 返回上一页
        goBack() {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                // 如果没有历史记录，跳转到主页面
                window.location.href = '/src/views/aicr/index.html';
            }
        }
    }
    });
    
    // 注册组件
    if (window.CodeView) {
        app.component('code-view', window.CodeView);
        console.log('[aicr-code] CodeView 组件已注册');
    } else {
        console.error('[aicr-code] CodeView 组件未找到');
    }
    
    if (window.CommentPanel) {
        app.component('comment-panel', window.CommentPanel);
        console.log('[aicr-code] CommentPanel 组件已注册');
    } else {
        console.error('[aicr-code] CommentPanel 组件未找到');
    }
    
    // 挂载应用
    app.mount('#app');
    
    // 导出应用实例
    window.aicrCodeApp = app;
    
    return app;
}

// 全局错误处理
window.addEventListener('error', (event) => {
    console.error('[aicr-code] 全局错误:', event.error);
    
    // 使用新的浏览器扩展错误处理函数
    if (window.handleBrowserExtensionError && window.handleBrowserExtensionError(event.error, 'aicr-code', event.filename)) {
        return; // 已处理，忽略
    }
    
    // 如果不是扩展错误，记录到错误日志
    if (window.errorLogger && event.error) {
        window.errorLogger.log(event.error, 'aicr-code', window.ErrorLevels?.ERROR || 'error');
    }
});

// 全局Promise错误处理
window.addEventListener('unhandledrejection', (event) => {
    console.error('[aicr-code] 未处理的Promise错误:', event.reason);
    
    // 使用新的浏览器扩展错误处理函数
    if (window.handleBrowserExtensionError && window.handleBrowserExtensionError(event.reason, 'aicr-code', '', event.reason?.stack)) {
        event.preventDefault(); // 阻止默认的错误处理
        return; // 已处理，忽略
    }
    
    // 如果不是扩展错误，记录到错误日志
    if (window.errorLogger && event.reason) {
        window.errorLogger.log(event.reason, 'aicr-code', window.ErrorLevels?.ERROR || 'error');
    }
});

// 启动应用
createApp().catch(error => {
    console.error('[aicr-code] 应用启动失败:', error);
    
    // 尝试错误恢复
    const recoveryAttempts = window.aicrCodeRecoveryAttempts || 0;
    if (recoveryAttempts < 3) {
        console.log(`[aicr-code] 尝试错误恢复 (第${recoveryAttempts + 1}次)`);
        window.aicrCodeRecoveryAttempts = recoveryAttempts + 1;
        
        // 延迟重试
        setTimeout(() => {
            try {
                createApp().catch(recoveryError => {
                    console.error('[aicr-code] 恢复失败:', recoveryError);
                    showErrorPage(error);
                });
            } catch (recoveryError) {
                console.error('[aicr-code] 恢复过程中发生错误:', recoveryError);
                showErrorPage(error);
            }
        }, 1000 * (recoveryAttempts + 1)); // 递增延迟
    } else {
        console.error('[aicr-code] 恢复尝试次数已达上限，显示错误页面');
        showErrorPage(error);
    }
});

// 显示错误页面
function showErrorPage(error) {
    const appContainer = document.getElementById('app');
    if (appContainer) {
        appContainer.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #dc3545; max-width: 600px; margin: 0 auto;">
                <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 30px;">
                    <h3 style="color: #dc3545; margin-bottom: 20px;">
                        <i class="fas fa-exclamation-triangle" style="margin-right: 10px;"></i>
                        页面加载失败
                    </h3>
                    <p style="margin-bottom: 20px; color: #6c757d;">
                        抱歉，页面在加载过程中遇到了问题。这可能是由于浏览器扩展冲突或网络问题导致的。
                    </p>
                    <div style="background: #fff; border: 1px solid #e9ecef; border-radius: 4px; padding: 15px; margin: 20px 0; text-align: left;">
                        <strong>错误信息:</strong><br>
                        <code style="color: #dc3545; font-size: 12px; word-break: break-all;">${error.message || error}</code>
                    </div>
                    <div style="margin-top: 20px;">
                        <button onclick="window.location.reload()" 
                                style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px; font-size: 14px;">
                            <i class="fas fa-redo" style="margin-right: 5px;"></i>
                            重新加载
                        </button>
                        <button onclick="window.history.back()" 
                                style="padding: 12px 24px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                            <i class="fas fa-arrow-left" style="margin-right: 5px;"></i>
                            返回上页
                        </button>
                    </div>
                    <div style="margin-top: 20px; font-size: 12px; color: #6c757d;">
                        <p>如果问题持续存在，请尝试：</p>
                        <ul style="text-align: left; display: inline-block;">
                            <li>禁用浏览器扩展后重新加载</li>
                            <li>清除浏览器缓存</li>
                            <li>检查网络连接</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
}
