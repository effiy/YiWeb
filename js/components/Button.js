/**
 * 通用按钮组件
 * author: liangliang
 * 
 * 提供统一的按钮样式和行为，供所有模块复用
 */

export class Button {
    constructor(options = {}) {
        this.options = {
            text: '按钮',
            variant: 'primary', // primary, secondary, outline, ghost
            size: 'medium', // small, medium, large
            icon: null,
            iconPosition: 'left', // left, right
            loading: false,
            disabled: false,
            onClick: null,
            className: '',
            ...options
        };
        
        this.element = this.createElement();
        this.bindEvents();
    }
    
    createElement() {
        const button = document.createElement('button');
        button.className = this.getClassName();
        button.innerHTML = this.getInnerHTML();
        button.disabled = this.options.disabled || this.options.loading;
        
        return button;
    }
    
    getClassName() {
        const classes = ['btn'];
        
        // 变体样式
        classes.push(`btn-${this.options.variant}`);
        
        // 尺寸样式
        classes.push(`btn-${this.options.size}`);
        
        // 状态样式
        if (this.options.loading) classes.push('btn-loading');
        if (this.options.disabled) classes.push('btn-disabled');
        
        // 自定义类名
        if (this.options.className) classes.push(this.options.className);
        
        return classes.join(' ');
    }
    
    getInnerHTML() {
        const { text, icon, iconPosition, loading } = this.options;
        
        if (loading) {
            return '<span class="loading-spinner btn-spinner"></span><span>加载中...</span>';
        }
        
        let content = `<span class="btn-text">${text}</span>`;
        
        if (icon) {
            const iconElement = `<i class="${icon}" aria-hidden="true"></i>`;
            if (iconPosition === 'right') {
                content = `${content}${iconElement}`;
            } else {
                content = `${iconElement}${content}`;
            }
        }
        
        return content;
    }
    
    bindEvents() {
        if (this.options.onClick) {
            this.element.addEventListener('click', (e) => {
                if (!this.options.disabled && !this.options.loading) {
                    this.options.onClick(e);
                }
            });
        }
        
        // 键盘支持
        this.element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.element.click();
            }
        });
    }
    
    // 公共方法
    setText(text) {
        this.options.text = text;
        this.update();
    }
    
    setLoading(loading) {
        this.options.loading = loading;
        this.element.disabled = this.options.disabled || loading;
        this.update();
    }
    
    setDisabled(disabled) {
        this.options.disabled = disabled;
        this.element.disabled = disabled || this.options.loading;
        this.update();
    }
    
    update() {
        this.element.className = this.getClassName();
        this.element.innerHTML = this.getInnerHTML();
    }
    
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
    
    // 静态工厂方法
    static create(options) {
        return new Button(options);
    }
    
    static primary(text, onClick) {
        return new Button({ text, onClick, variant: 'primary' });
    }
    
    static secondary(text, onClick) {
        return new Button({ text, onClick, variant: 'secondary' });
    }
    
    static outline(text, onClick) {
        return new Button({ text, onClick, variant: 'outline' });
    }
    
    static ghost(text, onClick) {
        return new Button({ text, onClick, variant: 'ghost' });
    }
}

// CSS样式（如果需要扩展基础样式）
const buttonStyles = `
.btn {
    /* 基础样式已在global.css中定义 */
}

/* 尺寸变体 */
.btn-small {
    padding: var(--spacing-2) var(--spacing-4);
    font-size: var(--font-size-sm);
}

.btn-medium {
    padding: var(--spacing-3) var(--spacing-6);
    font-size: var(--font-size-base);
}

.btn-large {
    padding: var(--spacing-4) var(--spacing-8);
    font-size: var(--font-size-lg);
}

/* 额外变体 */
.btn-outline {
    background: transparent;
    color: var(--primary);
    border: 2px solid var(--primary);
}

.btn-outline:hover {
    background: var(--primary);
    color: white;
}

.btn-ghost {
    background: transparent;
    color: var(--primary);
    border: none;
}

.btn-ghost:hover {
    background: rgba(79, 70, 229, 0.1);
}

/* 加载状态 */
.btn-loading {
    pointer-events: none;
    opacity: 0.7;
}

.btn-spinner {
    width: 16px;
    height: 16px;
    margin-right: var(--spacing-2);
}

/* 禁用状态 */
.btn-disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
}
`;

// 如果需要，动态注入样式
if (typeof document !== 'undefined' && !document.getElementById('shared-button-styles')) {
    const style = document.createElement('style');
    style.id = 'shared-button-styles';
    style.textContent = buttonStyles;
    document.head.appendChild(style);
}

export default Button; 