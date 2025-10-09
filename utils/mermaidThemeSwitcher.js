/**
 * Mermaid 主题切换器组件
 * 提供可视化的主题切换界面
 * @author liangliang
 */

class MermaidThemeSwitcher {
    constructor() {
        this.isVisible = false;
        this.switcherElement = null;
        this.themeManager = window.mermaidThemeManager;
        this.init();
    }

    /**
     * 初始化主题切换器
     */
    init() {
        this.createSwitcher();
        this.bindEvents();
        this.loadCurrentTheme();
    }

    /**
     * 创建切换器界面
     */
    createSwitcher() {
        const switcher = document.createElement('div');
        switcher.id = 'mermaid-theme-switcher';
        switcher.className = 'mermaid-theme-switcher';
        switcher.innerHTML = `
            <div class="theme-switcher-toggle" title="切换 Mermaid 主题">
                <i class="fas fa-palette"></i>
            </div>
            <div class="theme-switcher-panel">
                <div class="theme-switcher-header">
                    <h4>Mermaid 主题</h4>
                    <button class="theme-switcher-close" title="关闭">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="theme-switcher-content">
                    <div class="theme-list" id="theme-list">
                        <!-- 主题列表将在这里动态生成 -->
                    </div>
                </div>
            </div>
        `;

        // 添加样式
        this.addStyles();

        document.body.appendChild(switcher);
        this.switcherElement = switcher;
    }

    /**
     * 添加样式
     */
    addStyles() {
        if (document.getElementById('mermaid-theme-switcher-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'mermaid-theme-switcher-styles';
        style.textContent = `
            .mermaid-theme-switcher {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
            }

            .theme-switcher-toggle {
                width: 50px;
                height: 50px;
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
                transition: all 0.3s ease;
                color: white;
                font-size: 18px;
            }

            .theme-switcher-toggle:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
            }

            .theme-switcher-panel {
                position: absolute;
                bottom: 60px;
                right: 0;
                width: 300px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                opacity: 0;
                visibility: hidden;
                transform: translateY(20px);
                transition: all 0.3s ease;
                border: 1px solid #e5e7eb;
            }

            .mermaid-theme-switcher.open .theme-switcher-panel {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }

            .theme-switcher-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid #e5e7eb;
                background: #f8fafc;
                border-radius: 12px 12px 0 0;
            }

            .theme-switcher-header h4 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #1f2937;
            }

            .theme-switcher-close {
                background: none;
                border: none;
                cursor: pointer;
                color: #6b7280;
                font-size: 14px;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s ease;
            }

            .theme-switcher-close:hover {
                background: #e5e7eb;
                color: #374151;
            }

            .theme-switcher-content {
                padding: 16px;
                max-height: 400px;
                overflow-y: auto;
            }

            .theme-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .theme-item {
                display: flex;
                align-items: center;
                padding: 12px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                background: white;
            }

            .theme-item:hover {
                border-color: #6366f1;
                background: #f8fafc;
            }

            .theme-item.active {
                border-color: #6366f1;
                background: #f0f4ff;
            }

            .theme-preview {
                width: 24px;
                height: 24px;
                border-radius: 4px;
                margin-right: 12px;
                border: 1px solid #d1d5db;
            }

            .theme-info {
                flex: 1;
            }

            .theme-name {
                font-weight: 500;
                color: #1f2937;
                font-size: 14px;
                margin: 0 0 2px 0;
            }

            .theme-description {
                font-size: 12px;
                color: #6b7280;
                margin: 0;
            }

            .theme-check {
                color: #6366f1;
                font-size: 16px;
                opacity: 0;
                transition: opacity 0.2s ease;
            }

            .theme-item.active .theme-check {
                opacity: 1;
            }

            /* 暗色主题支持 */
            @media (prefers-color-scheme: dark) {
                .theme-switcher-panel {
                    background: #1f2937;
                    border-color: #374151;
                }

                .theme-switcher-header {
                    background: #111827;
                    border-color: #374151;
                }

                .theme-switcher-header h4 {
                    color: #f9fafb;
                }

                .theme-switcher-close {
                    color: #9ca3af;
                }

                .theme-switcher-close:hover {
                    background: #374151;
                    color: #d1d5db;
                }

                .theme-item {
                    background: #1f2937;
                    border-color: #374151;
                }

                .theme-item:hover {
                    background: #374151;
                }

                .theme-item.active {
                    background: #1e3a8a;
                }

                .theme-name {
                    color: #f9fafb;
                }

                .theme-description {
                    color: #9ca3af;
                }
            }

            /* 响应式设计 */
            @media (max-width: 768px) {
                .mermaid-theme-switcher {
                    bottom: 10px;
                    right: 10px;
                }

                .theme-switcher-panel {
                    width: 280px;
                    right: -10px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        const toggle = this.switcherElement.querySelector('.theme-switcher-toggle');
        const close = this.switcherElement.querySelector('.theme-switcher-close');
        const panel = this.switcherElement.querySelector('.theme-switcher-panel');

        toggle.addEventListener('click', () => {
            this.toggle();
        });

        close.addEventListener('click', () => {
            this.hide();
        });

        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (this.isVisible && !this.switcherElement.contains(e.target)) {
                this.hide();
            }
        });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    /**
     * 加载当前主题
     */
    loadCurrentTheme() {
        if (!this.themeManager) return;

        const themes = this.themeManager.getThemes();
        const currentTheme = this.themeManager.getCurrentTheme();
        const themeList = this.switcherElement.querySelector('#theme-list');

        themeList.innerHTML = themes.map(theme => {
            const previewColors = this.getThemePreviewColors(theme.key);
            return `
                <div class="theme-item ${theme.key === currentTheme ? 'active' : ''}" 
                     data-theme="${theme.key}">
                    <div class="theme-preview" style="background: ${previewColors}"></div>
                    <div class="theme-info">
                        <div class="theme-name">${theme.name}</div>
                        <div class="theme-description">${theme.description}</div>
                    </div>
                    <div class="theme-check">
                        <i class="fas fa-check"></i>
                    </div>
                </div>
            `;
        }).join('');

        // 绑定主题选择事件
        themeList.addEventListener('click', (e) => {
            const themeItem = e.target.closest('.theme-item');
            if (themeItem) {
                const themeKey = themeItem.dataset.theme;
                this.selectTheme(themeKey);
            }
        });
    }

    /**
     * 获取主题预览颜色
     */
    getThemePreviewColors(themeKey) {
        const theme = this.themeManager.getThemeConfig(themeKey);
        if (!theme) return 'linear-gradient(45deg, #6366f1, #8b5cf6)';

        const { themeVariables } = theme;
        const colors = [
            themeVariables.primaryColor || '#6366f1',
            themeVariables.section0 || '#8b5cf6',
            themeVariables.section1 || '#ec4899',
            themeVariables.section2 || '#06b6d4'
        ];

        return `linear-gradient(45deg, ${colors.join(', ')})`;
    }

    /**
     * 选择主题
     */
    selectTheme(themeKey) {
        if (!this.themeManager) return;

        // 更新主题
        this.themeManager.saveTheme(themeKey);

        // 更新UI
        this.updateActiveTheme(themeKey);

        // 重新渲染所有Mermaid图表
        if (window.mermaidRenderer) {
            window.mermaidRenderer.setTheme(themeKey);
            window.mermaidRenderer.reRenderAll();
        }

        console.log(`[主题切换器] 已切换到: ${themeKey}`);
    }

    /**
     * 更新活动主题UI
     */
    updateActiveTheme(themeKey) {
        const themeItems = this.switcherElement.querySelectorAll('.theme-item');
        themeItems.forEach(item => {
            item.classList.toggle('active', item.dataset.theme === themeKey);
        });
    }

    /**
     * 显示切换器
     */
    show() {
        this.switcherElement.classList.add('open');
        this.isVisible = true;
        this.loadCurrentTheme();
    }

    /**
     * 隐藏切换器
     */
    hide() {
        this.switcherElement.classList.remove('open');
        this.isVisible = false;
    }

    /**
     * 切换显示状态
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * 销毁切换器
     */
    destroy() {
        if (this.switcherElement && this.switcherElement.parentNode) {
            this.switcherElement.parentNode.removeChild(this.switcherElement);
        }
    }
}

// 创建全局实例
window.mermaidThemeSwitcher = new MermaidThemeSwitcher();

// 导出类供模块使用
export default MermaidThemeSwitcher;
