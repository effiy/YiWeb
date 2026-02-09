// 项目文件列表组件
// 作者：liangliang

import { registerGlobalComponent } from '/src/utils/componentLoader.js';
import { getData } from '/src/services/index.js';
import { formatDate } from '/src/utils/date.js';
import { safeExecute } from '/src/utils/error.js';
import { renderMarkdownHtml } from '/src/utils/markdownRenderer.js';
// 导入日志工具，确保 window.logError 等函数可用
import '/src/utils/log.js';



// 时间格式化
function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    
    return date.toLocaleDateString('zh-CN', { 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// 获取文件类型图标
function getFileTypeIcon(file) {
    const fileExtension = file.fileName ? file.fileName.split('.').pop() : '';
    const fileType = getFileType(fileExtension);
    
    const iconMap = {
        'javascript': 'fab fa-js-square',
        'typescript': 'fab fa-js-square',
        'react': 'fab fa-react',
        'vue': 'fab fa-vuejs',
        'html': 'fab fa-html5',
        'css': 'fab fa-css3-alt',
        'json': 'fas fa-code',
        'python': 'fab fa-python',
        'java': 'fab fa-java',
        'cpp': 'fas fa-code',
        'c': 'fas fa-code',
        'php': 'fab fa-php',
        'ruby': 'fas fa-gem',
        'go': 'fab fa-golang',
        'rust': 'fas fa-crab',
        'swift': 'fab fa-swift',
        'kotlin': 'fas fa-code',
        'scala': 'fas fa-code',
        'shell': 'fas fa-terminal',
        'sql': 'fas fa-database',
        'docker': 'fab fa-docker',
        'git': 'fab fa-git-alt',
        'text': 'fas fa-file-alt',
        'log': 'fas fa-file-alt',
        'config': 'fas fa-cog',
        'markdown': 'fab fa-markdown',
        'other': 'fas fa-file'
    };
    
    return iconMap[fileType] || 'fas fa-file';
}

// 获取文件类型标签
function getFileTypeLabel(fileType) {
    const labelMap = {
        'javascript': 'JavaScript',
        'typescript': 'TypeScript',
        'react': 'React',
        'vue': 'Vue',
        'html': 'HTML',
        'css': 'CSS',
        'json': 'JSON',
        'python': 'Python',
        'java': 'Java',
        'cpp': 'C++',
        'c': 'C',
        'php': 'PHP',
        'ruby': 'Ruby',
        'go': 'Go',
        'rust': 'Rust',
        'swift': 'Swift',
        'kotlin': 'Kotlin',
        'scala': 'Scala',
        'shell': 'Shell',
        'sql': 'SQL',
        'docker': 'Docker',
        'git': 'Git',
        'text': '文本',
        'log': '日志',
        'config': '配置',
        'markdown': 'Markdown',
        'other': '其他'
    };
    
    return labelMap[fileType] || fileType || '未知';
}

// 获取文件状态图标
function getFileStatusIcon(status) {
    const iconMap = {
        'new': 'fas fa-plus-circle',
        'modified': 'fas fa-edit',
        'deleted': 'fas fa-trash',
        'moved': 'fas fa-arrows-alt',
        'renamed': 'fas fa-tag'
    };
    
    return iconMap[status] || 'fas fa-circle';
}

// 获取文件状态标签
function getFileStatusLabel(status) {
    const labelMap = {
        'new': '新增',
        'modified': '修改',
        'deleted': '删除',
        'moved': '移动',
        'renamed': '重命名'
    };
    
    return labelMap[status] || status || '';
}

// 根据文件扩展名获取文件类型
function getFileType(extension) {
    if (!extension) return 'other';
    
    const ext = extension.toLowerCase();
    const typeMap = {
        'js': 'javascript',
        'ts': 'typescript',
        'jsx': 'react',
        'tsx': 'react',
        'vue': 'vue',
        'html': 'html',
        'css': 'css',
        'scss': 'css',
        'sass': 'css',
        'less': 'css',
        'json': 'json',
        'xml': 'xml',
        'yaml': 'yaml',
        'yml': 'yaml',
        'md': 'markdown',
        'py': 'python',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'php': 'php',
        'rb': 'ruby',
        'go': 'go',
        'rs': 'rust',
        'swift': 'swift',
        'kt': 'kotlin',
        'scala': 'scala',
        'sh': 'shell',
        'bat': 'shell',
        'ps1': 'shell',
        'sql': 'sql',
        'dockerfile': 'docker',
        'dockerignore': 'docker',
        'gitignore': 'git',
        'gitattributes': 'git',
        'txt': 'text',
        'log': 'log',
        'conf': 'config',
        'ini': 'config',
        'env': 'config'
    };
    
    return typeMap[ext] || 'other';
}

function getContrastingTextColor(hexColor) {
    if (!hexColor || typeof hexColor !== 'string') return '#ffffff';
    const hex = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
    if (hex.length !== 6) return '#ffffff';
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 170 ? '#111827' : '#ffffff';
}

const componentOptions = {
    name: 'ProjectFilesList',
    css: '/src/components/common/projectFilesList/index.css',
    html: '/src/components/common/projectFilesList/index.html',
    props: {
            // 项目文件数据
            projectFiles: {
                type: Array,
                default: () => []
            },
            // 过滤后的项目文件数据
            filteredProjectFiles: {
                type: Array,
                default: () => []
            },
            // 加载状态
            loading: {
                type: Boolean,
                default: false
            },
            // 错误信息
            error: {
                type: String,
                default: ''
            },
            // 搜索查询
            searchQuery: {
                type: String,
                default: ''
            },
            // 当前日期显示
            currentDateDisplay: {
                type: String,
                default: ''
            },
            // 点击过的项目文件项
            clickedItems: {
                type: Set,
                default: () => new Set()
            },
            // 已读项目文件集合
            readItems: {
                type: Set,
                default: () => new Set()
            },
            // 收藏项目文件集合
            favoriteItems: {
                type: Set,
                default: () => new Set()
            },
            // 是否有项目文件数据
            hasProjectFilesData: {
                type: Boolean,
                default: false
            }
        },
        emits: ['project-file-click', 'toggle-favorite', 'load-project-files-data'],
        data() {
            return {
                internalLoading: this.loading,
                internalError: this.error,
                internalProjectFiles: this.projectFiles || []
            };
        },
        watch: {
            loading(val) {
                this.internalLoading = val;
            },
            error(val) {
                this.internalError = val;
            },
            projectFiles(val) {
                this.internalProjectFiles = val || [];
            }
        },
        methods: {
            openProjectFile(file) {
                try {
                    this.$emit('project-file-click', file);
                } catch (e) {
                    console.error('[ProjectFilesList] 打开项目文件失败:', e);
                }
            },
            getFileTypeClass(file) {
                const fileExtension = file.fileName ? file.fileName.split('.').pop() : '';
                const fileType = getFileType(fileExtension);
                return `type-${fileType}`;
            },
            getFileTypeFromFile(file) {
                const fileExtension = file.fileName ? file.fileName.split('.').pop() : '';
                return getFileType(fileExtension);
            },
            getFileTypeColor(file) {
                const fileType = this.getFileTypeFromFile(file);
                const colorMap = {
                    'javascript': '#f7df1e',
                    'typescript': '#3178c6',
                    'react': '#61dafb',
                    'vue': '#4fc08d',
                    'html': '#e34f26',
                    'css': '#1572b6',
                    'json': '#000',
                    'python': '#3776ab',
                    'java': '#007396',
                    'cpp': '#00599c',
                    'c': '#a8b9cc',
                    'php': '#777bb4',
                    'ruby': '#cc342d',
                    'go': '#00add8',
                    'rust': '#000',
                    'swift': '#fa7343',
                    'kotlin': '#7f52ff',
                    'scala': '#dc322f',
                    'shell': '#89e051',
                    'sql': '#336791',
                    'docker': '#2496ed',
                    'git': '#f14c28',
                    'text': '#6c757d',
                    'log': '#6c757d',
                    'config': '#6c757d',
                    'markdown': '#000',
                    'other': '#6c757d'
                };
                return colorMap[fileType] || '#6c757d';
            },
            getFileTypeStyle(file) {
                const backgroundColor = this.getFileTypeColor(file);
                return {
                    backgroundColor,
                    color: getContrastingTextColor(backgroundColor)
                };
            },
            getFileTypeIcon,
            getFileTypeLabel,
            getFileStatusIcon,
            getFileStatusLabel,
            getFileStatusClass(status) {
                if (!status) return '';
                return `status-${status}`;
            },
            formatTime,
            // 检查是否已读
            isRead(file) {
                const key = file.filePath || file.fileName || file.title;
                return this.readItems.has(key);
            },
            // 检查是否收藏
            isFavorited(file) {
                const key = file.filePath || file.fileName || file.title;
                return this.favoriteItems.has(key);
            },
            // 检查是否高亮
            isHighlighted(file) {
                const key = file.filePath || file.fileName || file.title;
                return this.clickedItems.has(key);
            },
            // 提取文件摘要
            extractFileExcerpt(file) {
                if (file.description) return file.description;
                if (file.content) {
                    // 移除Markdown标记和代码块
                    let content = file.content.replace(/```[\s\S]*?```/g, '');
                    content = content.replace(/`[^`]+`/g, '');
                    content = content.replace(/#{1,6}\s+/g, '');
                    content = content.replace(/\*\*([^*]+)\*\*/g, '$1');
                    content = content.replace(/\*([^*]+)\*/g, '$1');
                    return content.substring(0, 150) + '...';
                }
                return '暂无描述';
            },
            // 获取文件统计信息
            getFileStats() {
                const total = this.projectFiles.length;
                const read = Array.from(this.readItems).length;
                const fav = Array.from(this.favoriteItems).length;
                return {
                    total,
                    read,
                    fav,
                    hasData: total > 0
                };
            },
            // 将Markdown渲染为HTML
            renderMarkdown(text) {
                return safeExecute(() => {
                    if (!text) return '';
                    
                    // 检查是否为JSON对象
                    let processedText = text;
                    let isJsonContent = false;
                    
                    if (typeof text === 'object') {
                        try {
                            processedText = JSON.stringify(text, null, 2);
                            isJsonContent = true;
                        } catch (e) {
                            processedText = text.toString();
                        }
                    } else if (typeof text === 'string') {
                        try {
                            const parsed = JSON.parse(text);
                            if (typeof parsed === 'object' && parsed !== null) {
                                processedText = JSON.stringify(parsed, null, 2);
                                isJsonContent = true;
                            }
                        } catch (e) {
                            processedText = text;
                        }
                    }

                    if (isJsonContent) {
                        processedText = `\`\`\`json\n${processedText}\n\`\`\``;
                    }

                    return renderMarkdownHtml(processedText, { breaks: true, gfm: true });
                }, 'Markdown渲染(ProjectFilesList)');
            },
            
            // 导出数据
            async exportData() {
                try {
                    // 动态导入导出工具
                    const { exportCategoryData } = await import('/src/utils/exportUtils.js');
                    
                    // 准备项目文件数据
                    const projectFilesData = this.internalProjectFiles.map(file => ({
                        ...file,
                        fileName: file.fileName || file.fileId || '未命名文件',
                        filePath: file.filePath || file.fileId || '未知路径',
                        fileType: this.getFileTypeFromFile(file),
                        fileSize: file.fileSize || '未知',
                        lastModified: file.updatedTime || file.lastModified,
                        createdAt: file.createdAt || file.createdTime,
                        description: file.description || this.extractFileExcerpt(file),
                        tags: file.tags || [],
                        content: file.content || ''
                    }));
                    
                    // 导出项目文件数据
                    const success = await exportCategoryData(
                        projectFilesData, 
                        '项目文件', 
                        `项目文件_${this.currentDateDisplay || new Date().toISOString().slice(0, 10)}`
                    );
                    
                    if (success) {
                        console.log('[ProjectFilesList] 导出成功');
                        // 可以添加成功提示
                    } else {
                        console.error('[ProjectFilesList] 导出失败');
                        // 可以添加失败提示
                    }
                } catch (error) {
                    console.error('[ProjectFilesList] 导出过程中出错:', error);
                }
            }
    },
    mounted() {
        console.log('[ProjectFilesList] mounted');
    }
};

registerGlobalComponent(componentOptions);
