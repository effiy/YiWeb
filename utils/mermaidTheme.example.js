/**
 * Mermaid 主题系统使用示例
 * @author liangliang
 */

// 示例1: 基础主题切换
function exampleBasicThemeSwitch() {
    // 切换到现代深色主题
    window.setMermaidTheme('modern-dark');
    
    // 切换到现代浅色主题
    window.setMermaidTheme('modern-light');
    
    // 切换到赛博朋克主题
    window.setMermaidTheme('cyberpunk');
    
    // 切换到温暖主题
    window.setMermaidTheme('warm');
    
    // 切换到海洋主题
    window.setMermaidTheme('ocean');
}

// 示例2: 使用主题管理器
function exampleThemeManager() {
    const themeManager = window.mermaidThemeManager;
    
    // 获取所有可用主题
    const themes = themeManager.getThemes();
    console.log('可用主题:', themes);
    
    // 获取当前主题
    const currentTheme = themeManager.getCurrentTheme();
    console.log('当前主题:', currentTheme);
    
    // 切换主题
    themeManager.setTheme('modern-light');
    
    // 保存主题到本地存储
    themeManager.saveTheme('cyberpunk');
}

// 示例3: 创建自定义主题
function exampleCustomTheme() {
    const themeManager = window.mermaidThemeManager;
    
    // 创建自定义主题
    themeManager.createCustomTheme('my-custom-theme', '我的自定义主题', '这是一个自定义主题', {
        theme: 'dark',
        themeVariables: {
            primaryColor: '#ff6b6b',
            primaryTextColor: '#ffffff',
            background: '#2c2c2c',
            mainBkg: '#2c2c2c',
            nodeBkg: '#3c3c3c',
            nodeTextColor: '#ffffff',
            // ... 更多颜色配置
        }
    });
    
    // 使用自定义主题
    themeManager.setTheme('my-custom-theme');
}

// 示例4: 使用主题切换器
function exampleThemeSwitcher() {
    const switcher = window.mermaidThemeSwitcher;
    
    // 显示主题切换器
    switcher.show();
    
    // 隐藏主题切换器
    switcher.hide();
    
    // 切换显示状态
    switcher.toggle();
}

// 示例5: 自动主题检测
function exampleAutoTheme() {
    const themeManager = window.mermaidThemeManager;
    
    // 初始化时自动检测系统主题偏好
    themeManager.init();
    
    // 手动检测系统主题
    const autoTheme = themeManager.autoDetectTheme();
    console.log('系统推荐主题:', autoTheme);
}

// 示例6: 主题预览
function exampleThemePreview() {
    const themes = window.mermaidThemeManager.getThemes();
    
    themes.forEach(theme => {
        console.log(`主题: ${theme.name}`);
        console.log(`描述: ${theme.description}`);
        console.log(`主色调: ${theme.themeVariables.primaryColor}`);
        console.log(`背景色: ${theme.themeVariables.background}`);
        console.log('---');
    });
}

// 示例7: 动态主题切换
function exampleDynamicThemeSwitch() {
    // 监听系统主题变化
    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            const theme = e.matches ? 'modern-dark' : 'modern-light';
            window.setMermaidTheme(theme);
            console.log(`系统主题变化，切换到: ${theme}`);
        });
    }
}

// 示例8: 主题持久化
function exampleThemePersistence() {
    const themeManager = window.mermaidThemeManager;
    
    // 保存主题偏好
    themeManager.saveTheme('modern-dark');
    
    // 页面刷新后会自动恢复保存的主题
    // 因为主题管理器在初始化时会从 localStorage 读取保存的主题
}

console.log('🎨 Mermaid 主题系统示例已加载');
console.log('💡 可用的示例函数:');
console.log('- exampleBasicThemeSwitch() - 基础主题切换');
console.log('- exampleThemeManager() - 主题管理器使用');
console.log('- exampleCustomTheme() - 创建自定义主题');
console.log('- exampleThemeSwitcher() - 主题切换器使用');
console.log('- exampleAutoTheme() - 自动主题检测');
console.log('- exampleThemePreview() - 主题预览');
console.log('- exampleDynamicThemeSwitch() - 动态主题切换');
console.log('- exampleThemePersistence() - 主题持久化');
