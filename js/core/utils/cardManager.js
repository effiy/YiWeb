// 功能卡片处理模块

import { utils } from '../../shared/utils/utils.js';
import { ANIMATION_CONFIG, BASE_CONFIG } from '../../config/index.js';
import { globalState } from '../state/state.js';
import { animationManager } from './animations.js';
import { clickFeedbackManager } from './clickFeedback.js';

// 功能卡片处理
export const featureCards = {
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

            utils.cleanupAnimation(cardId, globalState);

            const hoverTimeout = setTimeout(() => {
                if (isHovering) {
                    this.playHoverAnimation(card, feature);
                }
            }, ANIMATION_CONFIG.HOVER_DELAY);

            globalState.hoverTimeouts.set(cardId, hoverTimeout);
        }, BASE_CONFIG.THROTTLE_DELAY);

        const handleMouseLeave = utils.throttle(() => {
            isHovering = false;
            utils.cleanupAnimation(cardId, globalState);
            animationManager.stopAnimation(card);
        }, BASE_CONFIG.THROTTLE_DELAY);

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
        }, globalState);

        globalState.animationFrames.set(card.dataset.cardId, animationFrame);

        setTimeout(() => {
            card._hoverAnimating = false;
        }, ANIMATION_CONFIG.HOVER_DURATION);
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
