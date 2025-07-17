/**
 * 欢迎页面主脚本
 * author: liangliang
 * 
 * 功能：
 * - 初始化输入框处理
 * - 初始化功能卡片
 * - 初始化键盘快捷键
 * - 初始化页面动画
 */

// 导入模块
import { inputHandler } from '../../basic/js/core/utils/inputManager.js';
import { featureCards } from '../../basic/js/core/utils/cardManager.js';
import { keyboardShortcuts } from '../../basic/js/core/utils/keyboard.js';
import { animationManager } from '../../basic/js/core/utils/animations.js';

/**
 * 页面初始化函数
 */
function initWelcomePage() {
    try {
        console.log('开始初始化欢迎页面...');
        
        // 初始化输入框处理
        if (inputHandler && typeof inputHandler.init === 'function') {
            inputHandler.init();
            console.log('输入框处理模块初始化完成');
        }
        
        // 初始化功能卡片
        if (featureCards && typeof featureCards.init === 'function') {
            featureCards.init();
            console.log('功能卡片模块初始化完成');
        }
        
        // 初始化键盘快捷键
        if (keyboardShortcuts && typeof keyboardShortcuts.init === 'function') {
            keyboardShortcuts.init();
            console.log('键盘快捷键模块初始化完成');
        }
        
        // 初始化动画管理器
        if (animationManager && typeof animationManager.init === 'function') {
            animationManager.init();
            console.log('动画管理器初始化完成');
        }
        
        console.log('欢迎页面初始化完成');
        
    } catch (error) {
        console.error('欢迎页面初始化失败:', error);
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWelcomePage);
} else {
    initWelcomePage();
}

// 导出初始化函数（可选）
export { initWelcomePage };


