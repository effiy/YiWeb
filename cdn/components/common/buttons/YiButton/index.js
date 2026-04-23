import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'YiButton',
    html: '/cdn/components/common/buttons/YiButton/template.html',
    css: '/cdn/components/common/buttons/YiButton/index.css',
    props: {
        as: {
            type: String,
            default: 'button',
            validator: (value) => ['button', 'a'].includes(value)
        },
        unstyled: {
            type: Boolean,
            default: false
        },
        type: {
            type: String,
            default: 'button',
            validator: (value) => ['button', 'submit', 'reset'].includes(value)
        },
        href: {
            type: String,
            default: ''
        },
        target: {
            type: String,
            default: ''
        },
        rel: {
            type: String,
            default: ''
        },
        variant: {
            type: String,
            default: '',
            validator: (value) => !value || ['primary', 'secondary', 'outline', 'ghost', 'danger'].includes(value)
        },
        size: {
            type: String,
            default: '',
            validator: (value) => !value || ['small', 'large'].includes(value)
        },
        loading: {
            type: Boolean,
            default: false
        },
        disabled: {
            type: Boolean,
            default: false
        },
        block: {
            type: Boolean,
            default: false
        },
        icon: {
            type: String,
            default: ''
        },
        iconPosition: {
            type: String,
            default: 'left',
            validator: (value) => ['left', 'right'].includes(value)
        },
        className: {
            type: [String, Array, Object],
            default: ''
        },
        active: {
            type: Boolean,
            default: false
        },
        activeClass: {
            type: String,
            default: 'active'
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
            const classes = this.unstyled ? [] : ['btn'];

            if (this.variant) {
                classes.push(`btn-${this.variant}`);
            }

            if (this.size) {
                classes.push(`btn-${this.size}`);
            }

            if (this.loading) {
                classes.push('btn-loading');
            }

            if (this.block) {
                classes.push('btn-block');
            }

            if (this.className) {
                classes.push(this.className);
            }

            if (this.active && this.activeClass) {
                classes.push(this.activeClass);
            }

            return classes;
        },
        isDisabled() {
            return this.disabled || this.loading;
        }
    },
    methods: {
        onClick(event) {
            if (this.isDisabled) {
                if (event && typeof event.preventDefault === 'function') {
                    event.preventDefault();
                }
                if (event && typeof event.stopPropagation === 'function') {
                    event.stopPropagation();
                }
                return;
            }

            this.$emit('click', event);
        }
    }
});
