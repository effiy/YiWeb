import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

let selectIdCounter = 0;

registerGlobalComponent({
    name: 'YiSelect',
    html: '/cdn/components/common/forms/YiSelect/template.html',
    css: '/cdn/components/common/forms/YiSelect/index.css',
    props: {
        modelValue: {
            type: [String, Number, Object],
            default: null
        },
        options: {
            type: Array,
            default: () => []
        },
        label: {
            type: String,
            default: ''
        },
        placeholder: {
            type: String,
            default: '请选择'
        },
        disabled: {
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
        searchable: {
            type: Boolean,
            default: false
        },
        searchPlaceholder: {
            type: String,
            default: '搜索...'
        },
        emptyText: {
            type: String,
            default: '无数据'
        },
        valueKey: {
            type: String,
            default: 'value'
        },
        labelKey: {
            type: String,
            default: 'label'
        },
        size: {
            type: String,
            default: ''
        },
        wrapperClass: {
            type: String,
            default: 'select-wrapper'
        },
        labelClass: {
            type: String,
            default: 'select-label'
        },
        dropdownClass: {
            type: String,
            default: 'select-dropdown'
        },
        optionsClass: {
            type: String,
            default: 'select-options'
        },
        valueClass: {
            type: String,
            default: 'select-value'
        },
        arrowClass: {
            type: String,
            default: 'select-arrow'
        },
        messageClass: {
            type: String,
            default: 'select-message'
        },
        ariaLabel: {
            type: String,
            default: ''
        }
    },
    emits: ['update:modelValue', 'change'],
    directives: {
        'click-outside': {
            mounted(el, binding) {
                el._clickOutside = (event) => {
                    if (!el.contains(event.target)) {
                        binding.value();
                    }
                };
                document.addEventListener('click', el._clickOutside);
            },
            unmounted(el) {
                document.removeEventListener('click', el._clickOutside);
            }
        }
    },
    data() {
        return {
            selectId: `yi-select-${++selectIdCounter}`,
            isOpen: false,
            searchQuery: ''
        };
    },
    computed: {
        selectClass() {
            const classes = ['select'];

            if (this.size) {
                classes.push(`select-${this.size}`);
            }

            if (this.error) {
                classes.push('select-error-state');
            }

            if (this.disabled) {
                classes.push('select-disabled');
            }

            if (this.isOpen) {
                classes.push('select-open');
            }

            return classes.join(' ');
        },
        selectedOption() {
            return this.options.find(opt => opt[this.valueKey] === this.modelValue);
        },
        filteredOptions() {
            if (!this.searchable || !this.searchQuery) {
                return this.options;
            }

            const query = this.searchQuery.toLowerCase();
            return this.options.filter(opt =>
                String(opt[this.labelKey]).toLowerCase().includes(query)
            );
        }
    },
    methods: {
        toggleDropdown() {
            if (this.disabled) return;
            this.isOpen = !this.isOpen;

            if (this.isOpen && this.searchable) {
                this.$nextTick(() => {
                    this.$refs.searchInput?.focus();
                });
            }
        },
        closeDropdown() {
            this.isOpen = false;
            this.searchQuery = '';
        },
        selectOption(option) {
            this.$emit('update:modelValue', option[this.valueKey]);
            this.$emit('change', option);
            this.closeDropdown();
        },
        isSelected(option) {
            return option[this.valueKey] === this.modelValue;
        },
        getOptionClass(option) {
            const classes = ['select-option'];

            if (this.isSelected(option)) {
                classes.push('select-option-selected');
            }

            return classes.join(' ');
        },
        onKeydown(event) {
            if (this.disabled) return;

            switch (event.key) {
                case 'Enter':
                case ' ':
                    event.preventDefault();
                    this.toggleDropdown();
                    break;
                case 'Escape':
                    this.closeDropdown();
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    if (!this.isOpen) {
                        this.toggleDropdown();
                    }
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    if (this.isOpen) {
                        this.closeDropdown();
                    }
                    break;
            }
        }
    }
});
