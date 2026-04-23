import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

const componentOptions = {
    name: 'KeyboardShortcutsHelp',
    html: '/src/views/aicr/components/keyboardShortcutsHelp/index.html',
    props: {
        visible: {
            type: Boolean,
            default: false
        }
    },
    emits: ['close'],
    mounted() {
        this._onKeydown = (e) => {
            if (!e) return;
            const key = String(e.key || '');

            // ESC 关闭面板
            if (key === 'Escape' && this.visible) {
                e.preventDefault();
                this.close();
                return;
            }

            // ? 键切换面板
            if (key === '?' && !this.isInputFocused()) {
                e.preventDefault();
                this.$emit('close');
            }
        };

        window.addEventListener('keydown', this._onKeydown);
    },
    beforeUnmount() {
        if (this._onKeydown) {
            window.removeEventListener('keydown', this._onKeydown);
        }
    },
    methods: {
        close() {
            this.$emit('close');
        },
        handleOverlayClick() {
            this.close();
        },
        isInputFocused() {
            const activeEl = document.activeElement;
            if (!activeEl) return false;
            const tagName = activeEl.tagName.toLowerCase();
            return tagName === 'input' || tagName === 'textarea' || activeEl.isContentEditable;
        }
    }
};

registerGlobalComponent(componentOptions);
