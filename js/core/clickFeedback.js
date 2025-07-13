// 点击反馈管理模块

import { ANIMATION_CONFIG, THEME_COLORS } from '../config/index.js';
import { utils } from '../utils/utils.js';
import { globalState } from './state.js';

// 点击反馈管理器
export const clickFeedbackManager = {
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
            card.style.transition = `transform ${ANIMATION_CONFIG.CLICK_DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
        }, globalState);

        setTimeout(() => {
            utils.requestAnimationFrame(() => {
                card.style.transform = '';
                card.style.transition = '';
            }, globalState);
        }, ANIMATION_CONFIG.CLICK_DURATION);
    },

    createSpecialEffects(card, feedback, feature) {
        const effects = feedback.effects || [];
        
        effects.forEach((effect, index) => {
            setTimeout(() => {
                this.createEffect(card, effect, feature);
            }, index * ANIMATION_CONFIG.EFFECT_DELAY);
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
                    animation: energyPulse 1.0s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
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
        const connectionCount = 4;
        const colors = THEME_COLORS[feature].particles;
        
        for (let i = 0; i < connectionCount; i++) {
            setTimeout(() => {
                const connection = document.createElement('div');
                const color = colors[i % colors.length];
                const angle = (i * 90) * (Math.PI / 180);
                const distance = 80;
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;
                
                connection.style.cssText = `
                    position: absolute;
                    width: 2px;
                    height: 20px;
                    background: ${color};
                    left: calc(50% + ${x}px);
                    top: calc(50% + ${y}px);
                    transform: translate(-50%, -50%) rotate(${angle}rad);
                    animation: dataConnection 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    pointer-events: none;
                    z-index: 997;
                    box-shadow: 0 0 4px ${color};
                `;
                
                card.appendChild(connection);
                
                setTimeout(() => {
                    utils.safeRemoveElement(connection);
                }, 800);
            }, i * ANIMATION_CONFIG.PARTICLE_DELAY);
        }
    },

    createCodeCharacters(card, feature) {
        const characters = ['<', '>', '/', '{', '}', ';', '=', '+'];
        const colors = THEME_COLORS[feature].particles;
        
        characters.forEach((char, i) => {
            setTimeout(() => {
                const element = document.createElement('div');
                const color = colors[i % colors.length];
                const x = utils.random(-50, 50);
                const y = utils.random(-50, 50);
                
                element.style.cssText = `
                    position: absolute;
                    font-family: monospace;
                    font-size: 12px;
                    color: ${color};
                    left: calc(50% + ${x}px);
                    top: calc(50% + ${y}px);
                    transform: translate(-50%, -50%);
                    animation: codeCharacter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    pointer-events: none;
                    z-index: 998;
                    text-shadow: 0 0 4px ${color};
                `;
                element.textContent = char;
                
                card.appendChild(element);
                
                setTimeout(() => {
                    utils.safeRemoveElement(element);
                }, 600);
            }, i * ANIMATION_CONFIG.PARTICLE_DELAY);
        });
    },

    getEffectColor(feature, alpha = 0.3) {
        const colors = THEME_COLORS[feature];
        if (!colors) return `rgba(79, 172, 254, ${alpha})`;
        
        const primaryColor = colors.primary;
        const hex = primaryColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },

    createParticles(card, feedback, count, feature) {
        const colors = THEME_COLORS[feature].particles;
        
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const particle = this.createParticle(feedback, colors[i % colors.length], i);
                card.appendChild(particle);
                
                setTimeout(() => {
                    utils.safeRemoveElement(particle);
                }, 1200 + i * ANIMATION_CONFIG.PARTICLE_DELAY);
            }, i * ANIMATION_CONFIG.PARTICLE_DELAY);
        }
    },

    createParticle(feedback, color, index) {
        const particle = document.createElement('div');
        const size = feedback.particles.size;
        const angle = (index * 45) * (Math.PI / 180);
        const distance = 60;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            border-radius: 50%;
            left: calc(50% + ${x}px);
            top: calc(50% + ${y}px);
            transform: translate(-50%, -50%);
            animation: ${feedback.animation};
            pointer-events: none;
            z-index: 999;
            box-shadow: 0 0 8px ${color};
        `;
        
        return particle;
    }
}; 