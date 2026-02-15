import {
    findMermaidActionButton,
    setMermaidButtonError,
    setMermaidButtonLoading,
    setMermaidButtonSuccess,
    showMermaidMessage
} from './mermaidUi.js';

function calculateSVGBounds(svg) {
    try {
        console.log('[Mermaid] 开始计算 SVG 边界');

        const existingViewBox = svg.getAttribute('viewBox');
        const svgRect = svg.getBoundingClientRect();

        if (existingViewBox && existingViewBox.trim()) {
            console.log('[Mermaid] 使用原始 viewBox:', existingViewBox);
            const parts = existingViewBox.split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));

            if (
                parts &&
                Array.isArray(parts) &&
                parts.length >= 4 &&
                typeof parts[0] === 'number' &&
                typeof parts[1] === 'number' &&
                typeof parts[2] === 'number' &&
                typeof parts[3] === 'number'
            ) {
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

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasValidBounds = false;

        const allElements = svg.querySelectorAll('*');
        console.log('[Mermaid] 找到总元素数量:', allElements.length);

        let validElementCount = 0;

        allElements.forEach((element) => {
            try {
                const tagName = element.tagName.toLowerCase();
                if (
                    tagName === 'style' ||
                    tagName === 'defs' ||
                    tagName === 'marker' ||
                    tagName === 'clippath' ||
                    tagName === 'pattern'
                ) {
                    return;
                }

                let bbox = null;

                if (tagName === 'text' || tagName === 'tspan') {
                    try {
                        const textBBox = element.getBBox();
                        if (textBBox && textBBox.width > 0 && textBBox.height > 0) {
                            bbox = {
                                x: textBBox.x - 5,
                                y: textBBox.y - 5,
                                width: textBBox.width + 10,
                                height: textBBox.height + 10
                            };
                            validElementCount++;
                        }
                    } catch (_) { }
                }

                if (!bbox && typeof element.getBBox === 'function') {
                    try {
                        bbox = element.getBBox();
                        if (bbox && bbox.width > 0 && bbox.height > 0) {
                            validElementCount++;
                        }
                    } catch (_) { }
                }

                if (!bbox || bbox.width === 0 || bbox.height === 0) {
                    try {
                        const rect = element.getBoundingClientRect();
                        if (rect && rect.width > 0 && rect.height > 0) {
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
                                bbox = {
                                    x: rect.left - svgRect.left,
                                    y: rect.top - svgRect.top,
                                    width: rect.width,
                                    height: rect.height
                                };
                                validElementCount++;
                            }
                        }
                    } catch (_) { }
                }

                if (bbox && isFinite(bbox.x) && isFinite(bbox.y) && bbox.width > 0 && bbox.height > 0) {
                    minX = Math.min(minX, bbox.x);
                    minY = Math.min(minY, bbox.y);
                    maxX = Math.max(maxX, bbox.x + bbox.width);
                    maxY = Math.max(maxY, bbox.y + bbox.height);
                    hasValidBounds = true;
                }
            } catch (_) { }
        });

        console.log('[Mermaid] 有效元素数量:', validElementCount);

        if (!hasValidBounds || !isFinite(minX)) {
            console.log('[Mermaid] 使用 SVG 整体边界');
            try {
                const bbox = svg.getBBox();
                minX = bbox.x;
                minY = bbox.y;
                maxX = bbox.x + bbox.width;
                maxY = bbox.y + bbox.height;
                hasValidBounds = true;
            } catch (_) {
                console.log('[Mermaid] 使用屏幕尺寸作为后备');
                minX = 0;
                minY = 0;
                maxX = svgRect.width || 800;
                maxY = svgRect.height || 600;
                hasValidBounds = true;
            }
        }

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

        const padding = 80;
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
            width,
            height,
            viewBox: `${minX} ${minY} ${width} ${height}`
        };
    } catch (error) {
        console.error('[Mermaid] 边界计算异常:', error);
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

export function registerMermaidDownloadActions() {
    window.downloadMermaidSVG = function(diagramId, svgElement) {
        const downloadButton = findMermaidActionButton('downloadMermaidSVG', diagramId);
        setMermaidButtonLoading(downloadButton);

        try {
            let svg = svgElement;
            if (!svg) {
                svg = document.querySelector(`#${diagramId} svg`);
                if (!svg && diagramId.startsWith('mermaid-fullscreen-')) {
                    svg = document.querySelector(`#${diagramId} svg`);
                }
                if (!svg) {
                    const fullscreenId = `mermaid-fullscreen-${diagramId}`;
                    svg = document.querySelector(`#${fullscreenId} svg`);
                }
            }
            if (!svg) {
                console.warn(`[Mermaid] 未找到图表 SVG 元素: ${diagramId}`);
                showMermaidMessage('未找到图表内容', 'error');
                setMermaidButtonError(downloadButton);
                return;
            }

            console.log('[Mermaid] 开始下载 SVG，元素:', svg);

            const bounds = calculateSVGBounds(svg);
            console.log('[Mermaid] SVG 完整边界:', bounds);

            const svgClone = svg.cloneNode(true);

            svgClone.setAttribute('width', bounds.width);
            svgClone.setAttribute('height', bounds.height);

            if (!svgClone.getAttribute('xmlns')) {
                svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            }
            if (!svgClone.getAttribute('xmlns:xlink')) {
                svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
            }

            svgClone.setAttribute('viewBox', bounds.viewBox);
            console.log('[Mermaid] SVG viewBox:', bounds.viewBox);

            if (!svgClone.getAttribute('preserveAspectRatio')) {
                svgClone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            }

            const svgData = new XMLSerializer().serializeToString(svgClone);
            console.log('[Mermaid] SVG 数据长度:', svgData.length);

            const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `${String(diagramId || 'diagram').replace(/\s+/g, '_')}.svg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
            console.log(`[Mermaid] SVG 已下载: ${diagramId}.svg`);
            showMermaidMessage('SVG 文件下载成功', 'success');
            setMermaidButtonSuccess(downloadButton);
        } catch (error) {
            console.error('[Mermaid] SVG 下载失败:', error);
            showMermaidMessage('SVG 下载失败: ' + error.message, 'error');
            setMermaidButtonError(downloadButton);
        }
    };

    window.downloadMermaidPNG = function(diagramId, svgElement, retryCount = 0) {
        const maxRetries = 2;
        const downloadButton = findMermaidActionButton('downloadMermaidPNG', diagramId);
        if (retryCount === 0) {
            setMermaidButtonLoading(downloadButton);
        }

        try {
            const svg = svgElement || document.querySelector(`#${diagramId} svg`);
            if (!svg) {
                console.warn(`[Mermaid] 未找到图表 SVG 元素: ${diagramId}`);
                showMermaidMessage('未找到图表内容', 'error');
                setMermaidButtonError(downloadButton);
                return;
            }

            const progressMessage = retryCount > 0
                ? `正在重新生成 PNG 图片... (第${retryCount + 1}次尝试)`
                : '正在生成 PNG 图片...';
            showMermaidMessage(progressMessage, 'info');

            console.log('[Mermaid] 开始处理 SVG，元素:', svg);

            const bounds = calculateSVGBounds(svg);
            console.log('[Mermaid] PNG 完整边界:', bounds);

            const svgClone = svg.cloneNode(true);

            svgClone.setAttribute('width', bounds.width);
            svgClone.setAttribute('height', bounds.height);

            if (!svgClone.getAttribute('xmlns')) {
                svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            }

            svgClone.setAttribute('viewBox', bounds.viewBox);
            console.log('[Mermaid] PNG viewBox:', bounds.viewBox);

            if (!svgClone.getAttribute('preserveAspectRatio')) {
                svgClone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            }

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

            let defs = svgClone.querySelector('defs');
            if (!defs) {
                defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                svgClone.insertBefore(defs, svgClone.firstChild);
            }
            defs.appendChild(styleElement);

            const svgString = new XMLSerializer().serializeToString(svgClone);
            console.log('[Mermaid] SVG 字符串长度:', svgString.length);

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const scale = 3;
            canvas.width = bounds.width * scale;
            canvas.height = bounds.height * scale;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.textRenderingOptimization = 'optimizeQuality';
            ctx.textBaseline = 'top';
            ctx.textAlign = 'left';

            console.log('[Mermaid] Canvas 尺寸:', canvas.width, 'x', canvas.height);

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.scale(scale, scale);

            const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

            const img = new Image();

            img.onload = function() {
                try {
                    console.log('[Mermaid] SVG 图片加载成功，开始绘制到 Canvas');
                    showMermaidMessage('正在绘制图表到画布...', 'info');

                    ctx.drawImage(img, 0, 0, bounds.width, bounds.height);

                    console.log('[Mermaid] Canvas 绘制完成，开始转换为 PNG');
                    showMermaidMessage('正在生成高质量 PNG 图片...', 'info');

                    canvas.toBlob(function(blob) {
                        if (!blob) {
                            console.error('[Mermaid] PNG 生成失败');
                            if (retryCount < maxRetries) {
                                setTimeout(() => {
                                    window.downloadMermaidPNG(diagramId, svgElement, retryCount + 1);
                                }, 1000 * (retryCount + 1));
                            } else {
                                showMermaidMessage('PNG 生成失败', 'error');
                                setMermaidButtonError(downloadButton);
                            }
                            return;
                        }

                        console.log('[Mermaid] PNG Blob 生成成功，大小:', blob.size, 'bytes');
                        showMermaidMessage('正在准备下载...', 'info');

                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${String(diagramId || 'diagram').replace(/\s+/g, '_')}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        URL.revokeObjectURL(url);
                        console.log(`[Mermaid] PNG 已下载: ${diagramId}.png`);
                        showMermaidMessage(`PNG 图片下载成功！文件大小: ${(blob.size / 1024).toFixed(1)}KB`, 'success');
                        setMermaidButtonSuccess(downloadButton);
                    }, 'image/png', 1.0);
                } catch (error) {
                    console.error('[Mermaid] PNG 绘制失败:', error);
                    if (retryCount < maxRetries) {
                        setTimeout(() => {
                            window.downloadMermaidPNG(diagramId, svgElement, retryCount + 1);
                        }, 1000 * (retryCount + 1));
                    } else {
                        showMermaidMessage('PNG 生成失败: ' + error.message, 'error');
                        setMermaidButtonError(downloadButton);
                    }
                }
            };

            img.onerror = function(e) {
                console.error('[Mermaid] SVG 图片加载失败', e);
                console.error('[Mermaid] SVG Data URL 前100个字符:', svgDataUrl.substring(0, 100));

                if (retryCount < maxRetries) {
                    console.log(`[Mermaid] 准备重试，当前重试次数: ${retryCount + 1}/${maxRetries}`);
                    setTimeout(() => {
                        window.downloadMermaidPNG(diagramId, svgElement, retryCount + 1);
                    }, 1000 * (retryCount + 1));
                } else {
                    showMermaidMessage('SVG 图片加载失败，已达到最大重试次数', 'error');
                    setMermaidButtonError(downloadButton);
                }
            };

            img.src = svgDataUrl;
        } catch (error) {
            console.error('[Mermaid] PNG 下载失败:', error);

            if (retryCount < maxRetries) {
                console.log(`[Mermaid] 准备重试，当前重试次数: ${retryCount + 1}/${maxRetries}`);
                setTimeout(() => {
                    window.downloadMermaidPNG(diagramId, svgElement, retryCount + 1);
                }, 1000 * (retryCount + 1));
            } else {
                showMermaidMessage('PNG 下载失败: ' + error.message + ' (已达到最大重试次数)', 'error');
                setMermaidButtonError(downloadButton);
            }
        }
    };
}

