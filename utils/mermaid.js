/**
 * Mermaid 图表工具函数
 * 提供全局的 Mermaid 图表支持功能
 */

// 全局 Mermaid 配置 - 已迁移到 MermaidRenderer
// 保留此配置以向后兼容，但建议使用 MermaidRenderer
window.MERMAID_CONFIG = {
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'dark',
    themeVariables: {
        primaryTextColor: '#ffffff',
        primaryColor: '#4f46e5',
        primaryBorderColor: '#6366f1',
        lineColor: '#e5e7eb',
        sectionBkgColor: '#1e293b',
        altSectionBkgColor: '#334155',
        gridColor: '#374151',
        secondaryColor: '#7c3aed',
        tertiaryColor: '#a855f7',
        background: '#0f172a',
        mainBkg: '#1e293b',
        secondBkg: '#334155',
        tertiaryBkg: '#475569'
    },
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

// 在新标签页打开 Mermaid Live Editor 并加载图表代码
window.openMermaidLive = function(diagramId) {
    // 首先尝试从原始图表获取代码
    let diagram = document.getElementById(diagramId);
    
    // 如果没找到，尝试查找全屏模式下的图表
    if (!diagram) {
        const fullscreenId = `mermaid-fullscreen-${diagramId}`;
        diagram = document.getElementById(fullscreenId);
        // 如果找到全屏图表，使用原始 ID 获取代码（因为代码存储在原始图表中）
        if (diagram) {
            diagram = document.getElementById(diagramId);
        }
    }
    
    if (!diagram) {
        console.warn(`[Mermaid] 未找到图表元素: ${diagramId}`);
        showMermaidMessage('未找到图表内容', 'error');
        return;
    }
    
    let code = diagram.getAttribute('data-mermaid-code');
    if (!code) {
        console.warn(`[Mermaid] 图表 ${diagramId} 没有代码数据`);
        showMermaidMessage('图表没有代码数据', 'error');
        return;
    }
    
    // 解码 HTML 实体（如果代码被转义了）
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = code;
        code = tempDiv.textContent || tempDiv.innerText || code;
    } catch (e) {
        // 如果解码失败，使用原始代码
        console.warn('[Mermaid] HTML 解码失败，使用原始代码');
    }
    
    // mermaid.live 支持通过 URL hash 传递代码
    // 格式: https://mermaid.live/edit#pako:base64编码的压缩代码
    // 如果代码较短，也可以尝试直接使用 base64 编码
    try {
        // 将代码转换为 base64 编码
        // 使用 UTF-8 编码确保中文等字符正确处理
        let encodedCode;
        try {
            // 方法1: 使用 btoa (仅支持 ASCII，需要先编码)
            encodedCode = btoa(unescape(encodeURIComponent(code)));
        } catch (e) {
            // 方法2: 如果 btoa 失败，使用 URI 编码作为后备
            console.warn('[Mermaid] Base64 编码失败，使用 URI 编码:', e);
            encodedCode = encodeURIComponent(code);
        }
        
        // mermaid.live 使用 #pako: 前缀 + base64 编码
        // 如果代码很长，mermaid.live 可能需要压缩，但对于简单情况，直接 base64 也可以工作
        const editorUrl = `https://mermaid.live/edit#pako:${encodedCode}`;
        
        window.open(editorUrl, '_blank', 'noopener,noreferrer');
        console.log('[Mermaid] 已在 Mermaid Live Editor 中打开图表');
        showMermaidMessage('正在在新标签页打开编辑器...', 'info');
    } catch (error) {
        console.error('[Mermaid] 打开编辑器失败:', error);
        // 如果所有方法都失败，仍然打开编辑器（虽然代码不会自动填充）
        window.open('https://mermaid.live/edit', '_blank', 'noopener,noreferrer');
        showMermaidMessage('已打开编辑器，请手动粘贴代码', 'info');
    }
};




// 下载 Mermaid SVG
window.downloadMermaidSVG = function(diagramId, svgElement) {
    try {
        // 获取 SVG 元素（优先使用传入的元素）
        let svg = svgElement;
        if (!svg) {
            // 首先尝试直接查找
            svg = document.querySelector(`#${diagramId} svg`);
            // 如果没找到，尝试查找全屏模式下的图表
            if (!svg && diagramId.startsWith('mermaid-fullscreen-')) {
                svg = document.querySelector(`#${diagramId} svg`);
            }
            // 如果还是没找到，尝试反向查找（全屏模式下查找原始图表）
            if (!svg) {
                const fullscreenId = `mermaid-fullscreen-${diagramId}`;
                svg = document.querySelector(`#${fullscreenId} svg`);
            }
        }
        if (!svg) {
            console.warn(`[Mermaid] 未找到图表 SVG 元素: ${diagramId}`);
            showMermaidMessage('未找到图表内容', 'error');
            return;
        }
        
        console.log('[Mermaid] 开始下载 SVG，元素:', svg);
        
        // 计算所有元素的完整边界（包括文本）
        const bounds = calculateSVGBounds(svg);
        console.log('[Mermaid] SVG 完整边界:', bounds);
        
        // 克隆 SVG 以进行处理，不修改原始元素
        const svgClone = svg.cloneNode(true);
        
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
};

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
            
            if (parts && Array.isArray(parts) && parts.length >= 4 && 
                typeof parts[0] === 'number' && typeof parts[1] === 'number' && 
                typeof parts[2] === 'number' && typeof parts[3] === 'number') {
                // 为了安全，稍微扩展一下边界
                const padding = 20;
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
                if (tagName === 'style' || tagName === 'defs' || tagName === 'marker' || tagName === 'clippath' || tagName === 'pattern') {
                    return;
                }
                
                let bbox = null;
                
                // 对于文本元素，使用特殊处理
                if (tagName === 'text' || tagName === 'tspan') {
                    try {
                        // 文本元素需要特殊处理，因为getBBox可能不准确
                        const textBBox = element.getBBox();
                        if (textBBox && textBBox.width > 0 && textBBox.height > 0) {
                            // 为文本添加额外的边距
                            bbox = {
                                x: textBBox.x - 5,
                                y: textBBox.y - 5,
                                width: textBBox.width + 10,
                                height: textBBox.height + 10
                            };
                            validElementCount++;
                        }
                    } catch (e) {
                        // 如果getBBox失败，尝试其他方法
                    }
                }
                
                // 尝试获取 getBBox（对于 SVG 图形元素最准确）
                if (!bbox && typeof element.getBBox === 'function') {
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
        const padding = 80; // 增加到 80px，确保有足够的边距
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
window.downloadMermaidPNG = function(diagramId, svgElement, retryCount = 0) {
    const maxRetries = 2;
    
    try {
        // 获取 SVG 元素（优先使用传入的元素）
        const svg = svgElement || document.querySelector(`#${diagramId} svg`);
        if (!svg) {
            console.warn(`[Mermaid] 未找到图表 SVG 元素: ${diagramId}`);
            showMermaidMessage('未找到图表内容', 'error');
            return;
        }

        // 显示下载进度提示
        const progressMessage = retryCount > 0 ? 
            `正在重新生成 PNG 图片... (第${retryCount + 1}次尝试)` : 
            '正在生成 PNG 图片...';
        showMermaidMessage(progressMessage, 'info');
        
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
        
        // 添加字体和样式确保机制
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            * {
                font-family: "Segoe UI", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Arial", sans-serif !important;
                font-size: 14px !important;
                font-weight: normal !important;
                font-style: normal !important;
                text-decoration: none !important;
                text-anchor: middle !important;
                dominant-baseline: central !important;
            }
            text, tspan {
                font-family: "Segoe UI", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Arial", sans-serif !important;
                font-size: 14px !important;
                font-weight: normal !important;
                fill: #333333 !important;
                stroke: none !important;
            }
            .node rect, .node circle, .node ellipse, .node polygon {
                fill: #ffffff !important;
                stroke: #333333 !important;
                stroke-width: 1px !important;
            }
            .edgePath path {
                stroke: #333333 !important;
                stroke-width: 1px !important;
                fill: none !important;
            }
            .edgeLabel {
                background-color: #ffffff !important;
                color: #333333 !important;
            }
        `;
        
        // 将样式添加到SVG的defs中
        let defs = svgClone.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            svgClone.insertBefore(defs, svgClone.firstChild);
        }
        defs.appendChild(styleElement);
        
        // 序列化 SVG
        const svgString = new XMLSerializer().serializeToString(svgClone);
        console.log('[Mermaid] SVG 字符串长度:', svgString.length);
        
        // 创建 canvas 元素
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 设置 canvas 尺寸（支持高分辨率）
        const scale = 3; // 提高到3倍分辨率，获得更清晰的图片
        canvas.width = bounds.width * scale;
        canvas.height = bounds.height * scale;
        
        // 设置高质量绘制选项
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.textRenderingOptimization = 'optimizeQuality';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        
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
                showMermaidMessage('正在绘制图表到画布...', 'info');
                
                // 将 SVG 绘制到 canvas 上
                ctx.drawImage(img, 0, 0, bounds.width, bounds.height);
                
                console.log('[Mermaid] Canvas 绘制完成，开始转换为 PNG');
                showMermaidMessage('正在生成高质量 PNG 图片...', 'info');
                
                // 将 canvas 转换为 PNG blob（使用最高质量）
                canvas.toBlob(function(blob) {
                    if (!blob) {
                        console.error('[Mermaid] PNG 生成失败');
                        showMermaidMessage('PNG 生成失败', 'error');
                        return;
                    }
                    
                    console.log('[Mermaid] PNG Blob 生成成功，大小:', blob.size, 'bytes');
                    showMermaidMessage('正在准备下载...', 'info');
                    
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
                    showMermaidMessage(`PNG 图片下载成功！文件大小: ${(blob.size / 1024).toFixed(1)}KB`, 'success');
                }, 'image/png', 1.0); // 使用最高质量 1.0
                
            } catch (error) {
                console.error('[Mermaid] PNG 绘制失败:', error);
                showMermaidMessage('PNG 生成失败: ' + error.message, 'error');
            }
        };
        
        img.onerror = function(e) {
            console.error('[Mermaid] SVG 图片加载失败', e);
            console.error('[Mermaid] SVG Data URL 前100个字符:', svgDataUrl.substring(0, 100));
            
            if (retryCount < maxRetries) {
                console.log(`[Mermaid] 准备重试，当前重试次数: ${retryCount + 1}/${maxRetries}`);
                setTimeout(() => {
                    window.downloadMermaidPNG(diagramId, svgElement, retryCount + 1);
                }, 1000 * (retryCount + 1)); // 递增延迟
            } else {
                showMermaidMessage('SVG 图片加载失败，已达到最大重试次数', 'error');
            }
        };
        
        // 设置图片源为 data URL
        img.src = svgDataUrl;
        
    } catch (error) {
        console.error('[Mermaid] PNG 下载失败:', error);
        
        if (retryCount < maxRetries) {
            console.log(`[Mermaid] 准备重试，当前重试次数: ${retryCount + 1}/${maxRetries}`);
            setTimeout(() => {
                window.downloadMermaidPNG(diagramId, svgElement, retryCount + 1);
            }, 1000 * (retryCount + 1)); // 递增延迟
        } else {
            showMermaidMessage('PNG 下载失败: ' + error.message + ' (已达到最大重试次数)', 'error');
        }
    }
};



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

// 样式管理

console.log('[Mermaid Utils] 工具函数已加载');



