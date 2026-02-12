import { defineComponent } from '/src/utils/view/componentLoader.js';

const componentOptions = {
    name: 'AicrSidebar',
    html: '/src/views/aicr/components/aicrSidebar/index.html',
    setup() {
        return Vue.inject('viewContext') || {};
    }
};

(async function initComponent() {
    try {
        const AicrSidebar = await defineComponent(componentOptions);
        window.AicrSidebar = AicrSidebar;
        window.dispatchEvent(new CustomEvent('AicrSidebarLoaded', { detail: AicrSidebar }));
    } catch (error) {
        console.error('AicrSidebar 组件初始化失败:', error);
    }
})();

