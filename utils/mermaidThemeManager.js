/**
 * Mermaid 主题管理器
 * 提供多种现代化主题色彩方案
 * @author liangliang
 */

class MermaidThemeManager {
    constructor() {
        this.currentTheme = 'modern-dark';
        this.themes = {
            // 现代深色主题
            'modern-dark': {
                name: '现代深色',
                description: '深色背景，现代配色',
                theme: 'dark',
                themeVariables: {
                    // 主色调 - 现代蓝紫渐变
                    primaryColor: '#6366f1',
                    primaryTextColor: '#f8fafc',
                    primaryBorderColor: '#8b5cf6',
                    
                    // 背景色系
                    background: '#0f0f23',
                    mainBkg: '#0f0f23',
                    secondBkg: '#1a1a2e',
                    tertiaryBkg: '#16213e',
                    
                    // 节点颜色
                    nodeBkg: '#1e293b',
                    nodeTextColor: '#f1f5f9',
                    clusterBkg: '#334155',
                    clusterTextColor: '#cbd5e1',
                    
                    // 线条和边框
                    lineColor: '#64748b',
                    gridColor: '#475569',
                    
                    // 文本颜色
                    textColor: '#f1f5f9',
                    titleColor: '#f8fafc',
                    edgeLabelColor: '#f1f5f9',
                    edgeLabelBackground: '#1e293b',
                    
                    // 任务和甘特图
                    taskBkgColor: '#6366f1',
                    taskTextColor: '#ffffff',
                    taskTextLightColor: '#ffffff',
                    taskTextOutsideColor: '#f1f5f9',
                    taskTextClickableColor: '#06b6d4',
                    activeTaskBkgColor: '#8b5cf6',
                    activeTaskBorderColor: '#6366f1',
                    
                    // 分区颜色 - 现代渐变
                    section0: '#6366f1',  // 靛蓝
                    section1: '#8b5cf6',  // 紫色
                    section2: '#ec4899',  // 粉色
                    section3: '#06b6d4',  // 青色
                    section4: '#10b981',  // 绿色
                    section5: '#f59e0b',  // 琥珀
                    section6: '#ef4444',  // 红色
                    section7: '#84cc16',  // 酸橙
                    
                    // 其他颜色
                    secondaryColor: '#1e293b',
                    tertiaryColor: '#334155',
                    sectionBkgColor: '#1e293b',
                    altSectionBkgColor: '#334155'
                }
            },
            
            // 现代浅色主题
            'modern-light': {
                name: '现代浅色',
                description: '浅色背景，清新配色',
                theme: 'base',
                themeVariables: {
                    // 主色调 - 现代蓝
                    primaryColor: '#3b82f6',
                    primaryTextColor: '#1e293b',
                    primaryBorderColor: '#2563eb',
                    
                    // 背景色系
                    background: '#ffffff',
                    mainBkg: '#ffffff',
                    secondBkg: '#f8fafc',
                    tertiaryBkg: '#f1f5f9',
                    
                    // 节点颜色
                    nodeBkg: '#f8fafc',
                    nodeTextColor: '#1e293b',
                    clusterBkg: '#e2e8f0',
                    clusterTextColor: '#475569',
                    
                    // 线条和边框
                    lineColor: '#94a3b8',
                    gridColor: '#cbd5e1',
                    
                    // 文本颜色
                    textColor: '#1e293b',
                    titleColor: '#0f172a',
                    edgeLabelColor: '#1e293b',
                    edgeLabelBackground: '#f8fafc',
                    
                    // 任务和甘特图
                    taskBkgColor: '#3b82f6',
                    taskTextColor: '#ffffff',
                    taskTextLightColor: '#ffffff',
                    taskTextOutsideColor: '#1e293b',
                    taskTextClickableColor: '#0284c7',
                    activeTaskBkgColor: '#2563eb',
                    activeTaskBorderColor: '#3b82f6',
                    
                    // 分区颜色 - 清新渐变
                    section0: '#3b82f6',  // 蓝色
                    section1: '#8b5cf6',  // 紫色
                    section2: '#ec4899',  // 粉色
                    section3: '#06b6d4',  // 青色
                    section4: '#10b981',  // 绿色
                    section5: '#f59e0b',  // 琥珀
                    section6: '#ef4444',  // 红色
                    section7: '#84cc16',  // 酸橙
                    
                    // 其他颜色
                    secondaryColor: '#f8fafc',
                    tertiaryColor: '#e2e8f0',
                    sectionBkgColor: '#f8fafc',
                    altSectionBkgColor: '#e2e8f0'
                }
            },
            
            // 科技感主题
            'cyberpunk': {
                name: '赛博朋克',
                description: '霓虹色彩，未来感十足',
                theme: 'dark',
                themeVariables: {
                    // 主色调 - 霓虹绿
                    primaryColor: '#00ff88',
                    primaryTextColor: '#00ff88',
                    primaryBorderColor: '#00ff88',
                    
                    // 背景色系
                    background: '#0a0a0a',
                    mainBkg: '#0a0a0a',
                    secondBkg: '#1a1a1a',
                    tertiaryBkg: '#2a2a2a',
                    
                    // 节点颜色
                    nodeBkg: '#1a1a1a',
                    nodeTextColor: '#00ff88',
                    clusterBkg: '#2a2a2a',
                    clusterTextColor: '#00ff88',
                    
                    // 线条和边框
                    lineColor: '#ff0080',
                    gridColor: '#333333',
                    
                    // 文本颜色
                    textColor: '#00ff88',
                    titleColor: '#00ff88',
                    edgeLabelColor: '#00ff88',
                    edgeLabelBackground: '#1a1a1a',
                    
                    // 任务和甘特图
                    taskBkgColor: '#00ff88',
                    taskTextColor: '#000000',
                    taskTextLightColor: '#000000',
                    taskTextOutsideColor: '#00ff88',
                    taskTextClickableColor: '#ff0080',
                    activeTaskBkgColor: '#00ff88',
                    activeTaskBorderColor: '#ff0080',
                    
                    // 分区颜色 - 霓虹色
                    section0: '#00ff88',  // 霓虹绿
                    section1: '#ff0080',  // 霓虹粉
                    section2: '#0080ff',  // 霓虹蓝
                    section3: '#ff8000',  // 霓虹橙
                    section4: '#8000ff',  // 霓虹紫
                    section5: '#ffff00',  // 霓虹黄
                    section6: '#ff0000',  // 霓虹红
                    section7: '#00ffff',  // 霓虹青
                    
                    // 其他颜色
                    secondaryColor: '#1a1a1a',
                    tertiaryColor: '#2a2a2a',
                    sectionBkgColor: '#1a1a1a',
                    altSectionBkgColor: '#2a2a2a'
                }
            },
            
            // 温暖主题
            'warm': {
                name: '温暖色调',
                description: '暖色调，温馨舒适',
                theme: 'base',
                themeVariables: {
                    // 主色调 - 温暖橙
                    primaryColor: '#f97316',
                    primaryTextColor: '#1c1917',
                    primaryBorderColor: '#ea580c',
                    
                    // 背景色系
                    background: '#fef7ed',
                    mainBkg: '#fef7ed',
                    secondBkg: '#fed7aa',
                    tertiaryBkg: '#fdba74',
                    
                    // 节点颜色
                    nodeBkg: '#fed7aa',
                    nodeTextColor: '#1c1917',
                    clusterBkg: '#fdba74',
                    clusterTextColor: '#92400e',
                    
                    // 线条和边框
                    lineColor: '#fb923c',
                    gridColor: '#fed7aa',
                    
                    // 文本颜色
                    textColor: '#1c1917',
                    titleColor: '#92400e',
                    edgeLabelColor: '#1c1917',
                    edgeLabelBackground: '#fed7aa',
                    
                    // 任务和甘特图
                    taskBkgColor: '#f97316',
                    taskTextColor: '#ffffff',
                    taskTextLightColor: '#ffffff',
                    taskTextOutsideColor: '#1c1917',
                    taskTextClickableColor: '#ea580c',
                    activeTaskBkgColor: '#ea580c',
                    activeTaskBorderColor: '#f97316',
                    
                    // 分区颜色 - 暖色系
                    section0: '#f97316',  // 橙色
                    section1: '#dc2626',  // 红色
                    section2: '#ea580c',  // 深橙
                    section3: '#f59e0b',  // 琥珀
                    section4: '#eab308',  // 黄色
                    section5: '#84cc16',  // 酸橙
                    section6: '#22c55e',  // 绿色
                    section7: '#06b6d4',  // 青色
                    
                    // 其他颜色
                    secondaryColor: '#fed7aa',
                    tertiaryColor: '#fdba74',
                    sectionBkgColor: '#fed7aa',
                    altSectionBkgColor: '#fdba74'
                }
            },
            
            // 海洋主题
            'ocean': {
                name: '海洋蓝',
                description: '海洋色调，清新自然',
                theme: 'base',
                themeVariables: {
                    // 主色调 - 海洋蓝
                    primaryColor: '#0891b2',
                    primaryTextColor: '#0c4a6e',
                    primaryBorderColor: '#0e7490',
                    
                    // 背景色系
                    background: '#f0f9ff',
                    mainBkg: '#f0f9ff',
                    secondBkg: '#e0f2fe',
                    tertiaryBkg: '#bae6fd',
                    
                    // 节点颜色
                    nodeBkg: '#e0f2fe',
                    nodeTextColor: '#0c4a6e',
                    clusterBkg: '#bae6fd',
                    clusterTextColor: '#075985',
                    
                    // 线条和边框
                    lineColor: '#7dd3fc',
                    gridColor: '#bae6fd',
                    
                    // 文本颜色
                    textColor: '#0c4a6e',
                    titleColor: '#075985',
                    edgeLabelColor: '#0c4a6e',
                    edgeLabelBackground: '#e0f2fe',
                    
                    // 任务和甘特图
                    taskBkgColor: '#0891b2',
                    taskTextColor: '#ffffff',
                    taskTextLightColor: '#ffffff',
                    taskTextOutsideColor: '#0c4a6e',
                    taskTextClickableColor: '#0e7490',
                    activeTaskBkgColor: '#0e7490',
                    activeTaskBorderColor: '#0891b2',
                    
                    // 分区颜色 - 海洋色系
                    section0: '#0891b2',  // 青色
                    section1: '#0284c7',  // 天蓝
                    section2: '#0369a1',  // 深蓝
                    section3: '#075985',  // 海军蓝
                    section4: '#0c4a6e',  // 深海军
                    section5: '#06b6d4',  // 浅青
                    section6: '#0d9488',  // 青绿
                    section7: '#059669',  // 绿色
                    
                    // 其他颜色
                    secondaryColor: '#e0f2fe',
                    tertiaryColor: '#bae6fd',
                    sectionBkgColor: '#e0f2fe',
                    altSectionBkgColor: '#bae6fd'
                }
            }
        };
    }

    /**
     * 获取所有可用主题
     */
    getThemes() {
        return Object.keys(this.themes).map(key => ({
            key,
            ...this.themes[key]
        }));
    }

    /**
     * 获取当前主题
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * 设置主题
     */
    setTheme(themeKey) {
        if (!this.themes[themeKey]) {
            console.warn(`[MermaidThemeManager] 主题 "${themeKey}" 不存在`);
            return false;
        }

        this.currentTheme = themeKey;
        const theme = this.themes[themeKey];
        
        // 更新全局 Mermaid 配置
        if (window.mermaidRenderer) {
            window.mermaidRenderer.updateConfig({
                theme: theme.theme,
                themeVariables: theme.themeVariables
            });
        }

        // 更新全局配置
        if (window.MERMAID_CONFIG) {
            window.MERMAID_CONFIG.theme = theme.theme;
        }

        console.log(`[MermaidThemeManager] 主题已切换为: ${theme.name}`);
        return true;
    }

    /**
     * 获取主题配置
     */
    getThemeConfig(themeKey = null) {
        const key = themeKey || this.currentTheme;
        return this.themes[key] || null;
    }

    /**
     * 创建自定义主题
     */
    createCustomTheme(key, name, description, config) {
        this.themes[key] = {
            name,
            description,
            ...config
        };
        console.log(`[MermaidThemeManager] 自定义主题 "${name}" 已创建`);
    }

    /**
     * 删除主题
     */
    removeTheme(themeKey) {
        if (themeKey === this.currentTheme) {
            console.warn(`[MermaidThemeManager] 无法删除当前主题 "${themeKey}"`);
            return false;
        }

        if (this.themes[themeKey]) {
            delete this.themes[themeKey];
            console.log(`[MermaidThemeManager] 主题 "${themeKey}" 已删除`);
            return true;
        }

        return false;
    }

    /**
     * 自动检测系统主题偏好
     */
    autoDetectTheme() {
        if (typeof window !== 'undefined' && window.matchMedia) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            return prefersDark ? 'modern-dark' : 'modern-light';
        }
        return 'modern-dark';
    }

    /**
     * 初始化主题
     */
    init() {
        // 尝试从本地存储恢复主题
        const savedTheme = localStorage.getItem('mermaid-theme');
        if (savedTheme && this.themes[savedTheme]) {
            this.setTheme(savedTheme);
        } else {
            // 自动检测系统主题
            const autoTheme = this.autoDetectTheme();
            this.setTheme(autoTheme);
        }

        // 监听系统主题变化
        if (typeof window !== 'undefined' && window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                const autoTheme = e.matches ? 'modern-dark' : 'modern-light';
                if (!localStorage.getItem('mermaid-theme')) {
                    this.setTheme(autoTheme);
                }
            });
        }
    }

    /**
     * 保存主题到本地存储
     */
    saveTheme(themeKey) {
        if (this.setTheme(themeKey)) {
            localStorage.setItem('mermaid-theme', themeKey);
            return true;
        }
        return false;
    }
}

// 创建全局实例
window.mermaidThemeManager = new MermaidThemeManager();

// 导出类供模块使用
export default MermaidThemeManager;
