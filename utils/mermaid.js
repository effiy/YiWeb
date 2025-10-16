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
        console.log('[Mermaid] 开始下载 SVG，元素:', svgElement);
        
        // 计算所有元素的完整边界（包括文本）
        const bounds = calculateSVGBounds(svgElement);
        console.log('[Mermaid] SVG 完整边界:', bounds);
        
        // 克隆 SVG 以进行处理，不修改原始元素
        const svgClone = svgElement.cloneNode(true);
        
        // 设置明确的尺寸属性
        svgClone.setAttribute('width', bounds.width);
        svgClone.setAttribute('height', bounds.height);
        
        // 确保 xmlns 命名空间
        if (!svgClone.getAttribute('xmlns')) {
            svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }
        if (!svgClone.getAttribute('xmlns:xlink')) {
            svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        }
        
        // 使用计算出的完整 viewBox
        svgClone.setAttribute('viewBox', bounds.viewBox);
        console.log('[Mermaid] SVG viewBox:', bounds.viewBox);
        
        // 确保 preserveAspectRatio
        if (!svgClone.getAttribute('preserveAspectRatio')) {
            svgClone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        }
        
        // 序列化 SVG
        const svgData = new XMLSerializer().serializeToString(svgClone);
        console.log('[Mermaid] SVG 数据长度:', svgData.length);
        
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${diagramId}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        console.log(`[Mermaid] SVG 已下载: ${diagramId}.svg`);
        showMermaidMessage('SVG 文件下载成功', 'success');
    } catch (error) {
        console.error('[Mermaid] SVG 下载失败:', error);
        showMermaidMessage('SVG 下载失败: ' + error.message, 'error');
    }
}

// 计算 SVG 的完整边界（包括所有元素和文本）
function calculateSVGBounds(svg) {
    try {
        console.log('[Mermaid] 开始计算 SVG 边界');
        
        // 首先检查是否有原始 viewBox，如果有就优先使用
        const existingViewBox = svg.getAttribute('viewBox');
        const svgRect = svg.getBoundingClientRect();
        
        if (existingViewBox && existingViewBox.trim()) {
            console.log('[Mermaid] 使用原始 viewBox:', existingViewBox);
            const parts = existingViewBox.split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));
            
            if (parts.length === 4) {
                // 为了安全，稍微扩展一下边界
                const padding = 10;
                return {
                    x: parts[0] - padding,
                    y: parts[1] - padding,
                    width: parts[2] + padding * 2,
                    height: parts[3] + padding * 2,
                    viewBox: `${parts[0] - padding} ${parts[1] - padding} ${parts[2] + padding * 2} ${parts[3] + padding * 2}`
                };
            }
        }
        
        // 如果没有 viewBox，或者 viewBox 无效，就计算完整边界
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasValidBounds = false;
        
        // 获取所有元素（包括所有层级）
        const allElements = svg.querySelectorAll('*');
        console.log('[Mermaid] 找到总元素数量:', allElements.length);
        
        let validElementCount = 0;
        
        // 遍历所有元素
        allElements.forEach((element) => {
            try {
                // 跳过某些不需要计算的元素
                const tagName = element.tagName.toLowerCase();
                if (tagName === 'style' || tagName === 'defs' || tagName === 'marker' || tagName === 'clippath') {
                    return;
                }
                
                let bbox = null;
                
                // 尝试获取 getBBox（对于 SVG 图形元素最准确）
                if (typeof element.getBBox === 'function') {
                    try {
                        bbox = element.getBBox();
                        if (bbox && bbox.width > 0 && bbox.height > 0) {
                            validElementCount++;
                        }
                    } catch (e) {
                        // getBBox 可能失败，继续尝试其他方法
                    }
                }
                
                // 如果 getBBox 失败，尝试 getBoundingClientRect
                if (!bbox || bbox.width === 0 || bbox.height === 0) {
                    try {
                        const rect = element.getBoundingClientRect();
                        if (rect && rect.width > 0 && rect.height > 0) {
                            // 转换为 SVG 坐标系
                            const ctm = element.getScreenCTM();
                            if (ctm) {
                                const inverse = ctm.inverse();
                                const topLeft = svg.createSVGPoint();
                                topLeft.x = rect.left;
                                topLeft.y = rect.top;
                                const svgTopLeft = topLeft.matrixTransform(inverse);
                                
                                const bottomRight = svg.createSVGPoint();
                                bottomRight.x = rect.right;
                                bottomRight.y = rect.bottom;
                                const svgBottomRight = bottomRight.matrixTransform(inverse);
                                
                                bbox = {
                                    x: Math.min(svgTopLeft.x, svgBottomRight.x),
                                    y: Math.min(svgTopLeft.y, svgBottomRight.y),
                                    width: Math.abs(svgBottomRight.x - svgTopLeft.x),
                                    height: Math.abs(svgBottomRight.y - svgTopLeft.y)
                                };
                                validElementCount++;
                            } else {
                                // 简单的坐标转换
                                bbox = {
                                    x: rect.left - svgRect.left,
                                    y: rect.top - svgRect.top,
                                    width: rect.width,
                                    height: rect.height
                                };
                                validElementCount++;
                            }
                        }
                    } catch (e) {
                        // 也失败了，跳过这个元素
                    }
                }
                
                // 更新边界
                if (bbox && isFinite(bbox.x) && isFinite(bbox.y) && bbox.width > 0 && bbox.height > 0) {
                    minX = Math.min(minX, bbox.x);
                    minY = Math.min(minY, bbox.y);
                    maxX = Math.max(maxX, bbox.x + bbox.width);
                    maxY = Math.max(maxY, bbox.y + bbox.height);
                    hasValidBounds = true;
                }
            } catch (e) {
                // 忽略无法处理的元素
            }
        });
        
        console.log('[Mermaid] 有效元素数量:', validElementCount);
        
        // 如果没有找到有效边界，尝试使用 SVG 本身的 getBBox
        if (!hasValidBounds || !isFinite(minX)) {
            console.log('[Mermaid] 使用 SVG 整体边界');
            try {
                const bbox = svg.getBBox();
                minX = bbox.x;
                minY = bbox.y;
                maxX = bbox.x + bbox.width;
                maxY = bbox.y + bbox.height;
                hasValidBounds = true;
            } catch (e) {
                // 如果这也失败了，使用屏幕尺寸
                console.log('[Mermaid] 使用屏幕尺寸作为后备');
                minX = 0;
                minY = 0;
                maxX = svgRect.width || 800;
                maxY = svgRect.height || 600;
                hasValidBounds = true;
            }
        }
        
        // 如果还是没有有效边界，使用默认值
        if (!hasValidBounds || !isFinite(minX)) {
            console.warn('[Mermaid] 无法计算边界，使用默认值');
            return {
                x: 0,
                y: 0,
                width: svgRect.width || 800,
                height: svgRect.height || 600,
                viewBox: `0 0 ${svgRect.width || 800} ${svgRect.height || 600}`
            };
        }
        
        // 添加 padding，确保内容不会被裁剪
        const padding = 50; // 增加到 50px
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;
        
        const width = maxX - minX;
        const height = maxY - minY;
        
        console.log('[Mermaid] 最终边界:', {
            minX: minX.toFixed(2),
            minY: minY.toFixed(2),
            maxX: maxX.toFixed(2),
            maxY: maxY.toFixed(2),
            width: width.toFixed(2),
            height: height.toFixed(2)
        });
        
        return {
            x: minX,
            y: minY,
            width: width,
            height: height,
            viewBox: `${minX} ${minY} ${width} ${height}`
        };
        
    } catch (error) {
        console.error('[Mermaid] 边界计算异常:', error);
        // 最后的降级方案
        const rect = svg.getBoundingClientRect();
        return {
            x: 0,
            y: 0,
            width: rect.width || 800,
            height: rect.height || 600,
            viewBox: `0 0 ${rect.width || 800} ${rect.height || 600}`
        };
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

        // 计算所有元素的完整边界（包括文本）
        const bounds = calculateSVGBounds(svg);
        console.log('[Mermaid] PNG 完整边界:', bounds);
        
        // 克隆 SVG 以进行处理，不修改原始元素
        const svgClone = svg.cloneNode(true);
        
        // 设置明确的尺寸属性
        svgClone.setAttribute('width', bounds.width);
        svgClone.setAttribute('height', bounds.height);
        
        // 确保 xmlns 命名空间
        if (!svgClone.getAttribute('xmlns')) {
            svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }
        
        // 使用计算出的完整 viewBox
        svgClone.setAttribute('viewBox', bounds.viewBox);
        console.log('[Mermaid] PNG viewBox:', bounds.viewBox);
        
        // 确保 preserveAspectRatio
        if (!svgClone.getAttribute('preserveAspectRatio')) {
            svgClone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        }
        
        // 序列化 SVG
        const svgString = new XMLSerializer().serializeToString(svgClone);
        console.log('[Mermaid] SVG 字符串长度:', svgString.length);
        
        // 创建 canvas 元素
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 设置 canvas 尺寸（支持高分辨率）
        const scale = 2; // 2倍分辨率
        canvas.width = bounds.width * scale;
        canvas.height = bounds.height * scale;
        
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
                ctx.drawImage(img, 0, 0, bounds.width, bounds.height);
                
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


