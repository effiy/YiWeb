import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'YiIconButton',
    html: '/cdn/components/common/buttons/YiIconButton/template.html',
    css: '/cdn/components/common/buttons/YiIconButton/index.css',
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
