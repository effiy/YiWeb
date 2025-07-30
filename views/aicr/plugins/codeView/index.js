// 代码查看组件 - 负责代码内容的展示和高亮
// 作者：liangliang

import { safeExecute, createError, ErrorTypes } from '/utils/error.js';
import { loadCSSFiles } from '/utils/baseView.js';

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
                    codeContent.removeEventListener('mouseup', this.handleSelection, { passive: true });
                    codeContent.removeEventListener('touchend', this.handleSelection, { passive: true });
                    
                    // 添加新的事件监听器
                    codeContent.addEventListener('mouseup', this.handleSelection, { passive: true });
                    codeContent.addEventListener('touchend', this.handleSelection, { passive: true });
                }, '划词事件绑定');
            },
            
            // 处理文本选择
            handleSelection(event) {
                return safeExecute(() => {
                    const selection = window.getSelection();
                    if (!selection || selection.rangeCount === 0) return;
                    
                    const range = selection.getRangeAt(0);
                    const selectedText = range.toString().trim();
                    
                    if (selectedText.length > 0) {
                        // 创建评论按钮
                        this.createCommentButton(range, selectedText);
                    }
                }, '文本选择处理');
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
                    button.type = 'button'; // 明确指定按钮类型
                    
                    // 添加内联事件处理器作为备用
                    const selectedTextForButton = selectedText; // 创建一个局部变量
                    button.onclick = function(e) {
                        console.log('[CodeView] 内联onclick事件触发');
                        e.preventDefault();
                        e.stopPropagation();
                    };
                    
                    console.log('[CodeView] 评论按钮已创建');
                    
                    // 添加调试信息
                    console.log('[CodeView] 按钮元素:', button);
                    console.log('[CodeView] 按钮样式:', window.getComputedStyle(button));
                    
                    // 阻止事件冒泡
                    button.addEventListener('mousedown', e => {
                        console.log('[CodeView] 按钮mousedown事件触发');
                        e.stopPropagation();
                        e.preventDefault();
                    }, { passive: false });
                    
                    // 添加点击事件处理 - 使用更直接的方式
                    const handleButtonClick = (e) => {
                        console.log('[CodeView] 按钮点击事件被触发');
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        
                        // 简单测试：确保事件处理逻辑能够执行
                        console.log('[CodeView] 事件处理开始');
                        
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
                                // 这里可以添加当前文件信息
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
                        
                        // 关闭弹窗
                        // container.innerHTML = '';
                        // container.style.display = 'none';
                        
                        // 移除事件监听器
                        button.removeEventListener('click', handleButtonClick);
                    };
                    
                    // 绑定点击事件
                    button.addEventListener('click', handleButtonClick, { passive: false });

                    // 定位按钮
                    const rect = range.getBoundingClientRect();
                    const codeRect = codeContent.getBoundingClientRect();
                    container.style.position = 'absolute';
                    container.style.left = `${rect.left - codeRect.left}px`;
                    container.style.top = `${rect.bottom - codeRect.top + 5}px`;
                    container.style.zIndex = 1000;

                    container.appendChild(button);
                    
                    // 验证按钮是否正确添加到DOM
                    console.log('[CodeView] 按钮已添加到容器:', container.contains(button));
                    console.log('[CodeView] 容器内容:', container.innerHTML);
                    
                    // 测试按钮是否可以点击
                    console.log('[CodeView] 按钮的pointer-events:', window.getComputedStyle(button).pointerEvents);
                    console.log('[CodeView] 按钮的z-index:', window.getComputedStyle(button).zIndex);
                    
                    // 添加一个简单的测试点击
                    setTimeout(() => {
                        console.log('[CodeView] 尝试模拟点击按钮');
                        button.click();
                    }, 100);

                    // 点击 codeContent 以外区域时关闭弹窗
                    const handleClickOutside = (event) => {
                        if (!container.contains(event.target)) {
                            container.innerHTML = '';
                            container.style.display = 'none';
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
            window.removeEventListener('highlightCodeLines', this.handleHighlightLines, { passive: true });
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




