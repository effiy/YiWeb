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
     * 处理标签选择（双向联动：选故事自动选父项目，去项目自动去子故事）
     */
    const handleTagSelect = (tags) => {
        return safeExecute(() => {
            if (!store.selectedSessionTags) return;

            const current = store.selectedSessionTags.value || [];
            const added = tags.filter(t => !current.includes(t));
            const removed = current.filter(t => !tags.includes(t));

            let newTags = [...tags];

            // 构建一级目录名集合（项目级标签）
            const firstLevelNames = new Set();
            if (store.fileTree?.value) {
                for (const item of store.fileTree.value) {
                    if (item.type === 'folder') firstLevelNames.add(item.name);
                }
            }

            // 自动选中故事标签的父项目
            for (const tag of added) {
                if (!firstLevelNames.has(tag)) {
                    if (store.fileTree?.value) {
                        for (const item of store.fileTree.value) {
                            if (item.type === 'folder' && Array.isArray(item.children)) {
                                for (const child of item.children) {
                                    if (child.type === 'folder' && child.name === tag) {
                                        if (!newTags.includes(item.name)) {
                                            newTags.push(item.name);
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 自动移除被取消项目标签下的子故事标签
            for (const tag of removed) {
                if (firstLevelNames.has(tag)) {
                    if (store.fileTree?.value) {
                        for (const item of store.fileTree.value) {
                            if (item.type === 'folder' && item.name === tag && Array.isArray(item.children)) {
                                for (const child of item.children) {
                                    if (child.type === 'folder') {
                                        newTags = newTags.filter(t => t !== child.name);
                                    }
                                }
                                break;
                            }
                        }
                    }
                }
            }

            store.selectedSessionTags.value = newTags;
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
     * 会话搜索变化
     */
    const handleSessionSearchChange = (query) => {
        return safeExecute(() => {
            if (store.sessionSearchQuery) {
                store.sessionSearchQuery.value = query || '';
            }
        }, '会话搜索变化');
    };

    /**
     * 切换前缀标签选中状态
     */
    const handlePrefixTagToggle = (prefix) => {
        return safeExecute(() => {
            if (store.selectedPrefixTags) {
                const current = store.selectedPrefixTags.value || [];
                const idx = current.indexOf(prefix);
                if (idx > -1) {
                    store.selectedPrefixTags.value = current.filter(p => p !== prefix);
                } else {
                    store.selectedPrefixTags.value = [...current, prefix];
                }
            }
        }, '切换前缀标签');
    };

    /**
     * 清除所有前缀标签
     */
    const handlePrefixTagClear = () => {
        return safeExecute(() => {
            if (store.selectedPrefixTags) {
                store.selectedPrefixTags.value = [];
            }
        }, '清除前缀标签');
    };

    return {
        handleTagSelect,
        handleTagClear,
        handleTagFilterNoTags,
        handleSessionSearchChange,
        handlePrefixTagToggle,
        handlePrefixTagClear
    };
};
