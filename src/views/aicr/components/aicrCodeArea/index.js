import { registerGlobalComponent } from '/src/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'AicrCodeArea',
    html: '/src/views/aicr/components/aicrCodeArea/index.html',
    setup() {
        return Vue.inject('viewContext') || {};
    }
});
