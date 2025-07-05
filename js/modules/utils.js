import { CONFIG, globalState } from './state.js';

// 工具函数模块
export const utils = {
    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

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
        
        const handleResize = utils.debounce(() => {
            const currentViewport = window.innerHeight;
            const isKeyboardOpen = currentViewport < initialViewport * 0.8;
            
            inputSection.classList.toggle('keyboard-open', isKeyboardOpen);
        }, 100);
        
        window.addEventListener('resize', handleResize);
    },

    // 清理动画资源
    cleanupAnimation(cardId) {
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
    requestAnimationFrame(callback) {
        if (globalState.isAnimating) {
            return setTimeout(callback, 16); // 约60fps
        }
        return window.requestAnimationFrame(callback);
    }
}; 