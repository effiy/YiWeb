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
            // Ctrl+K 清空输入框内容
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const input = document.querySelector('#messageInput');
                if (input) {
                    input.value = '';
                    input.style.height = 'auto';
                    input.focus();
                    console.log('已清空输入框内容');
                }
            }
            
            // Ctrl+L 聚焦到输入框
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
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
                // Enter 发送消息（不按Shift）
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSend();
                }
                // Shift+Enter 换行（不阻止默认行为）
                // 不需要额外处理，让浏览器默认行为处理换行
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
            
            // 添加优化的鼠标悬停效果
            this.addOptimizedHoverEffects(card);
        });
    },
    
    addOptimizedHoverEffects(card) {
        const feature = card.getAttribute('data-feature');
        let hoverTimeout;
        let isHovering = false;
        
        card.addEventListener('mouseenter', () => {
            if (isHovering) return; // 防止重复触发
            isHovering = true;
            
            // 清除之前的超时
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
            }
            
            // 延迟启动动画，避免快速移动鼠标时的频繁触发
            hoverTimeout = setTimeout(() => {
                if (isHovering) {
                    this.playOptimizedHoverAnimation(card, feature);
                }
            }, 50);
        });
        
        card.addEventListener('mouseleave', () => {
            isHovering = false;
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
            }
            this.stopOptimizedHoverAnimation(card, feature);
        });
    },
    
    playOptimizedHoverAnimation(card, feature) {
        // 防止动画叠加
        if (card._hoverAnimating) return;
        card._hoverAnimating = true;
        
        // 使用requestAnimationFrame确保动画流畅
        requestAnimationFrame(() => {
            // 根据功能类型播放不同的悬停动画
            switch(feature) {
                case '数据分析':
                    this.playOptimizedScientistHover(card);
                    break;
                case '代码编写':
                    this.playOptimizedGeekHover(card);
                    break;
                case '图表绘制':
                    this.playOptimizedArtistHover(card);
                    break;
            }
        });
        
        // 动画结束后重置状态
        setTimeout(() => {
            card._hoverAnimating = false;
        }, 1500); // 减少动画持续时间
    },
    
    stopOptimizedHoverAnimation(card, feature) {
        // 停止悬停动画
        const icon = card.querySelector('.card-icon');
        const badge = card.querySelector('.card-badge');
        
        if (icon) {
            icon.style.animation = 'none';
            // 强制重绘
            icon.offsetHeight;
            icon.style.animation = '';
        }
        if (badge) {
            badge.style.animation = 'none';
            badge.offsetHeight;
            badge.style.animation = '';
        }
        
        card._hoverAnimating = false;
    },
    
    playOptimizedScientistHover(card) {
        // 科学家风格：简化的数据扫描效果
        const icon = card.querySelector('.card-icon');
        const badge = card.querySelector('.card-badge');
        
        if (icon) {
            icon.style.animation = 'scientistScanHover 1.5s ease-in-out infinite';
        }
        if (badge) {
            badge.style.animation = 'badgePulse 1s ease-in-out infinite';
        }
    },
    
    playOptimizedGeekHover(card) {
        // 极客风格：简化的代码闪烁效果
        const icon = card.querySelector('.card-icon');
        const badge = card.querySelector('.card-badge');
        
        if (icon) {
            icon.style.animation = 'codeGlowHover 1.5s ease-in-out infinite';
        }
        if (badge) {
            badge.style.animation = 'terminalBlink 1s ease-in-out infinite';
        }
    },
    
    playOptimizedArtistHover(card) {
        // 艺术家风格：简化的创意脉冲效果
        const icon = card.querySelector('.card-icon');
        const badge = card.querySelector('.card-badge');
        
        if (icon) {
            icon.style.animation = 'artistPulseHover 1.5s ease-in-out infinite';
        }
        if (badge) {
            badge.style.animation = 'creativeSparkle 1s ease-in-out infinite';
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
            
            // 添加优化的点击反馈效果
            this.addOptimizedClickFeedback(card, feature);
            
            console.log(`选择了${feature}功能`);
        }
    },
    
    addOptimizedClickFeedback(card, feature) {
        // 根据功能类型添加不同的点击反馈
        switch(feature) {
            case '数据分析':
                this.addOptimizedScientistClickFeedback(card);
                break;
            case '代码编写':
                this.addOptimizedGeekClickFeedback(card);
                break;
            case '图表绘制':
                this.addOptimizedArtistClickFeedback(card);
                break;
        }
    },
    
    addOptimizedScientistClickFeedback(card) {
        // 科学家风格：简化的数据收集效果
        card.style.transform = 'scale(0.98)';
        card.style.transition = 'transform 0.08s ease';
        
        // 减少数据点数量，提高性能
        this.createOptimizedDataPoints(card);
        
        setTimeout(() => {
            card.style.transform = '';
            card.style.transition = '';
        }, 120);
    },
    
    addOptimizedGeekClickFeedback(card) {
        // 极客风格：简化的代码编译效果
        card.style.transform = 'scale(0.98)';
        card.style.transition = 'transform 0.08s ease';
        
        // 减少代码行数量，提高性能
        this.createOptimizedCodeLines(card);
        
        setTimeout(() => {
            card.style.transform = '';
            card.style.transition = '';
        }, 120);
    },
    
    addOptimizedArtistClickFeedback(card) {
        // 艺术家风格：简化的创意爆发效果
        card.style.transform = 'scale(0.98)';
        card.style.transition = 'transform 0.08s ease';
        
        // 减少粒子数量，提高性能
        this.createOptimizedColorParticles(card);
        
        setTimeout(() => {
            card.style.transform = '';
            card.style.transition = '';
        }, 120);
    },
    
    createOptimizedDataPoints(card) {
        // 创建优化的数据点动画效果，防止叠加
        if (card._dataPointAnimating) return;
        card._dataPointAnimating = true;
        
        const isMobile = window.innerWidth < 600;
        const count = isMobile ? 2 : 4; // 减少数量
        
        // 使用DocumentFragment提高性能
        const fragment = document.createDocumentFragment();
        
        for (let i = 0; i < count; i++) {
            const point = document.createElement('div');
            point.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                background: #3b82f6;
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                will-change: transform, opacity;
                animation: dataPointFloat 0.6s cubic-bezier(0.4,0,0.2,1) forwards;
                opacity: 0.8;
            `;
            
            // 让点从中心向四周浮动
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
            const radius = 25 + Math.random() * 15;
            point.style.left = `calc(50% + ${Math.cos(angle) * radius}px)`;
            point.style.top = `calc(50% + ${Math.sin(angle) * radius}px)`;
            point.style.animationDelay = i * 0.03 + 's';
            
            fragment.appendChild(point);
            
            // 优化销毁逻辑
            setTimeout(() => {
                if (point.parentNode) {
                    point.parentNode.removeChild(point);
                }
                if (i === count - 1) {
                    card._dataPointAnimating = false;
                }
            }, 600 + i * 30);
        }
        
        card.appendChild(fragment);
    },
    
    createOptimizedCodeLines(card) {
        // 创建优化的代码行动画效果，防止叠加
        if (card._codeLineAnimating) return;
        card._codeLineAnimating = true;
        
        const isMobile = window.innerWidth < 600;
        const count = isMobile ? 1 : 2; // 减少数量
        
        const fragment = document.createDocumentFragment();
        
        for (let i = 0; i < count; i++) {
            const line = document.createElement('div');
            line.style.cssText = `
                position: absolute;
                height: 2px;
                background: linear-gradient(90deg, #22c55e, transparent);
                pointer-events: none;
                z-index: 1000;
                will-change: transform, opacity;
                animation: codeLineScan 0.5s cubic-bezier(0.4,0,0.2,1) forwards;
                opacity: 0.7;
            `;
            line.style.left = '0%';
            line.style.top = (30 + i * 25) + '%';
            line.style.width = '100%';
            line.style.animationDelay = i * 0.05 + 's';
            
            fragment.appendChild(line);
            
            setTimeout(() => {
                if (line.parentNode) {
                    line.parentNode.removeChild(line);
                }
                if (i === count - 1) {
                    card._codeLineAnimating = false;
                }
            }, 500 + i * 50);
        }
        
        card.appendChild(fragment);
    },
    
    createOptimizedColorParticles(card) {
        // 创建优化的色彩粒子动画效果，防止叠加
        if (card._colorParticleAnimating) return;
        card._colorParticleAnimating = true;
        
        const isMobile = window.innerWidth < 600;
        const count = isMobile ? 2 : 3; // 减少数量
        
        const fragment = document.createDocumentFragment();
        const colors = ['#ec4899', '#a855f7', '#f59e0b'];
        
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            const color = colors[i % colors.length];
            const x = (Math.random() - 0.5) * 40;
            const y = (Math.random() - 0.5) * 40;
            
            particle.style.cssText = `
                position: absolute;
                width: 6px;
                height: 6px;
                background: ${color};
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                will-change: transform, opacity;
                animation: colorParticleExplode 0.6s cubic-bezier(0.4,0,0.2,1) forwards;
                opacity: 0.8;
                --x: ${x}px;
                --y: ${y}px;
            `;
            particle.style.left = '50%';
            particle.style.top = '50%';
            particle.style.animationDelay = i * 0.04 + 's';
            
            fragment.appendChild(particle);
            
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
                if (i === count - 1) {
                    card._colorParticleAnimating = false;
                }
            }, 600 + i * 40);
        }
        
        card.appendChild(fragment);
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
