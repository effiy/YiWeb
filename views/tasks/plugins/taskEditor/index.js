// 任务编辑组件
const TaskEditor = {
    name: 'TaskEditor',
    // 确保组件可以被Vue 3正确识别
    __vccOpts: true,
    // 添加Vue 3兼容性标记
    compatConfig: {
        MODE: 3
    },
    template: `
        <div class="task-editor-overlay" v-if="visible" @click="handleOverlayClick">
            <div class="task-editor-modal" @click.stop>
                <div class="editor-header">
                    <h3>{{ isEditing ? '编辑任务' : '创建任务' }}</h3>
                    <button @click="closeEditor" class="close-btn" title="关闭">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="editor-content">
                    <form @submit.prevent="handleSubmit" class="task-form">
                        <!-- 基本信息 -->
                        <div class="form-section">
                            <h4>基本信息</h4>
                            
                            <div class="form-group">
                                <label for="taskTitle">任务标题 *</label>
                                <input 
                                    id="taskTitle"
                                    type="text" 
                                    required 
                                    placeholder="请输入任务标题"
                                    class="form-input"
                                    :value="formData.title"
                                    @input="handleTitleInput">
                            </div>
                            
                            <div class="form-group">
                                <label for="taskDescription">任务描述</label>
                                <textarea 
                                    id="taskDescription"
                                    v-model="formData.description" 
                                    placeholder="请输入任务描述"
                                    class="form-textarea"
                                    rows="3"></textarea>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="taskPriority">优先级</label>
                                    <select id="taskPriority" v-model="formData.priority" class="form-select">
                                        <option value="none">无</option>
                                        <option value="low">低</option>
                                        <option value="medium">中</option>
                                        <option value="high">高</option>
                                        <option value="critical">紧急</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="taskStatus">状态</label>
                                    <select id="taskStatus" v-model="formData.status" class="form-select">
                                        <option value="backlog">待办</option>
                                        <option value="todo">计划中</option>
                                        <option value="in_progress">进行中</option>
                                        <option value="in_review">待审核</option>
                                        <option value="testing">测试中</option>
                                        <option value="completed">已完成</option>
                                        <option value="cancelled">已取消</option>
                                        <option value="on_hold">暂停</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="taskType">任务类型</label>
                                    <select id="taskType" v-model="formData.type" class="form-select">
                                        <option value="task">任务</option>
                                        <option value="bug">缺陷</option>
                                        <option value="feature">功能</option>
                                        <option value="improvement">改进</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="taskDueDate">截止日期</label>
                                    <input 
                                        id="taskDueDate"
                                        v-model="formData.dueDate" 
                                        type="date" 
                                        class="form-input">
                                </div>
                            </div>
                        </div>
                        
                        <!-- 输入输出信息 -->
                        <div class="form-section">
                            <h4>输入输出</h4>
                            
                            <div class="form-group">
                                <label for="taskInput">输入要求</label>
                                <textarea 
                                    id="taskInput"
                                    v-model="formData.input" 
                                    placeholder="请输入输入要求"
                                    class="form-textarea"
                                    rows="2"></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="taskOutput">输出要求</label>
                                <textarea 
                                    id="taskOutput"
                                    v-model="formData.output" 
                                    placeholder="请输入输出要求"
                                    class="form-textarea"
                                    rows="2"></textarea>
                            </div>
                        </div>
                        
                        <!-- 执行步骤 -->
                        <div class="form-section">
                            <h4>执行步骤</h4>
                            <div class="steps-container">
                                <div v-for="(step, index) in formData.steps" :key="index" class="step-item">
                                    <div class="step-header">
                                        <span class="step-number">步骤 {{ index + 1 }}</span>
                                        <button 
                                            type="button" 
                                            @click="removeStep(index)" 
                                            class="remove-step-btn"
                                            title="删除步骤">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                    <div class="step-content">
                                        <div class="step-input">
                                            <input 
                                                type="text" 
                                                v-model="step.text" 
                                                :placeholder="'请输入步骤 ' + (index + 1) + ' 的内容'"
                                                class="form-input step-text-input">
                                        </div>
                                        <label class="step-checkbox-label">
                                            <input 
                                                type="checkbox" 
                                                v-model="step.completed" 
                                                class="step-checkbox">
                                            <span>已完成</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <button 
                                    type="button" 
                                    @click="addStep" 
                                    class="add-step-btn">
                                    <i class="fas fa-plus"></i>
                                    <span>添加步骤</span>
                                </button>
                            </div>
                        </div>
                        
                        <!-- 操作按钮 -->
                        <div class="form-actions">
                            <button type="button" @click="closeEditor" class="btn btn-secondary">
                                取消
                            </button>
                            <button type="submit" class="btn btn-primary" :disabled="submitting">
                                <i v-if="submitting" class="fas fa-spinner fa-spin"></i>
                                {{ isEditing ? '保存修改' : '创建任务' }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `,
    props: {
        visible: {
            type: Boolean,
            default: false
        },
        task: {
            type: Object,
            default: () => ({})
        }
    },
    emits: ['close', 'save', 'refresh-data'],
    data() {
        return {
            submitting: false,
            formData: {
                title: '',
                description: '',
                priority: 'none',
                status: 'todo',
                type: 'task',
                dueDate: '',
                input: '',
                output: '',
                steps: [
                    { text: '', completed: false },
                    { text: '', completed: false }
                ]
            }
        };
    },
    mounted() {
        this.$nextTick(() => {
            this.initFormData();
        });
    },
    computed: {
        isEditing() {
            return this.task && (this.task.key || this.task.id);
        }
    },
    watch: {
        visible(newVal) {
            if (newVal) {
                this.$nextTick(() => {
                    this.initFormData();
                });
            }
        }
    },
    methods: {
        initFormData() {
            if (this.task && (this.task.key || this.task.id)) {
                // 编辑现有任务
                const taskData = this.task;
                this.formData = {
                    title: taskData.title || '',
                    description: taskData.description || '',
                    priority: taskData.priority || 'none',
                    status: taskData.status || 'todo',
                    type: taskData.type || 'task',
                    dueDate: taskData.dueDate || '',
                    input: taskData.input || '',
                    output: taskData.output || '',
                    steps: this.parseSteps(taskData.steps)
                };
                
                console.log('[TaskEditor] 编辑任务，步骤数据:', {
                    original: taskData.steps,
                    parsed: this.formData.steps
                });
            } else {
                // 创建新任务
                this.formData = {
                    title: '',
                    description: '',
                    priority: 'none',
                    status: 'todo',
                    type: 'task',
                    dueDate: '',
                    input: '',
                    output: '',
                    steps: [
                        { text: '', completed: false },
                        { text: '', completed: false }
                    ]
                };
                
                console.log('[TaskEditor] 创建新任务，初始化默认步骤');
            }
        },
        
        handleTitleInput(event) {
            this.formData.title = event.target.value;
        },
        
        addStep() {
            this.formData.steps.push({
                text: '',
                completed: false
            });
        },
        
        removeStep(index) {
            this.formData.steps.splice(index, 1);
        },
        
        parseSteps(steps) {
            // 将不同格式的步骤数据转换为统一格式
            if (Array.isArray(steps)) {
                return steps.map((step, index) => {
                    if (typeof step === 'string') {
                        return { text: step, completed: false };
                    }
                    return { text: step.text || step, completed: step.completed || false };
                });
            } else if (typeof steps === 'object' && steps !== null) {
                // 处理mock数据格式：{ step1: { text: '...', completed: false }, step2: {...} }
                const stepEntries = Object.entries(steps);
                return stepEntries.map(([key, step]) => {
                    if (typeof step === 'string') {
                        return { text: step, completed: false };
                    }
                    return { text: step.text || step, completed: step.completed || false };
                });
            }
            return [];
        },
        
        // 将步骤数组转换为mock数据格式
        convertStepsToMockFormat(steps) {
            const mockSteps = {};
            steps.forEach((step, index) => {
                if (step.text.trim()) {
                    mockSteps[`step${index + 1}`] = {
                        text: step.text.trim(),
                        completed: step.completed || false
                    };
                }
            });
            return mockSteps;
        },
        
        async handleSubmit() {
            try {
                this.submitting = true;
                
                if (!this.formData.title.trim()) {
                    if (window.showError) {
                        window.showError('请输入任务标题');
                    } else {
                        alert('请输入任务标题');
                    }
                    return;
                }
                
                const saveData = { ...this.formData };
                
                // 过滤掉空的步骤并转换为mock数据格式
                const validSteps = this.formData.steps.filter(step => step.text.trim() !== '');
                saveData.steps = this.convertStepsToMockFormat(validSteps);
                
                if (this.isEditing) {
                    // 编辑现有任务
                    saveData.key = this.task.key || this.task.id;
                    saveData.id = this.task.id || this.task.key;
                    saveData.updated = new Date().toISOString();
                    
                    // 调用API更新任务
                    await this.updateTaskViaAPI(saveData);
                } else {
                    // 创建新任务
                    saveData.id = Date.now().toString();
                    saveData.key = `task_${Date.now()}`;
                    saveData.created = new Date().toISOString();
                    saveData.updated = new Date().toISOString();
                    
                    // 调用API创建任务
                    await this.createTaskViaAPI(saveData);
                }
                
                // 通知父组件保存成功
                this.$emit('save', saveData);
                this.closeEditor();
                
            } catch (error) {
                console.error('[TaskEditor] 保存任务失败:', error);
                if (window.showError) {
                    window.showError(`保存失败: ${error.message || '请重试'}`);
                } else {
                    alert(`保存失败: ${error.message || '请重试'}`);
                }
            } finally {
                this.submitting = false;
            }
        },
        
        /**
         * 通过API创建任务
         */
        async createTaskViaAPI(taskData) {
            try {
                console.log('[TaskEditor] 通过API创建任务:', taskData.title);
                
                // 构建API URL
                const urlParams = new URLSearchParams(window.location.search);
                let apiUrl = `${window.API_URL}/mongodb/?cname=tasks`;
                const featureName = urlParams.get('featureName');
                const cardTitle = urlParams.get('cardTitle');
                
                if (featureName) {
                    apiUrl += `&featureName=${encodeURIComponent(featureName)}`;
                }
                if (cardTitle) {
                    apiUrl += `&cardTitle=${encodeURIComponent(cardTitle)}`;
                }
                
                console.log('[TaskEditor] 创建任务API URL:', apiUrl);
                
                // 调用API创建任务
                const response = await window.postData(apiUrl, taskData);
                
                if (response && response.success !== false) {
                    console.log('[TaskEditor] 任务创建成功');
                    if (window.showSuccess) {
                        window.showSuccess(`任务"${taskData.title}"创建成功`);
                    }
                    return response;
                } else {
                    throw new Error('API创建失败：' + (response?.message || '未知错误'));
                }
            } catch (error) {
                console.error('[TaskEditor] API创建任务失败:', error);
                throw error;
            }
        },
        
        /**
         * 通过API更新任务
         */
        async updateTaskViaAPI(taskData) {
            try {
                console.log('[TaskEditor] 通过API更新任务:', taskData.title);
                
                // 构建API URL
                const urlParams = new URLSearchParams(window.location.search);
                let apiUrl = `${window.API_URL}/mongodb/?cname=tasks&key=${taskData.key}`;
                const featureName = urlParams.get('featureName');
                const cardTitle = urlParams.get('cardTitle');
                
                if (featureName) {
                    apiUrl += `&featureName=${encodeURIComponent(featureName)}`;
                }
                if (cardTitle) {
                    apiUrl += `&cardTitle=${encodeURIComponent(cardTitle)}`;
                }
                
                console.log('[TaskEditor] 更新任务API URL:', apiUrl);
                
                // 调用API更新任务
                const response = await window.updateData(apiUrl, taskData);
                
                if (response && response.success !== false) {
                    console.log('[TaskEditor] 任务更新成功');
                    if (window.showSuccess) {
                        window.showSuccess(`任务"${taskData.title}"更新成功`);
                    }
                    return response;
                } else {
                    throw new Error('API更新失败：' + (response?.message || '未知错误'));
                }
            } catch (error) {
                console.error('[TaskEditor] API更新任务失败:', error);
                throw error;
            }
        },
        
        closeEditor() {
            this.$emit('close');
        },
        
        handleOverlayClick() {
            this.closeEditor();
        }
    }
};

// 注册组件到全局
window.TaskEditor = TaskEditor;

// 添加调试信息
console.log('[TaskEditor] 组件已注册到全局:', {
    name: TaskEditor.name,
    hasTemplate: !!TaskEditor.template,
    hasProps: !!TaskEditor.props,
    hasMethods: !!TaskEditor.methods
});




