/**
 * 故事任务面板 - Store 工厂
 *
 * 组合 state + methods，对标 aicr/hooks/state/storeFactory.js。
 */

import { createStoryStoreState } from './storeState.js';
import { createStoryDataMethods } from '../methods/storyDataMethods.js';
import { createFilterMethods } from '../methods/filterMethods.js';
import { createUiMethods } from '../methods/uiMethods.js';
import { createStoryDepsMethods } from '../methods/storyDepsMethods.js';
import { createStoryEditMethods } from '../methods/storyEditMethods.js';

const vueRef = (typeof Vue !== 'undefined' && Vue.ref) || (() => {
    throw new Error('Vue.ref 不可用，请检查 Vue CDN 是否加载成功');
});

export function createStore() {
    const { state, internals } = createStoryStoreState(vueRef);

    const dataMethods = createStoryDataMethods(state);
    const filterMethods = createFilterMethods(state);
    const uiMethods = createUiMethods(state);
    const depsMethods = createStoryDepsMethods(state);
    const editMethods = createStoryEditMethods(state);

    return {
        ...state,
        ...dataMethods,
        ...filterMethods,
        ...uiMethods,
        ...depsMethods,
        ...editMethods,
    };
}
