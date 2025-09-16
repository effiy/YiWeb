/**
 * Mermaid 调试工具
 * 用于诊断和修复 Mermaid 图表渲染问题
 */

// 全局调试开关
window.MERMAID_DEBUG = true;

// 调试日志函数
function debugLog(component, message, data = null) {
    if (!window.MERMAID_DEBUG) return;
    
    const timestamp = new Date().toISOString().substr(11, 12);
    const prefix = `[${timestamp}] [${component}]`;
    
    if (data) {
        console.log(`${prefix} ${message}`, data);
    } else {
        console.log(`${prefix} ${message}`);
    }
}

// Mermaid 代码验证器
window.validateMermaidCode = function(code) {
    debugLog('MermaidValidator', '开始验证代码', { code });
    
    if (!code || typeof code !== 'string') {
        return {
            valid: false,
            error: '代码为空或不是字符串',
            code: code
        };
    }
    
    const cleanCode = code.trim();
    if (!cleanCode) {
        return {
            valid: false,
            error: '代码为空（去除空白后）',
            code: cleanCode
        };
    }
    
    // 检查是否包含 HTML 实体
    const hasHtmlEntities = /&[a-zA-Z0-9#]+;/.test(cleanCode);
    if (hasHtmlEntities) {
        debugLog('MermaidValidator', '检测到 HTML 实体', { 
            entities: cleanCode.match(/&[a-zA-Z0-9#]+;/g)
        });
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
            error: `第一行不是有效的 Mermaid 图表类型。找到: "${firstLine}"，期望: ${validTypes.join(', ')}`,
            code: cleanCode,
            firstLine: firstLine,
            validTypes: validTypes
        };
    }
    
    // 检查常见的语法问题
    const issues = [];
    
    // 检查是否有未配对的括号
    const brackets = { '(': ')', '[': ']', '{': '}' };
    const stack = [];
    for (let char of cleanCode) {
        if (brackets[char]) {
            stack.push(brackets[char]);
        } else if (Object.values(brackets).includes(char)) {
            if (stack.pop() !== char) {
                issues.push('可能存在未配对的括号');
                break;
            }
        }
    }
    
    // 检查是否有特殊字符问题
    if (cleanCode.includes('\u00a0')) {
        issues.push('包含不可见的空格字符 (\\u00a0)');
    }
    
    if (cleanCode.includes('\t')) {
        issues.push('包含制表符，可能导致解析问题');
    }
    
    return {
        valid: true,
        type: matchedType,
        code: cleanCode,
        hasHtmlEntities: hasHtmlEntities,
        issues: issues,
        lineCount: cleanCode.split('\n').length
    };
};

// HTML 解码工具
window.decodeMermaidCode = function(code) {
    debugLog('MermaidDecoder', '开始解码', { original: code });
    
    if (!code) return '';
    
    let decoded = code;
    
    // 方法1：使用 DOM 解码
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = code;
        decoded = tempDiv.textContent || tempDiv.innerText || '';
        debugLog('MermaidDecoder', 'DOM 解码完成', { decoded });
    } catch (error) {
        debugLog('MermaidDecoder', 'DOM 解码失败', { error: error.message });
    }
    
    // 方法2：手动解码常见实体
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
        if (decoded.includes(entity)) {
            decoded = decoded.replace(new RegExp(entity, 'g'), replacement);
            debugLog('MermaidDecoder', `替换实体 ${entity}`, { 
                before: decoded.substring(0, 50) + '...',
                after: decoded.substring(0, 50) + '...'
            });
        }
    }
    
    // 清理代码格式
    const cleaned = decoded
        .trim()
        .replace(/^\s+/gm, '') // 移除每行开头的空白
        .replace(/\s+$/gm, '') // 移除每行末尾的空白
        .replace(/\n{3,}/g, '\n\n') // 将多个连续换行替换为最多两个
        .replace(/\r\n/g, '\n') // 统一换行符
        .replace(/\r/g, '\n');
    
    debugLog('MermaidDecoder', '解码完成', {
        original: code.substring(0, 100) + '...',
        decoded: decoded.substring(0, 100) + '...',
        cleaned: cleaned.substring(0, 100) + '...',
        originalLength: code.length,
        decodedLength: decoded.length,
        cleanedLength: cleaned.length
    });
    
    return cleaned;
};

// 渲染调试器
window.debugMermaidRender = function(code, containerId) {
    debugLog('MermaidDebugger', '开始调试渲染', { code, containerId });
    
    // 验证代码
    const validation = window.validateMermaidCode(code);
    debugLog('MermaidDebugger', '代码验证结果', validation);
    
    if (!validation.valid) {
        console.error('[MermaidDebugger] 代码验证失败:', validation.error);
        return validation;
    }
    
    // 检查 Mermaid 是否加载
    if (typeof mermaid === 'undefined') {
        const error = 'Mermaid.js 未加载';
        console.error('[MermaidDebugger]', error);
        return { valid: false, error };
    }
    
    // 检查容器是否存在
    const container = document.getElementById(containerId);
    if (!container) {
        const error = `容器 ${containerId} 不存在`;
        console.error('[MermaidDebugger]', error);
        return { valid: false, error };
    }
    
    // 尝试渲染
    const renderStart = performance.now();
    
    try {
        debugLog('MermaidDebugger', '开始 Mermaid 渲染');
        
        mermaid.render(`debug-svg-${Date.now()}`, validation.code)
            .then(({ svg }) => {
                const renderEnd = performance.now();
                debugLog('MermaidDebugger', '渲染成功', {
                    renderTime: `${(renderEnd - renderStart).toFixed(2)}ms`,
                    svgLength: svg.length
                });
                
                container.innerHTML = svg;
                container.setAttribute('data-mermaid-rendered', 'true');
                
                return { 
                    valid: true, 
                    rendered: true, 
                    renderTime: renderEnd - renderStart,
                    svg: svg.substring(0, 200) + '...'
                };
            })
            .catch(error => {
                const renderEnd = performance.now();
                console.error('[MermaidDebugger] 渲染失败:', error);
                debugLog('MermaidDebugger', '渲染失败', {
                    error: error.message,
                    renderTime: `${(renderEnd - renderStart).toFixed(2)}ms`,
                    code: validation.code
                });
                
                container.innerHTML = `
                    <div class="mermaid-debug-error">
                        <h4>🐛 调试信息</h4>
                        <p><strong>错误:</strong> ${error.message}</p>
                        <details>
                            <summary>代码验证结果</summary>
                            <pre>${JSON.stringify(validation, null, 2)}</pre>
                        </details>
                        <details>
                            <summary>原始代码</summary>
                            <pre><code>${validation.code}</code></pre>
                        </details>
                    </div>
                `;
                
                return { 
                    valid: false, 
                    error: error.message, 
                    validation,
                    renderTime: renderEnd - renderStart
                };
            });
    } catch (error) {
        console.error('[MermaidDebugger] 渲染异常:', error);
        return { valid: false, error: error.message, validation };
    }
};

// 系统诊断
window.diagnoseMermaidSystem = function() {
    const diagnosis = {
        timestamp: new Date().toISOString(),
        mermaidLoaded: typeof mermaid !== 'undefined',
        mermaidVersion: typeof mermaid !== 'undefined' ? mermaid.version || 'unknown' : null,
        markedLoaded: typeof marked !== 'undefined',
        markedVersion: typeof marked !== 'undefined' ? marked.version || 'unknown' : null,
        browser: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled
        },
        dom: {
            mermaidContainers: document.querySelectorAll('.mermaid-diagram-container').length,
            renderedContainers: document.querySelectorAll('.mermaid-diagram-container[data-mermaid-rendered="true"]').length
        }
    };
    
    debugLog('SystemDiagnosis', '系统诊断结果', diagnosis);
    
    // 输出到控制台
    console.group('🔍 Mermaid 系统诊断');
    console.table({
        'Mermaid 已加载': diagnosis.mermaidLoaded,
        'Mermaid 版本': diagnosis.mermaidVersion,
        'Marked 已加载': diagnosis.markedLoaded,
        'Marked 版本': diagnosis.markedVersion,
        '图表容器数量': diagnosis.dom.mermaidContainers,
        '已渲染容器数量': diagnosis.dom.renderedContainers
    });
    console.groupEnd();
    
    return diagnosis;
};

// 添加调试样式
const debugStyle = document.createElement('style');
debugStyle.textContent = `
.mermaid-debug-error {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 6px;
    padding: 15px;
    margin: 10px 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.mermaid-debug-error h4 {
    margin: 0 0 10px 0;
    color: #856404;
    font-size: 14px;
}

.mermaid-debug-error p {
    margin: 8px 0;
    font-size: 13px;
    color: #856404;
}

.mermaid-debug-error details {
    margin: 10px 0;
    border: 1px solid #ffeaa7;
    border-radius: 4px;
}

.mermaid-debug-error summary {
    background: #fff3cd;
    padding: 8px 12px;
    cursor: pointer;
    font-weight: 500;
    font-size: 12px;
    color: #856404;
}

.mermaid-debug-error pre {
    background: #f8f9fa;
    border: none;
    padding: 10px;
    margin: 0;
    font-size: 11px;
    line-height: 1.4;
    overflow-x: auto;
    color: #495057;
}

.mermaid-debug-error code {
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
}
`;
document.head.appendChild(debugStyle);

// 自动运行诊断（如果启用调试）
if (window.MERMAID_DEBUG) {
    // 延迟运行，确保页面加载完成
    setTimeout(() => {
        window.diagnoseMermaidSystem();
    }, 1000);
}

console.log('[MermaidDebug] 调试工具已加载。使用以下函数进行调试:');
console.log('- window.validateMermaidCode(code)');
console.log('- window.decodeMermaidCode(code)');
console.log('- window.debugMermaidRender(code, containerId)');
console.log('- window.diagnoseMermaidSystem()');

