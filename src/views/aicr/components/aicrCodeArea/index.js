import { defineComponent } from '/src/utils/view/componentLoader.js';

const componentOptions = {
    name: 'AicrCodeArea',
    html: '/src/views/aicr/components/aicrCodeArea/index.html',
    setup() {
        return Vue.inject('viewContext') || {};
    }
};

(async function initComponent() {
    try {
        const AicrCodeArea = await defineComponent(componentOptions);
        window.AicrCodeArea = AicrCodeArea;
        window.dispatchEvent(new CustomEvent('AicrCodeAreaLoaded', { detail: AicrCodeArea }));
    } catch (error) {
        console.error('AicrCodeArea 组件初始化失败:', error);
    }
})();

