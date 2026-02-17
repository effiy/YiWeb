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

                fileList.push({
                    key: fileKey,
                    path: path,
                    name: name,
                    content: content,
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

        const commonKeys = ['content', 'code', 'text', 'source', 'lines', 'raw', 'body', 'value'];
        let content = '';
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

        const normalized = {
            ...item,
            key: key,
            path,
            name,
            content
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
                            (processed.path && f.path === processed.path) ||
                            (processed.name && f.name === processed.name)
                        );
                    })
                    : null;
                if (cachedStatic?.__fromStatic && typeof cachedStatic.content === 'string' && cachedStatic.content) {
                    console.log('[loadFileByKey] 使用已缓存的内容:', key);
                    return cachedStatic;
                }

                if (processed.path || processed.key) {
                    try {
                        const path = processed.path || processed.key;
                        let cleanPath = normalizeFilePath(path || '');

                        if (cleanPath.startsWith('static/')) {
                            cleanPath = cleanPath.substring(7);
                        }
                        cleanPath = normalizeFilePath(cleanPath);

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
                                if ((json.code === 200 || json.code === 0) && json.data && json.data.content) {
                                    const content = json.data.content;

                                    if (json.data.type === 'base64') {
                                        processed.contentBase64 = content;
                                    } else {
                                        processed.content = content;
                                    }

                                    processed.__fromStatic = true;
                                    console.log('[loadFileByKey] API加载成功, 长度:', content.length);

                                    if (Array.isArray(state.files.value)) {
                                        const idx = state.files.value.findIndex(f => {
                                            if (!f) return false;
                                            return (
                                                (processed.key && f.key === processed.key) ||
                                                (processed.path && f.path === processed.path) ||
                                                (processed.name && f.name === processed.name)
                                            );
                                        });
                                        if (idx >= 0) {
                                            state.files.value[idx] = { ...state.files.value[idx], ...processed };
                                        } else {
                                            state.files.value.push(processed);
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

    return {
        loadFiles,
        loadFileByKey,
        normalizeKey,
        setSelectedKey
    };
}
