// 快捷键区域交互功能
const shortcutsInteraction = {
    init() {
        this.setupShortcutItems();
        this.setupKeyboardNavigation();
    },

    setupShortcutItems() {
        const shortcutItems = document.querySelectorAll('.shortcut-item');
        
        shortcutItems.forEach((item, index) => {
            // 添加延迟动画
            item.style.animationDelay = `${index * 0.05}s`;
            item.classList.add('shortcut-item-animated');
            
            // 点击效果
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleShortcutClick(e, item);
            });
            
            // 键盘导航
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleShortcutClick(e, item);
                }
            });
            
            // 设置tabindex
            item.setAttribute('tabindex', '0');
            item.setAttribute('role', 'button');
            item.setAttribute('aria-label', `${item.querySelector('.shortcut-desc').textContent} - ${item.querySelector('.shortcut-key').textContent}`);
        });
    },

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearAllHighlights();
            }
        });
    },

    handleShortcutClick(e, item) {
        // 创建点击效果
        this.createClickEffect(e, item);
        
        // 高亮显示
        this.highlightShortcut(item);
        
        // 显示提示信息
        this.showShortcutInfo(item);
    },

    createClickEffect(e, item) {
        const rect = item.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(79, 172, 254, 0.3);
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 10;
            animation: shortcutRipple 0.6s ease-out;
        `;
        
        item.appendChild(ripple);
        
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    },

    highlightShortcut(item) {
        // 清除之前的高亮
        this.clearAllHighlights();
        
        // 添加高亮效果
        item.classList.add('shortcut-highlighted');
        
        // 3秒后自动清除高亮
        setTimeout(() => {
            item.classList.remove('shortcut-highlighted');
        }, 3000);
    },

    clearAllHighlights() {
        const highlightedItems = document.querySelectorAll('.shortcut-highlighted');
        highlightedItems.forEach(item => {
            item.classList.remove('shortcut-highlighted');
        });
    },

    showShortcutInfo(item) {
        const key = item.querySelector('.shortcut-key').textContent;
        const desc = item.querySelector('.shortcut-desc').textContent;
        
        // 创建提示信息
        const tooltip = document.createElement('div');
        tooltip.className = 'shortcut-tooltip';
        tooltip.innerHTML = `
            <div class="tooltip-content">
                <div class="tooltip-key">${key}</div>
                <div class="tooltip-desc">${desc}</div>
            </div>
        `;
        tooltip.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            pointer-events: none;
            animation: fadeInUp 0.3s ease-out;
        `;
        
        document.body.appendChild(tooltip);
        
        // 2秒后自动移除
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, 2000);
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    shortcutsInteraction.init();
});

// 导出模块（如果需要）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = shortcutsInteraction;
} 
