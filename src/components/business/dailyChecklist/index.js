// 每日清单组件
// 作者：liangliang

import { defineComponent } from '/src/utils/componentLoader.js';
import { getData, postData, updateData, deleteData } from '/src/services/index.js';
import { safeExecute, createError, ErrorTypes, showSuccessMessage } from '/src/utils/error.js';
import { defaultTimeSlots } from '/src/config/dailyChecklistData.js';

const fallbackTemplate = `
        <div class="daily-checklist-container" v-show="activeCategory === 'dailyChecklist' || activeCategory === 'all'">
            <div class="checklist-header">
                <div class="header-left">
                    <h2 class="checklist-title">
                        <i class="fas fa-tasks" aria-hidden="true"></i>
                        每日清单 - {{ currentDateDisplay }}
                    </h2>
                    <p class="checklist-subtitle">{{ currentDateSubtitle }}</p>
                </div>
                <div class="header-actions">
                    <button @click="handleAddItem" class="add-item-btn" type="button">
                        <i class="fas fa-plus" aria-hidden="true"></i>
                        <span>添加项目</span>
                    </button>
                    <button @click="handleRefresh" class="refresh-btn" type="button">
                        <i class="fas fa-sync-alt" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
            
            <div v-if="loading" class="loading-container">
                <div class="loading-spinner"></div>
                <p>正在加载每日清单...</p>
            </div>
            
            <div v-else-if="error" class="error-container">
                <p>{{ error }}</p>
                <button @click="handleRefresh" class="retry-btn">重试</button>
            </div>
            
            <div v-else class="checklist-content">
                <div class="checklist-stats">
                    <div class="stat-item">
                        <span class="stat-number">{{ completedCount }}</span>
                        <span class="stat-label">已完成</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">{{ totalCount }}</span>
                        <span class="stat-label">总项目</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">{{ Math.round(completionRate) }}%</span>
                        <span class="stat-label">完成率</span>
                    </div>
                </div>
                
                <div class="time-schedule">
                    <div v-for="(timeSlot, index) in timeSlots" :key="timeSlot.time" class="time-slot" :class="{ 'completed': timeSlot.completed, 'current': timeSlot.isCurrent }">
                        <div class="time-header">
                            <div class="time-info">
                                <span class="time-range">{{ timeSlot.time }}</span>
                                <span class="time-name">{{ timeSlot.name }}</span>
                            </div>
                            <div class="time-actions">
                                <button @click="toggleTimeSlot(index)" class="toggle-btn" :class="{ 'completed': timeSlot.completed }">
                                    <i :class="timeSlot.completed ? 'fas fa-check-circle' : 'far fa-circle'"></i>
                                </button>
                                <button @click="editTimeSlot(index)" class="edit-btn">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="time-content">
                            <div class="main-activity">
                                <h4>{{ timeSlot.mainActivity }}</h4>
                            </div>
                            
                            <div class="checklist-items">
                                <div v-for="(item, itemIndex) in timeSlot.checklist" :key="itemIndex" class="checklist-item" :class="{ 'completed': item.completed }">
                                    <label class="item-label">
                                        <input type="checkbox" v-model="item.completed" @change="updateItem(index, itemIndex)" class="item-checkbox">
                                        <span class="item-text">{{ item.text }}</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="data-tracking">
                                <h5>数据追踪</h5>
                                <div class="tracking-fields">
                                    <div v-for="(field, fieldIndex) in timeSlot.dataFields" :key="fieldIndex" class="tracking-field">
                                        <label class="field-label">{{ field.label }}：</label>
                                        <input type="text" 
                                               v-model="field.value" 
                                               @input="onDataFieldInput(index, fieldIndex, $event)"
                                               @change="onDataFieldChange(index, fieldIndex, $event)"
                                               @blur="updateDataField(index, fieldIndex)" 
                                               class="field-input" 
                                               :placeholder="field.placeholder">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="phone-reminder">
                                <h5>手机提醒</h5>
                                <div class="reminder-content">
                                    <i class="fas fa-mobile-alt" aria-hidden="true"></i>
                                    <span>{{ timeSlot.phoneReminder }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

// 创建组件定义
const componentOptions = {
    name: 'DailyChecklist',
    css: '/src/components/business/dailyChecklist/index.css',
    html: '/src/components/business/dailyChecklist/index.html',
    template: fallbackTemplate,
        props: {
            activeCategory: {
                type: String,
                default: 'all'
            },
            currentDateDisplay: {
                type: String,
                default: ''
            },
            currentDateSubtitle: {
                type: String,
                default: ''
            }
        },
        data() {
            return {
                loading: false,
                error: null,
                timeSlots: [],
                showEditModal: false,
                editingSlot: null,
                editingIndex: -1,
                saveTimeout: null
            };
        },
        computed: {
            totalCount() {
                return this.timeSlots.reduce((total, slot) => total + slot.checklist.length, 0);
            },
            completedCount() {
                return this.timeSlots.reduce((total, slot) => {
                    return total + slot.checklist.filter(item => item.completed).length;
                }, 0);
            },
            completionRate() {
                return this.totalCount > 0 ? (this.completedCount / this.totalCount) * 100 : 0;
            }
        },
        methods: {
            /**
             * 初始化时间表数据
             */
            initializeTimeSlots() {
                this.timeSlots = defaultTimeSlots.map(slot => {
                    // 解析时间范围来判断是否当前时间段
                    const times = slot.time.split('-');
                    const startTime = times[0].trim();
                    const endTime = times.length > 1 ? times[1].trim() : '';
                    
                    return {
                        ...slot,
                        // 重新计算动态属性
                        isCurrent: this.isCurrentTimeSlot(startTime, endTime),
                        // 确保深拷贝 checklist 和 dataFields 以免修改原始配置
                        checklist: slot.checklist.map(item => ({ ...item })),
                        dataFields: slot.dataFields ? slot.dataFields.map(field => ({ ...field })) : []
                    };
                });
            },

            /**
             * 判断当前时间是否在指定时段内
             */
            isCurrentTimeSlot(startTime, endTime) {
                const now = new Date();
                const currentTime = now.getHours() * 60 + now.getMinutes();
                
                const [startHour, startMin] = startTime.split(':').map(Number);
                const [endHour, endMin] = endTime.split(':').map(Number);
                
                const startMinutes = startHour * 60 + startMin;
                const endMinutes = endHour * 60 + endMin;
                
                // 处理跨天的情况（如23:00-06:00）
                if (endMinutes < startMinutes) {
                    return currentTime >= startMinutes || currentTime <= endMinutes;
                }
                
                return currentTime >= startMinutes && currentTime <= endMinutes;
            },

            /**
             * 加载每日清单数据
             */
            async loadDailyChecklist() {
                return safeExecute(async () => {
                    this.loading = true;
                    this.error = null;
                    
                    try {
                        // 从API加载数据
                        const dateStr = this.currentDateSubtitle;
                        const { buildServiceUrl } = await import('/src/services/helper/requestHelper.js');
                        const url = buildServiceUrl('query_documents', { cname: 'dailyChecklist', date: dateStr });
                        const response = await getData(url);
                        
                        // 参考 comments 的数据解析逻辑
                        let list = [];
                        if (response && response.data && Array.isArray(response.data.list)) {
                            list = response.data.list;
                        } else if (Array.isArray(response)) {
                            list = response;
                        } else if (response && Array.isArray(response.data)) {
                            list = response.data;
                        }
                        
                        // 检查是否有有效数据
                        if (list && list.length > 0) {
                            // 按创建时间排序，获取最新的数据
                            const sortedList = list.sort((a, b) => {
                                const timeA = new Date(a.date || a.lastUpdated || 0).getTime();
                                const timeB = new Date(b.date || b.lastUpdated || 0).getTime();
                                return timeB - timeA;
                            });
                            
                            const savedData = sortedList[0];
                            if (savedData.timeSlots && savedData.timeSlots.length >= 16) {
                                // 使用API返回的数据
                                this.timeSlots = savedData.timeSlots;
                                console.log('[每日清单] 从API加载数据成功，使用保存的数据');
                            } else {
                                // 数据不完整，使用默认数据
                                this.initializeTimeSlots();
                            }
                        } else {
                            // 没有数据，使用默认数据
                            this.initializeTimeSlots();
                        }
                        
                        console.log('[每日清单] 数据加载成功');
                    } catch (error) {
                        console.warn('[每日清单] API加载失败，使用默认数据:', error);
                        this.error = '加载数据失败: ' + error.message;
                        this.initializeTimeSlots();
                    }
                }, '每日清单数据加载', (errorInfo) => {
                    this.error = errorInfo.message;
                    this.initializeTimeSlots();
                }).finally(() => {
                    this.loading = false;
                });
            },

            /**
             * 保存每日清单数据
             */
            async saveDailyChecklist() {
                return safeExecute(async () => {
                    const dateStr = this.currentDateSubtitle;
                    const data = {
                        date: dateStr,
                        timeSlots: this.timeSlots,
                        completedCount: this.completedCount,
                        totalCount: this.totalCount,
                        completionRate: this.completionRate,
                        lastUpdated: new Date().toISOString()
                    };
                    
                    // 使用 postData 函数，与 comments 保持一致
                    const { postData } = await import('/src/services/modules/crud.js');
                    
                    const payload = {
                        module_name: SERVICE_MODULE,
                        method_name: 'create_document',
                        parameters: {
                            cname: 'dailyChecklist',
                            data: data
                        }
                    };
                    
                    const result = await postData(`${window.API_URL}/`, payload);
                    
                    showSuccessMessage('每日清单已保存');
                    console.log('[每日清单] 数据保存成功:', result);
                }, '每日清单数据保存');
            },

            /**
             * 切换时段完成状态
             */
            toggleTimeSlot(index) {
                return safeExecute(() => {
                    this.timeSlots[index].completed = !this.timeSlots[index].completed;
                    this.saveDailyChecklist();
                }, '切换时段状态');
            },

            /**
             * 更新清单项目
             */
            updateItem(slotIndex, itemIndex) {
                return safeExecute(() => {
                    this.saveDailyChecklist();
                }, '更新清单项目');
            },

            /**
             * 更新数据字段
             */
            updateDataField(slotIndex, fieldIndex) {
                return safeExecute(() => {
                    console.log('[每日清单] 数据字段已更新:', {
                        slotIndex,
                        fieldIndex,
                        value: this.timeSlots[slotIndex].dataFields[fieldIndex].value
                    });
                    this.saveDailyChecklist();
                }, '更新数据字段');
            },
            
            /**
             * 数据字段输入事件
             */
            onDataFieldInput(slotIndex, fieldIndex, event) {
                // 实时更新模型但不保存
                this.timeSlots[slotIndex].dataFields[fieldIndex].value = event.target.value;
            },
            
            /**
             * 数据字段变更事件
             */
            onDataFieldChange(slotIndex, fieldIndex, event) {
                this.updateDataField(slotIndex, fieldIndex);
            },
            
            /**
             * 处理添加项目
             */
            handleAddItem() {
                // TODO: 实现添加自定义项目功能
                alert('功能开发中：添加自定义项目');
            },
            
            /**
             * 处理刷新
             */
            handleRefresh() {
                this.loadDailyChecklist();
            },
            
            /**
             * 编辑时间段
             */
            editTimeSlot(index) {
                // TODO: 实现编辑时间段功能
                alert('功能开发中：编辑时间段');
            }
        },
        mounted() {
            this.loadDailyChecklist();
            
            // 每分钟更新一次当前时间段状态
            this.timer = setInterval(() => {
                this.timeSlots.forEach(slot => {
                    const times = slot.time.split('-');
                    const startTime = times[0].trim();
                    const endTime = times.length > 1 ? times[1].trim() : '';
                    slot.isCurrent = this.isCurrentTimeSlot(startTime, endTime);
                });
            }, 60000);
        },
        beforeUnmount() {
            if (this.timer) {
                clearInterval(this.timer);
            }
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
            }
        }
    };

    // 注册组件
    await defineComponent(componentOptions);
