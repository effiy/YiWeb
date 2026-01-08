/**
 * 标签管理插件
 * 提供标签的关联、搜索、统计等高级功能
 * @author liangliang
 */

class TagManager {
    constructor() {
        this.tagConnections = new Map(); // 标签关联关系
        this.tagHistory = new Map(); // 标签使用历史
        this.tagSuggestions = new Set(); // 标签建议
        this.init();
    }

    /**
     * 初始化标签管理器
     */
    init() {
        console.log('[TagManager] 初始化标签管理器');
        this.loadTagData();
        this.setupEventListeners();
    }

    /**
     * 加载标签数据
     */
    loadTagData() {
        try {
            // 从localStorage加载标签数据
            const savedConnections = localStorage.getItem('tagConnections');
            if (savedConnections) {
                this.tagConnections = new Map(JSON.parse(savedConnections));
            }

            const savedHistory = localStorage.getItem('tagHistory');
            if (savedHistory) {
                this.tagHistory = new Map(JSON.parse(savedHistory));
            }

            console.log('[TagManager] 标签数据加载完成');
        } catch (error) {
            console.error('[TagManager] 加载标签数据失败:', error);
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 监听标签变化
        document.addEventListener('tagChanged', this.handleTagChange.bind(this));
        
        // 监听标签搜索
        document.addEventListener('tagSearch', this.handleTagSearch.bind(this));
        
        // 监听标签关联
        document.addEventListener('tagConnect', this.handleTagConnect.bind(this));
    }

    /**
     * 处理标签变化
     */
    handleTagChange(event) {
        const { card, tag, action } = event.detail;
        this.updateTagHistory(tag.name, action);
        this.updateTagSuggestions(tag.name);
        this.saveTagData();
    }

    /**
     * 处理标签搜索
     */
    handleTagSearch(event) {
        const { query } = event.detail;
        const results = this.searchTags(query);
        event.detail.results = results;
    }

    /**
     * 处理标签关联
     */
    handleTagConnect(event) {
        const { sourceTag, targetTag, strength } = event.detail;
        this.createTagConnection(sourceTag, targetTag, strength);
        this.saveTagData();
    }

    /**
     * 创建标签关联
     * @param {string} sourceTag - 源标签
     * @param {string} targetTag - 目标标签
     * @param {number} strength - 关联强度 (0-1)
     */
    createTagConnection(sourceTag, targetTag, strength = 0.5) {
        const key = `${sourceTag.toLowerCase()}-${targetTag.toLowerCase()}`;
        const reverseKey = `${targetTag.toLowerCase()}-${sourceTag.toLowerCase()}`;
        
        this.tagConnections.set(key, {
            source: sourceTag.toLowerCase(),
            target: targetTag.toLowerCase(),
            strength: strength,
            createdAt: new Date().toISOString(),
            usageCount: 1
        });

        this.tagConnections.set(reverseKey, {
            source: targetTag.toLowerCase(),
            target: sourceTag.toLowerCase(),
            strength: strength,
            createdAt: new Date().toISOString(),
            usageCount: 1
        });

        console.log('[TagManager] 创建标签关联:', { sourceTag, targetTag, strength });
    }

    /**
     * 获取标签关联
     * @param {string} tagName - 标签名称
     * @returns {Array} 关联的标签列表
     */
    getTagConnections(tagName) {
        const connections = [];
        const tagLower = tagName.toLowerCase();
        
        for (const [key, connection] of this.tagConnections) {
            if (connection.source === tagLower) {
                connections.push({
                    tag: connection.target,
                    strength: connection.strength,
                    usageCount: connection.usageCount,
                    createdAt: connection.createdAt
                });
            }
        }
        
        return connections.sort((a, b) => b.strength - a.strength);
    }

    /**
     * 更新标签历史
     * @param {string} tagName - 标签名称
     * @param {string} action - 操作类型
     */
    updateTagHistory(tagName, action) {
        const tagLower = tagName.toLowerCase();
        const now = new Date().toISOString();
        
        if (!this.tagHistory.has(tagLower)) {
            this.tagHistory.set(tagLower, {
                name: tagLower,
                firstUsed: now,
                lastUsed: now,
                usageCount: 0,
                actions: []
            });
        }
        
        const history = this.tagHistory.get(tagLower);
        history.lastUsed = now;
        history.usageCount++;
        history.actions.push({
            action: action,
            timestamp: now
        });
        
        // 只保留最近100次操作
        if (history.actions.length > 100) {
            history.actions = history.actions.slice(-100);
        }
    }

    /**
     * 更新标签建议
     * @param {string} tagName - 标签名称
     */
    updateTagSuggestions(tagName) {
        this.tagSuggestions.add(tagName.toLowerCase());
        
        // 限制建议数量
        if (this.tagSuggestions.size > 1000) {
            const suggestionsArray = Array.from(this.tagSuggestions);
            this.tagSuggestions = new Set(suggestionsArray.slice(-500));
        }
    }

    /**
     * 搜索标签
     * @param {string} query - 搜索查询
     * @returns {Array} 搜索结果
     */
    searchTags(query) {
        if (!query || query.length < 2) {
            return [];
        }
        
        const results = [];
        const queryLower = query.toLowerCase();
        
        // 搜索标签名称
        for (const tag of this.tagSuggestions) {
            if (tag.includes(queryLower)) {
                const history = this.tagHistory.get(tag);
                results.push({
                    type: 'tag',
                    name: tag,
                    relevance: this.calculateRelevance(tag, queryLower),
                    usageCount: history ? history.usageCount : 0,
                    lastUsed: history ? history.lastUsed : null
                });
            }
        }
        
        // 搜索标签关联
        for (const [key, connection] of this.tagConnections) {
            if (connection.source.includes(queryLower) || connection.target.includes(queryLower)) {
                const relatedTag = connection.source.includes(queryLower) ? connection.target : connection.source;
                const history = this.tagHistory.get(relatedTag);
                
                results.push({
                    type: 'related',
                    name: relatedTag,
                    relevance: connection.strength * 0.8,
                    connectionStrength: connection.strength,
                    usageCount: history ? history.usageCount : 0,
                    lastUsed: history ? history.lastUsed : null
                });
            }
        }
        
        // 去重并排序
        const uniqueResults = this.removeDuplicateResults(results);
        return uniqueResults.sort((a, b) => b.relevance - a.relevance).slice(0, 20);
    }

    /**
     * 计算相关性分数
     * @param {string} tag - 标签名称
     * @param {string} query - 搜索查询
     * @returns {number} 相关性分数
     */
    calculateRelevance(tag, query) {
        let relevance = 0;
        
        // 完全匹配
        if (tag === query) {
            relevance += 1.0;
        }
        // 开头匹配
        else if (tag.startsWith(query)) {
            relevance += 0.8;
        }
        // 包含匹配
        else if (tag.includes(query)) {
            relevance += 0.6;
        }
        
        // 考虑使用频率
        const history = this.tagHistory.get(tag);
        if (history) {
            relevance += Math.min(history.usageCount * 0.01, 0.3);
        }
        
        return Math.min(relevance, 1.0);
    }

    /**
     * 移除重复结果
     * @param {Array} results - 搜索结果
     * @returns {Array} 去重后的结果
     */
    removeDuplicateResults(results) {
        const seen = new Set();
        return results.filter(result => {
            const key = result.name;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * 获取标签统计信息
     * @returns {Object} 统计信息
     */
    getTagStats() {
        const stats = {
            totalTags: this.tagSuggestions.size,
            totalConnections: this.tagConnections.size / 2, // 每个连接存储两次
            totalUsage: 0,
            mostUsedTags: [],
            recentTags: [],
            tagConnections: []
        };
        
        // 计算使用统计
        for (const [tag, history] of this.tagHistory) {
            stats.totalUsage += history.usageCount;
        }
        
        // 最常用标签
        stats.mostUsedTags = Array.from(this.tagHistory.values())
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, 10)
            .map(h => ({ name: h.name, count: h.usageCount }));
        
        // 最近使用的标签
        stats.recentTags = Array.from(this.tagHistory.values())
            .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
            .slice(0, 10)
            .map(h => ({ name: h.name, lastUsed: h.lastUsed }));
        
        // 标签关联统计
        const connectionStats = new Map();
        for (const [key, connection] of this.tagConnections) {
            if (!key.includes('-')) continue;
            
            const source = connection.source;
            if (!connectionStats.has(source)) {
                connectionStats.set(source, 0);
            }
            connectionStats.set(source, connectionStats.get(source) + 1);
        }
        
        stats.tagConnections = Array.from(connectionStats.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([tag, count]) => ({ tag, connections: count }));
        
        return stats;
    }

    /**
     * 保存标签数据
     */
    saveTagData() {
        try {
            localStorage.setItem('tagConnections', JSON.stringify(Array.from(this.tagConnections.entries())));
            localStorage.setItem('tagHistory', JSON.stringify(Array.from(this.tagHistory.entries())));
            console.log('[TagManager] 标签数据保存完成');
        } catch (error) {
            console.error('[TagManager] 保存标签数据失败:', error);
        }
    }

    /**
     * 导出标签数据
     * @returns {Object} 导出的数据
     */
    exportTagData() {
        return {
            connections: Array.from(this.tagConnections.entries()),
            history: Array.from(this.tagHistory.entries()),
            suggestions: Array.from(this.tagSuggestions),
            exportTime: new Date().toISOString()
        };
    }

    /**
     * 导入标签数据
     * @param {Object} data - 导入的数据
     */
    importTagData(data) {
        try {
            if (data.connections) {
                this.tagConnections = new Map(data.connections);
            }
            if (data.history) {
                this.tagHistory = new Map(data.history);
            }
            if (data.suggestions) {
                this.tagSuggestions = new Set(data.suggestions);
            }
            
            this.saveTagData();
            console.log('[TagManager] 标签数据导入完成');
        } catch (error) {
            console.error('[TagManager] 导入标签数据失败:', error);
        }
    }

    /**
     * 清理过期数据
     */
    cleanupOldData() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        // 清理过期的标签历史
        for (const [tag, history] of this.tagHistory) {
            if (new Date(history.lastUsed) < thirtyDaysAgo && history.usageCount < 5) {
                this.tagHistory.delete(tag);
            }
        }
        
        // 清理过期的标签关联
        for (const [key, connection] of this.tagConnections) {
            if (new Date(connection.createdAt) < thirtyDaysAgo && connection.usageCount < 3) {
                this.tagConnections.delete(key);
            }
        }
        
        this.saveTagData();
        console.log('[TagManager] 过期数据清理完成');
    }
}

// 创建全局标签管理器实例
window.tagManager = new TagManager();

// 导出标签管理器
export default TagManager;

