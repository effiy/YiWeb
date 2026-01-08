// author: liangliang

// 使用动态导入，与comments代码保持一致
import { safeExecuteAsync } from '/src/utils/error.js';
import { logInfo, logWarn, logError } from '/src/utils/log.js';
import { buildTimeQueryParams, validateTimeParams, formatTimeRangeText } from '/src/utils/timeParams.js';
import { getQuarters } from '/src/utils/timeSelectors.js';

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
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentQuarter = Math.ceil(currentMonth / 3);
    
    const selectedYear = vueRef('');
    const selectedQuarter = vueRef('');
    const selectedMonth = vueRef('');
    const selectedWeek = vueRef('');
    const selectedDay = vueRef('');
    
    const isAllSelected = vueRef(true);
    
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
            // 使用动态导入 GoalsService
            const { GoalsService } = await import('/src/services/modules/goals.js');
            const deleteResult = await GoalsService.delete(cardKey);
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
            const { getData } = await import('/src/services/modules/crud.js');
            
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
            
            const systemPromptData = await getData(`/src/assets/prompts/target/featureCards.txt`);

            // 使用动态导入 GoalsService
            const { GoalsService } = await import('/src/services/modules/goals.js');

            // 构建查询参数
            const params = {};
            
            // 检查是否为查询全部数据
            if (selectedYear.value) {
                // 验证时间参数
                const timeValidation = validateTimeParams(
                    selectedYear.value, 
                    selectedQuarter.value, 
                    selectedMonth.value,
                    selectedWeek.value,
                    selectedDay.value
                );
                
                if (timeValidation.isValid) {
                    params.year = selectedYear.value;
                    params.quarter = selectedQuarter.value;
                    params.month = selectedMonth.value;
                    params.week = selectedWeek.value;
                    params.day = selectedDay.value;
                    
                    logInfo('[Store] 使用时间参数查询:', {
                        timeRange: formatTimeRangeText(selectedYear.value, selectedQuarter.value, selectedMonth.value, selectedWeek.value, selectedDay.value),
                        params
                    });
                } else {
                    logWarn('[Store] 时间参数验证失败，使用默认查询:', timeValidation.errors);
                }
            } else {
                // 查询全部数据，不添加时间参数
                logInfo('[Store] 查询全部数据，不添加时间参数');
            }

            // 添加时间戳防止缓存干扰
            const timestamp = Date.now();
            const mongoResponse = await GoalsService.getList(params, { 
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
            
            // 调用 session 接口获取统计数据并更新 stat-number
            try {
                logInfo('[Store] ========== 开始统计流程 ==========');
                
                // 先收集所有卡片的 stat-label，用于调试
                const allStatLabels = new Set();
                validMongoData.forEach(card => {
                    if (card.stats && Array.isArray(card.stats)) {
                        card.stats.forEach(stat => {
                            if (stat.label) {
                                allStatLabels.add(stat.label);
                            }
                        });
                    }
                });
                logInfo('[Store] 所有需要统计的 stat-label:', Array.from(allStatLabels));
                
                logInfo('[Store] 开始调用服务接口获取会话统计数据');
                const url = (await import('/src/services/helper/requestHelper.js')).buildServiceUrl('query_documents', { cname: 'sessions' });
                const sessionResponse = await (await import('/src/services/modules/crud.js')).getData(url, {
                    cache: 'no-cache',
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                });
                
                logInfo('[Store] Session 接口原始返回数据:', JSON.stringify(sessionResponse, null, 2));
                
                // 处理 session 数据，统计 tags 中的 stat-label
                let sessionList = [];
                if (Array.isArray(sessionResponse)) {
                    sessionList = sessionResponse;
                } else if (sessionResponse?.data) {
                    if (Array.isArray(sessionResponse.data)) {
                        sessionList = sessionResponse.data;
                    } else if (sessionResponse.data?.list && Array.isArray(sessionResponse.data.list)) {
                        sessionList = sessionResponse.data.list;
                    }
                } else if (sessionResponse?.list && Array.isArray(sessionResponse.list)) {
                    sessionList = sessionResponse.list;
                }
                
                logInfo('[Store] Session 列表数量:', sessionList.length);
                logInfo('[Store] Session 列表前3条示例:', sessionList.slice(0, 3));
                
                // 规范化标签名称（去除空格、转小写，用于匹配）
                const normalizeTagName = (tagName) => {
                    if (!tagName) return '';
                    const str = String(tagName);
                    return str.trim().toLowerCase();
                };
                
                // 统计所有 stat-label 的出现次数（使用规范化后的键）
                const statLabelCounts = {};
                let totalTagsProcessed = 0;
                
                // 遍历所有 session 数据
                sessionList.forEach((session, index) => {
                    if (!session) return;
                    
                    // 支持多种 tags 格式
                    let tagsArray = [];
                    if (Array.isArray(session.tags)) {
                        tagsArray = session.tags;
                    } else if (typeof session.tags === 'string') {
                        // 如果是字符串，尝试分割
                        tagsArray = session.tags.split(',').map(t => t.trim()).filter(t => t);
                    } else if (session.tags) {
                        // 如果是其他类型，尝试转换
                        logWarn(`[Store] Session ${index} tags 格式异常:`, typeof session.tags, session.tags);
                        // 尝试将对象转换为数组
                        if (typeof session.tags === 'object' && !Array.isArray(session.tags)) {
                            tagsArray = [session.tags];
                        }
                    }
                    
                    if (tagsArray.length > 0) {
                        logInfo(`[Store] Session ${index} 有 ${tagsArray.length} 个 tags:`, tagsArray);
                    }
                    
                    tagsArray.forEach(tag => {
                        // 如果 tag 是字符串，直接使用；如果是对象，使用 name 或 label 字段
                        let tagName = '';
                        if (typeof tag === 'string') {
                            tagName = tag.trim();
                        } else if (tag && typeof tag === 'object') {
                            // 尝试多种可能的字段名
                            tagName = tag.name || tag.label || tag.value || tag.tag || tag.text || tag.title;
                            // 如果还是没有找到，尝试获取对象的第一个字符串值
                            if (!tagName) {
                                const values = Object.values(tag).filter(v => typeof v === 'string' && v.trim());
                                if (values.length > 0) {
                                    tagName = values[0].trim();
                                } else {
                                    tagName = String(tag);
                                }
                            }
                        } else if (tag !== null && tag !== undefined) {
                            tagName = String(tag).trim();
                        }
                        
                        if (tagName) {
                            // 使用规范化后的名称作为键进行统计
                            const normalizedKey = normalizeTagName(tagName);
                            if (normalizedKey) {
                                statLabelCounts[normalizedKey] = (statLabelCounts[normalizedKey] || 0) + 1;
                                totalTagsProcessed++;
                                if (statLabelCounts[normalizedKey] <= 3) {
                                    logInfo(`[Store] 统计标签 "${tagName}" (规范化: "${normalizedKey}")，当前计数: ${statLabelCounts[normalizedKey]}`);
                                }
                            } else {
                                logWarn(`[Store] 标签名称规范化后为空: "${tagName}"`);
                            }
                        } else {
                            logWarn(`[Store] Session ${index} 标签提取失败:`, tag);
                        }
                    });
                });
                
                logInfo(`[Store] 总共处理了 ${totalTagsProcessed} 个标签`);
                logInfo('[Store] 统计结果（规范化键）:', statLabelCounts);
                logInfo('[Store] 统计结果键列表:', Object.keys(statLabelCounts));
                
                // 特别检查 rules 标签的统计情况
                if (statLabelCounts['rules']) {
                    logInfo(`[Store] ✓ 成功统计到 "rules" 标签，计数: ${statLabelCounts['rules']}`);
                } else {
                    logWarn(`[Store] ✗ 未统计到 "rules" 标签，当前所有标签键:`, Object.keys(statLabelCounts));
                }
                
                // 更新每个卡片的 stat-number
                let updateCount = 0;
                validMongoData.forEach((card, cardIndex) => {
                    if (card.stats && Array.isArray(card.stats)) {
                        card.stats.forEach((stat, statIndex) => {
                            if (stat.label) {
                                // 规范化 stat.label 用于匹配
                                const normalizedLabel = normalizeTagName(stat.label);
                                
                                // 根据规范化后的 stat-label 查找对应的统计数量
                                const count = normalizedLabel ? (statLabelCounts[normalizedLabel] || 0) : 0;
                                
                                // 更新 stat-number
                                const oldNumber = stat.number || '0';
                                stat.number = count.toString();
                                updateCount++;
                                
                                // 特别关注 rules 标签的匹配情况
                                if (normalizedLabel === 'rules') {
                                    if (count > 0) {
                                        logInfo(`[Store] ✓ 成功匹配 "rules" 标签，卡片[${cardIndex}] "${card.title}" 统计项[${statIndex}]: ${oldNumber} -> ${count}`);
                                    } else {
                                        logWarn(`[Store] ✗ "rules" 标签匹配失败，卡片[${cardIndex}] "${card.title}" 统计项[${statIndex}]，可用键:`, Object.keys(statLabelCounts));
                                    }
                                }
                                
                                if (count > 0 || normalizedLabel) {
                                    logInfo(`[Store] 卡片[${cardIndex}] "${card.title}" 统计项[${statIndex}] "${stat.label}" (规范化: "${normalizedLabel}"): ${oldNumber} -> ${count}`);
                                }
                                
                                // 如果匹配失败，输出调试信息
                                if (count === 0 && normalizedLabel) {
                                    const matchingKeys = Object.keys(statLabelCounts).filter(k => k.includes(normalizedLabel) || normalizedLabel.includes(k));
                                    if (matchingKeys.length > 0) {
                                        logWarn(`[Store] 未找到精确匹配，但找到相似键:`, matchingKeys);
                                    } else if (normalizedLabel !== 'rules') {
                                        // 对于非 rules 标签，只在没有相似键时输出警告
                                        logWarn(`[Store] 标签 "${stat.label}" (规范化: "${normalizedLabel}") 未找到匹配，统计键列表:`, Object.keys(statLabelCounts));
                                    }
                                }
                            }
                        });
                    }
                });
                
                logInfo(`[Store] 共更新了 ${updateCount} 个统计项`);
                logInfo('[Store] ========== 统计流程完成 ==========');
            } catch (sessionErr) {
                logError('[Store] 调用 session 接口失败，使用原始统计数据:', sessionErr);
                logError('[Store] 错误堆栈:', sessionErr.stack);
                // 如果 session 接口调用失败，不影响卡片数据的显示，只是不更新统计数据
            }
            
            // 使用更新后的数据设置 featureCards（使用展开运算符确保响应式更新）
            // 深拷贝确保 Vue 能检测到变化
            const updatedCards = validMongoData.map(card => ({
                ...card,
                stats: card.stats ? card.stats.map(stat => ({
                    ...stat,
                    number: stat.number || '0'
                })) : []
            }));
            
            featureCards.value = updatedCards;
            logInfo('[Store] 更新featureCards，数量:', updatedCards.length);
            
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






