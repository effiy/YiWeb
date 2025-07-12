/**
 * 快捷键动画管理模块
 
 * 
 * 从shortcuts.js中提取的动画功能，实现页面加载、滚动、交互等动画效果
 */

import { getConfig } from '../../config/index.js';
import { createIntersectionObserver } from '../../utils/dom.js';

/**
 * 动画管理器类
 */
export class AnimationManager {
    constructor() {
        this.animationDuration = getConfig('animation.DURATION.normal', 300);
        this.staggerDelay = getConfig('shortcuts.STAGGER_DELAY', 50);
        this.observers = new Map();
        this.animationFrames = new Set();
        
        this.init();
    }

    /**
     * 初始化动画管理器
     */
    init() {
        this.initLoadAnimations();
        this.initScrollAnimations();
        this.initClickAnimations();
    }

    /**
     * 初始化页面加载动画
     */
    initLoadAnimations() {
        document.addEventListener('DOMContentLoaded', () => {
            this.animateOnLoad();
        });
    }

    /**
     * 页面加载动画
     */
    animateOnLoad() {
        const categories = document.querySelectorAll('.shortcut-category');
        
        categories.forEach((category, index) => {
            // 初始状态
            category.style.opacity = '0';
            category.style.transform = 'translateY(30px)';
            
            // 延迟动画
            setTimeout(() => {
                category.style.transition = `all ${this.animationDuration / 1000}s ease-out`;
                category.style.opacity = '1';
                category.style.transform = 'translateY(0)';
            }, index * this.staggerDelay);
        });
    }

    /**
     * 初始化滚动动画
     */
    initScrollAnimations() {
        const observer = createIntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.animateElementIn(entry.target);
                    }
                });
            },
            {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            }
        );

        // 观察所有分类元素
        document.querySelectorAll('.shortcut-category').forEach(category => {
            observer.observe(category);
        });

        this.observers.set('scroll', observer);
    }

    /**
     * 初始化点击动画
     */
    initClickAnimations() {
        document.addEventListener('click', (event) => {
            const shortcutItem = event.target.closest('.shortcut-item');
            if (shortcutItem) {
                this.animateClick(shortcutItem);
            }
        });
    }

    /**
     * 元素进入动画
     * @param {HTMLElement} element - 要动画的元素
     */
    animateElementIn(element) {
        element.classList.add('animate-in');
        
        // 添加动画完成后的清理
        setTimeout(() => {
            element.classList.remove('animate-in');
        }, this.animationDuration);
    }

    /**
     * 点击动画
     * @param {HTMLElement} element - 被点击的元素
     */
    animateClick(element) {
        element.classList.add('clicked');
        
        setTimeout(() => {
            element.classList.remove('clicked');
        }, this.animationDuration);
    }

    /**
     * 高亮动画
     * @param {HTMLElement} element - 要高亮的元素
     */
    animateHighlight(element) {
        element.classList.add('shortcut-item-animated');
        
        setTimeout(() => {
            element.classList.remove('shortcut-item-animated');
        }, this.animationDuration * 2);
    }

    /**
     * 淡入动画
     * @param {HTMLElement} element - 要动画的元素
     * @param {number} duration - 动画时长
     */
    fadeIn(element, duration = this.animationDuration) {
        element.style.opacity = '0';
        element.style.transition = `opacity ${duration / 1000}s ease-in-out`;
        
        // 强制重排
        element.offsetHeight;
        
        element.style.opacity = '1';
        
        return new Promise(resolve => {
            setTimeout(resolve, duration);
        });
    }

    /**
     * 淡出动画
     * @param {HTMLElement} element - 要动画的元素
     * @param {number} duration - 动画时长
     */
    fadeOut(element, duration = this.animationDuration) {
        element.style.opacity = '1';
        element.style.transition = `opacity ${duration / 1000}s ease-in-out`;
        
        // 强制重排
        element.offsetHeight;
        
        element.style.opacity = '0';
        
        return new Promise(resolve => {
            setTimeout(resolve, duration);
        });
    }

    /**
     * 滑入动画
     * @param {HTMLElement} element - 要动画的元素
     * @param {string} direction - 滑入方向：'up', 'down', 'left', 'right'
     * @param {number} duration - 动画时长
     */
    slideIn(element, direction = 'up', duration = this.animationDuration) {
        const translateMap = {
            up: 'translateY(30px)',
            down: 'translateY(-30px)',
            left: 'translateX(30px)',
            right: 'translateX(-30px)'
        };
        
        element.style.transform = translateMap[direction];
        element.style.opacity = '0';
        element.style.transition = `all ${duration / 1000}s ease-out`;
        
        // 强制重排
        element.offsetHeight;
        
        element.style.transform = 'translate(0)';
        element.style.opacity = '1';
        
        return new Promise(resolve => {
            setTimeout(() => {
                element.style.transform = '';
                element.style.transition = '';
                resolve();
            }, duration);
        });
    }

    /**
     * 滑出动画
     * @param {HTMLElement} element - 要动画的元素
     * @param {string} direction - 滑出方向：'up', 'down', 'left', 'right'
     * @param {number} duration - 动画时长
     */
    slideOut(element, direction = 'up', duration = this.animationDuration) {
        const translateMap = {
            up: 'translateY(-30px)',
            down: 'translateY(30px)',
            left: 'translateX(-30px)',
            right: 'translateX(30px)'
        };
        
        element.style.transform = 'translate(0)';
        element.style.opacity = '1';
        element.style.transition = `all ${duration / 1000}s ease-in`;
        
        // 强制重排
        element.offsetHeight;
        
        element.style.transform = translateMap[direction];
        element.style.opacity = '0';
        
        return new Promise(resolve => {
            setTimeout(resolve, duration);
        });
    }

    /**
     * 缩放动画
     * @param {HTMLElement} element - 要动画的元素
     * @param {number} scale - 缩放倍数
     * @param {number} duration - 动画时长
     */
    scale(element, scale = 1.1, duration = this.animationDuration) {
        element.style.transform = 'scale(1)';
        element.style.transition = `transform ${duration / 1000}s ease-in-out`;
        
        // 强制重排
        element.offsetHeight;
        
        element.style.transform = `scale(${scale})`;
        
        return new Promise(resolve => {
            setTimeout(() => {
                element.style.transform = 'scale(1)';
                setTimeout(() => {
                    element.style.transform = '';
                    element.style.transition = '';
                    resolve();
                }, duration / 2);
            }, duration / 2);
        });
    }

    /**
     * 脉冲动画
     * @param {HTMLElement} element - 要动画的元素
     * @param {number} duration - 动画时长
     */
    pulse(element, duration = this.animationDuration) {
        element.classList.add('pulse');
        
        setTimeout(() => {
            element.classList.remove('pulse');
        }, duration);
    }

    /**
     * 震动动画
     * @param {HTMLElement} element - 要动画的元素
     * @param {number} duration - 动画时长
     */
    shake(element, duration = this.animationDuration) {
        element.classList.add('shake');
        
        setTimeout(() => {
            element.classList.remove('shake');
        }, duration);
    }

    /**
     * 批量动画
     * @param {NodeList|Array} elements - 要动画的元素列表
     * @param {string} animationType - 动画类型
     * @param {number} staggerDelay - 错开延迟
     */
    animateList(elements, animationType = 'fadeIn', staggerDelay = this.staggerDelay) {
        elements.forEach((element, index) => {
            setTimeout(() => {
                this[animationType](element);
            }, index * staggerDelay);
        });
    }

    /**
     * 创建加载动画
     * @param {HTMLElement} container - 容器元素
     */
    createLoadingAnimation(container) {
        const loadingElement = document.createElement('div');
        loadingElement.className = 'loading-animation';
        loadingElement.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">加载中...</div>
        `;
        
        container.appendChild(loadingElement);
        return loadingElement;
    }

    /**
     * 移除加载动画
     * @param {HTMLElement} container - 容器元素
     */
    removeLoadingAnimation(container) {
        const loadingElement = container.querySelector('.loading-animation');
        if (loadingElement) {
            this.fadeOut(loadingElement).then(() => {
                loadingElement.remove();
            });
        }
    }

    /**
     * 创建过渡动画
     * @param {HTMLElement} oldElement - 旧元素
     * @param {HTMLElement} newElement - 新元素
     * @param {string} transitionType - 过渡类型
     */
    createTransition(oldElement, newElement, transitionType = 'crossFade') {
        switch (transitionType) {
            case 'crossFade':
                return this.crossFadeTransition(oldElement, newElement);
            case 'slide':
                return this.slideTransition(oldElement, newElement);
            default:
                return this.crossFadeTransition(oldElement, newElement);
        }
    }

    /**
     * 交叉淡入淡出过渡
     * @param {HTMLElement} oldElement - 旧元素
     * @param {HTMLElement} newElement - 新元素
     */
    async crossFadeTransition(oldElement, newElement) {
        // 设置新元素初始状态
        newElement.style.opacity = '0';
        newElement.style.position = 'absolute';
        newElement.style.top = oldElement.offsetTop + 'px';
        newElement.style.left = oldElement.offsetLeft + 'px';
        
        // 插入新元素
        oldElement.parentNode.insertBefore(newElement, oldElement);
        
        // 同时进行淡出和淡入
        await Promise.all([
            this.fadeOut(oldElement),
            this.fadeIn(newElement)
        ]);
        
        // 清理
        oldElement.remove();
        newElement.style.position = '';
        newElement.style.top = '';
        newElement.style.left = '';
    }

    /**
     * 滑动过渡
     * @param {HTMLElement} oldElement - 旧元素
     * @param {HTMLElement} newElement - 新元素
     */
    async slideTransition(oldElement, newElement) {
        // 设置新元素初始状态
        newElement.style.transform = 'translateX(100%)';
        newElement.style.position = 'absolute';
        newElement.style.top = oldElement.offsetTop + 'px';
        newElement.style.left = oldElement.offsetLeft + 'px';
        newElement.style.width = oldElement.offsetWidth + 'px';
        
        // 插入新元素
        oldElement.parentNode.insertBefore(newElement, oldElement);
        
        // 同时进行滑出和滑入
        await Promise.all([
            this.slideOut(oldElement, 'left'),
            this.slideIn(newElement, 'right')
        ]);
        
        // 清理
        oldElement.remove();
        newElement.style.position = '';
        newElement.style.top = '';
        newElement.style.left = '';
        newElement.style.width = '';
    }

    /**
     * 使用requestAnimationFrame的动画函数
     * @param {Function} callback - 动画回调函数
     */
    requestAnimationFrame(callback) {
        const frame = requestAnimationFrame(callback);
        this.animationFrames.add(frame);
        return frame;
    }

    /**
     * 取消动画帧
     * @param {number} frameId - 动画帧ID
     */
    cancelAnimationFrame(frameId) {
        cancelAnimationFrame(frameId);
        this.animationFrames.delete(frameId);
    }

    /**
     * 清理所有动画
     */
    cleanup() {
        // 清理动画帧
        this.animationFrames.forEach(frameId => {
            cancelAnimationFrame(frameId);
        });
        this.animationFrames.clear();
        
        // 清理观察器
        this.observers.forEach(observer => {
            observer.disconnect();
        });
        this.observers.clear();
        
        // 清理动画类
        document.querySelectorAll('.shortcut-category').forEach(category => {
            category.classList.remove('animate-in', 'clicked', 'pulse', 'shake', 'shortcut-item-animated');
            category.style.opacity = '';
            category.style.transform = '';
            category.style.transition = '';
        });
    }
}

// 导出默认实例
export default new AnimationManager(); 