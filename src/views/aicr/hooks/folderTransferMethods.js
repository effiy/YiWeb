export const createFolderTransferMethods = ({
    store,
    safeExecute,
    createError,
    ErrorTypes,
    showSuccessMessage,
    normalizeFilePath,
    extractFileName,
    getApiBaseUrl,
    sessionSync
}) => {
    const {
        fileTree,
        loadFileTree,
        loadFiles,
        loadSessions,
        sessions
    } = store || {};

    const normalizeImportTargetPath = (path) => {
        const normalized = normalizeFilePath(path);
        const parts = normalized.split('/').filter(Boolean).map(p => String(p || '').trim().replace(/\s+/g, '_'));
        return parts.join('/');
    };

    const isProbablyTextFile = (file, filename) => {
        const mime = String(file?.type || '').toLowerCase();
        if (mime.startsWith('text/')) return true;
        if (mime === 'application/json' || mime === 'application/javascript' || mime === 'application/xml') return true;
        const name = String(filename || file?.name || '').toLowerCase();
        const dot = name.lastIndexOf('.');
        const ext = dot >= 0 ? name.slice(dot) : '';
        return [
            '.txt',
            '.md',
            '.json',
            '.js',
            '.mjs',
            '.cjs',
            '.ts',
            '.tsx',
            '.jsx',
            '.vue',
            '.html',
            '.htm',
            '.css',
            '.scss',
            '.sass',
            '.less',
            '.xml',
            '.yml',
            '.yaml',
            '.csv',
            '.log',
            '.ini',
            '.conf',
            '.env',
            '.py',
            '.java',
            '.go',
            '.rs',
            '.rb',
            '.php',
            '.sh',
            '.bat',
            '.sql'
        ].includes(ext);
    };

    const arrayBufferToBase64 = (buffer) => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        return btoa(binary);
    };

    const callWriteFile = async ({ targetPath, content, isBase64 }) => {
        const apiBase = getApiBaseUrl();
        if (!apiBase) {
            throw createError('API地址未配置，无法写入文件', ErrorTypes.VALIDATION, '目录导入');
        }
        let cleanPath = String(normalizeFilePath(targetPath) || '').replace(/^\/+/, '');
        if (cleanPath.startsWith('static/')) cleanPath = cleanPath.slice(7);
        cleanPath = cleanPath.replace(/^\/+/, '');

        const res = await fetch(`${apiBase}/write-file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target_file: cleanPath,
                content: String(content ?? ''),
                is_base64: !!isBase64
            })
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData?.message || `写入失败: ${res.status} ${res.statusText}`);
        }
        const json = await res.json().catch(() => ({}));
        if (json && (json.code === 0 || json.code === 200)) return true;
        if (json && json.success !== false) return true;
        throw new Error(json?.message || '写入失败');
    };

    const deriveSessionPath = (session) => {
        try {
            const desc = String(session?.pageDescription || '');
            const m = desc.match(/文件：\s*(.+)\s*$/);
            if (m && m[1]) return normalizeFilePath(m[1]);
            const tags = Array.isArray(session?.tags) ? session.tags : [];
            const title = String(session?.title || session?.pageTitle || '').trim();
            const folder = tags.map(t => String(t || '').trim()).filter(Boolean).join('/');
            const combined = folder ? `${folder}/${title}` : title;
            return normalizeFilePath(combined);
        } catch (_) {
            return '';
        }
    };

    const findSessionByFilePath = (filePath) => {
        const list = Array.isArray(sessions?.value) ? sessions.value : [];
        const target = normalizeFilePath(filePath);
        return list.find(s => deriveSessionPath(s) === target) || null;
    };

    const upsertSessionForFilePath = async ({ filePath, existingSession }) => {
        const normalizedPath = normalizeFilePath(filePath);
        const parts = normalizedPath.split('/').filter(Boolean);
        const title = String(parts[parts.length - 1] || '').trim().replace(/\s+/g, '_');
        const tags = parts.slice(0, -1);
        const now = Date.now();
        const url = String(existingSession?.url || `aicr-import://${now}-${Math.random().toString(36).slice(2, 10)}`);
        const payload = {
            key: existingSession?.key,
            url,
            title,
            pageDescription: `文件：${normalizedPath}`,
            tags,
            messages: Array.isArray(existingSession?.messages) ? existingSession.messages : [],
            isFavorite: existingSession?.isFavorite !== undefined ? !!existingSession.isFavorite : false,
            createdAt: existingSession?.createdAt || now,
            updatedAt: now,
            lastAccessTime: now
        };
        await sessionSync.saveSession(payload);
    };

    const handleFolderImport = async (payload) => {
        return safeExecute(async () => {
            const folderKeyRaw = payload && (payload.folderKey || payload.key || payload.itemId);
            const folderKey = normalizeFilePath(folderKeyRaw || '');
            if (!folderKey) {
                throw createError('目录Key无效', ErrorTypes.VALIDATION, '目录导入');
            }

            const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/ui/loading.js');
            let __loadingShown = false;
            try {
                showGlobalLoading('请选择要导入的目录...');
                __loadingShown = true;

                const pickedFiles = await new Promise((resolve) => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.setAttribute('webkitdirectory', '');
                    input.setAttribute('directory', '');
                    input.setAttribute('mozdirectory', '');
                    input.setAttribute('msdirectory', '');
                    input.addEventListener('change', () => {
                        resolve(Array.from(input.files || []));
                    });
                    input.click();
                });

                if (!pickedFiles || pickedFiles.length === 0) {
                    return;
                }

                if (typeof loadSessions === 'function') {
                    try {
                        await loadSessions();
                    } catch (_) { }
                }

                let ok = 0;
                let fail = 0;
                for (let i = 0; i < pickedFiles.length; i++) {
                    const f = pickedFiles[i];
                    const rawRel = String(f.webkitRelativePath || f.name || '');
                    const relParts = normalizeFilePath(rawRel).split('/').filter(Boolean);
                    const relPath = relParts.length > 1 ? relParts.slice(1).join('/') : String(f.name || relParts[0] || '');
                    const targetPath = normalizeImportTargetPath(folderKey ? `${folderKey}/${relPath}` : relPath);
                    if (!targetPath) continue;

                    showGlobalLoading(`正在导入 ${i + 1}/${pickedFiles.length} ...`);

                    try {
                        if (isProbablyTextFile(f, targetPath)) {
                            const text = await f.text();
                            await callWriteFile({ targetPath, content: text, isBase64: false });
                        } else {
                            const buf = await f.arrayBuffer();
                            const b64 = arrayBufferToBase64(buf);
                            await callWriteFile({ targetPath, content: b64, isBase64: true });
                        }

                        ok++;
                        try {
                            const existingSession = findSessionByFilePath(targetPath);
                            await upsertSessionForFilePath({ filePath: targetPath, existingSession });
                        } catch (_) { }
                    } catch (e) {
                        fail++;
                        console.warn('[目录导入] 单文件导入失败:', targetPath, e?.message || e);
                    }
                }

                try {
                    if (typeof loadSessions === 'function') await loadSessions(true);
                    if (typeof loadFileTree === 'function') await loadFileTree();
                    if (typeof loadFiles === 'function') await loadFiles();
                } catch (_) { }

                if (fail === 0) {
                    showSuccessMessage(`导入完成：${ok} 个文件`);
                } else {
                    showSuccessMessage(`导入完成：成功 ${ok}，失败 ${fail}`);
                }
            } finally {
                try { if (__loadingShown) hideGlobalLoading(); } catch (_) { }
            }
        }, '目录导入');
    };

    const handleFolderExport = async (payload) => {
        return safeExecute(async () => {
            const folderKeyRaw = payload && (payload.folderKey || payload.key || payload.itemId);
            const folderKey = normalizeFilePath(folderKeyRaw || '');
            if (!folderKey) {
                throw createError('目录Key无效', ErrorTypes.VALIDATION, '目录导出');
            }

            const { showGlobalLoading, hideGlobalLoading } = await import('/src/utils/ui/loading.js');
            let __loadingShown = false;
            try {
                showGlobalLoading('正在收集目录文件...');
                __loadingShown = true;

                if (typeof loadFileTree === 'function') {
                    await loadFileTree();
                }

                const findFolderNode = (nodes, key) => {
                    const list = Array.isArray(nodes) ? nodes : [];
                    for (const n of list) {
                        if (!n) continue;
                        if (n.type === 'folder' && normalizeFilePath(n.key) === key) return n;
                        if (n.children) {
                            const found = findFolderNode(n.children, key);
                            if (found) return found;
                        }
                    }
                    return null;
                };

                const folderNode = findFolderNode(fileTree?.value, folderKey);
                if (!folderNode) {
                    throw createError('未找到目标目录', ErrorTypes.API, '目录导出');
                }

                const fileKeys = [];
                const collectFiles = (node) => {
                    if (!node) return;
                    if (node.type === 'file') {
                        const k = normalizeFilePath(node.key || node.path || '');
                        if (k) fileKeys.push(k);
                        return;
                    }
                    const children = Array.isArray(node.children) ? node.children : [];
                    children.forEach(ch => collectFiles(ch));
                };
                collectFiles(folderNode);

                if (fileKeys.length === 0) {
                    throw createError('目录下没有可导出的文件', ErrorTypes.VALIDATION, '目录导出');
                }

                const ensureJSZipLoaded = async () => {
                    if (window.JSZip && typeof window.JSZip === 'function') return window.JSZip;
                    return new Promise((resolve, reject) => {
                        const existing = document.querySelector('script[data-aicr-jszip="1"]');
                        if (existing) {
                            let attempts = 0;
                            const check = () => {
                                attempts++;
                                if (window.JSZip && typeof window.JSZip === 'function') return resolve(window.JSZip);
                                if (attempts > 200) return reject(new Error('JSZip 加载超时'));
                                setTimeout(check, 50);
                            };
                            check();
                            return;
                        }
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
                        script.async = true;
                        script.setAttribute('data-aicr-jszip', '1');
                        script.onload = () => resolve(window.JSZip);
                        script.onerror = () => reject(new Error('JSZip 加载失败'));
                        document.head.appendChild(script);
                    });
                };

                const JSZip = await ensureJSZipLoaded();
                if (!JSZip) {
                    throw createError('JSZip 加载失败', ErrorTypes.API, '目录导出');
                }
                const zip = new JSZip();

                const apiBase = getApiBaseUrl();
                if (!apiBase) {
                    throw createError('API地址未配置，无法导出', ErrorTypes.VALIDATION, '目录导出');
                }

                for (let i = 0; i < fileKeys.length; i++) {
                    const fileKey = fileKeys[i];
                    const rel = fileKey.startsWith(folderKey + '/') ? fileKey.slice(folderKey.length + 1) : extractFileName(fileKey);
                    const relPath = String(rel || '').replace(/^\/+/, '');
                    if (!relPath) continue;

                    showGlobalLoading(`正在读取 ${i + 1}/${fileKeys.length} ...`);

                    let cleanPath = normalizeFilePath(fileKey || '');
                    if (cleanPath.startsWith('static/')) cleanPath = cleanPath.slice(7);
                    cleanPath = normalizeFilePath(cleanPath);

                    try {
                        const res = await fetch(`${apiBase}/read-file`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ target_file: cleanPath })
                        });
                        if (!res.ok) throw new Error(`读取失败: ${res.status}`);
                        const json = await res.json().catch(() => ({}));
                        const ok = json && (json.code === 0 || json.code === 200);
                        const data = json?.data || {};
                        const content = data?.content;
                        const type = String(data?.type || '');
                        if (ok && typeof content === 'string') {
                            if (type === 'base64') {
                                zip.file(relPath, content, { base64: true });
                            } else {
                                zip.file(relPath, content);
                            }
                        } else {
                            zip.file(relPath, '');
                        }
                    } catch (e) {
                        console.warn('[目录导出] 读取失败，写入空文件:', fileKey, e?.message || e);
                        zip.file(relPath, '');
                    }
                }

                showGlobalLoading('正在生成压缩包...');
                const blob = await zip.generateAsync({ type: 'blob' });

                const folderName = String(folderKey.split('/').filter(Boolean).pop() || 'folder').replace(/\s+/g, '_');
                const dateStr = new Date().toISOString().slice(0, 10);
                const filename = `${folderName}_${dateStr}.zip`;

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                showSuccessMessage('导出完成');
            } finally {
                try { if (__loadingShown) hideGlobalLoading(); } catch (_) { }
            }
        }, '目录导出');
    };

    return {
        handleFolderImport,
        handleFolderExport
    };
};
