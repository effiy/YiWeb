import { registerGlobalComponent } from '/src/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'YiErrorState',
    html: '/src/components/common/yiErrorState/index.html',
    props: {
        message: {
            type: [String, Number],
            default: ''
        },
        containerClass: {
            type: String,
            default: 'error-container'
        },
        iconClass: {
            type: String,
            default: ''
        },
        iconWrapperClass: {
            type: String,
            default: 'error-icon'
        },
        messageClass: {
            type: String,
            default: 'error-message'
        },
        showRetry: {
            type: Boolean,
            default: false
        },
        retryText: {
            type: String,
            default: '重试'
        },
        retryButtonClass: {
            type: String,
            default: 'retry-button'
        },
        retryDisabled: {
            type: Boolean,
            default: false
        }
    },
    emits: ['retry']
});
