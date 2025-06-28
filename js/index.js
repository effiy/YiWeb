// 主要JavaScript文件 - 欢迎页面功能

// 全局状态管理
const globalState = {
    isTyping: false,
    messageIdCounter: 0,
    lastMessageTime: 0,
    typingTimeout: null,
    animationFrames: new Map(), // 存储动画帧ID
    hoverTimeouts: new Map()    // 存储悬停超时ID
};

// 常量配置
const CONFIG = {
    ANIMATION: {
        HOVER_DELAY: 100,
        CLICK_DURATION: 150,
        HOVER_DURATION: 2000,
        TRANSITION_DURATION: 400
    },
    MOBILE_BREAKPOINT: 600,
    MAX_TEXTAREA_HEIGHT: 120,
    DEBOUNCE_DELAY: 300
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

    // 检查是否为移动设备
    isMobile() {
        return window.innerWidth < CONFIG.MOBILE_BREAKPOINT;
    }
};

// 键盘快捷键管理
const keyboardShortcuts = {
    shortcuts: new Map([
        ['k', { ctrl: true, action: 'clearInput' }],
        ['l', { ctrl: true, action: 'focusInput' }]
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
            particles: { count: 5, color: '#3b82f6', size: 5 },
            animation: 'dataPointFloat 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
        },
        geek: {
            particles: { count: 3, color: '#22c55e', size: 3 },
            animation: 'codeLineScan 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
        },
        artist: {
            particles: { count: 4, colors: ['#ec4899', '#a855f7', '#f59e0b', '#10b981'], size: 7 },
            animation: 'colorParticleExplode 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
        }
    },

    createFeedback(card, feature) {
        const feedback = this.feedbacks[feature];
        if (!feedback) return;

        const isMobile = utils.isMobile();
        const count = isMobile ? Math.floor(feedback.particles.count / 2) : feedback.particles.count;

        requestAnimationFrame(() => {
            card.style.transform = 'scale(0.96)';
            card.style.transition = `transform ${CONFIG.CLICK_DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
        });

        this.createParticles(card, feedback, count);

        setTimeout(() => {
            requestAnimationFrame(() => {
                card.style.transform = '';
                card.style.transition = '';
            });
        }, CONFIG.CLICK_DURATION);
    },

    createParticles(card, feedback, count) {
        if (card._particleAnimating) return;
        card._particleAnimating = true;

        const fragment = document.createDocumentFragment();
        const colors = Array.isArray(feedback.particles.colors) 
            ? feedback.particles.colors 
            : [feedback.particles.colors];

        for (let i = 0; i < count; i++) {
            const particle = this.createParticle(feedback, colors[i % colors.length], i);
            fragment.appendChild(particle);

            setTimeout(() => {
                utils.safeRemoveElement(particle);
                if (i === count - 1) {
                    card._particleAnimating = false;
                }
            }, 800 + i * 60);
        }

        card.appendChild(fragment);
    },

    createParticle(feedback, color, index) {
        const particle = document.createElement('div');
        const size = feedback.particles.size;
        
        let styles = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            border-radius: 50%;
            pointer-events: none;
            z-index: 1000;
            will-change: transform, opacity;
            animation: ${feedback.animation};
            opacity: 0.9;
        `;

        if (feedback.particles.colors) {
            // 艺术家风格的粒子爆炸效果
            const x = (Math.random() - 0.5) * 50;
            const y = (Math.random() - 0.5) * 50;
            styles += `--x: ${x}px; --y: ${y}px;`;
            particle.style.left = '50%';
            particle.style.top = '50%';
        } else {
            // 科学家和极客风格的线性效果
            const angle = (Math.PI * 2 / 5) * index + Math.random() * 0.4;
            const radius = 30 + Math.random() * 20;
            particle.style.left = `calc(50% + ${Math.cos(angle) * radius}px)`;
            particle.style.top = `calc(50% + ${Math.sin(angle) * radius}px)`;
        }

        particle.style.cssText = styles;
        particle.style.animationDelay = index * 0.06 + 's';

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

        card.addEventListener('mouseenter', () => {
            if (isHovering) return;
            isHovering = true;

            utils.cleanupAnimation(cardId);

            const hoverTimeout = setTimeout(() => {
                if (isHovering) {
                    this.playHoverAnimation(card, feature);
                }
            }, CONFIG.ANIMATION.HOVER_DELAY);

            globalState.hoverTimeouts.set(cardId, hoverTimeout);
        });

        card.addEventListener('mouseleave', () => {
            isHovering = false;
            utils.cleanupAnimation(cardId);
            animationManager.stopAnimation(card);
        });

        card.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleCardClick(card, feature);
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.handleCardClick(card, feature);
            }
        });
    },

    playHoverAnimation(card, feature) {
        if (card._hoverAnimating) return;
        card._hoverAnimating = true;

        const animationFrame = requestAnimationFrame(() => {
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
    }
};

// 页面初始化
document.addEventListener('DOMContentLoaded', () => {
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
}); 
