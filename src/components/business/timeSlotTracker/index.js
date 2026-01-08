/**
 * 时间段追踪系统
 * 用于追踪和管理每日时间段的任务完成情况和数据记录
 * author: liangliang
 */

class TimeSlotTracker {
    constructor() {
        this.timeSlots = this.initializeTimeSlots();
        this.currentSlot = null;
        this.trackingData = this.loadTrackingData();
        this.isTracking = false;
        this.trackingStartTime = null;
    }

    /**
     * 初始化时间段配置
     */
    initializeTimeSlots() {
        return {
            '13:00-14:30': {
                name: '深度项目工作',
                icon: '💻',
                description: '专注项目开发、技术任务',
                tasks: [
                    '关闭所有通知和干扰源',
                    '进入深度工作状态',
                    '专注完成核心项目任务',
                    '编写/调试代码',
                    '技术文档整理',
                    '代码审查和优化',
                    '记录技术难点和解决方案',
                    '每30分钟检查进度'
                ],
                trackingMetrics: {
                    focusDuration: { label: '专注时长', unit: 'h', type: 'number' },
                    codeLines: { label: '代码行数', unit: '行', type: 'number' },
                    tasksCompleted: { label: '完成任务', unit: '个', type: 'number' },
                    techBreakthroughs: { label: '技术突破', unit: '个', type: 'number' },
                    codeQuality: { label: '代码质量', unit: '⭐', type: 'rating', max: 5 },
                    focusLevel: { label: '专注度', unit: '/10', type: 'rating', max: 10 },
                    interruptions: { label: '被打断次数', unit: '次', type: 'number' }
                },
                reminder: '💻 深度项目工作！专注编程'
            },
            '14:45-17:00': {
                name: '协作与学习',
                icon: '👥📚',
                description: '团队协作、知识分享、技能提升',
                tasks: [
                    '参加团队会议和讨论',
                    '代码审查和同行评审',
                    '技术分享和知识传递',
                    '学习新技术或框架',
                    '阅读技术文章/文档',
                    '回复重要邮件和消息',
                    '处理紧急任务和问题',
                    '记录学习心得和收获',
                    '规划明日技术任务'
                ],
                trackingMetrics: {
                    meetingDuration: { label: '会议时长', unit: 'h', type: 'number' },
                    codeReviews: { label: '代码审查', unit: '个', type: 'number' },
                    learningContent: { label: '学习内容', unit: '', type: 'text' },
                    knowledgeShares: { label: '知识分享', unit: '次', type: 'number' },
                    emailsProcessed: { label: '邮件处理', unit: '封', type: 'number' },
                    learningDuration: { label: '学习时长', unit: 'h', type: 'number' },
                    skillImprovement: { label: '技能提升', unit: '⭐', type: 'rating', max: 5 },
                    collaborationEfficiency: { label: '协作效率', unit: '/10', type: 'rating', max: 10 }
                },
                reminder: '👥📚 协作学习时间！团队成长'
            }
        };
    }

    /**
     * 加载追踪数据
     */
    loadTrackingData() {
        const saved = localStorage.getItem('timeSlotTrackingData');
        return saved ? JSON.parse(saved) : {};
    }

    /**
     * 保存追踪数据
     */
    saveTrackingData() {
        localStorage.setItem('timeSlotTrackingData', JSON.stringify(this.trackingData));
    }

    /**
     * 获取当前时间段
     */
    getCurrentTimeSlot() {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        for (const [timeRange, config] of Object.entries(this.timeSlots)) {
            const [start, end] = timeRange.split('-');
            const [startHour, startMin] = start.split(':').map(Number);
            const [endHour, endMin] = end.split(':').map(Number);
            
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            
            if (currentTime >= startMinutes && currentTime <= endMinutes) {
                return { timeRange, config };
            }
        }
        
        return null;
    }

    /**
     * 开始追踪时间段
     */
    startTracking(timeSlot) {
        if (this.isTracking) {
            this.stopTracking();
        }
        
        this.currentSlot = timeSlot;
        this.isTracking = true;
        this.trackingStartTime = new Date();
        
        // 显示提醒
        this.showReminder(timeSlot);
        
        console.log(`[时间段追踪] 开始追踪: ${timeSlot.config.name}`);
    }

    /**
     * 停止追踪时间段
     */
    stopTracking() {
        if (!this.isTracking || !this.currentSlot) return;
        
        const endTime = new Date();
        const duration = (endTime - this.trackingStartTime) / (1000 * 60 * 60); // 小时
        
        // 记录基础数据
        const today = new Date().toISOString().split('T')[0];
        if (!this.trackingData[today]) {
            this.trackingData[today] = {};
        }
        
        if (!this.trackingData[today][this.currentSlot.timeRange]) {
            this.trackingData[today][this.currentSlot.timeRange] = {
                startTime: this.trackingStartTime.toISOString(),
                endTime: endTime.toISOString(),
                duration: duration,
                metrics: {}
            };
        }
        
        // 更新持续时间
        this.trackingData[today][this.currentSlot.timeRange].duration = duration;
        this.trackingData[today][this.currentSlot.timeRange].endTime = endTime.toISOString();
        
        this.saveTrackingData();
        
        console.log(`[时间段追踪] 停止追踪: ${this.currentSlot.config.name}, 持续时间: ${duration.toFixed(2)}小时`);
        
        this.isTracking = false;
        this.currentSlot = null;
        this.trackingStartTime = null;
    }

    /**
     * 更新追踪指标
     */
    updateMetric(timeSlot, metricKey, value) {
        const today = new Date().toISOString().split('T')[0];
        
        if (!this.trackingData[today]) {
            this.trackingData[today] = {};
        }
        
        if (!this.trackingData[today][timeSlot]) {
            this.trackingData[today][timeSlot] = {
                metrics: {}
            };
        }
        
        this.trackingData[today][timeSlot].metrics[metricKey] = {
            value: value,
            timestamp: new Date().toISOString()
        };
        
        this.saveTrackingData();
        
        console.log(`[时间段追踪] 更新指标 ${metricKey}: ${value}`);
    }

    /**
     * 获取追踪数据
     */
    getTrackingData(date = null) {
        const targetDate = date || new Date().toISOString().split('T')[0];
        return this.trackingData[targetDate] || {};
    }

    /**
     * 获取时间段统计
     */
    getTimeSlotStats(timeSlot, days = 7) {
        const stats = {
            totalDays: 0,
            totalDuration: 0,
            averageDuration: 0,
            completionRate: 0,
            metrics: {}
        };
        
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const dayData = this.trackingData[dateStr];
            
            if (dayData && dayData[timeSlot]) {
                stats.totalDays++;
                stats.totalDuration += dayData[timeSlot].duration || 0;
                
                // 统计指标
                const metrics = dayData[timeSlot].metrics || {};
                for (const [key, data] of Object.entries(metrics)) {
                    if (!stats.metrics[key]) {
                        stats.metrics[key] = {
                            total: 0,
                            count: 0,
                            average: 0
                        };
                    }
                    
                    if (typeof data.value === 'number') {
                        stats.metrics[key].total += data.value;
                        stats.metrics[key].count++;
                    }
                }
            }
        }
        
        stats.averageDuration = stats.totalDays > 0 ? stats.totalDuration / stats.totalDays : 0;
        stats.completionRate = stats.totalDays / days;
        
        // 计算指标平均值
        for (const [key, metric] of Object.entries(stats.metrics)) {
            metric.average = metric.count > 0 ? metric.total / metric.count : 0;
        }
        
        return stats;
    }

    /**
     * 显示提醒
     */
    showReminder(timeSlot) {
        if (window.showMessage) {
            window.showMessage(timeSlot.config.reminder, 'info');
        } else {
            console.log(`[提醒] ${timeSlot.config.reminder}`);
        }
    }

    /**
     * 检查是否在追踪时间段内
     */
    isInTrackingTimeSlot() {
        const currentSlot = this.getCurrentTimeSlot();
        return currentSlot && this.isTracking && this.currentSlot?.timeRange === currentSlot.timeRange;
    }

    /**
     * 自动开始追踪（如果当前时间在配置的时间段内）
     */
    autoStartTracking() {
        const currentSlot = this.getCurrentTimeSlot();
        if (currentSlot && !this.isTracking) {
            this.startTracking(currentSlot);
        }
    }

    /**
     * 获取时间段配置
     */
    getTimeSlotConfig(timeRange) {
        return this.timeSlots[timeRange] || null;
    }

    /**
     * 获取所有时间段配置
     */
    getAllTimeSlotConfigs() {
        return this.timeSlots;
    }
}

// 创建全局实例
window.timeSlotTracker = new TimeSlotTracker();

// 自动检查并开始追踪
setInterval(() => {
    window.timeSlotTracker.autoStartTracking();
}, 60000); // 每分钟检查一次

export default TimeSlotTracker;

