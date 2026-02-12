import { defineComponent } from '/src/utils/view/componentLoader.js';

const componentOptions = {
    name: 'AicrPage',
    html: '/src/views/aicr/components/aicrPage/index.html',
};

(async function initComponent() {
    try {
        const AicrPage = await defineComponent(componentOptions);
        window.AicrPage = AicrPage;
        window.dispatchEvent(new CustomEvent('AicrPageLoaded', { detail: AicrPage }));
    } catch (error) {
        console.error('AicrPage 组件初始化失败:', error);
    }
})();

