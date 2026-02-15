import { buildMermaidDiagramContainerHtml, buildMermaidErrorHtml, buildMermaidLoadingHtml } from './mermaidRenderer.templates.js';
import { registerMermaidFullscreen } from './mermaidFullscreen.js';

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
                useMaxWidth: false, // 不使用最大宽度限制，让图表根据内容自适应
                htmlLabels: true,
                curve: 'basis',
                wrap: false, // 不自动换行，保持原始布局
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
                useMaxWidth: false, // 不使用最大宽度限制，让图表根据内容自适应
                rightAngles: false,
                showSequenceNumbers: false,
                wrap: false, // 不自动换行，保持原始布局
            },
            gantt: {
                titleTopMargin: 25,
                barHeight: 20,
                fontSize: 11,
                fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
                sectionFontSize: 11,
                numberSectionStyles: 4,
                useMaxWidth: false, // 不使用最大宽度限制，让图表根据内容自适应
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

        // 检查第一条有效语句是否是有效的 Mermaid 语法（跳过空行和注释/指令）
        const lines = cleanCode.split('\n');
        let firstLine = '';
        for (const rawLine of lines) {
            const line = String(rawLine || '').trim();
            if (!line) continue;
            if (line.startsWith('%%')) continue;
            firstLine = line;
            break;
        }

        if (!firstLine) {
            return {
                valid: false,
                error: '代码为空（仅包含空白或注释）'
            };
        }
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
            
            // 调整图表尺寸（根据内容自适应）
            // 使用 requestAnimationFrame 和多次尝试确保 SVG 渲染完成
            const adjustSize = () => {
                const svg = diagram.querySelector("svg");
                if (svg) {
                    // 检查 SVG 是否已经渲染完成（有内容）
                    const hasContent = svg.children.length > 0 || svg.innerHTML.trim().length > 0;
                    if (hasContent) {
                        this.adjustMermaidSize(diagram);
                    } else {
                        // 如果还没渲染完成，稍后再试
                        setTimeout(adjustSize, 100);
                    }
                } else {
                    // 如果 SVG 还没创建，稍后再试
                    setTimeout(adjustSize, 100);
                }
            };
            
            // 立即尝试一次
            requestAnimationFrame(() => {
                adjustSize();
            });
            
            // 延迟再次尝试（防止首次渲染未完成）
            setTimeout(() => {
                adjustSize();
            }, 100);
            
            // 最终尝试（确保渲染完成）
            setTimeout(() => {
                adjustSize();
            }, 500);
            
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
        return buildMermaidLoadingHtml();
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
            const fromSystem = await window.getData('/src/assets/prompts/mermaid/autoFix.txt');
            
            // 构建用户输入
            const fromUser = `请修复以下 Mermaid 图表代码。代码渲染失败，错误信息：${errorMessage}

原始代码：
\`\`\`
${originalCode}
\`\`\`

请返回修复后的代码，不要包含任何解释或代码块标记。`;
            
            // 调用 AI API（流式请求，统一 JSON 返回）
            const { streamPromptJSON } = await import('/src/services/modules/crud.js');
            const response = await streamPromptJSON(`${window.API_URL}/`, {
                module_name: 'services.ai.chat_service',
                method_name: 'chat',
                parameters: {
                    system: fromSystem,
                    user: fromUser
                }
            });
            let fixedCode = Array.isArray(response?.data) ? response.data.join('') : (response?.data ?? '');
            
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
        return buildMermaidErrorHtml(
            {
                errorMessage,
                code,
                retryCount,
                maxRetries,
                canRetry,
                diagramId,
                retryDiagramId: diagramId || this.getCurrentDiagramId(),
                enableAIFix
            },
            {
                escapeHtml: this.escapeHtml.bind(this),
                escapeJs: this.escapeJs.bind(this)
            }
        );
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
        return buildMermaidDiagramContainerHtml(
            { diagramId, code, showHeader, showActions, headerLabel, sourceLine },
            { escapeHtml: this.escapeHtml.bind(this) }
        );
    }

    /**
     * HTML 转义
     */
    escapeHtml(str) {
        if (typeof str !== 'string' && str == null) return '';
        const unescaped = String(str)
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&');
        return unescaped
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
     * 调整 Mermaid 图表尺寸（根据内容自适应）
     */
    adjustMermaidSize(mermaidDiv) {
        if (!mermaidDiv) return;
        
        // 查找渲染后的 SVG 元素
        const svg = mermaidDiv.querySelector("svg");
        if (!svg) return;
        
        try {
            // 获取父容器的最大宽度（考虑 padding）
            const parent = mermaidDiv.parentElement;
            let maxContainerWidth = parent 
                ? parent.clientWidth - 32 // 减去 padding 和边距
                : window.innerWidth - 100;
            
            // 确保 maxContainerWidth 至少为 100，避免负数或过小的值
            maxContainerWidth = Math.max(maxContainerWidth, 100);
            
            let svgWidth, svgHeight;
            
            // 优先使用 getBBox 获取精确尺寸
            try {
                const bbox = svg.getBBox();
                if (bbox && bbox.width > 0 && bbox.height > 0) {
                    svgWidth = bbox.width;
                    svgHeight = bbox.height;
                }
            } catch (e) {
                // getBBox 可能失败（如 SVG 未渲染完成），继续尝试其他方法
            }
            
            // 如果 getBBox 失败，尝试从属性获取
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
            
            // 如果还是无法获取，使用计算尺寸
            if (!svgWidth || !svgHeight) {
                svgWidth = svg.clientWidth || svg.offsetWidth || svg.scrollWidth;
                svgHeight = svg.clientHeight || svg.offsetHeight || svg.scrollHeight;
            }
            
            // 确保 svgWidth 和 svgHeight 是有效的正数
            svgWidth = Math.max(0, svgWidth || 0);
            svgHeight = Math.max(0, svgHeight || 0);
            
            if (svgWidth > 0 && svgHeight > 0) {
                // 确保 SVG 有 viewBox（用于响应式缩放）
                if (!svg.getAttribute("viewBox")) {
                    svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
                }
                
                // 如果 SVG 宽度超过容器，进行缩放
                if (svgWidth > maxContainerWidth && maxContainerWidth > 0) {
                    const scale = maxContainerWidth / svgWidth;
                    svgWidth = maxContainerWidth;
                    svgHeight = svgHeight * scale;
                    // 再次确保计算后的值不为负数
                    svgWidth = Math.max(0, svgWidth);
                    svgHeight = Math.max(0, svgHeight);
                }
                
                // 只有在值有效时才设置属性
                if (svgWidth > 0 && svgHeight > 0) {
                    svg.setAttribute("width", svgWidth);
                    svg.setAttribute("height", svgHeight);
                }
                
                // 设置容器尺寸，但不超过父容器
                mermaidDiv.style.width = "auto";
                mermaidDiv.style.height = "auto";
                mermaidDiv.style.maxWidth = "100%";
                mermaidDiv.style.minWidth = "0";
            }
        } catch (e) {
            console.warn("[MermaidRenderer] Mermaid size adjustment failed", e);
            // 失败时至少确保容器不会溢出
            mermaidDiv.style.maxWidth = "100%";
            mermaidDiv.style.overflowX = "auto";
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
registerMermaidFullscreen();
console.log('- window.debugMermaidRenderer() - 查看调试信息');
console.log('- window.reRenderAllMermaid() - 重新渲染所有图表');
console.log('- window.getMermaidStats() - 获取渲染统计');
