import { defineComponent } from '/src/utils/componentLoader.js';

// 任务编辑组件
(async function initComponent() {
    try {
        await defineComponent({
            name: 'TaskEditor',
            css: '/src/components/business/taskEditor/index.css',
            html: '/src/components/business/taskEditor/index.html',
            // 确保组件可以被Vue 3正确识别
            __vccOpts: true,
            // 添加Vue 3兼容性标记
            compatConfig: {
                MODE: 3
            },
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
                        // 业务场景分析字段（参考SOP任务9）
                        scenarioOverview: '', // 场景概述
                        input: '', // 业务步骤（用户意图）
                        output: '', // 困难与功能（挑战—方案）
                        environmentAndRules: '', // 环境与规则
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
                            scenarioOverview: processedTaskData.scenarioOverview || '',
                            input: processedTaskData.input || '',
                            output: processedTaskData.output || '',
                            environmentAndRules: processedTaskData.environmentAndRules || '',
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
                            scenarioOverview: '',
                            input: '',
                            output: '',
                            environmentAndRules: '',
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
                            // 数组格式转换为字符串，每行添加序号
                            processed.input = processed.input
                                .map((item, index) => `${index + 1}. ${item}`)
                                .join('\n');
                        } else if (typeof processed.input === 'object') {
                            // 对象格式转换为字符串，保持键值对格式
                            processed.input = Object.entries(processed.input)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join('\n');
                        }
                    }
                    
                    // 处理output字段
                    if (processed.output) {
                        if (Array.isArray(processed.output)) {
                            // 数组格式转换为字符串，每行添加序号
                            processed.output = processed.output
                                .map((item, index) => `${index + 1}. ${item}`)
                                .join('\n');
                        } else if (typeof processed.output === 'object') {
                            // 对象格式转换为字符串，保持键值对格式
                            processed.output = Object.entries(processed.output)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join('\n');
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
                            processed.input = processed.input
                                .split('\n')
                                .filter(line => line.trim())
                                .map(line => {
                                    // 移除序号前缀（如 "1. " 或 "1: "）
                                    const trimmed = line.trim();
                                    const match = trimmed.match(/^\d+[\.:]\s*(.+)$/);
                                    return match ? match[1] : trimmed;
                                });
                        } else {
                            processed.input = [];
                        }
                    }
                    
                    // 处理output字段 - 字符串转数组
                    if (processed.output && typeof processed.output === 'string') {
                        if (processed.output.trim()) {
                            processed.output = processed.output
                                .split('\n')
                                .filter(line => line.trim())
                                .map(line => {
                                    // 移除序号前缀（如 "1. " 或 "1: "）
                                    const trimmed = line.trim();
                                    const match = trimmed.match(/^\d+[\.:]\s*(.+)$/);
                                    return match ? match[1] : trimmed;
                                });
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
                        
                        // 构建标准服务接口 payload
                        const urlParams = new URLSearchParams(window.location.search);
                        const featureName = urlParams.get('featureName');
                        const cardTitle = urlParams.get('cardTitle');
                        
                        const payload = {
                            module_name: window.SERVICE_MODULE || 'services.database.data_service',
                            method_name: 'create_document',
                            parameters: {
                                cname: 'tasks',
                                data: {
                                    ...taskData,
                                    ...(featureName ? { featureName } : {}),
                                    ...(cardTitle ? { cardTitle } : {})
                                }
                            }
                        };
                        console.log('[TaskEditor] 创建任务API payload:', payload);
                        
                        // 调用API创建任务
                        const response = await window.postData(`${window.API_URL}/`, payload);
                        
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
                        
                        // 构建标准服务接口 payload
                        const urlParams = new URLSearchParams(window.location.search);
                        const featureName = urlParams.get('featureName');
                        const cardTitle = urlParams.get('cardTitle');
                        
                        const payload = {
                            module_name: window.SERVICE_MODULE || 'services.database.data_service',
                            method_name: 'update_document',
                            parameters: {
                                cname: 'tasks',
                                data: {
                                    key: taskData.key,
                                    ...(featureName ? { featureName } : {}),
                                    ...(cardTitle ? { cardTitle } : {}),
                                    ...taskData
                                }
                            }
                        };
                        console.log('[TaskEditor] 更新任务API payload:', payload);
                        
                        // 调用API更新任务
                        const response = await window.postData(`${window.API_URL}/`, payload);
                        
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
                            input: '1. method: HTTP方法 (GET/POST/PUT/DELETE)\n2. url: 接口地址\n3. headers: 请求头\n4. body: 请求体数据',
                            output: '1. status: HTTP状态码\n2. data: 响应数据\n3. message: 响应消息\n4. timestamp: 时间戳'
                        },
                        ui: {
                            input: '1. 组件类型：按钮/表单/列表等\n2. 设计风格：Material Design/Flat Design等\n3. 响应式：支持移动端/桌面端\n4. 主题：深色/浅色模式',
                            output: '1. 设计稿：Figma/Sketch文件\n2. 组件代码：Vue/React组件\n3. 样式文件：CSS/SCSS\n4. 文档：使用说明和API文档'
                        },
                        data: {
                            input: '1. 数据格式：JSON/CSV/XML等\n2. 数据量：记录数量\n3. 字段结构：字段名称和类型\n4. 数据质量：完整性、准确性要求',
                            output: '1. 清洗后数据：格式统一的数据\n2. 统计报告：数据概览和异常\n3. 可视化图表：图表类型和样式\n4. 导出文件：处理后的数据文件'
                        },
                        test: {
                            input: '1. 功能测试：核心功能验证\n2. 边界测试：极限值测试\n3. 异常测试：错误处理测试\n4. 性能测试：响应时间和并发',
                            output: '1. 测试报告：通过率和失败用例\n2. 缺陷列表：发现的问题和优先级\n3. 性能指标：响应时间和资源使用\n4. 建议改进：优化建议和最佳实践'
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
        });
        
        // 注册组件到全局 (defineComponent already does this, but for double safety or if explicitly checked before defineComponent returns)
        // defineComponent adds window[name] = component.
        // TaskEditor original code also assigned window.TaskEditor manually.
        // The defineComponent helper handles it.
        
        if (window.TaskEditor) {
             window.dispatchEvent(new CustomEvent('TaskEditorLoaded', { detail: window.TaskEditor }));
        }

    } catch (error) {
        console.error('TaskEditor 组件初始化失败:', error);
    }
})();
