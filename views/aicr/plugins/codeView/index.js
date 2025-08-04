// 代码查看组件 - 负责代码内容的展示和高亮
// 作者：liangliang

import { safeExecute } from '/utils/error.js';
import { loadCSSFiles } from '/utils/baseView.js';
import { showGlobalLoading, hideGlobalLoading } from '/utils/loading.js';

import { postData, getData } from '/apis/index.js';

// 自动加载相关的CSS文件
loadCSSFiles([
    '/views/aicr/plugins/codeView/index.css'
]);

// 异步加载HTML模板
async function loadTemplate() {
    try {
        const response = await fetch('/views/aicr/plugins/codeView/index.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error('加载模板失败:', error);
        return;
    }
}

// 新增：异步获取评论数据
async function fetchCommentsForFile(file) {
    try {
        // 从header-row的选择器获取项目/版本信息
        const projectSelect = document.getElementById('projectSelect');
        const versionSelect = document.getElementById('versionSelect');
        
        let projectId = null;
        let versionId = null;
        
        if (projectSelect) {
            projectId = projectSelect.value;
            console.log('[CodeView] 从选择器获取项目ID:', projectId);
        }
        
        if (versionSelect) {
            versionId = versionSelect.value;
            console.log('[CodeView] 从选择器获取版本ID:', versionId);
        }
        
        // 检查项目/版本信息是否完整
        if (!projectId || !versionId) {
            console.log('[CodeView] 项目/版本信息不完整，跳过MongoDB接口请求');
            console.log('[CodeView] 项目ID:', projectId, '版本ID:', versionId);
            return [];
        }
        
        // 构建API URL
        let url = `${window.API_URL}/mongodb/?cname=comments`;
        url += `&projectId=${projectId}`;
        url += `&versionId=${versionId}`;
        
        if (file) {
            const fileId = file.fileId || file.id || file.path || file.key;
            if (fileId) {
                url += `&fileId=${fileId}`;
            }
        }
        
        console.log('[CodeView] 获取文件评论数据:', url);
        const response = await getData(url, { method: 'GET' });
        console.log('[CodeView] 获取评论数据:', response.data.list);
        
        return Array.isArray(response.data.list) ? response.data.list : [];
    } catch (err) {
        console.error('[CodeView] 获取评论数据失败:', err);
        return [];
    }
}

// 创建组件定义
const createCodeView = async () => {
    const template = await loadTemplate();
    
    return {
        name: 'CodeView',
        props: {
            file: {
                type: Object,
                default: null
            },
            loading: {
                type: Boolean,
                default: false
            },
            error: {
                type: String,
                default: ''
            }
        },
        emits: ['line-click'],
        data() {
            return {
                highlightedLines: [], // 高亮的行号数组
                fileComments: [], // 当前文件的评论数据
                commentsLoading: false, // 评论加载状态
                commentsError: '', // 评论加载错误
                commentMarkers: {}, // 评论标记映射 {lineNumber: [comments]} - 改为响应式对象
                showCommentDetailPopup: false, // 是否显示评论详情弹窗
                currentCommentDetail: null, // 当前显示的评论详情
                commentDetailPosition: { x: 0, y: 0 }, // 评论详情位置
                showCommentPreviewPopup: false, // 是否显示评论预览弹窗
                currentCommentPreview: null, // 当前显示的评论预览
                commentPreviewPosition: { x: 0, y: 0 }, // 评论预览位置
                hoverTimeout: null, // 悬停延迟定时器
                // 新增：弹窗位置偏好记忆
                popupPositionPreference: {
                    horizontal: 'right', // 'right', 'left', 'center'
                    vertical: 'bottom',  // 'top', 'bottom', 'center'
                    lastPosition: null
                },
                // 新增：弹窗状态
                popupState: {
                    isDraggable: false
                }
            };
        },
        computed: {
            // 获取代码行数组
            codeLines() {
                return safeExecute(() => {
                    if (!this.file || !this.file.content) {
                        return [];
                    }
                    
                    // 按行分割代码内容
                    const lines = this.file.content.split('\n');
                    console.log('[CodeView] 代码行数:', lines.length);
                    return lines;
                }, '获取代码行数组');
            },
            
            // 获取语言类型
            languageType() {
                return safeExecute(() => {
                    if (!this.file || !this.file.name) {
                        return 'text';
                    }
                    
                    const fileName = this.file.name.toLowerCase();
                    const extension = fileName.split('.').pop();
                    
                    // 语言映射
                    const languageMap = {
                        'js': 'javascript',
                        'ts': 'typescript',
                        'jsx': 'javascript',
                        'tsx': 'typescript',
                        'html': 'html',
                        'css': 'css',
                        'scss': 'scss',
                        'less': 'less',
                        'json': 'json',
                        'xml': 'xml',
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
                        'sql': 'sql',
                        'sh': 'bash',
                        'md': 'markdown',
                        'txt': 'text'
                    };
                    
                    return languageMap[extension] || 'text';
                }, '获取语言类型');
            },
            
            // 检查是否有活动的弹窗
            hasActivePopup() {
                return this.showCommentDetailPopup || this.showCommentPreviewPopup;
            },
            
            // 检查弹窗冲突
            hasPopupConflict() {
                return this.showCommentDetailPopup && this.showCommentPreviewPopup;
            },
            
            // 新增：计算每行的评论数据，确保响应式更新
            lineComments() {
                const result = {};
                const lineCount = this.codeLines.length;
                
                for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
                    const comments = this.commentMarkers[lineNumber] || [];
                    result[lineNumber] = comments;
                }
                
                return result;
            }
        },
        methods: {
            // 点击行号
            clickLine(lineNumber) {
                return safeExecute(() => {
                    this.$emit('line-click', lineNumber);
                }, '行号点击处理');
            },
            
            // HTML转义
            escapeHtml(text) {
                return safeExecute(() => {
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                }, 'HTML转义');
            },
            
            // 新增：加载文件评论数据
            async loadFileComments() {
                return safeExecute(async () => {
                    if (!this.file) {
                        this.fileComments = [];
                        this.commentMarkers = {}; // 清空评论标记
                        return;
                    }
                    
                    console.log('[CodeView] 开始加载文件评论数据...');
                    this.commentsLoading = true;
                    this.commentsError = '';
                    
                    try {
                        const comments = await fetchCommentsForFile(this.file);
                        this.fileComments = comments;
                        
                        // 构建评论标记映射
                        this.buildCommentMarkers();
                        
                        console.log('[CodeView] 文件评论数据加载完成:', comments.length);
                    } catch (err) {
                        this.commentsError = '加载评论失败';
                        console.error('[CodeView] 评论加载失败:', err);
                    } finally {
                        this.commentsLoading = false;
                    }
                }, '文件评论数据加载');
            },
            
            // 新增：构建评论标记映射
            buildCommentMarkers() {
                // 创建新的评论标记对象
                const newCommentMarkers = {};
                
                console.log('[CodeView] 开始构建评论标记映射，评论数量:', this.fileComments.length);
                
                this.fileComments.forEach(comment => {
                    if (comment.rangeInfo && comment.rangeInfo.startLine) {
                        const startLine = comment.rangeInfo.startLine;
                        const endLine = comment.rangeInfo.endLine || startLine;
                        
                        console.log('[CodeView] 处理评论:', comment.key, '行号范围:', startLine, '-', endLine);
                        
                        // 为范围内的每一行添加评论标记
                        for (let line = startLine; line <= endLine; line++) {
                            if (!newCommentMarkers[line]) {
                                newCommentMarkers[line] = [];
                            }
                            newCommentMarkers[line].push(comment);
                        }
                    }
                });
                
                // 使用Vue的响应式API更新评论标记
                this.commentMarkers = newCommentMarkers;
                
                console.log('[CodeView] 评论标记映射构建完成:', this.commentMarkers);
                console.log('[CodeView] 评论标记行数:', Object.keys(this.commentMarkers).length);
                
                // 确保DOM更新
                this.$nextTick(() => {
                    console.log('[CodeView] DOM更新完成，评论标记已刷新');
                    console.log('[CodeView] lineComments计算属性已更新:', this.lineComments);
                });
            },
            
            // 新增：获取指定行的评论
            getCommentsForLine(lineNumber) {
                const comments = this.lineComments[lineNumber] || [];
                console.log('[CodeView] 获取第', lineNumber, '行的评论，数量:', comments.length);
                return comments;
            },
            
            // 新增：显示评论详情
            showCommentDetail(comment, event) {
                return safeExecute(() => {
                    // 互斥显示：先隐藏预览弹窗
                    this.hideCommentPreview();
                    
                    this.currentCommentDetail = comment;
                    this.showCommentDetailPopup = true;
                    
                    // 等待DOM更新后计算位置
                    this.$nextTick(() => {
                        // 计算新位置
                        this.calculateDetailPosition(event);
                    });
                    
                    // 点击外部关闭
                    setTimeout(() => {
                        document.addEventListener('mousedown', this.handleCommentDetailClickOutside, { passive: true });
                    }, 100);
                }, '显示评论详情');
            },
            
            // 修改：计算详情弹窗位置 - 始终居中显示
            calculateDetailPosition(event) {
                return safeExecute(() => {
                    // 弹窗始终居中显示，不需要复杂的位置计算
                    // 设置默认位置为屏幕中心
                    this.commentDetailPosition = { x: 0, y: 0 };
                    
                    console.log('[CodeView] 弹窗设置为居中显示');
                }, '计算弹窗位置');
            },
            
            // 新增：转换位置为fixed坐标
            convertToFixedPosition(position) {
                const codeContent = this.$refs.codeContent;
                const codeRect = codeContent.getBoundingClientRect();
                const scrollX = window.pageXOffset || document.documentElement.scrollX;
                const scrollY = window.pageYOffset || document.documentElement.scrollY;
                
                // 转换为fixed定位的坐标
                const fixedX = position.x + codeRect.left - scrollX;
                const fixedY = position.y + codeRect.top - scrollY;
                
                // 优化位置计算 - 确保弹窗在视窗内且不被评论区遮挡
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const popupWidth = 400; // 预估弹窗宽度
                const popupHeight = 300; // 预估弹窗高度
                
                // 检查评论区位置
                const commentsPanel = document.querySelector('.aicr-comments');
                let commentsLeft = viewportWidth;
                if (commentsPanel) {
                    const commentsRect = commentsPanel.getBoundingClientRect();
                    commentsLeft = commentsRect.left;
                }
                
                // 智能位置调整
                let optimizedX = fixedX;
                let optimizedY = fixedY;
                
                // 水平位置优化
                if (optimizedX + popupWidth > commentsLeft - 20) {
                    // 如果会与评论区重叠，优先显示在左侧
                    optimizedX = Math.max(20, commentsLeft - popupWidth - 20);
                }
                
                // 确保不超出视窗边界
                if (optimizedX < 20) optimizedX = 20;
                if (optimizedX + popupWidth > viewportWidth - 20) {
                    optimizedX = viewportWidth - popupWidth - 20;
                }
                
                // 垂直位置优化
                if (optimizedY < 20) optimizedY = 20;
                if (optimizedY + popupHeight > viewportHeight - 20) {
                    optimizedY = viewportHeight - popupHeight - 20;
                }
                
                this.commentDetailPosition = { x: optimizedX, y: optimizedY };
                
                // 检查是否在评论区附近，如果是则添加特殊样式
                const popupElement = document.querySelector('.comment-detail-popup');
                if (popupElement) {
                    if (optimizedX + popupWidth > commentsLeft - 50) {
                        popupElement.classList.add('near-comments');
                    } else {
                        popupElement.classList.remove('near-comments');
                    }
                }
                
                console.log('[CodeView] 弹窗位置已优化（基于事件）:', {
                    original: { x: fixedX, y: fixedY },
                    optimized: { x: optimizedX, y: optimizedY },
                    viewport: { width: viewportWidth, height: viewportHeight },
                    commentsLeft: commentsLeft
                });
            },
            
            // 新增：处理评论详情外部点击
            handleCommentDetailClickOutside(event) {
                if (!event.target.closest('.comment-detail-popup')) {
                    this.hideCommentDetail();
                    document.removeEventListener('mousedown', this.handleCommentDetailClickOutside, { passive: true });
                }
            },
            
            // 新增：处理键盘事件（ESC键关闭弹窗）
            handleKeyDown(event) {
                if (event.key === 'Escape') {
                    if (this.showCommentDetailPopup) {
                        this.hideCommentDetail();
                    } else if (this.showCommentPreviewPopup) {
                        this.hideCommentPreview();
                    }
                }
            },
            
            // 新增：隐藏评论详情
            hideCommentDetail() {
                // 添加关闭动画
                const popup = document.querySelector('.comment-detail-popup');
                if (popup) {
                    popup.style.animation = 'commentPopupFadeOut 0.2s ease-out forwards';
                    setTimeout(() => {
                        this.showCommentDetailPopup = false;
                        this.currentCommentDetail = null;
                        console.log('[CodeView] 详情弹窗已关闭，可以重新显示预览弹窗');
                    }, 200);
                } else {
                    this.showCommentDetailPopup = false;
                    this.currentCommentDetail = null;
                    console.log('[CodeView] 详情弹窗已关闭，可以重新显示预览弹窗');
                }
            },
            
            // 新增：格式化时间
            formatTime(timestamp) {
                if (!timestamp) return '';
                const date = new Date(timestamp);
                return date.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            },
            
            // 新增：获取评论状态标签
            getCommentStatusLabel(status) {
                const statusMap = {
                    'pending': '待处理',
                    'resolved': '已解决',
                    'reopened': '重新打开'
                };
                return statusMap[status] || status;
            },
            
            // 新增：获取评论状态样式类
            getCommentStatusClass(status) {
                const classMap = {
                    'pending': 'status-pending',
                    'resolved': 'status-resolved',
                    'reopened': 'status-reopened'
                };
                return classMap[status] || '';
            },
            
            // 新增：解决评论详情
            resolveCommentDetail(commentKey) {
                return safeExecute(() => {
                    console.log('[CodeView] 解决评论:', commentKey);
                    // 触发事件，通知父组件处理
                    this.$emit('comment-resolve', commentKey);
                    // 关闭详情弹窗
                    this.hideCommentDetail();
                }, '解决评论详情');
            },
            
            // 新增：重新打开评论详情
            reopenCommentDetail(commentKey) {
                return safeExecute(() => {
                    console.log('[CodeView] 重新打开评论:', commentKey);
                    // 触发事件，通知父组件处理
                    this.$emit('comment-reopen', commentKey);
                    // 关闭详情弹窗
                    this.hideCommentDetail();
                }, '重新打开评论详情');
            },
            
            // 新增：删除评论详情
            deleteCommentDetail(commentKey) {
                return safeExecute(() => {
                    console.log('[CodeView] 删除评论:', commentKey);
                    if (confirm('确定要删除这条评论吗？')) {
                        // 触发事件，通知父组件处理
                        this.$emit('comment-delete', commentKey);
                        // 关闭详情弹窗
                        this.hideCommentDetail();
                    }
                }, '删除评论详情');
            },
            
            // 新增：显示评论预览（悬停）
            showCommentPreview(comment, event) {
                return safeExecute(() => {
                    console.log('[CodeView] 开始显示评论预览:', comment);
                    
                    // 互斥显示：如果详情弹窗正在显示，则不显示预览弹窗
                    if (this.showCommentDetailPopup) {
                        console.log('[CodeView] 详情弹窗正在显示，跳过预览弹窗');
                        return;
                    }
                    
                    // 清除之前的定时器
                    if (this.hoverTimeout) {
                        clearTimeout(this.hoverTimeout);
                    }
                    
                    // 设置延迟显示，避免鼠标快速移动时频繁显示
                    this.hoverTimeout = setTimeout(() => {
                        // 再次检查互斥状态，确保在延迟期间状态没有变化
                        if (this.showCommentDetailPopup) {
                            console.log('[CodeView] 延迟期间详情弹窗已显示，取消预览弹窗');
                            return;
                        }
                        
                        console.log('[CodeView] 延迟显示评论预览');
                        this.currentCommentPreview = comment;
                        this.showCommentPreviewPopup = true;
                        
                        // 等待DOM更新后计算位置
                        this.$nextTick(() => {
                            this.calculatePreviewPosition(event);
                        });
                    }, 200); // 减少延迟到200ms，提升响应速度
                }, '显示评论预览');
            },
            
            // 新增：计算预览弹窗位置
            calculatePreviewPosition(event) {
                return safeExecute(() => {
                    // 找到对应的 comment-marker 元素
                    const commentKey = this.currentCommentPreview?.key;
                    if (!commentKey) {
                        console.warn('[CodeView] 无法找到预览评论key，使用默认位置计算');
                        const position = this.calculatePopupPosition(event, '.comment-preview-popup', 550, 350);
                        if (position) {
                            this.convertPreviewToFixedPosition(position);
                        }
                        return;
                    }
                    
                    // 查找对应的 comment-marker 元素
                    const markerSelector = `.comment-marker[data-comment-key="${commentKey}"]`;
                    const markerElement = document.querySelector(markerSelector);
                    
                    if (!markerElement) {
                        console.warn('[CodeView] 未找到对应的comment-marker元素:', markerSelector);
                        // 回退到基于事件的位置计算
                        const position = this.calculatePopupPosition(event, '.comment-preview-popup', 550, 350);
                        if (position) {
                            this.convertPreviewToFixedPosition(position);
                        }
                        return;
                    }
                    
                    // 获取marker的位置信息
                    const markerRect = markerElement.getBoundingClientRect();
                    const viewportWidth = window.innerWidth;
                    const viewportHeight = window.innerHeight;
                    const popupWidth = 550; // 进一步增加预估预览弹窗宽度
                    const popupHeight = 350; // 增加预估预览弹窗高度以显示更多内容
                    
                    // 查找comment-markers容器
                    const commentMarkersContainer = markerElement.closest('.comment-markers');
                    let markersContainerRect = null;
                    if (commentMarkersContainer) {
                        markersContainerRect = commentMarkersContainer.getBoundingClientRect();
                    }
                    
                    // 检查评论区位置
                    const commentsPanel = document.querySelector('.aicr-comments');
                    let commentsLeft = viewportWidth;
                    if (commentsPanel) {
                        const commentsRect = commentsPanel.getBoundingClientRect();
                        commentsLeft = commentsRect.left;
                    }
                    
                    // 计算预览弹窗位置 - 根据comment-markers宽度动态调整
                    let x, y;
                    const margin = 8; // 与marker的间距
                    const baseLeftOffset = 20; // 基础左偏移量
                    
                    // 计算动态偏移量：根据comment-markers的宽度和视口尺寸调整
                    let dynamicOffset = baseLeftOffset;
                    if (markersContainerRect) {
                        // 根据comment-markers的宽度计算额外偏移
                        const markersWidth = markersContainerRect.width;
                        
                        // 根据视口宽度动态调整偏移比例
                        const viewportRatio = Math.min(viewportWidth / 1200, 1.5); // 视口宽度比例，最大1.5
                        const baseWidthRatio = 0.3; // 基础宽度比例
                        const adjustedWidthRatio = baseWidthRatio * viewportRatio;
                        
                        // 宽度越大，偏移越多，但设置上限避免过度偏移
                        const maxOffset = Math.min(viewportWidth * 0.15, 60); // 最大偏移量基于视口宽度
                        const widthBasedOffset = Math.min(markersWidth * adjustedWidthRatio, maxOffset);
                        
                        // 根据屏幕密度调整基础偏移
                        const densityFactor = window.devicePixelRatio || 1;
                        const adjustedBaseOffset = baseLeftOffset * Math.min(densityFactor, 1.5);
                        
                        dynamicOffset = adjustedBaseOffset + widthBasedOffset;
                    }
                    
                    // 水平位置：智能适配不同布局和屏幕尺寸
                    if (markersContainerRect) {
                        // 如果有comment-markers容器，使用智能定位
                        const containerLeft = markersContainerRect.left;
                        const containerRight = markersContainerRect.right;
                        const containerWidth = markersContainerRect.width;
                        
                        // 计算可用空间
                        const leftSpace = containerLeft - 20; // 左侧可用空间
                        const rightSpace = commentsLeft - containerRight - 20; // 右侧可用空间
                        const popupSpace = popupWidth + margin + dynamicOffset; // 弹窗所需空间
                        
                        // 智能选择最佳位置
                        if (leftSpace >= popupSpace) {
                            // 左侧空间充足，优先显示在左侧
                            x = containerLeft - popupWidth - margin - dynamicOffset;
                        } else if (rightSpace >= popupWidth + margin) {
                            // 右侧空间充足，显示在右侧
                            x = containerRight + margin;
                        } else if (leftSpace >= popupWidth * 0.7) {
                            // 左侧空间勉强够用，压缩显示
                            x = Math.max(20, containerLeft - popupWidth * 0.8 - margin);
                        } else if (rightSpace >= popupWidth * 0.7) {
                            // 右侧空间勉强够用，压缩显示
                            x = Math.min(commentsLeft - popupWidth * 0.8 - 20, containerRight + margin);
                        } else {
                            // 空间都不够，居中显示但避免重叠
                            const centerX = containerLeft + containerWidth / 2 - popupWidth / 2;
                            x = Math.max(20, Math.min(centerX, commentsLeft - popupWidth - 20));
                        }
                    } else {
                        // 如果没有找到容器，回退到基于单个marker的位置
                        const markerLeft = markerRect.left;
                        const markerRight = markerRect.right;
                        
                        // 计算可用空间
                        const leftSpace = markerLeft - 20;
                        const rightSpace = commentsLeft - markerRight - 20;
                        const popupSpace = popupWidth + margin + baseLeftOffset;
                        
                        if (leftSpace >= popupSpace) {
                            // 左侧空间充足
                            x = markerLeft - popupWidth - margin - baseLeftOffset;
                        } else if (rightSpace >= popupWidth + margin) {
                            // 右侧空间充足
                            x = markerRight + margin;
                        } else {
                            // 居中显示
                            x = Math.max(20, Math.min(markerLeft - baseLeftOffset, commentsLeft - popupWidth - 20));
                        }
                    }
                    
                    // 垂直位置：智能适配不同屏幕高度和布局
                    if (markersContainerRect) {
                        // 如果有comment-markers容器，使用智能垂直定位
                        const containerTop = markersContainerRect.top;
                        const containerBottom = markersContainerRect.bottom;
                        const containerHeight = markersContainerRect.height;
                        const containerCenterY = containerTop + containerHeight / 2;
                        
                        // 计算可用垂直空间
                        const topSpace = containerTop - 20;
                        const bottomSpace = viewportHeight - containerBottom - 20;
                        const popupSpace = popupHeight + margin;
                        
                        // 智能选择最佳垂直位置
                        if (bottomSpace >= popupSpace) {
                            // 下方空间充足，优先显示在下方
                            y = containerBottom + margin;
                        } else if (topSpace >= popupSpace) {
                            // 上方空间充足，显示在上方
                            y = containerTop - popupHeight - margin;
                        } else if (bottomSpace >= popupHeight * 0.8) {
                            // 下方空间勉强够用，压缩显示
                            y = Math.max(20, containerBottom + margin);
                        } else if (topSpace >= popupHeight * 0.8) {
                            // 上方空间勉强够用，压缩显示
                            y = Math.min(viewportHeight - popupHeight * 0.8 - 20, containerTop - popupHeight - margin);
                        } else {
                            // 空间都不够，居中对齐但避免超出边界
                            const centerY = containerCenterY - popupHeight / 2;
                            y = Math.max(20, Math.min(centerY, viewportHeight - popupHeight - 20));
                        }
                    } else {
                        // 如果没有找到容器，回退到基于单个marker的位置
                        const markerTop = markerRect.top;
                        const markerBottom = markerRect.bottom;
                        
                        // 计算可用垂直空间
                        const topSpace = markerTop - 20;
                        const bottomSpace = viewportHeight - markerBottom - 20;
                        const popupSpace = popupHeight + margin;
                        
                        if (bottomSpace >= popupSpace) {
                            // 下方空间充足
                            y = markerBottom + margin;
                        } else if (topSpace >= popupSpace) {
                            // 上方空间充足
                            y = markerTop - popupHeight - margin;
                        } else {
                            // 居中显示
                            y = Math.max(20, Math.min(markerTop, viewportHeight - popupHeight - 20));
                        }
                    }
                    
                    // 边界检查和调整
                    x = Math.max(20, Math.min(x, viewportWidth - popupWidth - 20));
                    y = Math.max(20, Math.min(y, viewportHeight - popupHeight - 20));
                    
                    this.commentPreviewPosition = { x, y };
                    
                    console.log('[CodeView] 预览弹窗位置已优化（智能适配多维度）:', {
                        commentKey: commentKey,
                        marker: { 
                            left: markerRect.left, 
                            top: markerRect.top, 
                            right: markerRect.right, 
                            bottom: markerRect.bottom 
                        },
                        markersContainer: markersContainerRect ? {
                            left: markersContainerRect.left,
                            top: markersContainerRect.top,
                            right: markersContainerRect.right,
                            bottom: markersContainerRect.bottom,
                            width: markersContainerRect.width,
                            height: markersContainerRect.height
                        } : null,
                        position: { x, y },
                        adaptation: {
                            baseLeftOffset: baseLeftOffset,
                            dynamicOffset: dynamicOffset,
                            viewportRatio: markersContainerRect ? Math.min(viewportWidth / 1200, 1.5) : 1,
                            densityFactor: window.devicePixelRatio || 1,
                            availableSpace: {
                                left: markersContainerRect ? markersContainerRect.left - 20 : markerRect.left - 20,
                                right: commentsLeft - (markersContainerRect ? markersContainerRect.right : markerRect.right) - 20,
                                top: markersContainerRect ? markersContainerRect.top - 20 : markerRect.top - 20,
                                bottom: viewportHeight - (markersContainerRect ? markersContainerRect.bottom : markerRect.bottom) - 20
                            }
                        },
                        viewport: { width: viewportWidth, height: viewportHeight },
                        commentsLeft: commentsLeft
                    });
                }, '计算预览弹窗位置（基于comment-markers区块）');
            },
            
            // 新增：转换预览弹窗位置为fixed坐标
            convertPreviewToFixedPosition(position) {
                const codeContent = this.$refs.codeContent;
                const codeRect = codeContent.getBoundingClientRect();
                const scrollX = window.pageXOffset || document.documentElement.scrollX;
                const scrollY = window.pageYOffset || document.documentElement.scrollY;
                
                // 转换为fixed定位的坐标
                const fixedX = position.x + codeRect.left - scrollX;
                const fixedY = position.y + codeRect.top - scrollY;
                
                this.commentPreviewPosition = { x: fixedX, y: fixedY };
                
                console.log('[CodeView] 预览弹窗位置已优化（基于事件）:', {
                    original: { x: position.x, y: position.y },
                    fixed: { x: fixedX, y: fixedY }
                });
            },
            
            // 新增：隐藏评论预览
            hideCommentPreview() {
                return safeExecute(() => {
                    console.log('[CodeView] 开始隐藏评论预览');
                    
                    // 清除定时器
                    if (this.hoverTimeout) {
                        clearTimeout(this.hoverTimeout);
                        this.hoverTimeout = null;
                    }
                    
                    // 延迟隐藏，避免鼠标快速移动时闪烁
                    setTimeout(() => {
                        console.log('[CodeView] 延迟隐藏评论预览');
                        this.showCommentPreviewPopup = false;
                        this.currentCommentPreview = null;
                    }, 150); // 增加延迟到150ms，减少闪烁
                }, '隐藏评论预览');
            },
            
            // 新增：处理评论标记鼠标事件
            handleCommentMarkerMouseEvents(comment, event) {
                return safeExecute(() => {
                    const eventType = event.type;
                    console.log('[CodeView] 评论标记鼠标事件:', eventType, comment);
                    
                    if (eventType === 'mouseenter') {
                        console.log('[CodeView] 鼠标进入评论标记，显示预览');
                        this.showCommentPreview(comment, event);
                    } else if (eventType === 'mouseleave') {
                        console.log('[CodeView] 鼠标离开评论标记，隐藏预览');
                        this.hideCommentPreview();
                    }
                }, '评论标记鼠标事件处理');
            },
            
            // 绑定划词评论事件
            bindSelectionEvent() {
                return safeExecute(() => {
                    const codeContent = this.$refs.codeContent;
                    if (!codeContent) {
                        console.log('[CodeView] codeContent引用不存在，无法绑定选择事件');
                        return;
                    }
                    
                    console.log('[CodeView] 开始绑定选择事件');
                    
                    // 移除之前的事件监听器
                    codeContent.removeEventListener('mouseup', this.handleSelection, { passive: false });
                    codeContent.removeEventListener('touchend', this.handleSelection, { passive: false });
                    codeContent.removeEventListener('mousedown', this.handleMouseDown, { passive: false });
                    
                    // 添加新的事件监听器
                    codeContent.addEventListener('mouseup', this.handleSelection, { passive: false });
                    codeContent.addEventListener('touchend', this.handleSelection, { passive: false });
                    codeContent.addEventListener('mousedown', this.handleMouseDown, { passive: false });
                    
                    console.log('[CodeView] 选择事件绑定完成');
                }, '划词事件绑定');
            },
            
            // 处理鼠标按下事件
            handleMouseDown(event) {
                return safeExecute(() => {
                    console.log('[CodeView] 鼠标按下事件触发');
                    
                    // 如果点击的是评论按钮或其容器，不处理
                    if (event.target.closest('#comment-action-container')) {
                        console.log('[CodeView] 点击的是评论按钮容器，跳过鼠标按下处理');
                        return;
                    }
                    
                    console.log('[CodeView] 清除之前的选择和按钮');
                    // 清除之前的选择和按钮
                    this.clearSelectionAndButton();
                }, '鼠标按下处理');
            },
            
            // 处理文本选择
            handleSelection(event) {
                return safeExecute(() => {
                    // 如果点击的是评论按钮或其容器，不处理选择
                    if (event.target.closest('#comment-action-container')) {
                        console.log('[CodeView] 点击的是评论按钮容器，跳过选择处理');
                        return;
                    }
                    
                    console.log('[CodeView] 文本选择事件触发');
                    
                    // 延迟处理，确保选择完成
                    setTimeout(() => {
                        const selection = window.getSelection();
                        if (!selection || selection.rangeCount === 0) {
                            console.log('[CodeView] 没有有效的选择范围');
                            return;
                        }
                        
                        const range = selection.getRangeAt(0);
                        const selectedText = range.toString().trim();
                        
                        console.log('[CodeView] 选中的文本长度:', selectedText.length);
                        console.log('[CodeView] 选中的文本:', selectedText);
                        
                        if (selectedText.length > 0) {
                            console.log('[CodeView] 创建评论按钮');
                            // 创建评论按钮
                            this.createCommentButton(range, selectedText);
                        } else {
                            console.log('[CodeView] 选中的文本为空，不创建按钮');
                        }
                    }, 50); // 增加延迟时间，确保选择完成
                }, '文本选择处理');
            },
            
            // 清除选择和按钮
            clearSelectionAndButton() {
                return safeExecute(() => {
                    const container = document.querySelector('#comment-action-container');
                    if (container) {
                        container.innerHTML = '';
                        container.style.display = 'none';
                    }
                    
                    // 清除文本选择
                    if (window.getSelection) {
                        window.getSelection().removeAllRanges();
                    }
                }, '清除选择和按钮');
            },
            
            // 创建评论按钮
            createCommentButton(range, selectedText) {
                return safeExecute(() => {
                    // 获取模板里的弹窗容器
                    const codeContent = this.$refs.codeContent;
                    const container = codeContent.querySelector('#comment-action-container');
                    if (!container) return;

                    // 清空容器内容
                    container.innerHTML = '';
                    container.style.display = 'block';
                    
                    // 添加容器状态指示器
                    const indicator = document.createElement('div');
                    indicator.className = 'container-indicator';
                    container.appendChild(indicator);
                    
                    // 添加容器工具提示
                    const tooltip = document.createElement('div');
                    tooltip.className = 'container-tooltip';
                    tooltip.textContent = '点击添加评论';
                    tooltip.setAttribute('role', 'tooltip');
                    tooltip.setAttribute('aria-hidden', 'true');
                    container.appendChild(tooltip);
                    
                    // 添加容器关闭按钮
                    const closeBtn = document.createElement('button');
                    closeBtn.className = 'container-close';
                    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
                    closeBtn.setAttribute('title', '关闭评论操作');
                    closeBtn.setAttribute('aria-label', '关闭评论操作');
                    closeBtn.setAttribute('type', 'button');
                    closeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.clearSelectionAndButton();
                    });
                    closeBtn.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            this.clearSelectionAndButton();
                        }
                    });
                    container.appendChild(closeBtn);

                    // 创建评论按钮 - 优化版本
                    const button = document.createElement('button');
                    button.className = 'comment-action-btn primary';
                    button.type = 'button';
                    button.setAttribute('aria-label', '添加评论');
                    button.setAttribute('title', '添加评论');
                    
                    // 创建图标元素
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-comment-plus';
                    icon.setAttribute('aria-hidden', 'true');
                    
                    // 创建文本元素
                    const text = document.createElement('span');
                    text.textContent = '添加评论';
                    text.className = 'button-text';
                    
                    // 组装按钮内容
                    button.appendChild(icon);
                    button.appendChild(text);
                    
                    console.log('[CodeView] 评论按钮已创建');
                    
                    // 阻止按钮的默认行为和冒泡
                    button.addEventListener('mousedown', e => {
                        console.log('[CodeView] 按钮mousedown事件触发');
                        e.stopPropagation();
                        e.preventDefault();
                    }, { passive: false });
                    
                    button.addEventListener('click', async e => {
                        console.log('[CodeView] 按钮点击事件被触发');
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        
                        // 获取选中的文本和范围信息
                        const currentSelectedText = range.toString().trim();
                        const startContainer = range.startContainer;
                        const endContainer = range.endContainer;
                        
                        // 获取行号信息
                        let startLine = 0, endLine = 0, startChar = 0, endChar = 0;
                        
                        // 获取起始行号
                        if (startContainer.nodeType === 3) { // 文本节点
                            const codeLine = startContainer.parentElement;
                            if (codeLine && codeLine.classList.contains('code-line')) {
                                startLine = parseInt(codeLine.getAttribute('data-line')) || 0;
                                startChar = range.startOffset;
                            }
                        }
                        
                        // 获取结束行号
                        if (endContainer.nodeType === 3) { // 文本节点
                            const codeLine = endContainer.parentElement;
                            if (codeLine && codeLine.classList.contains('code-line')) {
                                endLine = parseInt(codeLine.getAttribute('data-line')) || 0;
                                endChar = range.endOffset;
                            }
                        }
                        
                        // 如果没有获取到行号，尝试从父元素获取
                        if (!startLine) {
                            const startElement = startContainer.nodeType === 3 ? startContainer.parentElement : startContainer;
                            if (startElement && startElement.classList.contains('code-line')) {
                                startLine = parseInt(startElement.getAttribute('data-line')) || 0;
                            }
                        }
                        
                        if (!endLine) {
                            const endElement = endContainer.nodeType === 3 ? endContainer.parentElement : endContainer;
                            if (endElement && endElement.classList.contains('code-line')) {
                                endLine = parseInt(endElement.getAttribute('data-line')) || 0;
                            }
                        }
                        
                        // 确保行号有效
                        if (!startLine) startLine = 1;
                        if (!endLine) endLine = startLine;
                        
                        // 构建选中对象信息
                        const selectedObjectInfo = {
                            text: currentSelectedText,
                            range: {
                                startLine: startLine,
                                endLine: endLine,
                                startChar: startChar,
                                endChar: endChar
                            },
                            selection: {
                                startContainer: startContainer,
                                endContainer: endContainer,
                                startOffset: range.startOffset,
                                endOffset: range.endOffset
                            },
                            timestamp: new Date().toISOString(),
                            fileInfo: {
                                currentFile: this.file || null
                            }
                        };
                        
                        // 打印选中的对象信息
                        console.log('[CodeView] 准备打印选中对象信息');
                        console.log('=== 添加评论按钮点击 - 选中对象信息 ===');
                        console.log('选中的文本:', selectedObjectInfo.text);
                        console.log('行号范围:', selectedObjectInfo.range);
                        console.log('字符位置:', { startChar: selectedObjectInfo.range.startChar, endChar: selectedObjectInfo.range.endChar });
                        console.log('选择范围详情:', selectedObjectInfo.selection);
                        console.log('时间戳:', selectedObjectInfo.timestamp);
                        console.log('文件信息:', selectedObjectInfo.fileInfo);
                        console.log('完整选中对象:', selectedObjectInfo);
                        console.log('==========================================');
                        
                        // 打印已选中的评论者信息
                        console.log('=== 添加评论按钮点击 - 已选中的评论者信息 ===');
                        try {
                            // 方法1: 通过全局变量获取评论面板实例
                            let commentPanelInstance = null;
                            
                            // 尝试从全局Vue应用获取
                            if (window.aicrApp && window.aicrApp.$refs) {
                                const commentPanelRef = window.aicrApp.$refs['comment-panel'];
                                if (commentPanelRef) {
                                    commentPanelInstance = commentPanelRef;
                                    console.log('通过全局应用获取到评论面板实例');
                                }
                            }
                            
                            // 方法2: 通过DOM查询获取
                            if (!commentPanelInstance) {
                                const commentPanelElement = document.querySelector('.comment-panel-container');
                                if (commentPanelElement && commentPanelElement.__vueParentComponent) {
                                    commentPanelInstance = commentPanelElement.__vueParentComponent.component;
                                    console.log('通过DOM查询获取到评论面板实例');
                                }
                            }
                            
                            // 方法3: 通过store获取
                            if (!commentPanelInstance && window.aicrStore) {
                                console.log('尝试通过store获取评论者信息');
                                // 这里可以尝试从store获取评论者信息
                            }
                            
                            if (commentPanelInstance) {
                                console.log('评论面板实例:', commentPanelInstance);
                                console.log('实例属性:', Object.keys(commentPanelInstance));
                                
                                // 尝试不同的属性名获取选中状态
                                const selectedIds = commentPanelInstance.selectedCommenterIds || 
                                                  commentPanelInstance.data?.selectedCommenterIds ||
                                                  [];
                                const commenters = commentPanelInstance.commenters || 
                                                 commentPanelInstance.data?.commenters ||
                                                 [];
                                
                                console.log('选中的评论者ID:', selectedIds);
                                console.log('评论者列表:', commenters);
                                
                                const selectedCommenters = commenters.filter(c => selectedIds.includes(c.id));
                                console.log('选中的评论者数量:', selectedCommenters.length);
                                console.log('选中的评论者详情:', selectedCommenters);
                                
                                if (selectedCommenters.length > 0) {
                                    selectedCommenters.forEach((commenter, index) => {
                                        console.log(`评论者 ${index + 1}:`, {
                                            id: commenter.id,
                                            name: commenter.name,
                                            avatar: commenter.avatar,
                                            forSystem: commenter.forSystem
                                        });
                                    });
                                } else {
                                    console.log('没有选中任何评论者');
                                }
                            } else {
                                console.log('无法找到评论面板组件实例');
                                console.log('可用的全局变量:', Object.keys(window).filter(key => key.includes('aicr')));
                            }
                        } catch (error) {
                            console.error('获取评论者信息时出错:', error);
                            console.error('错误详情:', error.message);
                            console.error('错误堆栈:', error.stack);
                        }
                        console.log('==========================================');
                        
                        // 显示全局loading
                        const { showGlobalLoading, hideGlobalLoading } = await import('/utils/loading.js');
                        showGlobalLoading('正在生成评论，请稍候...');
                        console.log('[CodeView] 显示全局loading');
                        
                        // 触发自定义事件获取评论者信息
                        window.dispatchEvent(new CustomEvent('getSelectedCommenters', {
                            detail: {
                                callback: async (commenters) => {
                                    try {
                                        console.log('=== 通过事件获取的评论者信息 ===');
                                        if (commenters && commenters.length > 0) {
                                            console.log('选中的评论者数量:', commenters.length);
                                            for (const commenter of commenters) {
                                                console.log(`评论者:`, {
                                                    id: commenter.id,
                                                    name: commenter.name,
                                                    avatar: commenter.avatar,
                                                    forSystem: commenter.forSystem
                                                });
                                                if (commenter.forSystem) {
                                                    console.log('评论者系统提示:', commenter.forSystem);
                                                    
                                                    // 发送消息请求到API
                                                    const response = await postData(`${window.API_URL}/prompt`, {
                                                        fromSystem: commenter.forSystem,
                                                        fromUser: `fileId: ${selectedObjectInfo.fileInfo.currentFile.fileId} \n` + selectedObjectInfo.text
                                                    });

                                                    console.log('[API响应] 收到服务器响应:', response.data);

                                                    // 等待所有 postData 完成后再跳转页面
                                                    if (Array.isArray(response.data) && response.data.length > 0) {
                                                        // 获取当前项目/版本信息
                                                        const currentProject = window.aicrStore?.selectedProject?.value;
                                                        const currentVersion = window.aicrStore?.selectedVersion?.value;
                                                        
                                                        // 检查项目/版本信息是否完整
                                                        if (!currentProject || !currentVersion) {
                                                            console.log('[CodeView] 项目/版本信息不完整，跳过MongoDB接口请求');
                                                            console.log('[CodeView] 项目ID:', currentProject, '版本ID:', currentVersion);
                                                            continue;
                                                        }
                                                        
                                                        await Promise.all(
                                                            response.data.map(item => {
                                                                // 构建请求数据，包含项目/版本信息
                                                                const requestData = {
                                                                    ...item,
                                                                    projectId: currentProject,
                                                                    versionId: currentVersion
                                                                };
                                                                
                                                                console.log('[CodeView] 发送评论数据到MongoDB:', requestData);
                                                                return postData(`${window.API_URL}/mongodb/?cname=comments`, requestData);
                                                            })
                                                        );
                                                        
                                                        // 重新加载评论数据
                                                        await this.loadFileComments();
                                                    }
                                                }
                                            }
                                        } else {
                                            console.log('没有选中任何评论者');
                                        }
                                    } catch (error) {
                                        console.error('[CodeView] 评论生成失败:', error);
                                    } finally {
                                        // 隐藏全局loading
                                        hideGlobalLoading();
                                        console.log('[CodeView] 隐藏全局loading');
                                        console.log('==========================================');
                                    }
                                }
                            }
                        }));
                        
                        // 清除按钮和选择
                        this.clearSelectionAndButton();
                    }, { passive: false });

                    // 智能定位策略 - 基于选中文本位置，优先保持在右边
                    const rect = range.getBoundingClientRect();
                    const viewportWidth = window.innerWidth;
                    const viewportHeight = window.innerHeight;
                    
                    // 容器尺寸
                    const containerWidth = 200;
                    const containerHeight = 60;
                    const margin = 16;
                    
                    // 检查评论区位置
                    const commentsPanel = document.querySelector('.aicr-comments');
                    let commentsLeft = viewportWidth;
                    if (commentsPanel) {
                        const commentsRect = commentsPanel.getBoundingClientRect();
                        commentsLeft = commentsRect.left;
                    }
                    
                    // 计算位置 - 优先保持在右边
                    let left, top;
                    
                    // 水平位置：优先显示在右边，避免与评论区重叠
                    if (rect.right + containerWidth + margin <= commentsLeft - 20) {
                        // 右侧有足够空间且不会与评论区重叠
                        left = rect.right + margin;
                        console.log('[CodeView] 显示在选中文本右侧');
                    } else if (commentsLeft - containerWidth - margin >= margin) {
                        // 评论区左侧有足够空间，显示在评论区左侧
                        left = commentsLeft - containerWidth - margin;
                        console.log('[CodeView] 显示在评论区左侧');
                    } else if (rect.left - containerWidth - margin >= margin) {
                        // 选中文本左侧有足够空间
                        left = rect.left - containerWidth - margin;
                        console.log('[CodeView] 显示在选中文本左侧');
                    } else {
                        // 备用方案：显示在视口右侧
                        left = viewportWidth - containerWidth - margin;
                        console.log('[CodeView] 显示在视口右侧');
                    }
                    
                    // 垂直位置：优先显示在选中文本中间
                    const textHeight = rect.height;
                    if (textHeight >= containerHeight) {
                        // 选中文本高度足够，居中显示
                        top = rect.top + (textHeight - containerHeight) / 2;
                    } else {
                        // 选中文本高度不足，显示在文本下方
                        top = rect.bottom + margin;
                    }
                    
                    // 边界检查和调整
                    left = Math.max(margin, Math.min(left, viewportWidth - containerWidth - margin));
                    top = Math.max(margin, Math.min(top, viewportHeight - containerHeight - margin));
                    
                    // 备用定位策略：如果位置无效，使用固定位置
                    if (isNaN(left) || isNaN(top) || left < 0 || top < 0) {
                        left = 20;
                        top = 20;
                        console.log('[CodeView] 使用备用固定位置');
                    }
                    
                    // 应用位置 - 使用fixed定位确保不被评论区遮挡
                    container.style.position = 'fixed';
                    container.style.left = `${left}px`;
                    container.style.top = `${top}px`;
                    container.style.zIndex = 999997; // 提高层级，确保不被评论区遮挡
                    
                    // 添加位置类名用于样式优化
                    container.classList.remove('position-right', 'position-left', 'position-center');
                    if (left >= rect.right) {
                        container.classList.add('position-right');
                    } else if (left <= rect.left - containerWidth) {
                        container.classList.add('position-left');
                    } else {
                        container.classList.add('position-center');
                    }
                    
                    // 确保容器可见并添加动画
                    container.style.opacity = '0';
                    container.style.visibility = 'visible';
                    container.style.transform = 'scale(0.9) translateX(10px)';
                    container.style.display = 'flex';
                    
                    // 使用 requestAnimationFrame 确保位置设置完成后再显示
                    requestAnimationFrame(() => {
                        container.style.opacity = '1';
                        container.style.transform = 'scale(1) translateX(0)';
                        
                        // 确保容器完全可见
                        if (container.offsetWidth === 0 || container.offsetHeight === 0) {
                            console.log('[CodeView] 容器尺寸异常，重新设置');
                            container.style.left = '20px';
                            container.style.top = '20px';
                        }
                    });
                    
                    console.log('[CodeView] 容器定位:', { 
                        left, 
                        top, 
                        rect: { 
                            left: rect.left, 
                            top: rect.top, 
                            bottom: rect.bottom,
                            width: rect.width,
                            height: rect.height
                        }, 
                        viewport: { width: viewportWidth, height: viewportHeight },
                        container: { width: containerWidth, height: containerHeight },
                        position: left < rect.left ? 'left' : 'right'
                    });
                    
                    // 验证容器是否在可视区域内
                    setTimeout(() => {
                        const containerRect = container.getBoundingClientRect();
                        const isVisible = 
                            containerRect.width > 0 && 
                            containerRect.height > 0 && 
                            containerRect.left >= 0 && 
                            containerRect.top >= 0;
                        
                        console.log('[CodeView] 容器可见性检查:', {
                            containerRect: {
                                width: containerRect.width,
                                height: containerRect.height,
                                left: containerRect.left,
                                top: containerRect.top
                            },
                            isVisible
                        });
                    }, 200);

                    container.appendChild(button);

                    // 点击 codeContent 以外区域时关闭弹窗
                    const handleClickOutside = (event) => {
                        if (!container.contains(event.target)) {
                            this.clearSelectionAndButton();
                            document.removeEventListener('mousedown', handleClickOutside);
                        }
                    };
                    document.addEventListener('mousedown', handleClickOutside, { passive: true });
                }, '评论按钮创建');
            },

            // 高亮代码行
            highlightCode(comment) {
                return safeExecute(() => {
                    if (!comment || !comment.rangeInfo) {
                        console.log('[CodeView] 评论或rangeInfo为空');
                        return;
                    }
                    
                    console.log('[CodeView] 点击引用代码，评论信息:', comment);
                    
                    const rangeInfo = comment.rangeInfo;
                    
                    // 确保行号是从1开始的
                    const normalizedRangeInfo = {
                        startLine: rangeInfo.startLine >= 1 ? rangeInfo.startLine : rangeInfo.startLine + 1,
                        endLine: rangeInfo.endLine >= 1 ? rangeInfo.endLine : rangeInfo.endLine + 1,
                        startChar: rangeInfo.startChar,
                        endChar: rangeInfo.endChar
                    };
                    
                    console.log('[CodeView] 原始行号:', rangeInfo.startLine, '-', rangeInfo.endLine);
                    console.log('[CodeView] 标准化行号:', normalizedRangeInfo.startLine, '-', normalizedRangeInfo.endLine);
                    
                    // 直接调用高亮方法
                    this.highlightLines(normalizedRangeInfo);
                }, '高亮代码区行');
            },

            // 高亮代码行
            highlightLines(rangeInfo) {
                return safeExecute(() => {
                    if (!rangeInfo) {
                        console.log('[CodeView] 没有rangeInfo信息');
                        return;
                    }
                    
                    let start = rangeInfo.startLine || 0;
                    let end = rangeInfo.endLine || start;
                    if (start > end) [start, end] = [end, start];
                    
                    // 确保行号是正整数且从1开始
                    start = Math.max(1, Math.floor(start));
                    end = Math.max(1, Math.floor(end));
                    
                    console.log('[CodeView] 高亮行号范围:', start, '到', end);
                    
                    // 设置高亮
                    this.highlightedLines = [];
                    for (let i = start; i <= end; i++) {
                        this.highlightedLines.push(i);
                    }
                    console.log('[CodeView] 设置高亮行号数组:', this.highlightedLines);
                    
                    // 自动滚动到首行
                    this.$nextTick(() => {
                        const codeContent = this.$refs.codeContent;
                        if (!codeContent) return;
                        
                        console.log('[CodeView] 查找目标行:', start);
                        const target = codeContent.querySelector(`.code-line[data-line='${start}']`);
                        
                        if (target) {
                            console.log('[CodeView] 找到目标行，滚动到位置');
                            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        } else {
                            console.log('[CodeView] 未找到目标行，尝试查找所有行');
                            const allLines = codeContent.querySelectorAll('.code-line');
                            console.log('[CodeView] 总行数:', allLines.length);
                            if (allLines.length > 0 && start <= allLines.length) {
                                const targetLine = allLines[start - 1];
                                if (targetLine) {
                                    console.log('[CodeView] 通过索引找到目标行');
                                    targetLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                            }
                        }
                    });
                    
                    // 3秒后自动取消高亮
                    setTimeout(() => {
                        this.highlightedLines = [];
                    }, 3000);
                }, '高亮代码行');
            },

            // 处理高亮事件
            handleHighlightLines(event) {
                console.log('[CodeView] 收到高亮事件:', event.detail);
                
                // 兼容旧的事件格式
                let rangeInfo = event.detail;
                if (event.detail && event.detail.rangeInfo) {
                    rangeInfo = event.detail.rangeInfo;
                }
                
                if (!rangeInfo) {
                    console.log('[CodeView] 没有rangeInfo信息');
                    return;
                }
                
                // 调用统一的高亮方法
                this.highlightLines(rangeInfo);
            },

            // 新增：通用弹窗位置计算工具
            calculatePopupPosition(event, popupSelector, defaultWidth = 550, defaultHeight = 350) {
                return safeExecute(() => {
                    const rect = event.target.getBoundingClientRect();
                    const codeContent = this.$refs.codeContent;
                    const codeRect = codeContent.getBoundingClientRect();
                    
                    // 获取实际的弹窗元素
                    const popupElement = document.querySelector(popupSelector);
                    if (!popupElement) {
                        console.warn('[CodeView] 未找到弹窗元素:', popupSelector);
                        return { x: 0, y: 0 };
                    }
                    
                    // 获取实际弹窗尺寸
                    const popupRect = popupElement.getBoundingClientRect();
                    const popupWidth = popupRect.width || defaultWidth;
                    const popupHeight = popupRect.height || defaultHeight;
                    
                    // 获取视窗信息
                    const viewportWidth = window.innerWidth;
                    const viewportHeight = window.innerHeight;
                    const scrollX = window.pageXOffset || document.documentElement.scrollX;
                    const scrollY = window.pageYOffset || document.documentElement.scrollY;
                    
                    // 计算标记位置相对于视窗的坐标
                    const markerLeft = rect.left + scrollX;
                    const markerTop = rect.top + scrollY;
                    const markerRight = rect.right + scrollX;
                    const markerBottom = rect.bottom + scrollY;
                    const markerCenterX = markerLeft + rect.width / 2;
                    const markerCenterY = markerTop + rect.height / 2;
                    
                    // 计算最佳位置 - 增强版智能算法
                    let x, y;
                    const margin = 16; // 增加边距，提供更好的视觉体验
                    
                    // 水平位置计算 - 多策略智能选择
                    const rightSpace = viewportWidth - markerRight - margin;
                    const leftSpace = markerLeft - margin;
                    const centerSpace = Math.min(rightSpace, leftSpace);
                    
                    // 策略1：优先右侧显示（符合阅读习惯）
                    if (rightSpace >= popupWidth * 0.8) {
                        x = markerRight + 12;
                    }
                    // 策略2：左侧有更好空间
                    else if (leftSpace >= popupWidth * 0.8 && leftSpace > rightSpace) {
                        x = markerLeft - popupWidth - 12;
                    }
                    // 策略3：尝试居中显示
                    else if (centerSpace >= popupWidth * 0.6) {
                        x = markerCenterX - popupWidth / 2;
                    }
                    // 策略4：强制右侧显示（即使空间不够）
                    else if (rightSpace >= popupWidth * 0.5) {
                        x = markerRight + 8;
                    }
                    // 策略5：强制左侧显示
                    else if (leftSpace >= popupWidth * 0.5) {
                        x = markerLeft - popupWidth - 8;
                    }
                    // 策略6：最后选择，居中显示
                    else {
                        x = Math.max(margin, (viewportWidth - popupWidth) / 2);
                    }
                    
                    // 垂直位置计算 - 智能优先级
                    const bottomSpace = viewportHeight - markerBottom - margin;
                    const topSpace = markerTop - margin;
                    const centerY = markerCenterY - popupHeight / 2;
                    
                    // 策略1：优先下方显示（避免遮挡标记）
                    if (bottomSpace >= popupHeight * 0.8) {
                        y = markerBottom + 12;
                    }
                    // 策略2：上方有更好空间
                    else if (topSpace >= popupHeight * 0.8 && topSpace > bottomSpace) {
                        y = markerTop - popupHeight - 12;
                    }
                    // 策略3：尝试垂直居中
                    else if (centerY >= scrollY + margin && centerY + popupHeight <= scrollY + viewportHeight - margin) {
                        y = centerY;
                    }
                    // 策略4：强制下方显示
                    else if (bottomSpace >= popupHeight * 0.5) {
                        y = markerBottom + 8;
                    }
                    // 策略5：强制上方显示
                    else if (topSpace >= popupHeight * 0.5) {
                        y = markerTop - popupHeight - 8;
                    }
                    // 策略6：最后选择，显示在可用空间内
                    else {
                        const availableHeight = viewportHeight - 2 * margin;
                        if (popupHeight > availableHeight) {
                            // 弹窗太高，显示在顶部并允许滚动
                            y = scrollY + margin;
                        } else {
                            // 居中显示
                            y = scrollY + (availableHeight - popupHeight) / 2;
                        }
                    }
                    
                    // 边界检查和调整
                    x = Math.max(margin, Math.min(x, viewportWidth - popupWidth - margin));
                    y = Math.max(scrollY + margin, Math.min(y, scrollY + viewportHeight - popupHeight - margin));
                    
                    // 转换为相对于代码容器的坐标
                    const relativeX = x - codeRect.left;
                    const relativeY = y - codeRect.top;
                    
                    const position = { x: relativeX, y: relativeY };
                    
                    console.log('[CodeView] 弹窗位置计算完成:', {
                        selector: popupSelector,
                        marker: { left: markerLeft, top: markerTop, right: markerRight, bottom: markerBottom, centerX: markerCenterX, centerY: markerCenterY },
                        popup: { width: popupWidth, height: popupHeight },
                        viewport: { width: viewportWidth, height: viewportHeight },
                        scroll: { x: scrollX, y: scrollY },
                        spaces: { right: rightSpace, left: leftSpace, bottom: bottomSpace, top: topSpace, center: centerSpace },
                        position: position,
                        strategy: 'enhanced'
                    });
                    
                    // 学习用户的位置偏好
                    this.learnPositionPreference(position, { x: markerCenterX, y: markerCenterY });
                    
                    return position;
                }, '计算弹窗位置');
            },
            
            // 新增：学习用户的位置偏好
            learnPositionPreference(popupPosition, markerPosition) {
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                
                // 计算弹窗相对于标记的位置
                const relativeX = popupPosition.x - markerPosition.x;
                const relativeY = popupPosition.y - markerPosition.y;
                
                // 更新水平偏好
                if (relativeX > 50) {
                    this.popupPositionPreference.horizontal = 'right';
                } else if (relativeX < -50) {
                    this.popupPositionPreference.horizontal = 'left';
                } else {
                    this.popupPositionPreference.horizontal = 'center';
                }
                
                // 更新垂直偏好
                if (relativeY > 50) {
                    this.popupPositionPreference.vertical = 'bottom';
                } else if (relativeY < -50) {
                    this.popupPositionPreference.vertical = 'top';
                } else {
                    this.popupPositionPreference.vertical = 'center';
                }
                
                // 记录最后的位置
                this.popupPositionPreference.lastPosition = {
                    x: popupPosition.x,
                    y: popupPosition.y,
                    timestamp: Date.now()
                };
                
                console.log('[CodeView] 位置偏好已更新:', this.popupPositionPreference);
            },
            
            // 新增：统一处理弹窗互斥逻辑
            ensurePopupMutualExclusion() {
                // 检查是否有冲突
                if (this.hasPopupConflict) {
                    console.log('[CodeView] 检测到弹窗冲突，隐藏预览弹窗');
                    this.hideCommentPreview();
                }
            },
            
            // 新增：恢复拖拽位置
            restoreDragPosition() {
                // 拖拽功能已移除，此方法不再需要
                console.log('[CodeView] 拖拽功能已移除');
            }
        },
        template: template,
        // 生命周期钩子
        async mounted() {
            return safeExecute(async () => {
                console.log('[CodeView] 组件已挂载');
                
                // 加载文件评论数据
                await this.loadFileComments();
                
                // 绑定选择事件
                this.bindSelectionEvent();
                
                // 绑定高亮代码行事件监听
                window.addEventListener('highlightCodeLines', this.handleHighlightLines);
                
                // 绑定窗口大小变化监听
                window.addEventListener('resize', this.handleWindowResize);
                
                // 绑定键盘事件监听
                document.addEventListener('keydown', this.handleKeyDown);
                
                // 新增：监听评论数据变化事件
                window.addEventListener('reloadComments', this.handleCommentsReload);
                
                console.log('[CodeView] 组件挂载完成');
            }, 'CodeView组件挂载');
        },
        
        updated() {
            return safeExecute(() => {
                console.log('[CodeView] 组件已更新');
                
                // 重新绑定选择事件，确保在组件更新后事件监听器仍然有效
                this.bindSelectionEvent();
            }, 'CodeView组件更新');
        },
        
        beforeUnmount() {
            return safeExecute(() => {
                console.log('[CodeView] 组件即将卸载');
                
                // 移除选择事件监听
                const codeContent = this.$refs.codeContent;
                if (codeContent) {
                    codeContent.removeEventListener('mouseup', this.handleSelection, { passive: false });
                    codeContent.removeEventListener('touchend', this.handleSelection, { passive: false });
                    codeContent.removeEventListener('mousedown', this.handleMouseDown, { passive: false });
                }
                
                // 移除高亮代码行事件监听
                window.removeEventListener('highlightCodeLines', this.handleHighlightLines);
                
                // 移除窗口大小变化监听
                window.removeEventListener('resize', this.handleWindowResize);
                
                // 移除键盘事件监听
                document.removeEventListener('keydown', this.handleKeyDown);
                
                // 移除评论数据变化事件监听
                window.removeEventListener('reloadComments', this.handleCommentsReload);
                
                // 清理定时器
                if (this.hoverTimeout) {
                    clearTimeout(this.hoverTimeout);
                }
                
                // 移除外部点击监听
                document.removeEventListener('mousedown', this.handleCommentDetailClickOutside, { passive: true });
            }, 'CodeView组件卸载');
        },
        
        // 新增：处理评论数据重新加载
        handleCommentsReload(event) {
            return safeExecute(async () => {
                console.log('[CodeView] 收到评论重新加载事件:', event.detail);
                console.log('[CodeView] 当前文件:', this.file);
                console.log('[CodeView] 当前评论标记数量:', Object.keys(this.commentMarkers).length);
                console.log('[CodeView] 当前lineComments状态:', this.lineComments);
                
                // 如果当前有显示的评论详情弹窗，关闭它
                if (this.showCommentDetailPopup) {
                    console.log('[CodeView] 关闭评论详情弹窗');
                    this.hideCommentDetail();
                }
                
                // 如果当前有显示的评论预览弹窗，关闭它
                if (this.showCommentPreviewPopup) {
                    console.log('[CodeView] 关闭评论预览弹窗');
                    this.hideCommentPreview();
                }
                
                // 重新加载文件评论数据
                console.log('[CodeView] 开始重新加载文件评论数据');
                await this.loadFileComments();
                
                // 强制触发Vue的重新渲染
                console.log('[CodeView] 强制触发Vue重新渲染');
                this.$forceUpdate();
                
                // 等待DOM更新完成
                await this.$nextTick();
                console.log('[CodeView] 评论数据重新加载完成，新的评论标记数量:', Object.keys(this.commentMarkers).length);
                console.log('[CodeView] 新的lineComments状态:', this.lineComments);
                
                // 重新绑定选择事件，确保选择功能正常工作
                console.log('[CodeView] 重新绑定选择事件');
                this.bindSelectionEvent();
            }, '处理评论数据重新加载');
        },
        
        // 监听文件变化
        watch: {
            file: {
                handler: async function(newFile, oldFile) {
                    if (newFile !== oldFile) {
                        console.log('[CodeView] 文件已变化，重新加载评论数据');
                        await this.loadFileComments();
                    }
                },
                immediate: false
            }
        },
        
        // 新增：处理窗口大小变化
        handleWindowResize() {
            return safeExecute(() => {
                console.log('[CodeView] 窗口大小变化，重新计算弹窗位置');
                
                // 延迟执行，确保DOM已更新
                setTimeout(() => {
                    // 互斥检查：如果详情弹窗正在显示，隐藏预览弹窗
                    if (this.showCommentDetailPopup && this.showCommentPreviewPopup) {
                        console.log('[CodeView] 窗口大小变化时发现冲突，隐藏预览弹窗');
                        this.hideCommentPreview();
                    }
                    
                    // 如果详情弹窗正在显示，重新计算位置
                    if (this.showCommentDetailPopup && this.currentCommentDetail) {
                        console.log('[CodeView] 重新计算详情弹窗位置');
                        // 这里可以添加重新计算位置的逻辑
                    }
                    
                    // 如果预览弹窗正在显示，重新约束位置
                    if (this.showCommentPreviewPopup && this.currentCommentPreview) {
                        console.log('[CodeView] 重新约束预览弹窗位置');
                        const popupElement = document.querySelector('.comment-preview-popup');
                        if (popupElement) {
                            const rect = popupElement.getBoundingClientRect();
                            const viewportWidth = window.innerWidth;
                            const viewportHeight = window.innerHeight;
                            
                            // 简单的边界约束
                            let x = this.commentPreviewPosition.x;
                            let y = this.commentPreviewPosition.y;
                            
                            if (x < 20) x = 20;
                            if (x + rect.width > viewportWidth - 20) {
                                x = viewportWidth - rect.width - 20;
                            }
                            if (y < 20) y = 20;
                            if (y + rect.height > viewportHeight - 20) {
                                y = viewportHeight - rect.height - 20;
                            }
                            
                            this.commentPreviewPosition = { x, y };
                        }
                    }
                }, 100);
            }, '处理窗口大小变化');
        }
    };
};

// 初始化组件并全局暴露
(async function initComponent() {
    try {
        const CodeView = await createCodeView();
        window.CodeView = CodeView;
        
        // 触发自定义事件，通知组件已加载完成
        window.dispatchEvent(new CustomEvent('CodeViewLoaded', { detail: CodeView }));
        
        console.log('[CodeView] 组件初始化完成');
    } catch (error) {
        console.error('CodeView 组件初始化失败:', error);
    }
})();













