/**
 * 标签筛选方法模块
 * author: YiWeb
 * 说明：处理标签选择、清除、筛选等功能
 */

import { safeExecute } from '/cdn/utils/core/error.js';
import { buildParentChildMap, getFirstLevelNames } from '/src/views/aicr/utils/filterHelpers.js';

/**
 * 创建标签筛选方法
 * @param {Object} deps - 依赖注入对象
 * @param {Object} deps.store - 状态存储对象
 * @returns {Object} 标签筛选方法集合
 */
export const createTagFilterMethods = ({ store }) => {

    /**
     * 获取最新的父子映射和一级目录名（从当前文件树重建）
     */
    const getTreeMeta = () => {
        const tree = store.fileTree?.value;
        return {
            parentChildMap: buildParentChildMap(tree),
            firstLevelNames: getFirstLevelNames(tree)
        };
    };

    /**
     * 获取项目的所有子故事名
     */
    const getChildStories = (projectName, parentChildMap) => {
        const children = [];
        for (const [child, parent] of parentChildMap) {
            if (parent === projectName) children.push(child);
        }
        return children;
    };

    /**
     * 处理标签选择（双向联动：选故事自动选父项目，去项目自动去子故事）
     * O(1) 查询，不再遍历文件树
     */
    const handleTagSelect = (tags) => {
        return safeExecute(() => {
            if (!store.selectedSessionTags) return;

            const current = store.selectedSessionTags.value || [];
            const added = tags.filter(t => !current.includes(t));
            const removed = current.filter(t => !tags.includes(t));

            let newTags = [...tags];

            const { parentChildMap, firstLevelNames } = getTreeMeta();

            // 自动选中故事标签的父项目
            for (const tag of added) {
                if (!firstLevelNames.has(tag)) {
                    const parent = parentChildMap.get(tag);
                    if (parent && !newTags.includes(parent)) {
                        newTags.push(parent);
                    }
                }
            }

            // 自动移除被取消项目标签下的子故事标签
            for (const tag of removed) {
                if (firstLevelNames.has(tag)) {
                    const children = getChildStories(tag, parentChildMap);
                    newTags = newTags.filter(t => !children.includes(t));
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
     * 切换无标签筛选（项目级别：根目录下无子目录的文件）
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
     * 切换 Skills 标签选中状态
     */
    const handleSkillTagToggle = (skillName) => {
        return safeExecute(() => {
            if (store.selectedSkillTags) {
                const current = store.selectedSkillTags.value || [];
                const idx = current.indexOf(skillName);
                if (idx > -1) {
                    store.selectedSkillTags.value = current.filter(t => t !== skillName);
                } else {
                    store.selectedSkillTags.value = [...current, skillName];
                }
            }
        }, '切换 Skills 标签');
    };

    /**
     * 清除所有 Skills 标签
     */
    const handleSkillTagsClear = () => {
        return safeExecute(() => {
            if (store.selectedSkillTags) {
                store.selectedSkillTags.value = [];
            }
        }, '清除 Skills 标签');
    };

    /**
     * 切换 Templates 标签选中状态
     */
    const handleTemplateTagToggle = (templateName) => {
        return safeExecute(() => {
            if (store.selectedTemplateTags) {
                const current = store.selectedTemplateTags.value || [];
                const idx = current.indexOf(templateName);
                if (idx > -1) {
                    store.selectedTemplateTags.value = current.filter(t => t !== templateName);
                } else {
                    store.selectedTemplateTags.value = [...current, templateName];
                }
            }
        }, '切换 Templates 标签');
    };

    /**
     * 清除所有 Templates 标签
     */
    const handleTemplateTagsClear = () => {
        return safeExecute(() => {
            if (store.selectedTemplateTags) {
                store.selectedTemplateTags.value = [];
            }
        }, '清除 Templates 标签');
    };

    /**
     * 切换 Rules 标签选中状态
     */
    const handleRuleTagToggle = (ruleName) => {
        return safeExecute(() => {
            if (store.selectedRuleTags) {
                const current = store.selectedRuleTags.value || [];
                const idx = current.indexOf(ruleName);
                if (idx > -1) {
                    store.selectedRuleTags.value = current.filter(t => t !== ruleName);
                } else {
                    store.selectedRuleTags.value = [...current, ruleName];
                }
            }
        }, '切换 Rules 标签');
    };

    /**
     * 清除所有 Rules 标签
     */
    const handleRuleTagsClear = () => {
        return safeExecute(() => {
            if (store.selectedRuleTags) {
                store.selectedRuleTags.value = [];
            }
        }, '清除 Rules 标签');
    };

    /**
     * 切换 Agents 标签选中状态
     */
    const handleAgentTagToggle = (agentName) => {
        return safeExecute(() => {
            if (store.selectedAgentTags) {
                const current = store.selectedAgentTags.value || [];
                const idx = current.indexOf(agentName);
                if (idx > -1) {
                    store.selectedAgentTags.value = current.filter(t => t !== agentName);
                } else {
                    store.selectedAgentTags.value = [...current, agentName];
                }
            }
        }, '切换 Agents 标签');
    };

    /**
     * 清除所有 Agents 标签
     */
    const handleAgentTagsClear = () => {
        return safeExecute(() => {
            if (store.selectedAgentTags) {
                store.selectedAgentTags.value = [];
            }
        }, '清除 Agents 标签');
    };

    return {
        handleTagSelect,
        handleTagClear,
        handleTagFilterNoTags,
        handleSessionSearchChange,
        handleSkillTagToggle,
        handleSkillTagsClear,
        handleTemplateTagToggle,
        handleTemplateTagsClear,
        handleRuleTagToggle,
        handleRuleTagsClear,
        handleAgentTagToggle,
        handleAgentTagsClear
    };
};
