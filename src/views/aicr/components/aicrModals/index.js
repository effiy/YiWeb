import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'AicrModals',
    html: '/src/views/aicr/components/aicrModals/index.html',
    setup() {
        return Vue.inject('viewContext') || {};
    }
});
