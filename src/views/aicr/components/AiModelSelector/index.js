import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'AiModelSelector',
    html: '/src/views/aicr/components/AiModelSelector/index.html',
    css: '/src/views/aicr/components/AiModelSelector/index.css',
    props: {
        modelValue: {
            type: String,
            default: ''
        },
        label: {
            type: String,
            default: 'AI 模型'
        },
        placeholder: {
            type: String,
            default: '选择模型...'
        },
        disabled: {
            type: Boolean,
            default: false
        }
    },
    emits: ['update:modelValue', 'change'],
    setup(props, { emit }) {
        const viewContext = Vue.inject('viewContext') || {};
        const store = viewContext.store || window.aicrStore || {};
        const methods = viewContext.methods || window.aicrApp?.config?.globalProperties?.$methods || {};

        // 本地状态
        const showManualInput = Vue.ref(false);
        const localManualModel = Vue.ref('');

        // 计算属性
        const availableModels = Vue.computed(() => store.availableModels?.value || []);
        const modelsLoading = Vue.computed(() => store.modelsLoading?.value || false);
        const modelsError = Vue.computed(() => store.modelsError?.value || null);

        const modelOptions = Vue.computed(() => {
            return availableModels.value.map(model => ({
                value: model.name,
                label: model.name,
                ...model
            }));
        });

        const currentModel = Vue.computed({
            get: () => props.modelValue || '',
            set: (val) => {
                emit('update:modelValue', val);
                emit('change', val);
            }
        });

        // 方法
        const handleModelChange = (option) => {
            const modelName = option?.value || option;
            if (modelName) {
                currentModel.value = modelName;
            }
        };

        const handleManualInput = (event) => {
            localManualModel.value = event.target.value;
            currentModel.value = event.target.value;
        };

        const handleRefresh = () => {
            if (methods.refreshModelList) {
                methods.refreshModelList();
            }
        };

        const toggleInputMode = () => {
            showManualInput.value = !showManualInput.value;
            if (showManualInput.value) {
                localManualModel.value = currentModel.value;
            }
        };

        // 初始化
        Vue.onMounted(() => {
            // 如果没有模型列表且有加载方法，自动加载
            if (availableModels.value.length === 0 && methods.loadModelList) {
                methods.loadModelList();
            }
        });

        return {
            showManualInput,
            localManualModel,
            availableModels,
            modelOptions,
            modelsLoading,
            modelsError,
            currentModel,
            handleModelChange,
            handleManualInput,
            handleRefresh,
            toggleInputMode
        };
    }
});
