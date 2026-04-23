import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'YiEmptyState',
    html: '/cdn/components/common/feedback/YiEmptyState/template.html',
    css: '/cdn/components/common/feedback/YiEmptyState/index.css',
    props: {
        title: {
            type: String,
            default: ''
        },
        subtitle: {
            type: String,
            default: ''
        },
        hint: {
            type: String,
            default: ''
        },
        srText: {
            type: String,
            default: ''
        },
        cardless: {
            type: Boolean,
            default: false
        },
        iconClass: {
            type: String,
            default: ''
        },
        wrapperClass: {
            type: String,
            default: ''
        },
        cardClass: {
            type: String,
            default: ''
        },
        iconWrapperClass: {
            type: String,
            default: ''
        },
        titleClass: {
            type: String,
            default: ''
        },
        subtitleClass: {
            type: String,
            default: ''
        },
        hintClass: {
            type: String,
            default: ''
        }
    }
});
