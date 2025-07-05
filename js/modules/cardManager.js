import { globalState, CONFIG } from './state.js';
import { utils } from './utils.js';
import { AnimationManager } from './animations.js';

// 卡片管理模块
export class CardManager {
    constructor() {
        this.animationManager = new AnimationManager();
        this.cards = new Map();
    }

    init() {
        this.setupCards();
        this.setupAccessibility();
    }

    setupCards() {
        const cards = document.querySelectorAll('.feature-card');
        cards.forEach(card => {
            const feature = card.dataset.feature;
            const cardId = `card-${feature}`;
            
            this.cards.set(cardId, card);
            this.setupCard(card, feature, cardId);
        });
    }

    setupCard(card, feature, cardId) {
        card.style.position = 'relative';
        card.style.overflow = 'hidden';
        
        this.setupEventListeners(card, feature, cardId);
    }

    setupAccessibility(card, feature) {
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `点击使用${feature}功能`);
        card.setAttribute('aria-describedby', `${feature}-description`);
    }

    setupEventListeners(card, feature, cardId) {
        let hoverTimeout;
        let isHovering = false;

        const handleClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            this.animationManager.createCardScaleEffect(card);
            this.handleCardClick(card, feature);
        };

        const handleKeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(e);
            }
        };

        const handleMouseEnter = () => {
            if (isHovering) return;
            isHovering = true;
            
            hoverTimeout = setTimeout(() => {
                this.playHoverAnimation(card, feature);
            }, CONFIG.ANIMATION.HOVER_DELAY);
            
            globalState.hoverTimeouts.set(cardId, hoverTimeout);
        };

        const handleMouseLeave = () => {
            isHovering = false;
            
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                globalState.hoverTimeouts.delete(cardId);
            }
            
            this.animationManager.stopAnimation(card);
        };

        // 事件监听器
        card.addEventListener('click', handleClick);
        card.addEventListener('keydown', handleKeydown);
        card.addEventListener('mouseenter', handleMouseEnter);
        card.addEventListener('mouseleave', handleMouseLeave);
        
        // 触摸设备支持
        card.addEventListener('touchstart', handleMouseEnter, { passive: true });
        card.addEventListener('touchend', handleMouseLeave, { passive: true });
    }

    playHoverAnimation(card, feature) {
        if (globalState.isAnimating) return;
        
        this.animationManager.playAnimation(card, feature);
    }

    getFeatureType(feature) {
        const featureMap = {
            '数据分析': 'scientist',
            '代码编写': 'geek',
            '图表绘制': 'artist'
        };
        return featureMap[feature] || 'scientist';
    }

    handleCardClick(card, feature) {
        const currentTime = Date.now();
        
        // 防止重复点击
        if (currentTime - globalState.lastMessageTime < 500) {
            return;
        }
        
        globalState.lastMessageTime = currentTime;
        
        // 根据功能类型执行不同操作
        switch (feature) {
            case '数据分析':
                this.handleDataAnalysis();
                break;
            case '代码编写':
                this.handleCodeWriting();
                break;
            case '图表绘制':
                this.handleChartCreation();
                break;
            default:
                this.handleDefaultAction(feature);
        }
    }

    handleDataAnalysis() {
        const input = document.querySelector('#messageInput');
        if (input) {
            input.value = '请帮我分析以下数据：';
            input.focus();
            utils.autoResizeTextarea(input);
        }
        console.log('数据分析功能已激活');
    }

    handleCodeWriting() {
        const input = document.querySelector('#messageInput');
        if (input) {
            input.value = '请帮我编写以下代码：';
            input.focus();
            utils.autoResizeTextarea(input);
        }
        console.log('代码编写功能已激活');
    }

    handleChartCreation() {
        const input = document.querySelector('#messageInput');
        if (input) {
            input.value = '请帮我创建以下图表：';
            input.focus();
            utils.autoResizeTextarea(input);
        }
        console.log('图表绘制功能已激活');
    }

    handleDefaultAction(feature) {
        const input = document.querySelector('#messageInput');
        if (input) {
            input.value = `请帮我使用${feature}功能：`;
            input.focus();
            utils.autoResizeTextarea(input);
        }
        console.log(`${feature}功能已激活`);
    }

    cleanup() {
        this.cards.forEach((card, cardId) => {
            utils.cleanupAnimation(cardId);
        });
        this.cards.clear();
    }
} 