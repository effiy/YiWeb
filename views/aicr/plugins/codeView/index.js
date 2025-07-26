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
                    codeContent.removeEventListener('mouseup', this.handleSelection);
                    codeContent.removeEventListener('touchend', this.handleSelection);
                    
                    // 添加新的事件监听器
                    codeContent.addEventListener('mouseup', this.handleSelection);
                    codeContent.addEventListener('touchend', this.handleSelection);
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
                    button.addEventListener('mousedown', e => e.stopPropagation());

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
                            container.innerHTML = '';
                            container.style.display = 'none';
                            document.removeEventListener('mousedown', handleClickOutside);
                        }
                    };
                    document.addEventListener('mousedown', handleClickOutside);
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
            window.addEventListener('highlightCodeLines', this.handleHighlightLines);
            console.log('[CodeView] 组件已挂载');
        },
        updated() {
            // 重新绑定划词评论事件
            this.bindSelectionEvent();
            console.log('[CodeView] 组件已更新');
        },
        beforeUnmount() {
            window.removeEventListener('highlightCodeLines', this.handleHighlightLines);
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



