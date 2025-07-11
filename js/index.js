// 主要JavaScript文件 - 欢迎页面功能

// 导入模块
import { utils } from './modules/utils.js';
import { keyboardShortcuts } from './modules/keyboard.js';
import { inputHandler } from './modules/inputManager.js';
import { featureCards } from './modules/cardManager.js';
import { globalState } from './modules/state.js';

// 页面初始化
document.addEventListener('DOMContentLoaded', () => {
    try {
        // 初始化各个模块
        keyboardShortcuts.init();
        inputHandler.init();
        featureCards.init();
        utils.detectKeyboardOpen();

        // 自动聚焦到输入框
        const messageInput = document.querySelector('#messageInput');
        if (messageInput) {
            setTimeout(() => messageInput.focus(), 100);
        }

        console.log('页面初始化完成');
    } catch (error) {
        console.error('页面初始化失败:', error);
    }
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    featureCards.cleanup();
    // 清理全局状态中的定时器和动画帧
    globalState.animationFrames.forEach(frameId => {
        cancelAnimationFrame(frameId);
    });
    globalState.hoverTimeouts.forEach(timeoutId => {
        clearTimeout(timeoutId);
    });
}); 

