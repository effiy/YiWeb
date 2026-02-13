import { registerGlobalComponent } from '/src/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'AicrHeader',
    html: '/src/views/aicr/components/aicrHeader/index.html',
    setup() {
        return Vue.inject('viewContext') || {};
    }
});
