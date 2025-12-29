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
                canRetry: retryCount < maxRetries,
                diagramId: diagramId,
                enableAIFix: true
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
     * AI 自动修复 Mermaid 代码
     */
    async aiAutoFix(diagramId, originalCode, errorMessage) {
        try {
            console.log(`[MermaidRenderer] 开始 AI 自动修复图表 ${diagramId}`);
            
            // 加载修复 prompt
            const fromSystem = await window.getData('/prompts/mermaid/autoFix.txt');
            
            // 构建用户输入
            const fromUser = `请修复以下 Mermaid 图表代码。代码渲染失败，错误信息：${errorMessage}

原始代码：
\`\`\`
${originalCode}
\`\`\`

请返回修复后的代码，不要包含任何解释或代码块标记。`;
            
            // 调用 AI API（流式请求，统一 JSON 返回）
            const { streamPromptJSON } = await import('/apis/modules/crud.js');
            const response = await streamPromptJSON(`${window.API_URL}/prompt`, {
                fromSystem,
                fromUser
            });
            const fixedCode = Array.isArray(response?.data) ? response.data.join('') : (response?.data ?? '');
            
            // 移除可能的代码块标记
            fixedCode = String(fixedCode)
                .trim()
                .replace(/^```[\w]*\n?/g, '')
                .replace(/\n?```$/g, '')
                .trim();
            
            // 检查是否是无效代码标记
            if (fixedCode.startsWith('INVALID_CODE:')) {
                throw new Error('AI 无法修复此代码：' + fixedCode.replace('INVALID_CODE:', '').trim());
            }
            
            console.log(`[MermaidRenderer] AI 修复完成，重新渲染图表 ${diagramId}`);
            return fixedCode;
            
        } catch (error) {
            console.error(`[MermaidRenderer] AI 自动修复失败:`, error);
            throw error;
        }
    }

    /**
     * 创建错误 HTML
     */
    createErrorHtml(errorMessage, code, options = {}) {
        const { retryCount = 0, maxRetries = 0, canRetry = false, diagramId = null, enableAIFix = true } = options;
        
        // 生成唯一 ID 用于修复按钮
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
                <p style="margin: 12px 0; font-size: 14px; color: var(--text-secondary, #cbd5e1); line-height: 1.5;">${this.escapeHtml(errorMessage)}</p>
                <div style="margin: 16px 0; display: flex; gap: 10px; flex-wrap: wrap;">
                    ${enableAIFix && diagramId ? `
                        <button id="${fixButtonId}" 
                                data-diagram-id="${diagramId}" 
                                data-code="${this.escapeHtml(this.escapeJs(code))}" 
                                data-error="${this.escapeHtml(this.escapeJs(errorMessage))}" 
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
                        <button onclick="window.mermaidRenderer.renderDiagram('${diagramId || this.getCurrentDiagramId()}', '${this.escapeHtml(code)}')" 
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
                        <button class="mermaid-diagram-download-svg" 
                                onclick="window.downloadMermaidSVG('${diagramId}')" 
                                title="下载SVG"
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
                            <i class="fas fa-file-code"></i>
                        </button>
                        <button class="mermaid-diagram-edit" 
                                onclick="window.openMermaidLive('${diagramId}')" 
                                title="在 Mermaid Live Editor 中编辑"
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
                            <i class="fas fa-external-link-alt"></i>
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
                                onclick="window.openMermaidFullscreen('${diagramId}')" 
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
     * 转义 JavaScript 字符串（用于 onclick 等属性）
     */
    escapeJs(str) {
        return String(str)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
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
     * 处理 AI 修复按钮点击
     */
    async handleAIFix(diagramId, originalCode, errorMessage, buttonId) {
        // 解码转义的代码
        const decodeEscaped = (str) => {
            if (!str) return '';
            return String(str)
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '\r')
                .replace(/\\t/g, '\t')
                .replace(/\\'/g, "'")
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
        };

        const diagram = document.getElementById(diagramId);
        if (!diagram) {
            console.error(`[MermaidRenderer] 未找到图表元素: ${diagramId}`);
            if (window.showError) {
                window.showError('未找到图表元素');
            }
            return;
        }

        const button = document.getElementById(buttonId);
        if (button) {
            // 更新按钮状态
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI 正在修复中...';
            button.style.opacity = '0.7';
            button.style.cursor = 'not-allowed';
        }

        // 显示修复中状态
        diagram.innerHTML = this.createLoadingHtml();
        
        try {
            // 解码代码（如果需要）
            let code = decodeEscaped(originalCode);
            try {
                code = this.cleanCode(code);
            } catch (e) {
                console.warn('[MermaidRenderer] 代码清理失败，使用原始代码');
            }

            // 调用 AI 修复
            const fixedCode = await this.aiAutoFix(diagramId, code, errorMessage);
            
            console.log(`[MermaidRenderer] AI 修复成功，使用修复后的代码重新渲染`);
            
            // 使用修复后的代码重新渲染
            await this.renderDiagram(diagramId, fixedCode, {
                showLoading: false,
                onSuccess: (svg) => {
                    console.log(`[MermaidRenderer] 图表 ${diagramId} AI 修复后渲染成功`);
                    if (window.showSuccess) {
                        window.showSuccess('AI 修复成功，图表已重新渲染');
                    }
                    
                    // 更新存储的代码
                    diagram.setAttribute('data-mermaid-code', this.escapeHtml(fixedCode));
                },
                onError: (error) => {
                    console.error(`[MermaidRenderer] 图表 ${diagramId} AI 修复后仍然失败:`, error);
                    
                    // 显示修复失败的错误信息
                    const errorHtml = this.createErrorHtml(
                        `AI 修复后仍然失败: ${error.message}`,
                        fixedCode,
                        {
                            diagramId: diagramId,
                            enableAIFix: false // 修复失败后不再显示修复按钮
                        }
                    );
                    diagram.innerHTML = errorHtml;
                    
                    if (window.showError) {
                        window.showError('AI 修复后仍然失败，请检查代码');
                    }
                }
            });
            
        } catch (error) {
            console.error(`[MermaidRenderer] AI 修复过程出错:`, error);
            
            // 显示修复失败的错误信息
            const errorHtml = this.createErrorHtml(
                `AI 修复失败: ${error.message}`,
                originalCode,
                {
                    diagramId: diagramId,
                    enableAIFix: false
                }
            );
            diagram.innerHTML = errorHtml;
            
            if (window.showError) {
                window.showError('AI 修复失败: ' + error.message);
            }
        } finally {
            // 恢复按钮状态（如果按钮还在）
            if (button && button.parentNode) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-magic"></i> AI 自动修复';
                button.style.opacity = '1';
                button.style.cursor = 'pointer';
            }
        }
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

// 全屏查看功能
window.openMermaidFullscreen = function(diagramId) {
    const diagram = document.getElementById(diagramId);
    if (!diagram) {
        console.error(`[MermaidFullscreen] 未找到图表元素: ${diagramId}`);
        return;
    }

    // 获取图表代码
    const code = diagram.getAttribute('data-mermaid-code');
    if (!code) {
        console.error(`[MermaidFullscreen] 图表 ${diagramId} 没有代码数据`);
        return;
    }

    // 创建全屏模态框
    const fullscreenModal = document.createElement('div');
    fullscreenModal.id = 'mermaid-fullscreen-modal';
    fullscreenModal.className = 'mermaid-fullscreen-modal';
    fullscreenModal.innerHTML = `
        <div class="mermaid-fullscreen-backdrop" onclick="window.closeMermaidFullscreen()"></div>
        <div class="mermaid-fullscreen-container">
            <div class="mermaid-fullscreen-header">
                <div class="mermaid-fullscreen-title">
                    <i class="fas fa-expand" style="margin-right: 8px; color: var(--primary, #4f46e5);"></i>
                    <span>MERMAID 图表全屏查看</span>
                </div>
                <div class="mermaid-fullscreen-actions">
                    <button class="mermaid-fullscreen-btn" onclick="window.downloadMermaidSVG('mermaid-fullscreen-${diagramId}')" title="下载SVG">
                        <i class="fas fa-file-code"></i>
                    </button>
                    <button class="mermaid-fullscreen-btn" onclick="window.downloadMermaidPNG('mermaid-fullscreen-${diagramId}')" title="下载PNG">
                        <i class="fas fa-image"></i>
                    </button>
                    <button class="mermaid-fullscreen-btn" onclick="window.openMermaidLive('${diagramId}')" title="在 Mermaid Live Editor 中编辑">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                    <button class="mermaid-fullscreen-btn" onclick="window.copyMermaidCode('${diagramId}')" title="复制代码">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="mermaid-fullscreen-btn" onclick="window.closeMermaidFullscreen()" title="关闭全屏">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="mermaid-fullscreen-content">
                <div class="mermaid-fullscreen-diagram" id="mermaid-fullscreen-${diagramId}">
                    <div class="mermaid-fullscreen-loading">
                        <div class="mermaid-fullscreen-spinner"></div>
                        <span>正在渲染图表...</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 添加样式
    if (!document.getElementById('mermaid-fullscreen-styles')) {
        const style = document.createElement('style');
        style.id = 'mermaid-fullscreen-styles';
        style.textContent = `
            .mermaid-fullscreen-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: mermaid-fullscreen-fade-in 0.3s ease-out;
            }

            .mermaid-fullscreen-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                cursor: pointer;
            }

            .mermaid-fullscreen-container {
                position: relative;
                width: 95vw;
                height: 95vh;
                max-width: 1400px;
                max-height: 900px;
                background: var(--bg-primary, #0f172a);
                border-radius: 16px;
                border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.1));
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.8);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                animation: mermaid-fullscreen-slide-in 0.3s ease-out;
            }

            .mermaid-fullscreen-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 24px;
                background: var(--bg-tertiary, #334155);
                border-bottom: 1px solid var(--border-primary, rgba(255, 255, 255, 0.08));
                flex-shrink: 0;
            }

            .mermaid-fullscreen-title {
                display: flex;
                align-items: center;
                font-size: 16px;
                font-weight: 600;
                color: var(--text-primary, #f8fafc);
            }

            .mermaid-fullscreen-actions {
                display: flex;
                gap: 8px;
            }

            .mermaid-fullscreen-btn {
                background: var(--bg-glass, rgba(255,255,255,0.05));
                border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.1));
                border-radius: 8px;
                padding: 10px 14px;
                cursor: pointer;
                color: var(--text-secondary, #cbd5e1);
                font-size: 14px;
                transition: all 0.2s ease;
                -webkit-backdrop-filter: blur(4px);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                min-width: 40px;
            }

            .mermaid-fullscreen-btn:hover {
                background: var(--primary-alpha, rgba(79, 70, 229, 0.1));
                border-color: var(--primary, #4f46e5);
                color: var(--primary, #4f46e5);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
            }

            .mermaid-fullscreen-content {
                flex: 1;
                padding: 24px;
                overflow: auto;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--bg-primary, #0f172a);
                position: relative;
            }

            .mermaid-fullscreen-diagram {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            }

            .mermaid-fullscreen-diagram svg {
                max-width: 100%;
                max-height: 100%;
                width: auto;
                height: auto;
                filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
                transition: transform 0.3s ease;
                cursor: grab;
            }

            .mermaid-fullscreen-diagram svg:active {
                cursor: grabbing;
            }

            .mermaid-fullscreen-diagram svg.dragging {
                cursor: grabbing;
            }

            .mermaid-fullscreen-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 16px;
                color: var(--text-secondary, #cbd5e1);
            }

            .mermaid-fullscreen-spinner {
                width: 32px;
                height: 32px;
                border: 3px solid var(--border-primary, rgba(255, 255, 255, 0.1));
                border-top: 3px solid var(--primary, #4f46e5);
                border-radius: 50%;
                animation: mermaid-fullscreen-spin 1s linear infinite;
            }

            @keyframes mermaid-fullscreen-fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes mermaid-fullscreen-slide-in {
                from { 
                    opacity: 0;
                    transform: scale(0.9) translateY(20px);
                }
                to { 
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            @keyframes mermaid-fullscreen-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* 响应式设计 */
            @media (max-width: 768px) {
                .mermaid-fullscreen-container {
                    width: 100vw;
                    height: 100vh;
                    max-width: none;
                    max-height: none;
                    border-radius: 0;
                }
                
                .mermaid-fullscreen-header {
                    padding: 12px 16px;
                }
                
                .mermaid-fullscreen-title {
                    font-size: 14px;
                }
                
                .mermaid-fullscreen-btn {
                    padding: 8px 12px;
                    min-width: 36px;
                }
                
                .mermaid-fullscreen-content {
                    padding: 16px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 添加到页面
    document.body.appendChild(fullscreenModal);

    // 添加键盘事件监听
    const handleKeydown = (event) => {
        if (event.key === 'Escape') {
            window.closeMermaidFullscreen();
        }
    };
    
    // 添加事件监听器
    document.addEventListener('keydown', handleKeydown);
    
    // 将事件监听器存储到模态框元素上，以便后续移除
    fullscreenModal._keydownHandler = handleKeydown;

    // 渲染图表
    const fullscreenDiagram = document.getElementById(`mermaid-fullscreen-${diagramId}`);
    if (window.mermaidRenderer) {
        window.mermaidRenderer.renderDiagram(`mermaid-fullscreen-${diagramId}`, code, {
            container: fullscreenDiagram,
            showLoading: false,
            onSuccess: () => {
                console.log(`[MermaidFullscreen] 全屏图表 ${diagramId} 渲染成功`);
                
                // 添加缩放和拖拽功能
                setTimeout(() => {
                    window.addMermaidFullscreenInteractions(`mermaid-fullscreen-${diagramId}`);
                }, 100);
            },
            onError: (error) => {
                console.error(`[MermaidFullscreen] 全屏图表 ${diagramId} 渲染失败:`, error);
            }
        });
    } else {
        console.error('[MermaidFullscreen] MermaidRenderer 未加载');
    }

    // 阻止背景滚动
    document.body.style.overflow = 'hidden';
};

// 关闭全屏
window.closeMermaidFullscreen = function() {
    const modal = document.getElementById('mermaid-fullscreen-modal');
    if (modal) {
        // 移除键盘事件监听器
        if (modal._keydownHandler) {
            document.removeEventListener('keydown', modal._keydownHandler);
        }
        
        modal.style.animation = 'mermaid-fullscreen-fade-out 0.3s ease-in';
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
};

// 添加关闭动画样式
if (!document.getElementById('mermaid-fullscreen-close-styles')) {
    const style = document.createElement('style');
    style.id = 'mermaid-fullscreen-close-styles';
    style.textContent = `
        @keyframes mermaid-fullscreen-fade-out {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// 添加全屏图表的交互功能（缩放和拖拽）
window.addMermaidFullscreenInteractions = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const svg = container.querySelector('svg');
    if (!svg) return;

    let isDragging = false;
    let startX, startY;
    let currentScale = 1;
    let currentTranslateX = 0;
    let currentTranslateY = 0;

    // 初始化变换
    svg.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;

    // 鼠标滚轮缩放
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(5, currentScale * delta));
        
        // 计算缩放中心点
        const rect = container.getBoundingClientRect();
        const centerX = e.clientX - rect.left - rect.width / 2;
        const centerY = e.clientY - rect.top - rect.height / 2;
        
        // 调整平移以保持缩放中心
        const scaleDiff = newScale - currentScale;
        currentTranslateX -= centerX * scaleDiff;
        currentTranslateY -= centerY * scaleDiff;
        
        currentScale = newScale;
        svg.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
    }, { passive: false });

    // 鼠标拖拽
    svg.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // 左键
            isDragging = true;
            startX = e.clientX - currentTranslateX;
            startY = e.clientY - currentTranslateY;
            svg.classList.add('dragging');
            e.preventDefault();
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            currentTranslateX = e.clientX - startX;
            currentTranslateY = e.clientY - startY;
            svg.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            svg.classList.remove('dragging');
        }
    });

    // 双击重置
    svg.addEventListener('dblclick', (e) => {
        e.preventDefault();
        currentScale = 1;
        currentTranslateX = 0;
        currentTranslateY = 0;
        svg.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
    });

    // 触摸支持
    let lastTouchDistance = 0;
    let lastTouchCenterX = 0;
    let lastTouchCenterY = 0;

    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            // 单指拖拽
            const touch = e.touches[0];
            isDragging = true;
            startX = touch.clientX - currentTranslateX;
            startY = touch.clientY - currentTranslateY;
            svg.classList.add('dragging');
        } else if (e.touches.length === 2) {
            // 双指缩放
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            lastTouchDistance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) + 
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            lastTouchCenterX = (touch1.clientX + touch2.clientX) / 2;
            lastTouchCenterY = (touch1.clientY + touch2.clientY) / 2;
        }
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
        e.preventDefault();
        
        if (e.touches.length === 1 && isDragging) {
            // 单指拖拽
            const touch = e.touches[0];
            currentTranslateX = touch.clientX - startX;
            currentTranslateY = touch.clientY - startY;
            svg.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
        } else if (e.touches.length === 2) {
            // 双指缩放
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) + 
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            
            if (lastTouchDistance > 0) {
                const scale = currentDistance / lastTouchDistance;
                const newScale = Math.max(0.1, Math.min(5, currentScale * scale));
                
                // 计算缩放中心
                const rect = container.getBoundingClientRect();
                const centerX = lastTouchCenterX - rect.left - rect.width / 2;
                const centerY = lastTouchCenterY - rect.top - rect.height / 2;
                
                const scaleDiff = newScale - currentScale;
                currentTranslateX -= centerX * scaleDiff;
                currentTranslateY -= centerY * scaleDiff;
                
                currentScale = newScale;
                svg.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
            }
            
            lastTouchDistance = currentDistance;
        }
    }, { passive: false });

    container.addEventListener('touchend', () => {
        isDragging = false;
        svg.classList.remove('dragging');
        lastTouchDistance = 0;
    });

    console.log(`[MermaidFullscreen] 已为图表 ${containerId} 添加交互功能`);
};
console.log('- window.debugMermaidRenderer() - 查看调试信息');
console.log('- window.reRenderAllMermaid() - 重新渲染所有图表');
console.log('- window.getMermaidStats() - 获取渲染统计');


