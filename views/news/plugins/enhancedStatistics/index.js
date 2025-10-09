// 增强统计组件 - 展示详细的新闻数据分析
// 作者：liangliang

import { loadCSSFiles } from '/utils/baseView.js';
import { safeExecute } from '/utils/error.js';

// 自动加载相关的CSS文件
loadCSSFiles([
    '/views/news/plugins/enhancedStatistics/index.css'
]);

// 异步加载HTML模板
async function loadTemplate() {
    try {
        const response = await fetch('/views/news/plugins/enhancedStatistics/index.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error('加载模板失败:', error);
        return null;
    }
}

// 创建组件定义
const createEnhancedStatistics = async () => {
    const template = await loadTemplate();
    
    return {
        name: 'EnhancedStatistics',
        props: {
            comprehensiveStats: {
                type: Object,
                default: () => ({
                    overview: {
                        totalNews: 0,
                        totalCategories: 0,
                        averageConfidence: 0,
                        contentQuality: 0
                    },
                    topCategories: [],
                    qualityBreakdown: {
                        high: 0,
                        medium: 0,
                        low: 0
                    },
                    timeInsights: {
                        peakHours: [],
                        peakDays: []
                    },
                    contentInsights: {
                        withContent: 0,
                        withExcerpt: 0,
                        withImages: 0,
                        averageLength: 0
                    }
                })
            },
            categoryDistribution: {
                type: Array,
                default: () => []
            },
            categoryQuality: {
                type: Object,
                default: () => ({})
            },
            timeDistribution: {
                type: Object,
                default: () => ({
                    byHour: {},
                    byDayOfWeek: {},
                    byMonth: {},
                    peakHours: [],
                    peakDays: []
                })
            },
            contentQuality: {
                type: Object,
                default: () => ({
                    total: 0,
                    withContent: 0,
                    withExcerpt: 0,
                    withImages: 0,
                    withLinks: 0,
                    averageLength: 0,
                    qualityScore: 0
                })
            },
            visible: {
                type: Boolean,
                default: false
            }
        },
        emits: ['close'],
        methods: {
            // 格式化百分比
            formatPercentage(value, total) {
                return safeExecute(() => {
                    if (total === 0) return '0%';
                    return ((value / total) * 100).toFixed(1) + '%';
                }, '百分比格式化');
            },

            // 格式化数字
            formatNumber(num) {
                return safeExecute(() => {
                    if (num >= 1000) {
                        return (num / 1000).toFixed(1) + 'K';
                    }
                    return num.toString();
                }, '数字格式化');
            },

            // 获取质量等级颜色
            getQualityColor(quality) {
                return safeExecute(() => {
                    const colors = {
                        high: '#4caf50',
                        medium: '#ff9800',
                        low: '#f44336'
                    };
                    return colors[quality] || '#6c757d';
                }, '质量等级颜色获取');
            },

            // 获取置信度颜色
            getConfidenceColor(confidence) {
                return safeExecute(() => {
                    if (confidence >= 0.8) return '#4caf50';
                    if (confidence >= 0.6) return '#ff9800';
                    if (confidence >= 0.4) return '#ff5722';
                    return '#f44336';
                }, '置信度颜色获取');
            },

            // 获取方法图标
            getMethodIcon(method) {
                return safeExecute(() => {
                    const icons = {
                        domain: 'fas fa-globe',
                        keywords: 'fas fa-search',
                        source: 'fas fa-rss',
                        default: 'fas fa-question-circle'
                    };
                    return icons[method] || 'fas fa-question-circle';
                }, '方法图标获取');
            },

            // 关闭统计面板
            closeStatistics() {
                this.$emit('close');
            },

            // 导出统计数据
            exportStats() {
                return safeExecute(() => {
                    const data = {
                        timestamp: new Date().toISOString(),
                        overview: this.comprehensiveStats.overview,
                        categories: this.categoryDistribution,
                        quality: this.categoryQuality,
                        time: this.timeDistribution,
                        content: this.contentQuality
                    };
                    
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `news-stats-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, '统计数据导出');
            }
        },
        template: template || `
            <div v-if="visible" class="enhanced-statistics-overlay" @click.self="closeStatistics">
                <div class="enhanced-statistics-panel">
                    <div class="statistics-header">
                        <h3>新闻数据分析</h3>
                        <div class="header-actions">
                            <button @click="exportStats" class="export-btn" title="导出数据">
                                <i class="fas fa-download"></i>
                            </button>
                            <button @click="closeStatistics" class="close-btn" title="关闭">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="statistics-content">
                        <!-- 概览统计 -->
                        <div class="stats-section">
                            <h4>概览统计</h4>
                            <div class="overview-grid">
                                <div class="stat-card">
                                    <div class="stat-value">{{ formatNumber(comprehensiveStats.overview.totalNews) }}</div>
                                    <div class="stat-label">总新闻数</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value">{{ comprehensiveStats.overview.totalCategories }}</div>
                                    <div class="stat-label">分类数量</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value">{{ (comprehensiveStats.overview.averageConfidence * 100).toFixed(1) }}%</div>
                                    <div class="stat-label">平均置信度</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value">{{ comprehensiveStats.overview.contentQuality }}%</div>
                                    <div class="stat-label">内容质量</div>
                                </div>
                            </div>
                        </div>

                        <!-- 分类分布 -->
                        <div class="stats-section">
                            <h4>分类分布</h4>
                            <div class="category-list">
                                <div v-for="category in categoryDistribution.slice(0, 10)" :key="category.key" class="category-item">
                                    <div class="category-info">
                                        <i :class="category.icon" :style="{ color: category.color }"></i>
                                        <span class="category-title">{{ category.title }}</span>
                                    </div>
                                    <div class="category-stats">
                                        <span class="category-count">{{ category.count }}</span>
                                        <span class="category-percentage">{{ category.percentage }}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 质量分析 -->
                        <div class="stats-section">
                            <h4>分类质量分析</h4>
                            <div class="quality-breakdown">
                                <div class="quality-item">
                                    <div class="quality-label">高质量</div>
                                    <div class="quality-bar">
                                        <div class="quality-fill" :style="{ 
                                            width: formatPercentage(comprehensiveStats.qualityBreakdown.high, Object.keys(categoryQuality).length),
                                            backgroundColor: '#4caf50'
                                        }"></div>
                                    </div>
                                    <div class="quality-count">{{ comprehensiveStats.qualityBreakdown.high }}</div>
                                </div>
                                <div class="quality-item">
                                    <div class="quality-label">中等质量</div>
                                    <div class="quality-bar">
                                        <div class="quality-fill" :style="{ 
                                            width: formatPercentage(comprehensiveStats.qualityBreakdown.medium, Object.keys(categoryQuality).length),
                                            backgroundColor: '#ff9800'
                                        }"></div>
                                    </div>
                                    <div class="quality-count">{{ comprehensiveStats.qualityBreakdown.medium }}</div>
                                </div>
                                <div class="quality-item">
                                    <div class="quality-label">低质量</div>
                                    <div class="quality-bar">
                                        <div class="quality-fill" :style="{ 
                                            width: formatPercentage(comprehensiveStats.qualityBreakdown.low, Object.keys(categoryQuality).length),
                                            backgroundColor: '#f44336'
                                        }"></div>
                                    </div>
                                    <div class="quality-count">{{ comprehensiveStats.qualityBreakdown.low }}</div>
                                </div>
                            </div>
                        </div>

                        <!-- 时间分析 -->
                        <div class="stats-section">
                            <h4>时间分布分析</h4>
                            <div class="time-insights">
                                <div class="time-group">
                                    <h5>高峰时段</h5>
                                    <div class="peak-hours">
                                        <div v-for="peak in comprehensiveStats.timeInsights.peakHours" :key="peak.hour" class="peak-item">
                                            <span class="peak-time">{{ peak.hour }}:00</span>
                                            <span class="peak-count">{{ peak.count }}条</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="time-group">
                                    <h5>活跃日期</h5>
                                    <div class="peak-days">
                                        <div v-for="peak in comprehensiveStats.timeInsights.peakDays" :key="peak.day" class="peak-item">
                                            <span class="peak-day">{{ peak.day }}</span>
                                            <span class="peak-count">{{ peak.count }}条</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 内容质量 -->
                        <div class="stats-section">
                            <h4>内容质量分析</h4>
                            <div class="content-insights">
                                <div class="content-item">
                                    <i class="fas fa-file-text"></i>
                                    <span class="content-label">有内容</span>
                                    <span class="content-value">{{ contentQuality.withContent }}条</span>
                                </div>
                                <div class="content-item">
                                    <i class="fas fa-quote-left"></i>
                                    <span class="content-label">有摘要</span>
                                    <span class="content-value">{{ contentQuality.withExcerpt }}条</span>
                                </div>
                                <div class="content-item">
                                    <i class="fas fa-image"></i>
                                    <span class="content-label">有图片</span>
                                    <span class="content-value">{{ contentQuality.withImages }}条</span>
                                </div>
                                <div class="content-item">
                                    <i class="fas fa-link"></i>
                                    <span class="content-label">有链接</span>
                                    <span class="content-value">{{ contentQuality.withLinks }}条</span>
                                </div>
                                <div class="content-item">
                                    <i class="fas fa-ruler"></i>
                                    <span class="content-label">平均长度</span>
                                    <span class="content-value">{{ contentQuality.averageLength }}字符</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
    };
};

// 初始化组件并全局暴露
(async function initComponent() {
    try {
        const EnhancedStatistics = await createEnhancedStatistics();
        window.EnhancedStatistics = EnhancedStatistics;
        
        // 触发自定义事件，通知组件已加载完成
        window.dispatchEvent(new CustomEvent('EnhancedStatisticsLoaded', { detail: EnhancedStatistics }));
        
        console.log('[EnhancedStatistics] 组件初始化完成');
    } catch (error) {
        console.error('EnhancedStatistics 组件初始化失败:', error);
    }
})();
