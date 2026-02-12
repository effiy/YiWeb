import { defineComponent } from '/src/utils/view/componentLoader.js';

const componentOptions = {
    name: 'AicrModals',
    html: '/src/views/aicr/components/aicrModals/index.html',
    setup() {
        return Vue.inject('viewContext') || {};
    }
};

(async function initComponent() {
    try {
        const AicrModals = await defineComponent(componentOptions);
        window.AicrModals = AicrModals;
        window.dispatchEvent(new CustomEvent('AicrModalsLoaded', { detail: AicrModals }));
    } catch (error) {
        console.error('AicrModals 组件初始化失败:', error);
    }
})();

