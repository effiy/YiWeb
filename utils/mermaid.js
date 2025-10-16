/**
 * Mermaid 图表工具函数
 * 提供全局的 Mermaid 图表支持功能
 */

// 全局 Mermaid 配置 - 已迁移到 MermaidRenderer
// 保留此配置以向后兼容，但建议使用 MermaidRenderer
window.MERMAID_CONFIG = {
    startOnLoad: false,
    securityLevel: 'loose',
    fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
    fontSize: 14,
    flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
    },
    sequence: {
        diagramMarginX: 50,
        diagramMarginY: 10,
        actorMargin: 50,
        width: 150,
        height: 65,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        messageMargin: 35,
        mirrorActors: true,
        bottomMarginAdj: 1,
        useMaxWidth: true,
        rightAngles: false,
        showSequenceNumbers: false
    },
    gantt: {
        titleTopMargin: 25,
        barHeight: 20,
        fontSize: 11,
        fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
        sectionFontSize: 11,
        numberSectionStyles: 4
    },
    gitgraph: {
        mainBranchName: 'main',
        showCommitLabel: true,
        showBranches: true,
        rotateCommitLabel: false
    },
    c4c: {
        diagramMarginX: 50,
        diagramMarginY: 10,
        c4ShapeMargin: 50,
        c4ShapeInRow: 4,
        width: 216,
        height: 60,
        boxMargin: 10,
        c4ShapeTextMargin: 5,
        c4BoundaryInRow: 2,
        personFontSize: 14,
        personFontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
        personFontWeight: 'normal',
        external_personFontSize: 14,
        external_personFontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
        external_personFontWeight: 'normal'
    }
};

// 全局复制 Mermaid 代码函数
window.copyMermaidCode = function(diagramId) {
    const diagram = document.getElementById(diagramId);
    if (!diagram) {
        console.warn(`[Mermaid] 未找到图表元素: ${diagramId}`);
        return;
    }
    
    const code = diagram.getAttribute('data-mermaid-code');
    if (!code) {
        console.warn(`[Mermaid] 图表 ${diagramId} 没有代码数据`);
        return;
    }
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
            console.log('[Mermaid] 图表代码已复制到剪贴板');
            showMermaidMessage('图表代码已复制到剪贴板', 'success');
        }).catch(err => {
            console.error('[Mermaid] 复制失败:', err);
            fallbackCopyTextToClipboard(code);
        });
    } else {
        fallbackCopyTextToClipboard(code);
    }
};

// 全屏显示 Mermaid 图表
window.showMermaidFullscreen = function(diagramId) {
    const diagram = document.getElementById(diagramId);
    if (!diagram) {
        console.warn(`[Mermaid] 未找到图表元素: ${diagramId}`);
        return;
    }
    
    const svg = diagram.querySelector('svg');
    if (!svg) {
        console.warn(`[Mermaid] 图表 ${diagramId} 没有 SVG 内容`);
        return;
    }

    // 获取图表代码
    const code = diagram.getAttribute('data-mermaid-code') || '';
    
    // 使用统一的全屏查看器
    if (window.fullscreenViewer) {
        window.fullscreenViewer.open({
            title: `Mermaid 图表 - ${diagramId}`,
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
                    label: '下载PNG',
                    icon: 'fas fa-image',
                    type: 'default',
                    action: 'download-png'
                }
            ],
            onAction: (action) => {
                // 从全屏查看器中获取当前显示的 SVG
                const fullscreenSvg = document.querySelector('.fullscreen-viewer-body svg');
                
                switch (action) {
                    case 'copy-code':
                        if (code) {
                            copyMermaidCode(diagramId);
                        } else {
                            console.warn('[Mermaid] 没有找到图表代码');
                        }
                        break;
                    case 'download-svg':
                        // 使用全屏查看器中的 SVG
                        downloadMermaidSVG(diagramId, fullscreenSvg || svg);
                        break;
                    case 'download-png':
                        // 使用全屏查看器中的 SVG 确保一致性
                        window.downloadMermaidPNG(diagramId, fullscreenSvg || svg);
                        break;
                }
            }
        });
    } else {
        console.warn('[Mermaid] 全屏查看器未初始化，使用降级方案');
        // 降级到原始实现
        showMermaidFullscreenLegacy(diagramId);
    }
};

// 下载 Mermaid SVG
function downloadMermaidSVG(diagramId, svgElement) {
    try {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${diagramId}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        console.log(`[Mermaid] SVG 已下载: ${diagramId}.svg`);
    } catch (error) {
        console.error('[Mermaid] SVG 下载失败:', error);
    }
}

// 下载 Mermaid PNG
window.downloadMermaidPNG = function(diagramId, svgElement) {
    try {
        // 获取 SVG 元素（优先使用传入的元素）
        const svg = svgElement || document.querySelector(`#${diagramId} svg`);
        if (!svg) {
            console.warn(`[Mermaid] 未找到图表 SVG 元素: ${diagramId}`);
            showMermaidMessage('未找到图表内容', 'error');
            return;
        }

        // 显示下载进度提示
        showMermaidMessage('正在生成 PNG 图片...', 'info');
        
        console.log('[Mermaid] 开始处理 SVG，元素:', svg);

        // 获取 SVG 的实际尺寸
        const svgRect = svg.getBoundingClientRect();
        const svgWidth = svgRect.width || parseFloat(svg.getAttribute('width')) || 800;
        const svgHeight = svgRect.height || parseFloat(svg.getAttribute('height')) || 600;
        
        console.log('[Mermaid] SVG 尺寸:', svgWidth, 'x', svgHeight);
        
        // 直接使用原始 SVG 的序列化字符串，不进行任何修改
        // 这样可以保持与显示完全一致的样式
        let svgString = new XMLSerializer().serializeToString(svg);
        
        // 确保 SVG 有正确的命名空间
        if (!svgString.includes('xmlns=')) {
            svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        
        // 如果 SVG 没有明确的宽高，添加它们
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = svgString;
        const tempSvg = tempDiv.querySelector('svg');
        
        if (!tempSvg.getAttribute('width')) {
            tempSvg.setAttribute('width', svgWidth);
        }
        if (!tempSvg.getAttribute('height')) {
            tempSvg.setAttribute('height', svgHeight);
        }
        if (!tempSvg.getAttribute('viewBox')) {
            const vb = svg.getAttribute('viewBox');
            if (vb) {
                tempSvg.setAttribute('viewBox', vb);
            } else {
                tempSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
            }
        }
        
        // 获取处理后的 SVG 字符串
        svgString = new XMLSerializer().serializeToString(tempSvg);
        
        console.log('[Mermaid] SVG 字符串长度:', svgString.length);
        
        // 创建 canvas 元素
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 设置 canvas 尺寸（支持高分辨率）
        const scale = 2; // 2倍分辨率
        canvas.width = svgWidth * scale;
        canvas.height = svgHeight * scale;
        
        console.log('[Mermaid] Canvas 尺寸:', canvas.width, 'x', canvas.height);
        
        // 设置 canvas 背景为白色
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 缩放上下文以支持高分辨率
        ctx.scale(scale, scale);
        
        // 创建包含 SVG 的 data URL
        const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
        
        // 创建 Image 对象
        const img = new Image();
        
        img.onload = function() {
            try {
                console.log('[Mermaid] SVG 图片加载成功，开始绘制到 Canvas');
                
                // 将 SVG 绘制到 canvas 上
                ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
                
                console.log('[Mermaid] Canvas 绘制完成，开始转换为 PNG');
                
                // 将 canvas 转换为 PNG blob
                canvas.toBlob(function(blob) {
                    if (!blob) {
                        console.error('[Mermaid] PNG 生成失败');
                        showMermaidMessage('PNG 生成失败', 'error');
                        return;
                    }
                    
                    console.log('[Mermaid] PNG Blob 生成成功，大小:', blob.size, 'bytes');
                    
                    // 创建下载链接
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${diagramId}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    URL.revokeObjectURL(url);
                    console.log(`[Mermaid] PNG 已下载: ${diagramId}.png`);
                    showMermaidMessage('PNG 图片下载成功', 'success');
                }, 'image/png', 0.95);
                
            } catch (error) {
                console.error('[Mermaid] PNG 绘制失败:', error);
                showMermaidMessage('PNG 生成失败: ' + error.message, 'error');
            }
        };
        
        img.onerror = function(e) {
            console.error('[Mermaid] SVG 图片加载失败', e);
            console.error('[Mermaid] SVG Data URL 前100个字符:', svgDataUrl.substring(0, 100));
            showMermaidMessage('SVG 图片加载失败，请重试', 'error');
        };
        
        // 设置图片源为 data URL
        img.src = svgDataUrl;
        
    } catch (error) {
        console.error('[Mermaid] PNG 下载失败:', error);
        showMermaidMessage('PNG 下载失败: ' + error.message, 'error');
    }
};


// 降级实现（保留向后兼容）
function showMermaidFullscreenLegacy(diagramId) {
    const diagram = document.getElementById(diagramId);
    if (!diagram) return;
    
    const svg = diagram.querySelector('svg');
    if (!svg) return;
    
    // 创建简单的全屏模态框
    const modal = document.createElement('div');
    modal.className = 'mermaid-fullscreen-modal-legacy';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        cursor: pointer;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 12px;
            padding: 20px;
            max-width: 95vw;
            max-height: 95vh;
            overflow: auto;
        ">
            ${svg.outerHTML}
        </div>
    `;
    
    modal.onclick = () => {
        document.body.removeChild(modal);
        document.body.style.overflow = '';
    };
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

// 降级复制方法
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            console.log('[Mermaid] 使用降级方法复制成功');
            showMermaidMessage('图表代码已复制到剪贴板', 'success');
        } else {
            console.error('[Mermaid] 降级复制方法失败');
            showMermaidMessage('复制失败，请手动复制', 'error');
        }
    } catch (err) {
        console.error('[Mermaid] 降级复制方法异常:', err);
        showMermaidMessage('复制失败，请手动复制', 'error');
    }
    
    document.body.removeChild(textArea);
}

// 显示 Mermaid 消息提示
function showMermaidMessage(message, type = 'info') {
    // 如果项目中有全局消息系统，使用它
    if (window.showMessage && typeof window.showMessage === 'function') {
        window.showMessage(message, type);
        return;
    }
    
    // 否则创建简单的消息提示
    const messageEl = document.createElement('div');
    messageEl.className = `mermaid-message mermaid-message-${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
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

// 初始化 Mermaid 的通用方法 - 已迁移到 MermaidRenderer
// 保留此函数以向后兼容，但建议使用 MermaidRenderer
window.initMermaid = function(config = {}) {
    // 如果新的渲染管理器可用，使用它
    if (typeof window.mermaidRenderer !== 'undefined') {
        if (config) {
            window.mermaidRenderer.updateConfig(config);
        }
        return window.mermaidRenderer.initialize();
    }
    
    // 降级到原始实现
    if (typeof mermaid === 'undefined') {
        console.warn('[Mermaid] Mermaid.js 未加载');
        return false;
    }
    
    try {
        const finalConfig = { ...window.MERMAID_CONFIG, ...config };
        mermaid.initialize(finalConfig);
        window.mermaidInitialized = true;
        console.log('[Mermaid] 初始化成功');
        return true;
    } catch (error) {
        console.error('[Mermaid] 初始化失败:', error);
        return false;
    }
};

// 渲染单个 Mermaid 图表的通用方法 - 已迁移到 MermaidRenderer
// 保留此函数以向后兼容，但建议使用 MermaidRenderer
window.renderMermaidDiagram = function(diagramId, code, callback) {
    // 如果新的渲染管理器可用，使用它
    if (typeof window.mermaidRenderer !== 'undefined') {
        return window.mermaidRenderer.renderDiagram(diagramId, code, {
            onSuccess: callback ? (svg) => callback(null, svg) : null,
            onError: callback ? (error) => callback(error, null) : null
        });
    }
    
    // 降级到原始实现
    if (typeof mermaid === 'undefined') {
        console.warn('[Mermaid] Mermaid.js 未加载');
        return;
    }
    
    const diagram = document.getElementById(diagramId);
    if (!diagram) {
        console.warn(`[Mermaid] 未找到图表元素: ${diagramId}`);
        return;
    }
    
    if (diagram.hasAttribute('data-mermaid-rendered')) {
        console.log(`[Mermaid] 图表 ${diagramId} 已经渲染过了`);
        return;
    }
    
    // 确保 Mermaid 已初始化
    if (!window.mermaidInitialized) {
        window.initMermaid();
    }
    
    try {
        mermaid.render(`mermaid-svg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, code)
            .then(({ svg }) => {
                diagram.innerHTML = svg;
                diagram.setAttribute('data-mermaid-rendered', 'true');
                console.log(`[Mermaid] 图表 ${diagramId} 渲染成功`);
                
                if (callback && typeof callback === 'function') {
                    callback(null, svg);
                }
            })
            .catch(error => {
                console.error(`[Mermaid] 图表 ${diagramId} 渲染失败:`, error);
                diagram.innerHTML = `
                    <div class="mermaid-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>图表渲染失败</p>
                        <details>
                            <summary>查看错误详情</summary>
                            <pre>${escapeHtml(error.message || error.toString())}</pre>
                        </details>
                        <details>
                            <summary>查看原始代码</summary>
                            <pre><code>${escapeHtml(code)}</code></pre>
                        </details>
                    </div>
                `;
                
                if (callback && typeof callback === 'function') {
                    callback(error, null);
                }
            });
    } catch (error) {
        console.error(`[Mermaid] 图表 ${diagramId} 渲染异常:`, error);
        diagram.innerHTML = `
            <div class="mermaid-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>图表渲染异常</p>
                <pre><code>${escapeHtml(code)}</code></pre>
            </div>
        `;
        
        if (callback && typeof callback === 'function') {
            callback(error, null);
        }
    }
};

// HTML 转义工具函数
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 样式已迁移到 fullscreenViewer.js 中统一管理

console.log('[Mermaid Utils] 工具函数已加载');


