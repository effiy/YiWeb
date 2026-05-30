/**
 * 故事任务面板 - 依赖数据方法
 *
 * 加载 story-deps.json 并提供依赖关系查询方法。
 * 所有方法通过依赖注入接收 state。
 */

import { logInfo, logWarn, logError } from '/cdn/utils/core/log.js';

const DEPS_JSON_PATH = '/docs/故事任务面板/story-deps.json';

export function createStoryDepsMethods(state) {
    async function fetchDependencies() {
        state.depsLoading.value = true;
        try {
            const res = await fetch(DEPS_JSON_PATH, { credentials: 'omit' });
            if (!res.ok) {
                logWarn('[故事面板] 依赖数据加载失败, HTTP', res.status);
                state.storyDeps.value = [];
                return;
            }
            const data = await res.json();
            if (!data || !Array.isArray(data.stories)) {
                logWarn('[故事面板] 依赖数据格式无效');
                state.storyDeps.value = [];
                return;
            }
            state.storyDeps.value = data.stories;
            logInfo('[故事面板] 依赖数据已加载,', data.stories.length, '个故事');
        } catch (err) {
            logWarn('[故事面板] 依赖数据加载异常:', err.message);
            state.storyDeps.value = [];
        } finally {
            state.depsLoading.value = false;
        }
    }

    function getStoryDeps(directory) {
        const stories = state.storyDeps.value;
        if (!Array.isArray(stories)) return null;
        return stories.find(s => s.directory === directory) || null;
    }

    function getDirectDependents(directory) {
        const stories = state.storyDeps.value;
        if (!Array.isArray(stories)) return [];
        return stories.filter(s =>
            Array.isArray(s.dependsOn) && s.dependsOn.some(d => d.directory === directory)
        );
    }

    function getRelationLabel(relation) {
        const map = {
            blocks: '阻断',
            informs: '输入',
            references: '引用',
        };
        return map[relation] || relation;
    }

    return {
        fetchDependencies,
        getStoryDeps,
        getDirectDependents,
        getRelationLabel,
    };
}
