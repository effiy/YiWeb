/**
 * 性能监控类
 * @author liangliang
 * @version 1.0.0
 */

/**
 * 性能监控类
 */
export class PerformanceMonitor {
    constructor() {
        this.marks = new Map();
        this.measures = new Map();
        this.observers = new Map();
        this.metrics = new Map();
        this.thresholds = new Map();
        
        // 初始化性能监控
        this.initialize();
    }

    /**
     * 初始化性能监控
     */
    initialize() {
        // 设置默认阈值
        this.setThresholds({
            pageLoad: 3000,
            componentLoad: 1000,
            apiRequest: 5000,
            renderTime: 100
        });

        // 监听性能事件
        this.setupPerformanceObservers();
        
        // 监控页面加载性能
        this.monitorPageLoad();
        
        // 监控资源加载
        this.monitorResourceLoading();
        
        // 监控内存使用
        this.monitorMemoryUsage();
    }

    /**
     * 设置性能阈值
     */
    setThresholds(thresholds) {
        Object.entries(thresholds).forEach(([key, value]) => {
            this.thresholds.set(key, value);
        });
    }

    /**
     * 开始性能标记
     */
    start(name) {
        const markName = `start-${name}`;
        performance.mark(markName);
        this.marks.set(name, {
            start: markName,
            startTime: performance.now()
        });
        
        console.log(`性能监控开始: ${name}`);
    }

    /**
     * 结束性能标记
     */
    end(name) {
        const markData = this.marks.get(name);
        if (!markData) {
            console.warn(`性能标记未找到: ${name}`);
            return;
        }

        const endMarkName = `end-${name}`;
        performance.mark(endMarkName);
        
        // 测量性能
        const measureName = `measure-${name}`;
        performance.measure(measureName, markData.start, endMarkName);
        
        // 获取测量结果
        const measure = performance.getEntriesByName(measureName)[0];
        const duration = measure.duration;
        
        // 记录测量结果
        this.measures.set(name, {
            duration,
            startTime: markData.startTime,
            endTime: performance.now()
        });
        
        // 检查阈值
        this.checkThreshold(name, duration);
        
        // 记录指标
        this.recordMetric(name, duration);
        
        console.log(`性能监控结束: ${name}, 耗时: ${duration.toFixed(2)}ms`);
        
        // 清理标记
        performance.clearMarks(markData.start);
        performance.clearMarks(endMarkName);
        performance.clearMeasures(measureName);
        this.marks.delete(name);
    }

    /**
     * 检查性能阈值
     */
    checkThreshold(name, duration) {
        const threshold = this.thresholds.get(name);
        if (threshold && duration > threshold) {
            console.warn(`性能警告: ${name} 耗时 ${duration.toFixed(2)}ms, 超过阈值 ${threshold}ms`);
            this.emit('performance:threshold-exceeded', { name, duration, threshold });
        }
    }

    /**
     * 记录性能指标
     */
    recordMetric(name, value) {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        
        const metric = this.metrics.get(name);
        metric.push({
            value,
            timestamp: Date.now()
        });
        
        // 保持最近100个指标
        if (metric.length > 100) {
            metric.shift();
        }
    }

    /**
     * 获取性能指标
     */
    getMetrics(name) {
        const metrics = this.metrics.get(name);
        if (!metrics || metrics.length === 0) {
            return null;
        }
        
        const values = metrics.map(m => m.value);
        return {
            count: values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            latest: values[values.length - 1]
        };
    }

    /**
     * 监控页面加载性能
     */
    monitorPageLoad() {
        window.addEventListener('load', () => {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                const metrics = {
                    dns: perfData.domainLookupEnd - perfData.domainLookupStart,
                    tcp: perfData.connectEnd - perfData.connectStart,
                    request: perfData.responseEnd - perfData.requestStart,
                    dom: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                    load: perfData.loadEventEnd - perfData.loadEventStart,
                    total: perfData.loadEventEnd - perfData.fetchStart
                };
                
                this.recordPageLoadMetrics(metrics);
            }
        });
    }

    /**
     * 记录页面加载指标
     */
    recordPageLoadMetrics(metrics) {
        Object.entries(metrics).forEach(([name, value]) => {
            this.recordMetric(`pageLoad.${name}`, value);
        });
        
        console.log('页面加载性能指标:', metrics);
    }

    /**
     * 监控资源加载
     */
    monitorResourceLoading() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.entryType === 'resource') {
                        this.recordMetric('resourceLoad', entry.duration);
                        
                        if (entry.duration > 5000) {
                            console.warn(`资源加载缓慢: ${entry.name}, 耗时: ${entry.duration}ms`);
                        }
                    }
                });
            });
            
            observer.observe({ entryTypes: ['resource'] });
            this.observers.set('resource', observer);
        }
    }

    /**
     * 监控内存使用
     */
    monitorMemoryUsage() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                this.recordMetric('memory.used', memory.usedJSHeapSize);
                this.recordMetric('memory.total', memory.totalJSHeapSize);
                this.recordMetric('memory.limit', memory.jsHeapSizeLimit);
                
                const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
                this.recordMetric('memory.usagePercent', usagePercent);
                
                if (usagePercent > 80) {
                    console.warn(`内存使用率过高: ${usagePercent.toFixed(2)}%`);
                }
            }, 5000);
        }
    }

    /**
     * 设置性能观察器
     */
    setupPerformanceObservers() {
        if ('PerformanceObserver' in window) {
            // 监控长任务
            const longTaskObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    console.warn(`检测到长任务: ${entry.duration}ms`);
                    this.recordMetric('longTasks', entry.duration);
                });
            });
            
            longTaskObserver.observe({ entryTypes: ['longtask'] });
            this.observers.set('longTask', longTaskObserver);
            
            // 监控布局偏移
            const layoutShiftObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.value > 0.1) {
                        console.warn(`检测到布局偏移: ${entry.value}`);
                    }
                    this.recordMetric('layoutShift', entry.value);
                });
            });
            
            layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
            this.observers.set('layoutShift', layoutShiftObserver);
        }
    }

    /**
     * 测量函数执行时间
     */
    measureFunction(name, fn) {
        return (...args) => {
            this.start(name);
            try {
                const result = fn(...args);
                this.end(name);
                return result;
            } catch (error) {
                this.end(name);
                throw error;
            }
        };
    }

    /**
     * 测量异步函数执行时间
     */
    async measureAsyncFunction(name, fn) {
        return async (...args) => {
            this.start(name);
            try {
                const result = await fn(...args);
                this.end(name);
                return result;
            } catch (error) {
                this.end(name);
                throw error;
            }
        };
    }

    /**
     * 获取性能报告
     */
    getReport() {
        const report = {
            marks: Array.from(this.marks.keys()),
            measures: Array.from(this.measures.entries()),
            metrics: {},
            thresholds: Object.fromEntries(this.thresholds),
            observers: Array.from(this.observers.keys())
        };
        
        // 添加指标统计
        for (const [name, metrics] of this.metrics) {
            report.metrics[name] = this.getMetrics(name);
        }
        
        return report;
    }

    /**
     * 导出性能数据
     */
    exportData() {
        return {
            marks: Array.from(this.marks.entries()),
            measures: Array.from(this.measures.entries()),
            metrics: Array.from(this.metrics.entries()),
            timestamp: Date.now()
        };
    }

    /**
     * 清理性能数据
     */
    clear() {
        this.marks.clear();
        this.measures.clear();
        this.metrics.clear();
        
        // 清理观察器
        for (const observer of this.observers.values()) {
            observer.disconnect();
        }
        this.observers.clear();
        
        console.log('性能监控数据已清理');
    }

    /**
     * 获取性能统计
     */
    getStats() {
        const stats = {
            totalMarks: this.marks.size,
            totalMeasures: this.measures.size,
            totalMetrics: this.metrics.size,
            totalObservers: this.observers.size
        };
        
        // 计算平均性能
        let totalDuration = 0;
        let measureCount = 0;
        
        for (const measure of this.measures.values()) {
            totalDuration += measure.duration;
            measureCount++;
        }
        
        if (measureCount > 0) {
            stats.averageDuration = totalDuration / measureCount;
        }
        
        return stats;
    }

    /**
     * 触发性能事件
     */
    emit(event, data) {
        const customEvent = new CustomEvent(event, {
            detail: data,
            bubbles: true
        });
        document.dispatchEvent(customEvent);
    }

    /**
     * 销毁性能监控
     */
    destroy() {
        this.clear();
        console.log('性能监控已销毁');
    }
} 