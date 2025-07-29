/**
 * 计算属性组合式函数
 * 提供基于featureCards数据的常用计算属性
 * @author liangliang
 * 
 * @param {Object} store - 状态存储对象（包含featureCards等）
 * @returns {Object} 计算属性集合
 */



// 兼容Vue2和Vue3的computed获取方式
const computed = typeof Vue !== 'undefined' && Vue.computed ? Vue.computed : (fn) => fn;

export const useComputed = (store) => {
    const { featureCards, searchQuery, loading, error } = store;

    return {
        /**
         * 过滤后的功能卡片
         * 根据搜索查询进行过滤
         */
        filteredFeatureCards: computed(() => {
            let filtered = featureCards.value;

            // 根据搜索查询过滤
            if (searchQuery.value) {
                const query = searchQuery.value.toLowerCase();
                filtered = filtered.filter(card => {
                    if (!card) return false;
                    
                    // 搜索标题
                    if (card.title && card.title.toLowerCase().includes(query)) {
                        return true;
                    }
                    
                    // 搜索描述
                    if (card.description && card.description.toLowerCase().includes(query)) {
                        return true;
                    }
                    
                    // 搜索徽章
                    if (card.badge && card.badge.toLowerCase().includes(query)) {
                        return true;
                    }
                    
                    // 搜索提示
                    if (card.hint && card.hint.toLowerCase().includes(query)) {
                        return true;
                    }
                    
                    // 搜索特性
                    if (card.features && Array.isArray(card.features)) {
                        for (const feature of card.features) {
                            if (feature.name && feature.name.toLowerCase().includes(query)) {
                                return true;
                            }
                            if (feature.desc && feature.desc.toLowerCase().includes(query)) {
                                return true;
                            }
                            if (feature.icon && feature.icon.toLowerCase().includes(query)) {
                                return true;
                            }
                        }
                    }
                    
                    // 搜索统计
                    if (card.stats && Array.isArray(card.stats)) {
                        for (const stat of card.stats) {
                            if (stat.number && stat.number.toString().toLowerCase().includes(query)) {
                                return true;
                            }
                            if (stat.label && stat.label.toLowerCase().includes(query)) {
                                return true;
                            }
                        }
                    }
                    
                    return false;
                });
            }

            return filtered;
        }),

        /**
         * 功能卡片数量
         */
        featureCardsCount: computed(() => featureCards.value.length),
        
        /**
         * 是否有功能卡片
         */
        hasFeatureCards: computed(() => featureCards.value.length > 0),

        /**
         * 过滤后的卡片数量
         */
        filteredFeatureCardsCount: computed(() => filteredFeatureCards.value.length),

        /**
         * 是否有过滤后的功能卡片
         */
        hasFilteredFeatureCards: computed(() => filteredFeatureCards.value.length > 0),
        
        /**
         * 是否有搜索结果
         */
        hasSearchResults: computed(() => {
            const query = searchQuery.value.trim();
            if (!query) return true;
            
            return featureCards.value.some(card => {
                if (!card) return false;
                
                const searchableText = [
                    card.title || '',
                    card.description || '',
                    card.badge || '',
                    card.hint || '',
                    card.footerIcon || '',
                    // 搜索特性
                    ...(card.features || []).map(feature => 
                        `${feature.name || ''} ${feature.desc || ''} ${feature.icon || ''}`
                    ),
                    // 搜索统计
                    ...(card.stats || []).map(stat => 
                        `${stat.number || ''} ${stat.label || ''}`
                    )
                ].join(' ').toLowerCase();
                
                return searchableText.includes(query.toLowerCase());
            });
        }),



        /**
         * 搜索建议
         * 基于卡片标题和内容生成搜索建议
         */
        searchSuggestions: computed(() => {
            const suggestions = new Set();
            
            featureCards.value.forEach(card => {
                // 添加卡片标题中的关键词
                if (card.title) {
                    const titleWords = card.title.split(/[\s,，。.、]+/);
                    titleWords.forEach(word => {
                        if (word.length > 1) {
                            suggestions.add(word);
                        }
                    });
                }

                // 添加描述中的关键词
                if (card.description) {
                    const descWords = card.description.split(/[\s,，。.、]+/);
                    descWords.forEach(word => {
                        if (word.length > 1) {
                            suggestions.add(word);
                        }
                    });
                }

                // 添加特性中的关键词
                if (card.features && Array.isArray(card.features)) {
                    card.features.forEach(feature => {
                        if (feature.name) {
                            const featureWords = feature.name.split(/[\s,，。.、]+/);
                            featureWords.forEach(word => {
                                if (word.length > 1) {
                                    suggestions.add(word);
                                }
                            });
                        }
                    });
                }
            });

            return Array.from(suggestions).slice(0, 10);
        }),



        /**
         * 是否正在加载
         */
        isLoading: computed(() => loading.value),
        
        /**
         * 是否有错误
         */
        hasError: computed(() => error.value !== null),
        
        /**
         * 错误信息
         */
        errorMessage: computed(() => error.value),


    };
};

