// 文件树组件 - 负责文件目录树的展示和交互
// 作者：liangliang

import { safeExecute, createError, ErrorTypes } from '/utils/error.js';
import { loadCSSFiles } from '/utils/baseView.js';

// 自动加载相关的CSS文件
loadCSSFiles([
    '/views/aicr/plugins/fileTree/index.css'
]);

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
        emits: ['file-select', 'folder-toggle'],
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
            
            // 检查文件夹是否展开
            isFolderExpanded(folderId) {
                return safeExecute(() => {
                    return this.expandedFolders && this.expandedFolders.has(folderId);
                }, '文件夹展开状态检查');
            },
            
            // 选择文件
            selectFile(fileId) {
                return safeExecute(() => {
                    if (!fileId || typeof fileId !== 'string') {
                        throw createError('文件ID无效', ErrorTypes.VALIDATION, '文件选择');
                    }
                    
                    // 添加防抖机制，避免快速连续点击
                    if (this._lastClickTime && Date.now() - this._lastClickTime < 300) {
                        console.log('[FileTreeNode] 点击间隔过短，跳过重复选择:', fileId);
                        return;
                    }
                    
                    this._lastClickTime = Date.now();
                    console.log('[FileTreeNode] 选择文件:', fileId);
                    this.$emit('file-select', fileId);
                }, '文件选择处理');
            },
            
            // 检查文件是否被选中
            isFileSelected(fileId) {
                return safeExecute(() => {
                    console.log('[FileTreeNode] isFileSelected - fileId:', fileId, 'selectedFileId:', this.selectedFileId, 'result:', this.selectedFileId && this.selectedFileId === fileId);
                    return this.selectedFileId && this.selectedFileId === fileId;
                }, '文件选中状态检查');
            },
            
            // 获取文件图标
            getFileIcon(item) {
                return safeExecute(() => {
                    if (item.type === 'folder') {
                        return this.isFolderExpanded(item.id) ? '📂' : '📁';
                    }
                    
                    // 根据文件扩展名返回不同图标
                    const ext = item.name.split('.').pop().toLowerCase();
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
                    
                    const size = item.size;
                    if (size < 1024) return `${size}B`;
                    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
                    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
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
                    
                    const count = this.comments.filter(comment => {
                        // 兼容不同的文件标识方式
                        const commentFileId = comment.fileId || (comment.fileInfo && comment.fileInfo.path);
                        return commentFileId === fileId;
                    }).length;
                    
                    return count;
                }, '文件评论数量计算');
            }
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
                    <span class="folder-toggle" aria-hidden="true">
                        <i :class="['fas', isFolderExpanded(item.id) ? 'fa-chevron-down' : 'fa-chevron-right']"></i>
                    </span>
                    <span class="file-icon" aria-hidden="true">{{ getFileIcon(item) }}</span>
                    <span class="file-name">{{ item.name }}</span>
                    <span v-if="item.children" class="folder-count">({{ item.children.length }})</span>
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
                    <span class="file-icon" aria-hidden="true">{{ getFileIcon(item) }}</span>
                    <span class="file-name">{{ item.name }}</span>
                    <span v-if="getFileSizeDisplay(item)" class="file-size">{{ getFileSizeDisplay(item) }}</span>
                    <span v-if="getCommentCount(item.id) > 0" class="comment-count" :title="\`\${getCommentCount(item.id)} 条评论\`">
                        💬 {{ getCommentCount(item.id) }}
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
        emits: ['file-select', 'folder-toggle', 'toggle-collapse'],
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
                    if (!fileId || typeof fileId !== 'string') {
                        throw createError('文件ID无效', ErrorTypes.VALIDATION, '文件选择');
                    }
                    
                    console.log('[FileTree] 选择文件:', fileId);
                    this.$emit('file-select', fileId);
                }, '文件选择处理');
            },
            
            // 检查文件是否被选中
            isFileSelected(fileId) {
                return safeExecute(() => {
                    console.log('[FileTree] isFileSelected - fileId:', fileId, 'selectedFileId:', this.selectedFileId, 'result:', this.selectedFileId && this.selectedFileId === fileId);
                    return this.selectedFileId && this.selectedFileId === fileId;
                }, '文件选中状态检查');
            },
            
            // 获取文件图标
            getFileIcon(item) {
                return safeExecute(() => {
                    if (item.type === 'folder') {
                        return this.isFolderExpanded(item.id) ? '📂' : '📁';
                    }
                    
                    // 根据文件扩展名返回不同图标
                    const ext = item.name.split('.').pop().toLowerCase();
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
                    
                    const size = item.size;
                    if (size < 1024) return `${size}B`;
                    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
                    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
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
                    
                    const count = this.comments.filter(comment => {
                        // 兼容不同的文件标识方式
                        const commentFileId = comment.fileId || (comment.fileInfo && comment.fileInfo.path);
                        return commentFileId === fileId;
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





