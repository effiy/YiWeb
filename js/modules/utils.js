// 工具函数模块 - 重构后使用共享模块

import { CONFIG } from './config.js';
import { debounce, throttle } from '../../shared/utils/common.js';
import { autoResizeTextarea } from '../../shared/utils/dom.js';

// 工具函数集合
export const utils = {
    // 使用共享的防抖函数
    debounce,
    
    // 使用共享的节流函数
    throttle,

    // 自动调整文本框高度
    autoResizeTextarea(textarea) {
        const resize = () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, CONFIG.MAX_TEXTAREA_HEIGHT) + 'px';
        };
        
        textarea.addEventListener('input', resize);
        textarea.addEventListener('focus', resize);
        
        // 初始化
        resize();
    },

    // 检测键盘弹出
    detectKeyboardOpen() {
        if (!('ontouchstart' in window)) return;
        
        const initialViewport = window.innerHeight;
        const inputSection = document.querySelector('.input-section');
        
        if (!inputSection) return;
        
        const handleResize = this.debounce(() => {
            const currentViewport = window.innerHeight;
            const isKeyboardOpen = currentViewport < initialViewport * 0.8;
            
            inputSection.classList.toggle('keyboard-open', isKeyboardOpen);
        }, 100);
        
        window.addEventListener('resize', handleResize);
    },

    // 清理动画资源
    cleanupAnimation(cardId, globalState) {
        const animationFrame = globalState.animationFrames.get(cardId);
        const hoverTimeout = globalState.hoverTimeouts.get(cardId);
        
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            globalState.animationFrames.delete(cardId);
        }
        
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            globalState.hoverTimeouts.delete(cardId);
        }
    },

    // 创建动画元素
    createAnimationElement(styles, parent) {
        const element = document.createElement('div');
        element.style.cssText = styles;
        parent.appendChild(element);
        return element;
    },

    // 安全移除元素
    safeRemoveElement(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    },

    // 获取随机数
    random(min, max) {
        return Math.random() * (max - min) + min;
    },

    // 获取随机整数
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // 创建CSS变量字符串
    createCSSVars(vars) {
        return Object.entries(vars)
            .map(([key, value]) => `--${key}: ${value}`)
            .join(';');
    },

    // 性能优化的动画帧请求
    requestAnimationFrame(callback, globalState) {
        if (globalState.isAnimating) {
            return setTimeout(callback, 16); // 约60fps
        }
        return window.requestAnimationFrame(callback);
    }
}; 