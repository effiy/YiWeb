/**
 * 故事任务面板 - UI 状态方法
 *
 * 视图模式、排序、详情面板等 UI 状态管理。
 */

import { validateSortField, validateSortDirection, validateViewMode } from '../validators.js';

export function createUiMethods(state) {
    function setView(mode) {
        state.viewMode.value = validateViewMode(mode);
    }

    function toggleSort(field) {
        field = validateSortField(field);
        if (state.sortField.value === field) {
            state.sortDirection.value =
                state.sortDirection.value === 'asc' ? 'desc' : 'asc';
        } else {
            state.sortField.value = field;
            state.sortDirection.value = validateSortDirection('desc');
        }
    }

    function openDetail(story) {
        if (typeof story === 'string') {
            story = state.stories.value.find(s => s.name === story);
            if (!story) return;
        }
        state.panelStory.value = story;
        state.selectedStory.value = story;
    }

    function closePanel() {
        state.panelStory.value = null;
    }

    function handleTagsScroll(event) {
        const el = event.target;
        state.tagsScrollLeft.value = el.scrollLeft;
        state.tagsScrollAtEnd.value =
            el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
    }

    function checkTagsOverflow(el) {
        if (!el) return;
        state.tagsScrollAtEnd.value =
            el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
    }

    return {
        setView,
        toggleSort,
        openDetail,
        closePanel,
        handleTagsScroll,
        checkTagsOverflow,
    };
}
