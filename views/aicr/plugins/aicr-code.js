// aicr-code 页面 - 专门的代码查看页面
import { safeExecute } from '/utils/error.js';
import { loadCSSFiles } from '/utils/baseView.js';
import { showSuccess, showError } from '/utils/message.js';

// 自动加载相关的CSS文件
loadCSSFiles([
    '/views/aicr/index.css',
    '/views/aicr/plugins/codeView/index.css',
    '/views/aicr/plugins/commentPanel/index.css'
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
                    fileId: '',
                    fileName: '',
                    filePath: '',
                    project: '',
                    version: ''
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
                
                // 评论者数据
                commenters: [],
                selectedCommenterIds: [],
                commentersLoading: false,
                commentersError: '',
                
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
                
                // 加载评论和评论者数据
                await Promise.all([
                    this.loadComments(),
                    this.loadCommenters()
                ]);
                
            } catch (error) {
                console.error('页面初始化失败:', error);
                this.error = '页面初始化失败: ' + (error.message || error);
            }
        },
        
        methods: {
        // 解析URL参数
        parseUrlParams() {
            const urlParams = new URLSearchParams(window.location.search);
            this.fileInfo = {
                fileId: urlParams.get('fileId') || '',
                fileName: urlParams.get('fileName') || '',
                filePath: urlParams.get('filePath') || '',
                project: urlParams.get('project') || '',
                version: urlParams.get('version') || ''
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
            if (!this.fileInfo.fileId) {
                this.error = '未指定文件ID';
                return;
            }
            
            this.loading = true;
            this.error = '';
            
            try {
                // 使用与原始 aicr 页面相同的 API 调用方式
                const url = `${window.API_URL}/mongodb/?cname=projectVersionFiles&projectId=${encodeURIComponent(this.fileInfo.project)}&versionId=${encodeURIComponent(this.fileInfo.version)}&fileId=${encodeURIComponent(this.fileInfo.fileId)}`;
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
                    
                    this.currentFile = {
                        id: item.fileId || item.id || this.fileInfo.fileId,
                        name: item.name || itemData.name || this.fileInfo.fileName,
                        path: item.path || itemData.path || this.fileInfo.filePath,
                        content: itemData.content || item.content || '',
                        type: itemData.type || item.type || 'text',
                        size: itemData.size || item.size || 0,
                        lastModified: itemData.lastModified || item.lastModified || new Date().toISOString()
                    };
                    
                    console.log('[loadFileContent] 文件加载成功:', this.currentFile.name);
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
            if (!this.fileInfo.fileId) return;
            
            try {
                // 使用与主页面相同的MongoDB API
                let url = `${window.API_URL}/mongodb/?cname=comments`;
                url += `&projectId=${encodeURIComponent(this.fileInfo.project)}`;
                url += `&versionId=${encodeURIComponent(this.fileInfo.version)}`;
                url += `&fileId=${encodeURIComponent(this.fileInfo.fileId)}`;
                
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
        
        // 加载评论者数据
        async loadCommenters() {
            if (!this.fileInfo.project || !this.fileInfo.version) {
                console.log('[loadCommenters] 项目/版本信息不完整，跳过评论者加载');
                return;
            }
            
            this.commentersLoading = true;
            this.commentersError = '';
            
            try {
                let url = `${window.API_URL}/mongodb/?cname=commenters`;
                url += `&projectId=${encodeURIComponent(this.fileInfo.project)}`;
                url += `&versionId=${encodeURIComponent(this.fileInfo.version)}`;
                
                console.log('[loadCommenters] 请求URL:', url);
                
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data && data.data && data.data.list) {
                    this.commenters = data.data.list;
                    console.log('[loadCommenters] 加载评论者成功，数量:', this.commenters.length);
                    
                    // 默认选中第一个评论者
                    if (this.commenters.length > 0) {
                        this.selectedCommenterIds = [this.commenters[0].key];
                        console.log('[loadCommenters] 默认选中第一个评论者:', this.selectedCommenterIds);
                    }
                } else {
                    this.commenters = [];
                    console.log('[loadCommenters] 没有评论者数据');
                }
                
            } catch (error) {
                console.error('加载评论者失败:', error);
                this.commentersError = '加载评论者数据失败: ' + (error.message || error);
                this.commenters = [];
            } finally {
                this.commentersLoading = false;
            }
        },
        
        // 处理评论提交
        async handleCommentSubmit(commentData) {
            try {
                // 使用与主页面相同的MongoDB API
                const url = `${window.API_URL}/mongodb/?cname=comments`;
                
                const payload = {
                    projectId: this.fileInfo.project,
                    versionId: this.fileInfo.version,
                    fileId: this.fileInfo.fileId,
                    ...commentData
                };
                
                console.log('[handleCommentSubmit] 提交评论数据:', payload);
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data && data.success !== false) {
                    showSuccess('评论提交成功');
                    // 重新加载评论
                    await this.loadComments();
                } else {
                    throw new Error(data.message || '提交评论失败');
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
        
        // 处理评论者选择
        handleCommenterSelect(author) {
            this.newComment.author = author;
        },
        
        // 处理评论删除
        async handleCommentDelete(commentKey) {
            try {
                // 使用与主页面相同的MongoDB API
                const url = `${window.API_URL}/mongodb/?cname=comments`;
                
                const payload = {
                    action: 'delete',
                    key: commentKey,
                    projectId: this.fileInfo.project,
                    versionId: this.fileInfo.version
                };
                
                console.log('[handleCommentDelete] 删除评论数据:', payload);
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data && data.success !== false) {
                    showSuccess('评论删除成功');
                    // 重新加载评论
                    await this.loadComments();
                } else {
                    throw new Error(data.message || '删除评论失败');
                }
                
            } catch (error) {
                console.error('删除评论失败:', error);
                showError('删除评论失败: ' + (error.message || error));
            }
        },
        
        // 处理评论解决
        async handleCommentResolve(commentKey) {
            try {
                // 使用与主页面相同的MongoDB API
                const url = `${window.API_URL}/mongodb/?cname=comments`;
                
                const payload = {
                    action: 'resolve',
                    key: commentKey,
                    projectId: this.fileInfo.project,
                    versionId: this.fileInfo.version
                };
                
                console.log('[handleCommentResolve] 解决评论数据:', payload);
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data && data.success !== false) {
                    showSuccess('评论已标记为已解决');
                    // 重新加载评论
                    await this.loadComments();
                } else {
                    throw new Error(data.message || '标记评论失败');
                }
                
            } catch (error) {
                console.error('标记评论失败:', error);
                showError('标记评论失败: ' + (error.message || error));
            }
        },
        
        // 处理评论重新打开
        async handleCommentReopen(commentKey) {
            try {
                // 使用与主页面相同的MongoDB API
                const url = `${window.API_URL}/mongodb/?cname=comments`;
                
                const payload = {
                    action: 'reopen',
                    key: commentKey,
                    projectId: this.fileInfo.project,
                    versionId: this.fileInfo.version
                };
                
                console.log('[handleCommentReopen] 重新打开评论数据:', payload);
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data && data.success !== false) {
                    showSuccess('评论已重新打开');
                    // 重新加载评论
                    await this.loadComments();
                } else {
                    throw new Error(data.message || '重新打开评论失败');
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
                window.location.href = '/views/aicr/index.html';
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

