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
        }
    },
    emits: ['session-select', 'session-delete', 'session-create', 'tag-select', 'tag-clear', 'search-change', 'toggle-collapse'],
    setup(props, { emit }) {
        const selectedSessionId = ref(null);
        
        // 提取所有标签
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
            return Array.from(tagSet).sort();
        });
        
        // 过滤会话列表
        const filteredSessions = computed(() => {
            if (!props.sessions || !Array.isArray(props.sessions)) {
                return [];
            }
            let filtered = [...props.sessions];
            
            // 按搜索关键词过滤
            if (props.searchQuery && props.searchQuery.trim()) {
                const query = props.searchQuery.trim().toLowerCase();
                filtered = filtered.filter(session => {
                    const title = (session.pageTitle || session.title || '').toLowerCase();
                    const url = (session.url || '').toLowerCase();
                    return title.includes(query) || url.includes(query);
                });
            }
            
            // 按标签过滤
            if (props.selectedTags && props.selectedTags.length > 0) {
                filtered = filtered.filter(session => {
                    const sessionTags = session.tags || [];
                    return props.selectedTags.some(tag => sessionTags.includes(tag));
                });
            }
            
            // 排序：收藏的优先，然后按更新时间倒序
            filtered.sort((a, b) => {
                const aFavorite = a.isFavorite || false;
                const bFavorite = b.isFavorite || false;
                
                if (aFavorite !== bFavorite) {
                    return bFavorite ? 1 : -1;
                }
                
                const aTime = a.updatedAt || a.createdAt || 0;
                const bTime = b.updatedAt || b.createdAt || 0;
                return bTime - aTime;
            });
            
            return filtered;
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
            filteredSessions,
            toggleTag,
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

