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
        // 更新选择器，只包含当前存在的卡片
        const cards = document.querySelectorAll('.feature-card.scientist-card, .feature-card.geek-card, .feature-card.artist-card');
        
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
            
            // 添加鼠标悬停效果
            this.addHoverEffects(card);
        });
    },
    
    addHoverEffects(card) {
        const feature = card.getAttribute('data-feature');
        
        card.addEventListener('mouseenter', () => {
            this.playHoverAnimation(card, feature);
        });
        
        card.addEventListener('mouseleave', () => {
            this.stopHoverAnimation(card, feature);
        });
    },
    
    playHoverAnimation(card, feature) {
        // 防止动画叠加
        if (card._hoverAnimating) return;
        card._hoverAnimating = true;
        
        // 根据功能类型播放不同的悬停动画
        switch(feature) {
            case '数据分析':
                this.playScientistHover(card);
                break;
            case '代码编写':
                this.playGeekHover(card);
                break;
            case '图表绘制':
                this.playArtistHover(card);
                break;
        }
        
        // 动画结束后重置状态
        setTimeout(() => {
            card._hoverAnimating = false;
        }, 2000);
    },
    
    stopHoverAnimation(card, feature) {
        // 停止悬停动画
        const icon = card.querySelector('.card-icon');
        const badge = card.querySelector('.card-badge');
        
        if (icon) {
            icon.style.animation = '';
        }
        if (badge) {
            badge.style.animation = '';
        }
        
        card._hoverAnimating = false;
    },
    
    playScientistHover(card) {
        // 科学家风格：数据扫描效果
        const icon = card.querySelector('.card-icon');
        const badge = card.querySelector('.card-badge');
        
        if (icon) {
            icon.style.animation = 'scientistScanHover 2s ease-in-out infinite';
        }
        if (badge) {
            badge.style.animation = 'badgePulse 1s ease-in-out infinite';
        }
    },
    
    playGeekHover(card) {
        // 极客风格：代码闪烁效果
        const icon = card.querySelector('.card-icon');
        const badge = card.querySelector('.card-badge');
        
        if (icon) {
            icon.style.animation = 'codeGlowHover 1.5s ease-in-out infinite alternate';
        }
        if (badge) {
            badge.style.animation = 'terminalBlink 1s ease-in-out infinite';
        }
    },
    
    playArtistHover(card) {
        // 艺术家风格：创意脉冲效果
        const icon = card.querySelector('.card-icon');
        const badge = card.querySelector('.card-badge');
        
        if (icon) {
            icon.style.animation = 'artistPulseHover 2s ease-in-out infinite';
        }
        if (badge) {
            badge.style.animation = 'creativeSparkle 1.5s ease-in-out infinite';
        }
    },
    
    handleCardClick(card) {
        const feature = card.getAttribute('data-feature');
        const messageInput = document.querySelector('#messageInput');
        
        if (messageInput) {
            // 根据功能类型设置不同的提示文本，更新为当前存在的功能
            const prompts = {
                '数据分析': '请帮我进行智能数据分析，我想了解：',
                '代码编写': '请帮我编写智能代码，具体需求是：',
                '图表绘制': '请帮我创作AI艺术作品，我想看到：' // 更新为AI艺术创作的提示
            };
            
            const prompt = prompts[feature] || `请帮我处理${feature}相关的问题：`;
            
            // 填充输入框
            messageInput.value = prompt;
            messageInput.focus();
            
            // 触发输入事件以调整高度
            messageInput.dispatchEvent(new Event('input'));
            
            // 添加点击反馈效果
            this.addClickFeedback(card, feature);
            
            console.log(`选择了${feature}功能`);
        }
    },
    
    addClickFeedback(card, feature) {
        // 根据功能类型添加不同的点击反馈
        switch(feature) {
            case '数据分析':
                this.addScientistClickFeedback(card);
                break;
            case '代码编写':
                this.addGeekClickFeedback(card);
                break;
            case '图表绘制':
                this.addArtistClickFeedback(card);
                break;
        }
    },
    
    addScientistClickFeedback(card) {
        // 科学家风格：数据收集效果
        card.style.transform = 'scale(0.95)';
        card.style.transition = 'transform 0.1s ease';
        
        // 添加数据点动画
        this.createDataPoints(card);
        
        setTimeout(() => {
            card.style.transform = '';
            card.style.transition = '';
        }, 150);
    },
    
    addGeekClickFeedback(card) {
        // 极客风格：代码编译效果
        card.style.transform = 'scale(0.95)';
        card.style.transition = 'transform 0.1s ease';
        
        // 添加代码行动画
        this.createCodeLines(card);
        
        setTimeout(() => {
            card.style.transform = '';
            card.style.transition = '';
        }, 150);
    },
    
    addArtistClickFeedback(card) {
        // 艺术家风格：创意爆发效果
        card.style.transform = 'scale(0.95)';
        card.style.transition = 'transform 0.1s ease';
        
        // 添加色彩粒子动画
        this.createColorParticles(card);
        
        setTimeout(() => {
            card.style.transform = '';
            card.style.transition = '';
        }, 150);
    },
    
    createDataPoints(card) {
        // 创建数据点动画效果，防止叠加
        if (card._dataPointAnimating) return;
        card._dataPointAnimating = true;
        const isMobile = window.innerWidth < 600;
        const count = isMobile ? 3 : 7;
        for (let i = 0; i < count; i++) {
            const point = document.createElement('div');
            point.style.cssText = `
                position: absolute;
                width: 5px;
                height: 5px;
                background: #3b82f6;
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                will-change: transform, opacity;
                animation: dataPointFloat 0.7s cubic-bezier(0.4,0,0.2,1) forwards;
                opacity: 0.85;
            `;
            // 让点从中心向四周浮动
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const radius = 30 + Math.random() * 20;
            point.style.left = `calc(50% + ${Math.cos(angle) * radius}px)`;
            point.style.top = `calc(50% + ${Math.sin(angle) * radius}px)`;
            point.style.animationDelay = i * 0.05 + 's';
            card.appendChild(point);
            // 销毁动画元素
            setTimeout(() => {
                if (point.parentNode) point.parentNode.removeChild(point);
                if (i === count - 1) card._dataPointAnimating = false;
            }, 700 + i * 50);
        }
    },
    
    createCodeLines(card) {
        // 创建代码行动画效果，防止叠加
        if (card._codeLineAnimating) return;
        card._codeLineAnimating = true;
        const isMobile = window.innerWidth < 600;
        const count = isMobile ? 2 : 4;
        for (let i = 0; i < count; i++) {
            const line = document.createElement('div');
            line.style.cssText = `
                position: absolute;
                height: 2px;
                background: linear-gradient(90deg, #22c55e, transparent);
                pointer-events: none;
                z-index: 1000;
                will-change: transform, opacity;
                animation: codeLineScan 0.6s cubic-bezier(0.4,0,0.2,1) forwards;
                opacity: 0.8;
            `;
            line.style.left = '0%';
            line.style.top = (25 + i * 20) + '%';
            line.style.width = '100%';
            line.style.animationDelay = i * 0.08 + 's';
            card.appendChild(line);
            setTimeout(() => {
                if (line.parentNode) line.parentNode.removeChild(line);
                if (i === count - 1) card._codeLineAnimating = false;
            }, 600 + i * 80);
        }
    },
    
    createColorParticles(card) {
        // 创建色彩粒子动画效果，防止叠加
        if (card._colorParticleAnimating) return;
        card._colorParticleAnimating = true;
        const colors = ['#ff0000', '#ffa500', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#ee82ee'];
        const isMobile = window.innerWidth < 600;
        const count = isMobile ? 5 : 10;
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: absolute;
                width: 7px;
                height: 7px;
                background: ${colors[i % colors.length]};
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                will-change: transform, opacity;
                animation: colorParticleExplode 0.9s cubic-bezier(0.4,0,0.2,1) forwards;
                opacity: 0.85;
            `;
            // 粒子随机方向爆炸
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const dist = 30 + Math.random() * 25;
            particle.style.setProperty('--x', `${Math.cos(angle) * dist}px`);
            particle.style.setProperty('--y', `${Math.sin(angle) * dist}px`);
            particle.style.left = '50%';
            particle.style.top = '50%';
            particle.style.animationDelay = i * 0.04 + 's';
            card.appendChild(particle);
            setTimeout(() => {
                if (particle.parentNode) particle.parentNode.removeChild(particle);
                if (i === count - 1) card._colorParticleAnimating = false;
            }, 900 + i * 40);
        }
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
