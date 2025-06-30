// 主要JavaScript文件 - 欢迎页面功能

// 全局状态管理
const globalState = {
    isTyping: false,
    messageIdCounter: 0,
    lastMessageTime: 0,
    typingTimeout: null,
    animationFrames: new Map(), // 存储动画帧ID
    hoverTimeouts: new Map(),    // 存储悬停超时ID
    isAnimating: false          // 防止动画冲突
};

// 常量配置
const CONFIG = {
    ANIMATION: {
        HOVER_DELAY: 100,
        CLICK_DURATION: 150,
        HOVER_DURATION: 2000,
        TRANSITION_DURATION: 400,
        PARTICLE_DELAY: 80,
        EFFECT_DELAY: 50
    },
    MAX_TEXTAREA_HEIGHT: 120,
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 100
};

// 颜色主题配置
const THEME_COLORS = {
    scientist: {
        primary: '#3b82f6',
        secondary: '#06b6d4',
        accent: '#8b5cf6',
        particles: ['#3b82f6', '#06b6d4', '#8b5cf6', '#06b6d4', '#3b82f6']
    },
    geek: {
        primary: '#22c55e',
        secondary: '#10b981',
        accent: '#059669',
        particles: ['#22c55e', '#10b981', '#059669', '#16a34a', '#22c55e']
    },
    artist: {
        primary: '#ec4899',
        secondary: '#a855f7',
        accent: '#f59e0b',
        particles: ['#ec4899', '#a855f7', '#f59e0b', '#10b981', '#ec4899']
    }
};

// 工具函数
const utils = {
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

// 键盘快捷键管理
const keyboardShortcuts = {
    shortcuts: new Map([
        ['k', { ctrl: true, action: 'clearInput' }],
        ['l', { ctrl: true, action: 'focusInput' }],
        ['Escape', { ctrl: false, action: 'blurInput' }]
    ]),

    init() {
        document.addEventListener('keydown', this.handleKeydown.bind(this));
    },

    handleKeydown(e) {
        const shortcut = this.shortcuts.get(e.key);
        if (!shortcut) return;

        const isCtrlPressed = e.ctrlKey || e.metaKey;
        if (shortcut.ctrl && !isCtrlPressed) return;

        e.preventDefault();
        this.executeAction(shortcut.action);
    },

    executeAction(action) {
        const input = document.querySelector('#messageInput');
        if (!input) return;

        switch (action) {
            case 'clearInput':
                input.value = '';
                input.style.height = 'auto';
                input.focus();
                console.log('已清空输入框内容');
                break;
            case 'focusInput':
                input.focus();
                break;
            case 'blurInput':
                input.blur();
                break;
        }
    }
};

// 输入框处理
const inputHandler = {
    init() {
        const messageInput = document.querySelector('#messageInput');
        if (!messageInput) return;

        this.setupTextarea(messageInput);
        this.setupEventListeners(messageInput);
    },

    setupTextarea(textarea) {
        utils.autoResizeTextarea(textarea);
    },

    setupEventListeners(textarea) {
        textarea.addEventListener('keydown', this.handleKeydown.bind(this));
        textarea.addEventListener('input', utils.debounce(this.handleInput.bind(this), CONFIG.DEBOUNCE_DELAY));
        textarea.addEventListener('paste', this.handlePaste.bind(this));
    },

    handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSend();
        }
    },

    handleInput() {
        // 可以在这里添加输入验证或其他处理
    },

    handlePaste(e) {
        // 处理粘贴事件，可以添加内容清理逻辑
        setTimeout(() => {
            const textarea = e.target;
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, CONFIG.MAX_TEXTAREA_HEIGHT) + 'px';
        }, 0);
    },

    handleSend() {
        const messageInput = document.querySelector('#messageInput');
        if (!messageInput || !messageInput.value.trim()) return;

        const message = messageInput.value.trim();
        console.log('发送消息:', message);

        // 这里可以添加发送消息的逻辑
        // 例如跳转到聊天页面或调用API

        // 清空输入框
        messageInput.value = '';
        messageInput.style.height = 'auto';
    }
};

// 动画管理器
const animationManager = {
    animations: {
        scientist: {
            icon: 'scientistScanHover 2s cubic-bezier(0.34, 1.56, 0.64, 1) infinite',
            badge: 'badgePulse 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) infinite'
        },
        geek: {
            icon: 'codeGlowHover 2s cubic-bezier(0.34, 1.56, 0.64, 1) infinite',
            badge: 'terminalBlink 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) infinite'
        },
        artist: {
            icon: 'artistPulseHover 2s cubic-bezier(0.34, 1.56, 0.64, 1) infinite',
            badge: 'creativeSparkle 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) infinite'
        }
    },

    playAnimation(card, feature) {
        const animation = this.animations[feature];
        if (!animation) return;

        const icon = card.querySelector('.card-icon');
        const badge = card.querySelector('.card-badge');

        if (icon) icon.style.animation = animation.icon;
        if (badge) badge.style.animation = animation.badge;
    },

    stopAnimation(card) {
        const icon = card.querySelector('.card-icon');
        const badge = card.querySelector('.card-badge');

        [icon, badge].forEach(element => {
            if (element) {
                element.style.animation = 'none';
                element.offsetHeight; // 强制重绘
                element.style.animation = '';
            }
        });
    }
};

// 点击反馈管理器
const clickFeedbackManager = {
    feedbacks: {
        scientist: {
            particles: { count: 8, size: 6 },
            animation: 'dataFlowAnimation 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            effects: ['ripple', 'glow', 'connection']
        },
        geek: {
            particles: { count: 7, size: 5 },
            animation: 'codeBlockAnimation 1.0s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            effects: ['ripple', 'glow', 'characters']
        },
        artist: {
            particles: { count: 6, size: 7 },
            animation: 'artisticParticleSpin 1.1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            effects: ['ripple', 'glow', 'energy']
        }
    },

    createFeedback(card, feature) {
        if (globalState.isAnimating) return; // 防止动画冲突
        
        const feedback = this.feedbacks[feature];
        if (!feedback) return;

        globalState.isAnimating = true;
        
        const count = feedback.particles.count;

        // 创建卡片缩放效果
        this.createCardScaleEffect(card);
        
        // 创建粒子效果
        this.createParticles(card, feedback, count, feature);
        
        // 创建额外特效
        this.createSpecialEffects(card, feedback, feature);

        // 重置动画状态
        setTimeout(() => {
            globalState.isAnimating = false;
        }, 1500);
    },

    createCardScaleEffect(card) {
        utils.requestAnimationFrame(() => {
            card.style.transform = 'scale(0.95)';
            card.style.transition = `transform ${CONFIG.CLICK_DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
        });

        setTimeout(() => {
            utils.requestAnimationFrame(() => {
                card.style.transform = '';
                card.style.transition = '';
            });
        }, CONFIG.CLICK_DURATION);
    },

    createSpecialEffects(card, feedback, feature) {
        const effects = feedback.effects || [];
        
        effects.forEach((effect, index) => {
            setTimeout(() => {
                this.createEffect(card, effect, feature);
            }, index * CONFIG.ANIMATION.EFFECT_DELAY);
        });

        // 添加随机闪烁效果
        this.createRandomSparkles(card, feature);
        
        // 添加音波效果
        this.createSoundWaves(card, feature);
    },

    createRandomSparkles(card, feature) {
        const sparkleCount = 3;
        const colors = THEME_COLORS[feature].particles;
        
        for (let i = 0; i < sparkleCount; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                const color = colors[i % colors.length];
                const x = utils.random(-60, 60);
                const y = utils.random(-60, 60);
                
                sparkle.style.cssText = `
                    position: absolute;
                    width: 4px;
                    height: 4px;
                    background: ${color};
                    border-radius: 50%;
                    left: calc(50% + ${x}px);
                    top: calc(50% + ${y}px);
                    transform: translate(-50%, -50%);
                    animation: sparkle 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    pointer-events: none;
                    z-index: 996;
                    box-shadow: 0 0 6px ${color};
                `;
                
                card.appendChild(sparkle);
                
                setTimeout(() => {
                    utils.safeRemoveElement(sparkle);
                }, 600);
            }, 200 + i * 150);
        }
    },

    createSoundWaves(card, feature) {
        const waveCount = 2;
        const color = this.getEffectColor(feature, 0.2);
        
        for (let i = 0; i < waveCount; i++) {
            setTimeout(() => {
                const wave = document.createElement('div');
                
                wave.style.cssText = `
                    position: absolute;
                    width: 60px;
                    height: 60px;
                    border: 2px solid ${color};
                    border-radius: 50%;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    animation: soundWave 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    animation-delay: ${i * 0.2}s;
                    pointer-events: none;
                    z-index: 995;
                `;
                
                card.appendChild(wave);
                
                setTimeout(() => {
                    utils.safeRemoveElement(wave);
                }, 800 + i * 200);
            }, 100 + i * 200);
        }
    },

    createEffect(card, effectType, feature) {
        const effect = document.createElement('div');
        let styles = `
            position: absolute;
            pointer-events: none;
            z-index: 999;
            will-change: transform, opacity;
        `;

        switch (effectType) {
            case 'ripple':
                styles += `
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: ${this.getEffectColor(feature, 0.3)};
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    animation: rippleEffect 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                `;
                break;
                
            case 'glow':
                styles += `
                    width: 100%;
                    height: 100%;
                    border-radius: inherit;
                    background: ${this.getEffectColor(feature, 0.1)};
                    left: 0;
                    top: 0;
                    animation: glowPulse 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                `;
                break;
                
            case 'connection':
                this.createDataConnections(card, feature);
                return;
                
            case 'characters':
                this.createCodeCharacters(card, feature);
                return;
                
            case 'energy':
                styles += `
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: ${this.getEffectColor(feature, 0.6)};
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    animation: energyBurst 1.0s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                `;
                break;
        }

        effect.style.cssText = styles;
        card.appendChild(effect);

        setTimeout(() => {
            utils.safeRemoveElement(effect);
        }, 1200);
    },

    createDataConnections(card, feature) {
        const colors = THEME_COLORS[feature].particles;
        for (let i = 0; i < 3; i++) {
            const connection = document.createElement('div');
            const color = colors[i % colors.length];
            
            connection.style.cssText = `
                position: absolute;
                height: 2px;
                width: 40px;
                background: ${color};
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%) rotate(${i * 60}deg);
                animation: dataConnection 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                animation-delay: ${i * 0.1}s;
                pointer-events: none;
                z-index: 998;
                opacity: 0.8;
            `;
            
            card.appendChild(connection);
            
            setTimeout(() => {
                utils.safeRemoveElement(connection);
            }, 800 + i * 100);
        }
    },

    createCodeCharacters(card, feature) {
        const characters = ['<', '>', '/', '{', '}', ';', '=', '+'];
        const colors = THEME_COLORS[feature].particles;
        
        for (let i = 0; i < 5; i++) {
            const char = document.createElement('div');
            const color = colors[i % colors.length];
            const x = utils.random(-40, 40);
            const y = utils.random(-40, 40);
            
            char.style.cssText = `
                position: absolute;
                color: ${color};
                font-size: 14px;
                font-weight: bold;
                font-family: 'Courier New', monospace;
                left: calc(50% + ${x}px);
                top: calc(50% + ${y}px);
                transform: translate(-50%, -50%);
                animation: codeCharacterFloat 1.0s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                animation-delay: ${i * 0.08}s;
                pointer-events: none;
                z-index: 997;
                opacity: 0.9;
            `;
            char.textContent = characters[i % characters.length];
            
            card.appendChild(char);
            
            setTimeout(() => {
                utils.safeRemoveElement(char);
            }, 1000 + i * 80);
        }
    },

    getEffectColor(feature, alpha = 0.3) {
        const color = THEME_COLORS[feature]?.primary || THEME_COLORS.scientist.primary;
        return color.replace('#', '').match(/.{2}/g)
            .map(hex => parseInt(hex, 16))
            .join(', ');
    },

    createParticles(card, feedback, count, feature) {
        if (card._particleAnimating) return;
        card._particleAnimating = true;

        const fragment = document.createDocumentFragment();
        const colors = THEME_COLORS[feature].particles;

        for (let i = 0; i < count; i++) {
            const particle = this.createParticle(feedback, colors[i % colors.length], i);
            fragment.appendChild(particle);

            setTimeout(() => {
                utils.safeRemoveElement(particle);
                if (i === count - 1) {
                    card._particleAnimating = false;
                }
            }, 1200 + i * CONFIG.ANIMATION.PARTICLE_DELAY);
        }

        card.appendChild(fragment);
    },

    createParticle(feedback, color, index) {
        const particle = document.createElement('div');
        const size = feedback.particles.size;
        
        // 随机选择粒子形状
        const shapes = ['circle', 'square', 'diamond'];
        const shape = shapes[index % shapes.length];
        
        let styles = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            pointer-events: none;
            z-index: 1000;
            will-change: transform, opacity;
            animation: ${feedback.animation};
            opacity: 0.9;
            box-shadow: 0 0 8px ${color}40;
        `;

        // 根据形状设置不同的样式
        switch (shape) {
            case 'circle':
                styles += 'border-radius: 50%;';
                break;
            case 'square':
                styles += 'border-radius: 2px;';
                break;
            case 'diamond':
                styles += 'border-radius: 0; transform: rotate(45deg);';
                break;
        }

        // 所有卡片类型都使用爆炸式动画效果
        const x = utils.random(-40, 40);
        const y = utils.random(-40, 40);
        styles += `--x: ${x}px; --y: ${y}px;`;
        particle.style.left = '50%';
        particle.style.top = '50%';

        particle.style.cssText = styles;
        particle.style.animationDelay = index * 0.1 + 's';

        return particle;
    }
};

// 功能卡片处理
const featureCards = {
    prompts: {
        '数据分析': '请帮我进行智能数据分析，我想了解：',
        '代码编写': '请帮我编写智能代码，具体需求是：',
        '图表绘制': '请帮我创作AI艺术作品，我想看到：'
    },

    init() {
        const cards = document.querySelectorAll('.feature-card.scientist-card, .feature-card.geek-card, .feature-card.artist-card');
        
        cards.forEach(card => {
            this.setupCard(card);
        });
    },

    setupCard(card) {
        const feature = card.getAttribute('data-feature');
        const cardId = `${feature}-${Date.now()}`;
        card.dataset.cardId = cardId;

        this.setupAccessibility(card, feature);
        this.setupEventListeners(card, feature, cardId);
    },

    setupAccessibility(card, feature) {
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `选择${feature}功能`);
    },

    setupEventListeners(card, feature, cardId) {
        let isHovering = false;

        const handleMouseEnter = utils.throttle(() => {
            if (isHovering) return;
            isHovering = true;

            utils.cleanupAnimation(cardId);

            const hoverTimeout = setTimeout(() => {
                if (isHovering) {
                    this.playHoverAnimation(card, feature);
                }
            }, CONFIG.ANIMATION.HOVER_DELAY);

            globalState.hoverTimeouts.set(cardId, hoverTimeout);
        }, CONFIG.THROTTLE_DELAY);

        const handleMouseLeave = utils.throttle(() => {
            isHovering = false;
            utils.cleanupAnimation(cardId);
            animationManager.stopAnimation(card);
        }, CONFIG.THROTTLE_DELAY);

        const handleClick = (e) => {
            e.preventDefault();
            this.handleCardClick(card, feature);
        };

        const handleKeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.handleCardClick(card, feature);
            }
        };

        card.addEventListener('mouseenter', handleMouseEnter);
        card.addEventListener('mouseleave', handleMouseLeave);
        card.addEventListener('click', handleClick);
        card.addEventListener('keydown', handleKeydown);

        // 存储事件监听器以便后续清理
        card._eventListeners = {
            mouseenter: handleMouseEnter,
            mouseleave: handleMouseLeave,
            click: handleClick,
            keydown: handleKeydown
        };
    },

    playHoverAnimation(card, feature) {
        if (card._hoverAnimating) return;
        card._hoverAnimating = true;

        const animationFrame = utils.requestAnimationFrame(() => {
            const featureType = this.getFeatureType(feature);
            animationManager.playAnimation(card, featureType);
        });

        globalState.animationFrames.set(card.dataset.cardId, animationFrame);

        setTimeout(() => {
            card._hoverAnimating = false;
        }, CONFIG.ANIMATION.HOVER_DURATION);
    },

    getFeatureType(feature) {
        const featureMap = {
            '数据分析': 'scientist',
            '代码编写': 'geek',
            '图表绘制': 'artist'
        };
        return featureMap[feature] || 'scientist';
    },

    handleCardClick(card, feature) {
        const messageInput = document.querySelector('#messageInput');
        if (!messageInput) return;

        const prompt = this.prompts[feature] || `请帮我处理${feature}相关的问题：`;
        messageInput.value = prompt;
        messageInput.focus();
        messageInput.dispatchEvent(new Event('input'));

        const featureType = this.getFeatureType(feature);
        clickFeedbackManager.createFeedback(card, featureType);

        console.log(`选择了${feature}功能`);
    },

    // 清理资源
    cleanup() {
        const cards = document.querySelectorAll('.feature-card');
        cards.forEach(card => {
            if (card._eventListeners) {
                Object.entries(card._eventListeners).forEach(([event, listener]) => {
                    card.removeEventListener(event, listener);
                });
                delete card._eventListeners;
            }
        });
    }
};

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
    globalState.animationFrames.forEach(frameId => {
        cancelAnimationFrame(frameId);
    });
    globalState.hoverTimeouts.forEach(timeoutId => {
        clearTimeout(timeoutId);
    });
}); 
