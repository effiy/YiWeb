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

const vueRef = typeof Vue !== 'undefined' && Vue.ref
    ? Vue.ref
    : (val) => ({ value: val });

export function createStore() {
    const { state, internals } = createStoryStoreState(vueRef);

    const dataMethods = createStoryDataMethods(state);
    const filterMethods = createFilterMethods(state);
    const uiMethods = createUiMethods(state);
    const depsMethods = createStoryDepsMethods(state);

    return {
        ...state,
        ...dataMethods,
        ...filterMethods,
        ...uiMethods,
        ...depsMethods,
    };
}
