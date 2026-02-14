export const createProjectZipMethods = ({
    store,
    safeExecute,
    createError,
    ErrorTypes,
    normalizeFileObject,
    normalizeTreeNode,
    normalizeFilePath,
    extractFileName,
    fileTree,
    loadFileTree,
    loadFiles
}) => {
    const handleDownloadProjectVersion = async () => {
        console.warn('[handleDownloadProjectVersion] 该功能已被禁用');
    };

    const handleUploadProjectVersion = async (zipFileOrEvent) => {
        return safeExecute(async () => {
            let zipFile = zipFileOrEvent;
            if (zipFileOrEvent && zipFileOrEvent.target && zipFileOrEvent.target.files) {
                zipFile = zipFileOrEvent.target.files[0];
            }

            if (!zipFile) return;

            const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/ui/loading.js');
            let __uploadLoadingShown = false;
            try {
                if (!__uploadLoadingShown) {
                    showGlobalLoading(`正在上传并解析 ...`);
                    __uploadLoadingShown = true;
                }

                const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')).default || window.JSZip || (await import('jszip')).default;
                const zip = await JSZip.loadAsync(zipFile);

                const entries = [];
                zip.forEach((relativePath, fileObj) => {
                    if (!fileObj.dir) {
                        entries.push({ path: relativePath, file: fileObj });
                    }
                });
                if (entries.length === 0) {
                    throw createError('ZIP 中未发现文件', ErrorTypes.VALIDATION, '项目上传');
                }

                const MAX_SIZE = 1 * 1024 * 1024;
                const EXCLUDED_DIRS = ['.git', 'node_modules', '.svn', '.hg', '__MACOSX'];
                const EXCLUDED_FILES = ['.DS_Store', 'Thumbs.db'];

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

                let STRIP_PREFIX = '';
                const normalizedAll = entries.map(e => normalizePathForFilter(e.path)).filter(Boolean);

                if (normalizedAll.length > 0) {
                    const firstLevelDirs = new Set();
                    normalizedAll.forEach(p => {
                        const parts = p.split('/').filter(Boolean);
                        if (parts.length > 0) {
                            firstLevelDirs.add(parts[0]);
                        }
                    });

                    if (firstLevelDirs.size === 1) {
                        const commonRootDir = Array.from(firstLevelDirs)[0];
                        STRIP_PREFIX = commonRootDir + '/';
                        console.log('[路径剥离] 检测到共同根目录，将剥离:', STRIP_PREFIX);
                    }
                }

                console.log('[路径剥离] 最终剥离前缀:', STRIP_PREFIX || '(无)');
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

                    if (path.includes('MoreButton.vue')) {
                        console.log(`[文件处理] 开始处理 MoreButton.vue: 原始路径="${path}", 规范化后="${normPath}"`);
                    }

                    if (STRIP_PREFIX && normPath.startsWith(STRIP_PREFIX)) {
                        normPath = normPath.slice(STRIP_PREFIX.length);
                        console.log(`[文件处理] 路径剥离: "${originalPath}" -> "${normPath}"`);

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

                    if (hasExcludedSegment(normPath) || isExcludedFile(normPath)) {
                        console.log(`[文件处理] 跳过排除文件: "${normPath}"`);
                        if (path.includes('MoreButton.vue')) {
                            console.log(`[文件处理] ❌ MoreButton.vue 被跳过：排除文件`);
                        }
                        skippedExcluded++;
                        continue;
                    }

                    const filename = normPath.split('/').pop();
                    if (isImageFile(filename)) {
                        console.log(`[文件处理] 跳过图片文件: "${normPath}"`);
                        if (path.includes('MoreButton.vue')) {
                            console.log(`[文件处理] ❌ MoreButton.vue 被跳过：图片文件`);
                        }
                        skippedImages++;
                        continue;
                    }

                    if (normPath.includes('/') && normPath.split('/').length > 3) {
                        console.log(`[文件处理] 处理深层次文件: "${normPath}" (${normPath.split('/').length} 层)`);
                        deepFilesProcessed++;
                    }

                    if (normPath.includes('MoreButton.vue')) {
                        console.log(`[文件处理] 发现 MoreButton.vue 文件: "${originalPath}" -> "${normPath}"`);
                        moreButtonProcessed = true;
                    }

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

                    if (size > MAX_SIZE) {
                        const sizeMB = (size / (1024 * 1024)).toFixed(2);
                        const maxSizeMB = (MAX_SIZE / (1024 * 1024)).toFixed(0);
                        console.log(`[文件过滤] 跳过过大的文件: "${normPath}" (${sizeMB}MB > ${maxSizeMB}MB)`);
                        skippedLarge++;
                        continue;
                    }

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

                    const payloadSize = Number.isFinite(size)
                        ? size
                        : ((typeof TextEncoder !== 'undefined' && typeof content === 'string')
                            ? new TextEncoder().encode(content).length
                            : ((content || '').length));

                    const normalizedFile = normalizeFileObject({
                        fileKey: normPath,
                        key: normPath,
                        path: normPath,
                        name: extractFileName(normPath),
                        content: content || '',
                        size: payloadSize,
                        type: 'file'
                    });

                    if (normalizedFile) {
                        filesPayload.push(normalizedFile);
                    }
                    processed++;

                    if (path.includes('MoreButton.vue')) {
                        console.log(`[文件处理] ✅ MoreButton.vue 成功添加到文件载荷: "${normPath}"`);
                        console.log(`[文件处理] MoreButton.vue 内容长度: ${(content || '').length} 字符`);
                    }
                }

                console.log(`[文件处理统计] 总文件数: ${entries.length}`);
                console.log(`[文件处理统计] 成功处理: ${processed}`);
                console.log(`[文件处理统计] 深层次文件处理: ${deepFilesProcessed}`);
                console.log(`[文件处理统计] 跳过排除项: ${skippedExcluded}`);
                console.log(`[文件处理统计] 跳过图片文件: ${skippedImages}`);
                console.log(`[文件处理统计] 跳过大文件(>1MB): ${skippedLarge}`);
                console.log(`[文件处理统计] MoreButton.vue 处理: ${moreButtonProcessed ? '是' : '否'}`);
                console.log(`[文件处理统计] 最终文件载荷数量: ${filesPayload.length}`);

                const moreButtonInPayload = filesPayload.find(f => f.name === 'MoreButton.vue' || f.path.includes('MoreButton.vue'));
                if (moreButtonInPayload) {
                    console.log(`[文件处理统计] ✅ MoreButton.vue 在文件载荷中:`, moreButtonInPayload);
                } else {
                    console.log(`[文件处理统计] ❌ MoreButton.vue 不在文件载荷中！`);
                    console.log(`[文件处理统计] 文件载荷中的文件列表:`, filesPayload.map(f => f.path));
                }

                const root = { key: 'root', name: 'root', type: 'folder', path: 'root', children: [] };
                const folderMap = new Map();
                folderMap.set('', root);

                const normalizePath = (path) => normalizeFilePath(path);

                const removeProjectIdPrefix = (path) => normalizeFilePath(path);

                const filePathsSet = new Set();

                const ensureFolder = (folderPath) => {
                    const norm = normalizePath(folderPath);

                    if (!norm) return root;

                    const folderKeyWithoutProjectId = removeProjectIdPrefix(norm);

                    if (folderMap.has(folderKeyWithoutProjectId)) return folderMap.get(folderKeyWithoutProjectId);

                    if (filePathsSet.has(folderKeyWithoutProjectId)) {
                        console.warn(`[ensureFolder] 跳过创建文件夹 "${folderKeyWithoutProjectId}"，因为已存在同名文件`);
                        const parentPath = folderKeyWithoutProjectId.split('/').slice(0, -1).join('/');
                        return ensureFolder(parentPath);
                    }

                    const pathSegments = folderKeyWithoutProjectId.split('/').filter(Boolean);
                    let currentPath = '';
                    let parent = root;

                    if (pathSegments.length > 3) {
                        console.log(`[ensureFolder] 创建深层次路径: ${folderIdWithoutProjectId} (${pathSegments.length} 层)`);
                    }

                    for (let i = 0; i < pathSegments.length; i++) {
                        const segment = pathSegments[i];
                        currentPath = currentPath ? `${currentPath}/${segment}` : segment;

                        if (filePathsSet.has(currentPath)) {
                            console.warn(`[ensureFolder] 跳过创建文件夹 "${currentPath}"，因为已存在同名文件`);
                            if (i > 0) {
                                const parentPath = pathSegments.slice(0, i).join('/');
                                parent = ensureFolder(parentPath);
                                break;
                            } else {
                                parent = root;
                                break;
                            }
                        }

                        if (!folderMap.has(currentPath)) {
                            const node = normalizeTreeNode({
                                key: currentPath,
                                name: segment,
                                type: 'folder',
                                children: []
                            });

                            if (node) {
                                parent.children.push(node);
                                folderMap.set(currentPath, node);
                            }

                            if (pathSegments.length > 3) {
                                console.log(`[ensureFolder] 创建深层次文件夹: ${currentPath} (第 ${i + 1} 层)`);
                            }
                        }
                        parent = folderMap.get(currentPath);
                    }

                    return parent;
                };

                console.log(`[文件树构建] 开始处理 ${filesPayload.length} 个文件`);

                for (const f of filesPayload) {
                    const filePath = normalizePath(f.path);
                    if (!filePath) {
                        continue;
                    }
                    const filePathWithoutProjectId = removeProjectIdPrefix(filePath);
                    if (filePathWithoutProjectId) {
                        filePathsSet.add(filePathWithoutProjectId);
                    }
                }
                console.log(`[文件树构建] 已收集 ${filePathsSet.size} 个文件路径用于冲突检查`);

                let deepFilesInTree = 0;
                let moreButtonInTree = false;
                for (const f of filesPayload) {
                    const filePath = normalizePath(f.path);
                    if (!filePath) {
                        console.warn('[文件树构建] 跳过无效路径的文件:', f);
                        continue;
                    }

                    const filePathWithoutProjectId = removeProjectIdPrefix(filePath);

                    const pathSegments = filePathWithoutProjectId.split('/').filter(Boolean);
                    const dir = pathSegments.length > 1
                        ? pathSegments.slice(0, -1).join('/')
                        : '';

                    if (pathSegments.length > 3) {
                        console.log(`[文件树构建] 处理深层次文件: ${filePathWithoutProjectId} (${pathSegments.length} 层), 父目录: ${dir || '根目录'}`);
                        deepFilesInTree++;
                    }

                    if (f.name === 'MoreButton.vue' || filePathWithoutProjectId.includes('MoreButton.vue')) {
                        console.log(`[文件树构建] 发现 MoreButton.vue 文件: ${filePathWithoutProjectId}, 父目录: ${dir || '根目录'}`);
                        moreButtonInTree = true;
                    }

                    const parent = ensureFolder(dir);

                    const existingFileItem = parent.children.find(child =>
                        (child.name === f.name) && child.type === 'file'
                    );

                    const existingFolderItem = parent.children.find(child =>
                        (child.name === f.name) && child.type === 'folder'
                    );

                    if (existingFileItem) {
                        console.warn(`[文件树构建] 跳过重复文件: ${filePathWithoutProjectId}`);
                        continue;
                    }

                    if (existingFolderItem) {
                        console.error(`[文件树构建] 发现同名文件夹，无法创建文件节点: ${filePathWithoutProjectId}`);
                        console.error(`[文件树构建] 文件路径结构错误，已存在文件夹节点: ${existingFolderItem.key}`);
                        continue;
                    }

                    const fileNode = normalizeTreeNode({
                        key: filePathWithoutProjectId,
                        name: f.name,
                        type: 'file',
                        size: (Number.isFinite(f.size) ? f.size : ((f.content || '').length)),
                        modified: Date.now()
                    });

                    if (fileNode) {
                        parent.children.push(fileNode);
                    }

                    if (pathSegments.length > 3) {
                        console.log(`[文件树构建] 成功添加深层次文件: ${f.name} 到父目录: ${dir || '根目录'}`);
                        console.log(`[文件树构建] 父目录当前子节点数量: ${parent.children.length}`);
                    }
                }

                console.log(`[文件树构建] 文件树构建完成，共创建 ${folderMap.size} 个文件夹节点`);
                console.log(`[文件树构建统计] 深层次文件添加到树中: ${deepFilesInTree}`);
                console.log(`[文件树构建统计] MoreButton.vue 添加到树中: ${moreButtonInTree ? '是' : '否'}`);

                let existingFilesMap = new Map();
                let allFilesForTree = [...filesPayload];

                try {
                    const extractFilesFromTree = (nodes) => {
                        const fileList = [];
                        const traverse = (node) => {
                            if (!node || typeof node !== 'object') return;

                            if (node.type === 'file' || (node.type !== 'folder' && !node.children)) {
                                const fileKey = node.key || node.path || node.fileKey || '';
                                if (fileKey) {
                                    fileList.push({
                                        fileKey: fileKey,
                                        key: fileKey,
                                        path: fileKey,
                                        name: node.name || (fileKey ? fileKey.split('/').pop() : ''),
                                        content: node.content || '',
                                        size: node.size || (node.content ? node.content.length : 0)
                                    });
                                }
                            }

                            if (node.children && Array.isArray(node.children)) {
                                node.children.forEach(child => traverse(child));
                            }
                        };

                        if (Array.isArray(nodes)) {
                            nodes.forEach(node => traverse(node));
                        } else if (nodes) {
                            traverse(nodes);
                        }

                        return fileList;
                    };

                    const root = Array.isArray(fileTree.value) ? fileTree.value[0] : fileTree.value;
                    const existingFilesList = root ? extractFilesFromTree(root) : [];

                    for (const doc of existingFilesList) {
                        const fileKey = doc?.fileKey || doc?.key || doc?.path;
                        if (fileKey) {
                            existingFilesMap.set(fileKey, {
                                key: fileKey,
                                ...doc
                            });

                            const isInNewFiles = filesPayload.some(f => {
                                const newFileKey = f.fileKey || f.key || f.path;
                                return newFileKey === fileKey;
                            });

                            if (!isInNewFiles) {
                                allFilesForTree.push({
                                    fileKey: fileKey,
                                    key: fileKey,
                                    path: fileKey,
                                    name: doc.name || (typeof fileKey === 'string' ? fileKey.split('/').pop() : ''),
                                    content: doc.content || '',
                                    size: doc.size || (doc.content ? doc.content.length : 0)
                                });
                            }
                        }
                    }
                    console.log(`[覆盖导入] 从文件树中找到 ${existingFilesMap.size} 个已存在的文件`);
                    console.log(`[覆盖导入] 文件树将包含 ${allFilesForTree.length} 个文件（新导入: ${filesPayload.length}，现有保留: ${allFilesForTree.length - filesPayload.length}）`);
                } catch (e) {
                    console.warn('[覆盖导入] 从文件树提取现有文件列表失败:', e);
                }

                const mergedRoot = { key: 'root', name: 'root', type: 'folder', path: 'root', children: [] };
                const mergedFolderMap = new Map();
                mergedFolderMap.set('', mergedRoot);

                const mergedFilePathsSet = new Set();

                const normalizePathForTree = (path) => normalizeFilePath(path);
                const removeProjectIdPrefixForTree = (path) => normalizeFilePath(path);

                const ensureFolderForTree = (folderPath) => {
                    const norm = normalizePathForTree(folderPath);
                    if (!norm) return mergedRoot;

                    const folderIdWithoutProjectId = removeProjectIdPrefixForTree(norm);
                    if (mergedFolderMap.has(folderIdWithoutProjectId)) {
                        return mergedFolderMap.get(folderIdWithoutProjectId);
                    }

                    if (mergedFilePathsSet.has(folderIdWithoutProjectId)) {
                        console.warn(`[ensureFolderForTree] 跳过创建文件夹 "${folderIdWithoutProjectId}"，因为已存在同名文件`);
                        const parentPath = folderIdWithoutProjectId.split('/').slice(0, -1).join('/');
                        return ensureFolderForTree(parentPath);
                    }

                    const pathSegments = folderIdWithoutProjectId.split('/').filter(Boolean);
                    let currentPath = '';
                    let parent = mergedRoot;

                    for (let i = 0; i < pathSegments.length; i++) {
                        const segment = pathSegments[i];
                        currentPath = currentPath ? `${currentPath}/${segment}` : segment;

                        if (mergedFilePathsSet.has(currentPath)) {
                            console.warn(`[ensureFolderForTree] 跳过创建文件夹 "${currentPath}"，因为已存在同名文件`);
                            if (i > 0) {
                                const parentPath = pathSegments.slice(0, i).join('/');
                                parent = ensureFolderForTree(parentPath);
                                break;
                            } else {
                                parent = mergedRoot;
                                break;
                            }
                        }

                        if (!mergedFolderMap.has(currentPath)) {
                            const node = normalizeTreeNode({
                                key: currentPath,
                                name: segment,
                                type: 'folder',
                                children: []
                            });

                            if (node) {
                                parent.children.push(node);
                                mergedFolderMap.set(currentPath, node);
                            }
                        }
                        parent = mergedFolderMap.get(currentPath);
                    }

                    return parent;
                };

                for (const f of allFilesForTree) {
                    const filePath = normalizePathForTree(f.path);
                    if (!filePath) continue;
                    const filePathWithoutProjectId = removeProjectIdPrefixForTree(filePath);
                    if (filePathWithoutProjectId) {
                        mergedFilePathsSet.add(filePathWithoutProjectId);
                    }
                }
                console.log(`[文件树合并] 已收集 ${mergedFilePathsSet.size} 个文件路径用于冲突检查`);

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

                    const existingFileNode = parent.children.find(child =>
                        child.name === f.name && child.type === 'file'
                    );

                    const existingFolderNode = parent.children.find(child =>
                        child.name === f.name && child.type === 'folder'
                    );

                    if (existingFolderNode) {
                        console.error(`[文件树合并] 发现同名文件夹，无法创建文件节点: ${filePathWithoutProjectId}`);
                        console.error(`[文件树合并] 文件路径结构错误，已存在文件夹节点: ${existingFolderNode.key}`);
                        continue;
                    }

                    if (!existingFileNode) {
                        const fileNode = normalizeTreeNode({
                            key: filePathWithoutProjectId,
                            name: f.name,
                            type: 'file',
                            size: (Number.isFinite(f.size) ? f.size : ((f.content || '').length)),
                            modified: Date.now()
                        });

                        if (fileNode) {
                            parent.children.push(fileNode);
                        }
                    } else {
                        existingFileNode.name = f.name;
                        existingFileNode.size = (Number.isFinite(f.size) ? f.size : ((f.content || '').length));
                        existingFileNode.modified = Date.now();
                    }
                }

                console.log(`[文件树合并] 合并完成，共 ${mergedFolderMap.size} 个文件夹节点`);

                console.log(`[数据库保存] 开始同步 ${filesPayload.length} 个文件到会话`);
                let deepFilesSaved = 0;
                let moreButtonSaved = false;
                let filesUploaded = 0;
                let filesUpdated = 0;
                let filesCreated = 0;
                let filesFailed = 0;
                const failedFiles = [];

                const { getSessionSyncService } = await import('/src/services/aicr/sessionSyncService.js');
                const sessionSync = getSessionSyncService();

                for (const payload of filesPayload) {
                    try {
                        const fileKey = payload.fileKey || payload.key || payload.path;
                        const existingFile = existingFilesMap.get(fileKey);
                        const isFile = payload.type === 'file' || (!payload.type && fileKey && !fileKey.endsWith('/'));

                        const isExistingFile = existingFile && existingFile.key;

                        if (isFile && fileKey) {
                            try {
                                const normalizedFileObj = normalizeFileObject(payload);
                                if (normalizedFileObj) {
                                    await sessionSync.syncFileToSession(normalizedFileObj, false, true);

                                    filesUploaded++;
                                    if (isExistingFile) {
                                        filesUpdated++;
                                        console.log(`[数据库保存] 文件已更新到会话: ${fileKey}`);
                                    } else {
                                        filesCreated++;
                                        console.log(`[数据库保存] 文件已创建到会话: ${fileKey}`);
                                    }
                                }
                            } catch (syncError) {
                                console.warn(`[数据库保存] 同步文件到会话失败（已忽略）: ${fileKey}`, syncError?.message);
                                filesFailed++;
                            }
                        }

                        if (payload.path && payload.path.includes('/') && payload.path.split('/').length > 3) {
                            deepFilesSaved++;
                        }

                        if (payload.name === 'MoreButton.vue' || payload.path.includes('MoreButton.vue')) {
                            moreButtonSaved = true;
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

                try {
                    if (typeof store.loadProjects === 'function') {
                        await store.loadProjects();
                    }
                } catch (_) { }

                await Promise.all([
                    loadFileTree(true),
                    loadFiles()
                ]);

                try {
                    if (typeof store.loadSessions === 'function') {
                        await store.loadSessions(true);
                    }
                } catch (_) { }

                try {
                    window.dispatchEvent(new CustomEvent('projectReady', { detail: {} }));
                } catch (_) { }

                const { showSuccess, showWarning } = await import('/src/utils/ui/message.js');
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
                msg += `。已切换到新项目`;

                if (filesFailed > 0) {
                    showWarning(msg);
                } else {
                    showSuccess(msg);
                }
            } finally {
                try { if (__uploadLoadingShown) hideGlobalLoading(); } catch (_) { }
            }
        }, '项目上传');
    };

    const triggerUploadProjectVersion = () => {
        console.warn('[triggerUploadProjectVersion] 该功能已被禁用');
    };

    return {
        handleDownloadProjectVersion,
        handleUploadProjectVersion,
        triggerUploadProjectVersion
    };
};
