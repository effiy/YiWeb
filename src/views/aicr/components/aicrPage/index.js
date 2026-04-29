import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'AicrPage',
    html: '/src/views/aicr/components/aicrPage/index.html',
    setup() {
        const ctx = Vue.inject('viewContext') || {};
        return ctx;
    },
    data() {
        return {
            showKeyboardShortcuts: false
        };
    },
    mounted() {
        this._onKeydown = (e) => {
            if (!e) return;
            const key = String(e.key || '');

            // ? 键切换快捷键帮助面板
            if (key === '?' && !this.isInputFocused()) {
                e.preventDefault();
                this.showKeyboardShortcuts = !this.showKeyboardShortcuts;
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
        isInputFocused() {
            const activeEl = document.activeElement;
            if (!activeEl) return false;
            const tagName = activeEl.tagName.toLowerCase();
            return tagName === 'input' || tagName === 'textarea' || activeEl.isContentEditable;
        }
    }
});

