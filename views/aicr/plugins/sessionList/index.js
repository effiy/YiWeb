/**
 * 会话列表组件
 * 参考 YiPet 项目的会话列表实现
 */

const { createApp, computed, ref } = Vue;

const SessionListComponent = {
    name: 'SessionList',
    props: {
        sessions: {
            type: Array,
            default: () => []
        },
        loading: {
            type: Boolean,
            default: false
        },
        error: {
            type: String,
            default: null
        },
        selectedTags: {
            type: Array,
            default: () => []
        },
        searchQuery: {
            type: String,
            default: ''
        },
        // 新增：标签过滤相关属性（参考 YiPet）
        tagFilterReverse: {
            type: Boolean,
            default: false
        },
        tagFilterNoTags: {
            type: Boolean,
            default: false
        },
        tagFilterExpanded: {
            type: Boolean,
            default: false
        },
        tagFilterVisibleCount: {
            type: Number,
            default: 8
        },
        tagFilterSearchKeyword: {
            type: String,
            default: ''
        }
    },
    emits: ['session-select', 'session-delete', 'session-create', 'tag-select', 'tag-clear', 'search-change', 'toggle-collapse', 
            'tag-filter-reverse', 'tag-filter-no-tags', 'tag-filter-expand', 'tag-filter-search'],
    setup(props, { emit }) {
        const selectedSessionId = ref(null);
        
        // 提取所有标签（参考 YiPet 的 getAllTags 逻辑）
        const allTags = computed(() => {
            const tagSet = new Set();
            if (props.sessions && Array.isArray(props.sessions)) {
                props.sessions.forEach(session => {
                    if (session && session.tags && Array.isArray(session.tags)) {
                        session.tags.forEach(tag => {
                            if (tag && tag.trim()) {
                                tagSet.add(tag.trim());
                            }
                        });
                    }
                });
            }
            
            // 按字母顺序排序（参考 YiPet 的默认排序）
            const allTagsArray = Array.from(tagSet);
            allTagsArray.sort();
            
            // 优先标签列表（参考 YiPet）
            const priorityTags = ['网文', '文档', '工具', '工作', '家庭', '娱乐', '日记', '开源项目'];
            const priorityTagSet = new Set(priorityTags);
            const priorityTagList = [];
            const otherTags = [];
            
            // 先添加存在的优先标签（按顺序）
            priorityTags.forEach(tag => {
                if (allTagsArray.includes(tag)) {
                    priorityTagList.push(tag);
                }
            });
            
            // 添加其他标签（按字母顺序）
            allTagsArray.forEach(tag => {
                if (!priorityTagSet.has(tag)) {
                    otherTags.push(tag);
                }
            });
            
            // 合并：优先标签在前，其他标签在后
            return [...priorityTagList, ...otherTags];
        });
        
        // 根据搜索关键词过滤标签
        const filteredTags = computed(() => {
            const searchKeyword = (props.tagFilterSearchKeyword || '').trim().toLowerCase();
            if (!searchKeyword) {
                return allTags.value;
            }
            return allTags.value.filter(tag => 
                tag.toLowerCase().includes(searchKeyword)
            );
        });
        
        // 确定要显示的标签（根据折叠状态）
        const visibleTags = computed(() => {
            const selectedTags = props.selectedTags || [];
            let visible;
            
            if (props.tagFilterExpanded || props.tagFilterSearchKeyword) {
                // 展开状态或有搜索关键词时：显示所有过滤后的标签
                visible = filteredTags.value;
            } else {
                // 折叠状态：显示前N个标签，但确保选中的标签也在其中
                const defaultVisible = filteredTags.value.slice(0, props.tagFilterVisibleCount);
                const selectedNotInDefault = selectedTags.filter(tag => !defaultVisible.includes(tag));
                const visibleSet = new Set([...defaultVisible, ...selectedNotInDefault]);
                visible = filteredTags.value.filter(tag => visibleSet.has(tag));
            }
            
            return visible;
        });
        
        // 计算是否应该显示展开/折叠按钮（在头部）
        const shouldShowExpandBtn = computed(() => {
            // 当标签数量超过可见数量时显示
            return allTags.value.length > props.tagFilterVisibleCount;
        });
        
        // 是否有更多标签
        const hasMoreTags = computed(() => {
            if (props.tagFilterExpanded || props.tagFilterSearchKeyword) {
                return false;
            }
            return filteredTags.value.length > visibleTags.value.length;
        });
        
        // 计算每个标签对应的会话数量
        const tagCounts = computed(() => {
            const counts = {};
            let noTagsCount = 0;
            
            if (props.sessions && Array.isArray(props.sessions)) {
                props.sessions.forEach(session => {
                    const sessionTags = session.tags || [];
                    const hasTags = sessionTags.length > 0 && sessionTags.some(t => t && t.trim());
                    
                    if (!hasTags) {
                        noTagsCount++;
                    } else if (Array.isArray(sessionTags)) {
                        sessionTags.forEach(t => {
                            if (t && t.trim()) {
                                const normalizedTag = t.trim();
                                counts[normalizedTag] = (counts[normalizedTag] || 0) + 1;
                            }
                        });
                    }
                });
            }
            
            return { counts, noTagsCount };
        });
        
        // 过滤会话列表（参考 YiPet 的 _getFilteredSessions 逻辑）
        const filteredSessions = computed(() => {
            if (!props.sessions || !Array.isArray(props.sessions)) {
                return [];
            }
            let filtered = [...props.sessions];
            
            // 分离收藏的会话和非收藏的会话
            const favoriteSessions = [];
            const nonFavoriteSessions = [];
            
            filtered.forEach(session => {
                if (session.isFavorite) {
                    favoriteSessions.push(session);
                } else {
                    nonFavoriteSessions.push(session);
                }
            });
            
            // 对非收藏的会话进行筛选
            let filteredNonFavorite = nonFavoriteSessions;
            
            // 搜索筛选：先进行搜索筛选
            const q = (props.searchQuery || '').trim().toLowerCase();
            if (q) {
                filteredNonFavorite = filteredNonFavorite.filter(session => {
                    const title = session.title || '';
                    const pageTitle = session.pageTitle || '';
                    const preview = session.preview || session.pageDescription || '';
                    const url = session.url || '';
                    const tags = Array.isArray(session.tags) ? session.tags.join(' ') : '';
                    const hay = `${title} ${pageTitle} ${preview} ${url} ${tags}`.toLowerCase();
                    return hay.includes(q);
                });
            }
            
            // 标签筛选（并集逻辑）：参考 YiPet 的实现
            if (props.tagFilterNoTags || (props.selectedTags && props.selectedTags.length > 0)) {
                filteredNonFavorite = filteredNonFavorite.filter(session => {
                    const sessionTags = Array.isArray(session.tags) ? session.tags.map((t) => String(t).trim()) : [];
                    const hasNoTags = sessionTags.length === 0 || !sessionTags.some((t) => t);
                    const hasSelectedTags = props.selectedTags && props.selectedTags.length > 0 && 
                        props.selectedTags.some((selectedTag) => sessionTags.includes(selectedTag));
                    
                    // 反向过滤逻辑
                    if (props.tagFilterReverse && props.selectedTags && props.selectedTags.length > 0) {
                        // 反向过滤：排除包含选中标签的会话
                        if (hasSelectedTags) {
                            return false;
                        }
                        // 反向过滤时，如果没有标签筛选，则显示没有标签的会话
                        if (props.tagFilterNoTags && hasNoTags) {
                            return true;
                        }
                        // 反向过滤时，显示不包含选中标签的会话
                        return true;
                    } else {
                        // 正向过滤（并集逻辑）：如果启用了"没有标签"筛选，或者会话包含选中的标签
                        if (props.tagFilterNoTags && hasNoTags) {
                            return true; // 没有标签的会话
                        }
                        if (props.selectedTags && props.selectedTags.length > 0 && hasSelectedTags) {
                            return true; // 包含选中标签的会话
                        }
                        return false;
                    }
                });
            }
            
            // 对收藏的会话也进行搜索筛选（如果有搜索关键词）
            let filteredFavorite = favoriteSessions;
            if (q) {
                filteredFavorite = filteredFavorite.filter(session => {
                    const title = session.title || '';
                    const pageTitle = session.pageTitle || '';
                    const preview = session.preview || session.pageDescription || '';
                    const url = session.url || '';
                    const tags = Array.isArray(session.tags) ? session.tags.join(' ') : '';
                    const hay = `${title} ${pageTitle} ${preview} ${url} ${tags}`.toLowerCase();
                    return hay.includes(q);
                });
            }
            
            // 合并：收藏的会话在最前面，然后是非收藏的会话
            const result = [...filteredFavorite, ...filteredNonFavorite];
            
            // 排序：收藏的优先，然后按更新时间倒序
            result.sort((a, b) => {
                const aFavorite = a.isFavorite || false;
                const bFavorite = b.isFavorite || false;
                
                if (aFavorite !== bFavorite) {
                    return bFavorite ? 1 : -1;
                }
                
                const aTime = a.updatedAt || a.createdAt || 0;
                const bTime = b.updatedAt || b.createdAt || 0;
                return bTime - aTime;
            });
            
            return result;
        });
        
        // 切换标签选择
        const toggleTag = (tag) => {
            const tags = [...props.selectedTags];
            const index = tags.indexOf(tag);
            if (index > -1) {
                tags.splice(index, 1);
            } else {
                tags.push(tag);
            }
            emit('tag-select', tags);
        };
        
        // 切换反向过滤
        const toggleReverse = () => {
            emit('tag-filter-reverse', !props.tagFilterReverse);
        };
        
        // 切换无标签筛选
        const toggleNoTags = () => {
            emit('tag-filter-no-tags', !props.tagFilterNoTags);
        };
        
        // 切换展开/折叠
        const toggleExpand = () => {
            emit('tag-filter-expand', !props.tagFilterExpanded);
        };
        
        // 更新标签搜索关键词
        const updateTagSearch = (keyword) => {
            emit('tag-filter-search', keyword);
        };
        
        // 清除所有过滤条件
        const clearAllFilters = () => {
            emit('tag-clear');
            emit('tag-filter-no-tags', false);
            emit('tag-filter-reverse', false);
            emit('tag-filter-search', '');
        };
        
        // 格式化时间
        const formatTime = (timestamp) => {
            if (!timestamp) return '';
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            
            if (days === 0) {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                if (hours === 0) {
                    const minutes = Math.floor(diff / (1000 * 60));
                    return minutes <= 0 ? '刚刚' : `${minutes}分钟前`;
                }
                return `${hours}小时前`;
            } else if (days === 1) {
                return '昨天';
            } else if (days < 7) {
                return `${days}天前`;
            } else {
                return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
            }
        };
        
        return {
            selectedSessionId,
            allTags,
            filteredTags,
            visibleTags,
            hasMoreTags,
            shouldShowExpandBtn,
            tagCounts,
            filteredSessions,
            toggleTag,
            toggleReverse,
            toggleNoTags,
            toggleExpand,
            updateTagSearch,
            clearAllFilters,
            formatTime
        };
    },
    template: await fetch('/views/aicr/plugins/sessionList/index.html').then(r => r.text())
};

// 初始化组件并全局暴露（与其他组件保持一致）
(async function initComponent() {
    try {
        const SessionList = await (async () => {
            // 确保模板已加载
            if (!SessionListComponent.template) {
                SessionListComponent.template = await fetch('/views/aicr/plugins/sessionList/index.html').then(r => r.text());
            }
            return SessionListComponent;
        })();
        
        window.SessionList = SessionList;
        
        // 触发自定义事件，通知组件已加载完成
        window.dispatchEvent(new CustomEvent('SessionListLoaded', { detail: SessionList }));
        
        console.log('[SessionList] 组件初始化完成');
    } catch (error) {
        console.error('[SessionList] 组件初始化失败:', error);
    }
})();

export default SessionListComponent;

