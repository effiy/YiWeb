import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

let inputIdCounter = 0;

registerGlobalComponent({
    name: 'YiInput',
    html: '/cdn/components/common/forms/YiInput/template.html',
    css: '/cdn/components/common/forms/YiInput/index.css',
    props: {
        modelValue: {
            type: [String, Number],
            default: ''
        },
        type: {
            type: String,
            default: 'text'
        },
        label: {
            type: String,
            default: ''
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
        error: {
            type: String,
            default: ''
        },
        hint: {
            type: String,
            default: ''
        },
        maxlength: {
            type: [Number, String],
            default: null
        },
        minlength: {
            type: [Number, String],
            default: null
        },
        min: {
            type: [Number, String],
            default: null
        },
        max: {
            type: [Number, String],
            default: null
        },
        step: {
            type: [Number, String],
            default: null
        },
        pattern: {
            type: String,
            default: null
        },
        autocomplete: {
            type: String,
            default: null
        },
        rows: {
            type: [Number, String],
            default: 3
        },
        prefix: {
            type: String,
            default: ''
        },
        suffix: {
            type: String,
            default: ''
        },
        showClear: {
            type: Boolean,
            default: false
        },
        showPasswordToggle: {
            type: Boolean,
            default: false
        },
        showCount: {
            type: Boolean,
            default: false
        },
        size: {
            type: String,
            default: ''
        },
        wrapperClass: {
            type: String,
            default: 'input-wrapper'
        },
        labelClass: {
            type: String,
            default: 'input-label'
        },
        inputContainerClass: {
            type: String,
            default: 'input-container'
        },
        prefixClass: {
            type: String,
            default: 'input-prefix'
        },
        suffixClass: {
            type: String,
            default: 'input-suffix'
        },
        clearButtonClass: {
            type: String,
            default: 'input-clear'
        },
        toggleButtonClass: {
            type: String,
            default: 'input-toggle'
        },
        messageClass: {
            type: String,
            default: 'input-message'
        },
        countClass: {
            type: String,
            default: 'input-count'
        },
        ariaLabel: {
            type: String,
            default: ''
        }
    },
    emits: ['update:modelValue', 'change', 'focus', 'blur', 'clear', 'keydown'],
    data() {
        return {
            inputId: `yi-input-${++inputIdCounter}`,
            passwordVisible: false
        };
    },
    computed: {
        inputClass() {
            const classes = ['input'];

            if (this.size) {
                classes.push(`input-${this.size}`);
            }

            if (this.error) {
                classes.push('input-error-state');
            }

            if (this.disabled) {
                classes.push('input-disabled');
            }

            if (this.readonly) {
                classes.push('input-readonly');
            }

            return classes.join(' ');
        }
    },
    methods: {
        onInput(event) {
            this.$emit('update:modelValue', event.target.value);
        },
        onChange(event) {
            this.$emit('change', event.target.value);
        },
        onFocus(event) {
            this.$emit('focus', event);
        },
        onBlur(event) {
            this.$emit('blur', event);
        },
        onKeydown(event) {
            this.$emit('keydown', event);
        },
        onClear() {
            this.$emit('update:modelValue', '');
            this.$emit('clear');
        },
        onTogglePassword() {
            this.passwordVisible = !this.passwordVisible;
            const input = this.$el.querySelector('input');
            if (input) {
                input.type = this.passwordVisible ? 'text' : 'password';
            }
        }
    }
});
