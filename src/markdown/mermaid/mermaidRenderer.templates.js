export const buildMermaidLoadingHtml = () => {
    return `
        <div class="mermaid-loading" style="
            padding: 40px 20px; 
            text-align: center; 
            color: var(--text-muted, #94a3b8);
            background: var(--bg-primary, #0f172a);
            border-radius: 8px;
            border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.08));
            position: relative;
            overflow: hidden;
        ">
            <div style="
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, transparent 0%, var(--primary, #4f46e5) 50%, transparent 100%);
                animation: shimmer 2s infinite;
            "></div>
            <div style="
                display: inline-flex;
                align-items: center;
                gap: 12px;
                padding: 16px 24px;
                background: var(--bg-glass, rgba(255,255,255,0.03));
                border-radius: 12px;
                border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.08));
                -webkit-backdrop-filter: blur(8px);
                backdrop-filter: blur(8px);
                box-shadow: var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.4));
            ">
                <div style="
                    width: 20px;
                    height: 20px;
                    border: 2px solid var(--border-primary, rgba(255, 255, 255, 0.08));
                    border-top: 2px solid var(--primary, #4f46e5);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                "></div>
                <span style="
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--text-secondary, #cbd5e1);
                    letter-spacing: 0.5px;
                ">正在渲染图表...</span>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            </style>
        </div>
    `;
};

export const buildMermaidErrorHtml = (
    {
        errorMessage,
        code,
        retryCount = 0,
        maxRetries = 0,
        canRetry = false,
        diagramId = null,
        retryDiagramId = null,
        enableAIFix = true
    },
    { escapeHtml, escapeJs }
) => {
    const fixButtonId = diagramId ? `mermaid-ai-fix-${diagramId}` : `mermaid-ai-fix-${Date.now()}`;

    return `
        <div class="mermaid-error" style="
            background: var(--bg-secondary, #1e293b);
            border: 1px solid var(--error, #ef4444);
            border-radius: 12px;
            padding: 24px;
            margin: 16px 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            position: relative;
            overflow: hidden;
        ">
            <div style="
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, transparent 0%, var(--error, #ef4444) 50%, transparent 100%);
            "></div>
            <div style="display: flex; align-items: center; margin-bottom: 16px;">
                <div style="
                    width: 40px;
                    height: 40px;
                    background: var(--error, #ef4444);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 12px;
                    box-shadow: var(--shadow-glow, 0 0 30px rgba(239, 68, 68, 0.4));
                ">
                    <i class="fas fa-exclamation-triangle" style="color: white; font-size: 16px;"></i>
                </div>
                <div>
                    <strong style="color: var(--error, #ef4444); font-size: 16px; font-weight: 600;">图表渲染失败</strong>
                    ${retryCount > 0 ? `<span style="margin-left: 8px; font-size: 12px; color: var(--text-muted, #94a3b8); background: var(--bg-glass, rgba(255,255,255,0.03)); padding: 2px 8px; border-radius: 12px;">重试 ${retryCount}/${maxRetries}</span>` : ''}
                </div>
            </div>
            <p style="margin: 12px 0; font-size: 14px; color: var(--text-secondary, #cbd5e1); line-height: 1.5;">${escapeHtml(errorMessage)}</p>
            <div style="margin: 16px 0; display: flex; gap: 10px; flex-wrap: wrap;">
                ${enableAIFix && diagramId ? `
                    <button id="${fixButtonId}" 
                            data-diagram-id="${diagramId}" 
                            data-code="${escapeHtml(escapeJs(code))}" 
                            data-error="${escapeHtml(escapeJs(errorMessage))}" 
                            data-button-id="${fixButtonId}"
                            onclick="window.mermaidRenderer.handleAIFix(this.dataset.diagramId, this.dataset.code, this.dataset.error, this.dataset.buttonId)" 
                            style="
                                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                                color: white;
                                border: none;
                                padding: 10px 20px;
                                border-radius: 8px;
                                cursor: pointer;
                                font-size: 13px;
                                font-weight: 500;
                                transition: all 0.2s ease;
                                box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
                                display: flex;
                                align-items: center;
                                gap: 6px;
                            "
                            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 8px 32px rgba(16, 185, 129, 0.6)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 20px rgba(16, 185, 129, 0.4)'">
                        <i class="fas fa-magic"></i> AI 自动修复
                    </button>
                ` : ''}
                ${canRetry ? `
                    <button onclick="window.mermaidRenderer.renderDiagram('${retryDiagramId || diagramId || 'current-diagram'}', '${escapeHtml(code)}')" 
                            style="
                                background: var(--primary-gradient, linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%));
                                color: white;
                                border: none;
                                padding: 10px 20px;
                                border-radius: 8px;
                                cursor: pointer;
                                font-size: 13px;
                                font-weight: 500;
                                transition: all 0.2s ease;
                                box-shadow: var(--shadow-primary, 0 4px 20px rgba(79,70,229,0.4));
                                display: flex;
                                align-items: center;
                                gap: 6px;
                            "
                            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='var(--shadow-lg, 0 8px 32px rgba(0,0,0,0.6))'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow-primary, 0 4px 20px rgba(79,70,229,0.4))'">
                        <i class="fas fa-redo" style="margin-right: 6px;"></i> 重试渲染
                    </button>
                ` : ''}
            </div>
            ${code ? `
                <details style="margin: 16px 0; border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.08)); border-radius: 8px; overflow: hidden;">
                    <summary style="
                        background: var(--bg-tertiary, #334155);
                        padding: 12px 16px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 13px;
                        color: var(--text-secondary, #cbd5e1);
                        transition: all 0.2s ease;
                    ">查看原始代码</summary>
                    <pre style="
                        background: var(--bg-primary, #0f172a);
                        border: none;
                        padding: 16px;
                        margin: 0;
                        font-size: 12px;
                        line-height: 1.5;
                        overflow-x: auto;
                        color: var(--text-primary, #f8fafc);
                        font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
                    "><code>${escapeHtml(code)}</code></pre>
                </details>
            ` : ''}
        </div>
    `;
};

export const buildMermaidDiagramContainerHtml = (
    { diagramId, code, showHeader = true, showActions = true, headerLabel = 'MERMAID 图表', sourceLine = null },
    { escapeHtml }
) => {
    const headerHtml = showHeader ? `
        <div class="mermaid-diagram-header">
            <div class="mermaid-diagram-info">
                <span class="mermaid-diagram-label">${headerLabel}</span>
            </div>
            ${showActions ? `
                <div class="mermaid-diagram-actions">
                    <button class="mermaid-diagram-copy" 
                            onclick="window.copyMermaidCode('${diagramId}')" 
                            type="button"
                            title="复制图表代码">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="mermaid-diagram-download-svg" 
                            onclick="window.downloadMermaidSVG('${diagramId}')" 
                            type="button"
                            title="下载SVG">
                        <i class="fas fa-file-code"></i>
                    </button>
                    <button class="mermaid-diagram-edit" 
                            onclick="window.openMermaidLive('${diagramId}')" 
                            type="button"
                            title="在 Mermaid Live Editor 中编辑">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                    <button class="mermaid-diagram-download-png" 
                            onclick="window.downloadMermaidPNG('${diagramId}')" 
                            type="button"
                            title="下载PNG">
                        <i class="fas fa-image"></i>
                    </button>
                    <button class="mermaid-diagram-fullscreen" 
                            onclick="window.openMermaidFullscreen('${diagramId}')" 
                            type="button"
                            title="全屏查看">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>
            ` : ''}
        </div>
    ` : '';

    return `
        <div class="mermaid-diagram-wrapper" data-source-line="${sourceLine || ''}">
            ${headerHtml}
            <div class="mermaid-diagram-container" id="${diagramId}" data-mermaid-code="${escapeHtml(code)}">
            </div>
        </div>
    `;
};
