import { registerGlobalComponent } from '/src/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'BaseLoading',
    html: '/src/components/common/baseLoading/index.html',
    props: {
        text: {
            type: String,
            default: '正在加载...'
        },
        subtext: {
            type: String,
            default: ''
        },
        containerClass: {
            type: String,
            default: 'loading-container'
        },
        spinnerClass: {
            type: String,
            default: 'loading-spinner'
        },
        textClass: {
            type: String,
            default: 'loading-text'
        },
        subtextClass: {
            type: String,
            default: 'loading-subtext'
        }
    }
});

