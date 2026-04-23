import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'AicrHeader',
    html: '/src/views/aicr/components/aicrHeader/index.html',
    setup() {
        return Vue.inject('viewContext') || {};
    }
});
