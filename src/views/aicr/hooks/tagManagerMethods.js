import { postData, batchOperations } from '/src/services/index.js';
import { SERVICE_MODULE } from '/src/services/helper/requestHelper.js';
import { getFileDeleteService, buildFileTreeFromSessions } from './store.js';

function getTagManagerStore(modal, store) {
    return store || modal?._store || window.aicrStore || (window.app && window.app._instance && window.app._instance.setupState);
}

function findSessionBySessionKey(store, sessionKey) {
    const normalizedSessionKey = sessionKey == null ? '' : String(sessionKey);
    const sessions = store?.sessions?.value || [];
    return sessions.find(s => {
        if (!s) return false;
        const key = s.key == null ? '' : String(s.key);
        return key === normalizedSessionKey;
    });
}

export async function openTagManager(sessionKey, session, store) {
    if (!sessionKey || !session) {
        console.warn('会话不存在，无法管理标签:', sessionKey);
        return;
    }

    const currentTags = [...(session.tags || [])];

    ensureTagManagerUi();
    const modal = document.querySelector('#aicr-tag-manager');
    if (!modal) {
        console.error('标签管理弹窗未找到');
        return;
    }

    modal._store = store;
    modal._currentTags = currentTags;

    modal.style.display = 'flex';
    modal.dataset.sessionKey = sessionKey;

    loadTagsIntoManager(sessionKey, currentTags, modal);

    const closeBtn = modal.querySelector('.tag-manager-close');
    if (closeBtn) {
        closeBtn.onclick = () => closeTagManager(sessionKey, store);
    }

    const saveBtn = modal.querySelector('.tag-manager-save');
    if (saveBtn) {
        saveBtn.onclick = () => saveTags(sessionKey, store);
    }

    const tagInput = modal.querySelector('.tag-manager-input');
    if (tagInput) {
        if (tagInput._isComposing === undefined) {
            tagInput._isComposing = false;
            tagInput.addEventListener('compositionstart', () => {
                tagInput._isComposing = true;
            });
            tagInput.addEventListener('compositionend', () => {
                tagInput._isComposing = false;
            });
        }

        tagInput.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !tagInput._isComposing) {
                e.preventDefault();
                addTagFromInput(sessionKey, store);
            }
        };
    }

    updateQuickTagButtons(modal, currentTags);

    setTimeout(() => {
        const input = modal.querySelector('.tag-manager-input');
        if (input) input.focus();
    }, 0);

    const escHandler = (e) => {
        if (e.key === 'Escape') {
            const store = getTagManagerStore(modal);
            closeTagManager(sessionKey, store);
        }
    };
    document.addEventListener('keydown', escHandler);
    modal._escHandler = escHandler;
}

function ensureTagManagerUi() {
    if (document.querySelector('#aicr-tag-manager')) {
        return;
    }

    const tagManagerHtml = `
        <div id="aicr-tag-manager" class="tag-manager-modal" style="display:none;">
            <div class="tag-manager-content">
                <div class="tag-manager-header">
                    <h3>标签管理</h3>
                    <button class="tag-manager-close" title="关闭">×</button>
                </div>
                <div class="tag-manager-body">
                    <div class="tag-manager-input-group">
                        <input type="text" class="tag-manager-input" placeholder="输入标签，回车添加..." />
                        <button class="tag-manager-add" title="添加标签">+</button>
                    </div>
                    <div class="tag-manager-quick-tags">
                        <div class="quick-tags-header">
                            <span>快捷标签</span>
                            <button class="quick-tags-refresh" title="刷新快捷标签">↻</button>
                        </div>
                        <div class="quick-tags-list"></div>
                    </div>
                    <div class="tag-manager-tags"></div>
                </div>
                <div class="tag-manager-footer">
                    <button class="tag-manager-save">保存</button>
                    <button class="tag-manager-cancel">取消</button>
                </div>
            </div>
        </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = tagManagerHtml;
    document.body.appendChild(wrapper.firstElementChild);

    const modal = document.querySelector('#aicr-tag-manager');
    if (!modal) return;

    const addBtn = modal.querySelector('.tag-manager-add');
    if (addBtn) {
        addBtn.onclick = () => {
            const sessionKey = modal.dataset.sessionKey;
            const store = getTagManagerStore(modal);
            addTagFromInput(sessionKey, store);
        };
    }

    const cancelBtn = modal.querySelector('.tag-manager-cancel');
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            const sessionKey = modal.dataset.sessionKey;
            const store = getTagManagerStore(modal);
            closeTagManager(sessionKey, store);
        };
    }

    const refreshBtn = modal.querySelector('.quick-tags-refresh');
    if (refreshBtn) {
        refreshBtn.onclick = () => refreshQuickTags(modal);
    }

    const style = document.createElement('style');
    style.textContent = `
        .tag-manager-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease;
        }
        .tag-manager-content {
            background: #fff;
            border-radius: 12px;
            width: 480px;
            max-width: 90%;
            max-height: 80%;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }
        .tag-manager-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid #eee;
        }
        .tag-manager-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }
        .tag-manager-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        }
        .tag-manager-close:hover {
            background: #f5f5f5;
            color: #333;
        }
        .tag-manager-body {
            padding: 20px;
            overflow-y: auto;
            flex: 1;
        }
        .tag-manager-input-group {
            display: flex;
            gap: 10px;
            margin-bottom: 16px;
        }
        .tag-manager-input {
            flex: 1;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
        }
        .tag-manager-input:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .tag-manager-add {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            background: #6366f1;
            color: white;
            border: none;
            font-size: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .tag-manager-add:hover {
            background: #4f46e5;
        }
        .tag-manager-quick-tags {
            margin-bottom: 16px;
            padding: 12px;
            background: #f9fafb;
            border-radius: 8px;
            border: 1px solid #eee;
        }
        .quick-tags-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 13px;
            color: #666;
            font-weight: 500;
        }
        .quick-tags-refresh {
            background: none;
            border: none;
            cursor: pointer;
            color: #666;
            font-size: 14px;
            padding: 2px 6px;
            border-radius: 4px;
        }
        .quick-tags-refresh:hover {
            background: #eee;
            color: #333;
        }
        .quick-tags-list {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .quick-tag-btn {
            padding: 4px 10px;
            border-radius: 14px;
            background: #fff;
            border: 1px solid #ddd;
            font-size: 12px;
            cursor: pointer;
            color: #555;
            transition: all 0.2s ease;
        }
        .quick-tag-btn:hover {
            background: #f3f4f6;
            border-color: #ccc;
        }
        .quick-tag-btn.active {
            background: #6366f1;
            border-color: #6366f1;
            color: white;
        }
        .tag-manager-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .tag-item {
            display: inline-flex;
            align-items: center;
            padding: 6px 12px;
            border-radius: 16px;
            background: #f3f4f6;
            color: #374151;
            font-size: 13px;
            gap: 6px;
        }
        .tag-item .tag-remove {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.1);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: #666;
            padding: 0;
        }
        .tag-item .tag-remove:hover {
            background: rgba(0, 0, 0, 0.2);
            color: #333;
        }
        .tag-manager-footer {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            padding: 16px 20px;
            border-top: 1px solid #eee;
        }
        .tag-manager-save {
            padding: 8px 16px;
            background: #6366f1;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }
        .tag-manager-save:hover {
            background: #4f46e5;
        }
        .tag-manager-cancel {
            padding: 8px 16px;
            background: #fff;
            color: #374151;
            border: 1px solid #ddd;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }
        .tag-manager-cancel:hover {
            background: #f9fafb;
            border-color: #ccc;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

function addTagFromInput(sessionKey, store) {
    const modal = document.querySelector('#aicr-tag-manager');
    if (!modal) return;

    const input = modal.querySelector('.tag-manager-input');
    if (!input) return;

    const tag = input.value.trim();
    if (!tag) return;

    const tags = modal._currentTags || [];
    if (tags.includes(tag)) {
        input.value = '';
        return;
    }

    tags.push(tag);
    modal._currentTags = tags;

    loadTagsIntoManager(sessionKey, tags, modal);
    updateQuickTagButtons(modal, tags);

    input.value = '';
    input.focus();
}

function loadTagOrder() {
    try {
        const stored = localStorage.getItem('aicr_tag_order');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {
        console.warn('[标签管理] 加载标签顺序失败:', e);
    }
    return [];
}

function saveTagOrder(order) {
    try {
        localStorage.setItem('aicr_tag_order', JSON.stringify(order || []));
    } catch (_) { }
}

function refreshQuickTags(modal) {
    if (!modal) return;
    const store = getTagManagerStore(modal);
    const sessionKey = modal.dataset.sessionKey;
    const session = findSessionBySessionKey(store, sessionKey);
    if (!session) return;
    const currentTags = modal._currentTags || [];
    loadTagsIntoManager(sessionKey, currentTags, modal);
    updateQuickTagButtons(modal, currentTags);
}

function loadTagsIntoManager(sessionKey, tags, modal) {
    if (!modal) return;
    const tagsContainer = modal.querySelector('.tag-manager-tags');
    if (!tagsContainer) return;

    tagsContainer.innerHTML = '';

    const safeTags = Array.isArray(tags) ? tags : [];
    safeTags.forEach(tag => {
        const tagItem = document.createElement('div');
        tagItem.className = 'tag-item';
        tagItem.textContent = tag;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'tag-remove';
        removeBtn.textContent = '×';
        removeBtn.title = '删除标签';
        removeBtn.onclick = () => {
            removeTag(sessionKey, tag, modal);
        };

        tagItem.appendChild(removeBtn);
        tagsContainer.appendChild(tagItem);
    });

    const allTags = getAllTagsFromSessions(getTagManagerStore(modal));
    const quickTagsList = modal.querySelector('.quick-tags-list');
    if (quickTagsList) {
        quickTagsList.innerHTML = '';
        const order = loadTagOrder();
        const orderedTags = sortTagsByOrder(allTags, order);
        orderedTags.forEach(tag => {
            const btn = document.createElement('button');
            btn.className = 'quick-tag-btn';
            btn.textContent = tag;
            if (safeTags.includes(tag)) btn.classList.add('active');
            btn.onclick = () => toggleQuickTag(sessionKey, tag, modal);
            quickTagsList.appendChild(btn);
        });
    }
}

function updateQuickTagButtons(modal, currentTags) {
    if (!modal) return;
    const list = modal.querySelector('.quick-tags-list');
    if (!list) return;
    const buttons = list.querySelectorAll('.quick-tag-btn');
    buttons.forEach(btn => {
        const tag = btn.textContent;
        if (!tag) return;
        if (currentTags.includes(tag)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function toggleQuickTag(sessionKey, tag, modal) {
    if (!modal) return;
    const tags = modal._currentTags || [];
    const idx = tags.indexOf(tag);
    if (idx >= 0) {
        tags.splice(idx, 1);
    } else {
        tags.push(tag);
    }
    modal._currentTags = tags;
    loadTagsIntoManager(sessionKey, tags, modal);
    updateQuickTagButtons(modal, tags);
}

function removeTag(sessionKey, tag, modal) {
    if (!modal) return;
    const tags = modal._currentTags || [];
    const idx = tags.indexOf(tag);
    if (idx >= 0) tags.splice(idx, 1);
    modal._currentTags = tags;
    loadTagsIntoManager(sessionKey, tags, modal);
    updateQuickTagButtons(modal, tags);
}

function getAllTagsFromSessions(store) {
    const sessions = store?.sessions?.value || [];
    const set = new Set();
    sessions.forEach(s => {
        const tags = Array.isArray(s?.tags) ? s.tags : [];
        tags.forEach(t => {
            const tag = String(t || '').trim();
            if (tag) set.add(tag);
        });
    });
    return Array.from(set);
}

function sortTagsByOrder(tags, order) {
    const orderMap = new Map();
    (Array.isArray(order) ? order : []).forEach((t, idx) => orderMap.set(t, idx));
    return [...(Array.isArray(tags) ? tags : [])].sort((a, b) => {
        const ia = orderMap.has(a) ? orderMap.get(a) : 9999;
        const ib = orderMap.has(b) ? orderMap.get(b) : 9999;
        if (ia !== ib) return ia - ib;
        return String(a).localeCompare(String(b), 'zh-CN');
    });
}

async function saveTags(sessionKey, store) {
    if (!sessionKey) {
        console.warn('会话不存在，无法保存标签:', sessionKey);
        return;
    }

    let sessionRef = null;
    let previousTags = null;

    try {
        const modalEl = document.querySelector('#aicr-tag-manager');
        store = getTagManagerStore(modalEl, store);
        const session = findSessionBySessionKey(store, sessionKey);
        if (!session) {
            throw new Error('会话不存在');
        }
        sessionRef = session;
        previousTags = Array.isArray(session.tags) ? [...session.tags] : [];

        if (store.loadSessions && (!store.sessions?.value || store.sessions.value.length === 0)) {
            await store.loadSessions(false);
        }

        let oldPath = null;
        let fileNode = null;

        const findNode = (nodes) => {
            if (!nodes) return null;
            if (Array.isArray(nodes)) {
                for (const node of nodes) {
                    const res = findNode(node);
                    if (res) return res;
                }
            } else {
                if (nodes.sessionKey === sessionKey) return nodes;
                if (nodes.children) return findNode(nodes.children);
            }
            return null;
        };

        if (store.fileTree && store.fileTree.value) {
            fileNode = findNode(store.fileTree.value);
            if (fileNode) {
                oldPath = fileNode.key;
            }
        }

        if (!fileNode && store.loadFileTree) {
            await store.loadFileTree();
            if (store.fileTree && store.fileTree.value) {
                fileNode = findNode(store.fileTree.value);
                if (fileNode) {
                    oldPath = fileNode.key;
                }
            }
        }

        let newTags = [];
        if (modalEl && modalEl._currentTags) {
            newTags = [...modalEl._currentTags];
        } else if (session.tags) {
            newTags = [...session.tags];
        }

        const normalizedTags = newTags
            .map(tag => tag ? tag.trim() : '')
            .filter(tag => tag.length > 0);
        const uniqueTags = [...new Set(normalizedTags)];

        const sessionsList = store.sessions?.value || [];

        const oldSessionKey = String(session.key || sessionKey || '');
        const { sessionPathMap: oldMap } = buildFileTreeFromSessions(sessionsList);

        const draftSessions = sessionsList.map(s => (s === session ? { ...s, tags: uniqueTags } : s));
        const { sessionPathMap: newMap } = buildFileTreeFromSessions(draftSessions);

        const safeToken = (value) => {
            const str = String(value ?? '');
            return str.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48) || 'x';
        };

        const buildTmpPath = (path, token) => {
            const parts = String(path || '').split('/');
            const fileName = parts.pop() || '';
            const dir = parts.join('/');
            const tmpName = `${fileName}.__tmp__${safeToken(token)}__${Date.now()}`;
            return dir ? `${dir}/${tmpName}` : tmpName;
        };

        const fileDeleteService = getFileDeleteService();
        const renamePlans = [];

        for (const s of sessionsList) {
            if (!s) continue;
            const sessionKey = String(s.key || '');
            if (!sessionKey) continue;

            const oldPathByRule = oldMap.get(sessionKey) || null;
            const newPathByRule = newMap.get(sessionKey) || null;
            if (!oldPathByRule || !newPathByRule) continue;
            if (oldPathByRule === newPathByRule) continue;

            const candidates = [String(oldPathByRule)];
            if (sessionKey === oldSessionKey) {
                if (oldPath) candidates.unshift(String(oldPath));
            }
            const uniqueCandidates = Array.from(new Set(candidates)).filter(Boolean);

            renamePlans.push({
                sessionKey,
                candidates: uniqueCandidates,
                oldPath: String(oldPathByRule),
                newPath: String(newPathByRule),
                tmpPath: buildTmpPath(oldPathByRule, sessionKey)
            });
        }

        if (!newMap.get(oldSessionKey)) {
            throw new Error('无法计算新路径，已取消保存以保持结构一致');
        }

        const staged = [];
        const moved = [];
        try {
            for (const plan of renamePlans) {
                let actualOldPath = null;
                for (const candidate of plan.candidates) {
                    const res = await fileDeleteService.renameFile(candidate, plan.tmpPath);
                    if (res.success) {
                        actualOldPath = candidate;
                        break;
                    }
                }
                if (!actualOldPath) {
                    throw new Error(`静态文件移动失败，已取消保存以保持结构一致: ${plan.oldPath} -> ${plan.newPath}`);
                }
                staged.push({ ...plan, actualOldPath });
            }

            for (const plan of staged) {
                const res = await fileDeleteService.renameFile(plan.tmpPath, plan.newPath);
                if (!res.success) {
                    throw new Error(`静态文件移动失败，已取消保存以保持结构一致: ${plan.actualOldPath} -> ${plan.newPath}`);
                }
                moved.push(plan);
            }
        } catch (e) {
            try {
                for (let i = moved.length - 1; i >= 0; i--) {
                    const plan = moved[i];
                    await fileDeleteService.renameFile(plan.newPath, plan.actualOldPath);
                }
                for (let i = staged.length - 1; i >= 0; i--) {
                    const plan = staged[i];
                    const wasMoved = moved.some(m => m.sessionKey === plan.sessionKey);
                    if (wasMoved) continue;
                    await fileDeleteService.renameFile(plan.tmpPath, plan.actualOldPath);
                }
            } catch (_) { }
            throw e;
        }

        session.tags = uniqueTags;
        session.updatedAt = Date.now();

        const payload = {
            module_name: SERVICE_MODULE,
            method_name: 'update_document',
            parameters: {
                cname: 'sessions',
                key: sessionKey,
                data: {
                    key: sessionKey,
                    tags: session.tags,
                    updatedAt: Date.now()
                }
            }
        };
        await postData(`${window.API_URL}/`, payload);

        if (store.sessions && store.sessions.value) {
            store.sessions.value = [...store.sessions.value];
        }

        if (store.loadFileTree) {
            await store.loadFileTree();
        }

        closeTagManager(sessionKey, store);

        if (window.showSuccess) {
            window.showSuccess('标签已保存');
        }
        console.log('标签已保存:', session.tags);
    } catch (error) {
        console.error('保存标签失败:', error);
        try {
            if (sessionRef && Array.isArray(previousTags)) {
                sessionRef.tags = previousTags;
            }
            if (store && store.loadFileTree) {
                await store.loadFileTree();
            }
        } catch (_) { }
        if (window.showError) {
            window.showError('保存标签失败，请重试');
        }
    }
}

export async function closeTagManager(sessionKey, store) {
    const modal = document.querySelector('#aicr-tag-manager');
    if (modal) {
        if (modal._currentTags) {
            delete modal._currentTags;
        }

        if (modal._escHandler) {
            document.removeEventListener('keydown', modal._escHandler);
            delete modal._escHandler;
        }

        modal.style.display = 'none';

        const tagInput = modal.querySelector('.tag-manager-input');
        if (tagInput) {
            tagInput.value = '';
        }
    }
}

