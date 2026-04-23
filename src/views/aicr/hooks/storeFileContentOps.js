export function createAicrStoreFileContentOps(deps, state, internals) {
    const { safeExecuteAsync, normalizeFilePath } = deps;

    const extractFilesFromTree = (nodes) => {
        const fileList = [];

        const traverse = (node) => {
            if (!node || typeof node !== 'object') return;

            if (node.type === 'file' || (node.type !== 'folder' && !node.children)) {
                const fileKey = node.key || node.path || '';
                const name = node.name || (fileKey ? fileKey.split('/').pop() : '');
                const path = node.path || fileKey;
                const content = node.content || '';
                const contentBase64 = node.contentBase64 || '';

                fileList.push({
                    key: fileKey,
                    path: path,
                    name: name,
                    content: content,
                    contentBase64: contentBase64,
                    type: 'file',
                    createdAt: node.createdAt || node.createdTime,
                    updatedAt: node.updatedAt || node.updatedTime,
                    sessionKey: node.sessionKey
                });
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

    const loadFiles = async (loadFileTree) => {
        return safeExecuteAsync(async () => {
            console.log('[loadFiles] 正在从文件树中提取文件数据...');

            if (!state.fileTree.value || state.fileTree.value.length === 0) {
                console.log('[loadFiles] 文件树未加载，先加载文件树...');
                await loadFileTree();
            }

            const fileList = extractFilesFromTree(state.fileTree.value);

            state.files.value = fileList;
            console.log(`[loadFiles] 成功从文件树中提取 ${fileList.length} 个代码文件`);

            return fileList;
        }, '代码文件数据加载', (errorInfo) => {
            state.error.value = errorInfo.message;
            state.errorMessage.value = errorInfo.message;
            state.files.value = [];
        });
    };

    const findFileByKey = (nodes, targetKey) => {
        const target = normalizeFilePath(targetKey);
        const traverse = (node) => {
            if (!node || typeof node !== 'object') return null;

            if (node.type === 'file' || (node.type !== 'folder' && !node.children)) {
                const nodeKey = normalizeFilePath(node.key);
                if (nodeKey && target && nodeKey === target) {
                    return node;
                }
            }

            if (node.children && Array.isArray(node.children)) {
                for (const child of node.children) {
                    const found = traverse(child);
                    if (found) return found;
                }
            }

            return null;
        };

        if (Array.isArray(nodes)) {
            for (const node of nodes) {
                const found = traverse(node);
                if (found) return found;
            }
        } else if (nodes) {
            return traverse(nodes);
        }

        return null;
    };

    const processFileItem = async (item) => {
        const data = (item && typeof item === 'object' && item.data && typeof item.data === 'object') ? item.data : {};

        // 检查是否是图片文件
        const isImageFile = (filename) => {
            if (!filename) return false;
            const n = String(filename).toLowerCase();
            const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'];
            for (const ext of imageExtensions) {
                if (n.endsWith(ext)) return true;
            }
            return false;
        };

        const pickFirstString = (...vals) => {
            for (const v of vals) {
                if (typeof v === 'string' && v) return v;
            }
            return '';
        };
        const toStringContent = (val) => {
            if (Array.isArray(val)) return val.map(v => (v == null ? '' : String(v))).join('\n');
            return (typeof val === 'string') ? val : '';
        };
        const tryKeysDeep = (obj, keys, depth = 0) => {
            if (!obj || typeof obj !== 'object' || depth > 3) return '';
            for (const k of keys) {
                if (k in obj) {
                    const v = obj[k];
                    const s = toStringContent(v);
                    if (s) return s;
                }
            }
            for (const k of Object.keys(obj)) {
                const v = obj[k];
                if (v && typeof v === 'object') {
                    const found = tryKeysDeep(v, keys, depth + 1);
                    if (found) return found;
                } else {
                    const s = toStringContent(v);
                    if (s && keys.includes(k)) return s;
                }
            }
            return '';
        };

        const key = item.key || (data && data.key);
        const path = item.path || data.path || key;
        const name = item.name || data.name || (typeof path === 'string' ? path.split('/').pop() : '');
        const isImage = isImageFile(name) || isImageFile(path);

        const commonKeys = ['content', 'code', 'text', 'source', 'lines', 'raw', 'body', 'value'];
        let content = '';
        let contentBase64 = '';

        // 对于图片文件，优先保留 base64 数据
        if (isImage) {
            const pickBase64 = (obj) => {
                if (!obj || typeof obj !== 'object') return '';
                const b64 = obj.contentBase64 || obj.base64 || obj.b64;
                return typeof b64 === 'string' ? b64 : '';
            };
            contentBase64 = pickBase64(item) || pickBase64(data);
            if (!contentBase64) {
                const findB64Deep = (obj, depth = 0) => {
                    if (!obj || typeof obj !== 'object' || depth > 3) return '';
                    const direct = pickBase64(obj);
                    if (direct) return direct;
                    for (const k of Object.keys(obj)) {
                        const v = obj[k];
                        if (v && typeof v === 'object') {
                            const found = findB64Deep(v, depth + 1);
                            if (found) return found;
                        }
                    }
                    return '';
                };
                contentBase64 = findB64Deep(item) || findB64Deep(data);
            }
            // 如果没有 base64，再尝试获取普通 content
            if (!contentBase64) {
                content = toStringContent(item?.content) || toStringContent(data?.content) || '';
            }
        } else {
            // 非图片文件，按原有逻辑处理
            content = toStringContent(item?.content) || toStringContent(item?.code) || toStringContent(item?.text) || toStringContent(item?.source) || toStringContent(item?.lines) || pickFirstString(item?.raw, item?.body, item?.value);
            if (!content) {
                content = toStringContent(data?.content) || toStringContent(data?.code) || toStringContent(data?.text) || toStringContent(data?.source) || toStringContent(data?.lines) || pickFirstString(data?.raw, data?.body, data?.value);
            }
            if (!content) {
                content = tryKeysDeep(item, commonKeys) || tryKeysDeep(data, commonKeys);
            }
            if (!content) {
                const pickBase64 = (obj) => {
                    if (!obj || typeof obj !== 'object') return '';
                    const b64 = obj.contentBase64 || obj.base64 || obj.b64;
                    return typeof b64 === 'string' ? b64 : '';
                };
                let b64 = pickBase64(item) || pickBase64(data);
                if (!b64) {
                    const findB64Deep = (obj, depth = 0) => {
                        if (!obj || typeof obj !== 'object' || depth > 3) return '';
                        const direct = pickBase64(obj);
                        if (direct) return direct;
                        for (const k of Object.keys(obj)) {
                            const v = obj[k];
                            if (v && typeof v === 'object') {
                                const found = findB64Deep(v, depth + 1);
                                if (found) return found;
                            }
                        }
                        return '';
                    };
                    b64 = findB64Deep(item) || findB64Deep(data);
                }
                if (b64) {
                    try { content = atob(b64); } catch (e) { content = ''; }
                }
            }
        }

        const normalized = {
            ...item,
            key: key,
            path,
            name,
            content,
            contentBase64
        };

        if (!Array.isArray(state.files.value)) state.files.value = [];
        const remaining = state.files.value.filter(f => f.key !== key);
        remaining.push(normalized);
        state.files.value = remaining;

        return normalized;
    };

    const loadFileByKey = async (loadFileTree, targetKey = null) => {
        return safeExecuteAsync(async () => {
            const key = targetKey || state.selectedKey.value;
            if (!key) return null;

            if (internals.pendingFileRequests.has(key)) {
                console.log('[loadFileByKey] 复用正在进行的请求:', key);
                return await internals.pendingFileRequests.get(key);
            }

            const loadTask = async () => {
                console.log('[loadFileByKey] 尝试从文件树中查找文件:', key);

                if (!state.fileTree.value || state.fileTree.value.length === 0) {
                    console.log('[loadFileByKey] 文件树未加载，先加载文件树...');
                    await loadFileTree();
                }

                let foundNode = findFileByKey(state.fileTree.value, key);

                if (!foundNode && state.files.value && state.files.value.length > 0) {
                    console.log('[loadFileByKey] 在文件树中未找到，尝试从文件列表中查找');
                    foundNode = state.files.value.find(f => f.key === key);
                }

                if (!foundNode) {
                    console.warn('[loadFileByKey] 未找到文件:', key);
                    return null;
                }

                console.log('[loadFileByKey] 找到文件:', foundNode.name || foundNode.key);

                const processed = await processFileItem(foundNode);

                const cachedStatic = Array.isArray(state.files.value)
                    ? state.files.value.find(f => {
                        if (!f) return false;
                        return (
                            (processed.key && f.key === processed.key) ||
                            (processed.path && f.path === processed.path)
                        );
                    })
                    : null;
                if (cachedStatic?.__fromStatic &&
                    ((typeof cachedStatic.content === 'string' && cachedStatic.content) ||
                     (typeof cachedStatic.contentBase64 === 'string' && cachedStatic.contentBase64))) {
                    console.log('[loadFileByKey] 使用已缓存的内容:', key);
                    return cachedStatic;
                }

                if (processed.path || processed.key) {
                    try {
                        const path = processed.path || processed.key;
                        const cleanPath = normalizeToWriteTargetFile(path);

                        console.log('[loadFileByKey] 尝试通过API加载内容:', cleanPath);

                        const apiBase = (window.API_URL && /^https?:\/\//i.test(window.API_URL))
                            ? String(window.API_URL).replace(/\/+$/, '')
                            : '';

                        if (apiBase) {
                            const res = await fetch(`${apiBase}/read-file`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    target_file: cleanPath
                                })
                            });

                            if (res.ok) {
                                const json = await res.json();
                                console.log('[loadFileByKey] API响应:', json);
                                if ((json.code === 200 || json.code === 0) && json.data && json.data.content) {
                                    const content = json.data.content;
                                    console.log('[loadFileByKey] 数据类型:', json.data.type, '内容长度:', content.length);

                                    if (json.data.type === 'base64') {
                                        processed.contentBase64 = content;
                                        processed.content = ''; // 确保内容和base64不同时存在
                                        console.log('[loadFileByKey] 设置为base64内容，contentBase64长度:', processed.contentBase64.length);
                                    } else if (json.data.type === 'url') {
                                        // 对于 URL 类型，直接将 URL 存储在 content 中
                                        processed.content = content;
                                        processed.contentBase64 = '';
                                        console.log('[loadFileByKey] 设置为图片URL，content:', processed.content);
                                    } else {
                                        processed.content = content;
                                        processed.contentBase64 = ''; // 确保内容和base64不同时存在
                                        console.log('[loadFileByKey] 设置为文本内容，content长度:', processed.content.length);
                                    }

                                    processed.__fromStatic = true;
                                    console.log('[loadFileByKey] API加载成功, processed对象:', {
                                        name: processed.name,
                                        hasContentBase64: !!processed.contentBase64,
                                        contentBase64Len: processed.contentBase64 ? processed.contentBase64.length : 0,
                                        hasContent: !!processed.content,
                                        contentLen: processed.content ? processed.content.length : 0
                                    });

                                    if (Array.isArray(state.files.value)) {
                                        // 使用更宽松的匹配条件来找到对应的文件
                                        let idx = state.files.value.findIndex(f => {
                                            if (!f) return false;
                                            // 检查多个可能匹配的字段
                                            const isMatch =
                                                (processed.key && (f.key === processed.key || f.key === processed.path)) ||
                                                (processed.path && (f.path === processed.path || f.path === processed.key)) ||
                                                (processed.name && f.name === processed.name) ||
                                                (processed.path && String(f.path || '').includes(processed.path));

                                            console.log('[loadFileByKey] 检查文件匹配:', {
                                                processedKey: processed.key,
                                                processedPath: processed.path,
                                                processedName: processed.name,
                                                fileKey: f.key,
                                                filePath: f.path,
                                                fileName: f.name,
                                                isMatch
                                            });

                                            return isMatch;
                                        });

                                        if (idx >= 0) {
                                            console.log('[loadFileByKey] 更新现有文件内容:', idx, processed.name, processed.content ? processed.content.length : 'empty');
                                            console.log('[loadFileByKey] 更新前文件 contentBase64:', state.files.value[idx].contentBase64 ? state.files.value[idx].contentBase64.substring(0, 50) + '...' : 'empty');
                                            console.log('[loadFileByKey] processed.contentBase64:', processed.contentBase64 ? processed.contentBase64.substring(0, 50) + '...' : 'empty');
                                            state.files.value[idx] = { ...state.files.value[idx], ...processed };
                                            console.log('[loadFileByKey] 更新后文件 contentBase64:', state.files.value[idx].contentBase64 ? state.files.value[idx].contentBase64.substring(0, 50) + '...' : 'empty');
                                        } else {
                                            console.log('[loadFileByKey] 添加新文件到数组:', processed.name, processed.content ? processed.content.length : 'empty');
                                            state.files.value.push(processed);
                                        }
                                        // 强制更新响应式数组
                                        state.files.value = [...state.files.value];
                                        console.log('[loadFileByKey] 文件数组更新后长度:', state.files.value.length);
                                        // 验证文件是否正确保存
                                        if (idx >= 0) {
                                            const savedFile = state.files.value[idx];
                                            console.log('[loadFileByKey] 验证保存的文件:', {
                                                name: savedFile.name,
                                                hasContentBase64: !!savedFile.contentBase64,
                                                contentBase64Len: savedFile.contentBase64?.length || 0,
                                                hasContent: !!savedFile.content,
                                                contentLen: savedFile.content?.length || 0
                                            });
                                        }
                                    }
                                } else {
                                    console.warn('[loadFileByKey] API返回错误:', json.message || '无内容');
                                }
                            } else {
                                console.warn('[loadFileByKey] API请求失败:', res.status, res.statusText);
                            }
                        }
                    } catch (e) {
                        console.warn('[loadFileByKey] API加载出错:', e);
                    }
                }

                // 调试信息：输出返回的processed对象的内容
                if (processed.content) {
                    console.log('[loadFileByKey] 返回的processed对象内容长度:', processed.content.length);
                } else if (processed.contentBase64) {
                    console.log('[loadFileByKey] 返回的processed对象内容为base64，长度:', processed.contentBase64.length);
                } else {
                    console.warn('[loadFileByKey] 返回的processed对象内容为空');
                }

                return processed;
            };

            const promise = loadTask();
            internals.pendingFileRequests.set(key, promise);

            try {
                return await promise;
            } finally {
                internals.pendingFileRequests.delete(key);
            }
        }, '按需加载单个文件');
    };

    const normalizeKey = (key) => {
        return normalizeFilePath(key);
    };

    const setSelectedKey = (key) => {
        if (key === null) {
            state.selectedKey.value = null;
            return;
        }
        state.selectedKey.value = normalizeKey(key);
    };

    const normalizeToWriteTargetFile = (rawPath) => {
        let cleanPath = normalizeFilePath(String(rawPath || '').trim());
        // 移除开头的斜杠
        cleanPath = cleanPath.replace(/^\/+/, '');
        return cleanPath;
    };

    const readFileContent = async (rawPath) => {
        return safeExecuteAsync(async () => {
            const raw = String(rawPath || '').trim();
            if (!raw) throw new Error('文件路径无效，无法读取');

            const apiBase = (window.API_URL && /^https?:\/\//i.test(window.API_URL))
                ? String(window.API_URL).replace(/\/+$/, '')
                : '';
            if (!apiBase) throw new Error('API地址未配置，无法读取');

            const targetFile = normalizeToWriteTargetFile(raw);
            if (!targetFile) throw new Error('文件路径无效，无法读取');

            const res = await fetch(`${apiBase}/read-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_file: targetFile })
            });

            if (!res.ok) {
                throw new Error(`读取失败: ${res.status} ${res.statusText}`);
            }

            const json = await res.json().catch(() => ({}));
            if (!json || (json.code !== 200 && json.code !== 0) || !json.data) {
                throw new Error(json?.message || '读取失败');
            }

            const type = (json.data.type === 'base64' || json.data.type === 'url') ? json.data.type : 'text';
            const content = typeof json.data.content === 'string' ? json.data.content : '';
            return { type, content };
        }, '读取文件内容');
    };

    const updateCachedFileContent = (rawPath, content) => {
        const target = normalizeFilePath(String(rawPath || '').trim());
        if (!target) return;

        const nextContent = String(content == null ? '' : content);
        if (!Array.isArray(state.files.value)) state.files.value = [];

        const list = state.files.value.slice();
        let updated = false;

        for (let i = 0; i < list.length; i++) {
            const it = list[i];
            if (!it) continue;
            const candidates = [it.path, it.treeKey, it.key, it.name]
                .filter(Boolean)
                .map((v) => normalizeFilePath(v));
            if (candidates.includes(target)) {
                list[i] = { ...it, content: nextContent, contentBase64: '', __fromStatic: true };
                updated = true;
                break;
            }
        }

        if (!updated) {
            list.push({
                key: target,
                path: target,
                name: target.split('/').pop() || target,
                content: nextContent,
                type: 'file',
                __fromStatic: true
            });
        }

        state.files.value = list;
    };

    const saveFileContent = async (rawPath, content, options = {}) => {
        return safeExecuteAsync(async () => {
            const { isBase64 = false } = options || {};
            const raw = String(rawPath || '').trim();
            if (!raw) throw new Error('文件路径无效，无法保存');

            const apiBase = (window.API_URL && /^https?:\/\//i.test(window.API_URL))
                ? String(window.API_URL).replace(/\/+$/, '')
                : '';
            if (!apiBase) throw new Error('API地址未配置，无法保存');

            const targetFile = normalizeToWriteTargetFile(raw);
            if (!targetFile) throw new Error('文件路径无效，无法保存');

            const res = await fetch(`${apiBase}/write-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target_file: targetFile,
                    content: String(content == null ? '' : content),
                    is_base64: !!isBase64
                })
            });

            if (!res.ok) {
                throw new Error(`保存失败: ${res.status} ${res.statusText}`);
            }

            let ok = true;
            try {
                const json = await res.json();
                if (json && typeof json.code !== 'undefined') {
                    ok = (json.code === 200 || json.code === 0);
                }
                if (json && json.success === false) ok = false;
            } catch (_) { }

            if (!ok) throw new Error('保存失败');

            if (!isBase64) {
                updateCachedFileContent(raw, String(content == null ? '' : content));
            }
            return { success: true };
        }, '保存文件内容');
    };

    return {
        loadFiles,
        loadFileByKey,
        normalizeKey,
        setSelectedKey,
        readFileContent,
        saveFileContent
    };
}
