// author: liangliang

import { getData, deleteData } from '/apis/index.js';
import { safeExecuteAsync } from '/utils/error.js';

    // 兼容Vue2和Vue3的ref获取方式
    const vueRef = typeof Vue !== 'undefined' && Vue.ref ? Vue.ref : (val) => ({ value: val });
    
    // 确保Vue已加载
    if (typeof Vue === 'undefined') {
        console.error('[Store] Vue未加载，无法创建响应式数据');
        throw new Error('Vue未加载');
    }

/**
 * 数据存储工厂函数
 * 管理功能卡片数据、加载状态和错误信息
 * @returns {Object} store对象，包含featureCards, loading, error, loadFeatureCards方法
 */
export const createStore = () => {
    const fromSystem = vueRef(null)
    // 功能卡片数据 - 使用Vue的响应式系统
    const featureCards = vueRef([]);
    // 搜索查询
    const searchQuery = vueRef('');
    // 加载状态
    const loading = vueRef(true); // 初始化为true，表示正在加载
    // 错误信息
    const error = vueRef(null);
    
    // 导航分类过滤器配置
    const categoryFilters = vueRef([
        {
            id: 'aicr',
            label: 'aicr',
            icon: 'fas fa-globe',
            ariaLabel: '网址管理',
            link: '/views/aicr/index.html',
            description: 'AI代码审查工具'
        },
        {
            id: 'news',
            label: 'news',
            icon: 'fas fa-newspaper',
            ariaLabel: '新闻博客',
            link: '/views/news/index.html',
            description: '新闻资讯管理'
        },
        {
            id: 'shortcuts',
            label: 'shortcuts',
            icon: 'fas fa-keyboard',
            ariaLabel: '快捷键',
            link: '/views/shortcuts/index.html',
            description: '快捷键配置管理'
        },
        {
            id: 'commands',
            label: 'commands',
            icon: 'fas fa-terminal',
            ariaLabel: '命令行',
            link: '/views/commands/index.html',
            description: '命令行工具集合'
        },
        {
            id: 'websites',
            label: 'websites',
            icon: 'fas fa-globe',
            ariaLabel: '网址管理',
            link: '/views/websites/index.html',
            description: '网址收藏管理'
        },
        {
            id: 'tasks',
            label: 'tasks',
            icon: 'fas fa-tasks',
            ariaLabel: '任务管理',
            link: '/views/tasks/index.html',
            description: '任务创建和跟踪'
        }
    ]);

    /**
     * 强制触发Vue响应式更新
     * @param {Array} newData - 新数据
     */
    const updateFeatureCards = (newData) => {
        if (Array.isArray(newData)) {
            // 过滤掉无效的数据
            const validData = newData.filter(item => item && typeof item === 'object');
            console.log('[Store更新] 过滤后的有效数据数量:', validData.length);
            
            // 使用Vue的响应式更新方法
            if (Vue && Vue.nextTick) {
                Vue.nextTick(() => {
                    featureCards.value = [...validData];
                    console.log('[Store更新] 使用nextTick更新featureCards');
                });
            } else {
                // 备用方法：先清空再赋值
                featureCards.value = [];
                setTimeout(() => {
                    featureCards.value = [...validData];
                    console.log('[Store更新] 使用setTimeout更新featureCards');
                }, 0);
            }
        } else {
            console.warn('[Store更新] 数据不是数组格式:', newData);
            featureCards.value = [];
        }
    };

    /**
     * 从本地数组中移除卡片
     * @param {string} cardKey - 卡片ID
     * @returns {boolean} 是否成功移除
     */
    const removeCardFromLocal = (cardKey) => {
        if (!cardKey) {
            console.warn('[Store] cardKey为空，无法移除卡片');
            return false;
        }

        const currentCards = featureCards.value;
        const initialLength = currentCards.length;
        
        // 找到要删除的卡片索引
        const cardIndex = currentCards.findIndex(card => card && card.key === cardKey);
        
        if (cardIndex === -1) {
            console.warn('[Store] 未找到要删除的卡片:', cardKey);
            return false;
        }

        // 创建新数组，移除指定卡片
        const newCards = currentCards.filter((card, index) => index !== cardIndex);
        
        // 更新数组
        featureCards.value = newCards;
        
        console.log('[Store] 本地移除卡片成功:', {
            cardKey: cardKey,
            removedIndex: cardIndex,
            beforeCount: initialLength,
            afterCount: newCards.length,
            removedCard: currentCards[cardIndex]?.title || '未知卡片'
        });
        
        // 监控卡片数量变化
        console.log('[Store] 卡片数量监控 - 移除后:', {
            count: newCards.length,
            cards: newCards.map(card => ({
                title: card?.title,
                key: card?.key,
                type: card?.hasOwnProperty('key') ? 'MongoDB' : 'Local'
            }))
        });
        
        return true;
    };

    /**
     * 删除卡片数据
     * @param {string} cardKey - 卡片ID
     * @returns {Promise<boolean>} 删除是否成功
     */
    const deleteCard = async (cardKey) => {
        return safeExecuteAsync(async () => {
            console.log('[Store] 开始删除卡片:', cardKey);
            
            // 检查cardKey是否存在
            if (!cardKey) {
                console.error('[Store] cardKey为空');
                return false;
            }
            
            // 先检查卡片是否存在于本地数组中
            const cardExists = featureCards.value.some(card => card && card.key === cardKey);
            if (!cardExists) {
                console.warn('[Store] 卡片不存在于本地数组中:', cardKey);
                return false;
            }
            
            // 从MongoDB中删除数据
            const deleteResult = await deleteData(`${window.API_URL}/mongodb/?cname=goals&key=${cardKey}`);
            console.log('[Store] MongoDB删除结果:', deleteResult);
            
            // 验证删除结果
            if (deleteResult && deleteResult.success !== false) {
                // 删除成功后，从本地数组中移除卡片
                const localRemoved = removeCardFromLocal(cardKey);
                
                if (localRemoved) {
                    console.log('[Store] 卡片删除成功:', cardKey, '当前卡片数量:', featureCards.value.length);
                    return true;
                } else {
                    console.error('[Store] 本地移除卡片失败:', cardKey);
                    return false;
                }
            } else {
                throw new Error('API删除失败：' + (deleteResult?.message || '未知错误'));
            }
        }, '卡片删除', (errorInfo) => {
            console.error('[Store] 删除卡片失败:', errorInfo);
            error.value = errorInfo.message || '删除卡片失败';
            return false;
        });
    };

    /**
     * 异步加载功能卡片数据
     * 支持多次调用，自动处理加载状态和错误
     */
    const loadFeatureCards = async () => {
        console.log('[Store] 开始加载功能卡片数据');
        loading.value = true;
        error.value = null;
        try {
            // 支持本地mock和远程接口切换
            const featureCardsData = await getData(`${window.DATA_URL}/mock/welcome/featureCards.json`);
            console.log('[Store] 加载到的功能卡片数据:', featureCardsData);

            const systemPromptData = await getData(`${window.DATA_URL}/prompts/welcome/featureCards.txt`);

            const mongoResponse = await getData(`${window.API_URL}/mongodb/?cname=goals`);

            const mongoData = mongoResponse.data.list || [];

            console.log('[Store] 加载到的mongo数据:', mongoData);
            
            // 过滤掉无效的数据
            const validMongoData = mongoData.filter(item => item && item.key);
            console.log('[Store] 有效的mongo数据:', validMongoData);
            
            // 设置系统提示
            if (systemPromptData) {
                fromSystem.value = systemPromptData + JSON.stringify(featureCardsData);
                console.log('[Store] 成功设置fromSystem');
                console.log('[Store] 加载到的系统提示数据:', systemPromptData);
            } else {
                console.warn('[Store] 系统提示数据为空');
                fromSystem.value = null;
            }
            
            // 确保featureCardsData是数组
            const mockData = Array.isArray(featureCardsData) ? featureCardsData : [];
            
            // 合并mock数据和MongoDB数据，并确保视图实时响应
            const combinedData = [...mockData, ...validMongoData];
            
            // 直接更新响应式数据
            featureCards.value = combinedData;
            console.log('[Store] 更新featureCards，数量:', combinedData.length);
            

            
            console.log('[Store] 合并后的总数据:', combinedData);
        } catch (err) {
            console.error('[Store] 加载数据失败:', err);
            error.value = err && err.message ? err.message : '加载数据失败';
            featureCards.value = [];
            fromSystem.value = null;
        } finally {
            loading.value = false;
            console.log('[Store] 数据加载完成，当前状态:', {
                featureCardsLength: featureCards.value.length,
                fromSystem: fromSystem.value ? '已设置' : '未设置',
                loading: loading.value,
                error: error.value
            });
        }
    };

    /**
     * 设置搜索查询
     * @param {string} query - 搜索查询
     */
    const setSearchQuery = (query) => {
        if (typeof query === 'string') {
            searchQuery.value = query.trim();
        }
    };

    /**
     * 清除搜索
     */
    const clearSearch = () => {
        searchQuery.value = '';
    };

    /**
     * 清除错误
     */
    const clearError = () => {
        error.value = null;
    };

    // 延迟初始化加载，确保Vue应用已挂载
    setTimeout(() => {
        loadFeatureCards();
    }, 100);

    // 便于扩展：后续可添加更多数据和方法
    return {
        featureCards,   // 功能卡片数据
        searchQuery,    // 搜索查询
        loading,        // 加载状态
        error,          // 错误信息
        fromSystem,     // 系统提示信息
        categoryFilters, // 导航分类过滤器配置
        updateFeatureCards,  // 更新方法
        deleteCard,     // 删除卡片方法
        removeCardFromLocal, // 本地移除卡片方法
        loadFeatureCards, // 重新加载数据方法
        setSearchQuery,  // 设置搜索查询
        clearSearch,     // 清除搜索
        clearError       // 清除错误
    };
}





