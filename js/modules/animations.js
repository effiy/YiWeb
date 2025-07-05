import { globalState, CONFIG, THEME_COLORS } from './state.js';
import { utils } from './utils.js';

// 动画效果管理模块
export class AnimationManager {
    constructor() {
        this.isAnimating = false;
    }

    playAnimation(card, feature) {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        globalState.isAnimating = true;
        
        const cardId = card.dataset.feature;
        this.cleanupAnimation(cardId);
        
        const feedback = this.createFeedback(card, feature);
        this.createSpecialEffects(card, feedback, feature);
        
        setTimeout(() => {
            this.isAnimating = false;
            globalState.isAnimating = false;
        }, CONFIG.ANIMATION.HOVER_DURATION);
    }

    stopAnimation(card) {
        const cardId = card.dataset.feature;
        utils.cleanupAnimation(cardId);
        
        // 移除所有动画元素
        const animatedElements = card.querySelectorAll('.animated-element');
        animatedElements.forEach(element => {
            utils.safeRemoveElement(element);
        });
        
        // 重置卡片状态
        card.style.transform = '';
        card.style.boxShadow = '';
        
        this.isAnimating = false;
        globalState.isAnimating = false;
    }

    createFeedback(card, feature) {
        const feedback = document.createElement('div');
        feedback.className = 'animated-element feedback-effect';
        feedback.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: inherit;
            pointer-events: none;
            z-index: 10;
            background: ${this.getEffectColor(feature, 0.1)};
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        card.appendChild(feedback);
        
        // 触发动画
        setTimeout(() => {
            feedback.style.opacity = '1';
        }, 10);
        
        return feedback;
    }

    createCardScaleEffect(card) {
        card.style.transform = 'scale(1.02)';
        card.style.boxShadow = `0 8px 32px ${this.getEffectColor(card.dataset.feature, 0.3)}`;
        
        setTimeout(() => {
            card.style.transform = '';
            card.style.boxShadow = '';
        }, CONFIG.ANIMATION.CLICK_DURATION);
    }

    createSpecialEffects(card, feedback, feature) {
        const featureType = this.getFeatureType(feature);
        
        switch (featureType) {
            case 'scientist':
                this.createDataConnections(card, feature);
                break;
            case 'geek':
                this.createCodeCharacters(card, feature);
                break;
            case 'artist':
                this.createRandomSparkles(card, feature);
                break;
        }
        
        // 创建粒子效果
        this.createParticles(card, feedback, 15, feature);
    }

    createRandomSparkles(card, feature) {
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                sparkle.className = 'animated-element sparkle';
                sparkle.innerHTML = '✨';
                sparkle.style.cssText = `
                    position: absolute;
                    left: ${utils.random(10, 90)}%;
                    top: ${utils.random(10, 90)}%;
                    font-size: ${utils.random(16, 24)}px;
                    color: ${this.getEffectColor(feature)};
                    animation: sparkleFloat 2s ease-out forwards;
                    pointer-events: none;
                    z-index: 20;
                `;
                
                card.appendChild(sparkle);
                
                setTimeout(() => {
                    utils.safeRemoveElement(sparkle);
                }, 2000);
            }, i * CONFIG.ANIMATION.PARTICLE_DELAY);
        }
    }

    createSoundWaves(card, feature) {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const wave = document.createElement('div');
                wave.className = 'animated-element sound-wave';
                wave.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 0;
                    height: 0;
                    border: 2px solid ${this.getEffectColor(feature, 0.6)};
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    animation: soundWaveExpand 1.5s ease-out forwards;
                    pointer-events: none;
                    z-index: 15;
                `;
                
                card.appendChild(wave);
                
                setTimeout(() => {
                    utils.safeRemoveElement(wave);
                }, 1500);
            }, i * 200);
        }
    }

    createEffect(card, effectType, feature) {
        const effect = document.createElement('div');
        effect.className = `animated-element ${effectType}-effect`;
        
        const baseStyles = `
            position: absolute;
            pointer-events: none;
            z-index: 15;
        `;
        
        switch (effectType) {
            case 'ripple':
                effect.style.cssText = `
                    ${baseStyles}
                    top: 50%;
                    left: 50%;
                    width: 0;
                    height: 0;
                    border: 2px solid ${this.getEffectColor(feature, 0.8)};
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    animation: rippleExpand 0.8s ease-out forwards;
                `;
                break;
            case 'glow':
                effect.style.cssText = `
                    ${baseStyles}
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    border-radius: inherit;
                    background: ${this.getEffectColor(feature, 0.2)};
                    animation: glowPulse 1s ease-in-out;
                `;
                break;
        }
        
        card.appendChild(effect);
        
        setTimeout(() => {
            utils.safeRemoveElement(effect);
        }, 1000);
    }

    createDataConnections(card, feature) {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const connection = document.createElement('div');
                connection.className = 'animated-element data-connection';
                connection.style.cssText = `
                    position: absolute;
                    width: 2px;
                    height: ${utils.random(20, 40)}px;
                    background: linear-gradient(to bottom, ${this.getEffectColor(feature)}, transparent);
                    left: ${utils.random(10, 90)}%;
                    top: ${utils.random(10, 90)}%;
                    animation: dataFlow 1.5s ease-out forwards;
                    pointer-events: none;
                    z-index: 15;
                `;
                
                card.appendChild(connection);
                
                setTimeout(() => {
                    utils.safeRemoveElement(connection);
                }, 1500);
            }, i * CONFIG.ANIMATION.EFFECT_DELAY);
        }
    }

    createCodeCharacters(card, feature) {
        const characters = ['<', '>', '/', '{', '}', '(', ')', ';', '=', '+', '-', '*'];
        
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                const char = document.createElement('div');
                char.className = 'animated-element code-char';
                char.textContent = characters[utils.randomInt(0, characters.length - 1)];
                char.style.cssText = `
                    position: absolute;
                    left: ${utils.random(10, 90)}%;
                    top: ${utils.random(10, 90)}%;
                    font-family: 'Courier New', monospace;
                    font-size: ${utils.random(14, 20)}px;
                    color: ${this.getEffectColor(feature)};
                    animation: codeFloat 2s ease-out forwards;
                    pointer-events: none;
                    z-index: 15;
                `;
                
                card.appendChild(char);
                
                setTimeout(() => {
                    utils.safeRemoveElement(char);
                }, 2000);
            }, i * CONFIG.ANIMATION.EFFECT_DELAY);
        }
    }

    getEffectColor(feature, alpha = 0.3) {
        const featureType = this.getFeatureType(feature);
        const colors = THEME_COLORS[featureType];
        return colors ? colors.primary : THEME_COLORS.scientist.primary;
    }

    createParticles(card, feedback, count, feature) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const particle = this.createParticle(feedback, this.getEffectColor(feature), i);
                card.appendChild(particle);
                
                setTimeout(() => {
                    utils.safeRemoveElement(particle);
                }, 2000);
            }, i * CONFIG.ANIMATION.PARTICLE_DELAY);
        }
    }

    createParticle(feedback, color, index) {
        const particle = document.createElement('div');
        particle.className = 'animated-element particle';
        particle.style.cssText = `
            position: absolute;
            width: ${utils.random(4, 8)}px;
            height: ${utils.random(4, 8)}px;
            background: ${color};
            border-radius: 50%;
            left: ${utils.random(20, 80)}%;
            top: ${utils.random(20, 80)}%;
            animation: particleFloat 2s ease-out forwards;
            pointer-events: none;
            z-index: 25;
        `;
        
        return particle;
    }

    getFeatureType(feature) {
        const featureMap = {
            '数据分析': 'scientist',
            '代码编写': 'geek',
            '图表绘制': 'artist'
        };
        return featureMap[feature] || 'scientist';
    }
} 