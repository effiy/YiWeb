/**
 * 动画工具函数
 * author: liangliang
 */

/**
 * 缓动函数集合
 */
export const easings = {
    linear: t => t,
    easeInQuad: t => t * t,
    easeOutQuad: t => t * (2 - t),
    easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInCubic: t => t * t * t,
    easeOutCubic: t => (--t) * t * t + 1,
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    easeInQuart: t => t * t * t * t,
    easeOutQuart: t => 1 - (--t) * t * t * t,
    easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
    easeInQuint: t => t * t * t * t * t,
    easeOutQuint: t => 1 + (--t) * t * t * t * t,
    easeInOutQuint: t => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t
};

/**
 * 动画帧函数
 * @param {Function} callback - 回调函数
 * @param {number} duration - 持续时间（毫秒）
 * @param {Function} easing - 缓动函数
 * @returns {Function} 取消函数
 */
export function animate(callback, duration = 300, easing = easings.easeInOutQuad) {
    const startTime = performance.now();
    let rafId;

    const step = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easing(progress);

        callback(easedProgress);

        if (progress < 1) {
            rafId = requestAnimationFrame(step);
        }
    };

    rafId = requestAnimationFrame(step);

    return () => {
        if (rafId) {
            cancelAnimationFrame(rafId);
        }
    };
}

/**
 * 数值动画
 * @param {number} from - 起始值
 * @param {number} to - 结束值
 * @param {number} duration - 持续时间
 * @param {Function} onUpdate - 更新回调
 * @param {Function} easing - 缓动函数
 * @returns {Function} 取消函数
 */
export function animateNumber(from, to, duration, onUpdate, easing = easings.easeInOutQuad) {
    return animate((progress) => {
        const value = from + (to - from) * progress;
        onUpdate(value);
    }, duration, easing);
}

/**
 * 滚动动画
 * @param {HTMLElement} element - 元素
 * @param {number} to - 目标位置
 * @param {number} duration - 持续时间
 * @param {Function} easing - 缓动函数
 * @returns {Function} 取消函数
 */
export function animateScroll(element, to, duration = 300, easing = easings.easeInOutQuad) {
    const from = element.scrollTop;

    return animate((progress) => {
        element.scrollTop = from + (to - from) * progress;
    }, duration, easing);
}

/**
 * 淡入动画
 * @param {HTMLElement} element - 元素
 * @param {number} duration - 持续时间
 * @param {Function} easing - 缓动函数
 * @returns {Function} 取消函数
 */
export function fadeIn(element, duration = 300, easing = easings.easeInOutQuad) {
    element.style.opacity = '0';
    element.style.display = '';

    return animate((progress) => {
        element.style.opacity = String(progress);
    }, duration, easing);
}

/**
 * 淡出动画
 * @param {HTMLElement} element - 元素
 * @param {number} duration - 持续时间
 * @param {Function} easing - 缓动函数
 * @returns {Function} 取消函数
 */
export function fadeOut(element, duration = 300, easing = easings.easeInOutQuad) {
    return animate((progress) => {
        element.style.opacity = String(1 - progress);

        if (progress === 1) {
            element.style.display = 'none';
        }
    }, duration, easing);
}

/**
 * 滑入动画
 * @param {HTMLElement} element - 元素
 * @param {number} duration - 持续时间
 * @param {string} direction - 方向 'top' | 'bottom' | 'left' | 'right'
 * @param {Function} easing - 缓动函数
 * @returns {Function} 取消函数
 */
export function slideIn(element, duration = 300, direction = 'top', easing = easings.easeInOutQuad) {
    const height = element.offsetHeight;
    const width = element.offsetWidth;

    element.style.overflow = 'hidden';
    element.style.display = '';

    const transforms = {
        top: (progress) => `translateY(${-height * (1 - progress)}px)`,
        bottom: (progress) => `translateY(${height * (1 - progress)}px)`,
        left: (progress) => `translateX(${-width * (1 - progress)}px)`,
        right: (progress) => `translateX(${width * (1 - progress)}px)`
    };

    return animate((progress) => {
        element.style.transform = transforms[direction](progress);
        element.style.opacity = String(progress);
    }, duration, easing);
}

/**
 * 滑出动画
 * @param {HTMLElement} element - 元素
 * @param {number} duration - 持续时间
 * @param {string} direction - 方向
 * @param {Function} easing - 缓动函数
 * @returns {Function} 取消函数
 */
export function slideOut(element, duration = 300, direction = 'top', easing = easings.easeInOutQuad) {
    const height = element.offsetHeight;
    const width = element.offsetWidth;

    element.style.overflow = 'hidden';

    const transforms = {
        top: (progress) => `translateY(${-height * progress}px)`,
        bottom: (progress) => `translateY(${height * progress}px)`,
        left: (progress) => `translateX(${-width * progress}px)`,
        right: (progress) => `translateX(${width * progress}px)`
    };

    return animate((progress) => {
        element.style.transform = transforms[direction](progress);
        element.style.opacity = String(1 - progress);

        if (progress === 1) {
            element.style.display = 'none';
        }
    }, duration, easing);
}

/**
 * 缩放动画
 * @param {HTMLElement} element - 元素
 * @param {number} from - 起始缩放
 * @param {number} to - 结束缩放
 * @param {number} duration - 持续时间
 * @param {Function} easing - 缓动函数
 * @returns {Function} 取消函数
 */
export function scale(element, from, to, duration = 300, easing = easings.easeInOutQuad) {
    return animate((progress) => {
        const scale = from + (to - from) * progress;
        element.style.transform = `scale(${scale})`;
    }, duration, easing);
}

/**
 * 旋转动画
 * @param {HTMLElement} element - 元素
 * @param {number} from - 起始角度
 * @param {number} to - 结束角度
 * @param {number} duration - 持续时间
 * @param {Function} easing - 缓动函数
 * @returns {Function} 取消函数
 */
export function rotate(element, from, to, duration = 300, easing = easings.easeInOutQuad) {
    return animate((progress) => {
        const angle = from + (to - from) * progress;
        element.style.transform = `rotate(${angle}deg)`;
    }, duration, easing);
}

/**
 * 抖动动画
 * @param {HTMLElement} element - 元素
 * @param {number} intensity - 强度
 * @param {number} duration - 持续时间
 * @returns {Function} 取消函数
 */
export function shake(element, intensity = 10, duration = 500) {
    const originalTransform = element.style.transform;

    return animate((progress) => {
        const offset = Math.sin(progress * Math.PI * 4) * intensity * (1 - progress);
        element.style.transform = `${originalTransform} translateX(${offset}px)`;

        if (progress === 1) {
            element.style.transform = originalTransform;
        }
    }, duration, easings.easeOutQuad);
}

/**
 * 弹跳动画
 * @param {HTMLElement} element - 元素
 * @param {number} height - 弹跳高度
 * @param {number} duration - 持续时间
 * @returns {Function} 取消函数
 */
export function bounce(element, height = 20, duration = 600) {
    const originalTransform = element.style.transform;

    return animate((progress) => {
        const bounceProgress = Math.abs(Math.sin(progress * Math.PI * 2));
        const offset = bounceProgress * height * (1 - progress);
        element.style.transform = `${originalTransform} translateY(-${offset}px)`;

        if (progress === 1) {
            element.style.transform = originalTransform;
        }
    }, duration, easings.easeOutQuad);
}

/**
 * 脉冲动画
 * @param {HTMLElement} element - 元素
 * @param {number} scale - 缩放比例
 * @param {number} duration - 持续时间
 * @returns {Function} 取消函数
 */
export function pulse(element, scale = 1.1, duration = 600) {
    const originalTransform = element.style.transform;

    return animate((progress) => {
        const pulseProgress = Math.abs(Math.sin(progress * Math.PI));
        const currentScale = 1 + (scale - 1) * pulseProgress;
        element.style.transform = `${originalTransform} scale(${currentScale})`;

        if (progress === 1) {
            element.style.transform = originalTransform;
        }
    }, duration, easings.easeInOutQuad);
}

/**
 * 涟漪效果
 * @param {HTMLElement} element - 元素
 * @param {number} x - X坐标
 * @param {number} y - Y坐标
 * @param {string} color - 颜色
 * @param {number} duration - 持续时间
 */
export function ripple(element, x, y, color = 'rgba(255, 255, 255, 0.5)', duration = 600) {
    const rippleElement = document.createElement('span');
    rippleElement.style.position = 'absolute';
    rippleElement.style.borderRadius = '50%';
    rippleElement.style.background = color;
    rippleElement.style.pointerEvents = 'none';
    rippleElement.style.left = `${x}px`;
    rippleElement.style.top = `${y}px`;
    rippleElement.style.width = '0';
    rippleElement.style.height = '0';
    rippleElement.style.transform = 'translate(-50%, -50%)';

    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(rippleElement);

    const maxSize = Math.max(element.offsetWidth, element.offsetHeight) * 2;

    animate((progress) => {
        const size = maxSize * progress;
        rippleElement.style.width = `${size}px`;
        rippleElement.style.height = `${size}px`;
        rippleElement.style.opacity = String(1 - progress);

        if (progress === 1) {
            rippleElement.remove();
        }
    }, duration, easings.easeOutQuad);
}

export default {
    easings,
    animate,
    animateNumber,
    animateScroll,
    fadeIn,
    fadeOut,
    slideIn,
    slideOut,
    scale,
    rotate,
    shake,
    bounce,
    pulse,
    ripple
};
