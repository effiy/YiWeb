import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'YiCheckbox',
    html: '/cdn/components/common/forms/YiCheckbox/template.html',
    css: '/cdn/components/common/forms/YiCheckbox/index.css',
    props: {
        modelValue: {
            type: [Boolean, Array],
            default: false
        },
        value: {
            type: [String, Number, Boolean],
            default: null
        },
        label: {
            type: String,
            default: ''
        },
        disabled: {
            type: Boolean,
            default: false
        },
        required: {
            type: Boolean,
            default: false
        },
        size: {
            type: String,
            default: ''
        },
        wrapperClass: {
            type: String,
            default: 'checkbox-wrapper'
        },
        inputClass: {
            type: String,
            default: 'checkbox-input'
        },
        checkboxClass: {
            type: String,
            default: 'checkbox'
        },
        iconClass: {
            type: String,
            default: 'checkbox-icon'
        },
        labelClass: {
            type: String,
            default: 'checkbox-label'
        },
        ariaLabel: {
            type: String,
            default: ''
        }
    },
    emits: ['update:modelValue', 'change'],
    computed: {
        isChecked() {
            if (Array.isArray(this.modelValue)) {
                return this.modelValue.includes(this.value);
            }
            return Boolean(this.modelValue);
        }
    },
    methods: {
        onChange(event) {
            const checked = event.target.checked;

            if (Array.isArray(this.modelValue)) {
                const newValue = [...this.modelValue];

                if (checked) {
                    if (!newValue.includes(this.value)) {
                        newValue.push(this.value);
                    }
                } else {
                    const index = newValue.indexOf(this.value);
                    if (index > -1) {
                        newValue.splice(index, 1);
                    }
                }

                this.$emit('update:modelValue', newValue);
                this.$emit('change', newValue);
            } else {
                this.$emit('update:modelValue', checked);
                this.$emit('change', checked);
            }
        }
    }
});
