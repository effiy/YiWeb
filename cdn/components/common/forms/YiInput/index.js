import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'YiInput',
    html: '/cdn/components/common/forms/YiInput/template.html',
    css: '/cdn/components/common/forms/YiInput/index.css',
    props: {
        type: {
            type: String,
            default: 'text'
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
            type: [String, Number],
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
        autocomplete: {
            type: String,
            default: ''
        },
        className: {
            type: String,
            default: ''
        }
    },
    emits: ['update:modelValue', 'focus', 'blur'],
    computed: {
        computedClass() {
            const classes = ['yi-input'];
            if (this.size) {
                classes.push(`yi-input-${this.size}`);
            }
            if (this.variant) {
                classes.push(`yi-input-${this.variant}`);
            }
            if (this.className) {
                classes.push(this.className);
            }
            return classes;
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
