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

// 功能卡片处理
const featureCards = {
    init() {
        const cards = document.querySelectorAll('.feature-card.detective-card, .feature-card.scientist-card, .feature-card.geek-card, .feature-card.artist-card, .feature-card.writer-card, .feature-card.diplomat-card');
        
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleCardClick(card);
            });
            
            // 添加键盘支持
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleCardClick(card);
                }
            });
            
            // 设置可访问性
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', `选择${card.getAttribute('data-feature')}功能`);
        });
    },
    
    handleCardClick(card) {
        const feature = card.getAttribute('data-feature');
        const messageInput = document.querySelector('#messageInput');
        
        if (messageInput) {
            // 根据功能类型设置不同的提示文本
            const prompts = {
                '问答': '请帮我回答一个问题：',
                '数据分析': '请帮我分析以下数据：',
                '代码编写': '请帮我编写代码，需求是：',
                '图表绘制': '请帮我绘制一个图表，数据是：',
                '内容创作': '请帮我创作内容，主题是：',
                '文本翻译': '请帮我翻译以下文本：'
            };
            
            const prompt = prompts[feature] || `请帮我处理${feature}相关的问题：`;
            
            // 填充输入框
            messageInput.value = prompt;
            messageInput.focus();
            
            // 触发输入事件以调整高度
            messageInput.dispatchEvent(new Event('input'));
            
            // 添加点击反馈效果
            this.addClickFeedback(card);
            
            console.log(`选择了${feature}功能`);
        }
    },
    
    addClickFeedback(card) {
        // 添加点击动画效果
        card.style.transform = 'scale(0.95)';
        card.style.transition = 'transform 0.1s ease';
        
        setTimeout(() => {
            card.style.transform = '';
            card.style.transition = '';
        }, 100);
    }
};

// 页面初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化键盘快捷键
    keyboardShortcuts.init();
    
    // 初始化输入框处理
    inputHandler.init();
    
    // 初始化功能卡片
    featureCards.init();
    
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
