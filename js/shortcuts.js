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
        // 高亮显示
        this.highlightShortcut(item);
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
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    shortcutsInteraction.init();
});

// 导出模块（如果需要）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = shortcutsInteraction;
} 
