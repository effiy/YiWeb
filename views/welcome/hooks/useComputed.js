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

    // 辅助函数：过滤卡片
    const filterCards = (cards, query) => {
        if (!query) return cards;
        
        const lowerQuery = query.toLowerCase();
        return cards.filter(card => {
            if (!card) return false;
            
            // 搜索标题
            if (card.title && card.title.toLowerCase().includes(lowerQuery)) {
                return true;
            }
            
            // 搜索描述
            if (card.description && card.description.toLowerCase().includes(lowerQuery)) {
                return true;
            }
            
            // 搜索徽章
            if (card.badge && card.badge.toLowerCase().includes(lowerQuery)) {
                return true;
            }
            
            // 搜索提示
            if (card.hint && card.hint.toLowerCase().includes(lowerQuery)) {
                return true;
            }
            
            // 搜索特性
            if (card.features && Array.isArray(card.features)) {
                for (const feature of card.features) {
                    if (feature.name && feature.name.toLowerCase().includes(lowerQuery)) {
                        return true;
                    }
                    if (feature.desc && feature.desc.toLowerCase().includes(lowerQuery)) {
                        return true;
                    }
                    if (feature.icon && feature.icon.toLowerCase().includes(lowerQuery)) {
                        return true;
                    }
                }
            }
            
            // 搜索统计
            if (card.stats && Array.isArray(card.stats)) {
                for (const stat of card.stats) {
                    if (stat.number && stat.number.toString().toLowerCase().includes(lowerQuery)) {
                        return true;
                    }
                    if (stat.label && stat.label.toLowerCase().includes(lowerQuery)) {
                        return true;
                    }
                }
            }
            
            // 搜索标签
            if (card.tags && Array.isArray(card.tags)) {
                for (const tag of card.tags) {
                    if (tag.name && tag.name.toLowerCase().includes(lowerQuery)) {
                        return true;
                    }
                }
            }
            
            return false;
        });
    };

    return {
        /**
         * 过滤后的功能卡片
         * 根据搜索查询进行过滤
         */
        filteredFeatureCards: computed(() => {
            return filterCards(featureCards.value, searchQuery.value);
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
        filteredFeatureCardsCount: computed(() => {
            return filterCards(featureCards.value, searchQuery.value).length;
        }),

        /**
         * 是否有过滤后的功能卡片
         */
        hasFilteredFeatureCards: computed(() => {
            return filterCards(featureCards.value, searchQuery.value).length > 0;
        }),
        
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
                ),
                // 搜索标签
                ...(card.tags || []).map(tag => 
                    tag.name || ''
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

        /**
         * 标签统计信息
         */
        tagStats: computed(() => {
            const tagFrequency = {};
            let totalTags = 0;
            
            featureCards.value.forEach(card => {
                if (card.tags && Array.isArray(card.tags)) {
                    card.tags.forEach(tag => {
                        if (tag.name) {
                            const tagName = tag.name.toLowerCase();
                            tagFrequency[tagName] = (tagFrequency[tagName] || 0) + 1;
                            totalTags++;
                        }
                    });
                }
            });
            
            const uniqueTags = Object.keys(tagFrequency).length;
            
            return {
                totalTags,
                uniqueTags,
                tagFrequency,
                mostUsedTags: Object.entries(tagFrequency)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10)
                    .map(([tag, count]) => ({ tag, count }))
            };
        }),

        /**
         * 所有标签列表
         */
        allTags: computed(() => {
            const tags = new Set();
            
            featureCards.value.forEach(card => {
                if (card.tags && Array.isArray(card.tags)) {
                    card.tags.forEach(tag => {
                        if (tag.name) {
                            tags.add(tag.name.toLowerCase());
                        }
                    });
                }
            });
            
            return Array.from(tags).sort();
        }),

        /**
         * 按标签分组的卡片
         */
        cardsByTag: computed(() => {
            const grouped = {};
            
            featureCards.value.forEach(card => {
                if (card.tags && Array.isArray(card.tags)) {
                    card.tags.forEach(tag => {
                        if (tag.name) {
                            const tagName = tag.name.toLowerCase();
                            if (!grouped[tagName]) {
                                grouped[tagName] = [];
                            }
                            grouped[tagName].push(card);
                        }
                    });
                }
            });
            
            return grouped;
        })


    };
};


