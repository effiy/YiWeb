// 增强任务详情组件
const createEnhancedTaskDetail = () => {
    return {
        name: 'EnhancedTaskDetail',
        template: `
            <div class="enhanced-task-detail">
                <div class="detail-header">
                    <h3>任务详情</h3>
                    <button @click="$emit('close')" class="close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="detail-content">
                    <div class="detail-placeholder">
                        <i class="fas fa-info-circle"></i>
                        <p>任务详情功能正在开发中...</p>
                    </div>
                </div>
            </div>
        `,
        props: {
            task: {
                type: Object,
                default: () => ({})
            }
        },
        emits: ['task-update', 'close']
    };
};

window.EnhancedTaskDetail = createEnhancedTaskDetail();
console.log('[EnhancedTaskDetail] 组件已加载');

