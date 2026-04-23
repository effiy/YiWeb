/**
 * 标签筛选方法模块
 * author: YiWeb
 * 说明：处理标签选择、清除、筛选等功能
 */

import { safeExecute } from '/cdn/utils/core/error.js';

/**
 * 创建标签筛选方法
 * @param {Object} deps - 依赖注入对象
 * @param {Object} deps.store - 状态存储对象
 * @returns {Object} 标签筛选方法集合
 */
export const createTagFilterMethods = ({ store }) => {
    /**
     * 处理标签选择
     */
    const handleTagSelect = (tags) => {
        return safeExecute(() => {
            if (store.selectedSessionTags) {
                store.selectedSessionTags.value = tags;
            }
        }, '选择标签');
    };

    /**
     * 处理标签清除
     */
    const handleTagClear = () => {
        return safeExecute(() => {
            if (store.selectedSessionTags) {
                store.selectedSessionTags.value = [];
            }
        }, '清除标签');
    };

    /**
     * 切换反向过滤
     */
    const handleTagFilterReverse = (reverse) => {
        return safeExecute(() => {
            if (store.tagFilterReverse) {
                store.tagFilterReverse.value = reverse;
            }
        }, '切换反向过滤');
    };

    /**
     * 切换无标签筛选
     */
    const handleTagFilterNoTags = (noTags) => {
        return safeExecute(() => {
            if (store.tagFilterNoTags) {
                store.tagFilterNoTags.value = noTags;
            }
        }, '切换无标签筛选');
    };

    /**
     * 切换标签展开/折叠
     */
    const handleTagFilterExpand = (expanded) => {
        return safeExecute(() => {
            if (store.tagFilterExpanded) {
                store.tagFilterExpanded.value = expanded;
            }
        }, '切换标签展开/折叠');
    };

    /**
     * 标签搜索
     */
    const handleTagFilterSearch = (keyword) => {
        return safeExecute(() => {
            if (store.tagFilterSearchKeyword) {
                store.tagFilterSearchKeyword.value = keyword || '';
            }
        }, '标签搜索');
    };

    /**
     * 会话搜索变化
     */
    const handleSessionSearchChange = (query) => {
        return safeExecute(() => {
            if (store.sessionSearchQuery) {
                store.sessionSearchQuery.value = query || '';
            }
        }, '会话搜索变化');
    };

    return {
        handleTagSelect,
        handleTagClear,
        handleTagFilterReverse,
        handleTagFilterNoTags,
        handleTagFilterExpand,
        handleTagFilterSearch,
        handleSessionSearchChange
    };
};
