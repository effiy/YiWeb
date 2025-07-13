import { globalState } from './state.js';
import { CONFIG, THEME_COLORS } from '../index.js';
import { utils } from '../utils/utils.js';

// 动画管理模块

// 动画管理器
export const animationManager = {
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