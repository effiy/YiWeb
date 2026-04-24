import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'YiDropdown',
    html: '/cdn/components/common/navigation/YiDropdown/template.html',
    css: '/cdn/components/common/navigation/YiDropdown/index.css',
    props: {
        placement: {
            type: String,
            default: 'bottom-start'
        },
        trigger: {
            type: String,
            default: 'click'
        },
        disabled: {
            type: Boolean,
            default: false
        },
        offset: {
            type: Number,
            default: 4
        },
        wrapperClass: {
            type: String,
            default: 'dropdown-wrapper'
        },
        triggerClass: {
            type: String,
            default: 'dropdown-trigger'
        },
        dropdownClass: {
            type: String,
            default: 'dropdown'
        }
    },
    emits: ['open', 'close'],
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
            isOpen: false,
            dropdownStyle: {}
        };
    },
    methods: {
        toggleDropdown() {
            if (this.disabled) return;

            if (this.isOpen) {
                this.closeDropdown();
            } else {
                this.openDropdown();
            }
        },
        openDropdown() {
            this.isOpen = true;
            this.$emit('open');

            this.$nextTick(() => {
                this.updatePosition();
            });
        },
        closeDropdown() {
            this.isOpen = false;
            this.$emit('close');
        },
        updatePosition() {
            if (!this.$refs.trigger || !this.$refs.dropdown) return;

            const triggerRect = this.$refs.trigger.getBoundingClientRect();
            const dropdownRect = this.$refs.dropdown.getBoundingClientRect();

            let top = 0;
            let left = 0;

            const [vertical, horizontal] = this.placement.split('-');

            // Vertical positioning
            if (vertical === 'top') {
                top = triggerRect.top - dropdownRect.height - this.offset;
            } else if (vertical === 'bottom') {
                top = triggerRect.bottom + this.offset;
            }

            // Horizontal positioning
            if (horizontal === 'start') {
                left = triggerRect.left;
            } else if (horizontal === 'end') {
                left = triggerRect.right - dropdownRect.width;
            } else {
                left = triggerRect.left + (triggerRect.width - dropdownRect.width) / 2;
            }

            // Boundary check
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            if (left + dropdownRect.width > viewportWidth) {
                left = viewportWidth - dropdownRect.width - 8;
            }
            if (left < 8) {
                left = 8;
            }

            if (top + dropdownRect.height > viewportHeight) {
                top = triggerRect.top - dropdownRect.height - this.offset;
            }
            if (top < 8) {
                top = triggerRect.bottom + this.offset;
            }

            this.dropdownStyle = {
                position: 'fixed',
                top: `${top}px`,
                left: `${left}px`,
                zIndex: 9999
            };
        }
    }
});
