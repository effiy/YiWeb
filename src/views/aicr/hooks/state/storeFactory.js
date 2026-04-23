import { getData } from '/src/core/services/index.js';
import { buildServiceUrl } from '/src/core/services/helper/requestHelper.js';
import { safeExecute, safeExecuteAsync, createError, ErrorTypes } from '/cdn/utils/core/error.js';
import {
    normalizeFilePath,
    normalizeFileObject,
    normalizeTreeNode
} from '../../utils/fileFieldNormalizer.js';

import { buildFileTreeFromSessions } from '../storeFileTreeBuilders.js';
import { getFileDeleteService } from '../fileDeleteService.js';
import { createAicrStoreState } from './storeState.js';
import { createAicrStoreSessionsOps } from '../storeSessionsOps.js';
import { createAicrStoreFileTreeOps } from '../storeFileTreeOps.js';
import { createAicrStoreFileContentOps } from '../storeFileContentOps.js';
import { createAicrStoreUiOps } from '../storeUiOps.js';

const vueRef = typeof Vue !== 'undefined' && Vue.ref ? Vue.ref : (val) => ({ value: val });

export const createStore = () => {
    const { state, internals } = createAicrStoreState(vueRef);

    const sessionsOps = createAicrStoreSessionsOps(
        { safeExecuteAsync, buildServiceUrl, getData },
        state
    );

    const fileContentOps = createAicrStoreFileContentOps(
        { safeExecuteAsync, normalizeFilePath },
        state,
        internals
    );

    const fileTreeOps = createAicrStoreFileTreeOps(
        {
            safeExecute,
            safeExecuteAsync,
            createError,
            ErrorTypes,
            normalizeFilePath,
            normalizeFileObject,
            normalizeTreeNode,
            buildFileTreeFromSessions,
            getFileDeleteService,
            saveFileContent: fileContentOps.saveFileContent
        },
        state,
        internals,
        { loadSessions: sessionsOps.loadSessions }
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
