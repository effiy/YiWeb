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
                        <div class="form-section input-output-section">
                            <h4>
                                <i class="fas fa-exchange-alt"></i>
                                输入输出
                            </h4>
                            
                            <div class="input-output-container">
                                <div class="input-output-item input-item">
                                    <div class="input-output-header">
                                        <label for="taskInput" class="input-output-label">
                                            <i class="fas fa-arrow-down"></i>
                                            输入要求
                                        </label>
                                        <div class="char-counter" v-if="formData.input">
                                            {{ formData.input.length }}/500
                                        </div>
                                    </div>
                                    <div class="input-output-wrapper">
                                        <textarea 
                                            id="taskInput"
                                            v-model="formData.input" 
                                            placeholder="请描述任务的输入要求，每行一个要求...&#10;例如：&#10;- 用户ID&#10;- 数据格式&#10;- 参数说明"
                                            class="form-textarea input-output-textarea"
                                            rows="3"
                                            maxlength="500"
                                            @focus="handleInputFocus"
                                            @blur="handleInputBlur">
                                        </textarea>
                                        <div class="input-output-icon">
                                            <i class="fas fa-download"></i>
                                        </div>
                                    </div>
                                    <div class="input-output-hint" v-if="!formData.input">
                                        <i class="fas fa-lightbulb"></i>
                                        提示：每行一个输入要求，系统会自动转换为数组格式存储
                                    </div>
                                </div>
                                
                                <div class="input-output-arrow">
                                    <i class="fas fa-arrow-right"></i>
                                </div>
                                
                                <div class="input-output-item output-item">
                                    <div class="input-output-header">
                                        <label for="taskOutput" class="input-output-label">
                                            <i class="fas fa-arrow-up"></i>
                                            输出要求
                                        </label>
                                        <div class="char-counter" v-if="formData.output">
                                            {{ formData.output.length }}/500
                                        </div>
                                    </div>
                                    <div class="input-output-wrapper">
                                        <textarea 
                                            id="taskOutput"
                                            v-model="formData.output" 
                                            placeholder="请描述任务的输出要求，每行一个要求...&#10;例如：&#10;- 返回数据格式&#10;- 状态码&#10;- 错误处理"
                                            class="form-textarea input-output-textarea"
                                            rows="3"
                                            maxlength="500"
                                            @focus="handleOutputFocus"
                                            @blur="handleOutputBlur">
                                        </textarea>
                                        <div class="input-output-icon">
                                            <i class="fas fa-upload"></i>
                                        </div>
                                    </div>
                                    <div class="input-output-hint" v-if="!formData.output">
                                        <i class="fas fa-lightbulb"></i>
                                        提示：每行一个输出要求，系统会自动转换为数组格式存储
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 快速模板 -->
                            <div class="input-output-templates" v-if="showTemplates">
                                <div class="templates-header">
                                    <span>快速模板</span>
                                    <button type="button" @click="showTemplates = false" class="close-templates-btn">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                                <div class="templates-grid">
                                    <button type="button" @click="applyTemplate('api')" class="template-btn">
                                        <i class="fas fa-code"></i>
                                        API接口
                                    </button>
                                    <button type="button" @click="applyTemplate('ui')" class="template-btn">
                                        <i class="fas fa-palette"></i>
                                        UI组件
                                    </button>
                                    <button type="button" @click="applyTemplate('data')" class="template-btn">
                                        <i class="fas fa-database"></i>
                                        数据处理
                                    </button>
                                    <button type="button" @click="applyTemplate('test')" class="template-btn">
                                        <i class="fas fa-vial"></i>
                                        测试用例
                                    </button>
                                </div>
                            </div>
                            
                            <div class="input-output-actions">
                                <button type="button" @click="showTemplates = !showTemplates" class="template-toggle-btn">
                                    <i class="fas fa-magic"></i>
                                    {{ showTemplates ? '隐藏模板' : '快速模板' }}
                                </button>
                                <button type="button" @click="clearInputOutput" class="clear-btn" v-if="formData.input || formData.output">
                                    <i class="fas fa-trash"></i>
                                    清空
                                </button>
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
            showTemplates: false,
            inputFocused: false,
            outputFocused: false,
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
                // 编辑现有任务 - 先进行数据格式检测和转换
                const taskData = this.detectAndConvertDataFormat(this.task);
                // 处理input/output数组格式转换为字符串用于编辑
                const processedTaskData = this.processInputOutputArrayToString(taskData);
                this.formData = {
                    title: processedTaskData.title || '',
                    description: processedTaskData.description || '',
                    priority: processedTaskData.priority || 'none',
                    status: processedTaskData.status || 'todo',
                    type: processedTaskData.type || 'task',
                    dueDate: processedTaskData.dueDate || '',
                    input: processedTaskData.input || '',
                    output: processedTaskData.output || '',
                    steps: this.parseSteps(processedTaskData.steps)
                };
                
                console.log('[TaskEditor] 编辑任务，数据转换:', {
                    original: this.task,
                    converted: taskData,
                    processed: processedTaskData,
                    parsedSteps: this.formData.steps
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
            if (!steps) {
                return [{ text: '', completed: false }, { text: '', completed: false }];
            }
            
            if (Array.isArray(steps)) {
                // 处理数组格式：[{ text: '...', completed: false }, '步骤2', ...]
                return steps.map((step, index) => {
                    if (typeof step === 'string') {
                        return { text: step, completed: false };
                    } else if (typeof step === 'object' && step !== null) {
                        return { 
                            text: step.text || step.content || step.description || '', 
                            completed: Boolean(step.completed || step.done || step.finished)
                        };
                    }
                    return { text: String(step), completed: false };
                });
            } else if (typeof steps === 'object' && steps !== null) {
                // 处理对象格式：{ step1: { text: '...', completed: false }, step2: '...', ... }
                const stepEntries = Object.entries(steps);
                return stepEntries.map(([key, step]) => {
                    if (typeof step === 'string') {
                        return { text: step, completed: false };
                    } else if (typeof step === 'object' && step !== null) {
                        return { 
                            text: step.text || step.content || step.description || '', 
                            completed: Boolean(step.completed || step.done || step.finished)
                        };
                    }
                    return { text: String(step), completed: false };
                });
            }
            
            // 如果格式不识别，返回默认格式
            console.warn('[parseSteps] 无法识别的步骤格式:', steps);
            return [{ text: '', completed: false }, { text: '', completed: false }];
        },
        
        // 将步骤数组转换为mock数据格式
        convertStepsToMockFormat(steps) {
            if (!Array.isArray(steps)) {
                console.warn('[convertStepsToMockFormat] 输入不是数组:', steps);
                return {};
            }
            
            const mockSteps = {};
            steps.forEach((step, index) => {
                if (step && step.text && step.text.trim() !== '') {
                    mockSteps[`step${index + 1}`] = {
                        text: step.text.trim(),
                        completed: Boolean(step.completed || step.done || step.finished)
                    };
                }
            });
            return mockSteps;
        },
        
        // 检测数据格式并自动转换
        detectAndConvertDataFormat(data) {
            if (!data || typeof data !== 'object') {
                return data;
            }
            
            const converted = { ...data };
            
            // 处理steps字段
            if (converted.steps) {
                if (Array.isArray(converted.steps)) {
                    // 数组格式保持不变，但确保每个元素都有正确的结构
                    converted.steps = converted.steps.map(step => {
                        if (typeof step === 'string') {
                            return { text: step, completed: false };
                        } else if (typeof step === 'object' && step !== null) {
                            return {
                                text: step.text || step.content || step.description || '',
                                completed: Boolean(step.completed || step.done || step.finished)
                            };
                        }
                        return { text: String(step), completed: false };
                    });
                } else if (typeof converted.steps === 'object') {
                    // 对象格式转换为数组格式
                    const stepEntries = Object.entries(converted.steps);
                    converted.steps = stepEntries.map(([key, step]) => {
                        if (typeof step === 'string') {
                            return { text: step, completed: false };
                        } else if (typeof step === 'object' && step !== null) {
                            return {
                                text: step.text || step.content || step.description || '',
                                completed: Boolean(step.completed || step.done || step.finished)
                            };
                        }
                        return { text: String(step), completed: false };
                    });
                }
            }
            
            // 处理labels字段
            if (converted.labels) {
                if (Array.isArray(converted.labels)) {
                    // 确保标签数组格式正确
                    converted.labels = converted.labels.map((label, index) => {
                        if (typeof label === 'string') {
                            return { 
                                id: `label-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`, 
                                name: label, 
                                color: this.getRandomLabelColor() 
                            };
                        } else if (typeof label === 'object' && label !== null) {
                            return {
                                id: label.id || `label-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
                                name: label.name || label.label || label.text || label.title || '',
                                color: label.color || this.getRandomLabelColor()
                            };
                        }
                        return { 
                            id: `label-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`, 
                            name: String(label), 
                            color: this.getRandomLabelColor() 
                        };
                    });
                } else if (typeof converted.labels === 'object') {
                    // 对象格式转换为数组格式
                    const labelEntries = Object.entries(converted.labels);
                    converted.labels = labelEntries.map(([key, label], index) => {
                        if (typeof label === 'string') {
                            return { 
                                id: `label-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`, 
                                name: label, 
                                color: this.getRandomLabelColor() 
                            };
                        } else if (typeof label === 'object' && label !== null) {
                            return {
                                id: label.id || `label-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
                                name: label.name || label.label || label.text || label.title || '',
                                color: label.color || this.getRandomLabelColor()
                            };
                        }
                        return { 
                            id: `label-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`, 
                            name: String(label), 
                            color: this.getRandomLabelColor() 
                        };
                    });
                }
            }
            
            return converted;
        },
        
        // 获取随机标签颜色
        getRandomLabelColor() {
            const colors = [
                '#2196f3', '#f44336', '#ff9800', '#4caf50', '#9c27b0',
                '#00bcd4', '#e91e63', '#673ab7', '#795548', '#607d8b',
                '#ff5722', '#3f51b5', '#009688', '#ffc107', '#8bc34a'
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        },
        
        // 处理input/output数组格式转换为字符串
        processInputOutputArrayToString(data) {
            if (!data || typeof data !== 'object') {
                return data;
            }
            
            const processed = { ...data };
            
            // 处理input字段
            if (processed.input) {
                if (Array.isArray(processed.input)) {
                    // 数组格式转换为字符串
                    processed.input = processed.input.join('\n');
                } else if (typeof processed.input === 'object') {
                    // 对象格式转换为字符串
                    processed.input = Object.values(processed.input).join('\n');
                }
            }
            
            // 处理output字段
            if (processed.output) {
                if (Array.isArray(processed.output)) {
                    // 数组格式转换为字符串
                    processed.output = processed.output.join('\n');
                } else if (typeof processed.output === 'object') {
                    // 对象格式转换为字符串
                    processed.output = Object.values(processed.output).join('\n');
                }
            }
            
            return processed;
        },
        
        // 处理input/output字符串转换为数组格式
        processInputOutputStringToArray(data) {
            if (!data || typeof data !== 'object') {
                return data;
            }
            
            const processed = { ...data };
            
            // 处理input字段 - 字符串转数组
            if (processed.input && typeof processed.input === 'string') {
                if (processed.input.trim()) {
                    processed.input = processed.input.split('\n').filter(line => line.trim());
                } else {
                    processed.input = [];
                }
            }
            
            // 处理output字段 - 字符串转数组
            if (processed.output && typeof processed.output === 'string') {
                if (processed.output.trim()) {
                    processed.output = processed.output.split('\n').filter(line => line.trim());
                } else {
                    processed.output = [];
                }
            }
            
            return processed;
        },
        
        // 验证数据格式
        validateDataFormat(data) {
            const errors = [];
            
            // 验证基本字段
            if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
                errors.push('任务标题不能为空');
            }
            
            // 验证steps字段
            if (data.steps) {
                if (Array.isArray(data.steps)) {
                    data.steps.forEach((step, index) => {
                        if (typeof step !== 'object' || !step.text) {
                            errors.push(`步骤${index + 1}格式不正确`);
                        }
                    });
                } else if (typeof data.steps !== 'object') {
                    errors.push('步骤数据格式不正确');
                }
            }
            
            // 验证labels字段
            if (data.labels) {
                if (Array.isArray(data.labels)) {
                    data.labels.forEach((label, index) => {
                        if (typeof label !== 'object' || !label.name) {
                            errors.push(`标签${index + 1}格式不正确`);
                        }
                    });
                } else if (typeof data.labels !== 'object') {
                    errors.push('标签数据格式不正确');
                }
            }
            
            return {
                isValid: errors.length === 0,
                errors: errors
            };
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
                
                // 确保保存的数据格式正确
                const finalSaveData = this.detectAndConvertDataFormat(saveData);
                // 处理input/output字符串转换为数组格式用于保存
                const processedSaveData = this.processInputOutputStringToArray(finalSaveData);
                
                // 验证数据格式
                const validation = this.validateDataFormat(processedSaveData);
                if (!validation.isValid) {
                    console.error('[TaskEditor] 数据验证失败:', validation.errors);
                    if (window.showError) {
                        window.showError(`数据格式错误: ${validation.errors.join(', ')}`);
                    } else {
                        alert(`数据格式错误: ${validation.errors.join(', ')}`);
                    }
                    return;
                }
                
                if (this.isEditing) {
                    // 编辑现有任务
                    processedSaveData.key = this.task.key || this.task.id;
                    processedSaveData.id = this.task.id || this.task.key;
                    processedSaveData.updated = new Date().toISOString();
                    
                    // 调用API更新任务
                    await this.updateTaskViaAPI(processedSaveData);
                } else {
                    // 创建新任务
                    processedSaveData.id = Date.now().toString();
                    processedSaveData.key = `task_${Date.now()}`;
                    processedSaveData.created = new Date().toISOString();
                    processedSaveData.updated = new Date().toISOString();
                    
                    // 调用API创建任务
                    await this.createTaskViaAPI(processedSaveData);
                }
                
                // 通知父组件保存成功
                this.$emit('save', processedSaveData);
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
        
        // 输入输出交互方法
        handleInputFocus() {
            this.inputFocused = true;
        },
        
        handleInputBlur() {
            this.inputFocused = false;
        },
        
        handleOutputFocus() {
            this.outputFocused = true;
        },
        
        handleOutputBlur() {
            this.outputFocused = false;
        },
        
        // 清空输入输出
        clearInputOutput() {
            this.formData.input = '';
            this.formData.output = '';
        },
        
        // 应用模板
        applyTemplate(templateType) {
            const templates = {
                api: {
                    input: '请求参数：\n- method: HTTP方法 (GET/POST/PUT/DELETE)\n- url: 接口地址\n- headers: 请求头\n- body: 请求体数据',
                    output: '响应数据：\n- status: HTTP状态码\n- data: 响应数据\n- message: 响应消息\n- timestamp: 时间戳'
                },
                ui: {
                    input: '设计要求：\n- 组件类型：按钮/表单/列表等\n- 设计风格：Material Design/Flat Design等\n- 响应式：支持移动端/桌面端\n- 主题：深色/浅色模式',
                    output: '交付物：\n- 设计稿：Figma/Sketch文件\n- 组件代码：Vue/React组件\n- 样式文件：CSS/SCSS\n- 文档：使用说明和API文档'
                },
                data: {
                    input: '数据源：\n- 数据格式：JSON/CSV/XML等\n- 数据量：记录数量\n- 字段结构：字段名称和类型\n- 数据质量：完整性、准确性要求',
                    output: '处理结果：\n- 清洗后数据：格式统一的数据\n- 统计报告：数据概览和异常\n- 可视化图表：图表类型和样式\n- 导出文件：处理后的数据文件'
                },
                test: {
                    input: '测试场景：\n- 功能测试：核心功能验证\n- 边界测试：极限值测试\n- 异常测试：错误处理测试\n- 性能测试：响应时间和并发',
                    output: '测试结果：\n- 测试报告：通过率和失败用例\n- 缺陷列表：发现的问题和优先级\n- 性能指标：响应时间和资源使用\n- 建议改进：优化建议和最佳实践'
                }
            };
            
            const template = templates[templateType];
            if (template) {
                this.formData.input = template.input;
                this.formData.output = template.output;
                this.showTemplates = false;
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




