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
            selectedFileId: {
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
            selectedFileIds: {
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
        emits: ['file-select', 'folder-toggle', 'create-folder', 'create-file', 'rename-item', 'delete-item', 'create-session', 'batch-select-file'],
        methods: {
            // 排序函数，供模板使用
            sortFileTreeItems(items) {
                return sortFileTreeItems(items);
            },
            // 切换文件夹展开状态
            toggleFolder(folderId) {
                return safeExecute(() => {
                    // 如果长按已完成，不触发点击事件
                    if (this.longPressCompleted) {
                        console.log('[FileTreeNode] 长按已完成，跳过文件夹切换');
                        return;
                    }
                    
                    if (!folderId || typeof folderId !== 'string') {
                        throw createError('文件夹ID无效', ErrorTypes.VALIDATION, '文件夹切换');
                    }
                    
                    this.$emit('folder-toggle', folderId);
                }, '文件夹切换处理');
            },
            // 新建子文件夹
            createSubFolder(event, parentId) {
                return safeExecute(() => {
                    event && event.stopPropagation && event.stopPropagation();
                    if (!parentId || typeof parentId !== 'string') {
                        throw createError('父级目录ID无效', ErrorTypes.VALIDATION, '新建文件夹');
                    }
                    this.$emit('create-folder', { parentId });
                }, '新建子文件夹');
            },
            // 新建子文件
            createSubFile(event, parentId) {
                return safeExecute(() => {
                    event && event.stopPropagation && event.stopPropagation();
                    if (!parentId || typeof parentId !== 'string') {
                        throw createError('父级目录ID无效', ErrorTypes.VALIDATION, '新建文件');
                    }
                    this.$emit('create-file', { parentId });
                }, '新建子文件');
            },
            // 重命名
            renameItem(event, item) {
                return safeExecute(() => {
                    event && event.stopPropagation && event.stopPropagation();
                    const itemId = item && item.id;
                    const name = item && item.name;
                    if (!itemId || typeof itemId !== 'string') {
                        throw createError('目标ID无效', ErrorTypes.VALIDATION, '重命名');
                    }
                    this.$emit('rename-item', { itemId, name });
                }, '重命名');
            },
            // 删除
            deleteItem(event, itemId) {
                return safeExecute(() => {
                    event && event.stopPropagation && event.stopPropagation();
                    if (!itemId || typeof itemId !== 'string') {
                        throw createError('目标ID无效', ErrorTypes.VALIDATION, '删除');
                    }
                    this.$emit('delete-item', { itemId });
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
                        console.log('[长按删除] 正在删除中，忽略新的长按');
                        return;
                    }
                    
                    // 检查是否点击在可交互元素上
                    const target = event.target;
                    const isInteractiveElement = target.closest('button, a, [role="button"]');
                    
                    if (isInteractiveElement) {
                        console.log('[长按删除] 点击在交互元素上，跳过长按:', target.tagName, target.className);
                        return;
                    }
                    
                    // 检查item是否存在
                    if (!item || !item.id) {
                        console.warn('[长按删除] item参数为空');
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
                        console.log('[长按删除] 正在删除中，忽略长按完成');
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
                            console.log('[长按删除] 移动距离过大，取消删除');
                            this.longPressCompleted = false;
                            return;
                        }
                    }
                    
                    // 显示确认对话框
                    const itemName = item.name || item.id;
                    const itemType = item.type === 'folder' ? '文件夹' : '文件';
                    if (confirm(`确定删除${itemType} "${itemName}" 及其子项？此操作不可撤销。`)) {
                        this.isDeleting = true;
                        this.deleteItem(event, item.id);
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
                    console.log('[FileTreeNode] 创建会话按钮被点击:', item);
                    event && event.stopPropagation && event.stopPropagation();
                    if (!item || !item.id) {
                        throw createError('文件信息无效', ErrorTypes.VALIDATION, '创建会话');
                    }
                    const payload = { 
                        fileId: item.fileId || item.id,
                        id: item.id,
                        name: item.name,
                        path: item.path,
                        originalItem: item
                    };
                    console.log('[FileTreeNode] 发射 create-session 事件:', payload);
                    this.$emit('create-session', payload);
                }, '创建会话');
            },
            
            // 检查文件夹是否展开
            isFolderExpanded(folderId) {
                return safeExecute(() => {
                    return this.expandedFolders && this.expandedFolders.has(folderId);
                }, '文件夹展开状态检查');
            },
            
            // 选择文件
            selectFile(fileId) {
                return safeExecute(() => {
                    // 如果长按已完成，不触发点击事件
                    if (this.longPressCompleted) {
                        console.log('[FileTreeNode] 长按已完成，跳过点击事件');
                        return;
                    }
                    
                    if (fileId == null) {
                        throw createError('文件ID无效', ErrorTypes.VALIDATION, '文件选择');
                    }
                    const idStr = String(fileId);
                    
                    // 批量选择模式：切换选中状态
                    if (this.batchMode) {
                        this.$emit('batch-select-file', idStr);
                        return;
                    }
                    
                    // 添加防抖机制，避免快速连续点击
                    if (this._lastClickTime && Date.now() - this._lastClickTime < 300) {
                        console.log('[FileTreeNode] 点击间隔过短，跳过重复选择:', idStr);
                        return;
                    }
                    
                    this._lastClickTime = Date.now();
                    console.log('[FileTreeNode] 选择文件:', idStr);
                    console.log('[FileTreeNode] 文件对象:', this.item);
                    console.log('[FileTreeNode] 文件路径深度:', idStr.split('/').length);
                    
                    // 构建统一的文件标识符payload，确保与后端数据结构一致
                    const payload = { 
                        // 主要标识符：优先使用fileId，然后是id，最后是name
                        fileId: (this.item && this.item.fileId) || (this.item && this.item.id) || idStr,
                        // 兼容性标识符
                        id: (this.item && this.item.id) || idStr,
                        path: (this.item && this.item.path) || idStr,
                        name: (this.item && this.item.name) || (idStr.split('/').pop()),
                        // 唯一标识符：优先使用key，然后是_id，最后是id
                        key: this.item?.key || this.item?._id || this.item?.id || idStr,
                        // 保留原始item对象，包含所有可能的标识字段
                        originalItem: this.item,
                        // 文件类型
                        type: this.item?.type || 'file',
                        // 文件大小和修改时间
                        size: this.item?.size,
                        modified: this.item?.modified
                    };
                    
                    console.log('[FileTreeNode] 文件选择payload:', payload);
                    this.$emit('file-select', payload);
                }, '文件选择处理');
            },
            
            // 检查文件是否被选中
            isFileSelected(fileId) {
                return safeExecute(() => {
                    // 批量选择模式：检查是否在选中列表中
                    if (this.batchMode && this.selectedFileIds) {
                        const normalize = (v) => {
                            if (!v) return '';
                            let s = String(v).replace(/\\/g, '/');
                            s = s.replace(/^\.\//, '');
                            s = s.replace(/^\/+/, '');
                            s = s.replace(/\/\/+/g, '/');
                            return s;
                        };
                        const normalizedFileId = normalize(fileId);
                        // 检查 Set 中是否包含该文件ID
                        for (const selectedId of this.selectedFileIds) {
                            if (normalize(selectedId) === normalizedFileId) {
                                return true;
                            }
                        }
                        return false;
                    }
                    
                    // 普通模式：检查是否与当前选中文件匹配
                    if (!fileId || !this.selectedFileId) return false;
                    
                    // 规范化文件ID进行比较
                    const normalize = (v) => {
                        if (!v) return '';
                        let s = String(v).replace(/\\/g, '/');
                        s = s.replace(/^\.\//, '');
                        s = s.replace(/^\/+/, '');
                        s = s.replace(/\/\/+/g, '/');
                        return s;
                    };
                    
                    const normalizedFileId = normalize(fileId);
                    const normalizedSelectedId = normalize(this.selectedFileId);
                    const result = normalizedFileId === normalizedSelectedId;
                    
                    console.log('[FileTree] isFileSelected - fileId:', fileId, 'selectedFileId:', this.selectedFileId, 'normalized:', { fileId: normalizedFileId, selectedId: normalizedSelectedId }, 'result:', result);
                    return result;
                }, '文件选中状态检查');
            },
            
            // 获取文件图标
            getFileIcon(item) {
                return safeExecute(() => {
                    if (item.type === 'folder') {
                        return this.isFolderExpanded(item.id) ? '📂' : '📁';
                    }
                    
					// 根据文件扩展名返回不同图标（兼容缺失 name 的情况）
					const fileNameSource = (item && typeof item.name === 'string' && item.name)
						? item.name
						: (typeof item.path === 'string' && item.path
							? item.path.split('/').pop()
							: (typeof item.id === 'string'
								? item.id.split('/').pop()
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
            getCommentCount(fileId) {
                return safeExecute(() => {
                    if (!this.comments || !fileId) return 0;
                    
                    // 使用统一的文件标识符匹配逻辑
                    const normalize = (v) => {
                        if (!v) return '';
                        let s = String(v).replace(/\\/g, '/');
                        s = s.replace(/^\.\//, '');
                        s = s.replace(/^\/+/, '');
                        s = s.replace(/\/\/+/g, '/');
                        return s;
                    };
                    
                    const target = normalize(fileId);
                    
                    const count = this.comments.filter(comment => {
                        // 兼容不同的文件标识方式
                        const commentFileId = comment.fileId || (comment.fileInfo && comment.fileInfo.fileId);
                        const normalizedCommentFileId = normalize(commentFileId);
                        return normalizedCommentFileId === target;
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
                                totalCount += this.getCommentCount(items.id);
                            } else if (items.type === 'folder' && items.children) {
                                calculateCount(items.children);
                            }
                            return;
                        }
                        
                        items.forEach(item => {
                            if (item.type === 'file') {
                                totalCount += this.getCommentCount(item.id);
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
        template: `
            <li 
                class="file-tree-node"
                role="treeitem"
                :aria-expanded="item.type === 'folder' ? isFolderExpanded(item.id) : undefined"
            >
                <!-- 文件夹 -->
                <div 
                    v-if="item.type === 'folder'"
                    :class="['file-tree-item', 'folder-item', { 
                        expanded: isFolderExpanded(item.id)
                    }]"
                    @click="toggleFolder(item.id)"
                    @mousedown="startLongPress(item, $event)"
                    @mouseup="cancelLongPress"
                    @mouseleave="cancelLongPress"
                    @touchstart="startLongPress(item, $event)"
                    @touchend="cancelLongPress"
                    @touchcancel="cancelLongPress"
                    :title="\`文件夹: \${item.name}\`"
                    tabindex="0"
                    @keydown.enter="toggleFolder(item.id)"
                    @keydown.space="toggleFolder(item.id)"
                >
                    <span class="folder-toggle" aria-hidden="true" @click.stop="toggleFolder(item.id)">
                        <i :class="['fas', isFolderExpanded(item.id) ? 'fa-chevron-down' : 'fa-chevron-right']"></i>
                    </span>
                    <span class="file-icon" aria-hidden="true" @click.stop="toggleFolder(item.id)">{{ getFileIcon(item) }}</span>
                    <span class="file-name">{{ item.name }}</span>
                    <span v-if="item.children" class="folder-count">({{ item.children.length }})</span>
                    <span class="file-actions" @click.stop>
                        <button :title="'在 ' + item.name + ' 下新建文件夹'" @click="createSubFolder($event, item.id)"><i class="fas fa-folder-plus"></i></button>
                        <button :title="'在 ' + item.name + ' 下新建文件'" @click="createSubFile($event, item.id)"><i class="fas fa-file"></i></button>
                        <button :title="'重命名 ' + item.name" @click="renameItem($event, item)"><i class="fas fa-i-cursor"></i></button>
                    </span>
                </div>
                
                <!-- 文件 -->
                <div 
                    v-else
                    :class="['file-tree-item', 'file-item', { 
                        selected: isFileSelected(item.id),
                        'batch-selected': batchMode && isFileSelected(item.id)
                    }]"
                    @click="selectFile(item.id)"
                    @mousedown="startLongPress(item, $event)"
                    @mouseup="cancelLongPress"
                    @mouseleave="cancelLongPress"
                    @touchstart="startLongPress(item, $event)"
                    @touchend="cancelLongPress"
                    @touchcancel="cancelLongPress"
                    :title="\`文件: \${item.name}\`"
                    tabindex="0"
                    @keydown.enter="selectFile(item.id)"
                    @keydown.space="selectFile(item.id)"
                >
                    <span class="folder-toggle file-toggle-placeholder" aria-hidden="true"></span>
                    <span class="file-icon" aria-hidden="true" @click.stop="selectFile(item.id)">{{ getFileIcon(item) }}</span>
                    <span class="file-name">{{ item.name }}</span>
                    <span v-if="getFileSizeDisplay(item)" class="file-size">{{ getFileSizeDisplay(item) }}</span>
                    <span class="file-actions" @click.stop>
                        <button type="button" :title="'重命名 ' + item.name" @click="renameItem($event, item)"><i class="fas fa-i-cursor"></i></button>
                    </span>
                </div>
                
                <!-- 递归渲染子节点 -->
                <ul 
                    v-if="item.type === 'folder' && item.children && isFolderExpanded(item.id)"
                    class="file-tree-children"
                    role="group"
                >
                    <template v-for="child in sortFileTreeItems(item.children)" :key="child.id">
                        <file-tree-node 
                            :item="child"
                            :selected-file-id="selectedFileId"
                            :expanded-folders="expandedFolders"
                            :comments="comments"
                            :batch-mode="batchMode"
                            :selected-file-ids="selectedFileIds"
                            @file-select="$emit('file-select', $event)"
                             @folder-toggle="$emit('folder-toggle', $event)"
                             @create-folder="$emit('create-folder', $event)"
                             @create-file="$emit('create-file', $event)"
                             @rename-item="$emit('rename-item', $event)"
                             @delete-item="$emit('delete-item', $event)"
                             @create-session="$emit('create-session', $event)"
                             @batch-select-file="$emit('batch-select-file', $event)"
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
            selectedFileId: {
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
            selectedFileIds: {
                type: [Set, Array],
                default: () => new Set()
            },
            selectedProject: {
                type: String,
                default: ''
            },
            viewMode: {
                type: String,
                default: 'tree',
                validator: (value) => ['tree', 'tags'].includes(value)
            }
        },
        computed: {
            // 排序后的文件树数据（应用过滤）
            sortedTree() {
                if (!Array.isArray(this.tree)) return [];
                const sorted = this.tree.map(item => sortFileTreeRecursively(item));
                
                // 如果有搜索关键词，进行过滤
                if (this.searchQuery && this.searchQuery.trim()) {
                    return this.filterTree(sorted, this.searchQuery.trim().toLowerCase());
                }
                
                return sorted;
            },
            // 标签视图：扁平化所有文件
            flattenedFiles() {
                if (!Array.isArray(this.tree)) return [];
                
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
                
                // 如果有搜索关键词，进行过滤
                if (this.searchQuery && this.searchQuery.trim()) {
                    const query = this.searchQuery.trim().toLowerCase();
                    return files.filter(file => {
                        const name = (file.name || '').toLowerCase();
                        const path = (file.path || file.id || '').toLowerCase();
                        return name.includes(query) || path.includes(query);
                    });
                }
                
                return files;
            }
        },
        emits: ['file-select', 'folder-toggle', 'toggle-collapse', 'create-folder', 'create-file', 'rename-item', 'delete-item', 'create-session', 'search-change', 'toggle-batch-mode', 'batch-select-file', 'download-project', 'upload-project', 'view-mode-change'],
        data() {
            return {
                searchDebounceTimer: null
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
                    console.log('[FileTree] 切换收起状态');
                    this.$emit('toggle-collapse');
                }, '收起状态切换处理');
            },
            
            // 切换文件夹展开状态
            toggleFolder(folderId) {
                return safeExecute(() => {
                    if (!folderId || typeof folderId !== 'string') {
                        throw createError('文件夹ID无效', ErrorTypes.VALIDATION, '文件夹切换');
                    }
                    
                    this.$emit('folder-toggle', folderId);
                }, '文件夹切换处理');
            },
            
            // 检查文件夹是否展开
            isFolderExpanded(folderId) {
                return safeExecute(() => {
                    return this.expandedFolders && this.expandedFolders.has(folderId);
                }, '文件夹展开状态检查');
            },
            
            // 选择文件
            selectFile(fileId) {
                return safeExecute(() => {
                    if (fileId == null) {
                        throw createError('文件ID无效', ErrorTypes.VALIDATION, '文件选择');
                    }
                    const idStr = String(fileId);
                    console.log('[FileTree] 选择文件:', idStr);
                    
                    // 构建统一的文件标识符payload，与FileTreeNode组件保持一致
                    const payload = { 
                        // 主要标识符：优先使用fileId，然后是id，最后是name
                        fileId: idStr,
                        // 兼容性标识符
                        id: idStr,
                        path: idStr,
                        name: idStr.split('/').pop(),
                        // 唯一标识符
                        key: idStr,
                        // 文件类型
                        type: 'file'
                    };
                    
                    console.log('[FileTree] 文件选择payload:', payload);
                    this.$emit('file-select', payload);
                }, '文件选择处理');
            },
            
            // 检查文件是否被选中
            isFileSelected(fileId) {
                return safeExecute(() => {
                    if (!fileId || !this.selectedFileId) return false;                    
                    // 规范化文件ID进行比较
                    const normalize = (v) => {
                        if (!v) return '';
                        let s = String(v).replace(/\\/g, '/');
                        s = s.replace(/^\.\//, '');
                        s = s.replace(/^\/+/, '');
                        s = s.replace(/\/\/+/g, '/');
                        return s;
                    };
                    
                    const normalizedFileId = normalize(fileId);
                    const normalizedSelectedId = normalize(this.selectedFileId);
                    const result = normalizedFileId === normalizedSelectedId;
                    
                    console.log('[FileTree] isFileSelected - fileId:', fileId, 'selectedFileId:', this.selectedFileId, 'normalized:', { fileId: normalizedFileId, selectedId: normalizedSelectedId }, 'result:', result);
                    return result;
                }, '文件选中状态检查');
            },
            
            // 获取文件图标
            getFileIcon(item) {
                return safeExecute(() => {
                    if (item.type === 'folder') {
                        return this.isFolderExpanded(item.id) ? '📂' : '📁';
                    }
                    
					// 根据文件扩展名返回不同图标（兼容缺失 name 的情况）
					const fileNameSource = (item && typeof item.name === 'string' && item.name)
						? item.name
						: (typeof item.path === 'string' && item.path
							? item.path.split('/').pop()
							: (typeof item.id === 'string'
								? item.id.split('/').pop()
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
            getCommentCount(fileId) {
                return safeExecute(() => {
                    if (!this.comments || !fileId) return 0;
                    
                    // 使用统一的文件标识符匹配逻辑
                    const normalize = (v) => {
                        if (!v) return '';
                        let s = String(v).replace(/\\/g, '/');
                        s = s.replace(/^\.\//, '');
                        s = s.replace(/^\/+/, '');
                        s = s.replace(/\/\/+/g, '/');
                        return s;
                    };
                    
                    const target = normalize(fileId);
                    
                    const count = this.comments.filter(comment => {
                        // 兼容不同的文件标识方式
                        const commentFileId = comment.fileId || (comment.fileInfo && comment.fileInfo.fileId);
                        const normalizedCommentFileId = normalize(commentFileId);
                        return normalizedCommentFileId === target;
                    }).length;
                    
                    return count;
                }, '文件评论数量计算');
            },
            
            // 处理标签点击（支持批量选择模式）
            handleTagClick(fileId) {
                return safeExecute(() => {
                    if (fileId == null) {
                        throw createError('文件ID无效', ErrorTypes.VALIDATION, '标签点击');
                    }
                    const idStr = String(fileId);
                    
                    // 批量选择模式：切换选中状态
                    if (this.batchMode) {
                        this.$emit('batch-select-file', idStr);
                        return;
                    }
                    
                    // 普通模式：选择文件
                    this.selectFile(idStr);
                }, '标签点击处理');
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
                                totalCount += this.getCommentCount(items.id);
                            } else if (items.type === 'folder' && items.children) {
                                calculateCount(items.children);
                            }
                            return;
                        }
                        
                        items.forEach(item => {
                            if (item.type === 'file') {
                                totalCount += this.getCommentCount(item.id);
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
        
        console.log('[FileTree] 组件初始化完成');
    } catch (error) {
        console.error('FileTree 组件初始化失败:', error);
    }
})();










