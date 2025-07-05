import { CONFIG } from './state.js';
import { utils } from './utils.js';

// 输入管理模块
export class InputManager {
    constructor() {
        this.textarea = null;
        this.isTyping = false;
    }

    init() {
        this.setupTextarea();
        this.setupEventListeners();
    }

    setupTextarea() {
        this.textarea = document.querySelector('#messageInput');
        if (!this.textarea) return;

        utils.autoResizeTextarea(this.textarea);
        this.textarea.focus();
    }

    setupEventListeners() {
        if (!this.textarea) return;

        this.textarea.addEventListener('keydown', this.handleKeydown.bind(this));
        this.textarea.addEventListener('input', this.handleInput.bind(this));
        this.textarea.addEventListener('paste', this.handlePaste.bind(this));
    }

    handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSend();
        }
    }

    handleInput() {
        this.isTyping = true;
        
        // 清除之前的超时
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        // 设置新的超时
        this.typingTimeout = setTimeout(() => {
            this.isTyping = false;
        }, CONFIG.DEBOUNCE_DELAY);
    }

    handlePaste(e) {
        // 处理粘贴事件，移除格式
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    }

    handleSend() {
        const message = this.textarea.value.trim();
        
        if (!message) {
            this.showError('请输入消息内容');
            return;
        }

        if (message.length > 2000) {
            this.showError('消息长度不能超过2000字符');
            return;
        }

        // 发送消息的逻辑
        this.sendMessage(message);
        
        // 清空输入框
        this.textarea.value = '';
        this.textarea.style.height = 'auto';
        this.textarea.focus();
    }

    sendMessage(message) {
        // 显示加载状态
        this.showLoading(true);
        
        // 模拟发送消息
        console.log('发送消息:', message);
        
        // 这里可以添加实际的API调用
        setTimeout(() => {
            this.showLoading(false);
            this.showSuccess('消息发送成功');
        }, 1000);
    }

    showLoading(show) {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'flex' : 'none';
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 3000);
        }
    }

    showSuccess(message) {
        // 创建成功提示
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success);
            color: white;
            padding: 12px 20px;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-md);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                utils.safeRemoveElement(successDiv);
            }, 300);
        }, 2000);
    }

    focus() {
        if (this.textarea) {
            this.textarea.focus();
        }
    }

    blur() {
        if (this.textarea) {
            this.textarea.blur();
        }
    }

    clear() {
        if (this.textarea) {
            this.textarea.value = '';
            this.textarea.style.height = 'auto';
        }
    }

    getValue() {
        return this.textarea ? this.textarea.value : '';
    }

    setValue(value) {
        if (this.textarea) {
            this.textarea.value = value;
            utils.autoResizeTextarea(this.textarea);
        }
    }
} 