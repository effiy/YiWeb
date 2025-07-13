/**
 * 快捷键页面主脚本
 * author: liangliang
 * 
 * 功能：
 * - 快捷键搜索和筛选
 * - 分类管理
 * - 交互动画
 * - 键盘导航
 */

// 导入模块化管理器
import shortcutsManager from './shortcuts-manager.js';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('快捷键页面已加载，使用模块化管理器');
    
    // 确保管理器正确初始化
    if (shortcutsManager && typeof shortcutsManager.init === 'function') {
        shortcutsManager.init();
    } else {
        console.error('快捷键管理器初始化失败');
    }
});

// 导出到全局作用域供调试使用
if (typeof window !== 'undefined') {
    window.shortcutsManager = shortcutsManager;
}

// 错误处理
window.addEventListener('error', (error) => {
    console.error('快捷键页面错误:', error);
});



