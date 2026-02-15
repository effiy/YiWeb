import { findMermaidActionButton, flashMermaidButtonIcon, showMermaidMessage } from './mermaidUi.js';

function decodeHtmlEntities(text) {
    if (!text) return '';

    const tempDiv = document.createElement('div');
    try {
        tempDiv.innerHTML = text;
        return tempDiv.textContent || tempDiv.innerText || text;
    } catch (_) {
        return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/&#x20;/g, ' ')
            .replace(/&#32;/g, ' ');
    }
}

function cleanMermaidCode(code) {
    if (!code) return '';

    return code
        .trim()
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+$/gm, '');
}

function addCopyButtonFeedback(button) {
    if (!button) return;

    const originalIcon = button.querySelector('i');
    if (!originalIcon) return;

    const originalClass = originalIcon.className;
    const originalColor = originalIcon.style.color || '';

    button.style.transition = 'transform 0.2s ease';
    button.style.transform = 'scale(0.95)';
    originalIcon.className = 'fas fa-check';
    originalIcon.style.color = 'var(--success, #52c41a)';
    originalIcon.style.transition = 'all 0.3s ease';

    setTimeout(() => {
        button.style.transform = '';
        originalIcon.className = originalClass;
        originalIcon.style.color = originalColor;

        setTimeout(() => {
            button.style.transition = '';
            originalIcon.style.transition = '';
        }, 300);
    }, 600);
}

function fallbackCopyTextToClipboard(text, silent = false) {
    if (!text) {
        console.warn('[Mermaid] 降级复制：文本为空');
        return false;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;

    textArea.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 2em;
        height: 2em;
        padding: 0;
        border: none;
        outline: none;
        box-shadow: none;
        background: transparent;
        opacity: 0;
        pointer-events: none;
        z-index: -1;
    `;

    textArea.setAttribute('readonly', 'readonly');

    document.body.appendChild(textArea);

    if (/ipad|iphone/i.test(navigator.userAgent)) {
        const range = document.createRange();
        range.selectNodeContents(textArea);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        textArea.setSelectionRange(0, 999999);
    } else {
        textArea.focus();
        textArea.select();
    }

    let success = false;

    try {
        success = document.execCommand('copy');

        if (success) {
            console.log('[Mermaid] 使用降级方法复制成功');
            if (!silent) {
                if (window.showSuccess) {
                    window.showSuccess('图表代码已复制到剪贴板');
                } else {
                    showMermaidMessage('图表代码已复制到剪贴板', 'success');
                }
            }
        } else {
            throw new Error('execCommand("copy") 返回 false');
        }
    } catch (err) {
        console.error('[Mermaid] 降级复制方法失败:', err);

        if (!silent) {
            if (window.showError) {
                window.showError('复制失败，请手动选择文本复制', 5000);
            } else {
                showMermaidMessage('复制失败，请手动复制', 'error');
            }

            try {
                const tempDiv = document.createElement('div');
                tempDiv.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: var(--bg-secondary, #1e293b);
                    border: 2px solid var(--primary, #4f46e5);
                    border-radius: 12px;
                    padding: 20px;
                    max-width: 80%;
                    max-height: 70vh;
                    overflow: auto;
                    z-index: 10000;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
                `;

                const header = document.createElement('div');
                header.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid var(--border-primary, rgba(255, 255, 255, 0.08));
                `;

                const title = document.createElement('h3');
                title.textContent = '请手动复制代码';
                title.style.cssText = `
                    margin: 0;
                    font-size: 16px;
                    color: var(--text-primary, #f8fafc);
                `;

                const closeBtn = document.createElement('button');
                closeBtn.innerHTML = '<i class="fas fa-times"></i>';
                closeBtn.style.cssText = `
                    background: transparent;
                    border: none;
                    color: var(--text-secondary, #cbd5e1);
                    cursor: pointer;
                    font-size: 18px;
                    padding: 4px 8px;
                `;
                closeBtn.onclick = () => tempDiv.remove();

                header.appendChild(title);
                header.appendChild(closeBtn);

                const pre = document.createElement('pre');
                pre.style.cssText = `
                    margin: 0;
                    padding: 16px;
                    background: var(--bg-primary, #0f172a);
                    border-radius: 8px;
                    overflow-x: auto;
                    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
                    font-size: 13px;
                    line-height: 1.6;
                    color: var(--text-primary, #f8fafc);
                    white-space: pre-wrap;
                    word-wrap: break-word;
                `;

                const codeEl = document.createElement('code');
                codeEl.textContent = text;
                pre.appendChild(codeEl);

                tempDiv.appendChild(header);
                tempDiv.appendChild(pre);
                document.body.appendChild(tempDiv);

                const range = document.createRange();
                range.selectNodeContents(codeEl);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);

                setTimeout(() => {
                    if (tempDiv.parentNode) {
                        tempDiv.remove();
                    }
                }, 30000);
            } catch (e) {
                console.error('[Mermaid] 创建手动复制对话框失败:', e);
            }
        }
    } finally {
        try {
            document.body.removeChild(textArea);
        } catch (_) { }

        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
    }

    return success;
}

export function registerMermaidClipboardActions() {
    window.copyMermaidCode = async function(diagramId, options = {}) {
        const { showFeedback = true, cleanCode = true, silent = false } = options;

        let diagram = document.getElementById(diagramId);
        if (!diagram && diagramId.startsWith('mermaid-fullscreen-')) {
            const originalId = diagramId.replace('mermaid-fullscreen-', '');
            diagram = document.getElementById(originalId);
        }

        if (!diagram) {
            console.warn(`[Mermaid] 未找到图表元素: ${diagramId}`);
            if (!silent) {
                if (window.showError) window.showError('未找到图表内容');
                else showMermaidMessage('未找到图表内容', 'error');
            }
            return false;
        }

        let code = diagram.getAttribute('data-mermaid-code');
        if (!code) {
            console.warn(`[Mermaid] 图表 ${diagramId} 没有代码数据`);
            if (!silent) {
                if (window.showError) window.showError('图表没有代码数据');
                else showMermaidMessage('图表没有代码数据', 'error');
            }
            return false;
        }

        code = decodeHtmlEntities(code);
        if (cleanCode) {
            code = cleanMermaidCode(code);
        }

        let copyButton = null;
        if (showFeedback) {
            const buttonSelector = `.mermaid-diagram-copy[onclick*="${diagramId}"], 
                                 button[onclick*="copyMermaidCode('${diagramId}')"],
                                 button[onclick*='copyMermaidCode("${diagramId}")']`;
            copyButton = document.querySelector(buttonSelector);

            if (!copyButton && diagramId.startsWith('mermaid-fullscreen-')) {
                const fullscreenModal = document.getElementById('mermaid-fullscreen-modal');
                if (fullscreenModal) {
                    copyButton = fullscreenModal.querySelector('.mermaid-fullscreen-btn[onclick*="copyMermaidCode"]');
                }
            }
        }

        if (
            typeof window.copyToClipboard === 'function' ||
            (typeof window !== 'undefined' && window.dom && window.dom.copyToClipboard)
        ) {
            try {
                const copyFn = window.copyToClipboard || window.dom.copyToClipboard;
                const success = await copyFn(code);

                if (success) {
                    if (copyButton && showFeedback) addCopyButtonFeedback(copyButton);

                    if (!silent) {
                        if (window.showSuccess) window.showSuccess('图表代码已复制到剪贴板');
                        else showMermaidMessage('图表代码已复制到剪贴板', 'success');
                    }
                    console.log('[Mermaid] 图表代码已复制到剪贴板');
                    return true;
                }
                throw new Error('复制操作返回失败');
            } catch (error) {
                console.warn('[Mermaid] 使用统一复制函数失败，尝试降级方法:', error);
            }
        }

        try {
            if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
                await navigator.clipboard.writeText(code);

                if (copyButton && showFeedback) addCopyButtonFeedback(copyButton);

                if (!silent) {
                    if (window.showSuccess) window.showSuccess('图表代码已复制到剪贴板');
                    else showMermaidMessage('图表代码已复制到剪贴板', 'success');
                }
                console.log('[Mermaid] 图表代码已复制到剪贴板');
                return true;
            }
        } catch (err) {
            console.warn('[Mermaid] Clipboard API 复制失败，使用降级方法:', err);
        }

        const fallbackSuccess = fallbackCopyTextToClipboard(code, silent);
        if (fallbackSuccess && copyButton && showFeedback) addCopyButtonFeedback(copyButton);
        return fallbackSuccess;
    };

    window.openMermaidLive = function(diagramId) {
        const editButton = findMermaidActionButton('openMermaidLive', diagramId);

        let diagram = document.getElementById(diagramId);
        if (!diagram) {
            const fullscreenId = `mermaid-fullscreen-${diagramId}`;
            diagram = document.getElementById(fullscreenId);
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

        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = code;
            code = tempDiv.textContent || tempDiv.innerText || code;
        } catch (_) {
            console.warn('[Mermaid] HTML 解码失败，使用原始代码');
        }

        try {
            let encodedCode;
            try {
                encodedCode = btoa(unescape(encodeURIComponent(code)));
            } catch (e) {
                console.warn('[Mermaid] Base64 编码失败，使用 URI 编码:', e);
                encodedCode = encodeURIComponent(code);
            }

            const editorUrl = `https://mermaid.live/edit#pako:${encodedCode}`;

            window.open(editorUrl, '_blank', 'noopener,noreferrer');
            console.log('[Mermaid] 已在 Mermaid Live Editor 中打开图表');
            showMermaidMessage('正在在新标签页打开编辑器...', 'info');
            if (editButton) {
                flashMermaidButtonIcon(editButton, 'fas fa-check', 'var(--success, #22c55e)', 550);
            }
        } catch (error) {
            console.error('[Mermaid] 打开编辑器失败:', error);
            window.open('https://mermaid.live/edit', '_blank', 'noopener,noreferrer');
            showMermaidMessage('已打开编辑器，请手动粘贴代码', 'info');
            if (editButton) {
                flashMermaidButtonIcon(editButton, 'fas fa-check', 'var(--success, #22c55e)', 550);
            }
        }
    };
}

