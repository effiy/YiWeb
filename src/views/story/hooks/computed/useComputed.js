/**
 * 故事任务面板 - 计算属性
 *
 * 所有派生数据集中于此，使用 Vue.computed() 包装。
 * 对标 aicr/index.js computed 模式。
 * projectTags 直接从文件树计算，与 AICR 页面使用完全相同的逻辑。
 */

import {
    getFirstLevelNames,
} from '/src/views/aicr/utils/filterHelpers.js';

// 缺失文档筛选定义
const MISSING_DOC_TYPES = [
    { key: '使用场景', label: '缺使用场景' },
    { key: '技术评审', label: '缺技术评审' },
    { key: '测试设计', label: '缺测试设计' },
    { key: '实施报告', label: '缺实施报告' },
    { key: '自改进复盘', label: '缺自改进复盘' },
];

function _storyHasDocType(story, docTypeKey) {
    if (!story || !Array.isArray(story.files)) return false;
    return story.files.some(f => {
        const fn = (f.fileName || '').replace(/\.md$/i, '');
        return fn === docTypeKey || fn.endsWith('-' + docTypeKey);
    });
}

function getSelectedProjectTags(state) {
    const tree = state.fileTree.value;
    const firstLevelNames = getFirstLevelNames(tree);
    const tags = state.selectedSessionTags.value;
    if (!Array.isArray(tags)) return [];
    return tags.filter(t => firstLevelNames.has(t));
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
    // 缺失文档筛选：选中的类型，故事中不包含该类型才保留
    const selMissing = state.selectedMissingTags?.value || [];
    if (exclude !== 'missingFilter' && selMissing.length > 0) {
        result = result.filter(s => {
            if (!s || !Array.isArray(s.files)) return true;
            return selMissing.every(type => !_storyHasDocType(s, type));
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
            store.selectedMissingTags.value.length > 0 ||
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

    /* ---- 项目标签（每个项目下的故事数 — 联动 type/missing 筛选） ---- */

    const projectTags = computed(() => {
        const base = store.stories?.value;
        if (!base || !Array.isArray(base)) return [];

        // 排除自身（projectTag），联动 type + missing
        const filtered = _applyFilters(store, base, 'projectTag');

        const counts = {};
        for (const story of filtered) {
            const tags = Array.isArray(story.projectTags) ? story.projectTags : [];
            const tag = tags.length > 0 ? tags[0] : null;
            if (tag) {
                counts[tag] = (counts[tag] || 0) + 1;
            }
        }

        const result = Object.entries(counts).map(([name, count]) => ({ name, count }));

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

    /* ---- 缺失文档标签（每个缺失类型下的故事数 — 联动 project 筛选） ---- */

    const missingTags = computed(() => {
        const base = store.stories?.value;
        if (!base || !Array.isArray(base)) return MISSING_DOC_TYPES.map(mt => ({ ...mt, count: 0 }));

        // 排除自身（missingFilter），联动 project + type
        const filtered = _applyFilters(store, base, 'missingFilter');

        return MISSING_DOC_TYPES.map(mt => {
            const count = filtered.filter(s => !_storyHasDocType(s, mt.key)).length;
            return { ...mt, count };
        });
    });

    /* ---- 故事任务计数（联动所有筛选） ---- */

    const storyTaskCount = computed(() => {
        const stories = filteredStories.value;
        if (!Array.isArray(stories)) return 0;
        return stories.filter(s => _storyHasDocType(s, '故事任务')).length;
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

    const selectedProjectTags = computed(() => getSelectedProjectTags(store));

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
        for (const missingKey of store.selectedMissingTags.value) {
            const mt = MISSING_DOC_TYPES.find(m => m.key === missingKey);
            pills.push({
                type: 'missing', label: mt ? mt.label : missingKey,
                clear: () => {
                    store.selectedMissingTags.value = store.selectedMissingTags.value.filter(t => t !== missingKey);
                },
            });
        }
        return pills;
    });

    /* ---- UI 状态 ---- */

    const panelVisible = computed(() => !!store.panelStory.value);

    const viewModes = computed(() => [
        { value: 'cards', label: '卡片', icon: 'grid' },
        { value: 'list', label: '列表', icon: 'list' },
        { value: 'graph', label: '图谱', icon: 'share' },
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
        groupedStories,
        projectTagCounts,
        untaggedCount,
        projectTags,
        missingTags,
        storyTaskCount,
        tagColorMap,
        selectedProjectTags,
        filterSummaryPills,
        panelVisible,
        viewModes,
    };
}
