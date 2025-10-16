/**
 * Mermaid 渲染管理器
 * 统一管理所有 Mermaid 图表的渲染逻辑
 */
class MermaidRenderer {
    constructor() {
        this.isInitialized = false;
        this.renderQueue = [];
        this.config = {
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
            fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif',
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
    }

    /**
     * 初始化 Mermaid
     */
    async initialize() {
        if (this.isInitialized) {
            return true;
        }

        if (typeof mermaid === 'undefined') {
            console.warn('[MermaidRenderer] Mermaid.js 未加载');
            return false;
        }

        try {
            mermaid.initialize(this.config);
            this.isInitialized = true;
            console.log('[MermaidRenderer] 初始化成功');
            
            // 处理队列中的渲染任务
            this.processRenderQueue();
            return true;
        } catch (error) {
            console.error('[MermaidRenderer] 初始化失败:', error);
            return false;
        }
    }

    /**
     * 处理渲染队列
     */
    processRenderQueue() {
        if (this.renderQueue.length === 0) return;

        console.log(`[MermaidRenderer] 处理 ${this.renderQueue.length} 个队列中的渲染任务`);
        
        const tasks = [...this.renderQueue];
        this.renderQueue = [];
        
        tasks.forEach(task => {
            this.renderDiagram(task.diagramId, task.code, task.options);
        });
    }

    /**
     * 验证 Mermaid 代码
     */
    validateCode(code) {
        if (!code || typeof code !== 'string') {
            return {
                valid: false,
                error: '代码为空或不是字符串'
            };
        }

        const cleanCode = code.trim();
        if (!cleanCode) {
            return {
                valid: false,
                error: '代码为空（去除空白后）'
            };
        }

        // 检查第一行是否是有效的 Mermaid 语法
        const firstLine = cleanCode.split('\n')[0].trim();
        const validTypes = [
            'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 
            'stateDiagram', 'stateDiagram-v2', 'gantt', 'pie', 
            'gitgraph', 'erDiagram', 'journey', 'requirementDiagram',
            'c4Context', 'mindmap', 'timeline', 'sankey', 'xychart'
        ];
        
        const matchedType = validTypes.find(type => firstLine.startsWith(type));
        
        if (!matchedType) {
            return {
                valid: false,
                error: `第一行不是有效的 Mermaid 图表类型。找到: "${firstLine}"，期望: ${validTypes.join(', ')}`
            };
        }

        return {
            valid: true,
            type: matchedType,
            code: cleanCode
        };
    }

    /**
     * 清理和解码代码
     */
    cleanCode(code) {
        if (!code) return '';

        // 解码 HTML 实体
        let decoded = code;
        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = code;
            decoded = tempDiv.textContent || tempDiv.innerText || '';
        } catch (error) {
            console.warn('[MermaidRenderer] HTML 解码失败，使用原始代码');
        }

        // 手动解码常见实体
        const entities = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&nbsp;': ' ',
            '&#x20;': ' ',
            '&#32;': ' '
        };
        
        for (const [entity, replacement] of Object.entries(entities)) {
            decoded = decoded.replace(new RegExp(entity, 'g'), replacement);
        }

        // 清理代码格式
        return decoded
            .trim()
            .replace(/^\s+/gm, '') // 移除每行开头的空白
            .replace(/\s+$/gm, '') // 移除每行末尾的空白
            .replace(/\n{3,}/g, '\n\n') // 将多个连续换行替换为最多两个
            .replace(/\r\n/g, '\n') // 统一换行符
            .replace(/\r/g, '\n');
    }

    /**
     * 渲染单个图表
     */
    async renderDiagram(diagramId, code, options = {}) {
        const {
            showLoading = true,
            onSuccess = null,
            onError = null,
            container = null,
            retryCount = 0,
            maxRetries = 2
        } = options;

        // 确保已初始化
        if (!this.isInitialized) {
            this.renderQueue.push({ diagramId, code, options });
            await this.initialize();
            return;
        }

        const diagram = container || document.getElementById(diagramId);
        if (!diagram) {
            const error = new Error(`未找到图表元素: ${diagramId}`);
            console.warn(`[MermaidRenderer] ${error.message}`);
            if (onError) onError(error);
            return;
        }

        // 检查是否已经渲染过
        if (diagram.hasAttribute('data-mermaid-rendered')) {
            console.log(`[MermaidRenderer] 图表 ${diagramId} 已经渲染过了`);
            return;
        }

        // 清理和验证代码
        const cleanCode = this.cleanCode(code);
        const validation = this.validateCode(cleanCode);

        if (!validation.valid) {
            const error = new Error(validation.error);
            const errorHtml = this.createErrorHtml(validation.error, cleanCode);
            diagram.innerHTML = errorHtml;
            if (onError) onError(error);
            return;
        }

        // 显示加载指示器
        if (showLoading) {
            diagram.innerHTML = this.createLoadingHtml();
        }

        try {
            const renderId = `mermaid-svg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const { svg } = await mermaid.render(renderId, validation.code);
            
            diagram.innerHTML = svg;
            diagram.setAttribute('data-mermaid-rendered', 'true');
            diagram.setAttribute('data-mermaid-code', this.escapeHtml(validation.code));
            
            console.log(`[MermaidRenderer] 图表 ${diagramId} 渲染成功`);
            
            if (onSuccess) onSuccess(svg);
        } catch (error) {
            console.error(`[MermaidRenderer] 图表 ${diagramId} 渲染失败:`, error);
            
            // 重试机制
            if (retryCount < maxRetries && this.shouldRetry(error)) {
                console.log(`[MermaidRenderer] 尝试重试渲染图表 ${diagramId} (${retryCount + 1}/${maxRetries})`);
                setTimeout(() => {
                    this.renderDiagram(diagramId, code, {
                        ...options,
                        retryCount: retryCount + 1,
                        showLoading: false
                    });
                }, 1000 * (retryCount + 1)); // 递增延迟
                return;
            }
            
            const errorHtml = this.createErrorHtml(error.message, validation.code, {
                retryCount,
                maxRetries,
                canRetry: retryCount < maxRetries
            });
            diagram.innerHTML = errorHtml;
            
            if (onError) onError(error);
        }
    }

    /**
     * 批量渲染图表
     */
    async renderDiagrams(selector = '.mermaid-diagram-container') {
        const diagrams = document.querySelectorAll(selector);
        console.log(`[MermaidRenderer] 找到 ${diagrams.length} 个图表容器`);

        const renderPromises = Array.from(diagrams).map(diagram => {
            const code = diagram.getAttribute('data-mermaid-code');
            if (!code) {
                console.warn(`[MermaidRenderer] 图表 ${diagram.id} 没有代码数据`);
                return Promise.resolve();
            }

            return this.renderDiagram(diagram.id, code, {
                container: diagram,
                showLoading: true
            });
        });

        await Promise.all(renderPromises);
    }

    /**
     * 创建加载指示器 HTML
     */
    createLoadingHtml() {
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
    }

    /**
     * 判断是否应该重试
     */
    shouldRetry(error) {
        const retryableErrors = [
            'Network error',
            'Timeout',
            'Connection failed',
            'Service unavailable',
            'Temporary failure'
        ];
        
        const errorMessage = error.message || error.toString();
        return retryableErrors.some(retryableError => 
            errorMessage.toLowerCase().includes(retryableError.toLowerCase())
        );
    }

    /**
     * 创建错误 HTML
     */
    createErrorHtml(errorMessage, code, options = {}) {
        const { retryCount = 0, maxRetries = 0, canRetry = false } = options;
        
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
                <p style="margin: 12px 0; font-size: 14px; color: var(--text-secondary, #cbd5e1); line-height: 1.5;">${this.escapeHtml(errorMessage)}</p>
                ${canRetry ? `
                    <div style="margin: 16px 0;">
                        <button onclick="window.mermaidRenderer.renderDiagram('${this.getCurrentDiagramId()}', '${this.escapeHtml(code)}')" 
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
                                "
                                onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='var(--shadow-lg, 0 8px 32px rgba(0,0,0,0.6))'"
                                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow-primary, 0 4px 20px rgba(79,70,229,0.4))'">
                            <i class="fas fa-redo" style="margin-right: 6px;"></i> 重试渲染
                        </button>
                    </div>
                ` : ''}
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
                        "><code>${this.escapeHtml(code)}</code></pre>
                    </details>
                ` : ''}
            </div>
        `;
    }

    /**
     * 创建图表容器 HTML
     */
    createDiagramContainer(diagramId, code, options = {}) {
        const {
            showHeader = true,
            showActions = true,
            headerLabel = 'MERMAID 图表',
            sourceLine = null
        } = options;

        const headerHtml = showHeader ? `
            <div class="mermaid-diagram-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: var(--bg-tertiary, #334155);
                border-bottom: 1px solid var(--border-primary, rgba(255, 255, 255, 0.08));
                border-radius: 12px 12px 0 0;
                position: relative;
            ">
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent 0%, var(--primary, #4f46e5) 50%, transparent 100%);
                    opacity: 0.4;
                "></div>
                <div class="mermaid-diagram-info" style="display: flex; align-items: center; gap: 8px;">
                    <div style="
                        width: 6px;
                        height: 6px;
                        background: var(--primary, #4f46e5);
                        border-radius: 50%;
                        box-shadow: 0 0 8px var(--primary-alpha, rgba(79, 70, 229, 0.3));
                    "></div>
                    <span class="mermaid-diagram-label" style="
                        font-size: 11px;
                        font-weight: 600;
                        color: var(--text-secondary, #cbd5e1);
                        text-transform: uppercase;
                        letter-spacing: 0.8px;
                    ">${headerLabel}</span>
                </div>
                ${showActions ? `
                    <div class="mermaid-diagram-actions" style="display: flex; gap: 6px;">
                        <button class="mermaid-diagram-copy" 
                                onclick="copyMermaidCode('${diagramId}')" 
                                title="复制图表代码"
                                style="
                                    background: var(--bg-glass, rgba(255,255,255,0.03));
                                    border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.08));
                                    border-radius: 6px;
                                    padding: 6px 10px;
                                    cursor: pointer;
                                    color: var(--text-muted, #94a3b8);
                                    font-size: 11px;
                                    transition: all 0.2s ease;
                                    -webkit-backdrop-filter: blur(4px);
                                    backdrop-filter: blur(4px);
                                    box-shadow: var(--shadow-xs, 0 1px 2px 0 rgba(0, 0, 0, 0.4));
                                "
                                onmouseover="this.style.background='var(--primary-alpha, rgba(79, 70, 229, 0.1))'; this.style.borderColor='var(--primary, #4f46e5)'; this.style.color='var(--primary, #4f46e5)'; this.style.transform='translateY(-1px)'"
                                onmouseout="this.style.background='var(--bg-glass, rgba(255,255,255,0.03))'; this.style.borderColor='var(--border-primary, rgba(255, 255, 255, 0.08))'; this.style.color='var(--text-muted, #94a3b8)'; this.style.transform='translateY(0)'">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="mermaid-diagram-download-png" 
                                onclick="window.downloadMermaidPNG('${diagramId}')" 
                                title="下载PNG"
                                style="
                                    background: var(--bg-glass, rgba(255,255,255,0.03));
                                    border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.08));
                                    border-radius: 6px;
                                    padding: 6px 10px;
                                    cursor: pointer;
                                    color: var(--text-muted, #94a3b8);
                                    font-size: 11px;
                                    transition: all 0.2s ease;
                                    -webkit-backdrop-filter: blur(4px);
                                    backdrop-filter: blur(4px);
                                    box-shadow: var(--shadow-xs, 0 1px 2px 0 rgba(0, 0, 0, 0.4));
                                "
                                onmouseover="this.style.background='var(--primary-alpha, rgba(79, 70, 229, 0.1))'; this.style.borderColor='var(--primary, #4f46e5)'; this.style.color='var(--primary, #4f46e5)'; this.style.transform='translateY(-1px)'"
                                onmouseout="this.style.background='var(--bg-glass, rgba(255,255,255,0.03))'; this.style.borderColor='var(--border-primary, rgba(255, 255, 255, 0.08))'; this.style.color='var(--text-muted, #94a3b8)'; this.style.transform='translateY(0)'">
                            <i class="fas fa-image"></i>
                        </button>
                        <button class="mermaid-diagram-fullscreen" 
                                onclick="showMermaidFullscreen('${diagramId}')" 
                                title="全屏查看"
                                style="
                                    background: var(--bg-glass, rgba(255,255,255,0.03));
                                    border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.08));
                                    border-radius: 6px;
                                    padding: 6px 10px;
                                    cursor: pointer;
                                    color: var(--text-muted, #94a3b8);
                                    font-size: 11px;
                                    transition: all 0.2s ease;
                                    -webkit-backdrop-filter: blur(4px);
                                    backdrop-filter: blur(4px);
                                    box-shadow: var(--shadow-xs, 0 1px 2px 0 rgba(0, 0, 0, 0.4));
                                "
                                onmouseover="this.style.background='var(--primary-alpha, rgba(79, 70, 229, 0.1))'; this.style.borderColor='var(--primary, #4f46e5)'; this.style.color='var(--primary, #4f46e5)'; this.style.transform='translateY(-1px)'"
                                onmouseout="this.style.background='var(--bg-glass, rgba(255,255,255,0.03))'; this.style.borderColor='var(--border-primary, rgba(255, 255, 255, 0.08))'; this.style.color='var(--text-muted, #94a3b8)'; this.style.transform='translateY(0)'">
                            <i class="fas fa-expand"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        ` : '';

        return `
            <div class="mermaid-diagram-wrapper" 
                 data-source-line="${sourceLine || ''}"
                 style="
                     border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.08));
                     border-radius: 12px;
                     margin: 16px 0;
                     background: var(--bg-secondary, #1e293b);
                     overflow: hidden;
                     box-shadow: var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.4));
                     transition: all 0.3s ease;
                 "
                 onmouseover="this.style.boxShadow='var(--shadow-md, 0 4px 16px rgba(0,0,0,0.5))'"
                 onmouseout="this.style.boxShadow='var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.4))'">
                ${headerHtml}
                <div class="mermaid-diagram-container" 
                     id="${diagramId}" 
                     data-mermaid-code="${this.escapeHtml(code)}"
                     style="
                         padding: 24px; 
                         min-height: 120px;
                         background: var(--bg-primary, #0f172a);
                         position: relative;
                     ">
                    <div style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 1px;
                        background: linear-gradient(90deg, transparent 0%, var(--primary, #4f46e5) 50%, transparent 100%);
                        opacity: 0.3;
                    "></div>
                    ${code}
                </div>
            </div>
        `;
    }

    /**
     * HTML 转义
     */
    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * 更新配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        if (this.isInitialized) {
            mermaid.initialize(this.config);
        }
    }


    /**
     * 重置渲染状态
     */
    resetRenderedState(selector = '.mermaid-diagram-container') {
        const diagrams = document.querySelectorAll(selector);
        diagrams.forEach(diagram => {
            diagram.removeAttribute('data-mermaid-rendered');
            diagram.innerHTML = diagram.getAttribute('data-mermaid-code') || '';
        });
    }

    /**
     * 获取当前图表 ID（用于重试按钮）
     */
    getCurrentDiagramId() {
        // 这是一个简化的实现，实际使用中可能需要更复杂的逻辑
        return 'current-diagram';
    }

    /**
     * 获取渲染统计信息
     */
    getStats() {
        const diagrams = document.querySelectorAll('.mermaid-diagram-container');
        const rendered = document.querySelectorAll('.mermaid-diagram-container[data-mermaid-rendered="true"]');
        const errors = document.querySelectorAll('.mermaid-error');
        
        return {
            total: diagrams.length,
            rendered: rendered.length,
            errors: errors.length,
            successRate: diagrams.length > 0 ? (rendered.length / diagrams.length * 100).toFixed(2) + '%' : '0%',
            isInitialized: this.isInitialized,
            queueLength: this.renderQueue.length
        };
    }

    /**
     * 重新渲染所有图表
     */
    async reRenderAll() {
        console.log('[MermaidRenderer] 开始重新渲染所有图表');
        
        // 重置所有图表的渲染状态
        this.resetRenderedState();
        
        // 重新渲染
        await this.renderDiagrams();
        
        const stats = this.getStats();
        console.log('[MermaidRenderer] 重新渲染完成:', stats);
        
        return stats;
    }

    /**
     * 调试模式切换
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`[MermaidRenderer] 调试模式 ${enabled ? '已启用' : '已禁用'}`);
    }

    /**
     * 获取调试信息
     */
    getDebugInfo() {
        return {
            version: '1.0.0',
            isInitialized: this.isInitialized,
            config: this.config,
            stats: this.getStats(),
            mermaidVersion: typeof mermaid !== 'undefined' ? mermaid.version || 'unknown' : 'not loaded',
            debugMode: this.debugMode || false,
            renderQueue: this.renderQueue.length
        };
    }

    /**
     * 销毁实例
     */
    destroy() {
        this.isInitialized = false;
        this.renderQueue = [];
        console.log('[MermaidRenderer] 实例已销毁');
    }
}

// 创建全局实例
window.mermaidRenderer = new MermaidRenderer();

// 兼容性函数
window.initMermaid = (config) => {
    if (config) {
        window.mermaidRenderer.updateConfig(config);
    }
    return window.mermaidRenderer.initialize();
};

window.renderMermaidDiagram = (diagramId, code, callback) => {
    return window.mermaidRenderer.renderDiagram(diagramId, code, {
        onSuccess: callback ? (svg) => callback(null, svg) : null,
        onError: callback ? (error) => callback(error, null) : null
    });
};

// 全局调试函数
window.debugMermaidRenderer = function() {
    if (typeof window.mermaidRenderer === 'undefined') {
        console.error('[MermaidRenderer] 渲染管理器未加载');
        return;
    }
    
    const debugInfo = window.mermaidRenderer.getDebugInfo();
    
    console.group('🔍 MermaidRenderer 调试信息');
    console.table({
        '版本': debugInfo.version,
        '已初始化': debugInfo.isInitialized,
        'Mermaid 版本': debugInfo.mermaidVersion,
        '调试模式': debugInfo.debugMode,
        '队列长度': debugInfo.renderQueue
    });
    
    console.group('📊 渲染统计');
    console.table(debugInfo.stats);
    console.groupEnd();
    
    console.group('⚙️ 配置信息');
    console.log(debugInfo.config);
    console.groupEnd();
    
    console.groupEnd();
    
    return debugInfo;
};

// 全局重渲染函数
window.reRenderAllMermaid = function() {
    if (typeof window.mermaidRenderer === 'undefined') {
        console.error('[MermaidRenderer] 渲染管理器未加载');
        return;
    }
    
    return window.mermaidRenderer.reRenderAll();
};

// 全局统计函数
window.getMermaidStats = function() {
    if (typeof window.mermaidRenderer === 'undefined') {
        console.error('[MermaidRenderer] 渲染管理器未加载');
        return null;
    }
    
    return window.mermaidRenderer.getStats();
};


console.log('[MermaidRenderer] 渲染管理器已加载');
console.log('💡 使用以下函数进行调试:');
console.log('- window.debugMermaidRenderer() - 查看调试信息');
console.log('- window.reRenderAllMermaid() - 重新渲染所有图表');
console.log('- window.getMermaidStats() - 获取渲染统计');

