// 代码查看组件 - 负责代码内容的展示和高亮
// 作者：liangliang

import { safeExecute } from '/utils/error.js';
import { loadCSSFiles } from '/utils/baseView.js';
import { showGlobalLoading, hideGlobalLoading } from '/utils/loading.js';

import { postData } from '/apis/index.js';

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
                // 已无与code-actions相关的数据
                highlightedLines: [] // 新增：高亮的行号数组
            };
        },
        computed: {
            // 获取代码行数组
            codeLines() {
                return safeExecute(() => {
                    if (!this.file || !this.file.content) return [];
                    return this.file.content.split('\n');
                }, '代码行分割');
            },
            
            // 获取语言类型
            languageType() {
                return safeExecute(() => {
                    if (!this.file) return 'text';
                    return this.file.language || 'text';
                }, '语言类型获取');
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
            
            // 绑定划词评论事件
            bindSelectionEvent() {
                return safeExecute(() => {
                    const codeContent = this.$refs.codeContent;
                    if (!codeContent) return;
                    
                    // 移除之前的事件监听器
                    codeContent.removeEventListener('mouseup', this.handleSelection, { passive: false });
                    codeContent.removeEventListener('touchend', this.handleSelection, { passive: false });
                    codeContent.removeEventListener('mousedown', this.handleMouseDown, { passive: false });
                    
                    // 添加新的事件监听器
                    codeContent.addEventListener('mouseup', this.handleSelection, { passive: false });
                    codeContent.addEventListener('touchend', this.handleSelection, { passive: false });
                    codeContent.addEventListener('mousedown', this.handleMouseDown, { passive: false });
                }, '划词事件绑定');
            },
            
            // 处理鼠标按下事件
            handleMouseDown(event) {
                return safeExecute(() => {
                    // 如果点击的是评论按钮或其容器，不处理
                    if (event.target.closest('#comment-action-container')) {
                        return;
                    }
                    
                    // 清除之前的选择和按钮
                    this.clearSelectionAndButton();
                }, '鼠标按下处理');
            },
            
            // 处理文本选择
            handleSelection(event) {
                return safeExecute(() => {
                    // 如果点击的是评论按钮或其容器，不处理选择
                    if (event.target.closest('#comment-action-container')) {
                        return;
                    }
                    
                    // 延迟处理，确保选择完成
                    setTimeout(() => {
                        const selection = window.getSelection();
                        if (!selection || selection.rangeCount === 0) return;
                        
                        const range = selection.getRangeAt(0);
                        const selectedText = range.toString().trim();
                        
                        if (selectedText.length > 0) {
                            // 创建评论按钮
                            this.createCommentButton(range, selectedText);
                        }
                    }, 10);
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

                    // 创建评论按钮
                    const button = document.createElement('button');
                    button.className = 'comment-action-btn';
                    button.textContent = '添加评论';
                    button.type = 'button';
                    
                    console.log('[CodeView] 评论按钮已创建');
                    
                    // 阻止按钮的默认行为和冒泡
                    button.addEventListener('mousedown', e => {
                        console.log('[CodeView] 按钮mousedown事件触发');
                        e.stopPropagation();
                        e.preventDefault();
                    }, { passive: false });
                    
                    button.addEventListener('click', e => {
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
                        
                        // 触发自定义事件获取评论者信息
                        window.dispatchEvent(new CustomEvent('getSelectedCommenters', {
                            detail: {
                                callback: (commenters) => {
                                    showGlobalLoading('正在生成任务，请稍候...');
                                    console.log('=== 通过事件获取的评论者信息 ===');
                                    if (commenters && commenters.length > 0) {
                                        console.log('选中的评论者数量:', commenters.length);
                                        commenters.forEach(async (commenter, index) => {
                                            console.log(`评论者 ${index + 1}:`, {
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
                                                    await Promise.all(
                                                        response.data.map(item =>
                                                            postData(`${window.API_URL}/mongodb/?cname=comments`, { ...item })
                                                        )
                                                    );
                                                }
                                            }
                                        });
                                    } else {
                                        console.log('没有选中任何评论者');
                                    }
                                    hideGlobalLoading();
                                    console.log('==========================================');
                                }
                            }
                        }));
                        
                        // 清除按钮和选择
                        this.clearSelectionAndButton();
                    }, { passive: false });

                    // 定位按钮
                    const rect = range.getBoundingClientRect();
                    const codeRect = codeContent.getBoundingClientRect();
                    container.style.position = 'absolute';
                    container.style.left = `${rect.left - codeRect.left}px`;
                    container.style.top = `${rect.bottom - codeRect.top + 5}px`;
                    container.style.zIndex = 1000;

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
            handleHighlightLines(event) {
                const rangeInfo = event.detail;
                if (!rangeInfo) return;
                let start = rangeInfo.startLine || 0;
                let end = rangeInfo.endLine || start;
                if (start > end) [start, end] = [end, start];
                // 只允许正整数
                if (start < 1) start = 1;
                if (end < 1) end = start;
                // 设置高亮
                this.highlightedLines = [];
                for (let i = start; i <= end; i++) {
                    this.highlightedLines.push(i);
                }
                // 自动滚动到首行
                this.$nextTick(() => {
                    const codeContent = this.$refs.codeContent;
                    if (!codeContent) return;
                    const target = codeContent.querySelector(`.code-line[data-line='${start}']`);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                });
                // 3秒后自动取消高亮
                setTimeout(() => {
                    this.highlightedLines = [];
                }, 3000);
            }
        },
        template: template,
        mounted() {
            this.bindSelectionEvent();
            // 监听高亮事件
            window.addEventListener('highlightCodeLines', this.handleHighlightLines, { passive: true });
        },
        updated() {
            // 重新绑定划词评论事件
            this.bindSelectionEvent();
        },
        beforeUnmount() {
            // 清理高亮事件监听器
            window.removeEventListener('highlightCodeLines', this.handleHighlightLines, { passive: true });
            
            // 清理代码内容的事件监听器
            const codeContent = this.$refs.codeContent;
            if (codeContent) {
                codeContent.removeEventListener('mouseup', this.handleSelection, { passive: false });
                codeContent.removeEventListener('touchend', this.handleSelection, { passive: false });
                codeContent.removeEventListener('mousedown', this.handleMouseDown, { passive: false });
            }
            
            // 清理评论按钮容器
            this.clearSelectionAndButton();
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






