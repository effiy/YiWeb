// 增强型任务列表组件 - 兼容性组件
// 暂时兼容现有TaskList组件，后续将添加更多专业功能

// 创建增强型任务列表组件
const createEnhancedTaskList = () => {
    return {
        name: 'EnhancedTaskList',
        template: `
            <div class="enhanced-task-list">
                <div v-if="loading" class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>加载中...</span>
                </div>
                <div v-else-if="error" class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>加载失败</h3>
                    <p>{{ error }}</p>
                    <button @click="$emit('retry')" class="retry-btn">重新加载</button>
                </div>
                <div v-else-if="tasks.length === 0" class="empty-state">
                    <div class="empty-state-content">
                        <i class="fas fa-tasks"></i>
                        <h3>暂无任务</h3>
                        <p>开始创建您的第一个任务吧</p>
                        <div class="empty-state-actions">
                            <button @click="$emit('create-task')" class="create-task-btn">
                                <i class="fas fa-plus"></i>
                                创建任务
                            </button>
                            <button @click="$emit('retry')" class="retry-btn" v-if="error">
                                <i class="fas fa-redo"></i>
                                重新加载
                            </button>
                        </div>
                    </div>
                </div>
                <div v-else class="task-list-content">
                    <div v-for="task in tasks" :key="task.key || task.id" 
                         class="task-item-enhanced"
                         @click="handleTaskClick(task)"
                         @touchstart="startLongPress(task, $event)"
                         @touchend="endLongPress"
                         @touchcancel="endLongPress"
                         @mousedown="startLongPress(task, $event)"
                         @mouseup="endLongPress"
                         @mouseleave="endLongPress">
                        
                        <!-- 功能名称标识 -->
                        <div class="task-feature-name" v-if="task.featureName">
                            <i class="fas fa-tag"></i>
                            <span>{{ task.featureName }}</span>
                        </div>
                        
                        <div class="task-header">
                            <div class="task-title">{{ task.title }}</div>
                            <div class="task-actions">
                                <button 
                                    class="edit-btn" 
                                    @click.stop="handleEditTask(task)"
                                    title="编辑任务">
                                    <i class="fas fa-edit"></i>
                                </button>

                            </div>
                        </div>
                        <div class="task-description" v-if="task.description">{{ task.description }}</div>
                        
                        <!-- 输入输出信息 -->
                        <div class="task-io-section" v-if="task.input || task.output">
                            <div class="task-input" v-if="task.input">
                                <div class="io-label">
                                    <i class="fas fa-arrow-down"></i>
                                    <span>输入</span>
                                </div>
                                <div class="io-content">{{ task.input }}</div>
                            </div>
                            <div class="task-output" v-if="task.output">
                                <div class="io-label">
                                    <i class="fas fa-arrow-up"></i>
                                    <span>输出</span>
                                </div>
                                <div class="io-content">{{ task.output }}</div>
                            </div>
                        </div>
                        
                        <!-- 步骤信息 -->
                        <div class="task-steps-section" v-if="task.steps && Object.keys(task.steps).length > 0">
                            <div class="steps-label">
                                <i class="fas fa-list-ol"></i>
                                <span>执行步骤</span>
                                <div class="steps-progress">
                                    {{ getStepsProgress(task) }}
                                </div>
                            </div>
                            <div class="steps-content">
                                <div v-for="(step, stepKey) in task.steps" :key="stepKey" 
                                     class="step-item"
                                     :class="{ 'completed': isStepCompleted(task, stepKey) }">
                                    <div class="step-checkbox" @click.stop="toggleStepComplete(task.key || task.id, stepKey)">
                                        <i :class="getStepCheckIcon(task, stepKey)" class="step-check-icon"></i>
                                    </div>
                                    <span class="step-number" :class="{ 'completed': isStepCompleted(task, stepKey) }">
                                        {{ getStepNumber(stepKey) }}
                                    </span>
                                    <span class="step-text" :class="{ 'completed': isStepCompleted(task, stepKey) }">
                                        {{ getStepText(step) }}
                                    </span>
                                </div>
                            </div>
                        </div>
                        

                    </div>
                </div>
            </div>
        `,
        props: {
            tasks: {
                type: Array,
                default: () => []
            },
            loading: {
                type: Boolean,
                default: false
            },
            error: {
                type: String,
                default: ''
            },
            selectedTasks: {
                type: Array,
                default: () => []
            }
        },
        emits: ['task-click', 'task-select', 'task-update', 'task-delete', 'task-edit', 'selection-change', 'retry', 'create-task'],
        data() {
            return {
                // 长按删除相关变量
                longPressTimer: null,
                longPressTask: null,
                longPressStartTime: 0,
                longPressStartPosition: null,
                isDeleting: false,
                deletedTasks: new Set(), // 记录已删除的任务
                progressTimer: null, // 进度更新计时器
                longPressProgress: 0, // 长按进度 (0-100)
                LONG_PRESS_DURATION: 2000, // 减少到2秒
                LONG_PRESS_MOVE_THRESHOLD: 15, // 增加移动阈值
                PROGRESS_UPDATE_INTERVAL: 50 // 进度更新间隔（毫秒）
            };
        },
        mounted() {
            // 组件挂载后清理过期的本地存储数据
            this.cleanupExpiredLocalStorage();
            
            // 初始化步骤状态
            this.initializeStepStates();
        },
        methods: {


            getStepNumber(stepKey) {
                // 从stepKey中提取步骤编号
                if (typeof stepKey !== 'string') {
                    return stepKey;
                }
                const match = stepKey.match(/step(\d+)/);
                return match ? match[1] : stepKey;
            },
            
            getStepText(step) {
                // 处理不同格式的步骤数据
                if (typeof step === 'string') {
                    return step;
                } else if (step && typeof step === 'object') {
                    return step.text || step.toString();
                }
                return '未知步骤';
            },
            

            

            


            isStepCompleted(task, stepKey) {
                if (!task.steps || !task.steps[stepKey]) {
                    return false;
                }
                const step = task.steps[stepKey];
                if (typeof step === 'boolean') {
                    return step;
                } else if (step && typeof step === 'object') {
                    return step.completed || false;
                }
                return false;
            },
            async toggleStepComplete(taskId, stepKey) {
                console.log('[步骤更新] 开始更新步骤:', { taskId, stepKey });
                
                try {
                    // 找到任务并创建深拷贝，避免影响其他组件
                    const taskIndex = this.tasks.findIndex(t => (t.key && t.key === taskId) || (t.id && t.id === taskId));
                    if (taskIndex === -1) {
                        console.error('[步骤更新] 未找到任务:', taskId);
                        return;
                    }
                    
                    // 创建任务的深拷贝
                    const originalTask = this.tasks[taskIndex];
                    const updatedTask = JSON.parse(JSON.stringify(originalTask));
                    
                    console.log('[步骤更新] 找到任务:', updatedTask.title, '当前步骤数据:', updatedTask.steps);
                    
                    if (!updatedTask.steps) {
                        updatedTask.steps = {};
                        console.log('[步骤更新] 初始化步骤对象');
                    }
                    
                    // 确保步骤数据结构正确
                    if (updatedTask.steps[stepKey]) {
                        // 如果步骤已存在，切换完成状态
                        const oldStatus = updatedTask.steps[stepKey].completed;
                        updatedTask.steps[stepKey].completed = !oldStatus;
                        console.log('[步骤更新] 切换步骤状态:', stepKey, oldStatus, '->', updatedTask.steps[stepKey].completed);
                    } else {
                        // 如果步骤不存在，创建新的步骤对象
                        updatedTask.steps[stepKey] = { 
                            text: stepKey, 
                            completed: true 
                        };
                        console.log('[步骤更新] 创建新步骤:', stepKey, updatedTask.steps[stepKey]);
                    }
                    
                    // 更新任务的完成进度
                    this.updateTaskProgress(updatedTask);
                    console.log('[进度更新] 任务进度已更新:', updatedTask.progress + '%');
                    
                    // 更新本地任务数组，替换原任务
                    this.tasks.splice(taskIndex, 1, updatedTask);
                    
                    // 调用API更新步骤状态到后端
                    await this.updateStepStatusToAPI(updatedTask, stepKey);
                    
                    // 触发任务更新事件
                    this.$emit('task-update', {
                        task: updatedTask,
                        timeData: null
                    });
                    
                    console.log('[步骤更新] 步骤状态已更新:', stepKey, updatedTask.steps[stepKey].completed);
                    
                    // 添加成功反馈
                    this.showStepUpdateFeedback(stepKey, updatedTask.steps[stepKey].completed);
                    
                    // 保存步骤状态到本地存储
                    this.saveStepStateToLocal(taskId, stepKey, updatedTask.steps[stepKey].completed);
                    
                } catch (error) {
                    console.error('[步骤更新] 更新步骤失败:', error);
                    // 如果API更新失败，回滚本地状态
                    this.rollbackStepStatus(taskId, stepKey);
                    // 显示错误提示
                    if (window.showError) {
                        window.showError('步骤状态更新失败，请稍后重试');
                    }
                }
            },
            
            // 调用API更新步骤状态
            async updateStepStatusToAPI(task, stepKey) {
                try {
                    console.log('[API更新] 开始调用API更新步骤状态:', { taskTitle: task.title, stepKey });
                    
                    // 获取URL参数
                    const urlParams = new URLSearchParams(window.location.search);
                    const featureName = urlParams.get('featureName') || '';
                    const cardTitle = urlParams.get('cardTitle') || '';
                    
                    // 构建API URL - 包含任务的key参数
                    let apiUrl = `${window.API_URL}/mongodb/?cname=tasks&featureName=${encodeURIComponent(featureName)}&cardTitle=${encodeURIComponent(cardTitle)}`;
                    
                    // 如果任务有key，添加到URL中
                    if (task.key) {
                        apiUrl += `&key=${encodeURIComponent(task.key)}`;
                    }
                    
                    console.log('[API更新] API URL:', apiUrl);
                    
                    // 准备更新数据
                    const updatePayload = {
                        ...task,
                        updated: new Date().toISOString()
                    };
                    
                    // 调用API更新任务
                    const response = await window.updateData(apiUrl, updatePayload);
                    
                    if (response && response.success !== false) {
                        console.log('[API更新] 步骤状态更新成功');
                        return true;
                    } else {
                        throw new Error('API更新失败');
                    }
                    
                } catch (error) {
                    console.error('[API更新] 步骤状态更新失败:', error);
                    throw error;
                }
            },
            
            // 回滚步骤状态（当API更新失败时）
            rollbackStepStatus(taskId, stepKey) {
                try {
                    console.log('[回滚] 开始回滚步骤状态:', { taskId, stepKey });
                    
                    const taskIndex = this.tasks.findIndex(t => (t.key && t.key === taskId) || (t.id && t.id === taskId));
                    if (taskIndex === -1) {
                        console.error('[回滚] 未找到任务:', taskId);
                        return;
                    }
                    
                    const task = this.tasks[taskIndex];
                    if (task.steps && task.steps[stepKey]) {
                        // 切换回原来的状态
                        task.steps[stepKey].completed = !task.steps[stepKey].completed;
                        
                        // 重新计算任务进度
                        this.updateTaskProgress(task);
                        
                        console.log('[回滚] 步骤状态已回滚:', stepKey, task.steps[stepKey].completed);
                    }
                    
                } catch (error) {
                    console.error('[回滚] 回滚步骤状态失败:', error);
                }
            },
            
            // 显示步骤更新反馈
            showStepUpdateFeedback(stepKey, isCompleted) {
                try {
                    // 查找对应的步骤元素
                    const stepElements = document.querySelectorAll('.step-item');
                    const targetStep = Array.from(stepElements).find(step => {
                        const stepText = step.querySelector('.step-text')?.textContent;
                        return stepText && stepText.includes(stepKey);
                    });
                    
                    if (targetStep) {
                        // 添加临时的高亮效果
                        targetStep.style.transform = 'scale(1.05)';
                        targetStep.style.transition = 'transform 0.2s ease';
                        
                        // 恢复原始大小
                        setTimeout(() => {
                            if (targetStep) {
                                targetStep.style.transform = 'scale(1)';
                            }
                        }, 200);
                    }
                } catch (error) {
                    console.warn('[步骤反馈] 显示反馈失败:', error);
                }
            },
            
            // 保存步骤状态到本地存储
            saveStepStateToLocal(taskId, stepKey, isCompleted) {
                try {
                    const storageKey = `task_step_${taskId}_${stepKey}`;
                    localStorage.setItem(storageKey, JSON.stringify({
                        completed: isCompleted,
                        updatedAt: new Date().toISOString()
                    }));
                    console.log('[本地存储] 步骤状态已保存:', storageKey, isCompleted);
                } catch (error) {
                    console.warn('[本地存储] 保存步骤状态失败:', error);
                }
            },
            
            // 从本地存储恢复步骤状态
            restoreStepStateFromLocal(taskId, stepKey) {
                try {
                    const storageKey = `task_step_${taskId}_${stepKey}`;
                    const stored = localStorage.getItem(storageKey);
                    if (stored) {
                        const data = JSON.parse(stored);
                        console.log('[本地存储] 恢复步骤状态:', storageKey, data);
                        return data.completed;
                    }
                } catch (error) {
                    console.warn('[本地存储] 恢复步骤状态失败:', error);
                }
                return false;
            },
            
            // 清理过期的本地存储数据
            cleanupExpiredLocalStorage() {
                try {
                    const now = new Date();
                    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    
                    Object.keys(localStorage).forEach(key => {
                        if (key.startsWith('task_step_')) {
                            try {
                                const data = JSON.parse(localStorage.getItem(key));
                                if (data.updatedAt && new Date(data.updatedAt) < oneWeekAgo) {
                                    localStorage.removeItem(key);
                                    console.log('[本地存储] 清理过期数据:', key);
                                }
                            } catch (error) {
                                // 如果数据格式错误，直接删除
                                localStorage.removeItem(key);
                                console.log('[本地存储] 清理损坏数据:', key);
                            }
                        }
                    });
                } catch (error) {
                    console.warn('[本地存储] 清理过期数据失败:', error);
                }
            },
            
            // 初始化步骤状态
            initializeStepStates() {
                try {
                    this.tasks.forEach(task => {
                        if (task.steps && Object.keys(task.steps).length > 0) {
                            Object.keys(task.steps).forEach(stepKey => {
                                // 尝试从本地存储恢复步骤状态
                                const localState = this.restoreStepStateFromLocal(task.key || task.id, stepKey);
                                if (localState !== false) {
                                    // 如果本地存储有状态，更新任务数据
                                    if (!task.steps[stepKey]) {
                                        task.steps[stepKey] = { text: stepKey, completed: false };
                                    }
                                    task.steps[stepKey].completed = localState;
                                }
                            });
                            
                            // 更新任务进度
                            this.updateTaskProgress(task);
                        }
                    });
                    
                    console.log('[步骤初始化] 步骤状态初始化完成');
                } catch (error) {
                    console.error('[步骤初始化] 初始化步骤状态失败:', error);
                }
            },
            
            // 更新任务完成进度
            updateTaskProgress(task) {
                try {
                    if (task.steps && Object.keys(task.steps).length > 0) {
                        const totalSteps = Object.keys(task.steps).length;
                        let completedSteps = 0;
                        
                        // 计算完成的步骤数量
                        Object.values(task.steps).forEach(step => {
                            if (step && typeof step === 'object' && step.completed) {
                                completedSteps++;
                            } else if (step === true) {
                                // 处理布尔值格式
                                completedSteps++;
                            }
                        });
                        
                        // 更新任务进度
                        task.progress = Math.round((completedSteps / totalSteps) * 100);
                        task.completedSubtasks = completedSteps;
                        task.totalSubtasks = totalSteps;
                        
                        console.log('[进度更新] 任务进度已更新:', {
                            title: task.title,
                            totalSteps,
                            completedSteps,
                            progress: task.progress + '%'
                        });
                    } else {
                        // 如果没有步骤，设置默认值
                        task.progress = 0;
                        task.completedSubtasks = 0;
                        task.totalSubtasks = 0;
                    }
                } catch (error) {
                    console.error('[进度更新] 更新任务进度失败:', error);
                    // 设置默认值
                    task.progress = 0;
                    task.completedSubtasks = 0;
                    task.totalSubtasks = 0;
                }
            },
            
            // 任务选择方法
            handleTaskSelect(task) {
                console.log('[任务选择] 选择任务:', task.title);
                // 触发任务选择事件
                this.$emit('task-select', task);
            },
            
            // 任务点击方法
            handleTaskClick(task) {
                console.log('[任务点击] 点击任务:', task.title);
                // 触发任务点击事件
                this.$emit('task-click', task);
            },
            
            getStepCheckIcon(task, stepKey) {
                if (task.steps && task.steps[stepKey] && task.steps[stepKey].completed) {
                    return 'fas fa-check-circle';
                }
                return 'fas fa-circle';
            },
            
            // 长按删除相关方法
            /**
             * 开始长按计时
             * @param {Object} task - 任务对象
             * @param {Event} event - 事件对象
             */
            startLongPress(task, event) {
                try {
                    // 阻止事件冒泡，避免触发其他点击事件
                    if (event) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                    
                    // 检查是否正在删除中
                    if (this.isDeleting) {
                        console.log('[长按删除] 正在删除中，忽略新的长按');
                        return;
                    }
                    
                    // 检查任务是否已经被标记为删除
                    const taskElement = event.target.closest('.task-item-enhanced');
                    if (taskElement && taskElement.classList.contains('deleted')) {
                        console.log('[长按删除] 任务已被标记为删除，忽略长按');
                        return;
                    }
                    
                    // 检查任务是否已经在删除记录中
                    if (this.deletedTasks.has(task.title)) {
                        console.log('[长按删除] 任务已在删除记录中，忽略长按');
                        return;
                    }
                    
                    // 检查是否点击在可交互元素上
                    const target = event.target;
                    const isInteractiveElement = target.closest('button, a, [role="button"], .step-checkbox');
                    
                    if (isInteractiveElement) {
                        console.log('[长按删除] 点击在交互元素上，跳过长按:', target.tagName, target.className);
                        return;
                    }
                    
                    // 检查task是否存在
                    if (!task) {
                        console.warn('[长按删除] task参数为空');
                        return;
                    }
                    
                    // 记录长按开始时间和位置
                    this.longPressStartTime = Date.now();
                    this.longPressStartPosition = {
                        x: event.clientX || event.touches?.[0]?.clientX || 0,
                        y: event.clientY || event.touches?.[0]?.clientY || 0
                    };
                    
                    console.log('[长按删除] 开始长按任务:', {
                        title: task.title,
                        position: this.longPressStartPosition
                    });
                
                    // 清除之前的计时器
                    if (this.longPressTimer) {
                        clearTimeout(this.longPressTimer);
                    }
                    
                    // 深拷贝task对象，避免引用问题
                    this.longPressTask = JSON.parse(JSON.stringify(task));
                    
                    console.log('[长按删除] 保存任务引用:', {
                        title: this.longPressTask.title
                    });
                    
                    // 添加长按视觉反馈
                    if (taskElement) {
                        // 确保移除其他状态类
                        taskElement.classList.remove('deleting', 'deleted');
                        taskElement.classList.add('long-pressing');
                        
                        // 初始化进度
                        this.longPressProgress = 0;
                        this.updateLongPressProgress(taskElement);
                        
                        // 添加触觉反馈（如果支持）
                        if (navigator.vibrate) {
                            navigator.vibrate(100);
                        }
                        
                        // 添加声音效果
                        this.playLongPressSound();
                    }
                    
                    // 设置2秒后执行删除
                    this.longPressTimer = setTimeout(() => {
                        // 检查是否移动过大
                        const currentPosition = {
                            x: event.clientX || event.touches?.[0]?.clientX || 0,
                            y: event.clientY || event.touches?.[0]?.clientY || 0
                        };
                        
                        const moveDistance = Math.sqrt(
                            Math.pow(currentPosition.x - this.longPressStartPosition.x, 2) +
                            Math.pow(currentPosition.y - this.longPressStartPosition.y, 2)
                        );
                        
                        if (moveDistance > this.LONG_PRESS_MOVE_THRESHOLD) {
                            console.log('[长按删除] 移动距离过大，取消删除:', moveDistance);
                            this.endLongPress();
                            return;
                        }
                        
                        // 再次检查是否正在删除中
                        if (this.isDeleting) {
                            console.log('[长按删除] 正在删除中，取消重复删除');
                            this.endLongPress();
                            return;
                        }
                        
                        // 再次检查任务元素状态
                        if (taskElement && taskElement.classList.contains('deleted')) {
                            console.log('[长按删除] 任务已被标记为删除，取消删除');
                            this.endLongPress();
                            return;
                        }
                        
                        // 设置删除状态
                        this.isDeleting = true;
                        
                        // 保存当前task的引用，避免异步操作中的问题
                        const currentTask = { ...this.longPressTask };
                        
                        if (currentTask && currentTask.title) {
                            // 添加删除确认动画
                            if (taskElement) {
                                taskElement.classList.remove('long-pressing');
                                taskElement.classList.add('deleting');
                                
                                // 等待动画完成后执行删除
                                setTimeout(() => {
                                    // 再次检查task是否仍然有效
                                    if (currentTask && currentTask.title) {
                                        this.deleteTask(currentTask, taskElement);
                                    } else {
                                        console.warn('[长按删除] 任务数据已失效，取消删除');
                                        if (taskElement) {
                                            taskElement.classList.remove('deleting');
                                        }
                                        this.isDeleting = false;
                                    }
                                }, 600); // 增加一点时间确保动画完成
                            } else {
                                // 再次检查task是否仍然有效
                                if (currentTask && currentTask.title) {
                                    this.deleteTask(currentTask);
                                } else {
                                    console.warn('[长按删除] 任务数据已失效，取消删除');
                                    this.isDeleting = false;
                                }
                            }
                        } else {
                            // 移除长按样式
                            if (taskElement) {
                                taskElement.classList.remove('long-pressing');
                            }
                            console.log('[长按删除] longPressTask无效，取消删除');
                            this.isDeleting = false;
                        }
                    }, this.LONG_PRESS_DURATION);
                    
                    console.log('[长按删除] 开始计时，2秒后将删除任务:', task.title);
                } catch (error) {
                    console.error('[长按删除] 开始长按失败:', error);
                    this.isDeleting = false;
                }
            },
            
            /**
             * 结束长按计时
             */
            endLongPress(event) {
                // 阻止事件冒泡，避免触发其他点击事件
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                
                if (this.longPressTimer) {
                    clearTimeout(this.longPressTimer);
                    this.longPressTimer = null;
                    this.longPressTask = null;
                    this.longPressStartTime = 0;
                    this.longPressStartPosition = null;
                    
                    // 停止进度更新
                    if (this.progressTimer) {
                        clearInterval(this.progressTimer);
                        this.progressTimer = null;
                    }
                    
                    // 重置进度
                    this.longPressProgress = 0;
                    
                    // 移除所有任务的长按样式，但保留删除状态
                    const longPressingTasks = document.querySelectorAll('.task-item-enhanced.long-pressing');
                    longPressingTasks.forEach(task => {
                        // 只移除长按样式，不移除删除相关样式
                        if (!task.classList.contains('deleting') && !task.classList.contains('deleted')) {
                            task.classList.remove('long-pressing');
                            
                            // 移除进度条
                            const progressBar = task.querySelector('.long-press-progress');
                            if (progressBar) {
                                progressBar.remove();
                            }
                        }
                    });
                    
                    // 添加取消反馈
                    if (navigator.vibrate) {
                        // 根据长按进度提供不同的触觉反馈
                        if (this.longPressProgress > 50) {
                            navigator.vibrate([100, 50, 100]); // 长震动
                        } else {
                            navigator.vibrate(50); // 短震动
                        }
                    }
                    
                    console.log('[长按删除] 取消删除操作，进度:', this.longPressProgress);
                }
                
                // 确保删除状态被重置（除非正在删除中）
                if (!this.isDeleting) {
                    this.isDeleting = false;
                }
            },
            
            /**
             * 删除任务
             * @param {Object} task - 任务对象
             * @param {HTMLElement} taskElement - 任务DOM元素（可选）
             */
            async deleteTask(task, taskElement) {
                try {
                    console.log('[删除任务] 开始删除任务:', task.title);
                    
                    // 检查task是否存在
                    if (!task) {
                        console.error('[删除任务] task参数为空');
                        return;
                    }
                    
                    // 显示友好的删除确认对话框
                    const confirmed = await this.showDeleteConfirmation(task.title);
                    if (!confirmed) {
                        this.isDeleting = false;
                        // 如果用户取消，恢复卡片状态
                        if (taskElement) {
                            taskElement.classList.remove('deleting');
                            taskElement.classList.remove('long-pressing');
                        }
                        return;
                    }
                    
                    // 记录任务为已删除状态
                    this.deletedTasks.add(task.title);
                    
                    // 立即禁用卡片的交互
                    if (taskElement) {
                        taskElement.style.pointerEvents = 'none';
                        taskElement.classList.add('deleted');
                    }
                    
                    // 触发删除事件
                    this.$emit('task-delete', task);
                    
                    // 显示删除成功提示
                    this.showDeleteSuccessIndicator(task.title);
                    
                    // 执行删除动画，但不立即移除DOM元素
                    if (taskElement) {
                        // 确保动画正确执行
                        taskElement.style.animation = 'deleteAnimation 0.6s ease-in-out';
                        
                        // 监听动画完成事件
                        const handleAnimationEnd = () => {
                            try {
                                if (taskElement && taskElement.parentNode) {
                                    // 移除所有相关样式和类
                                    taskElement.classList.remove('long-pressing', 'deleting', 'deleted');
                                    taskElement.style.pointerEvents = '';
                                    taskElement.style.animation = '';
                                    
                                    // 不立即移除DOM元素，让Vue处理数据更新
                                    console.log('[删除任务] 删除动画完成，等待Vue数据更新');
                                }
                            } catch (error) {
                                console.error('[删除任务] 处理动画完成事件失败:', error);
                            }
                        };
                        
                        // 添加动画结束监听器
                        taskElement.addEventListener('animationend', handleAnimationEnd, { once: true });
                        
                        // 备用处理机制（如果动画没有触发）
                        setTimeout(() => {
                            if (taskElement && taskElement.parentNode && taskElement.classList.contains('deleted')) {
                                handleAnimationEnd();
                            }
                        }, 1000);
                        
                        // 延迟检查数据更新状态
                        setTimeout(() => {
                            // 检查任务是否仍然存在于数据中
                            const taskStillExists = this.tasks.some(t => 
                                (t.key && t.key === task.key) || 
                                (t.id && t.id === task.id) ||
                                (t.title && t.title === task.title)
                            );
                            
                            if (!taskStillExists) {
                                console.log('[删除任务] 任务已从数据中移除，DOM元素将被Vue自动清理');
                            } else {
                                console.warn('[删除任务] 任务仍然存在于数据中，可能存在数据同步问题');
                            }
                        }, 2000); // 2秒后检查
                    }
                    
                    console.log('[删除任务] 删除成功:', task.title);
                    
                } catch (error) {
                    console.error('[删除任务] 删除失败:', error);
                    
                    // 如果删除失败，恢复卡片状态
                    if (taskElement) {
                        taskElement.classList.remove('deleting', 'deleted');
                        taskElement.style.pointerEvents = '';
                        taskElement.style.animation = '';
                    }
                } finally {
                    // 确保删除状态被重置
                    this.isDeleting = false;
                }
            },
            
            /**
             * 更新长按进度
             * @param {HTMLElement} taskElement - 任务元素
             */
            updateLongPressProgress(taskElement) {
                if (!taskElement) return;
                
                // 清除之前的进度计时器
                if (this.progressTimer) {
                    clearInterval(this.progressTimer);
                }
                
                // 设置进度更新计时器
                this.progressTimer = setInterval(() => {
                    if (this.longPressTimer && !this.isDeleting) {
                        const elapsed = Date.now() - this.longPressStartTime;
                        this.longPressProgress = Math.min((elapsed / this.LONG_PRESS_DURATION) * 100, 100);
                        
                        // 更新进度条
                        this.updateProgressBar(taskElement, this.longPressProgress);
                        
                        // 进度达到100%时停止更新
                        if (this.longPressProgress >= 100) {
                            clearInterval(this.progressTimer);
                            this.progressTimer = null;
                        }
                    } else {
                        // 如果长按被取消，停止进度更新
                        clearInterval(this.progressTimer);
                        this.progressTimer = null;
                    }
                }, this.PROGRESS_UPDATE_INTERVAL);
            },
            
            /**
             * 更新进度条显示
             * @param {HTMLElement} taskElement - 任务元素
             * @param {number} progress - 进度百分比
             */
            updateProgressBar(taskElement, progress) {
                if (!taskElement) return;
                
                // 查找或创建进度条
                let progressBar = taskElement.querySelector('.long-press-progress');
                if (!progressBar) {
                    progressBar = document.createElement('div');
                    progressBar.className = 'long-press-progress';
                    progressBar.innerHTML = `
                        <div class="progress-fill"></div>
                        <div class="progress-text">${Math.round(progress)}%</div>
                    `;
                    taskElement.appendChild(progressBar);
                } else {
                    // 更新进度条填充
                    const progressFill = progressBar.querySelector('.progress-fill');
                    const progressText = progressBar.querySelector('.progress-text');
                    if (progressFill) {
                        progressFill.style.width = `${progress}%`;
                    }
                    if (progressText) {
                        progressText.textContent = `${Math.round(progress)}%`;
                    }
                }
            },
            
            /**
             * 播放长按声音效果
             */
            playLongPressSound() {
                try {
                    // 创建音频上下文（如果还没有）
                    if (!window.audioContext) {
                        window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    }
                    
                    // 创建振荡器
                    const oscillator = window.audioContext.createOscillator();
                    const gainNode = window.audioContext.createGain();
                    
                    // 连接音频节点
                    oscillator.connect(gainNode);
                    gainNode.connect(window.audioContext.destination);
                    
                    // 设置音频参数
                    oscillator.frequency.setValueAtTime(800, window.audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(400, window.audioContext.currentTime + 0.1);
                    
                    gainNode.gain.setValueAtTime(0.1, window.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, window.audioContext.currentTime + 0.1);
                    
                    // 播放声音
                    oscillator.start(window.audioContext.currentTime);
                    oscillator.stop(window.audioContext.currentTime + 0.1);
                    
                } catch (error) {
                    console.log('[声音效果] 无法播放声音:', error);
                }
            },
            
            /**
             * 显示删除确认对话框
             * @param {string} taskTitle - 任务标题
             * @returns {Promise<boolean>} 用户是否确认删除
             */
            showDeleteConfirmation(taskTitle) {
                return new Promise((resolve) => {
                    try {
                        // 创建确认对话框
                        const dialog = document.createElement('div');
                        dialog.className = 'delete-confirmation-dialog';
                        dialog.innerHTML = `
                            <div class="dialog-overlay"></div>
                            <div class="dialog-content">
                                <div class="dialog-header">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <h3>确认删除</h3>
                                </div>
                                <div class="dialog-body">
                                    <p>确定要删除任务 <strong>"${taskTitle}"</strong> 吗？</p>
                                    <p class="warning-text">此操作不可撤销！</p>
                                </div>
                                <div class="dialog-actions">
                                    <button class="btn-cancel" type="button">取消</button>
                                    <button class="btn-confirm" type="button">确认删除</button>
                                </div>
                            </div>
                        `;
                        
                        // 添加到页面
                        document.body.appendChild(dialog);
                        
                        // 添加显示动画
                        setTimeout(() => {
                            dialog.classList.add('show');
                        }, 10);
                        
                        // 绑定事件
                        const cancelBtn = dialog.querySelector('.btn-cancel');
                        const confirmBtn = dialog.querySelector('.btn-confirm');
                        const overlay = dialog.querySelector('.dialog-overlay');
                        
                        const closeDialog = (result) => {
                            dialog.classList.remove('show');
                            setTimeout(() => {
                                if (dialog && dialog.parentNode) {
                                    dialog.remove();
                                }
                                resolve(result);
                            }, 300);
                        };
                        
                        cancelBtn.addEventListener('click', () => closeDialog(false));
                        confirmBtn.addEventListener('click', () => closeDialog(true));
                        overlay.addEventListener('click', () => closeDialog(false));
                        
                        // ESC键关闭
                        const handleEsc = (e) => {
                            if (e.key === 'Escape') {
                                document.removeEventListener('keydown', handleEsc);
                                closeDialog(false);
                            }
                        };
                        document.addEventListener('keydown', handleEsc);
                        
                        console.log('[删除确认] 显示确认对话框:', taskTitle);
                    } catch (error) {
                        console.error('[删除确认] 显示确认对话框失败:', error);
                        // 降级到原生confirm
                        resolve(confirm(`确定要删除任务"${taskTitle}"吗？此操作不可撤销。`));
                    }
                });
            },
            
            /**
             * 显示删除成功提示
             * @param {string} taskTitle - 任务标题
             */
            showDeleteSuccessIndicator(taskTitle) {
                try {
                    // 创建删除成功提示元素
                    const indicator = document.createElement('div');
                    indicator.className = 'delete-success-indicator';
                    indicator.innerHTML = `
                        <i class="fas fa-check-circle" style="margin-right: 8px;"></i>
                        已删除任务"${taskTitle}"
                    `;
                    
                    // 添加到页面
                    document.body.appendChild(indicator);
                    
                    // 动画结束后自动移除
                    indicator.addEventListener('animationend', () => {
                        if (indicator && indicator.parentNode) {
                            indicator.remove();
                        }
                    }, { once: true });
                    
                    console.log('[删除提示] 显示删除成功提示:', taskTitle);
                } catch (error) {
                    console.error('[删除提示] 显示提示失败:', error);
                }
            },
            
            /**
             * 清理组件状态
             */
            cleanup() {
                try {
                    // 清理计时器
                    if (this.longPressTimer) {
                        clearTimeout(this.longPressTimer);
                        this.longPressTimer = null;
                    }
                    
                    // 清理进度计时器
                    if (this.progressTimer) {
                        clearInterval(this.progressTimer);
                        this.progressTimer = null;
                    }
                    
                    // 清理状态变量
                    this.longPressTask = null;
                    this.longPressStartTime = 0;
                    this.longPressStartPosition = null;
                    this.isDeleting = false;
                    this.deletedTasks.clear();
                    this.longPressProgress = 0;
                    
                    // 清理所有任务的状态样式和进度条
                    const taskElements = document.querySelectorAll('.task-item-enhanced');
                    taskElements.forEach(element => {
                        element.classList.remove('long-pressing', 'deleting', 'deleted');
                        element.style.pointerEvents = '';
                        element.style.animation = '';
                        
                        // 移除进度条
                        const progressBar = element.querySelector('.long-press-progress');
                        if (progressBar) {
                            progressBar.remove();
                        }
                    });
                    
                    console.log('[清理] 组件状态已清理');
                } catch (error) {
                    console.error('[清理] 清理组件状态失败:', error);
                }
            },
            
            /**
             * 编辑任务
             */
            handleEditTask(task) {
                try {
                    console.log('[编辑任务] 开始编辑任务:', task.title);
                    // 触发编辑事件，让父组件处理
                    this.$emit('task-edit', task);
                } catch (error) {
                    console.error('[编辑任务] 编辑失败:', error);
                }
            },
            
            /**
             * 验证数据完整性
             */
            validateDataIntegrity() {
                try {
                    const taskElements = document.querySelectorAll('.task-item-enhanced');
                    const domCount = taskElements.length;
                    const dataCount = this.tasks.length;
                    
                    console.log('[数据完整性检查]', {
                        domCount,
                        dataCount,
                        isConsistent: domCount === dataCount
                    });
                    
                    if (domCount !== dataCount) {
                        console.warn('[数据完整性检查] DOM和数据结构不一致，可能存在数据丢失');
                        
                        // 检查是否有被标记为删除但仍在DOM中的元素
                        const deletedElements = document.querySelectorAll('.task-item-enhanced.deleted');
                        console.log('[数据完整性检查] 被标记为删除的DOM元素数量:', deletedElements.length);
                        
                        // 检查是否有状态异常的DOM元素
                        const abnormalElements = document.querySelectorAll('.task-item-enhanced.long-pressing, .task-item-enhanced.deleting');
                        console.log('[数据完整性检查] 状态异常的DOM元素数量:', abnormalElements.length);
                    }
                    
                    return domCount === dataCount;
                } catch (error) {
                    console.error('[数据完整性检查] 检查失败:', error);
                    return false;
                }
            },

            getStepsProgress(task) {
                try {
                    if (!task.steps || Object.keys(task.steps).length === 0) {
                        return '0%';
                    }
                    
                    const totalSteps = Object.keys(task.steps).length;
                    let completedSteps = 0;
                    
                    // 计算完成的步骤数量
                    Object.values(task.steps).forEach(step => {
                        if (step && typeof step === 'object' && step.completed) {
                            completedSteps++;
                        } else if (step === true) {
                            // 处理布尔值格式
                            completedSteps++;
                        }
                    });
                    
                    const progress = Math.round((completedSteps / totalSteps) * 100);
                    return `${progress}%`;
                    
                } catch (error) {
                    console.error('[步骤进度] 计算步骤进度失败:', error);
                    return '0%';
                }
            }
        }
    };
};

// 注册组件到全局
try {
    const EnhancedTaskList = createEnhancedTaskList();
    window.EnhancedTaskList = EnhancedTaskList;
} catch (error) {
    console.error('EnhancedTaskList 组件初始化失败:', error);
}




