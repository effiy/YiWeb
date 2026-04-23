/**
 * 优化后的yiLoading组件
 * author: liangliang
 */
import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'YiLoading',
    html: '/cdn/components/common/loaders/YiLoading/template.html',
    css: '/cdn/components/common/loaders/YiLoading/index.css',
    props: {
        text: {
            type: String,
            default: '正在加载...'
        },
        subtext: {
            type: String,
            default: ''
        },
        size: {
            type: String,
            default: '',
            validator: (value) => !value || ['small', 'large'].includes(value)
        },
        type: {
            type: String,
            default: 'spinner',
            validator: (value) => ['spinner', 'dots', 'pulse', 'wave'].includes(value)
        },
        fullscreen: {
            type: Boolean,
            default: false
        },
        overlay: {
            type: Boolean,
            default: false
        },
        containerClass: {
            type: String,
            default: 'loading-container'
        },
        spinnerClass: {
            type: String,
            default: 'loading-spinner'
        },
        textClass: {
            type: String,
            default: 'loading-text'
        },
        subtextClass: {
            type: String,
            default: 'loading-subtext'
        }
    },
    computed: {
        computedContainerClass() {
            const classes = [this.containerClass];

            if (this.fullscreen) {
                classes.push('loading-fullscreen');
            }

            if (this.overlay) {
                classes.push('loading-overlay');
            }

            return classes.join(' ');
        },
        computedSpinnerClass() {
            const classes = [this.spinnerClass];

            if (this.size) {
                classes.push(`loading-${this.size}`);
            }

            if (this.type !== 'spinner') {
                classes.push(`loading-${this.type}`);
            }

            return classes.join(' ');
        }
    }
});