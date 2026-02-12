import { registerGlobalComponent } from '/src/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'BaseModal',
    html: '/src/components/common/baseModal/index.html',
    props: {
        visible: {
            type: Boolean,
            default: false
        },
        wrapperClass: {
            type: String,
            default: ''
        },
        maskClass: {
            type: String,
            default: ''
        },
        bodyClass: {
            type: String,
            default: ''
        },
        ariaLabel: {
            type: String,
            default: ''
        },
        maskClosable: {
            type: Boolean,
            default: true
        },
        escClosable: {
            type: Boolean,
            default: true
        },
        bodyTabindex: {
            type: [Number, String],
            default: null
        }
    },
    emits: ['close'],
    methods: {
        onMaskClick() {
            if (!this.maskClosable) return;
            this.$emit('close');
        },
        onEscKeydown() {
            if (!this.escClosable) return;
            this.$emit('close');
        }
    }
});

