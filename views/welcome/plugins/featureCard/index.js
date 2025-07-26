/**
 * 功能卡片主题管理器
 * author: liangliang
 * 功能：为每个卡片随机生成主题色，实现动态主题效果
 */

// 主题色配置
const THEME_CONFIG = {
    // 主题色系 - 丰富的色彩搭配
    colors: [
        { primary: '#9333ea', secondary: '#06b6d4', name: '量子紫青' },
        { primary: '#22c55e', secondary: '#10b981', name: '量子绿蓝' },
        { primary: '#a855f7', secondary: '#ec4899', name: '量子紫粉' },
        { primary: '#f59e0b', secondary: '#ef4444', name: '量子橙红' },
        { primary: '#8b5cf6', secondary: '#06d6a0', name: '量子紫绿' },
        { primary: '#f97316', secondary: '#e11d48', name: '量子橙粉' },
        { primary: '#06b6d4', secondary: '#3b82f6', name: '量子青蓝' },
        { primary: '#10b981', secondary: '#059669', name: '量子绿深' },
        { primary: '#ec4899', secondary: '#be185d', name: '量子粉深' },
        { primary: '#ef4444', secondary: '#dc2626', name: '量子红深' },
        { primary: '#06d6a0', secondary: '#059669', name: '量子青绿' },
        { primary: '#e11d48', secondary: '#be185d', name: '量子粉红' }
    ],
    
    // 透明度配置
    opacity: {
        light: 0.06,
        medium: 0.12,
        heavy: 0.2
    }
};

/**
 * 颜色工具类
 */
class ColorUtils {
    /**
     * 将十六进制颜色转换为RGB数组
     * @param {string} hex - 十六进制颜色值
     * @returns {Array} RGB数组 [r, g, b]
     */
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [0, 0, 0];
    }

    /**
     * 将RGB数组转换为CSS rgba字符串
     * @param {Array} rgb - RGB数组
     * @param {number} alpha - 透明度
     * @returns {string} rgba字符串
     */
    static rgbToRgba(rgb, alpha = 1) {
        return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
    }

    /**
     * 生成随机主题色
     * @returns {Object} 主题色对象
     */
    static getRandomTheme() {
        const randomIndex = Math.floor(Math.random() * THEME_CONFIG.colors.length);
        const theme = THEME_CONFIG.colors[randomIndex];
        
        return {
            primary: theme.primary,
            secondary: theme.secondary,
            primaryRgb: this.hexToRgb(theme.primary),
            secondaryRgb: this.hexToRgb(theme.secondary),
            name: theme.name
        };
    }

    /**
     * 生成互补色主题
     * @param {string} baseColor - 基础颜色
     * @returns {Object} 互补色主题
     */
    static getComplementaryTheme(baseColor) {
        const rgb = this.hexToRgb(baseColor);
        const complementary = rgb.map(c => 255 - c);
        const complementaryHex = '#' + complementary.map(c => 
            Math.round(c).toString(16).padStart(2, '0')
        ).join('');
        
        return {
            primary: baseColor,
            secondary: complementaryHex,
            primaryRgb: rgb,
            secondaryRgb: complementary,
            name: '互补色主题'
        };
    }
}

/**
 * 主题管理器
 */
class ThemeManager {
    constructor() {
        this.appliedThemes = new Map();
        this.initialized = false;
    }

    /**
     * 初始化主题管理器
     */
    init() {
        if (this.initialized) return;
        
        console.log('[ThemeManager] 初始化主题管理器');
        this.initialized = true;
        
        // 监听卡片创建事件
        this.observeCardCreation();
    }

    /**
     * 监听卡片创建
     */
    observeCardCreation() {
        // 使用MutationObserver监听DOM变化
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 检查新添加的卡片
                        if (node.classList && node.classList.contains('feature-card')) {
                            this.applyRandomTheme(node);
                        }
                        // 检查子元素中的卡片
                        const cards = node.querySelectorAll ? node.querySelectorAll('.feature-card') : [];
                        cards.forEach(card => this.applyRandomTheme(card));
                    }
                });
            });
        });

        // 开始观察
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 处理已存在的卡片
        this.applyThemesToExistingCards();
    }

    /**
     * 为现有卡片应用主题
     */
    applyThemesToExistingCards() {
        const cards = document.querySelectorAll('.feature-card');
        cards.forEach(card => this.applyRandomTheme(card));
    }

    /**
     * 为单个卡片应用随机主题
     * @param {HTMLElement} card - 卡片元素
     */
    applyRandomTheme(card) {
        if (!card || card.dataset.themeApplied) return;

        const theme = ColorUtils.getRandomTheme();
        this.applyThemeToCard(card, theme);
        
        // 标记已应用主题
        card.dataset.themeApplied = 'true';
        card.dataset.themeName = theme.name;
        
        console.log(`[ThemeManager] 为卡片应用主题: ${theme.name}`);
    }

    /**
     * 将主题应用到卡片
     * @param {HTMLElement} card - 卡片元素
     * @param {Object} theme - 主题对象
     */
    applyThemeToCard(card, theme) {
        // 设置CSS变量
        card.style.setProperty('--card-primary', theme.primary);
        card.style.setProperty('--card-secondary', theme.secondary);
        card.style.setProperty('--card-primary-rgb', theme.primaryRgb.join(', '));
        card.style.setProperty('--card-secondary-rgb', theme.secondaryRgb.join(', '));
        
        // 存储主题信息
        this.appliedThemes.set(card, theme);
    }

    /**
     * 重新生成所有卡片的主题
     */
    regenerateAllThemes() {
        console.log('[ThemeManager] 重新生成所有卡片主题');
        
        const cards = document.querySelectorAll('.feature-card');
        cards.forEach(card => {
            // 清除之前的主题标记
            delete card.dataset.themeApplied;
            delete card.dataset.themeName;
            
            // 清除CSS变量
            card.style.removeProperty('--card-primary');
            card.style.removeProperty('--card-secondary');
            card.style.removeProperty('--card-primary-rgb');
            card.style.removeProperty('--card-secondary-rgb');
            
            // 应用新主题
            this.applyRandomTheme(card);
        });
    }

    /**
     * 获取卡片当前主题信息
     * @param {HTMLElement} card - 卡片元素
     * @returns {Object|null} 主题信息
     */
    getCardTheme(card) {
        return this.appliedThemes.get(card) || null;
    }

    /**
     * 获取所有应用的主题统计
     * @returns {Object} 主题统计信息
     */
    getThemeStats() {
        const stats = {};
        this.appliedThemes.forEach((theme) => {
            stats[theme.name] = (stats[theme.name] || 0) + 1;
        });
        return stats;
    }
}

// 创建全局主题管理器实例
const themeManager = new ThemeManager();

// 导出主题管理器
window.FeatureCardThemeManager = themeManager;

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    themeManager.init();
});

// 提供全局方法供外部调用
window.regenerateCardThemes = () => {
    themeManager.regenerateAllThemes();
};

window.getCardThemeStats = () => {
    return themeManager.getThemeStats();
};

console.log('[FeatureCard] 主题管理器已加载'); 