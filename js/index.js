// 主要JavaScript文件 - 欢迎页面功能

// 全局状态管理
const globalState = {
    isTyping: false,
    messageIdCounter: 0,
    lastMessageTime: 0,
    typingTimeout: null
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

    // 自动调整文本框高度
    autoResizeTextarea(textarea) {
        const resize = () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        };
        
        textarea.addEventListener('input', resize);
        textarea.addEventListener('focus', resize);
        
        // 初始化
        resize();
    },

    // 检测键盘弹出
    detectKeyboardOpen() {
        if ('ontouchstart' in window) {
            const initialViewport = window.innerHeight;
            
            window.addEventListener('resize', utils.debounce(() => {
                const currentViewport = window.innerHeight;
                const inputSection = document.querySelector('.input-section');
                
                if (inputSection) {
                    if (currentViewport < initialViewport * 0.8) {
                        inputSection.classList.add('keyboard-open');
                    } else {
                        inputSection.classList.remove('keyboard-open');
                    }
                }
            }, 100));
        }
    }
};

// 键盘快捷键管理
const keyboardShortcuts = {
    init() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+K 聚焦到输入框
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const input = document.querySelector('#messageInput');
                if (input) {
                    input.focus();
                }
            }
        });
    }
};

// 输入框处理
const inputHandler = {
    init() {
        const messageInput = document.querySelector('#messageInput');
        if (messageInput) {
            // 自动调整高度
            utils.autoResizeTextarea(messageInput);
            
            // 键盘事件处理
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSend();
                }
            });
            
            // 输入事件处理
            messageInput.addEventListener('input', utils.debounce(() => {
                // 可以在这里添加输入验证或其他处理
            }, 300));
        }
    },
    
    handleSend() {
        const messageInput = document.querySelector('#messageInput');
        if (messageInput && messageInput.value.trim()) {
            const message = messageInput.value.trim();
            console.log('发送消息:', message);
            
            // 这里可以添加发送消息的逻辑
            // 例如跳转到聊天页面或调用API
            
            // 清空输入框
            messageInput.value = '';
            messageInput.style.height = 'auto';
        }
    }
};

// 页面初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化键盘快捷键
    keyboardShortcuts.init();
    
    // 初始化输入框处理
    inputHandler.init();
    
    // 检测键盘弹出
    utils.detectKeyboardOpen();
    
    // 自动聚焦到输入框
    const messageInput = document.querySelector('#messageInput');
    if (messageInput) {
        setTimeout(() => {
            messageInput.focus();
        }, 100);
    }
}); 
