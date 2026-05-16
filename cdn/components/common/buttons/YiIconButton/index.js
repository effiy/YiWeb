import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'YiIconButton',
    html: '/cdn/components/common/buttons/YiIconButton/template.html',
    css: '/cdn/components/common/buttons/YiIconButton/index.css',
    props: {
        type: {
            type: String,
            default: 'button'
        },
        className: {
            type: String,
            default: ''
        },
        size: {
            type: String,
            default: '',
            validator: (value) => !value || ['sm', 'lg'].includes(value)
        },
        variant: {
            type: String,
            default: '',
            validator: (value) => !value || ['primary', 'ghost'].includes(value)
        },
        active: {
            type: Boolean,
            default: false
        },
        activeClass: {
            type: String,
            default: 'active'
        },
        disabled: {
            type: Boolean,
            default: false
        },
        title: {
            type: String,
            default: ''
        },
        ariaLabel: {
            type: String,
            default: ''
        }
    },
    emits: ['click'],
    computed: {
        computedClass() {
            const classes = ['icon-button'];
            if (this.size) {
                classes.push(`icon-button-${this.size}`);
            }
            if (this.variant) {
                classes.push(`icon-button-${this.variant}`);
            }
            if (this.className) {
                classes.push(this.className);
            }
            if (this.active && this.activeClass) {
                classes.push(this.activeClass);
            }
            return classes;
        }
    }
});
