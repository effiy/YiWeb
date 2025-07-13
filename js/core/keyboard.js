// 键盘快捷键模块

// 键盘快捷键管理
export const keyboardShortcuts = {
    shortcuts: new Map([
        ['k', { ctrl: true, action: 'clearInput' }],
        ['l', { ctrl: true, action: 'focusInput' }],
        ['Escape', { ctrl: false, action: 'blurInput' }]
    ]),

    init() {
        document.addEventListener('keydown', this.handleKeydown.bind(this));
    },

    handleKeydown(e) {
        const shortcut = this.shortcuts.get(e.key);
        if (!shortcut) return;

        const isCtrlPressed = e.ctrlKey || e.metaKey;
        if (shortcut.ctrl && !isCtrlPressed) return;

        e.preventDefault();
        this.executeAction(shortcut.action);
    },

    executeAction(action) {
        const input = document.querySelector('#messageInput');
        if (!input) return;

        switch (action) {
            case 'clearInput':
                input.value = '';
                input.style.height = 'auto';
                input.focus();
                console.log('已清空输入框内容');
                break;
            case 'focusInput':
                input.focus();
                break;
            case 'blurInput':
                input.blur();
                break;
        }
    }
}; 