import { registerMermaidClipboardActions } from './mermaidClipboard.js';
import { registerMermaidDownloadActions } from './mermaidDownload.js';

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
        useMaxWidth: false,
        htmlLabels: true,
        curve: 'basis',
        wrap: false
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
        useMaxWidth: false,
        rightAngles: false,
        showSequenceNumbers: false,
        wrap: false
    },
    gantt: {
        titleTopMargin: 25,
        barHeight: 20,
        fontSize: 11,
        fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
        sectionFontSize: 11,
        numberSectionStyles: 4,
        useMaxWidth: false
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

registerMermaidClipboardActions();
registerMermaidDownloadActions();

window.initMermaid = function(config = {}) {
    if (typeof window.mermaidRenderer !== 'undefined') {
        if (config) {
            window.mermaidRenderer.updateConfig(config);
        }
        return window.mermaidRenderer.initialize();
    }

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

window.renderMermaidDiagram = function(diagramId, code, callback) {
    if (typeof window.mermaidRenderer !== 'undefined') {
        return window.mermaidRenderer.renderDiagram(diagramId, code, {
            onSuccess: callback ? (svg) => callback(null, svg) : null,
            onError: callback ? (error) => callback(error, null) : null
        });
    }

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

    if (!window.mermaidInitialized) {
        window.initMermaid();
    }

    try {
        mermaid.render(`mermaid-svg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, code)
            .then(({ svg }) => {
                diagram.innerHTML = svg;
                diagram.setAttribute('data-mermaid-rendered', 'true');
                console.log(`[Mermaid] 图表 ${diagramId} 渲染成功`);

                const adjustMermaidSize = (mermaidDiv) => {
                    if (!mermaidDiv) return;

                    const svg = mermaidDiv.querySelector("svg");
                    if (!svg) return;

                    try {
                        const parent = mermaidDiv.parentElement;
                        let maxContainerWidth = parent
                            ? parent.clientWidth - 32
                            : window.innerWidth - 100;

                        maxContainerWidth = Math.max(maxContainerWidth, 100);

                        let svgWidth, svgHeight;

                        try {
                            const bbox = svg.getBBox();
                            if (bbox && bbox.width > 0 && bbox.height > 0) {
                                svgWidth = bbox.width;
                                svgHeight = bbox.height;
                            }
                        } catch (_) { }

                        if (!svgWidth || !svgHeight) {
                            const widthAttr = svg.getAttribute("width");
                            const heightAttr = svg.getAttribute("height");
                            const viewBox = svg.getAttribute("viewBox");

                            if (widthAttr && heightAttr) {
                                svgWidth = parseFloat(widthAttr);
                                svgHeight = parseFloat(heightAttr);
                            } else if (viewBox) {
                                const parts = viewBox.split(/\s+/);
                                if (parts.length >= 4) {
                                    svgWidth = parseFloat(parts[2]);
                                    svgHeight = parseFloat(parts[3]);
                                }
                            }
                        }

                        if (!svgWidth || !svgHeight) {
                            svgWidth = svg.clientWidth || svg.offsetWidth || svg.scrollWidth;
                            svgHeight = svg.clientHeight || svg.offsetHeight || svg.scrollHeight;
                        }

                        svgWidth = Math.max(0, svgWidth || 0);
                        svgHeight = Math.max(0, svgHeight || 0);

                        if (svgWidth > 0 && svgHeight > 0) {
                            if (!svg.getAttribute("viewBox")) {
                                svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
                            }

                            if (svgWidth > maxContainerWidth && maxContainerWidth > 0) {
                                const scale = maxContainerWidth / svgWidth;
                                svgWidth = maxContainerWidth;
                                svgHeight = svgHeight * scale;
                                svgWidth = Math.max(0, svgWidth);
                                svgHeight = Math.max(0, svgHeight);
                            }

                            if (svgWidth > 0 && svgHeight > 0) {
                                svg.setAttribute("width", svgWidth);
                                svg.setAttribute("height", svgHeight);
                            }

                            mermaidDiv.style.width = "auto";
                            mermaidDiv.style.height = "auto";
                            mermaidDiv.style.maxWidth = "100%";
                            mermaidDiv.style.minWidth = "0";
                        }
                    } catch (e) {
                        console.warn("[Mermaid] Mermaid size adjustment failed", e);
                        mermaidDiv.style.maxWidth = "100%";
                        mermaidDiv.style.overflowX = "auto";
                    }
                };

                const adjustSize = () => {
                    const svg = diagram.querySelector("svg");
                    if (svg) {
                        const hasContent = svg.children.length > 0 || svg.innerHTML.trim().length > 0;
                        if (hasContent) {
                            adjustMermaidSize(diagram);
                        } else {
                            setTimeout(adjustSize, 100);
                        }
                    } else {
                        setTimeout(adjustSize, 100);
                    }
                };

                requestAnimationFrame(() => {
                    adjustSize();
                });

                setTimeout(() => {
                    adjustSize();
                }, 100);

                setTimeout(() => {
                    adjustSize();
                }, 500);

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

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

console.log('[Mermaid Utils] 工具函数已加载');

