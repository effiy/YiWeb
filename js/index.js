// 主要JavaScript文件 - 通用功能和工具函数

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

    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // 格式化时间
    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 7) return `${days}天前`;
        
        return date.toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // 生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // 复制到剪贴板
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        }
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
    },

    // 滚动到底部
    scrollToBottom(element, smooth = true) {
        if (element) {
            element.scrollTo({
                top: element.scrollHeight,
                behavior: smooth ? 'smooth' : 'auto'
            });
        }
    },

    // 检查是否在底部
    isAtBottom(element, threshold = 50) {
        if (!element) return true;
        const { scrollTop, scrollHeight, clientHeight } = element;
        return scrollHeight - scrollTop - clientHeight < threshold;
    },

    // 预加载动画
    preloadAnimations() {
        const preloadEl = document.createElement('div');
        preloadEl.style.cssText = 'position:absolute;top:-9999px;left:-9999px;opacity:0;pointer-events:none;';
        preloadEl.innerHTML = `
            <div class="message show"></div>
            <div class="send-btn"></div>
            <div class="clear-btn"></div>
        `;
        document.body.appendChild(preloadEl);
        setTimeout(() => preloadEl.remove(), 100);
    }
};

// 键盘快捷键管理
const keyboardShortcuts = {
    init() {
        // 检查当前页面，避免与welcome.js冲突
        const isWelcomePage = window.location.pathname.includes('index.html') || 
                             window.location.pathname === '/' ||
                             document.querySelector('#welcomeSection');
        
        if (isWelcomePage) {
            // 在欢迎页面，让welcome.js处理快捷键
            return;
        }
        
        document.addEventListener('keydown', (e) => {
            // Ctrl+K 聚焦到输入框
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const input = document.querySelector('#messageInput, #chatInput');
                if (input) {
                    input.focus();
                }
            }
            
            // Ctrl+L 清空对话
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                const clearBtn = document.querySelector('#clearBtn');
                if (clearBtn) {
                    clearBtn.click();
                }
            }
        });
    }
};

// 性能优化
const performance = {
    // 图片懒加载
    lazyLoadImages() {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    },

    // 预加载关键资源
    preloadCriticalResources() {
        const links = [
            { rel: 'preload', href: 'css/main.css', as: 'style' },
            { rel: 'preload', href: 'js/main.js', as: 'script' }
        ];
        
        links.forEach(link => {
            const linkEl = document.createElement('link');
            Object.assign(linkEl, link);
            document.head.appendChild(linkEl);
        });
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化键盘快捷键
    keyboardShortcuts.init();
    
    // 检测键盘弹出
    utils.detectKeyboardOpen();
    
    // 预加载动画
    utils.preloadAnimations();
    
    // 性能优化
    performance.lazyLoadImages();
    performance.preloadCriticalResources();
    
    // 设置导航栏活动状态
    setActiveNavLink();
});

// 设置导航栏活动状态
function setActiveNavLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPath.split('/').pop() || 
            (currentPath === '/' && link.getAttribute('href') === 'index.html')) {
            link.classList.add('active');
        }
    });
}

// 导出到全局
window.utils = utils;
window.globalState = globalState; 
