import { registerGlobalComponent } from '/src/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'YiTag',
    html: '/src/components/common/yiTag/index.html',
    props: {
        as: {
            type: String,
            default: 'span'
        },
        unstyled: {
            type: Boolean,
            default: false
        },
        clickable: {
            type: Boolean,
            default: false
        },
        active: {
            type: Boolean,
            default: false
        },
        size: {
            type: String,
            default: ''
        },
        disabled: {
            type: Boolean,
            default: false
        },
        className: {
            type: [String, Array, Object],
            default: ''
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
            const classes = this.unstyled ? [] : ['tag'];

            if (!this.unstyled && (this.clickable || this.as === 'button')) {
                classes.push('tag-clickable');
            }

            if (!this.unstyled && this.active) {
                classes.push('tag-active');
            }

            if (!this.unstyled && this.disabled) {
                classes.push('tag-disabled');
            }

            if (!this.unstyled && this.size) {
                classes.push(`tag-${this.size}`);
            }

            if (this.className) {
                classes.push(this.className);
            }

            return classes;
        }
    },
    methods: {
        onClick(event) {
            if (this.disabled) {
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
