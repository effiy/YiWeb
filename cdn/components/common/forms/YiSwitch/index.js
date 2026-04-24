import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'YiSwitch',
    html: '/cdn/components/common/forms/YiSwitch/template.html',
    css: '/cdn/components/common/forms/YiSwitch/index.css',
    props: {
        modelValue: {
            type: Boolean,
            default: false
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
            default: 'switch-wrapper'
        },
        inputClass: {
            type: String,
            default: 'switch-input'
        },
        switchClass: {
            type: String,
            default: 'switch'
        },
        thumbClass: {
            type: String,
            default: 'switch-thumb'
        },
        labelClass: {
            type: String,
            default: 'switch-label'
        },
        ariaLabel: {
            type: String,
            default: ''
        }
    },
    emits: ['update:modelValue', 'change'],
    methods: {
        onChange(event) {
            const checked = event.target.checked;
            this.$emit('update:modelValue', checked);
            this.$emit('change', checked);
        }
    }
});
