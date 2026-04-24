import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'YiRadio',
    html: '/cdn/components/common/forms/YiRadio/template.html',
    css: '/cdn/components/common/forms/YiRadio/index.css',
    props: {
        modelValue: {
            type: [String, Number, Boolean],
            default: null
        },
        value: {
            type: [String, Number, Boolean],
            required: true
        },
        name: {
            type: String,
            default: ''
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
            default: 'radio-wrapper'
        },
        inputClass: {
            type: String,
            default: 'radio-input'
        },
        radioClass: {
            type: String,
            default: 'radio'
        },
        dotClass: {
            type: String,
            default: 'radio-dot'
        },
        labelClass: {
            type: String,
            default: 'radio-label'
        },
        ariaLabel: {
            type: String,
            default: ''
        }
    },
    emits: ['update:modelValue', 'change'],
    computed: {
        isChecked() {
            return this.modelValue === this.value;
        }
    },
    methods: {
        onChange(event) {
            if (event.target.checked) {
                this.$emit('update:modelValue', this.value);
                this.$emit('change', this.value);
            }
        }
    }
});
