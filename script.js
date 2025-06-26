// DOM 元素和状态管理
const elements = {
    welcomeSection: document.getElementById('welcomeSection'),
    chatContainer: document.getElementById('chatContainer'),
    inputSection: document.getElementById('inputSection'),
    messageInput: document.getElementById('messageInput'),
    chatInput: document.getElementById('chatInput'),
    sendBtn: document.getElementById('sendBtn'),
    chatSendBtn: document.getElementById('chatSendBtn'),
    chatMessages: document.getElementById('chatMessages'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    quickActions: document.querySelectorAll('.quick-action-btn'),
    scrollToBottomBtn: document.getElementById('scrollToBottomBtn'),
    homeMessageInput: document.getElementById('homeMessageInput'),
    homeSendBtn: document.getElementById('homeSendBtn')
};

let isFirstMessage = true, isTyping = false, messageIdCounter = 0, lastMessageTime = 0;
let typingTimeout = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    autoResizeTextarea(elements.messageInput);
    autoResizeTextarea(elements.chatInput);
    elements.messageInput.focus();
    setupKeyboardShortcuts();
    preloadAnimations();
});

// 预加载动画
function preloadAnimations() {
    // 创建隐藏元素来触发CSS动画预加载
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

// 事件监听器初始化
function initializeEventListeners() {
    // 输入框事件 - 优化交互
    [elements.messageInput, elements.chatInput].forEach(input => {
        input.addEventListener('input', handleInput);
        input.addEventListener('keydown', handleKeyDown);
        input.addEventListener('focus', handleInputFocus);
        input.addEventListener('blur', handleInputBlur);
        input.addEventListener('paste', handlePaste);
        input.addEventListener('compositionstart', handleCompositionStart);
        input.addEventListener('compositionend', handleCompositionEnd);
    });
    
    // 快速操作按钮 - 优化交互
    elements.quickActions.forEach(btn => {
        btn.addEventListener('click', handleQuickAction);
        btn.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleQuickAction.call(btn);
            }
        });
        btn.addEventListener('mouseenter', handleQuickActionHover);
        btn.addEventListener('mouseleave', handleQuickActionLeave);
    });
    
    // 聊天区域事件 - 优化交互
    elements.chatMessages.addEventListener('click', handleChatAreaClick);
    elements.chatMessages.addEventListener('dblclick', handleMessageDoubleClick);
    elements.chatMessages.addEventListener('scroll', handleScroll);
    
    // 触摸事件支持
    if ('ontouchstart' in window) {
        elements.chatMessages.addEventListener('touchstart', handleTouchStart);
        elements.chatMessages.addEventListener('touchend', handleTouchEnd);
    }
    
    // 检测键盘弹出
    detectKeyboardOpen();
}

// 处理输入框聚焦 - 优化交互
function handleInputFocus() {
    const wrapper = this.parentElement;
    wrapper.classList.add('focused');
    
    // 添加聚焦动画
    wrapper.style.transform = 'scale(1.01) translateY(-1px)';
    wrapper.style.boxShadow = '0 6px 24px rgba(66,133,244,0.15)';
    
    setTimeout(() => {
        wrapper.style.transform = '';
        wrapper.style.boxShadow = '';
    }, 300);
    
    // 添加输入框聚焦反馈
    this.style.borderColor = 'rgba(66,133,244,0.3)';
}

// 处理输入框失焦 - 优化交互
function handleInputBlur() {
    const wrapper = this.parentElement;
    wrapper.classList.remove('focused');
    
    // 移除输入框聚焦样式
    this.style.borderColor = '';
    
    // 延迟移除typing状态
    setTimeout(() => {
        if (!this.value.trim()) {
            wrapper.classList.remove('typing');
        }
    }, 500);
}

// 处理输入法组合事件
function handleCompositionStart() {
    this.parentElement.classList.add('composing');
}

function handleCompositionEnd() {
    this.parentElement.classList.remove('composing');
    handleInput.call(this);
}

// 处理快速操作按钮悬停
function handleQuickActionHover() {
    this.style.transform = 'translateY(-2px) scale(1.02)';
    this.style.boxShadow = '0 8px 24px rgba(66,133,244,0.25)';
}

// 处理快速操作按钮离开
function handleQuickActionLeave() {
    this.style.transform = '';
    this.style.boxShadow = '';
}

// 处理聊天区域滚动
function handleScroll() {
    const { scrollTop, scrollHeight, clientHeight } = elements.chatMessages;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    if (isAtBottom) {
        elements.scrollToBottomBtn.classList.remove('show');
    } else {
        elements.scrollToBottomBtn.classList.add('show');
    }
    
    // 检测滚动状态，为输入区域添加吸顶效果
    const inputSection = document.querySelector('.input-section');
    if (inputSection) {
        if (scrollTop > 10) {
            inputSection.classList.add('scrolling');
        } else {
            inputSection.classList.remove('scrolling');
        }
    }
}

// 处理触摸事件
let touchStartY = 0;
function handleTouchStart(e) {
    touchStartY = e.touches[0].clientY;
}

function handleTouchEnd(e) {
    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchStartY - touchEndY;
    
    // 向上滑动关闭消息菜单
    if (deltaY > 50) {
        closeAllMessageMenus();
    }
}

// 处理粘贴事件 - 优化交互
function handlePaste(e) {
    const clipboardData = e.clipboardData || window.clipboardData;
    if (clipboardData && clipboardData.items) {
        for (let i = 0; i < clipboardData.items.length; i++) {
            if (clipboardData.items[i].type.indexOf('image') !== -1) {
                const blob = clipboardData.items[i].getAsFile();
                handleImageUpload(blob);
                e.preventDefault();
                
                // 添加粘贴成功反馈
                showToast('图片已粘贴');
                break;
            }
        }
    }
}

// 处理图片上传 - 优化交互
function handleImageUpload(file) {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageUrl = e.target.result;
            addImageMessage(imageUrl, 'user');
            
            // 添加图片上传成功反馈
            showToast('图片上传成功');
        };
        reader.readAsDataURL(file);
    }
}

// 处理消息双击（引用）- 优化交互
function handleMessageDoubleClick(e) {
    const messageContent = e.target.closest('.message-content');
    if (messageContent) {
        const messageDiv = messageContent.closest('.message');
        const messageId = messageDiv.dataset.messageId;
        const content = messageContent.textContent;
        
        // 添加引用到输入框
        const input = isFirstMessage ? elements.messageInput : elements.chatInput;
        const quoteText = `> ${content}\n\n`;
        input.value = quoteText + input.value;
        input.focus();
        handleInput.call(input);
        
        // 添加引用成功反馈
        showToast('已引用消息', 'success');
        
        // 添加引用动画
        messageContent.style.transform = 'scale(1.05)';
        setTimeout(() => messageContent.style.transform = '', 300);
    }
}

// 处理聊天区域点击 - 优化交互
function handleChatAreaClick(e) {
    if (!e.target.closest('.message-menu')) {
        closeAllMessageMenus();
    }
    
    // 点击消息内容时的反馈
    const messageContent = e.target.closest('.message-content');
    if (messageContent && !e.target.closest('.message-menu')) {
        messageContent.style.transform = 'scale(0.98)';
        setTimeout(() => messageContent.style.transform = '', 150);
    }
}

// 关闭所有消息菜单 - 优化交互
function closeAllMessageMenus() {
    document.querySelectorAll('.message-menu').forEach(menu => {
        menu.classList.remove('show');
        menu.style.transform = 'scale(0.8) translateY(-10px)';
    });
}

// 处理快速操作按钮点击 - 优化交互
function handleQuickAction() {
    const prompt = this.dataset.prompt;
    if (prompt) {
        // 添加点击动画
        this.style.transform = 'scale(0.95)';
        setTimeout(() => this.style.transform = '', 150);
        
        // 添加按钮点击反馈
        this.style.boxShadow = '0 2px 8px rgba(66,133,244,0.4)';
        setTimeout(() => this.style.boxShadow = '', 300);
        
        elements.messageInput.value = prompt;
        handleInput.call(elements.messageInput);
        sendMessage(elements.messageInput);
        
        // 添加操作成功反馈
        showToast('快速操作已执行');
    }
}

// 处理输入事件 - 优化交互
function handleInput() {
    const input = this;
    const sendBtn = input === elements.messageInput ? elements.sendBtn : elements.chatSendBtn;
    const hasText = input.value.trim().length > 0;
    
    // 清除之前的定时器
    clearTimeout(typingTimeout);
    
    sendBtn.disabled = !hasText;
    
    // 只有textarea需要自动调整高度
    if (input.tagName === 'TEXTAREA') {
        autoResizeTextarea(input);
    }
    
    if (hasText && !isTyping) {
        isTyping = true;
        input.parentElement.classList.add('typing');
    } else if (!hasText && isTyping) {
        isTyping = false;
        input.parentElement.classList.remove('typing');
    }
    
    // 输入状态管理
    if (hasText) {
        typingTimeout = setTimeout(() => {
            input.parentElement.classList.add('typing');
        }, 1000);
    }
}

// 处理键盘事件 - 优化交互
function handleKeyDown(e) {
    if (e.key === 'Enter') {
        const input = e.target;
        const sendBtn = input === elements.messageInput ? elements.sendBtn : elements.chatSendBtn;
        
        // 如果按下 Shift + Enter，允许换行
        if (e.shiftKey) {
            // 不阻止默认行为，允许换行
            // 自动调整文本框高度
            if (input.tagName === 'TEXTAREA') {
                setTimeout(() => autoResizeTextarea(input), 0);
            }
            return;
        }
        
        // 普通 Enter 键发送消息
        e.preventDefault();
        
        if (!sendBtn.disabled) {
            // 添加键盘发送的视觉反馈
            sendBtn.style.transform = 'scale(0.95)';
            setTimeout(() => sendBtn.style.transform = '', 150);
            
            sendMessage(input);
        }
    } else if (e.key === 'Escape') {
        // ESC键关闭消息菜单
        closeAllMessageMenus();
        
        // 添加ESC键反馈
        const input = e.target;
        input.parentElement.style.transform = 'scale(0.98)';
        setTimeout(() => input.parentElement.style.transform = '', 200);
    }
}

// 设置键盘快捷键 - 优化交互
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K 快速聚焦
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const input = isFirstMessage ? elements.messageInput : elements.chatInput;
            input.focus();
            
            // 添加快捷键反馈
            input.parentElement.style.transform = 'scale(1.02)';
            setTimeout(() => input.parentElement.style.transform = '', 300);
            
            showToast('已聚焦到输入框');
        }
        
        // Ctrl/Cmd + L 清空对话
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            
            // 添加快捷键反馈
            const chatContainer = document.querySelector('.chat-container');
            if (chatContainer) {
                chatContainer.style.transform = 'scale(0.98)';
                chatContainer.style.boxShadow = '0 8px 24px rgba(255,71,87,0.4)';
                chatContainer.style.border = '2px solid rgba(255,71,87,0.3)';
                setTimeout(() => {
                    chatContainer.style.transform = '';
                    chatContainer.style.boxShadow = '';
                    chatContainer.style.border = '';
                }, 500);
            }
            
            // 显示确认提示
            showToast('正在清空对话...', 'warning');
            
            // 延迟执行清空操作，给用户视觉反馈时间
            setTimeout(() => {
                clearChat();
                showToast('对话已清空', 'success');
            }, 300);
        }
        
        // Ctrl/Cmd + Enter 发送消息
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            const input = isFirstMessage ? elements.messageInput : elements.chatInput;
            if (!input.parentElement.querySelector('.send-btn').disabled) {
                sendMessage(input);
            }
        }
    });
}

// 自动调整文本框大小 - 优化交互
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 24), 120);
    textarea.style.height = newHeight + 'px';
    
    // 添加高度变化动画
    if (newHeight > 24) {
        textarea.parentElement.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }
}

// 发送消息 - 优化交互
async function sendMessage(inputElement) {
    const message = inputElement.value.trim();
    if (!message) return;
    
    // 添加发送动画 - 更明显的反馈
    const sendBtn = inputElement.parentElement.querySelector('.send-btn');
    const wrapper = inputElement.closest('.input-wrapper') || inputElement.closest('.search-input-wrapper');
    
    // 按钮动画
    sendBtn.style.transform = 'scale(0.9) rotate(360deg)';
    sendBtn.style.boxShadow = '0 4px 16px rgba(66,133,244,0.4)';
    setTimeout(() => {
        sendBtn.style.transform = '';
        sendBtn.style.boxShadow = '';
    }, 300);
    
    // 输入框动画
    if (wrapper) {
        wrapper.style.transform = 'scale(0.98)';
        wrapper.style.boxShadow = '0 4px 16px rgba(66,133,244,0.2)';
        setTimeout(() => {
            wrapper.style.transform = '';
            wrapper.style.boxShadow = '';
        }, 200);
    }
    
    // 清空输入框并重置状态
    inputElement.value = '';
    if (inputElement.tagName === 'TEXTAREA') {
        inputElement.style.height = '24px';
    }
    handleInput.call(inputElement);
    
    // 添加用户消息
    const messageId = addMessage(message, 'user');
    
    // 切换到聊天模式
    if (isFirstMessage) {
        switchToChat();
        isFirstMessage = false;
    }
    
    // 显示加载状态
    showLoading();
    
    try {
        // 模拟AI响应
        const aiResponse = await simulateAIResponse(message);
        
        // 隐藏加载状态
        hideLoading();
        
        // 添加AI响应
        addMessage(aiResponse, 'ai');
        
        // 自动滚动到底部
        setTimeout(() => {
            elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
        }, 100);
    } catch (error) {
        hideLoading();
        showToast('发送失败，请重试', 'error');
        console.error('发送消息失败:', error);
    }
}

// 显示智能回复建议 - 优化交互
function showSmartReplySuggestions(aiResponse) {
    const suggestions = generateReplySuggestions(aiResponse);
    if (suggestions.length > 0) {
        let suggestionsHtml = '<div class="reply-suggestions">';
        suggestions.forEach(suggestion => {
            // 转义特殊字符防止XSS
            const escapedSuggestion = suggestion.replace(/'/g, "\\'").replace(/"/g, '\\"');
            suggestionsHtml += `<div class="suggestion-item" onclick="useReplySuggestion('${escapedSuggestion}')">${suggestion}</div>`;
        });
        suggestionsHtml += '</div>';
        
        let suggestionsContainer = document.querySelector('.reply-suggestions-container');
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'reply-suggestions-container';
            elements.inputSection.appendChild(suggestionsContainer);
        }
        suggestionsContainer.innerHTML = suggestionsHtml;
        suggestionsContainer.style.display = 'block';
        suggestionsContainer.style.opacity = '0';
        suggestionsContainer.style.transform = 'translateY(10px)';
        
        // 优化显示动画
        requestAnimationFrame(() => {
            suggestionsContainer.style.opacity = '1';
            suggestionsContainer.style.transform = 'translateY(0)';
        });
        
        // 添加建议项交互效果
        const suggestionItems = suggestionsContainer.querySelectorAll('.suggestion-item');
        suggestionItems.forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.transform = 'translateX(4px) scale(1.02)';
                item.style.boxShadow = '0 4px 12px rgba(66,133,244,0.2)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.transform = '';
                item.style.boxShadow = '';
            });
        });
        
        // 自动隐藏建议
        setTimeout(() => {
            hideReplySuggestions();
        }, 10000);
    }
}

// 使用回复建议 - 优化交互
function useReplySuggestion(suggestion) {
    elements.chatInput.value = suggestion;
    handleInput.call(elements.chatInput);
    elements.chatInput.focus();
    
    // 添加使用建议的反馈
    showToast('已使用回复建议', 'success');
    
    // 隐藏建议
    hideReplySuggestions();
    
    // 添加使用动画
    const suggestionItem = event.target;
    if (suggestionItem) {
        suggestionItem.style.transform = 'scale(0.95) translateX(8px)';
        suggestionItem.style.background = 'linear-gradient(135deg, #4285f4 0%, #3367d6 100%)';
        suggestionItem.style.color = 'white';
        setTimeout(() => {
            suggestionItem.style.transform = '';
            suggestionItem.style.background = '';
            suggestionItem.style.color = '';
        }, 200);
    }
}

// 生成回复建议
function generateReplySuggestions(aiResponse) {
    // 暂时不生成回复建议
    return [];
}

// 切换消息菜单 - 优化交互
function toggleMessageMenu(messageId) {
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageDiv) return;
    
    const menu = messageDiv.querySelector('.message-menu');
    if (!menu) return;
    
    // 关闭其他菜单
    closeAllMessageMenus();
    
    if (!menu.classList.contains('show')) {
        menu.classList.add('show');
        
        // 添加菜单显示动画
        menu.style.transform = 'scale(0.8) translateY(-10px)';
        requestAnimationFrame(() => {
            menu.style.transform = 'scale(1) translateY(0)';
        });
    }
}

// 复制消息 - 优化交互
function copyMessage(messageId) {
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageDiv) return;
    
    const content = messageDiv.querySelector('.message-content').textContent;
    
    navigator.clipboard.writeText(content).then(() => {
        showToast('消息已复制到剪贴板', 'success');
        
        // 添加复制成功动画
        const messageContent = messageDiv.querySelector('.message-content');
        if (messageContent) {
            messageContent.style.transform = 'scale(1.05)';
            messageContent.style.boxShadow = '0 8px 24px rgba(34,197,94,0.3)';
            setTimeout(() => {
                messageContent.style.transform = '';
                messageContent.style.boxShadow = '';
            }, 300);
        }
        
        closeAllMessageMenus();
    }).catch(() => {
        showToast('复制失败', 'error');
    });
}

// 重发消息 - 优化交互
function resendMessage(messageId) {
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageDiv) return;
    
    const content = messageDiv.querySelector('.message-content').textContent;
    
    // 添加重发动画
    messageDiv.style.transform = 'scale(0.95)';
    messageDiv.style.opacity = '0.7';
    setTimeout(() => {
        messageDiv.style.transform = '';
        messageDiv.style.opacity = '';
    }, 300);
    
    // 重新发送消息
    elements.chatInput.value = content;
    handleInput.call(elements.chatInput);
    sendMessage(elements.chatInput);
    
    showToast('消息已重发');
    closeAllMessageMenus();
}

// 删除消息 - 优化交互
function deleteMessage(messageId) {
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageDiv) return;
    
    // 添加删除动画
    messageDiv.style.transform = 'scale(0.8) translateX(100px)';
    messageDiv.style.opacity = '0';
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
        showToast('消息已删除');
    }, 300);
    
    closeAllMessageMenus();
}

// 显示提示消息 - 优化交互
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
        'info': 'fas fa-info-circle',
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'warning': 'fas fa-exclamation-triangle'
    };
    
    const colorMap = {
        'info': '#4285f4',
        'success': '#34a853',
        'error': '#ea4335',
        'warning': '#fbbc04'
    };
    
    toast.innerHTML = `
        <i class="${iconMap[type]}" style="margin-right: 0.5rem; color: ${colorMap[type]};"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // 优化显示动画
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    // 自动隐藏
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// 切换到聊天模式 - 优化交互
function switchToChat() {
    elements.welcomeSection.style.opacity = '0';
    elements.welcomeSection.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
        elements.welcomeSection.style.display = 'none';
        elements.chatContainer.style.display = 'flex';
        elements.inputSection.style.display = 'block';
        
        // 添加聊天界面进入动画
        elements.chatContainer.style.opacity = '0';
        elements.chatContainer.style.transform = 'translateY(20px)';
        
        requestAnimationFrame(() => {
            elements.chatContainer.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            elements.chatContainer.style.opacity = '1';
            elements.chatContainer.style.transform = 'translateY(0)';
        });
        
        elements.chatInput.focus();
        // 确保 chatInput 也设置自动调整高度
        autoResizeTextarea(elements.chatInput);
    }, 300);
}

// 清空对话 - 优化交互
function clearChat() {
    // 显示确认提示 - 更友好的文案
    if (!confirm('确定要清空所有对话吗？\n\n⚠️ 此操作不可撤销，所有聊天记录将被删除。')) {
        return;
    }
    
    // 添加清空动画 - 更流畅的效果
    const messages = elements.chatMessages.querySelectorAll('.message');
    messages.forEach((message, index) => {
        message.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        message.style.transform = `translateX(${index % 2 === 0 ? '-' : ''}120px) scale(0.7)`;
        message.style.opacity = '0';
        message.style.filter = 'blur(2px)';
    });
    
    setTimeout(() => {
        // 清空消息
        elements.chatMessages.innerHTML = '';
        
        // 重置所有状态
        messageIdCounter = 0;
        isFirstMessage = true;
        isTyping = false;
        lastMessageTime = 0;
        
        // 清除定时器
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            typingTimeout = null;
        }
        
        // 隐藏回复建议
        hideReplySuggestions();
        
        // 重置输入框
        elements.chatInput.value = '';
        elements.messageInput.value = '';
        elements.chatInput.style.height = 'auto';
        elements.messageInput.style.height = 'auto';
        
        // 重置按钮状态
        elements.sendBtn.disabled = true;
        elements.chatSendBtn.disabled = true;
        
        // 切换回欢迎页面
        elements.chatContainer.style.display = 'none';
        elements.inputSection.style.display = 'none';
        elements.welcomeSection.style.display = 'flex';
        
        // 添加欢迎页面重新显示动画
        elements.welcomeSection.style.opacity = '0';
        elements.welcomeSection.style.transform = 'translateY(30px) scale(0.95)';
        
        requestAnimationFrame(() => {
            elements.welcomeSection.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            elements.welcomeSection.style.opacity = '1';
            elements.welcomeSection.style.transform = 'translateY(0) scale(1)';
        });
        
        // 聚焦到欢迎页面的输入框
        setTimeout(() => {
            elements.messageInput.focus();
            showToast('✅ 对话已清空，可以开始新的对话了', 'success');
        }, 600);
    }, 400);
}

// 显示加载状态 - 优化交互
function showLoading() {
    elements.loadingIndicator.style.display = 'flex';
    elements.loadingIndicator.style.opacity = '0';
    elements.loadingIndicator.style.transform = 'translateY(20px)';
    
    requestAnimationFrame(() => {
        elements.loadingIndicator.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        elements.loadingIndicator.style.opacity = '1';
        elements.loadingIndicator.style.transform = 'translateY(0)';
    });
}

// 隐藏加载状态 - 优化交互
function hideLoading() {
    elements.loadingIndicator.style.opacity = '0';
    elements.loadingIndicator.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
        elements.loadingIndicator.style.display = 'none';
    }, 300);
}

// 模拟AI响应 - 添加微信风格的回复
async function simulateAIResponse(userMessage) {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const responses = {
        '你好': '你好！我是AI助手，很高兴为您服务。有什么我可以帮助您的吗？ 😊',
        '再见': '再见！如果还有问题，随时可以找我。祝您愉快！ 👋',
        '谢谢': '不客气！很高兴能帮助到您。',
        '帮助': '我可以帮助您回答问题、分析数据、编写代码等。请告诉我您需要什么帮助。 💡'
    };
    
    for (const [key, response] of Object.entries(responses)) {
        if (userMessage.includes(key)) return response;
    }
    
    const topics = {
        'Python': `我来帮您写一个简单的Python程序：\n\n\`\`\`python\ndef hello_world():\n    print("Hello, World!")\n\nhello_world()\n\`\`\`\n\n这是一个基础的Python程序示例。您需要什么具体的功能吗？ 🐍`,
        'JavaScript': `我来帮您写一个JavaScript函数：\n\n\`\`\`javascript\nfunction greetUser(name) {\n    return \`Hello, \${name}! Welcome to our website.\`;\n}\n\nconsole.log(greetUser('World'));\n\`\`\`\n\n这个函数可以动态生成问候语。您需要什么特定的功能吗？ ⚡`,
        '机器学习': `机器学习是人工智能的重要分支，让计算机能够从数据中学习。\n\n**主要类型：**\n1. **监督学习**：使用标记数据训练模型\n2. **无监督学习**：发现数据中的隐藏模式\n3. **强化学习**：通过试错学习最优策略\n\n**深度学习**是机器学习的一个子集，使用多层神经网络处理复杂数据。\n\n您想了解哪个具体方面呢？ 🤖`,
        '神经网络': `神经网络是模拟人脑神经元连接的计算模型。\n\n**工作原理：**\n- 输入层接收数据\n- 隐藏层进行特征提取\n- 输出层产生结果\n\n**大语言模型**（如GPT）是基于Transformer架构的神经网络，能够理解和生成人类语言。\n\n您对哪个技术细节感兴趣？ 🧠`,
        '自然语言处理': `自然语言处理（NLP）是让计算机理解和处理人类语言的技术。\n\n**主要任务：**\n- 文本分类\n- 情感分析\n- 机器翻译\n- 问答系统\n- 文本生成\n\n**应用场景：**\n- 智能客服\n- 搜索引擎\n- 语音助手\n- 内容推荐\n\n您想了解哪个具体的NLP应用？ 💬`,
        '计算机视觉': `计算机视觉是让计算机理解和分析图像的技术。\n\n**主要功能：**\n- 图像分类\n- 目标检测\n- 人脸识别\n- 图像分割\n- 视频分析\n\n**应用领域：**\n- 自动驾驶\n- 医疗诊断\n- 安防监控\n- 工业质检\n\n您对哪个视觉技术感兴趣？ 👁️`,
        '数据分析': `数据分析是从数据中提取有价值信息的过程。\n\n**常用工具：**\n- Python (pandas, numpy)\n- R语言\n- SQL数据库\n- 可视化工具\n\n**分析流程：**\n1. 数据收集\n2. 数据清洗\n3. 探索性分析\n4. 建模预测\n5. 结果可视化\n\n您需要什么类型的数据分析帮助？ 📊`,
        '生成式AI': `生成式AI是能够创建新内容的AI技术。\n\n**主要类型：**\n- **文本生成**：GPT、Claude等\n- **图像生成**：DALL-E、Midjourney\n- **音频生成**：语音合成、音乐创作\n- **视频生成**：动态内容创建\n\n**应用场景：**\n- 内容创作\n- 设计辅助\n- 代码生成\n- 创意写作\n\n您想了解哪个生成式AI的应用？ ✨`,
        'AI医疗': `AI在医疗领域有广泛应用，正在改变医疗行业。\n\n**主要应用：**\n- **医学影像诊断**：X光、CT、MRI分析\n- **药物发现**：新药研发和筛选\n- **个性化治疗**：基于基因的治疗方案\n- **健康监测**：可穿戴设备数据分析\n\n**优势：**\n- 提高诊断准确性\n- 减少医疗成本\n- 加速药物研发\n- 改善患者体验\n\n您对哪个医疗AI应用感兴趣？ 🏥`
    };
    
    for (const [key, response] of Object.entries(topics)) {
        if (userMessage.includes(key)) return response;
    }
    
    const defaultResponses = [
        `我理解您的问题："${userMessage}"。这是一个很有趣的话题，让我为您详细解答... 🤔`,
        `关于"${userMessage}"，我可以从几个角度为您分析... 💭`,
        `您提到的"${userMessage}"确实很重要，让我为您提供一些见解... 📝`,
        `对于"${userMessage}"这个问题，我建议您可以考虑以下几个方面... 💡`
    ];
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// 添加图片消息
function addImageMessage(imageUrl, type) {
    const messageId = ++messageIdCounter;
    addMessage(imageUrl, type, messageId);
    
    if (isFirstMessage) {
        switchToChat();
        isFirstMessage = false;
    }
}

// 预览图片
function previewImage(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'image-preview-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <img src="${imageUrl}" alt="预览图片">
            <button class="close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    setTimeout(() => modal.classList.add('show'), 10);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 格式化消息时间
function formatMessageTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) {
        return '刚刚';
    } else if (minutes < 60) {
        return `${minutes}分钟前`;
    } else if (hours < 24) {
        return `${hours}小时前`;
    } else if (days < 7) {
        return `${days}天前`;
    } else {
        return date.toLocaleDateString('zh-CN');
    }
}

// 隐藏回复建议 - 优化交互
function hideReplySuggestions() {
    const suggestionsContainer = document.querySelector('.reply-suggestions-container');
    if (suggestionsContainer) {
        suggestionsContainer.style.opacity = '0';
        suggestionsContainer.style.transform = 'translateY(10px)';
        setTimeout(() => {
            suggestionsContainer.style.display = 'none';
        }, 200);
    }
}

// 显示正在输入指示器 - 优化交互
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai typing-indicator';
    typingDiv.innerHTML = `
        <div class="avatar ai"><i class="fas fa-robot"></i></div>
        <div class="message-wrapper">
            <div class="message-content">
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        </div>
    `;
    
    elements.chatMessages.appendChild(typingDiv);
    
    // 添加淡入动画
    requestAnimationFrame(() => {
        typingDiv.classList.add('show');
    });
    
    return typingDiv;
}

// 隐藏正在输入指示器 - 优化交互
function hideTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.classList.remove('show');
        setTimeout(() => {
            if (typingIndicator.parentNode) {
                typingIndicator.parentNode.removeChild(typingIndicator);
            }
        }, 300);
    }
}

// 添加消息 - 优化交互
function addMessage(content, type, messageId = null) {
    if (!messageId) {
        messageId = ++messageIdCounter;
    }
    
    const now = new Date();
    const timeString = formatMessageTime(now);
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.dataset.messageId = messageId;
    
    const avatarIcon = type === 'user' ? 'fas fa-user' : 'fas fa-robot';
    const statusIcon = type === 'user' ? 'fas fa-check' : '';
    
    messageDiv.innerHTML = `
        <div class="avatar ${type}">
            <i class="${avatarIcon}"></i>
        </div>
        <div class="message-wrapper">
            <div class="message-content" onclick="toggleMessageMenu('${messageId}')">
                ${content}
            </div>
            <div class="message-footer">
                <span class="message-time">${timeString}</span>
                ${statusIcon ? `<i class="status-icon sent ${statusIcon}"></i>` : ''}
            </div>
            <div class="message-menu">
                <div class="menu-item" onclick="copyMessage('${messageId}')">
                    <i class="fas fa-copy"></i>复制
                </div>
                ${type === 'user' ? `
                <div class="menu-item" onclick="resendMessage('${messageId}')">
                    <i class="fas fa-redo"></i>重发
                </div>
                ` : ''}
                <div class="menu-item" onclick="deleteMessage('${messageId}')">
                    <i class="fas fa-trash"></i>删除
                </div>
            </div>
        </div>
    `;
    
    elements.chatMessages.appendChild(messageDiv);
    
    // 优化消息显示动画
    requestAnimationFrame(() => {
        messageDiv.classList.add('show');
        
        // 添加消息进入动画
        messageDiv.style.transform = 'translateY(20px) scale(0.95)';
        messageDiv.style.opacity = '0';
        
        requestAnimationFrame(() => {
            messageDiv.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            messageDiv.style.transform = 'translateY(0) scale(1)';
            messageDiv.style.opacity = '1';
        });
    });
    
    // 自动滚动到底部
    setTimeout(() => {
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }, 100);
    
    return messageId;
}

// 检测键盘弹出
function detectKeyboardOpen() {
    const inputSection = document.querySelector('.input-section');
    const messageInput = elements.messageInput;
    
    if (!inputSection || !messageInput) return;
    
    // 监听输入框聚焦事件
    messageInput.addEventListener('focus', function() {
        // 延迟检测，确保键盘完全弹出
        setTimeout(() => {
            const windowHeight = window.innerHeight;
            const inputRect = messageInput.getBoundingClientRect();
            const inputBottom = inputRect.bottom;
            
            // 如果输入框底部距离窗口底部很近，说明键盘已弹出
            if (inputBottom < windowHeight - 100) {
                inputSection.classList.add('keyboard-open');
            }
        }, 300);
    });
    
    // 监听输入框失焦事件
    messageInput.addEventListener('blur', function() {
        // 延迟移除，确保键盘完全收起
        setTimeout(() => {
            inputSection.classList.remove('keyboard-open');
        }, 300);
    });
    
    // 监听窗口大小变化（键盘弹出/收起时）
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const windowHeight = window.innerHeight;
            const inputRect = messageInput.getBoundingClientRect();
            const inputBottom = inputRect.bottom;
            
            if (inputBottom < windowHeight - 100) {
                inputSection.classList.add('keyboard-open');
            } else {
                inputSection.classList.remove('keyboard-open');
            }
        }, 100);
    });
}

