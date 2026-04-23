import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'YiModal',
    html: '/cdn/components/common/modals/YiModal/template.html',
    css: '/cdn/components/common/modals/YiModal/index.css',
    props: {
        visible: {
            type: Boolean,
            default: false
        },
        title: {
            type: String,
            default: ''
        },
        size: {
            type: String,
            default: 'medium'
        },
        showHeader: {
            type: Boolean,
            default: true
        },
        showFooter: {
            type: Boolean,
            default: false
        },
        showClose: {
            type: Boolean,
            default: true
        },
        maskClosable: {
            type: Boolean,
            default: true
        },
        escClosable: {
            type: Boolean,
            default: true
        },
        wrapperClass: {
            type: String,
            default: 'modal-wrapper'
        },
        maskClass: {
            type: String,
            default: 'modal-mask'
        },
        bodyClass: {
            type: String,
            default: 'modal-body'
        },
        headerClass: {
            type: String,
            default: 'modal-header'
        },
        titleClass: {
            type: String,
            default: 'modal-title'
        },
        closeClass: {
            type: String,
            default: 'modal-close'
        },
        contentClass: {
            type: String,
            default: 'modal-content'
        },
        footerClass: {
            type: String,
            default: 'modal-footer'
        },
        ariaLabel: {
            type: String,
            default: ''
        },
        bodyTabindex: {
            type: [Number, String],
            default: 0
        }
    },
    emits: ['close', 'open'],
    computed: {
        computedBodyClass() {
            const classes = [this.bodyClass];

            if (this.size) {
                classes.push(`modal-${this.size}`);
            }

            return classes.join(' ');
        }
    },
    watch: {
        visible(newVal) {
            if (newVal) {
                this.onOpen();
            }
        }
    },
    methods: {
        onMaskClick() {
            if (!this.maskClosable) return;
            this.$emit('close');
        },
        onEscKeydown() {
            if (!this.escClosable) return;
            this.$emit('close');
        },
        onClose() {
            this.$emit('close');
        },
        onOpen() {
            this.$emit('open');

            // 锁定body滚动
            if (typeof document !== 'undefined') {
                document.body.style.overflow = 'hidden';
            }
        }
    },
    beforeUnmount() {
        // 恢复body滚动
        if (typeof document !== 'undefined') {
            document.body.style.overflow = '';
        }
    }
});
