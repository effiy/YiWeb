import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'YiTextarea',
    html: '/cdn/components/common/forms/YiTextarea/template.html',
    css: '/cdn/components/common/forms/YiTextarea/index.css',
    props: {
        rows: {
            type: Number,
            default: 4
        },
        size: {
            type: String,
            default: '',
            validator: (value) => !value || ['sm', 'lg'].includes(value)
        },
        variant: {
            type: String,
            default: '',
            validator: (value) => !value || ['error'].includes(value)
        },
        placeholder: {
            type: String,
            default: ''
        },
        disabled: {
            type: Boolean,
            default: false
        },
        readonly: {
            type: Boolean,
            default: false
        },
        required: {
            type: Boolean,
            default: false
        },
        modelValue: {
            type: String,
            default: ''
        },
        name: {
            type: String,
            default: ''
        },
        id: {
            type: String,
            default: ''
        },
        ariaLabel: {
            type: String,
            default: ''
        },
        resize: {
            type: String,
            default: 'vertical',
            validator: (value) => ['none', 'vertical', 'horizontal', 'both'].includes(value)
        },
        className: {
            type: String,
            default: ''
        }
    },
    emits: ['update:modelValue', 'focus', 'blur'],
    computed: {
        computedClass() {
            const classes = ['yi-textarea'];
            if (this.size) {
                classes.push(`yi-textarea-${this.size}`);
            }
            if (this.variant) {
                classes.push(`yi-textarea-${this.variant}`);
            }
            if (this.className) {
                classes.push(this.className);
            }
            return classes;
        },
        resizeStyle() {
            return { resize: this.resize };
        }
    },
    methods: {
        onInput(event) {
            this.$emit('update:modelValue', event.target.value);
        },
        onFocus(event) {
            this.$emit('focus', event);
        },
        onBlur(event) {
            this.$emit('blur', event);
        }
    }
});
