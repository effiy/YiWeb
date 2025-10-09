/**
 * 通用图表查看器工具
 * 提供统一的图表查看接口，支持多种图表类型
 * @author liangliang
 */

import FullscreenViewer from './fullscreenViewer.js';

class ChartViewer {
    constructor() {
        this.fullscreenViewer = window.fullscreenViewer;
        this.supportedTypes = ['mermaid', 'svg', 'image', 'text', 'html'];
    }

    /**
     * 查看 Mermaid 图表
     * @param {string} diagramId - 图表ID
     * @param {Object} options - 选项
     */
    viewMermaid(diagramId, options = {}) {
        const diagram = document.getElementById(diagramId);
        if (!diagram) {
            console.warn(`[图表查看器] 未找到图表元素: ${diagramId}`);
            return;
        }

        const svg = diagram.querySelector('svg');
        if (!svg) {
            console.warn(`[图表查看器] 图表 ${diagramId} 没有 SVG 内容`);
            return;
        }

        const code = diagram.getAttribute('data-mermaid-code') || '';
        const title = options.title || `Mermaid 图表 - ${diagramId}`;

        this.fullscreenViewer.open({
            title,
            content: svg.outerHTML,
            type: 'svg',
            actions: [
                {
                    label: '复制代码',
                    icon: 'fas fa-copy',
                    type: 'default',
                    action: 'copy-code'
                },
                {
                    label: '下载SVG',
                    icon: 'fas fa-download',
                    type: 'default',
                    action: 'download-svg'
                },
                {
                    label: '导出PNG',
                    icon: 'fas fa-image',
                    type: 'default',
                    action: 'export-png'
                }
            ],
            onAction: (action) => {
                this.handleMermaidAction(action, diagramId, svg, code);
            }
        });
    }

    /**
     * 查看 SVG 图表
     * @param {string} elementId - 元素ID
     * @param {Object} options - 选项
     */
    viewSVG(elementId, options = {}) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`[图表查看器] 未找到元素: ${elementId}`);
            return;
        }

        const svg = element.querySelector('svg') || element;
        if (svg.tagName !== 'svg') {
            console.warn(`[图表查看器] 元素 ${elementId} 不是 SVG`);
            return;
        }

        const title = options.title || `SVG 图表 - ${elementId}`;

        this.fullscreenViewer.open({
            title,
            content: svg.outerHTML,
            type: 'svg',
            actions: [
                {
                    label: '下载SVG',
                    icon: 'fas fa-download',
                    type: 'default',
                    action: 'download-svg'
                },
                {
                    label: '导出PNG',
                    icon: 'fas fa-image',
                    type: 'default',
                    action: 'export-png'
                }
            ],
            onAction: (action) => {
                this.handleSVGAction(action, elementId, svg);
            }
        });
    }

    /**
     * 查看图片
     * @param {string} imageSrc - 图片源
     * @param {Object} options - 选项
     */
    viewImage(imageSrc, options = {}) {
        const title = options.title || '图片查看';
        const alt = options.alt || '图片';

        this.fullscreenViewer.open({
            title,
            content: `<img src="${imageSrc}" alt="${alt}" />`,
            type: 'image',
            actions: [
                {
                    label: '下载图片',
                    icon: 'fas fa-download',
                    type: 'default',
                    action: 'download-image'
                },
                {
                    label: '复制链接',
                    icon: 'fas fa-link',
                    type: 'default',
                    action: 'copy-link'
                }
            ],
            onAction: (action) => {
                this.handleImageAction(action, imageSrc);
            }
        });
    }

    /**
     * 查看文本内容
     * @param {string} content - 文本内容
     * @param {Object} options - 选项
     */
    viewText(content, options = {}) {
        const title = options.title || '文本查看';
        const language = options.language || 'text';

        this.fullscreenViewer.open({
            title,
            content: `<pre><code class="language-${language}">${this.escapeHtml(content)}</code></pre>`,
            type: 'html',
            actions: [
                {
                    label: '复制文本',
                    icon: 'fas fa-copy',
                    type: 'default',
                    action: 'copy-text'
                },
                {
                    label: '下载文件',
                    icon: 'fas fa-download',
                    type: 'default',
                    action: 'download-text'
                }
            ],
            onAction: (action) => {
                this.handleTextAction(action, content, options);
            }
        });
    }

    /**
     * 查看 HTML 内容
     * @param {string|HTMLElement} content - HTML内容
     * @param {Object} options - 选项
     */
    viewHTML(content, options = {}) {
        const title = options.title || 'HTML 查看';
        const htmlContent = typeof content === 'string' ? content : content.outerHTML;

        this.fullscreenViewer.open({
            title,
            content: htmlContent,
            type: 'html',
            actions: [
                {
                    label: '复制HTML',
                    icon: 'fas fa-copy',
                    type: 'default',
                    action: 'copy-html'
                },
                {
                    label: '查看源码',
                    icon: 'fas fa-code',
                    type: 'default',
                    action: 'view-source'
                }
            ],
            onAction: (action) => {
                this.handleHTMLAction(action, htmlContent);
            }
        });
    }

    /**
     * 处理 Mermaid 图表操作
     */
    handleMermaidAction(action, diagramId, svg, code) {
        switch (action) {
            case 'copy-code':
                this.copyToClipboard(code);
                break;
            case 'download-svg':
                this.downloadSVG(diagramId, svg);
                break;
            case 'export-png':
                this.exportSVGToPNG(diagramId, svg);
                break;
        }
    }

    /**
     * 处理 SVG 操作
     */
    handleSVGAction(action, elementId, svg) {
        switch (action) {
            case 'download-svg':
                this.downloadSVG(elementId, svg);
                break;
            case 'export-png':
                this.exportSVGToPNG(elementId, svg);
                break;
        }
    }

    /**
     * 处理图片操作
     */
    handleImageAction(action, imageSrc) {
        switch (action) {
            case 'download-image':
                this.downloadImage(imageSrc);
                break;
            case 'copy-link':
                this.copyToClipboard(imageSrc);
                break;
        }
    }

    /**
     * 处理文本操作
     */
    handleTextAction(action, content, options) {
        switch (action) {
            case 'copy-text':
                this.copyToClipboard(content);
                break;
            case 'download-text':
                this.downloadText(content, options);
                break;
        }
    }

    /**
     * 处理 HTML 操作
     */
    handleHTMLAction(action, htmlContent) {
        switch (action) {
            case 'copy-html':
                this.copyToClipboard(htmlContent);
                break;
            case 'view-source':
                this.viewText(htmlContent, { title: 'HTML 源码', language: 'html' });
                break;
        }
    }

    /**
     * 复制到剪贴板
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                this.showMessage('已复制到剪贴板', 'success');
            } else {
                this.fallbackCopyToClipboard(text);
            }
        } catch (error) {
            console.error('[图表查看器] 复制失败:', error);
            this.showMessage('复制失败', 'error');
        }
    }

    /**
     * 降级复制方法
     */
    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                this.showMessage('已复制到剪贴板', 'success');
            } else {
                throw new Error('execCommand copy failed');
            }
        } catch (error) {
            console.error('[图表查看器] 降级复制失败:', error);
            this.showMessage('复制失败', 'error');
        } finally {
            document.body.removeChild(textArea);
        }
    }

    /**
     * 下载 SVG
     */
    downloadSVG(filename, svgElement) {
        try {
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}.svg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            this.showMessage('SVG 已下载', 'success');
        } catch (error) {
            console.error('[图表查看器] SVG 下载失败:', error);
            this.showMessage('下载失败', 'error');
        }
    }

    /**
     * 导出 SVG 为 PNG
     */
    exportSVGToPNG(filename, svgElement) {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(svgBlob);
            
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((blob) => {
                    const pngUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = pngUrl;
                    link.download = `${filename}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    URL.revokeObjectURL(url);
                    URL.revokeObjectURL(pngUrl);
                    this.showMessage('PNG 已导出', 'success');
                }, 'image/png');
            };
            
            img.src = url;
        } catch (error) {
            console.error('[图表查看器] PNG 导出失败:', error);
            this.showMessage('导出失败', 'error');
        }
    }

    /**
     * 下载图片
     */
    downloadImage(imageSrc) {
        try {
            const link = document.createElement('a');
            link.href = imageSrc;
            link.download = imageSrc.split('/').pop() || 'image';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this.showMessage('图片已下载', 'success');
        } catch (error) {
            console.error('[图表查看器] 图片下载失败:', error);
            this.showMessage('下载失败', 'error');
        }
    }

    /**
     * 下载文本
     */
    downloadText(content, options = {}) {
        try {
            const filename = options.filename || 'content.txt';
            const mimeType = options.mimeType || 'text/plain';
            
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            this.showMessage('文件已下载', 'success');
        } catch (error) {
            console.error('[图表查看器] 文件下载失败:', error);
            this.showMessage('下载失败', 'error');
        }
    }

    /**
     * 显示消息
     */
    showMessage(message, type = 'info') {
        // 如果项目中有全局消息系统，使用它
        if (window.showMessage && typeof window.showMessage === 'function') {
            window.showMessage(message, type);
            return;
        }
        
        // 否则创建简单的消息提示
        const messageEl = document.createElement('div');
        messageEl.className = `chart-viewer-message chart-viewer-message-${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10001;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(messageEl);
        
        // 显示动画
        setTimeout(() => {
            messageEl.style.opacity = '1';
            messageEl.style.transform = 'translateX(0)';
        }, 100);
        
        // 自动隐藏
        setTimeout(() => {
            messageEl.style.opacity = '0';
            messageEl.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    document.body.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }

    /**
     * HTML转义
     */
    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

// 创建全局实例
window.chartViewer = new ChartViewer();

// 导出类供模块使用
export default ChartViewer;
