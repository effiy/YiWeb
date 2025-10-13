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
        selectedVersion,
        availableVersions,
        setSelectedProject,
        setSelectedVersion,
        getVersionsByProject, // 重构后的方法
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
     * 下载当前项目版本为ZIP
     */
    const handleDownloadProjectVersion = async () => {
        return safeExecute(async () => {
            const projectId = selectedProject?.value;
            const versionId = selectedVersion?.value;
            if (!projectId || !versionId) {
                throw createError('请先选择项目与版本', ErrorTypes.VALIDATION, '项目版本下载');
            }

            // 动态加载依赖
            const { showGlobalLoading, hideGlobalLoading } = await import('/utils/loading.js');
            showGlobalLoading(`正在打包 ${projectId}/${versionId} ...`);
            try {
                // 确保文件列表已加载
                if (!Array.isArray(files?.value) || files.value.length === 0) {
                    await loadFiles(projectId, versionId);
                }
                const allFiles = Array.isArray(files?.value) ? files.value : [];
                if (allFiles.length === 0) {
                    throw createError('当前项目版本下没有文件可下载', ErrorTypes.VALIDATION, '项目版本下载');
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
                const fileName = `${projectId}／${versionId}.zip`;

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
        }, '项目版本下载');
    };

    /**
     * 上传ZIP并覆盖当前项目/版本
     */
    const handleUploadProjectVersion = async (zipFileOrEvent) => {
        return safeExecute(async () => {
            // 兼容事件或直接传入 File
            let zipFile = zipFileOrEvent;
            if (zipFileOrEvent && zipFileOrEvent.target && zipFileOrEvent.target.files) {
                zipFile = zipFileOrEvent.target.files[0];
            }

            // 从文件名解析 项目/版本（优先使用文件名；无版本则默认为 1.0.0）
            // 同时兼容全角斜杠 "／" 和反斜杠 "\\"
            const uiProject = selectedProject?.value || (document.getElementById('projectSelect')?.value) || '';
            const uiVersion = selectedVersion?.value || (document.getElementById('versionSelect')?.value) || '';
            let baseName = '';
            try {
                const rawName = (zipFile && zipFile.name) ? String(zipFile.name) : '';
                baseName = rawName.replace(/\.[Zz][Ii][Pp]$/i, '');
            } catch (_) { baseName = ''; }
            const parts = baseName.split(/[\/\\／]/).filter(Boolean);
            let projectId = parts[0] || uiProject || '';
            let versionId = (parts[1] || '') || uiVersion || '';
            if (!versionId) versionId = '1.0.0';
            if (!projectId) {
                throw createError('无法从文件名解析项目。请将压缩包命名为 "项目/版本.zip"（或"项目／版本.zip"）或先选择项目', ErrorTypes.VALIDATION, '项目版本上传');
            }

            // 动态加载依赖与工具
            const { showGlobalLoading, hideGlobalLoading } = await import('/utils/loading.js');
            let __uploadLoadingShown = false;
            try {
                // 1) 校验项目/版本是否已存在；不存在则补充创建
                const { getData, postData, updateData, deleteData } = await import('/apis/modules/crud.js');
                const pvUrl = `${window.API_URL}/mongodb/?cname=projectVersions`;
                const pvResp = await getData(pvUrl, {}, false);
                const pvList = pvResp?.data?.list || [];
                const projectDoc = pvList.find(p => p && p.id === projectId);
                const extractId = (v) => (typeof v === 'string' ? v : (v && (v.id || v.value)));
                const projectVersions = Array.isArray(projectDoc?.versions) ? projectDoc.versions.map(extractId).filter(Boolean) : [];
                const versionExists = projectVersions.includes(versionId);

                if (versionExists) {
                    const { showMessage } = await import('/utils/message.js');
                    const userChoice = await new Promise((resolve) => {
                        showMessage({
                            type: 'warning',
                            title: '项目版本已存在',
                            content: `检测到 ${projectId}/${versionId} 已存在。请选择操作：`,
                            actions: [
                                { text: '覆盖导入', type: 'primary', action: () => resolve('overwrite') },
                                { text: '更改版本号', action: () => resolve('rename') },
                                { text: '取消', action: () => resolve('cancel') }
                            ],
                            duration: 0
                        });
                    });
                    if (userChoice === 'cancel') {
                        return; // 用户取消
                    }
                    if (userChoice === 'rename') {
                        // 建议下一个版本号
                        const suggestNext = (v) => {
                            try {
                                const m = String(v).match(/^(\d+)\.(\d+)\.(\d+)(.*)?$/);
                                if (m) {
                                    const major = parseInt(m[1], 10);
                                    const minor = parseInt(m[2], 10);
                                    const patch = parseInt(m[3], 10) + 1;
                                    return `${major}.${minor}.${patch}`;
                                }
                            } catch (_) {}
                            return `${v}-new`;
                        };
                        const input = window.prompt('输入新的版本号：', suggestNext(versionId));
                        if (!input || !input.trim()) return;
                        const newVersion = input.trim();
                        // 重新校验是否仍然存在
                        const stillExists = projectVersions.includes(newVersion);
                        if (stillExists) {
                            const { showWarning } = await import('/utils/message.js');
                            showWarning(`版本已存在：${projectId}/${newVersion}`);
                            return;
                        }
                        versionId = newVersion; // 使用新版本号继续
                    }
                    // 若选择覆盖，则继续后续流程（不需要在PV中新增版本）
                }

                // 不存在则新建/更新项目版本信息
                if (projectDoc) {
                    const key = projectDoc?.key || projectDoc?._id || projectDoc?.id;
                    if (key) {
                        // 仅在该版本尚不存在时追加
                        if (!projectVersions.includes(versionId)) {
                            const nextVersions = Array.from(new Set([...projectVersions, versionId]));
                            await updateData(pvUrl, { key, id: projectId, versions: nextVersions });
                        }
                    } else {
                        // 无key容错：直接新增
                        if (!projectVersions.includes(versionId)) {
                            await postData(pvUrl, { id: projectId, versions: [versionId] });
                        }
                    }
                } else {
                    await postData(pvUrl, { id: projectId, versions: [versionId] });
                }

                // 显示loading（至此确定会继续进行上传/覆盖）
                if (!__uploadLoadingShown) {
                    showGlobalLoading(`正在上传并解析 ${projectId}/${versionId} ...`);
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
                    throw createError('ZIP 中未发现文件', ErrorTypes.VALIDATION, '项目版本上传');
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
                // - 忽略排除项后再判断统一前缀
                // - 优先剥离 projectId/versionId 或 projectId
                // - 否则剥离所有条目共有的单一（或多级）根目录（最多两级，避免过度剥离）
                const normalizedAll = entries.map(e => normalizePathForFilter(e.path)).filter(Boolean);
                const candidates = normalizedAll.filter(p => !hasExcludedSegment(p) && !isExcludedFile(p));
                const basis = candidates.length > 0 ? candidates : normalizedAll;
                const splitToSegs = (p) => p.split('/').filter(Boolean);
                const listSegs = basis.map(splitToSegs);
                
                console.log('[路径剥离] 原始路径样本:', normalizedAll.slice(0, 5));
                console.log('[路径剥离] 过滤后路径样本:', candidates.slice(0, 5));
                console.log('[路径剥离] 路径段样本:', listSegs.slice(0, 5));
                
                const allStartsWith = (prefixSegs) => {
                    if (!prefixSegs || prefixSegs.length === 0) return false;
                    return listSegs.length > 0 && listSegs.every(segs => prefixSegs.every((s, i) => segs[i] === s));
                };
                let stripSegs = [];
                // 优先匹配 projectId/versionId 前缀
                if (projectId && versionId && allStartsWith([projectId, versionId])) {
                    stripSegs = [projectId, versionId];
                    console.log('[路径剥离] 匹配项目/版本前缀:', stripSegs);
                } else if (projectId && allStartsWith([projectId])) {
                    stripSegs = [projectId];
                    console.log('[路径剥离] 匹配项目前缀:', stripSegs);
                } else {
                    // 退化策略：取所有条目的最长公共前缀（按段），但更保守
                    if (listSegs.length > 0) {
                        const first = listSegs[0].slice();
                        let common = [];
                        for (let i = 0; i < first.length; i++) {
                            const candidate = first[i];
                            const ok = listSegs.every(segs => segs[i] === candidate);
                            if (ok) common.push(candidate); else break;
                        }
                        
                        // 更保守的剥离策略：
                        // 1. 如果公共前缀只有1个段，且是常见的项目根目录名，则不剥离
                        // 2. 如果公共前缀是2个段，且第一个是项目名，则只剥离第一个
                        // 3. 避免剥离 "src", "lib", "app" 等常见的源码目录
                        const commonSrcDirs = ['src', 'lib', 'app', 'components', 'utils', 'views', 'pages'];
                        
                        if (common.length > 0) {
                            // 如果公共前缀是常见的源码目录，不剥离
                            if (common.length === 1 && commonSrcDirs.includes(common[0])) {
                                stripSegs = [];
                                console.log('[路径剥离] 跳过常见源码目录剥离:', common[0]);
                            } else if (common.length === 2 && commonSrcDirs.includes(common[1])) {
                                // 如果第二段是源码目录，只剥离第一段
                                stripSegs = [common[0]];
                                console.log('[路径剥离] 只剥离项目名，保留源码目录:', stripSegs);
                            } else {
                                // 其他情况，最多剥离两级
                                stripSegs = common.slice(0, Math.min(2, common.length));
                                console.log('[路径剥离] 使用公共前缀:', stripSegs);
                            }
                        }
                    }
                }
                const STRIP_PREFIX = stripSegs.length > 0 ? (stripSegs.join('/') + '/') : '';
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
                        versionId,
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
                
                // 改进的文件夹确保函数 - 修复递归创建逻辑
                const ensureFolder = (folderPath) => {
                    const norm = normalizePath(folderPath);
                    
                    // 如果路径为空，返回根节点
                    if (!norm) return root;
                    
                    // 如果已经存在，直接返回
                    if (folderMap.has(norm)) return folderMap.get(norm);
                    
                    // 递归创建父目录
                    const pathSegments = norm.split('/').filter(Boolean);
                    let currentPath = '';
                    let parent = root;
                    
                    // 特别关注深层次路径
                    if (pathSegments.length > 3) {
                        console.log(`[ensureFolder] 创建深层次路径: ${norm} (${pathSegments.length} 层)`);
                    }
                    
                    // 逐级创建路径中的每个文件夹
                    for (let i = 0; i < pathSegments.length; i++) {
                        const segment = pathSegments[i];
                        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
                        
                        if (!folderMap.has(currentPath)) {
                            const node = { 
                                id: currentPath, 
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
                    
                    // 获取文件的父目录路径
                    const pathSegments = filePath.split('/').filter(Boolean);
                    const dir = pathSegments.length > 1 
                        ? pathSegments.slice(0, -1).join('/') 
                        : '';
                    
                    // 特别关注深层次文件
                    if (pathSegments.length > 3) {
                        console.log(`[文件树构建] 处理深层次文件: ${filePath} (${pathSegments.length} 层), 父目录: ${dir || '根目录'}`);
                        deepFilesInTree++;
                    }
                    
                    // 特别关注 MoreButton.vue 文件
                    if (f.name === 'MoreButton.vue' || filePath.includes('MoreButton.vue')) {
                        console.log(`[文件树构建] 发现 MoreButton.vue 文件: ${filePath}, 父目录: ${dir || '根目录'}`);
                        moreButtonInTree = true;
                    }
                    
                    // 确保父目录存在
                    const parent = ensureFolder(dir);
                    
                    // 创建文件节点
                    const fileNode = { 
                        id: filePath, 
                        name: f.name, 
                        type: 'file', 
                        size: (Number.isFinite(f.size) ? f.size : ((f.content || '').length)), 
                        modified: Date.now(),
                        path: filePath  // 确保path字段存在
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

                // 覆盖远端：先删除当前 project/version 的树与文件，再写入新内容
                // 提示：前面已导入 CRUD
                // 删除树
                try {
                    const treeQuery = `${window.API_URL}/mongodb/?cname=projectVersionTree&projectId=${encodeURIComponent(projectId)}&versionId=${encodeURIComponent(versionId)}`;
                    const treeResp = await getData(treeQuery, {}, false);
                    const treeList = treeResp?.data?.list || [];
                    for (const doc of treeList) {
                        const key = doc?.key || doc?._id || doc?.id;
                        if (key) await deleteData(`${treeQuery}&key=${key}`);
                    }
                } catch (e) {}

                // 删除文件集合
                try {
                    const filesQuery = `${window.API_URL}/mongodb/?cname=projectVersionFiles&projectId=${encodeURIComponent(projectId)}&versionId=${encodeURIComponent(versionId)}`;
                    const filesResp = await getData(filesQuery, {}, false);
                    const list = filesResp?.data?.list || [];
                    for (const doc of list) {
                        const key = doc?.key || doc?._id || doc?.id;
                        if (key) await deleteData(`${filesQuery}&key=${key}`);
                    }
                } catch (e) {}

                // 写入树
                await postData(`${window.API_URL}/mongodb/?cname=projectVersionTree`, {
                    projectId,
                    versionId,
                    data: root
                });

                // 批量写入文件
                console.log(`[数据库保存] 开始保存 ${filesPayload.length} 个文件到数据库`);
                let deepFilesSaved = 0;
                let moreButtonSaved = false;
                let filesUploaded = 0;
                let filesFailed = 0;
                const failedFiles = [];
                
                for (const payload of filesPayload) {
                    try {
                        await postData(`${window.API_URL}/mongodb/?cname=projectVersionFiles`, payload);
                        filesUploaded++;
                        
                        // 统计深层次文件保存
                        if (payload.path && payload.path.includes('/') && payload.path.split('/').length > 3) {
                            deepFilesSaved++;
                        }
                        
                        // 统计 MoreButton.vue 保存
                        if (payload.name === 'MoreButton.vue' || payload.path.includes('MoreButton.vue')) {
                            moreButtonSaved = true;
                            console.log(`[数据库保存] 保存 MoreButton.vue: ${payload.path}`);
                        }
                    } catch (error) {
                        filesFailed++;
                        failedFiles.push({
                            path: payload.path,
                            name: payload.name,
                            error: error?.message || '未知错误'
                        });
                        console.error(`[数据库保存] 文件上传失败: ${payload.path}`, error);
                    }
                }
                console.log(`[数据库保存统计] 成功上传: ${filesUploaded} 个文件`);
                console.log(`[数据库保存统计] 上传失败: ${filesFailed} 个文件`);
                console.log(`[数据库保存统计] 深层次文件保存: ${deepFilesSaved}`);
                console.log(`[数据库保存统计] MoreButton.vue 保存: ${moreButtonSaved ? '是' : '否'}`);
                
                if (failedFiles.length > 0) {
                    console.log(`[数据库保存统计] 失败文件列表:`, failedFiles);
                }

                // 刷新本地数据，并自动切换到最新上传的项目/版本
                try {
                    if (typeof store.loadProjects === 'function') {
                        await store.loadProjects();
                    }
                } catch (_) {}

                // 更新选择到刚上传的项目与版本
                try { setSelectedProject(projectId); } catch (_) {}
                try { setSelectedVersion(versionId); } catch (_) {}

                // 加载界面所需数据
                await Promise.all([
                    loadFileTree(projectId, versionId),
                    loadFiles(projectId, versionId),
                    (async () => { try { await loadComments(projectId, versionId); } catch (_) {} })()
                ]);

                // 可选：同步评论者数据
                try { if (typeof store.loadCommenters === 'function') { await store.loadCommenters(projectId, versionId); } } catch (_) {}

                // 广播项目/版本就绪事件
                try {
                    window.dispatchEvent(new CustomEvent('projectVersionReady', { detail: { projectId, versionId } }));
                } catch (_) {}

                const { showSuccess, showWarning } = await import('/utils/message.js');
                let msg = `上传完成：成功上传 ${filesUploaded} 个文件`;
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
                msg += `。已切换到 ${projectId}/${versionId}`;
                
                if (filesFailed > 0) {
                    showWarning(msg);
                } else {
                    showSuccess(msg);
                }
            } finally {
                try { if (__uploadLoadingShown) hideGlobalLoading(); } catch (_) {}
            }
        }, '项目版本上传');
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

            // 若项目/版本就绪，尝试按需加载内容
            try {
                const pj = selectedProject?.value;
                const ver = selectedVersion?.value;
                if (pj && ver && typeof loadFileById === 'function') {
                    console.log('[文件选择] 开始按需加载文件内容:', { project: pj, version: ver, fileId: idNorm });
                    await loadFileById(pj, ver, idNorm);
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
                
                // 显示成功消息
                const { showSuccess } = await import('/utils/message.js');
                showSuccess('评论删除成功');

                // 发送清除高亮事件，通知代码视图组件清除对应的高亮
                console.log('[评论删除] 发送清除高亮事件');
                window.dispatchEvent(new CustomEvent('clearCommentHighlight', {
                    detail: { commentId }
                }));

                // 重新加载评论数据
                if (selectedProject.value && selectedVersion.value) {
                    console.log('[评论删除] 重新加载评论数据');
                    await loadComments(selectedProject.value, selectedVersion.value);
                    
                    // 触发评论面板重新加载mongoComments
                    console.log('[评论删除] 触发评论面板重新加载');
                    setTimeout(() => {
                        console.log('[评论删除] 发送reloadComments事件');
                        window.dispatchEvent(new CustomEvent('reloadComments', {
                            detail: { 
                                projectId: selectedProject.value, 
                                versionId: selectedVersion.value,
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
     * 初始化项目根目录结构
     * @param {string} projectId - 项目ID
     * @param {string} versionId - 版本ID
     */
    const initializeProjectRootDirectory = async (projectId, versionId) => {
        return safeExecute(async () => {
            console.log('[初始化根目录] 开始初始化项目根目录结构:', { projectId, versionId });
            
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
                const treeUrl = `${window.API_URL}/mongodb/?cname=projectVersionTree`;
                await postData(treeUrl, {
                    projectId: projectId,
                    versionId: versionId,
                    data: rootDirectory
                });
                
                console.log('[初始化根目录] 项目根目录结构创建成功');
                
                // 只创建 README.md 文件
                const filesUrl = `${window.API_URL}/mongodb/?cname=projectVersionFiles`;
                const basicFiles = [
                    {
                        projectId: projectId,
                        versionId: versionId,
                        fileId: `${projectId}/README.md`,
                        id: `${projectId}/README.md`,
                        path: `${projectId}/README.md`,
                        name: 'README.md',
                        content: `# ${projectId}\n\n项目描述：这是一个新创建的项目版本 ${versionId}。\n\n## 开始使用\n\n请在此处添加项目的使用说明。`
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

                    // 自动选择第一个版本（优先从项目直接获取，避免异步时序问题）
                    const versionsForProject = (typeof getVersionsByProject === 'function') 
                        ? getVersionsByProject(projectId) 
                        : (availableVersions?.value || []);
                    if (versionsForProject && versionsForProject.length > 0) {
                        const firstVersion = versionsForProject[0];
                        const firstVersionId = (typeof firstVersion === 'string') 
                            ? firstVersion 
                            : (firstVersion.id || firstVersion.value || firstVersion.versionId || firstVersion.date || firstVersion.name);
                        const firstVersionName = (typeof firstVersion === 'string') 
                            ? firstVersion 
                            : (firstVersion.name || firstVersion.label || firstVersionId);
                        setSelectedVersion(firstVersionId);
                        console.log('[项目切换] 自动选择第一个版本:', { id: firstVersionId, name: firstVersionName, raw: firstVersion });
                        
                        // 加载文件树和文件数据
                        console.log('[项目切换] 开始加载文件树和文件数据...');
                        await Promise.all([
                            loadFileTree(projectId, firstVersionId),
                            loadFiles(projectId, firstVersionId)
                        ]);
                        console.log('[项目切换] 文件树和文件数据加载完成');
                        
                        // 加载评论数据
                        console.log('[项目切换] 开始加载评论数据...');
                        await loadComments(projectId, firstVersionId);
                        console.log('[项目切换] 评论数据加载完成');
                        
                        // 重新加载评论者数据
                        console.log('[项目切换] 开始重新加载评论者数据...');
                        if (store.loadCommenters) {
                            await store.loadCommenters(projectId, firstVersionId);
                            console.log('[项目切换] 评论者数据重新加载完成');
                        }
                        
                        // 触发项目/版本就绪事件，通知评论面板重新加载
                        console.log('[项目切换] 触发projectVersionReady事件');
                        window.dispatchEvent(new CustomEvent('projectVersionReady', {
                            detail: {
                                projectId: projectId,
                                versionId: firstVersionId
                            }
                        }));
                        
                        // 显示成功消息
                        showSuccessMessage(`已切换到项目: ${projectId}，版本: ${firstVersionName}`);
                    } else {
                        // 如果没有可用版本，清空版本选择
                        setSelectedVersion('');
                        console.log('[项目切换] 项目没有可用版本');
                        showSuccessMessage(`已切换到项目: ${projectId}`);
                    }

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
        // 文件树CRUD
        handleCreateFolder: async (payload) => {
            return safeExecute(async () => {
                const parentId = payload && payload.parentId;
                const name = window.prompt('新建文件夹名称：');
                if (!name) return;
                const projectId = selectedProject?.value || (document.getElementById('projectSelect')?.value) || '';
                const versionId = selectedVersion?.value || (document.getElementById('versionSelect')?.value) || '';
                await createFolder({ parentId, name, projectId, versionId });
                showSuccessMessage('文件夹创建成功');
            }, '新建文件夹');
        },
        handleCreateFile: async (payload) => {
            return safeExecute(async () => {
                const parentId = payload && payload.parentId;
                const name = window.prompt('新建文件名称（含扩展名）：');
                if (!name) return;
                const projectId = selectedProject?.value || (document.getElementById('projectSelect')?.value) || '';
                const versionId = selectedVersion?.value || (document.getElementById('versionSelect')?.value) || '';
                await createFile({ parentId, name, content: '', projectId, versionId });
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
                const versionId = selectedVersion?.value || (document.getElementById('versionSelect')?.value) || '';
                await renameItem({ itemId, newName, projectId, versionId });
                showSuccessMessage('重命名成功');
            }, '重命名');
        },
        handleDeleteItem: async (payload) => {
            return safeExecute(async () => {
                const itemId = payload && payload.itemId;
                if (!itemId) return;
                if (!confirm('确定删除该项及其子项？此操作不可撤销。')) return;
                const projectId = selectedProject?.value || (document.getElementById('projectSelect')?.value) || '';
                const versionId = selectedVersion?.value || (document.getElementById('versionSelect')?.value) || '';
                await deleteItem({ itemId, projectId, versionId });
                showSuccessMessage('删除成功');
                // 若删除的是当前选中文件，则清空选择
                if (selectedFileId?.value && (selectedFileId.value === itemId || selectedFileId.value.startsWith(itemId + '/'))) {
                    setSelectedFileId(null);
                }
            }, '删除');
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
        handleVersionChange,
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
                const url = `${window.API_URL}/mongodb/?cname=projectVersions`;
                
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
                const url = `${window.API_URL}/mongodb/?cname=projectVersions`;
                
                // 获取项目信息
                const existingProject = await getData(`${url}&id=${projectId}`, {}, false);
                const projectExists = existingProject?.data?.list && existingProject.data.list.length > 0;
                
                if (projectExists) {
                    const existingProjectData = existingProject.data.list[0];
                    const key = existingProjectData.key || existingProjectData._id || existingProjectData.id;
                    
                    // 删除项目
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
        },
        pvAddVersion: async () => {
            if (!store.pvSelectedProjectId.value) return;
            const id = (store.pvNewVersionId.value || '').trim();
            if (!id) return;
            const proj = store.pvProjects.value.find(p => p.id === store.pvSelectedProjectId.value);
            if (!proj) return;
            proj.versions = Array.isArray(proj.versions) ? proj.versions : [];
            if (proj.versions.find(v => (typeof v === 'string' ? v : v.id) === id)) return;
            
            try {
                // 调用后端API添加版本
                const { postData, updateData, getData } = await import('/apis/modules/crud.js');
                const url = `${window.API_URL}/mongodb/?cname=projectVersions`;
                
                // 检查项目是否已存在
                const existingProject = await getData(`${url}&id=${store.pvSelectedProjectId.value}`, {}, false);
                const projectExists = existingProject?.data?.list && existingProject.data.list.length > 0;
                
                if (projectExists) {
                    // 项目存在，更新版本列表
                    const existingProjectData = existingProject.data.list[0];
                    const key = existingProjectData.key || existingProjectData._id || existingProjectData.id;
                    const currentVersions = Array.isArray(existingProjectData.versions) 
                        ? existingProjectData.versions.map(v => typeof v === 'string' ? v : v.id).filter(Boolean)
                        : [];
                    
                    if (!currentVersions.includes(id)) {
                        const updatedVersions = [...currentVersions, id];
                        await updateData(url, { key, id: store.pvSelectedProjectId.value, versions: updatedVersions });
                        console.log('[pvAddVersion] 版本已添加到现有项目:', { projectId: store.pvSelectedProjectId.value, versionId: id });
                    }
                } else {
                    // 项目不存在，创建新项目
                    await postData(url, { id: store.pvSelectedProjectId.value, versions: [id] });
                    console.log('[pvAddVersion] 新项目已创建并添加版本:', { projectId: store.pvSelectedProjectId.value, versionId: id });
                }
                
                // 初始化项目根目录结构
                await initializeProjectRootDirectory(store.pvSelectedProjectId.value, id);
                
                // 更新本地状态
                proj.versions.push(id);
                store.pvNewVersionId.value = '';
                store.pvNewVersionName.value = '';
                store.pvError.value = '';
                
                // 如果当前选中的是刚创建版本的项目，自动切换到新版本并刷新数据
                if (store.selectedProject?.value === store.pvSelectedProjectId.value) {
                    console.log('[pvAddVersion] 自动切换到新版本并刷新数据');
                    try {
                        // 设置新版本为选中状态
                        setSelectedVersion(id);
                        
                        // 刷新项目列表以获取最新数据
                        if (typeof store.loadProjects === 'function') {
                            await store.loadProjects();
                        }
                        
                        // 加载文件树和文件数据
                        if (typeof loadFileTree === 'function' && typeof loadFiles === 'function') {
                            await Promise.all([
                                loadFileTree(store.pvSelectedProjectId.value, id),
                                loadFiles(store.pvSelectedProjectId.value, id)
                            ]);
                        }
                        
                        // 触发项目/版本就绪事件
                        window.dispatchEvent(new CustomEvent('projectVersionReady', {
                            detail: {
                                projectId: store.pvSelectedProjectId.value,
                                versionId: id
                            }
                        }));
                        
                        console.log('[pvAddVersion] 数据刷新完成');
                    } catch (refreshError) {
                        console.warn('[pvAddVersion] 数据刷新失败:', refreshError);
                    }
                }
                
                console.log('[pvAddVersion] 版本添加成功');
            } catch (error) {
                console.error('[pvAddVersion] 版本添加失败:', error);
                store.pvError.value = `版本添加失败: ${error.message}`;
            }
        },
        pvDeleteVersion: async (versionId) => {
            if (!store.pvSelectedProjectId.value) return;
            const proj = store.pvProjects.value.find(p => p.id === store.pvSelectedProjectId.value);
            if (!proj) return;
            
            try {
                // 调用后端API删除版本
                const { updateData, getData } = await import('/apis/modules/crud.js');
                const url = `${window.API_URL}/mongodb/?cname=projectVersions`;
                
                // 获取项目信息
                const existingProject = await getData(`${url}&id=${store.pvSelectedProjectId.value}`, {}, false);
                const projectExists = existingProject?.data?.list && existingProject.data.list.length > 0;
                
                if (projectExists) {
                    const existingProjectData = existingProject.data.list[0];
                    const key = existingProjectData.key || existingProjectData._id || existingProjectData.id;
                    const currentVersions = Array.isArray(existingProjectData.versions) 
                        ? existingProjectData.versions.map(v => typeof v === 'string' ? v : v.id).filter(Boolean)
                        : [];
                    
                    // 从版本列表中移除指定版本
                    const updatedVersions = currentVersions.filter(v => v !== versionId);
                    
                    if (updatedVersions.length > 0) {
                        // 如果还有其他版本，更新项目
                        await updateData(url, { key, id: store.pvSelectedProjectId.value, versions: updatedVersions });
                        console.log('[pvDeleteVersion] 版本已从项目中删除:', { projectId: store.pvSelectedProjectId.value, versionId });
                    } else {
                        // 如果没有版本了，删除整个项目
                        const { deleteData } = await import('/apis/modules/crud.js');
                        await deleteData(`${url}&key=${key}`);
                        console.log('[pvDeleteVersion] 项目已删除（无版本）:', { projectId: store.pvSelectedProjectId.value });
                    }
                }
                
                // 更新本地状态
                proj.versions = (proj.versions || []).filter(v => (typeof v === 'string' ? v : v.id) !== versionId);
                store.pvError.value = '';
                
                console.log('[pvDeleteVersion] 版本删除成功');
            } catch (error) {
                console.error('[pvDeleteVersion] 版本删除失败:', error);
                store.pvError.value = `版本删除失败: ${error.message}`;
            }
        }
    };
};












