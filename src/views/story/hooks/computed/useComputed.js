/**
 * 故事任务面板 - 计算属性
 *
 * 所有派生数据集中于此，使用 Vue.computed() 包装。
 * 对标 aicr/index.js computed 模式。
 * projectTags / storyTags / typeTags / typeStats 直接从文件树计算，
 * 与 AICR 页面使用完全相同的逻辑。
 */

import { getFirstLevelNames, extractDocTypes } from '/src/views/aicr/utils/filterHelpers.js';

const _TYPE_META = {
    '故事任务':   { icon: 'circle',      label: '故事' },
    '使用场景':   { icon: 'file-alt',    label: '场景' },
    '技术评审':   { icon: 'edit',        label: '设计' },
    '实施报告':   { icon: 'code',        label: '开发' },
    '测试设计':   { icon: 'check-circle', label: '测试设计' },
    '测试报告':   { icon: 'check-circle', label: '测试' },
    '自改进复盘': { icon: 'lightbulb',   label: '运营' },
};

function getSelectedProjectTags(state) {
    const tree = state.fileTree.value;
    const firstLevelNames = getFirstLevelNames(tree);
    const tags = state.selectedSessionTags.value;
    if (!Array.isArray(tags)) return [];
    return tags.filter(t => firstLevelNames.has(t));
}

function getSelectedStoryTags(state) {
    const tree = state.fileTree.value;
    const firstLevelNames = getFirstLevelNames(tree);
    const tags = state.selectedSessionTags.value;
    if (!Array.isArray(tags)) return [];
    return tags.filter(t => !firstLevelNames.has(t));
}

function _matchSearch(story, q) {
    if (!q || !story) return true;
    return (story.name || '').toLowerCase().includes(q) ||
        (story.description || '').toLowerCase().includes(q) ||
        (story.nextStep || '').toLowerCase().includes(q);
}

function _applyFilters(state, stories, exclude) {
    if (!Array.isArray(stories)) return [];

    const selProjectTags = getSelectedProjectTags(state);
    const selStoryTags = getSelectedStoryTags(state);
    const selTypeTags = state.selectedTypeTags.value;
    const noTags = state.tagFilterNoTags.value;
    const searchQuery = (state.localSearchQuery.value || '').trim().toLowerCase();

    let result = stories.filter(s => !!s);

    if (exclude !== 'projectTag') {
        if (noTags) {
            result = result.filter(s => !Array.isArray(s.projectTags) || s.projectTags.length === 0);
        } else if (selProjectTags.length > 0) {
            result = result.filter(s =>
                Array.isArray(s.projectTags) && s.projectTags.some(t => selProjectTags.includes(t))
            );
        }
    }
    if (exclude !== 'storyTag' && selStoryTags.length > 0) {
        result = result.filter(s => selStoryTags.includes(s.name));
    }
    if (exclude !== 'docFilter' && Array.isArray(selTypeTags) && selTypeTags.length > 0) {
        result = result.filter(s => {
            if (!s || !Array.isArray(s.files)) return false;
            return selTypeTags.some(type =>
                s.files.some(f => {
                    const fn = (f.fileName || '').replace(/\.md$/i, '');
                    return fn === type || fn.endsWith('-' + type);
                })
            );
        });
    }
    if (exclude !== 'search' && searchQuery) {
        result = result.filter(s => _matchSearch(s, searchQuery));
    }
    return result;
}

function _sortStories(list, field, direction) {
    if (!Array.isArray(list)) return [];
    const sorted = [...list].filter(s => !!s);
    sorted.sort((a, b) => {
        let va = a[field];
        let vb = b[field];
        if (field === 'lastModified' || field === 'createdAt') {
            va = va || 0;
            vb = vb || 0;
        }
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return direction === 'asc' ? -1 : 1;
        if (va > vb) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    return sorted;
}

export function useComputed(store) {
    const { computed } = Vue;

    /* ---- 基础统计 ---- */

    const totalStories = computed(() => store.stories.value.length);

    const statusCounts = computed(() => {
        const counts = { planning: 0, design: 0, develop: 0, testing: 0, operations: 0 };
        const stories = store.stories.value;
        if (!Array.isArray(stories)) return counts;
        for (const story of stories) {
            if (story && counts[story.status] !== undefined) counts[story.status]++;
        }
        return counts;
    });

    const allProjectTags = computed(() => store.allProjectTags.value);

    const storiesByStatus = computed(() => {
        const groups = { planning: [], design: [], develop: [], testing: [], operations: [] };
        const stories = store.stories.value;
        if (!Array.isArray(stories)) return groups;
        for (const story of stories) {
            if (story && groups[story.status]) groups[story.status].push(story);
        }
        return groups;
    });

    /* ---- 筛选后的故事列表 ---- */

    const filteredStories = computed(() => {
        const filtered = _applyFilters(store, store.stories.value);
        return _sortStories(filtered, store.sortField.value, store.sortDirection.value);
    });

    const hasActiveFilters = computed(() => {
        return !!(
            store.localSearchQuery.value ||
            store.selectedSessionTags.value.length > 0 ||
            store.selectedTypeTags.value.length > 0 ||
            store.tagFilterNoTags.value
        );
    });

    /* ---- 文档计数（stats bar） ---- */

    const documentCounts = computed(() => {
        const stories = filteredStories.value;
        if (!Array.isArray(stories)) return {};
        const counts = {};
        for (const story of stories) {
            if (!story || !Array.isArray(story.files)) continue;
            const seen = new Set();
            for (const f of story.files) {
                const fn = (f.fileName || '').replace(/\.md$/i, '');
                if (!fn || seen.has(fn)) continue;
                seen.add(fn);
                counts[fn] = (counts[fn] || 0) + 1;
            }
        }
        return counts;
    });

    /* ---- 看板视图 ---- */

    const filteredStoriesByStatus = computed(() => {
        const filtered = _applyFilters(store, store.stories.value, 'sort');
        const groups = { planning: [], design: [], develop: [], testing: [], operations: [] };
        if (!Array.isArray(filtered)) return groups;
        for (const story of filtered) {
            if (!story) continue;
            const status = groups[story.status] ? story.status : 'planning';
            groups[status].push(story);
        }
        return groups;
    });

    const kanbanColumns = computed(() => {
        const order = ['planning', 'design', 'develop', 'testing', 'operations'];
        const groups = filteredStoriesByStatus.value || {};
        return order.map(status => ({ status, stories: Array.isArray(groups[status]) ? groups[status] : [] }));
    });

    /* ---- 卡片 / 列表视图（按项目标签分组） ---- */

    const groupedStories = computed(() => {
        const groups = new Map();
        const stories = filteredStories.value;
        if (!Array.isArray(stories)) return [];
        for (const story of stories) {
            if (!story) continue;
            const tags = (Array.isArray(story.projectTags) && story.projectTags.length > 0)
                ? story.projectTags
                : ['__uncategorized__'];
            for (const tag of tags) {
                if (typeof tag !== 'string') continue;
                if (!groups.has(tag)) groups.set(tag, []);
                groups.get(tag).push(story);
            }
        }
        const result = [];
        for (const [tag, sts] of groups) {
            result.push({
                tag: tag === '__uncategorized__' ? null : tag,
                label: tag === '__uncategorized__' ? '未分类' : tag,
                stories: sts,
            });
        }
        result.sort((a, b) => {
            if (a.tag === null) return 1;
            if (b.tag === null) return -1;
            return a.tag.localeCompare(b.tag);
        });
        return result;
    });

    /* ---- 筛选 UI 数据 ---- */

    const projectTagCounts = computed(() => {
        const counts = {};
        const stories = store.stories.value;
        if (!Array.isArray(stories)) return counts;
        for (const story of stories) {
            if (!story || !Array.isArray(story.projectTags)) continue;
            for (const tag of story.projectTags) {
                if (typeof tag === 'string') counts[tag] = (counts[tag] || 0) + 1;
            }
        }
        return counts;
    });

    const untaggedCount = computed(() => {
        const tree = store.fileTree?.value;
        if (!tree || !Array.isArray(tree)) return 0;
        let count = 0;
        for (const item of tree) {
            if (item.type === 'file') count++;
        }
        return count;
    });

    /* ---- 项目标签（对标 AICR projectTags computed — 从文件树计算） ---- */

    const projectTags = computed(() => {
        const tree = store.fileTree?.value;
        if (!tree || !Array.isArray(tree)) return [];

        const selectedTypes = store.selectedTypeTags?.value || [];
        const hasType = selectedTypes.length > 0;

        const hasMatchingType = (items) => {
            if (!Array.isArray(items)) return false;
            for (const item of items) {
                if (item.type === 'file') {
                    const fileName = (item.name || '').replace(/\.md$/i, '');
                    if (selectedTypes.includes(fileName)) return true;
                } else if (item.type === 'folder' && item.children && hasMatchingType(item.children)) {
                    return true;
                }
            }
            return false;
        };

        const countInScope = (items) => {
            if (!Array.isArray(items)) return 0;
            let count = 0;
            for (const item of items) {
                if (item.type === 'file') {
                    if (!hasType) { count++; continue; }
                    const fileName = (item.name || '').replace(/\.md$/i, '');
                    if (selectedTypes.includes(fileName)) count++;
                } else if (item.type === 'folder' && item.children) {
                    count += countInScope(item.children);
                }
            }
            return count;
        };

        const result = [];
        for (const item of tree) {
            if (item.type !== 'folder' || !item.children) continue;
            if (hasType && !hasMatchingType(item.children)) continue;
            result.push({ name: item.name, count: countInScope(item.children) });
        }

        // localStorage drag order — 与 AICR 共享 key
        try {
            const saved = localStorage.getItem('aicr_file_tag_order');
            const savedOrder = saved ? JSON.parse(saved) : null;
            if (savedOrder && Array.isArray(savedOrder) && savedOrder.length > 0) {
                const nameSet = new Set(result.map(r => r.name));
                const ordered = savedOrder.filter(n => nameSet.has(n)).map(n => result.find(r => r.name === n));
                const remaining = result.filter(r => !savedOrder.includes(r.name));
                return [...ordered, ...remaining];
            }
        } catch (e) { /* ignore */ }

        return result.sort((a, b) => a.name.localeCompare(b.name));
    });

    /* ---- 故事标签（对标 AICR storyTags computed — 从文件树计算） ---- */

    const storyTags = computed(() => {
        const tree = store.fileTree?.value;
        if (!tree || !Array.isArray(tree)) return [];

        const firstLevelNames = getFirstLevelNames(tree);
        const selectedTypes = store.selectedTypeTags?.value || [];
        const hasType = selectedTypes.length > 0;

        const countInScope = (items) => {
            if (!Array.isArray(items)) return 0;
            let count = 0;
            for (const item of items) {
                if (item.type === 'file') {
                    if (!hasType) { count++; continue; }
                    const fileName = (item.name || '').replace(/\.md$/i, '');
                    if (selectedTypes.includes(fileName)) count++;
                } else if (item.type === 'folder' && item.children) {
                    count += countInScope(item.children);
                }
            }
            return count;
        };

        const resultMap = new Map();
        const walk = (items, parentName = '') => {
            if (!Array.isArray(items)) return;
            for (const item of items) {
                if (item.type === 'folder') {
                    if (parentName === '故事任务面板') {
                        const count = countInScope(item.children || []);
                        const existing = resultMap.get(item.name);
                        resultMap.set(item.name, existing !== undefined ? existing + count : count);
                    }
                    if (item.children) walk(item.children, item.name);
                }
            }
        };

        // 项目级联动
        const selectedTags = store.selectedSessionTags?.value || [];
        const projectSel = selectedTags.filter(t => firstLevelNames.has(t));
        const hasProject = projectSel.length > 0;

        if (hasProject) {
            for (const item of tree) {
                if (item.type === 'folder' && projectSel.includes(item.name)) {
                    walk(item.children || []);
                }
            }
        } else {
            walk(tree);
        }

        const result = [];
        for (const [name, count] of resultMap) {
            if (count > 0) result.push({ name, count });
        }
        return result.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
    });

    /* ---- 文档类型标签（对标 AICR typeTags computed — 从文件树提取） ---- */

    const _treeDocTypes = computed(() => {
        const tree = store.fileTree?.value;
        if (!tree || !Array.isArray(tree)) return [];
        return extractDocTypes(tree);
    });

    const typeTags = computed(() => {
        const tree = store.fileTree?.value;
        if (!tree || !Array.isArray(tree)) return [];

        const docTypeSet = new Set(_treeDocTypes.value);

        const typeCounts = {};
        const walk = (items) => {
            if (!Array.isArray(items)) return;
            for (const item of items) {
                if (item.type === 'file') {
                    const fileName = (item.name || '').replace(/\.md$/i, '');
                    if (docTypeSet.has(fileName)) {
                        typeCounts[fileName] = (typeCounts[fileName] || 0) + 1;
                    }
                } else if (item.type === 'folder' && item.children) {
                    walk(item.children);
                }
            }
        };
        walk(tree);

        return Object.entries(typeCounts)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
    });

    const typeStats = computed(() => {
        return typeTags.value.map(tt => {
            const meta = _TYPE_META[tt.type] || { icon: 'file', label: tt.type };
            return { type: tt.type, count: tt.count, icon: meta.icon, label: meta.label };
        });
    });

    const tagColorMap = computed(() => {
        const map = {};
        for (const tag of store.allProjectTags.value) {
            let hash = 0;
            for (let i = 0; i < tag.length; i++) {
                hash = tag.charCodeAt(i) + ((hash << 5) - hash);
            }
            const hue = Math.abs(hash) % 360;
            map[tag] = {
                '--sc-accent': `hsl(${hue}, 55%, 50%)`,
                '--sc-accent-bg': `hsla(${hue}, 55%, 50%, 0.12)`,
            };
        }
        return map;
    });

    const storyOptions = computed(() => {
        return storyTags.value.map(st => ({ value: st.name, label: st.name, count: st.count }));
    });

    const selectedProjectTags = computed(() => getSelectedProjectTags(store));
    const selectedStoryTags = computed(() => getSelectedStoryTags(store));

    const selectedTypeTagLabels = computed(() => {
        return store.selectedTypeTags.value.map(type => {
            const meta = _TYPE_META[type] || { label: type };
            return { type, label: meta.label };
        });
    });

    /* ---- 筛选摘要 pills ---- */

    const filterSummaryPills = computed(() => {
        const pills = [];
        if (store.tagFilterNoTags.value) {
            pills.push({
                type: 'notags',
                label: '没有故事 (' + untaggedCount.value + ')',
                clear: () => { store.tagFilterNoTags.value = false; },
            });
        }
        for (const tag of selectedProjectTags.value) {
            pills.push({
                type: 'tag', label: tag,
                clear: () => {
                    store.selectedSessionTags.value = store.selectedSessionTags.value.filter(t => t !== tag);
                },
            });
        }
        for (const tag of selectedStoryTags.value) {
            pills.push({
                type: 'story', label: tag,
                clear: () => {
                    store.selectedSessionTags.value = store.selectedSessionTags.value.filter(t => t !== tag);
                },
            });
        }
        for (const docType of store.selectedTypeTags.value) {
            const meta = _TYPE_META[docType] || { label: docType };
            pills.push({
                type: 'doc', label: meta.label,
                clear: () => {
                    store.selectedTypeTags.value = store.selectedTypeTags.value.filter(t => t !== docType);
                },
            });
        }
        return pills;
    });

    /* ---- UI 状态 ---- */

    const panelVisible = computed(() => !!store.panelStory.value);

    const viewModes = computed(() => [
        { value: 'board', label: '看板', icon: 'columns' },
        { value: 'cards', label: '卡片', icon: 'grid' },
        { value: 'list', label: '列表', icon: 'list' },
    ]);

    /* ---- 工具函数暴露（供组件内使用） ---- */

    return {
        totalStories,
        statusCounts,
        allProjectTags,
        storiesByStatus,
        filteredStories,
        hasActiveFilters,
        documentCounts,
        filteredStoriesByStatus,
        kanbanColumns,
        groupedStories,
        projectTagCounts,
        untaggedCount,
        projectTags,
        typeTags,
        typeStats,
        storyTags,
        tagColorMap,
        storyOptions,
        selectedProjectTags,
        selectedStoryTags,
        selectedTypeTagLabels,
        filterSummaryPills,
        panelVisible,
        viewModes,
    };
}
