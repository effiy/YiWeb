// 新闻缓存管理器 - 智能管理LocalStorage缓存
// 作者: lixuan

class NewsCacheManager {
    constructor() {
        this.cachePrefix = 'news_cache_';
        this.maxCacheSize = 4 * 1024 * 1024; // 4MB限制
        this.maxCacheAge = 7 * 24 * 60 * 60 * 1000; // 7天过期
        this.maxCacheItems = 30; // 最多缓存30天的数据
        this.compressionThreshold = 1024; // 1KB以上的数据进行压缩
    }

    /**
     * 获取LocalStorage使用情况
     */
    getStorageUsage() {
        let totalSize = 0;
        let cacheSize = 0;
        let cacheCount = 0;

        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const value = localStorage.getItem(key);
                const size = new Blob([value]).size;
                totalSize += size;

                if (key.startsWith(this.cachePrefix)) {
                    cacheSize += size;
                    cacheCount++;
                }
            }
        }

        return {
            totalSize,
            cacheSize,
            cacheCount,
            maxSize: this.maxCacheSize,
            usage: (totalSize / this.maxCacheSize * 100).toFixed(2)
        };
    }

    /**
     * 压缩数据
     */
    compressData(data) {
        const jsonString = JSON.stringify(data);
        
        // 简单的字符串压缩：移除不必要的空白和重复模式
        const compressed = jsonString
            .replace(/\s+/g, ' ')
            .replace(/\s*:\s*/g, ':')
            .replace(/\s*,\s*/g, ',')
            .replace(/\s*\{\s*/g, '{')
            .replace(/\s*\}\s*/g, '}')
            .replace(/\s*\[\s*/g, '[')
            .replace(/\s*\]\s*/g, ']');
        
        return {
            data: compressed,
            compressed: true,
            originalSize: jsonString.length,
            compressedSize: compressed.length,
            ratio: (1 - compressed.length / jsonString.length).toFixed(2)
        };
    }

    /**
     * 解压数据
     */
    decompressData(compressedInfo) {
        if (!compressedInfo.compressed) {
            return compressedInfo.data;
        }
        return JSON.parse(compressedInfo.data);
    }

    /**
     * 清理过期缓存
     */
    cleanExpiredCache() {
        const now = Date.now();
        const keysToRemove = [];

        for (let key in localStorage) {
            if (key.startsWith(this.cachePrefix)) {
                try {
                    const cacheData = JSON.parse(localStorage.getItem(key));
                    const cacheTime = cacheData.timestamp || 0;
                    
                    if (now - cacheTime > this.maxCacheAge) {
                        keysToRemove.push(key);
                    }
                } catch (e) {
                    // 无效的缓存数据，删除
                    keysToRemove.push(key);
                }
            }
        }

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`清理过期缓存: ${key}`);
        });

        return keysToRemove.length;
    }

    /**
     * 清理最旧的缓存
     */
    cleanOldestCache(count = 5) {
        const cacheItems = [];

        // 收集所有缓存项和时间戳
        for (let key in localStorage) {
            if (key.startsWith(this.cachePrefix)) {
                try {
                    const cacheData = JSON.parse(localStorage.getItem(key));
                    cacheItems.push({
                        key,
                        timestamp: cacheData.timestamp || 0,
                        size: new Blob([localStorage.getItem(key)]).size
                    });
                } catch (e) {
                    // 无效数据，标记删除
                    cacheItems.push({
                        key,
                        timestamp: 0,
                        size: 0
                    });
                }
            }
        }

        // 按时间排序，删除最旧的项目
        cacheItems.sort((a, b) => a.timestamp - b.timestamp);
        const itemsToRemove = cacheItems.slice(0, count);

        itemsToRemove.forEach(item => {
            localStorage.removeItem(item.key);
            console.log(`清理旧缓存: ${item.key} (${(item.size / 1024).toFixed(2)}KB)`);
        });

        return itemsToRemove.length;
    }

    /**
     * 检查缓存数量限制
     */
    enforceItemLimit() {
        const usage = this.getStorageUsage();
        
        if (usage.cacheCount > this.maxCacheItems) {
            const excessCount = usage.cacheCount - this.maxCacheItems;
            this.cleanOldestCache(excessCount);
        }
    }

    /**
     * 智能缓存存储
     */
    setCache(dateStr, newsData) {
        try {
            // 1. 清理过期缓存
            this.cleanExpiredCache();

            // 2. 检查数量限制
            this.enforceItemLimit();

            // 3. 准备缓存数据
            const cacheKey = `${this.cachePrefix}${dateStr}`;
            const cacheData = {
                data: newsData,
                timestamp: Date.now(),
                dateStr: dateStr,
                count: newsData.length
            };

            // 4. 压缩数据（如果需要）
            const dataSize = new Blob([JSON.stringify(cacheData)]).size;
            let finalData = cacheData;

            if (dataSize > this.compressionThreshold) {
                const compressed = this.compressData(cacheData);
                finalData = {
                    ...compressed,
                    timestamp: Date.now(),
                    dateStr: dateStr
                };
                console.log(`数据压缩: ${dateStr}, 原始大小: ${(compressed.originalSize / 1024).toFixed(2)}KB, 压缩后: ${(compressed.compressedSize / 1024).toFixed(2)}KB, 压缩率: ${compressed.ratio}%`);
            }

            // 5. 检查存储空间
            const usage = this.getStorageUsage();
            const estimatedSize = new Blob([JSON.stringify(finalData)]).size;

            if (usage.totalSize + estimatedSize > this.maxCacheSize) {
                console.warn(`存储空间不足，当前使用: ${(usage.totalSize / 1024 / 1024).toFixed(2)}MB, 预计需要: ${(estimatedSize / 1024).toFixed(2)}KB`);
                
                // 尝试清理更多旧缓存
                const cleanedCount = this.cleanOldestCache(10);
                
                if (cleanedCount === 0) {
                    throw new Error('无法清理足够的存储空间');
                }
            }

            // 6. 存储缓存
            localStorage.setItem(cacheKey, JSON.stringify(finalData));
            console.log(`缓存成功: ${dateStr} (${(estimatedSize / 1024).toFixed(2)}KB, ${newsData.length}条新闻)`);

            return true;

        } catch (error) {
            console.error(`缓存失败: ${dateStr}`, error);

            // 如果是配额超出错误，尝试更激进的清理
            if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
                console.warn('配额超出，尝试清理所有旧缓存...');
                
                try {
                    // 清理所有7天前的缓存
                    this.cleanOldestCache(20);
                    
                    // 再次尝试存储
                    const cacheKey = `${this.cachePrefix}${dateStr}`;
                    const minimalData = {
                        data: newsData.slice(0, 50), // 只保留前50条新闻
                        timestamp: Date.now(),
                        dateStr: dateStr,
                        truncated: true
                    };
                    
                    localStorage.setItem(cacheKey, JSON.stringify(minimalData));
                    console.log(`缓存成功（截断版本）: ${dateStr} (${minimalData.data.length}条新闻)`);
                    return true;
                    
                } catch (retryError) {
                    console.error('二次缓存尝试失败:', retryError);
                    return false;
                }
            }

            return false;
        }
    }

    /**
     * 获取缓存
     */
    getCache(dateStr) {
        try {
            const cacheKey = `${this.cachePrefix}${dateStr}`;
            const cachedData = localStorage.getItem(cacheKey);
            
            if (!cachedData) {
                return null;
            }

            const parsed = JSON.parse(cachedData);
            
            // 检查是否过期
            if (Date.now() - parsed.timestamp > this.maxCacheAge) {
                localStorage.removeItem(cacheKey);
                return null;
            }

            // 解压数据（如果需要）
            if (parsed.compressed) {
                const decompressed = this.decompressData(parsed);
                return decompressed.data;
            }

            return parsed.data;

        } catch (error) {
            console.error(`读取缓存失败: ${dateStr}`, error);
            
            // 清理损坏的缓存
            const cacheKey = `${this.cachePrefix}${dateStr}`;
            localStorage.removeItem(cacheKey);
            return null;
        }
    }

    /**
     * 清理所有缓存
     */
    clearAllCache() {
        const keysToRemove = [];
        
        for (let key in localStorage) {
            if (key.startsWith(this.cachePrefix)) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`清理了 ${keysToRemove.length} 个缓存项`);
        
        return keysToRemove.length;
    }

    /**
     * 获取缓存统计信息
     */
    getCacheStats() {
        const usage = this.getStorageUsage();
        const cacheItems = [];

        for (let key in localStorage) {
            if (key.startsWith(this.cachePrefix)) {
                try {
                    const cacheData = JSON.parse(localStorage.getItem(key));
                    const dateStr = key.replace(this.cachePrefix, '');
                    const size = new Blob([localStorage.getItem(key)]).size;
                    
                    cacheItems.push({
                        date: dateStr,
                        timestamp: cacheData.timestamp,
                        size: size,
                        count: cacheData.count || 0,
                        compressed: cacheData.compressed || false,
                        truncated: cacheData.truncated || false
                    });
                } catch (e) {
                    // 忽略无效数据
                }
            }
        }

        return {
            usage,
            items: cacheItems.sort((a, b) => b.timestamp - a.timestamp),
            totalItems: cacheItems.length,
            totalNews: cacheItems.reduce((sum, item) => sum + item.count, 0)
        };
    }
}

// 创建全局缓存管理器实例
window.NewsCacheManager = new NewsCacheManager();

// 导出缓存管理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NewsCacheManager;
} 