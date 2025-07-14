/**
 * 通用输入框组件
 * author: liangliang
 * 
 * 提供统一的输入框样式和行为，支持多种类型
 */

export class Input {
    constructor(options = {}) {
        this.options = {
            type: 'text', // text, password, email, search, textarea
            placeholder: '',
            value: '',
            label: '',
            error: '',
            success: '',
            disabled: false,
            required: false,
            maxLength: null,
            rows: 3, // 对textarea有效
            autoResize: false, // 对textarea有效
            icon: null,
            iconPosition: 'left', // left, right
            onInput: null,
            onChange: null,
            onFocus: null,
            onBlur: null,
            className: '',
            ...options
        };
        
        this.container = this.createContainer();
        this.element = this.createElement();
        this.bindEvents();
    }
    
    createContainer() {
        const container = document.createElement('div');
        container.className = 'input-container';
        return container;
    }
    
    createElement() {
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'input-wrapper';
        
        // 创建标签
        if (this.options.label) {
            const label = document.createElement('label');
            label.className = 'input-label';
            label.textContent = this.options.label;
            if (this.options.required) {
                label.innerHTML += ' <span class="required">*</span>';
            }
            this.container.appendChild(label);
        }
        
        // 创建输入框容器
        if (this.options.icon) {
            inputWrapper.classList.add('input-with-icon', `icon-${this.options.iconPosition}`);
            
            const icon = document.createElement('i');
            icon.className = `input-icon ${this.options.icon}`;
            inputWrapper.appendChild(icon);
        }
        
        // 创建输入框
        const input = this.options.type === 'textarea' 
            ? document.createElement('textarea')
            : document.createElement('input');
            
        input.className = this.getInputClassName();
        this.setupInputAttributes(input);
        
        inputWrapper.appendChild(input);
        this.container.appendChild(inputWrapper);
        
        // 创建错误/成功消息
        this.messageElement = document.createElement('div');
        this.messageElement.className = 'input-message';
        this.container.appendChild(this.messageElement);
        
        this.updateMessage();
        
        return input;
    }
    
    setupInputAttributes(input) {
        if (this.options.type !== 'textarea') {
            input.type = this.options.type;
        }
        
        input.placeholder = this.options.placeholder;
        input.value = this.options.value;
        input.disabled = this.options.disabled;
        input.required = this.options.required;
        
        if (this.options.maxLength) {
            input.maxLength = this.options.maxLength;
        }
        
        if (this.options.type === 'textarea') {
            input.rows = this.options.rows;
        }
    }
    
    getInputClassName() {
        const classes = ['input'];
        
        if (this.options.error) classes.push('input-error');
        if (this.options.success) classes.push('input-success');
        if (this.options.disabled) classes.push('input-disabled');
        if (this.options.className) classes.push(this.options.className);
        
        return classes.join(' ');
    }
    
    bindEvents() {
        // 输入事件
        if (this.options.onInput) {
            this.element.addEventListener('input', (e) => {
                this.options.onInput(e.target.value, e);
            });
        }
        
        // 变化事件
        if (this.options.onChange) {
            this.element.addEventListener('change', (e) => {
                this.options.onChange(e.target.value, e);
            });
        }
        
        // 焦点事件
        if (this.options.onFocus) {
            this.element.addEventListener('focus', this.options.onFocus);
        }
        
        if (this.options.onBlur) {
            this.element.addEventListener('blur', this.options.onBlur);
        }
        
        // 自动调整高度（仅对textarea）
        if (this.options.type === 'textarea' && this.options.autoResize) {
            this.setupAutoResize();
        }
        
        // 字数统计
        if (this.options.maxLength) {
            this.element.addEventListener('input', () => {
                this.updateCharacterCount();
            });
        }
    }
    
    setupAutoResize() {
        const autoResize = () => {
            this.element.style.height = 'auto';
            this.element.style.height = this.element.scrollHeight + 'px';
        };
        
        this.element.addEventListener('input', autoResize);
        this.element.addEventListener('focus', autoResize);
        
        // 初始化
        setTimeout(autoResize, 0);
    }
    
    updateCharacterCount() {
        const current = this.element.value.length;
        const max = this.options.maxLength;
        
        let countElement = this.container.querySelector('.character-count');
        if (!countElement) {
            countElement = document.createElement('div');
            countElement.className = 'character-count';
            this.container.appendChild(countElement);
        }
        
        countElement.textContent = `${current}/${max}`;
        countElement.classList.toggle('count-warning', current > max * 0.8);
        countElement.classList.toggle('count-error', current >= max);
    }
    
    updateMessage() {
        if (this.options.error) {
            this.messageElement.className = 'input-message input-message-error';
            this.messageElement.textContent = this.options.error;
            this.messageElement.style.display = 'block';
        } else if (this.options.success) {
            this.messageElement.className = 'input-message input-message-success';
            this.messageElement.textContent = this.options.success;
            this.messageElement.style.display = 'block';
        } else {
            this.messageElement.style.display = 'none';
        }
    }
    
    // 公共方法
    getValue() {
        return this.element.value;
    }
    
    setValue(value) {
        this.element.value = value;
        this.options.value = value;
        if (this.options.maxLength) {
            this.updateCharacterCount();
        }
    }
    
    focus() {
        this.element.focus();
    }
    
    blur() {
        this.element.blur();
    }
    
    setError(error) {
        this.options.error = error;
        this.options.success = '';
        this.element.className = this.getInputClassName();
        this.updateMessage();
    }
    
    setSuccess(success) {
        this.options.success = success;
        this.options.error = '';
        this.element.className = this.getInputClassName();
        this.updateMessage();
    }
    
    clearMessages() {
        this.options.error = '';
        this.options.success = '';
        this.element.className = this.getInputClassName();
        this.updateMessage();
    }
    
    setDisabled(disabled) {
        this.options.disabled = disabled;
        this.element.disabled = disabled;
        this.element.className = this.getInputClassName();
    }
    
    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
    
    // 静态工厂方法
    static create(options) {
        return new Input(options);
    }
    
    static text(placeholder, options = {}) {
        return new Input({ ...options, type: 'text', placeholder });
    }
    
    static password(placeholder, options = {}) {
        return new Input({ ...options, type: 'password', placeholder });
    }
    
    static email(placeholder, options = {}) {
        return new Input({ ...options, type: 'email', placeholder });
    }
    
    static search(placeholder, options = {}) {
        return new Input({ ...options, type: 'search', placeholder });
    }
    
    static textarea(placeholder, options = {}) {
        return new Input({ ...options, type: 'textarea', placeholder });
    }
}

// CSS样式
const inputStyles = `
.input-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
}

.input-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--text-secondary);
}

.input-label .required {
    color: var(--error);
}

.input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.input-with-icon .input {
    padding-left: var(--spacing-10);
}

.input-with-icon.icon-right .input {
    padding-left: var(--spacing-4);
    padding-right: var(--spacing-10);
}

.input-icon {
    position: absolute;
    left: var(--spacing-3);
    color: var(--text-muted);
    z-index: 1;
}

.input-with-icon.icon-right .input-icon {
    left: auto;
    right: var(--spacing-3);
}

/* 状态样式 */
.input-error {
    border-color: var(--error) !important;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
}

.input-success {
    border-color: var(--success) !important;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important;
}

.input-disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* 消息样式 */
.input-message {
    font-size: var(--font-size-xs);
    margin-top: var(--spacing-1);
}

.input-message-error {
    color: var(--error);
}

.input-message-success {
    color: var(--success);
}

/* 字数统计 */
.character-count {
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    text-align: right;
    margin-top: var(--spacing-1);
}

.character-count.count-warning {
    color: var(--warning);
}

.character-count.count-error {
    color: var(--error);
}

/* 文本域自动调整 */
textarea.input {
    resize: vertical;
    min-height: calc(var(--spacing-10) + var(--spacing-2));
    max-height: 200px;
}
`;

// 动态注入样式
if (typeof document !== 'undefined' && !document.getElementById('shared-input-styles')) {
    const style = document.createElement('style');
    style.id = 'shared-input-styles';
    style.textContent = inputStyles;
    document.head.appendChild(style);
}

export default Input; 
