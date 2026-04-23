import { safeExecute, createError, ErrorTypes } from '/cdn/utils/core/error.js';
import { normalizeFilePath } from '../../utils/fileFieldNormalizer.js';
import { formatFileSizeCompact, sortFileTreeItems } from './fileTreeUtils.js';

const createFileTreeNode = () => {
    return {
        name: 'FileTreeNode',
        props: {
            item: {
                type: Object,
                required: true
            },
            selectedKey: {
                type: [String, null],
                default: null
            },
            expandedFolders: {
                type: Set,
                default: () => new Set()
            },
            batchMode: {
                type: Boolean,
                default: false
            },
            selectedKeys: {
                type: [Set, Array],
                default: () => new Set()
            },
            searchQuery: {
                type: String,
                default: ''
            }
        },
        data() {
            return {
                _lastClickTime: null,
                longPressTimer: null,
                longPressStartTime: null,
                longPressStartPosition: null,
                isDeleting: false,
                longPressCompleted: false
            };
        },
        emits: ['file-select', 'folder-toggle', 'create-folder', 'create-file', 'rename-item', 'delete-item', 'create-session', 'batch-select-file', 'folder-import', 'file-import', 'folder-export'],
        methods: {
            sortFileTreeItems(items) {
                return sortFileTreeItems(items);
            },
            toggleFolder(key) {
                return safeExecute(() => {
                    if (this.longPressCompleted) {
                        return;
                    }

                    if (!key || typeof key !== 'string') {
                        throw createError('文件夹Key无效', ErrorTypes.VALIDATION, '文件夹切换');
                    }

                    this.$emit('folder-toggle', key);
                }, '文件夹切换处理');
            },
            createSubFolder(event, parentKey) {
                return safeExecute(() => {
                    event && event.stopPropagation && event.stopPropagation();
                    if (!parentKey || typeof parentKey !== 'string') {
                        throw createError('父级目录Key无效', ErrorTypes.VALIDATION, '新建文件夹');
                    }
                    this.$emit('create-folder', { parentKey });
                }, '新建子文件夹');
            },
            createSubFile(event, parentKey) {
                return safeExecute(() => {
                    event && event.stopPropagation && event.stopPropagation();
                    if (!parentKey || typeof parentKey !== 'string') {
                        throw createError('父级目录Key无效', ErrorTypes.VALIDATION, '新建文件');
                    }
                    this.$emit('create-file', { parentKey });
                }, '新建子文件');
            },
            renameItem(event, item) {
                return safeExecute(() => {
                    event && event.stopPropagation && event.stopPropagation();
                    const key = item && item.key;
                    const name = item && item.name;
                    if (!key || typeof key !== 'string') {
                        throw createError('目标Key无效', ErrorTypes.VALIDATION, '重命名');
                    }
                    this.$emit('rename-item', { key, name });
                }, '重命名');
            },
            deleteItem(event, key) {
                return safeExecute(() => {
                    event && event.stopPropagation && event.stopPropagation();
                    if (!key || typeof key !== 'string') {
                        throw createError('目标Key无效', ErrorTypes.VALIDATION, '删除');
                    }
                    this.$emit('delete-item', { key });
                }, '删除');
            },
            importFolder(event, folderKey) {
                return safeExecute(() => {
                    event && event.stopPropagation && event.stopPropagation();
                    if (!folderKey || typeof folderKey !== 'string') {
                        throw createError('文件夹Key无效', ErrorTypes.VALIDATION, '导入目录');
                    }
                    this.$emit('folder-import', { folderKey });
                }, '导入目录');
            },
            importFile(event, folderKey) {
                return safeExecute(() => {
                    event && event.stopPropagation && event.stopPropagation();
                    if (!folderKey || typeof folderKey !== 'string') {
                        throw createError('文件夹Key无效', ErrorTypes.VALIDATION, '导入文件');
                    }
                    this.$emit('file-import', { folderKey });
                }, '导入文件');
            },
            exportFolder(event, folderKey) {
                return safeExecute(() => {
                    event && event.stopPropagation && event.stopPropagation();
                    if (!folderKey || typeof folderKey !== 'string') {
                        throw createError('文件夹Key无效', ErrorTypes.VALIDATION, '导出');
                    }
                    this.$emit('folder-export', { folderKey });
                }, '导出');
            },
            startLongPress(item, event) {
                return safeExecute(() => {
                    if (event) {
                        event.preventDefault();
                        event.stopPropagation();
                    }

                    if (this.isDeleting) {
                        return;
                    }

                    const target = event.target;
                    const isInteractiveElement = target.closest('button, a, [role="button"]');

                    if (isInteractiveElement) {
                        return;
                    }

                    if (!item || !item.key) {
                        console.warn('[长按删除] item参数为空或缺少key');
                        return;
                    }

                    this.longPressStartTime = Date.now();
                    this.longPressStartPosition = {
                        x: event.clientX || event.touches?.[0]?.clientX || 0,
                        y: event.clientY || event.touches?.[0]?.clientY || 0
                    };

                    this.longPressTimer = setTimeout(() => {
                        this.handleLongPressComplete(item, event);
                    }, 800);
                }, '开始长按计时');
            },
            cancelLongPress() {
                if (this.longPressTimer) {
                    clearTimeout(this.longPressTimer);
                    this.longPressTimer = null;
                }
                if (this.longPressStartTime && Date.now() - this.longPressStartTime > 800) {
                    this.longPressCompleted = true;
                    setTimeout(() => {
                        this.longPressCompleted = false;
                    }, 100);
                }
                this.longPressStartTime = null;
                this.longPressStartPosition = null;
            },
            handleLongPressComplete(item, event) {
                return safeExecute(() => {
                    this.longPressCompleted = true;

                    if (this.longPressTimer) {
                        clearTimeout(this.longPressTimer);
                        this.longPressTimer = null;
                    }

                    if (this.isDeleting) {
                        this.longPressCompleted = false;
                        return;
                    }

                    if (event && this.longPressStartPosition) {
                        const currentX = event.clientX || event.changedTouches?.[0]?.clientX || 0;
                        const currentY = event.clientY || event.changedTouches?.[0]?.clientY || 0;
                        const deltaX = Math.abs(currentX - this.longPressStartPosition.x);
                        const deltaY = Math.abs(currentY - this.longPressStartPosition.y);

                        if (deltaX > 10 || deltaY > 10) {
                            this.longPressCompleted = false;
                            return;
                        }
                    }

                    const itemName = item.name || item.key;
                    const itemType = item.type === 'folder' ? '文件夹' : '文件';
                    if (confirm(`确定删除${itemType} "${itemName}" 及其子项？此操作不可撤销。`)) {
                        this.isDeleting = true;
                        this.deleteItem(event, item.key);
                        setTimeout(() => {
                            this.isDeleting = false;
                            this.longPressCompleted = false;
                        }, 1000);
                    } else {
                        setTimeout(() => {
                            this.longPressCompleted = false;
                        }, 100);
                    }
                }, '长按完成处理');
            },
            createSession(event, item) {
                return safeExecute(() => {
                    event && event.stopPropagation && event.stopPropagation();
                    if (!item || !item.key) {
                        throw createError('文件信息无效', ErrorTypes.VALIDATION, '创建会话');
                    }
                    const payload = {
                        key: item.key,
                        name: item.name,
                        path: item.path,
                        originalItem: item
                    };
                    this.$emit('create-session', payload);
                }, '创建会话');
            },
            isFolderExpanded(key) {
                return safeExecute(() => {
                    return this.expandedFolders && this.expandedFolders.has(key);
                }, '文件夹展开状态检查');
            },
            selectFile(key) {
                return safeExecute(() => {
                    if (this.longPressCompleted) {
                        return;
                    }

                    if (key == null) {
                        throw createError('文件Key无效', ErrorTypes.VALIDATION, '文件选择');
                    }
                    const keyStr = String(key);

                    if (this.batchMode) {
                        this.$emit('batch-select-file', keyStr);
                        return;
                    }

                    if (this._lastClickTime && Date.now() - this._lastClickTime < 300) {
                        return;
                    }

                    this._lastClickTime = Date.now();

                    const payload = {
                        key: keyStr,
                        path: (this.item && this.item.path) || keyStr,
                        name: (this.item && this.item.name) || (keyStr.split('/').pop()),
                        originalItem: this.item,
                        type: this.item?.type || 'file',
                        size: this.item?.size,
                        modified: this.item?.modified
                    };

                    this.$emit('file-select', payload);
                }, '文件选择处理');
            },
            isFileSelected(key) {
                return safeExecute(() => {
                    if (this.batchMode && this.selectedKeys) {
                        const normalizedKey = normalizeFilePath(key);
                        for (const sk of this.selectedKeys) {
                            if (normalizeFilePath(sk) === normalizedKey) {
                                return true;
                            }
                        }
                        return false;
                    }

                    if (!key || !this.selectedKey) return false;
                    return normalizeFilePath(key) === normalizeFilePath(this.selectedKey);
                }, '文件选中状态检查');
            },
            getFileIcon(item) {
                return safeExecute(() => {
                    if (item.type === 'folder') {
                        return this.isFolderExpanded(item.key) ? '📂' : '📁';
                    }

                    const fileNameSource = (item && typeof item.name === 'string' && item.name)
                        ? item.name
                        : (typeof item.path === 'string' && item.path
                            ? item.path.split('/').pop()
                            : (typeof item.key === 'string'
                                ? item.key.split('/').pop()
                                : ''));
                    const ext = fileNameSource && fileNameSource.includes('.')
                        ? fileNameSource.split('.').pop().toLowerCase()
                        : '';
                    const iconMap = {
                        'js': '📄',
                        'ts': '📘',
                        'vue': '💚',
                        'css': '🎨',
                        'html': '🌐',
                        'json': '📋',
                        'md': '📝',
                        'txt': '📄',
                        'py': '🐍'
                    };

                    return iconMap[ext] || '📄';
                }, '文件图标获取');
            },
            getFileSizeDisplay(item) {
                return safeExecute(() => {
                    if (item.type === 'folder' || !item.size) return '';
                    return formatFileSizeCompact(item.size);
                }, '文件大小计算');
            },
            isLargeFile(item) {
                return safeExecute(() => {
                    if (item.type === 'folder' || !item.size) return false;
                    // 大于 1MB 的文件视为大文件
                    return item.size > 1024 * 1024;
                }, '大文件检查');
            },
            getFileModifiedTime(item) {
                return safeExecute(() => {
                    if (!item.modified) return '';

                    const date = new Date(item.modified);
                    return date.toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }, '文件修改时间格式化');
            },
            toggleTag(tag) {
                return safeExecute(() => {
                    this.$emit('tag-select', tag);
                }, '切换标签选择');
            },
            toggleReverse() {
                this.$emit('tag-filter-reverse');
            },
            toggleNoTags() {
                this.$emit('tag-filter-no-tags');
            },
            toggleExpand() {
                this.$emit('tag-filter-expand');
            },
            updateTagSearch(keyword) {
                this.$emit('tag-filter-search', keyword);
            },
            clearAllFilters() {
                this.$emit('tag-clear');
            },
            saveTagOrder(order) {
                try {
                    localStorage.setItem('aicr_file_tag_order', JSON.stringify(order));
                    this.$forceUpdate();
                } catch (e) {
                    console.warn('[FileTree] 保存标签顺序失败:', e);
                }
            },
            handleDragStart(e, tag) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', tag);
                e.currentTarget.classList.add('dragging');

                const dragImage = e.currentTarget.cloneNode(true);
                dragImage.style.opacity = '0.8';
                dragImage.style.transform = 'rotate(3deg)';
                dragImage.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
                dragImage.style.position = 'absolute';
                dragImage.style.top = '-1000px';
                document.body.appendChild(dragImage);
                e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);

                setTimeout(() => {
                    if (dragImage.parentNode) {
                        dragImage.parentNode.removeChild(dragImage);
                    }
                }, 0);
            },
            handleDragEnd(e) {
                e.currentTarget.classList.remove('dragging');

                document.querySelectorAll('.tag-item').forEach(item => {
                    item.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-hover');
                });
            },
            handleDragOver(e) {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';

                if (e.currentTarget.classList.contains('dragging')) {
                    return;
                }

                const rect = e.currentTarget.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;

                document.querySelectorAll('.tag-item').forEach(item => {
                    if (!item.classList.contains('dragging')) {
                        item.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-hover');
                    }
                });

                if (e.clientY < midY) {
                    e.currentTarget.classList.add('drag-over-top');
                    e.currentTarget.classList.remove('drag-over-bottom');
                } else {
                    e.currentTarget.classList.add('drag-over-bottom');
                    e.currentTarget.classList.remove('drag-over-top');
                }

                e.currentTarget.classList.add('drag-hover');
            },
            handleDragLeave(e) {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX;
                const y = e.clientY;

                if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                    e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-hover');
                }
            },
            handleDrop(e, targetTag) {
                e.preventDefault();
                e.stopPropagation();

                const draggedTag = e.dataTransfer.getData('text/plain');

                if (draggedTag === targetTag) {
                    return;
                }

                const currentOrder = this.allTags;
                const draggedIndex = currentOrder.indexOf(draggedTag);
                const targetIndex = currentOrder.indexOf(targetTag);

                if (draggedIndex === -1 || targetIndex === -1) {
                    return;
                }

                const rect = e.currentTarget.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                let insertIndex = targetIndex;
                if (e.clientY < midY) {
                    insertIndex = targetIndex;
                } else {
                    insertIndex = targetIndex + 1;
                }

                const newOrder = [...currentOrder];
                newOrder.splice(draggedIndex, 1);
                if (insertIndex > draggedIndex) {
                    insertIndex--;
                }
                newOrder.splice(insertIndex, 0, draggedTag);

                this.saveTagOrder(newOrder);

                e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-hover');
            },
            highlightSearchMatch(text) {
                if (!this.searchQuery || !text) return text;

                const query = String(this.searchQuery).trim().toLowerCase();
                if (!query) return text;

                const textStr = String(text);
                const textLower = textStr.toLowerCase();
                const index = textLower.indexOf(query);

                if (index === -1) return textStr;

                const before = textStr.substring(0, index);
                const match = textStr.substring(index, index + query.length);
                const after = textStr.substring(index + query.length);

                return `${this.escapeHtml(before)}<mark class="search-highlight">${this.escapeHtml(match)}</mark>${this.escapeHtml(after)}`;
            },
            escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            },
        },
        template: `
            <li 
                class="file-tree-node"
                role="treeitem"
                :aria-expanded="item.type === 'folder' ? isFolderExpanded(item.key) : undefined"
            >
                <!-- 文件夹 -->
                <div 
                    v-if="item.type === 'folder'"
                    :class="['file-tree-item', 'folder-item', { 
                        expanded: isFolderExpanded(item.key)
                    }]"
                    @click="toggleFolder(item.key)"
                    @mousedown="startLongPress(item, $event)"
                    @mouseup="cancelLongPress"
                    @mouseleave="cancelLongPress"
                    @touchstart="startLongPress(item, $event)"
                    @touchend="cancelLongPress"
                    @touchcancel="cancelLongPress"
                    :title="\`文件夹: \${item.name}\`"
                    tabindex="0"
                    @keydown.enter="toggleFolder(item.key)"
                    @keydown.space="toggleFolder(item.key)"
                >
                    <span class="file-icon" aria-hidden="true" @click.stop="toggleFolder(item.key)">{{ getFileIcon(item) }}</span>
                    <span class="file-name" v-html="highlightSearchMatch(item.name)"></span>
                    <span v-if="item.children" class="folder-count">({{ item.children.length }})</span>
                    <span class="file-actions" @click.stop>
                        <button :title="'在 ' + item.name + ' 下新建文件夹'" @click="createSubFolder($event, item.key)"><i class="fas fa-folder-plus"></i></button>
                        <button :title="'在 ' + item.name + ' 下新建文件'" @click="createSubFile($event, item.key)"><i class="fas fa-file"></i></button>
                        <button :title="'导入文件到 ' + item.name" @click="importFile($event, item.key)"><i class="fas fa-file-upload"></i></button>
                        <button :title="'导入目录到 ' + item.name" @click="importFolder($event, item.key)"><i class="fas fa-folder-open"></i></button>
                        <button :title="'导出 ' + item.name" @click="exportFolder($event, item.key)"><i class="fas fa-download"></i></button>
                        <button :title="'重命名 ' + item.name" @click="renameItem($event, item)"><i class="fas fa-i-cursor"></i></button>
                    </span>
                </div>
                
                <!-- 文件 -->
                <div
                    v-else
                    :data-key="item.key"
                    :data-file-key="item.key"
                    :data-session-key="item.sessionKey"
                    :class="['file-tree-item', 'file-item', {
                        selected: isFileSelected(item.key),
                        'batch-selected': batchMode && isFileSelected(item.key),
                        'large-file': isLargeFile(item)
                    }]"
                    @click="selectFile(item.key)"
                    @mousedown="startLongPress(item, $event)"
                    @mouseup="cancelLongPress"
                    @mouseleave="cancelLongPress"
                    @touchstart="startLongPress(item, $event)"
                    @touchend="cancelLongPress"
                    @touchcancel="cancelLongPress"
                    :title="\`文件: \${item.name}\${isLargeFile(item) ? ' (大文件)' : ''}\`"
                    tabindex="0"
                    @keydown.enter="selectFile(item.key)"
                    @keydown.space="selectFile(item.key)"
                >
                    <span class="file-icon" aria-hidden="true" @click.stop="selectFile(item.key)">{{ getFileIcon(item) }}</span>
                    <span class="file-name" v-html="highlightSearchMatch(item.name)"></span>
                    <span v-if="getFileSizeDisplay(item)" class="file-size" :class="{ 'large-file-size': isLargeFile(item) }">{{ getFileSizeDisplay(item) }}</span>
                    <span v-if="isLargeFile(item)" class="file-warning-badge" title="大文件，加载可能较慢">
                        <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
                    </span>
                    <span class="file-actions" @click.stop>
                        <button type="button" :title="'重命名 ' + item.name" @click="renameItem($event, item)"><i class="fas fa-i-cursor"></i></button>
                    </span>
                </div>
                
                <!-- 递归渲染子节点 -->
                <ul 
                    v-if="item.type === 'folder' && item.children && isFolderExpanded(item.key)"
                    class="file-tree-children"
                    role="group"
                >
                    <template v-for="child in sortFileTreeItems(item.children)" :key="child.key">
                        <file-tree-node
                            :item="child"
                            :selected-key="selectedKey"
                            :expanded-folders="expandedFolders"
                            :batch-mode="batchMode"
                            :selected-keys="selectedKeys"
                            :search-query="searchQuery"
                            @file-select="$emit('file-select', $event)"
                             @folder-toggle="$emit('folder-toggle', $event)"
                             @create-folder="$emit('create-folder', $event)"
                             @create-file="$emit('create-file', $event)"
                             @rename-item="$emit('rename-item', $event)"
                             @delete-item="$emit('delete-item', $event)"
                             @create-session="$emit('create-session', $event)"
                             @batch-select-file="$emit('batch-select-file', $event)"
                             @folder-import="$emit('folder-import', $event)"
                             @file-import="$emit('file-import', $event)"
                             @folder-export="$emit('folder-export', $event)"
                        ></file-tree-node>
                    </template>
                </ul>
            </li>
        `
    };
};

export { createFileTreeNode };
