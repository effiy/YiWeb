import { registerGlobalComponent } from '/src/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'YiIconButton',
    html: '/src/components/common/yiIconButton/index.html',
    props: {
        type: {
            type: String,
            default: 'button'
        },
        className: {
            type: String,
            default: 'icon-button'
        },
        active: {
            type: Boolean,
            default: false
        },
        activeClass: {
            type: String,
            default: 'active'
        },
        disabled: {
            type: Boolean,
            default: false
        },
        title: {
            type: String,
            default: ''
        },
        ariaLabel: {
            type: String,
            default: ''
        }
    },
    emits: ['click']
});
