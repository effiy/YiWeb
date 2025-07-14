// 状态管理模块

// 全局状态管理
export const globalState = {
    isTyping: false,
    messageIdCounter: 0,
    lastMessageTime: 0,
    typingTimeout: null,
    animationFrames: new Map(), // 存储动画帧ID
    hoverTimeouts: new Map(),    // 存储悬停超时ID
    isAnimating: false          // 防止动画冲突
}; 
