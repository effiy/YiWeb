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
        normalizeFileId, // 新增：统一的文件ID规范化函数
        toggleFolder,
        setNewComment,
        toggleSidebar,
        toggleComments,
        selectedProject,
        setSelectedProject,
        loadFileTree,
        loadFiles,
        loadFileById,
        refreshData,
        // 文件树CRUD
        createFolder,
        createFile,
        renameItem,
        deleteItem,
         // 本地持久化
         setProjects,

        // 搜索相关状态
        searchQuery,
        // 加载状态
        loading,
        files
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
            } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                // 提交评论
                if (newComment && newComment.value && newComment.value.trim()) {
                    console.log('[消息输入] 检测到Ctrl+Enter，提交评论');
                    handleCommentSubmit({ content: newComment.value.trim() });
                }
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
     * 下载当前项目为ZIP
     */
    const handleDownloadProjectVersion = async () => {
        return safeExecute(async () => {
            const projectId = selectedProject?.value;
            if (!projectId) {
                throw createError('请先选择项目', ErrorTypes.VALIDATION, '项目下载');
            }

            // 动态加载依赖
            const { showGlobalLoading, hideGlobalLoading } = await import('/utils/loading.js');
            showGlobalLoading(`正在打包 ${projectId} ...`);
            try {
                // 确保文件列表已加载
                if (!Array.isArray(files?.value) || files.value.length === 0) {
                    await loadFiles(projectId);
                }
                const allFiles = Array.isArray(files?.value) ? files.value : [];
                if (allFiles.length === 0) {
                    throw createError('当前项目下没有文件可下载', ErrorTypes.VALIDATION, '项目下载');
                }

                // 按路径构建ZIP
                const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')).default || window.JSZip || (await import('jszip')).default;
                const zip = new JSZip();

                const normalizePathForDownload = (p) => String(p || '').replace(/\\/g, '/').replace(/^\/+/, '');

                for (const f of allFiles) {
                    const path = normalizePathForDownload(f.path || f.id || f.fileId || f.name);
                    const content = (typeof f.content === 'string') ? f.content : (f.data && typeof f.data.content === 'string' ? f.data.content : '');
                    zip.file(path || 'unknown.txt', content || '');
                }

                const blob = await zip.generateAsync({ type: 'blob' });
                const fileName = `${projectId}.zip`;

                // 触发下载
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                showSuccessMessage('打包完成，开始下载');
            } finally {
                try { hideGlobalLoading(); } catch (_) {}
            }
        }, '项目下载');
    };

    /**
     * 上传ZIP并覆盖当前项目
     */
    const handleUploadProjectVersion = async (zipFileOrEvent) => {
        return safeExecute(async () => {
            // 兼容事件或直接传入 File
            let zipFile = zipFileOrEvent;
            if (zipFileOrEvent && zipFileOrEvent.target && zipFileOrEvent.target.files) {
                zipFile = zipFileOrEvent.target.files[0];
            }

            // 从文件名解析项目（优先使用文件名）
            // 同时兼容全角斜杠 "／" 和反斜杠 "\\"
            const uiProject = selectedProject?.value || (document.getElementById('projectSelect')?.value) || '';
            let baseName = '';
            try {
                const rawName = (zipFile && zipFile.name) ? String(zipFile.name) : '';
                baseName = rawName.replace(/\.[Zz][Ii][Pp]$/i, '');
            } catch (_) { baseName = ''; }
            const parts = baseName.split(/[\/\\／]/).filter(Boolean);
            let projectId = parts[0] || uiProject || '';
            if (!projectId) {
                throw createError('无法从文件名解析项目。请将压缩包命名为 "项目.zip" 或先选择项目', ErrorTypes.VALIDATION, '项目上传');
            }

            // 动态加载依赖与工具
            const { showGlobalLoading, hideGlobalLoading } = await import('/utils/loading.js');
            let __uploadLoadingShown = false;
            try {
                // 1) 校验项目是否已存在；不存在则补充创建
                const { getData, postData, updateData, deleteData } = await import('/apis/modules/crud.js');
                const pvUrl = `${window.API_URL}/mongodb/?cname=projects`;
                const pvResp = await getData(pvUrl, {}, false);
                const pvList = pvResp?.data?.list || [];
                const projectDoc = pvList.find(p => p && p.id === projectId);

                if (projectDoc) {
                    // 项目已存在，询问是否覆盖
                    const { showMessage } = await import('/utils/message.js');
                    const userChoice = await new Promise((resolve) => {
                        showMessage({
                            type: 'warning',
                            title: '项目已存在',
                            content: `检测到 ${projectId} 已存在。请选择操作：`,
                            actions: [
                                { text: '覆盖导入', type: 'primary', action: () => resolve('overwrite') },
                                { text: '取消', action: () => resolve('cancel') }
                            ],
                            duration: 0
                        });
                    });
                    if (userChoice === 'cancel') {
                        return; // 用户取消
                    }
                } else {
                    // 项目不存在，创建新项目
                    await postData(pvUrl, { id: projectId });
                }

                // 显示loading（至此确定会继续进行上传/覆盖）
                if (!__uploadLoadingShown) {
                    showGlobalLoading(`正在上传并解析 ${projectId} ...`);
                    __uploadLoadingShown = true;
                }

                // 读取ZIP
                const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')).default || window.JSZip || (await import('jszip')).default;
                const zip = await JSZip.loadAsync(zipFile);

                // 展平文件列表（忽略目录项）
                const entries = [];
                zip.forEach((relativePath, fileObj) => {
                    if (!fileObj.dir) {
                        entries.push({ path: relativePath, file: fileObj });
                        // 特别关注深层次文件
                        if (relativePath.includes('/') && relativePath.split('/').length > 3) {
                            console.log(`[ZIP解析] 发现深层次文件: "${relativePath}" (${relativePath.split('/').length} 层)`);
                        }
                        // 特别关注 MoreButton.vue
                        if (relativePath.includes('MoreButton.vue')) {
                            console.log(`[ZIP解析] 发现 MoreButton.vue: "${relativePath}"`);
                        }
                    }
                });
                if (entries.length === 0) {
                    throw createError('ZIP 中未发现文件', ErrorTypes.VALIDATION, '项目上传');
                }
                
                console.log(`[ZIP解析] 总共解析到 ${entries.length} 个文件`);
                console.log(`[ZIP解析] 深层次文件数量: ${entries.filter(e => e.path.includes('/') && e.path.split('/').length > 3).length}`);
                
                // 详细列出所有深层次文件
                const deepFiles = entries.filter(e => e.path.includes('/') && e.path.split('/').length > 3);
                console.log(`[ZIP解析] 深层次文件列表:`, deepFiles.map(e => e.path));
                
                // 特别检查 MoreButton.vue
                const moreButtonFiles = entries.filter(e => e.path.includes('MoreButton.vue'));
                console.log(`[ZIP解析] MoreButton.vue 文件列表:`, moreButtonFiles.map(e => e.path));

                // 过滤规则
                const MAX_SIZE = 1 * 1024 * 1024; // 1MB (所有文件)
                const EXCLUDED_DIRS = ['.git', 'node_modules', '.svn', '.hg', '__MACOSX'];
                const EXCLUDED_FILES = ['.DS_Store', 'Thumbs.db'];
                
                // 图片文件类型检测
                const isImageFile = (filename) => {
                    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif', '.jfif', '.pjpeg', '.pjp'];
                    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
                    return imageExtensions.includes(ext);
                };
                const normalizePathForFilter = (p) => String(p || '').replace(/\\/g, '/').replace(/^\/+/, '');
                const hasExcludedSegment = (p) => {
                    const segs = p.split('/');
                    return segs.some(seg => EXCLUDED_DIRS.includes(seg));
                };
                const isExcludedFile = (p) => {
                    const name = p.split('/').pop();
                    return EXCLUDED_FILES.includes(name);
                };
                // 计算是否需要去掉打包时多出的根目录：
                // 只剥离第一层 projectId 目录，确保导入导出的目录结构保持一致
                // 导出时：文件路径是 path/to/file.txt（不包含 projectId）
                // 导入时：如果 zip 中有 projectId/path/to/file.txt，剥离 projectId/ 后得到 path/to/file.txt
                let STRIP_PREFIX = '';
                const normalizedAll = entries.map(e => normalizePathForFilter(e.path)).filter(Boolean);
                
                if (normalizedAll.length > 0 && projectId) {
                    // 检查所有文件路径是否都以 projectId 开头（第一层）
                    const allStartWithProjectId = normalizedAll.every(p => {
                        const parts = p.split('/').filter(Boolean);
                        return parts.length > 0 && parts[0] === projectId;
                    });
                    
                    if (allStartWithProjectId) {
                        // 只剥离第一层 projectId，而不是整个公共前缀
                        STRIP_PREFIX = projectId + '/';
                        console.log('[路径剥离] 所有文件都以项目名开头，只剥离第一层:', STRIP_PREFIX);
                    } else {
                        console.log('[路径剥离] 文件路径不以项目名开头，不剥离前缀');
                    }
                }
                console.log('[路径剥离] 最终剥离前缀:', STRIP_PREFIX);
                let skippedExcluded = 0;
                let skippedImages = 0;
                let skippedLarge = 0;
                let processed = 0;
                let deepFilesProcessed = 0;
                let moreButtonProcessed = false;
                const filesPayload = [];
                for (const { path, file } of entries) {
                    let normPath = normalizePathForFilter(path);
                    const originalPath = normPath;
                    
                    // 特别关注 MoreButton.vue 的处理过程
                    if (path.includes('MoreButton.vue')) {
                        console.log(`[文件处理] 开始处理 MoreButton.vue: 原始路径="${path}", 规范化后="${normPath}"`);
                    }
                    
                    if (STRIP_PREFIX && normPath.startsWith(STRIP_PREFIX)) {
                        normPath = normPath.slice(STRIP_PREFIX.length);
                        console.log(`[文件处理] 路径剥离: "${originalPath}" -> "${normPath}"`);
                        
                        // 特别关注 MoreButton.vue 的路径剥离
                        if (path.includes('MoreButton.vue')) {
                            console.log(`[文件处理] MoreButton.vue 路径剥离: "${originalPath}" -> "${normPath}"`);
                        }
                    }
                    
                    if (!normPath) {
                        console.log(`[文件处理] 跳过空路径文件: "${originalPath}"`);
                        if (path.includes('MoreButton.vue')) {
                            console.log(`[文件处理] ❌ MoreButton.vue 被跳过：空路径`);
                        }
                        continue;
                    }
                    
                    // 目录/文件名过滤
                    if (hasExcludedSegment(normPath) || isExcludedFile(normPath)) {
                        console.log(`[文件处理] 跳过排除文件: "${normPath}"`);
                        if (path.includes('MoreButton.vue')) {
                            console.log(`[文件处理] ❌ MoreButton.vue 被跳过：排除文件`);
                        }
                        skippedExcluded++;
                        continue;
                    }
                    
                    // 图片文件过滤
                    const filename = normPath.split('/').pop();
                    if (isImageFile(filename)) {
                        console.log(`[文件处理] 跳过图片文件: "${normPath}"`);
                        if (path.includes('MoreButton.vue')) {
                            console.log(`[文件处理] ❌ MoreButton.vue 被跳过：图片文件`);
                        }
                        skippedImages++;
                        continue;
                    }
                    
                    // 特别关注深层次文件
                    if (normPath.includes('/') && normPath.split('/').length > 3) {
                        console.log(`[文件处理] 处理深层次文件: "${normPath}" (${normPath.split('/').length} 层)`);
                        deepFilesProcessed++;
                    }
                    
                    // 特别关注 MoreButton.vue 文件
                    if (normPath.includes('MoreButton.vue')) {
                        console.log(`[文件处理] 发现 MoreButton.vue 文件: "${originalPath}" -> "${normPath}"`);
                        moreButtonProcessed = true;
                    }
                    // 大小过滤：优先用内部尺寸；否则读取为blob判断大小
                    let size = (file && file._data && Number.isFinite(file._data.uncompressedSize)) ? file._data.uncompressedSize : null;
                    let blob = null;
                    if (!size) {
                        try {
                            blob = await file.async('blob');
                            size = blob.size;
                        } catch (_) {
                            size = 0;
                        }
                    }
                    
                    // 文件大小过滤
                    if (size > MAX_SIZE) {
                        const sizeMB = (size / (1024 * 1024)).toFixed(2);
                        const maxSizeMB = (MAX_SIZE / (1024 * 1024)).toFixed(0);
                        console.log(`[文件过滤] 跳过过大的文件: "${normPath}" (${sizeMB}MB > ${maxSizeMB}MB)`);
                        skippedLarge++;
                        continue;
                    }
                    // 读取文本内容（尽量复用 blob）
                    let content = '';
                    try {
                        if (blob) {
                            content = await blob.text();
                        } else {
                            content = await file.async('string');
                        }
                    } catch (_) {
                        try {
                            const b64 = await file.async('base64');
                            content = atob(b64);
                        } catch (e) {
                            content = '';
                        }
                    }
                    // 记录精确字节数，优先用上面计算到的 size；若不可用则回退用 TextEncoder 重新计算
                    const payloadSize = Number.isFinite(size)
                        ? size
                        : ((typeof TextEncoder !== 'undefined' && typeof content === 'string')
                            ? new TextEncoder().encode(content).length
                            : ((content || '').length));

                    filesPayload.push({
                        projectId,
                        fileId: normPath,
                        id: normPath,
                        path: normPath,
                        name: normPath.split('/').pop(),
                        content: content || '',
                        size: payloadSize
                    });
                    processed++;
                    
                    // 特别确认 MoreButton.vue 的处理结果
                    if (path.includes('MoreButton.vue')) {
                        console.log(`[文件处理] ✅ MoreButton.vue 成功添加到文件载荷: "${normPath}"`);
                        console.log(`[文件处理] MoreButton.vue 内容长度: ${(content || '').length} 字符`);
                    }
                }
                
                // 输出处理统计信息
                console.log(`[文件处理统计] 总文件数: ${entries.length}`);
                console.log(`[文件处理统计] 成功处理: ${processed}`);
                console.log(`[文件处理统计] 深层次文件处理: ${deepFilesProcessed}`);
                console.log(`[文件处理统计] 跳过排除项: ${skippedExcluded}`);
                console.log(`[文件处理统计] 跳过图片文件: ${skippedImages}`);
                console.log(`[文件处理统计] 跳过大文件(>1MB): ${skippedLarge}`);
                console.log(`[文件处理统计] MoreButton.vue 处理: ${moreButtonProcessed ? '是' : '否'}`);
                console.log(`[文件处理统计] 最终文件载荷数量: ${filesPayload.length}`);
                
                // 专门检查 MoreButton.vue 是否在文件载荷中
                const moreButtonInPayload = filesPayload.find(f => f.name === 'MoreButton.vue' || f.path.includes('MoreButton.vue'));
                if (moreButtonInPayload) {
                    console.log(`[文件处理统计] ✅ MoreButton.vue 在文件载荷中:`, moreButtonInPayload);
                } else {
                    console.log(`[文件处理统计] ❌ MoreButton.vue 不在文件载荷中！`);
                    console.log(`[文件处理统计] 文件载荷中的文件列表:`, filesPayload.map(f => f.path));
                }

                // 构建树（基于路径）- 修复深层次文件丢失问题
                // 根节点的 id 使用 projectId，但后续所有子节点的 id 都不包含 projectId
                const root = { id: projectId, name: projectId, type: 'folder', children: [] };
                const folderMap = new Map();
                folderMap.set('', root);
                
                // 改进的路径规范化函数
                const normalizePath = (path) => {
                    if (!path || typeof path !== 'string') return '';
                    return String(path)
                        .replace(/\\/g, '/')           // 统一使用正斜杠
                        .replace(/^\/+/, '')           // 移除开头的斜杠
                        .replace(/\/+/g, '/')          // 合并多个连续斜杠
                        .replace(/\/$/, '');           // 移除结尾的斜杠（除非是根路径）
                };
                
                // 确保路径不包含 projectId（用于文件树节点的 id）
                const removeProjectIdPrefix = (path) => {
                    if (!path || !projectId) return path;
                    const normalized = normalizePath(path);
                    const parts = normalized.split('/').filter(Boolean);
                    // 去除所有开头的 projectId
                    while (parts.length > 0 && parts[0].toLowerCase() === projectId.toLowerCase()) {
                        parts.shift();
                    }
                    return parts.length > 0 ? parts.join('/') : '';
                };
                
                // 改进的文件夹确保函数 - 修复递归创建逻辑
                const ensureFolder = (folderPath) => {
                    const norm = normalizePath(folderPath);
                    
                    // 如果路径为空，返回根节点
                    if (!norm) return root;
                    
                    // 去除 projectId 前缀，确保文件夹节点的 id 不包含 projectId
                    const folderIdWithoutProjectId = removeProjectIdPrefix(norm);
                    
                    // 如果已经存在，直接返回
                    if (folderMap.has(folderIdWithoutProjectId)) return folderMap.get(folderIdWithoutProjectId);
                    
                    // 递归创建父目录
                    const pathSegments = folderIdWithoutProjectId.split('/').filter(Boolean);
                    let currentPath = '';
                    let parent = root;
                    
                    // 特别关注深层次路径
                    if (pathSegments.length > 3) {
                        console.log(`[ensureFolder] 创建深层次路径: ${folderIdWithoutProjectId} (${pathSegments.length} 层)`);
                    }
                    
                    // 逐级创建路径中的每个文件夹
                    for (let i = 0; i < pathSegments.length; i++) {
                        const segment = pathSegments[i];
                        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
                        
                        if (!folderMap.has(currentPath)) {
                            const node = { 
                                id: currentPath,  // 不包含 projectId
                                name: segment, 
                                type: 'folder', 
                                children: [],
                                path: currentPath  // 确保path字段存在
                            };
                            parent.children.push(node);
                            folderMap.set(currentPath, node);
                            
                            // 特别关注深层次文件夹的创建
                            if (pathSegments.length > 3) {
                                console.log(`[ensureFolder] 创建深层次文件夹: ${currentPath} (第 ${i + 1} 层)`);
                            }
                        }
                        parent = folderMap.get(currentPath);
                    }
                    
                    return parent;
                };
                
                // 处理所有文件，确保其父目录存在
                console.log(`[文件树构建] 开始处理 ${filesPayload.length} 个文件`);
                let deepFilesInTree = 0;
                let moreButtonInTree = false;
                for (const f of filesPayload) {
                    const filePath = normalizePath(f.path);
                    if (!filePath) {
                        console.warn('[文件树构建] 跳过无效路径的文件:', f);
                        continue;
                    }
                    
                    // 去除 projectId 前缀，确保文件节点的 id 不包含 projectId
                    const filePathWithoutProjectId = removeProjectIdPrefix(filePath);
                    
                    // 获取文件的父目录路径（也不包含 projectId）
                    const pathSegments = filePathWithoutProjectId.split('/').filter(Boolean);
                    const dir = pathSegments.length > 1 
                        ? pathSegments.slice(0, -1).join('/') 
                        : '';
                    
                    // 特别关注深层次文件
                    if (pathSegments.length > 3) {
                        console.log(`[文件树构建] 处理深层次文件: ${filePathWithoutProjectId} (${pathSegments.length} 层), 父目录: ${dir || '根目录'}`);
                        deepFilesInTree++;
                    }
                    
                    // 特别关注 MoreButton.vue 文件
                    if (f.name === 'MoreButton.vue' || filePathWithoutProjectId.includes('MoreButton.vue')) {
                        console.log(`[文件树构建] 发现 MoreButton.vue 文件: ${filePathWithoutProjectId}, 父目录: ${dir || '根目录'}`);
                        moreButtonInTree = true;
                    }
                    
                    // 确保父目录存在
                    const parent = ensureFolder(dir);
                    
                    // 创建文件节点（id 不包含 projectId）
                    const fileNode = { 
                        id: filePathWithoutProjectId,  // 不包含 projectId
                        name: f.name, 
                        type: 'file', 
                        size: (Number.isFinite(f.size) ? f.size : ((f.content || '').length)), 
                        modified: Date.now(),
                        path: filePathWithoutProjectId  // 确保path字段存在，不包含 projectId
                    };
                    
                    parent.children.push(fileNode);
                    
                    // 特别关注深层次文件的添加过程
                    if (pathSegments.length > 3) {
                        console.log(`[文件树构建] 成功添加深层次文件: ${f.name} 到父目录: ${dir || '根目录'}`);
                        console.log(`[文件树构建] 父目录当前子节点数量: ${parent.children.length}`);
                    }
                }
                
                console.log(`[文件树构建] 文件树构建完成，共创建 ${folderMap.size} 个文件夹节点`);
                console.log(`[文件树构建统计] 深层次文件添加到树中: ${deepFilesInTree}`);
                console.log(`[文件树构建统计] MoreButton.vue 添加到树中: ${moreButtonInTree ? '是' : '否'}`);

                // 覆盖导入：采用并集策略，已存在的文件覆盖，不存在的文件补充
                // 提示：前面已导入 CRUD
                
                // 1. 获取现有的文件列表，用于判断是更新还是新增，以及构建完整的文件树
                const filesQuery = `${window.API_URL}/mongodb/?cname=projectFiles&projectId=${encodeURIComponent(projectId)}`;
                let existingFilesMap = new Map(); // fileId -> { key, ... }
                let allFilesForTree = [...filesPayload]; // 包含所有文件（现有 + 新导入）用于构建文件树
                try {
                    const filesResp = await getData(filesQuery, {}, false);
                    const existingFilesList = filesResp?.data?.list || [];
                    for (const doc of existingFilesList) {
                        const fileId = doc?.fileId || doc?.id || doc?.path;
                        if (fileId) {
                            existingFilesMap.set(fileId, {
                                key: doc?.key || doc?._id || doc?.id,
                                ...doc
                            });
                            
                            // 如果现有文件不在新导入的文件列表中，添加到文件树构建列表
                            const isInNewFiles = filesPayload.some(f => {
                                const newFileId = f.fileId || f.id || f.path;
                                return newFileId === fileId;
                            });
                            
                            if (!isInNewFiles) {
                                // 现有文件不在新导入列表中，需要保留在文件树中
                                allFilesForTree.push({
                                    projectId: doc.projectId || projectId,
                                    fileId: fileId,
                                    id: fileId,
                                    path: fileId,
                                    name: doc.name || (typeof fileId === 'string' ? fileId.split('/').pop() : ''),
                                    content: doc.content || '',
                                    size: doc.size || (doc.content ? doc.content.length : 0)
                                });
                            }
                        }
                    }
                    console.log(`[覆盖导入] 找到 ${existingFilesMap.size} 个已存在的文件`);
                    console.log(`[覆盖导入] 文件树将包含 ${allFilesForTree.length} 个文件（新导入: ${filesPayload.length}，现有保留: ${allFilesForTree.length - filesPayload.length}）`);
                } catch (e) {
                    console.warn('[覆盖导入] 获取现有文件列表失败:', e);
                }

                // 2. 基于所有文件（现有 + 新导入）重新构建完整的文件树
                // 重新构建文件树，包含所有文件
                const mergedRoot = { id: projectId, name: projectId, type: 'folder', children: [] };
                const mergedFolderMap = new Map();
                mergedFolderMap.set('', mergedRoot);
                
                // 使用相同的规范化函数
                const normalizePathForTree = (path) => {
                    if (!path || typeof path !== 'string') return '';
                    return String(path)
                        .replace(/\\/g, '/')
                        .replace(/^\/+/, '')
                        .replace(/\/+/g, '/')
                        .replace(/\/$/, '');
                };
                
                const removeProjectIdPrefixForTree = (path) => {
                    if (!path || !projectId) return path;
                    const normalized = normalizePathForTree(path);
                    const parts = normalized.split('/').filter(Boolean);
                    while (parts.length > 0 && parts[0].toLowerCase() === projectId.toLowerCase()) {
                        parts.shift();
                    }
                    return parts.length > 0 ? parts.join('/') : '';
                };
                
                const ensureFolderForTree = (folderPath) => {
                    const norm = normalizePathForTree(folderPath);
                    if (!norm) return mergedRoot;
                    
                    const folderIdWithoutProjectId = removeProjectIdPrefixForTree(norm);
                    if (mergedFolderMap.has(folderIdWithoutProjectId)) {
                        return mergedFolderMap.get(folderIdWithoutProjectId);
                    }
                    
                    const pathSegments = folderIdWithoutProjectId.split('/').filter(Boolean);
                    let currentPath = '';
                    let parent = mergedRoot;
                    
                    for (let i = 0; i < pathSegments.length; i++) {
                        const segment = pathSegments[i];
                        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
                        
                        if (!mergedFolderMap.has(currentPath)) {
                            const node = {
                                id: currentPath,
                                name: segment,
                                type: 'folder',
                                children: [],
                                path: currentPath
                            };
                            parent.children.push(node);
                            mergedFolderMap.set(currentPath, node);
                        }
                        parent = mergedFolderMap.get(currentPath);
                    }
                    
                    return parent;
                };
                
                // 处理所有文件（现有 + 新导入）构建完整的文件树
                console.log(`[文件树合并] 开始处理 ${allFilesForTree.length} 个文件构建完整文件树`);
                for (const f of allFilesForTree) {
                    const filePath = normalizePathForTree(f.path);
                    if (!filePath) continue;
                    
                    const filePathWithoutProjectId = removeProjectIdPrefixForTree(filePath);
                    const pathSegments = filePathWithoutProjectId.split('/').filter(Boolean);
                    const dir = pathSegments.length > 1 
                        ? pathSegments.slice(0, -1).join('/') 
                        : '';
                    
                    const parent = ensureFolderForTree(dir);
                    
                    // 检查文件节点是否已存在（避免重复）
                    const existingFileNode = parent.children.find(child => 
                        child.id === filePathWithoutProjectId && child.type === 'file'
                    );
                    
                    if (!existingFileNode) {
                        const fileNode = {
                            id: filePathWithoutProjectId,
                            name: f.name,
                            type: 'file',
                            size: (Number.isFinite(f.size) ? f.size : ((f.content || '').length)),
                            modified: Date.now(),
                            path: filePathWithoutProjectId
                        };
                        parent.children.push(fileNode);
                    } else {
                        // 更新现有文件节点的信息
                        existingFileNode.name = f.name;
                        existingFileNode.size = (Number.isFinite(f.size) ? f.size : ((f.content || '').length));
                        existingFileNode.modified = Date.now();
                    }
                }
                
                console.log(`[文件树合并] 合并完成，共 ${mergedFolderMap.size} 个文件夹节点`);

                // 3. 更新文件树到数据库
                try {
                    const treeQuery = `${window.API_URL}/mongodb/?cname=projectTree&projectId=${encodeURIComponent(projectId)}`;
                    const treeResp = await getData(treeQuery, {}, false);
                    const treeList = treeResp?.data?.list || [];
                    
                    if (treeList.length > 0) {
                        // 如果树已存在，更新它（使用合并后的完整树）
                        const existingTree = treeList[0];
                        const key = existingTree?.key || existingTree?._id || existingTree?.id;
                        if (key) {
                            await updateData(treeQuery, {
                                key,
                                projectId,
                                data: mergedRoot
                            });
                            console.log('[覆盖导入] 更新文件树（已合并现有文件）');
                        } else {
                            // 没有 key，创建新树
                            await postData(`${window.API_URL}/mongodb/?cname=projectTree`, {
                                projectId,
                                data: mergedRoot
                            });
                            console.log('[覆盖导入] 创建新文件树');
                        }
                    } else {
                        // 树不存在，创建新树
                        await postData(`${window.API_URL}/mongodb/?cname=projectTree`, {
                            projectId,
                            data: mergedRoot
                        });
                        console.log('[覆盖导入] 创建新文件树');
                    }
                } catch (e) {
                    console.error('[覆盖导入] 处理文件树失败:', e);
                    // 失败时尝试创建新树
                    try {
                        await postData(`${window.API_URL}/mongodb/?cname=projectTree`, {
                            projectId,
                            data: mergedRoot
                        });
                    } catch (e2) {
                        console.error('[覆盖导入] 创建文件树也失败:', e2);
                    }
                }

                // 3. 批量处理文件：已存在的更新，不存在的创建
                console.log(`[数据库保存] 开始保存 ${filesPayload.length} 个文件到数据库（并集策略）`);
                let deepFilesSaved = 0;
                let moreButtonSaved = false;
                let filesUploaded = 0;
                let filesUpdated = 0;
                let filesCreated = 0;
                let filesFailed = 0;
                const failedFiles = [];
                
                for (const payload of filesPayload) {
                    try {
                        const fileId = payload.fileId || payload.id || payload.path;
                        const existingFile = existingFilesMap.get(fileId);
                        
                        if (existingFile && existingFile.key) {
                            // 文件已存在，更新它
                            await updateData(filesQuery, {
                                key: existingFile.key,
                                projectId: payload.projectId,
                                fileId: payload.fileId,
                                id: payload.id,
                                path: payload.path,
                                name: payload.name,
                                content: payload.content,
                                size: payload.size
                            });
                            filesUpdated++;
                            filesUploaded++;
                        } else {
                            // 文件不存在，创建它
                            await postData(`${window.API_URL}/mongodb/?cname=projectFiles`, payload);
                            filesCreated++;
                            filesUploaded++;
                        }
                        
                        // 统计深层次文件保存
                        if (payload.path && payload.path.includes('/') && payload.path.split('/').length > 3) {
                            deepFilesSaved++;
                        }
                        
                        // 统计 MoreButton.vue 保存
                        if (payload.name === 'MoreButton.vue' || payload.path.includes('MoreButton.vue')) {
                            moreButtonSaved = true;
                            console.log(`[数据库保存] ${existingFile ? '更新' : '创建'} MoreButton.vue: ${payload.path}`);
                        }
                    } catch (error) {
                        filesFailed++;
                        failedFiles.push({
                            path: payload.path,
                            name: payload.name,
                            error: error?.message || '未知错误'
                        });
                        console.error(`[数据库保存] 文件处理失败: ${payload.path}`, error);
                    }
                }
                console.log(`[数据库保存统计] 成功处理: ${filesUploaded} 个文件（更新: ${filesUpdated}，新增: ${filesCreated}）`);
                console.log(`[数据库保存统计] 上传失败: ${filesFailed} 个文件`);
                console.log(`[数据库保存统计] 深层次文件保存: ${deepFilesSaved}`);
                console.log(`[数据库保存统计] MoreButton.vue 保存: ${moreButtonSaved ? '是' : '否'}`);
                
                if (failedFiles.length > 0) {
                    console.log(`[数据库保存统计] 失败文件列表:`, failedFiles);
                }

                // 刷新本地数据，并自动切换到最新上传的项目
                try {
                    if (typeof store.loadProjects === 'function') {
                        await store.loadProjects();
                    }
                } catch (_) {}

                // 更新选择到刚上传的项目
                try { setSelectedProject(projectId); } catch (_) {}

                // 加载界面所需数据
                await Promise.all([
                    loadFileTree(projectId),
                    loadFiles(projectId),
                    (async () => { try { await loadComments(projectId); } catch (_) {} })()
                ]);

                // 可选：同步评论者数据
                try { if (typeof store.loadCommenters === 'function') { await store.loadCommenters(projectId); } } catch (_) {}

                // 广播项目就绪事件
                try {
                    window.dispatchEvent(new CustomEvent('projectReady', { detail: { projectId } }));
                } catch (_) {}

                const { showSuccess, showWarning } = await import('/utils/message.js');
                let msg = `导入完成：成功处理 ${filesUploaded} 个文件`;
                if (filesUpdated > 0 && filesCreated > 0) {
                    msg += `（更新 ${filesUpdated} 个，新增 ${filesCreated} 个）`;
                } else if (filesUpdated > 0) {
                    msg += `（更新 ${filesUpdated} 个）`;
                } else if (filesCreated > 0) {
                    msg += `（新增 ${filesCreated} 个）`;
                }
                if (filesFailed > 0) {
                    msg += `，失败 ${filesFailed} 个文件`;
                }
                msg += `，跳过排除项 ${skippedExcluded} 个`;
                if (skippedImages > 0) {
                    msg += `，跳过图片文件 ${skippedImages} 个`;
                }
                if (skippedLarge > 0) {
                    msg += `，跳过大文件(>1MB) ${skippedLarge} 个`;
                }
                msg += `。已切换到 ${projectId}`;
                
                if (filesFailed > 0) {
                    showWarning(msg);
                } else {
                    showSuccess(msg);
                }
            } finally {
                try { if (__uploadLoadingShown) hideGlobalLoading(); } catch (_) {}
            }
        }, '项目上传');
    };

    // 触发隐藏的文件选择
    const triggerUploadProjectVersion = () => {
        return safeExecute(() => {
            const input = document.getElementById('aicrUploadZipInput');
            if (input) {
                try { input.value = ''; } catch (_) {}
                if (typeof input.click === 'function') input.click();
            }
        }, '触发上传选择');
    };

    /**
     * 打开链接
     * @param {string} url - 链接地址
     */
    const openLink = (url) => {
        if (!url) return;
        if (/^https?:\/\//.test(url)) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            window.location.href = url;
        }
    };

    /**
     * 处理文件选择
     * @param {string|Object} fileId - 文件ID或节点对象
     */
    const handleFileSelect = (fileId) => {
        return safeExecute(async () => {
            console.log('[文件选择] 收到文件选择请求:', fileId);
            
            // 支持对象入参：优先使用 fileId，然后是 id，最后是 name
            let targetFileId = fileId;
            if (fileId && typeof fileId === 'object') {
                const node = fileId;
                // 优先使用 fileId，然后是 id，最后是 name
                targetFileId = node.fileId || node.id || node.name || '';
                console.log('[文件选择] 从对象中提取文件ID:', targetFileId, '原始对象:', node);
                
                // 如果有 key 信息，保存到全局变量供后续使用
                if (node.key || node._id) {
                    window.__aicrPendingFileKey = node.key || node._id;
                    console.log('[文件选择] 保存文件Key:', window.__aicrPendingFileKey);
                }
            }

            // 使用统一的文件ID规范化函数
            const idNorm = normalizeFileId(targetFileId);
            if (!idNorm) {
                throw createError('文件ID无效', ErrorTypes.VALIDATION, '文件选择');
            }

            console.log('[文件选择] 设置选中的文件ID:', idNorm);
            setSelectedFileId(idNorm);

            // 若项目就绪，尝试按需加载内容
            try {
                const pj = selectedProject?.value;
                if (pj && typeof loadFileById === 'function') {
                    console.log('[文件选择] 开始按需加载文件内容:', { project: pj, fileId: idNorm });
                    await loadFileById(pj, null, idNorm);
                }
            } catch (e) {
                console.warn('[文件选择] 按需加载失败(忽略):', e?.message || e);
            }
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

                // 从选择器获取项目信息
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

                // 规范化时间戳（转换为毫秒数）
                const now = Date.now();
                let timestamp = now;
                if (commentData.timestamp) {
                    if (typeof commentData.timestamp === 'string') {
                        const date = new Date(commentData.timestamp);
                        timestamp = isNaN(date.getTime()) ? now : date.getTime();
                    } else if (typeof commentData.timestamp === 'number') {
                        // 如果是秒级时间戳，转换为毫秒
                        timestamp = commentData.timestamp < 1e12 ? commentData.timestamp * 1000 : commentData.timestamp;
                    }
                }
                
                // 统一 type 字段（从 role 或 author 推断）
                let type;
                if (commentData.type) {
                    type = commentData.type;
                } else if (commentData.role) {
                    const role = String(commentData.role).toLowerCase();
                    type = (role === 'user' || role === 'me') ? 'user' : 'pet';
                } else {
                    // 根据 author 判断
                    const author = String(commentData.author || '').toLowerCase();
                    type = (author.includes('ai') || author.includes('助手') || author.includes('assistant')) ? 'pet' : 'user';
                }
                
                // 统一 content 字段
                const content = String(commentData.content || commentData.text || '').trim();
                
                // 构建评论数据（保留评论特有字段，同时包含统一的消息字段）
                let comment = {
                    ...commentData,
                    // 统一的消息字段
                    type: type,
                    content: content,
                    timestamp: timestamp,
                    // 保留评论特有字段
                    fileId: selectedFileId.value,
                    projectId: projectId,
                    versionId: versionId,
                    // 兼容字段（保留原有字段以兼容旧代码）
                    text: content, // content 和 text 保持一致
                    createdTime: timestamp, // 毫秒数
                    createdAt: timestamp, // 毫秒数
                    // author 字段保留（用于显示）
                    author: commentData.author || (type === 'pet' ? 'AI助手' : '用户')
                };
                
                // 使用规范化函数确保字段一致性
                if (store && store.normalizeComment) {
                    comment = store.normalizeComment(comment);
                }

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
                
                // 同步评论到会话消息（确保使用规范化后的评论）
                if (projectId && selectedFileId.value) {
                    try {
                        const { getSessionSyncService } = await import('/views/aicr/services/sessionSyncService.js');
                        const sessionSync = getSessionSyncService();
                        let commentWithKey = {
                            ...comment,
                            key: result?.data?.key || result?.key || comment.key || `comment_${Date.now()}`
                        };
                        // 再次规范化，确保字段一致性
                        if (store && store.normalizeComment) {
                            commentWithKey = store.normalizeComment(commentWithKey);
                        }
                        await sessionSync.syncCommentToMessage(commentWithKey, selectedFileId.value, projectId, false);
                        console.log('[评论提交] 评论已同步到会话消息');
                    } catch (syncError) {
                        console.warn('[评论提交] 同步评论到会话消息失败（已忽略）:', syncError?.message);
                    }
                }
                
                showSuccessMessage('评论添加成功');

                // 立即触发评论面板刷新，确保新评论能够显示
                console.log('[评论提交] 立即触发评论面板刷新');
                window.dispatchEvent(new CustomEvent('reloadComments', {
                    detail: { 
                        projectId: projectId, 
                        versionId: versionId, 
                        forceReload: true,
                        immediateReload: true // 标记立即刷新，不使用防抖
                    }
                }));

                // 立即在UI中显示新评论
                let commentAdded = false;
                
                // 方法1：通过ref直接调用组件方法
                if (window.aicrApp && window.aicrApp.$refs) {
                    const commentPanelRef = window.aicrApp.$refs['comment-panel'];
                    if (commentPanelRef && typeof commentPanelRef.addCommentToLocalData === 'function') {
                        console.log('[评论提交] 方法1：通过ref直接调用组件方法');
                        commentPanelRef.addCommentToLocalData(comment);
                        commentAdded = true;
                    } else {
                        console.log('[评论提交] 方法1失败：无法获取评论面板组件引用或方法不存在');
                        console.log('[评论提交] commentPanelRef存在:', !!commentPanelRef);
                        console.log('[评论提交] addCommentToLocalData方法存在:', !!(commentPanelRef && commentPanelRef.addCommentToLocalData));
                    }
                } else {
                    console.log('[评论提交] 方法1失败：无法获取aicrApp或$refs');
                }
                
                // 方法2：通过全局方法调用
                if (!commentAdded) {
                    try {
                        // 查找评论面板组件实例
                        const commentPanelElement = document.querySelector('.comment-panel-container');
                        if (commentPanelElement) {
                            // 避免直接访问Vue内部属性，使用更安全的方式
                            const componentInstance = commentPanelElement.__vueParentComponent?.component;
                            if (componentInstance && typeof componentInstance.addCommentGlobally === 'function') {
                                console.log('[评论提交] 方法2：通过全局方法调用');
                                componentInstance.addCommentGlobally(comment);
                                commentAdded = true;
                            } else {
                                console.log('[评论提交] 方法2失败：无法获取组件实例或方法不存在');
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
                
                // 从选择器获取项目信息
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
                
                // 同步删除会话消息
                if (projectId && selectedFileId.value) {
                    try {
                        const { getSessionSyncService } = await import('/views/aicr/services/sessionSyncService.js');
                        const sessionSync = getSessionSyncService();
                        
                        // 查找评论对象以便准确匹配
                        const comment = comments.value.find(c => (c.key || c.id) === commentId);
                        await sessionSync.deleteCommentMessage(commentId, selectedFileId.value, projectId, comment);
                        console.log('[评论删除] 会话消息已删除');
                    } catch (syncError) {
                        console.warn('[评论删除] 删除会话消息失败（已忽略）:', syncError?.message);
                    }
                }
                
                // 显示成功消息
                const { showSuccess } = await import('/utils/message.js');
                showSuccess('评论删除成功');

                // 发送清除高亮事件，通知代码视图组件清除对应的高亮
                console.log('[评论删除] 发送清除高亮事件');
                window.dispatchEvent(new CustomEvent('clearCommentHighlight', {
                    detail: { commentId }
                }));

                // 重新加载评论数据
                if (selectedProject.value) {
                    console.log('[评论删除] 重新加载评论数据');
                    await loadComments(selectedProject.value);
                    
                    // 触发评论面板重新加载mongoComments
                    console.log('[评论删除] 触发评论面板重新加载');
                    setTimeout(() => {
                        console.log('[评论删除] 发送reloadComments事件');
                        window.dispatchEvent(new CustomEvent('reloadComments', {
                            detail: { 
                                projectId: selectedProject.value,
                                forceReload: true,
                                immediateReload: true
                            }
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
                
                // 从选择器获取项目信息
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

                console.log('[评论解决] 调用解决接口:', url);

                // 调用更新接口
                const { updateData } = await import('/apis/modules/crud.js');
                const result = await updateData(url, { key: commentId, status: 'resolved' });

                console.log('[评论解决] 解决成功:', result);
                showSuccessMessage('评论已标记为已解决');

                // 重新加载评论数据
                if (selectedProject.value) {
                    console.log('[评论解决] 重新加载评论数据');
                    await loadComments(selectedProject.value);
                    
                    // 触发评论面板重新加载mongoComments
                    console.log('[评论解决] 触发评论面板重新加载');
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('reloadComments', {
                            detail: { projectId: selectedProject.value }
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
                
                // 从选择器获取项目信息
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
                if (selectedProject.value) {
                    console.log('[评论重新打开] 重新加载评论数据');
                    await loadComments(selectedProject.value);
                    
                    // 触发评论面板重新加载mongoComments
                    console.log('[评论重新打开] 触发评论面板重新加载');
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('reloadComments', {
                            detail: { projectId: selectedProject.value }
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
     * 初始化项目根目录结构
     * @param {string} projectId - 项目ID
     */
    const initializeProjectRootDirectory = async (projectId) => {
        return safeExecute(async () => {
            console.log('[初始化根目录] 开始初始化项目根目录结构:', { projectId });
            
            try {
                const { postData } = await import('/apis/modules/crud.js');
                
                // 创建基本的项目根目录结构 - 只包含根目录
                const rootDirectory = {
                    id: projectId,
                    name: projectId,
                    type: 'folder',
                    path: projectId,
                    children: []
                };
                
                // 创建文件树文档
                const treeUrl = `${window.API_URL}/mongodb/?cname=projectTree`;
                await postData(treeUrl, {
                    projectId: projectId,
                    data: rootDirectory
                });
                
                console.log('[初始化根目录] 项目根目录结构创建成功');
                
                // 只创建 README.md 文件
                const filesUrl = `${window.API_URL}/mongodb/?cname=projectFiles`;
                const basicFiles = [
                    {
                        projectId: projectId,
                        fileId: `${projectId}/README.md`,
                        id: `${projectId}/README.md`,
                        path: `${projectId}/README.md`,
                        name: 'README.md',
                        content: `# ${projectId}\n\n项目描述：这是一个新创建的项目。\n\n## 开始使用\n\n请在此处添加项目的使用说明。`
                    }
                ];
                
                // 批量创建文件
                for (const file of basicFiles) {
                    try {
                        await postData(filesUrl, file);
                        console.log('[初始化根目录] 创建文件:', file.name);
                    } catch (error) {
                        console.warn('[初始化根目录] 创建文件失败:', file.name, error);
                    }
                }
                
                console.log('[初始化根目录] 项目根目录初始化完成');
                
            } catch (error) {
                console.error('[初始化根目录] 初始化失败:', error);
                throw error;
            }
        }, '初始化项目根目录');
    };

    /**
     * 处理评论重新加载事件
     * @param {Object} detail - 事件详情
     */
    const handleReloadComments = async (detail) => {
        return safeExecute(async () => {
            console.log('[评论重新加载] 收到重新加载评论的请求:', detail);
            
            try {
                // 从选择器获取项目信息
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
                
                // 如果详情中有项目/版本信息，优先使用
                if (detail && detail.projectId) {
                    projectId = detail.projectId;
                }
                
                if (detail && detail.versionId) {
                    versionId = detail.versionId;
                }
                
                console.log('[评论重新加载] 使用的项目/版本:', { projectId, versionId });
                
                // 调用加载评论方法
                await loadComments(projectId, versionId);
                
                console.log('[评论重新加载] 评论重新加载完成');
                
            } catch (error) {
                console.error('[评论重新加载] 重新加载评论失败:', error);
                
                // 显示错误消息
                try {
                    const { showError } = await import('/utils/message.js');
                    showError('重新加载评论失败: ' + error.message);
                } catch (_) {}
            }
        }, '评论重新加载处理');
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

            // 防止重复请求
            if (loading.value) {
                console.log('[加载评论] 正在加载中，跳过重复请求');
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
                    
                    // 在加载前清空当前选择与数据，避免旧数据闪烁
                    // 清空文件选择
                    setSelectedFileId(null);
                    
                    // 清空评论数据
                    comments.value = [];
                    
                    // 清空评论者数据
                    if (store.commenters) {
                        store.commenters.value = [];
                        console.log('[项目切换] 评论者数据已清空');
                    }

                    // 加载文件树和文件数据
                    console.log('[项目切换] 开始加载文件树和文件数据...');
                    await Promise.all([
                        loadFileTree(projectId),
                        loadFiles(projectId)
                    ]);
                    console.log('[项目切换] 文件树和文件数据加载完成');
                    
                    // 加载评论数据
                    console.log('[项目切换] 开始加载评论数据...');
                    await loadComments(projectId);
                    console.log('[项目切换] 评论数据加载完成');
                    
                    // 重新加载评论者数据
                    console.log('[项目切换] 开始重新加载评论者数据...');
                    if (store.loadCommenters) {
                        await store.loadCommenters(projectId);
                        console.log('[项目切换] 评论者数据重新加载完成');
                    }
                    
                    // 触发项目就绪事件，通知评论面板重新加载
                    console.log('[项目切换] 触发projectReady事件');
                    window.dispatchEvent(new CustomEvent('projectReady', {
                        detail: {
                            projectId: projectId
                        }
                    }));
                    
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
     * 刷新数据
     */
    const handleRefreshData = () => {
        return safeExecute(() => {
            refreshData();
            console.log('[数据刷新] 刷新当前项目数据');
        }, '数据刷新处理');
    };

    /**
     * 版本选择器已改为select元素，不再需要切换方法
     */

    return {
        openLink,
        handleFileSelect,
        handleFolderToggle,
        // 文件树CRUD
        handleCreateFolder: async (payload) => {
            return safeExecute(async () => {
                const parentId = payload && payload.parentId;
                const name = window.prompt('新建文件夹名称：');
                if (!name) return;
                const projectId = selectedProject?.value || (document.getElementById('projectSelect')?.value || '');
                await createFolder({ parentId, name, projectId });
                showSuccessMessage('文件夹创建成功');
            }, '新建文件夹');
        },
        handleCreateFile: async (payload) => {
            return safeExecute(async () => {
                const parentId = payload && payload.parentId;
                const name = window.prompt('新建文件名称（含扩展名）：');
                if (!name) return;
                const projectId = selectedProject?.value || (document.getElementById('projectSelect')?.value || '');
                await createFile({ parentId, name, content: '', projectId });
                showSuccessMessage('文件创建成功');
            }, '新建文件');
        },
        handleRenameItem: async (payload) => {
            return safeExecute(async () => {
                const itemId = payload && payload.itemId;
                const oldName = payload && payload.name;
                if (!itemId) return;
                const newName = window.prompt('输入新名称：', oldName || '');
                if (!newName) return;
                const projectId = selectedProject?.value || (document.getElementById('projectSelect')?.value) || '';
                await renameItem({ itemId, newName, projectId });
                showSuccessMessage('重命名成功');
            }, '重命名');
        },
        handleDeleteItem: async (payload) => {
            return safeExecute(async () => {
                const itemId = payload && payload.itemId;
                if (!itemId) return;
                if (!confirm('确定删除该项及其子项？此操作不可撤销。')) return;
                const projectId = selectedProject?.value || (document.getElementById('projectSelect')?.value) || '';
                await deleteItem({ itemId, projectId });
                showSuccessMessage('删除成功');
                // 若删除的是当前选中文件，则清空选择
                if (selectedFileId?.value && (selectedFileId.value === itemId || selectedFileId.value.startsWith(itemId + '/'))) {
                    setSelectedFileId(null);
                }
            }, '删除');
        },
        handleCreateSession: async (payload) => {
            console.log('[handleCreateSession] 收到创建会话请求:', payload);
            return safeExecute(async () => {
                const fileId = payload?.fileId || payload?.id;
                console.log('[handleCreateSession] 文件ID:', fileId);
                if (!fileId) {
                    console.error('[handleCreateSession] 无效的文件ID');
                    if (window.showError) {
                        window.showError('无效的文件ID');
                    }
                    return;
                }

                try {
                    // 显示加载状态
                    if (window.showGlobalLoading) {
                        window.showGlobalLoading('正在获取文件内容并生成会话描述...');
                    }

                    const projectId = selectedProject?.value || (document.getElementById('projectSelect')?.value) || '';

                    if (!projectId) {
                        throw new Error('请先选择项目');
                    }

                    // 获取文件内容
                    let fileContent = '';
                    let fileData = null;

                    if (typeof loadFileById === 'function') {
                        fileData = await loadFileById(projectId, null, fileId);
                        if (fileData && fileData.content) {
                            fileContent = fileData.content;
                        }
                    }

                    // 如果通过 loadFileById 没有获取到内容，尝试直接调用 API
                    if (!fileContent) {
                        const { getData } = await import('/apis/modules/crud.js');
                        const url = `${window.API_URL}/mongodb/?cname=projectVersionFiles&projectId=${encodeURIComponent(projectId)}&versionId=${encodeURIComponent(versionId)}&fileId=${encodeURIComponent(fileId)}`;
                        const response = await getData(url, {}, false);
                        let list = (response?.data?.list && Array.isArray(response.data.list)) ? response.data.list : (Array.isArray(response) ? response : []);
                        if (list.length > 0) {
                            fileData = list[0];
                            fileContent = fileData.content || '';
                        }
                    }

                    if (!fileContent) {
                        throw new Error('无法获取文件内容');
                    }

                    // 调用 prompt 接口生成描述
                    const { streamPromptJSON } = await import('/apis/modules/crud.js');
                    
                    // 构建用于生成描述的 prompt
                    const fileInfoText = `文件路径：${fileId}\n文件名称：${payload?.name || fileId.split('/').pop()}\n\n文件内容：\n${fileContent.substring(0, 10000)}`; // 限制内容长度避免过长
                    
                    // 调用 prompt 接口生成描述
                    const descriptionResponse = await streamPromptJSON(`${window.API_URL}/prompt`, {
                        fromSystem: '请根据以下文件内容生成一个简洁的文件描述（不超过200字），描述应该概括文件的主要功能和用途。',
                        fromUser: fileInfoText
                    });

                    // 提取生成的描述
                    let pageDescription = '';
                    if (typeof descriptionResponse === 'string') {
                        pageDescription = descriptionResponse;
                    } else if (descriptionResponse && descriptionResponse.data) {
                        if (Array.isArray(descriptionResponse.data) && descriptionResponse.data.length > 0) {
                            const firstItem = descriptionResponse.data[0];
                            pageDescription = typeof firstItem === 'string' ? firstItem : JSON.stringify(firstItem, null, 2);
                        } else if (typeof descriptionResponse.data === 'string') {
                            pageDescription = descriptionResponse.data;
                        }
                    }

                    // 如果描述为空，使用默认描述
                    if (!pageDescription || pageDescription.trim() === '') {
                        pageDescription = `文件：${payload?.name || fileId}`;
                    }

                    // 生成会话 ID（使用 fileId 作为基础）
                    const sessionId = `${Date.now()}_${fileId.replace(/[^a-zA-Z0-9]/g, '_')}`;
                    
                    // 获取当前时间戳
                    const now = Date.now();

                    // 生成唯一的随机 URL
                    const timestamp = Date.now();
                    const randomStr = Math.random().toString(36).substring(2, 11);
                    const uniqueUrl = `aicr-session://${timestamp}-${randomStr}`;

                    // 构建会话数据
                    const sessionData = {
                        id: sessionId,
                        url: uniqueUrl,
                        title: fileId, // 使用 fileId 作为会话标题
                        pageTitle: fileId,
                        pageDescription: pageDescription.trim(),
                        pageContent: fileContent, // 使用文件内容作为页面上下文
                        messages: [],
                        tags: [],
                        createdAt: now,
                        updatedAt: now,
                        lastAccessTime: now
                    };

                    // 调用会话保存接口
                    const { postData } = await import('/apis/index.js');
                    const saveResult = await postData(`${window.API_URL}/session/save`, sessionData);

                    if (window.hideGlobalLoading) {
                        window.hideGlobalLoading();
                    }
                    
                    if (saveResult && saveResult.success !== false) {
                        if (window.showSuccess) {
                            window.showSuccess(`已成功创建 YiPet 会话：${fileId}`);
                        }
                        console.log('[创建会话] 会话创建成功:', saveResult);
                    } else {
                        throw new Error(saveResult?.message || '创建会话失败');
                    }
                } catch (error) {
                    if (window.hideGlobalLoading) {
                        window.hideGlobalLoading();
                    }
                    console.error('[创建会话] 创建会话失败:', error);
                    if (window.showError) {
                        window.showError(`创建会话失败：${error.message || '未知错误'}`);
                    }
                }
            }, '创建会话');
        },
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
        handleReloadComments,
        loadComments,
        updateCommentFromSystem,
        toggleSidebar: handleToggleSidebar,
        toggleComments: handleToggleComments,
        // 项目/版本管理方法
        handleProjectChange,
        refreshData: handleRefreshData,
        // 搜索相关方法
        handleSearchInput,
        clearSearch,
        handleMessageInput,
        handleCompositionStart,
        handleCompositionEnd,
        handleDownloadProjectVersion,
        handleUploadProjectVersion,
        triggerUploadProjectVersion,
        // =============== 项目与版本维护 ===============
        openProjectVersionManager: () => {
            try {
                const current = Array.isArray(store.projects?.value) ? store.projects.value : [];
                store.pvProjects.value = JSON.parse(JSON.stringify(current));
                const currentId = store.selectedProject?.value || '';
                const exists = store.pvProjects.value.find(p => p.id === currentId);
                store.pvSelectedProjectId.value = exists ? currentId : (store.pvProjects.value[0]?.id || '');
                store.pvError.value = '';
                store.showPvManager.value = true;
            } catch (e) {
                console.error('[PV管理] 打开失败:', e);
                store.showPvManager.value = true;
            }
        },
        closeProjectVersionManager: () => {
            store.showPvManager.value = false;
            store.pvNewProjectId.value = '';
            store.pvNewProjectName.value = '';
            store.pvNewVersionId.value = '';
            store.pvNewVersionName.value = '';
        },
        pvSelectProject: (projectId) => { 
            store.pvSelectedProjectId.value = projectId; 
            store.pvError.value = '';
        },
        pvAddProject: async () => {
            const id = (store.pvNewProjectId.value || '').trim();
            if (!id) return;
            if (store.pvProjects.value.find(p => p.id === id)) return;
            
            try {
                // 调用后端API创建项目
                const { postData, getData } = await import('/apis/modules/crud.js');
                const url = `${window.API_URL}/mongodb/?cname=projects`;
                
                // 检查项目是否已存在
                const existingProject = await getData(`${url}&id=${id}`, {}, false);
                const projectExists = existingProject?.data?.list && existingProject.data.list.length > 0;
                
                if (projectExists) {
                    store.pvError.value = `项目 ${id} 已存在`;
                    return;
                }
                
                // 创建新项目
                await postData(url, { id, versions: [] });
                console.log('[pvAddProject] 新项目已创建:', { projectId: id });
                
                // 更新本地状态
                store.pvProjects.value.push({ id, versions: [] });
                store.pvSelectedProjectId.value = id;
                store.pvNewProjectId.value = '';
                store.pvNewProjectName.value = '';
                store.pvError.value = '';
                
                console.log('[pvAddProject] 项目添加成功');
            } catch (error) {
                console.error('[pvAddProject] 项目添加失败:', error);
                store.pvError.value = `项目添加失败: ${error.message}`;
            }
        },
        pvDeleteProject: async (projectId) => {
            try {
                // 调用后端API删除项目
                const { deleteData, getData } = await import('/apis/modules/crud.js');
                const url = `${window.API_URL}/mongodb/?cname=projects`;
                
                // 获取项目信息
                const existingProject = await getData(`${url}&id=${projectId}`, {}, false);
                const projectExists = existingProject?.data?.list && existingProject.data.list.length > 0;
                
                if (projectExists) {
                    // 1. 删除projectTree数据
                    try {
                        const treeQueryUrl = `${window.API_URL}/mongodb/?cname=projectTree&projectId=${encodeURIComponent(projectId)}`;
                        const treeResp = await getData(treeQueryUrl, {}, false);
                        const treeList = treeResp?.data?.list || [];
                        for (const doc of treeList) {
                            const treeKey = doc?.key || doc?._id || doc?.id;
                            if (treeKey) {
                                await deleteData(`${treeQueryUrl}&key=${treeKey}`);
                            }
                        }
                        console.log('[pvDeleteProject] projectTree已删除:', { projectId, count: treeList.length });
                    } catch (treeErr) {
                        console.warn('[pvDeleteProject] 删除projectTree失败（已忽略）:', treeErr?.message);
                    }
                    
                    // 2. 删除projectFiles数据
                    try {
                        const filesQueryUrl = `${window.API_URL}/mongodb/?cname=projectFiles&projectId=${encodeURIComponent(projectId)}`;
                        const filesResp = await getData(filesQueryUrl, {}, false);
                        const fileList = filesResp?.data?.list || [];
                        for (const f of fileList) {
                            const fileKey = f?.key || f?._id || f?.id;
                            if (fileKey) {
                                await deleteData(`${filesQueryUrl}&key=${fileKey}`);
                            } else {
                                const path = String(f?.path || f?.id || f?.fileId || '');
                                if (path) {
                                    try { await deleteData(`${filesQueryUrl}&fileId=${encodeURIComponent(path)}`); } catch (_) {}
                                }
                            }
                        }
                        console.log('[pvDeleteProject] projectFiles已删除:', { projectId, count: fileList.length });
                    } catch (filesErr) {
                        console.warn('[pvDeleteProject] 删除projectFiles失败（已忽略）:', filesErr?.message);
                    }
                    
                    // 3. 删除comments数据
                    try {
                        const commentsQueryUrl = `${window.API_URL}/mongodb/?cname=comments&projectId=${encodeURIComponent(projectId)}`;
                        const commentsResp = await getData(commentsQueryUrl, {}, false);
                        const commentsList = commentsResp?.data?.list || [];
                        for (const c of commentsList) {
                            const cKey = c?.key || c?._id || c?.id;
                            if (cKey) {
                                await deleteData(`${commentsQueryUrl}&key=${cKey}`);
                            }
                        }
                        console.log('[pvDeleteProject] comments已删除:', { projectId, count: commentsList.length });
                    } catch (commentsErr) {
                        console.warn('[pvDeleteProject] 删除comments失败（已忽略）:', commentsErr?.message);
                    }
                    
                    // 4. 删除所有第一个标签匹配该项目ID的会话
                    try {
                        const { getAuthHeaders } = await import('/apis/helper/authUtils.js');
                        const sessionsUrl = `${window.API_URL}/session/list`;
                        const sessionsResp = await fetch(sessionsUrl, {
                            method: 'GET',
                            headers: getAuthHeaders()
                        });
                        
                        if (sessionsResp.ok) {
                            const sessionsData = await sessionsResp.json();
                            const sessions = sessionsData?.data?.list || sessionsData?.data || [];
                            
                            // 查找所有第一个标签匹配该项目ID的会话
                            const matchingSessions = sessions.filter(session => {
                                const tags = Array.isArray(session.tags) ? session.tags : [];
                                return tags.length > 0 && tags[0] === projectId;
                            });
                            
                            // 删除匹配的会话
                            for (const session of matchingSessions) {
                                const sessionId = session.id || session.key;
                                if (sessionId) {
                                    try {
                                        const deleteUrl = `${window.API_URL}/session/${encodeURIComponent(sessionId)}`;
                                        await fetch(deleteUrl, {
                                            method: 'DELETE',
                                            headers: getAuthHeaders()
                                        });
                                        console.log('[pvDeleteProject] 会话已删除:', { sessionId, projectId });
                                    } catch (sessionErr) {
                                        console.warn('[pvDeleteProject] 删除会话失败（已忽略）:', sessionId, sessionErr?.message);
                                    }
                                }
                            }
                            console.log('[pvDeleteProject] 匹配的会话已删除:', { projectId, count: matchingSessions.length });
                        }
                    } catch (sessionsErr) {
                        console.warn('[pvDeleteProject] 删除匹配会话失败（已忽略）:', sessionsErr?.message);
                    }
                    
                    // 5. 删除项目本身
                    const existingProjectData = existingProject.data.list[0];
                    const key = existingProjectData.key || existingProjectData._id || existingProjectData.id;
                    await deleteData(`${url}&key=${key}`);
                    console.log('[pvDeleteProject] 项目已删除:', { projectId });
                }
                
                // 更新本地状态
                store.pvProjects.value = store.pvProjects.value.filter(p => p.id !== projectId);
                if (store.pvSelectedProjectId.value === projectId) {
                    store.pvSelectedProjectId.value = store.pvProjects.value[0]?.id || '';
                }
                store.pvError.value = '';
                
                console.log('[pvDeleteProject] 项目删除成功');
            } catch (error) {
                console.error('[pvDeleteProject] 项目删除失败:', error);
                store.pvError.value = `项目删除失败: ${error.message}`;
            }
        }
    };
};














