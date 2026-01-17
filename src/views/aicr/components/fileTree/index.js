// 文件树组件 - 负责文件目录树的展示和交互
// 作者：liangliang

import { safeExecute, createError, ErrorTypes } from '/src/utils/error.js';
import { defineComponent } from '/src/utils/componentLoader.js';

// 统一的文件大小格式化（截断不进位，避免边界显示进位）
function formatFileSizeCompact(bytes) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    let idx = 0;
    let val = n;
    while (val >= k && idx < units.length - 1) {
        val = val / k;
        idx++;
    }
    const decimals = idx === 0 ? 0 : 1;
    const factor = Math.pow(10, decimals);
    // 截断而非四舍五入，避免如 1023.99KB -> 1024.0KB 的进位
    const truncated = Math.floor(val * factor) / factor;
    return decimals === 0 ? `${truncated}${units[idx]}` : `${truncated.toFixed(decimals)}${units[idx]}`;
}



// 文件树排序函数
const sortFileTreeItems = (items) => {
    if (!Array.isArray(items)) return items;

    return items.sort((a, b) => {
        // 首先按类型排序：文件夹在前，文件在后
        if (a.type === 'folder' && b.type !== 'folder') {
            return -1;
        }
        if (a.type !== 'folder' && b.type === 'folder') {
            return 1;
        }

        // 同类型按名称排序（不区分大小写）
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB, 'zh-CN');
    });
};

// 递归排序文件树
const sortFileTreeRecursively = (node) => {
    if (!node || typeof node !== 'object') return node;

    // 如果有子节点，递归排序
    if (node.type === 'folder' && Array.isArray(node.children)) {
        node.children = sortFileTreeItems(node.children);
        node.children.forEach(child => sortFileTreeRecursively(child));
    }

    return node;
};

// 创建递归节点组件
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
            comments: {
                type: Array,
                default: () => []
            },
            batchMode: {
                type: Boolean,
                default: false
            },
            selectedKeys: {
                type: [Set, Array],
                default: () => new Set()
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
        computed: {
            // 排序后的文件树数据
            sortedTree() {
                if (!Array.isArray(this.tree)) return [];
                return this.tree.map(item => sortFileTreeRecursively(item));
            }
        },
        emits: ['file-select', 'folder-toggle', 'create-folder', 'create-file', 'rename-item', 'delete-item', 'create-session', 'batch-select-file', 'copy-as-prompt'],
        methods: {
            // 排序函数，供模板使用
            sortFileTreeItems(items) {
                return sortFileTreeItems(items);
            },
            // 切换文件夹展开状态
            toggleFolder(key) {
                return safeExecute(() => {
                    // 如果长按已完成，不触发点击事件
                    if (this.longPressCompleted) {
                        return;
                    }

                    if (!key || typeof key !== 'string') {
                        throw createError('文件夹Key无效', ErrorTypes.VALIDATION, '文件夹切换');
                    }

                    this.$emit('folder-toggle', key);
                }, '文件夹切换处理');
            },
            // 新建子文件夹
            createSubFolder(event, parentKey) {
                return safeExecute(() => {
                    event && event.stopPropagation && event.stopPropagation();
                    if (!parentKey || typeof parentKey !== 'string') {
                        throw createError('父级目录Key无效', ErrorTypes.VALIDATION, '新建文件夹');
                    }
                    this.$emit('create-folder', { parentKey });
                }, '新建子文件夹');
            },
            // 新建子文件
            createSubFile(event, parentKey) {
                return safeExecute(() => {
                    event && event.stopPropagation && event.stopPropagation();
                    if (!parentKey || typeof parentKey !== 'string') {
                        throw createError('父级目录Key无效', ErrorTypes.VALIDATION, '新建文件');
                    }
                    this.$emit('create-file', { parentKey });
                }, '新建子文件');
            },
            // 重命名
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
            // 删除
            deleteItem(event, key) {
                return safeExecute(() => {
                    event && event.stopPropagation && event.stopPropagation();
                    if (!key || typeof key !== 'string') {
                        throw createError('目标Key无效', ErrorTypes.VALIDATION, '删除');
                    }
                    this.$emit('delete-item', { key });
                }, '删除');
            },

            // 开始长按计时
            startLongPress(item, event) {
                return safeExecute(() => {
                    // 阻止事件冒泡，避免触发其他点击事件
                    if (event) {
                        event.preventDefault();
                        event.stopPropagation();
                    }

                    // 检查是否正在删除中
                    if (this.isDeleting) {
                        return;
                    }

                    // 检查是否点击在可交互元素上
                    const target = event.target;
                    const isInteractiveElement = target.closest('button, a, [role="button"]');

                    if (isInteractiveElement) {
                        return;
                    }

                    // 检查item是否存在
                    if (!item || !item.key) {
                        console.warn('[长按删除] item参数为空或缺少key');
                        return;
                    }

                    // 记录长按开始时间和位置
                    this.longPressStartTime = Date.now();
                    this.longPressStartPosition = {
                        x: event.clientX || event.touches?.[0]?.clientX || 0,
                        y: event.clientY || event.touches?.[0]?.clientY || 0
                    };

                    // 设置长按定时器（800ms）
                    this.longPressTimer = setTimeout(() => {
                        this.handleLongPressComplete(item, event);
                    }, 800);
                }, '开始长按计时');
            },

            // 取消长按
            cancelLongPress() {
                if (this.longPressTimer) {
                    clearTimeout(this.longPressTimer);
                    this.longPressTimer = null;
                }
                // 如果长按已完成，标记为已完成，防止触发点击事件
                if (this.longPressStartTime && Date.now() - this.longPressStartTime > 800) {
                    this.longPressCompleted = true;
                    // 延迟重置，确保点击事件不会触发
                    setTimeout(() => {
                        this.longPressCompleted = false;
                    }, 100);
                }
                this.longPressStartTime = null;
                this.longPressStartPosition = null;
            },

            // 长按完成处理
            handleLongPressComplete(item, event) {
                return safeExecute(() => {
                    // 标记长按已完成
                    this.longPressCompleted = true;

                    // 清除定时器
                    if (this.longPressTimer) {
                        clearTimeout(this.longPressTimer);
                        this.longPressTimer = null;
                    }

                    // 检查是否正在删除中
                    if (this.isDeleting) {
                        this.longPressCompleted = false;
                        return;
                    }

                    // 检查移动距离（如果移动超过10px，取消删除）
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

                    // 显示确认对话框
                    const itemName = item.name || item.key;
                    const itemType = item.type === 'folder' ? '文件夹' : '文件';
                    if (confirm(`确定删除${itemType} "${itemName}" 及其子项？此操作不可撤销。`)) {
                        this.isDeleting = true;
                        this.deleteItem(event, item.key);
                        // 延迟重置删除状态
                        setTimeout(() => {
                            this.isDeleting = false;
                            this.longPressCompleted = false;
                        }, 1000);
                    } else {
                        // 用户取消删除，重置标志
                        setTimeout(() => {
                            this.longPressCompleted = false;
                        }, 100);
                    }
                }, '长按完成处理');
            },

            // 创建会话
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

            // 复制为 Prompt
            copyAsPrompt(event, item) {
                return safeExecute(() => {
                    event && event.stopPropagation && event.stopPropagation();
                    if (!item || !item.key) {
                        throw createError('文件信息无效', ErrorTypes.VALIDATION, '复制为Prompt');
                    }
                    const payload = {
                        key: item.key,
                        name: item.name,
                        path: item.path,
                        type: item.type,
                        originalItem: item
                    };
                    this.$emit('copy-as-prompt', payload);
                }, '复制为Prompt');
            },

            // 检查文件夹是否展开
            isFolderExpanded(key) {
                return safeExecute(() => {
                    return this.expandedFolders && this.expandedFolders.has(key);
                }, '文件夹展开状态检查');
            },

            // 选择文件
            selectFile(key) {
                return safeExecute(() => {
                    // 如果长按已完成，不触发点击事件
                    if (this.longPressCompleted) {
                        return;
                    }

                    if (key == null) {
                        throw createError('文件Key无效', ErrorTypes.VALIDATION, '文件选择');
                    }
                    const keyStr = String(key);

                    // 批量选择模式：切换选中状态
                    if (this.batchMode) {
                        this.$emit('batch-select-file', keyStr);
                        return;
                    }

                    // 添加防抖机制，避免快速连续点击
                    if (this._lastClickTime && Date.now() - this._lastClickTime < 300) {
                        return;
                    }

                    this._lastClickTime = Date.now();

                    // 构建统一的文件标识符payload，确保与后端数据结构一致
                    const payload = {
                        // 唯一标识符
                        key: keyStr,
                        path: (this.item && this.item.path) || keyStr,
                        name: (this.item && this.item.name) || (keyStr.split('/').pop()),
                        // 保留原始item对象
                        originalItem: this.item,
                        // 文件类型
                        type: this.item?.type || 'file',
                        // 文件大小和修改时间
                        size: this.item?.size,
                        modified: this.item?.modified
                    };

                    this.$emit('file-select', payload);
                }, '文件选择处理');
            },

            // 检查文件是否被选中
            isFileSelected(key) {
                return safeExecute(() => {
                    // 批量选择模式：检查是否在选中列表中
                    if (this.batchMode && this.selectedKeys) {
                        const normalize = (v) => {
                            if (!v) return '';
                            let s = String(v).replace(/\\/g, '/');
                            s = s.replace(/^\.\//, '');
                            s = s.replace(/^\/+/, '');
                            s = s.replace(/\/\/+/g, '/');
                            return s;
                        };
                        const normalizedKey = normalize(key);
                        // 检查 Set 中是否包含该文件Key
                        for (const sk of this.selectedKeys) {
                            if (normalize(sk) === normalizedKey) {
                                return true;
                            }
                        }
                        return false;
                    }

                    // 普通模式：检查是否与当前选中文件匹配
                    if (!key || !this.selectedKey) return false;

                    // 规范化文件Key进行比较
                    const normalize = (v) => {
                        if (!v) return '';
                        let s = String(v).replace(/\\/g, '/');
                        s = s.replace(/^\.\//, '');
                        s = s.replace(/^\/+/, '');
                        s = s.replace(/\/\/+/g, '/');
                        return s;
                    };

                    const normalizedKey = normalize(key);
                    const normalizedSelectedKey = normalize(this.selectedKey);
                    const result = normalizedKey === normalizedSelectedKey;

                    return result;
                }, '文件选中状态检查');
            },

            // 获取文件图标
            getFileIcon(item) {
                return safeExecute(() => {
                    if (item.type === 'folder') {
                        return this.isFolderExpanded(item.key) ? '📂' : '📁';
                    }

                    // 根据文件扩展名返回不同图标（兼容缺失 name 的情况）
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

            // 获取文件大小显示
            getFileSizeDisplay(item) {
                return safeExecute(() => {
                    if (item.type === 'folder' || !item.size) return '';
                    return formatFileSizeCompact(item.size);
                }, '文件大小计算');
            },

            // 获取文件修改时间
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

            // 获取文件的评论数量
            getCommentCount(key) {
                return safeExecute(() => {
                    if (!this.comments || !key) return 0;

                    // 使用统一的文件标识符匹配逻辑
                    const normalize = (v) => {
                        if (!v) return '';
                        let s = String(v).replace(/\\/g, '/');
                        s = s.replace(/^\.\//, '');
                        s = s.replace(/^\/+/, '');
                        s = s.replace(/\/\/+/g, '/');
                        return s;
                    };

                    const target = normalize(key);

                    const count = this.comments.filter(comment => {
                        // 兼容不同的文件标识方式，优先使用 key
                        const commentKey = comment.key || (comment.fileInfo && comment.fileInfo.key);
                        const normalizedCommentKey = normalize(commentKey);
                        return normalizedCommentKey === target;
                    }).length;

                    return count;
                }, '文件评论数量计算');
            },

            // 获取文件夹的评论数量（递归计算所有子文件的评论）
            getFolderCommentCount(folder) {
                return safeExecute(() => {
                    if (!folder || folder.type !== 'folder' || !folder.children) return 0;

                    let totalCount = 0;

                    const calculateCount = (items) => {
                        if (!Array.isArray(items)) {
                            // 如果是单个节点，直接处理
                            if (items.type === 'file') {
                                totalCount += this.getCommentCount(items.key);
                            } else if (items.type === 'folder' && items.children) {
                                calculateCount(items.children);
                            }
                            return;
                        }

                        items.forEach(item => {
                            if (item.type === 'file') {
                                totalCount += this.getCommentCount(item.key);
                            } else if (item.type === 'folder' && item.children) {
                                calculateCount(item.children);
                            }
                        });
                    };

                    calculateCount(folder.children);
                    return totalCount;
                }, '文件夹评论数量计算');
            },

            // 切换标签选择
            toggleTag(tag) {
                return safeExecute(() => {
                    this.$emit('tag-select', tag);
                }, '切换标签选择');
            },

            // 切换反向过滤
            toggleReverse() {
                this.$emit('tag-filter-reverse');
            },

            // 切换无标签筛选
            toggleNoTags() {
                this.$emit('tag-filter-no-tags');
            },

            // 切换展开/折叠
            toggleExpand() {
                this.$emit('tag-filter-expand');
            },

            // 更新标签搜索关键词
            updateTagSearch(keyword) {
                this.$emit('tag-filter-search', keyword);
            },

            // 清除所有过滤条件
            clearAllFilters() {
                this.$emit('tag-clear');
            },

            // 保存标签顺序
            saveTagOrder(order) {
                try {
                    localStorage.setItem('aicr_file_tag_order', JSON.stringify(order));
                    // 强制更新 allTags
                    this.$forceUpdate();
                } catch (e) {
                    console.warn('[FileTree] 保存标签顺序失败:', e);
                }
            },

            // 拖拽开始
            handleDragStart(e, tag) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', tag);
                e.currentTarget.classList.add('dragging');

                // 设置自定义拖拽图像
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

            // 拖拽结束
            handleDragEnd(e) {
                e.currentTarget.classList.remove('dragging');

                // 移除所有拖拽相关的样式
                document.querySelectorAll('.tag-item').forEach(item => {
                    item.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-hover');
                });
            },

            // 拖拽经过
            handleDragOver(e) {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';

                if (e.currentTarget.classList.contains('dragging')) {
                    return;
                }

                const rect = e.currentTarget.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;

                // 移除所有拖拽指示样式
                document.querySelectorAll('.tag-item').forEach(item => {
                    if (!item.classList.contains('dragging')) {
                        item.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-hover');
                    }
                });

                // 根据鼠标位置显示插入位置指示
                if (e.clientY < midY) {
                    e.currentTarget.classList.add('drag-over-top');
                    e.currentTarget.classList.remove('drag-over-bottom');
                } else {
                    e.currentTarget.classList.add('drag-over-bottom');
                    e.currentTarget.classList.remove('drag-over-top');
                }

                e.currentTarget.classList.add('drag-hover');
            },

            // 拖拽离开
            handleDragLeave(e) {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX;
                const y = e.clientY;

                if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                    e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-hover');
                }
            },

            // 放置
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

                // 计算新的插入位置
                const rect = e.currentTarget.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                let insertIndex = targetIndex;
                if (e.clientY < midY) {
                    insertIndex = targetIndex;
                } else {
                    insertIndex = targetIndex + 1;
                }

                // 调整顺序
                const newOrder = [...currentOrder];
                // 先移除拖拽的元素
                newOrder.splice(draggedIndex, 1);
                // 如果插入位置在移除元素之后，索引需要减1
                if (insertIndex > draggedIndex) {
                    insertIndex--;
                }
                // 插入元素
                newOrder.splice(insertIndex, 0, draggedTag);

                // 保存新顺序
                this.saveTagOrder(newOrder);

                // 清除样式
                e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-hover');
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
                    <span class="file-name">{{ item.name }}</span>
                    <span v-if="item.children" class="folder-count">({{ item.children.length }})</span>
                    <span class="file-actions" @click.stop>
                        <button :title="'在 ' + item.name + ' 下新建文件夹'" @click="createSubFolder($event, item.key)"><i class="fas fa-folder-plus"></i></button>
                        <button :title="'在 ' + item.name + ' 下新建文件'" @click="createSubFile($event, item.key)"><i class="fas fa-file"></i></button>
                        <button :title="'重命名 ' + item.name" @click="renameItem($event, item)"><i class="fas fa-i-cursor"></i></button>
                        <button :title="'复制 ' + item.name + ' 为 Prompt'" @click="copyAsPrompt($event, item)"><i class="fas fa-clipboard"></i></button>
                    </span>
                </div>
                
                <!-- 文件 -->
                <div 
                    v-else
                    :class="['file-tree-item', 'file-item', { 
                        selected: isFileSelected(item.key),
                        'batch-selected': batchMode && isFileSelected(item.key)
                    }]"
                    @click="selectFile(item.key)"
                    @mousedown="startLongPress(item, $event)"
                    @mouseup="cancelLongPress"
                    @mouseleave="cancelLongPress"
                    @touchstart="startLongPress(item, $event)"
                    @touchend="cancelLongPress"
                    @touchcancel="cancelLongPress"
                    :title="\`文件: \${item.name}\`"
                    tabindex="0"
                    @keydown.enter="selectFile(item.key)"
                    @keydown.space="selectFile(item.key)"
                >
                    <span class="file-icon" aria-hidden="true" @click.stop="selectFile(item.key)">{{ getFileIcon(item) }}</span>
                    <span class="file-name">{{ item.name }}</span>
                    <span v-if="getFileSizeDisplay(item)" class="file-size">{{ getFileSizeDisplay(item) }}</span>
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
                            :comments="comments"
                            :batch-mode="batchMode"
                            :selected-keys="selectedKeys"
                            @file-select="$emit('file-select', $event)"
                             @folder-toggle="$emit('folder-toggle', $event)"
                             @create-folder="$emit('create-folder', $event)"
                             @create-file="$emit('create-file', $event)"
                             @rename-item="$emit('rename-item', $event)"
                             @delete-item="$emit('delete-item', $event)"
                             @create-session="$emit('create-session', $event)"
                             @batch-select-file="$emit('batch-select-file', $event)"
                             @copy-as-prompt="$emit('copy-as-prompt', $event)"
                        ></file-tree-node>
                    </template>
                </ul>
            </li>
        `
    };
};

// 创建组件定义
const componentOptions = {
    name: 'FileTree',
    css: '/src/views/aicr/components/fileTree/index.css',
    html: '/src/views/aicr/components/fileTree/index.html',
    components: {
        'file-tree-node': createFileTreeNode()
    },
    props: {
        tree: {
            type: Array,
            default: () => []
        },
        selectedKey: {
            type: [String, null],
            default: null
        },
        expandedFolders: {
            type: Set,
            default: () => new Set()
        },
        loading: {
            type: Boolean,
            default: false
        },
        error: {
            type: String,
            default: ''
        },
        comments: {
            type: Array,
            default: () => []
        },
        collapsed: {
            type: Boolean,
            default: false
        },
        searchQuery: {
            type: String,
            default: ''
        },
        batchMode: {
            type: Boolean,
            default: false
        },
        selectedKeys: {
            type: [Set, Array],
            default: () => new Set()
        },
        viewMode: {
            type: String,
            default: 'tree',
            validator: (value) => ['tree', 'tags'].includes(value)
        },
        selectedTags: {
            type: Array,
            default: () => []
        },
        tagFilterReverse: {
            type: Boolean,
            default: false
        },
        tagFilterNoTags: {
            type: Boolean,
            default: false
        },
        tagFilterExpanded: {
            type: Boolean,
            default: false
        },
        tagFilterSearchKeyword: {
            type: String,
            default: ''
        },
        tagFilterVisibleCount: {
            type: Number,
            default: 8
        }
    },
    computed: {
        // 提取所有标签（文件夹）
        allTags() {
            if (!Array.isArray(this.tree)) return [];

            const tags = new Set();
            const traverse = (items) => {
                if (!Array.isArray(items)) return;
                for (const item of items) {
                    if (item.type === 'folder') {
                        tags.add(item.name);
                        if (item.children) traverse(item.children);
                    } else if (item.type === 'file') {
                        // 也可以从文件路径中提取父目录作为标签
                        // 这里简化处理，仅使用文件夹名称作为标签
                    }
                }
            };
            traverse(this.tree);

            const allTagsArray = Array.from(tags).sort();

            // 应用保存的标签顺序
            try {
                const saved = localStorage.getItem('aicr_file_tag_order');
                const savedOrder = saved ? JSON.parse(saved) : null;

                if (savedOrder && Array.isArray(savedOrder) && savedOrder.length > 0) {
                    // 使用保存的顺序，但只包含当前存在的标签
                    const orderedTags = savedOrder.filter(tag => tags.has(tag));
                    // 添加新标签（不在保存顺序中的）到末尾，按字母顺序
                    const newTags = allTagsArray.filter(tag => !savedOrder.includes(tag));
                    return [...orderedTags, ...newTags];
                }
            } catch (e) {
                console.warn('[FileTree] 加载标签顺序失败:', e);
            }

            return allTagsArray;
        },

        // 计算每个标签下的文件数量
        tagCounts() {
            const counts = {};
            let noTagsCount = 0;

            const traverse = (items, parentTags = []) => {
                if (!Array.isArray(items)) return;
                for (const item of items) {
                    if (item.type === 'folder') {
                        // 文件夹本身不计数，但它的名称是标签
                        // 它的子文件将拥有这个标签
                        const currentTags = [...parentTags, item.name];
                        if (item.children) traverse(item.children, currentTags);
                    } else if (item.type === 'file') {
                        if (parentTags.length === 0) {
                            noTagsCount++;
                        } else {
                            for (const tag of parentTags) {
                                counts[tag] = (counts[tag] || 0) + 1;
                            }
                        }
                    }
                }
            };

            traverse(this.tree);
            return { counts, noTagsCount };
        },

        // 过滤后的标签列表
        filteredTags() {
            let tags = this.allTags;

            // 搜索过滤
            if (this.tagFilterSearchKeyword) {
                const keyword = this.tagFilterSearchKeyword.toLowerCase();
                tags = tags.filter(tag => tag.toLowerCase().includes(keyword));
            }

            // 排序：选中在前，然后按数量降序，最后按名称
            return tags.sort((a, b) => {
                const isSelectedA = this.selectedTags.includes(a);
                const isSelectedB = this.selectedTags.includes(b);
                if (isSelectedA !== isSelectedB) return isSelectedA ? -1 : 1;

                const countA = this.tagCounts.counts[a] || 0;
                const countB = this.tagCounts.counts[b] || 0;
                if (countA !== countB) return countB - countA;

                return a.localeCompare(b, 'zh-CN');
            });
        },

        // 可见标签列表
        visibleTags() {
            if (this.tagFilterExpanded || this.tagFilterSearchKeyword) {
                return this.filteredTags;
            }
            return this.filteredTags.slice(0, this.tagFilterVisibleCount);
        },

        // 是否有更多标签
        hasMoreTags() {
            return this.filteredTags.length > this.tagFilterVisibleCount;
        },

        // 排序后的文件树数据（应用过滤）
        sortedTree() {
            if (!Array.isArray(this.tree)) return [];

            // 先进行标签过滤
            let filteredItems = this.tree;

            // 如果有标签过滤条件
            if (this.selectedTags.length > 0 || this.tagFilterNoTags) {
                const filterByTags = (items, parentTags = []) => {
                    const result = [];
                    for (const item of items) {
                        if (item.type === 'folder') {
                            const currentTags = [...parentTags, item.name];
                            const children = filterByTags(item.children || [], currentTags);

                            // 如果子项有匹配，或者是反向过滤且当前文件夹不含排除标签
                            // 这里逻辑稍复杂，简化为：如果子项保留，则保留文件夹
                            if (children.length > 0) {
                                result.push({ ...item, children });
                            }
                        } else if (item.type === 'file') {
                            // 检查文件是否匹配过滤条件
                            let match = false;

                            if (this.tagFilterNoTags && parentTags.length === 0) {
                                match = true;
                            } else if (this.selectedTags.length > 0) {
                                // 检查是否有选中的标签
                                const hasSelectedTag = parentTags.some(tag => this.selectedTags.includes(tag));

                                if (this.tagFilterReverse) {
                                    // 反向过滤：不包含任何选中标签
                                    match = !hasSelectedTag;
                                } else {
                                    // 正向过滤：包含至少一个选中标签
                                    match = hasSelectedTag;
                                }
                            } else if (!this.tagFilterNoTags) {
                                // 没有选中标签且没有勾选无标签，显示所有（如果没有其他过滤逻辑）
                                // 但这里的逻辑是 "如果有标签过滤条件"，所以不会走到这
                                match = true;
                            }

                            if (match) {
                                result.push(item);
                            }
                        }
                    }
                    return result;
                };

                filteredItems = filterByTags(this.tree);
            }

            const sorted = filteredItems.map(item => sortFileTreeRecursively(item));

            // 如果有搜索关键词，进行过滤
            if (this.searchQuery && this.searchQuery.trim()) {
                return this.filterTree(sorted, this.searchQuery.trim().toLowerCase());
            }

            return sorted;
        },
        // 标签视图：扁平化所有文件
        flattenedFiles() {
            // 复用 sortedTree 的逻辑，因为它已经包含了标签过滤和搜索过滤
            const files = [];
            const flatten = (items) => {
                if (!Array.isArray(items)) return;
                items.forEach(item => {
                    if (item.type === 'file') {
                        files.push(item);
                    } else if (item.type === 'folder' && Array.isArray(item.children)) {
                        flatten(item.children);
                    }
                });
            };

            flatten(this.sortedTree);
            return files;
        }
    },
    emits: ['file-select', 'folder-toggle', 'toggle-collapse', 'create-folder', 'create-file', 'rename-item', 'delete-item', 'create-session', 'search-change', 'toggle-batch-mode', 'batch-select-file', 'download-project', 'upload-project', 'view-mode-change', 'copy-as-prompt', 'tag-select', 'tag-clear', 'tag-filter-reverse', 'tag-filter-no-tags', 'tag-filter-expand', 'tag-filter-search'],
    data() {
        return {
            searchDebounceTimer: null,
            tagOrderVersion: 0
        };
    },
    methods: {
        // 过滤文件树
        filterTree(items, query) {
            if (!query) return items;

            const filtered = [];
            for (const item of items) {
                const itemName = (item.name || '').toLowerCase();
                const itemPath = (item.path || item.id || '').toLowerCase();
                const matches = itemName.includes(query) || itemPath.includes(query);

                if (item.type === 'folder' && item.children) {
                    // 递归过滤子节点
                    const filteredChildren = this.filterTree(item.children, query);
                    // 如果文件夹名称匹配或有匹配的子节点，则包含该文件夹
                    if (matches || filteredChildren.length > 0) {
                        filtered.push({
                            ...item,
                            children: filteredChildren
                        });
                    }
                } else if (matches) {
                    // 文件匹配，直接添加
                    filtered.push(item);
                }
            }
            return filtered;
        },

        // 处理搜索输入
        handleSearchInput(event) {
            const value = event.target.value;

            // 清除之前的防抖定时器
            if (this.searchDebounceTimer) {
                clearTimeout(this.searchDebounceTimer);
            }

            // 防抖处理：300ms后执行搜索
            this.searchDebounceTimer = setTimeout(() => {
                this.$emit('search-change', value);
            }, 300);
        },

        // 清除搜索
        handleSearchClear() {
            const input = this.$refs.searchInput;
            if (input) {
                input.value = '';
            }
            this.$emit('search-change', '');
            // 使用 nextTick 确保清除按钮状态更新
            this.$nextTick(() => {
                if (input) {
                    input.focus();
                }
            });
        },

        // 切换批量选择模式
        toggleBatchMode() {
            this.$emit('toggle-batch-mode');
        },

        // 处理下载
        handleDownload() {
            this.$emit('download-project');
        },

        // 触发上传
        triggerUpload() {
            const input = this.$refs.uploadInput;
            if (input) {
                input.click();
            }
        },

        // 处理上传
        handleUpload(event) {
            const file = event.target.files?.[0];
            if (file) {
                this.$emit('upload-project', file);
            }
            // 清除文件输入，允许重复选择同一文件
            if (event.target) {
                event.target.value = '';
            }
        },

        // 处理视图模式切换
        handleViewModeChange(mode) {
            return safeExecute(() => {
                if (mode === 'tree' || mode === 'tags') {
                    this.$emit('view-mode-change', mode);
                }
            }, '视图模式切换处理');
        },
        // 排序函数，供模板使用
        sortFileTreeItems(items) {
            return sortFileTreeItems(items);
        },
        // 切换收起状态
        toggleCollapse() {
            return safeExecute(() => {
                this.$emit('toggle-collapse');
            }, '收起状态切换处理');
        },

        // 切换文件夹展开状态
        toggleFolder(key) {
            return safeExecute(() => {
                if (!key || typeof key !== 'string') {
                    throw createError('文件夹Key无效', ErrorTypes.VALIDATION, '文件夹切换');
                }

                this.$emit('folder-toggle', key);
            }, '文件夹切换处理');
        },

        // 检查文件夹是否展开
        isFolderExpanded(key) {
            return safeExecute(() => {
                return this.expandedFolders && this.expandedFolders.has(key);
            }, '文件夹展开状态检查');
        },

        // 选择文件
        selectFile(key) {
            return safeExecute(() => {
                if (key == null) {
                    throw createError('文件Key无效', ErrorTypes.VALIDATION, '文件选择');
                }
                const keyStr = String(key);

                // 构建统一的文件标识符payload，与FileTreeNode组件保持一致
                const payload = {
                    // 主要标识符：使用key
                    key: keyStr,
                    // 兼容性标识符
                    path: keyStr,
                    name: keyStr.split('/').pop(),
                    // 文件类型
                    type: 'file'
                };

                this.$emit('file-select', payload);
            }, '文件选择处理');
        },

        // 检查文件是否被选中
        isFileSelected(key) {
            return safeExecute(() => {
                if (!key || !this.selectedKey) return false;
                // 规范化文件Key进行比较
                const normalize = (v) => {
                    if (!v) return '';
                    let s = String(v).replace(/\\/g, '/');
                    s = s.replace(/^\.\//, '');
                    s = s.replace(/^\/+/, '');
                    s = s.replace(/\/\/+/g, '/');
                    return s;
                };

                const normalizedKey = normalize(key);
                const normalizedSelectedKey = normalize(this.selectedKey);
                const result = normalizedKey === normalizedSelectedKey;

                return result;
            }, '文件选中状态检查');
        },

        // 获取文件图标
        getFileIcon(item) {
            return safeExecute(() => {
                if (item.type === 'folder') {
                    return this.isFolderExpanded(item.key) ? '📂' : '📁';
                }

                // 根据文件扩展名返回不同图标（兼容缺失 name 的情况）
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
                    'txt': '📄'
                };

                return iconMap[ext] || '📄';
            }, '文件图标获取');
        },

        // 获取文件大小显示
        getFileSizeDisplay(item) {
            return safeExecute(() => {
                if (item.type === 'folder' || !item.size) return '';
                return formatFileSizeCompact(item.size);
            }, '文件大小计算');
        },

        // 获取文件修改时间
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

        // 获取文件的评论数量
        getCommentCount(key) {
            return safeExecute(() => {
                if (!this.comments || !key) return 0;

                const isUUID = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || '').trim());

                // 使用统一的文件标识符匹配逻辑
                const normalize = (v) => {
                    if (!v) return '';
                    let s = String(v).replace(/\\/g, '/');
                    s = s.replace(/^\.\//, '');
                    s = s.replace(/^\/+/, '');
                    s = s.replace(/\/\/+/g, '/');
                    return s;
                };

                // 关键约定：评论的 fileKey 只存 sessionKey(UUID)
                // 这里允许传入 sessionKey 或 treeKey（路径），并尽量解析到 sessionKey 再计数
                const raw = String(key || '').trim();
                let sessionKey = isUUID(raw) ? raw : null;

                if (!sessionKey) {
                    const targetTreeKey = normalize(raw);
                    const root = this.tree;
                    const stack = Array.isArray(root) ? [...root] : (root ? [root] : []);
                    while (stack.length) {
                        const node = stack.pop();
                        if (!node) continue;
                        const nodeKey = normalize(node.key || node.path || '');
                        if (nodeKey && nodeKey === targetTreeKey) {
                            if (node.sessionKey && isUUID(node.sessionKey)) sessionKey = String(node.sessionKey);
                            break;
                        }
                        if (Array.isArray(node.children)) stack.push(...node.children);
                    }
                }

                if (!sessionKey) return 0;

                const count = this.comments.filter(comment => {
                    const commentFileKey = comment?.fileKey || (comment?.fileInfo && comment.fileInfo.key) || null;
                    return String(commentFileKey || '').trim() === sessionKey;
                }).length;

                return count;
            }, '文件评论数量计算');
        },

        // 处理标签点击（支持批量选择模式）
        handleTagClick(key) {
            return safeExecute(() => {
                if (key == null) {
                    throw createError('文件Key无效', ErrorTypes.VALIDATION, '标签点击');
                }
                const keyStr = String(key);

                // 批量选择模式：切换选中状态
                if (this.batchMode) {
                    this.$emit('batch-select-file', keyStr);
                    return;
                }

                // 普通模式：选择文件
                this.selectFile(keyStr);
            }, '标签点击处理');
        },

        // 切换标签选择
        toggleTag(tag) {
            return safeExecute(() => {
                const newTags = [...this.selectedTags];
                const index = newTags.indexOf(tag);
                if (index > -1) {
                    newTags.splice(index, 1);
                } else {
                    newTags.push(tag);
                }
                this.$emit('tag-select', newTags);
            }, '切换标签选择');
        },

        // 切换反向过滤
        toggleReverse() {
            this.$emit('tag-filter-reverse', !this.tagFilterReverse);
        },

        // 切换无标签筛选
        toggleNoTags() {
            this.$emit('tag-filter-no-tags', !this.tagFilterNoTags);
        },

        // 切换展开/折叠
        toggleExpand() {
            this.$emit('tag-filter-expand', !this.tagFilterExpanded);
        },

        // 更新标签搜索关键词
        updateTagSearch(keyword) {
            this.$emit('tag-filter-search', keyword);
        },

        // 清除所有过滤条件
        clearAllFilters() {
            this.$emit('tag-clear');
        },

        // 保存标签顺序
        saveTagOrder(order) {
            try {
                localStorage.setItem('aicr_file_tag_order', JSON.stringify(order));
                // 强制更新 allTags
                this.$forceUpdate();
            } catch (e) {
                console.warn('[FileTree] 保存标签顺序失败:', e);
            }
        },

        // 拖拽开始
        handleDragStart(e, tag) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', tag);
            e.currentTarget.classList.add('dragging');

            // 设置自定义拖拽图像
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

        // 拖拽结束
        handleDragEnd(e) {
            e.currentTarget.classList.remove('dragging');

            // 移除所有拖拽相关的样式
            document.querySelectorAll('.tag-item').forEach(item => {
                item.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-hover');
            });
        },

        // 拖拽经过
        handleDragOver(e) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';

            if (e.currentTarget.classList.contains('dragging')) {
                return;
            }

            const rect = e.currentTarget.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;

            // 移除所有拖拽指示样式
            document.querySelectorAll('.tag-item').forEach(item => {
                if (!item.classList.contains('dragging')) {
                    item.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-hover');
                }
            });

            // 根据鼠标位置显示插入位置指示
            if (e.clientY < midY) {
                e.currentTarget.classList.add('drag-over-top');
                e.currentTarget.classList.remove('drag-over-bottom');
            } else {
                e.currentTarget.classList.add('drag-over-bottom');
                e.currentTarget.classList.remove('drag-over-top');
            }

            e.currentTarget.classList.add('drag-hover');
        },

        // 拖拽离开
        handleDragLeave(e) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;

            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-hover');
            }
        },

        // 放置
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

            // 计算新的插入位置
            const rect = e.currentTarget.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            let insertIndex = targetIndex;
            if (e.clientY < midY) {
                insertIndex = targetIndex;
            } else {
                insertIndex = targetIndex + 1;
            }

            // 调整顺序
            const newOrder = [...currentOrder];
            // 先移除拖拽的元素
            newOrder.splice(draggedIndex, 1);
            // 如果插入位置在移除元素之后，索引需要减1
            if (insertIndex > draggedIndex) {
                insertIndex--;
            }
            // 插入元素
            newOrder.splice(insertIndex, 0, draggedTag);

            // 保存新顺序
            this.saveTagOrder(newOrder);

            // 清除样式
            e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-hover');
        },

        // 获取文件夹的评论数量（递归计算所有子文件的评论）
        getFolderCommentCount(folder) {
            return safeExecute(() => {
                if (!folder || folder.type !== 'folder' || !folder.children) return 0;

                let totalCount = 0;

                const calculateCount = (items) => {
                    if (!Array.isArray(items)) {
                        // 如果是单个节点，直接处理
                        if (items.type === 'file') {
                            totalCount += this.getCommentCount(items.key);
                        } else if (items.type === 'folder' && items.children) {
                            calculateCount(items.children);
                        }
                        return;
                    }

                    items.forEach(item => {
                        if (item.type === 'file') {
                            totalCount += this.getCommentCount(item.key);
                        } else if (item.type === 'folder' && item.children) {
                            calculateCount(item.children);
                        }
                    });
                };

                calculateCount(folder.children);
                return totalCount;
            }, '文件夹评论数量计算');
        },


    },
};

// 初始化组件并全局暴露
(async function initComponent() {
    try {
        const FileTree = await defineComponent(componentOptions);
        window.FileTree = FileTree;

        // 触发自定义事件，通知组件已加载完成
        window.dispatchEvent(new CustomEvent('FileTreeLoaded', { detail: FileTree }));
    } catch (error) {
        console.error('FileTree 组件初始化失败:', error);
    }
})();








