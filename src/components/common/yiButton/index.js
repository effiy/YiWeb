import { registerGlobalComponent } from '/src/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'YiButton',
    html: '/src/components/common/yiButton/index.html',
    props: {
        as: {
            type: String,
            default: 'button'
        },
        unstyled: {
            type: Boolean,
            default: false
        },
        type: {
            type: String,
            default: 'button'
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
            default: ''
        },
        size: {
            type: String,
            default: ''
        },
        loading: {
            type: Boolean,
            default: false
        },
        disabled: {
            type: Boolean,
            default: false
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

            if (this.className) {
                classes.push(this.className);
            }

            if (this.active && this.activeClass) {
                classes.push(this.activeClass);
            }

            return classes;
        }
    },
    methods: {
        onClick(event) {
            if (this.disabled || this.loading) {
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
