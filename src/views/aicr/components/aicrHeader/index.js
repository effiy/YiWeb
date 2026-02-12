import { defineComponent } from '/src/utils/view/componentLoader.js';

const componentOptions = {
    name: 'AicrHeader',
    html: '/src/views/aicr/components/aicrHeader/index.html',
    setup() {
        return Vue.inject('viewContext') || {};
    }
};

(async function initComponent() {
    try {
        const AicrHeader = await defineComponent(componentOptions);
        window.AicrHeader = AicrHeader;
        window.dispatchEvent(new CustomEvent('AicrHeaderLoaded', { detail: AicrHeader }));
    } catch (error) {
        console.error('AicrHeader 组件初始化失败:', error);
    }
})();

