// 输入框处理模块

import { utils } from '../../shared/utils/utils.js';
import { BASE_CONFIG, UI_CONFIG } from '../../config/index.js';

// 输入框处理
export const inputHandler = {
    init() {
        const messageInput = document.querySelector('#messageInput');
        if (!messageInput) return;

        this.setupTextarea(messageInput);
        this.setupEventListeners(messageInput);
    },

    setupTextarea(textarea) {
        utils.autoResizeTextarea(textarea);
    },

    setupEventListeners(textarea) {
        textarea.addEventListener('keydown', this.handleKeydown.bind(this));
        textarea.addEventListener('input', utils.debounce(this.handleInput.bind(this), BASE_CONFIG.DEBOUNCE_DELAY));
        textarea.addEventListener('paste', this.handlePaste.bind(this));
    },

    handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSend();
        }
    },

    handleInput() {
        // 可以在这里添加输入验证或其他处理
    },

    handlePaste(e) {
        // 处理粘贴事件，可以添加内容清理逻辑
        setTimeout(() => {
            const textarea = e.target;
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, UI_CONFIG.MAX_TEXTAREA_HEIGHT) + 'px';
        }, 0);
    },

    handleSend() {
        const messageInput = document.querySelector('#messageInput');
        if (!messageInput || !messageInput.value.trim()) return;

        const message = messageInput.value.trim();
        console.log('发送消息:', message);

        // 这里可以添加发送消息的逻辑
        // 例如跳转到聊天页面或调用API

        // 清空输入框
        messageInput.value = '';
        messageInput.style.height = 'auto';
    }
}; 
