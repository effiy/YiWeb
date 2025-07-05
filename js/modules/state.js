// 全局状态管理模块
export const globalState = {
    isTyping: false,
    messageIdCounter: 0,
    lastMessageTime: 0,
    typingTimeout: null,
    animationFrames: new Map(),
    hoverTimeouts: new Map(),
    isAnimating: false
};

// 常量配置
export const CONFIG = {
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
export const THEME_COLORS = {
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