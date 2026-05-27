/**
 * 故事任务面板 - 筛选方法
 *
 * 对标 aicr/hooks/methods/tagFilterMethods.js 模式。
 * 使用 selectedSessionTags 单数组实现双向级联（选中故事→自动选父项目，去项目→自动去子故事）。
 */

import { validateTag, validateDocType, validateMissingFilter, sanitizeSearchQuery } from '../validators.js';
import { getFirstLevelNames } from '/src/views/aicr/utils/filterHelpers.js';

const DOC_SUFFIX_MAP = {
    story_task:    '-故事任务.md',
    scenario:      '-使用场景.md',
    implementation:'-实施报告.md',
    test_report:   '-测试报告.md',
    retrospective: '-自改进复盘.md',
};

const MISSING_SUFFIX_MAP = {
    design:     '-使用场景.md',
    develop:    '-实施报告.md',
    testing:    '-测试报告.md',
    operations: '-自改进复盘.md',
};

export function createFilterMethods(state) {
    /* ---- project / story tag cascade ---- */

    function toggleSessionTag(tag) {
        if (!validateTag(tag)) return;
        const tree = state.fileTree?.value;
        const firstLevelNames = getFirstLevelNames(tree);
        const current = state.selectedSessionTags.value;
        const idx = current.indexOf(tag);
        if (idx >= 0) {
            const next = [...current];
            next.splice(idx, 1);

            // 移除项目标签时，级联移除仅属于该项目的子故事标签
            if (firstLevelNames.has(tag)) {
                const remainingProjects = new Set(
                    next.filter(t => firstLevelNames.has(t))
                );
                state.selectedSessionTags.value = next.filter(t => {
                    if (firstLevelNames.has(t)) return true;
                    const story = state.stories.value.find(s => s.name === t);
                    if (!story || !story.projectTags || story.projectTags.length === 0) return true;
                    return story.projectTags.some(pt => remainingProjects.has(pt));
                });
            } else {
                state.selectedSessionTags.value = next;
            }
        } else {
            const next = [...current, tag];
            // 选中故事标签时，级联选中其项目标签
            if (!firstLevelNames.has(tag)) {
                const story = state.stories.value.find(s => s.name === tag);
                if (story && story.projectTags) {
                    for (const pt of story.projectTags) {
                        if (!next.includes(pt)) next.push(pt);
                    }
                }
            }
            state.selectedSessionTags.value = next;
            if (state.tagFilterNoTags.value) {
                state.tagFilterNoTags.value = false;
            }
        }
    }

    function clearSessionTags() {
        state.selectedSessionTags.value = [];
        state.tagFilterNoTags.value = false;
    }

    function toggleUntagged() {
        state.tagFilterNoTags.value = !state.tagFilterNoTags.value;
        if (state.tagFilterNoTags.value) {
            state.selectedSessionTags.value = [];
        }
    }

    /* ---- document type filter ---- */

    function toggleTypeTag(docType) {
        if (!validateDocType(docType)) return;
        const current = state.selectedTypeTags.value;
        const idx = current.indexOf(docType);
        if (idx >= 0) {
            state.selectedTypeTags.value = current.filter(t => t !== docType);
        } else {
            state.selectedTypeTags.value = [...current, docType];
        }
    }

    function clearTypeTags() {
        state.selectedTypeTags.value = [];
    }

    /* ---- missing document filter ---- */

    function toggleMissingFilter(filter) {
        if (!validateMissingFilter(filter)) return;
        state.selectedMissingFilter.value =
            state.selectedMissingFilter.value === filter ? null : filter;
    }

    /* ---- search ---- */

    function setSearchQuery(query) {
        state.localSearchQuery.value = sanitizeSearchQuery(query);
    }

    function clearSearchQuery() {
        state.localSearchQuery.value = '';
    }

    /* ---- clear all ---- */

    function clearAllFilters() {
        state.localSearchQuery.value = '';
        state.selectedSessionTags.value = [];
        state.selectedTypeTags.value = [];
        state.selectedMissingFilter.value = null;
        state.tagFilterNoTags.value = false;
        state.sortField.value = 'lastModified';
        state.sortDirection.value = 'desc';
    }

    /* ---- helpers for computed ---- */

    function getSelectedProjectTags() {
        const firstLevelNames = getFirstLevelNames(state.fileTree?.value);
        return state.selectedSessionTags.value.filter(t => firstLevelNames.has(t));
    }

    function getSelectedStoryTags() {
        const firstLevelNames = getFirstLevelNames(state.fileTree?.value);
        return state.selectedSessionTags.value.filter(t => !firstLevelNames.has(t));
    }

    return {
        toggleSessionTag,
        clearSessionTags,
        toggleUntagged,
        toggleTypeTag,
        clearTypeTags,
        toggleMissingFilter,
        setSearchQuery,
        clearSearchQuery,
        clearAllFilters,
        getSelectedProjectTags,
        getSelectedStoryTags,
        DOC_SUFFIX_MAP,
        MISSING_SUFFIX_MAP,
    };
}
