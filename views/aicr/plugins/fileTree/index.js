// 文件树组件 - 负责文件目录树的展示和交互
// 作者：liangliang

import { safeExecute, createError, ErrorTypes } from '/utils/error.js';
import { loadCSSFiles } from '/utils/baseView.js';

// 自动加载相关的CSS文件
loadCSSFiles([
    '/views/aicr/plugins/fileTree/index.css'
]);

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

// 异步加载HTML模板
async function loadTemplate() {
    try {
        const response = await fetch('/views/aicr/plugins/fileTree/index.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const templateText = await response.text();
        return templateText;
    } catch (error) {
        console.error('加载模板失败:', error);
        return;
    }
}

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
            }
        },
        data() {
            return {
                _lastClickTime: null
            };
        },
        emits: ['file-select', 'folder-toggle', 'create-folder', 'create-file', 'rename-item', 'delete-item'],
        methods: {
            // 切换文件夹展开状态
            toggleFolder(folderId) {
                return safeExecute(() => {
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
                    
                    // 添加防抖机制，避免快速连续点击
                    if (this._lastClickTime && Date.now() - this._lastClickTime < 300) {
                        console.log('[FileTreeNode] 点击间隔过短，跳过重复选择:', idStr);
                        return;
                    }
                    
                    this._lastClickTime = Date.now();
                    console.log('[FileTreeNode] 选择文件:', idStr);
                    console.log('[FileTreeNode] 文件对象:', this.item);
                    console.log('[FileTreeNode] 文件路径深度:', idStr.split('/').length);
                    
                    // 构建统一的文件标识符payload
                    const payload = { 
                        // 主要标识符：优先使用path，然后是id，最后是name
                        fileId: (this.item && this.item.path) || (this.item && this.item.id) || idStr,
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
                        const commentFileId = comment.fileId || (comment.fileInfo && comment.fileInfo.path);
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
                        <button class="action-btn" :title="'在 ' + item.name + ' 下新建文件夹'" @click="createSubFolder($event, item.id)"><i class="fas fa-folder-plus"></i></button>
                        <button class="action-btn" :title="'在 ' + item.name + ' 下新建文件'" @click="createSubFile($event, item.id)"><i class="fas fa-file"></i></button>
                        <button class="action-btn" :title="'重命名 ' + item.name" @click="renameItem($event, item)"><i class="fas fa-i-cursor"></i></button>
                        <button class="action-btn" :title="'删除 ' + item.name" @click="deleteItem($event, item.id)"><i class="fas fa-trash"></i></button>
                    </span>
                </div>
                
                <!-- 文件 -->
                <div 
                    v-else
                    :class="['file-tree-item', 'file-item', { 
                        selected: isFileSelected(item.id)
                    }]"
                    @click="selectFile(item.id)"
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
                        <button class="action-btn" :title="'重命名 ' + item.name" @click="renameItem($event, item)"><i class="fas fa-i-cursor"></i></button>
                        <button class="action-btn" :title="'删除 ' + item.name" @click="deleteItem($event, item.id)"><i class="fas fa-trash"></i></button>
                    </span>
                </div>
                
                <!-- 递归渲染子节点 -->
                <ul 
                    v-if="item.type === 'folder' && item.children && isFolderExpanded(item.id)"
                    class="file-tree-children"
                    role="group"
                >
                    <template v-for="child in item.children" :key="child.id">
                        <file-tree-node 
                            :item="child"
                            :selected-file-id="selectedFileId"
                            :expanded-folders="expandedFolders"
                            :comments="comments"
                            @file-select="$emit('file-select', $event)"
                             @folder-toggle="$emit('folder-toggle', $event)"
                             @create-folder="$emit('create-folder', $event)"
                             @create-file="$emit('create-file', $event)"
                             @rename-item="$emit('rename-item', $event)"
                             @delete-item="$emit('delete-item', $event)"
                        ></file-tree-node>
                    </template>
                </ul>
            </li>
        `
    };
};

// 创建组件定义
const createFileTree = async () => {
    const template = await loadTemplate();
    
    return {
        name: 'FileTree',
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
            }
        },
        emits: ['file-select', 'folder-toggle', 'toggle-collapse', 'create-folder', 'create-file', 'rename-item', 'delete-item'],
        methods: {
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
                        // 主要标识符：优先使用path，然后是id，最后是name
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
                        const commentFileId = comment.fileId || (comment.fileInfo && comment.fileInfo.path);
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
        template: template
    };
};

// 初始化组件并全局暴露
(async function initComponent() {
    try {
        const FileTree = await createFileTree();
        window.FileTree = FileTree;
        
        // 触发自定义事件，通知组件已加载完成
        window.dispatchEvent(new CustomEvent('FileTreeLoaded', { detail: FileTree }));
        
        console.log('[FileTree] 组件初始化完成');
    } catch (error) {
        console.error('FileTree 组件初始化失败:', error);
    }
})();







