import { registerGlobalComponent } from '/src/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'AicrSidebar',
    html: '/src/views/aicr/components/aicrSidebar/index.html',
    setup() {
        return Vue.inject('viewContext') || {};
    }
});
