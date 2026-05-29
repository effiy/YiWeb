/**
 * 故事任务面板 - 筛选方法
 *
 * 对标 aicr/hooks/methods/tagFilterMethods.js 模式。
 * 使用 selectedSessionTags 存储项目级筛选标签。
 */

import { validateTag, sanitizeSearchQuery } from '../validators.js';
import { getFirstLevelNames } from '/src/views/aicr/utils/filterHelpers.js';

export function createFilterMethods(state) {
    /* ---- project / story tag cascade ---- */

    function toggleSessionTag(tag) {
        if (!validateTag(tag)) return;
        const tree = state.fileTree?.value;
        const firstLevelNames = getFirstLevelNames(tree);
        if (!firstLevelNames.has(tag)) return;

        const current = state.selectedSessionTags.value;
        const idx = current.indexOf(tag);
        if (idx >= 0) {
            const next = [...current];
            next.splice(idx, 1);
            state.selectedSessionTags.value = next.filter(t => firstLevelNames.has(t));
        } else {
            state.selectedSessionTags.value = [...current, tag];
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

    /* ---- missing document filter ---- */

    function toggleMissingTag(missingKey) {
        if (!missingKey || typeof missingKey !== 'string') return;
        const current = state.selectedMissingTags.value;
        const idx = current.indexOf(missingKey);
        if (idx >= 0) {
            state.selectedMissingTags.value = current.filter(t => t !== missingKey);
        } else {
            state.selectedMissingTags.value = [...current, missingKey];
        }
    }

    function clearMissingTags() {
        state.selectedMissingTags.value = [];
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
        state.selectedMissingTags.value = [];
        state.tagFilterNoTags.value = false;
        state.sortField.value = 'lastModified';
        state.sortDirection.value = 'desc';
    }

    /* ---- helpers for computed ---- */

    function getSelectedProjectTags() {
        const firstLevelNames = getFirstLevelNames(state.fileTree?.value);
        return state.selectedSessionTags.value.filter(t => firstLevelNames.has(t));
    }

    return {
        toggleSessionTag,
        clearSessionTags,
        toggleUntagged,
        toggleMissingTag,
        clearMissingTags,
        setSearchQuery,
        clearSearchQuery,
        clearAllFilters,
        getSelectedProjectTags,
    };
}
