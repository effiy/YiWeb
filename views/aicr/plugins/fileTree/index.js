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
        
        // 将模板插入到DOM中，以便Vue可以找到模板
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = templateText;
        
        // 查找并插入模板脚本
        const templateScripts = tempDiv.querySelectorAll('script[type="text/x-template"]');
        templateScripts.forEach(script => {
            // 检查模板是否已经存在
            if (!document.getElementById(script.id)) {
                document.body.appendChild(script);
            }
        });
        
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
                type: String,
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
                    
                    this.$emit('file-select', fileId);
                }, '文件选择处理');
            },
            
            // 检查文件是否被选中
            isFileSelected(fileId) {
                return safeExecute(() => {
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
        template: '#file-tree-node-template'
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
                type: String,
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
            }
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
                    
                    this.$emit('file-select', fileId);
                }, '文件选择处理');
            },
            
            // 检查文件是否被选中
            isFileSelected(fileId) {
                return safeExecute(() => {
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


