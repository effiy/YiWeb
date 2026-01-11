/**
 * 会话列表组件
 * 参考 YiPet 项目的会话列表实现
 */

import { defineComponent } from '/src/utils/componentLoader.js';

const { createApp, computed, ref, onMounted } = Vue;

const componentOptions = {
    name: 'SessionList',
    css: '/src/views/aicr/components/sessionList/index.css',
    html: '/src/views/aicr/components/sessionList/index.html',
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
        },
        // 批量选择相关属性
        sessionBatchMode: {
            type: Boolean,
            default: false
        },
        selectedSessionKeys: {
            type: Set,
            default: () => new Set()
        },
        isAllSessionsSelected: {
            type: Boolean,
            default: false
        }
    },
    emits: ['session-select', 'session-delete', 'session-create', 'tag-select', 'tag-clear', 'search-change', 'toggle-collapse', 
            'tag-filter-reverse', 'tag-filter-no-tags', 'tag-filter-expand', 'tag-filter-search', 'tag-order-updated',
            'session-favorite', 'session-edit', 'session-tag', 'session-duplicate', 'session-context', 'session-open-url',
            'session-batch-select', 'session-batch-select-all', 'session-batch-delete', 'session-batch-cancel', 'session-tree',
            'session-import-file', 'session-export', 'toggle-batch-mode'],
    setup(props, { emit }) {
        const selectedSessionId = ref(null);
        
        // 导入相关
        const sessionImportInput = ref(null);
        
        const triggerImport = () => {
            if (sessionImportInput.value) {
                sessionImportInput.value.click();
            }
        };
        
        const handleFileChange = (event) => {
            emit('session-import-file', event);
            // 重置input，允许重复选择同一文件
            if (event.target) {
                event.target.value = '';
            }
        };
        
        // 标签顺序（响应式）
        const tagOrder = ref(null);
        
        // 长按删除相关状态
        const longPressTimer = ref(null);
        const longPressStartTime = ref(null);
        const longPressStartPosition = ref(null);
        const isDeleting = ref(false);
        const longPressCompleted = ref(false);
        
        // 加载标签顺序
        const loadTagOrder = () => {
            if (tagOrder.value !== null) {
                return tagOrder.value;
            }
            try {
                const saved = localStorage.getItem('aicr_tag_order');
                const order = saved ? JSON.parse(saved) : null;
                tagOrder.value = order;
                return order;
            } catch (e) {
                console.warn('[SessionList] 加载标签顺序失败:', e);
                tagOrder.value = null;
                return null;
            }
        };
        
        // 保存标签顺序
        const saveTagOrder = (order) => {
            try {
                localStorage.setItem('aicr_tag_order', JSON.stringify(order));
                tagOrder.value = order;
            } catch (e) {
                console.warn('[SessionList] 保存标签顺序失败:', e);
            }
        };
        
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
            const defaultOrder = [...priorityTagList, ...otherTags];
            
            // 应用保存的标签顺序
            const savedOrder = loadTagOrder();
            if (savedOrder && Array.isArray(savedOrder) && savedOrder.length > 0) {
                // 使用保存的顺序，但只包含当前存在的标签
                const orderedTags = savedOrder.filter(tag => tagSet.has(tag));
                // 添加新标签（不在保存顺序中的）到末尾，按字母顺序
                const newTags = defaultOrder.filter(tag => !savedOrder.includes(tag));
                return [...orderedTags, ...newTags];
            }
            
            return defaultOrder;
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
        
        // 拖拽开始
        const handleDragStart = (e, tag) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', tag);
            e.currentTarget.classList.add('dragging');
            
            // 设置自定义拖拽图像
            const dragImage = e.currentTarget.cloneNode(true);
            dragImage.style.opacity = '0.8';
            dragImage.style.transform = 'rotate(3deg)';
            dragImage.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-1000px';
            document.body.appendChild(dragImage);
            e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
            
            setTimeout(() => {
                if (dragImage.parentNode) {
                    dragImage.parentNode.removeChild(dragImage);
                }
            }, 0);
        };
        
        // 拖拽结束
        const handleDragEnd = (e) => {
            e.currentTarget.classList.remove('dragging');
            
            // 移除所有拖拽相关的样式
            document.querySelectorAll('.tag-item').forEach(item => {
                item.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-hover');
            });
        };
        
        // 拖拽经过
        const handleDragOver = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            
            if (e.currentTarget.classList.contains('dragging')) {
                return;
            }
            
            const rect = e.currentTarget.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            
            // 移除所有拖拽指示样式
            document.querySelectorAll('.tag-item').forEach(item => {
                if (!item.classList.contains('dragging')) {
                    item.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-hover');
                }
            });
            
            // 根据鼠标位置显示插入位置指示
            if (e.clientY < midY) {
                e.currentTarget.classList.add('drag-over-top');
                e.currentTarget.classList.remove('drag-over-bottom');
            } else {
                e.currentTarget.classList.add('drag-over-bottom');
                e.currentTarget.classList.remove('drag-over-top');
            }
            
            e.currentTarget.classList.add('drag-hover');
        };
        
        // 拖拽离开
        const handleDragLeave = (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;
            
            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-hover');
            }
        };
        
        // 放置
        const handleDrop = (e, targetTag) => {
            e.preventDefault();
            e.stopPropagation();
            
            const draggedTag = e.dataTransfer.getData('text/plain');
            
            if (draggedTag === targetTag) {
                return;
            }
            
            const currentOrder = allTags.value;
            const draggedIndex = currentOrder.indexOf(draggedTag);
            const targetIndex = currentOrder.indexOf(targetTag);
            
            if (draggedIndex === -1 || targetIndex === -1) {
                return;
            }
            
            // 计算新的插入位置
            const rect = e.currentTarget.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            let insertIndex = targetIndex;
            if (e.clientY < midY) {
                insertIndex = targetIndex;
            } else {
                insertIndex = targetIndex + 1;
            }
            
            // 调整插入位置（如果拖拽的元素在目标位置之前，需要减1）
            if (draggedIndex < insertIndex) {
                insertIndex -= 1;
            }
            
            // 重新排序标签数组
            const newOrder = [...currentOrder];
            newOrder.splice(draggedIndex, 1);
            newOrder.splice(insertIndex, 0, draggedTag);
            
            // 保存新的顺序
            saveTagOrder(newOrder);
            
            // 触发更新（通过emit通知父组件重新计算）
            emit('tag-order-updated', newOrder);
            
            // 强制重新计算allTags（通过更新tagOrder的引用）
            // Vue会自动检测到变化并重新计算computed属性
        };
        
        // 开始长按计时
        const startLongPress = (session, event) => {
            try {
                // 阻止事件冒泡，避免触发其他点击事件
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                
                // 检查是否正在删除中
                if (isDeleting.value) {
                    console.log('[长按删除] 正在删除中，忽略新的长按');
                    return;
                }
                
                // 检查是否点击在可交互元素上
                const target = event.target;
                const isInteractiveElement = target.closest('button, a, [role="button"], .session-tag');
                
                if (isInteractiveElement) {
                    console.log('[长按删除] 点击在交互元素上，跳过长按:', target.tagName, target.className);
                    return;
                }
                
                // 检查session是否存在
                if (!session || !session.id) {
                    console.warn('[长按删除] session参数为空');
                    return;
                }
                
                // 记录长按开始时间和位置
                longPressStartTime.value = Date.now();
                longPressStartPosition.value = {
                    x: event.clientX || event.touches?.[0]?.clientX || 0,
                    y: event.clientY || event.touches?.[0]?.clientY || 0
                };
                
                // 设置长按定时器（800ms）
                longPressTimer.value = setTimeout(() => {
                    handleLongPressComplete(session, event);
                }, 800);
            } catch (error) {
                console.error('[长按删除] 开始长按计时失败:', error);
            }
        };
        
        // 取消长按
        const cancelLongPress = () => {
            if (longPressTimer.value) {
                clearTimeout(longPressTimer.value);
                longPressTimer.value = null;
            }
            // 如果长按已完成，标记为已完成，防止触发点击事件
            if (longPressStartTime.value && Date.now() - longPressStartTime.value > 800) {
                longPressCompleted.value = true;
                // 延迟重置，确保点击事件不会触发
                setTimeout(() => {
                    longPressCompleted.value = false;
                }, 100);
            }
            longPressStartTime.value = null;
            longPressStartPosition.value = null;
        };
        
        // 长按完成处理
        const handleLongPressComplete = (session, event) => {
            try {
                // 标记长按已完成
                longPressCompleted.value = true;
                
                // 清除定时器
                if (longPressTimer.value) {
                    clearTimeout(longPressTimer.value);
                    longPressTimer.value = null;
                }
                
                // 检查是否正在删除中
                if (isDeleting.value) {
                    console.log('[长按删除] 正在删除中，忽略长按完成');
                    longPressCompleted.value = false;
                    return;
                }
                
                // 检查移动距离（如果移动超过10px，取消删除）
                if (event && longPressStartPosition.value) {
                    const currentX = event.clientX || event.changedTouches?.[0]?.clientX || 0;
                    const currentY = event.clientY || event.changedTouches?.[0]?.clientY || 0;
                    const deltaX = Math.abs(currentX - longPressStartPosition.value.x);
                    const deltaY = Math.abs(currentY - longPressStartPosition.value.y);
                    
                    if (deltaX > 10 || deltaY > 10) {
                        console.log('[长按删除] 移动距离过大，取消删除');
                        longPressCompleted.value = false;
                        return;
                    }
                }
                
                // 显示确认对话框
                const sessionName = session.pageTitle || session.title || '未命名会话';
                if (confirm(`确定删除会话 "${sessionName}" 吗？此操作不可撤销。`)) {
                    isDeleting.value = true;
                    emit('session-delete', session.id);
                    // 延迟重置删除状态
                    setTimeout(() => {
                        isDeleting.value = false;
                        longPressCompleted.value = false;
                    }, 1000);
                } else {
                    // 用户取消删除，重置标志
                    setTimeout(() => {
                        longPressCompleted.value = false;
                    }, 100);
                }
            } catch (error) {
                console.error('[长按删除] 长按完成处理失败:', error);
                longPressCompleted.value = false;
            }
        };
        
        // 处理会话点击事件
        const handleSessionClick = (session, event) => {
            // 如果长按已完成，不触发点击事件
            if (longPressCompleted.value) {
                console.log('[SessionList] 长按已完成，跳过点击事件');
                return;
            }
            
            // 批量模式下，点击会话项应该切换选择状态，而不是打开会话
            if (props.sessionBatchMode) {
                // 阻止默认行为
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                // 切换选择状态
                handleBatchSelect(session.id, event);
                return;
            }
            
            // 非批量模式下，正常打开会话
            console.log('[SessionList] 选中会话:', session.id, session.title);
            
            // 设置选中状态
            // 确保 session.id 存在，避免 undefined === undefined 导致的多选问题
            if (session.id) {
                selectedSessionId.value = session.id;
            } else {
                console.warn('[SessionList] 会话缺少ID，无法设置高亮:', session);
            }
            
            emit('session-select', session);
        };
        
        // 处理收藏按钮点击
        const handleFavoriteClick = (session) => {
            emit('session-favorite', session.id);
        };
        
        // 处理编辑按钮点击
        const handleEditClick = (session) => {
            emit('session-edit', session.id);
        };
        
        // 处理标签管理按钮点击
        const handleTagClick = (session) => {
            emit('session-tag', session.id);
        };
        
        // 处理副本按钮点击
        const handleDuplicateClick = (session) => {
            emit('session-duplicate', session.id);
        };
        
        // 处理页面上下文按钮点击
        const handleContextClick = (session) => {
            emit('session-context', session.id);
        };
        
        // 处理打开URL按钮点击
        const handleOpenUrlClick = (session) => {
            emit('session-open-url', session.id);
        };
        
        // 处理目录接口按钮点击
        const handleTreeClick = (session) => {
            emit('session-tree', session);
        };
        
        // 处理批量选择切换
        const handleBatchSelect = (sessionId, event) => {
            // 阻止事件冒泡，避免触发会话项的点击事件
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }
            emit('session-batch-select', sessionId);
        };
        
        // 检查会话是否被选中
        const isSessionSelected = (sessionId) => {
            return props.selectedSessionKeys && props.selectedSessionKeys.has && props.selectedSessionKeys.has(sessionId);
        };

        // 全选/取消全选
        const handleSelectAll = () => {
            const allIds = filteredSessions.value.map(s => s.id);
            // 检查当前是否所有筛选后的会话都被选中
            const isAllFilteredSelected = filteredSessions.value.length > 0 && 
                                         filteredSessions.value.every(s => isSessionSelected(s.id));
            
            if (isAllFilteredSelected) {
                emit('session-batch-select-all', { ids: allIds, isSelect: false });
            } else {
                emit('session-batch-select-all', { ids: allIds, isSelect: true });
            }
        };

        // 批量删除
        const handleBatchDelete = () => {
            // 只删除当前筛选视图中选中的会话
            const currentFilteredIds = new Set(filteredSessions.value.map(s => s.id));
            const idsToDelete = Array.from(props.selectedSessionKeys).filter(id => currentFilteredIds.has(id));
            
            if (idsToDelete.length === 0) return;
            
            emit('session-batch-delete', idsToDelete);
        };

        // 取消批量操作
        const handleBatchCancel = () => {
            emit('session-batch-cancel');
        };
        
        // 判断会话来源（通过URL判断）
        const getSessionSource = (session) => {
            if (!session || !session.url) {
                return null;
            }
            const url = String(session.url);
            if (url.startsWith('news-session://')) {
                return 'news';
            } else if (url.startsWith('aicr-session://')) {
                return 'file-tree';
            }
            return null;
        };
        
        // 获取会话来源图标类名
        const getSessionSourceIcon = (session) => {
            const source = getSessionSource(session);
            if (source === 'news') {
                return 'fas fa-newspaper';
            } else if (source === 'file-tree') {
                return 'fas fa-folder-open';
            }
            return null;
        };
        
        // 获取会话第一个字符（用于来自news的会话）
        const getSessionFirstChar = (session) => {
            const source = getSessionSource(session);
            if (source === 'news') {
                const title = session.pageTitle || session.title || '未命名会话';
                const firstChar = title.trim().charAt(0) || 'N';
                return firstChar.toUpperCase();
            }
            return null;
        };
        
        // 判断会话是否已经是树形文件
        const isSessionFromTree = (session) => {
            return getSessionSource(session) === 'file-tree';
        };
        
        // 组件挂载时加载标签顺序
        onMounted(() => {
            loadTagOrder();
        });
        
        return {
            selectedSessionId,
            allTags,
            filteredTags,
            visibleTags,
            hasMoreTags,
            tagCounts,
            filteredSessions,
            toggleTag,
            toggleReverse,
            toggleNoTags,
            toggleExpand,
            updateTagSearch,
            clearAllFilters,
            formatTime,
            handleDragStart,
            handleDragEnd,
            handleDragOver,
            handleDragLeave,
            handleDrop,
            startLongPress,
            cancelLongPress,
            handleSessionClick,
            handleFavoriteClick,
            handleEditClick,
            handleTagClick,
            handleDuplicateClick,
            handleContextClick,
            handleOpenUrlClick,
            handleTreeClick,
            getSessionSource,
            getSessionSourceIcon,
            getSessionFirstChar,
            isSessionFromTree,
            handleBatchSelect,
            isSessionSelected,
            handleSelectAll,
            handleBatchDelete,
            handleBatchCancel,
            // 导入相关
            sessionImportInput,
            triggerImport,
            handleFileChange
        };
    }
};

// 初始化组件并全局暴露
defineComponent(componentOptions).then(component => {
    window.SessionList = component;
    window.dispatchEvent(new CustomEvent('SessionListLoaded', { detail: component }));
    console.log('[SessionList] 组件初始化完成');
}).catch(error => {
    console.error('[SessionList] 组件初始化失败:', error);
});

export default componentOptions;


