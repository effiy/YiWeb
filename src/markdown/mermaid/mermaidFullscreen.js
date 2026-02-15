export const registerMermaidFullscreen = () => {
    window.openMermaidFullscreen = function(diagramId) {
        const diagram = document.getElementById(diagramId);
        if (!diagram) {
            console.error(`[MermaidFullscreen] 未找到图表元素: ${diagramId}`);
            return;
        }
    
        const code = diagram.getAttribute('data-mermaid-code');
        if (!code) {
            console.error(`[MermaidFullscreen] 图表 ${diagramId} 没有代码数据`);
            return;
        }
    
        const fullscreenModal = document.createElement('div');
        fullscreenModal.id = 'mermaid-fullscreen-modal';
        fullscreenModal.className = 'mermaid-fullscreen-modal';
        fullscreenModal.innerHTML = `
            <div class="mermaid-fullscreen-backdrop" onclick="window.closeMermaidFullscreen()"></div>
            <div class="mermaid-fullscreen-container">
                <div class="mermaid-fullscreen-header">
                    <div class="mermaid-fullscreen-title">
                        <i class="fas fa-expand mermaid-fullscreen-title-icon"></i>
                        <span>MERMAID 图表全屏查看</span>
                    </div>
                    <div class="mermaid-fullscreen-actions">
                        <button class="mermaid-fullscreen-btn mermaid-fullscreen-download-svg" onclick="window.downloadMermaidSVG('mermaid-fullscreen-${diagramId}')" title="下载SVG">
                            <i class="fas fa-file-code"></i>
                        </button>
                        <button class="mermaid-fullscreen-btn mermaid-fullscreen-download-png" onclick="window.downloadMermaidPNG('mermaid-fullscreen-${diagramId}')" title="下载PNG">
                            <i class="fas fa-image"></i>
                        </button>
                        <button class="mermaid-fullscreen-btn mermaid-fullscreen-edit" onclick="window.openMermaidLive('${diagramId}')" title="在 Mermaid Live Editor 中编辑">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                        <button class="mermaid-fullscreen-btn mermaid-fullscreen-copy" onclick="window.copyMermaidCode('${diagramId}')" title="复制代码">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="mermaid-fullscreen-btn mermaid-fullscreen-close" onclick="window.closeMermaidFullscreen()" title="关闭全屏">
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
    
                .mermaid-fullscreen-title-icon {
                    margin-right: 8px;
                    color: var(--primary, #4f46e5);
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
                    opacity: 0.85;
                }
    
                .mermaid-fullscreen-btn i {
                    color: currentColor;
                }
    
                .mermaid-fullscreen-btn:disabled {
                    cursor: not-allowed;
                    opacity: 0.75;
                    transform: none;
                    box-shadow: none;
                }
    
                .mermaid-fullscreen-btn:hover {
                    transform: scale(1.06);
                    opacity: 1;
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
                }
    
                .mermaid-fullscreen-btn:active {
                    transform: scale(0.95);
                }
    
                .mermaid-fullscreen-copy {
                    border-color: rgba(79, 70, 229, 0.22);
                }
    
                .mermaid-fullscreen-copy:hover {
                    background: rgba(79, 70, 229, 0.12);
                    border-color: var(--primary, #4f46e5);
                    color: var(--primary, #4f46e5);
                }
    
                .mermaid-fullscreen-download-svg {
                    border-color: rgba(56, 189, 248, 0.22);
                }
    
                .mermaid-fullscreen-download-svg:hover {
                    background: rgba(56, 189, 248, 0.10);
                    border-color: var(--info, #38bdf8);
                    color: var(--info, #38bdf8);
                }
    
                .mermaid-fullscreen-download-png {
                    border-color: rgba(34, 197, 94, 0.22);
                }
    
                .mermaid-fullscreen-download-png:hover {
                    background: rgba(34, 197, 94, 0.10);
                    border-color: var(--success, #22c55e);
                    color: var(--success, #22c55e);
                }
    
                .mermaid-fullscreen-edit {
                    border-color: rgba(245, 158, 11, 0.22);
                }
    
                .mermaid-fullscreen-edit:hover {
                    background: rgba(245, 158, 11, 0.10);
                    border-color: var(--warning, #f59e0b);
                    color: var(--warning, #f59e0b);
                }
    
                .mermaid-fullscreen-close {
                    border-color: rgba(239, 68, 68, 0.22);
                }
    
                .mermaid-fullscreen-close:hover {
                    background: rgba(239, 68, 68, 0.10);
                    border-color: var(--error, #ef4444);
                    color: var(--error, #ef4444);
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
    
        document.body.appendChild(fullscreenModal);
    
        const handleKeydown = (event) => {
            if (event.key === 'Escape') {
                window.closeMermaidFullscreen();
            }
        };
        
        document.addEventListener('keydown', handleKeydown);
        fullscreenModal._keydownHandler = handleKeydown;
    
        const fullscreenDiagram = document.getElementById(`mermaid-fullscreen-${diagramId}`);
        if (window.mermaidRenderer) {
            window.mermaidRenderer.renderDiagram(`mermaid-fullscreen-${diagramId}`, code, {
                container: fullscreenDiagram,
                showLoading: false,
                onSuccess: () => {
                    console.log(`[MermaidFullscreen] 全屏图表 ${diagramId} 渲染成功`);
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
    
        document.body.style.overflow = 'hidden';
    };
    
    window.closeMermaidFullscreen = function() {
        const modal = document.getElementById('mermaid-fullscreen-modal');
        if (modal) {
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
    
        svg.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
    
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.max(0.1, Math.min(5, currentScale * delta));
            
            const rect = container.getBoundingClientRect();
            const centerX = e.clientX - rect.left - rect.width / 2;
            const centerY = e.clientY - rect.top - rect.height / 2;
            
            const scaleDiff = newScale - currentScale;
            currentTranslateX -= centerX * scaleDiff;
            currentTranslateY -= centerY * scaleDiff;
            
            currentScale = newScale;
            svg.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
        }, { passive: false });
    
        svg.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
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
    
        svg.addEventListener('dblclick', (e) => {
            e.preventDefault();
            currentScale = 1;
            currentTranslateX = 0;
            currentTranslateY = 0;
            svg.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
        });
    
        let lastTouchDistance = 0;
        let lastTouchCenterX = 0;
        let lastTouchCenterY = 0;
    
        container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                isDragging = true;
                startX = touch.clientX - currentTranslateX;
                startY = touch.clientY - currentTranslateY;
                svg.classList.add('dragging');
            } else if (e.touches.length === 2) {
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
                const touch = e.touches[0];
                currentTranslateX = touch.clientX - startX;
                currentTranslateY = touch.clientY - startY;
                svg.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
            } else if (e.touches.length === 2) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentDistance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) + 
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );
                
                if (lastTouchDistance > 0) {
                    const scale = currentDistance / lastTouchDistance;
                    const newScale = Math.max(0.1, Math.min(5, currentScale * scale));
                    
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
};
