// author: liangliang

// 使用动态导入，与comments代码保持一致
import { safeExecuteAsync } from '/utils/error.js';
import { logInfo, logWarn, logError } from '/utils/log.js';
import { buildTimeQueryParams, validateTimeParams, formatTimeRangeText } from '/utils/timeParams.js';
import { getQuarters } from '/utils/timeSelectors.js';

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
    // 功能卡片数据
    const featureCards = vueRef([]);
    // 搜索查询
    const searchQuery = vueRef('');
    // 加载状态
    const loading = vueRef(true); // 初始化为true，表示正在加载
    // 错误信息
    const error = vueRef(null);
    
    // 获取当前日期信息
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // getMonth()返回0-11，需要+1
    const currentQuarter = Math.ceil(currentMonth / 3); // 1-3月为Q1，4-6月为Q2，依此类推
    
    // 时间选择器相关状态 - 默认选中当前年月
    const selectedYear = vueRef(currentYear.toString());
    const selectedQuarter = vueRef(`Q${currentQuarter}`);
    const selectedMonth = vueRef(currentMonth.toString().padStart(2, '0')); // 格式化为两位数
    const selectedWeek = vueRef(''); // 周选择器
    const selectedDay = vueRef(''); // 日选择器
    
    // 全部选择状态跟踪
    const isAllSelected = vueRef(false);
    
    // 年度列表（可以根据需要动态生成）
    const years = vueRef([]);
    
    // 季度列表
    const quarters = vueRef(getQuarters());

    /**
     * 强制触发Vue响应式更新
     * @param {Array} newData - 新数据
     */
    const updateFeatureCards = (newData) => {
        if (Array.isArray(newData)) {
            // 过滤掉无效的数据
            const validData = newData.filter(item => item && typeof item === 'object');
            logInfo('[Store更新] 过滤后的有效数据数量:', validData.length);
            
            // 使用Vue的响应式更新方法
            if (Vue && Vue.nextTick) {
                Vue.nextTick(() => {
                    featureCards.value = [...validData];
                    logInfo('[Store更新] 使用nextTick更新featureCards');
                });
            } else {
                // 备用方法：先清空再赋值
                featureCards.value = [];
                setTimeout(() => {
                    featureCards.value = [...validData];
                    logInfo('[Store更新] 使用setTimeout更新featureCards');
                }, 0);
            }
        } else {
            logWarn('[Store更新] 数据不是数组格式:', newData);
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
            logWarn('[Store] cardKey为空，无法移除卡片');
            return false;
        }

        const currentCards = featureCards.value;
        const initialLength = currentCards.length;
        
        // 找到要删除的卡片索引
        const cardIndex = currentCards.findIndex(card => card && card.key === cardKey);
        
        if (cardIndex === -1) {
            logWarn('[Store] 未找到要删除的卡片:', cardKey);
            return false;
        }

        // 创建新数组，移除指定卡片
        const newCards = currentCards.filter((card, index) => index !== cardIndex);
        
        // 更新数组
        featureCards.value = newCards;
        
        logInfo('[Store] 本地移除卡片成功:', {
            cardKey: cardKey,
            removedIndex: cardIndex,
            beforeCount: initialLength,
            afterCount: newCards.length,
            removedCard: currentCards[cardIndex]?.title || '未知卡片'
        });
        
        // 监控卡片数量变化
        logInfo('[Store] 卡片数量监控 - 移除后:', {
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
            logInfo('[Store] 开始删除卡片:', cardKey);
            
            // 检查cardKey是否存在
            if (!cardKey) {
                logError('[Store] cardKey为空');
                return false;
            }
            
            // 先检查卡片是否存在于本地数组中
            const cardExists = featureCards.value.some(card => card && card.key === cardKey);
            if (!cardExists) {
                logWarn('[Store] 卡片不存在于本地数组中:', cardKey);
                return false;
            }
            
            // 从MongoDB中删除数据
            // 使用动态导入，与comments代码保持一致
            const { deleteData } = await import('/apis/modules/crud.js');
            const deleteResult = await deleteData(`${window.API_URL}/mongodb/?cname=goals&key=${cardKey}`);
            logInfo('[Store] MongoDB删除结果:', deleteResult);
            
            // 验证删除结果
            if (deleteResult && deleteResult.success !== false) {
                // 删除成功后，从本地数组中移除卡片
                const localRemoved = removeCardFromLocal(cardKey);
                
                if (localRemoved) {
                    logInfo('[Store] 卡片删除成功:', cardKey, '当前卡片数量:', featureCards.value.length);
                    return true;
                } else {
                    logError('[Store] 本地移除卡片失败:', cardKey);
                    return false;
                }
            } else {
                throw new Error('API删除失败：' + (deleteResult?.message || '未知错误'));
            }
        }, '卡片删除', (errorInfo) => {
            logError('[Store] 删除卡片失败:', errorInfo);
            error.value = errorInfo.message || '删除卡片失败';
            return false;
        });
    };

    /**
     * 异步加载功能卡片数据
     * 支持多次调用，自动处理加载状态和错误
     */
    let isLoadingFeatureCards = false; // 防重复加载标志
    
    const loadFeatureCards = async (forceReload = false) => {
        // 防止重复加载
        if (isLoadingFeatureCards && !forceReload) {
            logInfo('[Store] 正在加载中，跳过重复调用');
            return;
        }
        
        logInfo('[Store] 开始加载功能卡片数据');
        isLoadingFeatureCards = true;
        loading.value = true;
        error.value = null;
        
        try {
            // 使用动态导入，与comments代码保持一致
            const { getData } = await import('/apis/modules/crud.js');
            
            // 初始化年度列表（生成最近10年）
            const yearsList = [];
            for (let i = currentYear - 5; i <= currentYear + 5; i++) {
                yearsList.push(i);
            }
            years.value = yearsList;
            
            logInfo('[Store] 时间选择器默认值设置:', {
                year: selectedYear.value,
                quarter: selectedQuarter.value,
                month: selectedMonth.value,
                currentDate: currentDate.toISOString().split('T')[0]
            });
            
            const systemPromptData = await getData(`/prompts/target/featureCards.txt`);

            // 构建查询URL，加入时间参数
            let mongoUrl = `${window.API_URL}/mongodb/?cname=goals`;
            
            // 检查是否为查询全部数据
            if (selectedYear.value) {
                // 验证时间参数并构建查询参数
                const timeValidation = validateTimeParams(
                    selectedYear.value, 
                    selectedQuarter.value, 
                    selectedMonth.value,
                    selectedWeek.value,
                    selectedDay.value
                );
                
                if (timeValidation.isValid) {
                    const timeParams = buildTimeQueryParams(
                        selectedYear.value, 
                        selectedQuarter.value, 
                        selectedMonth.value,
                        selectedWeek.value,
                        selectedDay.value
                    );
                    
                    if (timeParams) {
                        mongoUrl += `&${timeParams}`;
                        logInfo('[Store] 使用时间参数查询:', {
                            timeRange: formatTimeRangeText(selectedYear.value, selectedQuarter.value, selectedMonth.value, selectedWeek.value, selectedDay.value),
                            params: timeParams
                        });
                    }
                } else {
                    logWarn('[Store] 时间参数验证失败，使用默认查询:', timeValidation.errors);
                }
            } else {
                // 查询全部数据，不添加时间参数
                logInfo('[Store] 查询全部数据，不添加时间参数');
            }

            // 添加时间戳防止缓存干扰
            const timestamp = Date.now();
            const mongoResponse = await getData(mongoUrl, { 
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            const mongoData = mongoResponse.data.list || [];

            logInfo('[Store] 加载到的mongo数据:', mongoData);
            
            // 过滤掉无效的数据
            const validMongoData = mongoData.filter(item => item && item.key);
            logInfo('[Store] 有效的mongo数据:', validMongoData);
            
            // 设置系统提示
            if (systemPromptData) {
                fromSystem.value = systemPromptData;
                logInfo('[Store] 成功设置fromSystem');
                logInfo('[Store] 加载到的系统提示数据:', systemPromptData);
            } else {
                logWarn('[Store] 系统提示数据为空');
                fromSystem.value = null;
            }
            
            // 直接使用MongoDB数据
            featureCards.value = validMongoData;
            logInfo('[Store] 更新featureCards，数量:', validMongoData.length);
            
            logInfo('[Store] 最终数据:', validMongoData);
        } catch (err) {
            logError('[Store] 加载数据失败:', err);
            error.value = err && err.message ? err.message : '加载数据失败';
            featureCards.value = [];
            fromSystem.value = null;
        } finally {
            isLoadingFeatureCards = false;
            loading.value = false;
            logInfo('[Store] 数据加载完成，当前状态:', {
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
            // 时间选择器相关
            selectedYear,
            selectedQuarter, 
            selectedMonth,
            selectedWeek,   // 周选择器
            selectedDay,    // 日选择器
            years,
            quarters,
            isAllSelected,  // 全部选择状态
            updateFeatureCards,  // 更新方法
            deleteCard,     // 删除卡片方法
            removeCardFromLocal, // 本地移除卡片方法
            loadFeatureCards, // 重新加载数据方法
            setSearchQuery,  // 设置搜索查询
            clearSearch,     // 清除搜索
            clearError       // 清除错误
        };
}









