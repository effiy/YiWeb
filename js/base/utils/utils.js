/**
 * 主页面工具函数模块
 * author: liangliang
 * 
 * 使用共享工具函数，避免代码重复
 */

import { CONFIG } from '../index.js';
import { 
    debounce, 
    throttle, 
    random, 
    createCSSVars,
    safeGetItem,
    safeSetItem
} from './common.js';
import { autoResizeTextarea } from './dom.js';

// 工具函数集合
export const utils = {
    // 使用共享的通用函数
    debounce,
    throttle,
    random,
    createCSSVars,
    safeGetItem,
    safeSetItem,

    // 自动调整文本框高度
    autoResizeTextarea(textarea) {
        // 使用DOM工具函数
        autoResizeTextarea(textarea, {
            maxHeight: CONFIG.MAX_TEXTAREA_HEIGHT
        });
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

    // 获取随机整数
    randomInt(min, max) {
        return Math.floor(this.random(min, max));
    },

    // 性能优化的动画帧请求
    requestAnimationFrame(callback, globalState) {
        if (globalState.isAnimating) {
            return setTimeout(callback, 16); // 约60fps
        }
        return window.requestAnimationFrame(callback);
    }
}; 