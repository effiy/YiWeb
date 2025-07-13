// 点击反馈管理模块

import { CONFIG, THEME_COLORS } from '../index.js';
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
            card.style.transition = `transform ${CONFIG.ANIMATION.CLICK_DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
        }, globalState);

        setTimeout(() => {
            utils.requestAnimationFrame(() => {
                card.style.transform = '';
                card.style.transition = '';
            }, globalState);
        }, CONFIG.ANIMATION.CLICK_DURATION);
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
        const rgb = color.replace('#', '').match(/.{2}/g)
            .map(hex => parseInt(hex, 16))
            .join(', ');
        return `rgba(${rgb}, ${alpha})`;
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