import { getData } from '/src/services/index.js';
import { buildServiceUrl } from '/src/services/helper/requestHelper.js';
import { safeExecuteAsync, createError, ErrorTypes } from '/src/utils/core/error.js';
import {
    normalizeFilePath,
    normalizeFileObject,
    normalizeTreeNode
} from '/src/utils/aicr/fileFieldNormalizer.js';

import { buildFileTreeFromSessions } from './storeFileTreeBuilders.js';
import { getFileDeleteService } from './fileDeleteService.js';
import { createAicrStoreState } from './storeState.js';
import { createAicrStoreSessionsOps } from './storeSessionsOps.js';
import { createAicrStoreFileTreeOps } from './storeFileTreeOps.js';
import { createAicrStoreFileContentOps } from './storeFileContentOps.js';
import { createAicrStoreUiOps } from './storeUiOps.js';

const vueRef = typeof Vue !== 'undefined' && Vue.ref ? Vue.ref : (val) => ({ value: val });

export const createStore = () => {
    const { state, internals } = createAicrStoreState(vueRef);

    const sessionsOps = createAicrStoreSessionsOps(
        { safeExecuteAsync, buildServiceUrl, getData },
        state
    );

    const fileTreeOps = createAicrStoreFileTreeOps(
        {
            safeExecuteAsync,
            createError,
            ErrorTypes,
            normalizeFilePath,
            normalizeFileObject,
            normalizeTreeNode,
            buildFileTreeFromSessions,
            getFileDeleteService
        },
        state,
        internals,
        { loadSessions: sessionsOps.loadSessions }
    );

    const fileContentOps = createAicrStoreFileContentOps(
        { safeExecuteAsync, normalizeFilePath },
        state,
        internals
    );

    const boundLoadFiles = () => fileContentOps.loadFiles(fileTreeOps.loadFileTree);
    const boundLoadFileByKey = (targetKey = null) => fileContentOps.loadFileByKey(fileTreeOps.loadFileTree, targetKey);

    const uiOps = createAicrStoreUiOps(state, {
        loadFileTree: fileTreeOps.loadFileTree,
        loadFiles: boundLoadFiles
    });

    return {
        ...state,
        ...fileTreeOps,
        ...fileContentOps,
        loadFiles: boundLoadFiles,
        loadFileByKey: boundLoadFileByKey,
        ...uiOps,
        ...sessionsOps
    };
};
