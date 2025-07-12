// API相关函数

import { getConfig } from '../../config/index.js';

export const newsApi = {
    async fetchNewsData(currentDate) {
        const newsConfig = getConfig('news');
        const dateStr = newsConfig.getDateString(currentDate);
        
        // 优先从缓存读取数据
        if (window.NewsCacheManager) {
            const cachedData = window.NewsCacheManager.getCache(dateStr);
            if (cachedData && cachedData.length > 0) {
                console.log(`从缓存加载数据: ${dateStr} (${cachedData.length}条新闻)`);
                return cachedData;
            }
        }

        // 缓存没有数据，从网络获取
        console.log(`从网络获取数据: ${dateStr}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), newsConfig.API_TIMEOUT);

        try {
            const response = await fetch(newsConfig.getApiUrl(currentDate), {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.status !== 200 || !data.data?.list) {
                throw new Error('数据格式错误');
            }

            // 使用智能缓存管理器缓存新闻数据
            if (window.NewsCacheManager) {
                const cacheSuccess = window.NewsCacheManager.setCache(dateStr, data.data.list);
                if (!cacheSuccess) {
                    console.warn('智能缓存失败，数据仍然可以正常使用');
                }
            } else {
                console.warn('缓存管理器未加载，跳过缓存');
            }

            return data.data.list;
        } catch (err) {
            clearTimeout(timeoutId);
            
            if (err.name === 'AbortError') {
                throw new Error('请求超时，请检查网络连接');
            }
            
            throw err;
        }
    }
}; 